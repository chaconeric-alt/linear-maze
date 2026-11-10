// A display that is still on after three hundred years: scan lines, drifting rows of "text", flicker.
shader_type spatial;
render_mode unshaded;
uniform vec4 albedo : source_color = vec4(0.02, 0.05, 0.06, 1.0);
uniform vec3 emission : source_color = vec3(0.15, 0.9, 0.8);
uniform float energy = 1.6;
varying vec3 lp;
varying vec3 ln;
float h(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
void vertex() { lp = VERTEX; ln = NORMAL; }
void fragment() {
	vec3 a = abs(ln);
	vec2 uv = a.z > a.x && a.z > a.y ? lp.xy : (a.x > a.y ? lp.zy : lp.xz);
	float row = floor(uv.y * 26.0);
	float t = TIME * (0.4 + h(vec2(row, 3.0)) * 0.8);
	float chars = step(0.45, h(vec2(floor(uv.x * 40.0 + t * 3.0 * step(0.7, h(vec2(row, 9.0)))), row)));
	float line_on = step(0.35, h(vec2(row, floor(TIME * 0.25))));
	float lenmask = step(fract(uv.x * 0.9 + 0.5), 0.25 + 0.7 * h(vec2(row, 1.0)));
	float scan = 0.75 + 0.25 * sin(uv.y * 420.0);
	float flick = 0.85 + 0.15 * sin(TIME * 31.0) * step(0.93, h(vec2(floor(TIME * 9.0), 2.0)));
	float gap = step(0.25, fract(uv.y * 26.0));
	float v = chars * line_on * lenmask * gap;
	ALBEDO = (albedo.rgb + emission * (0.07 + v) * energy * scan) * flick;
}
