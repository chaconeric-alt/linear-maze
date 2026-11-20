extends Node
## ActorAimRig - a head that turns on its own (defs: "aim").
## "aim": {"yaw_bone": "turret", "pitch_bone": "gun", "speed": 5, "pitch": [-30, 35], "body_turn": 0.25}
## Also: "rate": 70 (degrees a second, instead of speed: a heavy turret), "aligned": 10 (it will not fire until it points
## within that many degrees), "lead_bone" + "lead_speed" (+ "lead_offset" degrees): a second part that turns to the
## target on its own and faster, like a sensor head; "muzzle": [x, up, forward] on the gun (or turret) bone.
## Once awake, yaw_bone is turned about the vertical to face the target whichever way the body is going (all the way
## round), and pitch_bone tips to their height. The body turns at body_turn of its usual rate. Clips must not key those
## two bones, except the ones played while it is not aiming (dormant, startle, die): _own takes their turning out of
## the rest. It will not start a shot until a line down the barrel is within "aligned" degrees of the target (6 unless
## given), holds a shot that is due while they are off the gun, gives the shot up after "hold" seconds (1.5) of that, and
## the shot leaves along the barrel.
## A gun that swivels on its turret: "bore": [x, up, forward] (the way the barrel points at rest, in the model),
## "swivel": [-50, 25] (degrees either side of the turret's straight ahead; + is toward its left), "gun_rate": 220.
class_name ActorAimRig

var a: Actor
var d: Dictionary
var skel: Skeleton3D
var _i := -1                      # the bone that turns to face the target (a turret)
var _j := -1                      # the bone that tips up and down (its gun)
var _k := -1                      # a second bone that turns on its own, faster (a sensor head)
var _yaw := 0.0
var _want := 0.0                  # where the turret would point if it had got there
var _lead_yaw := 0.0
var _pitch := 0.0
var _gun_yaw := 0.0               # a gun that swivels on its turret ("bore"): the way its barrel is turned, off the turret's straight ahead
var _q: Dictionary = {}           # bone -> the turn the engine has given it, put back after every animation step
var _bore0 := Vector3(0, 0, 1)    # the way the barrel points at rest, in the model


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d
	skel = LM.find_type(a.vis, "Skeleton3D") as Skeleton3D
	if skel == null:
		return
	_i = skel.find_bone(d["aim"].get("yaw_bone", ""))
	_j = skel.find_bone(d["aim"].get("pitch_bone", ""))
	_k = skel.find_bone(d["aim"].get("lead_bone", ""))
	_own()
	if a.anim:
		a.anim.mixer_applied.connect(_apply)
	if d["aim"].has("bore"):
		_bore0 = LM.vec(d["aim"]["bore"], Vector3(0, 0, 1)).normalized()
		_gun_yaw = atan2(_bore0.x, _bore0.z)


## It has a bone to turn: the head does the looking.
func active() -> bool:
	return _i >= 0


func tick(dt: float, pl: Node3D) -> void:
	if _i < 0:
		return
	var ad: Dictionary = d["aim"]
	var sb := skel.global_transform.basis.orthonormalized()
	var to: Vector3 = sb.inverse() * (pl.global_position + Vector3(0, 1.0, 0) - a.eye())
	var k: float = clamp(ad.get("speed", 5.0) * dt, 0.0, 1.0)
	_want = atan2(to.x, to.z)
	if ad.has("muzzle") and not ad.has("bore"):        # the barrel sits to one side of the pivot: turn until the barrel, not the pivot, is on them
		var side: float = ad["muzzle"][0] * a.vis.scale.x
		_want -= asin(clampf(side / maxf(0.5, Vector2(to.x, to.z).length()), -0.6, 0.6))
	if ad.has("rate"):                                # heavy: it comes round at a steady rate (degrees a second), however far it has to go
		_yaw += clampf(wrapf(_want - _yaw, -PI, PI), -deg_to_rad(ad["rate"]) * dt, deg_to_rad(ad["rate"]) * dt)
	else:
		_yaw = lerp_angle(_yaw, _want, k)
	if _k >= 0:                                  # the light part gets there first
		_lead_yaw = lerp_angle(_lead_yaw, _want + deg_to_rad(ad.get("lead_offset", 0.0)), clamp(ad.get("lead_speed", 7.0) * dt, 0.0, 1.0))
		var axk: Vector3 = (skel.get_bone_global_rest(_k).basis.orthonormalized().inverse() * Vector3.UP).normalized()
		_turn_bone(_k, skel.get_bone_rest(_k).basis.get_rotation_quaternion() * Quaternion(axk, _lead_yaw))
	var axis: Vector3 = (skel.get_bone_global_rest(_i).basis.orthonormalized().inverse() * Vector3.UP).normalized()
	_turn_bone(_i, skel.get_bone_rest(_i).basis.get_rotation_quaternion() * Quaternion(axis, _yaw))
	if _j >= 0 and ad.has("bore"):
		_gun_tick(dt, pl)
	elif _j >= 0:
		var lim: Array = ad.get("pitch", [-30, 35])
		var want: float = clamp(atan2(to.y, Vector2(to.x, to.z).length()), deg_to_rad(lim[0]), deg_to_rad(lim[1]))
		_pitch = lerp(_pitch, want, k)
		var ax2: Vector3 = (skel.get_bone_global_rest(_j).basis.orthonormalized().inverse() * Vector3.RIGHT).normalized()
		_turn_bone(_j, skel.get_bone_rest(_j).basis.get_rotation_quaternion() * Quaternion(ax2, -_pitch))


## The gun turns and tips on its own pivot until a line down the barrel runs through the target's chest.
func _gun_tick(dt: float, pl: Node3D) -> void:
	var ad: Dictionary = d["aim"]
	var parent := skel.get_bone_parent(_j)
	var pg: Transform3D = skel.get_bone_global_pose(parent)
	var frame: Basis = (pg.basis * skel.get_bone_global_rest(parent).basis.inverse()).orthonormalized()      # how the turret has turned from rest
	var pivot: Vector3 = (pg * skel.get_bone_rest(_j)).origin
	var t: Vector3 = frame.inverse() * (skel.global_transform.affine_inverse() * (pl.global_position + Vector3(0, 1.1, 0)) - pivot)
	var sw: Array = ad.get("swivel", [-50, 25])
	var lim: Array = ad.get("pitch", [-30, 35])
	var want_yaw: float = clampf(atan2(t.x, t.z), deg_to_rad(sw[0]), deg_to_rad(sw[1]))
	var want_pitch: float = clampf(atan2(t.y, Vector2(t.x, t.z).length()), deg_to_rad(lim[0]), deg_to_rad(lim[1]))
	var step: float = deg_to_rad(ad.get("gun_rate", 220.0)) * dt
	_gun_yaw = move_toward(_gun_yaw, want_yaw, step)
	_pitch = move_toward(_pitch, want_pitch, step)
	# in the model: bring the barrel from where it rests to straight ahead, tip it, then turn it
	var turn := Basis(Vector3.UP, _gun_yaw) * Basis(Vector3.RIGHT, -_pitch) * Basis(Vector3.UP, -atan2(_bore0.x, _bore0.z)) * Basis(Vector3.RIGHT, asin(clampf(_bore0.y, -1.0, 1.0)))
	var g: Basis = skel.get_bone_global_rest(_j).basis.orthonormalized()
	_turn_bone(_j, skel.get_bone_rest(_j).basis.get_rotation_quaternion() * (g.inverse() * turn * g).get_rotation_quaternion())


func _turn_bone(bone: int, q: Quaternion) -> void:
	_q[bone] = q
	skel.set_bone_pose_rotation(bone, q)


## A clip that moves an aim bone at all (a gun's recoil slide) has the animation player put its turning back to rest on
## every step, whether or not the clip keys the turning. So after each step the engine's own turn is put back.
func _apply() -> void:
	if a.awake and not a.dead and a.stun <= 0.0:
		for b in _q:
			skel.set_bone_pose_rotation(b, _q[b])


## Where a shot leaves from: the barrel's tip ("muzzle"), wherever the turret and gun have swung it.
func muzzle() -> Vector3:
	var mb: int = _j if _j >= 0 else _i
	var mp: Array = d["aim"].get("muzzle", [0, d.get("eye", 1.2) / maxf(0.01, a.vis.scale.y), 0])
	return skel.global_transform * (skel.get_bone_global_pose(mb) * (skel.get_bone_global_rest(mb).affine_inverse() * Vector3(mp[0], mp[1], mp[2])))


## How far off the target the gun is pointing (radians): the angle between a line down the barrel and the line from its
## tip to their chest. A turret with no bone to tip its gun is only asked to be right from side to side.
func off(pl: Node3D) -> float:
	var b := bore()
	var to: Vector3 = pl.global_position + Vector3(0, 1.1, 0) - muzzle()
	if _j < 0:
		return absf(Vector2(b.x, b.z).angle_to(Vector2(to.x, to.z)))
	return b.angle_to(to)


## The way the barrel points, in the world.
func bore() -> Vector3:
	var mb: int = _j if _j >= 0 else _i
	return (skel.global_transform.basis.orthonormalized() * ((skel.get_bone_global_pose(mb).basis * skel.get_bone_global_rest(mb).basis.inverse()).orthonormalized() * _bore0)).normalized()


## The engine turns the aim bones, so no clip may turn them too: a clip that keys them (exporters bake every bone into
## every clip) would drag the turret back to where the clip has it while the clip plays, and the shot would leave from a
## gun that is drawn pointing somewhere else. Their turning is taken out of every clip except the ones played while it
## is not aiming: the dormant clip, startle, die, and any named in "aim": {"keyed": [..]}. Sliding (recoil) is left in.
func _own() -> void:
	if a.anim == null:
		return
	var keep: Array = [d.get("dormant_clip", "dormant"), "startle", "die"] + d["aim"].get("keyed", [])
	for i in keep.size():
		keep[i] = d.get("clips", {}).get(keep[i], keep[i])
	var bones: Array = []
	for b in [_i, _j, _k]:
		if b >= 0:
			bones.append(skel.get_bone_name(b))
	for nm in a.anim.get_animation_list():
		if keep.has(String(nm)):
			continue
		var an := a.anim.get_animation(nm)
		for t in range(an.get_track_count() - 1, -1, -1):
			if an.track_get_type(t) == Animation.TYPE_ROTATION_3D and an.track_get_path(t).get_subname_count() > 0 \
					and bones.has(String(an.track_get_path(t).get_subname(0))):
				an.remove_track(t)
