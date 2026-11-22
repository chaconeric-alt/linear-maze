extends RefCounted
## HomeCreation - making a new scavenger at the bunker's ledger (SPEC.md 5.22), as the 2D game's creation screen: a
## name, an origin, the mutations an origin rolls (once more if it allows), and the game's skill points spent on
## skills. A character not yet made plays as a Human with no skills; the ledger offers to make them until they are.
## Nothing is kept until "This is me": then the choices go into their record (State), and the player in the bunker
## is made over as them. The words are the game's (defs/home.json: make_*); the names are the game's
## (game.json "character": "names"); the rules are CharacterSheet's.
class_name HomeCreation

var home: Home
var draft: Dictionary = {}               # the character being made: name, origin, mutations, skills, seed, rerolls


func _init(h: Home) -> void:
	home = h


## True while the character being played has not been made yet.
func wanted() -> bool:
	return not bool(State.character().get("made", true))


## Start making them (or go on, if a draft is open) and show the panel.
func open() -> void:
	if draft.is_empty():
		var names: Array = CharacterSheet.rules().get("names", [])
		draft = {"name": str(names[randi() % names.size()]) if not names.is_empty() else "", "origin": CharacterSheet.ORIGIN,
			"mutations": [], "skills": {}, "seed": randi(), "rerolls": 0}
	_panel()


func another_name() -> void:
	var names: Array = CharacterSheet.rules().get("names", [])
	if names.size() > 1:
		draft["name"] = names[(names.find(draft["name"]) + 1) % names.size()]
	_panel()


## Choose an origin: its mutations are rolled (none for most), its rerolls given.
func choose_origin(id: String) -> void:
	var o: Dictionary = LM.defs.get("origins", {}).get(id, {})
	draft["origin"] = id
	draft["mutations"] = CharacterSheet.roll_mutations(id, int(draft["seed"]))
	draft["rerolls"] = int(o.get("rerolls", 0))
	_panel()


## Roll the mutations again, if the origin still allows it. False when it does not.
func reroll() -> bool:
	if int(draft.get("rerolls", 0)) <= 0:
		return false
	draft["rerolls"] = int(draft["rerolls"]) - 1
	draft["seed"] = (int(draft["seed"]) * 7919 + 104729) % 2147483647        # the 2D game's next seed
	draft["mutations"] = CharacterSheet.roll_mutations(draft["origin"], int(draft["seed"]))
	_panel()
	return true


## Skill points not yet spent.
func points_left() -> int:
	var spent := 0
	for id in draft.get("skills", {}):
		spent += int(draft["skills"][id])
	return int(CharacterSheet.rules().get("skill_points", 0)) - spent


## One point more in a skill. False with none left, or the skill at its max.
func add_skill(id: String) -> bool:
	if points_left() <= 0 or CharacterSheet.rank(draft, id) >= int(LM.defs.get("skills", {}).get(id, {}).get("max", 5)):
		return false
	draft["skills"][id] = CharacterSheet.rank(draft, id) + 1
	_panel()
	return true


func take_back() -> void:
	draft["skills"] = {}
	_panel()


## "This is me": the choices go into the record, the player is made over, the world is saved. False while points are
## left to spend.
func done() -> bool:
	if points_left() > 0:
		return false
	var c: Dictionary = State.character()
	for k in ["name", "origin", "mutations", "skills"]:
		c[k] = draft[k].duplicate(true) if draft[k] is Dictionary or draft[k] is Array else draft[k]
	c["made"] = true
	draft = {}
	if Game.player != null and is_instance_valid(Game.player):
		Game.player.apply_character(c)
	State.save()
	Game.hud.close_panel()
	Game.say(home.word("made_say") % [c["name"], CharacterSheet.origin_name(c)], "good")
	Game.changed.emit()
	return true


func _panel() -> void:
	var o: Dictionary = LM.defs.get("origins", {}).get(draft["origin"], {})
	var muts: Array = draft["mutations"].map(func(m: Variant) -> String:
		var md: Dictionary = LM.defs.get("mutations", {}).get(str(m), {})
		return "%s (%s)" % [md.get("name", m), str(md.get("text", "")).trim_suffix(".")])
	var skills: Array = []
	for id in LM.defs.get("skills", {}):
		var sk: Dictionary = LM.defs["skills"][id]
		skills.append(home.word("make_skill_line") % [sk.get("name", id), CharacterSheet.rank(draft, id), sk.get("text", "")])
	var text: String = home.word("make_text") % [draft["name"], o.get("name", draft["origin"]), o.get("text", ""), CharacterSheet.line(draft),
		"; ".join(muts) if not muts.is_empty() else home.word("list_none"), points_left(), "\n".join(skills)]
	home.panel(home.word("ledger_kicker"), home.word("make_title"), text, _options())


func _options() -> Array:
	var opts: Array = [{"label": home.word("make_name"), "do": another_name}]
	for id in LM.defs.get("origins", {}):
		if id != draft["origin"]:
			opts.append({"label": home.word("make_origin") % LM.defs["origins"][id].get("name", id), "do": choose_origin.bind(id)})
	if int(draft.get("rerolls", 0)) > 0:
		opts.append({"label": home.word("make_reroll"), "do": reroll})
	for id in LM.defs.get("skills", {}):
		var sk: Dictionary = LM.defs["skills"][id]
		if points_left() > 0 and CharacterSheet.rank(draft, id) < int(sk.get("max", 5)):
			opts.append({"label": home.word("make_skill") % [sk.get("name", id), CharacterSheet.rank(draft, id)], "do": add_skill.bind(id)})
	if not draft["skills"].is_empty():
		opts.append({"label": home.word("make_unspend"), "do": take_back})
	if points_left() <= 0:
		opts.append({"label": home.word("make_done"), "do": done})
	opts.append({"label": home.word("make_later"), "do": Game.hud.close_panel})
	return opts
