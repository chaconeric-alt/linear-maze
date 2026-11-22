extends SelfTestPart
## The Blueprint's own test (it runs instead of the standard parts): the programme generator (SPEC.md 6.3). The level
## as entered was laid out from the world's seed; laid out again from the same seed it is the same, from another seed
## it is another layout of the same rooms. Every room is where the programme put it: each its written size (or within
## its range), none overlapping, the spine rooms in order along one row, each wing's rooms against its branch
## corridor, rooms "next_to" sharing a wall and "door_to" a door in it; the armoury's every door is locked red and its
## card is in the office or the quarters; the proof finds the level can be finished and, without the card, the armoury
## cannot be reached; over thirty worlds the seed's choices (where the officers' wing branches, the locker room or none,
## the card's room, the mess's guard, each wing's side) each come out both ways, and every one can be finished; a
## programme written wrong says what is wrong. Then it is played as any level: the standard parts that walk, fight,
## take, open and finish.

const PARTS := ["movement", "reach", "actors", "containers", "pickups", "doors", "finish"]


func replaces_standard() -> bool:
	return true


func run() -> void:
	var written: Dictionary = LM.levels.get("blueprint", {})
	var seed_value := int(level.data.get("seed", -1))
	var again := ProgrammeGen.make(written, seed_value)
	var other := ProgrammeGen.make(written, seed_value + 1)
	say(again.get("map") == level.data.get("map") and again.get("things") == level.data.get("things") and other.get("map", []) != again.get("map"),
		"laid out from the world's seed (%d): the same seed lays it out the same, another lays out the same rooms another way" % seed_value)
	var plan := ProgrammePlan.new(written["programme"], seed_value)
	var lay := ProgrammeLayout.new(plan)
	_rooms(written["programme"], plan, lay)
	_wings(plan, lay)
	_locks(lay)
	_worlds(written)
	_wrong(written)
	for p in PARTS:
		await runner.part(p).run()


func _rooms(prog: Dictionary, plan: ProgrammePlan, lay: ProgrammeLayout) -> void:
	var sized := true
	for id in plan.rooms:
		var r: Dictionary = plan.rooms[id]
		var rc: Rect2i = lay.rects.get(id, Rect2i())
		sized = sized and _within(rc.size.x, r["size"][0]) and _within(rc.size.y, r["size"][1])
	var apart := true
	var ids: Array = lay.rects.keys()
	for i in ids.size():
		for j in range(i + 1, ids.size()):
			apart = apart and not (lay.rects[ids[i]] as Rect2i).grow(1).intersects((lay.rects[ids[j]] as Rect2i).grow(0)) \
				or _one_wall(lay.rects[ids[i]], lay.rects[ids[j]])
	var x := -1
	var spine := true
	for id in plan.spine:
		var rc: Rect2i = lay.rects[id]
		spine = spine and rc.position.x > x and lay.y0 >= rc.position.y and lay.y0 < rc.end.y
		x = rc.end.x
	say(sized and apart and spine and ids.size() + plan.left_out.size() == _all(prog).size() and level.data["rooms"].size() == ids.size() + plan.wings.size(),
		"every one of the %d rooms (of %d written; the seed left out %s) is laid out at its written size, none overlapping, the spine's %d in order along its row"
		% [ids.size(), _all(prog).size(), ", ".join(plan.left_out) if not plan.left_out.is_empty() else "none", plan.spine.size()])


## Every room written, on the spine or in a wing.
func _all(prog: Dictionary) -> Array:
	var out: Array = prog["rooms"].duplicate()
	for w in prog["wings"]:
		out += w["rooms"]
	return out


func _within(n: int, v: Variant) -> bool:
	return n >= int(v[0]) and n <= int(v[1]) if v is Array else n == int(v)


## Two rooms with exactly one wall between them (and so floor facing floor across it).
func _one_wall(a: Rect2i, b: Rect2i) -> bool:
	var across_x := a.end.x + 1 == b.position.x or b.end.x + 1 == a.position.x
	var across_y := a.end.y + 1 == b.position.y or b.end.y + 1 == a.position.y
	var over_x := a.position.x < b.end.x and b.position.x < a.end.x
	var over_y := a.position.y < b.end.y and b.position.y < a.end.y
	return (across_x and over_y) or (across_y and over_x)


func _wings(plan: ProgrammePlan, lay: ProgrammeLayout) -> void:
	var against := true
	for w in plan.wings:
		var j: Vector2i = lay.junctions[w["id"]]
		for side in ["west", "east"]:
			for id in w[side]:
				var rc: Rect2i = lay.rects[id]
				against = against and (rc.end.x + 1 == j.x if side == "west" else rc.position.x - 2 == j.x)
	var next_to := _one_wall(lay.rects["quarters"], lay.rects["office"]) and _one_wall(lay.rects["latrine"], lay.rects["dorm"])
	var door := lay.doors.any(func(d: Dictionary) -> bool: return d["rooms"].has("latrine") and d["rooms"].has("dorm"))
	var no_door := not lay.doors.any(func(d: Dictionary) -> bool: return d["rooms"].has("quarters") and d["rooms"].has("office"))
	say(against and next_to and door and no_door,
		"each wing's rooms stand against its corridor; the latrine and the dormitory share a wall with a door in it, the quarters and the office one without")


func _locks(lay: ProgrammeLayout) -> void:
	var rows: Array = level.data["map"]
	var all_red: bool = lay.doors_of("armoury").all(func(d: Dictionary) -> bool:
		var at: Vector2i = d["at"]
		return str(rows[at.y])[at.x] == "R")
	var card: bool = level.data["things"].any(func(t: Dictionary) -> bool:
		var at := Vector2i(int(t["at"][0]), int(t["at"][1])) if t.has("at") else Vector2i(-1, -1)
		return t.get("item", "") == "keycard" and ((lay.rects["office"] as Rect2i).has_point(at) or (lay.rects["quarters"] as Rect2i).has_point(at)))
	var proof := ProgrammeCheck.solve(level.data)
	var bare: Dictionary = level.data.duplicate(true)
	bare["things"] = bare["things"].filter(func(t: Dictionary) -> bool: return t.get("item", "") != "keycard")
	var shut := ProgrammeCheck.solve(bare)
	say(all_red and card and proof["ok"] and proof["cards"] == ["red"] and not shut["ok"] and shut["missed"] == ["Armoury"],
		"the armoury's doors are locked red, its card is in the office or the quarters; the proof finishes the level with it, and without it misses the armoury")


## Thirty worlds: the seed's every choice comes out both ways, and every one can be finished.
func _worlds(written: Dictionary) -> void:
	var seen := {}
	var finished := 0
	for s in 30:
		var lv := ProgrammeGen.make(written, 1000 + s * 37)
		if lv.is_empty() or not ProgrammeCheck.solve(lv)["ok"]:
			continue
		finished += 1
		var plan := ProgrammePlan.new(written["programme"], int(lv["seed"]))
		var lay := ProgrammeLayout.new(plan)
		seen["after " + plan.wings[1]["after"]] = true
		seen["side " + plan.wings[0]["side"]] = true
		seen["lockers" if lay.rects.has("lockers") else "no lockers"] = true
		for t in lv["things"]:
			if t.get("item", "") == "keycard":
				seen["card in " + ("office" if (lay.rects["office"] as Rect2i).has_point(Vector2i(int(t["at"][0]), int(t["at"][1]))) else "quarters")] = true
			if t.has("actor") and (lay.rects["mess"] as Rect2i).has_point(Vector2i(int(t["at"][0]), int(t["at"][1]))):
				seen["mess " + str(t["actor"])] = true
	var both := ["after mess", "after lab", "side n", "side s", "lockers", "no lockers", "card in office", "card in quarters", "mess custodian", "mess roach"]
	say(finished == 30 and both.all(func(k: String) -> bool: return seen.has(k)),
		"over thirty worlds each choice comes out both ways (%s) and all %d can be finished" % [", ".join(both.filter(func(k: String) -> bool: return seen.has(k))), finished])


## A programme written wrong says what is wrong, and lays nothing out.
func _wrong(written: Dictionary) -> void:
	var bad: Dictionary = written.duplicate(true)
	bad["programme"]["wings"][0]["rooms"][1]["door_to"] = "office"
	bad["programme"]["locks"][0]["card"] = "nowhere"
	var a := ProgrammeGen.attempt(bad, 5)
	var none := {"id": "x", "programme": {"rooms": [{"id": "only"}]}}
	var b := ProgrammeGen.attempt(none, 5)
	say(a.get("fatal", false) and str(a["problems"]).contains("office") and b.get("fatal", false) and str(b["problems"]).contains("two rooms"),
		"a programme written wrong says so: %s; %s" % ["; ".join(a.get("problems", [])), "; ".join(b.get("problems", []))])
