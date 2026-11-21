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
	var after: Dictionary = level.remember()
	var differ := memory_differs(before, after)
	say(differ["gone"].is_empty(), "everything gone stays gone (%d%s)" % [before["gone"].size(), "" if differ["gone"].is_empty() else "; back: %s" % ", ".join(differ["gone"].slice(0, 5))])
	say(differ["extra"].is_empty(), "what was made while playing is there again, where it was (%d%s)" % [before["extra"].size(), "" if differ["extra"].is_empty() else "; not: %s" % ", ".join(differ["extra"].slice(0, 5))])
	say(differ["things"].is_empty(), "every thing remembers what it did (%d things%s)" % [before["things"].size(), "" if differ["things"].is_empty() else "; not: %s" % "; ".join(differ["things"].slice(0, 3))])
	say(JSON.stringify(Game.flags) == flags and JSON.stringify(Game.keys) == keys and JSON.stringify(State.memory()["used"]) == used,
		"the level's flags, key cards and used panel options are as they were (%d flags, %d cards)" % [Game.flags.size(), Game.keys.size()])
	var tb: Dictionary = before.get("triggers", {})
	var ta: Dictionary = after.get("triggers", {})
	say(JSON.stringify(tb.get("fired", [])) == JSON.stringify(ta.get("fired", [])) and tb.get("explored", []).size() == ta.get("explored", []).size(),
		"its triggers and its map are as they were (%d gone off, %d cells explored)" % [tb.get("fired", []).size(), tb.get("explored", []).size()])

