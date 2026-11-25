extends RefCounted
## ActorWay - which way a hunter wants to go (ActorLocomotion.hunt): away (hurt enough to flee); round its target at a
## distance (a skirmisher with a shot); through the air (a flyer, its target on a floor above it in sight: over the
## railing, not round by the ramp); straight at it (close, in a clear line, on its level); along its route. Or, when
## walking cannot reach it (the awareness review, 25 Nov: "no walking route means no behaviour"), somewhere useful:
## every RETHINK seconds it looks over the places it can walk to (at most PLACES of them). One that shoots goes to the
## nearest with a clear shot within its range and stays there firing; one hurt lately that cannot shoot back goes to the
## nearest out of its target's sight; any other goes to the place nearest its target (under the balcony, at the foot of
## the lift) and waits there, facing it.
class_name ActorWay

const RETHINK := 1.5               # seconds between looks for somewhere to go
const PLACES := 400                # places a look goes over, at most
const SHOTS := 16                  # places tried for a clear shot, nearest first
const AIR := 12.0                  # metres: a flyer goes through the air to a target this near on a floor above it
const CLEAR := 1.4                 # metres over the target's floor the underside of a flyer's body rises to: over a
                                   # railing (1.12 m, LevelBuilder), with room to spare
const THERE := 0.6                 # metres: it has got there
const ROOM := 0.7                  # metres round a place that a clear shot must hold over: wherever it stops in it

var a: Actor
var d: Dictionary
var _fled := false
var _strafe := 1.0
var _strafe_t := 0.0
var _cut_off := false              # the last route to its target came back empty
var _t := 0.0
var _spot: Variant = null          # where it goes with no route (Vector3), or null
var _route: PackedVector3Array = PackedVector3Array()
var _hurt := false                 # hurt lately, at the last look: hurt now, it looks again at once


func _init(actor: Actor) -> void:
	a = actor
	d = actor.d


## The way it wants to go after `pl` (flat: from it to them, level; dist: how far, level).
func want(dt: float, pl: Node3D, flat: Vector3, dist: float) -> Vector3:
	var mv: ActorLocomotion = a.move
	var see: bool = a.senses.see
	var clear: bool = a.senses.shot                 # nothing in the way, a railing or glass included
	if mv.fleeing():
		if not _fled:
			_fled = true
			if d.has("flee_text"):
				Game.say(d["flee_text"], "warn")
		return -flat.normalized() if see else Vector3.ZERO
	if d.get("behavior", "chaser") == "skirmisher" and clear and not _cut_off:     # its distance, while it has a shot
		var keep: Array = d.get("keep", [6.0, 12.0])
		_strafe_t -= dt
		if _strafe_t <= 0.0:
			_strafe_t = a.rng.randf_range(1.0, 2.6)
			_strafe = -_strafe if a.rng.randf() < 0.6 else _strafe
		var side := flat.normalized().cross(Vector3.UP) * _strafe
		if dist < keep[0]:
			return -flat.normalized() + side * 0.5
		elif dist > keep[1]:
			return flat.normalized() + side * 0.3
		return side
	if air_height(pl) > -INF:                        # up through the air of a tall hall: it rises clear first
		return Vector3.ZERO if _deck_ahead(flat, pl) else flat.normalized()
	# Close, in a clear line and on its level: straight at them. Above or below them (a balcony over their head), or
	# behind a railing or glass, straight at them is nowhere: it takes the route down (or up) like anything out of sight.
	if clear and dist < 7.0 and absf(pl.global_position.y - a.global_position.y) < ActorLocomotion.LEVEL_GAP:
		return flat.normalized() if dist > d.get("radius", 0.5) + 0.9 else Vector3.ZERO
	mv.path_t -= dt
	if mv.path_t <= 0.0:
		mv.path_t = 0.45
		mv.path = a.level.path(a.global_position, pl.global_position)
		_cut_off = mv.path.size() < 2
		if not _cut_off:
			_t = 0.0                                 # cut off again later: it looks round afresh
	if mv.path.size() > 1:
		return _along(mv.path)
	return _no_route(dt, pl, flat)


## The height a flyer holds going through the air to `pl`, on a floor above the one under it, in sight and near:
## its body's underside CLEAR over their floor. -INF if it is not doing that (it keeps over the floor under it).
func air_height(pl: Node3D) -> float:
	if not a.move.fly or pl == null or not is_instance_valid(pl) or not a.senses.see:
		return -INF
	var to := Vector2(pl.global_position.x - a.global_position.x, pl.global_position.z - a.global_position.z)
	var theirs: float = a.level.floor_y(pl.global_position + Vector3(0, 0.2, 0))
	if to.length() > AIR or theirs < a.level.floor_y(a.global_position) + 1.0:
		return -INF
	var r: float = d.get("radius", 0.5)
	var hgt: float = d.get("height", 1.6)
	return theirs + maxf(0.0, CLEAR - (d.get("center", hgt / 2.0) - maxf(hgt, r * 2.0) / 2.0))


## Rising through the air, and the floor ahead (a deck at their height) not yet under it: it holds off the edge until it
## is high enough, rather than going in under the deck and pressing on its underside.
func _deck_ahead(flat: Vector3, pl: Node3D) -> bool:
	var goal := air_height(pl)
	if a.global_position.y > goal - 0.3:
		return false
	var ahead: Vector3 = a.global_position + flat.normalized() * (d.get("radius", 0.5) + 0.8)
	var theirs: float = a.level.floor_y(pl.global_position + Vector3(0, 0.2, 0))
	return a.level.floor_y(Vector3(ahead.x, theirs + 0.2, ahead.z)) > theirs - 0.5


## The way along a route: to its next point, dropping those it has reached.
func _along(route: PackedVector3Array) -> Vector3:
	var next := route[1]
	if Vector2(next.x - a.global_position.x, next.z - a.global_position.z).length() < 1.0 and route.size() > 2:
		route.remove_at(1)
		next = route[1]
	return Vector3(next.x - a.global_position.x, 0, next.z - a.global_position.z).normalized()


## No walking route to its target: go somewhere useful; with nowhere, straight at it if it is in sight.
func _no_route(dt: float, pl: Node3D, flat: Vector3) -> Vector3:
	_t -= dt
	if a.aware.hurt_lately() != _hurt:
		_hurt = not _hurt
		_t = 0.0
	if _t <= 0.0:
		_t = RETHINK
		_spot = _choose(pl)
		_route = a.level.path(a.global_position, _spot) if _spot != null else PackedVector3Array()
	if _spot == null:
		return flat.normalized() if a.senses.see else Vector3.ZERO
	var to: Vector3 = _spot - a.global_position
	if Vector2(to.x, to.z).length() < THERE:
		return Vector3.ZERO                          # there: it waits, facing them (ActorLocomotion.hunt)
	if _route.size() > 1:
		return _along(_route)
	return Vector3(to.x, 0, to.z).normalized()


## Where to go with no route to `pl`: the nearest place with a clear shot (it shoots), the nearest out of its sight
## (hurt lately, and it cannot shoot back), or the place nearest it. Null if it can walk nowhere.
func _choose(pl: Node3D) -> Variant:
	var places := _walkable()
	if places.is_empty():
		return null
	var here := a.global_position
	var eye: Vector3 = a.eye() - here
	var reach := minf(_shooting_range(), d.get("sight", 24.0))          # it must see them to fire
	var per: LevelPerception = a.level.perception
	places.sort_custom(func(p: Vector3, q: Vector3) -> bool: return p.distance_squared_to(here) < q.distance_squared_to(here))
	if reach > 0.0:
		var tried := 0
		for p in places:
			if Vector2(p.x - pl.global_position.x, p.z - pl.global_position.z).length() > reach * 0.9:
				continue
			tried += 1
			if _shoots_from(p + eye, pl, per):
				return p
			if tried >= SHOTS:
				break
	elif a.aware.hurt_lately():
		var theirs: Vector3 = pl.global_position + Vector3(0, LevelPerception.top(pl), 0)
		if not a.level.los(theirs, here + eye):
			return here                              # out of their sight already: it stays
		for p in places:
			if not a.level.los(theirs, p + eye):
				return p
	return _nearest(places, pl.global_position)


## The place it can walk to that is nearest `to` (a search's spot it has no route to: ActorAware.seek), or null.
func nearest(to: Vector3) -> Variant:
	var places := _walkable()
	return null if places.is_empty() else _nearest(places, to)


static func _nearest(places: Array, to: Vector3) -> Vector3:
	var best: Vector3 = places[0]
	for p in places:
		if p.distance_squared_to(to) < best.distance_squared_to(to):
			best = p
	return best


## A clear shot at `pl` from `eye` and from ROOM round it: not a place where the line only just clears a railing.
static func _shoots_from(eye: Vector3, pl: Node3D, per: LevelPerception) -> bool:
	for off in [Vector3.ZERO, Vector3(ROOM, 0, 0), Vector3(-ROOM, 0, 0), Vector3(0, 0, ROOM), Vector3(0, 0, -ROOM)]:
		if per.shot_height(eye + off, pl) < 0.0:
			return false
	return true


## The places it can walk to from where it stands (no lift, no pit), nearer first by steps, at most PLACES.
func _walkable() -> Array:
	var nav: LevelNav = a.level.nav_graph
	var s := nav.point_at(a.global_position)
	if s < 0:
		return []
	var seen := {s: true}
	var ring: Array = [s]
	var out: Array = [nav.astar.get_point_position(s)]
	while not ring.is_empty() and out.size() < PLACES:
		var next: Array = []
		for q in ring:
			for n in nav.astar.get_point_connections(q):
				if seen.has(n) or nav.astar.is_point_disabled(n):
					continue
				seen[n] = true
				next.append(n)
				out.append(nav.astar.get_point_position(n))
		ring = next
	return out


## How far its longest ranged attack reaches; 0 if it has none.
func _shooting_range() -> float:
	var r := 0.0
	for at in d.get("attacks", []):
		if str(at.get("type", "melee")) == "ranged":
			r = maxf(r, float(at.get("range", 20.0)))
	return r
