extends Node
## LightingDebug - lighting tests, for finding out which part of the picture is misbehaving: F1 picks the next one (F3
## the one before) and says what it is and how it stands; F2 switches it. Everything goes back to normal when the
## level is left. (Not F5 to F8: the editor uses those to run and stop the game.) SPEC.md, "Lighting effects".
class_name LightingDebug

const SHADOW_FILTERS := ["hard", "soft, very low", "soft, low", "soft, medium", "soft, high", "soft, ultra"]
const VIEWS := [[Viewport.DEBUG_DRAW_DISABLED, "normal"], [Viewport.DEBUG_DRAW_UNSHADED, "unshaded: surface colour only, no light at all"],
	[Viewport.DEBUG_DRAW_LIGHTING, "lighting only: light on plain white surfaces"], [Viewport.DEBUG_DRAW_CLUSTER_OMNI_LIGHTS, "how many lights reach each part of the screen"],
	[Viewport.DEBUG_DRAW_OVERDRAW, "overdraw"], [Viewport.DEBUG_DRAW_SSAO, "ambient occlusion alone"]]
const TESTS := ["view", "surface grime", "room-light shadows", "shadow edges", "ambient occlusion", "volumetric fog", "distance fog", "glow",
	"highlights (specular)", "far lights fade out", "near clip plane", "anti-aliasing (MSAA)", "all room lights"]

var env: Environment
var lights: LevelLights
var _test := -1
var _state := {}
var _shadow_filter := 4


func setup(environment: Environment, lit: LevelLights) -> void:
	env = environment
	lights = lit


func _now(name: String) -> String:
	match name:
		"view":
			return VIEWS[int(_state.get(name, 0))][1]
		"shadow edges":
			return SHADOW_FILTERS[_shadow_filter]
		"near clip plane":
			return "%.2f m" % (Game.player.cam.near if Game.player else 0.04)
	return "ON" if _state.get(name, true) else "OFF"


func _switch(name: String) -> void:
	var on: bool = not _state.get(name, true)
	if name != "view":
		_state[name] = on
	match name:
		"view":
			_state[name] = (int(_state.get(name, 0)) + 1) % VIEWS.size()
			get_viewport().debug_draw = VIEWS[_state[name]][0]
		"surface grime":
			RenderingServer.global_shader_parameter_set("lm_grime", 1.0 if on else 0.0)
		"room-light shadows":
			for l in lights.all():
				if not l.has_meta("shadow"):
					l.set_meta("shadow", l.shadow_enabled)
				l.shadow_enabled = on and l.get_meta("shadow")
		"shadow edges":
			_state[name] = true
			_shadow_filter = (_shadow_filter + 1) % SHADOW_FILTERS.size()
			RenderingServer.positional_soft_shadow_filter_set_quality(_shadow_filter)
		"ambient occlusion":
			env.ssao_enabled = on
		"volumetric fog":
			env.volumetric_fog_enabled = on
		"distance fog":
			env.fog_enabled = on
		"glow":
			env.glow_enabled = on
		_:
			_switch_more(name, on)


func _switch_more(name: String, on: bool) -> void:
	match name:
		"highlights (specular)":
			for l in lights.all():
				l.light_specular = 0.5 if on else 0.0
		"far lights fade out":
			for l in lights.all():
				l.distance_fade_enabled = on
		"near clip plane":
			_state[name] = true
			if Game.player:
				Game.player.cam.near = 0.25 if Game.player.cam.near < 0.1 else 0.04
		"anti-aliasing (MSAA)":
			get_viewport().msaa_3d = Viewport.MSAA_4X if on else Viewport.MSAA_DISABLED
		"all room lights":
			for l in lights.all():
				l.visible = on


func _exit_tree() -> void:
	RenderingServer.global_shader_parameter_set("lm_grime", 1.0)
	if get_viewport():
		get_viewport().debug_draw = Viewport.DEBUG_DRAW_DISABLED


func _unhandled_key_input(ev: InputEvent) -> void:
	if not (ev is InputEventKey) or not ev.pressed or ev.echo or env == null:
		return
	if ev.keycode == KEY_F1 or ev.keycode == KEY_F3:
		_test = posmod(_test + (1 if ev.keycode == KEY_F1 else -1), TESTS.size())
		Game.say("Test %d of %d: %s is %s  (F2 switches it)" % [_test + 1, TESTS.size(), TESTS[_test], _now(TESTS[_test])], "info")
	elif ev.keycode == KEY_F2 and _test >= 0:
		_switch(TESTS[_test])
		Game.say("%s: %s" % [TESTS[_test], _now(TESTS[_test])], "info")
