"""Three more kits from the 2D HaveNot game:
  works   the Greasy Bolt Hole's Works: iron, brick, furnace light, grease
  bunker  a survival bunker: board-marked concrete, olive steel, caged bulbs
  crypt   the tomb gallery: coursed stone, bone, candle and stained light
Sizes and conventions are tiles.py's. Ids carry a kit tag (wk, bk, cr) because kits borrow from
each other and ids must not collide."""
import math, random
from mz import Mesh, T, R, S
from tiles import plates, cable, dangle, face, down, C, H

WORKS_MATS = {
    'iron':     dict(color=(0.20, 0.19, 0.19), metal=0.85, rough=0.55, shader='worn', grime=0.8),
    'brick':    dict(color=(0.30, 0.17, 0.13), metal=0.0, rough=0.92, shader='worn', grime=0.75),
    'mortar':   dict(color=(0.22, 0.20, 0.18), metal=0.0, rough=0.95, shader='worn', grime=0.6),
    'soot':     dict(color=(0.02, 0.02, 0.02), metal=0.0, rough=0.98),
    'furnace':  dict(color=(1.0, 0.45, 0.08), emit=(1.0, 0.42, 0.08), energy=5.0, shader='glow', flicker=0.25, pulse=0.3),
    'grease_glow': dict(color=(0.6, 0.85, 0.15), emit=(0.55, 0.85, 0.12), energy=2.2, shader='glow', pulse=0.25),
    'bulb':     dict(color=(1.0, 0.8, 0.5), emit=(1.0, 0.78, 0.45), energy=4.0, shader='glow'),
}
BUNKER_MATS = {
    'concrete':      dict(color=(0.42, 0.42, 0.40), metal=0.0, rough=0.92, shader='worn', grime=0.6),
    'concrete_dark': dict(color=(0.24, 0.24, 0.23), metal=0.0, rough=0.95, shader='worn', grime=0.7),
    'olive':         dict(color=(0.20, 0.24, 0.12), metal=0.5, rough=0.55, shader='worn', grime=0.55),
    'stencil':       dict(color=(0.85, 0.78, 0.45), metal=0.0, rough=0.8, shader='worn', grime=0.7),
    'canvas':        dict(color=(0.30, 0.27, 0.18), metal=0.0, rough=0.95),
    'tin':           dict(color=(0.62, 0.62, 0.6), metal=0.9, rough=0.4, shader='worn', grime=0.4),
    'bulb':          dict(color=(1.0, 0.8, 0.5), emit=(1.0, 0.78, 0.45), energy=4.0, shader='glow'),
    'dial':          dict(color=(0.9, 0.85, 0.6), emit=(0.95, 0.85, 0.5), energy=1.4, shader='glow'),
}
CRYPT_MATS = {
    'stone':       dict(color=(0.20, 0.21, 0.24), metal=0.0, rough=0.93, shader='worn', grime=0.7),
    'stone_light': dict(color=(0.42, 0.41, 0.38), metal=0.0, rough=0.9, shader='worn', grime=0.6),
    'marble':      dict(color=(0.05, 0.05, 0.06), metal=0.2, rough=0.15, shader='worn', grime=0.3),
    'wax':         dict(color=(0.85, 0.8, 0.65), metal=0.0, rough=0.6),
    'flame':       dict(color=(1.0, 0.7, 0.25), emit=(1.0, 0.66, 0.22), energy=5.0, shader='glow', flicker=0.3, pulse=0.3),
    'stained_a':   dict(color=(0.3, 0.2, 0.9), emit=(0.3, 0.22, 1.0), energy=2.2, shader='glow', pulse=0.1),
    'stained_b':   dict(color=(0.9, 0.15, 0.2), emit=(0.95, 0.16, 0.22), energy=2.2, shader='glow', pulse=0.1),
    'stained_c':   dict(color=(0.95, 0.7, 0.2), emit=(1.0, 0.72, 0.2), energy=2.2, shader='glow', pulse=0.1),
    'tess_a':      dict(color=(0.16, 0.14, 0.5), metal=0.1, rough=0.3, shader='worn', grime=0.4),
    'tess_b':      dict(color=(0.5, 0.08, 0.1), metal=0.1, rough=0.3, shader='worn', grime=0.4),
    'root':        dict(color=(0.16, 0.11, 0.07), metal=0.0, rough=0.9),
}


def rivets(m, x0, z0, x1, z1, step=0.4, mat='iron', y=-0.07):
    x = x0
    while x <= x1 + 1e-6:
        for z in (z0, z1):
            m.cyl(0.03, 0.03, at=(x, y, z), rot=(90, 0, 0), mat=mat, seg=6)
        x += step


def courses(m, rnd, x0, z0, x1, z1, h=0.3, w=0.62, mats=('brick',), back='mortar', t=(0.05, 0.08), bevel=0.0):
    """Masonry: staggered rows of blocks on the wall plane."""
    m.box((x1 - x0, 0.04, z1 - z0), at=((x0 + x1) / 2, 0.0, (z0 + z1) / 2), mat=back)
    z = z0
    row = 0
    while z < z1 - 1e-6:
        hh = min(h, z1 - z)
        x = x0 - (w / 2 if row % 2 else 0)
        while x < x1 - 1e-6:
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.06:
                th = rnd.uniform(*t)
                m.box((b - a - 0.025, th, hh - 0.025), at=((a + b) / 2, -th / 2, z + hh / 2), mat=rnd.choice(mats), bevel=bevel)
            x += w
        z += h
        row += 1


# ================================================================= THE WORKS
def wk_base(m):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='iron')
    m.box((C, 0.14, 0.3), at=(0, -0.05, 0.15), mat='iron', bevel=0.02)
    m.box((C, 0.16, 0.22), at=(0, -0.06, H - 0.11), mat='iron', bevel=0.02)
    rivets(m, -1.8, 0.15, 1.8, H - 0.11, 0.45, 'rust', -0.13)


def wall_wk_plate(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wk_base(m)
    face(m)
    plates(m, rnd, -2, 0.32, 2, H - 0.24, min_size=0.9, thick=(0.03, 0.07), mats=('iron', 'iron', 'rust'), deco=0.5, glows=('glow_amber',), accent='hazard')
    m.pop()
    for z in (1.3, 2.6):
        m.box((C, 0.1, 0.12), at=(0, -0.07, z), mat='iron', bevel=0.02)
        rivets(m, -1.9, z, 1.9, z, 0.3, 'rust', -0.13)
    return m


def wall_wk_brick(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wk_base(m)
    courses(m, rnd, -2, 0.3, 2, H - 0.22, h=0.26, w=0.6, mats=('brick', 'brick', 'brick', 'soot'))
    m.box((0.3, 0.2, H - 0.5), at=(-1.4, -0.08, H / 2), mat='iron', bevel=0.03)          # an iron stanchion
    rivets(m, -1.4, 0.6, -1.4, 3.4, 1.0, 'rust', -0.19)
    return m


def wall_wk_furnace(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wk_base(m)
    courses(m, rnd, -2, 0.3, -1.1, H - 0.22, h=0.26, w=0.6)
    courses(m, rnd, 1.1, 0.3, 2, H - 0.22, h=0.26, w=0.6)
    courses(m, rnd, -1.1, 2.5, 1.1, H - 0.22, h=0.26, w=0.6, mats=('brick', 'soot'))
    m.box((2.2, 0.05, 2.25), at=(0, 0.0, 1.4), mat='soot')
    m.box((1.9, 0.02, 1.7), at=(0, -0.03, 1.2), mat='furnace')
    pts = [(-1.0, -0.08, 0.3), (-1.0, -0.08, 1.7)] + [(1.0 * math.cos(math.radians(a)), -0.08, 1.7 + 0.75 * math.sin(math.radians(a))) for a in range(165, -1, -15)] + [(1.0, -0.08, 0.3)]
    m.tube(pts, 0.11, mat='iron', seg=6)
    for i in range(7):
        m.box((0.07, 0.07, 1.9), at=(-0.75 + i * 0.25, -0.1, 1.25), mat='iron')
    m.box((2.3, 0.4, 0.14), at=(0, -0.2, 0.3), mat='iron', bevel=0.03)
    m.ball(0.3, at=(0.3, -0.3, 0.42), mat='soot', seg=8, scale=(1.5, 0.8, 0.4))
    return m


def wall_wk_pipes(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wk_base(m)
    m.box((C, 0.04, H - 0.5), at=(0, 0, H / 2), mat='soot')
    for i, z in enumerate((0.75, 1.35, 2.2, 2.75, 3.3)):
        r = (0.2, 0.1, 0.26, 0.09, 0.14)[i]
        m.cyl(r, C, at=(0, -r - 0.02, z), rot=(0, 90, 0), mat=('rust', 'copper', 'iron', 'copper', 'rust')[i], seg=12)
        for x in (-1.3, 0.2, 1.5):
            m.cyl(r + 0.035, 0.1, at=(x + i * 0.13, -r - 0.02, z), rot=(0, 90, 0), mat='iron', seg=12)
    m.ring(0.2, 0.025, at=(-0.6, -0.6, 2.2), rot=(90, 0, 0), mat='hazard', seg=16, tseg=5)
    m.cyl(0.03, 0.12, at=(-0.6, -0.55, 2.2), rot=(90, 0, 0), mat='iron', seg=6)
    m.cyl(0.16, 0.06, at=(0.9, -0.5, 1.35 + 0.3), rot=(90, 0, 0), mat='brass', seg=14)   # a gauge
    m.cyl(0.13, 0.065, at=(0.9, -0.5, 1.65), rot=(90, 0, 0), mat='bulb', seg=14)
    m.box((0.012, 0.07, 0.12), at=(0.93, -0.535, 1.69), rot=(0, 35, 0), mat='soot')
    for i in range(3):
        m.tube([(-1.5 + i * 1.3, -0.3, 0.5), (-1.5 + i * 1.3, -0.3, 0.12)], lambda t: 0.04 * (1 - t * 0.5), mat='grease', seg=5)
    return m


def gear(m, r, at, teeth, mat, th=0.1):
    m.cyl(r, th, at=at, rot=(90, 0, 0), mat=mat, seg=max(12, teeth))
    m.cyl(r * 0.3, th + 0.06, at=at, rot=(90, 0, 0), mat='iron', seg=10)
    for k in range(teeth):
        a = 2 * math.pi * k / teeth
        m.box((r * 0.22, th, r * 0.2), at=(at[0] + r * 1.05 * math.cos(a), at[1], at[2] + r * 1.05 * math.sin(a)), rot=(0, -math.degrees(a) + 90, 0), mat=mat)
    for k in range(4):
        m.cyl(r * 0.12, th + 0.02, at=(at[0] + r * 0.62 * math.cos(k * 1.57), at[1], at[2] + r * 0.62 * math.sin(k * 1.57)), rot=(90, 0, 0), mat='soot', seg=8)


def wall_wk_gears(seed):
    m = Mesh('wall')
    wk_base(m)
    m.box((C, 0.04, H - 0.5), at=(0, 0, H / 2), mat='soot')
    gear(m, 1.0, (-0.7, -0.12, 2.0), 16, 'iron')
    gear(m, 0.55, (0.95, -0.14, 2.7), 10, 'rust')
    gear(m, 0.4, (1.05, -0.12, 1.2), 8, 'brass')
    gear(m, 0.3, (0.3, -0.16, 0.95), 7, 'iron')
    m.box((C, 0.12, 0.14), at=(0, -0.22, 0.45), mat='iron', bevel=0.02)
    m.box((C, 0.04, 0.5), at=(0, -0.26, 3.5), mat='hazard')
    return m


def wall_wk_chains(seed):
    rnd = random.Random(seed)
    m = wall_wk_plate(seed)
    m.box((C, 0.3, 0.1), at=(0, -0.2, 3.4), mat='iron', bevel=0.02)
    for i in range(5):
        x = -1.6 + i * 0.8
        L = rnd.uniform(0.8, 2.2)
        n = int(L / 0.12)
        for k in range(n):
            m.ring(0.04, 0.012, at=(x, -0.3, 3.35 - k * 0.12), rot=(90 if k % 2 else 0, 90, 0), mat='iron', seg=6, tseg=4)
        m.tube([(x, -0.3, 3.35 - L), (x, -0.3, 3.2 - L), (x + 0.1, -0.3, 3.1 - L), (x + 0.12, -0.3, 3.22 - L)], 0.022, mat='rust', seg=5)
    return m


def floor_wk_plate(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    m.box((C, C, 0.2), at=(0, 0, -0.12), mat='soot')
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.96, 1.96, 0.03), at=(i, j, -0.016), mat='iron', bevel=0.006)
            for a in (-0.8, 0.8):
                for b_ in (-0.8, 0.8):
                    m.cyl(0.035, 0.012, at=(i + a, j + b_, 0.0), mat='rust', seg=6)
            for k in range(5):                           # tread bars
                m.box((0.5, 0.05, 0.008), at=(i + rnd.uniform(-0.5, 0.5), j - 0.6 + k * 0.3, 0.0), rot=(0, 0, 45 if k % 2 else -45), mat='iron')
    return m


def floor_wk_belt(seed):
    m = Mesh('floor')
    m.box((C, C, 0.06), at=(0, 0, -0.45), mat='soot')
    for s in (-1, 1):
        m.box((0.5, C, 0.16), at=(s * 1.75, 0, -0.08), mat='iron', bevel=0.02)
        m.box((0.12, C, 0.02), at=(s * 1.56, 0, 0.0), mat='hazard')
    for i in range(10):
        m.cyl(0.12, 3.0, at=(0, -1.8 + i * 0.4, -0.2), rot=(0, 90, 0), mat='iron', seg=8)
    for i in range(16):
        m.box((2.9, 0.22, 0.03), at=(0, -1.875 + i * 0.25, -0.05), mat='soot' if i % 2 else 'rust')
    return m


def floor_wk_drain(seed):
    m = Mesh('floor')
    m.box((C, C, 0.06), at=(0, 0, -0.6), mat='soot')
    m.box((3.5, 3.5, 0.02), at=(0, 0, -0.52), mat='grease_glow')
    for s in (-1, 1):
        m.box((C, 0.3, 0.1), at=(0, s * 1.85, -0.05), mat='iron', bevel=0.015)
        m.box((0.3, C - 0.6, 0.1), at=(s * 1.85, 0, -0.05), mat='iron', bevel=0.015)
    for i in range(12):
        m.box((0.09, 3.4, 0.06), at=(-1.54 + i * 0.28, 0, -0.03), mat='rust')
    for y in (-0.85, 0.85):
        m.box((3.4, 0.1, 0.05), at=(0, y, -0.05), mat='iron')
    return m


def ibeam(m, length, at, rot, mat='iron'):
    m.push(T(*at) @ R(*rot))
    m.box((length, 0.26, 0.04), at=(0, 0, 0.14), mat=mat)
    m.box((length, 0.26, 0.04), at=(0, 0, -0.14), mat=mat)
    m.box((length, 0.04, 0.28), at=(0, 0, 0), mat=mat)
    m.pop()


def ceil_wk_beams(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.1), at=(0, 0, 0.6), mat='soot')
    for i in range(10):                                  # corrugated sheet
        m.cyl(0.2, C, at=(-1.8 + i * 0.4, 0, 0.5), rot=(90, 0, 0), mat='rust', seg=6, caps=False)
    for y in (-1.4, 1.4):
        ibeam(m, C, (0, y, 0.18), (0, 0, 0))
    ibeam(m, C, (0, 0, 0.0), (0, 0, 90), 'rust')
    return m


def ceil_wk_lamp(seed):
    m = ceil_wk_beams(seed)
    m.cyl(0.015, 0.7, at=(0, 0, -0.45), mat='iron', seg=5)
    m.lathe([(0.08, -0.72), (0.5, -1.0), (0.52, -1.05)], mat='iron', seg=14)
    m.ball(0.12, at=(0, 0, -0.98), mat='bulb', seg=10)
    return m


def ceil_wk_hoist(seed):
    rnd = random.Random(seed)
    m = ceil_wk_beams(seed)
    m.box((0.5, 0.4, 0.3), at=(0.6, 0, -0.3), mat='hazard', bevel=0.04)
    m.cyl(0.14, 0.3, at=(0.6, 0, -0.5), rot=(90, 0, 0), mat='iron', seg=10)
    for k in range(9):
        m.ring(0.05, 0.014, at=(0.6, 0, -0.68 - k * 0.14), rot=(90 if k % 2 else 0, 90, 0), mat='iron', seg=6, tseg=4)
    m.tube([(0.6, 0, -1.9), (0.6, 0, -2.1), (0.75, 0, -2.25), (0.9, 0, -2.1)], 0.04, mat='rust', seg=6)
    return m


def wk_vat():
    m = Mesh('wk_vat')
    m.lathe([(1.0, 0), (1.15, 0.15), (1.15, 1.2), (1.25, 1.3), (1.05, 1.32)], mat='rust', seg=18)
    m.cyl(1.04, 0.04, at=(0, 0, 1.2), mat='grease_glow', seg=18)
    for z in (0.35, 0.9):
        m.ring(1.17, 0.04, at=(0, 0, z), mat='iron', seg=24, tseg=5)
    for i in range(4):
        m.ball(0.14 + 0.05 * i, at=(0.6 * math.cos(i * 1.7), 0.6 * math.sin(i * 1.7), 1.22), mat='grease_glow', seg=8, scale=(1, 1, 0.5))
    m.tube([(1.1, 0.3, 0.9), (1.5, 0.4, 0.9), (1.5, 0.4, 0.05)], 0.09, mat='copper', seg=8)
    m.ring(0.16, 0.02, at=(1.5, 0.4, 0.95), mat='hazard', seg=12, tseg=5)
    for i in range(3):
        m.tube([(1.16 * math.cos(2 + i), 1.16 * math.sin(2 + i), 1.25), (1.2 * math.cos(2 + i), 1.2 * math.sin(2 + i), 0.5 + 0.2 * i)], lambda t: 0.05 * (1 - t * 0.6), mat='grease', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.5, 1.4, 2.5), light=dict(color=(0.55, 0.85, 0.12), energy=1.4, range=6, at=(0, 0, 1.8), pulse=0.3)))


def wk_forge():
    m = Mesh('wk_forge')
    m.box((2.6, 1.6, 1.0), at=(0, 0, 0.5), mat='iron', bevel=0.05)
    m.box((1.2, 1.5, 1.7), at=(-0.7, 0, 1.85), mat='brick' if False else 'rust', bevel=0.05)
    m.box((0.9, 0.04, 1.0), at=(-0.7, -0.76, 1.8), mat='soot')
    m.box((0.7, 0.03, 0.8), at=(-0.7, -0.78, 1.75), mat='furnace')
    for i in range(4):
        m.box((0.06, 0.06, 0.9), at=(-0.97 + i * 0.18, -0.8, 1.78), mat='iron')
    m.cyl(0.25, 1.2, at=(-0.7, 0.2, 3.3), mat='iron', seg=10)                      # the flue
    m.box((1.1, 1.1, 0.12), at=(0.65, 0, 1.06), mat='iron', bevel=0.02)             # the mould table
    m.ball(0.34, at=(0.65, 0, 1.42), mat='furnace', seg=14, scale=(1, 1, 1.35))     # an egg, half made
    m.lathe([(0.4, 0), (0.42, 0.3), (0.3, 0.34)], at=(0.65, 0, 1.1), mat='iron', seg=14)
    m.box((0.14, 0.14, 1.4), at=(0.65, 0.6, 1.8), mat='hazard', bevel=0.02)
    m.box((0.14, 0.7, 0.14), at=(0.65, 0.3, 2.5), mat='hazard', bevel=0.02)
    m.cyl(0.05, 0.6, at=(0.65, 0.0, 2.2), mat='chrome', seg=6)
    m.lathe([(0.0, 0), (0.3, 0.1), (0.36, 0.3)], at=(0.65, 0, 1.6), mat='iron', seg=12)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.6, 2.8, 1.6), light=dict(color=(1.0, 0.45, 0.1), energy=2.2, range=7, at=(0.3, -1.0, 1.7), pulse=0.3)))


def wk_press():
    m = Mesh('wk_press')
    m.box((1.8, 1.4, 0.5), at=(0, 0, 0.25), mat='iron', bevel=0.04)
    for s in (-1, 1):
        m.cyl(0.13, 2.6, at=(s * 0.7, 0, 1.8), mat='chrome', seg=10)
        m.box((0.4, 0.5, 0.3), at=(s * 0.7, 0, 0.6), mat='hazard', bevel=0.03)
    m.box((1.9, 1.2, 0.6), at=(0, 0, 3.1), mat='rust', bevel=0.05)
    objs = [m.to_object()]
    r = Mesh('ram')
    r.box((1.2, 1.0, 0.5), at=(0, 0, 2.3), mat='iron', bevel=0.04)
    r.cyl(0.22, 0.6, at=(0, 0, 2.75), mat='chrome', seg=10)
    r.box((1.0, 0.8, 0.08), at=(0, 0, 2.02), mat='hazard')
    objs.append(r.to_object(origin=(0, 0, 2.3)))
    return dict(objects=objs, meta=dict(type='prop', solid=(1.9, 3.3, 1.4)))


def wk_bench():
    rnd = random.Random(3)
    m = Mesh('wk_bench')
    m.box((2.4, 0.9, 0.1), at=(0, 0, 0.95), mat='rust', bevel=0.02)
    for s in (-1, 1):
        m.box((0.1, 0.8, 0.9), at=(s * 1.1, 0, 0.45), mat='iron')
    m.box((2.2, 0.06, 0.4), at=(0, 0.4, 0.5), mat='iron')
    m.box((2.4, 0.06, 1.0), at=(0, 0.42, 1.55), mat='iron')                         # a peg board
    for i in range(6):
        m.box((0.05, 0.03, rnd.uniform(0.3, 0.6)), at=(-0.9 + i * 0.36, 0.38, 1.6), rot=(0, rnd.uniform(-10, 10), 0), mat=rnd.choice(['chrome', 'rust', 'brass']))
    m.box((0.3, 0.3, 0.2), at=(-0.8, -0.2, 1.1), mat='iron', bevel=0.03)             # a vice
    m.box((0.3, 0.08, 0.18), at=(-0.8, -0.42, 1.14), mat='iron', bevel=0.02)
    m.cyl(0.02, 0.4, at=(-0.8, -0.5, 1.1), rot=(0, 90, 0), mat='chrome', seg=5)
    m.cyl(0.12, 0.3, at=(0.6, 0, 1.15), mat='hazard', seg=10)                        # an oil can
    m.cyl(0.02, 0.3, at=(0.75, 0, 1.35), rot=(0, 60, 0), mat='brass', seg=5)
    m.ball(0.2, at=(0.1, -0.1, 1.0), mat='grease', seg=8, scale=(1.5, 1, 0.1))
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.4, 1.2, 0.9)))


def wk_drums():
    m = Mesh('wk_drums')
    for (x, y, z, rx, mat) in ((-0.45, 0, 0, 0, 'rust'), (0.45, 0.1, 0, 0, 'hazard'), (0, 0.05, 1.12, 0, 'iron'), (0.2, -0.95, 0.4, 90, 'rust')):
        m.push(T(x, y, z) @ R(rx, 0, 20 if rx else 0))
        m.lathe([(0.36, 0), (0.4, 0.04), (0.4, 0.36), (0.42, 0.38), (0.4, 0.4), (0.4, 0.72), (0.42, 0.74), (0.4, 0.76), (0.4, 1.06), (0.36, 1.1)], mat=mat, seg=12)
        m.cyl(0.33, 0.02, at=(0, 0, 1.1), mat='soot', seg=12)
        m.pop()
    m.ball(0.5, at=(0.6, -1.3, 0.02), mat='grease', seg=10, scale=(1.3, 1, 0.05))
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.8, 1.6, 1.2)))


# ================================================================= THE BUNKER
def bk_base(m, rnd):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='concrete_dark')
    for i in range(10):                                  # board marks: the planks the concrete was poured against
        z = i * 0.4
        th = rnd.uniform(0.03, 0.06)
        m.box((C, th, 0.385), at=(0, -th / 2, z + 0.2), mat='concrete')
    for x in (-1.5, -0.5, 0.5, 1.5):
        for z in (0.8, 2.0, 3.2):
            m.cyl(0.04, 0.03, at=(x, -0.05, z), rot=(90, 0, 0), mat='concrete_dark', seg=8)
    m.box((C, 0.02, 0.16), at=(0, -0.065, 1.1), mat='olive')


def wall_bk_concrete(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bk_base(m, rnd)
    # a stencilled number: bars and blocks, like a section mark
    for k in range(3):
        m.box((0.28, 0.012, 0.5), at=(-0.5 + k * 0.4, -0.07, 2.5), mat='stencil')
    m.box((0.28, 0.014, 0.12), at=(-0.5 + (seed % 3) * 0.4, -0.072, 2.5), mat='concrete')
    m.box((1.3, 0.012, 0.08), at=(-0.1, -0.07, 2.12), mat='stencil')
    return m


def wall_bk_conduit(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bk_base(m, rnd)
    for i, z in enumerate((2.9, 3.05, 3.2)):
        m.cyl(0.035, C, at=(0, -0.11, z), rot=(0, 90, 0), mat='tin', seg=6)
    for x in (-1.2, 0.6):
        m.box((0.4, 0.14, 0.5), at=(x, -0.12, 2.4), mat='olive', bevel=0.02)
        m.cyl(0.035, 0.4, at=(x, -0.11, 2.8), mat='tin', seg=6)
        m.cyl(0.035, 2.1, at=(x + 0.1, -0.11, 1.1), mat='tin', seg=6)
        m.box((0.16, 0.1, 0.22), at=(x + 0.1, -0.1, 1.3), mat='olive', bevel=0.02)
        m.cyl(0.02, 0.03, at=(x - 0.1, -0.2, 2.5), rot=(90, 0, 0), mat='glow_red' if x < 0 else 'glow_green', seg=6)
    for k in range(6):
        m.box((0.06, 0.03, 0.12), at=(0.47 + k * 0.05, -0.2, 2.35), mat='tin')
    return m


def wall_bk_lockers(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bk_base(m, rnd)
    for i in range(5):
        x = -1.6 + i * 0.8
        m.box((0.76, 0.3, 2.1), at=(x, -0.12, 1.35), mat='olive', bevel=0.025)
        for k in range(4):
            m.box((0.5, 0.02, 0.03), at=(x, -0.28, 2.1 - k * 0.07), rot=(30, 0, 0), mat='concrete_dark')
        m.box((0.05, 0.05, 0.16), at=(x + 0.27, -0.29, 1.3), mat='tin')
        m.box((0.3, 0.012, 0.1), at=(x, -0.275, 1.7), mat='stencil')
    m.box((C, 0.34, 0.08), at=(0, -0.12, 2.44), mat='olive')
    m.box((0.5, 0.25, 0.25), at=(0.8, -0.12, 2.6), mat='canvas', bevel=0.05)
    m.lathe([(0.2, 0), (0.24, 0.1), (0.16, 0.2), (0.0, 0.24)], at=(-0.9, -0.12, 2.48), mat='olive', seg=12)   # a helmet
    return m


def wall_bk_shelves(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bk_base(m, rnd)
    for s in (-1, 1):
        m.box((0.06, 0.5, 3.0), at=(s * 1.9, -0.25, 1.6), mat='olive')
    for z in (0.5, 1.2, 1.9, 2.6):
        m.box((3.8, 0.5, 0.05), at=(0, -0.25, z), mat='olive')
        x = -1.7
        while x < 1.6:
            k = rnd.random()
            if k < 0.45:
                m.cyl(0.11, 0.3, at=(x + 0.12, -0.25, z + 0.18), mat=rnd.choice(['tin', 'tin', 'stencil']), seg=8)
                m.cyl(0.112, 0.1, at=(x + 0.12, -0.25, z + 0.18), mat=rnd.choice(['accent', 'olive', 'hazard']), seg=8)
                x += 0.27
            elif k < 0.8:
                w = rnd.uniform(0.3, 0.5)
                m.box((w, 0.36, rnd.uniform(0.2, 0.4)), at=(x + w / 2, -0.25, z + 0.2), mat=rnd.choice(['canvas', 'olive', 'concrete_dark']), bevel=0.015)
                x += w + 0.05
            else:
                x += 0.4
    return m


def wall_bk_map(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bk_base(m, rnd)
    m.box((2.6, 0.05, 1.7), at=(-0.4, -0.08, 2.3), mat='canvas', bevel=0.01)
    m.box((2.4, 0.01, 1.5), at=(-0.4, -0.11, 2.3), mat='stencil')
    for i in range(7):                                   # roads, and pins
        a = (rnd.uniform(-1.4, 0.6), rnd.uniform(1.7, 2.9))
        b_ = (rnd.uniform(-1.4, 0.6), rnd.uniform(1.7, 2.9))
        cable(m, rnd, (a[0], -0.12, a[1]), (b_[0], -0.12, b_[1]), sag=0, r=0.008, mat='concrete_dark', n=1)
        m.ball(0.03, at=(a[0], -0.13, a[1]), mat='glow_red' if i < 2 else 'olive', seg=6)
    m.box((0.6, 0.3, 0.4), at=(1.45, -0.18, 1.5), mat='olive', bevel=0.03)             # the radio
    m.cyl(0.1, 0.02, at=(1.35, -0.34, 1.55), rot=(90, 0, 0), mat='dial', seg=12)
    for k in range(3):
        m.cyl(0.03, 0.04, at=(1.52 + k * 0.08, -0.34, 1.42), rot=(90, 0, 0), mat='tin', seg=8)
    m.cyl(0.008, 1.2, at=(1.7, -0.18, 2.3), mat='tin', seg=4)
    m.box((0.7, 0.34, 0.05), at=(1.45, -0.18, 1.28), mat='olive')
    return m


def wall_bk_cracked(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bk_base(m, rnd)
    m.box((1.5, 0.08, 1.7), at=(0.3, -0.0, 2.0), mat='concrete_dark')
    pts = [(0.9, 3.6), (0.5, 3.0), (0.7, 2.5), (0.1, 2.0), (0.35, 1.4), (-0.2, 0.8), (-0.1, 0.3)]
    for a, b_ in zip(pts, pts[1:]):
        m.tube([(a[0], -0.075, a[1]), (b_[0], -0.075, b_[1])], 0.035, mat='soot' if 'soot' in [] else 'concrete_dark', seg=4)
    for i in range(6):                                   # rebar showing
        m.tube([(-0.3 + i * 0.22, -0.05, 1.25), (-0.3 + i * 0.22 + rnd.uniform(-0.05, 0.05), -0.12, 2.8)], 0.016, mat='rust', seg=4)
    for z in (1.5, 2.1, 2.6):
        m.tube([(-0.4, -0.08, z), (1.0, -0.08, z + 0.05)], 0.016, mat='rust', seg=4)
    for i in range(5):
        s = rnd.uniform(0.15, 0.4)
        m.box((s, s * 0.8, s * 0.6), at=(rnd.uniform(-0.6, 1.2), -0.3 - rnd.random() * 0.4, s * 0.3), rot=(rnd.uniform(0, 40), rnd.uniform(0, 40), rnd.uniform(0, 90)), mat='concrete')
    m.box((0.5, 0.012, 2.4), at=(-1.3, -0.068, 1.5), mat='rust')                       # where the water comes down
    return m


def cage_lamp(m, at, rot=(0, 0, 0)):
    m.push(T(*at) @ R(*rot))
    m.cyl(0.14, 0.06, at=(0, 0, 0.03), mat='olive', seg=10)
    m.ball(0.1, at=(0, 0, 0.16), mat='bulb', seg=10, scale=(1, 1, 1.3))
    for k in range(6):
        a = k * math.pi / 3
        m.tube([(0.13 * math.cos(a), 0.13 * math.sin(a), 0.05), (0.14 * math.cos(a), 0.14 * math.sin(a), 0.22), (0, 0, 0.34)], 0.008, mat='tin', seg=4)
    m.ring(0.14, 0.008, at=(0, 0, 0.18), mat='tin', seg=12, tseg=4)
    m.pop()


def wall_bk_lamp(seed):
    m = wall_bk_concrete(seed)
    m.box((0.4, 0.06, 0.4), at=(0, -0.08, 3.1), mat='olive', bevel=0.02)
    cage_lamp(m, (0, -0.1, 3.1), (90, 0, 0))
    m.cyl(0.03, 1.0, at=(0, -0.1, 3.65), mat='tin', seg=6)
    return m


def floor_bk_slab(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    m.box((C, C, 0.2), at=(0, 0, -0.13), mat='concrete_dark')
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.96, 1.96, 0.04), at=(i, j, -0.021), mat='concrete', bevel=0.008)
    m.box((0.16, C, 0.004), at=(1.2, 0, 0.0), mat='stencil')
    for k in range(3):
        m.box((0.3, 0.1, 0.004), at=(1.2, -1.2 + k * 1.2, 0.001), mat='concrete')
    return m


def floor_bk_duck(seed):
    m = Mesh('floor')
    m.box((C, C, 0.06), at=(0, 0, -0.4), mat='concrete_dark')
    m.box((3.0, C, 0.02), at=(0, 0, -0.35), mat='soot' if False else 'concrete_dark')
    for s in (-1, 1):
        m.box((0.5, C, 0.3), at=(s * 1.75, 0, -0.15), mat='concrete', bevel=0.01)
    for y in (-1.3, 0, 1.3):
        m.box((3.0, 0.1, 0.08), at=(0, y, -0.1), mat='olive')
    for i in range(12):
        m.box((0.2, C, 0.05), at=(-1.38 + i * 0.25, 0, -0.03), mat='canvas' if i % 4 else 'olive', bevel=0.008)
    return m


def floor_bk_hatch(seed):
    m = floor_bk_slab(seed)
    m.box((2.0, 2.0, 0.03), at=(-0.6, 0, 0.0), mat='olive', bevel=0.01)
    for k in range(6):
        m.box((0.3, 0.14, 0.006), at=(-1.45 + k * 0.34, 0.92, 0.014), rot=(0, 0, 35), mat='hazard')
        m.box((0.3, 0.14, 0.006), at=(-1.45 + k * 0.34, -0.92, 0.014), rot=(0, 0, 35), mat='hazard')
    m.ring(0.2, 0.02, at=(-0.6, 0, 0.03), mat='tin', seg=14, tseg=5)
    for (x, y) in ((-1.5, -0.6), (-1.5, 0.6)):
        m.box((0.1, 0.3, 0.03), at=(x, y, 0.02), mat='tin')
    return m


def ceil_bk_slab(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.5), mat='concrete_dark')
    for i in range(10):
        th = rnd.uniform(0.02, 0.05)
        m.box((0.39, C, th), at=(-1.8 + i * 0.4, 0, 0.4 - th / 2), mat='concrete')
    for y in (-2, 2):
        m.box((C, 0.5, 0.45), at=(0, y, 0.2), mat='concrete', bevel=0.02)
    return m


def ceil_bk_bulb(seed):
    m = ceil_bk_slab(seed)
    m.cyl(0.03, C, at=(0, 0, 0.35), rot=(90, 0, 0), mat='tin', seg=6)
    cage_lamp(m, (0, 0, 0.34), (180, 0, 0))
    return m


def ceil_bk_vents(seed):
    m = ceil_bk_slab(seed)
    m.box((1.0, C, 0.5), at=(0.8, 0, 0.1), mat='tin', bevel=0.03)
    for y in (-1.5, -0.5, 0.5, 1.5):
        m.box((1.06, 0.06, 0.56), at=(0.8, y, 0.1), mat='olive')
    m.box((0.6, 0.6, 0.05), at=(0.8, 0.0, -0.17), mat='olive')
    for k in range(5):
        m.box((0.5, 0.03, 0.03), at=(0.8, -0.2 + k * 0.1, -0.2), rot=(30, 0, 0), mat='tin')
    for x in (-1.2, -0.9):
        m.cyl(0.05, C, at=(x, 0, 0.3), rot=(90, 0, 0), mat='olive', seg=6)
    return m


def bk_bunk():
    m = Mesh('bk_bunk')
    for (x, y) in ((-1.0, -0.45), (1.0, -0.45), (-1.0, 0.45), (1.0, 0.45)):
        m.cyl(0.035, 1.9, at=(x, y, 0.95), mat='olive', seg=6)
    for z in (0.45, 1.4):
        m.box((2.0, 0.9, 0.05), at=(0, 0, z), mat='olive')
        m.box((1.9, 0.82, 0.14), at=(0, 0, z + 0.09), mat='canvas', bevel=0.04)
        m.box((0.45, 0.6, 0.12), at=(-0.7, 0, z + 0.2), mat='stencil', bevel=0.05)
    m.box((1.2, 0.84, 0.06), at=(0.3, 0, 1.58), rot=(0, 3, 0), mat='olive', bevel=0.02)   # a blanket, squared away
    for k in range(4):
        m.cyl(0.02, 0.9, at=(1.0, 0, 0.6 + k * 0.25), rot=(90, 0, 0), mat='olive', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.1, 1.9, 1.0)))


def bk_console():
    rnd = random.Random(5)
    m = Mesh('bk_console')
    m.box((2.2, 0.7, 0.9), at=(0, 0.1, 0.45), mat='olive', bevel=0.03)
    m.box((2.2, 0.7, 0.1), at=(0, -0.1, 0.98), rot=(20, 0, 0), mat='concrete_dark', bevel=0.02)
    m.box((2.2, 0.2, 0.9), at=(0, 0.35, 1.45), mat='olive', bevel=0.03)
    m.box((0.8, 0.03, 0.55), at=(-0.6, 0.24, 1.5), mat='screen')
    for i in range(3):
        m.cyl(0.14, 0.03, at=(0.25 + i * 0.36, 0.24, 1.62), rot=(90, 0, 0), mat='dial', seg=14)
        m.box((0.012, 0.03, 0.11), at=(0.25 + i * 0.36 + 0.03, 0.225, 1.65), rot=(0, rnd.uniform(-50, 50), 0), mat='concrete_dark')
    for r_ in range(2):
        for c in range(9):
            m.box((0.1, 0.1, 0.04), at=(-0.95 + c * 0.22, -0.2 + r_ * 0.2, 1.0 + r_ * 0.07), rot=(20, 0, 0), mat=rnd.choice(['tin', 'glow_red', 'glow_green', 'glow_amber', 'tin', 'stencil']), bevel=0.01)
    for i in range(4):
        m.cyl(0.02, 0.14, at=(0.3 + i * 0.2, 0.26, 1.3), rot=(60, 0, 0), mat='tin', seg=5)
    m.box((0.5, 0.012, 0.1), at=(0.6, 0.245, 1.84), mat='stencil')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.2, 1.9, 0.9), screen=dict(at=(-0.6, -0.26, 1.5), size=(0.74, 0.5), tilt=0),
                light=dict(color=(1.0, 0.85, 0.5), energy=0.6, range=4, at=(0, -0.8, 1.5))))


def bk_generator():
    m = Mesh('bk_generator')
    m.box((2.4, 1.1, 0.2), at=(0, 0, 0.1), mat='concrete_dark')
    m.cyl(0.5, 1.2, at=(-0.5, 0, 0.75), rot=(0, 90, 0), mat='olive', seg=14)
    for k in range(7):
        m.cyl(0.54, 0.04, at=(-1.0 + k * 0.16, 0, 0.75), rot=(0, 90, 0), mat='concrete_dark', seg=14)
    m.box((0.9, 0.9, 1.0), at=(0.7, 0, 0.7), mat='olive', bevel=0.04)
    m.cyl(0.07, 1.6, at=(0.9, 0.2, 1.9), mat='tin', seg=8)
    m.cyl(0.1, 0.2, at=(0.9, 0.2, 2.7), mat='rust', seg=8)
    m.cyl(0.25, 0.4, at=(0.2, -0.3, 1.4), mat='hazard', seg=10)                     # a fuel tank
    m.box((0.4, 0.03, 0.3), at=(0.7, -0.46, 0.9), mat='concrete_dark')
    m.cyl(0.05, 0.02, at=(0.6, -0.48, 0.95), rot=(90, 0, 0), mat='glow_green', seg=8)
    m.cyl(0.05, 0.02, at=(0.8, -0.48, 0.95), rot=(90, 0, 0), mat='dial', seg=8)
    objs = [m.to_object()]
    f = Mesh('spin0')                                  # the flywheel turns
    f.cyl(0.4, 0.1, at=(0, 0, 0), mat='tin', seg=16)
    for k in range(4):
        f.box((0.7, 0.07, 0.11), at=(0, 0, 0), rot=(0, 0, k * 45), mat='olive')
    fo = f.to_object(origin=(0, 0, 0))
    fo.rotation_euler = (0, math.radians(90), 0)
    fo.location = (-1.25, 0, 0.75)
    objs.append(fo)
    return dict(objects=objs, meta=dict(type='prop', solid=(2.4, 1.5, 1.1), spin={'spin0': 300}))


def bk_table():
    rnd = random.Random(6)
    m = Mesh('bk_table')
    m.box((2.2, 0.9, 0.06), at=(0, 0, 0.8), mat='tin', bevel=0.01)
    for s in (-1, 1):
        m.box((0.06, 0.8, 0.8), at=(s * 1.0, 0, 0.4), mat='olive')
        m.box((2.0, 0.3, 0.05), at=(0, s * 0.75, 0.45), mat='olive')
        for x in (-0.9, 0.9):
            m.cyl(0.03, 0.45, at=(x, s * 0.75, 0.22), mat='olive', seg=5)
    for i in range(5):
        m.cyl(0.07, 0.14, at=(rnd.uniform(-0.9, 0.9), rnd.uniform(-0.3, 0.3), 0.9), mat='tin', seg=8)
    m.cyl(0.18, 0.02, at=(0.2, 0.1, 0.84), mat='stencil', seg=12)
    m.box((0.3, 0.2, 0.1), at=(-0.6, -0.1, 0.88), mat='canvas', bevel=0.02)
    m.lathe([(0.06, 0), (0.08, 0.2), (0.03, 0.26), (0.03, 0.34)], at=(0.7, 0.2, 0.83), mat='olive', seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.2, 0.9, 1.8)))


def bk_shower():
    m = Mesh('bk_shower')
    m.cyl(0.9, 0.08, at=(0, 0, 0.04), mat='tin', seg=18)
    m.ring(0.85, 0.04, at=(0, 0, 0.1), mat='hazard', seg=20, tseg=5)
    for k in range(3):
        a = math.radians(90 + k * 120)
        m.cyl(0.04, 2.6, at=(0.85 * math.cos(a), 0.85 * math.sin(a), 1.35), mat='tin', seg=6)
    m.ring(0.85, 0.035, at=(0, 0, 2.65), mat='tin', seg=20, tseg=5)
    m.lathe([(0.04, 2.65), (0.3, 2.5), (0.32, 2.46)], mat='tin', seg=12)
    for k in range(8):
        a = k * 0.785
        m.cyl(0.006, 2.2, at=(0.2 * math.cos(a), 0.2 * math.sin(a), 1.35), mat='glow_cyan', seg=4)
    m.box((0.3, 0.1, 0.4), at=(0, 0.88, 1.4), mat='olive', bevel=0.02)
    m.cyl(0.05, 0.03, at=(0, 0.82, 1.45), rot=(90, 0, 0), mat='glow_cyan', seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solids=[[0, 1.4, 0.88, 0.5, 2.8, 0.2]], light=dict(color=(0.3, 0.8, 1.0), energy=0.6, range=4, at=(0, 0, 2.2))))


def bk_crates():
    rnd = random.Random(7)
    m = Mesh('bk_crates')
    for (x, y, z, rz) in ((-0.5, 0, 0, 5), (0.55, 0.05, 0, -8), (0.0, 0.0, 0.52, 12)):
        m.push(T(x, y, z) @ R(0, 0, rz))
        m.box((1.0, 0.6, 0.5), at=(0, 0, 0.25), mat='olive', bevel=0.02)
        m.box((1.02, 0.62, 0.05), at=(0, 0, 0.42), mat='concrete_dark')
        m.box((0.5, 0.012, 0.14), at=(0, -0.305, 0.22), mat='stencil')
        for s in (-1, 1):
            m.tube([(s * 0.52, -0.12, 0.3), (s * 0.58, 0, 0.25), (s * 0.52, 0.12, 0.3)], 0.014, mat='canvas', seg=4)
        m.pop()
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.1, 1.0, 0.8)))


# ================================================================= THE CRYPT
def cr_base(m):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='stone')
    m.prism([(0, 0), (0.2, 0), (0.2, 0.25), (0.1, 0.4), (0, 0.4)], C, at=(-2, 0, 0), rot=(90, 0, 90), mat='stone_light')
    m.prism([(0, 0), (0.24, 0.16), (0.24, 0.3), (0, 0.3)], C, at=(-2, 0, H - 0.3), rot=(90, 0, 90), mat='stone_light')


def wall_cr_blocks(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    cr_base(m)
    courses(m, rnd, -2, 0.4, 2, H - 0.3, h=0.55, w=1.1, mats=('stone', 'stone', 'stone_light'), back='marble', t=(0.05, 0.1), bevel=0.02)
    return m


def gothic(w, h, n=6):
    """A pointed arch outline (x, z), from the left foot round to the right foot."""
    pts = [(-w / 2, 0), (-w / 2, h * 0.55)]
    for i in range(1, n):
        t = i / n
        pts.append((-w / 2 + w / 2 * (1 - math.cos(t * math.pi / 2)) , h * 0.55 + h * 0.45 * math.sin(t * math.pi / 2)))
    pts.append((0, h))
    pts += [(-x, z) for (x, z) in reversed(pts[:-1])]
    return pts


def wall_cr_niches(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    cr_base(m)
    courses(m, rnd, -2, 0.4, 2, 0.95, h=0.55, w=1.1, mats=('stone', 'stone_light'), back='marble', bevel=0.02)
    courses(m, rnd, -2, 3.15, 2, H - 0.3, h=0.55, w=1.1, mats=('stone', 'stone_light'), back='marble', bevel=0.02)
    m.box((C, 0.04, 2.2), at=(0, 0.02, 2.05), mat='marble')
    for j, z in enumerate((0.95, 2.05)):
        for i in range(3):
            x = -1.33 + i * 1.33
            m.box((0.12, 0.2, 1.05), at=(x - 0.66, -0.06, z + 0.55), mat='stone_light', bevel=0.02)
            m.box((1.3, 0.3, 0.08), at=(x, -0.1, z + 0.02), mat='stone_light', bevel=0.02)
            k = rnd.random()
            if k < 0.4:                                  # an urn
                m.lathe([(0.08, 0), (0.2, 0.12), (0.22, 0.32), (0.1, 0.46), (0.13, 0.52)], at=(x, -0.1, z + 0.06), mat=rnd.choice(['marble', 'gold', 'stone_light']), seg=10)
            elif k < 0.75:                               # a skull, facing out
                m.ball(0.15, at=(x, -0.14, z + 0.24), mat='bone', seg=10, scale=(0.9, 1.0, 1.0))
                m.box((0.16, 0.1, 0.1), at=(x, -0.22, z + 0.12), mat='bone', bevel=0.02)
                for s in (-1, 1):
                    m.ball(0.04, at=(x + s * 0.06, -0.27, z + 0.26), mat='soot' if False else 'marble', seg=6)
            else:                                        # a candle, lit
                m.cyl(0.04, 0.3, at=(x, -0.15, z + 0.2), mat='wax', seg=6)
                m.lathe([(0.0, 0), (0.03, 0.04), (0.0, 0.12)], at=(x, -0.15, z + 0.36), mat='flame', seg=6)
        m.box((0.12, 0.2, 1.05), at=(1.94, -0.06, z + 0.55), mat='stone_light', bevel=0.02)
    return m


def wall_cr_arch(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    cr_base(m)
    courses(m, rnd, -2, 0.4, -1.0, H - 0.3, h=0.55, w=1.1, mats=('stone', 'stone_light'), back='marble', bevel=0.02)
    courses(m, rnd, 1.0, 0.4, 2, H - 0.3, h=0.55, w=1.1, mats=('stone', 'stone_light'), back='marble', bevel=0.02)
    m.box((2.0, 0.04, H - 0.7), at=(0, 0.02, H / 2 + 0.05), mat='marble')
    g = gothic(1.7, 2.9)
    m.tube([(x, -0.08, z + 0.5) for (x, z) in g], 0.09, mat='stone_light', seg=6)
    mats = ['stained_a', 'stained_b', 'stained_c']
    for i in range(4):                                   # lights of coloured glass between stone bars
        for j in range(5):
            x = -0.6 + i * 0.4
            z = 0.75 + j * 0.5
            lim = 0.85 * (1 - max(0, (z - 2.1)) / 1.4)
            if abs(x) < lim:
                m.prism([(-0.17, 0), (0, -0.2), (0.17, 0), (0, 0.2)], 0.015, at=(x, -0.02, z), rot=(90, 0, 0), mat=mats[(i * 2 + j + seed) % 3])
    m.cyl(0.035, 2.7, at=(0, -0.05, 1.9), mat='stone_light', seg=6)
    m.ring(0.3, 0.035, at=(0, -0.06, 2.9), rot=(90, 0, 0), mat='stone_light', seg=14, tseg=5)
    m.box((1.9, 0.3, 0.12), at=(0, -0.1, 0.5), mat='stone_light', bevel=0.03)
    return m


def wall_cr_plaque(seed):
    m = wall_cr_blocks(seed)
    m.box((1.9, 0.1, 1.3), at=(0, -0.1, 2.1), mat='marble', bevel=0.04)
    m.box((2.0, 0.08, 0.1), at=(0, -0.12, 2.8), mat='gold', bevel=0.02)
    for k in range(6):
        m.box((1.4 - (k % 3) * 0.25, 0.012, 0.05), at=(0, -0.155, 2.55 - k * 0.16), mat='gold')
    m.ring(0.32, 0.06, at=(0, -0.2, 1.1), rot=(90, 0, 0), mat='root', seg=18, tseg=6)     # a wreath, long dead
    m.cyl(0.04, 0.2, at=(-0.85, -0.16, 1.5), mat='wax', seg=6)
    m.lathe([(0.0, 0), (0.03, 0.04), (0.0, 0.12)], at=(-0.85, -0.16, 1.61), mat='flame', seg=6)
    m.box((0.3, 0.2, 0.06), at=(-0.85, -0.14, 1.38), mat='stone_light', bevel=0.02)
    return m


def wall_cr_bones(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    cr_base(m)
    m.box((C, 0.04, H - 0.7), at=(0, 0.02, H / 2 + 0.05), mat='marble')
    z = 0.5
    row = 0
    while z < H - 0.5:
        if row % 3 == 1:                                 # a course of skulls
            x = -1.85
            while x < 1.9:
                m.ball(0.15, at=(x, -0.1, z + 0.14), mat='bone', seg=8, scale=(0.9, 0.9, 1.0))
                for s in (-1, 1):
                    m.ball(0.04, at=(x + s * 0.055, -0.22, z + 0.16), mat='marble', seg=5)
                m.box((0.05, 0.03, 0.05), at=(x, -0.22, z + 0.08), mat='marble')
                x += 0.31
            z += 0.3
        else:                                            # long bones, ends out
            x = -1.92
            while x < 1.95:
                r = rnd.uniform(0.04, 0.065)
                m.cyl(r, 0.2, at=(x, -0.08, z + 0.07), rot=(90, 0, 0), mat='bone', seg=6)
                m.ball(r * 0.8, at=(x - r * 0.5, -0.19, z + 0.07), mat='bone', seg=5)
                m.ball(r * 0.8, at=(x + r * 0.5, -0.19, z + 0.07), mat='bone', seg=5)
                x += 0.15
            z += 0.15
        row += 1
    return m


def wall_cr_sconce(seed):
    m = wall_cr_blocks(seed)
    m.box((0.3, 0.1, 0.5), at=(0, -0.12, 2.3), mat='marble', bevel=0.03)
    m.tube([(0, -0.15, 2.3), (0, -0.45, 2.35), (0, -0.5, 2.6)], 0.035, mat='iron' if False else 'marble', seg=6)
    m.lathe([(0.05, 0), (0.2, 0.1), (0.24, 0.22)], at=(0, -0.5, 2.6), mat='gold', seg=10)
    m.lathe([(0.0, 0), (0.12, 0.1), (0.07, 0.3), (0.0, 0.55)], at=(0, -0.5, 2.8), mat='flame', seg=8)
    return m


def wall_cr_broken(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    cr_base(m)
    courses(m, rnd, -2, 0.4, 2, 2.0, h=0.55, w=1.1, mats=('stone', 'stone_light'), back='marble', bevel=0.02)
    courses(m, rnd, -2, 2.0, -0.3, H - 0.3, h=0.55, w=1.1, mats=('stone', 'stone_light'), back='marble', bevel=0.02)
    m.box((2.3, 0.05, 1.8), at=(0.85, 0.0, 2.9), mat='root')
    for i in range(6):
        s = rnd.uniform(0.3, 0.6)
        m.box((s * 1.6, s * 0.6, s), at=(rnd.uniform(0.0, 1.6), -0.3 - rnd.random() * 0.5, s * 0.5), rot=(rnd.uniform(-15, 15), rnd.uniform(-15, 15), rnd.uniform(0, 90)), mat='stone_light', bevel=0.03)
    for i in range(7):                                   # roots have come through
        x = rnd.uniform(0.0, 1.8)
        pts = [(x, -0.03, 3.6)]
        for k in range(1, 5):
            pts.append((x + math.sin(k * 1.7 + i) * 0.2, -0.05 - k * 0.04, 3.6 - k * rnd.uniform(0.3, 0.5)))
        m.tube(pts, lambda t: 0.05 * (1 - t * 0.8), mat='root', seg=5)
    return m


def floor_cr_flag(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    m.box((C, C, 0.2), at=(0, 0, -0.13), mat='marble')
    from tiles import bsp
    for (a, b_, c, d) in bsp(rnd, -2, -2, 2, 2, 0.8, 0.5):
        t = rnd.uniform(0.03, 0.045)
        m.box((c - a - 0.04, d - b_ - 0.04, t), at=((a + c) / 2, (b_ + d) / 2, -0.035 + t / 2 - 0.01), mat=rnd.choice(['stone', 'stone', 'stone_light']), bevel=0.012)
    return m


def floor_cr_grave(seed):
    m = floor_cr_flag(seed)
    m.box((1.5, 3.0, 0.05), at=(0, 0, -0.012), mat='marble', bevel=0.015)
    m.box((1.3, 2.8, 0.008), at=(0, 0, 0.014), mat='stone')
    for k in range(7):
        m.box((0.9 - (k % 3) * 0.2, 0.06, 0.006), at=(0, 0.9 - k * 0.22, 0.02), mat='gold')
    m.ring(0.25, 0.02, at=(0, -1.0, 0.02), mat='gold', seg=16, tseg=4)
    m.box((0.04, 0.4, 0.006), at=(0, -1.0, 0.02), mat='gold')
    m.box((0.26, 0.04, 0.006), at=(0, -0.92, 0.02), mat='gold')
    return m


def floor_cr_mosaic(seed):
    m = Mesh('floor')
    m.box((C, C, 0.2), at=(0, 0, -0.13), mat='marble')
    m.box((3.96, 3.96, 0.03), at=(0, 0, -0.02), mat='stone', bevel=0.008)
    mats = ['stone_light', 'gold', 'tess_a', 'stone_light', 'tess_b', 'stone_light']
    for ring_i, (r, n) in enumerate(((0.45, 8), (0.85, 14), (1.25, 20), (1.65, 26))):
        for k in range(n):
            a = 2 * math.pi * k / n
            m.box((0.2, 2 * math.pi * r / n * 0.82, 0.012), at=(r * math.cos(a), r * math.sin(a), 0.0), rot=(0, 0, math.degrees(a)), mat=mats[(k + ring_i) % len(mats)] if (k + ring_i) % 3 else 'stone_light')
    m.cyl(0.2, 0.012, at=(0, 0, 0.0), mat='gold', seg=12)
    return m


def ceil_cr_vault(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 1.3), mat='stone')
    n = 8
    for (sx, sy) in ((1, 1), (1, -1), (-1, 1), (-1, -1)):          # ribs spring from the corners to a boss
        pts = [(sx * 2 * (1 - i / n), sy * 2 * (1 - i / n), 1.1 * math.sin(i / n * math.pi / 2)) for i in range(n + 1)]
        m.tube(pts, 0.09, mat='stone_light', seg=6)
    for (ax, s) in (('x', 1), ('x', -1), ('y', 1), ('y', -1)):      # and along each side
        pts = []
        for i in range(n + 1):
            t = -2 + 4 * i / n
            z = 0.7 * math.sin(i / n * math.pi)
            pts.append((t, s * 2, z) if ax == 'x' else (s * 2, t, z))
        m.tube(pts, 0.08, mat='stone_light', seg=6)
    # the webs between the ribs: four curved panels, built as bands
    for q in range(4):
        m.push(R(0, 0, q * 90))
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            z0, z1 = 1.1 * math.sin(t0 * math.pi / 2), 1.1 * math.sin(t1 * math.pi / 2)
            w0, w1 = 2 * (1 - t0), 2 * (1 - t1)
            m.prism([(-w0, 0), (w0, 0), (w1, 0.3), (-w1, 0.3)], 0.05, at=(0, -w0, z0 + 0.06), rot=(math.degrees(math.atan2(z1 - z0, w0 - w1)) , 0, 0), mat='stone')
        m.pop()
    m.lathe([(0.0, 0.95), (0.22, 1.0), (0.26, 1.1), (0.1, 1.2)], mat='gold', seg=10)
    return m


def ceil_cr_chandelier(seed):
    m = ceil_cr_vault(seed)
    m.cyl(0.02, 1.3, at=(0, 0, 0.3), mat='marble', seg=5)
    m.ring(0.9, 0.04, at=(0, 0, -0.4), mat='marble', seg=24, tseg=5)
    for k in range(4):
        a = k * math.pi / 2
        m.tube([(0, 0, 0.1), (0.9 * math.cos(a), 0.9 * math.sin(a), -0.4)], 0.012, mat='marble', seg=4)
    for k in range(8):
        a = k * math.pi / 4
        x, y = 0.9 * math.cos(a), 0.9 * math.sin(a)
        m.cyl(0.035, 0.2, at=(x, y, -0.28), mat='wax', seg=6)
        m.lathe([(0.0, 0), (0.03, 0.04), (0.0, 0.12)], at=(x, y, -0.17), mat='flame', seg=6)
    return m


def ceil_cr_roots(seed):
    rnd = random.Random(seed)
    m = ceil_cr_vault(seed)
    for i in range(9):
        x, y = rnd.uniform(-1.6, 1.6), rnd.uniform(-1.6, 1.6)
        pts = [(x, y, 0.9)]
        for k in range(1, 5):
            pts.append((x + math.sin(k * 1.3 + i) * 0.15, y + math.cos(k * 1.1 + i) * 0.15, 0.9 - k * rnd.uniform(0.25, 0.5)))
        m.tube(pts, lambda t: 0.045 * (1 - t * 0.85), mat='root', seg=5)
    return m


def cr_coffin():
    m = Mesh('cr_coffin')
    m.box((1.3, 2.6, 0.2), at=(0, 0, 0.1), mat='stone_light', bevel=0.03)
    m.box((1.1, 2.4, 0.8), at=(0, 0, 0.6), mat='stone', bevel=0.03)
    for s in (-1, 1):
        for k in range(4):
            m.prism([(-0.2, 0), (0.2, 0), (0.2, 0.3), (0, 0.45), (-0.2, 0.3)], 0.03, at=(s * 0.55, -0.9 + k * 0.6, 0.35), rot=(90, 0, 90 * s), mat='marble')
    m.box((0.9, 2.2, 0.03), at=(0, 0, 1.0), mat='marble')
    lid = Mesh('lid')
    lid.prism([(-0.62, 0), (0.62, 0), (0.62, 0.12), (0.3, 0.3), (-0.3, 0.3), (-0.62, 0.12)], 2.5, at=(0, 1.25, 1.0), rot=(90, 0, 0), mat='stone_light', bevel=0.02)
    lid.box((0.12, 1.5, 0.03), at=(0, 0.1, 1.31), mat='gold')
    lid.box((0.6, 0.12, 0.03), at=(0, 0.5, 1.31), mat='gold')
    lid.ball(0.16, at=(0, -0.9, 1.3), mat='stone', seg=8, scale=(1, 1.2, 0.5))
    return dict(objects=[m.to_object(), lid.to_object(origin=(0.62, 0, 1.0))], meta=dict(type='prop', solid=(1.3, 1.3, 2.6), time=1.2,
                parts={'lid': dict(move=(0.75, 0, -0.1), rot_axis=(0, 1, 0), rot_deg=28)}))


def cr_statue():
    m = Mesh('cr_statue')
    m.box((1.0, 1.0, 0.7), at=(0, 0, 0.35), mat='stone_light', bevel=0.04)
    m.box((0.6, 0.02, 0.3), at=(0, -0.51, 0.4), mat='gold')
    m.lathe([(0.42, 0.7), (0.36, 0.9), (0.3, 1.6), (0.36, 2.1), (0.3, 2.3), (0.14, 2.4)], mat='stone', seg=10, smooth=False)      # a robed figure
    m.lathe([(0.2, 2.35), (0.26, 2.55), (0.22, 2.78), (0.0, 2.9)], mat='stone', seg=10)                                              # a hood
    m.ball(0.14, at=(0, -0.1, 2.58), mat='marble', seg=8, scale=(1, 0.5, 1.2))                                                       # with no face in it
    for s in (-1, 1):
        m.tube([(s * 0.34, 0, 2.15), (s * 0.4, -0.25, 1.8), (s * 0.12, -0.42, 1.75)], 0.07, mat='stone', seg=6)
    m.lathe([(0.06, 0), (0.16, 0.06), (0.18, 0.16)], at=(0, -0.45, 1.72), mat='gold', seg=10)                                        # it holds a bowl
    m.lathe([(0.0, 0), (0.07, 0.06), (0.04, 0.18), (0.0, 0.3)], at=(0, -0.45, 1.86), mat='flame', seg=6)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.0, 2.9, 1.0), light=dict(color=(1.0, 0.66, 0.22), energy=0.9, range=5, at=(0, -0.6, 2.0), pulse=0.25)))


def cr_plinth():
    m = Mesh('cr_plinth')
    m.box((0.9, 0.9, 0.16), at=(0, 0, 0.08), mat='stone_light', bevel=0.03)
    m.box((0.6, 0.6, 0.9), at=(0, 0, 0.6), mat='stone', bevel=0.03)
    m.box((0.8, 0.8, 0.12), at=(0, 0, 1.1), mat='stone_light', bevel=0.03)
    m.box((0.4, 0.02, 0.2), at=(0, -0.31, 0.75), mat='gold')
    m.cyl(0.25, 0.03, at=(0, 0, 1.17), mat='marble', seg=14)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.9, 1.2, 0.9)))


def cr_brazier():
    m = Mesh('cr_brazier')
    for k in range(3):
        a = math.radians(k * 120)
        m.tube([(0.5 * math.cos(a), 0.5 * math.sin(a), 0), (0.2 * math.cos(a), 0.2 * math.sin(a), 0.7), (0.4 * math.cos(a), 0.4 * math.sin(a), 1.1)], 0.035, mat='marble', seg=6)
    m.lathe([(0.1, 0.95), (0.45, 1.05), (0.55, 1.25), (0.5, 1.28)], mat='marble', seg=14)
    m.ball(0.4, at=(0, 0, 1.24), mat='soot' if False else 'marble', seg=10, scale=(1, 1, 0.3))
    for i in range(5):
        a = i * 1.26
        m.lathe([(0.0, 0), (0.14, 0.12), (0.08, 0.4), (0.0, 0.7 - 0.1 * (i % 2))], at=(0.18 * math.cos(a), 0.18 * math.sin(a), 1.25), mat='flame', seg=6)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.0, 1.3, 1.0), light=dict(color=(1.0, 0.62, 0.2), energy=2.2, range=9, at=(0, 0, 1.9), pulse=0.3)))


def cr_candles():
    rnd = random.Random(8)
    m = Mesh('cr_candles')
    m.ball(0.5, at=(0, 0, 0.0), mat='wax', seg=10, scale=(1.2, 1.0, 0.06))
    for i in range(11):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(0, 0.45)
        h = rnd.uniform(0.12, 0.6)
        x, y = d * math.cos(a), d * math.sin(a)
        m.cyl(rnd.uniform(0.03, 0.05), h, at=(x, y, h / 2), mat='wax', seg=6)
        if i % 4:
            m.lathe([(0.0, 0), (0.03, 0.04), (0.0, 0.13)], at=(x, y, h), mat='flame', seg=6)
    return dict(objects=[m.to_object()], meta=dict(type='prop', light=dict(color=(1.0, 0.66, 0.22), energy=1.0, range=5, at=(0, 0, 0.8), pulse=0.3)))


def cr_bones():
    rnd = random.Random(9)
    m = Mesh('cr_bones')
    for i in range(14):
        x, y = rnd.uniform(-0.7, 0.7), rnd.uniform(-0.7, 0.7)
        L = rnd.uniform(0.3, 0.6)
        m.push(T(x, y, 0.06 + i * 0.02) @ R(rnd.uniform(-20, 20), 90 + rnd.uniform(-20, 20), rnd.uniform(0, 180)))
        m.cyl(0.03, L, mat='bone', seg=5)
        for s in (-1, 1):
            m.ball(0.045, at=(0, 0, s * L / 2), mat='bone', seg=5)
        m.pop()
    for (x, y, z) in ((0.1, 0.0, 0.4), (-0.4, 0.3, 0.2), (0.45, -0.3, 0.18)):
        m.ball(0.15, at=(x, y, z), mat='bone', seg=8)
        m.box((0.14, 0.1, 0.08), at=(x, y - 0.1, z - 0.11), mat='bone', bevel=0.02)
        for s in (-1, 1):
            m.ball(0.04, at=(x + s * 0.055, y - 0.13, z + 0.02), mat='marble', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop'))



# ================================================================= DOORS that are not high-tech
DW, DH, DT = 2.6, 3.2, 0.7


def _frame(m, body, trim):
    side = (C - DW) / 2
    for s in (-1, 1):
        m.box((side, DT, H), at=(s * (DW / 2 + side / 2), 0, H / 2), mat=body)
        m.box((0.18, DT + 0.16, DH + 0.1), at=(s * (DW / 2 + 0.09), 0, DH / 2), mat=trim, bevel=0.03)
        m.box((0.06, DT + 0.2, 0.3), at=(s * (DW / 2 + 0.1), 0, 1.5), mat='lock')
    m.box((DW, DT, H - DH), at=(0, 0, DH + (H - DH) / 2), mat=body)
    m.box((DW + 0.36, DT + 0.16, 0.2), at=(0, 0, DH + 0.1), mat=trim, bevel=0.03)


def door_wk_shutter():
    """The Works: two riveted iron leaves on wheels; a chain hauls them apart."""
    fr = Mesh('frame')
    _frame(fr, 'iron', 'rust')
    fr.box((C, 0.12, 0.1), at=(0, -DT / 2 - 0.1, DH + 0.3), mat='iron')         # the rail they hang from
    fr.box((C, 0.12, 0.1), at=(0, DT / 2 + 0.1, DH + 0.3), mat='iron')
    gear(fr, 0.3, (1.6, -DT / 2 - 0.12, 2.2), 8, 'brass', 0.08)
    objs = [fr.to_object()]
    parts = {}
    for name, s in (('leaf_l', -1), ('leaf_r', 1)):
        m = Mesh(name)
        m.box((DW / 2, 0.2, DH), at=(s * DW / 4, 0, DH / 2), mat='iron', bevel=0.02)
        for z in (0.5, 1.6, 2.7):
            m.box((DW / 2 - 0.1, 0.3, 0.14), at=(s * DW / 4, 0, z), mat='rust', bevel=0.02)
            for k in range(4):
                for f in (-1, 1):
                    m.cyl(0.035, 0.03, at=(s * (0.15 + k * 0.33), f * 0.16, z), rot=(90, 0, 0), mat='iron', seg=6)
        m.box((0.12, 0.26, DH), at=(s * 0.07, 0, DH / 2), mat='hazard')
        m.box((0.3, 0.3, 0.12), at=(s * 0.5, 0, 1.5), mat='lock')
        for f in (-1, 1):
            m.cyl(0.14, 0.06, at=(s * DW / 4, f * 0.2, DH + 0.12), rot=(90, 0, 0), mat='brass', seg=10)
        objs.append(m.to_object(origin=(0, 0, 0)))
        parts[name] = dict(move=(s * (DW / 2 - 0.08), 0, 0))
    return dict(objects=objs, meta=dict(type='door', time=0.8, sound='door_heavy', parts=parts))


def door_bk_blast():
    """The bunker: one thick olive slab with a wheel; it swings."""
    fr = Mesh('frame')
    _frame(fr, 'concrete', 'olive')
    for k in range(7):
        fr.box((0.3, DT + 0.18, 0.12), at=(-DW / 2 - 0.4 + 0.02 * k, 0, 0.3 + k * 0.02), rot=(0, 35, 0), mat='hazard') if k < 1 else None
    fr.box((DW, DT + 0.1, 0.06), at=(0, 0, 0.03), mat='olive')
    objs = [fr.to_object()]
    m = Mesh('slab')
    m.box((DW, 0.34, DH), at=(DW / 2, 0, DH / 2), mat='olive', bevel=0.04)
    for f in (-1, 1):
        m.box((DW - 0.5, 0.04, DH - 0.6), at=(DW / 2, f * 0.18, DH / 2), mat='concrete_dark', bevel=0.02)
        m.ring(0.36, 0.035, at=(DW / 2, f * 0.3, 1.6), rot=(90, 0, 0), mat='tin', seg=18, tseg=5)
        for k in range(3):
            m.box((0.7, 0.03, 0.04), at=(DW / 2, f * 0.3, 1.6), rot=(0, k * 60, 0), mat='tin')
        m.cyl(0.07, 0.14, at=(DW / 2, f * 0.24, 1.6), rot=(90, 0, 0), mat='olive', seg=8)
        m.box((0.8, 0.02, 0.2), at=(DW / 2, f * 0.205, 2.6), mat='stencil')
        m.box((0.3, 0.05, 0.14), at=(DW - 0.3, f * 0.2, 1.6), mat='lock')
    for z in (0.6, 1.6, 2.6):
        m.cyl(0.09, 0.4, at=(0.02, 0, z), mat='tin', seg=8)
    objs.append(m.to_object(origin=(0, 0, 0)))
    # the slab is modelled hinge-at-origin, then set at the left jamb
    objs[-1].location = (-DW / 2, 0, 0)
    return dict(objects=objs, meta=dict(type='door', time=1.0, sound='door_vault', parts={'slab': dict(rot_axis=(0, 0, 1), rot_deg=-96)}))


def door_cr_slab():
    """The crypt: a carved stone slab that sinks into the floor under a pointed arch."""
    fr = Mesh('frame')
    _frame(fr, 'stone', 'stone_light')
    for f in (-1, 1):
        fr.tube([(x, f * (DT / 2 + 0.06), z) for (x, z) in gothic(DW + 0.3, DH + 0.55)], 0.1, mat='stone_light', seg=6)
        fr.ball(0.16, at=(0, f * (DT / 2 + 0.12), DH + 0.42), mat='bone', seg=8)
        for s in (-1, 1):
            fr.ball(0.04, at=(s * 0.06, f * (DT / 2 + 0.26), DH + 0.44), mat='marble', seg=5)
    objs = [fr.to_object()]
    m = Mesh('slab')
    m.box((DW, 0.36, DH), at=(0, 0, DH / 2), mat='stone', bevel=0.03)
    for f in (-1, 1):
        m.box((DW - 0.5, 0.04, DH - 0.5), at=(0, f * 0.19, DH / 2), mat='marble', bevel=0.02)
        m.box((0.14, 0.03, 1.8), at=(0, f * 0.22, 1.8), mat='gold')
        m.box((0.9, 0.03, 0.14), at=(0, f * 0.22, 2.25), mat='gold')
        m.ring(0.5, 0.03, at=(0, f * 0.21, 2.25), rot=(90, 0, 0), mat='gold', seg=20, tseg=4)
        m.box((0.4, 0.05, 0.16), at=(0, f * 0.21, 0.7), mat='lock')
    objs.append(m.to_object(origin=(0, 0, 0)))
    return dict(objects=objs, meta=dict(type='door', time=1.3, sound='door_vault', parts={'slab': dict(move=(0, 0, -DH + 0.12))}))

KITS = {
    'works': dict(mats=WORKS_MATS,
        tiles={'wall_wk_plate': lambda: wall_wk_plate(1), 'wall_wk_brick': lambda: wall_wk_brick(2), 'wall_wk_furnace': lambda: wall_wk_furnace(3), 'wall_wk_pipes': lambda: wall_wk_pipes(4),
               'wall_wk_gears': lambda: wall_wk_gears(5), 'wall_wk_chains': lambda: wall_wk_chains(6),
               'floor_wk_plate': lambda: floor_wk_plate(1), 'floor_wk_belt': lambda: floor_wk_belt(2), 'floor_wk_drain': lambda: floor_wk_drain(3),
               'ceil_wk_beams': lambda: ceil_wk_beams(1), 'ceil_wk_lamp': lambda: ceil_wk_lamp(2), 'ceil_wk_hoist': lambda: ceil_wk_hoist(3)},
        props={'door_wk_shutter': door_wk_shutter, 'wk_vat': wk_vat, 'wk_forge': wk_forge, 'wk_press': wk_press, 'wk_bench': wk_bench, 'wk_drums': wk_drums},
        meta={'ceil_wk_lamp': dict(light=dict(color=[1.0, 0.86, 0.62], energy=2.8, range=11, at=[0, -1.3, 0])),
              'wall_wk_furnace': dict(light=dict(color=[1.0, 0.42, 0.08], energy=1.8, range=8, at=[0, 1.3, 1.0], pulse=0.3)),
              'floor_wk_drain': dict(light=dict(color=[0.55, 0.85, 0.12], energy=0.5, range=3.5, at=[0, 0.3, 0]))}),
    'bunker': dict(mats=BUNKER_MATS,
        tiles={'wall_bk_concrete': lambda: wall_bk_concrete(1), 'wall_bk_concrete2': lambda: wall_bk_concrete(5), 'wall_bk_conduit': lambda: wall_bk_conduit(2), 'wall_bk_lockers': lambda: wall_bk_lockers(3),
               'wall_bk_shelves': lambda: wall_bk_shelves(4), 'wall_bk_map': lambda: wall_bk_map(5), 'wall_bk_cracked': lambda: wall_bk_cracked(6), 'wall_bk_lamp': lambda: wall_bk_lamp(7),
               'floor_bk_slab': lambda: floor_bk_slab(1), 'floor_bk_duck': lambda: floor_bk_duck(2), 'floor_bk_hatch': lambda: floor_bk_hatch(3),
               'ceil_bk_slab': lambda: ceil_bk_slab(1), 'ceil_bk_bulb': lambda: ceil_bk_bulb(2), 'ceil_bk_vents': lambda: ceil_bk_vents(3)},
        props={'door_bk_blast': door_bk_blast, 'bk_bunk': bk_bunk, 'bk_console': bk_console, 'bk_generator': bk_generator, 'bk_table': bk_table, 'bk_shower': bk_shower, 'bk_crates': bk_crates},
        meta={'ceil_bk_bulb': dict(light=dict(color=[1.0, 0.85, 0.62], energy=3.0, range=10, at=[0, -0.6, 0])),
              'wall_bk_lamp': dict(light=dict(color=[1.0, 0.8, 0.5], energy=1.2, range=6, at=[0, 3.0, 0.6]))}),
    'crypt': dict(mats=CRYPT_MATS,
        tiles={'wall_cr_blocks': lambda: wall_cr_blocks(1), 'wall_cr_blocks2': lambda: wall_cr_blocks(7), 'wall_cr_niches': lambda: wall_cr_niches(2), 'wall_cr_arch': lambda: wall_cr_arch(3),
               'wall_cr_plaque': lambda: wall_cr_plaque(4), 'wall_cr_bones': lambda: wall_cr_bones(5), 'wall_cr_sconce': lambda: wall_cr_sconce(6), 'wall_cr_broken': lambda: wall_cr_broken(8),
               'floor_cr_flag': lambda: floor_cr_flag(1), 'floor_cr_grave': lambda: floor_cr_grave(2), 'floor_cr_mosaic': lambda: floor_cr_mosaic(3),
               'ceil_cr_vault': lambda: ceil_cr_vault(1), 'ceil_cr_chandelier': lambda: ceil_cr_chandelier(2), 'ceil_cr_roots': lambda: ceil_cr_roots(3)},
        props={'door_cr_slab': door_cr_slab, 'cr_coffin': cr_coffin, 'cr_statue': cr_statue, 'cr_plinth': cr_plinth, 'cr_brazier': cr_brazier, 'cr_candles': cr_candles, 'cr_bones': cr_bones},
        meta={'ceil_cr_chandelier': dict(light=dict(color=[1.0, 0.8, 0.55], energy=1.5, range=12, at=[0, -0.9, 0], pulse=0.2)),
              'wall_cr_sconce': dict(light=dict(color=[1.0, 0.7, 0.35], energy=1.0, range=8, at=[0, 2.9, 0.7], pulse=0.3)),
              'wall_cr_arch': dict(light=dict(color=[0.5, 0.35, 1.0], energy=0.9, range=6, at=[0, 2.0, 0.8])),
              'wall_cr_niches': dict(light=dict(color=[1.0, 0.66, 0.25], energy=0.4, range=3.5, at=[0, 2.0, 0.6]))}),
}
