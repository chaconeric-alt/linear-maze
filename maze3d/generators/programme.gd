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
## the start, the locks, the cards and the rooms' things in; ProgrammeFurnishing furnishes each room for its purpose;
## ProgrammeCheck proves it can be finished; ProgrammeDanger makes a wing written "danger" a danger zone. A seed whose
## level cannot be finished is tried again as the next (seed + 7919), as the rooms generator does, so the same seed
## still always gives the same level. On two floors (ProgrammeFloors) the lower floor's plan is drawn again, up to
## LOWER_TRIES times, for an upper floor whose tall rooms it gets in the way of, before the whole seed is given up.
class_name ProgrammeGen

const TRIES := 20
const LOWER_TRIES := 8
const LOWER_STEP := 104729


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
	if not level.has("programme") and not level.has("archetype"):
		return level
	if seed_value < 0:
		seed_value = absi(hash("%d:%s" % [State.world_seed(), level.get("id", "")])) % 1000000
	if level.has("archetype") and not level.has("programme"):      # written from its archetype first (InstallationGen)
		level = InstallationGen.write(level, seed_value)
	var out := ProgrammeGen.make(level, seed_value)
	if dump != "" and not out.is_empty():
		var f := FileAccess.open(dump, FileAccess.WRITE)
		if f:
			f.store_string(JSON.stringify(out, " "))
	return out


## One try: the level, or {"problems": [...], "fatal": true when the programme itself is wrong}. With "below", two
## floors (ProgrammeFloors): the upper laid out from the seed, the lower from the next, lined up by their bank.
static func attempt(level: Dictionary, seed_value: int) -> Dictionary:
	var prog: Dictionary = level.get("programme", {})
	var below: Dictionary = prog.get("below", {})
	var top := ProgrammePlan.new(prog, seed_value)
	if not top.problems.is_empty():
		return {"problems": top.problems, "fatal": true}
	var bot: ProgrammePlan = null
	var lay: ProgrammeLayout
	var lay2: ProgrammeLayout = null
	var fl: ProgrammeFloors
	for j in (LOWER_TRIES if not below.is_empty() else 1):
		if not below.is_empty():
			bot = ProgrammePlan.new(below, seed_value + 1 + j * LOWER_STEP)
			if not bot.problems.is_empty():
				return {"problems": bot.problems, "fatal": true}
			lay2 = ProgrammeLayout.new(bot)
		lay = ProgrammeLayout.new(top)                 # afresh: the floors move and carve the layouts they line up
		fl = ProgrammeFloors.new(lay, lay2, prog)
		if fl.problems.is_empty():
			break
	if not fl.problems.is_empty():
		return {"problems": fl.problems}
	var sunk := {}
	for id in fl.sunken:
		sunk[id] = -1
	prog = ProgrammeDanger.expand(prog, top)           # danger wings: their locks, and what lives in them
	if bot != null:
		below = ProgrammeDanger.expand(below, bot)
	var kit := str(level.get("kit", ""))
	var fill := ProgrammeFill.new(lay, prog, {"reserve": fl.reserve_up, "storeys": sunk, "kit": kit})
	var fill2: ProgrammeFill = ProgrammeFill.new(lay2, below, {"start": false, "storey": -1, "reserve": fl.reserve_lo,
		"legend": fill.legend, "kit": kit}) if bot != null else null
	var bad: Array = fill.problems + (fill2.problems if fill2 != null else [])
	if not bad.is_empty():
		return {"problems": bad, "fatal": true}
	var out := ProgrammeGen._assemble(level, seed_value, lay, fill, fl)
	if bot != null:
		ProgrammeGen._below(out, level, seed_value, lay, lay2, fill, fill2, fl)
	ProgrammeDanger.finish(out, lay, 0)                # their thresholds, zones and triggers
	if bot != null:
		ProgrammeDanger.finish(out, lay2, -1)
	var proof := ProgrammeCheck.solve(out)
	if not proof["ok"]:
		return {"problems": ["it cannot be finished (rooms not reached: %s; keys behind their own lock: %s)"
			% [", ".join(proof["missed"]), ", ".join(proof["behind"].keys())]]}
	return out


## The upper floor (the only one, with no "below") as the level: its map, rooms, things, furniture and the bank's lifts.
static func _assemble(level: Dictionary, seed_value: int, lay: ProgrammeLayout, fill: ProgrammeFill, fl: ProgrammeFloors) -> Dictionary:
	var prog: Dictionary = level["programme"]
	var out: Dictionary = level.duplicate(true)
	out.erase("programme")
	out["seed"] = seed_value
	out["map"] = lay.rows()
	out["legend"] = level.get("legend", {}).duplicate()
	out["legend"].merge(fill.legend, true)
	out["rooms"] = ProgrammeGen.rooms_of(lay, fl.sunken)
	var kit := str(level.get("kit", ""))
	var amount := float(prog.get("furnish", 1.0))
	out["things"] = level.get("things", []).duplicate(true) + fill.things + ProgrammeFurnishing.furnish(lay, fill, kit, seed_value, amount, fl.sunken)
	var bank := str(prog.get("bank", ""))
	if bank != "":
		var bank_room: Dictionary = fl.lo.plan.rooms[bank] if fl.lo != null else lay.plan.rooms[bank]
		out["things"] += fl.lift_things(bank_room.get("lifts", {}))
	return out


## The lower floor into the level: its own floor entry (map, rooms, the sunken halls, galleries and ramps), its things.
static func _below(out: Dictionary, level: Dictionary, seed_value: int, lay: ProgrammeLayout, lay2: ProgrammeLayout,
		fill: ProgrammeFill, fill2: ProgrammeFill, fl: ProgrammeFloors) -> void:
	var prog: Dictionary = level["programme"]
	var kit := str(level.get("kit", ""))
	var amount := float(prog.get("furnish", 1.0))
	var rooms := ProgrammeGen.rooms_of(lay2, [])
	var halls: Array = []
	for id in fl.sunken:
		var e: Dictionary = ProgrammeGen.room_entry(lay, id)
		e["height"] = maxi(2, int(e.get("height", 1)) + 1)
		rooms.append(e)
		halls.append([id, lay.rects[id], lay2.g])
	out["floors"] = [{"level": -1, "map": lay2.rows(), "rooms": rooms, "decks": fl.decks, "ramps": fl.ramps}]
	out["legend"].merge(fill2.legend, true)
	out["things"] += fill2.things + ProgrammeFurnishing.furnish(lay2, fill2, kit, seed_value + 1, amount) \
		+ ProgrammeFurnishing.furnish_rooms(halls, lay.plan, fill, kit, seed_value + 2, amount).map(func(e: Dictionary) -> Dictionary:
			e["level"] = -1
			return e)


## The level's rooms (what has a name, a style and a height): each room as written (less those in `leave`), each
## wing's corridor and each link's row.
static func rooms_of(lay: ProgrammeLayout, leave: Array) -> Array:
	var out: Array = []
	for id in lay.plan.spine + lay.rects.keys().filter(func(k: String) -> bool: return not lay.plan.spine.has(k)):
		if not leave.has(id):
			out.append(ProgrammeGen.room_entry(lay, id))
	for w in lay.plan.wings:
		var c: Rect2i = lay.corridors.filter(func(rc: Rect2i) -> bool: return rc.has_point(lay.junctions[w["id"]]))[0]
		var e := {"name": w["name"], "rect": [c.position.x, c.position.y, c.size.x, c.size.y], "wing": w["id"]}
		if str(w.get("corridor", "")) != "":
			e["style"] = w["corridor"]
		out.append(e)
	for ln in lay.plan.links:                             # a link's row round the outside (its ends are its wings')
		var rc: Rect2i = lay.rings[ln["id"]]
		if rc.size.x < 1:
			continue
		var e := {"name": ln["name"], "rect": [rc.position.x, rc.position.y, rc.size.x, rc.size.y], "link": ln["id"]}
		if str(ln.get("corridor", "")) != "":
			e["style"] = ln["corridor"]
		out.append(e)
	return out


## One room as the level lists it.
static func room_entry(lay: ProgrammeLayout, id: String) -> Dictionary:
	var r: Dictionary = lay.plan.rooms[id]
	var rc: Rect2i = lay.rects[id]
	var e := {"name": r.get("name", id), "rect": [rc.position.x, rc.position.y, rc.size.x, rc.size.y], "id": id}
	for k in ["style", "height", "purpose"]:
		if r.has(k):
			e[k] = r[k]
	return e
