extends Node
## ActorWary - a flyer or a wall-climber keeps out of a trap that would hurt it (a walker does not see one coming).
## Before it moves it looks a little way ahead, and asks the level's traps (Level.hazard) whether its body would be
## hurt there now, or before it could be through (a flyer works that out from its size and speed; a climber allows
## LEAD). A hunting flyer then rises over the trap, or sinks under it, when the room has the height, holding back
## until it is there; when no height clears it, it goes round by a clear way to one side, if there is one, and
## otherwise holds back until the trap goes off. A wandering flyer turns away. A climber holds still on its wall or ceiling until the way is
## clear (on a wall, after a while it turns back), and does not let go over a trap. Inside one already with no clear
## way out, it keeps going: that is the quickest way through. A trap that spares it ("ignore") is no obstacle. Added for "fly" and "climb".
class_name ActorWary

const LOOK := 1.2           # metres it looks ahead, past its own radius
const LEAD := 0.8           # seconds: a beam that comes on before a climber would be through counts as on
const STEP := 0.15          # metres between the heights a flyer tries
const TRIES := 20           # heights tried each way: up to 3 m above and below
const GIVE_UP := 4.0        # seconds a climber waits on a wall before it turns back
const DEEPEST := 0.8        # metres a flyer's origin may go under the floor (see _fits)
var a: Actor
var d: Dictionary
var lift := 0.0             # a hunting flyer: how far above the floor under it it is keeping, to clear a trap
var _wait_t := 0.0


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


## A hunting flyer about to move, its way already in its velocity. Sets `lift` (the height it keeps over the floor,
## ActorLocomotion._hover_vy) and stops it short when it must wait or rise first.
func fly() -> void:
	var pos := a.global_position
	var hv := Vector3(a.velocity.x, 0, a.velocity.z)
	if hv.length() < 0.1:
		return
	var reach := LOOK + float(d.get("radius", 0.5))
	var lead := _lead()
	var dir := hv.normalized()
	var ground: float = a.level.floor_y(pos)
	if _way_clear(pos, dir, reach, lead):
		var low := Vector3(pos.x, ground, pos.z)
		if lift != 0.0 and not a.level.hazard(a, low, lead) and _way_clear(low, dir, reach, lead):
			lift = 0.0                          # past it, and its usual height is clear here and ahead: back down
		return
	var dy := _clear_height(pos, dir, reach, lead)
	if not is_nan(dy):
		lift = pos.y + dy - ground
		if absf(dy) > 0.05:
			_hold()                             # up (or down) first, then across
		return
	for ang in [PI / 4, -PI / 4, PI / 2, -PI / 2]:          # no height clears it: round it, if a way to one side is clear
		var side: Vector3 = dir.rotated(Vector3.UP, ang)
		if _open(pos + side * reach) and _way_clear(pos, side, reach, lead):
			a.velocity.x = side.x * hv.length()
			a.velocity.z = side.z * hv.length()
			return
	if not a.level.hazard(a, pos):
		_hold()                                 # no way round: wait for it to go off
	# (in it already, with no clear way out: it keeps going, the quickest way through)


## No trap would hurt it anywhere along `dist` metres that way from `from`, looked at a quarter of a metre on and then
## every half metre (a way that only ends clear of a trap can still cut across its corner).
func _way_clear(from: Vector3, dir: Vector3, dist: float, lead: float) -> bool:
	var at := 0.25
	while at < dist + 0.25:
		if a.level.hazard(a, from + dir * minf(at, dist), lead):
			return false
		at += 0.5
	return true


## How long it would take to get through a trap from where it first sees it: past the look ahead, its own width and
## the trap's, at its speed. A beam that comes on sooner than that counts as on.
func _lead() -> float:
	var r: float = d.get("radius", 0.5)
	return maxf(0.3, (LOOK + 3.0 * r + 0.6) / maxf(1.0, float(d.get("speed", 4.0))))


## Open air at that spot on its storey: not inside a wall.
func _open(at: Vector3) -> bool:
	var c := a.level.cell_of(at)
	return not a.level.air(c.x, c.y, a.move.storey())["solid"]


## A wandering flyer: would going this way take it into a trap?
func blocked(dir: Vector3) -> bool:
	if dir.length() < 0.01 or a.level.hazard(a, a.global_position):
		return false
	return a.level.hazard(a, a.global_position + dir.normalized() * (LOOK + float(d.get("radius", 0.5))), _lead())


## A climber about to move on its wall or ceiling to `to`: is the way clear? (Already in a trap: yes, on and out.)
func way_clear(to: Vector3) -> bool:
	return a.level.hazard(a, a.global_position) or not a.level.hazard(a, to, LEAD)


## A climber about to let go: would it land in a trap, on its feet on the floor below?
func safe_landing() -> bool:
	var pos := a.global_position
	return not a.level.hazard(a, Vector3(pos.x, a.base_y, pos.z), LEAD, true)


## A climber waiting: counts the wait, and says when it has waited long enough to turn back (then counts again).
func waited_out(dt: float) -> bool:
	_wait_t += dt
	if _wait_t < GIVE_UP:
		return false
	_wait_t = 0.0
	return true


func _hold() -> void:
	a.velocity.x = 0.0
	a.velocity.z = 0.0


## The smallest change of height (up or down, STEP at a time) at which its body would be clear of every trap where it
## is and all the way ahead, and would fit between the floor and the ceiling at both ends; NAN if there is none.
func _clear_height(pos: Vector3, dir: Vector3, dist: float, lead: float) -> float:
	var ahead := pos + dir * dist
	for i in range(1, TRIES + 1):
		for sgn in [1.0, -1.0]:
			var dy: float = sgn * i * STEP
			var at := Vector3(pos.x, pos.y + dy, pos.z)
			if _fits(pos, at.y) and _fits(ahead, at.y) and not a.level.hazard(a, at, lead) and _way_clear(at, dir, dist, lead):
				return dy
	return NAN


## Would its body, with its origin at height y over `at`, be clear of the floor and the ceiling there? Its origin
## also stays less than DEEPEST under the floor, however small the body riding above it: which storey a thing is on is
## told from its origin (a storey's band starts 0.9 below its floor), so a drone that ducked any lower to pass under a
## beam would count as on the storey below.
func _fits(at: Vector3, y: float) -> bool:
	var cap := a.cs.shape as CapsuleShape3D
	var mid: float = a.cs.global_position.y - a.global_position.y + y
	var half: float = cap.height / 2.0 if cap else float(d.get("height", 1.6)) / 2.0
	var c := a.level.cell_of(at)
	var top: float = a.level.ceiling_y(c.x, c.y, a.move.storey())
	var ground: float = a.level.floor_y(Vector3(at.x, a.global_position.y, at.z))
	return mid - half > ground + 0.05 and mid + half < top - 0.1 and y > ground - DEEPEST
