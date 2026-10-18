"""Generate KickLab's original Direction C free-kick athlete.

The asset is built entirely from local Blender primitives and authored keyframes.
It uses no downloads, scans, likenesses, add-ons, external textures, or cloud tools.
Run with:
  blender --background --python scripts/generate-direction-c-athlete.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "src" / "assets" / "3d" / "kicklab-direction-c-athlete" / "v1"
OUTPUT = ASSET_DIR / "kicklab-direction-c-athlete.glb"
SOURCE = ASSET_DIR / "kicklab-direction-c-athlete.blend"
FPS = 30
CONTACT_FRAME = 13
CONTACT_TIME = (CONTACT_FRAME - 1) / FPS


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.armatures,
        bpy.data.actions,
    ):
        for block in list(blocks):
            blocks.remove(block)


MATERIALS = {}
ATLAS_IMAGES = {}
ATLAS_COLUMNS = 3
ATLAS_ROWS = 2
ATLAS_SIZE = 128


def create_surface_atlases() -> None:
    """Author one compact local color/normal/roughness atlas for all materials."""
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    swatches = [
        ((0.30, 0.105, 0.045), 0.62, "skin"),
        ((0.48, 0.20, 0.095), 0.58, "skin"),
        ((0.018, 0.075, 0.16), 0.48, "fabric"),
        ((0.02, 0.72, 0.78), 0.38, "fabric"),
        ((0.95, 0.29, 0.035), 0.30, "boot"),
        ((0.008, 0.012, 0.022), 0.72, "hair"),
    ]
    color_pixels, normal_pixels, roughness_pixels = [], [], []
    cell_w = ATLAS_SIZE // ATLAS_COLUMNS
    cell_h = ATLAS_SIZE // ATLAS_ROWS
    for y in range(ATLAS_SIZE):
        row = min(ATLAS_ROWS - 1, y // cell_h)
        for x in range(ATLAS_SIZE):
            column = min(ATLAS_COLUMNS - 1, x // cell_w)
            base, roughness, surface = swatches[row * ATLAS_COLUMNS + column]
            lx, ly = x % cell_w, y % cell_h
            weave = math.sin(lx * 1.45) * math.sin(ly * 1.45)
            grain = math.sin(lx * 0.31 + ly * 0.73) * math.sin(lx * 0.87 - ly * 0.19)
            if surface == "fabric":
                variation = 0.055 * weave + 0.018 * grain
                nx, ny = 0.055 * math.sin(ly * 1.45), 0.055 * math.sin(lx * 1.45)
            elif surface == "skin":
                variation = 0.022 * grain
                nx, ny = 0.018 * math.sin(ly * 0.52), 0.018 * math.sin(lx * 0.47)
            elif surface == "boot":
                variation = 0.035 * math.sin((lx + ly) * 0.82)
                nx, ny = 0.035 * math.sin(ly * 0.82), 0.035 * math.sin(lx * 0.82)
            else:
                variation = 0.025 * grain
                nx, ny = 0.02 * math.sin(ly * 0.39), 0.02 * math.sin(lx * 0.43)
            color_pixels.extend((*[max(0.0, min(1.0, c * (1 + variation))) for c in base], 1.0))
            normal_pixels.extend((0.5 + nx, 0.5 + ny, 1.0, 1.0))
            rv = max(0.0, min(1.0, roughness + variation * 0.55))
            roughness_pixels.extend((rv, rv, rv, 1.0))
    for name, pixels, non_color in (
        ("DirectionCColorAtlas", color_pixels, False),
        ("DirectionCNormalAtlas", normal_pixels, True),
        ("DirectionCRoughnessAtlas", roughness_pixels, True),
    ):
        image = bpy.data.images.new(name, width=ATLAS_SIZE, height=ATLAS_SIZE, alpha=True)
        image.pixels = pixels
        image.file_format = "PNG"
        image.filepath_raw = str(ASSET_DIR / f"{name}.png")
        if non_color:
            image.colorspace_settings.name = "Non-Color"
        image.save()
        image.pack()
        ATLAS_IMAGES[name] = image


def material(name: str, color, cell: int, metallic=0.0, roughness=0.7):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.metallic = metallic
    value.roughness = roughness
    value.use_nodes = True
    nodes = value.node_tree.nodes
    links = value.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    color_node = nodes.new("ShaderNodeTexImage")
    color_node.name = "SelfAuthoredColorAtlas"
    color_node.image = ATLAS_IMAGES["DirectionCColorAtlas"]
    links.new(color_node.outputs["Color"], shader.inputs["Base Color"])
    roughness_node = nodes.new("ShaderNodeTexImage")
    roughness_node.name = "SelfAuthoredRoughnessAtlas"
    roughness_node.image = ATLAS_IMAGES["DirectionCRoughnessAtlas"]
    links.new(roughness_node.outputs["Color"], shader.inputs["Roughness"])
    normal_texture = nodes.new("ShaderNodeTexImage")
    normal_texture.name = "SelfAuthoredNormalAtlas"
    normal_texture.image = ATLAS_IMAGES["DirectionCNormalAtlas"]
    normal_node = nodes.new("ShaderNodeNormalMap")
    normal_node.inputs["Strength"].default_value = 0.16
    links.new(normal_texture.outputs["Color"], normal_node.inputs["Color"])
    links.new(normal_node.outputs["Normal"], shader.inputs["Normal"])
    value["atlasCell"] = cell
    return value


def build_materials() -> None:
    create_surface_atlases()
    MATERIALS.update(
        skin=material("Skin", (0.30, 0.105, 0.045, 1.0), 0, roughness=0.78),
        skin_hi=material("SkinHighlight", (0.48, 0.20, 0.095, 1.0), 1, roughness=0.72),
        kit=material("KickLabNavy", (0.018, 0.075, 0.16, 1.0), 2, roughness=0.58),
        accent=material("KickLabCyan", (0.02, 0.72, 0.78, 1.0), 3, metallic=0.04, roughness=0.42),
        boots=material("KickLabBoots", (0.95, 0.29, 0.035, 1.0), 4, metallic=0.1, roughness=0.35),
        dark=material("HairEyesStuds", (0.008, 0.012, 0.022, 1.0), 5, roughness=0.88),
    )


def add_armature():
    data = bpy.data.armatures.new("KickLabSharedSkeleton")
    rig = bpy.data.objects.new("KickLabSharedSkeleton", data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bones = {
        "Root": ((0, 0, 0), (0, 0, 0.18), None),
        "Hips": ((0, 0, 0.91), (0, 0, 1.05), "Root"),
        "Spine": ((0, 0, 1.05), (0, 0, 1.30), "Hips"),
        "Chest": ((0, 0, 1.30), (0, 0, 1.53), "Spine"),
        "Neck": ((0, 0, 1.53), (0, 0, 1.64), "Chest"),
        "Head": ((0, 0, 1.64), (0, 0, 1.88), "Neck"),
        "Jaw": ((0, -0.07, 1.74), (0, -0.14, 1.69), "Head"),
        "Shoulder.L": ((0.02, 0, 1.49), (0.23, 0, 1.49), "Chest"),
        "UpperArm.L": ((0.23, 0, 1.49), (0.49, 0, 1.35), "Shoulder.L"),
        "LowerArm.L": ((0.49, 0, 1.35), (0.68, 0, 1.16), "UpperArm.L"),
        "Hand.L": ((0.68, 0, 1.16), (0.77, -0.02, 1.10), "LowerArm.L"),
        "Shoulder.R": ((-0.02, 0, 1.49), (-0.23, 0, 1.49), "Chest"),
        "UpperArm.R": ((-0.23, 0, 1.49), (-0.49, 0, 1.35), "Shoulder.R"),
        "LowerArm.R": ((-0.49, 0, 1.35), (-0.68, 0, 1.16), "UpperArm.R"),
        "Hand.R": ((-0.68, 0, 1.16), (-0.77, -0.02, 1.10), "LowerArm.R"),
        "UpperLeg.L": ((0.125, 0, 0.94), (0.125, 0, 0.56), "Hips"),
        "LowerLeg.L": ((0.125, 0, 0.56), (0.125, 0, 0.17), "UpperLeg.L"),
        "Foot.L": ((0.125, 0, 0.17), (0.125, -0.22, 0.085), "LowerLeg.L"),
        "Toe.L": ((0.125, -0.22, 0.085), (0.125, -0.39, 0.065), "Foot.L"),
        "UpperLeg.R": ((-0.125, 0, 0.94), (-0.125, 0, 0.56), "Hips"),
        "LowerLeg.R": ((-0.125, 0, 0.56), (-0.125, 0, 0.17), "UpperLeg.R"),
        "Foot.R": ((-0.125, 0, 0.17), (-0.125, -0.22, 0.085), "LowerLeg.R"),
        "Toe.R": ((-0.125, -0.22, 0.085), (-0.125, -0.39, 0.065), "Foot.R"),
    }
    for name, (head, tail, parent) in bones.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.use_connect = False
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig["pipeline"] = "kicklab-direction-c-self-authored"
    rig["sharedSkeleton"] = True
    rig["clipContract"] = "Ready|RunUp|Plant|Strike|FollowThrough|Celebrate|Recovery"
    rig["contactClip"] = "Strike"
    rig["contactFrame"] = CONTACT_FRAME
    rig["contactTimeSeconds"] = CONTACT_TIME
    return rig


def bind(obj, rig, bone_name: str):
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new(name="KickLabSharedSkeleton", type="ARMATURE")
    modifier.object = rig
    return obj


def atlas_uv(obj, mat) -> None:
    """Map each part into its material cell with a two-pixel anti-bleed gutter."""
    if not obj.data.uv_layers:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
        bpy.ops.object.mode_set(mode="OBJECT")
        obj.select_set(False)
    cell = int(mat.get("atlasCell", 0))
    column, row = cell % ATLAS_COLUMNS, cell // ATLAS_COLUMNS
    cell_w = ATLAS_SIZE / ATLAS_COLUMNS
    cell_h = ATLAS_SIZE / ATLAS_ROWS
    pad = 2.0
    for loop in obj.data.uv_layers.active.data:
        loop.uv.x = (column * cell_w + pad + loop.uv.x * (cell_w - 2 * pad)) / ATLAS_SIZE
        loop.uv.y = (row * cell_h + pad + loop.uv.y * (cell_h - 2 * pad)) / ATLAS_SIZE


def soften(obj, width=0.02, segments=2):
    bevel = obj.modifiers.new(name="HandAuthoredSoftEdges", type="BEVEL")
    bevel.width = width
    bevel.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def cube(name, location, scale, mat, rig, bone, bevel=0.02, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        soften(obj, bevel)
    obj.data.materials.append(mat)
    atlas_uv(obj, mat)
    return bind(obj, rig, bone)


def sphere(name, location, scale, mat, rig, bone, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    atlas_uv(obj, mat)
    return bind(obj, rig, bone)


def cylinder(name, start, end, radius_a, radius_b, mat, rig, bone, vertices=12):
    a, b = Vector(start), Vector(end)
    delta = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius_a, radius2=radius_b, depth=delta.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    atlas_uv(obj, mat)
    return bind(obj, rig, bone)


def ellipsoid_between(name, start, end, radii, mat, rig, bone, segments=20, rings=12):
    a, b = Vector(start), Vector(end)
    delta = b - a
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (radii[0], radii[1], delta.length / 2)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    atlas_uv(obj, mat)
    return bind(obj, rig, bone)


def organic_segment(name, start, end, start_radii, end_radii, mat, rig, bone, sides=16, rings=7, bulge=0.12):
    """Create a tapered anatomical segment whose ends retain volume at joints."""
    a, b = Vector(start), Vector(end)
    axis = (b - a).normalized()
    side = axis.cross(Vector((0, 1, 0)))
    if side.length < 0.001:
        side = axis.cross(Vector((1, 0, 0)))
    side.normalize()
    depth = axis.cross(side).normalized()
    vertices = []
    for ring in range(rings):
        t = ring / (rings - 1)
        center = a.lerp(b, t)
        muscle = 1.0 + bulge * math.sin(math.pi * t)
        rx = (start_radii[0] * (1 - t) + end_radii[0] * t) * muscle
        ry = (start_radii[1] * (1 - t) + end_radii[1] * t) * muscle
        for step in range(sides):
            angle = math.tau * step / sides
            vertices.append(center + side * math.cos(angle) * rx + depth * math.sin(angle) * ry)
    faces = []
    for ring in range(rings - 1):
        for step in range(sides):
            nxt = (step + 1) % sides
            faces.append((ring * sides + step, ring * sides + nxt, (ring + 1) * sides + nxt, (ring + 1) * sides + step))
    faces.append(tuple(reversed(tuple(range(sides)))))
    faces.append(tuple((rings - 1) * sides + step for step in range(sides)))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    atlas_uv(obj, mat)
    return bind(obj, rig, bone)


def wedge(name, location, half_width, heel_y, toe_y, sole_z, top_z, mat, rig, bone):
    """Create an eight-sided tapered football boot instead of a rectangular block."""
    hw, toe_hw = half_width, half_width * 0.78
    vertices = [
        (-hw, heel_y, sole_z), (hw, heel_y, sole_z), (-toe_hw, toe_y, sole_z + 0.012), (toe_hw, toe_y, sole_z + 0.012),
        (-hw * 0.92, heel_y, top_z), (hw * 0.92, heel_y, top_z), (-toe_hw * 0.88, toe_y, top_z - 0.035), (toe_hw * 0.88, toe_y, top_z - 0.035),
    ]
    faces = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    soften(obj, 0.018, 3)
    obj.data.materials.append(mat)
    atlas_uv(obj, mat)
    return bind(obj, rig, bone)


def football_boot(name, location, mat, rig, bone):
    """Create a shaped boot with ankle collar, instep, forefoot, and tapered toe."""
    sections = [
        (-0.055, 0.074, 0.035, 0.190),
        (-0.175, 0.090, 0.032, 0.145),
        (-0.315, 0.098, 0.030, 0.102),
        (-0.425, 0.072, 0.040, 0.068),
    ]
    vertices = []
    for y, half_width, sole, top in sections:
        vertices.extend(((-half_width, y, sole), (half_width, y, sole), (-half_width * 0.86, y, top), (half_width * 0.86, y, top)))
    faces = []
    for index in range(len(sections) - 1):
        a, b = index * 4, (index + 1) * 4
        faces.extend(((a, b, b + 1, a + 1), (a + 2, a + 3, b + 3, b + 2), (a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3)))
    faces.extend(((0, 1, 3, 2), (12, 14, 15, 13)))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    soften(obj, 0.016, 3)
    obj.data.materials.append(mat)
    atlas_uv(obj, mat)
    return bind(obj, rig, bone)


def join_parts(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = name
    triangulate = parts[0].modifiers.new(name="DeterministicTangents", type="TRIANGULATE")
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.modifier_apply(modifier=triangulate.name)
    for polygon in parts[0].data.polygons:
        polygon.use_smooth = True
    return parts[0]


def build_character(rig):
    m = MATERIALS
    parts = [
        organic_segment("Pelvis", (0, 0.008, 0.93), (0, 0.006, 1.10), (0.205, 0.145), (0.185, 0.132), m["kit"], rig, "Hips", 20, 7, 0.04),
        organic_segment("Abdomen", (0, 0.006, 1.04), (0, 0, 1.34), (0.188, 0.132), (0.222, 0.148), m["kit"], rig, "Spine", 20, 8, 0.05),
        organic_segment("Ribcage", (0, 0, 1.26), (0, 0, 1.53), (0.222, 0.150), (0.265, 0.168), m["kit"], rig, "Chest", 22, 8, 0.06),
        ellipsoid_between("JerseyStripe", (0, -0.168, 1.12), (0, -0.168, 1.49), (0.034, 0.010), m["accent"], rig, "Chest", 14, 8),
        ellipsoid_between("JerseyCollar", (-0.105, -0.145, 1.535), (0.105, -0.145, 1.535), (0.020, 0.012), m["accent"], rig, "Chest", 14, 8),
        ellipsoid_between("NeckMesh", (0, 0, 1.50), (0, 0, 1.66), (0.068, 0.062), m["skin"], rig, "Neck", 20, 12),
        sphere("HeadMesh", (0, -0.006, 1.765), (0.137, 0.12, 0.173), m["skin"], rig, "Head", 24, 16),
        sphere("FacePlane", (0, -0.095, 1.75), (0.110, 0.034, 0.128), m["skin_hi"], rig, "Head", 20, 14),
        sphere("JawMesh", (0, -0.067, 1.69), (0.096, 0.066, 0.078), m["skin"], rig, "Jaw", 20, 12),
        sphere("Chin", (0, -0.112, 1.67), (0.052, 0.029, 0.034), m["skin_hi"], rig, "Jaw", 16, 10),
        sphere("HairCap", (0, 0.010, 1.878), (0.144, 0.124, 0.078), m["dark"], rig, "Head", 24, 14),
        sphere("HairCrown", (0.025, -0.005, 1.927), (0.105, 0.098, 0.052), m["dark"], rig, "Head", 18, 10),
        ellipsoid_between("Nose", (0, -0.112, 1.785), (0, -0.169, 1.752), (0.026, 0.022), m["skin_hi"], rig, "Head", 14, 8),
        cube("Brow.L", (0.052, -0.121, 1.81), (0.035, 0.008, 0.008), m["dark"], rig, "Head", 0.004, (0, 0.05, -0.1)),
        cube("Brow.R", (-0.052, -0.121, 1.81), (0.035, 0.008, 0.008), m["dark"], rig, "Head", 0.004, (0, -0.05, 0.1)),
        ellipsoid_between("Mouth", (-0.034, -0.145, 1.704), (0.034, -0.145, 1.704), (0.008, 0.006), m["dark"], rig, "Jaw", 12, 6),
    ]
    for side, label in ((1, "L"), (-1, "R")):
        parts += [
            sphere(f"Eye.{label}", (0.049 * side, -0.132, 1.785), (0.011, 0.007, 0.010), m["dark"], rig, "Head", 12, 8),
            sphere(f"Ear.{label}", (0.137 * side, -0.002, 1.76), (0.025, 0.016, 0.038), m["skin"], rig, "Head", 14, 8),
            organic_segment(f"Deltoid.{label}", (0.205 * side, 0, 1.49), (0.315 * side, 0, 1.43), (0.098, 0.092), (0.088, 0.080), m["kit"], rig, f"UpperArm.{label}", 16, 6, 0.05),
            ellipsoid_between(f"ShoulderSeam.{label}", (0.24 * side, -0.094, 1.49), (0.31 * side, -0.092, 1.42), (0.014, 0.009), m["accent"], rig, f"UpperArm.{label}", 12, 6),
            organic_segment(f"Bicep.{label}", (0.275 * side, 0, 1.45), (0.495 * side, 0, 1.34), (0.084, 0.075), (0.056, 0.050), m["kit"], rig, f"UpperArm.{label}", 16, 7, 0.13),
            organic_segment(f"Forearm.{label}", (0.47 * side, 0, 1.36), (0.69 * side, -0.006, 1.15), (0.057, 0.052), (0.040, 0.036), m["skin"], rig, f"LowerArm.{label}", 16, 7, 0.14),
            organic_segment(f"Palm.{label}", (0.675 * side, -0.010, 1.16), (0.765 * side, -0.026, 1.098), (0.044, 0.034), (0.039, 0.028), m["skin"], rig, f"Hand.{label}", 14, 6, 0.05),
            organic_segment(f"Fingers.{label}", (0.745 * side, -0.027, 1.112), (0.795 * side, -0.030, 1.076), (0.035, 0.026), (0.022, 0.018), m["skin_hi"], rig, f"Hand.{label}", 12, 5, 0.02),
            organic_segment(f"Shorts.{label}", (0.125 * side, 0, 0.96), (0.125 * side, 0, 0.75), (0.125, 0.110), (0.112, 0.098), m["kit"], rig, f"UpperLeg.{label}", 18, 7, 0.05),
            organic_segment(f"Thigh.{label}", (0.125 * side, 0, 0.80), (0.125 * side, -0.006, 0.55), (0.111, 0.098), (0.076, 0.069), m["skin_hi"], rig, f"UpperLeg.{label}", 18, 7, 0.12),
            organic_segment(f"Calf.{label}", (0.125 * side, -0.006, 0.58), (0.125 * side, 0, 0.20), (0.076, 0.068), (0.049, 0.044), m["dark"], rig, f"LowerLeg.{label}", 18, 8, 0.18),
            football_boot(f"BootUpper.{label}", (0.125 * side, 0, 0), m["boots"], rig, f"Foot.{label}"),
            wedge(f"BootSole.{label}", (0.125 * side, 0, 0), 0.101, -0.07, -0.405, 0.016, 0.052, m["dark"], rig, f"Foot.{label}"),
            ellipsoid_between(f"KineticThigh.{label}", (0.19 * side, -0.097, 0.78), (0.19 * side, -0.082, 0.60), (0.016, 0.010), m["accent"], rig, f"UpperLeg.{label}", 12, 6),
            ellipsoid_between(f"KineticCalf.{label}", (0.185 * side, -0.072, 0.49), (0.17 * side, -0.062, 0.26), (0.013, 0.009), m["accent"], rig, f"LowerLeg.{label}", 12, 6),
        ]
        for x in (-0.055, 0.0, 0.055):
            parts.append(cylinder(f"Stud.{label}.{x}", (0.125 * side + x, -0.29, 0.026), (0.125 * side + x, -0.29, 0.008), 0.011, 0.008, m["dark"], rig, f"Foot.{label}", 8))
    athlete = join_parts(parts, "AthleteSurface")
    athlete["role"] = "direction-c-stylized-realistic-athlete"
    athlete["likeness"] = "none-original-design"
    return athlete


def clear_pose(rig):
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.location = (0, 0, 0)
        pose_bone.scale = (1, 1, 1)


def key(rig, frame, transforms):
    bpy.context.scene.frame_set(frame)
    clear_pose(rig)
    for bone_name, values in transforms.items():
        pose_bone = rig.pose.bones[bone_name]
        if "rotation" in values:
            pose_bone.rotation_euler = values["rotation"]
        if "location" in values:
            pose_bone.location = values["location"]
    for pose_bone in rig.pose.bones:
        pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=pose_bone.name)
        pose_bone.keyframe_insert(data_path="location", frame=frame, group=pose_bone.name)


def action(rig, name, frames):
    clip = bpy.data.actions.new(name)
    clip.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = clip
    for frame, transforms in frames:
        key(rig, frame, transforms)
    clip["fps"] = FPS
    clip["phase"] = name
    return clip


def build_animations(rig):
    ready_a = {"Chest": {"rotation": (0.01, 0, -0.025)}, "UpperLeg.L": {"rotation": (0.03, 0, 0.02)}, "UpperLeg.R": {"rotation": (-0.03, 0, -0.02)}, "UpperArm.L": {"rotation": (0.08, -0.05, -0.10)}, "UpperArm.R": {"rotation": (-0.08, 0.05, 0.10)}}
    ready_b = {"Chest": {"rotation": (-0.012, 0, 0.025)}, "Head": {"rotation": (0.012, 0, -0.015)}, "UpperArm.L": {"rotation": (0.04, -0.04, -0.08)}, "UpperArm.R": {"rotation": (-0.04, 0.04, 0.08)}}
    action(rig, "Ready", [(1, ready_a), (30, ready_b), (60, ready_a)])
    run_a = {"Hips": {"rotation": (0.10, 0, 0)}, "Chest": {"rotation": (-0.08, 0, 0.04)}, "UpperLeg.L": {"rotation": (-0.68, 0, 0.02)}, "LowerLeg.L": {"rotation": (0.90, 0, 0)}, "UpperLeg.R": {"rotation": (0.54, 0, -0.02)}, "LowerLeg.R": {"rotation": (0.28, 0, 0)}, "UpperArm.L": {"rotation": (0.55, 0, -0.18)}, "UpperArm.R": {"rotation": (-0.50, 0, 0.18)}}
    run_b = {"Hips": {"rotation": (0.10, 0, 0)}, "Chest": {"rotation": (-0.08, 0, -0.04)}, "UpperLeg.L": {"rotation": (0.54, 0, 0.02)}, "LowerLeg.L": {"rotation": (0.28, 0, 0)}, "UpperLeg.R": {"rotation": (-0.68, 0, -0.02)}, "LowerLeg.R": {"rotation": (0.90, 0, 0)}, "UpperArm.L": {"rotation": (-0.50, 0, -0.18)}, "UpperArm.R": {"rotation": (0.55, 0, 0.18)}}
    action(rig, "RunUp", [(1, run_a), (10, run_b), (19, run_a)])
    plant = {"Hips": {"rotation": (0.08, 0, -0.08)}, "Chest": {"rotation": (-0.10, 0, 0.10)}, "UpperLeg.L": {"rotation": (0.08, 0, 0)}, "LowerLeg.L": {"rotation": (-0.06, 0, 0)}, "Foot.L": {"rotation": (-0.02, 0, 0)}, "UpperLeg.R": {"rotation": (-0.90, 0.02, -0.03)}, "LowerLeg.R": {"rotation": (1.25, 0, 0)}, "Foot.R": {"rotation": (-0.30, 0, 0)}, "UpperArm.L": {"rotation": (0.25, 0.1, -0.5)}, "UpperArm.R": {"rotation": (-0.3, -0.1, 0.48)}}
    action(rig, "Plant", [(1, run_b), (12, plant), (18, plant)])
    strike_pre = plant
    strike_contact = {"Hips": {"rotation": (0.08, 0, -0.08)}, "Chest": {"rotation": (-0.02, 0, 0.18)}, "UpperLeg.L": {"rotation": (0.08, 0, 0)}, "LowerLeg.L": {"rotation": (-0.06, 0, 0)}, "Foot.L": {"rotation": (-0.02, 0, 0)}, "UpperLeg.R": {"rotation": (0.50, 0.02, -0.04)}, "LowerLeg.R": {"rotation": (-0.05, 0, 0)}, "Foot.R": {"rotation": (0.15, 0, 0)}, "UpperArm.L": {"rotation": (-0.28, 0.16, 0.52)}, "UpperArm.R": {"rotation": (0.22, -0.13, -0.46)}, "Head": {"rotation": (0.03, 0.04, -0.05)}}
    strike_post = {"Hips": {"rotation": (0.08, 0, -0.08)}, "Chest": {"rotation": (-0.04, 0, 0.12)}, "UpperLeg.L": {"rotation": (0.08, 0, 0)}, "LowerLeg.L": {"rotation": (-0.06, 0, 0)}, "Foot.L": {"rotation": (-0.02, 0, 0)}, "UpperLeg.R": {"rotation": (1.12, 0, -0.02)}, "LowerLeg.R": {"rotation": (0.22, 0, 0)}, "Foot.R": {"rotation": (0.30, 0, 0)}, "UpperArm.L": {"rotation": (-0.22, 0.10, 0.42)}, "UpperArm.R": {"rotation": (0.18, -0.10, -0.34)}}
    strike = action(rig, "Strike", [(1, strike_pre), (CONTACT_FRAME, strike_contact), (19, strike_post)])
    strike["contactFrame"] = CONTACT_FRAME
    strike["contactTimeSeconds"] = CONTACT_TIME
    follow = {"Hips": {"rotation": (0.08, 0, -0.08)}, "Chest": {"rotation": (-0.06, 0, 0.08)}, "UpperLeg.L": {"rotation": (0.08, 0, 0)}, "LowerLeg.L": {"rotation": (-0.06, 0, 0)}, "Foot.L": {"rotation": (-0.02, 0, 0)}, "UpperLeg.R": {"rotation": (1.28, 0, 0)}, "LowerLeg.R": {"rotation": (0.48, 0, 0)}, "Foot.R": {"rotation": (0.22, 0, 0)}, "UpperArm.L": {"rotation": (-0.18, 0.10, 0.34)}, "UpperArm.R": {"rotation": (0.14, -0.08, -0.28)}}
    action(rig, "FollowThrough", [(1, strike_post), (12, follow), (28, ready_b)])
    celebrate = {"Hips": {"rotation": (0.02, 0, 0)}, "Chest": {"rotation": (-0.06, 0, 0)}, "UpperArm.L": {"rotation": (2.48, -0.1, -0.20)}, "LowerArm.L": {"rotation": (0.18, 0, 0)}, "UpperArm.R": {"rotation": (-2.48, 0.1, 0.20)}, "LowerArm.R": {"rotation": (-0.18, 0, 0)}, "Head": {"rotation": (-0.10, 0, 0)}}
    celebrate_b = dict(celebrate)
    celebrate_b["Hips"] = {"location": (0, 0, 0.07), "rotation": (0.02, 0, 0)}
    action(rig, "Celebrate", [(1, ready_a), (12, celebrate), (24, celebrate_b), (36, celebrate), (52, celebrate_b), (66, celebrate)])
    action(rig, "Recovery", [(1, follow), (18, ready_b), (34, ready_a)])
    rig.animation_data.action = bpy.data.actions["Ready"]


def marker(name, rig, bone, location, role):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "SPHERE"
    obj.empty_display_size = 0.028
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.location = location
    obj["role"] = role
    return obj


def build_markers(rig):
    strike_marker = marker("StrikeContact_R", rig, "Foot.R", (0, -0.24, -0.01), "striking-foot-contact")
    plant_marker = marker("PlantContact_L", rig, "Foot.L", (0, -0.18, -0.06), "plant-foot-contact")
    bpy.context.scene.frame_set(CONTACT_FRAME)
    rig.animation_data.action = bpy.data.actions["Strike"]
    bpy.context.view_layer.update()
    target = bpy.data.objects.new("BallContactTarget", None)
    bpy.context.collection.objects.link(target)
    target.location = strike_marker.matrix_world.translation.copy()
    target.empty_display_type = "SPHERE"
    target.empty_display_size = 0.11
    target["role"] = "ball-contact-target"
    target["contactClip"] = "Strike"
    target["contactFrame"] = CONTACT_FRAME
    target["contactTimeSeconds"] = CONTACT_TIME
    target["toleranceMm"] = 10
    plant_marker["lockedClip"] = "Plant|Strike|FollowThrough"
    plant_marker["toleranceMm"] = 10
    rig.animation_data.action = bpy.data.actions["Ready"]
    bpy.context.scene.frame_set(1)


def save_and_export():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 66
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        use_selection=False,
        export_materials="EXPORT",
        export_yup=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_merge_animation="ACTION",
        export_force_sampling=True,
        export_sampling_interpolation_fallback="LINEAR",
        export_anim_slide_to_zero=True,
        export_skins=True,
        export_def_bones=True,
        export_influence_nb=4,
        export_all_influences=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_texcoords=True,
        export_tangents=True,
        export_vertex_color="NONE",
        export_optimize_animation_size=True,
        export_loglevel=-1,
    )


def main():
    reset_scene()
    build_materials()
    rig = add_armature()
    build_character(rig)
    build_animations(rig)
    build_markers(rig)
    save_and_export()
    print(f"WROTE {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
    print(f"SOURCE {SOURCE} ({SOURCE.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
