"""Export validated cached wheels without bundling models or the host virtualenv."""
import base64
import csv
import hashlib
import importlib.metadata
import io
import json
import subprocess
import zipfile
from email.parser import BytesParser, Parser
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name
from wheel.wheelfile import WheelFile

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / '.docker-build'


def main():
    installed = {canonicalize_name(d.metadata['Name']): d for d in importlib.metadata.distributions()}
    requirements = [Requirement(line) for line in (ROOT / 'requirements.txt').read_text().splitlines()
                    if line.strip() and not line.startswith('#')]
    assert {canonicalize_name(r.name) for r in requirements} == installed.keys(), 'Use the validated .venv; package set differs'
    for requirement in requirements:
        dist = installed[canonicalize_name(requirement.name)]
        assert dist.version in requirement.specifier, str(requirement)
        if requirement.url:
            provenance = json.loads(dist.read_text('direct_url.json'))
            assert provenance['vcs_info']['commit_id'] == requirement.url.rsplit('@', 1)[1], str(requirement)
    cache = Path(subprocess.check_output(['uv', 'cache', 'dir'], text=True).strip()) / 'archive-v0'
    archives = {}
    for metadata in sorted(cache.glob('*/*.dist-info/METADATA')):
        values = BytesParser().parsebytes(metadata.read_bytes())
        name = canonicalize_name(values['Name'])
        if name in installed and values['Version'] == installed[name].version:
            archives[name] = metadata.parent
    missing = installed.keys() - archives.keys()
    assert not missing, f'Wheels not cached for: {sorted(missing)}. Run set_env.sh first.'
    wheels = BUILD / 'wheels'
    wheels.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, dist in sorted(installed.items()):
        info = archives[name]
        tags = Parser().parsestr((info / 'WHEEL').read_text()).get_all('Tag')
        parts = [tag.split('-') for tag in tags]
        tag = '-'.join('.'.join(sorted({part[i] for part in parts})) for i in range(3))
        # WheelFile derives its RECORD directory from the wheel filename.
        # Preserve upstream casing (for example PySocks) to avoid two dist-info dirs.
        output = wheels / f'{info.name.removesuffix(".dist-info")}-{tag}.whl'
        if not output.exists():
            # WheelFile validates the name, so use a separate directory for atomic writes.
            stage = BUILD / 'wheel-staging'
            stage.mkdir(exist_ok=True)
            temporary = stage / output.name
            with WheelFile(temporary, 'w', compression=zipfile.ZIP_STORED) as wheel:
                for filename, expected, size in csv.reader(io.StringIO((info / 'RECORD').read_text())):
                    relative = Path(filename)
                    assert not relative.is_absolute() and '..' not in relative.parts, filename
                    if relative.name == 'RECORD':
                        continue
                    source = info.parent / relative
                    if expected:
                        algorithm, expected_digest = expected.split('=', 1)
                        with source.open('rb') as handle:
                            actual = base64.urlsafe_b64encode(hashlib.file_digest(handle, algorithm).digest()).rstrip(b'=').decode()
                        assert actual == expected_digest, f'Cached file changed: {source}'
                    wheel.write(source, arcname=filename)
            temporary.rename(output)
        with output.open('rb') as handle:
            checksum = hashlib.file_digest(handle, 'sha256').hexdigest()
        manifest.append({'name': name, 'version': dist.version, 'wheel': output.name, 'sha256': checksum})
    expected_wheels = {item['wheel'] for item in manifest}
    for obsolete in wheels.glob('*.whl'):
        if obsolete.name not in expected_wheels:
            obsolete.unlink()
    (BUILD / 'requirements.lock').write_text(''.join(f'{item["name"]}=={item["version"]}\n' for item in manifest))
    (BUILD / 'wheels.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Prepared {len(manifest)} verified wheels in {wheels}')


if __name__ == '__main__':
    main()
