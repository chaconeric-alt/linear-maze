extends SelfTestPart
## Every dead body lies on what is under it: once it has stopped falling and its death pose is done, its body rests on
## something (it has not gone through the floor or hung in the air) and what is drawn touches what it rests on. Bodies
## killed in mid-air, the Knife Fighter's in particular, used to sink into the floor or float above it. Runs after the
## fights, so it sees every body they left (and the flyer the balcony part killed in the air).

const WAIT := 300           # frames allowed for the last bodies to come down and settle
const GAP := 0.02           # how far above what it rests on a body is laid
const SLACK := 0.05         # how far from that it may be and still look as if it lies there


func run() -> void:
	var bodies: Array = []
	for a in level.actors:
		if is_instance_valid(a) and a.dead and a.remains != null:
			bodies.append(a)
	if bodies.is_empty():
		print("INFO  no dead bodies to look at")
		return
	var t := 0
	while t < WAIT and bodies.any(func(a: Actor) -> bool: return is_instance_valid(a) and not a.remains.settled()):
		await get_tree().physics_frame
		t += 1
	var wrong := 0
	for a in bodies:
		if not is_instance_valid(a):
			continue
		var why := _what_is_wrong(a)
		if why != "":
			wrong += 1
			print("INFO    %s at %s: %s" % [a.d.get("name", "?"), level.cell_of(a.global_position), why])
	say(wrong == 0, "dead bodies lie on what is under them (%d of %d do not)" % [wrong, bodies.size()])


func _what_is_wrong(a: Actor) -> String:
	if not a.remains.settled():
		return "still falling or settling after %d frames" % WAIT
	if not a.remains.supported():
		return "its body is hanging in the air"
	var gap: float = a.remains.model_gap()
	if gap == INF:
		return ""                                    # nothing drawn
	if absf(gap - GAP) > SLACK:
		return "what is drawn is %.2f m %s what it rests on" % [absf(gap), "above" if gap > 0.0 else "below"]
	return ""
