extends RefCounted
## Factions - who is at war with whom (SPEC.md 5.20). The game's "factions" give each faction the factions it is
## hostile to; a level's own "factions" replace the game's entry for any faction they name, so one place can set robots
## on monsters, or make a faction friendly:
##   "factions": {"robots": {"name": "Machines", "hostile": ["player"]}, "monsters": {"hostile": ["player", "robots"]}}
## War goes both ways: either side naming the other is enough. "player" is the player's side: an actor of that
## faction is an ally, fighting the player's enemies. An actor's faction is its entry's "faction", else its def's; with
## none it is hostile to the player only, as every monster was before factions. A faction that names nobody is neutral:
## it fights nobody until it is hurt (ActorFoes).
class_name Factions

const PLAYER := "player"

static var _table: Dictionary = {}
static var _allies := false       # the level's data places allies (actors of the player's faction)
static var _for := -1             # the level the table was made for (its instance id)


## The table for the level being played: the game's factions, with the level's over them.
static func table() -> Dictionary:
	var lv: Level = Game.level
	var id := lv.get_instance_id() if lv != null and is_instance_valid(lv) else 0
	if id != _for:
		_for = id
		_table = (LM.game.get("factions", {}) as Dictionary).duplicate(true)
		_allies = false
		if id != 0:
			var own: Dictionary = lv.data.get("factions", {})
			for f in own:
				_table[f] = own[f]
			var entries: Array = lv.data.get("things", []).duplicate()
			for ch in lv.data.get("objectLegend", {}):
				var en: Variant = lv.data["objectLegend"][ch]
				entries += en if en is Array else [en]
			for en in entries:
				_allies = _allies or (en is Dictionary and en.get("faction", "") == PLAYER)
	return _table


## Does the level being played place allies of the player? Then its enemies fight them too (ActorFoes).
static func allies_here() -> bool:
	Factions.table()
	return _allies


## An actor's faction: its entry's, else its def's; "" for none.
static func of(a: Node) -> String:
	if a is Player:
		return PLAYER
	if a is ActorCore:
		return str((a as ActorCore).e.get("faction", (a as ActorCore).d.get("faction", "")))
	return ""


## Are these two at war, in the level being played?
static func hostile(f1: String, f2: String) -> bool:
	return Factions.at_war(Factions.table(), f1, f2)


## Are these two at war, by this table? No faction ("") is at war with the player and nobody else.
static func at_war(t: Dictionary, f1: String, f2: String) -> bool:
	if f1 == f2:
		return false
	if f1 == "" or f2 == "":
		return (f1 if f1 != "" else f2) == PLAYER
	return (t.get(f1, {}).get("hostile", []) as Array).has(f2) or (t.get(f2, {}).get("hostile", []) as Array).has(f1)


## Is this faction at war with any faction other than the player's (in the level being played)?
static func fights_others(f: String) -> bool:
	var t := Factions.table()
	for g in t:
		if g != PLAYER and Factions.at_war(t, f, g):
			return true
	return false
