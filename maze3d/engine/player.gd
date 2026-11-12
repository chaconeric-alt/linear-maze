extends CharacterBody3D
## Player - first-person movement, weapons, health and using things.
class_name Player

const EYE := 1.62
var level: Level
var cfg: Dictionary = {}
var hp := 100.0
var max_hp := 100.0
var armor := 0.0
var max_armor := 100.0
var dead := false
var held_by: Node = null         # the monster that has grabbed you, if one has
var frozen := false
var weapons: Array = []
var ammo: Dictionary = {}
var current := 0
var head: Node3D
var cam: Camera3D
var lamp: SpotLight3D
var hold: Node3D
var focus: Node = null
var recoil := 0.0
var last_hit_dir := Vector3.ZERO
var hurt_flash := 0.0
var _vm: Node3D
var _cool := 0.0
var _dash_t := 0.0
var _dash_cool := 0.0
var _dash_dir := Vector3.ZERO
var _bob := 0.0
var _shake := 0.0
var _step := 0.0
var _sway := Vector2.ZERO
var _switch := 0.0
var _pitch := 0.0
var _fire_held := false


func setup(lv: Level, config: Dictionary) -> void:
	level = lv
	cfg = config
	max_hp = cfg.get("hp", 100.0)
	hp = max_hp
	armor = cfg.get("armor", 0.0)
	collision_layer = 2
	collision_mask = 1 | 4 | Level.GLASS
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.4
	cap.height = 1.8
	cs.shape = cap
	cs.position.y = 0.9
	add_child(cs)
	head = Node3D.new()
	head.position.y = EYE
	add_child(head)
	cam = Camera3D.new()
	cam.fov = cfg.get("fov", 84.0)
	cam.near = 0.04
	cam.far = 220.0
	cam.current = true
	head.add_child(cam)
	lamp = SpotLight3D.new()
	lamp.spot_range = 26.0
	lamp.spot_angle = 30.0
	lamp.spot_angle_attenuation = 0.8
	lamp.light_energy = 2.2
	lamp.light_color = Color(0.9, 0.95, 1.0)
	lamp.shadow_enabled = true
	lamp.position = Vector3(0.2, -0.15, 0)
	lamp.light_cull_mask = 1
	lamp.visible = cfg.get("lamp", true)
	cam.add_child(lamp)
	hold = Node3D.new()
	cam.add_child(hold)
	var fill := OmniLight3D.new()          # lights only what you hold (layer 2), so it reads in the dark
	fill.light_cull_mask = 2
	fill.light_energy = 0.9
	fill.omni_range = 3.0
	fill.position = Vector3(-0.3, 0.3, 0.2)
	cam.add_child(fill)
	for k in LM.defs.get("ammo", {}):
		ammo[k] = 0
	for k in cfg.get("ammo", {}):
		ammo[k] = int(cfg["ammo"][k])
	for wid in cfg.get("weapons", []):
		weapons.append(wid)
	_equip(0)


func weapon() -> Dictionary:
	if weapons.is_empty():
		return {}
	return LM.get_def("weapons", weapons[current])


func _equip(i: int) -> void:
	if weapons.is_empty():
		return
	current = clampi(i, 0, weapons.size() - 1)
	if _vm:
		_vm.queue_free()
	var w := weapon()
	_vm = LM.spawn_model(w.get("kit", level.kit_id), w.get("model", ""))
	_vm.rotation.y = PI
	_vm.scale = Vector3.ONE * w.get("scale", 1.0)
	hold.add_child(_vm)
	_no_shadow(_vm)
	_layer(_vm, 2)          # layer 2: seen by the camera, not lit by your own lamp
	_switch = 1.0
	Game.changed.emit()


func _layer(n: Node, mask: int) -> void:
	if n is VisualInstance3D:
		n.layers = mask
	for c in n.get_children():
		_layer(c, mask)


func _no_shadow(n: Node) -> void:
	if n is GeometryInstance3D:
		n.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for c in n.get_children():
		_no_shadow(c)


func give_weapon(id: String) -> void:
	if id == "" or weapons.has(id):
		var w := LM.get_def("weapons", id)
		if w.has("ammo") and w["ammo"] != null:
			add_ammo(w["ammo"], int(w.get("pickup_ammo", 10)))
		return
	weapons.append(id)
	var w2 := LM.get_def("weapons", id)
	if w2.get("ammo") != null:
		add_ammo(w2["ammo"], int(w2.get("pickup_ammo", 10)))
	_equip(weapons.size() - 1)


func add_ammo(kind: String, n: int) -> bool:
	var mx: int = int(LM.defs.get("ammo", {}).get(kind, {}).get("max", 999))
	if ammo.get(kind, 0) >= mx:
		return false
	ammo[kind] = min(mx, ammo.get(kind, 0) + n)
	Game.changed.emit()
	return true


func heal(n: float) -> void:
	hp = min(max_hp, hp + n)
	Game.changed.emit()


func shake(s: float) -> void:
	_shake = max(_shake, s)


func hurt(amount: float, info: Dictionary = {}) -> void:
	if dead or _dash_t > 0.0 and info.get("type", "") != "blast":
		return
	amount *= Game.take_scale()
	if armor > 0.0:
		var soak: float = min(armor, amount * 0.6)
		armor -= soak
		amount -= soak
	hp -= amount
	hurt_flash = min(1.0, hurt_flash + 0.35 + amount / 40.0)
	shake(min(0.5, amount / 40.0))
	if info.has("from"):
		last_hit_dir = (info["from"] - global_position).normalized()
		var k: Vector3 = global_position - info["from"]
		k.y = 0
		velocity += k.normalized() * info.get("knock", 2.0)
	LM.sound("hurt")
	Game.changed.emit()
	if hp <= 0.0:
		hp = 0.0
		dead = true
		Game.finish({"dead": true, "by": info})


func _unhandled_input(ev: InputEvent) -> void:
	if frozen or dead:
		return
	if ev is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var s: float = cfg.get("sensitivity", 0.0022)
		rotation.y -= ev.relative.x * s
		_pitch = clamp(_pitch - ev.relative.y * s, -1.5, 1.5)
		_sway += ev.relative * 0.0004
	elif ev is InputEventMouseButton and ev.pressed:
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP:
			_equip((current + 1) % max(1, weapons.size()))
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_equip((current - 1 + weapons.size()) % max(1, weapons.size()))
	elif ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode >= KEY_1 and ev.keycode <= KEY_9 and ev.keycode - KEY_1 < weapons.size():
			_equip(ev.keycode - KEY_1)
		elif ev.is_action("use"):
			if Game.easy:                                # easy mode: E first says what you are looking at
				var seen := Identify.look(self)
				if not seen.is_empty():
					print("IDENT  %s  |  %s" % [seen["title"], seen["detail"]])
					Game.identified.emit(seen["title"], seen["detail"])
			if focus and is_instance_valid(focus):
				focus.use(self)
		elif ev.is_action("flashlight"):
			lamp.visible = not lamp.visible
			LM.sound("click")


func _physics_process(dt: float) -> void:
	if dead:
		head.position.y = move_toward(head.position.y, 0.4, dt * 2.5)
		cam.rotation.z = move_toward(cam.rotation.z, 0.6, dt * 1.5)
		velocity.x = 0
		velocity.z = 0
		velocity.y -= 22 * dt
		move_and_slide()
		return
	if held_by != null and (not is_instance_valid(held_by) or held_by.dead):
		held_by = null
	var held := held_by != null                      # something has hold of you: look and shoot, but it decides where you are
	var inp := Vector2.ZERO
	if not frozen and not held:
		inp = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var dir := (global_transform.basis * Vector3(inp.x, 0, inp.y))
	dir.y = 0
	dir = dir.normalized()
	var speed: float = cfg.get("speed", 8.5)
	if level and level.fluid_at(global_position):      # wading
		speed *= 0.62
	_dash_cool -= dt
	if not frozen and not held and Input.is_action_just_pressed("dash") and _dash_cool <= 0.0:
		_dash_dir = dir if dir != Vector3.ZERO else -global_transform.basis.z
		_dash_t = 0.17
		_dash_cool = cfg.get("dash_cooldown", 0.85)
		LM.sound("dash")
	if _dash_t > 0.0:
		_dash_t -= dt
		velocity.x = _dash_dir.x * 24.0
		velocity.z = _dash_dir.z * 24.0
	else:
		var acc := 70.0 if is_on_floor() else 22.0
		velocity.x = move_toward(velocity.x, dir.x * speed, acc * dt)
		velocity.z = move_toward(velocity.z, dir.z * speed, acc * dt)
	if is_on_floor():
		if not frozen and not held and Input.is_action_just_pressed("jump"):
			velocity.y = cfg.get("jump", 7.6)
	else:
		velocity.y -= 22.0 * dt
	if held:
		velocity = Vector3.ZERO
	move_and_slide()
	var hs := Vector2(velocity.x, velocity.z).length()
	if is_on_floor() and hs > 1.0:
		_bob += dt * hs * 1.5
		_step += dt * hs
		if _step > 3.2:
			_step = 0.0
			LM.sound("step", null, -14.0, randf_range(0.8, 1.1))
	# camera
	_shake = move_toward(_shake, 0.0, dt * 1.6)
	recoil = move_toward(recoil, 0.0, dt * 6.0)
	hurt_flash = move_toward(hurt_flash, 0.0, dt * 1.4)
	head.rotation.x = _pitch + recoil * 0.05
	cam.position = Vector3(randf_range(-1, 1), randf_range(-1, 1), 0) * _shake * 0.08 + Vector3(0, sin(_bob * 2.0) * 0.035, 0)
	cam.rotation.z = -inp.x * 0.025 + randf_range(-1, 1) * _shake * 0.02
	cam.fov = lerp(cam.fov, cfg.get("fov", 84.0) + (10.0 if _dash_t > 0.0 else 0.0), 12 * dt)
	# the weapon in hand
	_sway = _sway.lerp(Vector2.ZERO, 8 * dt)
	_switch = move_toward(_switch, 0.0, dt * 4.0)
	var w := weapon()
	var hp_off := LM.vec(w.get("hold"), Vector3(0.26, -0.24, -0.5))
	hold.position = hp_off + Vector3(-_sway.x + cos(_bob) * 0.012, _sway.y + abs(sin(_bob)) * 0.014 - _switch * 0.4, recoil * 0.07)
	hold.rotation = Vector3(0.05 + recoil * 0.22 - _switch * 0.8, 0.06 - _sway.x * 1.5, 0)
	# firing
	_cool -= dt
	var pressing := not frozen and Input.is_action_pressed("fire") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
	if pressing and _cool <= 0.0 and not w.is_empty() and (w.get("auto", true) or not _fire_held):
		_fire(w)
	_fire_held = pressing
	_find_focus()


func muzzle_pos() -> Vector3:
	var w := weapon()
	var m := LM.vec(LM.model_meta(w.get("kit", level.kit_id), w.get("model", "")).get("muzzle"), Vector3(0, 0.04, 0.5))
	if _vm:
		return _vm.global_transform * m
	return cam.global_position


func _fire(w: Dictionary) -> void:
	var kind: Variant = w.get("ammo")
	var per: int = int(w.get("per_shot", 1))
	if kind != null:
		if ammo.get(kind, 0) < per:
			_cool = 0.3
			LM.sound("empty")
			Game.say("Out of %s." % LM.defs.get("ammo", {}).get(kind, {}).get("name", kind), "warn")
			for i in weapons.size():        # fall back to something that still fires
				var o := LM.get_def("weapons", weapons[i])
				if o.get("ammo") == null or ammo.get(o["ammo"], 0) >= int(o.get("per_shot", 1)):
					_equip(i)
					break
			return
		ammo[kind] -= per
	_cool = 1.0 / w.get("rate", 4.0)
	recoil = min(2.0, recoil + w.get("recoil", 0.5))
	shake(w.get("kick", 0.05))
	var mz := muzzle_pos()
	var c := LM.col(w.get("color"), Color(1.0, 0.8, 0.4))
	Fx.flash(level, mz, c, 3.0, 7.0, 0.07)
	LM.sound(w.get("sound", "shot"), null, -2.0, randf_range(0.95, 1.05))
	var fwd := -cam.global_transform.basis.z
	var spread: float = deg_to_rad(w.get("spread", 1.0)) * (1.0 + recoil * 0.5)
	for i in int(w.get("pellets", 1)):
		var dir := fwd.rotated(cam.global_transform.basis.y, randf_range(-spread, spread)).rotated(cam.global_transform.basis.x, randf_range(-spread, spread))
		if w.has("projectile"):
			# point blank, the muzzle can be inside what you're shooting: start the shot at the eye instead
			var start := mz + fwd * 0.2
			var nq := PhysicsRayQueryParameters3D.create(cam.global_position, cam.global_position + fwd * 2.6, 1 | 4 | Level.GLASS)
			nq.exclude = [get_rid()]
			if not get_world_3d().direct_space_state.intersect_ray(nq).is_empty():
				start = cam.global_position + fwd * 0.05
			Projectile.launch(level, w["projectile"], start, _aim_from_muzzle(start, dir), w.get("damage", 20.0) * Game.deal_scale(), self, true)
			continue
		var from := cam.global_position
		var to: Vector3 = from + dir * w.get("range", 80.0)
		var q := PhysicsRayQueryParameters3D.create(from, to, 1 | 4 | Level.GLASS)
		q.exclude = [get_rid()]
		var hit := get_world_3d().direct_space_state.intersect_ray(q)
		var end := to
		if not hit.is_empty():
			end = hit["position"]
			var col: Object = hit["collider"]
			if col and col.has_method("hurt"):
				var dmg: float = w.get("damage", 10.0) * Game.deal_scale()
				var fall: float = w.get("falloff", 0.0)
				if fall > 0.0:
					dmg *= 1.0 - fall * clamp(from.distance_to(end) / w.get("range", 80.0), 0.0, 1.0)
				col.hurt(dmg, {"type": w.get("kind", "bullet"), "from": global_position, "by": self, "point": end})
			else:
				Fx.sparks(level, end, Color(1.0, 0.75, 0.4), 5, 3.0, 0.3, 0.04)
		Fx.tracer(level, mz, end, c, 0.015)
	for a in level.actors:
		if is_instance_valid(a):
			a.hear(global_position)
	Game.changed.emit()


func _aim_from_muzzle(mz: Vector3, dir: Vector3) -> Vector3:
	# aim the shot at what the crosshair is on, not parallel to it
	var from := cam.global_position
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 80.0, 1 | 4 | Level.GLASS)
	q.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	var target: Vector3 = hit["position"] if not hit.is_empty() else from + dir * 80.0
	return (target - mz).normalized()


func _find_focus() -> void:
	var best: Node = null
	var best_score := 0.55
	var from := cam.global_position
	var fwd := -cam.global_transform.basis.z
	for n in get_tree().get_nodes_in_group("usable"):
		if not is_instance_valid(n) or n.prompt() == "":
			continue
		var at: Vector3 = n.global_position + Vector3(0, 1.2, 0)
		var to := at - from
		var dist := to.length()
		if dist > 3.6:
			continue
		var score := fwd.dot(to.normalized()) - dist * 0.05
		if score > best_score:
			best_score = score
			best = n
	focus = best
