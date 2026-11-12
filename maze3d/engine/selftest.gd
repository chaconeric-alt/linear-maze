extends Node
## selftest - plays a level by script and reports what broke. It walks, checks that everything
## placed can be reached, fights every actor, opens every container, works every terminal,
## takes every pickup, opens every door and stands in every trap.
##   godot --headless --path maze3d -- --level=<id> --selftest
## Prints lines starting PASS / FAIL / INFO and exits with the number of failures.

var main: Node
var level: Level
var pl: Player
var fails := 0


func _say(ok: bool, what: String) -> void:
	print(("PASS  " if ok else "FAIL  ") + what)
	if not ok:
		fails += 1


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _look_at(target: Vector3) -> void:
	var d := target - pl.cam.global_position
	pl.rotation.y = atan2(-d.x, -d.z)
	pl._pitch = asin(clamp(d.y / max(0.01, d.length()), -1.0, 1.0))
	pl.head.rotation.x = pl._pitch


func _stand_near(target: Vector3, want := 5.0) -> bool:
	# an open spot with a clear line to the target
	var best := Vector3.INF
	var c := level.cell_of(target)
	for r in range(0, 4):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var q := c + Vector2i(dx, dy)
				if not level.is_open(q.x, q.y) or level.doors.has(q) or level.cell(q.x, q.y)["window"] != "":
					continue
				var p := level.center(q, 0.0)
				p.y = level.floor_y(Vector3(p.x, target.y - 1.0, p.z)) + 0.05      # on the same storey as the target, if there is a floor there
				if p.distance_to(target) < 2.0:
					continue
				if level.los(p + Vector3(0, 1.6, 0), target) and abs(p.distance_to(target) - want) < abs(best.distance_to(target) - want):
					best = p
		if best != Vector3.INF:
			break
	if best == Vector3.INF:
		return false
	pl.global_position = best
	pl.velocity = Vector3.ZERO
	return true


func run(m: Node) -> void:
	main = m
	level = m.level
	pl = m.player
	process_mode = Node.PROCESS_MODE_ALWAYS
	Game.ended.disconnect(Game.hud._on_end)       # the test dies on purpose; keep the end screen out of it
	await _frames(10)
	print("INFO  level ", level.data.get("id"), ": ", level.w, "x", level.h, " cells, ", level.actors.size(), " actors, ", level.doors.size(), " doors")
	# --- walking and walls
	var p0 := pl.global_position
	Input.action_press("move_forward")
	await _frames(40)
	Input.action_release("move_forward")
	_say(pl.global_position.distance_to(p0) > 1.0, "player walks (moved %.1f m)" % pl.global_position.distance_to(p0))
	Input.action_press("jump")
	await _frames(8)
	Input.action_release("jump")
	_say(pl.global_position.y > 0.3, "player jumps")
	await _frames(40)
	_say(abs(pl.global_position.y) < 0.2, "player lands on the floor (y=%.2f)" % pl.global_position.y)
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	# --- everything placed can be reached once doors are unlocked
	var blocked: Array = []
	for dp in level.doors:
		if level.is_blocked(dp):
			blocked.append(dp)
			level.block(dp, false)
	var unreachable := 0
	var start := level.center(level.start_cell)
	for n in level.get_children():
		if n is Prop or n is Pickup or n is Enemy or n is Trap:
			var c := level.cell_of(n.global_position)
			var ok := false
			for d in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				if level.is_open(c.x + d.x, c.y + d.y) and (c + d == level.start_cell or level.path(start, level.center(c + d)).size() > 0):
					ok = true
					break
			if not ok:
				unreachable += 1
				print("INFO  unreachable: ", n.get_class(), " at ", c)
	_say(unreachable == 0, "every thing on the map can be reached (%d cannot)" % unreachable)
	var upstairs := 0                                # things on balconies: there has to be a way up that can be walked
	var stranded := 0
	for n in level.get_children():
		if (n is Prop or n is Pickup or n is Enemy) and n.global_position.y > 2.0 and not (n is Enemy and n._surf != 0):
			upstairs += 1
			var pth := level.path(start, n.global_position)
			if pth.size() == 0 or absf(pth[pth.size() - 1].y - level.floor_y(n.global_position)) > 0.5:
				stranded += 1
				print("INFO  no way up to ", n.get_class(), " at ", n.global_position)
	if upstairs > 0:
		_say(stranded == 0, "everything upstairs can be walked to (%d things, %d stranded)" % [upstairs, stranded])
	for dp in blocked:
		level.block(dp, true)
	# --- traps hurt, before we stop caring about damage
	for n in level.get_children():
		if is_instance_valid(n) and n is Trap and n.enabled:
			pl.hp = pl.max_hp
			pl.armor = 0
			pl.dead = false
			Game.over = false
			pl.global_position = n.global_position + Vector3(0, 0.05, 0)
			await _frames(330)
			_say(pl.hp < pl.max_hp, "%s trap at %s hurts (%.0f)" % [n.kind, n.cell_pos, pl.max_hp - pl.hp])
	pl.max_hp = 1000000.0
	pl.hp = pl.max_hp
	pl.dead = false
	pl.head.position.y = Player.EYE
	pl.cam.rotation.z = 0.0
	Game.over = false
	_say(level.bad_doors == 0, "every door closes an opening wall to wall (%d do not)" % level.bad_doors)
	# --- scanner arches: walk through each one in a state it should react to
	for n in level.get_children():
		if is_instance_valid(n) and n is Prop and not n._walk.is_empty():
			var kind: String = n._walk.get("kind", "?")
			pl.hp = pl.max_hp * 0.5
			Game.credits = 100
			if pl.weapons.size() < 2:
				pl.give_weapon("scattergun")
			pl.ammo["shells"] = 0
			var hp1 := pl.hp
			var actors1 := level.actors.size()
			pl.global_position = n.global_position - n.global_transform.basis.z * 1.0 + Vector3(0, 0.05, 0)
			pl.velocity = Vector3.ZERO
			await _frames(4)
			pl.global_position = n.global_position + n.global_transform.basis.z * 1.0 + Vector3(0, 0.05, 0)
			await _frames(70)
			var did := ""
			match kind:
				"medical": did = "healed %d" % (pl.hp - hp1) if pl.hp > hp1 else ("used, while something was biting" if n.used > 0 else "")
				"supply": did = "gave %d shells" % pl.ammo["shells"] if pl.ammo["shells"] > 0 else ""
				"toll": did = "took %d cr" % (100 - Game.credits) if Game.credits < 100 else ""
				"security": did = "called %d" % (level.actors.size() - actors1) if level.actors.size() > actors1 else ""
			_say(n.used > 0 and did != "", "%s arch at %s reacts to being walked through (%s)" % [kind, level.cell_of(n.global_position), did])
	pl.hp = pl.max_hp
	# --- every weapon the game has, fired at every actor
	for wid in LM.defs.get("weapons", {}):
		pl.give_weapon(wid)
	for k in pl.ammo:
		pl.ammo[k] = 9999
	var wi := 0
	var took := 0.0
	for a in level.actors.duplicate():
		if not is_instance_valid(a) or a.dead:
			continue
		pl._equip(wi % pl.weapons.size())
		wi += 1
		var nm: String = a.d.get("name", "?")
		if a._surf != 0:                             # bring it down off the wall to be fought
			a._drop()
			for _i in 50:
				await get_tree().physics_frame
		if not is_instance_valid(a) or a.dead:
			continue
		if not _stand_near(a.eye()):
			_say(false, "no place to stand to fight %s at %s (%s)" % [nm, level.cell_of(a.global_position), a.global_position])
			continue
		var hp0 := pl.hp
		var t := 0
		while is_instance_valid(a) and not a.dead and t < 900:
			var aim: Vector3 = a.global_position + Vector3(0, a.d.get("center", a.d.get("height", 1.6) / 2.0), 0)
			_look_at(aim)
			if pl._cool <= 0.0:
				pl._fire(pl.weapon())
			if t % 60 == 59 and not level.los(pl.cam.global_position, aim):
				_stand_near(a.eye())
			if OS.get_cmdline_user_args().has("--verbose") and t % 150 == 149:
				var q := PhysicsRayQueryParameters3D.create(pl.cam.global_position, pl.cam.global_position - pl.cam.global_transform.basis.z * 60.0, 5)
				q.exclude = [pl.get_rid()]
				var hit := level.get_world_3d().direct_space_state.intersect_ray(q)
				print("INFO    ", nm, " hp ", a.hp, " dist ", snappedf(a.global_position.distance_to(pl.global_position), 0.1), " ray hits ", hit.get("collider"), " los ", level.los(pl.cam.global_position, aim), " pl ", pl.global_position, " a ", a.global_position, " layer ", a.collision_layer, " cs ", a.get_child(0).global_position, " ", a.get_child(0).shape.radius, "/", a.get_child(0).shape.height, " dis ", a.get_child(0).disabled, " srv ", PhysicsServer3D.body_get_state(a.get_rid(), PhysicsServer3D.BODY_STATE_TRANSFORM).origin, " space ", PhysicsServer3D.body_get_space(a.get_rid()) == level.get_world_3d().space, " mode ", PhysicsServer3D.body_get_mode(a.get_rid()), " lay ", PhysicsServer3D.body_get_collision_layer(a.get_rid()), " awake ", a.awake, " inside ", a.is_inside_tree(), " eng ", ProjectSettings.get_setting("physics/3d/physics_engine"))
			await get_tree().physics_frame
			t += 1
		took += hp0 - pl.hp
		_say(not is_instance_valid(a) or a.dead, "%s dies to the %s (%d frames, it dealt %.0f)" % [nm, pl.weapon().get("name", "?"), t, hp0 - pl.hp])
	_say(took > 0.0, "actors fight back (%.0f damage taken in all)" % took)
	await _frames(30)
	# --- the E key really reaches the player (a key event, not a direct call)
	for n in get_tree().get_nodes_in_group("usable"):
		if is_instance_valid(n) and n is Prop and n.e.get("use", {}).get("type", "") == "cache" and n.used == 0:
			pl.global_position = n.global_position + n.global_transform.basis.z * 1.8 + Vector3(0, 0.05, 0)
			_look_at(n.global_position + Vector3(0, 1.2, 0))
			await _frames(3)
			_say(pl.focus == n, "a cache in front of you is offered for use")
			for k in [KEY_F, KEY_E]:
				var ev := InputEventKey.new()
				ev.keycode = k
				ev.physical_keycode = k
				ev.pressed = true
				Input.parse_input_event(ev)
				await _frames(3)
			_say(n.used > 0, "pressing E opens it")
			_say(not pl.lamp.visible, "pressing F switches the lamp")
			break
	# --- containers, stations, terminals
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
			_say(Game.hud._state == "panel" and get_tree().paused, "terminal opens and pauses the world: " + n.e["use"].get("title", "?"))
			for i in opts.size():
				opts[i]["hack"] = min(0.05, opts[i].get("hack", 0.0))
				await Game.hud._choose(i)
			Game.hud.close_panel()
			await _frames(3)
		elif kind == "heal":
			pl.hp = 50
			n.use(pl)
			_say(pl.hp > 50, "health station heals")
			pl.hp = pl.max_hp
		elif kind != "effects":
			var before := level.get_child_count()
			n.use(pl)
			await _frames(4)
			_say(n.used > 0, "%s opens (%d things out)" % [n.e["prop"], level.get_child_count() - before])
			Game.hud.close_panel()
	await _frames(40)
	# --- breakables
	var broke := 0
	for n in get_tree().get_nodes_in_group("breakable"):
		if is_instance_valid(n):
			n.hurt(999.0, {"type": "bullet"})
			broke += 1
	await _frames(20)
	_say(get_tree().get_nodes_in_group("breakable").is_empty(), "%d crates and barrels break" % broke)
	# --- pickups
	for k in pl.ammo:
		pl.ammo[k] = 0
	var got := 0
	for i in 3:
		for n in level.get_children():
			if is_instance_valid(n) and n is Pickup and not n.is_queued_for_deletion():
				pl.hp = 50
				pl.armor = 0
				for k in pl.ammo:
					pl.ammo[k] = 0
				pl.global_position = Vector3(n.global_position.x, level.floor_y(n.global_position) + 0.05, n.global_position.z)
				await _frames(8)
				got += 1
	pl.hp = pl.max_hp
	var left := 0
	for n in level.get_children():
		if is_instance_valid(n) and n is Pickup and not n.is_queued_for_deletion():
			left += 1
			print("INFO  not taken: ", n.d.get("id"), " at ", level.cell_of(n.global_position), " ", n.global_position)
	_say(left == 0, "pickups are taken (%d visits, %d left)" % [got, left])
	_say(Game.stats["treasure"] == Game.stats["treasure_total"], "all treasure counted (%d of %d, %d cr)" % [Game.stats["treasure"], Game.stats["treasure_total"], Game.credits])
	# --- doors
	for dp in level.doors:
		var d: Door = level.doors[dp]
		var side := Vector2i.ZERO
		for q in Level.DIRS:
			if level.is_open(dp.x + q.x, dp.y + q.y):
				side = q
				break
		pl.global_position = level.center(dp, 0.05) + Vector3(side.x, 0, side.y) * 2.7
		await _frames(140 if not d.jammed else 420)
		_say(d.t > 0.9 and d._shape.disabled, "%s at %s opens%s" % [d.meta.get("model", "door"), dp, " (was locked: %s)" % d.is_locked() if d.is_locked() else ""])
		pl.global_position = level.center(dp, 0.05)
		await _frames(10)
		_say(level.cell_of(pl.global_position) == dp, "  and can be stood in")
	# --- objectives and the way out
	Game.hud.refresh()
	print("INFO  flags: ", Game.flags.keys())
	print("INFO  objective now: ", Game.hud._objective.text)
	for n in get_tree().get_nodes_in_group("usable"):
		if is_instance_valid(n) and n is Prop and str(n.e.get("use", {})).contains("\"end\""):
			n.use(pl)
			if Game.hud._state == "panel":
				var opts2: Array = n.e["use"].get("options", [])
				for i in opts2.size():
					if str(opts2[i]).contains("\"end\""):
						await Game.hud._choose(i)
	await _frames(5)
	_say(Game.over, "the level can be finished")
	print("RESULT  %d failures" % fails)
	get_tree().paused = false
	get_tree().quit(fails)
