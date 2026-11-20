extends RefCounted
## LevelEnvironment - the mood: background, ambient light, tone mapping, glow, fog. The level can set "ambient",
## "ambient_energy", "exposure" and "fog": {"color", "density", "volumetric"}.
class_name LevelEnvironment


static func build(level: Node3D, ld: LevelData) -> Environment:
	var data := ld.data
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.005, 0.006, 0.008)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = LM.col(data.get("ambient"), Color(0.25, 0.3, 0.38))
	env.ambient_light_energy = data.get("ambient_energy", 0.35)
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = data.get("exposure", 0.9)
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_bloom = 0.12
	env.glow_hdr_threshold = 1.0
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_ADDITIVE
	var fog: Dictionary = data.get("fog", {})
	env.fog_enabled = true
	env.fog_light_color = LM.col(fog.get("color"), Color(0.1, 0.14, 0.17))
	env.fog_density = fog.get("density", 0.012)
	# Screen-space effects are worked out from what is on screen, so they change as the view turns. Ambient occlusion is
	# kept gentle (and at full resolution: project.godot); indirect light (SSIL) crawled badly along wall bases and under
	# ledges and is off unless asked for (--ssil). F1/F2/F3 step through lighting tests while playing (LightingDebug).
	var forward: bool = RenderingServer.get_current_rendering_method() == "forward_plus"
	env.ssao_enabled = not Debug.no_ao
	env.ssao_intensity = 1.2
	env.ssao_radius = 0.8
	env.ssao_power = 1.3
	env.ssil_enabled = forward and Debug.ssil
	env.volumetric_fog_enabled = forward and fog.get("volumetric", true) and not Debug.no_vfog
	env.volumetric_fog_density = fog.get("density", 0.012) * 1.6
	env.volumetric_fog_albedo = LM.col(fog.get("color"), Color(0.5, 0.6, 0.65))
	env.volumetric_fog_length = 48.0
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.08
	env.adjustment_saturation = 1.1
	we.environment = env
	level.add_child(we)
	return env
