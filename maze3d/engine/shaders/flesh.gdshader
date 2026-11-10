// Wet living tissue and shell: mottled, veined, with a slick rim.
shader_type spatial;
uniform vec4 albedo : source_color = vec4(0.55, 0.22, 0.24, 1.0);
uniform float metallic = 0.0;
uniform float roughness = 0.3;
varying vec3 p;
float hash(vec3 q) { q = fract(q * 0.3183099 + 0.1); q *= 17.0; return fract(q.x * q.y * q.z * (q.x + q.y + q.z)); }
float noise(vec3 x) {
	vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void vertex() { p = VERTEX; }
void fragment() {
	float m = noise(p * 6.0) * 0.6 + noise(p * 19.0) * 0.4;
	float vein = smoothstep(0.46, 0.5, noise(p * 9.0 + 3.0)) * (1.0 - smoothstep(0.5, 0.54, noise(p * 9.0 + 3.0)));
	vec3 c = albedo.rgb * (0.7 + 0.6 * m);
	c = mix(c, albedo.rgb * vec3(0.45, 0.2, 0.35), vein * 0.8);
	float rim = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 2.5);
	ALBEDO = c;
	ROUGHNESS = clamp(roughness + (m - 0.5) * 0.3, 0.05, 1.0);
	METALLIC = metallic;
	EMISSION = albedo.rgb * rim * 0.12;
	RIM = 0.3;
}
