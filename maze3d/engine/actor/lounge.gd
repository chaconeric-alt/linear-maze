extends Node
## ActorLounge - slacking off until caught (defs: "lounge").
## "lounge": [{"clip": "lean", "at": "wall"}, {"clip": "sit", "at": "floor", "drop": -0.6}, {"clip": "smoke", "at": "wall", "smoke": true}]
## One is picked when the level is built (or the level names one: {"actor": "monoid", "lounge": "sit"}).
## "at": "wall" backs it up against a wall of its cell ("look": "in" puts its nose to it); "at": "screen" finds
## something with a screen to watch ("reach", "stand", "props"). "drop" moves what can be shot to where the body now is.
## "says": [..] it mutters while you are near; "smoke": true, "every": 6 it puffs. Caught (alert), it is startled.
class_name ActorLounge

var a: Actor
var d: Dictionary
var current: Dictionary = {}      # the lounge it is in, or {}
var _puff_t := 2.0


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


func active() -> bool:
	return not current.is_empty()


func clip() -> String:
	return current.get("clip", "idle")


## Stop lounging (dead, or sent off to do something).
func end() -> void:
	current = {}


## Up off the wall or the floor, to go and do something.
func get_up() -> void:
	current = {}
	a.cs.position.y = d.get("center", d.get("height", 1.6) / 2)


## Back to the lounge it had, where it had it (off duty, home from the range).
func resume(lg: Dictionary) -> void:
	current = lg
	a.cs.position.y = d.get("center", d.get("height", 1.6) / 2) + current.get("drop", 0.0)


func start() -> void:
	var want: String = a.e.get("lounge", "")
	var c := a.level.cell_of(a.position)
	var walls := a.move.walls_at(c)
	var pool: Array = []
	for o in d["lounge"]:
		if want != "" and o.get("clip", "") != want:
			continue
		if o.get("at", "floor") == "wall" and walls.is_empty():
			continue
		pool.append(o)
	if pool.is_empty():
		return
	current = pool[randi() % pool.size()]
	if current.get("at", "floor") == "screen" and not _find_screen(pool):
		return
	if current.get("at", "floor") == "wall":
		var dv: Vector3 = walls[randi() % walls.size()]
		if a.e.has("face"):                            # the level can say which wall
			var f: Vector3 = Vector3(Level.DIRS[Level.DIR_NAMES.get(a.e["face"], 0)].x, 0, Level.DIRS[Level.DIR_NAMES.get(a.e["face"], 0)].y)
			if walls.has(-f):
				dv = -f
		a.position = a.level.center(c, a.position.y) + dv * (a.level.C / 2 - d.get("radius", 0.5) - current.get("gap", 0.25))
		a.rotation.y = atan2(-dv.x, -dv.z)             # back to the wall
		if current.get("look", "out") == "in":       # or nose to it
			a.rotation.y = atan2(dv.x, dv.z)
	a.home = a.position
	a.cs.position.y += current.get("drop", 0.0)
	_puff_t = randf_range(1.0, 5.0)
	a.play("idle")


## Something with a screen to stand in front of; nothing on: stare at a wall instead, or give up (false).
func _find_screen(pool: Array) -> bool:
	var best: Node3D = null
	var best_d: float = current.get("reach", 14.0)
	for n in a.level.get_children():
		if not (n is Node3D) or not ("meta" in n) or not ("e" in n):
			continue
		var pid: String = n.e.get("prop", "")
		if not (n.meta.has("screen") or pid in current.get("props", [])):
			continue
		var dd: float = n.position.distance_to(a.position)
		var spot: Vector3 = n.position + n.global_transform.basis.z * current.get("stand", 2.2)
		var sc := a.level.cell_of(spot)
		if dd < best_d and not a.level.air(sc.x, sc.y, a.move.storey())["solid"] and a.level.air(sc.x, sc.y, a.move.storey())["door"] == "":
			best = n
			best_d = dd
	if best == null:
		var others: Array = pool.filter(func(o): return o.get("at", "floor") != "screen")
		if others.is_empty():
			current = {}
			return false
		current = others[randi() % others.size()]
		return true
	var f: Vector3 = best.global_transform.basis.z
	a.position = best.position + f * current.get("stand", 2.2)
	a.position.y = best.position.y
	a.rotation.y = atan2(-f.x, -f.z)
	return true


## Lounging: its clip, its mutterings while you are near, its smoke.
func tick(dt: float) -> void:
	a.play("idle")
	if current.has("says") and Game.player and a.global_position.distance_to(Game.player.global_position) < 16.0:
		a.bark_t -= dt
		if a.bark_t <= 0.0:
			a.bark_t = randf_range(5.0, 10.0)
			var sy: Array = current["says"]
			Fx.words(a.level, a.eye() + Vector3(0, 0.6, 0), sy[randi() % sy.size()], LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
	if current.get("smoke", false):
		_puff_t -= dt
		if _puff_t <= 0.0:
			_puff_t = current.get("every", 6.0)
			Fx.sparks(a.level, a.eye() + a.global_transform.basis.z * 0.5, Color(0.7, 0.7, 0.72), 7, 0.5, 2.2, 0.07, -0.5)


## Caught slacking: it jumps, and is awake.
func caught() -> void:
	current = {}
	a.stun = d.get("startle_time", 0.55)
	a.cs.position.y = d.get("center", d.get("height", 1.6) / 2)
	a.awake = true
	if not a.play("startle"):
		a.play("hurt")
	if a.anim:
		a.anim.seek(0.0)
	if d.has("startle_text"):
		Fx.words(a.level, a.eye() + Vector3(0, 0.6, 0), d["startle_text"], LM.col(d.get("bark_color"), Color(1.0, 0.4, 0.3)))
