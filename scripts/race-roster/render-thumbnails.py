"""Render a local Race roster thumbnail from the source Blender scene."""
import bpy, math, sys
from mathutils import Vector

output = sys.argv[sys.argv.index('--') + 1]
for collection in bpy.data.collections:
    if 'REVIEW' in collection.name.upper():
        collection.hide_render = True
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render and all(not c.hide_render for c in o.users_collection)]
points = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
center = (low + high) / 2
size = high - low
camera_data = bpy.data.cameras.new('Roster camera')
camera = bpy.data.objects.new('Roster camera', camera_data)
bpy.context.scene.collection.objects.link(camera)
# Front three-quarter view shows each car's silhouette and nose.
camera.location = center + Vector((max(size.x, size.y) * 1.4, -max(size.x, size.y) * 1.8, max(size.x, size.y) * .95))
direction = center - camera.location
camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = max(size.x, size.y) * 1.6
bpy.context.scene.camera = camera
world = bpy.data.worlds.new('Roster world')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.13,.22,.32,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
bpy.context.scene.world = world
for location, power, color, scale in [((2,-3,7),1800,(.7,.9,1),5),((-4,2,5),2200,(1,.78,.62),4)]:
    data = bpy.data.lights.new('Roster area', 'AREA')
    light = bpy.data.objects.new('Roster area', data)
    bpy.context.scene.collection.objects.link(light)
    light.location = center + Vector(location)
    light.rotation_euler = (center-light.location).to_track_quat('-Z','Y').to_euler()
    data.energy = power
    data.color = color
    data.shape = 'DISK'
    data.size = scale
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 640
scene.render.resolution_y = 400
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = output
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
bpy.ops.render.render(write_still=True)
