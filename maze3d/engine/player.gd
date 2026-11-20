extends CharacterBody3D
## Player - the body you play: health and armour, being grabbed or frozen, and what is in front of you to use.
## The rest is in components, children of this node made in setup (engine/player/):
##   PlayerControls  the mouse and keys: looking, switching weapons, E, the lamp; what is held down each frame
##   PlayerMovement  walking, wading, the dash, jumping, falling, footsteps
##   PlayerCamera    the eye: head, camera, lamp, sniper zoom, shake and the slump when you die
##   PlayerWeapons   what you carry, ammo, the gun in hand and firing it
## This node calls them in a fixed order every physics frame (the order the one script had), so the controls
## and the feel are what they were.
class_name Player

const EYE := 1.62
var level: Level
var cfg: Dictionary = {}
var hp := 100.0
var max_hp := 100.0
var armor := 0.0
var max_armor := 100.0
var dead := false
var held_by: Node = null         # the monster that has grabbed you, if one has
var frozen := false
var focus: Node = null           # the usable thing in front of you: E works it
var last_hit_dir := Vector3.ZERO
var hurt_flash := 0.0
var controls: PlayerControls
var movement: PlayerMovement
var eye: PlayerCamera
var arms: PlayerWeapons
# the eye's nodes, here as well because the HUD, the self-test and the actors look through them
var head: Node3D
var cam: Camera3D
var lamp: SpotLight3D
var hold: Node3D

# what the rest of the game reads, where it was before the split
var weapons: Array:
	get:
		return arms.weapons
var ammo: Dictionary:
	get:
		return arms.ammo
var current: int:
	get:
		return arms.current
var recoil: float:
	get:
		return arms.recoil
var zoom: float:                 # 0..1, how far into sniper mode
	get:
		return eye.zoom
var zooming: bool:
	get:
		return eye.zooming
var pitch: float:                # looking up (+) or down (-), in radians
	get:
		return eye.pitch
	set(v):
		eye.pitch = v


func setup(lv: Level, config: Dictionary) -> void:
	level = lv
	cfg = config
	max_hp = cfg.get("hp", 100.0)
	hp = max_hp
	armor = cfg.get("armor", 0.0)
	collision_layer = 2
	collision_mask = 1 | 4 | Level.GLASS
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.4
	cap.height = 1.8
	cs.shape = cap
	cs.position.y = 0.9
	add_child(cs)
	eye = PlayerCamera.new()
	eye.name = "Head"
	add_child(eye)
	eye.setup(self)
	head = eye
	cam = eye.cam
	lamp = eye.lamp
	hold = eye.hold
	movement = PlayerMovement.new()
	movement.name = "Movement"
	add_child(movement)
	movement.setup(self)
	arms = PlayerWeapons.new()
	arms.name = "Weapons"
	add_child(arms)
	arms.setup(self)
	controls = PlayerControls.new()
	controls.name = "Controls"
	add_child(controls)
	controls.setup(self)


func weapon() -> Dictionary:
	return arms.weapon()


func equip(i: int) -> void:
	arms.equip(i)


func give_weapon(id: String) -> void:
	arms.give_weapon(id)


func add_ammo(kind: String, n: int) -> bool:
	return arms.add_ammo(kind, n)


## The gun in hand has cooled down from its last shot.
func ready_to_fire() -> bool:
	return arms.cooled()


## Fire the gun in hand once, as if the trigger were pulled (the self-test's range).
func fire() -> void:
	arms.fire(arms.weapon())


func muzzle_pos() -> Vector3:
	return arms.muzzle_pos()


func heal(n: float) -> void:
	hp = min(max_hp, hp + n)
	Game.changed.emit()


func shake(s: float) -> void:
	eye.shake(s)


func hurt(amount: float, info: Dictionary = {}) -> void:
	if dead or movement.dashing() and info.get("type", "") != "blast":
		return
	amount *= Game.take_scale()
	if armor > 0.0:
		var soak: float = min(armor, amount * 0.6)
		armor -= soak
		amount -= soak
	hp -= amount
	hurt_flash = min(1.0, hurt_flash + 0.35 + amount / 40.0)
	shake(min(0.5, amount / 40.0))
	if info.has("from"):
		last_hit_dir = (info["from"] - global_position).normalized()
		var k: Vector3 = global_position - info["from"]
		k.y = 0
		velocity += k.normalized() * info.get("knock", 2.0)
	LM.sound("hurt")
	Game.changed.emit()
	if hp <= 0.0:
		hp = 0.0
		dead = true
		Game.finish({"dead": true, "by": info})


## E: in easy mode first say what you are looking at, then use what is in front of you.
func use_focus() -> void:
	if Game.easy:
		var seen := Identify.look(self)
		if not seen.is_empty():
			print("IDENT  %s  |  %s" % [seen["title"], seen["detail"]])
			Game.identified.emit(seen["title"], seen["detail"])
	if focus and is_instance_valid(focus):
		focus.use(self)


func _physics_process(dt: float) -> void:
	if dead:
		eye.slump(dt)
		movement.fall_dead(dt)
		return
	if held_by != null and (not is_instance_valid(held_by) or held_by.dead):
		held_by = null
	var held := held_by != null                      # something has hold of you: look and shoot, but it decides where you are
	var free := not frozen and not held
	var inp := controls.move_vector() if free else Vector2.ZERO
	eye.update_zoom(dt, free and controls.zoom_held() and not movement.dashing())
	movement.step(dt, inp, free, held)
	eye.settle(dt)
	arms.settle(dt)
	hurt_flash = move_toward(hurt_flash, 0.0, dt * 1.4)
	eye.step(dt, inp.x, movement.bob, arms.recoil, movement.dashing())
	arms.step(dt, eye.zoom, movement.bob, not frozen and controls.fire_held())
	_find_focus()


func _find_focus() -> void:
	var best: Node = null
	var best_score := 0.55
	var from := cam.global_position
	var fwd := -cam.global_transform.basis.z
	for n in get_tree().get_nodes_in_group("usable"):
		if not is_instance_valid(n) or n.prompt() == "":
			continue
		var at: Vector3 = n.focus_point() if n.has_method("focus_point") else n.global_position + Vector3(0, 1.2, 0)
		var to := at - from
		var dist := to.length()
		if dist > 3.6:
			continue
		var score := fwd.dot(to.normalized()) - dist * 0.05
		if score > best_score:
			best_score = score
			best = n
	focus = best
