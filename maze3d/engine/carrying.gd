extends RefCounted
## Carrying - how much a character can carry (SPEC.md 5.17). The game's "carrying" gives the hands ("slots": weapons
## held at once) and the pack ("pack": how much bulk it holds); worn gear raises them: an item of kind "gear" is worn in
## its place ("wear", one item a place) and adds its "slots" to the hands and its "capacity" to the pack. The pack holds
## what was picked up on this expedition (the run's haul: treasure, a weapon found with both hands full, gear for a
## place already worn), each by its item def's "bulk" (0 when it gives none). Ammunition rides in the weapon it fits
## and takes no room; one vest is worn (armour is a number, as before). A game without "carrying" has no limits, and
## nor has the self-test (Debug.carry_anything) outside its carrying part.
class_name Carrying

const NO_LIMIT := 1000000


static func limited() -> bool:
	return LM.game.has("carrying") and not Debug.carry_anything


## Weapons that can be held at once, with that gear worn.
static func slots(gear: Array) -> int:
	if not limited():
		return NO_LIMIT
	return int(LM.game["carrying"].get("slots", 2)) + Carrying._sum(gear, "slots")


## Bulk the pack holds, with that gear worn.
static func capacity(gear: Array) -> int:
	if not limited():
		return NO_LIMIT
	return int(LM.game["carrying"].get("pack", 12)) + Carrying._sum(gear, "capacity")


static func bulk(item_id: String) -> int:
	return int(LM.defs.get("items", {}).get(item_id, {}).get("bulk", 0))


## The bulk in the pack now: the run's haul.
static func used() -> int:
	var n := 0
	for id in Game.haul:
		n += Carrying.bulk(id) * int(Game.haul[id])
	return n


## Where that gear is worn ("back", "sling"); an item without "wear" is its own place.
static func wear_of(item_id: String) -> String:
	return str(LM.defs.get("items", {}).get(item_id, {}).get("wear", item_id))


## Something is worn in that place already.
static func worn_in(gear: Array, place: String) -> bool:
	for g in gear:
		if Carrying.wear_of(g) == place:
			return true
	return false


## Where a thing picked up goes: "hand" (a weapon, while a hand is free), "worn" (gear, while its place is free), "pack"
## (anything else, or those when the hands or the place are full, if its bulk fits), or "" (too much to carry). `d`: the
## pickup's def (its "item", "kind").
static func place_for(pl: Player, d: Dictionary) -> String:
	var item := str(d.get("item", ""))
	match d.get("kind", "treasure"):
		"weapon":
			if pl.weapons.size() < Carrying.slots(pl.gear):
				return "hand"
		"gear":
			if not Carrying.worn_in(pl.gear, Carrying.wear_of(item)):
				return "worn"
	return "pack" if Carrying.used() + Carrying.bulk(item) <= Carrying.capacity(pl.gear) else ""


## The load, for the HUD: "  ·  pack 5/12" ("" without limits).
static func readout(gear: Array) -> String:
	return "  ·  pack %d/%d" % [Carrying.used(), Carrying.capacity(gear)] if Carrying.limited() else ""


## The same gear, one item a place (the first for each place), as it can be worn.
static func wearable(gear: Array) -> Array:
	var out: Array = []
	for g in gear:
		if not Carrying.worn_in(out, Carrying.wear_of(g)):
			out.append(g)
	return out


static func _sum(gear: Array, key: String) -> int:
	var n := 0
	for g in Carrying.wearable(gear):
		n += int(LM.defs.get("items", {}).get(g, {}).get(key, 0))
	return n
