"""Four more kits from the 2D games:
  executive  Dead Signal's executive floor, with a little more high-tech: ebony, rosewood, green-veined black
             marble, jade, brass, amber light, and thin cyan holo lines let into the luxury            (tag ex)
  megaplex   the Infinite Satisfaction Retail Megaplex: cream and teal mall tile, chrome, shopfronts, backlit
             ads, a food court and a cinema                                                            (tag mp)
  hospital   the Elective Suffering & Recovery Hospital: white ceramic tile, pale green lino, steel,
             curtains, surgical light                                                                  (tag hs)
  basilica   the Basilica of the Blessed Brand: cream limestone, gold, logo glass in magenta, cyan and
             yellow, neon halos, purple velvet                                                         (tag bb)
Sizes and conventions are tiles.py's. Each kit has walls, floors, ceilings, a door and starter furniture;
Eric's own models replace the furniture piece by piece (same ids, or new ones listed in kit.json)."""
import math, random
from mz import Mesh, T, R, S
from tiles import C, H, bsp
from kits3 import courses, gothic, _frame, DW, DH, DT

EXEC_MATS = {
    'ebony':      dict(color=(0.27, 0.20, 0.155), metal=0.0, rough=0.32, shader='worn', grime=0.15),
    'rosewood':   dict(color=(0.58, 0.21, 0.11), metal=0.0, rough=0.3, shader='worn', grime=0.2),
    'marble_blk': dict(color=(0.17, 0.24, 0.215), metal=0.05, rough=0.1, shader='worn', grime=0.15),
    'jade':       dict(color=(0.15, 0.48, 0.34), metal=0.15, rough=0.18, shader='worn', grime=0.15),
    'carpet_jade': dict(color=(0.14, 0.44, 0.32), metal=0.0, rough=0.97),
    'leather':    dict(color=(0.24, 0.04, 0.035), metal=0.0, rough=0.42),
    'amber':      dict(color=(1.0, 0.68, 0.25), emit=(1.0, 0.66, 0.22), energy=3.2, shader='glow'),
    'holo':       dict(color=(0.2, 0.95, 0.85), emit=(0.2, 0.95, 0.85), energy=3.0, shader='glow', pulse=0.15),
    'book_a':     dict(color=(0.30, 0.08, 0.06), metal=0.0, rough=0.7),
    'book_b':     dict(color=(0.07, 0.16, 0.24), metal=0.0, rough=0.7),
    'book_c':     dict(color=(0.42, 0.34, 0.16), metal=0.0, rough=0.7),
}
MEGA_MATS = {
    'mall_cream': dict(color=(0.80, 0.76, 0.66), metal=0.1, rough=0.16, shader='worn', grime=0.45),
    'mall_teal':  dict(color=(0.07, 0.42, 0.44), metal=0.1, rough=0.18, shader='worn', grime=0.45),
    'mall_dark':  dict(color=(0.09, 0.09, 0.11), metal=0.2, rough=0.2, shader='worn', grime=0.4),
    'plastic_red': dict(color=(0.75, 0.08, 0.07), metal=0.0, rough=0.3, shader='worn', grime=0.4),
    'plastic_yel': dict(color=(0.95, 0.72, 0.08), metal=0.0, rough=0.3, shader='worn', grime=0.4),
    'shutter':    dict(color=(0.42, 0.44, 0.46), metal=0.8, rough=0.4, shader='worn', grime=0.6),
    'carpet_cine': dict(color=(0.13, 0.04, 0.16), metal=0.0, rough=0.97),
    'seat':       dict(color=(0.5, 0.05, 0.08), metal=0.0, rough=0.9),
    'acoustic':   dict(color=(0.07, 0.06, 0.09), metal=0.0, rough=0.98),
    'sky':        dict(color=(0.75, 0.9, 1.0), emit=(0.7, 0.86, 1.0), energy=1.5, shader='glow'),
    'sale':       dict(color=(1.0, 0.85, 0.1), emit=(1.0, 0.82, 0.1), energy=2.4, shader='glow', pulse=0.2),
}
HOSP_MATS = {
    'tile_white': dict(color=(0.84, 0.86, 0.84), metal=0.05, rough=0.14, shader='worn', grime=0.5),
    'tile_teal':  dict(color=(0.22, 0.52, 0.50), metal=0.05, rough=0.16, shader='worn', grime=0.5),
    'grout':      dict(color=(0.30, 0.32, 0.31), metal=0.0, rough=0.9),
    'lino':       dict(color=(0.52, 0.64, 0.56), metal=0.0, rough=0.35, shader='worn', grime=0.55),
    'lino_dark':  dict(color=(0.20, 0.30, 0.27), metal=0.0, rough=0.4, shader='worn', grime=0.55),
    'steel':      dict(color=(0.70, 0.72, 0.74), metal=0.95, rough=0.28, shader='worn', grime=0.3),
    'curtain':    dict(color=(0.50, 0.66, 0.74), metal=0.0, rough=0.95),
    'sheet':      dict(color=(0.88, 0.88, 0.84), metal=0.0, rough=0.9),
    'mattress':   dict(color=(0.30, 0.42, 0.46), metal=0.0, rough=0.8),
    'stain':      dict(color=(0.22, 0.03, 0.03), metal=0.0, rough=0.5),
    'surg':       dict(color=(1.0, 1.0, 0.96), emit=(1.0, 1.0, 0.95), energy=4.5, shader='glow'),
    'xray':       dict(color=(0.75, 0.9, 1.0), emit=(0.7, 0.88, 1.0), energy=2.0, shader='glow', flicker=0.1),
    'pill_a':     dict(color=(0.75, 0.3, 0.1), metal=0.0, rough=0.3),
    'pill_b':     dict(color=(0.15, 0.3, 0.6), metal=0.0, rough=0.3),
}
BASIL_MATS = {
    'lime':       dict(color=(0.66, 0.60, 0.48), metal=0.0, rough=0.88, shader='worn', grime=0.5),
    'lime_dark':  dict(color=(0.38, 0.34, 0.27), metal=0.0, rough=0.9, shader='worn', grime=0.6),
    'pew':        dict(color=(0.13, 0.07, 0.04), metal=0.05, rough=0.4, shader='worn', grime=0.3),
    'velvet':     dict(color=(0.22, 0.04, 0.30), metal=0.0, rough=0.95),
    'runner':     dict(color=(0.45, 0.04, 0.06), metal=0.0, rough=0.96),
    'logo_m':     dict(color=(1.0, 0.1, 0.6), emit=(1.0, 0.12, 0.6), energy=2.4, shader='glow', pulse=0.1),
    'logo_c':     dict(color=(0.1, 0.8, 1.0), emit=(0.1, 0.8, 1.0), energy=2.4, shader='glow', pulse=0.1),
    'logo_y':     dict(color=(1.0, 0.85, 0.1), emit=(1.0, 0.83, 0.1), energy=2.4, shader='glow', pulse=0.1),
    'halo':       dict(color=(1.0, 0.3, 0.75), emit=(1.0, 0.3, 0.75), energy=4.0, shader='glow', pulse=0.2),
    'incense':    dict(color=(1.0, 0.6, 0.2), emit=(1.0, 0.58, 0.18), energy=3.0, shader='glow', flicker=0.3, pulse=0.3),
    'product':    dict(color=(0.9, 0.9, 0.95), metal=0.2, rough=0.2),
}


def base(m, body, skirt, corn, sk_h=0.28, co_h=0.26):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat=body)
    m.box((C, 0.12, sk_h), at=(0, -0.04, sk_h / 2), mat=skirt, bevel=0.02)
    m.box((C, 0.14, co_h), at=(0, -0.05, H - co_h / 2), mat=corn, bevel=0.02)


def slab_floor(m, mat):
    m.box((C, C, 0.2), at=(0, 0, -0.13), mat=mat)


def slab_ceil(m, mat, z=0.5):
    m.box((C, C, 0.2), at=(0, 0, z), mat=mat)


# ================================================================= THE EXECUTIVE FLOOR
def ex_panels(m, x0, x1, z0, z1, cols, rows, wood='rosewood'):
    w = (x1 - x0) / cols
    h = (z1 - z0) / rows
    for i in range(cols):
        for j in range(rows):
            cx, cz = x0 + (i + 0.5) * w, z0 + (j + 0.5) * h
            m.box((w - 0.12, 0.05, h - 0.12), at=(cx, -0.025, cz), mat=wood, bevel=0.02)
            m.box((w - 0.36, 0.03, h - 0.36), at=(cx, -0.06, cz), mat='ebony', bevel=0.015)


def wall_ex_panel(seed):
    m = Mesh('wall')
    base(m, 'ebony', 'ebony', 'ebony')
    ex_panels(m, -2, 2, 0.3, 1.25, 4, 1)
    ex_panels(m, -2, 2, 1.4, H - 0.3, 4 if seed % 2 else 2, 1)
    m.box((C, 0.08, 0.06), at=(0, -0.05, 1.32), mat='brass')                 # the brass lip of the dado
    m.box((C, 0.02, 0.025), at=(0, -0.075, 1.4), mat='holo')                 # and a hairline of light above it
    m.box((C, 0.05, 0.05), at=(0, -0.11, H - 0.29), mat='brass')
    return m


def wall_ex_marble(seed):
    m = Mesh('wall')
    base(m, 'marble_blk', 'marble_blk', 'marble_blk')
    for i in range(8):                                                       # fluted jade pilasters
        x = -1.75 + i * 0.5
        m.cyl(0.2, H - 0.75, at=(x, 0.04, H / 2 + 0.02), mat='jade' if i % 4 in (1, 2) else 'marble_blk', seg=10)
    m.box((C, 0.16, 0.14), at=(0, -0.06, 0.4), mat='brass', bevel=0.02)
    m.box((C, 0.16, 0.14), at=(0, -0.06, H - 0.4), mat='brass', bevel=0.02)
    m.box((C, 0.02, 0.02), at=(0, -0.145, H - 0.52), mat='holo')
    return m


def wall_ex_shelves(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    base(m, 'ebony', 'ebony', 'ebony')
    m.box((C, 0.04, H - 0.6), at=(0, 0.0, H / 2), mat='ebony')
    for z in (0.3, 0.95, 1.6, 2.25, 2.9, 3.55):
        m.box((C, 0.34, 0.05), at=(0, -0.15, z), mat='rosewood')
    for x in (-2, -0.67, 0.67, 2):
        m.box((0.07, 0.34, H - 0.55), at=(x * 0.985, -0.15, H / 2), mat='rosewood')
    for z in (0.33, 0.98, 1.63, 2.28, 2.93):
        x = -1.9
        while x < 1.85:
            if abs(abs(x) - 0.67) < 0.09:
                x += 0.1
                continue
            w = rnd.uniform(0.05, 0.11)
            if rnd.random() < 0.08:                                          # a data slate among the books
                m.box((0.26, 0.03, 0.36), at=(x + 0.14, -0.2, z + 0.2), rot=(-12, 0, 0), mat='holo')
                x += 0.34
                continue
            if rnd.random() < 0.12:
                x += rnd.uniform(0.1, 0.3)
                continue
            hh = rnd.uniform(0.38, 0.56)
            m.box((w, 0.24, hh), at=(x + w / 2, -0.16, z + hh / 2), mat=rnd.choice(['book_a', 'book_b', 'book_c', 'ebony', 'jade']))
            x += w + 0.008
    m.box((C, 0.03, 0.03), at=(0, -0.33, 3.58), mat='brass')                 # the ladder rail
    return m


def wall_ex_screen(seed):
    m = Mesh('wall')
    base(m, 'ebony', 'ebony', 'ebony')
    ex_panels(m, -2, 2, 0.3, 1.25, 4, 1)
    m.box((C, 0.08, 0.06), at=(0, -0.05, 1.32), mat='brass')
    m.box((3.5, 0.1, 2.0), at=(0, -0.04, 2.5), mat='ebony', bevel=0.03)
    m.box((3.3, 0.02, 1.8), at=(0, -0.1, 2.5), mat='screen')                 # the market wall
    for s in (-1, 1):
        m.box((0.05, 0.14, 2.1), at=(s * 1.78, -0.05, 2.5), mat='brass')
    m.box((3.6, 0.14, 0.05), at=(0, -0.05, 3.56), mat='brass')
    m.box((3.6, 0.14, 0.05), at=(0, -0.05, 1.44), mat='brass')
    return m


def wall_ex_sconce(seed):
    m = wall_ex_panel(seed)
    for x in (-1.0, 1.0):
        m.box((0.14, 0.08, 0.5), at=(x, -0.1, 2.5), mat='brass', bevel=0.02)
        m.cyl(0.11, 0.42, at=(x, -0.22, 2.55), mat='amber', seg=10)
        m.cyl(0.13, 0.03, at=(x, -0.22, 2.33), mat='brass', seg=10)
        m.cyl(0.13, 0.03, at=(x, -0.22, 2.77), mat='brass', seg=10)
    return m


def wall_ex_art(seed):
    m = wall_ex_panel(0)
    m.box((1.9, 0.1, 1.5), at=(0, -0.09, 2.5), mat='brass', bevel=0.04)      # a gilt frame
    m.box((1.6, 0.03, 1.2), at=(0, -0.14, 2.5), mat='marble_blk')
    m.ball(0.3, at=(0, -0.16, 2.72), mat='holo', seg=10, scale=(0.9, 0.12, 1.1))      # the chairman, as a ghost of light
    m.prism([(-0.5, 0), (0.5, 0), (0.3, 0.42), (-0.3, 0.42)], 0.03, at=(0, -0.13, 1.94), rot=(90, 0, 0), mat='holo')
    m.box((0.5, 0.03, 0.08), at=(0, -0.13, 1.66), mat='brass')
    return m


def floor_ex_marble(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    slab_floor(m, 'brass')
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.97, 1.97, 0.04), at=(i, j, -0.021), mat='marble_blk', bevel=0.006)
    for k in range(5):                                                       # green veins
        x, y = rnd.uniform(-1.8, 1.8), rnd.uniform(-1.8, 1.8)
        m.box((rnd.uniform(0.6, 1.6), 0.02, 0.003), at=(x, y, 0.0), rot=(0, 0, rnd.uniform(0, 180)), mat='jade')
    return m


def floor_ex_herring(seed):
    m = Mesh('floor')
    slab_floor(m, 'ebony')
    L, W = 0.66, 0.2
    k = 0
    y = -2.2
    while y < 2.3:
        x = -2.3
        while x < 2.3:
            for (dx, dy, a) in ((0, 0, 45), (0.33, 0.0, -45)):
                cx, cy = x + dx, y + dy
                if abs(cx) < 1.86 and abs(cy) < 1.86:
                    m.box((L, W, 0.03), at=(cx, cy, -0.016), rot=(0, 0, a), mat='rosewood' if k % 5 else 'ebony', bevel=0.004)
                k += 1
            x += 0.66
        y += 0.29
    for s in (-1, 1):                                                        # an ebony border squares it off
        m.box((C, 0.14, 0.034), at=(0, s * 1.93, -0.014), mat='ebony')
        m.box((0.14, C, 0.034), at=(s * 1.93, 0, -0.014), mat='ebony')
    return m


def floor_ex_carpet(seed):
    m = Mesh('floor')
    slab_floor(m, 'ebony')
    m.box((C, C, 0.03), at=(0, 0, -0.016), mat='carpet_jade')
    for s in (-1, 1):
        m.box((3.5, 0.08, 0.004), at=(0, s * 1.7, 0.0), mat='brass')
        m.box((0.08, 3.5, 0.004), at=(s * 1.7, 0, 0.0), mat='brass')
    return m


def floor_ex_inlay(seed):
    m = floor_ex_marble(seed)
    m.ring(1.2, 0.025, at=(0, 0, 0.0), mat='brass', seg=28, tseg=4)
    m.ring(0.7, 0.012, at=(0, 0, 0.002), mat='holo', seg=24, tseg=4)
    for k in range(8):
        a = k * math.pi / 4
        m.box((0.5, 0.02, 0.004), at=(0.95 * math.cos(a), 0.95 * math.sin(a), 0.0), rot=(0, 0, math.degrees(a)), mat='holo' if k % 2 else 'brass')
    m.cyl(0.3, 0.008, at=(0, 0, 0.0), mat='jade', seg=16)
    return m


def ceil_ex_coffer(seed):
    m = Mesh('ceil')
    slab_ceil(m, 'ebony', 0.6)
    for i in range(3):
        for s in (0, 1):
            p = -2 + i * 2
            m.box((0.3, C, 0.42), at=(p, 0, 0.3), mat='ebony', bevel=0.02) if s == 0 else m.box((C, 0.3, 0.42), at=(0, p, 0.3), mat='ebony', bevel=0.02)
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.5, 1.5, 0.05), at=(i, j, 0.47), mat='rosewood', bevel=0.02)
            m.box((1.72, 1.72, 0.03), at=(i, j, 0.49), mat='brass')
    return m


def ceil_ex_light(seed):
    m = ceil_ex_coffer(seed)
    for i in (-1, 1):
        for j in (-1, 1):
            m.box((1.1, 1.1, 0.04), at=(i, j, 0.43), mat='amber')
    m.ring(0.5, 0.02, at=(0, 0, 0.06), mat='holo', seg=20, tseg=4)
    return m


def ceil_ex_dome(seed):
    m = Mesh('ceil')
    slab_ceil(m, 'ebony', 1.3)
    m.lathe([(2.6, 0.02), (2.2, 0.5), (1.4, 0.95), (0.5, 1.15), (0.0, 1.18)], mat='jade', seg=20, smooth=True)
    for k in range(8):
        a = k * math.pi / 4
        m.tube([(2.3 * math.cos(a), 2.3 * math.sin(a), 0.38), (1.4 * math.cos(a), 1.4 * math.sin(a), 0.9), (0.4 * math.cos(a), 0.4 * math.sin(a), 1.1)], 0.05, mat='brass', seg=5)
    m.lathe([(0.0, 0.7), (0.3, 0.78), (0.42, 0.95), (0.3, 1.1)], mat='amber', seg=14)
    m.ring(0.6, 0.02, at=(0, 0, 0.72), mat='holo', seg=20, tseg=4)
    for s in (-1, 1):
        m.box((C, 0.3, 0.3), at=(0, s * 2, 0.15), mat='ebony', bevel=0.02)
        m.box((0.3, C, 0.3), at=(s * 2, 0, 0.15), mat='ebony', bevel=0.02)
    return m


def door_ex_double():
    """Two tall ebony leaves with brass handles; they draw apart into the wall."""
    fr = Mesh('frame')
    _frame(fr, 'ebony', 'brass')
    fr.box((DW + 0.5, DT + 0.2, 0.03), at=(0, 0, DH + 0.22), mat='holo')
    objs = [fr.to_object()]
    parts = {}
    for name, s in (('leaf_l', -1), ('leaf_r', 1)):
        m = Mesh(name)
        m.box((DW / 2, 0.16, DH), at=(s * DW / 4, 0, DH / 2), mat='ebony', bevel=0.02)
        for f in (-1, 1):
            for (z, hh) in ((0.85, 1.2), (2.35, 1.3)):
                m.box((DW / 2 - 0.3, 0.04, hh), at=(s * DW / 4, f * 0.09, z), mat='rosewood', bevel=0.02)
            m.cyl(0.03, 0.7, at=(s * 0.16, f * 0.15, 1.5), mat='brass', seg=8)
            m.box((0.3, 0.04, 0.12), at=(s * 0.45, f * 0.1, 1.5), mat='lock')
        m.box((0.03, 0.18, DH), at=(s * 0.015, 0, DH / 2), mat='brass')
        objs.append(m.to_object(origin=(0, 0, 0)))
        parts[name] = dict(move=(s * (DW / 2 - 0.06), 0, 0))
    return dict(objects=objs, meta=dict(type='door', time=0.7, sound='door_heavy', parts=parts))


def ex_desk():
    m = Mesh('ex_desk')
    m.box((2.4, 1.1, 0.08), at=(0, 0, 0.8), mat='rosewood', bevel=0.02)
    m.box((2.5, 1.2, 0.02), at=(0, 0, 0.75), mat='brass')
    for s in (-1, 1):
        m.box((0.6, 1.0, 0.74), at=(s * 0.85, 0, 0.37), mat='ebony', bevel=0.02)
        for k in range(3):
            m.box((0.5, 0.02, 0.18), at=(s * 0.85, 0.51, 0.16 + k * 0.23), mat='rosewood')
            m.box((0.14, 0.03, 0.02), at=(s * 0.85, 0.53, 0.16 + k * 0.23), mat='brass')
    m.box((1.1, 0.04, 0.6), at=(0, -0.5, 0.42), mat='ebony')
    m.box((0.9, 0.5, 0.02), at=(0, 0.05, 0.85), mat='leather')                # the blotter
    m.box((0.7, 0.02, 0.42), at=(0, -0.2, 1.12), rot=(-12, 0, 0), mat='holo')   # a display that is only light
    m.box((0.74, 0.06, 0.03), at=(0, -0.2, 0.86), mat='brass')
    m.lathe([(0.07, 0), (0.05, 0.02), (0.02, 0.3), (0.12, 0.34), (0.15, 0.46)], at=(0.95, -0.2, 0.84), mat='brass', seg=10)
    m.lathe([(0.1, 0), (0.14, 0.1)], at=(0.95, -0.2, 1.2), mat='amber', seg=10)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.4, 1.0, 1.1), light=dict(color=(1.0, 0.7, 0.3), energy=0.8, range=4.5, at=(0.95, -0.2, 1.4))))


def ex_chair():
    m = Mesh('ex_chair')
    m.box((0.9, 0.85, 0.3), at=(0, 0, 0.36), mat='leather', bevel=0.08)
    m.box((0.9, 0.22, 0.95), at=(0, 0.36, 0.78), rot=(-8, 0, 0), mat='leather', bevel=0.08)
    for s in (-1, 1):
        m.box((0.2, 0.8, 0.5), at=(s * 0.46, 0.02, 0.5), mat='leather', bevel=0.07)
        for y in (-0.32, 0.36):
            m.cyl(0.035, 0.2, at=(s * 0.4, y, 0.1), mat='brass', seg=6)
    for k in range(3):
        for j in range(2):
            m.ball(0.025, at=(-0.24 + k * 0.24, 0.26, 0.8 + j * 0.3), mat='brass', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.95, 0.9, 0.9)))


def ex_table():
    m = Mesh('ex_table')
    m.prism([(-1.7, -0.5), (-1.4, -0.75), (1.4, -0.75), (1.7, -0.5), (1.7, 0.5), (1.4, 0.75), (-1.4, 0.75), (-1.7, 0.5)], 0.08, at=(0, 0, 0.74), mat='ebony', bevel=0.02)
    m.box((2.6, 0.9, 0.012), at=(0, 0, 0.826), mat='marble_blk')
    m.box((2.2, 0.03, 0.006), at=(0, 0, 0.834), mat='holo')
    for x in (-1.1, 1.1):
        m.box((0.3, 0.9, 0.7), at=(x, 0, 0.36), mat='ebony', bevel=0.03)
        m.box((0.34, 0.94, 0.04), at=(x, 0, 0.03), mat='brass')
    m.lathe([(0.0, 0), (0.2, 0.02), (0.22, 0.05)], at=(0, 0, 0.83), mat='brass', seg=14)
    m.lathe([(0.02, 0), (0.3, 0.25), (0.02, 0.55)], at=(0, 0, 0.92), mat='holo', seg=10)          # the projection over the middle
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(3.4, 0.95, 1.5), light=dict(color=(0.2, 0.95, 0.85), energy=0.7, range=4, at=(0, 0, 1.4))))


def ex_bar():
    rnd = random.Random(4)
    m = Mesh('ex_bar')
    m.box((1.8, 0.55, 1.0), at=(0, 0, 0.5), mat='ebony', bevel=0.02)
    m.box((1.9, 0.62, 0.05), at=(0, 0, 1.02), mat='marble_blk', bevel=0.01)
    m.box((1.8, 0.2, 1.1), at=(0, 0.18, 1.6), mat='ebony')
    m.box((1.6, 0.02, 0.9), at=(0, 0.07, 1.6), mat='mirror')
    for z in (1.35, 1.75):
        m.box((1.6, 0.16, 0.02), at=(0, 0.0, z), mat='glass')
    for i in range(10):
        x = -0.7 + (i % 5) * 0.35 + rnd.uniform(-0.04, 0.04)
        z = 1.36 if i < 5 else 1.76
        m.lathe([(0.05, 0), (0.05, 0.16), (0.018, 0.24), (0.018, 0.3)], at=(x, 0.0, z), mat=rnd.choice(['jade', 'amber', 'glass', 'rosewood']), seg=8)
    for s in (-1, 1):
        m.box((0.7, 0.02, 0.7), at=(s * 0.45, -0.28, 0.5), mat='rosewood', bevel=0.02)
        m.cyl(0.02, 0.2, at=(s * 0.15, -0.3, 0.5), mat='brass', seg=6)
    m.box((1.9, 0.02, 0.02), at=(0, -0.3, 0.98), mat='holo')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.9, 2.1, 0.65)))


def ex_globe():
    m = Mesh('ex_globe')
    m.lathe([(0.42, 0), (0.36, 0.06), (0.08, 0.12), (0.06, 0.8), (0.16, 0.86), (0.3, 0.9)], mat='brass', seg=14)
    m.ball(0.5, at=(0, 0, 1.5), mat='holo', seg=14)
    m.ring(0.62, 0.02, at=(0, 0, 1.5), rot=(66, 0, 0), mat='brass', seg=24, tseg=5)
    m.ring(0.62, 0.02, at=(0, 0, 1.5), rot=(0, 0, 0), mat='brass', seg=24, tseg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.0, 2.0, 1.0), light=dict(color=(0.2, 0.95, 0.85), energy=1.2, range=6, at=(0, 0, 1.5), pulse=0.15)))


def ex_case():
    m = Mesh('ex_case')
    m.box((0.9, 0.9, 0.9), at=(0, 0, 0.45), mat='ebony', bevel=0.03)
    m.box((0.96, 0.96, 0.05), at=(0, 0, 0.92), mat='brass')
    m.box((0.6, 0.6, 0.03), at=(0, 0, 0.96), mat='leather')
    m.box((0.8, 0.8, 0.6), at=(0, 0, 1.26), mat='glass')
    m.box((0.5, 0.02, 0.14), at=(0, -0.46, 0.6), mat='brass')
    m.box((0.84, 0.84, 0.02), at=(0, 0, 0.95), mat='holo')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.95, 1.6, 0.95)))


# ================================================================= THE MEGAPLEX
def mp_tiles(m, x0, x1, z0, z1, size=0.5, mat='mall_cream', alt=None, every=7):
    m.box((x1 - x0, 0.03, z1 - z0), at=((x0 + x1) / 2, -0.005, (z0 + z1) / 2), mat='mall_dark')
    nx, nz = int(round((x1 - x0) / size)), int(round((z1 - z0) / size))
    w, h = (x1 - x0) / nx, (z1 - z0) / nz
    for i in range(nx):
        for j in range(nz):
            mt = alt if alt and (i * 3 + j * 5) % every == 0 else mat
            m.box((w - 0.02, 0.03, h - 0.02), at=(x0 + (i + 0.5) * w, -0.03, z0 + (j + 0.5) * h), mat=mt)


def wall_mp_tile(seed):
    m = Mesh('wall')
    base(m, 'mall_dark', 'chrome', 'chrome', 0.16, 0.14)
    mp_tiles(m, -2, 2, 0.16, 2.66, alt='mall_teal' if seed % 2 else None)
    m.box((C, 0.06, 0.28), at=(0, -0.04, 2.8), mat='mall_teal', bevel=0.01)
    m.box((C, 0.03, 0.04), at=(0, -0.08, 2.8), mat='glow_cyan' if seed % 2 else 'glow_pink')
    mp_tiles(m, -2, 2, 2.94, H - 0.14, size=0.46)
    return m


def wall_mp_store(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    base(m, 'mall_dark', 'chrome', 'chrome', 0.16, 0.14)
    m.box((C, 0.04, H), at=(0, 0.02, H / 2), mat='mall_dark')
    m.box((3.6, 0.3, 0.5), at=(0, -0.1, 0.4), mat='mall_cream', bevel=0.02)                  # the window's plinth
    m.box((3.6, 0.03, 2.1), at=(0, -0.2, 1.7), mat='pane')
    for x in (-1.82, 0, 1.82):
        m.box((0.06, 0.1, 2.2), at=(x, -0.2, 1.7), mat='chrome')
    for x in (-1.1, -0.35, 0.5, 1.2):                                                        # what is on offer
        hh = rnd.uniform(1.1, 1.5)
        m.lathe([(0.14, 0), (0.1, hh * 0.45), (0.2, hh * 0.62), (0.16, hh * 0.86), (0.06, hh * 0.9)], at=(x, 0.02, 0.66), mat=rnd.choice(['plastic_red', 'plastic_yel', 'mall_teal', 'mall_cream']), seg=8)
        m.ball(0.1, at=(x, 0.02, 0.66 + hh), mat='mall_cream', seg=8)
    m.box((3.7, 0.22, 0.6), at=(0, -0.14, 3.2), mat='mall_dark', bevel=0.03)                 # the fascia and its sign
    for k in range(6):
        m.box((0.36, 0.03, 0.34), at=(-1.25 + k * 0.5, -0.26, 3.2), mat=('glow_pink', 'glow_cyan', 'sale')[(seed + k // 2) % 3])
    return m


def wall_mp_shutter(seed):
    m = Mesh('wall')
    base(m, 'mall_dark', 'chrome', 'chrome', 0.16, 0.14)
    for k in range(22):
        m.cyl(0.07, 3.5, at=(0, -0.03, 0.26 + k * 0.125), rot=(0, 90, 0), mat='shutter', seg=6)
    for s in (-1, 1):
        m.box((0.2, 0.2, 3.0), at=(s * 1.86, -0.06, 1.66), mat='chrome', bevel=0.02)
    m.box((0.3, 0.1, 0.16), at=(0, -0.1, 0.3), mat='chrome')
    m.box((3.7, 0.22, 0.6), at=(0, -0.14, 3.3), mat='mall_dark', bevel=0.03)
    m.box((1.6, 0.03, 0.4), at=(0, -0.26, 3.3), mat='screen_dead')
    m.box((1.2, 0.02, 0.5), at=(0.5, -0.11, 1.7), rot=(0, 8, 0), mat='plastic_yel')         # EVERYTHING MUST GO
    m.box((1.0, 0.025, 0.1), at=(0.5, -0.125, 1.75), rot=(0, 8, 0), mat='plastic_red')
    return m


def wall_mp_ad(seed):
    m = Mesh('wall')
    base(m, 'mall_dark', 'chrome', 'chrome', 0.16, 0.14)
    mp_tiles(m, -2, 2, 0.16, H - 0.14)
    m.box((2.9, 0.12, 2.5), at=(0, -0.08, 2.0), mat='chrome', bevel=0.03)
    m.box((2.7, 0.03, 2.3), at=(0, -0.15, 2.0), mat='screen')
    m.box((2.9, 0.04, 0.05), at=(0, -0.16, 0.7), mat='glow_pink')
    return m


def wall_mp_vend(seed):
    m = Mesh('wall')
    base(m, 'mall_dark', 'chrome', 'chrome', 0.16, 0.14)
    mp_tiles(m, -2, 2, 2.5, H - 0.14)
    m.box((C, 0.04, 2.4), at=(0, 0.0, 1.3), mat='mall_dark')
    cols = ('plastic_red', 'mall_teal', 'plastic_yel')
    for i in range(3):
        x = -1.3 + i * 1.3
        m.box((1.15, 0.34, 2.2), at=(x, -0.15, 1.26), mat=cols[(i + seed) % 3], bevel=0.03)
        m.box((0.7, 0.03, 1.2), at=(x - 0.15, -0.33, 1.6), mat='glow_white')
        for r in range(4):
            for c in range(3):
                m.cyl(0.07, 0.04, at=(x - 0.38 + c * 0.23, -0.35, 1.15 + r * 0.3), rot=(90, 0, 0), mat=cols[(r + c) % 3], seg=8)
        m.box((0.22, 0.03, 0.4), at=(x + 0.4, -0.33, 1.7), mat='screen')
        m.box((0.7, 0.05, 0.22), at=(x - 0.15, -0.33, 0.5), mat='mall_dark')
    return m


def wall_mp_cinema(seed):
    m = Mesh('wall')
    base(m, 'acoustic', 'mall_dark', 'mall_dark', 0.2, 0.14)
    for i in range(8):
        m.prism([(-0.24, 0), (0.24, 0), (0.24, 0.06), (0, 0.16), (-0.24, 0.06)], H - 0.5, at=(-1.75 + i * 0.5, 0, 0.25), rot=(0, 0, 180), mat='carpet_cine' if i % 2 else 'acoustic')
    for x in (-1.0, 1.0):
        m.box((0.12, 0.06, 0.3), at=(x, -0.18, 0.5), mat='glow_amber')
    m.box((C, 0.05, 0.05), at=(0, -0.12, H - 0.18), mat='chrome')
    return m


def wall_mp_screen(seed):
    m = Mesh('wall')
    base(m, 'acoustic', 'mall_dark', 'mall_dark', 0.2, 0.14)
    m.box((C, 0.06, 2.9), at=(0, -0.02, 2.2), mat='mall_dark')
    m.box((3.96, 0.02, 2.6), at=(0, -0.06, 2.2), mat='screen')                # the picture, running to nobody
    for k in range(9):
        m.prism([(-0.22, 0), (0.22, 0), (0.18, 0.5), (-0.18, 0.5)], 0.08, at=(-1.76 + k * 0.44, -0.06, 3.5), rot=(90, 0, 0), mat='seat')      # the valance
    return m


def floor_mp_tile(seed):
    m = Mesh('floor')
    slab_floor(m, 'mall_dark')
    for i in range(4):
        for j in range(4):
            m.box((0.98, 0.98, 0.04), at=(-1.5 + i, -1.5 + j, -0.021), mat='mall_cream', bevel=0.004)
    for i in range(3):
        for j in range(3):
            m.box((0.3, 0.3, 0.006), at=(-1 + i, -1 + j, 0.0), rot=(0, 0, 45), mat='mall_teal')
    return m


def floor_mp_check(seed):
    m = Mesh('floor')
    slab_floor(m, 'mall_dark')
    for i in range(8):
        for j in range(8):
            m.box((0.49, 0.49, 0.04), at=(-1.75 + i * 0.5, -1.75 + j * 0.5, -0.021), mat='mall_cream' if (i + j) % 2 else 'plastic_red')
    return m


def floor_mp_carpet(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    slab_floor(m, 'mall_dark')
    m.box((C, C, 0.03), at=(0, 0, -0.016), mat='carpet_cine')
    for k in range(14):                                                        # the pattern every cinema carpet has
        x, y = rnd.uniform(-1.8, 1.8), rnd.uniform(-1.8, 1.8)
        m.box((0.34, 0.06, 0.003), at=(x, y, 0.0), rot=(0, 0, rnd.choice([30, -30, 90])), mat=rnd.choice(['plastic_yel', 'mall_teal', 'plastic_red']))
    return m


def floor_mp_arrow(seed):
    m = floor_mp_tile(seed)
    m.box((0.3, C, 0.005), at=(0, 0, 0.001), mat='mall_teal')
    for y in (-1.2, 0.2, 1.6):
        m.prism([(-0.3, 0), (0.3, 0), (0, 0.4)], 0.006, at=(0, y - 0.2, 0.002), mat='sale')
    return m


def ceil_mp_grid(seed):
    m = Mesh('ceil')
    slab_ceil(m, 'mall_dark')
    for i in range(4):
        for j in range(4):
            m.box((0.94, 0.94, 0.03), at=(-1.5 + i, -1.5 + j, 0.37), mat='mall_cream')
    for k in range(5):
        m.box((0.05, C, 0.05), at=(-2 + k, 0, 0.35), mat='chrome')
        m.box((C, 0.05, 0.05), at=(0, -2 + k, 0.35), mat='chrome')
    return m


def ceil_mp_track(seed):
    m = ceil_mp_grid(seed)
    m.box((0.06, 3.4, 0.05), at=(0, 0, 0.28), mat='mall_dark')
    for y in (-1.2, 0, 1.2):
        m.cyl(0.02, 0.14, at=(0, y, 0.2), mat='mall_dark', seg=5)
        m.cyl(0.09, 0.2, at=(0, y, 0.08), rot=(25 if y else 0, 0, 0), mat='mall_dark', seg=10, r2=0.13)
        m.cyl(0.11, 0.02, at=(0, y, -0.03), rot=(25 if y else 0, 0, 0), mat='glow_white', seg=10)
    return m


def ceil_mp_sky(seed):
    m = Mesh('ceil')
    slab_ceil(m, 'sky', 1.0)
    for k in range(5):
        m.box((0.12, C, 0.7), at=(-2 + k, 0, 0.55), mat='mall_cream')
        m.box((C, 0.12, 0.7), at=(0, -2 + k, 0.55), mat='mall_cream')
    for k in range(5):
        m.box((0.05, C, 0.05), at=(-2 + k, 0, 0.2), mat='chrome')
    return m


def ceil_mp_sign(seed):
    m = ceil_mp_grid(seed)
    for (x, mt) in ((-0.9, 'plastic_red'), (0.9, 'plastic_yel')):
        for s in (-1, 1):
            m.cyl(0.008, 0.5, at=(x + s * 0.6, 0, 0.1), mat='chrome', seg=4)
        m.box((1.4, 0.04, 0.7), at=(x, 0, -0.5), mat=mt, bevel=0.01)
        m.box((1.0, 0.05, 0.16), at=(x, 0, -0.42), mat='sale')
        m.box((0.7, 0.05, 0.1), at=(x, 0, -0.65), mat='mall_cream')
    return m


def ceil_mp_dark(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    slab_ceil(m, 'acoustic', 0.45)
    for k in range(16):
        m.cyl(0.02, 0.02, at=(rnd.uniform(-1.9, 1.9), rnd.uniform(-1.9, 1.9), 0.34), mat='glow_white', seg=5)
    return m


def door_mp_glass():
    """Automatic doors: two glass leaves in chrome, a sensor bar above."""
    fr = Mesh('frame')
    _frame(fr, 'mall_dark', 'chrome')
    fr.box((DW, 0.3, 0.2), at=(0, 0, DH - 0.1), mat='chrome', bevel=0.02)
    for f in (-1, 1):
        fr.box((0.5, 0.04, 0.06), at=(0, f * 0.16, DH - 0.1), mat='glow_green')
    objs = [fr.to_object()]
    parts = {}
    for name, s in (('leaf_l', -1), ('leaf_r', 1)):
        m = Mesh(name)
        m.box((DW / 2 - 0.02, 0.05, DH - 0.25), at=(s * DW / 4, 0, (DH - 0.25) / 2), mat='glass')
        for (z, hh) in ((0.06, 0.12), (DH - 0.3, 0.1)):
            m.box((DW / 2, 0.1, hh), at=(s * DW / 4, 0, z), mat='chrome')
        m.box((0.08, 0.1, DH - 0.25), at=(s * 0.04, 0, (DH - 0.25) / 2), mat='chrome')
        m.box((0.08, 0.1, DH - 0.25), at=(s * (DW / 2 - 0.04), 0, (DH - 0.25) / 2), mat='chrome')
        for f in (-1, 1):
            m.box((0.5, 0.02, 0.5), at=(s * DW / 4, f * 0.035, 1.5), mat='sale')              # PUSH, PULL, OPEN LATE
            m.box((0.2, 0.03, 0.12), at=(s * 0.3, f * 0.05, 1.1), mat='lock')
        objs.append(m.to_object(origin=(0, 0, 0)))
        parts[name] = dict(move=(s * (DW / 2 - 0.1), 0, 0))
    return dict(objects=objs, meta=dict(type='door', time=0.55, sound='door_slide', parts=parts))


def mp_kiosk():
    m = Mesh('mp_kiosk')
    m.prism([(-1.0, -0.6), (1.0, -0.6), (1.0, 0.6), (-1.0, 0.6)], 1.0, at=(0, 0, 0), mat='mall_cream', bevel=0.04)
    m.box((2.1, 1.3, 0.06), at=(0, 0, 1.03), mat='chrome', bevel=0.01)
    m.box((2.0, 0.03, 0.5), at=(0, -0.62, 0.55), mat='mall_teal')
    m.box((1.2, 0.035, 0.2), at=(0, -0.63, 0.55), mat='sale')
    for (x, y) in ((-0.95, -0.55), (0.95, -0.55), (-0.95, 0.55), (0.95, 0.55)):
        m.cyl(0.03, 1.3, at=(x, y, 1.7), mat='chrome', seg=6)
    m.prism([(-1.2, 0), (1.2, 0), (1.05, 0.34), (-1.05, 0.34)], 1.5, at=(0, 0.75, 2.3), rot=(90, 0, 0), mat='plastic_red', bevel=0.02)      # the awning
    for k in range(6):
        m.box((0.2, 1.52, 0.02), at=(-1.0 + k * 0.4, 0, 2.31), mat='mall_cream')
    m.box((0.5, 0.04, 0.4), at=(0.55, -0.3, 1.3), rot=(-15, 0, 0), mat='screen')
    for k in range(5):
        m.lathe([(0.06, 0), (0.07, 0.16), (0.03, 0.22)], at=(-0.8 + k * 0.22, -0.25, 1.06), mat=('plastic_yel', 'mall_teal', 'plastic_red')[k % 3], seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.1, 2.6, 1.3), light=dict(color=(1.0, 0.82, 0.3), energy=0.7, range=4.5, at=(0, -0.9, 1.6))))


def mp_vendor():
    m = Mesh('mp_vendor')
    m.box((1.1, 0.8, 2.1), at=(0, 0, 1.05), mat='plastic_red', bevel=0.04)
    m.box((0.66, 0.03, 1.2), at=(-0.14, -0.41, 1.4), mat='glow_white')
    for r in range(4):
        m.box((0.62, 0.3, 0.02), at=(-0.14, -0.25, 0.92 + r * 0.3), mat='chrome')
        for c in range(4):
            m.cyl(0.06, 0.2, at=(-0.38 + c * 0.16, -0.3, 1.04 + r * 0.3), mat=('mall_teal', 'plastic_yel', 'mall_cream', 'plastic_red')[(r + c) % 4], seg=8)
    m.box((0.2, 0.03, 0.4), at=(0.36, -0.41, 1.5), mat='screen')
    m.box((0.2, 0.04, 0.1), at=(0.36, -0.41, 1.1), mat='chrome')
    m.box((0.66, 0.06, 0.2), at=(-0.14, -0.4, 0.45), mat='mall_dark')
    m.box((1.0, 0.03, 0.22), at=(0, -0.41, 1.92), mat='sale')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.1, 2.1, 0.8), light=dict(color=(1.0, 0.95, 0.9), energy=0.6, range=3.5, at=(0, -0.8, 1.4))))


def mp_seats():
    m = Mesh('mp_seats')
    m.box((2.5, 0.6, 0.12), at=(0, 0.05, 0.06), mat='mall_dark')
    for i in range(4):
        x = -0.93 + i * 0.62
        m.box((0.54, 0.5, 0.14), at=(x, -0.02, 0.46), mat='seat', bevel=0.04)
        m.box((0.54, 0.14, 0.72), at=(x, 0.26, 0.8), rot=(-10, 0, 0), mat='seat', bevel=0.05)
        m.box((0.4, 0.3, 0.3), at=(x, 0.05, 0.24), mat='mall_dark')
    for i in range(5):
        x = -1.24 + i * 0.62
        m.box((0.07, 0.5, 0.3), at=(x, 0.0, 0.52), mat='mall_dark', bevel=0.02)
        m.cyl(0.05, 0.04, at=(x, -0.2, 0.68), mat='chrome', seg=8)                              # a cup holder each
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.5, 1.0, 0.7)))


def mp_table():
    m = Mesh('mp_table')
    m.cyl(0.5, 0.05, at=(0, 0, 0.76), mat='mall_cream', seg=18)
    m.cyl(0.52, 0.02, at=(0, 0, 0.73), mat='chrome', seg=18)
    m.cyl(0.06, 0.72, at=(0, 0, 0.37), mat='chrome', seg=8)
    m.cyl(0.3, 0.03, at=(0, 0, 0.015), mat='chrome', seg=12)
    for k in range(4):
        a = math.radians(45 + k * 90)
        x, y = 0.85 * math.cos(a), 0.85 * math.sin(a)
        m.tube([(0.2 * math.cos(a), 0.2 * math.sin(a), 0.05), (x, y, 0.08), (x, y, 0.42)], 0.03, mat='chrome', seg=6)
        m.cyl(0.2, 0.07, at=(x, y, 0.46), mat=('plastic_red', 'plastic_yel')[k % 2], seg=12)
    m.box((0.3, 0.2, 0.02), at=(0.1, 0.05, 0.8), mat='plastic_red')                             # a tray, left
    m.lathe([(0.04, 0), (0.05, 0.14)], at=(-0.15, -0.1, 0.79), mat='mall_cream', seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.0, 0.85, 1.0)))


def mp_bench():
    m = Mesh('mp_bench')
    m.box((1.0, 1.0, 0.55), at=(0, 0, 0.275), mat='mall_cream', bevel=0.04)                      # a planter in the middle
    for k in range(7):
        a = k * 0.9
        m.ball(0.3, at=(0.22 * math.cos(a), 0.22 * math.sin(a), 0.75 + 0.12 * (k % 3)), mat='leaf', seg=7, scale=(1, 1, 0.8))
    for s in (-1, 1):
        m.box((1.3, 0.6, 0.1), at=(s * 1.15, 0, 0.44), mat='mall_teal', bevel=0.03)
        m.box((0.08, 0.5, 0.4), at=(s * 1.7, 0, 0.2), mat='chrome')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(3.5, 0.8, 0.9)))


def mp_autochef():
    m = Mesh('mp_autochef')
    m.box((2.2, 0.8, 1.0), at=(0, 0, 0.5), mat='chrome', bevel=0.02)
    m.box((2.3, 0.9, 0.05), at=(0, 0, 1.02), mat='mall_dark')
    m.box((2.2, 0.3, 1.2), at=(0, 0.25, 1.65), mat='plastic_yel', bevel=0.03)
    m.box((1.9, 0.03, 0.6), at=(0, 0.09, 1.9), mat='screen')                                    # today's menu, the same as every day
    for k in range(3):
        x = -0.7 + k * 0.7
        m.box((0.5, 0.03, 0.4), at=(x, 0.09, 1.3), mat='glow_white')
        m.box((0.44, 0.2, 0.02), at=(x, -0.02, 1.12), mat='chrome')
        m.cyl(0.08, 0.03, at=(x, -0.42, 0.7), rot=(90, 0, 0), mat=('glow_green', 'glow_amber', 'glow_red')[k], seg=8)
    m.box((2.2, 0.03, 0.14), at=(0, -0.41, 0.3), mat='plastic_red')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.2, 2.2, 0.85), light=dict(color=(1.0, 0.9, 0.6), energy=0.7, range=4, at=(0, -0.7, 1.6))))


# ================================================================= THE HOSPITAL
def hs_tiles(m, x0, x1, z0, z1, size=0.25, mat='tile_white'):
    m.box((x1 - x0, 0.03, z1 - z0), at=((x0 + x1) / 2, -0.005, (z0 + z1) / 2), mat='grout')
    nx, nz = int(round((x1 - x0) / size)), int(round((z1 - z0) / size))
    w, h = (x1 - x0) / nx, (z1 - z0) / nz
    for j in range(nz):                                                     # in courses: one long piece a row keeps the count down
        m.box((x1 - x0, 0.03, h - 0.014), at=((x0 + x1) / 2, -0.03, z0 + (j + 0.5) * h), mat=mat)
    for i in range(1, nx):
        m.box((0.012, 0.012, z1 - z0), at=(x0 + i * w, -0.044, (z0 + z1) / 2), mat='grout')


def hs_base(m):
    base(m, 'grout', 'lino_dark', 'tile_white', 0.2, 0.1)


def wall_hs_tile(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    hs_base(m)
    hs_tiles(m, -2, 2, 0.2, 1.45)
    hs_tiles(m, -2, 2, 1.45, 1.7, mat='tile_teal')
    hs_tiles(m, -2, 2, 1.7, H - 0.1)
    m.box((C, 0.1, 0.1), at=(0, -0.09, 1.0), mat='steel', bevel=0.02)       # the bump rail trolleys ride along
    if seed % 2:
        m.box((0.5, 0.01, 0.34), at=(rnd.uniform(-1.3, 1.3), -0.05, rnd.uniform(0.4, 0.8)), rot=(0, rnd.uniform(-20, 20), 0), mat='stain')
    return m


def wall_hs_window(seed):
    """The theatre's observation window: a long pane, and the gallery's seats in the dark behind it."""
    m = Mesh('wall')
    hs_base(m)
    hs_tiles(m, -2, 2, 0.2, 1.2)
    hs_tiles(m, -2, 2, 3.0, H - 0.1)
    m.box((C, 0.04, 1.8), at=(0, 0.26, 2.1), mat='lino_dark')
    for k in range(5):                                                      # who is watching
        x = -1.5 + k * 0.75
        m.box((0.5, 0.06, 0.6), at=(x, 0.2, 1.6), mat='mattress', bevel=0.04)
        m.ball(0.14, at=(x, 0.16, 2.2), mat='lino_dark', seg=8) if k % 2 == 0 else None
        m.box((0.36, 0.08, 0.44), at=(x, 0.16, 1.86), mat='lino_dark', bevel=0.05) if k % 2 == 0 else None
    m.box((3.8, 0.03, 1.7), at=(0, -0.02, 2.1), mat='pane')
    for z in (1.2, 3.0):
        m.box((C, 0.16, 0.1), at=(0, -0.04, z), mat='steel', bevel=0.02)
    for x in (-1.95, 0, 1.95):
        m.box((0.08, 0.14, 1.8), at=(x, -0.03, 2.1), mat='steel')
    m.box((0.5, 0.04, 0.16), at=(1.4, -0.06, 0.95), mat='glow_red')        # ON AIR
    return m


def wall_hs_cabinet(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    hs_base(m)
    hs_tiles(m, -2, 2, 0.2, 0.9)
    hs_tiles(m, -2, 2, 3.3, H - 0.1)
    m.box((C, 0.04, 2.4), at=(0, 0.0, 2.1), mat='steel')
    m.box((3.8, 0.36, 0.9), at=(0, -0.16, 1.35), mat='tile_white', bevel=0.02)                  # the counter run
    m.box((3.9, 0.42, 0.04), at=(0, -0.18, 1.82), mat='steel')
    for i in range(4):
        m.box((0.86, 0.02, 0.8), at=(-1.4 + i * 0.94, -0.35, 1.35), mat='steel', bevel=0.01)
        m.box((0.2, 0.03, 0.03), at=(-1.4 + i * 0.94, -0.37, 1.68), mat='lino_dark')
    for i in range(3):                                                                           # glass-fronted cupboards of medicine
        x = -1.27 + i * 1.27
        m.box((1.2, 0.3, 1.2), at=(x, -0.12, 2.65), mat='tile_white', bevel=0.02)
        m.box((1.08, 0.02, 1.08), at=(x, -0.28, 2.65), mat='pane')
        for z in (2.2, 2.6, 3.0):
            m.box((1.08, 0.22, 0.015), at=(x, -0.14, z), mat='steel')
            for k in range(6):
                if rnd.random() < 0.8:
                    hh = rnd.uniform(0.1, 0.22)
                    m.cyl(rnd.uniform(0.035, 0.06), hh, at=(x - 0.44 + k * 0.176, -0.16, z + hh / 2 + 0.01), mat=rnd.choice(['pill_a', 'pill_b', 'tile_white', 'pane', 'tile_teal']), seg=7)
    m.box((0.4, 0.03, 0.24), at=(1.27, -0.3, 3.1), mat='glow_red')
    return m


def wall_hs_curtain(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    hs_base(m)
    hs_tiles(m, -2, 2, 0.2, H - 0.1, size=0.5)
    m.cyl(0.02, C, at=(0, -0.2, 3.1), rot=(0, 90, 0), mat='steel', seg=6)
    n = 16
    for k in range(n):                                                      # a drawn curtain: folds
        x = -1.9 + k * 3.8 / (n - 1)
        m.cyl(0.13, 2.7, at=(x, -0.2 + 0.05 * (k % 2), 1.72), mat='curtain', seg=6)
        m.cyl(0.015, 0.06, at=(x, -0.2, 3.1), mat='steel', seg=4)
    if seed % 2:
        m.box((0.6, 0.01, 0.5), at=(rnd.uniform(-1.0, 1.0), -0.345, 1.2), mat='stain')
    return m


def wall_hs_panel(seed):
    m = Mesh('wall')
    hs_base(m)
    hs_tiles(m, -2, 2, 0.2, H - 0.1, size=0.5)
    m.box((3.6, 0.14, 0.5), at=(0, -0.06, 1.6), mat='steel', bevel=0.02)                         # the bedhead service rail
    for k in range(6):
        m.cyl(0.05, 0.05, at=(-1.5 + k * 0.28, -0.14, 1.6), rot=(90, 0, 0), mat=('tile_teal', 'tile_white', 'pill_a')[k % 3], seg=8)
    m.box((0.7, 0.05, 0.4), at=(1.0, -0.15, 1.62), mat='screen')
    m.box((0.5, 0.2, 0.3), at=(-0.2, -0.16, 2.4), mat='tile_white', bevel=0.03)                 # a reading light on an arm
    m.box((0.4, 0.03, 0.2), at=(-0.2, -0.27, 2.36), mat='surg')
    m.box((0.3, 0.02, 0.4), at=(-1.5, -0.05, 2.5), mat='tile_white')                             # the chart
    m.box((0.3, 0.03, 0.04), at=(-1.5, -0.06, 2.7), mat='steel')
    return m


def wall_hs_light(seed):
    m = Mesh('wall')
    hs_base(m)
    hs_tiles(m, -2, 2, 0.2, H - 0.1)
    m.box((3.0, 0.12, 1.3), at=(0, -0.07, 2.2), mat='steel', bevel=0.02)
    m.box((2.8, 0.03, 1.1), at=(0, -0.13, 2.2), mat='xray')                                      # the light box
    for (x, w) in ((-0.9, 0.7), (0.0, 0.8), (0.95, 0.7)):
        m.box((w, 0.02, 0.95), at=(x, -0.15, 2.2), mat='lino_dark')
        m.ball(0.2, at=(x, -0.15, 2.3), mat='xray', seg=8, scale=(1.0, 0.08, 1.4))               # somebody's insides
        m.box((0.04, 0.025, 0.7), at=(x, -0.155, 2.1), mat='xray')
    return m


def floor_hs_lino(seed):
    m = Mesh('floor')
    slab_floor(m, 'lino_dark')
    m.box((C, C, 0.04), at=(0, 0, -0.021), mat='lino')
    for i in (-1, 1):
        m.box((0.02, C, 0.003), at=(i * 1.0, 0, 0.0), mat='lino_dark')
    m.box((C, 0.02, 0.003), at=(0, 0, 0.0), mat='lino_dark')
    return m


def floor_hs_lane(seed):
    m = floor_hs_lino(seed)
    for (x, mt) in ((-0.45, 'pill_a'), (-0.15, 'pill_b'), (0.15, 'tile_teal')):                   # follow the red line to Recovery
        m.box((0.14, C, 0.004), at=(x, 0, 0.001), mat=mt)
    return m


def floor_hs_tile(seed):
    m = Mesh('floor')
    slab_floor(m, 'grout')
    for i in range(8):
        m.box((0.48, C, 0.04), at=(-1.75 + i * 0.5, 0, -0.021), mat='tile_teal' if i % 4 == 0 else 'tile_white')
    for j in range(1, 8):
        m.box((C, 0.014, 0.004), at=(0, -2 + j * 0.5, 0.0), mat='grout')
    return m


def floor_hs_drain(seed):
    m = floor_hs_tile(seed)
    m.cyl(0.28, 0.02, at=(0, 0, 0.0), mat='steel', seg=14)
    for k in range(5):
        m.box((0.5 - abs(k - 2) * 0.12, 0.03, 0.006), at=(0, -0.16 + k * 0.08, 0.012), mat='lino_dark')
    m.prism([(-0.1, 0), (0.1, 0), (0.3, 0.9), (-0.25, 0.8)], 0.004, at=(0.1, 0.25, 0.0), mat='stain')
    return m


def ceil_hs_tile(seed):
    rnd = random.Random(seed)
    m = Mesh('ceil')
    slab_ceil(m, 'lino_dark')
    for i in range(4):
        for j in range(4):
            if rnd.random() < 0.06:
                continue                                                   # a tile gone: the dark above
            m.box((0.94, 0.94, 0.03), at=(-1.5 + i, -1.5 + j, 0.37 - (0.05 if rnd.random() < 0.08 else 0)), mat='tile_white')
    for k in range(5):
        m.box((0.05, C, 0.04), at=(-2 + k, 0, 0.35), mat='steel')
        m.box((C, 0.05, 0.04), at=(0, -2 + k, 0.35), mat='steel')
    return m


def ceil_hs_light(seed):
    m = ceil_hs_tile(seed)
    for x in (-1, 1):
        m.box((0.6, 1.9, 0.05), at=(x, 0, 0.33), mat='surg')
        m.box((0.7, 2.0, 0.03), at=(x, 0, 0.36), mat='steel')
    return m


def ceil_hs_surg(seed):
    """The theatre's lamp: a big many-eyed dish on a jointed arm, and a smaller one beside it."""
    m = ceil_hs_tile(seed)
    m.cyl(0.2, 0.1, at=(0, 0, 0.3), mat='steel', seg=12)
    m.tube([(0, 0, 0.3), (0, 0, -0.1), (0.6, 0.2, -0.3), (0.3, 0.0, -0.75)], 0.05, mat='steel', seg=6)
    m.lathe([(0.08, 0.1), (0.5, 0.06), (0.62, -0.02), (0.6, -0.06)], at=(0.3, 0, -0.8), mat='tile_white', seg=16)
    for k in range(7):
        a = k * 2 * math.pi / 6
        r = 0.36 if k < 6 else 0.0
        m.cyl(0.13, 0.02, at=(0.3 + r * math.cos(a), r * math.sin(a), -0.86), mat='surg', seg=10)
    m.tube([(0, 0, 0.1), (-0.7, -0.4, -0.1), (-0.9, -0.5, -0.5)], 0.035, mat='steel', seg=6)
    m.lathe([(0.05, 0.06), (0.26, 0.02), (0.3, -0.04)], at=(-0.9, -0.5, -0.55), mat='tile_white', seg=12)
    m.cyl(0.2, 0.02, at=(-0.9, -0.5, -0.59), mat='surg', seg=10)
    return m


def ceil_hs_rail(seed):
    m = ceil_hs_tile(seed)
    pts = [(-1.6, -1.6, 0.26), (1.6, -1.6, 0.26), (1.6, 1.6, 0.26), (-1.6, 1.6, 0.26), (-1.6, -1.6, 0.26)]
    m.tube(pts, 0.025, mat='steel', seg=5)
    for (x, y) in ((-1.6, -1.6), (1.6, 1.6), (1.6, -1.6), (-1.6, 1.6)):
        m.cyl(0.015, 0.1, at=(x, y, 0.31), mat='steel', seg=4)
    return m


def door_hs_swing():
    """Double swing doors with round windows and kick plates, the kind a gurney opens."""
    fr = Mesh('frame')
    _frame(fr, 'grout', 'steel')
    fr.box((1.0, DT + 0.2, 0.26), at=(0, 0, DH + 0.3), mat='glow_red')                           # the sign over the door
    objs = [fr.to_object()]
    parts = {}
    for name, s in (('leaf_l', -1), ('leaf_r', 1)):
        m = Mesh(name)
        w = DW / 2 - 0.02
        m.box((w, 0.08, DH), at=(-s * w / 2, 0, DH / 2), mat='tile_teal', bevel=0.01)             # modelled hinge-at-origin
        for f in (-1, 1):
            m.box((w - 0.06, 0.02, 0.8), at=(-s * w / 2, f * 0.045, 0.42), mat='steel')
            m.ring(0.24, 0.035, at=(-s * w / 2, f * 0.045, 2.2), rot=(90, 0, 0), mat='steel', seg=16, tseg=5)
            m.box((0.1, 0.03, 0.5), at=(-s * (w - 0.2), f * 0.05, 1.4), mat='steel')
            m.box((0.2, 0.03, 0.14), at=(-s * (w - 0.5), f * 0.05, 1.4), mat='lock')
        m.cyl(0.22, 0.1, at=(-s * w / 2, 0, 2.2), rot=(90, 0, 0), mat='pane', seg=14)
        ob = m.to_object(origin=(0, 0, 0))
        ob.location = (s * DW / 2, 0, 0)
        objs.append(ob)
        parts[name] = dict(rot_axis=(0, 0, 1), rot_deg=s * 88)
    return dict(objects=objs, meta=dict(type='door', time=0.6, sound='door_slide', parts=parts))


def hs_bed():
    m = Mesh('hs_bed')
    for (x, y) in ((-0.5, -1.05), (0.5, -1.05), (-0.5, 1.05), (0.5, 1.05)):
        m.cyl(0.03, 0.5, at=(x, y, 0.3), mat='steel', seg=6)
        m.cyl(0.06, 0.05, at=(x, y, 0.06), rot=(0, 90, 0), mat='rubber', seg=8)
    m.box((1.05, 2.2, 0.06), at=(0, 0, 0.55), mat='steel')
    m.box((1.0, 2.1, 0.16), at=(0, 0, 0.66), mat='mattress', bevel=0.04)
    m.box((1.02, 1.3, 0.05), at=(0, -0.38, 0.75), mat='sheet', bevel=0.02)
    m.box((0.6, 0.4, 0.12), at=(0, 0.78, 0.8), mat='sheet', bevel=0.05)                          # the pillow
    m.box((1.1, 0.05, 0.6), at=(0, 1.1, 0.85), mat='tile_white', bevel=0.02)                     # head board
    m.box((1.1, 0.05, 0.36), at=(0, -1.1, 0.72), mat='tile_white', bevel=0.02)
    for s in (-1, 1):
        m.tube([(s * 0.54, -0.5, 0.6), (s * 0.54, -0.5, 1.0), (s * 0.54, 0.6, 1.0), (s * 0.54, 0.6, 0.6)], 0.02, mat='steel', seg=5)
    m.cyl(0.02, 1.9, at=(0.62, 0.95, 0.95), mat='steel', seg=5)                                  # a drip stand
    m.box((0.14, 0.05, 0.24), at=(0.62, 0.9, 1.75), mat='pane')
    m.tube([(0.62, 0.9, 1.63), (0.5, 0.6, 1.2), (0.3, 0.3, 0.8)], 0.008, mat='pane', seg=4)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.1, 1.1, 2.2)))


def hs_table():
    m = Mesh('hs_table')
    m.box((0.7, 0.9, 0.08), at=(0, 0, 0.04), mat='steel', bevel=0.02)
    m.cyl(0.14, 0.75, at=(0, 0, 0.45), mat='steel', seg=10)
    m.box((0.75, 2.0, 0.08), at=(0, 0, 0.86), mat='steel', bevel=0.02)
    m.box((0.7, 1.3, 0.08), at=(0, -0.3, 0.93), mat='mattress', bevel=0.03)
    m.box((0.7, 0.6, 0.08), at=(0, 0.72, 0.99), rot=(12, 0, 0), mat='mattress', bevel=0.03)
    for s in (-1, 1):                                                                            # arm boards and their straps
        m.box((0.6, 0.18, 0.05), at=(s * 0.62, 0.3, 0.92), mat='mattress', bevel=0.02)
        m.box((0.1, 0.2, 0.06), at=(s * 0.7, 0.3, 0.94), mat='lino_dark')
    for y in (-0.7, -0.1):
        m.box((0.74, 0.1, 0.1), at=(0, y, 0.94), mat='lino_dark')
    m.prism([(-0.2, 0), (0.25, 0.05), (0.2, 0.5), (-0.15, 0.4)], 0.004, at=(-0.1, -0.5, 0.972), mat='stain')
    m.box((0.5, 0.36, 0.03), at=(0.75, -0.6, 0.95), mat='steel')                                 # the instrument tray
    m.cyl(0.015, 0.95, at=(0.75, -0.6, 0.47), mat='steel', seg=5)
    for k in range(5):
        m.box((0.02, 0.22, 0.01), at=(0.6 + k * 0.07, -0.6, 0.97), mat='chrome')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.3, 1.1, 2.0)))


def hs_cabinet():
    rnd = random.Random(3)
    m = Mesh('hs_cabinet')
    m.box((1.1, 0.5, 2.0), at=(0, 0, 1.0), mat='tile_white', bevel=0.02)
    m.box((0.98, 0.02, 1.1), at=(0, -0.25, 1.38), mat='pane')
    for z in (0.95, 1.3, 1.65):
        m.box((0.98, 0.4, 0.015), at=(0, -0.02, z), mat='steel')
        for k in range(5):
            hh = rnd.uniform(0.1, 0.24)
            m.cyl(rnd.uniform(0.04, 0.06), hh, at=(-0.38 + k * 0.19, -0.08, z + hh / 2 + 0.01), mat=rnd.choice(['pill_a', 'pill_b', 'pane', 'tile_teal']), seg=7)
    for s in (-1, 1):
        m.box((0.5, 0.02, 0.7), at=(s * 0.26, -0.26, 0.42), mat='steel', bevel=0.01)
        m.box((0.04, 0.03, 0.2), at=(s * 0.06, -0.28, 0.5), mat='lino_dark')
    m.box((0.3, 0.02, 0.3), at=(0, -0.265, 1.72), mat='glow_red')                                # the cross
    m.box((0.1, 0.025, 0.24), at=(0, -0.27, 1.72), mat='tile_white')
    m.box((0.24, 0.025, 0.1), at=(0, -0.27, 1.72), mat='tile_white')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.1, 2.0, 0.55)))


def hs_gurney():
    m = Mesh('hs_gurney')
    for (x, y) in ((-0.3, -0.85), (0.3, -0.85), (-0.3, 0.85), (0.3, 0.85)):
        m.cyl(0.07, 0.05, at=(x, y, 0.07), rot=(0, 90, 0), mat='rubber', seg=8)
    m.tube([(-0.3, -0.85, 0.1), (0.3, 0.85, 0.8)], 0.02, mat='steel', seg=5)
    m.tube([(0.3, -0.85, 0.1), (-0.3, 0.85, 0.8)], 0.02, mat='steel', seg=5)
    m.tube([(-0.3, 0.85, 0.1), (0.3, -0.85, 0.8)], 0.02, mat='steel', seg=5)
    m.tube([(0.3, 0.85, 0.1), (-0.3, -0.85, 0.8)], 0.02, mat='steel', seg=5)
    m.box((0.7, 1.95, 0.05), at=(0, 0, 0.82), mat='steel')
    m.box((0.66, 1.9, 0.1), at=(0, 0, 0.9), mat='mattress', bevel=0.03)
    m.box((0.68, 1.5, 0.03), at=(0, -0.15, 0.96), mat='sheet')                                   # a sheet, over something
    m.ball(0.3, at=(0, 0.1, 0.98), mat='sheet', seg=8, scale=(0.9, 2.2, 0.45))
    m.tube([(-0.33, 0.98, 0.84), (-0.33, 1.1, 1.05), (0.33, 1.1, 1.05), (0.33, 0.98, 0.84)], 0.018, mat='steel', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.8, 1.2, 2.0)))


def hs_monitor():
    m = Mesh('hs_monitor')
    for k in range(5):
        a = math.radians(k * 72)
        m.tube([(0, 0, 0.12), (0.34 * math.cos(a), 0.34 * math.sin(a), 0.05)], 0.02, mat='steel', seg=5)
    m.cyl(0.025, 1.3, at=(0, 0, 0.7), mat='steel', seg=6)
    m.box((0.5, 0.3, 0.4), at=(0, 0, 1.45), mat='tile_white', bevel=0.03)
    m.box((0.4, 0.02, 0.28), at=(0, -0.155, 1.47), mat='screen')
    m.box((0.36, 0.3, 0.2), at=(0, 0, 1.05), mat='tile_white', bevel=0.02)
    for k in range(3):
        m.cyl(0.02, 0.02, at=(-0.1 + k * 0.1, -0.155, 1.05), rot=(90, 0, 0), mat=('glow_green', 'glow_amber', 'glow_red')[k], seg=6)
    m.tube([(0.2, 0, 1.0), (0.4, -0.1, 0.6), (0.3, -0.2, 0.2)], 0.01, mat='cable', seg=4)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.7, 1.7, 0.7), light=dict(color=(0.2, 0.9, 0.7), energy=0.4, range=3, at=(0, -0.5, 1.5))))


def hs_screen():
    m = Mesh('hs_screen')
    for i in range(3):
        x = -0.8 + i * 0.8
        a = 16 if i % 2 else -16
        m.push(T(x, 0, 0) @ R(0, 0, a))
        m.box((0.76, 0.03, 1.5), at=(0, 0, 1.05), mat='curtain')
        m.tube([(-0.39, 0, 0.05), (-0.39, 0, 1.85), (0.39, 0, 1.85), (0.39, 0, 0.05)], 0.018, mat='steel', seg=5)
        for s in (-1, 1):
            m.cyl(0.04, 0.03, at=(s * 0.39, 0, 0.04), rot=(90, 0, 0), mat='rubber', seg=6)
        m.pop()
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.3, 1.9, 0.4)))


# ================================================================= THE BASILICA OF THE BLESSED BRAND
def bb_base(m):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='lime_dark')
    m.prism([(0, 0), (0.2, 0), (0.2, 0.25), (0.1, 0.4), (0, 0.4)], C, at=(-2, 0, 0), rot=(90, 0, 90), mat='lime')
    m.prism([(0, 0), (0.22, 0.14), (0.22, 0.26), (0, 0.26)], C, at=(-2, 0, H - 0.26), rot=(90, 0, 90), mat='lime')
    m.box((C, 0.04, 0.04), at=(0, -0.2, H - 0.07), mat='gold')


def bb_ashlar(m, rnd, x0, x1, z0=0.4, z1=H - 0.26):
    courses(m, rnd, x0, z0, x1, z1, h=0.56, w=1.0, mats=('lime', 'lime', 'lime_dark'), back='lime_dark', t=(0.04, 0.07), bevel=0.015)


def wall_bb_stone(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bb_base(m)
    bb_ashlar(m, rnd, -2, 2)
    for x in (-1.9, 1.9):                                                   # a clustered shaft at each end
        m.cyl(0.13, H - 0.66, at=(x, -0.1, H / 2 + 0.07), mat='lime', seg=8)
        m.lathe([(0.13, 0), (0.2, 0.12), (0.22, 0.2)], at=(x, -0.1, H - 0.48), mat='gold', seg=8)
    return m


def bb_logo(m, x, z, r, y=-0.03, seed=0):
    """The mark: a ring, a tick and a star point. Three colours, never the same way round twice."""
    c = ['logo_m', 'logo_c', 'logo_y']
    m.cyl(r, 0.012, at=(x, y, z), rot=(90, 0, 0), mat=c[seed % 3], seg=18)
    m.cyl(r * 0.62, 0.016, at=(x, y - 0.004, z), rot=(90, 0, 0), mat=c[(seed + 1) % 3], seg=14)
    m.prism([(-r * 0.4, 0), (-r * 0.1, -r * 0.34), (r * 0.5, r * 0.36), (r * 0.36, r * 0.46), (-r * 0.1, -r * 0.08), (-r * 0.28, r * 0.12)], 0.016, at=(x, y - 0.008, z), rot=(90, 0, 0), mat=c[(seed + 2) % 3])


def wall_bb_glass(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bb_base(m)
    bb_ashlar(m, rnd, -2, -1.05)
    bb_ashlar(m, rnd, 1.05, 2)
    m.box((2.1, 0.04, H - 0.66), at=(0, 0.02, H / 2 + 0.07), mat='lime_dark')
    g = gothic(1.8, 2.9)
    m.tube([(x, -0.08, z + 0.6) for (x, z) in g], 0.09, mat='lime', seg=6)
    cols = ['logo_m', 'logo_c', 'logo_y']
    for i in range(5):                                                      # panes of brand colour between the bars
        for j in range(6):
            x = -0.68 + i * 0.34
            z = 0.8 + j * 0.42
            lim = 0.88 * (1 - max(0, (z - 2.2)) / 1.35)
            if abs(x) < lim:
                m.box((0.3, 0.012, 0.38), at=(x, -0.02, z), mat=cols[(i + j * 2 + seed) % 3])
    bb_logo(m, 0, 2.05, 0.46, -0.05, seed)                                  # and the mark where a saint would be
    m.ring(0.52, 0.04, at=(0, -0.07, 2.05), rot=(90, 0, 0), mat='gold', seg=18, tseg=5)
    m.box((2.0, 0.3, 0.12), at=(0, -0.1, 0.6), mat='lime', bevel=0.03)
    return m


def wall_bb_billboard(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bb_base(m)
    bb_ashlar(m, rnd, -2, 2, 0.4, 1.0)
    m.box((C, 0.04, H - 1.26), at=(0, 0.0, 1.0 + (H - 1.26) / 2), mat='lime_dark')
    m.box((3.5, 0.14, 2.3), at=(0, -0.08, 2.3), mat='gold', bevel=0.04)     # a gilt altarpiece frame round an advertisement
    m.box((3.2, 0.03, 2.0), at=(0, -0.16, 2.3), mat='screen')
    for s in (-1, 1):
        m.lathe([(0.1, 0), (0.07, 0.3), (0.1, 2.2), (0.14, 2.3), (0.0, 2.6)], at=(s * 1.84, -0.12, 1.1), mat='gold', seg=8)
    m.prism([(-1.75, 0), (1.75, 0), (0, 0.42)], 0.1, at=(0, -0.03, 3.42), rot=(90, 0, 0), mat='gold')
    bb_logo(m, 0, 3.55, 0.12, -0.14, seed)
    return m


def wall_bb_niche(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bb_base(m)
    bb_ashlar(m, rnd, -2, -0.8)
    bb_ashlar(m, rnd, 0.8, 2)
    m.box((1.6, 0.04, H - 0.66), at=(0, 0.18, H / 2 + 0.07), mat='velvet')
    g = gothic(1.45, 2.7)
    m.tube([(x, -0.08, z + 0.75) for (x, z) in g], 0.08, mat='gold', seg=6)
    m.box((1.5, 0.4, 0.14), at=(0, -0.05, 0.75), mat='lime', bevel=0.03)
    m.box((0.5, 0.3, 0.9), at=(0, 0.0, 1.3), mat='product', bevel=0.04)     # the product, canonised
    m.box((0.5, 0.02, 0.3), at=(0, -0.155, 1.4), mat=('logo_m', 'logo_c', 'logo_y')[seed % 3])
    m.cyl(0.12, 0.14, at=(0, 0.0, 1.82), mat='gold', seg=10)
    m.ring(0.38, 0.03, at=(0, 0.02, 2.05), rot=(90, 0, 0), mat='halo', seg=20, tseg=5)
    for s in (-1, 1):
        m.cyl(0.035, 0.26, at=(s * 0.5, -0.12, 0.95), mat='product', seg=6)
        m.lathe([(0.0, 0), (0.03, 0.04), (0.0, 0.12)], at=(s * 0.5, -0.12, 1.08), mat='incense', seg=6)
    return m


def wall_bb_organ(seed):
    m = Mesh('wall')
    bb_base(m)
    m.box((C, 0.04, H - 0.66), at=(0, 0.0, H / 2 + 0.07), mat='pew')
    m.box((3.9, 0.3, 0.7), at=(0, -0.12, 0.75), mat='pew', bevel=0.03)
    n = 15
    for k in range(n):
        x = -1.75 + k * 0.25
        hh = 1.4 + 1.5 * (1 - abs(k - (n - 1) / 2) / ((n - 1) / 2)) ** 0.8
        m.cyl(0.095, hh, at=(x, -0.14, 1.1 + hh / 2), mat='chrome' if k % 2 else 'gold', seg=8)
        m.box((0.1, 0.03, 0.12), at=(x, -0.235, 1.4), mat='lime_dark')
        m.lathe([(0.095, 0), (0.0, 0.14)], at=(x, -0.14, 1.1 + hh), mat='gold', seg=8)
    m.box((3.9, 0.34, 0.06), at=(0, -0.13, 1.1), mat='gold')
    for k in range(9):
        m.box((0.3, 0.03, 0.16), at=(-1.6 + k * 0.4, -0.28, 0.8), mat=('logo_m', 'logo_c', 'logo_y')[k % 3])       # each stop is a jingle
    return m


def wall_bb_votive(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    bb_base(m)
    bb_ashlar(m, rnd, -2, 2, 2.3)
    m.box((C, 0.04, 1.9), at=(0, 0.0, 1.35), mat='lime_dark')
    for j in range(4):                                                      # tiers of little lights: each one somebody's loyalty points
        z = 0.6 + j * 0.42
        y = -0.36 + j * 0.08
        m.box((3.7, 0.16, 0.04), at=(0, y, z), mat='gold')
        for k in range(14):
            if rnd.random() < 0.8:
                x = -1.7 + k * 0.26
                m.cyl(0.05, 0.1, at=(x, y, z + 0.07), mat=('logo_m', 'logo_c', 'logo_y')[(k + j) % 3] if rnd.random() < 0.3 else 'incense', seg=6)
    m.box((3.8, 0.5, 0.4), at=(0, -0.22, 0.2), mat='lime', bevel=0.03)
    m.box((1.6, 0.03, 0.3), at=(0, -0.03, 2.5), mat='gold')
    return m


def floor_bb_flag(seed):
    m = Mesh('floor')
    slab_floor(m, 'lime_dark')
    for i in range(4):
        for j in range(4):
            m.box((0.97, 0.97, 0.04), at=(-1.5 + i, -1.5 + j, -0.021), mat='lime' if (i + j) % 2 else 'lime_dark', bevel=0.008)
    return m


def floor_bb_logo(seed):
    m = floor_bb_flag(seed)
    m.cyl(1.5, 0.012, at=(0, 0, 0.0), mat='lime', seg=28)
    m.ring(1.5, 0.03, at=(0, 0, 0.004), mat='gold', seg=28, tseg=4)
    m.cyl(1.0, 0.006, at=(0, 0, 0.008), mat='logo_m', seg=22)
    m.cyl(0.62, 0.006, at=(0, 0, 0.012), mat='logo_c', seg=18)
    m.prism([(-0.4, 0), (-0.1, -0.34), (0.5, 0.36), (0.36, 0.46), (-0.1, -0.08), (-0.28, 0.12)], 0.006, at=(0, 0, 0.016), mat='logo_y')
    return m


def floor_bb_aisle(seed):
    m = floor_bb_flag(seed)
    m.box((1.8, C, 0.02), at=(0, 0, 0.0), mat='runner')
    for s in (-1, 1):
        m.box((0.08, C, 0.004), at=(s * 0.8, 0, 0.011), mat='gold')
    return m


def ceil_bb_vault(seed):
    m = Mesh('ceil')
    slab_ceil(m, 'lime_dark', 1.3)
    n = 8
    for (sx, sy) in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        pts = [(sx * 2 * (1 - i / n), sy * 2 * (1 - i / n), 1.1 * math.sin(i / n * math.pi / 2)) for i in range(n + 1)]
        m.tube(pts, 0.09, mat='gold', seg=6)
    for (ax, s) in (('x', 1), ('x', -1), ('y', 1), ('y', -1)):
        pts = []
        for i in range(n + 1):
            t = -2 + 4 * i / n
            z = 0.7 * math.sin(i / n * math.pi)
            pts.append((t, s * 2, z) if ax == 'x' else (s * 2, t, z))
        m.tube(pts, 0.08, mat='lime', seg=6)
    for q in range(4):
        m.push(R(0, 0, q * 90))
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            z0, z1 = 1.1 * math.sin(t0 * math.pi / 2), 1.1 * math.sin(t1 * math.pi / 2)
            w0, w1 = 2 * (1 - t0), 2 * (1 - t1)
            m.prism([(-w0, 0), (w0, 0), (w1, 0.3), (-w1, 0.3)], 0.05, at=(0, -w0, z0 + 0.06), rot=(math.degrees(math.atan2(z1 - z0, w0 - w1)), 0, 0), mat='lime')
        m.pop()
    m.lathe([(0.0, 0.93), (0.24, 1.0), (0.28, 1.1), (0.1, 1.2)], mat=('logo_m', 'logo_c', 'logo_y')[seed % 3], seg=10)
    return m


def ceil_bb_halo(seed):
    m = ceil_bb_vault(seed)
    m.cyl(0.02, 1.2, at=(0, 0, 0.35), mat='gold', seg=5)
    m.ring(0.95, 0.05, at=(0, 0, -0.3), mat='halo', seg=28, tseg=6)                               # a neon halo for a chandelier
    m.ring(0.6, 0.03, at=(0, 0, -0.18), mat='logo_c', seg=22, tseg=5)
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        m.tube([(0, 0, 0.2), (0.95 * math.cos(a), 0.95 * math.sin(a), -0.3)], 0.012, mat='gold', seg=4)
    return m


def ceil_bb_banner(seed):
    m = ceil_bb_vault(seed)
    for (x, c) in ((-1.1, 'logo_m'), (1.1, 'logo_c')):
        m.cyl(0.02, 1.3, at=(x, 0, 0.3), rot=(90, 0, 0), mat='gold', seg=5)
        m.prism([(-0.5, 0), (0.5, 0), (0.5, -1.3), (0, -1.6), (-0.5, -1.3)], 0.02, at=(x, 0.01, 0.3), rot=(90, 0, 0), mat='velvet')
        m.cyl(0.26, 0.03, at=(x, 0, -0.45), rot=(90, 0, 0), mat=c, seg=14)
        m.box((0.7, 0.03, 0.05), at=(x, 0, -0.9), mat='gold')
    return m


def door_bb_gate():
    """Gilded gates under a pointed arch, the mark in the middle; they part."""
    fr = Mesh('frame')
    _frame(fr, 'lime_dark', 'lime')
    for f in (-1, 1):
        fr.tube([(x, f * (DT / 2 + 0.06), z) for (x, z) in gothic(DW + 0.3, DH + 0.55)], 0.1, mat='gold', seg=6)
        fr.cyl(0.2, 0.05, at=(0, f * (DT / 2 + 0.12), DH + 0.38), rot=(90, 0, 0), mat='halo', seg=14)
    objs = [fr.to_object()]
    parts = {}
    for name, s in (('leaf_l', -1), ('leaf_r', 1)):
        m = Mesh(name)
        m.box((DW / 2, 0.14, DH), at=(s * DW / 4, 0, DH / 2), mat='pew', bevel=0.02)
        for f in (-1, 1):
            for k in range(4):
                m.box((0.05, 0.03, DH - 0.3), at=(s * (0.2 + k * 0.3), f * 0.08, DH / 2), mat='gold')
            for z in (0.5, 1.6, 2.7):
                m.box((DW / 2 - 0.06, 0.04, 0.08), at=(s * DW / 4, f * 0.085, z), mat='gold')
            m.cyl(0.3, 0.03, at=(s * 0.32, f * 0.1, 2.15), rot=(90, 0, 0), mat=('logo_m' if s < 0 else 'logo_c'), seg=14)
            m.box((0.3, 0.05, 0.14), at=(s * 0.4, f * 0.09, 1.3), mat='lock')
        objs.append(m.to_object(origin=(0, 0, 0)))
        parts[name] = dict(move=(s * (DW / 2 - 0.06), 0, 0))
    return dict(objects=objs, meta=dict(type='door', time=1.0, sound='door_vault', parts=parts))


def bb_altar():
    m = Mesh('bb_altar')
    m.box((2.8, 1.3, 0.2), at=(0, 0, 0.1), mat='lime', bevel=0.03)
    m.box((2.4, 0.9, 0.85), at=(0, 0, 0.62), mat='lime_dark', bevel=0.03)
    m.box((2.6, 1.05, 0.1), at=(0, 0, 1.1), mat='gold', bevel=0.02)
    m.box((2.2, 0.02, 0.6), at=(0, -0.46, 0.62), mat='velvet')
    m.cyl(0.24, 0.02, at=(0, -0.475, 0.62), rot=(90, 0, 0), mat='logo_y', seg=14)
    m.box((0.5, 0.4, 0.3), at=(0, 0, 1.3), mat='pew', bevel=0.03)                                 # the till
    m.box((0.4, 0.03, 0.2), at=(0, -0.1, 1.55), rot=(-20, 0, 0), mat='screen')
    for s in (-1, 1):
        m.lathe([(0.1, 0), (0.04, 0.06), (0.03, 0.4), (0.08, 0.46)], at=(s * 0.95, 0, 1.15), mat='gold', seg=8)
        m.cyl(0.03, 0.26, at=(s * 0.95, 0, 1.74), mat='product', seg=6)
        m.lathe([(0.0, 0), (0.03, 0.04), (0.0, 0.12)], at=(s * 0.95, 0, 1.87), mat='incense', seg=6)
    m.ring(0.5, 0.035, at=(0, 0.1, 2.2), rot=(90, 0, 0), mat='halo', seg=22, tseg=5)
    m.cyl(0.02, 0.5, at=(0, 0.1, 1.5), mat='gold', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.8, 1.6, 1.3), light=dict(color=(1.0, 0.3, 0.75), energy=1.0, range=6, at=(0, -0.3, 2.2), pulse=0.2)))


def bb_pew():
    m = Mesh('bb_pew')
    m.box((2.6, 0.5, 0.08), at=(0, 0, 0.45), mat='pew', bevel=0.02)
    m.box((2.6, 0.08, 0.7), at=(0, 0.24, 0.75), rot=(-6, 0, 0), mat='pew', bevel=0.02)
    for x in (-1.3, 0, 1.3):
        m.prism([(-0.3, 0), (0.3, 0), (0.32, 0.5), (0.36, 1.1), (0.22, 1.2), (0.16, 0.6), (-0.3, 0.56)], 0.08, at=(x - 0.04, 0, 0), rot=(90, 0, 90), mat='pew', bevel=0.015)
    m.box((2.4, 0.2, 0.03), at=(0, 0.38, 0.8), mat='pew')                                         # the shelf for the catalogue
    for k in range(3):
        m.box((0.2, 0.15, 0.04), at=(-0.8 + k * 0.8, 0.38, 0.84), mat=('logo_m', 'product', 'velvet')[k])
    m.box((2.4, 0.3, 0.04), at=(0, -0.05, 0.5), mat='velvet')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.6, 1.1, 0.8)))


def bb_font():
    m = Mesh('bb_font')
    m.lathe([(0.5, 0), (0.44, 0.08), (0.18, 0.16), (0.14, 0.7), (0.3, 0.8), (0.6, 0.95), (0.62, 1.05), (0.54, 1.05), (0.5, 0.96)], mat='lime', seg=14)
    m.cyl(0.52, 0.02, at=(0, 0, 1.0), mat='logo_c', seg=16)                                       # free samples
    m.ring(0.6, 0.03, at=(0, 0, 1.05), mat='gold', seg=20, tseg=5)
    m.lathe([(0.03, 0), (0.03, 0.3), (0.1, 0.36)], at=(0, 0, 1.0), mat='gold', seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.2, 1.2, 1.2), light=dict(color=(0.1, 0.8, 1.0), energy=0.8, range=4.5, at=(0, 0, 1.4), pulse=0.15)))


def bb_pulpit():
    m = Mesh('bb_pulpit')
    m.lathe([(0.3, 0), (0.24, 0.1), (0.14, 0.2), (0.14, 0.9), (0.6, 1.2)], mat='pew', seg=8, smooth=False)
    m.lathe([(0.6, 1.2), (0.66, 1.25), (0.66, 2.1), (0.6, 2.1), (0.6, 1.3)], mat='pew', seg=8, smooth=False)
    for k in range(8):
        a = k * math.pi / 4 + math.pi / 8
        m.box((0.36, 0.02, 0.6), at=(0.63 * math.cos(a), 0.63 * math.sin(a), 1.68), rot=(0, 0, math.degrees(a) + 90), mat='gold' if k % 2 else 'velvet')
    m.box((0.5, 0.3, 0.04), at=(0, -0.6, 2.2), rot=(25, 0, 0), mat='pew')
    m.box((0.36, 0.2, 0.02), at=(0, -0.62, 2.24), rot=(25, 0, 0), mat='screen')                   # the lesson scrolls by itself
    m.tube([(0.3, -0.5, 2.1), (0.34, -0.6, 2.45), (0.2, -0.7, 2.5)], 0.012, mat='chrome', seg=4)
    m.ball(0.04, at=(0.2, -0.7, 2.5), mat='chrome', seg=6)
    m.lathe([(0.75, 3.0), (0.5, 3.12), (0.0, 3.2)], mat='gold', seg=8, smooth=False)              # the sounding board
    m.cyl(0.02, 0.9, at=(0, 0.6, 2.55), mat='gold', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.4, 3.2, 1.4)))


def bb_censer():
    m = Mesh('bb_censer')
    for k in range(3):
        a = math.radians(k * 120)
        m.tube([(0.45 * math.cos(a), 0.45 * math.sin(a), 0), (0.1 * math.cos(a), 0.1 * math.sin(a), 0.9), (0.0, 0.0, 2.0)], 0.03, mat='gold', seg=6)
    for k in range(3):
        a = math.radians(k * 120 + 60)
        m.tube([(0, 0, 1.95), (0.16 * math.cos(a), 0.16 * math.sin(a), 1.5)], 0.006, mat='gold', seg=4)
    m.lathe([(0.0, 1.1), (0.2, 1.18), (0.26, 1.36), (0.2, 1.5), (0.1, 1.56), (0.0, 1.62)], mat='gold', seg=12)
    m.cyl(0.21, 0.04, at=(0, 0, 1.4), mat='incense', seg=12)                                      # new-car smell, burning
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.9, 2.0, 0.9), light=dict(color=(1.0, 0.6, 0.2), energy=1.2, range=6, at=(0, 0, 1.5), pulse=0.3)))


def bb_reliquary():
    m = Mesh('bb_reliquary')
    m.box((0.9, 0.9, 0.2), at=(0, 0, 0.1), mat='lime', bevel=0.03)
    m.box((0.6, 0.6, 0.8), at=(0, 0, 0.6), mat='lime_dark', bevel=0.03)
    m.box((0.8, 0.8, 0.1), at=(0, 0, 1.05), mat='gold', bevel=0.02)
    m.box((0.5, 0.5, 0.02), at=(0, 0, 1.11), mat='velvet')
    m.box((0.66, 0.66, 0.7), at=(0, 0, 1.46), mat='glass')
    for (x, y) in ((-0.33, -0.33), (0.33, -0.33), (-0.33, 0.33), (0.33, 0.33)):
        m.cyl(0.025, 0.72, at=(x, y, 1.46), mat='gold', seg=5)
    m.prism([(-0.36, -0.36), (0.36, -0.36), (0.36, 0.36), (-0.36, 0.36)], 0.04, at=(0, 0, 1.81), mat='gold')
    m.lathe([(0.36, 1.85), (0.2, 2.05), (0.0, 2.3)], mat='gold', seg=4, smooth=False)
    m.box((0.3, 0.02, 0.14), at=(0, -0.31, 0.7), mat='logo_y')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.95, 2.3, 0.95)))


KITS = {
    'executive': dict(mats=EXEC_MATS,
        tiles={'wall_ex_panel': lambda: wall_ex_panel(1), 'wall_ex_panel2': lambda: wall_ex_panel(2), 'wall_ex_marble': lambda: wall_ex_marble(1), 'wall_ex_shelves': lambda: wall_ex_shelves(3),
               'wall_ex_screen': lambda: wall_ex_screen(1), 'wall_ex_sconce': lambda: wall_ex_sconce(1), 'wall_ex_art': lambda: wall_ex_art(1),
               'floor_ex_marble': lambda: floor_ex_marble(1), 'floor_ex_herring': lambda: floor_ex_herring(1), 'floor_ex_carpet': lambda: floor_ex_carpet(1), 'floor_ex_inlay': lambda: floor_ex_inlay(2),
               'ceil_ex_coffer': lambda: ceil_ex_coffer(1), 'ceil_ex_light': lambda: ceil_ex_light(1), 'ceil_ex_dome': lambda: ceil_ex_dome(1)},
        props={'door_ex_double': door_ex_double, 'ex_desk': ex_desk, 'ex_chair': ex_chair, 'ex_table': ex_table, 'ex_bar': ex_bar, 'ex_globe': ex_globe, 'ex_case': ex_case},
        meta={'ceil_ex_light': dict(light=dict(color=[1.0, 0.8, 0.5], energy=7.0, range=17, at=[0, -0.8, 0])),
              'ceil_ex_dome': dict(light=dict(color=[1.0, 0.78, 0.46], energy=7.0, range=17, at=[0, -0.5, 0])),
              'wall_ex_sconce': dict(light=dict(color=[1.0, 0.72, 0.4], energy=2.2, range=9, at=[0, 2.6, 0.7])),
              'wall_ex_screen': dict(light=dict(color=[0.2, 0.9, 0.8], energy=0.5, range=4.5, at=[0, 2.5, 0.7])),
              'wall_ex_art': dict(light=dict(color=[0.2, 0.95, 0.85], energy=0.4, range=3.5, at=[0, 2.5, 0.6]))}),
    'megaplex': dict(mats=MEGA_MATS,
        tiles={'wall_mp_tile': lambda: wall_mp_tile(1), 'wall_mp_tile2': lambda: wall_mp_tile(2), 'wall_mp_store': lambda: wall_mp_store(1), 'wall_mp_store2': lambda: wall_mp_store(5),
               'wall_mp_shutter': lambda: wall_mp_shutter(1), 'wall_mp_ad': lambda: wall_mp_ad(1), 'wall_mp_vend': lambda: wall_mp_vend(1), 'wall_mp_cinema': lambda: wall_mp_cinema(1),
               'wall_mp_screen': lambda: wall_mp_screen(1),
               'floor_mp_tile': lambda: floor_mp_tile(1), 'floor_mp_check': lambda: floor_mp_check(1), 'floor_mp_carpet': lambda: floor_mp_carpet(1), 'floor_mp_arrow': lambda: floor_mp_arrow(1),
               'ceil_mp_grid': lambda: ceil_mp_grid(1), 'ceil_mp_track': lambda: ceil_mp_track(1), 'ceil_mp_sky': lambda: ceil_mp_sky(1), 'ceil_mp_sign': lambda: ceil_mp_sign(1),
               'ceil_mp_dark': lambda: ceil_mp_dark(1)},
        props={'door_mp_glass': door_mp_glass, 'mp_kiosk': mp_kiosk, 'mp_vendor': mp_vendor, 'mp_seats': mp_seats, 'mp_table': mp_table, 'mp_bench': mp_bench, 'mp_autochef': mp_autochef},
        meta={'ceil_mp_track': dict(light=dict(color=[1.0, 0.97, 0.9], energy=2.4, range=11, at=[0, -0.4, 0])),
              'ceil_mp_sky': dict(light=dict(color=[0.75, 0.88, 1.0], energy=2.2, range=13, at=[0, 0.2, 0])),
              'ceil_mp_dark': dict(light=dict(color=[0.55, 0.5, 0.85], energy=1.1, range=10, at=[0, -0.3, 0])),
              'wall_mp_store': dict(light=dict(color=[1.0, 0.4, 0.7], energy=0.8, range=6, at=[0, 3.1, 0.8])),
              'wall_mp_store2': dict(light=dict(color=[0.3, 0.9, 1.0], energy=0.8, range=6, at=[0, 3.1, 0.8])),
              'wall_mp_ad': dict(light=dict(color=[0.2, 0.9, 0.8], energy=0.7, range=5, at=[0, 2.0, 0.8])),
              'wall_mp_vend': dict(light=dict(color=[1.0, 0.95, 0.9], energy=0.7, range=4.5, at=[0, 1.6, 0.9])),
              'wall_mp_screen': dict(light=dict(color=[0.3, 0.8, 0.8], energy=1.0, range=9, at=[0, 2.2, 1.0]))}),
    'hospital': dict(mats=HOSP_MATS,
        tiles={'wall_hs_tile': lambda: wall_hs_tile(2), 'wall_hs_tile2': lambda: wall_hs_tile(3), 'wall_hs_window': lambda: wall_hs_window(1), 'wall_hs_cabinet': lambda: wall_hs_cabinet(1),
               'wall_hs_curtain': lambda: wall_hs_curtain(1), 'wall_hs_panel': lambda: wall_hs_panel(1), 'wall_hs_light': lambda: wall_hs_light(1),
               'floor_hs_lino': lambda: floor_hs_lino(1), 'floor_hs_lane': lambda: floor_hs_lane(1), 'floor_hs_tile': lambda: floor_hs_tile(1), 'floor_hs_drain': lambda: floor_hs_drain(1),
               'ceil_hs_tile': lambda: ceil_hs_tile(1), 'ceil_hs_light': lambda: ceil_hs_light(2), 'ceil_hs_surg': lambda: ceil_hs_surg(3), 'ceil_hs_rail': lambda: ceil_hs_rail(4)},
        props={'door_hs_swing': door_hs_swing, 'hs_bed': hs_bed, 'hs_table': hs_table, 'hs_cabinet': hs_cabinet, 'hs_gurney': hs_gurney, 'hs_monitor': hs_monitor, 'hs_screen': hs_screen},
        meta={'ceil_hs_light': dict(light=dict(color=[0.92, 1.0, 0.96], energy=2.4, range=11, at=[0, -0.4, 0])),
              'ceil_hs_surg': dict(light=dict(color=[1.0, 1.0, 0.95], energy=3.4, range=10, at=[0, -1.2, 0])),
              'wall_hs_light': dict(light=dict(color=[0.7, 0.88, 1.0], energy=0.8, range=5, at=[0, 2.2, 0.7], flicker=0.1)),
              'wall_hs_window': dict(light=dict(color=[1.0, 0.15, 0.1], energy=0.3, range=3, at=[1.4, 0.95, 0.5]))}),
    'basilica': dict(mats=BASIL_MATS,
        tiles={'wall_bb_stone': lambda: wall_bb_stone(1), 'wall_bb_stone2': lambda: wall_bb_stone(6), 'wall_bb_glass': lambda: wall_bb_glass(0), 'wall_bb_glass2': lambda: wall_bb_glass(1),
               'wall_bb_billboard': lambda: wall_bb_billboard(1), 'wall_bb_niche': lambda: wall_bb_niche(2), 'wall_bb_organ': lambda: wall_bb_organ(1), 'wall_bb_votive': lambda: wall_bb_votive(1),
               'floor_bb_flag': lambda: floor_bb_flag(1), 'floor_bb_logo': lambda: floor_bb_logo(1), 'floor_bb_aisle': lambda: floor_bb_aisle(1),
               'ceil_bb_vault': lambda: ceil_bb_vault(0), 'ceil_bb_halo': lambda: ceil_bb_halo(1), 'ceil_bb_banner': lambda: ceil_bb_banner(2)},
        props={'door_bb_gate': door_bb_gate, 'bb_altar': bb_altar, 'bb_pew': bb_pew, 'bb_font': bb_font, 'bb_pulpit': bb_pulpit, 'bb_censer': bb_censer, 'bb_reliquary': bb_reliquary},
        meta={'ceil_bb_halo': dict(light=dict(color=[1.0, 0.72, 0.8], energy=3.6, range=15, at=[0, -0.8, 0], pulse=0.15)),
              'wall_bb_glass': dict(light=dict(color=[1.0, 0.3, 0.7], energy=1.0, range=7, at=[0, 2.0, 0.8])),
              'wall_bb_glass2': dict(light=dict(color=[0.2, 0.8, 1.0], energy=1.0, range=7, at=[0, 2.0, 0.8])),
              'wall_bb_billboard': dict(light=dict(color=[0.2, 0.9, 0.8], energy=0.6, range=5, at=[0, 2.3, 0.8])),
              'wall_bb_niche': dict(light=dict(color=[1.0, 0.3, 0.75], energy=0.6, range=4, at=[0, 2.0, 0.6])),
              'wall_bb_votive': dict(light=dict(color=[1.0, 0.6, 0.2], energy=1.0, range=6, at=[0, 1.4, 0.8], pulse=0.3))}),
}
