extends RefCounted
## ProgrammeLayout - lays a plan (ProgrammePlan) out as cells (SPEC.md 6.3): the spine is a corridor along one row,
## threaded through the spine rooms in order from west to east (a door in each room's west and east wall on that row);
## between two spine rooms the corridor runs on far enough to leave room for the wings that branch there, and the
## seed's gap. A wing is a branch corridor going north or south from the spine, with its rooms on both sides, nearest
## the spine first, each with a door onto it, one wall between neighbours (a door in it for "door_to"). Walls are whole
## cells, as everywhere in the engine; a door only ever stands in a wall cell with floor on both sides and wall to both
## flanks. Nothing here draws a random number: the plan made every choice.
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


func _init(p: ProgrammePlan) -> void:
	plan = p
	var xs := _columns()
	W = int(xs["width"])
	y0 = maxi(_reach("n"), _reach_spine(true)) + 1
	H = y0 + maxi(_reach("s"), _reach_spine(false)) + 2
	for y in H:
		var row: Array = []
		row.resize(W)
		row.fill("#")
		g.append(row)
	_spine(xs)
	for w in plan.wings:
		_wing(w, xs)


## How far the wings on a side reach from the spine (their longer side, a wall per room).
func _reach(side: String) -> int:
	var n := 0
	for w in plan.wings:
		if w["side"] == side:
			n = maxi(n, maxi(plan.length(w["west"]), plan.length(w["east"])))
	return n


## How far the spine rooms' floors reach above (or below) the spine's row (a wing's reach counts the same way: its
## farthest floor row).
func _reach_spine(up: bool) -> int:
	var n := 0
	for id in plan.spine:
		var h := int(plan.rooms[id]["h"])
		n = maxi(n, (h - 1) / 2 if up else h - 1 - (h - 1) / 2)
	return n


## Where each spine room's floor starts across the map, and where the corridor after it starts and how long it is:
## long enough for the plan's gap and for the wings branching there, side by side, on whichever side is wider.
func _columns() -> Dictionary:
	var out := {"room": {}, "after": {}}
	var x := 1
	for i in plan.spine.size():
		var id: String = plan.spine[i]
		out["room"][id] = x
		x += int(plan.rooms[id]["w"]) + 1                 # the floor, then its east wall
		if i == plan.spine.size() - 1:
			break
		var need := maxi(_footprints(id, "n"), _footprints(id, "s"))
		var run := maxi(need, int(plan.gaps.get(id, 1)))
		out["after"][id] = [x, run]
		x += run + 1                                      # the corridor, then the next room's west wall
	out["width"] = x
	return out


## How many columns the wings branching after a room on one side take, side by side.
func _footprints(id: String, side: String) -> int:
	var n := 0
	for w in plan.wings_after(id, side):
		n += footprint(w)
	return n


## A wing's columns: its west rooms and a wall, the branch corridor, a wall and its east rooms.
func footprint(w: Dictionary) -> int:
	var wl := plan.width(w["west"])
	var wr := plan.width(w["east"])
	return (wl + 1 if wl > 0 else 0) + 1 + (wr + 1 if wr > 0 else 0)


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


## A wing: its branch corridor off the spine, its rooms up (or down) each side, their doors.
func _wing(w: Dictionary, xs: Dictionary) -> void:
	var a: Array = xs["after"][w["after"]]
	var s := int(a[0])
	for other in plan.wings_after(w["after"], w["side"]):            # wings on the same side sit side by side
		if other == w:
			break
		s += footprint(other)
	var wl := plan.width(w["west"])
	var xb := s + (wl + 1 if wl > 0 else 0)
	var dy := -1 if w["side"] == "n" else 1
	var reach := maxi(plan.length(w["west"]), plan.length(w["east"]))
	var y_far := y0 + dy * reach
	var cor := Rect2i(xb, mini(y0 + dy, y_far), 1, absi(y_far - y0))
	_carve(cor)
	corridors.append(cor)
	junctions[w["id"]] = Vector2i(xb, y0 + dy)
	if w.get("door", false):                           # a door where the wing meets the spine
		_door(junctions[w["id"]], [], w["id"])
	for side in ["west", "east"]:
		_side(w, side, xb, dy)


## One side of a wing: its rooms against the branch corridor, nearest the spine first.
func _side(w: Dictionary, side: String, xb: int, dy: int) -> void:
	var near := y0 + 2 * dy                                # the row nearest the spine (a wall row between)
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


func _door(at: Vector2i, rooms: Array, wing: String) -> void:
	g[at.y][at.x] = "+"
	doors.append({"at": at, "rooms": rooms, "wing": wing})


## The doors of a room.
func doors_of(id: String) -> Array:
	return doors.filter(func(d: Dictionary) -> bool: return d["rooms"].has(id))


## The map as a level file writes it.
func rows() -> Array:
	return g.map(func(r: Array) -> String: return "".join(r))
