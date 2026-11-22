extends RefCounted
## ProgrammeFill - what goes in a laid-out programme (SPEC.md 6.3): the start, in the first spine room facing east;
## the locks (every door of a locked room, or a wing's door, takes the lock's colour) and their cards, each in the room
## the lock names; and each room's "things", as written, put on its free floor. A thing that says "at" is put there
## (in cells of the room: [0, 0] its north-west corner); one that does not goes on a free cell the seed picks; "count"
## makes several; an "actor", "item" or "prop" that lists several is one of them, the seed's pick, each time. A lock's
## "card" that lists several rooms is in one of them (those laid out), the seed's pick. Free floor is a room's floor less the cells beside its doors and, in a spine room, the spine's row
## (the way through is kept clear). The seed's choices come from the plan's generator, after the plan's own.
## On two floors (ProgrammeFloors) the lower floor's fill has no start of its own, its things say their storey
## ("level": -1), a hall sunk from the upper floor is filled as part of the upper but its things stand a storey down,
## and the lifts' and ramps' cells are kept free.
class_name ProgrammeFill

const LOCK_LETTERS := {"red": "R", "blue": "B", "green": "G", "yellow": "Y", "purple": "P"}

var lay: ProgrammeLayout
var plan: ProgrammePlan
var things: Array = []
var legend: Dictionary = {}
var problems: Array = []
var storey := 0                          # the storey this floor's things stand on
var storeys: Dictionary = {}             # room id -> a storey of its own (a hall sunk a storey down)
var _used: Dictionary = {}


## opts: "start" (false: no start of its own), "storey", "storeys" (room -> storey), "reserve" (cells kept free).
func _init(l: ProgrammeLayout, prog: Dictionary, opts := {}) -> void:
	lay = l
	plan = l.plan
	storey = int(opts.get("storey", 0))
	storeys = opts.get("storeys", {})
	for c in opts.get("reserve", []):
		_used[c] = true
	if opts.get("start", true):
		var first: Rect2i = lay.rects[plan.spine[0]]
		things.append({"start": true, "face": "e", "at": [first.position.x, lay.y0]})
		_used[Vector2i(first.position.x, lay.y0)] = true
	for lk in prog.get("locks", []):
		_lock(lk, prog)
	for id in plan.spine + _wing_rooms():
		for t in plan.rooms[id].get("things", []):
			_thing(id, t)


func _wing_rooms() -> Array:
	var out: Array = []
	for w in plan.wings:
		out += w["west"] + w["east"]
	return out


## A lock: the doors it closes take a lettered door of its colour; its card goes in the room it names.
func _lock(lk: Dictionary, prog: Dictionary) -> void:
	var color := str(lk.get("color", "red"))
	var letter: String = LOCK_LETTERS.get(color, "R")
	var plain: String = LM.game.get("legend", {}).get("+", {}).get("door", "")       # the game's own door, by default
	legend[letter] = {"door": str(lk.get("door", prog.get("lock_door", plain))), "lock": color}
	var shut: Array = []
	if lk.has("room"):
		shut = lay.doors_of(str(lk["room"]))
	elif lk.has("wing"):
		shut = lay.doors.filter(func(d: Dictionary) -> bool: return d["wing"] == str(lk["wing"]) and d["rooms"].is_empty())
	if shut.is_empty():
		problems.append("lock %s closes no door" % JSON.stringify(lk))
	for d in shut:
		var at: Vector2i = d["at"]
		lay.g[at.y][at.x] = letter
	var card_v: Variant = lk.get("card", "")
	if card_v is Array:
		var there: Array = card_v.filter(func(c: Variant) -> bool: return lay.rects.has(str(c)))
		card_v = there[plan.rng.randi() % there.size()] if not there.is_empty() else ""
	var card := str(card_v)
	if not lay.rects.has(card):
		problems.append("the %s card's room '%s' is not in the programme" % [color, card])
		return
	_thing(card, {"item": "keycard", "color": color})


## One of a room's things (several with "count"), placed.
func _thing(room: String, t: Dictionary) -> void:
	for n in int(t.get("count", 1)):
		var e: Dictionary = t.duplicate(true)
		e.erase("count")
		for k in ["actor", "item", "prop"]:
			if e.get(k) is Array and not e[k].is_empty():
				e[k] = e[k][plan.rng.randi() % e[k].size()]
		var at := _spot(room, t.get("at"))
		if at.x < 0:
			problems.append("no room left in '%s' for %s" % [room, JSON.stringify(t)])
			return
		e["at"] = [at.x, at.y]
		var s := int(storeys.get(room, storey))
		if s != 0:
			e["level"] = s
		_used[at] = true
		things.append(e)


## Where it goes: the cell it says, in the room's own cells, or a free one the seed picks.
func _spot(room: String, at: Variant) -> Vector2i:
	var r: Rect2i = lay.rects[room]
	if at is Array and at.size() == 2:
		return r.position + Vector2i(int(at[0]), int(at[1]))
	var free := free_cells(room)
	if free.is_empty():
		return Vector2i(-1, -1)
	return free[plan.rng.randi() % free.size()]


## The storey a room's things stand on.
func storey_of(room: String) -> int:
	return int(storeys.get(room, storey))


## Every cell something has been put on (ProgrammeFurnishing works round them).
func used_cells() -> Array:
	return _used.keys()


## A room's free floor: not beside a door, not on the spine's row in a spine room, not already used.
func free_cells(room: String) -> Array:
	var r: Rect2i = lay.rects[room]
	var near := {}
	for d in lay.doors:
		var at: Vector2i = d["at"]
		for dv in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			near[at + dv] = true
	var out: Array = []
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			var c := Vector2i(x, y)
			if near.has(c) or _used.has(c) or (plan.spine.has(room) and y == lay.y0):
				continue
			out.append(c)
	return out
