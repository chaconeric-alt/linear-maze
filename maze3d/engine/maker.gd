class_name Maker
extends Node3D
## Maker - something that makes monsters while the level is played, as a danger zone's alarm does (Restock makes them
## again between visits; this makes more now):
##   {"maker": ["heavy", "plodder"], "at": [x, y], "every": 90, "zone": "vault", "when": "vault_open",
##    "off": "vault_clear", "max": 4, "model": "fabricator", "say": "The alarm calls up another collector."}
##   every  seconds from one to the next (90)
##   zone   it counts only while the player is in that zone (LevelZones); leaving it starts the count again
##   when   it starts once that flag is set (the zone's seal broken); off: that flag stops it for good
##   max    no more while that many of the ones it made are alive (4)
##   model  a kit model to show where it is (a fabricator, a nest); say: what the HUD says each time
## What it makes comes out on its cell (or a free one beside it) awake and hunting, the next of its list each time,
## round and round. Things made while playing are remembered as made (LevelMemory), so they are there on the way back.
## A "disable" effect on its tag stops it as its off flag does.

var level: Level
var e: Dictionary
var cell_pos: Vector2i
var storey := 0
var enabled := true
var made: Array = []              # what it has made (some may be dead by now)
var count := 0                    # how many it has made: the next is the next of its list
var _t := 0.0


func setup(lv: Level, entry: Dictionary, p: Vector2i, kit_id: String) -> void:
	level = lv
	e = entry
	cell_pos = p
	storey = int(e.get("level", 0))
	if e.has("model"):
		var m := LM.spawn_model(kit_id, str(e["model"]))
		add_child(m)
		m.rotation.y = lv.ld.face_yaw(e.get("face", "s"))
	if e.has("off") and Game.has_flag(str(e["off"])):
		enabled = false


## Switched off (its flag, an effect): the level's memory keeps it off.
func remember() -> Dictionary:
	return {} if enabled else {"off": true}


func recall(r: Dictionary) -> void:
	if r.get("off", false):
		enabled = false


func set_enabled(on: bool) -> void:
	enabled = on


## Is it making now: switched on, its flag set, not stopped, and the player where it counts?
func working() -> bool:
	if not enabled:
		return false
	if e.has("off") and Game.has_flag(str(e["off"])):
		enabled = false
		return false
	if e.has("when") and not Game.has_flag(str(e["when"])):
		return false
	var pl := Game.player
	if e.has("zone") and (pl == null or not is_instance_valid(pl) or level.zone_at(pl.global_position) != str(e["zone"])):
		return false
	return true


## How many of what it made are still alive.
func alive() -> int:
	return made.filter(func(a: Variant) -> bool: return is_instance_valid(a) and not a.dead).size()


func _process(dt: float) -> void:
	if not working():
		_t = 0.0
		return
	_t += dt
	if _t >= float(e.get("every", 90.0)):
		_t = 0.0
		make_one()


## Make the next one now (if there is room for it under "max"). The new one, or null.
func make_one() -> Actor:
	if alive() >= int(e.get("max", 4)):
		return null
	var list: Array = e["maker"] if e["maker"] is Array else [e["maker"]]
	if list.is_empty():
		return null
	var id := str(list[count % list.size()])
	count += 1
	var at := _free_cell()
	var a := level.spawn_thing({"actor": id, "at": [at.x, at.y], "alert": true, "level": storey}, at) as Actor
	if a == null:
		return null
	made.append(a)
	LM.sound("alarm", global_position)
	if e.has("say"):
		Game.say(str(e["say"]), "warn")
	Events.emit("maker.made", {"key": level.key_of(self), "actor": id})
	return a


## Its own cell if nothing stands on it, else the first open one beside it.
func _free_cell() -> Vector2i:
	for d in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var c: Vector2i = cell_pos + d
		if level.open_s(c.x, c.y, storey) and not _crowded(c):
			return c
	return cell_pos


func _crowded(c: Vector2i) -> bool:
	for a in made:
		if is_instance_valid(a) and not a.dead and level.cell_of(a.global_position) == c:
			return true
	return false
