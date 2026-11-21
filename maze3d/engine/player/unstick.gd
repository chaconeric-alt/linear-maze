extends Node
## PlayerUnstick - getting out of a place the player cannot move out of (Eric, 21 Nov): wedged between furniture, a
## body and a wall, or shut in where neither stepping nor jumping gets them out. It keeps a short trail of the places
## they stood free, a step apart. When every way is blocked (eight ways across the floor, and a jump: up a metre and
## across from there) for a second, they are put back at the latest of those places that has room for them, and told.
## Only the level blocks a way (walls, floors, furniture, doors, glass), not monsters: being cornered by one is a fight.
class_name PlayerUnstick

const STEP := 0.75          # metres between the places kept
const KEEP := 8             # how many are kept
const PROBE := 0.15         # how far each way is tried
const JUMP_UP := 1.0        # how high a jump is tried (a jump rises about 1.3 m)
const WAIT := 1.0           # seconds boxed in before they are moved
const EVERY := 0.2          # seconds between looks
const ACTORS := 4           # monsters' collision layer (ActorCore): left out of the looking

signal freed(from: Vector3, to: Vector3)

var pl: Player
var trail: Array[Vector3] = []   # where they stood free, oldest first
var boxed_for := 0.0
var _t := 0.0
var _probe: CapsuleShape3D       # the body 2 cm thinner and lifted off the floor: resting against a wall or standing on a floor is not being blocked


func setup(player: Player) -> void:
	pl = player
	var cap := pl.shape.shape as CapsuleShape3D
	_probe = CapsuleShape3D.new()
	_probe.radius = cap.radius - 0.02
	_probe.height = cap.height - 0.1


## Every physics frame. `free`: not frozen and not held (something else decides where they are then).
func step(dt: float, free: bool) -> void:
	_t -= dt
	if _t > 0.0:
		return
	_t = EVERY
	if not free or pl.dead or pl.movement.dashing():
		boxed_for = 0.0
		return
	if boxed_in():
		boxed_for += EVERY
		if boxed_for >= WAIT:
			free_up()
		return
	boxed_for = 0.0
	if pl.is_on_floor() and (trail.is_empty() or pl.global_position.distance_to(trail.back()) >= STEP):
		trail.append(pl.global_position)
		if trail.size() > KEEP:
			trail.pop_front()


## No way out: no way across the floor, and no jump that clears whatever is round them.
func boxed_in() -> bool:
	var at := pl.global_position
	if _any_way(at):
		return false
	var up := Vector3(0, JUMP_UP, 0)
	if not _clear(at, up):
		return true                              # something over them: no jumping out
	return not _any_way(at + up)


## Back where they stood a step before: the latest place kept that is a step away and has room for them (with none,
## where the level starts them).
func free_up() -> void:
	boxed_for = 0.0
	var from := pl.global_position
	var to := Vector3.INF
	for i in range(trail.size() - 1, -1, -1):
		if trail[i].distance_to(from) >= STEP * 0.5 and fits(trail[i]):
			to = trail[i]
			trail.resize(i + 1)
			break
	if to == Vector3.INF:
		to = pl.level.center(pl.level.start_cell, 0.05 + pl.level.start_level * pl.level.H)
		trail.clear()
	pl.global_position = to
	pl.velocity = Vector3.ZERO
	Game.say(str(LM.game.get("words", {}).get("unstuck", "You get yourself free.")), "info")
	freed.emit(from, to)
	Events.emit("player.freed", {"from": [from.x, from.y, from.z], "to": [to.x, to.y, to.z]})


## The player's body would stand there without touching anything.
func fits(at: Vector3) -> bool:
	var q := PhysicsShapeQueryParameters3D.new()
	q.shape = pl.shape.shape
	q.transform = Transform3D(Basis(), at + pl.shape.position)
	q.collision_mask = pl.collision_mask
	q.exclude = [pl.get_rid()]
	q.margin = 0.01
	return pl.get_world_3d().direct_space_state.intersect_shape(q, 1).is_empty()


func _any_way(at: Vector3) -> bool:
	for i in 8:
		var a := TAU * i / 8.0
		if _clear(at, Vector3(cos(a), 0.0, sin(a)) * PROBE):
			return true
	return false


## The body could move that far from there, as far as the level is concerned.
func _clear(at: Vector3, motion: Vector3) -> bool:
	var q := PhysicsShapeQueryParameters3D.new()
	q.shape = _probe
	q.transform = Transform3D(Basis(), at + pl.shape.position + Vector3(0, 0.05, 0))
	q.motion = motion
	q.collision_mask = pl.collision_mask & ~ACTORS
	q.exclude = [pl.get_rid()]
	return pl.get_world_3d().direct_space_state.cast_motion(q)[0] >= 1.0
