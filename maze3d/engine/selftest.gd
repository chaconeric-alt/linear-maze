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


## The storey something is in: the one its height says, or the nearest one below that has air there (it may be on a ceiling).
func _storey(pos: Vector3) -> int:
	var c := level.cell_of(pos)
	var st := floori((pos.y + 1.0) / level.H)
	for t in range(st, level.f_min - 1, -1):
		if level.open_s(c.x, c.y, t):
			return t
	return st                                        # it hangs on a wall: its own cell is rock


func _stand_near(target: Vector3, want := 5.0, tight := false) -> bool:
	# an open spot with a clear line to the target
	var best := Vector3.INF
	var c := level.cell_of(target)
	var st := _storey(target)
	for r in range(0, 4):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var q := c + Vector2i(dx, dy)
				var here: Dictionary = level.cell_s(q.x, q.y, st)
				if here.is_empty() or (here["door"] != "" and not tight) or here["window"] != "":
					continue
				var p := level.center(q, 0.0)
				p.y = level.floor_y(Vector3(p.x, st * level.H + 0.5, p.z)) + 0.05      # on the same storey as the target, if there is a floor there
				if p.distance_to(target) < (1.2 if tight else 2.0):
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
	var blocked_up: Array = []
	for du in level.doors_up:
		if level.is_blocked(Vector2i(du.x, du.y), du.z):
			blocked_up.append(du)
			level.block(Vector2i(du.x, du.y), false, du.z)
	var unreachable := 0
	var start := level.center(level.start_cell, level.start_level * level.H)
	for n in level.get_children():
		if n is Prop or n is Pickup or n is Enemy or n is Trap:
			var c := level.cell_of(n.global_position)
			var ns := _storey(n.global_position)
			var ok := false
			for d in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:      # walking, by lift, or down a pit
				if level.open_s(c.x + d.x, c.y + d.y, ns) and level.reach(start, level.center(c + d, n.global_position.y)):
					ok = true
					break
			if not ok:
				unreachable += 1
				print("INFO  unreachable: ", n.get_class(), " at ", c)
	_say(unreachable == 0, "every thing on the map can be reached (%d cannot)" % unreachable)
	var upstairs := 0                                # things on balconies: there has to be a way up that can be walked
	var stranded := 0
	for n in level.get_children():
		if (n is Prop or n is Pickup or n is Enemy) and absf(n.global_position.y) > 2.0 and not (n is Enemy and (n._surf != 0 or n.d.get("mount", "") == "ceiling" or n._fly)):
			upstairs += 1
			if not level.reach(start, n.global_position) or (not n is Prop and absf(level.floor_y(n.global_position) - n.global_position.y) > 1.6):
				stranded += 1
				print("INFO  no way up to ", n.get_class(), " at ", n.global_position)
	if upstairs > 0:
		_say(stranded == 0, "everything on other storeys can be got to (%d things, %d stranded)" % [upstairs, stranded])
	for dp in blocked:
		level.block(dp, true)
	for du in blocked_up:
		level.block(Vector2i(du.x, du.y), true, du.z)
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
	# --- easy mode's E: looking at a thing names that thing (Identify)
	var named := 0
	var misnamed := 0
	var unseen := 0
	for n in level.get_children():
		if not is_instance_valid(n) or not (n is Prop or n is Pickup or n is Door or n is Trap or (n is Enemy and n._surf == 0 and not n.dead)):
			continue
		if (n is Pickup and n._rest and n.position.y - level.floor_y(n.position) > 0.4) or (n is Enemy and n.dock != null and n.dock._open < 0.5):
			continue                                 # in a container (E names the container, and what it holds), or behind a shutter
		var want := ""
		var want2 := "\u0000"
		if n is Station and n.bot != null and is_instance_valid(n.bot) and not n.bot.dead:
			want2 = "monster \"%s\"" % str(LM.defs["actors"].find_key(n.bot.d))      # an open one: what you see first is who is in it
		if n is Prop:
			want = "prop \"%s\"" % n.e["prop"]
		elif n is Pickup:
			want = "item \"%s\"" % n.d.get("item", "?")
		elif n is Door:
			want = "door \"%s\"" % level.cell(n.cell_pos.x, n.cell_pos.y, n.storey).get("entry", {}).get("door", "?")
		elif n is Trap:
			want = "trap \"%s\"" % n.kind
		else:
			want = "monster \"%s\"" % str(LM.defs["actors"].find_key(n.d))
		var mid: Vector3 = Identify._middle(n) if not n is Enemy else n.global_position + Vector3(0, n.d.get("center", n.d.get("height", 1.6) / 2.0), 0)
		var got_it := false
		var could := false
		for dv in [Vector3(0, 0, 1), Vector3(1, 0, 0), Vector3(0, 0, -1), Vector3(-1, 0, 0), Vector3(0.7, 0, 0.7), Vector3(-0.7, 0, 0.7), Vector3(0.7, 0, -0.7), Vector3(-0.7, 0, -0.7)]:
			var spot: Vector3 = mid + dv * 2.6
			var sc := level.cell_of(spot)
			var st := _storey(mid)
			if not level.open_s(sc.x, sc.y, st) or level.cell_s(sc.x, sc.y, st).get("door", "") != "":
				continue
			spot.y = level.floor_y(Vector3(spot.x, st * level.H + 0.5, spot.z)) + 0.05
			if absf(spot.y + Player.EYE - mid.y) > 2.5:
				continue
			could = true
			pl.global_position = spot
			pl.velocity = Vector3.ZERO
			pl.force_update_transform()
			_look_at(mid)
			pl.head.force_update_transform()
			var seen: Dictionary = Identify.look(pl)
			if seen.get("detail", "").contains(want) or seen.get("detail", "").contains(want2):
				got_it = true
				break
		if got_it:
			named += 1
		elif could:
			misnamed += 1
			print("INFO  E did not name ", want, " at ", level.cell_of(n.global_position))
		else:
			unseen += 1
	_say(named > 0 and misnamed * 20 <= named, "easy mode's E names what you look at (%d things named, %d not, %d with nowhere to stand)" % [named, misnamed, unseen])
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	pl.force_update_transform()
	var tiles_ok := 0
	for look in [[Vector3(0.3, -1, 0.2), "floor tile"], [Vector3(0.2, 1, 0.3), "ceiling tile"], [Vector3(1, 0.05, 0.3), "tile"], [Vector3(-0.3, 0.05, 1), "tile"]]:
		_look_at(pl.cam.global_position + (look[0] as Vector3).normalized() * 3.0)
		pl.head.force_update_transform()
		if Identify.look(pl).get("detail", "").contains(look[1]):
			tiles_ok += 1
	_say(tiles_ok >= 3, "  and names floor, ceiling and wall tiles (%d of 4 looks; a door or a thing may stand in one)" % tiles_ok)
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
	if level.data.get("off_duty", false):
		await _off_duty()
	if level.data.get("covers_all", false):
		_covers_all()
	for a in level.actors.duplicate():
		if not is_instance_valid(a) or a.dead or a.off_duty:
			continue
		pl._equip(wi % pl.weapons.size())
		wi += 1
		var nm: String = a.d.get("name", "?")
		if a.dock != null:                           # switch it on and let it out of its station
			var was_calm: bool = Game.calm
			a.dock.release()
			for _i in 110:
				await get_tree().physics_frame
			Game.calm = was_calm
		if a._surf != 0:                             # bring it down off the wall to be fought
			a._drop()
			for _i in 50:
				await get_tree().physics_frame
		if not is_instance_valid(a) or a.dead:
			continue
		if not _stand_near(a.eye()) and not _stand_near(a.eye(), 5.0, true):      # in a tight corner: closer, or from a doorway
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
	if not level.data.get("off_duty", false):
		_say(took > 0.0, "actors fight back (%.0f damage taken in all)" % took)
	await _frames(30)
	# --- the E key really reaches the player (a key event, not a direct call)
	for n in get_tree().get_nodes_in_group("usable"):
		if is_instance_valid(n) and n is Prop and n.e.get("use", {}).get("type", "") == "cache" and n.used == 0:
			pl.global_position = n.global_position + n.global_transform.basis.z * 1.8 + Vector3(0, 0.05, 0)
			_look_at(n.global_position + Vector3(0, 1.2, 0))
			await _frames(3)
			_say(pl.focus == n, "a cache in front of you is offered for use")
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
				await _frames(3)
			_say(n.used > 0, "pressing E opens it")
			_say(not told.is_empty(), "  and in easy mode says what it is (%s)" % (told[0] if not told.is_empty() else "nothing"))
			Game.identified.disconnect(hear)
			Game.easy = was_easy
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
	for n in level.get_children():                   # pits drop you; lifts take you
		if not is_instance_valid(n):
			continue
		pl.hp = pl.max_hp
		pl.dead = false
		if n is Pit:
			pl.velocity = Vector3.ZERO
			pl.global_position = n.global_position + Vector3(0, 0.05, 0)
			await _frames(150)
			_say(pl.global_position.y < n.global_position.y - 2.0, "pit at %s drops the player (to y=%.1f)" % [level.cell_of(n.global_position), pl.global_position.y])
		elif n is Lift:
			var was: int = n.at
			pl.velocity = Vector3.ZERO
			pl.global_position = n.global_position + Vector3(0, 0.1, 0)
			await _frames(420)
			_say(n.at != was and absf(pl.global_position.y - n.global_position.y) < 0.6, "lift at %s carries the player (stop %d to %d, player y=%.1f, lift y=%.1f)" % [level.cell_of(n.global_position), was, n.at, pl.global_position.y, n.global_position.y])
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


## A floor where everything is off duty: nothing hurts the player, everything talks when asked, everything with an
## attack can show it on a target, and a robot in a shut station is shut in again when the player has gone.
func _off_duty() -> void:
	var kinds := {}
	for a in level.actors:
		if is_instance_valid(a) and a.off_duty and not a.dead:
			var id: String = str(LM.defs["actors"].find_key(a.d))
			if not kinds.has(id) or (kinds[id].dock != null and a.dock == null):
				kinds[id] = a
	pl.hp = pl.max_hp
	var hp_was: float = pl.hp
	var silent := 0
	if OS.has_environment("LM_RANGE_ONLY"):          # (for chasing one thing down)
		kinds = {}
	for id in kinds:
		var a: Enemy = kinds[id]
		var nm: String = a.d.get("name", id)
		# ---- talking
		var c := level.cell_of(a.global_position)
		var st := _storey(a.global_position)
		var stood := false
		for dv in [a.global_transform.basis.z, -a.global_transform.basis.x, a.global_transform.basis.x, -a.global_transform.basis.z]:
			var at: Vector3 = Vector3(a.global_position.x, st * level.H + 0.05, a.global_position.z) + Vector3(dv.x, 0, dv.z).normalized() * (a.d.get("radius", 0.5) + 1.6)
			var ac := level.cell_of(at)
			if level.open_s(ac.x, ac.y, st) and not level.is_blocked(ac, st):
				pl.global_position = at
				stood = true
				break
		if not stood:
			pl.global_position = level.center(c, st * level.H + 0.05)
		pl.velocity = Vector3.ZERO
		_look_at(a.focus_point())
		await _frames(130 if a.dock != null else 20)
		_look_at(a.focus_point())
		await _frames(3)
		var offered: bool = a.prompt() != ""
		a.use(pl)
		var opened: bool = Game.hud._state == "panel"
		if opened:
			var opts: Array = Game.hud._panel_spec.get("options", [])
			for i in opts.size():
				if not opts[i].has("call"):
					await Game.hud._choose(i)
			Game.hud.close_panel()
		await _frames(3)
		_say(offered and opened, "%s talks when asked (%s)" % [nm, "in reach: %s" % (pl.focus == a)])
		if a.d.get("talk", {}).is_empty():
			silent += 1
		# ---- showing what it does
		if a.d.get("attacks", []).is_empty():
			continue
		var rooted: bool = a._fixed or a.d.get("mount", "") == "ceiling" or a.d.get("still", false)
		var tgt: Node3D = level.drill_target_for(a)
		if tgt == null:
			_say(false, "%s has a target to show its attack on" % nm)
			continue
		var was: Vector3 = a.global_position
		pl.global_position = tgt.global_position + Vector3(0, 0.05, 0) - tgt.global_transform.basis.z * 3.0 + tgt.global_transform.basis.x * 3.0      # out of the way, watching
		if not rooted:                               # the walk to the range is not what is being tested
			a.global_position = tgt.global_position + tgt.global_transform.basis.z * 9.0
			a.velocity = Vector3.ZERO
		var hits0: int = tgt.hits
		var ok: bool = a.drill(tgt)
		var t := 0
		var struck := false
		while ok and t < 900 and tgt.hits == hits0:
			await _frames(5)
			t += 5
			struck = struck or a._atk != null
		_say(ok and tgt.hits > hits0, "%s shows its attack on a target (%d frames%s)" % [nm, t, "" if tgt.hits > hits0 else (", it attacked but nothing landed" if struck else ", it never attacked")])
		a.drill_end()
		if not rooted:
			a.global_position = was
			a._od = ""
			a.velocity = Vector3.ZERO
		await _frames(5)
	_say(silent == 0, "everything off duty has something to say (%d kinds do not)" % silent)
	_say(pl.hp >= hp_was, "nothing off duty hurt the player (%.0f lost)" % (hp_was - pl.hp))
	# ---- a shut station shuts again
	for n in level.get_children():
		if n is Station and n.e.get("shut", false) and n.bot != null and is_instance_valid(n.bot) and not n.bot.dead and n.bot.dock == n:
			pl.global_position = n.global_position + n.global_transform.basis.z * 4.5 + Vector3(0, 0.05, 0)
			await _frames(140)
			var opened2: bool = n._open > 0.9
			var roused: bool = n.bot._roused
			pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
			await _frames(520)
			_say(opened2 and roused and n._open < 0.1 and not n.bot._roused, "a shut station opens when you come up to it, and shuts over its robot when you leave (opened %s, robot roused %s, now open %.1f)" % [opened2, roused, n._open])
			break
	# ---- called from the range, one walks there from wherever it was, shoots, and walks back
	var range_t: Node3D = null
	for t in level.targets:
		if t.tag == "range" and t.busy == null:
			range_t = t
			break
	if range_t != null:
		var h0: int = range_t.hits
		pl.global_position = range_t.global_position + Vector3(0, 0.05, 0) - range_t.global_transform.basis.z * 3.0
		var who_id: String = OS.get_environment("LM_RANGE_ACTOR") if OS.has_environment("LM_RANGE_ACTOR") else "monoid"
		level.run_effect({"type": "drill", "tag": "range", "actor": who_id}, {})
		var walker: Enemy = range_t.busy as Enemy
		var far := 0.0
		var t2 := 0
		if walker != null:
			far = walker.global_position.distance_to(range_t.global_position)
			while t2 < 12000 and range_t.hits == h0 and walker._foe != null:
				await _frames(10)
				t2 += 10
		_say(walker != null and range_t.hits > h0, "called to the range, %s walks %d m to it and hits the target (%d frames)" % [walker.d.get("name", "?") if walker else "nobody", roundi(far), t2])
		if walker != null:
			var t3 := 0
			while t3 < 12000 and (walker._foe != null or walker._od != ""):
				await _frames(10)
				t3 += 10
			_say(walker._od == "" and walker.global_position.distance_to(walker._post) < 2.0, "  and goes back to where it was (%d frames, %.1f m off)" % [t3, walker.global_position.distance_to(walker._post)])
	pl.hp = pl.max_hp
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)


## The test floor has to have everything in it: every style, every piece of furniture, every door, monster and item.
func _covers_all() -> void:
	var missing: Array = []
	var styles := {}
	for f in level.floors:
		for y in level.h:
			for x in level.w:
				var c: Dictionary = level.cell(x, y, f)
				if not c["solid"]:
					styles[c["style"]] = true
	for s in level.kit["styles"]:
		if not styles.has(s):
			missing.append("style " + s)
	var have := {}
	for n in level.get_children():
		if n is Prop:
			have[n.e["prop"]] = true
			for k in n.get_children():
				if k is Prop:
					have[k.e["prop"]] = true
	var doors := {}
	for src in [level.data.get("legend", {})] + level.data.get("floors", []).map(func(fd): return fd.get("legend", {})):
		for ch in src:
			if src[ch] is Dictionary and src[ch].has("door"):
				doors[src[ch]["door"]] = true
	for id in level.kit["models"]:
		var m: Dictionary = level.kit["models"][id]
		if m.get("type", "") == "prop" and not have.has(id) and not id.begins_with("trap_") and id != "window_obs":
			missing.append("prop " + id)
		elif m.get("type", "") == "door" and not doors.has(id):
			missing.append("door " + id)
	var who := {}
	for a in level.actors:
		if is_instance_valid(a):
			who[str(LM.defs["actors"].find_key(a.d))] = true
	for id in LM.defs["actors"]:
		if not who.has(id):
			missing.append("monster " + id)
	var things := JSON.stringify(level.data.get("things", []))
	for id in LM.defs["items"]:
		if not things.contains("\"%s\"" % id):
			missing.append("item " + id)
	_say(missing.is_empty(), "the test floor has everything in it (%s)" % ("missing: " + ", ".join(PackedStringArray(missing)) if not missing.is_empty() else "%d styles, %d kinds of furniture, %d of door, %d of monster" % [styles.size(), have.size(), doors.size(), who.size()]))
