// Anything that gives off light: strips, indicators, eyes. `pulse` makes it breathe, `flicker` makes it fail.
shader_type spatial;
render_mode unshaded;
uniform vec3 emission : source_color = vec3(0.2, 0.9, 1.0);
uniform float energy = 4.0;
uniform float pulse = 0.08;
uniform float flicker = 0.0;
uniform float level = 1.0;
varying float seed;
void vertex() { seed = fract(dot(MODEL_MATRIX[3].xyz, vec3(0.37, 0.71, 0.53))); }
void fragment() {
	float k = 1.0 + pulse * sin(TIME * 2.0 + seed * 40.0);
	float f = 1.0;
	if (flicker > 0.0) {
		float n = fract(sin(floor(TIME * 14.0 + seed * 100.0) * 91.7) * 43758.5);
		f = mix(1.0, step(0.35, n) * (0.4 + 0.6 * n), flicker);
	}
	ALBEDO = emission * energy * k * f * level;
}
