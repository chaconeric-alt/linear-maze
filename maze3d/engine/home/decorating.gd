extends Node
## HomeDecorating - putting furnishings down in the bunker (a child of Home). What has been bought from the catalogue and
## not yet put down is carried as a ghost in front of you while decorating (B):
##   click  put it down        R  turn it        Z or wheel  the next thing        X  take back what is in front of you
## Each one put down is a Prop, saved in Profile.d["decor"] ({m, x, z, yaw}) and stood up again on every visit.
class_name HomeDecorating

var home: Home
var level: Level
var on := false                          # decorating now
var placed: Array = []                   # Props, one for each of Profile.d["decor"], in step with it
var sel := 0                             # which of what is waiting is in hand
var _ghost: Node3D = null
var _ghost_model := ""
var _turn := 0.0
var _ok := false
var _spot := Vector3.ZERO
var _yaw := 0.0
var _bar: Label


func setup(h: Home) -> void:
	home = h
	level = h.level
	for dec in Profile.d["decor"]:
		placed.append(_stand(dec))
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


## What has been bought and not yet put down: [[model, how many], ..]
func available() -> Array:
	var down := {}
	for dec in Profile.d["decor"]:
		down[dec["m"]] = int(down.get(dec["m"], 0)) + 1
	var out: Array = []
	for c in home.catalogue():
		var n := int(Profile.d["owned"].get(c[0], 0)) - int(down.get(c[0], 0))
		if n > 0:
			out.append([c[0], n])
	return out


func toggle() -> void:
	on = not on
	sel = 0
	_drop_ghost()
	_bar.visible = on
	if on and available().is_empty() and placed.is_empty():
		Game.say(home.word("decor_none"), "info")
	_tell()


func _tell() -> void:
	if not on:
		return
	var av := available()
	if av.is_empty():
		_bar.text = home.word("decor_bar_empty")
	else:
		sel = sel % av.size()
		_bar.text = home.word("decor_bar") % [home.model_name(av[sel][0]), av[sel][1]]


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
	level.spawner.keep(pr)
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
		if not hit.is_empty() and absf(hit["normal"].y) < 0.3 and hit["collider"] == level.solid_body():
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
	if not on or Game.player == null or not is_instance_valid(Game.player):
		return
	var av := available()
	if av.is_empty():
		_drop_ghost()
		return
	sel = sel % av.size()
	var model: String = av[sel][0]
	if _ghost_model != model:
		_drop_ghost()
		_ghost = LM.spawn_model(level.kit_id, model)
		_ghost_model = model
		level.add_child(_ghost)
	aim(model)
	_ghost.visible = _ok
	_ghost.position = _spot + Vector3(0, 0.02 + 0.03 * sin(Debug.now_msec() * 0.006), 0)
	_ghost.rotation.y = _yaw


func place() -> bool:
	var av := available()
	if av.is_empty() or not _ok:
		LM.sound("denied")
		return false
	var dec := {"m": av[sel % av.size()][0], "x": _spot.x, "z": _spot.z, "yaw": _yaw}
	Profile.d["decor"].append(dec)
	Profile.save()
	placed.append(_stand(dec))
	LM.sound("confirm")
	_tell()
	return true


## Take back the furnishing nearest the place you are pointing at.
func take_back() -> bool:
	var pl: Player = Game.player
	var at: Vector3 = pl.global_position - pl.global_transform.basis.z * 1.8
	var best := -1
	var bd := 2.6
	for i in placed.size():
		var dd: float = Vector2(placed[i].position.x - at.x, placed[i].position.z - at.z).length()
		if dd < bd:
			bd = dd
			best = i
	if best < 0:
		Game.say(home.word("decor_out_of_reach"), "info")
		return false
	var pr: Prop = placed[best]
	for x in pr.get_meta("extras", []):
		if is_instance_valid(x):
			for k in level.lights_by_room:
				level.lights_by_room[k].erase(x)
			x.queue_free()
	Game.say(home.word("decor_picked_up") % home.model_name(Profile.d["decor"][best]["m"]), "info")
	pr.queue_free()
	placed.remove_at(best)
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
				if on:
					_turn += PI / 4
			KEY_Z:
				if on:
					sel += 1
					_tell()
			KEY_X:
				if on:
					take_back()
	elif on and ev is InputEventMouseButton and ev.pressed and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		if ev.button_index == MOUSE_BUTTON_LEFT:
			place()
		elif ev.button_index == MOUSE_BUTTON_WHEEL_UP or ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			sel += 1
			_tell()
