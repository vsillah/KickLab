"""Add KickLab-authored multi-activity clips to the approved local v2 athlete.

Run with Blender against the checked-in editable source. This script opens no
network connection and introduces no external asset; it only adds animation
actions to the existing MPFB/MakeHuman skeleton before saving and exporting.
"""

from __future__ import annotations

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "src" / "assets" / "3d" / "kicklab-direction-c-athlete" / "v2"
SOURCE = ASSET_DIR / "kicklab-makehuman-athlete.blend"
OUTPUT = ASSET_DIR / "kicklab-makehuman-athlete.glb"
FPS = 30
ACTIVITY_ACTIONS = (
    "HeaderReady",
    "HeaderContact",
    "DribbleCycle",
    "PassContact",
    "ComboVolley",
    "KeeperReady",
    "KeeperDive",
    "PenaltyStrike",
    "CrossbarStrike",
)


def rig_object():
    rig = bpy.data.objects.get("KickLabMakeHumanGameEngineRig")
    if not rig or rig.type != "ARMATURE":
        raise RuntimeError("Approved Direction C game-engine rig is missing")
    return rig


def clear_pose(rig) -> None:
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)


def key_pose(rig, frame: int, transforms: dict) -> None:
    bpy.context.scene.frame_set(frame)
    clear_pose(rig)
    for bone_name, values in transforms.items():
        bone = rig.pose.bones.get(bone_name)
        if not bone:
            raise RuntimeError(f"Required shared-skeleton bone is missing: {bone_name}")
        if "rotation" in values:
            bone.rotation_euler = values["rotation"]
        if "location" in values:
            bone.location = values["location"]
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)


def create_action(rig, name: str, frames: list[tuple[int, dict]], contact_frame: int | None = None) -> None:
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, transforms in frames:
        key_pose(rig, frame, transforms)
    action["fps"] = FPS
    action["phase"] = name
    action["kicklabActivityClip"] = True
    if contact_frame is not None:
        action["contactFrame"] = contact_frame


def build_actions(rig) -> None:
    ready = {
        "pelvis": {"rotation": (0.04, 0, 0)},
        "spine_03": {"rotation": (-0.04, 0, 0)},
        "thigh_l": {"rotation": (0.10, 0, 0)},
        "thigh_r": {"rotation": (-0.10, 0, 0)},
        "upperarm_l": {"rotation": (0.16, 0.05, -0.12)},
        "upperarm_r": {"rotation": (-0.16, -0.05, 0.12)},
    }
    run_l = {
        "pelvis": {"rotation": (0.12, 0, 0)}, "spine_03": {"rotation": (-0.10, 0, 0.04)},
        "thigh_l": {"rotation": (-0.62, 0, 0.03)}, "calf_l": {"rotation": (0.92, 0, 0)},
        "thigh_r": {"rotation": (0.56, 0, -0.03)}, "calf_r": {"rotation": (0.24, 0, 0)},
        "upperarm_l": {"rotation": (0.58, 0, -0.18)}, "upperarm_r": {"rotation": (-0.54, 0, 0.18)},
    }
    run_r = {
        "pelvis": {"rotation": (0.12, 0, 0)}, "spine_03": {"rotation": (-0.10, 0, -0.04)},
        "thigh_l": {"rotation": (0.56, 0, 0.03)}, "calf_l": {"rotation": (0.24, 0, 0)},
        "thigh_r": {"rotation": (-0.62, 0, -0.03)}, "calf_r": {"rotation": (0.92, 0, 0)},
        "upperarm_l": {"rotation": (-0.54, 0, -0.18)}, "upperarm_r": {"rotation": (0.58, 0, 0.18)},
    }
    header_load = {
        "pelvis": {"location": (0, 0, 0.10), "rotation": (0.08, 0, 0)},
        "spine_03": {"rotation": (-0.16, 0, 0)}, "head": {"rotation": (0.10, 0, 0)},
        "thigh_l": {"rotation": (0.22, 0, 0.10)}, "calf_l": {"rotation": (0.42, 0, 0)},
        "thigh_r": {"rotation": (0.22, 0, -0.10)}, "calf_r": {"rotation": (0.42, 0, 0)},
        "upperarm_l": {"rotation": (0.50, 0.15, -0.70)}, "upperarm_r": {"rotation": (-0.50, -0.15, 0.70)},
    }
    header_contact = {
        "pelvis": {"location": (0, 0, 0.34), "rotation": (-0.08, 0, 0)},
        "spine_03": {"rotation": (0.22, 0, 0)}, "head": {"rotation": (-0.20, 0, 0)},
        "thigh_l": {"rotation": (-0.18, 0, 0.16)}, "calf_l": {"rotation": (0.62, 0, 0)},
        "thigh_r": {"rotation": (0.12, 0, -0.16)}, "calf_r": {"rotation": (0.56, 0, 0)},
        "upperarm_l": {"rotation": (0.88, 0.18, -0.92)}, "upperarm_r": {"rotation": (-0.88, -0.18, 0.92)},
    }
    pass_load = dict(ready)
    pass_load.update({"thigh_r": {"rotation": (0.54, 0, 0)}, "calf_r": {"rotation": (0.90, 0, 0)}})
    pass_contact = {
        "pelvis": {"rotation": (0.05, 0, -0.05)}, "spine_03": {"rotation": (-0.02, 0, 0.12)},
        "thigh_l": {"rotation": (0.05, 0, 0)}, "calf_l": {"rotation": (-0.04, 0, 0)},
        "thigh_r": {"rotation": (-0.34, 0.02, -0.03)}, "calf_r": {"rotation": (0.02, 0, 0)},
        "foot_r": {"rotation": (0.10, 0, 0)}, "upperarm_l": {"rotation": (-0.22, 0.10, 0.42)},
        "upperarm_r": {"rotation": (0.18, -0.10, -0.34)},
    }
    volley_load = {
        "pelvis": {"rotation": (0.18, 0, -0.08)}, "spine_03": {"rotation": (-0.20, 0, 0.15)},
        "thigh_l": {"rotation": (0.10, 0, 0)}, "calf_l": {"rotation": (0.08, 0, 0)},
        "thigh_r": {"rotation": (0.95, 0, -0.10)}, "calf_r": {"rotation": (1.05, 0, 0)},
        "upperarm_l": {"rotation": (0.46, 0.18, -0.62)}, "upperarm_r": {"rotation": (-0.40, -0.16, 0.60)},
    }
    volley_contact = dict(pass_contact)
    volley_contact.update({"thigh_r": {"rotation": (-0.82, 0, -0.05)}, "foot_r": {"rotation": (0.26, 0, 0)}})
    keeper_ready = {
        "pelvis": {"location": (0, 0, -0.08), "rotation": (0.12, 0, 0)}, "spine_03": {"rotation": (-0.12, 0, 0)},
        "thigh_l": {"rotation": (0.36, 0, 0.18)}, "calf_l": {"rotation": (0.70, 0, 0)},
        "thigh_r": {"rotation": (0.36, 0, -0.18)}, "calf_r": {"rotation": (0.70, 0, 0)},
        "upperarm_l": {"rotation": (0.30, -0.28, -0.90)}, "lowerarm_l": {"rotation": (0.42, 0, 0)},
        "upperarm_r": {"rotation": (-0.30, 0.28, 0.90)}, "lowerarm_r": {"rotation": (-0.42, 0, 0)},
    }
    keeper_dive = {
        "pelvis": {"location": (0, 0.38, 0.22), "rotation": (0.10, 0.05, -0.86)},
        "spine_03": {"rotation": (-0.08, 0.08, -0.28)}, "head": {"rotation": (0.05, 0, 0.22)},
        "thigh_l": {"rotation": (-0.20, 0, 0.25)}, "calf_l": {"rotation": (0.54, 0, 0)},
        "thigh_r": {"rotation": (0.34, 0, -0.18)}, "calf_r": {"rotation": (0.48, 0, 0)},
        "upperarm_l": {"rotation": (1.34, -0.22, -1.10)}, "lowerarm_l": {"rotation": (0.08, 0, 0)},
        "upperarm_r": {"rotation": (-1.34, 0.22, 1.10)}, "lowerarm_r": {"rotation": (-0.08, 0, 0)},
    }

    create_action(rig, "HeaderReady", [(1, ready), (10, header_load), (18, header_load)])
    create_action(rig, "HeaderContact", [(1, header_load), (10, header_contact), (18, ready)], contact_frame=10)
    create_action(rig, "DribbleCycle", [(1, run_l), (10, run_r), (19, run_l)])
    create_action(rig, "PassContact", [(1, pass_load), (10, pass_contact), (18, ready)], contact_frame=10)
    create_action(rig, "ComboVolley", [(1, volley_load), (10, volley_contact), (20, ready)], contact_frame=10)
    create_action(rig, "KeeperReady", [(1, keeper_ready), (18, keeper_ready)])
    create_action(rig, "KeeperDive", [(1, keeper_ready), (12, keeper_dive), (22, keeper_dive)], contact_frame=12)
    create_action(rig, "PenaltyStrike", [(1, pass_load), (13, pass_contact), (21, ready)], contact_frame=13)
    create_action(rig, "CrossbarStrike", [(1, pass_load), (13, pass_contact), (23, ready)], contact_frame=13)
    rig.animation_data.action = bpy.data.actions["Ready"]


def save_and_export() -> None:
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = 66
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format="GLB", use_selection=False,
        export_materials="EXPORT", export_yup=True, export_animations=True,
        export_animation_mode="ACTIONS", export_merge_animation="ACTION",
        export_force_sampling=True, export_sampling_interpolation_fallback="LINEAR",
        export_anim_slide_to_zero=True, export_skins=True,
        export_armature_object_remove=True, export_def_bones=True,
        export_influence_nb=4, export_all_influences=False, export_morph=False,
        export_cameras=False, export_lights=False, export_texcoords=True,
        export_tangents=False, export_vertex_color="NONE",
        export_optimize_animation_size=True, export_loglevel=-1,
    )


def main() -> None:
    rig = rig_object()
    build_actions(rig)
    save_and_export()
    names = sorted(action.name for action in bpy.data.actions)
    missing = sorted(set(ACTIVITY_ACTIONS) - set(names))
    if missing:
        raise RuntimeError(f"Activity clips were not exported: {missing}")
    print(f"UPDATED {SOURCE} ({SOURCE.stat().st_size} bytes)")
    print(f"EXPORTED {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
    print(f"ACTIONS {names}")


if __name__ == "__main__":
    main()
