extends RefCounted
## StateMigrations - brings a saved world up to the current version (State.VERSION), one step at a time, as it is
## read, so nothing in the game ever reads an old shape. Each step is one small function that knows exactly two
## shapes, the one before and the one after; it writes the new shape out in full rather than calling State.blank(),
## which will change with later versions. A save newer than this game is left as it is (and warned about).
class_name StateMigrations

const CURRENT := 3


static func up(d: Dictionary) -> Dictionary:
	var v := int(d.get("v", 0))
	if v > CURRENT:
		push_warning("State: this save is version %d, newer than this game (%d)" % [v, CURRENT])
	while v < CURRENT:
		match v:
			0:
				d = v0_to_v1(d)
			1:
				d = v1_to_v2(d)
			2:
				d = v2_to_v3(d)
		v = int(d.get("v", v + 1))
	return d


## Version 0 is the bunker file from before worlds (user://havenot_home.json), flat: credits, weapons, armor, salvage,
## trophies, owned, decor, robot, and the scavenger's record (runs, deaths, best). It becomes a world: the bunker
## fields its home, the record its one character's.
static func v0_to_v1(old: Dictionary) -> Dictionary:
	var home := {"credits": int(old.get("credits", 0)), "weapons": old.get("weapons", []), "armor": int(old.get("armor", 0)),
		"salvage": old.get("salvage", {}), "trophies": old.get("trophies", []), "owned": old.get("owned", {}),
		"decor": old.get("decor", []), "robot": bool(old.get("robot", false))}
	var who := {"id": "c1", "name": "", "runs": int(old.get("runs", 0)), "deaths": int(old.get("deaths", 0)), "best": int(old.get("best", 0))}
	return {"v": 1, "world": {"name": "", "day": 0, "flags": {}, "home": home},
		"characters": {"roster": [who], "active": "c1", "next": 2},
		"run": {"credits": 0, "haul": {}, "stats": {"kills": 0, "treasure": 0, "treasure_total": 0, "secrets": 0, "time": 0.0}, "keys": {}},
		"levels": {}}


## Version 2 keeps key cards in the memory of the level they were found in, not in the run; a level's memory holds its
## flags and keys. A version-1 save was made between levels, so its run's keys were empty: they go.
static func v1_to_v2(d: Dictionary) -> Dictionary:
	d["run"].erase("keys")
	for k in d["levels"]:
		var m: Dictionary = d["levels"][k]
		if not m.has("flags"):
			m["flags"] = {}
		if not m.has("keys"):
			m["keys"] = {}
	d["v"] = 2
	return d


## Version 3: levels remember. A level's memory gains the panel options used and its marks, the level's signature,
## what changed in its things, what is gone, what was made while playing, its triggers and its visits; a version-2
## memory had only flags and keys.
static func v2_to_v3(d: Dictionary) -> Dictionary:
	for k in d["levels"]:
		var m: Dictionary = d["levels"][k]
		for f in ["used", "marks", "things", "extra", "triggers"]:
			if not m.has(f):
				m[f] = {}
		for f in ["gone"]:
			if not m.has(f):
				m[f] = []
		if not m.has("sig"):
			m["sig"] = ""
		if not m.has("extra_n"):
			m["extra_n"] = 0
		if not m.has("visits"):
			m["visits"] = 0
	d["v"] = 3
	return d
