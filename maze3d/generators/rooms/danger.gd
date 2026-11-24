extends RefCounted
## The rooms generator's danger zone (SPEC.md 4.13, 6.2; params "danger": {"chance": 0.5, "sets": ["collections",
## "overgrowth"]}): with that chance a level gets one, in a room that can be shut off as a dead end: one storey, at
## most three ways in, each a threshold that can take a door, nothing in it the level needs (not the start, the card,
## a gun handed out, or the way out), and every other part of the level still reachable without it; the further from
## the start the likelier. Its ways in become doors sealed by a flag ("<zone>_open", legend "0"), broken at a notice
## on the corridor wall beside the one nearest the start; a warning is lettered on the other side, a red light and a dead scavenger with a note
## lie outside. Inside go the set's monsters (three for every twenty cells of floor), its keeper, its strong traps, its
## loot (three times the rest), a prize and the maker (the alarm). The zone is lit low in the set's colour and outlined
## on the map; going in seals the door until the keeper dies (ProgrammeDanger.triggers, shared with the programme).
## It is the last stage and draws numbers of its own, so a level without a zone is as it always was, and one with a
## zone differs from it only by the zone.

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES
const ZONE := "zone"
const LETTER := "0"


static func zone(ctx: GenContext) -> void:
	var dp: Dictionary = ctx.p.get("danger", {})
	var sets: Array = dp.get("sets", [])
	if sets.is_empty():
		return
	var rng := RandomNumberGenerator.new()
	rng.seed = ctx.seed_value * 7919 + 77777
	if rng.randf() >= float(dp.get("chance", 0.5)):
		return
	var picked := _pick_room(ctx, rng)
	if picked.is_empty():
		return
	var ds: Dictionary = LM.defs.get("danger", {}).get(str(sets[rng.randi() % sets.size()]), {})
	if ds.is_empty():
		return
	var cells: Array = picked["cells"]
	var ways: Array = picked["ways"]
	for w in ways:                                 # every way in is sealed; the notice is at the one nearest the start
		_door(ctx, w[0], ds)
	var outside: Vector2i = ways[0][0] - DIRS[ways[0][1]]
	ctx.things += ProgrammeDanger.threshold(ds, ZONE, outside, ways[0][1], func(c: Vector2i) -> bool: return ctx.g[c.y][c.x] != "#")
	ctx.things += _inside(ctx, ds, cells, rng, ways.map(func(w: Array) -> Vector2i: return w[0] + DIRS[w[1]]))
	ctx.zones.append({"id": ZONE, "name": str(ds.get("name", ZONE)), "rects": _runs(cells), "level": 0,
		"light": float(ds.get("light", 0.5)), "color": ds.get("color", [1.0, 0.15, 0.08]), "safe": ZONE + "_clear"})
	ctx.triggers += ProgrammeDanger.triggers(ds, ZONE)


## The rooms that may be a zone, the further from the start the likelier: {"unit", "cells", "ways": [[the cell of a
## way in, in the corridor, the direction from there into the room], ...]}, nearest the start first; or {}.
static func _pick_room(ctx: GenContext, rng: RandomNumberGenerator) -> Dictionary:
	var needed := [0, 1, maxi(2, ctx.last / 2), ctx.key_room, ctx.last]
	var found: Array = []
	for i in range(1, ctx.rects.size()):
		if needed.has(i) or ctx.areas.any(func(a: Dictionary) -> bool: return a["unit"] == i and int(a.get("height", 1)) != 1):
			continue
		var cand := _sealable(ctx, i)
		if not cand.is_empty():
			cand["far"] = Vector2(ctx.start).distance_to(Vector2(ctx.rects[i].get_center()))
			found.append(cand)
	if found.is_empty():
		return {}
	found.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a["far"] > b["far"])
	return found[rng.randi() % mini(2, found.size())]


## A unit that can be shut off as a dead end: every way in a threshold that can take a door (wall to both flanks), no
## lift beside it, and the rest of the level still all reachable from the start without it. {} if not.
static func _sealable(ctx: GenContext, i: int) -> Dictionary:
	var g := ctx.g
	var cells: Array = []
	var ways: Dictionary = {}                     # the cell outside -> the direction into the room
	var nooks: Dictionary = {}
	for y in range(1, ctx.H - 1):
		for x in range(1, ctx.W - 1):
			if ctx.room_of[y][x] != i or g[y][x] == "#":
				continue
			cells.append(Vector2i(x, y))
			for d in 4:
				var n: Vector2i = Vector2i(x, y) + DIRS[d]
				if g[n.y][n.x] != "#" and ctx.room_of[n.y][n.x] != i:
					if _leads_on(ctx, n, i):
						ways[n] = (d + 2) % 4
					else:
						nooks[n] = true              # let into its wall (a station's alcove): part of the room
	cells += nooks.keys().filter(func(c: Vector2i) -> bool: return not cells.has(c))
	if ways.is_empty() or ways.size() > 3 or cells.size() < 9:
		return {}
	for way in ways:
		var side: Vector2i = DIRS[(ways[way] + 1) % 4]
		if g[way.y + side.y][way.x + side.x] != "#" or g[way.y - side.y][way.x - side.x] != "#" or GenContext.is_door(g, way) and g[way.y][way.x] == "Z":
			return {}
	for t in ctx.things:                           # a lift beside it goes somewhere else: not a dead end
		if t.has("lift") and cells.any(func(c: Vector2i) -> bool: return Vector2(c).distance_to(Vector2(int(t["at"][0]), int(t["at"][1]))) < 1.5):
			return {}
	if not _rest_connected(ctx, cells, ways.keys()):
		return {}
	var list: Array = ways.keys().map(func(w: Vector2i) -> Array: return [w, ways[w]])
	list.sort_custom(func(a: Array, b: Array) -> bool: return Vector2(ctx.start).distance_to(Vector2(a[0])) < Vector2(ctx.start).distance_to(Vector2(b[0])))
	return {"unit": i, "cells": cells, "ways": list}


## With the room and its ways shut, can the start still walk to every other open cell of the main floor?
static func _rest_connected(ctx: GenContext, cells: Array, ways: Array) -> bool:
	var shut := {}
	for c in cells + ways:
		shut[c] = true
	var seen := {ctx.start: true}
	var queue: Array = [ctx.start]
	while not queue.is_empty():
		var c: Vector2i = queue.pop_back()
		for d in DIRS:
			var n: Vector2i = c + d
			if not seen.has(n) and not shut.has(n) and ctx.g[n.y][n.x] != "#":
				seen[n] = true
				queue.append(n)
	for y in range(1, ctx.H - 1):
		for x in range(1, ctx.W - 1):
			var p := Vector2i(x, y)
			if ctx.g[y][x] != "#" and not shut.has(p) and not seen.has(p):
				return false
	return true


## An open cell beside the room that goes somewhere else (a corridor), not a nook let into its wall (a station's alcove).
static func _leads_on(ctx: GenContext, n: Vector2i, i: int) -> bool:
	for d in DIRS:
		var m: Vector2i = n + d
		if ctx.g[m.y][m.x] != "#" and ctx.room_of[m.y][m.x] != i:
			return true
	return false


## The way in is a door shut on the zone's flag, of the kind the level uses (or the kind it already had).
static func _door(ctx: GenContext, way: Vector2i, ds: Dictionary) -> void:
	var was: String = ctx.g[way.y][way.x]
	var model: String = ctx.legend.get(was.to_upper(), {}).get("door", ctx.doors[0] if not ctx.doors.is_empty() else "")
	ctx.legend[LETTER] = {"door": model, "flag": ZONE + "_open", "need": str(ds.get("need", "")), "tag": ZONE + "_door"}
	ctx.g[way.y][way.x] = LETTER


## The set's things on the room's free floor (not just inside the door): the keeper in the middle, the maker and the
## prize at the back; three monsters, traps and loot for every twenty cells.
static func _inside(ctx: GenContext, ds: Dictionary, cells: Array, rng: RandomNumberGenerator, doors_in: Array) -> Array:
	var near := {}                                 # the floor just inside each door is kept clear
	for door_in in doors_in:
		near[door_in] = true
		for d in DIRS:
			near[door_in + d] = true
	var free: Array = cells.filter(func(c: Vector2i) -> bool: return not ctx.used.has(c) and ctx.g[c.y][c.x] == "." and not near.has(c))
	var sum := Vector2.ZERO
	for c in cells:
		sum += Vector2(c)
	sum /= maxf(1.0, cells.size())
	free.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return Vector2(a).distance_to(sum) < Vector2(b).distance_to(sum))
	var want: Array = []
	var kp: Dictionary = ds.get("keeper", {})
	if kp.has("actor"):
		want.append({"actor": kp["actor"], "tag": ZONE + "_keeper", "hp_mul": float(kp.get("hp_mul", 1.0))})
	want.append(ProgrammeDanger.maker(ds, ZONE))
	want += ProgrammeDanger.extras(ds, ZONE)
	var prizes: Array = ds.get("prizes", [])
	if not prizes.is_empty():
		var pz: Variant = prizes[rng.randi() % prizes.size()]
		for it in (pz if pz is Array else [pz]):
			want.append({"item": it})
	var lots := maxi(1, cells.size() / 20)
	for k in int(ds.get("per_room", 3)) * lots:
		want.append({"actor": ProgrammeDanger.weighted(ds.get("monsters", []), rng)})
	for k in int(ds.get("traps_per_room", 3)) * lots:
		var t := {"trap": ProgrammeDanger.weighted(ds.get("traps", []), rng)}
		if ds.has("trap_ignore") and t["trap"] != "collapse":
			t["ignore"] = ds["trap_ignore"]
		want.append(t)
	for k in int(ds.get("treasure", 3)) * lots:
		want.append({"item": ProgrammeDanger.weighted(ds.get("loot", []), rng)})
	var out: Array = []
	var rest: Array = free.slice(1)
	for k in rest.size():                          # the rest of the floor in the seed's order, the middle kept for the keeper
		var j := rng.randi_range(k, rest.size() - 1)
		var tmp: Vector2i = rest[k]
		rest[k] = rest[j]
		rest[j] = tmp
	var spots: Array = free.slice(0, 1) + rest
	for k in mini(want.size(), spots.size()):
		var e: Dictionary = want[k]
		e["at"] = [spots[k].x, spots[k].y]
		ctx.used[spots[k]] = true
		out.append(e)
	return out


## The zone's cells as rects, a run along each row.
static func _runs(cells: Array) -> Array:
	var have := {}
	for c in cells:
		have[c] = true
	var out: Array = []
	var sorted: Array = cells.duplicate()
	sorted.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return Vector2i(a.y, a.x) < Vector2i(b.y, b.x))
	for c in sorted:
		if have.has(c - Vector2i(1, 0)):
			continue
		var n := 1
		while have.has(c + Vector2i(n, 0)):
			n += 1
		out.append([c.x, c.y, n, 1])
	return out
