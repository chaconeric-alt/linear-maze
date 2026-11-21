extends CanvasLayer
## Hud - everything drawn over the world: status, messages, the map, panels (terminals), and the title, pause, death
## and end screens. Built in code; colours come from the game's theme. Its parts are in engine/hud/: HudStyle (how
## words, bars and buttons look), HudCrosshair, HudMap and HudScreens (the full-screen overlays). It keeps the state
## (title, play, panel, pause, end) and what goes with each.
class_name Hud

signal start_requested(level_id: String)
signal restart_requested
signal save_requested            # the pause screen's Save
signal restore_requested         # the title screen's Restore from save
signal new_game_requested        # the title screen's New game

var accent := Color("e8a23a")
var root: Control
var _health: ProgressBar
var _armor: ProgressBar
var _hp_label: Label
var _weapon: Label
var _ammo: Label
var _credits: Label
var _keys: HBoxContainer
var _objective: Label
var _prompt: Label
var _ident: VBoxContainer
var _ident_title: Label
var _ident_detail: Label
var _ident_tw: Tween
var _toasts: VBoxContainer
var _vignette: ColorRect
var _cross: HudCrosshair
var _map: HudMap
var _panel: PanelContainer
var _panel_fit: HudFit       # the panel in the middle of the window, scrolled when it has more than the window holds
var _panel_body: VBoxContainer
var _screens: HudScreens
var _style: HudStyle
var _state := "title"


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 10
	_style = HudStyle.new()
	accent = _style.accent
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_vignette = ColorRect.new()
	_vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	_vignette.color = Color(0.8, 0.05, 0.0, 0.0)
	_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_vignette)
	_cross = HudCrosshair.new()
	_cross.accent = accent
	_cross.set_anchors_preset(Control.PRESET_CENTER)
	_cross.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_cross)
	_build_status()
	_build_messages()
	_build_panel()
	_screens = HudScreens.new(self, _style)          # full-screen overlays, over everything else
	add_child(_screens.overlay)
	Game.toast.connect(_on_toast)
	Game.changed.connect(refresh)
	Game.ended.connect(_on_end)
	Game.interaction.view = self                    # the rules of panels are there; this only draws them


## Health and armour bottom left, the weapon bottom right, the objective top left; credits, keys and the map top right.
func _build_status() -> void:
	var bl := VBoxContainer.new()
	bl.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	bl.position = Vector2(28, -96)
	bl.custom_minimum_size = Vector2(300, 0)
	root.add_child(bl)
	_hp_label = _label("100", 34, Color.WHITE)
	bl.add_child(_hp_label)
	_health = _style.bar(Color(0.85, 0.2, 0.15))
	bl.add_child(_health)
	_armor = _style.bar(Color(0.2, 0.7, 0.9))
	_armor.custom_minimum_size.y = 6
	bl.add_child(_armor)
	var br := VBoxContainer.new()
	br.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	br.position = Vector2(-330, -96)
	br.custom_minimum_size = Vector2(300, 0)
	br.alignment = BoxContainer.ALIGNMENT_END
	root.add_child(br)
	_ammo = _label("", 34, Color.WHITE)
	_ammo.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	br.add_child(_ammo)
	_weapon = _label("", 16, accent)
	_weapon.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	br.add_child(_weapon)
	_objective = _label("", 17, Color(0.95, 0.9, 0.8))
	_objective.position = Vector2(28, 22)
	_objective.custom_minimum_size = Vector2(520, 0)
	_objective.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(_objective)
	var tr := VBoxContainer.new()
	tr.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	tr.position = Vector2(-240, 20)
	tr.custom_minimum_size = Vector2(212, 0)
	root.add_child(tr)
	_credits = _label("0 cr", 20, accent)
	_credits.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	tr.add_child(_credits)
	_keys = HBoxContainer.new()
	_keys.alignment = BoxContainer.ALIGNMENT_END
	tr.add_child(_keys)
	_map = HudMap.new()
	_map.accent = accent
	_map.custom_minimum_size = HudMap.SMALL
	_map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tr.add_child(_map)


## Messages along the top, the use prompt under the cross hairs, and easy mode's "what is that" at the bottom.
func _build_messages() -> void:
	_toasts = VBoxContainer.new()
	_toasts.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_toasts.position = Vector2(-360, 70)
	_toasts.custom_minimum_size = Vector2(720, 0)
	_toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_toasts)
	_prompt = _label("", 20, Color.WHITE)
	_prompt.set_anchors_preset(Control.PRESET_CENTER)
	_prompt.position = Vector2(-300, 70)
	_prompt.custom_minimum_size = Vector2(600, 0)
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(_prompt)
	_ident = VBoxContainer.new()
	_ident.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_ident.position = Vector2(-460, -190)
	_ident.custom_minimum_size = Vector2(920, 0)
	_ident.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_ident.visible = false
	_ident_title = _label("", 24, accent)
	_ident_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_ident.add_child(_ident_title)
	_ident_detail = _label("", 15, Color(0.92, 0.92, 0.88))
	_ident_detail.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_ident_detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_ident.add_child(_ident_detail)
	root.add_child(_ident)
	Game.identified.connect(_on_identified)


## The terminal panel (hidden until a panel opens).
func _build_panel() -> void:
	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(680, 0)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.02, 0.05, 0.055, 0.95)
	sb.border_color = Color(0.2, 0.9, 0.8)
	sb.set_border_width_all(2)
	sb.set_content_margin_all(26)
	_panel.add_theme_stylebox_override("panel", sb)
	_panel_body = VBoxContainer.new()
	_panel_body.add_theme_constant_override("separation", 12)
	_panel.add_child(_panel_body)
	_panel_fit = HudFit.new(_panel)
	_panel_fit.visible = false
	add_child(_panel_fit)


func _label(text: String, size: int, c: Color) -> Label:
	return _style.label(text, size, c)


# ------------------------------------------------------------------ status
func refresh() -> void:
	var pl: Node = Game.player
	if pl == null or not is_instance_valid(pl):
		return
	_health.max_value = pl.max_hp
	_health.value = pl.hp
	_armor.max_value = pl.max_armor
	_armor.value = pl.armor
	_hp_label.text = "%d" % ceil(pl.hp) + ("   +%d" % pl.armor if pl.armor > 0 else "") + ("   EASY" if Game.easy else "")
	var w: Dictionary = pl.weapon()
	_weapon.text = str(w.get("name", "")).to_upper()
	_ammo.text = "" if w.is_empty() else ("∞" if w.get("ammo") == null else str(pl.ammo.get(w["ammo"], 0)))
	_credits.text = "%d cr" % Game.credits
	for c in _keys.get_children():
		c.queue_free()
	for k in Game.keys:
		var r := ColorRect.new()
		r.color = Door.LOCK_COLORS.get(k, Color.WHITE)
		r.custom_minimum_size = Vector2(26, 16)
		_keys.add_child(r)
	var text := ""
	if Game.level:
		for o in Game.level.data.get("objectives", []):
			if o.has("when") and not Game.has_flag(o["when"]):
				continue
			if o.has("done") and Game.has_flag(o["done"]):
				continue
			text = "▸ " + o.get("text", "")
			break
	_objective.text = text


func _process(_dt: float) -> void:
	var pl: Node = Game.player
	var playing: bool = _state == "play" and pl != null and is_instance_valid(pl)
	root.visible = _state == "play" or _state == "panel"
	if not playing:
		return
	_vignette.color.a = clamp(pl.hurt_flash * 0.45, 0.0, 0.3) + (0.1 if pl.hp < pl.max_hp * 0.25 else 0.0)
	var f: Node = pl.focus
	_prompt.text = ("[E]  " + f.prompt()) if f and is_instance_valid(f) else ""
	_cross.queue_redraw()
	_map.queue_redraw()


func _on_identified(title: String, detail: String) -> void:
	_ident_title.text = title
	_ident_detail.text = detail
	_ident.visible = true
	_ident.modulate.a = 1.0
	if _ident_tw:
		_ident_tw.kill()
	_ident_tw = create_tween()
	_ident_tw.tween_interval(9.0)
	_ident_tw.tween_property(_ident, "modulate:a", 0.0, 0.8)
	_ident_tw.tween_callback(func(): _ident.visible = false)


func _on_toast(text: String, kind: String) -> void:
	var colors := {"warn": Color(1.0, 0.45, 0.3), "good": Color(0.5, 1.0, 0.6), "loot": accent, "key": Color(1.0, 0.9, 0.4), "room": Color(0.75, 0.9, 1.0)}
	var l := _label(text.to_upper() if kind == "room" else text, 26 if kind == "room" else 19, colors.get(kind, Color.WHITE))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_toasts.add_child(l)
	if _toasts.get_child_count() > 5:
		_toasts.get_child(0).queue_free()
	var tw := l.create_tween()
	tw.tween_interval(2.6 + text.length() * 0.035)
	tw.tween_property(l, "modulate:a", 0.0, 0.6)
	tw.tween_callback(l.queue_free)


# ------------------------------------------------------------------ panels (terminals, things to read)
## What a panel offers and what choosing does is engine/interaction.gd (Game.interaction); here it is only drawn.
func open_panel(prop: Node, spec: Dictionary) -> void:
	if _state == "panel":
		return
	Game.interaction.open(prop, spec)
	_state = "panel"
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	LM.sound("terminal")
	_fill_panel(spec.get("text", ""))
	_panel_fit.to_top()
	_panel_fit.visible = true


## A panel whose options carry "do": a Callable. Opens it, or swaps what an open panel shows (engine/home.gd).
func repanel(prop: Node, spec: Dictionary) -> void:
	if _state != "panel":
		open_panel(prop, spec)
		return
	var same: bool = Game.interaction.spec.get("title", "") == spec.get("title", "")
	Game.interaction.open(prop, spec)
	_fill_panel(spec.get("text", ""))
	if not same:                                    # a new page starts at the top; the same page (after buying) stays put
		_panel_fit.to_top()


## The objective line as it reads now.
func objective_text() -> String:
	return _objective.text


## Keep the end screen from coming up when the level ends (the self-test ends levels on purpose).
func mute_end_screen() -> void:
	if Game.ended.is_connected(_on_end):
		Game.ended.disconnect(_on_end)


func in_panel() -> bool:
	return _state == "panel"


func playing() -> bool:
	return _state == "play"


func paused() -> bool:
	return _state == "pause"


## Draw the open panel again: `text` as its body, then what it offers (or `working` while a hack runs).
func draw_panel(text: String, working := "", final := false) -> void:
	_fill_panel(text, working, final)


func _fill_panel(text: String, working := "", final := false) -> void:
	for c in _panel_body.get_children():
		_panel_body.remove_child(c)
		c.queue_free()
	var spec: Dictionary = Game.interaction.spec
	_panel_body.add_child(_label(str(spec.get("kicker", "TERMINAL")).to_upper(), 13, Color(0.2, 0.9, 0.8)))
	_panel_body.add_child(_label(spec.get("title", ""), 28, Color.WHITE))
	var body := _label(text, 18, Color(0.75, 0.95, 0.9))
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.custom_minimum_size = Vector2(620, 0)
	_panel_body.add_child(body)
	if working != "":
		_panel_body.add_child(_label(working, 18, accent))
		return
	var n := 0
	for it in Game.interaction.offered(final):
		n += 1
		_panel_body.add_child(_style.button("%d   %s" % [n, it[1]], Game.interaction.choose.bind(it[0]), n == 1))
	_panel_body.add_child(_style.button("Esc   Step away", close_panel))


func close_panel() -> void:
	if _state != "panel":
		return
	_panel_fit.visible = false
	_state = "play"
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	refresh()


# ------------------------------------------------------------------ title, pause, death, the end (HudScreens draws them)
func show_title() -> void:
	_state = "title"
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_screens.title()


func begin_play() -> void:
	_state = "play"
	_screens.overlay.visible = false
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	refresh()


func show_pause() -> void:
	_state = "pause"
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_screens.pause()


func _on_end(info: Dictionary) -> void:
	await get_tree().create_timer(1.4 if info.get("dead", false) else 0.6, true).timeout
	show_end(info)


## The end screen now: dead (info "dead") or out (its "title" and "text").
func show_end(info: Dictionary) -> void:
	_state = "end"
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_screens.end(info)


## The frame of the menu showing now (the open panel, or the title, pause or end screen); null in play.
func menu_fit() -> HudFit:
	if _state == "panel":
		return _panel_fit
	return _screens.fit if _screens.overlay.visible else null


func _unhandled_key_input(ev: InputEvent) -> void:
	if not (ev is InputEventKey) or not ev.pressed or ev.echo:
		return
	var used := false        # only swallow keys the HUD acted on; the rest belong to the player (E, F, 1-9)
	match _state:
		"play":
			if ev.keycode == KEY_ESCAPE:
				show_pause()
				used = true
			elif ev.is_action("map"):
				_map.set_big(not _map.big)
				used = true
		"pause":
			if ev.keycode == KEY_ESCAPE:
				begin_play()
				used = true
		"panel":
			used = true
			if ev.keycode == KEY_ESCAPE:
				close_panel()
			elif ev.keycode >= KEY_1 and ev.keycode <= KEY_9:
				var want: int = ev.keycode - KEY_1 + 1
				for c in _panel_body.get_children():
					if c is Button and c.text.begins_with("%d " % want):
						c.pressed.emit()
						break
	if used:
		get_viewport().set_input_as_handled()
