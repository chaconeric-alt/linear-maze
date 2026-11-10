"""The Glorexx from Tripo (actors/source/glorexx_tripo.glb): bones renamed, clips written.
    python3 adopt_glorexx.py [preview]      writes actors/glorexx_tripo.glb
The armature's axes: +X is the head end, +Y its left, +Z up; about 0.75 long (the def scales it). It rests with the tail
arched over its back like a scorpion's.
What Tripo's rigger gave it (68 bones, most of them misnamed): a body chain hips > body_a > body_b > neck > head > jaw,
six feelers and palps on the head, an 8-bone tail, and chains for five legs a side. The model has about seven legs a
side: the others are painted to the body and ride along. That is plenty: the tail and the body chain carry the show."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
T = 'tripo::'
RENAME = {T + 'Root': 'hips', T + '1_Right_Limb_0': 'body_a', T + '1_Right_Limb_1': 'body_b', T + '1_Right_Limb_2': 'neck', T + '1_Right_Limb_3': 'head', T + '1_Right_Limb_4': 'jaw',
          'bone_6': 'feeler_c', 'bone_9': 'feeler_l', 'bone_10': 'feeler_r', 'bone_7': 'palp_l', 'bone_8': 'palp_r', 'bone_11': 'palp_l2',
          T + '2_Left_Limb_0': 'tail_a', T + '2_Left_Limb_1': 'tail_b'}
for i in range(6):
    RENAME[T + 'Tail_%d' % i] = 'tail_' + 'cdefgh'[i]
CHAINS = {'l1': [T + 'Spine_0', T + 'Spine_1', 'bone_14', 'bone_15', 'bone_16'], 'r1': ['bone_17', 'bone_18', 'bone_19', 'bone_20', 'bone_21'],
          'l2': ['bone_22', 'bone_23', 'bone_24', 'bone_25'], 'r2': ['bone_26', 'bone_27', 'bone_28', 'bone_29', 'bone_30'],
          'l3': [T + '0_Right_Limb_%d' % i for i in range(5)], 'l4': [T + '0_Left_Limb_%d' % i for i in range(5)], 'l5': [T + '1_Left_Limb_%d' % i for i in range(5)],
          'r3': [T + '3_Right_Limb_%d' % i for i in range(5)], 'r4': [T + '2_Right_Limb_%d' % i for i in range(5)], 'r5': [T + '3_Left_Limb_%d' % i for i in range(4)]}
for k, bones in CHAINS.items():
    for i, b in enumerate(bones):
        RENAME[b] = 'leg_%s_%s' % (k, 'abcde'[i])
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'glorexx_tripo.glb'), RENAME)

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
cs = lambda p, off=0.0: math.cos((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)
LEGS = [(k, 1 if k[0] == 'l' else -1, int(k[1])) for k in CHAINS]            # (name, side, 1 = front .. 5 = back)
TAIL = ['tail_' + c for c in 'abcdefg']
BODY = ['hips', 'body_a', 'body_b', 'neck', 'head']


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def add(*rs):
    return tuple(sum(r[i] for r in rs) for i in range(3))


lift = lambda s, deg: (s * deg, 0, 0)                 # a leg's foot up
swing = lambda s, deg: (0, 0, -s * deg)               # a leg's foot toward the head (+) or the tail (-)


def tail(L, lay, swish, n=8, lag=0.09, snap=None):
    """lay: degrees each joint is laid back from the arch (0 = as modelled, 13 = straight out behind). swish: side to side."""
    return {b: cyc(L, n, lambda p, i=i: (0, -lay * (2.4 if i < 2 else 1.0), swish * (0.4 + 0.2 * i) * sn(p, -i * lag))) for i, b in enumerate(TAIL)}


def feelers(flare):
    return {'feeler_l': (0, -18 * flare, 34 * flare), 'feeler_r': (0, -18 * flare, -34 * flare), 'feeler_c': (0, -30 * flare, 0),
            'palp_l': (0, 10 * flare, 40 * flare), 'palp_r': (0, 10 * flare, -40 * flare), 'palp_l2': (0, 0, 30 * flare), 'jaw': (0, 22 * flare, 0)}


# ---- idle: the tail hangs over it and ticks; the feelers taste the air; the legs settle one at a time.
L = 3.0
idle = tail(L, 0, 5, 12)
idle['tail_f'] = cyc(L, 12, lambda p: (0, 8 * up(p * 2), 6 * sn(p, -0.4)))
idle['hips'] = cyc(L, 8, lambda p: ((0, 0, 0), (0, 0, 0.006 * sn(p))))
idle['head'] = cyc(L, 8, lambda p: (0, 3 * sn(p), 6 * sn(p, 0.2)))
for b, s in (('feeler_l', 1), ('feeler_r', -1)):
    idle[b] = cyc(L, 12, lambda p, s=s: (0, -8 * up(p * 3, 0.1 * s), s * (8 + 10 * up(p * 2, 0.25 * s))))
idle['feeler_c'] = cyc(L, 12, lambda p: (0, -10 * up(p * 3), 0))
idle['palp_l'] = cyc(L, 12, lambda p: (0, 0, 14 * up(p * 4)))
idle['palp_r'] = cyc(L, 12, lambda p: (0, 0, -14 * up(p * 4, 0.5)))
for (k, s, i) in LEGS:
    idle['leg_%s_a' % k] = cyc(L, 12, lambda p, s=s, i=i: lift(s, 10 * up(p * 2, -i * 0.11 + (0.25 if s < 0 else 0))))
a.clip('idle-loop', L, idle)

# ---- walk: a wave runs down the legs, the body snakes after it, and the tail comes down off its back and swishes behind.
L = 0.5
walk = tail(L, 12, 11, 8, 0.12)
for i, b in enumerate(BODY):
    walk[b] = cyc(L, 8, lambda p, i=i: ((0, 0, (7 if i else 4) * sn(p, i * 0.16) * (-1 if i == 4 else 1)), (0, 0, 0)) if i else ((0, 0, 4 * sn(p)), (0, 0.008 * sn(p, 0.25), -0.01)))
for (k, s, i) in LEGS:
    ph = i * 0.21 + (0.5 if s < 0 else 0.0)
    walk['leg_%s_a' % k] = cyc(L, 8, lambda p, s=s, ph=ph: add(swing(s, 24 * cs(p, ph)), lift(s, 26 * up(p, ph + 0.25))))
    walk['leg_%s_b' % k] = cyc(L, 8, lambda p, s=s, ph=ph: lift(s, -12 * up(p, ph + 0.25)))
walk.update({b: cyc(L, 4, lambda p, r=r: r) for b, r in feelers(0.25).items() if b != 'jaw'})
a.clip('walk-loop', L, walk)


def strike(tell, hit, end, hold_end):
    """The tell: feelers flare, the jaw drops, the tail snaps up and over. Then the lunge."""
    d = {}
    for b, r in feelers(1.0).items():
        d[b] = [(0, Z3), (tell * 0.6, r), (hit, r), (end, r if hold_end else Z3)]
    d['jaw'] = [(0, Z3), (tell * 0.6, (0, 26, 0)), (hit, (0, 30, 0) if hold_end else (0, -4, 0)), (end, (0, 30, 0) if hold_end else Z3)]
    for i, b in enumerate(TAIL):
        cock = (0, 9 + i * 1.5, 0)                                        # tighter and higher
        thrown = (0, 14 + i * 2.5, 0) if not hold_end else (0, -11, 0)    # over the head to stab, or streaming behind in a leap
        d[b] = [(0, Z3), (tell * 0.5, cock), (tell, cock), (hit, thrown), (end, thrown if hold_end else Z3)]
    d['hips'] = [(0, Z3, Z3), (tell, (0, -7, 0), (-0.05, 0, -0.02)), (hit, (0, 5, 0), (0.12, 0, 0.0)), (end, ((0, -8, 0), (0.1, 0, 0.02)) [0] if hold_end else Z3, (0.1, 0, 0.02) if hold_end else Z3)]
    d['head'] = [(0, Z3), (tell, (0, -16, 0)), (hit, (0, 10, 0)), (end, (0, -6, 0) if hold_end else Z3)]
    for (k, s, i) in LEGS:
        back = (add(swing(s, -46), lift(s, 16)) if hold_end else swing(s, -10))
        d['leg_%s_a' % k] = [(0, Z3), (tell, add(lift(s, -8), swing(s, 12))), (hit, back), (end, back if hold_end else Z3)]
    return d


a.clip('attack', 0.6, strike(0.24, 0.34, 0.6, False))
a.clip('pounce', 1.0, strike(0.3, 0.44, 1.0, True))
a.clip('hurt', 0.3, {'hips': [(0, Z3, Z3), (0.1, (8, -10, 0), (-0.05, 0, 0.02)), (0.3, Z3, Z3)], 'head': [(0, Z3), (0.1, (0, -24, 14)), (0.3, Z3)],
                     'tail_c': [(0, Z3), (0.1, (0, 16, 20)), (0.3, Z3)], **{b: [(0, Z3), (0.1, r), (0.3, Z3)] for b, r in feelers(1.0).items()}})

# ---- swim: legs laid back along the body, the tail let out straight behind, and one long slow wave from nose to sting.
L = 1.4
swim = {}
chain = BODY + TAIL
for i, b in enumerate(chain):
    amp = 5 + i * 1.6
    lay = (14 * (2.4 if b in TAIL[:2] else 1.0)) if b in TAIL else 0
    if i == 0:
        swim[b] = cyc(L, 10, lambda p: ((0, 0, 5 * sn(p)), (0, 0.03 * sn(p, 0.25), 0)))
    else:
        swim[b] = cyc(L, 10, lambda p, i=i, amp=amp, lay=lay, b=b: (0, -lay, (-1 if b in BODY else 1) * amp * sn(p, -i * 0.085)))
for (k, s, i) in LEGS:
    swim['leg_%s_a' % k] = cyc(L, 10, lambda p, s=s, i=i: add(swing(s, -58 + 5 * sn(p, -i * 0.1)), lift(s, 12)))
    swim['leg_%s_b' % k] = cyc(L, 10, lambda p, s=s: lift(s, 14))
swim.update({b: cyc(L, 4, lambda p, r=r: r) for b, r in feelers(-0.3).items()})
a.clip('swim-loop', L, swim)

# ---- die: over on its back, the legs clutching, the tail going slack last.
die = {'hips': [(0, Z3, Z3), (0.25, (70, -8, 0), (0, 0, 0.1)), (0.55, (170, 0, 12), (0, 0, 0.2)), (0.7, (180, 0, 14), (0, 0, 0.22)), (1.3, (180, 0, 14), (0, 0, 0.22))],
       'head': [(0, Z3), (0.5, (0, -30, 0)), (1.3, (0, 16, 10))], 'jaw': [(0, Z3), (0.4, (0, 30, 0)), (1.3, (0, 18, 0))]}
for i, b in enumerate(TAIL):
    die[b] = [(0, Z3), (0.3, (0, 12, 0)), (0.7, (0, 6, 14)), (1.3, (0, -9, 10))]
for (k, s, i) in LEGS:
    die['leg_%s_a' % k] = [(0, Z3), (0.3, lift(s, 34)), (0.5, lift(s, -6)), (0.7, lift(s, 30)), (0.9, lift(s, 8)), (1.3, lift(s, 44))]
    die['leg_%s_b' % k] = [(0, Z3), (1.3, lift(s, 40))]
a.clip('die', 1.3, die)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/glor', exist_ok=True)
    for nm, t in (('idle-loop', 0.5), ('walk-loop', 0.12), ('attack', 0.24), ('attack', 0.34), ('pounce', 0.7), ('swim-loop', 0.35), ('swim-loop', 1.05), ('die', 1.3))[5:] if False else (('walk-loop', 0.12), ('swim-loop', 0.35), ('swim-loop', 1.05), ('attack', 0.24)):
        top = nm.startswith('swim') and t > 1
        a.preview('/tmp/glor/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (0.0, 0.01, 2.6) if top else (-1.5, 1.6, 0.9), (0, 0, 0.2))
a.export(os.path.join(ROOT, 'actors', 'glorexx_tripo.glb'))
print('adopted glorexx: clips', a.names)
