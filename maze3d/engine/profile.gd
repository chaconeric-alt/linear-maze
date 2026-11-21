extends Node
## Profile - what a scavenger keeps between expeditions: the bunker, and everything in it. A front over State (the
## saved world, engine/state.gd): the bunker is State's world.home, and Profile.d is that very dictionary, so home.gd
## and the tests read and write it as they always did; the scavenger's record (runs, deaths, best) belongs to the
## character being played (record()). Levels do not touch it; engine/home.gd and Main do.
##   credits   banked salvage money (what the bunker's catalogue is paid from)
##   weapons   every weapon ever brought home (the armoury rack); armor: the best vest brought home, 0..100
##   salvage   item id -> how many brought home (the robot is repaired out of these)
##   trophies  item ids for the trophy case, in the order they were found
##   owned     catalogue model -> how many bought;  decor: what has been put down, and where
##   robot     the robot in the robot room has been repaired

var d: Dictionary:
	get:
		return State.home()
var memory_only: bool:          # never read or write the disk (Debug.memory_profile: the self-test, --noprofile)
	get:
		return State.memory_only
var sortie := false             # the next level is entered from the bunker's lift: take the armoury along


func blank() -> Dictionary:
	return WorldState.blank_home()


## Forget the disk: a new world that lives in memory only (Main, when Debug.memory_profile is set).
func keep_in_memory() -> void:
	State.keep_in_memory()


func save() -> void:
	State.save()


func count(id: String) -> int:
	return int(d["salvage"].get(id, 0))


## How the character being played has done: runs, deaths, best.
func record() -> Dictionary:
	return State.character()


## Coming home from an expedition alive: everything carried goes into the bunker.
func bank(credits: int, weapons: Array, armor: float, haul: Dictionary) -> void:
	d["credits"] = int(d["credits"]) + credits
	var r := record()
	r["best"] = maxi(int(r.get("best", 0)), credits)
	r["runs"] = int(r.get("runs", 0)) + 1
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


## The scavenger retires. The bunker and everything in it stay, for whoever takes it over (State.retire).
func retire() -> void:
	State.retire()
