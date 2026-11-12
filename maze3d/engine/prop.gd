extends StaticBody3D
## Prop - a kit model standing in the world: machines, terminals, containers, furniture.
## What it does when used or shot comes from the level entry that placed it (SPEC.md, "Props").
class_name Prop

var level: Level
var e: Dictionary
var meta: Dictionary
var kit_id: String
var inst: Node3D
var hp := 0.0
var used := 0
var tag := ""
var _spin: Array = []
var _parts: Array = []
var _open := 0.0
var _open_target := 0.0
var _label: Label3D
var _lockmat: StandardMaterial3D
var _walk: Dictionary = {}
var _walk_left := 0
var _walk_cool := 0.0
var _side := 0.0
var _bar: Node3D
var _bar_rest := Vector3.ZERO
var _rattle := 0.0


func setup(lv: Level, entry: Dictionary, kit: String) -> void:
	level = lv
	e = entry
	kit_id = kit
	tag = e.get("tag", "")
	meta = LM.model_meta(kit, e["prop"])
	_lockmat = StandardMaterial3D.new()
	_lockmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_glow(Door.OPEN_COLOR)
	inst = LM.spawn_model(kit, e["prop"], {"lock": _lockmat})
	add_child(inst)
	for b in meta.get("solids", []):          # several boxes: [x, y, z, width, height, depth]
		var bs := CollisionShape3D.new()
		var bb := BoxShape3D.new()
		bb.size = Vector3(b[3], b[4], b[5])
		bs.shape = bb
		bs.position = Vector3(b[0], b[1], b[2])
		add_child(bs)
	if meta.has("walk") or e.has("walk"):      # a scanner arch: something happens when you walk through
		_walk = meta.get("walk", {}).duplicate(true)
		for k in e.get("walk", {}):
			_walk[k] = e["walk"][k]
		_walk_left = int(_walk.get("charges", -1))
		_glow(LM.col(_walk.get("color"), Door.OPEN_COLOR))
		_bar = LM.find_node(inst, "scanbar")
		if _bar:
			_bar_rest = _bar.position
	collision_layer = 1
	collision_mask = 0
	if meta.has("solid") and e.get("solid", true):
		var s: Array = meta["solid"]
		var cs := CollisionShape3D.new()
		var b := BoxShape3D.new()
		b.size = Vector3(s[0], s[1], s[2])
		cs.shape = b
		cs.position = Vector3(0, s[1] / 2 if meta.get("mount", "") != "wall" else 1.4, s[2] / 2 if meta.get("mount", "") == "wall" else 0.0)
		if meta.get("mount", "") == "wall":
			b.size.y = 2.4
		add_child(cs)
	if meta.has("light") and e.get("lit", true):
		var l := level._make_light(meta["light"], global_transform, level.room_at(level.cell_of(global_position)), 0.0, false)
		l.set_meta("prop", true)
	for name in meta.get("spin", {}):
		var n := LM.find_node(inst, name)
		if n:
			_spin.append([n, deg_to_rad(meta["spin"][name])])
	for name in meta.get("parts", {}):
		var n2 := LM.find_node(inst, name)
		if n2:
			_parts.append({"n": n2, "rest": n2.transform, "spec": meta["parts"][name]})
	if e.has("hp"):
		hp = e["hp"]
		add_to_group("breakable")
	if e.has("use"):
		add_to_group("usable")
	if e.has("screen") and meta.has("screen"):
		var sc: Dictionary = meta["screen"]
		_label = Label3D.new()
		_label.text = e["screen"]
		_label.font_size = 28
		_label.pixel_size = 0.0022
		_label.width = sc["size"][0] / 0.0022 * 0.9
		_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_label.modulate = Color(0.5, 1.0, 0.9)
		_label.shaded = false
		_label.position = LM.vec(sc["at"]) + Vector3(0, 0, 0.012)
		_label.rotation.x = deg_to_rad(sc.get("tilt", 0.0))
		add_child(_label)
	set_process(not _spin.is_empty() or not _parts.is_empty() or not _walk.is_empty())


func _glow(c: Color, k := 2.5) -> void:
	_lockmat.albedo_color = Color(c.r * k, c.g * k, c.b * k)


func _process(dt: float) -> void:
	for s in _spin:
		s[0].rotate_y(s[1] * dt)
	if not _walk.is_empty():
		_walk_tick(dt)
	if e.get("rattle", false) and used == 0 and Game.player:
		# something inside wants out: the door shivers now and then, if you are near enough to notice
		_rattle -= dt
		if _rattle <= 0.0 and Game.player.global_position.distance_to(global_position) < 9.0:
			_rattle = randf_range(1.6, 4.5)
			LM.sound("rattle", global_position, -4.0)
			for p in _parts:
				var n: Node3D = p["n"]
				var rest: Transform3D = p["rest"]
				var tw := n.create_tween()
				for i in 4:
					tw.tween_property(n, "rotation:y", rest.basis.get_euler().y + (0.05 if i % 2 == 0 else -0.02), 0.045)
				tw.tween_property(n, "rotation:y", rest.basis.get_euler().y, 0.05)
	if _open != _open_target:
		_open = move_toward(_open, _open_target, dt / max(0.05, meta.get("time", 0.5)))
		for p in _parts:
			var spec: Dictionary = p["spec"]
			var k := _open * _open * (3.0 - 2.0 * _open)
			var rest: Transform3D = p["rest"]
			var xf := rest
			if spec.has("rot_axis"):
				xf.basis = rest.basis * Basis(LM.vec(spec["rot_axis"]).normalized(), deg_to_rad(spec.get("rot_deg", 0.0)) * k)
			xf.origin = rest.origin + LM.vec(spec.get("move")) * k
			p["n"].transform = xf


# ------------------------------------------------------------------ walking through it (arches)
func _walk_tick(dt: float) -> void:
	_walk_cool -= dt
	var pl: Node3D = Game.player
	if pl == null or not is_instance_valid(pl) or pl.dead:
		return
	var lp: Vector3 = global_transform.affine_inverse() * pl.global_position
	var op: Array = meta.get("opening", [1.25, 2.9])
	var inside: bool = abs(lp.x) < op[0] and lp.y < op[1]
	var was := _side
	_side = signf(lp.z) if abs(lp.z) > 0.05 else _side
	if not inside or was == 0.0 or was == _side or abs(lp.z) > 1.5:
		return
	# they have just crossed the plane of the arch
	if _walk_cool > 0.0 or (_walk.get("once", false) and used > 0):
		return
	_walk_cool = _walk.get("cooldown", 2.0)
	var ctx := {"at": global_position, "prop": self}
	_sweep()
	if _walk_left == 0:
		Game.say(_walk.get("empty_text", "Nothing happens."), "info")
		return
	var need: String = _walk.get("need", "")
	if (need == "hurt" and pl.hp >= pl.max_hp) or (need == "armed" and pl.weapons.size() <= 1) or (_walk.has("when") and not Game.has_flag(_walk["when"])) \
			or (_walk.has("unless") and Game.has_flag(_walk["unless"])):
		if _walk.has("idle_text"):
			Game.say(_walk["idle_text"], "info")
		LM.sound("click", global_position)
		return
	var cost: int = int(_walk.get("cost", 0))
	if cost > 0:
		if Game.credits < cost:
			Game.run_effects(_walk.get("fail"), ctx)
			Fx.sparks(level, pl.global_position + Vector3(0, 1.0, 0), LM.col(_walk.get("color")), 14, 5.0)
			return
		Game.add_credits(-cost)
	used += 1
	if _walk_left > 0:
		_walk_left -= 1
		if _walk_left == 0:
			_glow(Color(0.25, 0.25, 0.28), 1.0)
	LM.sound(_walk.get("sound", "use"), global_position)
	Fx.flash(level, global_position + Vector3(0, 1.6, 0), LM.col(_walk.get("color")), 4.0, 7.0, 0.4)
	Game.run_effects(_walk.get("effects"), ctx)
	if tag != "":
		level.notify("walk", tag)


func _sweep() -> void:
	if _bar == null:
		return
	var tw := _bar.create_tween()
	tw.tween_property(_bar, "position:y", _bar_rest.y - meta.get("opening", [1.25, 2.9])[1] + 0.25, 0.35)
	tw.tween_property(_bar, "position:y", _bar_rest.y, 0.35)


func set_enabled(on: bool) -> void:
	if not on and not _walk.is_empty():
		_walk_left = 0
		_glow(Color(0.25, 0.25, 0.28), 1.0)


# ------------------------------------------------------------------ using it
func prompt() -> String:
	var u: Dictionary = e.get("use", {})
	if u.is_empty():
		return ""
	if u.get("once", u.get("type", "") in ["cache", "locker"]) and used > 0:
		return ""
	if u.has("when") and not Game.has_flag(u["when"]):
		return u.get("locked_prompt", "")
	return u.get("prompt", "Use")


func use(_player: Node) -> void:
	var u: Dictionary = e.get("use", {})
	if prompt() == "":
		return
	if u.has("when") and not Game.has_flag(u["when"]):
		Game.say(u.get("locked", "Nothing happens."), "warn")
		LM.sound("denied", global_position)
		return
	match u.get("type", "effects"):
		"terminal", "read":
			Game.hud.open_panel(self, u)
		"cache":
			used += 1
			_open_target = 1.0
			LM.sound("cache", global_position)
			var i := 0
			for it in u.get("loot", []):
				var p := Pickup.new()
				level.add_child(p)
				p.global_position = global_position + Vector3(0, 0.9, 0)
				p.setup(level, it, kit_id)
				var a: float = TAU * i / maxf(1.0, u["loot"].size()) + global_rotation.y
				var to := global_position + Vector3(cos(a) * 1.5, 1.0, sin(a) * 1.5 + 0.2)
				var tw := p.create_tween()
				tw.tween_property(p, "global_position", (p.global_position + to) / 2 + Vector3(0, 1.0, 0), 0.25)
				tw.tween_property(p, "global_position", to, 0.25)
				i += 1
			Game.run_effects(u.get("effects"))
		"locker":
			# what is in it comes out: things to take, things that bite, or things that go off
			used += 1
			_open_target = 1.0
			LM.sound("locker", global_position)
			var front: Vector3 = global_position + global_transform.basis.z * 1.3
			var k := 0
			for it in u.get("loot", []):
				var p := Pickup.new()
				level.add_child(p)
				p.global_position = global_position + global_transform.basis.z * 0.4 + Vector3(0, 1.1, 0)
				p.setup(level, it, kit_id)
				var to: Vector3 = front + global_transform.basis.x * (k - (u["loot"].size() - 1) / 2.0) * 0.7 + Vector3(0, 1.0, 0)
				p.create_tween().tween_property(p, "global_position", to, 0.3)
				k += 1
			if u.has("actor"):
				Game.say(u.get("text", "It was not empty."), "warn")
				for i in int(u.get("count", 1)):
					var a := level.spawn_thing({"actor": u["actor"], "alert": true, "level": roundi(level.floor_y(front) / level.H)}, level.cell_of(front))
					if a:
						a.global_position = Vector3(front.x, a.global_position.y, front.z) + global_transform.basis.x * (i - (u.get("count", 1) - 1) / 2.0) * 0.9
			elif u.get("loot", []).is_empty() and not u.has("effects"):
				Game.say(u.get("text", "Empty. Somebody got here first, three hundred years ago."), "info")
			Game.run_effects(u.get("effects"), {"at": front, "prop": self})
		"heal":
			var left: int = int(u.get("charges", 3)) - used
			if left <= 0:
				Game.say("The dispenser is empty. It apologises.", "warn")
				return
			if _player.hp >= _player.max_hp:
				Game.say("You are in acceptable condition.", "info")
				return
			used += 1
			_player.heal(u.get("amount", 35))
			LM.sound("heal", global_position)
			Game.say("Health +%d  (%d left)" % [u.get("amount", 35), left - 1], "good")
		_:
			used += 1
			LM.sound(u.get("sound", "use"), global_position)
			Game.run_effects(u.get("effects"))
	if tag != "":
		level.notify("use", tag)


func set_screen(text: String) -> void:
	if _label:
		_label.text = text


# ------------------------------------------------------------------ breaking it
func hurt(amount: float, _info: Dictionary = {}) -> void:
	if hp <= 0.0:
		return
	hp -= amount
	if hp > 0.0:
		return
	remove_from_group("breakable")
	var pos := global_position + Vector3(0, 0.6, 0)
	level.block(level.cell_of(global_position), false)
	if e.has("explode"):
		var x: Dictionary = e["explode"]
		queue_free()
		Fx.explode(level, pos, x.get("radius", 5.0), x.get("damage", 60.0), LM.col(x.get("color"), Color(1.0, 0.5, 0.12)), self)
	else:
		Fx.sparks(level, pos, Color(0.8, 0.8, 0.7), 16, 5.0, 0.6, 0.1)
		LM.sound("break", pos)
		for it in e.get("loot", []):
			var p := Pickup.new()
			level.add_child(p)
			p.global_position = pos + Vector3(randf_range(-0.4, 0.4), 0.2, randf_range(-0.4, 0.4))
			p.setup(level, it, kit_id)
		queue_free()
