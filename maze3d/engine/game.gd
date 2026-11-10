extends Node
## Game - the state of one run: the player, the level being played, story flags, what's carried,
## and the effect runner that levels script themselves with.

signal flag_set(name: String)
signal toast(text: String, kind: String)
signal changed            # something the HUD shows changed
signal ended(info: Dictionary)

var player: Node3D = null
var level: Node3D = null
var hud: Node = null
var flags: Dictionary = {}
var keys: Dictionary = {}          # colour -> true
var credits := 0
var stats := {"kills": 0, "treasure": 0, "treasure_total": 0, "secrets": 0, "time": 0.0}
var playing := false
var over := false


func reset() -> void:
	flags.clear()
	keys.clear()
	credits = 0
	stats = {"kills": 0, "treasure": 0, "treasure_total": 0, "secrets": 0, "time": 0.0}
	over = false


func _process(dt: float) -> void:
	if playing and not over:
		stats["time"] += dt


func set_flag(name: String) -> void:
	if name == "" or flags.has(name):
		return
	flags[name] = true
	flag_set.emit(name)
	changed.emit()


func has_flag(f: Variant) -> bool:
	if f == null:
		return true
	if f is Array:
		for x in f:
			if flags.has(x):
				return true
		return false
	return flags.has(f)


func say(text: String, kind := "info") -> void:
	toast.emit(text, kind)


func give_key(color: String) -> void:
	keys[color] = true
	set_flag("key_" + color)
	changed.emit()


func add_credits(n: int) -> void:
	credits += n
	changed.emit()


## Run a list of effects. Each is { "type": ..., "delay": seconds, ... }. Levels, terminals,
## traps and pickups all speak this one small language (SPEC.md, "Effects").
func run_effects(list: Variant, ctx: Dictionary = {}) -> void:
	if list == null:
		return
	for ef in list:
		var d: float = ef.get("delay", 0.0)
		if d > 0.0:
			get_tree().create_timer(d, false).timeout.connect(_run.bind(ef, ctx))
		else:
			_run(ef, ctx)


func _run(ef: Dictionary, ctx: Dictionary) -> void:
	if level == null or not is_instance_valid(level):
		return
	match ef.get("type", ""):
		"message":
			say(ef.get("text", ""), ef.get("kind", "info"))
		"flag":
			set_flag(ef.get("name", ""))
		"sound":
			LM.sound(ef.get("id", ""))
		"credits":
			add_credits(int(ef.get("amount", 0)))
		"key":
			give_key(ef.get("color", "red"))
		"heal":
			if player:
				player.heal(ef.get("amount", 25))
		"hurt":
			if player:
				player.hurt(ef.get("amount", 10), {"type": ef.get("kind", "trap")})
		"quake":
			if player:
				player.shake(ef.get("strength", 0.5))
		"end":
			finish(ef)
		_:
			level.run_effect(ef, ctx)       # doors, lights, spawns: things the level owns


func finish(info: Dictionary) -> void:
	if over:
		return
	over = true
	ended.emit(info)
