extends RefCounted
## InstallationGen - a level's programme written from a setting (the generation review, 25 Nov: "generate a purpose
## before generating a floor plan"; SPEC 6.4). A level file with "setting" (an id, or a list: the seed picks one; the
## older key "archetype" is read too) is written as it is entered, from the same seed the programme is laid out from
## (ProgrammeGen.entered), into an ordinary programme level: then laid out, furnished and proved as any other. From the
## setting (InstallationSettings: defs "settings" with their clusters and room types, put together; the code still names
## the whole an "arch", its clusters "wings" and its room types "roles"): its spine of rooms from the way in to its core
## (a step may list several room types: the seed picks one), its wings (those it must have, and as many more of the rest
## as its count says), each room's name, style, size, purpose and things; who lives there (by weight, a room left empty
## now and then, the way in always); its systems and the state each starts in (power off: the core is shut until the
## generator is started; on: it is locked by a card in one of the rooms that keep cards); a generator panel, a security
## panel (it needs power) and the core's terminal; and its gate, with a way round it (InstallationWriter). From its
## contradiction (defs "contradictions", one of those the setting lists): what it was for and what it does now, which
## monsters it favours, and its words. The words (InstallationWords) give its name, the intro, the memos, the
## announcements heard on entering some rooms, and the core's directive. Every choice comes from streams of this seed of
## their own (Dice.derive).
class_name InstallationGen

const FIXED := ["place", "firm", "staff", "core", "name"]      # words chosen once for the whole installation, in order
const PA_ROOMS := 3              # rooms whose entering brings an announcement, at most


## The level written: a programme, its systems, triggers, objectives and words; "installation" says what was chosen.
## The level as it was if its setting is not one of the game's.
static func write(level: Dictionary, seed_value: int) -> Dictionary:
	var pick := Dice.derive(seed_value, "installation")
	var ids: Variant = level.get("setting", level.get("archetype", ""))
	var arch_id := str(Dice.pick(pick, ids) if ids is Array else ids)
	var arch := InstallationSettings.resolve(arch_id)
	if arch.is_empty():
		push_error("level '%s': no setting '%s'" % [level.get("id", ""), arch_id])
		return level
	var contra_id := str(Dice.pick(pick, arch.get("contradictions", [""])))
	var contra: Dictionary = LM.defs.get("contradictions", {}).get(contra_id, {})
	var words := InstallationGen._words(arch, contra, Dice.derive(seed_value, "installation words"))
	var said := Dice.derive(seed_value, "installation said")
	var name := InstallationWords.line("name", words, said)
	var systems := InstallationGen._systems(arch, Dice.derive(seed_value, "installation systems"))
	var w := InstallationWriter.new(arch, contra, words, said, Dice.derive(seed_value, "installation rooms"))
	var prog := w.programme(systems)
	var out: Dictionary = level.duplicate(true)
	out.erase("archetype")
	out.erase("setting")
	out["name"] = name
	out["kit"] = arch.get("kit", out.get("kit", ""))
	out["style"] = arch.get("style", out.get("style", "corridor"))
	out["intro"] = "%s. %s" % [name, InstallationWords.line("slogan", words, said)]
	out["systems"] = systems
	out["programme"] = prog
	out["triggers"] = out.get("triggers", []) + w.announcements(PA_ROOMS)
	out["objectives"] = [{"text": "Find out what %s is doing: reach the %s." % [name, w.core_name], "done": "core_reached"},
		{"text": "Leave the way you came in."}]
	out["installation"] = {"archetype": arch_id, "contradiction": contra_id, "core_lock": w.core_lock,
		"mandate": words["mandate"][0], "now": words["now"][0], "gate": w.gate}
	return out


# ------------------------------------------------------------------ as a generator (game.json "generators")
## A random installation (the title screen and the bunker's lift): written from one of the game's settings, the
## theme's ("gen:installation:<setting>") or any (the seed's pick), and laid out from the seed; {} if the game has no
## settings, or no layout came of it. Its level has no test of its own, so the self-test plays the standard parts.
func generate(seed_value: int, params: Dictionary) -> Dictionary:
	var ids: Array = InstallationSettings.ids()
	if ids.is_empty():
		return {}
	var theme := str(params.get("theme", ""))
	var level := {"id": "written-%d" % seed_value, "setting": [theme] if ids.has(theme) else ids, "style": "corridor",
		"legend": {}, "things": [], "objectives": [], "triggers": []}
	return ProgrammeGen.make(InstallationGen.write(level, seed_value), seed_value)


## What the title screen and the bunker's lift offer of it (GeneratedPlaces): a heading, the place that leaves the
## setting to the seed, and one per setting, by its name. The heading and that place's name are the game's words
## (game.json "words": "written_title", "written_any").
func menu() -> Dictionary:
	var words: Dictionary = LM.game.get("words", {})
	var themes: Array = []
	for id in InstallationSettings.ids():
		themes.append([InstallationSettings.name_of(id), id])
	return {"title": str(words.get("written_title", "WRITTEN INSTALLATIONS")), "any": str(words.get("written_any", "Any")),
		"themes": themes}


## The setting's words with its contradiction's, and the few chosen once for the whole place (its name, its core's,
## what it calls its people) fixed, so that every line says the same.
static func _words(arch: Dictionary, contra: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var words: Dictionary = arch.get("words", {}).duplicate(true)
	words.merge(contra.get("words", {}).duplicate(true), true)
	for k in FIXED:
		if words.has(k):
			words[k] = [InstallationWords.line(k, words, rng)]
	for k in ["mandate", "now"]:                   # what it was for and what it does now, as its words put them
		words[k] = [InstallationWords.expand(str(contra.get(k, "")), words, rng)]
	return words


## The level's systems: each the setting names, starting in its state, or one of its states (the seed's pick), with
## what it does as it comes to a state ("do").
static func _systems(arch: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var out := {}
	var given: Dictionary = arch.get("systems", {})
	for n in given:
		var start: Variant = given[n].get("start", "")
		out[n] = {"start": str(Dice.pick(rng, start) if start is Array else start)}
		if given[n].has("do"):
			out[n]["do"] = given[n]["do"].duplicate(true)
	return out
