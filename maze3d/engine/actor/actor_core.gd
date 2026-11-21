extends CharacterBody3D
## ActorCore - how an actor works: its body, its components, animation, waking, the tick that decides what state it is
## in, damage and death. What the rest of the engine asks of an actor, and tells it, is Actor (engine/actor/actor.gd),
## which extends this. An actor is a monster, a robot, anything with a def in "actors" (SPEC.md, "Actors"). What it can do lives in component nodes, each added only when its def
## (or the level, for off duty) asks for it:
##   ActorSenses        seeing and hearing (always)                       engine/actor/senses.gd
##   ActorLocomotion    on foot, flying, swimming, gait, wandering, paths  engine/actor/locomotion.gd
##   ActorClimb         walls and ceilings ("climb")                       engine/actor/climb.gd
##   ActorAttacks       melee, ranged, pounce, grapple, touch              engine/actor/attacks.gd
##   ActorAimRig        a turret head and gun that turn on their own       engine/actor/aim_rig.gd
##   ActorLooks         screen face, jelly, equaliser, trails, footfalls   engine/actor/looks.gd
##   ActorLounge        slacking off until caught ("lounge")               engine/actor/lounge.gd
##   ActorOffDuty       off duty: talks, wanders, shows what it does        engine/actor/off_duty.gd
##   ActorConversation  what it says, and the panel when you talk to it   engine/actor/conversation.gd
## Who it is after is target(): the player, for now.
class_name ActorCore

enum State { DORMANT, IDLE, ALERT, ATTACKING, STUNNED, CLIMBING, OFF_DUTY, DEAD }
const STATE_NAMES := ["dormant", "idle", "alert", "attacking", "stunned", "climbing", "off duty", "dead"]
const G := 22.0

var level: Level
var d: Dictionary                 # its def
var e: Dictionary                 # the level entry that placed it
var tag := ""
var hp := 30.0
var max_hp := 30.0
var dead := false
var awake := false
var off_duty := false             # it will talk, and show what it does, but it will not fight (ActorOffDuty)
var state: int = State.IDLE       # what it is doing this tick: set by _physics_process, read by anyone
var seen := false                 # the player has laid eyes on it: it shows on the map
var dock: Node = null             # the Station it is waiting in, switched off (engine/station.gd)
var vis: Node3D
var anim: AnimationPlayer
# components; null when the def does not ask for them
var senses: ActorSenses
var move: ActorLocomotion
var remains: ActorRemains          # added when it dies
var climb: ActorClimb
var wary: ActorWary              # flyers and climbers: keeping out of traps
var attacks: ActorAttacks
var aim: ActorAimRig
var looks: ActorLooks
var lounge: ActorLounge
var od: ActorOffDuty
var talker: ActorConversation
# shared state the components read and write
var surf := 0                     # 0 floor · 1 on a wall · 2 on the ceiling · 3 falling off · 4 on foot, heading for a wall
var wall_n := Vector3.ZERO        # the wall's normal, pointing into the room
var base_y := 0.0                 # the height of the floor it last stood on
var home := Vector3.ZERO          # where it belongs: wanders near, dances round
var fixed := false                # a turret: it turns, it does not walk
var stun := 0.0                   # startled, or picking itself up: it does nothing else
var roused := false               # off duty or dormant: somebody is here, so it is paying attention
var bark_t := 3.0                 # until it next says something (barks, or a lounger's chatter)
var cs: CollisionShape3D
var _flash_t := 0.0
var _overlay: StandardMaterial3D
var _meshes: Array = []


func setup(lv: Level, def: Dictionary, entry: Dictionary) -> void:
	level = lv
	d = def
	e = entry
	tag = e.get("tag", "")
	hp = d.get("hp", 30.0) * e.get("hp_mul", 1.0)
	max_hp = hp
	fixed = d.get("behavior", "chaser") == "turret"
	_body()
	base_y = position.y
	if d.get("mount", "") == "ceiling":
		var mcc := lv.cell_of(position)
		position.y = lv.ceiling_y(mcc.x, mcc.y, floori((position.y + 0.9) / lv.H))
	var path: String = d.get("model", "")
	vis = LM.spawn_scene(path if path.begins_with("res://") else "res://" + path, "" if d.get("own_materials", false) else d.get("kit", lv.kit_id))      # own_materials: a textured model keeps what it came with
	vis.scale = Vector3.ONE * d.get("scale", 1.0)
	add_child(vis)
	anim = LM.find_type(vis, "AnimationPlayer") as AnimationPlayer
	_collect(vis)
	_overlay = StandardMaterial3D.new()
	_overlay.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_overlay.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_overlay.albedo_color = Color(0.9, 0.5, 0.4)
	home = position
	_components()
	vis.rotation.y = deg_to_rad(d.get("model_yaw", 0.0))      # models from elsewhere do not always face our way
	vis.position.y = d.get("model_y", 0.0)
	var climb_t := randf_range(1.0, 3.0)         # drawn for every kind, so the random stream is the same whatever it can do
	if climb:
		climb.next_t = climb_t
	if not e.get("alert", false):
		if lounge and e.get("lounge", "") != "none":
			lounge.start.call_deferred()             # after the level's furniture is in
		elif climb:
			climb.start_perch()
	_play("idle")
	if anim:
		anim.seek(randf() * 2.0)
	if e.get("off_duty", lv.data.get("off_duty", false)):      # nothing on this floor fights, whatever let it out
		off_duty = true
		add_to_group("usable")
		_add_off_duty()
		od.remember_post.call_deferred()
	elif e.get("alert", false):
		alert()


func _body() -> void:
	collision_layer = 4
	collision_mask = 1 | 2 | 4 | Level.GLASS
	var r: float = d.get("radius", 0.5)
	var hgt: float = d.get("height", 1.6)
	cs = CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = r
	cap.height = max(hgt, r * 2.0)
	cs.shape = cap
	cs.position.y = d.get("center", hgt / 2)
	add_child(cs)


## Each component only if the def asks for it (Looks for any of its keys). The order is the order they were made in
## before the split, so the random choices they make (a face's first line, a tail's sway) come out the same.
func _components() -> void:
	senses = _add(ActorSenses.new())
	move = _add(ActorLocomotion.new())
	if d.has("aim"):
		aim = _add(ActorAimRig.new())
	if ActorLooks.wanted(d):
		looks = _add(ActorLooks.new())
	if d.has("climb"):
		climb = _add(ActorClimb.new())
	if d.has("attacks") or d.has("touch"):
		attacks = _add(ActorAttacks.new())
	if d.has("lounge"):
		lounge = _add(ActorLounge.new())
	if d.get("fly", false) or d.has("climb"):
		wary = _add(ActorWary.new())


func _add(c: Node) -> Node:
	c.name = c.get_script().get_global_name().trim_prefix("Actor")
	add_child(c)
	c.setup(self)
	return c


func _add_off_duty() -> void:
	if od == null:
		od = _add(ActorOffDuty.new())
		talker = _add(ActorConversation.new())


func _collect(n: Node) -> void:
	if n is MeshInstance3D:
		_meshes.append(n)
	for c in n.get_children():
		_collect(c)


func meshes() -> Array:
	return _meshes


## Play one of its clips (by our name; the def's "clips" maps it to the model's). Idle is whatever it does instead: a
## lounge, standing dormant, swimming. False if the model has no such clip.
func _play(clip: String, speed := 1.0, loop := false) -> bool:
	if anim == null:
		return false
	anim.speed_scale = 1.0
	if clip == "idle" and not awake and not dead:
		if lounge and lounge.active():
			clip = lounge.clip()                     # off duty
			loop = true
		elif d.has("dormant_clip") and not roused:
			clip = d["dormant_clip"]                 # things that stand switched off until you are close
			loop = true
	if move.wet and d.has("swim") and (clip == "walk" or clip == "idle") and not dead:
		clip = d["swim"].get("clip", "swim")         # in fluid it swims, moving or not
		loop = true
		if speed < 0.6:
			speed = 0.6
	var nm: String = d.get("clips", {}).get(clip, clip)
	if not anim.has_animation(nm):
		return false
	if loop or clip == "idle" or clip == "walk":     # clips made elsewhere rarely say that they loop
		anim.get_animation(nm).loop_mode = Animation.LOOP_LINEAR
	if anim.current_animation != nm or not anim.is_playing():
		anim.play(nm, 0.15, speed)
	return true


func play(clip: String, speed := 1.0, loop := false) -> bool:
	return _play(clip, speed, loop)


# ------------------------------------------------------------------ who it is after, and waking up
## What it hunts: the player, for now (factions will change this). Off duty and showing its attacks, it fights its
## Target instead (ActorOffDuty).
func target() -> Node3D:
	return Game.player


## An off-duty thing stops being off duty (the effect "anger"): it is a monster again, and it knows where you are.
func anger() -> void:
	if dead or not off_duty:
		return
	off_duty = false
	od.stop()
	remove_from_group("usable")
	if Game.hud and Game.hud.in_panel():
		Game.hud.close_panel()
	Game.run_effects(e.get("on_anger"))
	alert()
	awake = true


func alert() -> void:
	if awake or dead or off_duty:
		return
	if dock != null:                                 # in its station: the station opens first, then switches it on
		dock.release()
		return
	if lounge and lounge.active():                   # caught slacking
		lounge.caught()
	if surf == 1:
		climb.on_alert()
	if d.has("dormant_clip") and stun <= 0.0:        # powering up takes a moment
		awake = true
		if _play("startle"):
			stun = d.get("startle_time", 1.0)
			anim.seek(0.0)
	awake = true
	LM.sound(d.get("sounds", {}).get("alert", ""), global_position)
	for a in level.actors:       # friends close by wake too
		if is_instance_valid(a) and a != self and not a.awake and not a.dead and a.global_position.distance_to(global_position) < 10.0 and level.floor_of(a.global_position) == level.floor_of(global_position):
			a.call_deferred("alert")


func eye() -> Vector3:
	if surf == 1 or surf == 2:
		return global_position + global_transform.basis.y * d.get("eye", d.get("height", 1.6) * 0.7)
	return global_position + Vector3(0, d.get("eye", d.get("height", 1.6) * 0.7) * (-1.0 if d.get("mount", "") == "ceiling" else 1.0), 0)


# ------------------------------------------------------------------ every tick
func _physics_process(dt: float) -> void:
	if _flash_t > 0.0:
		_flash_t -= dt
		if _flash_t <= 0.0:
			for m in _meshes:
				m.material_overlay = null
	if looks:
		looks.trail_tick(dt)
	if dead:
		state = State.DEAD
		_dead_tick(dt)
		return
	_body_tick(dt)
	var pl: Node3D = target()
	if off_duty:
		pl = od.tick(dt, pl)                         # its own doings, or the Target it is showing its attacks on
		if pl == null:
			if not od.drilling():
				state = State.OFF_DUTY
			return
	if pl == null or not is_instance_valid(pl) or pl.dead:
		state = State.IDLE
		_play("idle")
		return
	var to: Vector3 = pl.global_position - global_position
	var flat := Vector3(to.x, 0, to.z)
	var dist := flat.length()
	senses.look(dt, pl, flat, dist)
	if attacks:
		attacks.cool(dt)
	state = _decide()
	match state:
		State.DORMANT, State.IDLE:
			move.idle_tick(dt)
		State.STUNNED:
			move.stunned_tick(dt)
		_:
			_hunt(dt, pl, to, flat, dist)


## What it is doing, from what has happened to it. Hunting (alert, attacking, climbing) is refined in _hunt.
func _decide() -> int:
	if not awake:
		return State.DORMANT if d.has("dormant_clip") and not roused else State.IDLE
	if stun > 0.0:
		return State.STUNNED
	if attacks and attacks.busy():
		return State.ATTACKING
	return State.CLIMBING if surf != 0 else State.ALERT


func _dead_tick(dt: float) -> void:
	if attacks:
		attacks.release_if_holding()
	if surf != 0:                                    # shot off the wall: what is left comes down
		climb.fall_tick(dt, Vector3.ZERO)
	else:
		remains.tick(dt)


## What goes on whatever it is doing: wading, its lights, its burning skin, flying, its face, swimming.
func _body_tick(dt: float) -> void:
	move.wet = surf == 0 and level.fluid_at(global_position)
	if looks:
		looks.eq_tick(dt)
	if attacks:
		attacks.touch_tick(dt)
	move.fly_tick()
	if looks:
		looks.face_idle_tick(dt)
	move.swim_tick(dt)


## Awake and after its target: shout, aim, hold on, strike or choose a strike, climb, or go after it.
func _hunt(dt: float, pl: Node3D, to: Vector3, flat: Vector3, dist: float) -> void:
	if looks:
		looks.bark(dt)
	if aim:
		aim.tick(dt, pl)
	if attacks:
		if not attacks.tick(dt, pl, to, flat, dist):  # an attack in progress, or one just begun, has the whole tick
			state = State.ATTACKING
			return
		if attacks.busy():
			state = State.ATTACKING
	if surf != 0:
		state = State.CLIMBING
		climb.tick(dt, pl, flat, dist)
		return
	if climb and climb.consider(dt, dist):          # on the floor, thinking about the walls
		state = State.CLIMBING
		return
	move.hunt(dt, pl, flat, dist)


func attacking() -> bool:
	return attacks != null and attacks.busy()


# ------------------------------------------------------------------ being hurt, and dying
func hurt(amount: float, info: Dictionary = {}) -> void:
	if dead:
		return
	amount *= d.get("takes", {}).get(info.get("type", ""), 1.0)
	amount *= (1.0 - d.get("armor", 0.0))
	hp -= amount
	if not awake:
		alert()
	if off_duty and e.get("provoke", false) and info.get("from_player", info.get("type", "") != "trap"):
		anger()                                      # this one was only being polite
	if off_duty:
		od.hurt(amount)
	elif dock == null:
		awake = true
	if (surf == 1 or surf == 2) and hp > 0.0 and (amount > max_hp * 0.25 or randf() < 0.4):
		climb.drop()                                 # knocked off
	_flash_t = 0.08
	for m in _meshes:
		m.material_overlay = _overlay
	var pt: Vector3 = info.get("point", eye())
	Fx.sparks(level, pt, LM.col(d.get("blood"), Color(1.0, 0.7, 0.3)), 8, 4.0)
	if hp <= 0.0:
		_die(info)
		return
	LM.sound(d.get("sounds", {}).get("hurt", "hit"), global_position, -3.0)
	if not attacking() and amount > max_hp * 0.12:
		_play("hurt")
		if anim:
			anim.seek(0.0)
	if info.has("from") and not fixed:
		var k: Vector3 = (global_position - info["from"])
		k.y = 0
		velocity += k.normalized() * min(6.0, amount * 0.25) / d.get("mass", 1.0)


func _die(info: Dictionary) -> void:
	dead = true
	state = State.DEAD
	if attacks:
		attacks.drop_attack()
	if lounge:
		lounge.end()
	if surf == 1 or surf == 2:
		surf = 3
	elif surf == 4:
		surf = 0
	collision_layer = 0
	collision_mask = 1 | Level.GLASS
	if surf != 0:
		velocity = wall_n * 1.5
	elif is_on_floor() and not move.fly:
		velocity = Vector3.ZERO
	else:
		velocity = Vector3(velocity.x * 0.5, minf(velocity.y, 0.0), velocity.z * 0.5)      # in the air: it keeps some of its way and falls
	remains = _add(ActorRemains.new())
	remains.died()
	_play("die")
	LM.sound(d.get("sounds", {}).get("die", "die"), global_position)
	remains.leave(info)
