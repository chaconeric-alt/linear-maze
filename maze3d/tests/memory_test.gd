extends SelfTestPart
## Levels remember. The level as the other parts have left it (things taken, monsters killed, caches opened, doors
## unlocked, terminals used, flags set) is left, and entered again: what was gone stays gone, what was made while
## playing is there again, every thing that remembered something remembers the same, and the level's flags, key cards,
## used panel options, triggers and map are as they were. Runs late, before finish, which then plays the level as it
## was entered again (the runner is pointed at the new level).


func run() -> void:
	var before: Dictionary = level.remember()
	var flags := JSON.stringify(Game.flags)
	var keys := JSON.stringify(Game.keys)
	var used := JSON.stringify(State.memory()["used"])
	var key: String = State.level_key
	main.start_level(main.level_id())
	await frames(3)
	level = main.level
	pl = main.player
	say(State.level_key == key and int(State.memory().get("visits", 0)) >= 2, "the level is entered again under the same key (%s, visit %d)" % [key, int(State.memory().get("visits", 0))])
	var back: Array = []
	for k in before["gone"]:
		if level.thing(k) != null:
			back.append(k)
	say(back.is_empty(), "everything gone stays gone (%d%s)" % [before["gone"].size(), "" if back.is_empty() else "; back: %s" % ", ".join(back.slice(0, 5))])
	var lost: Array = []
	for k in before["extra"]:
		var n: Node = level.thing(k)
		var at: Array = before["extra"][k]["at"]
		var off: Vector3 = (n as Node3D).global_position - Vector3(at[0], at[1], at[2]) if n != null else Vector3.INF
		var near := 0.5
		if n is Actor and (n as Actor).climb != null:
			off.y = 0.0                              # a climber made again makes for the nearest wall to perch, as when
			near = level.C                           # it was placed: within a cell of where it was
		if n == null or off.length() > near:
			lost.append(k)
	say(lost.is_empty(), "what was made while playing is there again, where it was (%d%s)" % [before["extra"].size(), "" if lost.is_empty() else "; not: %s" % ", ".join(lost.slice(0, 5))])
	var after: Dictionary = level.remember()
	var differ: Array = []
	for k in before["things"]:
		var was: Dictionary = before["things"][k].duplicate()
		if before["extra"].has(k):                   # made again where it was: its spot is in its "extra" record, so
			was.erase("at")                          # it no longer reports having moved from it
			was.erase("yaw")
		if not _like(was, after["things"].get(k, {})):
			differ.append("%s %s -> %s" % [k, JSON.stringify(before["things"][k]), JSON.stringify(after["things"].get(k, {}))])
	say(differ.is_empty(), "every thing remembers what it did (%d things%s)" % [before["things"].size(), "" if differ.is_empty() else "; not: %s" % "; ".join(differ.slice(0, 3))])
	say(JSON.stringify(Game.flags) == flags and JSON.stringify(Game.keys) == keys and JSON.stringify(State.memory()["used"]) == used,
		"the level's flags, key cards and used panel options are as they were (%d flags, %d cards)" % [Game.flags.size(), Game.keys.size()])
	var tb: Dictionary = before.get("triggers", {})
	var ta: Dictionary = after.get("triggers", {})
	say(JSON.stringify(tb.get("fired", [])) == JSON.stringify(ta.get("fired", [])) and tb.get("explored", []).size() == ta.get("explored", []).size(),
		"its triggers and its map are as they were (%d gone off, %d cells explored)" % [tb.get("fired", []).size(), tb.get("explored", []).size()])


## The same, allowing a monster to have settled a little where it was laid (its spot within half a metre).
func _like(a: Dictionary, b: Dictionary) -> bool:
	for k in a:
		if not b.has(k):
			return false
		if k == "at":
			if Vector3(a[k][0], a[k][1], a[k][2]).distance_to(Vector3(b[k][0], b[k][1], b[k][2])) > 0.5:
				return false
		elif k == "yaw" or k == "hp":
			if absf(float(a[k]) - float(b[k])) > 0.05:
				return false
		elif JSON.stringify(a[k]) != JSON.stringify(b[k]):
			return false
	return true
