extends Node
## Game - the state of one run: the player, the level being played, story flags, what's carried,
## and the effect runner that levels script themselves with. What lasts is kept in State, and Game reads and writes it
## there: the run's credits, haul and stats (State.run()); the level's flags and key cards (its memory); flags named
## "world:..." (the world's).

signal flag_set(name: String)
signal toast(text: String, kind: String)
signal identified(title: String, detail: String)      # easy mode: E named what the player is looking at
signal changed            # something the HUD shows changed
signal ended(info: Dictionary)

var easy := false            # easy mode: the player's weapons hit harder and the player takes less (game.json "easy"; title screen, or --easy)
var calm := false            # --calm: nothing notices the player (for looking at things)
var player: Node3D = null
var level: Node3D = null
var hud: Node = null
var flags: Dictionary:             # the level's own flags (has_flag and set_flag also see "world:" flags, kept by the world)
	get:
		return State.memory()["flags"]
var keys: Dictionary:              # colour -> true: key cards, which belong to the level they were found in
	get:
		return State.keys()
var credits: int:
	get:
		return int(State.run()["credits"])
	set(v):
		State.run()["credits"] = v
var haul: Dictionary:              # item id -> how many picked up on this expedition (banked in the bunker if you get out: Profile)
	get:
		return State.run()["haul"]
var stats: Dictionary:             # kills, treasure, treasure_total, secrets, time
	get:
		return State.run()["stats"]
var playing := false
var over := false
var effects := EffectRegistry.new()     # effect type -> handler: the one place that says what each effect does
var _prop_uses := PropUses.new()        # held here: the registry's handlers do not keep their owners alive
var _gates := OptionGates.new()
var interaction := Interaction.new()    # the rules of panels, and what has been used (engine/interaction.gd)


func _init() -> void:
	_register_effects()


## Easy mode is remembered between sessions (user://maze3d.cfg).
func load_settings() -> void:
	var cf := ConfigFile.new()
	if cf.load("user://maze3d.cfg") == OK:
		easy = cf.get_value("play", "easy", false)


func set_easy(on: bool) -> void:
	easy = on
	var cf := ConfigFile.new()
	cf.load("user://maze3d.cfg")
	cf.set_value("play", "easy", on)
	cf.save("user://maze3d.cfg")
	changed.emit()


## What the player's weapons deal, and what the player takes, are multiplied by these.
func deal_scale() -> float:
	return float(LM.game.get("easy", {}).get("deal", 3.0)) if easy else 1.0


func take_scale() -> float:
	return 1.0 / maxf(0.01, float(LM.game.get("easy", {}).get("take", 3.0))) if easy else 1.0


func reset() -> void:
	State.reset_run()                 # (the level's flags and keys start afresh as Main enters it: State.enter_level)
	over = false
	interaction.reset()


func _process(dt: float) -> void:
	if playing and not over:
		stats["time"] += dt


func set_flag(name: String) -> void:
	if name == "" or not State.set_flag(name):
		return
	flag_set.emit(name)
	Events.emit("flag.set", {"name": name, "scope": "world" if name.begins_with("world:") else "level"})
	changed.emit()


## The chance a hack comes off: "hacking" in game.json ({"base": 0.10, "per_level": 0.05}) and the character's level
## ("player": {"level": 1}); a hard job takes `hard` off it (0.05 = five points). Skill and equipment will add to this later.
func hack_chance(hard := 0.0) -> float:
	var h: Dictionary = LM.game.get("hacking", {})
	var lv: int = int(LM.game.get("player", {}).get("level", 1))
	return clampf(float(h.get("base", 0.10)) + float(h.get("per_level", 0.05)) * lv - hard, 0.01, 0.95)


func has_flag(f: Variant) -> bool:
	if f == null:
		return true
	if f is Array:
		for x in f:
			if State.has_flag(str(x)):
				return true
		return false
	return State.has_flag(str(f))


func say(text: String, kind := "info") -> void:
	toast.emit(text, kind)


func give_key(color: String) -> void:
	keys[color] = true
	set_flag("key_" + color)
	changed.emit()


func add_credits(n: int) -> void:
	credits += n
	Events.emit("credits.changed", {"amount": n, "total": credits})
	changed.emit()


## Run a list of effects. Each is { "type": ..., "delay": seconds, ... }. Levels, terminals,
## traps and pickups all speak this one small language (SPEC.md, "Effects"); what each type does is
## in the EffectRegistry (`effects`), where Game, the Level, props and panels register their handlers.
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
	effects.run(ef, ctx)


# ------------------------------------------------------------------ the run's own effects
func _register_effects() -> void:
	effects.register("message", func(ef: Dictionary, _c: Dictionary) -> void: say(ef.get("text", ""), ef.get("kind", "info")))
	effects.register("flag", func(ef: Dictionary, _c: Dictionary) -> void: set_flag(ef.get("name", "")))
	effects.register("sound", func(ef: Dictionary, _c: Dictionary) -> void: LM.sound(ef.get("id", "")))
	effects.register("credits", func(ef: Dictionary, _c: Dictionary) -> void: add_credits(int(ef.get("amount", 0))))
	effects.register("key", func(ef: Dictionary, _c: Dictionary) -> void: give_key(ef.get("color", "red")))
	effects.register("heal", _fx_heal)
	effects.register("ammo", _fx_ammo)
	effects.register("explode", _fx_explode)
	effects.register("hurt", _fx_hurt)
	effects.register("quake", _fx_quake)
	effects.register("chance", _fx_chance)
	effects.register("end", func(ef: Dictionary, _c: Dictionary) -> void: finish(ef))
	_prop_uses.register(effects)
	_gates.register(effects)


func _fx_heal(ef: Dictionary, _ctx: Dictionary) -> void:
	if player:
		player.heal(ef.get("amount", 25))


## amount is a share of a full load (0.5 = half), for every kind carried
func _fx_ammo(ef: Dictionary, _ctx: Dictionary) -> void:
	if player:
		for k in LM.defs.get("ammo", {}):
			player.add_ammo(k, int(ceil(LM.defs["ammo"][k].get("max", 20) * ef.get("amount", 0.5))))


func _fx_explode(ef: Dictionary, ctx: Dictionary) -> void:
	var at: Vector3 = ctx.get("at", player.global_position if player else Vector3.ZERO)
	Fx.explode(level, at + Vector3(0, 0.8, 0), ef.get("radius", 4.0), ef.get("damage", 40.0), LM.col(ef.get("color"), Color(1.0, 0.5, 0.12)))


func _fx_hurt(ef: Dictionary, _ctx: Dictionary) -> void:
	if player:
		player.hurt(ef.get("amount", 10), {"type": ef.get("kind", "trap")})


func _fx_quake(ef: Dictionary, _ctx: Dictionary) -> void:
	if player:
		player.shake(ef.get("strength", 0.5))


## {"p": 0.5, "do": [effects]}: sometimes
func _fx_chance(ef: Dictionary, ctx: Dictionary) -> void:
	if randf() < float(ef.get("p", 0.5)):
		run_effects(ef.get("do"), ctx)


func finish(info: Dictionary) -> void:
	if over:
		return
	over = true
	ended.emit(info)
