"""The Knife Fighter from Tripo (actors/source/knife_tripo.glb): a small flying ball of hate. A round body with a screen
for a face, a serrated blade on an arm each side, fins on top, and a jointed arm with a claw hand dangling underneath.
    python3 adopt_knife.py [preview]      writes actors/knife_tripo.glb
Axes: the screen faces -Y, +X is its left, +Z up; 1.0 tall from the claw's tips to the fins (the def scales it).
Tripo's rigger gave it a human skeleton with the whole body on the "head" and the blades on fingers. Rebuilt as a machine:
    body > blade_l, blade_r          each swings at its shoulder
    body > arm_a > arm_b > hand      the dangling arm, three links
Every vertex follows one bone, chosen by where it is."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'knife_tripo.glb'))
a.decimate(0.4)


def assign(p, old):
    x, y, z = p
    if z < 0.555 and abs(x) < 0.25:                    # everything under the body is the arm
        return 'hand' if z < 0.2 else ('arm_b' if z < 0.38 else 'arm_a')
    if (abs(x) > 0.265 and z < 0.86) or (abs(x) > 0.33 and z < 0.9 and y < 0.1):
        return 'blade_l' if x > 0 else 'blade_r'
    return 'body'


a.rerig([('body', None, (0, 0, 0.72), (0, 0, 0.9)),
         ('blade_l', 'body', (0.27, -0.02, 0.8), (0.42, -0.02, 0.5)), ('blade_r', 'body', (-0.27, -0.02, 0.8), (-0.42, -0.02, 0.5)),
         ('arm_a', 'body', (0, 0.04, 0.56), (0, 0.04, 0.38)), ('arm_b', 'arm_a', (0, 0.04, 0.38), (0, 0.04, 0.2)), ('hand', 'arm_b', (0, 0.04, 0.2), (0, 0.04, 0.02))], assign)
print('vertices per bone:', a.counts)
import bpy
front = [m.matrix_world @ v.co for m in a.meshes for v in m.data.vertices]
fr = [p for p in front if p[1] < -0.255 and abs(p[0]) < 0.2 and 0.6 < p[2] < 0.9]
print('screen region: x %.2f..%.2f  z %.2f..%.2f  y min %.3f' % (min(p[0] for p in fr), max(p[0] for p in fr), min(p[2] for p in fr), max(p[2] for p in fr), min(p[1] for p in fr)))

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def dangle(L, trail, sway, n=12, rate=1):
    """The arm underneath: trail = how far it streams behind (degrees a link), sway = how much it swings, each link later than the last."""
    return {'arm_a': cyc(L, n, lambda p: (trail + sway * 0.6 * sn(p * rate), sway * sn(p * rate, 0.25), 0)),
            'arm_b': cyc(L, n, lambda p: (trail * 0.8 + sway * sn(p * rate, -0.15), sway * 1.3 * sn(p * rate, 0.1), 0)),
            'hand': cyc(L, n, lambda p: (trail * 0.6 + sway * 1.4 * sn(p * rate, -0.3), sway * 1.6 * sn(p * rate, -0.05), 12 * sn(p * rate * 2)))}


# ---- idle: hovering, never level, the blades flexing like fingers and the arm swinging under it like a plumb line
L = 2.4
idle = dangle(L, 0, 7)
idle['body'] = cyc(L, 12, lambda p: ((3 * sn(p), 4 * sn(p, 0.3), 5 * sn(p * 2, 0.1)), (0, 0, 0.02 * sn(p * 2))))
idle['blade_l'] = cyc(L, 12, lambda p: (-8 * up(p * 3), 5 * sn(p), 0))
idle['blade_r'] = cyc(L, 12, lambda p: (-8 * up(p * 3, 0.5), -5 * sn(p, 0.4), 0))
a.clip('idle-loop', L, idle)

# ---- walk (flying at you): nose down, banking hard one way then the other, blades folded back, the arm streaming behind
L = 0.9
fly = dangle(L, 26, 10, 12, 1)
fly['body'] = cyc(L, 12, lambda p: ((15 + 3 * sn(p * 2), 16 * sn(p), -6 * sn(p)), (0, 0, 0.015 * sn(p * 2))))
fly['blade_l'] = cyc(L, 12, lambda p: (26 + 6 * sn(p * 2), -8, 0))
fly['blade_r'] = cyc(L, 12, lambda p: (26 + 6 * sn(p * 2, 0.5), 8, 0))
a.clip('walk-loop', L, fly)

# ---- attack: both knives cocked back, then driven forward and in, one a hair after the other. Lands at about 0.2 s.
a.clip('attack', 0.45, {
    'body': [(0, Z3, Z3), (0.1, (-10, 0, 0), (0, 0.04, 0.02)), (0.2, (20, 0, 0), (0, -0.1, -0.02)), (0.3, (12, 0, 0), (0, -0.06, 0)), (0.45, Z3, Z3)],
    'blade_l': [(0, Z3), (0.1, (44, -10, 0)), (0.19, (-84, 14, 0)), (0.3, (-60, 10, 0)), (0.45, Z3)],
    'blade_r': [(0, Z3), (0.12, (44, 10, 0)), (0.22, (-84, -14, 0)), (0.32, (-60, -10, 0)), (0.45, Z3)],
    'arm_a': [(0, Z3), (0.1, (-20, 0, 0)), (0.2, (36, 0, 0)), (0.45, Z3)], 'arm_b': [(0, Z3), (0.14, (-24, 0, 0)), (0.26, (40, 0, 0)), (0.45, Z3)],
    'hand': [(0, Z3), (0.18, (-30, 0, 0)), (0.32, (46, 0, 40)), (0.45, Z3)]})
a.clip('hurt', 0.28, {'body': [(0, Z3, Z3), (0.08, (-24, 12, 30), (0, 0.05, 0.03)), (0.28, Z3, Z3)],
                      'blade_l': [(0, Z3), (0.08, (20, -30, 0)), (0.28, Z3)], 'blade_r': [(0, Z3), (0.08, (20, 30, 0)), (0.28, Z3)],
                      'hand': [(0, Z3), (0.1, (-40, 20, 0)), (0.28, Z3)]})
# ---- die: it spins out, drops like a stone and lies on its face with the knives splayed. The def's "die_drop" is how far.
DROP = -1.05
a.clip('die', 1.0, {
    'body': [(0, Z3, Z3), (0.2, (30, 40, 120), (0, 0, 0.04)), (0.45, (80, 20, 300), (0, -0.05, DROP * 0.5)), (0.62, (96, 8, 400), (0, -0.08, DROP)), (0.7, (88, 8, 410), (0, -0.08, DROP + 0.04)), (0.8, (96, 8, 412), (0, -0.08, DROP)), (1.0, (96, 8, 412), (0, -0.08, DROP))],
    'blade_l': [(0, Z3), (0.3, (30, -40, 0)), (0.62, (10, -60, 0)), (1.0, (14, -64, 0))], 'blade_r': [(0, Z3), (0.3, (30, 40, 0)), (0.62, (10, 60, 0)), (1.0, (14, 64, 0))],
    'arm_a': [(0, Z3), (0.4, (50, 0, 0)), (0.62, (-70, 10, 0)), (1.0, (-80, 10, 0))], 'arm_b': [(0, Z3), (0.5, (40, 0, 0)), (0.7, (-20, 0, 0)), (1.0, (-14, 0, 0))],
    'hand': [(0, Z3), (0.62, (30, 0, 0)), (1.0, (-10, 0, 20))]})

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/knife', exist_ok=True)
    for nm, t in (('idle-loop', 0.6), ('walk-loop', 0.22), ('attack', 0.1), ('attack', 0.2)):
        a.preview('/tmp/knife/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.5, -2.0, 1.0), (0, 0, 0.55))
a.export(os.path.join(ROOT, 'actors', 'knife_tripo.glb'))
print('adopted knife: clips', a.names)
