extends RefCounted
## ProgrammeCheck - the proof that a level can be finished (SPEC.md 6.3), as the 2D installation generator's: walk the
## level's cells from the start, through open doors, picking up every key card on the way; a locked door opens once its
## colour's card is held; go on until nothing new is reached. It works on any level dictionary (its "map", "legend" and
## "things"), so the self-test can ask it of a level it did not make. What it says:
##   ok        there is a start, every room's floor was reached, and no card lies behind its own lock
##   reached   cell -> true;  cards: colours held, in the order found;  missed: room names never reached
##   behind    colour -> true for a card that lies behind its own lock (found only with itself)
class_name ProgrammeCheck

const DIRS := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]


static func solve(level: Dictionary) -> Dictionary:
	var rows: Array = level.get("map", [])
	var legend: Dictionary = {"#": {"solid": true}, " ": {"solid": true}}          # as LevelData reads a map
	legend.merge(LM.game.get("legend", {}), true)
	legend.merge(level.get("legend", {}), true)
	var cards := {}
	var start := Vector2i(-1, -1)
	for t in level.get("things", []):
		var at: Array = t.get("at", [])
		if at.size() < 2:
			continue
		if t.get("start", null) is bool and t["start"]:
			start = Vector2i(int(at[0]), int(at[1]))
		if t.get("item", "") == "keycard":
			cards[Vector2i(int(at[0]), int(at[1]))] = str(t.get("color", "red"))
	var held: Array = []
	var reached := {}
	var behind := {}
	while start.x >= 0:
		var before := reached.size()
		reached = ProgrammeCheck._flood(rows, legend, start, held)
		var new_cards: Array = []
		for c in cards:
			if reached.has(c) and not held.has(cards[c]) and not new_cards.has(cards[c]):
				new_cards.append(cards[c])
		if new_cards.is_empty() and reached.size() == before:
			break
		held += new_cards
	for c in cards:                                    # a card found only once its own lock was open
		if not ProgrammeCheck._flood(rows, legend, start, held.filter(func(k: String) -> bool: return k != cards[c])).has(c):
			behind[cards[c]] = true
	var missed: Array = []
	for r in level.get("rooms", []):
		var rc: Array = r.get("rect", [])
		if rc.size() == 4 and not ProgrammeCheck._any_reached(reached, rc):
			missed.append(str(r.get("name", "")))
	return {"ok": start.x >= 0 and missed.is_empty() and behind.is_empty(), "reached": reached, "cards": held,
		"missed": missed, "behind": behind}


static func _any_reached(reached: Dictionary, rc: Array) -> bool:
	for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
		for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
			if reached.has(Vector2i(x, y)):
				return true
	return false


## Every cell reachable from the start with these cards: floor, open doors, and locked doors of a colour held.
static func _flood(rows: Array, legend: Dictionary, start: Vector2i, held: Array) -> Dictionary:
	var seen := {start: true}
	var todo: Array = [start]
	while not todo.is_empty():
		var c: Vector2i = todo.pop_back()
		for d in DIRS:
			var n: Vector2i = c + d
			if seen.has(n) or n.y < 0 or n.y >= rows.size() or n.x < 0 or n.x >= str(rows[n.y]).length():
				continue
			var e: Dictionary = legend.get(str(rows[n.y])[n.x], {})
			if e.get("solid", false) or (e.has("lock") and not held.has(str(e["lock"]))):
				continue
			seen[n] = true
			todo.append(n)
	return seen
