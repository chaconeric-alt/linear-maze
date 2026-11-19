extends Node3D
## Home - what the scavenger's bunker does. A level with "home": true gets one of these (Level.build).
##
## The level file (tools/levels/home.py) says where the furniture stands; the pieces that can be used carry
## "use": {"type": "home", "what": <word>} and Prop hands the word to use_prop() here. Everything that lasts is in
## Profile (engine/profile.gd): banked credits, the weapons and armour brought home, salvage, trophies, the
## furnishings bought and where they were put, and whether the robot has been repaired.
##
## DECORATING (B): what has been bought from the catalogue and not yet put down is carried as a ghost in front of you.
##   click  put it down        R  turn it        Z or wheel  the next thing        X  take back what is in front of you
class_name Home

# model (kits/home), price in credits. The names come from the models.
const CATALOGUE := [["hm_plant", 40], ["hm_painting", 45], ["hm_rug", 50], ["hm_lamp", 60], ["hm_table", 60], ["hm_clock", 70],
	["hm_globe", 90], ["hm_armchair", 110], ["hm_gramophone", 120], ["hm_bookcase", 130], ["hm_aquarium", 200]]
const REPAIR := {"circuit": 3, "fuel_cell": 2}       # what the robot in the cradle needs, out of the salvage brought home
const ROBOT := "custodian"
const BROADCASTS := [
	"OUT-RIDER OUTPOST: “Hesketh here. Shells, cells, a medic, rumours, and we buy fuel cells. Our power is failing, if you come across anything that holds a charge.”",
	"BOOM-TOWN AUTOMATED GREETER: “Welcome to Boom-Town, where opportunity is mandatory! Entry requires a 100-credit visitor pass.”",
	"STATIC, then a jingle: “DYNAMO-FIZZ! Feel the buzz!” It comes from the direction of the Anomalous Structure.",
	"A slow voice, a long way down: “Come and see me, little one. Bring something sweet.” Mother Long-Legs, people say.",
	"WEATHER, read by a machine that has not looked outside in three hundred years: “Fine. Fine. Fine.”"]
const PROGRAMMES := ["An advertisement for a kettle. The kettle company outlived the country by a week.",
	"A cookery programme. The host is a Custodian. Nothing is cooked; the counter is very clean.",
	"KAVEROS QUARTERLY RESULTS. A line goes up for eleven minutes and then the tape ends.",
	"A western. Somebody has recorded a sales meeting over the last reel.",
	"Test card. A girl, a clown, a noughts-and-crosses board. You watch it for longer than you meant to."]

var level: Level
var e: Dictionary = {}                   # the HUD's panel asks its owner for this
var decorating := false
var robot: Node3D = null                 # the repaired robot (an Enemy, off duty), or the wreck in the cradle
var _shown: Array = []                   # what is on the rack, the stand and in the trophy case
var _placed: Array = []                  # Props, one for each of Profile.d["decor"], in step with it
var _ghost: Node3D = null
var _ghost_model := ""
var _sel := 0
var _turn := 0.0
var _ok := false
var _spot := Vector3.ZERO
var _yaw := 0.0
var _bar: Label


func setup(lv: Level) -> void:
	level = lv
	Game.credits = int(Profile.d["credits"])
	for dec in Profile.d["decor"]:
		_placed.append(_stand(dec))
	show_off()
	_robot()
	var layer := CanvasLayer.new()
	add_child(layer)
	_bar = Label.new()
	_bar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_bar.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_bar.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_bar.position.y -= 120
	_bar.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_bar.add_theme_font_size_override("font_size", 19)
	_bar.add_theme_color_override("font_color", Color(1.0, 0.8, 0.5))
	_bar.add_theme_color_override("font_outline_color", Color.BLACK)
	_bar.add_theme_constant_override("outline_size", 6)
	_bar.visible = false
	layer.add_child(_bar)
	Game.changed.emit()


func thing(tag: String) -> Node3D:
	var l: Array = level.things_by_tag.get(tag, [])
	return l[0] if not l.is_empty() else null


func _name(model: String) -> String:
	return LM.model_meta(level.kit_id, model).get("name", model)


func _item(id: String) -> String:
	return LM.get_def("items", id).get("name", id)


# ------------------------------------------------------------------ what is on show
## Hang the weapons on the rack, the vest on the stand, the trophies in the case.
func show_off() -> void:
	for n in _shown:
		if is_instance_valid(n):
			n.queue_free()
	_shown.clear()
	var rack := thing("rack")
	if rack:
		var slots: Array = LM.model_meta(level.kit_id, "hm_rack").get("slots", [])
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
	var case := thing("trophy")
	if case:
		var cs: Array = LM.model_meta(level.kit_id, "hm_trophy").get("slots", [])
		var k := 0
		for id in Profile.d["trophies"]:
			if k >= cs.size():
				break
			var it := LM.get_def("items", id)
			var t := LM.spawn_model(it.get("kit", level.kit_id), it.get("model", "item_chips"))
			case.add_child(t)
			t.scale = Vector3.ONE * float(it.get("scale", 1.6)) * 0.6
			var acc: Array = [null]
			Pickup._bounds(t, Transform3D.IDENTITY, acc)
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
		robot = level.spawn_thing({"actor": ROBOT, "at": [c.x, c.y], "face": "n", "tag": "housebot"}, c)
		return
	var def := LM.get_def("actors", ROBOT)          # the wreck: the same model, slumped in the clamps, and nobody home
	var path: String = def.get("model", "")
	robot = LM.spawn_scene(path if path.begins_with("res://") else "res://" + path, "" if def.get("own_materials", false) else def.get("kit", level.kit_id))
	robot.scale = Vector3.ONE * float(def.get("scale", 1.0)) * 0.9
	cradle.add_child(robot)
	robot.position = Vector3(0, 0.16, 0.05)
	robot.rotation = Vector3(-0.16, 0.25, 0.09)


# ------------------------------------------------------------------ using the furniture
func _panel(kicker: String, title: String, text: String, options: Array = []) -> void:
	Game.hud.repanel(self, {"kicker": kicker, "title": title, "text": text, "options": options})


func set_screen(_t: String) -> void:
	pass


func _list(counts: Dictionary) -> String:
	var bits: Array = []
	for id in counts:
		if int(counts[id]) > 0:
			bits.append("%d × %s" % [int(counts[id]), _item(id)])
	return ", ".join(bits) if not bits.is_empty() else "nothing yet"


func use_prop(_prop: Node, what: String) -> void:
	var p: Dictionary = Profile.d
	match what:
		"comms":
			_panel("Home · video radio", "Who is on the air", "\n\n".join(BROADCASTS.slice(0, 3)) + "\n\n" + BROADCASTS[3 + randi() % 2],
				[{"label": "Listen a while longer", "do": func(): use_prop(null, "comms")}])
		"ledger":
			_ledger()
		"trophy":
			var counts := {}
			for id in p["trophies"]:
				counts[id] = int(counts.get(id, 0)) + 1
			_panel("Home · den", "Trophy case", "What was worth a shelf: %s.\n\nData crystals and Employees of the Century go in here when you bring them home alive." % _list(counts))
		"rack":
			var names: Array = []
			for w in p["weapons"]:
				names.append(LM.get_def("weapons", w).get("name", w))
			_panel("Home · armoury", "Weapon rack", "On the rack: %s.\n\nEvery weapon you bring home alive stays here, and all of them go with you when you take the lift. You always have the handgun." % (", ".join(names) if not names.is_empty() else "nothing yet"))
		"armor":
			_panel("Home · armoury", "Armour stand", ("A vest, good for %d. You put it on when you take the lift." % int(p["armor"])) if int(p["armor"]) > 0 else "Bare. Come home wearing armour and what is left of it hangs here; you set out in the best you have brought back.")
		"locker":
			_panel("Home · armoury", "Supply locker", "Shells and cells, in the boxes they were issued in. When you take the lift, every weapon that goes with you is filled to half a load from here.")
		"medic":
			_panel("Home · bathroom", "Medical station", "An old wall unit that still knows what a person is supposed to look like. It runs on gauze, glue and dose cartridges.\n\nYou are in acceptable condition. You always leave here whole.")
		"bed":
			Game.say("You sleep. Nothing comes through the door.", "good")
			LM.sound("heal")
		"sofa":
			Game.say(PROGRAMMES[randi() % PROGRAMMES.size()], "info")
		"security":
			_panel("Home · security", "Cameras", "CAM 1  the hatch: sand, and the wind moving it.\nCAM 2  the road: nothing on it.\nCAM 3  the horizon: the Anomalous Structure, with its screens lit.\n\nThe near-area map is not wired to this desk yet. For now the lift goes straight to an installation.")
		"diagnostic", "cradle":
			_cradle()
		"lift":
			_lift()


func _ledger() -> void:
	var p: Dictionary = Profile.d
	var text := "Banked  %d cr        Expeditions home  %d        Lost  %d        Best haul  %d cr\n\nBrought home: %s.\n\nFurnishings waiting to be put down: %d.  (B, anywhere in the bunker.)" % [
		int(p["credits"]), int(p["runs"]), int(p["deaths"]), int(p["best"]), _list(p["salvage"]), _waiting()]
	_panel("Home · den", "Expedition Ledger", text, [
		{"label": "Order furnishings", "do": _catalogue},
		{"label": "Decorate now", "do": func():
			Game.hud.close_panel()
			if not decorating:
				toggle()},
		{"label": "Retire (clear the bunker out for the next scavenger)", "do": func():
			_panel("Home · den", "Hang up the satchel?", "An old pension terminal somebody rewired to print one line: YOUR SERVICE IS APPRECIATED.\n\nRetiring empties the bunker: credits, weapons, trophies, furnishings, the robot. It cannot be undone.", [
				{"label": "Not yet", "do": _ledger},
				{"label": "Retire", "do": func():
					Profile.retire()
					Game.hud.close_panel()
					Game.hud.start_requested.emit(level.data.get("id", "home"))}])}])


func _waiting() -> int:
	var n := 0
	for a in available():
		n += int(a[1])
	return n


func _catalogue() -> void:
	var opts: Array = []
	for i in CATALOGUE.size():
		var c: Array = CATALOGUE[i]
		var own := int(Profile.d["owned"].get(c[0], 0))
		opts.append({"label": "%s   %d cr%s" % [_name(c[0]), c[1], ("   (you have %d)" % own) if own > 0 else ""], "do": buy.bind(i)})
	opts.append({"label": "Back to the ledger", "do": _ledger})
	_panel("Home · den", "Furnishings by post", "Banked: %d cr.   Waiting to be put down: %d.\nWhat you order arrives at once, which is the only thing the old world still does on time. Put it down with B." % [int(Profile.d["credits"]), _waiting()], opts)


func buy(i: int) -> bool:
	var c: Array = CATALOGUE[i]
	if int(Profile.d["credits"]) < int(c[1]):
		Game.say("%s costs %d cr. You have %d banked." % [_name(c[0]), c[1], int(Profile.d["credits"])], "warn")
		LM.sound("denied")
		return false
	Profile.d["credits"] = int(Profile.d["credits"]) - int(c[1])
	Profile.d["owned"][c[0]] = int(Profile.d["owned"].get(c[0], 0)) + 1
	Profile.save()
	Game.credits = int(Profile.d["credits"])
	Game.changed.emit()
	Game.say("%s: delivered." % _name(c[0]), "good")
	if Game.hud and Game.hud.in_panel():
		_catalogue()
	return true


func can_repair() -> bool:
	for id in REPAIR:
		if Profile.count(id) < int(REPAIR[id]):
			return false
	return true


func _cradle() -> void:
	if Profile.d["robot"]:
		_panel("Home · robot room", "Repair cradle", "Empty. He is about the place somewhere, seeing to the floors. Talk to him; he has opinions.")
		return
	var need: Array = []
	for id in REPAIR:
		need.append("%d × %s (you have brought home %d)" % [int(REPAIR[id]), _item(id), Profile.count(id)])
	var opts: Array = []
	if can_repair():
		opts.append({"label": "Repair it", "do": repair})
	_panel("Home · robot room", "A Custodian, dead in the clamps", "Kaveros pattern, three hundred years off shift. The frame is sound. The logic boards are slag and there is nothing in it that holds a charge.\n\nIt needs:\n   " + "\n   ".join(need) + ("\n\nYou have what it needs." if can_repair() else "\n\nBring those home and it can be put right."), opts)


func repair() -> bool:
	if Profile.d["robot"] or not can_repair():
		return false
	for id in REPAIR:
		Profile.d["salvage"][id] = Profile.count(id) - int(REPAIR[id])
	Profile.d["robot"] = true
	Profile.save()
	if Game.hud and Game.hud.in_panel():
		Game.hud.close_panel()
	_robot()
	LM.sound("confirm")
	Game.say("The Custodian's eye comes on. It looks at the floor first, and then at you.", "good")
	return true


func destinations() -> Dictionary:
	var built: Array = []
	for id in LM.game.get("menu", []):
		if id != level.data.get("id", "home") and LM.levels.has(id):
			built.append([LM.levels[id].get("name", id), id])
	var wild: Array = []
	for gid in LM.generators:
		wild.append(["Somewhere nobody has named", "gen:" + gid])
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
		opts.append({"label": "Back", "do": _lift})
		_panel("Home · the lift", title, "The cage is waiting.", opts)
	_panel("Home · the lift", "Where to?", "What is on the rack and the stand goes with you, and the locker fills you up. What you carry back alive is banked here; what you are carrying when you die is somebody else's salvage.\n\nThe near-area map is not built yet: for now the lift goes straight to the door of an installation.", [
		{"label": "An installation on record", "do": sub.bind("Installations on record", d["built"])},
		{"label": "An unsurveyed installation", "do": sub.bind("Unsurveyed installations", d["wild"])}])


func go(id: String) -> void:
	Profile.sortie = true
	if Game.hud.in_panel():
		Game.hud.close_panel()
	Game.hud.start_requested.emit(id)


# ------------------------------------------------------------------ decorating
## What has been bought and not yet put down: [[model, how many], ..]
func available() -> Array:
	var down := {}
	for dec in Profile.d["decor"]:
		down[dec["m"]] = int(down.get(dec["m"], 0)) + 1
	var out: Array = []
	for c in CATALOGUE:
		var n := int(Profile.d["owned"].get(c[0], 0)) - int(down.get(c[0], 0))
		if n > 0:
			out.append([c[0], n])
	return out


func toggle() -> void:
	decorating = not decorating
	_sel = 0
	_drop_ghost()
	_bar.visible = decorating
	if decorating and available().is_empty() and _placed.is_empty():
		Game.say("Nothing to put down yet. Order furnishings from the ledger on the desk in the den.", "info")
	_tell()


func _tell() -> void:
	if not decorating:
		return
	var av := available()
	if av.is_empty():
		_bar.text = "DECORATING   nothing waiting to be put down   ·   X take back what is in front of you   ·   B done"
	else:
		_sel = _sel % av.size()
		_bar.text = "DECORATING   %s  (%d)   ·   click put down   ·   R turn   ·   Z next   ·   X take back   ·   B done" % [_name(av[_sel][0]), av[_sel][1]]


func _drop_ghost() -> void:
	if _ghost and is_instance_valid(_ghost):
		_ghost.queue_free()
	_ghost = null
	_ghost_model = ""


func _stand(dec: Dictionary) -> Prop:
	var before := level.get_child_count()
	var pr := Prop.new()
	level.add_child(pr)
	pr.position = Vector3(dec["x"], 0, dec["z"])
	pr.rotation.y = dec["yaw"]
	var c := level.cell_of(pr.position)
	pr.setup(level, {"prop": dec["m"], "at": [c.x, c.y], "decor": true}, level.kit_id)
	var extras: Array = []                           # its lamp, if it has one, belongs to the level: remember it, to take it away again
	for i in range(before, level.get_child_count()):
		if level.get_child(i) != pr:
			extras.append(level.get_child(i))
	pr.set_meta("extras", extras)
	return pr


## Where the thing in hand would go, and whether it can: on the floor in front of you, or on the wall you are looking at.
func aim(model: String) -> void:
	var pl: Player = Game.player
	var from: Vector3 = pl.cam.global_position
	var dir: Vector3 = -pl.cam.global_transform.basis.z
	_ok = false
	if LM.model_meta(level.kit_id, model).get("mount", "") == "wall":
		var q := PhysicsRayQueryParameters3D.create(from, from + dir * 7.0, 1)
		var hit := level.get_world_3d().direct_space_state.intersect_ray(q)
		if not hit.is_empty() and absf(hit["normal"].y) < 0.3 and hit["collider"] == level._solid:
			_spot = Vector3(hit["position"].x, 0, hit["position"].z) + hit["normal"] * 0.012
			_spot.y = 0
			_yaw = atan2(hit["normal"].x, hit["normal"].z)
			_ok = true
		return
	var reach := 2.6
	if dir.y < -0.12:                                # looking down: where the eye falls on the floor, within arm's length or so
		reach = clampf(from.y / -dir.y * Vector2(dir.x, dir.z).length(), 1.2, 5.0)
	var flat := Vector3(dir.x, 0, dir.z).normalized()
	_spot = Vector3(snappedf(pl.global_position.x + flat.x * reach, 0.25), 0, snappedf(pl.global_position.z + flat.z * reach, 0.25))
	_yaw = snappedf(pl.rotation.y + PI, PI / 4) + _turn
	var c := level.cell_of(_spot)
	_ok = level.is_open(c.x, c.y) and level.cell(c.x, c.y)["door"] == "" and absf(pl.global_position.y) < 0.6


func _process(_dt: float) -> void:
	if not decorating or Game.player == null or not is_instance_valid(Game.player):
		return
	var av := available()
	if av.is_empty():
		_drop_ghost()
		return
	_sel = _sel % av.size()
	var model: String = av[_sel][0]
	if _ghost_model != model:
		_drop_ghost()
		_ghost = LM.spawn_model(level.kit_id, model)
		_ghost_model = model
		level.add_child(_ghost)
	aim(model)
	_ghost.visible = _ok
	_ghost.position = _spot + Vector3(0, 0.02 + 0.03 * sin(Time.get_ticks_msec() * 0.006), 0)
	_ghost.rotation.y = _yaw


func place() -> bool:
	var av := available()
	if av.is_empty() or not _ok:
		LM.sound("denied")
		return false
	var dec := {"m": av[_sel % av.size()][0], "x": _spot.x, "z": _spot.z, "yaw": _yaw}
	Profile.d["decor"].append(dec)
	Profile.save()
	_placed.append(_stand(dec))
	LM.sound("confirm")
	_tell()
	return true


## Take back the furnishing nearest the place you are pointing at.
func take_back() -> bool:
	var pl: Player = Game.player
	var at: Vector3 = pl.global_position - pl.global_transform.basis.z * 1.8
	var best := -1
	var bd := 2.6
	for i in _placed.size():
		var dd: float = Vector2(_placed[i].position.x - at.x, _placed[i].position.z - at.z).length()
		if dd < bd:
			bd = dd
			best = i
	if best < 0:
		Game.say("Nothing of yours within reach.", "info")
		return false
	var pr: Prop = _placed[best]
	for x in pr.get_meta("extras", []):
		if is_instance_valid(x):
			for k in level.lights_by_room:
				level.lights_by_room[k].erase(x)
			x.queue_free()
	Game.say("%s: picked up." % _name(Profile.d["decor"][best]["m"]), "info")
	pr.queue_free()
	_placed.remove_at(best)
	Profile.d["decor"].remove_at(best)
	Profile.save()
	LM.sound("click")
	_tell()
	return true


func _unhandled_input(ev: InputEvent) -> void:
	if Game.hud == null or not Game.hud.playing():
		return
	if ev is InputEventKey and ev.pressed and not ev.echo:
		match ev.physical_keycode:
			KEY_B:
				toggle()
			KEY_R:
				if decorating:
					_turn += PI / 4
			KEY_Z:
				if decorating:
					_sel += 1
					_tell()
			KEY_X:
				if decorating:
					take_back()
	elif decorating and ev is InputEventMouseButton and ev.pressed and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		if ev.button_index == MOUSE_BUTTON_LEFT:
			place()
		elif ev.button_index == MOUSE_BUTTON_WHEEL_UP or ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_sel += 1
			_tell()
