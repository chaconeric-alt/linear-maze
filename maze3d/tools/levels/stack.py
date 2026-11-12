#!/usr/bin/env python3
"""stack.py - writes games/havenot/levels/stack.json: the level that shows floors on top of floors.
Storey 0: two two-storey halls side by side, a store room and a lobby south of them.
Storey 1: a door high in the wall between the halls, from one balcony to the other; and a loft over the store room,
          reached only by a door off Hall A's balcony.
Storey -1: a sump and a vault under Hall B and the lobby. A pit in Hall B's floor drops into the sump; a lift in the
          lobby goes down to the vault and back.
Hall A also has a pool, sunk in the floor."""
import json, os
W, Hh = 17, 14


def grid(rects, doors=()):
    g = [['#'] * W for _ in range(Hh)]
    for (x0, y0, w, h) in rects:
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                g[y][x] = '.'
    for (x, y) in doors:
        g[y][x] = '+'
    return g


g0 = grid([(1, 1, 7, 7), (9, 1, 7, 7), (1, 9, 7, 4), (9, 9, 7, 4)], [(8, 4), (4, 8), (12, 8)])
for y in (3, 4, 5):
    for x in (2, 3, 4):
        g0[y][x] = '~'
g1 = grid([(1, 9, 7, 4)], [(8, 2), (6, 8)])
gb = grid([(9, 1, 7, 4), (9, 6, 7, 7)], [(12, 5)])
rows = lambda g: [''.join(r) for r in g]
T = [{"start": True, "face": "e", "at": [1, 1]},
     {"sign": "THE STACK\nup, across, down", "face": "s", "color": [0.4, 0.9, 1.0], "size": 56, "y": 3.0, "at": [4, 1]},
     {"item": "scattergun", "at": [2, 1]}, {"item": "shells", "at": [3, 1]},
     {"actor": "glorexx", "at": [3, 4]},
     {"actor": "monoid", "at": [7, 3], "level": 1, "lounge": "lean"},
     {"actor": "eggbot", "at": [9, 5], "level": 1, "lounge": "none"},
     {"actor": "roach", "at": [13, 6]},
     {"item": "crystal", "at": [9, 1], "level": 1}, {"item": "health", "at": [9, 7], "level": 1},
     {"actor": "monoid", "at": [3, 11], "level": 1, "lounge": "sit"},
     {"item": "statuette", "at": [2, 12], "level": 1}, {"item": "plasma", "at": [6, 12], "level": 1}, {"prop": "crate", "at": [1, 9], "level": 1, "blocks": False},
     {"prop": "barrel", "at": [1, 12], "blocks": False}, {"item": "cells", "at": [6, 10]}, {"actor": "roach", "at": [5, 11]},
     {"trap": "pit", "at": [12, 3]},
     {"sign": "MIND THE FLOOR", "face": "w", "color": [1.0, 0.6, 0.2], "size": 48, "y": 2.6, "at": [15, 3]},
     {"actor": "fouler", "at": [10, 2], "level": -1}, {"item": "health", "at": [15, 4], "level": -1}, {"item": "crystal", "at": [9, 4], "level": -1},
     {"actor": "roach", "at": [10, 10], "level": -1}, {"actor": "custodian", "at": [11, 8], "level": -1},
     {"item": "statuette", "at": [9, 12], "level": -1}, {"item": "shells", "at": [15, 6], "level": -1},
     {"lift": [-1, 0], "at": [14, 10], "home": 0},
     {"sign": "LIFT", "face": "n", "color": [0.4, 1.0, 0.6], "size": 64, "y": 3.0, "at": [14, 12]},
     {"prop": "holo_table", "at": [10, 11], "blocks": False, "use": {"type": "effects", "prompt": "Call it a day", "effects": [{"type": "end", "title": "All floors", "text": "Up, across, down, and back up again."}]}}]
L = {"id": "stack", "name": "The Stack (floors over floors, upper doors, a pit, a lift, a sunk pool)", "kit": "omni", "style": "corridor",
     "intro": "Rooms above rooms. The door you want may be over your head, or under your feet.", "ambient_energy": 0.7,
     "legend": {"+": {"door": "door_split"}, "~": {"fluid": True}}, "map": rows(g0),
     "fluid": {"level": 0.7, "color": [0.12, 0.55, 0.35, 0.6], "glow": 0.35},
     "rooms": [{"name": "Hall A", "rect": [1, 1, 7, 7], "style": "lab", "height": 2}, {"name": "Hall B", "rect": [9, 1, 7, 7], "style": "white_hall", "height": 2},
               {"name": "Store", "rect": [1, 9, 7, 4], "style": "storage"}, {"name": "Lobby", "rect": [9, 9, 7, 4], "style": "lab"}],
     "decks": [{"rect": [1, 7, 7, 1], "level": 1}, {"rect": [7, 1, 1, 7], "level": 1}, {"rect": [9, 1, 1, 7], "level": 1}],
     "ramps": [{"at": [6, 5], "dir": "s", "from": 0, "to": 2}, {"at": [6, 6], "dir": "s", "from": 2, "to": 4}],
     "floors": [{"level": 1, "map": rows(g1), "rooms": [{"name": "The Loft", "rect": [1, 9, 7, 4], "style": "bunker_ops"}]},
                {"level": -1, "map": rows(gb), "rooms": [{"name": "The Sump", "rect": [9, 1, 7, 4], "style": "ruin"}, {"name": "The Vault", "rect": [9, 6, 7, 7], "style": "storage"}]}],
     "things": T, "objectives": [{"text": "Find the way up to the Loft, across to Hall B's balcony, and down to the Vault."}], "triggers": []}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'games', 'havenot', 'levels', 'stack.json')
json.dump(L, open(out, 'w'), indent=1)
for nm, g in (('storey 1', g1), ('storey 0', g0), ('storey -1', gb)):
    print(nm)
    print('\n'.join(rows(g)))
