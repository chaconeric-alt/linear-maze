extends SelfTestPart
## Everything placed can be reached once doors are unlocked, and everything on another storey has a way up.


func run() -> void:
	var blocked: Array = []
	for dp in level.doors:
		if level.is_blocked(dp):
			blocked.append(dp)
			level.block(dp, false)
	var blocked_up: Array = []
	for du in level.doors_up:
		if level.is_blocked(Vector2i(du.x, du.y), du.z):
			blocked_up.append(du)
			level.block(Vector2i(du.x, du.y), false, du.z)
	var unreachable := 0
	var start := level.center(level.start_cell, level.start_level * level.H)
	for n in level.get_children():
		if n is Prop or n is Pickup or n is Actor or n is Trap:
			var c := level.cell_of(n.global_position)
			var ns := storey(n.global_position)
			var ok := false
			for d in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:      # walking, by lift, or down a pit
				if level.open_s(c.x + d.x, c.y + d.y, ns) and level.reach(start, level.center(c + d, n.global_position.y)):
					ok = true
					break
			if not ok:
				unreachable += 1
				print("INFO  unreachable: ", n.get_class(), " at ", c)
	say(unreachable == 0, "every thing on the map can be reached (%d cannot)" % unreachable)
	var upstairs := 0                                # things on balconies: there has to be a way up that can be walked
	var stranded := 0
	for n in level.get_children():
		if (n is Prop or n is Pickup or n is Actor) and absf(n.global_position.y) > 2.0 and not (n is Actor and (n.surf != 0 or n.d.get("mount", "") == "ceiling" or n.move.fly)):
			upstairs += 1
			var got: bool = level.reach(start, n.global_position)
			if not got and n is Prop:                # on a wall: it is reached from in front of it
				got = level.reach(start, n.global_position + n.global_transform.basis.z * 0.9)
			if not got or (not n is Prop and absf(level.floor_y(n.global_position) - n.global_position.y) > 1.6):
				stranded += 1
				print("INFO  no way up to ", n.get_class(), " at ", n.global_position)
	if upstairs > 0:
		say(stranded == 0, "everything on other storeys can be got to (%d things, %d stranded)" % [upstairs, stranded])
	for dp in blocked:
		level.block(dp, true)
	for du in blocked_up:
		level.block(Vector2i(du.x, du.y), true, du.z)
