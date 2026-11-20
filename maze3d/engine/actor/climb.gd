extends Node
## ActorClimb - walls and ceilings (defs: "climb").
## "climb": {"speed": 6, "ceiling": true, "perch": 0.5, "chance": 0.5, "min_dist": 7, "drop_at": 1.8, "drop_damage": 8, "off": 0.3}
## perch: how often one starts a level waiting on a wall or the ceiling (a level entry can say "perch": "wall" / "ceiling" / "floor").
## chance: how often, while hunting on foot and still min_dist away, it takes to the nearest wall instead.
## On the ceiling it follows the same route it would walk, and lets go above the player, at a door, or where the ceiling changes height.
## Where it is is the actor's `surf`: 0 floor · 1 on a wall · 2 on the ceiling · 3 falling off · 4 on foot, heading for a wall.
class_name ActorClimb

var a: Actor
var d: Dictionary
var next_t := 2.0                 # how long until it next thinks about the walls
var _goal_up := false
var _approach := Vector3.ZERO
var _approach_t := 0.0


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


func start_perch() -> void:
	var cl: Dictionary = d["climb"]
	var where: String = a.e.get("perch", "")
	if where == "":
		if randf() > cl.get("perch", 0.5):
			return
		where = "ceiling" if cl.get("ceiling", true) and randf() < 0.5 else "wall"
	var c := a.level.cell_of(a.position)
	if a.level.air(c.x, c.y, a.move.storey())["door"] != "":
		return
	if where == "ceiling":
		a.surf = 2
		a.position.y = _ceil_y(c) - cl.get("off", 0.3)
		a.basis = _facing(Vector3.DOWN, Vector3(sin(a.rotation.y), 0, cos(a.rotation.y)))
	elif where == "wall":
		var walls := a.move.walls_at(c)
		if walls.is_empty():
			return
		var dv: Vector3 = walls[randi() % walls.size()]
		a.wall_n = -dv
		a.position = a.level.center(c) + dv * (a.level.C / 2 - cl.get("off", 0.3))
		a.position.y = a.base_y + randf_range(1.3, maxf(1.5, _ceil_y(c) - a.base_y - 1.2))
		a.surf = 1
		a.basis = _facing(a.wall_n, Vector3.DOWN)       # head down, the way they wait


## Woken on a wall: up to the ceiling, more often than not.
func on_alert() -> void:
	_goal_up = d.get("climb", {}).get("ceiling", true) and randf() < 0.6


func _ceil_y(c: Vector2i) -> float:
	return a.level.ceiling_y(c.x, c.y, a.move.storey())          # (hard against a wall its middle can be over the line: one storey, then)


func _facing(up: Vector3, fwd: Vector3) -> Basis:
	var z := (fwd - up * fwd.dot(up))
	if z.length() < 0.01:
		z = up.cross(Vector3.RIGHT) if absf(up.x) < 0.9 else up.cross(Vector3.FORWARD)
	z = z.normalized()
	return Basis(up.cross(z).normalized(), up, z)


func _orient(up: Vector3, fwd: Vector3, k: float) -> void:
	a.basis = a.basis.orthonormalized().slerp(_facing(up, fwd), clamp(k, 0.0, 1.0))


## Let go and fall.
func drop() -> void:
	if a.surf == 1:
		a.velocity = a.wall_n * 2.5
	else:
		a.velocity = Vector3.ZERO
	let_go()
	a.surf = 3


## Clear of the surface, so that the body it is about to turn upright has room to turn in.
func let_go() -> void:
	if a.surf == 1:
		a.position += a.wall_n * (d.get("radius", 0.5) + 0.15)
	elif a.surf == 2:
		a.position.y -= maxf(d.get("height", 1.0), d.get("radius", 0.5) * 2.0) + 0.15


func fall_tick(dt: float, flat: Vector3) -> void:
	a.velocity.y -= Actor.G * dt
	a.velocity.x = move_toward(a.velocity.x, 0, 4 * dt)
	a.velocity.z = move_toward(a.velocity.z, 0, 4 * dt)
	a.move_and_slide()
	var f := flat if flat.length() > 0.1 else Vector3(a.basis.z.x, 0, a.basis.z.z)
	_orient(Vector3.UP, f if f.length() > 0.05 else Vector3.BACK, 9 * dt)
	if not (a.is_on_floor() or a.position.y <= a.level.f_min * a.level.H + 0.02):
		return
	a.surf = 0
	var z := Vector3(a.basis.z.x, 0, a.basis.z.z)
	a.basis = Basis(Vector3.UP, atan2(z.x, z.z))
	a.velocity = Vector3.ZERO
	next_t = randf_range(4.0, 8.0)
	if not a.dead:
		var pl := a.target()
		var dmg: float = d.get("climb", {}).get("drop_damage", 0.0)
		if dmg > 0.0 and pl and not a.off_duty and a.global_position.distance_to(pl.global_position) < d.get("radius", 0.5) + 1.2:
			pl.hurt(dmg, {"type": "melee", "from": a.global_position, "by": a, "knock": 3.0})
		Fx.sparks(a.level, a.global_position + Vector3(0, 0.1, 0), Color(0.5, 0.5, 0.45), 6, 2.5, 0.3, 0.04)
		LM.sound("step", a.global_position)


## On the floor, hunting, and still a way off: now and then it makes for the nearest wall instead. True when it has.
func consider(dt: float, dist: float) -> bool:
	if a.attacking() or a.fixed:
		return false
	next_t -= dt
	if next_t > 0.0:
		return false
	next_t = randf_range(3.0, 6.0)
	var cl: Dictionary = d["climb"]
	if dist > cl.get("min_dist", 7.0) and randf() < cl.get("chance", 0.5) and a.is_on_floor() and not a.move.wet:
		var c := a.level.cell_of(a.global_position)
		var walls := a.move.walls_at(c)
		if not walls.is_empty():
			var dv: Vector3 = walls[randi() % walls.size()]
			_approach = a.level.center(c) + dv * (a.level.C / 2 - cl.get("off", 0.3))
			_approach_t = 2.0
			a.wall_n = -dv
			a.surf = 4
			return true
	return false


func tick(dt: float, pl: Node3D, flat: Vector3, dist: float) -> void:
	match a.surf:
		1:
			_wall_tick(dt)
		2:
			_ceiling_tick(dt, pl, flat, dist)
		3:
			fall_tick(dt, flat)
		4:
			_approach_tick(dt)


func _wall_tick(dt: float) -> void:
	var cl: Dictionary = d.get("climb", {})
	var sp: float = cl.get("speed", d.get("speed", 5.0))
	var off: float = cl.get("off", 0.3)
	var c := a.level.cell_of(a.global_position)
	var top := _ceil_y(c) - off
	if _goal_up:
		a.position.y += sp * dt
		_orient(a.wall_n, Vector3.UP, 10 * dt)
		if a.position.y >= top:
			a.position.y = top
			if cl.get("ceiling", true):
				a.surf = 2
			else:
				_goal_up = false
	else:
		a.position.y -= sp * dt
		_orient(a.wall_n, Vector3.DOWN, 10 * dt)
		if a.position.y <= a.base_y + 0.5:
			drop()
	a.play("walk", d.get("walk_rate", 1.0))


func _ceiling_tick(dt: float, pl: Node3D, flat: Vector3, dist: float) -> void:
	var cl: Dictionary = d.get("climb", {})
	var sp: float = cl.get("speed", d.get("speed", 5.0))
	var off: float = cl.get("off", 0.3)
	var c := a.level.cell_of(a.global_position)
	if dist < cl.get("drop_at", 1.8):
		drop()
		return
	var mv := a.move
	var want := Vector3.ZERO
	mv.path_t -= dt
	if mv.path_t <= 0.0:
		mv.path_t = 0.4
		mv.path = a.level.path(Vector3(a.position.x, a.base_y, a.position.z), pl.global_position)      # the way there, as the floor under it knows it
	if mv.path.size() > 1:
		var next := mv.path[1]
		var gap := Vector3(next.x - a.position.x, 0, next.z - a.position.z)
		if gap.length() < 1.0 and mv.path.size() > 2:
			mv.path.remove_at(1)
			next = mv.path[1]
			gap = Vector3(next.x - a.position.x, 0, next.z - a.position.z)
		var nc := a.level.cell_of(next)
		var there := a.level.air(nc.x, nc.y, a.move.storey())
		if nc != c and (there["door"] != "" or there["solid"] or _ceil_y(nc) != _ceil_y(c)):
			if gap.length() < a.level.C * 0.8:     # a door, or the ceiling steps: down and on foot
				drop()
				return
		want = gap.normalized()
	elif absf(pl.global_position.y - a.base_y) < a.level.H * 0.6 and a.level.los(a.global_position, pl.global_position + Vector3(0, 1.0, 0)):
		want = flat.normalized()                 # no route, but there they are
	else:
		drop()                                  # nowhere to go up here (they are on another floor): down, and think again
		return
	a.position += want * sp * mv.gait_factor(dt) * dt
	a.position.y = _ceil_y(c) - off
	if want.length() > 0.1:
		_orient(Vector3.DOWN, want, 8 * dt)
	a.play("walk", d.get("walk_rate", 1.0))


func _approach_tick(dt: float) -> void:
	var cl: Dictionary = d.get("climb", {})
	var sp: float = cl.get("speed", d.get("speed", 5.0))
	_approach_t -= dt
	var gap2 := Vector3(_approach.x - a.position.x, 0, _approach.z - a.position.z)
	if gap2.length() < 0.35:
		a.position = Vector3(_approach.x, maxf(a.position.y, a.base_y + 0.3), _approach.z)
		a.velocity = Vector3.ZERO
		a.surf = 1
		_goal_up = true
	elif _approach_t <= 0.0:
		a.surf = 0
	else:
		var w := gap2.normalized() * sp
		a.velocity.x = w.x
		a.velocity.z = w.z
		a.move.fall(dt)
		a.move_and_slide()
		a.move.turn_to(gap2, dt, 10.0)
		a.play("walk", d.get("walk_rate", 1.0))
