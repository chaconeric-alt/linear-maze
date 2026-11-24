"""The Fittings kit, second half (kits_fittings.py has the first and the kit's materials): the medical pieces (a
restraint chair, a wall of morgue drawers, an IV stand, a surgical lamp), the office and briefing pieces (a lectern, a
projection screen, a pin board, a map table, a signals desk, a typewriter desk), the motor pool's vehicle and lift, and
the danger zones' own (a dead scavenger at the threshold, a Garnisher dispenser). All face Blender's front view (-Y)."""
import math
from mz import Mesh
from kits_fittings import P, LAMP, legs4, FIT_MATS, PROPS_A


# ---------------------------------------------------------------- medical
def restraint_chair():
    """A heavy chair bolted to a plate: leather straps at wrist, ankle and brow, a headpiece on a gantry, its cable."""
    m = Mesh('restraint_chair')
    m.box((0.9, 0.9, 0.06), at=(0, 0, 0.03), mat='hull_dark')
    for x in (-0.38, 0.38):
        for y in (-0.38, 0.38):
            m.cyl(0.025, 0.02, at=(x, y, 0.07), mat='fit_steel', seg=6)
    m.box((0.2, 0.2, 0.4), at=(0, 0.05, 0.26), mat='fit_steel')
    m.box((0.64, 0.6, 0.1), at=(0, 0, 0.5), mat='fit_leather', bevel=0.03)
    m.box((0.64, 0.12, 0.9), at=(0, 0.3, 1.0), rot=(-10, 0, 0), mat='fit_leather', bevel=0.03)
    for s in (-1, 1):
        m.box((0.1, 0.55, 0.06), at=(s * 0.37, -0.02, 0.75), mat='fit_steel', bevel=0.01)      # the arms
        m.box((0.13, 0.08, 0.08), at=(s * 0.37, -0.15, 0.78), mat='canvas')                   # wrist straps
        m.box((0.12, 0.1, 0.35), at=(s * 0.14, -0.38, 0.28), rot=(-20, 0, 0), mat='fit_steel')
        m.box((0.15, 0.1, 0.07), at=(s * 0.14, -0.42, 0.22), mat='canvas')                    # ankle straps
    m.box((0.06, 0.06, 1.0), at=(0, 0.45, 1.55), mat='fit_steel')                              # the gantry
    m.box((0.06, 0.3, 0.06), at=(0, 0.3, 2.02), mat='fit_steel')
    m.lathe([(0.0, 0.0), (0.16, 0.0), (0.18, 0.12), (0.0, 0.14)], at=(0, 0.2, 1.75), rot=(180, 0, 0), mat='trim', seg=12)   # the headpiece
    m.ring(0.17, 0.02, at=(0, 0.2, 1.7), mat='canvas', seg=14, tseg=4)
    for k in range(4):
        a = k * math.pi / 2
        m.cyl(0.012, 0.03, at=(0.15 * math.cos(a), 0.2 + 0.15 * math.sin(a), 1.68), mat='glow_amber', seg=6)
    m.tube([(0, 0.45, 2.0), (0.2, 0.55, 1.6), (0.3, 0.5, 0.6), (0.35, 0.45, 0.06)], 0.02, mat='rubber', seg=5)
    return P(m, 'Restraint Chair', (0.9, 2.05, 0.95))


def morgue_drawers():
    """A wall of nine steel drawers, three by three, each with its handle and name card; one pulled half out, a shape
    under a sheet on it, a tag on its toe."""
    m = Mesh('morgue_drawers')
    m.box((2.2, 0.8, 2.1), at=(0, 0.1, 1.05), mat='fit_steel', bevel=0.02)
    for i in range(3):
        for j in range(3):
            x, z = -0.72 + i * 0.72, 0.36 + j * 0.68
            if (i, j) == (1, 0):
                continue
            m.box((0.64, 0.03, 0.6), at=(x, -0.31, z), mat='fit_steel', bevel=0.01)
            m.box((0.24, 0.04, 0.04), at=(x, -0.34, z - 0.1), mat='trim')
            m.box((0.14, 0.01, 0.07), at=(x, -0.33, z + 0.15), mat='fit_paper')
    m.box((0.64, 1.0, 0.06), at=(0, -0.8, 0.32), mat='fit_steel', bevel=0.01)                 # the drawer pulled out
    m.box((0.64, 0.05, 0.6), at=(0, -1.3, 0.36), mat='fit_steel', bevel=0.01)
    m.ball(0.28, at=(0, -0.72, 0.45), mat='fit_sheet', seg=12, scale=(0.85, 1.9, 0.45))       # the sheet over it
    for s in (-1, 1):
        m.ball(0.06, at=(s * 0.08, -1.2, 0.47), mat='fit_sheet', seg=8)                        # feet
    m.box((0.05, 0.01, 0.07), at=(0.08, -1.27, 0.42), mat='fit_paper')                        # the toe tag
    return P(m, 'Morgue Drawers', (2.2, 2.1, 0.8), solids=[[0, 1.05, 0.1, 2.2, 2.1, 0.8], [0, 0.35, -0.8, 0.7, 0.7, 1.0]])


def iv_stand():
    """An IV stand: a five-wheeled base, a pole, a bag of something cloudy, its line."""
    m = Mesh('iv_stand')
    for k in range(5):
        a = 2 * math.pi * k / 5
        m.tube([(0, 0, 0.1), (0.3 * math.cos(a), 0.3 * math.sin(a), 0.06)], 0.015, mat='fit_steel', seg=5)
        m.ball(0.03, at=(0.3 * math.cos(a), 0.3 * math.sin(a), 0.03), mat='rubber', seg=6)
    m.cyl(0.015, 1.9, at=(0, 0, 1.05), mat='fit_steel', seg=6)
    m.box((0.3, 0.02, 0.02), at=(0, 0, 1.98), mat='fit_steel')
    m.box((0.14, 0.05, 0.24), at=(0.1, 0, 1.8), mat='glass', bevel=0.02)                     # the bag
    m.box((0.12, 0.04, 0.12), at=(0.1, 0, 1.74), mat='glow_amber', bevel=0.02)
    m.tube([(0.1, 0, 1.66), (0.12, -0.05, 1.3), (0.2, -0.15, 1.0), (0.25, -0.2, 0.9)], 0.005, mat='glass', seg=4)
    m.box((0.12, 0.08, 0.16), at=(0, -0.04, 1.25), mat='hull_dark', bevel=0.01)              # the pump
    m.box((0.08, 0.005, 0.04), at=(0, -0.085, 1.28), mat='screen')
    return P(m, 'IV Stand', (0.6, 2.0, 0.6))


def surgical_lamp():
    """A surgical lamp on a weighted stand: a jointed arm and a wide round head of lights, aimed down."""
    m = Mesh('surgical_lamp')
    m.cyl(0.35, 0.1, at=(0, 0.3, 0.05), mat='hull', seg=16)
    m.cyl(0.04, 1.8, at=(0, 0.3, 1.0), mat='fit_steel', seg=8)
    m.ball(0.06, at=(0, 0.3, 1.92), mat='trim', seg=8)
    m.tube([(0, 0.3, 1.92), (0, -0.1, 2.15), (0, -0.45, 2.05)], 0.03, mat='fit_steel', seg=6)
    m.lathe([(0.0, 0.1), (0.38, 0.06), (0.42, 0.0), (0.4, -0.04), (0.0, -0.02)], at=(0, -0.45, 1.98), mat='hull', seg=20)
    for k in range(7):
        a = 2 * math.pi * k / 6
        at = (0.0, -0.45, 1.95) if k == 6 else (0.24 * math.cos(a), -0.45 + 0.24 * math.sin(a), 1.95)
        m.cyl(0.07, 0.02, at=at, mat='glow_white', seg=10)
    return P(m, 'Surgical Lamp', (0.8, 2.3, 1.0), light=LAMP((0, -0.45, 1.8), 1.2, 5.0, (0.95, 0.98, 1.0)))


# ---------------------------------------------------------------- briefing and offices
def lectern():
    """A wooden lectern: a sloped reading top with a brass lamp and a gooseneck microphone, the emblem plate on its front."""
    m = Mesh('lectern')
    m.box((0.55, 0.4, 1.0), at=(0, 0.05, 0.5), mat='fit_wood', bevel=0.02)
    m.box((0.7, 0.5, 0.06), at=(0, 0.02, 0.02), mat='fit_wood', bevel=0.01)
    m.box((0.7, 0.5, 0.05), at=(0, 0.0, 1.05), rot=(-18, 0, 0), mat='fit_wood', bevel=0.01)
    m.box((0.3, 0.22, 0.01), at=(0.05, 0.0, 1.08), rot=(-18, 0, 0), mat='fit_paper')
    m.cyl(0.11, 0.01, at=(0, -0.155, 0.6), rot=(90, 0, 0), mat='brass', seg=16)               # the emblem
    m.cyl(0.06, 0.012, at=(0, -0.16, 0.6), rot=(90, 0, 0), mat='fit_red', seg=5)
    m.tube([(-0.2, 0.2, 1.11), (-0.2, 0.15, 1.31), (-0.15, -0.05, 1.35)], 0.008, mat='hull_dark', seg=5)
    m.ball(0.025, at=(-0.15, -0.06, 1.35), mat='hull_dark', seg=6)
    m.tube([(0.25, 0.2, 1.13), (0.25, 0.18, 1.25), (0.18, 0.05, 1.26)], 0.01, mat='brass', seg=5)
    m.cyl(0.05, 0.05, at=(0.18, 0.05, 1.24), mat='fit_olive', seg=8, r2=0.03)
    return P(m, 'Lectern', (0.7, 1.4, 0.6), light=LAMP((0.18, 0.05, 1.25), 0.3, 2.5))


def projection_screen():
    """A tripod projection screen pulled up, showing a faint, flickering slide."""
    m = Mesh('projection_screen')
    for k in range(3):
        a = math.radians(90 + k * 120)
        m.tube([(0, 0.25, 0.9), (0.6 * math.cos(a), 0.25 + 0.6 * math.sin(a), 0.0)], 0.015, mat='fit_steel', seg=5)
    m.cyl(0.02, 2.3, at=(0, 0.25, 1.2), mat='fit_steel', seg=6)
    m.cyl(0.05, 2.1, at=(0, 0.2, 0.8), rot=(0, 90, 0), mat='hull_dark', seg=8)                # the roller case
    m.box((2.0, 0.01, 1.5), at=(0, 0.18, 1.6), mat='fit_sheet')
    m.box((2.0, 0.02, 0.03), at=(0, 0.18, 2.35), mat='hull_dark')
    m.box((1.4, 0.005, 0.9), at=(0, 0.172, 1.65), mat='screen')                                 # the slide
    return P(m, 'Projection Screen', (2.1, 2.4, 0.9))


def pin_board():
    """A cork board on the wall: orders, photographs and a map, pinned and joined with red string."""
    m = Mesh('pin_board')
    m.box((1.6, 0.05, 1.1), at=(0, 0.0, 1.6), mat='fit_wood', bevel=0.01)
    m.box((1.5, 0.02, 1.0), at=(0, -0.03, 1.6), mat='fit_cork')
    pins = [(-0.55, 1.88), (-0.2, 1.75), (0.3, 1.9), (0.5, 1.45), (-0.4, 1.35), (0.05, 1.3)]
    sizes = [(0.24, 0.3), (0.2, 0.15), (0.34, 0.26), (0.18, 0.24), (0.26, 0.2), (0.4, 0.28)]
    for (x, z), (w, h) in zip(pins, sizes):
        m.box((w, 0.004, h), at=(x, -0.043, z), mat='fit_paper')
        m.ball(0.012, at=(x, -0.05, z + h / 2 - 0.02), mat='fit_red', seg=6)
    for a, b in zip(pins, pins[1:]):
        m.tube([(a[0], -0.052, a[1] + 0.1), (b[0], -0.052, b[1] + 0.1)], 0.003, mat='fit_red', seg=3)
    return P(m, 'Pin Board', (1.6, 1.1, 0.1), mount='wall')


def map_table():
    """A map table: a wide paper map of the sector under a glass top, counters, a ruler, and a lamp on a bracket."""
    m = Mesh('map_table')
    legs4(m, 1.9, 1.1, 0.9, r=0.04, mat='fit_wood')
    m.box((2.1, 1.3, 0.06), at=(0, 0, 0.93), mat='fit_wood', bevel=0.01)
    m.box((1.9, 1.1, 0.01), at=(0, 0, 0.965), mat='fit_paper')
    for k in range(5):                                                                          # roads and contours
        m.box((1.8 - k * 0.2, 0.004, 0.005), at=(0, -0.4 + k * 0.2, 0.972), rot=(0, 0, 8 - k * 4), mat='fit_ink')
    m.box((1.92, 1.12, 0.005), at=(0, 0, 0.978), mat='glass')
    for (x, y, mat) in ((-0.5, 0.1, 'fit_red'), (-0.3, 0.2, 'fit_red'), (0.2, -0.2, 'fit_olive'), (0.45, -0.1, 'fit_olive'), (0.6, 0.3, 'fit_olive')):
        m.cyl(0.03, 0.03, at=(x, y, 0.995), mat=mat, seg=8)
    m.box((0.5, 0.04, 0.01), at=(0.1, 0.35, 0.985), rot=(0, 0, 25), mat='fit_wood')
    m.cyl(0.02, 1.0, at=(0.95, 0.5, 1.45), mat='fit_steel', seg=6)
    m.tube([(0.95, 0.5, 1.95), (0.5, 0.2, 2.0)], 0.015, mat='fit_steel', seg=5)
    m.cyl(0.14, 0.14, at=(0.5, 0.2, 1.93), mat='fit_olive', seg=10, r2=0.06)
    return P(m, 'Map Table', (2.1, 1.1, 1.3), light=LAMP((0.5, 0.2, 1.7), 0.8, 4.0))


def signals_desk():
    """A switchboard desk: a panel of jacks and lamps, patch cords hanging, a teleprinter with its paper, a headset."""
    m = Mesh('signals_desk')
    m.box((1.8, 0.7, 0.75), at=(0, 0, 0.375), mat='fit_olive', bevel=0.02)
    m.box((1.85, 0.75, 0.04), at=(0, 0, 0.77), mat='fit_wood')
    m.box((1.8, 0.2, 0.8), at=(0, 0.28, 1.19), rot=(-12, 0, 0), mat='fit_olive', bevel=0.02)   # the board
    for i in range(10):
        for j in range(4):
            mat = 'glow_amber' if (i * 3 + j) % 7 == 0 else ('glow_green' if (i + j * 5) % 11 == 0 else 'hull_dark')
            z = 0.95 + j * 0.16
            m.cyl(0.02, 0.03, at=(-0.72 + i * 0.16, 0.175 + (z - 1.19) * 0.21, z), rot=(78, 0, 0), mat=mat, seg=6)   # on the board's leaning face
    for k in range(5):                                                                          # the cords
        x = -0.6 + k * 0.28
        m.tube([(x, 0.2, 1.1), (x + 0.05, -0.1, 0.95), (x + 0.1, -0.05, 0.8)], 0.008, mat=('fit_red', 'hull_dark')[k % 2], seg=4)
    m.box((0.5, 0.4, 0.22), at=(0.55, -0.08, 0.9), mat='hull', bevel=0.03)                    # the teleprinter
    m.box((0.36, 0.005, 0.3), at=(0.55, 0.04, 1.12), rot=(-10, 0, 0), mat='fit_paper')
    m.ring(0.08, 0.02, at=(-0.5, -0.2, 0.83), rot=(90, 0, 0), mat='hull_dark', seg=10, tseg=4)  # the headset
    return P(m, 'Signals Desk', (1.85, 1.6, 0.8))


def typewriter_desk():
    """A steel office desk: a typewriter with a sheet in it, a desk lamp, a stack of forms and a wire in-tray."""
    m = Mesh('typewriter_desk')
    m.box((0.45, 0.7, 0.72), at=(0.45, 0, 0.36), mat='fit_olive', bevel=0.015)
    for j in range(3):
        m.box((0.38, 0.02, 0.18), at=(0.45, -0.355, 0.15 + j * 0.22), mat='fit_olive', bevel=0.008)
        m.box((0.1, 0.02, 0.02), at=(0.45, -0.37, 0.2 + j * 0.22), mat='fit_steel')
    m.box((0.04, 0.7, 0.72), at=(-0.62, 0, 0.36), mat='fit_olive')
    m.box((1.35, 0.75, 0.04), at=(0, 0, 0.74), mat='fit_olive', bevel=0.01)
    m.box((0.42, 0.32, 0.12), at=(-0.15, -0.05, 0.82), mat='hull_dark', bevel=0.03)          # the typewriter
    m.cyl(0.03, 0.44, at=(-0.15, 0.08, 0.9), rot=(0, 90, 0), mat='rubber', seg=8)
    m.box((0.22, 0.005, 0.28), at=(-0.15, 0.11, 1.02), rot=(-15, 0, 0), mat='fit_paper')
    for k in range(4):
        m.box((0.34, 0.03, 0.01), at=(-0.15, -0.16 + k * 0.035, 0.89 + k * 0.01), mat='trim')
    m.box((0.22, 0.3, 0.06), at=(0.38, -0.05, 0.79), mat='fit_paper')                          # forms
    m.box((0.26, 0.32, 0.08), at=(0.38, 0.2, 0.8), mat='fit_steel')
    m.cyl(0.07, 0.02, at=(-0.5, 0.2, 0.77), mat='hull_dark', seg=10)                          # the lamp
    m.tube([(-0.5, 0.2, 0.77), (-0.48, 0.22, 1.12), (-0.4, 0.05, 1.18)], 0.012, mat='hull_dark', seg=5)
    m.cyl(0.09, 0.1, at=(-0.4, 0.05, 1.15), mat='fit_olive', seg=10, r2=0.04)
    return P(m, 'Typewriter Desk', (1.35, 1.2, 0.75), light=LAMP((-0.4, 0.05, 1.05), 0.5, 3.0))


# ---------------------------------------------------------------- motor pool
def vehicle():
    """A half-track: an olive armoured cab, two road wheels at the front and a track at the back, a pintle mount, a
    jerrycan and a spare. Longer than a cell is wide: it stands lengthwise."""
    m = Mesh('vehicle')
    m.box((1.9, 3.4, 0.7), at=(0, 0.1, 0.95), mat='fit_olive', bevel=0.06)                   # the hull
    m.box((1.8, 1.1, 0.6), at=(0, -0.6, 1.55), mat='fit_olive', bevel=0.05)                  # the cab
    m.box((1.6, 0.05, 0.36), at=(0, -1.16, 1.58), rot=(-15, 0, 0), mat='glass')
    m.box((1.86, 1.8, 0.4), at=(0, 0.85, 1.48), mat='fit_olive', bevel=0.04)                 # the bed, sides up
    m.box((1.6, 1.6, 0.05), at=(0, 0.85, 1.3), mat='hull_dark')
    m.box((1.9, 0.2, 0.3), at=(0, -1.6, 0.85), mat='hull_dark', bevel=0.03)                  # the bumper
    for s in (-1, 1):
        m.cyl(0.38, 0.28, at=(s * 0.9, -1.1, 0.4), rot=(0, 90, 0), mat='rubber', seg=14)      # front wheels
        m.cyl(0.2, 0.3, at=(s * 0.9, -1.1, 0.4), rot=(0, 90, 0), mat='fit_olive', seg=10)
        m.box((0.32, 1.9, 0.6), at=(s * 0.86, 0.85, 0.32), mat='rubber', bevel=0.2)           # the track
        for k in range(4):
            m.cyl(0.2, 0.34, at=(s * 0.86, 0.15 + k * 0.47, 0.3), rot=(0, 90, 0), mat='trim', seg=10)
        m.box((0.2, 0.06, 0.12), at=(s * 0.6, -1.7, 0.98), mat='glow_amber')                  # the lamps
    m.cyl(0.04, 0.5, at=(0, 0.3, 1.95), mat='fit_steel', seg=6)                               # the pintle
    m.box((0.12, 0.8, 0.12), at=(0, 0.1, 2.2), mat='hull_dark')
    m.box((0.2, 0.35, 0.45), at=(-0.85, 1.6, 1.5), mat='fit_olive', bevel=0.03)              # jerrycan
    m.cyl(0.36, 0.22, at=(0.6, 1.8, 1.4), rot=(90, 0, 0), mat='rubber', seg=14)              # the spare
    return P(m, 'Half-Track', (2.0, 2.3, 3.6), light=LAMP((0, -1.8, 1.0), 0.6, 5.0))


def vehicle_lift():
    """A scissor lift for vehicles: two long platforms with hazard edges on scissor legs, a control post."""
    m = Mesh('vehicle_lift')
    for s in (-1, 1):
        m.box((0.6, 3.4, 0.08), at=(s * 0.7, 0, 0.62), mat='fit_steel', bevel=0.01)
        m.box((0.62, 3.4, 0.03), at=(s * 0.7, 0, 0.67), mat='hazard')
        for t in (-1, 1):                                                                      # the scissors
            m.box((0.08, 3.2, 0.08), at=(s * 0.7, 0, 0.33), rot=(t * 10, 0, 0), mat='trim')
        m.box((0.5, 3.0, 0.05), at=(s * 0.7, 0, 0.025), mat='hull_dark')
        m.box((0.6, 0.4, 0.06), at=(s * 0.7, -1.85, 0.32), rot=(-55, 0, 0), mat='fit_steel')  # the ramp
    m.cyl(0.05, 1.2, at=(1.4, -1.5, 0.6), mat='fit_steel', seg=8)
    m.box((0.25, 0.15, 0.3), at=(1.4, -1.5, 1.25), mat='hazard', bevel=0.02)
    m.cyl(0.03, 0.02, at=(1.4, -1.58, 1.3), rot=(90, 0, 0), mat='glow_green', seg=8)
    m.cyl(0.03, 0.02, at=(1.4, -1.58, 1.2), rot=(90, 0, 0), mat='glow_red', seg=8)
    return P(m, 'Vehicle Lift', (2.2, 0.7, 3.6))


# ---------------------------------------------------------------- the danger zones' own
def dead_scavenger():
    """A scavenger who went in and came back out as far as the door: sat against the wall in a canvas coat and a
    helmet, pack still on, legs out, a note pinned to the chest."""
    m = Mesh('dead_scavenger')
    m.box((0.5, 0.3, 0.55), at=(0, 0.22, 0.45), rot=(12, 0, 0), mat='canvas', bevel=0.08)     # the torso
    m.box((0.46, 0.22, 0.45), at=(0, 0.42, 0.55), rot=(12, 0, 0), mat='fit_olive', bevel=0.05)  # the pack
    m.ball(0.12, at=(0.05, 0.16, 0.85), mat='flesh_pale', seg=10)
    m.ball(0.15, at=(0.05, 0.18, 0.9), mat='fit_olive', seg=12, scale=(1, 1, 0.7))            # the helmet, tipped
    for s in (-1, 1):
        m.tube([(s * 0.13, 0.15, 0.2), (s * 0.16, -0.25, 0.1), (s * 0.18, -0.55, 0.08)], 0.07, mat='canvas', seg=7)   # legs
        m.box((0.12, 0.22, 0.12), at=(s * 0.18, -0.62, 0.08), mat='hull_dark', bevel=0.03)                             # boots
        m.tube([(s * 0.27, 0.2, 0.62), (s * 0.34, 0.05, 0.35), (s * 0.3, -0.15, 0.15)], 0.05, mat='canvas', seg=6)     # arms
        m.ball(0.05, at=(s * 0.3, -0.18, 0.12), mat='flesh_pale', seg=8)
    m.box((0.14, 0.01, 0.18), at=(0.0, 0.05, 0.55), rot=(12, 0, 8), mat='fit_paper')          # the note
    m.cyl(0.08, 0.2, at=(0.35, -0.3, 0.1), rot=(90, 0, 30), mat='hull_dark', seg=10)          # the dropped lamp
    return P(m, 'Dead Scavenger', (0.8, 1.0, 1.4))


def garnisher_dispenser():
    """A Collections Division dispenser: a steel cabinet with a lit COLLECTIONS panel, a coin-slot hatch the Garnishers
    come out of, hazard stripes, and a counter that only ever goes up."""
    m = Mesh('garnisher_dispenser')
    m.box((1.2, 0.8, 2.2), at=(0, 0.05, 1.1), mat='hull_dark', bevel=0.05)
    m.box((1.0, 0.04, 0.4), at=(0, -0.36, 1.85), mat='hull', bevel=0.02)
    m.box((0.8, 0.02, 0.12), at=(0, -0.385, 1.85), mat='glow_red')
    m.box((0.6, 0.05, 0.4), at=(0, -0.37, 1.1), mat='trim', bevel=0.03)                        # the hatch
    m.box((0.4, 0.02, 0.05), at=(0, -0.4, 1.1), mat='hull_dark')                               # its slot
    m.box((0.3, 0.02, 0.1), at=(0, -0.38, 1.45), mat='screen')                                 # the counter
    for k in range(5):
        m.box((0.2, 0.02, 0.06), at=(-0.4 + k * 0.2, -0.36, 0.25), rot=(0, 35, 0), mat='hazard')
    m.box((1.24, 0.84, 0.08), at=(0, 0.05, 2.24), mat='trim', bevel=0.02)
    m.cyl(0.06, 0.08, at=(0.45, 0.05, 2.32), mat='glow_amber', seg=10)                         # the beacon
    return P(m, 'Garnisher Dispenser', (1.2, 2.3, 0.85), light=LAMP((0, -0.6, 1.85), 0.6, 4.0, (1.0, 0.2, 0.15)))


PROPS_B = {f.__name__: f for f in (restraint_chair, morgue_drawers, iv_stand, surgical_lamp, lectern, projection_screen, pin_board, map_table,
                                   signals_desk, typewriter_desk, vehicle, vehicle_lift, dead_scavenger, garnisher_dispenser)}

PROPS = dict(PROPS_A)
PROPS.update(PROPS_B)
KITS = {'fittings': dict(mats=FIT_MATS, tiles={}, meta={}, props=PROPS)}
