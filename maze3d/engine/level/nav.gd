extends RefCounted
## LevelNav - the walking graph of a level, and the questions asked of it: how do I get there, can the player get
## there at all, how high is the floor here. Points per cell: the ground (layer 0), a balcony one or two storeys up
## (layers 1, 2) and a ramp (layer 3), on every floor. Lifts and pits are hops: they join places nobody walks between.
class_name LevelNav

var ld: LevelData
var astar := AStar3D.new()
var _pt: Dictionary = {}         # nav point -> [x, y, floor, layer]
var _hops: Dictionary = {}       # nav point -> points a lift or a fall takes you to (not walked: see reach())


func _init(data: LevelData) -> void:
	ld = data


func build() -> void:
	astar = AStar3D.new()
	for f in ld.floors:
		for y in ld.h:
			for x in ld.w:
				_add_points(x, y, f)
	for f in ld.floors:
		for y in ld.h:
			for x in ld.w:
				if not ld.cell(x, y, f)["solid"]:
					_link_cell(x, y, f)


func _add_points(x: int, y: int, f: int) -> void:
	var c := ld.cell(x, y, f)
	if c["solid"]:
		return
	var p := ld.center(Vector2i(x, y), f * ld.H)
	if _ground_ok(c):
		_add(x, y, 0, f, p)
	for lv in c["decks"]:
		_add(x, y, lv, f, p + Vector3(0, lv * ld.H, 0))
	if not c["ramp"].is_empty():
		_add(x, y, 3, f, Vector3(p.x, (float(c["ramp"].get("from", 0)) + float(c["ramp"].get("to", 0))) / 2, p.z))


func _add(x: int, y: int, layer: int, f: int, at: Vector3) -> void:
	astar.add_point(_nid(x, y, layer, f), at)
	_pt[_nid(x, y, layer, f)] = [x, y, f, layer]


func _link_cell(x: int, y: int, f: int) -> void:
	var c := ld.cell(x, y, f)
	for lv in [0] + c["decks"]:                  # every floor and balcony joins whatever stands at its height next door, on any floor
		var id := _nid(x, y, lv, f)
		if not astar.has_point(id):
			continue
		for d in 4:
			if c["edges"].has(d) or (lv == 0 and _shut(c, d)):
				continue
			var t := _at_height(x + LevelData.DIRS[d].x, y + LevelData.DIRS[d].y, (f + lv) * ld.H, false)
			if t < 0:
				continue
			var tp: Array = _pt[t]
			if tp[3] == 0 and _shut(ld.cell(tp[0], tp[1], tp[2]), (d + 2) % 4):
				continue
			_link(id, t)
	if astar.has_point(_nid(x, y, 0, f)):
		_link_corners(x, y, f, c)
	var r: Dictionary = c["ramp"]
	if not r.is_empty():
		var rd: int = LevelData.DIR_NAMES.get(r.get("dir", "n"), 0)
		_link(_nid(x, y, 3, f), _at_height(x + LevelData.DIRS[rd].x, y + LevelData.DIRS[rd].y, float(r.get("to", 0))))
		_link(_nid(x, y, 3, f), _at_height(x - LevelData.DIRS[rd].x, y - LevelData.DIRS[rd].y, float(r.get("from", 0))))
	if c.get("pit", false):                      # down the hole
		var under := ld.cell_s(x, y, f - 1)
		_hop(_nid(x, y, 0, f), _nid(x, y, 0, int(under["f"])) if not under.is_empty() else -1)
	if c.has("lift"):
		_link_lift(x, y, f, c)


## Corners, only when nothing is in the way either side.
func _link_corners(x: int, y: int, f: int, c: Dictionary) -> void:
	var dirs := LevelData.DIRS
	for d in 4:
		var d2 := (d + 1) % 4
		var a: Vector2i = Vector2i(x, y) + dirs[d]
		var b: Vector2i = Vector2i(x, y) + dirs[d2]
		var t2: Vector2i = a + dirs[d2]
		if _open_side(x, y, d, f) and _open_side(x, y, d2, f) and _open_side(a.x, a.y, d2, f) and _open_side(b.x, b.y, d, f):
			if c["diag"] == "" and ld.cell(a.x, a.y, f)["diag"] == "" and ld.cell(b.x, b.y, f)["diag"] == "" and ld.cell(t2.x, t2.y, f)["diag"] == "":
				_link(_nid(x, y, 0, f), _nid(t2.x, t2.y, 0, f))


## A lift joins whatever stands beside the shaft at each of its stops.
func _link_lift(x: int, y: int, f: int, c: Dictionary) -> void:
	var ring: Array = []
	for st in c["lift"]:
		for d in 4:
			var t3 := _at_height(x + LevelData.DIRS[d].x, y + LevelData.DIRS[d].y, st * ld.H, false)
			if t3 >= 0:
				ring.append(t3)
	for a2 in ring:
		for b2 in ring:
			_hop(a2, b2)
	astar.set_point_disabled(_nid(x, y, 0, f), true)      # nothing should stand about under it


func _nid(x: int, y: int, layer: int, f := 0) -> int:
	return (((f - ld.f_min) * 4 + layer) * ld.h + y) * ld.w + x


func _ground_ok(c: Dictionary) -> bool:
	if c["solid"] or c["window"] != "":
		return false
	var r: Dictionary = c["ramp"]
	return r.is_empty() or min(float(r.get("from", 0)), float(r.get("to", 0))) >= (int(c["f"]) + 1) * ld.H - 0.1


## Can something on the ground step from (x, y) toward side d?
func _open_side(x: int, y: int, d: int, f := 0) -> bool:
	var c := ld.cell(x, y, f)
	if _shut(c, d):
		return false
	var nb := ld.cell(x + LevelData.DIRS[d].x, y + LevelData.DIRS[d].y, f)
	return _ground_ok(nb) and not _shut(nb, (d + 2) % 4)


## Is side d of this cell closed by a thin wall or a cut corner?
func _shut(c: Dictionary, d: int) -> bool:
	return c["edges"].has(d) or (c["diag"] != "" and d in LevelData.DIAG[c["diag"]][0])


func _link(a: int, b: int) -> void:
	if astar.has_point(a) and astar.has_point(b) and a != b:
		astar.connect_points(a, b)


## The point of cell (x, y) that stands at height yy, or -1.
func _at_height(x: int, y: int, yy: float, ramps := true) -> int:
	for f in ld.floors:
		var c := ld.cell(x, y, f)
		if c["solid"]:
			continue
		var r: Dictionary = c["ramp"]
		if ramps and not r.is_empty() and (absf(float(r.get("from", 0)) - yy) < 0.1 or absf(float(r.get("to", 0)) - yy) < 0.1):
			return _nid(x, y, 3, f)
		if absf(f * ld.H - yy) < 0.1 and _ground_ok(c):
			return _nid(x, y, 0, f)
		for lv in c["decks"]:
			if absf((f + lv) * ld.H - yy) < 0.1:
				return _nid(x, y, lv, f)
	return -1


func _hop(a: int, b: int) -> void:
	if a >= 0 and b >= 0 and a != b and astar.has_point(a) and astar.has_point(b):
		if not _hops.has(a):
			_hops[a] = []
		_hops[a].append(b)


# ------------------------------------------------------------------ questions
## Can the player get from one place to the other at all: walking, by lift, or by falling down a pit?
func reach(from: Vector3, to: Vector3) -> bool:
	var a := point_at(from)
	var b := point_at(to)
	if a < 0 or b < 0:
		return false
	var seen := {a: true}
	var queue: Array = [a]
	while not queue.is_empty():
		var q: int = queue.pop_back()
		if q == b:
			return true
		var nxt: Array = Array(astar.get_point_connections(q)) + _hops.get(q, [])
		for n in nxt:
			if not seen.has(n):
				seen[n] = true
				queue.append(n)
	return false


func block(p: Vector2i, solid := true, f := 0) -> void:
	var id := _nid(p.x, p.y, 0, f)
	if astar.has_point(id):
		astar.set_point_disabled(id, solid)


func is_blocked(p: Vector2i, f := 0) -> bool:
	var id := _nid(p.x, p.y, 0, f)
	return astar.has_point(id) and astar.is_point_disabled(id)


## Where a nav point stands: [x, y, floor, layer] (layer 0 the ground, 1 and 2 a balcony, 3 a ramp), or [].
func where(id: int) -> Array:
	return _pt.get(id, [])


## The nav point of cell c on floor f at `layer`, or -1 if it has none.
func point_id(c: Vector2i, layer: int, f := 0) -> int:
	if c.x < 0 or c.y < 0 or c.x >= ld.w or c.y >= ld.h or not ld.floors.has(f):
		return -1
	var id := _nid(c.x, c.y, layer, f)
	return id if astar.has_point(id) else -1


## Every lift and pit as [from, to]: the hops a body takes but does not walk.
func hop_pairs() -> Array:
	var out: Array = []
	for a in _hops:
		for b in _hops[a]:
			out.append([a, b])
	return out


## The nav point something standing at pos is on: the one in its cell nearest its height.
func point_at(pos: Vector3) -> int:
	var p := ld.cell_of(pos)
	var best := -1
	var bd := 1e9
	if p.x < 0 or p.y < 0 or p.x >= ld.w or p.y >= ld.h:
		return -1
	for f in ld.floors:
		for layer in 4:
			var id := _nid(p.x, p.y, layer, f)
			if astar.has_point(id):
				var dd: float = absf(astar.get_point_position(id).y - pos.y)
				if dd < bd:
					bd = dd
					best = id
	return best


## Where to walk, one place after another, from here to there: over ramps and along balconies if that is the way.
## Either end may be in a blocked cell (a crate that fills it, the floor under a lift): it is let in for the asking,
## and the route ends where `to` stands, beside what blocks it, not at the cell's middle.
func path(from: Vector3, to: Vector3) -> PackedVector3Array:
	var out := PackedVector3Array()
	var a := point_at(from)
	var b := point_at(to)
	if a < 0 and astar.get_point_count() > 0:
		a = astar.get_closest_point(from, true)
	if a < 0 or b < 0:
		return out
	var shut := [a, b].filter(func(id: int) -> bool: return astar.is_point_disabled(id))
	for id in shut:
		astar.set_point_disabled(id, false)
	out = astar.get_point_path(a, b)
	for id in shut:
		astar.set_point_disabled(id, true)
	if b in shut and out.size() > 1:
		out[out.size() - 1] = Vector3(to.x, out[out.size() - 1].y, to.z)
	return out


## Height of the floor under pos: the ground, a deck or a ramp.
func floor_y(pos: Vector3) -> float:
	var id := point_at(pos)
	return astar.get_point_position(id).y if id >= 0 else 0.0
