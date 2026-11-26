extends RefCounted
## ProgrammeFill - what goes in a laid-out programme (SPEC.md 6.3): the start, in the first spine room facing east;
## the locks (every door of a locked room, or a wing's door, takes the lock's colour) and their cards, each in the room
## the lock names; and each room's "things", as written, put on its free floor. A thing that says "at" is put there
## (in cells of the room: [0, 0] its north-west corner; "outside": hung on the wall with the most rock behind it, the
## room's way out to the world, facing in); one that does not goes on a free cell the seed picks; "count"
## makes several; an "actor", "item" or "prop" that lists several is one of them, the seed's pick, each time. A lock's
## "card" that lists several rooms is in one of them (those laid out), the seed's pick. Free floor is a room's floor less the cells beside its doors and, in a spine room, the spine's row
## (the way through is kept clear). The seed's choices come from a stream of the plan's seed of their own ("fill").
## On two floors (ProgrammeFloors) the lower floor's fill has no start of its own, its things say their storey
## ("level": -1), a hall sunk from the upper floor is filled as part of the upper but its things stand a storey down,
## and the lifts' and ramps' cells are kept free.
## A lock with a "flag" in place of a colour shuts its doors until that flag is set (any one, for a list), saying what
## it needs ("need"); it has no card: something in the level sets the flag, and the proof finds what. An actor whose
## "patrol" is "room" walks a beat round the room it is put in. A prop put in without a "face" of its own turns to the
## room: against a wall it faces away from it, pushed back as the furnishing pushes its wall pieces (so the level gives
## that wall its plain tile, and nothing stands with its back to lockers or a screen); out on the floor it faces the
## room's middle.
## A lock on a spine room may have a "release": {"side": "e" or "w", "thing": {...}}: the thing (one whose use sets the
## lock's flag) hung on the corridor's wall just outside that door, the first cell along with a wall to hang it on. So
## the lock opens from that side: the way it holds from the other side and lets through from this one.
class_name ProgrammeFill

const Put := preload("res://generators/rooms/furnish_put.gd")
const LOCK_LETTERS := {"red": "R", "blue": "B", "green": "G", "yellow": "Y", "purple": "P"}
const FLAG_LETTERS := "123456789"            # a flag lock's door, the first not taken by the level's legend already

var lay: ProgrammeLayout
var plan: ProgrammePlan
var rng: RandomNumberGenerator    # the fill's own numbers (Dice): which room has the card, which monster a thing is
var things: Array = []
var legend: Dictionary = {}
var problems: Array = []
var storey := 0                          # the storey this floor's things stand on
var storeys: Dictionary = {}             # room id -> a storey of its own (a hall sunk a storey down)
var kit := ""                            # the level's kit, for the size of a prop it turns to the room
var _used: Dictionary = {}
var _props: Dictionary = {}              # the cells a prop has been put on (a thing hung outside goes round them)


## opts: "start" (false: no start of its own), "storey", "storeys" (room -> storey), "reserve" (cells kept free),
## "legend" (the legend so far: the other floor's, whose flag-lock letters this floor shares or steps round), "kit".
func _init(l: ProgrammeLayout, prog: Dictionary, opts := {}) -> void:
	lay = l
	plan = l.plan
	rng = plan.stream("fill")
	kit = str(opts.get("kit", ""))
	storey = int(opts.get("storey", 0))
	storeys = opts.get("storeys", {})
	legend = opts.get("legend", {}).duplicate()
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


## A lock: the doors it closes take a lettered door of its colour; its card goes in the room it names. A flag lock's
## doors open on its flag, and it has no card.
func _lock(lk: Dictionary, prog: Dictionary) -> void:
	var color := str(lk.get("color", "red"))
	var plain: String = LM.game.get("legend", {}).get("+", {}).get("door", "")       # the game's own door, by default
	var door := str(lk.get("door", prog.get("lock_door", plain)))
	var letter: String = LOCK_LETTERS.get(color, "R")
	if lk.has("flag"):
		var entry := {"door": door, "flag": lk["flag"], "need": str(lk.get("need", ""))}
		if lk.has("tag"):                              # (a danger zone's door: its triggers seal and open it)
			entry["tag"] = str(lk["tag"])
		letter = _flag_letter(entry)
		legend[letter] = entry
	else:
		legend[letter] = {"door": door, "lock": color}
	var shut: Array = []
	if lk.has("room"):
		shut = lay.doors_of(str(lk["room"]))
	elif lk.has("wing"):
		shut = lay.doors.filter(func(d: Dictionary) -> bool: return d["wing"] == str(lk["wing"]) and d["rooms"].is_empty())
	elif lk.has("link"):
		shut = lay.doors.filter(func(d: Dictionary) -> bool: return d.get("link", "") == str(lk["link"]))
	if shut.is_empty():
		problems.append("lock %s closes no door" % JSON.stringify(lk))
	for d in shut:
		var at: Vector2i = d["at"]
		lay.g[at.y][at.x] = letter
	if lk.has("release"):
		_release(lk, shut)
	if lk.has("flag"):
		return
	var card_v: Variant = lk.get("card", "")
	if card_v is Array:
		var there: Array = card_v.filter(func(c: Variant) -> bool: return lay.rects.has(str(c)))
		card_v = there[rng.randi() % there.size()] if not there.is_empty() else ""
	var card := str(card_v)
	if not lay.rects.has(card):
		problems.append("the %s card's room '%s' is not in the programme" % [color, card])
		return
	_thing(card, {"item": "keycard", "color": color})


## A lock's release (see the top of this file): on a spine room's corridor, beside the door on its side.
func _release(lk: Dictionary, shut: Array) -> void:
	var rel: Dictionary = lk["release"]
	var step := Vector2i(1, 0) if str(rel.get("side", "e")) == "e" else Vector2i(-1, 0)
	var room := str(lk.get("room", ""))
	var door: Array = []
	if lay.rects.has(room) and plan.spine.has(room):
		var rc: Rect2i = lay.rects[room]
		door = shut.filter(func(d: Dictionary) -> bool: return not rc.has_point(d["at"] + step))
	if door.is_empty():
		problems.append("a release needs a spine room's door on its side (%s)" % JSON.stringify(lk))
		return
	var c: Vector2i = door[0]["at"] + step
	while lay.g[c.y][c.x] == ".":                       # along the corridor, up to the next door
		var up := not lay.open_at(c + Vector2i(0, -1))
		if up or not lay.open_at(c + Vector2i(0, 1)):
			var e: Dictionary = rel.get("thing", {}).duplicate(true)
			e["at"] = [c.x, c.y]
			e["face"] = "s" if up else "n"                # its back to the wall it hangs on
			e["blocks"] = false
			things.append(e)
			_used[c] = true
			return
		c += step
	problems.append("no wall beside the corridor to hang a release on (%s)" % JSON.stringify(lk))


## The legend letter for a flag lock's door: the one already standing for the same door, else the first free.
func _flag_letter(entry: Dictionary) -> String:
	for ch in FLAG_LETTERS:
		if legend.get(ch) == entry:
			return ch
	for ch in FLAG_LETTERS:
		if not legend.has(ch):
			return ch
	problems.append("more than %d flag locks" % FLAG_LETTERS.length())
	return FLAG_LETTERS[0]


## One of a room's things (several with "count"), placed.
func _thing(room: String, t: Dictionary) -> void:
	for n in int(t.get("count", 1)):
		var e: Dictionary = t.duplicate(true)
		e.erase("count")
		for k in ["actor", "item", "prop"]:
			if e.get(k) is Array and not e[k].is_empty():
				e[k] = e[k][rng.randi() % e[k].size()]
		var out: Array = _outside(room, e) if str(t.get("at", "")) == "outside" else []
		var at: Vector2i = out[0] if not out.is_empty() else _spot(room, t.get("at"))
		if at.x < 0:
			problems.append("no room left in '%s' for %s" % [room, JSON.stringify(t)])
			return
		e["at"] = [at.x, at.y]
		if e.has("prop") and not e.has("face"):
			_turn(room, at, e)
		if str(e.get("patrol", "")) == "room":
			e["patrol"] = _beat(room)
		var s := int(storeys.get(room, storey))
		if s != 0:
			e["level"] = s
		_used[at] = true
		for c in out:
			_used[c] = true
		if e.has("prop"):
			for c in [at] + out:
				_props[c] = true
		things.append(e)


## Where it goes: the cell it says, in the room's own cells, or a free one the seed picks.
func _spot(room: String, at: Variant) -> Vector2i:
	var r: Rect2i = lay.rects[room]
	if at is Array and at.size() == 2:
		return r.position + Vector2i(int(at[0]), int(at[1]))
	var free := free_cells(room)
	if free.is_empty():
		return Vector2i(-1, -1)
	return free[rng.randi() % free.size()]


## The room's way out to the world, for a prop hung on the wall (`e`, given its face, its offset along the wall if it
## is wider than a cell, and "blocks": false, as the floor in front of it stays free to walk on): the cells it covers
## (one, or two for a shutter two cells wide) against the wall with the most rock behind it, out to the map's edge if
## the room has such a wall, nearest the room's middle; not beside a door nor where a prop already stands. None if
## it has no such wall.
func _outside(room: String, e: Dictionary) -> Array:
	var r: Rect2i = lay.rects[room]
	var cell := float(LM.kits.get(kit, {}).get("cell", 4.0))
	var n := Put.span(LM.model_meta(kit, str(e.get("prop", ""))), cell)
	var mid := Vector2(r.get_center()) - Vector2(0.5, 0.5)
	var by_doors := _by_doors()
	var best: Array = []
	var bd := 0
	var most := -1
	var near := INF
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			for d in 4:
				var run := _wall_run(r, Vector2i(x, y), d, n, by_doors)
				if run.is_empty():
					continue
				var rock: int = run.map(func(c: Vector2i) -> int: return Put.rock_behind(lay.g, c, d)).min()
				var far := (Vector2(run[0]) + Vector2(run[-1])).distance_to(mid * 2.0) / 2.0
				if rock > most or (rock == most and far < near):
					best = run
					bd = d
					most = rock
					near = far
	if not best.is_empty():
		var side: Vector2i = GenContext.DIRS[(bd + 1) % 4]
		e["face"] = GenContext.NAMES[(bd + 2) % 4]
		e["blocks"] = false
		if n > 1:
			e["offset"] = [side.x * cell * (n - 1) / 2.0, 0, side.y * cell * (n - 1) / 2.0]
	return best


## n cells of room r along its wall on side d from c (c first, going clockwise round the room), each with plain wall
## behind it, not beside a door and with no prop on it yet; or none.
func _wall_run(r: Rect2i, c: Vector2i, d: int, n: int, by_doors: Dictionary) -> Array:
	var run: Array = []
	for k in n:
		var q: Vector2i = c + GenContext.DIRS[(d + 1) % 4] * k
		var w: Vector2i = q + GenContext.DIRS[d]
		if not r.has_point(q) or r.has_point(w) or lay.open_at(w) or by_doors.has(q) or _props.has(q):
			return []
		run.append(q)
	return run


## A prop turned to the room it stands in (see the top of this file). One hung on a wall the level hangs itself.
func _turn(room: String, at: Vector2i, e: Dictionary) -> void:
	var meta: Dictionary = LM.model_meta(kit, str(e["prop"]))
	if meta.get("mount", "") == "wall":
		return
	var r: Rect2i = lay.rects[room]
	var dirs := [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]
	var names := ["n", "e", "s", "w"]
	for d in 4:
		var n: Vector2i = at + dirs[d]
		if not r.has_point(n) and not lay.open_at(n):         # a wall behind it, not a doorway
			var depth := float(meta.get("solid", [1.0, 1.0, 1.0])[2])
			var push := maxf(0.0, 2.0 - depth / 2.0 - 0.12)
			e["face"] = names[(d + 2) % 4]
			e["offset"] = [dirs[d].x * push, 0, dirs[d].y * push]
			return
	var v := Vector2(r.get_center()) - Vector2(at) - Vector2(0.5, 0.5)
	if absf(v.x) > absf(v.y):
		e["face"] = "e" if v.x > 0 else "w"
	else:
		e["face"] = "s" if v.y >= 0 else "n"


## A beat round a room: its corners, one cell in from the walls where it is wide enough (along the middle where not),
## clockwise from the north-west.
func _beat(room: String) -> Array:
	var r: Rect2i = lay.rects[room]
	var a := r.position + Vector2i(1 if r.size.x > 2 else 0, 1 if r.size.y > 2 else 0)
	var b := r.end - Vector2i(2 if r.size.x > 2 else 1, 2 if r.size.y > 2 else 1)
	return [[a.x, a.y], [b.x, a.y], [b.x, b.y], [a.x, b.y]]


## The storey a room's things stand on.
func storey_of(room: String) -> int:
	return int(storeys.get(room, storey))


## Every cell something has been put on (ProgrammeFurnishing works round them).
func used_cells() -> Array:
	return _used.keys()


## A room's free floor: not beside a door, not on the spine's row in a spine room, not already used.
func free_cells(room: String) -> Array:
	var r: Rect2i = lay.rects[room]
	var near := _by_doors()
	var out: Array = []
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			var c := Vector2i(x, y)
			if near.has(c) or _used.has(c) or (plan.spine.has(room) and y == lay.y0):
				continue
			out.append(c)
	return out


## The cells beside a doorway.
func _by_doors() -> Dictionary:
	var near := {}
	for d in lay.doors:
		var at: Vector2i = d["at"]
		for dv in GenContext.DIRS:
			near[at + dv] = true
	return near
