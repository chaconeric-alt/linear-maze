"""The Hammerhead Gallumper from Tripo (actors/source/gallumper_tripo.glb): bones renamed, clips written.
    python3 adopt_gallumper.py [preview]      writes actors/gallumper_tripo.glb
In the world it faces -Y, +X is its left, +Z up; 1.0 long, 0.51 high at the shoulder plates (the def scales it).
It stands on its knuckles: gauntleted fists down in front, short hind legs under the rump, a hammer-shaped armoured head
and a crocodile's tail that curls off to its right.
Tripo's rig is a good one: hips > spine > chest > neck > head_a > head; a clavicle, upper arm, forearm, hand and fingers
each side (the gauntlet has a bone of its own); rump > five tail bones; thigh, shin, foot each side.
Keys are in world axes. About X: + pitches a thing nose-down / swings a hanging limb BACK. About Z: + turns to its left.
About Y: + rolls its left side down... check with preview before trusting a sign."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
T = 'tripo::'
L_ = T + '0_Left_Limb_'
RENAME = {T + 'Root': 'root', L_ + '0': 'hips', L_ + '1': 'spine', L_ + '2': 'chest', 'bone_4': 'neck', T + 'Head_0': 'head_a', T + 'Head_1': 'head', T + 'Head_2': 'head_end',
          'bone_8': 'clav_r', 'bone_9': 'arm_r', 'bone_10': 'fore_r', 'bone_11': 'gaunt_r', 'bone_12': 'hand_r', 'bone_13': 'fing_r1', 'bone_14': 'fing_r2', 'bone_15': 'fing_r3',
          'bone_16': 'thumb_r', 'bone_17': 'thumb_r2',
          L_ + '3': 'clav_l', L_ + '4': 'arm_l', L_ + '5': 'fore_l', 'bone_21': 'gaunt_l', L_ + '6': 'hand_l', L_ + '7': 'fing_l1', 'bone_24': 'fing_l2', 'bone_25': 'thumb_l', 'bone_26': 'thumb_l2',
          T + 'Spine_0': 'rump', T + 'Spine_1': 'tail_a', T + 'Spine_2': 'tail_b', T + 'Tail_0': 'tail_c', T + 'Tail_1': 'tail_d', T + 'Tail_2': 'tail_e',
          'bone_33': 'thigh_r', 'bone_34': 'shin_r', 'bone_35': 'foot_r', 'bone_36': 'thigh_l', 'bone_37': 'shin_l', 'bone_38': 'foot_l', 'bone_39': 'toes_l'}
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'gallumper_tripo.glb'), RENAME, world_axes=True)
a.decimate(0.42)

Z3 = (0, 0, 0)
sn = lambda p: math.sin(p * 2 * math.pi)
cs = lambda p: math.cos(p * 2 * math.pi)
TAIL = ['rump', 'tail_a', 'tail_b', 'tail_c', 'tail_d', 'tail_e']


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def tail(L, n, amp, lag=0.07, base=0.0, lift=0.0):
    """The tail swinging side to side, each bone a little later and a little further than the one before."""
    return {b: cyc(L, n, lambda p, k=k: (lift * (k > 0), 0, base * 0 + amp * (0.4 + 0.3 * k) * sn(p - lag * k))) for k, b in enumerate(TAIL)}


# ---- idle: parked on its knuckles, breathing like a bellows; the head swings to look, the tail cannot keep still.
L = 3.2
idle = tail(L, 12, 5.0, 0.09)
idle.update({'chest': cyc(L, 12, lambda p: (1.6 * sn(p * 2), 0, 0)), 'spine': cyc(L, 12, lambda p: (1.0 * sn(p * 2 + 0.1), 0, 0)),
             'neck': cyc(L, 12, lambda p: (0, 0, 7 * sn(p))), 'head': cyc(L, 12, lambda p: (3 * sn(p * 2), 3 * sn(p + 0.2), 8 * sn(p + 0.08))),
             'hips': cyc(L, 12, lambda p: ((0, 1.5 * sn(p), 0), (0, 0, 0.004 * sn(p * 2))))})
a.clip('idle-loop', L, idle)

# ---- walk: the knuckle-walk. Right fist and left foot go forward together, then the other pair, like a gorilla; each
# fist is lifted, thrown ahead and planted, and the shoulders roll over it. The tail goes the other way for balance.
L = 1.1
walk = tail(L, 16, -9.0, 0.06)
lift = lambda p: max(0.0, -cs(p))                    # in the air while it travels forward
for side, ph, sg in (('l', 0.0, 1), ('r', 0.5, -1)):
    walk['clav_' + side] = cyc(L, 16, lambda p, ph=ph: (6 * sn(p + ph), 0, 0))
    walk['arm_' + side] = cyc(L, 16, lambda p, ph=ph: (26 * sn(p + ph) - 8 * lift(p + ph), 0, 0))
    walk['fore_' + side] = cyc(L, 16, lambda p, ph=ph: (-26 * lift(p + ph), 0, 0))
    walk['hand_' + side] = cyc(L, 16, lambda p, ph=ph: (18 * lift(p + ph), 0, 0))
    oph = ph + 0.5                                   # the hind leg on this side works with the OTHER arm
    walk['thigh_' + side] = cyc(L, 16, lambda p, oph=oph: (20 * sn(p + oph) - 10 * lift(p + oph), 0, 0))
    walk['shin_' + side] = cyc(L, 16, lambda p, oph=oph: (24 * lift(p + oph), 0, 0))
    walk['foot_' + side] = cyc(L, 16, lambda p, oph=oph: (-14 * lift(p + oph), 0, 0))
walk['hips'] = cyc(L, 16, lambda p: ((1.5 * sn(p * 2), 4 * sn(p + 0.5), 3 * sn(p + 0.5)), (0, 0, 0.012 * abs(sn(p)) - 0.004)))
walk['chest'] = cyc(L, 16, lambda p: (3 * sn(p * 2 + 0.25), -5 * sn(p), 8 * sn(p)))
walk['neck'] = cyc(L, 16, lambda p: (0, 0, -5 * sn(p)))
walk['head'] = cyc(L, 16, lambda p: (5 * sn(p * 2 + 0.1), 3 * sn(p), -4 * sn(p)))
a.clip('walk-loop', L, walk)

# ---- attack: the fist. Rears on to its hind legs with the right gauntlet over its head, and brings it down like a
# pile-driver. Lands at 0.38 s.
atk = {'hips': [(0, Z3, Z3), (0.22, (-14, 0, -4), (0, 0.03, 0.03)), (0.38, (10, 0, 5), (0, -0.07, -0.02)), (0.55, (8, 0, 4), (0, -0.06, -0.02)), (0.9, Z3, Z3)],
       'chest': [(0, Z3), (0.22, (-16, 0, -10)), (0.38, (18, 0, 12)), (0.55, (14, 0, 9)), (0.9, Z3)],
       'clav_r': [(0, Z3), (0.22, (-25, 0, 0)), (0.38, (10, 0, 0)), (0.9, Z3)],
       'arm_r': [(0, Z3), (0.12, (-60, 0, 0)), (0.24, (-135, 0, 0)), (0.38, (-28, 0, 0)), (0.55, (-22, 0, 0)), (0.9, Z3)],
       'fore_r': [(0, Z3), (0.22, (-40, 0, 0)), (0.38, (10, 0, 0)), (0.9, Z3)],
       'arm_l': [(0, Z3), (0.22, (14, 0, 0)), (0.38, (-6, 0, 0)), (0.9, Z3)],
       'neck': [(0, Z3), (0.22, (-10, 0, 8)), (0.38, (8, 0, -6)), (0.9, Z3)],
       'thigh_l': [(0, Z3), (0.22, (12, 0, 0)), (0.9, Z3)], 'thigh_r': [(0, Z3), (0.22, (12, 0, 0)), (0.9, Z3)]}
atk.update({b: [(0, Z3), (0.22, (-6, 0, 10 + 4 * k)), (0.4, (4, 0, -12 - 5 * k)), (0.9, Z3)] for k, b in enumerate(TAIL)})
a.clip('attack', 0.9, atk)

# ---- butt: the head. Hauls it back and up, then the whole animal goes through the hammer. Lands at 0.5 s.
butt = {'hips': [(0, Z3, Z3), (0.32, (-6, 0, 0), (0, 0.06, -0.01)), (0.5, (8, 0, 0), (0, -0.15, -0.02)), (0.62, (7, 0, 0), (0, -0.13, -0.02)), (1.0, Z3, Z3)],
        'chest': [(0, Z3), (0.32, (-12, 0, 0)), (0.5, (16, 0, 0)), (1.0, Z3)],
        'neck': [(0, Z3), (0.32, (-24, 0, 0)), (0.5, (20, 0, 0)), (0.62, (14, 0, 0)), (1.0, Z3)],
        'head': [(0, Z3), (0.32, (-22, 0, 0)), (0.5, (26, 0, 0)), (0.62, (18, 0, 0)), (1.0, Z3)],
        'arm_l': [(0, Z3), (0.32, (-14, 0, 0)), (0.5, (30, 0, 0)), (1.0, Z3)], 'arm_r': [(0, Z3), (0.32, (-14, 0, 0)), (0.5, (30, 0, 0)), (1.0, Z3)],
        'thigh_l': [(0, Z3), (0.32, (-10, 0, 0)), (0.5, (22, 0, 0)), (1.0, Z3)], 'thigh_r': [(0, Z3), (0.32, (-10, 0, 0)), (0.5, (22, 0, 0)), (1.0, Z3)]}
butt.update({b: [(0, Z3), (0.32, (8, 0, 0)), (0.5, (-10 - 2 * k, 0, 0)), (1.0, Z3)] for k, b in enumerate(TAIL)})
a.clip('butt', 1.0, butt)

# ---- grapple: both arms thrown wide, a lunge, and they close (0.5 s: the engine decides whether they closed on anything).
# Then it holds what it has up off the floor and wrings it, until 2.1 s; then it throws it away.
grab = {'hips': [(0, Z3, Z3), (0.3, (-10, 0, 0), (0, 0.03, 0.03)), (0.5, (2, 0, 0), (0, -0.08, 0.03)), (2.1, (-6, 0, 0), (0, -0.04, 0.04)), (2.3, (12, 0, 0), (0, -0.1, 0)), (2.7, Z3, Z3)],
        'chest': [(0, Z3), (0.3, (-18, 0, 0)), (0.5, (-6, 0, 0))] + [(0.7 + 0.2 * i, (-10, 0, 7 * (-1) ** i)) for i in range(7)] + [(2.1, (-16, 0, 0)), (2.3, (20, 0, 0)), (2.7, Z3)],
        'neck': [(0, Z3), (0.5, (12, 0, 0)), (2.1, (14, 0, 0)), (2.7, Z3)],
        'thigh_l': [(0, Z3), (0.3, (14, 0, 0)), (2.1, (14, 0, 0)), (2.7, Z3)], 'thigh_r': [(0, Z3), (0.3, (14, 0, 0)), (2.1, (14, 0, 0)), (2.7, Z3)]}
for side, sg in (('l', 1), ('r', -1)):
    grab['arm_' + side] = [(0, Z3), (0.3, (-70, 0, 55 * sg)), (0.5, (-80, 0, -18 * sg)), (2.1, (-88, 0, -20 * sg)), (2.3, (-40, 0, 30 * sg)), (2.7, Z3)]
    grab['fore_' + side] = [(0, Z3), (0.3, (-20, 0, 0)), (0.5, (-30, 0, -30 * sg)), (2.1, (-34, 0, -32 * sg)), (2.3, Z3), (2.7, Z3)]
grab.update({b: [(0, Z3), (0.3, (-8, 0, 0)), (0.5, (6, 0, 0))] + [(0.7 + 0.2 * i, (4, 0, (8 + 3 * k) * (-1) ** i)) for i in range(7)] + [(2.7, Z3)] for k, b in enumerate(TAIL)})
a.clip('grapple', 2.7, grab)

a.clip('hurt', 0.35, {'hips': [(0, Z3, Z3), (0.08, (-6, 5, 0), (0, 0.03, -0.01)), (0.35, Z3, Z3)], 'chest': [(0, Z3), (0.08, (-10, 0, 8)), (0.35, Z3)],
                      'head': [(0, Z3), (0.1, (-16, 6, -10)), (0.35, Z3)], 'tail_b': [(0, Z3), (0.1, (0, 0, 16)), (0.35, Z3)]})

# ---- die: the arms go from under it. Chin first, then the rest of it rolls on to its side and the tail slaps down.
die = {'hips': [(0, Z3, Z3), (0.35, (10, 0, 0), (0, -0.02, -0.06)), (0.7, (6, 20, 0), (0, -0.02, -0.11)), (1.2, (4, 66, 0), (0, 0, -0.17)), (1.35, (4, 62, 0), (0, 0, -0.165)), (1.7, (4, 66, 0), (0, 0, -0.17))],
       'chest': [(0, Z3), (0.35, (16, 0, 0)), (1.2, (6, 8, 10)), (1.7, (6, 8, 10))],
       'neck': [(0, Z3), (0.35, (14, 0, 0)), (1.2, (4, 0, 14)), (1.7, (4, 0, 14))],
       'head': [(0, Z3), (0.35, (10, 0, 0)), (1.2, (0, -20, 10)), (1.7, (0, -20, 10))]}
for side, sg in (('l', 1), ('r', -1)):
    die['arm_' + side] = [(0, Z3), (0.35, (-30, 0, 20 * sg)), (1.2, (-50, 0, 10 * sg)), (1.7, (-50, 0, 10 * sg))]
    die['fore_' + side] = [(0, Z3), (0.35, (-30, 0, 0)), (1.7, (-40, 0, 0))]
    die['thigh_' + side] = [(0, Z3), (0.7, (16, 0, 0)), (1.7, (24, 0, 0))]
die.update({b: [(0, Z3), (0.5, (-6, 0, 6 * k)), (1.2, (4, 0, -5 * k)), (1.4, (2, 0, -4 * k)), (1.7, (4, 0, -5 * k))] for k, b in enumerate(TAIL)})
a.clip('die', 1.7, die)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/gal', exist_ok=True)
    for nm, t in (('idle-loop', 0.8), ('walk-loop', 0.0), ('walk-loop', 0.55), ('attack', 0.24), ('attack', 0.38), ('butt', 0.32), ('butt', 0.5), ('grapple', 0.3), ('grapple', 1.1), ('die', 1.7)):
        a.preview('/tmp/gal/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (-1.9, -1.5, 0.75), (0, 0, 0.28), (440, 360))
a.export(os.path.join(ROOT, 'actors', 'gallumper_tripo.glb'))
print('adopted gallumper: clips', a.names)
