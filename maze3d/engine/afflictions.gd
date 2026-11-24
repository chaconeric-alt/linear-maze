class_name Afflictions
extends Node3D
## Afflictions - what a hit leaves behind: burning, lingering poison, being stunned (SPEC.md 5.23). A hit whose info
## carries "afflict" ({"burn": 3, "stun": 1.0}: kinds and seconds) gives whoever it hurt those afflictions, each for
## the longer of what it had left and what this gives. The kinds are the game's ("afflictions" in game.json):
##   {"burn": {"name": "Burning", "dps": 5, "kind": "fire", "color": [1.0, 0.5, 0.1], "text": "You're on fire!"},
##    "stun": {"name": "Stunned", "stun": true, "color": [1.0, 0.9, 0.4], "text": "Stunned!"}}
## One with "dps" hurts that much a second, of its "kind" (a body that takes none of that kind is not afflicted by it);
## one with "stun" stops a monster acting (its stun) and the player moving and shooting while it lasts. Each shows on
## the body as sparks of its colour; the player is told its "text" when it starts. Added to a body the first time it
## is afflicted (engine/player.gd, engine/actor/actor_core.gd call on_hurt).

const TICK := 0.25

var who: Node3D
var left: Dictionary = {}         # kind -> seconds left
var _t := 0.0
var _fx: Dictionary = {}          # kind -> CPUParticles3D


## A hit landed: give its afflictions (if any) to whoever it hurt.
static func on_hurt(body: Node3D, info: Dictionary) -> void:
	var af: Variant = info.get("afflict")
	if not af is Dictionary or af.is_empty() or not "afflictions" in body:
		return
	var kinds: Dictionary = LM.game.get("afflictions", {})
	for k in af:
		if not kinds.has(k):
			continue
		var takes: Dictionary = body.d.get("takes", {}) if "d" in body and body.d is Dictionary else {}
		if kinds[k].has("kind") and DamageTypes.taken(takes, str(kinds[k]["kind"])) <= 0.0:
			continue                                 # nothing that kind of hurt touches it touches it this way either
		if body.afflictions == null:
			var n := Afflictions.new()
			n.who = body
			n.name = "Afflictions"
			body.add_child(n)
			body.afflictions = n
		body.afflictions.give(str(k), float(af[k]))


## That affliction, for that long (or for what it had left, if longer).
func give(kind: String, secs: float) -> void:
	var was: float = left.get(kind, 0.0)
	left[kind] = maxf(was, secs)
	var def: Dictionary = LM.game.get("afflictions", {}).get(kind, {})
	if was <= 0.0 and who == Game.player and def.has("text"):
		Game.say(str(def["text"]), "warn")
	if def.get("stun", false) and who is Actor:
		(who as Actor).stun = maxf((who as Actor).stun, secs)
	if not _fx.has(kind):
		_fx[kind] = _sparks(LM.col(def.get("color"), Color(1, 0.6, 0.2)))
	(_fx[kind] as CPUParticles3D).emitting = true


func has(kind: String) -> bool:
	return left.get(kind, 0.0) > 0.0


## Stunned now: it can neither move nor shoot.
func stunned() -> bool:
	for k in left:
		if left[k] > 0.0 and LM.game.get("afflictions", {}).get(k, {}).get("stun", false):
			return true
	return false


func _physics_process(dt: float) -> void:
	if not is_instance_valid(who) or who.dead:
		for k in _fx:
			(_fx[k] as CPUParticles3D).emitting = false
		return
	_t += dt
	var due := _t >= TICK
	if due:
		_t -= TICK
	var kinds: Dictionary = LM.game.get("afflictions", {})
	for k in left.keys():
		if left[k] <= 0.0:
			continue
		left[k] -= dt
		if left[k] <= 0.0:
			(_fx[k] as CPUParticles3D).emitting = false
			continue
		var dps := float(kinds.get(k, {}).get("dps", 0.0))
		if due and dps > 0.0:
			who.hurt(dps * TICK, {"type": str(kinds[k].get("kind", "")), "affliction": k})


func _sparks(c: Color) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.amount = 16
	p.lifetime = 0.6
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.45
	p.direction = Vector3.UP
	p.initial_velocity_min = 0.6
	p.initial_velocity_max = 1.6
	p.gravity = Vector3(0, 1.5, 0)
	var q := QuadMesh.new()
	q.size = Vector2(0.12, 0.12)
	q.material = Fx.glow_mat(c, 2.0)
	p.mesh = q
	p.position.y = 0.9
	add_child(p)
	return p
