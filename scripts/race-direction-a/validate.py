"""Check that palette consolidation preserved the selected Direction A contract."""

import json
import struct
import sys
from pathlib import Path


def load(path):
    raw = Path(path).read_bytes()
    assert raw[:4] == b"glTF"
    json_len = struct.unpack_from("<I", raw, 12)[0]
    document = json.loads(raw[20:20 + json_len])
    return document, raw[20 + json_len + 8:]


def accessor(document, binary, index):
    item = document["accessors"][index]
    view = document["bufferViews"][item["bufferView"]]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[item["type"]] * (2 if item["componentType"] == 5123 else 4)
    offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
    return binary[offset:offset + item["count"] * width], item


original, original_bin = load(sys.argv[1])
optimized, optimized_bin = load(sys.argv[2])
assert original["nodes"] == optimized["nodes"]
assert original["scenes"] == optimized["scenes"]
assert len(original["meshes"]) == len(optimized["meshes"]) == 5
assert [node["name"] for node in optimized["nodes"] if node["name"].startswith("Wheel")] == ["WheelFrontLeft", "WheelFrontRight", "WheelRearLeft", "WheelRearRight"]
triangles = 0
for old_mesh, new_mesh in zip(original["meshes"], optimized["meshes"]):
    assert old_mesh["name"] == new_mesh["name"] and len(new_mesh["primitives"]) == 1
    new_primitive = new_mesh["primitives"][0]
    for old_key, new_key in (("POSITION", "POSITION"), ("NORMAL", "NORMAL"), ("TEXCOORD_0", "TEXCOORD_1")):
        old_chunks = [accessor(original, original_bin, primitive["attributes"][old_key])[0] for primitive in old_mesh["primitives"]]
        new_bytes, _ = accessor(optimized, optimized_bin, new_primitive["attributes"][new_key])
        assert b"".join(old_chunks) == new_bytes, f"geometry or UV drift: {old_mesh['name']} {old_key}"
    expected_indices = []
    vertex_offset = 0
    for primitive in old_mesh["primitives"]:
        raw_indices, index_accessor = accessor(original, original_bin, primitive["indices"])
        values = struct.unpack("<" + "H" * index_accessor["count"], raw_indices)
        expected_indices.extend(value + vertex_offset for value in values)
        vertex_offset += original["accessors"][primitive["attributes"]["POSITION"]]["count"]
    new_indices, _ = accessor(optimized, optimized_bin, new_primitive["indices"])
    assert struct.pack("<" + "H" * len(expected_indices), *expected_indices) == new_indices, f"topology drift: {old_mesh['name']}"
    triangles += len(expected_indices) // 3
assert triangles == 22432
assert len(optimized["materials"]) == 1 and len(optimized["images"]) == 3
assert not any(image.get("uri") for image in optimized["images"])
print(json.dumps({"contract": "preserved", "nodes": len(optimized["nodes"]), "separateMeshes": 5, "primitives": 5, "triangles": triangles, "originalUvsPreserved": True, "externalImages": 0}))
