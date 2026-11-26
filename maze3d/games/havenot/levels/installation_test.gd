extends SelfTestPart
## An Installation's own test (it runs instead of the standard parts): levels written from a setting (SPEC 6.4).
## The level as entered was written and laid out from the world's seed: written again from the same seed it is the
## same, from another it is another. For each of the game's settings, over WORLDS seeds: each is written, laid out
## and can be finished; its spine is its setting's, in order; it has its power wing, with the generator's panel and
## security's; with power off at the start its core waits on the generator, and with power on it is locked by a card;
## every word is written out; whoever lives there is one of its setting's; its contradiction is one its setting
## lists. Over those seeds the choices come out more than one way, and some of them have a trap of their kind.
## Then it is played: the core's door, the generator, the core's terminal and the objective moving on; then the
## standard parts that walk, stand in its traps, fight, take, open and finish. (The traps part comes before the
## fights, as in the standard order: it stands in each working trap, then makes the player unkillable, so a hard draw
## of occupants cannot end the level halfway through the fights.)

const PARTS := ["movement", "reach", "traps", "actors", "containers", "pickups", "doors", "finish"]
const WORLDS := 8


func replaces_standard() -> bool:
	return true


func run() -> void:
	var written: Dictionary = LM.levels.get("installation", {})
	var seed_value := int(level.data.get("seed", -1))
	var a := ProgrammeGen.make(InstallationGen.write(written, seed_value), seed_value)
	var b := ProgrammeGen.make(InstallationGen.write(written, seed_value + 1), seed_value + 1)
	var info: Dictionary = level.data.get("installation", {})
	say(a.get("map") == level.data.get("map") and a.get("things") == level.data.get("things") and a.get("name") == level.data.get("name")
		and (b.get("map") != a.get("map") or b.get("name") != a.get("name")),
		"written from the world's seed (%d): %s (%s), built to %s and now %s; the same seed writes it the same, another another" % [
		seed_value, level.data.get("name", "?"), _kind(info), info.get("mandate", "?"), info.get("now", "?")])
	var tally := {"rooms": 0, "quiet": 0, "tall": 0, "three": 0, "decks": 0, "storeys": 0, "worlds": 0, "written": 0,
		"common": 0, "uncommon": 0, "rare": 0, "anomalous": 0, "density": {}}
	for id in InstallationSettings.ids():
		_worlds(id)
		_on_rooms(id, tally)
	var share := float(tally["quiet"]) / maxf(1.0, tally["rooms"])
	say(share >= 0.15 and share <= 0.45 and tally["three"] > 0 and tally["decks"] * 2 >= tally["worlds"] and tally["storeys"] * 2 >= tally["worlds"],
		"  on the rooms generator's geometry, over %d worlds: %d rooms, %d of them quiet (%d%%), %d two storeys tall or more and %d three; balconies in %d worlds and another storey in %d" % [
		tally["worlds"], tally["rooms"], tally["quiet"], roundi(share * 100), tally["tall"], tally["three"], tally["decks"], tally["storeys"]])
	var per := {}
	for den in tally["density"]:
		per[den] = float(tally["density"][den][0]) / maxf(1.0, tally["density"][den][1])
	say(tally["common"] > tally["uncommon"] and tally["uncommon"] > tally["anomalous"] and tally["anomalous"] * 10 <= tally["written"]
		and per.get("sparse", 0.0) < per.get("normal", 0.0) and per.get("normal", 0.0) < per.get("cluttered", 0.0)
		and per.get("cluttered", 0.0) < per.get("crowded", 0.0),
		"  what stands in the %d written rooms by their tiers: something common in %d, uncommon in %d, rare in %d, anomalous in %d; props to a cell of floor: %s" % [
		tally["written"], tally["common"], tally["uncommon"], tally["rare"], tally["anomalous"],
		", ".join(["sparse", "normal", "cluttered", "crowded"].map(func(d: String) -> String: return "%s %.2f" % [d, per.get(d, 0.0)]))])
	await _played(info)
	for p in PARTS:
		await runner.part(p).run()


## WORLDS seeds of one setting, written and laid out.
func _worlds(arch_id: String) -> void:
	var arch := InstallationSettings.resolve(arch_id)
	var bad: Array = []
	var contras := {}
	var wingsets := {}
	var powers := {}
	var trapped := 0
	var graph := {"bad": [], "by": {}, "loops": 99, "saved": 9999}       # the mission graph's checks, over the worlds
	for i in WORLDS:
		var s := 3000 + i * 37
		var w := InstallationGen.write({"id": "installation", "setting": arch_id, "kit": "omni"}, s)
		var lv := ProgrammeGen.make(w, s)
		var why := _wrong(arch, w, lv)
		if why != "":
			bad.append("seed %d: %s" % [s, why])
		contras[w["installation"]["contradiction"]] = true
		wingsets[",".join(w["programme"]["wings"].map(func(x: Dictionary) -> String: return x["id"]))] = true
		powers[w["systems"].get("power", {}).get("start", "")] = true
		trapped += 1 if lv.get("things", []).any(func(t: Dictionary) -> bool: return t.has("trap")) else 0
		if not lv.is_empty():
			_graph(lv, s, graph)
	say(bad.is_empty(), "%s: %d worlds, each written, laid out and finishable, its spine in order, its power wing and panels, its core shut the way its power says, every word written out, its people its own%s" % [
		arch_id, WORLDS, "" if bad.is_empty() else "; not: " + "; ".join(bad.slice(0, 3))])
	say(contras.size() >= 2 and wingsets.size() >= 2 and powers.size() == 2 and trapped > 0, "  its choices come out more than one way: %d contradictions (%s), %d sets of wings, power starting %s, a trap of its kind in %d of the %d" % [
		contras.size(), ", ".join(contras.keys()), wingsets.size(), " and ".join(powers.keys()), trapped, WORLDS])
	say(graph["bad"].is_empty() and graph["by"].size() == 2,
		"  its ways through: in every world a loop (%d at least), its gate held shut without both its ways, passed by its own way without the way round and by the way round without its own way (a card in %d, security shut down in %d); the way round, taken, makes the gate a short way back (%d steps saved at least)%s" % [
		graph["loops"], graph["by"].get("card", 0), graph["by"].get("security", 0), graph["saved"],
		"" if graph["bad"].is_empty() else "; not: " + "; ".join(graph["bad"].slice(0, 3))])


## WORLDS seeds of one setting laid on the rooms generator's geometry, as the title screen's button lays them
## (InstallationPlace, SPEC 6.4): each laid out and finishable; every cluster with the rooms it must have, and every
## spine room; within a cluster, no two rooms that would fit better swapped; its core shut the way its power says (and
## not reached without that key); its people its own; every word written out. Adds what it saw to `tally`.
func _on_rooms(arch_id: String, tally: Dictionary) -> void:
	var arch := InstallationSettings.resolve(arch_id)
	var bad: Array = []
	for i in WORLDS:
		var s := 5000 + i * 41
		var w := InstallationGen.write({"id": "written", "setting": arch_id, "style": "corridor", "legend": {}, "things": [],
			"objectives": [], "triggers": []}, s, true)
		var lv := InstallationPlace.make(w, s, LM.game.get("generator_params", {}))
		var why := _wrong_on_rooms(arch, w, lv)
		if why != "":
			bad.append("seed %d: %s" % [s, why])
			continue
		tally["worlds"] += 1
		tally["decks"] += 1 if not lv.get("decks", []).is_empty() else 0
		tally["storeys"] += 1 if not lv.get("floors", []).is_empty() else 0
		_contents_seen(lv, arch, tally)
		for r in lv["rooms"]:
			tally["rooms"] += 1
			tally["quiet"] += 0 if r.has("role") else 1
			tally["tall"] += 1 if int(r.get("height", 1)) >= 2 else 0
			tally["three"] += 1 if int(r.get("height", 1)) >= 3 else 0
	say(bad.is_empty(), "%s on the rooms generator's geometry: %d worlds, each laid out and finishable, every cluster with the rooms it must have, no two of a cluster's rooms that would fit better swapped, its core shut the way its power says, its people its own%s" % [
		arch_id, WORLDS, "" if bad.is_empty() else "; not: " + "; ".join(bad.slice(0, 3))])


## What stands in each written room of the level by its type's tiers ("contents"), and how many props to a cell of
## floor each density leaves: added to `tally`.
func _contents_seen(lv: Dictionary, arch: Dictionary, tally: Dictionary) -> void:
	var at := {}
	for t in lv.get("things", []):
		if t.has("at") and t.has("prop") and not t.has("level"):
			var c := Vector2i(int(t["at"][0]), int(t["at"][1]))
			at[c] = at.get(c, []) + [str(t["prop"])]
	for r in lv["rooms"]:
		if not r.has("role"):
			continue
		var role: Dictionary = arch.get("roles", {}).get(str(r["role"]), {})
		var rc: Array = r["rect"]
		var props: Array = []
		var cells := 0
		for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
			for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
				cells += 1 if str(lv["map"][y])[x] != "#" else 0
				props += at.get(Vector2i(x, y), [])
		tally["written"] += 1
		for tier in ["common", "uncommon", "rare", "anomalous"]:
			if role.get("contents", {}).get(tier, []).any(func(m: String) -> bool: return props.has(m)):
				tally[tier] += 1
		var den := str(role.get("density", "normal"))
		var was: Array = tally["density"].get(den, [0, 0])
		tally["density"][den] = [was[0] + props.size(), was[1] + cells]


## What is wrong with one installation on the rooms generator's geometry, or "" (see _on_rooms).
func _wrong_on_rooms(arch: Dictionary, w: Dictionary, lv: Dictionary) -> String:
	if lv.is_empty():
		return "not laid out"
	var proof := ProgrammeCheck.solve(lv)
	if not proof["ok"]:
		return "cannot be finished (missed %s)" % ", ".join(proof["missed"])
	var by_id := {}
	for r in lv["rooms"]:
		if r.has("id"):
			by_id[r["id"]] = r
	var prog: Dictionary = w["programme"]
	for r in prog["rooms"]:
		if not by_id.has(r["id"]):
			return "no %s on the spine" % r["id"]
	for wg in prog["wings"]:
		for r in wg["rooms"]:
			if not r.has("chance") and str(by_id.get(r["id"], {}).get("cluster", "")) != str(wg["id"]):
				return "cluster %s without its %s" % [wg["id"], r["id"]]
	var swap := _swap_better(arch, lv, by_id)
	if swap != "":
		return swap
	var z: Dictionary = lv.get("legend", {}).get("Z", {})
	var off: bool = str(w["systems"].get("power", {}).get("start", "")) == "off"
	var keys: Array = [str(z.get("flag", ""))] if z.has("flag") else ["card:" + str(z.get("lock", "")), "key_" + str(z.get("lock", ""))]
	var core: String = by_id[prog["rooms"][-1]["id"]]["name"]
	if off != z.has("flag") or not ProgrammeCheck.solve(lv, {"withhold": keys})["missed"].has(core):
		return "the core is shut wrong (power %s, %s)" % ["off" if off else "on", z]
	var allowed: Array = arch.get("occupants", {}).get("actors", []).map(func(e: Array) -> String: return str(e[0]))
	for t in lv.get("things", []):
		if t.has("actor") and not allowed.has(str(t["actor"])):
			return "a %s lives there" % t["actor"]
	var hashes := _hashed(lv)
	return "words not written out: %s" % hashes[0] if not hashes.is_empty() else ""


## Two rooms of one cluster that would fit better each in the other's room, as "a and b", or "".
func _swap_better(arch: Dictionary, lv: Dictionary, by_id: Dictionary) -> String:
	var fits: Dictionary = lv.get("installation", {}).get("fits", {})
	var roles: Dictionary = arch.get("roles", {})
	for a in by_id:
		for b in by_id:
			var ca := str(by_id[a].get("cluster", ""))
			if a >= b or ca == "" or ca != str(by_id[b].get("cluster", "")) or not fits.has(a) or not fits.has(b):
				continue
			var fa: Dictionary = roles.get(str(by_id[a]["role"]), {}).get("fit", {})
			var fb: Dictionary = roles.get(str(by_id[b]["role"]), {}).get("fit", {})
			var now := InstallationFit.score(fa, fits[a][0], fits[a][1]) + InstallationFit.score(fb, fits[b][0], fits[b][1])
			if InstallationFit.score(fa, fits[b][0], fits[b][1]) + InstallationFit.score(fb, fits[a][0], fits[a][1]) > now:
				return "%s and %s would fit better swapped" % [a, b]
	return ""


## One world's ways through (the mission graph, SPEC 6.3 and 6.4), proved on its level: it has a loop; its gate holds
## with both its ways withheld (its own: the card or security; and the way round, sealed), and opens by either alone;
## from the gate's release the way back through the open gate is shorter than round.
func _graph(lv: Dictionary, s: int, out: Dictionary) -> void:
	var g: Dictionary = lv.get("installation", {}).get("gate", {})
	var ring: Array = lv.get("rooms", []).filter(func(r: Dictionary) -> bool: return r.get("link", "") == g.get("link", "?"))
	var rel: Array = lv.get("things", []).filter(func(t: Dictionary) -> bool: return t.get("tag", "") == "gate_release")
	if g.is_empty() or ring.size() != 1 or rel.size() != 1:
		out["bad"].append("seed %d: no gate, way round or release" % s)
		return
	var loops := ProgrammeGraph.loops(lv)
	var seal: Array = [ring[0]["rect"]]
	var neither := ProgrammeCheck.solve(lv, {"withhold": g["withhold"], "seal": seal})
	var by_own := ProgrammeCheck.solve(lv, {"seal": seal})
	var round := ProgrammeCheck.solve(lv, {"withhold": g["withhold"]})
	var full := ProgrammeCheck.solve(lv)
	var held: Array = full["flags"] + full["systems"]
	for c in full["cards"]:
		held += ["card:" + c, "key_" + c]
	var shut: Array = held.filter(func(k: String) -> bool: return k != g["flag"] and not g["withhold"].has(k))
	var from := [Vector2i(int(rel[0]["at"][0]), int(rel[0]["at"][1])), 0]
	var back := ProgrammeGraph.steps(lv, from, ProgrammeCheck.start_of(lv), held)
	var back_round := ProgrammeGraph.steps(lv, from, ProgrammeCheck.start_of(lv), shut)
	var why := ""
	if loops < 1:
		why = "no loop"
	elif neither["ok"] or not neither["missed"].has(g["name"]):
		why = "the gate does not hold (missed: %s)" % ", ".join(neither["missed"])
	elif not (by_own["missed"] == [ring[0]["name"]] and by_own["behind"].is_empty()) or not round["ok"]:      # (sealed, the way round itself is missed)
		why = "not passed both ways (by %s: %s; round: %s)" % [g["by"], by_own["ok"], round["ok"]]
	elif back < 0 or back_round < 0 or back >= back_round:
		why = "no short way back (%d steps, %d round)" % [back, back_round]
	if why != "":
		out["bad"].append("seed %d: %s" % [s, why])
		return
	out["by"][g["by"]] = int(out["by"].get(g["by"], 0)) + 1
	out["loops"] = mini(out["loops"], loops)
	out["saved"] = mini(out["saved"], back_round - back)


## What is wrong with one written installation and its level, or "".
func _wrong(arch: Dictionary, w: Dictionary, lv: Dictionary) -> String:
	if lv.is_empty():
		return "not laid out"
	if not ProgrammeCheck.solve(lv).get("ok", false):
		return "cannot be finished"
	var prog: Dictionary = w["programme"]
	var steps: Array = arch.get("spine", [])
	if prog["rooms"].size() != steps.size():
		return "spine of %d, not %d" % [prog["rooms"].size(), steps.size()]
	for i in steps.size():
		var role: Variant = steps[i].get("role", "")
		if not (role.has(prog["rooms"][i]["role"]) if role is Array else role == prog["rooms"][i]["role"]):
			return "spine room %d is %s" % [i, prog["rooms"][i]["role"]]
	var tags := _tags(lv)
	if not (tags.has("gen_panel") and tags.has("sec_panel") and tags.has("core_terminal")):
		return "panels missing (%s)" % ", ".join(tags.keys())
	var core_lock: Array = prog["locks"].filter(func(l: Dictionary) -> bool: return l.get("room", "") == prog["rooms"][-1]["id"])
	var off: bool = str(w["systems"].get("power", {}).get("start", "")) == "off"
	if core_lock.is_empty() or (off and not core_lock[0].has("flag")) or (not off and not core_lock[0].has("color")):
		return "the core is shut wrong (power %s, lock %s)" % ["off" if off else "on", core_lock]
	var hashes := _hashed(lv)
	if not hashes.is_empty():
		return "words not written out: %s" % hashes[0]
	var allowed: Array = arch.get("occupants", {}).get("actors", []).map(func(e: Array) -> String: return str(e[0]))
	for t in lv.get("things", []):
		if t.has("actor") and not allowed.has(str(t["actor"])):
			return "a %s lives there" % t["actor"]
	if not arch.get("contradictions", []).has(w["installation"]["contradiction"]):
		return "contradiction %s" % w["installation"]["contradiction"]
	return ""


func _tags(lv: Dictionary) -> Dictionary:
	var out := {}
	for t in lv.get("things", []):
		if str(t.get("tag", "")) != "":
			out[t["tag"]] = true
	return out


## Every string in the level that still has a "#" in it (a word not written out).
func _hashed(v: Variant) -> Array:
	if v is String:
		return [v] if (v as String).contains("#") else []
	var out: Array = []
	if v is Array:
		for x in v:
			out += _hashed(x)
	elif v is Dictionary:
		for k in v:
			if k != "map" and k != "rows":
				out += _hashed(v[k])
	return out


## How many doors are shut on that flag now.
func _shut_on(flag: String) -> int:
	var n := 0
	for d in level.get_children():
		if d is Door and d.is_locked() and d.flag != null and (str(d.flag) == flag or (d.flag is Array and d.flag.has(flag))):
			n += 1
	return n


## Played: the gate's doors are shut until its release, on the far side, unlocks them; with power off, the core's door
## is shut and the generator's panel opens it; the core's terminal logs what the place is doing.
func _played(info: Dictionary) -> void:
	await _released(info.get("gate", {}))
	var core_t: Node3D = thing("core_terminal")
	var gen: Node3D = thing("gen_panel")
	if core_t == null or gen == null:
		say(false, "the installation has its generator panel and its core's terminal")
		return
	var flag := str(info.get("core_lock", "")).trim_prefix("flag ")
	var shut := _shut_on(flag)
	var started := await pick(gen, "Start the generator")
	await frames(10)
	var on: bool = level.systems.state.get("power", "") == "on" and Game.has_flag("power_on")
	var open := _shut_on(flag)
	var logged := await pick(core_t, "Log what it is doing")
	await frames(5)
	Game.hud.refresh()
	var moved_on: bool = Game.hud.objective_text().contains("Leave")      # the core reached, the way out is next
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)      # back at the start for the parts
	await frames(5)
	if str(info.get("core_lock", "")).begins_with("flag"):
		say(shut > 0 and started and on and open < shut and logged and Game.has_flag("core_reached") and moved_on,
			"played: the %s's doors are shut (%d) until the generator is started; then power is on, they open, its terminal logs what the place is doing, and the objective moves on to the way out" % [
			_kind(info), shut])
	else:
		say(started and on and logged and Game.has_flag("core_reached") and moved_on,
			"played: power on, the generator's panel answers, the core's terminal logs what the place is doing (its doors locked %s), and the objective moves on to the way out" % info.get("core_lock", "?"))


## The gate shut, then its release used from the far side: its doors open, and stay so.
func _released(g: Dictionary) -> void:
	var rel: Node3D = thing("gate_release")
	var shut := _shut_on(str(g.get("flag", "?")))
	if rel != null:
		pl.global_position = rel.global_position + rel.global_transform.basis.z * 1.6
		pl.global_position.y = level.floor_y(pl.global_position + Vector3(0, 0.5, 0)) + 0.05
		rel.use(pl)
		await frames(10)
	var open := _shut_on(str(g.get("flag", "?")))
	say(rel != null and shut > 0 and open == 0 and Game.has_flag(str(g.get("flag", "?"))),
		"played: the gate (%s) is shut (%d doors) until its release on the far side unlocks it; then it stands open (%d shut)" % [g.get("name", "?"), shut, open])


## What kind of place the setting is, in words ("Industrial Reclamation Plant").
func _kind(info: Dictionary) -> String:
	return InstallationSettings.name_of(str(info.get("archetype", "?")))
