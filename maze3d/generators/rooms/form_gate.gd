extends RefCounted
## RoomFormGate - a layout form's mission graph (SPEC 6.2; the grandeur design's step 4: the mission graph on any
## geometry). A plan may mark a step as its gate ("gate"), the clusters that lie past it ("far") and a cluster locked
## with doors of its own ("locked"). The form then decides where they go (RoomForms, each in its own way): the far
## clusters beyond the gate from the way in, and a way round ("round") from a near cluster that is not locked to a far
## one, which the corridors always keep. What lies past the gate in the form's tree (the far clusters, any step after
## it, the core) is the far side; the rest is the near side, but for a locked cluster's rooms. Every way between the
## sides but the gate's room and the way round is left out (the form's own ways round), so the gate holds: its doors
## are every way past it, and the way round the one other. The rooms generator keeps the sides apart as it carves
## (RoomJoins, the storeys), and the written installation proves it (InstallationPlace).
class_name RoomFormGate


## The plan's groups that are clusters this side of the gate, in order (all of them, without a gate).
static func near(plan: Array) -> Array:
	return RoomForms.of(plan, "cluster").filter(func(gi: int) -> bool: return not plan[gi].get("far", false))


## The plan's clusters past the gate.
static func far(plan: Array) -> Array:
	return RoomForms.of(plan, "cluster").filter(func(gi: int) -> bool: return plan[gi].get("far", false))


## The plan's gate (its group), or -1.
static func gate_of(plan: Array) -> int:
	for gi in plan.size():
		if plan[gi].get("gate", false):
			return gi
	return -1


## The node for the plan's gate, or -1.
static func gate_node(g: Dictionary, plan: Array) -> int:
	for i in g["nodes"].size():
		var gi: int = g["nodes"][i]["group"]
		if gi >= 0 and plan[gi].get("gate", false):
			return i
	return -1


## Of `nodes`, the one of a cluster that is not locked nearest `toward` (any, if every one is locked): -1 for none.
static func open_nearest(g: Dictionary, plan: Array, nodes: Array, toward: Vector2) -> int:
	var best := -1
	for pass_any in [false, true]:
		for n in nodes:
			var gi: int = g["nodes"][n]["group"]
			if not pass_any and gi >= 0 and plan[gi].get("locked", false):
				continue
			if best < 0 or g["nodes"][n]["at"].distance_to(toward) < g["nodes"][best]["at"].distance_to(toward):
				best = n
		if best >= 0:
			return best
	return best


## The near clusters with the one the way round leaves from first: the first that is not locked.
static func open_first(plan: Array, groups: Array) -> Array:
	var out: Array = groups.duplicate()
	for j in out.size():
		if not plan[out[j]].get("locked", false):
			out.push_front(out.pop_at(j))
			break
	return out


## The hub's (and the stack's) far clusters: spokes out of the gate, off to the side of the open spoke whose tip is
## highest, so the way round between their tips is short and runs past nothing else. `tips`: the near spokes' tips.
static func far_spokes(g: Dictionary, plan: Array, tips: Array, reach: float) -> void:
	var gate := RoomFormGate.gate_node(g, plan)
	if gate < 0 or RoomFormGate.far(plan).is_empty():
		return
	var from := RoomFormGate.open_nearest(g, plan, tips, Vector2(0.5, 0.0))
	var side := 1.0 if from < 0 or g["nodes"][from]["at"].x >= 0.5 else -1.0
	var first := -1
	for gi in RoomFormGate.far(plan):
		var size := maxi(1, int(plan[gi]["size"]))
		var tip := RoomForms.branch(g, gi, size, gate, Vector2(side, -0.35), reach / (size + 0.3))
		first = tip if first < 0 else first
	if from >= 0:
		g["round"] = [from, first]


## The campus's far buildings: beside the gate, off to the side of the open building highest up, the way round from
## that building's first room to the far one's. `firsts`: each near building's first room.
static func far_buildings(g: Dictionary, plan: Array, firsts: Array) -> void:
	var gate := RoomFormGate.gate_node(g, plan)
	if gate < 0 or RoomFormGate.far(plan).is_empty():
		return
	var from := RoomFormGate.open_nearest(g, plan, firsts, Vector2(0.5, 0.0))
	var side := 1.0 if from < 0 or g["nodes"][from]["at"].x >= 0.5 else -1.0
	var a := atan2(-0.25, side)
	var first := -1
	for gi in RoomFormGate.far(plan):
		var f := RoomForms.building(g, plan, gi, gate, g["nodes"][gate]["at"] + Vector2(cos(a) * 0.3, sin(a) * 0.3), a)
		first = f if first < 0 else first
	if from >= 0:
		g["round"] = [from, first]


## The ring with a gate: the steps before it at the bottom, by the way in; from there one way round the ring the gate
## and what lies past it, the other way the near clusters, meeting at the top, where the way round joins the two ends.
## The core in the middle, joined from the far end.
static func ring(g: Dictionary, plan: Array) -> void:
	var entry := RoomForms.add(g, Vector2(0.5, 0.97), -1)
	var gi_gate := -1
	for gi in plan.size():
		gi_gate = gi if gi_gate < 0 and plan[gi].get("gate", false) else gi_gate
	var back: Array = []                          # near: the other steps before the gate, then the clusters
	var fwd: Array = []                           # the gate, then what comes after it
	var first := -1
	for gi in plan.size():
		var k := str(plan[gi]["kind"])
		if gi == gi_gate or (gi > gi_gate and (k == "step" or plan[gi].get("far", false))):
			fwd.append(gi)
		elif k == "step" and first < 0:
			first = gi
		else:
			back.append(gi)
	var each_b := RoomFormGate._rooms_of(plan, back)
	var each_f := RoomFormGate._rooms_of(plan, fwd)
	var n := 1 + each_b.size() + each_f.size()
	var hub := RoomForms.add(g, RoomFormGate._on_ring(0, n), first)
	RoomForms.join(g, entry, hub)
	var prev := hub
	for i in each_b.size():                       # round one way: the near clusters
		var nd := RoomForms.add(g, RoomFormGate._on_ring(n - 1 - i, n), each_b[i])
		RoomForms.join(g, prev, nd)
		prev = nd
	var near_end := prev
	prev = hub
	for i in each_f.size():                       # and the other: the gate and past it
		var nd := RoomForms.add(g, RoomFormGate._on_ring(1 + i, n), each_f[i])
		RoomForms.join(g, prev, nd)
		prev = nd
	if near_end != hub:
		g["round"] = [near_end, prev]
	RoomForms.core(g, prev, Vector2(0.5, 0.5), true)


## Concentric with a gate: the steps before it and the near clusters round the outer ring, from the bottom; the gate
## the inner ring's one way in, joined from the bottom of the outer, and the far clusters round the inner ring from it
## (yards where they are too few); the way round from the top of the outer ring to the top of the inner; the core in
## the middle, joined from the top of the inner.
static func concentric(g: Dictionary, plan: Array) -> void:
	var gate_gi := -1
	var outer: Array = []
	var inner: Array = []
	for gi in plan.size():
		if plan[gi].get("gate", false):
			gate_gi = gi
		elif plan[gi].get("far", false) or (gate_gi >= 0 and str(plan[gi]["kind"]) == "step"):
			inner.append(gi)
		else:
			outer.append(gi)
	var entry := RoomForms.add(g, Vector2(0.5, 0.97), -1)
	var ring := RoomForms.around(g, plan, outer, Vector2(0.43, 0.41), entry)
	if ring.size() > 2:
		g["loops"].append([ring[-1], ring[0]])
	var places: Array = [gate_gi] + RoomFormGate._rooms_of(plan, inner)
	while places.size() < 3:
		places.append(-1)
	var in_ring: Array = []
	var prev: int = ring[0] if not ring.is_empty() else entry
	var wide := minf(1.35, sqrt(places.size() / 3.0))      # an inner ring of more than three wider, room for them round the core
	for j in places.size():                       # from the bottom round, the gate first
		var a := PI / 2 + TAU * j / places.size()
		var nd := RoomForms.add(g, Vector2(0.5, 0.5) + Vector2(cos(a) * 0.2, sin(a) * 0.19) * wide, places[j])
		RoomForms.join(g, prev, nd)
		prev = nd
		in_ring.append(nd)
	var top := RoomFormGate._highest(g, in_ring.slice(1))
	var from := RoomFormGate.open_nearest(g, plan, ring, Vector2(0.5, 0.0))
	if from >= 0:
		g["round"] = [from, top]
	RoomForms.core(g, top, Vector2(0.5, 0.5), true)


## Each side of the gate (see the top of this file): "region" per node and "gate", the node of the gate; the form's
## ways round between two sides left out, and the way round checked (dropped if it does not join the near side to the
## far). Nothing for a plan with no gate and no locked cluster.
static func regions(g: Dictionary, plan: Array) -> void:
	var gate := RoomFormGate.gate_node(g, plan)
	var locked := plan.any(func(x: Dictionary) -> bool: return x.get("locked", false))
	if gate < 0 and not locked:
		return
	var region: Array = []
	region.resize(g["nodes"].size())
	region.fill(GenContext.NEAR)
	if gate >= 0:
		region[gate] = GenContext.GATE
		var todo: Array = [gate]
		while not todo.is_empty():                   # past the gate: whatever its tree hangs from it
			var at: int = todo.pop_back()
			for e in g["edges"]:
				if int(e[0]) == at and region[e[1]] == GenContext.NEAR:
					region[e[1]] = GenContext.FAR
					todo.append(e[1])
	for i in region.size():
		var gi: int = g["nodes"][i]["group"]
		if gi >= 0 and plan[gi].get("locked", false) and region[i] == GenContext.NEAR:
			region[i] = GenContext.WING
	g["region"] = region
	g["gate"] = gate
	g["loops"] = g["loops"].filter(func(lp: Array) -> bool: return region[lp[0]] == region[lp[1]])
	var rd: Array = g.get("round", [])
	if gate < 0 or rd.size() != 2 or region[rd[0]] != GenContext.NEAR or region[rd[1]] != GenContext.FAR:
		g.erase("round")


# ------------------------------------------------------------------ pieces
## One entry per room of these groups, in order: its group.
static func _rooms_of(plan: Array, groups: Array) -> Array:
	var out: Array = []
	for gi in groups:
		for k in maxi(1, int(plan[gi]["size"])) if plan[gi].get("far", false) or plan[gi].get("gate", false) else int(plan[gi]["size"]):
			out.append(gi)
	return out


## Place `i` of `n` round the ring's ellipse, from just right of the bottom.
static func _on_ring(i: int, n: int) -> Vector2:
	var a := PI / 2 - TAU * (i + 0.5) / n
	return Vector2(0.5, 0.5) + Vector2(cos(a) * 0.41, sin(a) * 0.38)


## Of `nodes`, the one highest on the map.
static func _highest(g: Dictionary, nodes: Array) -> int:
	var best: int = nodes[0]
	for n in nodes:
		if g["nodes"][n]["at"].y < g["nodes"][best]["at"].y:
			best = n
	return best
