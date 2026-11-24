extends TrapKind
## Darts: a pressure plate between two walls with dart ports in them (the kit models trap_plate and trap_dart; no port
## where a side is a door or a window). Step on it and, after "delay" (0.3 s), "volleys" (2) cross the cell "interval"
## (0.3 s) apart, "damage" (9) each to anyone still on the plate. "cooldown" (2.5 s). Anything on the plate presses it.
class_name TrapDarts

var along_x := true
var _plate: Node3D
var _volleys := 0
var _next := 0.0


func build(kit_id: String) -> void:
	var lv := trap.level
	var p := trap.cell_pos
	along_x = trap.solid_at(p.x - 1, p.y) and trap.solid_at(p.x + 1, p.y)
	if e.has("axis"):
		along_x = e["axis"] == "x"
	trap.rotation.y = 0.0 if along_x else PI / 2
	_plate = LM.spawn_model(kit_id, "trap_plate")
	trap.add_child(_plate)
	for zz in [-1.1, 0.0, 1.1]:
		for s in [-1.0, 1.0]:
			var side: Vector3 = Vector3(s, 0, 0).rotated(Vector3.UP, trap.rotation.y)
			var sc: Dictionary = lv.air(p.x + roundi(side.x), p.y + roundi(side.z), trap.storey)
			if not sc["solid"] or sc.get("door", "") != "" or sc.get("window", "") != "":
				continue                             # a door or a window on that side: no wall there to put a port in
			var port := LM.spawn_model(kit_id, "trap_dart")
			trap.add_child(port)
			port.position = Vector3(s * lv.C / 2, 1.25, zz)
			port.rotation.y = -s * PI / 2
	trap.light.light_color = Color(1.0, 0.8, 0.2)
	trap.light.position.y = 1.2


## Stepped on: after "delay", "volleys" of darts "interval" apart, then "cooldown".
func tick(dt: float, _pl: Node3D, who: Array) -> void:
	var on_plate: Array = who.filter(func(v): return trap.here(v.global_position - trap.global_position) and absf(trap.span(v, v.global_position).x + 0.05) < 0.5)
	if _plate:
		_plate.position.y = lerpf(_plate.position.y, -0.022 if not on_plate.is_empty() else 0.0, 0.3)
	trap.light.light_energy = maxf(0.0, trap.light.light_energy - dt * 4.0)
	if not on_plate.is_empty() and trap.cool <= 0.0 and _volleys == 0:
		trap.cool = e.get("cooldown", 2.5)
		_volleys = int(e.get("volleys", 2))
		_next = e.get("delay", 0.3)
		LM.sound("click", trap.global_position)
	if _volleys > 0:
		_next -= dt
		if _next <= 0.0:
			_volleys -= 1
			_next = e.get("interval", 0.3)
			LM.sound("swing", trap.global_position)
			trap.light.light_energy = 1.5
			var lv := trap.level
			for zz in [-1.1, 0.0, 1.1]:
				Fx.tracer(lv, trap.to_global(Vector3(-lv.C / 2 + 0.1, 1.25, zz)), trap.to_global(Vector3(lv.C / 2 - 0.1, 1.25, zz)), Color(1.0, 0.85, 0.3))
			for v in on_plate:
				v.hurt(e.get("damage", 9.0), {"type": "trap", "from": trap.global_position})
				Fx.sparks(lv, v.global_position + Vector3(0, 1.2, 0), Color(1.0, 0.85, 0.3), 6)


func danger(_who: Node3D, rel: Vector3, sp: Vector2, _room: float, _lead: float) -> bool:
	return trap.here(rel, Trap.SPARE) and absf(sp.x + 0.05) < 0.6
