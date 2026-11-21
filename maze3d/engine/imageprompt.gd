class_name ImagePrompt
## ImagePrompt - easy mode's P. After E has named something, P writes a prompt for an image generator to draw a new
## version of it: what it is, its footprint class and proportions, its colour scheme (measured from the model in the game,
## each colour weighted by how much of the surface it covers), what glows and what moves, the style line of the kit it
## comes from, the low-poly line, and the "single object, plain background" line of the furniture style guide. Notes for
## the 3D generator and the hand-over (export settings, footprint class, the one-line note to send with the model) follow.
##
## The prompt is printed to the console, put on the clipboard and added to user://image_prompts.txt.
## The wording is data: games/<game>/prompts.json (the fixed lines, the monsters, the items) and kits/<kit>/prompt.json
## (each kit's style line and what its models are). SPEC.md, "Image prompts".
## Its parts: PromptMeasure (engine/imageprompt/measure.gd: size and colours from the model) and PromptWriter
## (engine/imageprompt/writer.gd: the words).

const LOG := "user://image_prompts.txt"
const CELL_FOOTPRINT := 2.8      # a floor piece fits inside this, so there is a walkway each side in its cell


## {"ok", "title", "prompt", "notes"} for what E named (Identify.look's answer); "why" when there is nothing to describe.
static func make(seen: Dictionary, lv: Level) -> Dictionary:
	var ref: Dictionary = seen.get("ref", {})
	var kind: String = ref.get("kind", "")
	var cfg: Dictionary = LM.prompts
	var title: String = seen.get("title", "")
	match kind:
		"prop", "door", "window", "tile", "item", "actor", "trap", "lift", "target":
			pass
		"structure":
			return {"ok": false, "title": title, "why": "a plain surface the engine builds (a deck, slab, ramp, rail or plain glass): there is no model to describe"}
		"sign":
			return {"ok": false, "title": title, "why": "a sign is lettering on a monitor the engine builds; there is no model to describe"}
		"puddle":
			return {"ok": false, "title": title, "why": "a puddle is a glowing disc the engine draws; there is no model to describe"}
		_:
			return {"ok": false, "title": title, "why": "E has not named anything yet"}
	var f := _facts(ref, lv, title)
	if f.is_empty():
		return {"ok": false, "title": title, "why": "its model could not be loaded"}
	return {"ok": true, "title": f["name"], "prompt": PromptWriter.prompt(f, cfg), "notes": PromptWriter.notes(f, cfg, lv)}


## Print it, put the prompt on the clipboard, and keep it in the log. Returns the line for the HUD.
static func deliver(p: Dictionary) -> String:
	if not p.get("ok", false):
		print("IMAGE PROMPT  nothing for %s: %s" % [p.get("title", "?"), p.get("why", "")])
		return "No image prompt for this: %s." % p.get("why", "")
	var bar := "=".repeat(24)
	var text := "%s IMAGE PROMPT · %s %s\n%s\n%s for the 3D generator and the hand-over (not part of the prompt) %s\n%s\n%s" % [
		bar, p["title"], bar, p["prompt"], "-".repeat(10), "-".repeat(10), p["notes"], "=".repeat(72)]
	print("\n" + text + "\n")
	DisplayServer.clipboard_set(p["prompt"])
	var f := FileAccess.open(LOG, FileAccess.READ_WRITE if FileAccess.file_exists(LOG) else FileAccess.WRITE)
	var where := ""
	if f != null:
		f.seek_end()
		f.store_string("%s\n%s\n\n" % [Time.get_datetime_string_from_system(false, true), text])
		f.close()
		where = ProjectSettings.globalize_path(LOG)
	return "Printed to the console and copied to the clipboard%s." % (" · also added to %s" % where if where != "" else "")


# ------------------------------------------------------------------ what it is

## Everything the prompt needs to know about one thing: name, look, footprint class, size and colours, style.
static func _facts(ref: Dictionary, lv: Level, title: String) -> Dictionary:
	var kind: String = ref["kind"]
	var id: String = str(ref.get("id", ""))
	var f := {"kind": kind, "id": id, "name": title, "look": "", "cls": "", "moving": [], "where": ref.get("where", ""), "pos": ref.get("pos", Vector3.ZERO)}
	var meta: Dictionary = {}
	var m: Dictionary = {}
	match kind:
		"prop", "door", "window", "tile":
			var kit_id: String = ref.get("kit", lv.kit_id)
			meta = LM.model_meta(kit_id, id)
			m = _facts_model(f, ref, kit_id, meta)
		"item":
			m = _facts_item(f, ref, lv, title)
		"actor":
			m = _facts_actor(f, lv, title)
		"trap", "lift", "target":
			m = _facts_live(f, ref, lv, title)
	if m.is_empty():
		return {}
	f.merge(m)
	var style := _style_kit(f, lv)
	f["style_kit"] = style
	f["style_line"] = kit_tail(style)
	var here := _style_line(style, lv, f["pos"]) if style != "" else ""
	if here != "" and here != f["style_line"]:
		f["style_here"] = here                     # the kit has a look of its own for the room style it stands in
	f["room_kit"] = _room_kit(lv, f["pos"])
	if kind == "prop" and f["cls"] == "":
		f["cls"] = _footprint(f, meta, lv)
	return f


## A kit model (prop, door, window, tile): its kit's prompt.json look and name, its moving parts; measured.
static func _facts_model(f: Dictionary, ref: Dictionary, kit_id: String, meta: Dictionary) -> Dictionary:
	var kind: String = f["kind"]
	var id: String = f["id"]
	var home := LM.home_kit(kit_id, id)
	f["home"] = home
	if kind == "tile":
		f["surface"] = str(LM.kits.get(kit_id, {}).get("tiles", {}).get(id, {}).get("kind", "wall"))
	var mk := func() -> Node3D: return LM.spawn_model(kit_id, id)
	var m := PromptMeasure.model("%s|%s" % [home, id], mk, home)
	var look: Variant = LM.kits.get(home, {}).get("prompt", {}).get("looks", {}).get(id, {})
	if look is String:
		look = {"look": look}
	f["look"] = look.get("look", "")
	f["cls"] = look.get("class", "")
	match kind:
		"prop":
			f["name"] = look.get("name", meta.get("name", _nice(id)))
			var nd: Variant = ref.get("node")
			if is_instance_valid(nd) and nd is Prop and str(nd.e.get("name", "")) not in ["", f["name"]]:
				f["called"] = nd.e["name"]                # what this level calls this one
		"door":
			f["name"] = look.get("name", _nice(id.trim_prefix("door_")) + " Door")
		"tile":
			f["name"] = look.get("name", "%s %s" % [_nice(_bare_tile(id)), {"wall": "Wall", "floor": "Floor", "ceiling": "Ceiling"}.get(f["surface"], "Tile")])
		_:
			f["name"] = look.get("name", _nice(id.trim_prefix("window_")) + " Window")
	f["moving"] = _moving(meta)
	return m


## A tile's id without its surface and variant: wall_plain_b is a variant of the plain wall.
static func _bare_tile(id: String) -> String:
	var bare := id
	for pre in ["wall_", "floor_", "ceil_", "ceiling_"]:
		bare = bare.trim_prefix(pre)
	var vm := RegEx.create_from_string("^(.+?)(_[a-z]|_?\\d+)$").search(bare)
	if vm != null and vm.get_string(1).length() > 2:
		bare = vm.get_string(1)
	return bare


## An item: its def's name and kind, prompts.json's look for it (or the first words of its text); measured at its own
## size, not the size it is shown at.
static func _facts_item(f: Dictionary, ref: Dictionary, lv: Level, title: String) -> Dictionary:
	var id: String = f["id"]
	var d: Dictionary = LM.defs.get("items", {}).get(id, {})
	var kit_i: String = ref.get("kit", lv.kit_id)
	var model: String = ref.get("model", d.get("model", ""))
	var home_i := LM.home_kit(kit_i, model)
	f["home"] = home_i
	f["name"] = d.get("name", title)
	f["item_kind"] = d.get("kind", "")
	var mk_i := func() -> Node3D: return LM.spawn_model(kit_i, model)
	var m := PromptMeasure.model("%s|%s" % [home_i, model], mk_i, home_i)
	var il: Variant = LM.prompts.get("items", {}).get(id, "")
	f["look"] = il if il is String else il.get("look", "")
	if f["look"] == "" and d.get("text", "") != "":
		f["look"] = str(d["text"]).split(":")[0].split(".")[0].to_lower()
	return m


## A monster: prompts.json's look and body type for it, how it gets about; its model measured at its scale.
static func _facts_actor(f: Dictionary, lv: Level, title: String) -> Dictionary:
	var d: Dictionary = LM.defs.get("actors", {}).get(f["id"], {})
	if d.is_empty():
		return {}
	var path: String = d.get("model", "")
	path = path if path.begins_with("res://") else "res://" + path
	var home_a: String = "" if d.get("own_materials", false) else d.get("kit", lv.kit_id)
	f["home"] = home_a
	f["name"] = d.get("name", title)
	var sc: float = d.get("scale", 1.0)
	var mk_a := func() -> Node3D:
		var n := LM.spawn_scene(path, home_a)
		n.scale = Vector3.ONE * sc
		return n
	var m := PromptMeasure.model("actor|%s|%s|%s" % [path, home_a, sc], mk_a, home_a)
	var al: Variant = LM.prompts.get("actors", {}).get(f["id"], {})
	if al is String:
		al = {"look": al}
	f["look"] = al.get("look", "")
	f["shape"] = al.get("body", "machine" if d.has("aim") else "creature")
	var ways: Array = []
	if d.get("fly", false):
		ways.append("flies")
	if d.has("climb"):
		ways.append("climbs walls and ceilings")
	if d.has("swim"):
		ways.append("swims")
	if d.get("mount", "") == "ceiling":
		ways.append("hangs from the ceiling")
	if d.get("speed", 1.0) == 0.0 or d.has("still"):
		ways.append("does not move from its spot")
	f["ways"] = ways
	f["model"] = path
	return m


## A trap, lift or target: built by the engine, so the thing in the level is measured as it stands. A kit can still say
## what a trap's model is ("trap_<kind>" in its looks).
static func _facts_live(f: Dictionary, ref: Dictionary, lv: Level, title: String) -> Dictionary:
	var live: Variant = ref.get("node")
	if not is_instance_valid(live) or not live is Node3D:
		return {}
	f["home"] = lv.kit_id
	f["name"] = title
	for k in LM.kits:
		var tl: Variant = LM.kits[k].get("prompt", {}).get("looks", {}).get("trap_" + str(f["id"]))
		if tl is Dictionary:
			f["look"] = tl.get("look", "")
			f["name"] = tl.get("name", title)
			break
	return PromptMeasure.node(live, Transform3D(Basis.from_scale((live as Node3D).scale), Vector3.ZERO), lv.kit_id)


## The kit whose look the prompt asks for: the model's own, unless its kit has no look of its own (loot containers are made
## in each place's materials): then the kit named by its tag (lt_box_ex: the Executive Floor), or the room it stands in.
static func _style_kit(f: Dictionary, lv: Level) -> String:
	var home: String = f.get("home", "")
	if kit_tail(home) != "":
		return home
	var id: String = f.get("id", "")
	for k in LM.kits:
		var tag: String = LM.kits[k].get("prompt", {}).get("tag", "")
		if tag != "" and kit_tail(k) != "" and (id.ends_with("_" + tag) or id.begins_with(tag + "_")):
			return k
	var rk := _room_kit(lv, f.get("pos", Vector3.ZERO))
	if rk != "":
		return rk
	var first: String = str(LM.game.get("kits", [""])[0])      # the game's first kit, as the look of last resort
	return lv.kit_id if kit_tail(lv.kit_id) != "" else (first if LM.kits.has(first) else "")


## The kit most of the tiles round a spot come from (only kits with a look of their own count).
static func _room_kit(lv: Level, pos: Vector3) -> String:
	var c := lv.cell_of(pos)
	var count := {}
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			for t in lv.tiles_at.get(Vector2i(c.x + dx, c.y + dy), []):
				if absf((t[1] as Vector3).y - pos.y) > lv.H * 1.2:
					continue
				var k := LM.home_kit(lv.kit_id, t[0])
				if kit_tail(k) != "":
					count[k] = count.get(k, 0) + (3 if dx == 0 and dy == 0 else 1)
	var best := ""
	for k in count:
		if best == "" or count[k] > count[best]:
			best = k
	return best


## A kit's style line (its prompt.json "tail"); "" for a kit with no look of its own.
static func kit_tail(kit_id: String) -> String:
	return str(LM.kits.get(kit_id, {}).get("prompt", {}).get("tail", ""))


## The style line for a kit, or for the style of the room when the kit has one per style.
static func _style_line(kit_id: String, lv: Level, pos: Vector3) -> String:
	var pr: Dictionary = LM.kits.get(kit_id, {}).get("prompt", {})
	var c := lv.cell_of(pos)
	var st: String = lv.cell(c.x, c.y, lv.floor_of(pos)).get("style", "")
	return str(pr.get("styles", {}).get(st, pr.get("tail", "")))


## Wall piece, wall-mounted, floor piece, centrepiece or corner dressing: from how it is mounted, its size, and how near
## the walls it stands.
static func _footprint(f: Dictionary, meta: Dictionary, lv: Level) -> String:
	var s: Vector3 = f["size"]
	if meta.get("mount", "") == "wall":
		return "mounted" if f["bottom"] > 0.35 else "wall"
	if maxf(s.x, s.z) > CELL_FOOTPRINT + 0.05:
		return "centrepiece"
	var near := _walls_near(lv, f["pos"], minf(s.x, s.z) / 2.0 + 0.7)
	if near.size() >= 2 and maxf(s.x, s.z) <= 1.7 and (near.has(0) or near.has(2)) and (near.has(1) or near.has(3)):
		return "corner"
	if not near.is_empty() and minf(s.x, s.z) <= 1.25:
		return "wall"
	return "floor"


## The sides (0 n, 1 e, 2 s, 3 w) of its cell that are solid and within reach of a spot.
static func _walls_near(lv: Level, pos: Vector3, reach: float) -> Array:
	var c := lv.cell_of(pos)
	var st := lv.floor_of(pos)
	var mid := lv.center(c)
	var out: Array = []
	for i in 4:
		var d: Vector2i = Level.DIRS[i]
		if lv.open_s(c.x + d.x, c.y + d.y, st):
			continue
		var to_edge := lv.C / 2.0 - ((pos.x - mid.x) * d.x + (pos.z - mid.z) * d.y)
		if to_edge < reach:
			out.append(i)
	return out


static func _moving(meta: Dictionary) -> Array:
	var out: Array = []
	var parts: Dictionary = meta.get("parts", {})
	for name in parts:
		var sp: Dictionary = parts[name]
		var how := "moves"
		if sp.has("rot_deg"):
			how = "swings open on a hinge"
		elif sp.has("move"):
			var mv := LM.vec(sp["move"])
			if absf(mv.y) >= maxf(absf(mv.x), absf(mv.z)):
				how = "slides up" if mv.y > 0 else "slides down"
			else:
				how = "slides sideways" if absf(mv.x) >= absf(mv.z) else "slides out"
		out.append("the %s %s" % [_part_name(name), how])
	for name in meta.get("spin", {}):
		out.append("the %s spins" % _part_name(name))
	return out


static func _part_name(n: String) -> String:
	var s := n
	for suf in ["_l", "_r"]:
		if s.ends_with(suf):
			s = s.substr(0, s.length() - 2) + (" (left)" if suf == "_l" else " (right)")
	if s.begins_with("spin") and s.substr(4).is_valid_int():
		return "spinning part %s" % s.substr(4)
	return s.replace("_", " ")


## An id as a name, without its kit's prefix (the "tag" in each kit's prompt.json): ex_desk -> "Desk".
static func _nice(id: String) -> String:
	var s := id
	for k in LM.kits:
		var tag: String = LM.kits[k].get("prompt", {}).get("tag", "")
		if tag != "" and s.begins_with(tag + "_"):
			s = s.substr(tag.length() + 1)
			break
	return s.replace("_", " ").capitalize()
