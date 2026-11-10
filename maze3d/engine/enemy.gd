extends CharacterBody3D
## Enemy - one actor. Its numbers, attacks and model come from a game's defs (actors); the model
## is any rigged glTF with clips called idle, walk, attack, hurt and die. SPEC.md, "Actors".
class_name Enemy

var level: Level
var d: Dictionary
var e: Dictionary
var tag := ""
var hp := 30.0
var max_hp := 30.0
var dead := false
var awake := false
var vis: Node3D
var anim: AnimationPlayer
var _atk: Variant = null          # the attack in progress
var _atk_t := 0.0
var _atk_done := false
var _burst := 0
var _cool: Dictionary = {}
var _path: PackedVector3Array
var _path_t := 0.0
var _see := false
var _see_t := 0.0
var _strafe := 1.0
var _strafe_t := 0.0
var _bark_t := 3.0
var _flash_t := 0.0
var _overlay: StandardMaterial3D
var _meshes: Array = []
var _fled := false
var _home: Vector3
var _wander_t := 0.0
var _wander := Vector3.ZERO
var _fly := false
var _fixed := false


func setup(lv: Level, def: Dictionary, entry: Dictionary) -> void:
	level = lv
	d = def
	e = entry
	tag = e.get("tag", "")
	hp = d.get("hp", 30.0) * e.get("hp_mul", 1.0)
	max_hp = hp
	_fly = d.get("fly", false)
	_fixed = d.get("behavior", "chaser") == "turret"
	collision_layer = 4
	collision_mask = 1 | 2 | 4
	var r: float = d.get("radius", 0.5)
	var hgt: float = d.get("height", 1.6)
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = r
	cap.height = max(hgt, r * 2.0)
	cs.shape = cap
	cs.position.y = d.get("center", hgt / 2)
	add_child(cs)
	if d.get("mount", "") == "ceiling":
		var c := lv.cell_of(position)
		position.y = lv.cell(c.x, c.y)["height"] * lv.H
	var path: String = d.get("model", "")
	vis = LM.spawn_scene(path if path.begins_with("res://") else "res://" + path, d.get("kit", lv.kit_id))
	vis.scale = Vector3.ONE * d.get("scale", 1.0)
	add_child(vis)
	anim = LM.find_type(vis, "AnimationPlayer") as AnimationPlayer
	_collect(vis)
	_overlay = StandardMaterial3D.new()
	_overlay.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_overlay.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_overlay.albedo_color = Color(0.9, 0.5, 0.4)
	_home = position
	_play("idle")
	if anim:
		anim.seek(randf() * 2.0)
	if e.get("alert", false):
		alert()


func _collect(n: Node) -> void:
	if n is MeshInstance3D:
		_meshes.append(n)
	for c in n.get_children():
		_collect(c)


func _play(clip: String, speed := 1.0) -> void:
	if anim == null:
		return
	if clip == "idle" and not awake and not dead and d.has("dormant_clip"):
		clip = d["dormant_clip"]                 # things that stand switched off until you are close
	var nm: String = d.get("clips", {}).get(clip, clip)
	if anim.has_animation(nm) and (anim.current_animation != nm or not anim.is_playing()):
		anim.play(nm, 0.15, speed)


func alert() -> void:
	if awake or dead:
		return
	awake = true
	LM.sound(d.get("sounds", {}).get("alert", ""), global_position)
	for a in level.actors:       # friends close by wake too
		if is_instance_valid(a) and a != self and not a.awake and not a.dead and a.global_position.distance_to(global_position) < 10.0:
			a.call_deferred("alert")


func hear(from: Vector3) -> void:
	if not awake and from.distance_to(global_position) < d.get("hearing", 18.0):
		alert()


func eye() -> Vector3:
	return global_position + Vector3(0, d.get("eye", d.get("height", 1.6) * 0.7) * (-1.0 if d.get("mount", "") == "ceiling" else 1.0), 0)


func _physics_process(dt: float) -> void:
	if _flash_t > 0.0:
		_flash_t -= dt
		if _flash_t <= 0.0:
			for m in _meshes:
				m.material_overlay = null
	if dead:
		return
	var pl := Game.player
	if pl == null or not is_instance_valid(pl) or pl.dead:
		_play("idle")
		return
	var to: Vector3 = pl.global_position - global_position
	var flat := Vector3(to.x, 0, to.z)
	var dist := flat.length()
	_see_t -= dt
	if _see_t <= 0.0:
		_see_t = 0.2
		_see = dist < d.get("sight", 24.0) * (1.0 if awake else 0.75) and level.los(eye(), pl.global_position + Vector3(0, 1.3, 0))
		if _see and not awake:
			var fwd := global_transform.basis.z
			if dist < 7.0 or fwd.dot(flat.normalized()) > 0.2:
				alert()
	for k in _cool.keys():
		_cool[k] -= dt
	if not awake:
		_idle(dt)
		return
	_bark(dt)
	# ---- an attack in progress
	if _atk != null:
		_atk_t += dt
		_turn_to(flat, dt, 6.0)
		if not _atk_done and _atk_t >= _atk.get("windup", 0.3):
			_strike(pl, dist)
		if _atk_t >= _atk.get("windup", 0.3) + _atk.get("recover", 0.35):
			_atk = null
		if not _atk or not _atk.get("moving", false):
			velocity.x = move_toward(velocity.x, 0, 30 * dt)
			velocity.z = move_toward(velocity.z, 0, 30 * dt)
			_fall(dt)
			move_and_slide()
			return
	else:
		var i := 0
		for a in d.get("attacks", []):
			i += 1
			if _cool.get(i, 0.0) > 0.0 or dist > a.get("range", 2.0) or dist < a.get("min_range", 0.0):
				continue
			if not _see and a.get("type", "melee") != "melee":
				continue
			if a.get("type", "melee") == "melee" and abs(to.y) > 2.5:
				continue
			_atk = a
			_atk_t = 0.0
			_atk_done = false
			_burst = int(a.get("burst", 1))
			_cool[i] = a.get("cooldown", 1.5) * randf_range(0.85, 1.2)
			_play("attack", a.get("anim_speed", 1.0))
			if anim:
				anim.seek(0.0)
			LM.sound(a.get("windup_sound", ""), global_position)
			break
	# ---- moving
	var want := Vector3.ZERO
	var speed: float = d.get("speed", 4.0)
	if _fixed:
		if _see:
			_turn_to(flat, dt, d.get("turn", 4.0))
		_play("walk" if _see else "idle")
		return
	if d.has("flee_below") and hp < max_hp * d["flee_below"]:
		if not _fled:
			_fled = true
			if d.has("flee_text"):
				Game.say(d["flee_text"], "warn")
		want = -flat.normalized() if _see else Vector3.ZERO
		speed *= 1.4
	elif d.get("behavior", "chaser") == "skirmisher" and _see:
		var keep: Array = d.get("keep", [6.0, 12.0])
		_strafe_t -= dt
		if _strafe_t <= 0.0:
			_strafe_t = randf_range(1.0, 2.6)
			_strafe = -_strafe if randf() < 0.6 else _strafe
		var side := flat.normalized().cross(Vector3.UP) * _strafe
		if dist < keep[0]:
			want = -flat.normalized() + side * 0.5
		elif dist > keep[1]:
			want = flat.normalized() + side * 0.3
		else:
			want = side
	elif _see and dist < 7.0:
		want = flat.normalized() if dist > d.get("radius", 0.5) + 0.9 else Vector3.ZERO
	else:
		_path_t -= dt
		if _path_t <= 0.0:
			_path_t = 0.45
			_path = level.path(global_position, pl.global_position)
		if _path.size() > 1:
			var next := _path[1]
			if Vector2(next.x - global_position.x, next.z - global_position.z).length() < 1.0 and _path.size() > 2:
				_path.remove_at(1)
				next = _path[1]
			want = Vector3(next.x - global_position.x, 0, next.z - global_position.z).normalized()
		elif _see:
			want = flat.normalized()
	want = want.normalized()
	velocity.x = move_toward(velocity.x, want.x * speed, d.get("accel", 30.0) * dt)
	velocity.z = move_toward(velocity.z, want.z * speed, d.get("accel", 30.0) * dt)
	_fall(dt)
	move_and_slide()
	var hv := Vector3(velocity.x, 0, velocity.z)
	if _see and (d.get("behavior", "") == "skirmisher" or dist < 5.0):
		_turn_to(flat, dt, 8.0)
	elif hv.length() > 0.4:
		_turn_to(hv, dt, 8.0)
	if _atk == null:
		if hv.length() > 0.5:
			_play("walk", clamp(hv.length() / max(0.1, d.get("speed", 4.0)), 0.5, 1.5) * d.get("walk_rate", 1.0))
		else:
			_play("idle")


func _fall(dt: float) -> void:
	if _fly or d.get("mount", "") == "ceiling":
		velocity.y = 0.0
	elif not is_on_floor():
		velocity.y -= 22.0 * dt
	else:
		velocity.y = 0.0


func _idle(dt: float) -> void:
	if _fixed or d.get("still", false) or e.get("still", false):
		_play("idle")
		return
	_wander_t -= dt
	if _wander_t <= 0.0:
		_wander_t = randf_range(2.0, 5.0)
		var a := randf() * TAU
		_wander = Vector3(cos(a), 0, sin(a)) if randf() < 0.5 else Vector3.ZERO
		if global_position.distance_to(_home) > 5.0:
			_wander = (_home - global_position).normalized()
			_wander.y = 0
	var sp: float = d.get("speed", 4.0) * 0.25
	velocity.x = move_toward(velocity.x, _wander.x * sp, 10 * dt)
	velocity.z = move_toward(velocity.z, _wander.z * sp, 10 * dt)
	_fall(dt)
	move_and_slide()
	if _wander != Vector3.ZERO:
		_turn_to(_wander, dt, 3.0)
		_play("walk", 0.5)
	else:
		_play("idle")


func _turn_to(dir: Vector3, dt: float, rate: float) -> void:
	if dir.length() < 0.01:
		return
	rotation.y = lerp_angle(rotation.y, atan2(dir.x, dir.z), clamp(rate * dt, 0.0, 1.0))


func _strike(pl: Node3D, dist: float) -> void:
	var a: Dictionary = _atk
	match a.get("type", "melee"):
		"melee":
			_atk_done = true
			LM.sound(a.get("sound", "swing"), global_position)
			if dist <= a.get("range", 2.0) + 0.7 and level.los(eye(), pl.global_position + Vector3(0, 1.0, 0)):
				pl.hurt(a.get("damage", 10.0), {"type": a.get("kind", "melee"), "from": global_position, "by": self, "knock": a.get("knock", 3.0)})
		"ranged":
			var from: Vector3 = global_position + global_transform.basis.z * (d.get("radius", 0.5) + 0.25) + Vector3(0, a.get("muzzle", d.get("eye", 1.2)) * (-1.0 if d.get("mount", "") == "ceiling" else 1.0), 0)
			var aim: Vector3 = pl.global_position + Vector3(0, 1.1, 0) + pl.velocity * a.get("lead", 0.0) * (from.distance_to(pl.global_position) / 30.0)
			var dir: Vector3 = (aim - from).normalized()
			var sp: float = deg_to_rad(a.get("spread", 2.0))
			dir = dir.rotated(Vector3.UP, randf_range(-sp, sp)).rotated(global_transform.basis.x, randf_range(-sp, sp))
			Projectile.launch(level, a.get("projectile", "bolt"), from, dir, a.get("damage", 8.0), self, false)
			Fx.flash(level, from, LM.col(LM.get_def("projectiles", a.get("projectile", "bolt")).get("color"), Color(1, 0.4, 0.2)), 2.5, 4.0)
			LM.sound(a.get("sound", "bolt"), global_position)
			_burst -= 1
			if _burst > 0:
				_atk_t = a.get("windup", 0.3) - a.get("burst_gap", 0.12)
			else:
				_atk_done = true


func _bark(dt: float) -> void:
	if not d.has("barks"):
		return
	_bark_t -= dt
	if _bark_t <= 0.0 and _see:
		_bark_t = randf_range(4.0, 9.0)
		var b: Array = d["barks"]
		Fx.words(level, eye() + Vector3(0, 0.6, 0), b[randi() % b.size()], LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))


func hurt(amount: float, info: Dictionary = {}) -> void:
	if dead:
		return
	amount *= d.get("takes", {}).get(info.get("type", ""), 1.0)
	amount *= (1.0 - d.get("armor", 0.0))
	hp -= amount
	awake = true
	_flash_t = 0.08
	for m in _meshes:
		m.material_overlay = _overlay
	var pt: Vector3 = info.get("point", eye())
	Fx.sparks(level, pt, LM.col(d.get("blood"), Color(1.0, 0.7, 0.3)), 8, 4.0)
	if hp <= 0.0:
		_die(info)
		return
	LM.sound(d.get("sounds", {}).get("hurt", "hit"), global_position, -3.0)
	if _atk == null and amount > max_hp * 0.12:
		_play("hurt")
		if anim:
			anim.seek(0.0)
	if info.has("from") and not _fixed:
		var k: Vector3 = (global_position - info["from"])
		k.y = 0
		velocity += k.normalized() * min(6.0, amount * 0.25) / d.get("mass", 1.0)


func _die(info: Dictionary) -> void:
	dead = true
	_atk = null
	collision_layer = 0
	collision_mask = 1
	velocity = Vector3.ZERO
	_play("die")
	LM.sound(d.get("sounds", {}).get("die", "die"), global_position)
	Game.stats["kills"] += 1
	var pos := global_position + Vector3(0, 0.3 if d.get("mount", "") != "ceiling" else -1.0, 0)
	if d.has("explode"):
		Fx.explode(level, eye(), d["explode"].get("radius", 3.0), d["explode"].get("damage", 20.0), Color(1.0, 0.5, 0.15), self)
	for dr in d.get("drops", []):
		if randf() < dr.get("chance", 1.0):
			var p := Pickup.new()
			level.add_child(p)
			p.global_position = Vector3(pos.x + randf_range(-0.6, 0.6), 1.0, pos.z + randf_range(-0.6, 0.6))
			p.setup(level, dr, level.kit_id)
	Game.run_effects(e.get("on_death"))
	level.actor_died(self)
	if info.get("type", "") == "blast" and d.get("gib", true):
		Fx.sparks(level, eye(), LM.col(d.get("blood"), Color(1, 0.5, 0.2)), 30, 8.0, 0.8, 0.12)
