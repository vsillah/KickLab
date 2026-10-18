"""Render a local, privacy-safe Direction C silhouette checkpoint in Blender."""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa-artifacts" / "direction-c-athlete" / "first-silhouette.png"


def point_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT)
scene.render.film_transparent = False
scene.world.color = (0.008, 0.014, 0.032)

rig = bpy.data.objects["KickLabSharedSkeleton"]
rig.animation_data.action = bpy.data.actions["Strike"]
scene.frame_set(13)

bpy.ops.mesh.primitive_plane_add(size=16, location=(0, 0, 0))
ground = bpy.context.object
ground_mat = bpy.data.materials.new("StudioGround")
ground_mat.diffuse_color = (0.012, 0.028, 0.045, 1)
ground_mat.roughness = 0.82
ground.data.materials.append(ground_mat)

bpy.ops.object.light_add(type="AREA", location=(2.8, -3.5, 4.2))
key = bpy.context.object
key.data.energy = 920
key.data.shape = "DISK"
key.data.size = 4.0
point_at(key, (0, 0, 1))
bpy.ops.object.light_add(type="AREA", location=(-3.3, 1.2, 2.8))
rim = bpy.context.object
rim.data.energy = 780
rim.data.color = (0.05, 0.72, 0.9)
rim.data.size = 3.0
point_at(rim, (0, 0, 1.1))
bpy.ops.object.light_add(type="AREA", location=(0.2, -1.4, 0.7))
fill = bpy.context.object
fill.data.energy = 260
fill.data.color = (1.0, 0.34, 0.08)
fill.data.size = 2.0
point_at(fill, (0, 0, 1.0))

bpy.ops.object.camera_add(location=(3.15, -4.9, 1.75))
camera = bpy.context.object
camera.data.lens = 62
point_at(camera, (0, -0.03, 0.96))
scene.camera = camera

bpy.ops.render.render(write_still=True)
print(f"WROTE {OUTPUT}")
