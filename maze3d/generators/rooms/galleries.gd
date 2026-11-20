extends RefCounted
## The rooms generator's corners and galleries: corners cut across, balconies along the walls of tall rooms and the
## ramps up to them. Done before the furniture so that nothing is put where they go.

const NAMES := GenContext.NAMES
const CORNERS := GenContext.CORNERS


static func _solid(ctx: GenContext, x: int, y: int) -> bool:
	return x < 0 or y < 0 or x >= ctx.W or y >= ctx.H or ctx.g[y][x] == "#"


## Eight-sided rooms (and some plain ones) have their corners cut across; round ones the two cells beside each corner.
## Never where a door opens on to the corner.
static func cut_corners(ctx: GenContext) -> void:
	var g := ctx.g
	for i in ctx.rects.size():
		var r: Rect2i = ctx.rects[i]
		var cuts: Array = []                              # [cell, corner name, outward x, outward y]
		if ctx.shape[i] == "oct" or (ctx.shape[i] == "rect" and r.size.x >= 5 and r.size.y >= 5 and ctx.rng.randf() < ctx.sh.get("octagon", 0.4)):
			for cn in CORNERS:
				cuts.append([Vector2i(r.position.x if cn[1] == 0 else r.end.x - 1, r.position.y if cn[2] == 0 else r.end.y - 1), cn[0], cn[3], cn[4]])
		elif ctx.shape[i] == "round":
			for cn in CORNERS:
				var cx: int = r.position.x if cn[1] == 0 else r.end.x - 1
				var cy: int = r.position.y if cn[2] == 0 else r.end.y - 1
				cuts.append([Vector2i(cx - cn[3], cy), cn[0], cn[3], cn[4]])
				cuts.append([Vector2i(cx, cy - cn[4]), cn[0], cn[3], cn[4]])
		for ct in cuts:
			var c: Vector2i = ct[0]
			if g[c.y][c.x] == "." and _solid(ctx, c.x + ct[2], c.y) and _solid(ctx, c.x, c.y + ct[3]):      # no door opens on to this corner
				ctx.diags.append({"at": [c.x, c.y], "corner": ct[1]})
				ctx.taken[c] = true
				ctx.is_diag[c] = true


## Galleries: in tall rooms, balconies along one, two, three or all four walls with a ramp up; in three-storey rooms
## sometimes a second tier round the far end with its own ramp. The second unit always gets one if it can.
static func galleries(ctx: GenContext) -> void:
	for ai in ctx.areas.size():
		var a: Dictionary = ctx.areas[ai]
		var i: int = a["unit"]
		var r: Rect2i = a["rect"]
		if a["height"] < 2 or r.size.x < 5 or r.size.y < 5 or not (ctx.shape[i] in ["rect", "oct", "round"]):
			continue
		if i != 1 and ctx.rng.randf() >= ctx.sh.get("balcony", 0.7):
			continue
		_gallery(ctx, a)


## One room's gallery. Plans it in the room's own (u along the chosen wall, v out from it) frame, then places it.
static func _gallery(ctx: GenContext, a: Dictionary) -> void:
	var rng := ctx.rng
	var r: Rect2i = a["rect"]
	var side := rng.randi() % 4
	var U: int = r.size.x if side % 2 == 0 else r.size.y
	var V: int = r.size.y if side % 2 == 0 else r.size.x
	var kinds: Array = ["side", "side"]                # the more balcony, the bigger the room has to be to carry it
	if U >= 6 and V >= 6:
		kinds.append_array(["ell", "ell"])
	if U >= 7 and V >= 6:
		kinds.append_array(["you", "you"])
	if U >= 7 and V >= 7:
		kinds.append_array(["ring", "ring", "ring"])
	var kind: String = kinds[rng.randi() % kinds.size()]
	if a["height"] == 3 and V >= 7 and rng.randf() < ctx.sh.get("tiers", 0.75):
		kind = "tiers"
	var plan := _plan(kind, U, V)
	var corner_u: Array = plan["corner_u"]
	var ur := -1                                      # where the ramp from the ground comes up: off the middle line if it can be
	for cand in [U / 2 - 1, U / 2 + 1, U / 2]:
		if ur < 0 and cand >= 1 and cand <= U - 2 and not corner_u.has(cand):
			ur = cand
	if rng.randf() < 0.5 and U / 2 + 1 <= U - 2 and not corner_u.has(U / 2 + 1):
		ur = U / 2 + 1
	_place(ctx, a, side, ur, plan, V, U)


## The balcony cells of each tier, in the room's (u, v) frame: l1 the first storey, l2 the second, up2 the two cells
## of the ramp between them, corner_u where a balcony turns a corner (no ramp there).
static func _plan(kind: String, U: int, V: int) -> Dictionary:
	var l1: Dictionary = {}                           # local (u, v) -> true
	var l2: Dictionary = {}
	for u in U:
		l1[Vector2i(u, 0)] = true
	var corner_u: Array = []
	if kind in ["ell", "you", "ring"]:
		for v in V:
			l1[Vector2i(U - 1, v)] = true
		l1[Vector2i(U - 2, 1)] = true
		corner_u.append(U - 2)
	if kind in ["you", "ring"]:
		for v in V:
			l1[Vector2i(0, v)] = true
		l1[Vector2i(1, 1)] = true
		corner_u.append(1)
	if kind == "ring":
		for u in U:
			l1[Vector2i(u, V - 1)] = true
		l1[Vector2i(U - 2, V - 2)] = true
		l1[Vector2i(1, V - 2)] = true
	var up2: Array = []
	if kind == "tiers":                               # first storey along the wall and a little way down one side; a ramp on up; the second storey round the far end
		var vm := 2 if V < 9 else 3
		for v in vm:
			l1[Vector2i(U - 1, v)] = true
		l1[Vector2i(U - 2, 1)] = true
		corner_u.append(U - 2)
		up2 = [Vector2i(U - 1, vm), Vector2i(U - 1, vm + 1)]
		for v in range(vm + 2, V):
			l2[Vector2i(U - 1, v)] = true
		for u in U:
			l2[Vector2i(u, V - 1)] = true
		l2[Vector2i(U - 2, V - 2)] = true
	return {"l1": l1, "l2": l2, "up2": up2, "corner_u": corner_u}


## Put the planned gallery into the level, if its ramps land on plain floor: ramps, decks, and the places up there
## where something could stand.
static func _place(ctx: GenContext, a: Dictionary, side: int, ur: int, plan: Dictionary, V: int, U: int) -> void:
	var g := ctx.g
	var r: Rect2i = a["rect"]
	var i: int = a["unit"]
	var up2: Array = plan["up2"]
	var foot: Array = [GenContext.local(r, side, ur, 2), GenContext.local(r, side, ur, 1), GenContext.local(r, side, ur, 0)]
	var fits := true
	for c in foot:
		if g[c.y][c.x] != "." or ctx.is_diag.has(c):
			fits = false
	for c in up2:
		var c2: Vector2i = GenContext.local(r, side, c.x, c.y)
		if g[c2.y][c2.x] != "." or ctx.is_diag.has(c2):
			fits = false
	if not fits:
		return
	ctx.ramps.append({"at": [foot[0].x, foot[0].y], "dir": NAMES[side], "from": 0, "to": 2})
	ctx.ramps.append({"at": [foot[1].x, foot[1].y], "dir": NAMES[side], "from": 2, "to": 4})
	for c in [foot[0], foot[1], GenContext.local(r, side, ur, 3)]:
		ctx.taken[c] = true
	if not up2.is_empty():
		var away: String = NAMES[(side + 2) % 4]
		var c3: Vector2i = GenContext.local(r, side, up2[0].x, up2[0].y)
		var c4: Vector2i = GenContext.local(r, side, up2[1].x, up2[1].y)
		ctx.ramps.append({"at": [c3.x, c3.y], "dir": away, "from": 4, "to": 6})
		ctx.ramps.append({"at": [c4.x, c4.y], "dir": away, "from": 6, "to": 8})
	for pair in [[plan["l1"], 1], [plan["l2"], 2]]:
		for lc in pair[0]:
			var c5: Vector2i = GenContext.local(r, side, lc.x, lc.y)
			if g[c5.y][c5.x] != "." or ctx.room_of[c5.y][c5.x] != i or c5 == foot[1]:
				continue
			ctx.decks.append({"at": [c5.x, c5.y], "level": pair[1]})
			if not ctx.is_diag.has(c5) and c5 != foot[2] and (lc.y == 0 or lc.y == V - 1 or lc.x == 0 or lc.x == U - 1):
				ctx.upstairs.append([c5, pair[1], i])
