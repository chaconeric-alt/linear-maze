"""THE ANOMALOUS STRUCTURE (kit `anomalous`, tag an): Installation A from the 2D game, an Age of War advertising agency.

Three looks, one to a floor, and the rest borrowed (agency, executive, megaplex, bunker, hightech):
  INSTITUTIONAL  the offices: beige panel walls with a chair rail, motivational print, grey-green carpet tile, a drop
                 ceiling with fluorescent panels (some dead), a coffee shop the building insisted on.
  STERILE WHITE  the prototype labs: seamless white panels with a hairline of cyan light, white floors, ring lights.
  THE CORE       black glass with pink traces that all run one way: toward the thing that still wants you to want things.
Everything the dungeon needs that no other kit had is here too: the reception desk, posters, cubicles, the slot machine,
the coffee counter and its tip jar, a wall safe, a dead scavenger, the test console, a hologram, packing crates, the mist
generators, the shopper tablet, the security station, the repair gantry, the core and its lectern, a force-field door,
the dart plate, the quest items and the arc carbine. And two machines (ACTORS3): the Heavy Security Drone and a field emitter.
"""
import math, random
from mz import Mesh, T, R, S
from tiles import C, H, cable
from kits_works_bunker_crypt import _frame, DW, DH, DT
from actors2 import Build, K
from actors import cyc, sn

AN_MATS = {
    'an_beige':    dict(color=(0.62, 0.56, 0.44), metal=0.0, rough=0.85, shader='worn', grime=0.5),
    'an_beige2':   dict(color=(0.50, 0.46, 0.37), metal=0.0, rough=0.8, shader='worn', grime=0.55),
    'an_grey':     dict(color=(0.34, 0.36, 0.36), metal=0.1, rough=0.7, shader='worn', grime=0.5),
    'an_dark':     dict(color=(0.10, 0.11, 0.12), metal=0.3, rough=0.6, shader='worn', grime=0.4),
    'an_carpet':   dict(color=(0.20, 0.27, 0.24), metal=0.0, rough=1.0, shader='worn', grime=0.6),
    'an_carpet2':  dict(color=(0.16, 0.21, 0.20), metal=0.0, rough=1.0, shader='worn', grime=0.6),
    'an_lino':     dict(color=(0.40, 0.41, 0.38), metal=0.0, rough=0.35, shader='worn', grime=0.5),
    'an_tile':     dict(color=(0.66, 0.64, 0.56), metal=0.0, rough=0.9, emit=(0.66, 0.64, 0.56), energy=0.16),      # ceiling tile: pale, even where no lamp reaches
    'an_stain':    dict(color=(0.38, 0.30, 0.18), metal=0.0, rough=0.95),
    'an_wood':     dict(color=(0.36, 0.22, 0.11), metal=0.0, rough=0.6, shader='worn', grime=0.4),
    'an_cream':    dict(color=(0.80, 0.74, 0.60), metal=0.0, rough=0.6, shader='worn', grime=0.4),
    'an_brown':    dict(color=(0.30, 0.17, 0.10), metal=0.0, rough=0.6, shader='worn', grime=0.4),
    'an_card':     dict(color=(0.55, 0.42, 0.26), metal=0.0, rough=0.95),                                # cardboard
    'an_paper':    dict(color=(0.86, 0.84, 0.76), metal=0.0, rough=0.95),
    'an_red':      dict(color=(0.70, 0.12, 0.10), metal=0.0, rough=0.6),
    'an_navy':     dict(color=(0.10, 0.14, 0.34), metal=0.0, rough=0.6),
    'an_yellow':   dict(color=(0.85, 0.66, 0.10), metal=0.0, rough=0.6),
    'an_leather':  dict(color=(0.20, 0.14, 0.10), metal=0.0, rough=0.5, shader='worn', grime=0.4),
    'an_cloth':    dict(color=(0.24, 0.28, 0.20), metal=0.0, rough=1.0),
    'an_steel':    dict(color=(0.40, 0.42, 0.44), metal=0.85, rough=0.4, shader='worn', grime=0.5),
    'an_chrome':   dict(color=(0.80, 0.82, 0.84), metal=1.0, rough=0.12),
    'an_gold':     dict(color=(0.85, 0.65, 0.22), metal=1.0, rough=0.25),
    'an_white':    dict(color=(0.62, 0.65, 0.66), metal=0.0, rough=0.25, shader='worn', grime=0.22),
    'an_white2':   dict(color=(0.48, 0.52, 0.54), metal=0.1, rough=0.3, shader='worn', grime=0.25),
    'an_black':    dict(color=(0.03, 0.03, 0.045), metal=0.6, rough=0.12),
    'an_glow_w':   dict(color=(0.92, 0.97, 1.0), emit=(0.9, 0.96, 1.0), energy=2.2, shader='glow', pulse=0.03),     # fluorescent
    'an_glow_c':   dict(color=(0.5, 0.95, 1.0), emit=(0.4, 0.92, 1.0), energy=2.2, shader='glow', pulse=0.04),      # lab cyan
    'an_glow_p':   dict(color=(1.0, 0.3, 0.85), emit=(1.0, 0.29, 0.85), energy=2.6, shader='glow', pulse=0.25),     # agency pink
    'an_glow_r':   dict(color=(1.0, 0.2, 0.1), emit=(1.0, 0.2, 0.1), energy=2.4, shader='glow', pulse=0.3),
    'an_glow_y':   dict(color=(1.0, 0.82, 0.2), emit=(1.0, 0.8, 0.2), energy=2.0, shader='glow', pulse=0.1),
    'an_glow_g':   dict(color=(0.3, 1.0, 0.5), emit=(0.3, 1.0, 0.5), energy=2.0, shader='glow', pulse=0.1),
    'an_glow_b':   dict(color=(0.35, 0.6, 1.0), emit=(0.35, 0.6, 1.0), energy=2.0, shader='glow', pulse=0.1),
    'an_ad':       dict(color=(0.08, 0.01, 0.06), emit=(1.0, 0.29, 0.85), energy=1.5, shader='screen'),
    'an_ad2':      dict(color=(0.01, 0.05, 0.07), emit=(0.13, 0.9, 1.0), energy=1.5, shader='screen'),
    'an_term':     dict(color=(0.01, 0.05, 0.02), emit=(0.3, 1.0, 0.45), energy=1.4, shader='screen'),
    'an_field':    dict(color=(1.0, 0.3, 0.85), emit=(1.0, 0.29, 0.85), energy=1.6, alpha=0.4, shader='glass'),
    'an_holo':     dict(color=(0.5, 0.95, 1.0), emit=(0.4, 0.92, 1.0), energy=1.4, alpha=0.45, shader='glass'),
    'an_coreglass': dict(color=(1.0, 0.45, 0.9), emit=(1.0, 0.29, 0.85), energy=1.0, alpha=0.55, shader='glass'),
    'an_skin':     dict(color=(0.42, 0.40, 0.34), metal=0.0, rough=0.9),                                 # the long dead
}


# ---------------------------------------------------------------- INSTITUTIONAL walls (face on y=0, looking at -Y)
def office_base(m, upper='an_beige'):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat=upper)
    m.box((C, 0.05, 0.16), at=(0, -0.025, 0.08), mat='an_grey', bevel=0.01)                                # skirting
    for i in range(4):                                                                                    # panels below the rail
        m.box((0.97, 0.03, 0.82), at=(-1.5 + i, -0.015, 0.6), mat='an_beige2', bevel=0.01)
    m.box((C, 0.06, 0.07), at=(0, -0.03, 1.06), mat='an_grey', bevel=0.012)                                # the chair rail
    for x in (-2 + 0.02, 0.0, 2 - 0.02):                                                                  # panel joints above
        m.box((0.03, 0.012, H - 1.25), at=(x, -0.006, (1.1 + H - 0.1) / 2), mat='an_beige2')
    m.box((C, 0.05, 0.1), at=(0, -0.025, H - 0.05), mat='an_grey')


def wall_an_office(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    office_base(m)
    if seed == 1:                                        # a water stain coming down from the ceiling, a dead socket
        m.box((0.5, 0.008, 0.9), at=(0.9, -0.004, H - 0.55), mat='an_stain')
        m.box((0.24, 0.008, 0.5), at=(1.05, -0.004, H - 1.25), mat='an_stain')
        m.box((0.14, 0.03, 0.1), at=(-1.2, -0.015, 0.4), mat='an_paper')
    elif seed == 2:                                      # a noticeboard, full
        m.box((2.2, 0.05, 1.3), at=(0, -0.025, 2.0), mat='an_wood', bevel=0.02)
        m.box((2.04, 0.02, 1.14), at=(0, -0.05, 2.0), mat='an_cloth')
        for k in range(9):
            w, hh = rnd.uniform(0.2, 0.36), rnd.uniform(0.22, 0.4)
            m.box((w, 0.008, hh), at=(rnd.uniform(-0.8, 0.8), -0.066 - k * 0.009, 2.0 + rnd.uniform(-0.36, 0.36)), rot=(0, rnd.uniform(-9, 9), 0),
                  mat=rnd.choice(['an_paper', 'an_paper', 'an_yellow', 'an_cream']))
    else:                                                # an air grille and a clock that stopped
        m.box((0.9, 0.04, 0.4), at=(-0.9, -0.02, H - 0.55), mat='an_grey', bevel=0.01)
        for k in range(6):
            m.box((0.8, 0.02, 0.025), at=(-0.9, -0.045, H - 0.7 + k * 0.06), mat='an_dark')
        m.cyl(0.2, 0.05, at=(1.0, -0.025, 2.7), rot=(90, 0, 0), mat='an_dark', seg=16)
        m.cyl(0.17, 0.02, at=(1.0, -0.055, 2.7), rot=(90, 0, 0), mat='an_paper', seg=16)
        m.box((0.012, 0.008, 0.13), at=(1.0, -0.07, 2.75), mat='an_dark')
        m.box((0.09, 0.008, 0.012), at=(1.04, -0.07, 2.7), mat='an_dark')
    return m


def wall_an_blinds(seed):
    """A window that never looked at anything: slatted blinds with a lit panel behind them."""
    m = Mesh('wall')
    office_base(m)
    m.box((2.6, 0.08, 1.7), at=(0, -0.0, 2.2), mat='an_grey', bevel=0.02)
    m.box((2.4, 0.02, 1.5), at=(0, -0.03, 2.2), mat='an_glow_w')
    for k in range(17):
        z = 1.5 + k * 0.088
        m.box((2.4, 0.07, 0.03), at=(0, -0.075, z), rot=(28 if (seed + k) % 7 else -12, 0, 0), mat='an_cream')
    m.cyl(0.006, 1.5, at=(1.1, -0.11, 2.2), mat='an_paper', seg=4)
    return m


def wall_an_ad(seed):
    """An agency screen, still selling."""
    m = Mesh('wall')
    office_base(m)
    m.box((2.8, 0.14, 1.7), at=(0, -0.07, 2.3), mat='an_dark', bevel=0.03)
    m.box((2.56, 0.02, 1.46), at=(0, -0.15, 2.3), mat='an_ad' if seed == 1 else 'an_ad2')
    m.box((2.8, 0.03, 0.04), at=(0, -0.13, 1.4), mat='an_glow_p' if seed == 1 else 'an_glow_c')
    return m


def wall_an_cafe(seed):
    """The Coffee Shop: wooden slats to the rail, cream above, and either the menu or the neon cup."""
    m = Mesh('wall')
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='an_cream')
    for i in range(16):
        m.box((0.22, 0.04, 1.3), at=(-1.875 + i * 0.25, -0.02, 0.65), mat='an_wood' if i % 2 else 'an_brown', bevel=0.01)
    m.box((C, 0.08, 0.08), at=(0, -0.04, 1.34), mat='an_brown', bevel=0.012)
    m.box((C, 0.05, 0.14), at=(0, -0.025, H - 0.07), mat='an_brown')
    if seed == 1:                                        # the menu board: three columns of chalk that all say COFFEE
        m.box((2.8, 0.06, 1.4), at=(0, -0.03, 2.5), mat='an_wood', bevel=0.02)
        m.box((2.6, 0.02, 1.2), at=(0, -0.06, 2.5), mat='an_black')
        for c in range(3):
            for r in range(5):
                m.box((0.55 - 0.08 * ((c + r) % 3), 0.006, 0.035), at=(-0.9 + c * 0.9 - 0.05, -0.074, 2.95 - r * 0.2), mat='an_paper')
                m.box((0.1, 0.006, 0.035), at=(-0.9 + c * 0.9 + 0.32, -0.074, 2.95 - r * 0.2), mat='an_yellow')
    else:                                                # a neon cup, steaming
        m.ring(0.36, 0.03, at=(0, -0.06, 2.3), rot=(90, 0, 0), mat='an_glow_y', seg=20, tseg=5)
        m.box((0.9, 0.04, 0.05), at=(0, -0.06, 1.9), mat='an_glow_y')
        m.ring(0.16, 0.025, at=(0.46, -0.06, 2.3), rot=(90, 0, 0), mat='an_glow_y', seg=12, tseg=5)
        for k in (-1, 0, 1):
            m.tube([(k * 0.16, -0.06, 2.75), (k * 0.16 + 0.07, -0.06, 2.92), (k * 0.16 - 0.05, -0.06, 3.08), (k * 0.16 + 0.04, -0.06, 3.24)], 0.02, mat='an_glow_p', seg=5)
    return m


# ---------------------------------------------------------------- STERILE WHITE walls
def white_base(m):
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='an_white2')
    for i in range(2):                                   # two tall panels, edges rolled
        m.box((1.94, 0.1, H - 0.5), at=(-1 + i * 2, -0.02, H / 2 + 0.1), mat='an_white', bevel=0.05)
    m.box((C, 0.14, 0.3), at=(0, -0.05, 0.15), mat='an_white', bevel=0.06)
    m.box((C, 0.03, 0.035), at=(0, -0.075, 0.36), mat='an_glow_c')                                         # the hairline of light
    m.box((C, 0.1, 0.16), at=(0, -0.03, H - 0.08), mat='an_white2', bevel=0.03)


def wall_an_white(seed):
    m = Mesh('wall')
    white_base(m)
    if seed == 2:                                        # an inset display and a row of sample ports
        m.box((1.2, 0.04, 0.8), at=(-1.0, -0.075, 2.2), mat='an_black', bevel=0.03)
        m.box((1.06, 0.01, 0.66), at=(-1.0, -0.097, 2.2), mat='an_ad2')
        for k in range(5):
            m.cyl(0.07, 0.04, at=(0.4 + k * 0.3, -0.08, 1.5), rot=(90, 0, 0), mat='an_chrome', seg=10)
            m.cyl(0.045, 0.015, at=(0.4 + k * 0.3, -0.105, 1.5), rot=(90, 0, 0), mat='an_glow_c' if k != 3 else 'an_dark', seg=8)
    elif seed == 3:                                      # a specimen window: glass over something green that has dried
        m.box((2.4, 0.06, 1.5), at=(0, -0.06, 2.2), mat='an_white2', bevel=0.06)
        m.box((2.16, 0.02, 1.26), at=(0, -0.088, 2.2), mat='an_black')
        for (x, z, r) in ((-0.5, 2.1, 0.3), (0.3, 2.4, 0.2), (0.6, 1.9, 0.16)):
            m.cyl(r, 0.004, at=(x, -0.105, z), rot=(90, 0, 0), mat='an_stain', seg=9)
        m.box((2.16, 0.012, 1.26), at=(0, -0.122, 2.2), mat='pane')
        m.box((2.2, 0.02, 0.03), at=(0, -0.14, 2.9), mat='an_glow_c')
    return m


# ---------------------------------------------------------------- THE CORE walls
def wall_an_core(seed):
    rnd = random.Random(seed)
    m = Mesh('wall')
    m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='an_dark')
    for i in range(4):
        m.box((0.96, 0.06, H - 0.1), at=(-1.5 + i, -0.03, H / 2), mat='an_black', bevel=0.02)
    for k in range(5):                                   # traces: they run along, step, and run on
        z = 0.5 + k * 0.72 + rnd.uniform(-0.1, 0.1)
        x0 = -2.0
        while x0 < 2.0:
            ln = min(rnd.uniform(0.5, 1.4), 2.0 - x0)
            m.box((ln, 0.012, 0.025), at=(x0 + ln / 2, -0.066, z), mat='an_glow_p')
            x0 += ln
            if x0 < 2.0:
                dz = rnd.choice([-0.14, 0.14])
                m.box((0.025, 0.012, abs(dz) + 0.025), at=(x0, -0.066, z + dz / 2), mat='an_glow_p')
                z += dz
    if seed == 2:
        m.box((1.4, 0.05, 0.9), at=(0, -0.06, 2.3), mat='an_dark', bevel=0.03)
        m.box((1.26, 0.012, 0.76), at=(0, -0.09, 2.3), mat='an_ad')
    return m


# ---------------------------------------------------------------- floors (top at z=0)
def _fl(m, mat='an_dark'):
    m.box((C, C, 0.2), at=(0, 0, -0.106), mat=mat)       # its top 6 mm under the tiles: nothing from the storey below shows in the joints


def floor_an_carpet(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    _fl(m)
    for i in range(4):
        for j in range(4):
            m.box((0.985, 0.985, 0.03), at=(-1.5 + i, -1.5 + j, -0.015), mat='an_carpet2' if rnd.random() < 0.14 else 'an_carpet')
    if seed == 2:                                        # worn to the backing where everybody turned the corner
        m.box((1.3, 0.5, 0.004), at=(0.2, -0.3, 0.002), rot=(0, 0, 20), mat='an_stain')
        m.box((0.5, 0.36, 0.004), at=(-1.1, 1.0, 0.002), rot=(0, 0, -30), mat='an_stain')
    return m


def floor_an_lino(seed):
    """Reception: speckled lino with a pink line that leads to the desk."""
    m = Mesh('floor')
    _fl(m)
    for i in range(2):
        for j in range(2):
            m.box((1.99, 1.99, 0.03), at=(-1 + i * 2, -1 + j * 2, -0.015), mat='an_lino', bevel=0.004)
    if seed == 2:
        m.box((0.16, C, 0.004), at=(0, 0, 0.002), mat='an_red')
    return m


def floor_an_check(seed):
    m = Mesh('floor')
    _fl(m)
    for i in range(8):
        for j in range(8):
            m.box((0.49, 0.49, 0.03), at=(-1.75 + i * 0.5, -1.75 + j * 0.5, -0.015), mat='an_cream' if (i + j) % 2 else 'an_brown', bevel=0.006)
    return m


def floor_an_white(seed):
    m = Mesh('floor')
    _fl(m, 'an_white2')
    for i in range(2):
        for j in range(2):
            m.box((1.97, 1.97, 0.03), at=(-1 + i * 2, -1 + j * 2, -0.015), mat='an_white', bevel=0.012)
    if seed == 2:                                        # a ring of light let into the floor
        m.ring(1.2, 0.035, at=(0, 0, -0.02), mat='an_glow_c', seg=28, tseg=4)
    return m


def floor_an_core(seed):
    rnd = random.Random(seed)
    m = Mesh('floor')
    _fl(m)
    for i in range(2):
        for j in range(2):
            m.box((1.97, 1.97, 0.03), at=(-1 + i * 2, -1 + j * 2, -0.015), mat='an_black', bevel=0.01)
    for k in range(4):
        y = -1.5 + k + rnd.uniform(-0.2, 0.2)
        m.box((C, 0.03, 0.004), at=(0, y, 0.002), mat='an_glow_p')
    return m


# ---------------------------------------------------------------- ceilings (underside at z=0)
def ceil_an_grid(seed):
    """A drop ceiling: 60 cm tiles in a grey grid. 1 plain, 2 a fluorescent panel, 3 tiles missing and a stain."""
    rnd = random.Random(seed)
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.5), mat='an_dark')
    gone = {(1, 2), (2, 2), (4, 0)} if seed == 3 else set()
    lit = {(2, 2), (3, 2), (2, 3), (3, 3)} if seed == 2 else set()
    n = 6
    s = C / n
    for i in range(n):
        for j in range(n):
            if (i, j) in gone:
                continue
            x, y = -2 + (i + 0.5) * s, -2 + (j + 0.5) * s
            if (i, j) in lit:
                m.box((s - 0.04, s - 0.04, 0.03), at=(x, y, 0.05), mat='an_glow_w')
            else:
                m.box((s - 0.04, s - 0.04, 0.04), at=(x, y, 0.05), mat='an_stain' if seed == 3 and rnd.random() < 0.12 else 'an_tile')
    for k in range(n + 1):
        m.box((0.04, C, 0.05), at=(-2 + k * s, 0, 0.03), mat='an_grey')
        m.box((C, 0.04, 0.05), at=(0, -2 + k * s, 0.03), mat='an_grey')
    if seed == 3:                                        # what is above a drop ceiling: a duct and a hanging cable
        m.box((0.6, C, 0.3), at=(-0.6, 0, 0.3), mat='an_steel')
        cable(m, None, (0.9, -1.6, 0.36), (0.6, -1.2, -0.5), sag=0.1, r=0.018, mat='cable')
    return m


def ceil_an_white(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.4), mat='an_white2')
    m.box((C - 0.06, C - 0.06, 0.08), at=(0, 0, 0.26), mat='an_white', bevel=0.04)
    if seed == 2:                                        # a ring light
        m.ring(1.0, 0.07, at=(0, 0, 0.2), mat='an_glow_w', seg=28, tseg=6)
        m.cyl(0.86, 0.04, at=(0, 0, 0.22), mat='an_white2', seg=28)
    return m


def ceil_an_core(seed):
    m = Mesh('ceil')
    m.box((C, C, 0.2), at=(0, 0, 0.4), mat='an_dark')
    for i in range(2):
        for j in range(2):
            m.box((1.94, 1.94, 0.06), at=(-1 + i * 2, -1 + j * 2, 0.27), mat='an_black', bevel=0.02)
    for k in range(3):
        cable(m, None, (-2, -1.2 + k * 1.2, 0.22), (2, -1.0 + k * 1.1, 0.22), sag=0.16, r=0.035, mat='cable' if k != 1 else 'an_glow_p')
    if seed == 2:
        m.cyl(0.3, 0.1, at=(0, 0, 0.2), mat='an_glow_p', seg=14)
    return m


# ---------------------------------------------------------------- the force field (a door: it drops into the floor)
def door_an_field():
    fr = Mesh('frame')
    _frame(fr, 'an_dark', 'an_black')
    for s in (-1, 1):
        fr.cyl(0.09, DH, at=(s * (DW / 2 + 0.06), 0, DH / 2), mat='an_chrome', seg=8)
        for z in (0.4, DH / 2, DH - 0.4):
            fr.cyl(0.12, 0.1, at=(s * (DW / 2 + 0.06), 0, z), mat='an_glow_p', seg=10)
    objs = [fr.to_object()]
    m = Mesh('field')
    m.box((DW, 0.06, DH), at=(0, 0, DH / 2), mat='an_field')
    for k in range(7):
        m.box((DW, 0.07, 0.02), at=(0, 0, 0.3 + k * 0.48), mat='an_glow_p')
    objs.append(m.to_object(origin=(0, 0, 0)))
    return dict(objects=objs, meta=dict(type='door', time=0.5, sound='door_iris', parts={'field': dict(move=(0, 0, -(DH + 0.2)))}))


# ---------------------------------------------------------------- furniture (stands at the origin, front at -Y)
def P(m, name, solid=None, **meta):
    d = dict(type='prop', name=name, **meta)
    if solid:
        d['solid'] = solid
    return dict(objects=[m.to_object()], meta=d)


def LAMP(at, color=(1.0, 0.9, 0.7), energy=0.7, rng=4.5):
    return dict(color=color, energy=energy, range=rng, at=at)


def an_reception():
    """The reception desk: a long counter with a raised plinth in the middle. Something sits on the plinth."""
    m = Mesh('an_reception')
    m.box((4.6, 0.9, 1.0), at=(0, 0, 0.5), mat='an_beige2', bevel=0.03)
    m.box((4.8, 1.1, 0.07), at=(0, 0, 1.04), mat='an_grey', bevel=0.02)
    m.box((4.6, 0.04, 0.5), at=(0, -0.47, 0.6), mat='an_dark')
    m.box((4.4, 0.02, 0.04), at=(0, -0.5, 0.82), mat='an_glow_p')
    m.box((1.2, 0.03, 0.26), at=(0, -0.5, 0.56), mat='an_ad')
    for s in (-1, 1):
        m.box((0.5, 0.36, 0.34), at=(s * 1.7, 0.1, 1.25), rot=(-12, 0, 0), mat='an_dark', bevel=0.03)
        m.box((0.4, 0.02, 0.24), at=(s * 1.7, -0.085, 1.27), rot=(-12, 0, 0), mat='screen_dead' if s > 0 else 'an_term')
        m.box((0.3, 0.2, 0.04), at=(s * 1.0, -0.2, 1.1), mat='an_paper')
    m.cyl(0.05, 0.07, at=(0.75, -0.3, 1.11), mat='an_gold', seg=10)                                         # the bell
    return P(m, 'Reception Desk', (4.8, 1.1, 1.1), light=LAMP((0, -1.0, 0.9), (1.0, 0.3, 0.85), 0.6, 4.5))


def _poster(name, ground, band, title):
    def make():
        m = Mesh(name)
        m.push(T(0, -0.09, 2.15))                          # on a backing board: walls have panels and rails that a flat sheet would sink into
        m.box((1.5, 0.13, 2.0), at=(0, 0.025, 0), mat='an_grey', bevel=0.015)
        m.box((1.38, 0.012, 1.88), at=(0, -0.046, 0), mat=ground)
        m.box((1.38, 0.008, 0.42), at=(0, -0.054, 0.62), mat=band)
        m.cyl(0.32, 0.008, at=(0, -0.054, -0.12), rot=(90, 0, 0), mat=band, seg=20)                        # the picture is always a circle with a face
        m.cyl(0.2, 0.008, at=(0, -0.06, -0.12), rot=(90, 0, 0), mat=ground, seg=16)
        for k in range(3):
            m.box((1.0 - k * 0.22, 0.008, 0.035), at=(0, -0.054, -0.6 - k * 0.09), mat='an_paper')
        m.pop()
        return dict(objects=[m.to_object()], meta=dict(type='prop', name=title, mount='wall'))
    return make


def an_cubicle():
    """A desk in a three-sided fabric partition: a dead monitor, a keyboard, a mug, somebody's plant."""
    m = Mesh('an_cubicle')
    m.box((2.2, 0.08, 1.5), at=(0, 0.75, 0.75), mat='an_cloth', bevel=0.02)
    for s in (-1, 1):
        m.box((0.08, 1.6, 1.5), at=(s * 1.1, 0.0, 0.75), mat='an_cloth', bevel=0.02)
        m.box((0.1, 1.62, 0.05), at=(s * 1.1, 0.0, 1.52), mat='an_grey')
    m.box((2.3, 0.1, 0.05), at=(0, 0.75, 1.52), mat='an_grey')
    m.box((2.1, 0.8, 0.05), at=(0, 0.3, 0.76), mat='an_beige', bevel=0.012)
    for s in (-1, 1):
        m.box((0.05, 0.75, 0.74), at=(s * 0.95, 0.3, 0.37), mat='an_grey')
    m.box((0.5, 0.6, 0.6), at=(-0.65, 0.3, 0.3), mat='an_grey', bevel=0.015)                               # drawers
    m.box((0.56, 0.42, 0.42), at=(0.1, 0.42, 1.06), mat='an_beige2', bevel=0.04)                           # the monitor
    m.box((0.44, 0.02, 0.32), at=(0.1, 0.2, 1.07), mat='screen_dead')
    m.box((0.46, 0.17, 0.025), at=(0.1, 0.02, 0.795), mat='an_beige2')
    m.cyl(0.045, 0.1, at=(0.7, 0.1, 0.835), mat='an_paper', seg=10)
    m.box((0.3, 0.012, 0.22), at=(-0.5, 0.7, 1.2), mat='an_paper')                                         # pinned to the partition
    m.box((0.2, 0.012, 0.2), at=(0.75, 0.7, 1.15), mat='an_yellow')
    m.cyl(0.26, 0.06, at=(0.15, -0.6, 0.46), mat='an_cloth', seg=12)                                       # the chair
    m.cyl(0.03, 0.42, at=(0.15, -0.6, 0.22), mat='an_chrome', seg=6)
    m.box((0.44, 0.07, 0.5), at=(0.15, -0.82, 0.78), mat='an_cloth', bevel=0.04)
    for k in range(5):
        a = k * 2 * math.pi / 5
        m.box((0.3, 0.04, 0.04), at=(0.15 + 0.14 * math.cos(a), -0.6 + 0.14 * math.sin(a), 0.03), rot=(0, 0, math.degrees(a)), mat='an_dark')
    return P(m, 'Cubicle', (2.3, 1.55, 1.7))


def an_copier():
    m = Mesh('an_copier')
    m.box((1.0, 0.8, 0.95), at=(0, 0, 0.48), mat='an_beige', bevel=0.03)
    m.box((1.0, 0.7, 0.1), at=(0, 0.03, 1.0), rot=(0, 0, 0), mat='an_beige2', bevel=0.02)
    m.box((0.5, 0.3, 0.04), at=(-0.75, 0, 0.7), mat='an_beige2')
    m.box((0.36, 0.2, 0.01), at=(-0.75, 0, 0.725), mat='an_paper')
    m.box((0.3, 0.02, 0.1), at=(0.25, -0.36, 1.0), rot=(-30, 0, 0), mat='an_term')
    m.box((0.8, 0.02, 0.2), at=(0, -0.405, 0.3), mat='an_grey')
    return P(m, 'Photocopier', (1.3, 1.1, 0.85))


def an_filing():
    m = Mesh('an_filing')
    for i in range(2):
        m.box((0.6, 0.7, 1.5), at=(-0.31 + i * 0.62, 0.02, 0.75), mat='an_grey', bevel=0.015)
        for j in range(4):
            open_ = 0.22 if (i, j) == (1, 2) else 0.0
            m.box((0.52, 0.03 + open_, 0.32), at=(-0.31 + i * 0.62, -0.34 - open_ / 2, 0.2 + j * 0.36), mat='an_beige2', bevel=0.01)
            m.box((0.16, 0.02, 0.03), at=(-0.31 + i * 0.62, -0.365 - open_, 0.26 + j * 0.36), mat='an_chrome')
    m.box((0.4, 0.3, 0.3), at=(-0.3, 0, 1.66), mat='an_card', bevel=0.01)
    return P(m, 'Filing Cabinets', (1.3, 1.85, 0.8))


def an_whiteboard():
    m = Mesh('an_whiteboard')
    m.push(T(0, 0, 2.0))
    m.box((2.6, 0.05, 1.5), at=(0, -0.025, 0), mat='an_grey', bevel=0.015)
    m.box((2.46, 0.012, 1.36), at=(0, -0.052, 0), mat='an_paper')
    m.box((2.6, 0.1, 0.04), at=(0, -0.06, -0.76), mat='an_grey')
    for k, c in enumerate(('an_red', 'an_navy', 'an_dark')):
        m.cyl(0.015, 0.12, at=(-0.9 + k * 0.2, -0.08, -0.73), rot=(0, 90, 0), mat=c, seg=5)
    m.pop()
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Whiteboard', mount='wall'))


def an_conf():
    """The meeting room table: long, veneered, eight chairs and nobody."""
    m = Mesh('an_conf')
    m.box((3.6, 1.4, 0.07), at=(0, 0, 0.76), mat='an_wood', bevel=0.03)
    for s in (-1, 1):
        m.box((0.5, 0.9, 0.72), at=(s * 1.2, 0, 0.36), mat='an_brown', bevel=0.02)
    m.box((0.4, 0.3, 0.012), at=(0.6, 0.1, 0.802), rot=(0, 0, 14), mat='an_paper')
    m.box((0.5, 0.36, 0.012), at=(-0.3, -0.1, 0.802), rot=(0, 0, -8), mat='an_paper')
    for i in range(3):
        for s in (-1, 1):
            x, y = -1.2 + i * 1.2, s * 1.05
            m.cyl(0.24, 0.06, at=(x, y, 0.46), mat='an_leather', seg=10)
            m.cyl(0.03, 0.42, at=(x, y, 0.22), mat='an_chrome', seg=6)
            m.box((0.44, 0.07, 0.6), at=(x, y + s * 0.22, 0.84), rot=(s * 8, 0, 0), mat='an_leather', bevel=0.04)
    return P(m, 'Conference Table', (3.7, 1.15, 2.7))


def an_cooler():
    m = Mesh('an_cooler')
    m.box((0.4, 0.4, 1.0), at=(0, 0, 0.5), mat='an_white', bevel=0.03)
    m.cyl(0.16, 0.45, at=(0, 0, 1.24), mat='pane', seg=12)
    m.cyl(0.1, 0.06, at=(0, 0, 1.03), mat='an_white2', seg=10)
    m.box((0.06, 0.06, 0.05), at=(-0.08, -0.22, 0.8), mat='an_navy')
    m.box((0.06, 0.06, 0.05), at=(0.08, -0.22, 0.8), mat='an_red')
    return P(m, 'Water Cooler', (0.5, 1.5, 0.5))


def an_slot():
    """A slot machine. Somebody has been feeding it the same credit since the war."""
    m = Mesh('an_slot')
    m.box((0.9, 0.7, 1.0), at=(0, 0, 0.5), mat='an_red', bevel=0.04)
    m.box((0.9, 0.6, 0.9), at=(0, 0.05, 1.45), mat='an_dark', bevel=0.06)
    m.box((0.7, 0.03, 0.34), at=(0, -0.26, 1.45), mat='an_paper')
    for i in range(3):
        m.box((0.2, 0.012, 0.3), at=(-0.23 + i * 0.23, -0.28, 1.45), mat=('an_glow_r', 'an_glow_y', 'an_glow_r')[i])
    m.box((0.78, 0.03, 0.2), at=(0, -0.26, 1.78), mat='an_glow_y')
    m.box((0.7, 0.22, 0.06), at=(0, -0.4, 1.02), rot=(-14, 0, 0), mat='an_chrome')
    m.box((0.5, 0.16, 0.12), at=(0, -0.38, 0.5), mat='an_chrome', bevel=0.02)
    m.cyl(0.025, 0.5, at=(0.52, -0.05, 1.3), mat='an_chrome', seg=6)
    m.ball(0.07, at=(0.52, -0.05, 1.58), mat='an_red', seg=8)
    return P(m, 'Slot Machine', (1.05, 2.0, 0.8), light=LAMP((0, -0.7, 1.5), (1.0, 0.75, 0.2), 0.7, 4.0))


def an_counter():
    """The Coffee Shop's counter: wood front, an espresso machine that is all pipes, a cake dome with nothing under it."""
    m = Mesh('an_counter')
    m.box((3.6, 0.8, 1.0), at=(0, 0, 0.5), mat='an_brown', bevel=0.02)
    for i in range(12):
        m.box((0.26, 0.03, 0.9), at=(-1.65 + i * 0.3, -0.41, 0.5), mat='an_wood', bevel=0.01)
    m.box((3.8, 1.0, 0.07), at=(0, 0, 1.04), mat='an_cream', bevel=0.02)
    m.box((0.8, 0.5, 0.5), at=(-1.1, 0.12, 1.33), mat='an_chrome', bevel=0.04)                             # the machine
    for k in range(2):
        m.cyl(0.03, 0.2, at=(-1.3 + k * 0.4, -0.2, 1.2), mat='an_dark', seg=6)
        m.cyl(0.07, 0.05, at=(-1.3 + k * 0.4, -0.2, 1.3), mat='an_dark', seg=8)
    m.cyl(0.06, 0.3, at=(-0.8, 0.2, 1.72), mat='an_gold', seg=8)
    m.cyl(0.25, 0.02, at=(0.3, 0, 1.09), mat='an_paper', seg=14)                                           # the cake stand
    m.ball(0.24, at=(0.3, 0, 1.1), mat='pane', seg=12, scale=(1, 1, 0.8))
    for k in range(3):
        m.cyl(0.05, 0.11, at=(1.0 + k * 0.14, 0.2, 1.13), mat='an_paper', seg=8)
    return P(m, 'Coffee Counter', (3.8, 1.2, 1.0), light=LAMP((0, -0.9, 1.5), (1.0, 0.8, 0.5), 0.6, 4.5))


def an_till():
    """The till, and beside it the tip jar: a smiling cup marked TIPS = TEAMWORK."""
    m = Mesh('an_till')
    m.box((1.2, 0.8, 1.0), at=(0, 0, 0.5), mat='an_brown', bevel=0.02)
    for i in range(4):
        m.box((0.26, 0.03, 0.9), at=(-0.45 + i * 0.3, -0.41, 0.5), mat='an_wood', bevel=0.01)
    m.box((1.3, 1.0, 0.07), at=(0, 0, 1.04), mat='an_cream', bevel=0.02)
    m.box((0.5, 0.45, 0.24), at=(-0.25, 0.05, 1.2), mat='an_dark', bevel=0.03)
    m.box((0.4, 0.2, 0.2), at=(-0.25, 0.12, 1.4), rot=(-20, 0, 0), mat='an_dark', bevel=0.02)
    m.box((0.3, 0.012, 0.1), at=(-0.25, 0.01, 1.44), rot=(-20, 0, 0), mat='an_term')
    m.cyl(0.1, 0.2, at=(0.35, -0.15, 1.18), mat='an_yellow', seg=12)                                       # the jar
    m.ring(0.06, 0.015, at=(0.47, -0.15, 1.18), rot=(90, 0, 0), mat='an_yellow', seg=10, tseg=4)
    m.cyl(0.07, 0.012, at=(0.35, -0.15, 1.29), mat='an_gold', seg=10)
    return P(m, 'Till and Tip Jar', (1.3, 1.5, 1.0))


def an_safe():
    """A wall safe behind a painting of a sailboat. The painting swings away with the door."""
    m = Mesh('an_safe')
    m.push(T(0, 0, 1.7))
    m.box((1.1, 0.5, 0.9), at=(0, 0.02, 0), mat='an_dark', bevel=0.02)
    m.box((0.9, 0.3, 0.7), at=(0, -0.12, 0), mat='an_black')
    m.box((0.6, 0.2, 0.04), at=(0, -0.1, -0.1), mat='an_steel')
    m.pop()
    d = Mesh('door')
    d.push(T(0, 0, 1.7))
    d.box((1.0, 0.08, 0.8), at=(0, -0.27, 0), mat='an_steel', bevel=0.02)
    d.cyl(0.14, 0.05, at=(0.1, -0.33, 0), rot=(90, 0, 0), mat='an_chrome', seg=14)
    d.box((0.24, 0.03, 0.03), at=(0.1, -0.36, 0), mat='an_chrome')
    d.box((1.5, 0.04, 1.15), at=(0, -0.34, 0.05), mat='an_gold', bevel=0.03)                               # the painting, on the door
    d.box((1.34, 0.012, 1.0), at=(0, -0.365, 0.05), mat='an_navy')
    d.box((1.34, 0.008, 0.36), at=(0, -0.372, -0.27), mat='an_ad2')
    d.prism([(0, 0), (0.34, 0), (0, 0.5)], 0.008, at=(-0.05, -0.376, -0.1), rot=(90, 0, 0), mat='an_paper')
    d.box((0.5, 0.008, 0.07), at=(0.05, -0.376, -0.14), mat='an_brown')
    d.pop()
    return dict(objects=[m.to_object(), d.to_object(origin=(-0.5, -0.27, 1.7))],
                meta=dict(type='prop', name='Wall Safe', mount='wall', time=0.6, parts={'door': dict(rot_axis=(0, 0, 1), rot_deg=-115)}))


def an_body():
    """Someone who got this far and no farther: a scavenger in patched leathers, face down, a satchel under one arm."""
    m = Mesh('an_body')
    m.box((0.5, 0.7, 0.2), at=(0, 0.1, 0.12), rot=(0, 0, 12), mat='an_leather', bevel=0.08)                # the back
    m.ball(0.14, at=(-0.14, 0.62, 0.13), mat='an_skin', seg=8, scale=(1, 1.1, 0.8))
    m.box((0.2, 0.22, 0.08), at=(-0.14, 0.62, 0.2), mat='an_cloth', bevel=0.04)                            # the hood
    m.tube([(0.2, 0.3, 0.12), (0.5, 0.55, 0.07), (0.45, 0.85, 0.06)], 0.06, mat='an_leather', seg=6)       # an arm reaching
    m.tube([(-0.25, 0.3, 0.12), (-0.5, 0.1, 0.08), (-0.4, -0.15, 0.07)], 0.06, mat='an_leather', seg=6)
    m.tube([(0.1, -0.25, 0.1), (0.22, -0.7, 0.08), (0.15, -1.1, 0.07)], 0.075, mat='an_cloth', seg=6)      # legs
    m.tube([(-0.12, -0.25, 0.1), (-0.3, -0.65, 0.08), (-0.55, -0.95, 0.07)], 0.075, mat='an_cloth', seg=6)
    m.box((0.16, 0.26, 0.1), at=(0.15, -1.2, 0.06), mat='an_dark', bevel=0.03)
    m.box((0.16, 0.26, 0.1), at=(-0.62, -1.05, 0.06), rot=(0, 0, 40), mat='an_dark', bevel=0.03)
    m.box((0.36, 0.3, 0.14), at=(-0.52, 0.0, 0.08), rot=(0, 0, 20), mat='an_card', bevel=0.04)             # the satchel
    m.box((0.14, 0.1, 0.008), at=(0.47, 0.9, 0.012), rot=(0, 0, 30), mat='an_paper')                       # a note in the fist
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='A Dead Scavenger'))


def an_box():
    """A cardboard box of Good Job Cookies."""
    m = Mesh('an_box')
    m.box((0.7, 0.5, 0.4), at=(0, 0, 0.2), mat='an_card', bevel=0.01)
    lid = Mesh('lid')
    lid.box((0.7, 0.5, 0.03), at=(0, 0, 0.415), mat='an_card')
    lid.box((0.4, 0.2, 0.006), at=(0, 0, 0.432), mat='an_glow_p')
    return dict(objects=[m.to_object(), lid.to_object(origin=(0, 0.25, 0.4))],
                meta=dict(type='prop', name='Box of Cookies', time=0.4, parts={'lid': dict(rot_axis=(1, 0, 0), rot_deg=-110)}))


def an_test():
    """The test chamber console: three big buttons under a cracked cover, in cheerful agency type."""
    m = Mesh('an_test')
    m.box((1.5, 0.7, 0.9), at=(0, 0.05, 0.45), mat='an_white', bevel=0.06)
    m.box((1.6, 0.9, 0.2), at=(0, -0.02, 1.0), rot=(-18, 0, 0), mat='an_white2', bevel=0.05)
    for i, c in enumerate(('an_glow_g', 'an_glow_b', 'an_glow_r')):
        m.cyl(0.14, 0.07, at=(-0.45 + i * 0.45, -0.12, 1.14), rot=(-18, 0, 0), mat=c, seg=14)
        m.box((0.3, 0.1, 0.008), at=(-0.45 + i * 0.45, -0.38, 1.03), rot=(-18, 0, 0), mat='an_paper')
    m.box((1.4, 0.6, 0.012), at=(0, -0.1, 1.25), rot=(-18, 0, 0), mat='pane')
    m.box((0.2, 0.2, 0.004), at=(0.5, 0.1, 1.31), rot=(-18, 0, 12), mat='an_yellow')                       # PLEASE READ THE NOTES FIRST - G.
    m.box((1.3, 0.02, 0.03), at=(0, -0.31, 0.7), mat='an_glow_c')
    return P(m, 'Test Chamber Console', (1.6, 1.3, 0.9), light=LAMP((0, -0.6, 1.4), (0.6, 0.85, 1.0), 0.7, 4.5))


def an_holo():
    """SHOWCASE: a hologram of a happy customer, who thanks you for your business, for ever."""
    m = Mesh('an_holo')
    m.cyl(0.6, 0.08, at=(0, 0, 0.04), mat='an_white2', seg=20)
    m.ring(0.5, 0.03, at=(0, 0, 0.09), mat='an_glow_c', seg=24, tseg=4)
    m.cyl(0.26, 0.9, at=(0, 0, 1.1), mat='an_holo', seg=12, r2=0.2)                                        # body
    m.ball(0.17, at=(0, 0, 1.8), mat='an_holo', seg=10)
    m.tube([(0.22, 0, 1.45), (0.5, -0.1, 1.7), (0.56, -0.16, 2.05)], 0.05, mat='an_holo', seg=6)           # waving
    m.tube([(-0.22, 0, 1.45), (-0.34, -0.05, 1.1), (-0.3, -0.2, 0.9)], 0.05, mat='an_holo', seg=6)
    m.cyl(0.2, 0.55, at=(0, 0, 0.4), mat='an_holo', seg=10, r2=0.24)
    m.tube([(-0.08, -0.15, 1.76), (0, -0.18, 1.72), (0.08, -0.15, 1.76)], 0.012, mat='an_glow_c', seg=4)   # the smile
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='A Happy Customer', light=LAMP((0, 0, 1.4), (0.4, 0.92, 1.0), 1.2, 6.0)))


def an_floorsafe():
    """ARCHIVE: the auditors' safe, on the hydraulic column that brought it up through the floor."""
    m = Mesh('an_floorsafe')
    m.cyl(0.5, 0.5, at=(0, 0, 0.25), mat='an_chrome', seg=16)
    m.cyl(0.62, 0.06, at=(0, 0, 0.03), mat='hazard', seg=16)
    m.box((1.0, 0.9, 0.9), at=(0, 0, 0.95), mat='an_steel', bevel=0.04)
    m.cyl(0.16, 0.05, at=(0.12, -0.46, 0.95), rot=(90, 0, 0), mat='an_chrome', seg=14)
    m.box((0.3, 0.03, 0.03), at=(0.12, -0.5, 0.95), mat='an_chrome')
    m.box((0.26, 0.02, 0.1), at=(-0.28, -0.46, 1.2), mat='an_term')
    return P(m, "The Auditors' Safe", (1.1, 1.45, 1.0))


def an_crate():
    """A packing crate with a stencilled label and a lid that levers up."""
    m = Mesh('an_crate')
    m.box((1.3, 1.0, 0.9), at=(0, 0, 0.45), mat='an_card', bevel=0.012)
    for s in (-1, 1):
        m.box((0.1, 1.04, 0.94), at=(s * 0.55, 0, 0.46), mat='an_wood')
    m.box((0.7, 0.012, 0.26), at=(0, -0.506, 0.5), mat='an_paper')
    m.box((0.5, 0.008, 0.05), at=(0, -0.514, 0.54), mat='an_dark')
    m.box((0.36, 0.008, 0.04), at=(-0.06, -0.514, 0.45), mat='an_dark')
    lid = Mesh('lid')
    lid.box((1.34, 1.04, 0.06), at=(0, 0, 0.93), mat='an_wood', bevel=0.01)
    return dict(objects=[m.to_object(), lid.to_object(origin=(0, 0.52, 0.9))],
                meta=dict(type='prop', name='Packing Crate', solid=(1.3, 0.95, 1.0), time=0.5, parts={'lid': dict(rot_axis=(1, 0, 0), rot_deg=-100)}))


def _mist(name, band, title):
    def make():
        m = Mesh(name)
        m.cyl(0.42, 0.12, at=(0, 0, 0.06), mat='an_white2', seg=16)
        m.cyl(0.3, 1.1, at=(0, 0, 0.67), mat='an_white', seg=16, r2=0.24)
        m.cyl(0.31, 0.16, at=(0, 0, 0.75), mat=band, seg=16, caps=False)
        m.cyl(0.2, 0.1, at=(0, 0, 1.27), mat='an_dark', seg=12)
        for k in range(6):
            a = k * math.pi / 3
            m.box((0.05, 0.14, 0.2), at=(0.26 * math.cos(a), 0.26 * math.sin(a), 0.3), rot=(0, 0, math.degrees(a) + 90), mat='an_dark')
        return P(m, title, (0.8, 1.4, 0.8))
    return make


def an_tablet():
    """The Personal Shopper Tablet, on its stand. It knows what you want. It has always known."""
    m = Mesh('an_tablet')
    m.cyl(0.32, 0.06, at=(0, 0, 0.03), mat='an_white2', seg=16)
    m.tube([(0, 0, 0.05), (0, 0.06, 0.7), (0, -0.04, 1.15)], 0.04, mat='an_chrome', seg=8)
    m.box((0.62, 0.05, 0.86), at=(0, -0.08, 1.4), rot=(-14, 0, 0), mat='an_white', bevel=0.04)
    m.box((0.52, 0.012, 0.72), at=(0, -0.112, 1.41), rot=(-14, 0, 0), mat='an_ad')
    m.cyl(0.03, 0.012, at=(0, -0.02, 1.0), rot=(76, 0, 0), mat='an_glow_p', seg=8)
    return P(m, 'Personal Shopper Tablet', (0.7, 1.9, 0.6), light=LAMP((0, -0.6, 1.4), (1.0, 0.3, 0.85), 0.6, 3.5))


def an_station():
    """The Security Station console: a wall of feeds over a desk of switches under plastic covers."""
    m = Mesh('an_station')
    m.box((3.0, 0.9, 0.85), at=(0, 0.05, 0.43), mat='an_steel', bevel=0.03)
    m.box((3.1, 1.1, 0.14), at=(0, -0.05, 0.94), rot=(-10, 0, 0), mat='an_dark', bevel=0.03)
    m.box((3.0, 0.3, 1.5), at=(0, 0.38, 1.8), mat='an_dark', bevel=0.03)
    for i in range(4):
        for j in range(2):
            mat = 'an_term' if (i + j) % 3 else ('an_ad' if i == 1 else 'screen_dead')
            m.box((0.64, 0.02, 0.56), at=(-1.08 + i * 0.72, 0.22, 1.45 + j * 0.68), mat=mat)
    for i in range(8):
        m.box((0.16, 0.16, 0.05), at=(-1.2 + i * 0.34, -0.25, 1.01), rot=(-10, 0, 0), mat=('an_glow_r', 'an_grey', 'an_glow_y', 'an_grey')[i % 4])
        m.box((0.2, 0.2, 0.08), at=(-1.2 + i * 0.34, -0.25, 1.03), rot=(-10, 0, 0), mat='pane')
    return P(m, 'Security Station Console', (3.1, 2.6, 1.1), light=LAMP((0, -0.9, 1.6), (1.0, 0.48, 0.35), 0.8, 5.5))


def an_gantry():
    """The Robot Repair Bay: a track, an arm, and a maintenance robot being lovingly rebuilt out of three others."""
    m = Mesh('an_gantry')
    m.box((3.2, 1.6, 0.16), at=(0, 0, 0.08), mat='an_dark', bevel=0.02)
    for k in range(8):
        m.box((0.3, 0.14, 0.008), at=(-1.4 + k * 0.4, -0.72, 0.164), rot=(0, 0, 35), mat='hazard')
    for s in (-1, 1):
        m.box((0.16, 0.16, 3.0), at=(s * 1.5, 0.6, 1.6), mat='an_steel')
    m.box((3.2, 0.2, 0.2), at=(0, 0.6, 3.1), mat='an_steel')
    m.box((0.5, 0.4, 0.3), at=(0.3, 0.6, 2.86), mat='hazard', bevel=0.03)                                  # the carriage
    m.tube([(0.3, 0.6, 2.7), (0.3, 0.1, 2.3), (0.0, -0.2, 1.7)], 0.07, mat='an_steel', seg=8)              # the arm
    m.ball(0.12, at=(0.3, 0.1, 2.3), mat='an_dark', seg=8)
    m.box((0.2, 0.1, 0.24), at=(0.0, -0.22, 1.6), mat='an_chrome', bevel=0.02)
    m.box((0.9, 0.7, 0.7), at=(-0.1, 0.0, 0.7), mat='an_grey', bevel=0.1)                                  # the patient: half a robot
    m.ball(0.3, at=(-0.1, -0.05, 1.3), mat='an_steel', seg=10, scale=(1, 1, 0.8))
    m.cyl(0.08, 0.04, at=(-0.2, -0.33, 1.32), rot=(90, 0, 0), mat='an_glow_y', seg=8)                      # one eye
    m.tube([(0.35, 0, 0.9), (0.8, -0.1, 0.6), (0.9, -0.3, 0.3)], 0.06, mat='an_steel', seg=6)
    m.box((0.5, 0.4, 0.2), at=(-1.0, -0.3, 0.26), mat='an_grey', bevel=0.03)                               # parts of the other three
    m.cyl(0.14, 0.4, at=(1.0, 0.3, 0.3), rot=(0, 90, 20), mat='an_steel', seg=8)
    return P(m, 'Repair Gantry', (3.2, 3.2, 1.6), solids=[[0, 0.08, 0, 3.2, 0.16, 1.6], [0, 0.8, 0, 1.2, 1.6, 0.9]], light=LAMP((0, -0.6, 2.4), (0.9, 0.75, 0.2), 0.9, 6.0))


def an_core():
    """The inner core: a drum of humming glass and pink light, wired into the floor, the ceiling and every screen in the building."""
    m = Mesh('an_core')
    m.cyl(1.3, 0.3, at=(0, 0, 0.15), mat='an_dark', seg=24)
    m.cyl(1.0, 0.2, at=(0, 0, 0.4), mat='an_black', seg=24)
    m.cyl(0.85, 2.0, at=(0, 0, 1.5), mat='an_coreglass', seg=24)
    m.cyl(0.45, 2.0, at=(0, 0, 1.5), mat='an_glow_p', seg=16)
    m.cyl(1.0, 0.2, at=(0, 0, 2.6), mat='an_black', seg=24)
    m.cyl(0.5, 1.2, at=(0, 0, 3.3), mat='an_dark', seg=16)
    for k in range(8):
        a = k * math.pi / 4
        cable(m, None, (0.9 * math.cos(a), 0.9 * math.sin(a), 2.7), (1.9 * math.cos(a), 1.9 * math.sin(a), 3.9), sag=0.25, r=0.04, mat='cable' if k % 2 else 'an_glow_p')
        m.tube([(1.2 * math.cos(a), 1.2 * math.sin(a), 0.1), (1.9 * math.cos(a), 1.9 * math.sin(a), 0.04)], 0.05, mat='cable', seg=6)
    ring = Mesh('ring')
    for k in range(6):
        a = k * math.pi / 3
        ring.box((0.5, 0.12, 0.26), at=(1.08 * math.cos(a), 1.08 * math.sin(a), 1.5), rot=(0, 0, math.degrees(a) + 90), mat='an_glow_p')
    ring.ring(1.08, 0.04, at=(0, 0, 1.5), mat='an_chrome', seg=28, tseg=5)
    return dict(objects=[m.to_object(), ring.to_object(origin=(0, 0, 1.5))],
                meta=dict(type='prop', name='The Inner Core', solid=(2.4, 3.9, 2.4), spin={'ring': 40}, light=LAMP((0, -1.6, 1.6), (1.0, 0.29, 0.85), 2.2, 11.0)))


def an_lectern():
    """The core's public interface: a lectern with a slot the width of a termination order."""
    m = Mesh('an_lectern')
    m.box((0.5, 0.4, 1.0), at=(0, 0.05, 0.5), mat='an_black', bevel=0.04)
    m.box((0.9, 0.6, 0.1), at=(0, -0.05, 1.08), rot=(-22, 0, 0), mat='an_dark', bevel=0.03)
    m.box((0.74, 0.44, 0.012), at=(0, -0.07, 1.14), rot=(-22, 0, 0), mat='an_ad')
    m.box((0.4, 0.03, 0.02), at=(0, -0.17, 0.8), mat='an_glow_p')
    m.box((0.36, 0.04, 0.012), at=(0, -0.16, 0.7), mat='an_paper')
    return P(m, 'Core Interface', (0.9, 1.35, 0.7), light=LAMP((0, -0.6, 1.3), (1.0, 0.29, 0.85), 0.7, 4.0))


def an_tv():
    m = Mesh('an_tv')
    m.push(T(0, 0, 2.4))
    m.box((1.5, 0.3, 1.0), at=(0, -0.15, 0), mat='an_dark', bevel=0.04)
    m.box((1.3, 0.02, 0.8), at=(0, -0.31, 0), mat='an_term')
    m.box((0.3, 0.2, 0.2), at=(0, -0.05, 0.6), mat='an_steel')
    m.pop()
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Video Feed', mount='wall', light=LAMP((0, -0.8, 2.4), (0.3, 1.0, 0.45), 0.5, 4.0)))


def an_sign():
    """A safety sign on a folding stand. Maintenance robots stop to read these. They never stop reading them."""
    m = Mesh('an_sign')
    for s in (-1, 1):
        m.box((0.6, 0.03, 0.9), at=(0, s * 0.15, 0.44), rot=(s * 18, 0, 0), mat='an_yellow', bevel=0.01)
        m.box((0.36, 0.012, 0.3), at=(0, s * 0.2, 0.5), rot=(s * 18, 0, 0), mat='an_dark')
    return P(m, 'Safety Sign', (0.6, 0.9, 0.5))


def trap_plate():
    """A pressure plate: a floor panel a finger's width proud, with a courtesy-yellow edge."""
    m = Mesh('trap_plate')
    m.box((3.4, 3.4, 0.03), at=(0, 0, 0.015), mat='an_grey', bevel=0.008)
    for s in (-1, 1):
        m.box((3.4, 0.1, 0.006), at=(0, s * 1.6, 0.033), mat='hazard')
        m.box((0.1, 3.4, 0.006), at=(s * 1.6, 0, 0.033), mat='hazard')
    return dict(objects=[m.to_object()], meta=dict(type='prop'))


def trap_dart():
    """A dart port: a brass grille in a wall plate, courteous."""
    m = Mesh('trap_dart')
    m.box((0.5, 0.06, 0.5), at=(0, -0.03, 0), mat='an_grey', bevel=0.015)
    for i in range(3):
        for j in range(3):
            m.cyl(0.035, 0.05, at=(-0.13 + i * 0.13, -0.06, -0.13 + j * 0.13), rot=(90, 0, 0), mat='an_dark', seg=6)
    m.box((0.3, 0.012, 0.05), at=(0, -0.066, 0.21), mat='an_glow_y')
    return dict(objects=[m.to_object()], meta=dict(type='prop'))


# ---------------------------------------------------------------- things to carry (small, centred, standing on z=0)
def _item(m):
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def item_chip():
    m = Mesh('item_chip')
    m.cyl(0.11, 0.03, at=(0, 0, 0.12), rot=(90, 0, 0), mat='an_gold', seg=16)
    m.cyl(0.075, 0.035, at=(0, 0, 0.12), rot=(90, 0, 0), mat='an_red', seg=12)
    m.cyl(0.03, 0.04, at=(0, 0, 0.12), rot=(90, 0, 0), mat='an_gold', seg=8)
    return _item(m)


def item_badge():
    m = Mesh('item_badge')
    m.box((0.16, 0.012, 0.22), at=(0, 0, 0.13), mat='an_paper')
    m.box((0.16, 0.014, 0.05), at=(0, 0, 0.215), mat='an_glow_b')
    m.cyl(0.04, 0.016, at=(0, 0, 0.13), rot=(90, 0, 0), mat='an_skin', seg=10)
    m.tube([(0, 0, 0.24), (-0.05, 0, 0.34), (0.05, 0, 0.34), (0, 0, 0.24)], 0.006, mat='an_navy', seg=4)
    return _item(m)


def item_order():
    m = Mesh('item_order')
    m.box((0.2, 0.01, 0.27), at=(0, 0, 0.15), rot=(0, 0, 0), mat='an_paper')
    m.box((0.2, 0.012, 0.04), at=(0, 0, 0.26), mat='an_red')
    for k in range(4):
        m.box((0.15, 0.012, 0.01), at=(0, 0, 0.2 - k * 0.035), mat='an_dark')
    m.cyl(0.03, 0.014, at=(0.05, 0, 0.05), rot=(90, 0, 0), mat='an_red', seg=10)
    return _item(m)


def item_core():
    m = Mesh('item_core')
    m.cyl(0.14, 0.04, at=(0, 0, 0.02), mat='an_black', seg=14)
    m.cyl(0.12, 0.2, at=(0, 0, 0.14), mat='an_coreglass', seg=14)
    m.cyl(0.06, 0.2, at=(0, 0, 0.14), mat='an_glow_p', seg=10)
    m.cyl(0.14, 0.04, at=(0, 0, 0.26), mat='an_black', seg=14)
    return _item(m)


def weapon_arc():
    """The arc carbine: a short stock, two rails, a coil between them, a fork at the muzzle. Barrel along -Y."""
    m = Mesh('weapon_arc')
    m.box((0.07, 0.34, 0.1), at=(0, 0.24, -0.02), mat='an_dark', bevel=0.02)                                # stock
    m.box((0.08, 0.3, 0.12), at=(0, -0.02, 0.0), mat='an_steel', bevel=0.02)                                # receiver
    m.box((0.05, 0.08, 0.14), at=(0, 0.06, -0.12), rot=(14, 0, 0), mat='an_dark', bevel=0.015)              # grip
    for s in (-1, 1):
        m.box((0.014, 0.46, 0.02), at=(s * 0.03, -0.38, 0.03), mat='an_chrome')
    for k in range(6):
        m.ring(0.034, 0.008, at=(0, -0.22 - k * 0.055, 0.03), rot=(90, 0, 0), mat='an_gold', seg=10, tseg=4)
    m.cyl(0.014, 0.34, at=(0, -0.36, 0.03), rot=(90, 0, 0), mat='an_glow_c', seg=6)
    m.box((0.06, 0.05, 0.05), at=(0, -0.6, 0.03), mat='an_dark')
    m.box((0.04, 0.1, 0.07), at=(0, -0.02, -0.09), mat='an_glow_c')                                         # the cell
    return dict(objects=[m.to_object()], meta=dict(type='item', muzzle=(0, -0.63, 0.03)))


# ---------------------------------------------------------------- two machines
def heavy():
    """The Heavy Security Drone: an armoured slab the size of a desk on four ducted fans, a gun pod under each shoulder,
    a red visor that takes its time. It was on its power station when the war ended and nobody told it."""
    b = Build('heavy')
    Z = 1.5
    b.bone('body', (0, 0.3, Z), (0, -0.4, Z))
    m = b.on('body')
    m.box((1.2, 1.5, 0.5), at=(0, 0, Z), mat='hull', bevel=0.12)
    m.box((0.9, 1.0, 0.24), at=(0, 0.05, Z + 0.32), mat='hull_dark', bevel=0.08)
    m.box((1.0, 0.1, 0.16), at=(0, -0.76, Z + 0.06), mat='hull_dark', bevel=0.03)                           # the visor
    m.box((0.84, 0.03, 0.06), at=(0, -0.815, Z + 0.06), mat='eye_red')
    for k in range(5):
        m.box((0.16, 0.012, 0.06), at=(-0.4 + k * 0.2, -0.756, Z - 0.16), rot=(0, 30, 0), mat='accent')
    m.cyl(0.1, 0.1, at=(0.3, 0.3, Z + 0.47), mat='glow_cyan', seg=10)
    m.cyl(0.02, 0.5, at=(-0.35, 0.5, Z + 0.65), mat='chrome', seg=5)
    m.ball(0.04, at=(-0.35, 0.5, Z + 0.92), mat='eye_red', seg=6)
    rot = {}
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
        cx, cy = sx * 0.95, sy * 0.75
        m = b.on('body')
        m.tube([(sx * 0.55, sy * 0.55, Z), (cx, cy, Z + 0.05)], 0.07, mat='trim', seg=6)
        m.ring(0.4, 0.05, at=(cx, cy, Z + 0.05), mat='hull_dark', seg=18, tseg=6)
        m.cyl(0.08, 0.14, at=(cx, cy, Z + 0.05), mat='hull_dark', seg=8)
        n = 'fan%d' % (i + 1)
        b.bone(n, (cx, cy, Z + 0.0), (cx, cy, Z + 0.2), 'body')
        m = b.on(n)
        for k in range(4):
            m.box((0.7, 0.09, 0.012), at=(cx, cy, Z + 0.05), rot=(10, 0, k * 45), mat='chrome')
        rot[n] = 1 if i % 2 else -1
    for s in (-1, 1):                                    # the gun pods
        n = 'gun_%s' % ('l' if s > 0 else 'r')
        b.bone(n, (s * 0.5, -0.1, Z - 0.34), (s * 0.5, -0.7, Z - 0.34), 'body')
        m = b.on(n)
        m.box((0.26, 0.6, 0.22), at=(s * 0.5, -0.2, Z - 0.36), mat='hull_dark', bevel=0.04)
        for k in (-1, 1):
            m.cyl(0.04, 0.5, at=(s * 0.5 + k * 0.06, -0.7, Z - 0.36), rot=(90, 0, 0), mat='chrome', seg=8)
        m.box((0.2, 0.05, 0.05), at=(s * 0.5, -0.5, Z - 0.26), mat='glow_cyan')
    spin = lambda L, n: {r_: cyc(L, 12, lambda p, s=s: (0, 0, s * 360 * n * p)) for r_, s in rot.items()}
    atk = {'gun_l': K((0, (0, 0, 0), (0, 0, 0)), (0.1, (0, 0, 0), (0, 0.12, 0)), (0.2, (0, 0, 0), (0, 0, 0)), (0.3, (0, 0, 0), (0, 0.12, 0)), (0.5, (0, 0, 0), (0, 0, 0))),
           'gun_r': K((0, (0, 0, 0), (0, 0, 0)), (0.15, (0, 0, 0), (0, 0.12, 0)), (0.25, (0, 0, 0), (0, 0, 0)), (0.35, (0, 0, 0), (0, 0.12, 0)), (0.5, (0, 0, 0), (0, 0, 0))),
           'body': K((0, (0, 0, 0), (0, 0, 0)), (0.25, (-4, 0, 0), (0, 0.05, 0)), (0.5, (0, 0, 0), (0, 0, 0)))}
    atk.update(spin(0.5, 2))
    dormant = {'body': K((0, (0, 0, 0), (0, 0, -0.75)), (2.0, (0, 0, 0), (0, 0, -0.75)))}
    startle = {'body': K((0, (0, 0, 0), (0, 0, -0.75)), (0.5, (6, 0, 0), (0, 0, -0.5)), (1.2, (-4, 0, 0), (0, 0, 0.05)), (1.5, (0, 0, 0), (0, 0, 0)))}
    startle.update(spin(1.5, 5))
    return b.finish(idle=1.2, walk=0.6, bob=0.05, attack=atk, attack_len=0.5, die='drop', drop=1.2, die_len=1.0, idle_extra=spin(1.2, 4), walk_extra=spin(0.6, 3), lean=-8,
                    more={'dormant-loop': (2.0, dormant), 'startle': (1.5, startle)})


def emitter():
    """A field emitter: a tripod, a coil, and a ring that turns while the field is up."""
    b = Build('emitter')
    b.bone('body', (0, 0, 0.0), (0, 0, 1.6))
    m = b.on('body')
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.5
        m.tube([(0.6 * math.cos(a), 0.6 * math.sin(a), 0.0), (0.12 * math.cos(a), 0.12 * math.sin(a), 0.7)], 0.05, mat='hull_dark', seg=6)
    m.cyl(0.22, 0.9, at=(0, 0, 1.1), mat='hull', seg=12)
    for k in range(5):
        m.ring(0.25, 0.03, at=(0, 0, 0.8 + k * 0.15), mat='brass', seg=14, tseg=5)
    m.ball(0.2, at=(0, 0, 1.75), mat='glow_pink', seg=12)
    b.bone('ring', (0, 0, 1.75), (0, 0, 2.0), 'body')
    m = b.on('ring')
    m.ring(0.42, 0.03, at=(0, 0, 1.75), rot=(25, 0, 0), mat='chrome', seg=20, tseg=5)
    for k in range(3):
        a = k * 2 * math.pi / 3
        m.ball(0.06, at=(0.42 * math.cos(a), 0.42 * math.sin(a) * 0.9, 1.75 + 0.42 * math.sin(a) * 0.42), mat='glow_pink', seg=6)
    turn = lambda L, n: {'ring': cyc(L, 12, lambda p: (0, 0, 360 * n * p))}
    return b.finish(idle=2.0, walk=2.0, bob=0.0, die='drop', drop=0.3, die_len=0.6, idle_extra=turn(2.0, 1), walk_extra=turn(2.0, 1),
                    attack=turn(0.5, 1), attack_len=0.5)


TILES = {'wall_an_office': lambda: wall_an_office(1), 'wall_an_notice': lambda: wall_an_office(2), 'wall_an_grille': lambda: wall_an_office(3),
         'wall_an_blinds': lambda: wall_an_blinds(1), 'wall_an_ad': lambda: wall_an_ad(1), 'wall_an_ad2': lambda: wall_an_ad(2),
         'wall_an_cafe': lambda: wall_an_cafe(1), 'wall_an_cafe2': lambda: wall_an_cafe(2),
         'wall_an_white': lambda: wall_an_white(1), 'wall_an_white2': lambda: wall_an_white(2), 'wall_an_white3': lambda: wall_an_white(3),
         'wall_an_core': lambda: wall_an_core(1), 'wall_an_core2': lambda: wall_an_core(2),
         'floor_an_carpet': lambda: floor_an_carpet(1), 'floor_an_carpet2': lambda: floor_an_carpet(2), 'floor_an_lino': lambda: floor_an_lino(1), 'floor_an_line': lambda: floor_an_lino(2),
         'floor_an_check': lambda: floor_an_check(1), 'floor_an_white': lambda: floor_an_white(1), 'floor_an_ring': lambda: floor_an_white(2), 'floor_an_core': lambda: floor_an_core(1),
         'ceil_an_grid': lambda: ceil_an_grid(1), 'ceil_an_gridlight': lambda: ceil_an_grid(2), 'ceil_an_gridbroken': lambda: ceil_an_grid(3),
         'ceil_an_white': lambda: ceil_an_white(1), 'ceil_an_whitelight': lambda: ceil_an_white(2), 'ceil_an_core': lambda: ceil_an_core(1), 'ceil_an_corelight': lambda: ceil_an_core(2)}
PROPS = {'door_an_field': door_an_field,
         'an_poster_a': _poster('an_poster_a', 'an_cream', 'an_red', 'Poster'), 'an_poster_b': _poster('an_poster_b', 'an_navy', 'an_glow_c', 'Poster'),
         'an_poster_c': _poster('an_poster_c', 'an_yellow', 'an_dark', 'Poster'),
         'an_mist_y': _mist('an_mist_y', 'an_glow_y', 'Mist Generator (yellow band)'), 'an_mist_b': _mist('an_mist_b', 'an_glow_b', 'Mist Generator (blue band)')}
for _f in (an_reception, an_cubicle, an_copier, an_filing, an_whiteboard, an_conf, an_cooler, an_slot, an_counter, an_till, an_safe, an_body, an_box, an_test, an_holo,
           an_floorsafe, an_crate, an_tablet, an_station, an_gantry, an_core, an_lectern, an_tv, an_sign, trap_plate, trap_dart, item_chip, item_badge, item_order, item_core, weapon_arc):
    PROPS[_f.__name__] = _f
COOL = [0.92, 0.97, 1.0]
META = {'ceil_an_gridlight': dict(light=dict(color=COOL, energy=1.9, range=10, at=[0, -0.3, 0])),
        'ceil_an_whitelight': dict(light=dict(color=[0.9, 0.97, 1.0], energy=1.0, range=10, at=[0, -0.3, 0])),
        'ceil_an_corelight': dict(light=dict(color=[1.0, 0.29, 0.85], energy=1.5, range=9, at=[0, -0.4, 0])),
        'wall_an_ad': dict(light=dict(color=[1.0, 0.29, 0.85], energy=0.7, range=6, at=[0, 2.3, 0.8])),
        'wall_an_ad2': dict(light=dict(color=[0.13, 0.9, 1.0], energy=0.7, range=6, at=[0, 2.3, 0.8])),
        'wall_an_blinds': dict(light=dict(color=COOL, energy=0.5, range=5, at=[0, 2.2, 0.6])),
        'wall_an_cafe2': dict(light=dict(color=[1.0, 0.8, 0.2], energy=0.6, range=5, at=[0, 2.4, 0.6]))}
KITS = {'anomalous': dict(mats=AN_MATS, tiles=TILES, props=PROPS, meta=META)}
ACTORS3 = {'heavy': heavy, 'emitter': emitter}
