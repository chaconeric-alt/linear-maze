extends Prop
## Station - where a robot waits when it is not out on patrol: a bay fitted out to watch, mend and charge it. One model
## for each kind of robot (kits/robots). Shut, its shutter is down over a hibernating robot; open, it is a frame with the
## robot standing in it. Either way the robot is switched off until something activates it: it sees the player, the
## station's own sensor does (shut ones: only what comes close), it is shot at, it hears gunfire, or a robot near it
## raises the alarm. Then the shutter opens and it comes out. An empty station's robot is already out.
##   level thing: {"station": "rb_station_custodian", "actor": "custodian", "at": [x, y], "face": "s", "shut": true}
class_name Station

var bot: Enemy
var released := false
var _shut_cs: CollisionShape3D
var _poll := 0.0
var _opening := false
var _front := 2.0
var _away_t := 0.0


func setup(lv: Level, entry: Dictionary, kit: String) -> void:
	super.setup(lv, entry, kit)
	var shut: bool = e.get("shut", false)
	if meta.has("shut_box"):                         # what the shutter stops while it is down: [x, y, z, width, height, depth]
		var b: Array = meta["shut_box"]
		_shut_cs = CollisionShape3D.new()
		var bx := BoxShape3D.new()
		bx.size = Vector3(b[3], b[4], b[5])
		_shut_cs.shape = bx
		_shut_cs.position = Vector3(b[0], b[1], b[2])
		_shut_cs.disabled = not shut
		add_child(_shut_cs)
		_front = float(meta.get("front", b[2] + b[5] / 2.0 + 0.35))
	_open = 0.0 if shut else 1.0
	_open_target = _open
	_pose()
	set_process(true)


## The robot that waits here. It stands still, switched off, until release().
func hold(a: Enemy) -> void:
	bot = a
	if a == null:
		return
	a.dock = self
	var st: Vector3 = LM.vec(meta.get("stand"), Vector3.ZERO)
	a.position = position + basis * st
	a.rotation.y = rotation.y
	a._home = a.position


func _process(dt: float) -> void:
	super._process(dt)
	if _shut_cs and not _shut_cs.disabled and _open > 0.5:
		_shut_cs.disabled = true
	if _opening and _open >= 0.999:
		_opening = false
		_let_out()
	if released or bot == null or not is_instance_valid(bot) or bot.dead:
		return
	if bot.off_duty:
		_off_duty(dt)
		return
	_poll -= dt
	if _poll > 0.0:
		return
	_poll = 0.25
	var pl := Game.player
	if pl == null or not is_instance_valid(pl) or pl.dead or Game.calm:
		return
	var eye: Vector3 = global_position + global_transform.basis.z * _front + Vector3(0, 1.4, 0)      # the sensor over the door
	var reach: float = e.get("wake", meta.get("wake", 8.0 if _open < 0.5 else 14.0))
	if eye.distance_to(pl.global_position) < reach and level.los(eye, pl.global_position + Vector3(0, 1.3, 0)):
		release()


## Open up and switch the robot on. Called by the sensor, and by the robot itself when anything wakes it.
func release() -> void:
	if released:
		return
	released = true
	if _open >= 0.999:
		_let_out()
		return
	_open_target = 1.0
	_opening = true
	LM.sound("locker", global_position)
	Fx.flash(level, global_position + Vector3(0, 2.0, 0) + global_transform.basis.z * _front, Color(1.0, 0.7, 0.2), 2.0, 5.0, 0.5)


func _let_out() -> void:
	if bot == null or not is_instance_valid(bot) or bot.dead:
		return
	bot.dock = null
	bot._leaving = self
	bot.e["still"] = false
	bot.alert()


## Off duty (see Enemy): the station opens when the player comes up to it and shuts again when they have gone, if it
## was a shut one and its robot is in it. The robot does not come out unless it is sent to show what it does.
func _off_duty(dt: float) -> void:
	var home: bool = bot.dock == self and bot._foe == null and bot._od == ""
	if _shut_cs:
		_shut_cs.disabled = _open > 0.5 or not home
	_poll -= dt
	if _poll > 0.0:
		return
	_poll = 0.25
	var pl := Game.player
	var near := false
	if pl != null and is_instance_valid(pl) and not pl.dead and not Game.calm:
		var eye: Vector3 = global_position + global_transform.basis.z * _front + Vector3(0, 1.4, 0)
		near = eye.distance_to(pl.global_position) < float(e.get("wake", meta.get("wake", 8.0))) and level.los(eye, pl.global_position + Vector3(0, 1.3, 0))
	if near or not home:
		_away_t = 0.0
		if _open_target < 1.0:
			_open_target = 1.0
			LM.sound("locker", global_position)
	elif e.get("shut", false):
		_away_t += 0.25
		if _away_t > 4.0 and _open_target > 0.0 and not bot._roused:
			_open_target = 0.0
			LM.sound("locker", global_position, -4.0)


## Open up for a robot that is being sent out and will come back.
func let_go() -> void:
	_open_target = 1.0
	_away_t = 0.0
