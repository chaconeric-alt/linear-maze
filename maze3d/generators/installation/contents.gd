extends RefCounted
## InstallationContents - what a room of a written installation holds, from its role (InstallationWriter): the way out
## at the way in, its panels and memos, its loot, a trap of its kind, and who lives there. The rules the rooms generator
## keeps hold here too:
## - Loot goes in a container four times in five (a shelf, a box or a trophy case against a wall: the setting's
##   "containers", else the game's generator_params "containers", by the item's "loot_kinds"); else it lies on the
##   floor ("rest"), not hovering.
## - A robot of a kind with a station (generator_params "stations") waits in one against its room's wall, as many as
##   "stationed" says (shut over it as often as "hibernating" says); one that is out walks a beat round its room, and
##   its empty station stands there. So every robot has a station somewhere.
## - Panels, containers and stations stand against a wall ("at": "wall", ProgrammeFill), not out on the floor.
class_name InstallationContents

const IN_CONTAINERS := 0.8

var arch: Dictionary
var contra: Dictionary
var words: Dictionary
var said: RandomNumberGenerator   # the words' stream
var rng: RandomNumberGenerator    # the rooms' stream
var _params: Dictionary           # the game's generator_params (containers, loot kinds, stations)


func _init(a: Dictionary, c: Dictionary, w: Dictionary, s: RandomNumberGenerator, r: RandomNumberGenerator) -> void:
	arch = a
	contra = c
	words = w
	said = s
	rng = r
	_params = LM.game.get("generator_params", {})


## What a room of that role holds: the way out at the way in; its panels; memos; its own loot and now and then one of
## the setting's; a trap of its kind; and who lives there, unless it is left empty.
func things(role: Dictionary) -> Array:
	var out: Array = []
	var panels: Dictionary = LM.defs.get("panels", {})
	for k in ["way_in", "generator", "security", "core"]:
		if role.get(k, false):
			out.append(_against_wall(said_in(panels.get("exit" if k == "way_in" else k, {}))))
	for i in int(role.get("memos", 0)):
		out.append(_against_wall(said_in(panels.get("memo", {}))))
	for it in role.get("loot", []):
		out.append(_stowed(str(it)))
	if not role.get("way_in", false) and rng.randf() < 0.5:
		out.append(_stowed(InstallationContents.weighted(arch.get("loot", []), {}, rng)))
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
		out += _occupant(InstallationContents.weighted(occ.get("actors", []), contra.get("bias", {}), rng))
	return out.filter(func(t: Dictionary) -> bool: return not t.is_empty())


## A panel of the game's, with the installation's words put in every line of it (and the id the level files know
## it by taken off).
func said_in(spec: Dictionary) -> Dictionary:
	var out: Variant = _put_words(spec.duplicate(true))
	(out as Dictionary).erase("id")
	return out


## One of [[id, weight], ...], the weights times `bias` (an id's own, else 1).
static func weighted(list: Array, bias: Dictionary, r: RandomNumberGenerator) -> String:
	var total := 0.0
	for e in list:
		total += float(e[1]) * float(bias.get(e[0], 1.0))
	var x := r.randf() * total
	for e in list:
		x -= float(e[1]) * float(bias.get(e[0], 1.0))
		if x <= 0.0:
			return str(e[0])
	return str(list[-1][0]) if not list.is_empty() else ""


## A thing of the loot (see the top of this file): in a container of its kind, or lying on the floor.
func _stowed(item: String) -> Dictionary:
	var kind := str(_params.get("loot_kinds", {}).get(item, "box"))
	var model := str(arch.get("containers", {}).get(kind, _params.get("containers", {}).get(kind, "")))
	if item == "" or model == "" or rng.randf() >= IN_CONTAINERS:
		return {"item": item, "rest": true} if item != "" else {}
	var holds: Array = []
	for k in {"trophy": 1, "box": rng.randi_range(1, 2), "shelf": rng.randi_range(2, 3)}.get(kind, 1):
		holds.append(item)
	return {"prop": model, "holds": holds, "blocks": false, "at": "wall"}


## Whoever lives there (see the top of this file): a monster; a robot in its station; or a robot about the room, its
## station empty against the wall.
func _occupant(who: String) -> Array:
	var station := str(_params.get("stations", {}).get(who, ""))
	if who == "" or station == "":
		return [{"actor": who}] if who != "" else []
	if rng.randf() < float(_params.get("stationed", 0.65)):
		return [{"station": station, "actor": who, "shut": rng.randf() < float(_params.get("hibernating", 0.5)), "at": "wall"}]
	return [{"actor": who, "patrol": "room"}, {"station": station, "at": "wall"}]


## A panel of the game's (`panels`, by id) with the installation's words in it, to stand against a wall.
func panel(id: String) -> Dictionary:
	return _against_wall(said_in(LM.defs.get("panels", {}).get(id, {})))


func _against_wall(e: Dictionary) -> Dictionary:
	if not e.has("at"):
		e["at"] = "wall"
	return e


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
