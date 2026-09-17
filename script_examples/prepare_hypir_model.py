"""Explicitly prepare the missing HYPIR SD 2.1 base model for offline use."""
import json
import hashlib
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'sd2-community/stable-diffusion-2-1-base'
REVISION = '4e63672c03103b6c636b8fb4119ba982469b2955'
FILES = [
    'README.md', 'model_index.json', 'scheduler/scheduler_config.json',
    'tokenizer/merges.txt', 'tokenizer/special_tokens_map.json',
    'tokenizer/tokenizer_config.json', 'tokenizer/vocab.json',
    'text_encoder/config.json', 'text_encoder/model.safetensors',
    'unet/config.json', 'unet/diffusion_pytorch_model.safetensors',
    'vae/config.json', 'vae/diffusion_pytorch_model.safetensors',
]


def main():
    target = ROOT / 'models/HYPIR/stable-diffusion-2-1-base'
    staging = target.with_name('.stable-diffusion-2-1-base-download')
    manifest = json.loads((ROOT / 'deploy/hypir-model-manifest.json').read_text())
    assert manifest['revision'] == REVISION
    metadata = manifest['files']

    def verify(path, item):
        if not path.is_file() or path.stat().st_size != item['size']:
            return False
        with path.open('rb') as handle:
            if 'lfs' in item:
                return hashlib.file_digest(handle, 'sha256').hexdigest() == item['lfs']['sha256']
            content = handle.read()
            return hashlib.sha1(f'blob {len(content)}\0'.encode() + content).hexdigest() == item['blobId']

    if target.exists():
        assert all(verify(target / name, metadata[name]) for name in FILES), 'Existing model files failed verification'
        print(target)
        return
    staging.mkdir(parents=True, exist_ok=True)

    def download(name):
        item = metadata[name]
        output = staging / name
        if verify(output, item):
            return
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_name(output.name + '.part')
        sources = [f'https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{name}']
        if name.endswith('.safetensors'):
            sources.insert(0, f'https://modelscope.cn/models/stabilityai/stable-diffusion-2-1-base/resolve/master/{name}')
        for url in sources:
            try:
                if temporary.exists() and temporary.stat().st_size >= item['size']:
                    if verify(temporary, item):
                        temporary.rename(output)
                        return
                    temporary.unlink()
                offset = temporary.stat().st_size if temporary.exists() else 0
                headers = {'Range': f'bytes={offset}-'} if offset else {}
                with requests.get(url, headers=headers, stream=True, timeout=(15, 60)) as transfer:
                    transfer.raise_for_status()
                    resume = offset > 0 and transfer.status_code == 206
                    if resume:
                        assert transfer.headers.get('Content-Range', '').startswith(f'bytes {offset}-'), 'Invalid resume response'
                    with temporary.open('ab' if resume else 'wb') as handle:
                        for chunk in transfer.iter_content(4 * 1024 * 1024):
                            handle.write(chunk)
                assert verify(temporary, item), f'Checksum mismatch: {name}'
                temporary.rename(output)
                print(f'VERIFIED {name} {item["size"]} bytes', flush=True)
                return
            except (requests.RequestException, AssertionError) as error:
                print(f'Download failed for {name}: {type(error).__name__}; trying next source', flush=True)
        raise RuntimeError(f'Cannot obtain verified model file: {name}')

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(download, FILES))
    assert all((staging / name).is_file() for name in FILES)
    (staging / 'source.json').write_text(json.dumps({
        'repository': REPOSITORY, 'revision': REVISION, 'files': FILES,
        'hashes': {name: metadata[name].get('lfs', {}).get('sha256', metadata[name]['blobId']) for name in FILES},
        'large_file_mirror': 'https://modelscope.cn/models/stabilityai/stable-diffusion-2-1-base',
        'note': 'Community mirror of deprecated Stability AI repository; see bundled model card and license.',
    }, indent=2) + '\n')
    if (staging / '.cache').exists():
        shutil.rmtree(staging / '.cache')
    staging.rename(target)
    print(target)


if __name__ == '__main__':
    main()
