extends RefCounted
## Interaction - the rules of panels: what a terminal, a sign, a conversation or a piece of bunker furniture offers,
## and what happens when one of its options is chosen: conditions, costs, hack and risk rolls, "used" marks, effects
## and callbacks. One per run (Game.interaction). The HUD only draws: it shows what offered() lists and hands the
## choice to choose(). SPEC.md, "Terminals".
##
## What has been used is kept by the thing's key (key_of: the same on every load of its level) in the level's memory
## (State), not written into the level's dictionaries, so level data stays as it was loaded, and a terminal used on an
## earlier visit is still used on the next.
class_name Interaction

var view: Object = null          # what draws the panel (the HUD): draw_panel(text, working, final), close_panel(), in_panel()
var thing: Node = null           # what the open panel belongs to
var spec: Dictionary = {}        # what it says and offers: {"kicker", "title", "text", "options": [...]}
var _choosing := -1              # the option being worked through
var _used: Dictionary:          # thing key -> {option index (as a string, as JSON keeps it): true}; in the level's memory
	get:
		return State.memory()["used"]
var _marks: Dictionary:         # thing key -> {name: true}: anything else a thing has done once ("prize": a riddle was paid)
	get:
		return State.memory()["marks"]


## The key marks are kept under: the thing's own key (Level.key_of), which is the same on every load of its level, so
## they can be saved. Something the level did not make (built by hand in a test) falls back to its node id.
func key_of(t: Object) -> String:
	if t == null:
		return ""
	if t.has_meta("key"):
		return str(t.get_meta("key"))
	return "id:%d" % t.get_instance_id()


func reset() -> void:
	thing = null
	spec = {}


## A panel is up for `t`, saying and offering what `s` says (the HUD calls this from open_panel and repanel).
func open(t: Node, s: Dictionary) -> void:
	thing = t
	spec = s


# ------------------------------------------------------------------ marks
func is_used(t: Object, i: int) -> bool:
	return _used.get(key_of(t), {}).has(str(i))


func forget_used(t: Object) -> void:
	_used.erase(key_of(t))


func set_mark(t: Object, name: String) -> void:
	if not _marks.has(key_of(t)):
		_marks[key_of(t)] = {}
	_marks[key_of(t)][name] = true


func has_mark(t: Object, name: String) -> bool:
	return _marks.get(key_of(t), {}).has(name)


# ------------------------------------------------------------------ what is offered
## The options to show now, in order: [[index into spec.options, label], ...]. `final`: that was an answer, so only what
## may follow it ("after": true) is offered.
func offered(final := false) -> Array:
	var out: Array = []
	var opts: Array = spec.get("options", [])
	for i in opts.size():
		var o: Dictionary = opts[i]
		if o.has("when") and not Game.has_flag(o["when"]):
			continue
		if o.has("unless") and Game.has_flag(o["unless"]):
			continue
		if o.get("once", false) and thing != null and is_used(thing, i):
			continue
		if final and not o.get("after", false):
			continue
		var lab: String = o.get("label", "")
		if o.has("hack"):                                # a hack shows its odds
			lab += "   [hack: %d%%]" % roundi(Game.hack_chance(float(o.get("hard", 0.0))) * 100.0)
		if o.has("carrying"):                            # and an option that needs a tool says which
			lab += "   [needs %s]" % Carrying.names(OptionGates.needs(o))
		out.append([i, lab])
	return out


# ------------------------------------------------------------------ choosing
## The player picked option i of the open panel.
func choose(i: int) -> void:
	var o: Dictionary = spec["options"][i]
	_choosing = i
	var reg: EffectRegistry = Game.effects
	for key in reg.gates():                          # "carrying", "cost", "hack": what has to be got past first (engine/option_gates.gd)
		var check: Callable = reg.gate(key)["check"]
		if o.has(key) and check.is_valid():
			var ok: bool = await check.call(o, self)
			if not ok:
				return
	if _live():
		_mark_used(i)
		Events.emit("thing.used", {"key": key_of(thing), "prop": str(thing.e.get("prop", "")) if thing is Prop else "", "use": "option", "option": i})
		if o.has("screen"):
			thing.set_screen(o["screen"])
	var ctx := panel_ctx()
	for key in reg.gates():                          # ... and what is settled once it goes ahead ("cost" is paid; "risk" can still undo it)
		var settle: Callable = reg.gate(key)["settle"]
		if o.has(key) and settle.is_valid() and not settle.call(o, self):
			return
	LM.sound("confirm")
	Game.run_effects(o.get("effects"), ctx)
	if o.has("do"):                                  # the panel's owner does something, and may put up another panel or close this one
		var was := spec
		(o["do"] as Callable).call()
		if not in_panel() or not is_same(was, spec):
			return
	var who: Node = thing
	var result: String = o.get("result", spec.get("text", ""))
	if o.has("results"):                             # one of several things it might say
		result = o["results"][randi() % o["results"].size()]
	if o.get("close", false):
		close_panel()
	else:
		view.draw_panel(result, "", o.get("final", false))
	if o.has("call") and who != null and is_instance_valid(who) and who.has_method(o["call"]):      # something the thing itself does
		who.call(o["call"])


func _live() -> bool:
	return thing != null and is_instance_valid(thing)


func _mark_used(i: int) -> void:
	var k := key_of(thing)
	if not _used.has(k):
		_used[k] = {}
	_used[k][str(i)] = true


# ------------------------------------------------------------------ the session, as the option gates see it
func in_panel() -> bool:
	return view != null and view.in_panel()


func panel_text() -> String:
	return spec.get("text", "")


func show_panel(text: String, working := "") -> void:
	view.draw_panel(text, working, false)


func close_panel() -> void:
	view.close_panel()


## Where the effects of an option happen: at the thing the panel belongs to.
func panel_ctx() -> Dictionary:
	if thing is Node3D and _live():
		return {"at": (thing as Node3D).global_position, "prop": thing}
	return {}


## The option being chosen went wrong: it can be chosen again.
func unmark_used() -> void:
	if _live():
		_used.get(key_of(thing), {}).erase(str(_choosing))
