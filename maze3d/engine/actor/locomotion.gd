extends Node
## ActorLocomotion - getting about: on foot after its target (which way it wants to go is ActorWay: chase, flee,
## skirmish, follow a path, the way down or up when it is on another level, somewhere useful with no way), wandering
## near home, dancing, walking a route (off duty), flying ("fly", "bob", keeping over the floor under it), swimming
## ("swim"), scuttling ("gait"). Every actor has it; walls and ceilings are ActorClimb; what is left when it dies is
## ActorRemains.
##   "speed": 4, "accel": 30, "walk_rate": 1, "behavior": "chaser" | "skirmisher" | "turret", "keep": [6, 12],
##   "flee_below": 0.3, "flee_text": "...", "turn": 4 (a turret), "mass": 1
class_name ActorLocomotion


const LEVEL_GAP := 1.5        # more height than this between it and its target, and they are not on the same level
const HOVER_RATE := 3.0       # metres a second a hunting flyer rises or sinks to keep over the floor under it
var a: Actor
var d: Dictionary
var fly := false
var wet := false                  # in fluid
var leaving: Node3D = null        # the station it is on its way out of: out through the front first
var path: PackedVector3Array = PackedVector3Array()      # hunting: the way to the target
var path_t := 0.0
var roam: PackedVector3Array = PackedVector3Array()      # a route it is walking (off duty)
var way: ActorWay                 # which way it wants to go, hunting
var _wander_t := 0.0
var _wander := Vector3.ZERO
var _vis_bot := 0.0               # how far the model's underside is below its origin (negative)
var _vis_top := -1.0              # how far the model's top is above its origin (measured once; flyers duck under low ceilings)
var _gait_t := 0.0
var _gait_go := true
var _gait_ph := 0.0
var _partner: Node3D = null
var _partner_t := 0.0
var _hop := 0.0                   # m/s up for the next step (a startle's jump: ActorStartle)


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d
	fly = d.get("fly", false)
	way = ActorWay.new(actor)


func fall(dt: float) -> void:
	if _hop > 0.0:                                   # a jump, from the floor
		a.velocity.y = _hop
		_hop = 0.0
	elif fly or d.get("mount", "") == "ceiling":
		a.velocity.y = 0.0
	elif not a.is_on_floor():
		a.velocity.y -= 22.0 * dt
	else:
		a.velocity.y = 0.0


## Jump at `up` m/s on its next step (a startle).
func hop(up: float) -> void:
	_hop = up


func turn_to(dir: Vector3, dt: float, rate: float) -> void:
	if dir.length() < 0.01:
		return
	if a.aim and a.aim.active():                     # the head does the looking; the body follows when it gets round to it
		rate *= d["aim"].get("body_turn", 0.25)
	a.rotation.y = lerp_angle(a.rotation.y, atan2(dir.x, dir.z), clamp(rate * dt, 0.0, 1.0))


## Walking: the walk clip at the pace it is going, and its feet if they are heavy.
func _walk_anim(hv: Vector3) -> void:
	a.play("walk", clamp(hv.length() / max(0.1, d.get("speed", 4.0)), 0.5, 1.5) * d.get("walk_rate", 1.0))
	if a.looks:
		a.looks.footfall()


## The storey it is in. Taken from where it last had its feet on the ground: on a wall or a ceiling its height cannot say.
func storey() -> int:
	if a.surf == 0 and d.get("mount", "") != "ceiling" and (a.is_on_floor() or fly):
		a.base_y = a.global_position.y
	return floori((a.base_y + 0.9) / a.level.H)


## The sides of cell c that are wall, as directions out of the cell (a cut corner has no square wall to stand against).
func walls_at(c: Vector2i) -> Array:
	var out: Array = []
	if a.level.air(c.x, c.y, storey())["diag"] != "":
		return out
	for i in 4:
		var n: Vector2i = c + Level.DIRS[i]
		if a.level.air(n.x, n.y, storey())["solid"]:
			out.append(Vector3(Level.DIRS[i].x, 0, Level.DIRS[i].y))
	return out


# ------------------------------------------------------------------ every tick, whatever it is doing
## A flyer that will not hold its height bobs; under a room the ceiling is lower (the slab between storeys), and a
## flyer keeps its head out of it.
func fly_tick() -> void:
	if fly and d.has("bob"):
		a.vis.position.y = d.get("model_y", 0.0) + sin(Debug.now_msec() * 0.001 * d["bob"].get("rate", 5.0) + a.get_index()) * d["bob"].get("height", 0.2) * (1.0 if a.awake else (0.0 if a.dock != null else 0.35))
	if fly and not a.dead:
		if _vis_top < 0.0:
			var acc: Array = [null]
			Pickup.bounds(a.vis, Transform3D.IDENTITY, acc)
			_vis_top = ((acc[0] as AABB).end.y - a.vis.position.y) if acc[0] != null else d.get("height", 1.6)
			_vis_bot = ((acc[0] as AABB).position.y - a.vis.position.y) if acc[0] != null else 0.0
		var fc := a.level.cell_of(a.global_position)
		var room_top: float = a.level.ceiling_y(fc.x, fc.y, floori((a.global_position.y + 0.9) / a.level.H)) - a.global_position.y - 0.12
		a.vis.position.y = minf(a.vis.position.y, maxf(0.0, room_top - _vis_top))


## A hunting flyer keeps its hover over whatever floor is under it: off a balcony's edge it sinks to the floor below,
## up a ramp it rises with it, at no more than HOVER_RATE metres a second; going up through the air to a target on a
## floor above (ActorWay.air_height), it rises to `over`. (Its body rides at "center" above its origin, so the origin is
## where its floor is; ActorWary's lift raises it over a trap.)
func _hover_vy(over := -INF) -> float:
	var ground: float = maxf(a.level.floor_y(a.global_position), over) + (a.wary.lift if a.wary else 0.0)
	var gap: float = ground - a.global_position.y
	if absf(gap) < 0.02:
		return 0.0
	return clampf(gap * 4.0, -HOVER_RATE, HOVER_RATE)


## A swimmer rides low in it.
func swim_tick(dt: float) -> void:
	if d.has("swim"):
		a.vis.position.y = move_toward(a.vis.position.y, d.get("model_y", 0.0) - (d["swim"].get("sink", 0.0) if wet else 0.0), dt * 1.5)


# ------------------------------------------------------------------ hunting
func hunt(dt: float, pl: Node3D, flat: Vector3, dist: float) -> void:
	var speed: float = d.get("speed", 4.0)
	if a.fixed:
		if a.senses.see:
			turn_to(flat, dt, d.get("turn", 4.0))
		a.play("walk" if a.senses.see else "idle")
		return
	var want := way.want(dt, pl, flat, dist)
	if fleeing():
		speed *= 1.4
	want = _out_of_station(want).normalized()
	if wet:
		speed = d["swim"].get("speed", speed) if d.has("swim") else speed * 0.6
	if d.has("gait"):
		speed *= _gait(dt)
		var wv: float = d["gait"].get("weave", 0.0)
		if wv > 0.0 and dist > 3.0:
			want = want.rotated(Vector3.UP, sin(_gait_ph * d["gait"].get("weave_rate", 9.0)) * wv)
	a.velocity.x = move_toward(a.velocity.x, want.x * speed, d.get("accel", 30.0) * dt)
	a.velocity.z = move_toward(a.velocity.z, want.z * speed, d.get("accel", 30.0) * dt)
	if fly and a.wary:
		a.wary.fly()                              # a trap ahead: over it, under it, or wait
	fall(dt)
	if fly:
		a.velocity.y = _hover_vy(way.air_height(pl))
	a.move_and_slide()
	var hv := Vector3(a.velocity.x, 0, a.velocity.z)
	if a.senses.see and (d.get("behavior", "") == "skirmisher" or dist < 5.0):
		turn_to(flat, dt, 8.0)
	elif hv.length() > 0.4:
		turn_to(hv, dt, 8.0)
	elif a.senses.see:                               # standing where it can do no better (ActorWay): facing them
		turn_to(flat, dt, 6.0)
	if not a.attacking():
		if hv.length() > 0.5:
			_walk_anim(hv)
		else:
			a.play("idle")


## Running away: hurt enough to ("flee_below"), dazzled by the lamp (ActorWounds), or keeping away after a latch.
func fleeing() -> bool:
	return (d.has("flee_below") and a.hp < a.max_hp * d["flee_below"]) or (a.wounds != null and a.wounds.scared()) \
		or (a.moves != null and a.moves.keeping_away())


## A station has walls: the way out is the front, wherever it is going.
func _out_of_station(want: Vector3) -> Vector3:
	if leaving == null:
		return want
	if not is_instance_valid(leaving):
		leaving = null
		return want
	var out_dir: Vector3 = leaving.global_transform.basis.z
	var rel: Vector3 = a.global_position - leaving.global_position
	if rel.dot(out_dir) < leaving.front() + 0.5 and Vector2(rel.x, rel.z).length() < 3.2:
		return Vector3(out_dir.x, 0, out_dir.z) - Vector3(rel.x, 0, rel.z).slide(out_dir) * 0.5
	leaving = null
	return want


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


func gait_factor(dt: float) -> float:
	return _gait(dt) if d.has("gait") else 1.0


# ------------------------------------------------------------------ not awake
## Not awake: lounging, standing (a turret, on a wall, told to keep still), dancing, or wandering near home.
func idle_tick(dt: float) -> void:
	if a.lounge and a.lounge.active():
		a.lounge.tick(dt)
		return
	if a.patrol:                                     # walking its beat (ActorPatrol)
		a.patrol.tick(dt)
		return
	if a.fixed or a.surf != 0 or d.get("still", false) or a.e.get("still", false):
		a.play("idle")
		return
	if d.has("dance"):
		dance_tick(dt)
		return
	wander_tick(dt)


## Startled, or picking itself up after a leap.
func stunned_tick(dt: float) -> void:
	a.stun -= dt
	a.velocity.x = move_toward(a.velocity.x, 0, 30 * dt)
	a.velocity.z = move_toward(a.velocity.z, 0, 30 * dt)
	fall(dt)
	a.move_and_slide()


## Pottering about near home: a slow step now and then, back toward home if it has strayed.
func wander_tick(dt: float) -> void:
	_wander_t -= dt
	if _wander_t <= 0.0:
		_wander_t = randf_range(2.0, 5.0)
		var ang := randf() * TAU
		_wander = Vector3(cos(ang), 0, sin(ang)) if randf() < 0.5 else Vector3.ZERO
		if a.global_position.distance_to(a.home) > 5.0:
			_wander = (a.home - a.global_position).normalized()
			_wander.y = 0
	if fly and a.wary and a.wary.blocked(_wander):
		_wander = Vector3.ZERO                       # a trap that way: stay put, and think again
	elif not fly and _into_trap(_wander):
		_wander = Vector3.ZERO                       # on foot too: at home it knows where its traps are
	var sp: float = d.get("speed", 4.0) * 0.25
	a.velocity.x = move_toward(a.velocity.x, _wander.x * sp, 10 * dt)
	a.velocity.z = move_toward(a.velocity.z, _wander.z * sp, 10 * dt)
	fall(dt)
	a.move_and_slide()
	if _wander != Vector3.ZERO:
		turn_to(_wander, dt, 3.0)
		a.play("walk", 0.5)
	else:
		a.play("idle")


## Pottering about on foot, would a step that way take it into a trap that would hurt it (on now, or within half a
## second)? Already in one, no: it walks on out.
func _into_trap(dir: Vector3) -> bool:
	if dir.length() < 0.01 or a.level.traps.is_empty() or a.level.hazard(a, a.global_position):
		return false
	return a.level.hazard(a, a.global_position + dir.normalized() * (float(d.get("radius", 0.5)) + 0.8), 0.5)


## "dance": {"reach": 9, "speed": 1.6, "radius": 1.6}
## Before it has noticed anybody it dances: round and round the spot it started on, or, if another of its kind is within
## reach, the two of them round the point between them, always opposite each other. The idle clip is the dance step.
func dance_tick(dt: float) -> void:
	var dn: Dictionary = d["dance"]
	_partner_t -= dt
	if _partner_t <= 0.0:
		_partner_t = 1.5
		_partner = null
		var best: float = dn.get("reach", 9.0)
		for o in a.level.actors:
			if o == a or not is_instance_valid(o) or o.dead or o.awake or o.d.get("name", "") != d.get("name", "") or absf(o.home.y - a.home.y) > 2.0:
				continue
			var dd: float = o.home.distance_to(a.home)
			if dd < best:
				best = dd
				_partner = o
	var mid := a.home
	var rad: float = dn.get("radius", 1.6) * 0.55
	var phase := 0.0
	if _partner != null and is_instance_valid(_partner):
		mid = (a.home + _partner.home) / 2
		rad = clampf(a.home.distance_to(_partner.home) / 2, 1.2, dn.get("radius", 1.6) * 1.5)
		phase = 0.0 if a.get_instance_id() < _partner.get_instance_id() else PI
	var ang: float = Debug.now_msec() * 0.001 * dn.get("speed", 1.6) / rad + phase
	var spot := mid + Vector3(cos(ang), 0, sin(ang)) * rad
	var go := Vector3(spot.x - a.global_position.x, 0, spot.z - a.global_position.z) * 3.0
	if go.length() > 3.5:
		go = go.normalized() * 3.5
	a.velocity.x = move_toward(a.velocity.x, go.x, 12 * dt)
	a.velocity.z = move_toward(a.velocity.z, go.z, 12 * dt)
	fall(dt)
	a.move_and_slide()
	turn_to(Vector3(mid.x - a.global_position.x, 0, mid.z - a.global_position.z), dt, 4.0)      # facing its partner, or the middle of its own circle
	a.play("idle")


## Stopping where it is, and standing.
func stand(dt: float, move := true) -> void:
	a.velocity.x = move_toward(a.velocity.x, 0, 30 * dt)
	a.velocity.z = move_toward(a.velocity.z, 0, 30 * dt)
	if move:
		fall(dt)
		a.move_and_slide()
	a.play("idle")


# ------------------------------------------------------------------ walking a route (off duty)
func roaming() -> bool:
	return roam.size() > 1


## Walk along roam at `pace` of its speed. True when it has got to the end.
func follow(dt: float, pace: float) -> bool:
	var next := roam[1]
	if Vector2(next.x - a.global_position.x, next.z - a.global_position.z).length() < 0.9:
		if roam.size() <= 2:
			return true
		roam.remove_at(1)
		next = roam[1]
	var want := Vector3(next.x - a.global_position.x, 0, next.z - a.global_position.z).normalized()
	var speed: float = d.get("speed", 4.0) * pace
	if wet:
		speed = d["swim"].get("speed", speed) * pace if d.has("swim") else speed * 0.6
	a.velocity.x = move_toward(a.velocity.x, want.x * speed, d.get("accel", 30.0) * dt)
	a.velocity.z = move_toward(a.velocity.z, want.z * speed, d.get("accel", 30.0) * dt)
	fall(dt)
	if fly:
		a.velocity.y = _hover_vy()
	a.move_and_slide()
	var hv := Vector3(a.velocity.x, 0, a.velocity.z)
	if hv.length() > 0.3:
		turn_to(hv, dt, 6.0)
		_walk_anim(hv)
	else:
		a.play("idle")
	return false


## Go to dest at `pace`: by the nav's route, and the last step (or all of it, `direct`) straight at it.
func go(dt: float, dest: Vector3, pace: float, direct := false) -> void:
	var left := Vector3(dest.x - a.global_position.x, 0, dest.z - a.global_position.z)
	if left.length() < 1.6 or direct or a.level.cell_of(dest) == a.level.cell_of(a.global_position):                          # the last step, off the cell's middle: straight at it
		var speed: float = d.get("speed", 4.0) * pace * clampf(left.length() / 1.0, 0.35, 1.0)
		a.velocity.x = move_toward(a.velocity.x, left.normalized().x * speed, d.get("accel", 30.0) * dt)
		a.velocity.z = move_toward(a.velocity.z, left.normalized().z * speed, d.get("accel", 30.0) * dt)
		fall(dt)
		a.move_and_slide()
		turn_to(left, dt, 6.0)
		a.play("walk", 0.6 * d.get("walk_rate", 1.0))
		return
	path_t -= dt
	if path_t <= 0.0 or roam.size() < 2:
		path_t = 0.7
		roam = a.level.path(a.global_position, dest)
	if roam.size() > 1:
		if follow(dt, pace):
			roam = PackedVector3Array()
	else:
		stand(dt)
