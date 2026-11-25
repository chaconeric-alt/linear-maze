extends RefCounted
## ProgrammeDanger - a wing written with "danger": "<set>" is a danger zone (SPEC.md 4.13 and 6.3): a dead end behind
## a sealed door, three times as dangerous and three times as rich as the rest, that the player chooses to open. Its
## set is one of the game's danger sets (defs "danger": what lives there, its keeper, its traps, its alarm, its loot,
## its prize, its words).
## Before the fill (expand): the wing's door gets a flag lock, "<wing>_open", and each of its rooms the set's monsters
## (about three), traps (about three, the set's strong kinds, sparing its own side) and treasure (three); the deepest
## room the keeper ("<wing>_keeper"), the prize and the maker (the alarm: one more monster every 90 s while the player
## is inside). The fill places them as it places any room's things.
## After it (finish): outside the door, the notice that breaks the seal (a wall terminal), the warning on the wall, a
## red light and a dead scavenger with a note; the zone (LevelZones: the wing's corridor past the door and its rooms,
## lit low in the set's colour); and the triggers: the door seals behind the player who goes in, and opens again,
## with "<wing>_clear" set (the zone safe for good), when the keeper dies.
## The wing must be a dead end: nothing the level needs to be finished may be in it, and the proof finishes the level
## without going in (the seal is broken by an option anyone may take, so the proof walks in as well).
class_name ProgrammeDanger

const ROOM_SHARE := 0.55          # at most this share of a room's floor gets the set's things


## Each danger wing's lock and its rooms' things: the plan's rooms (its own copies) get the things; the programme
## comes back with the locks added. Draws from the plan's generator, after the plan's own choices.
static func expand(prog: Dictionary, plan: ProgrammePlan) -> Dictionary:
	var out: Dictionary = prog.duplicate()
	var locks: Array = prog.get("locks", []).duplicate()
	for w in plan.wings:
		var ds := ProgrammeDanger.set_of(w)
		if ds.is_empty():
			continue
		var zid: String = w["id"]
		locks.append({"wing": zid, "flag": zid + "_open", "need": str(ds.get("need", "")), "tag": zid + "_door"})
		var last := ProgrammeDanger.deepest(w)
		var rng := plan.stream("danger " + zid)       # its own numbers (Dice): a zone that changes moves nothing else
		for rid in w["west"] + w["east"]:
			var r: Dictionary = plan.rooms[rid]
			var room := int(r["w"]) * int(r["h"])
			var room_for: int = int(room * ROOM_SHARE) - r.get("things", []).size()
			var add := ProgrammeDanger._things(ds, rng, zid, rid == last)
			r["things"] = r.get("things", []) + add.slice(0, maxi(0, room_for))
	out["locks"] = locks
	return out


## The danger set a wing names, or {}.
static func set_of(w: Dictionary) -> Dictionary:
	var id := str(w.get("danger", ""))
	if id == "":
		return {}
	var ds: Dictionary = LM.defs.get("danger", {}).get(id, {})
	if ds.is_empty():
		push_warning("wing '%s': there is no danger set '%s'" % [w.get("id", ""), id])
	return ds


## The wing's deepest room: the last of its longer side (the furthest from the spine).
static func deepest(w: Dictionary) -> String:
	var side: Array = w["west"] if w["west"].size() >= w["east"].size() else w["east"]
	return str(side.back()) if not side.is_empty() else ""


## What one room gets, the most needed first (a small room keeps the head of the list): in the deepest, the keeper,
## the maker and the prize; then monsters, traps and treasure.
static func _things(ds: Dictionary, rng: RandomNumberGenerator, zid: String, deepest_room: bool) -> Array:
	var out: Array = []
	if deepest_room:
		var kp: Dictionary = ds.get("keeper", {})
		if kp.has("actor"):
			out.append({"actor": kp["actor"], "tag": zid + "_keeper", "hp_mul": float(kp.get("hp_mul", 1.0))})
		out.append(ProgrammeDanger.maker(ds, zid))
		out += ProgrammeDanger.extras(ds, zid)
		var prizes: Array = ds.get("prizes", [])
		if not prizes.is_empty():
			var pz: Variant = prizes[rng.randi() % prizes.size()]
			for it in (pz if pz is Array else [pz]):
				out.append({"item": it})
	for k in int(ds.get("per_room", 3)):
		out.append({"actor": ProgrammeDanger.weighted(ds.get("monsters", []), rng)})
	for k in int(ds.get("traps_per_room", 3)):
		var t := {"trap": ProgrammeDanger.weighted(ds.get("traps", []), rng)}
		if ds.has("trap_ignore") and t["trap"] != "collapse":
			t["ignore"] = ds["trap_ignore"]
		out.append(t)
	for k in int(ds.get("treasure", 3)):
		out.append({"item": ProgrammeDanger.weighted(ds.get("loot", []), rng)})
	return out


## The zone's maker (engine/maker.gd): the set's monsters, one more every "every" seconds while the player is inside
## once the seal is broken, stopped for good by the keeper's death; and between visits it makes again what was killed,
## faster while the keeper lives (Restock).
static func maker(ds: Dictionary, zid: String) -> Dictionary:
	var mk: Dictionary = ds.get("maker", {})
	var kinds: Array = []
	for m in ds.get("monsters", []):
		kinds.append(m[0] if m is Array else m)
	var e := {"maker": kinds, "every": float(mk.get("every", 90.0)), "zone": zid, "when": zid + "_open", "off": zid + "_clear",
		"max": int(mk.get("max", 4)),
		"restock": {"every": [1, 2], "max": 6, "makes": kinds, "off": zid + "_clear"}}
	if ds.get("keeper", {}).has("actor"):
		e["restock"]["faster"] = {"while": ds["keeper"]["actor"], "times": 2}
	for k in ["model", "say"]:
		if mk.has(k):
			e[k] = mk[k]
	return e


## The set's "extra" things, put in with the keeper: a list of thing entries (a Garnisher dispenser is a maker of
## its own). A maker among them works as the zone's does: only while the player is in the zone, once the seal is
## broken, until the keeper dies.
static func extras(ds: Dictionary, zid: String) -> Array:
	var out: Array = []
	for x in ds.get("extra", []):
		var e: Dictionary = x.duplicate(true)
		if e.has("maker"):
			e["zone"] = zid
			e["when"] = zid + "_open"
			e["off"] = zid + "_clear"
		out.append(e)
	return out


## One of a weighted list ([[id, weight], ...] or plain ids).
static func weighted(list: Array, rng: RandomNumberGenerator) -> String:
	var total := 0.0
	for it in list:
		total += float(it[1]) if it is Array else 1.0
	var r := rng.randf() * total
	for it in list:
		r -= float(it[1]) if it is Array else 1.0
		if r <= 0.0:
			return str(it[0] if it is Array else it)
	return str(list.back()[0] if list.back() is Array else list.back()) if not list.is_empty() else ""


## After the fill: each danger wing's threshold, its zone and its triggers, into the level `out` (one floor's: its
## things stand on `storey`).
static func finish(out: Dictionary, lay: ProgrammeLayout, storey: int) -> void:
	for w in lay.plan.wings:
		var ds := ProgrammeDanger.set_of(w)
		if ds.is_empty():
			continue
		var zid: String = w["id"]
		var dy := -1 if w["side"] == "n" else 1
		var door: Vector2i = lay.junctions[zid]
		var things: Array = ProgrammeDanger._threshold(ds, lay, zid, door, dy)
		for t in things:
			if storey != 0:
				t["level"] = storey
		out["things"] = out.get("things", []) + things
		var rects: Array = []
		for rc in lay.corridors:
			if (rc as Rect2i).has_point(door):            # the wing's corridor, less the door's own cell
				var cor := Rect2i(rc.position.x, rc.position.y + (1 if dy > 0 else 0), rc.size.x, rc.size.y - 1)
				rects.append([cor.position.x, cor.position.y, cor.size.x, cor.size.y])
		for rid in w["west"] + w["east"]:
			var r: Rect2i = lay.rects[rid]
			rects.append([r.position.x, r.position.y, r.size.x, r.size.y])
		var zone := {"id": zid, "name": str(ds.get("name", zid)), "rects": rects, "level": storey,
			"light": float(ds.get("light", 0.5)), "color": ds.get("color", [1.0, 0.15, 0.08]), "safe": zid + "_clear"}
		out["zones"] = out.get("zones", []) + [zone]
		out["triggers"] = out.get("triggers", []) + ProgrammeDanger.triggers(ds, zid)


## What stands outside the door, on the corridor it opens off: the notice whose option breaks the seal, on the wall
## to one side of the door; the warning lettered on the wall to the other; a red light; a dead scavenger with a note.
static func _threshold(ds: Dictionary, lay: ProgrammeLayout, zid: String, door: Vector2i, dy: int) -> Array:
	return ProgrammeDanger.threshold(ds, zid, Vector2i(door.x, door.y - dy), 0 if dy < 0 else 2, lay.open_at)


## The threshold's things, outside a door into a zone (`into`: the direction from `outside` through the door; `open`:
## whether a cell is floor). Shared by both generators.
static func threshold(ds: Dictionary, zid: String, outside: Vector2i, into: int, open: Callable) -> Array:
	var spots := ProgrammeDanger.walls_by(outside, into, open)
	var col: Array = ds.get("color", [1.0, 0.15, 0.08])
	var opts := [{"label": str(ds.get("open", "Break the seal")), "once": true, "close": true, "unless": zid + "_open",
			"effects": [{"type": "flag", "name": zid + "_open"}, {"type": "message", "text": str(ds.get("opened", "")), "kind": "warn"}]},
		{"label": str(ds.get("leave", "Leave it sealed")), "close": true}]
	var back: Vector2i = -GenContext.DIRS[into]
	var aside: Vector2i = GenContext.DIRS[(into + 1) % 4]
	return [
		{"prop": "terminal_wall", "at": [spots[0][0].x, spots[0][0].y], "face": spots[0][1], "tag": zid + "_notice",
			"use": {"type": "terminal", "prompt": "Read the notice", "kicker": str(ds.get("kicker", "")),
				"title": str(ds.get("title", "")), "text": str(ds.get("notice", "")), "options": opts}},
		{"sign": str(ds.get("sign", "DANGER")), "at": [spots[1][0].x, spots[1][0].y], "face": spots[1][1], "color": col, "size": 110},
		{"light": {"color": col, "energy": 1.6, "range": 7.0}, "at": [outside.x, outside.y], "y": 3.2},
		{"prop": "dead_scavenger", "at": [outside.x, outside.y], "face": GenContext.NAMES[(into + 2) % 4], "blocks": false,
			"offset": [back.x * 0.6 + aside.x * 1.1, 0, back.y * 0.6 + aside.y * 1.1],
			"use": {"type": "read", "prompt": "Search the body", "title": "A dead scavenger", "text": str(ds.get("note", ""))}},
	]


## Two places on the walls by a door to hang a notice and a warning, [cell, the way it faces]: the door's own wall
## beside it, seen from the corridor, or (in a corridor one cell wide) the corridor's walls just outside it.
static func walls_by(outside: Vector2i, into: int, open: Callable) -> Array:
	var out: Array = []
	for k in [1, 3]:
		var side: int = (into + k) % 4
		var c: Vector2i = outside + GenContext.DIRS[side]
		if open.call(c) and not open.call(c + GenContext.DIRS[into]):
			out.append([c, GenContext.NAMES[(into + 2) % 4]])            # beside the door, on its wall
		elif not open.call(c):
			out.append([outside, GenContext.NAMES[(side + 2) % 4]])      # on the corridor's wall, facing across it
	while out.size() < 2:
		out.append([outside, GenContext.NAMES[(into + 2) % 4]])
	return out


## Going in seals the door behind (if the set seals); the keeper's death opens it again for good and makes it safe.
static func triggers(ds: Dictionary, zid: String) -> Array:
	var out: Array = []
	if ds.get("seal", true):
		out.append({"on": {"type": "zone", "name": zid}, "once": true, "unless": zid + "_clear",
			"do": [{"type": "seal", "tag": zid + "_door"}, {"type": "message", "text": str(ds.get("enter", "")), "kind": "warn"}]})
	out.append({"on": {"type": "clear", "tag": zid + "_keeper"}, "once": true,
		"do": [{"type": "flag", "name": zid + "_clear"}, {"type": "unlock", "tag": zid + "_door"},
			{"type": "message", "text": str(ds.get("clear", "")), "kind": "good"}]})
	return out
