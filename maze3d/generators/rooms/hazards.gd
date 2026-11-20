extends RefCounted
## The rooms generator's windows, traps and pools.

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES


## Windows: a wall one cell thick with floor both sides and wall either end, looking into a room, not two side by side,
## and never behind a container.
static func windows(ctx: GenContext) -> void:
	var g := ctx.g
	var sh := ctx.sh
	var wins := ctx.windows
	for y in range(1, ctx.H - 1):
		for x in range(1, ctx.W - 1):
			if g[y][x] != "#" or ctx.no_win.has(Vector2i(x, y)) or ctx.rng.randf() >= sh.get("window", 0.45):
				continue
			var ns: bool = g[y - 1][x] == "." and g[y + 1][x] == "." and g[y][x - 1] == "#" and g[y][x + 1] == "#"
			var ew: bool = g[y][x - 1] == "." and g[y][x + 1] == "." and g[y - 1][x] == "#" and g[y + 1][x] == "#"
			if (ns or ew) and wins.size() < int(sh.get("max_windows", 14)):
				var near := false
				for w2 in wins:
					if absi(w2[0] - x) + absi(w2[1] - y) < 2:
						near = true
				var a1: Vector2i = Vector2i(x, y - 1) if ns else Vector2i(x - 1, y)
				var a2: Vector2i = Vector2i(x, y + 1) if ns else Vector2i(x + 1, y)
				if not near and (ctx.room_of[a1.y][a1.x] >= 0 or ctx.room_of[a2.y][a2.x] >= 0) and not ctx.taken.has(a1) and not ctx.taken.has(a2):
					wins.append([x, y])


## Traps: lasers across corridors, shock plates in them (never within three cells of another), vents in rooms.
static func traps(ctx: GenContext) -> void:
	var rng := ctx.rng
	var trap_n: Dictionary = ctx.sh.get("traps", {"laser": 2, "shock": 2, "vent": 3})
	var halls := _halls(ctx)
	var trapped := ctx.trapped
	for kind in ["laser", "shock"]:
		for k in int(trap_n.get(kind, 0)):
			if halls.is_empty():
				break
			var c: Vector2i = halls[rng.randi() % halls.size()]
			var crowded := false
			for o in trapped:
				if (o - c).length() < 3.0:
					crowded = true
			if crowded:
				continue
			trapped[c] = true
			if kind == "laser":
				ctx.things.append({"at": [c.x, c.y], "trap": "laser", "cycle": [1.5, 1.3], "damage": 14, "phase": rng.randf() * 2.0})
			else:
				ctx.things.append({"at": [c.x, c.y], "trap": "shock", "period": 2.6, "damage": 18, "phase": rng.randf() * 2.0})
	for k in int(trap_n.get("vent", 0)):
		var a: Dictionary = ctx.areas[rng.randi_range(1, ctx.areas.size() - 1)]
		var r: Rect2i = a["rect"]
		var c := Vector2i(rng.randi_range(r.position.x, r.end.x - 1), rng.randi_range(r.position.y, r.end.y - 1))
		if a["unit"] == 0 or ctx.g[c.y][c.x] != "." or ctx.room_of[c.y][c.x] != a["unit"] or ctx.used.has(c) or ctx.taken.has(c) or trapped.has(c):
			continue
		trapped[c] = true
		ctx.things.append({"at": [c.x, c.y], "trap": "vent", "phase": rng.randf() * 4.0})


## Corridor cells with wall both sides and no door next to them, away from the start.
static func _halls(ctx: GenContext) -> Array:
	var g := ctx.g
	var room_of := ctx.room_of
	var halls: Array = []
	for y in range(1, ctx.H - 1):
		for x in range(1, ctx.W - 1):
			if g[y][x] != "." or room_of[y][x] >= 0 or (Vector2i(x, y) - ctx.start).length() < 5.0:
				continue
			for d in 2:
				var f: Vector2i = DIRS[d]
				var s: Vector2i = DIRS[d + 1]
				if g[y + f.y][x + f.x] == "." and g[y - f.y][x - f.x] == "." and g[y + s.y][x + s.x] == "#" and g[y - s.y][x - s.x] == "#" \
						and room_of[y + f.y][x + f.x] < 0 and room_of[y - f.y][x - f.x] < 0:
					halls.append(Vector2i(x, y))
	return halls


## Pools: flooded patches and wholly flooded rooms, sometimes with something swimming (params "swimmers"). Last of the
## main floor's features, because from here on the map has a letter that is neither wall nor plain floor.
static func pools(ctx: GenContext) -> void:
	var rng := ctx.rng
	var g := ctx.g
	for t in ctx.things:
		if t.has("at") and not t.has("level") and not t.has("actor"):
			ctx.busy[Vector2i(int(t["at"][0]), int(t["at"][1]))] = true
	var swimmers: Array = ctx.p.get("swimmers", [])
	var n_pools := 0
	for a in ctx.areas:
		var i: int = a["unit"]
		var r: Rect2i = a["rect"]
		if i == 0 or i == ctx.last or r.size.x < 4 or r.size.y < 4 or n_pools >= int(ctx.sh.get("max_pools", 3)) or rng.randf() >= ctx.sh.get("pool", 0.3):
			continue
		var pr := r                                       # the whole floor, or a patch a cell in from the walls
		if rng.randf() < 0.7:
			var pw := rng.randi_range(2, r.size.x - 2)
			var ph := rng.randi_range(2, r.size.y - 2)
			pr = Rect2i(r.position.x + rng.randi_range(1, r.size.x - pw - 1), r.position.y + rng.randi_range(1, r.size.y - ph - 1), pw, ph)
		var wet: Array = []
		for y in range(pr.position.y, pr.end.y):
			for x in range(pr.position.x, pr.end.x):
				var c := Vector2i(x, y)
				if g[y][x] == "." and ctx.room_of[y][x] == i and not ctx.taken.has(c) and not ctx.busy.has(c) and not ctx.trapped.has(c):
					g[y][x] = "~"
					wet.append(c)
		if wet.size() >= 3:
			ctx.flooded = true
			n_pools += 1
			if not swimmers.is_empty() and rng.randf() < 0.7:
				var c6: Vector2i = wet[rng.randi() % wet.size()]
				ctx.things.append({"at": [c6.x, c6.y], "actor": ctx.weighted(swimmers), "face": NAMES[rng.randi() % 4]})
