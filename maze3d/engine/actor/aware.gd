extends Node
## ActorAware - what an actor knows of whom it is after, and what it does when it is not sure (SPEC.md 5.24; the
## awareness review, 25 Nov: "some monsters should know everything and follow relentlessly; others should lose sight
## or move to the last place they saw the player and hunt from there"). Every actor has one. Four states:
##   unaware    asleep: idle, wandering, on its beat, lounging. It knows nothing of you.
##   alerted    it heard something: it goes to look where the noise told of, looks round, and if it finds nothing goes
##              back to what it was doing.
##   hunting    in contact: it has seen you, been hurt, or been told where you are (a spawn, an alarm, a station letting
##              it out, a neighbour waking it) within the last GRACE seconds. Only now does it know where you are.
##   searching  it has lost you: it goes to the last place it knew you were and looks round there, then at places near
##              it, for `search` seconds (its beat's `give_up`, if it walks one), then gives up: back to its post or its
##              beat, asleep, and for WARY seconds it sees all round.
## A kind whose def says "relentless": true knows where you are from the moment it wakes and follows you anywhere, as
## every monster did before this.
## Noticing you from asleep, it startles (ActorStartle): a jump and a turn toward what it noticed, its feelers and
## stalks twitching, and its alert sound (wake).
class_name ActorAware

enum { UNAWARE, ALERTED, HUNTING, SEARCHING }
const NAMES := ["unaware", "alerted", "hunting", "searching"]
const GRACE := 2.5               # seconds a contact lasts after it last saw them (or was hurt, or told)
const LOOK := 3.0                # seconds it looks round each place it goes to
const SEARCH := 10.0             # seconds a search lasts, if the def says nothing
const WARY := 20.0               # seconds after giving up that it sees all round
const NEAR := 1.6                # metres: it is there
const PACE := 0.7                # of its speed, going to look
const SPREAD := 8.0              # metres round the last place that a search looks
const CHASE := 4.0               # in the GRACE after losing sight, it follows them as far as CHASE + RUN m/s from where it
const RUN := 8.0                 # last saw them: round a corner, not up a lift or through a wall
const HURT := 6.0                # seconds it counts as hurt lately
const CALL := 25.0               # metres a call carries, if the def says nothing ("call")
const CALL_GAP := 6.0            # seconds between one actor's calls

var a: Actor
var state := UNAWARE
var place := Vector3.ZERO        # where it last knew them to be (hunting), or where it was told to look
var spot := Vector3.ZERO         # where it is going now, not hunting
var relentless := false
var _since := 100.0              # seconds since the last contact
var _search := 0.0
var _look := 0.0
var _wary := 0.0
var _seen := Vector3.ZERO        # where they were at the last contact
var _there := false              # it has got to where it was sent: the search's time runs from then
var _gone := 0.0                 # seconds with nothing to go after
var _hurt := 100.0               # seconds since it was last hurt
var _called := 100.0             # seconds since it last called
var _eyes := false               # its contact is its own: it has seen them or been hurt by them since it last lost them


func setup(actor: Actor) -> void:
	a = actor
	relentless = bool(a.d.get("relentless", false))


func state_name() -> String:
	return NAMES[state]


## It knows where they are now: in contact, or a relentless kind awake.
func hunting() -> bool:
	return state == HUNTING


## Lately given up: it sees all round, not only ahead.
func wary() -> bool:
	return _wary > 0.0


## Hurt within the last HURT seconds: one that cannot reach its target, nor shoot back, gets out of its sight
## (ActorWay).
func hurt_lately() -> bool:
	return _hurt < HURT


## It wakes (ActorCore.alert): how it noticed ("saw", "hurt" by someone, "pain" from a trap or the like, "heard",
## "call", or "told": a spawn, an alarm, a station, a neighbour) and the place that told of, if any. In a station it is let out first; a lounger is caught; a thing on a
## wall comes off it; a thing powered down plays its startle clip and stands its `startle_time`. Every one startles
## (ActorStartle), makes its alert sound and wakes the others near it; woken by seeing them or being hurt, it also
## calls the others of its side (`_call`).
func wake(how: String, at: Variant) -> void:
	if a.awake or a.dead or a.off_duty:
		return
	if a.dock != null:                               # in its station: the station opens first, then switches it on
		a.dock.release()
		return
	if a.lounge and a.lounge.active():               # caught slacking
		a.lounge.caught()
	if a.surf == 1:
		a.climb.on_alert()
	var clip := false
	if a.d.has("dormant_clip") and a.stun <= 0.0:    # powering up takes a moment
		a.awake = true
		if a.play("startle"):
			clip = true
			a.stun = a.d.get("startle_time", 1.0)
			a.anim.seek(0.0)
	a.awake = true
	noticed(how, at)
	var toward: Vector3 = at if at is Vector3 else place
	ActorStartle.play(a, toward, clip)
	var cue: String = a.d.get("sounds", {}).get("alert", "")
	LM.sound(cue, a.global_position)
	Events.emit("actor.noticed", {"key": a.level.key_of(a), "how": how, "cue": cue})
	a.senses.wake_others()
	if _eyes:
		_call(place, false)


## What it knows on waking.
func noticed(how: String, at: Variant) -> void:
	_wary = 0.0
	if (how == "heard" or how == "pain") and not relentless:
		_send(ALERTED, at if at is Vector3 else a.global_position)
		return
	_since = 0.0
	state = HUNTING
	_eyes = how == "saw" or how == "hurt"
	var t := a.target()
	place = at if at is Vector3 else (t.global_position if t != null and is_instance_valid(t) else a.global_position)
	_seen = place


## It sees them (ActorSenses.look): contact. Its own, fresh (it was told, or had lost them): it calls.
func saw(at: Vector3) -> void:
	var fresh := not _eyes or state != HUNTING
	_since = 0.0
	place = at
	_seen = at
	state = HUNTING
	_eyes = true
	if fresh:
		_call(at)


## It was hurt by them: contact, as if it had seen them.
func hurt() -> void:
	_hurt = 0.0
	if a.awake:
		var fresh := not _eyes or state != HUNTING
		_since = 0.0
		state = HUNTING
		_eyes = true
		var t := a.target()
		if t != null and is_instance_valid(t):
			_seen = t.global_position
			if fresh:
				_call(_seen)


## Word from one of its own (a call: ActorSenses.hear): awake and not hunting, it knows where they are now, and hunts.
func told(about: Vector3) -> void:
	if state == HUNTING:
		return
	_since = 0.0
	place = about
	_seen = about
	state = HUNTING
	_eyes = false


## It calls the others of its faction (the awareness review's step 6, calls between monsters): a noise
## as loud as its `call` (25 m; 0, it never calls), telling where the player is, and its alert sound (unless it has just
## made it, waking). At most once in CALL_GAP seconds. One killed by the blow that woke it makes none: a kill in one
## blow stays quiet.
func _call(about: Vector3, cue := true) -> void:
	var loud: float = a.d.get("call", CALL)
	if loud <= 0.0 or _called < CALL_GAP or a.hp <= 0.0:
		return
	_called = 0.0
	if cue:
		LM.sound(a.d.get("sounds", {}).get("alert", ""), a.global_position)
	a.level.perception.noise(a.eye(), loud, "call", a, about)


## Awake and not in contact, it heard something more: it goes to look there instead.
func heard(about: Vector3) -> void:
	if state == ALERTED or state == SEARCHING:
		_send(state, about)


func _send(to: int, at: Vector3) -> void:
	state = to
	_eyes = false
	place = at
	spot = at
	_look = 0.0
	_there = false
	if to == ALERTED:
		_search = LOOK


## Every tick while it is awake (ActorCore): in contact, it knows where they are; losing them, it starts to search.
func tick(dt: float, target: Node3D) -> void:
	_wary = maxf(0.0, _wary - dt)
	_hurt += dt
	_called += dt
	_gone = 0.0
	if not a.awake or a.off_duty:
		state = UNAWARE
		return
	_since += dt
	if relentless or _since < GRACE:
		if target != null and is_instance_valid(target) and (relentless or target.global_position.distance_to(_seen) <= CHASE + RUN * _since):
			place = target.global_position           # just out of sight: it follows where they went, as far as they could run
		state = HUNTING
	elif state == HUNTING:
		_send(SEARCHING, place)
		_search = float(a.patrol.give_up) if a.patrol else float(a.d.get("search", SEARCH))
		LM.sound(a.d.get("sounds", {}).get("alert", ""), a.global_position, -8.0, 0.8)      # a lower, questioning cue
	elif state == UNAWARE:                      # woken some other way (hurt, angered): as if told where they are
		noticed("told", null)


## Nothing to go after (what it fought is dead, or gone): a patroller goes back to its beat after its `give_up`.
func no_target(dt: float) -> void:
	if not a.awake or a.patrol == null:
		_gone = 0.0
		return
	_gone += dt
	if _gone >= float(a.patrol.give_up):
		_gone = 0.0
		give_up()


## Not hunting: go to the spot and look round it; searching, then on to another spot near the last place; at the end,
## give up.
func seek(dt: float) -> void:
	if a.surf != 0 and a.climb:
		a.climb.drop()                           # off the wall to look about
		return
	var flat := Vector3(spot.x - a.global_position.x, 0, spot.z - a.global_position.z)
	if _there:
		_search -= dt                                # the time it gives counts from when it first gets there
	if not a.fixed and flat.length() > NEAR and _look <= 0.0:
		a.move.go(dt, spot, PACE)
		if a.move.roam.size() < 2 and flat.length() > a.level.C:      # no way there (a gallery only a lift reaches):
			var near: Variant = a.move.way.nearest(spot)                # it goes as near as it can, and looks from there
			if near != null and Vector2(near.x - a.global_position.x, near.z - a.global_position.z).length() > NEAR:
				spot = near
			else:
				_look = 0.01
		return
	_there = true
	_look += dt
	a.move.stand(dt)
	a.move.turn_to(flat.rotated(Vector3.UP, sin(_look * 2.2) * 1.4) if flat.length() > 0.1 else Vector3(sin(_look), 0, cos(_look)), dt, 3.0)
	if _search <= 0.0:
		give_up()
	elif _look >= LOOK and state == SEARCHING:
		spot = _near(place)
		_look = 0.0


## A place a body could stand within SPREAD of `at`, the seed's pick: where it looks next.
func _near(at: Vector3) -> Vector3:
	var nav := a.level.nav_graph
	var p := nav.point_at(at)
	if p < 0:
		return at
	var seen := {p: true}
	var ring: Array = [p]
	var out: Array = []
	for step in 3:
		var next: Array = []
		for q in ring:
			for n in nav.astar.get_point_connections(q):
				if not seen.has(n) and not nav.astar.is_point_disabled(n):
					seen[n] = true
					next.append(n)
					if nav.astar.get_point_position(n).distance_to(at) < SPREAD:
						out.append(n)
		ring = next
	if out.is_empty():
		return at
	return nav.astar.get_point_position(out[a.rng.randi() % out.size()])


## The search is over: back to its post (its beat, if it walks one), asleep, warier.
func give_up() -> void:
	state = UNAWARE
	_eyes = false
	_wary = WARY
	_since = 100.0
	if a.attacks:
		a.attacks.drop_attack()
	if a.patrol:
		a.patrol.back_to_beat()
	else:
		a.awake = false
		a.senses.reset()
	Events.emit("actor.gave_up", {"key": a.level.key_of(a)})
