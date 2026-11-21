extends SelfTestPart
## Carrying (SPEC.md 5.17), with the game's limits on (the self-test lifts them everywhere else: Debug.carry_anything).
## A treasure that does not fit the pack is left where it lies and nothing is paid; with room in the pack it is taken;
## a weapon found with both hands full goes into the pack; gear is worn, and a backpack makes the pack bigger. Each
## thing is dropped at the player's feet (made while playing). Afterwards the run and the player are put back as they
## were, so the parts after it see no change. Runs before pickups, which then takes everything else as before.


func run() -> void:
	if not LM.game.has("carrying"):
		say(true, "this game has no carrying limits")
		return
	var run_was: Dictionary = State.run().duplicate(true)
	var weapons_was: Array = pl.weapons.duplicate()
	var current_was: int = pl.current
	var gear_was: Array = pl.gear.duplicate()
	Debug.carry_anything = false
	await _full_pack()
	await _hands_full()
	await _gear()
	Debug.carry_anything = true
	State.data["run"] = run_was
	pl.arms.weapons = weapons_was
	pl.equip(current_was)
	pl.gear = gear_was
	Game.changed.emit()


## A full pack refuses treasure; with room, it is taken.
func _full_pack() -> void:
	var t := _item("treasure", "bulk")
	Game.haul.clear()
	Game.haul[t] = ceili(float(Carrying.capacity(pl.gear)) / Carrying.bulk(t))
	var credits := Game.credits
	var n := _drop(t)
	await frames(40)
	var left := is_instance_valid(n) and not n.is_queued_for_deletion()
	say(left and Game.credits == credits, "treasure (%s) that does not fit the pack is left where it lies, nothing paid (pack %d of %d)" % [_name(t), Carrying.used(), Carrying.capacity(pl.gear)])
	Game.haul.clear()
	await frames(4)
	say(not is_instance_valid(n) and int(Game.haul.get(t, 0)) == 1 and Game.credits > credits, "  with room made, it is taken (pack %d of %d)" % [Carrying.used(), Carrying.capacity(pl.gear)])


## With both hands full, a weapon found goes into the pack, not into a hand.
func _hands_full() -> void:
	var item := _item("weapon")
	var found: String = LM.defs["items"][item]["weapon"]
	var held: Array = LM.defs.get("weapons", {}).keys().filter(func(w: String) -> bool: return w != found).slice(0, Carrying.slots(pl.gear))
	pl.arms.weapons = held
	pl.equip(0)
	Game.haul.clear()
	var n := _drop(item)
	await frames(40)
	say(not is_instance_valid(n) and not pl.weapons.has(found) and int(Game.haul.get(item, 0)) == 1,
		"with both hands full (%s), a weapon found (%s) goes into the pack (pack %d)" % [", ".join(held), found, Carrying.used()])


## Gear is worn: a backpack makes the pack bigger, and the HUD says so.
func _gear() -> void:
	var g := _item("gear", "capacity")
	if g == "":
		say(true, "this game has no backpack")
		return
	pl.gear.clear()
	var before := Carrying.capacity(pl.gear)
	var n := _drop(g)
	await frames(40)
	var after := Carrying.capacity(pl.gear)
	say(not is_instance_valid(n) and pl.gear.has(g) and after == before + int(LM.defs["items"][g]["capacity"]) and Carrying.readout(pl.gear).contains("/%d" % after),
		"gear (%s) is worn, and the pack holds more: %d -> %d, the HUD says \"%s\"" % [_name(g), before, after, Carrying.readout(pl.gear).strip_edges().trim_prefix("·").strip_edges()])


## The first item of that kind (with that key above 0).
func _item(kind: String, need := "") -> String:
	var items: Dictionary = LM.defs.get("items", {})
	for id in items:
		if items[id].get("kind", "") == kind and (need == "" or float(items[id].get(need, 0)) > 0.0):
			return id
	return ""


func _name(item: String) -> String:
	return str(LM.defs["items"][item].get("name", item))


## Drop one at the player's feet.
func _drop(item: String) -> Node3D:
	var n: Node3D = level.spawn_thing({"item": item, "level": storey(pl.global_position)}, level.cell_of(pl.global_position))
	n.global_position = pl.global_position + Vector3(0, 0.4, 0)
	return n
