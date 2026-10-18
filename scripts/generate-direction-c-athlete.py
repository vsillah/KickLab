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


def material(name: str, color, metallic=0.0, roughness=0.7):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.metallic = metallic
    value.roughness = roughness
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return value


MATERIALS = {}


def build_materials() -> None:
    MATERIALS.update(
        skin=material("Skin", (0.30, 0.105, 0.045, 1.0), roughness=0.78),
        skin_hi=material("SkinHighlight", (0.48, 0.20, 0.095, 1.0), roughness=0.72),
        kit=material("KickLabNavy", (0.018, 0.075, 0.16, 1.0), roughness=0.58),
        accent=material("KickLabCyan", (0.02, 0.72, 0.78, 1.0), metallic=0.04, roughness=0.42),
        boots=material("KickLabBoots", (0.95, 0.29, 0.035, 1.0), metallic=0.1, roughness=0.35),
        dark=material("HairEyesStuds", (0.008, 0.012, 0.022, 1.0), roughness=0.88),
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
    return bind(obj, rig, bone)


def sphere(name, location, scale, mat, rig, bone, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
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
    return bind(obj, rig, bone)


def join_parts(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = name
    return parts[0]


def build_character(rig):
    m = MATERIALS
    parts = [
        sphere("Pelvis", (0, 0, 0.98), (0.19, 0.13, 0.15), m["kit"], rig, "Hips"),
        sphere("Ribcage", (0, 0, 1.34), (0.255, 0.155, 0.30), m["kit"], rig, "Chest", 20, 12),
        cube("JerseyStripe", (0, -0.156, 1.35), (0.045, 0.009, 0.27), m["accent"], rig, "Chest", 0.008),
        cube("JerseyCollar", (0, -0.145, 1.535), (0.12, 0.012, 0.025), m["accent"], rig, "Chest", 0.008),
        cylinder("NeckMesh", (0, 0, 1.52), (0, 0, 1.65), 0.067, 0.062, m["skin"], rig, "Neck"),
        sphere("HeadMesh", (0, 0, 1.76), (0.14, 0.125, 0.17), m["skin"], rig, "Head", 20, 14),
        sphere("Cheek.L", (0.067, -0.102, 1.735), (0.052, 0.035, 0.052), m["skin_hi"], rig, "Head", 12, 8),
        sphere("Cheek.R", (-0.067, -0.102, 1.735), (0.052, 0.035, 0.052), m["skin_hi"], rig, "Head", 12, 8),
        cube("JawMesh", (0, -0.105, 1.69), (0.073, 0.04, 0.045), m["skin"], rig, "Jaw", 0.026),
        sphere("HairCap", (0, 0.018, 1.865), (0.145, 0.13, 0.083), m["dark"], rig, "Head", 18, 10),
        cylinder("Nose", (0, -0.116, 1.775), (0, -0.16, 1.755), 0.026, 0.014, m["skin_hi"], rig, "Head", 10),
        cube("Brow.L", (0.052, -0.121, 1.81), (0.035, 0.008, 0.008), m["dark"], rig, "Head", 0.004, (0, 0.05, -0.1)),
        cube("Brow.R", (-0.052, -0.121, 1.81), (0.035, 0.008, 0.008), m["dark"], rig, "Head", 0.004, (0, -0.05, 0.1)),
        cube("Mouth", (0, -0.142, 1.705), (0.038, 0.006, 0.008), m["dark"], rig, "Jaw", 0.004),
    ]
    for side, label in ((1, "L"), (-1, "R")):
        parts += [
            sphere(f"Eye.{label}", (0.052 * side, -0.121, 1.782), (0.018, 0.011, 0.014), m["dark"], rig, "Head", 10, 6),
            sphere(f"Ear.{label}", (0.139 * side, -0.005, 1.76), (0.026, 0.018, 0.04), m["skin"], rig, "Head", 10, 6),
            sphere(f"Sleeve.{label}", (0.275 * side, 0, 1.455), (0.115, 0.115, 0.13), m["accent"], rig, f"UpperArm.{label}"),
            sphere(f"Hand.{label}", (0.73 * side, -0.01, 1.13), (0.058, 0.045, 0.078), m["skin"], rig, f"Hand.{label}"),
            cube(f"Boot.{label}", (0.125 * side, -0.245, 0.105), (0.09, 0.20, 0.068), m["boots"], rig, f"Foot.{label}", 0.035),
            cube(f"Toe.{label}", (0.125 * side, -0.395, 0.072), (0.09, 0.085, 0.045), m["boots"], rig, f"Toe.{label}", 0.025),
        ]
        for x in (-0.05, 0.05):
            parts.append(cylinder(f"Stud.{label}.{x}", (0.125 * side + x, -0.26, 0.04), (0.125 * side + x, -0.26, 0.018), 0.012, 0.009, m["dark"], rig, f"Foot.{label}", 8))
    limbs = [
        ("UpperArm.L", (0.23, 0, 1.49), (0.49, 0, 1.35), 0.086, 0.069, m["kit"]),
        ("LowerArm.L", (0.49, 0, 1.35), (0.68, 0, 1.16), 0.068, 0.052, m["skin"]),
        ("UpperArm.R", (-0.23, 0, 1.49), (-0.49, 0, 1.35), 0.086, 0.069, m["kit"]),
        ("LowerArm.R", (-0.49, 0, 1.35), (-0.68, 0, 1.16), 0.068, 0.052, m["skin"]),
        ("UpperLeg.L", (0.125, 0, 0.93), (0.125, 0, 0.57), 0.125, 0.098, m["kit"]),
        ("LowerLeg.L", (0.125, 0, 0.55), (0.125, 0, 0.18), 0.086, 0.061, m["skin"]),
        ("UpperLeg.R", (-0.125, 0, 0.93), (-0.125, 0, 0.57), 0.125, 0.098, m["kit"]),
        ("LowerLeg.R", (-0.125, 0, 0.55), (-0.125, 0, 0.18), 0.086, 0.061, m["skin"]),
    ]
    for bone, start, end, r1, r2, mat in limbs:
        parts.append(cylinder(f"{bone}Mesh", start, end, r1, r2, mat, rig, bone, 14))
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
    plant = {"Hips": {"rotation": (0.12, 0, -0.08)}, "Chest": {"rotation": (-0.10, 0, 0.10)}, "UpperLeg.L": {"rotation": (0.08, 0, 0)}, "LowerLeg.L": {"rotation": (-0.06, 0, 0)}, "Foot.L": {"rotation": (-0.02, 0, 0)}, "UpperLeg.R": {"rotation": (-0.90, 0.02, -0.03)}, "LowerLeg.R": {"rotation": (1.25, 0, 0)}, "Foot.R": {"rotation": (-0.30, 0, 0)}, "UpperArm.L": {"rotation": (0.25, 0.1, -0.5)}, "UpperArm.R": {"rotation": (-0.3, -0.1, 0.48)}}
    action(rig, "Plant", [(1, run_b), (12, plant), (18, plant)])
    strike_pre = plant
    strike_contact = {"Hips": {"rotation": (-0.03, 0, -0.14)}, "Chest": {"rotation": (-0.02, 0, 0.18)}, "UpperLeg.L": {"rotation": (0.07, 0, 0)}, "LowerLeg.L": {"rotation": (-0.05, 0, 0)}, "Foot.L": {"rotation": (-0.02, 0, 0)}, "UpperLeg.R": {"rotation": (0.92, 0.02, -0.04)}, "LowerLeg.R": {"rotation": (-0.12, 0, 0)}, "Foot.R": {"rotation": (0.15, 0, 0)}, "UpperArm.L": {"rotation": (-0.28, 0.16, 0.52)}, "UpperArm.R": {"rotation": (0.22, -0.13, -0.46)}, "Head": {"rotation": (0.03, 0.04, -0.05)}}
    strike_post = {"Hips": {"rotation": (-0.02, 0, -0.10)}, "Chest": {"rotation": (-0.04, 0, 0.12)}, "UpperLeg.R": {"rotation": (1.12, 0, -0.02)}, "LowerLeg.R": {"rotation": (0.22, 0, 0)}, "Foot.R": {"rotation": (0.30, 0, 0)}, "UpperArm.L": {"rotation": (-0.22, 0.10, 0.42)}, "UpperArm.R": {"rotation": (0.18, -0.10, -0.34)}}
    strike = action(rig, "Strike", [(1, strike_pre), (CONTACT_FRAME, strike_contact), (19, strike_post)])
    strike["contactFrame"] = CONTACT_FRAME
    strike["contactTimeSeconds"] = CONTACT_TIME
    follow = {"Hips": {"rotation": (-0.02, 0, -0.06)}, "Chest": {"rotation": (-0.06, 0, 0.08)}, "UpperLeg.L": {"rotation": (0.08, 0, 0)}, "LowerLeg.L": {"rotation": (-0.04, 0, 0)}, "UpperLeg.R": {"rotation": (1.28, 0, 0)}, "LowerLeg.R": {"rotation": (0.48, 0, 0)}, "Foot.R": {"rotation": (0.22, 0, 0)}, "UpperArm.L": {"rotation": (-0.18, 0.10, 0.34)}, "UpperArm.R": {"rotation": (0.14, -0.08, -0.28)}}
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
        export_texcoords=False,
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
