extends RefCounted
## FurnishPut - how one piece of a room's furniture is put in (generators/rooms/furnish.gd chooses where): what it
## is, how many of it, whether its cell is free, the level thing it becomes; and the rule that keeps a furnished room
## walkable, that nothing out on the floor has furniture beside it and nothing cuts off part of the room.

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES
const ROOM := 30.0               # a count is for a room of about this many cells (5 by 6); a bigger one gets more
const PARTS := ["around", "chairs", "foot", "turn"]      # what a piece passes on to its level thing


## c is the room's, and nothing stands there yet, and it is not kept clear.
static func is_free(ctx: GenContext, fp: Dictionary, c: Vector2i) -> bool:
	return fp["inside"].has(c) and not ctx.used.has(c) and not fp["keep"].has(c) and not fp["taken_here"].has(c)


## Any way of naming a piece, as a dictionary: "id" -> {"piece": "id"}; ["station", "chair"] -> {"piece": "station",
## "seat": "chair"}; a dictionary as it is.
static func piece(item: Variant) -> Dictionary:
	if item is Dictionary:
		return item
	if item is Array:
		return {"piece": item[0], "seat": item[1]} if item.size() > 1 else {"piece": item[0]}
	return {"piece": item}


static func counted(item: Variant) -> bool:
	return item is Dictionary and item.has("count")


## How many of a counted piece the room gets: its "count", n, or [least, most] drawn between and more in a bigger room
## (a room has one projection screen however big it is, but more bunks).
static func how_many(ctx: GenContext, pc: Dictionary, cells_n: int, amount: float) -> int:
	var c: Variant = pc["count"]
	if not c is Array:
		return int(round(int(c) * amount))
	var n := int(c[0]) + ctx.rng.randi() % (int(c[1]) - int(c[0]) + 1)
	return int(round(n * maxf(1.0, cells_n / ROOM) * amount))


## Place one piece (or a set) at c, facing `face`; hug: pushed back against the wall behind it.
static func put(ctx: GenContext, fp: Dictionary, c: Vector2i, item: Variant, face: int, hug: bool) -> void:
	var rng := ctx.rng
	var pc := piece(item)
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
	var bk: Vector2i = DIRS[(face + 2) % 4]
	if hug and meta.get("mount", "") != "wall":     # one hung on the wall is put there by the level itself
		var push: float = maxf(0.0, 2.0 - depth(meta, pc) / 2.0 - 0.12)
		e["offset"] = [bk.x * push, 0, bk.y * push]
	var pair := 0.0                                   # one with a blank back, out on the floor: how far forward each of the pair stands
	if not hug and fp.get("back_to_back", []).has(id):
		pair = depth(meta, pc) / 2.0 + 0.01
		var o0: Array = e.get("offset", [0, 0, 0])
		e["offset"] = [snappedf(o0[0] - bk.x * pair, 0.001), 0, snappedf(o0[2] - bk.y * pair, 0.001)]
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
		if pair > 0.0:
			fp["placed"].append([c, _twin(ek, face, pair, meta.has("light"))])
	fp["taken_here"][c] = true


## How deep a piece is along the way it faces: its width, if it is turned a quarter (side on).
static func depth(meta: Dictionary, pc: Dictionary) -> float:
	var sz: Array = meta.get("solid", [1.0, 1.0, 1.0])
	var side_on := absf(absf(fmod(float(pc.get("turn", 0.0)), 180.0)) - 90.0) < 10.0
	return float(sz[0 if side_on else 2])


## The other of a back-to-back pair (Eric, 25 Nov: a shelf out in a room with its blank back showing looks wrong). The
## first stands `pair` in front of the cell's middle, so its back is at the middle; this is the same piece turned
## round, `pair` behind the middle, its back against the first's, each front facing out. A lit one's twin is not lit,
## so the pair has one lamp and the room as many lights as it had.
static func _twin(e: Dictionary, face: int, pair: float, lit: bool) -> Dictionary:
	var t: Dictionary = e.duplicate(true)
	var bk: Vector2i = DIRS[(face + 2) % 4]
	var o: Array = e["offset"]
	t["offset"] = [snappedf(o[0] + bk.x * pair * 2.0, 0.001), 0, snappedf(o[2] + bk.y * pair * 2.0, 0.001)]
	t["face"] = NAMES[(face + 2) % 4]
	if lit:
		t["lit"] = false
	return t


## Out on the floor a piece needs floor all round it, and nothing beside it: unless the room is crammed, or (`row`, a
## row's facing) the thing beside it is to its side, along the row.
static func crowded(fp: Dictionary, c: Vector2i, row: int) -> bool:
	for d in 4:
		var n: Vector2i = c + DIRS[d]
		if not fp["inside"].has(n):
			return true
		if fp["taken_here"].has(n) and not fp["crammed"] and not (row >= 0 and d % 2 != row % 2):
			return true
	return false


## Every clear cell of the room can be walked to from the first doorway, round `blocked`.
static func cut_off(fp: Dictionary, blocked: Dictionary) -> bool:
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
static func cuts(fp: Dictionary, c: Vector2i) -> bool:
	var blocked: Dictionary = fp["taken_here"].duplicate()
	blocked[c] = true
	return cut_off(fp, blocked)


## Nothing may be cut off: take pieces out, last first, until every clear cell can be walked to.
static func prune(fp: Dictionary, _cells: Array) -> void:
	var placed: Array = fp["placed"]
	while not placed.is_empty():
		var blocked: Dictionary = {}
		for pc in placed:
			blocked[pc[0]] = true
		if not cut_off(fp, blocked):
			break
		placed.pop_back()


## The shortest way from a to b over a room's own cells (both ends included).
static func room_path(inside: Dictionary, a: Vector2i, b: Vector2i) -> Array:
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


## How many cells along its wall a piece hung there covers, by its width (the solid's first number): one, or two for
## a vehicle bay's shutter.
static func span(meta: Dictionary, cell: float) -> int:
	return maxi(1, ceili(float(meta.get("solid", [1.0, 1.0, 1.0])[0]) / cell - 0.05))


## How much rock lies behind the wall on side d of c, in the map g (rows of one-letter cells, "#" rock or wall): wall
## cells in a line out from c, and OUTSIDE if the line reaches the map's edge without meeting floor. The wall with the
## most behind it is where a room meets the world outside: a motor pool's vehicle shutter, a gatehouse's blast door.
const OUTSIDE := 1000

static func rock_behind(g: Array, c: Vector2i, d: int) -> int:
	var n := 0
	var p: Vector2i = c + DIRS[d]
	while p.y >= 0 and p.y < g.size() and p.x >= 0 and p.x < g[p.y].size():
		if g[p.y][p.x] != "#":
			return n
		n += 1
		p += DIRS[d]
	return OUTSIDE
