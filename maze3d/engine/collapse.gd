class_name Collapse
extends Node3D
## A floor that gives way for good: {"trap": "collapse", "at": [x, y], "warn": 0.8, "damage": 35}. It looks like the
## rest of the floor. Stood on, it creaks and shudders for "warn" seconds, then drops into a shaft and stays open. The
## player who falls in takes "damage" (fall) and climbs out where they last stood clear of it; a monster that falls in
## is gone. Unlike a pit it needs no room below: the shaft is its own. Over a room, though, it drops them into it, as a
## pit does, hurt as they land. Once open, monsters path round the hole, and the level's memory keeps it open.

const DEPTH := 4.0
const FALLEN := 0.5               # this far down they are in it (the level's net under everything catches them at 0.8)

var level: Level
var storey := 0
var cell_pos: Vector2i
var warn := 0.8
var damage := 35.0
var _leaves: Array = []
var _cs: CollisionShape3D
var _open := false
var _t := 0.0
var _k := 0.0
var _below := false               # a room under it: whoever falls lands in it (as through a pit), hurt, and stays there
var _owes := false


func setup(lv: Level, e: Dictionary, p: Vector2i, s: int) -> void:
	level = lv
	storey = s
	cell_pos = p
	warn = float(e.get("warn", 0.8))
	damage = float(e.get("damage", 35.0))
	_below = lv.open_s(p.x, p.y, s - 1)
	var c := lv.cell(p.x, p.y, s)
	var st: Dictionary = lv.kit["styles"].get(c["style"], lv.kit["styles"].values()[0])
	var mesh := LM.tile_mesh(lv.kit_id, lv.pick(st.get("floor")))
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
	_shaft(lv)
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


## The shaft under it: four dark walls and broken stone at the bottom, seen once it has fallen.
func _shaft(lv: Level) -> void:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.08, 0.07, 0.07)
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	for d in 4:
		var wall := MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(lv.C, DEPTH)
		q.material = m
		wall.mesh = q
		wall.rotation.y = d * PI / 2
		wall.position = Vector3(0, -DEPTH / 2, 0) + Vector3(sin(d * PI / 2), 0, cos(d * PI / 2)) * (lv.C / 2)
		add_child(wall)
	var floor_q := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(lv.C, 0.2, lv.C)
	bm.material = m
	floor_q.mesh = bm
	floor_q.position.y = -DEPTH
	add_child(floor_q)


## It has given way.
func is_open() -> bool:
	return _open


func remember() -> Dictionary:
	return {"open": true} if _open else {}


func recall(r: Dictionary) -> void:
	if r.get("open", false):
		_give_way(true)


func _give_way(quiet := false) -> void:
	_open = true
	_cs.disabled = true
	level.block(cell_pos, true, storey)
	if not quiet:
		LM.sound("crash", global_position)
		Fx.sparks(level, global_position + Vector3(0, 0.1, 0), Color(0.6, 0.55, 0.45), 30, 4.0, 0.7, 0.08)
	else:
		_k = 1.0


func _physics_process(dt: float) -> void:
	var pl := Game.player
	if pl == null or not is_instance_valid(pl):
		return
	var rel: Vector3 = pl.global_position - global_position
	if not _open:
		var over: bool = absf(rel.x) < level.C * 0.45 and absf(rel.z) < level.C * 0.45 and rel.y > -0.2 and rel.y < 1.0
		if over or _t > 0.0:
			if _t == 0.0:
				LM.sound("rattle", global_position)
			_t += dt
			for lf in _leaves:                     # it shudders under them
				(lf[0] as Node3D).rotation.z = lf[1] * deg_to_rad(2.0) * sin(_t * 50.0)
			if _t >= warn:
				_give_way()
	else:
		_k = move_toward(_k, 1.0, dt * 5.0)
		var in_hole: bool = absf(rel.x) < level.C * 0.6 and absf(rel.z) < level.C * 0.6
		if _below:
			if in_hole and rel.y < -FALLEN and rel.y > -1.5:
				_owes = true
			elif _owes and rel.y < -level.H + 1.2:
				_owes = false
				pl.hurt(damage, {"type": "fall", "from": global_position})
		elif in_hole and rel.y < -FALLEN and rel.y > -1.5:
			_climb_out(pl)
		if not _below:
			for a in level.actors:
				var ar: Vector3 = a.global_position - global_position if is_instance_valid(a) else Vector3.ZERO
				if is_instance_valid(a) and not a.dead and ar.y < -FALLEN and ar.y > -1.5 and absf(ar.x) < level.C * 0.6 and absf(ar.z) < level.C * 0.6:
					a.hurt(100000.0, {"type": "fall", "from": global_position})
	for lf in _leaves:
		if _open:
			(lf[0] as Node3D).rotation.z = lf[1] * _k * deg_to_rad(88)


## Hurt by the fall, the player climbs out where they last stood clear of the hole.
func _climb_out(pl: Node3D) -> void:
	if damage > 0.0:
		pl.hurt(damage, {"type": "fall", "from": global_position})
	var to := global_position + Vector3(level.C, 0.1, 0)
	var trail: Array = (pl as Player).unstick.trail if pl is Player else []
	for i in range(trail.size() - 1, -1, -1):
		var p: Vector3 = trail[i]
		if absf(p.x - global_position.x) > level.C * 0.6 or absf(p.z - global_position.z) > level.C * 0.6:
			to = p
			break
	pl.global_position = to + Vector3(0, 0.1, 0)
	if pl is CharacterBody3D:
		(pl as CharacterBody3D).velocity = Vector3.ZERO
	Game.say("You climb out of the hole, bruised.", "warn")
