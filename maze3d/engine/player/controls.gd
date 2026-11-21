extends Node
## PlayerControls - the mouse and keys. Events (looking, the wheel and 1-9 for weapons, E, F for the lamp, P in easy
## mode) are
## handled as they come; what is held down (move keys, dash, jump, fire, right button to zoom) is read when the
## player's frame asks. The mouse only aims and fires while it is captured (not over a panel).
class_name PlayerControls

var pl: Player


func setup(player: Player) -> void:
	pl = player


func _unhandled_input(ev: InputEvent) -> void:
	if pl.frozen or pl.dead:
		return
	if ev is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		pl.eye.turn(ev.relative)
		pl.arms.sway(ev.relative)
	elif ev is InputEventMouseButton and ev.pressed:
		var n: int = pl.weapons.size()
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP:
			pl.arms.equip((pl.current + 1) % max(1, n))
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			pl.arms.equip((pl.current - 1 + n) % max(1, n))
	elif ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode >= KEY_1 and ev.keycode <= KEY_9 and ev.keycode - KEY_1 < pl.weapons.size():
			pl.arms.equip(ev.keycode - KEY_1)
		elif ev.is_action("use"):
			pl.use_focus()
		elif ev.is_action("image_prompt") and Game.easy:    # easy mode: P writes an image prompt for what E last named
			pl.image_prompt()
		elif ev.is_action("flashlight"):
			pl.eye.toggle_lamp()


func move_vector() -> Vector2:
	return Input.get_vector("move_left", "move_right", "move_forward", "move_back")


func dash_pressed() -> bool:
	return Input.is_action_just_pressed("dash")


func jump_pressed() -> bool:
	return Input.is_action_just_pressed("jump")


func fire_held() -> bool:
	return Input.is_action_pressed("fire") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED


func zoom_held() -> bool:
	return Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT) and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
