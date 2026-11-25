#!/usr/bin/env python3
"""plant.py - writes games/havenot/levels/plant.json: THE PUMPING STATION, the test level for a level's systems (the
generation review, 25 Nov: "treat infrastructure as a gameplay mechanic"; SPEC 5.25).

Three systems run through it: main power (it starts off: the emergency lights only), security (normal) and the
ventilation (running). Storey 0: a corridor along the middle, the Generator Hall (its panel starts and stops the
generator) and the Security Office (its panel raises the alert, stands down, or shuts security off) north of it; south
of it the Lab, behind a door that needs power, with a console that needs power, and the Vent Room, whose gas vent only
breathes while the air runs and whose laser fires only while security is on; a robot in a station that needs power;
a fabricator that makes a roach while there is power; and in the east a lift, which needs power, up to the Loft.

The level has no monsters of its own: its test (plant_test.gd) makes and watches each one it needs.

    python3 tools/levels/plant.py
"""
import levelkit as lk

W, H = 17, 12
g0 = lk.grid(W, H)
lk.carve(g0, 1, 1, 5, 4)                           # the Generator Hall
lk.carve(g0, 8, 1, 5, 4)                           # the Security Office
lk.carve(g0, 1, 6, 15, 1)                          # the corridor
lk.carve(g0, 1, 8, 5, 3)                           # the Lab
lk.carve(g0, 8, 8, 5, 3)                           # the Vent Room
lk.carve(g0, 14, 7, 2, 3)                          # the lift bay
g0[5][3] = '+'                                     # the Generator Hall's door
g0[5][10] = '+'                                    # the Security Office's door
g0[7][3] = '='                                     # the Lab's door: it needs power
g0[7][10] = '+'                                    # the Vent Room's door
g1 = lk.grid(W, H)
lk.carve(g1, 13, 7, 3, 3)                          # the Loft, over the lift bay

POWER = {"power": "on"}
T = lk.Things()
T.add({"start": True, "face": "e", "at": [2, 6]})
T.sign("THE PUMPING STATION\nwhat runs through it", [7, 6], "n", size=44, y=3.0)
T.add({"prop": "terminal_desk", "at": [3, 2], "face": "s", "blocks": False, "screen": "GENERATOR", "tag": "gen_panel",
       "use": {"type": "terminal", "prompt": "Use the generator panel", "kicker": "Pumping Station", "title": "GENERATOR",
               "text": "Main power: {sys:power}\nVentilation: {sys:air}",
               "options": [{"label": "Start the generator", "effects": [{"type": "system", "system": "power", "to": "on"}],
                            "result": "The generator coughs, catches, and runs."},
                           {"label": "Shut the generator down", "effects": [{"type": "system", "system": "power", "to": "off"}],
                            "result": "It winds down to nothing."},
                           {"label": "Run the diagnostics", "needs": POWER, "result": "ALL PUMPS NOMINAL. NO PUMPS PRESENT."},
                           {"label": "Switch the ventilation", "effects": [{"type": "system", "system": "air", "next": True}],
                            "result": "The fans change their note."}]}})
T.add({"prop": "terminal_desk", "at": [10, 2], "face": "s", "blocks": False, "screen": "SECURITY", "tag": "sec_panel",
       "use": {"type": "terminal", "prompt": "Use the security panel", "kicker": "Pumping Station", "title": "SECURITY",
               "text": "Security: {sys:security}",
               "options": [{"label": "Raise the alert", "effects": [{"type": "system", "system": "security", "to": "alert"}]},
                           {"label": "Stand down", "effects": [{"type": "system", "system": "security", "to": "normal"}]},
                           {"label": "Shut security down", "effects": [{"type": "system", "system": "security", "to": "off"}]}]}})
T.add({"prop": "terminal_desk", "at": [3, 9], "face": "n", "blocks": False, "screen": "LAB", "tag": "lab_console", "needs": POWER,
       "use": {"type": "terminal", "prompt": "Use the lab console", "title": "LABORATORY", "text": "Main power: {sys:power}.",
               "options": [{"label": "Log off", "close": True}]}})
T.add({"trap": "vent", "at": [9, 9], "damage": 4, "period": 2.0, "on": 1.2, "tag": "vent", "needs": {"air": "on"}})
T.add({"trap": "laser", "at": [11, 9], "damage": 6, "tag": "laser", "needs": {"security": ["normal", "alert"]}})
T.add({"station": "rb_station_custodian", "actor": "custodian", "at": [13, 6], "face": "w", "tag": "station", "needs": POWER})
T.add({"maker": ["roach"], "at": [5, 10], "every": 3, "max": 1, "model": "fabricator", "tag": "fab", "needs": POWER})
T.add({"lift": [0, 1], "at": [14, 8], "home": 0, "tag": "lift", "needs": POWER})
L = {"id": "plant", "name": "The Pumping Station (a level's systems)", "kit": "omni", "style": "corridor",
     "intro": "Nothing here works until something does.", "ambient_energy": 0.8,
     "legend": {"+": {"door": "door_split"}, "=": {"door": "door_split", "needs": POWER, "tag": "lab_door"}},
     "map": lk.rows(g0),
     "rooms": [{"name": "The Generator Hall", "rect": [1, 1, 5, 4], "style": "storage"},
               {"name": "The Security Office", "rect": [8, 1, 5, 4], "style": "bunker_ops"},
               {"name": "The Lab", "rect": [1, 8, 5, 3], "style": "white_hall"},
               {"name": "The Vent Room", "rect": [8, 8, 5, 3], "style": "storage"}],
     "systems": {"power": {"start": "off"},
                 "security": {"start": "normal", "rooms": ["The Security Office", "The Vent Room"],
                              "do": {"alert": [{"type": "alarm"}]}},
                 "air": {"start": "on", "rooms": []}},
     "floors": [{"level": 1, "map": lk.rows(g1), "rooms": [{"name": "The Loft", "rect": [13, 7, 3, 3], "style": "storage"}]}],
     "things": T, "objectives": [{"text": "Get the place running."}], "triggers": []}
lk.write(L)
for nm, g in (('storey 1', g1), ('storey 0', g0)):
    print(nm)
    print('\n'.join(lk.rows(g)))
