extends SelfTestPart
## Easy mode's E: looking at a thing names that thing (Identify), and floor, ceiling and wall tiles are named too. Then
## easy mode's P: an image prompt (ImagePrompt) for each kind of thing E named.

var _seen: Array = []          # what E said, for P's image prompts


func run() -> void:
	var named := 0
	var misnamed := 0
	var unseen := 0
	for n in level.get_children():
		if _skip(n):
			continue
		var w := _wanted(n)
		var r := _name_from_round(n, w[0], w[1])
		if r == 0:
			named += 1
		elif r == 1:
			misnamed += 1
			print("INFO  E did not name ", w[0], " at ", level.cell_of(n.global_position))
		else:
			unseen += 1
	say(named > 0 and misnamed * 20 <= named, "easy mode's E names what you look at (%d things named, %d not, %d with nowhere to stand)" % [named, misnamed, unseen])
	pl.global_position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	pl.force_update_transform()
	var tiles_ok := 0
	for look in [[Vector3(0.3, -1, 0.2), "floor tile"], [Vector3(0.2, 1, 0.3), "ceiling tile"], [Vector3(1, 0.05, 0.3), "tile"], [Vector3(-0.3, 0.05, 1), "tile"]]:
		look_at(pl.cam.global_position + (look[0] as Vector3).normalized() * 3.0)
		pl.head.force_update_transform()
		if Identify.look(pl).get("detail", "").contains(look[1]):
			tiles_ok += 1
	say(tiles_ok >= 3, "  and names floor, ceiling and wall tiles (%d of 4 looks; a door or a thing may stand in one)" % tiles_ok)
	_prompts()


## P: one prompt for each kind of thing E named (and the floor, ceiling and a wall), each with the low-poly line, a
## colour with its hex, and notes. --prompts prints them all (Debug.print_prompts).
func _prompts() -> void:
	for look in [Vector3(0.3, -1, 0.2), Vector3(0.2, 1, 0.3), Vector3(1, 0.05, 0.3)]:
		look_at(pl.cam.global_position + look.normalized() * 3.0)
		pl.head.force_update_transform()
		_seen.append(Identify.look(pl))
	var done := {}
	var wrote := 0
	var bad: Array = []
	var t0 := Debug.now_msec()
	for seen in _seen:
		var ref: Dictionary = seen.get("ref", {})
		var key := "%s/%s" % [ref.get("kind", ""), ref.get("id", "")]
		if done.has(key) or ref.get("kind", "") in ["", "structure", "sign", "puddle"]:
			continue
		done[key] = true
		var ip := ImagePrompt.make(seen, level)
		var txt: String = ip.get("prompt", "")
		if ip.get("ok", false) and txt.contains("ow-poly") and txt.contains("#") and (txt.contains("Colour scheme") or txt.contains("Glowing")) and ip.get("notes", "") != "":
			wrote += 1
		else:
			bad.append(key)
		if Debug.print_prompts:
			print("PROMPT  %s\n%s\n%s\n" % [ip.get("title", key), txt if ip.get("ok", false) else ip.get("why", ""), ip.get("notes", "")])
	say(wrote > 0 and bad.is_empty(), "  and P writes an image prompt for each kind of thing it names (%d written in %d ms%s)" % [wrote, Debug.now_msec() - t0, "; none for " + ", ".join(PackedStringArray(bad)) if not bad.is_empty() else ""])


## Things E is not expected to name: not there, in a container or behind a shutter, hidden, or standing in or on a
## piece of furniture (which E names instead).
func _skip(n: Node) -> bool:
	if not is_instance_valid(n) or not (n is Prop or n is Pickup or n is Door or n is Trap or (n is Actor and n.surf == 0 and not n.dead)):
		return true
	if (n is Pickup and n.resting() and n.position.y - level.floor_y(n.position) > 0.4) or (n is Actor and n.dock != null and n.dock.open_amount() < 0.5):
		return true                                 # in a container (E names the container, and what it holds), or behind a shutter
	if n is Prop and not n.visible:
		return true                                 # hidden until something shows it
	if n is Trap or n is Pickup:                 # standing in or on a piece of furniture (a vent under its generator, a gun on a pedestal): E names the furniture
		var onp := false
		for q in level.get_children():
			if q is Prop and q.visible and absf(q.global_position.y - n.global_position.y) < 2.5 and Vector2(q.global_position.x - n.global_position.x, q.global_position.z - n.global_position.z).length() < 0.8:
				onp = true
				break
		if onp:
			return true
	return false


## What the IDENT detail should say for it ([what, or what else]: an open station may name who is in it first).
func _wanted(n: Node) -> Array:
	var want := ""
	var want2 := "\u0000"
	if n is Station and n.bot != null and is_instance_valid(n.bot) and not n.bot.dead:
		want2 = "monster \"%s\"" % str(LM.defs["actors"].find_key(n.bot.d))      # an open one: what you see first is who is in it
	if n is Prop:
		want = "prop \"%s\"" % n.e["prop"]
	elif n is Pickup:
		want = "item \"%s\"" % n.d.get("item", "?")
	elif n is Door:
		want = "door \"%s\"" % level.cell(n.cell_pos.x, n.cell_pos.y, n.storey).get("entry", {}).get("door", "?")
	elif n is Trap:
		want = "trap \"%s\"" % n.kind
	else:
		want = "monster \"%s\"" % str(LM.defs["actors"].find_key(n.d))
	return [want, want2]


## Stand round it and look: 0 named, 1 seen but not named, 2 nowhere to stand to look.
func _name_from_round(n: Node, want: String, want2: String) -> int:
	var mid: Vector3 = Identify.middle(n) if not n is Actor else n.global_position + Vector3(0, n.d.get("center", n.d.get("height", 1.6) / 2.0), 0)
	var got_it := false
	var could := false
	for dv in [Vector3(0, 0, 1), Vector3(1, 0, 0), Vector3(0, 0, -1), Vector3(-1, 0, 0), Vector3(0.7, 0, 0.7), Vector3(-0.7, 0, 0.7), Vector3(0.7, 0, -0.7), Vector3(-0.7, 0, -0.7)]:
		var spot: Vector3 = mid + dv * 2.6
		var sc := level.cell_of(spot)
		var st := storey(mid)
		if not level.open_s(sc.x, sc.y, st) or level.cell_s(sc.x, sc.y, st).get("door", "") != "":
			continue
		spot.y = level.floor_y(Vector3(spot.x, st * level.H + 0.5, spot.z)) + 0.05
		if absf(spot.y + Player.EYE - mid.y) > 2.5:
			continue
		could = true
		pl.global_position = spot
		pl.velocity = Vector3.ZERO
		pl.force_update_transform()
		look_at(mid)
		pl.head.force_update_transform()
		var seen: Dictionary = Identify.look(pl)
		if seen.get("detail", "").contains(want) or seen.get("detail", "").contains(want2):
			got_it = true
			_seen.append(seen)
			break
	if got_it:
		return 0
	return 1 if could else 2
