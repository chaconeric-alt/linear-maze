extends TrapKind
## The gas vent: a grille (the kit model trap_vent) that breathes gas in "color" for "on" seconds (1.6) of every
## "period" (4); it burns within 1.3 m, up to 3 m high ("damage", 7, toxic, every 0.4 s).
class_name TrapVent

var parts: CPUParticles3D


func build(kit_id: String) -> void:
	trap.add_child(LM.spawn_model(kit_id, "trap_vent"))
	var c := LM.col(e.get("color"), Color(0.4, 1.0, 0.25))
	trap.light.light_color = c
	trap.light.position.y = 1.0
	parts = CPUParticles3D.new()
	parts.amount = 40
	parts.lifetime = 0.9
	parts.direction = Vector3.UP
	parts.spread = 14.0
	parts.initial_velocity_min = 3.0
	parts.initial_velocity_max = 5.0
	parts.gravity = Vector3(0, 1.0, 0)
	parts.scale_amount_min = 1.0
	parts.scale_amount_max = 3.0
	var q := QuadMesh.new()
	q.size = Vector2(0.35, 0.35)
	var m := Fx.glow_mat(c, 0.35)
	q.material = m
	parts.mesh = q
	parts.emitting = false
	parts.position.y = 0.15
	trap.add_child(parts)


func off() -> void:
	on = false
	parts.emitting = false


func tick(_dt: float, _pl: Node3D, who: Array) -> void:
	on = _vent_on(0.0)
	parts.emitting = on
	trap.light.light_energy = 1.2 if on else 0.1
	if not on:
		return
	for v in who:
		var rel: Vector3 = v.global_position - trap.global_position
		if Vector2(rel.x, rel.z).length() < 1.3 and trap.span(v, v.global_position).x + 0.05 < 3.0 and trap.due(v, 0.4):
			v.hurt(e.get("damage", 7.0), {"type": "toxic", "from": trap.global_position})


func danger(_who: Node3D, rel: Vector3, sp: Vector2, room: float, lead: float) -> bool:
	return _vent_on(lead) and Vector2(rel.x, rel.z).length() < 1.3 + room and sp.x < 3.05


## Is the vent breathing now, or will it start within `lead` seconds?
func _vent_on(lead: float) -> bool:
	var period2: float = e.get("period", 4.0)
	var on_for: float = e.get("on", 1.6)
	var ph := fmod(trap.t, period2)
	return ph < on_for or period2 - ph <= lead
