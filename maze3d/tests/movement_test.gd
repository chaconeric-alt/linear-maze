extends SelfTestPart
## Walking and walls: the player walks, jumps and lands on the floor.


func run() -> void:
	var p0 := pl.global_position
	Input.action_press("move_forward")
	await frames(40)
	Input.action_release("move_forward")
	say(pl.global_position.distance_to(p0) > 1.0, "player walks (moved %.1f m)" % pl.global_position.distance_to(p0))
	Input.action_press("jump")
	await frames(8)
	Input.action_release("jump")
	say(pl.global_position.y > 0.3, "player jumps")
	await frames(40)
	say(abs(pl.global_position.y) < 0.2, "player lands on the floor (y=%.2f)" % pl.global_position.y)
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
