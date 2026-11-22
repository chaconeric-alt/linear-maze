extends RefCounted
## programme - lays a level out from a written programme (SPEC.md 6.3): the level's file says which rooms it has, each
## with a purpose, a size and its neighbours, and this makes the map, its doors, locks and cards, and puts each room's
## things in it. The same programme and seed always make the same level; another seed (another world) makes another
## layout of the same rooms. A level file with "programme" is made by this when it is entered (Main), from the world's
## seed; its key is its own id, so it is remembered between visits like a level drawn by hand. --dump writes the
## result as an ordinary level file.
##
## The steps, each in generators/programme/: ProgrammePlan reads the programme and makes every choice the seed makes;
## ProgrammeLayout lays the plan out (the spine, its rooms, the wings and their rooms, the doors); ProgrammeFill puts
## the start, the locks, the cards and the rooms' things in; ProgrammeCheck proves it can be finished. A seed whose
## level cannot be finished is tried again as the next (seed + 7919), as the rooms generator does, so the same seed
## still always gives the same level.
class_name ProgrammeGen

const TRIES := 20


## The level, laid out: the level file's own keys (name, kit, style, intro, objectives, triggers ...) kept, its
## "programme" made into "map", "legend", "rooms" and "things". {} with every problem printed if no try will do.
static func make(level: Dictionary, seed_value: int) -> Dictionary:
	var why: Array = []
	for attempt in TRIES:
		var out := ProgrammeGen.attempt(level, seed_value + attempt * 7919)
		if out.has("problems"):
			why = out["problems"]
			if out.get("fatal", false):
				break
			continue
		return out
	push_error("programme '%s': no level: %s" % [level.get("id", ""), "; ".join(why)])
	return {}


## A level as it is entered (Main): one without a programme as it is; one with, laid out from `seed` if one was given
## (--seed), else from the world's seed and the level's id, and written to `dump` if a path was given (--dump).
static func entered(level: Dictionary, seed_value: int, dump: String) -> Dictionary:
	if not level.has("programme"):
		return level
	if seed_value < 0:
		seed_value = absi(hash("%d:%s" % [State.world_seed(), level.get("id", "")])) % 1000000
	var out := ProgrammeGen.make(level, seed_value)
	if dump != "" and not out.is_empty():
		var f := FileAccess.open(dump, FileAccess.WRITE)
		if f:
			f.store_string(JSON.stringify(out, " "))
	return out


## One try: the level, or {"problems": [...], "fatal": true when the programme itself is wrong}.
static func attempt(level: Dictionary, seed_value: int) -> Dictionary:
	var prog: Dictionary = level.get("programme", {})
	var plan := ProgrammePlan.new(prog, seed_value)
	if not plan.problems.is_empty():
		return {"problems": plan.problems, "fatal": true}
	var lay := ProgrammeLayout.new(plan)
	var fill := ProgrammeFill.new(lay, prog)
	if not fill.problems.is_empty():
		return {"problems": fill.problems, "fatal": true}
	var out: Dictionary = level.duplicate(true)
	out.erase("programme")
	out["seed"] = seed_value
	out["map"] = lay.rows()
	out["legend"] = level.get("legend", {}).duplicate()
	out["legend"].merge(fill.legend, true)
	out["rooms"] = ProgrammeGen.rooms_of(lay, prog)
	out["things"] = level.get("things", []).duplicate(true) + fill.things
	var proof := ProgrammeCheck.solve(out)
	if not proof["ok"]:
		return {"problems": ["it cannot be finished (rooms not reached: %s; cards behind their own lock: %s)"
			% [", ".join(proof["missed"]), ", ".join(proof["behind"].keys())]]}
	return out


## The level's rooms (what has a name, a style and a height): each room as written, and each wing's corridor.
static func rooms_of(lay: ProgrammeLayout, prog: Dictionary) -> Array:
	var out: Array = []
	for id in lay.plan.spine + lay.rects.keys().filter(func(k: String) -> bool: return not lay.plan.spine.has(k)):
		var r: Dictionary = lay.plan.rooms[id]
		var rc: Rect2i = lay.rects[id]
		var e := {"name": r.get("name", id), "rect": [rc.position.x, rc.position.y, rc.size.x, rc.size.y], "id": id}
		for k in ["style", "height", "purpose"]:
			if r.has(k):
				e[k] = r[k]
		out.append(e)
	for w in lay.plan.wings:
		var c: Rect2i = lay.corridors.filter(func(rc: Rect2i) -> bool: return rc.has_point(lay.junctions[w["id"]]))[0]
		var e := {"name": w["name"], "rect": [c.position.x, c.position.y, c.size.x, c.size.y], "wing": w["id"]}
		if str(w.get("corridor", "")) != "":
			e["style"] = w["corridor"]
		out.append(e)
	return out
