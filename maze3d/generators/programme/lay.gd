extends RefCounted
## ProgrammeLayout - lays a plan (ProgrammePlan) out as cells (SPEC.md 6.3): the spine is a corridor along one row,
## threaded through the spine rooms in order from west to east (a door in each room's west and east wall on that row).
## A wing is a branch corridor going north or south from the spine, with its rooms on both sides, nearest the spine
## first, each with a door onto it, one wall between neighbours (a door in it for "door_to").
## Compact (Eric, 22 Nov: "make the generator create things more compact"): a wing's branch corridor leaves the spine
## between two spine rooms, but its rooms may reach out east and west over the spine rooms beside it, starting just
## beyond them, so the corridor between spine rooms only has to be long enough for the branch corridors (and the seed's
## gap), not for whole wings. Wings on one side never overlap one another: each starts east of the one before.
## Walls are whole cells, as everywhere in the engine; a door only ever stands in a wall cell with floor on both sides
## and wall to both flanks. Nothing here draws a random number: the plan made every choice.
## A link (the plan's "links") runs both its wings' branch corridors on past everything on their side between them, a
## wall row beyond the farthest, and joins them there along one row: a ring round the outside, with a door in its
## middle if it asks for one.
class_name ProgrammeLayout

var plan: ProgrammePlan
var W := 0
var H := 0
var y0 := 0                         # the spine's row
var g: Array = []                   # rows of one-letter strings: "#" wall, "." floor
var rects: Dictionary = {}          # room id -> Rect2i of its floor
var doors: Array = []               # {"at": Vector2i, "rooms": [ids], "wing": id or ""}: every doorway
var junctions: Dictionary = {}      # wing id -> the cell where its branch meets the spine
var corridors: Array = []           # Rect2i: the spine's and the wings' corridors
var rings: Dictionary = {}          # link id -> Rect2i: the row joining its two wings (their corridors' ends left out)
var _ring_rows: Dictionary = {}     # wing id -> how many rows from the spine's row its link's row is


func _init(p: ProgrammePlan) -> void:
	plan = p
	var xs := _columns()
	W = int(xs["width"])
	var clear := {}
	for w in plan.wings:
		clear[w["id"]] = _clearance(w, xs)
	for ln in plan.links:
		var r := _ring_row(ln, xs, clear)
		_ring_rows[ln["from"]] = r
		_ring_rows[ln["to"]] = r
	y0 = maxi(_reach("n", clear), _reach_spine(true)) + 1
	H = y0 + maxi(_reach("s", clear), _reach_spine(false)) + 2
	for y in H:
		var row: Array = []
		row.resize(W)
		row.fill("#")
		g.append(row)
	_spine(xs)
	for w in plan.wings:
		_wing(w, int(xs["branch"][w["id"]]), int(clear[w["id"]]))
	for ln in plan.links:
		_ring(ln, xs)


## How far the wings on a side reach from the spine: past the spine rooms they reach over, then their longer side (a
## wall per room).
func _reach(side: String, clear: Dictionary) -> int:
	var n := 0
	for w in plan.wings:
		if w["side"] == side:
			n = maxi(n, maxi(_far(w, clear), int(_ring_rows.get(w["id"], 0))))
	return n


## How many rows from the spine's row a wing's farthest floor is (its corridor's end, without a link).
func _far(w: Dictionary, clear: Dictionary) -> int:
	return int(clear[w["id"]]) - 2 + maxi(plan.length(w["west"]), plan.length(w["east"]))


## The columns a wing's rooms and corridor take: [first, past the last).
func _span(w: Dictionary, xs: Dictionary) -> Vector2i:
	var xb := int(xs["branch"][w["id"]])
	var wl := plan.width(w["west"])
	var wr := plan.width(w["east"])
	return Vector2i(xb - 1 - wl if wl > 0 else xb, xb + 2 + wr if wr > 0 else xb + 1)


## A link's row, in rows from the spine's: a wall row past the farthest floor between its two branch corridors (the
## wings on its side reaching into those columns, the spine rooms bulging that way), and then the row itself.
func _ring_row(ln: Dictionary, xs: Dictionary, clear: Dictionary) -> int:
	var xa := int(xs["branch"][ln["from"]])
	var xb := int(xs["branch"][ln["to"]])
	var lo := mini(xa, xb)
	var hi := maxi(xa, xb) + 1
	var n := 0
	for w in plan.wings:
		var sp := _span(w, xs)
		if w["side"] == ln["side"] and sp.x < hi and sp.y > lo:
			n = maxi(n, _far(w, clear))
	for id in plan.spine:
		var rx := int(xs["room"][id])
		if rx - 1 < hi and rx + int(plan.rooms[id]["w"]) + 1 > lo:
			n = maxi(n, _half(id, ln["side"] == "n"))
	return n + 2


## The link's row joining its wings' corridors (each already run on to it), and its door.
func _ring(ln: Dictionary, xs: Dictionary) -> void:
	var xa := int(xs["branch"][ln["from"]])
	var xb := int(xs["branch"][ln["to"]])
	var y := y0 + (-1 if ln["side"] == "n" else 1) * int(_ring_rows[ln["from"]])
	var rc := Rect2i(mini(xa, xb) + 1, y, absi(xb - xa) - 1, 1)
	_carve(rc)
	rings[ln["id"]] = rc
	if ln.get("door", false) and rc.size.x >= 1:
		_door(Vector2i(rc.position.x + rc.size.x / 2, y), [], "", ln["id"])


## How far the spine rooms' floors reach above (or below) the spine's row (a wing's reach counts the same way: its
## farthest floor row).
func _reach_spine(up: bool) -> int:
	var n := 0
	for id in plan.spine:
		n = maxi(n, _half(id, up))
	return n


## Rows of a spine room's floor above (up) or below the spine's row.
func _half(id: String, up: bool) -> int:
	var h := int(plan.rooms[id]["h"])
	return (h - 1) / 2 if up else h - 1 - (h - 1) / 2


## Where each spine room's floor starts across the map, where the corridor after it starts and how long it is, and
## where each wing's branch corridor leaves it. Walking east: a wing's branch goes as far west in its stretch of
## corridor as it can, with its west rooms clear of the wings on its side before it (a wall between); the stretch
## runs on until every branch in it has left, and at least the seed's gap.
func _columns() -> Dictionary:
	var out := {"room": {}, "after": {}, "branch": {}}
	var free := {"n": 1, "s": 1}                       # per side: the first column a wing's room may take
	var x := 1
	for i in plan.spine.size():
		var id: String = plan.spine[i]
		out["room"][id] = x
		x += int(plan.rooms[id]["w"]) + 1                 # the floor, then its east wall
		if i == plan.spine.size() - 1:
			break
		var e := x + maxi(1, int(plan.gaps.get(id, 1)))   # the stretch: [x, e)
		for side in ["n", "s"]:
			for w in plan.wings_after(id, side):
				var wl := plan.width(w["west"])
				var wr := plan.width(w["east"])
				var xb := maxi(x, int(free[side]) + (wl + 1 if wl > 0 else 0))
				out["branch"][w["id"]] = xb
				free[side] = (xb + 2 + wr if wr > 0 else xb + 1) + 1
				e = maxi(e, xb + 1)
		out["after"][id] = [x, e - x]
		x = e + 1                                         # the next room's west wall, then its floor
	out["width"] = maxi(x, maxi(int(free["n"]), int(free["s"])))
	return out


## How many rows from the spine's row to a wing's first room: two (a wall row between) beside the corridor, or past
## the spine rooms its rooms reach over (their walls included) and a wall row.
func _clearance(w: Dictionary, xs: Dictionary) -> int:
	var sp := _span(w, xs)                               # [x, y): the columns its rooms take
	var n := 2
	for id in plan.spine:
		var rx := int(xs["room"][id])
		if sp.x < rx + int(plan.rooms[id]["w"]) + 1 and sp.y > rx - 1:
			n = maxi(n, _half(id, w["side"] == "n") + 2)
	return n


func _spine(xs: Dictionary) -> void:
	for i in plan.spine.size():
		var id: String = plan.spine[i]
		var r: Dictionary = plan.rooms[id]
		var h := int(r["h"])
		var rect := Rect2i(int(xs["room"][id]), y0 - (h - 1) / 2, int(r["w"]), h)
		_carve(rect)
		rects[id] = rect
		if i > 0:
			_door(Vector2i(rect.position.x - 1, y0), [id], "")         # in from the corridor before it
		if xs["after"].has(id):
			_door(Vector2i(rect.end.x, y0), [id], "")                   # out to the corridor after it
			var a: Array = xs["after"][id]
			var cor := Rect2i(int(a[0]), y0, int(a[1]), 1)
			_carve(cor)
			corridors.append(cor)


## A wing: its branch corridor off the spine, its rooms up (or down) each side past `clear` rows, their doors.
func _wing(w: Dictionary, xb: int, clear: int) -> void:
	var dy := -1 if w["side"] == "n" else 1
	var reach := maxi(clear - 2 + maxi(plan.length(w["west"]), plan.length(w["east"])), int(_ring_rows.get(w["id"], 0)))
	var y_far := y0 + dy * reach
	var cor := Rect2i(xb, mini(y0 + dy, y_far), 1, absi(y_far - y0))
	_carve(cor)
	corridors.append(cor)
	junctions[w["id"]] = Vector2i(xb, y0 + dy)
	if w.get("door", false):                           # a door where the wing meets the spine
		_door(junctions[w["id"]], [], w["id"])
	for side in ["west", "east"]:
		_side(w, side, xb, dy, clear)


## One side of a wing: its rooms against the branch corridor, nearest the spine first.
func _side(w: Dictionary, side: String, xb: int, dy: int, clear: int) -> void:
	var near := y0 + clear * dy                            # the row nearest the spine
	var prev := ""
	for id in w[side]:
		var r: Dictionary = plan.rooms[id]
		var rw := int(r["w"])
		var rh := int(r["h"])
		var x := xb - 1 - rw if side == "west" else xb + 2
		var y := near if dy > 0 else near - rh + 1
		var rect := Rect2i(x, y, rw, rh)
		_carve(rect)
		rects[id] = rect
		var mid := rect.position.y + rh / 2
		_door(Vector2i(xb - 1 if side == "west" else xb + 1, mid), [id], w["id"])
		if prev != "" and str(r.get("door_to", "")) == prev:
			_door_between(prev, id, dy)
		prev = id
		near += dy * (rh + 1)


## The door in the wall row between two rooms one after the other on a wing's side, in the middle of where they meet.
func _door_between(a: String, b: String, dy: int) -> void:
	var ra: Rect2i = rects[a]
	var rb: Rect2i = rects[b]
	var x0 := maxi(ra.position.x, rb.position.x)
	var x1 := mini(ra.end.x, rb.end.x) - 1
	var y := ra.position.y - 1 if dy < 0 else ra.end.y
	_door(Vector2i((x0 + x1) / 2, y), [a, b], "")


func _carve(r: Rect2i) -> void:
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			g[y][x] = "."


func _door(at: Vector2i, rooms: Array, wing: String, link := "") -> void:
	g[at.y][at.x] = "+"
	doors.append({"at": at, "rooms": rooms, "wing": wing, "link": link})


## The doors of a room.
func doors_of(id: String) -> Array:
	return doors.filter(func(d: Dictionary) -> bool: return d["rooms"].has(id))


## The map as a level file writes it.
func rows() -> Array:
	return g.map(func(r: Array) -> String: return "".join(r))


## Move the whole layout by d on a map of w by h (bigger, walls round it): two floors are laid out apart and then lined
## up by their lift bank (ProgrammeFloors), and an installation's levels by where their bank stands.
func shift(d: Vector2i, w: int, h: int) -> void:
	var ng: Array = []
	for y in h:
		var row: Array = []
		row.resize(w)
		row.fill("#")
		ng.append(row)
	for y in H:
		for x in W:
			if g[y][x] != "#":
				ng[y + d.y][x + d.x] = g[y][x]
	g = ng
	W = w
	H = h
	y0 += d.y
	for id in rects:
		rects[id] = Rect2i(rects[id].position + d, rects[id].size)
	for dr in doors:
		dr["at"] += d
	for k in junctions:
		junctions[k] += d
	for i in corridors.size():
		corridors[i] = Rect2i(corridors[i].position + d, corridors[i].size)
	for k in rings:
		rings[k] = Rect2i(rings[k].position + d, rings[k].size)


## Is this cell floor (or a door) on this layout's map?
func open_at(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < W and c.y < H and g[c.y][c.x] != "#"
