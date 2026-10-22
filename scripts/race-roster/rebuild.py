"""Rebuild the local Kestrel/Aegis colorways, thumbnails, and manifests.

Run from any directory: python3 scripts/race-roster/rebuild.py
Requires the repository's Node dependencies, Blender, and cwebp. No network input.
The candidate GLBs must match the checked-in original geometry and UV baseline
before any repository asset is replaced.
"""
import hashlib
import json
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

from audit import BASELINE, geometry_fingerprint

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = Path(__file__).resolve().parent
ASSETS = ROOT / 'src/assets/3d'
THUMBNAILS = ROOT / 'src/assets/garage/roster/v1'
PROOF = ('Blender CLI generated original analytic geometry and local UV/material work. '
         'The 2026-10-22 local colorway revision changed materials only; geometry and UV '
         'fingerprints match the original roster baseline. No provider geometry, image, '
         'or external texture is included.')

for command in ('blender', 'cwebp', 'node'):
    if not shutil.which(command):
        raise SystemExit(f'{command} is required to rebuild local Race colorways')

with tempfile.TemporaryDirectory(prefix='kicklab-race-colorway-') as temporary:
    temp = Path(temporary)
    candidates = {}
    for name, paint, aero in (
        ('kestrel', 'body · solar orange lacquer', 'aero · dark graphite sill'),
        ('aegis', 'body · deep crimson lacquer', 'aero · black carbon surfaces'),
    ):
        out = temp / name
        subprocess.run(['blender', '-b', '--python', str(SCRIPT / 'generate.py'),
                        '--', name, '--output', str(out)], check=True, cwd=ROOT,
                       stdout=subprocess.DEVNULL)
        glb = out / f'{name}-original.glb'
        raw = glb.read_bytes()
        if not raw.startswith(b'glTF') or len(raw) >= 1_200_000:
            raise SystemExit(f'{name}: invalid or oversized GLB')
        json_length = struct.unpack_from('<I', raw, 12)[0]
        document = json.loads(raw[20:20 + json_length])
        actual = {
            'topology': geometry_fingerprint(raw, document, json_length,
                                             ('POSITION', 'NORMAL', 'indices')),
            'uv': geometry_fingerprint(raw, document, json_length, ('TEXCOORD_0',)),
        }
        if actual != BASELINE[name]:
            raise SystemExit(f'{name}: geometry or UV changed: {actual}')
        material_names = {material['name'] for material in document['materials']}
        if paint not in material_names or aero not in material_names:
            raise SystemExit(f'{name}: expected local paint or aero material missing')
        candidates[name] = out
    for name, out in candidates.items():
        destination = ASSETS / f'kicklab-race-{name}' / 'v1'
        for ext in ('blend', 'glb'):
            shutil.copy2(out / f'{name}-original.{ext}',
                         destination / f'{name}-original.{ext}')
        png = temp / f'{name}-thumbnail.png'
        subprocess.run(['blender', '-b', str(destination / f'{name}-original.blend'),
                        '--python', str(SCRIPT / 'render-thumbnails.py'), '--', str(png)],
                       check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
        subprocess.run(['cwebp', '-quiet', '-q', '84', str(png), '-o',
                        str(THUMBNAILS / f'{name}.webp')], check=True, cwd=ROOT)
        manifest_path = destination / 'asset-manifest.json'
        manifest = json.loads(manifest_path.read_text())
        raw = (destination / f'{name}-original.glb').read_bytes()
        manifest['artifact']['bytes'] = len(raw)
        manifest['artifact']['sha256'] = hashlib.sha256(raw).hexdigest()
        manifest['license']['proof'] = PROOF
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
        print(f'{name}: {len(raw)} bytes, SHA-256 {manifest["artifact"]["sha256"]}')

subprocess.run(['python3', str(SCRIPT / 'audit.py')], check=True, cwd=ROOT,
               stdout=subprocess.DEVNULL)
subprocess.run(['node', str(ROOT / 'scripts/validate-3d-assets.mjs')], check=True,
               cwd=ROOT, stdout=subprocess.DEVNULL)
print('Race colorway assets, topology, UVs, thumbnails, and manifests validated')
