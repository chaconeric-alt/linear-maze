"""The Fittings kit: the plain furniture every installation has, that rooms need to read as what they are (the dressing
doc's first tier, 23 Nov): chairs, footlockers, a stove and a prep table, toilet stalls and urinals, a weight bench
and a punching bag, firing booths and paper targets, cell cots; and, in fittings2.py, the medical, office, signals and
motor-pool pieces and the danger zones' own. Every other kit uses this one, so the pieces turn up wherever a room's
purpose asks for them, in their own materials (olive drab, stainless steel, porcelain, paper). All face Blender's front
view (-Y); a piece that stands back to a wall has its back at +Y."""
import math
from mz import Mesh

FIT_MATS = {
    'fit_olive':     dict(color=(0.24, 0.28, 0.15), metal=0.3, rough=0.55, shader='worn', grime=0.6),
    'fit_steel':     dict(color=(0.6, 0.62, 0.64), metal=0.9, rough=0.3, shader='worn', grime=0.35),
    'fit_wood':      dict(color=(0.42, 0.27, 0.14), metal=0.0, rough=0.6, shader='worn', grime=0.4),
    'fit_porcelain': dict(color=(0.9, 0.9, 0.87), metal=0.0, rough=0.15, shader='worn', grime=0.45),
    'fit_paper':     dict(color=(0.88, 0.85, 0.74), metal=0.0, rough=0.9),
    'fit_ink':       dict(color=(0.08, 0.08, 0.09), metal=0.0, rough=0.8),
    'fit_cork':      dict(color=(0.6, 0.42, 0.25), metal=0.0, rough=0.95),
    'fit_leather':   dict(color=(0.3, 0.15, 0.08), metal=0.0, rough=0.5, shader='worn', grime=0.4),
    'fit_mattress':  dict(color=(0.56, 0.55, 0.48), metal=0.0, rough=0.9, shader='worn', grime=0.6),
    'fit_blanket':   dict(color=(0.3, 0.32, 0.29), metal=0.0, rough=0.95),
    'fit_sheet':     dict(color=(0.84, 0.85, 0.83), metal=0.0, rough=0.8),
    'fit_red':       dict(color=(0.62, 0.08, 0.06), metal=0.1, rough=0.5, shader='worn', grime=0.4),
}


def P(m, name, solid, **meta):
    return dict(objects=[m.to_object()], meta=dict(type='prop', name=name, solid=solid, **meta))


def LAMP(at, energy=0.8, rng=4.5, color=(1.0, 0.82, 0.55)):
    return dict(color=color, energy=energy, range=rng, at=at)


def legs4(m, w, d, h, r=0.02, mat='fit_steel', z0=0.0):
    for sx in (-1, 1):
        for sy in (-1, 1):
            m.cyl(r, h, at=(sx * w / 2, sy * d / 2, z0 + h / 2), mat=mat, seg=6)


# ---------------------------------------------------------------- living
def chair_plain():
    """A stacking chair: a bent steel frame, an olive seat and back moulded in one."""
    m = Mesh('chair_plain')
    legs4(m, 0.4, 0.4, 0.45, r=0.016)
    m.box((0.46, 0.44, 0.04), at=(0, 0, 0.47), mat='fit_olive', bevel=0.015)
    for s in (-1, 1):
        m.cyl(0.016, 0.45, at=(s * 0.2, 0.21, 0.7), mat='fit_steel', seg=6)
    m.box((0.44, 0.04, 0.24), at=(0, 0.22, 0.82), rot=(-8, 0, 0), mat='fit_olive', bevel=0.015)
    m.box((0.42, 0.42, 0.02), at=(0, 0, 0.12), mat='fit_steel')                            # the rung shelf, for stacking
    return P(m, 'Chair', (0.5, 0.95, 0.5))


def footlocker():
    """An olive steel footlocker: lid, hasp and padlock, a stencilled number, carry handles."""
    m = Mesh('footlocker')
    m.box((0.9, 0.46, 0.38), at=(0, 0, 0.2), mat='fit_olive', bevel=0.02)
    m.box((0.92, 0.48, 0.06), at=(0, 0, 0.41), mat='fit_olive', bevel=0.02)               # the lid
    for x in (-0.3, 0.3):
        m.box((0.12, 0.03, 0.08), at=(x, -0.24, 0.36), mat='fit_steel')
    m.box((0.08, 0.03, 0.08), at=(0, -0.245, 0.34), mat='fit_steel')                      # the hasp
    m.box((0.05, 0.02, 0.06), at=(0, -0.26, 0.29), mat='brass')
    m.box((0.36, 0.005, 0.08), at=(0.18, -0.232, 0.18), mat='fit_paper')                  # the stencil
    for s in (-1, 1):
        m.ring(0.05, 0.01, at=(s * 0.46, 0, 0.26), rot=(0, 90, 0), mat='fit_steel', seg=10, tseg=4)
    return P(m, 'Footlocker', (0.92, 0.46, 0.48))


def cell_cot():
    """A steel cot bolted to the floor: a thin striped mattress, a grey blanket folded at the foot."""
    m = Mesh('cell_cot')
    m.box((0.85, 2.0, 0.06), at=(0, 0, 0.42), mat='fit_steel', bevel=0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            m.box((0.06, 0.06, 0.4), at=(sx * 0.38, sy * 0.92, 0.2), mat='fit_steel')
            m.box((0.14, 0.14, 0.01), at=(sx * 0.38, sy * 0.92, 0.005), mat='hull_dark')
    m.box((0.8, 1.9, 0.1), at=(0, 0, 0.5), mat='fit_mattress', bevel=0.03)
    m.box((0.82, 0.5, 0.06), at=(0, -0.65, 0.58), mat='fit_blanket', bevel=0.02)
    m.box((0.4, 0.28, 0.08), at=(0, 0.78, 0.59), mat='fit_sheet', bevel=0.03)
    return P(m, 'Cell Cot', (0.85, 0.6, 2.0))


# ---------------------------------------------------------------- kitchen
def stove():
    """An institutional range: six burners on a steel top, two oven doors with windows, a splashback with the knobs."""
    m = Mesh('stove')
    m.box((1.6, 0.8, 0.86), at=(0, 0, 0.43), mat='fit_steel', bevel=0.02)
    m.box((1.62, 0.82, 0.04), at=(0, 0, 0.88), mat='hull_dark')
    for i in range(3):
        for j in range(2):
            at = (-0.5 + i * 0.5, -0.17 + j * 0.36, 0.905)
            m.ring(0.13, 0.015, at=at, mat='trim', seg=14, tseg=4)
            m.ring(0.07, 0.012, at=at, mat='glow_amber' if (i + j) % 3 == 0 else 'trim', seg=12, tseg=4)
    for s in (-1, 1):
        m.box((0.7, 0.03, 0.5), at=(s * 0.38, -0.41, 0.42), mat='fit_steel', bevel=0.015)
        m.box((0.4, 0.01, 0.2), at=(s * 0.38, -0.43, 0.48), mat='glass')
        m.cyl(0.015, 0.5, at=(s * 0.38, -0.45, 0.72), rot=(0, 90, 0), mat='trim', seg=6)
    m.box((1.6, 0.08, 0.35), at=(0, 0.38, 1.07), mat='fit_steel', bevel=0.01)           # the splashback
    for k in range(6):
        m.cyl(0.03, 0.03, at=(-0.62 + k * 0.25, 0.33, 1.02), rot=(90, 0, 0), mat='hull_dark', seg=8)
    m.lathe([(0.0, 0.0), (0.16, 0.0), (0.17, 0.22), (0.0, 0.22)], at=(0.5, 0.18, 0.92), mat='trim', seg=12)      # a stockpot
    return P(m, 'Stove', (1.6, 1.25, 0.85))


def prep_table():
    """A steel prep table: a shelf under it, a chopping board, a knife rack, two pans."""
    m = Mesh('prep_table')
    legs4(m, 1.7, 0.7, 0.88, r=0.025)
    m.box((1.8, 0.8, 0.04), at=(0, 0, 0.9), mat='fit_steel', bevel=0.01)
    m.box((1.7, 0.7, 0.03), at=(0, 0, 0.22), mat='fit_steel')
    m.box((0.5, 0.35, 0.03), at=(-0.4, -0.05, 0.935), mat='fit_wood', bevel=0.008)
    m.box((0.3, 0.05, 0.03), at=(0.35, 0.3, 0.935), mat='hull_dark')
    for k in range(4):
        m.box((0.02, 0.008, 0.2), at=(0.25 + k * 0.06, 0.3, 1.04), mat='fit_steel')
    for x in (0.15, 0.55):
        m.lathe([(0.0, 0.0), (0.12, 0.0), (0.14, 0.06), (0.0, 0.06)], at=(x, -0.12, 0.92), mat='trim', seg=12)
    m.lathe([(0.0, 0.0), (0.2, 0.0), (0.21, 0.24), (0.0, 0.24)], at=(-0.5, 0.0, 0.25), mat='trim', seg=12)
    return P(m, 'Prep Table', (1.8, 1.1, 0.8))


# ---------------------------------------------------------------- hygiene
def toilet_stall():
    """A toilet in its stall: two steel partitions, a door standing half open, the bowl at the back."""
    m = Mesh('toilet_stall')
    for s in (-1, 1):
        m.box((0.04, 1.5, 1.8), at=(s * 0.52, -0.05, 1.05), mat='fit_olive', bevel=0.01)
        m.box((0.08, 0.08, 0.15), at=(s * 0.52, -0.6, 0.075), mat='fit_steel')
    m.box((1.1, 0.04, 0.06), at=(0, -0.8, 1.97), mat='fit_steel')
    m.box((0.04, 0.7, 1.6), at=(0.12, -1.0, 1.0), rot=(0, 0, 50), mat='fit_olive', bevel=0.01)    # the door, open
    m.box((0.06, 0.02, 0.06), at=(-0.16, -1.25, 1.0), mat='fit_steel')
    m.box((0.42, 0.22, 0.36), at=(0, 0.55, 0.72), mat='fit_porcelain', bevel=0.04)       # cistern
    m.lathe([(0.16, 0.0), (0.19, 0.06), (0.15, 0.2), (0.2, 0.38), (0.21, 0.42), (0.16, 0.42)], at=(0, 0.25, 0), mat='fit_porcelain', seg=14)
    m.cyl(0.21, 0.03, at=(0, 0.25, 0.44), mat='hull_dark', seg=14)
    m.cyl(0.015, 0.7, at=(0.15, 0.62, 1.25), mat='fit_steel', seg=6)                     # the pipe, and the chain
    m.cyl(0.04, 0.12, at=(-0.47, 0.2, 0.9), rot=(0, 90, 0), mat='fit_paper', seg=10)       # the roll
    return P(m, 'Toilet Stall', (1.1, 2.0, 1.6))


def urinal():
    """A porcelain urinal on the wall, a privacy screen beside it, the flush pipe running up."""
    m = Mesh('urinal')
    m.box((0.4, 0.06, 0.5), at=(0, 0.17, 0.85), mat='fit_porcelain', bevel=0.02)
    m.ball(0.22, at=(0, 0.05, 0.75), mat='fit_porcelain', seg=14, scale=(0.9, 0.7, 1.3))
    m.box((0.22, 0.02, 0.26), at=(0, -0.1, 0.8), mat='hull_dark')                          # the bowl's dark mouth
    m.cyl(0.02, 0.8, at=(0, 0.16, 1.45), mat='fit_steel', seg=6)
    m.box((0.08, 0.06, 0.1), at=(0, 0.14, 1.12), mat='fit_steel')
    m.box((0.04, 0.55, 1.2), at=(0.38, -0.08, 1.05), mat='fit_olive', bevel=0.01)         # the screen
    m.cyl(0.03, 0.02, at=(0, 0.05, 0.02), mat='fit_steel', seg=10)                         # the drain
    return P(m, 'Urinal', (0.8, 1.6, 0.6))


# ---------------------------------------------------------------- gym and range
def weight_bench():
    """A weight bench with its rack, a loaded bar across the uprights, plates stacked at the foot."""
    m = Mesh('weight_bench')
    m.box((0.32, 1.2, 0.08), at=(0, 0.1, 0.45), mat='fit_leather', bevel=0.03)
    for y in (-0.35, 0.55):
        m.box((0.06, 0.06, 0.42), at=(0, y, 0.21), mat='fit_steel')
        m.box((0.5, 0.06, 0.04), at=(0, y, 0.02), mat='fit_steel')
    for s in (-1, 1):
        m.box((0.06, 0.06, 1.15), at=(s * 0.42, 0.55, 0.58), mat='fit_steel')
        m.box((0.06, 0.12, 0.04), at=(s * 0.42, 0.5, 1.05), mat='fit_steel')
    m.cyl(0.018, 1.8, at=(0, 0.5, 1.1), rot=(0, 90, 0), mat='chrome', seg=8)              # the bar
    for s in (-1, 1):
        for k in range(2):
            m.cyl(0.2 - k * 0.04, 0.04, at=(s * (0.6 + k * 0.05), 0.5, 1.1), rot=(0, 90, 0), mat='hull_dark', seg=16)
    for k in range(3):
        m.cyl(0.18, 0.04, at=(0.4, -0.6, 0.02 + k * 0.045), mat='hull_dark', seg=16)
    return P(m, 'Weight Bench', (1.4, 1.2, 1.4))


def punching_bag():
    """A heavy bag hanging from a steel gallows by a chain: leather, taped, dented where it has been hit."""
    m = Mesh('punching_bag')
    m.box((0.08, 0.08, 2.4), at=(0, 0.42, 1.2), mat='fit_steel')
    m.box((0.08, 0.6, 0.08), at=(0, 0.14, 2.36), mat='fit_steel')
    m.box((0.6, 0.9, 0.04), at=(0, 0.25, 0.02), mat='fit_steel')
    m.tube([(0, -0.12, 2.32), (0, -0.12, 1.92)], 0.012, mat='trim', seg=4)
    m.lathe([(0.0, 0.0), (0.16, 0.02), (0.19, 0.1), (0.2, 0.9), (0.17, 1.0), (0.0, 1.02)], at=(0, -0.12, 0.88), mat='fit_leather', seg=14)
    for z in (1.12, 1.6):
        m.ring(0.205, 0.015, at=(0, -0.12, z), mat='hull_dark', seg=14, tseg=4)
    return P(m, 'Punching Bag', (0.6, 2.4, 0.9))


def firing_booth():
    """A firing booth: two partitions, a counter with ear defenders and a box of rounds, a number board."""
    m = Mesh('firing_booth')
    for s in (-1, 1):
        m.box((0.05, 1.0, 1.8), at=(s * 0.7, 0, 0.9), mat='fit_olive', bevel=0.01)
    m.box((1.36, 0.4, 0.05), at=(0, -0.3, 1.1), mat='fit_wood', bevel=0.01)              # the counter
    m.box((1.36, 0.04, 1.08), at=(0, -0.48, 0.54), mat='fit_olive')
    m.ring(0.07, 0.02, at=(-0.3, -0.3, 1.2), rot=(90, 0, 0), mat='hull_dark', seg=10, tseg=4)     # ear defenders
    for s in (-1, 1):
        m.cyl(0.05, 0.05, at=(-0.3 + s * 0.08, -0.3, 1.16), rot=(0, 90, 0), mat='fit_red', seg=10)
    m.box((0.16, 0.1, 0.06), at=(0.35, -0.3, 1.155), mat='fit_olive', bevel=0.01)
    m.box((0.4, 0.03, 0.3), at=(0, 0.48, 1.75), mat='fit_paper')
    m.box((0.08, 0.005, 0.18), at=(0, 0.462, 1.75), mat='fit_ink')
    return P(m, 'Firing Booth', (1.45, 1.8, 1.0))


def range_target():
    """A paper target on a wooden stand: a black silhouette with its rings, holed."""
    m = Mesh('range_target')
    for s in (-1, 1):
        m.box((0.05, 0.05, 1.8), at=(s * 0.35, 0, 0.9), mat='fit_wood')
        m.box((0.05, 0.6, 0.05), at=(s * 0.35, 0, 0.025), mat='fit_wood')
    m.box((0.7, 0.02, 1.0), at=(0, -0.03, 1.25), mat='fit_paper')
    m.box((0.36, 0.005, 0.5), at=(0, -0.043, 1.15), mat='fit_ink')                        # the body
    m.ball(0.11, at=(0, -0.043, 1.52), mat='fit_ink', seg=10, scale=(1, 0.04, 1.2))
    for k in range(3):
        m.ring(0.06 + k * 0.06, 0.006, at=(0, -0.048, 1.2), rot=(90, 0, 0), mat='fit_paper', seg=16, tseg=3)
    for (x, z) in ((0.03, 1.22), (-0.08, 1.3), (0.1, 1.05)):
        m.cyl(0.012, 0.03, at=(x, -0.05, z), rot=(90, 0, 0), mat='hull_dark', seg=6)
    return P(m, 'Range Target', (0.8, 1.8, 0.6))


PROPS_A = {f.__name__: f for f in (chair_plain, footlocker, cell_cot, stove, prep_table, toilet_stall, urinal, weight_bench, punching_bag,
                                   firing_booth, range_target)}
META_A = {}
