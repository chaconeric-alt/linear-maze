#!/usr/bin/env python3
"""collections_office.py - writes games/havenot/levels/collections.json: THE COLLECTIONS OFFICE, the test level for danger zones
(SPEC.md 4.13). Like the Blueprint it has no map: it is a written programme, laid out from the world's seed as it is
entered.

On the spine, from the way in: the foyer, the trap hall (one of each of the six strong traps out of the way through:
a crusher, a flame jet, a sweeping laser, a mine, a spore pod and a floor that gives way), the records room and the
lobby with the way out. One ordinary wing (a clerk's office and a filing room) and one danger wing, "vault", written
"danger": "collections": three rooms of repossessed goods behind a door sealed by the Collections Division, opened at
the notice beside it. The danger set (defs/danger.json) puts in its monsters, its traps, its loot, the keeper in the
deepest room with the prize and the alarm; outside the door, the notice, the warning, a red light and a dead scavenger
(ProgrammeDanger). Nothing the level needs is in the vault: the way out is in the lobby.
Its own test (collections_test.gd) checks the zone's rules here and over twenty worlds, the rooms generator's zones,
then plays it: the seal broken, the door sealing behind, the alarm calling one more, the keeper killed, the traps.

    python3 tools/levels/collections_office.py   (not collections.py: that name is Python's own module)
"""
import levelkit as lk


def room(id, name, style, size, things=(), **more):
    r = {"id": id, "name": name, "style": style, "size": size}
    if things:
        r["things"] = list(things)
    r.update(more)
    return r


exit_table = {"prop": "holo_table", "blocks": False, "tag": "way_out",
              "use": {"type": "effects", "prompt": "Leave the Collections Office",
                      "effects": [{"type": "end", "title": "Out of the Collections Office",
                                   "text": "Whatever was repossessed in there, some of it is yours now."}]}}

TRAPS = [{"trap": "crusher", "tag": "t_crusher"}, {"trap": "flame", "tag": "t_flame"}, {"trap": "sweep", "tag": "t_sweep"},
         {"trap": "mine", "tag": "t_mine"}, {"trap": "spores", "tag": "t_spores"}, {"trap": "collapse", "tag": "t_collapse"}]

programme = {
    "spine": {"gap": [1, 2]},
    "rooms": [
        room("foyer", "Foyer", "bunker_ops", [4, 4], [{"item": "health"}], purpose="lift_lobby"),
        room("traps", "Trap Hall", "machine", [[7, 8], 5], TRAPS),
        room("records", "Records Room", "storage", [[4, 5], 4], [{"actor": "roach", "count": 2}], purpose="archive"),
        room("lobby", "Lobby", "machine", [3, 5], [exit_table], purpose="lift_lobby"),
    ],
    "wings": [
        {"id": "clerks", "name": "Clerks' Wing", "after": "foyer", "side": "any", "rooms": [
            room("office", "Clerk's Office", "bunker_ops", [[3, 4], 3], [{"item": "crystal"}], purpose="office"),
            room("filing", "Filing Room", "storage", [[3, 4], 3], next_to="office", purpose="archive"),
        ]},
        {"id": "vault", "name": "Repossessed Property", "after": "records", "side": "any", "danger": "collections", "rooms": [
            room("seized", "Seized Goods", "vault", [5, 5], purpose="quartermaster"),
            room("counting", "Counting Room", "vault", [5, 5]),
            room("strongroom", "Strongroom", "vault", [[5, 6], 5]),
        ]},
    ],
}

L = {"id": "collections", "name": "The Collections Office (a danger zone)", "kit": "omni", "style": "corridor",
     "intro": "The Collections Office. Something in the vault is still collecting.", "ambient_energy": 0.7,
     "legend": {}, "programme": programme, "things": [],
     "objectives": [{"text": "Leave by the lobby. The vault is optional, and dangerous."}],
     "triggers": []}
lk.write(L)
print("written: collections (a programme of %d rooms, one danger wing)" % (len(programme["rooms"]) + sum(len(w["rooms"]) for w in programme["wings"])))
