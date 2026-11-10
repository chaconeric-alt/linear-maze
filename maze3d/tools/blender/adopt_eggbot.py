"""The Eggbot from Tripo (actors/source/eggbot_tripo.glb): an egg on two tread pods with one yellow eye and a rack of aerials.
    python3 adopt_eggbot.py [preview]      writes actors/eggbot_tripo.glb
The armature's axes: +X is the eye side, +Y its left, +Z up; 1 unit tall (the def scales it).
What Tripo's rigger gave it (38 bones): the egg in three slices (base, belly, crown), a bone for each tread pod, and
5-bone chains up each of the aerials on its back. There is no bone for the eye and none for the treads' belts, so the
eye cannot look about on its own and the treads do not visibly turn: the pods shudder and rock instead, the egg rides
on them like a jelly, and the aerials do the talking. It arrived at 55,000 triangles; this thins it to about 22,000."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RENAME = {'tripo::Root': 'base', 'tripo::Spine_0': 'belly', 'tripo::Spine_1': 'crown', 'bone_2': 'tread_r', 'bone_4': 'tread_l',
          'bone_1': 'bit_a', 'bone_3': 'bit_b', 'bone_5': 'bit_c', 'bone_6': 'bit_d', 'bone_7': 'bit_e', 'tripo::Head_0': 'aer6_c', 'bone_37': 'aer6_d', 'bone_34': 'aer6_a', 'bone_35': 'aer6_b'}
for n, first, count in ((1, 10, 5), (2, 15, 5), (3, 20, 4), (4, 24, 5), (5, 29, 5)):
    for i in range(count):
        RENAME['bone_%d' % (first + i)] = 'aer%d_%s' % (n, 'abcde'[i])
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'eggbot_tripo.glb'), RENAME)
a.decimate(0.4)

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)
AER = [(n, c) for n in (1, 2, 4, 5, 6) for c in 'abcd']          # aer3 is the cable: leave it be


def cyc(L, n, fn):
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((L * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def aerials(L, lean, whip, side=0.0, n=8, rate=1):
    """lean: degrees each joint tips toward the eye (+) or streams behind (-). whip: how much they lash."""
    d = {}
    for (k, c) in AER:
        i = 'abcd'.index(c)
        d['aer%d_%s' % (k, c)] = cyc(L, n, lambda p, i=i, k=k: (side * sn(p * rate, k * 0.17 - i * 0.1), lean + whip * (0.5 + 0.3 * i) * sn(p * rate, -i * 0.13 + k * 0.21), 0))
    return d


# ---- idle: it is never quite upright. The egg settles on its pods and the aerials sniff about.
L = 3.0
idle = aerials(L, 0, 3, 3, 12)
idle['belly'] = cyc(L, 8, lambda p: (2 * sn(p), 2 * sn(p, 0.25), 0))
idle['crown'] = cyc(L, 8, lambda p: (0, 0, 8 * sn(p, 0.1)))
a.clip('idle-loop', L, idle)

# ---- walk: rolling. The pods shudder and pitch against each other, the egg lags behind them, the aerials stream back.
L = 0.5
walk = aerials(L, -7, 6, 2, 8, 2)
walk['base'] = cyc(L, 8, lambda p: ((0, 0, 0), (0, 0, 0.006 * abs(sn(p * 2)))))
walk['tread_l'] = cyc(L, 8, lambda p: ((0, 3.5 * sn(p * 2), 0), (0, 0, 0.004 * sn(p * 4))))
walk['tread_r'] = cyc(L, 8, lambda p: ((0, 3.5 * sn(p * 2, 0.5), 0), (0, 0, 0.004 * sn(p * 4, 0.5))))
walk['belly'] = cyc(L, 8, lambda p: (3 * sn(p), 7 + 2.5 * sn(p * 2), 0))
walk['crown'] = cyc(L, 8, lambda p: (-2 * sn(p), 3, 0))
a.clip('walk-loop', L, walk)

# ---- attack: it draws itself up and back, then the whole egg snaps forward behind the eye. Fires at about 0.4 s.
atk = {'base': [(0, Z3, Z3), (0.3, Z3, (-0.02, 0, 0)), (0.4, Z3, (0.04, 0, 0)), (0.48, Z3, (-0.03, 0, 0)), (0.7, Z3, Z3)],
       'belly': [(0, Z3), (0.3, (0, -12, 0)), (0.4, (0, 10, 0)), (0.5, (0, -4, 0)), (0.7, Z3)],
       'crown': [(0, Z3), (0.3, (0, -8, 0)), (0.4, (0, 8, 0)), (0.7, Z3)],
       'tread_l': [(0, Z3), (0.4, (0, -5, 0)), (0.7, Z3)], 'tread_r': [(0, Z3), (0.4, (0, -5, 0)), (0.7, Z3)]}
for (k, c) in AER:
    i = 'abcd'.index(c)
    atk['aer%d_%s' % (k, c)] = [(0, Z3), (0.3, (0, -10 - 3 * i, 0)), (0.42, (0, 14 + 4 * i, 0)), (0.55, (0, -5, 0)), (0.7, Z3)]
a.clip('attack', 0.7, atk)

hurt = {'belly': [(0, Z3), (0.08, (8, -16, 0)), (0.28, Z3)], 'crown': [(0, Z3), (0.08, (0, -10, 12)), (0.28, Z3)]}
for (k, c) in AER:
    hurt['aer%d_%s' % (k, c)] = [(0, Z3), (0.08, ((k - 3) * 9, -12, 0)), (0.28, Z3)]
a.clip('hurt', 0.28, hurt)

# ---- die: one pod gives, it goes over on its side, rocks twice like a dropped egg and lies still. Aerials go limp.
die = {'base': [(0, Z3, Z3), (0.3, (30, 6, 0), (0, 0, 0.02)), (0.6, (84, 4, 10), (0, -0.12, 0.1)), (0.75, (74, 4, 10), (0, -0.1, 0.1)), (0.95, (86, 4, 10), (0, -0.12, 0.1)), (1.3, (82, 4, 10), (0, -0.12, 0.1))],
       'tread_l': [(0, Z3), (0.3, (-14, 0, 0)), (1.3, (-22, 10, 0))], 'tread_r': [(0, Z3), (0.5, (10, -8, 0)), (1.3, (16, -12, 0))],
       'belly': [(0, Z3), (0.6, (6, 0, 0)), (1.3, Z3)]}
for (k, c) in AER:
    i = 'abcd'.index(c)
    die['aer%d_%s' % (k, c)] = [(0, Z3), (0.6, (-6 - 3 * i, 4, 0)), (1.3, (-10 - 5 * i, 6, 0))]
a.clip('die', 1.3, die)

# ---- watch: off duty, in front of a screen. Leaning in, aerials pricked toward it; every so often it rocks with glee.
L = 5.0
glee = lambda p: (1.0 if 0.55 < p < 0.8 else 0.0)
watch = {}
for (k, c) in AER:
    i = 'abcd'.index(c)
    watch['aer%d_%s' % (k, c)] = cyc(L, 20, lambda p, i=i, k=k: (2 * sn(p * 2, k * 0.2), 7 + 2 * sn(p * 3, k * 0.13) + glee(p) * 10 * sn(p * 16, i * 0.1), 0))
watch['belly'] = cyc(L, 20, lambda p: (3 * sn(p), 9 + 1.5 * sn(p * 2) + glee(p) * 5 * sn(p * 16), 0))
watch['crown'] = cyc(L, 20, lambda p: (0, 5, 10 * sn(p, 0.2)))
watch['base'] = cyc(L, 20, lambda p: ((0, 0, 0), (0, 0, glee(p) * 0.012 * abs(sn(p * 16)))))
watch['tread_l'] = cyc(L, 20, lambda p: (0, glee(p) * 3 * sn(p * 16), 0))
watch['tread_r'] = cyc(L, 20, lambda p: (0, glee(p) * 3 * sn(p * 16, 0.5), 0))
a.clip('watch-loop', L, watch)

st = {'base': [(0, Z3, Z3), (0.12, Z3, (0, 0, 0.05)), (0.3, Z3, Z3), (0.5, Z3, Z3)],
      'belly': [(0, (0, 9, 0)), (0.12, (0, -16, 0)), (0.3, (0, 6, 0)), (0.5, Z3)], 'crown': [(0, (0, 5, 0)), (0.12, (0, -8, 20)), (0.5, Z3)]}
for (k, c) in AER:
    st['aer%d_%s' % (k, c)] = [(0, (0, 7, 0)), (0.12, ((k - 3) * 12, -14, 0)), (0.5, Z3)]
a.clip('startle', 0.5, st)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/egg', exist_ok=True)
    for nm, t in (('idle-loop', 0.5), ('walk-loop', 0.12), ('attack', 0.3), ('attack', 0.4), ('watch-loop', 3.2), ('die', 1.3)):
        a.preview('/tmp/egg/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (-1.9, 1.9, 0.9), (0, 0, 0.45))
a.export(os.path.join(ROOT, 'actors', 'eggbot_tripo.glb'))
print('adopted eggbot: clips', a.names)
