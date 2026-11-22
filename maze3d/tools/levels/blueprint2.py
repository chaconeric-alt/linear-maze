#!/usr/bin/env python3
"""blueprint2.py - writes games/havenot/levels/blueprint2.json: THE BLUEPRINT, TWO FLOORS, the test level for a programme
of two floors (SPEC.md 6.3): one level, storeys 0 and -1, laid out from the world's seed as it is entered.

Upstairs (storey 0): the gate, the motor pool (a hall two storeys tall, sunk into the floor below: its doors open on
to galleries with ramps down to its floor), the mess, and the lift lobby, the bank; the barracks wing after the gate.
Downstairs (storey -1): the lift lobby under the one above (the bank's two lifts stop on both floors), a hall, the
atrium (two storeys tall, rising into the floor above), the lab, and the way out; a ward wing after the hall, and the
records wing after the atrium, with an office holding the red card and a store locked red.
Its own test (blueprint2_test.gd) checks the floors keep the programme, then plays it.

    python3 tools/levels/blueprint2.py
"""
import levelkit as lk

def room(id, name, style, size, things=(), **more):
    r = {"id": id, "name": name, "style": style, "size": size}
    if things:
        r["things"] = list(things)
    r.update(more)
    return r

exit_table = {"prop": "holo_table", "blocks": False,
              "use": {"type": "effects", "prompt": "Leave the Blueprint",
                      "effects": [{"type": "end", "title": "Out of the Blueprint", "text": "Down one floor and out."}]}}
LOBBY = [3, 5]

upstairs = {
    "spine": {"gap": [1, 3]},
    "bank": "lobby",
    "rooms": [
        room("gate", "Gate", "bunker_ops", [4, 3], [{"item": "health"}], purpose="gatehouse"),
        room("motor", "Motor Pool", "bunker_hall", [[6, 7], [5, 6]], [{"actor": "roach", "count": 2}], purpose="motor_pool", down=1),
        room("mess", "Mess Hall", "bunker_hall", [[5, 6], [4, 5]], [{"actor": "custodian"}], purpose="mess_hall"),
        room("lobby", "Lift Lobby", "machine", LOBBY, purpose="lift_lobby"),
    ],
    "wings": [
        {"id": "barracks", "name": "Barracks Wing", "after": "gate", "side": "any", "rooms": [
            room("dorm", "Dormitory", "barracks", [[5, 6], [4, 5]], [{"item": "crystal"}], purpose="bunk_room"),
            room("latrine", "Latrine", "storage", [2, 2], door_to="dorm", purpose="latrine"),
        ]},
    ],
}
downstairs = {
    "spine": {"gap": [1, 3]},
    "rooms": [
        room("lobby", "Lower Lift Lobby", "machine", LOBBY, purpose="lift_lobby", lifts={"count": 2}),
        room("hall", "Lower Hall", "bunker_hall", [[5, 6], 4], [{"actor": "eggbot"}]),
        room("atrium", "Atrium", "lab", [[6, 7], [5, 6]], [{"item": "crystal"}], purpose="archive", height=2),
        room("lab", "Lab", "lab", [[4, 5], [3, 4]], [{"actor": "roach"}], purpose="lab"),
        room("out", "Way Out", "machine", [3, 3], [exit_table]),
    ],
    "wings": [
        {"id": "wards", "name": "Ward Wing", "after": "hall", "side": "any", "rooms": [
            room("ward", "Ward", "lab", [[5, 6], [4, 5]], purpose="ward"),
            room("pharmacy", "Pharmacy", "storage", [3, 3], door_to="ward", purpose="pharmacy"),
        ]},
        {"id": "records", "name": "Records Wing", "after": "atrium", "side": "any", "rooms": [
            room("office", "Office", "bunker_ops", [[3, 4], 3], purpose="office"),
            room("store", "Store", "vault", [3, 3], [{"item": "launcher"}, {"item": "rockets"}], purpose="quartermaster"),
        ]},
    ],
    "locks": [{"room": "store", "color": "red", "card": "office"}],
}
programme = dict(upstairs, below=downstairs)

L = {"id": "blueprint2", "name": "The Blueprint, Two Floors (a programme of two storeys)", "kit": "omni", "style": "corridor",
     "intro": "Two floors from one programme. The lifts go down.", "ambient_energy": 0.8,
     "legend": {}, "programme": programme, "things": [],
     "objectives": [{"text": "Take the lift down."}, {"text": "Find the RED card, open the store, and leave by the way out.", "done": "key_red"}],
     "triggers": []}
lk.write(L)
print("written: blueprint2 (%d rooms upstairs, %d downstairs)" % (
    len(upstairs["rooms"]) + sum(len(w["rooms"]) for w in upstairs["wings"]),
    len(downstairs["rooms"]) + sum(len(w["rooms"]) for w in downstairs["wings"])))
