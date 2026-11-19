extends Node3D
## Rebuilder - a repair bay that puts back the robots you destroy.
##   {"rebuild": {"actors": ["custodian", "drone"], "every": 40, "max": 6, "off": "bay_off", "level": 2,
##                "text": "Fresh paint. The Repair Bay has been busy."}, "at": [x, y], "level": 2}
## While its `off` flag is not set, every `every` seconds it rebuilds one robot of a listed kind that has been destroyed on
## its own storey (`level`), at most `max` in all, and sends it out from where it stands. It does not work while you watch
## from closer than 7 m. Monsters do not use lifts, so what it rebuilds stays on its floor.
class_name Rebuilder

var level: Level
var e: Dictionary
var spec: Dictionary
var built := 0
var _t := 0.0
var _taken := 0


func setup(lv: Level, entry: Dictionary) -> void:
	level = lv
	e = entry
	spec = e["rebuild"]
	_t = float(spec.get("every", 40.0))


func waiting() -> Array:
	var out: Array = []
	var st := int(e.get("level", 0))
	for k in level.died:
		if spec.get("actors", []).has(k[0]) and int(k[1]) == st:
			out.append(k[0])
	return out.slice(_taken)


func _process(dt: float) -> void:
	if spec.has("off") and Game.has_flag(spec["off"]):
		return
	_t -= dt
	if _t > 0.0:
		return
	_t = float(spec.get("every", 40.0))
	var w := waiting()
	var pl := Game.player
	if w.is_empty() or built >= int(spec.get("max", 6)) or pl == null or not is_instance_valid(pl) or pl.dead:
		return
	if pl.global_position.distance_to(global_position) < 7.0:
		_t = 5.0
		return
	rebuild(w[0])


func rebuild(kind: String) -> Node3D:
	_taken += 1
	built += 1
	var a := level.spawn_thing({"actor": kind, "level": int(e.get("level", 0)), "tag": e.get("as", "rebuilt")}, level.cell_of(global_position))
	Fx.sparks(level, global_position + Vector3(0, 1.2, 0), Color(1.0, 0.8, 0.3), 20, 5.0)
	LM.sound("servo", global_position)
	if spec.has("text"):
		Game.say(spec["text"], "warn")
	return a
