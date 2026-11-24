"""The Collections Division: the five robots of HaveNot's first danger set (the dressing doc, 23 Nov), code-built and
rigged like the rest (actors2.Build). The Bailiff, the Foreclosure Unit, the Garnisher, the Auditor and the Liquidator.
All face Blender's front view (-Y); sizes are real metres, so their defs need no scale. Flyers are built at the height
they fly (their def's `center`)."""
import math
from actors import cyc, sn
from actors2 import Build, K


# ---------------------------------------------------------------- the Bailiff
def bailiff():
    """A collections enforcer a head taller than you, all shoulders, behind a riot shield it never lowers. The shield is
    on its left arm and covers its front; the short shotgun on its right pokes round the shield's edge. Its back is
    plain plate: that is where to shoot it."""
    b = Build('bailiff')
    b.bone('body', (0, 0.05, 0.95), (0, 0.05, 1.75))
    b.bone('head', (0, 0, 1.78), (0, -0.05, 2.08), 'body')
    m = b.on('body')
    m.box((0.95, 0.6, 0.72), at=(0, 0.02, 1.42), mat='hull_dark', bevel=0.1)              # the chest
    m.box((1.3, 0.58, 0.22), at=(0, 0.02, 1.74), mat='hull', bevel=0.08)                  # the yoke over the shoulders
    m.box((0.62, 0.46, 0.34), at=(0, 0.05, 1.0), mat='trim', bevel=0.06)                  # the waist
    m.box((0.5, 0.05, 0.3), at=(0, -0.29, 1.42), mat='hazard', bevel=0.02)                # the badge plate
    m.box((0.36, 0.02, 0.05), at=(0, -0.32, 1.5), mat='eye_red')                          # the warrant light
    m.box((0.72, 0.22, 0.52), at=(0, 0.36, 1.42), mat='trim', bevel=0.05)                 # the power pack on its back
    for k in range(3):
        m.cyl(0.05, 0.3, at=(-0.2 + k * 0.2, 0.46, 1.78), mat='hull_dark', seg=8)
    m = b.on('head')
    m.box((0.36, 0.38, 0.3), at=(0, -0.02, 1.9), mat='hull', bevel=0.08)
    m.box((0.42, 0.44, 0.07), at=(0, -0.02, 2.06), mat='hull_dark', bevel=0.02)           # the helmet's brim
    m.box((0.3, 0.06, 0.06), at=(0, -0.21, 1.92), mat='eye_red')                          # the visor slit
    m.box((0.2, 0.06, 0.1), at=(0, -0.2, 1.8), mat='trim', bevel=0.02)                    # the grille
    for s in (-1, 1):
        b.leg('leg_%s' % ('l' if s > 0 else 'r'), (s * 0.28, 0.05, 0.92), (s * 0.33, -0.14, 0.48), (s * 0.33, 0.05, 0.0), r=(0.13, 0.1),
              mats=('hull_dark', 'trim'), kind='under', phase=0 if s > 0 else 0.5, pad=0.2)
    b.bone('arm_l', (0.7, 0, 1.7), (0.6, -0.45, 1.3), 'body')                             # the shield arm (its left: +X)
    m = b.on('arm_l')
    m.ball(0.18, at=(0.7, 0, 1.7), mat='trim', seg=10)
    m.tube([(0.7, 0, 1.7), (0.76, -0.2, 1.38), (0.55, -0.48, 1.28)], 0.1, mat='hull_dark', seg=8)
    m.box((1.12, 0.1, 1.5), at=(0.12, -0.62, 1.15), mat='hull', bevel=0.05)               # the riot shield
    m.box((1.12, 0.03, 0.12), at=(0.12, -0.68, 1.68), mat='hazard')
    m.box((1.12, 0.03, 0.12), at=(0.12, -0.68, 0.62), mat='hazard')
    m.box((0.5, 0.03, 0.1), at=(0.12, -0.685, 1.45), mat='glass')                         # the viewing slot
    m.box((0.6, 0.025, 0.05), at=(0.12, -0.69, 1.2), mat='glow_red')                       # COLLECTIONS, in lamp
    b.bone('arm_r', (-0.7, 0, 1.7), (-0.62, -0.5, 1.28), 'body')                           # the gun arm
    m = b.on('arm_r')
    m.ball(0.18, at=(-0.7, 0, 1.7), mat='trim', seg=10)
    m.tube([(-0.7, 0, 1.7), (-0.76, -0.16, 1.36), (-0.64, -0.42, 1.26)], 0.1, mat='hull_dark', seg=8)
    m.box((0.17, 0.5, 0.18), at=(-0.66, -0.62, 1.26), mat='trim', bevel=0.03)
    for k in (-1, 1):
        m.cyl(0.045, 0.52, at=(-0.66 + k * 0.05, -1.0, 1.28), rot=(90, 0, 0), mat='chrome', seg=8)
    bash = {'arm_l': K((0, (0, 0, 0), (0, 0, 0)), (0.25, (0, 0, 0), (0, 0.16, 0)), (0.38, (0, 0, 0), (0, -0.5, 0.05)), (0.8, (0, 0, 0), (0, 0, 0))),
            'body': K((0, (0, 0, 0), (0, 0, 0)), (0.25, (6, 0, 8), (0, 0.08, 0)), (0.38, (-10, 0, -6), (0, -0.3, 0)), (0.8, (0, 0, 0), (0, 0, 0))),
            'arm_r': K((0, (0, 0, 0), (0, 0, 0)), (0.38, (0, 0, 0), (0, -0.1, 0)), (0.8, (0, 0, 0), (0, 0, 0)))}
    return b.finish(idle=2.6, walk=0.9, bob=0.03, swing=22, lift=20, attack=bash, attack_len=0.8, die='drop', drop=0.5, die_len=1.0, lean=4,
                    idle_extra={'head': cyc(2.6, 8, lambda p: (0, 0, 14 * sn(p)))})


# ---------------------------------------------------------------- the Foreclosure Unit
def foreclosure():
    """A walking strongroom: a squat vault on six crab legs, its door to the front with a red padlock lit in it, a bolt
    gun on top, and a rack of mines on its back that it lays as it goes."""
    b = Build('foreclosure')
    Z = 1.0
    b.bone('body', (0, 0.4, Z), (0, -0.4, Z))
    b.bone('gun', (0, -0.1, Z + 0.62), (0, -0.7, Z + 0.62), 'body')
    m = b.on('body')
    m.box((1.4, 1.3, 0.9), at=(0, 0, Z), mat='trim', bevel=0.1)                           # the strongroom
    m.box((1.0, 0.08, 0.7), at=(0, -0.68, Z), mat='hull_dark', bevel=0.04)                # its door
    for k in range(4):
        m.cyl(0.03, 0.06, at=(0.42, -0.73, Z - 0.25 + k * 0.17), rot=(90, 0, 0), mat='chrome', seg=6)       # hinge pins
    m.ring(0.16, 0.03, at=(0, -0.73, Z + 0.02), rot=(90, 0, 0), mat='chrome', seg=16, tseg=5)                # the wheel
    m.box((0.14, 0.04, 0.16), at=(0, -0.735, Z + 0.02), mat='glow_red')                                       # the padlock, lit
    m.ring(0.06, 0.018, at=(0, -0.735, Z + 0.12), rot=(90, 0, 0), mat='glow_red', seg=10, tseg=4)
    for s in (-1, 1):
        m.box((0.05, 1.32, 0.12), at=(s * 0.7, 0, Z + 0.3), mat='hazard')
    m.box((1.0, 0.7, 0.14), at=(0, 0.25, Z + 0.52), mat='hull_dark', bevel=0.03)          # the mine rack
    for i in range(2):
        for k in range(3):
            m.cyl(0.13, 0.06, at=(-0.3 + k * 0.3, 0.07 + i * 0.36, Z + 0.62), mat='hull', seg=12)
            m.cyl(0.03, 0.02, at=(-0.3 + k * 0.3, 0.07 + i * 0.36, Z + 0.66), mat='glow_red', seg=6)
    m = b.on('gun')
    m.cyl(0.18, 0.16, at=(0, -0.15, Z + 0.58), mat='hull_dark', seg=12)
    m.box((0.2, 0.42, 0.16), at=(0, -0.38, Z + 0.66), mat='trim', bevel=0.03)
    m.cyl(0.04, 0.4, at=(0, -0.75, Z + 0.68), rot=(90, 0, 0), mat='chrome', seg=8)
    for i, (sx, sy) in enumerate(((1, -0.45), (1, 0.05), (1, 0.5), (-1, -0.45), (-1, 0.05), (-1, 0.5))):
        b.leg('leg%d' % (i + 1), (sx * 0.62, sy, Z - 0.2), (sx * 1.1, sy * 1.3, Z + 0.25), (sx * 1.35, sy * 1.5, 0.0), r=(0.07, 0.04),
              mats=('hull_dark', 'trim'), joint='hazard', phase=(i % 2) * 0.5 + (i // 3) * 0.25)
    shoot = {'gun': K((0, (0, 0, 0), (0, 0, 0)), (0.1, (0, 0, 0), (0, 0.1, 0)), (0.2, (0, 0, 0), (0, 0, 0)), (0.3, (0, 0, 0), (0, 0.1, 0)), (0.5, (0, 0, 0), (0, 0, 0))),
             'body': K((0, (0, 0, 0), (0, 0, 0)), (0.2, (4, 0, 0), (0, 0.04, -0.06)), (0.5, (0, 0, 0), (0, 0, 0)))}
    return b.finish(idle=2.0, walk=0.7, bob=0.04, swing=20, lift=24, attack=shoot, attack_len=0.5, die='collapse', drop=0.75, die_len=0.9,
                    idle_extra={'gun': cyc(2.0, 8, lambda p: (0, 0, 25 * sn(p)))})


# ---------------------------------------------------------------- the Garnisher
def garnisher():
    """A fist-sized collector on two little rotors: a brass purse of a body with a coin slot for a mouth, one cyan eye,
    and two grabbing claws underneath. Built at the height it flies (1.5 m)."""
    b = Build('garnisher')
    Z = 1.5
    b.bone('body', (0, 0.1, Z), (0, -0.15, Z))
    m = b.on('body')
    m.ball(0.2, at=(0, 0, Z), mat='brass', seg=14, scale=(1.1, 1.0, 0.85))
    m.box((0.18, 0.04, 0.025), at=(0, -0.19, Z - 0.03), mat='hull_dark')                  # the coin slot
    m.cyl(0.06, 0.05, at=(0, -0.18, Z + 0.07), rot=(90, 0, 0), mat='hull_dark', seg=10)
    m.cyl(0.04, 0.02, at=(0, -0.21, Z + 0.07), rot=(90, 0, 0), mat='glow_cyan', seg=10)    # the eye
    m.box((0.3, 0.12, 0.06), at=(0, 0.1, Z - 0.14), mat='canvas', bevel=0.02)             # the pouch it fills
    rot = {}
    for s in (-1, 1):
        m = b.on('body')
        m.tube([(s * 0.12, 0, Z + 0.12), (s * 0.24, 0, Z + 0.2)], 0.015, mat='trim', seg=5)
        n = 'rotor_%s' % ('l' if s > 0 else 'r')
        b.bone(n, (s * 0.24, 0, Z + 0.2), (s * 0.24, 0, Z + 0.3), 'body')
        m = b.on(n)
        m.cyl(0.02, 0.04, at=(s * 0.24, 0, Z + 0.22), mat='hull_dark', seg=6)
        for k in range(3):
            m.box((0.26, 0.04, 0.006), at=(s * 0.24, 0, Z + 0.24), rot=(0, 0, k * 60), mat='chrome')
        rot[n] = s
        c = 'claw_%s' % ('l' if s > 0 else 'r')
        b.bone(c, (s * 0.08, -0.05, Z - 0.12), (s * 0.1, -0.2, Z - 0.3), 'body')
        m = b.on(c)
        m.tube([(s * 0.08, -0.05, Z - 0.12), (s * 0.11, -0.14, Z - 0.24), (s * 0.06, -0.22, Z - 0.3)], lambda t: 0.018 * (1 - t * 0.5), mat='chrome', seg=5)
    spin = lambda L, n: {r_: cyc(L, 12, lambda p, s=s: (0, 0, s * 360 * n * p)) for r_, s in rot.items()}
    grab = {'claw_l': K((0, (0, 0, 0)), (0.15, (0, 0, -25)), (0.3, (0, 0, 15)), (0.5, (0, 0, 0))),
            'claw_r': K((0, (0, 0, 0)), (0.15, (0, 0, 25)), (0.3, (0, 0, -15)), (0.5, (0, 0, 0))),
            'body': K((0, (0, 0, 0), (0, 0, 0)), (0.3, (-12, 0, 0), (0, -0.12, 0)), (0.5, (0, 0, 0), (0, 0, 0)))}
    grab.update(spin(0.5, 6))
    return b.finish(idle=0.6, walk=0.4, bob=0.04, attack=grab, attack_len=0.5, die='drop', drop=1.35, die_len=0.7,
                    idle_extra=spin(0.6, 6), walk_extra=spin(0.4, 6), lean=-10)


# ---------------------------------------------------------------- the Auditor
def auditor():
    """A floating lens: a white disc with one great red lens in it, stabiliser fins, a ring of tally counters round its
    rim, and a long antenna. It keeps its distance and paints you with a line before it fires. Built at 1.8 m."""
    b = Build('auditor')
    Z = 1.8
    b.bone('body', (0, 0.2, Z), (0, -0.3, Z))
    b.bone('ring', (0, 0, Z), (0, 0, Z + 0.2), 'body')
    m = b.on('body')
    m.lathe([(0.0, -0.22), (0.4, -0.12), (0.46, 0.0), (0.4, 0.12), (0.0, 0.2)], at=(0, 0.05, Z), rot=(90, 0, 0), mat='hull', seg=24)   # the disc, face on
    m.cyl(0.24, 0.1, at=(0, -0.2, Z), rot=(90, 0, 0), mat='hull_dark', seg=20)
    m.ball(0.2, at=(0, -0.24, Z), mat='glass', seg=16, scale=(1, 0.5, 1))                 # the lens
    m.ball(0.1, at=(0, -0.3, Z), mat='eye_red', seg=12, scale=(1, 0.4, 1))
    m.cyl(0.015, 0.7, at=(0.15, 0.25, Z + 0.55), rot=(-10, 0, 0), mat='chrome', seg=5)
    m.ball(0.035, at=(0.15, 0.31, Z + 0.9), mat='glow_red', seg=6)
    for s in (-1, 1):                                      # stabiliser fins
        m.prism([(0, -0.15), (0.35, -0.05), (0.35, 0.1), (0, 0.2)], 0.03, at=(s * 0.42, 0.1, Z - 0.015), rot=(0, 0, 0 if s > 0 else 180), mat='hull_dark')
    m.prism([(-0.1, 0), (0.1, 0), (0.04, -0.4), (-0.04, -0.4)], 0.03, at=(0, 0.12, Z - 0.42), rot=(90, 0, 0), mat='hull_dark')        # the keel
    m = b.on('ring')
    m.ring(0.5, 0.025, at=(0, 0.05, Z), rot=(90, 0, 0), mat='trim', seg=28, tseg=5)
    for k in range(8):                                     # tally counters
        a = 2 * math.pi * k / 8
        m.box((0.07, 0.06, 0.05), at=(0.5 * math.cos(a), 0.05, Z + 0.5 * math.sin(a)), rot=(0, -math.degrees(a), 0), mat='hull_dark')
        m.box((0.04, 0.01, 0.025), at=(0.5 * math.cos(a), 0.017, Z + 0.5 * math.sin(a)), rot=(0, -math.degrees(a), 0), mat='glow_amber')
    turn = lambda L, n: {'ring': cyc(L, 12, lambda p: (0, 360 * n * p, 0))}
    aim = {'body': K((0, (0, 0, 0), (0, 0, 0)), (0.6, (0, 0, 0), (0, 0.15, 0)), (1.6, (0, 0, 0), (0, 0.15, 0)), (1.75, (-8, 0, 0), (0, 0.3, 0)), (2.0, (0, 0, 0), (0, 0, 0)))}
    aim.update(turn(2.0, 3))
    return b.finish(idle=3.0, walk=1.5, bob=0.06, attack=aim, attack_len=2.0, die='drop', drop=1.6, die_len=1.0,
                    idle_extra=turn(3.0, 1), walk_extra=turn(1.5, 1), lean=-6)


# ---------------------------------------------------------------- the Liquidator
def liquidator():
    """The Collections Division's keeper: a walking incinerator three metres tall. Two fuel tanks on its back, a
    flamethrower for a right arm with a pilot light always lit, a four-tube rocket pod for a left, a smokestack, and a
    furnace door in its belly that glows."""
    b = Build('liquidator')
    b.bone('body', (0, 0.05, 1.3), (0, 0.05, 2.5))
    b.bone('head', (0, -0.1, 2.55), (0, -0.25, 2.8), 'body')
    m = b.on('body')
    m.box((1.5, 1.0, 1.1), at=(0, 0.05, 1.9), mat='hull_dark', bevel=0.14)                # the furnace body
    m.box((1.7, 0.9, 0.3), at=(0, 0.05, 2.48), mat='accent', bevel=0.1)                   # the shoulders, safety orange
    m.box((0.9, 0.7, 0.45), at=(0, 0.1, 1.28), mat='trim', bevel=0.08)
    m.box((0.62, 0.06, 0.5), at=(0, -0.47, 1.82), mat='trim', bevel=0.03)                 # the furnace door
    for k in range(4):
        m.box((0.5, 0.02, 0.05), at=(0, -0.505, 1.66 + k * 0.1), mat='glow_amber')
    for s in (-1, 1):                                      # the fuel tanks
        m.cyl(0.26, 1.2, at=(s * 0.38, 0.72, 2.0), mat='accent', seg=14)
        m.ball(0.26, at=(s * 0.38, 0.72, 2.6), mat='accent', seg=14, scale=(1, 1, 0.6))
        m.ball(0.26, at=(s * 0.38, 0.72, 1.4), mat='accent', seg=14, scale=(1, 1, 0.6))
        for z in (1.7, 2.3):
            m.ring(0.27, 0.03, at=(s * 0.38, 0.72, z), mat='hazard', seg=16, tseg=4)
    m.cyl(0.12, 0.8, at=(-0.45, 0.2, 3.0), mat='trim', seg=10)                            # the smokestack
    m.cyl(0.15, 0.1, at=(-0.45, 0.2, 3.42), mat='hull_dark', seg=10)
    m = b.on('head')
    m.box((0.5, 0.5, 0.36), at=(0, -0.15, 2.72), mat='hull', bevel=0.08)
    m.box((0.42, 0.06, 0.08), at=(0, -0.41, 2.74), mat='glow_amber')
    for s in (-1, 1):
        b.leg('leg_%s' % ('l' if s > 0 else 'r'), (s * 0.4, 0.1, 1.15), (s * 0.5, -0.2, 0.6), (s * 0.5, 0.1, 0.0), r=(0.18, 0.14),
              mats=('hull_dark', 'trim'), joint='accent', kind='under', phase=0 if s > 0 else 0.5, pad=0.3)
    b.bone('arm_r', (-0.95, 0, 2.35), (-0.9, -0.7, 1.9), 'body')                           # the flamethrower
    m = b.on('arm_r')
    m.ball(0.24, at=(-0.95, 0, 2.35), mat='accent', seg=10)
    m.tube([(-0.95, 0, 2.35), (-1.02, -0.2, 1.95), (-0.92, -0.55, 1.85)], 0.15, mat='hull_dark', seg=8)
    m.cyl(0.13, 0.7, at=(-0.92, -0.9, 1.85), rot=(90, 0, 0), mat='trim', seg=10, r2=0.09)
    m.cyl(0.11, 0.1, at=(-0.92, -1.27, 1.85), rot=(90, 0, 0), mat='hull_dark', seg=10)
    m.ball(0.05, at=(-0.92, -1.33, 1.78), mat='glow_amber', seg=8)                        # the pilot light
    b.bone('arm_l', (0.95, 0, 2.35), (0.9, -0.7, 2.0), 'body')                             # the rocket pod
    m = b.on('arm_l')
    m.ball(0.24, at=(0.95, 0, 2.35), mat='accent', seg=10)
    m.tube([(0.95, 0, 2.35), (1.04, -0.2, 2.0), (0.95, -0.45, 1.95)], 0.15, mat='hull_dark', seg=8)
    m.box((0.5, 0.7, 0.5), at=(0.95, -0.72, 2.0), mat='hull_dark', bevel=0.05)
    for i in range(2):
        for k in range(2):
            m.cyl(0.08, 0.06, at=(0.83 + k * 0.24, -1.07, 1.88 + i * 0.24), rot=(90, 0, 0), mat='hazard', seg=10)
            m.cyl(0.055, 0.04, at=(0.83 + k * 0.24, -1.1, 1.88 + i * 0.24), rot=(90, 0, 0), mat='rubber', seg=10)
    burn = {'arm_r': K((0, (0, 0, 0), (0, 0, 0)), (0.2, (-10, 0, 0), (0, 0.1, 0)), (0.3, (0, 0, 0), (0, -0.05, 0)), (0.45, (2, 0, 0), (0, 0.05, 0)),
                       (0.6, (-2, 0, 0), (0, -0.05, 0)), (0.8, (0, 0, 0), (0, 0, 0))),
            'body': K((0, (0, 0, 0), (0, 0, 0)), (0.3, (-4, 0, 8), (0, 0, 0)), (0.8, (0, 0, 0), (0, 0, 0)))}
    return b.finish(idle=3.0, walk=1.1, bob=0.05, swing=20, lift=18, attack=burn, attack_len=0.8, die='drop', drop=0.9, die_len=1.4, lean=4,
                    idle_extra={'head': cyc(3.0, 8, lambda p: (0, 0, 18 * sn(p)))})


ACTORS_COLLECTIONS = {'bailiff': bailiff, 'foreclosure': foreclosure, 'garnisher': garnisher, 'auditor': auditor, 'liquidator': liquidator}
