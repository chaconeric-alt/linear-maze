"""Twelve more HaveNot monsters. `Build` wraps the things every actor needs (legs, swaying chains,
the five clips) so each one below is mostly its own shape. All face Blender's front view (-Y)."""
import math, random
from mz import Mesh, Rig, T, R, S
from actors import cyc, sn, lifted


class Build:
    def __init__(self, name):
        self.name = name
        self.m = Mesh(name)
        self.r = Rig(name + '_rig')
        self.legs = []
        self.chains = []
        self.extra = {}

    def bone(self, name, head, tail, parent=None):
        self.r.bone(name, head, tail, parent)
        return name

    def on(self, bone):
        self.m.bone = bone
        return self.m

    def leg(self, name, hip, knee, foot, parent='body', r=(0.08, 0.05), mats=('hull', 'hull_dark'), joint='trim', kind='sprawl', phase=0.0, pad=None):
        m = self.m
        m.bone = name + '_a'
        m.ball(r[0] * 1.5, at=hip, mat=joint, seg=8)
        m.tube([hip, knee], r[0], mat=mats[0], seg=7)
        m.bone = name + '_b'
        m.ball(r[0] * 1.3, at=knee, mat=joint, seg=8)
        m.tube([knee, (foot[0], foot[1], foot[2] + 0.04)], lambda t: r[0] + (r[1] - r[0]) * t, mat=mats[1], seg=7)
        if pad:
            m.cyl(pad, 0.08, at=(foot[0], foot[1], foot[2] + 0.04), r2=pad * 0.7, mat='rubber', seg=8)
        self.r.bone(name + '_a', hip, knee, parent)
        self.r.bone(name + '_b', knee, foot, name + '_a')
        out = (foot[0] - hip[0], foot[1] - hip[1])
        L = math.hypot(*out) or 1.0
        self.legs.append(dict(name=name, kind=kind, phase=phase, ax=(-out[1] / L, out[0] / L), side=1 if hip[0] >= 0 else -1))

    def chain(self, prefix, pts, radius, mat, parent='body', seg=7, sway=10.0):
        names = ['%s%d' % (prefix, i + 1) for i in range(len(pts) - 1)]
        self.m.tube(pts, radius, mat=mat, seg=seg, bones=names)
        self.r.chain(prefix, pts, parent)
        d = (pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1], pts[-1][2] - pts[0][2])
        self.chains.append(dict(names=names, sway=sway, vertical=abs(d[2]) > math.hypot(d[0], d[1])))
        return names

    def _sway(self, L, k=1.0):
        out = {}
        for ci, c in enumerate(self.chains):
            for i, n in enumerate(c['names']):
                a = c['sway'] * k
                if c['vertical']:
                    out[n] = cyc(L, 8, lambda p, i=i, ci=ci, a=a: (a * sn(p, -i * 0.13 + ci * 0.21), a * 0.7 * sn(p, -i * 0.13 + 0.25 + ci * 0.21), 0))
                else:
                    out[n] = cyc(L, 8, lambda p, i=i, ci=ci, a=a: (a * 0.6 * sn(p, -i * 0.13 + ci * 0.21), 0, a * sn(p, -i * 0.13 + 0.25 + ci * 0.21)))
        return out

    def finish(self, idle=2.4, walk=0.8, bob=0.03, swing=24, lift=22, attack=None, attack_len=0.6, die='roll', drop=0.4, die_len=0.9,
               idle_extra=None, walk_extra=None, die_extra=None, more=None, lean=0.0):
        ob = self.m.to_object()
        r = self.r
        r.build(ob)
        k = self._sway(idle)
        k['body'] = cyc(idle, 8, lambda p: ((1.5 * sn(p), 0, 0), (0, 0, bob * sn(p))))
        k.update(idle_extra or {})
        r.clip('idle-loop', idle, k)
        k = self._sway(walk, 1.5)
        for lg in self.legs:
            ph, ax, n = lg['phase'], lg['ax'], lg['name']
            if lg['kind'] == 'sprawl':
                k[n + '_a'] = cyc(walk, 8, lambda p, ph=ph, ax=ax: (ax[0] * -lift * lifted(p, ph), ax[1] * -lift * lifted(p, ph), swing * math.cos((p + ph) * 2 * math.pi)))
                k[n + '_b'] = cyc(walk, 8, lambda p, ph=ph, ax=ax: (ax[0] * lift * 0.6 * lifted(p, ph), ax[1] * lift * 0.6 * lifted(p, ph), 0))
            else:
                k[n + '_a'] = cyc(walk, 8, lambda p, ph=ph: (swing * math.cos((p + ph) * 2 * math.pi) - lift * 0.4 * lifted(p, ph), 0, 0))
                k[n + '_b'] = cyc(walk, 8, lambda p, ph=ph: (lift * 1.3 * lifted(p, ph), 0, 0))
        k['body'] = cyc(walk, 8, lambda p: ((lean + 2 * sn(p * 2), 3 * sn(p), 3 * sn(p)), (0, 0, bob * 1.5 * abs(sn(p)))))
        k.update(walk_extra or {})
        r.clip('walk-loop', walk, k)
        a = attack or {'body': [(0, (0, 0, 0), (0, 0, 0)), (attack_len * 0.4, (12, 0, 0), (0, 0.15, 0)), (attack_len * 0.6, (-14, 0, 0), (0, -0.4, 0)), (attack_len, (0, 0, 0), (0, 0, 0))]}
        r.clip('attack', attack_len, a)
        r.clip('hurt', 0.3, {'body': [(0, (0, 0, 0), (0, 0, 0)), (0.1, (10, 5, 8), (0, 0.12, 0)), (0.3, (0, 0, 0), (0, 0, 0))]})
        if die == 'roll':
            d = {'body': [(0, (0, 0, 0), (0, 0, 0)), (die_len * 0.4, (0, 40, 0), (0, 0, -drop * 0.3)), (die_len * 0.85, (0, 86, 0), (0, 0, -drop)), (die_len, (0, 84, 0), (0, 0, -drop))]}
        elif die == 'drop':
            d = {'body': [(0, (0, 0, 0), (0, 0, 0)), (die_len * 0.3, (20, 15, 0), (0, 0, 0.1)), (die_len * 0.8, (70, 30, 20), (0, 0, -drop)), (die_len * 0.9, (74, 30, 20), (0, 0, -drop + 0.06)), (die_len, (76, 30, 20), (0, 0, -drop))]}
        else:
            d = {'body': [(0, (0, 0, 0), (0, 0, 0)), (die_len * 0.5, (8, 0, 4), (0, 0, -drop * 0.6)), (die_len, (-20, 8, 10), (0, 0, -drop))]}
        for lg in self.legs:
            ax, n = lg['ax'], lg['name']
            if lg['kind'] == 'sprawl':
                d[n + '_a'] = [(0, (0, 0, 0)), (die_len, (ax[0] * -40, ax[1] * -40, 0))]
                d[n + '_b'] = [(0, (0, 0, 0)), (die_len, (ax[0] * 40, ax[1] * 40, 0))]
            else:
                d[n + '_a'] = [(0, (0, 0, 0)), (die_len, (-50, 0, lg['side'] * 20))]
                d[n + '_b'] = [(0, (0, 0, 0)), (die_len, (70, 0, 0))]
        for c in self.chains:
            for n in c['names'][:2]:
                d.setdefault(n, [(0, (0, 0, 0)), (die_len, (25, 15, 0))])
        d.update(die_extra or {})
        r.clip('die', die_len, d)
        for nm, (ln, keys) in (more or {}).items():
            r.clip(nm, ln, keys)
        return ob, r


def K(*keys):
    return list(keys)


# ---------------------------------------------------------------- 1. Eggbot
def eggbot():
    b = Build('eggbot')
    b.bone('body', (0, 0, 0.9), (0, 0, 1.9))
    m = b.on('body')
    m.ball(0.5, at=(0, 0, 1.4), mat='egg', seg=20, scale=(1.0, 1.0, 1.35))
    m.cyl(0.505, 0.1, at=(0, 0, 1.3), mat='glow_pink', seg=20, caps=False)
    for i in range(9):                                 # a zig-zag seam, like a cracked shell
        a0, a1 = math.radians(i * 40), math.radians(i * 40 + 20)
        m.tube([(0.5 * math.cos(a0), 0.5 * math.sin(a0), 1.48), (0.49 * math.cos(a1), 0.49 * math.sin(a1), 1.6), (0.5 * math.cos(a0 + math.radians(40)), 0.5 * math.sin(a0 + math.radians(40)), 1.48)], 0.012, mat='hull_dark', seg=4)
    m.box((0.42, 0.1, 0.12), at=(0, -0.44, 1.62), mat='hull_dark', bevel=0.03)
    m.box((0.34, 0.03, 0.05), at=(0, -0.49, 1.62), mat='eye_red')
    m.cyl(0.07, 0.3, at=(0, -0.5, 1.2), rot=(90, 0, 0), mat='hull_dark', seg=8)
    m.cyl(0.04, 0.2, at=(0, -0.72, 1.2), rot=(90, 0, 0), mat='chrome', seg=8)
    m.cyl(0.02, 0.4, at=(0.1, 0.1, 2.2), mat='chrome', seg=5)
    m.ball(0.05, at=(0.1, 0.1, 2.42), mat='glow_pink', seg=8)
    for s in (-1, 1):
        m.box((0.1, 0.3, 0.3), at=(s * 0.5, 0.05, 1.15), mat='brass', bevel=0.03)
        b.leg('leg_%s' % ('l' if s > 0 else 'r'), (s * 0.3, 0.05, 0.95), (s * 0.34, 0.4, 0.55), (s * 0.34, -0.05, 0.0), r=(0.06, 0.04), mats=('brass', 'hull_dark'),
              kind='under', phase=0 if s > 0 else 0.5)
        m = b.on('leg_%s_b' % ('l' if s > 0 else 'r'))
        for t in (-0.12, 0, 0.12):
            m.tube([(s * 0.34, -0.05, 0.05), (s * 0.34 + t, -0.32, 0.02)], lambda q: 0.03 * (1 - q * 0.6), mat='brass', seg=5)
    return b.finish(walk=0.5, bob=0.04, swing=34, lift=30, die='roll', drop=0.75, lean=6,
                    attack={'body': K((0, (0, 0, 0), (0, 0, 0)), (0.2, (-14, 0, 0), (0, 0.06, -0.08)), (0.3, (6, 0, 0), (0, 0.1, 0)), (0.5, (0, 0, 0), (0, 0, 0)))}, attack_len=0.5)


# ---------------------------------------------------------------- 2. Grease Monkey
def grease_monkey():
    rnd = random.Random(2)
    b = Build('grease_monkey')
    b.bone('body', (0, 0.35, 1.0), (0, -0.35, 1.5))
    b.bone('head', (0, -0.4, 1.55), (0, -0.75, 1.6), 'body')
    m = b.on('body')
    m.ball(0.5, at=(0, 0.0, 1.25), mat='rust', seg=14, scale=(1.15, 1.3, 0.9), rot=(-20, 0, 0))
    m.ball(0.4, at=(0, 0.3, 1.05), mat='hull_dark', seg=12, scale=(1.0, 1.0, 0.8))
    for s in (-1, 1):                                   # exhaust stacks
        m.cyl(0.07, 0.6, at=(s * 0.25, 0.35, 1.75), rot=(-12, 0, 0), mat='trim', seg=8)
        m.cyl(0.09, 0.08, at=(s * 0.25, 0.41, 2.05), rot=(-12, 0, 0), mat='rust', seg=8)
    for i in range(5):                                  # grease running off it
        x, y = rnd.uniform(-0.5, 0.5), rnd.uniform(-0.3, 0.4)
        m.tube([(x, y, 1.0), (x, y, 0.75 - rnd.random() * 0.2)], lambda t: 0.035 * (1 - t * 0.6), mat='grease', seg=5)
    m.ball(0.3, at=(0.1, 0.1, 1.55), mat='grease', seg=10, scale=(1.4, 1.2, 0.3))
    m = b.on('head')
    m.ball(0.26, at=(0, -0.55, 1.6), mat='hull_dark', seg=12, scale=(1.1, 1.0, 0.9))
    m.box((0.44, 0.08, 0.1), at=(0, -0.78, 1.62), mat='glow_green')
    m.box((0.5, 0.2, 0.06), at=(0, -0.7, 1.72), mat='rust', bevel=0.02)
    m.box((0.3, 0.14, 0.12), at=(0, -0.76, 1.46), mat='trim', bevel=0.02)           # a jaw like a vice
    for s in (-1, 1):
        n = 'arm_%s' % ('l' if s > 0 else 'r')
        b.leg(n, (s * 0.62, -0.2, 1.4), (s * 0.85, -0.5, 0.75), (s * 0.7, -0.85, 0.0), r=(0.11, 0.09), mats=('rust', 'hull_dark'), kind='under', phase=0 if s > 0 else 0.5)
        m = b.on(n + '_b')
        m.ball(0.17, at=(s * 0.7, -0.87, 0.12), mat='trim', seg=8, scale=(1, 1.2, 0.8))
        b.leg('leg_%s' % ('l' if s > 0 else 'r'), (s * 0.3, 0.45, 0.9), (s * 0.45, 0.3, 0.45), (s * 0.4, 0.5, 0.0), r=(0.09, 0.07), mats=('hull_dark', 'rust'), kind='under',
              phase=0.5 if s > 0 else 0.0, pad=0.14)
    m = b.on('arm_r_b')                                 # the wrench
    m.box((0.06, 0.08, 0.9), at=(-0.74, -1.0, 0.5), rot=(40, 0, 0), mat='chrome', bevel=0.015)
    m.box((0.08, 0.26, 0.2), at=(-0.74, -1.3, 0.84), rot=(40, 0, 0), mat='chrome', bevel=0.02)
    atk = {'arm_r_a': K((0, (0, 0, 0)), (0.3, (-110, 0, -20)), (0.42, (30, 0, 0)), (0.8, (0, 0, 0))), 'arm_r_b': K((0, (0, 0, 0)), (0.3, (-30, 0, 0)), (0.42, (20, 0, 0)), (0.8, (0, 0, 0))),
           'body': K((0, (0, 0, 0)), (0.3, (-14, 0, 14)), (0.42, (16, 0, -8)), (0.8, (0, 0, 0))), 'head': K((0, (0, 0, 0)), (0.3, (-20, 0, 0)), (0.8, (0, 0, 0)))}
    return b.finish(walk=0.7, swing=28, lift=26, attack=atk, attack_len=0.8, die='collapse', drop=0.6, lean=4,
                    idle_extra={'head': cyc(2.4, 8, lambda p: (4 * sn(p * 2), 0, 22 * sn(p)))})


# ---------------------------------------------------------------- 3. The Dancer
def dancer():
    b = Build('dancer')
    b.bone('body', (0, 0, 1.3), (0, 0, 2.2))
    b.bone('head', (0, 0, 2.3), (0, 0, 2.7), 'body')
    m = b.on('body')
    m.lathe([(0.05, 1.25), (0.22, 1.4), (0.12, 1.8), (0.26, 2.15), (0.1, 2.3)], mat='mirror', seg=14)
    m.lathe([(0.55, 1.3), (0.5, 1.36), (0.24, 1.44)], mat='petal', seg=24)
    m.ring(0.56, 0.03, at=(0, 0, 1.3), mat='glow_pink', seg=28, tseg=5)                     # a tutu of light
    m.ring(0.55, 0.02, at=(0, 0, 1.3), mat='gold', seg=28, tseg=5)
    m = b.on('head')
    m.ball(0.24, at=(0, 0, 2.5), mat='mirror', seg=8)                                              # a mirror ball
    m.ring(0.3, 0.015, at=(0, 0, 2.5), rot=(20, 0, 0), mat='glow_pink', seg=20, tseg=4)
    m.cyl(0.03, 0.1, at=(0, 0, 2.34), mat='gold', seg=6)
    for i in range(4):
        a = math.radians(45 + i * 90)
        cx, cy = math.cos(a), math.sin(a)
        b.leg('leg%d' % (i + 1), (0.12 * cx, 0.12 * cy, 1.3), (0.75 * cx, 0.75 * cy, 1.5), (0.95 * cx, 0.95 * cy, 0.0), r=(0.035, 0.012), mats=('mirror', 'chrome'), joint='gold', phase=i * 0.25)
        n = 'arm%d' % (i + 1)
        b.bone(n, (0.2 * cx, 0.2 * cy, 2.1), (0.9 * cx, 0.9 * cy, 2.2), 'body')
        m = b.on(n)
        m.tube([(0.2 * cx, 0.2 * cy, 2.1), (0.6 * cx, 0.6 * cy, 2.2)], 0.025, mat='chrome', seg=6)
        m.push(T(0.6 * cx, 0.6 * cy, 2.2) @ R(0, 0, math.degrees(a)))
        for k in range(5):                              # a fan of blades
            m.prism([(0, -0.02), (0.6, -0.05), (0.66, 0), (0.6, 0.05), (0, 0.02)], 0.008, at=(0, 0, 0), rot=(0, -8 + k * 4, -40 + k * 20), mat='mirror' if k % 2 else 'gold')
        m.pop()
    spin = cyc(0.7, 12, lambda p: (0, 0, 720 * p if False else 360 * p))
    atk = {'body': K((0, (0, 0, 0), (0, 0, 0)), (0.2, (0, 0, 120), (0, 0, 0.1)), (0.4, (0, 0, 240), (0, -0.3, 0)), (0.7, (0, 0, 360), (0, 0, 0)))}
    for i in range(4):
        a = math.radians(45 + i * 90)
        ax = (-math.sin(a), math.cos(a))
        atk['arm%d' % (i + 1)] = K((0, (0, 0, 0)), (0.2, (ax[0] * 30, ax[1] * 30, 0)), (0.5, (ax[0] * 30, ax[1] * 30, 0)), (0.7, (0, 0, 0)))
    arms_idle = {('arm%d' % (i + 1)): cyc(3.0, 8, lambda p, i=i: (12 * sn(p, i * 0.25), 12 * sn(p, i * 0.25 + 0.25), 0)) for i in range(4)}
    arms_idle['head'] = cyc(3.0, 12, lambda p: (0, 0, 360 * p))
    return b.finish(idle=3.0, walk=0.5, bob=0.06, swing=30, lift=20, attack=atk, attack_len=0.7, die='collapse', drop=1.1, idle_extra=arms_idle,
                    walk_extra={'head': cyc(0.5, 8, lambda p: (0, 0, 360 * p))})


# ---------------------------------------------------------------- 4. Snapper (it stays where it is planted)
def snapper():
    rnd = random.Random(4)
    b = Build('snapper')
    b.bone('body', (0, 0, 0), (0, 0, 0.5))
    m = b.on('body')
    m.ball(0.6, at=(0, 0, 0.3), mat='leaf', seg=14, scale=(1.0, 1.0, 0.7))
    for i in range(7):
        a = i * 0.9
        m.lathe([(0.0, 0), (0.22, 0.25), (0.0, 0.9)], at=(0.45 * math.cos(a), 0.45 * math.sin(a), 0.2), rot=(55 * math.sin(a), -55 * math.cos(a), 0), mat='leaf', seg=6, smooth=False)
    for i in range(5):
        a = i * 1.26 + 0.4
        b.chain('root%d_' % i, [(0.4 * math.cos(a), 0.4 * math.sin(a), 0.15), (0.9 * math.cos(a), 0.9 * math.sin(a), 0.25), (1.4 * math.cos(a + 0.3), 1.4 * math.sin(a + 0.3), 0.05)],
                lambda t: 0.09 * (1 - t * 0.8), 'bone', sway=6)
    stalk = [(0, 0, 0.5), (0, 0.15, 1.1), (0, 0.05, 1.7), (0, -0.3, 2.15), (0, -0.7, 2.3)]
    names = b.chain('stalk', stalk, lambda t: 0.16 - t * 0.05, 'leaf', sway=7)
    for i, p in enumerate(stalk[1:4]):
        m = b.on(names[i + 1])
        for s in (-1, 1):
            m.tube([p, (p[0] + s * 0.25, p[1], p[2] + 0.12)], lambda t: 0.035 * (1 - t), mat='bone', seg=4)
    b.bone('head', (0, -0.7, 2.3), (0, -1.2, 2.3), names[-1])
    for nm, s in (('jaw_top', 1), ('jaw_bot', -1)):
        b.bone(nm, (0, -0.75, 2.3 + s * 0.08), (0, -1.6, 2.3 + s * 0.3), 'head')
        m = b.on(nm)
        m.ball(0.42, at=(0, -1.15, 2.3 + s * 0.2), mat='petal', seg=14, scale=(0.95, 1.25, 0.42))
        m.ball(0.36, at=(0, -1.15, 2.3 + s * 0.1), mat='flesh_pale', seg=12, scale=(0.9, 1.2, 0.2))
        for k in range(9):
            a = math.radians(-70 + k * 17.5)
            m.tube([(0.36 * math.sin(a), -1.15 - 0.45 * math.cos(a), 2.3 + s * 0.12), (0.34 * math.sin(a), -1.15 - 0.43 * math.cos(a), 2.3 - s * 0.08)], lambda t: 0.03 * (1 - t), mat='bone', seg=4)
        for k in range(3):
            m.ball(0.06, at=(-0.2 + k * 0.2, -1.0, 2.3 + s * 0.38), mat='eye', seg=8)
    m = b.on('head')
    m.ball(0.2, at=(0, -0.8, 2.3), mat='leaf', seg=10)
    m.tube([(0, -0.9, 2.3), (0, -1.3, 2.28), (0, -1.55, 2.4)], lambda t: 0.06 * (1 - t * 0.6), mat='flesh', seg=6)       # the tongue
    gape = lambda L, deg: {'jaw_top': cyc(L, 8, lambda p: (deg * lifted(p), 0, 0)), 'jaw_bot': cyc(L, 8, lambda p: (-deg * lifted(p), 0, 0))}
    atk = {'stalk1': K((0, (0, 0, 0)), (0.25, (20, 0, 0)), (0.4, (-30, 0, 0)), (0.8, (0, 0, 0))), 'stalk2': K((0, (0, 0, 0)), (0.25, (25, 0, 0)), (0.4, (-35, 0, 0)), (0.8, (0, 0, 0))),
           'stalk3': K((0, (0, 0, 0)), (0.25, (10, 0, 0)), (0.4, (-25, 0, 0)), (0.8, (0, 0, 0))),
           'jaw_top': K((0, (0, 0, 0)), (0.25, (45, 0, 0)), (0.42, (-4, 0, 0)), (0.8, (0, 0, 0))), 'jaw_bot': K((0, (0, 0, 0)), (0.25, (-45, 0, 0)), (0.42, (4, 0, 0)), (0.8, (0, 0, 0)))}
    die = {'stalk1': K((0, (0, 0, 0)), (1.0, (-40, 0, 20))), 'stalk2': K((0, (0, 0, 0)), (1.0, (-50, 0, 10))), 'stalk3': K((0, (0, 0, 0)), (1.0, (-40, 0, 0))),
           'jaw_top': K((0, (0, 0, 0)), (0.5, (40, 0, 0)), (1.0, (25, 0, 0))), 'body': K((0, (0, 0, 0), (0, 0, 0)), (1.0, (0, 0, 0), (0, 0, 0)))}
    return b.finish(idle=3.0, walk=1.5, bob=0.0, attack=atk, attack_len=0.8, die='collapse', drop=0.0, die_len=1.0, idle_extra=gape(3.0, 14), walk_extra=gape(1.5, 28), die_extra=die)


# ---------------------------------------------------------------- 5. Deadbot
def deadbot():
    b = Build('deadbot')
    b.bone('body', (0, 0, 1.0), (0, 0, 1.75))
    b.bone('head', (0, 0, 1.8), (0, -0.1, 2.15), 'body')
    m = b.on('body')
    m.tube([(0, 0.08, 0.95), (0, 0.12, 1.3), (0, 0.06, 1.75)], 0.05, mat='bone', seg=6)
    for i in range(6):
        z = 1.2 + i * 0.1
        w = 0.26 - abs(i - 2.5) * 0.03
        pts = [(w * math.cos(math.radians(a)), 0.1 - w * 0.9 * math.sin(math.radians(a)), z - 0.04 * math.sin(math.radians(a))) for a in range(-20, 201, 20)]
        m.tube(pts, 0.018, mat='bone', seg=5)
    m.ball(0.12, at=(0, -0.02, 1.4), mat='glow_violet', seg=10)                       # what keeps it going
    m.box((0.42, 0.14, 0.14), at=(0, 0.06, 1.0), mat='hull_dark', bevel=0.04)
    m.box((0.56, 0.12, 0.1), at=(0, 0.08, 1.74), mat='hull_dark', bevel=0.03)
    for s in (-1, 1):                                   # what is left of a suit
        m.prism([(0, 0), (0.3, 0.02), (0.34, -0.5), (0.2, -0.75), (0.02, -0.6)], 0.01, at=(s * 0.05, 0.16, 1.72), rot=(90, 0, 0 if s > 0 else 180), mat='shroud')
    m = b.on('head')
    m.ball(0.17, at=(0, -0.04, 2.0), mat='bone', seg=12, scale=(0.9, 1.05, 1.1))
    m.box((0.2, 0.14, 0.12), at=(0, -0.1, 1.86), mat='bone', bevel=0.03)
    for s in (-1, 1):
        m.ball(0.05, at=(s * 0.07, -0.18, 2.02), mat='rubber', seg=8)
        m.ball(0.022, at=(s * 0.07, -0.21, 2.02), mat='glow_violet', seg=6)
    for k in range(5):
        m.box((0.022, 0.02, 0.06), at=(-0.07 + k * 0.035, -0.17, 1.83), mat='chrome')
    m.box((0.36, 0.3, 0.03), at=(0, 0.0, 2.2), mat='shroud', bevel=0.01)             # a mortarboard: employee of the century, once
    for s in (-1, 1):
        n = 'arm_%s' % ('l' if s > 0 else 'r')
        b.leg(n, (s * 0.3, 0.06, 1.72), (s * 0.42, 0.0, 1.2), (s * 0.4, -0.3, 0.75), r=(0.035, 0.028), mats=('bone', 'bone'), joint='hull_dark', kind='under', phase=0.5 if s > 0 else 0)
        m = b.on(n + '_b')
        for k in range(4):
            m.tube([(s * 0.4, -0.3, 0.78), (s * 0.4 + (k - 1.5) * 0.05, -0.42, 0.68), (s * 0.4 + (k - 1.5) * 0.06, -0.46, 0.55)], lambda t: 0.014 * (1 - t * 0.5), mat='chrome', seg=4)
        b.leg('leg_%s' % ('l' if s > 0 else 'r'), (s * 0.15, 0.05, 0.95), (s * 0.17, -0.06, 0.5), (s * 0.17, 0.04, 0.0), r=(0.045, 0.035), mats=('bone', 'bone'), joint='hull_dark', kind='under',
              phase=0 if s > 0 else 0.5, pad=0.09)
    b.legs = [l for l in b.legs]
    atk = {'arm_l_a': K((0, (0, 0, 0)), (0.25, (-120, 0, 0)), (0.4, (-50, 0, -20)), (0.7, (0, 0, 0))), 'arm_r_a': K((0, (0, 0, 0)), (0.25, (-120, 0, 0)), (0.4, (-50, 0, 20)), (0.7, (0, 0, 0))),
           'body': K((0, (0, 0, 0)), (0.25, (10, 0, 0)), (0.4, (-20, 0, 0)), (0.7, (0, 0, 0))), 'head': K((0, (0, 0, 0)), (0.25, (25, 0, 0)), (0.4, (-20, 0, 0)), (0.7, (0, 0, 0)))}
    kneel = {'body': K((0, (-30, 0, 0), (0, -0.1, -0.5)), (2, (-30, 0, 0), (0, -0.1, -0.5))), 'head': K((0, (-40, 0, 0)), (2, (-40, 0, 0))),
             'leg_l_a': K((0, (-70, 0, 0)), (2, (-70, 0, 0))), 'leg_r_a': K((0, (-70, 0, 0)), (2, (-70, 0, 0))), 'leg_l_b': K((0, (120, 0, 0)), (2, (120, 0, 0))), 'leg_r_b': K((0, (120, 0, 0)), (2, (120, 0, 0))),
             'arm_l_a': K((0, (20, 0, 0)), (2, (20, 0, 0))), 'arm_r_a': K((0, (20, 0, 0)), (2, (20, 0, 0)))}
    return b.finish(walk=1.0, swing=22, lift=24, attack=atk, attack_len=0.7, die='collapse', drop=0.8, lean=8,
                    idle_extra={'head': cyc(2.4, 8, lambda p: (0, 8 * sn(p), 14 * sn(p * 2)))}, more={'dormant-loop': (2.0, kneel)})


# ---------------------------------------------------------------- 6. Desktop Defender
def defender():
    b = Build('defender')
    b.bone('body', (0, 0.2, 0.3), (0, -0.2, 0.3))
    b.bone('jaw', (0, 0.22, 0.42), (0, -0.3, 0.46), 'body')
    m = b.on('body')
    m.box((0.4, 0.6, 0.14), at=(0, 0, 0.3), mat='hull', bevel=0.04)
    m.box((0.3, 0.5, 0.03), at=(0, -0.02, 0.385), mat='chrome')
    for k in range(8):
        m.box((0.02, 0.02, 0.05), at=(-0.105 + k * 0.03, -0.24, 0.4), mat='chrome')
    m.box((0.42, 0.1, 0.05), at=(0, 0.26, 0.28), mat='accent', bevel=0.015)
    m = b.on('jaw')
    m.box((0.36, 0.58, 0.1), at=(0, -0.03, 0.5), rot=(-6, 0, 0), mat='accent', bevel=0.035)
    m.box((0.2, 0.06, 0.04), at=(0, -0.31, 0.5), mat='eye_red')
    m.cyl(0.012, 0.22, at=(0.12, 0.2, 0.66), mat='chrome', seg=5)
    m.ball(0.025, at=(0.12, 0.2, 0.78), mat='glow_red', seg=6)
    i = 0
    for s in (-1, 1):
        for y in (-0.18, 0.18):
            b.leg('leg%d' % (i + 1), (s * 0.2, y, 0.28), (s * 0.42, y * 1.3, 0.42), (s * 0.5, y * 1.6, 0.0), r=(0.025, 0.012), mats=('chrome', 'hull_dark'), joint='hull_dark',
                  phase=0 if (i in (0, 3)) else 0.5)
            i += 1
    snap = lambda L, n: {'jaw': cyc(L, 8, lambda p: (22 * lifted(p * n), 0, 0))}
    atk = {'jaw': K((0, (0, 0, 0)), (0.12, (45, 0, 0)), (0.2, (-4, 0, 0)), (0.4, (0, 0, 0))), 'body': K((0, (0, 0, 0), (0, 0, 0)), (0.12, (10, 0, 0), (0, 0.1, 0.1)), (0.2, (-10, 0, 0), (0, -0.3, 0.2)), (0.4, (0, 0, 0), (0, 0, 0)))}
    return b.finish(idle=1.6, walk=0.3, bob=0.02, swing=30, lift=30, attack=atk, attack_len=0.4, die='roll', drop=0.1, die_len=0.6, idle_extra=snap(1.6, 2), walk_extra=snap(0.3, 1))


# ---------------------------------------------------------------- 7. The Sphinx Gun (it does not move; it asks)
def sphinx():
    b = Build('sphinx')
    b.bone('body', (0, 0.9, 0.9), (0, -0.5, 1.1))
    b.bone('head', (0, -0.7, 1.5), (0, -0.9, 2.3), 'body')
    m = b.on('body')
    m.box((1.5, 2.9, 0.4), at=(0, 0.1, 0.2), mat='hull_dark', bevel=0.06)
    m.box((1.56, 2.96, 0.06), at=(0, 0.1, 0.38), mat='gold')
    m.ball(0.55, at=(0, 0.5, 0.95), mat='hull', seg=16, scale=(1.0, 1.9, 0.85))
    m.ball(0.5, at=(0, -0.55, 1.15), mat='hull', seg=16, scale=(1.05, 1.0, 1.15))
    for s in (-1, 1):
        m.ball(0.3, at=(s * 0.5, 1.0, 0.7), mat='hull', seg=12, scale=(0.8, 1.5, 1.0))            # haunches
        m.box((0.3, 1.3, 0.28), at=(s * 0.42, -1.0, 0.56), mat='hull', bevel=0.1)                  # forelegs laid out in front
        for k in range(3):
            m.box((0.07, 0.2, 0.06), at=(s * 0.42 + (k - 1) * 0.09, -1.62, 0.5), mat='gold', bevel=0.015)
        m.tube([(s * 0.5, 0.3, 1.25), (s * 0.62, 0.9, 1.1), (s * 0.5, 1.5, 0.75)], 0.04, mat='gold', seg=6)
    m.tube([(0, 1.5, 0.7), (0.5, 1.75, 0.5), (0.8, 1.3, 0.45), (0.85, 0.8, 0.5)], lambda t: 0.07 * (1 - t * 0.4), mat='hull', seg=6)       # the tail
    m.box((0.9, 0.04, 0.5), at=(0, -0.52, 0.66), rot=(-8, 0, 0), mat='screen')                                                 # where the question appears
    m = b.on('head')
    m.prism([(-0.62, 0), (0.62, 0), (0.42, 0.95), (0.3, 1.05), (-0.3, 1.05), (-0.42, 0.95)], 0.5, at=(0, -0.45, 1.42), rot=(90, 0, 0), mat='accent2', bevel=0.03)   # the headdress
    for k in range(6):
        m.box((1.2 - k * 0.07, 0.52, 0.035), at=(0, -0.7, 1.52 + k * 0.14), mat='gold')
    m.ball(0.34, at=(0, -0.88, 1.95), mat='hull_dark', seg=14, scale=(0.9, 0.7, 1.1))               # where a face would be: a muzzle
    m.cyl(0.14, 0.5, at=(0, -1.15, 1.95), rot=(90, 0, 0), mat='hull_dark', seg=12)
    m.cyl(0.1, 0.06, at=(0, -1.41, 1.95), rot=(90, 0, 0), mat='glow_amber', seg=12)
    for k in range(6):
        a = math.radians(k * 60)
        m.cyl(0.035, 0.42, at=(0.2 * math.cos(a), -1.12, 1.95 + 0.2 * math.sin(a)), rot=(90, 0, 0), mat='chrome', seg=6)
    for s in (-1, 1):
        m.ball(0.06, at=(s * 0.2, -1.05, 2.22), mat='eye', seg=8)
    m.tube([(0, -1.0, 2.5), (0, -1.15, 2.62), (0, -1.1, 2.75)], 0.03, mat='gold', seg=5)           # the uraeus
    idle = {'head': cyc(4.0, 8, lambda p: (0, 0, 28 * sn(p)))}
    atk = {'head': K((0, (0, 0, 0), (0, 0, 0)), (0.06, (8, 0, 0), (0, 0.12, 0)), (0.4, (0, 0, 0), (0, 0, 0)))}
    die = {'head': K((0, (0, 0, 0)), (0.5, (-30, 10, 30)), (1.0, (-50, 14, 40))), 'body': K((0, (0, 0, 0), (0, 0, 0)), (1.0, (0, 3, 0), (0, 0, 0)))}
    return b.finish(idle=4.0, walk=1.0, bob=0.0, attack=atk, attack_len=0.4, die='collapse', drop=0.0, die_len=1.0, idle_extra=idle, walk_extra={'head': cyc(1.0, 4, lambda p: (2 * sn(p), 0, 0))}, die_extra=die)


# ---------------------------------------------------------------- 8. Plodder
def plodder():
    b = Build('plodder')
    b.bone('body', (0, 0, 1.4), (0, 0, 2.5))
    m = b.on('body')
    m.lathe([(0.5, 1.3), (0.85, 1.5), (0.9, 2.3), (0.7, 2.6), (0.4, 2.7)], mat='hull', seg=10, smooth=False)
    m.cyl(0.91, 0.14, at=(0, 0, 1.9), mat='hazard', seg=10)
    m.box((0.7, 0.3, 0.36), at=(0, -0.75, 2.2), mat='hull_dark', bevel=0.06)
    m.cyl(0.13, 0.1, at=(0, -0.92, 2.2), rot=(90, 0, 0), mat='eye_red', seg=12)
    m.box((0.5, 0.5, 0.4), at=(0, 0.8, 2.0), mat='rust', bevel=0.05)
    for s in (-1, 1):
        m.box((0.4, 0.9, 0.44), at=(s * 1.05, -0.1, 2.3), mat='hull_dark', bevel=0.06)             # shoulder guns
        for k in (-1, 1):
            m.cyl(0.08, 0.7, at=(s * 1.05 + k * 0.1, -0.85, 2.3), rot=(90, 0, 0), mat='trim', seg=8)
            m.cyl(0.05, 0.04, at=(s * 1.05 + k * 0.1, -1.21, 2.3), rot=(90, 0, 0), mat='glow_amber', seg=8)
        m.box((0.12, 0.3, 0.3), at=(s * 0.86, -0.1, 2.3), mat='trim')
        n = 'leg_%s' % ('l' if s > 0 else 'r')
        b.leg(n, (s * 0.5, 0, 1.35), (s * 0.6, -0.25, 0.75), (s * 0.6, 0.0, 0.0), r=(0.2, 0.17), mats=('hull_dark', 'hull'), joint='accent', kind='under', phase=0 if s > 0 else 0.5)
        m = b.on(n + '_b')
        m.box((0.56, 0.9, 0.22), at=(s * 0.6, -0.12, 0.11), mat='hull_dark', bevel=0.06)
        m.box((0.58, 0.2, 0.1), at=(s * 0.6, -0.5, 0.1), mat='hazard', bevel=0.02)
    atk = {'body': K((0, (0, 0, 0), (0, 0, 0)), (0.1, (-6, 0, 0), (0, 0.1, 0)), (0.5, (0, 0, 0), (0, 0, 0)))}
    return b.finish(idle=3.0, walk=1.3, bob=0.02, swing=20, lift=18, attack=atk, attack_len=0.5, die='collapse', drop=0.9, die_len=1.2)


# ---------------------------------------------------------------- 9. Scalpel Drone
def drone():
    b = Build('drone')
    Z = 1.7
    b.bone('body', (0, 0.2, Z), (0, -0.3, Z))
    m = b.on('body')
    m.ball(0.26, at=(0, 0, Z), mat='hull', seg=14, scale=(1.0, 1.3, 0.6))
    m.box((0.3, 0.1, 0.08), at=(0, -0.3, Z), mat='hull_dark', bevel=0.02)
    m.box((0.22, 0.03, 0.03), at=(0, -0.355, Z), mat='eye_red')
    m.cyl(0.1, 0.05, at=(0, 0.1, Z + 0.17), mat='glow_cyan', seg=10)
    rot = {}
    for i in range(4):
        a = math.radians(45 + i * 90)
        cx, cy = math.cos(a), math.sin(a)
        m = b.on('body')
        m.tube([(0.2 * cx, 0.2 * cy, Z), (0.55 * cx, 0.55 * cy, Z + 0.08)], 0.025, mat='trim', seg=6)
        m.cyl(0.05, 0.1, at=(0.55 * cx, 0.55 * cy, Z + 0.08), mat='hull_dark', seg=8)
        n = 'rotor%d' % (i + 1)
        b.bone(n, (0.55 * cx, 0.55 * cy, Z + 0.13), (0.55 * cx, 0.55 * cy, Z + 0.3), 'body')
        m = b.on(n)
        for k in range(3):
            m.box((0.46, 0.05, 0.008), at=(0.55 * cx, 0.55 * cy, Z + 0.15), rot=(8, 0, k * 60), mat='chrome')
        m.ring(0.26, 0.012, at=(0.55 * cx, 0.55 * cy, Z + 0.15), mat='accent', seg=16, tseg=4)
        rot[n] = (1 if i % 2 else -1)
    arm = [(0, -0.1, Z - 0.14), (0, -0.25, Z - 0.4), (0, -0.5, Z - 0.5), (0, -0.75, Z - 0.42)]
    names = b.chain('arm', arm, 0.025, 'chrome', sway=8)
    m = b.on(names[-1])
    m.prism([(0, -0.02), (0.34, -0.01), (0.4, 0.0), (0.34, 0.03), (0, 0.02)], 0.006, at=(0, -0.75, Z - 0.42), rot=(90, 0, -90), mat='mirror')    # the scalpel
    spin = lambda L, n: {r_: cyc(L, 12, lambda p, s=s: (0, 0, s * 360 * n * p)) for r_, s in rot.items()}
    atk = {'arm1': K((0, (0, 0, 0)), (0.12, (40, 0, 0)), (0.22, (-50, 0, 0)), (0.4, (0, 0, 0))), 'arm2': K((0, (0, 0, 0)), (0.12, (30, 0, 0)), (0.22, (-40, 0, 0)), (0.4, (0, 0, 0))),
           'body': K((0, (0, 0, 0), (0, 0, 0)), (0.12, (10, 0, 0), (0, 0.1, 0)), (0.22, (-20, 0, 0), (0, -0.3, -0.1)), (0.4, (0, 0, 0), (0, 0, 0)))}
    atk.update(spin(0.4, 2))
    return b.finish(idle=1.0, walk=0.5, bob=0.06, attack=atk, attack_len=0.4, die='drop', drop=1.45, die_len=0.7, idle_extra=spin(1.0, 4), walk_extra=spin(0.5, 3), lean=-14)


# ---------------------------------------------------------------- 10. Fouler
def fouler():
    rnd = random.Random(10)
    b = Build('fouler')
    b.bone('body', (0, 0.3, 0.5), (0, -0.3, 0.7))
    m = b.on('body')
    m.ball(0.9, at=(0, 0, 0.4), mat='grease', seg=16, scale=(1.2, 1.25, 0.6))
    m.ball(0.65, at=(0, -0.1, 0.9), mat='grease', seg=14, scale=(1.0, 1.0, 0.8))
    m.ball(1.2, at=(0, 0, 0.0), mat='slime', seg=14, scale=(1.2, 1.2, 0.05))                       # the puddle it travels in
    for i in range(8):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(0.5, 0.95)
        m.ball(rnd.uniform(0.12, 0.25), at=(d * math.cos(a), d * math.sin(a), rnd.uniform(0.25, 0.6)), mat=rnd.choice(['grease', 'slime']), seg=8)
    for (x, y, z, rx) in ((0.4, 0.3, 0.9, 20), (-0.5, 0.1, 0.8, -30), (0.1, 0.5, 1.0, 10)):         # things it has swallowed
        m.cyl(0.09, 0.9, at=(x, y, z), rot=(rx, 30, 0), mat='rust', seg=8)
        m.cyl(0.11, 0.08, at=(x, y, z + 0.4), rot=(rx, 30, 0), mat='trim', seg=8)
    m.cyl(0.2, 0.5, at=(0, -0.7, 0.95), rot=(80, 0, 0), mat='rust', seg=10)                        # and what it speaks through
    m.cyl(0.16, 0.06, at=(0, -0.96, 0.99), rot=(80, 0, 0), mat='glow_green', seg=10)
    for i, (x, y) in enumerate(((0.3, -0.3), (-0.3, -0.35), (0.0, 0.1), (-0.45, 0.2))):
        nm = b.chain('eye%d_' % i, [(x, y, 1.2), (x * 1.3, y * 1.3 - 0.05, 1.6), (x * 1.5, y * 1.5 - 0.12, 1.95 + 0.1 * i)], lambda t: 0.05 * (1 - t * 0.4), 'grease', sway=14)
        m = b.on(nm[-1])
        m.ball(0.1, at=(x * 1.5, y * 1.5 - 0.14, 2.0 + 0.1 * i), mat='eye', seg=10)
        m.ball(0.045, at=(x * 1.5, y * 1.5 - 0.23, 2.0 + 0.1 * i), mat='rubber', seg=6)
    for i in range(3):
        a = math.radians(210 + i * 60)
        b.chain('arm%d_' % i, [(0.8 * math.cos(a), 0.8 * math.sin(a), 0.5), (1.3 * math.cos(a), 1.3 * math.sin(a), 0.7), (1.7 * math.cos(a), 1.7 * math.sin(a), 0.4), (1.9 * math.cos(a), 1.9 * math.sin(a), 0.1)],
                lambda t: 0.16 * (1 - t * 0.7), 'grease', sway=12)
    atk = {'body': K((0, (0, 0, 0), (0, 0, 0)), (0.3, (14, 0, 0), (0, 0.2, 0.15)), (0.45, (-12, 0, 0), (0, -0.3, -0.05)), (0.8, (0, 0, 0), (0, 0, 0))),
           'arm1_1': K((0, (0, 0, 0)), (0.3, (-50, 0, 0)), (0.45, (30, 0, 0)), (0.8, (0, 0, 0)))}
    return b.finish(idle=2.6, walk=1.1, bob=0.07, attack=atk, attack_len=0.8, die='collapse', drop=0.3, die_len=1.0)


# ---------------------------------------------------------------- 11. The Princess
def princess():
    b = Build('princess')
    b.bone('body', (0, 0, 1.2), (0, 0, 2.4))
    b.bone('head', (0, 0, 2.6), (0, 0, 3.2), 'body')
    m = b.on('body')
    m.lathe([(1.1, 0.06), (1.15, 0.16), (0.95, 0.5), (0.7, 1.0), (0.4, 1.35)], mat='egg', seg=24)        # the gown, floor length
    for k in range(12):
        a = math.radians(k * 30)
        m.push(R(0, 0, k * 30))
        m.prism([(-0.2, 0), (0.2, 0), (0.12, 1.05), (-0.12, 1.05)], 0.03, at=(0, -1.14, 0.1), rot=(72, 0, 0), mat='glow_pink' if k % 3 == 0 else 'gold', bevel=0.008)
        m.pop()
    m.ring(1.14, 0.03, at=(0, 0, 0.12), mat='gold', seg=32, tseg=5)
    m.ball(0.48, at=(0, 0, 1.9), mat='egg', seg=18, scale=(1.0, 0.9, 1.35))
    m.cyl(0.36, 0.1, at=(0, 0, 1.36), mat='gold', seg=18)
    m.ball(0.12, at=(0, -0.4, 2.05), mat='glow_pink', seg=10, scale=(1, 0.5, 1.3))                        # a brooch
    m.ring(0.16, 0.02, at=(0, -0.41, 2.05), rot=(90, 0, 0), mat='gold', seg=16, tseg=5)
    for s in (-1, 1):                                    # puffed sleeves
        m.ball(0.26, at=(s * 0.5, 0, 2.3), mat='gold', seg=10)
    m.lathe([(0.36, 2.42), (0.6, 2.55), (0.66, 2.8), (0.5, 2.72), (0.3, 2.55)], mat='egg', seg=18)       # a ruff
    m = b.on('head')
    m.ball(0.3, at=(0, 0, 2.95), mat='egg', seg=16, scale=(1.0, 1.0, 1.3))
    m.box((0.36, 0.06, 0.07), at=(0, -0.27, 3.0), mat='eye_red')
    m.ring(0.27, 0.03, at=(0, 0, 3.24), mat='gold', seg=20, tseg=5)                                       # the tiara
    for k in range(7):
        a = math.radians(-90 + (k - 3) * 28)
        h = 0.36 - abs(k - 3) * 0.07
        m.lathe([(0.04, 0), (0.0, h)], at=(0.27 * math.cos(a), 0.27 * math.sin(a), 3.25), mat='gold', seg=5, smooth=False)
        if k % 2 == 1:
            m.ball(0.035, at=(0.27 * math.cos(a), 0.27 * math.sin(a), 3.25 + h), mat='glow_pink', seg=6)
    left = [(0.62, 0, 2.3), (0.95, -0.2, 1.9), (0.9, -0.6, 1.7), (0.8, -0.85, 1.75)]
    right = [(-0.62, 0, 2.3), (-0.9, -0.25, 1.95), (-0.75, -0.65, 2.0), (-0.6, -0.9, 2.2)]
    b.chain('arm_l', left, 0.07, 'egg', sway=5)
    rn = b.chain('arm_r', right, 0.07, 'egg', sway=5)
    m = b.on(rn[-1])                                     # the sceptre: an egg on a stick, held like an order
    m.cyl(0.03, 1.5, at=(-0.6, -0.9, 2.3), mat='gold', seg=6)
    m.ball(0.14, at=(-0.6, -0.9, 3.1), mat='glow_pink', seg=10, scale=(1, 1, 1.35))
    m.ring(0.17, 0.02, at=(-0.6, -0.9, 3.05), mat='gold', seg=14, tseg=5)
    atk = {'arm_r1': K((0, (0, 0, 0)), (0.4, (-60, 0, 0)), (0.55, (40, 0, 0)), (1.0, (0, 0, 0))), 'arm_r2': K((0, (0, 0, 0)), (0.4, (-30, 0, 0)), (0.55, (30, 0, 0)), (1.0, (0, 0, 0))),
           'body': K((0, (0, 0, 0), (0, 0, 0)), (0.4, (6, 0, 10), (0, 0, 0)), (0.55, (-8, 0, -6), (0, -0.15, 0)), (1.0, (0, 0, 0), (0, 0, 0))),
           'head': K((0, (0, 0, 0)), (0.4, (10, 0, 0)), (0.55, (-12, 0, 0)), (1.0, (0, 0, 0)))}
    die = {'head': K((0, (0, 0, 0)), (0.6, (0, 0, 40)), (1.4, (-50, 20, 60))), 'body': K((0, (0, 0, 0), (0, 0, 0)), (0.5, (0, 6, 0), (0, 0, 0)), (1.2, (-10, -12, 0), (0, 0, -0.1)), (1.4, (-14, -14, 0), (0, 0, -0.14)))}
    return b.finish(idle=3.2, walk=1.4, bob=0.02, attack=atk, attack_len=1.0, die='collapse', drop=0.14, die_len=1.4, die_extra=die,
                    idle_extra={'head': cyc(3.2, 8, lambda p: (0, 5 * sn(p), 12 * sn(p)))})


# ---------------------------------------------------------------- 12. Mourner
def mourner():
    rnd = random.Random(12)
    b = Build('mourner')
    b.bone('body', (0, 0, 1.2), (0, 0, 2.2))
    b.bone('head', (0, 0, 2.2), (0, -0.15, 2.7), 'body')
    m = b.on('body')
    m.lathe([(0.75, 0.75), (0.6, 1.1), (0.42, 1.7), (0.34, 2.15), (0.2, 2.3)], mat='shroud', seg=14, smooth=False)
    for i in range(5):                                   # ribs, and the light kept inside them
        z = 1.45 + i * 0.13
        pts = [(0.3 * math.cos(math.radians(a)), -0.34 * math.sin(math.radians(a)) + 0.02, z) for a in range(20, 161, 20)]
        m.tube(pts, 0.016, mat='bone', seg=4)
    m.ball(0.13, at=(0, -0.2, 1.7), mat='glow_amber', seg=10)
    for i in range(9):                                   # the hem, in tatters
        a = math.radians(i * 40 + 10)
        L = rnd.uniform(0.45, 0.8)
        b.chain('rag%d_' % i, [(0.72 * math.cos(a), 0.72 * math.sin(a), 0.78), (0.76 * math.cos(a), 0.76 * math.sin(a), 0.78 - L * 0.5), (0.7 * math.cos(a), 0.7 * math.sin(a), 0.78 - L)],
                lambda t: 0.1 * (1 - t * 0.8), 'shroud', seg=5, sway=9)
    m = b.on('head')
    m.lathe([(0.3, 2.2), (0.36, 2.45), (0.3, 2.7), (0.12, 2.85), (0.0, 2.9)], mat='shroud', seg=12)
    m.ball(0.22, at=(0, -0.16, 2.5), mat='rubber', seg=10, scale=(1, 0.6, 1.15))                          # nothing in the hood
    for s in (-1, 1):
        m.ball(0.022, at=(s * 0.07, -0.29, 2.54), mat='glow_amber', seg=6)
    m.prism([(-0.5, 0), (0.5, 0), (0.42, -1.5), (0.1, -1.75), (-0.3, -1.6)], 0.01, at=(0, 0.3, 2.6), rot=(96, 0, 0), mat='shroud')    # the veil down its back
    for s in (-1, 1):
        nm = b.chain('arm_%s' % ('l' if s > 0 else 'r'), [(s * 0.34, -0.05, 2.1), (s * 0.55, -0.35, 1.75), (s * 0.4, -0.75, 1.55), (s * 0.22, -0.95, 1.6)], lambda t: 0.035 * (1 - t * 0.3), 'bone', sway=6)
        m = b.on(nm[-1])
        for k in range(4):
            m.tube([(s * 0.22, -0.95, 1.6), (s * 0.22 + (k - 1.5) * 0.05, -1.12, 1.55), (s * 0.2 + (k - 1.5) * 0.06, -1.2, 1.42)], lambda t: 0.012 * (1 - t * 0.5), mat='bone', seg=4)
    m = b.on('arm_r3')                                    # a censer on a chain
    m.tube([(-0.22, -0.95, 1.58), (-0.22, -0.97, 1.2)], 0.008, mat='brass', seg=4)
    m.lathe([(0.0, 0), (0.1, 0.05), (0.12, 0.16), (0.05, 0.24), (0.0, 0.26)], at=(-0.22, -0.97, 0.94), mat='brass', seg=10)
    m.ball(0.06, at=(-0.22, -0.97, 1.06), mat='glow_amber', seg=8)
    atk = {'arm_l1': K((0, (0, 0, 0)), (0.3, (-70, 0, 0)), (0.45, (30, 0, 0)), (0.8, (0, 0, 0))), 'arm_r1': K((0, (0, 0, 0)), (0.3, (-70, 0, 0)), (0.45, (30, 0, 0)), (0.8, (0, 0, 0))),
           'body': K((0, (0, 0, 0), (0, 0, 0)), (0.3, (12, 0, 0), (0, 0.1, 0.1)), (0.45, (-16, 0, 0), (0, -0.3, 0)), (0.8, (0, 0, 0), (0, 0, 0))),
           'head': K((0, (0, 0, 0)), (0.3, (30, 0, 0)), (0.45, (-10, 0, 0)), (0.8, (0, 0, 0)))}
    return b.finish(idle=3.4, walk=1.6, bob=0.09, attack=atk, attack_len=0.8, die='drop', drop=0.72, die_len=1.1, lean=-8,
                    idle_extra={'head': cyc(3.4, 8, lambda p: (6 * sn(p), 0, 10 * sn(p * 2)))})


ACTORS2 = {'eggbot': eggbot, 'grease_monkey': grease_monkey, 'dancer': dancer, 'snapper': snapper, 'deadbot': deadbot, 'defender': defender,
           'sphinx': sphinx, 'plodder': plodder, 'drone': drone, 'fouler': fouler, 'princess': princess, 'mourner': mourner}
