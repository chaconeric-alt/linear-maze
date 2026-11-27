extends RefCounted
## What An Installation's test asks of the written installations laid on the rooms generator's geometry (SPEC 6.4; its
## own test file, installation_test.gd, says them): is each world right, by its clusters, its fit, its core's lock, its
## people and its words; what stands in its rooms by their tiers; how faithfully a layout form is kept and whether it
## has its shape; and the mission graph: its gate held without both its ways (its own and the way round), passed by
## either alone, with a short way back from its release, and its locked wing shut without its card; the core's two
## keys in two clusters; a danger zone a detour off the way.


## What share of the ways the form meant ("form_ways") join their two rooms directly in the level.
static func faithful(lv: Dictionary, joins: Dictionary) -> float:
	var ways: Array = lv["installation"].get("form_ways", [])
	var ok := 0
	for e in ways:
		ok += 1 if joins.get(int(e[0]), {}).has(int(e[1])) else 0
	return float(ok) / maxf(1.0, ways.size())


## Whether the level has its form's shape, and what it came to in words: [bool, text].
static func shape_of(form: String, lv: Dictionary, joins: Dictionary) -> Array:
	var hall := int(lv["installation"]["form_ways"][0][1])           # the first way: from the way in to the form's first place
	var loops := ProgrammeGraph.loops({"map": lv["map"], "legend": lv.get("legend", {})})     # on the main floor alone
	match form:
		"hub", "stack", "campus":
			return [joins.get(hall, {}).size() >= 4, "%d ways out of the hall" % joins.get(hall, {}).size()]
		"ring", "concentric", "twin":
			return [loops >= 1, "loops %d" % loops]
		"tree":                                   # its own: with the gate's way round, which every form has, walled off
			var own := ProgrammeGraph.loops({"map": sealed(lv["map"], lv["installation"].get("gate", {}).get("round", [])), "legend": lv.get("legend", {})})
			return [own <= 1, "loops %d (%d with the way round)" % [own, loops]]
	var spine: Array = [int(lv["installation"]["form_ways"][0][0])]       # the way in, the spine's rooms in order, the core
	for i in lv["rooms"].size():
		if lv["rooms"][i].has("role") and str(lv["rooms"][i].get("cluster", "?")) == "" and i != spine[0] and i != core_room(lv):
			spine.append(i)
	spine.append(core_room(lv))
	var joined := 0
	for k in spine.size() - 1:
		joined += 1 if joins.get(spine[k], {}).has(spine[k + 1]) else 0
	return [joined == spine.size() - 1, "%d of %d steps of the spine joined" % [joined, spine.size() - 1]]


## The map's rows with the cell `at` ([x, y], if any) walled off.
static func sealed(rows: Array, at: Array) -> Array:
	if at.size() < 2:
		return rows
	var out: Array = rows.duplicate()
	var row := str(out[int(at[1])])
	out[int(at[1])] = row.substr(0, int(at[0])) + "#" + row.substr(int(at[0]) + 1)
	return out


## The level's rooms (storey 0) and which join which directly: by a corridor that enters no other room, or by an
## opening between the two halves of a suite. Room index -> {room index: true}.
static func joins_of(lv: Dictionary) -> Dictionary:
	var rows: Array = lv["map"]
	var room_at := {}
	for i in lv["rooms"].size():
		var rc: Array = lv["rooms"][i]["rect"]
		for y in range(int(rc[1]), int(rc[1]) + int(rc[3])):
			for x in range(int(rc[0]), int(rc[0]) + int(rc[2])):
				if str(rows[y])[x] != "#":
					room_at[Vector2i(x, y)] = i
	var out := {}
	for c in room_at:
		var i: int = room_at[c]
		if not out.has(i):
			out[i] = {}
		for d in GenContext.DIRS:
			var n: Vector2i = c + d
			if room_at.has(n) and room_at[n] != i:
				out[i][room_at[n]] = true
			elif not room_at.has(n) and str(rows[n.y])[n.x] != "#":
				for j in corridor_ends(rows, room_at, n):
					if j != i:
						out[i][j] = true
	return out


## The rooms a corridor reaches from the cell `from`, going through no room.
static func corridor_ends(rows: Array, room_at: Dictionary, from: Vector2i) -> Array:
	var seen := {from: true}
	var todo: Array = [from]
	var ends := {}
	while not todo.is_empty():
		var c: Vector2i = todo.pop_back()
		for d in GenContext.DIRS:
			var n: Vector2i = c + d
			if seen.has(n) or n.y < 0 or n.y >= rows.size() or n.x < 0 or n.x >= str(rows[n.y]).length() or str(rows[n.y])[n.x] == "#":
				continue
			seen[n] = true
			if room_at.has(n):
				ends[room_at[n]] = true
			else:
				todo.append(n)
	return ends.keys()


static func core_room(lv: Dictionary) -> int:
	for i in lv["rooms"].size():
		if str(lv["rooms"][i].get("role", "")) == "core":
			return i
	return 0


static func mean(xs: Array) -> float:
	var t := 0.0
	for x in xs:
		t += float(x)
	return t / maxf(1.0, xs.size())


## What stands in each written room of the level by its type's tiers ("contents"), and how many props to a cell of
## floor each density leaves: added to `tally`.
static func contents_seen(lv: Dictionary, arch: Dictionary, tally: Dictionary) -> void:
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
static func wrong_on_rooms(arch: Dictionary, w: Dictionary, lv: Dictionary) -> String:
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
	var swap := swap_better(arch, lv, by_id)
	if swap != "":
		return swap
	var z: Dictionary = lv.get("legend", {}).get("Z", {})
	var off: bool = str(w["systems"].get("power", {}).get("start", "")) == "off"
	var keys: Array = [str(z.get("flag", ""))] if z.has("flag") else ["card:" + str(z.get("lock", "")), "key_" + str(z.get("lock", ""))]
	var core: String = by_id[prog["rooms"][-1]["id"]]["name"]
	var keyed: bool = z.get("flag") is Dictionary          # (power on, and the interlock: two keys, interlock() below)
	if keyed:
		keys = [str(z["flag"].get("all", [""])[0])]
	if off != (z.has("flag") and not keyed) or (keyed and off) or not ProgrammeCheck.solve(lv, {"withhold": keys})["missed"].has(core):
		return "the core is shut wrong (power %s, %s)" % ["off" if off else "on", z]
	var allowed: Array = arch.get("occupants", {}).get("actors", []).map(func(e: Array) -> String: return str(e[0]))
	for t in lv.get("things", []):
		if t.has("actor") and not allowed.has(str(t["actor"])) and not in_zone(lv, t):
			return "a %s lives there" % t["actor"]
	var hashes := hashed(lv)
	return "words not written out: %s" % hashes[0] if not hashes.is_empty() else ""


## Does thing t stand in the level's danger zone (whose monsters are its set's, not the setting's)?
static func in_zone(lv: Dictionary, t: Dictionary) -> bool:
	var at: Array = t.get("at", [])
	if at.size() < 2 or int(t.get("level", 0)) != 0:
		return false
	for z in lv.get("zones", []):
		for rc in z.get("rects", []):
			if Rect2i(int(rc[0]), int(rc[1]), int(rc[2]), int(rc[3])).has_point(Vector2i(int(at[0]), int(at[1]))):
				return true
	return false


## Two rooms of one cluster that would fit better each in the other's room, as "a and b", or "".
static func swap_better(arch: Dictionary, lv: Dictionary, by_id: Dictionary) -> String:
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


## Every string in the level that still has a "#" in it (a word not written out).
static func hashed(v: Variant) -> Array:
	if v is String:
		return [v] if (v as String).contains("#") else []
	var out: Array = []
	if v is Array:
		for x in v:
			out += hashed(x)
	elif v is Dictionary:
		for k in v:
			if k != "map" and k != "rows":
				out += hashed(v[k])
	return out


## One world's gate on the rooms geometry (SPEC 6.4, InstallationGate), proved on its level: its release is there,
## and a loop; with its own way withheld and the way round sealed (its cell) the gate's room is not reached; with
## either alone everything is; from the release the way back through the open gate is shorter than round. Its locked
## wing, if it has one: none of its rooms reached without the wing's card. Adds to `out`: "bad" (what was wrong),
## "by" (the gate's ways seen), "loops", "saved" (the fewest seen), "wings" (worlds with a locked wing).
static func gate(lv: Dictionary, s: int, out: Dictionary) -> void:
	var g: Dictionary = lv.get("installation", {}).get("gate", {})
	var rel: Array = lv.get("things", []).filter(func(t: Dictionary) -> bool: return t.get("tag", "") == "gate_release")
	if g.is_empty() or g.get("round", []).size() != 2 or rel.size() != 1:
		out["bad"].append("seed %d: no gate, way round or release" % s)
		return
	var seal := [[int(g["round"][0]), int(g["round"][1]), 1, 1]]
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
	var loops := ProgrammeGraph.loops(lv)
	var why := ""
	if loops < 1:
		why = "no loop"
	elif neither["ok"] or not neither["missed"].has(g["name"]):
		why = "the gate does not hold (missed: %s)" % ", ".join(neither["missed"])
	elif not by_own["ok"] or not round["ok"]:
		why = "not passed both ways (by %s: %s; round: %s)" % [g["by"], by_own["missed"], round["missed"]]
	elif back < 0 or back_round < 0 or back >= back_round:
		why = "no short way back (%d steps, %d round)" % [back, back_round]
	else:
		why = wing(lv)
	if why != "":
		out["bad"].append("seed %d: %s" % [s, why])
		return
	out["by"][g["by"]] = int(out["by"].get(g["by"], 0)) + 1
	out["loops"] = mini(out["loops"], loops)
	out["saved"] = mini(out["saved"], back_round - back)
	out["wings"] += 1 if lv["installation"].has("wing") else 0


## What is wrong with a world's locked wing, or "": none of its rooms is reached without its card (and the level, as
## proved already, is finished with it).
static func wing(lv: Dictionary) -> String:
	var wg: Dictionary = lv["installation"].get("wing", {})
	if wg.is_empty():
		return ""
	var c := str(wg.get("color", "yellow"))
	var missed: Array = ProgrammeCheck.solve(lv, {"withhold": ["card:" + c, "key_" + c]})["missed"]
	var inside: Array = lv["rooms"].filter(func(r: Dictionary) -> bool: return str(r.get("cluster", "")) == str(wg["wing"]))
	if inside.is_empty() or not inside.all(func(r: Dictionary) -> bool: return missed.has(r["name"])):
		return "the %s wing opens without its %s card" % [wg["wing"], c]
	return ""


## What is wrong with a world's interlock, or "" (none, or right): the core's doors wait on two keys, each turned at a
## keyholder of its own in a room of a cluster of its own, and with either key withheld the core is not reached.
static func interlock(lv: Dictionary) -> String:
	var f: Variant = lv.get("legend", {}).get("Z", {}).get("flag")
	if not f is Dictionary:
		return ""
	var flags: Array = f.get("all", [])
	var at := {}                                    # the flag a keyholder sets -> the cluster of the room it is in
	for t in lv.get("things", []):
		if str(t.get("tag", "")) == "keyholder":
			at[str(t["use"]["effects"][0]["name"])] = cluster_at(lv, Vector2i(int(t["at"][0]), int(t["at"][1])))
	var core := ""
	for r in lv["rooms"]:
		core = str(r["name"]) if str(r.get("role", "")) == "core" else core
	if flags.size() != 2 or at.size() != 2 or not flags.all(func(k: Variant) -> bool: return at.has(str(k))):
		return "the core's two keys are not both there (%s; keyholders %s)" % [flags, at]
	if at.values()[0] == at.values()[1] or at.values().has(""):
		return "the core's two keys are not in two clusters (%s)" % at
	for k in flags:
		if not ProgrammeCheck.solve(lv, {"withhold": [str(k)]})["missed"].has(core):
			return "the core opens without %s" % k
	return ""


## What is wrong with a world's danger zone, or "" (none, or right): a tempting detour, in a quiet room, the rest of
## the level finished without it.
static func detour(lv: Dictionary) -> String:
	if lv.get("zones", []).is_empty():
		return ""
	var zr: Array = lv["zones"][0].get("rects", [])
	var inside: Array = lv["rooms"].filter(func(r: Dictionary) -> bool:
		return r.get("rect", []).size() == 4 and zr.any(func(z: Array) -> bool:
			return Rect2i(int(z[0]), int(z[1]), int(z[2]), int(z[3])).intersects(Rect2i(int(r["rect"][0]), int(r["rect"][1]), int(r["rect"][2]), int(r["rect"][3])))))
	if inside.is_empty() or inside.any(func(r: Dictionary) -> bool: return r.has("role")):
		return "the danger zone is not in a quiet room (%s)" % inside.map(func(r: Dictionary) -> String: return str(r.get("name", "?")))
	var missed: Array = ProgrammeCheck.solve(lv, {"withhold": ["zone_open"]})["missed"]
	if missed.any(func(nm: String) -> bool: return not inside.any(func(r: Dictionary) -> bool: return r["name"] == nm)):
		return "the level needs the danger zone (without it, missed %s)" % ", ".join(missed)
	return ""


## The cluster of the level's room at cell c ("" on the spine or in none).
static func cluster_at(lv: Dictionary, c: Vector2i) -> String:
	for r in lv["rooms"]:
		var rc: Array = r.get("rect", [])
		if rc.size() == 4 and Rect2i(int(rc[0]), int(rc[1]), int(rc[2]), int(rc[3])).has_point(c):
			return str(r.get("cluster", ""))
	return ""
