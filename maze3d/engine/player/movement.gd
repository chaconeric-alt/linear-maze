extends Node
## PlayerMovement - how the body moves: walking (slower in sniper mode and in water), the dash, jumping, gravity,
## standing still while something holds you, falling when dead, and footsteps. The config tunes it:
##   "speed": 8.5, "jump": 7.6, "dash_cooldown": 0.85, "zoom_speed": 0.22 (fraction of speed when zoomed in).
class_name PlayerMovement

const GRAVITY := 22.0
const DASH_SPEED := 24.0
const DASH_TIME := 0.17
var pl: Player
var cfg: Dictionary
var bob := 0.0                    # the walking cycle: the camera and the gun in hand bob with it
var _dash_t := 0.0
var _dash_cool := 0.0
var _dash_dir := Vector3.ZERO
var _step := 0.0


func setup(player: Player) -> void:
	pl = player
	cfg = player.cfg


## In the middle of a dash (you cannot be hurt by anything but a blast, and cannot zoom).
func dashing() -> bool:
	return _dash_t > 0.0


## One frame of moving. inp is the move keys (x: right, y: back); free is false when frozen or held.
func step(dt: float, inp: Vector2, free: bool, held: bool) -> void:
	var dir := (pl.global_transform.basis * Vector3(inp.x, 0, inp.y))
	dir.y = 0
	dir = dir.normalized()
	var speed: float = cfg.get("speed", 8.5)
	speed *= lerpf(1.0, cfg.get("zoom_speed", 0.22), pl.zoom)
	if pl.level and pl.level.fluid_at(pl.global_position):      # wading
		speed *= 0.62
	_dash_cool -= dt
	if free and pl.controls.dash_pressed() and _dash_cool <= 0.0:
		_dash_dir = dir if dir != Vector3.ZERO else -pl.global_transform.basis.z
		_dash_t = DASH_TIME
		_dash_cool = cfg.get("dash_cooldown", 0.85)
		LM.sound("dash")
	if _dash_t > 0.0:
		_dash_t -= dt
		pl.velocity.x = _dash_dir.x * DASH_SPEED
		pl.velocity.z = _dash_dir.z * DASH_SPEED
	else:
		var acc := 70.0 if pl.is_on_floor() else 22.0
		pl.velocity.x = move_toward(pl.velocity.x, dir.x * speed, acc * dt)
		pl.velocity.z = move_toward(pl.velocity.z, dir.z * speed, acc * dt)
	if pl.is_on_floor():
		if free and pl.controls.jump_pressed():
			pl.velocity.y = cfg.get("jump", 7.6)
	else:
		pl.velocity.y -= GRAVITY * dt
	if held:
		pl.velocity = Vector3.ZERO
	pl.move_and_slide()
	_footsteps(dt)


func _footsteps(dt: float) -> void:
	var hs := Vector2(pl.velocity.x, pl.velocity.z).length()
	if pl.is_on_floor() and hs > 1.0:
		bob += dt * hs * 1.5
		_step += dt * hs
		if _step > 3.2:
			_step = 0.0
			LM.sound("step", null, -14.0, randf_range(0.8, 1.1))


## Dead: no more walking, only falling.
func fall_dead(dt: float) -> void:
	pl.velocity.x = 0
	pl.velocity.z = 0
	pl.velocity.y -= GRAVITY * dt
	pl.move_and_slide()
