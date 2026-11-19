#!/usr/bin/env python3
"""home.py - writes games/havenot/levels/home.json: HOME, the scavenger's own bunker.

Eight rooms off one hall, in the `home` kit. Nothing here fights. What the rooms DO (the ledger, the armoury, the robot,
decorating, the lift out) is engine/home.gd; this file only says where things stand and which of them can be used
("use": {"type": "home", "what": ...}).

    python3 tools/levels/home.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
META = {}
for _k in ('hightech', 'loot', 'robots', 'home'):
    META.update(json.load(open(os.path.join(ROOT, 'kits', _k, 'generated.json')))['models'])

MAP = [
    "################",
    "#..#.#..#..#####",
    "#..#.#..#..#####",
    "##g#g#g##g##...#",
    "#..........V...#",
    "##g###g##g##...#",
    "#...#..#...#####",
    "#...#..#...#####",
    "################",
]
W = len(MAP[0])
assert all(len(r) == W for r in MAP)


def room(name, x, y, w, h, style, lamps):
    """lamps: the cell that gets the ceiling lamp. The engine lights (x + ox) % every == 0, so one room = one rule."""
    ev = 50
    return dict(name=name, rect=[x, y, w, h], style=style, height=1, lights=dict(every=ev, ox=ev - lamps[0], oy=ev - lamps[1]))


# Rooms are two cells (8 m) square, the living room and the robot room three by two: big enough to furnish, small enough to be a home.
ROOMS = [
    room('Bedroom', 1, 1, 2, 2, 'hm_bedroom', (2, 2)),
    room('Bathroom', 4, 1, 1, 2, 'hm_bath', (4, 2)),
    room('Den', 6, 1, 2, 2, 'hm_den', (7, 2)),
    room('Communications', 9, 1, 2, 2, 'hm_comms', (10, 2)),
    dict(name='Hall', rect=[1, 4, 10, 1], style='hm_hall', height=1, lights=dict(every=2, ox=0, oy=0)),
    room('Living Room', 1, 6, 3, 2, 'hm_living', (2, 7)),
    room('Armoury', 5, 6, 2, 2, 'hm_armory', (6, 6)),
    room('Robot Room', 8, 6, 3, 2, 'hm_robot', (9, 6)),
    room('Security', 12, 3, 3, 3, 'hm_security', (13, 4)),
]
SIDE = {'n': (0, -1), 'e': (1, 0), 's': (0, 1), 'w': (-1, 0)}
FACE = {'n': 's', 's': 'n', 'e': 'w', 'w': 'e'}
things = []


def put(model, at, wall=None, along=0.0, out=0.0, **kw):
    """Stand `model` in cell `at`. With `wall`, its back goes against that wall (a hand's width off the panelling),
    `along` metres sideways (east or south is +) and `out` metres further into the room."""
    e = dict(prop=model, at=list(at), blocks=False)
    m = META[model]
    if wall:
        e['face'] = FACE[wall]
        if m.get('mount') != 'wall':
            depth = m.get('solid', [1, 1, 1])[2]
            d = 2.0 - depth / 2 - 0.38 - out
            dx, dz = SIDE[wall]
            ax, az = (0, 1) if dx else (1, 0)
            e['offset'] = [round(dx * d + ax * along, 2), 0, round(dz * d + az * along, 2)]
        elif along:
            dx, dz = SIDE[wall]
            ax, az = (0, 1) if dx else (1, 0)
            e['offset'] = [ax * along, 0, az * along]
    e.update(kw)
    things.append(e)
    return e


def use(what, prompt):
    return dict(type='home', what=what, prompt=prompt)


# ---- bedroom
put('hm_bed', (1, 1), 'n', along=0.6, use=use('bed', 'Sleep'))
put('hm_dresser', (1, 2), 'w', along=0.4)
put('hm_armchair', (2, 1), 'e', along=-0.3)
put('hm_painting', (2, 1), 'n')
# ---- bathroom: all white
put('hm_shower', (4, 1), 'n', along=0.25)
put('hm_toilet', (4, 1), 'w', along=1.2)
put('hm_sink', (4, 2), 'e', along=-0.4)
put('hm_medic', (4, 2), 'w', along=0.5, use=use('medic', 'Use the medical station'), tag='medic')
# ---- den
put('hm_bookcase', (6, 1), 'n')
put('hm_bookcase', (7, 1), 'n')
put('hm_desk', (7, 2), face='s', offset=[-1.2, 0, -1.6], use=use('ledger', 'Open the Expedition Ledger'), tag='ledger')
put('hm_trophy', (7, 2), 'e', along=0.3, use=use('trophy', 'Look at the trophy case'), tag='trophy')
put('hm_globe', (6, 2), 'w', along=0.9)
put('hm_clock', (6, 1), 'w')
# ---- communications
put('hm_radio', (10, 1), 'n', along=-2.0, use=use('comms', 'Use the video radio'), tag='comms')
put('hm_armchair', (10, 2), face='n', offset=[-2.0, 0, -0.9])
put('hm_table', (10, 2), 'e', along=0.2)
put('hm_gramophone', (9, 1), 'w', along=-0.9)
# ---- living room
put('hm_sofa', (1, 7), 'w', along=-2.0, use=use('sofa', 'Sit down and watch'))
put('hm_table', (1, 7), face='e', offset=[0.6, 0, -2.0])
put('hm_video', (3, 7), 'e', along=-2.0, tag='video')
put('hm_armchair', (2, 7), 's', along=1.0)
put('hm_plant', (1, 6), 'n', along=-1.2)
put('hm_lamp', (1, 7), 's', along=-1.3)
put('hm_aquarium', (3, 7), 's', along=0.3)
# ---- armoury
put('hm_rack', (5, 7), 's', along=2.0, use=use('rack', 'Look over the weapon rack'), tag='rack')
put('hm_armor', (6, 7), 'e', along=-0.6, use=use('armor', 'Look at the armour stand'), tag='armor')
put('locker', (5, 6), 'w', along=1.2, use=use('locker', 'Open the supply locker'), tag='locker')
put('hm_workbench', (5, 6), 'n', along=0.3)
# ---- robot room
put('hm_cradle', (9, 7), 's', use=use('cradle', 'Look at the robot'), tag='cradle')
put('hm_workbench', (10, 7), 'e', along=-0.6)
put('lt_shelf_wk', (8, 7), 'w', holds=[])
put('hm_console', (8, 6), 'n', along=0.3, use=use('diagnostic', 'Read the diagnostic'))
# ---- security
put('hm_lift', (14, 4), 'e', out=-0.3, use=use('lift', 'Call the lift'), tag='lift')
put('hm_console', (13, 3), 'n', use=use('security', 'Check the cameras'))
# ---- hall
put('hm_plant', (1, 4), 'w', along=-1.2)
put('hm_clock', (5, 4), 'n')
put('hm_painting', (8, 4), 'n')
put('hm_painting', (4, 4), 's')
things.append(dict(start=True, at=[3, 4], face='e'))
things.append(dict(sign='HOME', at=[10, 4], face='w', color=[1.0, 0.72, 0.4], size=40, y=3.3))

level = dict(
    id='home', name='Home (your bunker)', kit='home', style='hm_hall', home=True, off_duty=True,
    intro='Home. The door seals, the kettle works, and nothing in here wants you dead. B: decorate.',
    ambient=[0.42, 0.33, 0.24], ambient_energy=0.6, exposure=1.0, fog=dict(color=[0.16, 0.11, 0.07], density=0.004),
    player=dict(weapons=[], lamp=False),
    legend={'g': {'door': 'door_hm_gear'}, 'V': {'door': 'door_hm_vault'}},
    map=MAP, rooms=ROOMS, things=things,
    objectives=[dict(text='Home. The lift out is behind the vault door, at the east end of the hall.')], triggers=[])
out = os.path.join(ROOT, 'games', 'havenot', 'levels', 'home.json')
json.dump(level, open(out, 'w'), indent=1)
print('wrote', os.path.normpath(out), '%d things' % len(things))
