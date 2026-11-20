extends SelfTestPart
## Containers, stations and terminals: every one can be used (terminals pause the world and every option is
## chosen); then every crate and barrel breaks.


func run() -> void:
	for n in get_tree().get_nodes_in_group("usable"):
		if not is_instance_valid(n) or not (n is Prop):
			continue
		var kind: String = n.e.get("use", {}).get("type", "effects")
		if kind == "terminal" or kind == "read":
			var opts: Array = n.e["use"].get("options", [])
			var ending := false
			for i in opts.size():
				if str(opts[i].get("effects", "")).contains("\"end\""):
					ending = true
			if ending:
				continue
			n.use(pl)
			say(Game.hud.in_panel() and get_tree().paused, "terminal opens and pauses the world: " + n.e["use"].get("title", "?"))
			for i in opts.size():
				await Game.interaction.choose(i)
			Game.hud.close_panel()
			await frames(3)
		elif kind == "heal":
			pl.hp = 50
			n.use(pl)
			say(pl.hp > 50, "health station heals")
			pl.hp = pl.max_hp
		elif kind != "effects":
			var before := level.get_child_count()
			n.use(pl)
			await frames(4)
			say(n.used > 0, "%s opens (%d things out)" % [n.e["prop"], level.get_child_count() - before])
			Game.hud.close_panel()
	await frames(40)
	# --- breakables
	var broke := 0
	for n in get_tree().get_nodes_in_group("breakable"):
		if is_instance_valid(n):
			n.hurt(999.0, {"type": "bullet"})
			broke += 1
	await frames(20)
	say(get_tree().get_nodes_in_group("breakable").is_empty(), "%d crates and barrels break" % broke)
