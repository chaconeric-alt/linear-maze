extends Node
## ActorRemains - what is left once an actor is dead. Killed in the air (flying, mid-leap, thrown, over a drop), it comes
## down; down and still, it settles, but a floor can still go from under it (a lift, a trapdoor), and on a lift it rides.
## Then its model is laid on the floor where its body came to rest. A flyer's body hovered at "center" above its model,
## and death clips move the model about (the Knife Fighter's drops it 0.75 m), so for a few seconds after it comes to
## rest (or lies still on a lift) the model is moved until the underside of what is drawn, as posed now, touches the
## floor: measured from the skinned mesh itself (a sample of its vertices through the current bone poses), not from
## bones, which can sit well outside the surface. Its body shrinks to a small ball as it dies, so it cannot wedge above
## the floor. A robot killed in its station is laid in it and stays. Added by ActorCore when it dies, which has it die():
## the body let go, then leave() what a death leaves behind: the kill counted, a blast, drops, on_death effects, the
## actor.died event.
class_name ActorRemains

const SETTLE := 3.0          # seconds after coming to rest that the death pose is checked (a death clip is shorter)
const LOOK_EVERY := 0.25

var a: Actor
var d: Dictionary
var _at_rest := false        # down and still: nothing more to do but watch the floor
var _held := false           # died in its robot station, which holds it where it was laid
var _riding := false         # lying still on a lift: never at rest, but its death pose is laid all the same
var _air_t := 0.0
var _settle_t := -1.0        # time since it came to rest, while the death pose is still being watched; -1 before
var _look_t := 0.0
var _tween: Tween = null
var _skin_cache: Dictionary = {}     # mesh -> [vertices, bones, weights, influences per vertex, step]: read once


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


## It dies (ActorCore.hurt): it stops what it was doing, its body comes away from a wall or ceiling, keeps some of its
## way if it was in the air, plays its death, and then leaves what a death leaves behind.
func die(info: Dictionary) -> void:
	a.dead = true
	a.state = ActorCore.State.DEAD
	if a.attacks:
		a.attacks.drop_attack()
	if a.lounge:
		a.lounge.end()
	if a.surf == 1 or a.surf == 2:
		a.surf = 3
	elif a.surf == 4:
		a.surf = 0
	a.collision_layer = 0
	a.collision_mask = 1 | Level.GLASS
	if a.surf != 0:
		a.velocity = a.wall_n * 1.5
	elif a.is_on_floor() and not a.move.fly:
		a.velocity = Vector3.ZERO
	else:
		a.velocity = Vector3(a.velocity.x * 0.5, minf(a.velocity.y, 0.0), a.velocity.z * 0.5)      # in the air: it keeps some of its way and falls
	died()
	a.play("die")
	LM.sound(d.get("sounds", {}).get("die", "die"), a.global_position)
	leave(info)


## Dead, each tick: it lets go of anyone it held, and what was shot off a wall comes down; or it comes to rest (tick).
func dead_tick(dt: float) -> void:
	if a.attacks:
		a.attacks.release_if_holding()
	if a.surf != 0:
		a.climb.fall_tick(dt, Vector3.ZERO)
	else:
		tick(dt)


func died() -> void:
	_at_rest = d.get("mount", "") == "ceiling"       # what is bolted to the ceiling stays there
	_air_t = 0.0
	if a.dock != null:
		_lay_in_station()


## A robot that dies in its station stays in it. While the shutter is down a solid box fills the whole station, and a
## body that starts inside a solid drops straight through it (and through a Knife Fighter's perch under it), so it is
## not left to fall: it is put on whatever is under it, the floor or the perch, and stays there. A ray that starts
## inside the shutter's box does not stop at it.
func _lay_in_station() -> void:
	_shrink()
	var from: Vector3 = a.cs.global_position
	var q := PhysicsRayQueryParameters3D.create(from, from + Vector3(0, -4, 0), 1 | Level.GLASS, [a.get_rid()])
	var hit: Dictionary = a.get_world_3d().direct_space_state.intersect_ray(q)
	if not hit.is_empty():
		a.global_position.y += hit.position.y - (from.y - 0.15)       # the ball's bottom on what is under it
	_held = true
	_come_to_rest()


## A body needs no width once it is dead: a wide one wedges between the walls of a robot station or a narrow gap and
## hangs there. Once it is upright (one that died on a wall or a ceiling turns over first), it becomes a small ball
## where the bottom of its body was, which drops to the floor.
func _shrink() -> void:
	var cap := a.cs.shape as CapsuleShape3D
	if cap == null or cap.height <= 0.3:
		return
	var bottom: float = a.cs.position.y - cap.height / 2.0
	var ball := CapsuleShape3D.new()
	ball.radius = 0.15
	ball.height = 0.3
	a.cs.shape = ball
	if bottom > 0.0:                         # a flyer's body hovered above its origin: the origin goes up to the body
		a.global_position.y += bottom        # (the model staying where it is), so that it lands on the floor with the
		a.vis.position.y -= bottom           # body and not under it, where it would count as on the storey below
		bottom = 0.0
	a.cs.position.y = bottom + 0.15


func tick(dt: float) -> void:
	if _at_rest:
		_watch_pose(dt)
		_air_t += dt
		if _air_t > 0.5:
			_air_t = 0.0
			if d.get("mount", "") != "ceiling" and not _held and not _on_something(0.12):
				_at_rest = false
		return
	if a.basis.y.y < 0.99:                   # killed on a ceiling: it turns over as it falls
		var z := Vector3(a.basis.z.x, 0, a.basis.z.z)
		var yaw := atan2(z.x, z.z) if z.length() > 0.05 else a.rotation.y
		a.basis = a.basis.orthonormalized().slerp(Basis(Vector3.UP, yaw), clampf(9.0 * dt, 0.0, 1.0))
	else:
		_shrink()
	a.velocity.y -= Actor.G * dt
	a.velocity.x = move_toward(a.velocity.x, 0, 6 * dt)
	a.velocity.z = move_toward(a.velocity.z, 0, 6 * dt)
	var vy := a.velocity.y
	a.move_and_slide()
	a.vis.rotation.x = move_toward(a.vis.rotation.x, 0.0, 3.0 * dt)
	if not (a.is_on_floor() or a.position.y <= a.level.f_min * a.level.H + 0.02):
		_air_t = 0.0
		_riding = false
		return
	_air_t = 0.0 if absf(a.velocity.x) + absf(a.velocity.z) > 0.2 else _air_t + dt
	if vy < -6.0:                            # it landed hard
		Fx.sparks(a.level, a.global_position + Vector3(0, 0.1, 0), Color(0.5, 0.5, 0.45), 8, 3.0, 0.3, 0.04)
		LM.sound("step", a.global_position, 0.0, 0.6)
	var on_lift := false                     # on a lift it never settles for good: it rides, and falls if the lift leaves
	for ci in a.get_slide_collision_count():
		if a.get_slide_collision(ci).get_collider() is AnimatableBody3D:
			on_lift = true
	if _air_t > 0.4 and not on_lift:
		_come_to_rest()
	elif _air_t > 0.4:
		if not _riding:
			_riding = true
			_settle_t = 0.0
		_watch_pose(dt)


func _come_to_rest() -> void:
	_at_rest = true
	a.velocity = Vector3.ZERO
	_settle_t = 0.0
	_look_t = 0.0


## What a death leaves behind, once, as it dies: the kill counted; the blast of one that explodes; what it drops (each
## a thing made while playing, with its own key); its on_death effects; and the news, to the level's triggers ("clear")
## and as the event actor.died: its key, its kind (the actor id), whether it is a robot, what killed it ("player", the
## key of the monster or thing that did, or "") and how (the damage type).
func leave(info: Dictionary) -> void:
	Game.stats["kills"] += 1
	var pos := a.global_position + Vector3(0, 0.3 if d.get("mount", "") != "ceiling" else -1.0, 0)
	if d.has("explode"):
		Fx.explode(a.level, a.eye(), d["explode"].get("radius", 3.0), d["explode"].get("damage", 20.0), Color(1.0, 0.5, 0.15), a)
	for dr in d.get("drops", []):
		if randf() < dr.get("chance", 1.0):
			var p := Pickup.new()
			a.level.add_child(p)
			p.global_position = Vector3(pos.x + randf_range(-0.4, 0.4), a.level.floor_y(pos) + 1.0, pos.z + randf_range(-0.4, 0.4))      # on whatever floor it died on
			p.setup(a.level, dr, a.level.kit_id)
			a.level.spawner.keep(p)
	Game.run_effects(a.e.get("on_death"))
	a.level.actor_died(a)
	var by: Variant = info.get("by")
	var killer := ""
	if by is Node and is_instance_valid(by):
		killer = "player" if by == Game.player else a.level.key_of(by)
	Events.emit("actor.died", {"key": a.level.key_of(a), "kind": str(LM.defs["actors"].find_key(d)), "robot": a.is_robot(), "by": killer, "how": str(info.get("type", ""))})
	if info.get("type", "") == "blast" and d.get("gib", true):
		Fx.sparks(a.level, a.eye(), LM.col(d.get("blood"), Color(1, 0.5, 0.2)), 30, 8.0, 0.8, 0.12)


## Done falling, and its death pose has been laid on the floor (for the self-test).
func settled() -> bool:
	return (_at_rest or _riding) and (_settle_t < 0.0 or _settle_t > SETTLE)


## What its body is resting on is under it: the body is not hanging in the air (for the self-test). What is bolted to
## the ceiling, and a robot laid in its station, are held where they are.
func supported() -> bool:
	return d.get("mount", "") == "ceiling" or _held or _on_something(0.06)


## Something within `drop` metres under its body. A body lying on the floor is within the physics' safe margin of it,
## and test_move counts that contact only if told to (recovery_as_collision, as move_and_slide's own floor test does):
## without it a body at rest was found to have nothing under it, fell the 0.001 m, came to rest again, and so never
## settled.
func _on_something(drop: float) -> bool:
	return a.test_move(a.global_transform, Vector3(0, -drop, 0), null, a.safe_margin, true)


## How far the underside of what is drawn is above what its body rests on: 0.02 when it is laid right (for the
## self-test). INF with nothing drawn; 0.02 for what stays on the ceiling, where nothing is laid.
func model_gap() -> float:
	if d.get("mount", "") == "ceiling":
		return 0.02
	return _underside() - (a.cs.global_position.y - (a.cs.shape as CapsuleShape3D).height / 2.0)


## For a while after it comes to rest, or lies still on a lift (the death clip may still be playing): move the model
## so that what is drawn lies on the floor its body is resting on.
func _watch_pose(dt: float) -> void:
	if _settle_t < 0.0 or _settle_t > SETTLE or d.get("mount", "") == "ceiling":
		return
	_settle_t += dt
	_look_t -= dt
	if _look_t > 0.0:
		return
	_look_t = LOOK_EVERY
	var under := _underside()
	if under == INF:
		return
	var floor_at: float = a.cs.global_position.y - (a.cs.shape as CapsuleShape3D).height / 2.0      # where the body touches
	var gap: float = under - (floor_at + 0.02)
	if absf(gap) > 0.02:
		if _tween:
			_tween.kill()
		_tween = a.create_tween()
		_tween.tween_property(a.vis, "position:y", a.vis.position.y - clampf(gap, -2.0, 2.0), 0.2)


## The lowest point of what is drawn, as posed now (world height): a sample of each mesh's vertices (at most 1,500 a
## surface), skinned through the bones' current poses.
func _underside() -> float:
	var low := INF
	for mi in a.vis.find_children("*", "MeshInstance3D", true, false):
		var m: MeshInstance3D = mi
		if m.mesh == null or not m.is_visible_in_tree():
			continue
		var skel: Skeleton3D = m.get_node_or_null(m.skeleton) as Skeleton3D if m.skin != null else null
		for si in m.mesh.get_surface_count():
			var c: Array = _surface(m.mesh, si)
			low = minf(low, _surface_low(m, skel, c))
	return low


func _surface(mesh: Mesh, si: int) -> Array:
	var key := "%d/%d" % [mesh.get_rid().get_id(), si]
	if not _skin_cache.has(key):
		var arr := mesh.surface_get_arrays(si)
		var v: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		var bones: PackedInt32Array = arr[Mesh.ARRAY_BONES] if arr[Mesh.ARRAY_BONES] != null else PackedInt32Array()
		var wts: PackedFloat32Array = arr[Mesh.ARRAY_WEIGHTS] if arr[Mesh.ARRAY_WEIGHTS] != null else PackedFloat32Array()
		_skin_cache[key] = [v, bones, wts, bones.size() / maxi(1, v.size()), maxi(1, v.size() / 1500)]
	return _skin_cache[key]


func _surface_low(m: MeshInstance3D, skel: Skeleton3D, c: Array) -> float:
	var v: PackedVector3Array = c[0]
	var bones: PackedInt32Array = c[1]
	var wts: PackedFloat32Array = c[2]
	var per: int = c[3]
	var low := INF
	if skel == null or per == 0:
		for i in range(0, v.size(), c[4]):
			low = minf(low, (m.global_transform * v[i]).y)
		return low
	var mats: Array[Transform3D] = []
	for b in m.skin.get_bind_count():
		var bi: int = m.skin.get_bind_bone(b)
		if bi < 0:
			bi = skel.find_bone(m.skin.get_bind_name(b))
		mats.append(skel.global_transform * skel.get_bone_global_pose(maxi(bi, 0)) * m.skin.get_bind_pose(b))
	for i in range(0, v.size(), c[4]):
		var p := Vector3.ZERO
		for j in per:
			var w: float = wts[i * per + j]
			if w > 0.0:
				p += mats[bones[i * per + j]] * v[i] * w
		low = minf(low, p.y)
	return low
