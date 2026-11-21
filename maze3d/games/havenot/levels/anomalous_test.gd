extends SelfTestPart
## The Anomalous Structure played the way it is meant to go, by script (with --story; without it the level gets the
## standard parts). Both ways past the Sphinx Gun and the Monoid, the darts and their terminal, the memo and locker 4,
## the three cards, the executive desk and safe, both lifts, the tubes, the mist, ENDURANCE, the tripwire, the Security
## Station, the Repair Bay, the emitters and the field, closing the agency, seizing the core, leaving, and what is banked.


func replaces_standard() -> bool:
	return OS.get_cmdline_user_args().has("--story")


func run() -> void:
	Game.calm = false
	pl.max_hp = 100000.0
	pl.hp = pl.max_hp
	say(level.floors.size() == 3 and level.lifts.size() == 2, "three floors and two lifts (%d, %d)" % [level.floors.size(), level.lifts.size()])
	for nm in ["Reception", "Creative Department", "The Coffee Shop", "Break room", "Executive suite", "Testing chamber", "Bio lab", "Director’s office", "Materials lab", "Prototype vault",
			"Operations floor", "Security Station", "Robot Repair Bay", "Armory", "The inner core"]:
		if level.rooms.filter(func(r): return r.get("name", "") == nm).is_empty():
			say(false, "there is a room called %s" % nm)
	var sphinx: Actor = thing("sphinx")
	var monoid: Actor = thing("monoid")
	say(sphinx != null and sphinx.off_duty and monoid != null and monoid.off_duty, "the Sphinx Gun and the Monoid wait to be spoken to")
	await _rude_way(sphinx, monoid)
	monoid = await _polite_way()
	await _darts()
	await _blue_card(monoid)
	await _executive_suite()
	await _floor_2()
	await _floor_3()
	await _repair_bay()
	await _core_and_out()


## A: the rude way. Walk past the Sphinx; take the Monoid's badge off it.
func _rude_way(sphinx: Actor, monoid: Actor) -> void:
	go(Vector2i(11, 13))
	await frames(20)
	say(sphinx.off_duty, "  standing inside the door, it only asks")
	go(Vector2i(14, 11))
	await frames(30)
	say(not sphinx.off_duty and Game.has_flag("sphinx_angry"), "  walk past it unanswered and it opens fire")
	sphinx.hurt(99999.0, {})
	await frames(5)
	say(Game.has_flag("sphinx_ok"), "  killing it clears reception")
	say(not Game.has_flag("badge") and await pick(monoid, "Then I"), "the Monoid can be told you will take the badge")
	await frames(10)
	say(not monoid.off_duty, "  and it gets up")
	monoid.hurt(99999.0, {})
	await frames(5)
	say(Game.has_flag("badge"), "  its badge is yours when it is dead")


## B: the polite way, from the start. Returns the new Monoid.
func _polite_way() -> Actor:
	main.restart_level()                             # starting again, as it was made (coming back would find it remembered)
	await frames(10)
	level = main.level
	pl = main.player
	pl.max_hp = 100000.0
	pl.hp = pl.max_hp
	var sphinx: Actor = thing("sphinx")
	var monoid: Actor = thing("monoid")
	say(not Game.has_flag("badge") and not Game.has_flag("sphinx_ok"), "starting again starts clean")
	say(await pick(sphinx, "WANT MORE") and Game.has_flag("sphinx_ok") and sphinx.off_duty, "the right slogan stands the Sphinx Gun down")
	go(Vector2i(8, 11))
	await frames(30)
	say(sphinx.off_duty and not Game.has_flag("sphinx_angry"), "  and then you may walk past it")
	return monoid


## The courtesy darts hurt, until the facilities terminal is argued with.
func _darts() -> void:
	pl.hp = 1000.0
	go(Vector2i(18, 11))
	await frames(100)
	var dart_hurt: float = 1000.0 - pl.hp
	say(dart_hurt > 0.0, "the courtesy darts hurt (%.0f)" % dart_hurt)
	say(await pick(thing("facilities"), "Argue") and Game.has_flag("darts_off"), "the facilities terminal shuts them off")
	pl.hp = 1000.0
	go(Vector2i(18, 11))
	await frames(100)
	say(pl.hp == 1000.0, "  and then they do not")
	pl.hp = pl.max_hp


## The blue card: the memo has the code to locker 4; the lucky chip buys the Monoid's badge, which opens the staff door.
func _blue_card(monoid: Actor) -> void:
	say(door(5, 12).is_locked(), "the staff door is locked")
	var l4 := thing("locker4")
	say(not await pick(l4, "Enter 314"), "locker 4 wants a code you do not have")
	var memo: Node = null
	for n in level.get_children():
		if n is Prop and str(n.e.get("use", {}).get("title", "")).begins_with("Memo"):
			memo = n
	say(await pick(memo, "Remember") and Game.has_flag("memo314"), "the memo in the Creative Department has it")
	# the chip, the Monoid, the badge
	say(not await pick(monoid, "Swap"), "the Monoid will not swap for nothing")
	var jar := thing("tipjar")
	go(Vector2i(20, 7))
	jar.use(pl)
	await frames(40)
	await take("lucky_chip")
	say(Game.has_flag("lucky_chip"), "the lucky chip is in the coffee shop's tip jar")
	say(await pick(monoid, "Swap") and Game.has_flag("badge") and monoid.off_duty, "the Monoid swaps its badge for it, and goes on with its break")
	await frames(20)
	say(not door(5, 12).is_locked(), "the badge opens the staff door")
	say(await pick(l4, "Enter 314"), "locker 4 opens to 314")
	await frames(40)
	await take("keycard")
	say(Game.has_flag("key_blue"), "  the BLUE card is in it")
	say(not shut(door(11, 5)), "  and it opens the stairwell")


## The executive suite: its panel, the desk (and its defenders), the safe and the order in it.
func _executive_suite() -> void:
	say(door(20, 12).is_locked(), "the executive suite is locked")
	var panel: Node = null
	for n in level.get_children():
		if n is Prop and str(n.e.get("use", {}).get("title", "")).begins_with("EXECUTIVE SUITE"):
			panel = n
	say(await pick(panel, "Argue") and not door(20, 12).is_locked(), "  until its panel is argued with")
	say(not await pick(thing("execsafe"), "Enter 0451"), "the safe wants a code")
	var before: int = kinds("defender").size()
	say(await pick(thing("execdesk"), "Take the watch") and Game.has_flag("safe_code"), "the desk has the code")
	await frames(80)
	say(kinds("defender").size() == before + 2, "  and two Desktop Defenders (%d)" % (kinds("defender").size() - before))
	for a in kinds("defender"):
		a.hurt(9999.0, {})
	say(await pick(thing("execsafe"), "Enter 0451"), "the safe opens to 0451")
	await frames(40)
	await take("order")
	say(Game.has_flag("order"), "  Termination Order 77-B is in it")


## Floor 2: the yellow card, the tubes, the mist, and the testing chamber.
func _floor_2() -> void:
	var la: Node3D = thing("lift_a")
	say(level.reach(level.center(Vector2i(11, 16), 0.0), level.center(Vector2i(10, 2), level.H)), "the lift in the north stairwell goes up to the labs")
	say(shut(door(14, 2, 1)), "the way to floor 3 is locked")
	go(Vector2i(3, 5), 1)
	thing("director").use(pl)
	await frames(40)
	await take("keycard")
	say(Game.has_flag("key_yellow") and not shut(door(14, 2, 1)), "the YELLOW card is in the Lab Director's desk, and opens it")
	# the tubes
	var tubes: Array = level.things_by_tag.get("tubes", [])
	var broken: Array = level.things_by_tag.get("tubes_broken", [])
	say(tubes.size() == 2 and tubes[0].visible and broken.size() == 2 and not broken[0].visible, "two stasis tubes, whole")
	go(Vector2i(3, 10), 1)
	await frames(90)
	say(not tubes[0].visible and broken[0].visible and kinds("glorexx", 1).size() == 2, "cross the middle of the bio lab and they decant (%d Glorexx)" % kinds("glorexx", 1).size())
	for a in kinds("glorexx"):
		a.hurt(99999.0, {})
	# the mist
	var mist: Trap = thing("mist")
	pl.hp = 1000.0
	pl.global_position = mist.global_position + Vector3(0.9, 0.05, 0)
	await frames(240)
	say(pl.hp < 1000.0, "yellow-band mist is toxic (%.0f)" % (1000.0 - pl.hp))
	say(await pick(thing("labenv"), "Switch off") and not mist.enabled and (thing("fog") as Trap).enabled, "the lab terminal stops it; the blue fog carries on")
	pl.hp = pl.max_hp
	# the chamber
	var con := thing("testconsole")
	var prize := thing("prize")
	say(not prize.visible and not thing("archive").visible and not thing("holo").visible, "the chamber's surprises are out of sight")
	for a in kinds("drone", 1) + kinds("custodian", 1):
		a.hurt(99999.0, {})
	await frames(5)
	say(await pick(con, "ENDURANCE") and Game.has_flag("test_endure"), "ENDURANCE can be chosen")
	await frames(150)
	var units: Array = level.things_by_tag.get("endurance", []).filter(func(a): return is_instance_valid(a) and not a.dead)
	say(units.size() == 4 and door(7, 10, 1).sealed and door(11, 6, 1).sealed, "  it seals the chamber and sends in four units (%d)" % units.size())
	for a in units:
		a.hurt(99999.0, {})
	await frames(20)
	say(Game.has_flag("endure_done") and not door(7, 10, 1).sealed and prize.visible, "  beat them and it opens again, with a prize")
	say(not await pick(con, "ARCHIVE"), "  one mode only: the console is locked")


## Floor 3: the tripwire and the alarm, the Security Station, the red card, the armory.
func _floor_3() -> void:
	say(level.reach(level.center(Vector2i(10, 2), level.H), level.center(Vector2i(17, 2), 2 * level.H)), "the second lift goes up to the Security Complex")
	var heavy: Actor = thing("heavy")
	say(heavy != null and not heavy.awake, "the Heavy Security Drone is on its station, dormant")
	var trip: Trap = thing("tripwire")
	var n3: int = kinds("drone", 2).size()
	pl.global_position = trip.global_position + Vector3(0, 0.05, 0)
	await frames(120)
	var red := false
	for l in level.lights_by_room.get("Operations floor", []):
		red = red or (l.light_color.r > 0.8 and l.light_color.g < 0.4)
	say(Game.has_flag("alarm") and not trip.enabled and red and kinds("drone", 2).size() == n3 + 2, "the tripwire raises the alarm: red light, two more Knife Fighters")
	for a in level.actors:
		if is_instance_valid(a) and not a.dead and level.floor_of(a.global_position) == 2 and LM.defs["actors"].find_key(a.d) in ["drone", "turret", "heavy"]:
			a.hurt(999999.0, {})
	await frames(10)
	say(door(10, 9, 2).is_locked() == false, "the badge opens the Security Station")
	var shock: Trap = thing("shockfloor")
	say(await pick(thing("station_console"), "Shut down") and Game.has_flag("traps_off") and not shock.enabled, "its console shuts the crossing traps down")
	say(door(13, 14, 2).is_locked() and await pick(thing("station_console"), "Unlock the armory") and not door(13, 14, 2).is_locked(), "  and unlocks the armory")
	go(Vector2i(9, 7), 2)
	thing("redlocker").use(pl)
	await frames(40)
	await take("keycard")
	say(Game.has_flag("key_red"), "the RED card is in the duty officer's locker")
	say(not shut(door(7, 11, 2)) and not shut(door(11, 14, 1)), "  it opens the inner core, and the prototype vault downstairs")
	go(Vector2i(13, 16), 2)
	await frames(10)
	await take("arc")
	say(pl.weapons.has("arc"), "the arc carbine is in the armory")


## The Repair Bay rebuilds what you destroy until its coupling is pulled.
func _repair_bay() -> void:
	var bay: Rebuilder = thing("bay")
	var cust: Array = kinds("custodian", 2)
	var w0: int = bay.waiting().size()
	say(bay != null and not cust.is_empty(), "the Repair Bay is running (%d robots owed)" % w0)
	cust[0].hurt(99999.0, {})
	await frames(5)
	say(bay.waiting().size() == w0 + 1, "  destroy a robot on its floor and it has one more to rebuild")
	var c0: int = kinds("custodian", 2).size() + kinds("drone", 2).size()
	bay.rebuild(bay.waiting()[0])
	await frames(5)
	say(kinds("custodian", 2).size() + kinds("drone", 2).size() == c0 + 1 and bay.waiting().size() == w0, "  and it rebuilds one")
	say(await pick(thing("bay_console"), "Pull the power coupling") and Game.has_flag("bay_off"), "  until its coupling is pulled")


## The core: its field, closing the agency, seizing it; and out, with the ending and what is banked.
func _core_and_out() -> void:
	var field: Door = door(4, 11, 2)
	var em: Array = level.things_by_tag.get("emitters", [])
	say(field.sealed and em.size() == 3, "three emitters hold a field across the core")
	say(not await pick(thing("lectern"), "Silence"), "the ad system cannot be silenced while the agency is open")
	for a in em:
		a.hurt(9999.0, {})
	await frames(20)
	say(Game.has_flag("field_down") and not field.sealed, "  destroy them and it drops")
	say(await pick(thing("lectern"), "File Termination Order") and Game.has_flag("agency_closed"), "Termination Order 77-B closes the agency")
	var cr0 := Game.credits
	say(await pick(thing("core"), "Seize the core") and Game.has_flag("ads_silent"), "the core can be seized")
	await frames(40)
	await take("ad_core")
	say(Game.credits >= cr0 + 2500, "  and is worth a fortune (+%d cr)" % (Game.credits - cr0))
	say(not thing("core").visible, "  and is not there any more")
	# out
	var ended: Array = []
	Game.ended.connect(func(info): ended.append(info), CONNECT_ONE_SHOT)
	say(await pick(thing("exit"), "Leave. (The agency is closed and its ads are silent.)") or not ended.is_empty(), "the front doors let you out")
	await frames(5)
	say(not ended.is_empty() and ended[0].get("title", "") == "The Last Campaign", "  with the ending you earned (%s)" % (ended[0].get("title", "?") if not ended.is_empty() else "none"))
	say(Profile.d["trophies"].has("ad_core") and Profile.d["weapons"].has("arc") and int(Profile.d["credits"]) >= 2500, "  and what you carried out is banked at home")
