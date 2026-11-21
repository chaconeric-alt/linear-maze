extends Node3D
## Trap - hazards built into a cell: laser, shock, vent and darts.
## Every one can be switched off by a story flag ("off": a flag, or a list of them) or a "disable" effect on its tag.
## It hurts whatever is in it, the player, monsters and robots alike, except those it is told to spare: "ignore":
## "robots", "monsters" (living things), "player", or a list of them. A tripwire is tripped by the player only.
## Flyers and wall-climbers ask danger() before they move, and keep out (ActorWary); walkers do not see it coming.
##   laser  "trip": true makes it a tripwire: it does not burn, it runs its "effects" once and goes out.
##   darts  a pressure plate between two walls with dart ports in them. Step on it and, after "delay" (0.3 s), "volleys" (2)
##          cross the cell "interval" (0.3 s) apart, "damage" (9) each to anyone still on the plate. "cooldown" (2.5 s).
class_name Trap

var level: Level
var e: Dictionary
var kind := ""
var enabled := true
var cell_pos: Vector2i
var _t := 0.0
var _cool := 0.0
var _beams: Array = []
var _along_x := true
var _light: OmniLight3D
var _parts: CPUParticles3D
var _on := false
var _storey := 0
var _plate: Node3D
var _volleys := 0
var _next := 0.0
const SPARE := 0.2                # metres beyond where it burns that danger() still counts as in it
var ignore: Array = []            # who it spares: "player", "robots", "monsters"
var _next_hit: Dictionary = {}    # instance id -> the time (_t) it may burn that one again: a beam or gas burns every
                                  # half second or so, not every frame


func setup(lv: Level, entry: Dictionary, p: Vector2i, kit_id: String) -> void:
	level = lv
	e = entry
	cell_pos = p
	kind = e["trap"]
	_storey = int(e.get("level", 0))
	_t = e.get("phase", 0.0)
	var ig: Variant = e.get("ignore", [])
	ignore = ig if ig is Array else [ig]
	_light = OmniLight3D.new()
	_light.omni_range = 5.0
	_light.light_energy = 0.0
	add_child(_light)
	match kind:
		"laser":
			_build_laser(lv, p, kit_id)
		"darts":
			_build_darts(lv, p, kit_id)
		"shock":
			_build_shock(kit_id)
		"vent":
			_build_vent(kit_id)
	var offs: Array = e["off"] if e.get("off") is Array else ([e["off"]] if e.has("off") else [])
	for f in offs:
		if Game.has_flag(f):
			set_enabled(false)
	Game.flag_set.connect(func(n): if offs.has(n): set_enabled(false))


## Emitters on the walls either side at each of "heights", and a beam across between each pair.
func _build_laser(lv: Level, p: Vector2i, kit_id: String) -> void:
	_along_x = _wall(lv, p.x - 1, p.y) and _wall(lv, p.x + 1, p.y)
	if e.has("axis"):
		_along_x = e["axis"] == "x"
	rotation.y = 0.0 if _along_x else PI / 2
	var mat := Fx.glow_mat(Color(1.0, 0.1, 0.05), 4.0).duplicate()
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED
	for hgt in e.get("heights", [0.5, 1.15, 1.8]):
		for s in [-1.0, 1.0]:
			var em := LM.spawn_model(kit_id, "trap_laser")
			add_child(em)
			em.position = Vector3(s * lv.C / 2, hgt, 0)
			em.rotation.y = -s * PI / 2
		var mi := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.018
		cm.bottom_radius = 0.018
		cm.height = lv.C - 0.4
		cm.radial_segments = 6
		cm.material = mat
		mi.mesh = cm
		mi.rotation.z = PI / 2
		mi.position.y = hgt
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(mi)
		_beams.append(mi)
	_light.light_color = Color(1.0, 0.1, 0.05)
	_light.position.y = 1.2


## A plate in the floor, and dart ports in the walls either side (not where a side is a door or a window).
func _build_darts(lv: Level, p: Vector2i, kit_id: String) -> void:
	_along_x = _wall(lv, p.x - 1, p.y) and _wall(lv, p.x + 1, p.y)
	if e.has("axis"):
		_along_x = e["axis"] == "x"
	rotation.y = 0.0 if _along_x else PI / 2
	_plate = LM.spawn_model(kit_id, "trap_plate")
	add_child(_plate)
	for zz in [-1.1, 0.0, 1.1]:
		for s in [-1.0, 1.0]:
			var side: Vector3 = Vector3(s, 0, 0).rotated(Vector3.UP, rotation.y)
			var sc: Dictionary = lv.air(p.x + roundi(side.x), p.y + roundi(side.z), _storey)
			if not sc["solid"] or sc.get("door", "") != "" or sc.get("window", "") != "":
				continue                             # a door or a window on that side: no wall there to put a port in
			var port := LM.spawn_model(kit_id, "trap_dart")
			add_child(port)
			port.position = Vector3(s * lv.C / 2, 1.25, zz)
			port.rotation.y = -s * PI / 2
	_light.light_color = Color(1.0, 0.8, 0.2)
	_light.position.y = 1.2


func _build_shock(kit_id: String) -> void:
	add_child(LM.spawn_model(kit_id, "trap_shock"))
	_light.light_color = Color(0.3, 0.8, 1.0)
	_light.position.y = 0.6


## A grille, and the gas it breathes out: particles in "color".
func _build_vent(kit_id: String) -> void:
	add_child(LM.spawn_model(kit_id, "trap_vent"))
	var c := LM.col(e.get("color"), Color(0.4, 1.0, 0.25))
	_light.light_color = c
	_light.position.y = 1.0
	_parts = CPUParticles3D.new()
	_parts.amount = 40
	_parts.lifetime = 0.9
	_parts.direction = Vector3.UP
	_parts.spread = 14.0
	_parts.initial_velocity_min = 3.0
	_parts.initial_velocity_max = 5.0
	_parts.gravity = Vector3(0, 1.0, 0)
	_parts.scale_amount_min = 1.0
	_parts.scale_amount_max = 3.0
	var q := QuadMesh.new()
	q.size = Vector2(0.35, 0.35)
	var m := Fx.glow_mat(c, 0.35)
	q.material = m
	_parts.mesh = q
	_parts.emitting = false
	_parts.position.y = 0.15
	add_child(_parts)


## Switched off (by a flag or an effect): the level's memory keeps it off (LevelMemory).
func remember() -> Dictionary:
	return {} if enabled else {"off": true}


func recall(r: Dictionary) -> void:
	if r.get("off", false):
		set_enabled(false)


func set_enabled(on: bool) -> void:
	enabled = on
	if not on:
		_on = false
		_light.light_energy = 0.0
		for b in _beams:
			b.visible = false
		if _parts:
			_parts.emitting = false


func _process(dt: float) -> void:
	if not enabled:
		return
	_t += dt
	_cool -= dt
	var pl := Game.player
	if pl == null or not is_instance_valid(pl):
		return
	var who := _victims(pl)
	match kind:
		"laser":
			_tick_laser(pl, who)
		"darts":
			_tick_darts(dt, who)
		"shock":
			_tick_shock(pl, who)
		"vent":
			_tick_vent(who)


## Does it hurt this one at all? Robots and living things are told apart by the actor def's "robot".
func hurts(who: Node3D) -> bool:
	if who is Actor:
		return not ignore.has("robots" if (who as Actor).is_robot() else "monsters")
	return not ignore.has("player")


## Everyone close enough to be in it this frame, on its own storey (a trap works on its own floor only): the player
## and every live actor within a cell of it that it does not spare.
func _victims(pl: Node3D) -> Array:
	var out: Array = []
	if hurts(pl) and _on_storey(pl, pl.global_position):
		out.append(pl)
	for ac in level.actors:
		if not is_instance_valid(ac) or ac.dead:
			continue
		var rel: Vector3 = ac.global_position - global_position
		if absf(rel.x) < level.C and absf(rel.z) < level.C and hurts(ac) and _on_storey(ac, ac.global_position):
			out.append(ac)
	return out


func _on_storey(who: Node3D, at: Vector3) -> bool:
	var sp := _span(who, at)
	return sp.x >= -0.65 and sp.x <= level.H - 0.85


## The bottom and top of a body, in metres above this trap, if its origin were at `at`: the player's from its feet,
## an actor's from its collision capsule as it lies now (a flyer's rides well above its origin; one on a wall lies on
## its side). `upright`: as it would stand on the floor (a climber asking where it would land).
func _span(who: Node3D, at: Vector3, upright := false) -> Vector2:
	var base: float = at.y - global_position.y
	if not (who is Actor):
		return Vector2(base - 0.05, base + 1.8)
	var ac := who as Actor
	var cap := ac.cs.shape as CapsuleShape3D
	if upright or cap == null:
		return Vector2(base, base + float(ac.d.get("height", 1.6)))
	var mid: float = ac.cs.global_position.y - ac.global_position.y + base
	var half: float = absf(ac.cs.global_basis.y.y) * (cap.height / 2.0 - cap.radius) + cap.radius
	return Vector2(mid - half, mid + half)


## How far across a beam a body reaches: the player's 0.45 m, an actor's radius.
func _reach(who: Node3D) -> float:
	return float((who as Actor).d.get("radius", 0.5)) + 0.05 if who is Actor else 0.45


## In its cell (or within `margin` metres of it).
func _here(rel: Vector3, margin := 0.0) -> bool:
	return absf(rel.x) < level.C / 2 + margin and absf(rel.z) < level.C / 2 + margin


## May it burn this one now? Then not again for `gap` seconds.
func _due(who: Node3D, gap: float) -> bool:
	var id := who.get_instance_id()
	if _t < float(_next_hit.get(id, -1.0)):
		return false
	_next_hit[id] = _t + gap
	return true


## On for cycle[0] seconds and off for cycle[1]; a beam within a body's height burns it (or, as a tripwire, tells).
func _tick_laser(pl: Node3D, who: Array) -> void:
	_on = _laser_on(0.0)
	for b in _beams:
		b.visible = _on
	_light.light_energy = 0.8 if _on else 0.0
	if not _on:
		return
	for v in who:
		var rel: Vector3 = v.global_position - global_position
		var across: float = rel.z if _along_x else rel.x
		if not _here(rel) or absf(across) >= _reach(v) or not _beam_in(_span(v, v.global_position)):
			continue
		if e.get("trip", false):
			if v == pl:                                # a tripwire: it tells somebody, once
				LM.sound("alarm", global_position)
				Game.run_effects(e.get("effects"))
				set_enabled(false)
				return
			continue
		if not _due(v, 0.5):
			continue
		var at_h := _beam_at(_span(v, v.global_position))
		v.hurt(e.get("damage", 14.0), {"type": "laser", "from": global_position})
		LM.sound("zap", global_position)
		Fx.sparks(level, Vector3(v.global_position.x, global_position.y + at_h, v.global_position.z), Color(1, 0.3, 0.1), 8)
		if v == pl:
			Game.run_effects(e.get("effects"))


## Is any beam within that span (bottom, top)?
func _beam_in(sp: Vector2) -> bool:
	return _beam_at(sp) >= 0.0


## The height of the first beam within that span, or -1.
func _beam_at(sp: Vector2) -> float:
	for b in _beams:
		if b.position.y > sp.x and b.position.y < sp.y:
			return b.position.y
	return -1.0


## Is the laser on now, or will it come on within `lead` seconds?
func _laser_on(lead: float) -> bool:
	var cyc: Array = e.get("cycle", [])      # [seconds on, seconds off]; none = always on
	if cyc.is_empty():
		return true
	var ph := fmod(_t, cyc[0] + cyc[1])
	return ph < cyc[0] or cyc[0] + cyc[1] - ph <= lead


## Stepped on: after "delay", "volleys" of darts "interval" apart, then "cooldown". Anything on the plate presses it.
func _tick_darts(dt: float, who: Array) -> void:
	var on_plate: Array = who.filter(func(v): return _here(v.global_position - global_position) and absf(_span(v, v.global_position).x + 0.05) < 0.5)
	if _plate:
		_plate.position.y = lerpf(_plate.position.y, -0.022 if not on_plate.is_empty() else 0.0, 0.3)
	_light.light_energy = maxf(0.0, _light.light_energy - dt * 4.0)
	if not on_plate.is_empty() and _cool <= 0.0 and _volleys == 0:
		_cool = e.get("cooldown", 2.5)
		_volleys = int(e.get("volleys", 2))
		_next = e.get("delay", 0.3)
		LM.sound("click", global_position)
	if _volleys > 0:
		_next -= dt
		if _next <= 0.0:
			_volleys -= 1
			_next = e.get("interval", 0.3)
			LM.sound("swing", global_position)
			_light.light_energy = 1.5
			for zz in [-1.1, 0.0, 1.1]:
				Fx.tracer(level, to_global(Vector3(-level.C / 2 + 0.1, 1.25, zz)), to_global(Vector3(level.C / 2 - 0.1, 1.25, zz)), Color(1.0, 0.85, 0.3))
			for v in on_plate:
				v.hurt(e.get("damage", 9.0), {"type": "trap", "from": global_position})
				Fx.sparks(level, v.global_position + Vector3(0, 1.2, 0), Color(1.0, 0.85, 0.3), 6)


## Charges up (the light grows) for the last second of each "period", then discharges into whoever stands on it.
func _tick_shock(pl: Node3D, who: Array) -> void:
	var period: float = e.get("period", 2.6)
	var ph := fmod(_t, period)
	var warn: float = period - 0.95
	if ph > warn and ph < period - 0.25:
		_light.light_energy = (ph - warn) * 2.0
		if not _on:
			_on = true
			if _near(pl):                    # a floor that charges every few seconds is a siren if it carries: only up close
				LM.sound("shock_charge", global_position, -8.0)
	elif ph >= period - 0.25:
		_light.light_energy = 6.0
		if _on:
			_on = false
			if _near(pl):
				LM.sound("zap", global_position, -4.0)
			Fx.sparks(level, global_position + Vector3(0, 0.3, 0), Color(0.5, 0.9, 1.0), 24, 6.0)
			for v in who:
				if _here(v.global_position - global_position) and _span(v, v.global_position).x + 0.05 < 0.4:
					v.hurt(e.get("damage", 18.0), {"type": "shock", "from": global_position})
	else:
		_light.light_energy = 0.15


## Breathes gas for "on" seconds of every "period"; it burns within 1.3 m, up to 3 m high.
func _tick_vent(who: Array) -> void:
	_on = _vent_on(0.0)
	_parts.emitting = _on
	_light.light_energy = 1.2 if _on else 0.1
	if not _on:
		return
	for v in who:
		var rel: Vector3 = v.global_position - global_position
		if Vector2(rel.x, rel.z).length() < 1.3 and _span(v, v.global_position).x + 0.05 < 3.0 and _due(v, 0.4):
			v.hurt(e.get("damage", 7.0), {"type": "toxic", "from": global_position})


## Is the vent breathing now, or will it start within `lead` seconds?
func _vent_on(lead: float) -> bool:
	var period2: float = e.get("period", 4.0)
	var on_for: float = e.get("on", 1.6)
	var ph := fmod(_t, period2)
	return ph < on_for or period2 - ph <= lead


## Would it hurt `who` if its origin were at `at`, now or within `lead` seconds? What flyers and climbers ask before
## they move (ActorWary). `upright`: as it would stand there on its feet (a climber asking where it would land).
func danger(who: Node3D, at: Vector3, lead := 0.0, upright := false) -> bool:
	if not enabled or not hurts(who) or (kind == "laser" and e.get("trip", false)):
		return false
	var rel := at - global_position
	var sp := _span(who, at, upright)
	if sp.x < -0.65 or sp.x > level.H - 0.85:
		return false
	var room := _reach(who) + SPARE
	match kind:
		"laser":
			var across: float = rel.z if _along_x else rel.x
			return _laser_on(lead) and _here(rel, SPARE) and absf(across) < room and _beam_in(Vector2(sp.x - 0.1, sp.y + 0.1))
		"vent":
			return _vent_on(lead) and Vector2(rel.x, rel.z).length() < 1.3 + room and sp.x < 3.05
		"shock":
			var period: float = e.get("period", 2.6)
			var to_go: float = maxf(0.0, period - 0.25 - fmod(_t, period))
			return to_go <= lead and _here(rel, SPARE) and sp.x < 0.45
		"darts":
			return _here(rel, SPARE) and absf(sp.x + 0.05) < 0.6
	return false


## Traps that cycle for ever (the shock floor) are heard only from close by, on their own storey: "hear" metres (12), or "quiet": true for never.
func _near(pl: Node3D) -> bool:
	if e.get("quiet", false) or pl == null or not is_instance_valid(pl):
		return false
	return pl.global_position.distance_to(global_position) < float(e.get("hear", 12.0)) and level.floor_of(pl.global_position) == level.floor_of(global_position)


## Is that cell, on this trap's storey, something to fix an emitter to?
func _wall(lv: Level, x: int, y: int) -> bool:
	return lv.air(x, y, _storey)["solid"]
