extends TrapKind
## The sweeping laser: a squat pylon in the middle of the cell with a beam out from it to the cell's edge at "height"
## (0.5 m: jump it), going round once every "period" seconds (3; a negative period goes the other way). The beam burns
## whatever it crosses ("damage", 18, every half second); standing on the pylon burns too.
class_name TrapSweep

var _arm: Node3D
var _radius := 1.9


func build(_kit_id: String) -> void:
	var lv := trap.level
	_radius = lv.C / 2 - 0.1
	var h: float = e.get("height", 0.5)
	var post := MeshInstance3D.new()
	var pm := CylinderMesh.new()
	pm.top_radius = 0.16
	pm.bottom_radius = 0.24
	pm.height = h + 0.15
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.18, 0.18, 0.2)
	mat.metallic = 0.7
	pm.material = mat
	post.mesh = pm
	post.position.y = (h + 0.15) / 2
	trap.add_child(post)
	_arm = Node3D.new()
	_arm.position.y = h
	trap.add_child(_arm)
	var beam := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.025
	cm.bottom_radius = 0.025
	cm.height = _radius
	cm.radial_segments = 6
	var bmat := Fx.glow_mat(Color(1.0, 0.1, 0.05), 4.0).duplicate()
	bmat.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED
	cm.material = bmat
	beam.mesh = cm
	beam.rotation.z = PI / 2
	beam.position.x = _radius / 2
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_arm.add_child(beam)
	trap.light.light_color = Color(1.0, 0.1, 0.05)
	trap.light.position.y = h + 0.3
	_arm.rotation.y = _angle()


func off() -> void:
	on = false
	_arm.visible = false


## Where the beam points now (radians, as a node's rotation about the vertical).
func _angle() -> float:
	var period: float = e.get("period", 3.0)
	return TAU * trap.t / period if absf(period) > 0.1 else 0.0


func tick(_dt: float, _pl: Node3D, who: Array) -> void:
	on = true
	_arm.rotation.y = _angle()
	trap.light.light_energy = 0.8
	var h: float = e.get("height", 0.5)
	var dir := Vector3(cos(_arm.rotation.y), 0, -sin(_arm.rotation.y))        # the beam runs along the arm's +x
	for v in who:
		var rel: Vector3 = v.global_position - trap.global_position
		rel.y = 0
		var sp := trap.span(v, v.global_position)
		if sp.x > h or sp.y < h:
			continue
		var along := rel.dot(dir)
		var off_beam := (rel - dir * along).length()
		var hit := rel.length() < 0.35 or (along > 0.0 and along < _radius + trap.reach(v) and off_beam < trap.reach(v))
		if hit and trap.due(v, 0.5):
			v.hurt(e.get("damage", 18.0), {"type": "laser", "from": trap.global_position + Vector3(0, h, 0)})
			LM.sound("zap", trap.global_position)
			Fx.sparks(trap.level, v.global_position + Vector3(0, h, 0), Color(1, 0.3, 0.1), 8)


func danger(_who: Node3D, rel: Vector3, sp: Vector2, room: float, _lead: float) -> bool:
	var h: float = e.get("height", 0.5)
	return Vector2(rel.x, rel.z).length() < _radius + room and sp.x < h + 0.1 and sp.y > h - 0.1
