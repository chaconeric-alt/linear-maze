extends RefCounted
## LevelMemory - what a level remembers between visits: taken from it as the player leaves (take), and laid over it as
## it is built again (prepare, before its things are made; lay, after), as the 2D game's engine/memory.js does. The
## level is always built from its data; the memory only says what is different now.
##
## Every thing is known by its key (Spawner.plan). A thing that is gone (a pickup taken, a monster dead, a prop broken)
## is not made again. A thing made while playing (a cache's loot, a monster's drops, a monster an effect spawned) that
## is still there is made again from its entry, where it was. Every other thing that changed says how, in its own
## remember(), and is told it again by recall(): a prop's uses, lid and charges; a door's lock and seal; a trap
## switched off; a monster's health, where it stood, and being angered (it comes back calm). The level's triggers say
## which have gone off, what of the map was explored and which rooms were named. The memory also holds the level's
## flags, key cards and used panel options, which are kept in it as they happen (State, Interaction), and the day it
## was left: on the next visit its makers catch up on the days since (Restock).
##
## A memory carries the signature of the level it was taken from (Spawner.signature): if the level's data has changed
## shape since (an edited level file), the memory is thrown away and the level starts afresh. SPEC.md 5.14.
class_name LevelMemory

const ALWAYS := 1.0e6             # a trap that will come on within this many seconds: one that comes on at all


## What to keep of the level as it is now.
static func take(level: Level) -> Dictionary:
	var sp := level.spawner
	var gone: Dictionary = sp.gone.duplicate()
	var things := {}
	var extra := {}
	for k in level.things:
		var n: Variant = level.things[k]
		var lost: bool = n == null or not is_instance_valid(n) or (n as Node).is_queued_for_deletion() or (n is Actor and n.dead)
		if lost:
			if not sp.made.has(k):
				gone[k] = true                          # made by the data, so it must be told not to be made again
			continue
		if sp.made.has(k) and n.has_method("entry"):
			var at: Vector3 = n.global_position
			if n is Actor and (n as Actor).surf != 0:
				at.y = level.floor_y(at)             # on a wall or the ceiling: made again on the floor under it,
				at = LevelMemory.room_for(level, n, at)  # beside anyone standing there (it climbs back up)
			at = LevelMemory.out_of_traps(level, n, at)
			extra[k] = {"e": n.entry(), "at": [at.x, at.y, at.z], "yaw": n.rotation.y}
		if sp.made.has(k) and not extra.has(k):
			continue                                 # made while playing and not to be made again (a mine a monster laid): nothing to keep
		if n.has_method("remember"):
			var r: Dictionary = n.remember()
			if n is Actor and not (n as Actor).off_duty and (n as Actor).dock == null:      # its own record, too
				var q := LevelMemory.out_of_traps(level, n, n.global_position)
				if q != n.global_position:
					r["at"] = [q.x, q.y, q.z]
					r["yaw"] = n.rotation.y
			if not r.is_empty():
				things[k] = r
	return {"sig": sp.signature(), "things": things, "gone": gone.keys(), "extra": extra, "extra_n": sp.extra_n,
		"triggers": level.triggers.remember() if level.triggers else {}, "systems": level.systems.remember(), "left": State.day()}


## Before the level's things are made: wipe a memory of a level of another shape; let its makers catch up on the days
## since it was left (Restock); tell the Spawner what is gone. The keys of what the makers made again.
static func prepare(level: Level, mem: Dictionary) -> Array:
	if mem.is_empty():
		return []
	if str(mem.get("sig", "")) != "" and mem["sig"] != level.spawner.signature():
		push_warning("Level %s has changed since it was last visited: what it remembered is forgotten" % level.data.get("id"))
		var fresh := WorldState.blank_memory()
		fresh["visits"] = mem.get("visits", 1)
		mem.clear()
		mem.merge(fresh)
	var back: Array = []
	if mem.has("left") and not level.data.get("home", false):
		back = Restock.catch_up(mem, level.spawner.plan(), State.day() - int(mem["left"]), State.flags_for("world:"))
	for k in mem.get("gone", []):
		level.spawner.gone[k] = true
	return back


## After the level is built: make again what was made while playing, and tell every remembered thing what it was.
static func lay(level: Level, mem: Dictionary) -> void:
	if mem.is_empty():
		return
	var sp := level.spawner
	var extra: Dictionary = mem.get("extra", {})
	for k in extra:
		var x: Dictionary = extra[k]
		var at := Vector3(float(x["at"][0]), float(x["at"][1]), float(x["at"][2]))
		var e: Dictionary = x["e"].duplicate()
		if e.has("actor"):
			e["lounge"] = "none"                     # made again where it stood, not sent off to lean on a wall or sit
		var n := sp.spawn_thing(e, level.cell_of(at), k)
		if n != null:
			sp.made[k] = true
			n.global_position = at
			n.rotation.y = float(x.get("yaw", 0.0))
	sp.extra_n = maxi(sp.extra_n, int(mem.get("extra_n", 0)))
	var things: Dictionary = mem.get("things", {})
	for k in things:
		var n := level.thing(k)
		if n != null and n.has_method("recall"):
			n.recall(things[k])
	if level.triggers:
		level.triggers.recall(mem.get("triggers", {}))
	level.systems.recall(mem.get("systems", {}))


## A monster left standing in a working trap (one that would hurt it at some point in its cycle) is remembered at the
## nearest spot beside it that is open and clear of traps, as it would have stepped out while the player was away: made
## again in it, it would be hurt the moment the level was built, at a different time from when it was left. Anything
## else, or a monster with nowhere to step to, is remembered where it is.
static func out_of_traps(level: Level, n: Node, at: Vector3) -> Vector3:
	if not (n is Actor) or (n as Actor).surf != 0 or not level.hazard(n, at, ALWAYS):
		return at
	var c := level.cell_of(at)
	var storey := floori((at.y + 1.0) / level.H)
	var best := at
	var bd := INF
	for dy in [-1, 0, 1]:
		for dx in [-1, 0, 1]:
			var q: Vector2i = c + Vector2i(dx, dy)
			var p := level.center(q, at.y)
			if level.open_s(q.x, q.y, storey) and not level.hazard(n, p, ALWAYS) and p.distance_to(at) < bd:
				best = p
				bd = p.distance_to(at)
	return best


## A spot on the floor near `at` where `n` does not stand inside another monster: `at` itself if nobody is there,
## else the nearest open one of the spots round it, a metre and then two out. A climber remembered on the floor under
## where it clung could otherwise be made again inside whatever stood below it, and be pushed up onto its head.
static func room_for(level: Level, n: Node, at: Vector3) -> Vector3:
	var storey := floori((at.y + 1.0) / level.H)
	for r in [0.0, 1.0, 2.0]:
		for i in (1 if r == 0.0 else 8):
			var p: Vector3 = at + Vector3(cos(i * TAU / 8), 0, sin(i * TAU / 8)) * r
			var c := level.cell_of(p)
			if level.open_s(c.x, c.y, storey) and LevelMemory._free(level, n, p):
				return p
	return at


static func _free(level: Level, n: Node, p: Vector3) -> bool:
	var r: float = float((n as Actor).d.get("radius", 0.5))
	for o in level.actors:
		if o != n and is_instance_valid(o) and not o.dead and o.surf == 0 and absf(o.global_position.y - p.y) < 1.5:
			if Vector2(o.global_position.x - p.x, o.global_position.z - p.z).length() < r + float(o.d.get("radius", 0.5)) + 0.1:
				return false
	return true

