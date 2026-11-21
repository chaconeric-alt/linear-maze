extends SelfTestPart
## The saved state. A version-0 bunker file (tests/fixtures/havenot_home_v0.json, the shape of user://havenot_home.json
## before worlds) becomes a world with everything in its place; a world written out and read back is the same world;
## retiring keeps the world and hands the bunker to a new character; and Profile and Game are fronts over State, so
## there is one copy of every number. Works on a scratch State of its own (the run's is not touched), waits no frames,
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
	scratch.free()
	say(is_same(Profile.d, State.home()) and is_same(Game.haul, State.run()["haul"]) and is_same(Game.stats, State.run()["stats"])
		and is_same(Game.keys, State.run()["keys"]) and Game.credits == int(State.run()["credits"]),
		"the bunker (Profile) and the run (Game) are read from State: one copy of every number")
	say(State.memory_only, "the self-test keeps the state in memory only")


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
