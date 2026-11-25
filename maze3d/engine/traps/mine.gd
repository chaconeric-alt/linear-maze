extends TrapKind
## The mine: a disc on the floor with a light that blinks slowly while it waits. Anything it does not spare that walks
## within "radius" (1.3 m) of it sets it off: it beeps fast for "delay" (0.6 s), then goes up ("blast", 3.5 m;
## "damage", 50, explosive, less with distance; it throws what it hurts), and is gone for good. Flyers pass over it.
class_name TrapMine

var _disc: MeshInstance3D
var _lamp: MeshInstance3D
var _armed := -1.0                # seconds left before it goes up; -1 while it waits


func build(_kit_id: String) -> void:
	_disc = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.2
	cm.bottom_radius = 0.24
	cm.height = 0.08
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.25, 0.27, 0.2)
	m.metallic = 0.5
	cm.material = m
	_disc.mesh = cm
	_disc.position.y = 0.04
	trap.add_child(_disc)
	_lamp = MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.04
	sm.height = 0.08
	sm.material = Fx.glow_mat(Color(1.0, 0.1, 0.05), 3.0)
	_lamp.mesh = sm
	_lamp.position.y = 0.1
	trap.add_child(_lamp)
	trap.light.light_color = Color(1.0, 0.1, 0.05)
	trap.light.omni_range = 2.0
	trap.light.position.y = 0.3


func off() -> void:
	on = false
	_disc.visible = false
	_lamp.visible = false


## Gone up (or switched off): nothing is left of it to see or name.
func there() -> bool:
	return _disc.visible


func tick(dt: float, _pl: Node3D, who: Array) -> void:
	var fast := _armed >= 0.0
	var blink := fmod(trap.t, 0.2 if fast else 1.4) < (0.1 if fast else 0.12)
	_lamp.visible = blink
	trap.light.light_energy = 0.6 if blink else 0.0
	if _armed < 0.0:
		for v in who:
			var rel: Vector3 = v.global_position - trap.global_position
			if Vector2(rel.x, rel.z).length() < float(e.get("radius", 1.3)) and trap.span(v, v.global_position).x + 0.05 < 0.6:
				_armed = e.get("delay", 0.6)
				on = true
				LM.sound("ping", trap.global_position)
				break
		return
	_armed -= dt
	if _armed <= 0.0:
		var at := trap.global_position + Vector3(0, 0.3, 0)
		trap.set_enabled(false)                      # once only: the level remembers it gone
		Fx.explode(trap.level, at, float(e.get("blast", 3.5)), float(e.get("damage", 50.0)), Color(1.0, 0.55, 0.15), null,
			trap.hurts(Game.player), {"kind": "explosive"})


func danger(_who: Node3D, rel: Vector3, sp: Vector2, room: float, _lead: float) -> bool:
	return Vector2(rel.x, rel.z).length() < float(e.get("blast", 3.5)) * 0.6 + room and sp.x < 0.6
