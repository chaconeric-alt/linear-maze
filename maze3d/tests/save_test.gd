extends SelfTestPart
## Saving any time. The game is saved where the other parts have got to (the level as they left it, the player where
## they stand); then play goes on (the player moved, hurt and out of ammo, credits found, a flag set) and the save is
## come back to (Main.restore_game, as F10 and Restore from save do): the same level, not counted as a visit; the
## player back where they stood, as they were; the run, the level's flags, key cards and used panel options as they
## were at the save, and the flag set since gone; and the level as it was at the save. Then the player dies: the save
## is at once the world as the expedition found it (nothing of the run, no place in a level), while the world in
## memory waits for the level to go; and the level is carried on with, as the traps part does. Runs after memory,
## before finish, which then plays the level as it was come back to (the runner is pointed at the new level).

const AFTER := "save_test_set_after_saving"


func run() -> void:
	var text: String = main.save_game(true)
	var where: Dictionary = State.run().get("where", {})
	say(text != "" and where.get("level", "") == State.level_key, "the game saves mid-level, with its place (%s)" % where.get("level", "none"))
	var before: Dictionary = level.remember()
	var was: Dictionary = SavePoint.player_of(pl)
	var run_was := _run_now()
	var visits := int(State.memory().get("visits", 0))
	var key: String = State.level_key
	_play_on()
	var back: bool = main.restore_game()
	level = main.level
	pl = main.player
	say(back and State.level_key == key and int(State.memory().get("visits", 0)) == visits,
		"the save is come back to: the same level, not counted as a visit (%s, visit %d)" % [State.level_key, int(State.memory().get("visits", 0))])
	var now: Dictionary = SavePoint.player_of(pl)
	var moved := _at(now).distance_to(_at(was))
	say(moved < 0.01 and absf(float(now["yaw"]) - float(was["yaw"])) < 0.001 and _plain(_kit(now)) == _plain(_kit(was)),
		"the player is back where they stood, as they were (%.2f m off; %d hp, %d armour, %d weapons, holding %d)" % [moved, int(now["hp"]), int(now["armor"]), now["weapons"].size(), int(now["current"])])
	await frames(3)
	level = main.level
	pl = main.player
	say(_run_now() == run_was and not Game.has_flag(AFTER), "the run, the level's flags, key cards and used panel options are as they were at the save (%d cr, %d flags, %d cards)" % [Game.credits, Game.flags.size(), Game.keys.size()])
	var differ := memory_differs(before, level.remember())
	var wrong: Array = differ["gone"] + differ["extra"] + differ["things"]
	say(wrong.is_empty(), "the level is as it was at the save (%d gone, %d made while playing, %d things%s)" % [before["gone"].size(), before["extra"].size(), before["things"].size(), "" if wrong.is_empty() else "; not: %s" % "; ".join(wrong.slice(0, 3))])
	_death()


## A death in play (Game.finish, as the player's own death calls it).
func _death() -> void:
	var copy: Dictionary = State.run().get("departure", {})
	var now := _plain([State.data["world"], State.data["levels"]])
	Game.finish({"dead": true, "by": "the save test"})
	var s: Dictionary = State.saved()
	say(not copy.is_empty() and not s.get("run", {}).has("where") and int(s.get("run", {}).get("credits", -1)) == 0
		and _plain([s.get("world"), s.get("levels")]) == _plain([copy.get("world"), copy.get("levels")]) and _plain([State.data["world"], State.data["levels"]]) == now,
		"a death saves the world as the expedition found it, at once (%d levels remembered then); the world in memory waits for the level to go" % copy.get("levels", {}).size())
	pl.dead = false
	Game.over = false
	main.carry_on()


## Play goes on after the save, changing what a save keeps.
func _play_on() -> void:
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	pl.rotation.y += 1.0
	pl.hp = maxf(1.0, pl.hp * 0.5)
	for k in pl.ammo:
		pl.ammo[k] = 0
	Game.credits += 7
	Game.set_flag(AFTER)


## The run and the level's marks as they stand, as plain data (a save comes back through JSON, so whole numbers come
## back as decimals: both sides are put through it).
func _run_now() -> String:
	var st: Dictionary = Game.stats.duplicate()
	st.erase("time")                                 # (time goes on)
	return _plain([Game.credits, Game.haul, st, Game.flags, Game.keys, State.memory()["used"]])


## What the player carried and how they were, without where.
func _kit(p: Dictionary) -> Dictionary:
	var k := p.duplicate()
	k.erase("at")
	k.erase("yaw")
	return k


func _at(p: Dictionary) -> Vector3:
	return Vector3(p["at"][0], p["at"][1], p["at"][2])


func _plain(v: Variant) -> String:
	return JSON.stringify(JSON.parse_string(JSON.stringify(v)))
