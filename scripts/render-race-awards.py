"""Render six original, local Race collectibles with Blender Eevee."""
import bpy, math, os, subprocess
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'src/assets/awards/race/v1')
os.makedirs(OUT,exist_ok=True)
COLORS={'core':(.14,.85,.95,1),'drag':(1,.36,.18,1),'drift':(.72,.44,1,1),'circuit':(.25,.96,.6,1),'hill':(1,.72,.22,1),'endurance':(.3,.68,1,1)}
def mat(name,color,metal=0,rough=.3):
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
GOLD=mat('machined champagne titanium',(.58,.47,.29,1),.85,.22)
DARK=mat('dark anodized titanium',(.025,.045,.08,1),.75,.3)
WHITE=mat('ivory enamel',(.82,.9,.91,1),.25,.25)
def cube(name,loc,scale,material,bevel=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);mod=o.modifiers.new('soft machined edge','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def cyl(name,loc,r,depth,material,vertices=64):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(material);mod=o.modifiers.new('edge chamfer','BEVEL');mod.width=.055;mod.segments=3;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def curve(name,pts,bevel,material):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=bevel;c.bevel_resolution=4;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,co in zip(s.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o
def cone(name,loc,r1,r2,depth,material):
 bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=r1,radius2=r2,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(material);o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
for key in COLORS:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 accent=mat(key+' luminous enamel',COLORS[key],.35,.18)
 # Shared crafted pedestal, each central sculpture has distinct silhouette.
 cyl('floating plinth',(0,0,-.18),1.12,.22,DARK)
 cyl('inset ring',(0,0,-.05),.98,.07,GOLD)
 cyl('enamel field',(0,0,0),.87,.075,DARK)
 if key=='core':
  pole=cube('flag staff',(-.48,0,.48),(.08,.09,1.13),GOLD,.025)
  for x in range(4):
   for z in range(4):cube('waving checkered flag',(-.25+x*.24,.04*math.sin(x*1.3),.97-z*.19),(.23,.08,.18),WHITE if (x+z)%2 else accent,.018)
 elif key=='drag':
  cone('launch spear',(0,0,1.02),.26,.025,1.48,accent)
  cyl('engine collar',(0,0,.27),.35,.16,GOLD)
  for side in (-1,1):cube('swept fin',(side*.31,0,.38),(.36,.09,.5),GOLD,.025).rotation_euler[1]=side*.36
  cone('thrust flare',(0,0,.07),.22,.01,.45,WHITE)
 elif key=='drift':
  for offset in (-.21,.21):
   pts=[(math.cos(t)*.6,offset+math.sin(t)*.23,.37+t*.11) for t in [i*math.pi/22 for i in range(23)]]
   curve('paired slipstream ribbon',pts,.09,accent if offset>0 else GOLD)
  cyl('pivot hub',(0,0,.36),.27,.25,DARK);cyl('pivot inset',(0,0,.51),.16,.07,WHITE)
 elif key=='circuit':
  pts=[(-.62,-.1,.55),(-.52,-.3,.7),(-.15,-.36,.87),(.37,-.23,.9),(.62,.1,.7),(.48,.3,.5),(.05,.35,.4),(-.39,.23,.48),(-.62,-.1,.55)]
  curve('raised racing loop',pts,.14,GOLD);curve('inner racing line',[(x,y,z+.08) for x,y,z in pts],.035,accent)
  for x,y,z in [pts[0],pts[4]]:cyl('track marker',(x,y,z),.13,.16,WHITE,24)
 elif key=='hill':
  pts=[(-.74,0,.25),(-.35,0,.72),(-.08,0,.46),(.24,0,1.13),(.72,0,.3)]
  curve('summit silhouette',pts,.14,GOLD)
  curve('snow ridge',[(-.01,-.025,.65),(.24,-.025,1.13),(.45,-.025,.71)],.06,WHITE)
  cone('summit beacon',(.24,0,1.21),.13,.01,.27,accent)
 elif key=='endurance':
  cyl('upper clock rim',(0,0,1.12),.56,.13,GOLD);cyl('lower clock rim',(0,0,.26),.56,.13,GOLD)
  cone('upper vessel',(0,0,.88),.47,.05,.46,accent)
  cone('lower vessel',(0,0,.5),.05,.47,.46,WHITE)
  curve('sand stream',[(0,-.025,.74),(0,-.025,.44)],.026,GOLD)
  for x in (-.43,.43):cyl('clock pillar',(x,0,.69),.055,.86,GOLD,24)
 # lighting and camera
 bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));bpy.context.object.data.energy=650;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=4
 bpy.ops.object.light_add(type='AREA',location=(3,2,5));bpy.context.object.data.energy=850;bpy.context.object.data.color=COLORS[key][:3];bpy.context.object.data.size=3
 bpy.ops.object.camera_add(location=(2.8,-3.8,3.2));cam=bpy.context.object;direction=Vector((0,0,.52))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.15;bpy.context.scene.camera=cam
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.render.film_transparent=True
 scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,key+'.png');bpy.ops.render.render(write_still=True)
 subprocess.run(['cwebp','-quiet','-q','82',scene.render.filepath,'-o',os.path.join(OUT,key+'.webp')],check=True)
 os.remove(scene.render.filepath)
