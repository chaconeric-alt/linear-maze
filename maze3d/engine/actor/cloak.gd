extends Node
## ActorCloak - a thing whose skin bends the light round it (def "cloak": {"alpha": 0.08, "click": "chitter",
## "every": 2.0, "near": 9}; SPEC.md 3.3): while it hunts it is a shimmer, no more, and the map does not show it unless
## the character senses it (Sense, HudMap.sensed). It shows itself while it strikes, for a moment after it is hurt,
## and up close (within 2.5 m); dead, it is plain to see. It clicks ("click", every "every" seconds) when it is within
## "near" metres: the player's warning.
class_name ActorCloak

const CLOSE := 2.5
const SHOWN_FOR := 1.5

var a: Actor
var _shown := 0.0                 # seconds it stays in sight after being hurt
var _alpha := 1.0
var _click := 0.0


func setup(actor: Actor) -> void:
	a = actor


## In sight now: striking, just hurt, close, dead or not hunting.
func showing() -> bool:
	if a.dead or not a.awake or _shown > 0.0 or a.attacking():
		return true
	var pl := Game.player
	return pl != null and is_instance_valid(pl) and a.global_position.distance_to(pl.global_position) < CLOSE


func hurt() -> void:
	_shown = SHOWN_FOR


func _process(dt: float) -> void:
	_shown = maxf(0.0, _shown - dt)
	var want := 1.0 if showing() else float(a.d["cloak"].get("alpha", 0.08))
	_alpha = move_toward(_alpha, want, dt * 3.0)
	for m in a.meshes():
		if is_instance_valid(m):
			(m as GeometryInstance3D).transparency = 1.0 - _alpha
	var pl := Game.player
	if a.dead or not a.awake or pl == null or not is_instance_valid(pl):
		return
	_click -= dt
	if _click <= 0.0 and a.global_position.distance_to(pl.global_position) < float(a.d["cloak"].get("near", 9.0)):
		_click = float(a.d["cloak"].get("every", 2.0))
		LM.sound(str(a.d["cloak"].get("click", "chitter")), a.global_position, -4.0)
