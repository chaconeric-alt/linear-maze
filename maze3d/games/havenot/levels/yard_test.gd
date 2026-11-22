extends SelfTestPart
## The Yard's own test (it runs instead of the standard parts): factions and patrols (Factions, ActorFoes,
## ActorPatrol; SPEC.md 5.20). War goes both ways, by the table; the level's own factions are laid over the game's
## (which keep robots and monsters at war with the player only, so no other level changes). The guard walks its beat,
## point after point, in order, pausing at each. A vermin put in its sight is what it goes after, and it kills it,
## leaving the player alone; with nothing in sight for its give_up, it goes back to its beat. A guard hurt by another
## guard does not turn on it. The ally fights a monster put beside it, never the player, and takes the player's stray
## shot without turning. The neutral leaves the player alone until the player hurts it; then it goes after them.


func replaces_standard() -> bool:
	return true


func run() -> void:
	_the_table()
	await _the_beat()
	await _the_fight()
	await _friendly_fire()
	await _the_ally()
	await _the_neutral()


func _the_table() -> void:
	var t := {"a": {"hostile": ["b"]}, "b": {}, "n": {"hostile": []}}
	say(Factions.at_war(t, "a", "b") and Factions.at_war(t, "b", "a") and not Factions.at_war(t, "a", "n") and not Factions.at_war(t, "a", "a"),
		"war goes both ways: one side naming the other is enough; a faction that names nobody is at war with nobody")
	say(Factions.at_war(t, "", "player") and not Factions.at_war(t, "", "a"), "an actor with no faction is at war with the player only, as before factions")
	var game: Dictionary = LM.game.get("factions", {})
	say(not Factions.at_war(game, "robots", "monsters") and Factions.at_war(game, "robots", "player") and Factions.at_war(game, "monsters", "player"),
		"the game's own factions: robots and monsters are at war with the player, not each other (every other level as before)")
	say(Factions.hostile("guards", "vermin") and not Factions.hostile("guards", "player") and Factions.allies_here(),
		"the level's own factions are laid over the game's: guards and vermin at war; guards not with the player; an ally here")
	var g: Actor = thing("guard")
	say(g.foes != null and g.patrol != null and (thing("enemy") as Actor).foes != null, "the guard has whom to fight and a beat; with an ally here, so has a monster")


## The guard walks its beat: point after point, in order.
func _the_beat() -> void:
	var g: Actor = thing("guard")
	await frames(2)
	var seen: Array = [g.patrol.at]
	var n := 0
	while n < 2700 and seen.size() < 6:
		await frames(1)
		n += 1
		if g.patrol.at != seen[-1]:
			seen.append(g.patrol.at)
	var in_order := true
	for i in range(1, seen.size()):
		in_order = in_order and seen[i] == (seen[i - 1] + 1) % g.patrol.route.size()
	say(seen.size() >= 6 and in_order and not g.awake, "the guard walks its beat, point after point in order (%s, in %.1f s)" % [seen, n / 60.0])


## A vermin in its sight: it goes after it and kills it, and leaves the player alone; then back to its beat.
func _the_fight() -> void:
	var g: Actor = thing("guard")
	var v: Actor = thing("vermin")
	var hp := pl.hp
	v.global_position = level.center(Vector2i(7, 3), 0.05)
	var after := false
	var n := 0
	while n < 1800 and not v.dead:
		await frames(1)
		n += 1
		after = after or g.target() == v
	say(after and v.dead and _killed_by(v) == level.key_of(g), "a vermin put in its sight is what the guard goes after, and it kills it (%.1f s, by %s)" % [n / 60.0, _killed_by(v)])
	say(pl.hp >= hp, "  and the guard leaves the player alone")
	var was: int = g.patrol.at
	n = 0
	var moved := false
	while n < 1200 and not (not g.awake and moved):
		await frames(1)
		n += 1
		moved = moved or (not g.awake and g.patrol.at != was)
	say(not g.awake and moved, "with nothing in sight, it goes back to its beat (%.1f s)" % (n / 60.0))


## Its own side's shot does not make it turn.
func _friendly_fire() -> void:
	var g: Actor = thing("guard")
	var g2: Actor = thing("guard2")
	g2.hurt(5.0, {"type": "bolt", "from": g.global_position, "by": g})
	await frames(30)
	say(g2.target() != g and not g2.dead, "a guard hurt by another guard does not turn on it")


## The ally fights a monster put beside it, never the player, and takes the player's stray shot without turning.
func _the_ally() -> void:
	var al: Actor = thing("ally")
	var en: Actor = thing("enemy")
	en.global_position = level.center(Vector2i(13, 10), 0.05)
	var at_player := false
	var after := false
	var n := 0
	while n < 1800 and not en.dead:
		await frames(1)
		n += 1
		after = after or al.target() == en
		at_player = at_player or al.target() == pl
	say(after and en.dead and not at_player, "the ally goes after a monster put beside it, never the player (%.1f s, killed by %s)" % [n / 60.0, _killed_by(en)])
	al.hurt(3.0, {"type": "bullet", "from": pl.global_position, "by": pl})
	await frames(30)
	say(al.target() != pl, "  and takes the player's stray shot without turning")


## The neutral leaves the player alone, until the player hurts it.
func _the_neutral() -> void:
	var ne: Actor = thing("neutral")
	pl.global_position = level.center(Vector2i(8, 9), 0.05)
	await frames(60)
	var alone := ne.target() == null
	ne.hurt(3.0, {"type": "bullet", "from": pl.global_position, "by": pl})
	await frames(30)
	say(alone and ne.target() == pl, "the neutral leaves the player alone until the player hurts it; then it goes after them")


## Who killed it, by the actor.died event: a key, or "player".
func _killed_by(a: Actor) -> String:
	var k := level.key_of(a)
	for e in Events.recorded():
		if e[0] == "actor.died" and e[1].get("key", "") == k:
			return str(e[1].get("by", ""))
	return ""
