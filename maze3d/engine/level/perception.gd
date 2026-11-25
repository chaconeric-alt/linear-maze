extends RefCounted
## LevelPerception - what can be seen, and shot, in this level: the one place every actor asks (the awareness review,
## 25 Nov: "sight tests collision, not what is drawn"). Sight stops at what blocks it as it is drawn: walls, floors,
## shut doors, solid furniture (the solid layer). It goes through glass and railings, which are on the glass layer: they
## stop bodies and shots, not sight. A target is looked for at three points down its body, so a railing or a desk that
## hides only part of it does not hide it all: its head, its chest, its hips.
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
