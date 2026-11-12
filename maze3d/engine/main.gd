extends Node3D
## Main - boots the game named in Project Settings (maze3d/game), shows the title, and
## builds and tears down levels.
##
## For testing from a terminal:  godot --path maze3d -- --level=<id> [--shot=out.png] [--frames=N] [--god] [--at=x,y] [--yaw=deg]

var hud: Hud
var level: Level = null
var player: Player = null
var _level_id := ""
var _args: Dictionary = {}
var _frame := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_inputs()
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=")
		_args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	LM.boot(_args.get("game", ProjectSettings.get_setting("maze3d/game", "havenot")))
	if not _args.has("selftest"):                    # the self-test always measures the game as designed
		Game.load_settings()
	hud = Hud.new()
	add_child(hud)
	Game.hud = hud
	hud.start_requested.connect(_on_start)
	hud.restart_requested.connect(func(): _on_start(_level_id))
	var first: String = _args.get("level", LM.game.get("start", ""))
	_load(first, true)
	if _args.has("level"):
		hud.begin_play()
		if _args.has("selftest"):
			var st: Node = load("res://engine/selftest.gd").new()
			add_child(st)
			st.run(self)
	else:
		hud.show_title()
		get_tree().paused = true


func _inputs() -> void:
	var keys := {"move_forward": [KEY_W, KEY_UP], "move_back": [KEY_S, KEY_DOWN], "move_left": [KEY_A], "move_right": [KEY_D],
		"jump": [KEY_SPACE], "dash": [KEY_SHIFT], "use": [KEY_E], "flashlight": [KEY_F], "map": [KEY_TAB]}
	for a in keys:
		if not InputMap.has_action(a):
			InputMap.add_action(a)
		for k in keys[a]:
			var ev := InputEventKey.new()
			ev.physical_keycode = k
			InputMap.action_add_event(a, ev)
	if not InputMap.has_action("fire"):
		InputMap.add_action("fire")
	var mb := InputEventMouseButton.new()
	mb.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("fire", mb)


func _on_start(id: String) -> void:
	if id == "":
		_load(LM.game.get("start", ""), true)
		hud.show_title()
		get_tree().paused = true
		return
	_load(id, false)
	hud.begin_play()


func _load(id: String, _attract: bool) -> void:
	_level_id = id
	if level:
		level.queue_free()
		remove_child(level)
	Game.reset()
	Game.calm = _args.has("calm")
	if _args.has("easy"):                            # --easy / --easy=0: for this run only; the title screen button is the one that is remembered
		Game.easy = _args["easy"] != "0"
	var data: Dictionary
	if id.begins_with("gen:"):
		var bits := id.substr(4).split(":")        # gen:<generator>[:<theme>]
		var g: Object = LM.generators[bits[0]]
		var params: Dictionary = LM.game.get("generator_params", {}).duplicate(true)
		if bits.size() > 1:
			params.merge(LM.game.get("generator_themes", {}).get(bits[1], {}), true)
		data = g.generate(int(_args.get("seed", randi())), params)
		if _args.has("dump"):                        # --dump=file.json: keep the level that was generated
			var f := FileAccess.open(_args["dump"], FileAccess.WRITE)
			if f:
				f.store_string(JSON.stringify(data, " "))
	else:
		data = LM.levels[id].duplicate(true)
	level = Level.new()
	level.name = "Level"
	level.process_mode = Node.PROCESS_MODE_PAUSABLE      # Main keeps running while paused; the world must not
	add_child(level)
	Game.level = level
	level.build(data)
	player = Player.new()
	level.add_child(player)
	player.position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	player.rotation.y = level.start_yaw + PI
	var cfg: Dictionary = LM.game.get("player", {}).duplicate(true)
	for k in data.get("player", {}):
		cfg[k] = data["player"][k]
	player.setup(level, cfg)
	Game.player = player
	Game.playing = true
	if data.has("intro"):
		Game.say(data["intro"], "info")
	hud.refresh()


func _process(_dt: float) -> void:
	if _args.is_empty() or _args.has("selftest"):
		return
	_frame += 1
	if _frame == 2:
		if _args.has("god"):
			player.max_hp = 99999
			player.hp = 99999
		if _args.has("at"):
			var p: PackedStringArray = _args["at"].split(",")
			player.position = level.center(Vector2i(int(p[0]), int(p[1])), 0.05) + Vector3(float(p[2]) if p.size() > 2 else 0.0, 0, float(p[3]) if p.size() > 3 else 0.0)
		if _args.has("alert"):                       # --alert: everything knows where the player is from the start
			for a in level.actors:
				a.alert.call_deferred()
		if _args.has("up"):                          # --up=1: start on that storey (for looking at balconies)
			player.position.y += float(_args["up"]) * level.H
		if _args.has("yaw"):
			player.rotation.y = deg_to_rad(float(_args["yaw"]))
		if _args.has("pitch"):
			player._pitch = deg_to_rad(float(_args["pitch"]))
		if _args.has("nohud"):
			hud.visible = false
	if _args.has("trace") and level:                  # --trace: print whenever an actor changes what it is doing
		for a in level.actors:
			if is_instance_valid(a):
				var st := "surf=%d awake=%s atk=%s leap=%s stunned=%s dead=%s" % [a._surf, a.awake, (a._atk.get("type", "melee") if a._atk != null else "-"), a._leap, a._stun > 0.0, a.dead]
				if a.get_meta("trace", "") != st:
					a.set_meta("trace", st)
					print("[%.2fs] %s#%d %s at (%.1f %.1f %.1f) player hp=%d" % [Game.stats["time"], a.d.get("name", "?"), a.get_index(), st, a.position.x, a.position.y, a.position.z, player.hp])
				if _args.get("trace", "") == a.d.get("name", "") and _frame % 300 == 0:      # --trace=Name: where that one is, every so often
					print("[%.1fs] %s at (%.1f %.1f %.1f)" % [Game.stats["time"], a.d.get("name", "?"), a.position.x, a.position.y, a.position.z])
	if _args.has("shot") and _frame == int(_args.get("frames", "40")):
		var img := get_viewport().get_texture().get_image()
		img.save_png(_args["shot"])
		print("shot saved ", _args["shot"])
		get_tree().quit()
	elif not _args.has("shot") and _args.has("frames") and _frame >= int(_args["frames"]):
		print("ran ", _frame, " frames; actors=", level.actors.size(), " hp=", player.hp)
		get_tree().quit()
