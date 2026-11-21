extends SelfTestPart
## Scanner arches: walk through each one in a state it should react to.


func run() -> void:
	for n in level.get_children():
		if is_instance_valid(n) and n is Prop and not n.walk_spec().is_empty():
			var kind: String = n.walk_spec().get("kind", "?")
			pl.hp = pl.max_hp * 0.5
			Game.credits = 100
			if pl.weapons.size() < 2:
				pl.give_weapon("scattergun")
			pl.ammo["shells"] = 0
			var hp1 := pl.hp
			var actors1 := level.actors.size()
			var was_calm := Game.calm
			Game.calm = true                         # nothing turns on the player while it is tested: a bite mid-step is not the arch
			for i in 9:                              # walk through it, a quarter of a metre a frame, from a metre in front to a metre behind
				pl.global_position = n.global_position + n.global_transform.basis.z * (-1.0 + 0.25 * i) + Vector3(0, 0.05, 0)
				pl.velocity = Vector3.ZERO
				await frames(1)
			await frames(70)
			Game.calm = was_calm
			var did := ""
			match kind:
				"medical": did = "healed %d" % (pl.hp - hp1) if pl.hp > hp1 else ("used, while something was biting" if n.used > 0 else "")
				"supply": did = "gave %d shells" % pl.ammo["shells"] if pl.ammo["shells"] > 0 else ""
				"toll": did = "took %d cr" % (100 - Game.credits) if Game.credits < 100 else ""
				"security": did = "called %d" % (level.actors.size() - actors1) if level.actors.size() > actors1 else ""
			if n.used == 0 or did == "":
				var lp: Vector3 = n.global_transform.affine_inverse() * pl.global_position
				print("INFO    the player ended at %s from the arch, health %d of %d, credits %d" % [lp, pl.hp, pl.max_hp, Game.credits])
			say(n.used > 0 and did != "", "%s arch at %s reacts to being walked through (%s)" % [kind, level.cell_of(n.global_position), did])
	pl.hp = pl.max_hp
