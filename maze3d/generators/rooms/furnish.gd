extends RefCounted
## Furnish a room for its purpose (params "purposes": {style: [purpose, ..]}; one is picked per room):
##   {"name": "Ward", "wall": [ids], "floor": [ids], "centre": [ids], "corner": [ids], "fill": 0.5, "rows": true}
##   wall    pieces that stand against a wall, facing the room: on every other wall cell, up to `fill` of them
##   centre  one piece in the middle of the room, with a clear lap all round it
##   floor   pieces out on the floor, never two side by side; with "rows" they all face the same way (seats, pews, beds)
##   corner  what goes in the corners (the old dressing); defaults to the theme's props
## Anywhere a piece is named, ["station", "chair"] names a set instead: the station goes where the piece would, and the
## chair in front of it, facing it (the level's "seat"). Station depth + chair depth should come to under 3.3 m.
## The rule that keeps a furnished room from becoming an obstacle course: the cells on the shortest way between every
## pair of the room's doorways, and the cell in front of each, are never furnished; furniture out on the floor never has
## furniture next to it; and anything that would cut off part of the floor is taken out again. Cells are 4 m, so a
## clear cell is a lane a player at full speed fits down with room to spare. "furnish" (0..1) scales how much goes in.

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES


static func furnish(ctx: GenContext, unit: int, cells: Array, pur: Dictionary, kit: String, amount: float) -> void:
	var fp := _plan(ctx, cells)
	fp["kit"] = kit
	_centre(ctx, fp, cells, pur)
	_along_walls(ctx, fp, pur, amount)
	_on_floor(ctx, fp, cells, pur, amount)
	var placed: Array = fp["placed"]
	_prune(fp, cells)
	for pc in placed:
		ctx.used[pc[0]] = true
		ctx.things.append(pc[1])


## The room as the furnishing sees it: its cells (inside), the floor just inside each way in (fronts), the cells with
## one wall behind them (edge: cell -> that wall's direction), what must stay clear (keep: the fronts, the cells round
## them and the ways between them), its middle (sum, mid) and what has been placed so far.
static func _plan(ctx: GenContext, cells: Array) -> Dictionary:
	var g := ctx.g
	var inside: Dictionary = {}
	for c in cells:
		inside[c] = true
	var fronts: Array = []                            # floor just inside each way in
	var edge: Dictionary = {}                         # cell -> the direction of the wall behind it
	for c in cells:
		var walls := 0
		var wall_d := -1
		var opening := false
		for d in 4:
			var n: Vector2i = c + DIRS[d]
			if g[n.y][n.x] == "#":
				walls += 1
				wall_d = d
			elif not inside.has(n):
				opening = true
		if opening:
			fronts.append(c)
		elif walls == 1:
			edge[c] = wall_d
	var keep: Dictionary = {}                         # never furnished
	for f in fronts:
		keep[f] = true
		for d in DIRS:
			keep[f + d] = true
	var mid: Vector2i = cells[0]
	var sum := Vector2.ZERO
	for c in cells:
		sum += Vector2(c)
	sum /= cells.size()
	for c in cells:
		if Vector2(c).distance_to(sum) < Vector2(mid).distance_to(sum):
			mid = c
	var targets: Array = fronts.duplicate()
	if targets.size() < 2:
		targets.append(mid)
	for k in range(1, targets.size()):                # the ways through
		for c in _room_path(inside, targets[0], targets[k]):
			keep[c] = true
	return {"inside": inside, "edge": edge, "keep": keep, "sum": sum, "targets": targets, "placed": [], "taken_here": {}}


static func _free(ctx: GenContext, fp: Dictionary, c: Vector2i) -> bool:
	return fp["inside"].has(c) and not ctx.used.has(c) and not fp["keep"].has(c) and not fp["taken_here"].has(c)


## Place one piece (or a set) at c, facing `face`; hug: pushed back against the wall behind it.
static func _put(ctx: GenContext, fp: Dictionary, c: Vector2i, item: Variant, face: int, hug: bool) -> void:
	var rng := ctx.rng
	var id: String = item if item is String else item[0]      # ["station", "chair"]: a set
	var e := {"at": [c.x, c.y], "prop": id, "face": NAMES[face], "blocks": true}      # monsters path round it, as the player walks round it
	if id.begins_with("@"):                           # "@custodian": that robot's station. Some are empty (it is out), some shut
		var who := id.substr(1)
		if not ctx.stations.has(who):
			return
		e = {"at": [c.x, c.y], "station": ctx.stations[who], "face": NAMES[face], "blocks": true}
		if rng.randf() < 0.6:
			e["actor"] = who
			e["shut"] = rng.randf() < ctx.hibernate
		hug = false
	if item is Array and item.size() > 1:
		e["seat"] = item[1]
		if not hug:                                  # out on the floor the pair is centred on the cell, not the station
			var bk: Vector2i = DIRS[(face + 2) % 4]
			e["offset"] = [bk.x * 0.55, 0, bk.y * 0.55]
	if hug:
		var sz: Array = LM.model_meta(fp["kit"], id).get("solid", [1.0, 1.0, 1.0])
		var push: float = maxf(0.0, 2.0 - float(sz[2]) / 2.0 - 0.12)
		var wd: Vector2i = DIRS[(face + 2) % 4]
		e["offset"] = [wd.x * push, 0, wd.y * push]
	fp["placed"].append([c, e])
	fp["taken_here"][c] = true


## The centrepiece: nearest the middle, off the walls, with a clear lap all round it.
static func _centre(ctx: GenContext, fp: Dictionary, cells: Array, pur: Dictionary) -> void:
	var centre: Array = pur.get("centre", [])
	if centre.is_empty() or cells.size() < 20:
		return
	var inside: Dictionary = fp["inside"]
	var sum: Vector2 = fp["sum"]
	var best := Vector2i(-1, -1)
	for c in cells:
		if _free(ctx, fp, c) and not fp["edge"].has(c) and (best.x < 0 or Vector2(c).distance_to(sum) < Vector2(best).distance_to(sum)):
			var lap := true
			for d in DIRS:
				if not inside.has(c + d):
					lap = false
			if lap:
				best = c
	if best.x >= 0:
		_put(ctx, fp, best, centre[ctx.rng.randi() % centre.size()], ctx.rng.randi() % 4, false)
		for d in DIRS:
			fp["keep"][best + d] = true


## Along the walls: every other wall cell, up to `fill` of them.
static func _along_walls(ctx: GenContext, fp: Dictionary, pur: Dictionary, amount: float) -> void:
	var wall: Array = pur.get("wall", [])
	if wall.is_empty():
		return
	var edge: Dictionary = fp["edge"]
	var parity := ctx.rng.randi() % 2
	var want := int(ceil(edge.size() * float(pur.get("fill", 0.5)) * amount))
	var order: Array = edge.keys()
	order.sort()
	for c in order:
		if want <= 0:
			break
		if (c.x + c.y) % 2 != parity or not _free(ctx, fp, c):
			continue
		_put(ctx, fp, c, wall[ctx.rng.randi() % wall.size()], (edge[c] + 2) % 4, true)
		want -= 1


## Out on the floor: never two side by side; in rows if the purpose says so.
static func _on_floor(ctx: GenContext, fp: Dictionary, cells: Array, pur: Dictionary, amount: float) -> void:
	var fl: Array = pur.get("floor", [])
	if fl.is_empty():
		return
	var rng := ctx.rng
	var inside: Dictionary = fp["inside"]
	var taken_here: Dictionary = fp["taken_here"]
	var facing := rng.randi() % 4
	var want2 := int(round(cells.size() / 7.0 * float(pur.get("floor_fill", 1.0)) * amount))
	var order2: Array = cells.duplicate()
	order2.sort()
	var stripe := rng.randi() % 2
	for c in order2:
		if want2 <= 0:
			break
		if fp["edge"].has(c) or not _free(ctx, fp, c):
			continue
		if pur.get("rows", false) and (c.y if facing % 2 == 0 else c.x) % 2 != stripe:
			continue
		var crowded := false
		for d in DIRS:
			if taken_here.has(c + d) or not inside.has(c + d):
				crowded = true
		if crowded:
			continue
		_put(ctx, fp, c, fl[rng.randi() % fl.size()], facing if pur.get("rows", false) else rng.randi() % 4, false)
		want2 -= 1


## Nothing may be cut off: take pieces out, last first, until every clear cell can be walked to.
static func _prune(fp: Dictionary, cells: Array) -> void:
	var placed: Array = fp["placed"]
	var inside: Dictionary = fp["inside"]
	while not placed.is_empty():
		var blocked: Dictionary = {}
		for pc in placed:
			blocked[pc[0]] = true
		var start: Vector2i = fp["targets"][0]
		var seen: Dictionary = {start: true}
		var queue: Array = [start]
		while not queue.is_empty():
			var c: Vector2i = queue.pop_front()
			for d in DIRS:
				var n: Vector2i = c + d
				if inside.has(n) and not blocked.has(n) and not seen.has(n):
					seen[n] = true
					queue.append(n)
		var cut := false
		for c in cells:
			if not blocked.has(c) and not seen.has(c):
				cut = true
				break
		if not cut:
			break
		placed.pop_back()


## The shortest way from a to b over a room's own cells (both ends included).
static func _room_path(inside: Dictionary, a: Vector2i, b: Vector2i) -> Array:
	var from: Dictionary = {a: a}
	var queue: Array = [a]
	while not queue.is_empty():
		var c: Vector2i = queue.pop_front()
		if c == b:
			break
		for d in DIRS:
			var n: Vector2i = c + d
			if inside.has(n) and not from.has(n):
				from[n] = c
				queue.append(n)
	var out: Array = []
	if not from.has(b):
		return out
	var c2 := b
	while c2 != a:
		out.append(c2)
		c2 = from[c2]
	out.append(a)
	return out
