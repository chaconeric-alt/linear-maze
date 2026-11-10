extends Node3D
## Trap - hazards built into a cell. Three kinds ship with the engine (laser, shock, vent);
## every one can be switched off by a story flag or an "disable" effect on its tag.
class_name Trap

var level: Level
var e: Dictionary
var kind := ""
var enabled := true
var cell_pos: Vector2i
var _t := 0.0
var _cool := 0.0
var _beams: Array = []
var _along_x := true
var _light: OmniLight3D
var _parts: CPUParticles3D
var _on := false


func setup(lv: Level, entry: Dictionary, p: Vector2i, kit_id: String) -> void:
	level = lv
	e = entry
	cell_pos = p
	kind = e["trap"]
	_t = e.get("phase", 0.0)
	_light = OmniLight3D.new()
	_light.omni_range = 5.0
	_light.light_energy = 0.0
	add_child(_light)
	match kind:
		"laser":
			_along_x = lv.cell(p.x - 1, p.y)["solid"] and lv.cell(p.x + 1, p.y)["solid"]
			if e.has("axis"):
				_along_x = e["axis"] == "x"
			rotation.y = 0.0 if _along_x else PI / 2
			var mat := Fx.glow_mat(Color(1.0, 0.1, 0.05), 4.0).duplicate()
			mat.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED
			for hgt in e.get("heights", [0.5, 1.15, 1.8]):
				for s in [-1.0, 1.0]:
					var em := LM.spawn_model(kit_id, "trap_laser")
					add_child(em)
					em.position = Vector3(s * lv.C / 2, hgt, 0)
					em.rotation.y = -s * PI / 2
				var mi := MeshInstance3D.new()
				var cm := CylinderMesh.new()
				cm.top_radius = 0.018
				cm.bottom_radius = 0.018
				cm.height = lv.C - 0.4
				cm.radial_segments = 6
				cm.material = mat
				mi.mesh = cm
				mi.rotation.z = PI / 2
				mi.position.y = hgt
				mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				add_child(mi)
				_beams.append(mi)
			_light.light_color = Color(1.0, 0.1, 0.05)
			_light.position.y = 1.2
		"shock":
			add_child(LM.spawn_model(kit_id, "trap_shock"))
			_light.light_color = Color(0.3, 0.8, 1.0)
			_light.position.y = 0.6
		"vent":
			add_child(LM.spawn_model(kit_id, "trap_vent"))
			var c := LM.col(e.get("color"), Color(0.4, 1.0, 0.25))
			_light.light_color = c
			_light.position.y = 1.0
			_parts = CPUParticles3D.new()
			_parts.amount = 40
			_parts.lifetime = 0.9
			_parts.direction = Vector3.UP
			_parts.spread = 14.0
			_parts.initial_velocity_min = 3.0
			_parts.initial_velocity_max = 5.0
			_parts.gravity = Vector3(0, 1.0, 0)
			_parts.scale_amount_min = 1.0
			_parts.scale_amount_max = 3.0
			var q := QuadMesh.new()
			q.size = Vector2(0.35, 0.35)
			var m := Fx.glow_mat(c, 0.35)
			q.material = m
			_parts.mesh = q
			_parts.emitting = false
			_parts.position.y = 0.15
			add_child(_parts)
	if e.has("off") and Game.has_flag(e["off"]):
		set_enabled(false)
	Game.flag_set.connect(func(n): if e.get("off", "") == n: set_enabled(false))


func set_enabled(on: bool) -> void:
	enabled = on
	if not on:
		_on = false
		_light.light_energy = 0.0
		for b in _beams:
			b.visible = false
		if _parts:
			_parts.emitting = false


func _process(dt: float) -> void:
	if not enabled:
		return
	_t += dt
	_cool -= dt
	var pl := Game.player
	if pl == null or not is_instance_valid(pl):
		return
	var rel: Vector3 = pl.global_position - global_position
	var here: bool = abs(rel.x) < level.C / 2 and abs(rel.z) < level.C / 2
	match kind:
		"laser":
			var cyc: Array = e.get("cycle", [])      # [seconds on, seconds off]; none = always on
			_on = true if cyc.is_empty() else fmod(_t, cyc[0] + cyc[1]) < cyc[0]
			for b in _beams:
				b.visible = _on
			_light.light_energy = 0.8 if _on else 0.0
			if _on and here and _cool <= 0.0:
				var across: float = rel.z if _along_x else rel.x
				if abs(across) < 0.45:
					for b in _beams:
						if b.position.y > rel.y - 0.05 and b.position.y < rel.y + 1.8:
							_cool = 0.5
							pl.hurt(e.get("damage", 14.0), {"type": "laser", "from": global_position})
							LM.sound("zap", global_position)
							Fx.sparks(level, pl.global_position + Vector3(0, b.position.y, 0), Color(1, 0.3, 0.1), 8)
							Game.run_effects(e.get("effects"))
							break
		"shock":
			var period: float = e.get("period", 2.6)
			var ph := fmod(_t, period)
			var warn: float = period - 0.95
			if ph > warn and ph < period - 0.25:
				_light.light_energy = (ph - warn) * 2.0
				if not _on:
					_on = true
					LM.sound("charge", global_position, -6.0)
			elif ph >= period - 0.25:
				_light.light_energy = 6.0
				if _on:
					_on = false
					LM.sound("zap", global_position)
					Fx.sparks(level, global_position + Vector3(0, 0.3, 0), Color(0.5, 0.9, 1.0), 24, 6.0)
					if here and rel.y < 0.4:
						pl.hurt(e.get("damage", 18.0), {"type": "shock", "from": global_position})
			else:
				_light.light_energy = 0.15
		"vent":
			var period2: float = e.get("period", 4.0)
			var on_for: float = e.get("on", 1.6)
			_on = fmod(_t, period2) < on_for
			_parts.emitting = _on
			_light.light_energy = 1.2 if _on else 0.1
			if _on and _cool <= 0.0 and Vector2(rel.x, rel.z).length() < 1.3 and rel.y < 3.0:
				_cool = 0.4
				pl.hurt(e.get("damage", 7.0), {"type": "toxic", "from": global_position})
