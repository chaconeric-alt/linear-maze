extends RefCounted
## InstallationWriter - the rooms of one installation, from its archetype (InstallationGen): the spine, the wings, each
## room's things, the locks, and the announcements. Its numbers come from the stream it is given, its words from the
## installation's (InstallationWords); its panels and traps are the game's (defs "panels", "traps"), their words put in.
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
var _spine: Array = []
var _wings: Array = []


func _init(a: Dictionary, c: Dictionary, w: Dictionary, s: RandomNumberGenerator, r: RandomNumberGenerator) -> void:
	arch = a
	contra = c
	words = w
	said = s
	rng = r
	core_name = InstallationWords.line("core", words, said)


## The programme: its spine, its wings and its locks (SPEC 6.3), the systems as the level starts them.
func programme(systems: Dictionary) -> Dictionary:
	for step in arch.get("spine", []):
		var role: Variant = step.get("role", "")
		_spine.append(_room(str(Dice.pick(rng, role) if role is Array else role)))
	_wings = _choose_wings()
	return {"spine": {"gap": [1, 2]}, "rooms": _spine.map(func(id: String) -> Dictionary: return rooms[id]),
		"wings": _wings, "locks": _locks(systems)}


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
	var out: Array = []
	for wid in chosen:
		var wd: Dictionary = list[wid]
		var wing := {"id": wid, "name": InstallationWords.expand(str(Dice.pick(rng, wd.get("name", [wid]))), words, said),
			"after": _spine.slice(0, _spine.size() - 1), "side": "any", "corridor": str(wd.get("corridor", "")), "rooms": []}
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


## The core shut until the generator is started (its lock's flag), if power starts as its `when` says; else locked by
## a card of its colour in one of the rooms that keep cards. The generator's wing locked too, now and then, by a card
## in another wing, when the core waits on power: one more thing to find before the way through.
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
		var others: Array = keep.filter(func(id: String) -> bool: return _wing_of(id) != gen_wing and _wing_of(id) != "")
		if gen_wing != "" and not others.is_empty() and rng.randf() < 0.5:
			_sure(others)
			out.append({"wing": gen_wing, "color": "yellow", "card": others})
	elif not keep.is_empty():
		core_lock = str(cl.get("color", "red"))
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
	r["things"] = _things(role)
	return id


## What a room of that role holds: the way out at the way in; its panels; memos; its own loot and now and then one of
## the archetype's; a trap of its kind; and who lives there, unless it is left empty.
func _things(role: Dictionary) -> Array:
	var out: Array = []
	var panels: Dictionary = LM.defs.get("panels", {})
	for k in ["way_in", "generator", "security", "core"]:
		if role.get(k, false):
			out.append(_said(panels.get("exit" if k == "way_in" else k, {})))
	for i in int(role.get("memos", 0)):
		out.append(_said(panels.get("memo", {})))
	for it in role.get("loot", []):
		out.append({"item": it})
	if not role.get("way_in", false) and rng.randf() < 0.5:
		out.append({"item": InstallationWriter._weighted(arch.get("loot", []), {}, rng)})
	if role.has("trap"):
		var t: Dictionary = LM.defs.get("traps", {}).get(str(role["trap"]), {}).duplicate(true)
		t.erase("id")                                # (the defs' own name for it)
		out.append(t)
	var occ: Dictionary = arch.get("occupants", {})
	if role.get("way_in", false) or (role.get("empty", false) and not role.get("core", false)) or rng.randf() < float(occ.get("empty", 0.0)):
		return out.filter(func(t: Dictionary) -> bool: return not t.is_empty())
	var span: Array = occ.get("per_room", [0, 2])
	var n := rng.randi_range(int(span[0]), int(span[1])) + (1 if role.get("core", false) else 0)
	for i in n:
		out.append({"actor": InstallationWriter._weighted(occ.get("actors", []), contra.get("bias", {}), rng)})
	return out.filter(func(t: Dictionary) -> bool: return not t.is_empty())


## A panel of the game's, with the installation's words put in every line of it (and the id the level files know
## it by taken off).
func _said(spec: Dictionary) -> Dictionary:
	var out: Variant = _put_words(spec.duplicate(true))
	(out as Dictionary).erase("id")
	return out


func _put_words(v: Variant) -> Variant:
	if v is String:
		return InstallationWords.expand(v, words, said)
	if v is Array:
		return (v as Array).map(func(x: Variant) -> Variant: return _put_words(x))
	if v is Dictionary:
		var d := {}
		for k in v:
			d[k] = _put_words(v[k])
		return d
	return v


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


## One of [[id, weight], ...], the weights times `bias` (an id's own, else 1).
static func _weighted(list: Array, bias: Dictionary, r: RandomNumberGenerator) -> String:
	var total := 0.0
	for e in list:
		total += float(e[1]) * float(bias.get(e[0], 1.0))
	var x := r.randf() * total
	for e in list:
		x -= float(e[1]) * float(bias.get(e[0], 1.0))
		if x <= 0.0:
			return str(e[0])
	return str(list[-1][0]) if not list.is_empty() else ""
