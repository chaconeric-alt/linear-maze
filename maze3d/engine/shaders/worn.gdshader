// Hard surfaces of a ruined base: paint and metal with grime, streaks and rust that never repeat,
// because the pattern comes from where the surface is, not from a texture. No UVs needed.
shader_type spatial;
uniform vec4 albedo : source_color = vec4(0.7, 0.7, 0.7, 1.0);
uniform float metallic = 0.2;
uniform float roughness = 0.5;
uniform float grime = 0.5;
uniform vec3 grime_color : source_color = vec3(0.06, 0.045, 0.03);
uniform bool world_space = true;
varying vec3 p;
varying vec3 n;

float hash(vec3 q) {
	q = fract(q * 0.3183099 + 0.1);
	q *= 17.0;
	return fract(q.x * q.y * q.z * (q.x + q.y + q.z));
}
float noise(vec3 x) {
	vec3 i = floor(x);
	vec3 f = fract(x);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 x) {
	return noise(x) * 0.5 + noise(x * 2.1) * 0.3 + noise(x * 4.7) * 0.2;
}
void vertex() {
	if (world_space) {
		p = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
		n = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	} else {
		p = VERTEX;
		n = NORMAL;
	}
}
void fragment() {
	float big = fbm(p * 0.9);
	float fine = fbm(p * 7.0);
	// streaks run down walls: stretch the noise along Y where the surface is upright
	float streak = noise(vec3(p.x * 9.0, p.y * 0.8, p.z * 9.0)) * (1.0 - abs(n.y));
	float dirt = smoothstep(0.35, 0.85, big * 0.6 + fine * 0.25 + streak * 0.35) * grime;
	float scuff = smoothstep(0.62, 0.7, fine) * 0.25 * grime;
	vec3 c = albedo.rgb * (0.9 + 0.2 * fine);
	c = mix(c, grime_color, dirt * 0.75);
	c = mix(c, c * 1.5 + 0.03, scuff * metallic);
	ALBEDO = c;
	METALLIC = metallic * (1.0 - dirt * 0.6);
	ROUGHNESS = clamp(roughness + dirt * 0.4 - scuff * 0.3 + (fine - 0.5) * 0.15, 0.05, 1.0);
}
