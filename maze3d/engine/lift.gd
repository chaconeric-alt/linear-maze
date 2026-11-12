class_name Lift
extends AnimatableBody3D
## A platform that goes up and down a shaft between floors.
##   {"lift": [-1, 0, 1], "at": [x, y], "home": 0, "color": [0.4, 1.0, 0.6], "speed": 3.2}
## The numbers are the storeys it stops at. The shaft is the cell at its lowest stop, made tall enough by the level; the
## floors above must have somewhere to step off beside it. Stand on it and it goes to its next stop (up, then back
## down); step off and on again to go further. Stand beside the shaft on another floor and it comes to you.
## It will not come down on top of the player. Monsters do not use it.

var level: Level
var stops: Array = []             # heights
var at := 0
var going := -1
var dir := 1
var speed := 3.2
var _half := 1.8
var _on_t := 0.0
var _wait := 0.0
var _armed := true                # the rider has to step off before it will take them again
var _light: OmniLight3D


func setup(lv: Level, e: Dictionary, p: Vector2i) -> void:
	level = lv
	var st: Array = (e["lift"] as Array).map(func(a): return int(a))
	st.sort()
	for s in st:
		stops.append(s * lv.H)
	at = maxi(0, st.find(int(e.get("home", st[0]))))
	speed = e.get("speed", 3.2)
	_half = lv.C / 2 - 0.12
	collision_layer = 1
	collision_mask = 0
	sync_to_physics = true
	position = lv.center(p, stops[at])
	var cs := CollisionShape3D.new()
	var b := BoxShape3D.new()
	b.size = Vector3(_half * 2, 0.24, _half * 2)
	cs.shape = b
	cs.position.y = -0.09                             # its top stands a finger above the floor it stops at
	add_child(cs)
	var col := LM.col(e.get("color"), Color(0.4, 1.0, 0.6))
	var plate := MeshInstance3D.new()
	var pm := BoxMesh.new()
	pm.size = Vector3(_half * 2, 0.24, _half * 2)
	plate.mesh = pm
	plate.position.y = -0.09
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.16, 0.17, 0.19)
	m.metallic = 0.8
	m.roughness = 0.4
	plate.material_override = m
	add_child(plate)
	var glow := StandardMaterial3D.new()
	glow.albedo_color = col
	glow.emission_enabled = true
	glow.emission = col
	glow.emission_energy_multiplier = 2.0
	for i in 4:                                       # a lit frame round the edge, and chevrons would be showing off
		var strip := MeshInstance3D.new()
		var sm := BoxMesh.new()
		sm.size = Vector3(_half * 2 - 0.1, 0.03, 0.08)
		strip.mesh = sm
		strip.material_override = glow
		strip.rotation.y = i * PI / 2
		strip.position = Vector3(0, 0.035, _half - 0.12).rotated(Vector3.UP, i * PI / 2)
		add_child(strip)
	_light = OmniLight3D.new()
	_light.light_color = col
	_light.light_energy = 0.8
	_light.omni_range = 5.0
	_light.position.y = 1.2
	add_child(_light)
	var posts := Node3D.new()                         # guide rails up the corners of the shaft; they do not move
	lv.add_child(posts)
	var lo: float = stops[0]
	var hi: float = stops[-1] + lv.H
	for sx in [-1, 1]:
		for sz in [-1, 1]:
			var post := MeshInstance3D.new()
			var bm := BoxMesh.new()
			bm.size = Vector3(0.1, hi - lo, 0.1)
			post.mesh = bm
			post.material_override = m
			post.position = lv.center(p, (lo + hi) / 2) + Vector3(sx * (lv.C / 2 - 0.05), 0, sz * (lv.C / 2 - 0.05))
			posts.add_child(post)


func _go(i: int) -> void:
	going = i
	_armed = false
	LM.sound("servo", global_position)


func _physics_process(dt: float) -> void:
	var pl := Game.player
	if pl == null or not is_instance_valid(pl):
		return
	var rel: Vector3 = pl.global_position - global_position
	var inside: bool = absf(rel.x) < _half and absf(rel.z) < _half
	var on: bool = inside and rel.y > -0.4 and rel.y < 1.6
	if going >= 0:
		var ty: float = stops[going]
		if ty < global_position.y and inside and rel.y < -0.4:
			return                                    # somebody is underneath
		global_position.y = move_toward(global_position.y, ty, speed * dt)
		if absf(global_position.y - ty) < 0.001:
			at = going
			going = -1
			_wait = 0.6
			LM.sound("clang", global_position, -8.0)
		return
	_wait -= dt
	if not on:
		_armed = true
		_on_t = 0.0
		if _wait <= 0.0 and Vector2(rel.x, rel.z).length() < level.C * 1.3:      # called from another floor
			for i in stops.size():
				if i != at and absf(pl.global_position.y - stops[i]) < 1.0:
					_go(i)
					break
	elif _armed and _wait <= 0.0:
		_on_t += dt
		if _on_t > 0.7:
			if at + dir < 0 or at + dir >= stops.size():
				dir = -dir
			_go(at + dir)
