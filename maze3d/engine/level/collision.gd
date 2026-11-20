extends RefCounted
## LevelCollision - the solid world, as boxes on one static body: a slab for every storey's floor (open only where air
## goes on through), the rock that touches air, and the pieces that are not whole cells (cut corners, thin walls,
## balconies, the slopes into a pool).
class_name LevelCollision

var ld: LevelData
var body: StaticBody3D


func _init(data: LevelData, solid: StaticBody3D) -> void:
	ld = data
	body = solid


static func box(b: StaticBody3D, at: Vector3, size: Vector3) -> void:
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	cs.position = at
	b.add_child(cs)


static func shape(b: StaticBody3D, xf: Transform3D, size: Vector3) -> void:
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	cs.transform = xf
	b.add_child(cs)


func build() -> void:
	var C := ld.C
	var H := ld.H
	box(body, Vector3(ld.w * C / 2, ld.f_min * H - 0.9, ld.h * C / 2), Vector3(ld.w * C, 0.2, ld.h * C))      # under everything: nothing falls out of the world
	var sunk: float = ld.data.get("fluid", {}).get("level", 0.7)
	var top := ld.f_max + 1
	for f in ld.floors:
		for c in ld.floors[f]:
			top = maxi(top, f + int(c["height"]))
	_slabs(top, sunk)
	_rock(top)
	for f in ld.floors:                                 # the pieces that are not whole cells
		for y in ld.h:
			for x in ld.w:
				if not ld.cell(x, y, f)["solid"]:
					_cell_pieces(x, y, f, sunk)


## Every storey's floor, right across the map, open only where air goes on through: a room's floor, the ceiling of
## the one below, and a lid on the rock between. Runs of the same kind are one box.
func _slabs(top: int, sunk: float) -> void:
	for s in range(ld.f_min, top + 1):
		for y in ld.h:
			var x := 0
			while x < ld.w:
				var k: Array = _plane(x, y, s, sunk)
				var x0 := x
				x += 1
				while x < ld.w and _plane(x, y, s, sunk) == k:
					x += 1
				if not k.is_empty():
					box(body, Vector3((x0 + x) * ld.C / 2, k[0], y * ld.C + ld.C / 2), Vector3((x - x0) * ld.C, k[1], ld.C))


## Rock: storey by storey, whatever is not air and touches air.
func _rock(top: int) -> void:
	for s in range(ld.f_min, top):
		for y in ld.h:
			var x := 0
			while x < ld.w:
				if not ld.open_s(x, y, s) and _touches_open(x, y, s):
					var x0 := x
					while x < ld.w and not ld.open_s(x, y, s) and _touches_open(x, y, s):
						x += 1
					box(body, Vector3((x0 + x) * ld.C / 2, s * ld.H + ld.H / 2, y * ld.C + ld.C / 2), Vector3((x - x0) * ld.C, ld.H, ld.C))
				else:
					x += 1


func _cell_pieces(x: int, y: int, f: int, sunk: float) -> void:
	var C := ld.C
	var H := ld.H
	var c := ld.cell(x, y, f)
	var p := ld.center(Vector2i(x, y), f * H)
	var hh2: float = c["height"] * H
	if c["diag"] != "":
		shape(body, Transform3D(Basis(Vector3.UP, LevelData.DIAG[c["diag"]][1]), p + Vector3(0, hh2 / 2, 0)) * Transform3D(Basis(), Vector3(0, 0, -0.15)), Vector3(C * 1.4142, hh2, 0.3))
	for d in c["edges"].keys():
		var nb := ld.cell(x + LevelData.DIRS[d].x, y + LevelData.DIRS[d].y, f)
		if d == 1 or d == 2 or nb["solid"]:
			var kind: String = c["edges"][d]
			var ep := p + Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y) * (C / 2)
			var lo: float = H if kind == "window" else 0.0
			var hi: float = maxf(hh2, 0.0 if nb["solid"] else nb["height"] * H)      # as tall as the taller of the two rooms
			if hi > lo:
				shape(body, Transform3D(Basis(Vector3.UP, LevelData.DIR_ROT[d]), ep + Vector3(0, (lo + hi) / 2, 0)), Vector3(C, hi - lo, 0.3))
	for lv in c["decks"]:
		box(body, p + Vector3(0, lv * H - 0.15, 0), Vector3(C, 0.3, C))
	if c["fluid"]:
		_pool_slopes(x, y, f, c, p, sunk)


## The way in and out of a pool is a slope under the surface.
func _pool_slopes(x: int, y: int, f: int, c: Dictionary, p: Vector3, sunk: float) -> void:
	for d in 4:
		var nb2 := ld.cell(x + LevelData.DIRS[d].x, y + LevelData.DIRS[d].y, f)
		if nb2["solid"] or nb2["fluid"] or c["edges"].has(d):
			continue
		var inw := -Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y)
		var run := 1.3
		var along := inw * run + Vector3(0, -sunk, 0)
		var zb := along.normalized()
		var xb := Vector3.UP.cross(inw).normalized()
		var yb := zb.cross(xb).normalized()
		shape(body, Transform3D(Basis(xb, yb, zb), p - inw * (ld.C / 2 - run / 2) + Vector3(0, -sunk / 2, 0) - yb * 0.1), Vector3(ld.C, 0.2, along.length()))


## What lies in the plane between storey s - 1 and storey s at this cell: [y of its middle, its thickness], or [] where air
## goes straight through (a tall room, a pit, a lift shaft).
func _plane(x: int, y: int, s: int, sunk: float) -> Array:
	var above := ld.cell_s(x, y, s)
	var below := ld.cell_s(x, y, s - 1)
	if not above.is_empty() and (int(above["f"]) < s or above.get("pit", false)):
		return []
	if below.is_empty():                                 # rock below: a floor, or a lid on solid rock
		var drop: float = sunk if (not above.is_empty() and above["fluid"]) else 0.0
		return [s * ld.H - drop - 0.5, 1.0]
	if above.is_empty():                                 # rock above: a ceiling
		return [s * ld.H + 0.5, 1.0]
	return [s * ld.H - LevelData.UNDER / 2, LevelData.UNDER]      # a room on a room


func _touches_open(x: int, y: int, s := 0) -> bool:
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if ld.open_s(x + dx, y + dy, s):
				return true
	return false
