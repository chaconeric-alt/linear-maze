extends Node3D
## Home - what the scavenger's bunker does. A level with "home": true gets one of these (Level.build).
##
## The level file (tools/levels/home.py) says where the furniture stands; the pieces that can be used carry
## "use": {"type": "home", "what": <word>} and Prop hands the word to use_prop() here. Everything that lasts is in
## Profile (engine/profile.gd): banked credits, the weapons and armour brought home, salvage, trophies, the
## furnishings bought and where they were put, and whether the robot has been repaired. Putting furnishings down is
## HomeDecorating (engine/home/decorating.gd), a child of this node.
##
## What this bunker offers and says comes from the game's defs (games/<game>/defs/home.json, "home": {<level id>: {...}}):
##   "robot"      the actor that lies broken in the cradle until it is repaired
##   "repair"     item -> how many of it, out of the salvage brought home, the repair takes
##   "catalogue"  [[model (kits/home), price in credits], ..]; the names come from the models
##   "broadcasts" what the video radio always has on; "broadcasts_sometimes": one of these as well
##   "programmes" what is on the television by the sofa, one at a time
##   "words"      every panel's kicker, title, text and options, and every message (see word())
## The rack, the armour stand, the trophy case and the cradle are found by their tags (rack, armor, trophy, cradle).
class_name Home

var level: Level
var cfg: Dictionary = {}                 # this bunker's entry in defs "home"
var robot: Node3D = null                 # the repaired robot (an Actor, off duty), or the wreck in the cradle
var decor: HomeDecorating
var armoury: HomeArmoury                 # the rack as the loadout, and the outfitter (engine/home/armoury.gd)
var _shown: Array = []                   # what is on the rack, the stand and in the trophy case
var decorating: bool:
	get:
		return decor.on


func setup(lv: Level) -> void:
	level = lv
	var all: Dictionary = LM.defs.get("home", {})
	cfg = all.get(lv.data.get("id", "home"), all.values()[0] if not all.is_empty() else {})
	Game.credits = int(Profile.d["credits"])
	decor = HomeDecorating.new()
	decor.name = "Decorating"
	add_child(decor)
	decor.setup(self)
	armoury = HomeArmoury.new(self)
	show_off()
	_robot()
	Game.changed.emit()


## [[model, price], ..]: what can be ordered from the ledger.
func catalogue() -> Array:
	return cfg.get("catalogue", [])


## item -> how many: what the robot in the cradle needs.
func repair_needs() -> Dictionary:
	return cfg.get("repair", {})


func robot_id() -> String:
	return str(cfg.get("robot", ""))


## One of the bunker's words (defs "home" ... "words"). A missing one shows as its key, so it is noticed.
func word(key: String) -> String:
	return str(cfg.get("words", {}).get(key, key))


## How many things are on show (rack, stand, trophy case), and how many furnishings stand in the bunker.
func shown_count() -> int:
	return _shown.size()


func placed_count() -> int:
	return decor.placed.size()


# ------------------------------------------------------------------ decorating (HomeDecorating does it)
func available() -> Array:
	return decor.available()


func toggle() -> void:
	decor.toggle()


func place() -> bool:
	return decor.place()


func take_back() -> bool:
	return decor.take_back()


func aim(model: String) -> void:
	decor.aim(model)


## Carry the i-th of what is waiting to be put down.
func select(i: int) -> void:
	decor.sel = i


func thing(tag: String) -> Node3D:
	var l: Array = level.things_by_tag.get(tag, [])
	return l[0] if not l.is_empty() else null


func model_name(model: String) -> String:
	return LM.model_meta(level.kit_id, model).get("name", model)


func _item(id: String) -> String:
	return LM.get_def("items", id).get("name", id)


# ------------------------------------------------------------------ what is on show
## Hang the weapons on the rack, the vest on the stand, the trophies in the case (each in the places, "slots", its own
## model has).
func show_off() -> void:
	for n in _shown:
		if is_instance_valid(n):
			n.queue_free()
	_shown.clear()
	var rack := thing("rack")
	if rack:
		var slots: Array = LM.model_meta(level.kit_id, rack.e["prop"]).get("slots", [])
		var i := 0
		for w in Profile.d["weapons"]:
			if i >= slots.size():
				break
			var wd := LM.get_def("weapons", w)
			var n := LM.spawn_model(wd.get("kit", level.kit_id), wd.get("model", ""))
			rack.add_child(n)
			n.position = Vector3(slots[i][0], slots[i][1] + 0.02, -0.02)
			n.rotation.y = PI / 2
			n.scale = Vector3.ONE * 1.15
			_shown.append(n)
			i += 1
	var stand := thing("armor")
	if stand and int(Profile.d["armor"]) > 0:
		var v := LM.spawn_model(level.kit_id, LM.get_def("items", "armor").get("model", "item_armor"))
		stand.add_child(v)
		v.position = Vector3(0, 1.3, 0.2)
		v.scale = Vector3.ONE * 2.4
		_shown.append(v)
	_show_trophies()


func _show_trophies() -> void:
	var case := thing("trophy")
	if not case:
		return
	var cs: Array = LM.model_meta(level.kit_id, case.e["prop"]).get("slots", [])
	var k := 0
	for id in Profile.d["trophies"]:
		if k >= cs.size():
			break
		var it := LM.get_def("items", id)
		var t := LM.spawn_model(it.get("kit", level.kit_id), it.get("model", "item_chips"))
		case.add_child(t)
		t.scale = Vector3.ONE * float(it.get("scale", 1.6)) * 0.6
		var acc: Array = [null]
		Pickup.bounds(t, Transform3D.IDENTITY, acc)
		t.position = Vector3(cs[k][0], cs[k][1] - ((acc[0] as AABB).position.y if acc[0] != null else 0.0), cs[k][2])
		_shown.append(t)
		k += 1


func _robot() -> void:
	var cradle := thing("cradle")
	if cradle == null:
		return
	if robot and is_instance_valid(robot):
		robot.queue_free()
	robot = null
	if Profile.d["robot"]:
		var at: Vector3 = cradle.global_position + cradle.global_transform.basis.z * 3.0
		var c := level.cell_of(at)
		robot = level.spawn_thing({"actor": robot_id(), "at": [c.x, c.y], "face": "n", "tag": "housebot"}, c)
		return
	var def := LM.get_def("actors", robot_id())          # the wreck: the same model, slumped in the clamps, and nobody home
	var path: String = def.get("model", "")
	robot = LM.spawn_scene(path if path.begins_with("res://") else "res://" + path, "" if def.get("own_materials", false) else def.get("kit", level.kit_id))
	robot.scale = Vector3.ONE * float(def.get("scale", 1.0)) * 0.9
	cradle.add_child(robot)
	robot.position = Vector3(0, 0.16, 0.05)
	robot.rotation = Vector3(-0.16, 0.25, 0.09)


# ------------------------------------------------------------------ using the furniture
## A panel at this furniture (HomeArmoury uses it too).
func panel(kicker: String, title: String, text: String, options: Array = []) -> void:
	Game.hud.repanel(self, {"kicker": kicker, "title": title, "text": text, "options": options})


## A panel in the words' own terms: <key>_kicker, <key>_title and the text given.
func say_panel(key: String, text: String, options: Array = []) -> void:
	panel(word(key + "_kicker"), word(key + "_title"), text, options)


func set_screen(_t: String) -> void:
	pass


func _list(counts: Dictionary) -> String:
	var bits: Array = []
	for id in counts:
		if int(counts[id]) > 0:
			bits.append(word("list_item") % [int(counts[id]), _item(id)])
	return ", ".join(bits) if not bits.is_empty() else word("list_none")


func use_prop(_prop: Node, what: String) -> void:
	var p: Dictionary = Profile.d
	match what:
		"comms":
			_comms()
		"ledger":
			_ledger()
		"trophy":
			var counts := {}
			for id in p["trophies"]:
				counts[id] = int(counts.get(id, 0)) + 1
			say_panel("trophy", word("trophy_text") % _list(counts))
		"rack":
			armoury.rack()
		"armor":
			say_panel("armor", (word("armor_text") % int(p["armor"])) if int(p["armor"]) > 0 else word("armor_bare"))
		"locker", "medic", "security":
			say_panel(what, word(what + "_text"))
		"bed":
			Game.say(word("bed_say"), "good")
			LM.sound("heal")
		"sofa":
			var progs: Array = cfg.get("programmes", [])
			if not progs.is_empty():
				Game.say(progs[randi() % progs.size()], "info")
		"diagnostic", "cradle":
			_cradle()
		"lift":
			_lift()


## The video radio: what is always on, and one of the rest.
func _comms() -> void:
	var always: Array = cfg.get("broadcasts", [])
	var sometimes: Array = cfg.get("broadcasts_sometimes", [])
	say_panel("comms", "\n\n".join(always) + ("\n\n" + sometimes[randi() % sometimes.size()] if not sometimes.is_empty() else ""),
		[{"label": word("comms_more"), "do": func(): use_prop(null, "comms")}])


func _ledger() -> void:
	var p: Dictionary = Profile.d
	var r: Dictionary = Profile.record()
	var text := word("ledger_text") % [int(p["credits"]), int(r.get("runs", 0)), int(r.get("best", 0)), _list(p["salvage"]), _waiting()]      # (no deaths: a death takes itself back, SPEC 5.16)
	say_panel("ledger", text, [
		{"label": word("ledger_order"), "do": _catalogue},
		{"label": word("ledger_decorate"), "do": func():
			Game.hud.close_panel()
			if not decorating:
				toggle()},
		{"label": word("ledger_retire"), "do": _retire}])


func _retire() -> void:
	panel(word("ledger_kicker"), word("retire_title"), word("retire_text"), [
		{"label": word("retire_no"), "do": _ledger},
		{"label": word("retire_yes"), "do": func():
			Profile.retire()
			Game.hud.close_panel()
			Game.hud.start_requested.emit(level.data.get("id", "home"))}])


func _waiting() -> int:
	var n := 0
	for a in available():
		n += int(a[1])
	return n


func _catalogue() -> void:
	var opts: Array = []
	var cat := catalogue()
	for i in cat.size():
		var c: Array = cat[i]
		var own := int(Profile.d["owned"].get(c[0], 0))
		opts.append({"label": word("catalogue_item") % [model_name(c[0]), c[1], (word("catalogue_own") % own) if own > 0 else ""], "do": buy.bind(i)})
	opts.append({"label": word("catalogue_back"), "do": _ledger})
	panel(word("ledger_kicker"), word("catalogue_title"), word("catalogue_text") % [int(Profile.d["credits"]), _waiting()], opts)


func buy(i: int) -> bool:
	var c: Array = catalogue()[i]
	if int(Profile.d["credits"]) < int(c[1]):
		Game.say(word("buy_short") % [model_name(c[0]), c[1], int(Profile.d["credits"])], "warn")
		LM.sound("denied")
		return false
	Profile.d["credits"] = int(Profile.d["credits"]) - int(c[1])
	Profile.d["owned"][c[0]] = int(Profile.d["owned"].get(c[0], 0)) + 1
	Profile.save()
	Game.credits = int(Profile.d["credits"])
	Game.changed.emit()
	Game.say(word("buy_done") % model_name(c[0]), "good")
	if Game.hud and Game.hud.in_panel():
		_catalogue()
	return true


func can_repair() -> bool:
	var need := repair_needs()
	for id in need:
		if Profile.count(id) < int(need[id]):
			return false
	return true


func _cradle() -> void:
	if Profile.d["robot"]:
		panel(word("cradle_kicker"), word("cradle_empty_title"), word("cradle_empty_text"))
		return
	var need: Array = []
	var recipe := repair_needs()
	for id in recipe:
		need.append(word("cradle_need") % [int(recipe[id]), _item(id), Profile.count(id)])
	var opts: Array = []
	if can_repair():
		opts.append({"label": word("cradle_repair"), "do": repair})
	say_panel("cradle", word("cradle_text") % ["\n   ".join(need), word("cradle_ready") if can_repair() else word("cradle_not_ready")], opts)


func repair() -> bool:
	if Profile.d["robot"] or not can_repair():
		return false
	var recipe := repair_needs()
	for id in recipe:
		Profile.d["salvage"][id] = Profile.count(id) - int(recipe[id])
	Profile.d["robot"] = true
	Profile.save()
	if Game.hud and Game.hud.in_panel():
		Game.hud.close_panel()
	_robot()
	LM.sound("confirm")
	Game.say(word("repaired_say"), "good")
	return true


## Where the lift goes: "built", the game's menu (an installation once, by its name), and "wild", every generator and
## theme. Each is [label, what to start].
func destinations() -> Dictionary:
	var built: Array = []
	for id in LM.game.get("menu", []):
		if Installations.has(id):
			built.append([Installations.name_of(id), id])
		elif id != level.data.get("id", "home") and LM.levels.has(id):
			built.append([LM.levels[id].get("name", id), id])
	var wild: Array = []
	for gid in LM.generators:
		wild.append([word("lift_unnamed"), "gen:" + gid])
		var themes: Dictionary = LM.game.get("generator_themes", {})
		for th in themes:
			if themes[th].get("menu", true):
				wild.append([themes[th].get("title", th), "gen:%s:%s" % [gid, th]])
	return {"built": built, "wild": wild}


func _lift() -> void:
	var d := destinations()
	var sub := func(title: String, list: Array) -> void:
		var opts: Array = []
		for it in list:
			opts.append({"label": it[0], "do": go.bind(it[1])})
		opts.append({"label": word("lift_back"), "do": _lift})
		panel(word("lift_kicker"), title, word("lift_waiting"), opts)
	say_panel("lift", word("lift_text"), [
		{"label": word("lift_built"), "do": sub.bind(word("lift_built_title"), d["built"])},
		{"label": word("lift_wild"), "do": sub.bind(word("lift_wild_title"), d["wild"])}])


## Go there: a level, or an installation by its way in (asked which, when it has more than one).
func go(id: String) -> void:
	if Installations.has(id):
		var ways := Installations.entrances(id)
		if ways.size() <= 1:
			go(Installations.start_of(id))
			return
		var opts: Array = []
		for i in ways.size():
			opts.append({"label": str(ways[i].get("name", "")), "do": go.bind(Installations.start_of(id, i))})
		opts.append({"label": word("lift_back"), "do": _lift})
		panel(word("lift_kicker"), Installations.name_of(id), word("lift_which_way"), opts)
		return
	Profile.sortie = true
	if Game.hud.in_panel():
		Game.hud.close_panel()
	Game.hud.start_requested.emit(id)
