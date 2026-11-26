extends RefCounted
## HudScreens - the full-screen overlays: the title screen (Restore from save and New game, the game's levels and
## generator themes, the easy-mode button), the pause screen (with Save), and the end of a level (dead or out, the
## stats, the way home). It only builds them; the HUD decides when (its state), and its signals start levels and save.
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
	box.add_child(_save_row())
	box.add_child(_easy_button(g.get("easy", {})))
	box.add_child(style.label("", 8, Color.WHITE))
	for id in g.get("menu", LM.levels.keys()):
		if Installations.has(id):                     # an installation, by its usual way in
			box.add_child(style.button("▸  " + Installations.name_of(id), func(): hud.start_requested.emit(Installations.start_of(id)), true))
			continue
		var lv: Dictionary = LM.levels.get(id, {})
		box.add_child(style.button(("⌂  " if lv.get("home", false) else "▸  ") + lv.get("name", id), func(): hud.start_requested.emit(id), true))
	for gid in LM.generators:
		_generator_grid(gid)
	box.add_child(style.label("", 8, Color.WHITE))
	box.add_child(style.label("WASD move · mouse look · click fire · Shift dash · Space jump\nE use · right mouse zoom · 1-9 / wheel weapons · F lamp · Tab map · Esc pause · F9 save · F10 load\nEasy mode: E also names what you look at · P then writes an image prompt for it (console and clipboard)", 15, Color(0.7, 0.75, 0.75)))


## Restore from save, saying where it comes back to, and New game. A new game replaces the saved world, so when there
## is one it asks for a second press.
func _save_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var w: Dictionary = State.saved()
	var place := _saved_place(w)
	var rb := style.button("Restore from save" + ("   (%s)" % place if place != "" else ""), func(): hud.restore_requested.emit(), place != "")
	rb.disabled = place == ""
	rb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(rb)
	var nb := style.button("New game", func(): pass)
	var asked := [w.is_empty()]                      # (an array, so the press below can change it)
	nb.pressed.connect(func():
		if asked[0]:
			hud.new_game_requested.emit()
		else:
			asked[0] = true
			nb.text = "New game: press again to replace the saved world")
	row.add_child(nb)
	return row


## Where a saved world comes back to, in words: the level it was saved in, or the bunker; "" with nothing saved.
func _saved_place(w: Dictionary) -> String:
	if w.is_empty():
		return ""
	var at: Dictionary = w.get("run", {}).get("where", {})
	var id: String = at.get("id", LM.home_level())
	if id == "":
		return ""
	var name: String = LM.levels.get(id, {}).get("name", id)
	if id.begins_with("gen:"):
		name = "a random installation: " + GeneratedPlaces.name_of(id, "Mixed")
	return "%s, day %d" % [name, int(w.get("world", {}).get("day", 0))]


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


## A generator's places (GeneratedPlaces): mixed, and every theme not kept off the title screen; or what the generator
## offers itself, under its own heading (the written installations: any, and each archetype). Three across, so a dozen
## still fit.
func _generator_grid(gid: String) -> void:
	var offer := GeneratedPlaces.of(gid, "RANDOM INSTALLATIONS", "Mixed")
	box.add_child(style.label(offer["title"], 14, Color(0.7, 0.75, 0.75)))
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
	for p in offer["places"]:
		add.call("▸ %s" % p[0], p[1])


func pause() -> void:
	clear()
	overlay.color = Color(0, 0, 0, 0.72)
	overlay.visible = true
	box.add_child(style.label("PAUSED", 56, style.accent))
	box.add_child(style.button("Resume", hud.begin_play, true))
	var sv := style.button("Save", func(): pass)
	sv.pressed.connect(func():
		hud.save_requested.emit()
		sv.text = "Saved")
	box.add_child(sv)
	box.add_child(style.button("Start the level again", func(): hud.restart_requested.emit()))
	box.add_child(style.button("Back to the title (saves first)", func(): hud.start_requested.emit("")))
	box.add_child(style.button("Quit (saves first)", func():
		hud.get_tree().root.propagate_notification(Node.NOTIFICATION_WM_CLOSE_REQUEST)      # Main saves, as when the window is closed
		hud.get_tree().quit()))


## The end of a level: dead, or out with the level's own title and text; the stats; home, the last save (dead), again,
## or the title.
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
	var home_id := LM.home_level()
	var at_home: bool = Game.level != null and Game.level.data.get("home", false)
	if home_id != "" and not at_home:
		var s2: String = "Wake up in the bunker (nothing from the trip is kept)" if dead else "Home to the bunker (%d cr banked)" % Game.credits
		box.add_child(style.button(s2, func(): hud.start_requested.emit(home_id), not dead))
	if dead and not State.saved().is_empty():         # a death is not final until the player goes on from it
		box.add_child(style.button("Back to your last save (F10)", func(): hud.restore_requested.emit()))
	box.add_child(style.button("Go again", func(): hud.restart_requested.emit(), home_id == "" or dead))
	box.add_child(style.button("Back to the title", func(): hud.start_requested.emit("")))
