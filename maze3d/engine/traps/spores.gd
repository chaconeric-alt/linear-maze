extends TrapKind
## The spore pod: a cluster of swollen caps on the floor. Anything it does not spare that comes within "radius" (2.5 m)
## makes it burst: a cloud of spores hangs over it for "time" (6 s), "cloud" metres across (2.2), up to 3 m high,
## choking anyone in it ("damage", 6, poison, every half second). The caps take "cooldown" (10 s) to swell again.
class_name TrapSpores

var _caps: Node3D
var _cloud: CPUParticles3D
var _left := 0.0                  # seconds the cloud still hangs
var _wait := 0.0                  # seconds before the caps can burst again


func build(_kit_id: String) -> void:
	var c := LM.col(e.get("color"), Color(0.55, 0.85, 0.25))
	_caps = Node3D.new()
	trap.add_child(_caps)
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.45, 0.4, 0.3)
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = 0.6
	for k in 5:
		var cap := MeshInstance3D.new()
		var sm := SphereMesh.new()
		var r := 0.16 + 0.06 * (k % 3)
		sm.radius = r
		sm.height = r * 1.4
		sm.material = m
		cap.mesh = sm
		var a := TAU * k / 5.0
		cap.position = Vector3(cos(a) * 0.3, r * 0.6, sin(a) * 0.3) if k > 0 else Vector3(0, r * 0.7, 0)
		_caps.add_child(cap)
	_cloud = CPUParticles3D.new()
	_cloud.amount = 70
	_cloud.lifetime = 2.5
	_cloud.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	_cloud.emission_sphere_radius = float(e.get("cloud", 2.2)) * 0.6
	_cloud.gravity = Vector3(0, 0.15, 0)
	_cloud.initial_velocity_max = 0.4
	_cloud.scale_amount_min = 2.0
	_cloud.scale_amount_max = 5.0
	var q := QuadMesh.new()
	q.size = Vector2(0.4, 0.4)
	q.material = Fx.glow_mat(c, 0.25)
	_cloud.mesh = q
	_cloud.emitting = false
	_cloud.position.y = 1.2
	trap.add_child(_cloud)
	trap.light.light_color = c
	trap.light.position.y = 0.8


func off() -> void:
	on = false
	_cloud.emitting = false


func tick(dt: float, _pl: Node3D, who: Array) -> void:
	_wait -= dt
	if _left > 0.0:
		_left -= dt
		on = _left > 0.0
		_cloud.emitting = on
		trap.light.light_energy = 0.9 if on else 0.0
	else:
		_caps.scale = Vector3.ONE * clampf(1.0 - _wait / float(e.get("cooldown", 10.0)), 0.3, 1.0)
		trap.light.light_energy = 0.15
		if _wait <= 0.0:
			for v in who:
				var rel: Vector3 = v.global_position - trap.global_position
				if Vector2(rel.x, rel.z).length() < float(e.get("radius", 2.5)):
					_burst()
					break
	if not on:
		return
	for v in who:
		var rel2: Vector3 = v.global_position - trap.global_position
		if Vector2(rel2.x, rel2.z).length() < float(e.get("cloud", 2.2)) and trap.span(v, v.global_position).x + 0.05 < 3.0 and trap.due(v, 0.5):
			v.hurt(e.get("damage", 6.0), {"type": "poison", "from": trap.global_position})


func _burst() -> void:
	_left = e.get("time", 6.0)
	_wait = float(e.get("time", 6.0)) + float(e.get("cooldown", 10.0))
	on = true
	_cloud.emitting = true
	_caps.scale = Vector3.ONE * 0.3
	LM.sound("squish", trap.global_position)


func danger(_who: Node3D, rel: Vector3, sp: Vector2, room: float, _lead: float) -> bool:
	var reach: float = float(e.get("cloud", 2.2)) if on else float(e.get("radius", 2.5))
	return Vector2(rel.x, rel.z).length() < reach + room and sp.x < 3.05
