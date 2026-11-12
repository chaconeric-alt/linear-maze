extends RefCounted
## rooms - the example generator, and a tour of what a level can be: rooms of many shapes joined by corridors and
## loops, a locked way out, monsters, treasure, scanner arches, wall lockers and dressing, all picked from lists in
## game.json (generator_params, generator_themes).
##
## A generator is any script in generators/ with generate(seed, params) -> level dictionary
## (the same shape as a level JSON file). List it in game.json "generators" and it appears on
## the title screen. Bigger generators plug in the same way; this one shows the interface.
##
## What it builds, each with a chance set in params "shapes" (0 switches it off):
##   shape    rooms that are eight-sided, round-cornered, L-shaped, cross-shaped or full of piers      "fancy"
##   suites   one big box divided into two rooms by a thin wall with an opening and windows            "suite"
##   close    rooms one wall apart, so the wall between them can hold windows                          "close"
##   storeys  rooms two and three storeys high                                                         "tall"
##   gallery  balconies along one, two, three or all four walls, with a ramp up; in three-storey
##            rooms a second balcony a storey higher, with its own ramp from the first                 "balcony", "tiers"
##   window   observation windows wherever a wall has floor both sides                                 "window", "max_windows"
##   pool     flooded patches and wholly flooded rooms (level "fluid" gives the look)                  "pool", "max_pools"
##   loops    extra corridors, so there is more than one way round                                     "loops"
##   traps    lasers across corridors, shock plates and gas vents                                      "traps": {"laser": 2, ...}
##   jammed   doors that grind and spark                                                               "jammed"
##   ambush   taking the red card sets off the alarm and brings company                                "ambush"
##   upstairs doors a storey up between the balconies of two halls; rooms upstairs through a door off
##            a balcony, or reached only by a lift                                                     "upper_doors", "upper_rooms", "lift_rooms"
##   basement chambers under the place, a lift down to them, and pits in the floor above               "basement", "basement_rooms", "pits"
##
## Doors: a door only ever goes on a THRESHOLD: a corridor cell with a room on one side, open
## floor on the other and solid wall to both flanks, so it always closes an opening wall to wall.
## They are placed after every corridor is carved, because a later corridor can widen an opening.
## Shapes never touch a room's middle row or column, which is where corridors arrive.

const DIRS := [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]
const NAMES := ["n", "e", "s", "w"]
const CORNERS := [["nw", 0, 0, -1, -1], ["ne", 1, 0, 1, -1], ["sw", 0, 1, -1, 1], ["se", 1, 1, 1, 1]]     # name, which end in x, in y, outward x, y


func generate(seed_value: int, p: Dictionary) -> Dictionary:
	for attempt in 40:
		var lv := _try(seed_value + attempt * 7919, p)
		if not lv.is_empty():
			lv["id"] = "gen-%d" % seed_value
			return lv
	push_warning("rooms generator: no solvable layout found; returning the last try without a lock")
	return _try(seed_value, p, false)


## A cell of a room given along-the-wall (u) and out-from-the-wall (v) steps from one of its four walls.
func _local(r: Rect2i, side: int, u: int, v: int) -> Vector2i:
	match side:
		0: return Vector2i(r.position.x + u, r.position.y + v)
		2: return Vector2i(r.position.x + u, r.end.y - 1 - v)
		3: return Vector2i(r.position.x + v, r.position.y + u)
	return Vector2i(r.end.x - 1 - v, r.position.y + u)


func _try(seed_value: int, p: Dictionary, lock := true) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var sh: Dictionary = p.get("shapes", {})
	var size: Array = p.get("size", [36, 28])
	var W: int = int(size[0])
	var H: int = int(size[1])
	var g: Array = []
	var room_of: Array = []
	for y in H:
		var row: Array = []
		row.resize(W)
		row.fill("#")
		g.append(row)
		var r2: Array = []
		r2.resize(W)
		r2.fill(-1)
		room_of.append(r2)
	var rects: Array = []             # one per unit: a box that corridors join
	var shape: Array = []             # per unit: rect, oct, round, ell, cross, piers, suite
	var tries := 0
	var styles: Array = p.get("styles", ["lab"])
	var want: int = int(p.get("rooms", 10))
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
		var r := Rect2i(rng.randi_range(1, W - w - 1), rng.randi_range(1, H - h - 1), w, h)
		var gap := 1 if rng.randf() < sh.get("close", 0.5) else 2
		var ok := true
		for o in rects:
			if r.grow(gap).intersects(o):
				ok = false
				break
		if not ok:
			continue
		rects.append(r)
		shape.append("rect")
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				g[y][x] = "."
				room_of[y][x] = rects.size() - 1
	if rects.size() < 3:
		return {}
	var last := rects.size() - 1

	# ---- the shape of each room. Only ever cuts corners, so the middle row and column stay open.
	var fill := func(x: int, y: int) -> void:
		g[y][x] = "#"
		room_of[y][x] = -1
	for i in range(1, rects.size()):
		var r: Rect2i = rects[i]
		var w: int = r.size.x
		var h: int = r.size.y
		if w < 5 or h < 5 or rng.randf() >= sh.get("fancy", 0.8):
			continue
		var pick: Array = ["oct", "oct", "ell", "cross"]
		if w >= 6 and h >= 6:
			pick.append_array(["round", "round", "piers"])
		if maxi(w, h) >= 7 and i != last:
			pick.append_array(["suite", "suite"])
		var s: String = pick[rng.randi() % pick.size()]
		if s == "suite" and rng.randf() >= sh.get("suite", 1.0):
			s = "oct"
		shape[i] = s
		match s:
			"ell":                                        # one corner block filled in
				var cw := rng.randi_range(1, (w - 1) / 2)
				var ch := rng.randi_range(1, (h - 1) / 2)
				var cn: Array = CORNERS[rng.randi() % 4]
				for dy in ch:
					for dx in cw:
						fill.call(r.position.x + dx if cn[1] == 0 else r.end.x - 1 - dx, r.position.y + dy if cn[2] == 0 else r.end.y - 1 - dy)
			"cross":                                      # all four
				var cw2 := rng.randi_range(1, maxi(1, (w - 3) / 2))
				var ch2 := rng.randi_range(1, maxi(1, (h - 3) / 2))
				for cn2 in CORNERS:
					for dy in ch2:
						for dx in cw2:
							fill.call(r.position.x + dx if cn2[1] == 0 else r.end.x - 1 - dx, r.position.y + dy if cn2[2] == 0 else r.end.y - 1 - dy)
			"round":                                      # corner cell gone; the two beside it are cut across later
				for cn3 in CORNERS:
					fill.call(r.position.x if cn3[1] == 0 else r.end.x - 1, r.position.y if cn3[2] == 0 else r.end.y - 1)
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
							fill.call(r.position.x + px, r.position.y + py)

	# ---- areas: what gets a style, a height and furniture. A suite is one unit and two areas.
	var areas: Array = []
	var walls: Array = []
	for i in rects.size():
		var r: Rect2i = rects[i]
		if shape[i] != "suite":
			areas.append({"unit": i, "rect": r})
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
			walls.append({"at": [c.x, c.y], "side": "e" if across else "s", "kind": "window" if rng.randf() < 0.45 else "wall"})
		if across:
			areas.append({"unit": i, "rect": Rect2i(r.position, Vector2i(cut, r.size.y))})
			areas.append({"unit": i, "rect": Rect2i(r.position + Vector2i(cut, 0), Vector2i(r.size.x - cut, r.size.y))})
		else:
			areas.append({"unit": i, "rect": Rect2i(r.position, Vector2i(r.size.x, cut))})
			areas.append({"unit": i, "rect": Rect2i(r.position + Vector2i(0, cut), Vector2i(r.size.x, r.size.y - cut))})
	var rooms: Array = []
	var seen_style := {}
	var suite_h := {}
	for a in areas:
		var r: Rect2i = a["rect"]
		var big: bool = r.size.x >= 5 and r.size.y >= 5
		var grand: bool = r.size.x >= 7 and r.size.y >= 7
		var hgt := 1
		if grand:
			hgt = 3 if rng.randf() < sh.get("tall", 0.65) else 2
		elif big and rng.randf() < 0.55:
			hgt = 3 if (r.size.x >= 6 and r.size.y >= 6 and rng.randf() < sh.get("tall", 0.65) * 0.6) else 2
		elif r.get_area() >= 12 and rng.randf() < 0.2:
			hgt = 2
		if suite_h.has(a["unit"]):                        # the two halves of a suite share a ceiling: nothing closes the gap above a lower one
			hgt = suite_h[a["unit"]]
		elif shape[a["unit"]] == "suite":
			hgt = mini(hgt, 2)
			suite_h[a["unit"]] = hgt
		var st: String = styles[rng.randi() % styles.size()]
		seen_style[st] = seen_style.get(st, 0) + 1
		a["style"] = st
		a["height"] = hgt
		rooms.append({"name": "%s %d" % [st.capitalize(), seen_style[st]], "rect": [r.position.x, r.position.y, r.size.x, r.size.y], "style": st, "height": hgt, "quiet": true})

	# ---- corridors: carve only; doors come afterwards
	var carve := func(a: Vector2i, b: Vector2i, dry: bool) -> bool:      # dry: only say whether it would stay clear of the last room
		var x := a.x
		var y := a.y
		var keep: Rect2i = rects[last].grow(1)
		while x != b.x or y != b.y:
			if x != b.x:
				x += signi(b.x - x)
			else:
				y += signi(b.y - y)
			if dry:
				if keep.has_point(Vector2i(x, y)):
					return false
			elif g[y][x] == "#":
				g[y][x] = "."
		return true
	for i in range(1, rects.size()):
		carve.call(rects[i - 1].get_center(), rects[i].get_center(), false)
	for k in int(sh.get("loops", 2)):                     # more than one way round, but never a second way into the last room
		if last < 3:
			break
		var a2 := rng.randi_range(0, last - 1)
		var b2 := rng.randi_range(0, last - 1)
		if absi(a2 - b2) < 2:
			continue
		if carve.call(rects[a2].get_center(), rects[b2].get_center(), true):
			carve.call(rects[a2].get_center(), rects[b2].get_center(), false)

	# ---- thresholds
	var doors: Array = p.get("doors", ["door_split"])
	var legend := {}
	var letters := "ABCDEFGHIJKLMNOPQRSTUVWXY"
	for i in doors.size():
		legend[letters[i]] = {"door": doors[i]}
		legend[letters[i].to_lower()] = {"door": doors[i], "jammed": true}
	legend["Z"] = {"door": "door_vault", "lock": "red"}
	legend["~"] = {"fluid": true}
	var door_cells: Array = []        # [cell, direction index pointing INTO the room it serves]
	for y in range(1, H - 1):
		for x in range(1, W - 1):
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
				if _is_door(g, q + f) or _is_door(g, q - f):      # never two doors back to back
					continue
				var into := d if ra >= 0 else d + 2
				var guards_last := ra == last or rb == last
				if guards_last and lock:
					g[y][x] = "Z"
				elif rng.randf() < 0.85:
					var ch: String = letters[rng.randi() % doors.size()]
					g[y][x] = ch.to_lower() if rng.randf() < sh.get("jammed", 0.08) else ch
				else:
					continue
				door_cells.append([q, into, guards_last])
	# the red card has to be findable without going through the vault door
	var start: Vector2i = rects[0].get_center()
	var seen := {start: true}
	var queue: Array = [start]
	while not queue.is_empty():
		var c: Vector2i = queue.pop_back()
		for d in DIRS:
			var n: Vector2i = c + d
			if seen.has(n) or g[n.y][n.x] == "#" or g[n.y][n.x] == "Z":
				continue
			seen[n] = true
			queue.append(n)
	var key_rooms: Array = []
	for i in range(1, last):
		if seen.has(rects[i].get_center()):
			key_rooms.append(i)
	if lock and (seen.has(rects[last].get_center()) or key_rooms.is_empty()):
		return {}          # a corridor leaks into the last room, or nowhere to put the card: try another layout
	var key_room: int = key_rooms[rng.randi() % key_rooms.size()] if not key_rooms.is_empty() else 1

	# ---- cut corners, galleries and ramps. Done before the furniture so that nothing is put where they go.
	var diags: Array = []
	var decks: Array = []
	var ramps: Array = []
	var windows: Array = []
	var taken: Dictionary = {}                        # cells that furniture must leave alone
	var is_diag: Dictionary = {}
	var upstairs: Array = []                          # [cell, level, unit]: places on a balcony where something could stand
	var solid := func(x: int, y: int) -> bool: return x < 0 or y < 0 or x >= W or y >= H or g[y][x] == "#"
	for i in rects.size():
		var r: Rect2i = rects[i]
		var cuts: Array = []                              # [cell, corner name, outward x, outward y]
		if shape[i] == "oct" or (shape[i] == "rect" and r.size.x >= 5 and r.size.y >= 5 and rng.randf() < sh.get("octagon", 0.4)):
			for cn in CORNERS:
				cuts.append([Vector2i(r.position.x if cn[1] == 0 else r.end.x - 1, r.position.y if cn[2] == 0 else r.end.y - 1), cn[0], cn[3], cn[4]])
		elif shape[i] == "round":
			for cn in CORNERS:
				var cx: int = r.position.x if cn[1] == 0 else r.end.x - 1
				var cy: int = r.position.y if cn[2] == 0 else r.end.y - 1
				cuts.append([Vector2i(cx - cn[3], cy), cn[0], cn[3], cn[4]])
				cuts.append([Vector2i(cx, cy - cn[4]), cn[0], cn[3], cn[4]])
		for ct in cuts:
			var c: Vector2i = ct[0]
			if g[c.y][c.x] == "." and solid.call(c.x + ct[2], c.y) and solid.call(c.x, c.y + ct[3]):      # no door opens on to this corner
				diags.append({"at": [c.x, c.y], "corner": ct[1]})
				taken[c] = true
				is_diag[c] = true
	for ai in areas.size():
		var a: Dictionary = areas[ai]
		var i: int = a["unit"]
		var r: Rect2i = a["rect"]
		if a["height"] < 2 or r.size.x < 5 or r.size.y < 5 or not (shape[i] in ["rect", "oct", "round"]):
			continue
		if i != 1 and rng.randf() >= sh.get("balcony", 0.7):
			continue
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
		if a["height"] == 3 and V >= 7 and rng.randf() < sh.get("tiers", 0.75):
			kind = "tiers"
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
		var ur := -1                                      # where the ramp from the ground comes up: off the middle line if it can be
		for cand in [U / 2 - 1, U / 2 + 1, U / 2]:
			if ur < 0 and cand >= 1 and cand <= U - 2 and not corner_u.has(cand):
				ur = cand
		if rng.randf() < 0.5 and U / 2 + 1 <= U - 2 and not corner_u.has(U / 2 + 1):
			ur = U / 2 + 1
		var foot: Array = [_local(r, side, ur, 2), _local(r, side, ur, 1), _local(r, side, ur, 0)]
		var fits := true
		for c in foot:
			if g[c.y][c.x] != "." or is_diag.has(c):
				fits = false
		for c in up2:
			var c2: Vector2i = _local(r, side, c.x, c.y)
			if g[c2.y][c2.x] != "." or is_diag.has(c2):
				fits = false
		if not fits:
			continue
		ramps.append({"at": [foot[0].x, foot[0].y], "dir": NAMES[side], "from": 0, "to": 2})
		ramps.append({"at": [foot[1].x, foot[1].y], "dir": NAMES[side], "from": 2, "to": 4})
		for c in [foot[0], foot[1], _local(r, side, ur, 3)]:
			taken[c] = true
		if not up2.is_empty():
			var away: String = NAMES[(side + 2) % 4]
			var c3: Vector2i = _local(r, side, up2[0].x, up2[0].y)
			var c4: Vector2i = _local(r, side, up2[1].x, up2[1].y)
			ramps.append({"at": [c3.x, c3.y], "dir": away, "from": 4, "to": 6})
			ramps.append({"at": [c4.x, c4.y], "dir": away, "from": 6, "to": 8})
		for pair in [[l1, 1], [l2, 2]]:
			for lc in pair[0]:
				var c5: Vector2i = _local(r, side, lc.x, lc.y)
				if g[c5.y][c5.x] != "." or room_of[c5.y][c5.x] != i or c5 == foot[1]:
					continue
				decks.append({"at": [c5.x, c5.y], "level": pair[1]})
				if not is_diag.has(c5) and c5 != foot[2] and (lc.y == 0 or lc.y == V - 1 or lc.x == 0 or lc.x == U - 1):
					upstairs.append([c5, pair[1], i])

	# ---- furniture, monsters, treasure
	var things: Array = []
	var used := {start: true}
	things.append({"at": [start.x, start.y], "start": true, "face": "n"})
	# the things a level cannot do without go where the corridors arrive: the middle of a unit is always floor
	var clear := func(c: Vector2i) -> Vector2i:           # that cell, or the nearest one of the same room that is not a ramp or a cut corner
		if not taken.has(c):
			return c
		for rad in range(1, 5):
			for dy in range(-rad, rad + 1):
				for dx in range(-rad, rad + 1):
					var q := c + Vector2i(dx, dy)
					if q.x >= 1 and q.y >= 1 and q.x < W - 1 and q.y < H - 1 and g[q.y][q.x] == "." and room_of[q.y][q.x] == room_of[c.y][c.x] and not taken.has(q):
						return q
		return c
	for i in range(1, rects.size()):
		var cc: Vector2i = clear.call(rects[i].get_center())
		used[cc] = true
		if i == key_room:
			things.append({"at": [cc.x, cc.y], "item": "keycard", "color": "red"})
		if i == 1:
			things.append({"at": [cc.x, cc.y], "item": "scattergun", "offset": [-1.0, 0, 0]})
		if i == max(2, last / 2):
			things.append({"at": [cc.x, cc.y], "item": "plasma", "offset": [1.0, 0, 0]})
	var ex: Vector2i = clear.call(rects[last].get_center())
	used[ex] = true
	if p.has("boss"):                                 # whoever runs the place waits in the last room
		things.append({"at": [ex.x, ex.y], "actor": p["boss"], "offset": [1.2, 0, 1.2], "face": "s"})
	things.append({"at": [ex.x, ex.y], "prop": p.get("exit_prop", "holo_table"), "blocks": false, "use": {"type": "effects", "prompt": "Signal the surface",
		"effects": [{"type": "end", "title": "Out, and richer", "text": "%s %d is somebody else's problem now." % [p.get("place", "Installation"), seed_value % 1000]}]}})
	# scanner arches: some stand just inside a doorway, the way you would fit one
	var arches: Array = p.get("arches", [])
	for dc in door_cells:
		var q: Vector2i = dc[0]
		var inside: Vector2i = q + DIRS[dc[1]]
		if arches.is_empty() or dc[2] or used.has(inside) or taken.has(inside) or rng.randf() > 0.3:
			continue
		used[inside] = true
		for d in DIRS:                      # keep the cells round an arch clear, so nothing wide crowds the way through
			used[inside + d] = true
		things.append({"at": [inside.x, inside.y], "prop": _weighted(rng, arches), "face": "s" if dc[1] % 2 == 0 else "e", "blocks": false})
	var actors: Array = p.get("actors", [])
	var treasure: Array = p.get("treasure", [])
	var loot: Array = p.get("locker_loot", treasure)
	for a in areas:
		var i: int = a["unit"]
		if i == 0:
			continue
		var r: Rect2i = a["rect"]
		var floor_cells: Array = []
		var nooks: Array = []                             # floor with wall on two sides or more: where furniture goes
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				var c := Vector2i(x, y)
				if g[y][x] != "." or room_of[y][x] != i or taken.has(c):
					continue
				floor_cells.append(c)
				var n_solid := 0
				for d in DIRS:
					if g[y + d.y][x + d.x] == "#":
						n_solid += 1
				if n_solid >= 2:
					nooks.append(c)
		if floor_cells.is_empty():
			continue
		var free := func() -> Vector2i: return floor_cells[rng.randi() % floor_cells.size()]
		var props: Array = p.get("style_props", {}).get(a["style"], p.get("props", []))
		for k in 1 + floor_cells.size() / 9:
			var c: Vector2i = free.call()
			if used.has(c) or actors.is_empty():
				continue
			used[c] = true
			var who: String = _weighted(rng, actors)
			things.append({"at": [c.x, c.y], "actor": who, "face": NAMES[rng.randi() % 4]})
			if who in p.get("pairs", []):                 # some things come in twos
				things.append({"at": [c.x, c.y], "actor": who, "offset": [1.5, 0, 1.0], "face": NAMES[rng.randi() % 4]})
		for k in 1 + int(rng.randf() * 2.0):
			var c2: Vector2i = free.call()
			if not used.has(c2) and not treasure.is_empty():
				used[c2] = true
				things.append({"at": [c2.x, c2.y], "item": treasure[rng.randi() % treasure.size()]})
		# dressing goes in the corners so it never blocks the way through
		var dressed := 0
		for corner in nooks:
			if dressed >= 5 or rng.randf() >= 0.55 or used.has(corner) or props.is_empty():
				continue
			dressed += 1
			used[corner] = true
			var pid: String = props[rng.randi() % props.size()]
			var e := {"at": [corner.x, corner.y], "prop": pid, "blocks": false, "turn": rng.randi() % 4 * 90}
			if pid == "barrel":
				e["hp"] = 12
				e["explode"] = {"radius": 5.5, "damage": 70}
			elif pid == "crate":
				e["hp"] = 20
				e["loot"] = [{"item": ["shells", "cells", "health"][rng.randi() % 3]}]
			elif pid in ["wk_drums"]:
				e["hp"] = 16
				e["explode"] = {"radius": 5.0, "damage": 60}
			elif pid == "bk_crates":
				e["hp"] = 24
				e["loot"] = [{"item": ["shells", "cells", "health"][rng.randi() % 3]}, {"item": ["shells", "cells"][rng.randi() % 2]}]
			elif pid == "cr_coffin":                  # most coffins hold grave goods; some hold whoever was buried
				e["use"] = {"type": "locker", "prompt": "Push the lid"}
				if rng.randf() < 0.6 or actors.is_empty():
					e["use"]["loot"] = [{"item": treasure[rng.randi() % treasure.size()]}] if not treasure.is_empty() else []
				else:
					e["use"]["actor"] = p.get("coffin_actor", "deadbot")
					e["use"]["text"] = "It sits up."
			elif pid in ["ag_pedestal", "cr_plinth"] and not treasure.is_empty():
				e["use"] = {"type": "cache", "prompt": "Lift the dome", "loot": [{"item": treasure[rng.randi() % treasure.size()]}]}
			things.append(e)
		# lockers on the walls: mostly useful, sometimes not
		for k in rng.randi_range(0, 2):
			var c4: Vector2i = free.call()
			var wall := -1
			for d in 4:
				var n2: Vector2i = c4 + DIRS[d]
				if g[n2.y][n2.x] == "#":
					wall = d
					break
			if wall < 0 or used.has(c4) or loot.is_empty():
				continue
			used[c4] = true
			var roll := rng.randf()
			var lk := {"at": [c4.x, c4.y], "prop": "locker", "face": NAMES[(wall + 2) % 4], "use": {"type": "locker", "prompt": "Open the locker"}}
			if roll < 0.55:
				var items: Array = []
				for n3 in rng.randi_range(1, 2):
					items.append({"item": loot[rng.randi() % loot.size()]})
				lk["use"]["loot"] = items
			elif roll < 0.7:
				pass                                   # empty
			elif roll < 0.9:
				lk["prop"] = "locker_bad"              # dented, leaking, and it rattles: something lives in it
				lk["rattle"] = true
				lk["use"]["actor"] = "roach"
				lk["use"]["count"] = rng.randi_range(1, 3)
			else:
				lk["prop"] = "locker_bad"              # dented and quiet: wired
				lk["use"]["text"] = "Somebody wired it."
				lk["use"]["effects"] = [{"type": "explode", "radius": 4.0, "damage": 30}]
			things.append(lk)
	# upstairs: the climb should be worth it, and sometimes somebody is already up there
	var up_used := {}
	var per_unit := {}
	for k in upstairs.size():
		var pick: Array = upstairs[rng.randi() % upstairs.size()]
		var keyu := [pick[0], pick[1]]
		var cnt: int = per_unit.get(pick[2], 0)
		if up_used.has(keyu) or cnt >= 5:
			continue
		up_used[keyu] = true
		per_unit[pick[2]] = cnt + 1
		if cnt % 2 == 0 and not treasure.is_empty():
			things.append({"at": [pick[0].x, pick[0].y], "level": pick[1], "item": treasure[rng.randi() % treasure.size()]})
		elif not actors.is_empty() and pick[2] != 0:
			things.append({"at": [pick[0].x, pick[0].y], "level": pick[1], "actor": _weighted(rng, p.get("gallery_actors", actors)), "face": NAMES[rng.randi() % 4]})

	# ---- windows: a wall one cell thick with floor both sides and wall either end
	for y in range(1, H - 1):
		for x in range(1, W - 1):
			if g[y][x] != "#" or rng.randf() >= sh.get("window", 0.45):
				continue
			var ns: bool = g[y - 1][x] == "." and g[y + 1][x] == "." and g[y][x - 1] == "#" and g[y][x + 1] == "#"
			var ew: bool = g[y][x - 1] == "." and g[y][x + 1] == "." and g[y - 1][x] == "#" and g[y + 1][x] == "#"
			if (ns or ew) and windows.size() < int(sh.get("max_windows", 14)):
				var near := false
				for w2 in windows:
					if absi(w2[0] - x) + absi(w2[1] - y) < 2:
						near = true
				var a1: Vector2i = Vector2i(x, y - 1) if ns else Vector2i(x - 1, y)
				var a2: Vector2i = Vector2i(x, y + 1) if ns else Vector2i(x + 1, y)
				if not near and (room_of[a1.y][a1.x] >= 0 or room_of[a2.y][a2.x] >= 0) and not taken.has(a1) and not taken.has(a2):
					windows.append([x, y])

	# ---- traps: lasers across corridors, shock plates in them, vents in rooms
	var trap_n: Dictionary = sh.get("traps", {"laser": 2, "shock": 2, "vent": 3})
	var halls: Array = []                             # corridor cells with wall both sides and no door next to them
	for y in range(1, H - 1):
		for x in range(1, W - 1):
			if g[y][x] != "." or room_of[y][x] >= 0 or (Vector2i(x, y) - start).length() < 5.0:
				continue
			for d in 2:
				var f: Vector2i = DIRS[d]
				var s: Vector2i = DIRS[d + 1]
				if g[y + f.y][x + f.x] == "." and g[y - f.y][x - f.x] == "." and g[y + s.y][x + s.x] == "#" and g[y - s.y][x - s.x] == "#" \
						and room_of[y + f.y][x + f.x] < 0 and room_of[y - f.y][x - f.x] < 0:
					halls.append(Vector2i(x, y))
	var trapped := {}
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
				things.append({"at": [c.x, c.y], "trap": "laser", "cycle": [1.5, 1.3], "damage": 14, "phase": rng.randf() * 2.0})
			else:
				things.append({"at": [c.x, c.y], "trap": "shock", "period": 2.6, "damage": 18, "phase": rng.randf() * 2.0})
	for k in int(trap_n.get("vent", 0)):
		var a: Dictionary = areas[rng.randi_range(1, areas.size() - 1)]
		var r: Rect2i = a["rect"]
		var c := Vector2i(rng.randi_range(r.position.x, r.end.x - 1), rng.randi_range(r.position.y, r.end.y - 1))
		if a["unit"] == 0 or g[c.y][c.x] != "." or room_of[c.y][c.x] != a["unit"] or used.has(c) or taken.has(c) or trapped.has(c):
			continue
		trapped[c] = true
		things.append({"at": [c.x, c.y], "trap": "vent", "phase": rng.randf() * 4.0})

	# ---- pools. Last, because from here on the map has a letter that is neither wall nor plain floor.
	var busy := {}                                    # cells holding something that should stay dry
	for t in things:
		if t.has("at") and not t.has("level") and not t.has("actor"):
			busy[Vector2i(int(t["at"][0]), int(t["at"][1]))] = true
	var swimmers: Array = p.get("swimmers", [])
	var flooded := false
	var pools := 0
	for a in areas:
		var i: int = a["unit"]
		var r: Rect2i = a["rect"]
		if i == 0 or i == last or r.size.x < 4 or r.size.y < 4 or pools >= int(sh.get("max_pools", 3)) or rng.randf() >= sh.get("pool", 0.3):
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
				if g[y][x] == "." and room_of[y][x] == i and not taken.has(c) and not busy.has(c) and not trapped.has(c):
					g[y][x] = "~"
					wet.append(c)
		if wet.size() >= 3:
			flooded = true
			pools += 1
			if not swimmers.is_empty() and rng.randf() < 0.7:
				var c6: Vector2i = wet[rng.randi() % wet.size()]
				things.append({"at": [c6.x, c6.y], "actor": _weighted(rng, swimmers), "face": NAMES[rng.randi() % 4]})

	# ---- other floors: doors high in the wall between two halls, rooms upstairs, a basement, lifts and pits
	var storeys: Array = []
	var h0: Array = []                                # how many storeys of air stand on each cell of the main floor
	for y in H:
		var hr: Array = []
		for x in W:
			hr.append(0 if g[y][x] == "#" else 1)
		h0.append(hr)
	for a in areas:
		var r: Rect2i = a["rect"]
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				if room_of[y][x] == a["unit"] and g[y][x] != "#":
					h0[y][x] = a["height"]
	var is_win := {}
	for w3 in windows:
		is_win[Vector2i(w3[0], w3[1])] = true
	var deck1 := {}
	for dk in decks:
		if dk["level"] == 1:
			deck1[Vector2i(dk["at"][0], dk["at"][1])] = true
	var up: Array = []                                # storey 1
	for y in H:
		var ur2: Array = []
		ur2.resize(W)
		ur2.fill("#")
		up.append(ur2)
	var up_rooms: Array = []
	var lift_at := {}
	var inside := func(c: Vector2i) -> bool: return c.x >= 1 and c.y >= 1 and c.x < W - 1 and c.y < H - 1
	var plain := func(c: Vector2i) -> bool:           # main-floor cell with nothing on it that would mind
		return g[c.y][c.x] == "." and not used.has(c) and not taken.has(c) and not busy.has(c) and not trapped.has(c) and not lift_at.has(c)
	var nook := func(c: Vector2i) -> bool:            # ... in the corner of a one-storey room the player can get to: where a lift can stand
		if not plain.call(c) or room_of[c.y][c.x] < 1 or h0[c.y][c.x] != 1 or not seen.has(c):
			return false
		var r: Rect2i = rects[room_of[c.y][c.x]]
		if c.x == r.get_center().x or c.y == r.get_center().y:
			return false
		var n_solid := 0
		for d in DIRS:
			if g[c.y + d.y][c.x + d.x] == "#":
				n_solid += 1
			elif g[c.y + d.y][c.x + d.x] != ".":
				return false                             # beside a door or a pool
		return n_solid >= 2
	var wall_cells: Array = []
	for y in range(2, H - 2):
		for x in range(2, W - 2):
			if g[y][x] == "#" and not is_win.has(Vector2i(x, y)):
				wall_cells.append(Vector2i(x, y))
	_shuffle(rng, wall_cells)
	var n_up_doors := 0
	for c in wall_cells:                              # a door a storey up, from one hall's balcony through to the next hall
		if n_up_doors >= int(sh.get("upper_doors", 2)):
			break
		for k in 4:
			var f: Vector2i = DIRS[k]
			var s2: Vector2i = DIRS[(k + 1) % 4]
			var a: Vector2i = c + f
			var b: Vector2i = c - f
			if not deck1.has(a) or g[b.y][b.x] != "." or h0[b.y][b.x] < 2 or room_of[a.y][a.x] == room_of[b.y][b.x] or taken.has(b):
				continue
			if h0[c.y + s2.y][c.x + s2.x] > 1 or h0[c.y - s2.y][c.x - s2.x] > 1 or up[c.y][c.x] != "#":
				continue
			up[c.y][c.x] = letters[rng.randi() % doors.size()]
			for land in [b, b + s2, b - s2]:              # somewhere to stand on the far side: a landing that looks down into that hall
				if g[land.y][land.x] == "." and h0[land.y][land.x] >= 2 and room_of[land.y][land.x] == room_of[b.y][b.x] and not taken.has(land) and not deck1.has(land):
					decks.append({"at": [land.x, land.y], "level": 1})
					deck1[land] = true
			if not treasure.is_empty():
				things.append({"at": [b.x, b.y], "level": 1, "item": treasure[rng.randi() % treasure.size()]})
			n_up_doors += 1
			break
	var fits_up := func(r: Rect2i, door: Vector2i) -> bool:      # a room upstairs can go over rock or over one-storey rooms, and not against another
		for y in range(r.position.y - 1, r.end.y + 1):
			for x in range(r.position.x - 1, r.end.x + 1):
				var c := Vector2i(x, y)
				if not inside.call(c):
					return false
				if c != door and up[y][x] != "#":
					return false
				if r.has_point(c) and (h0[y][x] > 1 or lift_at.has(c)):
					return false
		return true
	var under := {}                                   # basement cells with something in them: no pit over those
	var furnish := func(r: Rect2i, level: int, name: String) -> Dictionary:
		var st: String = styles[rng.randi() % styles.size()]
		var cells2: Array = []
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				cells2.append(Vector2i(x, y))
		_shuffle(rng, cells2)
		var n := 0
		for c in cells2:
			if lift_at.has(c) or n >= 2 + cells2.size() / 6:
				continue
			n += 1
			if level < 0:
				under[c] = true
			if n % 2 == 1 and not treasure.is_empty():
				things.append({"at": [c.x, c.y], "level": level, "item": treasure[rng.randi() % treasure.size()]})
			elif not actors.is_empty():
				things.append({"at": [c.x, c.y], "level": level, "actor": _weighted(rng, actors), "face": NAMES[rng.randi() % 4]})
		return {"name": name, "rect": [r.position.x, r.position.y, r.size.x, r.size.y], "style": st, "height": 1, "quiet": true}
	var n_up_rooms := 0
	for c in wall_cells:                              # a room upstairs, through a door off a balcony
		if n_up_rooms >= int(sh.get("upper_rooms", 2)):
			break
		for k in 4:
			var f: Vector2i = DIRS[k]
			var s2: Vector2i = DIRS[(k + 1) % 4]
			if not deck1.has(c + f) or up[c.y][c.x] != "#" or h0[c.y + s2.y][c.x + s2.x] > 1 or h0[c.y - s2.y][c.x - s2.x] > 1:
				continue
			var deep := rng.randi_range(3, 4)
			var wide := rng.randi_range(3, 5)
			var off := rng.randi_range(0, wide - 1)
			var o: Vector2i = c - f - s2 * off                # the corner of the room nearest the door
			var far: Vector2i = o - f * (deep - 1) + s2 * (wide - 1)
			var r := Rect2i(mini(o.x, far.x), mini(o.y, far.y), absi(far.x - o.x) + 1, absi(far.y - o.y) + 1)
			if not fits_up.call(r, c):
				continue
			for y in range(r.position.y, r.end.y):
				for x in range(r.position.x, r.end.x):
					up[y][x] = "."
			up[c.y][c.x] = letters[rng.randi() % doors.size()]
			n_up_rooms += 1
			up_rooms.append(furnish.call(r, 1, "Upstairs %d" % n_up_rooms))
			break
	var nooks2: Array = []
	for y in range(2, H - 2):
		for x in range(2, W - 2):
			if nook.call(Vector2i(x, y)):
				nooks2.append(Vector2i(x, y))
	_shuffle(rng, nooks2)
	for c in nooks2:                                  # a room upstairs that only a lift goes to
		if n_up_rooms >= int(sh.get("upper_rooms", 2)) + int(sh.get("lift_rooms", 1)):
			break
		if not nook.call(c):
			continue
		for k in 4:
			var f: Vector2i = DIRS[(k + rng.randi()) % 4]
			var s2: Vector2i = DIRS[(DIRS.find(f) + 1) % 4]
			var deep := rng.randi_range(3, 4)
			var wide := rng.randi_range(3, 4)
			var o: Vector2i = c + f - s2 * rng.randi_range(0, wide - 1)
			var far: Vector2i = o + f * (deep - 1) + s2 * (wide - 1)
			var r := Rect2i(mini(o.x, far.x), mini(o.y, far.y), absi(far.x - o.x) + 1, absi(far.y - o.y) + 1)
			if r.has_point(c) or not fits_up.call(r, Vector2i(-9, -9)):
				continue
			var shaft_clear := true                       # the shaft itself must stand in rock up there
			for d in DIRS:
				var q: Vector2i = c + d
				if not r.has_point(q) and (h0[q.y][q.x] > 1 or up[q.y][q.x] != "#"):
					shaft_clear = false
			if not shaft_clear:
				continue
			for y in range(r.position.y, r.end.y):
				for x in range(r.position.x, r.end.x):
					up[y][x] = "."
			lift_at[c] = true
			used[c] = true
			things.append({"at": [c.x, c.y], "lift": [0, 1], "home": 0})
			n_up_rooms += 1
			up_rooms.append(furnish.call(r, 1, "Upstairs %d" % n_up_rooms))
			break
	if n_up_doors + n_up_rooms > 0:
		var rows1: Array = []
		for row in up:
			rows1.append("".join(PackedStringArray(row)))
		storeys.append({"level": 1, "map": rows1, "rooms": up_rooms})
	# the basement: a few chambers under the place, a lift down to them, and pits in the floor above
	var n_pits := 0
	if rng.randf() < sh.get("basement", 0.85):
		var shaft := Vector2i(-1, -1)
		for i in range(nooks2.size() - 1, -1, -1):
			if nook.call(nooks2[i]):
				shaft = nooks2[i]
				break
		if shaft.x > 0:
			var bg: Array = []
			var b_in: Array = []
			for y in H:
				var br: Array = []
				br.resize(W)
				br.fill("#")
				bg.append(br)
				var bi: Array = []
				bi.resize(W)
				bi.fill(-1)
				b_in.append(bi)
			var brects: Array = []
			var guard := 0
			while brects.size() < int(sh.get("basement_rooms", 4)) and guard < 300:
				guard += 1
				var bw := rng.randi_range(4, 7)
				var bh := rng.randi_range(3, 6)
				var br2 := Rect2i(rng.randi_range(1, W - bw - 1), rng.randi_range(1, H - bh - 1), bw, bh)
				if brects.is_empty():                         # the first one has the lift in it, off its middle lines
					br2.position = shaft - Vector2i(rng.randi_range(0, bw - 1), rng.randi_range(0, bh - 1))
					if br2.position.x < 1 or br2.position.y < 1 or br2.end.x > W - 1 or br2.end.y > H - 1 or shaft.x == br2.get_center().x or shaft.y == br2.get_center().y:
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
			if not brects.is_empty():
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
				for y in range(1, H - 1):                    # doors on the thresholds, the same rule as upstairs
					for x in range(1, W - 1):
						if bg[y][x] != "." or b_in[y][x] >= 0 or rng.randf() > 0.7:
							continue
						for d in 2:
							var f: Vector2i = DIRS[d]
							var s2: Vector2i = DIRS[d + 1]
							if bg[y + f.y][x + f.x] == "." and bg[y - f.y][x - f.x] == "." and bg[y + s2.y][x + s2.x] == "#" and bg[y - s2.y][x - s2.x] == "#" \
									and (b_in[y + f.y][x + f.x] >= 0) != (b_in[y - f.y][x - f.x] >= 0):
								bg[y][x] = letters[rng.randi() % doors.size()]
								break
				lift_at[shaft] = true
				used[shaft] = true
				things.append({"at": [shaft.x, shaft.y], "lift": [-1, 0], "home": 0})
				var b_rooms: Array = []
				for i in brects.size():
					b_rooms.append(furnish.call(brects[i], -1, "%s %d" % [p.get("basement_name", "Undercroft"), i + 1]))
				var spots: Array = []                         # pits: in a room, off the lines the corridors come in on, over the basement
				for y in range(2, H - 2):
					for x in range(2, W - 2):
						var c := Vector2i(x, y)
						if bg[y][x] != "." or under.has(c) or not plain.call(c) or room_of[y][x] < 1 or (c - start).length() < 4.0:
							continue
						var r: Rect2i = rects[room_of[y][x]]
						var by_door := false
						for d in DIRS:
							if g[y + d.y][x + d.x] != "." and g[y + d.y][x + d.x] != "#":
								by_door = true
						if c.x != r.get_center().x and c.y != r.get_center().y and not by_door:
							spots.append(c)
				_shuffle(rng, spots)
				var pits: Array = []
				for c in spots:
					if pits.size() >= int(sh.get("pits", 3)):
						break
					var crowd := false
					for o3 in pits:
						if (o3 - c).length() < 3.0:
							crowd = true
					if not crowd:
						pits.append(c)
						used[c] = true
						things.append({"at": [c.x, c.y], "trap": "pit"})
				n_pits = pits.size()
				var rowsb: Array = []
				for row in bg:
					rowsb.append("".join(PackedStringArray(row)))
				storeys.append({"level": -1, "map": rowsb, "rooms": b_rooms})

	# ---- taking the card brings company to the big room
	var triggers: Array = []
	var tags := {}
	var amb: Variant = sh.get("ambush", true)
	if amb and lock and not actors.is_empty() and last >= 2:
		var hr: Rect2i = rects[1 if key_room != 1 else 2]
		var spots: Array = []
		for dc in [Vector2i(0, 0), Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var c: Vector2i = clear.call(hr.get_center() + dc)
			if g[c.y][c.x] != "#" and room_of[c.y][c.x] >= 0 and not spots.has([c.x, c.y]):
				spots.append([c.x, c.y])
		if not spots.is_empty():
			tags["ambush"] = spots
			triggers.append({"on": {"type": "flag", "name": "key_red"}, "do": [
				{"type": "message", "text": p.get("ambush_text", "RED CARD REMOVED. Somebody has been told."), "kind": "warn", "delay": 0.6},
				{"type": "alarm", "delay": 0.6},
				{"type": "spawn", "tag": "ambush", "actor": _weighted(rng, p.get("ambush_actors", actors)), "count": rng.randi_range(2, 3), "delay": 1.5}]})

	var map: Array = []
	for row in g:
		map.append("".join(PackedStringArray(row)))
	var out := {"diags": diags, "decks": decks, "ramps": ramps, "windows": windows, "walls": walls, "seed": seed_value,
		"name": "%s %d" % [p.get("place", "Installation"), seed_value % 1000], "kit": p.get("kit", "hightech"),
		"style": p.get("corridor", "corridor"), "ambient_energy": 0.6, "legend": legend, "map": map, "rooms": rooms, "things": things,
		"tags": tags, "triggers": triggers,
		"intro": "%s %d. Find the red card, reach the last room." % [p.get("place", "Installation"), seed_value % 1000],
		"objectives": [{"text": "Find the RED card.", "done": "key_red"}, {"text": "Get through the vault door and signal the surface."}]}
	if not storeys.is_empty():
		out["floors"] = storeys
	if flooded:
		out["fluid"] = p.get("fluid", {"level": 0.7, "color": [0.12, 0.55, 0.35, 0.6], "glow": 0.35})
	return out


func _shuffle(rng: RandomNumberGenerator, a: Array) -> void:
	for i in range(a.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var t: Variant = a[i]
		a[i] = a[j]
		a[j] = t


func _is_door(g: Array, q: Vector2i) -> bool:
	var ch: String = g[q.y][q.x]
	return ch != "#" and ch != "." and ch != "~"


func _weighted(rng: RandomNumberGenerator, list: Array) -> String:
	var total := 0.0
	for e in list:
		total += e[1]
	var r := rng.randf() * total
	for e in list:
		r -= e[1]
		if r <= 0.0:
			return e[0]
	return list[0][0]
