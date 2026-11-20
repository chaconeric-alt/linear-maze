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
