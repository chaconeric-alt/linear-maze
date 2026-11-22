extends Node
## SelfTest - plays a level by script and reports what broke. It walks, checks that everything placed can be reached,
## fights every actor, opens every container, works every terminal, takes every pickup, opens every door and stands in
## every trap.
##   godot --headless --path maze3d -- --level=<id> --selftest
## Prints lines starting PASS / FAIL / INFO and exits with the number of failures.
##
## The checks are in parts, one script per feature in tests/ (each a SelfTestPart, run in the order of STANDARD). A
## level can bring a test of its own, beside its level file: games/<game>/levels/<id>_test.gd. If that test's
## replaces_standard() says so, it runs instead of the standard parts (the bunker always; the Anomalous Structure with
## --story); the schema and keys parts run first either way, and the events part last. Parts use public methods only,
## of the game and of this runner.
class_name SelfTest

const STANDARD := ["movement", "reach", "traps", "identify", "arches", "actors", "balcony", "trap_victims", "remains", "use_key", "containers", "carrying", "pickups", "doors", "menus", "memory", "restock", "save", "unstick", "finish"]

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
	Debug.record_events = true                       # the events part holds the run's events up against the level
	Debug.carry_anything = true                      # every part takes what it finds; the carrying part tests the limits


func run(m: Node) -> void:
	main = m
	level = m.level
	pl = m.player
	process_mode = Node.PROCESS_MODE_ALWAYS
	Game.hud.mute_end_screen()                       # the test dies on purpose; keep the end screen out of it
	await frames(10)
	print("INFO  level ", level.data.get("id"), ": ", level.w, "x", level.h, " cells, ", level.actors.size(), " actors, ", level.doors.size(), " doors")
	await part("schema").run()
	await part("keys").run()
	await part("state").run()
	await part("character").run()
	var own := _level_test()
	if own != null and own.replaces_standard():
		await own.run()
	else:
		for p in STANDARD:
			await part(p).run()
	await part("events").run()
	print("RESULT  %d failures" % fails)
	get_tree().paused = false
	get_tree().quit(fails)


## One of the standard parts: tests/<name>_test.gd.
func part(name: String) -> SelfTestPart:
	return load("res://tests/%s_test.gd" % name).new(self)


## The level's own test, if it has one beside its level file.
func _level_test() -> SelfTestPart:
	var path: String = LM.game.get("root", "") + "levels/%s_test.gd" % level.data.get("id", "")
	if not ResourceLoader.exists(path):
		return null
	return load(path).new(self)


# ------------------------------------------------------------------ what every part uses
func say(ok: bool, what: String) -> void:
	print(("PASS  " if ok else "FAIL  ") + what)
	if not ok:
		fails += 1


func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func look_at(target: Vector3) -> void:
	var d := target - pl.cam.global_position
	pl.rotation.y = atan2(-d.x, -d.z)
	pl.pitch = clampf(asin(clamp(d.y / max(0.01, d.length()), -1.0, 1.0)), -PlayerCamera.PITCH_LIMIT, PlayerCamera.PITCH_LIMIT)      # no further than a mouse can tilt the head
	pl.head.rotation.x = pl.pitch


## The storey something is in: the one its height says, or the nearest one below that has air there (it may be on a ceiling).
func storey(pos: Vector3) -> int:
	var c := level.cell_of(pos)
	var st := floori((pos.y + 1.0) / level.H)
	for t in range(st, level.f_min - 1, -1):
		if level.open_s(c.x, c.y, t):
			return t
	return st                                        # it hangs on a wall: its own cell is rock


## Put the player on an open spot with a clear line to the target, about `want` metres off. tight: closer, or in a doorway.
func stand_near(target: Vector3, want := 5.0, tight := false) -> bool:
	var best := Vector3.INF
	var steep := Vector3.INF              # the best spot from which it would be almost straight up or down: if nothing else
	var c := level.cell_of(target)
	var st := storey(target)
	for r in range(0, 4):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var q := c + Vector2i(dx, dy)
				var here: Dictionary = level.cell_s(q.x, q.y, st)
				if here.is_empty() or (here["door"] != "" and not tight) or here["window"] != "":
					continue
				for off in [Vector3.ZERO, Vector3(1.2, 0, 0), Vector3(-1.2, 0, 0), Vector3(0, 0, 1.2), Vector3(0, 0, -1.2)]:
					var p: Vector3 = level.center(q, 0.0) + off
					p.y = level.floor_y(Vector3(p.x, st * level.H + 0.5, p.z)) + 0.05      # on the same storey as the target, if there is a floor there
					if p.distance_to(target) < (1.2 if tight else 2.0) or not _room_to_stand(p):
						continue
					if level.los(p + Vector3(0, 1.6, 0), target):
						if _too_steep(p, target):
							steep = _nearer(p, steep, target, want)
						else:
							best = _nearer(p, best, target, want)
					if off == Vector3.ZERO:
						break                               # the middle of the cell is free: no need to look round it
		if best != Vector3.INF:
			break
	if best == Vector3.INF:
		best = steep
	if best == Vector3.INF:
		return false
	pl.global_position = best
	pl.velocity = Vector3.ZERO
	return true


## p if it is nearer the distance wanted from the target than the best so far.
func _nearer(p: Vector3, best: Vector3, target: Vector3, want: float) -> Vector3:
	return p if absf(p.distance_to(target) - want) < absf(best.distance_to(target) - want) else best


## Would the player have to look more than 70° up or down from there? A player steps back from a turret high on a
## ceiling rather than stand under it; the head cannot tilt straight up (PlayerCamera.PITCH_LIMIT) and recoil pushes
## the aim past where it is pointed.
func _too_steep(p: Vector3, target: Vector3) -> bool:
	var d := target - (p + Vector3(0, Player.EYE, 0))
	return atan2(absf(d.y), Vector2(d.x, d.z).length()) > deg_to_rad(70.0)


## Is there room for the player's body there? A spot inside a piece of furniture is not one: the physics would push the
## player out to wherever it could, often behind that furniture with no line to what is being fought.
func _room_to_stand(p: Vector3) -> bool:
	var cap := CapsuleShape3D.new()
	cap.radius = 0.4
	cap.height = 1.8
	var q := PhysicsShapeQueryParameters3D.new()
	q.shape = cap
	q.transform = Transform3D(Basis(), p + Vector3(0, 0.95, 0))
	q.collision_mask = 1 | Level.GLASS
	q.exclude = [pl.get_rid()]
	return level.get_world_3d().direct_space_state.intersect_shape(q, 1).is_empty()


## Back to where the level starts.
func to_start() -> void:
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)


# ------------------------------------------------------------------ for scripted runs through a level (the level tests)
## The first thing still there with that tag.
func thing(tag: String) -> Node3D:
	var l: Array = level.things_by_tag.get(tag, [])
	for n in l:
		if is_instance_valid(n):
			return n
	return null


## Use a thing and take the option whose label starts with `label` (hacks are instant and never fail here). False if it is not offered.
func pick(n: Node, label: String) -> bool:
	if n == null:
		return false
	if Game.hud.in_panel():
		Game.hud.close_panel()
	pl.global_position = n.global_position + n.global_transform.basis.z * 1.6
	pl.global_position.y = level.floor_y(n.global_position + n.global_transform.basis.z * 1.6 + Vector3(0, 0.5, 0)) + 0.05
	n.use(pl)
	await frames(2)
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
	await frames(3)
	if Game.hud.in_panel():
		Game.hud.close_panel()
	await frames(2)
	return found


## Walk over every loose pickup of that kind (what a container has just thrown out).
func take(kind: String) -> int:
	var n := 0
	for it in level.get_children():
		if is_instance_valid(it) and it is Pickup and not it.is_queued_for_deletion() and it.d.get("item", "") == kind:
			pl.hp = minf(pl.hp, pl.max_hp - 1.0)
			pl.armor = 0.0
			pl.global_position = Vector3(it.global_position.x, level.floor_y(it.global_position) + 0.05, it.global_position.z)
			await frames(8)
			n += 1
	return n


func go(cellp: Vector2i, on_storey := 0) -> void:
	pl.global_position = level.center(cellp, on_storey * level.H + 0.05)
	pl.velocity = Vector3.ZERO


func door(x: int, y: int, on_storey := 0) -> Door:
	return level.doors.get(Vector2i(x, y)) if on_storey == 0 else level.doors_up.get(Vector3i(x, y, on_storey))


## A door the player could not walk through as things stand.
func shut(d: Door) -> bool:
	return d.sealed or (d.lock != "" and not Game.keys.has(d.lock)) or (d.flag != null and not Game.has_flag(d.flag))


## The living actors of that kind (on that storey, if given).
func kinds(kind: String, on_storey := -99) -> Array:
	return level.actors.filter(func(a): return is_instance_valid(a) and not a.dead and LM.defs["actors"].find_key(a.d) == kind and (on_storey == -99 or level.floor_of(a.global_position) == on_storey))
