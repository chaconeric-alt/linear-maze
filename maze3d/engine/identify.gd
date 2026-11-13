class_name Identify
## Identify - easy mode's "what is that?". With easy mode on, E names whatever is under the crosshair before it does
## anything else: what it is called, the id it goes by in the files (the word to use when asking for it to be changed),
## the kit it comes from, where it stands and what state it is in. Shown on the HUD and printed to the log as IDENT.
##
## It finds things two ways: a ray from the eye (walls, floors, ceilings, doors, solid furniture, monsters, lifts,
## windows), and, for the things a ray passes through (pickups, traps, furniture you can walk through, signs, puddles),
## whatever stands nearest the line of sight in front of what the ray hit.

const REACH := 60.0


## {"title": the name, "detail": the line of ids and state}; empty if the player is looking at nothing.
static func look(pl: Player) -> Dictionary:
	var lv: Level = pl.level
	var from: Vector3 = pl.cam.global_position
	var fwd: Vector3 = -pl.cam.global_transform.basis.z
	var q := PhysicsRayQueryParameters3D.create(from, from + fwd * REACH, 1 | 4 | Level.GLASS)
	q.exclude = [pl.get_rid()]
	var hit: Dictionary = pl.get_world_3d().direct_space_state.intersect_ray(q)
	var hit_t: float = from.distance_to(hit["position"]) if not hit.is_empty() else REACH
	var hit_thing: Node = _owner_of(hit["collider"], lv) if not hit.is_empty() else null
	# things the ray goes through, or brushes past
	var best: Node = null
	var best_t := INF
	for n in lv.get_children():
		var r := _soft_radius(n)
		if r <= 0.0 or n == hit_thing:
			continue
		var c: Vector3 = _middle(n)
		var t := (c - from).dot(fwd)
		if t < 0.2 or t > hit_t + 0.7 or t >= best_t:
			continue
		if c.distance_to(from + fwd * t) < r:
			best = n
			best_t = t
	if best != null and (hit_thing == null or best_t < hit_t - 0.4):
		return _describe(best, lv)
	if hit_thing != null:
		return _describe(hit_thing, lv)
	if hit.is_empty():
		return {}
	if hit["collider"] == lv._glass:
		return _window(lv, hit["position"], hit["normal"])
	return _tile(lv, hit["position"], hit["normal"])


## The thing a collider belongs to: the prop, door, monster, lift or pit it is part of (not the level's own walls).
static func _owner_of(col: Object, lv: Level) -> Node:
	var n := col as Node
	while n != null and n != lv:
		if n is Prop or n is Door or n is Enemy or n is Pickup or n is Lift or n is Pit or n is Trap:
			return n
		n = n.get_parent()
	return null


## How near the line of sight something has to be to count, for things a ray will not hit. 0: found by the ray, or not a thing.
static func _soft_radius(n: Node) -> float:
	if n is Pickup:
		return 0.6
	if n is Trap or n is Puddle:
		return 1.3
	if n is Label3D:
		return 0.9
	if n is Enemy:
		return n.d.get("radius", 0.5) + 0.2 if n.dead else 0.0      # what is left of one
	if n is Door:
		return 1.5 if n._shape.disabled else 0.0     # open: the ray goes through the doorway
	if n is Prop:
		if n.meta.get("arch", false):
			return 1.3                               # the ray goes through the opening
		for c in n.get_children():
			if c is CollisionShape3D:
				return 0.0
		return 0.9
	return 0.0


static func _middle(n: Node) -> Vector3:
	var p: Vector3 = n.global_position
	if n is Door:
		return p + Vector3(0, 1.5, 0)
	if n is Prop:
		return p + Vector3(0, 1.4 if n.meta.get("mount", "") == "wall" or n.meta.get("arch", false) else 0.8, 0)
	if n is Trap:
		return p + Vector3(0, 1.0, 0)
	if n is Enemy:
		return p + Vector3(0, 0.4, 0)
	return p


static func _where(lv: Level, pos: Vector3) -> String:
	var c := lv.cell_of(pos)
	var f := lv.floor_of(pos)
	var s := "cell %d,%d" % [c.x, c.y]
	if lv.floors.size() > 1:
		s += " floor %d" % f
	var room := lv.room_at(c)
	if room != "":
		s += " · room \"%s\"" % room
	var style: String = lv.cell(c.x, c.y, f).get("style", "")
	if style != "":
		s += " · style %s" % style
	return s


static func _nice(id: String) -> String:
	return id.replace("_", " ").capitalize()


static func _describe(n: Node, lv: Level) -> Dictionary:
	var bits: Array = []
	var title := ""
	if n is Enemy:
		var id: Variant = LM.defs.get("actors", {}).find_key(n.d)
		title = n.d.get("name", str(id))
		bits.append("monster \"%s\"" % str(id))
		bits.append("model %s" % str(n.d.get("model", "?")).get_file())
		bits.append("%s, hp %d/%d" % ["dead" if n.dead else ("awake" if n.awake else "not yet woken"), ceil(maxf(0.0, n.hp)), n.max_hp])
		bits.append("behaviour %s" % n.d.get("behavior", "chaser"))
		if n.tag != "":
			bits.append("tag %s" % n.tag)
	elif n is Prop:
		var pid: String = n.e["prop"]
		title = n.e.get("name", n.meta.get("name", _nice(pid)))
		bits.append("prop \"%s\"" % pid)
		bits.append("kit %s" % LM.home_kit(n.kit_id, pid))
		var u: Dictionary = n.e.get("use", {})
		if not u.is_empty():
			bits.append("use: %s%s" % [u.get("type", "effects"), " (used)" if n.used > 0 else ""])
		if not n._walk.is_empty():
			bits.append("walk-through arch")
		if n.e.has("hp"):
			bits.append("breakable, hp %d" % ceil(n.hp))
		if u.is_empty() and n._walk.is_empty() and not n.e.has("hp"):
			bits.append("furniture (does nothing)")
		if n.tag != "":
			bits.append("tag %s" % n.tag)
	elif n is Door:
		var entry: Dictionary = lv.cell(n.cell_pos.x, n.cell_pos.y, n.storey).get("entry", {})
		var did: String = entry.get("door", "?")
		title = _nice(did)
		bits.append("door \"%s\"" % did)
		bits.append("kit %s" % LM.home_kit(lv.kit_id, did))
		var st := "open" if n.target > 0.5 else "shut"
		if n.sealed:
			st += ", sealed"
		if n.jammed:
			st += ", jammed"
		if n.lock != "":
			st += ", %s lock" % n.lock
		if n.flag != null:
			st += ", opens on %s" % str(n.flag)
		if n.need != "":
			st += ", needs %s" % n.need
		bits.append(st)
	elif n is Pickup:
		title = n.d.get("name", _nice(str(n.d.get("item", "item"))))
		bits.append("item \"%s\"" % n.d.get("item", "?"))
		bits.append("kind %s" % n.d.get("kind", "?"))
		bits.append("model %s" % n.d.get("model", "?"))
	elif n is Trap:
		title = "%s trap" % _nice(n.kind)
		bits.append("trap \"%s\"" % n.kind)
		bits.append("on" if n.enabled else "switched off")
		if n.e.get("tag", "") != "":
			bits.append("tag %s" % n.e["tag"])
	elif n is Pit:
		title = "Pit trap"
		bits.append("trap \"pit\"")
		bits.append("sprung" if n._open else "set")
	elif n is Lift:
		title = "Lift"
		bits.append("lift")
		bits.append("stops at floors %s" % ", ".join(n.stops.map(func(y): return str(int(round(y / lv.H))))))
	elif n is Puddle:
		title = "%s puddle" % _nice(n.kind)
		bits.append("puddle left by a monster")
	elif n is Label3D:
		title = "Sign"
		bits.append("sign \"%s\"" % n.text.replace("\n", " "))
	bits.append(_where(lv, n.global_position))
	return {"title": title, "detail": " · ".join(bits)}


## A wall, floor or ceiling: the tile laid nearest the spot, of the kind the surface says it is.
static func _tile(lv: Level, pos: Vector3, normal: Vector3) -> Dictionary:
	var kind := "floor" if normal.y > 0.7 else ("ceiling" if normal.y < -0.7 else "wall")
	var c := lv.cell_of(pos + normal * 0.2)
	var best := ""
	var best_d := 4.5
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			for t in lv.tiles_at.get(Vector2i(c.x + dx, c.y + dy), []):
				if lv.kit["tiles"].get(t[0], {}).get("kind", "") != kind:
					continue
				var at: Vector3 = t[1] + (Vector3(0, lv.H / 2, 0) if kind == "wall" else Vector3.ZERO)
				var d := at.distance_to(pos)
				if d < best_d:
					best_d = d
					best = t[0]
	var here := _where(lv, pos + normal * 0.2)
	if best == "":
		return {"title": "Structure", "detail": "plain %s built by the engine (a deck, slab, ramp side or rail; no tile) · %s" % [kind, here]}
	return {"title": "%s: %s" % [kind.capitalize(), _nice(best)], "detail": "%s tile \"%s\" · kit %s · %s" % [kind, best, LM.home_kit(lv.kit_id, best), here]}


static func _window(lv: Level, pos: Vector3, normal: Vector3) -> Dictionary:
	var c := lv.cell_of(pos - normal * 0.2)
	var f := lv.floor_of(pos)
	var id: String = lv.cell(c.x, c.y, f).get("window", "")
	if id == "":
		return {"title": "Window", "detail": "glass in a thin wall (\"walls\" entry, kind window) · %s" % _where(lv, pos + normal * 0.2)}
	return {"title": "Window: %s" % _nice(id), "detail": "window \"%s\" · kit %s · %s" % [id, LM.home_kit(lv.kit_id, id), _where(lv, pos - normal * 0.2)]}
