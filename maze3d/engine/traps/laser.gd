extends TrapKind
## The laser: emitters on the walls either side at each of "heights" (0.5, 1.15, 1.8 m), and a beam across between
## each pair, on for cycle[0] seconds and off for cycle[1] (no "cycle": always on). A beam within a body's height burns
## it ("damage", 14, every half second). "trip": true makes it a tripwire: no damage; it runs its "effects" once and goes
## out.
class_name TrapLaser

var _beams: Array = []
var along_x := true              # the beams run east and west (else north and south)


func build(kit_id: String) -> void:
	var lv := trap.level
	var p := trap.cell_pos
	along_x = trap.solid_at(p.x - 1, p.y) and trap.solid_at(p.x + 1, p.y)
	if e.has("axis"):
		along_x = e["axis"] == "x"
	trap.rotation.y = 0.0 if along_x else PI / 2
	var mat := Fx.glow_mat(Color(1.0, 0.1, 0.05), 4.0).duplicate()
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED
	for hgt in e.get("heights", [0.5, 1.15, 1.8]):
		for s in [-1.0, 1.0]:
			var em := LM.spawn_model(kit_id, "trap_laser")
			trap.add_child(em)
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
		trap.add_child(mi)
		_beams.append(mi)
	trap.light.light_color = Color(1.0, 0.1, 0.05)
	trap.light.position.y = 1.2


func off() -> void:
	on = false
	for b in _beams:
		b.visible = false


func harmless() -> bool:
	return e.get("trip", false)


func tick(_dt: float, pl: Node3D, who: Array) -> void:
	on = _laser_on(0.0)
	for b in _beams:
		b.visible = on
	trap.light.light_energy = 0.8 if on else 0.0
	if not on:
		return
	for v in who:
		var rel: Vector3 = v.global_position - trap.global_position
		var across: float = rel.z if along_x else rel.x
		if not trap.here(rel) or absf(across) >= trap.reach(v) or not _beam_in(trap.span(v, v.global_position)):
			continue
		if e.get("trip", false):
			if v == pl:                                # a tripwire: it tells somebody, once
				LM.sound("alarm", trap.global_position)
				Game.run_effects(e.get("effects"))
				trap.set_enabled(false)
				return
			continue
		if not trap.due(v, 0.5):
			continue
		var at_h := _beam_at(trap.span(v, v.global_position))
		v.hurt(e.get("damage", 14.0), {"type": "laser", "from": trap.global_position})
		LM.sound("zap", trap.global_position)
		Fx.sparks(trap.level, Vector3(v.global_position.x, trap.global_position.y + at_h, v.global_position.z), Color(1, 0.3, 0.1), 8)
		if v == pl:
			Game.run_effects(e.get("effects"))


func danger(_who: Node3D, rel: Vector3, sp: Vector2, room: float, lead: float) -> bool:
	var across: float = rel.z if along_x else rel.x
	return _laser_on(lead) and trap.here(rel, Trap.SPARE) and absf(across) < room and _beam_in(Vector2(sp.x - 0.1, sp.y + 0.1))


## Is any beam within that span (bottom, top)?
func _beam_in(sp: Vector2) -> bool:
	return _beam_at(sp) >= 0.0


## The height of the first beam within that span, or -1.
func _beam_at(sp: Vector2) -> float:
	for b in _beams:
		if b.position.y > sp.x and b.position.y < sp.y:
			return b.position.y
	return -1.0


## Is the laser on now, or will it come on within `lead` seconds?
func _laser_on(lead: float) -> bool:
	var cyc: Array = e.get("cycle", [])      # [seconds on, seconds off]; none = always on
	if cyc.is_empty():
		return true
	var ph := fmod(trap.t, cyc[0] + cyc[1])
	return ph < cyc[0] or cyc[0] + cyc[1] - ph <= lead
