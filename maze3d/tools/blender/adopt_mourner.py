"""The Mourner from Tripo (actors/source/mourner_tripo.glb): a ghost of a machine. A tattered shroud hung over a rack of
pipes and glass, a mask for a face, a violet energy core in the chest, and two long skeletal arms under the cloth.
    python3 adopt_mourner.py [preview]      writes actors/mourner_tripo.glb
Axes: the mask faces -Y, +X is its left, +Z up; 0.99 tall, 0.74 across the hands, only 0.2 deep (the def scales it).
Tripo's rigger made 110 bones of it and none of them useful, so they are thrown away. The new skeleton, with every vertex
SHARED between bones by where it is (it is cloth: it should bend, not hinge):
    body                      the machine and the shroud over its shoulders
    body > head               the mask and hood
    body > arm_l_a > arm_l_b  shoulder to elbow, elbow to fingertips, and the sleeve of shroud that hangs on them (and _r_)
    body > tat_0_a > tat_0_b  the hanging tatters, in five columns across (0 = its right ... 4 = its left), each in two lengths
Clips move the body, head and arms only. The tatters are left to the ENGINE (defs: "trail"): they stream out behind it as
it moves and swing through when it turns or stops."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'mourner_tripo.glb'))
a.decimate(0.42)

COLS = [-0.22, -0.11, 0.0, 0.11, 0.22]
sstep = lambda x: max(0.0, min(1.0, x))
SH, EL, HA = (0.16, 0.0, 0.76), (0.255, 0.0, 0.56), (0.35, 0.0, 0.36)      # left shoulder, elbow, hand (mirror x for the right)


def assign(p, old):
    x, y, z = p
    ax = abs(x)
    s = 'l' if x >= 0 else 'r'
    w = {}
    # how much of an arm it is: outside a line that runs from the shoulder out to the hand
    edge = 0.13 + (0.78 - z) * 0.30
    arm = sstep((ax - edge) / 0.05) * sstep((z - 0.27) / 0.06) * sstep((0.82 - z) / 0.05)
    if arm > 0:
        lower = sstep((0.60 - z) / 0.08)                 # below the elbow
        w['arm_%s_a' % s] = arm * (1 - lower)
        w['arm_%s_b' % s] = arm * lower
    rest = 1 - arm
    # tatters: the hanging cloth. The machine down the middle of the front stays with the body.
    machine = sstep((0.13 - ax) / 0.03) * sstep((0.03 - y) / 0.03)
    tat = rest * (1 - machine) * sstep((0.50 - z) / 0.14)
    if tat > 0:
        low = sstep((0.26 - z) / 0.10)
        f = (x - COLS[0]) / (COLS[1] - COLS[0])
        k0 = int(max(0, min(len(COLS) - 2, math.floor(f))))
        t = sstep(f - k0)
        for k, wk in ((k0, 1 - t), (k0 + 1, t)):
            w['tat_%d_a' % k] = w.get('tat_%d_a' % k, 0) + tat * wk * (1 - low)
            w['tat_%d_b' % k] = w.get('tat_%d_b' % k, 0) + tat * wk * low
    rest -= tat
    head = rest * sstep((z - 0.80) / 0.06)
    w['head'] = head
    w['body'] = rest - head
    return {k: v for k, v in w.items() if v > 0.004}


bones = [('body', None, (0, 0, 0.45), (0, 0, 0.75)), ('head', 'body', (0, 0, 0.82), (0, 0, 0.98))]
for s, sg in (('l', 1), ('r', -1)):
    m = lambda p: (p[0] * sg, p[1], p[2])
    bones += [('arm_%s_a' % s, 'body', m(SH), m(EL)), ('arm_%s_b' % s, 'arm_%s_a' % s, m(EL), m(HA))]
for k, cx in enumerate(COLS):
    bones += [('tat_%d_a' % k, 'body', (cx, 0.03, 0.46), (cx, 0.03, 0.26)), ('tat_%d_b' % k, 'tat_%d_a' % k, (cx, 0.03, 0.26), (cx, 0.03, 0.04))]
a.rerig(bones, assign)
print('vertices per bone:', {k: v for k, v in sorted(a.counts.items())})

Z3 = (0, 0, 0)
sn = lambda p: math.sin(p * 2 * math.pi)


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def arms(pose_l, fore_l, pose_r=None, fore_r=None):
    """Both arms from the LEFT arm's angles: the right one is the mirror image unless given."""
    mir = lambda r: (r[0], -r[1], -r[2])
    return {'arm_l_a': pose_l, 'arm_l_b': fore_l, 'arm_r_a': pose_r if pose_r is not None else mir(pose_l), 'arm_r_b': fore_r if fore_r is not None else mir(fore_l)}


HANG = arms(Z3, Z3)
WIDE = arms((-35, -20, 62), (-10, 0, 20))            # flung out and up to either side
CORE = arms((-78, 0, -30), (0, 0, -62))              # both hands in front of the core in its chest
PUSH = arms((-92, 0, 8), (-6, 0, -6))                # thrown forward, palms out
POINT = (-96, 0, -8)                                 # one arm straight out at whoever it is looking at


def seq(steps):
    """[(t, pose dict)] -> clip keys per arm bone."""
    out = {}
    for t, pose in steps:
        for b, r in pose.items():
            out.setdefault(b, []).append((t, r))
    return out


# ---- idle: hanging in the air. It sinks and rises; the head turns; now and then one long arm comes up and points.
L = 5.0
idle = {'body': cyc(L, 10, lambda p: ((2 * sn(p), 0, 3 * sn(p * 0.5 + 0.1)), (0, 0, 0.012 * sn(p)))),
        'head': cyc(L, 10, lambda p: (6 * sn(p + 0.2), 4 * sn(p * 2), 14 * sn(p * 0.5))),
        'arm_r_a': [(0, Z3), (1.6, Z3), (2.3, (POINT[0], 0, 8)), (3.3, (POINT[0] + 6, 0, 2)), (4.2, Z3), (L, Z3)],
        'arm_r_b': [(0, Z3), (1.6, Z3), (2.3, (-8, 0, 0)), (3.3, (-4, 0, 0)), (4.2, Z3), (L, Z3)],
        'arm_l_a': cyc(L, 10, lambda p: (4 * sn(p), 0, 3 * sn(p + 0.3))), 'arm_l_b': cyc(L, 10, lambda p: (6 * sn(p + 0.15), 0, 0))}
a.clip('idle-loop', L, idle)

# ---- walk: drifting. Leant into it, head low, the arms trailing and reaching by turns.
L = 2.0
a.clip('walk-loop', L, {'body': cyc(L, 8, lambda p: ((9 + 2 * sn(p), 2 * sn(p + 0.25), 3 * sn(p)), (0, 0, 0.01 * sn(p * 2)))),
                        'head': cyc(L, 8, lambda p: (-6 + 3 * sn(p), 0, -3 * sn(p))),
                        'arm_l_a': cyc(L, 8, lambda p: (14 - 22 * max(0, sn(p)), 0, 8 * max(0, sn(p)))), 'arm_l_b': cyc(L, 8, lambda p: (-16 * max(0, sn(p)), 0, 0)),
                        'arm_r_a': cyc(L, 8, lambda p: (14 - 22 * max(0, -sn(p)), 0, -8 * max(0, -sn(p)))), 'arm_r_b': cyc(L, 8, lambda p: (-16 * max(0, -sn(p)), 0, 0))})

# ---- attack: the arms fly out to either side, come in to the core in its chest and draw the charge out of it, and at
# 0.7 s throw it. The body arches back and snaps forward with them.
atk = seq([(0, HANG), (0.25, WIDE), (0.5, CORE), (0.64, CORE), (0.72, PUSH), (0.9, PUSH), (1.25, HANG)])
atk['body'] = [(0, Z3, Z3), (0.25, (-10, 0, 0), (0, 0, 0.02)), (0.5, (4, 0, 0)), (0.64, (-6, 0, 0), (0, 0.01, 0)), (0.72, (12, 0, 0), (0, -0.02, 0)), (1.25, Z3, Z3)]
atk['head'] = [(0, Z3), (0.25, (-14, 0, 0)), (0.5, (16, 0, 0)), (0.72, (-8, 0, 0)), (1.25, Z3)]
a.clip('attack', 1.25, atk)

# ---- claw: up close. The right arm goes back over its shoulder and rakes down and across. Lands at 0.35 s.
claw = {'arm_r_a': [(0, Z3), (0.2, (-150, 0, 20)), (0.35, (-60, 0, -40)), (0.5, (-30, 0, -50)), (0.8, Z3)],
        'arm_r_b': [(0, Z3), (0.2, (-30, 0, 0)), (0.35, (0, 0, 20)), (0.8, Z3)],
        'arm_l_a': [(0, Z3), (0.2, (10, 0, 20)), (0.35, (-20, 0, 0)), (0.8, Z3)],
        'body': [(0, Z3, Z3), (0.2, (-8, 0, -12)), (0.35, (14, 0, 16), (0, -0.03, 0)), (0.8, Z3, Z3)],
        'head': [(0, Z3), (0.35, (8, 0, -10)), (0.8, Z3)]}
a.clip('claw', 0.8, claw)

hurt = seq([(0, HANG), (0.1, WIDE), (0.35, HANG)])
hurt['body'] = [(0, Z3, Z3), (0.1, (-14, 0, 6), (0, 0.02, 0)), (0.35, Z3, Z3)]
hurt['head'] = [(0, Z3), (0.1, (-20, 0, 12)), (0.35, Z3)]
a.clip('hurt', 0.35, hurt)

# ---- die: whatever was holding it up lets go. The arms reach, the head drops, and it folds forward out of the air.
die = seq([(0, HANG), (0.3, WIDE), (0.9, arms((-40, 0, 10), (-30, 0, 0))), (1.6, arms((-20, 0, 25), (-20, 0, 0)))])
die['body'] = [(0, Z3, Z3), (0.3, (-12, 0, 0), (0, 0, 0.03)), (0.9, (40, 6, 0), (0, -0.05, -0.2)), (1.3, (78, 10, 0), (0, -0.1, -0.42)), (1.4, (74, 10, 0), (0, -0.1, -0.41)), (1.6, (78, 10, 0), (0, -0.1, -0.42))]
die['head'] = [(0, Z3), (0.3, (-20, 0, 0)), (0.9, (25, 0, 10)), (1.6, (30, 0, 14))]
a.clip('die', 1.6, die)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/mou', exist_ok=True)
    for nm, t in (('idle-loop', 0.0), ('idle-loop', 2.4), ('walk-loop', 0.5), ('attack', 0.25), ('attack', 0.55), ('attack', 0.72), ('claw', 0.2), ('claw', 0.35), ('die', 0.9), ('die', 1.6)):
        a.preview('/tmp/mou/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.3, -2.3, 0.75), (0, 0, 0.5), (420, 480))
a.export(os.path.join(ROOT, 'actors', 'mourner_tripo.glb'))
print('adopted mourner: clips', a.names)
