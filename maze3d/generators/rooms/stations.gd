extends RefCounted
## The rooms generator's stations: robots off duty wait in stations let into the walls, an alcove of its own off the
## room each was in (params "stations": actor -> station model, "stationed": the chance, "hibernating": shut ones).
## Sphinx guns go first, by the doors of the rooms worth guarding (params "sphinx": {"actor", "max"}).

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES


static func stations(ctx: GenContext) -> void:
	var alcoves := _alcoves(ctx)
	_sphinx_guns(ctx, alcoves)
	_stationed(ctx, alcoves)


## unit -> the rock cells that would make an alcove off it, in a random order. A station's nook may open on a tall room.
static func _alcoves(ctx: GenContext) -> Dictionary:
	var alcoves := {}
	ctx.nook_tall = true
	for y in range(2, ctx.H - 2):
		for x in range(2, ctx.W - 2):
			var fr: Vector2i = ctx.nook_front(Vector2i(x, y))
			if fr.x >= 0:
				var un: int = ctx.room_of[fr.y][fr.x]
				if not alcoves.has(un):
					alcoves[un] = []
				alcoves[un].append(Vector2i(x, y))
	for un in alcoves:
		ctx.shuffle(alcoves[un])
	return alcoves


## An alcove off the unit that is still good: the nearest to `near` if that is given, else the first.
static func _alcove_for(ctx: GenContext, alcoves: Dictionary, un: int, near: Vector2i) -> Vector2i:
	var best := Vector2i(-1, -1)
	for c in alcoves.get(un, []):
		if ctx.nook(c) and (best.x < 0 or (near.x >= 0 and (c - near).length_squared() < (best - near).length_squared())):
			best = c
			if near.x < 0:
				break
	return best


## Sphinx guns first: they guard what is worth guarding. One by each valuable room, in the wall beside its door.
static func _sphinx_guns(ctx: GenContext, alcoves: Dictionary) -> void:
	var sx: Dictionary = ctx.p.get("sphinx", {})
	var valuable := ctx.valuable
	var guards := 0
	var worth: Array = valuable.keys()
	ctx.shuffle(worth)
	worth.sort_custom(func(a2: int, b2: int) -> bool: return valuable[a2] > valuable[b2])
	for un in worth:
		if guards >= int(sx.get("max", 0)) or un == 0:
			continue
		var door_in := Vector2i(-1, -1)
		for dc in ctx.door_cells:
			var ins: Vector2i = dc[0] + DIRS[dc[1]]
			if ctx.inside(ins) and ctx.room_of[ins.y][ins.x] == un:
				door_in = ins
				break
		var spot: Vector2i = _alcove_for(ctx, alcoves, un, door_in)
		if spot.x < 0:
			continue
		var fr2: Vector2i = ctx.nook_front(spot)
		ctx.dig(spot)
		ctx.things.append({"at": [spot.x, spot.y], "actor": str(sx.get("actor", "sphinx")), "face": NAMES[DIRS.find(fr2 - spot)], "lounge": "none"})
		guards += 1


## Robots of a kind with a station, standing loose on the main floor, are moved into one: an alcove off their room, or
## where there is no rock to let one into, a station against the room's wall.
static func _stationed(ctx: GenContext, alcoves: Dictionary) -> void:
	if ctx.stations.is_empty():
		return
	var things := ctx.things
	var wall_bays := {}
	for ti in things.size():
		var t: Dictionary = things[ti]
		if not t.has("actor") or t.has("level") or t.has("offset") or t.has("alert") or t.has("station") or not ctx.stations.has(t["actor"]):
			continue
		if ctx.rng.randf() >= float(ctx.p.get("stationed", 0.65)):
			continue
		var tc := Vector2i(int(t["at"][0]), int(t["at"][1]))
		var un2: int = ctx.room_of[tc.y][tc.x]
		var spot2: Vector2i = _alcove_for(ctx, alcoves, un2, Vector2i(-1, -1))
		if spot2.x >= 0:
			var fr3: Vector2i = ctx.nook_front(spot2)
			ctx.dig(spot2)
			things[ti] = {"at": [spot2.x, spot2.y], "station": ctx.stations[t["actor"]], "actor": t["actor"], "face": NAMES[DIRS.find(fr3 - spot2)],
				"shut": ctx.rng.randf() < ctx.hibernate}
			continue
		if un2 < 1:
			continue
		_wall_bay(ctx, ti, un2, wall_bays)


## No rock to let one into: it stands against the room's wall instead, with clear floor in front and to both sides.
static func _wall_bay(ctx: GenContext, ti: int, un2: int, wall_bays: Dictionary) -> void:
	var g := ctx.g
	var t: Dictionary = ctx.things[ti]
	if not wall_bays.has(un2):
		wall_bays[un2] = []
		for y in range(2, ctx.H - 2):
			for x in range(2, ctx.W - 2):
				if ctx.room_of[y][x] == un2 and g[y][x] == ".":
					wall_bays[un2].append(Vector2i(x, y))
		ctx.shuffle(wall_bays[un2])
	for c in wall_bays[un2]:
		if not ctx.plain(c):
			continue
		var wd2 := -1
		var ok := true
		for d in 4:
			var n: Vector2i = c + DIRS[d]
			if g[n.y][n.x] == "#":
				ok = ok and wd2 < 0
				wd2 = d
			elif g[n.y][n.x] != "." or ctx.room_of[n.y][n.x] != un2 or not ctx.plain(n):
				ok = false
		if not ok or wd2 < 0:
			continue
		ctx.used[c] = true
		ctx.used[c - DIRS[wd2]] = true
		ctx.things[ti] = {"at": [c.x, c.y], "station": ctx.stations[t["actor"]], "actor": t["actor"], "face": NAMES[(wd2 + 2) % 4], "shut": ctx.rng.randf() < ctx.hibernate,
			"blocks": true}
		break
