extends SelfTestPart
## The Proving Range's own test (it runs instead of the standard parts): damage types and explosives (DamageTypes,
## Fx.explode's "how"; SPEC.md 5.21). A kind's aliases are the same type, so data written with the old names means what
## it did. A rocket's blast hurts most at its centre and less with distance, throws what it hurts back and up (less for
## a heavier body), and does not go through a wall. The player picks up the launcher and a crate of rockets, fires one
## rocket a shot, and kills a dummy at the far end; a rocket fired at a wall close by hurts the one who fired it.


func replaces_standard() -> bool:
	return true


func run() -> void:
	await frames(40)                                 # pickups are armed half a second in
	_the_types()
	_the_blast()
	_the_wall()
	await _the_launcher()
	await _back_blast()


func _the_types() -> void:
	say(DamageTypes.canon("blast") == "explosive" and DamageTypes.canon("toxic") == "poison" and DamageTypes.canon("laser") == "beam"
		and DamageTypes.canon("bullet") == "physical" and DamageTypes.canon("melee") == "physical" and DamageTypes.canon("explosive") == "explosive"
		and DamageTypes.canon("ice") == "ice",
		"a kind's alias is its type (blast: explosive, toxic: poison, laser: beam, bullet and melee: physical); a kind the list does not name is its own")
	var takes: Dictionary = LM.get_def("actors", "custodian").get("takes", {})
	say(is_equal_approx(DamageTypes.taken(takes, "explosive"), 1.6) and is_equal_approx(DamageTypes.taken(takes, "blast"), 1.6)
		and is_equal_approx(DamageTypes.taken(takes, "melee"), 1.0),
		"a robot written to take 1.6 from \"blast\" takes 1.6 from \"explosive\" too, and 1.0 from a kind it does not name")
	var both := {"blast": 0.5, "explosive": 3.0}
	say(is_equal_approx(DamageTypes.taken(both, "blast"), 0.5) and is_equal_approx(DamageTypes.taken(both, "explosive"), 3.0),
		"a body's own word for a kind comes first")


## The rocket's own blast, set off on "near": "side", three metres off, takes less, by 1 - 0.6 d/r, and is thrown away
## from the centre and up, by the blast's knock and lift less with distance, over its mass.
func _the_blast() -> void:
	var near: Actor = thing("near")
	var side: Actor = thing("side")
	var how: Dictionary = LM.get_def("projectiles", "rocket")["blast"]
	var r := float(how["radius"])
	var at := near.global_position + Vector3(0, 0.8, 0)
	var off := side.global_position + Vector3(0, 0.8, 0)
	var d := off.distance_to(at)
	var h0: float = near.hp
	var h1: float = side.hp
	var v0: Vector3 = side.velocity
	Fx.explode(level, at, r, float(how["damage"]), Color(1.0, 0.55, 0.2), null, false, how)
	var scale: float = DamageTypes.taken(side.d.get("takes", {}), "explosive") * (1.0 - side.d.get("armor", 0.0))
	var want_near: float = float(how["damage"]) * scale
	var want_side: float = float(how["damage"]) * (1.0 - 0.6 * d / r) * scale
	say(absf(h0 - near.hp - want_near) < 0.5 and absf(h1 - side.hp - want_side) < 0.5,
		"a rocket's blast hurts most at its centre (%.0f, want %.0f) and less %.1f m off (%.0f, want %.0f)" % [h0 - near.hp, want_near, d, h1 - side.hp, want_side])
	var dv: Vector3 = side.velocity - v0
	var mass: float = side.d.get("mass", 1.0)
	var away := Vector2(off.x - at.x, off.z - at.z).normalized()
	var knock := float(how["knock"]) * (1.0 - d / r) / mass
	var lift := float(how["lift"]) * (1.0 - d / r) / mass
	say(Vector2(dv.x, dv.z).normalized().dot(away) > 0.99 and absf(Vector2(dv.x, dv.z).length() - knock) < 0.01 and absf(dv.y - lift) < 0.01,
		"the blast throws what it hurts away from it and up, less with distance and by its mass (%.2f m/s back, %.2f up)" % [Vector2(dv.x, dv.z).length(), dv.y])


## A blast at the lane's south edge: the dummy eight metres off along the lane is hurt; the one eight metres off behind
## the wall is not.
func _the_wall() -> void:
	var open: Actor = thing("open")
	var behind: Actor = thing("behind")
	var at := level.center(Vector2i(8, 3), 0.8)
	var a0: float = open.hp
	var b0: float = behind.hp
	var da := (open.global_position + Vector3(0, 0.8, 0)).distance_to(at)
	var db := (behind.global_position + Vector3(0, 0.8, 0)).distance_to(at)
	Fx.explode(level, at, 10.0, 20.0, Color(1.0, 0.55, 0.2), null, false, {"kind": "explosive"})
	say(open.hp < a0 and behind.hp == b0 and absf(da - db) < 0.5,
		"a blast does not go through a wall: a dummy %.1f m off in the open is hurt (%.0f), one %.1f m off behind the wall is not" % [da, a0 - open.hp, db])


## The launcher and a crate are picked up (the launcher comes with one rocket, the crate holds two); each shot uses one;
## the far dummy dies to them.
func _the_launcher() -> void:
	var got: int = await take("launcher")
	got += await take("rockets")
	say(got == 2 and pl.weapons.has("launcher") and int(pl.ammo.get("rockets", 0)) == 3,
		"the launcher and a crate of rockets are picked up: three rockets (%d)" % int(pl.ammo.get("rockets", 0)))
	pl.equip(pl.weapons.find("launcher"))
	var far: Actor = thing("far")
	go(Vector2i(10, 2))
	var fired := 0
	var t := 0
	while is_instance_valid(far) and not far.dead and t < 600 and fired < 3:
		look_at(far.global_position + Vector3(0, far.d.get("height", 2.0) / 2.0, 0))
		if pl.ready_to_fire():
			pl.fire()
			fired += 1
		await frames(1)
		t += 1
	await frames(20)
	say((not is_instance_valid(far) or far.dead) and int(pl.ammo.get("rockets", 0)) == 3 - fired,
		"the far dummy dies to the launcher (%d rocket(s), one a shot: %d left)" % [fired, int(pl.ammo.get("rockets", 0))])


## A rocket fired at the wall two metres in front: the blast hurts the one who fired it, and throws them back.
func _back_blast() -> void:
	go(Vector2i(1, 2))
	pl.hp = pl.max_hp
	pl.armor = 0.0
	await frames(2)
	look_at(level.center(Vector2i(0, 2), 1.6))
	var t := 0
	while not pl.ready_to_fire() and t < 120:
		await frames(1)
		t += 1
	var hp := pl.hp
	var x := pl.global_position.x
	pl.fire()
	var push := 0.0
	for _i in 40:
		await frames(1)
		push = maxf(push, pl.velocity.x * signf(x - level.center(Vector2i(0, 2)).x))
	say(pl.hp < hp and not pl.dead and push > 2.0,
		"a rocket at a wall close by hurts the one who fired it (%.0f) and throws them back (%.1f m/s)" % [hp - pl.hp, push])
