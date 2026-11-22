extends SelfTestPart
## The Warlord's Bunker, Levels 1 and 2: its own test (it runs instead of the standard parts). One level of two floors
## laid out from its programme (SPEC.md 6.3) as it is entered. First the rules the programme keeps, on the level as
## laid out: the same seed lays it out the same; what belongs together is together (each bunk room's latrine or
## showers through a door, the mess and its kitchen, the briefing room, the map room and the offices side by side,
## the infirmary's and Head Admin's rooms); the motor pool and the drill hall are sunk a storey, Head Admin rises two
## with a gallery and no way in from above; the bank lies where the programme puts it on both floors, three lifts that
## stop on both, held by the lockdown; without the stand-down nothing of Level 2 is reached, and the lifts are all
## that holds it; the three cards are each found their own way and each calls the lift to Level 3; the ways in are in
## their rooms; twenty worlds can all be finished. Then it is played: the standard parts, then the lockdown (a locked
## lift does not move; the order read, the code read in, it does), Level 2's three cards, and the lift down.

const PARTS := ["movement", "reach", "actors", "pickups", "doors"]
const L2_ROOMS := ["Head Admin", "Conditioning Theatre", "Specimen Hall", "Ward", "Morgue", "Archive"]

var up: Array = []
var down: Array = []


func replaces_standard() -> bool:
	return true


func run() -> void:
	var written: Dictionary = LM.levels.get("warlord_1", {})
	var seed_value := int(level.data.get("seed", -1))
	var again := ProgrammeGen.make(written, seed_value)
	up = level.data["map"]
	down = level.data["floors"][0]["map"]
	say(again.get("map") == up and again["floors"][0]["map"] == down and again.get("things") == level.data["things"],
		"laid out from the world's seed (%d): both floors and everything on them the same again from the same seed" % seed_value)
	_together()
	_storeys()
	_bank(written["programme"]["bank_at"])
	_lockdown()
	_cards()
	_ways_in()
	_worlds(written)
	pl.max_hp = 100000.0                          # the standard fights here are a garrison's, one after another, as on
	pl.hp = pl.max_hp                             # the Anomalous Structure: the test player is made to last them
	for p in PARTS:
		await runner.part(p).run()
	await _play_lockdown()
	await _play_cards()


# ------------------------------------------------------------------ the rules, on the level as laid out
func _together() -> void:
	var pairs := [["bunks_a1", "latrine_a"], ["bunks_a2", "showers_a"], ["bunks_b1", "latrine_b"], ["bunks_b2", "showers_b"],
		["mess_hall", "kitchen"], ["briefing", "map"]]
	var doors: bool = pairs.all(func(p: Array) -> bool: return _door_between(up, _rect(p[0], false), _rect(p[1], false)))
	var beside: bool = not _wall_between(_rect("map", false), _rect("office_1", false)).is_empty() \
		and not _wall_between(_rect("office_1", false), _rect("office_2", false)).is_empty()
	var red: bool = _doors_round(up, _rect("stores", false)).all(func(ch: String) -> bool: return ch == "R")
	say(doors and beside and red and _doors_round(up, _rect("stores", false)).size() > 0,
		"Level 1: each bunk room's latrine or showers through a door, the mess's kitchen, the briefing room's map room, the offices beside it, the store locked red (%d pairs)" % pairs.size())
	var lower := [["ward", "pharmacy"], ["chief", "archive"]]
	var l2: bool = lower.all(func(p: Array) -> bool: return _door_between(down, _rect(p[0], true), _rect(p[1], true)))
	say(l2 and not _wall_between(_rect("cell_1", true), _rect("cell_2", true)).is_empty(),
		"Level 2: the ward's pharmacy and the Chief Administrator's archive through a door, the induction cells side by side")


func _storeys() -> void:
	var sunk := true
	for id in ["motor", "drill"]:
		var r := _rect(id, true)
		sunk = sunk and _room(id, true).get("height", 1) == 2 and _all(up, r, "#") and _all(down, r, ".")
	var at := _rect("atrium", true)
	var decks: Array = level.data["floors"][0]["decks"].filter(func(dk: Dictionary) -> bool:
		return at.has_point(Vector2i(int(dk["at"][0]), int(dk["at"][1]))))
	var ramps: Array = level.data["floors"][0]["ramps"].filter(func(rp: Dictionary) -> bool:
		return at.has_point(Vector2i(int(rp["at"][0]), int(rp["at"][1]))))
	say(sunk and _room("atrium", true).get("height", 1) == 2 and _all(up, at.grow(1), "#") and decks.size() >= 3 and ramps.size() == 2,
		"the motor pool and the drill hall sunk a storey; Head Admin two storeys, rock and no door above, its gallery (%d cells) and ramp inside" % decks.size())


func _bank(at: Array) -> void:
	var a := _rect("lobby", false)
	var b := _rect("lobby", true)
	var lifts: Array = level.data["things"].filter(func(t: Dictionary) -> bool: return t.has("lift"))
	var held: bool = lifts.all(func(t: Dictionary) -> bool:
		return a.has_point(Vector2i(int(t["at"][0]), int(t["at"][1]))) and t["lift"] == [-1, 0] and int(t.get("home", -1)) == 0 \
			and t.get("lock", {}).get("flag", "") == "stand_down")
	say(a == b and a.position == Vector2i(int(at[0]), int(at[1])) and lifts.size() == 3 and held,
		"the bank lies at %s on both floors, as the programme puts it: three lifts that stop on both, waiting at the top, held by the lockdown" % str(at))


func _lockdown() -> void:
	var proof := ProgrammeCheck.solve(level.data)
	var order: Array = proof["flags"]
	say(proof["ok"] and order.find("stand_down_read") >= 0 and order.find("stand_down_read") < order.find("stand_down"),
		"the proof finishes both floors: the order read in the map room, then the code read in at communications, then down")
	var no_code: Dictionary = level.data.duplicate(true)
	no_code["things"] = no_code["things"].filter(func(t: Dictionary) -> bool: return t.get("tag", "") != "comms_console")
	var shut := ProgrammeCheck.solve(no_code)
	var unlocked: Dictionary = no_code.duplicate(true)
	for t in unlocked["things"]:
		t.erase("lock")
	say(not shut["ok"] and L2_ROOMS.all(func(n: String) -> bool: return shut["missed"].has(n)) and not shut["missed"].has("Drill Hall")
		and ProgrammeCheck.solve(unlocked)["ok"],
		"without the stand-down no room of Level 2 is reached (%d missed), and with the lifts unlocked all are: the lockdown holds it" % shut["missed"].size())


func _cards() -> void:
	var gv := ProgrammeCheck.givers(level.data)
	var yellow := _giver(gv, "card:yellow")
	var code := _giver(gv, "admin_code")
	var blue := _giver(gv, "card:blue")
	var green := _giver(gv, "card:green")
	var ways: bool = _in(yellow, "chief") and yellow.get("when") == "admin_code" and _in(code, "archive") \
		and _in(blue, "morgue") and _in(green, "interview") and green.get("when") == "loyal_2"
	var panel: Array = level.data["things"].filter(func(t: Dictionary) -> bool: return t.get("tag", "") == "lift_panel")
	var whens: Array = []
	if panel.size() == 1:
		for o in panel[0]["use"]["options"]:
			if str(o).contains("\"end\""):
				whens.append(o.get("when"))
	var proof := ProgrammeCheck.solve(level.data)
	say(ways and panel.size() == 1 and _in({"at": [Vector2i(int(panel[0]["at"][0]), int(panel[0]["at"][1])), int(panel[0].get("level", 0))]}, "lobby")
		and whens == ["key_yellow", "key_blue", "key_green"] and ["yellow", "blue", "green"].all(func(c: String) -> bool: return proof["cards"].has(c)),
		"Level 2's three cards: the Chief Administrator's from his safe (its code in the archive), the surgeon's in the morgue, the loyalty card from the interview room's test; each calls the lift at the lobby's panel")


func _ways_in() -> void:
	var starts := {}
	for t in level.data["things"]:
		if t.get("start") is String:
			starts[t["start"]] = {"at": [Vector2i(int(t["at"][0]), int(t["at"][1])), int(t.get("level", 0))]}
	say(_in(starts.get("ramp", {}), "motor") and _in(starts.get("vent", {}), "gym")
		and not level.arrival("ramp").is_empty() and not level.arrival("vent").is_empty(),
		"the ways in: the vehicle ramp on the motor pool's floor, the ventilation shaft in the gym")


func _worlds(written: Dictionary) -> void:
	var finished := 0
	var placed := 0
	var at: Array = written["programme"]["bank_at"]
	for s in 20:
		var lv := ProgrammeGen.make(written, 3000 + s * 61)
		if lv.is_empty():
			continue
		finished += 1 if ProgrammeCheck.solve(lv)["ok"] else 0
		for r in lv["rooms"]:
			if r.get("id", "") == "lobby" and int(r["rect"][0]) == int(at[0]) and int(r["rect"][1]) == int(at[1]):
				placed += 1
	say(finished == 20 and placed == 20, "twenty worlds: each laid out with its bank in the same place, each can be finished (%d, %d)" % [finished, placed])


# ------------------------------------------------------------------ played
## A locked lift does not move with the player on it; the order read and the code read in, it takes them down.
func _play_lockdown() -> void:
	var lf: Lift = level.lifts[0]
	var c := level.cell_of(lf.global_position)
	var off := _rect("lobby", false).get_center()             # the middle of the lobby: never a lift's cell
	go(off)
	await frames(5)
	go(c)
	await frames(120)
	var held := storey(pl.global_position) == 0 and storey(lf.global_position) == 0
	go(off)
	var read := await pick(thing("order_sheet"), "Remember the code")
	var sent := await pick(thing("comms_console"), "Read in")
	go(off)
	await frames(5)
	go(c)
	var n := 0
	while storey(pl.global_position) != -1 and n < 600:
		await frames(10)
		n += 10
	say(held and read and sent and Game.has_flag("stand_down") and storey(pl.global_position) == -1,
		"the lockdown: a locked lift stays put with the player on it; the order read and the code read in, it takes them down to Level 2 (%d frames)" % n)


## Each of Level 2's cards found its own way, and one of them calls the lift to Level 3. A dropped card can be taken
## only after half a second (a pickup's arming time), so the player waits before walking over it.
func _play_cards() -> void:
	var code := await pick(thing("records"), "Note the safe")
	var safe := await pick(thing("safe"), "Dial")
	var yellow := await _take_card("yellow")
	var surgeon := await pick(thing("surgeon"), "Take the lanyard")
	var blue := await _take_card("blue")
	var q1 := await pick(thing("loyalty"), "Q1")
	var q2 := await pick(thing("loyalty"), "Q2")
	var q3 := await pick(thing("loyalty"), "Q3")
	var green := await _take_card("green")
	say(code and safe and yellow and surgeon and blue and q1 and q2 and q3 and green,
		"Level 2's cards: the safe opened with the archive's code, the surgeon's lanyard, the loyalty test passed, each card taken")
	var day := State.day()
	var down := await pick(thing("lift_panel"), "Swipe the loyalty card")
	await frames(5)
	say(down and Game.over and State.day() == day + 1, "the loyalty card calls the lift to Level 3: the expedition ends there, alive, a day gone")


## Wait for a dropped card to arm, walk over it, and say whether its colour's key is held now (and was not before).
func _take_card(color: String) -> bool:
	var had := Game.has_flag("key_" + color)
	await frames(40)
	await take("keycard")
	return not had and Game.has_flag("key_" + color)


# ------------------------------------------------------------------ helpers
func _room(id: String, lower: bool) -> Dictionary:
	var rooms: Array = level.data["floors"][0]["rooms"] if lower else level.data["rooms"]
	for r in rooms:
		if r.get("id", "") == id:
			return r
	return {}


func _has(id: String, lower: bool) -> bool:
	return not _room(id, lower).is_empty()


func _rect(id: String, lower: bool) -> Rect2i:
	var rc: Array = _room(id, lower).get("rect", [0, 0, 0, 0])
	return Rect2i(int(rc[0]), int(rc[1]), int(rc[2]), int(rc[3]))


## Is the place in that room (on either floor, by the giver's storey).
func _in(g: Dictionary, id: String) -> bool:
	if g.is_empty():
		return false
	var r := _rect(id, int(g["at"][1]) == -1 or not _has(id, false))
	return r.has_point(g["at"][0])


func _giver(gv: Array, key: String) -> Dictionary:
	for g in gv:
		if g["gives"].has(key):
			return g
	return {}


## The wall cells between two rooms side by side (one cell of wall apart, overlapping along it), or none.
func _wall_between(a: Rect2i, b: Rect2i) -> Array:
	var out: Array = []
	for y in range(maxi(a.position.y, b.position.y), mini(a.end.y, b.end.y)):
		if a.end.x + 1 == b.position.x or b.end.x + 1 == a.position.x:
			out.append(Vector2i(mini(a.end.x, b.end.x), y))
	for x in range(maxi(a.position.x, b.position.x), mini(a.end.x, b.end.x)):
		if a.end.y + 1 == b.position.y or b.end.y + 1 == a.position.y:
			out.append(Vector2i(x, mini(a.end.y, b.end.y)))
	return out


func _door_between(rows: Array, a: Rect2i, b: Rect2i) -> bool:
	return _wall_between(a, b).any(func(c: Vector2i) -> bool: return not ["#", "."].has(str(rows[c.y])[c.x]))


## The doors in the walls round a room (not its corners): their map letters.
func _doors_round(rows: Array, r: Rect2i) -> Array:
	var out: Array = []
	var g := r.grow(1)
	for y in range(g.position.y, g.end.y):
		for x in range(g.position.x, g.end.x):
			var edge_x := x == g.position.x or x == g.end.x - 1
			var edge_y := y == g.position.y or y == g.end.y - 1
			if (edge_x != edge_y) and not ["#", "."].has(str(rows[y])[x]):
				out.append(str(rows[y])[x])
	return out


func _all(rows: Array, r: Rect2i, ch: String) -> bool:
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			if str(rows[y])[x] != ch:
				return false
	return true
