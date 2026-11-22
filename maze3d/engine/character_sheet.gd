extends RefCounted
## CharacterSheet - what a character is and what that does (SPEC.md 5.22). A character's record in State keeps only
## its choices: "origin", "mutations" and "skills" (rank by id). Everything else is worked out from the game's data
## each time it is asked for, so a change to the data reaches every character, old ones included:
##   defs "stats"      each stat ("gives": what one point over the game's base gives)
##   defs "skills"     each skill ("max" rank; "gives": what one rank gives)
##   defs "origins"    each origin's starting stats; "mutations": [least, most] rolled at creation, "rerolls"
##   defs "mutations"  each mutation's "stats" (added) and "gives" (flat)
##   game "character"  {"base": 3, "min": 1, "max": 7, "skill_points": 3, "sense_reach": 7}
## What a thing "gives" is a number the engine reads by name, the same name from a stat, a skill or a mutation, all
## added together (gives(c, name)): "hp" (health), "move" (a fraction faster), "pack" (bulk), "slots" (hands),
## "hack" (a hack's chance), "heal" (a fraction more from healing), "sense" (cells of sensing reach), "armor" (a
## fraction off every hit), "lamp" (a fraction more lamp reach). A new skill or ability is data, using these, or a new
## name read where it matters.
class_name CharacterSheet

const ORIGIN := "human"          # a character from before characters had origins (and the 2D game's default)


static func rules() -> Dictionary:
	return LM.game.get("character", {})


static func base() -> int:
	return int(CharacterSheet.rules().get("base", 3))


## The character's stats now: its origin's, plus its mutations', kept within the game's min and max.
static func stats(c: Dictionary) -> Dictionary:
	var out := {}
	for id in LM.defs.get("stats", {}):
		out[id] = CharacterSheet.base()
	var o: Dictionary = LM.defs.get("origins", {}).get(str(c.get("origin", ORIGIN)), {})
	for id in o.get("stats", {}):
		out[id] = int(o["stats"][id])
	for m in c.get("mutations", []):
		var md: Dictionary = LM.defs.get("mutations", {}).get(str(m), {})
		for id in md.get("stats", {}):
			out[id] = int(out.get(id, CharacterSheet.base())) + int(md["stats"][id])
	var r := CharacterSheet.rules()
	for id in out:
		out[id] = clampi(int(out[id]), int(r.get("min", 1)), int(r.get("max", 7)))
	return out


## Its rank in a skill (0 without it), never over the skill's max.
static func rank(c: Dictionary, skill: String) -> int:
	var mx := int(LM.defs.get("skills", {}).get(skill, {}).get("max", 5))
	return clampi(int(c.get("skills", {}).get(skill, 0)), 0, mx)


## Everything that gives `what`, added up: each stat's per point over the base (less under it), each skill's per rank,
## each mutation's once.
static func gives(c: Dictionary, what: String) -> float:
	var n := 0.0
	var st := CharacterSheet.stats(c)
	for id in st:
		n += float(LM.defs["stats"][id].get("gives", {}).get(what, 0.0)) * (int(st[id]) - CharacterSheet.base())
	for id in LM.defs.get("skills", {}):
		n += float(LM.defs["skills"][id].get("gives", {}).get(what, 0.0)) * CharacterSheet.rank(c, id)
	for m in c.get("mutations", []):
		n += float(LM.defs.get("mutations", {}).get(str(m), {}).get("gives", {}).get(what, 0.0))
	return n


## How far the character senses treasure and monsters, in cells: the game's reach at the base, and what Sense gives.
static func sense_reach(c: Dictionary) -> float:
	return maxf(0.0, float(CharacterSheet.rules().get("sense_reach", 0.0)) + CharacterSheet.gives(c, "sense"))


## The character being played (State's active one), or a plain one where there is none.
static func current() -> Dictionary:
	var c: Dictionary = State.character()
	return c if not c.is_empty() else {"origin": ORIGIN}


## Its origin's name ("Mutant Hyena").
static func origin_name(c: Dictionary) -> String:
	var id := str(c.get("origin", ORIGIN))
	return str(LM.defs.get("origins", {}).get(id, {}).get("name", id))


## The stats in a line, as the bunker's ledger and the creation screen show them: "Speed 3 · Sense 3 · ...".
static func line(c: Dictionary) -> String:
	var st := CharacterSheet.stats(c)
	var bits: Array = []
	for id in st:
		bits.append("%s %d" % [LM.defs["stats"][id].get("name", id), st[id]])
	return " · ".join(bits)


## The skills it has, in a line ("Hacking 2 · Medicine 1"), or "" with none.
static func skills_line(c: Dictionary) -> String:
	var bits: Array = []
	for id in LM.defs.get("skills", {}):
		if CharacterSheet.rank(c, id) > 0:
			bits.append("%s %d" % [LM.defs["skills"][id].get("name", id), CharacterSheet.rank(c, id)])
	return " · ".join(bits)


## An origin's mutations, rolled from a seed: as many as its "mutations" says ([least, most]), each different, the same
## for the same seed every time (the creation screen rolls again with a new seed).
static func roll_mutations(origin: String, seed: int) -> Array:
	var span: Array = LM.defs.get("origins", {}).get(origin, {}).get("mutations", [])
	var pool: Array = LM.defs.get("mutations", {}).keys()
	if span.size() < 2 or pool.is_empty():
		return []
	var r := RandomNumberGenerator.new()
	r.seed = seed
	var n := mini(r.randi_range(int(span[0]), int(span[1])), pool.size())
	var out: Array = []
	while out.size() < n:
		var id: String = pool[r.randi() % pool.size()]
		if not out.has(id):
			out.append(id)
	return out
