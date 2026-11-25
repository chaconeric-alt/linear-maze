extends RefCounted
## LevelHung - the wall faces a level gives the style's plain wall ("wall_plain" in the style, or else its commonest
## wall tile): those with a sign or a wall-mounted prop on them, or a piece of furniture standing back against them, so
## what hangs there is not lost among pipes and screens, and nothing stands in front of lockers or shelves that are part
## of the wall (Eric, 22 Nov: "if an object is meant to be against a wall, it should be against a bare wall"). A thing
## marked "crammed" (a room meant to be crammed full) stands in front of whatever the wall shows.
class_name LevelHung

## How near the wall's face the back of a piece of furniture must come to stand against it, in metres.
const AGAINST := 0.6


## Every such face of the level: Vector4i(x, y, storey, side) -> true.
static func find(ld: LevelData) -> Dictionary:
	var hung := {}
	for e in ld.data.get("things", []):
		if not (e is Dictionary) or not e.has("at") or e.get("crammed", false):
			continue
		var s := int(e.get("level", 0))
		var p := Vector2i(int(e["at"][0]), int(e["at"][1]))
		var meta: Dictionary = LM.model_meta(ld.kit_id, e["prop"]) if e.has("prop") else {}
		if e.has("sign") or meta.get("mount", "") == "wall":
			hung[Vector4i(p.x, p.y, s, ld.wall_side(p, e.get("face", ""), s))] = true
		elif e.has("prop"):
			for d in _backed(ld, e, meta, p, s):
				hung[Vector4i(p.x, p.y, s, d)] = true
	return hung


## The walls round its cell a piece of furniture stands back against: within AGAINST metres of the wall's face, by its
## size ("solid" in its model's meta: width, height, depth, the depth along the way it faces), where it faces and how
## far its "offset" moves it.
static func _backed(ld: LevelData, e: Dictionary, meta: Dictionary, p: Vector2i, s: int) -> Array:
	var out: Array = []
	var sz: Array = meta.get("solid", [1.0, 1.0, 1.0])
	var off: Vector3 = LM.vec(e.get("offset"), Vector3.ZERO)
	var facing: int = LevelData.DIR_NAMES.get(str(e.get("face", "s")), 2)
	var quarter := absf(absf(fmod(float(e.get("turn", 0.0)), 180.0)) - 90.0) < 10.0     # turned side on: its width faces the way it faces
	for d in 4:
		var n: Vector2i = p + LevelData.DIRS[d]
		if ld.open_s(n.x, n.y, s):
			continue
		var half: float = float(sz[2] if (d % 2 == facing % 2) != quarter else sz[0]) / 2.0
		if off.x * LevelData.DIRS[d].x + off.z * LevelData.DIRS[d].y + half >= ld.C / 2.0 - AGAINST:
			out.append(d)
	return out


## A style's plain wall tile: its "wall_plain", or else the commonest of its walls.
static func plain_wall(st: Dictionary) -> String:
	if st.has("wall_plain"):
		return st["wall_plain"]
	var list: Variant = st.get("wall")
	if list is String:
		return list
	var best := ""
	var bw := -1.0
	for it in list:
		var wgt: float = it[1] if it is Array else 1.0
		if wgt > bw:
			bw = wgt
			best = it[0] if it is Array else it
	return best
