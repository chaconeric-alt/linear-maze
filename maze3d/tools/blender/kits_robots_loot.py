"""Two kits of things that go in every place:
  robots   a station for each kind of robot: a bay with a lit ceiling and its own floor, fitted out to watch, mend and
           charge the robot that stands in it, with a shutter that closes over a hibernating one          (tag rb)
  loot     what treasure is kept in, in each place's own materials: a shelf unit, a trophy case and a strongbox for
           each of the nine kits, and a charging rack for power cells                                      (tag lt)
Every other kit "uses" these two. A station's model is built SHUT; its "shutter" part moves to open it (engine/station.gd).
A container's "slots" are where the things it holds sit, in the engine's axes (x, up, toward the front)."""
import math
from mz import Mesh, T, R
import palette, agency, kits_works_bunker_crypt, kits_executive_megaplex_hospital_basilica

ROBOT_MATS = {
    'rb_plate':  dict(color=(0.10, 0.11, 0.13), metal=0.7, rough=0.45, shader='worn', grime=0.5),      # the station's own floor
    'rb_frame':  dict(color=(0.30, 0.32, 0.35), metal=0.8, rough=0.4, shader='worn', grime=0.5),
    'rb_heavy':  dict(color=(0.20, 0.21, 0.19), metal=0.85, rough=0.5, shader='worn', grime=0.6),      # the big sentry's
    'rb_shut':   dict(color=(0.42, 0.44, 0.47), metal=0.85, rough=0.35, shader='worn', grime=0.45),    # shutter slats
    'rb_rust':   dict(color=(0.32, 0.17, 0.09), metal=0.5, rough=0.8, shader='worn', grime=0.7),
    'rb_lamp':   dict(color=(0.85, 0.95, 1.0), emit=(0.8, 0.93, 1.0), energy=3.0, shader='glow'),      # the lit ceiling
    'rb_charge': dict(color=(0.3, 1.0, 0.55), emit=(0.3, 1.0, 0.55), energy=2.6, shader='glow', pulse=0.35),   # charging
}


def _floor(m, w, d, round_r=0.0):
    """The station's own floor: a dark plate, a charging ring, hazard at the threshold."""
    if round_r:
        m.cyl(round_r, 0.05, at=(0, 0, 0.025), mat='rb_plate', seg=20)
    else:
        m.box((w, d, 0.05), at=(0, 0, 0.025), mat='rb_plate', bevel=0.01)
        for k in range(int(w / 0.4)):
            m.box((0.2, 0.14, 0.012), at=(-w / 2 + 0.3 + k * 0.4, -d / 2 + 0.12, 0.052), rot=(0, 0, 30), mat='hazard')
    r = min(w, d) * 0.3 if not round_r else round_r * 0.6
    m.ring(r, 0.03, at=(0, 0, 0.055), mat='rb_charge', seg=24, tseg=4)
    m.ring(r * 0.55, 0.018, at=(0, 0, 0.055), mat='glow_cyan', seg=18, tseg=4)


def _kit_wall(m, w, y, h, body='rb_frame', z0=0.3):
    """The back of a bay, fitted out: a monitor, a mending arm folded away, a charge coupling, cables, a tool rack."""
    m.box((w * 0.34, 0.06, 0.5), at=(-w * 0.24, y - 0.05, h * 0.72), mat='hull_dark', bevel=0.02)
    m.box((w * 0.3, 0.02, 0.42), at=(-w * 0.24, y - 0.09, h * 0.72), mat='screen')                 # the monitor
    for k in range(3):
        m.cyl(0.035, 0.03, at=(-w * 0.36 + k * 0.1, y - 0.07, h * 0.72 - 0.36), rot=(90, 0, 0), mat=('glow_green', 'glow_amber', 'glow_red')[k], seg=6)
    m.cyl(0.13, 0.16, at=(w * 0.22, y - 0.1, h * 0.42), rot=(90, 0, 0), mat='trim', seg=10)        # the charge coupling
    m.cyl(0.08, 0.2, at=(w * 0.22, y - 0.12, h * 0.42), rot=(90, 0, 0), mat='rb_charge', seg=8)
    m.tube([(w * 0.22, y - 0.05, h * 0.42 + 0.14), (w * 0.3, y - 0.12, h * 0.6), (w * 0.2, y - 0.06, h * 0.86)], 0.03, mat='cable', seg=5)
    m.tube([(w * 0.14, y - 0.05, h * 0.42), (0.0, y - 0.14, h * 0.3), (-w * 0.2, y - 0.06, z0)], 0.025, mat='cable', seg=5)
    m.tube([(w * 0.3, y - 0.08, h * 0.9), (w * 0.3, y - 0.5, h * 0.95), (w * 0.18, y - 0.8, h * 0.78)], 0.035, mat='accent', seg=6)      # the mending arm
    m.ball(0.07, at=(w * 0.18, y - 0.8, h * 0.78), mat='chrome', seg=6)
    m.box((0.5, 0.08, 0.3), at=(w * 0.02, y - 0.05, h * 0.58), mat='hull_dark')                   # a rack of tools
    for k in range(4):
        m.box((0.04, 0.05, 0.22), at=(w * 0.02 - 0.18 + k * 0.12, y - 0.1, h * 0.58), mat='chrome')


def _lit_top(m, w, d, h, body='rb_frame', thick=0.28):
    m.box((w, d, thick), at=(0, 0, h - thick / 2), mat=body, bevel=0.03)
    m.box((w * 0.62, d * 0.62, 0.03), at=(0, 0, h - thick - 0.01), mat='rb_lamp')                  # the lit ceiling
    m.box((w, 0.06, 0.08), at=(0, -d / 2 - 0.01, h - 0.1), mat='glow_amber')                       # the header's status bar


def _slats(sh, w, y, z0, z1, mat='rb_shut'):
    n = max(3, int((z1 - z0) / 0.24))
    hh = (z1 - z0) / n
    for k in range(n):
        sh.box((w, 0.07, hh - 0.02), at=(0, y, z0 + (k + 0.5) * hh), mat=mat, bevel=0.012)
    sh.box((w, 0.1, 0.1), at=(0, y, z0 + 0.05), mat='hazard')
    sh.box((0.3, 0.03, 0.12), at=(0, y - 0.05, (z0 + z1) / 2), mat='lock')


def bay(name, w, d, h, body='rb_frame', wall=0.2, heavy=False, rust=False):
    """A square bay: floor, lit top, fitted back, two side walls; a slatted shutter that rises into the header."""
    m = Mesh(name)
    _floor(m, w, d)
    _lit_top(m, w, d, h, body, 0.4 if heavy else 0.28)
    m.box((w, wall, h), at=(0, d / 2 - wall / 2, h / 2), mat=body)
    for s in (-1, 1):
        m.box((wall, d, h), at=(s * (w / 2 - wall / 2), 0, h / 2), mat=body, bevel=0.02)
        m.box((wall + 0.06, 0.16, h), at=(s * (w / 2 - wall / 2), -d / 2 + 0.08, h / 2), mat='rb_rust' if rust else ('hazard' if heavy else 'trim'), bevel=0.02)
        m.box((0.03, d * 0.6, 0.06), at=(s * (w / 2 - wall - 0.01), 0, h * 0.55), mat='glow_cyan')
        if heavy:                                         # ribs and clamps: this one holds something that weighs tons
            for y in (-d * 0.25, d * 0.2):
                m.box((wall + 0.16, 0.3, h), at=(s * (w / 2 - wall / 2), y, h / 2), mat='rb_heavy', bevel=0.03)
            m.box((0.5, 0.4, 0.3), at=(s * (w / 2 - wall - 0.25), 0.2, 1.3), mat='rb_heavy', bevel=0.04)
            m.cyl(0.1, 0.5, at=(s * (w / 2 - wall - 0.25), 0.2, 1.3), rot=(0, 90, 0), mat='chrome', seg=8)
    _kit_wall(m, w - 2 * wall, d / 2 - wall, h, body)
    if rust:
        for k in range(5):
            m.box((0.5, 0.012, 0.9), at=(-w * 0.3 + k * 0.33, d / 2 - wall - 0.012, 0.8 + (k % 2) * 0.5), mat='rb_rust')
    sh = Mesh('shutter')
    top = h - (0.4 if heavy else 0.28)
    _slats(sh, w - 2 * wall - 0.04, -d / 2 + 0.07, 0.05, top, 'rb_heavy' if heavy else 'rb_shut')
    solids = [[0, h / 2, d / 2 - wall / 2, w, h, wall]] + [[s * (w / 2 - wall / 2), h / 2, 0, wall, h, d] for s in (-1, 1)]
    return dict(objects=[m.to_object(), sh.to_object(origin=(0, 0, 0))],
                meta=dict(type='prop', solids=solids, parts={'shutter': dict(move=(0, 0, top - 0.25))}, time=0.9, station=True,
                          shut_box=[0, top / 2, d / 2 - 0.07, w - 2 * wall, top, 0.14], stand=[0, 0, 0],
                          light=dict(color=(0.8, 0.93, 1.0), energy=1.3, range=5.5, at=(0, 0, h - 0.6))))


def rb_station_custodian():       # the maintenance robot's: a cube
    return bay('rb_station_custodian', 3.5, 3.5, 3.5)


def rb_station_plodder():         # the big sentry's: tall and heavy
    return bay('rb_station_plodder', 3.8, 3.7, 3.95, body='rb_heavy', wall=0.26, heavy=True)


def rb_station_monoid():
    return bay('rb_station_monoid', 2.1, 1.9, 2.95)


def rb_station_deadbot():
    return bay('rb_station_deadbot', 2.4, 2.1, 3.15, body='rb_heavy', rust=True)


def rb_station_eggbot():
    return bay('rb_station_eggbot', 2.7, 2.6, 2.6)


def rb_station_dancer():
    """The spinning robot's: a cylinder. The front third of the drum turns round behind the rest to open it."""
    R0, h, n = 1.7, 3.3, 18
    m = Mesh('rb_station_dancer')
    _floor(m, 0, 0, round_r=R0)
    m.cyl(R0, 0.3, at=(0, 0, h - 0.15), mat='rb_frame', seg=n)
    m.cyl(R0 * 0.62, 0.03, at=(0, 0, h - 0.31), mat='rb_lamp', seg=n)
    m.ring(R0 + 0.02, 0.05, at=(0, 0, h - 0.1), mat='glow_amber', seg=n, tseg=4)
    sh = Mesh('shutter')
    seg_w = 2 * math.pi * R0 / n + 0.02
    for k in range(n):
        a = math.radians(90 + (k + 0.5) * 360 / n)       # 90 = straight back (+Y)
        front = abs(((math.degrees(a) - 270 + 180) % 360) - 180) < 62       # the panels facing -Y are the door
        t = sh if front else m
        t.box((seg_w, 0.1, h - 0.36), at=((R0 - 0.05) * math.cos(a), (R0 - 0.05) * math.sin(a), 0.05 + (h - 0.36) / 2), rot=(0, 0, math.degrees(a) - 90),
              mat='rb_shut' if front else 'rb_frame')
        if not front and k % 3 == 0:
            m.box((0.05, 0.03, h * 0.6), at=((R0 - 0.12) * math.cos(a), (R0 - 0.12) * math.sin(a), h * 0.5), rot=(0, 0, math.degrees(a) - 90), mat='glow_cyan')
    m.push(T(0, 0.02, 0))
    _kit_wall(m, 1.8, R0 - 0.12, h)
    m.pop()
    m.cyl(0.5, 0.12, at=(0, 0, 0.11), mat='trim', seg=14)                                       # the turntable it spins up on
    return dict(objects=[m.to_object(), sh.to_object(origin=(0, 0, 0))],
                meta=dict(type='prop', solids=[[0, h / 2, R0 - 0.1, 2.6, h, 0.2], [-R0 + 0.1, h / 2, 0.3, 0.2, h, 2.4], [R0 - 0.1, h / 2, 0.3, 0.2, h, 2.4]],
                          parts={'shutter': dict(rot_axis=(0, 0, 1), rot_deg=150)}, time=1.1, station=True,
                          shut_box=[0, h / 2, R0 - 0.1, 2.9, h, 0.2], stand=[0, 0, 0],
                          light=dict(color=(0.8, 0.93, 1.0), energy=1.3, range=5.5, at=(0, 0, h - 0.6))))


def rb_station_knife():
    """The Knife Fighter's: a pillar it rests on, a mast behind with its lamp and monitor, and a cage that sinks into the floor."""
    m = Mesh('rb_station_knife')
    _floor(m, 0, 0, round_r=1.15)
    m.lathe([(0.5, 0.05), (0.42, 0.14), (0.3, 0.2), (0.3, 0.88), (0.44, 0.98), (0.44, 1.04), (0.2, 1.04)], mat='trim', seg=12)      # the pillar
    m.ring(0.36, 0.03, at=(0, 0, 1.05), mat='rb_charge', seg=16, tseg=4)
    m.box((0.22, 0.22, 3.1), at=(0, 1.2, 1.55), mat='rb_frame', bevel=0.03)                       # the mast
    m.box((0.9, 1.4, 0.14), at=(0, 0.6, 3.05), mat='rb_frame', bevel=0.03)                        # its arm over the pillar
    m.cyl(0.42, 0.03, at=(0, 0, 2.97), mat='rb_lamp', seg=14)
    m.box((0.5, 0.05, 0.34), at=(0, 1.07, 2.3), mat='screen')
    m.tube([(0, 1.08, 2.0), (0.2, 0.6, 1.2), (0.1, 0.3, 0.9)], 0.025, mat='cable', seg=5)
    m.tube([(0.1, 1.08, 2.8), (0.3, 0.6, 2.7), (0.3, 0.35, 2.3)], 0.03, mat='accent', seg=5)      # the mending arm
    m.ball(0.06, at=(0.3, 0.35, 2.3), mat='chrome', seg=6)
    sh = Mesh('shutter')
    n = 14
    for k in range(n):                                   # a cage of bars and hoops
        a = (k + 0.5) * 2 * math.pi / n
        sh.cyl(0.03, 2.1, at=(0.95 * math.cos(a), 0.95 * math.sin(a), 1.13), mat='rb_shut', seg=5)
    for z in (0.1, 1.1, 2.18):
        sh.ring(0.95, 0.04, at=(0, 0, z), mat='hazard' if z < 0.2 else 'rb_shut', seg=n, tseg=5)
    return dict(objects=[m.to_object(), sh.to_object(origin=(0, 0, 0))],
                meta=dict(type='prop', solids=[[0, 1.55, 1.2, 0.3, 3.1, 0.3], [0, 0.52, 0, 0.7, 1.04, 0.7]], parts={'shutter': dict(move=(0, 0, -2.2))}, time=0.8, station=True,
                          shut_box=[0, 1.15, 0, 2.0, 2.3, 2.0], stand=[0, 0, 0], front=1.5,
                          light=dict(color=(0.8, 0.93, 1.0), energy=1.0, range=4.5, at=(0, 0, 2.5))))


def rb_station_defender():
    """The Desktop Defender's: a kennel, waist high, with a flap."""
    w, d, h = 1.7, 1.6, 1.35
    m = Mesh('rb_station_defender')
    _floor(m, w, d)
    m.box((w, d, 0.16), at=(0, 0, h - 0.08), mat='rb_frame', bevel=0.03)
    m.box((w * 0.6, d * 0.6, 0.02), at=(0, 0, h - 0.17), mat='rb_lamp')
    m.box((w, 0.14, h), at=(0, d / 2 - 0.07, h / 2), mat='rb_frame')
    for s in (-1, 1):
        m.box((0.14, d, h), at=(s * (w / 2 - 0.07), 0, h / 2), mat='rb_frame', bevel=0.02)
    m.box((0.5, 0.03, 0.3), at=(-0.3, d / 2 - 0.16, 0.8), mat='screen')
    m.cyl(0.07, 0.14, at=(0.4, d / 2 - 0.18, 0.5), rot=(90, 0, 0), mat='rb_charge', seg=8)
    m.box((0.6, 0.4, 0.2), at=(0, 0, h + 0.1), mat='hull_dark', bevel=0.03)                      # the charger on top
    m.box((0.4, 0.03, 0.08), at=(0, -0.21, h + 0.1), mat='glow_amber')
    sh = Mesh('shutter')
    _slats(sh, w - 0.3, -d / 2 + 0.05, 0.05, h - 0.18)
    return dict(objects=[m.to_object(), sh.to_object(origin=(0, -d / 2 + 0.05, h - 0.18))],
                meta=dict(type='prop', solids=[[0, h / 2, d / 2 - 0.07, w, h, 0.14], [-w / 2 + 0.07, h / 2, 0, 0.14, h, d], [w / 2 - 0.07, h / 2, 0, 0.14, h, d], [0, h - 0.08, 0, w, 0.16, d]],
                          parts={'shutter': dict(rot_axis=(1, 0, 0), rot_deg=-100)}, time=0.5, station=True,
                          shut_box=[0, h / 2, d / 2 - 0.05, w - 0.28, h, 0.12], stand=[0, 0, 0],
                          light=dict(color=(0.8, 0.93, 1.0), energy=0.7, range=3.5, at=(0, 0, 1.0))))


# ================================================================= what loot is kept in
# for each kit: the materials its containers are made of. body, trim, board, glow.
LOOKS = {
    'ht': ('hull_dark', 'trim', 'hull', 'glow_cyan'),
    'ag': ('porcelain', 'rose_gold', 'porcelain_grey', 'neon_pink'),
    'wk': ('iron', 'brass', 'soot', 'furnace'),
    'bk': ('olive', 'tin', 'concrete_dark', 'glow_amber'),
    'cr': ('stone', 'gold', 'stone_light', 'flame'),
    'ex': ('ebony', 'gold_burn', 'rosewood', 'amber'),
    'mp': ('mall_cream', 'chrome', 'mall_teal', 'sale'),
    'hs': ('tile_white', 'steel', 'steel', 'glow_red'),
    'bb': ('lime', 'gold', 'pew', 'halo'),
}
LOOT_MATS = {}
for _src in (agency.MATERIALS, kits_works_bunker_crypt.KITS['works']['mats'], kits_works_bunker_crypt.KITS['bunker']['mats'], kits_works_bunker_crypt.KITS['crypt']['mats'], kits_executive_megaplex_hospital_basilica.EXEC_MATS, kits_executive_megaplex_hospital_basilica.MEGA_MATS,
             kits_executive_megaplex_hospital_basilica.HOSP_MATS, kits_executive_megaplex_hospital_basilica.BASIL_MATS):
    for _look in LOOKS.values():
        for _n in _look:
            if _n in _src and _n not in palette.MATERIALS:
                LOOT_MATS[_n] = _src[_n]


def lt_shelf(tag):
    """Shelves against a wall: cookie boxes, power cells, circuit boards. Six places, on the two boards at hand height."""
    body, trim, board, glow = LOOKS[tag]
    w, d, h = 2.3, 0.6, 2.1
    m = Mesh('lt_shelf_' + tag)
    m.box((w, 0.06, h), at=(0, d / 2 - 0.03, h / 2), mat=body)
    for s in (-1, 1):
        m.box((0.08, d, h), at=(s * (w / 2 - 0.04), 0, h / 2), mat=body, bevel=0.015)
    for z in (0.12, 0.62, 1.12, 1.62, h - 0.03):
        m.box((w - 0.1, d - 0.04, 0.05), at=(0, 0, z), mat=board)
        m.box((w - 0.1, 0.03, 0.07), at=(0, -d / 2 + 0.02, z), mat=trim)
    m.box((w - 0.3, 0.02, 0.03), at=(0, d / 2 - 0.07, 1.58), mat=glow)                           # a strip of light under the top board
    m.box((0.5, 0.42, 0.3), at=(-0.7, 0, 0.3), mat=board, bevel=0.02)                            # a box on the bottom shelf, not for taking
    m.box((0.4, 0.36, 0.24), at=(0.6, 0.02, 0.27), mat=body, bevel=0.02)
    slots = [[x, z, 0.02] for z in (1.15, 0.65) for x in (-0.7, 0.0, 0.7)]
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Loot Shelves', solid=(w, h, d), slots=slots, holds='shelf'))


def lt_trophy(tag):
    """A trophy case: a plinth, a lit pad, glass. One place."""
    body, trim, board, glow = LOOKS[tag]
    m = Mesh('lt_trophy_' + tag)
    m.box((1.0, 1.0, 0.16), at=(0, 0, 0.08), mat=trim, bevel=0.02)
    m.box((0.84, 0.84, 0.86), at=(0, 0, 0.55), mat=body, bevel=0.03)
    m.box((0.96, 0.96, 0.06), at=(0, 0, 1.0), mat=trim, bevel=0.015)
    m.box((0.6, 0.6, 0.02), at=(0, 0, 1.04), mat=glow)
    m.box((0.5, 0.02, 0.14), at=(0, -0.43, 0.7), mat=trim)                                       # the plaque
    for (x, y) in ((-0.42, -0.42), (0.42, -0.42), (-0.42, 0.42), (0.42, 0.42)):
        m.box((0.04, 0.04, 0.8), at=(x, y, 1.43), mat=trim)
    m.box((0.9, 0.9, 0.04), at=(0, 0, 1.85), mat=trim, bevel=0.01)
    m.box((0.82, 0.82, 0.78), at=(0, 0, 1.43), mat='glass')
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Trophy Case', solid=(1.0, 1.9, 1.0), slots=[[0, 1.07, 0]], holds='trophy',
                                                    light=dict(color=(1.0, 0.9, 0.7), energy=0.5, range=3.0, at=(0, 0, 1.6))))


def lt_box(tag):
    """A strongbox on a stand, its lid thrown back: credit chips, crystals. Two places."""
    body, trim, board, glow = LOOKS[tag]
    m = Mesh('lt_box_' + tag)
    for (x, y) in ((-0.5, -0.3), (0.5, -0.3), (-0.5, 0.3), (0.5, 0.3)):
        m.box((0.08, 0.08, 0.6), at=(x, y, 0.3), mat=trim)
    m.box((1.1, 0.7, 0.05), at=(0, 0, 0.2), mat=trim)
    m.box((1.2, 0.8, 0.36), at=(0, 0, 0.78), mat=body, bevel=0.03)
    m.box((1.06, 0.66, 0.04), at=(0, 0, 0.95), mat=board)                                        # the lining
    for s in (-1, 1):
        m.box((0.06, 0.82, 0.38), at=(s * 0.45, 0, 0.78), mat=trim)
    m.box((1.2, 0.08, 0.7), at=(0, 0.42, 1.28), rot=(-14, 0, 0), mat=body, bevel=0.03)           # the lid, open
    m.box((1.0, 0.03, 0.5), at=(0, 0.38, 1.28), rot=(-14, 0, 0), mat=board)
    m.box((0.2, 0.05, 0.16), at=(0, -0.41, 0.8), mat='lock')
    m.box((0.9, 0.02, 0.03), at=(0, -0.3, 0.975), mat=glow)
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Strongbox', solid=(1.2, 1.0, 0.8), slots=[[-0.26, 0.98, 0.02], [0.26, 0.98, 0.02]], holds='box'))


def lt_charge_rack():
    """Power cells on charge: a rack of sockets, each with a cell in it. Stands near where the robots are kept."""
    m = Mesh('lt_charge_rack')
    w, d, h = 1.9, 0.6, 1.9
    m.box((w, d, 0.5), at=(0, 0, 0.25), mat='hull_dark', bevel=0.03)
    m.box((w, 0.1, h), at=(0, d / 2 - 0.05, h / 2), mat='rb_frame')
    for s in (-1, 1):
        m.box((0.1, d, h), at=(s * (w / 2 - 0.05), 0, h / 2), mat='rb_frame', bevel=0.02)
    m.box((w, d, 0.1), at=(0, 0, h - 0.05), mat='rb_frame', bevel=0.02)
    m.box((w - 0.3, 0.03, 0.05), at=(0, -d / 2 + 0.02, h - 0.06), mat='rb_charge')
    slots = []
    for z in (0.56, 1.14):
        m.box((w - 0.2, d - 0.1, 0.05), at=(0, 0, z - 0.03), mat='trim')
        for x in (-0.55, 0.0, 0.55):
            m.cyl(0.17, 0.05, at=(x, -0.02, z + 0.02), mat='rb_plate', seg=10)                   # a socket
            m.ring(0.17, 0.02, at=(x, -0.02, z + 0.05), mat='rb_charge', seg=14, tseg=4)
            slots.append([x, z + 0.07, 0.02])
    m.tube([(0.7, d / 2 - 0.12, 0.5), (0.8, 0.0, 0.3), (0.6, -0.2, 0.04)], 0.03, mat='cable', seg=5)
    m.box((0.4, 0.03, 0.2), at=(-0.5, -d / 2 + 0.02, 0.3), mat='screen')
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Power Cell Charging Rack', solid=(w, h, d), slots=slots, holds='cells',
                                                    light=dict(color=(0.3, 1.0, 0.55), energy=0.5, range=3.5, at=(0, -0.5, 1.2))))


def lt_reliquary():
    """The Basilica's: a gilded casket of glass on a stone plinth, a halo over it. Two places."""
    m = Mesh('lt_reliquary')
    m.box((1.3, 0.9, 0.2), at=(0, 0, 0.1), mat='lime', bevel=0.03)
    m.box((1.0, 0.64, 0.7), at=(0, 0, 0.55), mat='lime', bevel=0.04)
    m.box((1.2, 0.8, 0.1), at=(0, 0, 0.95), mat='gold', bevel=0.02)
    m.box((1.0, 0.6, 0.02), at=(0, 0, 1.01), mat='halo')
    for (x, y) in ((-0.52, -0.32), (0.52, -0.32), (-0.52, 0.32), (0.52, 0.32)):
        m.cyl(0.035, 0.5, at=(x, y, 1.25), mat='gold', seg=6)
        m.ball(0.06, at=(x, y, 1.52), mat='gold', seg=6)
    m.box((1.0, 0.6, 0.46), at=(0, 0, 1.25), mat='glass')
    m.prism([(-0.6, 0.0), (0.6, 0.0), (0.0, 0.34)], 0.74, at=(0, 0.37, 1.5), rot=(90, 0, 0), mat='gold')       # the gabled lid
    m.ring(0.3, 0.025, at=(0, 0, 2.15), rot=(90, 0, 0), mat='halo', seg=18, tseg=5)
    m.box((0.4, 0.02, 0.1), at=(0, -0.33, 0.6), mat='gold')
    return dict(objects=[m.to_object()], meta=dict(type='prop', name='Reliquary', solid=(1.3, 1.9, 0.9), slots=[[-0.25, 1.03, 0.0], [0.25, 1.03, 0.0]], holds='box',
                                                    light=dict(color=(1.0, 0.85, 0.5), energy=0.6, range=3.5, at=(0, 0, 1.8))))


_loot_props = {'lt_charge_rack': lt_charge_rack, 'lt_reliquary': lt_reliquary}
for _tag in LOOKS:
    _loot_props['lt_shelf_' + _tag] = (lambda t=_tag: lt_shelf(t))
    _loot_props['lt_trophy_' + _tag] = (lambda t=_tag: lt_trophy(t))
    _loot_props['lt_box_' + _tag] = (lambda t=_tag: lt_box(t))
for _n in ('lime', 'gold', 'halo'):
    if _n in kits_executive_megaplex_hospital_basilica.BASIL_MATS:
        LOOT_MATS[_n] = kits_executive_megaplex_hospital_basilica.BASIL_MATS[_n]
LOOT_MATS['rb_frame'] = ROBOT_MATS['rb_frame']
LOOT_MATS['rb_plate'] = ROBOT_MATS['rb_plate']
LOOT_MATS['rb_charge'] = ROBOT_MATS['rb_charge']

STATION_NAMES = {'custodian': 'Custodian Station (cube)', 'plodder': 'Plodder Station (heavy)', 'monoid': 'Monoid Station', 'deadbot': 'Deadbot Rack',
                 'eggbot': 'Eggbot Dock', 'dancer': 'Dancer Station (drum)', 'knife': 'Knife Fighter Perch', 'defender': 'Desktop Defender Kennel'}


def _named(fn, name):
    def f():
        r = fn()
        r['meta']['name'] = name
        return r
    return f


KITS = {
    'robots': dict(mats=ROBOT_MATS, tiles={}, meta={},
                   props={'rb_station_' + k: _named(globals()['rb_station_' + k], v) for k, v in STATION_NAMES.items()}),
    'loot': dict(mats=LOOT_MATS, tiles={}, meta={}, props=_loot_props),
}
