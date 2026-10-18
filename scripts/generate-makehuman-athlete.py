"""Generate the local MPFB/MakeHuman Direction C evaluation athlete.

Run with the isolated MPFB 2.0.18 Blender profile documented in
``docs/architecture/makehuman-athlete-qualification.md``. The script uses only
MPFB's bundled CC0 basemesh, targets, and game-engine rig data. It performs no
network access and loads no community assets.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector

from bl_ext.user_default.mpfb.services import HumanService, TargetService


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "src" / "assets" / "3d" / "kicklab-direction-c-athlete" / "v2"
SOURCE = ASSET_DIR / "kicklab-makehuman-athlete.blend"
OUTPUT = ASSET_DIR / "kicklab-makehuman-athlete.glb"
SILHOUETTE = ROOT / "qa-artifacts" / "makehuman-athlete" / "isolated-silhouette.png"
FPS = 30
CONTACT_FRAME = 13


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures, bpy.data.actions):
        for block in list(collection):
            collection.remove(block)


def make_material(name: str, color: tuple[float, float, float, float], roughness: float = 0.65, metallic: float = 0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return material


def build_materials():
    return {
        "skin": make_material("MakeHumanCoreSkin", (0.31, 0.115, 0.050, 1.0), 0.74),
        "kit": make_material("KickLabNavy", (0.015, 0.065, 0.15, 1.0), 0.52),
        "accent": make_material("KickLabCyan", (0.015, 0.72, 0.76, 1.0), 0.38, 0.03),
        "boots": make_material("KickLabBoots", (0.94, 0.25, 0.025, 1.0), 0.34, 0.07),
        "dark": make_material("HairEyesStuds", (0.006, 0.010, 0.018, 1.0), 0.82),
    }


def create_adult_athlete():
    macro = TargetService.get_default_macro_info_dict()
    macro.update({
        "age": 0.50,
        "gender": 0.72,
        "muscle": 0.72,
        "weight": 0.47,
        "height": 0.58,
        "proportions": 0.56,
        "cupsize": 0.50,
        "firmness": 0.50,
    })
    macro["race"] = {"african": 0.34, "asian": 0.33, "caucasian": 0.33}
    body = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=True,
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,
        macro_detail_dict=macro,
    )
    body.name = "KickLabMakeHumanAthlete"
    body["source"] = "MPFB 2.0.18 bundled MakeHuman core basemesh and targets"
    body["fictionalAdult"] = True
    body["likeness"] = "none"
    rig = HumanService.add_builtin_rig(body, "game_engine", import_weights=True)
    rig.name = "KickLabMakeHumanGameEngineRig"
    rig["retargetContract"] = "docs/architecture/makehuman-athlete-qualification.md"
    return body, rig


def require_core_asset(relative_path: str) -> Path:
    root = os.environ.get("KICKLAB_MAKEHUMAN_CORE_ASSETS")
    if not root:
        raise RuntimeError("KICKLAB_MAKEHUMAN_CORE_ASSETS must point to the verified CC0 system-pack extraction")
    path = Path(root) / relative_path
    if not path.is_file():
        raise FileNotFoundError(f"Required verified core asset is missing: {path}")
    return path


def replace_material(obj, material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.material_index = 0


def assign_under_kit(body, materials) -> None:
    body.data.materials.append(materials["kit"])
    body.data.materials.append(materials["boots"])
    kit_index = len(body.data.materials) - 2
    boot_index = len(body.data.materials) - 1
    vertices = body.data.vertices
    for polygon in body.data.polygons:
        center = sum((vertices[index].co for index in polygon.vertices), Vector()) / len(polygon.vertices)
        if center.z < 0.19:
            polygon.material_index = boot_index
        elif 0.84 < center.z < 1.44 and abs(center.x) < 0.36:
            polygon.material_index = kit_index


def add_core_assets(body) -> dict:
    skin = require_core_asset("skins/young_african_male/young_african_male.mhmat")
    sportsuit = require_core_asset("clothes/female_sportsuit01/female_sportsuit01.mhclo")
    shoes = require_core_asset("clothes/shoes04/shoes04.mhclo")
    hair = require_core_asset("hair/short04/short04.mhclo")
    eyes = require_core_asset("eyes/low-poly/low-poly.mhclo")
    HumanService.set_character_skin(str(skin), body, skin_type="GAMEENGINE", material_instances=False)
    suit_object = HumanService.add_mhclo_asset(str(sportsuit), body, asset_type="Clothes", subdiv_levels=0, material_type="NONE")
    shoe_object = HumanService.add_mhclo_asset(str(shoes), body, asset_type="Clothes", subdiv_levels=0, material_type="NONE")
    hair_object = HumanService.add_mhclo_asset(str(hair), body, asset_type="Hair", subdiv_levels=0, material_type="NONE")
    eye_object = HumanService.add_mhclo_asset(str(eyes), body, asset_type="Eyes", subdiv_levels=0, material_type="NONE")
    materials = build_materials()
    suit_object.name = "KickLabCoreSportsuit"
    shoe_object.name = "KickLabCoreFootballBoots"
    hair_object.name = "KickLabCoreShortHair"
    eye_object.name = "KickLabCoreEyes"
    replace_material(suit_object, materials["kit"])
    replace_material(shoe_object, materials["boots"])
    replace_material(hair_object, materials["dark"])
    replace_material(eye_object, materials["dark"])
    assign_under_kit(body, materials)
    for image in bpy.data.images:
        if image.size[0] > 256 or image.size[1] > 256:
            image.scale(256, 256)
            image.pack()
    return {"suit": suit_object, "shoes": shoe_object, "hair": hair_object, "eyes": eye_object}


def clear_pose(rig) -> None:
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.location = (0, 0, 0)
        pose_bone.scale = (1, 1, 1)


def key_pose(rig, frame: int, transforms: dict) -> None:
    bpy.context.scene.frame_set(frame)
    clear_pose(rig)
    for bone_name, values in transforms.items():
        bone = rig.pose.bones.get(bone_name)
        if not bone:
            continue
        if "rotation" in values:
            bone.rotation_euler = values["rotation"]
        if "location" in values:
            bone.location = values["location"]
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)


def create_action(rig, name: str, frames: list[tuple[int, dict]]) -> None:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, transforms in frames:
        key_pose(rig, frame, transforms)
    action["fps"] = FPS
    action["phase"] = name


def build_actions(rig) -> None:
    ready_a = {"spine_03": {"rotation": (0.02, 0, -0.025)}, "thigh_l": {"rotation": (0.03, 0, 0.02)}, "thigh_r": {"rotation": (-0.03, 0, -0.02)}, "upperarm_l": {"rotation": (0.08, -0.05, -0.10)}, "upperarm_r": {"rotation": (-0.08, 0.05, 0.10)}}
    ready_b = {"spine_03": {"rotation": (-0.012, 0, 0.025)}, "head": {"rotation": (0.012, 0, -0.015)}, "upperarm_l": {"rotation": (0.04, -0.04, -0.08)}, "upperarm_r": {"rotation": (-0.04, 0.04, 0.08)}}
    run_a = {"pelvis": {"rotation": (0.10, 0, 0)}, "spine_03": {"rotation": (-0.08, 0, 0.04)}, "thigh_l": {"rotation": (-0.68, 0, 0.02)}, "calf_l": {"rotation": (0.90, 0, 0)}, "thigh_r": {"rotation": (0.54, 0, -0.02)}, "calf_r": {"rotation": (0.28, 0, 0)}, "upperarm_l": {"rotation": (0.55, 0, -0.18)}, "upperarm_r": {"rotation": (-0.50, 0, 0.18)}}
    run_b = {"pelvis": {"rotation": (0.10, 0, 0)}, "spine_03": {"rotation": (-0.08, 0, -0.04)}, "thigh_l": {"rotation": (0.54, 0, 0.02)}, "calf_l": {"rotation": (0.28, 0, 0)}, "thigh_r": {"rotation": (-0.68, 0, -0.02)}, "calf_r": {"rotation": (0.90, 0, 0)}, "upperarm_l": {"rotation": (-0.50, 0, -0.18)}, "upperarm_r": {"rotation": (0.55, 0, 0.18)}}
    plant = {"pelvis": {"rotation": (0.08, 0, -0.08)}, "spine_03": {"rotation": (-0.10, 0, 0.10)}, "thigh_l": {"rotation": (0.08, 0, 0)}, "calf_l": {"rotation": (-0.06, 0, 0)}, "foot_l": {"rotation": (-0.02, 0, 0)}, "thigh_r": {"rotation": (0.78, 0.02, -0.03)}, "calf_r": {"rotation": (1.10, 0, 0)}, "foot_r": {"rotation": (-0.30, 0, 0)}, "upperarm_l": {"rotation": (0.25, 0.1, -0.5)}, "upperarm_r": {"rotation": (-0.3, -0.1, 0.48)}}
    strike_contact = {"pelvis": {"rotation": (0.08, 0, -0.08)}, "spine_03": {"rotation": (-0.02, 0, 0.18)}, "thigh_l": {"rotation": (0.08, 0, 0)}, "calf_l": {"rotation": (-0.06, 0, 0)}, "foot_l": {"rotation": (-0.02, 0, 0)}, "thigh_r": {"rotation": (-0.48, 0.02, -0.04)}, "calf_r": {"rotation": (-0.05, 0, 0)}, "foot_r": {"rotation": (0.15, 0, 0)}, "upperarm_l": {"rotation": (-0.28, 0.16, 0.52)}, "upperarm_r": {"rotation": (0.22, -0.13, -0.46)}, "head": {"rotation": (0.03, 0.04, -0.05)}}
    strike_post = {"pelvis": {"rotation": (0.08, 0, -0.08)}, "spine_03": {"rotation": (-0.04, 0, 0.12)}, "thigh_l": {"rotation": (0.08, 0, 0)}, "calf_l": {"rotation": (-0.06, 0, 0)}, "foot_l": {"rotation": (-0.02, 0, 0)}, "thigh_r": {"rotation": (-1.02, 0, -0.02)}, "calf_r": {"rotation": (0.22, 0, 0)}, "foot_r": {"rotation": (0.30, 0, 0)}, "upperarm_l": {"rotation": (-0.22, 0.10, 0.42)}, "upperarm_r": {"rotation": (0.18, -0.10, -0.34)}}
    follow = dict(strike_post)
    follow["thigh_r"] = {"rotation": (-1.22, 0, 0)}
    celebrate = {"spine_03": {"rotation": (-0.06, 0, 0)}, "upperarm_l": {"rotation": (2.48, -0.1, -0.20)}, "lowerarm_l": {"rotation": (0.18, 0, 0)}, "upperarm_r": {"rotation": (-2.48, 0.1, 0.20)}, "lowerarm_r": {"rotation": (-0.18, 0, 0)}, "head": {"rotation": (-0.10, 0, 0)}}
    celebrate_b = dict(celebrate)
    celebrate_b["pelvis"] = {"location": (0, 0, 0.07)}
    create_action(rig, "Ready", [(1, ready_a), (30, ready_b), (60, ready_a)])
    create_action(rig, "RunUp", [(1, run_a), (10, run_b), (19, run_a)])
    create_action(rig, "Plant", [(1, run_b), (12, plant), (18, plant)])
    create_action(rig, "Strike", [(1, plant), (CONTACT_FRAME, strike_contact), (19, strike_post)])
    create_action(rig, "FollowThrough", [(1, strike_post), (12, follow), (28, ready_b)])
    create_action(rig, "Celebrate", [(1, ready_a), (12, celebrate), (24, celebrate_b), (36, celebrate), (52, celebrate_b), (66, celebrate)])
    create_action(rig, "Recovery", [(1, follow), (18, ready_b), (34, ready_a)])
    rig.animation_data.action = bpy.data.actions["Ready"]


def add_marker(name: str, rig, bone_name: str, offset: tuple[float, float, float], role: str):
    marker = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(marker)
    marker.empty_display_type = "SPHERE"
    marker.empty_display_size = 0.025
    marker.parent = rig
    marker.parent_type = "BONE"
    marker.parent_bone = bone_name
    marker.location = offset
    marker["role"] = role
    return marker


def build_markers(rig) -> None:
    strike = add_marker("StrikeContact_R", rig, "foot_r", (0, -0.18, -0.02), "striking-foot-contact")
    plant = add_marker("PlantContact_L", rig, "foot_l", (0, -0.14, -0.0655), "plant-foot-contact")
    rig.animation_data.action = bpy.data.actions["Strike"]
    bpy.context.scene.frame_set(CONTACT_FRAME)
    bpy.context.view_layer.update()
    target = bpy.data.objects.new("BallContactTarget", None)
    bpy.context.collection.objects.link(target)
    target.location = strike.matrix_world.translation.copy()
    target.empty_display_type = "SPHERE"
    target.empty_display_size = 0.11
    target["role"] = "ball-contact-target"
    target["contactFrame"] = CONTACT_FRAME
    target["contactTimeSeconds"] = (CONTACT_FRAME - 1) / FPS
    plant["lockedClip"] = "Plant|Strike|FollowThrough"
    rig.animation_data.action = bpy.data.actions["Ready"]
    bpy.context.scene.frame_set(1)


def point_at(obj, point) -> None:
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_silhouette(rig) -> None:
    SILHOUETTE.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(SILHOUETTE)
    scene.world.color = (0.006, 0.012, 0.028)
    rig.animation_data.action = bpy.data.actions["Strike"]
    scene.frame_set(CONTACT_FRAME)
    target = bpy.data.objects.get("BallContactTarget")
    ball_location = target.matrix_world.translation.copy() if target else Vector((0, -0.8, 0.12))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.11, location=ball_location)
    ball = bpy.context.object
    ball.name = "SilhouetteBall"
    ball.data.materials.append(make_material("SilhouetteBallMaterial", (0.92, 0.94, 0.97, 1.0), 0.56))
    bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, 0))
    ground = bpy.context.object
    ground.name = "SilhouetteGround"
    ground.data.materials.append(make_material("SilhouetteGroundMaterial", (0.01, 0.025, 0.04, 1.0), 0.88))
    bpy.ops.object.light_add(type="AREA", location=(2.8, -3.4, 4.1))
    key = bpy.context.object
    key.data.energy = 1050
    key.data.shape = "DISK"
    key.data.size = 4.0
    point_at(key, (0, 0, 1.0))
    bpy.ops.object.light_add(type="AREA", location=(-3.0, 1.4, 2.7))
    rim = bpy.context.object
    rim.data.energy = 820
    rim.data.color = (0.04, 0.72, 0.9)
    rim.data.size = 3.0
    point_at(rim, (0, 0, 1.0))
    bpy.ops.object.camera_add(location=(4.9, -1.15, 1.62))
    camera = bpy.context.object
    camera.data.lens = 58
    point_at(camera, (0, 0, 0.95))
    scene.camera = camera
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(ball, do_unlink=True)
    bpy.data.objects.remove(ground, do_unlink=True)
    bpy.data.objects.remove(key, do_unlink=True)
    bpy.data.objects.remove(rim, do_unlink=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def save_source() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 66
    bpy.context.preferences.filepaths.save_version = 0
    # MPFB uses Mask modifiers to hide helper/body geometry covered by proxies.
    # glTF does not carry Mask modifiers, so bake only those visibility cuts while
    # leaving the armature modifier live for animation export.
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        if obj.data.shape_keys:
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        for modifier in list(obj.modifiers):
            if modifier.type != "MASK":
                continue
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            while obj.modifiers.find(modifier.name) > 0:
                bpy.ops.object.modifier_move_up(modifier=modifier.name)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
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
        export_armature_object_remove=True,
        export_def_bones=True,
        export_influence_nb=4,
        export_all_influences=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_texcoords=True,
        export_tangents=False,
        export_vertex_color="NONE",
        export_optimize_animation_size=True,
        export_loglevel=-1,
    )


def main() -> None:
    reset_scene()
    body, rig = create_adult_athlete()
    add_core_assets(body)
    build_actions(rig)
    build_markers(rig)
    render_silhouette(rig)
    save_source()
    print(f"WROTE {SOURCE} ({SOURCE.stat().st_size} bytes)")
    print(f"EXPORTED {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
    print(f"SILHOUETTE {SILHOUETTE}")


if __name__ == "__main__":
    main()
