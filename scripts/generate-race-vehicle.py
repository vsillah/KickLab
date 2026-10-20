"""Author KickLab's offline Race vehicle from local primitives; no external assets."""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/3d/kicklab-race-vehicle/v1'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0, rough=.35):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    return m

paint = mat('Deep Atlantic Blue | body enamel', (.025,.19,.46), .58, .24)
paint_light = mat('Shoulder highlight enamel', (.065,.31,.58), .52, .24)
accent = mat('Competition Cyan | trim', (.02,.67,.83), .4, .26)
dark = mat('Carbon graphite | aero', (.013,.021,.033), .25, .63)
glass = mat('Smoked blue glass', (.003,.025,.045), .25, .08)
rubber = mat('Tire rubber', (.011,.013,.016), 0, .83)
alloy = mat('Machined alloy', (.34,.40,.45), .83, .23)
brake = mat('Brake caliper orange', (.96,.19,.04), .42, .32)
lamp = mat('Headlamp pearl', (.8,.94,1.0), .18, .16)
red = mat('Tail lamp red', (.8,.018,.022), .1, .21)

def assign(o, material):
    o.data.materials.append(material)
    return o

def box(name, center, size, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o=bpy.context.object; o.name=name
    o.dimensions=size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('soft panel edges','BEVEL'); mod.width=bevel; mod.segments=3
        o.modifiers.new('weighted corners','WEIGHTED_NORMAL')
    return assign(o, material)

def poly(name, verts, faces, material):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts, [], faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    return assign(o,material)

def cylinder(name, center, radius, depth, material, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=center, rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name=name
    bevel=o.modifiers.new('rounded cylinder rim','BEVEL');bevel.width=.025;bevel.segments=2
    o.modifiers.new('weighted normal','WEIGHTED_NORMAL')
    return assign(o, material)

def curve(name, points, radius, material):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=2
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return assign(o,material)

# +X is forward, Z is up. Every panel is authored here from original coordinates.
box('undertray / structural shadow', (0,0,.33), (4.48,1.78,.22), dark, .11)
box('lower rocker left', (-.04,-.82,.42), (3.5,.17,.22), dark, .04)
box('lower rocker right', (-.04,.82,.42), (3.5,.17,.22), dark, .04)

# Tapered multi-facet body. Crown, haunches and nose vary along the wheelbase.
xs=[-2.31,-2.1,-1.78,-1.46,-1.08,-.45,.35,1.1,1.45,1.85,2.31]
half=[.76,.84,.94,1.01,.96,.89,.87,.9,.95,.79,.62]
top=[.76,.88,.96,1.01,.99,.95,.95,.87,.78,.69,.55]
verts=[]
for x,w,z in zip(xs,half,top):
    verts += [(x,-w*.8,.43),(x,w*.8,.43),(x,w,.50),(x,w, z*.71),
              (x,w*.96,z*.94),(x,w*.74,z+0.045),(x,w*.3,z+.075),
              (x,-w*.3,z+.075),(x,-w*.74,z+.045),(x,-w*.96,z*.94),
              (x,-w,z*.71),(x,-w,.50)]
faces=[]
for i in range(len(xs)-1):
    a=i*12;b=(i+1)*12
    for j in range(12): faces.append((a+j,b+j,b+(j+1)%12,a+(j+1)%12))
faces += [tuple(reversed(range(12))),tuple(range(len(verts)-12,len(verts)))]
body=poly('sculpted blue body shell',verts,faces,paint)
body.modifiers.new('weighted shoulder normals','WEIGHTED_NORMAL')
curve('hood crown highlight',[(.55,0,1.01),(1.1,0,.93),(1.65,0,.79),(2.18,0,.61)],.008,paint_light)
box('front carbon splitter',(2.22,0,.38),(.39,1.83,.08),dark,.035)
box('nose chin cyan blade',(2.32,0,.43),(.14,1.71,.035),accent,.015)
box('rear diffuser',(-2.29,0,.37),(.25,1.55,.11),dark,.035)

# Cabin is a low, four-window fastback; glass follows the same roof slopes as the body.
roof_bottom=[(-1.58,-.75,.99),( .60,-.72,.99),( .60,.72,.99),(-1.58,.75,.99)]
roof_top=[(-.94,-.57,1.47),(-.02,-.55,1.49),(-.02,.55,1.49),(-.94,.57,1.47)]
poly('fastback cabin glazing',roof_bottom+roof_top,
     [(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],glass)
poly('painted floating roof',[(-1.02,-.62,1.48),(.05,-.60,1.50),(.05,.60,1.50),(-1.02,.62,1.48)],[(0,1,2,3)],paint)
curve('rear glass base trim',[(-1.58,-.75,1.00),(-1.58,.75,1.00)],.026,alloy)
curve('rear glass top trim',[(-.94,-.57,1.48),(-.94,.57,1.48)],.016,alloy)
box('rear continuous lamp bridge',(-2.315,0,.76),(.035,1.24,.045),red,.012)
box('rear deck recess',(-2.316,0,.59),(.026,1.21,.18),dark,.01)
box('number plate recess',(-2.337,0,.60),(.016,.38,.10),alloy,.01)
for side in [-1,1]:
    curve('windshield bright surround '+str(side),[(.60,side*.72,.99),(-.02,side*.55,1.49),(-.94,side*.57,1.47),(-1.58,side*.75,.99)],.014,alloy)
    curve('C pillar painted rake '+str(side),[(-1.64,side*.78,.98),(-.98,side*.61,1.49)],.053,paint_light)
    curve('side sill competition stripe '+str(side),[(-1.78,side*.955,.69),(-.7,side*.973,.66),(.7,side*.89,.62),(1.7,side*.82,.57)],.027,accent)
    box('mirror pod '+str(side),(.37,side*.84,1.05),(.25,.25,.10),paint,.05)
    box('mirror glass '+str(side),(.28,side*.96,1.05),(.10,.025,.06),glass,.01)
    curve('door seam '+str(side),[(.12,side*.94,.9),(.08,side*.95,.52)],.008,dark)
    box('side vent '+str(side),(-1.49,side*.96,.81),(.35,.025,.10),dark,.018)
    box('rear wing upright '+str(side),(-1.94,side*.56,1.12),(.09,.08,.37),dark,.015)
    box('headlamp '+str(side),(2.15,side*.48,.66),(.11,.31,.09),lamp,.025)
    box('tail lamp '+str(side),(-2.30,side*.56,.72),(.055,.42,.075),red,.016)
    box('front air duct '+str(side),(2.25,side*.56,.47),(.065,.28,.09),dark,.016)
    for x,axle in [(1.43,'front'),(-1.46,'rear')]:
        for radius,material,tube in [(.49,dark,.082),(.455,paint_light,.035)]:
            points=[(x+radius*math.cos(a),side*1.025,.42+radius*math.sin(a)) for a in [i*math.pi/16 for i in range(17)]]
            curve(axle+' wheel-arch '+str(side)+' '+str(radius),points,tube,material)
    # Wheel, tire shoulder, visible alloy face, 10 spokes and red brake hardware.
    for x,axle in [(1.43,'front'),(-1.46,'rear')]:
        y=side*.94
        cylinder(axle+' tire '+str(side),(x,y,.42),.405,.27,rubber,40)
        cylinder(axle+' rim '+str(side),(x,side*1.085,.42),.258,.02,alloy,40)
        cylinder(axle+' dark wheel center '+str(side),(x,side*1.104,.42),.065,.028,dark,24)
        for i in range(10):
            a=i*math.tau/10
            o=box(axle+' spoke %d %d'%(side,i),(x+.145*math.cos(a),side*1.11,.42+.145*math.sin(a)),(.17,.022,.027),alloy,.008)
            o.rotation_euler[1]=-a
        box(axle+' brake caliper '+str(side),(x-.18,side*1.095,.54),(.11,.05,.16),brake,.02)

box('front grille',(2.31,0,.48),(.04,.65,.11),dark,.01)
for i in range(5):
    box('grille slat '+str(i),(2.342,0,.435+i*.025),(.012,.55,.006),alloy,.002)
for side in [-1,1]:
    box('hood vent '+str(side),(1.38,side*.40,.84),(.47,.13,.025),dark,.015)
    box('hood vent accent '+str(side),(1.48,side*.40,.861),(.25,.025,.012),accent,.004)
box('rear aero wing',(-2.05,0,1.34),(.34,1.62,.085),dark,.04)
box('rear wing accent',(-2.06,0,1.39),(.08,1.50,.018),accent,.007)
box('roof race number panel',(-.46,0,1.455),(.47,.42,.012),dark,.006)
for side in [-1,1]:
    box('rear diffuser fin '+str(side),(-2.38,side*.42,.36),(.36,.055,.22),dark,.02)
    box('rear reflector '+str(side),(-2.34,side*.66,.52),(.03,.17,.035),red,.01)

# Apply modifiers for predictable glTF output and a portable editable source.
for o in list(bpy.data.objects):
    if o.type=='MESH':
        bpy.context.view_layer.objects.active=o
        for m in list(o.modifiers):
            try:bpy.ops.object.modifier_apply(modifier=m.name)
            except RuntimeError:pass
        for p in o.data.polygons:p.use_smooth=True
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kicklab-race-vehicle.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'kicklab-race-vehicle.glb'),export_format='GLB',export_materials='EXPORT',export_apply=True,export_yup=True,export_texcoords=False)
print('self-authored vehicle exported', OUT)
