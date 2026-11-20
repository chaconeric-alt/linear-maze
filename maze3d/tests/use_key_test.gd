extends SelfTestPart
## The E key really reaches the player (a key event, not a direct call), and F switches the lamp.


func run() -> void:
	for n in get_tree().get_nodes_in_group("usable"):
		if is_instance_valid(n) and n is Prop and n.e.get("use", {}).get("type", "") == "cache" and n.used == 0:
			pl.global_position = n.global_position + n.global_transform.basis.z * 1.8 + Vector3(0, 0.05, 0)
			look_at(n.global_position + Vector3(0, 1.2, 0))
			await frames(3)
			say(pl.focus == n, "a cache in front of you is offered for use")
			var was_easy := Game.easy
			Game.easy = true
			var told: Array = []
			var hear := func(title: String, _detail: String): told.append(title)
			Game.identified.connect(hear)
			for k in [KEY_F, KEY_E]:
				var ev := InputEventKey.new()
				ev.keycode = k
				ev.physical_keycode = k
				ev.pressed = true
				Input.parse_input_event(ev)
				await frames(3)
			say(n.used > 0, "pressing E opens it")
			say(not told.is_empty(), "  and in easy mode says what it is (%s)" % (told[0] if not told.is_empty() else "nothing"))
			Game.identified.disconnect(hear)
			Game.easy = was_easy
			say(not pl.lamp.visible, "pressing F switches the lamp")
			break
