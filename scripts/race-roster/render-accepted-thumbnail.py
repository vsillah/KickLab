"""Render a Garage still directly from an accepted, read-only local GLB.

Usage: blender -b --python render-accepted-thumbnail.py -- INPUT.glb OUTPUT.png
The Blender scene is transient. This script never exports or writes a model.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


source, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
if source.suffix != '.glb' or not source.is_file() or output.suffix != '.png':
    raise SystemExit('Expected a local GLB input and PNG output')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and not obj.hide_render]
if not meshes:
    raise SystemExit('No renderable meshes in accepted GLB')
points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
low = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
high = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
center = (low + high) / 2
size = high - low
span = max(size.x, size.y)

camera_data = bpy.data.cameras.new('Garage still camera')
camera = bpy.data.objects.new('Garage still camera', camera_data)
bpy.context.scene.collection.objects.link(camera)
camera.location = center + Vector((span * 1.4, -span * 1.8, span * .95))
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = span * 1.6
bpy.context.scene.camera = camera

world = bpy.data.worlds.new('Garage still world')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.13, .22, .32, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
bpy.context.scene.world = world
for location, power, color, scale in (
    ((2, -3, 7), 1800, (.7, .9, 1), 5),
    ((-4, 2, 5), 2200, (1, .78, .62), 4),
):
    data = bpy.data.lights.new('Garage still area', 'AREA')
    light = bpy.data.objects.new('Garage still area', data)
    bpy.context.scene.collection.objects.link(light)
    light.location = center + Vector(location)
    light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
    data.energy = power
    data.color = color
    data.shape = 'DISK'
    data.size = scale

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
# CPU, fixed seed and a single render thread avoid GPU-dependent sampling.
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = False
scene.cycles.seed = 0
scene.cycles.use_animated_seed = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 1
scene.render.resolution_x = 640
scene.render.resolution_y = 400
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = str(output.resolve())
scene.view_settings.view_transform = 'AgX'
bpy.ops.render.render(write_still=True)
