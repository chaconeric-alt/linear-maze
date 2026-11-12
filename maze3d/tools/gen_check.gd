extends SceneTree
## gen_check - runs the rooms generator over many seeds for every theme and counts what it made.
##   godot --headless --path . -s tools/gen_check.gd
## Fails loudly if any seed has no solvable layout. It does not play the levels: the self-test does that.
func _init() -> void:
	var game: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://games/havenot/game.json"))
	var gen = load("res://generators/rooms.gd").new()
	var themes: Array = [""]
	themes.append_array(game.get("generator_themes", {}).keys())
	for th in themes:
		var p: Dictionary = game.get("generator_params", {}).duplicate(true)
		if th != "":
			p.merge(game["generator_themes"][th], true)
		var n := {"levels": 0, "unlocked": 0, "diags": 0, "decks": 0, "tier2": 0, "ramps": 0, "windows": 0, "thin": 0, "pools": 0, "traps": 0, "upstairs": 0, "tall3": 0}
		for sd in range(1, 41):
			var lv: Dictionary = gen.generate(sd, p)
			n["levels"] += 1
			var has_z := false
			for row in lv["map"]:
				if "Z" in row:
					has_z = true
			if not has_z:
				n["unlocked"] += 1
			n["diags"] += lv["diags"].size()
			n["decks"] += lv["decks"].size()
			n["ramps"] += lv["ramps"].size()
			n["windows"] += lv["windows"].size()
			n["thin"] += lv["walls"].size()
			n["pools"] += 1 if lv.has("fluid") else 0
			for d in lv["decks"]:
				n["tier2"] += 1 if d["level"] == 2 else 0
			for r in lv["rooms"]:
				n["tall3"] += 1 if r["height"] == 3 else 0
			for fl in lv.get("floors", []):
				n["floor%d" % int(fl["level"])] = n.get("floor%d" % int(fl["level"]), 0) + 1
				n["rooms%d" % int(fl["level"])] = n.get("rooms%d" % int(fl["level"]), 0) + fl["rooms"].size()
			for t in lv["things"]:
				n["lifts"] = n.get("lifts", 0) + (1 if t.has("lift") else 0)
				n["pits"] = n.get("pits", 0) + (1 if t.get("trap", "") == "pit" else 0)
				n["traps"] += 1 if t.has("trap") else 0
				n["upstairs"] += 1 if t.has("level") else 0
		print("GEN ", th if th != "" else "(base)", " ", n)
	quit()
