extends RefCounted
## LevelEffects - the effects that belong to the place: doors, lights, spawns, alarms, things shown and hidden,
## off-duty monsters sent to the range, making the place safe. Registered with the EffectRegistry by the Level when it is built, so the
## handlers always act on the level being played. SPEC.md, "Effects".
class_name LevelEffects

var level: Level


func _init(lv: Level) -> void:
	level = lv


func register(reg: EffectRegistry) -> void:
	reg.register("drill", drill)
	reg.register("drill_stop", drill_stop)
	for t in ["unlock", "open", "seal", "close"]:
		reg.register(t, door)
	reg.register("lights", lights)
	reg.register("anger", temper)
	reg.register("pacify", temper)
	reg.register("show", show_hide)
	reg.register("hide", show_hide)
	reg.register("drop", drop)
	reg.register("spawn", spawn)
	reg.register("alarm", alarm)
	reg.register("enable", enable)
	reg.register("disable", enable)
	reg.register("make_safe", make_safe)


func _tagged(ef: Dictionary) -> Array:
	return level.things_by_tag.get(ef.get("tag", ""), [])


## An off-duty monster of that kind (the nearest to the target) shows what it does.
func drill(ef: Dictionary, _ctx: Dictionary) -> void:
	var tag: String = ef.get("tag", "")
	var want: String = ef.get("actor", "")
	var tgt: Node3D = null
	for t in level.targets:
		if is_instance_valid(t) and t.busy == null and (tag == "" or t.tag == tag):
			tgt = t
			break
	var best: Actor = null
	for a in level.actors:
		if is_instance_valid(a) and not a.dead and a.free_for_drill() and (want == "" or LM.defs["actors"].find_key(a.d) == want):
			if tgt != null and (best == null or a.global_position.distance_to(tgt.global_position) < best.global_position.distance_to(tgt.global_position)):
				best = a
	if best == null or tgt == null or not best.drill(tgt):
		Game.say("Range: nobody free to shoot." if tgt != null else "Range: every lane is in use.", "warn")
	else:
		Game.say("Range: %s to the line." % best.d.get("name", "shooter"), "info")


func drill_stop(_ef: Dictionary, _ctx: Dictionary) -> void:
	for a in level.actors:
		if is_instance_valid(a) and a.off_duty and a.drilling():
			a.drill_end()


func door(ef: Dictionary, _ctx: Dictionary) -> void:
	for d in _tagged(ef):
		if d is Door:
			d.command(ef["type"])


## "room": "*" is every room; "floor": n keeps it to one storey.
func lights(ef: Dictionary, _ctx: Dictionary) -> void:
	var on: bool = ef.get("on", true)
	var which: Array = level.lights_by_room.keys() if ef.get("room", "") == "*" else [ef.get("room", "")]
	for rn in which:
		for l in level.lights_by_room.get(rn, []):
			if not is_instance_valid(l) or (ef.has("floor") and floori((l.global_position.y - 0.1) / level.H) != int(ef["floor"])):
				continue
			l.set_meta("off", not on)
			l.light_energy = l.get_meta("base") * float(ef.get("energy", 1.0)) if on else 0.0
			if ef.has("color"):
				l.light_color = LM.col(ef["color"])


## "anger": off-duty things with that tag turn on you; "pacify": things stand down for good.
func temper(ef: Dictionary, _ctx: Dictionary) -> void:
	for a in _tagged(ef):
		if a is Actor and is_instance_valid(a) and not a.dead:
			if ef["type"] == "anger":
				a.anger()
			else:
				a.stand_down()


## Props placed with "hidden": true, and props that should go.
func show_hide(ef: Dictionary, _ctx: Dictionary) -> void:
	for t in _tagged(ef):
		if is_instance_valid(t) and t.has_method("show_up"):
			t.show_up(ef["type"] == "show")


## Things to pick up, where the thing that ran the effect is (or at the player's feet).
func drop(ef: Dictionary, ctx: Dictionary) -> void:
	var pl: Node3D = Game.player
	var base: Vector3 = pl.global_position + Vector3(0, 0.2, 0)
	if ctx.has("prop") and is_instance_valid(ctx["prop"]):
		var pr: Node3D = ctx["prop"]
		var toward: Vector3 = pl.global_position - pr.global_position
		toward.y = 0
		base = pr.global_position + toward.normalized() * minf(1.5, toward.length() * 0.6)
		var st: int = level.floor_of(pl.global_position)
		var bc := level.cell_of(base)
		if not level.open_s(bc.x, bc.y, st):               # that is inside a wall: in front of the thing, then, or at their feet
			base = pr.global_position + pr.global_transform.basis.z * 1.3
			bc = level.cell_of(base)
			if not level.open_s(bc.x, bc.y, st):
				base = pl.global_position
		base.y = level.floor_y(pl.global_position) + 0.2
	var items: Array = ef.get("items", [])
	for i in items.size():
		var pk := Pickup.new()
		level.add_child(pk)
		var a2: float = TAU * i / maxf(1.0, items.size())
		pk.global_position = base + Vector3(cos(a2), 0, sin(a2)) * (0.5 if items.size() > 1 else 0.0) + Vector3(0, 0.9, 0)
		pk.setup(level, items[i] if items[i] is Dictionary else {"item": items[i]}, level.kit_id)
		level.spawner.keep(pk)


func spawn(ef: Dictionary, ctx: Dictionary) -> void:
	var tag: String = ef.get("tag", "")
	var spots: Array = level.tags.get(tag, [])
	var storey: int = int(ef.get("level", 0))        # "level": the storey its tagged cells are on
	if ef.get("here", false) and ctx.has("at"):        # where the thing that ran the effect stands
		spots = [level.cell_of(ctx["at"])]
		storey = level.floor_of(ctx["at"])
	for i in int(ef.get("count", 1)):
		if spots.is_empty():
			break
		var p: Vector2i = spots[i % spots.size()]
		var e := {"actor": ef.get("actor", ""), "tag": ef.get("as", ""), "alert": ef.get("alert", true), "level": storey,
			"offset": [randf_range(-1.0, 1.0), 0, randf_range(-1.0, 1.0)]}
		level.spawn_thing(e, p)


## An alarm with a radius is heard on its own floor.
func alarm(ef: Dictionary, _ctx: Dictionary) -> void:
	LM.sound("alarm")
	for a in level.actors:
		if is_instance_valid(a) and not a.dead:
			if not ef.has("radius") or (a.global_position.distance_to(Game.player.global_position) < ef["radius"] and level.floor_of(a.global_position) == level.floor_of(Game.player.global_position)):
				a.alert()


func enable(ef: Dictionary, _ctx: Dictionary) -> void:
	for t in _tagged(ef):
		if t.has_method("set_enabled"):
			t.set_enabled(ef["type"] == "enable")


## The level is made safe for good: its makers stop (Restock) and so do its repair bays (Rebuilder). "levels": the keys
## of other levels made safe with it, so one mainframe can shut a whole installation down. A death puts it back as the
## expedition found it, as it does everything else.
func make_safe(ef: Dictionary, _ctx: Dictionary) -> void:
	var also: Array = ef.get("levels", [])
	State.mark_safe(State.level_key)
	for k in also:
		State.mark_safe(str(k))
	Events.emit("level.safe", {"level": State.level_key, "also": also.duplicate()})
