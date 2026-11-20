extends RefCounted
## LevelSigns - lettering on a wall ("sign" in a level entry). It is shown on a monitor of its own: a dark screen in a
## bezel, standing off the wall far enough to clear whatever the wall has on it, with a mount behind it. "plain": true is
## bare lettering. The words are wrapped here (to "width" pixels; a word too long for it makes the lettering smaller) so
## the screen is exactly the size of what it shows. SPEC.md, "Easy mode" and "Levels".
class_name LevelSigns


static func make(level: Node3D, ld: LevelData, e: Dictionary, p: Vector2i) -> Node3D:
	var d := ld.wall_side(p, e.get("face", ""), int(e.get("level", 0)))
	var l := Label3D.new()
	l.text = e["sign"]
	l.font_size = int(e.get("size", 96))
	l.pixel_size = 0.004
	l.modulate = LM.col(e.get("color"), Color(1.0, 0.35, 0.7))
	l.outline_modulate = Color(0, 0, 0, 0.6)
	l.outline_size = 8
	l.shaded = false
	l.double_sided = false
	l.outline_size = 0
	var px := _wrap(l, minf(float(e.get("width", 800)), (ld.C - 0.7) / l.pixel_size))
	var sw: float = px.x + 0.3
	var sh: float = px.y + 0.2
	var st := int(e.get("level", 0))
	var out: float = e.get("out", 0.36)                 # how far the screen's face stands off the wall
	var root := Node3D.new()
	level.add_child(root)
	var yy: float = e.get("y", 2.6)
	if not e.get("plain", false):                       # all of it below the ceiling (lower under a room than under rock) and clear of the floor
		var top: float = ld.ceiling_y(p.x, p.y, st) - st * ld.H - 0.12
		yy = clampf(yy, sh / 2 + 0.2, maxf(sh / 2 + 0.2, top - sh / 2 - 0.07))
	root.position = ld.center(p, st * ld.H) + Vector3(LevelData.DIRS[d].x, 0, LevelData.DIRS[d].y) * (ld.C / 2 - out) + Vector3(0, yy, 0) + LM.vec(e.get("offset"), Vector3.ZERO)
	root.rotation.y = LevelData.DIR_ROT[d]
	root.add_child(l)
	if e.get("plain", false):
		l.outline_size = 8
		return root
	l.position.z = 0.012
	_monitor(root, l.modulate, sw, sh, out)
	return root


## Wrap the label's words to maxw pixels (shrinking the lettering if one word will not fit), and return the size of
## what it now shows, in metres.
static func _wrap(l: Label3D, maxw: float) -> Vector2:
	var fnt: Font = l.font if l.font != null else ThemeDB.fallback_font
	for word in l.text.replace("\n", " ").split(" ", false):
		var ww: float = fnt.get_string_size(word, HORIZONTAL_ALIGNMENT_LEFT, -1, l.font_size).x
		if ww > maxw:
			l.font_size = maxi(12, int(l.font_size * maxw / ww))
	var lines: Array = []
	for para in l.text.split("\n"):
		var cur := ""
		for word in para.split(" ", false):
			var tryl: String = word if cur == "" else cur + " " + word
			if cur != "" and fnt.get_string_size(tryl, HORIZONTAL_ALIGNMENT_LEFT, -1, l.font_size).x > maxw:
				lines.append(cur)
				cur = word
			else:
				cur = tryl
		lines.append(cur)
	l.text = "\n".join(lines)
	l.autowrap_mode = TextServer.AUTOWRAP_OFF
	var px := Vector2.ZERO
	for ln in lines:
		px.x = maxf(px.x, fnt.get_string_size(ln, HORIZONTAL_ALIGNMENT_LEFT, -1, l.font_size).x)
	px.y = lines.size() * (fnt.get_height(l.font_size) + l.line_spacing)
	return px * l.pixel_size


## The screen, its bezel, the arm that holds it off the wall, and a line of the sign's own colour under it.
static func _monitor(root: Node3D, tint: Color, sw: float, sh: float, out: float) -> void:
	var screen := MeshInstance3D.new()
	var qm := BoxMesh.new()
	qm.size = Vector3(sw, sh, 0.02)
	var sm := StandardMaterial3D.new()
	sm.albedo_color = Color(0.015, 0.02, 0.025)
	sm.emission_enabled = true
	sm.emission = Color(tint.r, tint.g, tint.b) * 0.06
	sm.roughness = 0.25
	qm.material = sm
	screen.mesh = qm
	root.add_child(screen)
	var bezel := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(sw + 0.14, sh + 0.14, 0.09)
	var bmat := StandardMaterial3D.new()
	bmat.albedo_color = Color(0.09, 0.1, 0.11)
	bmat.metallic = 0.6
	bmat.roughness = 0.45
	bm.material = bmat
	bezel.mesh = bm
	bezel.position.z = -0.05
	root.add_child(bezel)
	var arm := MeshInstance3D.new()                    # the mount, back to the wall
	var am := BoxMesh.new()
	am.size = Vector3(minf(0.5, sw * 0.5), minf(0.3, sh * 0.6), maxf(0.02, out - 0.09))
	am.material = bmat
	arm.mesh = am
	arm.position.z = -0.09 - am.size.z / 2
	root.add_child(arm)
	var glow := MeshInstance3D.new()
	var gm := BoxMesh.new()
	gm.size = Vector3(sw * 0.6, 0.02, 0.012)
	var gmat := StandardMaterial3D.new()
	gmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	gmat.albedo_color = tint
	gm.material = gmat
	glow.mesh = gm
	glow.position = Vector3(0, -sh / 2 - 0.035, -0.002)
	root.add_child(glow)
