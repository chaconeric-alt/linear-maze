extends RefCounted
## Arrival - making the player as a level is entered, in one of four ways (Main._load):
##   coming back to a save   what they carried, where they stood (SavePoint)
##   travelling              from another level of the expedition: what they carried, as they were, at a named way in
##                           of this one (the travel effect; SPEC.md 5.19)
##   by the bunker's lift    with the armoury's outfit (Profile.outfit)
##   otherwise               with the game's and the level's settings, at the level's start
## `arrive` names the way in ({"start": "<name>"} in the level's data); "" or a name the level does not have is its start.
class_name Arrival


## Make the player, put them in the level and set them up. `back`: a save's place; `carry`: the player as they left the
## last level (SavePoint.player_of), when travelling.
static func make(level: Level, data: Dictionary, back: Dictionary, carry: Dictionary, arrive: String) -> Player:
	var pl := Player.new()
	level.add_child(pl)
	Arrival.place(level, pl, arrive)
	var cfg: Dictionary = LM.game.get("player", {}).duplicate(true)
	for k in data.get("player", {}):
		cfg[k] = data["player"][k]
	if back.has("player"):
		SavePoint.fit(cfg, back["player"])
	elif not carry.is_empty():
		SavePoint.fit(cfg, carry)                    # travelling: what they carried, not the armoury's outfit
	elif Profile.sortie and not data.get("home", false):      # they came by the bunker's lift: the armoury comes too
		Profile.outfit(cfg)
	Profile.sortie = false
	pl.setup(level, cfg)
	if back.has("player"):
		SavePoint.put_back(pl, back["player"])
	elif not carry.is_empty():
		SavePoint.put_back(pl, carry, false)         # as they were (health, the weapon in hand), but here
	return pl


## At the named way in, facing the way it faces; or at the level's start.
static func place(level: Level, pl: Node3D, arrive: String) -> void:
	var a: Dictionary = level.arrival(arrive) if arrive != "" else {}
	if arrive != "" and a.is_empty():
		push_warning("Level %s has no way in called '%s': the player starts at its start" % [level.data.get("id", "?"), arrive])
	var cell: Vector2i = a.get("cell", level.start_cell)
	var storey: int = int(a.get("level", level.start_level))
	pl.position = level.center(cell, 0.05 + storey * level.H)
	pl.rotation.y = float(a.get("yaw", level.start_yaw)) + PI
