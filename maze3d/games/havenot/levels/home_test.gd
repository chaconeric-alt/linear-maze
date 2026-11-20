extends SelfTestPart
## The bunker's own test (it runs instead of the standard parts): every piece of furniture that does something does it,
## what is brought home is banked and put on show, the robot is repaired only with the parts, furnishings can be bought,
## put down, taken back, and are there after a reload, the vault door opens, and the lift has somewhere to go and takes
## the armoury along. (Profile is memory-only in a self-test.)


func replaces_standard() -> bool:
	return true


func run() -> void:
	await _rooms()
	await _furniture()
	await _coming_home()
	var saved: Array = await _furnishing()
	await _vault_and_lift()
	await _still_there(saved)


## All eight rooms, nothing that fights, and every piece of furniture can be reached.
func _rooms() -> void:
	var names: Dictionary = {}
	for rm in level.rooms:
		names[rm.get("name", "")] = true
	var want := ["Bedroom", "Bathroom", "Den", "Living Room", "Communications", "Armoury", "Robot Room", "Security"]
	var missing: Array = want.filter(func(r): return not names.has(r))
	say(missing.is_empty(), "the bunker has all eight rooms %s" % [missing])
	say(level.actors.is_empty() and pl.weapons.is_empty(), "nothing in it fights, and you carry nothing")
	var unreachable := 0
	var start := level.center(level.start_cell, 0.0)
	for dp in level.doors:
		level.block(dp, false)
	for n in level.get_children():
		if n is Prop:
			var c := level.cell_of(n.global_position)
			var ok := false
			for d in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				if level.is_open(c.x + d.x, c.y + d.y) and level.reach(start, level.center(c + d, 0.0)):
					ok = true
					break
			if not ok:
				unreachable += 1
				print("INFO  unreachable: ", n.e.get("prop"), " at ", c)
	say(unreachable == 0, "every piece of furniture can be reached (%d cannot)" % unreachable)


## Every usable thing does something (the bed and the sofa say so; the rest open a panel).
func _furniture() -> void:
	var used := 0
	var bad := 0
	for n in get_tree().get_nodes_in_group("usable"):
		if not (n is Prop) or n.e.get("use", {}).get("type", "") != "home":
			continue
		used += 1
		look_at(n.global_position + Vector3(0, 1.2, 0))
		n.use(pl)
		await frames(2)
		var what: String = n.e["use"].get("what", "")
		var panel: bool = Game.hud.in_panel()
		if what in ["bed", "sofa"]:
			if panel:
				bad += 1
				print("INFO  ", what, " opened a panel")
		elif not panel:
			bad += 1
			print("INFO  ", what, " did nothing")
		Game.hud.close_panel()
		await frames(2)
	say(used >= 11 and bad == 0, "every working piece of furniture works (%d of them, %d wrong)" % [used, bad])


## Coming home: what was carried is put on show, and the robot is repaired with the parts and talks.
func _coming_home() -> void:
	var hm: Home = level.home
	say(hm.shown_count() == 0, "an empty bunker shows nothing on the rack, the stand or in the case")
	say(not hm.can_repair() and not hm.repair(), "the robot cannot be repaired without the parts")
	say(not (hm.robot is Actor) and hm.robot != null, "  and is a wreck in the cradle")
	Profile.bank(500, ["handgun", "scattergun", "plasma"], 50.0, {"circuit": 3, "fuel_cell": 2, "crystal": 2, "statuette": 1, "chips": 4})
	hm.show_off()
	await frames(2)
	say(hm.shown_count() == 3 + 1 + 3, "what is brought home goes on show: 3 weapons, a vest, 3 trophies (%d things)" % hm.shown_count())
	say(hm.can_repair() and hm.repair(), "with 3 circuit boards and 2 fuel cells the robot is repaired")
	await frames(5)
	say(hm.robot is Actor and (hm.robot as Actor).off_duty and Profile.count("circuit") == 0, "  it is up, it is off duty, and the parts are used")
	if hm.robot is Actor:
		stand_near(hm.robot.global_position + Vector3(0, 1.0, 0), 3.0)
		look_at(hm.robot.global_position + Vector3(0, 1.0, 0))
		hm.robot.use(pl)
		await frames(2)
		say(Game.hud.in_panel(), "  and it talks")
		Game.hud.close_panel()


## Furnishing: three things bought, put down (one on a wall), one taken back. Returns the furnishings left down.
func _furnishing() -> Array:
	var hm: Home = level.home
	Profile.d["credits"] = 30
	say(not hm.buy(0), "the catalogue wants paying (30 cr does not buy a %d cr fern)" % int(hm.catalogue()[0][1]))
	Profile.d["credits"] = 500
	var bought := 0
	for i in hm.catalogue().size():
		if hm.catalogue()[i][0] in ["hm_plant", "hm_painting", "hm_lamp"] and hm.buy(i):
			bought += 1
	say(bought == 3 and int(Profile.d["credits"]) == 500 - 40 - 45 - 60 and hm.available().size() == 3, "three things bought, paid for, and waiting (%d cr left)" % int(Profile.d["credits"]))
	pl.global_position = level.center(Vector2i(7, 4), 0.05)
	pl.rotation.y = -PI / 2                             # looking east along the hall
	pl.pitch = -0.5
	hm.toggle()
	var lights0 := level.get_children().filter(func(n): return n is OmniLight3D).size()
	var put := 0
	for k in 3:
		var av := hm.available()
		if av.is_empty():
			break
		hm.select(0)
		if av[0][0] == "hm_painting":                # a wall thing: look at the wall
			pl.rotation.y = 0.0
			pl.pitch = 0.1
		else:
			pl.rotation.y = -PI / 2
			pl.pitch = -0.5 - 0.1 * k
		await frames(4)
		if hm.place():
			put += 1
		await frames(2)
	say(put == 3 and hm.available().is_empty() and Profile.d["decor"].size() == 3, "all three put down (%d), one of them on a wall" % put)
	var lights1 := level.get_children().filter(func(n): return n is OmniLight3D).size()
	say(lights1 == lights0 + 1, "the standing lamp lights (%d -> %d lights)" % [lights0, lights1])
	var onwall := false
	for dec in Profile.d["decor"]:
		if dec["m"] == "hm_painting":
			var c := level.cell_of(Vector3(dec["x"], 0, dec["z"]))
			var fx: float = dec["x"] / level.C - c.x
			var fz: float = dec["z"] / level.C - c.y
			onwall = minf(minf(fx, 1.0 - fx), minf(fz, 1.0 - fz)) < 0.02
	say(onwall, "the painting hangs on a wall")
	pl.rotation.y = -PI / 2
	await frames(2)
	var n0: int = Profile.d["decor"].size()
	var took := hm.take_back()
	await frames(3)
	say(took and Profile.d["decor"].size() == n0 - 1 and hm.available().size() == 1, "one taken back, and it is waiting again")
	hm.toggle()
	var saved: Array = Profile.d["decor"].duplicate(true)
	return saved


## The vault door rolls open; the lift has somewhere to go and takes the armoury along.
func _vault_and_lift() -> void:
	var hm: Home = level.home
	var vault := Vector2i(-1, -1)
	for dp in level.doors:
		if str(level.doors[dp].meta.get("model", "")).contains("vault"):
			vault = dp
	if vault.x >= 0:
		pl.global_position = level.center(vault, 0.05) + Vector3(-2.7, 0, 0)
		await frames(260)
		say(level.doors[vault].t > 0.9, "the vault door rolls open")
	else:
		say(false, "there is a vault door")
	var dest := hm.destinations()
	say(dest["built"].size() >= 3 and dest["wild"].size() >= 3, "the lift has somewhere to go (%d on record, %d unsurveyed)" % [dest["built"].size(), dest["wild"].size()])
	var cfg := {"weapons": ["handgun"], "ammo": {"shells": 0, "cells": 0}}
	Profile.outfit(cfg)
	say(cfg["weapons"].size() == 3 and cfg["armor"] == 50.0 and cfg["ammo"]["shells"] > 0 and cfg["ammo"]["cells"] > 0, "leaving by the lift takes the armoury along: %s, armour %d, %s" % [cfg["weapons"], cfg["armor"], cfg["ammo"]])


## And it is all still there next time.
func _still_there(saved: Array) -> void:
	main.start_level(level.data.get("id", "home"))
	await frames(10)
	level = main.level
	pl = main.player
	var hm: Home = level.home
	say(hm != null and hm.placed_count() == saved.size() and hm.robot is Actor and hm.shown_count() == 7 and Game.credits == int(Profile.d["credits"]),
		"after coming back in: the furnishings, the robot, the rack and the credits are as they were left")
