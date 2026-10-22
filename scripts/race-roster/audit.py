"""Fail-closed local GLB topology, pivot, UV, and payload audit."""
import json
import struct
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'src/assets/3d'
EXPECTED = {
    'WheelFrontLeft': (1.28, .43, -1.04),
    'WheelFrontRight': (1.28, .43, 1.04),
    'WheelRearLeft': (-1.28, .43, -1.04),
    'WheelRearRight': (-1.28, .43, 1.04),
}
BASELINE = json.loads((Path(__file__).resolve().parent / 'geometry-baseline.json').read_text())


def geometry_fingerprint(raw, doc, json_length, keys):
    binary_start = 20 + json_length + 8
    digest = hashlib.sha256()
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            for key in keys:
                index = primitive['indices'] if key == 'indices' else primitive['attributes'][key]
                accessor = doc['accessors'][index]
                view = doc['bufferViews'][accessor['bufferView']]
                start = binary_start + view.get('byteOffset', 0)
                digest.update(key.encode())
                digest.update(json.dumps({field: accessor[field] for field in ('componentType', 'count', 'type')}, sort_keys=True).encode())
                digest.update(raw[start:start + view['byteLength']])
    return digest.hexdigest()


def inspect(name):
    path = ASSETS / f'kicklab-race-{name}' / 'v1' / f'{name}-original.glb'
    raw = path.read_bytes()
    assert raw[:4] == b'glTF' and len(raw) < 1_200_000
    json_len = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + json_len])
    fingerprints = {
        'topology': geometry_fingerprint(raw, doc, json_len, ('POSITION', 'NORMAL', 'indices')),
        'uv': geometry_fingerprint(raw, doc, json_len, ('TEXCOORD_0',)),
    }
    assert fingerprints == BASELINE[name], f'{name} geometry or UV changed: {fingerprints}'
    nodes = {node.get('name'): node for node in doc['nodes']}
    assert 'VehicleRoot' in nodes and 'Body' in nodes
    wheel_meshes = []
    for key, expected in EXPECTED.items():
        node = nodes[key]
        assert 'mesh' in node, f'{name} {key} lacks independent mesh'
        wheel_meshes.append(node['mesh'])
        actual = node.get('translation', [0, 0, 0])
        assert all(abs(a - b) < .001 for a, b in zip(actual, expected)), f'{name} {key} pivot {actual}'
    assert len(set(wheel_meshes)) == 4
    assert set(nodes['VehicleRoot']['children']) >= {doc['nodes'].index(nodes[k]) for k in ['Body', *EXPECTED]}
    assert all(not image.get('uri') for image in doc.get('images', []))
    assert all(not buffer.get('uri') for buffer in doc.get('buffers', []))
    assert all('TEXCOORD_0' in primitive['attributes'] for mesh in doc['meshes'] for primitive in mesh['primitives'])
    assert all('pbrMetallicRoughness' in material for material in doc['materials'])
    triangles = sum(doc['accessors'][primitive['indices']]['count'] // 3 for mesh in doc['meshes'] for primitive in mesh['primitives'])
    assert triangles < 22432, f'{name} exceeds Direction A triangle count'
    return {'id': name, 'bytes': len(raw), 'meshes': len(doc['meshes']), 'triangles': triangles,
            'materials': len(doc['materials']), 'wheelPivots': EXPECTED,
            'externalUris': 0, 'uvOnEveryPrimitive': True, 'fingerprints': fingerprints}


if __name__ == '__main__':
    report = [inspect(name) for name in ('kestrel', 'aegis')]
    print(json.dumps(report, indent=2))
