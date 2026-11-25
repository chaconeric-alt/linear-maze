extends Node
## ActorAttacks - what it does to its target (defs: "attacks", a list tried in order; and "touch").
##   {"type": "melee",  "range": 2, "damage": 10, "windup": 0.3, "recover": 0.35, "cooldown": 1.5, "knock": 3, "clip": .., "say": [..]}
##   {"type": "ranged", "range": 20, "projectile": "bolt", "damage": 8, "burst": 1, "burst_gap": 0.12, "spread": 2, "lead": 0, "muzzle": 1.2}
##   {"type": "pounce", "range": 11, "min_range": 3.5, "windup": 0.45, "speed": 17, "damage": 16, "knock": 8,
##    "recover": 0.35, "recover_miss": 0.9, "cooldown": 3.5}
##   {"type": "grapple", "clip": "grapple", "range": 2.4, "windup": 0.5, "hold": 1.6, "damage": 6, "dps": 12, "throw": 13,
##    "throw_damage": 10, "break": 40, "miss_at": 2.3, "recover": 0.6, "cooldown": 8}
##   "touch": {"dps": 12, "kind": "acid", "reach": 0.3}: its skin burns, and being near enough to be brushed is enough.
## An attack has a windup (the tell), strikes, and recovers; "moving": true lets it keep moving meanwhile.
class_name ActorAttacks

var a: Actor
var d: Dictionary
var _atk: Variant = null          # the attack in progress
var _atk_t := 0.0
var _atk_done := false
var _atk_hold := 0.0              # how long this shot has been held back, waiting for the gun to come round
var _burst := 0
var _cool: Dictionary = {}
var _leap := false
var _leap_t := 0.0
var _leap_hit := false
var _grab_t := 0.0                # how much longer it will hold the target (an attack of "type": "grapple")
var _grab_tick_t := 0.0
var _grab_hp := 0.0
var _touch_t := 0.0


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


## An attack is under way (its own, or one of ActorMoves').
func busy() -> bool:
	return _atk != null or (a.moves != null and a.moves.busy())


## It has hold of somebody.
func holding() -> bool:
	return _grab_t > 0.0


func leaping() -> bool:
	return _leap


func attack_type() -> String:
	return _atk.get("type", "melee") if _atk != null else "-"


func cool(dt: float) -> void:
	for k in _cool.keys():
		_cool[k] -= dt


## Killed, or sent away: whatever it was doing stops.
func drop_attack() -> void:
	_atk = null
	_leap = false
	if a.moves:
		a.moves.stop()


## Forget the attack it was in (sent to show what it does).
func forget() -> void:
	_atk = null


func release_if_holding() -> void:
	if _grab_t > 0.0:
		_let_go(false)


## Its skin burns: being near enough to be brushed is enough.
func touch_tick(dt: float) -> void:
	if not d.has("touch"):
		return
	_touch_t -= dt
	if _touch_t > 0.0:
		return
	_touch_t = 0.25
	var tp := a.target()
	if tp and is_instance_valid(tp) and not tp.dead and not a.off_duty and absf(tp.global_position.y - a.global_position.y) < d.get("height", 1.6):
		var td := Vector2(tp.global_position.x - a.global_position.x, tp.global_position.z - a.global_position.z).length()
		if td < d.get("radius", 0.5) + 0.45 + d["touch"].get("reach", 0.3):
			tp.hurt(d["touch"].get("dps", 12.0) * 0.25, {"type": d["touch"].get("kind", "acid"), "from": a.global_position, "by": a})


## One hunting tick of attacking: holding on, leaping, an attack under way, or choosing one. False when that took the
## whole tick (it stands, or flies through the air); true when it may go on to climb or move.
func tick(dt: float, pl: Node3D, to: Vector3, flat: Vector3, dist: float) -> bool:
	if _grab_t > 0.0:                                # it has hold of them
		_grab_tick(dt, pl)
		return false
	if a.moves and a.moves.busy():                   # a beam, a latch, a charge, a burst
		return a.moves.tick(dt, pl, to, flat, dist)
	if _atk != null and _atk.get("type", "") == "pounce":
		_pounce_tick(dt, pl, to, dist)
		return false
	if _atk != null:
		return _under_way(dt, pl, flat, dist)
	_choose(pl, to, dist)
	return not (_atk != null and _atk.get("type", "") == "pounce") and not (a.moves and a.moves.busy())


## Wind up, strike (a turret holds the shot until its gun is on them), recover.
func _under_way(dt: float, pl: Node3D, flat: Vector3, dist: float) -> bool:
	_atk_t += dt
	a.move.turn_to(flat, dt, 6.0)
	if not _atk_done and _atk_t >= _atk.get("windup", 0.3):
		var rig := a.aim
		if rig and rig.active() and _atk.get("type", "melee") == "ranged" and _burst == int(_atk.get("burst", 1)) \
				and rig.off(pl) > deg_to_rad(d["aim"].get("aligned", 6.0)):
			_atk_hold += dt                          # the gun is not on them: it holds the shot until it is
			if a.anim:
				a.anim.speed_scale = 0.0             # ... and the clip waits with it, so the kick still comes with the shot
			if _atk_hold > d["aim"].get("hold", 1.5):    # ... and if it cannot get there, it does not fire at all
				_cool[d["attacks"].find(_atk) + 1] = 0.4
				_atk = null
		else:
			if a.anim:
				a.anim.speed_scale = 1.0
			_strike(pl, dist)
	if _atk != null and _atk_t >= _atk.get("windup", 0.3) + _atk.get("recover", 0.35) + _atk_hold:
		_atk = null
	if not _atk or not _atk.get("moving", false):
		a.velocity.x = move_toward(a.velocity.x, 0, 30 * dt)
		a.velocity.z = move_toward(a.velocity.z, 0, 30 * dt)
		a.move.fall(dt)
		a.move_and_slide()
		return false
	return true


## The first attack in the list that is ready, in range, and possible from where it is.
func _choose(pl: Node3D, to: Vector3, dist: float) -> void:
	var see: bool = a.senses.see
	var rig := a.aim
	var i := 0
	for at in d.get("attacks", []):
		i += 1
		var kind: String = at.get("type", "melee")
		if _cool.get(i, 0.0) > 0.0 or dist > at.get("range", 2.0) or dist < at.get("min_range", 0.0):
			continue
		if (not see or not a.senses.shot) and kind != "melee":
			continue
		if rig and rig.active() and kind != "melee" and rig.off(pl) > deg_to_rad(d["aim"].get("aligned", 6.0)):
			continue                                 # the gun has not come round to them yet
		if kind == "pounce":
			if a.surf == 0 and not a.is_on_floor() or a.surf >= 3 or dist < at.get("min_range", 3.0):
				continue
		elif a.surf >= 1 and a.surf <= 3:
			continue                                 # on a wall it can only jump off
		if kind == "melee" and abs(to.y) > 2.5:
			continue
		_begin(at, i)
		break


func _begin(at: Dictionary, i: int) -> void:
	if ActorMoves.KINDS.has(at.get("type", "")):
		_cool[i] = at.get("cooldown", 3.0) * a.rng.randf_range(0.85, 1.2)
		a.moves.begin(at)
		return
	_atk = at
	_atk_t = 0.0
	_atk_hold = 0.0
	_atk_done = false
	_burst = int(at.get("burst", 1))
	_cool[i] = at.get("cooldown", 1.5) * a.rng.randf_range(0.85, 1.2)
	if at.get("type", "melee") == "pounce":
		_leap = false
		if not a.play("pounce", at.get("clip_windup", 0.3) / maxf(0.05, at.get("windup", 0.4))):
			a.play("attack")
	else:
		if not a.play(at.get("clip", "attack"), at.get("anim_speed", 1.0)):      # an attack can have a clip of its own
			a.play("attack", at.get("anim_speed", 1.0))
	if a.anim:
		a.anim.seek(0.0)
	LM.sound(at.get("windup_sound", ""), a.global_position)
	if at.has("say") and randf() < at.get("say_chance", 0.6):      # what it shouts as it does it
		var sa: Array = at["say"]
		Fx.words(a.level, a.eye() + Vector3(0, 0.6, 0), sa[randi() % sa.size()], LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))


func _strike(pl: Node3D, dist: float) -> void:
	var at: Dictionary = _atk
	match at.get("type", "melee"):
		"melee":
			_atk_done = true
			LM.sound(at.get("sound", "swing"), a.global_position)
			if dist <= at.get("range", 2.0) + 0.7 and _reaches(pl):
				pl.hurt(at.get("damage", 10.0), _hit_info(at, {"type": at.get("kind", "melee"), "from": a.global_position, "by": a, "knock": at.get("knock", 3.0)}))
		"grapple":
			_grapple(at, pl, dist)
		"ranged":
			_shoot(at, pl)


## A blow's hurt: what it leaves behind ("afflict"), and the health a drinker ("drain": a share of the blow) takes back.
func _hit_info(at: Dictionary, info: Dictionary) -> Dictionary:
	if at.has("afflict"):
		info["afflict"] = at["afflict"]
	if d.has("drain"):
		a.hp = minf(a.max_hp, a.hp + float(at.get("damage", 10.0)) * float(d["drain"]))
	return info


func _grapple(at: Dictionary, pl: Node3D, dist: float) -> void:
	_atk_done = true
	LM.sound(at.get("sound", "clang"), a.global_position)
	if not "held_by" in pl:                          # another monster (factions) cannot be held: it is struck
		if dist <= at.get("range", 2.4) + 0.6 and _reaches(pl):
			pl.hurt(at.get("damage", 6.0), {"type": "crush", "from": a.global_position, "by": a})
		return
	if dist <= at.get("range", 2.4) + 0.6 and absf(pl.global_position.y - a.global_position.y) < 2.0 and pl.held_by == null \
			and _reaches(pl):
		_grab_t = at.get("hold", 1.6)
		_grab_tick_t = 0.0
		_grab_hp = a.hp
		pl.held_by = a
		pl.hurt(at.get("damage", 6.0), {"type": "crush", "by": a})
		Fx.words(a.level, a.eye() + Vector3(0, 0.6, 0), at.get("text", "GOT YOU"), LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
	elif a.anim and at.has("miss_at"):
		a.anim.seek(at["miss_at"])                  # closed on nothing: straight to the end of the clip


## A blow can land: some part of them in a clear line from its eye, past glass and railings as well.
func _reaches(pl: Node3D) -> bool:
	return a.level.perception.shot_height(a.eye(), pl) >= 0.0


func _shoot(at: Dictionary, pl: Node3D) -> void:
	var rig := a.aim
	var aiming: bool = rig != null and rig.active()
	var fwd3: Vector3 = a.global_transform.basis.z
	if aiming:                                       # it fires where the turret points, not where the body does
		fwd3 = Vector3(pl.global_position.x - a.global_position.x, 0, pl.global_position.z - a.global_position.z).normalized()
	var from: Vector3 = a.global_position + fwd3 * (d.get("radius", 0.5) + 0.25) + Vector3(0, at.get("muzzle", d.get("eye", 1.2)) * (-1.0 if d.get("mount", "") == "ceiling" else 1.0), 0)
	if aiming and d["aim"].has("muzzle"):            # out of the barrel itself: a point that rides the gun bone
		from = rig.muzzle()
	var target_at: Vector3 = pl.global_position + Vector3(0, a.senses.aim_y if a.senses.aim_y >= 0.0 else 1.1, 0) + pl.velocity * at.get("lead", 0.0) * (from.distance_to(pl.global_position) / 30.0)
	var dir: Vector3 = (target_at - from).normalized()
	if aiming:                                       # a shot leaves along the barrel: it cannot go where the gun is not pointing
		var bore: Vector3 = rig.bore()
		var lim: float = deg_to_rad(d["aim"].get("aligned", 6.0))
		var off := bore.angle_to(dir)
		if off > lim:
			dir = bore.slerp(dir, lim / off).normalized()
	var sp: float = deg_to_rad(at.get("spread", 2.0))
	dir = dir.rotated(Vector3.UP, a.rng.randf_range(-sp, sp)).rotated(a.global_transform.basis.x, a.rng.randf_range(-sp, sp))
	var shot := Projectile.launch(a.level, at.get("projectile", "bolt"), from, dir, at.get("damage", 8.0), a, false)
	shot.at_actors = pl is ActorCore                 # shooting another monster (factions): monsters stop it too
	Fx.flash(a.level, from, LM.col(LM.get_def("projectiles", at.get("projectile", "bolt")).get("color"), Color(1, 0.4, 0.2)), 2.5, 4.0)
	LM.sound(at.get("sound", "bolt"), a.global_position)
	_burst -= 1
	if _burst > 0:
		_atk_t = at.get("windup", 0.3) - at.get("burst_gap", 0.12)
	else:
		_atk_done = true


# ------------------------------------------------------------------ pouncing
## It gathers itself for `windup` (the tell), then is thrown at where the target will be and cannot steer.
## A miss leaves it sprawled for `recover_miss`: that is the player's opening. Works from a wall or the ceiling too.
func _pounce_tick(dt: float, pl: Node3D, to: Vector3, dist: float) -> void:
	var at: Dictionary = _atk
	_atk_t += dt
	if not _leap:
		_gather(dt, at, pl, to, dist)
		return
	_leap_t += dt
	a.velocity.y -= Actor.G * dt
	a.move_and_slide()
	var hv := Vector3(a.velocity.x, 0, a.velocity.z)
	if hv.length() > 1.0:
		a.rotation.y = atan2(hv.x, hv.z)
		a.vis.rotation.x = clamp(-atan2(a.velocity.y, hv.length()) * 0.6, -0.7, 0.7)
	if not _leap_hit and a.global_position.distance_to(pl.global_position + Vector3(0, 0.8, 0)) < d.get("radius", 0.5) + 1.1:
		_leap_hit = true
		pl.hurt(at.get("damage", 12.0), _hit_info(at, {"type": at.get("kind", "melee"), "from": a.global_position, "by": a, "knock": at.get("knock", 6.0)}))
		LM.sound(at.get("hit_sound", "bite"), a.global_position)
		a.velocity.x *= 0.2
		a.velocity.z *= 0.2
	if (_leap_t > 0.1 and a.is_on_floor()) or (_leap_t > 0.15 and a.is_on_wall() and not _leap_hit) or _leap_t > 2.5:
		_leap = false
		_atk = null
		a.vis.rotation.x = 0.0
		a.stun = at.get("recover", 0.35) if _leap_hit else at.get("recover_miss", 0.9)
		a.velocity = Vector3.ZERO
		a.play("hurt" if not _leap_hit else "idle")
		Fx.sparks(a.level, a.global_position + Vector3(0, 0.1, 0), Color(0.5, 0.5, 0.45), 6, 2.5, 0.3, 0.04)


## Before the leap: still, facing them; at the end of the windup it lets go of any wall and is thrown.
func _gather(dt: float, at: Dictionary, pl: Node3D, to: Vector3, dist: float) -> void:
	a.velocity.x = move_toward(a.velocity.x, 0, 40 * dt)
	a.velocity.z = move_toward(a.velocity.z, 0, 40 * dt)
	if a.surf == 0:
		a.move.turn_to(Vector3(to.x, 0, to.z), dt, 10.0)
		a.move.fall(dt)
		a.move_and_slide()
	if _atk_t < at.get("windup", 0.4):
		return
	_leap = true
	_leap_t = 0.0
	_leap_hit = false
	if a.surf != 0:                             # letting go of the wall
		a.climb.let_go()
		a.surf = 0
		a.basis = Basis(Vector3.UP, atan2(to.x, to.z))
	var t: float = clamp(dist / at.get("speed", 16.0), 0.28, 1.3)
	var aim_at: Vector3 = pl.global_position + Vector3(0, 0.4, 0) + Vector3(pl.velocity.x, 0, pl.velocity.z) * t * at.get("lead", 0.6)
	var dv: Vector3 = aim_at - a.global_position
	a.velocity = Vector3(dv.x / t, dv.y / t + 0.5 * Actor.G * t, dv.z / t)
	LM.sound(at.get("sound", "swing"), a.global_position)


# ------------------------------------------------------------------ grappling
## If its arms close on the target (at `windup`) it holds them off the floor in front of it for `hold` seconds, hurting
## them all the while, and then throws them. The player cannot move but can still look and shoot: doing `break` damage
## to it before the throw makes it let go. `miss_at` is where in the clip to jump to when it grabs nothing.
func _grab_tick(dt: float, pl: Node3D) -> void:
	var at: Dictionary = _atk if _atk != null else {}
	_grab_t -= dt
	a.velocity.x = 0
	a.velocity.z = 0
	a.move.fall(dt)
	a.move_and_slide()
	if not is_instance_valid(pl) or pl.dead or pl.held_by != a:
		_let_go(false)
		return
	var hold: Vector3 = a.global_position + a.global_transform.basis.z * (d.get("radius", 0.8) + at.get("reach", 0.9)) + Vector3(0, at.get("lift", 0.7), 0)
	pl.global_position = pl.global_position.lerp(hold, clampf(12 * dt, 0, 1))
	pl.velocity = Vector3.ZERO
	_grab_tick_t -= dt
	if _grab_tick_t <= 0.0:
		_grab_tick_t = 0.25
		pl.hurt(at.get("dps", 12.0) * 0.25, {"type": "crush", "by": a})
	if _grab_hp - a.hp >= at.get("break", 40.0):           # shot until it lets go
		_let_go(false)
		a.stun = 0.9
		a.play("hurt")
	elif _grab_t <= 0.0:
		_let_go(true)


func _let_go(thrown: bool) -> void:
	var at: Dictionary = _atk if _atk != null else {}
	_grab_t = 0.0
	var pl: Node3D = a.drill_foe() if a.drill_foe() != null else a.target()
	if pl and is_instance_valid(pl) and pl.held_by == a:
		pl.held_by = null
		if thrown and not pl.dead:
			pl.hurt(at.get("throw_damage", 10.0), {"type": "melee", "from": a.global_position, "by": a, "knock": at.get("throw", 13.0)})
			pl.velocity.y = 5.0
	if thrown and a.anim and at.has("miss_at"):
		a.anim.seek(at["miss_at"])
	_atk = null


## Stop, wherever it was in an attack (off duty and the show is over).
func stop() -> void:
	if _grab_t > 0.0:
		_let_go(false)
	_atk = null
