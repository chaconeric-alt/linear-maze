extends RefCounted
## ProgrammeCheck - the proof that a level can be finished (SPEC.md 6.3), as the 2D installation generator's: walk the
## level from the start, through open doors, picking up every key card on the way; a locked door opens once its
## colour's card is held; go on until nothing new is reached. It walks every storey: "map" is storey 0, each of
## "floors" its own; a balcony ("decks", level n over its floor) is floor n storeys up; a ramp that rises to a storey
## (from 2 to 4 m) joins the cell it rises toward on the storey above; a lift joins its stops; a balcony joins what
## is beside it on its storey only through a door or a lift's shaft (the room's wall stands between them). It works on
## any level dictionary, so the self-test can ask it of a level it did not make.
## Flags are keys too. A thing reached that sets a flag (its "use" runs a "flag" effect, at once or as an option open
## to anyone: no hack, skill, load or price, and its "when", if any, already held) gives that flag, and one that drops a
## key card gives the card; a card gives its "key_<colour>" flag as well. A door with a "flag" in its legend entry, and
## a lift with a "lock", open on any one of theirs (a list), or on every one of an {"all": [...]}.
## The level's systems (SPEC.md 5.25) are keys as well: "sys:<system>=<state>", held from the start for each system's
## starting state, and given by what changes it (a "system" effect: its "to", or every state for "next"). A door, a
## lift, a thing or an option with "needs" opens or gives only once the states it needs are held. A state once had
## counts as had for good (a panel that changed it can change it back), which is the one way the proof is generous.
## What it says:
##   ok        there is a start, every room's floor was reached, and no card or flag lies behind its own lock
##   reached   [cell, storey] -> true;  cards: colours held, in the order found;  flags: flags held, in that order;
##             systems: the system states had, in that order
##   missed    room names never reached;  behind: colour or flag -> true for one found only with itself
## `opts`: "withhold" (keys never given, as held: a flag's name, "card:<colour>" and "key_<colour>", "sys:...") and
## "seal" (rects [x, y, w, h] of storey 0 never walked): the level as it would be without one way or another, so a
## test can prove a gate has a second way past (ProgrammeGraph, SPEC.md 6.3).
class_name ProgrammeCheck

const DIRS := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
const DIR_OF := {"n": Vector2i(0, -1), "s": Vector2i(0, 1), "e": Vector2i(1, 0), "w": Vector2i(-1, 0)}


static func solve(level: Dictionary, opts := {}) -> Dictionary:
	var w := ProgrammeCheck.world(level, opts.get("seal", []))
	var withhold: Array = opts.get("withhold", [])
	var givers := ProgrammeCheck.givers(level)
	var start := ProgrammeCheck.start_of(level)
	var held: Array = w["starts"].duplicate()
	var reached := {}
	while not start.is_empty():
		var before := held.size()
		reached = ProgrammeCheck.flood(w, start, held)
		for gv in givers:
			if reached.has(gv["at"]) and ProgrammeCheck._may(gv["when"], held) and ProgrammeCheck.ok_for(w, gv["needs"], held):
				for k in gv["gives"]:
					if not held.has(k) and not withhold.has(k):
						held.append(k)
		if held.size() == before:
			break
	var behind := {}
	for gv in givers:                                  # a key found only once its own lock was open
		for k in gv["gives"]:
			if held.has(k) and not w["starts"].has(k) and not ProgrammeCheck.flood(w, start, held.filter(func(h: String) -> bool: return h != k)).has(gv["at"]):
				behind[k] = true
	var missed: Array = []
	for fr in w["rooms"]:
		var rc: Array = fr[0].get("rect", [])
		if rc.size() == 4 and not ProgrammeCheck._any_reached(reached, rc, int(fr[1])):
			missed.append(str(fr[0].get("name", "")))
	return {"ok": not start.is_empty() and missed.is_empty() and behind.is_empty(), "reached": reached,
		"cards": held.filter(func(k: String) -> bool: return k.begins_with("card:")).map(func(k: String) -> String: return k.substr(5)),
		"flags": held.filter(func(k: String) -> bool: return not k.begins_with("card:") and not k.begins_with("sys:")),
		"systems": held.filter(func(k: String) -> bool: return k.begins_with("sys:")),
		"missed": missed, "behind": ProgrammeCheck._named(behind)}


## Where the level starts: [cell, storey], or [] if it has no start.
static func start_of(level: Dictionary) -> Array:
	var start: Array = []
	for t in level.get("things", []):
		if t.get("start", null) is bool and t["start"] and t.get("at", []).size() >= 2:
			start = [Vector2i(int(t["at"][0]), int(t["at"][1])), int(t.get("level", 0))]
	return start


## What gives a key, where: [{"at": [cell, storey], "gives": ["card:red", "key_red", flag, "sys:power=on"...],
## "when": flags or null, "needs": {system: state}}]. A key card lying in the level; a thing whose use sets flags,
## drops cards or changes a system, at once or by an option anyone can take (an option's "when" is what it waits
## for; its "needs" and the thing's are what it needs).
static func givers(level: Dictionary) -> Array:
	var out: Array = []
	for t in level.get("things", []):
		var at: Array = t.get("at", [])
		if at.size() < 2:
			continue
		var place := [Vector2i(int(at[0]), int(at[1])), int(t.get("level", 0))]
		if t.get("item", "") == "keycard":
			out.append({"at": place, "gives": ProgrammeCheck._card(t), "when": null, "needs": {}})
		var use: Dictionary = t.get("use", {}) if t.get("use") is Dictionary else {}
		var needs: Dictionary = t.get("needs", {}) if t.get("needs") is Dictionary else {}
		var runs: Array = [[use.get("effects", []), use.get("when"), needs]]
		for o in use.get("options", []):
			if not (o.get("hack", false) or o.has("skill") or o.has("carrying") or o.has("cost")):
				var both: Dictionary = needs.duplicate()
				both.merge(o.get("needs", {}) if o.get("needs") is Dictionary else {}, true)
				runs.append([o.get("effects", []), o.get("when"), both])
		for rn in runs:
			var gives := ProgrammeCheck._gives(rn[0])
			if not gives.is_empty():
				out.append({"at": place, "gives": gives, "when": rn[1], "needs": rn[2]})
	return out


static func _card(t: Dictionary) -> Array:
	var c := str(t.get("color", "red"))
	return ["card:" + c, "key_" + c]


## The keys a list of effects gives: the flags it sets, the cards it drops.
static func _gives(effects: Variant) -> Array:
	var out: Array = []
	if not effects is Array:
		return out
	for ef in effects:
		if not ef is Dictionary:
			continue
		if ef.get("type", "") == "flag" and ef.has("name"):
			out.append(str(ef["name"]))
		elif ef.get("type", "") == "key":
			out += ProgrammeCheck._card({"color": ef.get("color", "red")})
		elif ef.get("type", "") == "drop":
			for it in ef.get("items", []):
				if it is Dictionary and it.get("item", "") == "keycard":
					out += ProgrammeCheck._card(it)
		elif ef.get("type", "") == "system":
			var n := str(ef.get("system", ""))
			var states: Array = LM.game.get("systems", {}).get(n, {}).get("states", {}).keys()
			for st in (states if ef.get("next", false) else [str(ef.get("to", ""))]):
				out.append("sys:%s=%s" % [n, st])
	return out


## Are the system states `needs` asks for held ({system: state, or a list: any one}); a system the level does not
## have stops nothing, as in the game (LevelSystems.ok).
static func ok_for(w: Dictionary, needs: Variant, held: Array) -> bool:
	if not needs is Dictionary:
		return true
	for n in needs:
		if not w["systems"].has(n):
			continue
		var want: Array = needs[n] if needs[n] is Array else [needs[n]]
		if not want.any(func(st: Variant) -> bool: return held.has("sys:%s=%s" % [n, st])):
			return false
	return true


## Is what waits for these flags open: none, or any one of them held (as Game.has_flag reads a list), or every one
## of an {"all": [...]} (each of which may be a list or another "all").
static func _may(need: Variant, held: Array) -> bool:
	if need == null:
		return true
	if need is Array:
		return need.is_empty() or need.any(func(f: Variant) -> bool: return ProgrammeCheck._may(f, held))
	if need is Dictionary:
		return need.get("all", []).all(func(f: Variant) -> bool: return ProgrammeCheck._may(f, held))
	return held.has(str(need))


## A key as the level calls it: a card by its colour, a flag by its name.
static func _named(keys: Dictionary) -> Dictionary:
	var out := {}
	for k in keys:
		out[k.substr(5) if k.begins_with("card:") else k] = true
	return out


## The level as the proof walks it: per storey its map's rows, the balconies on it, the legend; the links between
## storeys (ramps, lifts); every room with its storey; its systems and the keys of their starting states; the cells
## sealed (`seal`: rects of storey 0).
static func world(level: Dictionary, seal: Array = []) -> Dictionary:
	var legend: Dictionary = {"#": {"solid": true}, " ": {"solid": true}}          # as LevelData reads a map
	legend.merge(LM.game.get("legend", {}), true)
	legend.merge(level.get("legend", {}), true)
	var maps := {0: level.get("map", [])}
	var decks := {}
	var links: Array = []
	var rooms: Array = []
	var parts: Array = [[level, 0]]
	for fd in level.get("floors", []):
		maps[int(fd.get("level", 0))] = fd.get("map", [])
		legend.merge(fd.get("legend", {}), true)
		parts.append([fd, int(fd.get("level", 0))])
	for pt in parts:
		var d: Dictionary = pt[0]
		var f: int = pt[1]
		for r in d.get("rooms", []):
			rooms.append([r, f])
		for dk in d.get("decks", []):
			decks[[Vector2i(int(dk["at"][0]), int(dk["at"][1])), f + int(dk.get("level", 1))]] = true
		for rp in d.get("ramps", []):
			if float(rp.get("to", 2)) >= 4.0:              # its top is a storey up: it joins the cell it rises toward there
				var c := Vector2i(int(rp["at"][0]), int(rp["at"][1]))
				links.append([[c, f], [c + DIR_OF.get(str(rp.get("dir", "n")), Vector2i.ZERO), f + 1], null, {}])
	var shafts := {}
	for t in level.get("things", []):
		if t.has("lift") and t.has("at"):
			var stops: Array = t["lift"]
			var c := Vector2i(int(t["at"][0]), int(t["at"][1]))
			var lock: Variant = t["lock"].get("flag") if t.get("lock") is Dictionary else null
			for i in range(1, stops.size()):
				links.append([[c, int(stops[i - 1])], [c, int(stops[i])], lock, t.get("needs", {})])
			for f in range(int(stops.min()) + 1, int(stops.max()) + 1):    # open above its lowest stop, as LevelData builds it
				shafts[[c, f]] = true
	var sealed := {}
	for rc in seal:
		for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
			for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
				sealed[[Vector2i(x, y), 0]] = true
	var systems := {}
	var starts: Array = []
	for n in level.get("systems", {}):
		var given: Variant = level["systems"][n]
		var kinds: Array = LM.game.get("systems", {}).get(n, {}).get("states", {}).keys()
		var st := str(given.get("start", "") if given is Dictionary else given)
		systems[n] = true
		starts.append("sys:%s=%s" % [n, st if st != "" or kinds.is_empty() else kinds[0]])
	return {"maps": maps, "decks": decks, "links": links, "rooms": rooms, "legend": legend, "sealed": sealed,
		"systems": systems, "starts": starts, "shafts": shafts}


static func _any_reached(reached: Dictionary, rc: Array, f: int) -> bool:
	for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
		for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
			if reached.has([Vector2i(x, y), f]):
				return true
	return false


## Can this place be stood on with these keys: a floor or open door of its storey's map, a balcony, or a lift's shaft
## on a storey above its lowest stop (open there whatever the map says, as LevelData builds it); not sealed.
static func walkable(w: Dictionary, p: Array, held: Array) -> bool:
	if w["sealed"].has(p):
		return false
	if w["decks"].has(p) or w["shafts"].has(p):
		return true
	var rows: Array = w["maps"].get(p[1], [])
	var c: Vector2i = p[0]
	if c.y < 0 or c.y >= rows.size() or c.x < 0 or c.x >= str(rows[c.y]).length():
		return false
	var e: Dictionary = w["legend"].get(str(rows[c.y])[c.x], {})
	if e.get("solid", false) or (e.has("lock") and not held.has("card:" + str(e["lock"]))):
		return false
	return (not e.has("flag") or ProgrammeCheck._may(e["flag"], held)) and ProgrammeCheck.ok_for(w, e.get("needs"), held)


## Every place reachable from the start with these keys: place -> how many steps from the start (a lift's ride or a
## ramp's climb is one step).
static func flood(w: Dictionary, start: Array, held: Array) -> Dictionary:
	var seen := {start: 0}
	var todo: Array = [start]
	var by_place := ProgrammeCheck.joins(w, held)
	var i := 0
	while i < todo.size():                             # breadth first, so the count is the fewest steps
		var p: Array = todo[i]
		i += 1
		var next: Array = by_place.get(p, []).duplicate()
		for d in DIRS:
			var q := [p[0] + d, p[1]]
			if ProgrammeCheck._open_between(w, p, q):
				next.append(q)
		for n in next:
			if seen.has(n) or not ProgrammeCheck.walkable(w, n, held):
				continue
			seen[n] = int(seen[p]) + 1
			todo.append(n)
	return seen


## Can one step from p to q, beside it on the same storey? Between a balcony and what is not one, only through a door
## or into a lift's shaft: a balcony in a tall room and a room upstairs beside it have the room's wall between them,
## as the level builds them.
static func _open_between(w: Dictionary, p: Array, q: Array) -> bool:
	var dp: bool = w["decks"].has(p)
	if dp == w["decks"].has(q):
		return true
	var other: Array = q if dp else p
	if w["shafts"].has(other):
		return true
	var rows: Array = w["maps"].get(other[1], [])
	var c: Vector2i = other[0]
	if c.y < 0 or c.y >= rows.size() or c.x < 0 or c.x >= str(rows[c.y]).length():
		return false
	return w["legend"].get(str(rows[c.y])[c.x], {}).has("door")


## The links between storeys open with these keys: place -> the places it joins (a lift held by its lock or its
## systems joins nothing).
static func joins(w: Dictionary, held: Array) -> Dictionary:
	var by_place := {}
	for lk in w["links"]:
		if not ProgrammeCheck._may(lk[2], held) or not ProgrammeCheck.ok_for(w, lk[3], held):
			continue
		for k in 2:
			var a: Array = lk[k]
			if not by_place.has(a):
				by_place[a] = []
			by_place[a].append(lk[1 - k])
	return by_place
