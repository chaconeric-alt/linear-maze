extends RefCounted
## Fx - short-lived effects: sparks, flashes, tracers, blasts, floating words.
class_name Fx

static var _mats: Dictionary = {}


static func glow_mat(c: Color, energy := 3.0) -> StandardMaterial3D:
	var key := "%s/%s" % [c.to_html(), energy]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(c.r * energy, c.g * energy, c.b * energy, 1.0)
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.billboard_keep_scale = true
	_mats[key] = m
	return m


static func sparks(parent: Node, pos: Vector3, c := Color(1.0, 0.7, 0.3), n := 10, speed := 5.0, life := 0.45, size := 0.05, gravity := 9.0) -> void:
	var p := CPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 0.95
	p.amount = n
	p.lifetime = life
	p.direction = Vector3.UP
	p.spread = 180.0
	p.initial_velocity_min = speed * 0.3
	p.initial_velocity_max = speed
	p.gravity = Vector3(0, -gravity, 0)
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.2
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	q.material = glow_mat(c)
	p.mesh = q
	parent.add_child(p)
	p.global_position = pos
	p.emitting = true
	parent.get_tree().create_timer(life + 0.3, false).timeout.connect(p.queue_free)


static func flash(parent: Node, pos: Vector3, c: Color, energy := 4.0, rng := 6.0, life := 0.12) -> void:
	var l := OmniLight3D.new()
	l.light_color = c
	l.light_energy = energy
	l.omni_range = rng
	parent.add_child(l)
	l.global_position = pos
	var tw := l.create_tween()
	tw.tween_property(l, "light_energy", 0.0, life)
	tw.tween_callback(l.queue_free)


static func tracer(parent: Node, a: Vector3, b: Vector3, c: Color, width := 0.02, life := 0.07) -> void:
	var d := a.distance_to(b)
	if d < 0.5:
		return
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(width, width, d)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(c.r * 3, c.g * 3, c.b * 3)
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	bm.material = m
	mi.mesh = bm
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	mi.global_position = (a + b) / 2
	var up := Vector3.UP if abs((b - a).normalized().y) < 0.99 else Vector3.RIGHT
	mi.look_at(b, up)
	var tw := mi.create_tween()
	tw.tween_property(mi, "scale", Vector3(0.1, 0.1, 1.0), life)
	tw.tween_callback(mi.queue_free)


static func words(parent: Node, pos: Vector3, text: String, c := Color(1, 0.4, 0.3), life := 1.8) -> void:
	var l := Label3D.new()
	l.text = text
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.font_size = 40
	l.pixel_size = 0.006
	l.modulate = c
	l.outline_size = 10
	parent.add_child(l)
	l.global_position = pos
	var tw := l.create_tween()
	tw.tween_property(l, "position:y", l.position.y + 0.7, life)
	tw.parallel().tween_property(l, "modulate:a", 0.0, life).set_ease(Tween.EASE_IN)
	tw.tween_callback(l.queue_free)


## A blast: hurts everything with a hurt() method in range that the centre can see.
static func explode(level: Node3D, pos: Vector3, radius: float, damage: float, c := Color(1.0, 0.55, 0.15), by: Node = null, hurts_player := true) -> void:
	sparks(level, pos, c, 36, radius * 2.2, 0.7, 0.12, 6.0)
	sparks(level, pos, Color(1, 0.9, 0.6), 18, radius * 1.2, 0.4, 0.2, 0.0)
	flash(level, pos, c, 12.0, radius * 3.0, 0.35)
	LM.sound("explode", pos)
	var targets: Array = level.actors.duplicate()
	targets.append_array(level.get_tree().get_nodes_in_group("breakable"))
	if hurts_player and Game.player:
		targets.append(Game.player)
	for t in targets:
		if not is_instance_valid(t) or t == by:
			continue
		var tp: Vector3 = t.global_position + Vector3(0, 0.8, 0)
		var d := tp.distance_to(pos)
		if d > radius:
			continue
		if not level.los(pos + Vector3(0, 0.2, 0), tp) and d > 1.5:
			continue
		t.hurt(damage * (1.0 - 0.6 * d / radius), {"type": "blast", "from": pos, "by": by})
	if Game.player and Game.player.global_position.distance_to(pos) < radius * 3.0:
		Game.player.shake(0.6)
