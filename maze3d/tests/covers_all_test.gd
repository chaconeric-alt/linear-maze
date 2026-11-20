extends SelfTestPart
## The test floor has to have everything in it: every style, every piece of furniture, every door, monster and item
## (a level with "covers_all": true).


func run() -> void:
	var missing: Array = []
	var styles := {}
	for f in level.floors:
		for y in level.h:
			for x in level.w:
				var c: Dictionary = level.cell(x, y, f)
				if not c["solid"]:
					styles[c["style"]] = true
	for s in level.kit["styles"]:
		if not styles.has(s):
			missing.append("style " + s)
	var have := {}
	for n in level.get_children():
		if n is Prop:
			have[n.e["prop"]] = true
			for k in n.get_children():
				if k is Prop:
					have[k.e["prop"]] = true
	var doors := {}
	for src in [level.data.get("legend", {})] + level.data.get("floors", []).map(func(fd): return fd.get("legend", {})):
		for ch in src:
			if src[ch] is Dictionary and src[ch].has("door"):
				doors[src[ch]["door"]] = true
	for id in level.kit["models"]:
		var m: Dictionary = level.kit["models"][id]
		if m.get("type", "") == "prop" and not have.has(id) and not id.begins_with("trap_") and id != "window_obs":
			missing.append("prop " + id)
		elif m.get("type", "") == "door" and not doors.has(id):
			missing.append("door " + id)
	var who := {}
	for a in level.actors:
		if is_instance_valid(a):
			who[str(LM.defs["actors"].find_key(a.d))] = true
	for id in LM.defs["actors"]:
		if not who.has(id):
			missing.append("monster " + id)
	var things := JSON.stringify(level.data.get("things", []))
	for id in LM.defs["items"]:
		if not things.contains("\"%s\"" % id):
			missing.append("item " + id)
	say(missing.is_empty(), "the test floor has everything in it (%s)" % ("missing: " + ", ".join(PackedStringArray(missing)) if not missing.is_empty() else "%d styles, %d kinds of furniture, %d of door, %d of monster" % [styles.size(), have.size(), doors.size(), who.size()]))
