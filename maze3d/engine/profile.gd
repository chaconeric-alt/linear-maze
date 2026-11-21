extends Node
## Profile - what a scavenger keeps between expeditions: the bunker, and everything in it. A front over State (the
## saved world, engine/state.gd): the bunker is State's world.home, and Profile.d is that very dictionary, so home.gd
## and the tests read and write it as they always did; the scavenger's record (runs, deaths, best) belongs to the
## character being played (record()). Levels do not touch it; engine/home.gd and Main do.
##   credits   banked salvage money (what the bunker's catalogue is paid from)
##   weapons   every weapon ever brought home (the armoury rack); armor: the best vest brought home, 0..100
##   gear      gear brought home or bought (backpacks, slings), to wear when leaving (Carrying)
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


## How the character being played has done: runs, deaths, best; and their load (load_of).
func record() -> Dictionary:
	return State.character()


## Coming home from an expedition alive: everything carried goes into the bunker: the weapons in hand to the rack,
## the gear worn to the store, the vest to the stand; out of the pack, a weapon to the rack, gear to the store, the rest
## to the salvage (trophies on show too). What they had in hand and wore is their load for next time.
func bank(credits: int, weapons: Array, armor: float, haul: Dictionary, gear: Array = []) -> void:
	d["credits"] = int(d["credits"]) + credits
	var r := record()
	r["best"] = maxi(int(r.get("best", 0)), credits)
	r["runs"] = int(r.get("runs", 0)) + 1
	for w in weapons:
		_keep("weapons", w)
	d["armor"] = maxi(int(d["armor"]), int(armor))
	for id in haul:
		var item := LM.get_def("items", id)
		match item.get("kind", "treasure"):
			"weapon":
				_keep("weapons", item.get("weapon", id))
			"gear":
				_keep("gear", id)
			_:
				d["salvage"][id] = count(id) + int(haul[id])
				if item.get("trophy", false):
					for i in int(haul[id]):
						d["trophies"].append(id)
	for g in gear:
		_keep("gear", g)
	r["load"] = {"weapons": weapons.duplicate(), "gear": gear.duplicate()}
	save()


## Put it in that part of the bunker's store (the rack, the gear) if it is not there already.
func _keep(part: String, id: String) -> void:
	if not d.has(part):
		d[part] = []
	if not d[part].has(id):
		d[part].append(id)


# ------------------------------------------------------------------ the load (Carrying; the rack: HomeArmoury)
## What the character takes when they leave the bunker: {"weapons", "gear"}, what they came home with or chose at the
## rack. A character with none (a new one) takes the game's own kit.
func load_of() -> Dictionary:
	var r := record()
	if not r.has("load"):
		r["load"] = {"weapons": [], "gear": []}
	return r["load"]


## The gear in the load that the bunker has, one a place: what they will wear.
func worn() -> Array:
	return Carrying.wearable(load_of()["gear"].filter(func(g: String) -> bool: return d.get("gear", []).has(g)))


## Take that weapon when leaving: false if their hands are full.
func carry(w: String) -> bool:
	var ws: Array = load_of()["weapons"]
	if not ws.has(w):
		if ws.size() >= Carrying.slots(worn()):
			return false
		ws.append(w)
		save()
	return true


func leave(w: String) -> void:
	load_of()["weapons"].erase(w)
	save()


## Wear that gear when leaving, in place of what was chosen for its place.
func wear(g: String) -> void:
	var gs: Array = load_of()["gear"]
	for x in gs.duplicate():
		if Carrying.wear_of(x) == Carrying.wear_of(g):
			gs.erase(x)
	gs.append(g)
	save()


## Not wear it: the hands it gave are given up too, the weapons chosen last first.
func take_off(g: String) -> void:
	load_of()["gear"].erase(g)
	var ws: Array = load_of()["weapons"]
	while ws.size() > Carrying.slots(worn()):
		ws.pop_back()
	save()


## Leaving by the lift: the character's load, as far as the bunker has it and their hands hold it (with no weapon
## chosen, the game's own kit, the handgun); the gear they chose; the vest on the stand; and the supply locker tops up
## every weapon taken.
func outfit(cfg: Dictionary) -> void:
	var gear := worn()
	var kit: Array = cfg.get("weapons", [])
	var ws: Array = []
	for w in load_of()["weapons"]:
		if ws.size() < Carrying.slots(gear) and not ws.has(w) and (d["weapons"].has(w) or kit.has(w)):
			ws.append(w)
	if ws.is_empty():
		ws = kit.slice(0, Carrying.slots(gear))
	cfg["weapons"] = ws
	cfg["gear"] = gear
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
