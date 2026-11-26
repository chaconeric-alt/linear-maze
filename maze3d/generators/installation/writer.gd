extends RefCounted
## InstallationWriter - the rooms of one installation, from its setting (InstallationGen; as InstallationSettings puts
## it together, its clusters are "wings" and its room types "roles"): the spine, the wings, each room (what it holds:
## InstallationContents), the locks, and the announcements. Its numbers come from the stream it is given, its words from
## the installation's (InstallationWords).
## With a gate (the setting's "gate", "hub" and "way_round"; the generation review's mission graph, 25 Nov): the spine
## room at the gate's step is shut; one wing, the far wing, branches past it and the rest off the hub, the near side;
## a near wing and the far wing are joined round the outside (a link, the way round). The gate opens one way on the
## near side (its "by": the seed's pick of a card in a near room, or security shut down), and from the far side by a
## release beside its far door. So there are two ways past it, and the way round, once taken, makes the gate a short
## way back.
class_name InstallationWriter

var arch: Dictionary
var contra: Dictionary
var words: Dictionary
var said: RandomNumberGenerator  # the words' stream
var rng: RandomNumberGenerator   # the rooms' stream
var core_name := ""
var core_lock := ""              # how the core is shut: a flag, or a card's colour
var rooms: Dictionary = {}       # id -> the room written
var _ids: Dictionary = {}        # role -> how many rooms of it so far
var gate: Dictionary = {}        # what the gate came to: its room, "by", the keys of its way, its flag, the link
var _spine: Array = []
var _wings: Array = []
var _far := ""                   # the wing past the gate
var contents: InstallationContents   # what each room holds


func _init(a: Dictionary, c: Dictionary, w: Dictionary, s: RandomNumberGenerator, r: RandomNumberGenerator) -> void:
	arch = a
	contra = c
	words = w
	said = s
	rng = r
	contents = InstallationContents.new(a, c, w, s, r)
	core_name = InstallationWords.line("core", words, said)


## The programme: its spine, its wings and its locks (SPEC 6.3), the systems as the level starts them.
func programme(systems: Dictionary) -> Dictionary:
	for step in arch.get("spine", []):
		var role: Variant = step.get("role", "")
		_spine.append(_room(str(Dice.pick(rng, role) if role is Array else role)))
	var g: Dictionary = arch.get("gate", {})
	if not g.is_empty():
		gate["by"] = str(Dice.pick(rng, g.get("by", ["card"])))
	_wings = _choose_wings()
	var out := {"spine": {"gap": [1, 2]}, "rooms": _spine.map(func(id: String) -> Dictionary: return rooms[id]),
		"wings": _wings, "locks": _locks(systems)}
	if not gate.is_empty():
		out["links"] = [_way_round()]
		out["locks"].append(_gate_lock())
	return out


## The wings it must have, and as many more of the rest as its count says, in an order of the seed's.
func _choose_wings() -> Array:
	var spec: Dictionary = arch.get("wings", {})
	var list: Dictionary = spec.get("list", {})
	var must: Array = spec.get("always", [])
	var rest: Array = list.keys().filter(func(k: String) -> bool: return not must.has(k))
	Dice.shuffle(rng, rest)
	var count: Array = spec.get("count", [1, 2])
	var n := clampi(rng.randi_range(int(count[0]), int(count[1])), must.size(), list.size())
	var chosen: Array = must + rest.slice(0, n - must.size())
	Dice.shuffle(rng, chosen)
	if not gate.is_empty():                        # past the gate: any wing but the one whose panel is the gate's way
		var past: Array = chosen.filter(func(k: String) -> bool: return gate["by"] != "security" or not _holds(list[k], "security"))
		_far = str(Dice.pick(rng, past if not past.is_empty() else chosen))
	var out: Array = []
	for wid in chosen:
		var wd: Dictionary = list[wid]
		var wing := {"id": wid, "name": InstallationWords.expand(str(Dice.pick(rng, wd.get("name", [wid]))), words, said),
			"after": _after_of(wid), "side": "any", "corridor": str(wd.get("corridor", "")), "rooms": []}
		for entry in wd.get("rooms", []):
			var e: Dictionary = entry if entry is Dictionary else {"role": entry}
			var id := _room(str(e["role"]))
			var r: Dictionary = rooms[id]
			if e.has("chance"):
				r["chance"] = float(e["chance"])
			for k in ["door_to", "next_to"]:
				if e.has(k):
					r[k] = _id_of(str(e[k]))
			wing["rooms"].append(r)
		out.append(wing)
	return out


## Where a wing branches: past the gate for the far wing, off the hub for the rest; with no gate, after any spine room
## but the last (the seed's pick).
func _after_of(wid: String) -> Variant:
	if gate.is_empty():
		return _spine.slice(0, _spine.size() - 1)
	return _spine[int(arch["gate"].get("step", 1))] if wid == _far else _spine[int(arch.get("hub", 0))]


## Does a wing as written have a room of a role with that flag (generator, security, card ...)?
func _holds(wd: Dictionary, flag: String) -> bool:
	return wd.get("rooms", []).any(func(e: Variant) -> bool:
		return arch.get("roles", {}).get(str(e.get("role", "") if e is Dictionary else e), {}).get(flag, false))


## The rooms on the near side that can keep a card, but not in that wing (the gate's way past must not wait on it).
func _near_keep(not_in: String) -> Array:
	return rooms.keys().filter(func(id: String) -> bool:
		var w := _wing_of(id)
		return _role(id).get("card", false) and w != "" and w != _far and w != not_in)


## The way round: a near wing joined to the far wing round the outside, both on one side (the seed's pick).
func _way_round() -> Dictionary:
	var near: Array = _wings.filter(func(w: Dictionary) -> bool: return w["id"] != _far)
	var from: Dictionary = Dice.pick(rng, near)
	var side := "n" if rng.randf() < 0.5 else "s"
	for w in _wings:
		if w["id"] == from["id"] or w["id"] == _far:
			w["side"] = side
	var wr: Dictionary = arch.get("way_round", {})
	gate["link"] = "way_round"
	return {"id": "way_round", "from": from["id"], "to": _far, "corridor": str(wr.get("corridor", "")),
		"name": InstallationWords.expand(str(Dice.pick(rng, wr.get("name", ["The Way Round"]))), words, said)}


## The gate: its room's doors shut on its own flag, or on its way's (a card's, put in a near room, or security's), and
## a release beside its far door that sets its flag.
func _gate_lock() -> Dictionary:
	var g: Dictionary = arch["gate"]
	var room: String = _spine[int(g.get("step", 1))]
	var flag := str(g.get("flag", "gate_open"))
	words["gate"] = [rooms[room]["name"]]
	words["gate_flag"] = [flag]
	var key := "security_off"
	gate["withhold"] = [key]
	if gate["by"] == "card":
		var color := str(g.get("color", "blue"))
		key = "key_" + color
		gate["withhold"] = [key, "card:" + color]
		var keep := _near_keep(_wing_of(_first_with("generator")))
		var at: String = Dice.pick(rng, keep) if not keep.is_empty() else _spine[int(arch.get("hub", 0))]
		rooms[at].erase("chance")
		rooms[at]["things"].append({"item": "keycard", "color": color})
	gate.merge({"room": room, "name": rooms[room]["name"], "flag": flag})
	var release: Dictionary = contents.said_in(LM.defs.get("panels", {}).get("release", {}))
	return {"room": room, "flag": [flag, key], "need": InstallationWords.expand(str(g.get("need", {}).get(gate["by"], "")), words, said),
		"release": {"side": "e", "thing": release}}


## The core shut until the generator is started (its lock's flag), if power starts as its `when` says; else locked by
## a card of its colour in one of the rooms that keep cards (the hub, if none of its wings has one). The generator's
## wing locked too, now and then, by a card in another wing (with a gate, a near one), when the core waits on power:
## one more thing to find before the way through.
func _locks(systems: Dictionary) -> Array:
	var cl: Dictionary = arch.get("core_lock", {})
	var core := _first_with("core")
	var keep: Array = rooms.keys().filter(func(id: String) -> bool: return _role(id).get("card", false))
	var out: Array = []
	var waits := not cl.is_empty()
	for n in cl.get("when", {}):
		waits = waits and str(systems.get(n, {}).get("start", "")) == str(cl["when"][n])
	if waits:
		core_lock = "flag " + str(cl.get("flag", ""))
		out.append({"room": core, "flag": cl.get("flag", ""), "need": cl.get("need", "")})
		var gen_wing := _wing_of(_first_with("generator"))
		var others: Array = keep.filter(func(id: String) -> bool: return _wing_of(id) != gen_wing and _wing_of(id) != "") \
			if gate.is_empty() else _near_keep(gen_wing)       # (with a gate, on the near side: the gate's ways must not wait on it)
		if gen_wing != "" and not others.is_empty() and rng.randf() < 0.5:
			_sure(others)
			out.append({"wing": gen_wing, "color": "yellow", "card": others})
	elif not cl.is_empty():
		core_lock = str(cl.get("color", "red"))
		if keep.is_empty():                        # no room of its wings keeps cards: the hub does
			keep = [_spine[int(arch.get("hub", 1)) if _spine.size() > 2 else 0]]
		_sure(keep)
		out.append({"room": core, "color": core_lock, "card": keep})
	return out


## A card's rooms: if every one is only there by chance, the first is there for sure (a card must have a room).
func _sure(ids: Array) -> void:
	if ids.all(func(id: String) -> bool: return rooms[id].has("chance")):
		rooms[ids[0]].erase("chance")


## Announcements: entering up to `most` of the rooms (not the way in) brings one of the contradiction's lines.
func announcements(most: int) -> Array:
	var names: Array = []
	for id in rooms:
		if not _role(id).get("way_in", false) and not names.has(rooms[id]["name"]):
			names.append(rooms[id]["name"])
	Dice.shuffle(said, names)
	var out: Array = []
	for nm in names.slice(0, most):
		out.append({"on": {"type": "room", "name": nm}, "once": true,
			"do": [{"type": "message", "text": "PUBLIC ADDRESS: " + InstallationWords.line("pa", words, said), "kind": "info"}]})
	return out


# ------------------------------------------------------------------ rooms
## A room of that role written, its things in it: the id it goes by.
func _room(role_id: String) -> String:
	var role: Dictionary = arch.get("roles", {}).get(role_id, {})
	_ids[role_id] = int(_ids.get(role_id, 0)) + 1
	var id := role_id if _ids[role_id] == 1 else "%s_%d" % [role_id, _ids[role_id]]
	var style: Variant = role.get("style", "")
	var r := {"id": id, "role": role_id, "name": InstallationWords.expand(str(Dice.pick(rng, role.get("name", [id]))), words, said),
		"style": str(Dice.pick(rng, style) if style is Array else style), "size": role.get("size", [3, 3]).duplicate(true),
		"purpose": str(role.get("purpose", "")), "things": []}      # "role": what it was written as (the layout ignores it)
	rooms[id] = r
	r["things"] = contents.things(role)
	return id


# ------------------------------------------------------------------ questions
func _role(id: String) -> Dictionary:
	return arch.get("roles", {}).get(str(rooms[id].get("role", id)), {})


func _first_with(key: String) -> String:
	for id in rooms:
		if _role(id).get(key, false):
			return id
	return ""


## The id of the first room of that role.
func _id_of(role_id: String) -> String:
	for id in rooms:
		if str(rooms[id].get("role", "")) == role_id:
			return id
	return role_id


## The wing a room is in, or "" (on the spine).
func _wing_of(id: String) -> String:
	for w in _wings:
		for r in w["rooms"]:
			if r["id"] == id:
				return w["id"]
	return ""
