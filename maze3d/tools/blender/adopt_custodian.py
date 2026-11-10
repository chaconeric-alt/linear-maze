"""The Custodian from Tripo (actors/source/custodian_tripo.glb): a box of machinery on four legs, bristling with tool arms.
    python3 adopt_custodian.py [preview]      writes actors/custodian_tripo.glb
World axes (keys here are in them): it faces -Y, +Z up, and the bones called L_ are on the -X side.
What Tripo's rigger gave it: a HUMAN skeleton forced onto a machine. So:
  - two of its four legs (the side ones) are real legs: thigh, calf, foot. The front and back legs are each one stiff piece.
  - two of its tool arms (the claws at opposite corners) are real arms with elbows, wrists and working fingers.
  - the other arms are welded to chunks of the body called Spine01, Head and the clavicles: each can only swing as a lump.
  - nothing spins. This script cuts the saw blade free and gives it a bone, so that one does.
Enough for a carnival: everything that can move is given its own rhythm and none of them agree."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'custodian_tripo.glb'), world_axes=True)
a.decimate(0.4)

# the saw: a disc about 0.13 across its radius, centred here, lying in the plane with this normal
SC, SN = (-0.051, -0.050, 0.881), (0.80, -0.58, -0.14)
def on_blade(p):
    d = [p[i] - SC[i] for i in range(3)]
    off = sum(d[i] * SN[i] for i in range(3))
    rad = math.sqrt(max(0.0, sum(x * x for x in d) - off * off))
    return abs(off) < 0.05 and rad < 0.17 and p[2] > 0.70
n = a.split_off('saw', 'Head', on_blade, SC, tuple(SC[i] + SN[i] * 0.1 for i in range(3)))
print('saw blade vertices:', n)

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)
FING = [s + f + '1' for s in ('L_', 'R_') for f in ('Index', 'Mid', 'Ring', 'Pinky', 'Thumb')]


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def spin(L, turns, axis=SN):
    """Whole turns of the saw in a clip of length L (so that it loops)."""
    import mathutils
    out = []
    steps = max(1, int(abs(turns) * 4))
    for i in range(steps + 1):
        q = mathutils.Quaternion(axis, 2 * math.pi * turns * i / steps)
        out.append((L * i / steps, tuple(math.degrees(x) for x in q.to_euler('XYZ'))))
    return out


def carnival(L, amt=1.0, n=24, saw=8):
    """Every arm on its own clock. The multipliers are whole numbers so the clip loops, and coprime so nothing lines up."""
    A = amt
    d = {
        'L_Upperarm': cyc(L, n, lambda p: (22 * A * sn(p * 2), 18 * A * sn(p * 3, 0.2), 30 * A * sn(p, 0.4))),
        'L_Forearm': cyc(L, n, lambda p: (26 * A * sn(p * 3, 0.1), 0, 30 * A * sn(p * 2, 0.3))),
        'L_Hand': cyc(L, n, lambda p: (30 * A * sn(p * 5), 20 * A * sn(p * 4, 0.2), 0)),
        'R_Upperarm': cyc(L, n, lambda p: (24 * A * sn(p * 3, 0.5), 20 * A * sn(p * 2, 0.1), 28 * A * sn(p * 2, 0.7))),
        'R_Forearm': cyc(L, n, lambda p: (30 * A * sn(p * 2, 0.6), 0, 26 * A * sn(p * 5, 0.2))),
        'R_Hand': cyc(L, n, lambda p: (26 * A * sn(p * 4, 0.3), 24 * A * sn(p * 3), 0)),
        'NeckTwist01': cyc(L, n, lambda p: (10 * A * sn(p * 2, 0.3), 8 * A * sn(p * 3), 26 * A * sn(p, 0.15))),     # the saw arm sweeps
        'Head': cyc(L, n, lambda p: (14 * A * sn(p * 3, 0.5), 0, 12 * A * sn(p * 2))),
        'L_Clavicle': cyc(L, n, lambda p: (0, 5 * A * sn(p * 4), 7 * A * sn(p * 3, 0.3))),
        'R_Clavicle': cyc(L, n, lambda p: (0, 5 * A * sn(p * 3, 0.5), 7 * A * sn(p * 5, 0.1))),
        'Spine01': cyc(L, n, lambda p: (0, 0, 7 * A * sn(p, 0.25))),                                                    # the whole top swivels
        'saw': spin(L, saw),
    }
    for i, f in enumerate(FING):                         # claws snapping at nothing
        d[f] = cyc(L, n, lambda p, i=i: (28 * A * sn(p * (4 + i % 3), i * 0.17), 0, 28 * A * sn(p * (5 + i % 2), i * 0.11)))
    return d


# ---- idle: it cannot stop. Quieter, but every tool still tests itself.
a.clip('idle-loop', 2.4, {**carnival(2.4, 0.45, 24, 5), 'Waist': cyc(2.4, 8, lambda p: (Z3, (0, 0, 0.006 * sn(p * 2)))), 'Pelvis': cyc(2.4, 8, lambda p: (Z3, (0, 0, 0.006 * sn(p * 2))))})

# ---- walk: the side legs stride, the body pitches from its front leg to its back one, and the arms never let up.
L = 1.2
walk = carnival(L, 0.9, 24, 6)
rock = lambda p: ((4 * sn(p * 2), 3 * sn(p), 0), (0, 0, 0.012 * abs(sn(p * 2))))
walk['Pelvis'] = cyc(L, 12, rock)
walk['Waist'] = cyc(L, 12, rock)
walk['L_Thigh'] = cyc(L, 12, lambda p: (0, 12 * up(p, 0.25), 18 * sn(p)))
walk['R_Thigh'] = cyc(L, 12, lambda p: (0, -12 * up(p, 0.75), 18 * sn(p)))
walk['L_Calf'] = cyc(L, 12, lambda p: (0, -8 * up(p, 0.25), 0))
walk['R_Calf'] = cyc(L, 12, lambda p: (0, 8 * up(p, 0.75), 0))
a.clip('walk-loop', L, walk)

# ---- attack: everything at once. Both claws come in and shut, the saw arm chops down in front. Lands at about 0.24 s.
atk = carnival(0.6, 0.5, 12, 4)
atk.update({
    'NeckTwist01': [(0, Z3), (0.12, (-22, 0, 0)), (0.24, (40, 0, 0)), (0.4, (26, 0, 0)), (0.6, Z3)],
    'L_Upperarm': [(0, Z3), (0.12, (0, 0, -30)), (0.24, (20, 0, 46)), (0.6, Z3)],
    'R_Upperarm': [(0, Z3), (0.12, (0, 0, 30)), (0.24, (20, 0, -46)), (0.6, Z3)],
    'L_Forearm': [(0, Z3), (0.12, (0, 0, -20)), (0.24, (0, 0, 40)), (0.6, Z3)],
    'R_Forearm': [(0, Z3), (0.12, (0, 0, 20)), (0.24, (0, 0, -40)), (0.6, Z3)],
    'Waist': [(0, Z3, Z3), (0.12, (-5, 0, 0), (0, 0.03, 0)), (0.24, (8, 0, 0), (0, -0.07, -0.02)), (0.6, Z3, Z3)],
    'Pelvis': [(0, Z3, Z3), (0.12, (-5, 0, 0), (0, 0.03, 0)), (0.24, (8, 0, 0), (0, -0.07, -0.02)), (0.6, Z3, Z3)],
})
a.clip('attack', 0.6, atk)

a.clip('hurt', 0.3, {'Spine01': [(0, Z3), (0.1, (-10, 6, 16)), (0.3, Z3)], 'NeckTwist01': [(0, Z3), (0.1, (-26, 0, -20)), (0.3, Z3)],
                     'L_Upperarm': [(0, Z3), (0.1, (0, 40, 0)), (0.3, Z3)], 'R_Upperarm': [(0, Z3), (0.1, (0, -40, 0)), (0.3, Z3)], 'saw': spin(0.3, 1)})

# ---- die: the legs go out from under it, it drops on its belly, and the arms wind down one at a time. The saw is last.
sag = [(0, Z3, Z3), (0.35, (6, 4, 0), (0, 0, -0.16)), (0.6, (-4, 6, 0), (0, 0, -0.27)), (0.7, (-2, 6, 0), (0, 0, -0.25)), (1.6, (-3, 6, 0), (0, 0, -0.27))]
die = {'Pelvis': sag, 'Waist': sag,
       'L_Thigh': [(0, Z3), (0.6, (0, 34, 0)), (1.6, (0, 38, 0))], 'R_Thigh': [(0, Z3), (0.6, (0, -34, 0)), (1.6, (0, -38, 0))],
       'L_Calf': [(0, Z3), (0.6, (0, -30, 0)), (1.6, (0, -34, 0))], 'R_Calf': [(0, Z3), (0.6, (0, 30, 0)), (1.6, (0, 34, 0))],
       'NeckTwist01': [(0, Z3), (0.5, (-20, 0, 20)), (1.1, (30, 0, 30)), (1.6, (44, 0, 30))],
       'L_Upperarm': [(0, Z3), (0.3, (0, 30, 20)), (0.6, (0, -10, -20)), (1.0, (0, -34, 0)), (1.6, (0, -40, 0))],
       'R_Upperarm': [(0, Z3), (0.4, (0, -30, -20)), (0.8, (0, 10, 20)), (1.3, (0, 34, 0)), (1.6, (0, 40, 0))],
       'L_Forearm': [(0, Z3), (0.5, (0, 0, 30)), (1.6, (0, -20, 0))], 'R_Forearm': [(0, Z3), (0.7, (0, 0, -30)), (1.6, (0, 20, 0))],
       'saw': [(t * 1.6, r) for t, r in [(k[0] / 1.6 * (1 - 0.35 * k[0] / 1.6) / 0.65, k[1]) for k in spin(1.6, 3)]]}
a.clip('die', 1.6, die)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/cust', exist_ok=True)
    for nm, t in (('idle-loop', 0.5), ('walk-loop', 0.3), ('walk-loop', 0.8), ('attack', 0.12), ('attack', 0.24), ('die', 1.6)):
        a.preview('/tmp/cust/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.9, -2.3, 1.2), (0, 0, 0.5))
a.export(os.path.join(ROOT, 'actors', 'custodian_tripo.glb'))
print('adopted custodian: clips', a.names)
