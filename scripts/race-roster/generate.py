"""Original KickLab Race roster vehicle. Blender CLI; no provider geometry.

All vehicle geometry below is authored from coordinates and analytic surfaces.
The in-repository Direction A asset is the style reference; no provider input.
Blender is Z-up; GLB export converts to Race's Y-up, +X-forward axes.
"""
from pathlib import Path
import argparse
import sys
from math import pi, sin, cos, radians
import json
import bpy
from mathutils import Vector

SCRIPT_ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("variant", choices=("kestrel", "aegis", "vesper", "sable"))
parser.add_argument("--output", type=Path, default=None)
parser.add_argument("--no-renders", action="store_true", help="Export editable source and GLB without review stills")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
VARIANT = args.variant
OUT = args.output or SCRIPT_ROOT.parent.parent / "qa-artifacts" / "race-roster" / VARIANT
OUT.mkdir(parents=True, exist_ok=True)
RENDERS = OUT / "renders"
RENDERS.mkdir(exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)

vehicle = bpy.data.collections.new("EXPORT_VEHICLE")
bpy.context.scene.collection.children.link(vehicle)
studio = bpy.data.collections.new("LOCAL_REVIEW_ONLY")
bpy.context.scene.collection.children.link(studio)


def mat(name, rgb, metallic=0, roughness=.4, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    if emission:
        p.inputs["Emission Color"].default_value = (*rgb, 1)
        p.inputs["Emission Strength"].default_value = emission
    return m


if VARIANT == "kestrel":
    body_paint = mat("body · solar orange lacquer", (.96, .21, .014), .38, .28)
    shoulder_paint = mat("body · graphite shoulder", (.040, .047, .055), .24, .39)
    aero_paint = mat("aero · dark graphite sill", (.055, .062, .068), .20, .42)
elif VARIANT == "aegis":
    body_paint = mat("body · deep crimson lacquer", (.34, .012, .034), .42, .27)
    shoulder_paint = mat("body · crimson shoulder highlight", (.55, .038, .067), .36, .30)
    aero_paint = mat("aero · black carbon surfaces", (.018, .022, .027), .18, .43)
elif VARIANT == "vesper":
    body_paint = mat("body · twilight violet lacquer", (.40,.32,.82), .45, .26)
    shoulder_paint = mat("body · pale violet shoulder", (.62,.58,.91), .37, .30)
    aero_paint = mat("aero · black satin GT floor", (.024,.025,.033), .23, .40)
else:
    body_paint = mat("body · electric lime lacquer", (.42,.80,.09), .35, .29)
    shoulder_paint = mat("body · citron shoulder", (.70,.90,.25), .32, .31)
    aero_paint = mat("aero · charcoal track floor", (.020,.026,.024), .22, .43)
carbon = mat("aero · graphite composite", (.020, .025, .033), .22, .44)
glass = mat("glass · smoked blue", (.018, .034, .066), .38, .16)
rubber = mat("wheels · unmarked graphite rubber", (.012, .014, .017), .02, .78)
gunmetal = mat("wheels · machined dark alloy", (.16, .19, .22), .76, .30)
brushed = mat("aero · satin metal", (.32, .34, .35), .72, .36)
red = mat("lights · original red strip", (.84, .012, .018), .1, .27, 2.2)
ice = mat("lights · original ice white", (.76, .89, 1.0), .05, .22, 2.0)


def link(obj, collection=vehicle):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


root = bpy.data.objects.new("VehicleRoot", None)
vehicle.objects.link(root)
body_parts = []


def mesh_obj(name, verts, faces, material, smooth=False):
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    vehicle.objects.link(obj)
    obj.data.materials.append(material)
    if smooth:
        for face in mesh.polygons:
            face.use_smooth = True
    body_parts.append(obj)
    return obj


def panel(name, points, thickness, material):
    # Thin closed surface with its own stable edge; body parts are later joined.
    n = len(points)
    verts = [(x, y, z-thickness/2) for x,y,z in points]
    verts += [(x, y, z+thickness/2) for x,y,z in points]
    faces = [tuple(range(n-1,-1,-1)), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh_obj(name, verts, faces, material)


def facet(name, points, offset, material):
    # Closed 3D facet: unlike panel(), this can face aft, forward, or outward.
    n=len(points)
    verts=list(points)+[tuple(p[i]+offset[i] for i in range(3)) for p in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh_obj(name,verts,faces,material)


def box(name, loc, dims, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    link(o)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new("machined radius", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    body_parts.append(o)
    return o


def rod(name, a, b, radius, material, segments=8):
    a, b = Vector(a), Vector(b)
    d = b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius,
                                        depth=d.length, location=(a+b)/2)
    o = bpy.context.object
    o.name = name
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    link(o)
    o.data.materials.append(material)
    body_parts.append(o)
    return o


def loft(name, stations, section, material, smooth=True):
    verts = [v for station in stations for v in section(*station)]
    n = len(section(*stations[0]))
    faces = []
    for s in range(len(stations)-1):
        for i in range(n):
            faces.append((s*n+i, s*n+(i+1)%n, (s+1)*n+(i+1)%n, (s+1)*n+i))
    faces += [tuple(range(n-1,-1,-1)), tuple((len(stations)-1)*n+i for i in range(n))]
    return mesh_obj(name, verts, faces, material, smooth)


exec(compile((SCRIPT_ROOT / "body_variants.py").read_text(), str(SCRIPT_ROOT / "body_variants.py"), "exec"))

# Merge static bodywork into one semantic Body. This preserves material slots
# while lowering the export mesh count and draw-call floor.
bpy.ops.object.select_all(action="DESELECT")
for obj in body_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body_parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = "Body"
body.parent = root


def wheel_mesh(name, center):
    # One mesh and one origin per complete wheel. Mesh vertices are local to
    # axle center; GLB pivot lands at the contract's axle-centered transform.
    verts=[]; faces=[]; mids=[]
    def append(vs,fs,material):
        start=len(verts)
        verts.extend(vs)
        faces.extend(tuple(start+i for i in f) for f in fs)
        mids.extend([material]*len(fs))
    n=32
    # Rubber tread/sidewall as a closed radial profile revolved around local Y.
    profile=[(-.105,0),(-.105,.31),(-.108,.36),(-.087,.42),(.087,.42),
             (.108,.36),(.105,.31),(.105,0)]
    rv=[]
    for yy,rr in profile:
        rv.extend((rr*cos(2*pi*i/n),yy,rr*sin(2*pi*i/n)) for i in range(n))
    rf=[]
    for j in range(len(profile)-1):
        for i in range(n):
            rf.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    rf += [tuple(range(n-1,-1,-1)),tuple((len(profile)-1)*n+i for i in range(n))]
    append(rv,rf,0)
    # Both side rims and spoke sets belong to the same wheel object.
    for sign in (-1,1):
        y=sign*.111
        rings=[(.31,.018),(.285,.014),(.070,.020)]
        for radius,width in rings:
            a=[(radius*cos(2*pi*i/n),y-width/2,radius*sin(2*pi*i/n)) for i in range(n)]
            b=[(radius*cos(2*pi*i/n),y+width/2,radius*sin(2*pi*i/n)) for i in range(n)]
            append(a+b,[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],1)
        for j in range(10):
            a=2*pi*j/10
            c,s=cos(a),sin(a)
            perp=(-s,c)
            p=[]
            for r,side in ((.072,-.020),(.285,-.015),(.285,.015),(.072,.020)):
                p.append((r*c+side*perp[0],y+sign*.020,r*s+side*perp[1]))
            append(p,[(0,1,2,3)],1)
    mesh=bpy.data.meshes.new(name+"_mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    vehicle.objects.link(obj)
    obj.data.materials.append(rubber)
    obj.data.materials.append(gunmetal)
    for poly,idx in zip(mesh.polygons,mids):
        poly.material_index=idx
        poly.use_smooth=True
    obj.location=center
    obj.parent=root
    return obj


wheels={}
for axle,x in (("Front",1.53 if VARIANT=="vesper" else 1.21 if VARIANT=="sable" else 1.28),("Rear",-1.53 if VARIANT=="vesper" else -1.21 if VARIANT=="sable" else -1.28)):
    for side,y in (("Left",1.04),("Right",-1.04)):
        name=f"Wheel{axle}{side}"
        wheels[name]=wheel_mesh(name,(x,y,.43))

for name,loc in {
    "BrakeLeft":(-2.50, .63,.83),"BrakeRight":(-2.50,-.63,.83),
    "HeadlightLeft":(2.43,.63,.70),"HeadlightRight":(2.43,-.63,.70),
    "ExhaustLeft":(-2.52,.17,.53),"ExhaustRight":(-2.52,-.17,.53),
    "RearTireLeft":(-1.53 if VARIANT=="vesper" else -1.21 if VARIANT=="sable" else -1.28,1.04,.43),"RearTireRight":(-1.53 if VARIANT=="vesper" else -1.21 if VARIANT=="sable" else -1.28,-1.04,.43),
}.items():
    obj=bpy.data.objects.new(name,None)
    vehicle.objects.link(obj)
    obj.parent=root
    obj.location=loc


def unwrap(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(island_margin=.012)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.data.uv_layers.active.name="KickLabOriginalUV"


for obj in [body,*wheels.values()]:
    unwrap(obj)

# Local review stage; never included in the GLB.
def stage_mat(name,rgb): return mat(name,rgb,0,.9)
asphalt=stage_mat("REVIEW asphalt",(.18,.20,.21))
verge=stage_mat("REVIEW verge",(.16,.22,.14))
line=stage_mat("REVIEW line",(.78,.78,.73))
curb=stage_mat("REVIEW curb",(.55,.12,.08))

def stage_box(name,loc,dims,material):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    link(o,studio);o.data.materials.append(material)
    return o

stage_box("verge",(70,0,-.16),(280,180,.20),verge)
stage_box("asphalt",(70,0,-.045),(280,14,.08),asphalt)
for s in (-1,1):
    stage_box(f"road edge {s}",(70,s*6.70,.003),(280,.12,.008),line)
    for x in range(-20,160,8):
        stage_box(f"curb red {s} {x}",(x,s*7.12,.005),(2,.62,.02),curb)
        stage_box(f"curb white {s} {x}",(x+2,s*7.12,.005),(2,.62,.02),line)

world=bpy.context.scene.world
world.color=(.28,.32,.38)
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.29,.34,.39,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.65
sun_data=bpy.data.lights.new("review sky key","AREA")
sun=bpy.data.objects.new("review sky key",sun_data)
studio.objects.link(sun)
sun.location=(-3,-5,11)
sun_data.energy=2500
sun_data.shape="DISK";sun_data.size=8
sun.rotation_euler=(Vector((0,0,.8))-sun.location).to_track_quat("-Z","Y").to_euler()

camera_data=bpy.data.cameras.new("Race exact 55 degree chase")
camera=bpy.data.objects.new("Race exact 55 degree chase",camera_data)
studio.objects.link(camera)
camera_data.type="PERSP";camera_data.sensor_fit="VERTICAL"
camera_data.angle=radians(55);camera_data.clip_end=450
bpy.context.scene.camera=camera

scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE"
scene.render.image_settings.file_format="PNG"
scene.render.resolution_percentage=100
scene.view_settings.view_transform="AgX"

# Save editable original source and raw candidate before any review render.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f"{VARIANT}-original.blend"))
bpy.ops.object.select_all(action="DESELECT")
for obj in vehicle.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/f"{VARIANT}-original.glb"),
    export_format="GLB",use_selection=True,export_apply=False,
    export_yup=True,export_animations=False,export_cameras=False,
    export_lights=False,export_materials="EXPORT")

def aim(loc,target):
    camera.location=loc
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat("-Z","Y").to_euler()

views={
    "front":((8,0,1.75),(0,0,.77),1280,720),
    "side":((0,-8,1.60),(0,0,.75),1280,720),
    "rear":((-8,0,1.75),(0,0,.77),1280,720),
    "rear-quarter":((-6.5,-4.2,2.2),(-.8,0,.7),1280,720),
    "chase-desktop-1440x900":((-7.7,-.6,4.7),(3,0,1.05),1440,900),
    "chase-phone-390x844":((-13.6,-.6,5.1),(3.8,0,1.05),390,844),
}
for name,(loc,target,w,h) in ([] if args.no_renders else views.items()):
    aim(loc,target)
    scene.render.resolution_x=w;scene.render.resolution_y=h
    scene.render.filepath=str(RENDERS/(name+".png"))
    bpy.ops.render.render(write_still=True)

(OUT/"build-report.json").write_text(json.dumps({
    "source_design_sheet":f"local analytic {VARIANT} script",
    "provider_geometry_used":False,
    "external_assets_loaded":0,
    "root":"VehicleRoot","body":"Body",
    "wheel_pivots_blender":{name:list(obj.location) for name,obj in wheels.items()},
    "glb":f"{VARIANT}-original.glb","blend":f"{VARIANT}-original.blend",
    "camera":"Race 55 degree FOV; responsive positions from RACE_SYSTEMS.camera at v=0",
    "renders":list(views),
},indent=2)+"\n")
print("ROSTER_CANDIDATE_DONE", VARIANT, OUT)
