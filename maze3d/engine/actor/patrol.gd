extends Node
## ActorPatrol - walking a beat (SPEC.md 5.20). Added when the actor's entry has "patrol": the cells of its route in
## order, on its own storey, or the name of a tag whose cells they are, or with the details:
##   "patrol": [[3, 4], [12, 4], [12, 9]]
##   "patrol": {"route": "beat_a", "pause": 1.5, "give_up": 10}
## Not hunting, it walks from point to point at a walk, waits `pause` seconds at each, and goes round again. It sees
## and hears as any monster does, and wakes to fight. When it loses what it was after it searches for `give_up` seconds
## (ActorAware), then breaks off and goes back to its beat, from the point nearest where it is, until it notices
## something again.
class_name ActorPatrol

const PACE := 0.45                # of its speed: a walk, not a chase
const NEAR := 0.6                 # metres: at the point

var a: Actor
var route: Array[Vector3] = []
var pause := 1.5
var give_up := 10.0
var at := -1                      # the point it is making for (-1: not chosen yet; it has not been placed at setup)
var _wait := 0.0


func setup(actor: Actor) -> void:
	a = actor
	var p: Variant = actor.e.get("patrol", [])
	var spec: Dictionary = p if p is Dictionary else {"route": p}
	pause = float(spec.get("pause", 1.5))
	give_up = float(spec.get("give_up", 10.0))
	var cells: Variant = spec.get("route", [])
	if cells is String:
		cells = actor.level.tags.get(cells, [])
	var storey := int(actor.e.get("level", 0))
	for c in cells:
		var cell: Vector2i = c if c is Vector2i else Vector2i(int(c[0]), int(c[1]))
		route.append(actor.level.center(cell, storey * actor.level.H))
	if route.is_empty():
		push_warning("Actor %s: a patrol with no route" % actor.level.key_of(actor))


## The point of the route nearest where it is.
func nearest() -> int:
	var best := 0
	for i in route.size():
		if route[i].distance_to(a.global_position) < route[best].distance_to(a.global_position):
			best = i
	return best


## Not hunting: on along the beat (ActorLocomotion.idle_tick asks).
func tick(dt: float) -> void:
	if route.is_empty():
		a.move.wander_tick(dt)
		return
	if at < 0:
		at = nearest()
	var dest: Vector3 = route[at]
	if Vector2(dest.x - a.global_position.x, dest.z - a.global_position.z).length() < NEAR:
		a.move.stand(dt)
		_wait -= dt
		if _wait <= 0.0:
			at = (at + 1) % route.size()
			_wait = pause
		return
	a.move.go(dt, dest, PACE)


## Break off: it goes back to its beat from the nearest point, and wakes again when it next sees something.
func back_to_beat() -> void:
	a.awake = false
	a.senses.reset()
	at = nearest()
	_wait = 0.0
