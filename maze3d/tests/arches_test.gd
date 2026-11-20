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
			pl.global_position = n.global_position - n.global_transform.basis.z * 1.0 + Vector3(0, 0.05, 0)
			pl.velocity = Vector3.ZERO
			await frames(4)
			pl.global_position = n.global_position + n.global_transform.basis.z * 1.0 + Vector3(0, 0.05, 0)
			await frames(70)
			var did := ""
			match kind:
				"medical": did = "healed %d" % (pl.hp - hp1) if pl.hp > hp1 else ("used, while something was biting" if n.used > 0 else "")
				"supply": did = "gave %d shells" % pl.ammo["shells"] if pl.ammo["shells"] > 0 else ""
				"toll": did = "took %d cr" % (100 - Game.credits) if Game.credits < 100 else ""
				"security": did = "called %d" % (level.actors.size() - actors1) if level.actors.size() > actors1 else ""
			say(n.used > 0 and did != "", "%s arch at %s reacts to being walked through (%s)" % [kind, level.cell_of(n.global_position), did])
	pl.hp = pl.max_hp
