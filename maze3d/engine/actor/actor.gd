extends ActorCore
## Actor - what the rest of the engine asks of an actor and tells it: who it is after, what it is doing, off duty and
## showing what it does, and talking to it. How it works is ActorCore (engine/actor/actor_core.gd) and its components.
class_name Actor

const NEAR_HOME := 0.1           # metres: further than this from where the level put it, where it stands is remembered


## A noise reached it (LevelPerception.noise): at `from`, of a `kind`, telling of the place `about`.
func hear(from: Vector3, kind := "", about: Variant = null) -> void:
	senses.hear(from, kind, about)


## The other way (the effect "pacify"): it will not fight again. It can still be talked to.
func stand_down() -> void:
	if dead or off_duty:
		return
	off_duty = true
	awake = false
	roused = false
	add_to_group("usable")
	_add_off_duty()
	od.remember_post.call_deferred()
	_play(d.get("dormant_clip", "idle"))


# ------------------------------------------------------------------ questions others ask
func state_name() -> String:
	return STATE_NAMES[state]


## A machine, not a living thing ("robot": true in its def): traps can be told to spare one or the other.
func is_robot() -> bool:
	return d.get("robot", false)


# ------------------------------------------------------------------ the level's memory (LevelMemory)
## What it was made from, to be made again (a monster made while playing, by an effect or a repair bay): calm, so
## without the "alert" it may have been made with.
func entry() -> Dictionary:
	var en: Dictionary = e.duplicate(true)
	en.erase("alert")
	return en


## What has changed since it was placed: health lost, where it stands (more than NEAR_HOME off its spot, so that it is
## made again where it was and not inside a neighbour; on the floor, out of any station;
## not one off duty, which goes back to its post), and that it was angered on an off-duty floor. Dead, it is not
## remembered: it is gone (LevelMemory.take).
func remember() -> Dictionary:
	var r := {}
	if hp < max_hp:
		r["hp"] = hp
	if surf == 0 and dock == null and not off_duty and global_position.distance_to(home) > NEAR_HOME:
		r["at"] = [global_position.x, global_position.y, global_position.z]
		r["yaw"] = rotation.y
	if not off_duty and bool(e.get("off_duty", level.data.get("off_duty", false))):
		r["angry"] = true
	if brood and not brood.sealed.is_empty():
		r["sealed"] = brood.sealed.duplicate()       # the doors it sealed, opened again when it dies
	return r


## Laid back as it was, but calm: it was asleep or off duty again while the player was away. Where it stood is used
## only if there is still open air there; otherwise it stays on its own spot. Its home stays where the level put it
## (an off-duty one wanders back to its post in its own time).
func recall(r: Dictionary) -> void:
	if r.has("hp"):
		hp = minf(float(r["hp"]), max_hp)
	if r.has("at"):
		var p := Vector3(float(r["at"][0]), float(r["at"][1]), float(r["at"][2]))
		var c := level.cell_of(p)
		if level.open_s(c.x, c.y, floori((p.y + 1.0) / level.H)):
			global_position = p
			rotation.y = float(r.get("yaw", rotation.y))
	if brood and r.has("sealed"):
		brood.sealed = r["sealed"].duplicate()
	if r.get("angry", false) and off_duty:
		off_duty = false
		od.stop()
		remove_from_group("usable")


## On a wall or the ceiling.
func clinging() -> bool:
	return surf == 1 or surf == 2


## Bring it down off the wall or ceiling (the self-test does, to fight it on the floor).
func knock_off() -> void:
	if climb and surf != 0:
		climb.drop()


## A turret, a thing on the ceiling, or one told to stand still: it cannot walk to a target.
func cannot_walk() -> bool:
	return fixed or d.get("mount", "") == "ceiling" or d.get("still", false)


## Off duty, at its post, and not already showing anybody anything: free to be sent to the range.
func free_for_drill() -> bool:
	return off_duty and od.at_post()


## Showing what it does on a target just now.
func drilling() -> bool:
	return od != null and od.drilling()


## The Target it is showing its attacks on, or null.
func drill_foe() -> Node3D:
	return od.foe() if od else null


## Not drilling and not on its way back from it.
func at_post() -> bool:
	return od == null or od.at_post()


## Off duty and walking somewhere: back from the range, or wandering about (a door opens for it).
func going_somewhere() -> bool:
	return od != null and (od.heading_home() or move.roaming())


## Where an off-duty thing was put, and goes back to.
func post() -> Vector3:
	return od.post if od else home


## The station it is waiting in has put it where it stands.
func set_home(at: Vector3) -> void:
	home = at


## It is on its way out of this station: out through the front first.
func leave_station(st: Node3D) -> void:
	move.leaving = st


## What it is doing, in a line, for --trace.
func trace_text() -> String:
	return "state=%s surf=%d awake=%s atk=%s leap=%s stunned=%s dead=%s" % [state_name(), surf, awake, attacks.attack_type() if attacks else "-", attacks != null and attacks.leaping(), stun > 0.0, dead]


# ------------------------------------------------------------------ talking (ActorConversation)
func drill(t: Node3D = null) -> bool:
	return od != null and od.drill(t)


func drill_end() -> void:
	if od:
		od.drill_end()


## The panel's "Show me what you do on duty".
func drill_ask() -> void:
	od.drill_ask()


## Has it put it back where it was (the self-test moves it there itself).
func arrived_home() -> void:
	if od:
		od.arrived()


func talk() -> Dictionary:
	return talker.talk() if talker else e.get("talk", d.get("talk", {}))


func prompt() -> String:
	if not off_duty or talker == null:
		return ""
	return talker.prompt()


func use(_player: Node) -> void:
	if talker:
		talker.use()


func use_again() -> void:
	talker.use_again()


func prize_given() -> void:
	talker.prize_given()


func focus_point() -> Vector3:
	return global_position + Vector3(0, clampf(d.get("center", d.get("height", 1.6) / 2), 0.4, 1.6) * (-1.0 if d.get("mount", "") == "ceiling" else 1.0), 0)


func set_screen(text: String) -> void:
	if looks:
		looks.show(text)
