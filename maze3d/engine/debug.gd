extends RefCounted
## Debug - the switches for testing and for looking at things. Game code asks here and never reads the command line:
## Main sets these from its arguments (--zoom, --noprofile, --noao ...), and the self-test sets what it needs itself
## (SelfTest.configure, in tests/selftest.gd) before the first level is loaded. Never instanced: everything is static.
class_name Debug

static var sure_rolls := false          # every hack comes off and nothing risky goes wrong (the self-test measures the content, not luck)
static var quick_hacks := false         # a hack takes a moment instead of 1.2 seconds
static var hold_zoom := false           # sniper mode stays on without a mouse button (--zoom: the self-test and screenshots)
static var memory_profile := false      # the bunker is never read from or written to disk (--noprofile, the self-test)
static var fixed_settings := false      # remembered settings (easy mode) are not loaded: the game as designed
static var no_ao := false               # --noao: no screen-space ambient occlusion
static var ssil := false                # --ssil: screen-space indirect light, which is off unless asked for
static var no_vfog := false             # --novfog: no volumetric fog
static var repeatable := false          # --repeatable: random numbers from a fixed seed and the clock counted in physics frames


## Milliseconds since the game started, for things that bob, pulse or grind with time. With --repeatable it counts
## physics frames instead of reading the wall clock, so two runs at --fixed-fps 60 see the same times frame for frame.
static func now_msec() -> int:
	if repeatable:
		return Engine.get_physics_frames() * 1000 / Engine.physics_ticks_per_second
	return Time.get_ticks_msec()
