extends Control
## HudMap - the map in the top right corner (Tab makes it bigger): the cells explored on the floor you are on, windows,
## ramps, balconies, pools, lifts and doors (in their lock's colour while locked), anything hostile you have seen as a
## red signal that pulses (faster and wider once it is hunting), what the character senses through walls (Sense,
## SPEC.md 5.22: monsters not yet seen as a dim orange ring, treasure as a gold dot), you as a white arrow, B1 / L0 /
## L1 when the level has more than one floor, SAFE once it has been made safe, and the outline of a zone (red, or
## green once it is safe) round the cells of it seen.
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
	_draw_sensed(lv, pl, s, pc, mid)
	_draw_seen(lv, pl, s, pc, mid)
	var fwd := Vector2(-sin(pl.rotation.y), -cos(pl.rotation.y))
	var side := Vector2(-fwd.y, fwd.x)
	draw_colored_polygon(PackedVector2Array([mid + fwd * 8, mid - fwd * 5 + side * 5, mid - fwd * 5 - side * 5]), Color.WHITE)
	draw_rect(Rect2(Vector2.ZERO, size), Color(accent.r, accent.g, accent.b, 0.6), false, 1.0)
	var label := HudMap.corner(lv.floors.size(), pf, State.is_safe())
	if label != "":
		draw_string(ThemeDB.fallback_font, Vector2(6, 16), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, accent)


## What the corner says: which floor (B1 below, L0 the main one, L1 above) when there is more than one, and SAFE once
## the level has been made safe (its makers have stopped for good).
static func corner(floors: int, pf: int, safe: bool) -> String:
	var out: Array = []
	if floors > 1:
		out.append(("B%d" % -pf) if pf < 0 else ("L%d" % pf))
	if safe:
		out.append("SAFE")
	return "  ".join(out)


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
			var zid := lv.zone_at_cell(p, pf)
			if zid != "":
				_draw_zone_edges(lv, p, pf, zid, at, s)


## A zone's outline (SPEC.md 4.13): a line on each side of a cell of it where the next cell is not in it.
func _draw_zone_edges(lv: Level, p: Vector2i, pf: int, zid: String, at: Vector2, s: float) -> void:
	var c := lv.zones().color(zid)
	for side in HudMap.zone_sides(lv, p, pf):
		var a: Vector2 = at + Vector2(0 if side != 1 else s - 1, 0 if side != 2 else s - 1)
		var b: Vector2 = a + (Vector2(s - 1, 0) if side % 2 == 0 else Vector2(0, s - 1))
		draw_line(a, b, c, 2.0)


## Which sides of a cell (0 north, 1 east, 2 south, 3 west) are a zone's edge: the cell is in a zone and the one past
## that side is not in the same one.
static func zone_sides(lv: Level, p: Vector2i, pf: int) -> Array:
	var zid := lv.zone_at_cell(p, pf)
	var out: Array = []
	if zid == "":
		return out
	for d in 4:
		var q: Vector2i = p + [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)][d]
		if lv.zone_at_cell(q, pf) != zid:
			out.append(d)
	return out


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


## What the character senses through walls, within `reach` metres on the floor they are on: monsters not yet seen,
## hostile to the player and alive ({"at", "kind": "monster"}), and treasure lying about ({"kind": "treasure"}).
static func sensed(lv: Level, pl: Node3D, reach: float) -> Array:
	var out: Array = []
	var near := func(p: Vector3) -> bool:
		return p.distance_to(pl.global_position) <= reach and absf(p.y - pl.global_position.y) <= lv.H * 1.6
	for a in lv.actors:
		if is_instance_valid(a) and not a.dead and not a.seen and Factions.hostile(Factions.of(a), Factions.PLAYER) and near.call(a.global_position):
			out.append({"at": a.global_position, "kind": "monster"})
	for p in pl.get_tree().get_nodes_in_group("pickups"):
		if p is Pickup and str(p.d.get("kind", "")) == "treasure" and near.call(p.global_position):
			out.append({"at": p.global_position, "kind": "treasure"})
	return out


func _draw_sensed(lv: Level, pl: Node3D, s: float, pc: Vector2, mid: Vector2) -> void:
	var reach := CharacterSheet.sense_reach(CharacterSheet.current()) * lv.C
	for t in HudMap.sensed(lv, pl, reach):
		var at: Vector3 = t["at"]
		var at2 := mid + (Vector2(at.x, at.z) / lv.C - pc) * s
		if at2.x < 4 or at2.y < 4 or at2.x > size.x - 4 or at2.y > size.y - 4:
			continue
		if t["kind"] == "monster":
			draw_arc(at2, 3.5, 0, TAU, 12, Color(1.0, 0.55, 0.2, 0.7), 1.5)
		else:
			draw_circle(at2, 2.0, Color(1.0, 0.85, 0.3, 0.85))
