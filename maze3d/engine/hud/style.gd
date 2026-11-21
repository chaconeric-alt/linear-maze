extends RefCounted
## HudStyle - how the HUD's words, bars and buttons look: one monospaced font, the game's accent colour (game.json
## theme.accent), a shadow under the lettering. Every part of the HUD makes its widgets here so they match.
class_name HudStyle

var accent := Color("e8a23a")
var font: SystemFont


func _init() -> void:
	accent = LM.col(LM.game.get("theme", {}).get("accent"), accent)
	font = SystemFont.new()
	font.font_names = PackedStringArray(["IBM Plex Mono", "Consolas", "DejaVu Sans Mono", "monospace"])


func label(text: String, size: int, c: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", c)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 2)
	return l


func bar(c: Color) -> ProgressBar:
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


func button(text: String, cb: Callable, primary := false) -> Button:
	var b := Button.new()
	b.text = text
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.add_theme_font_override("font", font)
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
