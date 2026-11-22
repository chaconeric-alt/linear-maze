extends SelfTestPart
## The character (SPEC.md 5.22): what an origin, mutations and skills come to (CharacterSheet), and what that does to
## the player: health, speed, natural armour, the lamp, the pack and hands, hack odds, healing, the skill gate on panel
## options, and what Sense finds on the map. A character as every one was before (a Human with no mutations and no
## skills) changes nothing. Tries other characters on the one being played and puts it back as it was; waits no
## frames. Runs after the state part, on every level.

const NAMES := ["hp", "move", "pack", "slots", "hack", "heal", "sense", "armor", "lamp"]


func run() -> void:
	_plain()
	_origins()
	_skills()
	_on_the_player()
	_the_gate()
	_sense()


## A Human with nothing gives nothing: the player is as before characters.
func _plain() -> void:
	var c := {"origin": "human", "mutations": [], "skills": {}}
	var none := true
	for n in NAMES:
		none = none and CharacterSheet.gives(c, n) == 0.0
	var st := CharacterSheet.stats(c)
	say(none and st.values().all(func(v: Variant) -> bool: return int(v) == 3) and CharacterSheet.sense_reach(c) == 7.0
		and CharacterSheet.gives({}, "hp") == 0.0,
		"a Human with no mutations or skills (and a character from before origins) gives nothing: %s, sensing 7 cells" % CharacterSheet.line(c))


func _origins() -> void:
	var h := {"origin": "hyena", "mutations": [], "skills": {}}
	say(CharacterSheet.line(h) == "Speed 6 · Sense 6 · Physical 2 · Mental 2" and is_equal_approx(CharacterSheet.gives(h, "hp"), -20.0)
		and is_equal_approx(CharacterSheet.gives(h, "move"), 0.18) and is_equal_approx(CharacterSheet.gives(h, "pack"), -2.0)
		and is_equal_approx(CharacterSheet.gives(h, "hack"), -0.05) and CharacterSheet.sense_reach(h) == 10.0,
		"a Mutant Hyena: %s; 20 less health, 18%% faster, 2 less in the pack, hacks 5%% worse, senses 10 cells" % CharacterSheet.line(h))
	var m := {"origin": "mutant", "mutations": ["chitin", "twitchy", "cranium", "arm"], "skills": {}}
	var st := CharacterSheet.stats(m)
	say(int(st["speed"]) == 4 and int(st["mental"]) == 4 and int(st["physical"]) == 2 and is_equal_approx(CharacterSheet.gives(m, "armor"), 0.1)
		and CharacterSheet.gives(m, "slots") == 1.0,
		"mutations add to the stats and give their own: %s, natural armour 10%%, a third hand" % CharacterSheet.line(m))
	var x := {"origin": "hyena", "mutations": ["eyes", "brittle", "stunted"], "skills": {}}
	st = CharacterSheet.stats(x)
	say(int(st["sense"]) == 7 and int(st["physical"]) == 1, "stats stay within 1 to 7 (Sense 6 + 3, Physical 2 - 2): %s" % CharacterSheet.line(x))


func _skills() -> void:
	var c := {"origin": "human", "mutations": [], "skills": {"hacking": 2, "medicine": 1, "mechanics": 9}}
	say(is_equal_approx(CharacterSheet.gives(c, "hack"), 0.16) and is_equal_approx(CharacterSheet.gives(c, "heal"), 0.15)
		and CharacterSheet.rank(c, "mechanics") == 5 and CharacterSheet.rank(c, "nothing") == 0
		and CharacterSheet.skills_line(c) == "Hacking 2 · Mechanics 5 · Medicine 1",
		"skills give by rank (Hacking 2: hacks 16%% better; Medicine 1: heals 15%% more), never past their max: %s" % CharacterSheet.skills_line(c))


## The character played is set to a Mutant Hyena with Medicine 2 and a glowing skin, then put back.
func _on_the_player() -> void:
	var c: Dictionary = State.character()
	var was := c.duplicate(true)
	var hp: float = pl.hp
	var max_hp: float = pl.max_hp
	var odds := Game.hack_chance(0.0)
	c["origin"] = "hyena"
	c["mutations"] = ["glow", "chitin"]
	c["skills"] = {"medicine": 2}
	pl.apply_character(c)
	Debug.carry_anything = false
	var pack := Carrying.capacity([])
	var hands := Carrying.slots([])
	Debug.carry_anything = true
	var full := pl.max_hp
	pl.hp = 10.0
	var healed := pl.heal(10.0)
	say(full == float(LM.game.get("player", {}).get("hp", 100)) - 20.0 and is_equal_approx(pl.speed_mul, 1.12)
		and is_equal_approx(pl.natural_armor, 0.1) and is_equal_approx(pl.lamp.spot_range, pl.eye.lamp_reach() * 1.5)
		and pack == int(LM.game["carrying"].get("pack", 12)) - 2 and hands == int(LM.game["carrying"].get("slots", 2))
		and is_equal_approx(Game.hack_chance(0.0), odds - 0.05) and is_equal_approx(healed, 13.0),
		"the player as that character: %d health, %.2fx speed, 10%% natural armour, lamp x1.5, pack %d, hack odds %d%%, a heal of 10 comes to %.0f"
		% [full, pl.speed_mul, pack, roundi(Game.hack_chance(0.0) * 100.0), healed])
	for k in ["origin", "mutations", "skills"]:
		c[k] = was[k]
	pl.apply_character(c)
	pl.max_hp = max_hp
	pl.hp = hp
	say(pl.speed_mul == 1.0 and pl.natural_armor == 0.0 and is_equal_approx(Game.hack_chance(0.0), odds) and pl.lamp.spot_range == pl.eye.lamp_reach(),
		"and back as they were")


func _the_gate() -> void:
	var o := {"label": "Shut it down", "skill": {"mechanics": 2}}
	var either := {"skill": {"mechanics": 3, "hacking": 1}}
	var none := {"origin": "human", "skills": {}}
	var some := {"origin": "human", "skills": {"mechanics": 2}}
	say(not OptionGates.skilled(o, none) and OptionGates.skilled(o, some) and not OptionGates.skilled(either, some)
		and OptionGates.skilled(either, {"skills": {"hacking": 1}}) and OptionGates.skill_names(o) == "Mechanics 2"
		and OptionGates.skill_names(either) == "Mechanics 3 or Hacking 1",
		"an option with a skill gate needs that rank (or one of several: \"%s\")" % OptionGates.skill_names(either))


## Sense on the map: what is sensed is within reach, on this floor, and only monsters not yet seen and treasure.
func _sense() -> void:
	var reach := CharacterSheet.sense_reach(CharacterSheet.current()) * level.C
	var near := HudMap.sensed(level, pl, reach)
	var far := HudMap.sensed(level, pl, 1.0e6)
	var ok := far.size() >= near.size() and HudMap.sensed(level, pl, 0.0).is_empty()
	var monsters := 0
	for t in near:
		ok = ok and (t["at"] as Vector3).distance_to(pl.global_position) <= reach
		monsters += 1 if t["kind"] == "monster" else 0
	for a in level.actors:
		if a.seen:
			ok = ok and not far.any(func(t: Dictionary) -> bool: return t["at"] == a.global_position)
	say(ok, "Sense finds what is within %.0f m through walls: %d monster(s) and %d treasure(s) here, of %d on this floor"
		% [reach, monsters, near.size() - monsters, far.size()])
