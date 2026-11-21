extends SelfTestPart
## Menus: the title, pause and end screens and a panel with many options, shown on the shortest screen the game has.
## Each must sit inside the window, and every button must be reachable: on screen as it is, or scrolled to (HudFit). A
## menu that runs off the bottom of the window with no way to scroll fails here.
##
## The HUD is drawn on a canvas at least 1600 x 900 that is scaled to the window (project settings: stretch mode
## canvas_items, aspect expand), so a 16:9 window gives the least room: 1600 x 900 whatever its size in pixels.

const SMALL := Vector2i(1280, 720)
const OPTIONS := 24          # a panel with more options than the small window can show at once


func run() -> void:
	var win: Window = get_tree().root
	var was := win.size
	win.size = SMALL
	await frames(2)
	var hud: Hud = Game.hud
	var many: Array = []
	for i in OPTIONS:
		many.append({"label": "Option %d" % (i + 1), "do": func(): pass})
	for what in ["title", "pause", "end", "panel"]:
		match what:
			"title":
				hud.show_title()
			"pause":
				hud.show_pause()
			"end":
				hud.show_end({"title": "Out", "text": "How it went."})
			"panel":
				hud.begin_play()
				hud.repanel(null, {"kicker": "Test", "title": "Many options", "text": "A panel with more options than fit.", "options": many})
		await frames(3)
		await _check(hud.menu_fit(), what, win)
		if what == "panel":
			hud.close_panel()
	hud.begin_play()
	win.size = was
	await frames(2)


## Is the frame inside the window, and can every button in it be brought into view?
func _check(fit: HudFit, what: String, win: Window) -> void:
	if fit == null:
		say(false, "the %s menu shows on a 16:9 window (nothing showing)" % what)
		return
	var view := fit.get_viewport_rect()
	var inside := view.grow(0.5).encloses(fit.scroll.get_global_rect())
	var buttons: Array = []
	_buttons(fit.scroll.get_child(0), buttons)
	var lost := 0
	for b in buttons:
		fit.scroll.ensure_control_visible(b)
		await frames(1)
		if not fit.scroll.get_global_rect().grow(1.0).encloses(b.get_global_rect()):
			lost += 1
	fit.to_top()
	say(inside and lost == 0 and not buttons.is_empty(), "the %s menu fits a 16:9 window (%dx%d; %d buttons, %s%s)" % [what, view.size.x, view.size.y, buttons.size(),
		"all on screen" if fit.fits() else "scrolls to every one", "" if lost == 0 else "; %d out of reach" % lost])


func _buttons(n: Node, into: Array) -> void:
	for c in n.get_children():
		if c is Button and c.is_visible_in_tree():
			into.append(c)
		_buttons(c, into)
