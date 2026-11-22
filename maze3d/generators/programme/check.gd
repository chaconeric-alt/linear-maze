extends RefCounted
## ProgrammeCheck - the proof that a level can be finished (SPEC.md 6.3), as the 2D installation generator's: walk the
## level from the start, through open doors, picking up every key card on the way; a locked door opens once its
## colour's card is held; go on until nothing new is reached. It walks every storey: "map" is storey 0, each of
## "floors" its own; a balcony ("decks", level n over its floor) is floor n storeys up; a ramp that rises to a storey
## (from 2 to 4 m) joins the cell it rises toward on the storey above; a lift joins its stops. It works on any level
## dictionary, so the self-test can ask it of a level it did not make.
## Flags are keys too. A thing reached that sets a flag (its "use" runs a "flag" effect, at once or as an option open
## to anyone: no hack, skill, load or price, and its "when", if any, already held) gives that flag, and one that drops a
## key card gives the card; a card gives its "key_<colour>" flag as well. A door with a "flag" in its legend entry, and
## a lift with a "lock", open on any one of theirs. What it says:
##   ok        there is a start, every room's floor was reached, and no card or flag lies behind its own lock
##   reached   [cell, storey] -> true;  cards: colours held, in the order found;  flags: flags held, in that order
##   missed    room names never reached;  behind: colour or flag -> true for one found only with itself
class_name ProgrammeCheck

const DIRS := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
const DIR_OF := {"n": Vector2i(0, -1), "s": Vector2i(0, 1), "e": Vector2i(1, 0), "w": Vector2i(-1, 0)}


static func solve(level: Dictionary) -> Dictionary:
	var w := ProgrammeCheck.world(level)
	var givers := ProgrammeCheck.givers(level)
	var start: Array = []
	for t in level.get("things", []):
		if t.get("start", null) is bool and t["start"] and t.get("at", []).size() >= 2:
			start = [Vector2i(int(t["at"][0]), int(t["at"][1])), int(t.get("level", 0))]
	var held: Array = []
	var reached := {}
	while not start.is_empty():
		var before := held.size()
		reached = ProgrammeCheck._flood(w, start, held)
		for gv in givers:
			if reached.has(gv["at"]) and ProgrammeCheck._may(gv["when"], held):
				for k in gv["gives"]:
					if not held.has(k):
						held.append(k)
		if held.size() == before:
			break
	var behind := {}
	for gv in givers:                                  # a key found only once its own lock was open
		for k in gv["gives"]:
			if held.has(k) and not ProgrammeCheck._flood(w, start, held.filter(func(h: String) -> bool: return h != k)).has(gv["at"]):
				behind[k] = true
	var missed: Array = []
	for fr in w["rooms"]:
		var rc: Array = fr[0].get("rect", [])
		if rc.size() == 4 and not ProgrammeCheck._any_reached(reached, rc, int(fr[1])):
			missed.append(str(fr[0].get("name", "")))
	return {"ok": not start.is_empty() and missed.is_empty() and behind.is_empty(), "reached": reached,
		"cards": held.filter(func(k: String) -> bool: return k.begins_with("card:")).map(func(k: String) -> String: return k.substr(5)),
		"flags": held.filter(func(k: String) -> bool: return not k.begins_with("card:")),
		"missed": missed, "behind": ProgrammeCheck._named(behind)}


## What gives a key, where: [{"at": [cell, storey], "gives": ["card:red", "key_red", flag...], "when": flags or null}].
## A key card lying in the level; a thing whose use sets flags or drops cards, at once or by an option anyone can
## take (an option's "when" is what it waits for).
static func givers(level: Dictionary) -> Array:
	var out: Array = []
	for t in level.get("things", []):
		var at: Array = t.get("at", [])
		if at.size() < 2:
			continue
		var place := [Vector2i(int(at[0]), int(at[1])), int(t.get("level", 0))]
		if t.get("item", "") == "keycard":
			out.append({"at": place, "gives": ProgrammeCheck._card(t), "when": null})
		var use: Dictionary = t.get("use", {}) if t.get("use") is Dictionary else {}
		var runs: Array = [[use.get("effects", []), use.get("when")]]
		for o in use.get("options", []):
			if not (o.get("hack", false) or o.has("skill") or o.has("carrying") or o.has("cost")):
				runs.append([o.get("effects", []), o.get("when")])
		for rn in runs:
			var gives := ProgrammeCheck._gives(rn[0])
			if not gives.is_empty():
				out.append({"at": place, "gives": gives, "when": rn[1]})
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
	return out


## Is what waits for these flags open: none, or any one of them held (as Game.has_flag reads a list).
static func _may(need: Variant, held: Array) -> bool:
	if need == null:
		return true
	if need is Array:
		return need.is_empty() or need.any(func(f: Variant) -> bool: return held.has(str(f)))
	return held.has(str(need))


## A key as the level calls it: a card by its colour, a flag by its name.
static func _named(keys: Dictionary) -> Dictionary:
	var out := {}
	for k in keys:
		out[k.substr(5) if k.begins_with("card:") else k] = true
	return out


## The level as the proof walks it: per storey its map's rows, the balconies on it, the legend; the links between
## storeys (ramps, lifts); every room with its storey.
static func world(level: Dictionary) -> Dictionary:
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
				links.append([[c, f], [c + DIR_OF.get(str(rp.get("dir", "n")), Vector2i.ZERO), f + 1], null])
	for t in level.get("things", []):
		if t.has("lift") and t.has("at"):
			var stops: Array = t["lift"]
			var c := Vector2i(int(t["at"][0]), int(t["at"][1]))
			var lock: Variant = t["lock"].get("flag") if t.get("lock") is Dictionary else null
			for i in range(1, stops.size()):
				links.append([[c, int(stops[i - 1])], [c, int(stops[i])], lock])
	return {"maps": maps, "decks": decks, "links": links, "rooms": rooms, "legend": legend}


static func _any_reached(reached: Dictionary, rc: Array, f: int) -> bool:
	for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
		for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
			if reached.has([Vector2i(x, y), f]):
				return true
	return false


## Can this place be stood on with these keys: a floor or open door of its storey's map, or a balcony.
static func _open(w: Dictionary, p: Array, held: Array) -> bool:
	if w["decks"].has(p):
		return true
	var rows: Array = w["maps"].get(p[1], [])
	var c: Vector2i = p[0]
	if c.y < 0 or c.y >= rows.size() or c.x < 0 or c.x >= str(rows[c.y]).length():
		return false
	var e: Dictionary = w["legend"].get(str(rows[c.y])[c.x], {})
	if e.get("solid", false) or (e.has("lock") and not held.has("card:" + str(e["lock"]))):
		return false
	return not e.has("flag") or ProgrammeCheck._may(e["flag"], held)


## Every place reachable from the start with these keys.
static func _flood(w: Dictionary, start: Array, held: Array) -> Dictionary:
	var seen := {start: true}
	var todo: Array = [start]
	var by_place := {}
	for lk in w["links"]:
		if not ProgrammeCheck._may(lk[2], held):
			continue                                     # a lift still locked
		for k in 2:
			var a: Array = lk[k]
			if not by_place.has(a):
				by_place[a] = []
			by_place[a].append(lk[1 - k])
	while not todo.is_empty():
		var p: Array = todo.pop_back()
		var next: Array = by_place.get(p, []).duplicate()
		for d in DIRS:
			next.append([p[0] + d, p[1]])
		for n in next:
			if seen.has(n) or not ProgrammeCheck._open(w, n, held):
				continue
			seen[n] = true
			todo.append(n)
	return seen
