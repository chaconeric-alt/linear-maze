extends SelfTestPart
## Every thing has a stable key: the one its place in the level's data gives it (Spawner.plan), so a second load of the
## same level (a generated one is the same data again from its seed) gives every thing the same key. What is remembered
## about a thing is kept by that key, Interaction's used marks now and the level's memory later. Runs first, before
## anything is taken or killed, and waits no frames. Prints a digest of the keys, so two runs can be compared.


func run() -> void:
	var planned := {}
	for step in level.spawner.plan():
		if step["key"] != "":
			planned[step["key"]] = true
	var from_data := 0
	var strays: Array = []                           # keys no step of the plan (or a part of one, or a thing made in play) explains
	var lines: Array = []
	for k in level.things:
		var n: Node = level.thing(k)
		if n == null:
			continue
		var root: String = k.get_slice("/", 0)
		if planned.has(root):
			from_data += 1
		elif not root.begins_with("extra:"):
			strays.append(k)
		lines.append("%s=%s" % [k, n.get_class() if n.get_script() == null else n.get_script().get_global_name()])
	say(strays.is_empty(), "every thing's key comes from its place in the level's data (%d things; %s)" % [from_data, "none from anywhere else" if strays.is_empty() else "not: %s" % ", ".join(strays.slice(0, 5))])
	var unkeyed: Array = []
	for group in [level.actors, level.traps, level.lifts, level.targets, level.doors.values(), level.doors_up.values()]:
		for n in group:
			if is_instance_valid(n) and level.key_of(n) == "":
				unkeyed.append(n.name)
	say(unkeyed.is_empty(), "every monster, trap, lift, target and door has a key%s" % ("" if unkeyed.is_empty() else " (not: %s)" % ", ".join(unkeyed.slice(0, 5))))
	var marks_ok := true
	for n in level.things.values():
		if is_instance_valid(n) and Game.interaction.key_of(n) != level.key_of(n):
			marks_ok = false
	say(marks_ok, "used marks are kept by the same keys")
	var again := LevelData.new(level.data.duplicate(true))       # a second load: the same data read afresh
	again.parse()
	var first: Array = level.spawner.plan().map(func(st: Dictionary) -> String: return "%s@%s" % [st["key"], st["p"]])
	var second: Array = Spawner.new(level, again).plan().map(func(st: Dictionary) -> String: return "%s@%s" % [st["key"], st["p"]])
	say(first == second, "a second load of the level's data gives every thing the same key (%d steps)" % first.size())
	lines.sort()
	print("INFO  keys: %d, digest %08x" % [lines.size(), "\n".join(lines).hash() & 0xffffffff])
