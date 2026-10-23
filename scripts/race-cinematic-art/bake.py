"""Author local Race cutaway geometry and procedural effects with Blender CLI.

Usage: blender -b --python scripts/race-cinematic-art/bake.py
The source is deterministic, original geometry. Blender uses Z up; glTF exports Y up.
"""
from pathlib import Path
from math import sin, cos, pi, exp, sqrt
from mathutils import Vector
import bpy
import json

ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT / 'src/assets/3d/kicklab-race-internals/v1'
EFFECT = ROOT / 'src/assets/effects/race/v1'
BAKE = ROOT / 'qa-artifacts/race-cinematic-effects/blender-bakeoff'
for folder in (ASSET, EFFECT, BAKE): folder.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=12
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.world.color=(.025,.035,.05)

def mat(name, rgb, metal=0, rough=.45, emission=0, alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Alpha'].default_value=alpha
    p.inputs['Emission Color'].default_value=(*rgb,1)
    p.inputs['Emission Strength'].default_value=emission
    return m

steel=mat('satin forged steel',(.22,.28,.31),.82,.31)
dark=mat('cast graphite',(.06,.075,.085),.55,.43)
silver=mat('machined alloy',(.42,.49,.52),.78,.25)
copper=mat('copper windings',(.51,.19,.065),.62,.31)
rubber=mat('damper rubber',(.025,.03,.034),.06,.75)
brake=mat('carbon ceramic rotor',(.26,.29,.29),.45,.45)
caliper=mat('painted caliper',(.72,.12,.055),.46,.27)
cool=mat('anodized cooler',(.15,.36,.46),.64,.32)
shell=mat('translucent original shell',(.035,.24,.39),.24,.23,0,.16)
oldmat=mat('old schematic system',(.45,.8,1),.12,.32,.2)
flameOld=mat('old cone',(.95,.18,.015),0,.5,2.5)

systems={key:[] for key in ['chassis','drivetrain','suspension','brakes','cooling']}
def keep(o,system,material):
    o.name=system+' · '+o.name;o.data.materials.append(material);systems[system].append(o);return o
def cube(system,name,loc,dimensions,material,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dimensions
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('machined edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return keep(o,system,material)
def rod(system,name,a,b,r,material,vertices=6):
    a,b=Vector(a),Vector(b);d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return keep(o,system,material)
def ring(system,name,loc,major,minor,material,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=4,location=loc,rotation=rotation,
                                    major_radius=major,minor_radius=minor)
    return keep(bpy.context.object,system,material)
def hose(system,name,points,r,material):
    for i,(a,b) in enumerate(zip(points,points[1:])):rod(system,name+str(i),a,b,r,material,8)
def spring(name,center,r,height,material):
    x,y,z=center;pts=[]
    for i in range(25):
        t=i/24;angle=t*pi*12;pts.append((x+r*cos(angle),y+r*sin(angle),z-height*t))
    hose('suspension',name,pts,.011,material)

# Stamped floor, boxed sills, triangulated rear cradle and visible load paths.
cube('chassis','pressed floor',(-.05,0,.34),(3.35,1.24,.045),dark,.065)
for side in (-1,1):
    y=side*.68
    rod('chassis','boxed sill',(-1.88,y,.40),(1.75,y,.40),.066,steel)
    rod('chassis','front rail',(.52,side*.55,.45),(1.94,side*.47,.72),.052,steel)
    rod('chassis','rear diagonal',(-1.83,side*.65,.43),(-.72,side*.37,.80),.039,steel)
    rod('chassis','roof A pillar',(.83,side*.69,.42),(.30,side*.46,1.23),.039,silver)
    rod('chassis','roof rail',(.30,side*.46,1.23),(-.84,side*.49,1.21),.042,silver)
    rod('chassis','roof C pillar',(-.84,side*.49,1.21),(-1.48,side*.67,.44),.042,silver)
for x in (-1.52,-.72,.20,1.20):rod('chassis','crossmember',(x,-.67,.42),(x,.67,.42),.052,steel)
rod('chassis','X brace',(-1.5,-.59,.41),(.12,.59,.41),.025,silver)
rod('chassis','X brace',(-1.5,.59,.41),(.12,-.59,.41),.025,silver)

# Motor, valve train, bellhousing, transmission, prop shaft and differential.
cube('drivetrain','motor lower case',(.73,0,.66),(.78,.55,.37),dark,.095)
cube('drivetrain','cylinder head',(.76,0,.90),(.64,.48,.16),steel,.055)
cube('drivetrain','valve cover',(.77,0,1.02),(.59,.40,.10),copper,.045)
for i in range(7):
    x=.52+i*.08
    cube('drivetrain','cooling rib',(x,0,1.09),(.025,.39,.025),silver,.006)
for side in (-1,1):
    for i in range(3):
        x=.50+i*.19
        hose('drivetrain','exhaust header',[(x,side*.25,.80),(x-.08,side*.40,.74),(x-.23,side*.44,.64)],.023,copper)
ring('drivetrain','flywheel',(.27,0,.68),.23,.042,silver,(0,pi/2,0))
cube('drivetrain','ribbed gearbox',(-.12,0,.64),(.65,.39,.30),steel,.075)
for i in range(5):cube('drivetrain','gearbox rib',(-.36+i*.13,0,.66),(.025,.43,.32),dark,.008)
rod('drivetrain','propeller shaft',(-.46,0,.59),(-1.48,0,.59),.047,silver,12)
for x in (-.48,-1.46):ring('drivetrain','universal joint',(x,0,.59),.067,.015,dark,(0,pi/2,0))
cube('drivetrain','differential casing',(-1.52,0,.57),(.34,.43,.28),dark,.10)
for side in (-1,1):rod('drivetrain','half shaft',(-1.52,0,.56),(-1.52,side*.88,.48),.035,steel)

# Four double-wishbone corners, upright, damper and helical spring.
for axle,x in [('front',1.28),('rear',-1.28)]:
    for side in (-1,1):
        y=side*.84;hub=(x,side*.95,.43)
        for z,dy in ((.36,.38),(.69,.31)):
            rod('suspension',axle+' lower/upper A arm', (x-.28,side*dy,z),hub,.026,silver)
            rod('suspension',axle+' lower/upper A arm', (x+.28,side*dy,z),hub,.026,silver)
        rod('suspension','forged upright',(x,side*.96,.29),(x,side*.96,.72),.047,steel)
        rod('suspension','damper piston',(x-.06,side*.70,.36),(x-.14,side*.62,.98),.025,dark)
        spring('coil spring',(x-.10,side*.66,.92),.075,.48,copper)
        ring('suspension','upper mount',(x-.14,side*.62,.98),.105,.017,rubber)

# Ventilated discs, two concentric tracks, pierced hats and substantial calipers.
for axle,x in [('front',1.28),('rear',-1.28)]:
    for side in (-1,1):
        y=side*.96
        ring('brakes','outer friction track',(x,y,.43),.23,.026,brake,(pi/2,0,0))
        ring('brakes','inner friction track',(x,y,.43),.16,.018,silver,(pi/2,0,0))
        for i in range(8):
            a=i*2*pi/8;px=x+.19*cos(a);pz=.43+.19*sin(a)
            rod('brakes','vent channel',(px,y-.025,pz),(px,y+.025,pz),.012,dark,6)
        cube('brakes','opposed caliper',(x-.16,y+side*.045,.50),(.13,.10,.20),caliper,.025)
        cube('brakes','caliper bridge',(x-.14,y+side*.09,.50),(.11,.07,.14),steel,.012)

# Radiator core and end tanks, fan shroud, duct walls and flexible coolant loops.
cube('cooling','radiator core',(1.70,0,.70),(.12,1.05,.58),dark,.018)
for i in range(13):
    z=.44+i*.041
    cube('cooling','radiator fin',(1.78,0,z),(.018,1.00,.011),cool,.002)
for side in (-1,1):
    cube('cooling','end tank',(1.69,side*.56,.70),(.20,.12,.63),cool,.04)
    hose('cooling','formed coolant hose',[(1.62,side*.57,.91),(1.31,side*.56,1.02),(.96,side*.34,1.05)],.036,rubber)
    hose('cooling','lower return',[(1.62,side*.57,.45),(1.25,side*.50,.37),(.75,side*.33,.53)],.031,rubber)
    rod('cooling','intake duct',(1.90,side*.33,.74),(2.18,side*.44,.69),.11,dark,10)
ring('cooling','fan shroud',(1.57,0,.70),.23,.028,silver,(0,pi/2,0))
for i in range(5):
    a=i*2*pi/5
    rod('cooling','fan blade',(1.55,0,.70),(1.55,.18*cos(a),.70+.18*sin(a)),.024,silver)

# Join to one mesh per semantic system to cap runtime draw calls and payload.
root=bpy.data.objects.new('RaceInternals',None);scene.collection.objects.link(root)
joined={}
for key,objects in systems.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name='System_'+key;obj.parent=root;joined[key]=obj

bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for obj in joined.values():obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(ASSET/'race-internals.glb'),export_format='GLB',use_selection=True,
                          export_yup=True,export_apply=True,export_animations=False,export_cameras=False,
                          export_lights=False,export_image_format='AUTO')

def save_image(path,w,h,pixel):
    im=bpy.data.images.new(path.stem,width=w,height=h,alpha=True,float_buffer=False)
    values=[0.0]*(w*h*4)
    for y in range(h):
        for x in range(w):values[(y*w+x)*4:(y*w+x)*4+4]=pixel(x,y)
    im.pixels.foreach_set(values);im.filepath_raw=str(path);im.file_format='PNG';im.save();return im

# Eight hand-shaped plume frames; independent core, envelope and breakup.
def flame_pixel(x,y):
    tile=128;frame=(x//tile)+(y//tile)*4;u=(x%tile)/(tile-1);v=((y%tile)/(tile-1)-.5)*2
    # Tailpipe at the right edge; wavering plume travels left.
    t=1-u;phase=frame*1.31
    center=.11*sin(t*10+phase)+.055*sin(t*23-phase*.7)
    width=(.10+.32*sin(min(1,t*1.15)*pi*.72))*(1-.42*t)
    wav=sin(t*38+v*17+phase)*.085+sin(t*67-v*26-phase*1.8)*.035
    envelope=exp(-((v-center-wav)/max(.03,width))**2*1.35)
    breakup=.68+.27*sin(t*32+phase*2+v*11)+.12*sin(t*77-phase*3-v*31)
    tip=max(0,1-t**4);base=min(1,u*7)
    outer=max(0,min(1,envelope*breakup*tip*base))
    core=exp(-((v-center)/max(.025,width*.28))**2)*max(0,1-t*1.7)*base
    white=exp(-((v-center)/max(.012,width*.12))**2)*max(0,1-t*3.0)*base
    alpha=min(.98,outer*.68+core*.55+white*.35)
    if alpha<.004:return (0,0,0,0)
    orange=(1.0,.30+.30*u,.055+.08*u)
    blue=(.35,.78,1.0)
    c=[orange[i]*(1-core)+blue[i]*core for i in range(3)]
    c=[c[i]*(1-white)+(.95,.98,1.0)[i]*white for i in range(3)]
    return (*c,alpha)

atlas=save_image(BAKE/'nitrous-flame-8f-old.png',512,256,flame_pixel)
def smoke_pixel(x,y):
    u=(x-63.5)/63.5;v=(y-63.5)/63.5;r=sqrt(u*u+v*v)
    n=.62+.18*sin(u*15+v*9)+.11*sin(u*27-v*22)+.09*sin((u+v)*42)
    density=max(0,1-r**1.65)**2.3*max(.1,n)
    return (.70,.75,.77,min(.56,density*.55))
smoke=save_image(EFFECT/'soft-turbulent-smoke.png',128,128,smoke_pixel)

# Review scene: same vehicle envelope and camera for old and new treatments.
for obj in joined.values():obj.hide_render=True
old={}
for key in joined:
    items=[]
    def old_box(name,loc,dims):
        bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims;o.data.materials.append(oldmat);items.append(o)
    if key=='chassis':
        for side in (-1,1):old_box('old rail',(0,side*.54,.56),(3.6,.08,.08))
        for x in (-1.4,1.4):old_box('old cross',(x,0,.56),(.1,1.1,.08))
    if key=='drivetrain':
        old_box('old motor',(.54,0,.7),(1.2,.36,.27));old_box('old shaft',(-.55,0,.53),(1.3,.08,.08))
    if key=='suspension':
        for x in (-1.28,1.28):
            for side in (-1,1):old_box('old strut',(x,side*.66,.55),(.08,.50,.08))
    if key=='brakes':
        for x in (-1.28,1.28):
            for side in (-1,1):old_box('old disc',(x,side*.82,.43),(.39,.04,.39))
    if key=='cooling':
        old_box('old radiator',(1.55,0,.66),(.16,1,.43))
        for side in (-1,1):old_box('old pipe',(.38,side*.20,.85),(1.9,.05,.05))
    old[key]=items
    for o in items:o.hide_render=True

# Shared chase silhouette and ground; no external model or texture input.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));ground=bpy.context.object
ground.data.materials.append(mat('dark review floor',(.025,.036,.047),.08,.66))
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.70));body=bpy.context.object
body.dimensions=(4.35,1.76,.72);body.data.materials.append(shell)
body.modifiers.new('soft shoulder','BEVEL').width=.2;body.modifiers[-1].segments=3
bpy.ops.mesh.primitive_cube_add(size=1,location=(-.20,0,1.16));roof=bpy.context.object
roof.dimensions=(2.10,1.41,.35);roof.data.materials.append(shell)
roof.modifiers.new('soft roof','BEVEL').width=.17;roof.modifiers[-1].segments=3

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(-6.6,-4.2,3.25));camera=bpy.context.object;aim(camera,(0,0,.65));camera.data.type='ORTHO';scene.camera=camera
for pos,power,size in [((-3,-3,7),800,5),((2,4,6),1100,4),((4,-3,3),600,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(0,0,.6))
scene.view_settings.view_transform='AgX'
scene.render.resolution_percentage=100

def render(label,which,system,phone):
    for obj in joined.values():obj.hide_render=True
    for items in old.values():
        for obj in items:obj.hide_render=True
    if which=='new':
        for obj in joined.values():obj.hide_render=False
        for key,obj in joined.items():
            obj.hide_render=key!=system
    else:
        for obj in old[system]:obj.hide_render=False
    camera.data.ortho_scale=6.5 if not phone else 7.8
    scene.render.resolution_x=390 if phone else 960
    scene.render.resolution_y=844 if phone else 720
    scene.render.filepath=str(BAKE/(f'{label}-{system}-'+('phone' if phone else 'desktop')+'.png'))
    bpy.ops.render.render(write_still=True)

for system in joined:
    for phone in (False,True):
        render('old','old',system,phone)
        render('blender','new',system,phone)

# Flame comparison on the same tailpipe side view. The flipbook first frame is
# rendered as an actual alpha texture with the vehicle envelope behind it.
for obj in joined.values():obj.hide_render=True
for items in old.values():
    for obj in items:obj.hide_render=True
body.hide_render=True;roof.hide_render=True
flame_plane_mat=bpy.data.materials.new('blender flame frame');flame_plane_mat.use_nodes=True
nt=flame_plane_mat.node_tree;nt.nodes.clear()
im=nt.nodes.new('ShaderNodeTexImage');im.image=atlas
uv=nt.nodes.new('ShaderNodeUVMap');vec=nt.nodes.new('ShaderNodeVectorMath');vec.operation='MULTIPLY';vec.inputs[1].default_value=(.25,.5,1)
nt.links.new(uv.outputs['UV'],vec.inputs[0]);add=nt.nodes.new('ShaderNodeVectorMath');add.operation='ADD';add.inputs[1].default_value=(0,0,0)
nt.links.new(vec.outputs[0],add.inputs[0]);nt.links.new(add.outputs[0],im.inputs['Vector'])
bs=nt.nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Roughness'].default_value=.8
nt.links.new(im.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=3
nt.links.new(im.outputs['Alpha'],bs.inputs['Alpha'])
out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(bs.outputs[0],out.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=1,location=(-1.12,0,.58),rotation=(pi/2,0,0));flame=bpy.context.object
flame.dimensions=(1.45,.68,0);flame.data.materials.append(flame_plane_mat)
for phone in (False,True):
    scene.render.resolution_x=390 if phone else 960;scene.render.resolution_y=844 if phone else 720
    camera.location=(-3.4,-3.9,1.85);aim(camera,(-.75,0,.5));camera.data.ortho_scale=3.8 if phone else 3.2
    flame.hide_render=True
    bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=.17,radius2=0,depth=1.0,location=(-1.12,0,.58),rotation=(0,pi/2,0))
    cone=bpy.context.object;cone.data.materials.append(flameOld)
    scene.render.filepath=str(BAKE/('old-flame-'+('phone' if phone else 'desktop')+'.png'));bpy.ops.render.render(write_still=True)
    cone.hide_render=True;flame.hide_render=False
    scene.render.filepath=str(BAKE/('blender-flame-'+('phone' if phone else 'desktop')+'.png'));bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cone,do_unlink=True)

manifest={'source':'original Blender CLI procedural geometry and pixel bake','script':'scripts/race-cinematic-art/bake.py',
          'contract':'Blender Z up, glTF Y up, +X forward; canonical length 4.5 m, width 1.85 m',
          'systems':list(joined),'files':{p.name:p.stat().st_size for p in (ASSET/'race-internals.glb',BAKE/'nitrous-flame-8f-old.png',EFFECT/'soft-turbulent-smoke.png')}}
(BAKE/'art-source-record.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('BAKE_COMPLETE',json.dumps(manifest))
