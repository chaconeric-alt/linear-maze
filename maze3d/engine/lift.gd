class_name Lift
extends AnimatableBody3D
## A platform that goes up and down a shaft between floors.
##   {"lift": [-1, 0, 1], "at": [x, y], "home": 0, "color": [0.4, 1.0, 0.6], "speed": 3.2}
## The numbers are the storeys it stops at. The shaft is the cell at its lowest stop, made tall enough by the level; the
## floors above must have somewhere to step off beside it. Stand on it and it goes to its next stop (up, then back
## down); step off and on again to go further. Stand beside the shaft on another floor and it comes to you.
## It will not come down on top of the player. Monsters do not use it.
## "travel": {"level": "descent_2", "arrive": "lift", "way": "down", "text": "Down to Level 2."} makes it a lift out of
## the level: ridden past its last stop that way (or, with one stop, at all), it sinks (or rises) out of sight and the
## travel effect carries the expedition to that level, arriving at its way in "arrive" (SPEC.md 5.19). A player who
## arrives standing on a lift has to step off before it takes them anywhere.
## "lock": {"flag": "stand_down", "need": "the stand-down order"} holds it where it is (a list of flags: any one opens
## it): it neither takes a rider nor comes when called until the flag is set, and says what it needs once a step-on.

var level: Level
var stops: Array = []             # heights
var at := 0
var going := -1
var dir := 1
var speed := 3.2
var _half := 1.8
var _on_t := 0.0
var _wait := 0.0
var _armed := false               # the rider has to step off before it will take them (again, or at all on arriving)
var _travel: Dictionary = {}      # a lift out of the level: where it goes past its last stop
var _leaving := 0.0               # it is carrying the rider out of the level: seconds left (-1 once it has gone)
var _lock: Variant = null         # flag(s), any one of which lets it run; null once one is set
var _need := ""
var _told := false                # it has said what it needs to the rider standing on it now
var _light: OmniLight3D
var working := true               # the level's systems let it run (its entry's "needs"; LevelSystems)
var _needs: Dictionary = {}
var _dead_told := false


func setup(lv: Level, e: Dictionary, p: Vector2i) -> void:
	level = lv
	_needs = e["needs"] if e.get("needs") is Dictionary else {}
	var st: Array = (e["lift"] as Array).map(func(a): return int(a))
	st.sort()
	for s in st:
		stops.append(s * lv.H)
	at = maxi(0, st.find(int(e.get("home", st[0]))))
	speed = e.get("speed", 3.2)
	_travel = e.get("travel", {})
	var lk: Dictionary = e.get("lock", {})
	if not lk.is_empty():
		_lock = lk.get("flag")
		_need = str(lk.get("need", ""))
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
	var metal := _build_plate()
	_build_frame(col)
	_build_rails(lv, p, metal)


## The steel plate you stand on. Returns its material, which the guide rails share.
func _build_plate() -> StandardMaterial3D:
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
	return m


## A lit frame round the edge, in the lift's colour, and a light over it.
func _build_frame(col: Color) -> void:
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


## Guide rails up the corners of the shaft, from the lowest stop to the top of the highest. They belong to the level,
## not the lift, so they do not move with it.
func _build_rails(lv: Level, p: Vector2i, m: StandardMaterial3D) -> void:
	var posts := Node3D.new()
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
	if _leaving != 0.0:
		if _leaving > 0.0:
			_carry_out(dt)
		return
	var rel: Vector3 = pl.global_position - global_position
	var inside: bool = absf(rel.x) < _half and absf(rel.z) < _half
	var on: bool = inside and rel.y > -0.4 and rel.y < 1.6
	if _locked(on) or _dead(on):
		return
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
				if _out_that_way(dir):
					_depart()
					return
				dir = -dir
			_go(at + dir)


## The level's systems let it run, or not (LevelSystems). A lift moving when it stops stops where it is.
func set_working(on: bool) -> void:
	working = on


## Not working: it stays put, and says why once to whoever steps on.
func _dead(on: bool) -> bool:
	if working:
		_dead_told = false
		return false
	if on and not _dead_told:
		_dead_told = true
		LM.sound("denied", global_position)
		Game.say(level.systems.refusal(_needs), "warn")
	elif not on:
		_dead_told = false
	return true


## Is it held by its lock now (none of its flags set yet)?
func is_locked() -> bool:
	return _lock != null and not Game.has_flag(_lock)


## Held by its lock: true while none of its flags is set (it then says so, once, to whoever steps on). A lift that
## is moving when its lock is put on does not stop half way: a lock is only ever lifted in play.
func _locked(on: bool) -> bool:
	if _lock == null or going >= 0:
		return false
	if Game.has_flag(_lock):
		_lock = null
		return false
	if not on:
		_told = false
	elif not _told:
		_told = true
		LM.sound("denied", global_position)
		Game.say("Locked. It needs %s." % (_need if _need != "" else "authorisation"), "warn")
	return true


## Past its last stop going that way (`d`: -1 down, 1 up) it leaves the level, if it is a lift out of the level that
## goes that way. One with a single stop goes whichever way it goes.
func _out_that_way(d: int) -> bool:
	if _travel.is_empty():
		return false
	return stops.size() == 1 or str(_travel.get("way", "down")) == ("down" if d < 0 else "up")


## It sets off out of the level with the rider: a second of going, then the travel effect.
func _depart() -> void:
	_leaving = 1.0
	_armed = false
	LM.sound("servo", global_position)
	if _travel.has("text"):
		Game.say(str(_travel["text"]), "info")


func _carry_out(dt: float) -> void:
	var d := -1.0 if str(_travel.get("way", "down")) == "down" else 1.0
	global_position.y += d * speed * 0.5 * dt
	_leaving -= dt
	if _leaving <= 0.0:
		_leaving = -1.0                               # once: the level is let go at the end of the frame
		Game.run_effects([{"type": "travel", "level": str(_travel.get("level", "")), "arrive": str(_travel.get("arrive", ""))}])

