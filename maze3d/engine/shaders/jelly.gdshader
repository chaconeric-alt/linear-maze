shader_type spatial;
// Soft, wet and lit from inside: for creatures that should look like they would not hold their shape if poked.
// Keeps the model's own textures; adds a slow wobble of the surface and a glow that breathes.
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap;
uniform sampler2D orm_tex : filter_linear_mipmap;
uniform bool has_normal = false;
uniform bool has_orm = false;
uniform float amp = 0.02;
uniform float speed = 2.4;
uniform float freq = 7.0;
uniform vec3 glow : source_color = vec3(0.8, 0.3, 1.0);
uniform float glow_energy = 0.6;
uniform float pulse = 0.5;
uniform float wet = 0.75;

void vertex() {
	float w = sin(TIME * speed + VERTEX.y * freq) + 0.6 * sin(TIME * speed * 1.7 + VERTEX.x * freq * 1.3 + VERTEX.z * freq * 0.7);
	VERTEX += NORMAL * amp * w;
}

void fragment() {
	vec4 a = texture(albedo_tex, UV);
	ALBEDO = a.rgb;
	if (has_normal) {
		NORMAL_MAP = texture(normal_tex, UV).rgb;
	}
	float rough = has_orm ? texture(orm_tex, UV).g : 0.5;
	ROUGHNESS = mix(rough, 0.08, wet);
	METALLIC = 0.0;
	SPECULAR = 0.7;
	float beat = 0.5 + 0.5 * sin(TIME * 1.9 + UV.y * 9.0 + UV.x * 5.0);
	float rim = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 2.5);
	EMISSION = (a.rgb * glow) * glow_energy * (1.0 - pulse + pulse * beat) + glow * rim * 0.35;
}
