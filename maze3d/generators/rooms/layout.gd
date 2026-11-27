extends RefCounted
## The rooms generator's first stages: where the units go, the shape of each room, the areas inside them, the
## corridors, and the doors on the thresholds. Every stage takes the GenContext and adds to it.

const DIRS := GenContext.DIRS
const CORNERS := GenContext.CORNERS


## Units: boxes scattered over the map, never closer than a wall (or two) apart. The second, and one about halfway,
## are halls: the big rooms, for the showpieces. Fails if fewer than three fit. On a layout form, a room at each of
## its places instead (RoomJoins).
static func units(ctx: GenContext) -> bool:
	if ctx.form != "":
		return RoomJoins.units(ctx)
	var rng := ctx.rng
	var sh := ctx.sh
	var rects := ctx.rects
	var tries := 0
	var want: int = int(ctx.p.get("rooms", 10))
	while rects.size() < want and tries < 500:
		tries += 1
		var w := rng.randi_range(3, 8)
		var h := rng.randi_range(3, 7)
		if rng.randf() < 0.5:                             # more often roomy than poky
			w = maxi(w, 5)
			h = maxi(h, 5)
		var hall: bool = sh.get("hall", true) and tries < 160 and (rects.size() == 1 or (rects.size() == want / 2 + 1 and rng.randf() < 0.6))
		if hall:                                          # the big rooms, for the showpieces
			w = rng.randi_range(7, 9)
			h = rng.randi_range(7, 8)
		var r := Rect2i(rng.randi_range(1, ctx.W - w - 1), rng.randi_range(1, ctx.H - h - 1), w, h)
		var gap := 1 if rng.randf() < sh.get("close", 0.5) else 2
		var ok := true
		for o in rects:
			if r.grow(gap).intersects(o):
				ok = false
				break
		if not ok:
			continue
		rects.append(r)
		ctx.shape.append("rect")
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				ctx.g[y][x] = "."
				ctx.room_of[y][x] = rects.size() - 1
	if rects.size() < 3:
		return false
	ctx.last = rects.size() - 1
	return true


static func _fill(ctx: GenContext, x: int, y: int) -> void:
	ctx.g[y][x] = "#"
	ctx.room_of[y][x] = -1


## The shape of each room. Only ever cuts corners, so the middle row and column stay open.
static func shapes(ctx: GenContext) -> void:
	var rng := ctx.rng
	for i in range(1, ctx.rects.size()):
		var r: Rect2i = ctx.rects[i]
		var w: int = r.size.x
		var h: int = r.size.y
		if w < 5 or h < 5 or rng.randf() >= ctx.sh.get("fancy", 0.8):
			continue
		var pick: Array = ["oct", "oct", "ell", "cross"]
		if w >= 6 and h >= 6:
			pick.append_array(["round", "round", "piers"])
		if maxi(w, h) >= 7 and i != ctx.last and not ctx.whole.has(i):
			pick.append_array(["suite", "suite"])
		var s: String = pick[rng.randi() % pick.size()]
		if s == "suite" and rng.randf() >= ctx.sh.get("suite", 1.0):
			s = "oct"
		ctx.shape[i] = s
		match s:
			"ell":                                        # one corner block filled in
				var cw := rng.randi_range(1, (w - 1) / 2)
				var ch := rng.randi_range(1, (h - 1) / 2)
				var cn: Array = CORNERS[rng.randi() % 4]
				for dy in ch:
					for dx in cw:
						_fill(ctx, r.position.x + dx if cn[1] == 0 else r.end.x - 1 - dx, r.position.y + dy if cn[2] == 0 else r.end.y - 1 - dy)
			"cross":                                      # all four
				var cw2 := rng.randi_range(1, maxi(1, (w - 3) / 2))
				var ch2 := rng.randi_range(1, maxi(1, (h - 3) / 2))
				for cn2 in CORNERS:
					for dy in ch2:
						for dx in cw2:
							_fill(ctx, r.position.x + dx if cn2[1] == 0 else r.end.x - 1 - dx, r.position.y + dy if cn2[2] == 0 else r.end.y - 1 - dy)
			"round":                                      # corner cell gone; the two beside it are cut across later
				for cn3 in CORNERS:
					_fill(ctx, r.position.x if cn3[1] == 0 else r.end.x - 1, r.position.y if cn3[2] == 0 else r.end.y - 1)
			"piers":                                      # four piers one cell in from the corners, and more down the long sides
				var xs: Array = [1, w - 2]
				var ys: Array = [1, h - 2]
				if w >= 9:
					xs.append_array([3, w - 4])
				if h >= 9:
					ys.append_array([3, h - 4])
				for py in ys:
					for px in xs:
						if px != w / 2 and py != h / 2:
							_fill(ctx, r.position.x + px, r.position.y + py)


## Areas: what gets a style, a height and furniture. A suite is one unit and two areas, with a thin wall between them
## that has an opening and, here and there, windows.
static func areas(ctx: GenContext) -> void:
	var rng := ctx.rng
	for i in ctx.rects.size():
		var r: Rect2i = ctx.rects[i]
		if ctx.shape[i] != "suite":
			ctx.areas.append({"unit": i, "rect": r})
			continue
		var across: bool = r.size.x >= r.size.y           # split across the long way
		var L: int = r.size.x if across else r.size.y
		var cut := rng.randi_range(3, L - 3)              # cells in the first room
		var n: int = r.size.y if across else r.size.x
		var gap_at := rng.randi_range(0, n - 1)
		var gap_n := 1 if n < 5 else rng.randi_range(1, 2)
		for k in n:
			if k >= gap_at and k < gap_at + gap_n:
				continue
			var c: Vector2i = r.position + (Vector2i(cut - 1, k) if across else Vector2i(k, cut - 1))
			ctx.walls.append({"at": [c.x, c.y], "side": "e" if across else "s", "kind": "window" if rng.randf() < 0.45 else "wall"})
		if across:
			ctx.areas.append({"unit": i, "rect": Rect2i(r.position, Vector2i(cut, r.size.y))})
			ctx.areas.append({"unit": i, "rect": Rect2i(r.position + Vector2i(cut, 0), Vector2i(r.size.x - cut, r.size.y))})
		else:
			ctx.areas.append({"unit": i, "rect": Rect2i(r.position, Vector2i(r.size.x, cut))})
			ctx.areas.append({"unit": i, "rect": Rect2i(r.position + Vector2i(0, cut), Vector2i(r.size.x, r.size.y - cut))})
	_style_areas(ctx)


## Each area's style and height, and its entry in the level's rooms. Big rooms are often tall.
static func _style_areas(ctx: GenContext) -> void:
	var rng := ctx.rng
	var seen_style := {}
	var suite_h := {}
	for a in ctx.areas:
		var r: Rect2i = a["rect"]
		var big: bool = r.size.x >= 5 and r.size.y >= 5
		var grand: bool = r.size.x >= 7 and r.size.y >= 7
		var hgt := 1
		if grand:
			hgt = 3 if rng.randf() < ctx.sh.get("tall", 0.65) else 2
		elif big and rng.randf() < 0.55:
			hgt = 3 if (r.size.x >= 6 and r.size.y >= 6 and rng.randf() < ctx.sh.get("tall", 0.65) * 0.6) else 2
		elif r.get_area() >= 12 and rng.randf() < 0.2:
			hgt = 2
		if ctx.tall.has(a["unit"]):                       # a stack's atrium: three storeys whatever its size
			hgt = 3
		if suite_h.has(a["unit"]):                        # the two halves of a suite share a ceiling: nothing closes the gap above a lower one
			hgt = suite_h[a["unit"]]
		elif ctx.shape[a["unit"]] == "suite":
			hgt = mini(hgt, 2)
			suite_h[a["unit"]] = hgt
		var st: String = ctx.styles[rng.randi() % ctx.styles.size()]
		seen_style[st] = seen_style.get(st, 0) + 1
		a["style"] = st
		a["height"] = hgt
		ctx.rooms.append({"name": "%s %d" % [st.capitalize(), seen_style[st]], "rect": [r.position.x, r.position.y, r.size.x, r.size.y], "style": st, "height": hgt, "quiet": true})
		a["room"] = ctx.rooms.size() - 1


## Carve a corridor from a to b, along x first. dry: carve nothing, only say whether it would stay clear of the last room.
static func _carve(ctx: GenContext, a: Vector2i, b: Vector2i, dry: bool) -> bool:
	var x := a.x
	var y := a.y
	var keep: Rect2i = ctx.rects[ctx.last].grow(1)
	while x != b.x or y != b.y:
		if x != b.x:
			x += signi(b.x - x)
		else:
			y += signi(b.y - y)
		if dry:
			if keep.has_point(Vector2i(x, y)):
				return false
		elif ctx.g[y][x] == "#":
			ctx.g[y][x] = "."
	return true


## Corridors: carve only; doors come afterwards. Each unit joins the one before it, and a few loops are added. On a
## layout form, as the form joins them (RoomJoins).
static func corridors(ctx: GenContext) -> void:
	if ctx.form != "":
		RoomJoins.corridors(ctx)
		return
	var rects := ctx.rects
	for i in range(1, rects.size()):
		_carve(ctx, rects[i - 1].get_center(), rects[i].get_center(), false)
	for k in int(ctx.sh.get("loops", 2)):                 # more than one way round, but never a second way into the last room
		if ctx.last < 3:
			break
		var a2 := ctx.rng.randi_range(0, ctx.last - 1)
		var b2 := ctx.rng.randi_range(0, ctx.last - 1)
		if absi(a2 - b2) < 2:
			continue
		if _carve(ctx, rects[a2].get_center(), rects[b2].get_center(), true):
			_carve(ctx, rects[a2].get_center(), rects[b2].get_center(), false)


## Thresholds: doors, then where the red card can go. Fails if a corridor leaks into the last room or there is
## nowhere to put the card, or, with a gate, if anything past it or in a locked wing can be walked to from the way in
## without its doors or the way round.
static func thresholds(ctx: GenContext) -> bool:
	for i in ctx.doors.size():
		ctx.legend[ctx.letters[i]] = {"door": ctx.doors[i]}
		ctx.legend[ctx.letters[i].to_lower()] = {"door": ctx.doors[i], "jammed": true}
	ctx.legend["Z"] = {"door": "door_vault", "lock": "red"}
	ctx.legend["~"] = {"fluid": true}
	_doors(ctx)
	return _key_room(ctx) and _sides_hold(ctx)


## A door only ever goes on a corridor cell with a room on one side, open floor on the other and solid wall to both
## flanks, never two back to back. The ones into the last room are the vault door. With sides (a gate, a locked wing)
## the locked doors go in first, so a door beside one never takes its place.
static func _doors(ctx: GenContext) -> void:
	if not ctx.region.is_empty():
		_door_pass(ctx, true)
	_door_pass(ctx, false)


## One pass of _doors: only the locked doors (`locked_only`), or every door.
static func _door_pass(ctx: GenContext, locked_only: bool) -> void:
	var g := ctx.g
	var room_of := ctx.room_of
	var rng := ctx.rng
	for y in range(1, ctx.H - 1):
		for x in range(1, ctx.W - 1):
			if g[y][x] != "." or room_of[y][x] >= 0:
				continue
			var q := Vector2i(x, y)
			for d in 2:               # d = 0: passage runs north-south; 1: east-west
				var f: Vector2i = DIRS[d]
				var s: Vector2i = DIRS[d + 1]
				if g[y + f.y][x + f.x] == "#" or g[y - f.y][x - f.x] == "#" or g[y + s.y][x + s.x] != "#" or g[y - s.y][x - s.x] != "#":
					continue
				var ra: int = room_of[y + f.y][x + f.x]
				var rb: int = room_of[y - f.y][x - f.x]
				if ra < 0 and rb < 0:
					continue
				if GenContext.is_door(g, q + f) or GenContext.is_door(g, q - f):      # never two doors back to back
					continue
				var into := d if ra >= 0 else d + 2
				var guards_last := ra == ctx.last or rb == ctx.last
				var locked := _locked_door(ctx, q, ra, rb)
				if guards_last and ctx.lock:
					g[y][x] = "Z"
				elif locked != "":
					g[y][x] = locked
				elif locked_only:
					continue
				elif rng.randf() < 0.85:
					var ch: String = ctx.letters[rng.randi() % ctx.doors.size()]
					g[y][x] = ch.to_lower() if rng.randf() < ctx.sh.get("jammed", 0.08) else ch
				else:
					continue
				ctx.door_cells.append([q, into, guards_last])


## The letter of a locked door between rooms ra and rb (or a room and corridor cell q): the gate's, into its room
## from anywhere; a locked wing's, into one of its rooms from outside it; "" for none of them.
static func _locked_door(ctx: GenContext, q: Vector2i, ra: int, rb: int) -> String:
	if ctx.region.is_empty():
		return ""
	if ctx.gate >= 0 and (ra == ctx.gate or rb == ctx.gate):
		return GenContext.GATE_DOOR
	var sides: Array = [ra, rb].map(func(u: int) -> int: return ctx.region[u] if u >= 0 else int(ctx.corr_region.get(q, -1)))
	if sides.has(GenContext.WING) and sides.any(func(r: int) -> bool: return r != GenContext.WING):
		return GenContext.WING_DOOR
	return ""


## With sides (the context's region): from the way in, with the gate's doors, the locked wing's, the vault's and the
## way round shut, only rooms of the near side are reached; and the way round has cells of its own, if the form has one.
static func _sides_hold(ctx: GenContext) -> bool:
	if ctx.region.is_empty():
		return true
	if ctx.graph.has("round") and ctx.round_cells.is_empty():
		return false
	var shut := {}
	if not ctx.round_cells.is_empty():
		shut[ctx.round_cells[ctx.round_cells.size() / 2]] = true
	var seen := {ctx.start: true}
	var todo: Array = [ctx.start]
	while not todo.is_empty():
		var c: Vector2i = todo.pop_back()
		var u: int = ctx.room_of[c.y][c.x]
		if u >= 0 and ctx.region[u] != GenContext.NEAR:
			return false
		for d in DIRS:
			var n: Vector2i = c + d
			var ch: String = ctx.g[n.y][n.x]
			if seen.has(n) or shut.has(n) or ch == "#" or ch == "Z" or ch == GenContext.GATE_DOOR or ch == GenContext.WING_DOOR:
				continue
			seen[n] = true
			todo.append(n)
	return true


## The red card has to be findable without going through the vault door.
static func _key_room(ctx: GenContext) -> bool:
	var g := ctx.g
	var rects := ctx.rects
	ctx.start = rects[0].get_center()
	ctx.seen = {ctx.start: true}
	var seen := ctx.seen
	var queue: Array = [ctx.start]
	while not queue.is_empty():
		var c: Vector2i = queue.pop_back()
		for d in DIRS:
			var n: Vector2i = c + d
			if seen.has(n) or g[n.y][n.x] == "#" or g[n.y][n.x] == "Z":
				continue
			seen[n] = true
			queue.append(n)
	var key_rooms: Array = []
	for i in range(1, ctx.last):
		if seen.has(rects[i].get_center()):
			key_rooms.append(i)
	if ctx.lock and (seen.has(rects[ctx.last].get_center()) or key_rooms.is_empty()):
		return false          # a corridor leaks into the last room, or nowhere to put the card: try another layout
	ctx.key_room = key_rooms[ctx.rng.randi() % key_rooms.size()] if not key_rooms.is_empty() else 1
	return true
