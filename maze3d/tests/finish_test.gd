extends SelfTestPart
## Objectives and the way out: whatever ends the level is used, and the level is finished.


func run() -> void:
	Game.hud.refresh()
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
