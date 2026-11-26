extends RefCounted
## RoomJoins - the rooms generator's rooms and corridors on a layout form (RoomForms, SPEC 6.2): each of the form's
## places gets a room near it, and the corridors join them as the form says. How faithfully is the context's "follow"
## (0 to 1: the params' "follow", or a written installation's setting's), so a form can be kept to slavishly or only
## loosely, each choice drawn on its own:
##   - where a room goes: a cell or so from its place at 1; at 0 anywhere on the map (jittered by up to half the map's
##     longer side, times 1 - follow);
##   - who it is joined from: the room the form says, at the follow's chance; else any room before it (never the core),
##     so the tree is rewired;
##   - how the corridor goes: round every other room, at the follow's chance (so it joins only the two rooms it is
##     for); else straight across, along one side and then the other, through whatever is in the way (as the scatter
##     carves, adding joins the form never meant);
##   - the form's ways round: each at the follow's chance; and at 1 - follow of the shapes' "loops" more, at random.
## A corridor never cuts through the core's walls but its own: one that would is routed round, or the try fails at
## the doors and the seed after it is tried. Every number comes from the context's generator, in a fixed order.
class_name RoomJoins

const DIRS := GenContext.DIRS
const TRIES := 80                # places looked at for a room before it goes anywhere it fits
const HUG := 3.0                 # what a corridor pays to run along its own rooms' walls, so it leaves them square


## A room for each of the form's places, in order (unit i for node i; the core last). False if one finds no room.
static func units(ctx: GenContext) -> bool:
	var nodes: Array = ctx.graph.get("nodes", [])
	var spread := 1.0 + (1.0 - ctx.follow) * maxf(ctx.W, ctx.H) * 0.5
	for i in nodes.size():
		var nd: Dictionary = nodes[i]
		var size := RoomJoins._size(ctx, nd)
		var want := Vector2i(roundi(1 + nd["at"].x * (ctx.W - 2)), roundi(1 + nd["at"].y * (ctx.H - 2)))
		var r := RoomJoins._spot(ctx, want, size, spread)
		if r.size.x == 0:
			return false
		ctx.rects.append(r)
		ctx.shape.append("rect")
		ctx.group_of.append(int(nd.get("group", -1)))
		if nd.get("hall", false):
			ctx.whole[i] = true
		if nd.get("tall", false):
			ctx.tall[i] = true
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				ctx.g[y][x] = "."
				ctx.room_of[y][x] = i
	ctx.last = nodes.size() - 1
	return nodes.size() >= 3


## A room's size: a hall's big; any other's as the scatter's (more often roomy than poky).
static func _size(ctx: GenContext, nd: Dictionary) -> Vector2i:
	if nd.get("hall", false):
		return Vector2i(ctx.rng.randi_range(7, 9), ctx.rng.randi_range(7, 8))
	var w := ctx.rng.randi_range(3, 8)
	var h := ctx.rng.randi_range(3, 7)
	if ctx.rng.randf() < 0.5:
		w = maxi(w, 5)
		h = maxi(h, 5)
	return Vector2i(w, h)


## Where a room of `size` goes near `want`: within `spread` of it, looking further each time it does not fit, then
## anywhere it fits; never closer than a wall (or two) to another. Rect2i() if nowhere.
static func _spot(ctx: GenContext, want: Vector2i, size: Vector2i, spread: float) -> Rect2i:
	for k in TRIES * 2:
		var rad := roundi(spread + k * 0.35) if k < TRIES else maxi(ctx.W, ctx.H)
		var c := want + Vector2i(ctx.rng.randi_range(-rad, rad), ctx.rng.randi_range(-rad, rad))
		var p := Vector2i(clampi(c.x - size.x / 2, 1, ctx.W - size.x - 1), clampi(c.y - size.y / 2, 1, ctx.H - size.y - 1))
		var r := Rect2i(p, size)
		var gap := 1 if ctx.rng.randf() < ctx.sh.get("close", 0.5) else 2
		if not ctx.rects.any(func(o: Rect2i) -> bool: return r.grow(gap).intersects(o)):
			return r
	return Rect2i()


## The corridors: the form's tree (each edge as the form has it, or rewired), its ways round, and the random ones the
## follow leaves room for.
static func corridors(ctx: GenContext) -> void:
	for e in ctx.graph.get("edges", []):
		var a: int = e[0]
		var b: int = e[1]
		if ctx.rng.randf() >= ctx.follow and b > 1:
			a = ctx.rng.randi_range(0, b - 1)          # (the core is the last: never one to be joined from)
		RoomJoins._join(ctx, a, b)
	for lp in ctx.graph.get("loops", []):
		if ctx.rng.randf() < ctx.follow:
			RoomJoins._join(ctx, lp[0], lp[1])
	for k in roundi((1.0 - ctx.follow) * float(ctx.sh.get("loops", 2))):
		var a2 := ctx.rng.randi_range(0, ctx.last - 1)
		var b2 := ctx.rng.randi_range(0, ctx.last - 1)
		if a2 != b2:
			RoomJoins._join(ctx, a2, b2)


## One corridor from room a to room b: round the other rooms at the follow's chance, else straight (see the top of
## this file). A straight one that would cut the core's walls goes the other way about, or round.
static func _join(ctx: GenContext, a: int, b: int) -> void:
	var by_core := a == ctx.last or b == ctx.last
	if ctx.rng.randf() >= ctx.follow:
		var y_first := ctx.rng.randf() < 0.5
		for flip in [y_first, not y_first]:
			if by_core or RoomJoins._straight(ctx, a, b, flip, true):
				RoomJoins._straight(ctx, a, b, flip, false)
				return
	var path := RoomJoins._round(ctx, a, b)
	for c in path:
		if ctx.g[c.y][c.x] == "#":
			ctx.g[c.y][c.x] = "."
	if path.is_empty():
		RoomJoins._straight(ctx, a, b, false, false)  # nothing goes round: straight, and the doors will tell


## Carve straight from a's middle to b's, along x first (or y with `y_first`). `dry`: carve nothing, only say whether
## it keeps clear of the core.
static func _straight(ctx: GenContext, a: int, b: int, y_first: bool, dry: bool) -> bool:
	var p: Vector2i = ctx.rects[a].get_center()
	var q: Vector2i = ctx.rects[b].get_center()
	var keep: Rect2i = ctx.rects[ctx.last].grow(1)
	while p != q:
		if (y_first and p.y != q.y) or p.x == q.x:
			p.y += signi(q.y - p.y)
		else:
			p.x += signi(q.x - p.x)
		if dry:
			if keep.has_point(p):
				return false
		elif ctx.g[p.y][p.x] == "#":
			ctx.g[p.y][p.x] = "."
	return true


## The cheapest way from a's middle to b's that keeps a wall's breadth from every other room (the core too): through
## rock, along corridors already cut (cheaper, so they join up), and only reluctantly along a's and b's own walls.
## [] if there is none.
static func _round(ctx: GenContext, a: int, b: int) -> Array:
	var grid := AStarGrid2D.new()
	grid.region = Rect2i(0, 0, ctx.W, ctx.H)
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	grid.default_compute_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	grid.update()
	for y in ctx.H:
		for x in ctx.W:
			var c := Vector2i(x, y)
			if x == 0 or y == 0 or x == ctx.W - 1 or y == ctx.H - 1:
				grid.set_point_solid(c)
			else:
				grid.set_point_weight_scale(c, 1.0 if ctx.g[y][x] != "#" else 2.0)
	for i in ctx.rects.size():
		var r: Rect2i = ctx.rects[i].grow(1)
		for y in range(maxi(0, r.position.y), mini(ctx.H, r.end.y)):
			for x in range(maxi(0, r.position.x), mini(ctx.W, r.end.x)):
				var c := Vector2i(x, y)
				if i != a and i != b:
					grid.set_point_solid(c)
				elif not ctx.rects[i].has_point(c) and not grid.is_point_solid(c):
					grid.set_point_weight_scale(c, HUG)
	var from: Vector2i = ctx.rects[a].get_center()
	var to: Vector2i = ctx.rects[b].get_center()
	if grid.is_point_solid(from) or grid.is_point_solid(to):
		return []
	return grid.get_id_path(from, to)
