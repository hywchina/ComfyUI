"""Run exported workflows one at a time, recording low-resource API smoke tests."""
import argparse
import base64
import copy
import io
import json
import time
import uuid
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='https://127.0.0.1:8188')
    parser.add_argument('--ca', type=Path, default=ROOT / '.runtime/https/comfyui-local-ca.crt')
    parser.add_argument('--workflows', type=Path, default=ROOT / 'user/default/workflows_api')
    parser.add_argument('--output', type=Path, default=ROOT / '.runtime/local-workflows')
    parser.add_argument('--only', default='', help='Filename substring filter')
    parser.add_argument('--exclude', action='append', default=[], help='Exclude filenames containing this substring')
    parser.add_argument('--size', type=int, default=512)
    parser.add_argument('--steps', type=int, default=4)
    parser.add_argument('--timeout', type=int, default=1800)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.trust_env = False
    session.verify = str(args.ca) if args.url.startswith('https:') else True

    def request(method, path, **kwargs):
        response = session.request(method, args.url.rstrip('/') + path, timeout=60, **kwargs)
        response.raise_for_status()
        return response

    def queue_empty():
        queue = request('GET', '/queue').json()
        return not queue['queue_running'] and not queue['queue_pending']

    def image_bytes(name='example.png'):
        source = ROOT / 'input' / name.removesuffix(' [input]')
        if not source.is_file():
            source = ROOT / 'input/example.png'
        image = ImageOps.contain(Image.open(source).convert('RGBA'), (args.size, args.size))
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return buffer.getvalue()

    def prepare(original, label):
        prompt = copy.deepcopy(original)
        changes = []
        for node_id, node in list(prompt.items()):
            inputs = node['inputs']
            kind = node['class_type']
            before = copy.deepcopy(inputs)
            if kind == 'LoadImage':
                content = image_bytes(inputs['image'])
                uploaded = request('POST', '/upload/image',
                                   files={'image': (f'{label}-{node_id.replace(":", "-")}.png', content, 'image/png')},
                                   data={'subfolder': 'workflow-validation', 'overwrite': 'true'}).json()
                inputs['image'] = '/'.join(filter(None, [uploaded.get('subfolder'), uploaded['name']]))
            if kind in {'ScreenShare', 'IO_EasyMark'}:
                inputs['image_base64'] = 'data:image/png;base64,' + base64.b64encode(image_bytes()).decode()
                if kind == 'IO_EasyMark':
                    image = Image.open(io.BytesIO(image_bytes()))
                    inputs.update(image_width=image.width, image_height=image.height,
                                  brush_data='brush:box:4:1:255,0,0:32,32;128,32;128,128;32,128;32,32')
            if kind == 'PrimitiveInt' and inputs.get('value', 0) >= 512:
                inputs['value'] = args.size
            for key in ['width', 'height', 'scale_to_length']:
                if isinstance(inputs.get(key), (int, float)):
                    inputs[key] = min(inputs[key], args.size)
            if kind == 'LayerUtility: ImageScaleByAspectRatio V2':
                inputs.update(scale_to_side='longest', scale_to_length=args.size)
            if 'megapixels' in inputs:
                inputs['megapixels'] = min(inputs['megapixels'], args.size ** 2 / 1_000_000)
            if isinstance(inputs.get('steps'), int):
                inputs['steps'] = min(inputs['steps'], args.steps)
            if kind == 'TextGenerate':
                inputs.update(max_length=32, thinking=False)
            if kind == 'HYPIRAdvancedRestoration':
                inputs.update(upscale_factor=2, unload_model_after=True)
                prompt['validation-hypir-' + node_id] = {
                    'class_type': 'PreviewAny', 'inputs': {'source': [node_id, 1]},
                }
            if kind == 'VAEDecodeHunyuan3D':
                inputs['octree_resolution'] = 128
            if kind == 'ImagePadForOutpaint':
                for key in ['left', 'top', 'right', 'bottom']:
                    if key in inputs:
                        inputs[key] = min(inputs[key], 64)
            if 'filename_prefix' in inputs:
                inputs['filename_prefix'] = 'workflow-validation/' + label
            changes.extend(f'{node_id}:{kind}.{key}' for key in inputs if inputs[key] != before.get(key))
        return prompt, changes

    results = []
    files = [p for p in sorted(args.workflows.glob('*.json'))
             if args.only in p.name and not any(value in p.name for value in args.exclude)]
    assert files, 'No workflows matched'
    for index, path in enumerate(files):
        if not queue_empty():
            raise RuntimeError('ComfyUI queue is busy; refusing to mix validation with other jobs')
        request('POST', '/free', json={'unload_models': True, 'free_memory': True})
        label = f'{index:02}-{uuid.uuid4().hex[:8]}'
        case_dir = args.output / path.stem
        case_dir.mkdir(exist_ok=True)
        result = {'workflow': path.name, 'status': 'FAILED', 'size': args.size, 'steps': args.steps}
        start = time.monotonic()
        print(f'START {index + 1}/{len(files)} {path.name}', flush=True)
        try:
            prompt, changes = prepare(json.loads(path.read_text()), label)
            result['changed_inputs'] = changes
            (case_dir / 'request.json').write_text(json.dumps(prompt, ensure_ascii=False, indent=2))
            submitted = request('POST', '/prompt', json={'prompt': prompt, 'client_id': label}).json()
            prompt_id = submitted['prompt_id']
            result['prompt_id'] = prompt_id
            result['node_errors'] = submitted.get('node_errors', {})
            while time.monotonic() - start < args.timeout:
                history = request('GET', '/history/' + prompt_id).json()
                if prompt_id in history:
                    break
                time.sleep(2)
            else:
                queue = request('GET', '/queue').json()
                if any(entry[1] == prompt_id for entry in queue['queue_running']):
                    request('POST', '/interrupt', json={})
                request('POST', '/queue', json={'delete': [prompt_id]})
                raise TimeoutError(f'Workflow exceeded {args.timeout}s; requested cancellation')
            history = history[prompt_id]
            (case_dir / 'history.json').write_text(json.dumps(history, ensure_ascii=False, indent=2))
            assert not result['node_errors'], f'ComfyUI skipped invalid output branches: {result["node_errors"]}'
            if history['status']['status_str'] != 'success':
                raise RuntimeError(json.dumps(history['status'], ensure_ascii=False))
            assert history['outputs'], 'Execution returned no outputs'
            for node_id, output in history['outputs'].items():
                if node_id.startswith('validation-hypir-'):
                    assert 'Success!' in json.dumps(output), f'HYPIR returned an error: {output}'
            downloads = []

            def download(value):
                if isinstance(value, dict):
                    if 'filename' in value and 'type' in value:
                        params = {k: value[k] for k in ['filename', 'type', 'subfolder'] if k in value}
                        content = request('GET', '/view', params=params).content
                        assert content, 'Empty output file'
                        target = case_dir / f'{len(downloads):02}-{Path(value["filename"]).name}'
                        target.write_bytes(content)
                        downloads.append({'file': target.name, 'bytes': len(content)})
                    else:
                        for item in value.values():
                            download(item)
                elif isinstance(value, list):
                    for item in value:
                        download(item)
            download(history['outputs'])
            result.update(status='PASSED', downloads=downloads, output_nodes=list(history['outputs']))
        except requests.HTTPError as error:
            result['error'] = f'{error}: {error.response.text}'
        except (RuntimeError, AssertionError, TimeoutError, OSError, ValueError) as error:
            result['error'] = str(error)
        result['seconds'] = round(time.monotonic() - start, 2)
        results.append(result)
        (args.output / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
        print(f'{result["status"]} {path.name} {result["seconds"]}s {result.get("error", "")[:500]}', flush=True)
        if queue_empty():
            request('POST', '/free', json={'unload_models': True, 'free_memory': True})
        else:
            raise RuntimeError('Queue did not drain; stopping serial test runner')
    raise SystemExit(0 if all(r['status'] == 'PASSED' for r in results) else 1)


if __name__ == '__main__':
    main()
