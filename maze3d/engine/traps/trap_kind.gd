extends RefCounted
## TrapKind - what one kind of trap does (engine/traps/): how it is built, what it does each frame to whoever is in
## it, and whether it would hurt someone who stood somewhere (for flyers and climbers that keep out of traps). The
## Trap it belongs to keeps what every kind shares: its entry, its clock, its light, who it spares, and the measures
## of a body (Trap.span, Trap.reach, Trap.here). A new kind of trap is a new file here and a line in Trap.make_kind.
class_name TrapKind

var trap: Trap
var e: Dictionary
var on := false                  # working now: a beam showing, gas or fire coming out, a block coming down


func _init(t: Trap) -> void:
	trap = t
	e = t.e


func build(_kit_id: String) -> void:
	pass


## One frame: `who` is everyone close enough to be in it (Trap.victims), the player among them if it hurts them.
func tick(_dt: float, _pl: Node3D, _who: Array) -> void:
	pass


## Would it hurt a body whose origin is `rel` from the trap (span `sp`, bottom and top above the trap; `room` its reach
## and a margin), now or within `lead` seconds?
func danger(_who: Node3D, _rel: Vector3, _sp: Vector2, _room: float, _lead: float) -> bool:
	return false


## It never hurts anyone (a tripwire tells, a laser of light for show): nothing need keep out of it.
func harmless() -> bool:
	return false


## Switched off: whatever it was showing goes.
func off() -> void:
	on = false
