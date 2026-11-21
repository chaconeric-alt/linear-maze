extends Node3D
## Main - boots the game named in Project Settings (maze3d/game), shows the title, and
## builds and tears down levels.
##
## For testing from a terminal:  godot --path maze3d -- --level=<id> [--shot=out.png] [--frames=N] [--god] [--at=x,y] [--yaw=deg]

var hud: Hud
var level: Level = null
var player: Player = null
var _level_id := ""
var _seed := 0                   # what a generated level was made from: its key is "<id>#<seed>" (level_key)
var _left := true                # the level being played has been reported left (level.left)
var _how_left := ""              # how: "out", "died", "away" (what becomes of its memory is settled as it is unloaded)
var _in_run := false             # an expedition is under way (run.started ... run.ended)
var _args: Dictionary = {}
var _frame := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_inputs()
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=")
		_args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	_debug_switches()
	LM.boot(_args.get("game", ProjectSettings.get_setting("maze3d/game", _first_game())))
	if not Debug.fixed_settings:                     # the self-test always measures the game as designed
		Game.load_settings()
	hud = Hud.new()
	add_child(hud)
	Game.hud = hud
	hud.start_requested.connect(_on_start)
	hud.restart_requested.connect(restart_level)
	Game.ended.connect(_on_ended)
	var first: String = _args.get("level", LM.game.get("start", ""))
	if not _load(first, true):
		push_error("no level %s" % first)
		get_tree().quit(1)
		return
	if _args.has("level"):
		hud.begin_play()
		if _args.has("selftest"):
			var st: Node = load("res://tests/selftest.gd").new()
			add_child(st)
			st.run(self)
	else:
		hud.show_title()
		get_tree().paused = true


## The game to boot when neither --game nor Project Settings (maze3d/game) names one: the first folder in games/.
func _first_game() -> String:
	var found := DirAccess.get_directories_at("res://games")
	return found[0] if not found.is_empty() else ""


## Switches for testing and looking at things, from the command line. Game code asks Debug (engine/debug.gd), never
## the command line; the self-test sets its own.
func _debug_switches() -> void:
	# --repeatable[=seed]: the same run every time (see Debug.now_msec). The self-test is repeatable unless --realtime.
	if _args.has("repeatable") or (_args.has("selftest") and not _args.has("realtime")):
		var given: bool = _args.has("repeatable") and OS.get_cmdline_user_args().has("--repeatable=" + _args["repeatable"])
		_repeatable(int(_args["repeatable"]) if given else 12345)
	if _args.has("selftest"):
		load("res://tests/selftest.gd").configure()
	Debug.hold_zoom = Debug.hold_zoom or _args.has("zoom")
	Debug.memory_profile = Debug.memory_profile or _args.has("noprofile")
	Debug.no_ao = _args.has("noao")
	Debug.ssil = _args.has("ssil")
	Debug.no_vfog = _args.has("novfog")
	Debug.print_prompts = _args.has("prompts")
	Debug.trace_events = _args.get("trace", "") == "events"
	if Debug.memory_profile:
		Profile.keep_in_memory()


## Seeds the random numbers before anything draws one (the level is not loaded yet) and stops the clock reading real
## time. Physics still steps with real time unless Godot itself is started with --fixed-fps 60, and a script cannot
## see Godot's own arguments to check, so the log says it.
func _repeatable(n: int) -> void:
	Debug.repeatable = true
	seed(n)
	print("repeatable: seed %d, clock in physics frames (start Godot with --fixed-fps 60 for the same run every time)" % n)


func _inputs() -> void:
	var keys := {"move_forward": [KEY_W, KEY_UP], "move_back": [KEY_S, KEY_DOWN], "move_left": [KEY_A], "move_right": [KEY_D],
		"jump": [KEY_SPACE], "dash": [KEY_SHIFT], "use": [KEY_E], "flashlight": [KEY_F], "map": [KEY_TAB],
		"image_prompt": [KEY_P]}
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


## Start (or restart) a level by id, as the title screen does.
func start_level(id: String) -> void:
	_on_start(id)


## Start the level being played again, as it was made: what it remembers is forgotten first (the pause screen's
## "Start the level again", the end screen's "Go again"). Coming back to a level (start_level) finds it remembered.
func restart_level() -> void:
	_leave("away")
	_how_left = "died"                               # settled as a death is: its memory forgotten as it is unloaded
	_on_start(_level_id)


func _on_start(id: String) -> void:
	if id == "":
		_load(LM.game.get("start", ""), true)
		hud.show_title()
		get_tree().paused = true
		return
	if not _load(id, false):                         # a generator that could not make a level with its settings
		_load(LM.game.get("start", ""), true)
		hud.show_title()
		get_tree().paused = true
		Game.say("Could not make a level from %s. Try another." % id, "warn")
		return
	hud.begin_play()


## Build the level with that id (or generate it: gen:<generator>[:<theme>]) and put the player in it. False if there is no
## such level, or the generator could make nothing with its settings.
func _load(id: String, _attract: bool) -> bool:
	_unload()
	_level_id = id
	if level:
		level.queue_free()
		remove_child(level)
		level = null
	Game.reset()
	Game.calm = _args.has("calm")
	if _args.has("easy"):                            # --easy / --easy=0: for this run only; the title screen button is the one that is remembered
		Game.easy = _args["easy"] != "0"
	var data: Dictionary
	if id.begins_with("gen:"):
		var bits := id.substr(4).split(":")        # gen:<generator>[:<theme>]
		var g: Object = LM.generators.get(bits[0])
		if g == null:
			return false
		var params: Dictionary = LM.game.get("generator_params", {}).duplicate(true)
		if bits.size() > 1:
			params.merge(LM.game.get("generator_themes", {}).get(bits[1], {}), true)
		_seed = int(_args.get("seed", randi()))
		data = g.generate(_seed, params)
		if _args.has("dump"):                        # --dump=file.json: keep the level that was generated
			var f := FileAccess.open(_args["dump"], FileAccess.WRITE)
			if f:
				f.store_string(JSON.stringify(data, " "))
	else:
		data = LM.levels.get(id, {}).duplicate(true)
	if data.is_empty():
		return false
	var home: bool = data.get("home", false)
	State.enter_level(level_key(), home)             # the bunker keeps its own record (the home), not a level's memory
	level = Level.new()
	level.name = "Level"
	level.process_mode = Node.PROCESS_MODE_PAUSABLE      # Main keeps running while paused; the world must not
	add_child(level)
	Game.level = level
	level.build(data, {} if home else State.memory())
	player = Player.new()
	level.add_child(player)
	player.position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	player.rotation.y = level.start_yaw + PI
	var cfg: Dictionary = LM.game.get("player", {}).duplicate(true)
	for k in data.get("player", {}):
		cfg[k] = data["player"][k]
	var sortie: bool = Profile.sortie
	if Profile.sortie and not data.get("home", false):      # they came by the bunker's lift: the armoury comes too
		Profile.outfit(cfg)
	Profile.sortie = false
	player.setup(level, cfg)
	Game.player = player
	Game.playing = true
	if data.has("intro"):
		Game.say(data["intro"], "info")
	hud.refresh()
	_left = false
	if not data.get("home", false) and not _in_run:
		_in_run = true
		Events.emit("run.started", {"level": level_key(), "from": "home" if sortie else "title"})
	Events.emit("level.entered", {"level": level_key(), "how": "home" if data.get("home", false) else ("sortie" if sortie else "start")})
	return true


## The level being played, by the id it was started with ("gen:rooms:crypt" for a generated one).
func level_id() -> String:
	return _level_id


## The player is leaving the level: it ended (alive or dead), or another is being loaded. It is said (level.left).
func _leave(how: String) -> void:
	if level == null or _left:
		return
	_left = true
	_how_left = how
	Events.emit("level.left", {"level": level_key(), "how": how})


## The level is about to be freed: what changed in it is kept in its memory (LevelMemory), unless the player died there,
## which forgets it (it is as it was made on the next visit), or it was a generated one whose run is over (a one-off),
## or it is the bunker, which keeps its own record (the home).
func _unload() -> void:
	if level == null:
		return
	_leave("away")
	if level.data.get("home", false):
		return
	if _how_left == "died" or (_level_id.begins_with("gen:") and not _in_run):
		State.forget_level(level_key())
	else:
		State.memory().merge(level.remember(), true)


## The player was brought back to life where they fell (the self-test does, after standing in every trap): the level
## has not been left after all, and the run goes on.
func carry_on() -> void:
	_left = false
	_how_left = ""
	_in_run = not level.data.get("home", false)


## The key the level being played is known by: its id, or for a generated one the whole recipe with its seed
## ("gen:rooms:crypt#5"), so the same seed comes back to the same place.
func level_key() -> String:
	return "%s#%d" % [_level_id, _seed] if _level_id.begins_with("gen:") else _level_id


## An expedition is over. Out alive: what was carried is banked in the bunker. Dead: it is not.
func _on_ended(info: Dictionary) -> void:
	if level == null:
		return
	var dead: bool = info.get("dead", false)
	_leave("died" if dead else "out")
	if level.data.get("home", false):
		return
	if dead:
		Profile.died()
	elif player:
		Profile.bank(Game.credits, player.weapons, player.armor, Game.haul)
	if _in_run:
		_in_run = false
		Events.emit("run.ended", {"alive": not dead, "banked": 0 if dead else Game.credits})


func _process(_dt: float) -> void:
	if _args.is_empty() or _args.has("selftest"):
		return
	_frame += 1
	if _frame == 2:
		if _args.has("lights"):                      # --lights: how many lights the level has, and the most the view could hold at once
			var ls: Array = []
			for n in level.get_children():
				if n is OmniLight3D:
					ls.append(n.global_position)
			var worst := 0
			for i in range(0, ls.size(), 7):
				var c := 0
				for q in ls:
					if q.distance_to(ls[i]) < 48.0:
						c += 1
				worst = maxi(worst, c)
			print("LIGHTS  %d omni lights in the level; up to %d within 48 m of one place (Forward+ holds %d in view)" % [ls.size(), worst, ProjectSettings.get_setting("rendering/limits/cluster_builder/max_clustered_elements")])
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
			player.pitch = deg_to_rad(float(_args["pitch"]))
		if _args.has("nohud"):
			hud.visible = false
	if _args.has("trace") and _args["trace"] != "events" and level:      # --trace: print whenever an actor changes what it is doing
		for a in level.actors:
			if is_instance_valid(a):
				var st: String = a.trace_text()
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
