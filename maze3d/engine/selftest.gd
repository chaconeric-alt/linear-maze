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


## What the self-test needs switched before the first level is loaded (Main calls this for --selftest): hacks are
## instant and always come off, nothing risky goes wrong, the bunker lives in memory only, and remembered settings
## are not loaded, so the test measures the game as designed.
static func configure() -> void:
	Debug.sure_rolls = true
	Debug.quick_hacks = true
	Debug.memory_profile = true
	Debug.fixed_settings = true


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
	if OS.get_cmdline_user_args().has("--story") and level.data.get("id", "") == "anomalous":      # the Anomalous Structure, played the way it is meant to go
		await _anomalous()
		print("RESULT  %d failures" % fails)
		get_tree().paused = false
		get_tree().quit(fails)
		return
	if level.home:                                   # the bunker: nothing to fight and no way to finish; it has a test of its own
		await _home()
		print("RESULT  %d failures" % fails)
		get_tree().paused = false
		get_tree().quit(fails)
		return
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
			var got: bool = level.reach(start, n.global_position)
			if not got and n is Prop:                # on a wall: it is reached from in front of it
				got = level.reach(start, n.global_position + n.global_transform.basis.z * 0.9)
			if not got or (not n is Prop and absf(level.floor_y(n.global_position) - n.global_position.y) > 1.6):
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
			if n.e.get("trip", false):                # a tripwire tells somebody instead
				_say(not n.enabled, "the tripwire at %s trips, once" % n.cell_pos)
			elif float(n.e.get("damage", 1.0)) <= 0.0:    # ambiance
				_say(true, "%s at %s is harmless, as it says" % [n.kind, n.cell_pos])
			else:
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
		if n is Prop and not n.visible:
			continue                                 # hidden until something shows it
		if n is Trap or n is Pickup:                 # standing in or on a piece of furniture (a vent under its generator, a gun on a pedestal): E names the furniture
			var onp := false
			for q in level.get_children():
				if q is Prop and q.visible and absf(q.global_position.y - n.global_position.y) < 2.5 and Vector2(q.global_position.x - n.global_position.x, q.global_position.z - n.global_position.z).length() < 0.8:
					onp = true
					break
			if onp:
				continue
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
			_say(Game.hud.in_panel() and get_tree().paused, "terminal opens and pauses the world: " + n.e["use"].get("title", "?"))
			for i in opts.size():
				await Game.interaction.choose(i)
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
			if Game.hud.in_panel():
				var opts2: Array = n.e["use"].get("options", [])
				for i in opts2.size():
					if str(opts2[i]).contains("\"end\""):
						await Game.interaction.choose(i)
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
		var opened: bool = Game.hud.in_panel()
		if opened:
			var opts: Array = Game.interaction.spec.get("options", [])
			for i in opts.size():
				if not opts[i].has("call"):
					await Game.interaction.choose(i)
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


## The bunker: every piece of furniture that does something does it, what is brought home is banked and put on show,
## the robot is repaired only with the parts, furnishings can be bought, put down, taken back, and are there after a reload,
## the vault door opens, and the lift has somewhere to go and takes the armoury along. (Profile is memory-only in a self-test.)
func _home() -> void:
	var hm: Home = level.home
	var names: Dictionary = {}
	for rm in level.rooms:
		names[rm.get("name", "")] = true
	var want := ["Bedroom", "Bathroom", "Den", "Living Room", "Communications", "Armoury", "Robot Room", "Security"]
	var missing: Array = want.filter(func(r): return not names.has(r))
	_say(missing.is_empty(), "the bunker has all eight rooms %s" % [missing])
	_say(level.actors.is_empty() and pl.weapons.is_empty(), "nothing in it fights, and you carry nothing")
	var unreachable := 0
	var start := level.center(level.start_cell, 0.0)
	for dp in level.doors:
		level.block(dp, false)
	for n in level.get_children():
		if n is Prop:
			var c := level.cell_of(n.global_position)
			var ok := false
			for d in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				if level.is_open(c.x + d.x, c.y + d.y) and level.reach(start, level.center(c + d, 0.0)):
					ok = true
					break
			if not ok:
				unreachable += 1
				print("INFO  unreachable: ", n.e.get("prop"), " at ", c)
	_say(unreachable == 0, "every piece of furniture can be reached (%d cannot)" % unreachable)
	# --- every usable thing
	var used := 0
	var bad := 0
	for n in get_tree().get_nodes_in_group("usable"):
		if not (n is Prop) or n.e.get("use", {}).get("type", "") != "home":
			continue
		used += 1
		_look_at(n.global_position + Vector3(0, 1.2, 0))
		n.use(pl)
		await _frames(2)
		var what: String = n.e["use"].get("what", "")
		var panel: bool = Game.hud.in_panel()
		if what in ["bed", "sofa"]:
			if panel:
				bad += 1
				print("INFO  ", what, " opened a panel")
		elif not panel:
			bad += 1
			print("INFO  ", what, " did nothing")
		Game.hud.close_panel()
		await _frames(2)
	_say(used >= 11 and bad == 0, "every working piece of furniture works (%d of them, %d wrong)" % [used, bad])
	# --- coming home
	_say(hm._shown.is_empty(), "an empty bunker shows nothing on the rack, the stand or in the case")
	_say(not hm.can_repair() and not hm.repair(), "the robot cannot be repaired without the parts")
	_say(not (hm.robot is Enemy) and hm.robot != null, "  and is a wreck in the cradle")
	Profile.bank(500, ["handgun", "scattergun", "plasma"], 50.0, {"circuit": 3, "fuel_cell": 2, "crystal": 2, "statuette": 1, "chips": 4})
	hm.show_off()
	await _frames(2)
	_say(hm._shown.size() == 3 + 1 + 3, "what is brought home goes on show: 3 weapons, a vest, 3 trophies (%d things)" % hm._shown.size())
	_say(hm.can_repair() and hm.repair(), "with 3 circuit boards and 2 fuel cells the robot is repaired")
	await _frames(5)
	_say(hm.robot is Enemy and (hm.robot as Enemy).off_duty and Profile.count("circuit") == 0, "  it is up, it is off duty, and the parts are used")
	if hm.robot is Enemy:
		_stand_near(hm.robot.global_position + Vector3(0, 1.0, 0), 3.0)
		_look_at(hm.robot.global_position + Vector3(0, 1.0, 0))
		hm.robot.use(pl)
		await _frames(2)
		_say(Game.hud.in_panel(), "  and it talks")
		Game.hud.close_panel()
	# --- furnishing
	Profile.d["credits"] = 30
	_say(not hm.buy(0), "the catalogue wants paying (30 cr does not buy a %d cr fern)" % Home.CATALOGUE[0][1])
	Profile.d["credits"] = 500
	var bought := 0
	for i in Home.CATALOGUE.size():
		if Home.CATALOGUE[i][0] in ["hm_plant", "hm_painting", "hm_lamp"] and hm.buy(i):
			bought += 1
	_say(bought == 3 and int(Profile.d["credits"]) == 500 - 40 - 45 - 60 and hm.available().size() == 3, "three things bought, paid for, and waiting (%d cr left)" % int(Profile.d["credits"]))
	pl.global_position = level.center(Vector2i(7, 4), 0.05)
	pl.rotation.y = -PI / 2                             # looking east along the hall
	pl._pitch = -0.5
	hm.toggle()
	var lights0 := level.get_children().filter(func(n): return n is OmniLight3D).size()
	var put := 0
	for k in 3:
		var av := hm.available()
		if av.is_empty():
			break
		hm._sel = 0
		if av[0][0] == "hm_painting":                # a wall thing: look at the wall
			pl.rotation.y = 0.0
			pl._pitch = 0.1
		else:
			pl.rotation.y = -PI / 2
			pl._pitch = -0.5 - 0.1 * k
		await _frames(4)
		if hm.place():
			put += 1
		await _frames(2)
	_say(put == 3 and hm.available().is_empty() and Profile.d["decor"].size() == 3, "all three put down (%d), one of them on a wall" % put)
	var lights1 := level.get_children().filter(func(n): return n is OmniLight3D).size()
	_say(lights1 == lights0 + 1, "the standing lamp lights (%d -> %d lights)" % [lights0, lights1])
	var onwall := false
	for dec in Profile.d["decor"]:
		if dec["m"] == "hm_painting":
			var c := level.cell_of(Vector3(dec["x"], 0, dec["z"]))
			var fx: float = dec["x"] / level.C - c.x
			var fz: float = dec["z"] / level.C - c.y
			onwall = minf(minf(fx, 1.0 - fx), minf(fz, 1.0 - fz)) < 0.02
	_say(onwall, "the painting hangs on a wall")
	pl.rotation.y = -PI / 2
	await _frames(2)
	var n0: int = Profile.d["decor"].size()
	var took := hm.take_back()
	await _frames(3)
	_say(took and Profile.d["decor"].size() == n0 - 1 and hm.available().size() == 1, "one taken back, and it is waiting again")
	hm.toggle()
	var saved: Array = Profile.d["decor"].duplicate(true)
	# --- the vault door and the lift
	var vault := Vector2i(-1, -1)
	for dp in level.doors:
		if str(level.doors[dp].meta.get("model", "")).contains("vault"):
			vault = dp
	if vault.x >= 0:
		pl.global_position = level.center(vault, 0.05) + Vector3(-2.7, 0, 0)
		await _frames(260)
		_say(level.doors[vault].t > 0.9, "the vault door rolls open")
	else:
		_say(false, "there is a vault door")
	var dest := hm.destinations()
	_say(dest["built"].size() >= 3 and dest["wild"].size() >= 3, "the lift has somewhere to go (%d on record, %d unsurveyed)" % [dest["built"].size(), dest["wild"].size()])
	var cfg := {"weapons": ["handgun"], "ammo": {"shells": 0, "cells": 0}}
	Profile.outfit(cfg)
	_say(cfg["weapons"].size() == 3 and cfg["armor"] == 50.0 and cfg["ammo"]["shells"] > 0 and cfg["ammo"]["cells"] > 0, "leaving by the lift takes the armoury along: %s, armour %d, %s" % [cfg["weapons"], cfg["armor"], cfg["ammo"]])
	# --- and it is all still there next time
	main._on_start(level.data.get("id", "home"))
	await _frames(10)
	level = main.level
	pl = main.player
	hm = level.home
	_say(hm != null and hm._placed.size() == saved.size() and hm.robot is Enemy and hm._shown.size() == 7 and Game.credits == int(Profile.d["credits"]),
		"after coming back in: the furnishings, the robot, the rack and the credits are as they were left")


# ------------------------------------------------------------------ the Anomalous Structure: its story, end to end
func _thing(tag: String) -> Node3D:
	var l: Array = level.things_by_tag.get(tag, [])
	for n in l:
		if is_instance_valid(n):
			return n
	return null


## Use a thing and take the option whose label starts with `label` (hacks are instant and never fail here). False if it is not offered.
func _pick(n: Node, label: String) -> bool:
	if n == null:
		return false
	if Game.hud.in_panel():
		Game.hud.close_panel()
	pl.global_position = n.global_position + n.global_transform.basis.z * 1.6
	pl.global_position.y = level.floor_y(n.global_position + n.global_transform.basis.z * 1.6 + Vector3(0, 0.5, 0)) + 0.05
	n.use(pl)
	await _frames(2)
	if not Game.hud.in_panel():
		return false
	var opts: Array = Game.interaction.spec.get("options", [])
	var found := false
	for i in opts.size():
		var o: Dictionary = opts[i]
		if not str(o.get("label", "")).begins_with(label):
			continue
		if (o.has("when") and not Game.has_flag(o["when"])) or (o.has("unless") and Game.has_flag(o["unless"])):
			continue
		o.erase("risk")
		Game.credits = maxi(Game.credits, int(o.get("cost", 0)))
		await Game.interaction.choose(i)
		found = true
		break
	await _frames(3)
	if Game.hud.in_panel():
		Game.hud.close_panel()
	await _frames(2)
	return found


## Walk over every loose pickup of that kind (what a container has just thrown out).
func _take(kind: String) -> int:
	var n := 0
	for it in level.get_children():
		if is_instance_valid(it) and it is Pickup and not it.is_queued_for_deletion() and it.d.get("item", "") == kind:
			pl.hp = minf(pl.hp, pl.max_hp - 1.0)
			pl.armor = 0.0
			pl.global_position = Vector3(it.global_position.x, level.floor_y(it.global_position) + 0.05, it.global_position.z)
			await _frames(8)
			n += 1
	return n


func _go(cellp: Vector2i, storey := 0) -> void:
	pl.global_position = level.center(cellp, storey * level.H + 0.05)
	pl.velocity = Vector3.ZERO


func _door(x: int, y: int, storey := 0) -> Door:
	return level.doors.get(Vector2i(x, y)) if storey == 0 else level.doors_up.get(Vector3i(x, y, storey))


## A door the player could not walk through as things stand.
func _shut(d: Door) -> bool:
	return d.sealed or (d.lock != "" and not Game.keys.has(d.lock)) or (d.flag != null and not Game.has_flag(d.flag))


func _kinds(kind: String, storey := -99) -> Array:
	return level.actors.filter(func(a): return is_instance_valid(a) and not a.dead and LM.defs["actors"].find_key(a.d) == kind and (storey == -99 or level.floor_of(a.global_position) == storey))


func _anomalous() -> void:
	Game.calm = false
	pl.max_hp = 100000.0
	pl.hp = pl.max_hp
	_say(level.floors.size() == 3 and level.lifts.size() == 2, "three floors and two lifts (%d, %d)" % [level.floors.size(), level.lifts.size()])
	for nm in ["Reception", "Creative Department", "The Coffee Shop", "Break room", "Executive suite", "Testing chamber", "Bio lab", "Director’s office", "Materials lab", "Prototype vault",
			"Operations floor", "Security Station", "Robot Repair Bay", "Armory", "The inner core"]:
		if level.rooms.filter(func(r): return r.get("name", "") == nm).is_empty():
			_say(false, "there is a room called %s" % nm)
	var sphinx: Enemy = _thing("sphinx")
	var monoid: Enemy = _thing("monoid")
	_say(sphinx != null and sphinx.off_duty and monoid != null and monoid.off_duty, "the Sphinx Gun and the Monoid wait to be spoken to")
	# --- A: the rude way. Walk past the Sphinx; take the Monoid's badge off it.
	_go(Vector2i(11, 13))
	await _frames(20)
	_say(sphinx.off_duty, "  standing inside the door, it only asks")
	_go(Vector2i(14, 11))
	await _frames(30)
	_say(not sphinx.off_duty and Game.has_flag("sphinx_angry"), "  walk past it unanswered and it opens fire")
	sphinx.hurt(99999.0, {})
	await _frames(5)
	_say(Game.has_flag("sphinx_ok"), "  killing it clears reception")
	_say(not Game.has_flag("badge") and await _pick(monoid, "Then I"), "the Monoid can be told you will take the badge")
	await _frames(10)
	_say(not monoid.off_duty, "  and it gets up")
	monoid.hurt(99999.0, {})
	await _frames(5)
	_say(Game.has_flag("badge"), "  its badge is yours when it is dead")
	# --- B: the polite way, from the start
	main._on_start("anomalous")
	await _frames(10)
	level = main.level
	pl = main.player
	pl.max_hp = 100000.0
	pl.hp = pl.max_hp
	sphinx = _thing("sphinx")
	monoid = _thing("monoid")
	_say(not Game.has_flag("badge") and not Game.has_flag("sphinx_ok"), "starting again starts clean")
	_say(await _pick(sphinx, "WANT MORE") and Game.has_flag("sphinx_ok") and sphinx.off_duty, "the right slogan stands the Sphinx Gun down")
	_go(Vector2i(8, 11))
	await _frames(30)
	_say(sphinx.off_duty and not Game.has_flag("sphinx_angry"), "  and then you may walk past it")
	# darts
	pl.hp = 1000.0
	_go(Vector2i(18, 11))
	await _frames(100)
	var dart_hurt: float = 1000.0 - pl.hp
	_say(dart_hurt > 0.0, "the courtesy darts hurt (%.0f)" % dart_hurt)
	_say(await _pick(_thing("facilities"), "Argue") and Game.has_flag("darts_off"), "the facilities terminal shuts them off")
	pl.hp = 1000.0
	_go(Vector2i(18, 11))
	await _frames(100)
	_say(pl.hp == 1000.0, "  and then they do not")
	pl.hp = pl.max_hp
	# the blue card
	_say(_door(5, 12).is_locked(), "the staff door is locked")
	var l4 := _thing("locker4")
	_say(not await _pick(l4, "Enter 314"), "locker 4 wants a code you do not have")
	var memo: Node = null
	for n in level.get_children():
		if n is Prop and str(n.e.get("use", {}).get("title", "")).begins_with("Memo"):
			memo = n
	_say(await _pick(memo, "Remember") and Game.has_flag("memo314"), "the memo in the Creative Department has it")
	# the chip, the Monoid, the badge
	_say(not await _pick(monoid, "Swap"), "the Monoid will not swap for nothing")
	var jar := _thing("tipjar")
	_go(Vector2i(20, 7))
	jar.use(pl)
	await _frames(40)
	await _take("lucky_chip")
	_say(Game.has_flag("lucky_chip"), "the lucky chip is in the coffee shop's tip jar")
	_say(await _pick(monoid, "Swap") and Game.has_flag("badge") and monoid.off_duty, "the Monoid swaps its badge for it, and goes on with its break")
	await _frames(20)
	_say(not _door(5, 12).is_locked(), "the badge opens the staff door")
	_say(await _pick(l4, "Enter 314"), "locker 4 opens to 314")
	await _frames(40)
	await _take("keycard")
	_say(Game.has_flag("key_blue"), "  the BLUE card is in it")
	_say(not _shut(_door(11, 5)), "  and it opens the stairwell")
	# the executive suite
	_say(_door(20, 12).is_locked(), "the executive suite is locked")
	var panel: Node = null
	for n in level.get_children():
		if n is Prop and str(n.e.get("use", {}).get("title", "")).begins_with("EXECUTIVE SUITE"):
			panel = n
	_say(await _pick(panel, "Argue") and not _door(20, 12).is_locked(), "  until its panel is argued with")
	_say(not await _pick(_thing("execsafe"), "Enter 0451"), "the safe wants a code")
	var before: int = _kinds("defender").size()
	_say(await _pick(_thing("execdesk"), "Take the watch") and Game.has_flag("safe_code"), "the desk has the code")
	await _frames(80)
	_say(_kinds("defender").size() == before + 2, "  and two Desktop Defenders (%d)" % (_kinds("defender").size() - before))
	for a in _kinds("defender"):
		a.hurt(9999.0, {})
	_say(await _pick(_thing("execsafe"), "Enter 0451"), "the safe opens to 0451")
	await _frames(40)
	await _take("order")
	_say(Game.has_flag("order"), "  Termination Order 77-B is in it")
	# --- floor 2
	var la: Node3D = _thing("lift_a")
	_say(level.reach(level.center(Vector2i(11, 16), 0.0), level.center(Vector2i(10, 2), level.H)), "the lift in the north stairwell goes up to the labs")
	_say(_shut(_door(14, 2, 1)), "the way to floor 3 is locked")
	_go(Vector2i(3, 5), 1)
	_thing("director").use(pl)
	await _frames(40)
	await _take("keycard")
	_say(Game.has_flag("key_yellow") and not _shut(_door(14, 2, 1)), "the YELLOW card is in the Lab Director's desk, and opens it")
	# the tubes
	var tubes: Array = level.things_by_tag.get("tubes", [])
	var broken: Array = level.things_by_tag.get("tubes_broken", [])
	_say(tubes.size() == 2 and tubes[0].visible and broken.size() == 2 and not broken[0].visible, "two stasis tubes, whole")
	_go(Vector2i(3, 10), 1)
	await _frames(90)
	_say(not tubes[0].visible and broken[0].visible and _kinds("glorexx", 1).size() == 2, "cross the middle of the bio lab and they decant (%d Glorexx)" % _kinds("glorexx", 1).size())
	for a in _kinds("glorexx"):
		a.hurt(99999.0, {})
	# the mist
	var mist: Trap = _thing("mist")
	pl.hp = 1000.0
	pl.global_position = mist.global_position + Vector3(0.9, 0.05, 0)
	await _frames(240)
	_say(pl.hp < 1000.0, "yellow-band mist is toxic (%.0f)" % (1000.0 - pl.hp))
	_say(await _pick(_thing("labenv"), "Switch off") and not mist.enabled and (_thing("fog") as Trap).enabled, "the lab terminal stops it; the blue fog carries on")
	pl.hp = pl.max_hp
	# the chamber
	var con := _thing("testconsole")
	var prize := _thing("prize")
	_say(not prize.visible and not _thing("archive").visible and not _thing("holo").visible, "the chamber's surprises are out of sight")
	for a in _kinds("drone", 1) + _kinds("custodian", 1):
		a.hurt(99999.0, {})
	await _frames(5)
	_say(await _pick(con, "ENDURANCE") and Game.has_flag("test_endure"), "ENDURANCE can be chosen")
	await _frames(150)
	var units: Array = level.things_by_tag.get("endurance", []).filter(func(a): return is_instance_valid(a) and not a.dead)
	_say(units.size() == 4 and _door(7, 10, 1).sealed and _door(11, 6, 1).sealed, "  it seals the chamber and sends in four units (%d)" % units.size())
	for a in units:
		a.hurt(99999.0, {})
	await _frames(20)
	_say(Game.has_flag("endure_done") and not _door(7, 10, 1).sealed and prize.visible, "  beat them and it opens again, with a prize")
	_say(not await _pick(con, "ARCHIVE"), "  one mode only: the console is locked")
	# --- floor 3
	_say(level.reach(level.center(Vector2i(10, 2), level.H), level.center(Vector2i(17, 2), 2 * level.H)), "the second lift goes up to the Security Complex")
	var heavy: Enemy = _thing("heavy")
	_say(heavy != null and not heavy.awake, "the Heavy Security Drone is on its station, dormant")
	var trip: Trap = _thing("tripwire")
	var n3: int = _kinds("drone", 2).size()
	pl.global_position = trip.global_position + Vector3(0, 0.05, 0)
	await _frames(120)
	var red := false
	for l in level.lights_by_room.get("Operations floor", []):
		red = red or (l.light_color.r > 0.8 and l.light_color.g < 0.4)
	_say(Game.has_flag("alarm") and not trip.enabled and red and _kinds("drone", 2).size() == n3 + 2, "the tripwire raises the alarm: red light, two more Knife Fighters")
	for a in level.actors:
		if is_instance_valid(a) and not a.dead and level.floor_of(a.global_position) == 2 and LM.defs["actors"].find_key(a.d) in ["drone", "turret", "heavy"]:
			a.hurt(999999.0, {})
	await _frames(10)
	_say(_door(10, 9, 2).is_locked() == false, "the badge opens the Security Station")
	var shock: Trap = _thing("shockfloor")
	_say(await _pick(_thing("station_console"), "Shut down") and Game.has_flag("traps_off") and not shock.enabled, "its console shuts the crossing traps down")
	_say(_door(13, 14, 2).is_locked() and await _pick(_thing("station_console"), "Unlock the armory") and not _door(13, 14, 2).is_locked(), "  and unlocks the armory")
	_go(Vector2i(9, 7), 2)
	_thing("redlocker").use(pl)
	await _frames(40)
	await _take("keycard")
	_say(Game.has_flag("key_red"), "the RED card is in the duty officer's locker")
	_say(not _shut(_door(7, 11, 2)) and not _shut(_door(11, 14, 1)), "  it opens the inner core, and the prototype vault downstairs")
	_go(Vector2i(13, 16), 2)
	await _frames(10)
	await _take("arc")
	_say(pl.weapons.has("arc"), "the arc carbine is in the armory")
	# the repair bay
	var bay: Rebuilder = _thing("bay")
	var cust: Array = _kinds("custodian", 2)
	var w0: int = bay.waiting().size()
	_say(bay != null and not cust.is_empty(), "the Repair Bay is running (%d robots owed)" % w0)
	cust[0].hurt(99999.0, {})
	await _frames(5)
	_say(bay.waiting().size() == w0 + 1, "  destroy a robot on its floor and it has one more to rebuild")
	var c0: int = _kinds("custodian", 2).size() + _kinds("drone", 2).size()
	bay.rebuild(bay.waiting()[0])
	await _frames(5)
	_say(_kinds("custodian", 2).size() + _kinds("drone", 2).size() == c0 + 1 and bay.waiting().size() == w0, "  and it rebuilds one")
	_say(await _pick(_thing("bay_console"), "Pull the power coupling") and Game.has_flag("bay_off"), "  until its coupling is pulled")
	# the core
	var field: Door = _door(4, 11, 2)
	var em: Array = level.things_by_tag.get("emitters", [])
	_say(field.sealed and em.size() == 3, "three emitters hold a field across the core")
	_say(not await _pick(_thing("lectern"), "Silence"), "the ad system cannot be silenced while the agency is open")
	for a in em:
		a.hurt(9999.0, {})
	await _frames(20)
	_say(Game.has_flag("field_down") and not field.sealed, "  destroy them and it drops")
	_say(await _pick(_thing("lectern"), "File Termination Order") and Game.has_flag("agency_closed"), "Termination Order 77-B closes the agency")
	var cr0 := Game.credits
	_say(await _pick(_thing("core"), "Seize the core") and Game.has_flag("ads_silent"), "the core can be seized")
	await _frames(40)
	await _take("ad_core")
	_say(Game.credits >= cr0 + 2500, "  and is worth a fortune (+%d cr)" % (Game.credits - cr0))
	_say(not _thing("core").visible, "  and is not there any more")
	# out
	var ended: Array = []
	Game.ended.connect(func(info): ended.append(info), CONNECT_ONE_SHOT)
	_say(await _pick(_thing("exit"), "Leave. (The agency is closed and its ads are silent.)") or not ended.is_empty(), "the front doors let you out")
	await _frames(5)
	_say(not ended.is_empty() and ended[0].get("title", "") == "The Last Campaign", "  with the ending you earned (%s)" % (ended[0].get("title", "?") if not ended.is_empty() else "none"))
	_say(Profile.d["trophies"].has("ad_core") and Profile.d["weapons"].has("arc") and int(Profile.d["credits"]) >= 2500, "  and what you carried out is banked at home")
