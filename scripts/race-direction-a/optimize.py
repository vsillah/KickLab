"""Losslessly consolidate Direction A geometry into five independently movable meshes.

Flat material factors become tiny local PBR palette textures. The original UVs are
retained as TEXCOORD_1, while TEXCOORD_0 selects each material's atlas swatch.
No Blender source, contract node, wheel pivot, position, normal, or triangle changes.
"""

import argparse
import copy
import hashlib
import json
import math
import struct
import zlib
from pathlib import Path


def png_rgba(width, height, pixels):
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
    raw = b"".join(b"\0" + bytes(pixels[y * width * 4:(y + 1) * width * 4]) for y in range(height))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def srgb_byte(linear):
    linear = max(0.0, min(1.0, linear))
    encoded = 12.92 * linear if linear <= 0.0031308 else 1.055 * linear ** (1 / 2.4) - 0.055
    return round(encoded * 255)


parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
raw = args.source.read_bytes()
assert raw[:4] == b"glTF" and struct.unpack_from("<I", raw, 4)[0] == 2
json_len = struct.unpack_from("<I", raw, 12)[0]
source = json.loads(raw[20:20 + json_len])
bin_start = 20 + json_len + 8
binary = raw[bin_start:]
assert len(source["buffers"]) == 1
assert len(source["meshes"]) == 5 and len(source["materials"]) == 10


def accessor_bytes(index):
    accessor = source["accessors"][index]
    view = source["bufferViews"][accessor["bufferView"]]
    assert accessor["componentType"] in (5123, 5126) and not view.get("byteStride") and not accessor.get("sparse")
    components = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[accessor["type"]]
    size = accessor["count"] * components * (2 if accessor["componentType"] == 5123 else 4)
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    return binary[offset:offset + size], accessor


atlas_width, atlas_height = 64, 4
palettes = {"base": bytearray(atlas_width * atlas_height * 4), "mr": bytearray(atlas_width * atlas_height * 4), "emissive": bytearray(atlas_width * atlas_height * 4)}
for slot, material in enumerate(source["materials"]):
    pbr = material["pbrMetallicRoughness"]
    color = pbr["baseColorFactor"]
    strength = material.get("extensions", {}).get("KHR_materials_emissive_strength", {}).get("emissiveStrength", 1)
    emission = material.get("emissiveFactor", [0, 0, 0])
    pixels = {
        "base": [*(srgb_byte(v) for v in color[:3]), 255],
        "mr": [0, round(pbr["roughnessFactor"] * 255), round(pbr["metallicFactor"] * 255), 255],
        "emissive": [*(srgb_byte(v * strength / 2) for v in emission), 255],
    }
    for y in range(atlas_height):
        for x in range(slot * 6, slot * 6 + 6):
            for kind, rgba in pixels.items():
                palettes[kind][(y * atlas_width + x) * 4:(y * atlas_width + x + 1) * 4] = bytes(rgba)

target = {key: copy.deepcopy(source[key]) for key in ("asset", "scene", "scenes", "nodes")}
target["asset"].setdefault("extras", {})["directionA"] = {
    "sourceSha256": hashlib.sha256(raw).hexdigest(),
    "semanticMaterialSlots": {
        "body": [0, 2], "glass": [1], "aero": [3, 4, 5],
        "lights": [6, 7], "wheels": [8, 9],
    },
}
target["extensionsUsed"] = ["KHR_materials_emissive_strength"]
target["meshes"] = []
target["materials"] = [{
    "name": "Direction A palette · original PBR factors",
    "extras": {"sourceMaterialNames": [material["name"] for material in source["materials"]]},
    "doubleSided": True,
    "pbrMetallicRoughness": {
        "baseColorFactor": [1, 1, 1, 1],
        "baseColorTexture": {"index": 0},
        "metallicFactor": 1,
        "roughnessFactor": 1,
        "metallicRoughnessTexture": {"index": 1},
    },
    "emissiveFactor": [1, 1, 1],
    "emissiveTexture": {"index": 2},
    "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": 2}},
}]
target["samplers"] = [{"magFilter": 9728, "minFilter": 9728, "wrapS": 33071, "wrapT": 33071}]
target["textures"] = [{"sampler": 0, "source": i} for i in range(3)]
target["images"] = []
target["accessors"], target["bufferViews"] = [], []
out_binary = bytearray()


def add_buffer(payload, *, kind=None):
    while len(out_binary) % 4:
        out_binary.append(0)
    offset = len(out_binary)
    out_binary.extend(payload)
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(payload)}
    if kind:
        view["target"] = kind
    target["bufferViews"].append(view)
    return len(target["bufferViews"]) - 1


def add_accessor(payload, component_type, count, value_type, *, min_value=None, max_value=None, kind=34962):
    item = {"bufferView": add_buffer(payload, kind=kind), "componentType": component_type, "count": count, "type": value_type}
    if min_value is not None:
        item["min"] = min_value
        item["max"] = max_value
    target["accessors"].append(item)
    return len(target["accessors"]) - 1


for original_mesh in source["meshes"]:
    positions, normals, atlas_uvs, original_uvs, indices = [], [], [], [], []
    position_min, position_max = [math.inf] * 3, [-math.inf] * 3
    vertex_offset = 0
    for primitive in original_mesh["primitives"]:
        attrs = primitive["attributes"]
        for key, parts in (("POSITION", positions), ("NORMAL", normals), ("TEXCOORD_0", original_uvs)):
            chunk, accessor = accessor_bytes(attrs[key])
            assert accessor["componentType"] == 5126
            parts.append(chunk)
        vertex_count = source["accessors"][attrs["POSITION"]]["count"]
        slot = primitive["material"]
        uv = struct.pack("<2f", (slot * 6 + 3) / atlas_width, 0.5)
        atlas_uvs.append(uv * vertex_count)
        if "min" in source["accessors"][attrs["POSITION"]]:
            a = source["accessors"][attrs["POSITION"]]
            position_min = [min(x, y) for x, y in zip(position_min, a["min"])]
            position_max = [max(x, y) for x, y in zip(position_max, a["max"])]
        index_chunk, index_accessor = accessor_bytes(primitive["indices"])
        assert index_accessor["componentType"] == 5123
        values = struct.unpack("<" + "H" * index_accessor["count"], index_chunk)
        indices.extend(value + vertex_offset for value in values)
        vertex_offset += vertex_count
    assert vertex_offset < 65536
    attributes = {
        "POSITION": add_accessor(b"".join(positions), 5126, vertex_offset, "VEC3", min_value=position_min, max_value=position_max),
        "NORMAL": add_accessor(b"".join(normals), 5126, vertex_offset, "VEC3"),
        "TEXCOORD_0": add_accessor(b"".join(atlas_uvs), 5126, vertex_offset, "VEC2"),
        "TEXCOORD_1": add_accessor(b"".join(original_uvs), 5126, vertex_offset, "VEC2"),
    }
    index_bytes = struct.pack("<" + "H" * len(indices), *indices)
    target["meshes"].append({"name": original_mesh["name"], "primitives": [{"attributes": attributes, "indices": add_accessor(index_bytes, 5123, len(indices), "SCALAR", kind=34963), "material": 0, "mode": 4}]})

for kind in ("base", "mr", "emissive"):
    pixels = png_rgba(atlas_width, atlas_height, palettes[kind])
    target["images"].append({"name": f"Direction A {kind} palette", "mimeType": "image/png", "bufferView": add_buffer(pixels)})

target["buffers"] = [{"byteLength": len(out_binary)}]
encoded_json = json.dumps(target, separators=(",", ":"), ensure_ascii=False).encode("utf8")
encoded_json += b" " * ((-len(encoded_json)) % 4)
out_binary.extend(b"\0" * ((-len(out_binary)) % 4))
glb = b"".join((b"glTF", struct.pack("<II", 2, 12 + 8 + len(encoded_json) + 8 + len(out_binary)), struct.pack("<I4s", len(encoded_json), b"JSON"), encoded_json, struct.pack("<I4s", len(out_binary), b"BIN\0"), out_binary))
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_bytes(glb)
print(json.dumps({"source": str(args.source), "sourceSha256": hashlib.sha256(raw).hexdigest(), "output": str(args.output), "outputSha256": hashlib.sha256(glb).hexdigest(), "bytes": len(glb), "meshes": len(target["meshes"]), "primitives": sum(len(m["primitives"]) for m in target["meshes"]), "triangles": sum(target["accessors"][m["primitives"][0]["indices"]]["count"] // 3 for m in target["meshes"]), "materials": len(target["materials"]), "images": len(target["images"])}))
