extends RefCounted
## PropUses - what a Prop does when it is used: the level entry's "use": {"type": ...} (SPEC.md, "Props").
## Each type is a handler in the EffectRegistry under "use:<type>", called with the "use" block and
## {"prop": the Prop, "player": who used it}. A handler returns false when nothing came of it (so the
## level's "use" trigger does not fire). A type nobody has registered is plain "effects".
class_name PropUses


func register(reg: EffectRegistry) -> void:
	reg.register("use:terminal", panel)
	reg.register("use:read", panel)
	reg.register("use:cache", cache)
	reg.register("use:locker", locker)
	reg.register("use:home", home)
	reg.register("use:heal", heal)
	reg.register("use:effects", effects)


## Something to read or work: the HUD's panel, with the block's text and options.
func panel(u: Dictionary, ctx: Dictionary) -> bool:
	Game.hud.open_panel(ctx["prop"], u)
	return true


## A box that opens and throws out what is in it.
func cache(u: Dictionary, ctx: Dictionary) -> bool:
	var pr: Prop = ctx["prop"]
	var level: Level = pr.level
	pr.used += 1
	pr.open_up()
	LM.sound("cache", pr.global_position)
	if u.has("text"):
		Game.say(u["text"], u.get("text_kind", "info"))
	var i := 0
	for it in u.get("loot", []):
		var p := Pickup.new()
		level.add_child(p)
		p.global_position = pr.global_position + Vector3(0, 0.9, 0)
		p.setup(level, it, pr.kit_id)
		var a: float = TAU * i / maxf(1.0, u["loot"].size()) + pr.global_rotation.y
		var to := pr.global_position + Vector3(cos(a) * 1.5, 1.0, sin(a) * 1.5 + 0.2)
		var tc := level.cell_of(to)
		if not level.open_s(tc.x, tc.y, level.floor_of(pr.global_position + pr.global_transform.basis.z * 0.8 + Vector3(0, 0.5, 0))):      # against a wall: it all comes out the front
			to = pr.global_position + pr.global_transform.basis.z * 1.3 + pr.global_transform.basis.x * (i - (u["loot"].size() - 1) / 2.0) * 0.6 + Vector3(0, 1.0, 0)
		var tw := p.create_tween()
		tw.tween_property(p, "global_position", (p.global_position + to) / 2 + Vector3(0, 1.0, 0), 0.25)
		tw.tween_property(p, "global_position", to, 0.25)
		i += 1
	Game.run_effects(u.get("effects"), {"at": pr.global_position, "prop": pr})
	return true


## A wall locker: what is in it comes out: things to take, things that bite, or things that go off.
func locker(u: Dictionary, ctx: Dictionary) -> bool:
	var pr: Prop = ctx["prop"]
	var level: Level = pr.level
	var basis: Basis = pr.global_transform.basis
	pr.used += 1
	pr.open_up()
	LM.sound("locker", pr.global_position)
	var front: Vector3 = pr.global_position + basis.z * 1.3
	var k := 0
	for it in u.get("loot", []):
		var p := Pickup.new()
		level.add_child(p)
		p.global_position = pr.global_position + basis.z * 0.4 + Vector3(0, 1.1, 0)
		p.setup(level, it, pr.kit_id)
		var to: Vector3 = front + basis.x * (k - (u["loot"].size() - 1) / 2.0) * 0.7 + Vector3(0, 1.0, 0)
		p.create_tween().tween_property(p, "global_position", to, 0.3)
		k += 1
	if u.has("actor"):
		Game.say(u.get("text", "It was not empty."), "warn")
		for i in int(u.get("count", 1)):
			var a := level.spawn_thing({"actor": u["actor"], "alert": true, "level": roundi(level.floor_y(front) / level.H)}, level.cell_of(front))
			if a:
				a.global_position = Vector3(front.x, a.global_position.y, front.z) + basis.x * (i - (u.get("count", 1) - 1) / 2.0) * 0.9
	elif u.get("loot", []).is_empty() and not u.has("effects"):
		Game.say(u.get("text", "Empty. Somebody got here first, three hundred years ago."), "info")
	Game.run_effects(u.get("effects"), {"at": front, "prop": pr})
	return true


## The bunker's furniture: engine/home.gd knows what each piece does.
func home(u: Dictionary, ctx: Dictionary) -> bool:
	var pr: Prop = ctx["prop"]
	if pr.level.home:
		pr.level.home.use_prop(pr, u.get("what", ""))
	return true


## A dispenser with a few charges.
func heal(u: Dictionary, ctx: Dictionary) -> bool:
	var pr: Prop = ctx["prop"]
	var who: Node = ctx["player"]
	var left: int = int(u.get("charges", 3)) - pr.used
	if left <= 0:
		Game.say("The dispenser is empty. It apologises.", "warn")
		return false
	if who.hp >= who.max_hp:
		Game.say("You are in acceptable condition.", "info")
		return false
	pr.used += 1
	who.heal(u.get("amount", 35))
	LM.sound("heal", pr.global_position)
	Game.say("Health +%d  (%d left)" % [u.get("amount", 35), left - 1], "good")
	return true


## Anything else: a sound, and the block's effects.
func effects(u: Dictionary, ctx: Dictionary) -> bool:
	var pr: Prop = ctx["prop"]
	pr.used += 1
	LM.sound(u.get("sound", "use"), pr.global_position)
	Game.run_effects(u.get("effects"))
	return true
