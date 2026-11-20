extends Node
## ActorLooks - how it shows what it is doing, beyond its clips. Added when the def has any of these:
##   "screen": {"bone": "body", "at": [0, 0.72, 0.3], "width": 0.2, "height": 0.11, "color": [..], "bg": [..], "idle": ["...", ">:("]}
##       a panel of text fixed to a bone, at `at` in the model's own units (x, up, forward) and that size; it shows each
##       bark as it is shouted, and one of `idle` while the thing has not noticed anybody. Text shrinks to fit.
##   "barks": ["..."], "bark_color": [r, g, b]   what it shouts while it can see its target
##   "jelly": {"amp": 0.02, "speed": 2.4, "freq": 7, "glow": [0.8, 0.3, 1.0], "glow_energy": 0.6, "pulse": 0.5, "wet": 0.75}
##       a textured model (own_materials) wobbles, looks wet, and glows from inside with a light that breathes
##   "equalizer": {"glow": [1, 0.12, 0.08], "energy": 5, "idle": 0.35, "rate": 7, "bars": 8, "lo": 0.05, "hi": 0.8}
##       whatever is red on a textured model lights up in columns that rise and fall: low and slow at rest, full in a fight
##   "trail": {"prefix": "tat_", "lean": 9, "max": 58, "stiff": 30, "damp": 5, "turn": 16, "flutter": 4, "second": 1.5}
##       bones that hang and swing: they stream out behind as it moves, swing wide as it turns, overshoot and settle
##   "footfall": {"at": [0.0, 0.5], "sound": "clang", "db": -6, "pitch": 0.5, "shake": 0.25, "reach": 9}
##       heavy feet: a sound and a little dust each time the walk clip passes `at`, and the view shakes if near
class_name ActorLooks

const KEYS := ["screen", "barks", "jelly", "equalizer", "trail", "footfall"]

var a: Actor
var d: Dictionary
var _face: Label3D
var _face_t := 0.0
var _eq: Array = []               # the materials of an "equalizer" model
var _eq_drive := 0.0
var _trail: Array = []            # hanging things that swing: [bone, rest rotation, to-bone basis, lean, lean speed, factor, seed]
var _trail_yaw := 0.0
var _skel: Skeleton3D
var _foot_at := -1.0              # where in the walk clip it was last tick (0..1), for "footfall"


static func wanted(def: Dictionary) -> bool:
	for k in KEYS:
		if def.has(k):
			return true
	return false


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d
	if d.has("screen"):
		_make_face()
	if d.has("jelly"):
		_make_jelly()
	if d.has("equalizer"):
		_make_eq()
	if d.has("trail"):
		_make_trail()


# ------------------------------------------------------------------ a screen for a face
func _make_face() -> void:
	var sc: Dictionary = d["screen"]
	var sk := LM.find_type(a.vis, "Skeleton3D") as Skeleton3D
	if sk == null:
		return
	var bi := sk.find_bone(sc.get("bone", ""))
	var holder := Node3D.new()
	var at := Vector3(sc["at"][0], sc["at"][1], sc["at"][2])
	if bi >= 0:
		var ba := BoneAttachment3D.new()
		sk.add_child(ba)
		ba.bone_idx = bi
		ba.add_child(holder)
		holder.transform = sk.get_bone_global_rest(bi).affine_inverse() * Transform3D(Basis(), at)
	else:
		sk.add_child(holder)
		holder.position = at
	var w: float = sc.get("width", 0.2)
	var h: float = sc.get("height", 0.11)
	var bg := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(w, h)
	bg.mesh = q
	var bm := StandardMaterial3D.new()
	bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	bm.albedo_color = LM.col(sc.get("bg"), Color(0.02, 0.03, 0.08))
	bg.material_override = bm
	holder.add_child(bg)
	_face = Label3D.new()
	_face.pixel_size = w / 300.0                     # the panel is 300 pixels across
	_face.width = 284.0
	_face.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_face.modulate = LM.col(sc.get("color"), Color(1.0, 0.25, 0.3))
	_face.outline_size = 0
	_face.shaded = false
	_face.double_sided = false
	_face.position = Vector3(0, 0, 0.004)
	_face.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	holder.add_child(_face)
	_face_t = randf_range(0.0, 2.0)


## Show a line on the face, if it has one.
func show(line: String) -> void:
	if _face == null:
		return
	_face.text = line
	var n := line.length()
	_face.font_size = 64 if n <= 8 else (40 if n <= 18 else (27 if n <= 40 else (20 if n <= 70 else 15)))


## Asleep, the face says one of its idle lines now and then.
func face_idle_tick(dt: float) -> void:
	if _face and not a.awake:
		_face_t -= dt
		if _face_t <= 0.0:
			_face_t = randf_range(2.5, 5.0)
			var il: Array = d["screen"].get("idle", ["..."])
			show(il[randi() % il.size()])


## What it shouts while it can see its target: on its face, in the air over it, and out loud.
func bark(dt: float) -> void:
	if not d.has("barks"):
		return
	a.bark_t -= dt
	if a.bark_t <= 0.0 and a.senses.see:
		a.bark_t = randf_range(4.0, 9.0)
		var b: Array = d["barks"]
		var line: String = b[randi() % b.size()]
		show(line)
		Fx.words(a.level, a.eye() + Vector3(0, 0.6, 0), line, LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
		LM.sound(d.get("sounds", {}).get("bark", ""), a.global_position)


# ------------------------------------------------------------------ soft and glowing, and lights like a stereo
## The model's own textures, moved into a shader that does the rest.
func _textured(sh: Shader, each: Callable) -> void:
	for m in a.meshes():
		var mi := m as MeshInstance3D
		if mi == null or mi.mesh == null:
			continue
		for i in mi.mesh.get_surface_count():
			var src := mi.get_active_material(i) as BaseMaterial3D
			var sm := ShaderMaterial.new()
			sm.shader = sh
			if src:
				sm.set_shader_parameter("albedo_tex", src.albedo_texture)
				if src.normal_enabled and src.normal_texture:
					sm.set_shader_parameter("normal_tex", src.normal_texture)
					sm.set_shader_parameter("has_normal", true)
				if src.roughness_texture:
					sm.set_shader_parameter("orm_tex", src.roughness_texture)
					sm.set_shader_parameter("has_orm", true)
			each.call(sm)
			mi.set_surface_override_material(i, sm)


func _make_jelly() -> void:
	var j: Dictionary = d["jelly"]
	_textured(load("res://engine/shaders/jelly.gdshader"), func(sm: ShaderMaterial) -> void:
		sm.set_shader_parameter("amp", j.get("amp", 0.02))
		sm.set_shader_parameter("speed", j.get("speed", 2.4))
		sm.set_shader_parameter("freq", j.get("freq", 7.0))
		var g := LM.col(j.get("glow"), Color(0.8, 0.3, 1.0))
		sm.set_shader_parameter("glow", Vector3(g.r, g.g, g.b))
		sm.set_shader_parameter("glow_energy", j.get("glow_energy", 0.6))
		sm.set_shader_parameter("pulse", j.get("pulse", 0.5))
		sm.set_shader_parameter("wet", j.get("wet", 0.75)))


func _make_eq() -> void:
	var q: Dictionary = d["equalizer"]
	var eqs: Array = _eq
	_textured(load("res://engine/shaders/equalizer.gdshader"), func(sm: ShaderMaterial) -> void:
		var g := LM.col(q.get("glow"), Color(1.0, 0.12, 0.08))
		sm.set_shader_parameter("glow", Vector3(g.r, g.g, g.b))
		for k in ["energy", "idle", "rate", "bars", "lo", "hi"]:
			if q.has(k):
				sm.set_shader_parameter(k, float(q[k]))
		eqs.append(sm))


## The lights work as hard as it does.
func eq_tick(dt: float) -> void:
	if _eq.is_empty():
		return
	var want_drive := 1.0 if a.attacking() else (0.75 if a.awake else 0.3)
	if absf(want_drive - _eq_drive) > 0.01:
		_eq_drive = move_toward(_eq_drive, want_drive, dt * 4.0)
		for m in _eq:
			m.set_shader_parameter("drive", _eq_drive)


# ------------------------------------------------------------------ things that hang and swing
## Every bone whose name starts with `prefix` hangs from its head and is left to the engine. Bones whose names end in
## "_b" are the lower lengths: they lean `second` times as far again, and more loosely. Clips must not key these bones.
## (It uses the skeleton the aim rig found, so only a thing with "aim" gets its trails.)
func _make_trail() -> void:
	var tr: Dictionary = d["trail"]
	_skel = a.aim.skel if a.aim else null
	if _skel == null:
		return
	for i in _skel.get_bone_count():
		var nm := _skel.get_bone_name(i)
		if nm.begins_with(tr.get("prefix", "tat_")):
			_trail.append([i, _skel.get_bone_rest(i).basis.get_rotation_quaternion(), _skel.get_bone_global_rest(i).basis.orthonormalized().inverse(),
				Vector2.ZERO, Vector2.ZERO, tr.get("second", 1.5) if nm.ends_with("_b") else 1.0, randf() * 10.0])
	_trail_yaw = a.rotation.y


func trail_tick(dt: float) -> void:
	if _trail.is_empty():
		return
	var tr: Dictionary = d["trail"]
	var vl: Vector3 = _skel.global_transform.basis.orthonormalized().inverse() * a.velocity
	var spin: float = wrapf(a.rotation.y - _trail_yaw, -PI, PI) / maxf(dt, 0.001)
	_trail_yaw = a.rotation.y
	var want: Vector2 = Vector2(-vl.x, -vl.z) * float(tr.get("lean", 9.0)) + Vector2(-spin * float(tr.get("turn", 16.0)), 0)
	var top: float = tr.get("max", 58.0)
	if want.length() > top:
		want = want.normalized() * top
	var t := Time.get_ticks_msec() * 0.001
	for e2 in _trail:
		var second: bool = e2[5] > 1.0
		var k: float = tr.get("stiff", 30.0) * (0.55 if second else 1.0)
		var goal: Vector2 = want * (e2[5] - 1.0 if second else 1.0)     # a lower length leans that much MORE than the one it hangs from
		e2[4] += (k * (goal - e2[3]) - tr.get("damp", 5.0) * e2[4]) * dt
		e2[3] += e2[4] * dt
		var fl: float = tr.get("flutter", 4.0) * (1.6 if second else 1.0)
		var shown: Vector2 = e2[3] + Vector2(sin(t * 1.7 + e2[6]), sin(t * 1.3 + e2[6] * 2.1)) * fl
		var h := Vector3(shown.x, 0, shown.y)
		var q: Quaternion = e2[1]
		if h.length() > 0.05:
			var axis: Vector3 = (e2[2] * h.normalized().cross(Vector3.UP)).normalized()
			q = q * Quaternion(axis, deg_to_rad(minf(h.length(), top * 1.3)))
		_skel.set_bone_pose_rotation(e2[0], q)


# ------------------------------------------------------------------ heavy feet
func footfall() -> void:
	if not d.has("footfall"):
		return
	var ff: Dictionary = d["footfall"]
	var nm: String = d.get("clips", {}).get("walk", "walk")
	var anim := a.anim
	if anim == null or anim.current_animation != nm:
		_foot_at = -1.0
		return
	var now: float = fposmod(anim.current_animation_position / maxf(0.01, anim.current_animation_length), 1.0)
	if _foot_at >= 0.0 and now != _foot_at:
		for t in ff.get("at", [0.0, 0.5]):
			var hit: bool = (_foot_at < t and now >= t) if now > _foot_at else (t > _foot_at or t <= now)      # the clip wraps
			if hit:
				_step(ff)
	_foot_at = now


func _step(ff: Dictionary) -> void:
	LM.sound(ff.get("sound", "step"), a.global_position, ff.get("db", -4.0), ff.get("pitch", 0.55) * randf_range(0.93, 1.07))
	Fx.sparks(a.level, a.global_position + Vector3(0, 0.08, 0), Color(0.45, 0.42, 0.38), 4, 1.6, 0.35, 0.05)
	var pl := a.target()
	var reach: float = ff.get("reach", 9.0)
	if pl and ff.get("shake", 0.0) > 0.0:
		var far := a.global_position.distance_to(pl.global_position)
		if far < reach:
			pl.shake(ff["shake"] * (1.0 - far / reach))
