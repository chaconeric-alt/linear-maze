"""The Deadbot from Tripo (actors/source/deadbot_tripo.glb, "rusty_robot"): a rusted, gutted man-shaped machine with a
bulb head, clawed hands and big boots, on a Mixamo-named skeleton. A heavy-footed, lumbering stalker.
    python3 adopt_deadbot.py [preview]      writes actors/deadbot_tripo.glb
The file's axes: it faces -Y (the engine's way), +X is its left, +Z up; 0.99 units tall (the def scales it). It comes in
a T pose, arms straight out, so every clip has to bring the arms down. The armature sits turned a quarter in the file,
hence world_axes. The skeleton is a clean humanoid (hips, 3 spine bones, neck, head, shoulders, arms, fingers, legs,
feet, toes); bone names lose their "mixamorig:" prefix because Godot uses ':' in animation paths.
Thinned from 55k to about 24k triangles. Clips are keyed poses written in code; being Mixamo's skeleton, Mixamo's
library animations could replace any of them."""
import sys, math, os
import adopt, bpy
from mathutils import Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'deadbot_tripo.glb'), world_axes=True)
for b in a.ob.data.bones:
    b.name = b.name.replace('mixamorig:', '')
a.decimate(0.44)

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
cs = lambda p, off=0.0: math.cos((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)
rad = math.radians


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def arm(side, down, fwd=0.0, out=0.0):
    """An upper arm, from the T pose: let down `down` degrees from straight out, then swung `fwd` degrees forward
    (- back) and `out` degrees further from the body. side 'L' or 'R'. Returns the key's (rx, ry, rz)."""
    s = 1 if side == 'L' else -1
    m = Matrix.Rotation(rad(-fwd), 3, 'X') @ Matrix.Rotation(rad(s * (down - out)), 3, 'Y')
    return tuple(math.degrees(x) for x in m.to_euler('XYZ'))


def elbow(side, bend):
    """A forearm bent `bend` degrees at the elbow, hand coming forward."""
    return (0, 0, (-bend if side == 'L' else bend))


# Rotations are about the model's axes: rx - a leg swings forward, rx + the body or head tips forward; a shin folds
# back with rx +; rz turns about the vertical; ry rolls the body to one side (+ leans to its right).
# How it stands when it is doing nothing in particular: stooped, head pushed forward, arms hanging a little in front.
STOOP = {'Spine': (9, 0, 0), 'Spine1': (7, 0, 0), 'Spine2': (6, 0, 0), 'Neck': (10, 0, 0), 'Head': (4, 0, 0)}
ARMS = {'LeftArm': arm('L', 78, 8), 'RightArm': arm('R', 78, 8), 'LeftForeArm': elbow('L', 22), 'RightForeArm': elbow('R', 22)}
CLAW = {}
for sd in ('Left', 'Right'):
    for f in ('Index', 'Middle', 'Ring', 'Pinky'):
        CLAW['%sHand%s1' % (sd, f)] = (0, (-28 if sd == 'Left' else 28), 0)       # fingers hooked


def held(L, pose):
    return {b: [(0,) + (v if isinstance(v[0], tuple) else (v,)), (L,) + (v if isinstance(v[0], tuple) else (v,))] for b, v in pose.items()}


# ---- dormant: switched off on its feet. Folded forward at the waist, head hanging, arms dead straight down.
L = 4.0
OFF = {'Hips': ((4, 0, 0), (0, 0, -0.012)), 'Spine': (20, 0, 0), 'Spine1': (16, 0, 0), 'Spine2': (12, 0, 0), 'Neck': (26, 0, 0), 'Head': (22, 0, 4),
       'LeftArm': arm('L', 86, 20), 'RightArm': arm('R', 86, 24), 'LeftForeArm': elbow('L', 4), 'RightForeArm': elbow('R', 4),
       'LeftUpLeg': (-6, 0, 0), 'RightUpLeg': (-6, 0, 0), 'LeftLeg': (8, 0, 0), 'RightLeg': (8, 0, 0)}
dorm = held(L, OFF)
dorm['Head'] = cyc(L, 8, lambda p: (22 + 0.6 * sn(p), 0, 4))            # not quite still: something in it is ticking over
a.clip('dormant-loop', L, dorm)

# ---- startle: the power comes back. A jolt through the spine, the head snaps up last, the hands open and hook.
a.clip('startle', 1.1, {
    'Hips': [(0, (4, 0, 0), (0, 0, -0.012)), (0.25, (6, 0, 0), (0, 0, -0.03)), (0.6, (-2, 0, 0), (0, 0, 0.004)), (1.1, Z3, Z3)],
    'Spine': [(0, (20, 0, 0)), (0.2, (24, 0, -4)), (0.55, (4, 0, 3)), (1.1, (9, 0, 0))],
    'Spine1': [(0, (16, 0, 0)), (0.3, (18, 0, 0)), (0.65, (4, 0, 0)), (1.1, (7, 0, 0))],
    'Spine2': [(0, (12, 0, 0)), (0.4, (12, 0, 0)), (0.75, (2, 0, 0)), (1.1, (6, 0, 0))],
    'Neck': [(0, (26, 0, 0)), (0.5, (28, 0, 0)), (0.8, (-6, 0, 0)), (1.1, (10, 0, 0))],
    'Head': [(0, (22, 0, 4)), (0.55, (24, 0, -8)), (0.8, (-12, 0, 0)), (0.92, (8, 0, 0)), (1.1, (4, 0, 0))],
    'LeftArm': [(0, arm('L', 86, 20)), (0.3, arm('L', 80, 22)), (0.6, arm('L', 60, -6)), (1.1, arm('L', 78, 8))],
    'RightArm': [(0, arm('R', 86, 24)), (0.35, arm('R', 80, 26)), (0.65, arm('R', 62, -6)), (1.1, arm('R', 78, 8))],
    'LeftForeArm': [(0, elbow('L', 4)), (0.6, elbow('L', 50)), (1.1, elbow('L', 22))],
    'RightForeArm': [(0, elbow('R', 4)), (0.65, elbow('R', 50)), (1.1, elbow('R', 22))],
    'LeftUpLeg': [(0, (-6, 0, 0)), (1.1, Z3)], 'RightUpLeg': [(0, (-6, 0, 0)), (1.1, Z3)],
    'LeftLeg': [(0, (8, 0, 0)), (1.1, Z3)], 'RightLeg': [(0, (8, 0, 0)), (1.1, Z3)],
})

# ---- idle: awake and waiting. Stooped, swaying from boot to boot, the head tracking slowly, the claws flexing.
L = 4.0
idle = {
    'Hips': cyc(L, 8, lambda p: ((0, 2.5 * sn(p), 2 * sn(p)), (0.012 * sn(p), 0, -0.006))),
    'Spine': cyc(L, 8, lambda p: (9 + 1.5 * sn(p * 2), -2 * sn(p), 0)), 'Spine1': held(L, {'x': (7, 0, 0)})['x'], 'Spine2': held(L, {'x': (6, 0, 0)})['x'],
    'Neck': held(L, {'x': (10, 0, 0)})['x'],
    'Head': [(0, (4, 0, 0)), (1.0, (6, 0, 22)), (1.8, (6, 0, 22)), (2.6, (2, 0, -18)), (3.4, (2, 0, -18)), (4.0, (4, 0, 0))],
    'LeftArm': cyc(L, 8, lambda p: arm('L', 78, 8 + 3 * sn(p))), 'RightArm': cyc(L, 8, lambda p: arm('R', 78, 8 - 3 * sn(p))),
    'LeftForeArm': cyc(L, 8, lambda p: elbow('L', 22 + 5 * sn(p, 0.2))), 'RightForeArm': cyc(L, 8, lambda p: elbow('R', 22 - 5 * sn(p, 0.2))),
}
for b, v in CLAW.items():
    idle[b] = cyc(L, 8, lambda p, v=v: (0, v[1] * (0.6 + 0.4 * sn(p * 2)), 0))
a.clip('idle-loop', L, idle)

# ---- walk: it lumbers. A long stiff stride; each boot comes down flat and hard and the whole body drops on to it and
# rolls over it, the shoulders swinging the other way, the arms hanging and dragging behind the beat, the head held
# level and fixed on what it is following. Left boot lands at 0.0 of the clip, right at 0.5 (the def's "footfall").
L = 1.5
N = 15
def leg(p):                                          # 0 = this boot lands. (thigh, shin, foot)
    k = [(0.0, -24, 6, 6), (0.12, -16, 14, 0), (0.5, 20, 6, 0), (0.6, 22, 30, 16), (0.76, -14, 58, 6), (0.9, -30, 26, -8), (1.0, -24, 6, 6)]
    for (t0, a0, b0, c0), (t1, a1, b1, c1) in zip(k, k[1:]):
        if p <= t1:
            u = (p - t0) / (t1 - t0)
            return a0 + (a1 - a0) * u, b0 + (b1 - b0) * u, c0 + (c1 - c0) * u
    return k[-1][1:]
drop = lambda p: -0.035 * max(0.0, 1 - abs(((p * 2) % 1) - 0.08) / 0.16) - 0.012      # the body sinks just after each boot lands
walk = {
    'Hips': cyc(L, N, lambda p: ((4, 5 * sn(p, 0.06), 7 * sn(p, 0.25)), (0.022 * sn(p, 0.06), 0, drop(p)))),
    'Spine': cyc(L, N, lambda p: (12 + 3 * up(p * 2, -0.02), -4 * sn(p, 0.06), -5 * sn(p, 0.25))),
    'Spine1': cyc(L, N, lambda p: (8, 0, -4 * sn(p, 0.25))), 'Spine2': cyc(L, N, lambda p: (6, 0, -4 * sn(p, 0.25))),
    'Neck': cyc(L, N, lambda p: (2, 0, 3 * sn(p, 0.25))),
    'Head': cyc(L, N, lambda p: (-6 + 2.5 * up(p * 2, -0.02), -2 * sn(p, 0.06), 3 * sn(p, 0.25))),
    'LeftUpLeg': cyc(L, N, lambda p: (leg(p)[0], -3, 0)), 'LeftLeg': cyc(L, N, lambda p: (leg(p)[1], 0, 0)), 'LeftFoot': cyc(L, N, lambda p: (leg(p)[2], 0, 0)),
    'RightUpLeg': cyc(L, N, lambda p: (leg((p + 0.5) % 1)[0], 3, 0)), 'RightLeg': cyc(L, N, lambda p: (leg((p + 0.5) % 1)[1], 0, 0)),
    'RightFoot': cyc(L, N, lambda p: (leg((p + 0.5) % 1)[2], 0, 0)),
    'LeftArm': cyc(L, N, lambda p: arm('L', 76, 6 - 14 * cs(p, 0.08))), 'RightArm': cyc(L, N, lambda p: arm('R', 76, 6 + 14 * cs(p, 0.08))),
    'LeftForeArm': cyc(L, N, lambda p: elbow('L', 24 - 10 * cs(p, 0.16))), 'RightForeArm': cyc(L, N, lambda p: elbow('R', 24 + 10 * cs(p, 0.16))),
}
for b, v in CLAW.items():
    walk[b] = held(L, {'x': v})['x']
a.clip('walk-loop', L, walk)

# ---- attack: both arms go up and back, it rises on to its toes, and the whole weight comes down. Lands at 0.6 s.
a.clip('attack', 1.25, {
    'Hips': [(0, Z3, Z3), (0.42, (-8, 0, 0), (0, 0.02, 0.02)), (0.6, (16, 0, 0), (0, -0.05, -0.06)), (0.8, (14, 0, 0), (0, -0.05, -0.055)), (1.25, Z3, Z3)],
    'Spine': [(0, (9, 0, 0)), (0.42, (-12, 0, 0)), (0.6, (26, 0, 0)), (0.8, (24, 0, 0)), (1.25, (9, 0, 0))],
    'Spine2': [(0, (6, 0, 0)), (0.42, (-8, 0, 0)), (0.6, (14, 0, 0)), (1.25, (6, 0, 0))],
    'Neck': [(0, (10, 0, 0)), (0.42, (0, 0, 0)), (0.6, (-8, 0, 0)), (1.25, (10, 0, 0))],
    'Head': [(0, (4, 0, 0)), (0.42, (-10, 0, 0)), (0.6, (-14, 0, 0)), (1.25, (4, 0, 0))],
    'LeftArm': [(0, arm('L', 78, 8)), (0.42, arm('L', -62, -10)), (0.6, arm('L', 77, 66)), (0.8, arm('L', 79, 58)), (1.25, arm('L', 78, 8))],
    'RightArm': [(0, arm('R', 78, 8)), (0.42, arm('R', -66, -10)), (0.6, arm('R', 77, 66)), (0.8, arm('R', 79, 58)), (1.25, arm('R', 78, 8))],
    'LeftForeArm': [(0, elbow('L', 22)), (0.42, elbow('L', 64)), (0.6, elbow('L', 8)), (1.25, elbow('L', 22))],
    'RightForeArm': [(0, elbow('R', 22)), (0.42, elbow('R', 64)), (0.6, elbow('R', 8)), (1.25, elbow('R', 22))],
    'LeftUpLeg': [(0, Z3), (0.42, (4, 0, 0)), (0.6, (-34, 0, 0)), (0.8, (-32, 0, 0)), (1.25, Z3)], 'LeftLeg': [(0, Z3), (0.6, (30, 0, 0)), (0.8, (28, 0, 0)), (1.25, Z3)],
    'RightUpLeg': [(0, Z3), (0.42, (6, 0, 0)), (0.6, (-6, 0, 0)), (1.25, Z3)], 'RightLeg': [(0, Z3), (0.6, (22, 0, 0)), (1.25, Z3)],
    'LeftFoot': [(0, Z3), (0.42, (14, 0, 0)), (0.6, (-10, 0, 0)), (1.25, Z3)], 'RightFoot': [(0, Z3), (0.42, (14, 0, 0)), (0.6, (10, 0, 0)), (1.25, Z3)],
})

# ---- swipe: a back-handed rake with the right claw, the body turning into it. Lands at 0.34 s.
a.clip('swipe', 0.85, {
    'Hips': [(0, Z3, Z3), (0.22, (0, 0, -16), Z3), (0.34, (4, 0, 22), (0, -0.02, -0.01)), (0.85, Z3, Z3)],
    'Spine': [(0, (9, 0, 0)), (0.22, (8, 0, -18)), (0.34, (14, 0, 26)), (0.5, (14, 0, 22)), (0.85, (9, 0, 0))],
    'Head': [(0, (4, 0, 0)), (0.22, (4, 0, 20)), (0.34, (2, 0, -20)), (0.85, (4, 0, 0))],
    'RightArm': [(0, arm('R', 78, 8)), (0.22, arm('R', 37, -59)), (0.34, arm('R', 84, 76)), (0.5, arm('R', 102, 68)), (0.85, arm('R', 78, 8))],
    'RightForeArm': [(0, elbow('R', 22)), (0.22, elbow('R', 70)), (0.34, elbow('R', 10)), (0.5, elbow('R', 30)), (0.85, elbow('R', 22))],
    'LeftArm': [(0, arm('L', 78, 8)), (0.3, arm('L', 66, -18)), (0.85, arm('L', 78, 8))], 'LeftForeArm': [(0, elbow('L', 22)), (0.85, elbow('L', 22))],
    'RightUpLeg': [(0, Z3), (0.34, (-22, 0, 0)), (0.85, Z3)], 'RightLeg': [(0, Z3), (0.34, (22, 0, 0)), (0.85, Z3)],
})

a.clip('hurt', 0.35, {
    'Hips': [(0, Z3, Z3), (0.1, (-4, 0, 6), (0, 0.025, 0)), (0.35, Z3, Z3)],
    'Spine': [(0, (9, 0, 0)), (0.1, (-10, 0, 10)), (0.35, (9, 0, 0))], 'Head': [(0, (4, 0, 0)), (0.1, (-16, 0, -16)), (0.35, (4, 0, 0))],
    'LeftArm': [(0, arm('L', 78, 8)), (0.1, arm('L', 56, -14)), (0.35, arm('L', 78, 8))], 'RightArm': [(0, arm('R', 78, 8)), (0.1, arm('R', 60, -8)), (0.35, arm('R', 78, 8))],
    'LeftForeArm': [(0, elbow('L', 22)), (0.35, elbow('L', 22))], 'RightForeArm': [(0, elbow('R', 22)), (0.35, elbow('R', 22))],
})

# ---- die: the power goes. It locks, sags to its knees, hangs there a moment, then goes over on its face.
a.clip('die', 1.9, {
    'Hips': [(0, Z3, Z3), (0.2, (-4, 0, 0), (0, 0, 0.004)), (0.7, (8, 0, 3), (0, -0.05, -0.21)), (1.1, (12, 0, 3), (0, -0.05, -0.215)),
             (1.55, (84, 0, 5), (0, -0.2, -0.385)), (1.68, (80, 0, 5), (0, -0.2, -0.375)), (1.9, (84, 0, 5), (0, -0.2, -0.385))],
    'LeftUpLeg': [(0, Z3), (0.7, (-52, -4, 0)), (1.1, (-56, -4, 0)), (1.55, (-74, -8, 0)), (1.9, (-76, -8, 0))],
    'RightUpLeg': [(0, Z3), (0.7, (-46, 4, 0)), (1.1, (-50, 4, 0)), (1.55, (-80, 10, 0)), (1.9, (-82, 10, 0))],
    'LeftLeg': [(0, Z3), (0.7, (118, 0, 0)), (1.1, (120, 0, 0)), (1.55, (60, 0, 0)), (1.9, (56, 0, 0))],
    'RightLeg': [(0, Z3), (0.7, (112, 0, 0)), (1.1, (114, 0, 0)), (1.55, (40, 0, 0)), (1.9, (36, 0, 0))],
    'LeftFoot': [(0, Z3), (0.7, (30, 0, 0)), (1.9, (40, 0, 0))], 'RightFoot': [(0, Z3), (0.7, (30, 0, 0)), (1.9, (40, 0, 0))],
    'Spine': [(0, (9, 0, 0)), (0.2, (-6, 0, 0)), (0.7, (22, 0, 0)), (1.1, (30, 0, 0)), (1.55, (4, 0, 0)), (1.9, (2, 0, 0))],
    'Spine2': [(0, (6, 0, 0)), (0.7, (14, 0, 0)), (1.1, (18, 0, 0)), (1.55, (0, 0, 0)), (1.9, (0, 0, 0))],
    'Neck': [(0, (10, 0, 0)), (0.2, (-8, 0, 0)), (0.7, (30, 0, 0)), (1.55, (-10, 0, 0)), (1.9, (-14, 0, 0))],
    'Head': [(0, (4, 0, 0)), (0.2, (-10, 0, 0)), (0.7, (26, 0, 6)), (1.55, (-16, 0, 40)), (1.9, (-20, 0, 46))],
    'LeftArm': [(0, arm('L', 78, 8)), (0.2, arm('L', 60, 0)), (0.7, arm('L', 84, 16)), (1.1, arm('L', 84, 20)), (1.55, arm('L', 60, 150)), (1.9, arm('L', 58, 156))],
    'RightArm': [(0, arm('R', 78, 8)), (0.2, arm('R', 60, 0)), (0.7, arm('R', 84, 18)), (1.1, arm('R', 84, 24)), (1.55, arm('R', 66, 20)), (1.9, arm('R', 68, 14))],
    'LeftForeArm': [(0, elbow('L', 22)), (0.7, elbow('L', 6)), (1.55, elbow('L', 34)), (1.9, elbow('L', 38))],
    'RightForeArm': [(0, elbow('R', 22)), (0.7, elbow('R', 6)), (1.9, elbow('R', 10))],
})

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/dead', exist_ok=True)
    for nm, t in (('dormant-loop', 1.0), ('startle', 0.6), ('idle-loop', 1.0), ('walk-loop', 0.0), ('walk-loop', 0.18), ('walk-loop', 0.4), ('walk-loop', 0.6),
                  ('attack', 0.42), ('attack', 0.6), ('swipe', 0.22), ('swipe', 0.34), ('hurt', 0.1), ('die', 0.9), ('die', 1.9)):
        a.preview('/tmp/dead/p_%s_%02d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.3, -1.7, 0.7), (0, -0.15, 0.42), (360, 400))
a.export(os.path.join(ROOT, 'actors', 'deadbot_tripo.glb'))
print('adopted deadbot: clips', a.names, 'tris', sum(len(m.data.polygons) for m in a.meshes))
