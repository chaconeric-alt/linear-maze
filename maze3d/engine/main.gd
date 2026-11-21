extends Node3D
## Main - boots the game named in Project Settings (maze3d/game), shows the title, and
## builds and tears down levels. It saves the game and comes back to the save (F9 and F10, the pause screen's Save,
## the title screen's Restore from save; SavePoint).
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
	hud.save_requested.connect(func(): save_game())
	hud.restore_requested.connect(func(): restore_game())
	hud.new_game_requested.connect(new_game)
	Game.ended.connect(_on_ended)
	var first: String = _args.get("level", LM.game.get("start", ""))
	if not _load(first, true):
		push_error("no level %s" % first)
		get_tree().quit(1)
		return
	if not _args.is_empty() and not _args.has("selftest"):
		add_child(CommandLine.new(self, _args))    # the switches that act while it runs: --shot, --frames, --trace, --at ...
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


## Start the level being played again (the pause screen's "Start the level again", the end screen's "Go again"), as a
## death does: the world goes back to how the expedition found it, so the level is as it was when the expedition set
## out (as it was made, on a first visit). Coming back to a level (start_level) finds it remembered.
func restart_level() -> void:
	_leave("away")
	_how_left = "died"                               # settled as a death is, as it is unloaded
	_on_start(_level_id)


func _on_start(id: String) -> void:
	if id == "":
		save_game(true)                              # from the pause screen: Restore from save comes back here
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
	save_game(true)                                  # saved on arrival: what Restore from save comes back to


## Build the level with that id (or generate it: gen:<generator>[:<theme>]) and put the player in it. False if there is no
## such level, or the generator could make nothing with its settings. `back`: a save's place (SavePoint) being come
## back to: the seed it was made from, the run kept as it was saved, the player put back where they stood.
func _load(id: String, _attract: bool, back: Dictionary = {}) -> bool:
	_unload()
	_level_id = id
	if level:
		level.queue_free()
		remove_child(level)
		level = null
	Game.reset(not back.is_empty())
	Game.calm = _args.has("calm")
	if _args.has("easy"):                            # --easy / --easy=0: for this run only; the title screen button is the one that is remembered
		Game.easy = _args["easy"] != "0"
	var data := _level_data(id, back)
	if data.is_empty():
		return false
	var home: bool = data.get("home", false)
	if not home and not _in_run and back.is_empty():
		State.depart()                               # an expedition sets out: what a death goes back to (a save keeps its own)
	State.enter_level(level_key(), home, back.is_empty())      # the bunker keeps its own record (the home), not a level's memory
	level = Level.new()
	level.name = "Level"
	level.process_mode = Node.PROCESS_MODE_PAUSABLE      # Main keeps running while paused; the world must not
	add_child(level)
	Game.level = level
	level.build(data, {} if home else State.memory())
	var sortie := _put_player(data, back)
	Game.player = player
	Game.playing = true
	if data.has("intro") and back.is_empty():
		Game.say(data["intro"], "info")
	hud.refresh()
	_left = false
	if not home and not _in_run:
		_in_run = true
		Events.emit("run.started", {"level": level_key(), "from": "home" if sortie else "title"})
	Events.emit("level.entered", {"level": level_key(), "how": "restore" if not back.is_empty() else ("home" if home else ("sortie" if sortie else "start"))})
	return true


## The level's data: from the game's levels, or generated (with the seed given, a save's, or a new one).
func _level_data(id: String, back: Dictionary) -> Dictionary:
	if not id.begins_with("gen:"):
		return LM.levels.get(id, {}).duplicate(true)
	var bits := id.substr(4).split(":")            # gen:<generator>[:<theme>]
	var g: Object = LM.generators.get(bits[0])
	if g == null:
		return {}
	var params: Dictionary = LM.game.get("generator_params", {}).duplicate(true)
	if bits.size() > 1:
		params.merge(LM.game.get("generator_themes", {}).get(bits[1], {}), true)
	_seed = int(back.get("seed", _args.get("seed", randi())))      # (randi is drawn either way, as it always was)
	var data: Dictionary = g.generate(_seed, params)
	if _args.has("dump"):                            # --dump=file.json: keep the level that was generated
		var f := FileAccess.open(_args["dump"], FileAccess.WRITE)
		if f:
			f.store_string(JSON.stringify(data, " "))
	return data


## Make the player: at the level's start, set up from the game's and the level's settings, with the armoury's outfit if
## they came by the bunker's lift; or, coming back to a save, with what they carried, where they stood. True if they
## came by the lift.
func _put_player(data: Dictionary, back: Dictionary) -> bool:
	player = Player.new()
	level.add_child(player)
	player.position = level.center(level.start_cell, 0.05 + level.start_level * level.H)
	player.rotation.y = level.start_yaw + PI
	var cfg: Dictionary = LM.game.get("player", {}).duplicate(true)
	for k in data.get("player", {}):
		cfg[k] = data["player"][k]
	var sortie: bool = Profile.sortie
	if back.has("player"):
		SavePoint.fit(cfg, back["player"])
	elif Profile.sortie and not data.get("home", false):      # they came by the bunker's lift: the armoury comes too
		Profile.outfit(cfg)
	Profile.sortie = false
	player.setup(level, cfg)
	if back.has("player"):
		SavePoint.put_back(player, back["player"])
	return sortie


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


## The level is about to be freed: what becomes of its memory is settled.
func _unload() -> void:
	if level == null:
		return
	_leave("away")
	_settle()


## What changed in the level is kept in its memory (LevelMemory), unless the player died there: then the whole world goes
## back to how the expedition found it (State.die: this level, the bunker, the characters, the world's flags), the
## departure copy kept if the expedition goes on (the level started again). A generated level whose run is over is
## forgotten (a one-off); the bunker keeps its own record (the home).
func _settle() -> void:
	if level.data.get("home", false):
		return
	if _how_left == "died":
		State.die(_in_run)
	elif _level_id.begins_with("gen:") and not _in_run:
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


## An expedition is over. Out alive: what was carried is banked in the bunker, and what changed in the level is saved
## with it. Dead: nothing is banked; the save is left as it was, so F10 (or the death screen's button) comes back to
## it; the world in memory goes back to how the expedition found it as the level goes (_settle), which the next save
## (arriving in the bunker) makes the save.
## Either way the save no longer has a place in a level: between levels, Restore from save comes back to the bunker.
func _on_ended(info: Dictionary) -> void:
	if level == null:
		return
	var dead: bool = info.get("dead", false)
	_leave("died" if dead else "out")
	if level.data.get("home", false):
		return
	var was_run := _in_run
	_in_run = false
	State.run().erase("where")
	if not dead:
		_settle()
		if player:
			Profile.bank(Game.credits, player.weapons, player.armor, Game.haul, player.gear)
	if was_run:
		Events.emit("run.ended", {"alive": not dead, "banked": 0 if dead else Game.credits})


# ------------------------------------------------------------------ saving any time (SavePoint; SPEC.md 5.15)
## Save the game as it is now: the world, with what changed in the level and where the player stands in it. On F9 and
## the pause screen's Save (said), and on arriving in a level, leaving for the title and quitting (quietly). The text
## saved; "" when there is nothing to save: the title screen, a level that has ended, a dead player.
func save_game(quiet := false) -> String:
	if level == null or player == null or player.dead or _left or not (hud.playing() or hud.paused()):
		return ""
	if not level.data.get("home", false):
		State.memory().merge(level.remember(), true)
	State.run()["where"] = SavePoint.where(_level_id, _seed, level_key(), _in_run, player)
	State.save()
	if not quiet:
		Game.say("Saved.", "info")
	return State.to_json()


## Come back to the save (F10, the title screen's Restore from save): the world as it was saved, the level it was saved
## in built again from its memory, and the player put back where they stood. A save made between levels comes back to
## the bunker. False, and said, when there is nothing to come back to.
func restore_game() -> bool:
	var w: Dictionary = State.saved()
	var at: Dictionary = w.get("run", {}).get("where", {}) if not w.is_empty() else {}
	var to: String = at.get("id", LM.home_level()) if not w.is_empty() else ""
	if to == "":
		Game.say("There is no saved game to come back to.", "warn")
		return false
	_drop("restore")
	State.data = w
	_in_run = bool(at.get("in_run", false))
	Profile.sortie = false
	if not _load(to, false, at):
		_on_start("")
		Game.say("The saved game could not be come back to.", "warn")
		return false
	hud.begin_play()
	return true


## A new world in place of the saved one (the title screen's New game): a new scavenger and an empty bunker, saved at
## once; then the bunker, or in a game without one the title screen again.
func new_game() -> void:
	_drop("away")                                    # (the level being played belongs to the world being replaced)
	_in_run = false
	State.data = WorldState.blank()
	State.save()
	_on_start(LM.home_level())


## Let the level go without settling its memory: the world it belongs to is being replaced (by a saved one, or a new one).
func _drop(how: String) -> void:
	_leave(how)
	if level:
		level.queue_free()
		remove_child(level)
		level = null


## F9 saves, F10 comes back to the save, from play, the pause screen or the title. (An open panel keeps the keys.)
func _unhandled_key_input(ev: InputEvent) -> void:
	if not (ev is InputEventKey) or not ev.pressed or ev.echo:
		return
	if ev.keycode == KEY_F9:
		save_game()
	elif ev.keycode == KEY_F10:
		restore_game()
	else:
		return
	get_viewport().set_input_as_handled()


## Closing the window (or the pause screen's Quit) saves first.
func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST and hud != null:
		save_game(true)
