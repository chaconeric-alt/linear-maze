extends SelfTestPart
## The two-floor Blueprint's own test (it runs instead of the standard parts): a programme of two floors (SPEC.md 6.3,
## ProgrammeFloors). Laid out from the world's seed, the same each time; the lower floor's lift lobby lies under the
## upper's, the same size in the same place, and the bank's lifts stop on both floors in the same cells; the motor pool
## is sunk a storey (rock upstairs, two storeys tall downstairs), each of its upper doors opening on to a gallery with a
## ramp from its floor; the atrium rises into rock upstairs; nothing stands on a ramp or in a lift's shaft; the proof walks both floors (by the lifts and the ramps) to
## every room, with the red card for the store; twenty worlds can all be finished. Then it is played: the standard
## parts that walk, fight, take, open and finish.

const PARTS := ["movement", "reach", "actors", "pickups", "doors", "finish"]


func replaces_standard() -> bool:
	return true


func run() -> void:
	var written: Dictionary = LM.levels.get("blueprint2", {})
	var seed_value := int(level.data.get("seed", -1))
	var again := ProgrammeGen.make(written, seed_value)
	say(again.get("map") == level.data.get("map") and again["floors"][0]["map"] == level.data["floors"][0]["map"] and again.get("things") == level.data.get("things"),
		"laid out from the world's seed (%d), both floors and everything on them the same again from the same seed" % seed_value)
	var up: Array = level.data["map"]
	var fd: Dictionary = level.data["floors"][0]
	var down: Array = fd["map"]
	_bank(up, fd)
	_motor_pool(up, down, fd)
	_atrium(up, fd)
	var proof := ProgrammeCheck.solve(level.data)
	var both: bool = proof["reached"].keys().any(func(p: Array) -> bool: return p[1] == -1)
	say(proof["ok"] and both and proof["cards"] == ["red"], "the proof walks both floors, by the lifts and the ramps, to every room, with the red card")
	var finished := 0
	var blocked := _blocked(level.data)
	for s in 20:
		var lv := ProgrammeGen.make(written, 2000 + s * 53)
		finished += 1 if not lv.is_empty() and ProgrammeCheck.solve(lv)["ok"] else 0
		blocked += _blocked(lv) if not lv.is_empty() else 0
	say(finished == 20, "twenty worlds, all laid out on two floors and all can be finished (%d)" % finished)
	say(blocked == 0, "in this world and the twenty, nothing stands on a ramp or in a lift's cell (%d things do)" % blocked)
	for p in PARTS:
		await runner.part(p).run()


func _room(rooms: Array, name: String) -> Dictionary:
	for r in rooms:
		if r.get("name", "") == name:
			return r
	return {}


func _bank(up: Array, fd: Dictionary) -> void:
	var a: Dictionary = _room(level.data["rooms"], "Lift Lobby")
	var b: Dictionary = _room(fd["rooms"], "Lower Lift Lobby")
	var lifts: Array = level.data["things"].filter(func(t: Dictionary) -> bool: return t.has("lift"))
	var inside := lifts.all(func(t: Dictionary) -> bool:
		var rc: Array = a["rect"]
		return t["lift"] == [-1, 0] and int(t["at"][0]) >= int(rc[0]) and int(t["at"][0]) < int(rc[0]) + int(rc[2]) \
			and int(t["at"][1]) >= int(rc[1]) and int(t["at"][1]) < int(rc[1]) + int(rc[3]))
	say(not a.is_empty() and a.get("rect") == b.get("rect") and lifts.size() == 2 and inside,
		"the lower lift lobby lies under the upper (%s), and the bank's two lifts stop on both floors" % str(a.get("rect")))


func _motor_pool(up: Array, down: Array, fd: Dictionary) -> void:
	var m: Dictionary = _room(fd["rooms"], "Motor Pool")
	var rc: Array = m.get("rect", [0, 0, 0, 0])
	var rock := true
	var floor := true
	for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
		for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
			rock = rock and str(up[y])[x] == "#"
			floor = floor and str(down[y])[x] == "."
	var decks := {}
	for dk in fd["decks"]:
		decks[Vector2i(int(dk["at"][0]), int(dk["at"][1]))] = true
	var doors := 0
	var onto := 0
	for y in range(int(rc[1]) - 1, int(rc[1]) + int(rc[3]) + 1):
		for x in range(int(rc[0]) - 1, int(rc[0]) + int(rc[2]) + 1):
			if str(up[y])[x] != "+":
				continue
			doors += 1
			for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				onto += 1 if decks.has(Vector2i(x, y) + d) else 0
	var ramps: Array = fd["ramps"].filter(func(rp: Dictionary) -> bool:
		return int(rp["at"][0]) >= int(rc[0]) and int(rp["at"][0]) < int(rc[0]) + int(rc[2]))
	say(int(m.get("height", 1)) == 2 and rock and floor and doors >= 1 and onto == doors and ramps.size() == doors * 2,
		"the motor pool is sunk a storey: rock upstairs, two storeys tall below; its %d upper door(s) open on to galleries, each with a ramp down" % doors)


func _atrium(up: Array, fd: Dictionary) -> void:
	var a: Dictionary = _room(fd["rooms"], "Atrium")
	var rc: Array = a.get("rect", [0, 0, 0, 0])
	var rock := true
	for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
		for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
			rock = rock and str(up[y])[x] == "#"
	say(int(a.get("height", 1)) == 2 and rock, "the atrium rises two storeys into rock upstairs")


## What the programme or its furnishing put on a ramp or in a lift's cell, on any floor: a crate on a ramp blocks the
## only way down, one in a lift's cell is crushed by it. None, in a level laid out right.
func _blocked(lv: Dictionary) -> int:
	var kept := {}
	for fd in lv.get("floors", []):
		for rp in fd.get("ramps", []):
			kept[Vector2i(int(rp["at"][0]), int(rp["at"][1]))] = true
	for t in lv["things"]:
		if t.has("lift"):
			kept[Vector2i(int(t["at"][0]), int(t["at"][1]))] = true
	return lv["things"].filter(func(t: Dictionary) -> bool:
		return not t.has("lift") and not t.has("start") and t.has("at") and kept.has(Vector2i(int(t["at"][0]), int(t["at"][1])))).size()
