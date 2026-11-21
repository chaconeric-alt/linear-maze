extends SelfTestPart
## Getting stuck (PlayerUnstick). The player stands at the level's start, then a step and a half away across open floor;
## standing there in the open, nothing moves them. Then four walls and a lid are pressed close round them (bodies made
## for the test), so that no step and no jump gets them out: within about a second they are back where they stood a
## step before. The walls are taken away again.


func run() -> void:
	var p0: Vector3 = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	_put(p0)
	await frames(20)
	p0 = pl.global_position
	var way := _open_way(p0, 1.6)
	if way == Vector3.ZERO:
		say(true, "no open floor beside the start to test getting stuck on")
		return
	var p1 := p0 + way * 1.5
	_put(p1)
	await frames(70)
	p1 = pl.global_position
	say(pl.global_position.distance_to(p1) < 0.05 and not pl.unstick.boxed_in(), "standing in the open for a second, nothing moves the player")
	var walls := _box_in(p1)
	await frames(2)
	var boxed: bool = pl.unstick.boxed_in()
	var n := 0
	while n < 150 and pl.global_position.distance_to(p1) < 0.5:
		await frames(1)
		n += 1
	var off := pl.global_position.distance_to(p0)
	say(boxed and off < 0.1, "boxed in where no step or jump gets them out, the player is put back where they stood a step before (%.2f m from it, after %.1f s)" % [off, n / 60.0])
	for w in walls:
		w.queue_free()
	await frames(2)


func _put(at: Vector3) -> void:
	pl.global_position = at
	pl.velocity = Vector3.ZERO


## A way across the floor with that much room, from there; zero if there is none.
func _open_way(from: Vector3, dist: float) -> Vector3:
	for i in 8:
		var d := Vector3(cos(TAU * i / 8.0), 0.0, sin(TAU * i / 8.0))
		if not pl.test_move(Transform3D(Basis(), from), d * dist):
			return d
	return Vector3.ZERO


## Four walls a hand's breadth from the player's body and a lid over their head.
func _box_in(at: Vector3) -> Array:
	var out: Array = []
	var near := 0.45
	for side in [Vector3(near + 0.1, 1.2, 0), Vector3(-near - 0.1, 1.2, 0), Vector3(0, 1.2, near + 0.1), Vector3(0, 1.2, -near - 0.1)]:
		var size := Vector3(0.2, 2.4, 1.4) if absf(side.x) > 0.0 else Vector3(1.4, 2.4, 0.2)
		out.append(_slab(at + side, size))
	out.append(_slab(at + Vector3(0, 2.05, 0), Vector3(1.4, 0.2, 1.4)))
	return out


func _slab(at: Vector3, size: Vector3) -> StaticBody3D:
	var b := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	b.add_child(cs)
	level.add_child(b)
	b.global_position = at
	return b
