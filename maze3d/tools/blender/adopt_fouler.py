"""The Fouler from Tripo (actors/source/fouler_tripo.glb): a stubby pillar of slime on a ring of chitinous toes, one eye
in front, a mouth like a torn flower on top, and feelers all round its head.
    python3 adopt_fouler.py [preview]      writes actors/fouler_tripo.glb
Axes: the eye faces -Y, +X is its left, +Z up; 1.0 tall (the def scales it).
It came with no skeleton. This builds one, and because it is soft every vertex is SHARED between bones by where it is:
    base > body1 > body2 > body3 > head          up the pillar, each blending into the next
    head > lip_f, lip_b                          the front and back of the mouth
    base > toe_0 .. toe_11                       the ring of toes, in twelve wedges
    head > feel_0_a > feel_0_b  ..  feel_7_*     the feelers, in eight wedges, each in two lengths
The wedges are a cheat: a wedge holds whichever feelers happen to be in it. It reads as a mass of searching feelers, which
is what it is. The engine's jelly shader does the fine wobble and the glow on top of this."""
import sys, math, os
import adopt
from mathutils import Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'fouler_tripo.glb'))
a.decimate(0.42)

SPINE = [('base', 0.0), ('body1', 0.15), ('body2', 0.32), ('body3', 0.5), ('head', 0.68)]
NT, NF = 12, 8
sstep = lambda x: max(0.0, min(1.0, x))


def spine_w(z):
    """Share of each pillar bone at height z: whole in the middle of its length, blending across each joint."""
    out = {}
    for i, (nm, z0) in enumerate(SPINE):
        z1 = SPINE[i + 1][1] if i + 1 < len(SPINE) else 9.0
        lo = sstep((z - (z0 - 0.07)) / 0.14) if i > 0 else 1.0
        hi = 1.0 - sstep((z - (z1 - 0.07)) / 0.14) if i + 1 < len(SPINE) else 1.0
        if lo * hi > 0:
            out[nm] = lo * hi
    return out


def assign(p, old):
    x, y, z = p
    r = math.hypot(x, y)
    ang = math.atan2(y, x) % (2 * math.pi)
    w = spine_w(z)
    def mix(extra):                                   # extra: {bone: share}; the pillar keeps the rest
        keep = 1.0 - sum(extra.values())
        out = {k: v * keep for k, v in w.items()}
        tot = sum(out.values()) or 1.0
        out = {k: v / tot * keep for k, v in out.items()}
        out.update(extra)
        return out
    if z < 0.16 and r > 0.31:                         # a toe
        return mix({'toe_%d' % (int(ang / (2 * math.pi) * NT) % NT): sstep((r - 0.31) / 0.05)})
    rim = 0.36 if z > 0.74 else (0.29 if z > 0.45 else 0.33)
    if z > 0.33 and r > rim:                          # a feeler
        k = int(ang / (2 * math.pi) * NF) % NF
        t = sstep((r - rim) / 0.05)
        outer = sstep((r - (rim + 0.07)) / 0.05)
        return mix({'feel_%d_a' % k: t * (1 - outer), 'feel_%d_b' % k: t * outer})
    if z > 0.74:                                      # the mouth
        t = sstep((z - 0.74) / 0.08)
        f = sstep((0.07 - y) / 0.08)
        return mix({'lip_f': t * f, 'lip_b': t * (1 - f)})
    return w


bones = []
for i, (nm, z0) in enumerate(SPINE):
    z1 = SPINE[i + 1][1] if i + 1 < len(SPINE) else 0.84
    bones.append((nm, SPINE[i - 1][0] if i else None, (0, 0, z0), (0, 0, z1)))
bones += [('lip_f', 'head', (0, -0.02, 0.76), (0, -0.16, 0.95)), ('lip_b', 'head', (0, 0.08, 0.76), (0, 0.2, 0.97))]
TOE, FEEL = {}, {}
for k in range(NT):
    an = (k + 0.5) / NT * 2 * math.pi
    TOE[k] = (math.cos(an), math.sin(an))
    bones.append(('toe_%d' % k, 'base', (0.3 * TOE[k][0], 0.3 * TOE[k][1], 0.08), (0.43 * TOE[k][0], 0.43 * TOE[k][1], 0.0)))
for k in range(NF):
    an = (k + 0.5) / NF * 2 * math.pi
    FEEL[k] = (math.cos(an), math.sin(an))
    bones.append(('feel_%d_a' % k, 'head', (0.26 * FEEL[k][0], 0.26 * FEEL[k][1], 0.68), (0.37 * FEEL[k][0], 0.37 * FEEL[k][1], 0.7)))
    bones.append(('feel_%d_b' % k, 'feel_%d_a' % k, (0.37 * FEEL[k][0], 0.37 * FEEL[k][1], 0.7), (0.48 * FEEL[k][0], 0.48 * FEEL[k][1], 0.72)))
a.rerig(bones, assign)
print('vertices per bone:', {k: v for k, v in sorted(a.counts.items()) if not k[-1].isdigit() or k.endswith('_0') or k.endswith('0_a')})

sn = lambda p, off=0.0: math.sin((p + off) * 2 * math.pi)
up = lambda p, off=0.0: max(0.0, sn(p, off))
Z3 = (0, 0, 0)
ONE = (1, 1, 1)
N5 = 1.0 / 5.0


def whole(wide, tall):
    """A squash for the WHOLE pillar. A bone hands its scale on to the bones above it, so each of the five takes a fifth root."""
    return (wide ** N5, wide ** N5, tall ** N5)


def cyc(L, n, fn):
    return [(L * i / n,) + tuple(fn(i / n)) for i in range(n + 1)]


def about(d, deg_up, deg_round=0.0):
    """A toe or feeler pointing outward along d: lift its tip by deg_up, swing it round the body by deg_round."""
    q = Quaternion((0, 0, 1), math.radians(deg_round)) @ Quaternion(Vector((d[1], -d[0], 0)), math.radians(deg_up))
    return tuple(math.degrees(x) for x in q.to_euler('XYZ'))


def jelly(L, amp, lean=0.0, n=12, rate=1):
    """The pillar: a wave of lean and of fat-and-thin that climbs it. amp 1 is restless; lean tips it toward the eye."""
    d = {}
    for i, (nm, z0) in enumerate(SPINE):
        def f(p, i=i):
            ph = p * rate - i * 0.17
            fat = 1.0 + 0.03 * amp * sn(ph)
            return ((lean * (0.4 + 0.2 * i) + 3.0 * amp * sn(ph, 0.1), 3.0 * amp * sn(ph, 0.35), 0), None, (fat, fat, 1.0 - 0.035 * amp * sn(ph)))
        d[nm] = cyc(L, n, f)
    d['lip_f'] = cyc(L, n, lambda p: ((6 * amp * sn(p * rate, 0.2), 0, 0),))
    d['lip_b'] = cyc(L, n, lambda p: ((-6 * amp * sn(p * rate, 0.45), 0, 0),))
    return d


def feelers(L, reach, n=12, rate=1, flare=0.0):
    """Searching: each wedge of feelers on its own time, curling in and out. reach bends them toward the eye side."""
    d = {}
    for k in range(NF):
        fwd = -FEEL[k][1]                                 # +1 for a feeler on the eye side
        d['feel_%d_a' % k] = cyc(L, n, lambda p, k=k, fwd=fwd: (about(FEEL[k], flare + 10 * sn(p * rate, k * 0.29) + reach * fwd * 6, 12 * sn(p * rate, k * 0.41 + 0.2)),))
        d['feel_%d_b' % k] = cyc(L, n, lambda p, k=k: (about(FEEL[k], flare * 0.6 + 18 * sn(p * rate, k * 0.29 - 0.22), 20 * sn(p * rate * 2, k * 0.37)),))
    return d


def toes(L, n=12, rate=2, high=22):
    """A ripple round the ring: each toe picks up after its neighbour."""
    d = {}
    for k in range(NT):
        d['toe_%d' % k] = cyc(L, n, lambda p, k=k: (about(TOE[k], high * up(p * rate, -k / NT * 2), 10 * sn(p * rate, -k / NT * 2 + 0.2)),))
    return d


# ---- idle: it never holds a shape. Breathing fat and thin, the feelers tasting the air, a toe shifting now and then.
L = 3.2
idle = {**jelly(L, 1.0), **feelers(L, 0.0), **toes(L, 12, 1, 9)}
a.clip('idle-loop', L, idle)

# ---- walk: the toes ripple, the pillar lolls forward over them and wobbles twice as hard, the feelers strain ahead.
L = 1.0
a.clip('walk-loop', L, {**jelly(L, 1.7, 5.0, 12, 2), **feelers(L, 1.0, 12, 2), **toes(L, 12, 3, 24)})

# ---- attack: it draws itself up thin and tall, the mouth peels open, and it heaves. The goo leaves at about 0.6 s.
atk = {}
for i, (nm, z0) in enumerate(SPINE):
    k = 0.4 + 0.2 * i
    atk[nm] = [(0, Z3, None, ONE), (0.42, (-9 * k, 0, 0), None, whole(0.86, 1.16)), (0.6, (16 * k, 0, 0), None, whole(1.2, 0.8)), (0.75, (8 * k, 0, 0), None, whole(1.08, 0.92)), (1.0, Z3, None, ONE)]
atk['lip_f'] = [(0, Z3), (0.42, (34, 0, 0)), (0.6, (48, 0, 0)), (0.8, (20, 0, 0)), (1.0, Z3)]
atk['lip_b'] = [(0, Z3), (0.42, (-30, 0, 0)), (0.6, (-36, 0, 0)), (0.8, (-12, 0, 0)), (1.0, Z3)]
for k in range(NF):
    atk['feel_%d_a' % k] = [(0, Z3), (0.42, about(FEEL[k], 34)), (0.6, about(FEEL[k], -20)), (1.0, Z3)]
    atk['feel_%d_b' % k] = [(0, Z3), (0.42, about(FEEL[k], 30)), (0.62, about(FEEL[k], -34)), (1.0, Z3)]
for k in range(NT):
    atk['toe_%d' % k] = [(0, Z3), (0.42, about(TOE[k], -8)), (0.6, about(TOE[k], 14)), (1.0, Z3)]
a.clip('attack', 1.0, atk)

hurt = {nm: [(0, Z3, None, ONE), (0.08, (-3, 2, 0), None, whole(1.22, 0.72)), (0.2, Z3, None, whole(0.92, 1.08)), (0.3, Z3, None, ONE)] for nm, _ in SPINE}
for k in range(NF):
    hurt['feel_%d_a' % k] = [(0, Z3), (0.08, about(FEEL[k], 40)), (0.3, Z3)]
a.clip('hurt', 0.3, hurt)

# ---- die: it stops holding itself up. Slumps, spreads, and is a mound with a mouth on it.
die = {}
for i, (nm, z0) in enumerate(SPINE):
    k = 0.4 + 0.2 * i
    die[nm] = [(0, Z3, None, ONE), (0.3, (-6 * k, 4, 0), None, whole(0.9, 1.1)), (0.9, (7 * k, 4 * k, 0), None, whole(1.3, 0.5)), (1.1, (6 * k, 4 * k, 0), None, whole(1.26, 0.54)), (1.5, (7 * k, 4 * k, 0), None, whole(1.34, 0.46))]
die['lip_f'] = [(0, Z3), (0.5, (50, 0, 0)), (1.5, (30, 0, 0))]
die['lip_b'] = [(0, Z3), (0.5, (-40, 0, 0)), (1.5, (-24, 0, 0))]
for k in range(NF):
    die['feel_%d_a' % k] = [(0, Z3), (0.3, about(FEEL[k], 40)), (1.5, about(FEEL[k], -50))]
    die['feel_%d_b' % k] = [(0, Z3), (0.5, about(FEEL[k], 20)), (1.5, about(FEEL[k], -40))]
for k in range(NT):
    die['toe_%d' % k] = [(0, Z3), (0.4, about(TOE[k], 26)), (0.8, about(TOE[k], -6)), (1.5, about(TOE[k], 16, 12))]
a.clip('die', 1.5, die)

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/foul', exist_ok=True)
    for nm, t in (('idle-loop', 0.8), ('walk-loop', 0.3), ('attack', 0.42), ('attack', 0.6), ('hurt', 0.08), ('die', 1.5)):
        a.preview('/tmp/foul/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.6, -2.0, 0.9), (0, 0, 0.45))
a.export(os.path.join(ROOT, 'actors', 'fouler_tripo.glb'))
print('adopted fouler: clips', a.names)
