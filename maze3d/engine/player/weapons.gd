extends Node
## PlayerWeapons - what the player carries and fires: the weapons (ids into defs/weapons), ammo by kind, the one in
## hand and its model in the camera's hand, its kick (recoil), and firing: hitscan rays or projectiles, with spread,
## pellets and fall-off as the weapon's def says. A shot is heard by every actor in the level.
class_name PlayerWeapons

const NOISE := 30.0              # metres a shot carries, for a weapon whose def does not say (its "noise"; 0 is silent)
var pl: Player
var weapons: Array = []
var ammo: Dictionary = {}
var current := 0
var recoil := 0.0
var _vm: Node3D                   # the model in hand
var _cool := 0.0
var _sway := Vector2.ZERO
var _switch := 0.0
var _fire_held := false


func setup(player: Player) -> void:
	pl = player
	for k in LM.defs.get("ammo", {}):
		ammo[k] = 0
	for k in pl.cfg.get("ammo", {}):
		ammo[k] = int(pl.cfg["ammo"][k])
	for wid in pl.cfg.get("weapons", []):
		weapons.append(wid)
	equip(0)


func weapon() -> Dictionary:
	if weapons.is_empty():
		return {}
	return LM.get_def("weapons", weapons[current])


func equip(i: int) -> void:
	if weapons.is_empty():
		return
	current = clampi(i, 0, weapons.size() - 1)
	if _vm:
		_vm.queue_free()
	var w := weapon()
	_vm = LM.spawn_model(w.get("kit", pl.level.kit_id), w.get("model", ""))
	_vm.rotation.y = PI
	_vm.scale = Vector3.ONE * w.get("scale", 1.0)
	pl.hold.add_child(_vm)
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
	equip(weapons.size() - 1)


## Something takes ammunition from the gun in hand (a latcher's theft): up to n of its kind, none if it takes none.
func spend_ammo(n: int) -> void:
	var kind: Variant = weapon().get("ammo") if not weapons.is_empty() else null
	if kind != null:
		ammo[kind] = maxi(0, int(ammo.get(kind, 0)) - n)
		Game.changed.emit()


func add_ammo(kind: String, n: int) -> bool:
	var mx: int = int(LM.defs.get("ammo", {}).get(kind, {}).get("max", 999))
	if ammo.get(kind, 0) >= mx:
		return false
	ammo[kind] = min(mx, ammo.get(kind, 0) + n)
	Game.changed.emit()
	return true


## The gun has cooled down from its last shot.
func cooled() -> bool:
	return _cool <= 0.0


## The mouse moved: the gun lags behind the look a little.
func sway(rel: Vector2) -> void:
	_sway += rel * 0.0004


## The kick of the last shot dies away (the camera reads it before the hand is placed).
func settle(dt: float) -> void:
	recoil = move_toward(recoil, 0.0, dt * 6.0)


## One frame: place the gun in hand (sway, bob, the dip of switching, kick; out of the scope's view when zoomed),
## then fire if the trigger is held and the gun has cooled. Single-shot guns want the trigger let go between shots.
func step(dt: float, zoom: float, bob: float, pressing: bool) -> void:
	_sway = _sway.lerp(Vector2.ZERO, 8 * dt)
	_switch = move_toward(_switch, 0.0, dt * 4.0)
	var w := weapon()
	var hp_off := LM.vec(w.get("hold"), Vector3(0.26, -0.24, -0.5))
	pl.hold.position = hp_off + Vector3(-_sway.x + cos(bob) * 0.012, _sway.y + abs(sin(bob)) * 0.014 - _switch * 0.4 - zoom * 0.5, recoil * 0.07)      # zoomed: the gun drops out of the scope's view
	pl.hold.visible = zoom < 0.85
	pl.hold.rotation = Vector3(0.05 + recoil * 0.22 - _switch * 0.8, 0.06 - _sway.x * 1.5, 0)
	_cool -= dt
	if pressing and _cool <= 0.0 and not w.is_empty() and (w.get("auto", true) or not _fire_held):
		fire(w)
	_fire_held = pressing


func muzzle_pos() -> Vector3:
	var w := weapon()
	var m := LM.vec(LM.model_meta(w.get("kit", pl.level.kit_id), w.get("model", "")).get("muzzle"), Vector3(0, 0.04, 0.5))
	if _vm:
		return _vm.global_transform * m
	return pl.cam.global_position


## Out of ammo: say so, and fall back to something that still fires.
func _empty(kind: String) -> void:
	_cool = 0.3
	LM.sound("empty")
	Game.say("Out of %s." % LM.defs.get("ammo", {}).get(kind, {}).get("name", kind), "warn")
	for i in weapons.size():
		var o := LM.get_def("weapons", weapons[i])
		if o.get("ammo") == null or ammo.get(o["ammo"], 0) >= int(o.get("per_shot", 1)):
			equip(i)
			break


func fire(w: Dictionary) -> void:
	var kind: Variant = w.get("ammo")
	var per: int = int(w.get("per_shot", 1))
	if kind != null:
		if ammo.get(kind, 0) < per:
			_empty(kind)
			return
		ammo[kind] -= per
	_cool = 1.0 / w.get("rate", 4.0)
	recoil = min(2.0, recoil + w.get("recoil", 0.5))
	pl.shake(w.get("kick", 0.05))
	var mz := muzzle_pos()
	var c := LM.col(w.get("color"), Color(1.0, 0.8, 0.4))
	Fx.flash(pl.level, mz, c, 3.0, 7.0, 0.07)
	LM.sound(w.get("sound", "shot"), null, -2.0, randf_range(0.95, 1.05))
	var cam := pl.cam
	var fwd := -cam.global_transform.basis.z
	var spread: float = deg_to_rad(w.get("spread", 1.0)) * (1.0 + recoil * 0.5)
	for i in int(w.get("pellets", 1)):
		var dir := fwd.rotated(cam.global_transform.basis.y, randf_range(-spread, spread)).rotated(cam.global_transform.basis.x, randf_range(-spread, spread))
		if w.has("projectile"):
			_launch(w, mz, fwd, dir)
		else:
			_ray(w, mz, dir, c)
	pl.level.perception.noise(pl.global_position + Vector3(0, 1.4, 0), float(w.get("noise", NOISE)), "gunfire", pl)
	Game.changed.emit()


func _launch(w: Dictionary, mz: Vector3, fwd: Vector3, dir: Vector3) -> void:
	# point blank, the muzzle can be inside what you're shooting: start the shot at the eye instead
	var eye := pl.cam.global_position
	var start := mz + fwd * 0.2
	var nq := PhysicsRayQueryParameters3D.create(eye, eye + fwd * 2.6, 1 | 4 | Level.GLASS)
	nq.exclude = [pl.get_rid()]
	if not pl.get_world_3d().direct_space_state.intersect_ray(nq).is_empty():
		start = eye + fwd * 0.05
	Projectile.launch(pl.level, w["projectile"], start, _aim_from_muzzle(start, dir), w.get("damage", 20.0) * Game.deal_scale(), pl, true)


func _ray(w: Dictionary, mz: Vector3, dir: Vector3, c: Color) -> void:
	var from := pl.cam.global_position
	var to: Vector3 = from + dir * w.get("range", 80.0)
	var q := PhysicsRayQueryParameters3D.create(from, to, 1 | 4 | Level.GLASS)
	q.exclude = [pl.get_rid()]
	var hit := pl.get_world_3d().direct_space_state.intersect_ray(q)
	var end := to
	if not hit.is_empty():
		end = hit["position"]
		var col: Object = hit["collider"]
		if col and col.has_method("hurt"):
			var dmg: float = w.get("damage", 10.0) * Game.deal_scale()
			var fall: float = w.get("falloff", 0.0)
			if fall > 0.0:
				dmg *= 1.0 - fall * clamp(from.distance_to(end) / w.get("range", 80.0), 0.0, 1.0)
			col.hurt(dmg, {"type": w.get("kind", "bullet"), "from": pl.global_position, "by": pl, "point": end})
		else:
			Fx.sparks(pl.level, end, Color(1.0, 0.75, 0.4), 5, 3.0, 0.3, 0.04)
	Fx.tracer(pl.level, mz, end, c, 0.015)


func _aim_from_muzzle(mz: Vector3, dir: Vector3) -> Vector3:
	# aim the shot at what the crosshair is on, not parallel to it
	var from := pl.cam.global_position
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 80.0, 1 | 4 | Level.GLASS)
	q.exclude = [pl.get_rid()]
	var hit := pl.get_world_3d().direct_space_state.intersect_ray(q)
	var target: Vector3 = hit["position"] if not hit.is_empty() else from + dir * 80.0
	return (target - mz).normalized()
