extends SelfTestPart
## The Collections Office's own test (it runs instead of the standard parts): danger zones (SPEC.md 4.13).
## The rules, on the level as laid out: the vault wing's door is shut on its flag; outside it the notice (whose option
## breaks the seal), the warning, the red light and the dead scavenger; the zone covers the wing past its door; its
## rooms hold the set's monsters, traps and loot, the deepest the keeper, the prize and the alarm; the proof finishes
## the level with the vault and, without the notice, misses only the vault. Twenty worlds each have their zone and can
## each be finished. The rooms generator's zones, over twelve seeds with the chance at one: each in a room that holds
## nothing the level needs, its every way in sealed, the rest of the level reached without it, its keeper and alarm in
## it. Then it is played: the trap hall's six traps (and the rotten floor, which drops the player and lets them climb
## out); the seal broken and the door opening; going in seals it; the alarm calls one more in while the player stays
## and none once they leave; the keeper killed opens the door for good, stops the alarm and calms the map; then the
## standard parts that walk, fight, take, open and finish.

const PARTS := ["movement", "reach", "traps", "actors", "pickups", "doors", "finish"]
const ZID := "vault"


func replaces_standard() -> bool:
	return true


func run() -> void:
	var written: Dictionary = LM.levels.get("collections", {})
	var seed_value := int(level.data.get("seed", -1))
	var again := ProgrammeGen.make(written, seed_value)
	say(again.get("map") == level.data.get("map") and again.get("things") == level.data.get("things") and again.get("zones") == level.data.get("zones"),
		"laid out from the world's seed (%d): the same seed lays out the same zone" % seed_value)
	_threshold()
	_inside()
	_proof()
	_worlds(written)
	_rooms_generator()
	pl.max_hp = 100000.0                          # a vault's worth of collectors, one after another: the test player lasts
	pl.hp = pl.max_hp
	await _rotten_floor()
	await _play_zone()
	for p in PARTS:
		await runner.part(p).run()


# ------------------------------------------------------------------ the rules, on the level as laid out
func _zone() -> Dictionary:
	return level.zones().zone(ZID)


func _zone_cells() -> Array:
	var out: Array = []
	for r in _zone().get("rects", []):
		for y in range(int(r[1]), int(r[1]) + int(r[3])):
			for x in range(int(r[0]), int(r[0]) + int(r[2])):
				out.append(Vector2i(x, y))
	return out


func _in_zone(t: Dictionary) -> bool:
	return t.has("at") and level.zone_at_cell(Vector2i(int(t["at"][0]), int(t["at"][1])), int(t.get("level", 0))) == ZID


func _threshold() -> void:
	var doors: Array = level.things_by_tag.get(ZID + "_door", [])
	var shut_on_flag := not doors.is_empty() and doors.all(func(d: Node) -> bool: return d is Door and d.flag == ZID + "_open" and d.is_locked())
	var notice := thing(ZID + "_notice")
	var opts: Array = notice.e.get("use", {}).get("options", []) if notice is Prop else []
	var breaks := opts.any(func(o: Dictionary) -> bool: return o.get("effects", []).any(func(ef: Dictionary) -> bool: return ef.get("type") == "flag" and ef.get("name") == ZID + "_open"))
	var d0: Door = doors[0] if not doors.is_empty() else null
	var by := func(t: Dictionary) -> bool: return t.has("at") and d0 != null and Vector2(int(t["at"][0]), int(t["at"][1])).distance_to(Vector2(d0.cell_pos)) <= 1.5
	var things: Array = level.data["things"]
	var sign := things.any(func(t: Dictionary) -> bool: return t.get("sign", "") == "REPOSSESSED PROPERTY" and by.call(t))
	var light := things.any(func(t: Dictionary) -> bool: return t.has("light") and by.call(t))
	var body := things.any(func(t: Dictionary) -> bool: return t.get("prop", "") == "dead_scavenger" and by.call(t) and t.has("use"))
	var outside := d0 != null and level.zone_at_cell(d0.cell_pos, 0) == "" and _zone_cells().size() > 30
	say(shut_on_flag and breaks and sign and light and body and outside,
		"the vault's door is shut on its flag (%d door); outside it the notice that breaks the seal, the warning, a red light and a dead scavenger with a note; the zone (%d cells) starts past the door"
		% [doors.size(), _zone_cells().size()])


func _inside() -> void:
	var ds: Dictionary = LM.defs["danger"]["collections"]
	var set_ids: Array = ds["monsters"].map(func(m: Array) -> String: return m[0])
	var trap_ids: Array = ds["traps"].map(func(m: Array) -> String: return m[0])
	var things: Array = level.data["things"].filter(_in_zone)
	var monsters := things.filter(func(t: Dictionary) -> bool: return set_ids.has(t.get("actor", "")))
	var traps := things.filter(func(t: Dictionary) -> bool: return trap_ids.has(t.get("trap", "")))
	var keeper := things.filter(func(t: Dictionary) -> bool: return t.get("tag", "") == ZID + "_keeper" and t.get("actor") == ds["keeper"]["actor"])
	var makers := things.filter(func(t: Dictionary) -> bool: return t.has("maker") and t.get("zone") == ZID and t.get("when") == ZID + "_open" and t.get("off") == ZID + "_clear")
	var prize := things.any(func(t: Dictionary) -> bool: return ds["prizes"].any(func(p: Array) -> bool: return p[0] == t.get("item", "")))
	var deep := not keeper.is_empty() and not makers.is_empty() and level.room_at(Vector2i(keeper[0]["at"][0], keeper[0]["at"][1])) == level.room_at(Vector2i(makers[0]["at"][0], makers[0]["at"][1]))
	var lit: Array = level.zones().light(ZID)
	say(monsters.size() >= 8 and traps.size() >= 6 and keeper.size() == 1 and makers.size() == 1 and prize and deep and lit[0] == 0.5,
		"inside: %d of the set's monsters, %d of its traps, the keeper and the alarm in the same room, a prize; lit at half" % [monsters.size(), traps.size()])
	var edge := HudMap.zone_sides(level, Vector2i(_zone()["rects"][0][0], _zone()["rects"][0][1]), 0)
	say(not edge.is_empty() and level.zones().color(ZID) != LevelZones.CALM, "the map outlines the zone in red (a corner cell has %d sides on its edge)" % edge.size())


## The proof walks in (the notice's option is anyone's), and without the notice it finishes everything but the vault.
func _proof() -> void:
	var proof := ProgrammeCheck.solve(level.data)
	var bare: Dictionary = level.data.duplicate(true)
	bare["things"] = bare["things"].filter(func(t: Dictionary) -> bool: return t.get("tag", "") != ZID + "_notice")
	var without := ProgrammeCheck.solve(bare)
	var vault_rooms := ["Seized Goods", "Counting Room", "Strongroom", "Repossessed Property"]
	var only_vault: bool = not without["missed"].is_empty() and without["missed"].all(func(m: String) -> bool: return vault_rooms.has(m))
	say(proof["ok"] and only_vault, "the proof finishes the level, vault and all; without the notice it misses only the vault (%s)" % ", ".join(without["missed"]))


func _worlds(written: Dictionary) -> void:
	var ok := 0
	for k in 20:
		var lv := ProgrammeGen.make(written, 1000 + k * 37)
		if lv.is_empty() or lv.get("zones", []).size() != 1:
			continue
		var keepers: int = lv["things"].filter(func(t: Dictionary) -> bool: return t.get("tag", "") == ZID + "_keeper").size()
		if keepers == 1 and ProgrammeCheck.solve(lv)["ok"]:
			ok += 1
	say(ok == 20, "twenty worlds: each laid out with its vault, its keeper, and finished (%d)" % ok)


## The rooms generator's zones, with the chance at one.
func _rooms_generator() -> void:
	var gen = LM.generators.get("rooms")
	var params: Dictionary = LM.game.get("generator_params", {}).duplicate(true)
	params["danger"] = {"chance": 1.0, "sets": ["collections", "overgrowth"]}
	var zoned := 0
	var good := 0
	for s in 12:
		var lv: Dictionary = gen.generate(400 + s * 13, params)
		if lv.get("zones", []).is_empty():
			continue
		zoned += 1
		if _gen_zone_ok(lv):
			good += 1
	say(zoned >= 6 and good == zoned, "the rooms generator: %d of 12 levels with a zone, each in a room the level does not need, sealed, with its keeper and alarm, the rest reached without it (%d)" % [zoned, good])


func _gen_zone_ok(lv: Dictionary) -> bool:
	var z: Dictionary = lv["zones"][0]
	var cells := {}
	for r in z["rects"]:
		for y in range(int(r[1]), int(r[1]) + int(r[3])):
			for x in range(int(r[0]), int(r[0]) + int(r[2])):
				cells[Vector2i(x, y)] = true
	var start := Vector2i(-1, -1)
	var needs := 0
	var keeper := false
	var maker := false
	for t in lv["things"]:
		if not t.has("at"):
			continue
		var c := Vector2i(int(t["at"][0]), int(t["at"][1]))
		if t.has("start"):
			start = c
		var needed: bool = t.has("start") or t.get("item", "") in ["keycard", "scattergun", "plasma"] or (t.get("use", {}) is Dictionary and str(t.get("use", {}).get("effects", "")).contains("\"end\""))
		if needed and cells.has(c):
			needs += 1
		keeper = keeper or (cells.has(c) and t.get("tag", "") == "zone_keeper")
		maker = maker or (cells.has(c) and t.has("maker"))
	var rows: Array = lv["map"]
	var seen := {start: true}
	var queue: Array = [start]
	var sealed := 0
	while not queue.is_empty():
		var c: Vector2i = queue.pop_back()
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var n: Vector2i = c + d
			var ch := str(rows[n.y])[n.x]
			if seen.has(n) or ch == "#" or cells.has(n):
				continue
			if ch == "0":
				sealed += 1
				continue
			seen[n] = true
			queue.append(n)
	var rest := 0
	for y in rows.size():
		for x in str(rows[y]).length():
			var p := Vector2i(x, y)
			if str(rows[y])[x] != "#" and str(rows[y])[x] != "0" and not cells.has(p) and not seen.has(p):
				rest += 1
	return needs == 0 and keeper and maker and sealed >= 1 and rest == 0 and lv["legend"].get("0", {}).get("flag") == "zone_open"


# ------------------------------------------------------------------ played
## The rotten floor: stood on, it holds for a moment and gives way; the player falls in, is hurt, and climbs out.
func _rotten_floor() -> void:
	var cl: Node = thing("t_collapse")
	if not cl is Collapse:
		say(false, "the trap hall has its rotten floor")
		return
	var hp := pl.hp
	pl.global_position = cl.global_position + Vector3(0, 0.05, 0)
	var n := 0
	while not cl.is_open() and n < 120:
		await frames(5)
		n += 5
	var opened_after := n
	await frames(90)
	var out := level.cell_of(pl.global_position) != level.cell_of(cl.global_position) and absf(pl.global_position.y - cl.global_position.y) < 1.0
	say(cl.is_open() and opened_after >= 30 and pl.hp < hp and out and level.is_blocked(cl.cell_pos),
		"the rotten floor holds a moment (%d frames), gives way under the player, who falls in, is hurt (%.0f) and climbs out; monsters keep off the hole"
		% [opened_after, hp - pl.hp])


func _play_zone() -> void:
	var d0: Door = level.things_by_tag[ZID + "_door"][0]
	var notice := thing(ZID + "_notice")
	var mk: Maker = level.get_children().filter(func(n: Node) -> bool: return n is Maker)[0]
	var broke := await pick(notice, "Break the seal")
	await frames(40)
	var opened := Game.has_flag(ZID + "_open") and not d0.is_locked()
	var inside: Vector2i = _zone_cells()[0]
	go(inside)
	await frames(10)
	var sealed := d0.sealed and level.zone_at(pl.global_position) == ZID
	var before := mk.count
	await frames(int(mk.e["every"] * 60) + 30)
	var called := mk.count == before + 1
	go(d0.cell_pos + _outward(d0))
	await frames(int(mk.e["every"] * 60) + 30)
	var quiet := mk.count == before + 1
	say(broke and opened and sealed and called and quiet,
		"the seal broken, the door opens; going in seals it behind; the alarm calls one more in after %.0f s inside, and none while the player is out"
		% mk.e["every"])
	var keepers: Array = level.things_by_tag.get(ZID + "_keeper", [])
	for k in keepers:
		if is_instance_valid(k) and not k.dead:
			k.hurt(1000000.0, {"type": "physical", "from": k.global_position})
	await frames(30)
	say(Game.has_flag(ZID + "_clear") and not d0.is_locked() and not mk.working() and level.zones().is_safe(ZID) and level.zones().color(ZID) == LevelZones.CALM,
		"the keeper killed: the door opens for good, the alarm stops, the zone is safe and the map draws it calm")


## The cell outside a door: the side of it not in the zone.
func _outward(d: Door) -> Vector2i:
	for dv in [Vector2i(0, 1), Vector2i(0, -1), Vector2i(1, 0), Vector2i(-1, 0)]:
		var c: Vector2i = d.cell_pos + dv
		if level.open_s(c.x, c.y, 0) and level.zone_at_cell(c, 0) == "":
			return dv
	return Vector2i(0, 1)
