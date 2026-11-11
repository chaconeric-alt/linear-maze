extends Node3D
## Projectile - anything that flies and hits: plasma, bolts, spit. Defined in defs (projectiles).
class_name Projectile

var level: Level
var d: Dictionary
var vel := Vector3.ZERO
var damage := 10.0
var by: Node = null
var from_player := false
var _life := 4.0


static func launch(lv: Level, id: String, from: Vector3, dir: Vector3, dmg: float, owner_node: Node, player_shot: bool) -> Projectile:
	var p := Projectile.new()
	p.level = lv
	p.d = LM.get_def("projectiles", id)
	p.damage = dmg
	p.by = owner_node
	p.from_player = player_shot
	p.vel = dir.normalized() * p.d.get("speed", 24.0)
	lv.add_child(p)
	p.global_position = from
	var c := LM.col(p.d.get("color"), Color(0.3, 0.9, 1.0))
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = p.d.get("radius", 0.12)
	sm.height = sm.radius * 2
	sm.radial_segments = 10
	sm.rings = 5
	var m := Fx.glow_mat(c, 4.0).duplicate()
	m.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED
	sm.material = m
	mi.mesh = sm
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	p.add_child(mi)
	var l := OmniLight3D.new()
	l.light_color = c
	l.light_energy = p.d.get("light", 1.5)
	l.omni_range = 5.0
	p.add_child(l)
	return p


func _physics_process(dt: float) -> void:
	_life -= dt
	if _life <= 0.0:
		queue_free()
		return
	vel.y -= d.get("gravity", 0.0) * dt
	var to := global_position + vel * dt
	var q := PhysicsRayQueryParameters3D.create(global_position, to, 1 | Level.GLASS | (4 if from_player else 2))
	if by is CollisionObject3D:
		q.exclude = [by.get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	if hit.is_empty():
		global_position = to
		return
	var pos: Vector3 = hit["position"]
	var c := LM.col(d.get("color"), Color(0.3, 0.9, 1.0))
	if d.has("puddle"):                              # what it was made of stays where it landed
		Puddle.drop(level, pos, d["puddle"], by)
	if d.has("blast"):
		Fx.explode(level, pos - vel.normalized() * 0.2, d["blast"].get("radius", 3.0), d["blast"].get("damage", damage), c, by, not from_player or d["blast"].get("self", false))
	else:
		Fx.sparks(level, pos, c, 10, 4.0)
		Fx.flash(level, pos, c, 3.0, 4.0)
		LM.sound("hit", pos, -6.0)
	var col: Object = hit["collider"]
	if col and col.has_method("hurt"):
		col.hurt(damage, {"type": d.get("kind", "energy"), "from": global_position, "by": by, "point": pos})
	queue_free()
