extends SelfTestPart
## A flyer on a balcony right over the player comes down to it. It used to hang there: it held its height, and as the
## player was within reach on the map it went straight for them instead of taking the way down. The flyer is put on
## the balcony cell farthest from a ramp, the player on the floor under it; it must come down to the player's level
## and within reach. Then it is killed where it is, so the remains part sees a flyer that died in the air. Only on a
## level with a balcony over open floor (Staff Only); runs after the fights, which leave the off-duty floor's flyers
## alive (one is angered for this).

const WAIT := 1800          # frames it has to come down: on Staff Only its way is 45 m along the balcony to the ramp,
                            # down and back under it, about 14 seconds; twice that


func run() -> void:
	var spot := _balcony()
	if spot.z < 0:
		print("INFO  no balcony over open floor here")
		return
	var a := _flyer()
	if a == null:
		print("INFO  no flyer left alive to put on the balcony")
		return
	var was_calm: bool = Game.calm
	Game.calm = false
	var hp_was: float = pl.hp
	pl.hp = 100000.0
	var c := Vector2i(spot.x, spot.y)
	a.global_position = level.center(c, spot.z * level.H)
	a.velocity = Vector3.ZERO
	pl.global_position = level.center(c, level.floor_y(level.center(c, 0.5)))
	if a.off_duty:
		a.anger()
	else:
		a.alert()
	var nm: String = a.d.get("name", "?")
	var t := 0
	while t < WAIT and not _down(a):
		await get_tree().physics_frame
		t += 1
	say(_down(a), "a %s on a balcony %.0f m over the player comes down to it (%d frames; %.1f m above, %.1f m away)" % [nm, spot.z * level.H, t, a.global_position.y - pl.global_position.y, _flat(a)])
	a.hurt(100000.0)
	pl.hp = minf(hp_was, pl.max_hp)
	Game.calm = was_calm
	await frames(10)


## The balcony cell farthest from any ramp with open floor under it: [x, y, storey], or z = -1 if there is none.
func _balcony() -> Vector3i:
	var ramps: Array = []
	var decks: Array = []
	for y in level.h:
		for x in level.w:
			var cl := level.cell(x, y)
			if not cl.get("ramp", {}).is_empty():
				ramps.append(Vector2(x, y))
			if level.is_open(x, y) and cl.get("ramp", {}).is_empty() and not cl.get("decks", []).is_empty():
				decks.append(Vector3i(x, y, cl["decks"][0]))
	var best := Vector3i(0, 0, -1)
	var far := -1.0
	for dk in decks:
		var near := INF
		for r in ramps:
			near = minf(near, Vector2(dk.x, dk.y).distance_to(r))
		if near > far:
			far = near
			best = dk
	return best


## An undocked flyer that is alive and not on a wall.
func _flyer() -> Actor:
	for a in level.actors:
		if is_instance_valid(a) and not a.dead and a.d.get("fly", false) and a.dock == null and a.surf == 0:
			return a
	return null


func _down(a: Actor) -> bool:
	return is_instance_valid(a) and absf(a.global_position.y - pl.global_position.y) < ActorLocomotion.LEVEL_GAP and _flat(a) < 3.0


func _flat(a: Actor) -> float:
	return Vector2(a.global_position.x - pl.global_position.x, a.global_position.z - pl.global_position.z).length()
