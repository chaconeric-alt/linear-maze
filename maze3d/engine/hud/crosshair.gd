extends Control
## HudCrosshair - the cross hairs in the middle of the view, opening with the gun's kick; in sniper mode a scope's
## reticle instead, with the dark round it. Redrawn every frame while playing.
class_name HudCrosshair

var accent: Color


func _draw() -> void:
	var pl: Node = Game.player
	if pl == null or not is_instance_valid(pl):
		return
	if pl.zoom > 0.05:                                # sniper mode: a scope's reticle, and the dark round it
		_draw_scope(pl.zoom, pl.recoil)
		if pl.zoom > 0.5:
			return
	var g: float = 7.0 + pl.recoil * 10.0
	var c := Color(1, 1, 1, 0.85 * (1.0 - pl.zoom))
	for d in [Vector2(1, 0), Vector2(-1, 0), Vector2(0, 1), Vector2(0, -1)]:
		draw_line(d * g, d * (g + 8.0), c, 2.0)
	draw_circle(Vector2.ZERO, 1.5, accent)


func _draw_scope(z: float, recoil: float) -> void:
	var vs := get_viewport().get_visible_rect().size
	var r: float = vs.y * 0.44
	var dark := Color(0, 0, 0, 0.97 * z)
	# everything outside the circle: four bands round its square, and a thick ring for the corners
	draw_rect(Rect2(-vs.x, -vs.y, vs.x * 2, vs.y - r), dark)
	draw_rect(Rect2(-vs.x, r, vs.x * 2, vs.y - r), dark)
	draw_rect(Rect2(-vs.x, -r, vs.x - r, r * 2), dark)
	draw_rect(Rect2(r, -r, vs.x - r, r * 2), dark)
	draw_arc(Vector2.ZERO, r * 1.21, 0, TAU, 96, dark, r * 0.42)      # fills the corners between the square and the circle
	draw_arc(Vector2.ZERO, r, 0, TAU, 96, Color(0, 0, 0, z), 3.0)
	var line := Color(accent.r, accent.g, accent.b, 0.9 * z)
	var gap: float = 10.0 + recoil * 14.0
	for d in [Vector2(1, 0), Vector2(-1, 0), Vector2(0, 1), Vector2(0, -1)]:
		draw_line(d * gap, d * r * 0.3, line, 1.5)
		draw_line(d * r * 0.3, d * r, Color(0, 0, 0, 0.85 * z), 3.0)      # heavy posts outside, fine wire in the middle
		for k in range(1, 5):                     # range ticks
			var at: Vector2 = d * (gap + k * r * 0.06)
			var nrm := Vector2(-d.y, d.x) * (5.0 if k % 2 == 0 else 3.0)
			draw_line(at - nrm, at + nrm, line, 1.0)
	draw_circle(Vector2.ZERO, 1.5, Color(1.0, 0.2, 0.15, z))
