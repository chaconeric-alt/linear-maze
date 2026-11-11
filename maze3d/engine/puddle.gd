class_name Puddle
extends Node3D
## Something nasty left on the floor: it glows, it burns whoever stands in it, and after a while it is gone.
## A projectile leaves one where it lands if its def has
##   "puddle": {"radius": 1.3, "dps": 9, "life": 9, "color": [0.75, 0.2, 1.0], "kind": "acid", "max": 14}

static var all: Array = []

var radius := 1.3
var dps := 9.0
var life := 9.0
var kind := "acid"
var by: Node = null
var _t := 0.0
var _tick := 0.0
var _mat: StandardMaterial3D
var _light: OmniLight3D
var _mesh: MeshInstance3D


static func drop(level: Node, pos: Vector3, spec: Dictionary, from: Node) -> void:
	all = all.filter(func(p): return is_instance_valid(p))
	while all.size() >= int(spec.get("max", 14)):        # the oldest dries up to make room
		all.pop_front().queue_free()
	var p := Puddle.new()
	p.radius = spec.get("radius", 1.3)
	p.dps = spec.get("dps", 9.0)
	p.life = spec.get("life", 9.0)
	p.kind = spec.get("kind", "acid")
	p.by = from
	level.add_child(p)
	p.global_position = Vector3(pos.x, level.floor_y(pos) + 0.03, pos.z)
	p._build(LM.col(spec.get("color"), Color(0.75, 0.2, 1.0)))
	all.append(p)


func _build(c: Color) -> void:
	_mesh = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius * 1.04
	cm.height = 0.025
	cm.radial_segments = 20
	_mesh.mesh = cm
	_mat = StandardMaterial3D.new()
	_mat.albedo_color = Color(c.r, c.g, c.b, 0.78)
	_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_mat.emission_enabled = true
	_mat.emission = c
	_mat.emission_energy_multiplier = 1.6
	_mat.roughness = 0.1
	_mesh.material_override = _mat
	_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_mesh.scale = Vector3(0.2, 1, 0.2)
	add_child(_mesh)
	_light = OmniLight3D.new()
	_light.light_color = c
	_light.light_energy = 0.9
	_light.omni_range = radius * 2.6
	_light.position.y = 0.5
	add_child(_light)
	rotation.y = randf() * TAU


func _physics_process(dt: float) -> void:
	_t += dt
	var grow: float = clamp(_t / 0.35, 0.0, 1.0)
	var fade: float = clamp((life - _t) / 1.5, 0.0, 1.0)
	var wob := 1.0 + 0.05 * sin(_t * 3.0)
	_mesh.scale = Vector3(grow * wob, 1, grow * (2.0 - wob))
	_mat.albedo_color.a = 0.78 * fade
	_mat.emission_energy_multiplier = (1.3 + 0.5 * sin(_t * 4.0)) * fade
	_light.light_energy = 0.9 * fade
	if _t >= life:
		queue_free()
		return
	_tick -= dt
	if _tick <= 0.0:
		_tick = 0.25
		var pl := Game.player
		if pl and is_instance_valid(pl) and not pl.dead:
			var dv: Vector3 = pl.global_position - global_position
			if Vector2(dv.x, dv.z).length() < radius * grow and absf(dv.y) < 0.8:
				pl.hurt(dps * 0.25, {"type": kind, "from": global_position, "by": by})
