extends SelfTestPart
## Traps hurt (a tripwire trips, ambiance is harmless); then the player is made unkillable for the rest of the test.


func run() -> void:
	for n in level.get_children():
		if is_instance_valid(n) and n is Trap and n.enabled:
			pl.hp = pl.max_hp
			pl.armor = 0
			pl.dead = false
			Game.over = false
			pl.global_position = n.global_position + Vector3(0, 0.05, 0)
			await frames(330)
			if n.e.get("trip", false):                # a tripwire tells somebody instead
				say(not n.enabled, "the tripwire at %s trips, once" % n.cell_pos)
			elif float(n.e.get("damage", 1.0)) <= 0.0:    # ambiance
				say(true, "%s at %s is harmless, as it says" % [n.kind, n.cell_pos])
			else:
				say(pl.hp < pl.max_hp, "%s trap at %s hurts (%.0f)" % [n.kind, n.cell_pos, pl.max_hp - pl.hp])
	pl.max_hp = 1000000.0
	pl.hp = pl.max_hp
	pl.dead = false
	pl.head.position.y = Player.EYE
	pl.cam.rotation.z = 0.0
	Game.over = false
	main.carry_on()                                  # if a trap killed the player, the level was not left after all
