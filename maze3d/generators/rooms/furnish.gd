extends RefCounted
## Furnish a room for its purpose (params "purposes": {style: [purpose, ..]}; one is picked per room):
##   {"name": "Ward", "wall": [pieces], "floor": [pieces], "centre": [pieces], "corner": [ids], "fill": 0.5, "rows": true}
##   wall    pieces that stand against a wall, facing the room: on every other wall cell, up to `fill` of them
##   centre  one piece in the middle of a room of 20 cells or more (any size if it has a count), with a clear lap all round
##   floor   pieces out on the floor, never two side by side; with "rows" they all face the same way (seats, pews, beds)
##   corner  what goes in the corners (the old dressing); defaults to the theme's props
##   crammed a room meant to be crammed full (a store): a piece on every wall cell, pieces on the floor side by side,
##           and each stands in front of whatever the wall shows ("crammed" on the thing: elsewhere the level gives a
##           wall something stands against its plain tile, LevelData.find_hung). The ways between doors stay clear.
## A piece is a model id, ["station", "chair"] (the station where the piece would go and the chair in front of it,
## facing it: the level's "seat"; station depth + chair depth should come to under 3.3 m), or a dictionary:
##   {"piece": id, "seat": chair, "around": chair, "chairs": n, "foot": id, "turn": degrees,
##    "count": n or [least, most], "side_by_side": true, "per_cell": n}
##   around, chairs, foot, turn  passed on to the level thing: chairs all round a table, a footlocker at a bed's foot
##   count         how many of it the room wants: n, or [least, most] (more of those in a room bigger than ROOM cells);
##                 placed before anything that has no count, and taken off what `fill` and `floor_fill` ask for
##   side_by_side  it may stand next to its own kind: along the walls, a run down one wall, into its corners and round
##                 onto the next (a row of lockers, of toilets); out on the floor with "rows", side by side along each row, the aisles
##                 between rows kept clear (bunks, server racks, shelving). A counted piece is never put where it
##                 would cut off part of the room.
##   per_cell      that many to a cell, side by side across its face (a bank of lockers, two bunks): cells are 4 m
## A model the kit has not got yet can be named all the same if the game gives it a stand-in (LM.model_meta).
## The rule that keeps a furnished room from becoming an obstacle course: the cells on the shortest way between every
## pair of the room's doorways, and the cell in front of each, are never furnished; furniture out on the floor never has
## furniture next to it (but its own kind, side by side); and anything that would cut off part of the floor is taken
## out again. Cells are 4 m, so a clear cell is a lane a player at full speed fits down with room to spare. "furnish"
## (0..1) scales how much goes in.

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES
const ROOM := 30.0               # a count is for a room of about this many cells (5 by 6); a bigger one gets more
const PARTS := ["around", "chairs", "foot", "turn"]      # what a piece passes on to its level thing


static func furnish(ctx: GenContext, unit: int, cells: Array, pur: Dictionary, kit: String, amount: float) -> void:
	var fp := _plan(ctx, cells)
	fp["kit"] = kit
	fp["crammed"] = pur.get("crammed", false)
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
	var corner: Dictionary = {}                       # cell -> the two walls of a corner (only a run along a wall uses it)
	for c in cells:
		var walls := 0
		var wall_d := -1
		var opening := false
		var ds: Array = []
		for d in 4:
			var n: Vector2i = c + DIRS[d]
			if g[n.y][n.x] == "#":
				walls += 1
				wall_d = d
				ds.append(d)
			elif not inside.has(n):
				opening = true
		if opening:
			fronts.append(c)
		elif walls == 1:
			edge[c] = wall_d
		elif walls == 2 and ds[1] - ds[0] != 2:
			corner[c] = ds
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
	return {"inside": inside, "edge": edge, "corner": corner, "keep": keep, "sum": sum, "targets": targets, "placed": [], "taken_here": {}}


static func _free(ctx: GenContext, fp: Dictionary, c: Vector2i) -> bool:
	return fp["inside"].has(c) and not ctx.used.has(c) and not fp["keep"].has(c) and not fp["taken_here"].has(c)


## Any way of naming a piece, as a dictionary: "id" -> {"piece": "id"}; ["station", "chair"] -> {"piece": "station",
## "seat": "chair"}; a dictionary as it is.
static func _piece(item: Variant) -> Dictionary:
	if item is Dictionary:
		return item
	if item is Array:
		return {"piece": item[0], "seat": item[1]} if item.size() > 1 else {"piece": item[0]}
	return {"piece": item}


static func _counted(item: Variant) -> bool:
	return item is Dictionary and item.has("count")


## How many of a counted piece the room gets: its "count", n, or [least, most] drawn between and more in a bigger room
## (a room has one projection screen however big it is, but more bunks).
static func _how_many(ctx: GenContext, pc: Dictionary, cells_n: int, amount: float) -> int:
	var c: Variant = pc["count"]
	if not c is Array:
		return int(round(int(c) * amount))
	var n := int(c[0]) + ctx.rng.randi() % (int(c[1]) - int(c[0]) + 1)
	return int(round(n * maxf(1.0, cells_n / ROOM) * amount))


## Place one piece (or a set) at c, facing `face`; hug: pushed back against the wall behind it.
static func _put(ctx: GenContext, fp: Dictionary, c: Vector2i, item: Variant, face: int, hug: bool) -> void:
	var rng := ctx.rng
	var pc := _piece(item)
	var id: String = pc["piece"]
	var e := {"at": [c.x, c.y], "prop": id, "face": NAMES[face], "blocks": true}      # monsters path round it, as the player walks round it
	if fp.get("crammed", false):
		e["crammed"] = true
	if id.begins_with("@"):                           # "@custodian": that robot's station. Some are empty (it is out), some shut
		var who := id.substr(1)
		if not ctx.stations.has(who):
			return
		e = {"at": [c.x, c.y], "station": ctx.stations[who], "face": NAMES[face], "blocks": true}
		if rng.randf() < 0.6:
			e["actor"] = who
			e["shut"] = rng.randf() < ctx.hibernate
		hug = false
	if pc.has("seat"):
		e["seat"] = pc["seat"]
		if not hug:                                  # out on the floor the pair is centred on the cell, not the station
			var bk: Vector2i = DIRS[(face + 2) % 4]
			e["offset"] = [bk.x * 0.55, 0, bk.y * 0.55]
	for k in PARTS:
		if pc.has(k):
			e[k] = pc[k]
	var meta := LM.model_meta(fp["kit"], id)
	if hug and meta.get("mount", "") != "wall":     # one hung on the wall is put there by the level itself
		var sz: Array = meta.get("solid", [1.0, 1.0, 1.0])
		var side_on := absf(absf(fmod(float(pc.get("turn", 0.0)), 180.0)) - 90.0) < 10.0   # turned a quarter: its width meets the wall
		var push: float = maxf(0.0, 2.0 - float(sz[0 if side_on else 2]) / 2.0 - 0.12)
		var wd: Vector2i = DIRS[(face + 2) % 4]
		e["offset"] = [wd.x * push, 0, wd.y * push]
	var n := int(pc.get("per_cell", 1))
	var side: Vector2i = DIRS[(face + 1) % 4]
	var cell := float(LM.kits.get(fp["kit"], {}).get("cell", 4.0))
	for k in n:                                       # several to a cell: spread evenly across its face
		var ek: Dictionary = e if n == 1 else e.duplicate(true)
		if n > 1:
			var s := (k - (n - 1) / 2.0) * cell / n
			var o: Array = ek.get("offset", [0, 0, 0])
			ek["offset"] = [snappedf(o[0] + side.x * s, 0.001), 0, snappedf(o[2] + side.y * s, 0.001)]
		fp["placed"].append([c, ek])
	fp["taken_here"][c] = true


## The centrepiece: nearest the middle, off the walls, with a clear lap all round it.
static func _centre(ctx: GenContext, fp: Dictionary, cells: Array, pur: Dictionary) -> void:
	var centre: Array = pur.get("centre", [])
	var wanted := centre.any(func(w: Variant) -> bool: return _counted(w))     # a counted one goes in a small room too
	if centre.is_empty() or (cells.size() < 20 and not wanted):
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


## Along the walls: the counted pieces first, then every other wall cell (every one, crammed), up to `fill` of them.
static func _along_walls(ctx: GenContext, fp: Dictionary, pur: Dictionary, amount: float) -> void:
	var wall: Array = pur.get("wall", [])
	if wall.is_empty():
		return
	var edge: Dictionary = fp["edge"]
	var parity := ctx.rng.randi() % 2
	var want := int(ceil(edge.size() * float(pur.get("fill", 0.5)) * amount))
	var order: Array = edge.keys()
	order.sort()
	for item in wall:
		if _counted(item):
			want -= _wall_count(ctx, fp, order, item, parity, amount)
	var rest := wall.filter(func(w: Variant) -> bool: return not _counted(w))
	if rest.is_empty():
		return
	for c in order:
		if want <= 0:
			break
		if ((c.x + c.y) % 2 != parity and not fp["crammed"]) or not _free(ctx, fp, c):
			continue
		_put(ctx, fp, c, rest[ctx.rng.randi() % rest.size()], (edge[c] + 2) % 4, true)
		want -= 1


## A counted piece along the walls: side by side, a run down one wall, into its corners and on round the next; or
## else, like the rest, on every other wall cell, starting anywhere. How many went in.
static func _wall_count(ctx: GenContext, fp: Dictionary, order: Array, pc: Dictionary, parity: int, amount: float) -> int:
	var n := _how_many(ctx, pc, fp["inside"].size(), amount)
	var edge: Dictionary = fp["edge"]
	var beside: bool = pc.get("side_by_side", false) or fp["crammed"]
	var line: Array = _runs(ctx, fp) if beside else order.map(func(c: Vector2i) -> Array: return [c, edge[c]])
	if not beside and not line.is_empty():
		var k := ctx.rng.randi() % line.size()
		line = line.slice(k) + line.slice(0, k)
	var placed := 0
	for cw in line:
		var c: Vector2i = cw[0]
		if placed >= n:
			break
		if (not beside and (c.x + c.y) % 2 != parity) or not _free(ctx, fp, c) or _cuts(fp, c):
			continue
		_put(ctx, fp, c, pc, (cw[1] + 2) % 4, true)
		placed += int(pc.get("per_cell", 1))
	return placed


## The wall cells wall by wall, [cell, its wall], each wall's in order along it and its corners at either end, from a
## wall picked at random: a run that fills one wall goes on round the room. A corner comes twice, once for each wall.
static func _runs(ctx: GenContext, fp: Dictionary) -> Array:
	var edge: Dictionary = fp["edge"]
	var corner: Dictionary = fp["corner"]
	var out: Array = []
	var d0 := ctx.rng.randi() % 4
	for k in 4:
		var d := (d0 + k) % 4
		var along: Array = edge.keys().filter(func(c: Vector2i) -> bool: return edge[c] == d)
		along += corner.keys().filter(func(c: Vector2i) -> bool: return corner[c].has(d))
		along.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return (Vector2i(a.y, a.x) < Vector2i(b.y, b.x)) if d % 2 == 0 else a < b)
		out += along.map(func(c: Vector2i) -> Array: return [c, d])
	return out


## Out on the floor: the counted pieces first, then up to `floor_fill`; never two side by side (unless crammed, or a
## piece's own kind beside it in a row); in rows if the purpose says so.
static func _on_floor(ctx: GenContext, fp: Dictionary, cells: Array, pur: Dictionary, amount: float) -> void:
	var fl: Array = pur.get("floor", [])
	if fl.is_empty():
		return
	var rng := ctx.rng
	var rows: bool = pur.get("rows", false)
	var facing := rng.randi() % 4
	var want2 := int(round(cells.size() / 7.0 * float(pur.get("floor_fill", 1.0)) * amount))
	var order2: Array = cells.duplicate()
	order2.sort()
	var stripe := rng.randi() % 2
	for item in fl:
		if _counted(item):
			want2 -= _floor_count(ctx, fp, cells, item, rows, facing, stripe, amount)
	var rest := fl.filter(func(w: Variant) -> bool: return not _counted(w))
	if rest.is_empty():
		return
	for c in order2:
		if want2 <= 0:
			break
		if fp["edge"].has(c) or not _free(ctx, fp, c):
			continue
		if rows and (c.y if facing % 2 == 0 else c.x) % 2 != stripe:
			continue
		if _crowded(fp, c, -1):
			continue
		_put(ctx, fp, c, rest[rng.randi() % rest.size()], facing if rows else rng.randi() % 4, false)
		want2 -= 1


## A counted piece out on the floor: with "rows", row by row, facing the same way, and side by side along a row if it
## may be. How many went in.
static func _floor_count(ctx: GenContext, fp: Dictionary, cells: Array, pc: Dictionary, rows: bool, facing: int, stripe: int, amount: float) -> int:
	var n := _how_many(ctx, pc, cells.size(), amount)
	var beside: bool = rows and pc.get("side_by_side", false)
	var order: Array = cells.duplicate()
	if facing % 2 == 0:                               # rows run east and west: take them a row at a time
		order.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return Vector2i(a.y, a.x) < Vector2i(b.y, b.x))
	else:
		order.sort()
	var placed := 0
	for c in order:
		if placed >= n:
			break
		if fp["edge"].has(c) or not _free(ctx, fp, c):
			continue
		if rows and (c.y if facing % 2 == 0 else c.x) % 2 != stripe:
			continue
		if _crowded(fp, c, facing if beside else -1) or _cuts(fp, c):
			continue
		_put(ctx, fp, c, pc, facing if rows else ctx.rng.randi() % 4, false)
		placed += int(pc.get("per_cell", 1))
	return placed


## Out on the floor a piece needs floor all round it, and nothing beside it: unless the room is crammed, or (`row`, a
## row's facing) the thing beside it is to its side, along the row.
static func _crowded(fp: Dictionary, c: Vector2i, row: int) -> bool:
	for d in 4:
		var n: Vector2i = c + DIRS[d]
		if not fp["inside"].has(n):
			return true
		if fp["taken_here"].has(n) and not fp["crammed"] and not (row >= 0 and d % 2 != row % 2):
			return true
	return false


## Every clear cell of the room can be walked to from the first doorway, round `blocked`.
static func _cut_off(fp: Dictionary, blocked: Dictionary) -> bool:
	var inside: Dictionary = fp["inside"]
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
	for c in inside:
		if not blocked.has(c) and not seen.has(c):
			return true
	return false


## Furnishing c as well would cut off part of the room.
static func _cuts(fp: Dictionary, c: Vector2i) -> bool:
	var blocked: Dictionary = fp["taken_here"].duplicate()
	blocked[c] = true
	return _cut_off(fp, blocked)


## Nothing may be cut off: take pieces out, last first, until every clear cell can be walked to.
static func _prune(fp: Dictionary, _cells: Array) -> void:
	var placed: Array = fp["placed"]
	while not placed.is_empty():
		var blocked: Dictionary = {}
		for pc in placed:
			blocked[pc[0]] = true
		if not _cut_off(fp, blocked):
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
