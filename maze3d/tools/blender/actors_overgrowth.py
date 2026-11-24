"""The Overgrowth: the five living things of HaveNot's second danger set (the dressing doc, 23 Nov), code-built and
rigged like the rest (actors2.Build). The Rattleback, the Bloodfly cloud, the Sporecap, the Shroud Stalker and the Brood
Matron. All face Blender's front view (-Y); sizes are real metres. The Bloodfly's smaller clouds use its model, scaled
in their defs."""
import math, random
from actors import cyc, sn
from actors2 import Build, K


# ---------------------------------------------------------------- the Rattleback
def rattleback():
    """A slab of armoured beast on four stumps of legs: a low skull with a bone brow it charges with, a ridge of bone
    plates down its back that rattle as it breathes, and behind them a soft pink rump with nothing over it. That is
    where to shoot it."""
    b = Build('rattleback')
    b.bone('body', (0, 0.9, 1.2), (0, -0.7, 1.25))
    b.bone('head', (0, -1.0, 1.15), (0, -1.9, 0.95), 'body')
    b.bone('plates', (0, -0.6, 1.95), (0, 0.6, 1.95), 'body')
    m = b.on('body')
    m.ball(0.85, at=(0, 0.05, 1.25), mat='chitin', seg=16, scale=(1.05, 1.45, 0.82))     # the barrel
    m.ball(0.75, at=(0, -0.7, 1.3), mat='chitin', seg=14, scale=(1.05, 0.8, 0.85))       # the shoulders
    m.ball(0.66, at=(0, 0.95, 1.18), mat='petal', seg=16, scale=(1.05, 0.95, 0.9))       # the soft rump, pink and bare
    for i in range(4):                                     # the creases in it
        m.ring(0.55 - i * 0.07, 0.02, at=(0, 1.05 + i * 0.12, 1.2), rot=(90, 0, 0), mat='flesh', seg=16, tseg=4)
    for s in (-1, 1):
        m.ball(0.3, at=(s * 0.7, -0.35, 1.05), mat='bone', seg=10, scale=(0.6, 1.4, 0.9))  # flank plates
    m = b.on('plates')
    for i in range(7):                                     # the rattle: bone plates down its spine
        y = -0.75 + i * 0.24
        h = 0.42 - abs(i - 3) * 0.05
        m.prism([(-0.22, 0), (0.22, 0), (0.0, h)], 0.1, at=(0, y, 1.82 - abs(i - 3) * 0.04), rot=(90, 0, 0), mat='bone')
    m = b.on('head')
    m.ball(0.5, at=(0, -1.42, 1.02), mat='chitin', seg=12, scale=(1.1, 1.1, 0.85))
    m.box((1.0, 0.36, 0.5), at=(0, -1.78, 1.12), rot=(-15, 0, 0), mat='bone', bevel=0.12)     # the brow it charges with
    for s in (-1, 1):
        m.ball(0.06, at=(s * 0.36, -1.84, 0.96), mat='eye', seg=8)
        m.tube([(s * 0.3, -1.85, 0.82), (s * 0.55, -2.08, 0.92), (s * 0.58, -2.12, 1.2)], lambda t: 0.08 * (1 - t * 0.8), mat='bone', seg=6)   # tusks
    m.box((0.4, 0.16, 0.14), at=(0, -1.98, 0.84), mat='flesh', bevel=0.04)              # the snout
    for i, (sx, sy) in enumerate(((1, -0.7), (-1, -0.7), (1, 0.7), (-1, 0.7))):
        b.leg('leg%d' % (i + 1), (sx * 0.62, sy, 1.0), (sx * 0.78, sy - 0.1, 0.5), (sx * 0.72, sy, 0.0), r=(0.2, 0.15), mats=('chitin', 'chitin'),
              joint='chitin', kind='under', phase=(0, 0.5, 0.5, 0)[i], pad=0.24)
    b.chain('tail', [(0, 1.55, 1.15), (0, 1.85, 0.95), (0, 2.0, 0.7)], lambda t: 0.12 * (1 - t * 0.7), 'chitin', sway=12)
    rattle = {'plates': cyc(0.4, 8, lambda p: (2 * sn(p * 3), 0, 0))}
    butt = {'head': K((0, (0, 0, 0)), (0.35, (25, 0, 0)), (0.5, (-30, 0, 0)), (0.9, (0, 0, 0))),
            'body': K((0, (0, 0, 0), (0, 0, 0)), (0.35, (6, 0, 0), (0, 0.25, 0)), (0.5, (-6, 0, 0), (0, -0.45, 0)), (0.9, (0, 0, 0), (0, 0, 0)))}
    butt.update(rattle)
    return b.finish(idle=2.8, walk=1.0, bob=0.05, swing=22, lift=20, attack=butt, attack_len=0.9, die='roll', drop=0.55, die_len=1.2,
                    idle_extra={'plates': cyc(2.8, 16, lambda p: (1.5 * sn(p * 8), 0, 0))}, walk_extra=rattle)


# ---------------------------------------------------------------- the Bloodfly cloud
def bloodfly():
    """A drifting knot of red flies holding the shape of nothing: seventy small bodies, each with its glassy wings, in a
    rough ball at 1.4 m round a dark, glutted core, on six swaying strands so the cloud seethes. Its smaller clouds are
    this model, scaled."""
    rnd = random.Random(31)
    b = Build('bloodfly')
    Z = 1.4
    b.bone('body', (0, 0, Z - 0.2), (0, 0, Z + 0.2))
    strands = []
    for k in range(6):
        a = 2 * math.pi * k / 6
        pts = [(0, 0, Z), (0.25 * math.cos(a), 0.25 * math.sin(a), Z + 0.05 * sn(k / 6)), (0.5 * math.cos(a), 0.5 * math.sin(a), Z - 0.05)]
        n = ['strand%d_%d' % (k, i + 1) for i in range(2)]
        b.r.chain('strand%d_' % k, pts, 'body')
        b.chains.append(dict(names=n, sway=18, vertical=False))
        strands.append(n)
    m = b.on('body')
    m.ball(0.2, at=(0, 0, Z), mat='chitin_red', seg=10, scale=(1, 1, 0.8))
    for i in range(70):
        u, v = rnd.uniform(-1, 1), rnd.uniform(0, 2 * math.pi)
        r = 0.2 + 0.4 * rnd.random() ** 0.7
        x, y, z = r * math.sqrt(1 - u * u) * math.cos(v), r * math.sqrt(1 - u * u) * math.sin(v), Z + r * u * 0.8
        k = int((math.atan2(y, x) % (2 * math.pi)) / (2 * math.pi) * 6) % 6
        m = b.on(strands[k][0 if r < 0.25 else 1])
        yaw = rnd.uniform(0, 360)
        m.ball(0.045, at=(x, y, z), mat='chitin_red', seg=6, scale=(0.7, 1.4, 0.7), rot=(0, 0, yaw))
        for s in (-1, 1):
            m.box((0.1, 0.05, 0.005), at=(x + s * 0.045 * math.cos(math.radians(yaw)), y + s * 0.045 * math.sin(math.radians(yaw)), z + 0.03),
                  rot=(0, s * 20, yaw), mat='glass')
    m = b.on('body')
    for i in range(6):                                     # a few in the middle that glow, full
        a = rnd.uniform(0, 2 * math.pi)
        m.ball(0.045, at=(0.18 * math.cos(a), 0.18 * math.sin(a), Z + rnd.uniform(-0.1, 0.1)), mat='glow_red', seg=6)
    lunge = {'body': K((0, (0, 0, 0), (0, 0, 0)), (0.06, (0, 0, 0), (0, 0.1, 0)), (0.12, (0, 0, 0), (0, -0.35, -0.1)), (0.3, (0, 0, 0), (0, 0, 0)))}
    return b.finish(idle=0.9, walk=0.6, bob=0.08, attack=lunge, attack_len=0.3, die='drop', drop=1.3, die_len=0.6)


# ---------------------------------------------------------------- the Sporecap
def sporecap():
    """A pale mushroom the height of a chair, its cap stretched tight as a drum and spotted with glowing pores; three
    sporelings at its foot. It does not move: it swells, and bursts."""
    rnd = random.Random(7)
    b = Build('sporecap')
    b.bone('body', (0, 0, 0.0), (0, 0, 0.7))
    b.bone('cap', (0, 0, 0.7), (0, 0, 1.2), 'body')
    m = b.on('body')
    m.lathe([(0.32, 0.0), (0.24, 0.08), (0.16, 0.3), (0.15, 0.6), (0.2, 0.72)], mat='flesh_pale', seg=16)
    m.ring(0.17, 0.035, at=(0, 0, 0.55), mat='flesh_pale', seg=16, tseg=5)            # the skirt
    for i in range(3):                                     # sporelings
        a = 2 * math.pi * i / 3 + 0.4
        at = (0.5 * math.cos(a), 0.5 * math.sin(a), 0.0)
        m.lathe([(0.05, 0.0), (0.04, 0.1), (0.0, 0.11)], at=at, mat='flesh_pale', seg=8)
        m.ball(0.1, at=(at[0], at[1], 0.13), mat='slime', seg=10, scale=(1, 1, 0.55))
    m = b.on('cap')
    m.lathe([(0.2, 0.72), (0.62, 0.78), (0.66, 0.86), (0.56, 1.02), (0.32, 1.14), (0.0, 1.18)], mat='flesh_pale', seg=24)
    m.lathe([(0.2, 0.74), (0.6, 0.79)], mat='flesh', seg=24, smooth=False)             # the gills underneath
    for i in range(14):                                    # the pores
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0.15, 0.55)
        z = 1.18 - (r / 0.66) ** 2 * 0.34
        m.ball(rnd.uniform(0.025, 0.05), at=(r * math.cos(a), r * math.sin(a), z), mat='glow_green', seg=6, scale=(1, 1, 0.5))
    breathe = lambda L: {'cap': cyc(L, 8, lambda p: ((0, 0, 0), (0, 0, 0.015 * sn(p)), (1 + 0.04 * sn(p), 1 + 0.04 * sn(p), 1 - 0.03 * sn(p))))}
    swell = {'cap': K((0, (0, 0, 0), (0, 0, 0), (1, 1, 1)), (0.3, (0, 0, 0), (0, 0, 0.04), (1.25, 1.25, 0.9)), (0.4, (0, 0, 0), (0, 0, 0), (1, 1, 1)))}
    return b.finish(idle=2.2, walk=2.2, bob=0.0, attack=swell, attack_len=0.4, die='collapse', drop=0.3, die_len=0.6,
                    idle_extra=breathe(2.2), walk_extra=breathe(2.2))


# ---------------------------------------------------------------- the Shroud Stalker
def stalker():
    """A tall, gaunt hunter of bone-grey plates on back-bent legs, its arms ending in long scythe claws, a narrow
    eyeless head split by one violet slit, a rag of shroud hanging from its shoulders. Mostly it is a shimmer."""
    b = Build('stalker')
    b.bone('body', (0, 0.05, 1.3), (0, -0.05, 2.15))
    b.bone('head', (0, -0.08, 2.2), (0, -0.3, 2.5), 'body')
    m = b.on('body')
    m.lathe([(0.12, 1.2), (0.2, 1.35), (0.16, 1.6), (0.26, 1.95), (0.3, 2.1), (0.14, 2.2)], at=(0, 0, 0), mat='bone', seg=10, smooth=False)
    for i in range(3):                                     # plates over the chest
        m.ball(0.24 - i * 0.02, at=(0, -0.14, 1.95 - i * 0.16), mat='chitin', seg=10, scale=(1.15, 0.45, 0.4))
    m.ball(0.3, at=(0, 0.08, 2.05), mat='chitin', seg=10, scale=(1.3, 0.8, 0.5))          # the hunch of its back
    for k, (x, L) in enumerate(((-0.18, 0.9), (0.02, 1.15), (0.2, 0.8))):             # the rags of shroud down its back
        b.chain('rag%d_' % k, [(x, 0.3, 2.15), (x * 1.2, 0.42, 2.15 - L * 0.5), (x * 1.1, 0.4, 2.15 - L)], lambda t: 0.08 * (1 - t * 0.7), 'shroud', seg=5, sway=10)
    m = b.on('head')
    m.lathe([(0.0, 2.18), (0.12, 2.26), (0.11, 2.45), (0.06, 2.62), (0.0, 2.66)], at=(0, -0.12, 0), mat='bone', seg=10, smooth=False)
    m.box((0.02, 0.03, 0.26), at=(0, -0.24, 2.42), mat='glow_violet')                    # the slit
    for s in (-1, 1):
        b.leg('leg_%s' % ('l' if s > 0 else 'r'), (s * 0.16, 0.05, 1.22), (s * 0.2, 0.34, 0.68), (s * 0.18, -0.12, 0.0), r=(0.07, 0.05),
              mats=('bone', 'chitin'), joint='chitin', kind='under', phase=0 if s > 0 else 0.5)
        n = b.chain('arm_%s' % ('l' if s > 0 else 'r'), [(s * 0.3, 0, 2.05), (s * 0.5, -0.25, 1.65), (s * 0.45, -0.6, 1.35), (s * 0.3, -0.85, 1.2)],
                    lambda t: 0.045 * (1 - t * 0.4), 'bone', sway=5)
        m = b.on(n[-1])
        m.prism([(-0.02, 0), (0.1, 0), (0.05, -0.85), (-0.1, -1.05)], 0.035, at=(s * 0.3, -0.85, 1.2), rot=(-60, 0, s * 10), mat='bone')   # the scythe
    slash = {'arm_r1': K((0, (0, 0, 0)), (0.3, (-80, 0, 20)), (0.42, (40, 0, -10)), (0.8, (0, 0, 0))), 'arm_r2': K((0, (0, 0, 0)), (0.3, (-40, 0, 0)), (0.42, (20, 0, 0)), (0.8, (0, 0, 0))),
             'arm_l1': K((0, (0, 0, 0)), (0.32, (-70, 0, -20)), (0.46, (40, 0, 10)), (0.8, (0, 0, 0))),
             'body': K((0, (0, 0, 0), (0, 0, 0)), (0.3, (10, 0, 0), (0, 0.1, 0)), (0.42, (-16, 0, 0), (0, -0.35, 0)), (0.8, (0, 0, 0), (0, 0, 0))),
             'head': K((0, (0, 0, 0)), (0.3, (-15, 0, 0)), (0.8, (0, 0, 0)))}
    return b.finish(idle=3.0, walk=0.9, bob=0.05, swing=30, lift=30, attack=slash, attack_len=0.8, die='drop', drop=0.9, die_len=1.0, lean=14,
                    idle_extra={'head': cyc(3.0, 8, lambda p: (6 * sn(p * 2), 0, 25 * sn(p)))})


# ---------------------------------------------------------------- the Brood Matron
def matron():
    """The Overgrowth's keeper: an insect queen the size of a delivery van. A plated front with a heavy head and
    mandibles, six legs, and behind them most of her: a pale, veined egg sac that moves from inside, glowing faintly
    green. Her back is the sac: that is where to shoot her."""
    rnd = random.Random(19)
    b = Build('matron')
    b.bone('body', (0, 0.0, 1.8), (0, -1.0, 2.0))
    b.bone('head', (0, -1.1, 2.3), (0, -1.8, 2.2), 'body')
    b.bone('sac', (0, 0.3, 1.8), (0, 2.4, 1.6), 'body')
    m = b.on('body')
    m.ball(0.85, at=(0, -0.55, 1.95), mat='chitin', seg=16, scale=(1.0, 1.1, 0.95))      # the thorax
    for i in range(3):
        m.ring(0.78 - i * 0.05, 0.04, at=(0, -0.3 - i * 0.25, 1.95), rot=(90, 0, 0), mat='chitin_red', seg=20, tseg=4)
    m = b.on('sac')
    m.ball(1.25, at=(0, 1.3, 1.7), mat='egg', seg=20, scale=(1.0, 1.25, 0.9))           # the egg sac
    for i in range(12):                                    # veins over it
        a = rnd.uniform(0, 2 * math.pi)
        pts = [(1.05 * math.cos(a) * math.cos(t), 1.3 + 1.4 * math.sin(t) * 0.95, 1.7 + 1.0 * math.sin(a) * math.cos(t)) for t in (-0.9, -0.4, 0.1, 0.6)]
        m.tube(pts, 0.025, mat='flesh', seg=4)
    for i in range(9):                                     # what is moving inside
        a, t = rnd.uniform(0, 2 * math.pi), rnd.uniform(-0.8, 0.8)
        m.ball(0.12, at=(1.18 * math.cos(a) * math.cos(t), 1.3 + 1.5 * math.sin(t), 1.7 + 1.05 * math.sin(a) * math.cos(t)), mat='glow_green', seg=8, scale=(1, 1.3, 1))
    m = b.on('head')
    m.ball(0.5, at=(0, -1.55, 2.25), mat='chitin', seg=14, scale=(1.1, 1.0, 0.85))
    m.box((0.9, 0.3, 0.2), at=(0, -1.75, 2.52), rot=(-20, 0, 0), mat='chitin_red', bevel=0.08)   # the crest
    for s in (-1, 1):
        m.ball(0.12, at=(s * 0.3, -1.88, 2.3), mat='eye', seg=10, scale=(1, 0.7, 1))
        m.tube([(s * 0.2, -1.9, 2.0), (s * 0.45, -2.2, 1.85), (s * 0.15, -2.4, 1.75)], lambda t: 0.09 * (1 - t * 0.8), mat='bone', seg=6)   # mandibles
    for i, (sx, sy) in enumerate(((1, -1.0), (1, -0.45), (1, 0.1), (-1, -1.0), (-1, -0.45), (-1, 0.1))):
        b.leg('leg%d' % (i + 1), (sx * 0.6, sy, 1.7), (sx * 1.35, sy * 1.2 - 0.1, 2.7), (sx * 2.0, sy * 1.45, 0.0), r=(0.17, 0.07),
              mats=('chitin', 'chitin_red'), joint='bone', phase=(i % 2) * 0.5 + (i // 3) * 0.25)
    screech = {'head': K((0, (0, 0, 0)), (0.3, (35, 0, 0)), (0.5, (-20, 0, 0)), (0.7, (-18, 0, 4)), (1.0, (0, 0, 0))),
               'body': K((0, (0, 0, 0), (0, 0, 0)), (0.3, (8, 0, 0), (0, 0.1, 0.15)), (0.5, (-6, 0, 0), (0, -0.2, 0)), (1.0, (0, 0, 0), (0, 0, 0)))}
    pulse = lambda L: {'sac': cyc(L, 8, lambda p: ((0, 0, 0), (0, 0, 0), (1 + 0.03 * sn(p), 1 + 0.03 * sn(p), 1 + 0.02 * sn(p))))}
    return b.finish(idle=3.6, walk=1.5, bob=0.04, swing=18, lift=24, attack=screech, attack_len=1.0, die='collapse', drop=0.9, die_len=1.6,
                    idle_extra=pulse(3.6), walk_extra=pulse(1.5))


ACTORS_OVERGROWTH = {'rattleback': rattleback, 'bloodfly': bloodfly, 'sporecap': sporecap, 'stalker': stalker, 'matron': matron}
