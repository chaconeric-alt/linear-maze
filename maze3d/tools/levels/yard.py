#!/usr/bin/env python3
"""yard.py - writes games/havenot/levels/yard.json: THE YARD, the test level for factions and patrols (SPEC.md 5.20).

A yard over three rooms. Its own factions: the yard's guards are at war with vermin, and nobody else; vermin are at war
with nobody but the guards; neutrals with nobody at all. The game's robots and monsters are at war with the player, as
everywhere.
  - the Yard: a guard robot walks a beat round it (a patrol, pausing at each corner); a second guard stands still.
  - the Pen (door shut): a vermin roach, and a plain roach (a monster: at war with the player and their allies).
  - the Gallery (door shut): where the player starts, beside a neutral robot.
  - the Side Room (door shut): an allied robot (faction "player"), which fights the player's enemies.
Its own test moves the roaches into sight to start the fights.

    python3 tools/levels/yard.py
"""
import levelkit as lk

W, H = 16, 13
g = lk.grid(W, H)
lk.carve(g, 1, 1, 14, 5)                           # the Yard
lk.carve(g, 1, 7, 5, 5)                            # the Pen
lk.carve(g, 7, 7, 4, 5)                            # the Gallery
lk.carve(g, 12, 7, 3, 5)                           # the Side Room
for (x, y) in ((3, 6), (8, 6), (13, 6)):
    g[y][x] = '+'

T = [{"start": True, "face": "n", "at": [8, 10]},
     {"sign": "THE YARD\nwho fights whom", "face": "s", "color": [0.4, 0.9, 1.0], "size": 56, "y": 3.0, "at": [7, 1]},
     {"actor": "eggbot", "at": [3, 2], "faction": "guards", "tag": "guard",
      "patrol": {"route": [[3, 2], [7, 2], [7, 4], [3, 4]], "pause": 0.5, "give_up": 3}},
     {"actor": "eggbot", "at": [14, 1], "faction": "guards", "still": True, "tag": "guard2"},
     {"actor": "roach", "at": [3, 9], "faction": "vermin", "tag": "vermin", "perch": "floor"},
     {"actor": "roach", "at": [2, 10], "tag": "enemy", "perch": "floor"},
     {"actor": "monoid", "at": [9, 8], "faction": "neutral", "lounge": "none", "tag": "neutral"},
     {"actor": "eggbot", "at": [13, 8], "faction": "player", "tag": "ally"},
     {"item": "health", "at": [7, 10]}]
L = {"id": "yard", "name": "The Yard (factions and patrols)", "kit": "omni", "style": "corridor",
     "intro": "Guards on their beat, vermin in the pen, and a friend in the side room.", "ambient_energy": 0.75,
     "legend": {"+": {"door": "door_split"}}, "map": lk.rows(g),
     "rooms": [{"name": "The Yard", "rect": [1, 1, 14, 5], "style": "corridor"},
               {"name": "The Pen", "rect": [1, 7, 5, 5], "style": "storage"},
               {"name": "The Gallery", "rect": [7, 7, 4, 5], "style": "lab"},
               {"name": "The Side Room", "rect": [12, 7, 3, 5], "style": "lab"}],
     "factions": {"guards": {"name": "Yard guards", "hostile": ["vermin"]},
                  "vermin": {"name": "Vermin", "hostile": []},
                  "neutral": {"name": "Neutral", "hostile": []}},
     "things": T, "objectives": [{"text": "Watch who fights whom."}], "triggers": []}
lk.write(L)
print('\n'.join(lk.rows(g)))
