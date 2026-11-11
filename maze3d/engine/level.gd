extends Node3D
## Level - builds a playable place from a level dictionary (a JSON file, or what a generator
## returns) and a kit, then answers questions about it: where is open, how do I get there,
## what is tagged what. SPEC.md, "Levels".
class_name Level

const DIRS := [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]     # n e s w
const DIR_NAMES := {"n": 0, "e": 1, "s": 2, "w": 3}
const DIR_ROT := [0.0, -PI / 2, PI, PI / 2]       # a wall on that side, facing in
const DEFAULT_LEGEND := {"#": {"solid": true}, " ": {"solid": true, "void": true}, ".": {}, "+": {"door": "door_split"}}

var data: Dictionary
var kit: Dictionary
var kit_id: String
var C := 4.0
var H := 4.0
var w := 0
var h := 0
var cells: Array = []            # per cell: { solid, door, style, height, tag, room }
var tags: Dictionary = {}        # tag -> Array of Vector2i
var things_by_tag: Dictionary = {}
var doors: Dictionary = {}       # Vector2i -> Door
var rooms: Array = []
var nav := AStar3D.new()          # points: ground, deck 1, deck 2 and ramp, per cell
var start_level := 0
var _boxes: Array = []           # unit cubes that make decks, ramps and railings
var _rails: Array = []
var _solid: StaticBody3D
var _glass: StaticBody3D
const GLASS := 32                # collision layer of things that stop bodies and shots but not sight
var start_cell := Vector2i.ZERO
var start_yaw := 0.0
var explored: Dictionary = {}
var actors: Array = []
var lights_by_room: Dictionary = {}
var _flick: Array = []
var _rng := RandomNumberGenerator.new()
var _triggers: Array = []
var _last_cell := Vector2i(-99, -99)
var _last_room := ""
var _t := 0.0
var bad_doors := 0


func build(level_data: Dictionary) -> void:
	data = level_data
	kit_id = data.get("kit", "hightech")
	kit = LM.kits[kit_id]
	C = kit.get("cell", 4.0)
	H = kit.get("height", 4.0)
	_rng.seed = hash(data.get("id", "level")) + int(data.get("seed", 0))
	_parse()
	_solid = StaticBody3D.new()
	_solid.name = "Solid"
	_solid.collision_layer = 1
	_solid.collision_mask = 0
	add_child(_solid)
	_glass = StaticBody3D.new()
	_glass.name = "Glass"
	_glass.collision_layer = GLASS
	_glass.collision_mask = 0
	add_child(_glass)
	_build_shell()
	_build_collision()
	_build_nav()
	_build_things()
	_build_fluid()
	_build_environment()
	for t in data.get("triggers", []):
		_triggers.append({"t": t, "fired": false})
	Game.flag_set.connect(_on_flag)


# ------------------------------------------------------------------ reading the map
func _parse() -> void:
	var legend: Dictionary = DEFAULT_LEGEND.duplicate()
	for k in data.get("legend", {}):
		legend[k] = data["legend"][k]
	var rows: Array = data.get("map", [])
	h = rows.size()
	for r in rows:
		w = max(w, str(r).length())
	rooms = data.get("rooms", [])
	var def_style: String = data.get("style", kit["styles"].keys()[0])
	var def_h: int = int(data.get("height", 1))
	cells.resize(w * h)
	for y in h:
		var row: String = rows[y]
		for x in w:
			var ch := row[x] if x < row.length() else " "
			var e: Dictionary = legend.get(ch, {})
			var c := {"solid": e.get("solid", false), "void": e.get("void", false), "door": e.get("door", ""), "entry": e,
				"style": e.get("style", def_style), "height": def_h, "fluid": e.get("fluid", false),
				"diag": e.get("diag", ""), "decks": _decks_of(e.get("deck", 0)), "ramp": e.get("ramp", {}), "window": _win_of(e.get("window", "")), "edges": _edges_of(e.get("walls", {})), "tag": e.get("tag", ""), "room": ""}
			for rm in rooms:
				var rc: Array = rm["rect"]
				if x >= rc[0] and y >= rc[1] and x < rc[0] + rc[2] and y < rc[1] + rc[3]:
					c["room"] = rm.get("name", "")
					if not e.has("style"):
						c["style"] = rm.get("style", def_style)
					c["height"] = int(rm.get("height", def_h))
					break
			if c["door"] != "" or c["window"] != "":
				c["height"] = 1
			if c["tag"] != "":
				_tag(c["tag"], Vector2i(x, y))
			if e.get("start", false):
				start_cell = Vector2i(x, y)
				start_yaw = _face_yaw(e.get("face", "n"))
			cells[y * w + x] = c
	# ---- shape: all of this can also be listed, which is easier for a generator than a legend
	for e in data.get("diags", []):          # {"at": [x, y], "corner": "ne"}: that corner of the cell is wall, cut across
		_c(e["at"])["diag"] = e.get("corner", "ne")
	for e in data.get("decks", []):          # {"rect": [x, y, w, h], "level": 1}: a floor at that storey, over whatever is below
		var rc: Array = e.get("rect", [e.get("at", [0, 0])[0], e.get("at", [0, 0])[1], 1, 1])
		for yy in range(rc[1], rc[1] + rc[3]):
			for xx in range(rc[0], rc[0] + rc[2]):
				var cc := cell(xx, yy)
				if not cc["solid"] and not cc["decks"].has(int(e.get("level", 1))):
					cc["decks"] = cc["decks"] + [int(e.get("level", 1))]
	for e in data.get("ramps", []):          # {"at": [x, y], "dir": "n", "from": 0, "to": 2}: metres, rising toward dir
		_c(e["at"])["ramp"] = {"dir": e.get("dir", "n"), "from": float(e.get("from", 0)), "to": float(e.get("to", 2))}
	for e in data.get("windows", []):        # [x, y] or {"at": [x, y], "model": ...}: a wall cell that is a window instead
		var wc := _c(e["at"] if e is Dictionary else e)
		wc["solid"] = false
		wc["window"] = (e.get("model", "window_obs") if e is Dictionary else "window_obs")
		wc["height"] = 1
	for e in data.get("walls", []):          # {"at": [x, y], "side": "e", "kind": "wall" | "window"}: a thin wall on that edge
		_c(e["at"])["edges"][DIR_NAMES.get(e.get("side", "e"), 1)] = e.get("kind", "wall")
	for y in h:                              # a thin wall belongs to both cells it stands between
		for x in w:
			var c2 := cell(x, y)
			for d in c2["edges"].keys():
				var nb := cell(x + DIRS[d].x, y + DIRS[d].y)
				if not nb.get("void", false) and nb.has("edges") and not nb["edges"].has((d + 2) % 4):
					nb["edges"][(d + 2) % 4] = c2["edges"][d]
			for lv in c2["decks"]:
				c2["height"] = max(c2["height"], lv + 1)
	for t in data.get("tags", {}):          # tags can also be listed: "tags": { "ambush": [[4, 7], [5, 7]] }
		for p in data["tags"][t]:
			_tag(t, Vector2i(int(p[0]), int(p[1])))
			if cell(int(p[0]), int(p[1]))["tag"] == "":
				cells[int(p[1]) * w + int(p[0])]["tag"] = t


func _c(at: Array) -> Dictionary:
	return cell(int(at[0]), int(at[1]))


func _decks_of(v: Variant) -> Array:
	if v is Array:
		return v.map(func(a): return int(a))
	return [int(v)] if int(v) > 0 else []


func _win_of(v: Variant) -> String:
	if v is bool:
		return "window_obs" if v else ""
	return str(v)


func _edges_of(v: Variant) -> Dictionary:
	var out := {}
	if v is String:
		for ch in v:
			if DIR_NAMES.has(ch):
				out[DIR_NAMES[ch]] = "wall"
	elif v is Dictionary:
		for k in v:
			if DIR_NAMES.has(k):
				out[DIR_NAMES[k]] = v[k]
	return out


## Corner name -> (the two sides that corner closes, the yaw of a wall across it facing the open half)
const DIAG := {"ne": [[0, 1], -PI / 4], "nw": [[0, 3], PI / 4], "se": [[2, 1], -3 * PI / 4], "sw": [[2, 3], 3 * PI / 4]}


func _tag(t: String, p: Vector2i) -> void:
	if not tags.has(t):
		tags[t] = []
	tags[t].append(p)


func cell(x: int, y: int) -> Dictionary:
	if x < 0 or y < 0 or x >= w or y >= h:
		return {"solid": true, "void": true, "height": 0, "door": "", "style": "", "room": "", "tag": "", "fluid": false, "diag": "", "decks": [], "ramp": {}, "window": "", "edges": {}}
	return cells[y * w + x]


func is_open(x: int, y: int) -> bool:
	return not cell(x, y)["solid"]


func center(p: Vector2i, y := 0.0) -> Vector3:
	return Vector3(p.x * C + C / 2, y, p.y * C + C / 2)


func cell_of(pos: Vector3) -> Vector2i:
	return Vector2i(floori(pos.x / C), floori(pos.z / C))


func room_at(p: Vector2i) -> String:
	return cell(p.x, p.y)["room"]


func _face_yaw(f: Variant) -> float:
	# the yaw that makes a model's front (+Z) look that way; for the player, the way they look
	match str(f):
		"n": return PI
		"e": return PI / 2
		"w": return -PI / 2
	return 0.0


func _pick(list: Variant) -> String:
	if list is String:
		return list
	if list == null or list.is_empty():
		return ""
	var total := 0.0
	for e in list:
		total += (e[1] if e is Array else 1.0)
	var r := _rng.randf() * total
	for e in list:
		r -= (e[1] if e is Array else 1.0)
		if r <= 0.0:
			return e[0] if e is Array else e
	var last: Variant = list[list.size() - 1]
	return last[0] if last is Array else last


# ------------------------------------------------------------------ floors, walls, ceilings
func _build_shell() -> void:
	var batches: Dictionary = {}       # "tile|cx|cy" -> Array[Transform3D]
	var styles: Dictionary = kit["styles"]
	for y in h:
		for x in w:
			var c := cell(x, y)
			if c["solid"]:
				continue
			var st: Dictionary = styles.get(c["style"], styles.values()[0])
			var p := center(Vector2i(x, y))
			var hh: int = c["height"]
			var room: String = c["room"]
			var quarter := _rng.randi() % 4 * PI / 2
			_add(batches, _pick(st.get("floor")), Transform3D(Basis(Vector3.UP, quarter), p), x, y, room)
			var ceil_tile := _pick(st.get("ceiling"))
			var li: Dictionary = _lights_for(st, room)
			if not li.is_empty() and c["door"] == "":
				var every: int = int(li.get("every", 3))
				if (x + int(li.get("ox", 0))) % every == 0 and (y + int(li.get("oy", 0))) % every == 0:
					ceil_tile = li.get("tile", ceil_tile) if _rng.randf() >= li.get("dead", 0.0) else li.get("dead_tile", ceil_tile)
			_add(batches, ceil_tile, Transform3D(Basis(Vector3.UP, _rng.randi() % 4 * PI / 2), p + Vector3(0, hh * H, 0)), x, y, room, st, hh)
			var closed: Array = DIAG[c["diag"]][0] if c["diag"] != "" else []
			if c["diag"] != "":                          # a wall across the corner, a diagonal long
				for lv in hh:
					var dt := _pick(st.get("wall") if lv == 0 else st.get("wall_upper", st.get("wall")))
					_add(batches, dt, Transform3D(Basis(Vector3.UP, DIAG[c["diag"]][1]).scaled_local(Vector3(1.4142, 1, 1)), p + Vector3(0, lv * H, 0)), x, y, room, st)
			for d in 4:
				if d in closed:
					continue
				var nb := cell(x + DIRS[d].x, y + DIRS[d].y)
				var from_level := 0
				var inset := 0.0
				var edge: String = c["edges"].get(d, "")
				if edge != "":                               # a thin wall on this edge: each side shows its own face
					inset = 0.15
					if edge == "window":
						from_level = 1
						if d == 1 or d == 2 or nb["solid"]:
							_thin_window(p + Vector3(DIRS[d].x, 0, DIRS[d].y) * (C / 2), d)
				elif not nb["solid"]:
					if nb["height"] >= hh:
						continue
					from_level = nb["height"]
				var wp := p + Vector3(DIRS[d].x, 0, DIRS[d].y) * (C / 2 - inset)
				for lv in range(from_level, hh):
					var tile := _pick(st.get("wall") if lv == 0 else st.get("wall_upper", st.get("wall")))
					_add(batches, tile, Transform3D(Basis(Vector3.UP, DIR_ROT[d]), wp + Vector3(0, lv * H, 0)), x, y, room, st)
			for lv in c["decks"]:                        # a balcony: a slab, a floor on it, a rail wherever there is a drop
				_boxes.append(Transform3D(Basis().scaled(Vector3(C, 0.3, C)), p + Vector3(0, lv * H - 0.16, 0)))
				_add(batches, _pick(st.get("floor")), Transform3D(Basis(Vector3.UP, quarter), p + Vector3(0, lv * H, 0)), x, y, room)
				for d in 4:
					if _needs_rail(x, y, lv, d):
						_rail(Transform3D(Basis(Vector3.UP, DIR_ROT[d]), p + Vector3(DIRS[d].x, 0, DIRS[d].y) * (C / 2 - 0.08) + Vector3(0, lv * H, 0)), C)
			if not c["ramp"].is_empty():
				_ramp(x, y, c, _pick(st.get("floor")), batches, room)
	var holder := Node3D.new()
	holder.name = "Shell"
	add_child(holder)
	for pair in [[_boxes, Color(0.11, 0.12, 0.14), 0.0], [_rails, Color(0.75, 0.5, 0.2), 0.5]]:
		var lst: Array = pair[0]
		if lst.is_empty():
			continue
		var bm := MultiMesh.new()
		bm.transform_format = MultiMesh.TRANSFORM_3D
		bm.mesh = BoxMesh.new()
		bm.instance_count = lst.size()
		for i in lst.size():
			bm.set_instance_transform(i, lst[i])
		var mat := StandardMaterial3D.new()
		mat.albedo_color = pair[1]
		mat.metallic = 0.7
		mat.roughness = 0.45
		if pair[2] > 0.0:
			mat.emission_enabled = true
			mat.emission = pair[1]
			mat.emission_energy_multiplier = pair[2]
		var bi := MultiMeshInstance3D.new()
		bi.multimesh = bm
		bi.material_override = mat
		holder.add_child(bi)
	for key in batches:
		var parts: PackedStringArray = key.split("|")
		var mesh := LM.tile_mesh(kit_id, parts[0])
		if mesh == null:
			continue
		var list: Array = batches[key]
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = list.size()
		for i in list.size():
			mm.set_instance_transform(i, list[i])
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		holder.add_child(mmi)


## Is there a drop off this side of a deck?
func _needs_rail(x: int, y: int, lv: int, d: int) -> bool:
	var c := cell(x, y)
	if c["edges"].has(d) or (c["diag"] != "" and d in DIAG[c["diag"]][0]):
		return false
	var nb := cell(x + DIRS[d].x, y + DIRS[d].y)
	if nb["solid"] or nb["door"] != "" or nb["window"] != "" or nb["height"] <= lv or nb["decks"].has(lv):
		return false
	var r: Dictionary = nb["ramp"]
	if not r.is_empty():                             # a ramp that arrives here, or leaves from here
		var rd: int = DIR_NAMES.get(r.get("dir", "n"), 0)
		if rd == (d + 2) % 4 and absf(float(r.get("to", 0)) - lv * H) < 0.1:
			return false
		if rd == d and absf(float(r.get("from", 0)) - lv * H) < 0.1:
			return false
	return true


## A railing along local X, centred on xf, standing on xf's origin. Its collision too.
func _rail(xf: Transform3D, length: float) -> void:
	for hgt in [0.55, 1.05]:
		_rails.append(xf * Transform3D(Basis().scaled(Vector3(length, 0.06, 0.06)), Vector3(0, hgt, 0)))
	var n := int(max(2, round(length / 1.34) + 1))
	for i in n:
		_boxes.append(xf * Transform3D(Basis().scaled(Vector3(0.07, 1.08, 0.07)), Vector3(-length / 2 + 0.05 + (length - 0.1) * i / (n - 1), 0.54, 0)))
	_shape(_solid, xf * Transform3D(Basis(), Vector3(0, 0.56, 0)), Vector3(length, 1.12, 0.12))


func _ramp(x: int, y: int, c: Dictionary, tile: String, batches: Dictionary, room: String) -> void:
	var r: Dictionary = c["ramp"]
	var d: int = DIR_NAMES.get(r.get("dir", "n"), 0)
	var y0: float = float(r.get("from", 0))
	var y1: float = float(r.get("to", 2))
	var hz := Vector3(DIRS[d].x, 0, DIRS[d].y)
	var along := (hz * C + Vector3(0, y1 - y0, 0))
	var length := along.length()
	var zb := along / length
	var xb := Vector3.UP.cross(hz).normalized()
	var yb := zb.cross(xb).normalized()
	var top := Transform3D(Basis(xb, yb, zb), center(Vector2i(x, y)) + Vector3(0, (y0 + y1) / 2, 0))
	_boxes.append(top * Transform3D(Basis().scaled(Vector3(C, 0.3, length)), Vector3(0, -0.16, 0)))
	_shape(_solid, top * Transform3D(Basis(), Vector3(0, -0.15, 0)), Vector3(C, 0.3, length))
	_add(batches, tile, top * Transform3D(Basis().scaled(Vector3(1, 1, length / C)), Vector3.ZERO), x, y, room)
	for s in [-1, 1]:                                # a rail down each side, unless a wall is there
		var sd := (d + (1 if s > 0 else 3)) % 4
		var side := cell(x + DIRS[sd].x, y + DIRS[sd].y)
		var sr: Dictionary = side["ramp"]
		if side["solid"] or (not sr.is_empty() and sr.get("dir", "") == r.get("dir", "") and float(sr.get("from", 0)) == y0):
			continue
		var xf := top * Transform3D(Basis(Vector3.UP, PI / 2), Vector3((C / 2 - 0.08) * (1.0 if xb.dot(Vector3(DIRS[sd].x, 0, DIRS[sd].y)) > 0 else -1.0), 0, 0))
		_rail(xf, length)


func _thin_window(at: Vector3, d: int) -> void:
	var inst := LM.spawn_model(kit_id, "window_obs")
	if inst == null:
		return
	add_child(inst)
	inst.position = at
	inst.rotation.y = DIR_ROT[d]
	inst.scale = Vector3(1, 1, 0.45)
	_shape(_glass, Transform3D(Basis(Vector3.UP, DIR_ROT[d]), at + Vector3(0, H / 2, 0)), Vector3(C, H, 0.3))


func _shape(body: StaticBody3D, xf: Transform3D, size: Vector3) -> void:
	var cs := CollisionShape3D.new()
	var b := BoxShape3D.new()
	b.size = size
	cs.shape = b
	cs.transform = xf
	body.add_child(cs)


func _lights_for(st: Dictionary, room: String) -> Dictionary:
	# a room can adjust its style's lighting: "lights": { "ox": 1, "every": 3, "flicker": 1.0 }
	var li: Dictionary = st.get("lights", {})
	for rm in rooms:
		if rm.get("name", "") == room and rm.has("lights"):
			li = li.duplicate()
			for k in rm["lights"]:
				li[k] = rm["lights"][k]
			break
	return li


func _add(batches: Dictionary, tile: String, xf: Transform3D, x: int, y: int, room: String, st: Dictionary = {}, storeys := 1) -> void:
	if tile == "":
		return
	var key := "%s|%d|%d" % [tile, x / 6, y / 6]
	if not batches.has(key):
		batches[key] = []
	batches[key].append(xf)
	var meta: Dictionary = kit["tiles"].get(tile, {})
	if meta.has("light"):
		var li: Dictionary = _lights_for(st, room)
		var spec: Dictionary = meta["light"]
		if storeys > 1 and meta.get("kind", "") == "ceiling":      # a light high up has further to reach
			spec = spec.duplicate()
			spec["range"] = spec.get("range", 8.0) + 6.0 * (storeys - 1)
			spec["energy"] = spec.get("energy", 1.0) * (1.0 + 0.9 * (storeys - 1))
		_make_light(spec, xf, room, li.get("flicker", 0.0), li.get("shadows", meta.get("kind", "") == "ceiling"), li.get("energy", 1.0))


func _make_light(spec: Dictionary, xf: Transform3D, room: String, flicker := 0.0, shadows := false, scale := 1.0) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.light_color = LM.col(spec.get("color"), Color.WHITE)
	l.light_energy = spec.get("energy", 1.0) * scale
	l.omni_range = spec.get("range", 8.0)
	l.omni_attenuation = 1.0
	l.shadow_enabled = shadows
	l.shadow_bias = 0.08
	l.distance_fade_enabled = true
	l.distance_fade_begin = 38.0
	l.distance_fade_length = 10.0
	l.distance_fade_shadow = 22.0
	add_child(l)
	l.position = xf * LM.vec(spec.get("at"))
	if not lights_by_room.has(room):
		lights_by_room[room] = []
	lights_by_room[room].append(l)
	l.set_meta("base", l.light_energy)
	if flicker > 0.0 and _rng.randf() < flicker:
		_flick.append({"l": l, "seed": _rng.randf() * 100.0, "mode": _rng.randi() % 2})
	elif spec.has("pulse"):
		_flick.append({"l": l, "seed": _rng.randf() * 100.0, "mode": 2, "amt": spec["pulse"]})
	return l


func _build_collision() -> void:
	var body := _solid
	var max_h := 1
	for c in cells:
		max_h = max(max_h, c["height"])
	_box(body, Vector3(w * C / 2, -0.5, h * C / 2), Vector3(w * C, 1, h * C))
	for y in h:
		var x := 0
		while x < w:
			var c := cell(x, y)
			# solid cells that touch open ones, merged along the row
			if c["solid"] and _touches_open(x, y):
				var x0 := x
				while x < w and cell(x, y)["solid"] and _touches_open(x, y):
					x += 1
				_box(body, Vector3((x0 + x) * C / 2, max_h * H / 2, y * C + C / 2), Vector3((x - x0) * C, max_h * H, C))
				continue
			if not c["solid"]:
				var x1 := x
				var hh: int = c["height"]
				while x < w and not cell(x, y)["solid"] and cell(x, y)["height"] == hh:
					x += 1
				_box(body, Vector3((x1 + x) * C / 2, hh * H + 0.5, y * C + C / 2), Vector3((x - x1) * C, 1, C))
				continue
			x += 1
	for y in h:                                      # the pieces that are not whole cells
		for x in w:
			var c := cell(x, y)
			if c["solid"]:
				continue
			var p := center(Vector2i(x, y))
			var hh2: float = c["height"] * H
			if c["diag"] != "":
				_shape(body, Transform3D(Basis(Vector3.UP, DIAG[c["diag"]][1]), p + Vector3(0, hh2 / 2, 0)) * Transform3D(Basis(), Vector3(0, 0, -0.15)), Vector3(C * 1.4142, hh2, 0.3))
			for d in c["edges"].keys():
				if d == 1 or d == 2 or cell(x + DIRS[d].x, y + DIRS[d].y)["solid"]:
					var kind: String = c["edges"][d]
					var ep := p + Vector3(DIRS[d].x, 0, DIRS[d].y) * (C / 2)
					var lo: float = H if kind == "window" else 0.0
					if hh2 > lo:
						_shape(body, Transform3D(Basis(Vector3.UP, DIR_ROT[d]), ep + Vector3(0, (lo + hh2) / 2, 0)), Vector3(C, hh2 - lo, 0.3))
			for lv in c["decks"]:
				_box(body, p + Vector3(0, lv * H - 0.15, 0), Vector3(C, 0.3, C))


func _touches_open(x: int, y: int) -> bool:
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if is_open(x + dx, y + dy):
				return true
	return false


func _box(body: StaticBody3D, at: Vector3, size: Vector3) -> void:
	var cs := CollisionShape3D.new()
	var b := BoxShape3D.new()
	b.size = size
	cs.shape = b
	cs.position = at
	body.add_child(cs)


func _nid(x: int, y: int, layer: int) -> int:
	return (layer * h + y) * w + x


func _ground_ok(c: Dictionary) -> bool:
	if c["solid"] or c["window"] != "":
		return false
	var r: Dictionary = c["ramp"]
	return r.is_empty() or min(float(r.get("from", 0)), float(r.get("to", 0))) >= H - 0.1


## Can something on the ground step from (x, y) toward side d?
func _open_side(x: int, y: int, d: int) -> bool:
	var c := cell(x, y)
	if c["edges"].has(d) or (c["diag"] != "" and d in DIAG[c["diag"]][0]):
		return false
	var nb := cell(x + DIRS[d].x, y + DIRS[d].y)
	if not _ground_ok(nb) or (nb["diag"] != "" and (d + 2) % 4 in DIAG[nb["diag"]][0]):
		return false
	return true


func _link(a: int, b: int) -> void:
	if nav.has_point(a) and nav.has_point(b) and a != b:
		nav.connect_points(a, b)


## The point of cell (x, y) that stands at height yy, or -1.
func _at_height(x: int, y: int, yy: float) -> int:
	var c := cell(x, y)
	var r: Dictionary = c["ramp"]
	if not r.is_empty() and (absf(float(r.get("from", 0)) - yy) < 0.1 or absf(float(r.get("to", 0)) - yy) < 0.1):
		return _nid(x, y, 3)
	if absf(yy) < 0.1 and _ground_ok(c):
		return _nid(x, y, 0)
	for lv in c["decks"]:
		if absf(lv * H - yy) < 0.1:
			return _nid(x, y, lv)
	return -1


func _build_nav() -> void:
	nav = AStar3D.new()
	for y in h:
		for x in w:
			var c := cell(x, y)
			if c["solid"]:
				continue
			var p := center(Vector2i(x, y))
			if _ground_ok(c):
				nav.add_point(_nid(x, y, 0), p)
			for lv in c["decks"]:
				nav.add_point(_nid(x, y, lv), p + Vector3(0, lv * H, 0))
			if not c["ramp"].is_empty():
				nav.add_point(_nid(x, y, 3), p + Vector3(0, (float(c["ramp"].get("from", 0)) + float(c["ramp"].get("to", 0))) / 2, 0))
	for y in h:
		for x in w:
			var c := cell(x, y)
			if c["solid"]:
				continue
			if nav.has_point(_nid(x, y, 0)):
				for d in 4:
					if _open_side(x, y, d):
						_link(_nid(x, y, 0), _nid(x + DIRS[d].x, y + DIRS[d].y, 0))
				for d in 4:                                  # corners, only when nothing is in the way either side
					var d2 := (d + 1) % 4
					var a: Vector2i = Vector2i(x, y) + DIRS[d]
					var b: Vector2i = Vector2i(x, y) + DIRS[d2]
					var t: Vector2i = a + DIRS[d2]
					if _open_side(x, y, d) and _open_side(x, y, d2) and _open_side(a.x, a.y, d2) and _open_side(b.x, b.y, d):
						if cell(x, y)["diag"] == "" and cell(a.x, a.y)["diag"] == "" and cell(b.x, b.y)["diag"] == "" and cell(t.x, t.y)["diag"] == "":
							_link(_nid(x, y, 0), _nid(t.x, t.y, 0))
			for lv in c["decks"]:
				for d in 4:
					var nb := cell(x + DIRS[d].x, y + DIRS[d].y)
					if not c["edges"].has(d) and nb["decks"].has(lv):
						_link(_nid(x, y, lv), _nid(x + DIRS[d].x, y + DIRS[d].y, lv))
			var r: Dictionary = c["ramp"]
			if not r.is_empty():
				var rd: int = DIR_NAMES.get(r.get("dir", "n"), 0)
				_link(_nid(x, y, 3), _at_height(x + DIRS[rd].x, y + DIRS[rd].y, float(r.get("to", 0))))
				_link(_nid(x, y, 3), _at_height(x - DIRS[rd].x, y - DIRS[rd].y, float(r.get("from", 0))))


func block(p: Vector2i, solid := true) -> void:
	var id := _nid(p.x, p.y, 0)
	if nav.has_point(id):
		nav.set_point_disabled(id, solid)


func is_blocked(p: Vector2i) -> bool:
	var id := _nid(p.x, p.y, 0)
	return nav.has_point(id) and nav.is_point_disabled(id)


## The nav point something standing at pos is on: the one in its cell nearest its height.
func _point_at(pos: Vector3) -> int:
	var p := cell_of(pos)
	var best := -1
	var bd := 1e9
	for layer in 4:
		var id := _nid(p.x, p.y, layer)
		if p.x >= 0 and p.y >= 0 and p.x < w and p.y < h and nav.has_point(id):
			var dd: float = absf(nav.get_point_position(id).y - pos.y)
			if dd < bd:
				bd = dd
				best = id
	return best


## Where to walk, one place after another, from here to there: over ramps and along balconies if that is the way.
func path(from: Vector3, to: Vector3) -> PackedVector3Array:
	var out := PackedVector3Array()
	var a := _point_at(from)
	var b := _point_at(to)
	if a < 0 and nav.get_point_count() > 0:
		a = nav.get_closest_point(from, true)
	if a < 0 or b < 0 or nav.is_point_disabled(b):
		return out
	var was := nav.is_point_disabled(a)
	if was:
		nav.set_point_disabled(a, false)
	out = nav.get_point_path(a, b)
	if was:
		nav.set_point_disabled(a, true)
	return out


## Height of the floor under pos: the ground, a deck or a ramp.
func floor_y(pos: Vector3) -> float:
	var id := _point_at(pos)
	return nav.get_point_position(id).y if id >= 0 else 0.0


## Can a be seen from b? Glass does not stop sight; pass shot = true to ask whether a bullet would get there.
func los(a: Vector3, b: Vector3, shot := false) -> bool:
	var q := PhysicsRayQueryParameters3D.create(a, b, 1 | (GLASS if shot else 0))
	return get_world_3d().direct_space_state.intersect_ray(q).is_empty()


# ------------------------------------------------------------------ doors, props, actors, pickups, traps
func _build_things() -> void:
	for y in h:
		for x in w:
			var c := cell(x, y)
			if c["door"] != "":
				_spawn_door(Vector2i(x, y), c)
			if c["window"] != "":
				_spawn_window(Vector2i(x, y), c)
	var ol: Dictionary = data.get("objectLegend", {})
	var rows: Array = data.get("objects", [])
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			var ch := row[x]
			if ch == " " or ch == ".":
				continue
			if ch == "@" and not ol.has("@"):
				start_cell = Vector2i(x, y)
				continue
			if ol.has(ch):
				var e: Variant = ol[ch]
				for one in (e if e is Array else [e]):
					spawn_thing(one, Vector2i(x, y))
			else:
				push_warning("Level %s: no objectLegend entry for '%s'" % [data.get("id"), ch])
	for e in data.get("things", []):
		if e.has("at"):
			spawn_thing(e, Vector2i(int(e["at"][0]), int(e["at"][1])))
		elif e.has("tag"):
			for p in tags.get(e["tag"], []):
				spawn_thing(e, p)


func _spawn_door(p: Vector2i, c: Dictionary) -> void:
	var across: bool = _wallish(p.x - 1, p.y) and _wallish(p.x + 1, p.y)
	var along: bool = _wallish(p.x, p.y - 1) and _wallish(p.x, p.y + 1)
	if not across and not along:
		# a door has to close an opening from wall to wall; anywhere else it would stand free in a room
		push_warning("Level %s: door at %s has no wall on both sides; left out" % [data.get("id"), p])
		c["door"] = ""
		bad_doors += 1
		return
	var d := Door.new()
	add_child(d)
	d.position = center(p)
	d.rotation.y = 0.0 if across else PI / 2
	d.setup(self, p, c["entry"], kit_id)
	doors[p] = d
	_register(d, c["entry"].get("tag", ""))


## A wall cell that is a window: it stands across the cell like a door, and never opens.
func _spawn_window(p: Vector2i, c: Dictionary) -> void:
	var across: bool = _wallish(p.x - 1, p.y) and _wallish(p.x + 1, p.y)
	var inst := LM.spawn_model(kit_id, c["window"])
	if inst:
		add_child(inst)
		inst.position = center(p)
		inst.rotation.y = 0.0 if across else PI / 2
	_shape(_glass, Transform3D(Basis(Vector3.UP, 0.0 if across else PI / 2), center(p, H / 2)), Vector3(C, H, 0.5))
	block(p, true)


## Wall, or something that stands in a wall's place (a window, a door).
func _wallish(x: int, y: int) -> bool:
	var c := cell(x, y)
	return c["solid"] or c["window"] != "" or c["door"] != ""


func _register(n: Node, tag: String) -> void:
	if tag == "":
		return
	if not things_by_tag.has(tag):
		things_by_tag[tag] = []
	things_by_tag[tag].append(n)


func spawn_thing(e: Dictionary, p: Vector2i) -> Node3D:
	if e.has("start"):
		start_level = int(e.get("level", 0))
		start_cell = p
		start_yaw = _face_yaw(e.get("face", "n"))
		return null
	var n: Node3D = null
	var off := LM.vec(e.get("offset"), Vector3.ZERO)
	var pos := center(p) + off + Vector3(0, int(e.get("level", 0)) * H, 0)      # "level": 1 puts it on the balcony there
	if e.has("actor"):
		var a := Enemy.new()
		add_child(a)
		a.position = pos
		a.rotation.y = _face_yaw(e.get("face", "s"))
		a.setup(self, LM.get_def("actors", e["actor"]), e)
		actors.append(a)
		n = a
	elif e.has("prop"):
		var pr := Prop.new()
		add_child(pr)
		var meta := LM.model_meta(kit_id, e["prop"])
		if meta.get("mount", "") == "wall":
			var d := _wall_side(p, e.get("face", ""))
			pr.position = center(p) + Vector3(DIRS[d].x, 0, DIRS[d].y) * (C / 2) + off
			pr.rotation.y = DIR_ROT[d]
		else:
			pr.position = pos
			pr.rotation.y = _face_yaw(e.get("face", "s")) + deg_to_rad(e.get("turn", 0.0))
		pr.setup(self, e, kit_id)
		if e.get("blocks", meta.has("solid") and meta["solid"][0] >= 1.4):
			block(p)
		n = pr
	elif e.has("item"):
		var it := Pickup.new()
		add_child(it)
		it.position = pos + Vector3(0, e.get("y", 1.0), 0)
		it.setup(self, e, kit_id)
		n = it
	elif e.has("trap"):
		var tr := Trap.new()
		add_child(tr)
		tr.position = center(p)
		tr.setup(self, e, p, kit_id)
		n = tr
	elif e.has("sign"):
		n = _sign(e, p)
	elif e.has("light"):
		var xf := Transform3D(Basis(), pos + Vector3(0, e.get("y", 3.0), 0))
		n = _make_light(e["light"], xf, room_at(p), e.get("flicker", 0.0), e.get("shadows", false))
	if n != null:
		_register(n, e.get("tag", ""))
	return n


func _wall_side(p: Vector2i, want: String) -> int:
	# `want` is the way the thing faces; it hangs on the wall behind it
	if DIR_NAMES.has(want):
		return (DIR_NAMES[want] + 2) % 4
	for d in [0, 3, 1, 2]:
		if cell(p.x + DIRS[d].x, p.y + DIRS[d].y)["solid"]:
			return d
	return 0


func _sign(e: Dictionary, p: Vector2i) -> Node3D:
	var d := _wall_side(p, e.get("face", ""))
	var l := Label3D.new()
	l.text = e["sign"]
	l.font_size = int(e.get("size", 96))
	l.pixel_size = 0.004
	l.modulate = LM.col(e.get("color"), Color(1.0, 0.35, 0.7))
	l.outline_modulate = Color(0, 0, 0, 0.6)
	l.outline_size = 8
	l.shaded = false
	l.double_sided = false
	l.width = 800
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(l)
	l.position = center(p) + Vector3(DIRS[d].x, 0, DIRS[d].y) * (C / 2 - 0.2) + Vector3(0, e.get("y", 2.6), 0)
	l.rotation.y = DIR_ROT[d]
	return l


# ------------------------------------------------------------------ fluid
## A legend entry with "fluid": true floods its cells: {"~": {"fluid": true}}. The level's "fluid" gives the look:
## {"level": 0.7, "color": [0.1, 0.5, 0.4, 0.6], "glow": 0.3}. It is shallow: the player wades (slower), most things
## are slowed, and an actor with "swim" in its def swims.
func _build_fluid() -> void:
	var spec: Dictionary = data.get("fluid", {})
	var y: float = spec.get("level", 0.7)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var any := false
	for cy in h:
		for cx in w:
			if not cell(cx, cy)["fluid"]:
				continue
			any = true
			var a := Vector3(cx * C, y, cy * C)
			for v in [Vector3(0, 0, 0), Vector3(C, 0, 0), Vector3(C, 0, C), Vector3(0, 0, 0), Vector3(C, 0, C), Vector3(0, 0, C)]:
				st.set_normal(Vector3.UP)
				st.add_vertex(a + v)
	if not any:
		return
	var m := StandardMaterial3D.new()
	var c := LM.col(spec.get("color"), Color(0.1, 0.5, 0.4, 0.62))
	m.albedo_color = c
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.roughness = 0.08
	m.metallic = 0.3
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.emission_enabled = true
	m.emission = Color(c.r, c.g, c.b)
	m.emission_energy_multiplier = spec.get("glow", 0.25)
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


func fluid_at(pos: Vector3) -> bool:
	var p := cell_of(pos)
	return cell(p.x, p.y)["fluid"] and pos.y < data.get("fluid", {}).get("level", 0.7)


# ------------------------------------------------------------------ mood
func _build_environment() -> void:
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.005, 0.006, 0.008)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = LM.col(data.get("ambient"), Color(0.25, 0.3, 0.38))
	env.ambient_light_energy = data.get("ambient_energy", 0.35)
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = data.get("exposure", 0.9)
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_bloom = 0.12
	env.glow_hdr_threshold = 1.0
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_ADDITIVE
	var fog: Dictionary = data.get("fog", {})
	env.fog_enabled = true
	env.fog_light_color = LM.col(fog.get("color"), Color(0.1, 0.14, 0.17))
	env.fog_density = fog.get("density", 0.012)
	env.ssao_enabled = true
	env.ssao_intensity = 2.2
	var forward: bool = RenderingServer.get_current_rendering_method() == "forward_plus"
	env.ssil_enabled = forward
	env.volumetric_fog_enabled = forward and fog.get("volumetric", true)
	env.volumetric_fog_density = fog.get("density", 0.012) * 1.6
	env.volumetric_fog_albedo = LM.col(fog.get("color"), Color(0.5, 0.6, 0.65))
	env.volumetric_fog_length = 48.0
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.08
	env.adjustment_saturation = 1.1
	we.environment = env
	add_child(we)


# ------------------------------------------------------------------ while playing
func _process(dt: float) -> void:
	_t += dt
	for f in _flick:
		var l: OmniLight3D = f["l"]
		if not is_instance_valid(l) or l.get_meta("off", false):
			continue
		var base: float = l.get_meta("base")
		match f["mode"]:
			0:      # a failing tube: mostly on, with stutters
				var n := fposmod(sin(floor(_t * 13.0 + f["seed"]) * 91.7) * 43758.5, 1.0)
				l.light_energy = base * (1.0 if n > 0.3 else n * 1.5)
			1:      # slow brown-out
				l.light_energy = base * (0.55 + 0.45 * sin(_t * 1.7 + f["seed"]) * sin(_t * 0.31 + f["seed"]))
			2:
				l.light_energy = base * (1.0 + f.get("amt", 0.3) * sin(_t * 2.4 + f["seed"]))
	var pl: Node3D = Game.player
	if pl == null or not is_instance_valid(pl):
		return
	var pc := cell_of(pl.global_position)
	if pc != _last_cell:
		_last_cell = pc
		for dy in range(-2, 3):
			for dx in range(-2, 3):
				explored[pc + Vector2i(dx, dy)] = true
		var c := cell(pc.x, pc.y)
		if c["tag"] != "":
			_fire("enter", c["tag"])
		if c["room"] != _last_room:
			_last_room = c["room"]
			if _last_room != "":
				_fire("room", _last_room)
				for rm in rooms:
					if rm.get("name", "") == _last_room and not rm.get("_seen", false):
						rm["_seen"] = true
						if not rm.get("quiet", false):
							Game.say(_last_room, "room")


func _on_flag(name: String) -> void:
	_fire("flag", name)


func notify(kind: String, what: String) -> void:
	_fire(kind, what)


func _fire(kind: String, what: String) -> void:
	for tr in _triggers:
		var t: Dictionary = tr["t"]
		var on: Dictionary = t.get("on", {})
		if on.get("type", "") != kind or on.get("name", on.get("tag", "")) != what:
			continue
		if tr["fired"] and t.get("once", true):
			continue
		if t.has("when") and not Game.has_flag(t["when"]):
			continue
		if t.has("unless") and Game.has_flag(t["unless"]):
			continue
		tr["fired"] = true
		Game.run_effects(t.get("do", []), {})


func actor_died(a: Node) -> void:
	var tag: String = a.tag
	if tag == "":
		return
	for o in things_by_tag.get(tag, []):
		if is_instance_valid(o) and o is Enemy and not o.dead:
			return
	_fire("clear", tag)


## Effects that belong to the place: doors, lights, spawns, alarms.
func run_effect(ef: Dictionary, ctx: Dictionary) -> void:
	var tag: String = ef.get("tag", "")
	match ef.get("type", ""):
		"unlock", "open", "seal", "close":
			for d in things_by_tag.get(tag, []):
				if d is Door:
					d.command(ef["type"])
		"lights":
			var on: bool = ef.get("on", true)
			for l in lights_by_room.get(ef.get("room", ""), []):
				l.set_meta("off", not on)
				l.light_energy = l.get_meta("base") if on else 0.0
				if ef.has("color"):
					l.light_color = LM.col(ef["color"])
		"spawn":
			var spots: Array = tags.get(tag, [])
			if ef.get("here", false) and ctx.has("at"):        # where the thing that ran the effect stands
				spots = [cell_of(ctx["at"])]
			for i in int(ef.get("count", 1)):
				if spots.is_empty():
					break
				var p: Vector2i = spots[i % spots.size()]
				var e := {"actor": ef.get("actor", ""), "tag": ef.get("as", ""), "alert": ef.get("alert", true),
					"offset": [randf_range(-1.0, 1.0), 0, randf_range(-1.0, 1.0)]}
				spawn_thing(e, p)
		"alarm":
			LM.sound("alarm")
			for a in actors:
				if is_instance_valid(a) and not a.dead:
					if not ef.has("radius") or a.global_position.distance_to(Game.player.global_position) < ef["radius"]:
						a.alert()
		"enable", "disable":
			for t in things_by_tag.get(tag, []):
				if t.has_method("set_enabled"):
					t.set_enabled(ef["type"] == "enable")
		_:
			push_warning("Unknown effect: " + str(ef.get("type")))
