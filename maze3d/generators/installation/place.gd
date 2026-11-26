extends RefCounted
## InstallationPlace - a written installation laid on the rooms generator's geometry (SPEC 6.4; the grandeur design's
## step 2, purpose over chaos): its rooms of every size and shape, two and three storeys tall, balconies and ramps,
## windows, pools, rooms upstairs and a basement, with the place's purpose fitted on to them afterwards, as HaveNot
## Vol. 2 builds an installation (a random floor plan first, then what each room is for).
##   - The written rooms are put in blocks: the clusters that branch after each spine room, then that spine room. A
##     quarter more rooms than they need stand quiet: ordinary, in the look of their block, with no function of their
##     own; they go to the clusters, the seed's pick. The blocks, so sized, are the plan the geometry is laid out for.
##   - The geometry is the rooms generator's own (its `geometry`), on one of the setting's layout forms (RoomForms, by
##     weight; hub and spokes, spine, ring ...) kept to as faithfully as its "follow" says (RoomJoins), each block a
##     group of the form's places (a spoke, a wing, a building, a stretch of a ring), or on the scatter, the blocks
##     taken in the order the corridors join its rooms. The way in is its first room, the core its last, behind the
##     vault door, which the core's lock shuts (on the generator's flag, or a card's colour).
##   - Within its block a room type takes the room that fits it best (InstallationFit), the quiet ones what is left.
##   - Each room's things go in as written (InstallationPut); then what may stand there by its type's tiers (common,
##     uncommon, rare and anomalous, each at its chance); then it is furnished for its purpose (the rooms generator's
##     furnishing), as fully as its type's density says, with dressing in its corners if that says so; a quiet room is
##     dressed in its corners. Then, as the rooms generator does: something on the balconies, windows, pools, the
##     storeys above and below (their rooms quiet too).
##   - The level is proved finishable (ProgrammeCheck); a seed whose is not, or that fits too few rooms, gives way to
##     the next.
## The gate and the locked wing of a written programme are not laid here yet (the design's step 4: the mission graph on
## any geometry), so the writer leaves them out (InstallationWriter.on_rooms).
class_name InstallationPlace

const RoomsGen := preload("res://generators/rooms.gd")
const Contents := preload("res://generators/rooms/contents.gd")
const Hazards := preload("res://generators/rooms/hazards.gd")
const Storeys := preload("res://generators/rooms/storeys.gd")
const Furnish := preload("res://generators/rooms/furnish.gd")
const TRIES := 40
const QUIET := 0.25              # of the rooms, about this many stand quiet
const CELLS := 110.0             # map cells for each room wanted (the rooms generator's own: ten on 36 by 28)
const CELLS_FORM := 140.0        # on a layout form, which leaves more of the map between its places
const CORE_DOOR := "door_vault"
const TIERS := {"common": 0.6, "uncommon": 0.3, "rare": 0.1, "anomalous": 0.04}     # the chance of each thing of a tier
const DENSITY := {"sparse": [0.4, 0, 2], "normal": [1.0, 0, 2], "cluttered": [1.0, 4, 1], "crowded": [1.0, 8, 1],
	"crammed": [1.0, 0, 2]}      # how much of its purpose's furniture goes in, how much dressing besides, and where:
	# in a corner (wall on two sides) or anywhere against a wall (one)


## The written level (InstallationGen.write, on_rooms) laid out from `seed_value` with the rooms generator's `params`
## under the setting's: the level, or {} if no try will do.
static func make(written: Dictionary, seed_value: int, params: Dictionary) -> Dictionary:
	var info: Dictionary = written.get("installation", {})
	var arch := InstallationSettings.resolve(str(info.get("archetype", "")))
	var contra: Dictionary = LM.defs.get("contradictions", {}).get(str(info.get("contradiction", "")), {})
	for attempt in TRIES:
		var out := InstallationPlace._try(written, arch, contra, seed_value + attempt * 7919, params)
		if not out.is_empty():
			return out
	push_error("installation '%s': no layout on the rooms generator's geometry" % written.get("id", ""))
	return {}


## One try from one seed (see the top of this file), or {}.
static func _try(written: Dictionary, arch: Dictionary, contra: Dictionary, s: int, params: Dictionary) -> Dictionary:
	var prog: Dictionary = written.get("programme", {})
	var pick := Dice.derive(s, "installation place")
	var blocks := InstallationPlace._blocks(prog, pick)
	var plan := InstallationPlace._plan(blocks, pick)
	var ctx := GenContext.new(s, InstallationPlace.params(written, arch, contra, params, plan, s), true)
	if not RoomsGen.geometry(ctx):
		return {}
	var where := InstallationPlace._assign(ctx, blocks, plan, arch.get("roles", {}))
	if where.is_empty():
		return {}
	if not InstallationPlace._fill(ctx, written, arch, contra, where):
		return {}
	ctx.stage("balconies")
	Contents.balconies(ctx)                  # something worth the climb
	ctx.stage("hazards")
	Hazards.windows(ctx)
	Hazards.pools(ctx)
	ctx.stage("storeys")
	Storeys.storeys(ctx)                     # doors and rooms upstairs, the basement, lifts and pits
	var out := InstallationPlace._level(RoomsGen.assemble(ctx), written, where, ctx)
	return out if ProgrammeCheck.solve(out).get("ok", false) else {}


## The rooms generator's params for an installation laid out for `plan` (its groups of rooms, _plan): the game's, with
## the setting's look (its kit, its corridors, its doors, its rooms' styles), its people (by the contradiction's bias)
## and its loot; its layout forms ("forms", by weight) and how faithfully they are kept ("follow"), where it gives them
## (a "form" the params name already is kept: the test's); and a map sized for its rooms and the form.
static func params(written: Dictionary, arch: Dictionary, contra: Dictionary, base: Dictionary, plan: Array, s: int) -> Dictionary:
	var p: Dictionary = base.duplicate(true)
	var want := 2
	for gp in plan:
		want += int(gp["size"])
	for k in ["forms", "follow"]:
		if arch.has(k):
			p[k] = arch[k]
	p["plan"] = plan
	var side := sqrt(want * (CELLS if GenContext.pick_form(p, s) == "" else CELLS_FORM) / (36.0 * 28.0))
	p.merge({"kit": written.get("kit", p.get("kit", "")), "corridor": written.get("style", "corridor"),
		"place": written.get("name", "Installation"), "rooms": want, "size": [roundi(36 * side), roundi(28 * side)],
		"doors": arch.get("doors", p.get("doors", ["door_split"])), "props": arch.get("dressing", []), "swimmers": []}, true)
	var styles: Array = []
	for rid in arch.get("roles", {}):
		var st: Variant = arch["roles"][rid].get("style", "")
		for x in (st if st is Array else [st]):
			if str(x) != "" and not styles.has(x):
				styles.append(x)
	p["styles"] = styles if not styles.is_empty() else p.get("styles", [])
	var bias: Dictionary = contra.get("bias", {})
	p["actors"] = arch.get("occupants", {}).get("actors", []).map(func(e: Array) -> Array:
		return [str(e[0]), float(e[1]) * float(bias.get(e[0], 1.0))])
	p["gallery_actors"] = p["actors"]
	var loot: Array = []
	for e in arch.get("loot", []):
		for k in maxi(1, roundi(float(e[1]))):
			loot.append(str(e[0]))
	p["treasure"] = loot
	p["locker_loot"] = loot
	return p


## The written rooms in blocks, in the order the corridors will take them: for each spine room after the way in, the
## clusters that branch before it, then it; the clusters after the last of them; each room of a cluster there by its
## chance, the seed's draw. Each block: {"rooms": [written rooms], "cluster": its id ("" for a spine room), "name"}.
static func _blocks(prog: Dictionary, pick: RandomNumberGenerator) -> Array:
	var spine: Array = prog.get("rooms", [])
	var ids: Array = spine.map(func(r: Dictionary) -> String: return r["id"])
	var after := {}
	for w in prog.get("wings", []):
		var aft: Variant = w.get("after", ids[0])
		var at := ids.find(str(Dice.pick(pick, aft) if aft is Array else aft))
		var rooms: Array = w.get("rooms", []).filter(func(r: Dictionary) -> bool:
			return not r.has("chance") or pick.randf() < float(r["chance"]))
		if not after.has(at):
			after[at] = []
		after[at].append({"rooms": rooms, "cluster": str(w.get("id", "")), "name": str(w.get("name", ""))})
	var out: Array = []
	for i in range(0, spine.size() - 1):
		if i > 0:
			out.append({"rooms": [spine[i]], "cluster": "", "name": spine[i]["name"]})
		out += after.get(i, [])
	return out


## Each block as a group of the plan the geometry is laid out for: as many rooms as it has, and the quiet ones (a
## quarter more in all, QUIET) given to its clusters, the seed's pick (to its steps only if it has no cluster): each
## {"size": n, "kind": "step" (a spine room) or "cluster"}.
static func _plan(blocks: Array, pick: RandomNumberGenerator) -> Array:
	var n := 2
	var to: Array = []
	for bi in blocks.size():
		n += blocks[bi]["rooms"].size()
		if blocks[bi]["cluster"] != "":
			to.append(bi)
	if to.is_empty():
		to = range(blocks.size())
	var out: Array = blocks.map(func(b: Dictionary) -> Dictionary:
		return {"size": b["rooms"].size(), "kind": "cluster" if b["cluster"] != "" else "step"})
	for k in ceili(n / (1.0 - QUIET)) - n:
		out[to[pick.randi() % to.size()]]["size"] += 1
	return out


## Which room of the geometry each written room gets: the way in the first, the core the last; the rest by the plan's
## groups (see the top of this file): on a form, the rooms at the places for each group; on the scatter, the units in
## the order the corridors join them, as many to each group as its size. An array the length of the context's areas:
## {"room": the written room, or {} for a quiet one, "block": its block, "shape": what the fit saw of it}. [] if a
## group has fewer rooms than it must hold. `roles`: the room types, for their fit.
static func _assign(ctx: GenContext, blocks: Array, plan: Array, roles: Dictionary) -> Array:
	var group_of: Array = ctx.group_of if not ctx.group_of.is_empty() else InstallationPlace._slices(ctx, plan)
	var out: Array = []
	out.resize(ctx.areas.size())
	for i in ctx.areas.size():
		out[i] = {"room": {}, "block": {}, "shape": InstallationPlace.shape_of(ctx, ctx.areas[i])}
	for bi in blocks.size():
		var b: Dictionary = blocks[bi]
		var span: Array = range(ctx.areas.size()).filter(func(i: int) -> bool:
			var u: int = ctx.areas[i]["unit"]
			return u != 0 and u != ctx.last and int(group_of[u]) == bi)
		if span.size() < b["rooms"].size():
			return []
		var places: Array = span.map(func(i: int) -> Array: return out[i]["shape"])
		var fits: Array = b["rooms"].map(func(r: Dictionary) -> Dictionary: return roles.get(str(r.get("role", "")), {}).get("fit", {}))
		var got := InstallationFit.best(fits, places)
		for k in span.size():
			out[span[k]]["block"] = b
		for j in got.size():
			out[span[got[j]]]["room"] = b["rooms"][j]
	return out


## On the scatter: each unit's group, the units between the way in and the core taken in order, as many to each group
## as its size (-1 for the way in, the core and any over).
static func _slices(ctx: GenContext, plan: Array) -> Array:
	var out: Array = []
	out.resize(ctx.rects.size())
	out.fill(-1)
	var u := 1
	for gi in plan.size():
		for k in int(plan[gi]["size"]):
			if u < ctx.last:
				out[u] = gi
			u += 1
	return out


## A room of the geometry as the fit sees it: [cells of floor, storeys].
static func shape_of(ctx: GenContext, a: Dictionary) -> Array:
	return [InstallationPut.floor_of(ctx, a).size(), int(a.get("height", 1))]


## Each room of the geometry made what it was given: its name, style and purpose; its things; its furniture; a quiet
## room its dressing. The start at the way in; the core's lock on the vault door, and its card, if it has one. False if
## a room cannot hold what it must.
static func _fill(ctx: GenContext, written: Dictionary, arch: Dictionary, contra: Dictionary, where: Array) -> bool:
	var prog: Dictionary = written.get("programme", {})
	var spine: Array = prog.get("rooms", [])
	var quiet := InstallationContents.new(arch, contra, arch.get("words", {}), Dice.derive(ctx.seed_value, "installation quiet words"), ctx.rng)
	ctx.used[ctx.start] = true
	ctx.things.append({"at": [ctx.start.x, ctx.start.y], "start": true, "face": "n"})
	var lock: Dictionary = {}
	for lk in prog.get("locks", []):
		if lk.get("room", "") == spine[-1]["id"]:
			lock = lk
	ctx.legend["Z"] = {"door": CORE_DOOR, "flag": lock["flag"], "need": lock.get("need", "")} if lock.has("flag") \
		else {"door": CORE_DOOR, "lock": str(lock.get("color", "red"))}
	var card_at := InstallationPlace._card_room(ctx, where, lock)
	for i in ctx.areas.size():
		var a: Dictionary = ctx.areas[i]
		ctx.stage("installation room %d %s" % [i, a["rect"].position])     # each room its own numbers
		var room: Dictionary = spine[0] if a["unit"] == 0 else (spine[-1] if a["unit"] == ctx.last else where[i]["room"])
		quiet.rng = ctx.rng
		if room.is_empty():
			InstallationPlace._quiet(ctx, a, where[i]["block"], quiet, arch)
			continue
		InstallationPlace._named(ctx, a, room, where[i]["block"].get("cluster", ""))
		var things: Array = room.get("things", []).duplicate(true)
		if i == card_at:
			things.append({"item": "keycard", "color": str(lock["color"])})
		if not InstallationPlace._furnished(ctx, i, a, room, things, arch.get("roles", {}).get(str(room.get("role", "")), {})):
			return false
	return true


## A written room's things put in (false if it cannot hold them all), then what may stand there by its type's tiers
## ("contents": each thing of "common", "uncommon", "rare" and "anomalous" there at its tier's chance, TIERS), then its
## furniture for its purpose, as much as its "density" says, and dressing in its corners if it says so (DENSITY).
static func _furnished(ctx: GenContext, i: int, a: Dictionary, room: Dictionary, things: Array, role: Dictionary) -> bool:
	for t in things:
		if not InstallationPut.put(ctx, a, t):
			return false
	var tiers: Dictionary = role.get("contents", {})
	for tier in TIERS:
		for e in tiers.get(tier, []):
			if ctx.rng.randf() < float(TIERS[tier]):
				InstallationPut.put(ctx, a, e if e is Dictionary else {"prop": str(e), "at": "wall"})
	var den: Array = DENSITY.get(str(role.get("density", "normal")), DENSITY["normal"])
	var pur: Dictionary = LM.defs.get("purposes", {}).get(str(room.get("purpose", "")), {}).duplicate(true)
	ctx.stage("installation furnish %d %s" % [i, a["rect"].position])
	if not pur.is_empty():
		pur["crammed"] = pur.get("crammed", false) or str(role.get("density", "")) == "crammed"
		Furnish.furnish(ctx, a["unit"], InstallationPut.floor_of(ctx, a), pur, ctx.kit_name, float(ctx.p.get("furnish", 1.0)) * float(den[0]))
	InstallationPut.dress(ctx, a, ctx.p.get("props", []), int(den[1]), int(den[2]))
	return true


## Where the core's card goes (a card's colour lock): one of the rooms its lock names that has a room here, the seed's
## pick; -1 for none (a lock on a flag, or no such room).
static func _card_room(ctx: GenContext, where: Array, lock: Dictionary) -> int:
	if not lock.has("color"):
		return -1
	var keep: Array = []
	for i in where.size():
		if lock.get("card", []).has(where[i]["room"].get("id", "")):
			keep.append(i)
	return keep[ctx.rng.randi() % keep.size()] if not keep.is_empty() else -1


## A written room's entry in the level's rooms: its name, style and purpose, what it was written as ("role") and the
## cluster it belongs to ("" on the spine); the area takes its style, so the walls are its.
static func _named(ctx: GenContext, a: Dictionary, room: Dictionary, cluster: String) -> void:
	var st := str(room.get("style", a["style"]))
	a["style"] = st
	var e: Dictionary = ctx.rooms[a["room"]]
	e.erase("quiet")
	e.merge({"id": room.get("id", ""), "name": room.get("name", ""), "style": st, "purpose": room.get("purpose", ""),
		"role": room.get("role", ""), "cluster": cluster}, true)


## A quiet room: in the look of a room of its block (any of the setting's, if its block has none here), named from
## the setting's words ("quiet"), with what any room may hold (InstallationContents: loot now and then, who lives there)
## and dressing in its corners.
static func _quiet(ctx: GenContext, a: Dictionary, block: Dictionary, quiet: InstallationContents, arch: Dictionary) -> void:
	var looks: Array = block.get("rooms", []).map(func(r: Dictionary) -> String: return str(r.get("style", "")))
	looks = looks.filter(func(x: String) -> bool: return x != "")
	var st := str(Dice.pick(ctx.rng, looks if not looks.is_empty() else ctx.styles))
	a["style"] = st
	var e: Dictionary = ctx.rooms[a["room"]]
	e["style"] = st
	e["name"] = InstallationWords.line("quiet", arch.get("words", {}), ctx.rng) if arch.get("words", {}).has("quiet") else e["name"]
	e["cluster"] = block.get("cluster", "")
	for t in quiet.things({}):
		InstallationPut.put(ctx, a, t)
	InstallationPut.dress(ctx, a, ctx.p.get("props", []))


## The level as the rooms generator assembled it, with the written level's own keys over it: its id, name, look,
## words, systems, triggers, objectives and what was chosen; now also "geometry": "rooms"; "fits": each written room's
## id -> what the fit saw of the room it got ([cells of floor, storeys]); and the layout form ("form", "follow", and
## "form_ways": the ways the form meant, before any was let go, as pairs of indices into the level's rooms): for the
## test.
static func _level(out: Dictionary, written: Dictionary, where: Array, ctx: GenContext) -> Dictionary:
	for k in ["id", "name", "kit", "style", "intro", "systems", "objectives"]:
		if written.has(k):
			out[k] = written[k]
	out["triggers"] = written.get("triggers", []) + out.get("triggers", [])
	out["installation"] = written.get("installation", {}).duplicate(true)
	out["installation"]["geometry"] = "rooms"
	var fits := {}
	for w in where:
		if not w["room"].is_empty():
			fits[w["room"]["id"]] = w["shape"]
	out["installation"]["fits"] = fits
	var room_of := {}                              # unit -> the level room of its first area
	for a in ctx.areas:
		if not room_of.has(a["unit"]):
			room_of[a["unit"]] = a["room"]
	var ways: Array = ctx.graph.get("edges", []) + ctx.graph.get("loops", []) if ctx.form != "" \
		else range(1, ctx.rects.size()).map(func(i: int) -> Array: return [i - 1, i])
	out["installation"].merge({"form": ctx.form if ctx.form != "" else "scatter", "follow": ctx.follow,
		"form_ways": ways.map(func(e: Array) -> Array: return [room_of[e[0]], room_of[e[1]]])}, true)
	out.erase("tags")
	return out
