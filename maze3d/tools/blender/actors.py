"""Rigged, animated monsters. Each builder returns (mesh_object, Rig) after keying its clips.
Every actor has the clips the engine looks for: idle-loop, walk-loop, attack, hurt, die.
Extra clips are fine; a def in games/<game>/defs/actors.json can name them."""
import math, random
from mz import Mesh, Rig, T, R, S


def cyc(length, n, fn):
    """n+1 keys over one loop; fn(phase 0..1) -> (rot) or (rot, loc)."""
    out = []
    for i in range(n + 1):
        v = fn(i / n)
        out.append((length * i / n,) + (v if isinstance(v[0], tuple) else (v,)))
    return out


def sn(p, off=0.0):
    return math.sin((p + off) * 2 * math.pi)


def lifted(p, off=0.0):
    return max(0.0, sn(p, off))


# ------------------------------------------------------------------ Gladiator Roach
def roach():
    rnd = random.Random(2)
    m = Mesh('roach')
    m.bone = 'body'
    for i in range(5):                                   # abdomen plates, overlapping
        y = 0.1 + i * 0.2
        s = 1.0 - abs(i - 1.2) * 0.14
        m.ball(0.3, at=(0, y, 0.36), mat='chitin' if i % 2 else 'chitin_red', seg=12, scale=(1.25 * s, 0.62, 0.62 * s))
    m.ball(0.2, at=(0, 0.45, 0.28), mat='flesh_pale', seg=10, scale=(1.3, 2.4, 0.6))        # soft underside
    for s in (-1, 1):
        m.tube([(s * 0.12, 0.95, 0.36), (s * 0.2, 1.2, 0.42), (s * 0.16, 1.4, 0.3)], lambda t: 0.035 * (1 - t), mat='chitin', seg=5)   # cerci
    m.ball(0.3, at=(0, -0.18, 0.4), mat='chitin', seg=12, scale=(1.15, 0.9, 0.7))             # thorax shield
    for s in (-1, 1):
        m.prism([(0, 0), (0.34, 0.1), (0.42, 0.4), (0.1, 0.45)], 0.03, at=(s * 0.05, -0.4, 0.56), rot=(8, s * -14, 0 if s > 0 else 180) if False else (8, 0, 0), mat='chitin_red') if False else None
        m.tube([(s * 0.2, -0.3, 0.58), (s * 0.34, -0.15, 0.7), (s * 0.3, 0.1, 0.66)], lambda t: 0.05 * (1 - t * 0.8), mat='bone', seg=5)   # shoulder spikes
    m.bone = 'head'
    m.ball(0.18, at=(0, -0.52, 0.36), mat='chitin_red', seg=10, scale=(1.2, 0.9, 0.8))
    for s in (-1, 1):
        m.ball(0.06, at=(s * 0.13, -0.6, 0.42), mat='eye', seg=8)
        m.ball(0.03, at=(s * 0.07, -0.66, 0.44), mat='eye', seg=6)
    for s, b in ((-1, 'mand_r'), (1, 'mand_l')):
        m.bone = b
        m.tube([(s * 0.1, -0.62, 0.3), (s * 0.22, -0.8, 0.28), (s * 0.12, -0.98, 0.27), (s * 0.02, -1.02, 0.27)], lambda t: 0.045 * (1 - t * 0.75), mat='bone', seg=6)
        m.tube([(s * 0.19, -0.82, 0.28), (s * 0.08, -0.84, 0.28)], lambda t: 0.02 * (1 - t), mat='bone', seg=4)
    for s, pre in ((-1, 'ant_r'), (1, 'ant_l')):
        pts = [(s * 0.08, -0.6, 0.48), (s * 0.2, -0.85, 0.7), (s * 0.34, -1.15, 0.78), (s * 0.44, -1.45, 0.66)]
        m.tube(pts, lambda t: 0.018 * (1 - t * 0.7), mat='chitin', seg=5, bones=[pre + '1', pre + '2', pre + '3'])
    legs = []
    for s in (-1, 1):
        for i, (y, ang) in enumerate(((-0.3, -35), (0.0, 0), (0.3, 35))):
            a = math.radians(ang)
            hip = (s * 0.26, y, 0.32)
            knee = (s * (0.26 + 0.5 * math.cos(a)), y + 0.5 * math.sin(a), 0.62)
            foot = (s * (0.26 + 0.95 * math.cos(a)), y + 0.95 * math.sin(a), 0.0)
            n = 'leg_%s%d' % ('l' if s > 0 else 'r', i + 1)
            m.bone = n + '_a'
            m.tube([hip, knee], lambda t: 0.055 - t * 0.02, mat='chitin', seg=6)
            m.ball(0.05, at=knee, mat='chitin_red', seg=6)
            m.bone = n + '_b'
            m.tube([knee, foot], lambda t: 0.04 * (1 - t * 0.8), mat='chitin', seg=6)
            for k in range(3):
                t = 0.25 + k * 0.2
                p = [knee[j] + (foot[j] - knee[j]) * t for j in range(3)]
                m.tube([p, (p[0] + s * 0.05, p[1], p[2] + 0.07)], lambda t: 0.012 * (1 - t), mat='bone', seg=4)
            legs.append((n, s, i, hip, knee, foot))
    ob = m.to_object()
    r = Rig('roach_rig')
    r.bone('body', (0, 0.6, 0.38), (0, -0.2, 0.4))
    r.bone('head', (0, -0.4, 0.38), (0, -0.7, 0.38), 'body')
    for s, b in ((-1, 'mand_r'), (1, 'mand_l')):
        r.bone(b, (s * 0.1, -0.62, 0.3), (s * 0.12, -0.98, 0.27), 'head')
    for s, pre in ((-1, 'ant_r'), (1, 'ant_l')):
        r.chain(pre, [(s * 0.08, -0.6, 0.48), (s * 0.2, -0.85, 0.7), (s * 0.34, -1.15, 0.78), (s * 0.44, -1.45, 0.66)], 'head')
    for (n, s, i, hip, knee, foot) in legs:
        r.bone(n + '_a', hip, knee, 'body')
        r.bone(n + '_b', knee, foot, n + '_a')
    r.build(ob)
    ants = {}
    for s, pre in ((-1, 'ant_r'), (1, 'ant_l')):
        ants[pre + '1'] = cyc(1.6, 8, lambda p, s=s: (10 * sn(p), 0, s * 12 * sn(p, 0.25)))
        ants[pre + '2'] = cyc(1.6, 8, lambda p, s=s: (14 * sn(p, 0.2), 0, s * 10 * sn(p, 0.5)))
    idle = dict(ants)
    idle['body'] = cyc(1.6, 4, lambda p: ((2 * sn(p), 0, 0), (0, 0, 0.015 * sn(p))))
    idle['mand_l'] = cyc(1.6, 4, lambda p: (0, 0, -8 * lifted(p)))
    idle['mand_r'] = cyc(1.6, 4, lambda p: (0, 0, 8 * lifted(p)))
    r.clip('idle-loop', 1.6, idle)
    walk = {}
    L = 0.4
    for (n, s, i, *_x) in legs:
        ph = 0.0 if (i % 2 == 0) == (s > 0) else 0.5
        walk[n + '_a'] = cyc(L, 8, lambda p, s=s, ph=ph: (0, -s * 26 * lifted(p, ph), s * 24 * math.cos((p + ph) * 2 * math.pi)))
        walk[n + '_b'] = cyc(L, 8, lambda p, s=s, ph=ph: (0, s * 14 * lifted(p, ph), 0))
    walk['body'] = cyc(L, 8, lambda p: ((0, 3 * sn(p), 2 * sn(p)), (0, 0, 0.02 * abs(sn(p)))))
    walk['ant_l1'] = cyc(L, 4, lambda p: (-20 + 6 * sn(p), 0, 0))
    walk['ant_r1'] = cyc(L, 4, lambda p: (-20 - 6 * sn(p), 0, 0))
    r.clip('walk-loop', L, walk)
    r.clip('attack', 0.5, {
        'body': [(0, (0, 0, 0), (0, 0, 0)), (0.16, (12, 0, 0), (0, 0.12, 0.05)), (0.28, (-10, 0, 0), (0, -0.35, 0.0)), (0.5, (0, 0, 0), (0, 0, 0))],
        'head': [(0, (0, 0, 0)), (0.16, (20, 0, 0)), (0.28, (-18, 0, 0)), (0.5, (0, 0, 0))],
        'mand_l': [(0, (0, 0, 0)), (0.16, (0, 0, -40)), (0.28, (0, 0, 22)), (0.5, (0, 0, 0))],
        'mand_r': [(0, (0, 0, 0)), (0.16, (0, 0, 40)), (0.28, (0, 0, -22)), (0.5, (0, 0, 0))],
    })
    r.clip('hurt', 0.25, {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.08, (14, 0, 6), (0, 0.1, 0.04)), (0.25, (0, 0, 0), (0, 0, 0))], 'head': [(0, (0, 0, 0)), (0.08, (25, 0, 0)), (0.25, (0, 0, 0))]})
    die = {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.2, (0, 70, 0), (0, 0, 0.35)), (0.45, (0, 172, 0), (0, 0, 0.3)), (0.6, (0, 180, 0), (0, 0, 0.22))]}
    for (n, s, i, *_x) in legs:
        die[n + '_a'] = [(0, (0, 0, 0)), (0.45, (0, -s * 20, 0)), (0.9, (0, s * 50, 0))]
        die[n + '_b'] = [(0, (0, 0, 0)), (0.45, (0, 0, 0)), (0.9, (0, s * 55, 0))]
    r.clip('die', 0.9, die)
    return ob, r


# ------------------------------------------------------------------ Custodian (maintenance robot)
def custodian():
    rnd = random.Random(3)
    m = Mesh('custodian')
    m.bone = 'body'
    m.lathe([(0.25, 1.05), (0.5, 1.15), (0.56, 1.5), (0.5, 1.8), (0.3, 1.92)], mat='hull', seg=12, smooth=False)
    m.cyl(0.57, 0.1, at=(0, 0, 1.5), mat='hazard', seg=12)
    m.box((0.4, 0.08, 0.3), at=(0, -0.52, 1.52), mat='hull_dark', bevel=0.03)
    for i in range(3):
        m.box((0.08, 0.03, 0.05), at=(-0.1 + i * 0.1, -0.57, 1.56), mat=('glow_amber', 'glow_red', 'glow_green')[i])
    m.box((0.3, 0.35, 0.5), at=(0, 0.5, 1.5), mat='rust', bevel=0.04)                         # backpack
    m.cyl(0.07, 0.6, at=(0.12, 0.55, 1.9), mat='trim', seg=8)
    m.ball(0.09, at=(0.12, 0.55, 2.22), mat='hull_dark', seg=8)
    m.bone = 'neck'
    m.tube([(0, -0.1, 1.9), (0, -0.2, 2.2), (0, -0.38, 2.38)], 0.06, mat='cable', seg=8)
    m.bone = 'head'
    m.box((0.5, 0.34, 0.24), at=(0, -0.45, 2.42), mat='hull', bevel=0.05)
    m.cyl(0.1, 0.1, at=(-0.1, -0.63, 2.43), rot=(90, 0, 0), mat='hull_dark', seg=12)
    m.cyl(0.075, 0.02, at=(-0.1, -0.69, 2.43), rot=(90, 0, 0), mat='eye_red', seg=12)
    for i in range(3):
        m.cyl(0.03, 0.03, at=(0.1 + (i % 2) * 0.08, -0.63, 2.38 + (i // 2) * 0.09 + (i % 2) * 0.03), rot=(90, 0, 0), mat='eye_red', seg=8)
    m.box((0.04, 0.04, 0.3), at=(0.2, -0.35, 2.66), mat='chrome')
    legs = []
    for i in range(3):
        a = math.radians(90 + i * 120)       # one leg behind, two in front
        cx, cy = math.cos(a), math.sin(a)
        hip = (0.42 * cx, 0.42 * cy, 1.2)
        knee = (1.0 * cx, 1.0 * cy, 1.45)
        foot = (1.15 * cx, 1.15 * cy, 0.0)
        n = 'leg%d' % (i + 1)
        m.bone = n + '_a'
        m.ball(0.14, at=hip, mat='trim', seg=10)
        m.tube([hip, knee], 0.08, mat='hull', seg=8)
        m.tube([(hip[0], hip[1], hip[2] + 0.1), (knee[0], knee[1], knee[2] + 0.08)], 0.025, mat='chrome', seg=6)
        m.bone = n + '_b'
        m.ball(0.13, at=knee, mat='accent', seg=10)
        m.tube([knee, (foot[0], foot[1], 0.12)], lambda t: 0.09 - t * 0.03, mat='hull_dark', seg=8)
        m.cyl(0.2, 0.12, at=(foot[0], foot[1], 0.06), r2=0.12, mat='rubber', seg=10)
        legs.append((n, i, hip, knee, foot, cx, cy))
    sh = (-0.55, -0.05, 1.7)
    el = (-0.95, -0.3, 1.45)
    wr = (-0.85, -0.85, 1.3)
    m.bone = 'arm_a'
    m.ball(0.17, at=sh, mat='trim', seg=10)
    m.tube([sh, el], 0.1, mat='accent', seg=8)
    m.bone = 'arm_b'
    m.ball(0.13, at=el, mat='trim', seg=10)
    m.tube([el, wr], 0.085, mat='hull', seg=8)
    m.tube([(el[0], el[1], el[2] + 0.1), (wr[0], wr[1], wr[2] + 0.1)], 0.02, mat='copper', seg=5)
    m.bone = 'hand'
    m.cyl(0.14, 0.18, at=wr, rot=(90, 0, 0), mat='hull_dark', seg=10)
    m.box((0.34, 0.5, 0.24), at=(wr[0], wr[1] - 0.3, wr[2]), mat='rust', bevel=0.05)            # a hammer head, once a floor polisher
    m.box((0.36, 0.1, 0.26), at=(wr[0], wr[1] - 0.52, wr[2]), mat='hazard', bevel=0.02)
    ob = m.to_object()
    r = Rig('custodian_rig')
    r.bone('body', (0, 0, 1.1), (0, 0, 1.9))
    r.bone('neck', (0, -0.1, 1.9), (0, -0.38, 2.38), 'body')
    r.bone('head', (0, -0.38, 2.38), (0, -0.7, 2.42), 'neck')
    for (n, i, hip, knee, foot, cx, cy) in legs:
        r.bone(n + '_a', hip, knee, 'body')
        r.bone(n + '_b', knee, foot, n + '_a')
    r.bone('arm_a', sh, el, 'body')
    r.bone('arm_b', el, wr, 'arm_a')
    r.bone('hand', wr, (wr[0], wr[1] - 0.5, wr[2]), 'arm_b')
    r.build(ob)
    r.clip('idle-loop', 2.4, {
        'head': cyc(2.4, 8, lambda p: (0, 0, 35 * sn(p))),
        'body': cyc(2.4, 4, lambda p: ((0, 0, 0), (0, 0, 0.02 * sn(p)))),
        'arm_b': cyc(2.4, 4, lambda p: (6 * sn(p), 0, 0)),
    })
    L = 1.0
    walk = {'body': cyc(L, 12, lambda p: ((3 * sn(p * 3), 0, 4 * sn(p)), (0, 0, 0.04 * abs(sn(p * 1.5))))), 'head': cyc(L, 4, lambda p: (0, 0, 10 * sn(p)))}
    for (n, i, hip, knee, foot, cx, cy) in legs:
        ph = i / 3
        # swing about the vertical, lift about the axis across the leg
        ax = (-cy, cx)
        walk[n + '_a'] = cyc(L, 12, lambda p, ph=ph, ax=ax: (ax[0] * -22 * lifted(p, ph), ax[1] * -22 * lifted(p, ph), 14 * math.cos((p + ph) * 2 * math.pi)))
        walk[n + '_b'] = cyc(L, 12, lambda p, ph=ph, ax=ax: (ax[0] * 14 * lifted(p, ph), ax[1] * 14 * lifted(p, ph), 0))
    walk['arm_a'] = cyc(L, 4, lambda p: (8 * sn(p), 0, 0))
    r.clip('walk-loop', L, walk)
    r.clip('attack', 1.0, {
        'arm_a': [(0, (0, 0, 0)), (0.45, (-95, 0, -25)), (0.6, (35, 0, 10)), (1.0, (0, 0, 0))],
        'arm_b': [(0, (0, 0, 0)), (0.45, (-40, 0, 0)), (0.6, (25, 0, 0)), (1.0, (0, 0, 0))],
        'body': [(0, (0, 0, 0)), (0.45, (-10, 0, 12)), (0.6, (14, 0, -8)), (1.0, (0, 0, 0))],
        'head': [(0, (0, 0, 0)), (0.45, (-15, 0, 0)), (0.6, (10, 0, 0)), (1.0, (0, 0, 0))],
    })
    r.clip('hurt', 0.3, {'body': [(0, (0, 0, 0)), (0.1, (-9, 0, 5)), (0.3, (0, 0, 0))], 'head': [(0, (0, 0, 0)), (0.1, (-25, 0, 20)), (0.3, (0, 0, 0))]})
    die = {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.5, (8, 0, 0), (0, 0, -0.5)), (0.9, (-24, 10, 0), (0, 0, -0.78))],
           'head': [(0, (0, 0, 0)), (0.5, (0, 0, 40)), (0.9, (55, 0, 40))],
           'arm_a': [(0, (0, 0, 0)), (0.9, (40, 0, 0))], 'arm_b': [(0, (0, 0, 0)), (0.9, (30, 0, 0))]}
    for (n, i, hip, knee, foot, cx, cy) in legs:
        ax = (-cy, cx)
        die[n + '_a'] = [(0, (0, 0, 0)), (0.5, (ax[0] * -30, ax[1] * -30, 0)), (0.9, (ax[0] * -48, ax[1] * -48, 0))]
        die[n + '_b'] = [(0, (0, 0, 0)), (0.5, (ax[0] * 20, ax[1] * 20, 0)), (0.9, (ax[0] * 30, ax[1] * 30, 0))]
    r.clip('die', 0.9, die)
    return ob, r


# ------------------------------------------------------------------ The Monoid (floats; one eye)
def monoid():
    rnd = random.Random(4)
    m = Mesh('monoid')
    Z = 1.6
    m.bone = 'body'
    m.ball(0.5, at=(0, 0, Z), mat='hull', seg=20)
    m.cyl(0.36, 0.25, at=(0, -0.36, Z), rot=(90, 0, 0), mat='hull_dark', seg=20)
    m.ball(0.27, at=(0, -0.36, Z), mat='eye', seg=16, scale=(1, 0.7, 1))
    m.ball(0.11, at=(0, -0.54, Z), mat='rubber', seg=10, scale=(0.5, 0.4, 1.5))            # a slit pupil
    m.ring(0.37, 0.04, at=(0, -0.48, Z), rot=(90, 0, 0), mat='copper', seg=24, tseg=6)
    for i in range(8):
        a = math.radians(i * 45 + 22)
        m.box((0.1, 0.1, 0.05), at=(0.5 * math.cos(a) * 0.96, 0.12, Z + 0.5 * math.sin(a) * 0.96), rot=(0, -math.degrees(a) + 90, 0), mat='accent2', bevel=0.02)
    m.cyl(0.2, 0.2, at=(0, 0, Z - 0.5), r2=0.32, mat='hull_dark', seg=12)
    m.cyl(0.16, 0.05, at=(0, 0, Z - 0.62), mat='glow_cyan', seg=12)
    m.cyl(0.03, 0.5, at=(0.15, 0.1, Z + 0.65), mat='chrome', seg=6)
    m.ball(0.05, at=(0.15, 0.1, Z + 0.92), mat='glow_pink', seg=8)
    m.box((0.2, 0.3, 0.12), at=(-0.1, 0.1, Z + 0.5), mat='hull_dark', bevel=0.03)
    for s, b in ((1, 'lid_top'), (-1, 'lid_bot')):
        m.bone = b
        m.lathe([(0.0, 0.0), (0.2, 0.03), (0.34, 0.12), (0.4, 0.26)], at=(0, -0.3, Z + s * 0.02), rot=(90 - s * 55, 0, 0), mat='hull', seg=16) if False else None
        m.prism([(-0.36, 0), (0.36, 0), (0.3, 0.2), (0.12, 0.3), (-0.12, 0.3), (-0.3, 0.2)], 0.05, at=(0, -0.5, Z + s * 0.04) if s > 0 else (0, -0.55, Z - 0.04), rot=(90, 0, 0) if s > 0 else (-90, 0, 0), mat='trim', bevel=0.012)
    m.bone = 'halo'
    m.ring(0.72, 0.03, at=(0, 0, Z + 0.1), rot=(12, 0, 0), mat='glow_cyan', seg=28, tseg=6)
    for i in range(3):
        a = math.radians(i * 120)
        m.box((0.16, 0.08, 0.1), at=(0.72 * math.cos(a), 0.72 * math.sin(a) * math.cos(math.radians(12)), Z + 0.1 + 0.72 * math.sin(a) * math.sin(math.radians(12))), rot=(12, 0, i * 120), mat='hull_dark', bevel=0.02)
    tents = []
    for i in range(4):
        a = math.radians(45 + i * 90)
        cx, cy = 0.24 * math.cos(a), 0.24 * math.sin(a)
        pts = [(cx, cy, Z - 0.55), (cx * 1.3, cy * 1.3, Z - 0.85), (cx * 1.5, cy * 1.5, Z - 1.15), (cx * 1.4, cy * 1.4, Z - 1.4), (cx * 1.2, cy * 1.2, Z - 1.55)]
        pre = 'tent%d_' % (i + 1)
        m.tube(pts, lambda t: 0.05 * (1 - t * 0.5), mat='cable', seg=7, bones=[pre + '1', pre + '2', pre + '3', pre + '4'])
        m.bone = pre + '4'
        tip = pts[-1]
        for k in range(3):
            b = math.radians(k * 120)
            m.tube([tip, (tip[0] + 0.06 * math.cos(b), tip[1] + 0.06 * math.sin(b), tip[2] - 0.1), (tip[0] + 0.02 * math.cos(b), tip[1] + 0.02 * math.sin(b), tip[2] - 0.2)], lambda t: 0.015 * (1 - t * 0.6), mat='chrome', seg=4)
        tents.append((pre, pts))
    ob = m.to_object()
    r = Rig('monoid_rig')
    r.bone('body', (0, 0, Z - 0.5), (0, 0, Z + 0.5))
    r.bone('lid_top', (0, -0.3, Z + 0.34), (0, -0.56, Z + 0.34), 'body')
    r.bone('lid_bot', (0, -0.3, Z - 0.34), (0, -0.56, Z - 0.34), 'body')
    r.bone('halo', (0, 0, Z + 0.1), (0, 0, Z + 0.4), 'body')
    for (pre, pts) in tents:
        r.chain(pre, pts, 'body')
    r.build(ob)

    def sway(L, amp, lag=0.12):
        d = {}
        for ti, (pre, pts) in enumerate(tents):
            for k in range(4):
                d[pre + str(k + 1)] = cyc(L, 8, lambda p, k=k, ti=ti: (amp * sn(p, -k * lag + ti * 0.25), amp * 0.7 * sn(p, -k * lag + 0.25 + ti * 0.25), 0))
        return d
    idle = sway(3.0, 10)
    idle['body'] = cyc(3.0, 8, lambda p: ((3 * sn(p), 0, 0), (0, 0, 0.08 * sn(p))))
    idle['halo'] = cyc(3.0, 12, lambda p: (0, 0, 360 * p))
    idle['lid_top'] = [(0, (0, 0, 0)), (2.6, (0, 0, 0)), (2.72, (-0, 0, 0), (0, 0, -0.26)), (2.84, (0, 0, 0), (0, 0, 0)), (3.0, (0, 0, 0))]
    idle['lid_bot'] = [(0, (0, 0, 0)), (2.6, (0, 0, 0)), (2.72, (0, 0, 0), (0, 0, 0.26)), (2.84, (0, 0, 0), (0, 0, 0)), (3.0, (0, 0, 0))]
    r.clip('idle-loop', 3.0, idle)
    walk = sway(1.2, 16)
    for (pre, pts) in tents:
        walk[pre + '1'] = cyc(1.2, 8, lambda p: (-30 + 8 * sn(p), 0, 0))
    walk['body'] = cyc(1.2, 8, lambda p: ((-12 + 2 * sn(p), 0, 3 * sn(p, 0.25)), (0, 0, 0.05 * sn(p))))
    walk['halo'] = cyc(1.2, 12, lambda p: (0, 0, 720 * p))
    r.clip('walk-loop', 1.2, walk)
    atk = {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.3, (14, 0, 0), (0, 0.12, 0.05)), (0.42, (-8, 0, 0), (0, -0.1, 0)), (0.8, (0, 0, 0), (0, 0, 0))],
           'lid_top': [(0, (0, 0, 0), (0, 0, 0)), (0.3, (0, 0, 0), (0, 0, -0.2)), (0.42, (0, 0, 0), (0, 0, 0.12)), (0.8, (0, 0, 0), (0, 0, 0))],
           'lid_bot': [(0, (0, 0, 0), (0, 0, 0)), (0.3, (0, 0, 0), (0, 0, 0.2)), (0.42, (0, 0, 0), (0, 0, -0.12)), (0.8, (0, 0, 0), (0, 0, 0))],
           'halo': [(0, (0, 0, 0)), (0.4, (0, 0, 180)), (0.8, (0, 0, 360))]}
    for ti, (pre, pts) in enumerate(tents):
        a = math.radians(45 + ti * 90)
        ox, oy = -math.sin(a), math.cos(a)
        atk[pre + '1'] = [(0, (0, 0, 0)), (0.3, (ox * 50, oy * 50, 0)), (0.42, (ox * -20, oy * -20, 0)), (0.8, (0, 0, 0))]
        atk[pre + '2'] = [(0, (0, 0, 0)), (0.3, (ox * 30, oy * 30, 0)), (0.42, (0, 0, 0)), (0.8, (0, 0, 0))]
    r.clip('attack', 0.8, atk)
    r.clip('hurt', 0.3, {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.1, (22, 0, 15), (0, 0.15, 0.05)), (0.3, (0, 0, 0), (0, 0, 0))],
                         'lid_top': [(0, (0, 0, 0), (0, 0, 0)), (0.1, (0, 0, 0), (0, 0, -0.26)), (0.3, (0, 0, 0), (0, 0, 0))]})
    die = {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.25, (30, 20, 0), (0, 0, 0.1)), (0.7, (70, 40, 20), (0, 0, -1.05)), (0.8, (80, 40, 20), (0, 0, -0.98)), (0.9, (84, 40, 20), (0, 0, -1.08))],
           'lid_top': [(0, (0, 0, 0), (0, 0, 0)), (0.7, (0, 0, 0), (0, 0, -0.3))],
           'halo': [(0, (0, 0, 0), (0, 0, 0)), (0.7, (50, 0, 90), (0.2, 0, -0.3))]}
    for ti, (pre, pts) in enumerate(tents):
        a = math.radians(45 + ti * 90)
        ox, oy = -math.sin(a), math.cos(a)
        for k in range(3):
            die[pre + str(k + 1)] = [(0, (0, 0, 0)), (0.7, (ox * 35, oy * 35, 0))]
    r.clip('die', 0.9, die)
    return ob, r


# ------------------------------------------------------------------ Glorexx (bio-weapon)
def glorexx():
    rnd = random.Random(5)
    m = Mesh('glorexx')
    m.bone = 'body'
    m.ball(0.55, at=(0, 0.1, 0.95), mat='flesh', seg=16, scale=(1.0, 1.5, 0.95))
    m.ball(0.5, at=(0, -0.45, 1.05), mat='flesh', seg=16, scale=(1.05, 1.0, 1.0))
    m.ball(0.35, at=(0, 0.2, 0.7), mat='flesh_pale', seg=12, scale=(1.0, 1.9, 0.7))
    for i in range(7):                                          # dorsal spines
        y = -0.6 + i * 0.22
        h = 0.5 - abs(i - 2.5) * 0.07
        m.tube([(0, y, 1.35 - abs(i - 2) * 0.04), (0, y + 0.1, 1.35 + h * 0.6), (0, y + 0.25, 1.35 + h)], lambda t: 0.06 * (1 - t), mat='bone', seg=5)
    for i in range(9):                                          # eyes scattered where a face should be
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(0.25, 0.42)
        m.ball(rnd.uniform(0.03, 0.065), at=(d * math.cos(a), -0.84 - rnd.uniform(0, 0.05) + abs(math.cos(a)) * 0.12, 1.08 + d * math.sin(a)), mat='eye', seg=8)
    for i in range(5):                                          # pustules
        m.ball(rnd.uniform(0.07, 0.12), at=(rnd.choice((-1, 1)) * rnd.uniform(0.35, 0.5), rnd.uniform(-0.3, 0.7), rnd.uniform(0.9, 1.25)), mat='slime', seg=8)
    for s, b in ((1, 'jaw_l'), (-1, 'jaw_r')):                  # the mouth opens sideways
        m.bone = b
        m.ball(0.3, at=(s * 0.16, -0.95, 1.0), mat='flesh', seg=12, scale=(0.55, 1.0, 1.25))
        m.ball(0.2, at=(s * 0.07, -0.98, 1.0), mat='chitin_red', seg=10, scale=(0.3, 0.9, 1.3))
        for k in range(6):
            z = 0.72 + k * 0.11
            m.tube([(s * 0.1, -1.12 - 0.05 * math.sin(k), z), (s * -0.02, -1.2, z + 0.01)], lambda t: 0.03 * (1 - t), mat='bone', seg=5)
    tail = [(0, 0.85, 0.95), (0, 1.3, 1.05), (0, 1.75, 0.95), (0, 2.1, 0.7), (0, 2.35, 0.75)]
    m.tube(tail, lambda t: 0.22 * (1 - t * 0.85), mat='flesh', seg=8, bones=['tail1', 'tail2', 'tail3', 'tail4'])
    m.bone = 'tail4'
    m.tube([tail[-1], (0, 2.6, 0.95), (0, 2.75, 0.8)], lambda t: 0.07 * (1 - t), mat='bone', seg=5)
    legs = []
    for s in (-1, 1):
        for f, y in (('f', -0.5), ('b', 0.55)):
            hip = (s * 0.42, y, 0.85)
            knee = (s * 0.72, y + (0.12 if f == 'f' else -0.15), 0.5 if f == 'f' else 0.62)
            foot = (s * 0.66, y - 0.08, 0.0)
            n = 'leg_%s%s' % (f, 'l' if s > 0 else 'r')
            m.bone = n + '_a'
            m.ball(0.22, at=hip, mat='flesh', seg=10)
            m.tube([hip, knee], lambda t: 0.18 - t * 0.06, mat='flesh', seg=8)
            m.bone = n + '_b'
            m.ball(0.13, at=knee, mat='bone', seg=8)
            m.tube([knee, (foot[0], foot[1], 0.08)], lambda t: 0.11 - t * 0.04, mat='flesh_pale', seg=8)
            for k in (-1, 0, 1):
                m.tube([(foot[0], foot[1], 0.07), (foot[0] + k * 0.1, foot[1] - 0.18, 0.05), (foot[0] + k * 0.13, foot[1] - 0.3, 0.0)], lambda t: 0.045 * (1 - t * 0.8), mat='bone', seg=5)
            legs.append((n, s, f, hip, knee, foot))
    ob = m.to_object()
    r = Rig('glorexx_rig')
    r.bone('body', (0, 0.6, 0.95), (0, -0.6, 1.0))
    r.bone('jaw_l', (0.3, -0.7, 1.0), (0.2, -1.2, 1.0), 'body')
    r.bone('jaw_r', (-0.3, -0.7, 1.0), (-0.2, -1.2, 1.0), 'body')
    r.chain('tail', tail, 'body')
    for (n, s, f, hip, knee, foot) in legs:
        r.bone(n + '_a', hip, knee, 'body')
        r.bone(n + '_b', knee, foot, n + '_a')
    r.build(ob)
    tailsw = lambda L, amp: {('tail%d' % (k + 1)): cyc(L, 8, lambda p, k=k: (0, 0, amp * sn(p, -k * 0.15))) for k in range(4)}
    idle = tailsw(2.2, 9)
    idle['body'] = cyc(2.2, 8, lambda p: ((2 * sn(p), 0, 0), (0, 0, 0.03 * sn(p))))
    idle['jaw_l'] = cyc(2.2, 8, lambda p: (0, 0, -10 * lifted(p)))
    idle['jaw_r'] = cyc(2.2, 8, lambda p: (0, 0, 10 * lifted(p)))
    r.clip('idle-loop', 2.2, idle)
    L = 0.6
    walk = tailsw(L, 14)
    for (n, s, f, *_x) in legs:
        ph = (0.0 if f == 'f' else 0.5) + (0.0 if s > 0 else 0.5)
        walk[n + '_a'] = cyc(L, 8, lambda p, ph=ph: (32 * math.cos((p + ph) * 2 * math.pi) - 10 * lifted(p, ph), 0, 0))
        walk[n + '_b'] = cyc(L, 8, lambda p, ph=ph: (-34 * lifted(p, ph), 0, 0))
    walk['body'] = cyc(L, 8, lambda p: ((4 * sn(p * 2), 0, 5 * sn(p)), (0, 0, 0.05 * sn(p * 2))))
    r.clip('walk-loop', L, walk)
    r.clip('attack', 0.6, {
        'body': [(0, (0, 0, 0), (0, 0, 0)), (0.22, (12, 0, 0), (0, 0.2, -0.08)), (0.34, (-12, 0, 0), (0, -0.5, 0.05)), (0.6, (0, 0, 0), (0, 0, 0))],
        'jaw_l': [(0, (0, 0, 0)), (0.22, (0, 0, -55)), (0.36, (0, 0, 6)), (0.6, (0, 0, 0))],
        'jaw_r': [(0, (0, 0, 0)), (0.22, (0, 0, 55)), (0.36, (0, 0, -6)), (0.6, (0, 0, 0))],
        'tail1': [(0, (0, 0, 0)), (0.22, (-25, 0, 0)), (0.6, (0, 0, 0))],
    })
    r.clip('hurt', 0.3, {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.1, (-12, 6, 8), (0, 0.15, 0)), (0.3, (0, 0, 0), (0, 0, 0))],
                         'jaw_l': [(0, (0, 0, 0)), (0.1, (0, 0, -35)), (0.3, (0, 0, 0))], 'jaw_r': [(0, (0, 0, 0)), (0.1, (0, 0, 35)), (0.3, (0, 0, 0))]})
    die = {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.35, (-10, 20, 0), (0, 0, -0.15)), (0.8, (0, 82, 0), (0, 0, -0.45)), (1.0, (0, 86, 0), (0, 0, -0.5))],
           'jaw_l': [(0, (0, 0, 0)), (0.5, (0, 0, -50)), (1.0, (0, 0, -30))], 'jaw_r': [(0, (0, 0, 0)), (0.5, (0, 0, 50)), (1.0, (0, 0, 20))],
           'tail1': [(0, (0, 0, 0)), (1.0, (0, 0, 30))], 'tail2': [(0, (0, 0, 0)), (1.0, (0, 0, 30))]}
    for (n, s, f, *_x) in legs:
        die[n + '_a'] = [(0, (0, 0, 0)), (0.4, (30, 0, 0)), (1.0, (-20, s * 25, 0))]
        die[n + '_b'] = [(0, (0, 0, 0)), (0.4, (-50, 0, 0)), (1.0, (-30, 0, 0))]
    r.clip('die', 1.0, die)
    return ob, r


# ------------------------------------------------------------------ ceiling turret (origin on the ceiling, hangs down)
def turret():
    m = Mesh('turret')
    m.bone = 'base'
    m.cyl(0.45, 0.12, at=(0, 0, -0.06), mat='hull_dark', seg=14)
    m.cyl(0.3, 0.2, at=(0, 0, -0.2), mat='trim', seg=12)
    for i in range(6):
        a = math.radians(i * 60)
        m.cyl(0.035, 0.03, at=(0.38 * math.cos(a), 0.38 * math.sin(a), -0.13), mat='hazard', seg=6)
    m.bone = 'yaw'
    m.ball(0.34, at=(0, 0, -0.55), mat='hull', seg=14)
    m.cyl(0.36, 0.08, at=(0, 0, -0.5), mat='accent', seg=14)
    m.box((0.14, 0.2, 0.3), at=(0, 0.3, -0.5), mat='hull_dark', bevel=0.03)
    m.bone = 'gun'
    for s in (-1, 1):
        m.cyl(0.05, 0.7, at=(s * 0.14, -0.5, -0.62), rot=(90, 0, 0), mat='hull_dark', seg=8)
        m.cyl(0.065, 0.12, at=(s * 0.14, -0.82, -0.62), rot=(90, 0, 0), mat='trim', seg=8)
        m.box((0.1, 0.3, 0.14), at=(s * 0.14, -0.25, -0.62), mat='trim', bevel=0.02)
    m.cyl(0.07, 0.06, at=(0, -0.33, -0.5), rot=(90, 0, 0), mat='eye_red', seg=10)
    m.box((0.4, 0.1, 0.06), at=(0, -0.2, -0.75), mat='hazard')
    ob = m.to_object()
    r = Rig('turret_rig')
    r.bone('base', (0, 0, 0), (0, 0, -0.3))
    r.bone('yaw', (0, 0, -0.3), (0, 0, -0.8), 'base')
    r.bone('gun', (0, -0.1, -0.6), (0, -0.8, -0.6), 'yaw')
    r.build(ob)
    r.clip('idle-loop', 4.0, {'yaw': cyc(4.0, 8, lambda p: (0, 0, 40 * sn(p))), 'gun': cyc(4.0, 4, lambda p: (6 * sn(p), 0, 0))})
    r.clip('walk-loop', 1.0, {'gun': cyc(1.0, 4, lambda p: (3 * sn(p), 0, 0))})
    r.clip('attack', 0.3, {'gun': [(0, (0, 0, 0), (0, 0, 0)), (0.05, (-4, 0, 0), (0, 0.12, 0)), (0.3, (0, 0, 0), (0, 0, 0))]})
    r.clip('hurt', 0.2, {'yaw': [(0, (0, 0, 0)), (0.07, (8, 0, 14)), (0.2, (0, 0, 0))]})
    r.clip('die', 0.7, {'yaw': [(0, (0, 0, 0)), (0.3, (10, 0, 60)), (0.7, (16, 0, 75))], 'gun': [(0, (0, 0, 0)), (0.4, (-50, 0, 0)), (0.55, (-66, 0, 0)), (0.7, (-60, 0, 0))]})
    return ob, r


ACTORS = {'roach': roach, 'custodian': custodian, 'monoid': monoid, 'glorexx': glorexx, 'turret': turret}
