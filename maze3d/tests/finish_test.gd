extends SelfTestPart
## Objectives and the way out: every way home is marked, a square of light on its cell's floor and its own colour on
## the map; whatever ends the level is used, and the level is finished; coming out alive, a day goes by (State.day,
## which Restock counts).


func run() -> void:
	_way_home()
	Game.hud.refresh()
	var day := State.day()
	print("INFO  flags: ", Game.flags.keys())
	print("INFO  objective now: ", Game.hud.objective_text())
	for n in get_tree().get_nodes_in_group("usable"):
		if is_instance_valid(n) and n is Prop and str(n.e.get("use", {})).contains("\"end\""):
			n.use(pl)
			if Game.hud.in_panel():
				var opts2: Array = n.e["use"].get("options", [])
				for i in opts2.size():
					if str(opts2[i]).contains("\"end\""):
						await Game.interaction.choose(i)
	await frames(5)
	say(Game.over, "the level can be finished")
	say(State.day() == day + 1, "coming out alive, a day goes by (day %d)" % State.day())



## Every placed thing whose use ends the expedition has a square of light on the floor over its own cell, and the map
## draws that cell in the way-home colour; there is one square for each, and no other.
func _way_home() -> void:
	var homes: Array = []
	for n in get_tree().get_nodes_in_group("usable"):
		if is_instance_valid(n) and n is Prop and n.e.has("at") and LevelWayHome.ends(n.e.get("use")):
			homes.append(n)
	if homes.is_empty():
		print("INFO  no way home placed here to mark")
		return
	var lit := 0
	var on_map := 0
	for n in homes:
		var p := Vector2i(int(n.e["at"][0]), int(n.e["at"][1]))
		var mid := level.center(p, int(n.e.get("level", 0)) * level.H)
		var f := level.floor_of(mid + Vector3(0, 0.5, 0))
		for m in level.way_home_marks():
			var half: Vector2 = m.get_meta("half", Vector2.ZERO)
			if absf(m.global_position.x - mid.x) < half.x and absf(m.global_position.z - mid.z) < half.y and absf(m.global_position.y - f * level.H) < 0.5:
				lit += 1
				break
		on_map += 1 if HudMap.cell_color(level, p, f, Color.WHITE) == LevelWayHome.color() else 0
	say(lit == homes.size() and on_map == homes.size() and level.way_home_marks().size() == homes.size(),
		"every way home is marked: a square of light on its floor (%d of %d) and its own colour on the map (%d of %d), and no other square (%d in all)" % [lit, homes.size(), on_map, homes.size(), level.way_home_marks().size()])
