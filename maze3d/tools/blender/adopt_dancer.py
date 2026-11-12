"""The Dancer from Tripo (actors/source/dancer_tripo.glb): a tall thin spinning machine, a dagger balanced on its point,
with a toothed ring for a waist and one red eye near the top.
    python3 adopt_dancer.py [preview]      writes actors/dancer_tripo.glb
Axes: the eye faces -Y, +Z up; 0.99 tall, standing on its needle at the origin (the def scales it).
It came with no skeleton. This gives it:
    tilt            at the point of the needle: the whole thing leans and wobbles about it, like a top
    tilt > body     everything but the ring and the head; spins about the upright
    tilt > blade    the toothed ring and its spokes; spins much faster
    tilt > head     the eye and the spike over it; does NOT spin, so the eye can look at what it shoots
Every vertex follows exactly one bone, by where it is. The engine's equalizer shader lights the red strips."""
import sys, math, os
import adopt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
a = adopt.Adopted(os.path.join(ROOT, 'actors', 'source', 'dancer_tripo.glb'))
a.decimate(0.42)


def assign(p, old):
    if p[2] >= 0.79:
        return 'head'
    if 0.46 < p[2] < 0.585 and math.hypot(p[0], p[1]) > 0.085:
        return 'blade'
    return 'body'


a.rerig([('tilt', None, (0, 0, 0), (0, 0, 0.25)), ('body', 'tilt', (0, 0, 0.25), (0, 0, 0.75)),
         ('blade', 'tilt', (0, 0, 0.52), (0, 0, 0.6)), ('head', 'tilt', (0, 0, 0.79), (0, 0, 0.98))], assign)
print('vertices per bone:', a.counts)

Z3 = (0, 0, 0)
sn = lambda p: math.sin(p * 2 * math.pi)
cs = lambda p: math.cos(p * 2 * math.pi)


def spin(L, turns, start=0.0):
    """Keys that take a bone round `turns` whole times in L seconds, a quarter turn at a time."""
    n = max(1, int(round(abs(turns) * 4)))
    return [(L * i / n, (0, 0, start + 360.0 * turns * i / n)) for i in range(n + 1)]


# ---- idle: dancing. Four beats in two seconds: lean left, hop, lean right, hop; the head keeps its own time.
L = 2.0
dance = []
for i in range(17):
    p = i / 16
    beat = p * 4
    lean = 11 * sn(p)                                 # side to side once a bar
    hop = 0.035 * abs(sn(beat / 2))                   # up on every beat
    nod = 5 * sn(beat / 2 + 0.25)
    dance.append((L * p, (nod, lean, 0), (0, 0, hop)))
a.clip('idle-loop', L, {'tilt': dance, 'body': spin(L, 1), 'blade': spin(L, 3),
                        'head': [(L * i / 8, (0, 0, 22 * sn(i / 8 * 2))) for i in range(9)]})

# ---- walk: zooming in. Leant into it, and the lean goes round and round: a top that is about to go over and never does.
L = 1.0
a.clip('walk-loop', L, {'tilt': [(L * i / 12, (15 + 7 * cs(i / 12 * 2), 9 * sn(i / 12 * 2), 0), (0, 0, 0.01 * abs(sn(i / 12 * 2)))) for i in range(13)],
                        'body': spin(L, 2), 'blade': spin(L, 5)})

# ---- attack: it throws itself forward on its point, ring first, and comes back up. The blow lands at 0.16 s.
L = 0.5
a.clip('attack', L, {'tilt': [(0, (10, 0, 0)), (0.08, (-8, 4, 0), (0, 0, 0.02)), (0.16, (34, 0, 0)), (0.3, (20, -6, 0)), (0.5, (10, 0, 0))],
                     'body': spin(L, 2), 'blade': spin(L, 4)})

a.clip('hurt', 0.3, {'tilt': [(0, Z3), (0.07, (-22, 12, 0)), (0.18, (9, -6, 0)), (0.3, Z3)], 'body': spin(0.3, 0.5), 'blade': spin(0.3, 1)})

# ---- die: the wobble gets away from it. Round it goes, wider each time, and over; the ring rattles to a stop on the floor.
L = 1.8
die_t = []
for i in range(13):
    p = i / 12
    wide = 6 + 56 * p * p                              # 62 degrees is where the ring meets the floor
    die_t.append((1.3 * p, (wide * cs(p * 2.5), wide * sn(p * 2.5), 0)))
end = die_t[-1][1]
die_t += [(1.42, (end[0] * 0.93, end[1] * 0.93, 0)), (1.55, end), (1.8, end)]
a.clip('die', L, {'tilt': die_t, 'body': spin(1.3, 1.5) + [(1.8, (0, 0, 180))], 'blade': spin(1.2, 3) + [(1.5, (0, 0, 60)), (1.8, (0, 0, 70))],
                  'head': [(0, Z3), (0.6, (0, 0, 40)), (1.8, (0, 0, -30))]})

if len(sys.argv) > 1 and sys.argv[-1] == 'preview':
    os.makedirs('/tmp/dnc', exist_ok=True)
    for nm, t in (('idle-loop', 0.25), ('idle-loop', 1.25), ('walk-loop', 0.3), ('attack', 0.16), ('die', 0.8), ('die', 1.8)):
        a.preview('/tmp/dnc/p_%s_%03d.png' % (nm.replace('-loop', ''), int(t * 100)), nm, t, (1.2, -2.2, 0.8), (0, 0, 0.45))
a.export(os.path.join(ROOT, 'actors', 'dancer_tripo.glb'))
print('adopted dancer: clips', a.names)
if len(sys.argv) > 1 and sys.argv[-1] == 'check':
    import bpy
    ad = a.ob.animation_data
    for tr in ad.nla_tracks:
        tr.mute = True
    ad.action = bpy.data.actions['attack']
    try:
        ad.action_slot = ad.action.slots[0]
    except Exception:
        pass
    bpy.context.scene.frame_set(int(round(0.16 * 30)))
    bpy.context.view_layer.update()
    print('CHECK head at attack peak', tuple(round(x, 3) for x in (a.ob.matrix_world @ a.ob.pose.bones['head'].head)))
