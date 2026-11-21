extends RefCounted
## SelfTestPart - one part of the self-test (tests/<feature>_test.gd, or a level's own <id>_test.gd beside its level
## file). It runs its checks in run(), and reaches the runner's level, player and helpers through these members, so a
## part reads like the one script it was cut from. A level's own test may say, in replaces_standard(), that it runs
## instead of the standard parts.
class_name SelfTestPart

var runner: SelfTest
var main: Node:
	get:
		return runner.main
var level: Level:                    # a part that restarts the level points the runner at the new one
	get:
		return runner.level
	set(v):
		runner.level = v
var pl: Player:
	get:
		return runner.pl
	set(v):
		runner.pl = v


func _init(r: SelfTest) -> void:
	runner = r


func run() -> void:
	pass


func replaces_standard() -> bool:
	return false


func get_tree() -> SceneTree:
	return runner.get_tree()


func say(ok: bool, what: String) -> void:
	runner.say(ok, what)


func frames(n: int) -> void:
	await runner.frames(n)


func look_at(target: Vector3) -> void:
	runner.look_at(target)


func storey(pos: Vector3) -> int:
	return runner.storey(pos)


func stand_near(target: Vector3, want := 5.0, tight := false) -> bool:
	return runner.stand_near(target, want, tight)


func thing(tag: String) -> Node3D:
	return runner.thing(tag)


func pick(n: Node, label: String) -> bool:
	return await runner.pick(n, label)


func take(kind: String) -> int:
	return await runner.take(kind)


func go(cellp: Vector2i, on_storey := 0) -> void:
	runner.go(cellp, on_storey)


func door(x: int, y: int, on_storey := 0) -> Door:
	return runner.door(x, y, on_storey)


func shut(d: Door) -> bool:
	return runner.shut(d)


func kinds(kind: String, on_storey := -99) -> Array:
	return runner.kinds(kind, on_storey)


## How the level now differs from what it remembered before (two Level.remember() records): "gone", what was gone and is
## back; "extra", what was made while playing and is missing or not where it was; "things", what remembers otherwise.
## A monster may have settled a little where it was laid (within half a metre; facing and health within 0.05), and a
## climber made again makes for the nearest wall to perch, as when it was placed (within a cell of where it was).
func memory_differs(before: Dictionary, after: Dictionary) -> Dictionary:
	var out := {"gone": [], "extra": [], "things": []}
	for k in before["gone"]:
		if level.thing(k) != null:
			out["gone"].append(k)
	for k in before["extra"]:
		var n: Node = level.thing(k)
		var at: Array = before["extra"][k]["at"]
		var off: Vector3 = (n as Node3D).global_position - Vector3(at[0], at[1], at[2]) if n != null else Vector3.INF
		var near := 0.5
		if n is Actor and (n as Actor).climb != null:
			off.y = 0.0
			near = level.C
		if n == null or off.length() > near:
			out["extra"].append(k)
	for k in before["things"]:
		var was: Dictionary = before["things"][k].duplicate()
		if before["extra"].has(k):                   # made again where it was: its spot is in its "extra" record, so
			was.erase("at")                          # it no longer reports having moved from it
			was.erase("yaw")
		if not _like(was, after["things"].get(k, {})):
			out["things"].append("%s %s -> %s" % [k, JSON.stringify(before["things"][k]), JSON.stringify(after["things"].get(k, {}))])
	return out


func _like(a: Dictionary, b: Dictionary) -> bool:
	for k in a:
		if not b.has(k):
			return false
		if k == "at":
			if Vector3(a[k][0], a[k][1], a[k][2]).distance_to(Vector3(b[k][0], b[k][1], b[k][2])) > 0.5:
				return false
		elif k == "yaw" or k == "hp":
			if absf(float(a[k]) - float(b[k])) > 0.05:
				return false
		elif JSON.stringify(a[k]) != JSON.stringify(b[k]):
			return false
	return true
