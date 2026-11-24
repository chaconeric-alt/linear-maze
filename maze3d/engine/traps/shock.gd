extends TrapKind
## The shock floor: it charges up (its light grows) for the last second of each "period" (2.6 s), then discharges
## into whoever stands on it ("damage", 18). It cycles for ever, so its charge and discharge are heard only up close
## (Trap.near).
class_name TrapShock


func build(kit_id: String) -> void:
	trap.add_child(LM.spawn_model(kit_id, "trap_shock"))
	trap.light.light_color = Color(0.3, 0.8, 1.0)
	trap.light.position.y = 0.6


func tick(_dt: float, pl: Node3D, who: Array) -> void:
	var period: float = e.get("period", 2.6)
	var ph := fmod(trap.t, period)
	var warn: float = period - 0.95
	if ph > warn and ph < period - 0.25:
		trap.light.light_energy = (ph - warn) * 2.0
		if not on:
			on = true
			if trap.near(pl):                    # a floor that charges every few seconds is a siren if it carries: only up close
				LM.sound("shock_charge", trap.global_position, -8.0)
	elif ph >= period - 0.25:
		trap.light.light_energy = 6.0
		if on:
			on = false
			if trap.near(pl):
				LM.sound("zap", trap.global_position, -4.0)
			Fx.sparks(trap.level, trap.global_position + Vector3(0, 0.3, 0), Color(0.5, 0.9, 1.0), 24, 6.0)
			for v in who:
				if trap.here(v.global_position - trap.global_position) and trap.span(v, v.global_position).x + 0.05 < 0.4:
					v.hurt(e.get("damage", 18.0), {"type": "shock", "from": trap.global_position})
	else:
		trap.light.light_energy = 0.15


func danger(_who: Node3D, rel: Vector3, sp: Vector2, _room: float, lead: float) -> bool:
	var period: float = e.get("period", 2.6)
	var to_go: float = maxf(0.0, period - 0.25 - fmod(trap.t, period))
	return to_go <= lead and trap.here(rel, Trap.SPARE) and sp.x < 0.45
