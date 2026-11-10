"""The Agency kit: the Sterile White of the Anomalous Structure, an Age of War advertising agency
whose promotion system never stopped. Porcelain, onyx, rose gold, pink neon. Still switched on,
still selling. Sizes and conventions are tiles.py's."""
import math, random
from mz import Mesh, T, R, S
from tiles import cable, dangle, face, down, C, H

MATERIALS = {
    'porcelain':      dict(color=(0.80, 0.80, 0.79), metal=0.0, rough=0.16, shader='worn', grime=0.22),
    'porcelain_grey': dict(color=(0.60, 0.61, 0.65), metal=0.0, rough=0.24, shader='worn', grime=0.3),
    'onyx':           dict(color=(0.018, 0.018, 0.024), metal=0.35, rough=0.07, shader='worn', grime=0.18),
    'rose_gold':      dict(color=(0.95, 0.60, 0.50), metal=1.0, rough=0.2),
    'velvet':         dict(color=(0.42, 0.04, 0.2), metal=0.0, rough=0.95),
    'neon_pink':      dict(color=(1.0, 0.2, 0.6), emit=(1.0, 0.16, 0.58), energy=2.6, shader='glow'),
    'neon_white':     dict(color=(1.0, 0.95, 0.97), emit=(1.0, 0.94, 0.97), energy=1.5, shader='glow'),
    'adscreen':       dict(color=(0.03, 0.0, 0.02), emit=(1.0, 0.2, 0.62), energy=1.5, shader='ad'),
    'frost':          dict(color=(1.0, 0.82, 0.9), metal=0.0, rough=0.1, alpha=0.3, shader='glass'),
}


def base(m, top=True):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='porcelain_grey')
    m.box((C, 0.1, 0.22), at=(0, -0.04, 0.11), mat='rose_gold', bevel=0.02)
    m.box((C, 0.03, 0.03), at=(0, -0.02, 0.26), mat='neon_pink')                 # a line of light above the skirting
    if top:
        m.prism([(0, 0), (0.22, 0), (0.22, 0.05), (0.06, 0.2), (0, 0.2)], C, at=(-2, 0, H - 0.2), rot=(90, 0, 90), mat='porcelain')
        m.box((C, 0.04, 0.03), at=(0, -0.2, H - 0.215), mat='neon_white')


def slab(m, x0, z0, x1, z1, t=0.07, mat='porcelain', r=0.05, gap=0.025):
    m.box((x1 - x0 - gap * 2, t, z1 - z0 - gap * 2), at=((x0 + x1) / 2, -t / 2, (z0 + z1) / 2), mat=mat, bevel=r)


def wall_porcelain(seed, rows=False):
    rnd = random.Random(seed)
    m = Mesh('wall')
    base(m)
    m.box((C, 0.02, H - 0.6), at=(0, -0.005, H / 2 + 0.05), mat='neon_pink' if not rows else 'neon_white')     # shows through the seams
    if rows:
        zs = [0.3, 1.35, 2.2, 3.05, H - 0.24]
        for a, b in zip(zs, zs[1:]):
            cut = rnd.choice([-0.7, 0.0, 0.7])
            slab(m, -2, a, cut, b, r=0.06)
            slab(m, cut, a, 2, b, r=0.06)
    else:
        xs = [-2, -0.67, 0.67, 2]
        for a, b in zip(xs, xs[1:]):
            cut = rnd.choice([1.3, 2.6, 2.95])
            slab(m, a, 0.3, b, cut, r=0.08)
            slab(m, a, cut, b, H - 0.24, r=0.08)
            m.cyl(0.03, 0.02, at=((a + b) / 2, -0.075, cut - 0.14), rot=(90, 0, 0), mat='rose_gold', seg=10)
    return m


def wall_flute(seed):
    m = Mesh('wall')
    base(m)
    n = 16
    for i in range(n):
        x = -2 + (i + 0.5) * C / n
        m.cyl(C / n / 2 - 0.004, 2.0, at=(x, 0.0, 1.32), mat='porcelain', seg=10, caps=False)
        m.cyl(C / n / 2 - 0.004, 1.0, at=(x, 0.0, 3.24), mat='porcelain', seg=10, caps=False)
    m.box((C, 0.16, 0.3), at=(0, -0.05, 2.5), mat='onyx', bevel=0.03)
    m.box((C, 0.03, 0.06), at=(0, -0.135, 2.5), mat='neon_pink')
    for x in (-1.5, 0, 1.5):
        m.cyl(0.06, 0.03, at=(x, -0.14, 2.5), rot=(90, 0, 0), mat='rose_gold', seg=12)
    return m


def wall_ad(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    base(m)
    for (a, b) in ((-2, -1.62), (1.62, 2)):
        slab(m, a, 0.3, b, H - 0.24, r=0.05)
    slab(m, -1.62, 0.3, 1.62, 0.95, r=0.05)
    slab(m, -1.62, 3.3, 1.62, H - 0.24, r=0.05)
    m.box((3.2, 0.12, 2.3), at=(0, -0.05, 2.12), mat='rose_gold', bevel=0.05)
    m.box((3.0, 0.02, 2.1), at=(0, -0.115, 2.12), mat='adscreen')
    m.box((1.4, 0.2, 0.08), at=(0, -0.16, 0.92), mat='onyx', bevel=0.02)
    m.ring(0.12, 0.02, at=(0, -0.2, 1.1), mat='rose_gold', seg=14, tseg=5)
    m.ball(0.07, at=(0, -0.2, 1.1), mat='neon_pink', seg=10)
    return m


def arch_pts(w, h, n=8):
    """An arched outline: straight sides, half-round top."""
    pts = [(-w / 2, 0), (w / 2, 0), (w / 2, h - w / 2)]
    for i in range(1, n):
        a = math.pi * i / n
        pts.append((w / 2 * math.cos(a), h - w / 2 + w / 2 * math.sin(a)))
    pts.append((-w / 2, h - w / 2))
    return pts


def wall_niche(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    base(m)
    slab(m, -2, 0.3, 2, 0.95, r=0.05)
    slab(m, -2, 3.25, 2, H - 0.24, r=0.05)
    for i, x in enumerate((-1.33, 0, 1.33)):
        m.box((1.33, 0.04, 2.3), at=(x, 0.0, 2.1), mat='onyx')
        face(m)
        m.prism(arch_pts(0.9, 2.1), 0.012, at=(x, 1.05, 0.025), mat='neon_pink' if i != 1 else 'neon_white')
        m.pop()
        # the surround: a rose-gold arch
        pts = [(x - 0.5, -0.06, 1.0), (x - 0.5, -0.06, 2.65)]
        for k in range(1, 8):
            a = math.pi * (1 - k / 8)
            pts.append((x + 0.5 * math.cos(a), -0.06, 2.65 + 0.5 * math.sin(a)))
        pts += [(x + 0.5, -0.06, 2.65), (x + 0.5, -0.06, 1.0)]
        m.tube(pts, 0.04, mat='rose_gold', seg=6)
        m.box((0.9, 0.3, 0.05), at=(x, -0.14, 1.02), mat='porcelain', bevel=0.02)
        k = (seed + i) % 3                       # what is on show
        if k == 0:
            m.lathe([(0.1, 0), (0.16, 0.1), (0.12, 0.38), (0.05, 0.46), (0.07, 0.56)], at=(x, -0.14, 1.05), mat='rose_gold', seg=12)
        elif k == 1:
            m.ball(0.17, at=(x, -0.14, 1.26), mat='chrome', seg=14)
            m.ring(0.24, 0.015, at=(x, -0.14, 1.26), rot=(25, 0, 0), mat='rose_gold', seg=18, tseg=5)
        else:
            m.box((0.24, 0.16, 0.34), at=(x, -0.14, 1.22), rot=(0, 0, 18), mat='velvet', bevel=0.02)
            m.box((0.25, 0.165, 0.06), at=(x, -0.14, 1.22), rot=(0, 0, 18), mat='rose_gold')
    for x in (-0.665, 0.665):
        slab(m, x - 0.165, 0.95, x + 0.165, 3.25, r=0.04, gap=0.01)
    return m


def wall_emblem(seed):
    m = wall_porcelain(seed, rows=True)
    cz = 2.15
    m.cyl(1.25, 0.06, at=(0, -0.09, cz), rot=(90, 0, 0), mat='onyx', seg=32)
    for r_, mat in ((1.25, 'rose_gold'), (0.95, 'neon_pink'), (0.62, 'rose_gold')):
        m.ring(r_, 0.035, at=(0, -0.13, cz), rot=(90, 0, 0), mat=mat, seg=36, tseg=6)
    # the agency's mark: an eye that is also a smile
    m.prism([(-0.5, 0), (-0.25, -0.2), (0.25, -0.2), (0.5, 0), (0.25, 0.2), (-0.25, 0.2)], 0.03, at=(0, -0.12, cz), rot=(90, 0, 0), mat='porcelain', bevel=0.01)
    m.ball(0.15, at=(0, -0.15, cz), mat='neon_pink', seg=12, scale=(1, 0.5, 1))
    for i in range(12):
        a = math.radians(i * 30)
        m.box((0.03, 0.03, 0.2), at=(1.1 * math.cos(a), -0.13, cz + 1.1 * math.sin(a)), rot=(0, 90 - i * 30, 0), mat='rose_gold')
    return m


def wall_pad(seed):
    m = Mesh('wall')
    base(m)
    m.box((C, 0.05, H - 0.56), at=(0, -0.02, H / 2 + 0.04), mat='velvet')
    nx, nz = 7, 6
    for j in range(nz):
        for i in range(nx + (j % 2)):
            x = -2 + (i + (0.5 if j % 2 == 0 else 0.0)) * C / nx
            z = 0.62 + j * 0.56
            if abs(x) > 1.99:
                continue
            m.ball(0.3, at=(x, -0.03, z), mat='velvet', seg=8, scale=(0.95, 0.3, 0.95))
    for j in range(nz + 1):
        for i in range(nx + 1 - (j % 2)):
            x = -2 + (i + (0.0 if j % 2 == 0 else 0.5)) * C / nx
            z = 0.34 + j * 0.56
            if abs(x) < 1.95 and z < H - 0.3:
                m.cyl(0.03, 0.03, at=(x, -0.06, z), rot=(90, 0, 0), mat='rose_gold', seg=8)
    return m


def wall_crack(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    base(m, top=False)
    m.box((C, 0.03, H - 0.5), at=(0, 0.0, H / 2), mat='hull_dark')
    for i in range(6):
        m.box((0.06, 0.06, H - 0.5), at=(-1.75 + i * 0.7, -0.02, H / 2), mat='trim')
    xs = [-2, -0.67, 0.67, 2]
    slab(m, xs[0], 0.3, xs[1], H - 0.24, r=0.08)
    slab(m, xs[2], 2.2, xs[3], H - 0.24, r=0.08)
    m.box((1.25, 0.07, 1.8), at=(1.2, -0.3, 1.05), rot=(-16, 0, 9), mat='porcelain', bevel=0.08)           # one has come off
    m.box((0.7, 0.07, 0.9), at=(0.1, -0.12, 0.5), rot=(-70, 0, 30), mat='porcelain', bevel=0.06)            # and broken
    m.tube([(-0.5, -0.06, 3.5), (-0.3, -0.12, 2.6), (0.1, -0.2, 1.7), (0.25, -0.22, 1.2)], 0.03, mat='neon_pink', seg=6)   # a neon tube hanging by its lead
    dangle(m, rnd, (0.3, -0.08, 3.4), 1.1)
    dangle(m, rnd, (-0.2, -0.08, 3.6), 0.6, mat='copper')
    cable(m, rnd, (-0.6, -0.1, 3.0), (0.6, -0.1, 2.5), sag=0.5)
    m.box((C, 0.16, 0.2), at=(0.2, -0.06, H - 0.1), rot=(0, -2, 0), mat='porcelain', bevel=0.03)
    return m


def wall_column(seed):
    m = Mesh('wall')
    base(m)
    slab(m, -2, 0.3, -0.5, H - 0.24, r=0.08)
    slab(m, 0.5, 0.3, 2, H - 0.24, r=0.08)
    m.cyl(0.3, H - 0.6, at=(0, 0.0, H / 2 + 0.05), mat='neon_white', seg=16, caps=False)
    for z in (0.4, 1.3, 2.2, 3.1, H - 0.35):
        m.cyl(0.34, 0.1, at=(0, 0.0, z), mat='rose_gold', seg=16)
    for s in (-1, 1):
        m.box((0.08, 0.12, H - 0.6), at=(s * 0.44, -0.03, H / 2 + 0.05), mat='onyx', bevel=0.02)
    return m


# ---------------------------------------------------------------- floors
def floor_onyx(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    m.box((C, C, 0.2), at=(0, 0, -0.12), mat='rose_gold')
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.97, 1.97, 0.03), at=(i * 1.0, j * 1.0, -0.016), mat='onyx', bevel=0.006)
    m.box((0.5, 0.5, 0.012), at=(0, 0, -0.005), rot=(0, 0, 45), mat='rose_gold', bevel=0.004)
    m.box((0.3, 0.3, 0.014), at=(0, 0, -0.004), rot=(0, 0, 45), mat='onyx')
    return m


def floor_check(seed):
    m = Mesh('floor')
    m.box((C, C, 0.2), at=(0, 0, -0.12), mat='onyx')
    for i in range(4):
        for j in range(4):
            m.box((0.975, 0.975, 0.03), at=(-1.5 + i, -1.5 + j, -0.016), mat='porcelain' if (i + j) % 2 else 'porcelain_grey', bevel=0.008)
    for i in range(3):
        for j in range(3):
            m.cyl(0.06, 0.012, at=(-1 + i, -1 + j, -0.004), mat='rose_gold', seg=8)
    return m


def floor_halo(seed):
    m = Mesh('floor')
    m.box((C, C, 0.2), at=(0, 0, -0.12), mat='rose_gold')
    m.box((3.96, 3.96, 0.03), at=(0, 0, -0.016), mat='onyx', bevel=0.006)
    m.ring(1.25, 0.03, at=(0, 0, -0.012), mat='neon_pink', seg=40, tseg=4)
    m.ring(1.5, 0.012, at=(0, 0, -0.006), mat='rose_gold', seg=40, tseg=4)
    m.cyl(0.5, 0.012, at=(0, 0, -0.003), mat='porcelain', seg=24)
    m.prism([(-0.3, 0), (-0.15, -0.12), (0.15, -0.12), (0.3, 0), (0.15, 0.12), (-0.15, 0.12)], 0.008, at=(0, 0, 0.002), mat='rose_gold')
    return m


def floor_glass(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    m.box((C, C, 0.05), at=(0, 0, -0.62), mat='porcelain_grey')
    m.box((3.6, 3.6, 0.02), at=(0, 0, -0.58), mat='neon_white')
    for i in range(4):
        m.cyl(0.07, C, at=(-1.4 + i * 0.95, 0, -0.38), rot=(90, 0, 0), mat='chrome' if i % 2 else 'rose_gold', seg=8)
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.8, 1.8, 0.025), at=(i * 0.97, j * 0.97, -0.014), mat='frost')
    for k in (-1.94, 0, 1.94):
        m.box((0.14, C, 0.06), at=(k, 0, -0.03), mat='rose_gold', bevel=0.01)
        m.box((C, 0.14, 0.06), at=(0, k, -0.03), mat='rose_gold', bevel=0.01)
    return m


# ---------------------------------------------------------------- ceilings
def ceil_coffer(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.15), at=(0, 0, 0.5), mat='porcelain_grey')
    for k in (-2, 0, 2):
        m.box((0.3, C, 0.4), at=(k, 0, 0.2), mat='porcelain', bevel=0.04)
        m.box((C, 0.3, 0.4), at=(0, k, 0.2), mat='porcelain', bevel=0.04)
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.5, 1.5, 0.05), at=(i, j, 0.4), mat='porcelain', bevel=0.02)
            m.ring(0.5, 0.02, at=(i, j, 0.37), mat='rose_gold', seg=20, tseg=4)
            m.cyl(0.08, 0.03, at=(i, j, 0.36), mat='neon_white', seg=10)
    return m


def ceil_lightbox(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.15), at=(0, 0, 0.5), mat='porcelain_grey')
    for k in (-1.85, 1.85):
        m.box((0.3, C, 0.4), at=(k, 0, 0.2), mat='porcelain', bevel=0.04)
        m.box((C, 0.3, 0.4), at=(0, k, 0.2), mat='porcelain', bevel=0.04)
    m.box((3.3, 3.3, 0.06), at=(0, 0, 0.16), mat='neon_white')
    m.box((3.45, 3.45, 0.1), at=(0, 0, 0.22), mat='rose_gold', bevel=0.02)
    for k in (-0.55, 0.55):
        m.box((0.03, 3.3, 0.05), at=(k, 0, 0.12), mat='porcelain')
        m.box((3.3, 0.03, 0.05), at=(0, k, 0.12), mat='porcelain')
    return m


def ceil_halo(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.15), at=(0, 0, 0.5), mat='porcelain_grey')
    m.box((C, C, 0.06), at=(0, 0, 0.4), mat='porcelain')
    m.cyl(1.6, 0.25, at=(0, 0, 0.26), mat='onyx', seg=28)
    m.ring(1.2, 0.05, at=(0, 0, -0.45), mat='neon_pink', seg=40, tseg=6)
    m.ring(0.8, 0.03, at=(0, 0, -0.25), mat='neon_white', seg=32, tseg=6)
    for i in range(3):
        a = math.radians(i * 120 + 20)
        m.cyl(0.012, 0.6, at=(1.2 * math.cos(a), 1.2 * math.sin(a), -0.15), mat='rose_gold', seg=5)
        m.cyl(0.012, 0.4, at=(0.8 * math.cos(a + 1), 0.8 * math.sin(a + 1), -0.05), mat='rose_gold', seg=5)
    m.cyl(0.25, 0.05, at=(0, 0, 0.12), mat='rose_gold', seg=16)
    return m


def ceil_slats(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.1), at=(0, 0, 0.7), mat='onyx')
    for i in range(13):
        m.box((0.07, C, 0.42), at=(-1.84 + i * 0.307, 0, 0.2), mat='porcelain', bevel=0.02)
    for y in (-1.2, 1.2):
        m.box((C, 0.05, 0.03), at=(0, y, 0.45), mat='neon_pink')
    return m


# ---------------------------------------------------------------- furniture
def sector(r0, r1, a0, a1, n=12):
    pts = [(r1 * math.cos(math.radians(a0 + (a1 - a0) * i / n)), r1 * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    pts += [(r0 * math.cos(math.radians(a1 - (a1 - a0) * i / n)), r0 * math.sin(math.radians(a1 - (a1 - a0) * i / n))) for i in range(n + 1)]
    return pts


def desk():
    m = Mesh('ag_desk')
    m.prism(sector(1.25, 1.75, 200, 340), 1.0, at=(0, 0.9, 0), mat='porcelain', bevel=0.03)
    m.prism(sector(1.15, 1.85, 198, 342), 0.07, at=(0, 0.9, 1.0), mat='onyx', bevel=0.015)
    m.prism(sector(1.74, 1.77, 202, 338), 0.05, at=(0, 0.9, 0.12), mat='neon_pink')
    m.prism(sector(1.74, 1.78, 202, 338), 0.06, at=(0, 0.9, 0.82), mat='rose_gold')
    m.box((0.6, 0.03, 0.4), at=(0, -0.5, 1.32), rot=(-14, 0, 0), mat='rose_gold', bevel=0.01)
    m.box((0.54, 0.03, 0.34), at=(0, -0.505, 1.32), rot=(-14, 0, 0), mat='adscreen')
    m.cyl(0.03, 0.2, at=(0, -0.46, 1.14), mat='rose_gold', seg=8)
    m.lathe([(0.07, 0), (0.1, 0.05), (0.03, 0.1), (0.03, 0.2), (0.09, 0.3), (0.07, 0.36)], at=(0.9, -0.2, 1.07), mat='rose_gold', seg=10)   # a bell nobody answers
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(3.2, 1.1, 1.2), screen=dict(at=(0, -0.52, 1.32), size=(0.5, 0.3), tilt=-14),
                light=dict(color=(1.0, 0.2, 0.6), energy=0.6, range=4, at=(0, -0.9, 0.3))))


def pedestal():
    m = Mesh('ag_pedestal')
    m.lathe([(0.5, 0), (0.5, 0.06), (0.36, 0.14), (0.26, 0.5), (0.3, 0.9), (0.46, 1.04), (0.46, 1.1)], mat='porcelain', seg=20)
    m.cyl(0.47, 0.03, at=(0, 0, 1.11), mat='rose_gold', seg=20)
    m.ring(0.4, 0.02, at=(0, 0, 1.13), mat='neon_pink', seg=24, tseg=5)
    m.ring(0.3, 0.015, at=(0, 0, 0.5), mat='rose_gold', seg=20, tseg=5)
    objs = [m.to_object()]
    d = Mesh('dome')
    prof = [(0.4 * math.cos(math.radians(a)), 1.13 + 0.55 * math.sin(math.radians(a))) for a in range(0, 91, 15)]
    d.lathe(prof, mat='frost', seg=18)
    d.ball(0.04, at=(0, 0, 1.71), mat='rose_gold', seg=8)
    objs.append(d.to_object(origin=(0, 0, 1.13)))
    return dict(objects=objs, meta=dict(type='prop', solid=(0.95, 1.7, 0.95), time=0.6, parts={'dome': dict(move=(0, 0, 1.0))},
                light=dict(color=(1.0, 0.3, 0.65), energy=0.8, range=3.5, at=(0, 0, 1.5))))


def kiosk():
    m = Mesh('ag_kiosk')
    m.cyl(0.45, 0.08, at=(0, 0, 0.04), mat='rose_gold', seg=18)
    m.box((0.8, 0.2, 2.2), at=(0, 0, 1.2), mat='porcelain', bevel=0.09)
    for f in (-1, 1):
        m.box((0.62, 0.02, 1.2), at=(0, f * 0.105, 1.55), mat='adscreen')
        m.box((0.3, 0.03, 0.05), at=(0, f * 0.105, 0.75), mat='neon_pink')
        m.cyl(0.05, 0.03, at=(0, f * 0.11, 0.55), rot=(90, 0, 0), mat='rose_gold', seg=10)
    m.ring(0.2, 0.02, at=(0, 0, 2.38), rot=(90, 0, 0), mat='neon_pink', seg=18, tseg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.85, 2.3, 0.4), screen=dict(at=(0, -0.118, 1.55), size=(0.56, 1.1), tilt=0),
                light=dict(color=(1.0, 0.2, 0.6), energy=0.7, range=4, at=(0, -0.6, 1.5))))


def sofa():
    m = Mesh('ag_sofa')
    m.prism(sector(1.0, 1.9, 205, 335), 0.42, at=(0, 1.3, 0.08), mat='velvet', bevel=0.06)
    m.prism(sector(1.7, 1.98, 203, 337), 0.95, at=(0, 1.3, 0.08), mat='velvet', bevel=0.07)
    m.prism(sector(0.98, 2.0, 204, 336), 0.07, at=(0, 1.3, 0.02), mat='rose_gold', bevel=0.02)
    for a in (220, 245, 270, 295, 320):
        m.ball(0.3, at=(1.38 * math.cos(math.radians(a)), 1.3 + 1.38 * math.sin(math.radians(a)), 0.52), mat='velvet', seg=10, scale=(1.0, 1.0, 0.3))
        m.cyl(0.035, 0.03, at=(1.7 * math.cos(math.radians(a)), 1.3 + 1.7 * math.sin(math.radians(a)), 0.78), rot=(90, 0, a - 270), mat='rose_gold', seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(3.2, 0.9, 1.1)))


def pod():
    m = Mesh('ag_pod')
    m.cyl(0.45, 0.05, at=(0, 0, 0.025), mat='rose_gold', seg=18)
    m.cyl(0.06, 0.4, at=(0, 0, 0.25), mat='chrome', seg=8)
    prof = [(0.02, -0.62), (0.4, -0.5), (0.62, -0.15), (0.66, 0.25), (0.55, 0.62), (0.34, 0.86)]       # an open egg
    m.lathe(prof, at=(0, 0.05, 1.1), rot=(-58, 0, 0), mat='porcelain', seg=18)
    m.lathe([(r * 0.93, z) for (r, z) in prof], at=(0, 0.05, 1.1), rot=(-58, 0, 0), mat='velvet', seg=18)
    m.ball(0.34, at=(0, -0.02, 0.86), mat='velvet', seg=12, scale=(1.2, 1.0, 0.35))
    m.ball(0.2, at=(0, 0.32, 1.5), mat='velvet', seg=10, scale=(1.2, 0.5, 1.0))
    for s in (-1, 1):                              # the comfort straps
        m.tube([(s * 0.5, -0.1, 1.0), (s * 0.3, -0.36, 1.05), (s * 0.05, -0.42, 1.06)], 0.025, mat='rose_gold', seg=6)
    m.ring(0.2, 0.02, at=(0, 0.2, 1.7), rot=(60, 0, 0), mat='neon_pink', seg=18, tseg=5)                # the halo that asks the questions
    m.cyl(0.015, 0.3, at=(0, 0.42, 1.75), rot=(-30, 0, 0), mat='chrome', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.1, 1.6, 1.1)))


def planter():
    rnd = random.Random(9)
    m = Mesh('ag_planter')
    m.lathe([(0.28, 0), (0.42, 0.12), (0.46, 0.5), (0.3, 0.8), (0.34, 0.86)], mat='onyx', seg=18)
    m.ring(0.46, 0.02, at=(0, 0, 0.5), mat='rose_gold', seg=20, tseg=5)
    for i in range(7):                              # a tree somebody designed
        a = i * 0.9
        r1 = 0.12 + 0.05 * i
        top = (r1 * 2.6 * math.cos(a), r1 * 2.6 * math.sin(a), 1.5 + 0.22 * i)
        m.tube([(0, 0, 0.8), (r1 * math.cos(a), r1 * math.sin(a), 1.15 + 0.1 * i), top], lambda t: 0.03 * (1 - t * 0.6), mat='porcelain', seg=6)
        m.lathe([(0.0, -0.16), (0.1, 0.0), (0.0, 0.16)], at=top, rot=(rnd.uniform(-30, 30), rnd.uniform(-30, 30), 0), mat='frost' if i % 3 else 'neon_pink', seg=6, smooth=False)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.9, 1.4, 0.9)))


TILES = {
    'wall_porcelain_a': lambda: wall_porcelain(3), 'wall_porcelain_b': lambda: wall_porcelain(8, rows=True), 'wall_flute': lambda: wall_flute(1),
    'wall_ad': lambda: wall_ad(2), 'wall_niche': lambda: wall_niche(4), 'wall_emblem': lambda: wall_emblem(5), 'wall_pad': lambda: wall_pad(6),
    'wall_crack': lambda: wall_crack(7), 'wall_column': lambda: wall_column(9),
    'floor_onyx': lambda: floor_onyx(1), 'floor_check': lambda: floor_check(2), 'floor_halo': lambda: floor_halo(3), 'floor_glass': lambda: floor_glass(4),
    'ceil_coffer': lambda: ceil_coffer(1), 'ceil_lightbox': lambda: ceil_lightbox(2), 'ceil_halo': lambda: ceil_halo(3), 'ceil_slats': lambda: ceil_slats(4),
}
PROPS = {'ag_desk': desk, 'ag_pedestal': pedestal, 'ag_kiosk': kiosk, 'ag_sofa': sofa, 'ag_pod': pod, 'ag_planter': planter}
TILE_META = {
    'ceil_lightbox': dict(light=dict(color=[1.0, 0.95, 0.98], energy=1.25, range=12, at=[0, -0.5, 0])),
    'ceil_halo': dict(light=dict(color=[1.0, 0.3, 0.65], energy=1.1, range=9, at=[0, -0.8, 0])),
    'wall_column': dict(light=dict(color=[1.0, 0.95, 0.98], energy=1.0, range=6, at=[0, 2.0, 0.7])),
    'wall_ad': dict(light=dict(color=[1.0, 0.25, 0.62], energy=0.7, range=5, at=[0, 2.1, 0.8])),
    'wall_niche': dict(light=dict(color=[1.0, 0.3, 0.65], energy=0.5, range=4, at=[0, 2.0, 0.7])),
}
