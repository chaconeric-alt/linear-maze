extends RefCounted
## GeneratedPlaces - what the title screen and the bunker's lift offer of the game's generators (game.json
## "generators"): for each, a heading and its places, each [label, what to start]: "gen:<generator>" leaves everything
## to the seed, "gen:<generator>:<theme>" is one of its themes. A generator may say its own (its menu(): "title",
## "any" and "themes" as [label, theme]); one that does not offers the game's generator_themes (the rooms generator),
## under the heading and the label for "any" that the caller gives, as the title screen and the lift always did.
class_name GeneratedPlaces


## A generator's heading and places (see above).
static func of(gid: String, title: String, any: String) -> Dictionary:
	var g: Object = LM.generators.get(gid)
	if g != null and g.has_method("menu"):
		var m: Dictionary = g.menu()
		var own: Array = [[str(m.get("any", any)), "gen:" + gid]]
		for th in m.get("themes", []):
			own.append([str(th[0]), "gen:%s:%s" % [gid, th[1]]])
		return {"title": str(m.get("title", title)), "places": own}
	var places: Array = [[any, "gen:" + gid]]
	var themes: Dictionary = LM.game.get("generator_themes", {})
	for th in themes:
		if themes[th].get("menu", true):          # kept off the menus; still playable with --level=gen:<generator>:<theme>
			places.append([str(themes[th].get("title", th)), "gen:%s:%s" % [gid, th]])
	return {"title": title, "places": places}


## What a generated place is called ("gen:rooms:crypt" is "Crypt"; "gen:rooms", `any`), as its menu names it; a theme
## kept off the menus by the game's generator_themes title, else its id.
static func name_of(id: String, any: String) -> String:
	var bits := id.substr(4).split(":")
	for p in GeneratedPlaces.of(bits[0], "", any)["places"]:
		if p[1] == id:
			return str(p[0])
	if bits.size() > 1:
		return str(LM.game.get("generator_themes", {}).get(bits[1], {}).get("title", bits[1]))
	return any
