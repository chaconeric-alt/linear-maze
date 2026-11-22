extends SelfTestPart
## Restocking and making safe (Restock, SPEC.md 5.18). First on a made-up level's memory, so every rule is seen on every
## level: a station makes its robot again after its days, and shuts over it; a breeding tank makes no more than "max",
## and only of its kinds on its own storey; "faster" counts the days twice over while the boss lives; nothing is made
## for something nobody makes (a cyber-zombie); a maker that is gone, switched off or in a safe level makes nothing; a
## wait of "one to six days" is always one of those, the same each time. A tool an option needs (the "carrying" gate)
## is asked for, and once it is in the pack the option goes ahead.
## pass_time moves the world's day on. Then, where the level has a maker of its own that is on (Staff Only's shut robot
## stations), in play: one of what it makes is destroyed; the level is finished alive (a day goes by) and come back to:
## it has been made again, where the level put it (a station's robot docked in its station, shut again); made safe
## (make_safe), the map says SAFE, and destroyed again, the level's memory as it would be left, with its own data, gets
## nothing back for six more days. (The same day nothing comes back: the memory part, and the rules here.)


func run() -> void:
	var day := State.day()
	Game.run_effects([{"type": "pass_time", "days": 2}])
	say(State.day() == day + 2, "pass_time moves the world's day on (day %d)" % State.day())
	_rules()
	_wait_range()
	_carrying_gate()
	await _in_play()


# ------------------------------------------------------------------ the rules, on a made-up memory
func _plan() -> Array:
	return [
		{"key": "s", "e": {"station": "st", "actor": "bot", "shut": true, "restock": {"every": 2}}},
		{"key": "g1", "e": {"actor": "grub", "level": 1}},
		{"key": "g2", "e": {"actor": "grub", "level": 1}},
		{"key": "g0", "e": {"actor": "grub"}},
		{"key": "tank", "e": {"prop": "tank", "level": 1, "restock": {"makes": ["grub"], "every": 3, "max": 1}}},
		{"key": "boss", "e": {"actor": "boss", "level": 1}},
		{"key": "tank0", "e": {"prop": "tank", "restock": {"makes": ["grub"], "every": 4, "off": "tank0_off", "faster": {"while": "boss", "times": 2}}}},
		{"key": "z", "e": {"actor": "zombie"}},
	]


func _rules() -> void:
	var plan := _plan()
	var mem := {"gone": ["s/robot", "g1", "g2", "g0", "z"], "things": {"s": {"released": true}}, "flags": {}}
	var b0 := Restock.catch_up(mem, plan, 0, {})
	var b1 := Restock.catch_up(mem, plan, 1, {})
	var b2 := Restock.catch_up(mem, plan, 1, {})
	say(b0.is_empty() and b1.is_empty() and b2.has("s/robot") and not mem["things"]["s"].has("released"),
		"a station makes its robot again after its two days, not on the same day, and shuts over it (day 1: %s; day 2: %s)" % [b1, b2])
	say(b2.has("g0"), "a tank that waits four days makes one in two while the boss is alive (%s)" % [b2])
	var b3 := Restock.catch_up(mem, plan, 5, {})
	say(b3 == ["g1"] and (mem["gone"] as Array).has("g2"), "a tank makes no more than its max, and only on its own storey (%s; still gone: %s)" % [b3, mem["gone"]])
	say((mem["gone"] as Array).has("z"), "what nobody makes stays gone")
	mem["gone"].append("g0")
	mem["flags"]["tank0_off"] = true
	var b4 := Restock.catch_up(mem, plan, 10, {})
	say(not b4.has("g0"), "a maker whose off flag is set makes nothing (%s)" % [b4])
	mem["gone"].append("s/robot")
	mem["safe"] = true
	say(Restock.catch_up(mem, plan, 10, {}).is_empty() and (mem["gone"] as Array).has("s/robot"), "in a safe level nothing is made")
	var q := [{"key": "q", "e": {"actor": "queen", "restock": {"makes": ["grub"], "every": 1}}}, {"key": "g", "e": {"actor": "grub"}}]
	var alive := Restock.catch_up({"gone": ["g"]}, q, 1, {})
	var dead := Restock.catch_up({"gone": ["g", "q"]}, q, 5, {})
	say(alive == ["g"] and dead.is_empty(), "a maker that is gone itself (a breeder killed) makes nothing (alive: %s; dead: %s)" % [alive, dead])
	var p := [{"key": "bay", "e": {"rebuild": {"actors": ["bot"], "off": "bay_off"}, "restock": {"every": 1}}}, {"key": "b", "e": {"actor": "bot"}}]
	var bay := Restock.catch_up({"gone": ["b"], "flags": {"bay_off": true}}, p, 3, {})
	var world := Restock.catch_up({"gone": ["b"]}, [{"key": "bay", "e": {"rebuild": {"actors": ["bot"]}, "restock": {"every": 1, "off": "world:grid_down"}}}, p[1]], 3, {"world:grid_down": true})
	say(bay.is_empty() and world.is_empty(), "a repair bay switched off by its own flag, or by a world flag, makes nothing")


func _wait_range() -> void:
	var r := {"every": [1, 6]}
	var seen := {}
	var same := true
	for n in 40:
		var w := Restock.wait(r, "bay", n)
		seen[int(w)] = true
		same = same and Restock.wait(r, "bay", n) == w
	say(seen.keys().all(func(d: int) -> bool: return d >= 1 and d <= 6) and seen.size() >= 4 and same,
		"a wait of one to six days is one of those (seen: %s), the same each time" % [seen.keys()])


# ------------------------------------------------------------------ a tool an option needs (on a stand-in for the panel session)
class FakePanel:
	var shown := ""

	func panel_text() -> String:
		return "PANEL"

	func show_panel(text: String, _working := "") -> void:
		shown = text


func _carrying_gate() -> void:
	var id := ""
	for k in LM.defs.get("items", {}):
		if LM.defs["items"][k].get("kind", "") == "treasure" and not Carrying.carries(pl, k):
			id = k
			break
	if id == "":
		print("INFO  no treasure to test the carrying gate with")
		return
	var gates := OptionGates.new()
	var panel := FakePanel.new()
	var o := {"carrying": [id], "missing": "You need the thing."}
	var refused := not gates.carrying(o, panel) and panel.shown.contains("You need the thing.")
	Game.haul[id] = 1
	var ok := gates.carrying(o, panel)
	Game.haul.erase(id)
	say(refused and ok, "an option that needs %s is refused without it, and goes ahead with it in the pack" % id)


# ------------------------------------------------------------------ in play, where the level has a maker
## Days count only for a level that has been left, as they do in the game: the level is finished alive (a day goes by,
## and what was carried is banked) and come back to the next day, as a new expedition.
func _in_play() -> void:
	var made := _made_by_makers()
	if made.is_empty():
		print("INFO  no maker in this level that is on and makes anything still alive")
		return
	var k: String = made[0]
	var a: Actor = level.thing(k)
	a.hurt(1.0e9, {"type": "test"})
	await frames(10)
	say(a.dead, "one of what a maker makes is destroyed (%s)" % k)
	var day := State.day()
	Game.finish({})
	await frames(3)
	await _again()
	var back: Array = level.restocked
	var b: Variant = level.thing(k)
	var home := true
	if k.ends_with("/robot"):                            # a station's robot is back in its station, which is shut again
		var stn: Variant = level.thing(k.trim_suffix("/robot"))
		home = stn is Station and (stn as Station).bot == b and not (stn as Station).released
	say(State.day() == day + 1 and back.has(k) and b is Actor and not (b as Actor).dead and home,
		"out alive and back the next day, its maker has made it again, where the level put it (%s)" % [back])
	Game.run_effects([{"type": "make_safe"}])
	say(State.is_safe() and HudMap.corner(1, 0, State.is_safe()) == "SAFE", "made safe, the map says so")
	if not b is Actor:
		return
	(b as Actor).hurt(1.0e9, {"type": "test"})
	await frames(10)
	var mem: Dictionary = State.memory().duplicate(true)
	mem.merge(level.remember(), true)                    # the memory as it would be left now
	say((mem["gone"] as Array).has(k) and Restock.catch_up(mem, level.spawner.plan(), 6, State.flags_for("world:")).is_empty(),
		"destroyed again in a safe level, six more days would bring nothing back")


## Come into the level again (start_level: after Game.finish, a new expedition).
func _again() -> void:
	main.start_level(main.level_id())
	await frames(3)
	level = main.level
	pl = main.player


## The keys of things alive now that the level's makers make, the makers that are on (an earlier part may have shut the
## Anomalous Structure's Repair Bay down).
func _made_by_makers() -> Array:
	var out: Array = []
	var plan := level.spawner.plan()
	for st in plan:
		var e: Dictionary = st.get("e", {})
		if not e.has("restock") or Restock.off(e, State.memory(), State.flags_for("world:")):
			continue
		var keys: Array = []
		if e.has("station"):
			keys.append(st["key"] + "/robot")
		else:
			var kinds: Array = e["restock"].get("makes", e.get("rebuild", {}).get("actors", []))
			for o in plan:
				var oe: Dictionary = o.get("e", {})
				if oe.has("actor") and kinds.has(oe["actor"]) and int(oe.get("level", 0)) == int(e.get("level", 0)):
					keys.append(o["key"] + "/robot" if oe.has("station") else o["key"])
		for key in keys:
			var n: Variant = level.thing(key)
			if n is Actor and not (n as Actor).dead:
				out.append(key)
	return out
