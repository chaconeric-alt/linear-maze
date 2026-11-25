extends SelfTestPart
## The Pumping Station's own test (it runs instead of the standard parts): a level's systems (SPEC 5.25). With main
## power off, as it starts: the lights burn low and red, the Lab's door stays shut, the lift stays put, the lab console
## and the diagnostics refuse and say why, the fabricator makes nothing and the station keeps its robot whatever wakes
## it. The generator panel starts the generator: `system.changed` says so, the lights come back, the door opens, the
## lift runs, the console answers with the state in its words, the fabricator makes, the station lets its robot out.
## Security shut down stops the laser; on alert, the level's `do` raises the alarm. A cloud clears sooner while the air
## runs. Then the level is left and entered again: every system as it was, and what needs them with it.

const LAB_DOOR := Vector2i(3, 7)


func replaces_standard() -> bool:
	return true


func run() -> void:
	pl.max_hp = 100000.0
	pl.hp = pl.max_hp
	await frames(20)
	var told: Array = []
	var listen := func(p: Dictionary) -> void:
		told.append(p)
	Events.on("system.changed", listen)
	await _unpowered()
	await _powered(told)
	await _security()
	await _air()
	Events.off("system.changed", listen)
	await _remembered()


# ------------------------------------------------------------------ helpers
## The Generator Hall's lights now, against what they were built to give: [how much of it, how red].
func _hall_lights() -> Array:
	var ls: Array = level.lights_by_room.get("The Generator Hall", [])
	if ls.is_empty():
		return [-1.0, 0.0]
	var l: Light3D = ls[0]
	return [l.light_energy / maxf(0.001, float(l.get_meta("base", l.light_energy))), l.light_color.r - l.light_color.g]


## Stand in the corridor in front of the Lab's door for a second: does it open?
func _door_opens() -> bool:
	go(LAB_DOOR + Vector2i(0, -1))
	await frames(70)
	var d := door(LAB_DOOR.x, LAB_DOOR.y)
	var open := d != null and d.is_passable()
	go(Vector2i(7, 6))
	await frames(70)
	return open


## Stand on the lift for three seconds: how far does it rise?
func _lift_rises() -> float:
	var lift: Node3D = thing("lift")
	var y0 := lift.global_position.y
	pl.global_position = lift.global_position + Vector3(0, 0.3, 0)
	await frames(180)
	var rose := lift.global_position.y - y0
	go(Vector2i(14, 6))
	await frames(200)
	return rose


## The lab console used: did its panel open, and what does it say?
func _console() -> Array:
	var c: Node = thing("lab_console")
	pl.global_position = c.global_position + c.global_transform.basis.z * 1.6
	pl.global_position.y = 0.05
	c.use(pl)
	await frames(3)
	var opened: bool = Game.hud.in_panel()
	var text := str(Game.interaction.spec.get("text", "")) if opened else ""
	if opened:
		Game.hud.close_panel()
	return [opened, text]


## The robot station (its robot carries its tag too).
func _station() -> Station:
	for n in level.things_by_tag.get("station", []):
		if n is Station:
			return n
	return null


## The station's robot is still docked in it.
func _docked() -> bool:
	var st := _station()
	return st != null and st.bot != null and is_instance_valid(st.bot) and st.bot.dock == st


# ------------------------------------------------------------------ the parts
func _unpowered() -> void:
	var li := _hall_lights()
	say(level.systems.state.get("power", "") == "off" and li[0] < 0.3 and li[1] > 0.3,
		"main power starts off: the Generator Hall's lights burn at %d%% and red" % roundi(li[0] * 100.0))
	say(not await _door_opens(), "  the Lab's door, which needs power, stays shut when you come up to it")
	var rose := await _lift_rises()
	say(rose < 0.1, "  the lift, which needs power, stays put with you on it (rose %.1f m)" % rose)
	var con := await _console()
	say(not con[0], "  the lab console, which needs power, does not answer")
	var gen: Node = thing("gen_panel")
	gen.use(pl)
	await frames(2)
	var labels: Array = Game.interaction.offered().map(func(x: Array) -> String: return str(x[1]))
	Game.hud.close_panel()
	var diag: Array = labels.filter(func(s: String) -> bool: return s.begins_with("Run the diagnostics"))
	say(not diag.is_empty() and str(diag[0]).contains("[needs Main power ON]"), "  the generator panel's diagnostics say what they need (%s)" % (diag[0] if not diag.is_empty() else "-"))
	var fab: Maker = thing("fab") as Maker
	await frames(240)
	say(fab != null and fab.count == 0, "  the fabricator, which needs power, makes nothing in 4 s")
	var st := _station()
	st.bot.alert()
	await frames(60)
	say(_docked(), "  the station, which needs power, keeps its robot in when it is woken")


func _powered(told: Array) -> void:
	var picked := await pick(thing("gen_panel"), "Start the generator")
	await frames(5)
	var ev: Array = told.filter(func(p: Dictionary) -> bool: return p.get("system") == "power")
	var li := _hall_lights()
	say(picked and level.systems.state.get("power") == "on" and not ev.is_empty() and ev[-1].get("state") == "on" and ev[-1].get("was") == "off"
		and absf(li[0] - 1.0) < 0.01, "the generator panel starts the generator: power on, system.changed says so (from %s), and the lights are back (%d%%)" % [
		ev[-1].get("was", "-") if not ev.is_empty() else "-", roundi(li[0] * 100.0)])
	say(await _door_opens(), "  the Lab's door opens for you")
	var rose := await _lift_rises()
	say(rose > 2.0, "  the lift takes you up (%.1f m)" % rose)
	var con := await _console()
	say(con[0] and str(con[1]).contains("Main power: ON"), "  the lab console answers, with the power's state in its words (\"%s\")" % str(con[1]).strip_edges())
	var fab: Maker = thing("fab") as Maker
	await frames(240)
	say(fab.count >= 1, "  the fabricator makes (%d in 4 s)" % fab.count)
	var st := _station()
	st.bot.alert()
	await frames(120)
	say(not _docked(), "  the station lets its robot out when it is woken")
	for a in level.actors.duplicate():
		if is_instance_valid(a) and not a.dead:
			a.hurt(a.hp * 10.0 + 10000.0, {"type": "physical"})
	await frames(30)


func _security() -> void:
	var laser: Trap = thing("laser") as Trap
	var on_before: bool = laser.enabled
	await pick(thing("sec_panel"), "Shut security down")
	await frames(5)
	say(on_before and not laser.enabled and level.systems.state.get("security") == "off", "security shut down: the laser, which needs it, goes off")
	var noticed := []
	var listen := func(p: Dictionary) -> void:
		noticed.append(p)
	Events.on("actor.noticed", listen)
	var m := level.spawn_thing({"actor": "custodian", "at": [1, 10], "still": true, "face": "w"}, Vector2i(1, 10)) as Actor      # in the Lab, behind its door: out of sight and earshot
	await frames(5)
	await pick(thing("sec_panel"), "Raise the alert")
	await frames(10)
	Events.off("actor.noticed", listen)
	var lit: Array = level.lights_by_room.get("The Security Office", [])
	var red: bool = not lit.is_empty() and (lit[0] as Light3D).light_color.r > 0.8 and (lit[0] as Light3D).light_color.g < 0.4
	var how: Array = noticed.filter(func(p: Dictionary) -> bool: return p.get("key", "") == level.key_of(m))
	say(laser.enabled and m.awake and red, "  on alert: the laser is back, the level's alarm wakes a Custodian asleep in the Lab (it says %s), and the office lights go red" % (how[0].get("how", "-") if not how.is_empty() else "-"))
	await pick(thing("sec_panel"), "Stand down")
	m.hurt(m.hp * 10.0 + 10000.0, {"type": "physical"})
	await frames(20)


func _air() -> void:
	var at := level.center(Vector2i(10, 9)) + Vector3(0, 1.0, 0)
	var running := await _cloud_lasts(at)
	await pick(thing("gen_panel"), "Switch the ventilation")
	await frames(5)
	var still := await _cloud_lasts(at)
	say(level.systems.state.get("air") == "off" and running < still, "a cloud clears sooner while the air runs (%.1f s running, %.1f s off)" % [running, still])


## How long a 4 s cloud hangs here now, in seconds.
func _cloud_lasts(at: Vector3) -> float:
	var cl := Cloud.make(level, at, {"time": 4.0, "damage": 0.0, "radius": 1.5})
	var n := 0
	while is_instance_valid(cl) and n < 900:
		await frames(5)
		n += 5
	return n / 60.0


func _remembered() -> void:
	var before: Dictionary = level.systems.remember()
	go(Vector2i(2, 6))
	main.start_level(main.level_id())
	await frames(5)
	level = main.level
	pl = main.player
	var li := _hall_lights()
	var vent: Trap = thing("vent") as Trap
	say(JSON.stringify(level.systems.remember()) == JSON.stringify(before) and absf(li[0] - 1.0) < 0.01 and not vent.enabled,
		"left and entered again, every system is as it was (%s): the lights stay on, the vent stays off with the air" % JSON.stringify(before))
