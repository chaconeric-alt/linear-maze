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
## the doors and the seed after it is tried. With a gate or a locked wing (the context's "region", RoomFormGate) each
## corridor belongs to a side and keeps a wall's breadth from every room and corridor of another, straight or round, and
## is rewired or looped only within its side; the way round is carved last, round everything, its own. Every number
## comes from the context's generator, in a fixed order.
class_name RoomJoins

const DIRS := GenContext.DIRS
const TRIES := 80                # places looked at for a room before it goes anywhere it fits
const HUG := 3.0                 # what a corridor pays to run along its own rooms' walls, so it leaves them square
const SIDED := 0.35              # with a gate, how far a room may stray from its place, at follow 0, as a share of the
                                 # map's longer side (else half): far enough to lose the form, not to mix the two sides


## A room for each of the form's places, in order (unit i for node i; the core last). False if one finds no room.
static func units(ctx: GenContext) -> bool:
	var nodes: Array = ctx.graph.get("nodes", [])
	var spread := 1.0 + (1.0 - ctx.follow) * maxf(ctx.W, ctx.H) * (0.5 if ctx.region.is_empty() else SIDED)
	for i in nodes.size():
		var nd: Dictionary = nodes[i]
		var size := RoomJoins._size(ctx, nd)
		var want := Vector2i(roundi(1 + nd["at"].x * (ctx.W - 2)), roundi(1 + nd["at"].y * (ctx.H - 2)))
		var r := RoomJoins._spot(ctx, want, size, spread, RoomJoins._sides_of_spot(ctx, i))
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
## anywhere it fits; never closer than a wall (or two) to another. With sides (`sides`: the regions the room placed
## nearest it may be of), only where the nearest is one of them, so each side's rooms keep together; failing that,
## the first place that fits. Rect2i() if nowhere.
static func _spot(ctx: GenContext, want: Vector2i, size: Vector2i, spread: float, sides: Array = []) -> Rect2i:
	var first := Rect2i()
	for k in TRIES * 2:
		var rad := roundi(spread + k * 0.35) if k < TRIES else maxi(ctx.W, ctx.H)
		var c := want + Vector2i(ctx.rng.randi_range(-rad, rad), ctx.rng.randi_range(-rad, rad))
		var p := Vector2i(clampi(c.x - size.x / 2, 1, ctx.W - size.x - 1), clampi(c.y - size.y / 2, 1, ctx.H - size.y - 1))
		var r := Rect2i(p, size)
		var gap := 1 if ctx.rng.randf() < ctx.sh.get("close", 0.5) else 2
		if not ctx.rects.any(func(o: Rect2i) -> bool: return r.grow(gap).intersects(o)):
			if sides.is_empty() or sides.has(RoomJoins._nearest_side(ctx, r)):
				return r
			first = r if first.size.x == 0 else first
	return first


## The sides the room placed nearest node i may be of, so its side keeps together: its own, or that of the node the
## form joins it from (the gate's for the first room past it); [] with no sides, or for the first room.
static func _sides_of_spot(ctx: GenContext, i: int) -> Array:
	if ctx.region.is_empty() or i == 0:
		return []
	var out: Array = [ctx.region[i]]
	for e in ctx.graph.get("edges", []):
		if int(e[1]) == i and not out.has(ctx.region[e[0]]):
			out.append(ctx.region[e[0]])
	return out


## The side of the placed room nearest box r (by the distance between the boxes).
static func _nearest_side(ctx: GenContext, r: Rect2i) -> int:
	var best := -1
	var bd := 1 << 30
	for j in ctx.rects.size():
		var o: Rect2i = ctx.rects[j]
		var d := maxi(0, maxi(o.position.x - r.end.x, r.position.x - o.end.x)) + maxi(0, maxi(o.position.y - r.end.y, r.position.y - o.end.y))
		if d < bd:
			bd = d
			best = j
	return ctx.region[best] if best >= 0 else -1


## The corridors: the form's tree (each edge as the form has it, or rewired), its ways round, and the random ones the
## follow leaves room for.
static func corridors(ctx: GenContext) -> void:
	var reg: Array = ctx.region
	if not reg.is_empty():
		RoomJoins._turf(ctx)
	for e in ctx.graph.get("edges", []):
		var a: int = e[0]
		var b: int = e[1]
		if ctx.rng.randf() >= ctx.follow and b > 1:
			var a2 := ctx.rng.randi_range(0, b - 1)    # (the core is the last: never one to be joined from)
			a = a2 if reg.is_empty() or reg[a2] == reg[a] else a       # (only from the same side)
		RoomJoins._join(ctx, a, b)
	for lp in ctx.graph.get("loops", []):
		if ctx.rng.randf() < ctx.follow:
			RoomJoins._join(ctx, lp[0], lp[1])
	for k in roundi((1.0 - ctx.follow) * float(ctx.sh.get("loops", 2))):
		var a2 := ctx.rng.randi_range(0, ctx.last - 1)
		var b2 := ctx.rng.randi_range(0, ctx.last - 1)
		if a2 != b2 and (reg.is_empty() or reg[a2] == reg[b2]):
			RoomJoins._join(ctx, a2, b2)
	var rd: Array = ctx.graph.get("round", [])
	if rd.size() == 2:
		RoomJoins._way_round(ctx, rd[0], rd[1])


## One corridor from room a to room b: round the other rooms at the follow's chance, else straight (see the top of
## this file). A straight one that would cut the core's walls goes the other way about, or round. With sides, one
## that is not kept to and cannot go straight without meeting the other side goes through its own side's rooms, on
## its own ground (the turf); the gate's own corridors never go straight (one could open its walls too wide for a
## door); and where nothing goes round, one goes through its own side's rooms before it goes straight.
static func _join(ctx: GenContext, a: int, b: int) -> void:
	var by_core := a == ctx.last or b == ctx.last
	var rg := RoomJoins._side_of(ctx, a, b)
	var by_gate := ctx.gate >= 0 and (a == ctx.gate or b == ctx.gate)
	var path: Array = []
	if ctx.rng.randf() >= ctx.follow:
		var y_first := ctx.rng.randf() < 0.5
		for flip in ([] if by_gate else [y_first, not y_first]):
			if (by_core and rg < 0) or RoomJoins._straight(ctx, a, b, flip, true, rg, by_core):
				RoomJoins._straight(ctx, a, b, flip, false, rg)
				return
		if rg >= 0:
			path = RoomJoins._round(ctx, a, b, rg, true, false, true)
	if path.is_empty():
		path = RoomJoins._round(ctx, a, b, rg)
	if path.is_empty() and rg >= 0:
		path = RoomJoins._round(ctx, a, b, rg, true)
	RoomJoins._carve(ctx, path, rg)
	if path.is_empty():
		RoomJoins._straight(ctx, a, b, false, false, rg)  # nothing goes round: straight, and the doors will tell


## Carve straight from a's middle to b's, along x first (or y with `y_first`), as side `rg`'s (-1: no sides). `dry`:
## carve nothing, only say whether it keeps clear of the core (but for the core's own, `by_core`) and of the other
## sides' rooms and corridors.
static func _straight(ctx: GenContext, a: int, b: int, y_first: bool, dry: bool, rg := -1, by_core := false) -> bool:
	var p: Vector2i = ctx.rects[a].get_center()
	var q: Vector2i = ctx.rects[b].get_center()
	var keep: Rect2i = ctx.rects[ctx.last].grow(1)
	while p != q:
		if (y_first and p.y != q.y) or p.x == q.x:
			p.y += signi(q.y - p.y)
		else:
			p.x += signi(q.x - p.x)
		if dry:
			if (keep.has_point(p) and not by_core) or (rg >= 0 and (RoomJoins._foreign(ctx, p, a, b, rg) or RoomJoins._off_turf(ctx, p, a, b, rg))):
				return false
		else:
			RoomJoins._carve(ctx, [p], rg)
	return true


## Cut `cells` out of the rock, each outside every room marked as side `rg`'s corridor (if there are sides).
static func _carve(ctx: GenContext, cells: Array, rg: int) -> void:
	for c in cells:
		if ctx.g[c.y][c.x] == "#":
			ctx.g[c.y][c.x] = "."
		if rg >= 0 and ctx.room_of[c.y][c.x] < 0 and not ctx.corr_region.has(c):
			ctx.corr_region[c] = rg


## The side a corridor from room a to room b belongs to: theirs if they share one; from a side into the gate's room or
## a locked wing's, the outer side's (its door into that room is the locked one); -1 with no sides.
static func _side_of(ctx: GenContext, a: int, b: int) -> int:
	if ctx.region.is_empty():
		return -1
	var ra: int = ctx.region[a]
	var rb: int = ctx.region[b]
	if ra == rb:
		return ra
	if ra == GenContext.GATE or rb == GenContext.WING:
		return rb if ra == GenContext.GATE else ra
	return ra if rb == GenContext.GATE else rb


## Each cell's nearest unit (the context's turf; by the distance to its box, the first of equals): a side's corridors
## keep to its own rooms' cells and their two rooms', so the two sides of a gate stay apart on the map (a ring of rooms
## round the far side's goes round it, not across it).
static func _turf(ctx: GenContext) -> void:
	ctx.turf = []
	for y in ctx.H:
		var row: Array = []
		for x in ctx.W:
			var best := -1
			var bd := 1 << 30
			for i in ctx.rects.size():
				var r: Rect2i = ctx.rects[i]
				var d := maxi(0, maxi(r.position.x - x, x - r.end.x + 1)) + maxi(0, maxi(r.position.y - y, y - r.end.y + 1))
				if d < bd:
					bd = d
					best = i
			row.append(best)
		ctx.turf.append(row)


## Is cell c off the ground of a corridor of side `rg` from room a to room b (the turf): nearer a room of another side
## than any of its own or a or b? The way round may cross either side's ground, but not the gate's or a locked wing's.
static func _off_turf(ctx: GenContext, c: Vector2i, a: int, b: int, rg: int) -> bool:
	if ctx.turf.is_empty():
		return false
	var u: int = ctx.turf[c.y][c.x]
	if u == a or u == b:
		return false
	var r: int = ctx.region[u]
	return r != rg if rg != GenContext.ROUND else (r != GenContext.NEAR and r != GenContext.FAR)


## Would a corridor of side `rg` at cell `c` join another side: on or beside (in 4) a corridor of another side, or a
## room of another side but a and b?
static func _foreign(ctx: GenContext, c: Vector2i, a: int, b: int, rg: int) -> bool:
	for d in [Vector2i.ZERO] + DIRS:
		var n: Vector2i = c + d
		var u: int = ctx.room_of[n.y][n.x]
		if u >= 0 and u != a and u != b and ctx.region[u] != rg:
			return true
		if u < 0 and ctx.corr_region.has(n) and int(ctx.corr_region[n]) != rg:
			return true
	return false


## The way round (RoomFormGate): from the near room a to the far room b, round every other room and a wall's breadth
## from every corridor (or if there is no such way, from every corridor but the near side's, which it may run along);
## its own cells from the last that is beside the near side to b are the context's round_cells, so sealing one cuts
## it; none if there is no way (the doors will tell).
static func _way_round(ctx: GenContext, a: int, b: int) -> void:
	var path := RoomJoins._round(ctx, a, b, GenContext.ROUND, false, true)
	if path.is_empty():
		path = RoomJoins._round(ctx, a, b, GenContext.ROUND)
	RoomJoins._carve(ctx, path, GenContext.ROUND)
	var own: Array = []
	for i in range(path.size() - 1, -1, -1):          # back from b, as far as nothing of the near side is beside it
		var c: Vector2i = path[i]
		if ctx.room_of[c.y][c.x] == b:
			continue
		if ctx.room_of[c.y][c.x] >= 0 or RoomJoins._foreign(ctx, c, -1, b, GenContext.ROUND):
			break
		own.push_front(c)
	ctx.round_cells = own


## The cheapest way from a's middle to b's that keeps a wall's breadth from every other room (the core too): through
## rock, along corridors already cut (cheaper, so they join up), and only reluctantly along a's and b's own walls;
## for side `rg`, a wall's breadth from every corridor of another (`ROUND`: from every corridor but the near side's);
## `through`: through the rooms of its own side too, but the core (the last resort before a straight one, which would
## cut through the other side's); `alone`: the way round kept from the near side's corridors as well; `on_turf`: off
## its side's ground is rock it may not cut (the turf). [] if none.
static func _round(ctx: GenContext, a: int, b: int, rg := -1, through := false, alone := false, on_turf := false) -> Array:
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
				if i != a and i != b and not (through and i != ctx.last and ctx.region[i] == rg):
					grid.set_point_solid(c)
				elif not ctx.rects[i].has_point(c) and not grid.is_point_solid(c):
					grid.set_point_weight_scale(c, HUG)
	if on_turf and rg >= 0 and not ctx.turf.is_empty():     # off its side's ground (the turf)
		for y in range(1, ctx.H - 1):
			for x in range(1, ctx.W - 1):
				if ctx.room_of[y][x] < 0 and RoomJoins._off_turf(ctx, Vector2i(x, y), a, b, rg):
					grid.set_point_solid(Vector2i(x, y))
	for c in ctx.corr_region:                      # the other sides' corridors, and a wall's breadth round them
		var other := int(ctx.corr_region[c])
		if rg >= 0 and other != rg and not (rg == GenContext.ROUND and other == GenContext.NEAR and not alone):
			for d in [Vector2i.ZERO] + DIRS:
				var n: Vector2i = c + d
				if ctx.room_of[n.y][n.x] < 0 and grid.region.has_point(n):
					grid.set_point_solid(n)
	var from: Vector2i = ctx.rects[a].get_center()
	var to: Vector2i = ctx.rects[b].get_center()
	if grid.is_point_solid(from) or grid.is_point_solid(to):
		return []
	return grid.get_id_path(from, to)
