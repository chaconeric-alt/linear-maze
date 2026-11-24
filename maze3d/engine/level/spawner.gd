extends RefCounted
## Spawner - puts the level's things in it: doors and windows from the map, then everything in "objects" and
## "things", and whatever an effect or a locker spawns while it is played (Level.spawn_thing).
##
## What a level entry makes is decided by its kind, and each kind is a factory registered here (register_kind): the
## first kind whose test matches the entry makes it. The order is the precedence: {"station": .., "actor": ..} is a
## station (with its robot in it), not a loose actor; {"trap": "pit"} is a pit, {"trap": "collapse"} a floor that gives
## way, any other "trap" a trap. A new kind of
## thing is a new factory, registered; spawn_thing does not change. SPEC.md, "Levels".
##
## Every thing gets a key (plan(), Level.key_of) from where it comes from in the level's data, the same on every load
## of the same data, so what is remembered about it (Interaction's used marks; later the level's memory) can be kept
## by key and saved.
class_name Spawner

var level: Level
var ld: LevelData
var _kinds: Array = []           # [[name, test: Callable(e) -> bool, make: Callable(e, p, s, pos) -> Node3D], ...]
var _making := ""                # the key of the thing being made: its parts (a station's robot, a desk's chair) take theirs from it
var extra_n := 0                 # how many things have been made while playing: they are "extra:0", "extra:1", ...
var gone: Dictionary = {}        # keys not to make: the level's memory says they were taken, killed or broken (LevelMemory)
var made: Dictionary = {}        # keys of things made while playing (not by the level's data): the memory makes them again


func _init(lv: Level, data: LevelData) -> void:
	level = lv
	ld = data
	register_kind("start", _has("start"), _start)
	register_kind("lift", _has("lift"), _lift)
	register_kind("pit", func(e: Dictionary) -> bool: return e.get("trap", "") == "pit", _pit)
	register_kind("collapse", func(e: Dictionary) -> bool: return e.get("trap", "") == "collapse", _collapse)
	register_kind("target", _has("target"), _target)
	register_kind("station", _has("station"), _station)
	register_kind("maker", _has("maker"), _maker)
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
## What the level's data places, in the order it is built, each with the key it is known by. The key comes from
## where the entry is in the data, so it is the same on every load of the same data (a generated level is the same
## data again from its seed): a door by its cell and storey ("door:x,y,f"), the objects grid by its cell ("obj:x,y";
## "obj:x,y.1" for a second entry under one symbol), the "things" list by its place in it ("thing:n"; "thing:n@x,y"
## for each cell of a tag). The parts of a thing take its key and a suffix ("/robot", "/seat", "/holds.0"); things made
## while playing are "extra:n". Each step is {"key", "p"} and one of "door" (the cell), "window" (the cell), "start",
## "warn" (a message) or "e" (the entry). Builds nothing.
func plan() -> Array:
	var out: Array = []
	for f in ld.floors:
		for y in ld.h:
			for x in ld.w:
				var c := ld.cell(x, y, f)
				if c["door"] != "":
					out.append({"key": "door:%d,%d,%d" % [x, y, f], "p": Vector2i(x, y), "door": c})
				if c["window"] != "":
					out.append({"key": "", "p": Vector2i(x, y), "window": c})
	var ol: Dictionary = ld.data.get("objectLegend", {})
	var rows: Array = ld.data.get("objects", [])
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			var ch := row[x]
			if ch == " " or ch == ".":
				continue
			if ch == "@" and not ol.has("@"):
				out.append({"key": "", "p": Vector2i(x, y), "start": true})
			elif ol.has(ch):
				var list: Array = ol[ch] if ol[ch] is Array else [ol[ch]]
				for i in list.size():
					out.append({"key": "obj:%d,%d" % [x, y] + ("" if i == 0 else ".%d" % i), "p": Vector2i(x, y), "e": list[i]})
			else:
				out.append({"key": "", "p": Vector2i(x, y), "warn": "no objectLegend entry for '%s'" % ch})
	var things: Array = ld.data.get("things", [])
	for n in things.size():
		var e: Dictionary = things[n]
		if e.has("at"):
			out.append({"key": "thing:%d" % n, "p": Vector2i(int(e["at"][0]), int(e["at"][1])), "e": e})
		elif e.has("tag"):
			for p in ld.tags.get(e["tag"], []):
				out.append({"key": "thing:%d@%d,%d" % [n, p.x, p.y], "p": p, "e": e})
	return out


func build_things() -> void:
	for step in plan():
		if step.has("door"):
			var d := _door(step["p"], step["door"])
			if d != null:
				_key(d, step["key"])
		elif step.has("window"):
			_window(step["p"], step["window"])
		elif step.has("start"):
			ld.start_cell = step["p"]
		elif step.has("warn"):
			push_warning("Level %s: %s" % [ld.data.get("id"), step["warn"]])
		else:
			spawn_thing(step["e"], step["p"], step["key"])


## A thing made while playing without spawn_thing. Made by another thing that has a key (a cache's loot), it is that
## thing's key and `part` ("/loot.0"), as fixed as its maker's; otherwise (what a monster drops, a drop effect, a
## piece of furniture placed in the bunker) it gets the next "extra:n".
func keep(n: Node, maker: Node = null, part := "") -> void:
	var mk := level.key_of(maker) if maker != null else ""
	var key := mk + "/" + part
	if mk == "" or part == "":
		key = "extra:%d" % extra_n
		extra_n += 1
	_key(n, key)
	made[key] = true


## The shape of the level its data makes, for the memory: a memory taken from a level of another shape (its file was
## edited since) is not laid over this one.
func signature() -> String:
	return "%dx%d %08x" % [ld.w, ld.h, "|".join(plan().map(func(st: Dictionary) -> String: return st["key"])).hash() & 0xffffffff]


## The thing is known by this key from now on (Level.key_of, Level.thing).
func _key(n: Node, key: String) -> void:
	if level.things.has(key):
		push_warning("Level %s: a second thing with the key %s" % [ld.data.get("id"), key])
		return
	level.things[key] = n
	n.set_meta("key", key)


func _door(p: Vector2i, c: Dictionary) -> Door:
	var f: int = c["f"]
	var across: bool = ld.wallish(p.x - 1, p.y, f) and ld.wallish(p.x + 1, p.y, f)
	var along: bool = ld.wallish(p.x, p.y - 1, f) and ld.wallish(p.x, p.y + 1, f)
	if not across and not along:
		# a door has to close an opening from wall to wall; anywhere else it would stand free in a room
		push_warning("Level %s: door at %s (storey %d) has no wall on both sides; left out" % [ld.data.get("id"), p, f])
		c["door"] = ""
		level.bad_doors += 1
		return null
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
	return d


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
## Make what entry `e` describes at cell `p`, known by `key`; with no key it is something made while playing, and
## gets the next "extra:n".
func spawn_thing(e: Dictionary, p: Vector2i, key := "") -> Node3D:
	if key == "":
		key = "extra:%d" % extra_n
		extra_n += 1
		made[key] = true
	elif gone.has(key):
		return null                                     # taken, killed or broken on an earlier visit
	var s := int(e.get("level", 0))                    # "level": 1 puts it a storey up: on the balcony there, or on that floor
	var pos := ld.center(p, s * ld.H) + LM.vec(e.get("offset"), Vector3.ZERO)
	for k in _kinds:
		if (k[1] as Callable).call(e):
			var outer := _making
			_making = key
			var n: Node3D = (k[2] as Callable).call(e, p, s, pos)
			_making = outer
			if n != null:
				_register(n, e.get("tag", ""))
				_key(n, key)
			return n
	return null


## Where the player starts ({"start": true}), or a named way in ({"start": "<name>"}): where travel from another
## level, or another entrance, puts them (Level.arrival).
func _start(e: Dictionary, p: Vector2i, _s: int, _pos: Vector3) -> Node3D:
	if e["start"] is String and e["start"] != "":
		ld.arrivals[e["start"]] = {"cell": p, "level": int(e.get("level", 0)), "yaw": ld.face_yaw(e.get("face", "n"))}
		return null
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


## Something that makes monsters while the level is played (engine/maker.gd).
func _maker(e: Dictionary, p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var mk := Maker.new()
	level.add_child(mk)
	mk.position = pos
	mk.setup(level, e, p, ld.kit_id)
	return mk


func _collapse(e: Dictionary, p: Vector2i, s: int, _pos: Vector3) -> Node3D:
	var cl := Collapse.new()
	level.add_child(cl)
	cl.position = ld.center(p, s * ld.H)
	cl.setup(level, e, p, s)
	return cl


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
		stn.hold(spawn_thing(be, p, _making + "/robot") as Actor)
	return stn


func _actor(e: Dictionary, _p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var a := Actor.new()
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
	PropParts.make(self, e, pr, meta)                   # its chair, chairs round it, footlocker, the goods it holds
	return pr


## A part of the thing being made (a desk's chair, a container's goods) is known by the thing's key and `suffix`.
func key_part(n: Node, suffix: String) -> void:
	_key(n, _making + suffix)


## The level's memory says this part of the thing being made was taken or broken on an earlier visit.
func part_gone(suffix: String) -> bool:
	return gone.has(_making + suffix)


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
	level.traps.append(tr)
	return tr


func _sign(e: Dictionary, p: Vector2i, _s: int, _pos: Vector3) -> Node3D:
	return LevelSigns.make(level, ld, e, p)


func _light(e: Dictionary, p: Vector2i, _s: int, pos: Vector3) -> Node3D:
	var xf := Transform3D(Basis(), pos + Vector3(0, e.get("y", 3.0), 0))
	return level.make_light(e["light"], xf, ld.room_at(p), e.get("flicker", 0.0), e.get("shadows", false))
