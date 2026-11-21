extends RefCounted
## Triggers - a level's "triggers": [{"on": {"type": "enter", "tag": "hall"}, "do": [effects], "once": true,
## "when": flag, "unless": flag}], and what sets them off: the player entering a tagged cell or a room, a flag being
## set, a thing being used or walked through or picked up (Level.notify), the last of a tagged group dying ("clear"),
## or an event on the bus ("event": {"type": "event", "name": "actor.died", "kind": "drone"} goes off when that event
## is emitted with every other key of "on" in its payload, at the same value).
## It also keeps the map's record of where the player has been, and names each room the first time it is entered.
class_name Triggers

var level: Level
var ld: LevelData
var explored: Dictionary = {}    # Vector3i(x, y, storey): seen on the map
var _list: Array = []            # [{"t": trigger, "fired": bool}]
var _rooms_seen: Dictionary = {} # index in rooms -> true: its name has been shown (kept here, not in the level's room dictionaries)
var _last_cell := Vector2i(-99, -99)
var _last_floor := 0
var _last_room := ""


func _init(lv: Level, data: LevelData) -> void:
	level = lv
	ld = data
	var heard := {}
	for t in ld.data.get("triggers", []):
		_list.append({"t": t, "fired": false})
		var on: Dictionary = t.get("on", {})
		if on.get("type", "") == "event" and not heard.has(on.get("name", "")):
			heard[on.get("name", "")] = true
			Events.on(on.get("name", ""), _heard.bind(on.get("name", "")))      # let go when the level is: the callable dies with this


func fire(kind: String, what: String) -> void:
	for tr in _list:
		var on: Dictionary = tr["t"].get("on", {})
		if on.get("type", "") == kind and on.get("name", on.get("tag", "")) == what:
			_go(tr)


## An event this level's triggers listen for was emitted. A trigger whose other keys all match the payload goes off on
## the next frame: an event is a fact, and the level is not changed in the middle of whoever emitted it.
func _heard(payload: Dictionary, name: String) -> void:
	for tr in _list:
		var on: Dictionary = tr["t"].get("on", {})
		if on.get("type", "") != "event" or on.get("name", "") != name:
			continue
		var fits := true
		for k in on:
			if k != "type" and k != "name" and payload.get(k) != on[k]:
				fits = false
		if fits:
			_go.call_deferred(tr)


## For the level's memory (LevelMemory): which triggers have gone off, what of the map was explored, which rooms were
## named.
func remember() -> Dictionary:
	var fired: Array = []
	for i in _list.size():
		if _list[i]["fired"]:
			fired.append(i)
	var seen: Array = []
	for v in explored:
		seen.append([v.x, v.y, v.z])
	return {"fired": fired, "explored": seen, "rooms_seen": _rooms_seen.keys()}


func recall(r: Dictionary) -> void:
	for i in r.get("fired", []):
		if int(i) < _list.size():
			_list[int(i)]["fired"] = true
	for v in r.get("explored", []):
		explored[Vector3i(int(v[0]), int(v[1]), int(v[2]))] = true
	for i in r.get("rooms_seen", []):
		_rooms_seen[int(i)] = true


## Set one trigger off, if it may go off now (once, when, unless).
func _go(tr: Dictionary) -> void:
	var t: Dictionary = tr["t"]
	if tr["fired"] and t.get("once", true):
		return
	if t.has("when") and not Game.has_flag(t["when"]):
		return
	if t.has("unless") and Game.has_flag(t["unless"]):
		return
	tr["fired"] = true
	Game.run_effects(t.get("do", []), {})


## Something died: remember it (the repair bay reads level.died), and if it was the last of its tag, "clear".
func actor_died(a: Node) -> void:
	level.died.append([LM.defs["actors"].find_key(a.d), ld.floor_of(a.global_position)])
	var tag: String = a.tag
	if tag == "":
		return
	for o in level.things_by_tag.get(tag, []):
		if is_instance_valid(o) and o is Actor and not o.dead:
			return
	fire("clear", tag)


## Where the player is now: the map round them is explored, and a tagged cell or a new room sets triggers off.
func track(pl: Node3D) -> void:
	var pc := ld.cell_of(pl.global_position)
	var pf := ld.floor_of(pl.global_position)
	if pc == _last_cell and pf == _last_floor:
		return
	_last_cell = pc
	_last_floor = pf
	for dy in range(-2, 3):
		for dx in range(-2, 3):
			explored[Vector3i(pc.x + dx, pc.y + dy, pf)] = true
	var c := ld.cell(pc.x, pc.y, pf)
	if c["tag"] != "":
		fire("enter", c["tag"])
	if c["room"] != _last_room:
		_last_room = c["room"]
		if _last_room != "":
			fire("room", _last_room)
			for i in ld.rooms.size():
				var rm: Dictionary = ld.rooms[i]
				if rm.get("name", "") == _last_room and not _rooms_seen.has(i):
					_rooms_seen[i] = true
					if not rm.get("quiet", false):
						Game.say(_last_room, "room")
