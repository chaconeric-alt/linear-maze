class_name PromptMeasure
## PromptMeasure - what easy mode's image prompt (ImagePrompt) knows about a model from looking at it: its size, its
## triangle count, and its colour scheme. Every surface's colour is counted by the area it covers: a kit material by
## its entry in materials.json, a textured model by samples of its texture. Colours are named in words an image
## generator knows (nearest name in Oklab; greys by lightness), with the hex. Results are kept per model.

## Greys by lightness (Oklab L): a colour with next to no hue takes the first name whose limit is above its lightness.
## Material colours are albedo, so a "white" material is about 0.8 and is named as white is seen in the game.
const GREYS := [[0.25, "near-black"], [0.36, "charcoal"], [0.45, "dark grey"], [0.56, "gunmetal grey"], [0.67, "mid grey"],
	[0.78, "light grey"], [0.87, "off-white"], [2.0, "white"]]
const GREY_CHROMA := 0.025

## Colour names an image generator understands, with the colour each means. A colour with a hue takes the nearest name.
const COLOURS := [
	["cream", "E6D6AC"], ["warm grey", "8A8070"], ["taupe", "6B5F50"], ["beige", "C4AE88"], ["sand", "B89A68"], ["tan", "9C7A52"], ["khaki", "8E8A62"],
	["dark olive", "333D1F"], ["olive drab", "4B5320"], ["olive green", "6E7A2E"], ["dark brown", "3A2618"], ["brown", "6A4428"],
	["warm brown", "8C5A30"], ["rust brown", "7A3A1C"], ["umber", "5A4632"], ["oxblood", "4E1414"], ["maroon", "6E1E26"],
	["crimson", "9E1222"], ["red", "D42A20"], ["coral", "E8705A"], ["terracotta", "B85C3C"], ["burnt orange", "C2541A"],
	["orange", "F07A1E"], ["amber", "FFA733"], ["gold", "C9A23E"], ["mustard yellow", "C9A020"], ["yellow", "F2D21E"],
	["pale yellow", "F0E68C"], ["lime green", "9BD83A"], ["green", "3E9A40"], ["dark green", "1E4428"],
	["jade green", "2A6E52"], ["emerald green", "1DB27F"], ["sea green", "3C8C70"], ["mint", "98D8B8"], ["teal", "1A8085"], ["dark teal", "0E4A50"],
	["turquoise", "38C8C0"], ["cyan", "33E0FF"], ["sky blue", "86BEE6"], ["pale blue", "B8D4E8"], ["steel blue", "4A6A88"],
	["slate grey", "5A6470"], ["blue", "2456C8"], ["navy blue", "1A2448"], ["violet", "8A5AD8"], ["lavender", "B8A0E0"],
	["purple", "6A2A88"], ["deep purple", "2E0E3A"], ["plum", "5A2A48"], ["magenta", "E01E9A"], ["hot pink", "FF4DBF"],
	["pink", "F0A8C0"], ["dusty rose", "B8707C"],
]

static var _cache: Dictionary = {}      # measured models: key -> {size, bottom, tris, body, glow}
static var _tex_cache: Dictionary = {}  # sampled textures: rid -> PackedColorArray
static var _labs: Array = []


## A model measured once: key names it, make_it makes a fresh copy to measure (and free).
static func model(key: String, make_it: Callable, kit_id: String) -> Dictionary:
	if _cache.has(key):
		return _cache[key]
	var n: Node3D = make_it.call()
	if n == null:
		return {}
	var r := node(n, Transform3D(Basis.from_scale(n.scale), Vector3.ZERO), kit_id)
	n.free()
	_cache[key] = r
	return r


## Size, triangle count and colours of everything drawn under a node. xf0: the node's own frame (scale only).
static func node(root: Node, xf0: Transform3D, kit_id: String) -> Dictionary:
	var acc := {"aabb": null, "tris": 0, "body": {}, "glow": {}, "lock": false}
	_walk(root, xf0, kit_id, acc)
	if acc["aabb"] == null:
		return {}
	var box: AABB = acc["aabb"]
	return {"size": box.size, "bottom": box.position.y, "tris": acc["tris"], "body": _rank(acc["body"]), "glow": _rank(acc["glow"]), "lock": acc["lock"]}


static func _walk(n: Node, xf: Transform3D, kit_id: String, acc: Dictionary) -> void:
	if n is Node3D and not (n as Node3D).visible:
		return
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
		var mi := n as MeshInstance3D
		var mesh := mi.mesh
		var b: AABB = xf * mesh.get_aabb()
		acc["aabb"] = b if acc["aabb"] == null else (acc["aabb"] as AABB).merge(b)
		for s in mesh.get_surface_count():
			var at := _area(mesh, s, xf)
			acc["tris"] += at[1]
			var w: float = at[0] if at[0] >= 0.0 else 1.0
			_add_surface(mi.get_active_material(s), kit_id, w, acc)
	for c in n.get_children():
		_walk(c, xf * (c as Node3D).transform if c is Node3D else xf, kit_id, acc)


## [surface area in square metres (-1 if the mesh data cannot be read), triangle count].
static func _area(mesh: Mesh, s: int, xf: Transform3D) -> Array:
	if mesh is ArrayMesh and (mesh as ArrayMesh).surface_get_primitive_type(s) != Mesh.PRIMITIVE_TRIANGLES:
		return [0.0, 0]
	var arr := mesh.surface_get_arrays(s)
	if arr.is_empty() or arr[Mesh.ARRAY_VERTEX] == null:
		return [-1.0, 0]
	var v: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var idx: PackedInt32Array = arr[Mesh.ARRAY_INDEX] if arr[Mesh.ARRAY_INDEX] != null else PackedInt32Array()
	var n := idx.size() / 3 if not idx.is_empty() else v.size() / 3
	var step := maxi(1, n / 12000)               # a big model is sampled, not summed whole
	var bs := xf.basis
	var area := 0.0
	for t in range(0, n, step):
		var a: Vector3
		var b: Vector3
		var c: Vector3
		if idx.is_empty():
			a = v[t * 3]
			b = v[t * 3 + 1]
			c = v[t * 3 + 2]
		else:
			a = v[idx[t * 3]]
			b = v[idx[t * 3 + 1]]
			c = v[idx[t * 3 + 2]]
		area += (bs * (b - a)).cross(bs * (c - a)).length() * 0.5
	return [area * step, n]


## Add one surface's colours to the tally: a kit material by its name's entry in materials.json, anything else by the
## material itself (a textured model's texture is sampled, so its colours are counted by how much of it each covers).
static func _add_surface(mat: Material, kit_id: String, w: float, acc: Dictionary) -> void:
	if mat == null or w <= 0.0:
		return
	var name := mat.resource_name
	var p: Variant = LM.kits.get(kit_id, {}).get("materials", {}).get(name) if kit_id != "" else null
	if p is Dictionary:
		var sh: String = p.get("shader", "")
		var word := _word(name)
		if sh == "glow" or (sh == "" and p.has("emit")):
			_tally(acc["glow"], "{c} light", LM.col(p.get("emit", p.get("color"))), w)
		elif sh == "screen" or sh == "ad":
			_tally(acc["glow"], "{c} screen", LM.col(p.get("emit", p.get("color"))), w)
		elif name == "lock":
			acc["lock"] = true                    # a lock light: the game colours it by state
		else:
			_tally(acc["body"], _template(word, p.get("metal", 0.0), p.get("rough", 0.5)), LM.col(p.get("color")), w)
		return
	var word2 := _word(name)
	if mat is BaseMaterial3D:
		var bm := mat as BaseMaterial3D
		if bm.emission_enabled and bm.emission_energy_multiplier > 0.05 and bm.emission.get_luminance() > 0.05 and bm.albedo_texture == null:
			_tally(acc["glow"], "{c} light", bm.emission, w)
			return
		var tmpl := _template(word2, bm.metallic if bm.metallic_texture == null else 0.0, bm.roughness if bm.roughness_texture == null else 0.5)
		var px := _samples(bm.albedo_texture)
		if px.is_empty():
			_tally(acc["body"], tmpl, bm.albedo_color, w)
		else:
			var each := w / px.size()
			for c in px:
				if c.a > 0.1:
					_tally(acc["body"], tmpl, c * bm.albedo_color, each)
		return
	if mat is ShaderMaterial:
		var sm := mat as ShaderMaterial
		var tex: Texture2D = null
		var col := Color(0.5, 0.5, 0.5)
		if sm.shader != null:
			for u in sm.shader.get_shader_uniform_list():
				var v: Variant = sm.get_shader_parameter(u["name"])
				if v is Texture2D and tex == null and (str(u["name"]).contains("albedo") or str(u["name"]).contains("tex")):
					tex = v
				elif v is Color and str(u["name"]) in ["albedo", "color", "emission"]:
					col = v
		var px2 := _samples(tex)
		if px2.is_empty():
			_tally(acc["body"], _template(word2, 0.0, 0.5), col, w)
		else:
			for c in px2:
				_tally(acc["body"], _template(word2, 0.0, 0.5), c, w / px2.size())


## A kit material's name as a phrase: "{c} leather", "burnished gold"; "" if the name says nothing about the material.
## The phrases are the game's prompts.json "materials"; "material_prefixes" are kit prefixes to look past ("an_steel").
static func _word(name: String) -> String:
	var words: Dictionary = LM.prompts.get("materials", {})
	var s := name
	for pre in LM.prompts.get("material_prefixes", []):
		if s.begins_with(pre) and not words.has(s):
			s = s.substr(str(pre).length())
	if words.has(s):
		return words[s]
	var r := RegEx.create_from_string("^(.*?)(_[a-z]|_?\\d+)$")
	var mm := r.search(s)
	if mm != null and words.has(mm.get_string(1)):
		return words[mm.get_string(1)]
	return ""


static func _template(word: String, metal: float, rough: float) -> String:
	if word != "":
		return word
	if metal >= 0.6:
		return "{c} metal"
	if rough <= 0.2:
		return "glossy {c}"
	if rough >= 0.85:
		return "matte {c}"
	return "{c}"


static func _tally(into: Dictionary, tmpl: String, c: Color, w: float) -> void:
	var cname := _colour_name(c)
	var phrase := tmpl.format({"c": cname}) if tmpl.contains("{c}") else tmpl
	if not into.has(phrase):
		into[phrase] = {"w": 0.0, "r": 0.0, "g": 0.0, "b": 0.0}
	var e: Dictionary = into[phrase]
	e["w"] += w
	e["r"] += c.r * w
	e["g"] += c.g * w
	e["b"] += c.b * w


## [[phrase, "#RRGGBB", share of the whole], ...], biggest first.
static func _rank(tally: Dictionary) -> Array:
	var total := 0.0
	for k in tally:
		total += tally[k]["w"]
	var out: Array = []
	if total <= 0.0:
		return out
	for k in tally:
		var e: Dictionary = tally[k]
		var c := Color(e["r"] / e["w"], e["g"] / e["w"], e["b"] / e["w"]).clamp()
		out.append([k, "#" + c.to_html(false).to_upper(), e["w"] / total])
	out.sort_custom(func(a, b): return a[2] > b[2])
	return out


## Up to 576 colours sampled evenly from a texture, read from a small mipmap so a 4K texture costs little.
static func _samples(tex: Texture2D) -> PackedColorArray:
	if tex == null:
		return PackedColorArray()
	var key := tex.get_rid().get_id()
	if _tex_cache.has(key):
		return _tex_cache[key]
	var out := PackedColorArray()
	var img: Image = tex.get_image()
	if img != null and not img.is_empty():
		img = _small_mip(img)
		var ok := true
		if img.is_compressed():
			ok = img.decompress() == OK
		if ok:
			img.convert(Image.FORMAT_RGBA8)
			if img.get_width() > 24 or img.get_height() > 24:
				img.resize(24, 24, Image.INTERPOLATE_BILINEAR)
			for y in img.get_height():
				for x in img.get_width():
					out.append(img.get_pixel(x, y))
	_tex_cache[key] = out
	return out


## The first mipmap no wider than 64 pixels, as an image of its own; the image itself if it has no mipmaps.
static func _small_mip(img: Image) -> Image:
	if not img.has_mipmaps():
		return img.duplicate() as Image
	var w := img.get_width()
	var h := img.get_height()
	var lvl := 0
	while (w > 64 or h > 64) and lvl < img.get_mipmap_count():
		lvl += 1
		w = maxi(1, w >> 1)
		h = maxi(1, h >> 1)
	if lvl == 0 or w < 4 or h < 4:
		return img.duplicate() as Image
	var data := img.get_data()
	var from := img.get_mipmap_offset(lvl)
	var to := img.get_mipmap_offset(lvl + 1) if lvl < img.get_mipmap_count() else data.size()
	var small := Image.create_from_data(w, h, false, img.get_format(), data.slice(from, to))
	return small if small != null and not small.is_empty() else img.duplicate() as Image


static func _colour_name(c: Color) -> String:
	if _labs.is_empty():
		for e in COLOURS:
			_labs.append([e[0], _oklab(Color.html(e[1]))])
	var lab := _oklab(c)
	if Vector2(lab.y, lab.z).length() < GREY_CHROMA:
		for g in GREYS:
			if lab.x < g[0]:
				return g[1]
	var best := ""
	var best_d := INF
	for e in _labs:
		var d: float = lab.distance_squared_to(e[1])
		if d < best_d:
			best_d = d
			best = e[0]
	return best


static func _oklab(c: Color) -> Vector3:
	var lc := c.srgb_to_linear()
	var l := pow(maxf(0.0, 0.4122214708 * lc.r + 0.5363325363 * lc.g + 0.0514459929 * lc.b), 1.0 / 3.0)
	var m := pow(maxf(0.0, 0.2119034982 * lc.r + 0.6806995451 * lc.g + 0.1073969566 * lc.b), 1.0 / 3.0)
	var s := pow(maxf(0.0, 0.0883024619 * lc.r + 0.2817188376 * lc.g + 0.6299787005 * lc.b), 1.0 / 3.0)
	return Vector3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)
