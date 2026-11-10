// An advertising display that has been running the same campaign for three hundred years:
// slow bands of colour, a pulsing mark, rows of copy, the odd glitch.
shader_type spatial;
render_mode unshaded;
uniform vec4 albedo : source_color = vec4(0.03, 0.0, 0.02, 1.0);
uniform vec3 emission : source_color = vec3(1.0, 0.2, 0.62);
uniform float energy = 1.5;
varying vec3 lp;
varying vec3 ln;
varying float seed;
float h(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
void vertex() { lp = VERTEX; ln = NORMAL; seed = fract(dot(MODEL_MATRIX[3].xyz, vec3(0.31, 0.17, 0.43))); }
void fragment() {
	vec3 a = abs(ln);
	vec2 uv = a.z > a.x && a.z > a.y ? lp.xy : (a.x > a.y ? lp.zy : lp.xz);
	float t = TIME * 0.35 + seed * 20.0;
	// drifting diagonal bands
	float band = 0.5 + 0.5 * sin((uv.x + uv.y * 0.6) * 3.0 + t * 2.0);
	vec3 c1 = emission;
	vec3 c2 = vec3(0.55, 0.25, 1.0);
	vec3 c3 = vec3(1.0, 0.92, 0.95);
	vec3 col = mix(c1, c2, band);
	// the mark: a ring that breathes, somewhere near the middle of the panel
	vec2 q = fract(uv * 0.45 + vec2(seed, seed * 1.7)) - 0.5;
	float ring = smoothstep(0.02, 0.0, abs(length(q) - (0.22 + 0.04 * sin(t * 3.0))) - 0.015);
	float dot_ = smoothstep(0.07, 0.05, length(q));
	col = mix(col, c3, max(ring, dot_));
	// rows of copy along the bottom third
	float row = floor(uv.y * 14.0);
	float copy = step(0.5, h(vec2(floor(uv.x * 22.0 - t * 4.0 * step(0.5, h(vec2(row, 5.0)))), row))) * step(fract(uv.y * 14.0), 0.55) * step(0.6, h(vec2(row, 2.0)));
	col = mix(col, c3, copy * 0.8);
	float scan = 0.82 + 0.18 * sin(uv.y * 300.0);
	float glitch = step(0.985, h(vec2(floor(TIME * 7.0), floor(uv.y * 9.0) + seed)));
	col = mix(col, col.brg, glitch);
	ALBEDO = albedo.rgb + col * energy * scan * (0.55 + 0.45 * band);
}
