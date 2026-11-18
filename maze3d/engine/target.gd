extends StaticBody3D
## Target - something for an off-duty monster to show its attacks on (and for the player to shoot at). It stands in for
## the player in the monster's own fighting code: it can be seen, shot, hit, pounced on, grabbed and thrown, and counts
## what lands. Shots meant for the player hit it (layer 2) and so do the player's (layer 4); it does not block sight.
##   level thing: {"target": "range", "at": [x, y], "face": "s"}      the name is its tag: "range" ones are the gun range's
class_name Target

var level: Level
var e: Dictionary = {}
var tag := ""
var dead := false
var held_by: Node = null
var velocity := Vector3.ZERO
var busy: Node = null            # the monster using it now
var hits := 0
var total := 0.0
var _home := Vector3.ZERO
var _label: Label3D
var _board: Node3D
var _kick := 0.0


func setup(lv: Level, entry: Dictionary) -> void:
	level = lv
	e = entry
	tag = str(e.get("target", ""))
	collision_layer = 2 | 4
	collision_mask = 0
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.42
	cap.height = 1.9
	cs.shape = cap
	cs.position.y = 0.95
	add_child(cs)
	_home = position
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.16, 0.17, 0.19)
	dark.metallic = 0.7
	dark.roughness = 0.5
	var white := StandardMaterial3D.new()
	white.albedo_color = Color(0.92, 0.9, 0.84)
	white.roughness = 0.8
	var red := StandardMaterial3D.new()
	red.albedo_color = Color(0.85, 0.12, 0.1)
	red.emission_enabled = true
	red.emission = Color(0.85, 0.12, 0.1)
	red.emission_energy_multiplier = 0.6
	_part(self, _cyl(0.5, 0.08), dark, Vector3(0, 0.04, 0))                      # the foot
	_board = Node3D.new()
	add_child(_board)
	_part(_board, _cyl(0.05, 1.0), dark, Vector3(0, 0.55, 0))                   # the post
	var bm := BoxMesh.new()
	bm.size = Vector3(0.78, 1.05, 0.07)
	_part(_board, bm, white, Vector3(0, 1.25, 0))                              # the body
	_part(_board, _cyl(0.24, 0.07), white, Vector3(0, 1.98, 0), true)           # the head
	for ring in [[0.3, red], [0.2, white], [0.1, red]]:                        # rings on both faces
		for side in [-1.0, 1.0]:
			_part(_board, _cyl(ring[0], 0.012), ring[1], Vector3(0, 1.3, side * (0.036 + (0.3 - ring[0]) * 0.02)), true)
	_label = Label3D.new()
	_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_label.font_size = 36
	_label.pixel_size = 0.006
	_label.modulate = Color(1.0, 0.85, 0.4)
	_label.position = Vector3(0, 2.45, 0)
	_label.text = "TARGET"
	add_child(_label)


func _cyl(r: float, h: float) -> CylinderMesh:
	var m := CylinderMesh.new()
	m.top_radius = r
	m.bottom_radius = r
	m.height = h
	m.radial_segments = 16
	return m


func _part(to: Node3D, mesh: Mesh, mat: Material, at: Vector3, facing := false) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = at
	if facing:
		mi.rotation.x = PI / 2
	to.add_child(mi)


func hurt(amount: float, info: Dictionary = {}) -> void:
	hits += 1
	total += amount
	_label.text = "%d hit%s · %d" % [hits, "" if hits == 1 else "s", roundi(total)]
	_kick = 1.0
	Fx.sparks(level, info.get("point", global_position + Vector3(0, 1.3, 0)), Color(1.0, 0.8, 0.4), 8, 3.5)
	LM.sound("hit", global_position, -4.0)


func shake(_s := 0.0) -> void:
	pass


func heal(_a := 0.0) -> void:
	pass


func _physics_process(dt: float) -> void:
	if _kick > 0.0:                                  # it rocks when hit
		_kick = maxf(0.0, _kick - dt * 2.5)
		_board.rotation.x = -sin(_kick * 9.0) * 0.22 * _kick
	if held_by != null and (not is_instance_valid(held_by) or held_by.dead):
		held_by = null
	if held_by == null and position.distance_to(_home) > 0.01:      # put back where it stands after being carried or thrown
		position = position.lerp(_home, clampf(6.0 * dt, 0.0, 1.0))
	velocity = Vector3.ZERO
