extends SelfTestPart
## The Listening Post's own test (it runs instead of the standard parts): what a monster can see and hear of the player,
## and where it goes, in the places the awareness review found wanting (25 Nov, "Monster awareness: an assessment").
## Each monster is made where it is needed and killed after. Measured: a monster on the hall floor against a player on
## the gallery behind its railing; a shot through the railing; gunfire heard across the hall, from the doorway above it
## and through the Store's shut door; the route to a player standing by a crate that blocks its cell; a player on the
## gallery only the lift reaches (a monster that shoots finds a shot, one that does not waits under them, one hurt there
## hides); a flyer under the gallery; where a monster goes when the player vanishes; how one startles.

const NORTH := Vector2i(3, 4)        # a cell of the north gallery (storey 1)
const SOUTH := Vector2i(3, 9)        # a cell of the south gallery, which only the lift reaches
const CRATE := Vector2i(5, 7)        # the crate that blocks its cell
const OFFICE := Vector2i(2, 1)       # the Office, on storey 1 over the Store


func replaces_standard() -> bool:
	return true


func run() -> void:
	pl.max_hp = 100000.0
	pl.hp = pl.max_hp
	await frames(20)
	await _railing_sight()
	await _railing_shots()
	await _hearing()
	await _furnished_cell()
	await _lift_only()
	await _flyer()
	await _vanish()
	await _startle()


# ------------------------------------------------------------------ helpers
func _make(id: String, cell: Vector2i, more := {}) -> Actor:
	var e := {"actor": id}
	e.merge(more)
	return level.spawn_thing(e, cell) as Actor


func _kill(a: Actor) -> void:
	if is_instance_valid(a) and not a.dead:
		a.hurt(a.hp * 10.0 + 10000.0, {"type": "physical"})
	await frames(20)
	pl.hp = pl.max_hp


## The player in cell c on storey s, moved by `off` (metres), standing still, looking along `yaw`.
func _put(c: Vector2i, s: int, off := Vector3.ZERO, yaw := 0.0) -> void:
	pl.global_position = level.center(c, s * level.H) + off + Vector3(0, 0.05, 0)
	pl.velocity = Vector3.ZERO
	pl.rotation.y = deg_to_rad(yaw)


## The z of the north gallery's railing (along the gallery's south edge, on the hall side).
func _north_rail() -> float:
	return level.center(NORTH).z + level.C / 2.0 - 0.08


func _eye() -> Vector3:
	return pl.global_position + Vector3(0, Player.EYE, 0)


## Whether the player could see `to` from their eye as the level is drawn: the railing is two thin bars and posts, so a
## line that meets its collision goes on through it.
func _drawn_line(from: Vector3, to: Vector3) -> bool:
	var rail := _north_rail()
	var deck := level.H
	var a := from
	for i in 4:
		var hit := level.get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(a, to, 1))
		if hit.is_empty():
			return true
		var hp: Vector3 = hit["position"]
		if absf(hp.z - rail) < 0.2 and hp.y > deck - 0.05 and hp.y < deck + 1.2:
			a = hp + (to - from).normalized() * 0.3
			continue
		return false
	return false


## Give the player `id` with plenty to fire, in hand.
func _arm(id: String) -> Dictionary:
	pl.give_weapon(id)
	pl.equip(pl.weapons.find(id))
	var w := LM.get_def("weapons", id)
	if w.get("ammo") != null:
		pl.add_ammo(str(w["ammo"]), 20)
	return w


# ------------------------------------------------------------------ sight over the railing
## A Custodian, asleep and still, at four places on the hall floor; the player on the north gallery at four distances
## back from the railing. Where the player can see it, it should see the player.
func _railing_sight() -> void:
	var sees := 0
	var visible := 0
	var missed := 0
	for back in [0.3, 0.8, 1.5, 2.5]:
		for c in [Vector2i(3, 6), Vector2i(3, 7), Vector2i(5, 8), Vector2i(6, 8)]:
			_put(NORTH, 1, Vector3(0, 0, _north_rail() - back - level.center(NORTH).z), 180.0)
			var m := _make("custodian", c, {"still": true, "face": "n"})
			await frames(3)
			m.senses.reset()
			await frames(2)
			var it: bool = m.senses.see
			var you := _drawn_line(_eye(), m.eye())
			sees += 1 if it else 0
			visible += 1 if you else 0
			missed += 1 if you and not it else 0
			await _kill(m)
	say(missed == 0 and visible > 0, "a monster on the hall floor sees you on the gallery wherever you can see it: of 16 places, it sees you in %d, you see it in %d, you see it unseen in %d" % [sees, visible, missed])


## A shot through the railing stops at it, both ways: the player's, aimed low through it at a monster below, and the
## monster's, aimed up through it at the player standing back from it.
func _railing_shots() -> void:
	_put(NORTH, 1, Vector3(0, 0, _north_rail() - 1.5 - level.center(NORTH).z), 180.0)
	var m := _make("custodian", Vector2i(3, 6), {"still": true})
	await frames(3)
	var mask := 1 | 4 | Level.GLASS
	var down := level.get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(_eye(), m.global_position + Vector3(0, 0.3, 0), mask))
	var up := level.get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(m.eye(), pl.global_position + Vector3(0, 0.6, 0), mask | 2))
	var at_rail := func(hit: Dictionary) -> bool:
		return not hit.is_empty() and hit["collider"] != m and hit["collider"] != pl and absf(hit["position"].z - _north_rail()) < 0.2
	say(at_rail.call(down) and at_rail.call(up), "a shot through the gallery's railing stops at it: yours aimed down through it, and one aimed up at you behind it")
	await _kill(m)


# ------------------------------------------------------------------ hearing
## One shot, and whether a sleeping monster wakes (sound carries through the air: SPEC.md 5.24). Heard: a handgun
## across the hall from the gallery, and from the Office's doorway above the hall. In the hall beside the Store's shut
## door, a monster in the Store: the quiet Arc Carbine is not heard, the loud Pump Scattergun is. A silent noise wakes
## nobody.
func _hearing() -> void:
	var across := await _shot("handgun", Vector2i(1, 4), 1, Vector3.ZERO, Vector2i(6, 8), "e")
	var doorway := await _shot("handgun", Vector2i(3, 3), 1, Vector3(0, 0, 1.0), Vector2i(3, 7), "s")
	var wall_quiet := await _shot("arc", Vector2i(3, 5), 0, Vector3.ZERO, Vector2i(3, 2), "n")
	var wall_loud := await _shot("scattergun", Vector2i(3, 5), 0, Vector3.ZERO, Vector2i(3, 2), "n")
	say(across[0] and doorway[0], "a handgun shot is heard across the hall from the gallery (%.1f m), and from the doorway above it (%.1f m; floors %d and %d)" % [across[1], doorway[1], doorway[2], doorway[3]])
	say(not wall_quiet[0] and wall_loud[0], "behind the Store's shut door, %.1f m off, the Arc Carbine %s and the Pump Scattergun %s" % [wall_quiet[1], _heard(wall_quiet), _heard(wall_loud)])
	var silent := await _silent()
	say(not silent, "a silent weapon (noise 0) wakes nobody, even 8 m away")


## A noise of loudness 0 (a melee weapon's) near a sleeping monster with its back turned: does it wake?
func _silent() -> bool:
	_put(Vector2i(3, 5), 0)
	var m := _make("custodian", Vector2i(3, 7), {"still": true, "face": "s"})        # 8 m off, its back turned: it cannot see you
	await frames(5)
	level.perception.noise(pl.global_position + Vector3(0, 1.4, 0), 0.0, "gunfire", pl)
	await frames(3)
	var woke := m.awake
	await _kill(m)
	return woke


func _heard(r: Array) -> String:
	return "is heard" if r[0] else "is not heard"


## The player at `at` (storey s) fires `gun` once at the ceiling; a sleeping, still monster at `ear`, facing `face`.
## [woke, metres apart, the player's floor, its floor].
func _shot(gun: String, at: Vector2i, s: int, off: Vector3, ear: Vector2i, face: String) -> Array:
	_put(at, s, off)
	var m := _make("custodian", ear, {"still": true, "face": face})
	await frames(5)
	_arm(gun)
	look_at(pl.global_position + Vector3(0, 30, 0.1))
	pl.fire()
	await frames(3)
	var out := [m.awake, pl.global_position.distance_to(m.global_position), level.floor_of(pl.global_position), level.floor_of(m.global_position)]
	await _kill(m)
	return out


# ------------------------------------------------------------------ where it goes
## The route to a player standing beside the crate that blocks its cell: it ends beside them, not nowhere.
func _furnished_cell() -> void:
	_put(CRATE, 0, Vector3(1.4, 0, 1.4))
	var m := _make("custodian", Vector2i(9, 8), {"still": true})
	await frames(3)
	var route := level.path(m.global_position, pl.global_position)
	var short := Vector2(route[-1].x - pl.global_position.x, route[-1].z - pl.global_position.z).length() if route.size() > 1 else -1.0
	say(route.size() > 1 and short < 0.5, "beside the crate that blocks its cell: the route to you has %d points and ends %.1f m from you" % [route.size(), short])
	await _kill(m)


## The player on the south gallery, which only the lift reaches, 1.5 m back from its railing: a Monoid (it shoots) and
## a Custodian (it does not), both hunting, on the hall floor for 8 s. Neither can walk to them: the Monoid goes where
## it has a clear shot over the railing, the Custodian to the floor under them.
func _lift_only() -> void:
	var rail := level.center(SOUTH).z - level.C / 2.0 + 0.08
	_put(SOUTH, 1, Vector3(0, 0, rail + 1.5 - level.center(SOUTH).z))
	var mo := _make("monoid", Vector2i(8, 6), {"alert": true})
	var cu := _make("custodian", Vector2i(9, 5), {"alert": true})
	var clear := 0
	for k in 16:
		await frames(30)
		_put(SOUTH, 1, Vector3(0, 0, rail + 1.5 - level.center(SOUTH).z))
		pl.hp = pl.max_hp
		clear += 1 if is_instance_valid(mo) and mo.senses.shot else 0
	var under := level.center(SOUTH)
	var near := Vector2(cu.global_position.x - under.x, cu.global_position.z - under.z).length()
	say(clear >= 8, "on the gallery only the lift reaches: a Monoid on the floor finds somewhere with a clear shot (%d of 16 looks)" % clear)
	say(near < 3.0, "  a Custodian, which cannot shoot, waits on the floor under you (%.1f m from it)" % near)
	await _kill(mo)
	await _kill(cu)
	await _hides(rail)


## The player on the south gallery again; a Custodian in the hall, in their sight, is hurt by them. It can neither
## reach them nor shoot back: it gets out of their sight.
func _hides(rail: float) -> void:
	var at := Vector3(0, 0, rail + 1.5 - level.center(SOUTH).z)
	_put(SOUTH, 1, at)
	var m := _make("custodian", Vector2i(6, 6), {"alert": true})
	await frames(10)
	var was := level.perception.sees(_eye(), m)
	m.hurt(4.0, {"type": "physical", "by": pl})
	for k in 10:
		await frames(30)
		_put(SOUTH, 1, at)
		pl.hp = pl.max_hp
	var hid := not level.perception.sees(_eye(), m)
	say(was and hid and not m.dead, "  a Custodian you hurt from there, which can neither reach you nor shoot back, gets out of your sight (it was in it; now %.1f m away)" % m.global_position.distance_to(pl.global_position))
	await _kill(m)


## A Drone (it flies) hunting on the hall floor in front of the north gallery, the player on the gallery above it: it
## goes up through the air and over the railing, not round by the ramp, and is beside them within 3 s.
func _flyer() -> void:
	_put(NORTH, 1, Vector3(0, 0, _north_rail() - 1.5 - level.center(NORTH).z))
	var d := _make("drone", Vector2i(3, 6), {"alert": true})
	var took := -1
	for t in 600:
		await frames(1)
		_put(NORTH, 1, Vector3(0, 0, _north_rail() - 1.5 - level.center(NORTH).z))
		pl.hp = pl.max_hp
		if is_instance_valid(d) and d.global_position.distance_to(pl.global_position) < 2.5:
			took = t
			break
	say(took >= 0 and took <= 180, "a Drone on the hall floor goes up through the air, over the railing, to you on the gallery in %s (not round by the ramp)" % (("%.1f s" % (took / 60.0)) if took >= 0 else "more than 10 s"))
	await _kill(d)


## A Custodian (it can lose you) and a Deadbot (relentless) hunting the player in the hall; the player vanishes into
## the Office (storey 1, out of their sight). The Custodian goes to where it last saw them and searches there; the
## Deadbot keeps after them. Then the Custodian gives up its search and is asleep again, back where it stood.
func _vanish() -> void:
	_put(Vector2i(9, 7), 0)
	var m := _make("custodian", Vector2i(6, 7), {"alert": true})
	var dbot := _make("deadbot", Vector2i(6, 5), {"alert": true})
	await frames(60)
	var last := pl.global_position
	_put(OFFICE, 1)
	for k in 8:
		await frames(30)
		_put(OFFICE, 1)
		pl.hp = pl.max_hp
	var off := Vector2(m.global_position.x - last.x, m.global_position.z - last.z).length()
	say(m.aware.state_name() == "searching" and off < ActorAware.SPREAD and dbot.aware.state_name() == "hunting",
		"you vanish: 4 s later the Custodian is %s %.1f m from where it last saw you (%.1f m from you); the relentless Deadbot is %s" % [
		m.aware.state_name(), off, m.global_position.distance_to(pl.global_position), dbot.aware.state_name()])
	await _kill(dbot)
	var took := -1
	for t in 40:
		await frames(30)
		_put(OFFICE, 1)
		if not m.awake:
			took = t
			break
	say(took >= 0 and m.aware.state_name() == "unaware", "its search over, the Custodian gives up and is asleep again (%s)" % (("%.1f s later" % (took * 0.5)) if took >= 0 else "not in 20 s"))
	await _kill(m)


## A Custodian asleep with its back to the player, 12 m off, hears a shot: it startles (a hop, a hard turn toward the
## noise, its alert sound, "actor.noticed" saying it heard) and goes to look. A Glorexx woken twitches its feelers.
func _startle() -> void:
	var told: Array = []
	var listen := func(p: Dictionary) -> void:
		told.append(p)
	Events.on("actor.noticed", listen)
	_put(Vector2i(3, 7), 0)
	var m := _make("custodian", Vector2i(6, 7), {"still": true, "face": "e"})
	await frames(5)
	var y0 := m.global_position.y
	_arm("handgun")
	look_at(pl.global_position + Vector3(0, 30, 0.1))
	pl.fire()
	var rose := 0.0
	for k in 24:
		await frames(1)
		rose = maxf(rose, m.global_position.y - y0)
	var to_you := Vector3(pl.global_position.x - m.global_position.x, 0, pl.global_position.z - m.global_position.z).normalized()
	var facing := m.global_transform.basis.z.dot(to_you)
	var mine: Array = told.filter(func(p: Dictionary) -> bool: return p.get("key", "") == level.key_of(m))
	var how: String = mine[0].get("how", "") if not mine.is_empty() else ""
	var cue: String = mine[0].get("cue", "") if not mine.is_empty() else ""
	say(rose > 0.1 and facing > 0.8 and how == "heard" and cue == str(m.d.get("sounds", {}).get("alert", "-")),
		"a sleeping Custodian that hears a shot startles: it hops %.2f m, turns to the noise (facing %.2f), says it heard, sounds '%s'" % [rose, facing, cue])
	await _kill(m)
	var g := _make("glorexx", Vector2i(6, 7), {"still": true})
	await frames(5)
	g.alert()
	await frames(4)
	var tw := ActorTwitch.on(LM.find_type(g.vis, "Skeleton3D") as Skeleton3D)
	say(tw != null and tw.twitching(), "a Glorexx woken twitches its feelers")
	await _kill(g)
	Events.off("actor.noticed", listen)
