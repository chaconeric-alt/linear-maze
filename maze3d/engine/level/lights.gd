extends RefCounted
## LevelLights - the lights a level is lit by, grouped by room (the "lights" effect switches a room's), and the ones
## that flicker, brown out or pulse while the level is played.
class_name LevelLights

var level: Node3D
var ld: LevelData
var by_room: Dictionary = {}     # room name -> [OmniLight3D]
var _flick: Array = []
var _t := 0.0


func _init(lv: Node3D, data: LevelData) -> void:
	level = lv
	ld = data


## A light from a spec ({"at": [x, y, z] in xf's space, "color", "energy", "range", "pulse"}), counted as room's.
func make(spec: Dictionary, xf: Transform3D, room: String, flicker := 0.0, shadows := false, scale := 1.0) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.light_color = LM.col(spec.get("color"), Color.WHITE)
	l.light_energy = spec.get("energy", 1.0) * scale
	l.omni_range = spec.get("range", 8.0)
	l.omni_attenuation = 1.0
	l.shadow_enabled = shadows
	l.shadow_bias = 0.08
	l.shadow_blur = 0.6                              # soft edges are dithered on screen: the wider the blur, the more they crawl as the view turns
	l.distance_fade_enabled = true
	l.distance_fade_begin = 38.0
	l.distance_fade_length = 10.0
	l.distance_fade_shadow = 22.0
	level.add_child(l)
	l.position = xf * LM.vec(spec.get("at"))
	var zc := ld.cell_of(l.position)
	var zl: Array = ld.zones.light(ld.zones.at(zc.x, zc.y, ld.floor_of(l.position)))     # a zone's lights burn low and red
	if zl[0] != 1.0:
		l.light_energy *= zl[0]
		l.light_color = l.light_color.lerp(zl[1], 0.6)
	if not by_room.has(room):
		by_room[room] = []
	by_room[room].append(l)
	l.set_meta("base", l.light_energy)
	if flicker > 0.0 and ld.rng.randf() < flicker:
		_flick.append({"l": l, "seed": ld.rng.randf() * 100.0, "mode": ld.rng.randi() % 2})
	elif spec.has("pulse"):
		_flick.append({"l": l, "seed": ld.rng.randf() * 100.0, "mode": 2, "amt": spec["pulse"]})
	return l


## Every room light still standing.
func all() -> Array:
	var out: Array = []
	for room in by_room:
		for l in by_room[room]:
			if is_instance_valid(l):
				out.append(l)
	return out


func tick(dt: float) -> void:
	_t += dt
	for f in _flick:
		var l: OmniLight3D = f["l"]
		if not is_instance_valid(l) or l.get_meta("off", false):
			continue
		var base: float = l.get_meta("base")
		match f["mode"]:
			0:      # a failing tube: mostly on, with stutters
				var n := fposmod(sin(floor(_t * 13.0 + f["seed"]) * 91.7) * 43758.5, 1.0)
				l.light_energy = base * (1.0 if n > 0.3 else n * 1.5)
			1:      # slow brown-out
				l.light_energy = base * (0.55 + 0.45 * sin(_t * 1.7 + f["seed"]) * sin(_t * 0.31 + f["seed"]))
			2:
				l.light_energy = base * (1.0 + f.get("amt", 0.3) * sin(_t * 2.4 + f["seed"]))
