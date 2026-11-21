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
## flags, key cards and used panel options, which are kept in it as they happen (State, Interaction).
##
## A memory carries the signature of the level it was taken from (Spawner.signature): if the level's data has changed
## shape since (an edited level file), the memory is thrown away and the level starts afresh. SPEC.md 5.14.
class_name LevelMemory


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
				at.y = level.floor_y(at)             # on a wall or the ceiling: made again on the floor under it
			extra[k] = {"e": n.entry(), "at": [at.x, at.y, at.z], "yaw": n.rotation.y}
		if n.has_method("remember"):
			var r: Dictionary = n.remember()
			if not r.is_empty():
				things[k] = r
	return {"sig": sp.signature(), "things": things, "gone": gone.keys(), "extra": extra, "extra_n": sp.extra_n,
		"triggers": level.triggers.remember() if level.triggers else {}}


## Before the level's things are made: wipe a memory of a level of another shape; tell the Spawner what is gone.
static func prepare(level: Level, mem: Dictionary) -> void:
	if mem.is_empty():
		return
	if str(mem.get("sig", "")) != "" and mem["sig"] != level.spawner.signature():
		push_warning("Level %s has changed since it was last visited: what it remembered is forgotten" % level.data.get("id"))
		var fresh := WorldState.blank_memory()
		fresh["visits"] = mem.get("visits", 1)
		mem.clear()
		mem.merge(fresh)
	for k in mem.get("gone", []):
		level.spawner.gone[k] = true


## After the level is built: make again what was made while playing, and tell every remembered thing what it was.
static func lay(level: Level, mem: Dictionary) -> void:
	if mem.is_empty():
		return
	var sp := level.spawner
	var extra: Dictionary = mem.get("extra", {})
	for k in extra:
		var x: Dictionary = extra[k]
		var at := Vector3(float(x["at"][0]), float(x["at"][1]), float(x["at"][2]))
		var n := sp.spawn_thing(x["e"], level.cell_of(at), k)
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
