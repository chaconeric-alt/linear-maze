extends SkeletonModifier3D
## ActorTwitch - a startled thing's moving parts twitch for a moment (ActorStartle): its antennae, feelers, stalks,
## tails and ears flick hard, its head, neck and jaw jerk. Bones are found by those words in their names. A skeleton
## modifier, so it moves them after the clips have posed them (and the pose comes back as it was next frame).
class_name ActorTwitch

const WORDS := {"antenna": 0.6, "feel": 0.6, "stalk": 0.5, "tail": 0.45, "ear": 0.5, "jaw": 0.3, "head": 0.2, "neck": 0.15}
const TIME := 0.7                 # seconds a twitch lasts, dying away
const RATE := 38.0                # how fast they flick

var _bones: Array = []            # [bone index, how far it flicks (radians)]
var _t := 0.0


## The twitch for this skeleton (made the first time), or null if it has no bone the words name.
static func on(sk: Skeleton3D) -> ActorTwitch:
	if sk == null:
		return null
	for c in sk.get_children():
		if c is ActorTwitch:
			return c
	var tw := ActorTwitch.new()
	for i in sk.get_bone_count():
		var nm := sk.get_bone_name(i).to_lower()
		if nm.ends_with("end"):
			continue
		for w in WORDS:
			if nm.contains(w):
				tw._bones.append([i, float(WORDS[w])])
				break
	if tw._bones.is_empty():
		tw.free()
		return null
	tw.name = "Twitch"
	sk.add_child(tw)
	return tw


func start() -> void:
	_t = TIME


func twitching() -> bool:
	return _t > 0.0


func _process_modification_with_delta(delta: float) -> void:
	if _t <= 0.0:
		return
	_t -= delta
	var sk := get_skeleton()
	var k := maxf(0.0, _t / TIME)
	for b in _bones:
		var ang: float = sin(_t * RATE + b[0]) * b[1] * k
		sk.set_bone_pose_rotation(b[0], sk.get_bone_pose_rotation(b[0]) * Quaternion(Vector3.RIGHT, ang))
