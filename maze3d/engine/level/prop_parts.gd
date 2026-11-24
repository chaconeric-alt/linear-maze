extends RefCounted
## PropParts - what comes with a piece of furniture and is made with it: a chair in front of it ("seat"), chairs all
## round it ("around", at most "chairs" of them: a table and its chairs), something at its foot ("foot": a bed's
## footlocker), and the goods a container holds ("holds"). Each part is known by the piece's key and a suffix of its
## own (Spawner.key_part), so the level's memory can say it was broken or taken and it is not made again.
class_name PropParts

const SEAT_GAP := 0.25           # between a desk and the chair in front of it
const TABLE_GAP := 0.15          # between a table's edge and the chairs round it, and between those chairs
const FOOT_GAP := 0.1            # between a bed and its footlocker
const LONG := 1.8                # a table this long or longer has a chair at each end too


static func make(sp: Spawner, e: Dictionary, pr: Prop, meta: Dictionary) -> void:
	if e.has("seat"):
		_seat(sp, e, pr, meta)
	if e.has("foot"):
		_foot(sp, e, pr, meta)
	if e.has("around"):
		_around(sp, e, pr, meta)
	_holds(sp, e, pr, meta)


## How deep a piece stands out from where it is placed: all of it for one hung on a wall, half for anything else.
static func _depth(meta: Dictionary) -> float:
	return float(meta.get("solid", [1.0, 1.0, 1.0])[2]) * (1.0 if meta.get("mount", "") == "wall" else 0.5)


static func _part(sp: Spawner, id: String, at: Variant, pos: Vector3, yaw: float, suffix: String) -> void:
	var p := Prop.new()
	sp.level.add_child(p)
	p.position = pos
	p.rotation.y = yaw
	p.setup(sp.level, {"prop": id, "at": at}, sp.ld.kit_id)
	sp.key_part(p, suffix)
	if sp.part_gone(suffix):
		p.queue_free()                               # broken on an earlier visit


## A chair that goes with it: in front of it, facing it.
static func _seat(sp: Spawner, e: Dictionary, pr: Prop, meta: Dictionary) -> void:
	var sm := LM.model_meta(sp.ld.kit_id, e["seat"])
	var front := Vector3(sin(pr.rotation.y), 0, cos(pr.rotation.y))
	var d1: float = sm.get("solid", [1.0, 1.0, 1.0])[2] * 0.5
	var pos: Vector3 = pr.position + front * (_depth(meta) + float(e.get("seat_gap", SEAT_GAP)) + d1)
	_part(sp, e["seat"], e["at"], pos, pr.rotation.y + PI + deg_to_rad(float(e.get("seat_turn", 0.0))), "/seat")


## What stands at its foot (in front of it), facing the same way: a footlocker at the end of a bed.
static func _foot(sp: Spawner, e: Dictionary, pr: Prop, meta: Dictionary) -> void:
	var fm := LM.model_meta(sp.ld.kit_id, e["foot"])
	var front := Vector3(sin(pr.rotation.y), 0, cos(pr.rotation.y))
	var d1: float = fm.get("solid", [1.0, 1.0, 1.0])[2] * 0.5
	_part(sp, e["foot"], e["at"], pr.position + front * (_depth(meta) + FOOT_GAP + d1), pr.rotation.y, "/foot")


## Chairs all round a table, each facing it: as many as fit side by side along both long sides, then one at each end
## of a long table. They are placed from the middle out, a side at a time, so a table with fewer ("chairs") is still
## evenly laid.
static func _around(sp: Spawner, e: Dictionary, pr: Prop, meta: Dictionary) -> void:
	var sz: Array = meta.get("solid", [1.0, 1.0, 1.0])
	var cs: Array = LM.model_meta(sp.ld.kit_id, e["around"]).get("solid", [0.8, 1.0, 0.8])
	var cw := float(cs[0])
	var cd := float(cs[2])
	var long_x: bool = float(sz[0]) >= float(sz[2])
	var length := maxf(sz[0], sz[2])
	var breadth := minf(sz[0], sz[2])
	var per := maxi(1, int((length + TABLE_GAP) / (cw + TABLE_GAP)))
	var along: Array = []
	for i in per:
		along.append((i - (per - 1) / 2.0) * (cw + TABLE_GAP))
	along.sort_custom(func(a: float, b: float) -> bool: return absf(a) < absf(b) or (absf(a) == absf(b) and a < b))
	var spots: Array = []                            # [along the length, across it], in the table's own frame
	for a in along:
		for side in [1.0, -1.0]:
			spots.append(Vector2(a, side * (breadth / 2.0 + TABLE_GAP + cd / 2.0)))
	if length >= LONG and breadth >= cw:
		for side in [1.0, -1.0]:
			spots.append(Vector2(side * (length / 2.0 + TABLE_GAP + cd / 2.0), 0.0))
	var n := mini(spots.size(), int(e.get("chairs", spots.size())))
	for k in n:
		var s: Vector2 = spots[k]
		var local := Vector3(s.x, 0, s.y) if long_x else Vector3(s.y, 0, s.x)
		var pos: Vector3 = pr.position + Basis(Vector3.UP, pr.rotation.y) * local
		var to: Vector3 = pr.position - pos
		_part(sp, e["around"], e["at"], pos, atan2(to.x, to.z), "/around.%d" % k)


## A container: what it holds sits in its places, to be taken.
static func _holds(sp: Spawner, e: Dictionary, pr: Prop, meta: Dictionary) -> void:
	var slots: Array = meta.get("slots", [])
	var hi := 0
	for held in e.get("holds", []):
		if hi >= slots.size():
			break
		if sp.part_gone("/holds.%d" % hi):              # taken on an earlier visit
			hi += 1
			continue
		var ie: Dictionary = (held if held is Dictionary else {"item": held}).duplicate()
		ie["rest"] = true
		var pk := Pickup.new()
		sp.level.add_child(pk)
		pk.position = pr.transform * LM.vec(slots[hi])
		pk.setup(sp.level, ie, sp.ld.kit_id)
		sp.key_part(pk, "/holds.%d" % hi)
		hi += 1
