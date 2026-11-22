extends RefCounted
## ProgrammeFloors - two floors in one level, and the lift bank (SPEC.md 6.3). A programme with "below" lays out a
## second programme on the storey under it (storey -1); the two are lined up by their lift bank (the room both name in
## "bank", the same size on both), so the bank's lifts are shafts with a stop on each floor and the bank lines up as
## you go down. Then:
##   a room of the upper floor with "down": 1 is a hall two storeys tall, sunk into the floor below: its floor is on
##   storey -1, the upper floor's doors into it open onto a gallery (a balcony along that wall) with a ramp down;
##   a room of the lower floor with "height": 2 rises into the upper floor; where an upper corridor or room lies beside
##   it across its wall, a door opens there onto a gallery with a ramp down, the same way.
## A tall room may not cross a room or corridor of the other floor (that seed is tried again). The bank's lifts stand
## along a wall of it that has no door on either floor, in the same cells on both. Nothing here draws a random number.
class_name ProgrammeFloors

const DIRS := [Vector2i(0, -1), Vector2i(0, 1), Vector2i(-1, 0), Vector2i(1, 0)]
const NAMES := ["n", "s", "w", "e"]

var up: ProgrammeLayout
var lo: ProgrammeLayout                  # null for one floor
var problems: Array = []
var sunken: Array = []                   # upper rooms moved down a storey
var decks: Array = []                    # the lower floor's balconies: {"at", "level": 1}
var ramps: Array = []                    # the lower floor's ramps
var reserve_up: Array = []               # cells nothing else may stand on, per floor (lifts, ramps)
var reserve_lo: Array = []
var lifts: Array = []                    # the bank's lift cells
var _ramped: Dictionary = {}             # cells a ramp, or the floor at a ramp's foot, already takes


func _init(u: ProgrammeLayout, l: ProgrammeLayout, prog: Dictionary) -> void:
	up = u
	lo = l
	var bank := str(prog.get("bank", ""))
	if lo != null:
		if not up.rects.has(bank) or not lo.rects.has(bank) or up.rects[bank].size != lo.rects[bank].size:
			problems.append("the bank '%s' must be a room of both floors, the same size on both" % bank)
			return
		_line_up(bank)
		_sink()
		_rise()
	if bank != "" and up.rects.has(bank):
		_bank(bank)


## Both floors on one map, the lower moved so its bank lies under the upper's.
func _line_up(bank: String) -> void:
	var d: Vector2i = up.rects[bank].position - lo.rects[bank].position
	var lo_min := Vector2i(mini(0, d.x), mini(0, d.y))
	var size := Vector2i(maxi(up.W, d.x + lo.W), maxi(up.H, d.y + lo.H)) - lo_min
	up.shift(-lo_min, size.x, size.y)
	lo.shift(d - lo_min, size.x, size.y)


## Upper halls that go down a storey: carved out of the lower floor (which must be rock there, round them too) and
## filled in on the upper; a gallery behind each of their doors.
func _sink() -> void:
	for id in up.rects:
		if int(up.plan.rooms[id].get("down", 0)) < 1:
			continue
		var r: Rect2i = up.rects[id]
		if not _rock(lo, r.grow(1)):
			problems.append("the hall '%s' would cut into the floor below" % id)
			return
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				lo.g[y][x] = "."
				up.g[y][x] = "#"
		sunken.append(id)
		var doors: Array = up.doors_of(id).map(func(dr: Dictionary) -> Vector2i: return dr["at"])
		_galleries(r, doors, id)


## Lower rooms two storeys tall: the upper floor must be rock where they rise, walls and all; a door off the upper
## floor where it lies beside one across its wall, onto a gallery.
func _rise() -> void:
	for id in lo.rects:
		if int(lo.plan.rooms[id].get("height", 1)) < 2:
			continue
		var r: Rect2i = lo.rects[id]
		if not _rock(up, r.grow(1)):
			problems.append("the tall room '%s' would rise into the floor above" % id)
			return
		var door := _door_beside(r)
		if door.x >= 0:
			up.g[door.y][door.x] = "+"
			up.doors.append({"at": door, "rooms": [], "wing": "", "gallery": id})
			_galleries(r, [door], id)


func _rock(l: ProgrammeLayout, r: Rect2i) -> bool:
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			if l.open_at(Vector2i(x, y)):
				return false
	return true


## A wall cell round r (not a corner) with the upper floor's open floor just outside it: where a door can open on
## to a gallery. The first, going round from the north side.
func _door_beside(r: Rect2i) -> Vector2i:
	for s in 4:
		for w in _side_cells(r, s):
			var o: Vector2i = w + DIRS[s]
			if up.open_at(o) and up.g[o.y][o.x] == ".":
				return w
	return Vector2i(-1, -1)


## The wall cells along one side of r (outside it), corners left out.
func _side_cells(r: Rect2i, s: int) -> Array:
	var out: Array = []
	if s < 2:
		for x in range(r.position.x, r.end.x):
			out.append(Vector2i(x, r.position.y - 1 if s == 0 else r.end.y))
	else:
		for y in range(r.position.y, r.end.y):
			out.append(Vector2i(r.position.x - 1 if s == 2 else r.end.x, y))
	return out


## A gallery along each side of r that has one of these doors in it, at the upper floor's height, and a ramp down from
## its far end (the end away from the door), two cells rising a storey. A room needs one ramp at least.
func _galleries(r: Rect2i, doors: Array, id: String) -> void:
	var made := 0
	var deck_cells := {}
	var sides: Array = []
	for door in doors:
		for s in 4:
			if _side_cells(r, s).has(door) and not sides.has([s, door]):
				sides.append([s, door])
	for sd in sides:
		for c in _inner(r, sd[0]):
			deck_cells[c] = true
	for c in deck_cells:
		decks.append({"at": [c.x, c.y], "level": 1})
	for sd in sides:
		made += 1 if _ramp(r, sd[0], sd[1], deck_cells) else 0
	if made == 0:
		problems.append("no room for a ramp in '%s'" % id)


## The room's cells along one side, inside.
func _inner(r: Rect2i, s: int) -> Array:
	return _side_cells(r, s).map(func(w: Vector2i) -> Vector2i: return w - DIRS[s])


## Two ramp cells rising from the floor to the gallery at the end of side s away from the door, off the gallery, with
## plain floor at the foot: a ramp only joins the floor at its two ends, so two ramps foot to foot (in a narrow hall)
## would leave the hall's floor cut off from both.
func _ramp(r: Rect2i, s: int, door: Vector2i, deck_cells: Dictionary) -> bool:
	var line := _inner(r, s)
	var ends: Array = [line[0], line[line.size() - 1]]
	ends.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return a.distance_squared_to(door) > b.distance_squared_to(door))
	var inward: Vector2i = -DIRS[s]
	for land in ends:
		var top: Vector2i = land + inward
		var foot: Vector2i = top + inward
		var below: Vector2i = foot + inward
		var cells: Array = [top, foot, below]
		if not r.has_point(below) or cells.any(func(c: Vector2i) -> bool: return deck_cells.has(c) or _ramped.has(c)):
			continue
		for c in cells:
			_ramped[c] = true
		ramps.append({"at": [foot.x, foot.y], "dir": NAMES[s], "from": 0, "to": 2})
		ramps.append({"at": [top.x, top.y], "dir": NAMES[s], "from": 2, "to": 4})
		# Kept free on both floors' lists: a sunk hall's things and furniture are the upper floor's to place.
		reserve_lo += [foot, top, foot + inward]
		reserve_up += [foot, top, foot + inward]
		return true
	return false


## The bank's lifts: along a wall of the bank with no door on either floor, as many as it asks for and the wall holds,
## in the middle of it.
func _bank(bank: String) -> void:
	var r: Rect2i = up.rects[bank]
	var spec: Dictionary = (lo.plan.rooms[bank] if lo != null else up.plan.rooms[bank]).get("lifts", up.plan.rooms[bank].get("lifts", {}))
	var n := int(spec.get("count", 2))
	var doors: Array = up.doors_of(bank) + (lo.doors_of(bank) if lo != null else [])
	for s in [3, 2, 0, 1]:                             # east first, then west, north, south
		var walls := _side_cells(r, s)
		if doors.any(func(dr: Dictionary) -> bool: return walls.has(dr["at"])):
			continue
		var line := _inner(r, s)
		var k := mini(n, line.size())
		var first := (line.size() - k) / 2
		for i in k:
			lifts.append(line[first + i])
		reserve_up += lifts
		reserve_lo += lifts
		return
	problems.append("the bank '%s' has a door in every wall: nowhere for its lifts" % bank)


## The lifts as level things: stops on both floors (or one), and what the programme's bank says of travel and arriving.
func lift_things(spec: Dictionary) -> Array:
	var out: Array = []
	var stops: Array = [-1, 0] if lo != null else [0]
	for i in lifts.size():
		var c: Vector2i = lifts[i]
		var e := {"at": [c.x, c.y], "lift": stops, "home": stops[0]}
		if spec.has("travel"):
			e["travel"] = spec["travel"]
		out.append(e)
		if i == lifts.size() / 2 and spec.has("start"):          # the way in for those who come up or down by lift
			out.append({"start": spec["start"], "at": [c.x, c.y], "level": stops[0]})
	return out
