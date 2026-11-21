extends Area3D
## Pickup - anything you take by walking into it: treasure, health, armour, ammunition, key cards,
## weapons. Defined in a game's defs (items) and placed by a level.
class_name Pickup

var level: Level
var d: Dictionary
var _vis: Node3D
var _t := 0.0
var _base_y := 0.0
var _armed := 0.5
var _rest := false          # lying on a shelf, in a case or on the floor: it does not hover or turn


func setup(lv: Level, entry: Dictionary, kit_id: String) -> void:
	level = lv
	d = LM.get_def("items", entry["item"]).duplicate()
	for k in entry:
		d[k] = entry[k]
	collision_layer = 8
	collision_mask = 2
	var cs := CollisionShape3D.new()
	var s := SphereShape3D.new()
	_rest = d.get("rest", false)
	s.radius = 1.3 if _rest else 0.9      # near enough to reach on to the shelf
	cs.shape = s
	add_child(cs)
	var over := {}
	var c := LM.col(d.get("glow"), Color(1.0, 0.8, 0.3))
	if d.get("kind", "") == "key":
		c = Door.LOCK_COLORS.get(d.get("color", "red"), Color.WHITE)
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = Color(c.r * 2, c.g * 2, c.b * 2)
		over["lock"] = m
	_vis = LM.spawn_model(d.get("kit", kit_id), d.get("model", "item_chips"), over)
	_vis.scale = Vector3.ONE * d.get("scale", 1.6) * (0.72 if _rest else 1.0)
	add_child(_vis)
	if _rest:                                        # it sits on what it is on
		var acc: Array = [null]
		bounds(_vis, Transform3D.IDENTITY, acc)
		if acc[0] != null:
			_vis.position.y -= (acc[0] as AABB).position.y
		_vis.rotation.y = randf_range(-0.5, 0.5)
		cs.position.y = 0.3
	var l := OmniLight3D.new()
	l.light_color = c
	l.light_energy = 0.35 if _rest else 0.6
	l.omni_range = 1.6 if _rest else 2.5
	l.position.y = 0.25 if _rest else 0.0
	add_child(l)
	if d.get("kind", "") == "treasure":
		Game.stats["treasure_total"] += 1
	body_entered.connect(_on_body)
	_t = randf() * 6.0


static func bounds(n: Node, xf: Transform3D, acc: Array) -> void:
	if n is Node3D:
		xf = xf * (n as Node3D).transform
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
		var b: AABB = xf * (n as MeshInstance3D).mesh.get_aabb()
		acc[0] = b if acc[0] == null else (acc[0] as AABB).merge(b)
	for c in n.get_children():
		bounds(c, xf, acc)



## It lies still on a shelf, in a case or on the floor (not hovering).
## What it was made from, to be made again (the level's memory keeps a pickup made while playing: a cache's loot).
func entry() -> Dictionary:
	return d.duplicate(true)


func resting() -> bool:
	return _rest

func _ready() -> void:
	_base_y = position.y


func _process(dt: float) -> void:
	_t += dt
	_armed -= dt
	if not _rest:
		_vis.rotation.y = _t * 1.6
		_vis.position.y = sin(_t * 2.2) * 0.08
	var pl := Game.player
	if pl and _armed <= 0.0 and overlaps_body(pl):
		_on_body(pl)


func _on_body(b: Node) -> void:
	if b != Game.player or _armed > 0.0 or is_queued_for_deletion():
		return
	var pl := Game.player
	var name: String = d.get("name", d.get("id", "something"))
	match d.get("kind", "treasure"):
		"treasure":
			Game.add_credits(int(d.get("value", 10)))
			Game.stats["treasure"] += 1
			Game.haul[d.get("item", "")] = int(Game.haul.get(d.get("item", ""), 0)) + 1
			Game.say("%s  +%d cr" % [name, d.get("value", 10)], "loot")
		"health":
			if pl.hp >= pl.max_hp:
				return
			pl.heal(d.get("amount", 25))
			Game.say("%s  +%d" % [name, d.get("amount", 25)], "good")
		"armor":
			if pl.armor >= pl.max_armor:
				return
			pl.armor = min(pl.max_armor, pl.armor + d.get("amount", 25))
			Game.say(name, "good")
		"ammo":
			if not pl.add_ammo(d.get("ammo", "bullets"), int(d.get("amount", 10))):
				return
			Game.say("%s  +%d" % [name, d.get("amount", 10)], "loot")
		"quest":                                     # something the story wants: it sets its "flag", and says what it is
			Game.say(d.get("text", name), "key")
		"key":
			Game.give_key(d.get("color", "red"))
			Game.say("%s card. Somebody's whole career, once." % str(d.get("color", "red")).capitalize(), "key")
		"weapon":
			pl.give_weapon(d.get("weapon", ""))
			Game.say(name, "key")
	LM.sound(d.get("sound", "pickup"))
	Game.run_effects(d.get("effects"))
	if d.has("flag"):
		Game.set_flag(d["flag"])
	if d.has("tag"):
		level.notify("pickup", d["tag"])
	Events.emit("item.taken", {"key": level.key_of(self), "item": str(d.get("item", d.get("weapon", d.get("id", "")))), "kind": str(d.get("kind", "treasure")), "count": 1})
	Game.changed.emit()
	queue_free()
