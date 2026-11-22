extends SelfTestPart
## The Descent's own test (it runs instead of the standard parts): travel between the levels of an installation
## (Installations, Main.travel, Arrival; SPEC.md 5.19). The installation is in the game's data with two ways in, and
## the bunker's lift lists it once, by name; coming in by the service shaft puts the player there. On Level 1 a roach is
## killed and a crystal taken; the lift out of the level, ridden past its one stop, carries the expedition down: the
## player arrives at Level 2's lift as they left (health, weapons, ammo, gear), with the same run (credits, haul) and the
## same departure copy, no expedition ended or begun; Level 1 is remembered; standing on the lift they arrived on does
## not take them straight back. A save made down there comes back down there, as it was. The stairs carry them up to
## Level 1's stairwell, which is as they left it. The gate ends the expedition and banks both crystals. Then a second expedition
## goes down, kills Level 2's roach and dies there: both levels go back to how that expedition found them.


func replaces_standard() -> bool:
	return true


func run() -> void:
	_in_the_data()
	await _ways_in()
	await _down_and_up()
	await _out()
	await _death_below()


## The installation in the game's data, and in the bunker's lift.
func _in_the_data() -> void:
	var ways := Installations.entrances("descent")
	say(Installations.has("descent") and ways.size() == 2 and Installations.start_of("descent") == "descent_1"
		and Installations.start_of("descent", 1) == "descent_1@shaft" and Installations.of_level("descent_2") == "descent",
		"the Descent is an installation of two levels with two ways in (%s)" % [ways.map(func(w: Dictionary) -> String: return str(w.get("name")))])
	say(Installations.split("descent_1@shaft") == ["descent_1", "shaft"] and Installations.split("descent_2") == ["descent_2", ""],
		"\"<level>@<way in>\" names a way in")
	var listed := 0
	for id in LM.game.get("menu", []):
		listed += 1 if id == "descent" else 0
	say(listed == 1 and not (LM.game.get("menu", []) as Array).has("descent_2"), "the game's menu lists it once, by the installation")
	say(not level.arrival("shaft").is_empty() and not level.arrival("lift").is_empty() and level.arrival("nowhere").is_empty(),
		"Level 1 has its named ways in (shaft, lift, stairs)")


## Coming in by the service shaft.
func _ways_in() -> void:
	say(level.cell_of(pl.global_position) == level.start_cell, "started at the front gate, the level's start")
	main.start_level("descent_1@shaft")
	await frames(3)
	_again()
	var a := level.arrival("shaft")
	say(main.level_id() == "descent_1" and level.cell_of(pl.global_position) == a["cell"], "coming in by the service shaft puts the player there (%s)" % [level.cell_of(pl.global_position)])


func _again() -> void:
	level = main.level
	pl = main.player


func _down_and_up() -> void:
	await frames(40)                                 # pickups arm half a second after a level is built
	var roach := _first("actor", "roach")
	(level.thing(roach) as Actor).hurt(1.0e9, {"type": "test"})
	await take("crystal")
	await frames(10)
	pl.hp = 63.0
	var kit := _kit()
	var run_was := JSON.stringify([Game.credits, Game.haul])
	var dep := JSON.stringify(State.run().get("departure", {}))
	var runs := _count("run.started") + _count("run.ended")
	var crystal := _first("item", "crystal")
	await _ride_lift("descent_2")
	var a := level.arrival("lift")
	say(main.level_id() == "descent_2" and level.cell_of(pl.global_position) == a["cell"], "the lift out of the level carries the player down to Level 2's lift")
	say(_kit() == kit, "  as they left (%s)" % _kit())
	say(JSON.stringify([Game.credits, Game.haul]) == run_was and JSON.stringify(State.run().get("departure", {})) == dep
		and _count("run.started") + _count("run.ended") == runs and _last_entry() == "travel",
		"  the same expedition: the same run (%s), the same departure copy, none ended or begun, entered by travel" % run_was)
	var one: Dictionary = State.data["levels"].get("descent_1", {})
	say((one.get("gone", []) as Array).has(crystal) and (one.get("gone", []) as Array).has(roach) and one.has("left"),
		"  Level 1 is remembered: its crystal taken, its roach dead")
	await frames(120)
	say(main.level_id() == "descent_2", "standing on the lift they arrived on does not take them straight back")
	var saved: String = main.save_game(true)        # a save made down here, then the crystal taken after it ...
	var haul_saved := JSON.stringify(Game.haul)
	await take("crystal")
	main.restore_game()                              # ... is come back to: Level 2, the crystal not yet taken
	await frames(40)
	_again()
	say(saved != "" and main.level_id() == "descent_2" and int(Game.haul.get("crystal", 0)) == 1 and level.thing(_first("item", "crystal")) != null,
		"a save made on Level 2 comes back to Level 2, as it was (%s)" % haul_saved)
	await take("crystal")
	await _use_travel("descent_1")
	a = level.arrival("stairs")
	say(main.level_id() == "descent_1" and level.cell_of(pl.global_position) == a["cell"] and level.thing(crystal) == null and level.thing(roach) == null,
		"the stairs carry them up to Level 1's stairwell, which is as they left it")


## The gate ends the expedition; what was carried is banked.
func _out() -> void:
	var had := int(Profile.d.get("salvage", {}).get("crystal", 0))
	var n := int(Game.haul.get("crystal", 0))
	var day := State.day()
	for p in level.get_children():
		if p is Prop and str(p.e.get("use", {})).contains("\"end\""):
			p.use(pl)
	await frames(5)
	say(Game.over and n == 2 and int(Profile.d.get("salvage", {}).get("crystal", 0)) == had + n and State.day() == day + 1,
		"out by the gate: the expedition ends, and both crystals are banked (%d)" % n)


## A second expedition dies on Level 2: both levels go back to how it found them.
func _death_below() -> void:
	main.start_level("descent_1")
	await frames(3)
	_again()
	var two_was := JSON.stringify(State.data["levels"].get("descent_2", {}).get("gone", []))
	await _use_travel("descent_2")
	var roach := _first("actor", "roach")
	(level.thing(roach) as Actor).hurt(1.0e9, {"type": "test"})
	await frames(10)
	Game.finish({"dead": true, "by": "the Descent's test"})
	await frames(3)
	main.start_level("descent_1")
	await frames(3)
	_again()
	say(JSON.stringify(State.data["levels"].get("descent_2", {}).get("gone", [])) == two_was,
		"a death on Level 2 puts it back as the expedition found it (its roach alive again)")


# ------------------------------------------------------------------ helpers
## Stand on the lift out of the level until it has carried the player to `to`.
func _ride_lift(to: String) -> void:
	var lf: Lift = level.lifts[0]
	go(level.cell_of(lf.global_position))
	await _arrive(to)


## Use the thing whose use travels (the stairs) until the player is in `to`.
func _use_travel(to: String) -> void:
	for p in level.get_children():
		if p is Prop and str(p.e.get("use", {})).contains("\"travel\""):
			go(level.cell_of(p.global_position) + Vector2i(-1, 0))
			p.use(pl)
			break
	await _arrive(to)


func _arrive(to: String) -> void:
	var n := 0
	while main.level_id() != to and n < 300:
		await frames(1)
		n += 1
	await frames(3)
	_again()


## The player as they are, without where they stand.
func _kit() -> String:
	var k := SavePoint.player_of(pl)
	for w in ["at", "yaw", "pitch"]:
		k.erase(w)
	return JSON.stringify(k)


## The key of the first thing in the level's data of that kind ("actor" / "item") and id.
func _first(kind: String, id: String) -> String:
	for st in level.spawner.plan():
		if st.get("e", {}).get(kind, "") == id:
			return st["key"]
	return ""


func _count(ev: String) -> int:
	return Events.recorded().filter(func(e: Array) -> bool: return e[0] == ev).size()


func _last_entry() -> String:
	var how := ""
	for e in Events.recorded():
		if e[0] == "level.entered":
			how = str(e[1].get("how", ""))
	return how
