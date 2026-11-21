extends RefCounted
## SavePoint - the place a save comes back to, and putting the player back there. A save is the whole world (State);
## this is the part of it that says where, kept in the run as "where": the level being played (its id, and the seed a
## generated one was made from), whether an expedition was under way, and the player as they stood (place, facing,
## health, armour, the weapons and ammo carried, the one in hand). The level itself comes back from its memory
## (LevelMemory), which Main takes into the world before saving. Main saves (F9, the pause screen's Save, arriving in
## a level, leaving for the title, quitting) and comes back (F10, the title screen's Restore from save). SPEC.md 5.15.
class_name SavePoint


## Where the player is: the level (by its id, its seed, its key) and the player as they stand.
static func where(id: String, level_seed: int, key: String, in_run: bool, pl: Player) -> Dictionary:
	return {"id": id, "seed": level_seed, "level": key, "in_run": in_run, "player": SavePoint.player_of(pl)}


## The player as they stand.
static func player_of(pl: Player) -> Dictionary:
	var p := pl.global_position
	return {"at": [p.x, p.y, p.z], "yaw": pl.rotation.y, "pitch": pl.pitch, "hp": pl.hp, "max_hp": pl.max_hp,
		"armor": pl.armor, "weapons": pl.weapons.duplicate(), "ammo": pl.ammo.duplicate(), "current": pl.current}


## What they carried, into the settings the player is made from (in place of the armoury's outfit, which is for
## leaving the bunker, not for coming back to a save).
static func fit(cfg: Dictionary, p: Dictionary) -> void:
	cfg["hp"] = float(p.get("max_hp", cfg.get("hp", 100.0)))
	cfg["armor"] = float(p.get("armor", 0.0))
	cfg["weapons"] = p.get("weapons", []).duplicate()
	cfg["ammo"] = p.get("ammo", {}).duplicate()


## Put the player, once made, back where they stood and as they were.
static func put_back(pl: Player, p: Dictionary) -> void:
	var at: Array = p.get("at", [])
	if at.size() == 3:
		pl.global_position = Vector3(float(at[0]), float(at[1]), float(at[2]))
	pl.rotation.y = float(p.get("yaw", pl.rotation.y))
	pl.pitch = float(p.get("pitch", 0.0))
	pl.hp = float(p.get("hp", pl.hp))
	if not pl.weapons.is_empty():
		pl.equip(int(p.get("current", 0)))
