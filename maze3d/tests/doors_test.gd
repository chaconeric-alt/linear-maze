extends SelfTestPart
## Doors: every door closes an opening wall to wall; pits drop you, lifts carry you (a lift held by its lock stays
## put), and every door opens and can be stood in.


func run() -> void:
	say(level.bad_doors == 0, "every door closes an opening wall to wall (%d do not)" % level.bad_doors)
	for n in level.get_children():                   # pits drop you; lifts take you
		if not is_instance_valid(n):
			continue
		pl.hp = pl.max_hp
		pl.dead = false
		if n is Pit:
			pl.velocity = Vector3.ZERO
			pl.global_position = n.global_position + Vector3(0, 0.05, 0)
			await frames(150)
			say(pl.global_position.y < n.global_position.y - 2.0, "pit at %s drops the player (to y=%.1f)" % [level.cell_of(n.global_position), pl.global_position.y])
		elif n is Lift:
			var was: int = n.at
			pl.velocity = Vector3.ZERO
			pl.global_position = n.global_position + Vector3(0, 0.1, 0)
			await frames(420)
			if n.is_locked():
				say(n.at == was, "lift at %s is held by its lock: it stays put with the player on it" % level.cell_of(n.global_position))
				continue
			say(n.at != was and absf(pl.global_position.y - n.global_position.y) < 0.6, "lift at %s carries the player (stop %d to %d, player y=%.1f, lift y=%.1f)" % [level.cell_of(n.global_position), was, n.at, pl.global_position.y, n.global_position.y])
	var was_calm := Game.calm
	Game.calm = true                                 # nothing turns on the player at a door: a grab mid-check is not the door
	for dp in level.doors:
		var d: Door = level.doors[dp]
		var side := Vector2i.ZERO
		for q in Level.DIRS:
			if level.is_open(dp.x + q.x, dp.y + q.y):
				side = q
				break
		pl.global_position = level.center(dp, 0.05) + Vector3(side.x, 0, side.y) * 2.7
		await frames(140 if not d.jammed else 420)
		say(d.t > 0.9 and d.is_passable(), "%s at %s opens%s" % [d.meta.get("model", "door"), dp, " (was locked: %s)" % d.is_locked() if d.is_locked() else ""])
		pl.global_position = level.center(dp, 0.05)
		await frames(10)
		say(level.cell_of(pl.global_position) == dp, "  and can be stood in")
	Game.calm = was_calm
