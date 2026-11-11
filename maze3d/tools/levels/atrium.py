#!/usr/bin/env python3
"""atrium.py - writes games/havenot/levels/atrium.json: the level that shows what the level format can now do.
A room with a thin wall and a window, opening straight into an eight-sided hall three storeys high with a balcony round
it at the first storey, another along one side at the second, ramps between them, and windows through to a control room."""
import json, os
W, Hh = 25, 17
g = [['#'] * W for _ in range(Hh)]
def carve(x0, y0, w, h):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            g[y][x] = '.'
carve(1, 6, 5, 5)                                    # the annexe
AX, AY, AN = 6, 2, 13                                # the atrium's box
carve(AX, AY, AN, AN)
diags = []
for (cx, cy, name, sx, sy) in ((AX, AY, 'nw', 1, 1), (AX + AN - 1, AY, 'ne', -1, 1), (AX, AY + AN - 1, 'sw', 1, -1), (AX + AN - 1, AY + AN - 1, 'se', -1, -1)):
    for i in range(4):
        for j in range(4):
            if i + j < 3:
                g[cy + sy * j][cx + sx * i] = '#'
            elif i + j == 3:
                diags.append({"at": [cx + sx * i, cy + sy * j], "corner": name})
carve(20, 6, 4, 5)                                   # the control room
g[8][19] = '+'
windows = [[19, 7], [19, 9]]
is_diag = {tuple(d['at']) for d in diags}
ring = []
for y in range(AY, AY + AN):
    for x in range(AX, AX + AN):
        if g[y][x] != '.':
            continue
        edge = (x, y) in is_diag or any(g[y + dy][x + dx] in '#+' or (x + dx, y + dy) in is_diag for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))     # cut corners only touch at their points: take the cell inside each too
        if edge and not (x == AX and 6 <= y <= 10):
            ring.append((x, y))
ramp2 = [(18, 9), (18, 10)]                          # from the first balcony up to the second
decks = [{"at": [x, y], "level": 1} for (x, y) in ring if y <= 8]                      # first storey: the north side and round to the east
decks += [{"at": [x, y], "level": 2} for (x, y) in ring if y >= 11]                    # second storey: the south side
ramps = [{"at": [12, 4], "dir": "n", "from": 0, "to": 2}, {"at": [12, 3], "dir": "n", "from": 2, "to": 4},
         {"at": [18, 9], "dir": "s", "from": 4, "to": 6}, {"at": [18, 10], "dir": "s", "from": 6, "to": 8}]
walls = [{"at": [5, 6], "side": "e", "kind": "wall"}, {"at": [5, 7], "side": "e", "kind": "window"}, {"at": [5, 8], "side": "e", "kind": "window"}, {"at": [5, 9], "side": "e", "kind": "wall"}]
T = [{"start": True, "face": "e", "at": [2, 8]},
     {"sign": "THE ATRIUM\nlook up", "face": "s", "color": [0.4, 0.9, 1.0], "size": 56, "y": 3.0, "at": [3, 6]},
     {"item": "scattergun", "at": [2, 9]}, {"item": "shells", "at": [3, 9]}, {"item": "plasma", "at": [4, 6]}, {"item": "cells", "at": [4, 7]}, {"item": "health", "at": [1, 10]},
     {"actor": "plodder", "at": [12, 10], "face": "w"},
     {"actor": "drone", "at": [10, 8]}, {"actor": "drone", "at": [14, 6]},
     {"actor": "roach", "at": [15, 12], "perch": "wall"}, {"actor": "roach", "at": [9, 12], "perch": "floor"},
     {"actor": "monoid", "at": [9, 2], "level": 1, "lounge": "sit"}, {"actor": "monoid", "at": [13, 14], "level": 2, "lounge": "lean"},
     {"actor": "eggbot", "at": [14, 2], "level": 1, "lounge": "none"},
     {"item": "crystal", "at": [10, 14], "level": 2}, {"item": "statuette", "at": [14, 14], "level": 2}, {"item": "health", "at": [18, 7], "level": 1}, {"item": "cells", "at": [10, 2], "level": 1},
     {"prop": "crate", "at": [16, 8], "blocks": False}, {"prop": "barrel", "at": [8, 6], "blocks": False},
     {"actor": "custodian", "at": [22, 7], "face": "w"},
     {"prop": "terminal_desk", "at": [22, 10], "blocks": False, "turn": 180},
     {"prop": "holo_table", "at": [22, 8], "blocks": False, "use": {"type": "effects", "prompt": "Shut the place down", "effects": [{"type": "end", "title": "Lights out", "text": "Three storeys, all of them quiet."}]}}]
L = {"id": "atrium", "name": "The Atrium (shapes, storeys, ramps, balconies, thin walls, windows)", "kit": "omni", "style": "corridor",
     "intro": "A window on to a hall three storeys high. Things you have seen show red on the map.", "ambient_energy": 0.7,
     "legend": {"+": {"door": "door_split"}}, "map": [''.join(r) for r in g],
     "rooms": [{"name": "Annexe", "rect": [1, 6, 5, 5], "style": "white_hall", "height": 1}, {"name": "The Atrium", "rect": [AX, AY, AN, AN], "style": "lab", "height": 3},
               {"name": "Control", "rect": [20, 6, 4, 5], "style": "bunker_ops", "height": 1}],
     "diags": diags, "decks": decks, "ramps": ramps, "windows": windows, "walls": walls,
     "things": T, "objectives": [{"text": "Cross the Atrium to Control. The balconies have things worth the climb."}], "triggers": []}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'games', 'havenot', 'levels', 'atrium.json')
json.dump(L, open(out, 'w'), indent=1)
print('\n'.join(L['map']))
