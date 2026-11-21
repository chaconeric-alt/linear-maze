class_name PromptWriter
## PromptWriter - puts what ImagePrompt found out about a thing (its facts: name, look, size, colours, glow, moving parts,
## style) into words: the prompt paragraph and the notes under it. All the fixed wording comes from the game's
## prompts.json (cfg).

## The prompt: one paragraph in the order of the furniture style guide (lead, footprint class, proportions, colour
## scheme, glow, moving parts, style, low-poly line, shot line).
static func prompt(f: Dictionary, cfg: Dictionary) -> String:
	var kind: String = f["kind"]
	var s: Vector3 = f["size"]
	var out: Array = []
	var lead: String = cfg.get("lead_actor", "Low-poly 3D game character") if kind == "actor" else cfg.get("lead", "Low-poly 3D game asset")
	var what: String = f["name"]
	if kind in ["tile", "window", "door"]:
		var key: String = f.get("surface", kind) if kind == "tile" else kind
		what = "%s, %s" % [f["name"], cfg.get("leads", {}).get(key, "")]
	if f["look"] != "":
		what += ("; " if kind in ["tile", "window", "door"] else ", ") + f["look"]
	out.append("%s: %s." % [lead, what.strip_edges().trim_suffix(",")])
	if kind == "prop" and f["cls"] != "":
		out.append(_cls(cfg, f["cls"])[0])
	if kind == "actor":
		var tall := s.y
		var long := maxf(s.x, s.z)
		out.append("About %s tall%s." % [_m(tall), (" and %s long" % _m(long)) if long > tall * 1.15 else ""] if tall >= 0.3 else "")
	elif kind == "item":
		var big := maxf(s.x, maxf(s.y, s.z))
		if f.get("item_kind", "") == "weapon":
			out.append("About %s long %s." % [_m(big), cfg.get("scale_note", "")])
		else:
			out.append("%s about %s across %s." % ["A small object" if big < 0.6 else "An object", _m(big), cfg.get("scale_note", "")])
	elif kind in ["tile", "window"]:
		pass
	else:
		out.append("Proportions about %s wide, %s deep and %s tall %s." % [_m(s.x), _m(s.z), _m(s.y), cfg.get("scale_note", "")])
	out.append(_scheme(f["body"]))
	if not f["glow"].is_empty():
		var g: Array = []
		for e in f["glow"].slice(0, 4):
			g.append("%s (%s)" % [e[0], e[1]])
		out.append("%s: %s." % [cfg.get("glow", "Glowing parts"), _and(g)])
	if not f["moving"].is_empty():
		out.append("%s: %s." % [cfg.get("moving", "Visibly separate moving parts"), _and(f["moving"])])
	if kind == "actor" or kind == "item":
		if cfg.get("world", "") != "":
			out.append(cfg["world"])
	var tail: String = f.get("style_line", "") if kind not in ["actor", "item"] else ""
	if tail != "":
		out.append("Style: %s." % tail.trim_suffix("."))
	out.append(cfg.get("lowpoly_actor" if kind == "actor" else "lowpoly", ""))
	out.append(cfg.get("shots", {}).get(_shot(f), ""))
	var txt := " ".join(out.filter(func(x): return str(x) != ""))
	return txt.replace("  ", " ").replace(" .", ".")


static func _shot(f: Dictionary) -> String:
	match f["kind"]:
		"actor":
			return f.get("shape", "creature")
		"item":
			return "weapon" if f.get("item_kind", "") == "weapon" else "item"
		"tile":
			return f.get("surface", "wall")
		"window", "door":
			return f["kind"]
		"prop":
			return "mounted" if f["cls"] == "mounted" else "object"
	return "object"


static func _cls(cfg: Dictionary, cls: String) -> Array:
	var c: Variant = cfg.get("classes", {}).get(cls, [])
	return c if c is Array and c.size() >= 2 else ["", cls]


static func _scheme(body: Array) -> String:
	var most: Array = []
	var withs: Array = []
	var touch: Array = []
	for e in body:
		if e[2] < 0.03 or most.size() + withs.size() + touch.size() >= 7:
			continue
		var t := "%s (%s)" % [e[0], e[1]]
		if e[2] >= 0.25:
			most.append(t)
		elif e[2] >= 0.08:
			withs.append(t)
		else:
			touch.append(t)
	if most.is_empty() and not withs.is_empty():
		most.append(withs.pop_front())
	if most.is_empty() and not touch.is_empty():
		most.append(touch.pop_front())
	var parts: Array = []
	if not most.is_empty():
		parts.append("mostly " + _and(most))
	if not withs.is_empty():
		parts.append("with " + _and(withs))
	if not touch.is_empty():
		parts.append("small touches of " + _and(touch))
	return "Colour scheme: %s." % "; ".join(parts) if not parts.is_empty() else ""


## The notes under it, not for the image generator: export settings, the model now, the hand-over line, other styles.
static func notes(f: Dictionary, cfg: Dictionary, lv: Level) -> String:
	var lines: Array = []
	var kind: String = f["kind"]
	var s: Vector3 = f["size"]
	var ex: Dictionary = cfg.get("export", {})
	var home: String = f.get("home", "")
	var kit_name: String = LM.kits.get(f["style_kit"], {}).get("name", f["style_kit"])
	match kind:
		"prop", "trap", "lift", "target":
			lines.append(ex.get("furniture", ""))
			if kind == "prop":
				var c := _cls(cfg, f["cls"])
				lines.append("Footprint class: %s." % c[1])
		"door":
			lines.append(ex.get("door", ""))
		"tile", "window":
			lines.append(ex.get("tile", ""))
		"item":
			lines.append(ex.get("item", ""))
		"actor":
			lines.append(ex.get("actor", ""))
			lines.append("Rig: %s" % cfg.get("rigs", {}).get(f.get("shape", "creature"), ""))
			if not f.get("ways", []).is_empty():
				lines.append("In the game it %s." % _and(f["ways"]))
	var src := "monster \"%s\"" % f["id"] if kind == "actor" else ("%s \"%s\"" % [kind, f["id"]] if f["id"] != "" else kind)
	if home != "" and kind in ["prop", "door", "tile", "window", "item"]:
		src += " from kit %s" % home
	lines.append("In the game now: %s, %s wide × %s deep × %s tall, %s triangles." % [src, _m(s.x), _m(s.z), _m(s.y), _thousands(f["tris"])])
	if f.has("called"):
		lines.append("This level calls this one \"%s\"." % f["called"])
	if not f["moving"].is_empty():
		lines.append("Moving parts in the current model: %s. Make each a visibly separate piece and say so when you hand it over." % _and(f["moving"]))
	if not f["glow"].is_empty():
		lines.append("Glow: anything meant to light up should be a flat, clearly bounded area in one saturated colour, so it can be made emissive.")
	match kind:
		"prop":
			var hand := "%s, replaces %s, %s" % [kit_name, f["id"], _cls(cfg, f["cls"])[1].split(" (")[0]]
			if not f["moving"].is_empty():
				hand += ", " + _and(f["moving"]).replace("the ", "")
			lines.append("Hand-over line: \"%s.\"" % hand)
		"door", "tile", "window":
			lines.append("Hand-over line: \"%s, replaces %s.\"" % [kit_name, f["id"]])
		"item":
			lines.append("Hand-over line: \"Item %s (%s), replaces model %s.\"" % [f["id"], f["name"], LM.defs.get("items", {}).get(f["id"], {}).get("model", "?")])
		"actor":
			lines.append("Hand-over line: \"Monster %s (%s), replaces %s; it moves …, attacks …, idles ….\"" % [f["id"], f["name"], str(f.get("model", "")).get_file()])
	var rk: String = f.get("room_kit", "")
	if kind != "actor" and kind != "item" and rk != "" and rk != f["style_kit"] and ImagePrompt.kit_tail(rk) != "":
		lines.append("It stands in %s. For a version made for that room, swap the Style sentence for: \"Style: %s.\"" % [LM.kits[rk].get("name", rk), ImagePrompt.kit_tail(rk).trim_suffix(".")])
	if f.has("style_here"):
		lines.append("The room it stands in has a style of its own. For a version made for it, swap the Style sentence for: \"Style: %s.\"" % str(f["style_here"]).trim_suffix("."))
	if f.get("lock", false):
		lines.append("It has a lock light (a small flat panel the game colours by its state); keep it a separate flat piece.")
	if f["where"] != "":
		lines.append("Seen at: %s, in %s." % [f["where"], lv.data.get("name", lv.data.get("id", "this level"))])
	return "\n".join(lines.filter(func(x): return str(x) != ""))


static func _m(v: float) -> String:
	if v < 0.995:
		return "%d cm" % roundi(v * 100.0)
	return "%s m" % String.num(snappedf(v, 0.1), 1)


static func _thousands(n: int) -> String:
	var s := str(n)
	var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return s + out


static func _and(a: Array) -> String:
	if a.size() <= 1:
		return "" if a.is_empty() else str(a[0])
	return ", ".join(PackedStringArray(a.slice(0, a.size() - 1))) + " and " + str(a[-1])
