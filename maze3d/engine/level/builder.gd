extends RefCounted
## LevelBuilder - puts up the place a LevelData describes: the solid and glass bodies, the shell (floors, walls,
## ceilings, slabs between storeys, balconies, railings, ramps, thin windows) batched into MultiMeshes, the fluid, and
## the environment (fog, glow, ambient light). Collision is LevelCollision; the walking graph is LevelNav.
## Every random choice comes from ld.rng, in the order the cells are visited, so a level always looks the same.
class_name LevelBuilder

const GLASS := 32                # collision layer of things that stop bodies and shots but not sight

var level: Node3D
var ld: LevelData
var lights: LevelLights
var solid: StaticBody3D
var glass: StaticBody3D
var env: Environment
var tiles_at: Dictionary = {}    # Vector2i -> [[tile id, where it was laid], ..]: which tile is where (Identify)
var _boxes: Array = []           # unit cubes that make decks, ramps and railings
var _rails: Array = []


func _init(lv: Node3D, data: LevelData, lit: LevelLights) -> void:
	level = lv
	ld = data
	lights = lit


func make_bodies() -> void:
	solid = StaticBody3D.new()
	solid.name = "Solid"
	solid.collision_layer = 1
	solid.collision_mask = 0
	level.add_child(solid)
	glass = StaticBody3D.new()
	glass.name = "Glass"
	glass.collision_layer = GLASS
	glass.collision_mask = 0
	level.add_child(glass)


# ------------------------------------------------------------------ floors, walls, ceilings
func build_shell() -> void:
	var batches: Dictionary = {}       # "tile|cx|cy" -> Array[Transform3D]
	var styles: Dictionary = ld.kit["styles"]
	var sunk: float = ld.data.get("fluid", {}).get("level", 0.7)
	for f in ld.floors:
		for y in ld.h:
			for x in ld.w:
				_shell_cell(batches, styles, x, y, f, sunk)
	var holder := Node3D.new()
	holder.name = "Shell"
	level.add_child(holder)
	for pair in [[_boxes, Color(0.11, 0.12, 0.14), 0.0], [_rails, Color(0.75, 0.5, 0.2), 0.5]]:
		if not (pair[0] as Array).is_empty():
			holder.add_child(box_cloud(pair[0], pair[1], pair[2]))
	for key in batches:
		var parts: PackedStringArray = key.split("|")
		var mesh := LM.tile_mesh(ld.kit_id, parts[0])
		if mesh == null:
			continue
		var list: Array = batches[key]
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = list.size()
		for i in list.size():
			mm.set_instance_transform(i, list[i])
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		holder.add_child(mmi)


func _shell_cell(batches: Dictionary, styles: Dictionary, x: int, y: int, f: int, sunk: float) -> void:
	var c := ld.cell(x, y, f)
	if c["solid"]:
		return
	var st: Dictionary = styles.get(c["style"], styles.values()[0])
	var p := ld.center(Vector2i(x, y), f * ld.H)
	var hh: int = c["height"]
	var room: String = c["room"]
	var quarter := ld.rng.randi() % 4 * PI / 2
	if not c.get("pit", false):                          # a pit has a trapdoor for a floor; a pool's floor is down in the pool
		# a floor above the lowest is laid 12 mm proud: the walls of a narrower room below reach exactly to its top face, and two faces in one plane flicker
		_add(batches, ld.pick(st.get("floor")), Transform3D(Basis(Vector3.UP, quarter), p - Vector3(0, sunk if c["fluid"] else (-0.012 if f > ld.f_min else 0.0), 0)), x, y, room)
	var ceil_tile := ld.pick(st.get("ceiling"))
	var li: Dictionary = ld.lights_for(st, room)
	if not li.is_empty() and c["door"] == "":
		var every: int = int(li.get("every", 3))
		if (x + int(li.get("ox", 0))) % every == 0 and (y + int(li.get("oy", 0))) % every == 0:
			ceil_tile = li.get("tile", ceil_tile) if ld.rng.randf() >= li.get("dead", 0.0) else li.get("dead_tile", ceil_tile)
	_ceiling(batches, ceil_tile, x, y, f, p, hh, room, st)
	var closed: Array = LevelData.DIAG[c["diag"]][0] if c["diag"] != "" else []
	if c["diag"] != "":                              # a wall across the corner, a diagonal long
		for lv in hh:
			var dt := ld.pick(st.get("wall") if lv == 0 else st.get("wall_upper", st.get("wall")))
			_add(batches, dt, Transform3D(Basis(Vector3.UP, LevelData.DIAG[c["diag"]][1]).scaled_local(Vector3(1.4142, 1, 1)), p + Vector3(0, lv * ld.H, 0)), x, y, room, st)
	for d in 4:
		if not d in closed:
			_walls(batches, c, x, y, f, d, p, st)
	_balconies_and_rails(batches, c, x, y, f, p, quarter, st)
	if not c["ramp"].is_empty():
		_ramp(x, y, c, ld.pick(st.get("floor")), batches, room)


func _ceiling(batches: Dictionary, ceil_tile: String, x: int, y: int, f: int, p: Vector3, hh: int, room: String, st: Dictionary) -> void:
	var above := ld.cell(x, y, f + hh)
	if above.get("pit", false):                          # ... and the room under a pit has a hole in its ceiling
		pass
	elif not above["solid"]:                             # a room right on top of this one: ceiling tiles stand too tall to fit under
		_boxes.append(Transform3D(Basis().scaled(Vector3(ld.C, 0.2, ld.C)), p + Vector3(0, hh * ld.H - 0.105, 0)))      # its floor: the slab between the two rooms. Thin, and at the top: ceiling tiles are modelled upward from their face, so the tile fills the rest of the gap from below
		_add(batches, ceil_tile, _under(ceil_tile, p + Vector3(0, hh * ld.H - LevelData.UNDER, 0), LevelData.UNDER - 0.22), x, y, room, st, hh)      # ... and this room's own ceiling on the underside of it
	else:
		_add(batches, ceil_tile, Transform3D(Basis(Vector3.UP, ld.rng.randi() % 4 * PI / 2), p + Vector3(0, hh * ld.H, 0)), x, y, room, st, hh)


## Storey by storey up side d: wall wherever there is no air on the other side.
func _walls(batches: Dictionary, c: Dictionary, x: int, y: int, f: int, d: int, p: Vector3, st: Dictionary) -> void:
	var n: Vector2i = Vector2i(x, y) + LevelData.DIRS[d]
	var edge: String = c["edges"].get(d, "")
	var hz := Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y)
	if edge == "window" and (d == 1 or d == 2 or ld.cell(n.x, n.y, f)["solid"]):
		_thin_window(p + hz * (ld.C / 2), d)
	var wp := p + hz * (ld.C / 2 - (0.15 if edge != "" else 0.0))     # a thin wall: each side shows its own face
	for lv in int(c["height"]):
		var need: bool = not (edge == "window" and lv == 0) if edge != "" else not ld.open_s(n.x, n.y, f + lv)
		if need:
			var tile := ld.pick(st.get("wall") if lv == 0 else st.get("wall_upper", st.get("wall")))
			if lv == 0 and ld.hung.has(Vector4i(x, y, f, d)):      # something hangs here: the plain wall, so it is not lost among pipes and screens
				tile = LevelHung.plain_wall(st)
			_add(batches, tile, Transform3D(Basis(Vector3.UP, LevelData.DIR_ROT[d]), wp + Vector3(0, lv * ld.H, 0)), x, y, c["room"], st)


## A rail wherever a floor or a balcony ends in a drop; a balcony is a slab and a floor on it, and a ceiling on its underside.
func _balconies_and_rails(batches: Dictionary, c: Dictionary, x: int, y: int, f: int, p: Vector3, quarter: float, st: Dictionary) -> void:
	var room: String = c["room"]
	for lv in [0] + c["decks"]:
		if lv > 0:
			_boxes.append(Transform3D(Basis().scaled(Vector3(ld.C - 0.03, 0.3, ld.C - 0.03)), p + Vector3(0, lv * ld.H - 0.17, 0)))      # a little inside the floor tile on it, so their edges are not drawn in the same place
			var under_tile := ld.pick(st.get("ceiling"))
			_add(batches, under_tile, _under(under_tile, p + Vector3(0, lv * ld.H - 0.55, 0), 0.24), x, y, room)      # below the slab, not inside it
			_add(batches, ld.pick(st.get("floor")), Transform3D(Basis(Vector3.UP, quarter), p + Vector3(0, lv * ld.H, 0)), x, y, room)
		elif c["door"] != "" or c.has("lift"):
			continue
		for d in 4:
			if _needs_rail(x, y, f, lv, d):
				_rail(Transform3D(Basis(Vector3.UP, LevelData.DIR_ROT[d]), p + Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y) * (ld.C / 2 - 0.08) + Vector3(0, lv * ld.H, 0)), ld.C)


## Is there a drop off this side of a floor (lv 0) or a balcony lv storeys up?
func _needs_rail(x: int, y: int, f: int, lv: int, d: int) -> bool:
	var c := ld.cell(x, y, f)
	if c["edges"].has(d) or (c["diag"] != "" and d in LevelData.DIAG[c["diag"]][0]):
		return false
	var s := f + lv
	var nb := ld.cell_s(x + LevelData.DIRS[d].x, y + LevelData.DIRS[d].y, s)
	if nb.is_empty() or nb["door"] != "" or nb["window"] != "" or nb.has("lift"):
		return false                                 # a wall there, or the way on
	if int(nb["f"]) == s or nb["decks"].has(s - int(nb["f"])):
		return false                                 # floor carries on
	var r: Dictionary = nb["ramp"]
	if not r.is_empty():                             # a ramp that arrives here, or leaves from here
		var rd: int = LevelData.DIR_NAMES.get(r.get("dir", "n"), 0)
		if rd == (d + 2) % 4 and absf(float(r.get("to", 0)) - s * ld.H) < 0.1:
			return false
		if rd == d and absf(float(r.get("from", 0)) - s * ld.H) < 0.1:
			return false
	return true


## A railing along local X, centred on xf, standing on xf's origin. Its collision too, on the glass layer (LevelPerception).
func _rail(xf: Transform3D, length: float) -> void:
	for hgt in [0.55, 1.05]:
		_rails.append(xf * Transform3D(Basis().scaled(Vector3(length, 0.06, 0.06)), Vector3(0, hgt, 0)))
	var n := int(max(2, round(length / 1.34) + 1))
	for i in n:
		_boxes.append(xf * Transform3D(Basis().scaled(Vector3(0.07, 1.08, 0.07)), Vector3(-length / 2 + 0.05 + (length - 0.1) * i / (n - 1), 0.54, 0)))
	LevelCollision.shape(glass, xf * Transform3D(Basis(), Vector3(0, 0.56, 0)), Vector3(length, 1.12, 0.12))      # it stops bodies and shots; it is bars, so not sight


func _ramp(x: int, y: int, c: Dictionary, tile: String, batches: Dictionary, room: String) -> void:
	var r: Dictionary = c["ramp"]
	var d: int = LevelData.DIR_NAMES.get(r.get("dir", "n"), 0)
	var y0: float = float(r.get("from", 0))
	var y1: float = float(r.get("to", 2))
	var hz := Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y)
	var along := (hz * ld.C + Vector3(0, y1 - y0, 0))
	var length := along.length()
	var zb := along / length
	var xb := Vector3.UP.cross(hz).normalized()
	var yb := zb.cross(xb).normalized()
	var top := Transform3D(Basis(xb, yb, zb), ld.center(Vector2i(x, y)) + Vector3(0, (y0 + y1) / 2, 0))
	_boxes.append(top * Transform3D(Basis().scaled(Vector3(ld.C - 0.03, 0.3, length - 0.03)), Vector3(0, -0.17, 0)))
	LevelCollision.shape(solid, top * Transform3D(Basis(), Vector3(0, -0.15, 0)), Vector3(ld.C, 0.3, length))
	_add(batches, tile, top * Transform3D(Basis().scaled(Vector3(1, 1, length / ld.C)), Vector3.ZERO), x, y, room)
	for s in [-1, 1]:                                # a rail down each side, unless a wall is there
		var sd := (d + (1 if s > 0 else 3)) % 4
		var side := ld.cell(x + LevelData.DIRS[sd].x, y + LevelData.DIRS[sd].y, c["f"])
		var sr: Dictionary = side["ramp"]
		if side["solid"] or (not sr.is_empty() and sr.get("dir", "") == r.get("dir", "") and float(sr.get("from", 0)) == y0):
			continue
		var xf := top * Transform3D(Basis(Vector3.UP, PI / 2), Vector3((ld.C / 2 - 0.08) * (1.0 if xb.dot(Vector3(LevelData.DIRS[sd].x, 0, LevelData.DIRS[sd].y)) > 0 else -1.0), 0, 0))
		_rail(xf, length)


func _thin_window(at: Vector3, d: int) -> void:
	var inst := LM.spawn_model(ld.kit_id, "window_obs")
	if inst == null:
		return
	level.add_child(inst)
	inst.position = at
	inst.rotation.y = LevelData.DIR_ROT[d]
	inst.scale = Vector3(1, 1, 0.45)
	LevelCollision.shape(glass, Transform3D(Basis(Vector3.UP, LevelData.DIR_ROT[d]), at + Vector3(0, ld.H / 2, 0)), Vector3(ld.C, ld.H, 0.3))


## Where a ceiling tile goes when there is a floor right on top of it (a room over a room, the underside of a balcony).
## A ceiling tile is modelled to stand up into empty rock, as much as 1.4 m for a vault; here it has only `room` metres
## before it would come through the floor above. So it is hung at the underside and pressed flat to fit: the same
## panels, beams and fittings, shallower.
func _under(tile: String, at: Vector3, room: float) -> Transform3D:
	var tall := 0.6
	var mesh := LM.tile_mesh(ld.kit_id, tile) if tile != "" else null
	if mesh != null:
		var bb := mesh.get_aabb()
		tall = maxf(0.05, bb.position.y + bb.size.y)
	var squash := minf(1.0, room / tall)
	return Transform3D(Basis(Vector3.UP, ld.rng.randi() % 4 * PI / 2).scaled_local(Vector3(1, squash, 1)), at)


func _add(batches: Dictionary, tile: String, xf: Transform3D, x: int, y: int, room: String, st: Dictionary = {}, storeys := 1) -> void:
	if tile == "":
		return
	var key := "%s|%d|%d" % [tile, x / 6, y / 6]
	if not batches.has(key):
		batches[key] = []
	batches[key].append(xf)
	if not tiles_at.has(Vector2i(x, y)):
		tiles_at[Vector2i(x, y)] = []
	tiles_at[Vector2i(x, y)].append([tile, xf.origin])
	var meta: Dictionary = ld.kit["tiles"].get(tile, {})
	if meta.has("light"):
		var li: Dictionary = ld.lights_for(st, room)
		var spec: Dictionary = meta["light"]
		if storeys > 1 and meta.get("kind", "") == "ceiling":      # a light high up has further to reach
			spec = spec.duplicate()
			spec["range"] = spec.get("range", 8.0) + 6.0 * (storeys - 1)
			spec["energy"] = spec.get("energy", 1.0) * (1.0 + 0.9 * (storeys - 1))
		lights.make(spec, xf, room, li.get("flicker", 0.0), li.get("shadows", meta.get("kind", "") == "ceiling"), li.get("energy", 1.0))


## Many boxes, one draw: each transform is a unit cube's.
static func box_cloud(lst: Array, color: Color, glow: float) -> MultiMeshInstance3D:
	var bm := MultiMesh.new()
	bm.transform_format = MultiMesh.TRANSFORM_3D
	bm.mesh = BoxMesh.new()
	bm.instance_count = lst.size()
	for i in lst.size():
		bm.set_instance_transform(i, lst[i])
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.metallic = 0.7
	mat.roughness = 0.45
	if glow > 0.0:
		mat.emission_enabled = true
		mat.emission = color
		mat.emission_energy_multiplier = glow
	var bi := MultiMeshInstance3D.new()
	bi.multimesh = bm
	bi.material_override = mat
	return bi


# ------------------------------------------------------------------ the rest of the place
func build_collision() -> void:
	LevelCollision.new(ld, solid).build()


func build_nav() -> LevelNav:
	var nav := LevelNav.new(ld)
	nav.build()
	return nav


func build_fluid() -> void:
	LevelFluid.build(level, ld)


func build_environment() -> void:
	env = LevelEnvironment.build(level, ld)
