extends RefCounted
## RoomForms - the layout forms (SPEC 6.2; the grandeur design's step 3): the rough graph a place's rooms hang on,
## drawn before any room is placed. A form is a set of places on the map, in fractions of its width and height so it
## fits any map, and the ways between them: each place becomes one room of the rooms generator's, joined to the place
## before it on its branch (the edges, a tree from the way in), with a few more ways round (the loops). The way in is
## always the first place, the core (the vault) the last, joined by one way only, so its door can be locked.
## A form is laid out for a plan: groups of rooms that belong together, in order, each a spine step ("step") or a
## cluster that branches after the step before it ("cluster"), each of a size ([{"size": n, "kind": ...}]). A written
## installation gives its own (InstallationPlace); a place with none gets one of the seed's (plan_for). Each place
## says which group it is for ("group", -1 for a place the form adds itself: the way in, the core, a yard or a hub
## no step stands in). How faithfully the rooms keep to the places and the corridors to the ways is RoomJoins'
## business (the context's "follow").
##   hub         a big hall in the middle, the clusters spokes out of it; the steps after the first on the way up to
##               the core; a way round between two neighbouring spokes' ends
##   stack       a hub whose hall is three storeys tall, its spokes packed close round it, with more rooms upstairs
##   spine       the steps in a row from the way in to the core, each cluster a wing off the step before it, up or
##               down; a way round between two wings on the same side
##   tree        a trunk of steps up the middle, each cluster a branch out of its step that splits as it goes; no
##               ways round
##   ring        every room round a loop, the way in outside it and the core in the middle, reached from the far side
##   concentric  the clusters round an outer ring, the steps round an inner one (a yard where there are too few), one
##               way in between them and one into the core in the middle
##   twin        two halls joined by one long way, the clusters split between them, and a second way between them
##               round the outside
##   campus      a yard in the middle and each cluster a building round it, its rooms close about its first; a way
##               between two neighbouring buildings
class_name RoomForms

const FORMS := ["hub", "stack", "spine", "tree", "ring", "concentric", "twin", "campus"]
const AROUND := [0.0, 30.0, 150.0, 180.0, 210.0, 330.0]     # spokes' directions in degrees (0 east, 90 south): not up or down


## The graph of form `id` laid out for `plan`: {"nodes": [{"at": Vector2, "group": int, "hall": bool, "tall": bool}],
## "edges": [[a, b], ...] (each node joined from an earlier one, the core last), "loops": [[a, b], ...], "shapes":
## overrides of the rooms generator's shapes}.
static func graph(id: String, plan: Array, rng: RandomNumberGenerator) -> Dictionary:
	var g := {"nodes": [], "edges": [], "loops": [], "shapes": {}}
	match id:
		"hub":
			RoomForms._hub(g, plan, rng, 1.0)
		"stack":
			RoomForms._hub(g, plan, rng, 0.6)
			g["shapes"] = {"upper_doors": 3, "upper_rooms": 3, "lift_rooms": 2, "balcony": 1.0}
		"spine":
			RoomForms._spine(g, plan, rng)
		"tree":
			RoomForms._tree(g, plan, rng)
		"ring":
			if RoomFormGate.gate_of(plan) >= 0:
				RoomFormGate.ring(g, plan)
			else:
				RoomForms._ring(g, plan, rng)
		"concentric":
			if RoomFormGate.gate_of(plan) >= 0:
				RoomFormGate.concentric(g, plan)
			else:
				RoomForms._concentric(g, plan, rng)
		"twin":
			RoomForms._twin(g, plan, rng)
		"campus":
			RoomForms._campus(g, plan, rng)
	RoomFormGate.regions(g, plan)
	return g


## A plan for a place that brings none: two steps, and clusters of two to four rooms to make up `rooms` in all (with
## the way in and the core).
static func plan_for(rooms: int, rng: RandomNumberGenerator) -> Array:
	var out: Array = [{"size": 1, "kind": "step"}]
	var left := maxi(0, rooms - 4)
	while left > 0:
		var n := mini(left, rng.randi_range(2, 4))
		out.append({"size": n, "kind": "cluster"})
		left -= n
		if out.size() == 2:
			out.append({"size": 1, "kind": "step"})
	return out


# ------------------------------------------------------------------ the forms
static func _hub(g: Dictionary, plan: Array, rng: RandomNumberGenerator, reach: float) -> void:
	var steps := RoomForms.of(plan, "step")
	var entry := RoomForms.add(g, Vector2(0.5, 0.96), -1)
	var hub := RoomForms.add(g, Vector2(0.5, 0.55), steps[0] if not steps.is_empty() else -1, true, reach < 1.0)
	RoomForms.join(g, entry, hub)
	var tips := RoomForms._spokes(g, plan, RoomFormGate.near(plan), hub, 0.42 * reach, rng)
	var last := RoomForms._chain_up(g, steps.slice(1), hub, 0.55)
	RoomFormGate.far_spokes(g, plan, tips, 0.36 * reach)   # (a gate's far clusters out of it)
	RoomForms._ring_loop(g, tips, rng)
	RoomForms.core(g, last, Vector2(0.5, 0.05))


static func _spine(g: Dictionary, plan: Array, rng: RandomNumberGenerator) -> void:
	var entry := RoomForms.add(g, Vector2(0.05, 0.5), -1)
	var at := entry
	var m := RoomForms.of(plan, "step").size()
	var k := 0
	var wings := {}                               # side -> the tips of its near wings, in order
	var side := 1 if rng.randf() < 0.5 else -1
	var open := [-1, side]                        # the last near wing not locked: its tip and side (a far wing goes its side)
	for gi in plan.size():
		if plan[gi]["kind"] == "step":
			k += 1
			var n := RoomForms.add(g, Vector2(0.05 + 0.9 * k / (m + 1), 0.5 + rng.randf_range(-0.04, 0.04)), gi)
			RoomForms.join(g, at, n)
			at = n
		else:
			var far: bool = plan[gi].get("far", false)
			var size := int(plan[gi]["size"])
			var s: int = open[1] if far else side
			var tip := RoomForms.branch(g, gi, size, at, Vector2(rng.randf_range(-0.03, 0.03), s), 0.42 / (size + 0.3))
			RoomForms._wing_done(g, plan, gi, tip, s, open)
			if not far:
				wings[side] = wings.get(side, []) + [tip]
				side = -side
	for s in wings:
		if wings[s].size() >= 2:
			var i: int = rng.randi() % (wings[s].size() - 1)
			g["loops"].append([wings[s][i], wings[s][i + 1]])
	RoomForms.core(g, at, Vector2(0.95, 0.5))


static func _tree(g: Dictionary, plan: Array, rng: RandomNumberGenerator) -> void:
	var entry := RoomForms.add(g, Vector2(0.5, 0.95), -1)
	var at := entry
	var m := RoomForms.of(plan, "step").size()
	var k := 0
	var side := 1 if rng.randf() < 0.5 else -1
	var open := [-1, side]                        # as the spine's: the last open branch, its tip and side
	for gi in plan.size():
		if plan[gi]["kind"] == "step":
			k += 1
			var n := RoomForms.add(g, Vector2(0.5, 0.95 - 0.88 * k / (m + 1)), gi)
			RoomForms.join(g, at, n)
			at = n
			continue
		var far: bool = plan[gi].get("far", false)
		var dir := Vector2(open[1] if far else side, -0.5).normalized()
		var size := int(plan[gi]["size"])
		var s := 0.38 / (1.0 + floorf(log(size) / log(2.0)) + 0.3)       # as deep as the branch splits
		var own: Array = []
		for j in size:                            # a heap's shape: each room's parent the one halfway back, so it splits
			var parent: int = at if j == 0 else own[(j - 1) / 2]
			var turn := 0.0 if j == 0 else (0.55 if j % 2 == 1 else -0.55)
			var n := RoomForms.add(g, g["nodes"][parent]["at"] + dir.rotated(turn) * s, gi)
			RoomForms.join(g, parent, n)
			own.append(n)
		if not own.is_empty():                    # the way round between the two branches' nearest rooms
			RoomForms._wing_done(g, plan, gi, RoomForms._toward(g, own, -1.0 if far else 1.0), open[1] if far else side, open)
		if not far:
			side = -side
	RoomForms.core(g, at, Vector2(0.5, 0.04))


static func _ring(g: Dictionary, plan: Array, _rng: RandomNumberGenerator) -> void:
	var entry := RoomForms.add(g, Vector2(0.5, 0.97), -1)
	var ring := RoomForms.around(g, plan, range(plan.size()), Vector2(0.41, 0.38), entry)
	if ring.size() > 2:
		g["loops"].append([ring[-1], ring[0]])
	RoomForms.core(g, ring[ring.size() / 2] if not ring.is_empty() else entry, Vector2(0.5, 0.5), true)


static func _concentric(g: Dictionary, plan: Array, _rng: RandomNumberGenerator) -> void:
	var outer := RoomForms.of(plan, "cluster")
	var inner := RoomForms.of(plan, "step")
	if outer.is_empty():
		outer = inner
		inner = []
	var entry := RoomForms.add(g, Vector2(0.5, 0.97), -1)
	var ring := RoomForms.around(g, plan, outer, Vector2(0.43, 0.41), entry)
	if ring.size() > 2:
		g["loops"].append([ring[-1], ring[0]])
	var gate: int = ring[ring.size() / 2] if not ring.is_empty() else entry
	var places: Array = inner.duplicate()
	while places.size() < 3:                      # an inner ring of three at least: yards where the plan has no step
		places.append(-1)
	var in_ring: Array = []
	var prev := gate
	for j in places.size():                       # from the far side round, the first joined to the outer ring's gate
		var a := -PI / 2 + TAU * j / places.size()
		var n := RoomForms.add(g, Vector2(0.5, 0.5) + Vector2(cos(a) * 0.2, sin(a) * 0.19), places[j])
		RoomForms.join(g, prev, n)
		prev = n
		in_ring.append(n)
	g["loops"].append([in_ring[-1], in_ring[0]])
	RoomForms.core(g, in_ring[in_ring.size() / 2], Vector2(0.5, 0.5), true)


static func _twin(g: Dictionary, plan: Array, _rng: RandomNumberGenerator) -> void:
	var steps := RoomForms.of(plan, "step")
	var entry := RoomForms.add(g, Vector2(0.04, 0.5), -1)
	var h1 := RoomForms.add(g, Vector2(0.27, 0.5), steps[0] if steps.size() > 0 else -1, true)
	var h2 := RoomForms.add(g, Vector2(0.71, 0.5), steps[1] if steps.size() > 1 else -1, true)
	RoomForms.join(g, entry, h1)
	RoomForms.join(g, h1, h2)                    # the one long way between them
	var cl := RoomForms.of(plan, "cluster")
	var half := (cl.size() + 1) / 2
	var far := RoomFormGate.far(plan)
	if not far.is_empty():                        # a gate at the second hall: the near clusters at the first, the open one first
		cl = RoomFormGate.open_first(plan, RoomFormGate.near(plan)) + far
		half = cl.size() - far.size()
	var tips: Array = []
	for j in cl.size():                           # each hall's spokes: up, down, then out away from the other hall
		var mine := j if j < half else j - half
		var deg: float = [-90.0, 90.0, -150.0, 150.0, 180.0][mine % 5] if j < half else [-90.0, 90.0, -30.0, 30.0, 0.0][mine % 5]
		var size := int(plan[cl[j]]["size"])
		tips.append(RoomForms.branch(g, cl[j], size, h1 if j < half else h2, Vector2.from_angle(deg_to_rad(deg)), 0.4 / (size + 0.3)))
	if half < tips.size() and half > 0:           # the second way: round the outside, between the two halls' first spokes
		if far.is_empty():
			g["loops"].append([tips[0], tips[half]])
		else:
			g["round"] = [tips[0], tips[half]]      # (with a gate, the way round it)
	var last := RoomForms._chain_right(g, steps.slice(2), h2)
	RoomForms.core(g, last, Vector2(0.96, 0.5))


static func _campus(g: Dictionary, plan: Array, rng: RandomNumberGenerator) -> void:
	var steps := RoomForms.of(plan, "step")
	var entry := RoomForms.add(g, Vector2(0.5, 0.96), -1)
	var yard := RoomForms.add(g, Vector2(0.5, 0.55), steps[0] if not steps.is_empty() else -1, true)
	RoomForms.join(g, entry, yard)
	var cl := RoomFormGate.near(plan)
	var firsts: Array = []
	for j in cl.size():
		var a := deg_to_rad(AROUND[(j * AROUND.size()) / maxi(1, cl.size()) % AROUND.size()] + rng.randf_range(-10.0, 10.0))
		firsts.append(RoomForms.building(g, plan, cl[j], yard, Vector2(0.5, 0.55) + Vector2(cos(a) * 0.36, sin(a) * 0.34), a))
	RoomForms._ring_loop(g, firsts, rng)
	var last := RoomForms._chain_up(g, steps.slice(1), yard, 0.55)
	RoomFormGate.far_buildings(g, plan, firsts)  # (a gate's far clusters beside it)
	RoomForms.core(g, last, Vector2(0.5, 0.05))


# ------------------------------------------------------------------ pieces
## A campus building for group `gi` joined from node `from`: its first room at `at` (`a`: which way it lies from what
## it is joined to), its other rooms close about the first: the first.
static func building(g: Dictionary, plan: Array, gi: int, from: int, at: Vector2, a: float) -> int:
	var first := RoomForms.add(g, at, gi)
	RoomForms.join(g, from, first)
	var size := int(plan[gi]["size"])
	for k in size - 1:                            # the building's other rooms close about its first
		var b := a + PI + TAU * (k + 1) / size
		var n := RoomForms.add(g, g["nodes"][first]["at"] + Vector2(cos(b) * 0.1, sin(b) * 0.09), gi)
		RoomForms.join(g, first if k % 2 == 0 or k == 0 else n - 1, n)
	return first


## A wing (a branch) of the spine or the tree placed, its tip `tip` on side `side`: a near one not locked is the one
## the way round leaves from (`open`: [tip, side], so far); the first far one is where it goes.
static func _wing_done(g: Dictionary, plan: Array, gi: int, tip: int, side: int, open: Array) -> void:
	if not plan[gi].get("far", false):
		if not plan[gi].get("locked", false) or open[0] < 0:
			open[0] = tip
			open[1] = side
	elif open[0] >= 0 and not g.has("round"):
		g["round"] = [open[0], tip]


## Of a branch's rooms, the highest on the map (`up` 1) or the lowest (-1).
static func _toward(g: Dictionary, nodes: Array, up: float) -> int:
	var best: int = nodes[0]
	for n in nodes:
		if (g["nodes"][best]["at"].y - g["nodes"][n]["at"].y) * up > 0.0:
			best = n
	return best


## A node at `at` for plan group `group` (-1: none of the plan's).
static func add(g: Dictionary, at: Vector2, group: int, hall := false, tall := false) -> int:
	g["nodes"].append({"at": at.clamp(Vector2(0.03, 0.03), Vector2(0.97, 0.97)), "group": group, "hall": hall, "tall": tall})
	return g["nodes"].size() - 1


static func join(g: Dictionary, a: int, b: int) -> void:
	g["edges"].append([a, b])


## The core, last, joined from `parent`.
static func core(g: Dictionary, parent: int, at: Vector2, hall := false) -> void:
	RoomForms.join(g, parent, RoomForms.add(g, at, -1, hall))


## The plan's groups of that kind, in order.
static func of(plan: Array, kind: String) -> Array:
	var out: Array = []
	for gi in plan.size():
		if str(plan[gi].get("kind", "cluster")) == kind:
			out.append(gi)
	return out


## Group `gi`'s `size` rooms out from node `from` along `dir`, `step` apart, each joined to the one before: its tip.
static func branch(g: Dictionary, gi: int, size: int, from: int, dir: Vector2, step: float) -> int:
	var at: Vector2 = g["nodes"][from]["at"]
	var last := from
	for k in size:
		var n := RoomForms.add(g, at + dir.normalized() * step * (k + 1), gi)
		RoomForms.join(g, last, n)
		last = n
	return last


## The clusters as spokes out of `hub`, as far as `reach` (spread round it, not straight up or down): their tips.
static func _spokes(g: Dictionary, plan: Array, cl: Array, hub: int, reach: float, rng: RandomNumberGenerator) -> Array:
	var tips: Array = []
	var off := rng.randi() % AROUND.size()
	for j in cl.size():
		var deg: float = AROUND[(off + (j * AROUND.size()) / maxi(1, cl.size())) % AROUND.size()] if cl.size() <= AROUND.size() \
			else 360.0 * j / cl.size()
		var a := deg_to_rad(deg + rng.randf_range(-8.0, 8.0))
		var size := int(plan[cl[j]]["size"])
		tips.append(RoomForms.branch(g, cl[j], size, hub, Vector2(cos(a), sin(a)), reach / (size + 0.3)))
	return tips


## One way round between two neighbouring spokes' tips (or buildings), the seed's pick.
static func _ring_loop(g: Dictionary, tips: Array, rng: RandomNumberGenerator) -> void:
	if tips.size() >= 2:
		var i := rng.randi() % tips.size()
		g["loops"].append([tips[i], tips[(i + 1) % tips.size()]])


## Steps one after another up from `from` (at height `y0`) toward the core at the top, evenly: the last.
static func _chain_up(g: Dictionary, steps: Array, from: int, y0: float) -> int:
	var last := from
	for k in steps.size():
		var n := RoomForms.add(g, Vector2(0.5, y0 - (y0 - 0.05) * (k + 1) / (steps.size() + 1)), steps[k])
		RoomForms.join(g, last, n)
		last = n
	return last


## Steps one after another east of `from` toward the core: the last.
static func _chain_right(g: Dictionary, steps: Array, from: int) -> int:
	var last := from
	for k in steps.size():
		var n := RoomForms.add(g, g["nodes"][from]["at"] + Vector2(0.2 * (k + 1) / (steps.size() + 1), 0.08), steps[k])
		RoomForms.join(g, last, n)
		last = n
	return last


## The groups `groups` round an ellipse of `radii` about the middle, from just right of the bottom, each group's rooms
## together, one after another, the first joined from `from`: the ring's nodes in order.
static func around(g: Dictionary, plan: Array, groups: Array, radii: Vector2, from: int) -> Array:
	var each: Array = []
	for gi in groups:
		for k in int(plan[gi]["size"]):
			each.append(gi)
	var out: Array = []
	var prev := from
	for i in each.size():
		var a := PI / 2 - TAU * (i + 0.5) / each.size()
		var n := RoomForms.add(g, Vector2(0.5, 0.5) + Vector2(cos(a) * radii.x, sin(a) * radii.y), each[i])
		RoomForms.join(g, prev, n)
		prev = n
		out.append(n)
	return out
