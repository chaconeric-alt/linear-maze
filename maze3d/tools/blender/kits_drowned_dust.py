"""Two more high-technology installations that have fallen apart, each in its own way. Same grammar as the Kaveros kit
(tiles.py): walls, floors and ceilings packed with plates, instruments, screens and cable, ribbed with lit moldings.

  drowned  THALASSA DEEP ARRAY (tag dr). It leaked for three hundred years. Sea-green paint over black hull, bronze and
           verdigris, pale green light. Round bulkhead ribs with lamps let into them, a pipe rail along every skirting.
           Decay is WET: algae climbing from the floor, slime trails under every seam, salt crust and barnacles, rusted
           plates, standing water, things dripping from the ceiling.
  dust     HELION DUST STATION (tag du). The desert got in. Sun-bleached ivory ceramic over umber frames, sandblasted
           steel, faded red oxide, violet light. Slanted fins with light slits, stepped skirtings and cornices.
           Decay is DRY: sand drifted against every wall and across the floors, tiles fallen and leaning where they fell,
           bleached and missing panels, cracks, wiring hanging out of the gaps, loose ceiling panels.

Both kits give the SAME material names their own look (hull, hull_dark, trim, accent, rust, copper, screen, floor ...):
a kit's own models use its own materials, so everything built here with tiles.plates() comes out in the kit's colours,
while furniture borrowed from the Kaveros kit keeps its own. glow_a is each kit's light; rot_a, rot_b, rot_c its decay.
"""
import math, random
from mz import Mesh, T, R, S
from tiles import C, H, plates, cable, dangle, face, down
from kits_works_bunker_crypt import _frame, DW, DH, DT

DROWNED_MATS = {
    'hull':        dict(color=(0.30, 0.47, 0.42), metal=0.1, rough=0.5, shader='worn', grime=0.8),       # sea-green paint
    'hull_dark':   dict(color=(0.035, 0.075, 0.075), metal=0.7, rough=0.4, shader='worn', grime=0.6),
    'trim':        dict(color=(0.33, 0.30, 0.19), metal=0.85, rough=0.45, shader='worn', grime=0.7),      # tarnished bronze
    'floor':       dict(color=(0.13, 0.20, 0.19), metal=0.6, rough=0.35, shader='worn', grime=0.7),
    'accent':      dict(color=(0.80, 0.66, 0.12), metal=0.1, rough=0.6, shader='worn', grime=0.6),        # signal yellow, what is left of it
    'accent2':     dict(color=(0.55, 0.20, 0.12), metal=0.2, rough=0.6, shader='worn', grime=0.6),
    'rust':        dict(color=(0.36, 0.15, 0.06), metal=0.3, rough=0.9, shader='worn', grime=0.95),
    'copper':      dict(color=(0.22, 0.52, 0.42), metal=0.5, rough=0.7, shader='worn', grime=0.5),        # verdigris
    'chrome':      dict(color=(0.45, 0.50, 0.48), metal=0.9, rough=0.4, shader='worn', grime=0.6),
    'cable':       dict(color=(0.03, 0.06, 0.04), metal=0.0, rough=0.5),
    'screen':      dict(color=(0.01, 0.05, 0.03), emit=(0.25, 1.0, 0.55), energy=1.5, shader='screen'),
    'screen_dead': dict(color=(0.02, 0.035, 0.03), metal=0.3, rough=0.12),
    'glow_a':      dict(color=(0.3, 1.0, 0.65), emit=(0.3, 1.0, 0.65), energy=3.4, shader='glow', pulse=0.12, flicker=0.05),
    'glow_white':  dict(color=(0.8, 1.0, 0.92), emit=(0.75, 1.0, 0.9), energy=3.2, shader='glow', pulse=0.06),
    'rot_a':       dict(color=(0.07, 0.17, 0.05), metal=0.0, rough=0.95),                                 # algae
    'rot_b':       dict(color=(0.66, 0.68, 0.60), metal=0.0, rough=0.9),                                  # salt and barnacle
    'rot_c':       dict(color=(0.02, 0.07, 0.04), metal=0.3, rough=0.12),                                 # slime: wet and dark
    'water':       dict(color=(0.02, 0.07, 0.07), metal=0.6, rough=0.04),
    'tank':        dict(color=(0.4, 1.0, 0.5), emit=(0.35, 1.0, 0.45), energy=1.6, shader='glow', pulse=0.25),
    'dial':        dict(color=(0.70, 0.74, 0.62), metal=0.0, rough=0.6),
}
DUST_MATS = {
    'hull':        dict(color=(0.76, 0.69, 0.56), metal=0.0, rough=0.75, shader='worn', grime=0.5),       # bleached ceramic
    'hull_dark':   dict(color=(0.17, 0.13, 0.10), metal=0.5, rough=0.6, shader='worn', grime=0.5),
    'trim':        dict(color=(0.46, 0.40, 0.32), metal=0.7, rough=0.65, shader='worn', grime=0.5),       # sandblasted steel
    'floor':       dict(color=(0.40, 0.34, 0.27), metal=0.3, rough=0.7, shader='worn', grime=0.6),
    'accent':      dict(color=(0.60, 0.19, 0.11), metal=0.1, rough=0.7, shader='worn', grime=0.5),        # red oxide, faded
    'accent2':     dict(color=(0.22, 0.42, 0.42), metal=0.1, rough=0.7, shader='worn', grime=0.5),
    'rust':        dict(color=(0.52, 0.36, 0.19), metal=0.2, rough=0.95, shader='worn', grime=0.8),       # ochre
    'copper':      dict(color=(0.55, 0.33, 0.20), metal=0.7, rough=0.6, shader='worn', grime=0.5),
    'chrome':      dict(color=(0.60, 0.56, 0.50), metal=0.85, rough=0.55, shader='worn', grime=0.5),
    'cable':       dict(color=(0.09, 0.07, 0.06), metal=0.0, rough=0.8),
    'screen':      dict(color=(0.04, 0.02, 0.06), emit=(0.8, 0.45, 1.0), energy=1.5, shader='screen'),
    'screen_dead': dict(color=(0.10, 0.085, 0.07), metal=0.1, rough=0.6),                                 # dust on the glass
    'glow_a':      dict(color=(0.7, 0.4, 1.0), emit=(0.68, 0.38, 1.0), energy=3.6, shader='glow', pulse=0.06),
    'glow_white':  dict(color=(1.0, 0.9, 0.95), emit=(1.0, 0.88, 0.95), energy=3.2, shader='glow', pulse=0.04),
    'rot_a':       dict(color=(0.70, 0.56, 0.34), metal=0.0, rough=1.0),                                  # sand
    'rot_b':       dict(color=(0.90, 0.86, 0.76), metal=0.0, rough=0.9),                                  # bleached
    'rot_c':       dict(color=(0.06, 0.045, 0.035), metal=0.0, rough=1.0),                                # a crack; shadow in a gap
    'water':       dict(color=(0.62, 0.50, 0.31), metal=0.0, rough=1.0),                                  # no water here: fine dust
    'tank':        dict(color=(1.0, 0.6, 0.25), emit=(1.0, 0.55, 0.2), energy=1.4, shader='glow', pulse=0.1),
    'dial':        dict(color=(0.86, 0.82, 0.70), metal=0.0, rough=0.7),
}


def make(tag, wet):
    """Every tile and model of one kit. `wet` picks the drowned shapes and decay; otherwise the dust ones."""
    PM = ('hull', 'hull', 'hull', 'trim', 'hull_dark', 'rust', 'copper') if wet else ('hull', 'hull', 'hull', 'rot_b', 'trim', 'hull_dark')
    PK = dict(mats=PM, glows=('glow_a',), accent='accent', min_size=0.6 if wet else 0.5, skip=0.04 if wet else 0.12)
    Z0, Z1 = 0.34, H - 0.34                              # between the skirting and the cornice

    # ---------------------------------------------------------------- the lit moldings
    def rib(m, x, lit=True):
        if wet:                                          # a round bulkhead rib, collared, with lamps let into it
            m.cyl(0.15, Z1 - Z0, at=(x, -0.04, (Z0 + Z1) / 2), mat='trim', seg=10)
            for z in (Z0 + 0.22, (Z0 + Z1) / 2, Z1 - 0.22):
                m.cyl(0.19, 0.1, at=(x, -0.04, z), mat='copper', seg=10)
            if lit:
                for (za, zb) in ((Z0 + 0.42, (Z0 + Z1) / 2 - 0.18), ((Z0 + Z1) / 2 + 0.18, Z1 - 0.42)):
                    m.box((0.07, 0.03, zb - za), at=(x, -0.195, (za + zb) / 2), mat='glow_a', bevel=0.01)
        else:                                            # a slanted fin with slits of light
            m.prism([(-0.2, 0), (0.2, 0), (0.035, -0.3), (-0.035, -0.3)], Z1 - Z0, at=(x, 0, Z0), mat='hull', bevel=0.012)
            m.box((0.3, 0.2, 0.12), at=(x, -0.1, Z0 + 0.06), mat='trim', bevel=0.02)
            m.box((0.3, 0.2, 0.12), at=(x, -0.1, Z1 - 0.06), mat='trim', bevel=0.02)
            if lit:
                for k in range(5):
                    m.box((0.05, 0.03, 0.36), at=(x, -0.305, Z0 + 0.5 + k * (Z1 - Z0 - 1.0) / 4), mat='glow_a')

    def wbase(m, rnd, ribs=(-1.8,), lit=(True,), dado=False):
        m.box((C, 0.3, H), at=(0, 0.15, H / 2), mat='hull_dark')
        if wet:
            m.box((C, 0.14, 0.3), at=(0, -0.05, 0.15), mat='trim', bevel=0.03)
            m.cyl(0.045, C, at=(0, -0.17, 0.3), rot=(0, 90, 0), mat='copper', seg=8)          # a pipe rail along the skirting
            m.box((C, 0.18, 0.3), at=(0, -0.07, H - 0.15), mat='trim', bevel=0.04)
            m.box((C, 0.03, 0.05), at=(0, -0.168, H - 0.2), mat='glow_a')                    # the lit molding under the cornice
        else:
            m.box((C, 0.22, 0.16), at=(0, -0.09, 0.08), mat='trim', bevel=0.015)              # stepped, both ends
            m.box((C, 0.12, 0.18), at=(0, -0.04, 0.25), mat='hull', bevel=0.015)
            m.box((C, 0.26, 0.14), at=(0, -0.11, H - 0.07), mat='trim', bevel=0.015)
            m.box((C, 0.14, 0.2), at=(0, -0.05, H - 0.24), mat='hull', bevel=0.015)
            m.box((C, 0.03, 0.045), at=(0, -0.245, H - 0.1), mat='glow_a')
        if dado:                                         # a second line of light at hand height
            m.box((C, 0.07, 0.1), at=(0, -0.1, 1.3), mat='trim', bevel=0.015)
            m.box((C, 0.02, 0.035), at=(0, -0.142, 1.3), mat='glow_a')
        for x, l in zip(ribs, lit):
            rib(m, x, l)

    # ---------------------------------------------------------------- decay
    def decay(m, rnd, amount=1.0):
        if wet:
            for k in range(int(7 * amount)):             # algae along the skirting, and up from it
                x = rnd.uniform(-1.9, 1.9)
                m.ball(rnd.uniform(0.08, 0.2), at=(x, -0.15, rnd.uniform(0.02, 0.3)), mat='rot_a', seg=6, scale=(1.5, 0.6, 0.7))
            for k in range(int(4 * amount)):
                x, hh = rnd.uniform(-1.8, 1.8), rnd.uniform(0.25, 0.95)
                m.box((rnd.uniform(0.15, 0.5), 0.012, hh), at=(x, -0.092, Z0 + hh / 2 - 0.05), mat='rot_a', bevel=0.005)
            for k in range(int(5 * amount)):             # slime trails down from the cornice
                x, ln = rnd.uniform(-1.9, 1.9), rnd.uniform(0.4, 1.7)
                m.box((rnd.uniform(0.04, 0.11), 0.012, ln), at=(x, -0.094, Z1 - ln / 2), mat='rot_c')
            for k in range(int(3 * amount)):             # salt and barnacles in clumps
                x, z = rnd.uniform(-1.8, 1.8), rnd.uniform(0.6, 3.2)
                for j in range(rnd.randint(3, 6)):
                    m.ball(rnd.uniform(0.03, 0.07), at=(x + rnd.uniform(-0.14, 0.14), -0.1, z + rnd.uniform(-0.14, 0.14)), mat='rot_b', seg=5)
        else:
            for k in range(int(5 * amount)):             # sand drifted against the wall
                x = rnd.uniform(-1.9, 1.9)
                m.ball(rnd.uniform(0.3, 0.55), at=(x, -0.16, rnd.uniform(-0.14, 0.0)), mat='rot_a', seg=7, scale=(1.7, 0.85, rnd.uniform(0.45, 0.9)))
            if rnd.random() < 0.7 * amount:              # a panel that fell, leaning where it landed
                x = rnd.uniform(-1.4, 1.4)
                m.box((rnd.uniform(0.5, 0.8), 0.04, rnd.uniform(0.5, 0.85)), at=(x, -0.3, 0.36), rot=(-24, 0, rnd.uniform(-9, 9)), mat='hull', bevel=0.012)
            for k in range(int(2 * amount)):             # cracks
                x, z = rnd.uniform(-1.6, 1.6), rnd.uniform(1.0, 3.2)
                pts = [(x, -0.095, z)]
                for j in range(5):
                    pts.append((pts[-1][0] + rnd.uniform(-0.18, 0.18), -0.095, pts[-1][2] - rnd.uniform(0.1, 0.28)))
                m.tube(pts, 0.012, mat='rot_c', seg=4)
            for k in range(int(2 * amount)):             # wiring out of a gap
                dangle(m, rnd, (rnd.uniform(-1.7, 1.7), -0.1, rnd.uniform(2.2, 3.3)), rnd.uniform(0.4, 1.1), mat=rnd.choice(['cable', 'copper']))

    # ---------------------------------------------------------------- instruments (in the wall's face: x across, y up, z out)
    def gauges(m, rnd, x0, y0, x1, y1):
        m.box((x1 - x0, y1 - y0, 0.07), at=((x0 + x1) / 2, (y0 + y1) / 2, 0.035), mat='hull_dark', bevel=0.02)
        r = 0.13
        nx, ny = max(1, int((x1 - x0 - 0.1) / 0.36)), max(1, int((y1 - y0 - 0.4) / 0.36))
        for i in range(nx):
            for j in range(ny):
                cx = x0 + (i + 0.5) * (x1 - x0) / nx
                cy = y1 - 0.08 - (j + 0.5) * (y1 - y0 - 0.4) / ny
                m.cyl(r, 0.05, at=(cx, cy, 0.09), mat='trim', seg=12)
                lit = rnd.random() < 0.35
                m.cyl(r * 0.8, 0.012, at=(cx, cy, 0.121), mat='glow_a' if lit else 'dial', seg=12)
                m.box((r * 0.7, 0.014, 0.008), at=(cx, cy, 0.132), rot=(0, 0, rnd.uniform(0, 360)), mat='accent' if not lit else 'hull_dark')
        for i in range(int((x1 - x0 - 0.1) / 0.11)):     # a row of switches and tell-tales under them
            sx = x0 + 0.1 + i * 0.11
            m.box((0.05, 0.1, 0.05), at=(sx, y0 + 0.22, 0.09), rot=(rnd.choice([-18, 18]), 0, 0), mat='chrome')
            m.cyl(0.02, 0.014, at=(sx, y0 + 0.1, 0.077), mat=rnd.choice(['glow_a', 'glow_amber', 'glow_red', 'trim', 'trim']), seg=6)

    def screens(m, rnd, x0, y0, x1, y1, cols, rows, dead=0.4):
        w, h = (x1 - x0) / cols, (y1 - y0) / rows
        for i in range(cols):
            for j in range(rows):
                cx, cy = x0 + (i + 0.5) * w, y0 + (j + 0.5) * h
                m.box((w - 0.06, h - 0.06, 0.1), at=(cx, cy, 0.05), mat='hull_dark', bevel=0.025)
                m.box((w - 0.2, h - 0.2, 0.02), at=(cx, cy, 0.105), mat='screen_dead' if rnd.random() < dead else 'screen')

    def blades(m, rnd, x0, y0, x1, y1):
        m.box((x1 - x0, y1 - y0, 0.06), at=((x0 + x1) / 2, (y0 + y1) / 2, 0.03), mat='hull_dark')
        n = int((y1 - y0) / 0.2)
        for j in range(n):
            cy = y0 + (j + 0.5) * (y1 - y0) / n
            if rnd.random() < (0.1 if wet else 0.18):
                continue                                 # one pulled out, or fallen out
            out = 0.1 + (0.1 if rnd.random() < 0.15 else 0.0)
            m.box((x1 - x0 - 0.08, 0.16, out), at=((x0 + x1) / 2, cy, 0.06 + out / 2), mat=rnd.choice(['hull', 'trim', 'hull_dark']), bevel=0.012)
            for k in range(int((x1 - x0 - 0.5) / 0.08)):
                m.box((0.04, 0.03, 0.01), at=(x0 + 0.2 + k * 0.08, cy + 0.03, 0.065 + out), mat=rnd.choice(['glow_a', 'glow_a', 'glow_amber', 'hull_dark', 'hull_dark', 'hull_dark']))
            m.box((0.12, 0.03, 0.03), at=(x1 - 0.16, cy - 0.03, 0.075 + out), mat='chrome')

    def tank(m, rnd, cx, y0, y1, r=0.42):
        """A specimen cylinder let into the wall, lit from inside."""
        hh = y1 - y0
        m.box((r * 2 + 0.3, hh + 0.2, 0.05), at=(cx, (y0 + y1) / 2, 0.025), mat='hull_dark')
        for y in (y0, y1):
            m.cyl(r + 0.08, 0.16, at=(cx, y, r * 0.55), rot=(90, 0, 0), mat='trim', seg=14)
        m.cyl(r * 0.8, hh - 0.2, at=(cx, (y0 + y1) / 2, r * 0.55), rot=(90, 0, 0), mat='tank', seg=12)
        m.ball(r * 0.36, at=(cx + 0.04, y0 + hh * 0.45, r * 0.55), mat='rot_c', seg=7, scale=(0.8, 1.5, 0.8))
        m.cyl(r, hh - 0.14, at=(cx, (y0 + y1) / 2, r * 0.55), rot=(90, 0, 0), mat='glass', seg=14)
        m.tube([(cx + r, y1, r * 0.5), (cx + r + 0.25, y1 + 0.1, 0.12), (cx + r + 0.3, y1 + 0.5, 0.08)], 0.035, mat='cable', seg=5)

    # ---------------------------------------------------------------- walls
    def wall(seed, kind):
        rnd = random.Random(seed * 131 + len(kind))
        m = Mesh('wall')
        A, B = -1.55, 2.0                                # the bay between the rib and the tile's far edge
        if kind == 'rib':                                # three ribs and plate between: the plain wall
            wbase(m, rnd, ribs=(-1.8, -0.47, 0.87), lit=(True, False, True), dado=True)
            face(m)
            for (a, b) in ((-1.55, -0.72), (-0.22, 0.62), (1.12, 2.0)):
                plates(m, rnd, a, Z0, b, 1.22, **dict(PK, min_size=0.4))
                plates(m, rnd, a, 1.38, b, Z1, **dict(PK, min_size=0.4))
            m.pop()
        elif kind == 'plate':
            wbase(m, rnd, dado=True)
            face(m)
            plates(m, rnd, A, Z0, B, 1.22, **PK)
            plates(m, rnd, A, 1.38, B, Z1, **PK)
            m.pop()
        elif kind == 'gauges':                           # an instrument wall: dials, switches, two small screens
            wbase(m, rnd)
            face(m)
            plates(m, rnd, A, Z0, B, 0.95, **PK)
            plates(m, rnd, A, 3.05, B, Z1, **PK)
            gauges(m, rnd, A + 0.05, 1.0, 0.55, 3.0)
            screens(m, rnd, 0.65, 2.0, B - 0.05, 3.0, 1, 2, dead=0.5)
            blades(m, rnd, 0.65, 1.0, B - 0.05, 1.95)
            m.pop()
        elif kind == 'screens':                          # a bank of monitors over a shelf of keys
            wbase(m, rnd)
            face(m)
            plates(m, rnd, A, Z0, B, 0.95, **PK)
            plates(m, rnd, A, 3.15, B, Z1, **PK)
            screens(m, rnd, A + 0.05, 1.45, B - 0.05, 3.1, 3, 2, dead=0.45 if wet else 0.55)
            m.pop()
            m.box((3.3, 0.34, 0.08), at=(0.22, -0.2, 1.3), rot=(-12, 0, 0), mat='trim', bevel=0.02)
            for i in range(14):
                m.box((0.16, 0.1, 0.03), at=(-1.3 + i * 0.23, -0.24, 1.36), rot=(-12, 0, 0), mat=rnd.choice(['hull', 'hull', 'hull_dark', 'accent']))
        elif kind == 'bigscreen':                        # one great display, still on (or not)
            wbase(m, rnd)
            face(m)
            plates(m, rnd, A, Z0, B, 1.0, **PK)
            plates(m, rnd, A, 3.2, B, Z1, **PK)
            m.box((3.3, 2.1, 0.1), at=(0.22, 2.1, 0.05), mat='hull_dark', bevel=0.03)
            m.box((3.0, 1.7, 0.02), at=(0.22, 2.15, 0.105), mat='screen_dead' if seed % 2 else 'screen')
            for i in range(8):
                m.box((0.14, 0.05, 0.03), at=(-1.1 + i * 0.22, 1.16, 0.11), mat=rnd.choice(['glow_a', 'glow_amber', 'hull', 'trim']))
            m.pop()
        elif kind == 'tank':                             # lab equipment in the wall: specimen cylinders
            wbase(m, rnd)
            face(m)
            plates(m, rnd, A, Z0, B, 0.8, **PK)
            plates(m, rnd, A, 3.1, B, Z1, **PK)
            plates(m, rnd, 0.95, 0.85, B, 3.05, **dict(PK, min_size=0.4))
            tank(m, rnd, -0.95, 1.0, 2.9)
            tank(m, rnd, 0.2, 1.0, 2.9)
            m.pop()
        elif kind == 'rack':                             # server blades floor to ceiling
            wbase(m, rnd)
            face(m)
            blades(m, rnd, A + 0.05, Z0 + 0.1, 0.1, Z1 - 0.1)
            blades(m, rnd, 0.25, Z0 + 0.1, B - 0.05, Z1 - 0.1)
            m.pop()
        elif kind == 'works':                            # what moved things about: pipes in the wet one, relays in the dry
            wbase(m, rnd)
            face(m)
            plates(m, rnd, A, Z0, -0.6, Z1, **dict(PK, min_size=0.4))
            plates(m, rnd, 1.3, Z0, B, Z1, **dict(PK, min_size=0.4))
            m.pop()
            m.box((1.9, 0.05, Z1 - Z0), at=(0.35, -0.012, H / 2), mat='rust')
            if wet:
                for i, x in enumerate((-0.35, 0.0, 0.42, 0.85, 1.1)):
                    r = (0.12, 0.06, 0.15, 0.07, 0.09)[i]
                    m.cyl(r, Z1 - Z0, at=(x, -0.03 - r, H / 2), mat=('copper', 'trim', 'hull', 'copper', 'rust')[i], seg=10)
                    for z in (0.9, 2.0, 3.1):
                        m.cyl(r + 0.03, 0.08, at=(x, -0.03 - r, z + i * 0.06), mat='trim', seg=10)
                m.ring(0.18, 0.025, at=(0.42, -0.4, 1.6), rot=(90, 0, 0), mat='accent', seg=14, tseg=5)
                m.cyl(0.03, 0.2, at=(0.42, -0.3, 1.6), rot=(90, 0, 0), mat='trim', seg=6)
                m.ball(0.1, at=(0.42, -0.34, 2.9), mat='rot_c', seg=6, scale=(1, 1, 2.2))                 # a leak, mid-drip
            else:
                m.box((1.7, 0.2, 2.6), at=(0.35, -0.1, 1.75), mat='hull_dark', bevel=0.02)                 # a relay cabinet, its door off
                for j in range(6):
                    for i in range(7):
                        if rnd.random() < 0.8:
                            m.box((0.14, 0.06, 0.26), at=(-0.35 + i * 0.23, -0.22, 0.75 + j * 0.4), mat=rnd.choice(['hull', 'rot_b', 'copper', 'trim']), bevel=0.01)
                m.box((0.85, 0.04, 2.5), at=(-0.5, -0.5, 1.3), rot=(-8, 0, 24), mat='hull', bevel=0.012)   # the door, where it dropped
                for k in range(4):
                    dangle(m, rnd, (rnd.uniform(-0.3, 1.0), -0.24, rnd.uniform(1.6, 2.9)), rnd.uniform(0.5, 1.2), mat=rnd.choice(['cable', 'copper', 'accent']))
        elif kind == 'breach':                           # the wall has gone: frame, cable, and whatever came in
            wbase(m, rnd, ribs=(-1.8,), lit=(False,))
            face(m)
            plates(m, rnd, A, Z0, B, Z1, **dict(PK, skip=0.45, min_size=0.45))
            m.pop()
            for x in (-0.9, 0.3, 1.4):
                m.box((0.07, 0.07, Z1 - Z0), at=(x, -0.02, H / 2), mat='rust')
            for z in (1.2, 2.4):
                m.box((C - 0.5, 0.07, 0.07), at=(0.2, -0.02, z), mat='rust')
            for k in range(5):
                cable(m, rnd, (rnd.uniform(-1.5, 0), -0.06, rnd.uniform(1.5, 3.4)), (rnd.uniform(0.3, 1.9), -0.06, rnd.uniform(1.0, 3.2)), sag=rnd.uniform(0.2, 0.7), r=0.022,
                      mat=rnd.choice(['cable', 'copper', 'cable']))
            decay(m, rnd, 1.0)
        elif kind == 'light':                            # a lit column: the biggest molding of all
            wbase(m, rnd, ribs=(-1.8,), lit=(False,), dado=True)
            face(m)
            plates(m, rnd, A, Z0, -0.3, 1.22, **PK)
            plates(m, rnd, A, 1.38, -0.3, Z1, **PK)
            plates(m, rnd, 0.75, Z0, B, 1.22, **PK)
            plates(m, rnd, 0.75, 1.38, B, Z1, **PK)
            m.pop()
            if wet:
                m.cyl(0.36, Z1 - Z0, at=(0.22, 0.0, H / 2), mat='trim', seg=12)
                m.cyl(0.26, Z1 - Z0 - 0.7, at=(0.22, -0.16, H / 2), mat='glow_white', seg=10)
                for z in (Z0 + 0.2, H / 2, Z1 - 0.2):
                    m.cyl(0.42, 0.12, at=(0.22, 0.0, z), mat='copper', seg=12)
            else:
                m.prism([(-0.45, 0), (0.45, 0), (0.2, -0.3), (-0.2, -0.3)], Z1 - Z0, at=(0.22, 0, Z0), mat='trim', bevel=0.015)
                for k in range(6):
                    m.box((0.36, 0.03, 0.3), at=(0.22, -0.305, Z0 + 0.4 + k * (Z1 - Z0 - 0.8) / 5), mat='glow_white')
        decay(m, rnd, {'breach': 0.0, 'rack': 0.5, 'bigscreen': 0.6, 'screens': 0.6}.get(kind, 1.0) * (1.0 if seed % 3 else 0.5))
        return m

    # ---------------------------------------------------------------- floors
    FK = dict(min_size=0.9, thick=(0.02, 0.022), gap=0.02, mats=('floor', 'floor', 'floor', 'trim') if wet else ('floor', 'floor', 'hull', 'trim'), deco=0.35, flat=True,
              glows=('glow_a',), accent='accent')

    def fdecay(m, rnd, amount=1.0):
        if wet:
            for k in range(int(3 * amount)):             # standing water, and what grows at its edge
                x, y, r = rnd.uniform(-1.3, 1.3), rnd.uniform(-1.3, 1.3), rnd.uniform(0.3, 0.75)
                m.cyl(r, 0.006, at=(x, y, 0.006), mat='water', seg=12)
                m.ball(0.1, at=(x + r * 0.8, y + r * 0.3, 0.0), mat='rot_a', seg=5, scale=(1.4, 1, 0.5))
        else:
            for k in range(int(4 * amount)):             # sand, in low drifts
                x, y = rnd.uniform(-1.6, 1.6), rnd.uniform(-1.6, 1.6)
                m.ball(rnd.uniform(0.35, 0.8), at=(x, y, -0.02), mat='rot_a', seg=8, scale=(1.3, rnd.uniform(0.7, 1.2), 0.1))

    def floor(seed, kind):
        rnd = random.Random(seed * 71 + len(kind))
        m = Mesh('floor')
        if kind == 'grate':                              # a service trench under bars, lit from below
            m.box((C, C, 0.06), at=(0, 0, -0.7), mat='hull_dark')
            for s in (-1, 1):
                m.box((0.9, C, 0.66), at=(s * 1.55, 0, -0.35), mat='hull_dark')
                m.box((0.9, C, 0.022), at=(s * 1.55, 0, -0.011), mat='floor')
            for i, x in enumerate((-0.6, 0.1, 0.65)):
                m.cyl((0.12, 0.07, 0.1)[i], C, at=(x, 0, -0.5), rot=(90, 0, 0), mat=('copper', 'trim', 'rust')[i], seg=8)
            m.box((2.2, C, 0.01), at=(0, 0, -0.3 if wet else -0.62), mat='water')
            for x in (-0.95, 0.95):
                m.box((0.05, C, 0.04), at=(x, 0, -0.12), mat='glow_a')
            for i in range(11):
                m.box((2.2, 0.07, 0.05), at=(0, -1.8 + i * 0.36, -0.025), mat='trim')
            for x in (-0.55, 0.0, 0.55):
                m.box((0.06, C, 0.04), at=(x, 0, -0.03), mat='hull_dark')
            return m
        m.box((C, C, 0.2), at=(0, 0, -0.12), mat='hull_dark')
        m.push(T(0, 0, -0.02))
        if kind == 'plate':
            plates(m, rnd, -2, -2, 2, 2, **FK)
        elif kind == 'glow':                             # a way-finding line of light down the middle
            plates(m, rnd, -2, -2, -0.3, 2, **FK)
            plates(m, rnd, 0.3, -2, 2, 2, **FK)
            m.box((0.6, C, 0.02), at=(0, 0, 0.01), mat='trim')
            for y in (-1.5, -0.5, 0.5, 1.5):
                m.box((0.16, 0.7, 0.008), at=(0, y, 0.024), mat='glow_a')
        elif kind == 'broken':                           # plates gone; what was under them
            plates(m, rnd, -2, -2, 2, 2, **dict(FK, skip=0.3, min_size=0.7))
            for k in range(4):
                cable(m, rnd, (rnd.uniform(-1.8, 1.8), rnd.uniform(-1.8, 1.8), 0.0), (rnd.uniform(-1.8, 1.8), rnd.uniform(-1.8, 1.8), 0.0), sag=0.0, r=0.02,
                      mat=rnd.choice(['cable', 'copper']), n=3)
        elif kind == 'work':                             # a marked-out work zone
            plates(m, rnd, -2, -2, 2, 2, **dict(FK, deco=0.15))
            for s in (-1, 1):
                m.box((0.1, 3.4, 0.006), at=(s * 1.65, 0, 0.025), mat='accent')
                m.box((3.4, 0.1, 0.006), at=(0, s * 1.65, 0.025), mat='accent')
        m.pop()
        fdecay(m, rnd, 1.6 if kind == 'broken' else 1.0)
        return m

    # ---------------------------------------------------------------- ceilings (underside at z=0; detail goes up; things hang below)
    CK = dict(min_size=0.9, thick=(0.04, 0.18), mats=('hull', 'hull', 'trim', 'hull_dark') if wet else ('hull', 'hull', 'rot_b', 'trim', 'hull_dark'), deco=0.45,
              glows=('glow_a',), accent='accent', skip=0.0 if wet else 0.1)

    def cdecay(m, rnd, amount=1.0):
        if wet:
            for k in range(int(5 * amount)):             # it drips: salt grown down in points, slime where it gathers
                x, y, ln = rnd.uniform(-1.8, 1.8), rnd.uniform(-1.8, 1.8), rnd.uniform(0.12, 0.5)
                m.cyl(0.045, ln, at=(x, y, 0.1 - ln / 2), rot=(180, 0, 0), mat='rot_b', seg=5, r2=0.004)
            for k in range(int(2 * amount)):
                m.ball(rnd.uniform(0.15, 0.3), at=(rnd.uniform(-1.6, 1.6), rnd.uniform(-1.6, 1.6), 0.1), mat='rot_a', seg=6, scale=(1.3, 1, 0.3))
        else:
            if rnd.random() < 0.6 * amount:              # a panel hanging by one edge
                x, y = rnd.uniform(-1.2, 1.2), rnd.uniform(-1.2, 1.2)
                m.box((0.9, 0.9, 0.04), at=(x, y, -0.22), rot=(rnd.choice([-1, 1]) * rnd.uniform(25, 50), rnd.uniform(-10, 10), 0), mat='hull', bevel=0.012)
            for k in range(int(3 * amount)):
                dangle(m, rnd, (rnd.uniform(-1.7, 1.7), rnd.uniform(-1.7, 1.7), 0.12), rnd.uniform(0.3, 1.0), mat=rnd.choice(['cable', 'copper', 'accent']))

    def ceil(seed, kind):
        rnd = random.Random(seed * 53 + len(kind))
        m = Mesh('ceil')
        m.box((C, C, 0.2), at=(0, 0, 0.4), mat='hull_dark')
        if kind == 'plain':
            down(m)
            m.push(T(0, 0, -0.3))
            plates(m, rnd, -2, -2, 2, 2, **CK)
            m.pop().pop()
        elif kind == 'light':
            down(m)
            m.push(T(0, 0, -0.3))
            for (a, b, c, d) in ((-2, -2, 2, -1.0), (-2, 1.0, 2, 2), (-2, -1.0, -1.0, 1.0), (1.0, -1.0, 2, 1.0)):
                plates(m, rnd, a, b, c, d, **dict(CK, min_size=0.7, skip=0.0))
            m.pop().pop()
            if wet:                                      # a ring lamp in a bronze dish
                m.cyl(0.95, 0.16, at=(0, 0, 0.2), mat='trim', seg=18)
                m.ring(0.66, 0.07, at=(0, 0, 0.1), mat='glow_white', seg=20, tseg=6)
                m.cyl(0.3, 0.1, at=(0, 0, 0.1), mat='copper', seg=12)
            else:                                        # three slanted bars of light in a steel tray
                m.box((1.9, 1.9, 0.14), at=(0, 0, 0.2), mat='trim', bevel=0.02)
                for i in range(3):
                    m.box((1.5, 0.22, 0.05), at=(0, -0.55 + i * 0.55, 0.11), rot=(18, 0, 0), mat='glow_white')
            return m
        elif kind == 'works':                            # pipes (wet) or a duct with its side off (dry)
            if wet:
                for i, x in enumerate((-1.3, -0.7, 0.2, 1.1)):
                    r = (0.16, 0.09, 0.2, 0.11)[i]
                    m.cyl(r, C, at=(x, 0, 0.3 - r), rot=(90, 0, 0), mat=('copper', 'trim', 'hull', 'rust')[i], seg=10)
                    for y in (-1.2, 0.3, 1.5):
                        m.cyl(r + 0.03, 0.1, at=(x, y, 0.3 - r), rot=(90, 0, 0), mat='trim', seg=10)
                m.box((C, 0.1, 0.06), at=(0, -0.6, 0.27), mat='trim')
                m.box((C, 0.1, 0.06), at=(0, 1.0, 0.27), mat='trim')
            else:
                m.box((1.1, C, 0.5), at=(-0.8, 0, 0.05), mat='trim', bevel=0.03)
                m.box((0.7, 1.2, 0.04), at=(-0.1, 0.4, -0.25), rot=(0, 62, 0), mat='hull', bevel=0.01)
                m.box((0.5, C, 0.2), at=(1.0, 0, 0.2), mat='hull_dark', bevel=0.02)
                for y in (-1.4, 0, 1.4):
                    m.box((1.3, 0.08, 0.56), at=(-0.8, y, 0.05), mat='hull_dark')
        elif kind == 'cables':                           # a tray of cable, some of it down
            m.box((0.7, C, 0.06), at=(0.4, 0, 0.1), mat='trim')
            for i in range(6):
                cable(m, rnd, (0.15 + i * 0.1, -2, 0.16), (0.15 + i * 0.1, 2, 0.16), sag=rnd.uniform(0.0, 0.25), r=0.03, mat=rnd.choice(['cable', 'cable', 'copper', 'accent2']))
            for k in range(4):
                dangle(m, rnd, (rnd.uniform(0.1, 0.7), rnd.uniform(-1.6, 1.6), 0.1), rnd.uniform(0.5, 1.4), mat=rnd.choice(['cable', 'copper']))
            down(m)
            m.push(T(0, 0, -0.3))
            plates(m, rnd, -2, -2, -0.1, 2, **CK)
            plates(m, rnd, 0.9, -2, 2, 2, **CK)
            m.pop().pop()
        elif kind == 'rib':                              # the lit moldings carried over the ceiling
            down(m)
            m.push(T(0, 0, -0.3))
            plates(m, rnd, -2, -2, -0.25, 2, **CK)
            plates(m, rnd, 0.25, -2, 2, 2, **CK)
            m.pop().pop()
            if wet:
                m.cyl(0.17, C, at=(0, 0, 0.16), rot=(90, 0, 0), mat='trim', seg=10)
                for y in (-1.5, 0, 1.5):
                    m.cyl(0.21, 0.1, at=(0, y, 0.16), rot=(90, 0, 0), mat='copper', seg=10)
                for y in (-0.75, 0.75):
                    m.box((0.07, 1.0, 0.03), at=(0, y, -0.005), mat='glow_a')
            else:
                m.prism([(-0.22, 0), (0.22, 0), (0.04, -0.28), (-0.04, -0.28)], C, at=(0, 2, 0.3), rot=(90, 0, 0), mat='hull', bevel=0.012)
                for k in range(5):
                    m.box((0.05, 0.4, 0.03), at=(0, -1.6 + k * 0.8, 0.015), mat='glow_a')
        cdecay(m, rnd, 1.0)
        return m

    # ---------------------------------------------------------------- the door
    def door():
        fr = Mesh('frame')
        _frame(fr, 'hull_dark', 'trim')
        fr.box((DW + 0.5, DT + 0.2, 0.04), at=(0, 0, DH + 0.24), mat='glow_a')
        objs = [fr.to_object()]
        parts = {}
        if wet:                                          # a bulkhead hatch in two leaves, a porthole in each, a wheel across the join
            for name, s in (('leaf_l', -1), ('leaf_r', 1)):
                m = Mesh(name)
                m.box((DW / 2, 0.2, DH), at=(s * DW / 4, 0, DH / 2), mat='hull', bevel=0.03)
                for f in (-1, 1):
                    m.box((DW / 2 - 0.2, 0.04, DH - 0.3), at=(s * DW / 4, f * 0.11, DH / 2), mat='trim', bevel=0.02)
                    m.ring(0.3, 0.05, at=(s * DW / 4, f * 0.14, 2.2), rot=(90, 0, 0), mat='copper', seg=14, tseg=5)
                    m.cyl(0.27, 0.02, at=(s * DW / 4, f * 0.135, 2.2), rot=(90, 0, 0), mat='glass', seg=14)
                    for z in (0.5, 1.2, 2.9):
                        m.box((DW / 2 - 0.3, 0.03, 0.06), at=(s * DW / 4, f * 0.135, z), mat='rust')
                    m.box((0.2, 0.05, 0.16), at=(s * 0.2, f * 0.13, 1.5), mat='lock')
                m.box((0.04, 0.22, DH), at=(s * 0.02, 0, DH / 2), mat='hazard')
                objs.append(m.to_object(origin=(0, 0, 0)))
                parts[name] = dict(move=(s * (DW / 2 - 0.06), 0, 0))
            return dict(objects=objs, meta=dict(type='door', time=0.8, sound='door_heavy', parts=parts))
        n = 3                                            # a segmented shutter that folds up into the lintel
        for i in range(n):
            m = Mesh('slat%d' % i)
            z0 = i * DH / n
            th = 0.24 - i * 0.03
            m.box((DW, th, DH / n + 0.04), at=(0, 0, z0 + DH / n / 2), mat='hull', bevel=0.025)
            for f in (-1, 1):
                m.box((DW - 0.3, 0.03, DH / n - 0.3), at=(0, f * (th / 2 + 0.012), z0 + DH / n / 2), mat='trim', bevel=0.012)
                m.box((DW - 0.6, 0.02, 0.05), at=(0, f * (th / 2 + 0.034), z0 + DH / n / 2), mat='glow_a' if i == 1 else 'accent')
                if i == 1:
                    m.box((0.5, 0.05, 0.14), at=(0, f * (th / 2 + 0.04), z0 + 0.3), mat='lock')
            objs.append(m.to_object(origin=(0, 0, 0)))
            parts['slat%d' % i] = dict(move=(0, 0, DH - z0 - 0.1 * (n - i)), delay=0.06 * (n - 1 - i))
        return dict(objects=objs, meta=dict(type='door', time=0.7, sound='door_heavy', parts=parts))

    # ---------------------------------------------------------------- furniture
    def grime(m, rnd, w, d, top=0.0):
        """What the place has done to a piece of furniture standing in it."""
        if wet:
            for k in range(4):
                m.ball(rnd.uniform(0.07, 0.16), at=(rnd.uniform(-w / 2, w / 2), rnd.choice([-1, 1]) * d / 2, rnd.uniform(0.02, 0.2)), mat='rot_a', seg=5, scale=(1.4, 0.7, 0.7))
            for k in range(3):
                m.ball(0.05, at=(rnd.uniform(-w / 2, w / 2), -d / 2 - 0.01, rnd.uniform(0.4, max(0.5, top))), mat='rot_b', seg=5)
        else:
            for k in range(3):
                m.ball(rnd.uniform(0.25, 0.45), at=(rnd.uniform(-w / 2, w / 2), rnd.choice([-1, 1]) * (d / 2 + 0.05), -0.05), mat='rot_a', seg=7, scale=(1.5, 0.9, 0.5))
            if top > 0:
                m.ball(0.3, at=(rnd.uniform(-w / 4, w / 4), 0, top), mat='rot_a', seg=7, scale=(1.4, 0.8, 0.12))

    def console():
        """An industrial work station: a pedestal desk, a deck of switches, screens over it."""
        rnd = random.Random(11)
        m = Mesh(tag + '_console')
        m.box((1.9, 0.75, 0.8), at=(0, 0.1, 0.4), mat='hull_dark', bevel=0.03)
        m.box((2.0, 0.95, 0.09), at=(0, 0.0, 0.84), mat='trim', bevel=0.02)
        m.box((1.8, 0.5, 0.06), at=(0, -0.18, 0.93), rot=(14, 0, 0), mat='hull', bevel=0.015)             # the deck of switches
        for i in range(12):
            for j in range(2):
                m.box((0.07, 0.07, 0.035), at=(-0.75 + i * 0.136, -0.28 + j * 0.16, 0.975 + j * 0.04), rot=(14, 0, 0),
                      mat=rnd.choice(['hull_dark', 'hull_dark', 'accent', 'glow_a', 'glow_amber', 'chrome']))
        m.box((2.0, 0.28, 0.75), at=(0, 0.32, 1.26), mat='hull_dark', bevel=0.03)                          # the hood
        if wet:                                          # one round-cornered tube and a plate of dials
            m.box((1.0, 0.04, 0.6), at=(-0.4, 0.165, 1.28), mat='trim', bevel=0.08)
            m.box((0.84, 0.02, 0.46), at=(-0.4, 0.14, 1.28), mat='screen')
            for i in range(2):
                for j in range(2):
                    m.cyl(0.12, 0.05, at=(0.42 + i * 0.3, 0.16, 1.12 + j * 0.3), rot=(90, 0, 0), mat='copper', seg=10)
                    m.cyl(0.095, 0.02, at=(0.42 + i * 0.3, 0.13, 1.12 + j * 0.3), rot=(90, 0, 0), mat='dial' if (i + j) % 2 else 'glow_a', seg=10)
            m.tube([(0.9, 0.3, 1.6), (1.1, 0.4, 1.2), (1.05, 0.45, 0.1)], 0.04, mat='copper', seg=6)
        else:                                            # three flat screens, the outer two turned in
            for i, a in ((-1, 16), (0, 0), (1, -16)):
                m.box((0.6, 0.04, 0.5), at=(i * 0.62, 0.17 - abs(i) * 0.05, 1.28), rot=(0, 0, a), mat='hull', bevel=0.02)
                m.box((0.5, 0.02, 0.4), at=(i * 0.62, 0.145 - abs(i) * 0.05, 1.28), rot=(0, 0, a), mat='screen' if i != 1 else 'screen_dead')
            m.box((0.5, 0.3, 0.3), at=(0.6, 0.3, 1.78), rot=(0, 0, 8), mat='rot_b', bevel=0.02)             # a unit somebody left on top
        for s in (-1, 1):
            m.box((0.5, 0.6, 0.03), at=(s * 0.6, -0.26, 0.5), mat='trim')                                   # drawer fronts
            m.box((0.2, 0.03, 0.03), at=(s * 0.6, -0.57, 0.5), mat='chrome')
        grime(m, rnd, 1.9, 0.9, 1.66)
        return dict(objects=[m.to_object()], meta=dict(type='prop', name=('Bulkhead Work Station' if wet else 'Triple-Screen Work Station'), solid=(2.0, 1.7, 0.95),
                                                        light=dict(color=DROWNED_MATS['screen']['emit'] if wet else DUST_MATS['screen']['emit'], energy=0.5, range=3.5, at=(0, -0.6, 1.4))))

    def bench():
        """Lab equipment on a bench."""
        rnd = random.Random(12)
        m = Mesh(tag + '_bench')
        m.box((2.3, 0.85, 0.08), at=(0, 0, 0.88), mat='trim', bevel=0.02)
        for (x, y) in ((-1.05, -0.33), (1.05, -0.33), (-1.05, 0.33), (1.05, 0.33)):
            m.box((0.08, 0.08, 0.86), at=(x, y, 0.43), mat='hull_dark')
        m.box((2.1, 0.7, 0.04), at=(0, 0, 0.25), mat='hull_dark')
        m.box((0.6, 0.5, 0.4), at=(-0.7, 0.05, 0.46), mat='hull', bevel=0.02)                              # a unit on the shelf under
        if wet:
            for i, x in enumerate((-0.8, -0.3)):         # culture jars, one still glowing
                m.cyl(0.17, 0.5, at=(x, 0.12, 1.17), mat='glass', seg=10)
                m.cyl(0.14, 0.34 - i * 0.14, at=(x, 0.12, 1.1 - i * 0.07), mat='tank' if i == 0 else 'rot_c', seg=8)
                m.cyl(0.19, 0.05, at=(x, 0.12, 1.44), mat='copper', seg=10)
            m.tube([(-0.8, 0.12, 1.47), (-0.55, 0.2, 1.7), (-0.3, 0.12, 1.47)], 0.025, mat='cable', seg=5)
            m.box((0.5, 0.4, 0.3), at=(0.45, 0.1, 1.07), mat='hull', bevel=0.02)                            # an analyser with a dial
            m.cyl(0.11, 0.03, at=(0.45, -0.11, 1.1), rot=(90, 0, 0), mat='dial', seg=10)
            m.cyl(0.05, 0.3, at=(0.95, 0.0, 1.07), mat='chrome', seg=8)                                     # a microscope, more or less
            m.box((0.22, 0.26, 0.04), at=(0.95, -0.04, 0.94), mat='hull_dark')
            m.cyl(0.035, 0.24, at=(0.95, -0.1, 1.24), rot=(40, 0, 0), mat='trim', seg=6)
        else:
            m.cyl(0.3, 0.3, at=(-0.7, 0.05, 1.07), mat='hull', seg=14)                                      # a centrifuge, lid up
            m.cyl(0.24, 0.04, at=(-0.7, 0.05, 1.2), mat='hull_dark', seg=12)
            m.cyl(0.3, 0.04, at=(-0.7, 0.36, 1.42), rot=(72, 0, 0), mat='trim', seg=14)
            for i in range(6):                           # a rack of sample tubes, sand in most
                m.cyl(0.035, 0.26, at=(-0.1 + i * 0.1, 0.15, 1.07), mat='glass', seg=6)
                m.cyl(0.028, rnd.uniform(0.05, 0.2), at=(-0.1 + i * 0.1, 0.15, 1.0), mat='rot_a' if i % 3 else 'tank', seg=6)
            m.box((0.7, 0.12, 0.05), at=(0.15, 0.15, 0.99), mat='trim')
            m.box((0.5, 0.36, 0.34), at=(0.85, 0.1, 1.09), mat='rot_b', bevel=0.02)                         # an oscilloscope
            m.box((0.24, 0.02, 0.2), at=(0.77, -0.085, 1.12), mat='screen')
            for j in range(3):
                m.cyl(0.03, 0.03, at=(1.0, -0.09, 1.0 + j * 0.1), rot=(90, 0, 0), mat='hull_dark', seg=6)
        grime(m, rnd, 2.3, 0.85, 0.93)
        return dict(objects=[m.to_object()], meta=dict(type='prop', name=('Wet Lab Bench' if wet else 'Assay Bench'), solid=(2.3, 1.5, 0.85)))

    def vessel():
        """Wet: a specimen cylinder standing on the floor, cracked. Dry: a cabinet of data reels."""
        rnd = random.Random(13)
        if wet:
            m = Mesh(tag + '_tank')
            m.cyl(0.62, 0.4, at=(0, 0, 0.2), mat='trim', seg=14)
            m.cyl(0.5, 1.5, at=(0, 0, 1.15), mat='tank', seg=12)
            m.ball(0.3, at=(0.05, 0, 1.1), mat='rot_c', seg=8, scale=(0.8, 0.8, 1.7))
            m.cyl(0.56, 1.9, at=(0, 0, 1.35), mat='glass', seg=14)
            m.cyl(0.64, 0.3, at=(0, 0, 2.45), mat='trim', seg=14)
            for a in (40, 160, 280):
                m.tube([(0.5 * math.cos(math.radians(a)), 0.5 * math.sin(math.radians(a)), 2.6), (0.75 * math.cos(math.radians(a)), 0.75 * math.sin(math.radians(a)), 2.9),
                        (0.8 * math.cos(math.radians(a)), 0.8 * math.sin(math.radians(a)), 3.4)], 0.05, mat='copper', seg=6)
            m.box((0.36, 0.1, 0.26), at=(0, -0.6, 0.24), mat='hull_dark', bevel=0.02)
            m.box((0.26, 0.02, 0.14), at=(0, -0.655, 0.25), mat='screen')
            grime(m, rnd, 1.2, 1.2, 0.0)
            return dict(objects=[m.to_object()], meta=dict(type='prop', name='Specimen Cylinder', solid=(1.3, 2.6, 1.3),
                                                            light=dict(color=DROWNED_MATS['tank']['emit'], energy=0.9, range=4.5, at=(0, 0, 1.3))))
        m = Mesh(tag + '_reel')
        m.box((1.5, 0.7, 2.3), at=(0, 0, 1.15), mat='hull', bevel=0.03)
        m.box((1.3, 0.04, 1.1), at=(0, -0.36, 1.6), mat='hull_dark', bevel=0.02)
        for s in (-1, 1):
            m.cyl(0.26, 0.06, at=(s * 0.34, -0.4, 1.78), rot=(90, 0, 0), mat='trim', seg=14)
            m.cyl(0.08, 0.08, at=(s * 0.34, -0.41, 1.78), rot=(90, 0, 0), mat='accent', seg=8)
        m.box((0.7, 0.02, 0.03), at=(0, -0.4, 1.3), mat='copper')                                           # the tape between them
        m.box((1.2, 0.02, 0.9), at=(0, -0.385, 1.6), mat='glass')
        for j in range(3):
            for i in range(8):
                m.box((0.09, 0.03, 0.05), at=(-0.5 + i * 0.14, -0.36, 0.5 + j * 0.16), mat=rnd.choice(['glow_a', 'hull_dark', 'hull_dark', 'glow_amber', 'trim']))
        m.box((0.6, 0.03, 0.9), at=(1.0, -0.5, 0.5), rot=(-10, 0, 30), mat='rot_b', bevel=0.012)             # a side panel, off
        grime(m, rnd, 1.5, 0.7, 2.3)
        return dict(objects=[m.to_object()], meta=dict(type='prop', name='Reel Cabinet', solid=(1.5, 2.3, 0.75)))

    def machine():
        """Wet: a pump with a flywheel and a gauge. Dry: a long instrument on a mount, aimed at nothing now."""
        rnd = random.Random(14)
        if wet:
            m = Mesh(tag + '_pump')
            m.box((2.3, 1.5, 0.3), at=(0, 0, 0.15), mat='hull_dark', bevel=0.03)
            m.cyl(0.6, 1.5, at=(-0.3, 0, 0.95), rot=(0, 90, 0), mat='hull', seg=14)
            for x in (-1.0, 0.4):
                m.cyl(0.66, 0.12, at=(x, 0, 0.95), rot=(0, 90, 0), mat='trim', seg=14)
            m.ring(0.55, 0.07, at=(0.85, 0, 0.95), rot=(0, 90, 0), mat='rust', seg=18, tseg=6)              # the flywheel
            for a in range(3):
                m.box((0.05, 1.05, 0.07), at=(0.85, 0, 0.95), rot=(a * 60, 0, 0), mat='rust')
            m.cyl(0.08, 0.5, at=(0.75, 0, 0.95), rot=(0, 90, 0), mat='chrome', seg=8)
            m.cyl(0.16, 1.6, at=(-0.6, 0.3, 1.9), mat='copper', seg=10)                                     # up and out
            m.cyl(0.21, 0.1, at=(-0.6, 0.3, 1.5), mat='trim', seg=10)
            m.cyl(0.16, 0.05, at=(-0.2, -0.62, 1.2), rot=(90, 0, 0), mat='trim', seg=12)
            m.cyl(0.13, 0.02, at=(-0.2, -0.65, 1.2), rot=(90, 0, 0), mat='glow_a', seg=12)
            m.cyl(0.4, 0.008, at=(0.3, -0.9, 0.006), mat='water', seg=12)
            grime(m, rnd, 2.3, 1.5, 0.0)
            return dict(objects=[m.to_object()], meta=dict(type='prop', name='Bilge Pump', solid=(2.3, 2.7, 1.5)))
        m = Mesh(tag + '_scope')
        m.cyl(0.8, 0.3, at=(0, 0, 0.15), mat='hull_dark', seg=14)
        m.cyl(0.26, 1.0, at=(0, 0, 0.8), mat='trim', seg=10)
        m.box((0.5, 1.2, 0.5), at=(0, 0, 1.45), mat='hull', bevel=0.04)
        m.cyl(0.36, 2.5, at=(0, -0.1, 1.9), rot=(62, 0, 0), mat='hull', seg=14)                              # the barrel
        m.cyl(0.42, 0.2, at=(0, -1.12, 2.44), rot=(62, 0, 0), mat='trim', seg=14)
        m.cyl(0.33, 0.03, at=(0, -1.215, 2.49), rot=(62, 0, 0), mat='glow_a', seg=14)
        m.cyl(0.12, 0.5, at=(0.3, 0.6, 1.5), rot=(62, 0, 0), mat='chrome', seg=8)                            # the eyepiece end
        m.box((0.4, 0.3, 0.3), at=(-0.5, 0.3, 1.2), mat='rot_b', bevel=0.02)
        m.box((0.28, 0.02, 0.18), at=(-0.5, 0.145, 1.22), mat='screen')
        grime(m, rnd, 1.6, 1.6, 0.0)
        return dict(objects=[m.to_object()], meta=dict(type='prop', name='Survey Instrument', solid=(1.7, 3.0, 2.4)))

    def rack():
        rnd = random.Random(15)
        m = Mesh(tag + '_rack')
        m.push(R(0, 3 if wet else 0, 0))                 # the wet one has settled
        m.box((0.95, 0.85, 2.2), at=(0, 0, 1.1), mat='hull_dark', bevel=0.03)
        for j in range(9):
            if rnd.random() < 0.15:
                continue
            out = 0.03 + (0.12 if rnd.random() < 0.2 else 0.0)
            m.box((0.8, 0.06 + out, 0.18), at=(0, -0.43 - out / 2, 0.3 + j * 0.21), mat=rnd.choice(['hull', 'trim', 'hull']), bevel=0.012)
            for i in range(6):
                m.box((0.04, 0.02, 0.03), at=(-0.3 + i * 0.08, -0.47 - out, 0.33 + j * 0.21), mat=rnd.choice(['glow_a', 'glow_amber', 'hull_dark', 'hull_dark']))
        m.pop()
        if not wet:
            m.box((0.9, 0.03, 2.0), at=(-0.75, -0.55, 1.05), rot=(0, 0, 62), mat='hull', bevel=0.012)        # its door, open
        grime(m, rnd, 0.95, 0.85, 2.2)
        return dict(objects=[m.to_object()], meta=dict(type='prop', name=('Sunk Server Stack' if wet else 'Relay Stack'), solid=(1.0, 2.2, 0.9),
                                                        light=dict(color=(DROWNED_MATS if wet else DUST_MATS)['glow_a']['emit'], energy=0.4, range=3, at=(0, -0.7, 1.2))))

    def cart():
        rnd = random.Random(16)
        m = Mesh(tag + '_cart')
        if wet:                                          # a tool trolley, rusted where it stopped
            for z in (0.25, 0.75):
                m.box((1.1, 0.6, 0.04), at=(0, 0, z), mat='trim', bevel=0.012)
                m.box((1.1, 0.03, 0.1), at=(0, -0.3, z + 0.05), mat='rust')
            for (x, y) in ((-0.5, -0.26), (0.5, -0.26), (-0.5, 0.26), (0.5, 0.26)):
                m.box((0.04, 0.04, 0.95), at=(x, y, 0.5), mat='hull_dark')
                m.cyl(0.07, 0.05, at=(x, y, 0.07), rot=(0, 90, 0), mat='cable', seg=8)
            m.box((0.4, 0.3, 0.22), at=(-0.25, 0, 0.88), mat='accent', bevel=0.02)
            m.cyl(0.12, 0.3, at=(0.3, 0.05, 0.92), mat='copper', seg=8)
            m.box((0.5, 0.1, 0.05), at=(0.1, -0.1, 0.3), rot=(0, 0, 20), mat='chrome')
        else:                                            # crates, half under a drift
            m.box((0.9, 0.7, 0.6), at=(0, 0, 0.3), mat='hull', bevel=0.03)
            m.box((0.94, 0.74, 0.06), at=(0, 0, 0.3), mat='accent')
            m.box((0.6, 0.5, 0.45), at=(0.12, 0.05, 0.83), rot=(0, 0, 18), mat='rot_b', bevel=0.03)
            m.box((0.3, 0.02, 0.14), at=(0, -0.36, 0.42), mat='accent2')
            m.ball(0.6, at=(-0.45, -0.2, -0.05), mat='rot_a', seg=8, scale=(1.3, 1.0, 0.6))
        grime(m, rnd, 1.1, 0.7, 0.0)
        return dict(objects=[m.to_object()], meta=dict(type='prop', name=('Tool Trolley' if wet else 'Buried Crates'), solid=(1.15, 1.05, 0.75)))

    def arm():
        """For the robot rooms: a service arm on a pedestal, frozen mid-job."""
        rnd = random.Random(17)
        m = Mesh(tag + '_arm')
        m.cyl(0.5, 0.25, at=(0, 0, 0.125), mat='hull_dark', seg=12)
        m.cyl(0.32, 0.7, at=(0, 0, 0.6), mat='trim', seg=10)
        m.cyl(0.4, 0.12, at=(0, 0, 0.95), mat='accent', seg=12)
        pts = [(0, 0, 1.0), (0.1, -0.2, 1.9), (0.0, -0.9, 2.25), (-0.1, -1.2, 1.7)]
        for a, b in zip(pts, pts[1:]):
            m.tube([a, b], 0.11, mat='hull', seg=8)
            m.ball(0.17, at=b, mat='trim', seg=8)
        for s in (-1, 1):                                # the grip
            m.box((0.05, 0.08, 0.34), at=(pts[-1][0] + s * 0.1, pts[-1][1], pts[-1][2] - 0.22), rot=(0, s * 14, 0), mat='chrome')
        m.tube([(0.2, 0.1, 0.9), (0.35, -0.3, 1.7), (0.1, -0.85, 2.05)], 0.03, mat='cable', seg=5)
        m.box((0.3, 0.06, 0.2), at=(0, -0.33, 0.6), mat='hull_dark', bevel=0.012)
        m.box((0.2, 0.02, 0.1), at=(0, -0.365, 0.62), mat='screen')
        grime(m, rnd, 0.9, 0.9, 0.0)
        return dict(objects=[m.to_object()], meta=dict(type='prop', name='Service Arm', solid=(1.0, 2.4, 1.0)))

    W = ['rib', 'plate', 'gauges', 'screens', 'bigscreen', 'tank', 'rack', 'works', 'breach', 'light']
    tiles = {}
    for k in W:
        tiles['wall_%s_%s' % (tag, k)] = (lambda k=k: wall(1, k))
    tiles['wall_%s_rib2' % tag] = lambda: wall(2, 'rib')
    tiles['wall_%s_plate2' % tag] = lambda: wall(3, 'plate')
    tiles['wall_%s_bigscreen2' % tag] = lambda: wall(2, 'bigscreen')
    for k in ('plate', 'grate', 'glow', 'broken', 'work'):
        tiles['floor_%s_%s' % (tag, k)] = (lambda k=k: floor(1, k))
    tiles['floor_%s_plate2' % tag] = lambda: floor(2, 'plate')
    for k in ('plain', 'light', 'works', 'cables', 'rib'):
        tiles['ceil_%s_%s' % (tag, k)] = (lambda k=k: ceil(1, k))
    props = {'door_%s_%s' % (tag, 'hatch' if wet else 'shutter'): door, tag + '_console': console, tag + '_bench': bench, tag + ('_tank' if wet else '_reel'): vessel,
             tag + ('_pump' if wet else '_scope'): machine, tag + '_rack': rack, tag + '_cart': cart, tag + '_arm': arm}
    mats = DROWNED_MATS if wet else DUST_MATS
    ga, gw, sc, tk = mats['glow_a']['emit'], mats['glow_white']['emit'], mats['screen']['emit'], mats['tank']['emit']
    meta = {
        'ceil_%s_light' % tag: dict(light=dict(color=list(gw), energy=2.3, range=12, at=[0, -0.4, 0])),
        'ceil_%s_rib' % tag: dict(light=dict(color=list(ga), energy=1.0, range=8, at=[0, -0.3, 0])),
        'wall_%s_light' % tag: dict(light=dict(color=list(gw), energy=1.3, range=7, at=[0.2, 2.0, 0.7])),
        'wall_%s_screens' % tag: dict(light=dict(color=list(sc), energy=0.6, range=5, at=[0.2, 2.3, 0.7])),
        'wall_%s_bigscreen' % tag: dict(light=dict(color=list(sc), energy=0.8, range=6, at=[0.2, 2.1, 0.8])),
        'wall_%s_tank' % tag: dict(light=dict(color=list(tk), energy=0.9, range=5, at=[-0.4, 2.0, 0.8])),
        'floor_%s_grate' % tag: dict(light=dict(color=list(ga), energy=0.5, range=3.5, at=[0, 0.3, 0])),
    }
    return dict(mats=mats, tiles=tiles, props=props, meta=meta)


KITS = {'drowned': make('dr', True), 'dust': make('du', False)}
