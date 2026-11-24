#!/usr/bin/env python3
"""pen.py - writes games/havenot/levels/pen.json: THE PEN, the test level for the danger-zone monsters' pieces
(SPEC.md 3.3 and 5.23): armour by side, the beam, the latch, the charge, the burst and its cloud, splitting, drinking,
fearing light, the cloak, making things in a fight, sealing doors, afflictions, and a flame's short life.

An empty arena with a pillar in it (to break an Auditor's line of sight), and two side rooms off its east wall: one
behind an ordinary door (a Foreclosure Unit seals it), one behind a door locked red (which it must leave alone). The
level has no monsters of its own: its test (pen_test.gd) makes each one where it needs it, one at a time.

    python3 tools/levels/pen.py
"""
import levelkit as lk

W, H = 16, 9
g = lk.grid(W, H)
lk.carve(g, 1, 1, 10, 7)                           # the arena
g[4][5] = '#'                                      # the pillar
lk.carve(g, 12, 1, 3, 3)                           # the side room
lk.carve(g, 12, 5, 3, 3)                           # the locked room
g[2][11] = '+'                                     # its door
g[6][11] = 'R'                                     # the locked room's door

T = [{"start": True, "face": "e", "at": [1, 4]},
     {"sign": "THE PEN\nno feeding", "face": "s", "color": [1.0, 0.4, 0.2], "size": 56, "y": 3.0, "at": [3, 1]}]
L = {"id": "pen", "name": "The Pen (monster pieces)", "kit": "omni", "style": "corridor",
     "intro": "One at a time.", "ambient_energy": 0.8,
     "legend": {"+": {"door": "door_split"}, "R": {"door": "door_split", "lock": "red"}}, "map": lk.rows(g),
     "rooms": [{"name": "The Arena", "rect": [1, 1, 10, 7], "style": "corridor"},
               {"name": "The Side Room", "rect": [12, 1, 3, 3], "style": "storage"},
               {"name": "The Locked Room", "rect": [12, 5, 3, 3], "style": "storage"}],
     "things": T, "objectives": [{"text": "Watch them work."}], "triggers": []}
lk.write(L)
print('\n'.join(lk.rows(g)))
