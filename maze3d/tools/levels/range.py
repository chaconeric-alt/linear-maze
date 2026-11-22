#!/usr/bin/env python3
"""range.py - writes games/havenot/levels/range.json: THE PROVING RANGE, the test level for damage types, explosives
and the rocket launcher (SPEC.md 5.21).

A firing lane over a back room, a solid wall between them, one doorway at the west end. Custodian robots stand still
as dummies (their own faction, at war with nobody, so they leave the player alone):
  - "near" and "side", three metres apart in the middle of the lane: a rocket's blast on one, falling off at the other;
  - "open" in the lane and "behind" in the back room, each eight metres from the lane's south edge: a blast there
    reaches the one in the open and not the one behind the wall;
  - "far" at the east end, for the launcher.
The launcher and a crate of rockets lie by the start. Its own test (range_test.gd) does the rest.

    python3 tools/levels/range.py
"""
import levelkit as lk

W, H = 16, 7
g = lk.grid(W, H)
lk.carve(g, 1, 1, 14, 3)                           # the lane
lk.carve(g, 1, 5, 14, 1)                           # the back room
g[4][1] = '+'                                      # the doorway between, at the west end

dummy = {"actor": "custodian", "faction": "dummies", "still": True}
T = [{"start": True, "face": "e", "at": [1, 2]},
     {"sign": "PROVING RANGE\nmind the back blast", "face": "s", "color": [1.0, 0.6, 0.2], "size": 56, "y": 3.0, "at": [6, 1]},
     dict(dummy, at=[8, 2], tag="near"),
     dict(dummy, at=[8, 2], offset=[3.0, 0, 0], tag="side"),
     dict(dummy, at=[6, 3], tag="open"),
     dict(dummy, at=[8, 5], tag="behind"),
     dict(dummy, at=[14, 2], tag="far"),
     {"item": "launcher", "at": [2, 1]}, {"item": "rockets", "at": [2, 3]}]
L = {"id": "range", "name": "The Proving Range (explosives)", "kit": "omni", "style": "corridor",
     "intro": "Dummies in a row. Mind the back blast.", "ambient_energy": 0.8,
     "legend": {"+": {"door": "door_split"}}, "map": lk.rows(g),
     "rooms": [{"name": "The Lane", "rect": [1, 1, 14, 3], "style": "corridor"},
               {"name": "The Back Room", "rect": [1, 5, 14, 1], "style": "storage"}],
     "factions": {"dummies": {"name": "Dummies", "hostile": []}},
     "things": T, "objectives": [{"text": "Try the launcher."}], "triggers": []}
lk.write(L)
print('\n'.join(lk.rows(g)))
