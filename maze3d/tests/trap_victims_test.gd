extends SelfTestPart
## Traps hurt monsters and robots as well as the player, and spare whom their "ignore" says; a flyer gets past a live
## laser without being burned (it rises over the beams, or waits for them to go off); a climber will not let go over a
## live trap. Runs after the fights, so it needs a level that leaves monsters alive: an off-duty floor (Staff Only).
## Everything it moves goes back where it was, and each flyer it sends past the laser is killed there, in the air, for
## the remains part to look at.

const WAIT := 300           # frames: longer than any trap's cycle on the test floor (a vent breathes every 4 s)
const PAST := 2400          # frames a flyer has to get past the laser: a skirmisher stops to shoot most of the way
                            # (the Heavy Security Drone took 1,240, going round by the next lane)


func run() -> void:
	var walker := _pick(func(a: Actor) -> bool: return _walks(a) and not a.is_robot())
	var robot := _pick(func(a: Actor) -> bool: return _walks(a) and a.is_robot())
	if walker == null:
		print("INFO  no living monster left to put in a trap")
		return
	var done := {}
	for t in level.traps:
		if not is_instance_valid(t) or not t.enabled or t.e.get("trip", false) or float(t.e.get("damage", 1.0)) <= 0.0 or done.has(t.kind):
			continue
		done[t.kind] = true
		say(await _hurt_in(walker, t) > 0.0, "a %s hurts a %s that stands in it" % [t.kind, walker.d.get("name")])
		if t.kind != "laser":
			continue
		var was: Array = t.ignore
		t.ignore = ["monsters"]
		say(await _hurt_in(walker, t) == 0.0, "a laser that ignores monsters spares the %s" % walker.d.get("name"))
		if robot != null:
			say(await _hurt_in(robot, t) > 0.0, "... and still burns the %s, a robot" % robot.d.get("name"))
			t.ignore = ["robots"]
			say(await _hurt_in(robot, t) == 0.0, "a laser that ignores robots spares the %s" % robot.d.get("name"))
		t.ignore = was
		await _flyers_past(t)
		_climber_waits(t)


## Hold it in the trap for a while; how much it lost (its health is put back).
func _hurt_in(a: Actor, t: Trap) -> float:
	var home := a.global_position
	var hp0: float = a.hp
	var spot := t.global_position + Vector3(0, 0.05, 0)
	for i in WAIT:
		a.global_position = spot
		a.velocity = Vector3.ZERO
		await get_tree().physics_frame
		if a.hp < hp0:
			break
	var lost: float = hp0 - a.hp
	a.hp = hp0
	a.global_position = home
	return lost


## A flyer that chases (the balcony part's Knife Fighter on Staff Only) and one that keeps its distance, each angered
## and put on one side of the laser with the player on the other, in a straight line through its beams (beyond the
## distance a skirmisher keeps, so it comes on): each must get past the laser, kept on, without being burned. A small
## flyer rises over the beams; a big one goes round by the next lane.
func _flyers_past(t: Trap) -> void:
	var had: bool = t.e.has("cycle")
	var cyc: Variant = t.e.get("cycle")
	t.e["cycle"] = []                          # on the whole time: getting past means over or round, not luck
	for kind in ["chaser", "skirmisher"]:
		var fl := _pick(func(a: Actor) -> bool: return a.d.get("fly", false) and a.dock == null and not a.fixed and t.hurts(a) and a.d.get("behavior", "chaser") == kind)
		if fl == null:
			print("INFO  no %s flyer left to send past the laser" % kind)
		else:
			await _flyer_past(fl, t)
	if had:
		t.e["cycle"] = cyc
	else:
		t.e.erase("cycle")


func _flyer_past(fl: Actor, t: Trap) -> void:
	var across := Vector3(1, 0, 0) if absf(t.global_rotation.y) > 0.5 else Vector3(0, 0, 1)    # the way its beams are crossed
	var side := t.global_position - across * 2.6
	fl.global_position = Vector3(side.x, level.floor_y(side), side.z)
	fl.velocity = Vector3.ZERO
	var keep: Array = fl.d.get("keep", [0.0, 0.0])
	var far: float = float(keep[1]) + 6.0 if fl.d.get("behavior", "chaser") == "skirmisher" else 3.0      # a skirmisher comes no nearer than keep[1]
	pl.global_position = t.global_position + across * far
	if fl.off_duty:
		fl.anger()
	else:
		fl.alert()
	var hp0: float = fl.hp
	var top := 0.0
	var n := 0
	var wide := 0.0
	while n < PAST and (fl.global_position - t.global_position).dot(across) < 1.2:
		await get_tree().physics_frame
		n += 1
		top = maxf(top, fl.global_position.y - level.floor_y(fl.global_position))
		var off: Vector3 = fl.global_position - t.global_position
		wide = maxf(wide, (off - across * off.dot(across)).length())
	var past: bool = (fl.global_position - t.global_position).dot(across) >= 1.2
	say(past and fl.hp >= hp0, "a %s gets past a live laser unburned (%d frames; %.1f m up and %.1f m aside at most; lost %.0f)" % [fl.d.get("name"), n, top, wide, hp0 - fl.hp])
	fl.hurt(1000000.0)


## A climber over the trap's cell would land in it, so it does not let go there (unless the trap spares it).
func _climber_waits(t: Trap) -> void:
	var cl := _pick(func(a: Actor) -> bool: return a.wary != null and a.climb != null and t.hurts(a))
	if cl == null:
		return
	var at := t.global_position
	var lands: bool = level.hazard(cl, at, 10.0, true)
	var was: Array = t.ignore
	t.ignore = ["robots" if cl.is_robot() else "monsters"]
	var spared: bool = not level.hazard(cl, at, 10.0, true)
	t.ignore = was
	say(lands and spared, "a %s would not let go over the laser (and would, over one that spares it)" % cl.d.get("name"))


func _walks(a: Actor) -> bool:
	return not a.d.get("fly", false) and not a.fixed and a.surf == 0 and a.dock == null and a.d.get("mount", "") != "ceiling"


func _pick(ok: Callable) -> Actor:
	for a in level.actors:
		if is_instance_valid(a) and not a.dead and ok.call(a):
			return a
	return null
