"""Generate KickLab's self-authored 3D pipeline evaluation asset.

This file is intentionally dependency-free outside Blender's bundled Python API.
It creates only primitive geometry and writes a local GLB. No network, downloads,
third-party assets, likenesses, or production game files are involved.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "assets" / "kicklab-placeholder-athlete.glb"
FPS = 30
CONTACT_FRAME = 18


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.armatures,
        bpy.data.actions,
    ):
        for block in list(datablocks):
            datablocks.remove(block)


def material(name: str, color: tuple[float, float, float, float], metallic=0.0, roughness=0.7):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.metallic = metallic
    value.roughness = roughness
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Alpha"].default_value = color[3]
    if color[3] < 1:
        value.surface_render_method = "DITHERED"
    return value


def add_armature():
    data = bpy.data.armatures.new("KickLabSharedSkeleton")
    rig = bpy.data.objects.new("KickLabSharedSkeleton", data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    # Coordinates use Blender's Z-up convention. The glTF exporter converts to Y-up.
    bones = {
        "Root": ((0, 0, 0), (0, 0, 0.18), None),
        "Hips": ((0, 0, 0.88), (0, 0, 1.04), "Root"),
        "Spine": ((0, 0, 1.04), (0, 0, 1.30), "Hips"),
        "Chest": ((0, 0, 1.30), (0, 0, 1.52), "Spine"),
        "Neck": ((0, 0, 1.52), (0, 0, 1.64), "Chest"),
        "Head": ((0, 0, 1.64), (0, 0, 1.86), "Neck"),
        "Jaw": ((0, -0.07, 1.72), (0, -0.14, 1.68), "Head"),
        "Shoulder.L": ((0.02, 0, 1.49), (0.22, 0, 1.49), "Chest"),
        "UpperArm.L": ((0.22, 0, 1.49), (0.50, 0, 1.38), "Shoulder.L"),
        "LowerArm.L": ((0.50, 0, 1.38), (0.70, 0, 1.22), "UpperArm.L"),
        "Hand.L": ((0.70, 0, 1.22), (0.79, -0.01, 1.17), "LowerArm.L"),
        "Shoulder.R": ((-0.02, 0, 1.49), (-0.22, 0, 1.49), "Chest"),
        "UpperArm.R": ((-0.22, 0, 1.49), (-0.50, 0, 1.38), "Shoulder.R"),
        "LowerArm.R": ((-0.50, 0, 1.38), (-0.70, 0, 1.22), "UpperArm.R"),
        "Hand.R": ((-0.70, 0, 1.22), (-0.79, -0.01, 1.17), "LowerArm.R"),
        "UpperLeg.L": ((0.13, 0, 0.96), (0.13, 0, 0.56), "Hips"),
        "LowerLeg.L": ((0.13, 0, 0.56), (0.13, 0, 0.16), "UpperLeg.L"),
        "Foot.L": ((0.13, 0, 0.16), (0.13, -0.24, 0.08), "LowerLeg.L"),
        "Toe.L": ((0.13, -0.24, 0.08), (0.13, -0.37, 0.07), "Foot.L"),
        "UpperLeg.R": ((-0.13, 0, 0.96), (-0.13, 0, 0.56), "Hips"),
        "LowerLeg.R": ((-0.13, 0, 0.56), (-0.13, 0, 0.16), "UpperLeg.R"),
        "Foot.R": ((-0.13, 0, 0.16), (-0.13, -0.24, 0.08), "LowerLeg.R"),
        "Toe.R": ((-0.13, -0.24, 0.08), (-0.13, -0.37, 0.07), "Foot.R"),
    }
    for name, (head, tail, parent) in bones.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.use_connect = False
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig["pipeline"] = "self-authored-placeholder"
    rig["sharedSkeleton"] = True
    return rig


def weight_to_bone(obj, rig, bone_name: str):
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new(name="SharedSkeleton", type="ARMATURE")
    modifier.object = rig


def box(name, location, scale, mat, rig, bone):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    weight_to_bone(obj, rig, bone)
    return obj


def sphere(name, location, scale, mat, rig, bone, segments=12, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    weight_to_bone(obj, rig, bone)
    return obj


def cylinder_between(name, start, end, radius, mat, rig, bone, vertices=10):
    a, b = Vector(start), Vector(end)
    delta = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=delta.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    weight_to_bone(obj, rig, bone)
    return obj


def join_parts(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = name
    return parts[0]


def build_character(rig):
    skin = material("Skin", (0.36, 0.16, 0.08, 1.0), roughness=0.82)
    shirt = material("KickLabShirt", (0.03, 0.33, 0.56, 1.0), roughness=0.62)
    shorts = material("KickLabShorts", (0.025, 0.055, 0.12, 1.0), roughness=0.68)
    socks = material("KickLabSocks", (0.9, 0.94, 0.98, 1.0), roughness=0.72)
    boots = material("KickLabBoots", (0.95, 0.27, 0.05, 1.0), metallic=0.08, roughness=0.38)
    hair = material("Hair", (0.018, 0.012, 0.01, 1.0), roughness=0.95)
    eyes = material("Eyes", (0.02, 0.08, 0.12, 1.0), roughness=0.32)
    accent = material("KitAccent", (0.12, 0.95, 0.75, 1.0), metallic=0.06, roughness=0.45)

    parts = []
    parts += [box("Pelvis", (0, 0, 0.98), (0.18, 0.11, 0.13), shorts, rig, "Hips")]
    parts += [box("Torso", (0, 0, 1.34), (0.23, 0.13, 0.29), shirt, rig, "Chest")]
    parts += [box("ChestStripe", (0, -0.137, 1.36), (0.035, 0.008, 0.27), accent, rig, "Chest")]
    parts += [cylinder_between("NeckMesh", (0, 0, 1.52), (0, 0, 1.64), 0.065, skin, rig, "Neck")]
    parts += [sphere("HeadMesh", (0, 0, 1.76), (0.135, 0.12, 0.16), skin, rig, "Head")]
    parts += [sphere("HairMesh", (0, 0.015, 1.86), (0.14, 0.125, 0.08), hair, rig, "Head")]
    parts += [box("JawMesh", (0, -0.105, 1.69), (0.065, 0.035, 0.04), skin, rig, "Jaw")]
    for side in (-1, 1):
        parts += [sphere(f"Eye{side}", (0.052 * side, -0.113, 1.79), (0.018, 0.012, 0.012), eyes, rig, "Head", 8, 6)]

    limbs = [
        ("UpperArm.L", (0.22, 0, 1.49), (0.50, 0, 1.38), 0.075, shirt),
        ("LowerArm.L", (0.50, 0, 1.38), (0.70, 0, 1.22), 0.060, skin),
        ("UpperArm.R", (-0.22, 0, 1.49), (-0.50, 0, 1.38), 0.075, shirt),
        ("LowerArm.R", (-0.50, 0, 1.38), (-0.70, 0, 1.22), 0.060, skin),
        ("UpperLeg.L", (0.13, 0, 0.94), (0.13, 0, 0.57), 0.105, shorts),
        ("LowerLeg.L", (0.13, 0, 0.55), (0.13, 0, 0.18), 0.072, socks),
        ("UpperLeg.R", (-0.13, 0, 0.94), (-0.13, 0, 0.57), 0.105, shorts),
        ("LowerLeg.R", (-0.13, 0, 0.55), (-0.13, 0, 0.18), 0.072, socks),
    ]
    for bone, start, end, radius, mat in limbs:
        parts.append(cylinder_between(f"{bone}Mesh", start, end, radius, mat, rig, bone))
    for side, label in ((1, "L"), (-1, "R")):
        parts.append(sphere(f"Hand.{label}Mesh", (0.755 * side, -0.005, 1.19), (0.055, 0.045, 0.075), skin, rig, f"Hand.{label}"))
        parts.append(box(f"Boot.{label}Mesh", (0.13 * side, -0.22, 0.10), (0.085, 0.19, 0.065), boots, rig, f"Foot.{label}"))
        parts.append(box(f"Toe.{label}Mesh", (0.13 * side, -0.36, 0.075), (0.082, 0.08, 0.045), boots, rig, f"Toe.{label}"))
    athlete = join_parts(parts, "AthleteSurface")
    athlete.parent = rig
    athlete["role"] = "stylized-athlete-surface"

    muscle = material("AnatomyMuscle", (0.1, 0.9, 0.75, 0.72), metallic=0.08, roughness=0.4)
    anatomy_parts = []
    anatomy_parts += [box("CoreAnatomy", (0, -0.145, 1.33), (0.17, 0.018, 0.23), muscle, rig, "Chest")]
    anatomy_parts += [sphere("CraniumAnatomy", (0, 0, 1.76), (0.142, 0.128, 0.168), muscle, rig, "Head", 10, 6)]
    for bone, start, end, radius, _ in limbs:
        anatomy_parts.append(cylinder_between(f"{bone}Anatomy", start, end, radius * 0.58, muscle, rig, bone, 8))
    anatomy = join_parts(anatomy_parts, "SharedSkeletonAnatomy")
    anatomy.parent = rig
    anatomy["role"] = "same-skeleton-anatomy-overlay"
    anatomy.hide_render = False
    return athlete, anatomy


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
    clear_pose(rig)
    clip = bpy.data.actions.new(name)
    clip.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = clip
    for frame, transforms in frames:
        key(rig, frame, transforms)
    return clip


def build_animations(rig):
    idle = action(
        rig,
        "Idle",
        [
            (1, {"Chest": {"rotation": (0.0, 0.0, -0.025)}, "Head": {"rotation": (0.02, 0.0, 0.01)}}),
            (30, {"Chest": {"rotation": (0.025, 0.0, 0.025)}, "Head": {"rotation": (-0.015, 0.0, -0.015)}}),
            (60, {"Chest": {"rotation": (0.0, 0.0, -0.025)}, "Head": {"rotation": (0.02, 0.0, 0.01)}}),
        ],
    )
    kick = action(
        rig,
        "KickContact",
        [
            (1, {}),
            (9, {
                "Hips": {"rotation": (0.04, 0.0, 0.12)},
                "UpperLeg.R": {"rotation": (-0.82, 0.04, 0.02)},
                "LowerLeg.R": {"rotation": (1.24, 0.0, 0.0)},
                "Foot.R": {"rotation": (-0.34, 0.0, 0.0)},
                "UpperArm.L": {"rotation": (0.12, -0.16, -0.36)},
                "UpperArm.R": {"rotation": (-0.2, 0.1, 0.42)},
            }),
            (CONTACT_FRAME, {
                "Hips": {"rotation": (-0.03, 0.0, -0.12)},
                "UpperLeg.R": {"rotation": (0.88, 0.02, -0.03)},
                "LowerLeg.R": {"rotation": (-0.18, 0.0, 0.0)},
                "Foot.R": {"rotation": (0.20, 0.0, 0.0)},
                "UpperArm.L": {"rotation": (-0.20, 0.20, 0.46)},
                "UpperArm.R": {"rotation": (0.16, -0.16, -0.38)},
                "Chest": {"rotation": (0.0, 0.0, -0.14)},
            }),
            (26, {
                "Hips": {"rotation": (0.02, 0.0, -0.08)},
                "UpperLeg.R": {"rotation": (0.46, 0.0, 0.0)},
                "LowerLeg.R": {"rotation": (0.32, 0.0, 0.0)},
                "UpperArm.L": {"rotation": (-0.12, 0.1, 0.28)},
                "UpperArm.R": {"rotation": (0.10, -0.08, -0.22)},
            }),
            (40, {}),
        ],
    )
    rig.animation_data.action = kick
    return idle, kick


def add_contact_marker_and_ball(rig):
    marker = bpy.data.objects.new("FootContact_R", None)
    bpy.context.collection.objects.link(marker)
    marker.empty_display_type = "SPHERE"
    marker.empty_display_size = 0.035
    marker.parent = rig
    marker.parent_type = "BONE"
    marker.parent_bone = "Foot.R"
    marker.location = (0, -0.23, -0.01)
    marker["role"] = "exact-foot-contact-marker"
    marker["contactFrame"] = CONTACT_FRAME
    marker["contactTimeSeconds"] = round((CONTACT_FRAME - 1) / FPS, 6)

    bpy.context.scene.frame_set(CONTACT_FRAME)
    bpy.context.view_layer.update()
    contact = marker.matrix_world.translation.copy()
    ball_mat = material("Ball", (0.98, 0.98, 0.95, 1.0), metallic=0.0, roughness=0.55)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.11, location=contact)
    ball = bpy.context.object
    ball.name = "ContactBall"
    ball.data.materials.append(ball_mat)
    ball["role"] = "contact-target"
    ball["contactFrame"] = CONTACT_FRAME
    bpy.context.scene.frame_set(1)
    return marker, ball


def export_glb():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        use_selection=False,
        export_materials="EXPORT",
        export_extras=True,
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
        export_image_format="NONE",
        export_vertex_color="NONE",
        export_optimize_animation_size=False,
        export_loglevel=-1,
    )


def main():
    reset_scene()
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = 60
    rig = add_armature()
    build_character(rig)
    build_animations(rig)
    add_contact_marker_and_ball(rig)
    export_glb()
    print(f"WROTE {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
