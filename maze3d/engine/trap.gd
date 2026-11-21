extends Node3D
## Trap - hazards built into a cell: laser, shock, vent and darts.
## Every one can be switched off by a story flag ("off": a flag, or a list of them) or a "disable" effect on its tag.
##   laser  "trip": true makes it a tripwire: it does not burn, it runs its "effects" once and goes out.
##   darts  a pressure plate between two walls with dart ports in them. Step on it and, after "delay" (0.3 s), "volleys" (2)
##          cross the cell "interval" (0.3 s) apart, "damage" (9) each to anyone still on the plate. "cooldown" (2.5 s).
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
var _storey := 0
var _plate: Node3D
var _volleys := 0
var _next := 0.0


func setup(lv: Level, entry: Dictionary, p: Vector2i, kit_id: String) -> void:
	level = lv
	e = entry
	cell_pos = p
	kind = e["trap"]
	_storey = int(e.get("level", 0))
	_t = e.get("phase", 0.0)
	_light = OmniLight3D.new()
	_light.omni_range = 5.0
	_light.light_energy = 0.0
	add_child(_light)
	match kind:
		"laser":
			_build_laser(lv, p, kit_id)
		"darts":
			_build_darts(lv, p, kit_id)
		"shock":
			_build_shock(kit_id)
		"vent":
			_build_vent(kit_id)
	var offs: Array = e["off"] if e.get("off") is Array else ([e["off"]] if e.has("off") else [])
	for f in offs:
		if Game.has_flag(f):
			set_enabled(false)
	Game.flag_set.connect(func(n): if offs.has(n): set_enabled(false))


## Emitters on the walls either side at each of "heights", and a beam across between each pair.
func _build_laser(lv: Level, p: Vector2i, kit_id: String) -> void:
	_along_x = _wall(lv, p.x - 1, p.y) and _wall(lv, p.x + 1, p.y)
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


## A plate in the floor, and dart ports in the walls either side (not where a side is a door or a window).
func _build_darts(lv: Level, p: Vector2i, kit_id: String) -> void:
	_along_x = _wall(lv, p.x - 1, p.y) and _wall(lv, p.x + 1, p.y)
	if e.has("axis"):
		_along_x = e["axis"] == "x"
	rotation.y = 0.0 if _along_x else PI / 2
	_plate = LM.spawn_model(kit_id, "trap_plate")
	add_child(_plate)
	for zz in [-1.1, 0.0, 1.1]:
		for s in [-1.0, 1.0]:
			var side: Vector3 = Vector3(s, 0, 0).rotated(Vector3.UP, rotation.y)
			var sc: Dictionary = lv.air(p.x + roundi(side.x), p.y + roundi(side.z), _storey)
			if not sc["solid"] or sc.get("door", "") != "" or sc.get("window", "") != "":
				continue                             # a door or a window on that side: no wall there to put a port in
			var port := LM.spawn_model(kit_id, "trap_dart")
			add_child(port)
			port.position = Vector3(s * lv.C / 2, 1.25, zz)
			port.rotation.y = -s * PI / 2
	_light.light_color = Color(1.0, 0.8, 0.2)
	_light.position.y = 1.2


func _build_shock(kit_id: String) -> void:
	add_child(LM.spawn_model(kit_id, "trap_shock"))
	_light.light_color = Color(0.3, 0.8, 1.0)
	_light.position.y = 0.6


## A grille, and the gas it breathes out: particles in "color".
func _build_vent(kit_id: String) -> void:
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
	if rel.y < -0.6 or rel.y > level.H - 0.8:        # they are on another storey: a trap works on its own floor only
		return
	var here: bool = abs(rel.x) < level.C / 2 and abs(rel.z) < level.C / 2
	match kind:
		"laser":
			_tick_laser(pl, rel, here)
		"darts":
			_tick_darts(dt, pl, rel, here)
		"shock":
			_tick_shock(pl, rel, here)
		"vent":
			_tick_vent(pl, rel)


## On for cycle[0] seconds and off for cycle[1]; a beam at the player's height burns (or, as a tripwire, tells).
func _tick_laser(pl: Node3D, rel: Vector3, here: bool) -> void:
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
					if e.get("trip", false):             # a tripwire: it tells somebody, once
						LM.sound("alarm", global_position)
						Game.run_effects(e.get("effects"))
						set_enabled(false)
						break
					pl.hurt(e.get("damage", 14.0), {"type": "laser", "from": global_position})
					LM.sound("zap", global_position)
					Fx.sparks(level, pl.global_position + Vector3(0, b.position.y, 0), Color(1, 0.3, 0.1), 8)
					Game.run_effects(e.get("effects"))
					break


## Stepped on: after "delay", "volleys" of darts "interval" apart, then "cooldown".
func _tick_darts(dt: float, pl: Node3D, rel: Vector3, here: bool) -> void:
	var on_plate: bool = here and absf(rel.y) < 0.5
	if _plate:
		_plate.position.y = lerpf(_plate.position.y, -0.022 if on_plate else 0.0, 0.3)
	_light.light_energy = maxf(0.0, _light.light_energy - dt * 4.0)
	if on_plate and _cool <= 0.0 and _volleys == 0:
		_cool = e.get("cooldown", 2.5)
		_volleys = int(e.get("volleys", 2))
		_next = e.get("delay", 0.3)
		LM.sound("click", global_position)
	if _volleys > 0:
		_next -= dt
		if _next <= 0.0:
			_volleys -= 1
			_next = e.get("interval", 0.3)
			LM.sound("swing", global_position)
			_light.light_energy = 1.5
			for zz in [-1.1, 0.0, 1.1]:
				Fx.tracer(level, to_global(Vector3(-level.C / 2 + 0.1, 1.25, zz)), to_global(Vector3(level.C / 2 - 0.1, 1.25, zz)), Color(1.0, 0.85, 0.3))
			if on_plate:
				pl.hurt(e.get("damage", 9.0), {"type": "trap", "from": global_position})
				Fx.sparks(level, pl.global_position + Vector3(0, 1.2, 0), Color(1.0, 0.85, 0.3), 6)


## Charges up (the light grows) for the last second of each "period", then discharges into whoever stands on it.
func _tick_shock(pl: Node3D, rel: Vector3, here: bool) -> void:
	var period: float = e.get("period", 2.6)
	var ph := fmod(_t, period)
	var warn: float = period - 0.95
	if ph > warn and ph < period - 0.25:
		_light.light_energy = (ph - warn) * 2.0
		if not _on:
			_on = true
			if _near(pl):                    # a floor that charges every few seconds is a siren if it carries: only up close
				LM.sound("shock_charge", global_position, -8.0)
	elif ph >= period - 0.25:
		_light.light_energy = 6.0
		if _on:
			_on = false
			if _near(pl):
				LM.sound("zap", global_position, -4.0)
			Fx.sparks(level, global_position + Vector3(0, 0.3, 0), Color(0.5, 0.9, 1.0), 24, 6.0)
			if here and rel.y < 0.4:
				pl.hurt(e.get("damage", 18.0), {"type": "shock", "from": global_position})
	else:
		_light.light_energy = 0.15


## Breathes gas for "on" seconds of every "period"; it burns within 1.3 m.
func _tick_vent(pl: Node3D, rel: Vector3) -> void:
	var period2: float = e.get("period", 4.0)
	var on_for: float = e.get("on", 1.6)
	_on = fmod(_t, period2) < on_for
	_parts.emitting = _on
	_light.light_energy = 1.2 if _on else 0.1
	if _on and _cool <= 0.0 and Vector2(rel.x, rel.z).length() < 1.3 and rel.y < 3.0:
		_cool = 0.4
		pl.hurt(e.get("damage", 7.0), {"type": "toxic", "from": global_position})


## Traps that cycle for ever (the shock floor) are heard only from close by, on their own storey: "hear" metres (12), or "quiet": true for never.
func _near(pl: Node3D) -> bool:
	if e.get("quiet", false) or pl == null or not is_instance_valid(pl):
		return false
	return pl.global_position.distance_to(global_position) < float(e.get("hear", 12.0)) and level.floor_of(pl.global_position) == level.floor_of(global_position)


## Is that cell, on this trap's storey, something to fix an emitter to?
func _wall(lv: Level, x: int, y: int) -> bool:
	return lv.air(x, y, _storey)["solid"]
