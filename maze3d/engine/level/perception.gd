extends RefCounted
## LevelPerception - what can be seen, and shot, in this level: the one place every actor asks (the awareness review,
## 25 Nov: "sight tests collision, not what is drawn"). Sight stops at what blocks it as it is drawn: walls, floors,
## shut doors, solid furniture (the solid layer). It goes through glass and railings, which are on the glass layer: they
## stop bodies and shots, not sight. A target is looked for at three points down its body, so a railing or a desk that
## hides only part of it does not hide it all: its head, its chest, its hips. And what can be heard: a noise carries
## through the level's air (below).
class_name LevelPerception

const POINTS := [0.8, 1.0, 0.5]     # chest, head, hips: fractions of the target's top (a shot prefers them in this order)

var level: Level


func _init(lv: Level) -> void:
	level = lv


## How high a target's top is above its origin: the player's eye, an actor's height, a dummy's 1.6 m.
static func top(target: Node3D) -> float:
	if target is Player:
		return Player.EYE
	if target is Actor:
		return float((target as Actor).d.get("height", 1.6)) * 0.95
	return 1.6


## The heights above a target's origin that sight and shots look for, best first.
static func heights(target: Node3D) -> Array:
	var t := top(target)
	return POINTS.map(func(f: float) -> float: return t * f)


## Can something with its eye at `eye` see `target`: is any of its points in a clear line on the sight layer?
func sees(eye: Vector3, target: Node3D) -> bool:
	return aim(eye, target, false) >= 0.0


## The height above `target`'s origin that a shot from `from` can reach (nothing that stops a shot in the way: glass and
## railings do), the best of its points; -1 if none.
func shot_height(from: Vector3, target: Node3D) -> float:
	return aim(from, target, true)


## The first of `target`'s heights in a clear line from `from`: on the sight layer, or, `shot`, through everything that
## stops a shot as well. -1 if none is.
func aim(from: Vector3, target: Node3D, shot: bool) -> float:
	var space := level.get_world_3d().direct_space_state
	var mask := 1 | (Level.GLASS if shot else 0)
	for h in heights(target):
		var q := PhysicsRayQueryParameters3D.create(from, target.global_position + Vector3(0, h, 0), mask)
		if space.intersect_ray(q).is_empty():
			return h
	return -1.0


# ------------------------------------------------------------------ hearing
## Sound carries through the level's air, not through its floor numbers (the awareness review: "sound follows the
## map's floor number, not the air"). Across open air, in a clear line, it goes as far as the straight line. Otherwise
## it goes the way air goes: along every way a body could walk (doorways, ramps, balconies), from a balcony down into
## the hall under it, up and down lift shafts and pits; a shut door muffles it by MUFFLE metres; or, failing all that,
## through the walls, at WALL times the straight line. A noise is heard by an actor it reaches within its loudness,
## scaled by the actor's own `hearing` (HEARING is an ordinary ear).
const HEARING := 18.0            # metres: an ordinary ear's `hearing`; a def's own scales what it hears to this
const MUFFLE := 10.0             # metres a shut door adds
const WALL := 3.0                # how much further a noise seems through solid walls than across open air
const EXPLOSION := 60.0          # metres an explosion carries
const FRESH := 500               # ms: a noise from the same place this soon after another reuses where it spread

var _links: Dictionary = {}      # nav point -> other nav points sound reaches as well as by walking (air, lifts, pits)
var _spread_cache: Dictionary = {}


## A noise at `at`, `loud` metres loud, of a `kind` ("gunfire", "explosion", "call"): every actor it reaches is told
## (Actor.hear). `by` made it (it does not hear itself, and a call is heeded only by its own faction); `about` is the
## place it tells of (where the noise is, unless it carries word of somewhere else: a call tells where the player is).
func noise(at: Vector3, loud: float, kind: String, by: Node = null, about: Variant = null) -> void:
	if loud <= 0.0:
		return
	var most := loud
	for a in level.actors:
		if is_instance_valid(a) and not a.dead:
			most = maxf(most, loud * ear(a))
	for a in level.actors.duplicate():
		if not is_instance_valid(a) or a.dead or a == by:
			continue
		var reach := loud * ear(a)
		if carried(at, a.eye(), reach, most, kind != "call") <= reach:      # a call is word: it must come by the air
			a.hear(at, kind, about if about != null else at, by)


## How keen an actor's ears are against an ordinary one's (its def's `hearing` over HEARING).
static func ear(a: Node) -> float:
	return float(a.d.get("hearing", HEARING)) / HEARING


## How far a noise at `from` seems by the time it reaches `to`, in metres, as far as `reach` (INF beyond it). `spread`
## is how far to follow the air when there is no clear line (at least `reach`). `walls`: it may also come through solid
## walls and floors, muffled (a shot, a blast); a call's words do not.
func carried(from: Vector3, to: Vector3, reach: float, spread := 0.0, walls := true) -> float:
	var straight := from.distance_to(to)
	if straight > reach:
		return INF
	if level.los(from, to):
		return straight
	var best := straight * WALL if walls else INF
	var nav := level.nav_graph
	var e := nav.point_at(to)
	var dist := _spread(from, maxf(reach, spread))
	if e >= 0 and dist.has(e):
		best = minf(best, float(dist[e]) + to.distance_to(nav.astar.get_point_position(e)))
	return best if best <= reach else INF


## How far a noise at `from` has come by each nav point it reaches within `reach`: nav point -> metres. Dijkstra over
## the walking graph and the links only sound takes.
func _spread(from: Vector3, reach: float) -> Dictionary:
	var nav := level.nav_graph
	var s := nav.point_at(from)
	if s < 0:
		if nav.astar.get_point_count() == 0:
			return {}
		s = nav.astar.get_closest_point(from, true)
	var now := Debug.now_msec()
	if _spread_cache.get("src", -1) == s and float(_spread_cache.get("reach", 0.0)) >= reach and now - int(_spread_cache.get("t", 0)) < FRESH:
		return _spread_cache["dist"]
	if _links.is_empty():
		_links = _sound_links()
	var start := from.distance_to(nav.astar.get_point_position(s))
	var dist := {s: start}
	var heap: Array = [[start, s]]
	while not heap.is_empty():
		var top: Array = _pop(heap)
		var d0: float = top[0]
		var id: int = top[1]
		if d0 > float(dist.get(id, INF)):
			continue
		var p0 := nav.astar.get_point_position(id)
		for n in Array(nav.astar.get_point_connections(id)) + _links.get(id, []):
			var nd: float = d0 + p0.distance_to(nav.astar.get_point_position(n)) + (MUFFLE if _shut(n) else 0.0)
			if nd <= reach and nd < float(dist.get(n, INF)):
				dist[n] = nd
				_push(heap, [nd, n])
	_spread_cache = {"src": s, "reach": reach, "t": now, "dist": dist}
	return dist


## The ways sound goes that nobody walks: from a balcony down into the air of the hall under it (to the floor of its
## own cell, and of each cell beside it that has no balcony at that height), both ways; and both ways along every lift
## and pit (a body only goes down a pit).
func _sound_links() -> Dictionary:
	var nav := level.nav_graph
	var out: Dictionary = {}
	var link := func(a: int, b: int) -> void:
		if a >= 0 and b >= 0 and a != b:
			if not out.has(a):
				out[a] = []
			if not out.has(b):
				out[b] = []
			out[a].append(b)
			out[b].append(a)
	for id in nav.astar.get_point_ids():
		var w: Array = nav.where(id)
		if w.is_empty() or w[3] < 1 or w[3] > 2:
			continue
		var c := Vector2i(w[0], w[1])
		link.call(id, nav.point_id(c, 0, w[2]))
		for d in LevelData.DIRS:
			var n2: Vector2i = c + d
			if not level.ld.cell(n2.x, n2.y, w[2])["decks"].has(w[3]):
				link.call(id, nav.point_id(n2, 0, w[2]))
	for pr in nav.hop_pairs():
		link.call(pr[0], pr[1])
	return out


## A nav point on the floor of a door cell whose door is shut.
func _shut(id: int) -> bool:
	var w: Array = level.nav_graph.where(id)
	if w.is_empty() or w[3] != 0:
		return false
	var dr: Variant = level.doors.get(Vector2i(w[0], w[1])) if w[2] == 0 else level.doors_up.get(Vector3i(w[0], w[1], w[2]))
	return dr != null and is_instance_valid(dr) and not dr.is_passable()


## A binary heap of [metres, nav point], least first.
static func _push(heap: Array, item: Array) -> void:
	heap.append(item)
	var i := heap.size() - 1
	while i > 0:
		var up := (i - 1) / 2
		if heap[up][0] <= heap[i][0]:
			break
		var t: Array = heap[up]
		heap[up] = heap[i]
		heap[i] = t
		i = up


static func _pop(heap: Array) -> Array:
	var top: Array = heap[0]
	var last: Array = heap.pop_back()
	if heap.is_empty():
		return top
	heap[0] = last
	var i := 0
	while true:
		var l := i * 2 + 1
		var r := l + 1
		var m := i
		if l < heap.size() and heap[l][0] < heap[m][0]:
			m = l
		if r < heap.size() and heap[r][0] < heap[m][0]:
			m = r
		if m == i:
			break
		var t: Array = heap[m]
		heap[m] = heap[i]
		heap[i] = t
		i = m
	return top
