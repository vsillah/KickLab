"""One-pass Direction A SubD polish. Evaluated inside build_vehicle_polished.py.

Only analytic control cages and locally authored materials are used. The old
loft/box body geometry is absent from this candidate.
"""

def sculpt(name, stations, ring, material, levels=2):
    obj=loft(name,stations,ring,material,True)
    mod=obj.modifiers.new("authored Catmull Clark shell","SUBSURF")
    mod.subdivision_type="CATMULL_CLARK"
    mod.levels=levels
    mod.render_levels=levels
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


# Control stations are denser at the haunch, front arch, nose, and tail.
# Smooth top/belt/underside curvature is one continuous unibody shell.
shell_stations=[
    (-2.56,.69,.72),(-2.52,.75,.78),(-2.43,.85,.86),
    (-2.10,.93,.98),(-1.72,.99,1.05),(-1.34,1.03,1.06),
    (-.90,.96,.96),(-.48,.91,.89),(.08,.90,.87),
    (.73,.94,.91),(1.27,1.01,1.00),(1.72,.96,.88),
    (2.22,.80,.70),(2.44,.70,.59),(2.53,.63,.55),(2.58,.58,.53),
]
def shell_ring(x,w,h):
    return [(x,0,h+.045),(x,w*.34,h+.055),(x,w*.70,h+.055),
            (x,w*.87,h+.015),(x,w,h-.085),(x,w*1.017,h-.18),
            (x,w*.99,.61),(x,w*.81,.46),(x,w*.57,.42),
            (x,0,.41),(x,-w*.57,.42),(x,-w*.81,.46),
            (x,-w*.99,.61),(x,-w*1.017,h-.18),(x,-w,h-.085),
            (x,-w*.87,h+.015),(x,-w*.70,h+.055),(x,-w*.34,h+.055)]
shell=sculpt("continuous SubD cobalt unibody",shell_stations,shell_ring,cobalt,2)

# Boolean cutouts make the wheel openings physical holes in the continuous
# body. They are cut after subdivision; the existing four wheel objects remain
# untouched and retain their axle-centred local coordinates.
for axle_x in (-1.28,1.28):
    for side_y in (-1.04,1.04):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.475,depth=.85,
            location=(axle_x,side_y,.43),rotation=(pi/2,0,0))
        cutter=bpy.context.object
        cut=shell.modifiers.new("integrated arch opening","BOOLEAN")
        cut.operation="DIFFERENCE"
        cut.solver="EXACT"
        cut.object=cutter
        bpy.ops.object.select_all(action="DESELECT")
        shell.select_set(True)
        bpy.context.view_layer.objects.active=shell
        bpy.ops.object.modifier_apply(modifier=cut.name)
        bpy.data.objects.remove(cutter,do_unlink=True)

# The canopy is a distinct SubD volume with low roof, sloped glass front and
# rear, and a strong cobalt roof rail/haunch transition.
canopy_stations=[
    (-1.47,.56,.96),(-1.37,.59,1.04),(-1.01,.61,1.26),
    (-.68,.62,1.39),(-.54,.62,1.41),(.04,.61,1.41),
    (.23,.60,1.36),(.56,.59,1.16),(.84,.58,.91),(.90,.55,.89),
]
def canopy_ring(x,w,h):
    return [(x,0,h),(x,w*.48,h),(x,w*.82,h-.045),
            (x,w,h-.12),(x,w*.99,.91),(x,w*.71,.875),
            (x,0,.87),(x,-w*.71,.875),(x,-w*.99,.91),
            (x,-w,h-.12),(x,-w*.82,h-.045),(x,-w*.48,h)]
sculpt("smooth smoke canopy",canopy_stations,canopy_ring,glass,2)

for s in (-1,1):
    # Roof rails and rear buttresses flow into the prominent wheel shoulder.
    rod(f"roof rail {s}",(-1.04,s*.55,1.29),(.27,s*.54,1.34),.025,cobalt_edge,10)
    rod(f"front A pillar {s}",(.27,s*.54,1.34),(.85,s*.58,.91),.032,cobalt,10)
    rod(f"sculpted flying buttress {s}",(-1.05,s*.55,1.29),(-1.77,s*.82,1.02),.082,cobalt,12)
    rod(f"rear shoulder sweep {s}",(-2.45,s*.79,.86),(-1.72,s*.98,1.04),.025,cobalt_edge,10)
    rod(f"front shoulder sweep {s}",(.82,s*.91,.89),(2.23,s*.78,.69),.023,cobalt_edge,10)

    # A recessed triangular intake and a long sculpted blue/white door plane.
    facet(f"recessed side cut {s}",[(.45,s*.93,.77),(-.07,s*.95,.81),
          (-1.44,s*.97,.59),(-.73,s*.99,.50),(.26,s*.96,.65)],
          (0,s*.035,0),carbon)
    facet(f"floating blue door shoulder {s}",[(.75,s*.92,.88),(.08,s*.95,.88),
          (-1.32,s*.98,.83),(-.91,s*1.015,.67),(.28,s*.98,.78)],
          (0,s*.026,.006),cobalt_edge)
    facet(f"swept white sill {s}",[(2.35,s*.72,.45),(1.85,s*.91,.29),
          (.78,s*.98,.245),(-.70,s*.99,.25),(-1.85,s*.96,.30),
          (-2.43,s*.79,.46),(-1.57,s*.97,.49),(-.20,s*.98,.45)],
          (0,s*.028,0),warm_white)
    rod(f"dark rocker edge {s}",(-1.84,s*.99,.245),(1.82,s*.98,.245),.028,carbon,8)
    box(f"mirror shell {s}",(.50,s*.77,.99),(.22,.20,.074),carbon,.025)
    rod(f"mirror stem {s}",(.47,s*.57,.96),(.50,s*.77,.99),.016,brushed)

    # The arch cut has a slim continuous cobalt lip, tangent to the tire.
    for axle_x in (-1.28,1.28):
        arc=[]
        for i in range(17):
            a=pi*i/16
            arc.append((axle_x+.478*cos(a),s*1.034,.43+.478*sin(a)))
        for i in range(16):
            rod(f"wheel opening {axle_x} {s} {i}",arc[i],arc[i+1],.013,cobalt_edge,6)

# Front outer shell: low intake mouth, two strong diagonal white aero blades,
# and headlights seated above deep black outer pockets.
box("front deep central intake",(2.565,0,.43),(.12,1.02,.28),carbon,.025)
box("front splitter deep graphite",(2.54,0,.20),(.38,2.02,.042),carbon,.015)
for s in (-1,1):
    facet(f"front intake dark wing {s}",[(2.55,s*.99,.58),(2.59,s*.72,.55),
          (2.62,s*.68,.29),(2.56,s*.98,.30)],(.025,0,0),carbon)
    facet(f"front sculpted white aero {s}",[(2.56,s*.98,.48),(2.64,s*.83,.27),
          (2.63,s*.63,.25),(2.55,s*.67,.55)],(.018,0,0),warm_white)
    facet(f"front headlight signature {s}",[(2.51,s*.88,.69),(2.60,s*.48,.61),
          (2.61,s*.45,.59),(2.51,s*.89,.65)],(.010,0,0),ice)
    facet(f"hood vent insert {s}",[(1.86,s*.29,.83),(1.38,s*.31,.96),
          (1.33,s*.52,.94),(1.88,s*.50,.79)],(0,0,.006),carbon)
    rod(f"front blue vent blade {s}",(1.38,s*.33,.96),(1.88,s*.31,.83),.023,cobalt_edge)
    box(f"front corner canard {s}",(2.52,s*.99,.25),(.25,.28,.019),carbon,.007)

# Layered tail: broad curved haunch framing a deep dark cavity, thin swept
# lamps, vent blades, deeply set exhausts, white outer aero and a finned pan.
rear_cage=[(-2.56,.78,.76),(-2.60,.86,.84),(-2.65,.93,.91)]
def rear_ring(x,w,h):
    return [(x,0,h+.065),(x,w*.54,h+.062),(x,w*.83,h+.015),
            (x,w,h-.12),(x,w*.95,.57),(x,w*.70,.44),
            (x,0,.43),(x,-w*.70,.44),(x,-w*.95,.57),
            (x,-w,h-.12),(x,-w*.83,h+.015),(x,-w*.54,h+.062)]
sculpt("rounded cobalt rear shoulder frame",rear_cage,rear_ring,cobalt,2)
box("rear recessed graphite fascia",(-2.665,0,.68),(.025,1.61,.31),carbon,.010)
box("rear deep lower vent pan",(-2.677,0,.48),(.075,1.73,.23),carbon,.012)
for s in (-1,1):
    facet(f"rear swept LED {s}",[(-2.69,s*.86,.84),(-2.70,s*.34,.85),
          (-2.70,s*.31,.79),(-2.69,s*.82,.78)],(-.010,0,0),red)
    facet(f"rear outer white sculpt {s}",[(-2.68,s*.96,.77),(-2.72,s*.95,.53),
          (-2.73,s*.75,.30),(-2.69,s*.70,.38),(-2.67,s*.81,.74)],
          (-.012,0,0),warm_white)
    facet(f"rear recessed triangular vent {s}",[(-2.715,s*.81,.74),
          (-2.73,s*.50,.71),(-2.74,s*.45,.53),(-2.73,s*.77,.48)],
          (-.012,0,0),carbon)
    for k in range(3):
        rod(f"vent angled fin {s} {k}",(-2.755,s*(.49+.09*k),.70),
            (-2.76,s*(.46+.09*k),.54),.011,brushed,6)
    rod(f"rear wing pedestal {s}",(-1.94,s*.68,1.00),(-2.13,s*.69,1.37),.034,carbon)
    box(f"rear wing endplate {s}",(-2.25,s*1.05,1.39),(.46,.035,.20),carbon,.008)
box("rear full-width deep wing",(-2.17,0,1.39),(.50,2.22,.060),carbon,.020)
box("rear wing cobalt leading edge",(-1.94,0,1.42),(.055,2.07,.02),cobalt_edge,.005)
box("rear diffuser cavity",(-2.63,0,.25),(.48,1.84,.09),carbon,.015)
for i in range(-3,4):
    box(f"deep diffuser vane {i}",(-2.68,i*.225,.24),(.24,.026,.18),carbon,.006)
box("vertical rain light",(-2.78,0,.34),(.017,.036,.17),red,.004)
for s in (-1,1):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,
        location=(-2.73,s*.17,.55),rotation=(0,pi/2,0),
        major_radius=.09,minor_radius=.015)
    o=bpy.context.object;o.name=f"deep exhaust bezel {s}"
    link(o);o.data.materials.append(brushed);body_parts.append(o)
