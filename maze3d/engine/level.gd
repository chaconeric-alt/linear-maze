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
var nav := AStarGrid2D.new()
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
	_build_shell()
	_build_collision()
	_build_nav()
	_build_things()
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
				"style": e.get("style", def_style), "height": def_h, "tag": e.get("tag", ""), "room": ""}
			for rm in rooms:
				var rc: Array = rm["rect"]
				if x >= rc[0] and y >= rc[1] and x < rc[0] + rc[2] and y < rc[1] + rc[3]:
					c["room"] = rm.get("name", "")
					if not e.has("style"):
						c["style"] = rm.get("style", def_style)
					c["height"] = int(rm.get("height", def_h))
					break
			if c["door"] != "":
				c["height"] = 1
			if c["tag"] != "":
				_tag(c["tag"], Vector2i(x, y))
			if e.get("start", false):
				start_cell = Vector2i(x, y)
				start_yaw = _face_yaw(e.get("face", "n"))
			cells[y * w + x] = c
	for t in data.get("tags", {}):          # tags can also be listed: "tags": { "ambush": [[4, 7], [5, 7]] }
		for p in data["tags"][t]:
			_tag(t, Vector2i(int(p[0]), int(p[1])))
			if cell(int(p[0]), int(p[1]))["tag"] == "":
				cells[int(p[1]) * w + int(p[0])]["tag"] = t


func _tag(t: String, p: Vector2i) -> void:
	if not tags.has(t):
		tags[t] = []
	tags[t].append(p)


func cell(x: int, y: int) -> Dictionary:
	if x < 0 or y < 0 or x >= w or y >= h:
		return {"solid": true, "void": true, "height": 0, "door": "", "style": "", "room": "", "tag": ""}
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
			for d in 4:
				var nb := cell(x + DIRS[d].x, y + DIRS[d].y)
				var from_level := 0
				if not nb["solid"]:
					if nb["height"] >= hh:
						continue
					from_level = nb["height"]
				var wp := p + Vector3(DIRS[d].x, 0, DIRS[d].y) * (C / 2)
				for lv in range(from_level, hh):
					var tile := _pick(st.get("wall") if lv == 0 else st.get("wall_upper", st.get("wall")))
					_add(batches, tile, Transform3D(Basis(Vector3.UP, DIR_ROT[d]), wp + Vector3(0, lv * H, 0)), x, y, room, st)
	var holder := Node3D.new()
	holder.name = "Shell"
	add_child(holder)
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
	var body := StaticBody3D.new()
	body.name = "Solid"
	body.collision_layer = 1
	body.collision_mask = 0
	add_child(body)
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


func _build_nav() -> void:
	nav.region = Rect2i(0, 0, w, h)
	nav.cell_size = Vector2(1, 1)
	nav.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	nav.update()
	for y in h:
		for x in w:
			if cell(x, y)["solid"]:
				nav.set_point_solid(Vector2i(x, y), true)


func block(p: Vector2i, solid := true) -> void:
	if nav.is_in_boundsv(p) and not cell(p.x, p.y)["solid"]:
		nav.set_point_solid(p, solid)


## Cell centres from one place to another, for anything that walks.
func path(from: Vector3, to: Vector3) -> PackedVector3Array:
	var a := cell_of(from)
	var b := cell_of(to)
	var out := PackedVector3Array()
	if not nav.is_in_boundsv(a) or not nav.is_in_boundsv(b) or nav.is_point_solid(b):
		return out
	var was := nav.is_point_solid(a)
	if was:
		nav.set_point_solid(a, false)
	for p in nav.get_id_path(a, b):
		out.append(center(p))
	if was:
		nav.set_point_solid(a, true)
	return out


func los(a: Vector3, b: Vector3) -> bool:
	var q := PhysicsRayQueryParameters3D.create(a, b, 1)
	return get_world_3d().direct_space_state.intersect_ray(q).is_empty()


# ------------------------------------------------------------------ doors, props, actors, pickups, traps
func _build_things() -> void:
	for y in h:
		for x in w:
			var c := cell(x, y)
			if c["door"] != "":
				_spawn_door(Vector2i(x, y), c)
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
	var across: bool = cell(p.x - 1, p.y)["solid"] and cell(p.x + 1, p.y)["solid"]
	var along: bool = cell(p.x, p.y - 1)["solid"] and cell(p.x, p.y + 1)["solid"]
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


func _register(n: Node, tag: String) -> void:
	if tag == "":
		return
	if not things_by_tag.has(tag):
		things_by_tag[tag] = []
	things_by_tag[tag].append(n)


func spawn_thing(e: Dictionary, p: Vector2i) -> Node3D:
	if e.has("start"):
		start_cell = p
		start_yaw = _face_yaw(e.get("face", "n"))
		return null
	var n: Node3D = null
	var off := LM.vec(e.get("offset"), Vector3.ZERO)
	var pos := center(p) + off
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
