extends Node3D
## PlayerCamera - the player's eye. This node is the head (at Player.EYE); under it the camera, and under the camera
## the lamp, the hand that holds the gun (PlayerWeapons fills it) and a small light that only lights what is held.
## It keeps the pitch (the body keeps the yaw), sniper zoom, shake, the bob and lean of walking, and the slump when you die.
class_name PlayerCamera

const PITCH_LIMIT := 1.5          # radians (86°) up or down: the mouse cannot tilt the head past this

var pl: Player
var cfg: Dictionary
var cam: Camera3D
var lamp: SpotLight3D
var hold: Node3D
var pitch := 0.0
var zooming := false              # the right mouse button is held: sniper mode
var zoom := 0.0                   # 0..1, how far in
var _shake := 0.0


func setup(player: Player) -> void:
	pl = player
	cfg = player.cfg
	position.y = Player.EYE
	cam = Camera3D.new()
	cam.fov = cfg.get("fov", 84.0)
	cam.near = 0.04
	cam.far = 220.0
	cam.current = true
	add_child(cam)
	lamp = SpotLight3D.new()
	lamp.spot_range = lamp_reach()
	lamp.spot_angle = 30.0
	lamp.spot_angle_attenuation = 0.8
	lamp.light_energy = 2.2
	lamp.light_color = Color(0.9, 0.95, 1.0)
	lamp.shadow_enabled = false                      # a light at your eye throws slivers of shadow beside every ledge and pillar, and they move whenever you do
	lamp.position = Vector3(0.2, -0.15, 0)
	lamp.light_cull_mask = 1
	lamp.visible = cfg.get("lamp", true)
	cam.add_child(lamp)
	hold = Node3D.new()
	cam.add_child(hold)
	var fill := OmniLight3D.new()          # lights only what you hold (layer 2), so it reads in the dark
	fill.light_cull_mask = 2
	fill.light_energy = 0.9
	fill.omni_range = 3.0
	fill.position = Vector3(-0.3, 0.3, 0.2)
	cam.add_child(fill)


## The mouse moved: turn the body, tilt the head. A steadier hand when zoomed.
func turn(rel: Vector2) -> void:
	var s: float = cfg.get("sensitivity", 0.0022) * lerpf(1.0, cfg.get("zoom_fov", 20.0) / cfg.get("fov", 84.0), zoom)
	pl.rotation.y -= rel.x * s
	pitch = clamp(pitch - rel.y * s, -PITCH_LIMIT, PITCH_LIMIT)


func toggle_lamp() -> void:
	lamp.visible = not lamp.visible
	LM.sound("click")


func shake(s: float) -> void:
	_shake = max(_shake, s)


## Sniper mode: hold the right mouse button. The view closes in, the cross hairs become a scope's, and you all but stop.
func update_zoom(dt: float, held_down: bool) -> void:
	zooming = held_down
	if Debug.hold_zoom:                            # --zoom: the self-test and screenshots have no mouse to hold
		zooming = true
	zoom = move_toward(zoom, 1.0 if zooming else 0.0, dt * 7.0)


func settle(dt: float) -> void:
	_shake = move_toward(_shake, 0.0, dt * 1.6)


## Where the camera sits this frame: the head's tilt plus the gun's kick, shake, the bob of walking, a lean into
## sidesteps, and the field of view (zoomed in, or widened by a dash).
func step(dt: float, side: float, bob: float, recoil: float, dashing: bool) -> void:
	rotation.x = pitch + recoil * 0.05
	cam.position = Vector3(randf_range(-1, 1), randf_range(-1, 1), 0) * _shake * 0.08 + Vector3(0, sin(bob * 2.0) * 0.035, 0)
	cam.rotation.z = -side * 0.025 + randf_range(-1, 1) * _shake * 0.02
	cam.fov = lerp(cam.fov, lerpf(cfg.get("fov", 84.0), cfg.get("zoom_fov", 20.0), zoom) + (10.0 if dashing else 0.0), 14 * dt)


## Dead: the view sinks to the floor and rolls over.
func slump(dt: float) -> void:
	position.y = move_toward(position.y, 0.4, dt * 2.5)
	cam.rotation.z = move_toward(cam.rotation.z, 0.6, dt * 1.5)


## How far the lamp reaches before the character changes it (Player.apply_character).
func lamp_reach() -> float:
	return 26.0
