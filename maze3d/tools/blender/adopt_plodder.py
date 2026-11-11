"""The Plodder (the book's Heavy Security Drone) from Tripo (actors/source/plodder_tripo.glb): a turret head with one red
eye and a cannon, on four heavy legs.
    python3 adopt_plodder.py [preview]      writes actors/plodder_tripo.glb
Axes: it faces -Y (the cannon points that way), +X is its left, +Z up; 0.79 tall (the def scales it).
Tripo's rigger put a HUMAN skeleton in it: two legs were real limbs, two were welded to lumps of the body, and the cannon
hung off a lump that was also a leg, so the head could not turn with its own gun. None of that can be animated into a
turret that tracks or four legs that march. So this script throws that skeleton away and builds the machine's own:
    body > turret > gun         the turret turns about the vertical, the gun tips up and down
    body > leg_XX_a > leg_XX_b  XX = fl fr bl br; a = hub to knee, b = knee to foot
Every vertex follows exactly one bone (it is a machine: nothing bends). Which bone is decided by where the vertex is."""
import sys, math, os
import adopt
from mathutils import Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'plodder_tripo.glb'))
a.decimate(0.4)

TC = (0.015, 0.04)                                   # the turret's axis
NECK = 0.52                                          # where the turret sits on the body
GUN_OLD = {'R_Upperarm', 'R_Forearm', 'R_Hand'} | {'R_%s%d' % (f, i) for f in ('Index', 'Mid', 'Ring', 'Pinky', 'Thumb') for i in (1, 2, 3)}
QUAD = {(1, -1): 'fl', (-1, -1): 'fr', (1, 1): 'bl', (-1, 1): 'br'}
KNEE_Z, HUB = 0.31, 0.13


def assign(p, old):
    r_t = math.hypot(p[0] - TC[0], p[1] - TC[1])
    if old & GUN_OLD and p[2] > 0.55:
        return 'gun'
    if p[2] > NECK and r_t < 0.29:
        return 'turret'
    if math.hypot(p[0], p[1]) < HUB or (abs(p[0]) < 0.06 and abs(p[1]) < 0.2) or (abs(p[1]) < 0.06 and abs(p[0]) < 0.2):
        return 'body'
    q = QUAD[(1 if p[0] >= 0 else -1, 1 if p[1] >= 0 else -1)]
    return 'leg_%s_%s' % (q, 'b' if p[2] < KNEE_Z else 'a')


bones = [('body', None, (0, 0, 0.36), (0, 0, 0.5)), ('turret', 'body', (TC[0], TC[1], NECK), (TC[0], TC[1], 0.75)),
         ('gun', 'turret', (-0.1, -0.1, 0.665), (-0.1, -0.4, 0.665))]
DIR = {}
for (sx, sy), q in QUAD.items():
    d = (sx * 0.7071, sy * 0.7071)
    DIR[q] = d
    hip, knee, foot = (d[0] * 0.14, d[1] * 0.14, 0.42), (d[0] * 0.36, d[1] * 0.36, 0.34), (d[0] * 0.5, d[1] * 0.5, 0.03)
    bones += [('leg_%s_a' % q, 'body', hip, knee), ('leg_%s_b' % q, 'leg_%s_a' % q, knee, foot)]
a.rerig(bones, assign)
print('vertices per bone:', a.counts)

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)
LEGS = ['fl', 'br', 'fr', 'bl']                      # the order they step in


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def lift(q, deg, yaw=0.0):
    """Raise leg q's outer end by deg (about the level line across it), and swing it yaw degrees about the vertical."""
    d = DIR[q]
    axis = Vector((d[1], -d[0], 0))                  # across the leg: turning about it lifts the knee
    qq = Quaternion((0, 0, 1), math.radians(yaw)) @ Quaternion(axis, math.radians(deg))
    return tuple(math.degrees(x) for x in qq.to_euler('XYZ'))


def stance(L, crouch):
    """Legs spread to let the body down by crouch (0..1)."""
    d = {}
    for q in LEGS:
        d['leg_%s_a' % q] = [(0, lift(q, 16 * crouch)), (L, lift(q, 16 * crouch))]
        d['leg_%s_b' % q] = [(0, lift(q, -20 * crouch)), (L, lift(q, -20 * crouch))]
    return d


# ---- dormant: powered down. Sunk on its legs, the head hung, the gun pointing at the floor in front of it.
L = 4.0
dorm = stance(L, 1.0)
dorm['body'] = [(0, Z3, (0, 0, -0.085)), (L, Z3, (0, 0, -0.085))]
dorm['turret'] = [(0, (14, 0, 0)), (L, (14, 0, 0))]
dorm['gun'] = [(0, (46, 0, 0)), (L, (46, 0, 0))]
a.clip('dormant-loop', L, dorm)

# ---- startle (waking): the legs take the weight, the head comes up and looks one way, then the other; then the engine
# takes the turret and aims it. The last key leaves turret and gun level.
wake = {'body': [(0, Z3, (0, 0, -0.085)), (0.5, (3, 0, 0), (0, 0, -0.03)), (0.8, (-2, 0, 0), (0, 0, 0.012)), (1.2, Z3, Z3)],
        'turret': [(0, (14, 0, 0)), (0.35, (10, 0, 0)), (0.6, (-4, 0, 48)), (0.9, (0, 0, -40)), (1.2, Z3)],
        'gun': [(0, (46, 0, 0)), (0.3, (46, 0, 0)), (0.6, (-8, 0, 0)), (1.2, Z3)]}
for i, q in enumerate(LEGS):
    t0 = 0.1 + i * 0.09
    wake['leg_%s_a' % q] = [(0, lift(q, 16)), (t0, lift(q, 16)), (t0 + 0.2, lift(q, 26)), (t0 + 0.4, lift(q, -3)), (1.2, Z3)]
    wake['leg_%s_b' % q] = [(0, lift(q, -20)), (t0, lift(q, -20)), (t0 + 0.2, lift(q, -34)), (t0 + 0.4, lift(q, 4)), (1.2, Z3)]
a.clip('startle', 1.2, wake)

# ---- idle (awake): standing, hydraulics settling. Turret and gun are NOT keyed: the engine points them.
L = 3.0
idle = {'body': cyc(L, 8, lambda p: ((1.0 * sn(p), 1.0 * sn(p, 0.25), 0), (0, 0, 0.006 * sn(p * 2))))}
for i, q in enumerate(LEGS):
    idle['leg_%s_a' % q] = cyc(L, 8, lambda p, q=q, i=i: lift(q, 1.5 * sn(p * 2, i * 0.25)))
a.clip('idle-loop', L, idle)

# ---- walk: the march. One leg at a time comes up high and comes down hard; the body rolls toward the leg that is
# down. No direction is built in: it reads the same whichever way the thing is going, because it can go any way.
L = 1.6
walk = {}
step = lambda p, i: up((p - i * 0.25) % 1.0 * 2.0) if ((p - i * 0.25) % 1.0) < 0.5 else 0.0      # each leg is in the air for a quarter... half overlap
for i, q in enumerate(LEGS):
    walk['leg_%s_a' % q] = cyc(L, 16, lambda p, q=q, i=i: lift(q, 30 * step(p, i), 9 * math.sin(2 * math.pi * (p - i * 0.25))))
    walk['leg_%s_b' % q] = cyc(L, 16, lambda p, q=q, i=i: lift(q, -38 * step(p, i)))
def sway(p):
    x = sum(DIR[q][0] * step(p, i) for i, q in enumerate(LEGS))
    y = sum(DIR[q][1] * step(p, i) for i, q in enumerate(LEGS))
    return ((-5 * y, 5 * x, 0), (-0.012 * x, -0.012 * y, -0.012 + 0.014 * abs(sn(p * 4))))
walk['body'] = cyc(L, 16, sway)
a.clip('walk-loop', L, walk)

# ---- attack: it sets itself, fires, and the whole machine takes the kick. The gun slides back on its mount.
# The shot leaves at 0.8 s (the def's windup).
atk = {'body': [(0, Z3, Z3), (0.6, (2, 0, 0), (0, 0, -0.03)), (0.8, (2, 0, 0), (0, 0, -0.035)), (0.88, (-5, 0, 0), (0, 0.03, -0.01)), (1.2, Z3, Z3)],
       'gun': [(0, Z3, Z3), (0.8, Z3, Z3), (0.86, (-4, 0, 0), (0, 0.07, 0)), (1.2, Z3, Z3)]}
for q in LEGS:
    atk['leg_%s_a' % q] = [(0, Z3), (0.6, lift(q, 6)), (0.8, lift(q, 7)), (0.88, lift(q, 1)), (1.2, Z3)]
    atk['leg_%s_b' % q] = [(0, Z3), (0.6, lift(q, -8)), (0.8, lift(q, -9)), (1.2, Z3)]
a.clip('attack', 1.2, atk)

a.clip('hurt', 0.3, {'body': [(0, Z3, Z3), (0.08, (-5, 3, 0), (0, 0.02, -0.02)), (0.3, Z3, Z3)]})

# ---- die: the front legs go, it pitches onto its chin, the gun digs in; then the back legs let the rest down.
die = {'body': [(0, Z3, Z3), (0.4, (12, 0, 0), (0, -0.03, -0.1)), (0.7, (16, 3, 0), (0, -0.04, -0.17)), (1.2, (6, 4, 0), (0, -0.02, -0.215)), (1.3, (7, 4, 0), (0, -0.02, -0.21)), (1.7, (6, 4, 0), (0, -0.02, -0.215))],
       'turret': [(0, Z3), (0.5, (10, 0, 0)), (1.2, (16, 6, 0)), (1.7, (18, 6, 0))],
       'gun': [(0, Z3), (0.5, (30, 0, 0)), (1.7, (38, 0, 0))]}
for q in LEGS:
    f = q[0] == 'f'
    t = 0.4 if f else 1.1
    die['leg_%s_a' % q] = [(0, Z3), (t, lift(q, 34)), (1.7, lift(q, 38))]
    die['leg_%s_b' % q] = [(0, Z3), (t, lift(q, -34)), (1.7, lift(q, -30))]
a.clip('die', 1.7, die)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/plod', exist_ok=True)
    a.clip('t_turn', 1.0, {'turret': [(0, Z3), (1.0, (0, 0, 120))], 'gun': [(0, Z3), (1.0, (-20, 0, 0))]})       # only for the picture
    for nm, t in (('dormant-loop', 1.0), ('startle', 0.6), ('walk-loop', 0.2), ('walk-loop', 1.0), ('t_turn', 1.0), ('die', 1.7)):
        a.preview('/tmp/plod/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.7, -2.2, 1.1), (0, 0, 0.4))
    import bpy
    tr = a.ob.animation_data.nla_tracks.get('t_turn')
    if tr:
        a.ob.animation_data.nla_tracks.remove(tr)
a.export(os.path.join(ROOT, 'actors', 'plodder_tripo.glb'))
print('adopted plodder: clips', [n for n in a.names if n != 't_turn'])
