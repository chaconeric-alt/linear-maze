shader_type spatial;
// Lights the red parts of a model like the bars of a stereo: columns round the body, each rising and falling on its own.
// Keeps the model's own textures. `drive` (0..1) is how hard it is working: the engine raises it when the thing attacks.
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap;
uniform sampler2D orm_tex : filter_linear_mipmap;
uniform bool has_normal = false;
uniform bool has_orm = false;
uniform vec3 glow : source_color = vec3(1.0, 0.12, 0.08);
uniform float energy = 5.0;
uniform float idle = 0.35;          // how bright the lit part is when nothing is happening
uniform float rate = 7.0;
uniform float bars = 8.0;
uniform float lo = 0.05;            // the model-space heights the bars run between
uniform float hi = 0.8;
uniform float drive = 0.0;
varying vec3 mpos;

void vertex() {
	mpos = VERTEX;
}

void fragment() {
	vec4 a = texture(albedo_tex, UV);
	ALBEDO = a.rgb;
	if (has_normal) {
		NORMAL_MAP = texture(normal_tex, UV).rgb;
	}
	ROUGHNESS = has_orm ? texture(orm_tex, UV).g : 0.4;
	METALLIC = has_orm ? texture(orm_tex, UV).b : 0.6;
	float red = smoothstep(0.18, 0.5, a.r - max(a.g, a.b) * 1.4);
	float col = floor((atan(mpos.x, mpos.z) / 6.2832 + 0.5) * bars);
	float t = TIME * rate * (0.5 + drive);
	float level = 0.5 + 0.5 * sin(t + col * 2.4) * sin(t * 0.37 + col * 5.1);
	level = mix(0.25 + 0.2 * level, 0.15 + 0.85 * level, drive);
	float h = clamp((mpos.y - lo) / (hi - lo), 0.0, 1.0);
	float lit = step(h, level) * (0.7 + 0.3 * step(0.5, fract(h * 14.0)));
	EMISSION = glow * red * energy * (idle * 0.4 + lit * mix(idle, 1.0, drive));
}
