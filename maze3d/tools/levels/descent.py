#!/usr/bin/env python3
"""descent.py - writes games/havenot/levels/descent_1.json and descent_2.json: THE DESCENT, a grey test installation of
two levels (defs/installations.json), built from today's kits to prove travel between levels before the Warlord's
Bunker is built on it.

Each level is a hall over two rooms. Level 1 has two ways in: the front gate (its start) and a service shaft (a named
way in, "shaft"). Two ways down, two ways up: a lift out of the level (ridden past its one stop) and a stairwell (a
console used). Each way arrives at a named way in of the other level ("lift", "stairs"). Level 1 has the way out.
A crystal and a roach on each level, so the test can take, kill, leave and come back.

    python3 tools/levels/descent.py
"""
import levelkit as lk

W, H = 13, 11


def grid():
    g = lk.grid(W, H)
    lk.carve(g, 1, 1, 11, 3)                       # the hall
    lk.carve(g, 1, 5, 5, 5)                        # west room
    lk.carve(g, 7, 5, 5, 5)                        # east room
    for (x, y) in ((3, 4), (9, 4), (6, 7)):          # hall to each room, and between the rooms
        g[y][x] = '+'
    return g


def rooms(hall, west, east):
    return [{"name": hall, "rect": [1, 1, 11, 3], "style": "corridor"},
            {"name": west, "rect": [1, 5, 5, 5], "style": "storage"},
            {"name": east, "rect": [7, 5, 5, 5], "style": "lab"}]


def stairs(level, arrive, label):
    return {"prop": "bk_console", "at": [11, 5], "face": "w", "blocks": False,
            "use": {"type": "effects", "prompt": label, "sound": "servo",
                    "effects": [{"type": "travel", "level": level, "arrive": arrive}]}}


def level(n, name, intro, things):
    g = grid()
    return {"id": "descent_%d" % n, "name": name, "kit": "omni", "style": "corridor", "intro": intro,
            "ambient_energy": 0.75, "legend": {"+": {"door": "door_split"}}, "map": lk.rows(g),
            "rooms": rooms(*(("Gate Hall", "Shaft Room", "Lift Room") if n == 1 else ("Lower Hall", "Store", "Lift Room"))),
            "things": things, "objectives": [{"text": "Go down to Level 2 and back up; leave by the gate."}], "triggers": []}


one = [{"start": True, "face": "e", "at": [1, 2]},
       {"start": "shaft", "face": "n", "at": [2, 8]},
       {"start": "lift", "face": "w", "at": [10, 8]},
       {"start": "stairs", "face": "w", "at": [9, 6]},
       {"sign": "THE DESCENT\nlevel 1", "face": "s", "color": [0.4, 0.9, 1.0], "size": 56, "y": 3.0, "at": [4, 1]},
       {"sign": "SERVICE SHAFT", "face": "n", "color": [1.0, 0.8, 0.3], "size": 40, "y": 2.8, "at": [2, 9]},
       {"lift": [0], "at": [10, 8], "travel": {"level": "descent_2", "arrive": "lift", "way": "down", "text": "Down to Level 2."}},
       {"sign": "LIFT DOWN", "face": "n", "color": [0.4, 1.0, 0.6], "size": 48, "y": 3.0, "at": [10, 9]},
       stairs("descent_2", "stairs", "Take the stairs down"),
       {"sign": "STAIRS", "face": "w", "color": [1.0, 0.8, 0.3], "size": 40, "y": 2.8, "at": [11, 6]},
       {"item": "crystal", "at": [3, 6]}, {"actor": "roach", "at": [4, 8]},
       {"prop": "holo_table", "at": [10, 2], "blocks": False,
        "use": {"type": "effects", "prompt": "Leave the Descent",
                "effects": [{"type": "end", "title": "Out of the Descent", "text": "Down, up, and out again."}]}}]
two = [{"start": True, "face": "e", "at": [1, 2]},
       {"start": "lift", "face": "w", "at": [10, 8]},
       {"start": "stairs", "face": "w", "at": [9, 6]},
       {"sign": "THE DESCENT\nlevel 2", "face": "s", "color": [0.4, 0.9, 1.0], "size": 56, "y": 3.0, "at": [4, 1]},
       {"lift": [0], "at": [10, 8], "travel": {"level": "descent_1", "arrive": "lift", "way": "up", "text": "Up to Level 1."}},
       {"sign": "LIFT UP", "face": "n", "color": [0.4, 1.0, 0.6], "size": 48, "y": 3.0, "at": [10, 9]},
       stairs("descent_1", "stairs", "Take the stairs up"),
       {"sign": "STAIRS", "face": "w", "color": [1.0, 0.8, 0.3], "size": 40, "y": 2.8, "at": [11, 6]},
       {"item": "crystal", "at": [3, 6]}, {"item": "health", "at": [2, 8]}, {"actor": "roach", "at": [4, 8]}]

for n, name, intro, T in ((1, "The Descent, Level 1", "A grey place with a lift and a stair down.", one),
                          (2, "The Descent, Level 2", "The lower level. The way out is up.", two)):
    lk.write(level(n, name, intro, T))
    print("wrote descent_%d" % n)
