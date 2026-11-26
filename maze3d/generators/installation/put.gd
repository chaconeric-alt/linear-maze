extends RefCounted
## InstallationPut - a written room's things put into a room of the rooms generator's (InstallationPlace), by the rules
## ProgrammeFill keeps on a programme's rooms (SPEC 6.3, 6.4): a thing that says "at": "wall" stands on a free cell
## against a wall (a panel, a container, a station), anything else on any free cell; "count" makes several, and an
## "actor", "item" or "prop" that lists several is one of them each time. Free floor is the room's own floor, not a
## ramp or a cut corner, not beside a doorway, with nothing on it yet. A prop with no "face" of its own turns to the
## room: against a wall, its back to it and pushed back by its depth (a station only turns: it fills its cell); out on
## the floor, facing the middle. The wall behind it gets no window. An actor that patrols "room" walks a beat round
## the room's corners. The quiet rooms are dressed in their corners (dress). Every number comes from the context's
## stream as InstallationPlace has set it for the room.
class_name InstallationPut

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES


## The room's floor: its cells of plain floor, of its own unit, not a ramp or a cut corner.
static func floor_of(ctx: GenContext, a: Dictionary) -> Array:
	var r: Rect2i = a["rect"]
	var out: Array = []
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			if ctx.g[y][x] == "." and ctx.room_of[y][x] == a["unit"] and not ctx.taken.has(Vector2i(x, y)):
				out.append(Vector2i(x, y))
	return out


## One of a room's things (several with "count") put in it. False if the room has no free floor left for it.
static func put(ctx: GenContext, a: Dictionary, t: Dictionary) -> bool:
	for n in int(t.get("count", 1)):
		var e: Dictionary = t.duplicate(true)
		e.erase("count")
		for k in ["actor", "item", "prop"]:
			if e.get(k) is Array and not e[k].is_empty():
				e[k] = e[k][ctx.rng.randi() % e[k].size()]
		var at := InstallationPut._spot(ctx, a, str(t.get("at", "")) == "wall")
		if at.x < 0:
			return false
		e["at"] = [at.x, at.y]
		var model := str(e.get("prop", e.get("station", "")))     # a robot's station stands as a prop does
		if model != "" and not e.has("face"):
			InstallationPut._turn(ctx, a, at, e, model)
		if str(e.get("patrol", "")) == "room":
			e["patrol"] = InstallationPut._beat(ctx, a)
		if e.has("trap"):
			ctx.trapped[at] = true
		ctx.used[at] = true
		ctx.things.append(e)
	return true


## A free cell: against a wall if `by_wall` and the room has one free there, else any; (-1, -1) if none.
static func _spot(ctx: GenContext, a: Dictionary, by_wall: bool) -> Vector2i:
	var near := InstallationPut._by_doors(ctx)
	var free: Array = InstallationPut.floor_of(ctx, a).filter(func(c: Vector2i) -> bool: return not ctx.used.has(c) and not near.has(c))
	if by_wall:
		var walled: Array = free.filter(func(c: Vector2i) -> bool: return InstallationPut._wall(ctx, c) >= 0)
		free = walled if not walled.is_empty() else free
	if free.is_empty():
		return Vector2i(-1, -1)
	return free[ctx.rng.randi() % free.size()]


## The direction of a wall beside the cell (solid rock, not a doorway), or -1.
static func _wall(ctx: GenContext, c: Vector2i) -> int:
	for d in 4:
		var n: Vector2i = c + DIRS[d]
		if ctx.g[n.y][n.x] == "#":
			return d
	return -1


## The cells beside a doorway, and the cell just inside each: kept clear so every way in stays open.
static func _by_doors(ctx: GenContext) -> Dictionary:
	var near := {}
	for dc in ctx.door_cells:
		var q: Vector2i = dc[0]
		for d in DIRS:
			near[q + d] = true
		near[q + DIRS[dc[1]] * 2] = true
	return near


## A prop turned to the room it stands in (see the top of this file). One the level hangs on a wall itself is left be.
static func _turn(ctx: GenContext, a: Dictionary, at: Vector2i, e: Dictionary, model: String) -> void:
	var meta: Dictionary = LM.model_meta(ctx.kit_name, model)
	if meta.get("mount", "") == "wall":
		return
	var d := InstallationPut._wall(ctx, at)
	if d >= 0:
		e["face"] = NAMES[(d + 2) % 4]
		ctx.no_win[at + DIRS[d]] = true
		if e.has("station"):                          # a bay that fills its cell: its back is on the wall already
			e["blocks"] = true
			return
		var depth := float(meta.get("solid", [1.0, 1.0, 1.0])[2])
		var push := maxf(0.0, 2.0 - depth / 2.0 - 0.12)
		e["offset"] = [DIRS[d].x * push, 0, DIRS[d].y * push]
		return
	var v := Vector2((a["rect"] as Rect2i).get_center()) - Vector2(at)
	if absf(v.x) > absf(v.y):
		e["face"] = "e" if v.x > 0 else "w"
	else:
		e["face"] = "s" if v.y >= 0 else "n"


## A beat round the room: its corners, one cell in where it is wide enough, each moved to the nearest floor of the room
## (a corner can be cut, or a ramp).
static func _beat(ctx: GenContext, a: Dictionary) -> Array:
	var r: Rect2i = a["rect"]
	var p := r.position + Vector2i(1 if r.size.x > 2 else 0, 1 if r.size.y > 2 else 0)
	var q := r.end - Vector2i(2 if r.size.x > 2 else 1, 2 if r.size.y > 2 else 1)
	var out: Array = []
	for c in [p, Vector2i(q.x, p.y), q, Vector2i(p.x, q.y)]:
		var f: Vector2i = ctx.clear(c)
		if ctx.g[f.y][f.x] != "#":
			out.append([f.x, f.y])
	return out


## A quiet room's dressing: up to three of `props` in its corners and nooks (floor with wall on two sides or more),
## where they block no way through.
static func dress(ctx: GenContext, a: Dictionary, props: Array) -> void:
	if props.is_empty():
		return
	var near := InstallationPut._by_doors(ctx)
	var n := 0
	for c in InstallationPut.floor_of(ctx, a):
		var solid := 0
		for d in DIRS:
			solid += 1 if ctx.g[c.y + d.y][c.x + d.x] == "#" else 0
		if n >= 3 or solid < 2 or ctx.used.has(c) or near.has(c) or ctx.rng.randf() >= 0.55:
			continue
		n += 1
		ctx.used[c] = true
		ctx.things.append({"at": [c.x, c.y], "prop": props[ctx.rng.randi() % props.size()], "blocks": false, "turn": ctx.rng.randi() % 4 * 90})
