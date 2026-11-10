"""Floors, walls and ceilings of the high-tech kit. One cell is 4 m x 4 m x 4 m.
  floor:   top surface at z=0, spans x,y in [-2,2]
  ceiling: underside at z=0 (the engine lifts it to the room height), detail goes up
  wall:    stands on z=0..4, x in [-2,2], its face on the plane y=0 looking at -Y
"""
import math, random
from mz import Mesh, T, R, S

C = 4.0
H = 4.0


def bsp(rnd, x0, y0, x1, y1, min_size, stop=0.25):
    """Split a rectangle into panels."""
    w, h = x1 - x0, y1 - y0
    if (w < min_size * 2 and h < min_size * 2) or (max(w, h) < min_size * 3.2 and rnd.random() < stop):
        return [(x0, y0, x1, y1)]
    if w > h * rnd.uniform(0.7, 1.4) and w >= min_size * 2:
        c = x0 + w * rnd.choice([0.5, 0.5, 0.33, 0.67, 0.25, 0.75])
        c = min(max(c, x0 + min_size), x1 - min_size)
        return bsp(rnd, x0, y0, c, y1, min_size, stop) + bsp(rnd, c, y0, x1, y1, min_size, stop)
    if h >= min_size * 2:
        c = y0 + h * rnd.choice([0.5, 0.5, 0.33, 0.67, 0.25, 0.75])
        c = min(max(c, y0 + min_size), y1 - min_size)
        return bsp(rnd, x0, y0, x1, c, min_size, stop) + bsp(rnd, x0, c, x1, y1, min_size, stop)
    return [(x0, y0, x1, y1)]


def plates(m, rnd, x0, y0, x1, y1, min_size=0.7, thick=(0.03, 0.08), gap=0.025, mats=('hull', 'hull', 'hull', 'trim', 'hull_dark'),
           deco=0.6, glows=('glow_cyan',), accent='accent', flat=False, skip=0.0):
    """Cover a rectangle of the local XY plane with bevelled plates and small fittings. +Z is out."""
    for (a, b, c, d) in bsp(rnd, x0, y0, x1, y1, min_size):
        if rnd.random() < skip:
            continue
        w, h = c - a - gap * 2, d - b - gap * 2
        cx, cy = (a + c) / 2, (b + d) / 2
        t = rnd.uniform(*thick)
        mat = rnd.choice(mats)
        m.box((w, h, t), at=(cx, cy, t / 2), mat=mat, bevel=min(0.018, t * 0.45))
        if rnd.random() > deco:
            continue
        k = rnd.random()
        z = t
        if k < 0.22:      # bolts at the corners
            for sx in (-1, 1):
                for sy in (-1, 1):
                    m.cyl(0.022, 0.014, at=(cx + sx * (w / 2 - 0.07), cy + sy * (h / 2 - 0.07), z + 0.005), mat='trim', seg=6)
        elif k < 0.42 and min(w, h) > 0.45:    # vent slats
            n = int(min(w, h) / 0.09) - 2
            horiz = w > h
            for i in range(max(2, min(n, 9))):
                o = (i - (min(n, 9) - 1) / 2) * 0.075
                if horiz:
                    m.box((w * 0.7, 0.03, 0.02), at=(cx, cy + o, z + 0.006), rot=(25 if not flat else 0, 0, 0), mat='hull_dark')
                else:
                    m.box((0.03, h * 0.7, 0.02), at=(cx + o, cy, z + 0.006), rot=(0, 25 if not flat else 0, 0), mat='hull_dark')
        elif k < 0.58:    # light strip
            g = rnd.choice(glows)
            if w > h:
                m.box((w * 0.75, 0.04, 0.012), at=(cx, cy + rnd.uniform(-0.3, 0.3) * h, z + 0.004), mat=g)
            else:
                m.box((0.04, h * 0.75, 0.012), at=(cx + rnd.uniform(-0.3, 0.3) * w, cy, z + 0.004), mat=g)
        elif k < 0.7:     # colour stripe
            if w > h:
                m.box((w * 0.9, min(0.1, h * 0.25), 0.008), at=(cx, cy - h * 0.3, z + 0.002), mat=accent)
            else:
                m.box((min(0.1, w * 0.25), h * 0.9, 0.008), at=(cx - w * 0.3, cy, z + 0.002), mat=accent)
        elif k < 0.82 and not flat:   # small box with indicator
            bw, bh = min(0.3, w * 0.5), min(0.22, h * 0.5)
            m.box((bw, bh, 0.06), at=(cx, cy, z + 0.03), mat='hull_dark', bevel=0.012)
            m.cyl(0.018, 0.012, at=(cx - bw * 0.25, cy, z + 0.066), mat=rnd.choice(glows + ('glow_amber', 'glow_red')), seg=8)
            m.cyl(0.018, 0.012, at=(cx + bw * 0.25, cy, z + 0.066), mat='trim', seg=8)
        elif not flat and max(w, h) > 0.6:   # handle / rail
            if w > h:
                m.tube([(cx - w * 0.3, cy, z), (cx - w * 0.3, cy, z + 0.05), (cx + w * 0.3, cy, z + 0.05), (cx + w * 0.3, cy, z)], 0.014, mat='chrome', seg=6)
            else:
                m.tube([(cx, cy - h * 0.3, z), (cx, cy - h * 0.3, z + 0.05), (cx, cy + h * 0.3, z + 0.05), (cx, cy + h * 0.3, z)], 0.014, mat='chrome', seg=6)


def cable(m, rnd, a, b, sag=0.4, r=0.025, mat='cable', seg=6, n=8):
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t)))
    m.tube(pts, r, mat=mat, seg=seg)


def dangle(m, rnd, at, length, r=0.02, mat='cable'):
    x, y, z = at
    pts = [(x, y, z)]
    for i in range(1, 6):
        t = i / 5
        pts.append((x + math.sin(t * 3 + x) * 0.08 * t, y + math.cos(t * 2 + y) * 0.08 * t, z - length * t))
    m.tube(pts, r, mat=mat, seg=5)
    if rnd.random() < 0.5:
        m.cyl(r * 1.6, 0.05, at=pts[-1], mat='copper', seg=6)


# ---------------------------------------------------------------- walls
def wall_base(m, rnd, skirt=True, cornice=True):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='hull_dark')         # the slab behind everything
    if skirt:
        m.box((C, 0.12, 0.28), at=(0, -0.04, 0.14), mat='trim', bevel=0.02)
        m.box((C, 0.02, 0.05), at=(0, -0.105, 0.2), mat='accent')
    if cornice:
        m.box((C, 0.16, 0.3), at=(0, -0.06, H - 0.15), mat='trim', bevel=0.03)
        for i in range(2):
            cable(m, rnd, (-2, -0.16 - i * 0.045, H - 0.36), (2, -0.16 - i * 0.045, H - 0.36), sag=0.0, r=0.02, mat='cable' if i else 'copper', n=1)


def face(m):
    """Local XY -> the wall's face (x across, y up, +z into the room)."""
    return m.push(R(90, 0, 0))


def wall_plain(seed, **kw):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd)
    face(m)
    plates(m, rnd, -2, 0.3, 2, H - 0.32, **kw)
    m.pop()
    return m


def wall_ribbed(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd)
    for i in range(5):
        x = -1.6 + i * 0.8
        m.prism([(-0.16, 0), (0.16, 0), (0.09, -0.16), (-0.09, -0.16)], H - 0.6, at=(x, 0, 0.28), mat='hull', bevel=0.015)
        m.box((0.05, 0.02, H - 1.4), at=(x, -0.165, H / 2), mat='glow_cyan' if i == 2 else 'hull_dark')
    for i in range(4):
        x = -1.2 + i * 0.8
        face(m)
        plates(m, rnd, x - 0.22, 0.3, x + 0.22, H - 0.32, min_size=0.4, thick=(0.02, 0.04), mats=('hull_dark', 'trim'), deco=0.5)
        m.pop()
    return m


def wall_pipes(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd)
    face(m)
    plates(m, rnd, -2, 0.3, -1.1, H - 0.32, min_size=0.4)
    plates(m, rnd, 1.1, 0.3, 2, H - 0.32, min_size=0.4)
    m.pop()
    m.box((2.2, 0.05, H - 0.6), at=(0, -0.01, H / 2), mat='rust')
    for i, x in enumerate((-0.8, -0.45, 0.0, 0.5, 0.85)):
        r = (0.11, 0.06, 0.14, 0.07, 0.09)[i]
        mat = ('copper', 'trim', 'hull', 'accent2', 'copper')[i]
        m.cyl(r, H - 0.6, at=(x, -0.02 - r, H / 2), mat=mat, seg=12)
        for z in (0.9, 2.0, 3.1):
            m.cyl(r + 0.025, 0.07, at=(x, -0.02 - r, z + i * 0.07), mat='trim', seg=12)
    m.ring(0.16, 0.022, at=(0.0, -0.33, 1.7), rot=(90, 0, 0), mat='accent', seg=16, tseg=6)   # valve wheel
    m.cyl(0.03, 0.2, at=(0, -0.25, 1.7), rot=(90, 0, 0), mat='trim', seg=8)
    for a in range(3):
        m.box((0.3, 0.02, 0.02), at=(0, -0.33, 1.7), rot=(0, a * 60, 0), mat='accent')
    m.box((0.2, 0.08, 0.26), at=(0.5, -0.2, 2.5), mat='hull_dark', bevel=0.02)
    m.cyl(0.07, 0.02, at=(0.5, -0.25, 2.52), rot=(90, 0, 0), mat='glow_amber', seg=12)
    return m


def wall_screen(seed, dead=False):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd)
    face(m)
    plates(m, rnd, -2, 0.3, 2, 1.0, min_size=0.5)
    plates(m, rnd, -2, 3.0, 2, H - 0.32, min_size=0.5)
    plates(m, rnd, -2, 1.0, -1.45, 3.0, min_size=0.4)
    plates(m, rnd, 1.45, 1.0, 2, 3.0, min_size=0.4)
    m.pop()
    m.box((2.9, 0.1, 2.0), at=(0, -0.05, 2.0), mat='hull_dark', bevel=0.03)
    m.box((2.6, 0.02, 1.6), at=(0, -0.105, 2.05), mat='screen_dead' if dead else 'screen')
    for i in range(6):
        m.box((0.12, 0.03, 0.06), at=(-1.1 + i * 0.2, -0.11, 1.12), mat=rnd.choice(['glow_cyan', 'glow_amber', 'hull', 'glow_pink', 'trim']), bevel=0.008)
    m.box((0.5, 0.04, 0.1), at=(0.9, -0.11, 1.12), mat='accent')
    if dead:
        dangle(m, rnd, (1.2, -0.12, 3.0), 1.3)
        dangle(m, rnd, (1.0, -0.12, 3.0), 0.7, mat='copper')
    return m


def wall_vent(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd)
    face(m)
    plates(m, rnd, -2, 0.3, 2, 0.9, min_size=0.5)
    plates(m, rnd, -2, 3.1, 2, H - 0.32, min_size=0.5)
    plates(m, rnd, -2, 0.9, -1.2, 3.1, min_size=0.4)
    plates(m, rnd, 1.2, 0.9, 2, 3.1, min_size=0.4)
    m.pop()
    m.box((2.3, 0.04, 2.2), at=(0, -0.0, 2.0), mat='rubber')
    m.ring(1.0, 0.09, at=(0, -0.06, 2.0), rot=(90, 0, 0), mat='trim', seg=28, tseg=8)
    m.cyl(0.2, 0.2, at=(0, -0.08, 2.0), rot=(90, 0, 0), mat='hull', seg=16)
    m.cyl(0.07, 0.02, at=(0, -0.185, 2.0), rot=(90, 0, 0), mat='glow_amber', seg=10)
    for i in range(7):
        m.box((0.95, 0.03, 0.3), at=(0, -0.06, 2.0), rot=(0, 0, 0), mat='hull_dark') if False else None
        a = i * 360 / 7
        m.push(T(0, -0.06, 2.0) @ R(0, a, 0))
        m.box((0.78, 0.02, 0.26), at=(0.55, 0, 0), rot=(28, 0, 0), mat='trim', bevel=0.008)
        m.pop()
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.cyl(0.05, 0.05, at=(sx * 1.0, -0.03, 2.0 + sz * 0.95), rot=(90, 0, 0), mat='hull', seg=6)
    return m


def wall_breach(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd, cornice=False)
    m.box((C, 0.16, 0.3), at=(-0.4, -0.06, H - 0.15), rot=(0, 3, 0), mat='trim', bevel=0.03)
    face(m)
    plates(m, rnd, -2, 0.3, 2, H - 0.32, skip=0.42, deco=0.3, mats=('hull', 'hull', 'rust', 'trim'))
    m.pop()
    m.box((C, 0.03, H - 0.6), at=(0, 0.0, H / 2), mat='rust')
    for i in range(6):                       # exposed frame
        m.box((0.07, 0.07, H - 0.6), at=(-1.75 + i * 0.7, -0.02, H / 2), mat='hull_dark')
    for z in (1.2, 2.5):
        m.box((C, 0.06, 0.06), at=(0, -0.03, z), mat='hull_dark')
    for i in range(5):
        x = rnd.uniform(-1.7, 1.7)
        dangle(m, rnd, (x, -0.1, rnd.uniform(2.6, 3.7)), rnd.uniform(0.6, 1.8), mat=rnd.choice(['cable', 'copper', 'cable', 'accent']))
    cable(m, rnd, (-1.8, -0.12, 3.2), (1.6, -0.14, 2.4), sag=0.7)
    m.box((0.9, 0.05, 1.1), at=(0.8, -0.2, 0.62), rot=(-14, 0, 12), mat='hull', bevel=0.02)   # a fallen plate
    m.cyl(0.035, 0.012, at=(-0.9, -0.06, 1.9), rot=(90, 0, 0), mat='glow_red', seg=8)
    return m


def wall_light(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd)
    face(m)
    plates(m, rnd, -2, 0.3, -0.35, H - 0.32, min_size=0.55)
    plates(m, rnd, 0.35, 0.3, 2, H - 0.32, min_size=0.55)
    m.pop()
    m.prism([(-0.3, 0), (0.3, 0), (0.2, -0.14), (-0.2, -0.14)], H - 0.6, at=(0, 0, 0.28), mat='trim', bevel=0.02)
    m.box((0.22, 0.03, H - 1.2), at=(0, -0.145, H / 2), mat='glow_white')
    for z in (0.7, H - 0.7):
        m.box((0.36, 0.2, 0.1), at=(0, -0.08, z), mat='hull_dark', bevel=0.02)
    return m


def wall_hex(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    wall_base(m, rnd)
    m.box((C, 0.04, H - 0.6), at=(0, -0.0, H / 2), mat='hull_dark')
    r = 0.25
    hexp = [(r * math.cos(math.radians(60 * i)), r * math.sin(math.radians(60 * i))) for i in range(6)]
    hin = [(p[0] * 0.8, p[1] * 0.8) for p in hexp]
    row = 0
    z = 0.6
    while z < H - 0.55:
        off = 0 if row % 2 == 0 else (r * 1.5 + 0.14) / 2
        x = -1.75 + off
        while x < 1.75:
            face(m)
            k = rnd.random()
            d = rnd.choice([0.05, 0.08, 0.12])
            m.prism(hexp, d, at=(x, z, 0.0), mat='hull' if k > 0.25 else 'trim', bevel=0.015)
            if k < 0.16:
                m.prism(hin, 0.012, at=(x, z, d), mat=rnd.choice(['glow_cyan', 'glow_cyan', 'glow_amber']))
            elif k > 0.8:
                m.cyl(0.1, 0.03, at=(x, z, d + 0.01), mat='hull_dark', seg=6)
            m.pop()
            x += r * 1.5 + 0.14
        z += r * 0.95
        row += 1
    return m


# ---------------------------------------------------------------- floors
def floor_base(m):
    m.box((C, C, 0.2), at=(0, 0, -0.12), mat='hull_dark')


def floor_plate(seed, **kw):
    rnd = random.Random(seed)
    m = Mesh('floor')
    floor_base(m)
    a = dict(min_size=0.9, thick=(0.02, 0.022), gap=0.02, mats=('floor', 'floor', 'floor', 'trim'), deco=0.35, flat=True)
    a.update(kw)
    m.push(T(0, 0, -0.02))
    plates(m, rnd, -2, -2, 2, 2, **a)
    m.pop()
    return m


def floor_grate(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    m.box((C, C, 0.06), at=(0, 0, -0.75), mat='hull_dark')
    for i in range(3):                       # pipes in the trench
        y = -1.2 + i * 1.2
        m.cyl(0.14 - i * 0.03, C, at=(0, y, -0.5), rot=(0, 90, 0), mat=('copper', 'trim', 'accent2')[i], seg=10)
    m.box((C, 0.08, 0.02), at=(0, 0.6, -0.7), mat='glow_amber')
    m.box((C, 0.08, 0.02), at=(0, -0.6, -0.7), mat='glow_amber')
    for s in (-1, 1):                        # frame
        m.box((C, 0.25, 0.1), at=(0, s * 1.875, -0.05), mat='floor', bevel=0.015)
        m.box((0.25, C - 0.5, 0.1), at=(s * 1.875, 0, -0.05), mat='floor', bevel=0.015)
    for i in range(17):                      # bars
        m.box((0.05, C - 0.5, 0.05), at=(-1.6 + i * 0.2, 0, -0.025), mat='trim')
    for y in (-0.9, 0, 0.9):
        m.box((C - 0.5, 0.07, 0.04), at=(0, y, -0.045), mat='hull_dark')
    return m


def floor_glow(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    floor_base(m)
    m.push(T(0, 0, -0.02))
    for (a, b, c, d) in ((-2, -2, -0.2, -0.2), (0.2, -2, 2, -0.2), (-2, 0.2, -0.2, 2), (0.2, 0.2, 2, 2)):
        plates(m, rnd, a, b, c, d, min_size=0.8, thick=(0.02, 0.022), gap=0.02, mats=('floor', 'floor', 'trim'), deco=0.25, flat=True)
    m.pop()
    m.box((C, 0.1, 0.01), at=(0, 0, -0.012), mat='glow_cyan')
    m.box((0.1, C, 0.01), at=(0, 0, -0.012), mat='glow_cyan')
    m.box((0.6, 0.6, 0.02), at=(0, 0, -0.008), rot=(0, 0, 45), mat='trim', bevel=0.008)
    return m


def floor_broken(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    m.box((C, C, 0.06), at=(0, 0, -0.4), mat='rust')
    m.push(T(0, 0, -0.02))
    plates(m, rnd, -2, -2, 2, 2, min_size=0.7, thick=(0.02, 0.022), gap=0.02, mats=('floor', 'floor', 'rust'), deco=0.2, flat=True, skip=0.22)
    m.pop()
    for i in range(5):
        m.box((C, 0.06, 0.3), at=(0, -1.6 + i * 0.8, -0.2), mat='hull_dark')
        m.box((0.06, C, 0.3), at=(-1.6 + i * 0.8, 0, -0.2), mat='hull_dark')
    for i in range(3):
        cable(m, rnd, (rnd.uniform(-2, -1), rnd.uniform(-2, 2), -0.3), (rnd.uniform(1, 2), rnd.uniform(-2, 2), -0.3), sag=0.05, r=0.03, mat=rnd.choice(['cable', 'copper']))
    m.box((0.5, 0.04, 0.02), at=(0.3, 0.4, -0.36), mat='glow_red')
    return m


def floor_hazard(seed):
    rnd = random.Random(seed)
    m = floor_plate(seed, min_size=1.3, deco=0.1)
    for s in (-1, 1):
        for i in range(8):
            m.box((0.28, 0.16, 0.006), at=(-1.75 + i * 0.5, s * 1.82, 0.002), rot=(0, 0, 35), mat='hazard')
    return m


# ---------------------------------------------------------------- ceilings
def down(m):
    return m.push(R(180, 0, 0))


def ceil_base(m):
    m.box((C, C, 0.2), at=(0, 0, 0.4), mat='hull_dark')


def ceil_plain(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    ceil_base(m)
    down(m)
    m.push(T(0, 0, -0.3))
    plates(m, rnd, -2, -2, 2, 2, min_size=0.9, thick=(0.04, 0.18), mats=('hull', 'hull', 'trim', 'hull_dark'), deco=0.45)
    m.pop().pop()
    return m


def ceil_light(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    ceil_base(m)
    down(m)
    m.push(T(0, 0, -0.3))
    for (a, b, c, d) in ((-2, -2, 2, -1.0), (-2, 1.0, 2, 2), (-2, -1.0, -1.0, 1.0), (1.0, -1.0, 2, 1.0)):
        plates(m, rnd, a, b, c, d, min_size=0.7, thick=(0.05, 0.16), mats=('hull', 'trim', 'hull_dark'), deco=0.4)
    m.pop().pop()
    m.box((1.9, 1.9, 0.14), at=(0, 0, 0.2), mat='trim', bevel=0.03)
    m.box((1.5, 1.5, 0.05), at=(0, 0, 0.12), mat='glow_white')
    for i in range(4):
        m.box((1.5, 0.03, 0.08), at=(0, -0.6 + i * 0.4, 0.1), mat='hull_dark')
    return m


def ceil_ducts(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    ceil_base(m)
    m.box((0.9, C, 0.5), at=(-0.9, 0, 0.02), mat='trim', bevel=0.04)
    for y in (-1.3, 0, 1.3):
        m.box((1.0, 0.1, 0.6), at=(-0.9, y, 0.02), mat='hull_dark', bevel=0.02)
    m.box((0.6, 0.5, 0.06), at=(-0.9, 0.6, -0.24), mat='hull_dark')
    for i in range(5):
        m.box((0.5, 0.03, 0.03), at=(-0.9, 0.42 + i * 0.09, -0.26), rot=(30, 0, 0), mat='trim')
    for i, x in enumerate((0.4, 0.75, 1.2, 1.5)):
        r = (0.12, 0.06, 0.16, 0.05)[i]
        m.cyl(r, C, at=(x, 0, 0.3 - r), rot=(90, 0, 0), mat=('copper', 'cable', 'hull', 'accent')[i], seg=10)
        m.cyl(r + 0.03, 0.08, at=(x, rnd.uniform(-1.5, 1.5), 0.3 - r), rot=(90, 0, 0), mat='trim', seg=10)
    for y in (-1.6, 1.6):
        m.box((C, 0.08, 0.5), at=(0, y, 0.05), mat='hull_dark')
    return m


def ceil_cables(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    ceil_base(m)
    down(m)
    m.push(T(0, 0, -0.3))
    plates(m, rnd, -2, -2, 2, 2, min_size=0.8, thick=(0.04, 0.14), mats=('hull', 'rust', 'trim', 'hull_dark'), deco=0.3, skip=0.3)
    m.pop().pop()
    for i in range(4):
        m.box((C, 0.07, 0.25), at=(0, -1.5 + i * 1.0, 0.2), mat='hull_dark')
    for i in range(6):
        dangle(m, rnd, (rnd.uniform(-1.6, 1.6), rnd.uniform(-1.6, 1.6), 0.25), rnd.uniform(0.5, 1.5), r=rnd.choice([0.018, 0.025, 0.035]), mat=rnd.choice(['cable', 'cable', 'copper', 'accent']))
    cable(m, rnd, (-1.9, -1.0, 0.2), (1.9, 0.8, 0.2), sag=0.75, r=0.04)
    cable(m, rnd, (-1.5, 1.6, 0.2), (1.2, -1.7, 0.2), sag=0.5, r=0.025, mat='copper')
    m.box((0.8, 0.9, 0.04), at=(0.6, -0.5, -0.25), rot=(18, -22, 10), mat='hull', bevel=0.015)   # a panel hanging by one corner
    return m


def ceil_truss(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    ceil_base(m)
    for s in (-1, 1):
        m.box((C, 0.14, 0.14), at=(0, s * 1.2, 0.0), mat='trim', bevel=0.02)
        m.box((C, 0.1, 0.1), at=(0, s * 1.2, 0.26), mat='hull_dark')
        for i in range(8):
            x = -1.75 + i * 0.5
            m.box((0.05, 0.05, 0.42), at=(x, s * 1.2, 0.13), rot=(0, 38 if i % 2 else -38, 0), mat='trim')
    for x in (-1.5, 0, 1.5):
        m.box((0.12, 2.4, 0.12), at=(x, 0, 0.0), mat='trim', bevel=0.02)
    m.box((2.6, 0.24, 0.08), at=(0, 0, -0.02), mat='hull_dark', bevel=0.02)
    m.box((2.4, 0.14, 0.03), at=(0, 0, -0.07), mat='glow_amber')
    return m


def pillar(seed):
    rnd = random.Random(seed)
    m = Mesh('pillar')
    m.lathe([(0.75, 0), (0.75, 0.25), (0.55, 0.4), (0.5, 1.2), (0.42, 1.3), (0.42, 2.7), (0.5, 2.8), (0.55, 3.6), (0.75, 3.75), (0.75, 4.0)], mat='hull', seg=12, smooth=False)
    m.cyl(0.44, 1.3, at=(0, 0, 2.0), mat='glow_cyan', seg=12)
    for i in range(6):
        a = math.radians(i * 60 + 30)
        m.box((0.08, 0.1, 1.5), at=(0.44 * math.cos(a), 0.44 * math.sin(a), 2.0), rot=(0, 0, i * 60 + 30), mat='trim')
    m.ring(0.6, 0.05, at=(0, 0, 1.25), mat='copper', seg=16, tseg=6)
    m.ring(0.6, 0.05, at=(0, 0, 2.75), mat='copper', seg=16, tseg=6)
    return m


TILES = {
    'wall_plain_a': lambda: wall_plain(11), 'wall_plain_b': lambda: wall_plain(23, min_size=0.5), 'wall_plain_c': lambda: wall_plain(37, min_size=1.0, accent='accent2'),
    'wall_ribbed': lambda: wall_ribbed(3), 'wall_pipes': lambda: wall_pipes(5), 'wall_screen': lambda: wall_screen(7), 'wall_screen_dead': lambda: wall_screen(8, dead=True),
    'wall_vent': lambda: wall_vent(9), 'wall_breach': lambda: wall_breach(13), 'wall_light': lambda: wall_light(15), 'wall_hex': lambda: wall_hex(17),
    'floor_plate_a': lambda: floor_plate(41), 'floor_plate_b': lambda: floor_plate(43, min_size=0.6), 'floor_grate': lambda: floor_grate(45),
    'floor_glow': lambda: floor_glow(47), 'floor_broken': lambda: floor_broken(49), 'floor_hazard': lambda: floor_hazard(51),
    'ceil_plain': lambda: ceil_plain(61), 'ceil_light': lambda: ceil_light(63), 'ceil_ducts': lambda: ceil_ducts(65), 'ceil_cables': lambda: ceil_cables(67), 'ceil_truss': lambda: ceil_truss(69),
    'pillar': lambda: pillar(71),
}
