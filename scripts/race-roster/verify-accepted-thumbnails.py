"""Rebuild the three replacement stills and verify exact bytes and car freeze.

Run: python3 scripts/race-roster/verify-accepted-thumbnails.py
Requires Blender 5.1.2 and cwebp 1.6.0. Does not write into the repository.
"""
import hashlib
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = '926a589b9c411f091e886cc8f02c1a44fb3e656d'
MODELS = {
    'cobalt': ('src/assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb', '97658df10425c45043f35778872d25d4bb674e701b13548e0a0a16139cfafbcc', '6c2146b4d10fdeac04c723ce5814b9a932ac7fbe8705033d36e14dd709682bf7'),
    'kestrel': ('src/assets/3d/kicklab-race-kestrel/v1/kestrel-original.glb', '1d933fb1cb3924a2b2ffa811e7c21854b7c8bfc95cd7a928ce9e3b2f89fe2adb', 'ade93cbc9008edc0c61421a5b2ae656f260f6feb2ca23034532296b7834941b5'),
    'vesper': ('src/assets/3d/kicklab-race-vesper/v1/vesper-original.glb', 'f9ef70af796808b9ba02b7dce7ea356de1d3f28c3bb69906634b6857261b6ae6', '001488518e94c46c8e1ccf61c2d9730a561018e2ebe2449d86bdf39e32f8ed05'),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(*args):
    return subprocess.check_output(args, cwd=ROOT, stderr=subprocess.STDOUT)


assert run('blender', '--version').decode().splitlines()[0] == 'Blender 5.1.2'
assert run('cwebp', '-version').decode().splitlines()[0] == '1.6.0'

# Every tracked input except the three target WebPs and this narrow authoring
# chain must remain exactly equal to the deployed base, including H11 captures.
allowed = {f'src/assets/garage/roster/v1/{name}.webp' for name in MODELS}
allowed |= {
    'scripts/race-roster/render-accepted-thumbnail.py',
    'scripts/race-roster/verify-accepted-thumbnails.py',
    'docs/release/roster-thumbnail-replacement-2026-11-03.md',
    'docs/release/shipped-file-rights.csv',
    'docs/release/rights-action-map.csv',
    'docs/release/runtime-rights-evidence-plan.csv',
}
tracked = run('git', 'ls-tree', '-r', '--name-only', BASE).decode().splitlines()
for path in tracked:
    if path in allowed:
        continue
    expected = run('git', 'show', f'{BASE}:{path}')
    actual_path = ROOT / path
    if not actual_path.is_file() or sha(actual_path.read_bytes()) != sha(expected):
        raise SystemExit(f'FROZEN BASE FILE CHANGED: {path}')
for name in ('aegis', 'sable'):
    path = ROOT / f'src/assets/garage/roster/v1/{name}.webp'
    assert sha(path.read_bytes()) == sha(run('git', 'show', f'{BASE}:src/assets/garage/roster/v1/{name}.webp'))

with tempfile.TemporaryDirectory(prefix='kicklab-accepted-stills-') as directory:
    for name, (model, model_hash, expected_hash) in MODELS.items():
        source = ROOT / model
        if sha(source.read_bytes()) != model_hash:
            raise SystemExit(f'ACCEPTED MODEL CHANGED: {model}')
        shipped = ROOT / f'src/assets/garage/roster/v1/{name}.webp'
        hashes = []
        for attempt in (1, 2):
            png = Path(directory) / f'{name}-{attempt}.png'
            webp = Path(directory) / f'{name}-{attempt}.webp'
            run('blender', '-b', '--python', str(ROOT / 'scripts/race-roster/render-accepted-thumbnail.py'), '--', str(source), str(png))
            run('cwebp', '-quiet', '-q', '84', str(png), '-o', str(webp))
            data = webp.read_bytes()
            hashes.append(sha(data))
            if hashes[-1] != expected_hash or data != shipped.read_bytes():
                raise SystemExit(f'NONDETERMINISTIC OR STALE STILL: {name}; expected {expected_hash}; attempts {hashes}')
        print(f'{name}: {expected_hash} ({len(shipped.read_bytes())} bytes), model {model_hash}; independent renders {len(hashes)}')
print('All base files outside the allowlist are byte-identical; three stills reproduce exactly.')
