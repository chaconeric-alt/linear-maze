extends RefCounted
## DamageTypes - the kinds of hurt, from the game's "damage_types" (SPEC.md 5.21):
##   "damage_types": {"explosive": {"name": "Explosive", "alias": ["blast"]}, "poison": {"alias": ["toxic"]}, ...}
## Every hit names its kind (a weapon's, a projectile's or a blast's "kind", an attack's, a trap's). A type's "alias"
## lists older names for the same thing, so data written before the list still means what it did: a monster that
## takes 1.6 from "blast" takes 1.6 from "explosive" too. Kinds the list does not name are their own type, as before.
## The lasting effects (burning, poisoned) and their cures come later, in this list.
class_name DamageTypes


static func all() -> Dictionary:
	return LM.game.get("damage_types", {})


## The type a kind is: its own name if the list has it, else the type that lists it as an alias, else itself.
static func canon(kind: String) -> String:
	var t := DamageTypes.all()
	if t.has(kind):
		return kind
	for name in t:
		if (t[name].get("alias", []) as Array).has(kind):
			return name
	return kind


## How much of a hit of this kind a body with these "takes" feels: by the kind's own name first, as always; else by
## any name of the same type.
static func taken(takes: Dictionary, kind: String) -> float:
	if takes.has(kind):
		return float(takes[kind])
	var c := DamageTypes.canon(kind)
	for k in takes:
		if DamageTypes.canon(k) == c:
			return float(takes[k])
	return 1.0
