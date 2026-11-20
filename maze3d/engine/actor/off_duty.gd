extends Node
## ActorOffDuty - off duty (a level's "off_duty": true, or a thing's; or after the effect "pacify"). Nothing off duty
## fights. It notices the player (within `talk.reach`, 9 m; `wake_sight` for things that stand dormant), says one of
## `talk.greet`, turns to them, and now and then says one of `talk.idle` (its `barks`, without). When the player has
## been gone four seconds it stops paying attention: a thing with a `dormant_clip` goes dormant again, and its station,
## if it has one, shuts over it. Things that can walk and have nothing better to do (no station, no lounging, no perch)
## wander about near where the level put them (`"roam": cells`, 4; `"still": true` for none).
## And it will show what it does on duty, on a Target (drill): fight it for `talk.drill_time` seconds (8) from its first
## attack, then go back to where it was. What cannot move needs a target it can see from where it is; what can goes to
## the gun range (targets tagged "range").
class_name ActorOffDuty

var a: Actor
var d: Dictionary
var post := Vector3.ZERO          # where the level put it, and where it goes back to
var _post_yaw := 0.0
var _post_lounge: Dictionary = {}
var _foe: Node3D = null           # what it is showing its attacks on (a Target)
var _drill_t := 0.0
var _drill_max := 0.0
var _drill_on := false
var _od := ""                     # "back": on its way home after a drill
var _dock_in := false
var _rouse_t := 0.0
var _chat_t := 4.0
var _roam_t := 3.0
var _roam_for := 0.0
var _ow_t := 0.0


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


## Where it is now is its post (called once it has settled: after the level's furniture is in).
func remember_post() -> void:
	post = a.position
	_post_yaw = a.rotation.y
	_post_lounge = a.lounge.current if a.lounge else {}


func drilling() -> bool:
	return _foe != null


func heading_home() -> bool:
	return _od != ""


func at_post() -> bool:
	return _foe == null and _od == ""


## The Target it is showing its attacks on, if it is still there.
func foe() -> Node3D:
	return _foe if _foe != null and is_instance_valid(_foe) else null


## No longer off duty (anger): it is not showing anything, and not going anywhere.
func stop() -> void:
	_foe = null
	_od = ""


## Somebody is talking to it: it pays attention, and goes on paying it for a while.
func attend() -> void:
	a.roused = true
	_rouse_t = 0.0


## Put back at its post by somebody else.
func arrived() -> void:
	_od = ""


func _reach() -> float:
	return float(a.e.get("greet", d.get("talk", {}).get("reach", d.get("wake_sight", 9.0) if d.has("dormant_clip") else 9.0)))


## Off duty, hurt: it complains (once in a while), unless it is in the middle of showing what it does.
func hurt(amount: float) -> void:
	if _foe == null and _ow_t <= 0.0 and a.hp - amount > 0.0:
		_ow_t = 2.0
		a.talker.say("hurt", ["HEY", "I AM ON MY BREAK", "RUDE"])


## One tick off duty. Returns what to fight this tick (its Target, while drilling), or null when the tick is done.
func tick(dt: float, pl: Node3D) -> Node3D:
	if _foe == null or not is_instance_valid(_foe):
		_foe = null
		_tick(dt, pl)
		return null
	_drill_max -= dt
	if a.attacking():
		_drill_on = true
	if _drill_on:
		_drill_t -= dt
	var holding: bool = a.attacks != null and a.attacks.holding()
	if (_drill_t <= 0.0 or _drill_max <= 0.0) and not a.attacking() and not holding and (a.surf == 0 or _drill_max <= 0.0):
		drill_end()
		return null
	return _foe


func _tick(dt: float, pl: Node3D) -> void:
	_ow_t -= dt
	var flat := Vector3.ZERO
	var dist := 1e9
	if pl != null and is_instance_valid(pl) and not pl.dead and not Game.calm:
		flat = Vector3(pl.global_position.x - a.global_position.x, 0, pl.global_position.z - a.global_position.z)
		dist = flat.length()
		a.senses.look_off_duty(dt, pl, dist, _reach())
	else:
		a.senses.see = false
	_attention(dt)
	if a.stun > 0.0:
		a.stun -= dt
		a.move.stand(dt)
		return
	if a.roused and dist < 14.0:
		_chat_t -= dt
		if _chat_t <= 0.0:
			_chat_t = randf_range(8.0, 15.0)
			a.talker.say("idle")
	if _od == "back":                                # going home after a drill
		_go_back(dt)
		return
	if a.lounge and a.lounge.active():
		a.lounge.tick(dt)
		return
	_stay(dt, flat, dist)


## Somebody here: it greets them (and powers up, if it stands dormant). Gone four seconds: it stops paying attention.
func _attention(dt: float) -> void:
	if a.senses.see:
		_rouse_t = 0.0
		if not a.roused:
			a.roused = true
			_chat_t = randf_range(6.0, 11.0)
			a.talker.say("greet")
			if d.has("dormant_clip") and a.play("startle"):       # powering up takes a moment
				a.stun = d.get("startle_time", 1.0)
				a.anim.seek(0.0)
	elif a.roused:
		_rouse_t += dt
		if _rouse_t > 4.0:                               # they have gone
			a.roused = false


## Back from the range: to the front of its station and straight in, or to its post; there, as it was.
func _go_back(dt: float) -> void:
	var gone := Vector2(post.x - a.global_position.x, post.z - a.global_position.z).length()
	_roam_for += dt
	if a.fixed or a.surf != 0 or d.get("mount", "") == "ceiling" or gone < 0.45 or _roam_for > 300.0:
		_od = ""
		_dock_in = false
		if gone < 1.5 or _roam_for > 300.0:
			a.position = Vector3(post.x, a.position.y if _post_lounge.is_empty() else post.y, post.z)
			a.rotation.y = _post_yaw
			if not _post_lounge.is_empty():
				a.lounge.resume(_post_lounge)
		a.velocity = Vector3.ZERO
		return
	var dest := post                             # into a station: to the front of it, then straight in
	if a.dock != null and not _dock_in:
		var fr: Vector3 = a.dock.global_position + a.dock.global_transform.basis.z * (a.dock.front() + 1.3)
		if Vector2(fr.x - a.global_position.x, fr.z - a.global_position.z).length() < 0.9:
			_dock_in = true
		else:
			dest = fr
	a.move.go(dt, dest, 0.9, _dock_in)


## Nothing to do: stand (in a station, a turret, on a wall, told to keep still, dormant), face whoever is talking, dance,
## or wander about near its post.
func _stay(dt: float, flat: Vector3, dist: float) -> void:
	var mv := a.move
	if a.dock != null or a.fixed or a.surf != 0 or d.get("mount", "") == "ceiling" or d.get("still", false) or a.e.get("still", false):
		if a.roused and a.dock == null and a.surf == 0 and dist < 1e8:
			mv.turn_to(flat, dt, 3.0)
		mv.stand(dt, a.dock == null and a.surf == 0 and d.get("mount", "") != "ceiling")
		return
	if d.has("dormant_clip") and not a.roused:
		mv.stand(dt)
		return
	if a.roused and dist < 4.5:                       # somebody to talk to
		mv.turn_to(flat, dt, 4.0)
		mv.stand(dt)
		return
	if d.has("dance"):
		mv.dance_tick(dt)
		return
	if mv.roam.size() > 1:
		_roam_for += dt
		if mv.follow(dt, 0.4) or _roam_for > 14.0:
			mv.roam = PackedVector3Array()
			_roam_t = randf_range(3.0, 9.0)
		return
	mv.stand(dt)
	_roam_t -= dt
	if _roam_t <= 0.0:
		_roam_t = 1.5
		_pick_stroll()


## Somewhere near its post to walk to: open floor, not a door, a pit, a lift or (unless it swims) water.
func _pick_stroll() -> void:
	var r: int = int(a.e.get("roam", 4))
	var pc := a.level.cell_of(post)
	var c := pc + Vector2i(randi_range(-r, r), randi_range(-r, r))
	var st := a.move.storey()
	if r <= 0 or c.x < 1 or c.y < 1 or c.x >= a.level.w - 1 or c.y >= a.level.h - 1:
		return
	var ac: Dictionary = a.level.air(c.x, c.y, st)
	if ac["solid"] or ac["door"] != "" or ac.get("pit", false) or ac.has("lift") or a.level.is_blocked(c, st) or (ac["fluid"] and not d.has("swim")):
		return
	var pth := a.level.path(a.global_position, a.level.center(c, st * a.level.H))
	if pth.size() > 1 and pth.size() < 16:
		a.move.roam = pth
		_roam_for = 0.0


# ------------------------------------------------------------------ showing what it does
func drill(target: Node3D = null) -> bool:
	if not a.off_duty or a.dead or _foe != null or d.get("attacks", []).is_empty():
		return false
	if target == null:
		target = a.level.drill_target_for(a)
	if target == null:
		return false
	target.busy = a
	_foe = target
	_od = ""
	a.move.roam = PackedVector3Array()
	_drill_t = float(d.get("talk", {}).get("drill_time", 8.0))
	_drill_max = 240.0                               # however far it has to walk
	_drill_on = false
	if a.attacks:
		a.attacks.forget()
	a.senses.reset()
	a.move.path_t = 0.0
	if a.lounge and a.lounge.active():
		a.lounge.get_up()
	a.awake = true
	a.roused = true
	a.stun = 0.0
	_dock_in = false
	if a.dock != null:
		a.leave_station(a.dock)
		a.dock.let_go()
		if a.dock.open_amount() < 0.9:
			a.stun = 1.0
	if d.has("dormant_clip") and a.play("startle"):
		a.stun = maxf(a.stun, d.get("startle_time", 1.0))
		a.anim.seek(0.0)
	LM.sound(d.get("sounds", {}).get("alert", ""), a.global_position)
	return true


func drill_end() -> void:
	if _foe != null and is_instance_valid(_foe) and _foe.busy == a:
		_foe.busy = null
	if a.attacks:
		a.attacks.stop()
	_foe = null
	a.awake = false
	_od = "back"
	a.move.roam = PackedVector3Array()
	_roam_for = 0.0
	a.move.path_t = 0.0
	_rouse_t = 0.0
	if a.anim:
		a.anim.speed_scale = 1.0


func drill_ask() -> void:
	if drill():
		Game.say("%s: %s" % [d.get("name", "It"), "heading for the range." if not (a.fixed or d.get("mount", "") == "ceiling") else "taking aim."], "info")
	else:
		Game.say("%s has nothing to show that on." % d.get("name", "It"), "warn")
