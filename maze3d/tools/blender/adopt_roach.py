"""The Gladiator Roach from Tripo (actors/source/roach_tripo.glb): bones renamed, clips written.
    python3 adopt_roach.py            writes actors/roach_tripo.glb
    python3 adopt_roach.py preview    and pictures of the poses in /tmp/roach
The file's axes: +X is the head end, +Y its left, +Z up; about 1 unit long (the actor def scales it).
What Tripo's rigger gave it: a chain for each blade arm (3 bones), five walking legs (two left of 3 bones, two right
of 2, and one odd one under the chin), a 2-bone tail, a bone for each barrel, and one bone (body) for the head,
thorax and both antennae together. So: it can run, climb, strike and die; it cannot wave its antennae or bite."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RENAME = {
    'tripo::Root': 'root', 'tripo::Spine_0': 'body', 'tripo::Spine_1': 'barrel_l', 'bone_27': 'barrel_r', 'bone_26': 'strap_r',
    'tripo::0_Left_Limb_0': 'blade_l_a', 'tripo::0_Left_Limb_1': 'blade_l_b', 'tripo::0_Left_Limb_2': 'blade_l_c',
    'bone_12': 'blade_r_a', 'tripo::0_Right_Limb_0': 'blade_r_b', 'tripo::0_Right_Limb_1': 'blade_r_c',
    'bone_6': 'leg_lm_a', 'bone_7': 'leg_lm_b', 'bone_8': 'leg_lm_c',
    'tripo::1_Left_Limb_0': 'leg_lr_a', 'tripo::1_Left_Limb_1': 'leg_lr_b', 'tripo::1_Left_Limb_2': 'leg_lr_c', 'bone_25': 'hip_lr',
    'tripo::2_Right_Limb_0': 'leg_rm_a', 'tripo::2_Right_Limb_1': 'leg_rm_b',
    'bone_15': 'leg_rr_a', 'bone_16': 'leg_rr_b', 'bone_19': 'hip_rr',
    'tripo::1_Right_Limb_0': 'leg_c_a', 'tripo::1_Right_Limb_1': 'leg_c_b', 'tripo::1_Right_Limb_2': 'leg_c_c', 'bone_28': 'hip_c',
    'tripo::2_Left_Limb_0': 'tail_a', 'tripo::2_Left_Limb_1': 'tail_b',
}
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'roach_tripo.glb'), RENAME)

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
cs = lambda p, off=0.0: math.cos((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


# (first bone, second bone, side: +1 left / -1 right / 0 the middle one, phase in the tripod)
LEGS = [('leg_lm_a', 'leg_lm_b', 1, 0.0), ('leg_lr_a', 'leg_lr_b', 1, 0.5), ('leg_rm_a', 'leg_rm_b', -1, 0.5), ('leg_rr_a', 'leg_rr_b', -1, 0.0), ('leg_c_a', 'leg_c_b', 0, 0.25)]


def lift(s, deg):
    """Raise a leg's foot by deg: side legs roll about X, the middle one pitches about Y."""
    return (s * deg, 0, 0) if s else (0, -deg, 0)


def swing(s, deg):
    """Swing a leg's foot toward the head (+) or the tail (-)."""
    return (0, 0, -s * deg) if s else (0, 0, 0)


def add(*rs):
    return tuple(sum(r[i] for r in rs) for i in range(3))


def gait(L, stride, high, n=8):
    d = {}
    for (ba, bb, s, ph) in LEGS:
        # foot forward while lifted, back while planted
        d[ba] = cyc(L, n, lambda p, s=s, ph=ph: add(swing(s, stride * cs(p, ph)), lift(s, high * up(p, ph + 0.25)), (0, 0, 0) if s else (0, -stride * 0.6 * cs(p, ph), 0)))
        d[bb] = cyc(L, n, lambda p, s=s, ph=ph: lift(s, -high * 0.5 * up(p, ph + 0.25)))
    return d


# ---- idle: never quite still. Blades hone against each other, barrels breathe, the tail ticks.
L = 2.4
idle = {
    'root': cyc(L, 8, lambda p: ((0, 1.5 * sn(p), 0), (0, 0, 0.006 * sn(p * 2)))),
    'barrel_l': cyc(L, 8, lambda p: (3 * sn(p), 0, 0)), 'barrel_r': cyc(L, 8, lambda p: (-3 * sn(p), 0, 0)),
    'tail_a': cyc(L, 12, lambda p: (0, 6 * up(p * 3), 5 * sn(p))), 'tail_b': cyc(L, 12, lambda p: (0, 8 * up(p * 3), 8 * sn(p, -0.1))),
    'blade_l_a': cyc(L, 12, lambda p: (0, -10 - 8 * up(p, 0.0), -8 * up(p, 0.0))), 'blade_l_c': cyc(L, 12, lambda p: (0, -14 * up(p * 2), 0)),
    'blade_r_a': cyc(L, 12, lambda p: (0, -10 - 8 * up(p, 0.5), 8 * up(p, 0.5))), 'blade_r_c': cyc(L, 12, lambda p: (0, -14 * up(p * 2, 0.5), 0)),
    'leg_c_a': cyc(L, 12, lambda p: (0, -14 * up(p * 4) * (1 if p < 0.25 else 0), 0)),          # it taps one foot
}
a.clip('idle-loop', L, idle)

# ---- walk: the scuttle. Short, fast, low; the body jitters and yaws against the legs, the blades are carried high.
L = 0.26
walk = gait(L, 26, 30)
walk['root'] = cyc(L, 8, lambda p: ((2.5 * sn(p), 2 * sn(p * 2), 4 * sn(p)), (0, 0, -0.012 + 0.008 * abs(sn(p)))))
walk['body'] = cyc(L, 8, lambda p: (0, 0, -3 * sn(p)))
walk['barrel_l'] = cyc(L, 8, lambda p: (4 * sn(p, 0.1), 0, 0))
walk['barrel_r'] = cyc(L, 8, lambda p: (4 * sn(p, 0.6), 0, 0))
walk['tail_a'] = cyc(L, 8, lambda p: (0, 0, 9 * sn(p, -0.1)))
walk['tail_b'] = cyc(L, 8, lambda p: (0, 0, 14 * sn(p, -0.25)))
walk['blade_l_a'] = cyc(L, 8, lambda p: (0, -22 + 5 * sn(p), 0))
walk['blade_r_a'] = cyc(L, 8, lambda p: (0, -22 - 5 * sn(p), 0))
walk['blade_l_c'] = cyc(L, 8, lambda p: (0, -18 + 6 * sn(p, 0.2), 0))
walk['blade_r_c'] = cyc(L, 8, lambda p: (0, -18 - 6 * sn(p, 0.2), 0))
a.clip('walk-loop', L, walk)

def arm(side, raise_, bend, out=0.0):
    """A blade arm: raise_ lifts it (+ up), bend opens the blade forward (+), out swings it away from the middle.
    The two arms were cut into bones differently, so the same pose needs different shares on each side."""
    s = 1 if side == 'l' else -1
    share = (0.6, 0.4) if side == 'l' else (0.25, 0.4)
    return {'blade_%s_a' % side: (0, -raise_, s * out), 'blade_%s_b' % side: (0, -bend * share[0], 0), 'blade_%s_c' % side: (0, -bend * share[1], 0)}


def arms(times_poses):
    d = {}
    for t, (ra, be, ou) in times_poses:
        for side in 'lr':
            for b, r in arm(side, ra, be, ou).items():
                d.setdefault(b, []).append((t, r))
    return d


# ---- attack: both blades up and back, then down and in, like shears. The hit lands at about 0.24 s.
Z3 = (0, 0, 0)
atk = arms([(0, (10, 0, 0)), (0.14, (44, 34, 4)), (0.24, (-16, -14, -4)), (0.34, (-10, -10, -3)), (0.5, (10, 0, 0))])
atk.update({
    'root': [(0, Z3, Z3), (0.14, (0, -9, 0), (-0.04, 0, 0.02)), (0.24, (0, 8, 0), (0.09, 0, -0.02)), (0.5, Z3, Z3)],
    'tail_a': [(0, Z3), (0.14, (0, 14, 0)), (0.24, (0, -8, 0)), (0.5, Z3)],
    'barrel_l': [(0, Z3), (0.24, (8, 0, 0)), (0.5, Z3)], 'barrel_r': [(0, Z3), (0.24, (-8, 0, 0)), (0.5, Z3)],
})
a.clip('attack', 0.5, atk)

# ---- pounce: 0.3 s pressed flat with the blades cocked, then thrown open; the engine holds the end in the air.
pn = arms([(0, (10, 0, 0)), (0.3, (50, 20, 4)), (0.42, (26, 52, 6)), (0.9, (26, 52, 6))])
pn.update({
    'root': [(0, Z3, Z3), (0.3, (0, 8, 0), (-0.03, 0, -0.045)), (0.42, (0, -16, 0), (0.06, 0, 0.03)), (0.9, (0, -10, 0), (0.06, 0, 0.03))],
    'tail_a': [(0, Z3), (0.3, (0, 20, 0)), (0.42, (0, -10, 0)), (0.9, (0, -10, 0))],
    'tail_b': [(0, Z3), (0.3, (0, 20, 0)), (0.42, (0, -6, 0)), (0.9, (0, -6, 0))],
    'barrel_l': [(0, Z3), (0.42, (10, 0, 0)), (0.9, (10, 0, 0))], 'barrel_r': [(0, Z3), (0.42, (-10, 0, 0)), (0.9, (-10, 0, 0))],
})
for (ba, bb, s, ph) in LEGS:
    pn[ba] = [(0, Z3), (0.3, add(lift(s, 22), swing(s, 10))), (0.42, add(lift(s, 10), swing(s, -38))), (0.9, add(lift(s, 10), swing(s, -38)))]
    pn[bb] = [(0, Z3), (0.3, lift(s, -30)), (0.42, lift(s, 20)), (0.9, lift(s, 20))]
a.clip('pounce', 0.9, pn)

a.clip('hurt', 0.25, {
    'root': [(0, Z3, Z3), (0.08, (6, -12, 0), (-0.05, 0, 0.02)), (0.25, Z3, Z3)],
    'barrel_l': [(0, Z3), (0.08, (14, 0, 0)), (0.25, Z3)], 'barrel_r': [(0, Z3), (0.08, (-14, 0, 0)), (0.25, Z3)],
    'blade_l_a': [(0, (0, -10, 0)), (0.08, (0, -50, 30)), (0.25, (0, -10, 0))], 'blade_r_a': [(0, (0, -10, 0)), (0.08, (0, -50, -30)), (0.25, (0, -10, 0))],
})

# ---- die: over onto its back, legs working at nothing, then folding in.
die = {
    'root': [(0, Z3, Z3), (0.18, (60, -10, 0), (0, 0, 0.16)), (0.42, (150, 0, 10), (0, 0.02, 0.36)), (0.55, (180, 0, 14), (0, 0.02, 0.4)), (0.65, (176, 0, 14), (0, 0.02, 0.41)), (1.1, (180, 0, 14), (0, 0.02, 0.4))],
    'tail_a': [(0, Z3), (0.55, (0, -20, 0)), (1.1, (0, 25, 0))], 'tail_b': [(0, Z3), (0.55, (0, -20, 0)), (1.1, (0, 30, 0))],
    'blade_l_a': [(0, (0, -10, 0)), (0.3, (0, -70, 30)), (1.1, (0, 20, -20))], 'blade_r_a': [(0, (0, -10, 0)), (0.3, (0, -70, -30)), (1.1, (0, 20, 20))],
    'blade_l_c': [(0, Z3), (1.1, (0, 40, 0))], 'blade_r_c': [(0, Z3), (1.1, (0, 40, 0))],
}
for i, (ba, bb, s, ph) in enumerate(LEGS):
    die[ba] = [(0, Z3), (0.3, lift(s, 40)), (0.5, lift(s, -10)), (0.65, lift(s, 35)), (0.8, lift(s, 5)), (1.1, lift(s, 48))]
    die[bb] = [(0, Z3), (0.5, lift(s, -30)), (1.1, lift(s, 55))]
a.clip('die', 1.1, die)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/roach', exist_ok=True)
    for nm, t in (('idle-loop', 0.4), ('walk-loop', 0.06), ('walk-loop', 0.19), ('attack', 0.14), ('attack', 0.24), ('pounce', 0.3), ('pounce', 0.6), ('die', 1.0)):
        a.preview('/tmp/roach/p_%s_%02d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t)
a.export(os.path.join(ROOT, 'actors', 'roach_tripo.glb'))
print('adopted roach: clips', a.names)
