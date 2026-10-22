"""Render self-authored KickLab Garage archetypes with Blender 5.1.

Run from the repository root with scripts/render-garage-archetypes.sh.
Go-kart and Street car geometry is authored here. Race car reuses the validated,
local Direction A GLB. All images use the same orthographic camera and lights.
"""
from math import pi
from pathlib import Path
import argparse
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(__import__('sys').argv[__import__('sys').argv.index('--') + 1:])
OUT = args.out.resolve()
OUT.mkdir(parents=True, exist_ok=True)


def material(name, color, metallic=0.0, roughness=.38, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    return mat


def mesh(name, vertices, faces, mat, smooth=False):
    data = bpy.data.meshes.new(name + '_mesh')
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if smooth:
        for face in data.polygons:
            face.use_smooth = True
        obj.modifiers.new('weighted normals', 'WEIGHTED_NORMAL')
    return obj


def bevel_box(name, center, size, mat, radius=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if radius:
        mod = obj.modifiers.new('soft machined edge', 'BEVEL')
        mod.width = radius
        mod.segments = 3
        obj.modifiers.new('weighted normals', 'WEIGHTED_NORMAL')
    return obj


def loft(name, stations, mat):
    """Eight-point closed cross sections along X for a car body, not a cube."""
    points = []
    for x, width, bottom, shoulder, deck in stations:
        points.extend([(x,-width*.78,bottom),(x,-width,shoulder),
                       (x,-width*.83,deck),(x,0,deck+.045),
                       (x,width*.83,deck),(x,width,shoulder),
                       (x,width*.78,bottom),(x,0,bottom-.018)])
    faces = [tuple(range(7,-1,-1))]
    for station in range(len(stations)-1):
        a, b = station*8, (station+1)*8
        faces += [(a+i,a+(i+1)%8,b+(i+1)%8,b+i) for i in range(8)]
    faces.append(tuple((len(stations)-1)*8+i for i in range(8)))
    return mesh(name, points, faces, mat, True)


def cabin(name, profile, half_width, mat):
    # Raked windshield and rear glass are actual geometry, clearly unlike a kart.
    vertices = [(x,-half_width,z) for x,z in profile] + [(x,half_width,z) for x,z in profile]
    n = len(profile)
    faces = [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vertices,faces,mat)


def wheel(name, x, y, z, radius, width, rubber, rim, hub):
    side = 1 if y > 0 else -1
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=radius, depth=width,
                                        location=(x,y,z), rotation=(pi/2,0,0))
    tire = bpy.context.object
    tire.name = name + '_tire'
    tire.data.materials.append(rubber)
    bevel = tire.modifiers.new('rounded tire shoulder','BEVEL')
    bevel.width = radius*.15
    bevel.segments = 3
    tire.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    face_y = y + side*(width*.5+.006)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius*.61, depth=.018,
                                        location=(x,face_y,z), rotation=(pi/2,0,0))
    disc = bpy.context.object
    disc.name = name + '_rim'
    disc.data.materials.append(rim)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius*.18, depth=.025,
                                        location=(x,face_y+side*.018,z), rotation=(pi/2,0,0))
    bpy.context.object.name = name + '_hub'
    bpy.context.object.data.materials.append(hub)
    # Short raised spokes remain legible in the 80 px Garage thumbnails.
    for index in range(6):
        angle=2*pi*index/6
        inner=Vector((x+radius*.21*__import__('math').cos(angle),face_y+side*.025,z+radius*.21*__import__('math').sin(angle)))
        outer=Vector((x+radius*.48*__import__('math').cos(angle),face_y+side*.025,z+radius*.48*__import__('math').sin(angle)))
        rod(name+'_spoke_'+str(index),inner,outer,radius*.037,hub)


def rod(name, a, b, radius, mat):
    start, end = Vector(a), Vector(b)
    delta = end-start
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=delta.length,
                                        location=(start+end)/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat('Z','Y').to_euler()
    obj.data.materials.append(mat)
    return obj


def make_street():
    paint = material('Street · deep ocean enamel',(.018,.24,.40),.48,.22)
    edge = material('Street · bright cyan shoulder',(.055,.53,.67),.35,.25)
    glass = material('Street · smoke glass',(.018,.075,.13),.2,.16)
    dark = material('Street · graphite',(.018,.025,.035),.15,.5)
    rubber = material('Street · tire',(.008,.011,.016),.02,.78)
    rim = material('Street · alloy',(.40,.60,.67),.68,.29)
    light = material('Street · headlamp',(.72,.9,.95),.1,.23,1.1)
    red = material('Street · rear lamp',(.8,.045,.055),.05,.27,.8)
    trim = material('Street · satin brightwork',(.23,.41,.46),.75,.28)
    loft('Street unibody',[
        (-2.35,.63,.30,.63,.78),(-1.96,.84,.28,.79,.98),
        (-.88,.91,.27,.84,1.01),(.75,.91,.27,.83,.99),
        (1.71,.82,.30,.73,.88),(2.27,.63,.34,.61,.71)],paint)
    cabin('Street enclosed cabin',[(-1.27,.99),(.78,.99),(.28,1.62),(-.82,1.62)],.72,glass)
    for side in (-1,1):
        glass_y=side*.734
        mesh('Street side glazing '+str(side),[(-1.12,glass_y,1.05),(.57,glass_y,1.05),(.14,glass_y,1.52),(-.68,glass_y,1.52)],[(0,1,2,3)],glass)
        rod('Street B pillar '+str(side),(-.13,glass_y,1.01),(-.20,glass_y,1.61),.025,trim)
        rod('Street window sill '+str(side),(-1.13,glass_y,1.03),(.60,glass_y,1.03),.018,trim)
        bevel_box('Street mirror '+str(side),(.43,side*.83,1.05),(.18,.13,.08),dark,.035)
    bevel_box('Street roof',(-.27,0,1.62),(1.12,1.49,.075),paint,.055)
    bevel_box('Street shoulder stripe',(.03,-.87,.86),(3.53,.025,.036),edge,.009)
    bevel_box('Street grille',(2.28,0,.60),(.035,1.08,.23),dark,.018)
    bevel_box('Street splitter',(2.32,0,.34),(.20,1.42,.055),dark,.022)
    bevel_box('Street rear valance',(-2.32,0,.40),(.08,1.25,.10),dark,.025)
    for side in (-1,1):
        wheel('Street front '+str(side),1.36,side*.87,.43,.43,.20,rubber,rim,dark)
        wheel('Street rear '+str(side),-1.50,side*.88,.43,.43,.20,rubber,rim,dark)
        bevel_box('Street headlamp '+str(side),(2.22,side*.47,.82),(.08,.33,.075),light,.025)
        bevel_box('Street tail lamp '+str(side),(-2.30,side*.48,.77),(.06,.32,.07),red,.018)


def make_kart():
    paint = material('Kart · racing mint',(.035,.43,.28),.35,.28)
    lime = material('Kart · light mint',(.13,.76,.48),.22,.34)
    dark = material('Kart · frame graphite',(.022,.035,.040),.27,.48)
    rubber = material('Kart · tire',(.008,.011,.015),.02,.79)
    rim = material('Kart · rim',(.34,.52,.48),.68,.29)
    seat = material('Kart · seat',(.025,.06,.065),.08,.64)
    motor = material('Kart · motor',(.15,.19,.18),.55,.39)
    accent = material('Kart · orange race accent',(.95,.29,.085),.16,.29)
    loft('Kart open floor',[
        (-1.13,.38,.18,.27,.33),(-.84,.55,.16,.31,.40),
        (.25,.53,.16,.29,.39),(.95,.36,.19,.28,.36),(1.31,.23,.23,.31,.38)],paint)
    bevel_box('Kart pointed nose',(1.12,0,.40),(.77,.39,.24),lime,.10)
    bevel_box('Kart left side pod',(-.05,-.58,.30),(1.45,.25,.21),paint,.10)
    bevel_box('Kart right side pod',(-.05,.58,.30),(1.45,.25,.21),paint,.10)
    bevel_box('Kart exposed seat',(-.35,0,.53),(.63,.59,.23),seat,.12)
    bevel_box('Kart seat back',(-.67,0,.82),(.20,.59,.68),seat,.095)
    bevel_box('Kart rear motor',(-1.05,.34,.51),(.50,.45,.39),motor,.07)
    bevel_box('Kart motor grille',(-1.07,.61,.53),(.33,.035,.21),dark,.022)
    bevel_box('Kart nose race panel',(1.10,0,.54),(.39,.25,.025),accent,.025)
    bevel_box('Kart left pod accent',(-.05,-.71,.36),(1.15,.021,.045),accent,.015)
    bevel_box('Kart right pod accent',(-.05,.71,.36),(1.15,.021,.045),accent,.015)
    bevel_box('Kart front bumper',(1.38,0,.25),(.13,1.42,.085),dark,.04)
    bevel_box('Kart rear bumper',(-1.30,0,.25),(.13,1.42,.085),dark,.04)
    rod('Kart steering column',(.36,0,.39),(.18,0,.76),.032,dark)
    bpy.ops.mesh.primitive_torus_add(major_radius=.21, minor_radius=.027,
                                    location=(.18,0,.76), rotation=(pi/2,0,0))
    bpy.context.object.name = 'Kart open steering wheel'
    bpy.context.object.data.materials.append(dark)
    for side in (-1,1):
        wheel('Kart front '+str(side),.86,side*.88,.32,.32,.25,rubber,rim,dark)
        wheel('Kart rear '+str(side),-.91,side*.87,.32,.34,.28,rubber,rim,dark)


def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)


def studio():
    world = bpy.data.worlds.new('Garage studio')
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.38,.47,.59,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
    for name, loc, energy, size, color in [
        ('warm key',(3.8,-5.4,7.2),1050,5.0,(1,.88,.76)),
        ('cool fill',(1.0,5.5,5.0),820,4.5,(.60,.81,1)),
        ('rear rim',(-4.8,-1.4,5.4),800,3.5,(.67,.94,1))]:
        data = bpy.data.lights.new(name,'AREA')
        data.energy, data.shape, data.size, data.color = energy, 'DISK', size, color
        obj = bpy.data.objects.new(name,data)
        bpy.context.scene.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0,0,.6))-obj.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(7.8,-10.5,6.8))
    camera=bpy.context.object
    camera.name='Shared elevated three-quarter camera'
    camera.rotation_euler=(Vector((0,0,.67))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO'
    camera.data.ortho_scale=7.8
    bpy.context.scene.camera=camera
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=32
    scene.render.resolution_x=640
    scene.render.resolution_y=400
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.render.image_settings.color_depth='8'
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.render.threads_mode='FIXED'
    scene.render.threads=4
    return camera


for archetype in ('kart','street','race'):
    reset_scene()
    camera=studio()
    if archetype=='kart':
        make_kart()
        camera.data.ortho_scale=4.1
    elif archetype=='street':
        make_street()
        camera.data.ortho_scale=6.5
    else:
        source=ROOT/'src/assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb'
        if not source.is_file():
            raise FileNotFoundError(source)
        bpy.ops.import_scene.gltf(filepath=str(source))
        camera.data.ortho_scale=7.3
    bpy.context.scene.render.filepath=str(OUT/(archetype+'.png'))
    bpy.ops.render.render(write_still=True)
    print('GARAGE_RENDER',archetype,bpy.context.scene.render.filepath)
