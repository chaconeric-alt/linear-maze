extends Control
## HudMap - the map in the top right corner (Tab makes it bigger): the cells explored on the floor you are on, windows,
## ramps, balconies, pools, lifts and doors (in their lock's colour while locked), anything hostile you have seen as a
## red signal that pulses (faster and wider once it is hunting), you as a white arrow, and B1 / L0 / L1 when the level
## has more than one floor.
class_name HudMap

const SMALL := Vector2(212, 212)
const BIG := Vector2(420, 420)
var accent: Color
var big := false


func set_big(on: bool) -> void:
	big = on
	custom_minimum_size = BIG if big else SMALL


func _draw() -> void:
	var lv: Level = Game.level
	var pl: Node3D = Game.player
	if lv == null or pl == null or not is_instance_valid(pl):
		return
	var s := 9.0 if not big else 14.0
	var pc := Vector2(pl.global_position.x, pl.global_position.z) / lv.C
	var mid := size / 2
	draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.45))
	var pf := lv.floor_of(pl.global_position)          # the map shows the floor you are on
	_draw_cells(lv, pl, pf, s, pc, mid)
	_draw_seen(lv, pl, s, pc, mid)
	var fwd := Vector2(-sin(pl.rotation.y), -cos(pl.rotation.y))
	var side := Vector2(-fwd.y, fwd.x)
	draw_colored_polygon(PackedVector2Array([mid + fwd * 8, mid - fwd * 5 + side * 5, mid - fwd * 5 - side * 5]), Color.WHITE)
	draw_rect(Rect2(Vector2.ZERO, size), Color(accent.r, accent.g, accent.b, 0.6), false, 1.0)
	if lv.floors.size() > 1:                           # which floor: B1 below, L0 the main one, L1 above
		draw_string(ThemeDB.fallback_font, Vector2(6, 16), ("B%d" % -pf) if pf < 0 else ("L%d" % pf), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, accent)


func _draw_cells(lv: Level, pl: Node3D, pf: int, s: float, pc: Vector2, mid: Vector2) -> void:
	var reach := int(size.x / s / 2) + 1
	var cc := lv.cell_of(pl.global_position)
	for dy in range(-reach, reach + 1):
		for dx in range(-reach, reach + 1):
			var p := cc + Vector2i(dx, dy)
			if not lv.explored.has(Vector3i(p.x, p.y, pf)) or not lv.is_open(p.x, p.y, pf):
				continue
			var at := mid + (Vector2(p) - pc) * s
			if at.x < 0 or at.y < 0 or at.x > size.x - s or at.y > size.y - s:
				continue
			draw_rect(Rect2(at, Vector2(s - 1, s - 1)), _cell_color(lv, p, pf))


func _cell_color(lv: Level, p: Vector2i, pf: int) -> Color:
	var col := Color(0.55, 0.62, 0.66, 0.8)
	var lc := lv.cell(p.x, p.y, pf)
	if lc["window"] != "":
		col = Color(0.4, 0.85, 1.0, 0.9)
	elif not lc["ramp"].is_empty():
		col = Color(0.8, 0.7, 0.45, 0.85)
	elif not lc["decks"].is_empty():
		col = Color(0.68, 0.74, 0.8, 0.9)
	elif lc["fluid"]:
		col = Color(0.35, 0.6, 0.7, 0.8)
	if lc.has("lift"):
		col = Color(0.5, 1.0, 0.6, 0.95)
	var dk: Variant = p if pf == 0 else Vector3i(p.x, p.y, pf)
	var dd: Dictionary = lv.doors if pf == 0 else lv.doors_up
	if dd.has(dk):
		var d: Door = dd[dk]
		col = accent if not d.is_locked() else Door.LOCK_COLORS.get(d.lock, Color(0.7, 0.3, 1.0))
	return col


## Anything hostile the player has seen: a red signal.
func _draw_seen(lv: Level, pl: Node3D, s: float, pc: Vector2, mid: Vector2) -> void:
	var beat := fmod(Debug.now_msec() * 0.001, 1.2) / 1.2
	for a in lv.actors:
		if not is_instance_valid(a) or a.dead or not a.seen or absf(a.global_position.y - pl.global_position.y) > lv.H * 1.6:
			continue
		var at2 := mid + (Vector2(a.global_position.x, a.global_position.z) / lv.C - pc) * s
		if at2.x < 4 or at2.y < 4 or at2.x > size.x - 4 or at2.y > size.y - 4:
			continue
		var red := Color(1.0, 0.16, 0.12)
		draw_arc(at2, 2.0 + beat * (7.0 if a.awake else 4.0), 0, TAU, 16, Color(red.r, red.g, red.b, 0.9 * (1.0 - beat)), 2.0)
		draw_colored_polygon(PackedVector2Array([at2 + Vector2(0, -4.5), at2 + Vector2(4.5, 0), at2 + Vector2(0, 4.5), at2 + Vector2(-4.5, 0)]), red)
