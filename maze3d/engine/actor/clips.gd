extends RefCounted
## ActorClips - which of its clips an actor plays (ActorCore._play): idle is whatever it does instead (a lounge, standing
## dormant, swimming); in fluid it swims, moving or not; the def's "clips" maps our names to the model's, and clips made
## elsewhere are told to loop when they are idle or walking. False if the model has no such clip.
class_name ActorClips


static func play(a: ActorCore, clip: String, speed: float, loop: bool) -> bool:
	if a.anim == null:
		return false
	a.anim.speed_scale = 1.0
	if clip == "idle" and not a.awake and not a.dead:
		if a.lounge and a.lounge.active():
			clip = a.lounge.clip()                     # off duty
			loop = true
		elif a.d.has("dormant_clip") and not a.roused:
			clip = a.d["dormant_clip"]                 # things that stand switched off until you are close
			loop = true
	if a.move.wet and a.d.has("swim") and (clip == "walk" or clip == "idle") and not a.dead:
		clip = a.d["swim"].get("clip", "swim")         # in fluid it swims, moving or not
		loop = true
		if speed < 0.6:
			speed = 0.6
	var nm: String = a.d.get("clips", {}).get(clip, clip)
	if not a.anim.has_animation(nm):
		return false
	if loop or clip == "idle" or clip == "walk":     # clips made elsewhere rarely say that they loop
		a.anim.get_animation(nm).loop_mode = Animation.LOOP_LINEAR
	if a.anim.current_animation != nm or not a.anim.is_playing():
		a.anim.play(nm, 0.15, speed)
	return true
