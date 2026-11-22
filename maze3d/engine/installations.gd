extends RefCounted
## Installations - places made of several levels, from the game's defs ("installations"), SPEC.md 5.19:
##   {"descent": {"name": "The Descent", "text": "...", "levels": ["descent_1", "descent_2"],
##                "entrances": [{"name": "The front gate", "level": "descent_1"},
##                              {"name": "The service shaft", "level": "descent_1", "arrive": "shaft"}]}}
## Its levels are joined by the travel effect (lifts, stairs, panels), which carries the expedition from one to another;
## each level is remembered on its own. An entrance is a level and a named way in ({"start": "<name>"} in that level;
## none: its start). The bunker's lift and the title screen go to an installation by an entrance; overland travel, when
## it comes, can arrive by another. A level that is in no installation is a place of its own, as before.
class_name Installations


static func all() -> Dictionary:
	return LM.defs.get("installations", {})


static func has(id: String) -> bool:
	return Installations.all().has(id)


static func name_of(id: String) -> String:
	return str(Installations.all().get(id, {}).get("name", id))


## Its ways in: [{"name", "level", "arrive"}], the first being the usual one.
static func entrances(id: String) -> Array:
	return Installations.all().get(id, {}).get("entrances", [])


## What to start to come in by entrance i: "<level>" or "<level>@<way in>", as Main.start_level takes it.
static func start_of(id: String, i := 0) -> String:
	var es := Installations.entrances(id)
	if es.is_empty():
		var lvls: Array = Installations.all().get(id, {}).get("levels", [])
		return str(lvls[0]) if not lvls.is_empty() else ""
	var e: Dictionary = es[clampi(i, 0, es.size() - 1)]
	return str(e.get("level", "")) + ("@" + str(e["arrive"]) if str(e.get("arrive", "")) != "" else "")


## The installation a level belongs to, or "".
static func of_level(level_id: String) -> String:
	for id in Installations.all():
		if (Installations.all()[id].get("levels", []) as Array).has(level_id):
			return id
	return ""


## "<level>@<way in>" split: [level id, way in ("" for the level's start)].
static func split(target: String) -> Array:
	var at := target.find("@")
	return [target, ""] if at < 0 else [target.substr(0, at), target.substr(at + 1)]
