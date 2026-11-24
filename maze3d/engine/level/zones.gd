extends RefCounted
## LevelZones - parts of a level marked out as places apart (a danger zone: SPEC.md 4.13), from its "zones":
##   [{"id": "vault", "name": "Repossessed Property", "rects": [[x, y, w, h], ...], "level": 0, "light": 0.5,
##     "color": [1.0, 0.12, 0.06], "safe": "vault_clear"}]
## The map draws a zone's outline round the cells of it the player has seen, in its colour (calm green once its "safe"
## flag is set); its lights burn at "light" of their strength, tinted toward its colour (LevelLights); the triggers
## hear the player come into it ({"on": {"type": "zone", "name": id}}); a maker can be set to work only while the
## player is in it (Maker).
class_name LevelZones

const CALM := Color(0.3, 0.9, 0.45)

var list: Array = []
var _at: Dictionary = {}          # Vector3i(x, y, storey) -> the zone's id
var _by_id: Dictionary = {}


func _init(data: Dictionary) -> void:
	for z in data.get("zones", []):
		var id := str(z.get("id", ""))
		list.append(z)
		_by_id[id] = z
		var s := int(z.get("level", 0))
		for r in z.get("rects", []):
			for y in range(int(r[1]), int(r[1]) + int(r[3])):
				for x in range(int(r[0]), int(r[0]) + int(r[2])):
					_at[Vector3i(x, y, s)] = id


## The zone that cell (on that storey) is in, or "".
func at(x: int, y: int, s: int) -> String:
	return _at.get(Vector3i(x, y, s), "")


func zone(id: String) -> Dictionary:
	return _by_id.get(id, {})


## Its "safe" flag is set: what kept it dangerous is dead.
func is_safe(id: String) -> bool:
	var f: Variant = zone(id).get("safe")
	return f != null and Game.has_flag(str(f))


## The colour its outline is drawn in.
func color(id: String) -> Color:
	return CALM if is_safe(id) else LM.col(zone(id).get("color"), Color(1.0, 0.15, 0.08))


## How its lights burn: [strength, tint] (1 and white outside any zone).
func light(id: String) -> Array:
	var z := zone(id)
	if z.is_empty():
		return [1.0, Color.WHITE]
	return [float(z.get("light", 1.0)), LM.col(z.get("color"), Color.WHITE)]
