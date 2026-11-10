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


func setup(lv: Level, entry: Dictionary, kit: String) -> void:
	level = lv
	e = entry
	kit_id = kit
	tag = e.get("tag", "")
	meta = LM.model_meta(kit, e["prop"])
	inst = LM.spawn_model(kit, e["prop"])
	add_child(inst)
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
	set_process(not _spin.is_empty() or not _parts.is_empty())


func _process(dt: float) -> void:
	for s in _spin:
		s[0].rotate_y(s[1] * dt)
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


# ------------------------------------------------------------------ using it
func prompt() -> String:
	var u: Dictionary = e.get("use", {})
	if u.is_empty():
		return ""
	if u.get("once", u.get("type", "") == "cache") and used > 0:
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
