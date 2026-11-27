extends RefCounted
## The rooms generator's other floors: doors high in the wall between two halls, rooms upstairs (through a door off a
## balcony, or reached only by a lift), and a basement of chambers under the place with a lift down and pits above.

const DIRS := GenContext.DIRS
const NAMES := GenContext.NAMES


static func storeys(ctx: GenContext) -> void:
	_prepare(ctx)
	var n_up_doors := _upper_doors(ctx)
	var n_up_rooms := _upper_rooms(ctx)
	n_up_rooms = _lift_rooms(ctx, n_up_rooms)
	if n_up_doors + n_up_rooms > 0:
		ctx.storeys.append({"level": 1, "map": GenContext.rows(ctx.up), "rooms": ctx.up_rooms})
	if ctx.rng.randf() < ctx.sh.get("basement", 0.85):
		_basement(ctx)


## How tall the main floor is everywhere, its windows, the first storey's balconies, a blank storey 1, and the wall
## cells that a door upstairs could go through, in a random order.
static func _prepare(ctx: GenContext) -> void:
	var g := ctx.g
	for y in ctx.H:
		var hr: Array = []
		for x in ctx.W:
			hr.append(0 if g[y][x] == "#" else 1)
		ctx.h0.append(hr)
	for a in ctx.areas:
		var r: Rect2i = a["rect"]
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				if ctx.room_of[y][x] == a["unit"] and g[y][x] != "#":
					ctx.h0[y][x] = a["height"]
	for w3 in ctx.windows:
		ctx.is_win[Vector2i(w3[0], w3[1])] = true
	for dk in ctx.decks:
		if dk["level"] == 1:
			ctx.deck1[Vector2i(dk["at"][0], dk["at"][1])] = true
	ctx.up = ctx.blank("#")
	ctx.grid_of = {1: ctx.up}
	for y in range(2, ctx.H - 2):
		for x in range(2, ctx.W - 2):
			if g[y][x] == "#" and not ctx.is_win.has(Vector2i(x, y)):
				ctx.wall_cells.append(Vector2i(x, y))
	ctx.shuffle(ctx.wall_cells)


## A door a storey up, from one hall's balcony through to the next hall, with a landing on the far side that looks
## down into it and, if there is treasure, something left there.
static func _upper_doors(ctx: GenContext) -> int:
	var g := ctx.g
	var h0 := ctx.h0
	var up := ctx.up
	var n_up_doors := 0
	for c in ctx.wall_cells:
		if n_up_doors >= int(ctx.sh.get("upper_doors", 2)):
			break
		for k in 4:
			var f: Vector2i = DIRS[k]
			var s2: Vector2i = DIRS[(k + 1) % 4]
			var a: Vector2i = c + f
			var b: Vector2i = c - f
			if ctx.no_door_up.has(c) or not ctx.deck1.has(a) or g[b.y][b.x] != "." or h0[b.y][b.x] < 2 or ctx.room_of[a.y][a.x] == ctx.room_of[b.y][b.x] or ctx.taken.has(b):
				continue
			if ctx.apart(ctx.room_of[a.y][a.x], ctx.room_of[b.y][b.x]):
				continue                                   # never a way into the vault, or past the gate, but its own locked doors
			if h0[c.y + s2.y][c.x + s2.x] > 1 or h0[c.y - s2.y][c.x - s2.x] > 1 or up[c.y][c.x] != "#":
				continue
			up[c.y][c.x] = ctx.letters[ctx.rng.randi() % ctx.doors.size()]
			for land in [b, b + s2, b - s2]:              # somewhere to stand on the far side: a landing that looks down into that hall
				if g[land.y][land.x] == "." and h0[land.y][land.x] >= 2 and ctx.room_of[land.y][land.x] == ctx.room_of[b.y][b.x] and not ctx.taken.has(land) and not ctx.deck1.has(land):
					ctx.decks.append({"at": [land.x, land.y], "level": 1})
					ctx.deck1[land] = true
			if not ctx.treasure.is_empty():
				ctx.stow(b, up, 1, ctx.treasure[ctx.rng.randi() % ctx.treasure.size()], "")
			n_up_doors += 1
			break
	return n_up_doors


## A room upstairs can go over rock or over one-storey rooms, and not against another.
static func _fits_up(ctx: GenContext, r: Rect2i, door: Vector2i) -> bool:
	for y in range(r.position.y - 1, r.end.y + 1):
		for x in range(r.position.x - 1, r.end.x + 1):
			var c := Vector2i(x, y)
			if not ctx.inside(c):
				return false
			if c != door and ctx.up[y][x] != "#":
				return false
			if r.has_point(c) and (ctx.h0[y][x] > 1 or ctx.lift_at.has(c)):
				return false
	return true


## A room on another storey: a style, and a few things in it, half treasure and half company. Returns its room entry.
static func _furnish_room(ctx: GenContext, r: Rect2i, level: int, name: String) -> Dictionary:
	var rng := ctx.rng
	var st: String = ctx.styles[rng.randi() % ctx.styles.size()]
	var cells2: Array = []
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			cells2.append(Vector2i(x, y))
	ctx.shuffle(cells2)
	var n := 0
	for c in cells2:
		if ctx.lift_at.has(c) or n >= 2 + cells2.size() / 6:
			continue
		n += 1
		if level < 0:
			ctx.under[c] = true
		if n % 2 == 1 and not ctx.treasure.is_empty():
			ctx.stow(c, ctx.grid_of[level], level, ctx.treasure[rng.randi() % ctx.treasure.size()], "")
		elif not ctx.actors.is_empty():
			ctx.things.append({"at": [c.x, c.y], "level": level, "actor": ctx.weighted(ctx.actors), "face": NAMES[rng.randi() % 4]})
	return {"name": name, "rect": [r.position.x, r.position.y, r.size.x, r.size.y], "style": st, "height": 1, "quiet": true}


## A room upstairs, through a door off a balcony.
static func _upper_rooms(ctx: GenContext) -> int:
	var rng := ctx.rng
	var up := ctx.up
	var n_up_rooms := 0
	for c in ctx.wall_cells:
		if n_up_rooms >= int(ctx.sh.get("upper_rooms", 2)):
			break
		for k in 4:
			var f: Vector2i = DIRS[k]
			var s2: Vector2i = DIRS[(k + 1) % 4]
			if ctx.no_door_up.has(c) or not ctx.deck1.has(c + f) or up[c.y][c.x] != "#" or ctx.h0[c.y + s2.y][c.x + s2.x] > 1 or ctx.h0[c.y - s2.y][c.x - s2.x] > 1:
				continue
			var deep := rng.randi_range(3, 4)
			var wide := rng.randi_range(3, 5)
			var off := rng.randi_range(0, wide - 1)
			var o: Vector2i = c - f - s2 * off                # the corner of the room nearest the door
			var far: Vector2i = o - f * (deep - 1) + s2 * (wide - 1)
			var r := Rect2i(mini(o.x, far.x), mini(o.y, far.y), absi(far.x - o.x) + 1, absi(far.y - o.y) + 1)
			if not _fits_up(ctx, r, c):
				continue
			for y in range(r.position.y, r.end.y):
				for x in range(r.position.x, r.end.x):
					up[y][x] = "."
			up[c.y][c.x] = ctx.letters[rng.randi() % ctx.doors.size()]
			n_up_rooms += 1
			ctx.up_rooms.append(_furnish_room(ctx, r, 1, "Upstairs %d" % n_up_rooms))
			break
	return n_up_rooms


## A room upstairs that only a lift goes to. The lift stands in a nook of the floor below; the room is laid over it.
static func _lift_rooms(ctx: GenContext, n_up_rooms: int) -> int:
	var rng := ctx.rng
	for y in range(2, ctx.H - 2):
		for x in range(2, ctx.W - 2):
			if ctx.nook(Vector2i(x, y)):
				ctx.nooks2.append(Vector2i(x, y))
	ctx.shuffle(ctx.nooks2)
	for c in ctx.nooks2:
		if n_up_rooms >= int(ctx.sh.get("upper_rooms", 2)) + int(ctx.sh.get("lift_rooms", 1)):
			break
		if not ctx.nook(c):
			continue
		for k in 4:
			var f: Vector2i = DIRS[(k + rng.randi()) % 4]
			var s2: Vector2i = DIRS[(DIRS.find(f) + 1) % 4]
			var deep := rng.randi_range(3, 4)
			var wide := rng.randi_range(3, 4)
			var o: Vector2i = c + f - s2 * rng.randi_range(0, wide - 1)
			var far: Vector2i = o + f * (deep - 1) + s2 * (wide - 1)
			var r := Rect2i(mini(o.x, far.x), mini(o.y, far.y), absi(far.x - o.x) + 1, absi(far.y - o.y) + 1)
			if r.has_point(c) or not _fits_up(ctx, r, Vector2i(-9, -9)):
				continue
			if not _shaft_clear(ctx, c, r):
				continue
			for y in range(r.position.y, r.end.y):
				for x in range(r.position.x, r.end.x):
					ctx.up[y][x] = "."
			ctx.dig(c)
			ctx.lift_at[c] = true
			ctx.used[c] = true
			ctx.things.append({"at": [c.x, c.y], "lift": [0, 1], "home": 0})
			n_up_rooms += 1
			ctx.up_rooms.append(_furnish_room(ctx, r, 1, "Upstairs %d" % n_up_rooms))
			break
	return n_up_rooms


## The shaft itself must stand in rock up there.
static func _shaft_clear(ctx: GenContext, c: Vector2i, r: Rect2i) -> bool:
	var clear := true
	for d in DIRS:
		var q: Vector2i = c + d
		if not r.has_point(q) and (ctx.h0[q.y][q.x] > 1 or ctx.up[q.y][q.x] != "#"):
			clear = false
	return clear


## The basement: a few chambers under the place, joined by corridors with doors, a lift down to them from the last
## good nook, and pits in the floor above.
static func _basement(ctx: GenContext) -> void:
	var shaft := Vector2i(-1, -1)
	for i in range(ctx.nooks2.size() - 1, -1, -1):
		if ctx.nook(ctx.nooks2[i]):
			shaft = ctx.nooks2[i]
			break
	if shaft.x <= 0:
		return
	var front := ctx.nook_front(shaft)
	var lift_room: int = ctx.room_of[front.y][front.x]       # the room the lift down stands in
	var bg := ctx.blank("#")
	var b_in := ctx.blank(-1)
	var brects := _chambers(ctx, shaft, bg, b_in)
	if brects.is_empty():
		return
	_passages(ctx, bg, b_in, brects)
	ctx.dig(shaft)
	bg[shaft.y][shaft.x] = "."
	_open_doors_beside(bg, shaft)
	ctx.lift_at[shaft] = true
	ctx.used[shaft] = true
	ctx.things.append({"at": [shaft.x, shaft.y], "lift": [-1, 0], "home": 0})
	var b_rooms: Array = []
	for i in brects.size():
		ctx.grid_of[-1] = bg
		b_rooms.append(_furnish_room(ctx, brects[i], -1, "%s %d" % [ctx.p.get("basement_name", "Undercroft"), i + 1]))
	_pits(ctx, bg, lift_room)
	ctx.storeys.append({"level": -1, "map": GenContext.rows(bg), "rooms": b_rooms})


## The doors were put on the basement's thresholds while the shaft was still rock. Now that it is open, a door beside
## it may stand with floor on one flank, and the engine leaves such a door out: make it a plain opening instead. (This
## draws no random numbers, so levels without such a door are unchanged.)
static func _open_doors_beside(bg: Array, c: Vector2i) -> void:
	for d in DIRS:
		var n: Vector2i = c + d
		if GenContext.is_door(bg, n) and not _closes(bg, n):
			bg[n.y][n.x] = "."


## A door here would close an opening wall to wall: rock or a door on both sides, one way or the other.
static func _closes(grid: Array, n: Vector2i) -> bool:
	var wall := func(q: Vector2i) -> bool: return grid[q.y][q.x] == "#" or GenContext.is_door(grid, q)
	return (wall.call(n + DIRS[1]) and wall.call(n + DIRS[3])) or (wall.call(n + DIRS[0]) and wall.call(n + DIRS[2]))


## The basement's chambers (params shapes "basement_rooms"), two cells apart; the first beside the shaft, so down there
## too the lift is in a nook of its own.
static func _chambers(ctx: GenContext, shaft: Vector2i, bg: Array, b_in: Array) -> Array:
	var rng := ctx.rng
	var W := ctx.W
	var H := ctx.H
	var brects: Array = []
	var guard := 0
	while brects.size() < int(ctx.sh.get("basement_rooms", 4)) and guard < 300:
		guard += 1
		var bw := rng.randi_range(4, 7)
		var bh := rng.randi_range(3, 6)
		var br2 := Rect2i(rng.randi_range(1, W - bw - 1), rng.randi_range(1, H - bh - 1), bw, bh)
		if brects.is_empty():                         # the first one stands beside the shaft: down there too the lift is in a nook of its own
			var bf: Vector2i = DIRS[rng.randi() % 4]
			if bf.x == 0:
				br2.position = Vector2i(shaft.x - rng.randi_range(0, bw - 1), shaft.y + 1 if bf.y > 0 else shaft.y - bh)
			else:
				br2.position = Vector2i(shaft.x + 1 if bf.x > 0 else shaft.x - bw, shaft.y - rng.randi_range(0, bh - 1))
			if br2.position.x < 1 or br2.position.y < 1 or br2.end.x > W - 1 or br2.end.y > H - 1 or br2.has_point(shaft):
				continue
		var clash := false
		for o2 in brects:
			if br2.grow(2).intersects(o2):
				clash = true
		if clash:
			continue
		brects.append(br2)
		for y in range(br2.position.y, br2.end.y):
			for x in range(br2.position.x, br2.end.x):
				bg[y][x] = "."
				b_in[y][x] = brects.size() - 1
	return brects


## Corridors from chamber to chamber, and doors on their thresholds (the same rule as upstairs).
static func _passages(ctx: GenContext, bg: Array, b_in: Array, brects: Array) -> void:
	for i in range(1, brects.size()):
		var x: int = brects[i - 1].get_center().x
		var y: int = brects[i - 1].get_center().y
		var to: Vector2i = brects[i].get_center()
		while x != to.x or y != to.y:
			if x != to.x:
				x += signi(to.x - x)
			else:
				y += signi(to.y - y)
			if bg[y][x] == "#":
				bg[y][x] = "."
	for y in range(1, ctx.H - 1):
		for x in range(1, ctx.W - 1):
			if bg[y][x] != "." or b_in[y][x] >= 0 or ctx.rng.randf() > 0.7:
				continue
			for d in 2:
				var f: Vector2i = DIRS[d]
				var s2: Vector2i = DIRS[d + 1]
				if bg[y + f.y][x + f.x] == "." and bg[y - f.y][x - f.x] == "." and bg[y + s2.y][x + s2.x] == "#" and bg[y - s2.y][x - s2.x] == "#" \
						and (b_in[y + f.y][x + f.x] >= 0) != (b_in[y - f.y][x - f.x] >= 0):
					bg[y][x] = ctx.letters[ctx.rng.randi() % ctx.doors.size()]
					break


## Pits: in a room, off the lines the corridors come in on, over an empty part of the basement, three cells apart;
## only in rooms on the same side of the gate as the lift's (`lift_room`), so a fall and the ride up go nowhere new.
static func _pits(ctx: GenContext, bg: Array, lift_room: int) -> void:
	var g := ctx.g
	var spots: Array = []
	for y in range(2, ctx.H - 2):
		for x in range(2, ctx.W - 2):
			var c := Vector2i(x, y)
			if bg[y][x] != "." or ctx.under.has(c) or not ctx.plain(c) or ctx.room_of[y][x] < 1 or (c - ctx.start).length() < 4.0:
				continue
			if not ctx.region.is_empty() and ctx.region[ctx.room_of[y][x]] != ctx.region[lift_room]:
				continue
			var r: Rect2i = ctx.rects[ctx.room_of[y][x]]
			var by_door := false
			for d in DIRS:
				if g[y + d.y][x + d.x] != "." and g[y + d.y][x + d.x] != "#":
					by_door = true
			if c.x != r.get_center().x and c.y != r.get_center().y and not by_door:
				spots.append(c)
	ctx.shuffle(spots)
	var pits: Array = []
	for c in spots:
		if pits.size() >= int(ctx.sh.get("pits", 3)):
			break
		var crowd := false
		for o3 in pits:
			if (o3 - c).length() < 3.0:
				crowd = true
		if not crowd:
			pits.append(c)
			ctx.used[c] = true
			ctx.things.append({"at": [c.x, c.y], "trap": "pit"})
