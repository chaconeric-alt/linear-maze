extends RefCounted
## LevelWayHome - the ways home, marked so the player can find them (Eric, 25 Nov: "the entry / exit square to go back
## home should be marked in its own distinct color"). A way home is anything placed in the level whose use, or an
## option of it at any depth, has the effect that ends the expedition ("end"): the console that signals the surface,
## the Warlord's blast door, a terminal with a way out among its options. The floor in front of it gets a square of
## light (an oblong across every cell a thing hung on the wall covers, a blast door two cells wide), and the map draws
## those cells in the game's way-home colour (game.json theme "way_home"), which no lock, door, lift, zone or window on
## the map shares.
class_name LevelWayHome

const COLOR := Color(1.0, 0.4, 0.65)       # rose, if the game names none
const INSET := 0.65                        # metres in from the cell's edges: clear of a thing hung on the wall
const STRIP := 0.2                         # how wide the square's sides are
const LIFT := 0.04                         # above the floor, so the floor's tiles do not cover it


## The game's way-home colour.
static func color() -> Color:
	return LM.col(LM.game.get("theme", {}).get("way_home"), COLOR)


## The level's ways home: one entry each, the cells it is marked on as the map counts them, Vector3i(x, y, floor),
## where floor is the floor whose ground it stands on (a thing up in a tall room is on that room's floor).
static func find(ld: LevelData) -> Array:
	var out: Array = []
	for e in ld.data.get("things", []):
		if not (e is Dictionary) or not e.has("at") or not ends(e.get("use")):
			continue
		var p := Vector2i(int(e["at"][0]), int(e["at"][1]))
		var s := int(e.get("level", 0))
		var c := ld.cell_s(p.x, p.y, s)
		var f: int = int(c["f"]) if not c.is_empty() else s
		var meta: Dictionary = LM.model_meta(ld.kit_id, e["prop"]) if e.has("prop") else {}
		var on: Array = [p]
		if meta.get("mount", "") == "wall":
			on = LevelHung.along(ld, e, meta, p, ld.wall_side(p, e.get("face", ""), s))
		out.append(on.map(func(q: Vector2i) -> Vector3i: return Vector3i(q.x, q.y, f)))
	return out


## Does this use, or anything inside it (its effects, its options and theirs), end the expedition?
static func ends(v: Variant) -> bool:
	if v is Dictionary:
		if str(v.get("type", "")) == "end":
			return true
		for k in v:
			if ends(v[k]):
				return true
	elif v is Array:
		for x in v:
			if ends(x):
				return true
	return false


## A square of light on the floor of each way home, over the cells it is marked on: four strips just inside their
## edges, lit by themselves (no lamp, so the level has no more lights than before). One node each, with its half size
## across and along as meta "half" (x, z).
static func mark(level: Level, spots: Array) -> Array:
	var out: Array = []
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = color()
	for cells in spots:
		var lo := Vector2(cells[0].x, cells[0].y)
		var hi := lo
		for k in cells:
			lo = Vector2(minf(lo.x, k.x), minf(lo.y, k.y))
			hi = Vector2(maxf(hi.x, k.x), maxf(hi.y, k.y))
		var half := ((hi - lo) + Vector2.ONE) * level.C / 2.0 - Vector2(INSET, INSET)
		var sq := Node3D.new()
		sq.name = "WayHome_%d_%d" % [cells[0].x, cells[0].y]
		level.add_child(sq)
		var mid := (level.center(Vector2i(lo), 0.0) + level.center(Vector2i(hi), 0.0)) / 2.0
		sq.position = Vector3(mid.x, cells[0].z * level.H + LIFT, mid.z)
		sq.set_meta("half", half)
		for d in 4:
			var strip := MeshInstance3D.new()
			var bm := BoxMesh.new()
			bm.size = Vector3(half.x * 2.0 + STRIP, 0.02, STRIP) if d % 2 == 0 else Vector3(STRIP, 0.02, half.y * 2.0 + STRIP)
			bm.material = mat
			strip.mesh = bm
			strip.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			strip.position = Vector3(LevelData.DIRS[d].x * half.x, 0, LevelData.DIRS[d].y * half.y)
			sq.add_child(strip)
		out.append(sq)
	return out
