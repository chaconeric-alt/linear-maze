extends Node
## State - the one record of the player's world, and the one thing that is saved (autoload "State"). Plain JSON: a
## world, with the characters who live in it, in four parts:
##   world       the day, world flags, and "home": the bunker and everything stored in it (banked credits, the
##               weapons and armour in the armoury, salvage, trophies, what was bought and where it was put, the robot)
##   characters  the roster: each character ({"id", "name", "runs", "deaths", "best"}) and which one is "active"
##   run         the expedition under way: credits, haul, stats (Game reads and writes these through Game.credits and
##               the rest); cleared as a level is loaded (Game.reset)
##   levels      what each level remembers, by its key (LevelMemory): its own flags, the key cards found in it, the
##               panel options used, and what changed in it (taken, killed, opened, moved). Kept for as long as the
##               world, except a generated level's, which goes when the run that made it ends, and any level's on a
##               death there.
## Flags have a scope: a flag whose name starts "world:" is the world's and is seen everywhere; any other belongs to
## the level it was set in. Old levels' flags (a trap's "off", a door's "flag", a puzzle's) are level flags, as
## before: nothing is renamed.
## Every system reads and writes through here. Profile (the bunker) and Game (the run) are fronts over it, so no number
## is kept twice.
##
## A world is saved as user://saves/<world>.json: written to <world>.json.tmp, then renamed over the old one, which is
## kept as <world>.bak, so a crash never leaves half a save. Every save carries "v"; StateMigrations brings an older
## one up to date, a step at a time, as it is read, and nothing reads an old shape directly. Version 0 is the bunker
## file from before worlds (user://havenot_home.json): with no world saved yet, it becomes the first world, and the
## old file is left where it is. The self-test and --noprofile keep the state in memory and never touch the disk.
## SPEC.md 5.10.
class_name WorldState

const VERSION := 3
const DIR := "user://saves/"
const OLD_HOME := "user://havenot_home.json"
var data: Dictionary = {}
var world_name := "world"        # the file it is saved as (one world for now; the title screen will offer several)
var memory_only := false         # never read or write the disk (Debug.memory_profile: the self-test, --noprofile)
var level_key := ""              # the level being played, by its key (Main: enter_level)


func _ready() -> void:
	data = read_world(world_name)


## Forget the disk: a new world that lives in memory only (Main, when Debug.memory_profile is set).
func keep_in_memory() -> void:
	memory_only = true
	data = WorldState.blank()


# ------------------------------------------------------------------ the parts
func home() -> Dictionary:
	return data["world"]["home"]


func run() -> Dictionary:
	return data["run"]


## The character being played.
func character() -> Dictionary:
	for c in data["characters"]["roster"]:
		if c["id"] == data["characters"]["active"]:
			return c
	return {}


## A level is being loaded: the run's credits, haul and stats start again (as Game.reset always did).
func reset_run() -> void:
	data["run"] = WorldState.blank_run()


## A level is about to be played: its memory, under its key: what was left there last time, or a new one. `fresh`:
## start it afresh whatever was left (the bunker, which keeps its own record in the home).
func enter_level(key: String, fresh := false) -> void:
	level_key = key
	if fresh or not data["levels"].has(key):
		data["levels"][key] = WorldState.blank_memory()
	var m: Dictionary = data["levels"][key]
	m["visits"] = int(m.get("visits", 0)) + 1


## Forget what a level remembers: the next visit finds it as it was made.
func forget_level(key: String) -> void:
	data["levels"].erase(key)


## What the level being played remembers.
func memory() -> Dictionary:
	if not data["levels"].has(level_key):
		data["levels"][level_key] = WorldState.blank_memory()
	return data["levels"][level_key]


## Where a flag of that name is kept: the world's flags for "world:...", the level's own for any other.
func flags_for(name: String) -> Dictionary:
	return data["world"]["flags"] if name.begins_with("world:") else memory()["flags"]


func has_flag(name: String) -> bool:
	return flags_for(name).has(name)


## Set it; false if it was set already.
func set_flag(name: String) -> bool:
	var f := flags_for(name)
	if f.has(name):
		return false
	f[name] = true
	return true


## The key cards held: they belong to the level they were found in.
func keys() -> Dictionary:
	return memory()["keys"]


## The character being played retires: they leave the roster, and a new scavenger takes the bunker over. The world,
## the bunker and everything stored in it stay for them.
func retire() -> void:
	var roster: Array = data["characters"]["roster"]
	for c in roster.duplicate():
		if c["id"] == data["characters"]["active"]:
			roster.erase(c)
	WorldState.join(data)
	save()


## A new character joins the world and is the one played.
static func join(w: Dictionary, name := "") -> Dictionary:
	var chars: Dictionary = w["characters"]
	var n := int(chars.get("next", 1))
	var c := {"id": "c%d" % n, "name": name, "runs": 0, "deaths": 0, "best": 0}
	chars["next"] = n + 1
	chars["roster"].append(c)
	chars["active"] = c["id"]
	return c


# ------------------------------------------------------------------ new
static func blank() -> Dictionary:
	var w := {"v": VERSION, "world": {"name": "", "day": 0, "flags": {}, "home": WorldState.blank_home()},
		"characters": {"roster": [], "active": "", "next": 1}, "run": WorldState.blank_run(), "levels": {}}
	WorldState.join(w)
	return w


static func blank_home() -> Dictionary:
	return {"credits": 0, "weapons": [], "armor": 0, "salvage": {}, "trophies": [], "owned": {}, "decor": [], "robot": false}


static func blank_run() -> Dictionary:
	return {"credits": 0, "haul": {}, "stats": {"kills": 0, "treasure": 0, "treasure_total": 0, "secrets": 0, "time": 0.0}}


## What a level remembers (LevelMemory): its flags and key cards; the panel options used ("used": thing key -> {option:
## true}) and other marks; "sig", the shape of the level it was taken from; "things" (key -> what that thing says
## changed), "gone" (keys not to make again), "extra" (things made while playing, to make again: key -> {"e", "at",
## "yaw"}) and "extra_n"; "triggers" (which have gone off, the map explored, the rooms named); "visits".
static func blank_memory() -> Dictionary:
	return {"flags": {}, "keys": {}, "used": {}, "marks": {}, "sig": "", "things": {}, "gone": [], "extra": {}, "extra_n": 0, "triggers": {}, "visits": 0}


# ------------------------------------------------------------------ on disk
func save() -> void:
	if memory_only:
		return
	DirAccess.make_dir_recursive_absolute(DIR)
	var path := DIR + world_name + ".json"
	var f := FileAccess.open(path + ".tmp", FileAccess.WRITE)
	if f == null:
		push_error("State: cannot write %s.tmp (%s)" % [path, error_string(FileAccess.get_open_error())])
		return
	f.store_string(to_json())
	f.close()
	if FileAccess.file_exists(path):
		if FileAccess.file_exists(DIR + world_name + ".bak"):
			DirAccess.remove_absolute(DIR + world_name + ".bak")
		DirAccess.rename_absolute(path, DIR + world_name + ".bak")
	DirAccess.rename_absolute(path + ".tmp", path)


func to_json() -> String:
	return JSON.stringify(data, " ")


## A saved world, brought up to date; a new one if the text is not a world at all.
static func from_json(text: String) -> Dictionary:
	var got: Variant = JSON.parse_string(text)
	return StateMigrations.up(got) if got is Dictionary else WorldState.blank()


## The world saved under that name; with none, the old bunker file made into one; with neither, a new world.
func read_world(name: String) -> Dictionary:
	for path in [DIR + name + ".json", DIR + name + ".bak", OLD_HOME]:
		if FileAccess.file_exists(path):
			var f := FileAccess.open(path, FileAccess.READ)
			var got: Variant = JSON.parse_string(f.get_as_text()) if f else null
			if got is Dictionary:
				return StateMigrations.up(got)
			push_warning("State: %s is not a saved world; trying the next" % path)
	return WorldState.blank()
