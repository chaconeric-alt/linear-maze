extends RefCounted
## InstallationGate - a written installation's gate and locked wing on the rooms generator's geometry (SPEC 6.4; the
## grandeur design's step 4, the mission graph on any geometry). The writer gives them as a programme would have them
## (InstallationWriter): the gate a spine room shut on its flag or its own way's (a card on the near side, or security
## shut down), with a release that opens it from the far side; one wing past it; a way round from a near wing to the
## far one; the generator's wing now and then locked by a yellow card in another near wing.
##   - The plan the geometry is laid out for says which of its groups are the gate, past it and locked (mark), and
##     the layout form decides where they go (RoomFormGate): every door of the gate's room is the gate's, every way
##     into the locked wing from outside it the wing's, and the way round a corridor of its own from a near room to a
##     far one; the rooms generator keeps the sides apart.
##   - Here the doors are told what opens them, and the release hung on the wall just outside one of the gate's doors
##     on the far side (lay); what the level says of its gate gets a cell of the way round, to seal for the proof.
##   - The scatter has no sides: there the gate's room is an ordinary room and its card is left out (stray_card), and
##     so is the wing's lock.
##   - A try whose gate does not hold, or cannot be passed both ways, or whose way round is no longer a way back than
##     the gate (SAVED), or whose wing opens without its card, is no good (holds): ProgrammeCheck walks it with the keys
##     withheld and the way round sealed, and ProgrammeGraph counts the steps back.
class_name InstallationGate

const DIRS := GenContext.DIRS
const NEAR_STEPS := 10           # how far from the gate's far door the release may hang, in steps
const SAVED := 6                 # from the release, how many steps the open gate must save at least over the way round


## The programme's gate: the lock with a release; {} for none.
static func gate_lock(prog: Dictionary) -> Dictionary:
	for lk in prog.get("locks", []):
		if lk.has("release"):
			return lk
	return {}


## The programme's locked wing: the lock on a wing; {} for none.
static func wing_lock(prog: Dictionary) -> Dictionary:
	for lk in prog.get("locks", []):
		if lk.has("wing"):
			return lk
	return {}


## The plan's groups marked for the form: the gate's step "gate", the wing past it "far" (with a room at least, so
## the way round has somewhere to go), the locked wing "locked". `blocks`: the written rooms the plan's groups are for.
static func mark(plan: Array, blocks: Array, prog: Dictionary) -> void:
	var room := str(InstallationGate.gate_lock(prog).get("room", ""))
	var locked := str(InstallationGate.wing_lock(prog).get("wing", ""))
	var far := {}
	for w in prog.get("wings", []):
		if room != "" and str(w.get("after", "")) == room:
			far[str(w.get("id", ""))] = true
	for bi in blocks.size():
		var b: Dictionary = blocks[bi]
		if b["cluster"] == "" and not b["rooms"].is_empty() and str(b["rooms"][0].get("id", "")) == room:
			plan[bi]["gate"] = true
		elif far.has(b["cluster"]):
			plan[bi]["far"] = true
			plan[bi]["size"] = maxi(1, int(plan[bi]["size"]))
		elif b["cluster"] != "" and b["cluster"] == locked:
			plan[bi]["locked"] = true


## The gate's and the locked wing's doors told what opens them, and the release hung, as far as the geometry has
## them (see the top of this file). {"ok": false} if a gate has no far door to hang its release by; else "gate": what
## the level says of its gate (the writer's, with "round": a cell of the way round), {} for none; "wing": the wing's
## lock if its doors are laid, else {}.
static func lay(ctx: GenContext, prog: Dictionary, written_gate: Dictionary) -> Dictionary:
	var gl := InstallationGate.gate_lock(prog)
	var wl := InstallationGate.wing_lock(prog)
	var door: String = str(ctx.doors[0]) if not ctx.doors.is_empty() else "door_split"
	var out := {"ok": true, "gate": {}, "wing": {}}
	if ctx.gate >= 0 and not gl.is_empty() and not ctx.round_cells.is_empty():
		ctx.legend[GenContext.GATE_DOOR] = {"door": door, "flag": gl["flag"], "need": str(gl.get("need", ""))}
		if not InstallationGate._release(ctx, gl.get("release", {}).get("thing", {})):
			return {"ok": false}
		var mid: Vector2i = ctx.round_cells[ctx.round_cells.size() / 2]
		out["gate"] = written_gate.duplicate(true)
		out["gate"]["round"] = [mid.x, mid.y]
	if ctx.region.has(GenContext.WING) and not wl.is_empty():
		ctx.legend[GenContext.WING_DOOR] = {"door": door, "lock": str(wl.get("color", "yellow"))}
		out["wing"] = wl
	return out


## The colour of the gate's card, where the geometry has no gate for it to open (the scatter): "" otherwise.
static func stray_card(ctx: GenContext, written_gate: Dictionary) -> String:
	if ctx.gate >= 0 or str(written_gate.get("by", "")) != "card":
		return ""
	for k in written_gate.get("withhold", []):
		if str(k).begins_with("card:"):
			return str(k).substr(5)
	return ""


## Is the laid level's gate a gate (see the top of this file): with its ways withheld and the way round sealed its room
## is not reached; by either way alone everything is; from its release the way back through it is SAVED steps shorter
## than round; and the locked wing's rooms are not reached without its card. True with neither.
static func holds(out: Dictionary, wing: Dictionary, wing_rooms: Array) -> bool:
	var g: Dictionary = out.get("installation", {}).get("gate", {})
	if not g.is_empty():
		var seal := [[int(g["round"][0]), int(g["round"][1]), 1, 1]]
		var neither := ProgrammeCheck.solve(out, {"withhold": g["withhold"], "seal": seal})
		if neither["ok"] or not neither["missed"].has(g["name"]):
			return false
		if not ProgrammeCheck.solve(out, {"seal": seal})["ok"] or not ProgrammeCheck.solve(out, {"withhold": g["withhold"]})["ok"]:
			return false
		if InstallationGate.saved(out) < SAVED:
			return false
	if not wing.is_empty():
		var c := str(wing.get("color", "yellow"))
		var missed: Array = ProgrammeCheck.solve(out, {"withhold": ["card:" + c, "key_" + c]})["missed"]
		if not wing_rooms.all(func(nm: String) -> bool: return missed.has(nm)):
			return false
	return true


## How many steps back to the way in the open gate saves, from its release, over the way round (-1 if either way
## is missing): every key held, and then the gate's own and its flag withheld.
static func saved(out: Dictionary) -> int:
	var g: Dictionary = out.get("installation", {}).get("gate", {})
	var rel: Array = out.get("things", []).filter(func(t: Dictionary) -> bool: return t.get("tag", "") == "gate_release")
	if g.is_empty() or rel.is_empty():
		return -1
	var full := ProgrammeCheck.solve(out)
	var held: Array = full["flags"] + full["systems"]
	for c in full["cards"]:
		held += ["card:" + c, "key_" + c]
	var shut: Array = held.filter(func(k: String) -> bool: return k != g["flag"] and not g["withhold"].has(k))
	var from := [Vector2i(int(rel[0]["at"][0]), int(rel[0]["at"][1])), 0]
	var back := ProgrammeGraph.steps(out, from, ProgrammeCheck.start_of(out), held)
	var round := ProgrammeGraph.steps(out, from, ProgrammeCheck.start_of(out), shut)
	return round - back if back >= 0 and round >= 0 else -1


## The release (a thing whose use sets the gate's flag) hung on a wall just outside one of the gate's doors on the far
## side: the first such door whose way out leads, without another locked door, to a far room but the core; on the
## nearest cell there of plain floor with a wall beside it, its back to the wall. False if there is none.
static func _release(ctx: GenContext, thing: Dictionary) -> bool:
	for dc in ctx.door_cells:
		var q: Vector2i = dc[0]
		if ctx.g[q.y][q.x] != GenContext.GATE_DOOR or int(ctx.corr_region.get(q, -1)) != GenContext.FAR:
			continue
		var cells := InstallationGate._outside(ctx, q)
		if not cells.any(func(c: Vector2i) -> bool:
				var u: int = ctx.room_of[c.y][c.x]
				return u >= 0 and u != ctx.last and ctx.region[u] == GenContext.FAR):
			continue                                   # (a door on to the vault's corridor leads nowhere)
		for c in cells.slice(0, NEAR_STEPS):
			for k in 4:
				var w: Vector2i = c + DIRS[k]
				if ctx.g[c.y][c.x] == "." and ctx.plain(c) and ctx.g[w.y][w.x] == "#":
					var e: Dictionary = thing.duplicate(true)
					e.merge({"at": [c.x, c.y], "face": GenContext.NAMES[(k + 2) % 4], "blocks": false}, true)
					ctx.things.append(e)
					ctx.used[c] = true
					return true
	return false


## The cells beyond the gate's door q, nearest first, without passing another locked door or going back into the
## gate's room: as far as they lead.
static func _outside(ctx: GenContext, q: Vector2i) -> Array:
	var out: Array = []
	var seen := {q: true}
	for d in DIRS:
		var n: Vector2i = q + d
		if ctx.room_of[n.y][n.x] == ctx.gate:
			seen[n] = true
	var todo: Array = [q]
	var i := 0
	while i < todo.size():
		var c: Vector2i = todo[i]
		i += 1
		for d in DIRS:
			var n: Vector2i = c + d
			var ch: String = ctx.g[n.y][n.x]
			if seen.has(n) or ch == "#" or ch == "Z" or ch == GenContext.GATE_DOOR or ch == GenContext.WING_DOOR or ctx.room_of[n.y][n.x] == ctx.gate:
				continue
			seen[n] = true
			todo.append(n)
			out.append(n)
	return out
