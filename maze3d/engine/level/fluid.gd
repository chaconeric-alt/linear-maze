extends RefCounted
## LevelFluid - standing water (or grease, or slime). A legend entry with "fluid": true floods its cells:
## {"~": {"fluid": true}}. The level's "fluid" gives the look: {"level": 0.7, "color": [0.1, 0.5, 0.4, 0.6], "glow": 0.3}.
## It is shallow: the player wades (slower), most things are slowed, and an actor with "swim" in its def swims.
class_name LevelFluid


static func build(level: Node3D, ld: LevelData) -> void:
	var spec: Dictionary = ld.data.get("fluid", {})
	var sunk: float = spec.get("level", 0.7)
	var c := LM.col(spec.get("color"), Color(0.1, 0.5, 0.4, 0.62))
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var sides: Array = []                            # the walls of the basin
	var lips: Array = []                             # the kerb round it, wherever you could walk in
	for f in ld.floors:
		for cy in ld.h:
			for cx in ld.w:
				if ld.cell(cx, cy, f)["fluid"]:
					_cell(ld, st, sides, lips, cx, cy, f, sunk)
	if sides.is_empty():
		return
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.roughness = 0.08
	m.metallic = 0.3
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.emission_enabled = true
	m.emission = Color(c.r, c.g, c.b)
	m.emission_energy_multiplier = spec.get("glow", 0.25)
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	level.add_child(mi)
	level.add_child(LevelBuilder.box_cloud(sides, Color(0.07, 0.08, 0.09), 0.0))
	level.add_child(LevelBuilder.box_cloud(lips, LM.col(spec.get("lip"), Color(0.62, 0.55, 0.3)), 0.25))


static func _cell(ld: LevelData, st: SurfaceTool, sides: Array, lips: Array, cx: int, cy: int, f: int, sunk: float) -> void:
	var C := ld.C
	var fc := ld.cell(cx, cy, f)
	var a := Vector3(cx * C, f * ld.H - 0.14, cy * C)
	for v in [Vector3(0, 0, 0), Vector3(C, 0, 0), Vector3(C, 0, C), Vector3(0, 0, 0), Vector3(C, 0, C), Vector3(0, 0, C)]:
		st.set_normal(Vector3.UP)
		st.add_vertex(a + v)
	var p := ld.center(Vector2i(cx, cy), f * ld.H)
	for d in 4:
		var nb := ld.cell(cx + LevelData.DIRS[d].x, cy + LevelData.DIRS[d].y, f)
		if nb["fluid"] and not fc["edges"].has(d):
			continue
		var hz := Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y)
		var xf := Transform3D(Basis(Vector3.UP, LevelData.DIR_ROT[d]), p + hz * (C / 2))
		sides.append(xf * Transform3D(Basis().scaled(Vector3(C, sunk + 0.02, 0.16)), Vector3(0, -sunk / 2, 0.08)))
		if not nb["solid"] and not fc["edges"].has(d) and nb["door"] == "":
			lips.append(xf * Transform3D(Basis().scaled(Vector3(C + 0.3, 0.13, 0.3)), Vector3(0, 0.065, -0.05)))
