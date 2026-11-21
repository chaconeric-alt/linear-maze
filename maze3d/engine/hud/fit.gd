extends MarginContainer
## HudFit - a frame over the whole window for a menu (the title, pause and end screens, a terminal panel). What it
## holds stands in the middle of the window when it fits, and scrolls when it does not: a long list of levels or a
## panel with many options on a small window gets scroll bars instead of running off the screen. The keyboard focus
## is followed, so a button reached with Tab or the arrow keys is scrolled into view.
class_name HudFit

const MARGIN := 24          # pixels kept clear round the edge of the window

var scroll: ScrollContainer


func _init(content: Control) -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side in ["left", "right", "top", "bottom"]:
		add_theme_constant_override("margin_" + side, MARGIN)
	scroll = ScrollContainer.new()
	scroll.follow_focus = true
	add_child(scroll)
	# Expand and shrink-centre: the scroll area gives it the whole view, and it takes only its own size in the middle
	# of it; when it is bigger than the view it keeps its size and the scroll bars appear.
	content.size_flags_horizontal = Control.SIZE_EXPAND | Control.SIZE_SHRINK_CENTER
	content.size_flags_vertical = Control.SIZE_EXPAND | Control.SIZE_SHRINK_CENTER
	scroll.add_child(content)


## Back to the top, for when it is filled with something new.
func to_top() -> void:
	scroll.scroll_vertical = 0
	scroll.scroll_horizontal = 0


## Does all of it show without scrolling?
func fits() -> bool:
	var c: Control = scroll.get_child(0)
	return c.get_combined_minimum_size().x <= scroll.size.x + 0.5 and c.get_combined_minimum_size().y <= scroll.size.y + 0.5
