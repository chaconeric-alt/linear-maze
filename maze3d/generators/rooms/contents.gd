extends RefCounted
## The rooms generator's contents: what a level cannot do without (the start, the red card, the guns, the way out),
## scanner arches, and room by room the monsters, treasure in its containers, furniture for the room's purpose,
## dressing in the corners and lockers on the walls; then something worth the climb on the balconies.

const Furnish := preload("res://generators/rooms/furnish.gd")
const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES


## The start, then what the level needs where the corridors arrive (the middle of a unit is always floor): the red
## card, a scattergun in the first room, a plasma gun about halfway, and the way out (and its boss) in the last.
static func essentials(ctx: GenContext) -> void:
	var p := ctx.p
	var things := ctx.things
	var start := ctx.start
	ctx.used[start] = true
	things.append({"at": [start.x, start.y], "start": true, "face": "n"})
	for i in range(1, ctx.rects.size()):
		var cc: Vector2i = ctx.clear(ctx.rects[i].get_center())
		ctx.used[cc] = true
		if i == ctx.key_room:
			things.append({"at": [cc.x, cc.y], "item": "keycard", "color": "red"})
		if i == 1:
			things.append({"at": [cc.x, cc.y], "item": "scattergun", "offset": [-1.0, 0, 0]})
		if i == max(2, ctx.last / 2):
			things.append({"at": [cc.x, cc.y], "item": "plasma", "offset": [1.0, 0, 0]})
	var ex: Vector2i = ctx.clear(ctx.rects[ctx.last].get_center())
	ctx.used[ex] = true
	if p.has("boss"):                                 # whoever runs the place waits in the last room
		things.append({"at": [ex.x, ex.y], "actor": p["boss"], "offset": [1.2, 0, 1.2], "face": "s"})
	things.append({"at": [ex.x, ex.y], "prop": p.get("exit_prop", "holo_table"), "blocks": false, "use": {"type": "effects", "prompt": "Signal the surface",
		"effects": [{"type": "end", "title": "Out, and richer", "text": "%s %d is somebody else's problem now." % [p.get("place", "Installation"), ctx.seed_value % 1000]}]}})


## Scanner arches: some stand just inside a doorway, the way you would fit one.
static func arches(ctx: GenContext) -> void:
	var kinds: Array = ctx.p.get("arches", [])
	for dc in ctx.door_cells:
		var q: Vector2i = dc[0]
		var inside: Vector2i = q + DIRS[dc[1]]
		if kinds.is_empty() or dc[2] or ctx.used.has(inside) or ctx.taken.has(inside) or ctx.rng.randf() > 0.3:
			continue
		ctx.used[inside] = true
		for d in DIRS:                      # keep the cells round an arch clear, so nothing wide crowds the way through
			ctx.used[inside + d] = true
		ctx.things.append({"at": [inside.x, inside.y], "prop": ctx.weighted(kinds), "face": "s" if dc[1] % 2 == 0 else "e", "blocks": false})


## Every area but the first: its floor, and the nooks (floor with wall on two sides or more) where dressing goes.
static func rooms(ctx: GenContext) -> void:
	var g := ctx.g
	var seen_purpose: Dictionary = {}
	for a in ctx.areas:
		var i: int = a["unit"]
		if i == 0:
			continue
		var r: Rect2i = a["rect"]
		var floor_cells: Array = []
		var nooks: Array = []                             # floor with wall on two sides or more: where furniture goes
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				var c := Vector2i(x, y)
				if g[y][x] != "." or ctx.room_of[y][x] != i or ctx.taken.has(c):
					continue
				floor_cells.append(c)
				var n_solid := 0
				for d in DIRS:
					if g[y + d.y][x + d.x] == "#":
						n_solid += 1
				if n_solid >= 2:
					nooks.append(c)
		if floor_cells.is_empty():
			continue
		_room(ctx, a, floor_cells, nooks, seen_purpose)


## Any cell of the room's floor.
static func _free(ctx: GenContext, floor_cells: Array) -> Vector2i:
	return floor_cells[ctx.rng.randi() % floor_cells.size()]


## One room: who is in it, what it is for (params "purposes" by style), treasure against its walls, furniture for its
## purpose, dressing in its corners, lockers.
static func _room(ctx: GenContext, a: Dictionary, floor_cells: Array, nooks: Array, seen_purpose: Dictionary) -> void:
	var p := ctx.p
	var rng := ctx.rng
	var i: int = a["unit"]
	var props: Array = p.get("style_props", {}).get(a["style"], p.get("props", []))
	_monsters(ctx, floor_cells)
	var purposes: Array = p.get("purposes", {}).get(a["style"], [])
	var pur: Dictionary = purposes[rng.randi() % purposes.size()] if not purposes.is_empty() else {}
	if pur.get("valuable", false):
		ctx.valuable[i] = 2
	if pur.get("bay", false):
		ctx.bays[i] = true
	_containers(ctx, i, floor_cells)
	# a room with a purpose is furnished for it: pieces along the walls, rows or a centrepiece on the floor, and
	# always a clear way from every door to every other
	if not purposes.is_empty():
		if pur.has("name") and a.has("room"):
			seen_purpose[pur["name"]] = seen_purpose.get(pur["name"], 0) + 1
			ctx.rooms[a["room"]]["name"] = pur["name"] if seen_purpose[pur["name"]] == 1 else "%s %d" % [pur["name"], seen_purpose[pur["name"]]]
		Furnish.furnish(ctx, i, floor_cells, pur, p.get("kit", "hightech"), float(p.get("furnish", 1.0)))
		props = pur.get("corner", props)
	_dressing(ctx, nooks, props)
	_lockers(ctx, floor_cells)


## About one monster for every nine cells of floor; some come in twos (params "pairs").
static func _monsters(ctx: GenContext, floor_cells: Array) -> void:
	var rng := ctx.rng
	for k in 1 + floor_cells.size() / 9:
		var c: Vector2i = _free(ctx, floor_cells)
		if ctx.used.has(c) or ctx.actors.is_empty():
			continue
		ctx.used[c] = true
		var who: String = ctx.weighted(ctx.actors)
		ctx.things.append({"at": [c.x, c.y], "actor": who, "face": NAMES[rng.randi() % 4]})
		if who in ctx.p.get("pairs", []):                 # some things come in twos
			ctx.things.append({"at": [c.x, c.y], "actor": who, "offset": [1.5, 0, 1.0], "face": NAMES[rng.randi() % 4]})


## Treasure in a container or two against the walls, not beside a way in. Where robots are kept, their power cells are
## on charge instead. A room with a trophy or a strongbox is worth guarding.
static func _containers(ctx: GenContext, i: int, floor_cells: Array) -> void:
	var g := ctx.g
	var rng := ctx.rng
	var treasure := ctx.treasure
	var wall_spots: Array = []                        # against a wall, not beside a way in
	for c in floor_cells:
		var walls_n := 0
		var door_n := 0
		for d in DIRS:
			var ch: String = g[c.y + d.y][c.x + d.x]
			if ch == "#":
				walls_n += 1
			elif ctx.room_of[c.y + d.y][c.x + d.x] != i:
				door_n += 1
		if walls_n >= 1 and door_n == 0 and not ctx.used.has(c):
			wall_spots.append(c)
	ctx.shuffle(wall_spots)
	var n_cont := (1 + int(rng.randf() < 0.4)) if not treasure.is_empty() else 0
	if ctx.bays.has(i) and ctx.p.get("containers", {}).has("cells"):      # where the robots are kept, their power cells are on charge: that, and the walls left for stations
		n_cont = 1
	for k in mini(n_cont, wall_spots.size()):
		var c2: Vector2i = wall_spots[k]
		ctx.used[c2] = true
		var as_cells: bool = ctx.bays.has(i) and k == 0 and ctx.p.get("containers", {}).has("cells")
		var got: String = ctx.stow(c2, g, 0, "fuel_cell" if as_cells else treasure[rng.randi() % treasure.size()], "cells" if as_cells else "")
		if got == "trophy" or got == "box":
			ctx.valuable[i] = maxi(ctx.valuable.get(i, 0), 1)


## Dressing goes in the corners so it never blocks the way through.
static func _dressing(ctx: GenContext, nooks: Array, props: Array) -> void:
	var rng := ctx.rng
	var dressed := 0
	for corner in nooks:
		if dressed >= 5 or rng.randf() >= 0.55 or ctx.used.has(corner) or props.is_empty():
			continue
		dressed += 1
		ctx.used[corner] = true
		var pid: String = props[rng.randi() % props.size()]
		var e := {"at": [corner.x, corner.y], "prop": pid, "blocks": false, "turn": rng.randi() % 4 * 90}
		_dress(ctx, e, pid)
		ctx.things.append(e)


## What some dressing does: barrels and drums go up, crates break open, coffins and domes hold something.
static func _dress(ctx: GenContext, e: Dictionary, pid: String) -> void:
	var rng := ctx.rng
	var treasure := ctx.treasure
	if pid == "barrel":
		e["hp"] = 12
		e["explode"] = {"radius": 5.5, "damage": 70}
	elif pid == "crate":
		e["hp"] = 20
		e["loot"] = [{"item": ["shells", "cells", "health"][rng.randi() % 3]}]
	elif pid in ["wk_drums"]:
		e["hp"] = 16
		e["explode"] = {"radius": 5.0, "damage": 60}
	elif pid == "bk_crates":
		e["hp"] = 24
		e["loot"] = [{"item": ["shells", "cells", "health"][rng.randi() % 3]}, {"item": ["shells", "cells"][rng.randi() % 2]}]
	elif pid == "cr_coffin":                  # most coffins hold grave goods; some hold whoever was buried
		e["use"] = {"type": "locker", "prompt": "Push the lid"}
		if rng.randf() < 0.6 or ctx.actors.is_empty():
			e["use"]["loot"] = [{"item": treasure[rng.randi() % treasure.size()]}] if not treasure.is_empty() else []
		else:
			e["use"]["actor"] = ctx.p.get("coffin_actor", "deadbot")
			e["use"]["text"] = "It sits up."
	elif pid in ["ag_pedestal", "cr_plinth"] and not treasure.is_empty():
		e["use"] = {"type": "cache", "prompt": "Lift the dome", "loot": [{"item": treasure[rng.randi() % treasure.size()]}]}


## Lockers on the walls: mostly useful, sometimes not (params "lockers"; without it, no lockers):
##   {"per_room": [min, max], "prop": model, "prompt": text, "outcomes": [outcome, ..]}
## One roll per locker picks the first outcome whose "below" is over it (the last needs none). An outcome may name a
## different "prop", make it "rattle", fill it with "loot": [min, max] things from params "locker_loot", or put in
## its "use" an "actor" (with "count": [min, max]), a "text" and "effects".
static func _lockers(ctx: GenContext, floor_cells: Array) -> void:
	var rng := ctx.rng
	var loot := ctx.loot
	var spec: Dictionary = ctx.p.get("lockers", {})
	var outcomes: Array = spec.get("outcomes", [])
	if outcomes.is_empty():
		return
	var per: Array = spec.get("per_room", [0, 2])
	for k in rng.randi_range(int(per[0]), int(per[1])):
		var c4: Vector2i = _free(ctx, floor_cells)
		var wall := -1
		for d in 4:
			var n2: Vector2i = c4 + DIRS[d]
			if ctx.g[n2.y][n2.x] == "#":
				wall = d
				break
		if wall < 0 or ctx.used.has(c4) or loot.is_empty():
			continue
		ctx.used[c4] = true
		var roll := rng.randf()
		var lk := {"at": [c4.x, c4.y], "prop": spec.get("prop", "locker"), "face": NAMES[(wall + 2) % 4], "use": {"type": "locker", "prompt": spec.get("prompt", "Open the locker")}}
		var out: Dictionary = outcomes[-1]
		for o in outcomes:
			if roll < float(o.get("below", INF)):
				out = o
				break
		_locker_outcome(ctx, lk, out)
		ctx.things.append(lk)


static func _locker_outcome(ctx: GenContext, lk: Dictionary, out: Dictionary) -> void:
	var rng := ctx.rng
	if out.has("prop"):
		lk["prop"] = out["prop"]
	if out.get("rattle", false):
		lk["rattle"] = true                    # it rattles: something lives in it
	if out.has("loot"):
		var items: Array = []
		for n3 in rng.randi_range(int(out["loot"][0]), int(out["loot"][1])):
			items.append({"item": ctx.loot[rng.randi() % ctx.loot.size()]})
		lk["use"]["loot"] = items
	if out.has("actor"):
		lk["use"]["actor"] = out["actor"]
		if out.has("count"):
			lk["use"]["count"] = rng.randi_range(int(out["count"][0]), int(out["count"][1]))
	if out.has("text"):
		lk["use"]["text"] = out["text"]
	if out.has("effects"):
		lk["use"]["effects"] = out["effects"].duplicate(true)


## Upstairs: the climb should be worth it, and sometimes somebody is already up there. At most five per room.
static func balconies(ctx: GenContext) -> void:
	var rng := ctx.rng
	var upstairs := ctx.upstairs
	var up_used := {}
	var per_unit := {}
	for k in upstairs.size():
		var pick: Array = upstairs[rng.randi() % upstairs.size()]
		var keyu := [pick[0], pick[1]]
		var cnt: int = per_unit.get(pick[2], 0)
		if up_used.has(keyu) or cnt >= 5:
			continue
		up_used[keyu] = true
		per_unit[pick[2]] = cnt + 1
		if cnt % 2 == 0 and not ctx.treasure.is_empty():
			ctx.stow(pick[0], ctx.g, pick[1], ctx.treasure[rng.randi() % ctx.treasure.size()], "")
		elif not ctx.actors.is_empty() and pick[2] != 0:
			ctx.things.append({"at": [pick[0].x, pick[0].y], "level": pick[1], "actor": ctx.weighted(ctx.p.get("gallery_actors", ctx.actors)), "face": NAMES[rng.randi() % 4]})
