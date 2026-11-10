shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque, specular_schlick_ggx;
uniform vec4 albedo : source_color = vec4(0.45, 0.85, 0.9, 0.22);
void fragment() {
	float fres = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 3.0);
	ALBEDO = albedo.rgb;
	ALPHA = clamp(albedo.a + fres * 0.5, 0.0, 1.0);
	ROUGHNESS = 0.06;
	METALLIC = 0.0;
	EMISSION = albedo.rgb * fres * 0.4;
}
