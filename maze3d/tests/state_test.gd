extends SelfTestPart
## The saved state. A version-0 bunker file (tests/fixtures/havenot_home_v0.json, the shape of user://havenot_home.json
## before worlds) becomes a world with everything in its place; a world written out and read back is the same world;
## retiring keeps the world and hands the bunker to a new character; a death puts the world back as the expedition
## found it; and Profile and Game are fronts over State, so there is one copy of every number. Works on a scratch State of its own (the run's is not touched), waits no frames,
## and never touches the disk. Runs after the keys part, on every level.

const FIXTURE := "res://tests/fixtures/havenot_home_v0.json"


func run() -> void:
	var old: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(FIXTURE))
	var w: Dictionary = StateMigrations.up(old.duplicate(true))
	var home: Dictionary = w["world"]["home"]
	var same_home := true
	for k in ["credits", "weapons", "armor", "salvage", "trophies", "owned", "decor", "robot"]:
		same_home = same_home and _same(home.get(k), old[k])
	var who: Dictionary = w["characters"]["roster"][0] if not w["characters"]["roster"].is_empty() else {}
	say(int(w.get("v", 0)) == State.VERSION and same_home and w["characters"]["active"] == who.get("id", "?")
		and int(who.get("runs", 0)) == 7 and int(who.get("deaths", 0)) == 2 and int(who.get("best", 0)) == 900,
		"an old bunker file becomes a world: its bunker the home, its record the one character's (version %d)" % int(w.get("v", 0)))
	var scratch := WorldState.new()
	scratch.memory_only = true
	scratch.data = w
	var again: Dictionary = WorldState.from_json(scratch.to_json())
	say(_same(again, w), "a world written out and read back is the same world")
	var first: String = scratch.data["characters"]["active"]
	var home_was := JSON.stringify(scratch.home())
	scratch.retire()
	var roster: Array = scratch.data["characters"]["roster"]
	say(scratch.data["characters"]["active"] != first and roster.size() == 1 and JSON.stringify(scratch.home()) == home_was,
		"retiring keeps the world: the bunker stays, a new scavenger (%s) takes it over" % scratch.data["characters"]["active"])
	scratch.enter_level("a")
	scratch.set_flag("here")
	scratch.set_flag("world:everywhere")
	scratch.keys()["red"] = true
	scratch.enter_level("b")
	say(not scratch.has_flag("here") and scratch.has_flag("world:everywhere") and scratch.keys().is_empty() and scratch.data["levels"]["a"]["flags"].has("here"),
		"a flag and a key card belong to the level they were found in; a world: flag is seen everywhere")
	_death(scratch)
	scratch.free()
	say(is_same(Profile.d, State.home()) and is_same(Game.haul, State.run()["haul"]) and is_same(Game.stats, State.run()["stats"])
		and is_same(Game.keys, State.memory()["keys"]) and is_same(Game.flags, State.memory()["flags"]) and Game.credits == int(State.run()["credits"]),
		"the bunker (Profile) and the run (Game) are read from State: one copy of every number")
	say(State.memory_only, "the self-test keeps the state in memory only")


## A death on the scratch world: an expedition sets out, things change everywhere (the bunker, the character, a world
## flag, the level's memory, another level's, the run), a level is loaded mid-expedition; the death puts the world,
## its characters and its levels back as they were when the expedition set out, with nothing of the run, and keeps the
## copy only if the expedition goes on.
func _death(w: WorldState) -> void:
	w.enter_level("a")
	w.home()["credits"] = 50
	w.depart()
	var was := JSON.stringify([w.data["world"], w.data["characters"], w.data["levels"]])
	w.enter_level("c")
	w.set_flag("taken")
	w.set_flag("world:heard")
	w.data["levels"]["a"]["gone"] = ["thing:1"]
	w.home()["credits"] = 999
	w.character()["runs"] = 9
	w.reset_run()                                    # a level loaded mid-expedition: the copy stays
	var kept_copy: bool = w.run().has("departure")
	w.run()["credits"] = 40
	w.run()["where"] = {"id": "c"}
	var dead: Dictionary = w.after_death(false)
	w.die(true)
	var now := JSON.stringify([w.data["world"], w.data["characters"], w.data["levels"]])
	say(kept_copy and now == was and JSON.stringify(dead["world"]) == JSON.stringify(w.data["world"]) and int(w.run()["credits"]) == 0
		and not w.run().has("where") and w.run().has("departure") and not dead["run"].has("departure"),
		"a death puts the world back as the expedition found it: the bunker, the characters, the world's flags, every level (%d cr in the bunker)" % int(w.home()["credits"]))


## The same, value for value (a number read back from JSON may be a float where it was written as an int).
func _same(a: Variant, b: Variant) -> bool:
	if (a is int or a is float) and (b is int or b is float):
		return float(a) == float(b)
	if a is Dictionary and b is Dictionary:
		if a.size() != b.size():
			return false
		for k in a:
			if not b.has(k) or not _same(a[k], b[k]):
				return false
		return true
	if a is Array and b is Array:
		if a.size() != b.size():
			return false
		for i in a.size():
			if not _same(a[i], b[i]):
				return false
		return true
	return typeof(a) == typeof(b) and a == b
