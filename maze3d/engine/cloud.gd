class_name Cloud
extends Node3D
## Cloud - something that hangs in the air for a while and hurts whoever breathes it (SPEC.md 4.10, the effect "cloud";
## a monster's "burst"): {"radius": 2.5, "time": 6, "damage": 8 (a second), "kind": "poison", "color": [0.5, 0.9, 0.2],
## "afflict": {"poison": 4}, "ignore": "monsters"}. It hurts within "radius" metres, up to 3 m high, every half second,
## the player, every monster it does not spare and any practice target (Target), on its own storey; it thins out over
## its last second.

const EVERY := 0.5

var level: Level
var c: Dictionary
var left := 6.0
var _t := 0.0
var _parts: CPUParticles3D


static func make(lv: Level, at: Vector3, spec: Dictionary) -> Cloud:
	var cl := Cloud.new()
	lv.add_child(cl)
	cl.global_position = at
	cl.setup(lv, spec)
	return cl


func setup(lv: Level, spec: Dictionary) -> void:
	level = lv
	c = spec
	left = float(spec.get("time", 6.0))
	var col := LM.col(spec.get("color"), Color(0.5, 0.9, 0.25))
	var r := float(spec.get("radius", 2.5))
	_parts = CPUParticles3D.new()
	_parts.amount = int(clampf(r * 30.0, 30.0, 120.0))
	_parts.lifetime = 2.0
	_parts.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	_parts.emission_sphere_radius = r * 0.7
	_parts.gravity = Vector3(0, 0.12, 0)
	_parts.initial_velocity_max = 0.4
	_parts.scale_amount_min = 2.0
	_parts.scale_amount_max = 5.0
	var q := QuadMesh.new()
	q.size = Vector2(0.4, 0.4)
	q.material = Fx.glow_mat(col, 0.25)
	_parts.mesh = q
	_parts.position.y = 1.2
	add_child(_parts)


## Does it hurt this one? The player unless it says "player"; robots and living things as a trap tells them apart.
func spares(who: Node3D) -> bool:
	var ig: Variant = c.get("ignore", [])
	var list: Array = ig if ig is Array else [ig]
	if who is Actor:
		return list.has("robots" if (who as Actor).is_robot() else "monsters")
	return list.has("player")


func _physics_process(dt: float) -> void:
	left -= dt
	_parts.emitting = left > 1.0
	if left <= -2.0:
		queue_free()
		return
	if left <= 0.0:
		return
	_t += dt
	if _t < EVERY:
		return
	_t -= EVERY
	var r := float(c.get("radius", 2.5))
	var who: Array = level.actors.duplicate() + level.targets      # a practice target too: a burst shown on one lands
	if Game.player:
		who.append(Game.player)
	for v in who:
		if not is_instance_valid(v) or v.dead or spares(v):
			continue
		var rel: Vector3 = v.global_position - global_position
		if Vector2(rel.x, rel.z).length() < r and rel.y > -1.0 and rel.y < 3.0:
			var info := {"type": str(c.get("kind", "poison"))}         # (no "from": a cloud does not throw anyone back)
			if c.has("afflict"):
				info["afflict"] = c["afflict"]
			v.hurt(float(c.get("damage", 8.0)) * EVERY, info)
