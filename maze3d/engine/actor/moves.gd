extends Node
## ActorMoves - the attacks that are more than a blow or a shot (defs: in "attacks", by "type"; SPEC.md 3.3). Chosen by
## ActorAttacks like any other (range, cooldown, sight), then run here until they are over:
##   beam    {"range": 35, "aim": 2.0, "damage": 55, "kind": "beam", "color": [1, 0.1, 0.05]}: paints the target with an
##           aiming line for "aim" seconds, then fires along it; anything that breaks the line of sight first spoils it.
##   latch   {"range": 2.2, "steal": "credits" or "ammo", "amount": 2, "every": 1.0, "hold": 6, "damage": 2}: clamps on in
##           front of the target's face and takes that much every second (credits, or the gun in hand's ammunition),
##           then lets go and keeps away; killed, it drops what it took.
##   charge  {"range": 18, "min_range": 4, "windup": 1.0, "speed": 22, "damage": 45, "knock": 20, "stun": 2.5,
##           "smash": 200}: bellows, then runs straight at where the target was, unable to turn, smashing furniture in
##           its way ("smash" damage); into a wall, it stuns itself for "stun" seconds (its back to the room).
##   burst   {"range": 5, "windup": 0.4, "cloud": {cloud}}: swells, and bursts into a cloud that lingers (Cloud), and is
##           gone (off duty, showing it on a target, it swells again).
## Any of them may carry "afflict" (Afflictions) for what it hurts.
class_name ActorMoves

const KINDS := ["beam", "latch", "charge", "burst"]

var a: Actor
var d: Dictionary
var at: Dictionary = {}           # the move under way, or {}
var stolen := 0                   # credits a latcher has taken (dropped when it dies)
var _t := 0.0
var _line: MeshInstance3D
var _dir := Vector3.ZERO
var _hit := false
var _keep_away := 0.0             # a latcher that has let go keeps its distance this long


static func wanted(def: Dictionary) -> bool:
	return def.get("attacks", []).any(func(x: Dictionary) -> bool: return KINDS.has(x.get("type", "")))


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


func busy() -> bool:
	return not at.is_empty()


func begin(attack: Dictionary) -> void:
	at = attack
	_t = 0.0
	_hit = false
	if not a.play(at.get("clip", "attack")):
		a.play("attack")
	LM.sound(at.get("windup_sound", "charge" if at.get("type") == "beam" else ""), a.global_position)


func stop() -> void:
	at = {}
	if _line:
		_line.visible = false


## One tick of the move under way. False: it took the whole tick (stands, aims, runs, holds on).
func tick(dt: float, pl: Node3D, _to: Vector3, flat: Vector3, dist: float) -> bool:
	_t += dt
	match str(at.get("type", "")):
		"beam":
			_beam(dt, pl, flat)
		"latch":
			_latch(dt, pl, dist)
		"charge":
			_charge(dt, pl, flat)
		"burst":
			_burst(dt)
		_:
			stop()
	return false


## Keeping away after letting go (a latcher), or nothing: how it wants to move, for ActorLocomotion.
func keeping_away() -> bool:
	return _keep_away > 0.0


func _physics_process(dt: float) -> void:
	_keep_away = maxf(0.0, _keep_away - dt)


# ------------------------------------------------------------------ beam
func _beam(dt: float, pl: Node3D, flat: Vector3) -> void:
	a.move.turn_to(flat, dt, 6.0)
	_still(dt)
	var from := a.eye()
	var aim_at: Vector3 = pl.global_position + Vector3(0, 1.2, 0)
	if not a.level.los(from, aim_at, true):          # broken line (a railing or glass too): the shot is spoiled
		stop()
		return
	_show_line(from, aim_at, LM.col(at.get("color"), Color(1.0, 0.1, 0.05)))
	if _t < float(at.get("aim", 2.0)):
		return
	Fx.tracer(a.level, from, aim_at, LM.col(at.get("color"), Color(1.0, 0.1, 0.05)), 0.07, 0.25)
	Fx.flash(a.level, from, LM.col(at.get("color"), Color(1.0, 0.1, 0.05)), 3.0, 5.0)
	LM.sound(at.get("sound", "zap"), a.global_position)
	pl.hurt(float(at.get("damage", 30.0)), _info(at.get("kind", "beam")))
	stop()


func _show_line(from: Vector3, to: Vector3, c: Color) -> void:
	if _line == null:
		_line = MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.01
		cm.bottom_radius = 0.01
		cm.height = 1.0
		cm.radial_segments = 4
		var m := Fx.glow_mat(c, 2.0).duplicate()
		m.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED
		cm.material = m
		_line.mesh = cm
		_line.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		a.level.add_child(_line)
	_line.visible = true
	var mid := (from + to) / 2.0
	var length := from.distance_to(to)
	_line.global_transform = Transform3D(Basis.looking_at(to - from, Vector3.UP if absf((to - from).normalized().y) < 0.99 else Vector3.RIGHT) * Basis(Vector3.RIGHT, PI / 2), mid)
	_line.scale = Vector3(1, length, 1)


# ------------------------------------------------------------------ latch
func _latch(dt: float, pl: Node3D, dist: float) -> void:
	if not _hit:
		if dist > float(at.get("range", 2.2)) + 0.6:  # it missed its chance
			stop()
			return
		_hit = true
		_t = 0.0
		LM.sound("clang", a.global_position)
	var cam: Node3D = pl.cam if "cam" in pl else pl
	var front := Vector3(-cam.global_transform.basis.z.x, 0, -cam.global_transform.basis.z.z).normalized()
	var on := pl.global_position + front * 0.9       # in front of the face, whichever way it looks; its body rides at its
	var c := a.level.cell_of(on)                      # "center", about the face's height (its origin stays on the floor)
	if not a.level.open_s(c.x, c.y, a.level.floor_of(pl.global_position)):
		on = pl.global_position + front * 0.3         # facing a wall: as close as it can get
	a.global_position = on
	a.velocity = Vector3.ZERO
	var every := float(at.get("every", 1.0))
	if fmod(_t, every) < dt:
		var n := int(at.get("amount", 2))
		if str(at.get("steal", "credits")) == "credits" and pl == Game.player:
			var took: int = mini(n, Game.credits)
			Game.add_credits(-took)
			stolen += took
		elif "arms" in pl and pl.arms != null:
			pl.arms.spend_ammo(n)
		if float(at.get("damage", 0.0)) > 0.0:
			pl.hurt(float(at["damage"]), _info(at.get("kind", "melee"), false))
	if _t >= float(at.get("hold", 6.0)) or (str(at.get("steal", "credits")) == "credits" and Game.credits <= 0):
		_keep_away = 4.0
		stop()


## Dead: what a latcher took drops where it fell.
func on_death() -> void:
	stop()
	if stolen > 0:
		a.level.spawn_thing({"item": str(d.get("stolen_item", "chips")), "value": stolen,
			"at": [a.level.cell_of(a.global_position).x, a.level.cell_of(a.global_position).y]}, a.level.cell_of(a.global_position))
		stolen = 0


# ------------------------------------------------------------------ charge
func _charge(dt: float, pl: Node3D, flat: Vector3) -> void:
	var windup := float(at.get("windup", 1.0))
	if _t < windup:                                  # the bellow: still, facing them
		a.move.turn_to(flat, dt, 5.0)
		_still(dt)
		_dir = flat.normalized()
		return
	var speed := float(at.get("speed", 22.0))
	a.velocity.x = _dir.x * speed
	a.velocity.z = _dir.z * speed
	a.move.fall(dt)
	a.move_and_slide()
	a.play("walk", 2.0)
	if not _hit and a.global_position.distance_to(pl.global_position) < float(d.get("radius", 0.5)) + 1.0:
		_hit = true
		pl.hurt(float(at.get("damage", 40.0)), _info(at.get("kind", "melee"), true, float(at.get("knock", 18.0))))
		LM.sound(at.get("hit_sound", "clang"), a.global_position)
	for i in a.get_slide_collision_count():
		var col := a.get_slide_collision(i).get_collider()
		var pr: Node = col as Node
		while pr != null and not pr is Prop and pr != a.level:
			pr = pr.get_parent()
		if pr is Prop and pr.is_in_group("breakable"):
			pr.hurt(float(at.get("smash", 200.0)), {"type": "crush", "from": a.global_position})
		elif col == a.level.solid_body() and absf(a.get_slide_collision(i).get_normal().y) < 0.5:
			a.stun = float(at.get("stun", 2.5))      # into a wall: dazed, its back to the room
			LM.sound("crash", a.global_position)
			Fx.sparks(a.level, a.global_position + _dir * float(d.get("radius", 0.5)) + Vector3(0, 1, 0), Color(0.7, 0.65, 0.55), 20, 4.0)
			stop()
			return
	if _t > windup + 1.6:
		stop()


# ------------------------------------------------------------------ burst
func _burst(dt: float) -> void:
	_still(dt)
	var windup := float(at.get("windup", 0.4))
	a.vis.scale = Vector3.ONE * float(d.get("scale", 1.0)) * (1.0 + 0.35 * minf(1.0, _t / windup))
	if _t < windup:
		return
	var c: Dictionary = at.get("cloud", {})
	Cloud.make(a.level, a.global_position, c)
	LM.sound(at.get("sound", "squish"), a.global_position)
	stop()
	if a.off_duty:                                   # only showing what it does (on a target): it swells again
		a.vis.scale = Vector3.ONE * float(d.get("scale", 1.0))
		return
	a.hurt(a.hp + 1.0, {"type": "burst"})


# ------------------------------------------------------------------ helpers
func _still(dt: float) -> void:
	a.velocity.x = move_toward(a.velocity.x, 0, 30 * dt)
	a.velocity.z = move_toward(a.velocity.z, 0, 30 * dt)
	a.move.fall(dt)
	a.move_and_slide()


func _info(kind: String, from := true, knock := -1.0) -> Dictionary:
	var info := {"type": kind, "by": a}
	if from:
		info["from"] = a.global_position
	if knock >= 0.0:
		info["knock"] = knock
	if at.has("afflict"):
		info["afflict"] = at["afflict"]
	return info
