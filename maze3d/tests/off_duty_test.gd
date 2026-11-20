extends SelfTestPart
## A floor where everything is off duty: nothing hurts the player, everything talks when asked, everything with an
## attack can show it on a target, and a robot in a shut station is shut in again when the player has gone.
## LM_RANGE_ONLY=1 skips to the range; LM_RANGE_ACTOR=<id> picks who is called to it (for chasing one thing down).


func run() -> void:
	var by_kind := {}
	for a in level.actors:
		if is_instance_valid(a) and a.off_duty and not a.dead:
			var id: String = str(LM.defs["actors"].find_key(a.d))
			if not by_kind.has(id) or (by_kind[id].dock != null and a.dock == null):
				by_kind[id] = a
	pl.hp = pl.max_hp
	var hp_was: float = pl.hp
	var silent := 0
	if OS.has_environment("LM_RANGE_ONLY"):          # (for chasing one thing down)
		by_kind = {}
	for id in by_kind:
		var a: Actor = by_kind[id]
		var nm: String = a.d.get("name", id)
		await _talks(a, nm)
		if a.d.get("talk", {}).is_empty():
			silent += 1
		await _shows(a, nm)
	say(silent == 0, "everything off duty has something to say (%d kinds do not)" % silent)
	say(pl.hp >= hp_was, "nothing off duty hurt the player (%.0f lost)" % (hp_was - pl.hp))
	await _shut_station()
	await _range()


## Go up to it and press E: it offers to talk, and its panel opens; every option is chosen.
func _talks(a: Actor, nm: String) -> void:
	var c := level.cell_of(a.global_position)
	var st := storey(a.global_position)
	var stood := false
	for dv in [a.global_transform.basis.z, -a.global_transform.basis.x, a.global_transform.basis.x, -a.global_transform.basis.z]:
		var at: Vector3 = Vector3(a.global_position.x, st * level.H + 0.05, a.global_position.z) + Vector3(dv.x, 0, dv.z).normalized() * (a.d.get("radius", 0.5) + 1.6)
		var ac := level.cell_of(at)
		if level.open_s(ac.x, ac.y, st) and not level.is_blocked(ac, st):
			pl.global_position = at
			stood = true
			break
	if not stood:
		pl.global_position = level.center(c, st * level.H + 0.05)
	pl.velocity = Vector3.ZERO
	look_at(a.focus_point())
	await frames(130 if a.dock != null else 20)
	look_at(a.focus_point())
	await frames(3)
	var offered: bool = a.prompt() != ""
	a.use(pl)
	var opened: bool = Game.hud.in_panel()
	if opened:
		var opts: Array = Game.interaction.spec.get("options", [])
		for i in opts.size():
			if not opts[i].has("call"):
				await Game.interaction.choose(i)
		Game.hud.close_panel()
	await frames(3)
	say(offered and opened, "%s talks when asked (%s)" % [nm, "in reach: %s" % (pl.focus == a)])


## Ask it to show what it does: it goes to (or turns to) its target and lands an attack on it, then goes back.
func _shows(a: Actor, nm: String) -> void:
	if a.d.get("attacks", []).is_empty():
		return
	var rooted: bool = a.cannot_walk()
	var tgt: Node3D = level.drill_target_for(a)
	if tgt == null:
		say(false, "%s has a target to show its attack on" % nm)
		return
	var was: Vector3 = a.global_position
	pl.global_position = tgt.global_position + Vector3(0, 0.05, 0) - tgt.global_transform.basis.z * 3.0 + tgt.global_transform.basis.x * 3.0      # out of the way, watching
	if not rooted:                               # the walk to the range is not what is being tested
		a.global_position = tgt.global_position + tgt.global_transform.basis.z * 9.0
		a.velocity = Vector3.ZERO
	var hits0: int = tgt.hits
	var ok: bool = a.drill(tgt)
	var t := 0
	var struck := false
	while ok and t < 900 and tgt.hits == hits0:
		await frames(5)
		t += 5
		struck = struck or a.attacking()
	say(ok and tgt.hits > hits0, "%s shows its attack on a target (%d frames%s)" % [nm, t, "" if tgt.hits > hits0 else (", it attacked but nothing landed" if struck else ", it never attacked")])
	a.drill_end()
	if not rooted:
		a.global_position = was
		a.arrived_home()
		a.velocity = Vector3.ZERO
	await frames(5)


## A shut station opens when you come up to it, and shuts over its robot when you leave.
func _shut_station() -> void:
	for n in level.get_children():
		if n is Station and n.e.get("shut", false) and n.bot != null and is_instance_valid(n.bot) and not n.bot.dead and n.bot.dock == n:
			pl.global_position = n.global_position + n.global_transform.basis.z * 4.5 + Vector3(0, 0.05, 0)
			await frames(140)
			var opened2: bool = n.open_amount() > 0.9
			var roused: bool = n.bot.roused
			pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
			await frames(520)
			say(opened2 and roused and n.open_amount() < 0.1 and not n.bot.roused, "a shut station opens when you come up to it, and shuts over its robot when you leave (opened %s, robot roused %s, now open %.1f)" % [opened2, roused, n.open_amount()])
			break


## Called from the range, one walks there from wherever it was, shoots, and walks back.
func _range() -> void:
	var range_t: Node3D = null
	for t in level.targets:
		if t.tag == "range" and t.busy == null:
			range_t = t
			break
	if range_t != null:
		var h0: int = range_t.hits
		pl.global_position = range_t.global_position + Vector3(0, 0.05, 0) - range_t.global_transform.basis.z * 3.0
		var who_id: String = OS.get_environment("LM_RANGE_ACTOR") if OS.has_environment("LM_RANGE_ACTOR") else "monoid"
		level.run_effect({"type": "drill", "tag": "range", "actor": who_id}, {})
		var walker: Actor = range_t.busy as Actor
		var far := 0.0
		var t2 := 0
		if walker != null:
			far = walker.global_position.distance_to(range_t.global_position)
			while t2 < 12000 and range_t.hits == h0 and walker.drilling():
				await frames(10)
				t2 += 10
		say(walker != null and range_t.hits > h0, "called to the range, %s walks %d m to it and hits the target (%d frames)" % [walker.d.get("name", "?") if walker else "nobody", roundi(far), t2])
		if walker != null:
			var t3 := 0
			while t3 < 12000 and not walker.at_post():
				await frames(10)
				t3 += 10
			say(not walker.od.heading_home() and walker.global_position.distance_to(walker.post()) < 2.0, "  and goes back to where it was (%d frames, %.1f m off)" % [t3, walker.global_position.distance_to(walker.post())])
	pl.hp = pl.max_hp
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
