"""The Sphinx Gun from Tripo (actors/source/sphinx_tripo.glb): a heavy sentry gun built as a stepped pyramid.
    python3 adopt_sphinx.py [preview]      writes actors/sphinx_tripo.glb
Three sections, bottom to top:
    base    bolted to the floor; it never moves. The struts and column that carry the rest stand on it.
    mid     the middle block with the cannon dish. Turns about the column.
    apex    the cap with the sensors. Turns about the column on its own.
It came with no skeleton, the dish pointing +Y. The whole thing is turned to face -Y (the engine's forward) and given:
    base > lift_mid > mid          lift_mid goes up and down (and takes knocks); mid only ever turns, and the ENGINE turns it
    base > lift_apex > apex        the same for the cap. apex is not a child of mid: the two turn independently
The file is the machine RAISED: struts showing between base and mid, the neck showing under the cap. Powered down, the
mid sits 0.105 lower, on the base's top plate, and the cap 0.14 lower, on the mid; both gaps close and nothing inside shows.
Every vertex follows exactly one bone, decided by its height. 0.98 tall (the def scales it)."""
import sys, math, os
import bpy
import adopt
from mathutils import Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'sphinx_tripo.glb'))
a.decimate(0.42)
for m in a.meshes:                                   # dish to the front
    m.matrix_world = Matrix.Rotation(math.pi, 4, 'Z') @ m.matrix_world
bpy.context.view_layer.update()

Z_MID, Z_APEX = 0.405, 0.725                         # the underside of the mid's bottom plate; the underside of the cap
DOWN_MID, DOWN_APEX = 0.105, 0.14


def assign(p, old):
    return 'base' if p[2] < Z_MID else ('mid' if p[2] < Z_APEX else 'apex')


a.rerig([('base', None, (0, 0, 0), (0, 0, 0.25)),
         ('lift_mid', 'base', (0, 0, Z_MID), (0, 0, Z_MID + 0.08)), ('mid', 'lift_mid', (0, 0, Z_MID + 0.01), (0, 0, 0.62)),
         ('lift_apex', 'base', (0, 0, Z_APEX), (0, 0, Z_APEX + 0.06)), ('apex', 'lift_apex', (0, 0, Z_APEX + 0.01), (0, 0, 0.95))], assign)
print('vertices per bone:', a.counts)

Z3 = (0, 0, 0)
sn = lambda p: math.sin(p * 2 * math.pi)
dn = lambda k=1.0: (0, 0, -DOWN_MID * k)
da = lambda k=1.0: (0, 0, -DOWN_APEX * k)

# ---- dormant: locked down. Nothing moves.
a.clip('dormant-loop', 4.0, {'lift_mid': [(0, Z3, dn()), (4.0, Z3, dn())], 'lift_apex': [(0, Z3, da()), (4.0, Z3, da())]})

# ---- startle (waking): the locks let go with a jolt, the mid comes up on its struts and overshoots, the cap follows
# it up, looks one way and the other. The last key leaves everything level and raised; then the engine aims it.
a.clip('startle', 1.4, {
    'lift_mid': [(0, Z3, dn()), (0.12, Z3, dn(1.06)), (0.2, Z3, dn()), (0.7, (0.6, 0, 0), (0, 0, 0.01)), (0.86, Z3, (0, 0, -0.003)), (1.0, Z3, Z3), (1.4, Z3, Z3)],
    'lift_apex': [(0, Z3, da()), (0.3, Z3, da()), (0.38, Z3, da(1.04)), (0.9, Z3, (0, 0, 0.012)), (1.05, Z3, (0, 0, -0.003)), (1.15, Z3, Z3), (1.4, Z3, Z3)],
    'apex': [(0, Z3), (0.6, Z3), (0.9, (0, 0, 55)), (1.2, (0, 0, -40)), (1.4, Z3)]})

# ---- idle (awake): raised and humming. mid and apex are NOT keyed: the engine turns them.
L = 3.0
idle = {'lift_mid': [(L * i / 12, (0.25 * sn(i / 12), 0.25 * sn(i / 12 + 0.25), 0), (0, 0, 0.0015 * sn(i / 6))) for i in range(13)],
        'lift_apex': [(L * i / 12, Z3, (0, 0, 0.004 * sn(i / 12))) for i in range(13)]}
a.clip('idle-loop', L, idle)
a.clip('walk-loop', L, idle)                         # it does not walk; the engine may still ask

# ---- attack: the mid sinks on its struts as the dish charges and the cap lifts clear; then five bolts, a kick for each.
# First bolt at 0.6 s (the def's windup), then every 0.11 s.
atk_m = [(0, Z3, Z3), (0.5, Z3, (0, 0, -0.014)), (0.58, Z3, (0, 0, -0.016))]
for i in range(5):
    t = 0.6 + i * 0.11
    atk_m += [(t + 0.03, (-1.2, 0.6 * (-1) ** i, 0), (0, 0, -0.008)), (t + 0.09, Z3, (0, 0, -0.015))]
atk_m += [(1.4, Z3, (0, 0, 0.003)), (1.6, Z3, Z3)]
a.clip('attack', 1.6, {'lift_mid': atk_m, 'lift_apex': [(0, Z3, Z3), (0.5, Z3, (0, 0, 0.014)), (1.1, Z3, (0, 0, 0.014)), (1.6, Z3, Z3)]})

a.clip('hurt', 0.3, {'lift_mid': [(0, Z3, Z3), (0.07, (3, -2, 0), (0, 0, -0.012)), (0.3, Z3, Z3)],
                     'lift_apex': [(0, Z3, Z3), (0.09, (-5, 3, 0), (0, 0, -0.008)), (0.3, Z3, Z3)]})

# ---- die: the struts give way. The mid drops crooked on to the base; the cap comes down on it a moment later, harder,
# and ends up askew.
a.clip('die', 1.8, {
    'lift_mid': [(0, Z3, Z3), (0.15, (-2, 1, 0), (0, 0, 0.012)), (0.55, (5, -3, 0), dn(0.95)), (0.68, (4, -2, 0), dn(0.8)), (0.85, (6, -4, 0), dn(0.97)), (1.8, (6, -4, 0), dn(0.97))],
    'lift_apex': [(0, Z3, Z3), (0.3, (3, 2, 0), (0, 0, 0.02)), (0.8, (-9, 6, 0), (0.01, 0, -DOWN_APEX * 0.9)), (0.95, (-6, 5, 0), (0.012, 0, -DOWN_APEX * 0.72)),
                  (1.2, (-15, 9, 0), (0.02, 0.01, -DOWN_APEX * 1.02)), (1.8, (-15, 9, 0), (0.02, 0.01, -DOWN_APEX * 1.02))],
    'apex': [(0, Z3), (0.8, (0, 0, 25)), (1.8, (0, 0, 38))]})

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/sph', exist_ok=True)
    for nm, t in (('dormant-loop', 1.0), ('startle', 0.55), ('idle-loop', 0.5), ('attack', 0.63), ('die', 1.8)):
        a.preview('/tmp/sph/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.3, -2.1, 0.9), (0, 0, 0.47))
a.export(os.path.join(ROOT, 'actors', 'sphinx_tripo.glb'))
print('adopted sphinx: clips', a.names)
