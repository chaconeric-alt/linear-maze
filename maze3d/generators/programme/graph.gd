extends RefCounted
## ProgrammeGraph - what shape a level's ways through it have (SPEC.md 6.3), as the generation review measures
## exploration (25 Nov: "loop count, meaningful branch count, shortcuts"): how many loops it has, and how many steps a
## way takes with these keys and without that way. Like ProgrammeCheck, it works on any level dictionary.
## A loop is counted on the map's regions: the floor between doors, each corridor or room (a doorless junction joins
## them into one); each door joins the regions either side of it, as does a lift or a ramp between storeys. The loops
## are the doors and links more than a tree of those regions would need (edges − regions + pieces): a corridor with
## one room off it has none; a room with a door at each end onto the same corridor has one.
class_name ProgrammeGraph


## How many loops the level's ways make (see above).
static func loops(level: Dictionary) -> int:
	var w := ProgrammeCheck.world(level)
	var region := {}                                   # [cell, storey] -> its region's number
	var doors: Array = []
	var n := 0
	for f in w["maps"]:
		var rows: Array = w["maps"][f]
		for y in rows.size():
			for x in str(rows[y]).length():
				var p := [Vector2i(x, y), int(f)]
				var e: Dictionary = w["legend"].get(str(rows[y])[x], {})
				if e.get("solid", false) or region.has(p):
					continue
				if e.has("door"):
					doors.append(p)
				else:
					ProgrammeGraph._fill(w, p, n, region)
					n += 1
	var edges: Array = []
	for d in doors:
		var sides: Array = []                          # a door stands in a wall: floor on two sides (one region twice is a loop)
		for dv in ProgrammeCheck.DIRS:
			var q := [d[0] + dv, d[1]]
			if region.has(q):
				sides.append(region[q])
		if sides.size() == 2:
			edges.append(sides)
	for lk in w["links"]:
		if region.has(lk[0]) and region.has(lk[1]):
			edges.append([region[lk[0]], region[lk[1]]])
	return edges.size() - n + ProgrammeGraph._pieces(n, edges)


## The fewest steps from `from` to `to` ([cell, storey] each) with these keys (as ProgrammeCheck holds them), or -1
## if there is no way; `seal`: rects of storey 0 never walked.
static func steps(level: Dictionary, from: Array, to: Array, held: Array, seal: Array = []) -> int:
	var w := ProgrammeCheck.world(level, seal)
	return int(ProgrammeCheck.flood(w, from, held + w["starts"]).get(to, -1))


## Number every floor cell joined to p without crossing a door as region n.
static func _fill(w: Dictionary, p: Array, n: int, region: Dictionary) -> void:
	var rows: Array = w["maps"][p[1]]
	region[p] = n
	var todo: Array = [p]
	while not todo.is_empty():
		var c: Array = todo.pop_back()
		for dv in ProgrammeCheck.DIRS:
			var q: Vector2i = c[0] + dv
			if region.has([q, c[1]]) or q.y < 0 or q.y >= rows.size() or q.x < 0 or q.x >= str(rows[q.y]).length():
				continue
			var e: Dictionary = w["legend"].get(str(rows[q.y])[q.x], {})
			if e.get("solid", false) or e.has("door"):
				continue
			region[[q, c[1]]] = n
			todo.append([q, c[1]])


## How many separate pieces n regions make with these edges joining them.
static func _pieces(n: int, edges: Array) -> int:
	var up: Array = range(n)
	var count := n
	for e in edges:
		var a := ProgrammeGraph._root(up, int(e[0]))
		var b := ProgrammeGraph._root(up, int(e[1]))
		if a != b:
			up[a] = b
			count -= 1
	return count


static func _root(up: Array, i: int) -> int:
	while int(up[i]) != i:
		i = int(up[i])
	return i
