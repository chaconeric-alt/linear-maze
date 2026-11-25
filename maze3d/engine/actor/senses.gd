extends Node
## ActorSenses - seeing and hearing. Every actor has them; the def tunes them:
##   "sight": 24 (awake), "wake_sight": sight * 0.75 (asleep), "hearing": 18 (how keen its ears are: a noise reaches it
##   as far as the noise's loudness times hearing / 18, through the level's air: LevelPerception.noise).
## Five times a second it looks: can it see the target (glass and railings do not stop sight), could it shoot it (they
## do), and at what height (LevelPerception: its chest, else its head, else its hips), has the player seen it (then it
## shows on the map), and if it was asleep, does what it sees wake it.
class_name ActorSenses

var a: Actor
var d: Dictionary
var see := false                  # the target is in sight
var shot := true                  # nothing solid, glass and railings included, between it and some part of the target
var aim_y := -1.0                 # the height above the target's feet that a shot can reach (-1: none)
var _see_t := 0.0
const WAKE := 10.0                # metres through the air that waking (its alert sound) carries to others


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


func look(dt: float, pl: Node3D, flat: Vector3, dist: float) -> void:
	_see_t -= dt
	if _see_t > 0.0:
		return
	_see_t = 0.2
	var clear: bool = a.level.perception.sees(a.eye(), pl)
	if clear and not a.seen and dist < 46.0 and pl == Game.player and (a.cloak == null or a.cloak.showing()):      # the player has laid eyes on it (the map); a shimmer is not seen
		var pf := Vector3(-sin(pl.rotation.y), 0, -cos(pl.rotation.y))
		if dist < 3.0 or pf.dot(-flat.normalized()) > 0.45:
			a.seen = true
	aim_y = a.level.perception.shot_height(a.eye(), pl) if clear else -1.0
	shot = aim_y >= 0.0
	see = not Game.calm and dist < (d.get("sight", 24.0) if a.awake else d.get("wake_sight", d.get("sight", 24.0) * 0.75)) and clear
	if see and not a.awake:
		var fwd := a.global_transform.basis.z
		if dist < 7.0 or a.surf != 0 or d.has("dormant_clip") or fwd.dot(flat.normalized()) > 0.2 or a.aware.wary():      # from a wall, or lately searching, they see all round
			a.alert("saw", pl.global_position)
	if see and a.awake:
		a.aware.saw(pl.global_position)


## Off duty: is somebody here to talk to? (within reach, on about the same level, out of its station, in sight)
func look_off_duty(dt: float, pl: Node3D, dist: float, reach: float) -> void:
	_see_t -= dt
	if _see_t > 0.0:
		return
	_see_t = 0.25
	see = dist < reach and absf(pl.global_position.y - a.global_position.y) < 5.0 and (a.dock == null or a.dock.open_amount() > 0.9) \
			and a.level.perception.sees(a.eye(), pl)
	if see and not a.seen:
		a.seen = true


## Look again at once (the next tick), and forget what was seen.
func reset() -> void:
	see = false
	_see_t = 0.0


## It has woken: the others within 10 m of it through the air (LevelPerception.carried) wake too, stirred by its
## startle and its alert sound, whatever their side. (A call, ActorAware, carries further, to its own side.)
func wake_others() -> void:
	for o in a.level.actors:
		if is_instance_valid(o) and o != a and not o.awake and not o.dead and o.global_position.distance_to(a.global_position) < WAKE \
				and a.level.perception.carried(a.eye(), o.eye(), WAKE) <= WAKE:
			o.call_deferred("alert")


## A noise reached it (LevelPerception.noise has decided it was heard): at `from`, of a kind, telling of `about`,
## made `by` someone. Asleep, it wakes to go and look there (ActorAware); awake and looking, it goes to look there
## instead. A call is word from one of its own (another faction's is ignored): it wakes, or if awake and not hunting,
## knows where the player is and hunts (ActorAware.told).
func hear(from: Vector3, kind := "", about: Variant = null, by: Node = null) -> void:
	var at: Vector3 = about if about is Vector3 else from
	if kind == "call":
		if by == null or Factions.of(by) != Factions.of(a):
			return
		if not a.awake:
			a.alert("call", at)
		else:
			a.aware.told(at)
		return
	if not a.awake:
		a.alert("heard", at)
	else:
		a.aware.heard(at)
