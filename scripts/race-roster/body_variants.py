"""Two original analytic silhouettes; evaluated by generate.py in Blender.

Both retain Direction A's cobalt/ivory/graphite material language, but every
body surface below is authored for this roster. No external mesh or texture.
"""

def sculpt(name, stations, section, material, levels=2):
    obj=loft(name, stations, section, material, True)
    mod=obj.modifiers.new("authored smooth shell", "SUBSURF")
    mod.levels=levels
    mod.render_levels=levels
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


if VARIANT == "kestrel":
    # Short, narrow waist with a long taper and a compact forward bubble.
    stations=[(-2.40,.48,.61),(-2.29,.65,.68),(-1.91,.81,.77),
        (-1.46,.90,.83),(-1.06,.91,.78),(-.52,.83,.71),
        (.12,.83,.70),(.74,.91,.77),(1.34,.93,.80),
        (1.82,.80,.70),(2.22,.62,.57),(2.38,.42,.49)]
    canopy_stations=[(-1.06,.22,.82),(-.91,.37,.97),(-.56,.48,1.16),
        (-.27,.49,1.22),(.15,.48,1.23),(.43,.43,1.17),
        (.73,.35,1.02),(1.00,.18,.79)]
    axle=1.28; arch=.468
else:
    # A wide high-shoulder wedge with a low, elongated cockpit and broad tail.
    stations=[(-2.62,.79,.76),(-2.51,.91,.83),(-2.20,1.00,.91),
        (-1.70,1.06,.94),(-1.12,1.02,.85),(-.42,.92,.77),
        (.27,.92,.78),(.95,1.00,.86),(1.52,1.01,.81),
        (2.12,.91,.68),(2.49,.76,.56),(2.61,.64,.49)]
    canopy_stations=[(-1.52,.47,.93),(-1.30,.54,1.02),(-.84,.57,1.19),
        (-.33,.58,1.26),(.19,.56,1.27),(.55,.52,1.19),
        (.98,.44,.98),(1.18,.36,.83)]
    axle=1.28; arch=.49


def shell_ring(x,w,h):
    return [(x,0,h+.06),(x,w*.36,h+.06),(x,w*.75,h+.035),
        (x,w*.92,h-.04),(x,w,h-.16),(x,w*.96,.49),
        (x,w*.72,.35),(x,0,.34),(x,-w*.72,.35),
        (x,-w*.96,.49),(x,-w,h-.16),(x,-w*.92,h-.04),
        (x,-w*.75,h+.035),(x,-w*.36,h+.06)]


shell=sculpt(f"{VARIANT} continuous unibody",stations,shell_ring,cobalt,2)
for axle_x in (-axle,axle):
    for side_y in (-1.04,1.04):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=arch,depth=.86,
            location=(axle_x,side_y,.43),rotation=(pi/2,0,0))
        cutter=bpy.context.object
        cut=shell.modifiers.new("open wheel arch", "BOOLEAN")
        cut.operation="DIFFERENCE";cut.solver="EXACT";cut.object=cutter
        bpy.ops.object.select_all(action="DESELECT")
        shell.select_set(True);bpy.context.view_layer.objects.active=shell
        bpy.ops.object.modifier_apply(modifier=cut.name)
        bpy.data.objects.remove(cutter,do_unlink=True)


def canopy_ring(x,w,h):
    return [(x,0,h),(x,w*.52,h),(x,w*.85,h-.055),
        (x,w,h-.13),(x,w*.94,.78),(x,0,.76),
        (x,-w*.94,.78),(x,-w,h-.13),(x,-w*.85,h-.055),
        (x,-w*.52,h)]


sculpt(f"{VARIANT} smoke canopy",canopy_stations,canopy_ring,glass,2)

for side in (-1,1):
    if VARIANT == "kestrel":
        # Strong exposed dart-shaped shoulder and a bright swept sill.
        facet(f"kestrel shoulder blade {side}",[
            (1.98,side*.66,.69),(.92,side*.91,.81),
            (-.36,side*.86,.77),(-1.85,side*.78,.75),
            (-1.41,side*.88,.59),(.49,side*.88,.65)],
            (0,side*.033,0),cobalt_edge)
        facet(f"kestrel rising ivory sill {side}",[
            (2.17,side*.58,.37),(1.52,side*.83,.29),
            (.40,side*.91,.24),(-.80,side*.90,.29),
            (-2.22,side*.65,.47),(-1.76,side*.84,.55),
            (-.34,side*.88,.43),(.90,side*.87,.40)],
            (0,side*.032,0),warm_white)
        facet(f"kestrel aft air cut {side}",[
            (-.87,side*.93,.70),(-1.78,side*.84,.70),
            (-1.37,side*.91,.49),(-.62,side*.92,.49)],
            (0,side*.035,0),carbon)
        rod(f"kestrel swept canopy rail {side}",(-.71,side*.39,1.11),
            (.45,side*.43,1.15),.022,cobalt_edge,10)
        rod(f"kestrel taper buttress {side}",(-.78,side*.40,1.10),
            (-1.91,side*.77,.78),.052,cobalt,10)
        box(f"kestrel short aero mirror {side}",(.63,side*.65,.86),
            (.18,.15,.055),carbon,.018)
    else:
        # Aegis has a continuous slab-side air channel and visible lower skirt.
        facet(f"aegis broad upper shoulder {side}",[
            (2.20,side*.88,.68),(1.40,side*1.00,.84),
            (.41,side*.94,.83),(-.63,side*.95,.81),
            (-1.65,side*1.03,.91),(-2.40,side*.87,.78),
            (-1.45,side*1.035,.69),(.40,side*.95,.68)],
            (0,side*.035,0),cobalt_edge)
        facet(f"aegis deep lateral channel {side}",[
            (1.15,side*1.00,.62),(.38,side*.99,.69),
            (-1.63,side*1.05,.66),(-2.23,side*.95,.49),
            (-.67,side*1.04,.45),(.72,side*.99,.48)],
            (0,side*.037,0),carbon)
        facet(f"aegis ivory aero skirt {side}",[
            (2.32,side*.81,.42),(1.84,side*.96,.28),
            (.41,side*1.04,.22),(-1.54,side*1.04,.24),
            (-2.43,side*.84,.42),(-1.50,side*1.04,.40),
            (.80,side*1.00,.39)],(0,side*.031,0),warm_white)
        box(f"aegis side floor {side}",(-.1,side*1.06,.22),
            (3.67,.19,.055),carbon,.013)
        rod(f"aegis roof rail {side}",(-.87,side*.52,1.14),
            (.53,side*.48,1.16),.027,cobalt_edge,10)
        rod(f"aegis rear flying buttress {side}",(-1.02,side*.53,1.13),
            (-2.22,side*.89,.88),.078,cobalt,10)
        box(f"aegis aero mirror {side}",(.89,side*.74,.91),
            (.24,.18,.065),carbon,.022)

    for axle_x in (-axle,axle):
        arc=[(axle_x+(arch+.01)*cos(pi*i/16),side*1.035,
              .43+(arch+.01)*sin(pi*i/16)) for i in range(17)]
        for i in range(16):
            rod(f"{VARIANT} arch lip {axle_x} {side} {i}",
                arc[i],arc[i+1],.012,cobalt_edge,6)

if VARIANT == "kestrel":
    # The slender nose and roof-width tail make it visibly unlike Direction A.
    box("kestrel tapered nose intake",(2.39,0,.40),(.12,.82,.20),carbon,.024)
    box("kestrel narrow splitter",(2.34,0,.22),(.30,1.70,.035),carbon,.010)
    box("kestrel small ducktail",(-2.35,0,.88),(.26,1.24,.05),carbon,.015)
    box("kestrel tail cavity",(-2.43,0,.56),(.045,1.12,.23),carbon,.014)
    for side in (-1,1):
        facet(f"kestrel arrow lamp {side}",[
            (2.38,side*.57,.62),(2.40,side*.25,.53),
            (2.40,side*.30,.50),(2.38,side*.59,.58)],(.012,0,0),ice)
        facet(f"kestrel tail lamp {side}",[
            (-2.45,side*.59,.72),(-2.47,side*.15,.69),
            (-2.47,side*.15,.64),(-2.45,side*.59,.67)],(-.009,0,0),red)
        facet(f"kestrel nose ivory sweep {side}",[
            (2.38,side*.62,.48),(2.42,side*.42,.27),
            (2.37,side*.32,.26),(2.33,side*.63,.41)],(.015,0,0),warm_white)
    box("kestrel center rain light",(-2.48,0,.37),(.018,.035,.09),red,.003)
else:
    box("aegis full span front splitter",(2.60,0,.19),(.43,2.23,.060),carbon,.012)
    box("aegis deep front intake",(2.64,0,.42),(.12,1.32,.29),carbon,.014)
    box("aegis front aero lip",(2.67,0,.25),(.12,1.58,.035),warm_white,.005)
    box("aegis rear vent fascia",(-2.67,0,.64),(.06,1.80,.33),carbon,.014)
    box("aegis broad rear wing",(-2.34,0,1.51),(.62,2.42,.075),carbon,.016)
    box("aegis lower wing element",(-2.42,0,1.30),(.37,2.08,.040),carbon,.009)
    box("aegis cobalt wing leading edge",(-2.01,0,1.54),(.055,2.34,.022),cobalt_edge,.003)
    facet("aegis ivory dorsal fin",[(-.84,0,1.22),(-1.39,0,1.43),
        (-2.31,0,1.47),(-2.46,0,1.33),(-1.72,0,1.10)],(0,.045,0),warm_white)
    box("aegis deep diffuser",(-2.63,0,.24),(.52,2.04,.10),carbon,.010)
    for i in range(-4,5):
        box(f"aegis diffuser vane {i}",(-2.70,i*.224,.23),
            (.29,.024,.19),carbon,.004)
    for side in (-1,1):
        rod(f"aegis wing support {side}",(-2.03,side*.69,.87),
            (-2.31,side*.69,1.48),.043,carbon,10)
        box(f"aegis wing endplate {side}",(-2.36,side*1.17,1.49),
            (.62,.035,.25),carbon,.006)
        box(f"aegis corner canard {side}",(2.54,side*1.04,.32),
            (.33,.27,.024),carbon,.004)
        facet(f"aegis blade lamp {side}",[
            (2.58,side*.93,.67),(2.66,side*.42,.59),
            (2.66,side*.42,.55),(2.58,side*.93,.62)],(.009,0,0),ice)
        facet(f"aegis long tail lamp {side}",[
            (-2.68,side*.87,.81),(-2.70,side*.27,.80),
            (-2.70,side*.27,.74),(-2.68,side*.87,.74)],(-.008,0,0),red)
    box("aegis center rain light",(-2.73,0,.37),(.020,.04,.14),red,.003)
