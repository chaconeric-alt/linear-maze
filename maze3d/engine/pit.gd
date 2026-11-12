class_name Pit
extends Node3D
## A floor that is not one. It looks like the rest of the floor until the player stands on it; then it drops them into
## whatever is underneath, and shuts again.
##   {"trap": "pit", "at": [x, y], "level": 0, "delay": 0.15, "damage": 6}
## There has to be a room below (a lower floor's cell, or a taller room that reaches up to here). Monsters walk over it.

var level: Level
var storey := 0
var delay := 0.15
var damage := 6.0
var _leaves: Array = []
var _cs: CollisionShape3D
var _open := false
var _t := 0.0
var _k := 0.0
var _owes := false                # the player is on the way down and has not landed yet


func setup(lv: Level, e: Dictionary, p: Vector2i, s: int) -> void:
	level = lv
	storey = s
	delay = e.get("delay", 0.15)
	damage = e.get("damage", 6.0)
	var c := lv.cell(p.x, p.y, s)
	var st: Dictionary = lv.kit["styles"].get(c["style"], lv.kit["styles"].values()[0])
	var mesh := LM.tile_mesh(lv.kit_id, lv._pick(st.get("floor")))
	for side in [-1, 1]:                              # two leaves, hinged at the edges, meeting in the middle
		var hinge := Node3D.new()
		hinge.position.x = side * lv.C / 2
		add_child(hinge)
		var leaf := MeshInstance3D.new()
		leaf.mesh = mesh
		leaf.scale = Vector3(0.5, 1, 1)
		leaf.position.x = -side * lv.C / 4
		hinge.add_child(leaf)
		_leaves.append([hinge, side])
	var body := StaticBody3D.new()
	body.collision_layer = 1
	body.collision_mask = 0
	add_child(body)
	_cs = CollisionShape3D.new()
	var b := BoxShape3D.new()
	b.size = Vector3(lv.C, 0.3, lv.C)
	_cs.shape = b
	_cs.position.y = -0.15
	body.add_child(_cs)


func _physics_process(dt: float) -> void:
	var pl := Game.player
	if pl == null or not is_instance_valid(pl):
		return
	var rel: Vector3 = pl.global_position - global_position
	var over: bool = absf(rel.x) < level.C * 0.36 and absf(rel.z) < level.C * 0.36
	if not _open:
		_k = move_toward(_k, 0.0, dt * 3.0)
		if over and rel.y > -0.2 and rel.y < 1.0:
			_t += dt
			if _t >= delay:
				_open = true
				_owes = true
				_t = 0.0
				_cs.disabled = true
				LM.sound("clang", global_position)
		else:
			_t = 0.0
	else:
		_k = move_toward(_k, 1.0, dt * 6.0)
		_t += dt
		if _owes and rel.y < -level.H + 1.2:
			_owes = false
			if damage > 0.0:
				pl.hurt(damage, {"type": "fall", "from": global_position})
		var in_hole: bool = absf(rel.x) < level.C * 0.6 and absf(rel.z) < level.C * 0.6 and rel.y > -2.2 and rel.y < 1.0
		if _t > 2.5 and not in_hole:
			_open = false
			_owes = false
			_t = 0.0
			_cs.disabled = false
	for lf in _leaves:
		(lf[0] as Node3D).rotation.z = lf[1] * _k * deg_to_rad(84)
