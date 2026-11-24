extends Node
## ActorWounds - how hits land on it, past plain "armor" (defs: "sides", "split", "fears_light"; SPEC.md 3.3):
##   "sides": {"front": 0.9, "side": 0.4, "back": -1.0}  what share of a hit it shrugs off by the side it comes from, in
##            place of "armor" (a hit with no "from" uses "armor"); below 0 is a weak spot: -1 takes it double. The
##            front is within 50 degrees of the way it faces, the back within 50 degrees of the other way.
##   "split": {"at": 0.5, "into": "bloodfly_small", "count": 2}  hurt below that share of its health, it comes apart
##            into that many of those (each with the health it has left between them) and is gone.
##   "fears_light": {"reach": 9, "for": 1.5}  the player's lamp on and pointed its way within that many metres: it
##            scatters, and keeps fleeing for "for" seconds after the light last touched it (so it is driven well off,
##            not left hovering at the edge of the beam).
class_name ActorWounds

const FRONT := 50.0               # degrees either side of straight on

var a: Actor
var d: Dictionary
var _split := false
var _scared := 0.0                # seconds it goes on fleeing the light


static func wanted(def: Dictionary) -> bool:
	return def.has("sides") or def.has("split") or def.has("fears_light")


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


## The share of a hit it shrugs off: by the side it comes from, or its plain armour.
func armor(info: Dictionary) -> float:
	if not d.has("sides") or not info.has("from"):
		return float(d.get("armor", 0.0))
	return float(d["sides"].get(side_of(info["from"]), d.get("armor", 0.0)))


## Which side a hit from there lands on: "front", "side" or "back".
func side_of(from: Vector3) -> String:
	var to := Vector3(from.x - a.global_position.x, 0, from.z - a.global_position.z)
	if to.length() < 0.01:
		return "front"
	var fwd := Vector3(a.global_transform.basis.z.x, 0, a.global_transform.basis.z.z)
	var deg := rad_to_deg(fwd.angle_to(to))
	return "front" if deg <= FRONT else ("back" if deg >= 180.0 - FRONT else "side")


## After a hit: below its "split" share, it comes apart.
func after_hurt() -> void:
	if _split or not d.has("split") or a.dead:
		return
	var sp: Dictionary = d["split"]
	if a.hp > a.max_hp * float(sp.get("at", 0.5)):
		return
	_split = true
	var n := int(sp.get("count", 2))
	var each := maxf(1.0, a.hp / n)
	for k in n:
		var off := Vector3(cos(TAU * k / n), 0, sin(TAU * k / n)) * 0.8
		var e := {"actor": str(sp.get("into", "")), "alert": true, "level": a.level.floor_of(a.global_position),
			"offset": [off.x, 0, off.z]}
		var c := a.level.cell_of(a.global_position)
		var child := a.level.spawn_thing(e, c)
		if child is Actor:
			(child as Actor).hp = minf(each, (child as Actor).max_hp)
			child.global_position = a.global_position + off
	LM.sound("squish", a.global_position)
	a.hurt(a.hp + 1.0, {"type": "split", "quiet": true})


func _physics_process(dt: float) -> void:
	_scared = maxf(0.0, _scared - dt)


## Fleeing the light: the lamp is on it now, or was a moment ago.
func scared() -> bool:
	if dazzled():
		_scared = float(d["fears_light"].get("for", 1.5))
	return _scared > 0.0


## The player's lamp is on, pointing its way, within its reach and in sight. (Off duty it is not hunting anybody,
## so a lamp does not drive it off: it can still show its bite on a target.)
func dazzled() -> bool:
	if not d.has("fears_light") or a.off_duty:
		return false
	var pl := Game.player
	if pl == null or not is_instance_valid(pl) or pl.lamp == null or not pl.lamp.visible:
		return false
	var to: Vector3 = a.global_position - pl.global_position
	if to.length() > float(d["fears_light"].get("reach", 9.0)):
		return false
	var look: Vector3 = -pl.cam.global_transform.basis.z
	return look.dot(to.normalized()) > 0.7 and a.senses.see
