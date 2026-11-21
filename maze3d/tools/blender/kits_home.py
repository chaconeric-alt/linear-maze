"""HOME: the scavenger's own bunker (kit `home`, tag hm). Cozy brass steampunk that is still high technology: somewhere
between the Works and the Bunker, but warm. Walnut panelling under cream plaster, brass and copper pipe, gear trains
that work the doors, oxblood leather, ceramic tile floors, video screens that glow amber in wood-and-brass cabinets.
A line of warm light runs along every dado rail. Two rooms break the rule on purpose: the bathroom is white tile and
chrome, and the security room is grey armour plate round a vault door.

Rooms it is made for: bedroom, bathroom, den, living room, communications room, armoury, robot room, security room.
The second half of the furniture is the CATALOGUE: things the player buys and sets down where they like (engine/home/decorating.gd; what they cost is the catalogue in games/havenot/defs/home.json).
"""
import math, random
from mz import Mesh, T, R, S
from tiles import C, H, cable
from kits_works_bunker_crypt import _frame, DW, DH, DT

HOME_MATS = {
    'hm_wood':      dict(color=(0.30, 0.16, 0.08), metal=0.0, rough=0.55, shader='worn', grime=0.25),     # walnut
    'hm_wood_dark': dict(color=(0.14, 0.075, 0.04), metal=0.0, rough=0.5, shader='worn', grime=0.25),
    'hm_wood_pale': dict(color=(0.52, 0.36, 0.20), metal=0.0, rough=0.6, shader='worn', grime=0.25),      # oak boards
    'hm_plaster':   dict(color=(0.70, 0.62, 0.48), metal=0.0, rough=0.9, shader='worn', grime=0.3),
    'hm_brass':     dict(color=(0.72, 0.52, 0.20), metal=0.9, rough=0.3, shader='worn', grime=0.3),
    'hm_copper':    dict(color=(0.70, 0.36, 0.20), metal=0.9, rough=0.32, shader='worn', grime=0.3),
    'hm_iron':      dict(color=(0.13, 0.12, 0.12), metal=0.8, rough=0.5, shader='worn', grime=0.4),
    'hm_leather':   dict(color=(0.32, 0.08, 0.05), metal=0.0, rough=0.45, shader='worn', grime=0.2),      # oxblood
    'hm_leather2':  dict(color=(0.36, 0.20, 0.09), metal=0.0, rough=0.5, shader='worn', grime=0.2),       # tan
    'hm_cream':     dict(color=(0.82, 0.76, 0.62), metal=0.0, rough=0.25, shader='worn', grime=0.15),     # glazed ceramic
    'hm_teal':      dict(color=(0.10, 0.34, 0.33), metal=0.0, rough=0.22, shader='worn', grime=0.15),
    'hm_terra':     dict(color=(0.46, 0.24, 0.15), metal=0.0, rough=0.5, shader='worn', grime=0.2),
    'hm_white':     dict(color=(0.74, 0.76, 0.76), metal=0.0, rough=0.15, shader='worn', grime=0.08),     # the bathroom
    'hm_chrome':    dict(color=(0.80, 0.82, 0.84), metal=1.0, rough=0.12),
    'hm_steel':     dict(color=(0.36, 0.38, 0.40), metal=0.85, rough=0.45, shader='worn', grime=0.4),     # the security room
    'hm_steel_dark': dict(color=(0.16, 0.17, 0.19), metal=0.85, rough=0.5, shader='worn', grime=0.4),
    'hm_linen':     dict(color=(0.80, 0.74, 0.62), metal=0.0, rough=0.95),
    'hm_wool':      dict(color=(0.42, 0.10, 0.08), metal=0.0, rough=1.0),                                 # rugs and blankets
    'hm_wool2':     dict(color=(0.72, 0.56, 0.26), metal=0.0, rough=1.0),
    'hm_green':     dict(color=(0.12, 0.30, 0.10), metal=0.0, rough=0.8),
    'hm_book_a':    dict(color=(0.40, 0.10, 0.08), metal=0.0, rough=0.7),
    'hm_book_b':    dict(color=(0.10, 0.22, 0.30), metal=0.0, rough=0.7),
    'hm_book_c':    dict(color=(0.55, 0.42, 0.20), metal=0.0, rough=0.7),
    'hm_glow':      dict(color=(1.0, 0.72, 0.36), emit=(1.0, 0.70, 0.34), energy=3.0, shader='glow', pulse=0.04),      # lamplight
    'hm_glow_soft': dict(color=(1.0, 0.80, 0.50), emit=(1.0, 0.78, 0.48), energy=1.6, shader='glow', pulse=0.03),
    'hm_glow_cool': dict(color=(0.85, 0.95, 1.0), emit=(0.85, 0.95, 1.0), energy=1.6, shader='glow', pulse=0.02),      # the bathroom's
    'hm_glow_red':  dict(color=(1.0, 0.2, 0.1), emit=(1.0, 0.2, 0.1), energy=2.4, shader='glow', pulse=0.3),
    'hm_screen':    dict(color=(0.06, 0.03, 0.01), emit=(1.0, 0.62, 0.22), energy=1.5, shader='screen'),               # amber video
    'hm_screen_g':  dict(color=(0.01, 0.05, 0.03), emit=(0.4, 1.0, 0.5), energy=1.4, shader='screen'),                 # security green
    'hm_picture':   dict(color=(0.20, 0.30, 0.34), metal=0.0, rough=0.8),
}


# ---------------------------------------------------------------- walls (face on y=0, looking at -Y)
def gear(m, r, at, rot=(90, 0, 0), teeth=10, thick=0.06, mat='hm_brass', hub='hm_copper'):
    """A gear wheel: a disc, teeth round it, a hub. With rot=(90,0,0) it lies flat against a wall."""
    m.push(T(*at) @ R(*rot))
    m.cyl(r, thick, mat=mat, seg=max(12, teeth))
    for k in range(teeth):
        a = k * 2 * math.pi / teeth
        m.box((r * 0.32, r * 0.22, thick), at=(math.cos(a) * r * 1.04, math.sin(a) * r * 1.04, 0), rot=(0, 0, math.degrees(a)), mat=mat)
    m.cyl(r * 0.3, thick + 0.03, mat=hub, seg=8)
    for k in range(4):
        m.cyl(r * 0.13, thick + 0.01, at=(math.cos(k * math.pi / 2 + 0.6) * r * 0.62, math.sin(k * math.pi / 2 + 0.6) * r * 0.62, 0), mat='hm_iron', seg=6)
    m.pop()


def panel_base(m, upper='hm_plaster'):
    """Walnut to the dado, a brass rail with a hairline of lamplight over it, plaster above, a pipe under the cornice."""
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat=upper)
    m.box((C, 0.1, 0.22), at=(0, -0.05, 0.11), mat='hm_wood_dark', bevel=0.015)
    for i in range(4):                                   # four panels of wainscot
        x = -1.5 + i
        m.box((0.96, 0.05, 1.0), at=(x, -0.025, 0.74), mat='hm_wood', bevel=0.012)
        m.box((0.7, 0.03, 0.74), at=(x, -0.06, 0.74), mat='hm_wood_dark', bevel=0.02)
        m.box((0.56, 0.02, 0.6), at=(x, -0.078, 0.74), mat='hm_wood', bevel=0.02)
    m.box((C, 0.09, 0.09), at=(0, -0.05, 1.3), mat='hm_brass', bevel=0.015)                              # the dado rail
    m.box((C, 0.02, 0.03), at=(0, -0.08, 1.375), mat='hm_glow')                                          # and its line of light
    m.box((C, 0.14, 0.24), at=(0, -0.05, H - 0.12), mat='hm_wood_dark', bevel=0.02)                      # the cornice
    m.cyl(0.05, C, at=(0, -0.16, H - 0.34), rot=(0, 90, 0), mat='hm_copper', seg=8)
    for x in (-1.2, 0.0, 1.2):
        m.cyl(0.07, 0.07, at=(x, -0.16, H - 0.34), rot=(0, 90, 0), mat='hm_brass', seg=8)


def wall_hm_panel(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    panel_base(m)
    if seed % 2:                                         # a frieze of glazed tile under the cornice
        for i in range(10):
            m.box((0.36, 0.03, 0.36), at=(-1.8 + i * 0.4, -0.015, H - 0.66), mat='hm_teal' if i % 2 else 'hm_cream', bevel=0.012)
    else:                                                # two brass conduits and a junction between them
        for x in (-0.9, 0.9):
            m.cyl(0.035, H - 1.75, at=(x, -0.05, (1.4 + H - 0.35) / 2), mat='hm_brass', seg=6)
        m.box((0.3, 0.1, 0.3), at=(-0.9, -0.05, 2.4), mat='hm_wood_dark', bevel=0.02)
        m.cyl(0.05, 0.03, at=(-0.9, -0.11, 2.4), rot=(90, 0, 0), mat='hm_glow_soft', seg=8)
    return m


def wall_hm_pipes(seed):
    m = Mesh('wall')
    panel_base(m)
    for i, x in enumerate((-1.2, -0.85, 0.3, 0.75, 1.3)):
        r = (0.09, 0.05, 0.11, 0.05, 0.07)[i]
        m.cyl(r, H - 1.75, at=(x, -0.03 - r, (1.4 + H - 0.35) / 2), mat=('hm_copper', 'hm_brass', 'hm_copper', 'hm_brass', 'hm_iron')[i], seg=10)
        for z in (1.9, 2.9):
            m.cyl(r + 0.025, 0.07, at=(x, -0.03 - r, z + i * 0.05), mat='hm_brass', seg=10)
    for (x, z) in ((-0.35, 2.75), (-0.35, 2.15)):        # two pressure gauges
        m.cyl(0.17, 0.07, at=(x, -0.06, z), rot=(90, 0, 0), mat='hm_brass', seg=14)
        m.cyl(0.14, 0.02, at=(x, -0.1, z), rot=(90, 0, 0), mat='hm_cream', seg=14)
        m.box((0.11, 0.012, 0.014), at=(x + 0.02, -0.115, z + 0.03), rot=(0, 35, 0), mat='hm_iron')
    m.ring(0.15, 0.022, at=(0.3, -0.3, 1.75), rot=(90, 0, 0), mat='hm_iron', seg=14, tseg=5)             # a valve wheel
    m.cyl(0.03, 0.14, at=(0.3, -0.24, 1.75), rot=(90, 0, 0), mat='hm_brass', seg=6)
    return m


def wall_hm_shelf(seed):
    """Built-in bookshelves over the wainscot."""
    rnd = random.Random(seed)
    m = Mesh('wall')
    panel_base(m)
    m.box((3.5, 0.3, 2.0), at=(0, -0.1, 2.45), mat='hm_wood_dark', bevel=0.02)
    for j in range(4):
        z0 = 1.52 + j * 0.48
        m.box((3.4, 0.3, 0.04), at=(0, -0.13, z0), mat='hm_wood')
        x = -1.65
        while x < 1.55:
            if rnd.random() < 0.12:                      # a gap, or something that is not a book
                if rnd.random() < 0.5:
                    m.cyl(0.07, 0.2, at=(x + 0.12, -0.2, z0 + 0.12), mat='hm_brass', seg=8)
                x += 0.28
                continue
            w, hh = rnd.uniform(0.05, 0.11), rnd.uniform(0.26, 0.4)
            m.box((w, 0.2, hh), at=(x + w / 2, -0.19, z0 + 0.02 + hh / 2), rot=(0, rnd.choice([0, 0, 0, 6]), 0), mat=rnd.choice(['hm_book_a', 'hm_book_b', 'hm_book_c', 'hm_leather2', 'hm_wood']))
            x += w + 0.008
    return m


def wall_hm_screen(seed):
    """A video screen in a walnut and brass cabinet: amber, still on."""
    m = Mesh('wall')
    panel_base(m)
    m.box((3.0, 0.2, 2.0), at=(0, -0.1, 2.5), mat='hm_wood', bevel=0.04)
    m.box((2.5, 0.05, 1.45), at=(0, -0.2, 2.62), mat='hm_brass', bevel=0.06)
    m.box((2.3, 0.02, 1.25), at=(0, -0.23, 2.62), mat='hm_screen')
    for i in range(5):                                   # knobs
        m.cyl(0.055, 0.05, at=(-0.9 + i * 0.25, -0.22, 1.7), rot=(90, 0, 0), mat='hm_brass', seg=10)
    for i in range(6):                                   # the loudspeaker's slats
        m.box((0.7, 0.03, 0.025), at=(0.9, -0.2, 1.62 + i * 0.045), mat='hm_wood_dark')
    return m


def wall_hm_lamp(seed):
    m = Mesh('wall')
    panel_base(m)
    m.box((0.3, 0.06, 0.5), at=(0, -0.03, 2.5), mat='hm_brass', bevel=0.03)
    m.tube([(0, -0.06, 2.45), (0, -0.3, 2.45), (0, -0.34, 2.62)], 0.03, mat='hm_brass', seg=6)
    m.ball(0.17, at=(0, -0.34, 2.8), mat='hm_glow', seg=10)
    m.cyl(0.12, 0.06, at=(0, -0.34, 2.64), mat='hm_copper', seg=10)
    m.box((0.9, 0.03, 1.2), at=(-1.2, -0.02, 2.5), mat='hm_wood_dark', bevel=0.02)                       # a picture, either side
    m.box((0.76, 0.02, 1.06), at=(-1.2, -0.04, 2.5), mat='hm_picture')
    m.box((0.9, 0.03, 0.7), at=(1.2, -0.02, 2.6), mat='hm_brass', bevel=0.02)
    m.box((0.78, 0.02, 0.58), at=(1.2, -0.04, 2.6), mat='hm_picture')
    return m


def wall_hm_gears(seed):
    """The works behind the wall, under glass: this house runs on gear trains."""
    m = Mesh('wall')
    panel_base(m)
    m.box((3.0, 0.1, 2.0), at=(0, -0.0, 2.5), mat='hm_iron')
    m.box((3.2, 0.14, 0.12), at=(0, -0.07, 3.5), mat='hm_brass', bevel=0.02)
    m.box((3.2, 0.14, 0.12), at=(0, -0.07, 1.5), mat='hm_brass', bevel=0.02)
    for s in (-1, 1):
        m.box((0.12, 0.14, 2.0), at=(s * 1.55, -0.07, 2.5), mat='hm_brass', bevel=0.02)
    for (x, z, r, t) in ((-0.8, 2.7, 0.5, 14), (0.02, 2.2, 0.34, 10), (0.7, 2.75, 0.42, 12), (1.05, 2.0, 0.22, 8), (-0.9, 1.9, 0.2, 8)):
        gear(m, r, (x, -0.1, z), teeth=t, mat='hm_brass' if r > 0.3 else 'hm_copper')
    m.box((2.96, 0.02, 1.9), at=(0, -0.16, 2.5), mat='pane')
    m.box((2.6, 0.02, 0.03), at=(0, -0.07, 3.42), mat='hm_glow_soft')
    return m


def tile_base(m):
    """The bathroom: white glazed tile floor to ceiling, a teal band at the dado, a chrome rail."""
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='hm_cream')
    n = 8
    for i in range(n):
        for j in range(8):
            z = 0.25 + j * 0.46
            m.box((0.47, 0.03, 0.43), at=(-2 + (i + 0.5) * 0.5, -0.015, z + 0.215), mat='hm_teal' if j == 2 else 'hm_white', bevel=0.012)
    m.box((C, 0.08, 0.22), at=(0, -0.04, 0.11), mat='hm_white', bevel=0.02)
    m.cyl(0.025, C, at=(0, -0.09, 1.45), rot=(0, 90, 0), mat='hm_chrome', seg=8)
    m.box((C, 0.06, 0.08), at=(0, -0.03, H - 0.04), mat='hm_chrome')
    m.box((C, 0.02, 0.03), at=(0, -0.045, H - 0.11), mat='hm_glow_cool')


def wall_hm_tile(seed):
    m = Mesh('wall')
    tile_base(m)
    if seed % 2 == 0:                                    # a mirrored cabinet with a bar of light over it
        m.box((1.5, 0.16, 1.1), at=(0, -0.08, 2.3), mat='hm_white', bevel=0.03)
        m.box((1.36, 0.02, 0.96), at=(0, -0.17, 2.3), mat='mirror')
        m.box((1.5, 0.08, 0.1), at=(0, -0.1, 3.0), mat='hm_chrome', bevel=0.02)
        m.box((1.3, 0.03, 0.05), at=(0, -0.145, 3.0), mat='hm_glow_cool')
    else:                                                # a heated towel rail and a small status panel
        for z in (1.8, 2.1, 2.4):
            m.cyl(0.025, 1.2, at=(-0.7, -0.12, z), rot=(0, 90, 0), mat='hm_chrome', seg=6)
        m.box((0.9, 0.04, 0.5), at=(-0.7, -0.14, 2.0), rot=(8, 0, 0), mat='hm_linen')
        m.box((0.4, 0.05, 0.3), at=(1.2, -0.03, 1.9), mat='hm_chrome', bevel=0.02)
        m.box((0.3, 0.02, 0.2), at=(1.2, -0.06, 1.9), mat='hm_screen')
    return m


def wall_hm_steel(seed):
    """The security room: grey armour plate, riveted; nothing ornamental."""
    rnd = random.Random(seed)
    m = Mesh('wall')
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='hm_steel_dark')
    for i in range(2):
        for j in range(3):
            w, hh = 1.94, (H - 0.1) / 3 - 0.06
            cx, cz = -1.0 + i * 2.0, 0.05 + (j + 0.5) * (H - 0.1) / 3
            m.box((w, 0.07, hh), at=(cx, -0.035, cz), mat='hm_steel', bevel=0.02)
            for sx in (-1, 1):
                for sz in (-1, 1):
                    m.cyl(0.03, 0.03, at=(cx + sx * (w / 2 - 0.1), -0.08, cz + sz * (hh / 2 - 0.1)), rot=(90, 0, 0), mat='hm_steel_dark', seg=6)
    for k in range(10):
        m.box((0.22, 0.012, 0.12), at=(-1.8 + k * 0.4, -0.078, 0.2), rot=(0, 30, 0), mat='hazard')
    if seed % 2 == 0:                                    # a bank of security monitors and a keypad
        m.box((2.6, 0.16, 1.3), at=(0, -0.08, 2.3), mat='hm_steel_dark', bevel=0.03)
        for i in range(3):
            m.box((0.74, 0.02, 0.5), at=(-0.84 + i * 0.84, -0.17, 2.56), mat='hm_screen_g')
            m.box((0.74, 0.02, 0.4), at=(-0.84 + i * 0.84, -0.17, 1.98), mat='hm_screen_g' if i != 1 else 'screen_dead')
        m.box((0.3, 0.08, 0.44), at=(1.65, -0.04, 1.5), mat='hm_steel', bevel=0.02)
        m.cyl(0.03, 0.02, at=(1.65, -0.09, 1.64), rot=(90, 0, 0), mat='hm_glow_red', seg=8)
    else:
        m.cyl(0.14, 0.2, at=(0.9, -0.14, 3.3), rot=(90, 0, 0), mat='hm_steel_dark', seg=10)                # a camera
        m.cyl(0.07, 0.03, at=(0.9, -0.25, 3.3), rot=(90, 0, 0), mat='hm_glow_red', seg=8)
    return m


# ---------------------------------------------------------------- floors (top at z=0)
def _fl(m, mat='hm_iron'):
    m.box((C, C, 0.2), at=(0, 0, -0.13), mat=mat)


def floor_hm_tile(seed):
    """Glazed ceramic: cream and teal chequers (1), or terracotta with small cream insets (2)."""
    m = Mesh('floor')
    _fl(m, 'hm_wood_dark')
    if seed == 1:
        for i in range(8):
            for j in range(8):
                m.box((0.47, 0.47, 0.03), at=(-1.75 + i * 0.5, -1.75 + j * 0.5, -0.015), mat='hm_cream' if (i + j) % 2 else 'hm_teal', bevel=0.008)
    else:
        for i in range(4):
            for j in range(4):
                m.box((0.96, 0.96, 0.03), at=(-1.5 + i, -1.5 + j, -0.015), mat='hm_terra', bevel=0.012)
        for i in range(5):
            for j in range(5):
                m.box((0.2, 0.2, 0.012), at=(-2 + i, -2 + j, 0.002), rot=(0, 0, 45), mat='hm_cream')
    return m


def floor_hm_wood(seed):
    """Oak boards. With seed 2, a rug on them."""
    rnd = random.Random(seed)
    m = Mesh('floor')
    _fl(m, 'hm_wood_dark')
    for i in range(10):
        y0 = -2.0
        while y0 < 2.0:
            ln = min(rnd.uniform(1.0, 2.4), 2.0 - y0)
            m.box((0.385, ln - 0.012, 0.03), at=(-1.8 + i * 0.4, y0 + ln / 2, -0.015), mat='hm_wood_pale' if rnd.random() < 0.93 else 'hm_wood', bevel=0.006)
            y0 += ln
    if seed == 2:
        m.box((3.0, 3.0, 0.02), at=(0, 0, 0.01), mat='hm_wool', bevel=0.008)
        m.box((2.6, 2.6, 0.006), at=(0, 0, 0.023), mat='hm_wool2')
        m.box((2.3, 2.3, 0.006), at=(0, 0, 0.029), mat='hm_wool')
        m.box((0.8, 0.8, 0.006), at=(0, 0, 0.035), rot=(0, 0, 45), mat='hm_wool2')
    return m


def floor_hm_white(seed):
    m = Mesh('floor')
    _fl(m, 'hm_cream')
    for i in range(10):
        for j in range(10):
            m.box((0.38, 0.38, 0.03), at=(-1.8 + i * 0.4, -1.8 + j * 0.4, -0.015), mat='hm_teal' if (i in (0, 9) or j in (0, 9)) and (i + j) % 2 else 'hm_white', bevel=0.008)
    if seed == 2:
        m.cyl(0.14, 0.012, at=(0, 0, 0.002), mat='hm_chrome', seg=12)
    return m


def floor_hm_steel(seed):
    m = Mesh('floor')
    _fl(m, 'hm_steel_dark')
    for i in range(2):
        for j in range(2):
            m.box((1.96, 1.96, 0.03), at=(-1 + i * 2, -1 + j * 2, -0.015), mat='hm_steel', bevel=0.012)
            for sx in (-1, 1):
                for sy in (-1, 1):
                    m.cyl(0.035, 0.012, at=(-1 + i * 2 + sx * 0.85, -1 + j * 2 + sy * 0.85, 0.003), mat='hm_steel_dark', seg=6)
    if seed == 2:
        for k in range(8):
            m.box((0.3, 0.14, 0.008), at=(-1.75 + k * 0.5, 1.8, 0.004), rot=(0, 0, 35), mat='hazard')
    return m


# ---------------------------------------------------------------- ceilings (underside at z=0, detail up, lamps hang below)
def ceil_hm_beam(seed):
    """Plaster between walnut beams. With seed 2 a brass pendant lamp hangs from the middle one."""
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.4), mat='hm_plaster')
    m.box((C, C, 0.04), at=(0, 0, 0.28), mat='hm_plaster')
    for x in (-1.5, 0, 1.5):
        m.box((0.3, C, 0.28), at=(x, 0, 0.14), mat='hm_wood_dark', bevel=0.02)
    m.cyl(0.04, C, at=(0.75, 0, 0.2), rot=(90, 0, 0), mat='hm_copper', seg=6)
    if seed == 2:
        m.cyl(0.02, 0.5, at=(0, 0, -0.25), mat='hm_brass', seg=6)
        m.cyl(0.42, 0.14, at=(0, 0, -0.5), mat='hm_brass', seg=14, r2=0.16)
        m.ball(0.2, at=(0, 0, -0.62), mat='hm_glow', seg=10)
    return m


def ceil_hm_tin(seed):
    """Pressed panels in a walnut grid."""
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.4), mat='hm_wood_dark')
    for i in range(4):
        for j in range(4):
            m.box((0.9, 0.9, 0.06), at=(-1.5 + i, -1.5 + j, 0.27), mat='hm_plaster', bevel=0.03)
            m.box((0.5, 0.5, 0.04), at=(-1.5 + i, -1.5 + j, 0.23), mat='hm_cream', bevel=0.03)
    for k in range(5):
        m.box((0.1, C, 0.1), at=(-2 + k, 0, 0.25), mat='hm_wood')
        m.box((C, 0.1, 0.1), at=(0, -2 + k, 0.25), mat='hm_wood')
    if seed == 2:                                        # a brass pendant from the middle of the grid
        m.cyl(0.02, 0.6, at=(0, 0, -0.1), mat='hm_brass', seg=6)
        m.cyl(0.42, 0.14, at=(0, 0, -0.4), mat='hm_brass', seg=14, r2=0.16)
        m.ball(0.2, at=(0, 0, -0.52), mat='hm_glow', seg=10)
    return m


def ceil_hm_white(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.4), mat='hm_white')
    m.box((C, C, 0.04), at=(0, 0, 0.28), mat='hm_white')
    if seed == 2:
        m.box((1.6, 1.6, 0.1), at=(0, 0, 0.22), mat='hm_chrome', bevel=0.03)
        m.box((1.4, 1.4, 0.04), at=(0, 0, 0.16), mat='hm_glow_cool')
    else:
        m.cyl(0.25, 0.08, at=(1.0, 1.0, 0.22), mat='hm_chrome', seg=12)                                    # an extractor
    return m


def ceil_hm_steel(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.4), mat='hm_steel_dark')
    for i in range(2):
        for j in range(2):
            m.box((1.94, 1.94, 0.06), at=(-1 + i * 2, -1 + j * 2, 0.27), mat='hm_steel', bevel=0.02)
    m.box((0.2, C, 0.2), at=(0, 0, 0.16), mat='hm_steel_dark', bevel=0.02)
    if seed == 2:                                        # a caged lamp
        m.cyl(0.2, 0.3, at=(0, 0, -0.05), mat='hm_glow_soft', seg=10)
        for k in range(6):
            a = k * math.pi / 3
            m.cyl(0.012, 0.36, at=(0.24 * math.cos(a), 0.24 * math.sin(a), -0.05), mat='hm_steel_dark', seg=4)
        m.ring(0.24, 0.015, at=(0, 0, -0.22), mat='hm_steel_dark', seg=12, tseg=4)
    return m


# ---------------------------------------------------------------- doors
def door_hm_gear():
    """Two walnut leaves under a lintel of gears. The gears turn as the leaves draw apart."""
    fr = Mesh('frame')
    _frame(fr, 'hm_wood_dark', 'hm_brass')
    for f in (-1, 1):
        fr.box((C - 0.2, 0.05, H - DH - 0.3), at=(0, f * (DT / 2 + 0.02), DH + (H - DH) / 2 + 0.06), mat='hm_iron')
    objs = [fr.to_object()]
    parts = {}
    gi = 0
    for f in (-1, 1):                                    # a train of three on each face of the wall
        for (x, r, t, turn) in ((-0.75, 0.3, 10, 300), (-0.15, 0.24, 8, -375), (0.55, 0.36, 12, 250)):
            g = Mesh('gear%d' % gi)
            gear(g, r, (x, f * (DT / 2 + 0.09), DH + 0.42), teeth=t, mat='hm_brass' if gi % 2 == 0 else 'hm_copper')
            objs.append(g.to_object(origin=(x, f * (DT / 2 + 0.09), DH + 0.42)))
            parts['gear%d' % gi] = dict(rot_axis=(0, 1, 0), rot_deg=turn * f)
            gi += 1
    for name, s in (('leaf_l', -1), ('leaf_r', 1)):
        m = Mesh(name)
        m.box((DW / 2, 0.16, DH), at=(s * DW / 4, 0, DH / 2), mat='hm_wood', bevel=0.02)
        for f in (-1, 1):
            for (z, hh) in ((0.85, 1.2), (2.35, 1.3)):
                m.box((DW / 2 - 0.3, 0.04, hh), at=(s * DW / 4, f * 0.09, z), mat='hm_wood_dark', bevel=0.02)
                m.box((DW / 2 - 0.5, 0.02, hh - 0.2), at=(s * DW / 4, f * 0.115, z), mat='hm_leather')
            m.box((DW / 2, 0.02, 0.08), at=(s * DW / 4, f * 0.085, 1.56), mat='hm_brass')
            m.cyl(0.06, 0.05, at=(s * 0.2, f * 0.11, 1.56), rot=(90, 0, 0), mat='hm_brass', seg=8)
        m.box((0.03, 0.18, DH), at=(s * 0.015, 0, DH / 2), mat='hm_brass')
        objs.append(m.to_object(origin=(0, 0, 0)))
        parts[name] = dict(move=(s * (DW / 2 - 0.06), 0, 0))
    return dict(objects=objs, meta=dict(type='door', time=0.9, sound='door_heavy', parts=parts))


def door_hm_vault():
    """The security door: half a metre of grey steel on a rack, with a locking wheel. It rolls aside, slowly."""
    fr = Mesh('frame')
    _frame(fr, 'hm_steel_dark', 'hm_steel')
    for f in (-1, 1):
        fr.box((C, 0.06, 0.16), at=(0, f * (DT / 2 + 0.05), DH + 0.42), mat='hm_steel')                    # the rack it runs on
        for k in range(16):
            fr.box((0.1, 0.07, 0.06), at=(-1.9 + k * 0.25, f * (DT / 2 + 0.05), DH + 0.31), mat='hm_steel_dark')
        for k in range(8):
            fr.box((0.25, 0.02, 0.12), at=(-1.8 + k * 0.5, f * (DT / 2 + 0.012), 0.12), rot=(0, 30, 0), mat='hazard')
        fr.cyl(0.07, 0.04, at=(1.7, f * (DT / 2 + 0.03), 2.2), rot=(90, 0, 0), mat='hm_glow_red', seg=8)
    objs = [fr.to_object()]
    m = Mesh('slab')
    m.box((DW + 0.2, 0.5, DH + 0.1), at=(0, 0, DH / 2), mat='hm_steel', bevel=0.05)
    for f in (-1, 1):
        m.box((DW - 0.4, 0.05, DH - 0.5), at=(0, f * 0.26, DH / 2), mat='hm_steel_dark', bevel=0.03)
        m.ring(0.5, 0.05, at=(0, f * 0.34, 1.6), rot=(90, 0, 0), mat='hm_steel', seg=20, tseg=6)
        for k in range(3):
            m.box((1.0, 0.04, 0.07), at=(0, f * 0.34, 1.6), rot=(0, k * 60, 0), mat='hm_steel')
        m.cyl(0.14, 0.16, at=(0, f * 0.3, 1.6), rot=(90, 0, 0), mat='hm_brass', seg=10)
        for (x, z) in ((-0.9, 0.5), (0.9, 0.5), (-0.9, 2.8), (0.9, 2.8)):
            m.cyl(0.09, 0.1, at=(x, f * 0.28, z), rot=(90, 0, 0), mat='hm_steel_dark', seg=8)
        m.box((0.8, 0.02, 0.2), at=(0, f * 0.29, 2.7), mat='hazard')
    objs.append(m.to_object(origin=(0, 0, 0)))
    wheel = Mesh('wheel')
    gear(wheel, 0.3, (-1.5, -(DT / 2 + 0.14), DH + 0.42), teeth=10, mat='hm_steel', hub='hm_brass')
    objs.append(wheel.to_object(origin=(-1.5, -(DT / 2 + 0.14), DH + 0.42)))
    return dict(objects=objs, meta=dict(type='door', time=2.4, sound='door_heavy',
                                         parts={'slab': dict(move=(DW + 0.1, 0, 0)), 'wheel': dict(rot_axis=(0, 1, 0), rot_deg=-720)}))


# ---------------------------------------------------------------- furniture (stands at the origin, front at -Y)
def P(m, name, solid, **meta):
    return dict(objects=[m.to_object()], meta=dict(type='prop', name=name, solid=solid, **meta))


def LAMP(at, energy=0.9, rng=5.0, color=(1.0, 0.72, 0.4)):
    return dict(color=color, energy=energy, range=rng, at=at)


def hm_bed():
    m = Mesh('hm_bed')
    m.box((1.7, 2.2, 0.3), at=(0, 0, 0.3), mat='hm_wood', bevel=0.03)
    for (x, y) in ((-0.78, -1.02), (0.78, -1.02), (-0.78, 1.02), (0.78, 1.02)):
        m.cyl(0.06, 0.2, at=(x, y, 0.1), mat='hm_brass', seg=8)
    m.box((1.6, 2.1, 0.22), at=(0, 0, 0.56), mat='hm_linen', bevel=0.06)
    m.box((1.62, 1.3, 0.1), at=(0, -0.42, 0.66), mat='hm_wool', bevel=0.04)                                # the blanket
    m.box((1.62, 0.2, 0.11), at=(0, 0.3, 0.665), mat='hm_wool2', bevel=0.03)
    for s in (-1, 1):
        m.box((0.62, 0.4, 0.14), at=(s * 0.4, 0.78, 0.72), mat='hm_linen', bevel=0.06)
    m.box((1.8, 0.12, 1.3), at=(0, 1.1, 0.75), mat='hm_wood_dark', bevel=0.04)                             # the headboard: leather, brass studs
    m.box((1.5, 0.04, 0.7), at=(0, 1.03, 0.95), mat='hm_leather', bevel=0.04)
    for i in range(6):
        m.cyl(0.03, 0.03, at=(-0.65 + i * 0.26, 1.0, 1.24), rot=(90, 0, 0), mat='hm_brass', seg=6)
    m.cyl(0.04, 0.5, at=(0.86, 1.1, 1.6), mat='hm_brass', seg=6)                                           # a reading lamp on the post
    m.cyl(0.14, 0.16, at=(0.86, 0.98, 1.84), rot=(60, 0, 0), mat='hm_copper', seg=10, r2=0.06)
    m.ball(0.07, at=(0.86, 0.93, 1.8), mat='hm_glow_soft', seg=8)
    return P(m, 'Bed', (1.8, 1.45, 2.3), light=LAMP((0.86, 0.7, 1.7), 0.6, 4.0))


def hm_dresser():
    m = Mesh('hm_dresser')
    m.box((1.5, 0.6, 1.1), at=(0, 0, 0.6), mat='hm_wood', bevel=0.03)
    for (x, y) in ((-0.68, -0.24), (0.68, -0.24), (-0.68, 0.24), (0.68, 0.24)):
        m.box((0.08, 0.08, 0.1), at=(x, y, 0.05), mat='hm_brass')
    for j in range(3):
        m.box((1.36, 0.04, 0.3), at=(0, -0.31, 0.25 + j * 0.34), mat='hm_wood_dark', bevel=0.015)
        for s in (-1, 1):
            m.ring(0.05, 0.012, at=(s * 0.35, -0.35, 0.25 + j * 0.34), rot=(90, 0, 0), mat='hm_brass', seg=10, tseg=4)
    m.box((1.56, 0.66, 0.05), at=(0, 0, 1.17), mat='hm_wood_dark', bevel=0.015)
    m.box((0.9, 0.05, 0.9), at=(0, 0.26, 1.7), mat='hm_brass', bevel=0.08)                                 # the glass
    m.box((0.78, 0.02, 0.78), at=(0, 0.23, 1.7), mat='mirror')
    m.box((0.3, 0.2, 0.12), at=(-0.45, -0.05, 1.26), mat='hm_leather', bevel=0.02)
    m.cyl(0.05, 0.2, at=(0.5, 0.0, 1.3), mat='hm_glow_soft', seg=8)
    return P(m, 'Dresser', (1.56, 2.2, 0.66))


def hm_toilet():
    """High technology, white: a pedestal, a tank with a status strip, a control arm."""
    m = Mesh('hm_toilet')
    m.box((0.5, 0.3, 0.9), at=(0, 0.3, 0.75), mat='hm_white', bevel=0.06)                                  # the tank
    m.box((0.36, 0.02, 0.05), at=(0, 0.14, 1.05), mat='hm_glow_cool')
    m.lathe([(0.2, 0.0), (0.24, 0.05), (0.18, 0.2), (0.24, 0.42), (0.26, 0.46), (0.2, 0.46)], at=(0, -0.12, 0), mat='hm_white', seg=14)
    m.cyl(0.25, 0.04, at=(0, -0.12, 0.48), mat='hm_white', seg=14)
    m.cyl(0.27, 0.035, at=(0, 0.1, 0.72), rot=(78, 0, 0), mat='hm_white', seg=14)                          # the lid, up
    m.box((0.08, 0.34, 0.05), at=(0.34, -0.1, 0.56), mat='hm_chrome', bevel=0.02)                          # the control arm
    for k in range(3):
        m.cyl(0.018, 0.012, at=(0.34, -0.2 + k * 0.08, 0.59), mat=('hm_glow_cool', 'hm_glow', 'hm_chrome')[k], seg=6)
    return P(m, 'Toilet', (0.7, 1.2, 0.8))


def hm_shower():
    m = Mesh('hm_shower')
    m.box((1.3, 1.3, 0.12), at=(0, 0, 0.06), mat='hm_white', bevel=0.03)
    m.cyl(0.07, 0.01, at=(0, 0, 0.125), mat='hm_chrome', seg=8)
    m.box((1.3, 0.1, 2.5), at=(0, 0.6, 1.3), mat='hm_white', bevel=0.02)                                   # the wet wall
    m.box((0.5, 0.03, 0.26), at=(0, 0.54, 1.35), mat='hm_chrome', bevel=0.02)
    m.box((0.36, 0.02, 0.14), at=(0, 0.52, 1.37), mat='hm_screen')
    m.cyl(0.025, 0.8, at=(0, 0.5, 2.2), mat='hm_chrome', seg=6)
    m.cyl(0.24, 0.05, at=(0, 0.2, 2.56), mat='hm_chrome', seg=14)                                          # the rose
    m.tube([(0, 0.5, 2.56), (0, 0.2, 2.6)], 0.025, mat='hm_chrome', seg=6)
    m.box((0.03, 1.2, 2.3), at=(0.64, 0, 1.27), mat='glass')
    m.box((0.03, 1.2, 2.3), at=(-0.64, 0, 1.27), mat='glass')
    for s in (-1, 1):
        m.box((0.05, 0.05, 2.4), at=(s * 0.64, -0.6, 1.3), mat='hm_chrome')
    m.box((1.3, 0.05, 0.05), at=(0, -0.6, 2.5), mat='hm_chrome')
    m.box((1.2, 0.02, 0.04), at=(0, 0.53, 2.44), mat='hm_glow_cool')
    return P(m, 'Shower', (1.35, 2.6, 1.35), solids=[[0, 1.3, 0.6, 1.3, 2.5, 0.12], [0.64, 1.3, 0, 0.06, 2.4, 1.2], [-0.64, 1.3, 0, 0.06, 2.4, 1.2]])


def hm_sink():
    m = Mesh('hm_sink')
    m.box((1.0, 0.5, 0.75), at=(0, 0.05, 0.42), mat='hm_white', bevel=0.04)
    m.box((1.1, 0.6, 0.08), at=(0, 0, 0.86), mat='hm_cream', bevel=0.02)
    m.cyl(0.24, 0.05, at=(0, -0.02, 0.89), mat='hm_white', seg=14)
    m.cyl(0.2, 0.02, at=(0, -0.02, 0.915), mat='hm_chrome', seg=14)
    m.tube([(0, 0.2, 0.9), (0, 0.2, 1.15), (0, 0.02, 1.12)], 0.022, mat='hm_chrome', seg=6)
    m.box((0.9, 0.03, 0.2), at=(0, -0.21, 0.5), mat='hm_chrome', bevel=0.01)
    return P(m, 'Basin', (1.1, 1.2, 0.6))


def hm_bookcase():
    rnd = random.Random(5)
    m = Mesh('hm_bookcase')
    m.box((1.8, 0.45, 2.4), at=(0, 0.05, 1.2), mat='hm_wood_dark', bevel=0.03)
    m.box((1.9, 0.5, 0.1), at=(0, 0.04, 2.43), mat='hm_wood', bevel=0.03)
    for j in range(5):
        z0 = 0.16 + j * 0.45
        m.box((1.66, 0.42, 0.04), at=(0, -0.02, z0), mat='hm_wood')
        x = -0.8
        while x < 0.72:
            if rnd.random() < 0.1:
                x += 0.25
                continue
            w, hh = rnd.uniform(0.05, 0.1), rnd.uniform(0.26, 0.38)
            m.box((w, 0.26, hh), at=(x + w / 2, -0.08, z0 + 0.02 + hh / 2), mat=rnd.choice(['hm_book_a', 'hm_book_b', 'hm_book_c', 'hm_leather2']))
            x += w + 0.008
    return P(m, 'Bookcase', (1.9, 2.5, 0.55))


def hm_desk():
    """A partner's desk: leather top, a brass lamp, an amber terminal let into it."""
    m = Mesh('hm_desk')
    for s in (-1, 1):
        m.box((0.55, 0.8, 0.74), at=(s * 0.68, 0, 0.37), mat='hm_wood', bevel=0.02)
        for j in range(3):
            m.box((0.45, 0.03, 0.2), at=(s * 0.68, -0.405, 0.14 + j * 0.23), mat='hm_wood_dark', bevel=0.012)
            m.cyl(0.02, 0.03, at=(s * 0.68, -0.43, 0.14 + j * 0.23), rot=(90, 0, 0), mat='hm_brass', seg=6)
    m.box((2.0, 0.95, 0.07), at=(0, 0, 0.78), mat='hm_wood_dark', bevel=0.02)
    m.box((1.6, 0.6, 0.012), at=(0, -0.08, 0.818), mat='hm_leather')
    m.box((0.6, 0.3, 0.4), at=(-0.5, 0.26, 1.02), rot=(-10, 0, 0), mat='hm_wood', bevel=0.04)              # the terminal
    m.box((0.48, 0.02, 0.3), at=(-0.5, 0.1, 1.04), rot=(-10, 0, 0), mat='hm_screen')
    m.cyl(0.1, 0.03, at=(0.6, 0.25, 0.83), mat='hm_brass', seg=10)                                         # the lamp
    m.tube([(0.6, 0.25, 0.83), (0.6, 0.28, 1.2), (0.5, 0.05, 1.3)], 0.018, mat='hm_brass', seg=6)
    m.cyl(0.13, 0.12, at=(0.5, 0.05, 1.26), mat='hm_green', seg=10, r2=0.07)
    m.ball(0.05, at=(0.5, 0.05, 1.22), mat='hm_glow_soft', seg=6)
    m.box((0.3, 0.22, 0.05), at=(0.1, -0.15, 0.85), rot=(0, 0, 12), mat='hm_book_a')
    return P(m, 'Desk', (2.0, 1.4, 0.95), light=LAMP((0.4, -0.2, 1.2), 0.7, 4.0))


def hm_trophy():
    """A trophy case: walnut, brass and glass, three shelves. What you bring home goes in it."""
    m = Mesh('hm_trophy')
    m.box((1.7, 0.6, 0.6), at=(0, 0, 0.3), mat='hm_wood', bevel=0.03)
    m.box((1.5, 0.03, 0.4), at=(0, -0.3, 0.3), mat='hm_wood_dark', bevel=0.02)
    m.box((1.7, 0.08, 1.6), at=(0, 0.26, 1.4), mat='hm_wood_dark')
    slots = []
    for j in range(3):
        z = 0.62 + j * 0.5
        m.box((1.6, 0.5, 0.03), at=(0, 0, z), mat='hm_wood' if j == 0 else 'glass')
        for i in range(3):
            slots.append([-0.5 + i * 0.5, z + 0.02, 0.0])
    for s in (-1, 1):
        m.box((0.06, 0.6, 1.6), at=(s * 0.82, 0, 1.4), mat='hm_brass')
    m.box((1.7, 0.6, 0.08), at=(0, 0, 2.22), mat='hm_wood', bevel=0.02)
    m.box((1.58, 0.02, 1.56), at=(0, -0.29, 1.4), mat='glass')
    m.box((1.5, 0.03, 0.04), at=(0, -0.2, 2.16), mat='hm_glow_soft')
    return P(m, 'Trophy Case', (1.7, 2.3, 0.62), slots=slots, holds='trophy', light=LAMP((0, -0.5, 1.6), 0.5, 3.0))


def hm_sofa():
    m = Mesh('hm_sofa')
    m.box((2.4, 0.95, 0.3), at=(0, 0, 0.3), mat='hm_wood_dark', bevel=0.04)
    for (x, y) in ((-1.1, -0.38), (1.1, -0.38), (-1.1, 0.38), (1.1, 0.38)):
        m.cyl(0.05, 0.16, at=(x, y, 0.08), mat='hm_brass', seg=8)
    for i in range(3):
        m.box((0.7, 0.75, 0.2), at=(-0.72 + i * 0.72, -0.06, 0.55), mat='hm_leather', bevel=0.07)
        m.box((0.7, 0.24, 0.6), at=(-0.72 + i * 0.72, 0.32, 0.86), rot=(-10, 0, 0), mat='hm_leather', bevel=0.08)
        for k in range(2):
            m.cyl(0.025, 0.03, at=(-0.72 + i * 0.72 + (k - 0.5) * 0.3, 0.18, 0.95), rot=(80, 0, 0), mat='hm_brass', seg=6)      # buttons
    for s in (-1, 1):
        m.box((0.24, 0.95, 0.5), at=(s * 1.18, 0, 0.62), mat='hm_leather', bevel=0.09)
    m.box((0.5, 0.4, 0.12), at=(-0.7, -0.1, 0.7), rot=(0, 0, 14), mat='hm_wool2', bevel=0.05)
    return P(m, 'Leather Sofa', (2.6, 1.15, 1.0))


def hm_armchair():
    m = Mesh('hm_armchair')
    m.box((0.95, 0.9, 0.3), at=(0, 0, 0.3), mat='hm_wood_dark', bevel=0.04)
    for (x, y) in ((-0.4, -0.36), (0.4, -0.36), (-0.4, 0.36), (0.4, 0.36)):
        m.cyl(0.05, 0.16, at=(x, y, 0.08), mat='hm_brass', seg=8)
    m.box((0.66, 0.72, 0.2), at=(0, -0.05, 0.55), mat='hm_leather2', bevel=0.07)
    m.box((0.66, 0.22, 0.75), at=(0, 0.32, 0.92), rot=(-10, 0, 0), mat='hm_leather2', bevel=0.08)
    for s in (-1, 1):
        m.box((0.2, 0.88, 0.48), at=(s * 0.44, 0, 0.62), mat='hm_leather2', bevel=0.08)
    return P(m, 'Armchair', (1.05, 1.3, 0.95))


def hm_table():
    m = Mesh('hm_table')
    m.box((1.3, 0.75, 0.06), at=(0, 0, 0.45), mat='hm_wood', bevel=0.02)
    m.box((1.1, 0.55, 0.012), at=(0, 0, 0.485), mat='hm_cream')
    for (x, y) in ((-0.55, -0.28), (0.55, -0.28), (-0.55, 0.28), (0.55, 0.28)):
        m.cyl(0.035, 0.42, at=(x, y, 0.21), mat='hm_brass', seg=8)
    m.box((1.1, 0.55, 0.03), at=(0, 0, 0.16), mat='hm_wood_dark')
    m.cyl(0.07, 0.1, at=(0.3, 0.1, 0.54), mat='hm_copper', seg=10)
    m.box((0.3, 0.2, 0.04), at=(-0.25, -0.05, 0.51), rot=(0, 0, 20), mat='hm_book_b')
    return P(m, 'Low Table', (1.3, 0.55, 0.75))


def hm_radio():
    """The video radio: brass and copper, a round amber tube, an aerial coil, a brass horn. The world calls on it."""
    m = Mesh('hm_radio')
    m.box((2.0, 0.8, 0.85), at=(0, 0.05, 0.43), mat='hm_wood', bevel=0.03)
    m.box((2.1, 0.9, 0.07), at=(0, 0.03, 0.89), mat='hm_wood_dark', bevel=0.02)
    m.box((1.9, 0.5, 1.2), at=(0, 0.2, 1.5), mat='hm_wood', bevel=0.05)
    m.cyl(0.5, 0.08, at=(-0.35, -0.05, 1.55), rot=(90, 0, 0), mat='hm_brass', seg=20)                      # the tube in its bezel
    m.cyl(0.42, 0.02, at=(-0.35, -0.1, 1.55), rot=(90, 0, 0), mat='hm_screen', seg=20)
    for k in range(8):
        a = k * math.pi / 4
        m.cyl(0.025, 0.03, at=(-0.35 + 0.47 * math.cos(a), -0.1, 1.55 + 0.47 * math.sin(a)), rot=(90, 0, 0), mat='hm_copper', seg=6)
    for j in range(3):                                   # dials and tell-tales
        m.cyl(0.1, 0.05, at=(0.55, -0.07, 1.9 - j * 0.3), rot=(90, 0, 0), mat='hm_copper', seg=12)
        m.cyl(0.075, 0.02, at=(0.55, -0.1, 1.9 - j * 0.3), rot=(90, 0, 0), mat='hm_cream', seg=12)
        m.cyl(0.03, 0.02, at=(0.8, -0.07, 1.9 - j * 0.3), rot=(90, 0, 0), mat=('hm_glow', 'hm_glow_soft', 'hm_glow_red')[j], seg=6)
    for i in range(7):                                   # keys on the deck
        m.box((0.16, 0.14, 0.05), at=(-0.66 + i * 0.22, -0.25, 0.95), rot=(10, 0, 0), mat='hm_cream' if i % 3 else 'hm_copper', bevel=0.015)
    m.cyl(0.03, 0.9, at=(0.75, 0.3, 2.5), mat='hm_brass', seg=6)                                           # the aerial: a coil up a mast
    for k in range(6):
        m.ring(0.13, 0.018, at=(0.75, 0.3, 2.2 + k * 0.12), mat='hm_copper', seg=12, tseg=4)
    m.ball(0.06, at=(0.75, 0.3, 2.98), mat='hm_glow', seg=8)
    m.cyl(0.26, 0.4, at=(-0.95, -0.25, 1.25), rot=(70, 0, -20), mat='hm_brass', seg=12, r2=0.05)           # the horn
    m.box((1.5, 0.03, 0.2), at=(0, -0.36, 0.5), mat='hm_wood_dark', bevel=0.012)
    return P(m, 'Video Radio', (2.1, 2.2, 0.95), light=LAMP((-0.35, -0.7, 1.5), 0.8, 4.5, (1.0, 0.62, 0.25)))


def hm_rack():
    """The weapon rack: a walnut board with brass pegs. What you have found hangs on it."""
    m = Mesh('hm_rack')
    m.box((2.4, 0.1, 1.9), at=(0, 0.2, 1.25), mat='hm_wood', bevel=0.03)
    m.box((2.5, 0.5, 0.3), at=(0, 0.02, 0.15), mat='hm_wood_dark', bevel=0.03)
    slots = []
    for j in range(2):
        for i in range(3):
            x, z = -0.78 + i * 0.78, 0.85 + j * 0.75
            for s in (-1, 1):
                m.cyl(0.02, 0.2, at=(x + s * 0.22, 0.08, z), rot=(90, 0, 0), mat='hm_brass', seg=6)
            slots.append([x, z + 0.02, -0.06])
    m.box((2.2, 0.03, 0.04), at=(0, 0.14, 2.1), mat='hm_glow_soft')
    m.box((0.5, 0.3, 0.2), at=(-0.8, -0.02, 0.4), mat='hm_iron', bevel=0.02)                               # an ammunition box
    m.box((0.4, 0.3, 0.16), at=(0.6, -0.02, 0.38), mat='hm_leather2', bevel=0.02)
    return P(m, 'Weapon Rack', (2.5, 2.25, 0.55), slots=slots, holds='weapons', light=LAMP((0, -0.6, 1.6), 0.5, 3.5))


def hm_armor():
    """A stand for armour: a brass post, a padded form, a shelf for a helmet."""
    m = Mesh('hm_armor')
    m.cyl(0.35, 0.06, at=(0, 0, 0.03), mat='hm_wood_dark', seg=14)
    m.cyl(0.04, 1.3, at=(0, 0, 0.68), mat='hm_brass', seg=8)
    m.box((0.55, 0.3, 0.6), at=(0, 0, 1.3), mat='hm_leather2', bevel=0.12)                                 # the form
    m.box((0.8, 0.06, 0.06), at=(0, 0, 1.55), mat='hm_brass')
    m.ball(0.14, at=(0, 0, 1.78), mat='hm_wood', seg=8, scale=(1, 1, 1.2))
    return P(m, 'Armour Stand', (0.8, 1.95, 0.6), slots=[[0, 1.02, -0.2]], holds='armor')


def hm_workbench():
    m = Mesh('hm_workbench')
    m.box((2.3, 0.85, 0.09), at=(0, 0, 0.9), mat='hm_wood_pale', bevel=0.02)
    for (x, y) in ((-1.05, -0.33), (1.05, -0.33), (-1.05, 0.33), (1.05, 0.33)):
        m.box((0.1, 0.1, 0.86), at=(x, y, 0.43), mat='hm_iron')
    m.box((2.1, 0.7, 0.04), at=(0, 0, 0.28), mat='hm_wood_dark')
    m.box((2.3, 0.06, 1.0), at=(0, 0.4, 1.45), mat='hm_wood_dark')                                         # a pegboard of tools
    for i in range(7):
        m.box((0.05, 0.03, 0.3 + (i % 3) * 0.1), at=(-0.9 + i * 0.3, 0.35, 1.5), mat=('hm_iron', 'hm_brass', 'hm_chrome')[i % 3])
    m.box((0.3, 0.26, 0.24), at=(-0.75, 0.05, 1.07), mat='hm_iron', bevel=0.02)                            # a vice
    m.cyl(0.02, 0.4, at=(-0.75, -0.14, 1.05), rot=(90, 0, 0), mat='hm_chrome', seg=6)
    gear(m, 0.16, (0.2, -0.1, 0.96), rot=(0, 0, 0), teeth=8, thick=0.04)
    gear(m, 0.1, (0.5, 0.1, 0.96), rot=(0, 0, 0), teeth=8, thick=0.04, mat='hm_copper')
    m.box((0.4, 0.3, 0.22), at=(0.85, 0.05, 1.06), mat='hm_wood', bevel=0.02)
    m.box((0.3, 0.02, 0.14), at=(0.85, -0.105, 1.07), mat='hm_screen')
    m.tube([(1.0, 0.36, 1.9), (1.0, 0.1, 2.0), (0.7, -0.1, 1.75)], 0.02, mat='hm_brass', seg=6)            # a work lamp on an arm
    m.cyl(0.1, 0.12, at=(0.7, -0.1, 1.7), mat='hm_copper', seg=10, r2=0.05)
    m.ball(0.045, at=(0.7, -0.1, 1.66), mat='hm_glow', seg=6)
    return P(m, 'Workbench', (2.3, 1.95, 0.9), light=LAMP((0.6, -0.3, 1.6), 0.8, 4.0))


def hm_cradle():
    """The repair cradle in the robot room: a tilted frame with clamps, cables and a diagnostic screen."""
    m = Mesh('hm_cradle')
    m.box((1.6, 1.6, 0.14), at=(0, 0, 0.07), mat='hm_iron', bevel=0.03)
    for s in (-1, 1):
        m.box((0.1, 0.1, 2.4), at=(s * 0.72, 0.6, 1.3), mat='hm_brass')
        m.box((0.08, 0.5, 0.08), at=(s * 0.72, 0.35, 2.2), mat='hm_brass')
        m.box((0.3, 0.14, 0.2), at=(s * 0.55, 0.12, 2.2), mat='hm_iron', bevel=0.02)                       # the clamps
    m.box((1.54, 0.1, 0.1), at=(0, 0.6, 2.5), mat='hm_brass')
    m.box((0.5, 0.08, 0.36), at=(0.95, -0.5, 1.2), rot=(0, 0, -25), mat='hm_wood', bevel=0.03)
    m.box((0.4, 0.02, 0.26), at=(0.93, -0.545, 1.2), rot=(0, 0, -25), mat='hm_screen')
    m.cyl(0.03, 1.1, at=(0.95, -0.45, 0.6), mat='hm_brass', seg=6)
    for k in range(3):
        cable(m, None, (-0.6 + k * 0.6, 0.6, 2.45), (-0.3 + k * 0.3, 0.1, 1.5), sag=0.3, r=0.022, mat='cable' if k != 1 else 'hm_copper')
    return P(m, 'Repair Cradle', (1.6, 2.6, 1.6), solids=[[0, 0.07, 0, 1.6, 0.14, 1.6], [0, 1.3, 0.6, 1.6, 2.5, 0.14]])


def hm_console():
    """The security desk: grey steel, green screens, a red handset."""
    m = Mesh('hm_console')
    m.box((2.0, 0.8, 0.8), at=(0, 0.05, 0.4), mat='hm_steel', bevel=0.03)
    m.box((2.1, 0.95, 0.07), at=(0, 0.0, 0.84), mat='hm_steel_dark', bevel=0.02)
    m.box((2.0, 0.3, 0.7), at=(0, 0.33, 1.24), mat='hm_steel_dark', bevel=0.03)
    for i in range(3):
        m.box((0.56, 0.02, 0.44), at=(-0.64 + i * 0.64, 0.17, 1.26), mat='hm_screen_g')
    for i in range(10):
        m.box((0.1, 0.1, 0.04), at=(-0.7 + i * 0.155, -0.2, 0.9), mat=('hm_steel', 'hm_glow_red', 'hm_steel', 'hm_glow_soft')[i % 4])
    m.box((0.14, 0.3, 0.08), at=(0.85, -0.15, 0.92), mat='hm_glow_red', bevel=0.03)
    return P(m, 'Security Desk', (2.1, 1.6, 0.95), light=LAMP((0, -0.6, 1.3), 0.5, 3.5, (0.4, 1.0, 0.5)))


def hm_lift():
    """The way out: a cage lift in a grey steel surround. You do not walk into it; you call it and say where."""
    m = Mesh('hm_lift')
    m.box((2.6, 0.5, 3.3), at=(0, 0.5, 1.65), mat='hm_steel_dark')
    for s in (-1, 1):
        m.box((0.4, 0.9, 3.3), at=(s * 1.3, 0.3, 1.65), mat='hm_steel', bevel=0.03)
    m.box((3.0, 0.9, 0.4), at=(0, 0.3, 3.5), mat='hm_steel', bevel=0.03)
    m.box((2.2, 0.03, 0.12), at=(0, -0.16, 3.5), mat='hm_glow')
    for k in range(9):                                   # the cage gate
        m.cyl(0.025, 3.2, at=(-1.0 + k * 0.25, -0.05, 1.65), mat='hm_brass', seg=6)
    for z in (0.5, 1.65, 2.8):
        m.box((2.2, 0.05, 0.06), at=(0, -0.05, z), mat='hm_brass')
    m.box((2.2, 0.8, 0.1), at=(0, 0.2, 0.05), mat='hm_steel')
    m.box((0.3, 0.1, 0.5), at=(1.3, -0.2, 1.4), mat='hm_brass', bevel=0.03)                                # the call box
    m.cyl(0.05, 0.03, at=(1.3, -0.26, 1.52), rot=(90, 0, 0), mat='hm_glow', seg=8)
    m.cyl(0.05, 0.03, at=(1.3, -0.26, 1.3), rot=(90, 0, 0), mat='hm_copper', seg=8)
    return P(m, 'Lift', (3.0, 3.7, 1.0), light=LAMP((0, -0.8, 2.6), 0.9, 6.0))


# ---- the catalogue: things to buy and put where you like
def hm_plant():
    m = Mesh('hm_plant')
    m.cyl(0.26, 0.42, at=(0, 0, 0.21), mat='hm_copper', seg=12, r2=0.32)
    m.cyl(0.3, 0.03, at=(0, 0, 0.42), mat='hm_wood_dark', seg=12)
    rnd = random.Random(3)
    for k in range(9):
        a = k * 2 * math.pi / 9
        ln = rnd.uniform(0.6, 1.1)
        m.box((0.16, 0.03, ln), at=(math.cos(a) * 0.2, math.sin(a) * 0.2, 0.45 + ln / 2), rot=(math.sin(a) * 28, -math.cos(a) * 28, math.degrees(a)), mat='hm_green', bevel=0.012)
    return P(m, 'Fern in a Copper Pot', (0.7, 1.5, 0.7))


def hm_lamp():
    m = Mesh('hm_lamp')
    m.cyl(0.2, 0.05, at=(0, 0, 0.025), mat='hm_brass', seg=12)
    m.cyl(0.025, 1.5, at=(0, 0, 0.8), mat='hm_brass', seg=8)
    m.cyl(0.3, 0.34, at=(0, 0, 1.68), mat='hm_wool2', seg=14, r2=0.18)
    m.ball(0.1, at=(0, 0, 1.6), mat='hm_glow', seg=8)
    return P(m, 'Standing Lamp', (0.5, 1.9, 0.5), light=LAMP((0, 0, 1.6), 1.3, 7.0))


def hm_rug():
    m = Mesh('hm_rug')
    m.box((2.4, 1.6, 0.02), at=(0, 0, 0.012), mat='hm_wool', bevel=0.008)
    m.box((2.1, 1.3, 0.006), at=(0, 0, 0.026), mat='hm_wool2')
    m.box((1.9, 1.1, 0.006), at=(0, 0, 0.032), mat='hm_wool')
    for i in range(3):
        m.box((0.3, 0.3, 0.006), at=(-0.6 + i * 0.6, 0, 0.038), rot=(0, 0, 45), mat='hm_wool2')
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Rug'))


def hm_painting():
    m = Mesh('hm_painting')
    m.push(T(0, 0, 2.1))
    m.box((1.2, 0.06, 0.9), at=(0, -0.03, 0), mat='hm_brass', bevel=0.03)
    m.box((1.04, 0.02, 0.74), at=(0, -0.065, 0), mat='hm_picture')
    m.box((1.04, 0.012, 0.25), at=(0, -0.078, -0.24), mat='hm_green')
    m.cyl(0.12, 0.012, at=(0.25, -0.078, 0.15), rot=(90, 0, 0), mat='hm_glow_soft', seg=10)
    m.pop()
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Painting', mount='wall'))


def hm_clock():
    m = Mesh('hm_clock')
    m.push(T(0, 0, 2.5))
    m.cyl(0.36, 0.1, at=(0, -0.05, 0), rot=(90, 0, 0), mat='hm_brass', seg=18)
    m.cyl(0.3, 0.02, at=(0, -0.105, 0), rot=(90, 0, 0), mat='hm_cream', seg=18)
    m.box((0.02, 0.012, 0.22), at=(0, -0.12, 0.09), mat='hm_iron')
    m.box((0.16, 0.012, 0.02), at=(0.07, -0.12, 0), mat='hm_iron')
    gear(m, 0.12, (0, -0.1, -0.42), teeth=8, thick=0.04, mat='hm_copper')
    m.pop()
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Brass Clock', mount='wall'))


def hm_video():
    """The living room's video: a wide amber screen in a walnut and brass surround, hung on the wall."""
    m = Mesh('hm_video')
    m.box((3.0, 0.14, 1.8), at=(0, -0.07, 2.2), mat='hm_wood', bevel=0.04)
    m.box((2.7, 0.05, 1.45), at=(0, -0.16, 2.28), mat='hm_brass', bevel=0.05)
    m.box((2.5, 0.02, 1.25), at=(0, -0.19, 2.28), mat='hm_screen')
    for i in range(6):
        m.cyl(0.045, 0.04, at=(-0.6 + i * 0.24, -0.16, 1.42), rot=(90, 0, 0), mat='hm_copper', seg=8)
    for s in (-1, 1):
        for k in range(5):
            m.box((0.5, 0.03, 0.02), at=(s * 1.15, -0.15, 1.36 + k * 0.035), mat='hm_wood_dark')
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Wall Video', mount='wall', light=LAMP((0, -1.0, 2.2), 0.9, 6.0, (1.0, 0.62, 0.25))))


def hm_medic():
    """The medical station: an old wall unit, cream enamel and brass, a red cross, a tray."""
    m = Mesh('hm_medic')
    m.box((0.9, 0.24, 1.2), at=(0, -0.12, 1.6), mat='hm_cream', bevel=0.04)
    m.box((0.5, 0.02, 0.14), at=(0, -0.25, 1.85), mat='hm_glow_red')
    m.box((0.14, 0.02, 0.5), at=(0, -0.25, 1.85), mat='hm_glow_red')
    m.box((0.7, 0.3, 0.05), at=(0, -0.2, 1.15), mat='hm_chrome')
    m.box((0.6, 0.02, 0.16), at=(0, -0.25, 1.35), mat='hm_screen')
    for s in (-1, 1):
        m.box((0.05, 0.26, 1.24), at=(s * 0.45, -0.13, 1.6), mat='hm_brass')
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Medical Station', mount='wall'))


def hm_gramophone():
    m = Mesh('hm_gramophone')
    m.box((0.7, 0.7, 0.8), at=(0, 0, 0.4), mat='hm_wood', bevel=0.03)
    m.box((0.6, 0.6, 0.12), at=(0, 0, 0.86), mat='hm_wood_dark', bevel=0.02)
    m.cyl(0.24, 0.02, at=(0, 0, 0.93), mat='hm_iron', seg=14)
    m.tube([(0.2, 0.2, 0.93), (0.25, 0.25, 1.3), (0.05, 0.05, 1.5)], 0.03, mat='hm_brass', seg=6)
    m.cyl(0.4, 0.5, at=(-0.1, -0.1, 1.72), rot=(30, 30, 0), mat='hm_brass', seg=14, r2=0.04)
    return P(m, 'Gramophone', (0.75, 2.0, 0.75))


def hm_aquarium():
    m = Mesh('hm_aquarium')
    m.box((1.5, 0.6, 0.8), at=(0, 0, 0.4), mat='hm_wood', bevel=0.03)
    m.box((1.4, 0.5, 0.7), at=(0, 0, 1.15), mat='hm_teal')
    m.box((1.5, 0.6, 0.76), at=(0, 0, 1.18), mat='glass')
    for s in (-1, 1):
        m.box((0.06, 0.62, 0.8), at=(s * 0.74, 0, 1.2), mat='hm_brass')
    m.box((1.54, 0.64, 0.08), at=(0, 0, 1.6), mat='hm_brass', bevel=0.02)
    m.box((1.3, 0.03, 0.03), at=(0, 0, 1.55), mat='hm_glow_cool')
    for (x, z) in ((-0.3, 1.2), (0.25, 1.05), (0.45, 1.3)):
        m.ball(0.06, at=(x, 0, z), mat='hm_glow', seg=6, scale=(1.6, 0.6, 0.9))
    return P(m, 'Aquarium', (1.55, 1.65, 0.65), light=LAMP((0, -0.5, 1.2), 0.6, 4.0, (0.5, 0.9, 1.0)))


def hm_globe():
    m = Mesh('hm_globe')
    for k in range(3):
        a = k * 2 * math.pi / 3
        m.tube([(0.35 * math.cos(a), 0.35 * math.sin(a), 0.0), (0.06 * math.cos(a), 0.06 * math.sin(a), 0.7)], 0.025, mat='hm_wood_dark', seg=6)
    m.ring(0.42, 0.02, at=(0, 0, 1.1), rot=(90, 0, 0), mat='hm_brass', seg=20, tseg=5)
    m.ball(0.38, at=(0, 0, 1.1), mat='hm_teal', seg=14)
    m.ball(0.385, at=(0.02, 0.01, 1.12), mat='hm_wood_pale', seg=8, scale=(0.6, 1.0, 0.5))
    return P(m, 'Globe', (0.9, 1.55, 0.9))


TILES = {'wall_hm_panel': lambda: wall_hm_panel(1), 'wall_hm_panel2': lambda: wall_hm_panel(2), 'wall_hm_pipes': lambda: wall_hm_pipes(1), 'wall_hm_shelf': lambda: wall_hm_shelf(1),
         'wall_hm_screen': lambda: wall_hm_screen(1), 'wall_hm_lamp': lambda: wall_hm_lamp(1), 'wall_hm_gears': lambda: wall_hm_gears(1),
         'wall_hm_tile': lambda: wall_hm_tile(1), 'wall_hm_tile2': lambda: wall_hm_tile(2), 'wall_hm_steel': lambda: wall_hm_steel(1), 'wall_hm_steel2': lambda: wall_hm_steel(2),
         'floor_hm_tile': lambda: floor_hm_tile(1), 'floor_hm_terra': lambda: floor_hm_tile(2), 'floor_hm_wood': lambda: floor_hm_wood(1), 'floor_hm_rug': lambda: floor_hm_wood(2),
         'floor_hm_white': lambda: floor_hm_white(1), 'floor_hm_drain': lambda: floor_hm_white(2), 'floor_hm_steel': lambda: floor_hm_steel(1), 'floor_hm_steel2': lambda: floor_hm_steel(2),
         'ceil_hm_beam': lambda: ceil_hm_beam(1), 'ceil_hm_lamp': lambda: ceil_hm_beam(2), 'ceil_hm_tin': lambda: ceil_hm_tin(1), 'ceil_hm_tinlamp': lambda: ceil_hm_tin(2), 'ceil_hm_white': lambda: ceil_hm_white(1),
         'ceil_hm_whitelight': lambda: ceil_hm_white(2), 'ceil_hm_steel': lambda: ceil_hm_steel(1), 'ceil_hm_steellight': lambda: ceil_hm_steel(2)}
PROPS = {'door_hm_gear': door_hm_gear, 'door_hm_vault': door_hm_vault}
for _f in (hm_bed, hm_dresser, hm_toilet, hm_shower, hm_sink, hm_bookcase, hm_desk, hm_trophy, hm_sofa, hm_armchair, hm_table, hm_radio, hm_rack, hm_armor, hm_workbench,
           hm_cradle, hm_console, hm_lift, hm_video, hm_medic, hm_plant, hm_lamp, hm_rug, hm_painting, hm_clock, hm_gramophone, hm_aquarium, hm_globe):
    PROPS[_f.__name__] = _f
WARM = [1.0, 0.72, 0.4]
META = {'ceil_hm_lamp': dict(light=dict(color=WARM, energy=2.2, range=11, at=[0, -0.7, 0])),
        'ceil_hm_tinlamp': dict(light=dict(color=WARM, energy=2.2, range=11, at=[0, -0.6, 0])),
        'ceil_hm_whitelight': dict(light=dict(color=[0.9, 0.95, 1.0], energy=1.3, range=9, at=[0, -0.3, 0])),
        'ceil_hm_steellight': dict(light=dict(color=[1.0, 0.8, 0.55], energy=1.8, range=10, at=[0, -0.4, 0])),
        'wall_hm_lamp': dict(light=dict(color=WARM, energy=1.1, range=7, at=[0, 2.8, 0.6])),
        'wall_hm_screen': dict(light=dict(color=[1.0, 0.62, 0.25], energy=0.6, range=5, at=[0, 2.6, 0.7])),
        'wall_hm_gears': dict(light=dict(color=WARM, energy=0.4, range=4, at=[0, 2.5, 0.6])),
        'wall_hm_steel2': dict(light=dict(color=[0.4, 1.0, 0.5], energy=0.4, range=4, at=[0, 2.3, 0.6]))}
KITS = {'home': dict(mats=HOME_MATS, tiles=TILES, props=PROPS, meta=META)}
