extends RefCounted
## Furnish a room for its purpose (params "purposes": {style: [purpose, ..]}; one is picked per room):
##   {"name": "Ward", "wall": [pieces], "floor": [pieces], "centre": [pieces], "corner": [ids], "outside": piece,
##    "fill": 0.5, "rows": true}
##   wall    pieces that stand against a wall, facing the room: on every other wall cell, up to `fill` of them
##   centre  one piece in the middle of a room of 20 cells or more (any size if it has a count), with a clear lap all round
##   floor   pieces out on the floor, never two side by side; with "rows" they all face the same way (seats, pews, beds)
##   corner  what goes in the corners (the old dressing); defaults to the theme's props
##   outside the piece hung on the room's way out to the world (a vehicle bay's shutter): on the wall with the most
##           rock behind it, nearest the middle of the room, its floor kept clear (furnish_put.gd rock_behind)
##   crammed a room meant to be crammed full (a store): a piece on every wall cell, pieces on the floor side by side,
##           and each stands in front of whatever the wall shows ("crammed" on the thing: elsewhere the level gives a
##           wall something stands against its plain tile, LevelHung). The ways between doors stay clear.
## A piece is a model id, ["station", "chair"] (the station where the piece would go and the chair in front of it,
## facing it: the level's "seat"; station depth + chair depth should come to under 3.3 m), or a dictionary:
##   {"piece": id, "seat": chair, "around": chair, "chairs": n, "foot": id, "turn": degrees,
##    "count": n or [least, most], "side_by_side": true, "per_cell": n}
##   around, chairs, foot, turn  passed on to the level thing: chairs all round a table, a footlocker at a bed's foot
##   count         how many of it the room wants: n, or [least, most] (more of those in a room bigger than ROOM cells:
##                 furnish_put.gd); placed before anything that has no count, and taken off what `fill` and
##                 `floor_fill` ask for
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
const Put := preload("res://generators/rooms/furnish_put.gd")


static func furnish(ctx: GenContext, unit: int, cells: Array, pur: Dictionary, kit: String, amount: float) -> void:
	var fp := _plan(ctx, cells)
	fp["kit"] = kit
	fp["crammed"] = pur.get("crammed", false)
	_centre(ctx, fp, cells, pur)
	_outside(ctx, fp, pur)
	_along_walls(ctx, fp, pur, amount)
	_on_floor(ctx, fp, cells, pur, amount)
	var placed: Array = fp["placed"]
	Put.prune(fp, cells)
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
		for c in Put.room_path(inside, targets[0], targets[k]):
			keep[c] = true
	return {"inside": inside, "edge": edge, "corner": corner, "keep": keep, "sum": sum, "targets": targets, "placed": [], "taken_here": {}}


## The centrepiece: nearest the middle, off the walls, with a clear lap all round it.
static func _centre(ctx: GenContext, fp: Dictionary, cells: Array, pur: Dictionary) -> void:
	var centre: Array = pur.get("centre", [])
	var wanted := centre.any(func(w: Variant) -> bool: return Put.counted(w))     # a counted one goes in a small room too
	if centre.is_empty() or (cells.size() < 20 and not wanted):
		return
	var inside: Dictionary = fp["inside"]
	var sum: Vector2 = fp["sum"]
	var best := Vector2i(-1, -1)
	for c in cells:
		if Put.is_free(ctx, fp, c) and not fp["edge"].has(c) and (best.x < 0 or Vector2(c).distance_to(sum) < Vector2(best).distance_to(sum)):
			var lap := true
			for d in DIRS:
				if not inside.has(c + d):
					lap = false
			if lap:
				best = c
	if best.x >= 0:
		Put.put(ctx, fp, best, centre[ctx.rng.randi() % centre.size()], ctx.rng.randi() % 4, false)
		for d in DIRS:
			fp["keep"][best + d] = true


## The room's way out to the world (a motor pool's vehicle shutter, two cells wide): hung on the wall with the most
## rock behind it (one on the outside of the place if it has one), on the free wall cells nearest the room's middle,
## with the floor in front of it kept clear. Nothing is drawn at random for it, so the rest of the room furnishes as it
## would have without it.
static func _outside(ctx: GenContext, fp: Dictionary, pur: Dictionary) -> void:
	if not pur.has("outside"):
		return
	var pc := Put.piece(pur["outside"])
	var cell := float(LM.kits.get(fp["kit"], {}).get("cell", 4.0))
	var n := Put.span(LM.model_meta(fp["kit"], pc["piece"]), cell)
	var edge: Dictionary = fp["edge"]
	var best: Array = []
	var most := -1
	var near := INF
	for c in edge:
		var run := _wall_run(ctx, fp, c, n)
		if run.is_empty():
			continue
		var rock: int = run.map(func(q: Vector2i) -> int: return Put.rock_behind(ctx.g, q, edge[c])).min()
		var far := (Vector2(c) + Vector2(DIRS[(edge[c] + 1) % 4]) * (n - 1) / 2.0).distance_to(fp["sum"])
		if rock > most or (rock == most and far < near):
			best = run
			most = rock
			near = far
	if best.is_empty():
		return
	var d: int = edge[best[0]]
	Put.put(ctx, fp, best[0], pc, (d + 2) % 4, true)
	var e: Dictionary = fp["placed"].back()[1]
	e["blocks"] = false                               # hung on the wall, it leaves the floor in front of it to walk on
	var side: Vector2i = DIRS[(d + 1) % 4]
	if n > 1:                                         # centred on its cells, the first and those along from it
		e["offset"] = [side.x * cell * (n - 1) / 2.0, 0, side.y * cell * (n - 1) / 2.0]
	for q in best:
		fp["taken_here"][q] = true
		fp["keep"][q - DIRS[d]] = true


## n free cells along one wall from c (c first, going clockwise round the room from it), or none.
static func _wall_run(ctx: GenContext, fp: Dictionary, c: Vector2i, n: int) -> Array:
	var d: int = fp["edge"][c]
	var run: Array = []
	for k in n:
		var q: Vector2i = c + DIRS[(d + 1) % 4] * k
		if fp["edge"].get(q, -1) != d or not Put.is_free(ctx, fp, q):
			return []
		run.append(q)
	return run


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
		if Put.counted(item):
			want -= _wall_count(ctx, fp, order, item, parity, amount)
	var rest := wall.filter(func(w: Variant) -> bool: return not Put.counted(w))
	if rest.is_empty():
		return
	for c in order:
		if want <= 0:
			break
		if ((c.x + c.y) % 2 != parity and not fp["crammed"]) or not Put.is_free(ctx, fp, c):
			continue
		Put.put(ctx, fp, c, rest[ctx.rng.randi() % rest.size()], (edge[c] + 2) % 4, true)
		want -= 1


## A counted piece along the walls: side by side, a run down one wall, into its corners and on round the next; or
## else, like the rest, on every other wall cell, starting anywhere. How many went in.
static func _wall_count(ctx: GenContext, fp: Dictionary, order: Array, pc: Dictionary, parity: int, amount: float) -> int:
	var n := Put.how_many(ctx, pc, fp["inside"].size(), amount)
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
		if (not beside and (c.x + c.y) % 2 != parity) or not Put.is_free(ctx, fp, c) or Put.cuts(fp, c):
			continue
		Put.put(ctx, fp, c, pc, (cw[1] + 2) % 4, true)
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
		if Put.counted(item):
			want2 -= _floor_count(ctx, fp, cells, item, rows, facing, stripe, amount)
	var rest := fl.filter(func(w: Variant) -> bool: return not Put.counted(w))
	if rest.is_empty():
		return
	for c in order2:
		if want2 <= 0:
			break
		if fp["edge"].has(c) or not Put.is_free(ctx, fp, c):
			continue
		if rows and (c.y if facing % 2 == 0 else c.x) % 2 != stripe:
			continue
		if Put.crowded(fp, c, -1):
			continue
		Put.put(ctx, fp, c, rest[rng.randi() % rest.size()], facing if rows else rng.randi() % 4, false)
		want2 -= 1


## A counted piece out on the floor: with "rows", row by row, facing the same way, and side by side along a row if it
## may be. How many went in.
static func _floor_count(ctx: GenContext, fp: Dictionary, cells: Array, pc: Dictionary, rows: bool, facing: int, stripe: int, amount: float) -> int:
	var n := Put.how_many(ctx, pc, cells.size(), amount)
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
		if fp["edge"].has(c) or not Put.is_free(ctx, fp, c):
			continue
		if rows and (c.y if facing % 2 == 0 else c.x) % 2 != stripe:
			continue
		if Put.crowded(fp, c, facing if beside else -1) or Put.cuts(fp, c):
			continue
		Put.put(ctx, fp, c, pc, facing if rows else ctx.rng.randi() % 4, false)
		placed += int(pc.get("per_cell", 1))
	return placed
