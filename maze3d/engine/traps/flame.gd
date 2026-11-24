extends TrapKind
## The flame jet: a grille in the floor (the kit model trap_vent) that roars up a pillar of fire for "on" seconds
## (1.5) of every "period" (4). For the last 0.6 s before it fires a pilot flame flickers in it: the warning. The fire
## burns within 1.4 m of it, up to 3.5 m high ("damage", 10, fire, every quarter second).
class_name TrapFlame

const PILOT := 0.6
const REACH := 1.4

var _fire: CPUParticles3D


func build(kit_id: String) -> void:
	trap.add_child(LM.spawn_model(kit_id, "trap_vent"))
	trap.light.light_color = Color(1.0, 0.5, 0.12)
	trap.light.position.y = 1.2
	_fire = CPUParticles3D.new()
	_fire.amount = 60
	_fire.lifetime = 0.55
	_fire.direction = Vector3.UP
	_fire.spread = 10.0
	_fire.initial_velocity_min = 5.0
	_fire.initial_velocity_max = 8.0
	_fire.gravity = Vector3(0, 2.0, 0)
	_fire.scale_amount_min = 1.5
	_fire.scale_amount_max = 4.0
	_fire.color_ramp = _ramp()
	var q := QuadMesh.new()
	q.size = Vector2(0.3, 0.3)
	var m := Fx.glow_mat(Color(1.0, 0.55, 0.15), 3.0)
	m.vertex_color_use_as_albedo = true
	q.material = m
	_fire.mesh = q
	_fire.emitting = false
	_fire.position.y = 0.1
	trap.add_child(_fire)


static func _ramp() -> Gradient:
	var g := Gradient.new()
	g.set_color(0, Color(1.0, 0.95, 0.6))
	g.set_color(1, Color(0.8, 0.15, 0.02, 0.0))
	return g


func off() -> void:
	on = false
	_fire.emitting = false


## Seconds into its cycle: firing from 0 for "on" seconds.
func _phase() -> float:
	return fmod(trap.t, float(e.get("period", 4.0)))


func _firing(lead: float) -> bool:
	var period: float = e.get("period", 4.0)
	var ph := _phase()
	return ph < float(e.get("on", 1.5)) or period - ph <= lead


func tick(_dt: float, pl: Node3D, who: Array) -> void:
	var period: float = e.get("period", 4.0)
	var was := on
	on = _firing(0.0)
	_fire.emitting = on
	var pilot := not on and period - _phase() <= PILOT
	trap.light.light_energy = 2.5 if on else (0.6 + 0.4 * sin(trap.t * 40.0) if pilot else 0.05)
	if on and not was and trap.near(pl):
		LM.sound("charge", trap.global_position, -4.0)
	if not on:
		return
	for v in who:
		var rel: Vector3 = v.global_position - trap.global_position
		if Vector2(rel.x, rel.z).length() < REACH and trap.span(v, v.global_position).x + 0.05 < 3.5 and trap.due(v, 0.25):
			v.hurt(e.get("damage", 10.0), {"type": "fire", "from": trap.global_position})


func danger(_who: Node3D, rel: Vector3, sp: Vector2, room: float, lead: float) -> bool:
	return _firing(lead) and Vector2(rel.x, rel.z).length() < REACH + room and sp.x < 3.55
