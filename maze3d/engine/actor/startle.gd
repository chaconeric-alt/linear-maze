extends RefCounted
## ActorStartle - how a monster shows it has noticed you (Eric, 25 Nov: "a startle or a jump and turn, moving antenna,
## etc. ... along with an audio cue"). From asleep: it turns hard toward what it noticed; it hops (on its feet; not a
## flyer or a turret); it plays its startle clip if it has one; its feelers, stalks, tails, ears and head twitch
## (ActorTwitch); with no clip and no such bones, its whole body gives a jolt. It stands TIME seconds while it does. A
## climber on a wall or ceiling only twitches, keeping its hold. The sound is its alert sound (ActorAware.wake);
## "actor.noticed" tells the world.
class_name ActorStartle

const TIME := 0.35                # seconds it stands, startled
const HOP := 3.2                  # m/s up
const TURN := 0.2                 # seconds to turn
const NEAR := 2.5                 # metres: closer than this to what it noticed it does not hop (it would land on it)


static func play(a: Actor, toward: Vector3, clip_played: bool) -> void:
	var dir := Vector3(toward.x - a.global_position.x, 0, toward.z - a.global_position.z)
	var on_wall := a.surf != 0                       # a climber on a wall or ceiling keeps its hold: it twitches, and that is all
	if dir.length() > 0.1 and not a.fixed and not on_wall:
		var want := atan2(dir.x, dir.z)
		var tw := a.create_tween()
		tw.set_process_mode(Tween.TWEEN_PROCESS_PHYSICS)
		tw.tween_property(a, "rotation:y", a.rotation.y + wrapf(want - a.rotation.y, -PI, PI), TURN)
	if not a.fixed and not a.move.fly and not on_wall and absf(a.velocity.y) < 0.5 and dir.length() > NEAR:      # on its feet (a thing standing still is not asked is_on_floor), and not on top of what it noticed
		a.move.hop(HOP)
	var clip := clip_played or a.play("startle")
	var twitch := ActorTwitch.on(LM.find_type(a.vis, "Skeleton3D") as Skeleton3D)
	if twitch:
		twitch.start()
	elif not clip:
		var s := a.vis.scale
		var jolt := a.create_tween()
		jolt.set_process_mode(Tween.TWEEN_PROCESS_PHYSICS)
		jolt.tween_property(a.vis, "scale", s * 1.12, 0.08)
		jolt.tween_property(a.vis, "scale", s, 0.16)
	if not on_wall:
		a.stun = maxf(a.stun, TIME)
