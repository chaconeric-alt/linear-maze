extends Node3D
## Door - any kit model of type "door". The model's moving parts and how they move are in the
## kit (kit.json / generated.json: parts -> move, rot_axis, rot_deg, scale, delay), so a new kind of
## door is a new model plus a few numbers. Opens for whoever comes near unless locked or sealed.
class_name Door

const LOCK_COLORS := {"red": Color(1.0, 0.12, 0.08), "blue": Color(0.15, 0.4, 1.0), "yellow": Color(1.0, 0.8, 0.1), "flag": Color(0.7, 0.3, 1.0)}
const OPEN_COLOR := Color(0.2, 0.95, 0.85)

var level: Level
var cell_pos: Vector2i
var meta: Dictionary
var lock := ""           # a key colour, or "" for none
var flag: Variant = null # story flag(s) that unlock it
var need := ""
var sealed := false
var jammed := false
var held := false
var t := 0.0
var target := 0.0
var _parts: Array = []
var _body: StaticBody3D
var _shape: CollisionShape3D
var _mat: StandardMaterial3D
var _light: OmniLight3D
var _check := 0.0
var _told := false
var _spark := 0.0
var _max_delay := 0.0


func setup(lv: Level, p: Vector2i, entry: Dictionary, kit_id: String) -> void:
	level = lv
	cell_pos = p
	meta = LM.model_meta(kit_id, entry["door"])
	lock = entry.get("lock", "")
	flag = entry.get("flag")
	need = entry.get("need", "")
	sealed = entry.get("sealed", false)
	jammed = entry.get("jammed", false)
	_mat = StandardMaterial3D.new()
	_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var inst := LM.spawn_model(kit_id, entry["door"], {"lock": _mat})
	add_child(inst)
	for name in meta.get("parts", {}):
		var n := LM.find_node(inst, name)
		if n != null:
			var spec: Dictionary = meta["parts"][name]
			_parts.append({"n": n, "rest": n.transform, "spec": spec})
			_max_delay = max(_max_delay, spec.get("delay", 0.0))
	_body = StaticBody3D.new()
	_body.collision_layer = 1
	_shape = CollisionShape3D.new()
	var b := BoxShape3D.new()
	b.size = Vector3(lv.C, lv.H, 0.5)
	_shape.shape = b
	_shape.position.y = lv.H / 2
	_body.add_child(_shape)
	add_child(_body)
	_light = OmniLight3D.new()
	_light.omni_range = 4.5
	_light.light_energy = 0.7
	_light.position = Vector3(0, 3.3, 0)
	add_child(_light)
	_refresh()


func is_locked() -> bool:
	return sealed or lock != "" or (flag != null and not Game.has_flag(flag))


func _refresh() -> void:
	var c := OPEN_COLOR
	if sealed:
		c = Color(1.0, 0.1, 0.05)
	elif lock != "":
		c = LOCK_COLORS.get(lock, Color.WHITE)
	elif flag != null and not Game.has_flag(flag):
		c = LOCK_COLORS["flag"]
	_mat.albedo_color = Color(c.r * 2.5, c.g * 2.5, c.b * 2.5)
	_light.light_color = c
	level.block(cell_pos, is_locked())


func command(what: String) -> void:
	match what:
		"unlock":
			lock = ""
			flag = null
			sealed = false
		"open":
			lock = ""
			flag = null
			sealed = false
			held = true
		"seal":
			sealed = true
			held = false
		"close":
			held = false
	_refresh()


func _someone_near() -> bool:
	var pl := Game.player
	if pl and is_instance_valid(pl):
		var d := Vector2(pl.global_position.x - global_position.x, pl.global_position.z - global_position.z).length()
		if d < 4.2:
			if is_locked():
				_try_player(d)
			else:
				return true
		else:
			_told = false
	if is_locked():
		return false
	for a in level.actors:
		if is_instance_valid(a) and not a.dead and a.awake and a.global_position.distance_to(global_position) < 3.4:
			return true
	return false


func _try_player(d: float) -> void:
	if d > 3.0 or sealed:
		if sealed and d < 3.0 and not _told:
			_told = true
			Game.say("Sealed.", "warn")
		return
	if lock != "" and Game.keys.has(lock):
		Game.say("%s card accepted. Have a productive day." % lock.capitalize(), "good")
		LM.sound("unlock", global_position)
		lock = ""
		_refresh()
	elif flag != null and Game.has_flag(flag):
		flag = null
		_refresh()
	elif not _told:
		_told = true
		LM.sound("denied", global_position)
		Game.say("Locked. It needs %s." % (need if need != "" else ("the %s card" % lock if lock != "" else "authorisation")), "warn")


func _process(dt: float) -> void:
	_check -= dt
	if _check <= 0.0:
		_check = 0.12
		var was := target
		if flag != null and lock == "" and not sealed and Game.has_flag(flag):
			flag = null
			_refresh()
		target = 1.0 if (held or _someone_near()) else 0.0
		if target != was:
			LM.sound(meta.get("sound", "door_slide"), global_position, -4.0, 0.7 if jammed else 1.0)
	if t == target:
		return
	var speed: float = 1.0 / max(0.05, meta.get("time", 0.5))
	if jammed:
		speed *= 0.3 + 0.5 * abs(sin(Time.get_ticks_msec() * 0.02))
		_spark -= dt
		if _spark <= 0.0:
			_spark = randf_range(0.08, 0.3)
			Fx.sparks(level, global_position + Vector3(randf_range(-1.2, 1.2), randf_range(0.3, 3.0), 0).rotated(Vector3.UP, rotation.y), Color(1.0, 0.8, 0.4), 6, 4.0)
	t = move_toward(t, target, dt * speed)
	_shape.disabled = t > 0.55
	for p in _parts:
		var spec: Dictionary = p["spec"]
		var span: float = 1.0 - _max_delay
		var k: float = clamp((t - spec.get("delay", 0.0)) / max(0.01, span), 0.0, 1.0)
		k = k * k * (3.0 - 2.0 * k)
		var rest: Transform3D = p["rest"]
		var xf := rest
		if spec.has("rot_axis"):
			xf.basis = rest.basis * Basis(LM.vec(spec["rot_axis"]).normalized(), deg_to_rad(spec.get("rot_deg", 0.0)) * k)
		if spec.has("scale"):                        # the part shrinks as it opens (an iris blade drawing into its slot)
			xf.basis = xf.basis.scaled_local(Vector3.ONE * lerpf(1.0, spec["scale"], k))
		xf.origin = rest.origin + LM.vec(spec.get("move")) * k
		p["n"].transform = xf
