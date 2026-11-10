"""Doors, machines, terminals, containers, treasure, pickups, trap hardware and weapons.
Each builder returns {'objects': [...], 'meta': {...}}; meta goes into kit.json.
Moving parts are separate objects; their motion is described in meta (Blender axes,
converted to Godot's when kit.json is written)."""
import math, random
from mz import Mesh, T, R, S
from tiles import plates, cable, dangle, face, C, H

DW, DH, DT = 2.6, 3.2, 0.7      # door opening width, height; frame depth


def door_frame(m, rnd, round_hole=False):
    side = (C - DW) / 2
    for s in (-1, 1):
        x = s * (DW / 2 + side / 2)
        m.box((side, DT, H), at=(x, 0, H / 2), mat='hull_dark')
        for f in (-1, 1):
            m.push(T(0, f * DT / 2, 0) @ R(90, 0, 0 if f < 0 else 180))
            plates(m, rnd, (x if f < 0 else -x) - side / 2, 0.05, (x if f < 0 else -x) + side / 2, H - 0.05, min_size=0.35, thick=(0.03, 0.07))
            m.pop()
        m.box((0.14, DT + 0.16, DH + 0.1), at=(s * (DW / 2 + 0.07), 0, DH / 2), mat='trim', bevel=0.03)
        m.box((0.05, DT + 0.18, DH - 0.6), at=(s * (DW / 2 + 0.08), 0, DH / 2), mat='lock')
    top = H - DH
    m.box((DW, DT, top), at=(0, 0, DH + top / 2), mat='hull_dark')
    m.box((DW + 0.28, DT + 0.16, 0.16), at=(0, 0, DH + 0.08), mat='trim', bevel=0.03)
    for f in (-1, 1):
        m.box((1.2, 0.05, 0.34), at=(0, f * (DT / 2 + 0.03), DH + 0.45), mat='hull', bevel=0.02)
        m.box((0.9, 0.02, 0.1), at=(0, f * (DT / 2 + 0.06), DH + 0.45), mat='lock')
        for s in (-1, 1):
            m.box((0.5, 0.06, 0.5), at=(s * 0.95, f * (DT / 2 + 0.02), DH + 0.42), mat='hull_dark', bevel=0.02)
    m.box((DW, DT + 0.2, 0.05), at=(0, 0, 0.0), mat='hazard', bevel=0.01)
    for i in range(7):
        m.box((0.2, DT + 0.21, 0.052), at=(-1.2 + i * 0.4, 0, 0.0), mat='hull_dark')


def leaf_detail(m, rnd, x0, z0, x1, z1, th):
    for f in (-1, 1):
        m.push(T(0, f * th / 2, 0) @ R(90, 0, 0 if f < 0 else 180))
        a, b = (x0, x1) if f < 0 else (-x1, -x0)
        plates(m, rnd, a, z0, b, z1, min_size=0.45, thick=(0.02, 0.05), mats=('hull', 'hull', 'trim', 'accent'), deco=0.7)
        m.pop()


def door_split(seed=1):
    rnd = random.Random(seed)
    fr = Mesh('frame')
    door_frame(fr, rnd)
    objs = [fr.to_object()]
    th = 0.2
    for s, name in ((-1, 'leaf_l'), (1, 'leaf_r')):
        m = Mesh(name)
        # interlocking teeth along the seam
        pts = [(s * 1.32, 0)]
        n = 6
        for i in range(n):
            z0, z1 = i * DH / n, (i + 1) * DH / n
            off = 0.14 if i % 2 == 0 else -0.14
            pts += [(off, z0), (off, z1)]
        pts += [(s * 1.32, DH)]
        if s > 0:
            pts = list(reversed(pts))
        m.prism(pts, th, at=(0, th / 2, 0), rot=(90, 0, 0), mat='hull_dark')
        leaf_detail(m, rnd, min(s * 0.2, s * 1.25), 0.1, max(s * 0.2, s * 1.25), DH - 0.1, th)
        m.box((0.1, th + 0.06, DH), at=(s * 0.02 + (0.0), 0, DH / 2), mat='trim') if False else None
        m.box((0.5, th + 0.08, 0.5), at=(s * 0.55, 0, 1.6), mat='trim', bevel=0.04)
        m.cyl(0.14, th + 0.14, at=(s * 0.55, 0, 1.6), rot=(90, 0, 0), mat='lock', seg=12)
        objs.append(m.to_object(origin=(0, 0, 0)))
    return dict(objects=objs, meta=dict(type='door', time=0.45, sound='door_slide', parts={'leaf_l': dict(move=(-1.34, 0, 0)), 'leaf_r': dict(move=(1.34, 0, 0))}))


def door_rise(seed=2):
    rnd = random.Random(seed)
    fr = Mesh('frame')
    door_frame(fr, rnd)
    objs = [fr.to_object()]
    parts = {}
    n = 4
    for i in range(n):          # a telescoping shutter: each slat lifts further than the one below
        m = Mesh('slat%d' % i)
        z0 = i * DH / n
        th = 0.26 - i * 0.03
        m.box((DW, th, DH / n + 0.04), at=(0, 0, z0 + DH / n / 2), mat='hull_dark', bevel=0.03)
        leaf_detail(m, rnd, -DW / 2 + 0.05, z0 + 0.06, DW / 2 - 0.05, z0 + DH / n - 0.04, th)
        m.box((DW - 0.3, th + 0.05, 0.06), at=(0, 0, z0 + 0.05), mat='hazard')
        if i == 1:
            m.box((0.7, th + 0.06, 0.3), at=(0, 0, z0 + 0.4), mat='trim', bevel=0.03)
            m.box((0.5, th + 0.1, 0.1), at=(0, 0, z0 + 0.4), mat='lock')
        objs.append(m.to_object(origin=(0, 0, 0)))
        parts['slat%d' % i] = dict(move=(0, 0, DH - z0 - 0.12 * (n - i)), delay=0.05 * (n - 1 - i))
    return dict(objects=objs, meta=dict(type='door', time=0.6, sound='door_heavy', parts=parts))


def door_jaw(seed=3):
    rnd = random.Random(seed)
    fr = Mesh('frame')
    door_frame(fr, rnd)
    objs = [fr.to_object()]
    th = 0.24
    mid = 1.5
    for name, up in (('jaw_top', True), ('jaw_bottom', False)):
        m = Mesh(name)
        n = 5
        w = DW / n
        pts = []
        if up:
            pts = [(-DW / 2, DH), (-DW / 2, mid + 0.25)]
            for i in range(n):
                pts += [(-DW / 2 + i * w + w / 2, mid - 0.25), (-DW / 2 + (i + 1) * w, mid + 0.25)]
            pts += [(DW / 2, DH)]
            pts = list(reversed(pts))
        else:
            pts = [(-DW / 2, 0), (DW / 2, 0), (DW / 2, mid + 0.25)]
            for i in range(n):
                pts += [(DW / 2 - i * w - w / 2, mid - 0.25), (DW / 2 - (i + 1) * w, mid + 0.25)]
        m.prism(pts, th, at=(0, th / 2, 0), rot=(90, 0, 0), mat='hull_dark')
        if up:
            leaf_detail(m, rnd, -DW / 2 + 0.05, mid + 0.35, DW / 2 - 0.05, DH - 0.05, th)
            for i in range(n):
                m.box((0.12, th + 0.04, 0.3), at=(-DW / 2 + i * w + w / 2, 0, mid + 0.05), mat='hazard', bevel=0.02)
        else:
            leaf_detail(m, rnd, -DW / 2 + 0.05, 0.05, DW / 2 - 0.05, mid - 0.35, th)
            m.box((1.0, th + 0.08, 0.18), at=(0, 0, 0.7), mat='lock')
        objs.append(m.to_object(origin=(0, 0, 0)))
    return dict(objects=objs, meta=dict(type='door', time=0.5, sound='door_heavy', parts={'jaw_top': dict(move=(0, 0, 1.75)), 'jaw_bottom': dict(move=(0, 0, -1.8))}))


def door_shear(seed=4):
    rnd = random.Random(seed)
    fr = Mesh('frame')
    door_frame(fr, rnd)
    objs = [fr.to_object()]
    th = 0.2
    a = Mesh('shear_a')     # upper-left triangle
    a.prism([(-DW / 2, 0.0), (DW / 2, DH), (-DW / 2, DH)], th, at=(0, th / 2, 0), rot=(90, 0, 0), mat='hull')
    b = Mesh('shear_b')
    b.prism([(-DW / 2, 0.0), (DW / 2, 0.0), (DW / 2, DH)], th, at=(0, th / 2, 0), rot=(90, 0, 0), mat='hull')
    ang = math.degrees(math.atan2(DH, DW))
    for m, s in ((a, 1), (b, -1)):
        for f in (-1, 1):
            m.push(T(0, f * (th / 2 + 0.01), 0))
            m.box((3.6, 0.03, 0.16), at=(-s * 0.16 * math.sin(math.radians(ang)) * 1.2, 0, DH / 2 + s * 0.16 * 1.0), rot=(0, -ang, 0), mat='hazard')
            m.box((1.0, 0.05, 0.7), at=(-s * 0.62, 0, DH / 2 + s * 0.75), rot=(0, -ang, 0), mat='trim', bevel=0.03)
            m.box((0.6, 0.07, 0.14), at=(-s * 0.62, 0, DH / 2 + s * 0.75), rot=(0, -ang, 0), mat='lock')
            m.box((0.5, 0.04, 0.4), at=(-s * 0.95, 0, DH / 2 + s * 1.2), mat='hull_dark', bevel=0.02)
            m.pop()
        objs.append(m.to_object(origin=(0, 0, 0)))
    return dict(objects=objs, meta=dict(type='door', time=0.4, sound='door_slide', parts={'shear_a': dict(move=(-1.5, 0, 1.75)), 'shear_b': dict(move=(1.5, 0, -1.85))}))


def door_iris(seed=5):
    rnd = random.Random(seed)
    fr = Mesh('frame')
    cz, rad = 1.75, 1.5
    side = (C - DW) / 2
    for s in (-1, 1):
        x = s * (DW / 2 + side / 2)
        fr.box((side, DT, H), at=(x, 0, H / 2), mat='hull_dark')
        for f in (-1, 1):
            fr.push(T(0, f * DT / 2, 0) @ R(90, 0, 0 if f < 0 else 180))
            plates(fr, rnd, (x if f < 0 else -x) - side / 2, 0.05, (x if f < 0 else -x) + side / 2, H - 0.05, min_size=0.35)
            fr.pop()
    fr.box((DW, DT, H - 3.3), at=(0, 0, 3.3 + (H - 3.3) / 2), mat='hull_dark')
    # corner fills round the circle
    seg = 24
    for q in range(4):
        pts = []
        a0 = q * 90
        cx = (1 if q in (0, 3) else -1) * 1.3
        czq = (1 if q in (0, 1) else -1)
        corner = (cx, cz + czq * 1.6 if czq > 0 else 0.0)
        pts.append((corner[0], corner[1] - cz))
        for i in range(7):
            a = math.radians(a0 + i * 15)
            pts.append((rad * math.cos(a) * 0.87, rad * math.sin(a)))
        fr.prism(pts if q % 2 == 0 else pts, DT - 0.1, at=(0, (DT - 0.1) / 2, cz), rot=(90, 0, 0), mat='hull')
    fr.ring(rad - 0.05, 0.12, at=(0, 0, cz), rot=(90, 0, 0), mat='trim', seg=32, tseg=8)
    fr.ring(rad + 0.12, 0.03, at=(0, -DT / 2 + 0.02, cz), rot=(90, 0, 0), mat='lock', seg=32, tseg=6)
    fr.ring(rad + 0.12, 0.03, at=(0, DT / 2 - 0.02, cz), rot=(90, 0, 0), mat='lock', seg=32, tseg=6)
    fr.box((DW, DT + 0.2, 0.3), at=(0, 0, 0.12), mat='trim', bevel=0.04)
    objs = [fr.to_object()]
    parts = {}
    n = 6
    for i in range(n):
        a = math.radians(i * 360 / n)
        px, pz = rad * math.cos(a), cz + rad * math.sin(a)
        m = Mesh('blade%d' % i)
        # a curved blade from its pivot on the rim to the centre
        a2 = a + math.radians(360 / n)
        tip = (0.0, 0.0)
        p1 = (rad * math.cos(a), rad * math.sin(a))
        p2 = (rad * math.cos(a2), rad * math.sin(a2))
        mid = (rad * math.cos((a + a2) / 2) * 1.03, rad * math.sin((a + a2) / 2) * 1.03)
        m.prism([tip, p1, mid, p2], 0.1, at=(0, 0.05 + (0.03 if i % 2 else -0.03), cz), rot=(90, 0, 0), mat='hull' if i % 2 else 'trim', bevel=0.02)
        mc = ((p1[0] + p2[0]) / 3, (p1[1] + p2[1]) / 3)
        m.cyl(0.1, 0.2, at=(mc[0], 0, cz + mc[1]), rot=(90, 0, 0), mat='accent', seg=6)
        m.cyl(0.09, 0.26, at=(px, 0, pz), rot=(90, 0, 0), mat='hull_dark', seg=10)
        objs.append(m.to_object(origin=(px, 0, pz)))
        parts['blade%d' % i] = dict(rot_axis=(0, 1, 0), rot_deg=-58)
    return dict(objects=objs, meta=dict(type='door', time=0.5, sound='door_iris', parts=parts))


def door_vault(seed=6):
    rnd = random.Random(seed)
    fr = Mesh('frame')
    door_frame(fr, rnd)
    objs = [fr.to_object()]
    m = Mesh('plug')
    cz = 1.62
    m.cyl(1.75, 0.34, at=(0, 0, cz), rot=(90, 0, 0), mat='hull_dark', seg=32)
    m.cyl(1.55, 0.44, at=(0, 0, cz), rot=(90, 0, 0), mat='hull', seg=32)
    m.cyl(0.6, 0.56, at=(0, 0, cz), rot=(90, 0, 0), mat='trim', seg=16)
    m.cyl(0.25, 0.62, at=(0, 0, cz), rot=(90, 0, 0), mat='lock', seg=12)
    for i in range(8):
        a = i * 45
        m.push(T(0, 0, cz) @ R(0, a, 0))
        m.box((0.16, 0.5, 0.75), at=(0, 0, 1.05), mat='trim', bevel=0.03)
        m.cyl(0.07, 0.56, at=(0, 0, 1.4), rot=(90, 0, 0), mat='copper', seg=8)
        m.box((0.1, 0.48, 0.3), at=(0.42, 0, 0.95), rot=(0, 22, 0), mat='hazard')
        m.pop()
    objs.append(m.to_object(origin=(0, 0, cz)))
    return dict(objects=objs, meta=dict(type='door', time=1.4, sound='door_vault', parts={'plug': dict(move=(3.3, 0, 0), rot_axis=(0, 1, 0), rot_deg=215)}))


# ---------------------------------------------------------------- machines and terminals
def terminal_wall(seed=1):
    rnd = random.Random(seed)
    m = Mesh('terminal_wall')
    m.box((1.3, 0.25, 1.9), at=(0, -0.12, 1.45), mat='hull_dark', bevel=0.04)
    m.box((1.1, 0.06, 0.8), at=(0, -0.3, 1.8), rot=(-12, 0, 0), mat='trim', bevel=0.02)
    m.box((0.98, 0.02, 0.66), at=(0, -0.335, 1.8), rot=(-12, 0, 0), mat='screen')
    m.box((1.2, 0.5, 0.08), at=(0, -0.42, 1.15), rot=(22, 0, 0), mat='hull', bevel=0.02)
    for r in range(3):
        for c in range(8):
            m.box((0.09, 0.07, 0.03), at=(-0.42 + c * 0.12, -0.36 - r * 0.1, 1.24 - r * 0.04), rot=(22, 0, 0), mat=rnd.choice(['hull_dark', 'hull_dark', 'trim', 'glow_amber', 'glow_cyan']), bevel=0.008)
    m.box((0.5, 0.2, 0.9), at=(0, -0.12, 0.5), mat='trim', bevel=0.03)
    m.box((1.4, 0.3, 0.12), at=(0, -0.13, 2.45), mat='accent', bevel=0.03)
    m.cyl(0.04, 0.5, at=(0.55, -0.2, 2.6), mat='chrome', seg=6)
    m.ball(0.05, at=(0.55, -0.2, 2.86), mat='glow_red', seg=8)
    cable(m, rnd, (-0.5, -0.1, 0.5), (-0.62, -0.1, 0.02), sag=-0.1, r=0.03, n=4)
    return dict(objects=[m.to_object()], meta=dict(type='prop', mount='wall', solid=(1.3, 2.4, 0.6), screen=dict(at=(0, -0.35, 1.8), size=(0.9, 0.6), tilt=-12)))


def terminal_desk(seed=2):
    rnd = random.Random(seed)
    m = Mesh('terminal_desk')
    m.lathe([(0.5, 0), (0.5, 0.08), (0.2, 0.2), (0.16, 0.9), (0.3, 1.0)], mat='hull_dark', seg=10, smooth=False)
    m.box((1.5, 0.7, 0.1), at=(0, 0, 1.05), rot=(18, 0, 0), mat='hull', bevel=0.03)
    for i in range(3):
        m.box((0.4, 0.02, 0.5), at=(-0.48 + i * 0.48, 0.3, 1.5), rot=(-15, 0, (1 - i) * 22), mat='trim', bevel=0.01)
        m.box((0.36, 0.022, 0.44), at=(-0.48 + i * 0.48, 0.29, 1.5), rot=(-15, 0, (1 - i) * 22), mat='screen' if i != 2 else 'screen_dead')
    for c in range(10):
        m.box((0.1, 0.1, 0.035), at=(-0.6 + c * 0.133, -0.12, 1.1), rot=(18, 0, 0), mat=rnd.choice(['hull_dark', 'glow_amber', 'glow_cyan', 'trim', 'accent']), bevel=0.01)
    m.ball(0.09, at=(0.5, 0.08, 1.2), mat='glow_pink', seg=10)
    m.ring(0.12, 0.02, at=(0.5, 0.08, 1.17), rot=(18, 0, 0), mat='chrome', seg=12, tseg=5)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.5, 1.6, 0.9), screen=dict(at=(0, 0.27, 1.5), size=(0.34, 0.42), tilt=-15)))


def reactor(seed=3):
    rnd = random.Random(seed)
    m = Mesh('reactor')
    m.lathe([(1.5, 0), (1.5, 0.2), (1.2, 0.45), (0.9, 0.5), (0.9, 0.7), (0.55, 0.8)], mat='hull_dark', seg=16, smooth=False)
    m.lathe([(0.55, 3.2), (0.9, 3.3), (0.9, 3.5), (1.2, 3.55), (1.4, 3.8), (1.4, 4.0)], mat='hull_dark', seg=16, smooth=False)
    m.cyl(0.42, 2.4, at=(0, 0, 2.0), mat='glow_violet', seg=16)
    m.cyl(0.5, 2.4, at=(0, 0, 2.0), mat='glass', seg=16, caps=False)
    for i in range(6):
        a = math.radians(i * 60)
        x, y = 1.05 * math.cos(a), 1.05 * math.sin(a)
        m.cyl(0.07, 2.9, at=(x, y, 2.0), mat='copper' if i % 2 else 'trim', seg=8)
        m.box((0.3, 0.2, 0.4), at=(x * 1.1, y * 1.1, 0.75), rot=(0, 0, i * 60), mat='hull', bevel=0.03)
        m.box((0.1, 0.03, 0.2), at=(x * 1.22, y * 1.22, 0.8), rot=(0, 0, i * 60 + 90), mat='glow_amber')
    objs = [m.to_object()]
    for k, z in enumerate((1.3, 2.0, 2.7)):
        r = Mesh('spin%d' % k)
        r.ring(0.78, 0.06, at=(0, 0, z), mat='chrome', seg=24, tseg=6)
        for i in range(4):
            a = math.radians(i * 90 + k * 30)
            r.box((0.22, 0.14, 0.2), at=(0.78 * math.cos(a), 0.78 * math.sin(a), z), rot=(0, 0, i * 90 + k * 30), mat='accent', bevel=0.02)
        objs.append(r.to_object(origin=(0, 0, z)))
    return dict(objects=objs, meta=dict(type='prop', solid=(2.6, 4.0, 2.6), spin={'spin0': 50, 'spin1': -80, 'spin2': 35}, light=dict(color=(0.62, 0.32, 1.0), energy=3.0, range=9, at=(0, 0, 2.0), pulse=0.35), hum=True))


def fabricator(seed=4):
    rnd = random.Random(seed)
    m = Mesh('fabricator')
    m.box((2.4, 1.4, 0.9), at=(0, 0, 0.45), mat='hull', bevel=0.05)
    m.box((2.4, 0.3, 1.5), at=(0, 0.55, 1.65), mat='hull_dark', bevel=0.05)
    m.box((0.5, 1.4, 1.5), at=(-0.95, 0, 1.65), mat='hull', bevel=0.05)
    m.box((1.5, 1.0, 0.04), at=(0.3, -0.1, 0.93), mat='glow_cyan')
    m.box((1.9, 1.1, 0.06), at=(0.25, -0.05, 2.38), mat='trim', bevel=0.02)
    for s in (-0.45, 1.0):
        m.cyl(0.04, 1.45, at=(s, -0.55, 1.65), mat='chrome', seg=6)
    m.box((1.6, 0.08, 0.08), at=(0.3, -0.2, 2.2), mat='chrome')
    m.box((0.2, 0.2, 0.5), at=(0.5, -0.2, 1.95), mat='accent', bevel=0.03)
    m.cyl(0.03, 0.4, at=(0.5, -0.2, 1.55), r2=0.005, mat='copper', seg=6)
    m.ball(0.22, at=(0.3, -0.1, 1.12), mat='gold', seg=12, scale=(1, 1, 0.7))   # something half-printed
    m.push(T(-0.95, -0.7, 0) @ R(90, 0, 0))
    plates(m, rnd, -0.22, 0.95, 0.22, 2.35, min_size=0.2, thick=(0.02, 0.04), glows=('glow_amber', 'glow_cyan'), deco=0.95)
    m.pop()
    m.push(T(0, -0.7, 0) @ R(90, 0, 0))
    plates(m, rnd, -1.15, 0.08, 1.15, 0.85, min_size=0.3, thick=(0.02, 0.05), deco=0.7)
    m.pop()
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(2.4, 2.4, 1.4), light=dict(color=(0.2, 0.9, 1.0), energy=1.2, range=5, at=(0.3, -0.1, 1.3))))


def health_station(seed=5):
    m = Mesh('health_station')
    m.box((0.9, 0.3, 1.4), at=(0, -0.15, 1.5), mat='hull', bevel=0.05)
    m.box((0.7, 0.04, 0.7), at=(0, -0.31, 1.75), mat='hull_dark', bevel=0.02)
    m.box((0.14, 0.03, 0.46), at=(0, -0.335, 1.75), mat='glow_green')
    m.box((0.46, 0.03, 0.14), at=(0, -0.335, 1.75), mat='glow_green')
    m.box((0.6, 0.3, 0.12), at=(0, -0.35, 1.1), mat='trim', bevel=0.03)
    for i in range(3):
        m.cyl(0.07, 0.3, at=(-0.2 + i * 0.2, -0.38, 0.98), mat='glass', seg=8)
        m.cyl(0.05, 0.2, at=(-0.2 + i * 0.2, -0.38, 0.95), mat='glow_green', seg=8)
    m.tube([(0.35, -0.3, 1.2), (0.5, -0.45, 1.0), (0.45, -0.5, 0.7), (0.3, -0.42, 0.6)], 0.02, mat='cable', seg=6)
    return dict(objects=[m.to_object()], meta=dict(type='prop', mount='wall', solid=(0.9, 2.2, 0.5), light=dict(color=(0.25, 1.0, 0.35), energy=0.8, range=4, at=(0, -0.6, 1.7))))


def cache(seed=6):
    rnd = random.Random(seed)
    m = Mesh('cache')
    m.box((1.3, 0.8, 0.55), at=(0, 0, 0.3), mat='hull_dark', bevel=0.05)
    for s in (-1, 1):
        m.box((0.12, 0.86, 0.6), at=(s * 0.5, 0, 0.3), mat='accent', bevel=0.02)
    m.box((0.3, 0.06, 0.2), at=(0, -0.41, 0.4), mat='trim', bevel=0.02)
    m.box((0.14, 0.03, 0.06), at=(0, -0.445, 0.4), mat='lock')
    m.box((1.1, 0.6, 0.03), at=(0, 0, 0.56), mat='glow_amber')
    lid = Mesh('lid')
    lid.box((1.32, 0.82, 0.22), at=(0, 0, 0.68), mat='hull', bevel=0.06)
    lid.box((0.9, 0.5, 0.05), at=(0, 0, 0.8), mat='trim', bevel=0.02)
    for s in (-1, 1):
        lid.box((0.12, 0.88, 0.25), at=(s * 0.5, 0, 0.68), mat='accent', bevel=0.02)
    return dict(objects=[m.to_object(), lid.to_object(origin=(0, 0.41, 0.58))], meta=dict(type='prop', solid=(1.3, 0.9, 0.8), parts={'lid': dict(rot_axis=(1, 0, 0), rot_deg=-105)}, time=0.5))


def crate(seed=7):
    rnd = random.Random(seed)
    m = Mesh('crate')
    m.box((1.0, 1.0, 1.0), at=(0, 0, 0.5), mat='hull', bevel=0.04)
    for s in (-1, 1):
        for t in (-1, 1):
            m.box((0.1, 0.1, 1.04), at=(s * 0.47, t * 0.47, 0.5), mat='trim', bevel=0.02)
    m.box((1.04, 1.04, 0.1), at=(0, 0, 0.5), mat='accent2')
    m.box((0.4, 0.02, 0.25), at=(0, -0.51, 0.72), mat='hazard')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.0, 1.0, 1.0)))


def barrel(seed=8):
    m = Mesh('barrel')
    m.lathe([(0.34, 0), (0.38, 0.05), (0.38, 0.3), (0.4, 0.33), (0.38, 0.36), (0.38, 0.75), (0.4, 0.78), (0.38, 0.81), (0.38, 1.05), (0.34, 1.1)], mat='accent', seg=14)
    m.cyl(0.3, 0.02, at=(0, 0, 1.1), mat='hull_dark', seg=14)
    m.cyl(0.06, 0.06, at=(0.15, 0, 1.13), mat='trim', seg=8)
    m.box((0.3, 0.02, 0.2), at=(0, -0.385, 0.55), mat='hazard')
    m.cyl(0.39, 0.06, at=(0, 0, 0.55), mat='glow_red', seg=14, caps=False)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(0.8, 1.1, 0.8)))


def server_rack(seed=9):
    rnd = random.Random(seed)
    m = Mesh('server_rack')
    m.box((1.0, 0.8, 2.4), at=(0, 0, 1.2), mat='hull_dark', bevel=0.03)
    for i in range(9):
        z = 0.3 + i * 0.22
        m.box((0.86, 0.04, 0.18), at=(0, -0.4, z), mat='trim', bevel=0.01)
        for k in range(5):
            if rnd.random() < 0.7:
                m.box((0.03, 0.02, 0.03), at=(-0.34 + k * 0.07, -0.425, z), mat=rnd.choice(['glow_green', 'glow_green', 'glow_amber', 'glow_red', 'glow_cyan']))
        m.box((0.3, 0.02, 0.1), at=(0.2, -0.425, z), mat='hull_dark')
    m.box((1.04, 0.84, 0.1), at=(0, 0, 2.38), mat='accent2', bevel=0.02)
    cable(m, rnd, (0.3, 0.2, 2.42), (0.3, 0.2, 3.6), sag=0, r=0.04, n=1)
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.0, 2.4, 0.8)))


def cryo_pod(seed=10, broken=False):
    rnd = random.Random(seed)
    m = Mesh('cryo_pod')
    m.lathe([(0.75, 0), (0.75, 0.3), (0.6, 0.4)], mat='hull_dark', seg=14, smooth=False)
    m.lathe([(0.6, 2.6), (0.75, 2.7), (0.75, 3.0), (0.5, 3.1)], mat='hull_dark', seg=14, smooth=False)
    if not broken:
        m.cyl(0.58, 2.2, at=(0, 0, 1.5), mat='glass', seg=14, caps=False)
        m.ball(0.3, at=(0, 0, 1.7), mat='flesh_pale', seg=10, scale=(1, 0.9, 1.6))
        m.ball(0.16, at=(0.05, -0.12, 2.25), mat='flesh', seg=8)
        for i in range(4):
            m.tube([(0, 0, 1.4), (0.2 * math.cos(i * 1.6), 0.2 * math.sin(i * 1.6), 1.0), (0.3 * math.cos(i * 1.6 + 0.5), 0.3 * math.sin(i * 1.6 + 0.5), 0.6)], lambda t: 0.05 * (1 - t * 0.7), mat='flesh', seg=6)
        m.cyl(0.5, 0.05, at=(0, 0, 0.42), mat='glow_green', seg=14)
    else:
        for i in range(9):
            a = math.radians(i * 40)
            h = rnd.uniform(0.2, 1.1)
            m.box((0.38, 0.02, h), at=(0.58 * math.cos(a), 0.58 * math.sin(a), 0.4 + h / 2), rot=(0, 0, i * 40 + 90), mat='glass')
        m.cyl(0.5, 0.05, at=(0, 0, 0.42), mat='slime', seg=14)
        m.ball(0.5, at=(0.5, -0.7, 0.02), mat='slime', seg=10, scale=(1.3, 1, 0.06))
        dangle(m, rnd, (0.2, 0.1, 2.6), 1.2)
    for i in range(3):
        a = math.radians(i * 120 + 60)
        m.cyl(0.05, 2.3, at=(0.68 * math.cos(a), 0.68 * math.sin(a), 1.5), mat='chrome', seg=6)
    m.box((0.3, 0.12, 0.4), at=(0, -0.72, 0.9), mat='hull', bevel=0.02)
    m.box((0.2, 0.02, 0.12), at=(0, -0.785, 0.98), mat='screen' if not broken else 'screen_dead')
    return dict(objects=[m.to_object()], meta=dict(type='prop', solid=(1.5, 3.1, 1.5), light=None if broken else dict(color=(0.25, 1.0, 0.35), energy=1.0, range=4.5, at=(0, 0, 1.2))))


def holo_table(seed=11):
    m = Mesh('holo_table')
    m.lathe([(0.5, 0), (0.5, 0.1), (0.25, 0.2), (0.25, 0.75), (1.1, 0.85), (1.1, 1.0), (0.9, 1.02)], mat='hull_dark', seg=16, smooth=False)
    m.cyl(0.9, 0.02, at=(0, 0, 1.02), mat='glow_cyan', seg=16)
    m.ring(1.1, 0.04, at=(0, 0, 0.93), mat='accent', seg=24, tseg=6)
    objs = [m.to_object()]
    h = Mesh('spin0')
    h.lathe([(0.0, 1.25), (0.5, 1.45), (0.62, 1.8), (0.5, 2.15), (0.0, 2.35)], mat='glass', seg=8, smooth=False)
    h.ring(0.75, 0.012, at=(0, 0, 1.8), rot=(20, 0, 0), mat='glow_cyan', seg=24, tseg=4)
    h.ring(0.85, 0.012, at=(0, 0, 1.8), rot=(-35, 20, 0), mat='glow_pink', seg=24, tseg=4)
    objs.append(h.to_object(origin=(0, 0, 1.8)))
    return dict(objects=objs, meta=dict(type='prop', solid=(2.2, 1.0, 2.2), spin={'spin0': 25}, light=dict(color=(0.2, 0.9, 1.0), energy=1.5, range=6, at=(0, 0, 1.8))))


def debris(seed=12):
    rnd = random.Random(seed)
    m = Mesh('debris')
    for i in range(9):
        w, d, h = rnd.uniform(0.3, 1.0), rnd.uniform(0.3, 0.8), rnd.uniform(0.03, 0.12)
        m.box((w, d, h), at=(rnd.uniform(-0.8, 0.8), rnd.uniform(-0.8, 0.8), 0.06 + i * 0.045), rot=(rnd.uniform(-14, 14), rnd.uniform(-14, 14), rnd.uniform(0, 180)), mat=rnd.choice(['hull', 'hull_dark', 'rust', 'trim']), bevel=0.012)
    for i in range(3):
        cable(m, rnd, (rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0.03), (rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0.3), sag=-0.2, r=0.025, mat=rnd.choice(['cable', 'copper']))
    m.cyl(0.12, 0.9, at=(0.3, 0.2, 0.4), rot=(70, 0, 30), mat='copper', seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='prop'))


def nest(seed=13):
    rnd = random.Random(seed)
    m = Mesh('nest')
    m.ball(1.0, at=(0, 0, 0.0), mat='flesh', seg=14, scale=(1.2, 1.1, 0.3))
    for i in range(9):
        a = rnd.uniform(0, 6.28)
        d = rnd.uniform(0.1, 0.8)
        s = rnd.uniform(0.18, 0.34)
        m.ball(s, at=(d * math.cos(a), d * math.sin(a), 0.2 + s * 0.7), mat=rnd.choice(['flesh_pale', 'flesh_pale', 'slime']), seg=10, scale=(1, 1, 1.35))
    for i in range(6):
        a = i * 1.05
        m.tube([(0.6 * math.cos(a), 0.6 * math.sin(a), 0.1), (1.2 * math.cos(a + 0.2), 1.2 * math.sin(a + 0.2), 0.25), (1.7 * math.cos(a + 0.5), 1.7 * math.sin(a + 0.5), 0.02)], lambda t: 0.09 * (1 - t * 0.8), mat='flesh', seg=6)
    return dict(objects=[m.to_object()], meta=dict(type='prop', light=dict(color=(0.3, 0.9, 0.15), energy=0.7, range=4, at=(0, 0, 0.8))))


# ---------------------------------------------------------------- treasure and pickups (origin at the item's centre)
def t_statuette():
    m = Mesh('statuette')
    m.cyl(0.11, 0.05, at=(0, 0, -0.2), mat='hull_dark', seg=12)
    m.cyl(0.035, 0.2, at=(-0.03, 0, -0.08), mat='gold', seg=8)
    m.cyl(0.035, 0.2, at=(0.03, 0, -0.08), mat='gold', seg=8)
    m.box((0.12, 0.07, 0.16), at=(0, 0, 0.09), mat='gold', bevel=0.02)
    m.ball(0.045, at=(0, 0, 0.215), mat='gold', seg=10)
    m.cyl(0.02, 0.2, at=(0.08, 0, 0.2), rot=(0, 20, 0), mat='gold', seg=6)
    m.box((0.1, 0.03, 0.07), at=(0.12, 0, 0.32), mat='gold', bevel=0.008)
    m.cyl(0.02, 0.15, at=(-0.08, 0, 0.06), rot=(0, -15, 0), mat='gold', seg=6)
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def t_fuel_cell(big=False):
    m = Mesh('fuel_cell')
    k = 1.5 if big else 1.0
    m.cyl(0.09 * k, 0.26 * k, mat='glow_amber' if not big else 'glow_violet', seg=12)
    m.cyl(0.1 * k, 0.26 * k, mat='glass', seg=12, caps=False)
    for z in (-0.15, 0.15):
        m.cyl(0.11 * k, 0.06 * k, at=(0, 0, z * k), mat='trim', seg=12)
        m.cyl(0.05 * k, 0.03 * k, at=(0, 0, z * k * 1.25), mat='copper', seg=8)
    for i in range(3):
        a = math.radians(i * 120)
        m.box((0.02 * k, 0.02 * k, 0.26 * k), at=(0.105 * k * math.cos(a), 0.105 * k * math.sin(a), 0), mat='hull_dark')
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def t_circuit():
    rnd = random.Random(5)
    m = Mesh('circuit')
    m.box((0.34, 0.24, 0.015), mat='accent2', bevel=0.004)
    for i in range(7):
        m.box((rnd.uniform(0.03, 0.08), rnd.uniform(0.03, 0.06), 0.02), at=(rnd.uniform(-0.13, 0.13), rnd.uniform(-0.08, 0.08), 0.016), mat=rnd.choice(['hull_dark', 'gold', 'gold', 'trim']))
    for i in range(5):
        m.box((0.3, 0.006, 0.004), at=(0, -0.09 + i * 0.045, 0.009), mat='gold')
    m.cyl(0.02, 0.03, at=(0.12, 0.08, 0.02), mat='glow_green', seg=8)
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def t_crystal():
    m = Mesh('crystal')
    m.lathe([(0.0, -0.22), (0.09, -0.1), (0.1, 0.1), (0.0, 0.24)], mat='glow_violet', seg=6, smooth=False)
    m.ring(0.13, 0.012, mat='gold', seg=16, tseg=5)
    m.ring(0.13, 0.012, rot=(90, 0, 0), mat='gold', seg=16, tseg=5)
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def t_chips():
    m = Mesh('chips')
    for i in range(5):
        m.cyl(0.07, 0.014, at=(0.01 * math.sin(i * 2), 0.01 * math.cos(i), -0.03 + i * 0.016), mat='gold' if i % 2 else 'glow_pink', seg=12)
    m.cyl(0.07, 0.014, at=(0.12, 0.03, -0.03), rot=(70, 0, 20), mat='gold', seg=12)
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def t_cookies():
    m = Mesh('cookies')
    m.box((0.3, 0.2, 0.1), mat='glow_pink', bevel=0.01)
    m.box((0.31, 0.21, 0.03), at=(0, 0, 0.02), mat='hull')
    m.cyl(0.05, 0.012, at=(0, 0, 0.055), mat='gold', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def p_health():
    m = Mesh('health')
    m.box((0.32, 0.12, 0.26), mat='hull', bevel=0.03)
    for s in (-1, 1):
        m.box((0.05, 0.01, 0.16), at=(0, s * 0.062, 0), mat='glow_green')
        m.box((0.16, 0.01, 0.05), at=(0, s * 0.062, 0), mat='glow_green')
    m.box((0.14, 0.06, 0.04), at=(0, 0, 0.15), mat='trim', bevel=0.01)
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def p_armor():
    m = Mesh('armor')
    m.box((0.4, 0.16, 0.42), mat='hull_dark', bevel=0.06)
    m.box((0.3, 0.18, 0.2), at=(0, 0, 0.02), mat='accent2', bevel=0.03)
    for s in (-1, 1):
        m.box((0.1, 0.14, 0.16), at=(s * 0.16, 0, 0.26), mat='hull_dark', bevel=0.03)
    m.box((0.1, 0.19, 0.05), at=(0, 0, 0.02), mat='glow_cyan')
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def p_ammo(kind):
    m = Mesh('ammo_' + kind)
    if kind == 'bullets':
        m.box((0.26, 0.16, 0.14), mat='accent2', bevel=0.015)
        for i in range(4):
            for j in range(2):
                m.cyl(0.02, 0.06, at=(-0.09 + i * 0.06, -0.035 + j * 0.07, 0.08), mat='gold', seg=6)
    elif kind == 'shells':
        m.box((0.26, 0.16, 0.12), mat='accent', bevel=0.015)
        for i in range(3):
            m.cyl(0.035, 0.1, at=(-0.07 + i * 0.07, 0, 0.09), mat='glow_red', seg=8)
            m.cyl(0.037, 0.03, at=(-0.07 + i * 0.07, 0, 0.13), mat='gold', seg=8)
    else:
        m.box((0.2, 0.14, 0.26), mat='hull_dark', bevel=0.02)
        m.box((0.12, 0.15, 0.16), mat='glow_cyan')
        m.box((0.1, 0.08, 0.04), at=(0, 0, 0.15), mat='copper')
    return dict(objects=[m.to_object()], meta=dict(type='item'))


def p_keycard():
    m = Mesh('keycard')
    m.box((0.3, 0.02, 0.19), mat='lock', bevel=0.006)
    m.box((0.3, 0.024, 0.04), at=(0, 0, -0.04), mat='hull_dark')
    m.box((0.07, 0.026, 0.06), at=(-0.08, 0, 0.04), mat='gold')
    return dict(objects=[m.to_object()], meta=dict(type='item'))


# ---------------------------------------------------------------- trap hardware
def trap_laser():
    m = Mesh('trap_laser')
    m.box((0.3, 0.14, 0.3), at=(0, -0.07, 0), mat='hull_dark', bevel=0.03)
    m.cyl(0.07, 0.12, at=(0, -0.16, 0), rot=(90, 0, 0), mat='trim', seg=10)
    m.cyl(0.035, 0.02, at=(0, -0.225, 0), rot=(90, 0, 0), mat='glow_red', seg=8)
    m.box((0.32, 0.02, 0.06), at=(0, -0.145, 0.1), mat='hazard')
    return dict(objects=[m.to_object()], meta=dict(type='prop'))


def trap_shock():
    m = Mesh('trap_shock')
    m.box((3.2, 3.2, 0.05), at=(0, 0, 0.02), mat='hull_dark', bevel=0.02)
    for i in range(4):
        for j in range(4):
            m.box((0.62, 0.62, 0.03), at=(-1.14 + i * 0.76, -1.14 + j * 0.76, 0.05), mat='copper', bevel=0.012)
            m.cyl(0.05, 0.03, at=(-1.14 + i * 0.76, -1.14 + j * 0.76, 0.075), mat='glow_cyan', seg=6)
    for s in (-1, 1):
        m.box((3.3, 0.12, 0.06), at=(0, s * 1.6, 0.03), mat='hazard', bevel=0.01)
        m.box((0.12, 3.3, 0.06), at=(s * 1.6, 0, 0.03), mat='hazard', bevel=0.01)
    return dict(objects=[m.to_object()], meta=dict(type='prop'))


def trap_vent():
    m = Mesh('trap_vent')
    m.cyl(0.55, 0.06, at=(0, 0, 0.03), mat='hull_dark', seg=16)
    m.ring(0.5, 0.05, at=(0, 0, 0.06), mat='hazard', seg=20, tseg=6)
    for i in range(6):
        m.box((0.85, 0.05, 0.03), at=(0, 0, 0.07), rot=(0, 0, i * 30), mat='trim')
    m.cyl(0.14, 0.12, at=(0, 0, 0.1), r2=0.08, mat='copper', seg=10)
    return dict(objects=[m.to_object()], meta=dict(type='prop'))


# ---------------------------------------------------------------- weapons (held; the barrel points at -Y, origin at the grip)
def w_handgun():
    m = Mesh('handgun')
    m.box((0.045, 0.1, 0.16), at=(0, 0.02, -0.07), rot=(-12, 0, 0), mat='rubber', bevel=0.012)
    m.box((0.055, 0.3, 0.075), at=(0, -0.09, 0.03), mat='hull_dark', bevel=0.012)
    m.box((0.06, 0.2, 0.03), at=(0, -0.1, 0.075), mat='trim', bevel=0.008)
    m.cyl(0.017, 0.12, at=(0, -0.29, 0.035), rot=(90, 0, 0), mat='chrome', seg=8)
    m.cyl(0.03, 0.08, at=(0, -0.02, 0.03), rot=(0, 90, 0), mat='copper', seg=8)
    m.box((0.02, 0.05, 0.02), at=(0, -0.2, 0.1), mat='glow_amber')
    m.tube([(0, -0.05, -0.01), (0, -0.09, -0.035), (0, -0.12, -0.01)], 0.006, mat='trim', seg=5)
    return dict(objects=[m.to_object()], meta=dict(type='weapon', muzzle=(0, -0.36, 0.035)))


def w_scattergun():
    m = Mesh('scattergun')
    m.box((0.05, 0.1, 0.15), at=(0, 0.05, -0.07), rot=(-18, 0, 0), mat='rubber', bevel=0.012)
    m.box((0.07, 0.36, 0.1), at=(0, -0.08, 0.03), mat='hull_dark', bevel=0.015)
    for s in (-1, 1):
        m.cyl(0.027, 0.5, at=(s * 0.03, -0.48, 0.05), rot=(90, 0, 0), mat='trim', seg=10)
    m.box((0.085, 0.18, 0.07), at=(0, -0.42, -0.005), mat='accent', bevel=0.015)
    m.box((0.075, 0.26, 0.1), at=(0, 0.2, 0.0), rot=(-8, 0, 0), mat='rubber', bevel=0.02)
    m.box((0.09, 0.04, 0.12), at=(0, -0.7, 0.05), mat='hull_dark', bevel=0.01)
    m.box((0.02, 0.14, 0.02), at=(0, -0.1, 0.09), mat='glow_red')
    return dict(objects=[m.to_object()], meta=dict(type='weapon', muzzle=(0, -0.75, 0.05)))


def w_plasma():
    m = Mesh('plasma')
    m.box((0.05, 0.1, 0.15), at=(0, 0.05, -0.07), rot=(-18, 0, 0), mat='rubber', bevel=0.012)
    m.box((0.08, 0.4, 0.11), at=(0, -0.1, 0.035), mat='hull', bevel=0.02)
    m.cyl(0.045, 0.3, at=(0, -0.3, 0.04), rot=(90, 0, 0), mat='glow_cyan', seg=12)
    m.cyl(0.055, 0.3, at=(0, -0.3, 0.04), rot=(90, 0, 0), mat='glass', seg=12, caps=False)
    for i in range(4):
        m.ring(0.062, 0.012, at=(0, -0.2 - i * 0.08, 0.04), rot=(90, 0, 0), mat='copper', seg=12, tseg=5)
    for i in range(3):
        a = math.radians(90 + i * 120)
        m.box((0.014, 0.42, 0.03), at=(0.07 * math.cos(a), -0.5, 0.04 + 0.07 * math.sin(a)), rot=(0, math.degrees(a) + 90, 0), mat='trim')
    m.box((0.08, 0.26, 0.11), at=(0, 0.22, 0.0), rot=(-8, 0, 0), mat='hull_dark', bevel=0.02)
    m.box((0.06, 0.1, 0.05), at=(0, -0.02, 0.11), mat='screen')
    return dict(objects=[m.to_object()], meta=dict(type='weapon', muzzle=(0, -0.72, 0.04)))


PROPS = {
    'door_split': door_split, 'door_rise': door_rise, 'door_jaw': door_jaw, 'door_shear': door_shear, 'door_iris': door_iris, 'door_vault': door_vault,
    'terminal_wall': terminal_wall, 'terminal_desk': terminal_desk, 'reactor': reactor, 'fabricator': fabricator, 'health_station': health_station,
    'cache': cache, 'crate': crate, 'barrel': barrel, 'server_rack': server_rack, 'cryo_pod': cryo_pod, 'cryo_pod_broken': lambda: cryo_pod(21, True),
    'holo_table': holo_table, 'debris': debris, 'nest': nest,
    'item_statuette': t_statuette, 'item_fuel_cell': t_fuel_cell, 'item_fuel_cell_big': lambda: t_fuel_cell(True), 'item_circuit': t_circuit, 'item_crystal': t_crystal,
    'item_chips': t_chips, 'item_cookies': t_cookies, 'item_health': p_health, 'item_armor': p_armor,
    'item_ammo_bullets': lambda: p_ammo('bullets'), 'item_ammo_shells': lambda: p_ammo('shells'), 'item_ammo_cells': lambda: p_ammo('cells'), 'item_keycard': p_keycard,
    'trap_laser': trap_laser, 'trap_shock': trap_shock, 'trap_vent': trap_vent,
    'weapon_handgun': w_handgun, 'weapon_scattergun': w_scattergun, 'weapon_plasma': w_plasma,
}
