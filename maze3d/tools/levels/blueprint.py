#!/usr/bin/env python3
"""blueprint.py - writes games/havenot/levels/blueprint.json: THE BLUEPRINT, the test level for the programme generator
(SPEC.md 6.3). It has no map: it is a written programme, laid out when it is entered, from the world's seed.

Four rooms on the spine, from the gate to the lift lobby: the gate, the mess, the lab, the lobby. Two wings:
  - the barracks, branching after the gate: a dormitory, its latrine (a door through to the dormitory) and a locker room;
  - the officers' wing, branching after the mess or the lab: an office, the officer's quarters next to it (the red
    card in one of the two), and the armoury, locked red, with a rocket launcher in it.
The seed picks the sizes, which side each wing goes, which side of its corridor each room, the gaps, where the
officers' wing branches, whether there is a locker room, which room has the card and whether the mess has a custodian
or a roach in it.
A few roaches, a custodian and an eggbot (which shoots) to fight, a crystal or two, a health pack, and a way out in the lobby. Its own test
(blueprint_test.gd) checks the layout keeps the programme, then plays it.

    python3 tools/levels/blueprint.py
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
                      "effects": [{"type": "end", "title": "Out of the Blueprint", "text": "Every room where the programme put it."}]}}

programme = {
    "spine": {"gap": [1, 3]},
    "rooms": [
        room("gate", "Gate", "bunker_ops", [4, 3], [{"item": "health"}]),
        room("mess", "Mess Hall", "bunker_hall", [[5, 6], [4, 5]], [{"actor": ["custodian", "roach"]}]),
        room("lab", "Lab", "lab", [[4, 5], [3, 4]], [{"item": "crystal"}, {"actor": "eggbot"}]),
        room("lobby", "Lift Lobby", "machine", [3, 5], [exit_table]),
    ],
    "wings": [
        {"id": "barracks", "name": "Barracks Wing", "after": "gate", "side": "any", "rooms": [
            room("dorm", "Dormitory", "barracks", [[5, 6], [3, 4]], [{"actor": "roach", "count": 2}, {"item": "crystal"}]),
            room("latrine", "Latrine", "storage", [2, 2], door_to="dorm"),
            room("lockers", "Locker Room", "storage", [[3, 4], [2, 3]], chance=0.6),
        ]},
        {"id": "officers", "name": "Officers' Wing", "after": ["mess", "lab"], "side": "any", "rooms": [
            room("office", "Office", "bunker_ops", [[3, 4], 3]),
            room("quarters", "Officer's Quarters", "barracks", [[3, 4], 3], next_to="office"),
            room("armoury", "Armoury", "vault", [3, 3], [{"item": "launcher"}, {"item": "rockets"}]),
        ]},
    ],
    "locks": [{"room": "armoury", "color": "red", "card": ["office", "quarters"]}],
}

L = {"id": "blueprint", "name": "The Blueprint (laid out from a programme)", "kit": "omni", "style": "corridor",
     "intro": "Laid out from a written programme. Find the red card for the armoury.", "ambient_energy": 0.8,
     "legend": {}, "programme": programme, "things": [],
     "objectives": [{"text": "Find the RED card.", "done": "key_red"}, {"text": "Open the armoury, then leave by the lobby."}],
     "triggers": []}
lk.write(L)
print("written: blueprint (a programme of %d rooms)" % (len(programme["rooms"]) + sum(len(w["rooms"]) for w in programme["wings"])))
