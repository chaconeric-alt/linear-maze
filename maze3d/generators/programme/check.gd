extends RefCounted
## ProgrammeCheck - the proof that a level can be finished (SPEC.md 6.3), as the 2D installation generator's: walk the
## level from the start, through open doors, picking up every key card on the way; a locked door opens once its
## colour's card is held; go on until nothing new is reached. It walks every storey: "map" is storey 0, each of
## "floors" its own; a balcony ("decks", level n over its floor) is floor n storeys up; a ramp that rises to a storey
## (from 2 to 4 m) joins the cell it rises toward on the storey above; a lift joins its stops. It works on any level
## dictionary, so the self-test can ask it of a level it did not make. What it says:
##   ok        there is a start, every room's floor was reached, and no card lies behind its own lock
##   reached   [cell, storey] -> true;  cards: colours held, in the order found;  missed: room names never reached
##   behind    colour -> true for a card that lies behind its own lock (found only with itself)
class_name ProgrammeCheck

const DIRS := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
const DIR_OF := {"n": Vector2i(0, -1), "s": Vector2i(0, 1), "e": Vector2i(1, 0), "w": Vector2i(-1, 0)}


static func solve(level: Dictionary) -> Dictionary:
	var w := ProgrammeCheck.world(level)
	var cards := {}
	var start: Array = []
	for t in level.get("things", []):
		var at: Array = t.get("at", [])
		if at.size() < 2:
			continue
		var place := [Vector2i(int(at[0]), int(at[1])), int(t.get("level", 0))]
		if t.get("start", null) is bool and t["start"]:
			start = place
		if t.get("item", "") == "keycard":
			cards[place] = str(t.get("color", "red"))
	var held: Array = []
	var reached := {}
	while not start.is_empty():
		var before := reached.size()
		reached = ProgrammeCheck._flood(w, start, held)
		var new_cards: Array = []
		for c in cards:
			if reached.has(c) and not held.has(cards[c]) and not new_cards.has(cards[c]):
				new_cards.append(cards[c])
		if new_cards.is_empty() and reached.size() == before:
			break
		held += new_cards
	var behind := {}
	for c in cards:                                    # a card found only once its own lock was open
		if not ProgrammeCheck._flood(w, start, held.filter(func(k: String) -> bool: return k != cards[c])).has(c):
			behind[cards[c]] = true
	var missed: Array = []
	for fr in w["rooms"]:
		var rc: Array = fr[0].get("rect", [])
		if rc.size() == 4 and not ProgrammeCheck._any_reached(reached, rc, int(fr[1])):
			missed.append(str(fr[0].get("name", "")))
	return {"ok": not start.is_empty() and missed.is_empty() and behind.is_empty(), "reached": reached, "cards": held,
		"missed": missed, "behind": behind}


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
				links.append([[c, f], [c + DIR_OF.get(str(rp.get("dir", "n")), Vector2i.ZERO), f + 1]])
	for t in level.get("things", []):
		if t.has("lift") and t.has("at"):
			var stops: Array = t["lift"]
			var c := Vector2i(int(t["at"][0]), int(t["at"][1]))
			for i in range(1, stops.size()):
				links.append([[c, int(stops[i - 1])], [c, int(stops[i])]])
	return {"maps": maps, "decks": decks, "links": links, "rooms": rooms, "legend": legend}


static func _any_reached(reached: Dictionary, rc: Array, f: int) -> bool:
	for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
		for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
			if reached.has([Vector2i(x, y), f]):
				return true
	return false


## Can this place be stood on with these cards: a floor or open door of its storey's map, or a balcony.
static func _open(w: Dictionary, p: Array, held: Array) -> bool:
	if w["decks"].has(p):
		return true
	var rows: Array = w["maps"].get(p[1], [])
	var c: Vector2i = p[0]
	if c.y < 0 or c.y >= rows.size() or c.x < 0 or c.x >= str(rows[c.y]).length():
		return false
	var e: Dictionary = w["legend"].get(str(rows[c.y])[c.x], {})
	return not e.get("solid", false) and not (e.has("lock") and not held.has(str(e["lock"])))


## Every place reachable from the start with these cards.
static func _flood(w: Dictionary, start: Array, held: Array) -> Dictionary:
	var seen := {start: true}
	var todo: Array = [start]
	var by_place := {}
	for lk in w["links"]:
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
