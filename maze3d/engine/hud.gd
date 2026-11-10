extends CanvasLayer
## Hud - everything drawn over the world: status, messages, the map, panels (terminals),
## and the title, pause, death and end screens. Built in code; colours come from the game's theme.
class_name Hud

signal start_requested(level_id: String)
signal restart_requested

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
var _toasts: VBoxContainer
var _vignette: ColorRect
var _cross: Control
var _map: Control
var _panel: PanelContainer
var _panel_body: VBoxContainer
var _overlay: ColorRect
var _overlay_box: VBoxContainer
var _panel_prop: Node = null
var _panel_spec: Dictionary = {}
var _big_map := false
var _state := "title"
var _font_mono: SystemFont


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 10
	accent = LM.col(LM.game.get("theme", {}).get("accent"), accent)
	_font_mono = SystemFont.new()
	_font_mono.font_names = PackedStringArray(["IBM Plex Mono", "Consolas", "DejaVu Sans Mono", "monospace"])
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_vignette = ColorRect.new()
	_vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	_vignette.color = Color(0.8, 0.05, 0.0, 0.0)
	_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_vignette)
	_cross = Control.new()
	_cross.set_anchors_preset(Control.PRESET_CENTER)
	_cross.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_cross.draw.connect(_draw_cross)
	root.add_child(_cross)
	# bottom left: health and armour
	var bl := VBoxContainer.new()
	bl.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	bl.position = Vector2(28, -96)
	bl.custom_minimum_size = Vector2(300, 0)
	root.add_child(bl)
	_hp_label = _label("100", 34, Color.WHITE)
	bl.add_child(_hp_label)
	_health = _bar(Color(0.85, 0.2, 0.15))
	bl.add_child(_health)
	_armor = _bar(Color(0.2, 0.7, 0.9))
	_armor.custom_minimum_size.y = 6
	bl.add_child(_armor)
	# bottom right: weapon
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
	# top left: objective
	_objective = _label("", 17, Color(0.95, 0.9, 0.8))
	_objective.position = Vector2(28, 22)
	_objective.custom_minimum_size = Vector2(520, 0)
	_objective.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(_objective)
	# top right: credits, keys, map
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
	_map = Control.new()
	_map.custom_minimum_size = Vector2(212, 212)
	_map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_map.draw.connect(_draw_map)
	tr.add_child(_map)
	# messages
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
	# terminal panel
	_panel = PanelContainer.new()
	_panel.set_anchors_preset(Control.PRESET_CENTER)
	_panel.custom_minimum_size = Vector2(680, 0)
	_panel.position = Vector2(-340, -240)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.02, 0.05, 0.055, 0.95)
	sb.border_color = Color(0.2, 0.9, 0.8)
	sb.set_border_width_all(2)
	sb.set_content_margin_all(26)
	_panel.add_theme_stylebox_override("panel", sb)
	_panel_body = VBoxContainer.new()
	_panel_body.add_theme_constant_override("separation", 12)
	_panel.add_child(_panel_body)
	_panel.visible = false
	add_child(_panel)
	# full-screen overlays
	_overlay = ColorRect.new()
	_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_overlay.color = Color(0, 0, 0, 0.72)
	_overlay_box = VBoxContainer.new()
	_overlay_box.set_anchors_preset(Control.PRESET_CENTER)
	_overlay_box.custom_minimum_size = Vector2(760, 0)
	_overlay_box.position = Vector2(-380, -230)
	_overlay_box.add_theme_constant_override("separation", 14)
	_overlay.add_child(_overlay_box)
	add_child(_overlay)
	Game.toast.connect(_on_toast)
	Game.changed.connect(refresh)
	Game.ended.connect(_on_end)


func _label(text: String, size: int, c: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", _font_mono)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", c)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 2)
	return l


func _bar(c: Color) -> ProgressBar:
	var b := ProgressBar.new()
	b.show_percentage = false
	b.custom_minimum_size = Vector2(300, 12)
	var fg := StyleBoxFlat.new()
	fg.bg_color = c
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.55)
	b.add_theme_stylebox_override("fill", fg)
	b.add_theme_stylebox_override("background", bg)
	return b


func _button(text: String, cb: Callable, primary := false) -> Button:
	var b := Button.new()
	b.text = text
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.add_theme_font_override("font", _font_mono)
	b.add_theme_font_size_override("font_size", 19)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(accent.r, accent.g, accent.b, 0.22 if primary else 0.08)
	sb.border_color = accent
	sb.set_border_width_all(1)
	sb.set_content_margin_all(10)
	var hov := sb.duplicate()
	hov.bg_color = Color(accent.r, accent.g, accent.b, 0.4)
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("hover", hov)
	b.add_theme_stylebox_override("pressed", hov)
	b.add_theme_stylebox_override("focus", hov)
	b.pressed.connect(cb)
	return b


# ------------------------------------------------------------------ status
func refresh() -> void:
	var pl: Node = Game.player
	if pl == null or not is_instance_valid(pl):
		return
	_health.max_value = pl.max_hp
	_health.value = pl.hp
	_armor.max_value = pl.max_armor
	_armor.value = pl.armor
	_hp_label.text = "%d" % ceil(pl.hp) + ("   +%d" % pl.armor if pl.armor > 0 else "")
	var w: Dictionary = pl.weapon()
	_weapon.text = str(w.get("name", "")).to_upper()
	_ammo.text = "∞" if w.get("ammo") == null else str(pl.ammo.get(w["ammo"], 0))
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


func _draw_cross() -> void:
	var pl: Node = Game.player
	if pl == null or not is_instance_valid(pl):
		return
	var g: float = 7.0 + pl.recoil * 10.0
	var c := Color(1, 1, 1, 0.85)
	for d in [Vector2(1, 0), Vector2(-1, 0), Vector2(0, 1), Vector2(0, -1)]:
		_cross.draw_line(d * g, d * (g + 8.0), c, 2.0)
	_cross.draw_circle(Vector2.ZERO, 1.5, accent)


func _draw_map() -> void:
	var lv: Level = Game.level
	var pl: Node3D = Game.player
	if lv == null or pl == null or not is_instance_valid(pl):
		return
	var size := _map.size
	var s := 9.0 if not _big_map else 14.0
	var pc := Vector2(pl.global_position.x, pl.global_position.z) / lv.C
	var mid := size / 2
	_map.draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.45))
	var reach := int(size.x / s / 2) + 1
	var cc := lv.cell_of(pl.global_position)
	for dy in range(-reach, reach + 1):
		for dx in range(-reach, reach + 1):
			var p := cc + Vector2i(dx, dy)
			if not lv.explored.has(p) or not lv.is_open(p.x, p.y):
				continue
			var at := mid + (Vector2(p) - pc) * s
			if at.x < 0 or at.y < 0 or at.x > size.x - s or at.y > size.y - s:
				continue
			var col := Color(0.55, 0.62, 0.66, 0.8)
			if lv.doors.has(p):
				var d: Door = lv.doors[p]
				col = accent if not d.is_locked() else Door.LOCK_COLORS.get(d.lock, Color(0.7, 0.3, 1.0))
			_map.draw_rect(Rect2(at, Vector2(s - 1, s - 1)), col)
	var fwd := Vector2(-sin(pl.rotation.y), -cos(pl.rotation.y))
	var side := Vector2(-fwd.y, fwd.x)
	_map.draw_colored_polygon(PackedVector2Array([mid + fwd * 8, mid - fwd * 5 + side * 5, mid - fwd * 5 - side * 5]), Color.WHITE)
	_map.draw_rect(Rect2(Vector2.ZERO, size), Color(accent.r, accent.g, accent.b, 0.6), false, 1.0)


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
func open_panel(prop: Node, spec: Dictionary) -> void:
	_panel_prop = prop
	_panel_spec = spec
	_state = "panel"
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	LM.sound("terminal")
	_fill_panel(spec.get("text", ""))
	_panel.visible = true


func _fill_panel(text: String, working := "") -> void:
	for c in _panel_body.get_children():
		_panel_body.remove_child(c)
		c.queue_free()
	var spec := _panel_spec
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
	var used: Dictionary = _panel_prop.e.get("_used", {}) if _panel_prop else {}
	for i in spec.get("options", []).size():
		var o: Dictionary = spec["options"][i]
		if o.has("when") and not Game.has_flag(o["when"]):
			continue
		if o.has("unless") and Game.has_flag(o["unless"]):
			continue
		if o.get("once", false) and used.has(i):
			continue
		n += 1
		_panel_body.add_child(_button("%d   %s" % [n, o.get("label", "")], _choose.bind(i), n == 1))
	_panel_body.add_child(_button("Esc   Step away", close_panel))


func _choose(i: int) -> void:
	var o: Dictionary = _panel_spec["options"][i]
	var secs: float = o.get("hack", 0.0)
	if secs > 0.0:
		_fill_panel(_panel_spec.get("text", ""), o.get("working", "Bypassing…"))
		LM.sound("hack")
		await get_tree().create_timer(secs, true).timeout
		if _state != "panel":
			return
	if _panel_prop and is_instance_valid(_panel_prop):
		if not _panel_prop.e.has("_used"):
			_panel_prop.e["_used"] = {}
		_panel_prop.e["_used"][i] = true
		if o.has("screen"):
			_panel_prop.set_screen(o["screen"])
	LM.sound("confirm")
	Game.run_effects(o.get("effects"))
	if o.get("close", false):
		close_panel()
	else:
		_fill_panel(o.get("result", _panel_spec.get("text", "")))


func close_panel() -> void:
	if _state != "panel":
		return
	_panel.visible = false
	_state = "play"
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	refresh()


# ------------------------------------------------------------------ title, pause, death, the end
func _clear_overlay() -> void:
	for c in _overlay_box.get_children():
		_overlay_box.remove_child(c)
		c.queue_free()


func show_title() -> void:
	_state = "title"
	_clear_overlay()
	_overlay.visible = true
	_overlay.color = Color(0, 0, 0, 0.78)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var g: Dictionary = LM.game
	_overlay_box.add_child(_label(str(g.get("title", "maze3d")).to_upper(), 84, accent))
	var tag := _label(g.get("tagline", ""), 20, Color(0.9, 0.9, 0.85))
	tag.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_overlay_box.add_child(tag)
	_overlay_box.add_child(_label("", 8, Color.WHITE))
	for id in g.get("menu", LM.levels.keys()):
		var lv: Dictionary = LM.levels.get(id, {})
		_overlay_box.add_child(_button("▸  " + lv.get("name", id), func(): start_requested.emit(id), true))
	for gid in LM.generators:
		_overlay_box.add_child(_button("▸  Random installation  (%s)" % gid, func(): start_requested.emit("gen:" + gid)))
	_overlay_box.add_child(_label("", 8, Color.WHITE))
	_overlay_box.add_child(_label("WASD move · mouse look · click fire · Shift dash · Space jump\nE use · 1-9 / wheel weapons · F lamp · Tab map · Esc pause", 15, Color(0.7, 0.75, 0.75)))


func begin_play() -> void:
	_state = "play"
	_overlay.visible = false
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	refresh()


func _pause() -> void:
	_state = "pause"
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_clear_overlay()
	_overlay.color = Color(0, 0, 0, 0.72)
	_overlay.visible = true
	_overlay_box.add_child(_label("PAUSED", 56, accent))
	_overlay_box.add_child(_button("Resume", begin_play, true))
	_overlay_box.add_child(_button("Start the level again", func(): restart_requested.emit()))
	_overlay_box.add_child(_button("Back to the title", func(): start_requested.emit("")))
	_overlay_box.add_child(_button("Quit", func(): get_tree().quit()))


func _on_end(info: Dictionary) -> void:
	await get_tree().create_timer(1.4 if info.get("dead", false) else 0.6, true).timeout
	_state = "end"
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_clear_overlay()
	_overlay.color = Color(0.1, 0, 0, 0.78) if info.get("dead", false) else Color(0, 0, 0, 0.8)
	_overlay.visible = true
	var words: Dictionary = LM.game.get("words", {})
	if info.get("dead", false):
		_overlay_box.add_child(_label(words.get("death_title", "YOU DIED"), 64, Color(1, 0.3, 0.2)))
		_overlay_box.add_child(_label(words.get("death_text", ""), 19, Color.WHITE))
	else:
		_overlay_box.add_child(_label(str(info.get("title", words.get("end_title", "Level complete"))).to_upper(), 56, accent))
		var t := _label(info.get("text", ""), 19, Color.WHITE)
		t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_overlay_box.add_child(t)
	var s: Dictionary = Game.stats
	_overlay_box.add_child(_label("Salvage  %d cr      Finds  %d / %d      Kills  %d      Time  %d:%02d" % [Game.credits, s["treasure"], s["treasure_total"], s["kills"], int(s["time"]) / 60, int(s["time"]) % 60], 17, Color(0.8, 0.85, 0.85)))
	_overlay_box.add_child(_button("Go again", func(): restart_requested.emit(), true))
	_overlay_box.add_child(_button("Back to the title", func(): start_requested.emit("")))


func _unhandled_key_input(ev: InputEvent) -> void:
	if not (ev is InputEventKey) or not ev.pressed or ev.echo:
		return
	match _state:
		"play":
			if ev.keycode == KEY_ESCAPE:
				_pause()
			elif ev.is_action("map"):
				_big_map = not _big_map
				_map.custom_minimum_size = Vector2(420, 420) if _big_map else Vector2(212, 212)
		"pause":
			if ev.keycode == KEY_ESCAPE:
				begin_play()
		"panel":
			if ev.keycode == KEY_ESCAPE:
				close_panel()
			elif ev.keycode >= KEY_1 and ev.keycode <= KEY_9:
				var want: int = ev.keycode - KEY_1 + 1
				for c in _panel_body.get_children():
					if c is Button and c.text.begins_with("%d " % want):
						c.pressed.emit()
						break
	get_viewport().set_input_as_handled()
