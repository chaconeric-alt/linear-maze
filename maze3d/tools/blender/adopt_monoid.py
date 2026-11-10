"""The Monoid from Tripo (actors/source/monoid_tripo.glb): a lanky one-eyed robot on a Mixamo-named skeleton.
    python3 adopt_monoid.py [preview]      writes actors/monoid_tripo.glb
The file's axes: it faces -Y (the engine's way), +X is its left, +Z up; about 1 unit tall (the def scales it).
The skeleton is a clean humanoid: hips, 3 spine bones, neck, head, shoulders, arms, fingers, legs, feet. (The right
hand has no wrist bone and the right toe no end bone; neither matters.) Bone names lose their "mixamorig:" prefix here,
because Godot uses ':' in animation paths.
These clips are written by hand in code and are stiff. The skeleton is Mixamo's, so Mixamo's own library (walks,
"Leaning", "Sitting", "Smoking") can replace any of them: download the animation as FBX without skin and hand it over."""
import sys, math, os
import adopt, bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'monoid_tripo.glb'))
for b in a.ob.data.bones:
    b.name = b.name.replace('mixamorig:', '')

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
cs = lambda p, off=0.0: math.cos((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def hold(L, pose):
    """A pose held for a whole clip: {bone: rot or (rot, loc)}."""
    return {b: [(0,) + (v if isinstance(v[0], tuple) else (v,)), (L,) + (v if isinstance(v[0], tuple) else (v,))] for b, v in pose.items()}


# Rotations are about the model's axes. Useful ones:  rx -  limb swings forward / body leans back;  rx + the reverse;
# left arm out to the side ry -, right arm ry +;  rz turns about the vertical.
SLOUCH = {'Spine': (7, 0, 0), 'Spine2': (6, 0, 0), 'Neck': (8, 0, 0)}

# ---- idle: bored on its feet. Weight on one leg, the eye wandering, fingers drumming.
L = 4.0
idle = {
    'Hips': cyc(L, 8, lambda p: ((0, 2 * sn(p), 3 * sn(p)), (0.012 * sn(p), 0, -0.004 * abs(sn(p))))),
    'Spine': cyc(L, 8, lambda p: (7 + 1.5 * sn(p * 2), 0, -3 * sn(p))),
    'Spine2': cyc(L, 8, lambda p: (6, 0, 0)),
    'Neck': cyc(L, 8, lambda p: (8, 0, 0)),
    'Head': [(0, (6, 0, 0)), (0.8, (6, 0, 28)), (1.7, (4, 0, 28)), (2.2, (10, 0, -20)), (3.2, (10, 0, -20)), (4.0, (6, 0, 0))],
    'LeftArm': cyc(L, 8, lambda p: (2 * sn(p), -4, 0)), 'RightArm': cyc(L, 8, lambda p: (-2 * sn(p), 4, 0)),
    'LeftForeArm': cyc(L, 8, lambda p: (-10 - 3 * sn(p), 0, 0)), 'RightForeArm': cyc(L, 8, lambda p: (-10 + 3 * sn(p), 0, 0)),
}
for f in ('Index', 'Middle', 'Ring', 'Pinky'):
    idle['LeftHand%s1' % f] = cyc(L, 16, lambda p, k=('Index', 'Middle', 'Ring', 'Pinky').index(f): (-30 * up(p * 4, -k * 0.2) * (1 if p > 0.5 else 0), 0, 0))
a.clip('idle-loop', L, idle)

# ---- walk: it stalks. Each knee comes up too high and hangs there, the body pitched forward over it, the head
# thrust out and swinging to look, the arms held stiff and a little away from the sides. Awkward on purpose.
L = 1.3
def step(p):                                         # 0..1 of one leg: lift, hang, reach, plant, push
    k = [(0.0, -6, 6), (0.18, -58, 86), (0.34, -62, 70), (0.5, -34, 8), (0.62, -22, 4), (1.0, 20, 10)]
    for (t0, a0, b0), (t1, a1, b1) in zip(k, k[1:]):
        if p <= t1:
            u = (p - t0) / (t1 - t0)
            return a0 + (a1 - a0) * u, b0 + (b1 - b0) * u
    return k[-1][1], k[-1][2]
N = 13
walk = {
    'Hips': cyc(L, N, lambda p: ((6, 0, 7 * sn(p)), (0.016 * sn(p), 0, -0.03 + 0.016 * abs(sn(p))))),
    'Spine': cyc(L, N, lambda p: (14 + 3 * sn(p * 2), 0, -6 * sn(p))), 'Spine2': cyc(L, N, lambda p: (8, 0, -4 * sn(p))),
    'Neck': cyc(L, N, lambda p: (-6, 0, 0)), 'Head': cyc(L, N, lambda p: (-10 + 3 * sn(p * 2), 0, 22 * sn(p, 0.1))),
    'LeftUpLeg': cyc(L, N, lambda p: (step(p)[0], -3, 0)), 'LeftLeg': cyc(L, N, lambda p: (step(p)[1], 0, 0)),
    'RightUpLeg': cyc(L, N, lambda p: (step((p + 0.5) % 1)[0], 3, 0)), 'RightLeg': cyc(L, N, lambda p: (step((p + 0.5) % 1)[1], 0, 0)),
    'LeftFoot': cyc(L, N, lambda p: (18 * up(p, -0.05), 0, 0)), 'RightFoot': cyc(L, N, lambda p: (18 * up(p, 0.45), 0, 0)),
    'LeftArm': cyc(L, N, lambda p: (-8 + 5 * sn(p), -14, 0)), 'RightArm': cyc(L, N, lambda p: (-8 - 5 * sn(p), 14, 0)),
    'LeftForeArm': cyc(L, N, lambda p: (-38 + 4 * sn(p, 0.2), 0, 0)), 'RightForeArm': cyc(L, N, lambda p: (-38 - 4 * sn(p, 0.2), 0, 0)),
}
a.clip('walk-loop', L, walk)

# ---- attack: it shoots from the eye. Leans into it, the head snaps with each burst. Fires at about 0.42 s.
a.clip('attack', 0.8, {
    'Hips': [(0, Z3, Z3), (0.3, (0, 0, 0), (0, 0.02, -0.02)), (0.42, (0, 0, 0), (0, -0.015, -0.02)), (0.8, Z3, Z3)],
    'Spine': [(0, (7, 0, 0)), (0.3, (16, 0, 0)), (0.42, (4, 0, 0)), (0.8, (7, 0, 0))],
    'Head': [(0, (6, 0, 0)), (0.3, (14, 0, 0)), (0.42, (-14, 0, 0)), (0.5, (2, 0, 0)), (0.58, (-10, 0, 0)), (0.8, (6, 0, 0))],
    'LeftArm': [(0, (0, -4, 0)), (0.3, (-30, -22, 0)), (0.8, (0, -4, 0))], 'RightArm': [(0, (0, 4, 0)), (0.3, (-30, 22, 0)), (0.8, (0, 4, 0))],
    'LeftForeArm': [(0, (-10, 0, 0)), (0.3, (-60, 0, 0)), (0.8, (-10, 0, 0))], 'RightForeArm': [(0, (-10, 0, 0)), (0.3, (-60, 0, 0)), (0.8, (-10, 0, 0))],
    'LeftLeg': [(0, Z3), (0.3, (14, 0, 0)), (0.8, Z3)], 'LeftUpLeg': [(0, Z3), (0.3, (-10, 0, 0)), (0.8, Z3)],
})
a.clip('hurt', 0.3, {
    'Spine': [(0, (7, 0, 0)), (0.1, (-16, 0, 8)), (0.3, (7, 0, 0))], 'Head': [(0, (6, 0, 0)), (0.1, (-24, 0, -14)), (0.3, (6, 0, 0))],
    'LeftArm': [(0, (0, -4, 0)), (0.1, (-20, -40, 0)), (0.3, (0, -4, 0))], 'RightArm': [(0, (0, 4, 0)), (0.1, (-20, 40, 0)), (0.3, (0, 4, 0))],
    'Hips': [(0, Z3, Z3), (0.1, Z3, (0, 0.03, 0)), (0.3, Z3, Z3)],
})
# ---- die: the knees go, then it folds backwards and lies there with one arm across itself.
a.clip('die', 1.2, {
    'Hips': [(0, Z3, Z3), (0.3, (10, 0, 4), (0, 0, -0.16)), (0.75, (-70, 0, 6), (0, 0.16, -0.44)), (0.9, (-88, 0, 8), (0, 0.2, -0.5)), (1.0, (-84, 0, 8), (0, 0.2, -0.49)), (1.2, (-88, 0, 8), (0, 0.2, -0.5))],
    'LeftUpLeg': [(0, Z3), (0.3, (-50, 0, 0)), (0.9, (-12, -10, 0)), (1.2, (-6, -12, 0))], 'RightUpLeg': [(0, Z3), (0.3, (-40, 0, 0)), (0.9, (-30, 8, 0)), (1.2, (-26, 10, 0))],
    'LeftLeg': [(0, Z3), (0.3, (95, 0, 0)), (0.9, (14, 0, 0)), (1.2, (8, 0, 0))], 'RightLeg': [(0, Z3), (0.3, (80, 0, 0)), (0.9, (50, 0, 0)), (1.2, (46, 0, 0))],
    'Spine': [(0, (7, 0, 0)), (0.3, (20, 0, 0)), (0.9, (-6, 0, 0)), (1.2, (-4, 0, 0))],
    'Head': [(0, (6, 0, 0)), (0.3, (20, 0, 0)), (0.75, (-20, 0, 20)), (1.2, (-6, 0, 34))],
    'LeftArm': [(0, (0, -4, 0)), (0.4, (-40, -50, 0)), (1.2, (10, -70, 0))], 'RightArm': [(0, (0, 4, 0)), (0.4, (-50, 40, 0)), (1.2, (-30, 20, 0))],
    'RightForeArm': [(0, (-10, 0, 0)), (1.2, (-80, 0, 40))],
})

# ---- off duty. The engine backs it up to a wall for lean and smoke, and leaves it where it is for sit.
LEAN = {'Hips': ((-6, 0, 0), (0, 0.05, -0.03)), 'Spine': (-8, 0, 0), 'Spine2': (-4, 0, 0), 'Neck': (12, 0, 0),
        'LeftUpLeg': (-42, 0, 0), 'LeftLeg': (96, 0, 0), 'LeftFoot': (-20, 0, 0),       # one foot up against the wall
        'RightUpLeg': (-10, 0, 0), 'RightLeg': (8, 0, 0)}
FOLDED = {'LeftArm': (6, -5, 0), 'RightArm': (6, 5, 0), 'LeftForeArm': (-26, 0, 0), 'RightForeArm': (-30, 0, 0)}      # hands hanging; folding them needs a longer forearm than it has
L = 5.0
lean = hold(L, {**LEAN, **FOLDED})
lean['Head'] = [(0, (10, 0, 24)), (2.0, (12, 0, 24)), (2.6, (4, 0, -30)), (3.4, (4, 0, -30)), (4.0, (12, 0, 20)), (5.0, (10, 0, 24))]
lean['Spine'] = cyc(L, 8, lambda p: (-8 + 1.2 * sn(p), 0, 0))
a.clip('lean-loop', L, lean)
L = 6.0
smoke = hold(L, {**LEAN, 'LeftArm': (6, -5, 0), 'LeftForeArm': (-26, 0, 0)})
upk = lambda t: max(0.0, min(1.0, (t - 1.5) / 0.7)) * max(0.0, min(1.0, (4.2 - t) / 0.7))        # the hand comes up at 1.5 s, down at 4.2 s
ts = [i * 0.25 for i in range(25)]
smoke['RightArm'] = [(t, (-8 - 52 * upk(t), 6 - 4 * upk(t), 0)) for t in ts]
smoke['RightForeArm'] = [(t, (-24 - 104 * upk(t), 0, 26 * upk(t))) for t in ts]
smoke['Head'] = [(t, (10 - 16 * upk(t), 0, 14 - 20 * upk(t))) for t in ts]
smoke['Spine'] = cyc(L, 8, lambda p: (-8 + 1.2 * sn(p), 0, 0))
a.clip('smoke-loop', L, smoke)
L = 4.0
sit = hold(L, {'Hips': ((0, 0, 0), (0, 0.04, -0.47)), 'LeftUpLeg': (-104, -8, 0), 'RightUpLeg': (-98, 8, 0), 'LeftLeg': (118, 0, 0), 'RightLeg': (110, 0, 0),
               'LeftFoot': (-14, 0, 0), 'RightFoot': (-12, 0, 0), 'Spine2': (10, 0, 0), 'Neck': (10, 0, 0),
               'LeftArm': (-52, -10, 0), 'RightArm': (-52, 10, 0), 'LeftForeArm': (-30, 0, -20), 'RightForeArm': (-30, 0, 20)})
sit['Spine'] = cyc(L, 8, lambda p: (16 + 2 * sn(p), 0, 0))
sit['Head'] = [(0, (18, 0, 0)), (1.6, (26, 0, 0)), (2.0, (30, 0, 0)), (2.3, (8, 0, 0)), (4.0, (18, 0, 0))]       # it nods off, and catches itself
a.clip('sit-loop', L, sit)
a.clip('startle', 0.55, {
    'Hips': [(0, (-6, 0, 0), (0, 0.05, -0.03)), (0.14, (4, 0, 0), (0, -0.02, 0.03)), (0.55, Z3, Z3)],
    'Spine': [(0, (-8, 0, 0)), (0.14, (-14, 0, 0)), (0.55, (7, 0, 0))], 'Head': [(0, (10, 0, 24)), (0.12, (-18, 0, 0)), (0.55, (6, 0, 0))],
    'LeftArm': [(0, (6, -5, 0)), (0.14, (-30, -58, 0)), (0.55, (0, -4, 0))], 'RightArm': [(0, (6, 5, 0)), (0.14, (-30, 58, 0)), (0.55, (0, 4, 0))],
    'LeftForeArm': [(0, (-26, 0, 0)), (0.14, (-40, 0, 0)), (0.55, (-10, 0, 0))], 'RightForeArm': [(0, (-30, 0, 0)), (0.14, (-40, 0, 0)), (0.55, (-10, 0, 0))],
    'LeftUpLeg': [(0, (-42, 0, 0)), (0.2, (0, 0, 0)), (0.55, Z3)], 'LeftLeg': [(0, (96, 0, 0)), (0.2, (10, 0, 0)), (0.55, Z3)],
})

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/monoid', exist_ok=True)
    for nm, t in (('idle-loop', 1.0), ('walk-loop', 0.3), ('attack', 0.42), ('die', 1.2), ('lean-loop', 1.0), ('smoke-loop', 3.0), ('sit-loop', 1.0), ('startle', 0.14)):
        a.preview('/tmp/monoid/p_%s.png' % nm.replace('-loop', ''), nm, t, (1.7, -2.2, 0.9), (0, 0, 0.5))
a.export(os.path.join(ROOT, 'actors', 'monoid_tripo.glb'))
print('adopted monoid: clips', a.names)
