extends RefCounted
## HudScreens - the full-screen overlays: the title screen (the game's levels and generator themes, the easy-mode
## button), the pause screen, and the end of a level (dead or out, the stats, the way home). It only builds them; the
## HUD decides when (its state) and its signals start levels.
class_name HudScreens

var hud: Hud
var style: HudStyle
var overlay: ColorRect
var box: VBoxContainer
var fit: HudFit             # centres the box in the window, and scrolls it when it is taller or wider than the window


func _init(h: Hud, s: HudStyle) -> void:
	hud = h
	style = s
	overlay = ColorRect.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0, 0, 0, 0.72)
	box = VBoxContainer.new()
	box.custom_minimum_size = Vector2(760, 0)
	box.add_theme_constant_override("separation", 14)
	fit = HudFit.new(box)
	overlay.add_child(fit)


func clear() -> void:
	for c in box.get_children():
		box.remove_child(c)
		c.queue_free()
	fit.to_top()


func title() -> void:
	clear()
	overlay.visible = true
	overlay.color = Color(0, 0, 0, 0.78)
	var g: Dictionary = LM.game
	box.add_child(style.label(str(g.get("title", "maze3d")).to_upper(), 84, style.accent))
	var tag := style.label(g.get("tagline", ""), 20, Color(0.9, 0.9, 0.85))
	tag.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(tag)
	box.add_child(_easy_button(g.get("easy", {})))
	box.add_child(style.label("", 8, Color.WHITE))
	for id in g.get("menu", LM.levels.keys()):
		var lv: Dictionary = LM.levels.get(id, {})
		box.add_child(style.button(("⌂  " if lv.get("home", false) else "▸  ") + lv.get("name", id), func(): hud.start_requested.emit(id), true))
	for gid in LM.generators:
		_generator_grid(g, gid)
	box.add_child(style.label("", 8, Color.WHITE))
	box.add_child(style.label("WASD move · mouse look · click fire · Shift dash · Space jump\nE use · right mouse zoom · 1-9 / wheel weapons · F lamp · Tab map · Esc pause", 15, Color(0.7, 0.75, 0.75)))


## The easy-mode switch, which says what it does to the numbers.
func _easy_button(ez: Dictionary) -> Button:
	var eb := style.button("", func(): pass)
	var name_it := func() -> void:
		eb.text = "Easy mode: %s   (your weapons ×%s, you take ÷%s)" % ["ON" if Game.easy else "off", String.num(ez.get("deal", 3), 0 if is_equal_approx(ez.get("deal", 3), roundf(ez.get("deal", 3))) else 1), String.num(ez.get("take", 3), 0 if is_equal_approx(ez.get("take", 3), roundf(ez.get("take", 3))) else 1)]
	name_it.call()
	eb.pressed.connect(func():
		Game.set_easy(not Game.easy)
		name_it.call())
	return eb


## A generator's places: mixed, and every theme not kept off the title screen. Three across, so a dozen still fit.
func _generator_grid(g: Dictionary, gid: String) -> void:
	box.add_child(style.label("RANDOM INSTALLATIONS", 14, Color(0.7, 0.75, 0.75)))
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 6)
	box.add_child(grid)
	var add := func(text: String, target: String) -> void:
		var bt := style.button(text, func(): hud.start_requested.emit(target))
		bt.add_theme_font_size_override("font_size", 16)
		bt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		grid.add_child(bt)
	add.call("▸ Mixed", "gen:" + gid)
	var themes: Dictionary = g.get("generator_themes", {})
	for th in themes:
		if not themes[th].get("menu", true):          # kept off the title screen; still playable with --level=gen:<generator>:<theme>
			continue
		add.call("▸ %s" % themes[th].get("title", th), "gen:%s:%s" % [gid, th])


func pause() -> void:
	clear()
	overlay.color = Color(0, 0, 0, 0.72)
	overlay.visible = true
	box.add_child(style.label("PAUSED", 56, style.accent))
	box.add_child(style.button("Resume", hud.begin_play, true))
	box.add_child(style.button("Start the level again", func(): hud.restart_requested.emit()))
	box.add_child(style.button("Back to the title", func(): hud.start_requested.emit("")))
	box.add_child(style.button("Quit", func(): hud.get_tree().quit()))


## The end of a level: dead, or out with the level's own title and text; the stats; home, again, or the title.
func end(info: Dictionary) -> void:
	clear()
	var dead: bool = info.get("dead", false)
	overlay.color = Color(0.1, 0, 0, 0.78) if dead else Color(0, 0, 0, 0.8)
	overlay.visible = true
	var words: Dictionary = LM.game.get("words", {})
	if dead:
		box.add_child(style.label(words.get("death_title", "YOU DIED"), 64, Color(1, 0.3, 0.2)))
		box.add_child(style.label(words.get("death_text", ""), 19, Color.WHITE))
	else:
		box.add_child(style.label(str(info.get("title", words.get("end_title", "Level complete"))).to_upper(), 56, style.accent))
		var t := style.label(info.get("text", ""), 19, Color.WHITE)
		t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(t)
	var s: Dictionary = Game.stats
	box.add_child(style.label("Salvage  %d cr      Finds  %d / %d      Kills  %d      Time  %d:%02d" % [Game.credits, s["treasure"], s["treasure_total"], s["kills"], int(s["time"]) / 60, int(s["time"]) % 60], 17, Color(0.8, 0.85, 0.85)))
	var home_id := ""
	for id in LM.levels:
		if LM.levels[id].get("home", false):
			home_id = id
	var at_home: bool = Game.level != null and Game.level.data.get("home", false)
	if home_id != "" and not at_home:
		var s2: String = "Wake up in the bunker (what you were carrying is gone)" if dead else "Home to the bunker (%d cr banked)" % Game.credits
		box.add_child(style.button(s2, func(): hud.start_requested.emit(home_id), not dead))
	box.add_child(style.button("Go again", func(): hud.restart_requested.emit(), home_id == "" or dead))
	box.add_child(style.button("Back to the title", func(): hud.start_requested.emit("")))
