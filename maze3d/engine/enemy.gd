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
const G := 22.0
var _cs: CollisionShape3D
var _surf := 0                    # 0 floor · 1 on a wall · 2 on the ceiling · 3 falling off · 4 on foot, heading for a wall
var _wall_n := Vector3.ZERO       # the wall's normal, pointing into the room
var _goal_up := false
var _approach := Vector3.ZERO
var _approach_t := 0.0
var _climb_t := 2.0
var _lounge: Dictionary = {}      # what it is doing instead of its job
var _puff_t := 2.0
var _stun := 0.0
var _face: Label3D                # a screen on the model that shows what it is saying
var _face_t := 0.0
var _skel: Skeleton3D
var _aim_i := -1                  # the bone that turns to face the player (a turret)
var _aim_j := -1                  # the bone that tips up and down (its gun)
var _aim_yaw := 0.0
var _aim_pitch := 0.0
var _wet := false                 # in fluid
var _gait_t := 0.0
var _gait_go := true
var _gait_ph := 0.0
var _leap := false
var _leap_t := 0.0
var _leap_hit := false


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
	_cs = cs
	if d.get("mount", "") == "ceiling":
		var c := lv.cell_of(position)
		position.y = lv.cell(c.x, c.y)["height"] * lv.H
	var path: String = d.get("model", "")
	vis = LM.spawn_scene(path if path.begins_with("res://") else "res://" + path, "" if d.get("own_materials", false) else d.get("kit", lv.kit_id))      # own_materials: a textured model keeps what it came with
	vis.scale = Vector3.ONE * d.get("scale", 1.0)
	add_child(vis)
	anim = LM.find_type(vis, "AnimationPlayer") as AnimationPlayer
	_collect(vis)
	_overlay = StandardMaterial3D.new()
	_overlay.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_overlay.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_overlay.albedo_color = Color(0.9, 0.5, 0.4)
	_home = position
	if d.has("aim"):
		_skel = LM.find_type(vis, "Skeleton3D") as Skeleton3D
		if _skel:
			_aim_i = _skel.find_bone(d["aim"].get("yaw_bone", ""))
			_aim_j = _skel.find_bone(d["aim"].get("pitch_bone", ""))
	if d.has("screen"):
		_make_face()
	vis.rotation.y = deg_to_rad(d.get("model_yaw", 0.0))      # models from elsewhere do not always face our way
	vis.position.y = d.get("model_y", 0.0)
	_climb_t = randf_range(1.0, 3.0)
	if not e.get("alert", false):
		if d.has("lounge") and e.get("lounge", "") != "none":
			_start_lounge.call_deferred()            # after the level's furniture is in
		elif d.has("climb"):
			_start_perch()
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


func _play(clip: String, speed := 1.0, loop := false) -> bool:
	if anim == null:
		return false
	if clip == "idle" and not awake and not dead:
		if not _lounge.is_empty():
			clip = _lounge.get("clip", "idle")       # off duty
			loop = true
		elif d.has("dormant_clip"):
			clip = d["dormant_clip"]                 # things that stand switched off until you are close
			loop = true
	if _wet and d.has("swim") and (clip == "walk" or clip == "idle") and not dead:
		clip = d["swim"].get("clip", "swim")         # in fluid it swims, moving or not
		loop = true
		if speed < 0.6:
			speed = 0.6
	var nm: String = d.get("clips", {}).get(clip, clip)
	if not anim.has_animation(nm):
		return false
	if loop or clip == "idle" or clip == "walk":     # clips made elsewhere rarely say that they loop
		anim.get_animation(nm).loop_mode = Animation.LOOP_LINEAR
	if anim.current_animation != nm or not anim.is_playing():
		anim.play(nm, 0.15, speed)
	return true


func alert() -> void:
	if awake or dead:
		return
	if not _lounge.is_empty():                       # caught slacking
		_lounge = {}
		_stun = d.get("startle_time", 0.55)
		_cs.position.y = d.get("center", d.get("height", 1.6) / 2)
		awake = true
		if not _play("startle"):
			_play("hurt")
		if anim:
			anim.seek(0.0)
		if d.has("startle_text"):
			Fx.words(level, eye() + Vector3(0, 0.6, 0), d["startle_text"], LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
	if _surf == 1:
		_goal_up = d.get("climb", {}).get("ceiling", true) and randf() < 0.6
	if d.has("dormant_clip") and _stun <= 0.0:       # powering up takes a moment
		awake = true
		if _play("startle"):
			_stun = d.get("startle_time", 1.0)
			anim.seek(0.0)
	awake = true
	LM.sound(d.get("sounds", {}).get("alert", ""), global_position)
	for a in level.actors:       # friends close by wake too
		if is_instance_valid(a) and a != self and not a.awake and not a.dead and a.global_position.distance_to(global_position) < 10.0:
			a.call_deferred("alert")


func hear(from: Vector3) -> void:
	if not awake and from.distance_to(global_position) < d.get("hearing", 18.0):
		alert()


func eye() -> Vector3:
	if _surf == 1 or _surf == 2:
		return global_position + global_transform.basis.y * d.get("eye", d.get("height", 1.6) * 0.7)
	return global_position + Vector3(0, d.get("eye", d.get("height", 1.6) * 0.7) * (-1.0 if d.get("mount", "") == "ceiling" else 1.0), 0)


func _physics_process(dt: float) -> void:
	if _flash_t > 0.0:
		_flash_t -= dt
		if _flash_t <= 0.0:
			for m in _meshes:
				m.material_overlay = null
	if dead:
		if _surf != 0:                               # shot off the wall: what is left comes down
			_fall_tick(dt, Vector3.ZERO)
		return
	_wet = _surf == 0 and level.fluid_at(global_position)
	if _fly and d.has("bob"):                        # a flyer that will not hold its height
		vis.position.y = d.get("model_y", 0.0) + sin(Time.get_ticks_msec() * 0.001 * d["bob"].get("rate", 5.0) + get_index()) * d["bob"].get("height", 0.2) * (1.0 if awake else 0.35)
	if _face and not awake:
		_face_t -= dt
		if _face_t <= 0.0:
			_face_t = randf_range(2.5, 5.0)
			var il: Array = d["screen"].get("idle", ["..."])
			_show(il[randi() % il.size()])
	if d.has("swim"):                                # a swimmer rides low in it
		vis.position.y = move_toward(vis.position.y, d.get("model_y", 0.0) - (d["swim"].get("sink", 0.0) if _wet else 0.0), dt * 1.5)
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
		_see = not Game.calm and dist < (d.get("sight", 24.0) if awake else d.get("wake_sight", d.get("sight", 24.0) * 0.75)) and level.los(eye(), pl.global_position + Vector3(0, 1.3, 0))
		if _see and not awake:
			var fwd := global_transform.basis.z
			if dist < 7.0 or _surf != 0 or d.has("dormant_clip") or fwd.dot(flat.normalized()) > 0.2:      # from a wall they see the whole room
				alert()
	for k in _cool.keys():
		_cool[k] -= dt
	if not awake:
		_idle(dt)
		return
	if _stun > 0.0:                                  # startled, or picking itself up after a leap
		_stun -= dt
		velocity.x = move_toward(velocity.x, 0, 30 * dt)
		velocity.z = move_toward(velocity.z, 0, 30 * dt)
		_fall(dt)
		move_and_slide()
		return
	_bark(dt)
	if _aim_i >= 0:
		_aim_tick(dt, pl)
	# ---- an attack in progress
	if _atk != null and _atk.get("type", "") == "pounce":
		_pounce_tick(dt, pl, to, dist)
		return
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
			if a.get("type", "melee") == "pounce":
				if _surf == 0 and not is_on_floor() or _surf >= 3 or dist < a.get("min_range", 3.0):
					continue
			elif _surf >= 1 and _surf <= 3:
				continue                                 # on a wall it can only jump off
			if a.get("type", "melee") == "melee" and abs(to.y) > 2.5:
				continue
			_atk = a
			_atk_t = 0.0
			_atk_done = false
			_burst = int(a.get("burst", 1))
			_cool[i] = a.get("cooldown", 1.5) * randf_range(0.85, 1.2)
			if a.get("type", "melee") == "pounce":
				_leap = false
				if not _play("pounce", a.get("clip_windup", 0.3) / maxf(0.05, a.get("windup", 0.4))):
					_play("attack")
			else:
				_play("attack", a.get("anim_speed", 1.0))
			if anim:
				anim.seek(0.0)
			LM.sound(a.get("windup_sound", ""), global_position)
			if a.has("say") and randf() < a.get("say_chance", 0.6):      # what it shouts as it does it
				var sa: Array = a["say"]
				Fx.words(level, eye() + Vector3(0, 0.6, 0), sa[randi() % sa.size()], LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
			break
		if _atk != null and _atk.get("type", "") == "pounce":
			return
	if _surf != 0:
		_climb_tick(dt, pl, flat, dist)
		return
	if d.has("climb") and _atk == null and not _fixed:   # on the floor, thinking about the walls
		_climb_t -= dt
		if _climb_t <= 0.0:
			_climb_t = randf_range(3.0, 6.0)
			var cl: Dictionary = d["climb"]
			if dist > cl.get("min_dist", 7.0) and randf() < cl.get("chance", 0.5) and is_on_floor() and not _wet:
				var c := level.cell_of(global_position)
				var walls := _walls(c)
				if not walls.is_empty():
					var dv: Vector3 = walls[randi() % walls.size()]
					_approach = level.center(c) + dv * (level.C / 2 - cl.get("off", 0.3))
					_approach_t = 2.0
					_wall_n = -dv
					_surf = 4
					return
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
	if _wet:
		speed = d["swim"].get("speed", speed) if d.has("swim") else speed * 0.6
	if d.has("gait"):
		speed *= _gait(dt)
		var wv: float = d["gait"].get("weave", 0.0)
		if wv > 0.0 and dist > 3.0:
			want = want.rotated(Vector3.UP, sin(_gait_ph * d["gait"].get("weave_rate", 9.0)) * wv)
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
	if not _lounge.is_empty():
		_play("idle")
		if _lounge.has("says") and Game.player and global_position.distance_to(Game.player.global_position) < 16.0:
			_bark_t -= dt
			if _bark_t <= 0.0:
				_bark_t = randf_range(5.0, 10.0)
				var sy: Array = _lounge["says"]
				Fx.words(level, eye() + Vector3(0, 0.6, 0), sy[randi() % sy.size()], LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
		if _lounge.get("smoke", false):
			_puff_t -= dt
			if _puff_t <= 0.0:
				_puff_t = _lounge.get("every", 6.0)
				Fx.sparks(level, eye() + global_transform.basis.z * 0.5, Color(0.7, 0.7, 0.72), 7, 0.5, 2.2, 0.07, -0.5)
		return
	if _fixed or _surf != 0 or d.get("still", false) or e.get("still", false):
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
	if _aim_i >= 0:                                  # the head does the looking; the body follows when it gets round to it
		rate *= d["aim"].get("body_turn", 0.25)
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
			var fwd3: Vector3 = global_transform.basis.z
			if _aim_i >= 0:                              # it fires where the turret points, not where the body does
				fwd3 = Vector3(pl.global_position.x - global_position.x, 0, pl.global_position.z - global_position.z).normalized()
			var from: Vector3 = global_position + fwd3 * (d.get("radius", 0.5) + 0.25) + Vector3(0, a.get("muzzle", d.get("eye", 1.2)) * (-1.0 if d.get("mount", "") == "ceiling" else 1.0), 0)
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
		var line: String = b[randi() % b.size()]
		_show(line)
		Fx.words(level, eye() + Vector3(0, 0.6, 0), line, LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
		LM.sound(d.get("sounds", {}).get("bark", ""), global_position)


func hurt(amount: float, info: Dictionary = {}) -> void:
	if dead:
		return
	amount *= d.get("takes", {}).get(info.get("type", ""), 1.0)
	amount *= (1.0 - d.get("armor", 0.0))
	hp -= amount
	if not awake:
		alert()
	awake = true
	if (_surf == 1 or _surf == 2) and hp > 0.0 and (amount > max_hp * 0.25 or randf() < 0.4):
		_drop()                                      # knocked off
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
	_leap = false
	_lounge = {}
	if _surf == 1 or _surf == 2:
		_surf = 3
	elif _surf == 4:
		_surf = 0
	collision_layer = 0
	collision_mask = 1
	velocity = Vector3.ZERO if _surf == 0 else _wall_n * 1.5
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


# ------------------------------------------------------------------ off duty (defs: "lounge")
## "lounge": [{"clip": "lean", "at": "wall"}, {"clip": "sit", "at": "floor", "drop": -0.6}, {"clip": "smoke", "at": "wall", "smoke": true}]
## One is picked when the level is built (or the level names one: {"actor": "monoid", "lounge": "sit"}).
## "at": "wall" backs it up against a wall of its cell. "drop" moves what can be shot to where the body now is.
func _start_lounge() -> void:
	var want: String = e.get("lounge", "")
	var c := level.cell_of(position)
	var walls := _walls(c)
	var pool: Array = []
	for o in d["lounge"]:
		if want != "" and o.get("clip", "") != want:
			continue
		if o.get("at", "floor") == "wall" and walls.is_empty():
			continue
		pool.append(o)
	if pool.is_empty():
		return
	_lounge = pool[randi() % pool.size()]
	if _lounge.get("at", "floor") == "screen":       # find something to watch
		var best: Node3D = null
		var best_d: float = _lounge.get("reach", 14.0)
		for n in level.get_children():
			if not (n is Node3D) or not ("meta" in n) or not ("e" in n):
				continue
			var pid: String = n.e.get("prop", "")
			if not (n.meta.has("screen") or pid in _lounge.get("props", [])):
				continue
			var dd: float = n.position.distance_to(position)
			var spot: Vector3 = n.position + n.global_transform.basis.z * _lounge.get("stand", 2.2)
			var sc := level.cell_of(spot)
			if dd < best_d and not level.cell(sc.x, sc.y)["solid"] and level.cell(sc.x, sc.y)["door"] == "":
				best = n
				best_d = dd
		if best == null:                             # nothing on: stare at a wall instead, or give up
			var others: Array = pool.filter(func(o): return o.get("at", "floor") != "screen")
			if others.is_empty():
				_lounge = {}
				return
			_lounge = others[randi() % others.size()]
		else:
			var f: Vector3 = best.global_transform.basis.z
			position = best.position + f * _lounge.get("stand", 2.2)
			position.y = 0.0
			rotation.y = atan2(-f.x, -f.z)
	if _lounge.get("at", "floor") == "wall":
		var dv: Vector3 = walls[randi() % walls.size()]
		if e.has("face"):                            # the level can say which wall
			var f: Vector3 = Vector3(Level.DIRS[Level.DIR_NAMES.get(e["face"], 0)].x, 0, Level.DIRS[Level.DIR_NAMES.get(e["face"], 0)].y)
			if walls.has(-f):
				dv = -f
		position = level.center(c) + dv * (level.C / 2 - d.get("radius", 0.5) - _lounge.get("gap", 0.25))
		rotation.y = atan2(-dv.x, -dv.z)             # back to the wall
		if _lounge.get("look", "out") == "in":       # or nose to it
			rotation.y = atan2(dv.x, dv.z)
	_home = position
	_cs.position.y += _lounge.get("drop", 0.0)
	_puff_t = randf_range(1.0, 5.0)
	_play("idle")


func _walls(c: Vector2i) -> Array:
	var out: Array = []
	for i in 4:
		var n: Vector2i = c + Level.DIRS[i]
		if level.cell(n.x, n.y)["solid"]:
			out.append(Vector3(Level.DIRS[i].x, 0, Level.DIRS[i].y))
	return out


# ------------------------------------------------------------------ pouncing (an attack of "type": "pounce")
## {"type": "pounce", "range": 11, "min_range": 3.5, "windup": 0.45, "speed": 17, "damage": 16, "knock": 8,
##  "recover": 0.35, "recover_miss": 0.9, "cooldown": 3.5}
## It gathers itself for `windup` (the tell), then is thrown at where the player will be and cannot steer.
## A miss leaves it sprawled for `recover_miss`: that is the player's opening. Works from a wall or the ceiling too.
func _pounce_tick(dt: float, pl: Node3D, to: Vector3, dist: float) -> void:
	var a: Dictionary = _atk
	_atk_t += dt
	if not _leap:
		velocity.x = move_toward(velocity.x, 0, 40 * dt)
		velocity.z = move_toward(velocity.z, 0, 40 * dt)
		if _surf == 0:
			_turn_to(Vector3(to.x, 0, to.z), dt, 10.0)
			_fall(dt)
			move_and_slide()
		if _atk_t >= a.get("windup", 0.4):
			_leap = true
			_leap_t = 0.0
			_leap_hit = false
			if _surf != 0:                             # letting go of the wall
				_let_go()
				_surf = 0
				basis = Basis(Vector3.UP, atan2(to.x, to.z))
			var t: float = clamp(dist / a.get("speed", 16.0), 0.28, 1.3)
			var aim: Vector3 = pl.global_position + Vector3(0, 0.4, 0) + Vector3(pl.velocity.x, 0, pl.velocity.z) * t * a.get("lead", 0.6)
			var dv: Vector3 = aim - global_position
			velocity = Vector3(dv.x / t, dv.y / t + 0.5 * G * t, dv.z / t)
			LM.sound(a.get("sound", "swing"), global_position)
		return
	_leap_t += dt
	velocity.y -= G * dt
	move_and_slide()
	var hv := Vector3(velocity.x, 0, velocity.z)
	if hv.length() > 1.0:
		rotation.y = atan2(hv.x, hv.z)
		vis.rotation.x = clamp(-atan2(velocity.y, hv.length()) * 0.6, -0.7, 0.7)
	if not _leap_hit and global_position.distance_to(pl.global_position + Vector3(0, 0.8, 0)) < d.get("radius", 0.5) + 1.1:
		_leap_hit = true
		pl.hurt(a.get("damage", 12.0), {"type": a.get("kind", "melee"), "from": global_position, "by": self, "knock": a.get("knock", 6.0)})
		LM.sound(a.get("hit_sound", "bite"), global_position)
		velocity.x *= 0.2
		velocity.z *= 0.2
	if (_leap_t > 0.1 and is_on_floor()) or (_leap_t > 0.15 and is_on_wall() and not _leap_hit) or _leap_t > 2.5:
		_leap = false
		_atk = null
		vis.rotation.x = 0.0
		_stun = a.get("recover", 0.35) if _leap_hit else a.get("recover_miss", 0.9)
		velocity = Vector3.ZERO
		_play("hurt" if not _leap_hit else "idle")
		Fx.sparks(level, global_position + Vector3(0, 0.1, 0), Color(0.5, 0.5, 0.45), 6, 2.5, 0.3, 0.04)


# ------------------------------------------------------------------ walls and ceilings (defs: "climb")
## "climb": {"speed": 6, "ceiling": true, "perch": 0.5, "chance": 0.5, "min_dist": 7, "drop_at": 1.8, "drop_damage": 8, "off": 0.3}
## perch: how often one starts a level waiting on a wall or the ceiling (a level entry can say "perch": "wall" / "ceiling" / "floor").
## chance: how often, while hunting on foot and still min_dist away, it takes to the nearest wall instead.
## On the ceiling it follows the same route it would walk, and lets go above the player, at a door, or where the ceiling changes height.
func _start_perch() -> void:
	var cl: Dictionary = d["climb"]
	var where: String = e.get("perch", "")
	if where == "":
		if randf() > cl.get("perch", 0.5):
			return
		where = "ceiling" if cl.get("ceiling", true) and randf() < 0.5 else "wall"
	var c := level.cell_of(position)
	if level.cell(c.x, c.y)["door"] != "":
		return
	if where == "ceiling":
		_surf = 2
		position.y = _ceil_y(c) - cl.get("off", 0.3)
		basis = _facing(Vector3.DOWN, Vector3(sin(rotation.y), 0, cos(rotation.y)))
	elif where == "wall":
		var walls := _walls(c)
		if walls.is_empty():
			return
		var dv: Vector3 = walls[randi() % walls.size()]
		_wall_n = -dv
		position = level.center(c) + dv * (level.C / 2 - cl.get("off", 0.3))
		position.y = randf_range(1.3, maxf(1.5, _ceil_y(c) - 1.2))
		_surf = 1
		basis = _facing(_wall_n, Vector3.DOWN)       # head down, the way they wait


func _ceil_y(c: Vector2i) -> float:
	return level.cell(c.x, c.y)["height"] * level.H


func _facing(up: Vector3, fwd: Vector3) -> Basis:
	var z := (fwd - up * fwd.dot(up))
	if z.length() < 0.01:
		z = up.cross(Vector3.RIGHT) if absf(up.x) < 0.9 else up.cross(Vector3.FORWARD)
	z = z.normalized()
	return Basis(up.cross(z).normalized(), up, z)


func _orient(up: Vector3, fwd: Vector3, k: float) -> void:
	basis = basis.orthonormalized().slerp(_facing(up, fwd), clamp(k, 0.0, 1.0))


func _drop() -> void:
	if _surf == 1:
		velocity = _wall_n * 2.5
	else:
		velocity = Vector3.ZERO
	_let_go()
	_surf = 3


## Clear of the surface, so that the body it is about to turn upright has room to turn in.
func _let_go() -> void:
	if _surf == 1:
		position += _wall_n * (d.get("radius", 0.5) + 0.15)
	elif _surf == 2:
		position.y -= maxf(d.get("height", 1.0), d.get("radius", 0.5) * 2.0) + 0.15


func _fall_tick(dt: float, flat: Vector3) -> void:
	velocity.y -= G * dt
	velocity.x = move_toward(velocity.x, 0, 4 * dt)
	velocity.z = move_toward(velocity.z, 0, 4 * dt)
	move_and_slide()
	var f := flat if flat.length() > 0.1 else Vector3(basis.z.x, 0, basis.z.z)
	_orient(Vector3.UP, f if f.length() > 0.05 else Vector3.BACK, 9 * dt)
	if is_on_floor() or position.y <= 0.02:
		_surf = 0
		var z := Vector3(basis.z.x, 0, basis.z.z)
		basis = Basis(Vector3.UP, atan2(z.x, z.z))
		velocity = Vector3.ZERO
		_climb_t = randf_range(4.0, 8.0)
		if not dead:
			var pl := Game.player
			var dmg: float = d.get("climb", {}).get("drop_damage", 0.0)
			if dmg > 0.0 and pl and global_position.distance_to(pl.global_position) < d.get("radius", 0.5) + 1.2:
				pl.hurt(dmg, {"type": "melee", "from": global_position, "by": self, "knock": 3.0})
			Fx.sparks(level, global_position + Vector3(0, 0.1, 0), Color(0.5, 0.5, 0.45), 6, 2.5, 0.3, 0.04)
			LM.sound("step", global_position)


func _climb_tick(dt: float, pl: Node3D, flat: Vector3, dist: float) -> void:
	var cl: Dictionary = d.get("climb", {})
	var sp: float = cl.get("speed", d.get("speed", 5.0))
	var off: float = cl.get("off", 0.3)
	var c := level.cell_of(global_position)
	var rate: float = d.get("walk_rate", 1.0)
	match _surf:
		1:
			var top := _ceil_y(c) - off
			if _goal_up:
				position.y += sp * dt
				_orient(_wall_n, Vector3.UP, 10 * dt)
				if position.y >= top:
					position.y = top
					if cl.get("ceiling", true):
						_surf = 2
					else:
						_goal_up = false
			else:
				position.y -= sp * dt
				_orient(_wall_n, Vector3.DOWN, 10 * dt)
				if position.y <= 0.5:
					_drop()
			_play("walk", rate)
		2:
			if dist < cl.get("drop_at", 1.8):
				_drop()
				return
			var want := Vector3.ZERO
			_path_t -= dt
			if _path_t <= 0.0:
				_path_t = 0.4
				_path = level.path(global_position, pl.global_position)
			if _path.size() > 1:
				var next := _path[1]
				var gap := Vector3(next.x - position.x, 0, next.z - position.z)
				if gap.length() < 1.0 and _path.size() > 2:
					_path.remove_at(1)
					next = _path[1]
					gap = Vector3(next.x - position.x, 0, next.z - position.z)
				var nc := level.cell_of(next)
				var there := level.cell(nc.x, nc.y)
				if nc != c and (there["door"] != "" or there["height"] != level.cell(c.x, c.y)["height"]):
					if gap.length() < level.C * 0.8:     # a door, or the ceiling steps: down and on foot
						_drop()
						return
				want = gap.normalized()
			else:
				want = flat.normalized()
			position += want * sp * (_gait(dt) if d.has("gait") else 1.0) * dt
			position.y = _ceil_y(c) - off
			if want.length() > 0.1:
				_orient(Vector3.DOWN, want, 8 * dt)
			_play("walk", rate)
		3:
			_fall_tick(dt, flat)
		4:
			_approach_t -= dt
			var gap2 := Vector3(_approach.x - position.x, 0, _approach.z - position.z)
			if gap2.length() < 0.35:
				position = Vector3(_approach.x, maxf(position.y, 0.3), _approach.z)
				velocity = Vector3.ZERO
				_surf = 1
				_goal_up = true
			elif _approach_t <= 0.0:
				_surf = 0
			else:
				var w := gap2.normalized() * sp
				velocity.x = w.x
				velocity.z = w.z
				_fall(dt)
				move_and_slide()
				_turn_to(gap2, dt, 10.0)
				_play("walk", rate)


## "gait": {"burst": [0.25, 0.7], "pause": [0.04, 0.16], "fast": 1.3, "weave": 0.35, "weave_rate": 9}
## Scuttling: it goes in darts with dead stops between, and does not come straight at you.
func _gait(dt: float) -> float:
	var g: Dictionary = d["gait"]
	_gait_ph += dt
	_gait_t -= dt
	if _gait_t <= 0.0:
		_gait_go = not _gait_go
		var r: Array = g.get("burst", [0.25, 0.7]) if _gait_go else g.get("pause", [0.04, 0.16])
		_gait_t = randf_range(r[0], r[1])
	return g.get("fast", 1.3) if _gait_go else 0.0


# ------------------------------------------------------------------ a head that turns on its own (defs: "aim")
## "aim": {"yaw_bone": "turret", "pitch_bone": "gun", "speed": 5, "pitch": [-30, 35], "body_turn": 0.25}
## Once awake, yaw_bone is turned about the vertical to face the player whichever way the body is going (all the way
## round), and pitch_bone tips to their height. The body turns at body_turn of its usual rate. Clips must not key those
## two bones, except the ones played while it is not aiming (dormant, startle, die).
func _aim_tick(dt: float, pl: Node3D) -> void:
	var a: Dictionary = d["aim"]
	var sb := _skel.global_transform.basis.orthonormalized()
	var to: Vector3 = sb.inverse() * (pl.global_position + Vector3(0, 1.0, 0) - eye())
	var k: float = clamp(a.get("speed", 5.0) * dt, 0.0, 1.0)
	_aim_yaw = lerp_angle(_aim_yaw, atan2(to.x, to.z), k)
	var axis: Vector3 = (_skel.get_bone_global_rest(_aim_i).basis.orthonormalized().inverse() * Vector3.UP).normalized()
	_skel.set_bone_pose_rotation(_aim_i, _skel.get_bone_rest(_aim_i).basis.get_rotation_quaternion() * Quaternion(axis, _aim_yaw))
	if _aim_j >= 0:
		var lim: Array = a.get("pitch", [-30, 35])
		var want: float = clamp(atan2(to.y, Vector2(to.x, to.z).length()), deg_to_rad(lim[0]), deg_to_rad(lim[1]))
		_aim_pitch = lerp(_aim_pitch, want, k)
		var ax2: Vector3 = (_skel.get_bone_global_rest(_aim_j).basis.orthonormalized().inverse() * Vector3.RIGHT).normalized()
		_skel.set_bone_pose_rotation(_aim_j, _skel.get_bone_rest(_aim_j).basis.get_rotation_quaternion() * Quaternion(ax2, -_aim_pitch))


# ------------------------------------------------------------------ a screen for a face (defs: "screen")
## "screen": {"bone": "body", "at": [0, 0.72, 0.3], "width": 0.2, "height": 0.11, "color": [..], "bg": [..], "idle": ["...", ">:("]}
## A panel of text fixed to a bone of the model, at `at` in the model's own units (x, up, forward) and that size. It shows
## each bark as it is shouted (and one of `idle` while the thing has not noticed anybody). Text shrinks to fit.
func _make_face() -> void:
	var sc: Dictionary = d["screen"]
	var sk := LM.find_type(vis, "Skeleton3D") as Skeleton3D
	if sk == null:
		return
	var bi := sk.find_bone(sc.get("bone", ""))
	var holder: Node3D
	var at := Vector3(sc["at"][0], sc["at"][1], sc["at"][2])
	if bi >= 0:
		var ba := BoneAttachment3D.new()
		sk.add_child(ba)
		ba.bone_idx = bi
		holder = Node3D.new()
		ba.add_child(holder)
		holder.transform = sk.get_bone_global_rest(bi).affine_inverse() * Transform3D(Basis(), at)
	else:
		holder = Node3D.new()
		sk.add_child(holder)
		holder.position = at
	var w: float = sc.get("width", 0.2)
	var h: float = sc.get("height", 0.11)
	var bg := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(w, h)
	bg.mesh = q
	var bm := StandardMaterial3D.new()
	bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	bm.albedo_color = LM.col(sc.get("bg"), Color(0.02, 0.03, 0.08))
	bg.material_override = bm
	holder.add_child(bg)
	_face = Label3D.new()
	_face.pixel_size = w / 300.0                     # the panel is 300 pixels across
	_face.width = 284.0
	_face.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_face.modulate = LM.col(sc.get("color"), Color(1.0, 0.25, 0.3))
	_face.outline_size = 0
	_face.shaded = false
	_face.double_sided = false
	_face.position = Vector3(0, 0, 0.004)
	_face.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	holder.add_child(_face)
	_face_t = randf_range(0.0, 2.0)


func _show(line: String) -> void:
	if _face == null:
		return
	_face.text = line
	var n := line.length()
	_face.font_size = 64 if n <= 8 else (40 if n <= 18 else (27 if n <= 40 else (20 if n <= 70 else 15)))
