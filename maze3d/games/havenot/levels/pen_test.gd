extends SelfTestPart
## The Pen's own test (it runs instead of the standard parts): the danger-zone monsters' pieces (SPEC.md 3.3, 5.23),
## each made where it is needed and seen to work, one at a time. Afflictions: a burn hurts over its time and ends, a
## stun holds the player and a monster, a body that takes none of a kind is not afflicted by it. The Bailiff's shield
## and the Rattleback's soft back (armour by side). The Auditor's beam lands after its aim, and is spoiled by hiding.
## A Garnisher latches on in front of the face, on the player's own floor, takes credits, and drops them when killed.
## A Rattleback charges, smashes a crate in its way, and stuns itself on the wall with its back to the room. A Sporecap
## bursts into a cloud that poisons the player and spares a roach, and sheds sporelings when hurt. A Bloodfly splits
## twice, drinks as it bites, and flees the lamp. A Shroud Stalker is a shimmer the map does not show until it is hurt.
## The Brood Matron screeches the player still and gives birth as she fights. A Foreclosure Unit seals the open door near
## it (and remembers it), leaves the locked one locked, lays mines as it goes, and opens the door again when it dies.
## A flame is a short puff that sets the player alight.

const ARENA := Vector2i(2, 6)


func replaces_standard() -> bool:
	return true


func run() -> void:
	pl.max_hp = 100000.0                           # a pen's worth of monsters, one after another: the test player lasts
	pl.hp = pl.max_hp
	await frames(30)
	await _afflictions()
	_sides()
	await _beam()
	await _latch()
	await _charge()
	await _burst()
	await _bloodfly()
	await _cloak()
	await _matron()
	await _foreclosure()
	await _flame()


# ------------------------------------------------------------------ helpers
func _make(id: String, cell: Vector2i, alert := true) -> Actor:
	return level.spawn_thing({"actor": id, "alert": alert}, cell) as Actor


## Everything alive in the pen killed, and the player's health back.
func _clear() -> void:
	for a in level.actors.duplicate():
		if is_instance_valid(a) and not a.dead:
			a.hurt(a.hp * 10.0 + 10000.0, {"type": "physical"})
	await frames(30)
	pl.hp = pl.max_hp


func _alive(id: String) -> Array:
	return level.actors.filter(func(a: Variant) -> bool: return is_instance_valid(a) and not a.dead and a.e.get("actor", "") == id)


## Frames until `ok` holds (at most `limit`); -1 if it never did.
func _until(ok: Callable, limit: int) -> int:
	for t in limit:
		if ok.call():
			return t
		await get_tree().physics_frame
	return -1


## A body that takes no fire, for the immunity check.
class Fireproof extends Node3D:
	var d := {"takes": {"fire": 0}}
	var afflictions: Afflictions = null
	var dead := false

	func hurt(_amount: float, _info: Dictionary = {}) -> void:
		pass


# ------------------------------------------------------------------ the pieces
func _afflictions() -> void:
	go(ARENA)
	var h0 := pl.hp
	pl.hurt(1.0, {"type": "fire", "afflict": {"burn": 2.0}})
	var burning := pl.afflictions != null and pl.afflictions.has("burn")
	await frames(60)
	var lost := h0 - 1.0 - pl.hp
	await frames(90)
	var dps := float(LM.game["afflictions"]["burn"]["dps"])
	say(burning and lost > dps * 0.7 and lost < dps * 1.3 and not pl.afflictions.has("burn"),
		"a flame's hit sets the player burning: %.1f lost in the first second (%.0f a second), and it goes out" % [lost, dps])
	pl.hurt(0.5, {"type": "shock", "afflict": {"stun": 0.5}})
	var held := pl.afflictions.stunned()
	await frames(40)
	var roach := _make("roach", ARENA + Vector2i(6, 0), false)
	roach.hurt(1.0, {"type": "physical", "afflict": {"stun": 1.0}})
	var dummy := Fireproof.new()
	level.add_child(dummy)
	Afflictions.on_hurt(dummy, {"afflict": {"burn": 3.0}})
	say(held and not pl.afflictions.stunned() and roach.stun >= 0.9 and dummy.afflictions == null,
		"a stun holds the player for its time, and a monster (its stun); a body that takes no fire is not set burning")
	dummy.queue_free()
	await _clear()


func _sides() -> void:
	var b := _make("bailiff", Vector2i(8, 6), false)
	b.rotation.y = 0.0                               # facing +z
	var at := b.global_position
	var names := [b.wounds.side_of(at + Vector3(0, 0, 5)), b.wounds.side_of(at + Vector3(5, 0, 0)), b.wounds.side_of(at - Vector3(0, 0, 5))]
	var losses: Array = []
	for from in [at + Vector3(0, 0, 5), at + Vector3(5, 0, 0), at - Vector3(0, 0, 5)]:
		var h: float = b.hp
		b.hurt(100.0, {"type": "physical", "from": from})
		losses.append(h - b.hp)
	var r := _make("rattleback", Vector2i(8, 2), false)
	r.rotation.y = 0.0
	var h1: float = r.hp
	r.hurt(100.0, {"type": "physical", "from": r.global_position - Vector3(0, 0, 5)})
	say(names == ["front", "side", "back"] and absf(losses[0] - 10.0) < 0.5 and absf(losses[1] - 60.0) < 0.5 and absf(losses[2] - 60.0) < 0.5
		and absf(h1 - r.hp - 200.0) < 0.5,
		"armour by side: the Bailiff's shield takes %.0f of 100 from the front, %.0f from the side, %.0f from behind; the Rattleback's back takes double (%.0f)"
		% [losses[0], losses[1], losses[2], h1 - r.hp])


func _beam() -> void:
	await _clear()
	go(Vector2i(1, 2))
	var a := _make("auditor", Vector2i(8, 2))
	var started := await _until(func() -> bool: return a.moves.busy(), 300)
	var h0 := pl.hp
	var landed := await _until(func() -> bool: return pl.hp < h0, 240)
	say(started >= 0 and landed >= 110 and absf(h0 - pl.hp - 55.0) < 1.0,
		"the Auditor paints the player for its aim and its beam lands %d frames later, for %.0f" % [landed, h0 - pl.hp])
	var again := await _until(func() -> bool: return a.moves.busy(), 400)
	go(Vector2i(13, 6))                              # behind the locked door, out of its sight
	var h1 := pl.hp
	var spoiled := await _until(func() -> bool: return not a.moves.busy(), 30)
	await frames(150)
	say(again >= 0 and spoiled >= 0 and pl.hp == h1, "out of its sight while it aims, its shot is spoiled (nothing lands)")


func _latch() -> void:
	await _clear()
	go(ARENA)
	Game.add_credits(20 - Game.credits)
	var g := _make("garnisher", ARENA + Vector2i(2, 0))
	var on := await _until(func() -> bool: return g.moves.busy() and g.moves.at.get("type") == "latch", 300)
	await frames(100)
	var floor_ok := level.floor_of(g.global_position) == level.floor_of(pl.global_position)
	await frames(80)
	var took := 20 - Game.credits
	var stolen := g.moves.stolen
	g.hurt(1000.0, {"type": "physical"})
	await frames(10)
	var dropped := level.get_children().any(func(n: Node) -> bool: return n is Pickup and n.entry().get("item") == "chips" and int(n.entry().get("value", 0)) == stolen)
	say(on >= 0 and floor_ok and took > 0 and stolen == took and dropped,
		"a Garnisher latches on (on the player's own floor), takes %d credits, and drops them as chips when killed" % took)


func _charge() -> void:
	await _clear()
	go(Vector2i(8, 3))
	var crate := level.spawn_thing({"prop": "crate", "hp": 20}, Vector2i(6, 3))
	var r := _make("rattleback", Vector2i(4, 3))
	var bellow := await _until(func() -> bool: return r.moves.busy() and r.moves.at.get("type") == "charge", 400)
	await frames(64)                                 # the bellow over, it is on its way
	go(Vector2i(8, 6))                               # and the player steps aside
	var stunned := await _until(func() -> bool: return r.stun > 0.5, 120)
	var smashed: bool = crate == null or not is_instance_valid(crate) or not crate.is_in_group("breakable")
	say(bellow >= 0 and stunned >= 0 and smashed and r.wounds.side_of(r.global_position - Vector3(8, 0, 0)) == "back",
		"the Rattleback bellows and charges, smashes the crate in its way, and stuns itself on the wall, its back to the room")


func _burst() -> void:
	await _clear()
	go(ARENA)
	var roach := _make("roach", ARENA, false)
	var rh: float = roach.hp
	var cap := _make("sporecap", ARENA + Vector2i(1, 0))
	var burst := await _until(func() -> bool: return cap.dead, 120)
	var cloud := level.get_children().any(func(n: Node) -> bool: return n is Cloud)
	var h0 := pl.hp
	await frames(60)
	say(burst >= 0 and cloud and pl.afflictions.has("poison") and pl.hp < h0 and is_instance_valid(roach) and roach.hp == rh,
		"a Sporecap bursts into a cloud: the player is poisoned (%.0f in a second), the roach in it is spared" % (h0 - pl.hp))
	await _clear()
	var far := _make("sporecap", Vector2i(9, 2), false)
	for k in 20:
		far.hurt(3.0, {"type": "physical"})
	var shed: int = far.brood.count(0)
	say(shed >= 1 and shed <= 4, "hurt, a Sporecap sheds sporelings (%d from 20 hits, at most 4)" % shed)


func _bloodfly() -> void:
	await _clear()
	var b := _make("bloodfly", Vector2i(9, 6), false)
	b.hurt(35.0, {"type": "physical"})
	await frames(2)
	var halves := _alive("bloodfly_small")
	var first := b.dead and halves.size() == 2
	if not halves.is_empty():
		(halves[0] as Actor).hurt(1.0, {"type": "physical"})
	await frames(2)
	say(first and _alive("bloodfly_mite").size() == 2 and _alive("bloodfly_small").size() == 1,
		"a Bloodfly cloud hurt past half splits into two smaller clouds, and those split again")
	await _clear()
	go(ARENA)
	pl.lamp.visible = false
	var d := _make("bloodfly", ARENA + Vector2i(1, 0))
	d.hp = 40.0
	var most := 0.0
	for t in 300:
		most = maxf(most, d.hp)
		await get_tree().physics_frame
	say(most > 40.0, "it drinks as it bites (40 health up to %.0f)" % most)
	await _clear()
	go(Vector2i(1, 2))
	var f := _make("bloodfly", Vector2i(3, 2))
	pl.lamp.visible = true
	var near := f.global_position.distance_to(pl.global_position)
	var dazzled := false
	var went := 0.0
	for t in 90:
		look_at(f.global_position + Vector3(0, 1.4, 0))
		dazzled = dazzled or f.wounds.dazzled()
		went = maxf(went, f.global_position.distance_to(pl.global_position))
		await get_tree().physics_frame
	pl.lamp.visible = false
	say(dazzled and went > near + 2.0 and not f.wounds.dazzled(), "the lamp on it drives it off (from %.1f m to %.1f m); off, it does not" % [near, went])


func _cloak() -> void:
	await _clear()
	go(ARENA)
	var s := _make("stalker", Vector2i(9, 6))
	await frames(60)
	var hidden := not s.cloak.showing() and not s.seen and s.meshes().all(func(m: Node) -> bool: return (m as GeometryInstance3D).transparency > 0.5)
	s.hurt(10.0, {"type": "physical"})
	say(hidden and s.cloak.showing(), "a Shroud Stalker hunts as a shimmer, unseen on the map, and shows itself when hurt")


func _matron() -> void:
	await _clear()
	go(Vector2i(2, 2))
	var m := _make("matron", Vector2i(4, 2))
	var stunned := false
	for t in 840:
		stunned = stunned or (pl.afflictions != null and pl.afflictions.stunned())
		await get_tree().physics_frame
	say(stunned and m.brood.count(0) >= 1, "the Brood Matron screeches the player still, and gives birth to %d as she fights" % m.brood.count(0))


func _foreclosure() -> void:
	await _clear()
	go(Vector2i(2, 4))
	var open_door := door(11, 2)
	var locked := door(11, 6)
	var f := _make("foreclosure", Vector2i(9, 4))
	var sealed := await _until(func() -> bool: return not f.brood.sealed.is_empty(), 120)
	var r: Dictionary = f.remember()
	var right: bool = open_door.sealed and not locked.sealed and locked.lock == "red" and r.get("sealed", []) == [level.key_of(open_door)]
	await frames(480)
	var mines: int = f.brood.count(0)
	f.hurt(10000.0, {"type": "physical"})
	await frames(10)
	say(sealed >= 0 and right and mines >= 1 and not open_door.sealed and locked.lock == "red",
		"a Foreclosure Unit seals the open door near it (and remembers it), not the locked one; lays %d mine(s) as it goes; dead, it opens the door again" % mines)


func _flame() -> void:
	await _clear()
	go(ARENA)
	var from := pl.global_position + Vector3(0, 1.2, -2.0)
	Projectile.launch(level, "flame", from, Vector3(1, 0, 0), 4.0, null, false)
	await frames(30)
	var in_air := level.get_children().filter(func(n: Node) -> bool: return n is Projectile).size()
	await frames(20)
	var gone := level.get_children().filter(func(n: Node) -> bool: return n is Projectile).size()
	Projectile.launch(level, "flame", pl.global_position + Vector3(2.0, 1.2, 0), Vector3(-1, 0, 0), 4.0, null, false)
	var lit := await _until(func() -> bool: return pl.afflictions.has("burn"), 60)
	say(in_air == 1 and gone == 0 and lit >= 0, "a flame flies 0.6 s and is gone; one that reaches the player sets them alight")
