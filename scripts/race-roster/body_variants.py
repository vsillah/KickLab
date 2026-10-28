"""Two original analytic silhouettes; evaluated by generate.py in Blender.

Kestrel and Aegis retain distinct original silhouettes. Their local material
colorways are defined in generate.py. No external mesh or texture.
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


if VARIANT in ("kestrel", "aegis"):
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


    shell=sculpt(f"{VARIANT} continuous unibody",stations,shell_ring,body_paint,2)
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
                (0,side*.033,0),shoulder_paint)
            facet(f"kestrel rising graphite sill {side}",[
                (2.17,side*.58,.37),(1.52,side*.83,.29),
                (.40,side*.91,.24),(-.80,side*.90,.29),
                (-2.22,side*.65,.47),(-1.76,side*.84,.55),
                (-.34,side*.88,.43),(.90,side*.87,.40)],
                (0,side*.032,0),aero_paint)
            facet(f"kestrel aft air cut {side}",[
                (-.87,side*.93,.70),(-1.78,side*.84,.70),
                (-1.37,side*.91,.49),(-.62,side*.92,.49)],
                (0,side*.035,0),carbon)
            rod(f"kestrel swept canopy rail {side}",(-.71,side*.39,1.11),
                (.45,side*.43,1.15),.022,shoulder_paint,10)
            rod(f"kestrel taper buttress {side}",(-.78,side*.40,1.10),
                (-1.91,side*.77,.78),.052,body_paint,10)
            box(f"kestrel short aero mirror {side}",(.63,side*.65,.86),
                (.18,.15,.055),carbon,.018)
        else:
            # Aegis has a continuous slab-side air channel and visible lower skirt.
            facet(f"aegis broad upper shoulder {side}",[
                (2.20,side*.88,.68),(1.40,side*1.00,.84),
                (.41,side*.94,.83),(-.63,side*.95,.81),
                (-1.65,side*1.03,.91),(-2.40,side*.87,.78),
                (-1.45,side*1.035,.69),(.40,side*.95,.68)],
                (0,side*.035,0),shoulder_paint)
            facet(f"aegis deep lateral channel {side}",[
                (1.15,side*1.00,.62),(.38,side*.99,.69),
                (-1.63,side*1.05,.66),(-2.23,side*.95,.49),
                (-.67,side*1.04,.45),(.72,side*.99,.48)],
                (0,side*.037,0),carbon)
            facet(f"aegis carbon aero skirt {side}",[
                (2.32,side*.81,.42),(1.84,side*.96,.28),
                (.41,side*1.04,.22),(-1.54,side*1.04,.24),
                (-2.43,side*.84,.42),(-1.50,side*1.04,.40),
                (.80,side*1.00,.39)],(0,side*.031,0),aero_paint)
            box(f"aegis side floor {side}",(-.1,side*1.06,.22),
                (3.67,.19,.055),carbon,.013)
            rod(f"aegis roof rail {side}",(-.87,side*.52,1.14),
                (.53,side*.48,1.16),.027,shoulder_paint,10)
            rod(f"aegis rear flying buttress {side}",(-1.02,side*.53,1.13),
                (-2.22,side*.89,.88),.078,body_paint,10)
            box(f"aegis aero mirror {side}",(.89,side*.74,.91),
                (.24,.18,.065),carbon,.022)

        for axle_x in (-axle,axle):
            arc=[(axle_x+(arch+.01)*cos(pi*i/16),side*1.035,
                  .43+(arch+.01)*sin(pi*i/16)) for i in range(17)]
            for i in range(16):
                rod(f"{VARIANT} arch lip {axle_x} {side} {i}",
                    arc[i],arc[i+1],.012,shoulder_paint,6)

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
            facet(f"kestrel nose graphite sweep {side}",[
                (2.38,side*.62,.48),(2.42,side*.42,.27),
                (2.37,side*.32,.26),(2.33,side*.63,.41)],(.015,0,0),aero_paint)
        box("kestrel center rain light",(-2.48,0,.37),(.018,.035,.09),red,.003)
    else:
        box("aegis full span front splitter",(2.60,0,.19),(.43,2.23,.060),carbon,.012)
        box("aegis deep front intake",(2.64,0,.42),(.12,1.32,.29),carbon,.014)
        box("aegis front aero lip",(2.67,0,.25),(.12,1.58,.035),aero_paint,.005)
        box("aegis rear vent fascia",(-2.67,0,.64),(.06,1.80,.33),carbon,.014)
        box("aegis broad rear wing",(-2.34,0,1.51),(.62,2.42,.075),carbon,.016)
        box("aegis lower wing element",(-2.42,0,1.30),(.37,2.08,.040),carbon,.009)
        box("aegis crimson wing leading edge",(-2.01,0,1.54),(.055,2.34,.022),shoulder_paint,.003)
        facet("aegis carbon dorsal fin",[(-.84,0,1.22),(-1.39,0,1.43),
            (-2.31,0,1.47),(-2.46,0,1.33),(-1.72,0,1.10)],(0,.045,0),aero_paint)
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

else:
    # Original advanced shapes use analytic sections and local primitives only.
    if VARIANT == "vesper":
        axle=1.53; arch=.47
        stations=[(-2.64,.69,.74),(-2.48,.83,.79),(-1.95,.93,.85),(-1.4,.98,.86),(-.6,.91,.75),(.3,.90,.72),(1.15,.94,.78),(1.9,.88,.72),(2.43,.68,.57),(2.58,.51,.49)]
        roof=[(-1.73,.33,.83),(-1.5,.46,.98),(-.95,.51,1.18),(-.15,.51,1.25),(.55,.49,1.22),(1.08,.43,1.08),(1.42,.29,.80)]
    else:
        axle=1.21; arch=.46
        stations=[(-2.08,.49,.58),(-1.94,.68,.68),(-1.5,.86,.78),(-.83,.91,.76),(-.2,.80,.63),(.42,.79,.62),(1.07,.89,.74),(1.62,.82,.65),(1.98,.59,.48),(2.1,.39,.43)]
        roof=[(-.98,.18,.77),(-.77,.32,.94),(-.43,.39,1.09),(.09,.4,1.11),(.45,.35,1.03),(.78,.24,.75)]
    def ring(x,w,h):
        return [(x,0,h+.06),(x,w*.5,h+.05),(x,w*.9,h-.04),(x,w,h-.16),(x,w*.92,.43),(x,w*.64,.34),(x,0,.32),(x,-w*.64,.34),(x,-w*.92,.43),(x,-w,h-.16),(x,-w*.9,h-.04),(x,-w*.5,h+.05)]
    shell=sculpt(f"{VARIANT} forged unibody",stations,ring,body_paint,2)
    for axle_x in (-axle,axle):
        for side_y in (-1.04,1.04):
            bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=arch,depth=.9,location=(axle_x,side_y,.43),rotation=(pi/2,0,0))
            cutter=bpy.context.object
            cut=shell.modifiers.new("open wheel arch", "BOOLEAN")
            cut.operation="DIFFERENCE";cut.solver="EXACT";cut.object=cutter
            bpy.ops.object.select_all(action="DESELECT")
            shell.select_set(True);bpy.context.view_layer.objects.active=shell
            bpy.ops.object.modifier_apply(modifier=cut.name)
            bpy.data.objects.remove(cutter,do_unlink=True)
    def canopy_ring(x,w,h):
        return [(x,0,h),(x,w*.52,h),(x,w,h-.13),(x,w*.91,.78),(x,0,.75),(x,-w*.91,.78),(x,-w,h-.13),(x,-w*.52,h)]
    sculpt(f"{VARIANT} canopy",roof,canopy_ring,glass,2)
    for side in (-1,1):
        if VARIANT == "vesper":
            facet(f"vesper broad rear haunch {side}",[(-2.35,side*.82,.79),(-1.72,side*.99,.89),(-.78,side*.96,.80),(-.58,side*.89,.64),(-1.65,side*.99,.62)],(0,side*.036,0),shoulder_paint)
            facet(f"vesper long lower sill {side}",[(2.23,side*.73,.39),(1.3,side*.91,.31),(-1.5,side*.96,.27),(-2.47,side*.74,.41),(-1.65,side*.96,.45),(.9,side*.9,.45)],(0,side*.03,0),aero_paint)
            rod(f"vesper swept roof rail {side}",(-1.5,side*.46,.99),(.98,side*.43,1.08),.026,shoulder_paint,10)
            facet(f"vesper rear glass buttress {side}",[(-1.55,side*.46,.98),(-1.78,side*.82,.84),(-2.28,side*.75,.78),(-1.86,side*.40,1.04)],(0,side*.03,0),body_paint)
            box(f"vesper side inlet {side}",(-1.86,side*.94,.53),(.52,.025,.12),carbon,.012)
        else:
            facet(f"sable cutaway flank {side}",[(1.84,side*.71,.54),(.8,side*.86,.72),(-.38,side*.78,.58),(-1.6,side*.84,.65),(-1.82,side*.7,.36),(-.64,side*.91,.27),(.66,side*.86,.33)],(0,side*.04,0),aero_paint)
            facet(f"sable bright shoulder dart {side}",[(1.75,side*.72,.63),(.97,side*.87,.78),(-.2,side*.78,.68),(-1.45,side*.82,.72),(-.66,side*.87,.56),(.71,side*.84,.58)],(0,side*.026,0),shoulder_paint)
            rod(f"sable canopy spine {side}",(-.75,side*.32,.95),(.42,side*.34,1.03),.025,shoulder_paint,10)
            box(f"sable floating mirror {side}",(.67,side*.55,.80),(.15,.12,.048),carbon,.012)
        for axle_x in (-axle,axle):
            arc=[(axle_x+(arch+.01)*cos(pi*i/16),side*1.035,.43+(arch+.01)*sin(pi*i/16)) for i in range(17)]
            for i in range(16):
                rod(f"{VARIANT} arch lip {axle_x} {side} {i}",arc[i],arc[i+1],.012,shoulder_paint,6)
        nose=2.55 if VARIANT=="vesper" else 2.07
        tail=-2.6 if VARIANT=="vesper" else -2.08
        facet(f"{VARIANT} headlight slash {side}",[(nose,side*.71,.65),(nose+.02,side*.35,.59),(nose+.02,side*.35,.55),(nose,side*.71,.60)],(.01,0,0),ice)
        facet(f"{VARIANT} rear light bar {side}",[(tail,side*.77,.73),(tail-.02,side*.17,.72),(tail-.02,side*.17,.66),(tail,side*.77,.67)],(-.01,0,0),red)
    if VARIANT=="vesper":
        box("vesper low front intake",(2.59,0,.39),(.11,1.30,.20),carbon,.02)
        box("vesper satin front lip",(2.54,0,.23),(.24,1.91,.035),brushed,.01)
        box("vesper split tail deck",(-2.47,0,.92),(.34,1.59,.045),shoulder_paint,.013)
        box("vesper rear diffuser",(-2.64,0,.25),(.38,1.85,.10),carbon,.01)
        for side in (-1,1):
            box(f"vesper split tail fin {side}",(-2.47,side*.76,1.01),(.31,.055,.15),carbon,.01)
    else:
        box("sable pointed intake",(2.11,0,.36),(.12,.72,.18),carbon,.015)
        box("sable forward splitter",(2.04,0,.18),(.34,1.91,.04),carbon,.009)
        box("sable compact raised wing",(-1.86,0,1.22),(.40,2.12,.045),carbon,.01)
        box("sable rear diffuser",(-2.12,0,.23),(.31,1.67,.09),carbon,.008)
        for side in (-1,1):
            rod(f"sable wing stay {side}",(-1.75,side*.62,.72),(-1.9,side*.62,1.2),.034,carbon,8)
            box(f"sable wing endplate {side}",(-1.86,side*1.0,1.22),(.36,.03,.20),carbon,.006)
