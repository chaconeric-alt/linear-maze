extends Node
## LM - the registry. Everything the engine knows about a game comes through here:
## kits (tile sets and their models and materials), definitions (weapons, actors, items)
## and levels. The engine has no game content of its own. See SPEC.md.

const SHADERS := {
	"worn": preload("res://engine/shaders/worn.gdshader"),
	"screen": preload("res://engine/shaders/screen.gdshader"),
	"glow": preload("res://engine/shaders/glow.gdshader"),
	"glass": preload("res://engine/shaders/glass.gdshader"),
	"flesh": preload("res://engine/shaders/flesh.gdshader"),
}

var game: Dictionary = {}
var kits: Dictionary = {}        # id -> { cell, height, tiles, models, styles, materials }
var defs: Dictionary = {}        # kind -> { id -> def }   (weapons, actors, items, sounds ...)
var levels: Dictionary = {}      # id -> level dictionary
var generators: Dictionary = {}  # id -> script with generate(seed, params) -> level dictionary
var _mat_cache: Dictionary = {}
var _mesh_cache: Dictionary = {}
var _sounds: Dictionary = {}


func read_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		return null
	var txt := FileAccess.get_file_as_string(path)
	var j := JSON.new()
	if j.parse(txt) != OK:
		push_error("%s line %d: %s" % [path, j.get_error_line(), j.get_error_message()])
		return null
	return j.data


func boot(game_id: String) -> void:
	var root := "res://games/%s/" % game_id
	game = read_json(root + "game.json")
	assert(game != null, "No game at " + root)
	game["root"] = root
	for k in game.get("kits", []):
		load_kit(k)
	for f in game.get("defs", []):
		var d: Variant = read_json(root + f)
		if d == null:
			continue
		for kind in d:
			if not defs.has(kind):
				defs[kind] = {}
			for id in d[kind]:
				defs[kind][id] = d[kind][id]
				defs[kind][id]["id"] = id
	for f in game.get("levels", []):
		var lv: Variant = read_json(root + f)
		if lv != null:
			levels[lv["id"]] = lv
	for g in game.get("generators", []):
		var s: Variant = load("res://generators/%s.gd" % g)
		if s != null:
			generators[g] = s.new()
	_build_sounds()


func load_kit(id: String) -> void:
	if kits.has(id):
		return
	var root := "res://kits/%s/" % id
	var kit := {"id": id, "root": root, "cell": 4.0, "height": 4.0, "tiles": {}, "models": {}, "styles": {}, "materials": {}}
	for f in ["generated.json", "kit.json"]:      # kit.json is hand-written and wins
		var d: Variant = read_json(root + f)
		if d == null:
			continue
		for key in d:
			if d[key] is Dictionary and kit.has(key) and kit[key] is Dictionary:
				for k in d[key]:
					kit[key][k] = d[key][k]
			else:
				kit[key] = d[key]
	var m: Variant = read_json(root + "materials.json")
	if m != null:
		kit["materials"] = m
	kits[id] = kit
	for other in kit.get("uses", []):          # a kit can borrow another's models and materials
		load_kit(other)
		for key in ["tiles", "models", "materials"]:
			for k in kits[other][key]:
				if not kit[key].has(k):
					var v: Dictionary = kits[other][key][k].duplicate()
					if v.has("model") and not str(v["model"]).begins_with("res://"):
						v["model"] = kits[other]["root"] + v["model"]
					kit[key][k] = v


func get_def(kind: String, id: String) -> Dictionary:
	if defs.has(kind) and defs[kind].has(id):
		return defs[kind][id]
	push_warning("No %s called '%s'" % [kind, id])
	return {}


func col(v: Variant, fallback := Color.WHITE) -> Color:
	if v is Array and v.size() >= 3:
		return Color(v[0], v[1], v[2], v[3] if v.size() > 3 else 1.0)
	if v is String:
		return Color(v)
	return fallback


func vec(v: Variant, fallback := Vector3.ZERO) -> Vector3:
	if v is Array and v.size() >= 3:
		return Vector3(v[0], v[1], v[2])
	return fallback


## The material a kit gives to a material NAME. Models only carry names; looks live in materials.json.
func material(kit_id: String, name: String, world_space := true) -> Material:
	var key := "%s/%s/%s" % [kit_id, name, world_space]
	if _mat_cache.has(key):
		return _mat_cache[key]
	var kit: Dictionary = kits.get(kit_id, {})
	var p: Variant = kit.get("materials", {}).get(name)
	if p == null:
		_mat_cache[key] = null
		return null
	var mat: Material
	var sh: String = p.get("shader", "")
	if SHADERS.has(sh):
		var sm := ShaderMaterial.new()
		sm.shader = SHADERS[sh]
		match sh:
			"worn":
				sm.set_shader_parameter("albedo", col(p.get("color")))
				sm.set_shader_parameter("metallic", p.get("metal", 0.2))
				sm.set_shader_parameter("roughness", p.get("rough", 0.5))
				sm.set_shader_parameter("grime", p.get("grime", 0.5) * kit.get("grime", 1.0))
				sm.set_shader_parameter("world_space", world_space)
			"flesh":
				sm.set_shader_parameter("albedo", col(p.get("color")))
				sm.set_shader_parameter("metallic", p.get("metal", 0.0))
				sm.set_shader_parameter("roughness", p.get("rough", 0.3))
			"screen":
				sm.set_shader_parameter("albedo", col(p.get("color")))
				sm.set_shader_parameter("emission", col(p.get("emit")))
				sm.set_shader_parameter("energy", p.get("energy", 1.6))
			"glow":
				sm.set_shader_parameter("emission", col(p.get("emit", p.get("color"))))
				sm.set_shader_parameter("energy", p.get("energy", 4.0))
			"glass":
				var c := col(p.get("color"))
				c.a = p.get("alpha", 0.22)
				sm.set_shader_parameter("albedo", c)
		mat = sm
	else:
		var st := StandardMaterial3D.new()
		st.albedo_color = col(p.get("color"))
		st.metallic = p.get("metal", 0.0)
		st.roughness = p.get("rough", 0.6)
		if p.has("emit"):
			st.emission_enabled = true
			st.emission = col(p["emit"])
			st.emission_energy_multiplier = p.get("energy", 2.0)
		mat = st
	mat.resource_name = name
	_mat_cache[key] = mat
	return mat


func model_path(kit_id: String, model_id: String) -> String:
	var kit: Dictionary = kits.get(kit_id, {})
	var m: Variant = kit.get("models", {}).get(model_id, kit.get("tiles", {}).get(model_id))
	if m == null:
		return ""
	var path: String = m["model"]
	return path if path.begins_with("res://") else kit["root"] + path


func model_meta(kit_id: String, model_id: String) -> Dictionary:
	return kits.get(kit_id, {}).get("models", {}).get(model_id, {})


## Swap every surface whose material name the kit knows for the kit's material.
func dress(node: Node, kit_id: String, world_space := false, overrides := {}) -> void:
	if node is MeshInstance3D and node.mesh != null:
		for s in node.mesh.get_surface_count():
			var m: Material = node.mesh.surface_get_material(s)
			if m == null:
				continue
			var nm := m.resource_name
			if overrides.has(nm):
				node.set_surface_override_material(s, overrides[nm])
			else:
				var k := material(kit_id, nm, world_space)
				if k != null:
					node.set_surface_override_material(s, k)
	for c in node.get_children():
		dress(c, kit_id, world_space, overrides)


## An instance of a kit model (door, machine, pickup ...) wearing the kit's materials.
func spawn_model(kit_id: String, model_id: String, overrides := {}) -> Node3D:
	var path := model_path(kit_id, model_id)
	return spawn_scene(path, kit_id, overrides)


func spawn_scene(path: String, kit_id: String, overrides := {}) -> Node3D:
	if path == "" or not ResourceLoader.exists(path):
		push_warning("Missing model: " + path)
		var n := Node3D.new()
		return n
	var ps: PackedScene = load(path)
	var inst: Node3D = ps.instantiate()
	dress(inst, kit_id, false, overrides)
	return inst


## One mesh for a tile, with the kit's materials on it, for MultiMesh batches.
func tile_mesh(kit_id: String, tile_id: String) -> Mesh:
	var key := kit_id + "/" + tile_id
	if _mesh_cache.has(key):
		return _mesh_cache[key]
	var path := model_path(kit_id, tile_id)
	var out: Mesh = null
	if path != "" and ResourceLoader.exists(path):
		var inst: Node = (load(path) as PackedScene).instantiate()
		var mi := _first_mesh(inst)
		if mi != null:
			out = mi.mesh.duplicate()
			for s in out.get_surface_count():
				var m: Material = out.surface_get_material(s)
				if m != null:
					var k := material(kit_id, m.resource_name, true)
					if k != null:
						out.surface_set_material(s, k)
		inst.free()
	else:
		push_warning("Missing tile: %s (%s)" % [tile_id, path])
	_mesh_cache[key] = out
	return out


func _first_mesh(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D:
		return n
	for c in n.get_children():
		var r := _first_mesh(c)
		if r != null:
			return r
	return null


func find_node(root: Node, name: String) -> Node3D:
	if root.name == name:
		return root as Node3D
	for c in root.get_children():
		var r := find_node(c, name)
		if r != null:
			return r
	return null


func find_type(root: Node, type: String) -> Node:
	if root.is_class(type):
		return root
	for c in root.get_children():
		var r := find_type(c, type)
		if r != null:
			return r
	return null


# ------------------------------------------------------------------ sound: all synthesised, no files
func _build_sounds() -> void:
	var table: Dictionary = defs.get("sounds", {})
	for id in table:
		_sounds[id] = _synth(table[id])


func _synth(d: Dictionary) -> AudioStreamWAV:
	var rate := 22050
	var dur: float = d.get("dur", 0.2)
	var n := int(rate * dur)
	var data := PackedByteArray()
	data.resize(n * 2)
	var f0: float = d.get("freq", 440.0)
	var f1: float = d.get("to", f0)
	var noise_amt: float = d.get("noise", 0.0)
	var decay: float = d.get("decay", 6.0)
	var wave: String = d.get("wave", "sine")
	var vib: float = d.get("vibrato", 0.0)
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(str(d))
	var ph := 0.0
	var lp := 0.0
	var cutoff: float = d.get("lowpass", 1.0)
	for i in n:
		var t := float(i) / n
		var f: float = lerp(f0, f1, t) * (1.0 + vib * sin(t * dur * 40.0))
		ph += f / rate
		var s := 0.0
		match wave:
			"square": s = 1.0 if fmod(ph, 1.0) < 0.5 else -1.0
			"saw": s = fmod(ph, 1.0) * 2.0 - 1.0
			_: s = sin(ph * TAU)
		s = s * (1.0 - noise_amt) + rng.randf_range(-1.0, 1.0) * noise_amt
		lp += (s - lp) * cutoff
		var env: float = exp(-decay * t) * minf(1.0, t * n / 60.0)
		var v := int(clamp(lp * env * d.get("gain", 0.6), -1.0, 1.0) * 32000.0)
		data.encode_s16(i * 2, v)
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = rate
	w.data = data
	return w


func sound(id: String, at: Variant = null, volume_db := 0.0, pitch := 1.0) -> void:
	if not _sounds.has(id) or DisplayServer.get_name() == "headless":
		return
	if at is Vector3:
		var p := AudioStreamPlayer3D.new()
		p.stream = _sounds[id]
		p.volume_db = volume_db
		p.pitch_scale = pitch * randf_range(0.95, 1.05)
		p.unit_size = 6.0
		p.max_distance = 60.0
		get_tree().current_scene.add_child(p)
		p.global_position = at
		p.finished.connect(p.queue_free)
		p.play()
	else:
		var p2 := AudioStreamPlayer.new()
		p2.stream = _sounds[id]
		p2.volume_db = volume_db
		p2.pitch_scale = pitch
		add_child(p2)
		p2.finished.connect(p2.queue_free)
		p2.play()
