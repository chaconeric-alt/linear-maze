extends Node
## Profile - what a scavenger keeps between expeditions: the bunker, and everything in it.
## Saved in user://havenot_home.json. Levels do not touch it; engine/home.gd and Main do.
##   credits   banked salvage money (what the bunker's catalogue is paid from)
##   weapons   every weapon ever brought home (the armoury rack); armor: the best vest brought home, 0..100
##   salvage   item id -> how many brought home (the robot is repaired out of these)
##   trophies  item ids for the trophy case, in the order they were found
##   owned     catalogue model -> how many bought;  decor: what has been put down, and where
##   robot     the robot in the robot room has been repaired;  runs / deaths: how it has gone

const PATH := "user://havenot_home.json"
var d: Dictionary = {}
var memory_only := false        # the self-test: never read or write the real file
var sortie := false             # the next level is entered from the bunker's lift: take the armoury along


func blank() -> Dictionary:
	return {"credits": 0, "weapons": [], "armor": 0, "salvage": {}, "trophies": [], "owned": {}, "decor": [], "robot": false, "runs": 0, "deaths": 0, "best": 0}


func _ready() -> void:
	d = blank()
	if OS.get_cmdline_user_args().has("--selftest") or OS.get_cmdline_user_args().has("--noprofile"):
		memory_only = true
		return
	var got: Variant = LM.read_json(PATH)
	if got is Dictionary:
		for k in got:
			d[k] = got[k]


func save() -> void:
	if memory_only:
		return
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(d, " "))


func count(id: String) -> int:
	return int(d["salvage"].get(id, 0))


## Coming home from an expedition alive: everything carried goes into the bunker.
func bank(credits: int, weapons: Array, armor: float, haul: Dictionary) -> void:
	d["credits"] = int(d["credits"]) + credits
	d["best"] = maxi(int(d["best"]), credits)
	d["runs"] = int(d["runs"]) + 1
	for w in weapons:
		if not d["weapons"].has(w):
			d["weapons"].append(w)
	d["armor"] = maxi(int(d["armor"]), int(armor))
	for id in haul:
		d["salvage"][id] = count(id) + int(haul[id])
		if LM.get_def("items", id).get("trophy", false):
			for i in int(haul[id]):
				d["trophies"].append(id)
	save()


func died() -> void:
	d["deaths"] = int(d["deaths"]) + 1
	save()


## Leaving by the lift: what the armoury holds goes with you, and the supply locker tops you up.
func outfit(cfg: Dictionary) -> void:
	var ws: Array = cfg.get("weapons", []).duplicate()
	for w in d["weapons"]:
		if not ws.has(w):
			ws.append(w)
	cfg["weapons"] = ws
	cfg["armor"] = maxf(float(cfg.get("armor", 0.0)), float(d["armor"]))
	var am: Dictionary = cfg.get("ammo", {}).duplicate()
	for w in ws:
		var kind: Variant = LM.get_def("weapons", w).get("ammo")
		if kind != null:
			am[kind] = maxi(int(am.get(kind, 0)), int(LM.defs.get("ammo", {}).get(kind, {}).get("max", 20)) / 2)
	cfg["ammo"] = am


func retire() -> void:
	d = blank()
	save()
