extends RefCounted
## Spawner - puts the level's things in it: doors and windows from the map, then everything in "objects" and
## "things", and whatever an effect or a locker spawns while it is played (Level.spawn_thing).
##
## What a level entry makes is decided by its kind, and each kind is a factory registered here (register_kind): the
## first kind whose test matches the entry makes it. The order is the precedence: {"station": .., "actor": ..} is a
## station (with its robot in it), not a loose actor; {"trap": "pit"} is a pit, any other "trap" a trap. A new kind of
## thing is a new factory, registered; spawn_thing does not change. SPEC.md, "Levels".
class_name Spawner

var level: Level
var ld: LevelData
var _kinds: Array = []           # [[name, test: Callable(e) -> bool, make: Callable(e, p, s, pos) -> Node3D], ...]


func _init(lv: Level, data: LevelData) -> void:
	level = lv
	ld = data
	register_kind("start", _has("start"), _start)
	register_kind("lift", _has("lift"), _lift)
	register_kind("pit", func(e: Dictionary) -> bool: return e.get("trap", "") == "pit", _pit)
	register_kind("target", _has("target"), _target)
	register_kind("station", _has("station"), _station)
	register_kind("actor", _has("actor"), _actor)
	register_kind("prop", _has("prop"), _prop)
	register_kind("item", _has("item"), _item)
	register_kind("rebuild", _has("rebuild"), _rebuild)
	register_kind("trap", _has("trap"), _trap)
	register_kind("sign", _has("sign"), _sign)
	register_kind("light", _has("light"), _light)


## Add a kind of thing. Kinds are tried in the order they were registered. (A factory is best a method: a lambda
## that uses this object's members holds on to it, and the spawner would never be freed.)
func register_kind(kind: String, test: Callable, make: Callable) -> void:
	_kinds.append([kind, test, make])


func _has(key: String) -> Callable:
	return func(e: Dictionary) -> bool: return e.has(key)


## The kind an entry is, or "" if no factory takes it.
func kind_of(e: Dictionary) -> String:
	for k in _kinds:
		if (k[1] as Callable).call(e):
			return k[0]
	return ""


# ------------------------------------------------------------------ the level's own things
func build_things() -> void:
	for f in ld.floors:
		for y in ld.h:
			for x in ld.w:
				var c := ld.cell(x, y, f)
				if c["door"] != "":
					_door(Vector2i(x, y), c)
				if c["window"] != "":
					_window(Vector2i(x, y), c)
	var ol: Dictionary = ld.data.get("objectLegend", {})
	var rows: Array = ld.data.get("objects", [])
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			var ch := row[x]
			if ch == " " or ch == ".":
				continue
			if ch == "@" and not ol.has("@"):
				ld.start_cell = Vector2i(x, y)
				continue
			if ol.has(ch):
				var e: Variant = ol[ch]
				for one in (e if e is Array else [e]):
					spawn_thing(one, Vector2i(x, y))
			else:
				push_warning("Level %s: no objectLegend entry for '%s'" % [ld.data.get("id"), ch])
	for e in ld.data.get("things", []):
		if e.has("at"):
			spawn_thing(e, Vector2i(int(e["at"][0]), int(e["at"][1])))
		elif e.has("tag"):
			for p in ld.tags.get(e["tag"], []):
				spawn_thing(e, p)


func _door(p: Vector2i, c: Dictionary) -> void:
	var f: int = c["f"]
	var across: bool = ld.wallish(p.x - 1, p.y, f) and ld.wallish(p.x + 1, p.y, f)
	var along: bool = ld.wallish(p.x, p.y - 1, f) and ld.wallish(p.x, p.y + 1, f)
	if not across and not along:
		# a door has to close an opening from wall to wall; anywhere else it would stand free in a room
		push_warning("Level %s: door at %s (storey %d) has no wall on both sides; left out" % [ld.data.get("id"), p, f])
		c["door"] = ""
		level.bad_doors += 1
		return
	var d := Door.new()
	level.add_child(d)
	d.position = ld.center(p, f * ld.H)
	d.rotation.y = 0.0 if across else PI / 2
	d.storey = f
	d.setup(level, p, c["entry"], ld.kit_id)
	if f == 0:
		level.doors[p] = d
	else:
		level.doors_up[Vector3i(p.x, p.y, f)] = d
	_register(d, c["entry"].get("tag", ""))


## A wall cell that is a window: it stands across the cell like a door, and never opens.
func _window(p: Vector2i, c: Dictionary) -> void:
	var f: int = c["f"]
	var across: bool = ld.wallish(p.x - 1, p.y, f) and ld.wallish(p.x + 1, p.y, f)
	var inst := LM.spawn_model(ld.kit_id, c["window"])
	if inst:
		level.add_child(inst)
		inst.position = ld.center(p, f * ld.H)
		inst.rotation.y = 0.0 if across else PI / 2
	LevelCollision.shape(level.glass_body(), Transform3D(Basis(Vector3.UP, 0.0 if across else PI / 2), ld.center(p, f * ld.H + ld.H / 2)), Vector3(ld.C, ld.H, 0.5))
	level.block(p, true, f)


func _register(n: Node, tag: String) -> void:
	if tag == "":
		return
	if not level.things_by_tag.has(tag):
		level.things_by_tag[tag] = []
	level.things_by_tag[tag].append(n)


# ------------------------------------------------------------------ one thing
func spawn_thing(e: Dictionary, p: Vector2i) -> Node3D:
	var s := int(e.get("level", 0))                    # "level": 1 puts it a storey up: on the balcony there, or on that floor
	var pos := ld.center(p, s * ld.H) + LM.vec(e.get("offset"), Vector3.ZERO)
	for k in _kinds:
		if (k[1] as Callable).call(e):
			var n: Node3D = (k[2] as Callable).call(e, p, s, pos)
			if n != null:
				_register(n, e.get("tag", ""))
			return n
	return null


func _start(e: Dictionary, p: Vector2i, _s: int, _pos: Vector3) -> Node3D:
	ld.start_level = int(e.get("level", 0))
	ld.start_cell = p
	ld.start_yaw = ld.face_yaw(e.get("face", "n"))
	return null


func _lift(e: Dictionary, p: Vector2i, _s: int, _pos: Vector3) -> Node3D:
	var lf := Lift.new()
	level.add_child(lf)
	lf.setup(level, e, p)
	level.lifts.append(lf)
	return lf


func _pit(e: Dictionary, p: Vector2i, s: int, _pos: Vector3) -> Node3D:
	var pt := Pit.new()
	level.add_child(pt)
	pt.position = ld.center(p, s * ld.H)
	pt.setup(level, e, p, s)
	return pt


## Something for off-duty monsters (and the player) to hit.
func _target(e: Dictionary, _p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var tg := Target.new()
	level.add_child(tg)
	tg.position = pos
	tg.rotation.y = ld.face_yaw(e.get("face", "s"))
	tg.setup(level, e)
	level.targets.append(tg)
	return tg


## A robot's station, and the robot waiting in it (if any).
func _station(e: Dictionary, p: Vector2i, s: int, pos: Vector3) -> Node3D:
	var stn := Station.new()
	level.add_child(stn)
	stn.position = pos
	stn.rotation.y = ld.face_yaw(e.get("face", "s"))
	var se: Dictionary = e.duplicate()
	se["prop"] = e["station"]
	se.erase("actor")
	stn.setup(level, se, ld.kit_id)
	if e.get("blocks", false):
		level.block(p, true, s)
	if str(e.get("actor", "")) != "":
		var be := {"actor": e["actor"], "at": e["at"], "face": e.get("face", "s"), "lounge": "none", "still": true}
		for k in ["off_duty", "tag", "greet"]:
			if e.has(k):
				be[k] = e[k]
		if s != 0:
			be["level"] = s
		stn.hold(spawn_thing(be, p) as Enemy)
	return stn


func _actor(e: Dictionary, _p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var a := Enemy.new()
	level.add_child(a)
	a.position = pos
	a.rotation.y = ld.face_yaw(e.get("face", "s"))
	a.setup(level, LM.get_def("actors", e["actor"]), e)
	level.actors.append(a)
	return a


func _prop(e: Dictionary, p: Vector2i, s: int, pos: Vector3) -> Node3D:
	var pr := Prop.new()
	level.add_child(pr)
	var meta := LM.model_meta(ld.kit_id, e["prop"])
	if meta.get("mount", "") == "wall":
		var d := ld.wall_side(p, e.get("face", ""), s)
		pr.position = ld.center(p, s * ld.H) + Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y) * (ld.C / 2) + LM.vec(e.get("offset"), Vector3.ZERO)
		pr.rotation.y = LevelData.DIR_ROT[d]
	else:
		pr.position = pos
		pr.rotation.y = ld.face_yaw(e.get("face", "s")) + deg_to_rad(e.get("turn", 0.0))
	pr.setup(level, e, ld.kit_id)
	if e.get("blocks", meta.has("solid") and meta["solid"][0] >= 1.4):
		level.block(p, true, s)
	if e.has("seat"):
		_seat(e, pr, meta)
	_holds(e, pr, meta)
	return pr


## A chair that goes with it: in front of it, facing it.
func _seat(e: Dictionary, pr: Prop, meta: Dictionary) -> void:
	var sm := LM.model_meta(ld.kit_id, e["seat"])
	var front := Vector3(sin(pr.rotation.y), 0, cos(pr.rotation.y))
	var d0: float = meta.get("solid", [1.0, 1.0, 1.0])[2] * (1.0 if meta.get("mount", "") == "wall" else 0.5)
	var d1: float = sm.get("solid", [1.0, 1.0, 1.0])[2] * 0.5
	var ch := Prop.new()
	level.add_child(ch)
	ch.position = pr.position + front * (d0 + e.get("seat_gap", 0.25) + d1)
	ch.rotation.y = pr.rotation.y + PI + deg_to_rad(e.get("seat_turn", 0.0))
	ch.setup(level, {"prop": e["seat"], "at": e["at"]}, ld.kit_id)


## A container: what it holds sits in its places, to be taken.
func _holds(e: Dictionary, pr: Prop, meta: Dictionary) -> void:
	var slots: Array = meta.get("slots", [])
	var hi := 0
	for held in e.get("holds", []):
		if hi >= slots.size():
			break
		var ie: Dictionary = (held if held is Dictionary else {"item": held}).duplicate()
		ie["rest"] = true
		var pk := Pickup.new()
		level.add_child(pk)
		pk.position = pr.transform * LM.vec(slots[hi])
		pk.setup(level, ie, ld.kit_id)
		hi += 1


func _item(e: Dictionary, _p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var it := Pickup.new()
	level.add_child(it)
	it.position = pos + Vector3(0, e.get("y", 0.0 if e.get("rest", false) else 1.0), 0)
	it.setup(level, e, ld.kit_id)
	return it


## A repair bay: destroyed robots come back out of it (engine/rebuilder.gd).
func _rebuild(e: Dictionary, _p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var rb := Rebuilder.new()
	level.add_child(rb)
	rb.position = pos
	rb.setup(level, e)
	return rb


func _trap(e: Dictionary, p: Vector2i, s: int, _pos: Vector3) -> Node3D:
	var off := LM.vec(e.get("offset"), Vector3.ZERO)
	var tr := Trap.new()
	level.add_child(tr)
	tr.position = ld.center(p, s * ld.H) + Vector3(off.x, 0, off.z)
	tr.setup(level, e, p, ld.kit_id)
	return tr


func _sign(e: Dictionary, p: Vector2i, _s: int, _pos: Vector3) -> Node3D:
	return LevelSigns.make(level, ld, e, p)


func _light(e: Dictionary, p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var xf := Transform3D(Basis(), pos + Vector3(0, e.get("y", 3.0), 0))
	return level.make_light(e["light"], xf, ld.room_at(p), e.get("flicker", 0.0), e.get("shadows", false))
