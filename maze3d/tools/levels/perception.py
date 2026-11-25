#!/usr/bin/env python3
"""perception.py - writes games/havenot/levels/perception.json: THE LISTENING POST, the test level for what monsters
see and hear and where they go (the awareness review, 25 Nov: "Monster awareness: an assessment").

Storey 0: the Hall, ten cells long and two storeys tall (40 m), with a gallery along its north wall (railed, reached by
a ramp at its east end) and a short gallery along its south wall's west half that only a lift reaches. A crate in the
middle of the hall's floor blocks its cell. North of the hall, behind a door under the gallery, the Store.
Storey 1: the Office over the Store, whose door opens on to the north gallery: a doorway above the hall.

The level has no monsters of its own: its test (perception_test.gd) puts each one where it needs it.

    python3 tools/levels/perception.py
"""
import levelkit as lk

W, H = 13, 12
g0 = lk.grid(W, H)
lk.carve(g0, 1, 1, 4, 2)                           # the Store
lk.carve(g0, 1, 4, 10, 6)                          # the Hall
g0[3][2] = '+'                                     # the Store's door, under the north gallery
g1 = lk.grid(W, H)
lk.carve(g1, 1, 1, 4, 2)                           # the Office
g1[3][3] = '+'                                     # its door, on to the north gallery

T = lk.Things()
T.add({"start": True, "face": "w", "at": [8, 7]})
T.sign("THE LISTENING POST\nwho hears what", [6, 4], "s", size=48, y=6.4)
T.add({"prop": "crate", "at": [5, 7], "blocks": True})                    # a furnished cell
T.add({"lift": [0, 1], "at": [7, 9], "home": 0})                        # the only way to the south gallery
L = {"id": "perception", "name": "The Listening Post (what monsters see and hear)", "kit": "omni", "style": "corridor",
     "intro": "Somebody is always listening.", "ambient_energy": 0.8,
     "legend": {"+": {"door": "door_split"}}, "map": lk.rows(g0),
     "rooms": [{"name": "The Store", "rect": [1, 1, 4, 2], "style": "storage"},
               {"name": "The Hall", "rect": [1, 4, 10, 6], "style": "white_hall", "height": 2}],
     "decks": [{"rect": [1, 4, 10, 1], "level": 1}, {"rect": [1, 9, 6, 1], "level": 1}],
     "ramps": [{"at": [10, 6], "dir": "n", "from": 0, "to": 2}, {"at": [10, 5], "dir": "n", "from": 2, "to": 4}],
     "floors": [{"level": 1, "map": lk.rows(g1), "rooms": [{"name": "The Office", "rect": [1, 1, 4, 2], "style": "bunker_ops"}]}],
     "things": T, "objectives": [{"text": "Be heard."}], "triggers": []}
lk.write(L)
for nm, g in (('storey 1', g1), ('storey 0', g0)):
    print(nm)
    print('\n'.join(lk.rows(g)))
