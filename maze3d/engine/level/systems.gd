extends RefCounted
## LevelSystems - what runs through a whole level: its power, its security, its air (the generation review, 25 Nov:
## "treat infrastructure as a gameplay mechanic ... shared systems, not isolated switches"). Each is a named system in
## one of its states.
##   The game's `systems` say what each kind is: its name, and its states in order, each with its name, what it says
##   and sounds as the system comes to it, and what it does: to the lights of the rooms the system serves ("lights":
##   {"energy", "color"}), to how long a cloud hangs ("clouds": times as long), what a thing it stops says ("refuse").
##   A level's `systems` say which it has: the state each starts in ("start", else its first), the rooms it serves
##   ("rooms": names, or "*", the default), and what happens as it comes to a state ("do": {state: [effects]}).
## A thing whose entry `needs` systems in states ({"power": "on"}, {"security": ["normal", "alert"]}) works only while
## they are: a door opens, a lift runs, a trap fires, a station lets its robot out, a maker makes, a terminal answers
## (set_working, else set_enabled). A panel option that needs them says so and is refused without them. The `system`
## effect changes a state; `system.changed` says it did; the level's memory keeps the states. Every change shows: the
## lights of the rooms it serves, a line on the screen, a sound, and "{sys:<name>}" in a terminal's words.
class_name LevelSystems

var level: Level
var kinds: Dictionary = {}        # the game's: name -> {"name", "states": {state: {...}}}
var spec: Dictionary = {}         # the level's: name -> {"start", "rooms", "do"}
var state: Dictionary = {}        # name -> its state now
var _watch: Array = []            # [node, needs]: everything whose entry needs a system


func _init(lv: Level) -> void:
	level = lv
	kinds = LM.game.get("systems", {})
	var given: Dictionary = lv.data.get("systems", {})
	for n in given:
		spec[n] = given[n] if given[n] is Dictionary else {"start": str(given[n])}
		var all := states(n)
		state[n] = str(spec[n].get("start", all[0] if not all.is_empty() else ""))


## Does the level have this system?
func has(name: String) -> bool:
	return state.has(name)


## Its states, in order.
func states(name: String) -> Array:
	return kinds.get(name, {}).get("states", {}).keys()


## What the player calls it ("Main power").
func display(name: String) -> String:
	return str(kinds.get(name, {}).get("name", name.capitalize()))


## What the player calls its state now ("ON").
func state_name(name: String) -> String:
	return str(_now(name).get("name", str(state.get(name, "")).to_upper()))


## Every system `needs` names is in one of the states it lists (a state, or a list of them). A system the level does not
## have stands in nobody's way.
func ok(needs: Dictionary) -> bool:
	for n in needs:
		if state.has(n) and not LevelSystems._wanted(needs[n]).has(state[n]):
			return false
	return true


## What stands in the way of `needs`, said plainly ("No power."), or "" if nothing does.
func refusal(needs: Dictionary) -> String:
	for n in needs:
		if state.has(n) and not LevelSystems._wanted(needs[n]).has(state[n]):
			return str(_now(n).get("refuse", "%s is %s." % [display(n), state_name(n)]))
	return ""


## What `needs` asks for, as a label says it ("Main power ON").
func wanted(needs: Dictionary) -> String:
	var out: Array = []
	for n in needs:
		if state.has(n):
			var names: Array = LevelSystems._wanted(needs[n]).map(func(s: String) -> String:
				return str(kinds.get(n, {}).get("states", {}).get(s, {}).get("name", s.to_upper())))
			out.append("%s %s" % [display(n), "/".join(names)])
	return ", ".join(out)


## A thing that needs systems: told now whether it works, and again at every change.
func watch(n: Node, needs: Dictionary) -> void:
	_watch.append([n, needs])
	LevelSystems._tell(n, ok(needs))


## The system comes to `to`: the things that need it are told, the lights it serves change, it says so and sounds,
## `system.changed` is announced and the level's `do` for that state is run. Nothing happens if it is there already.
func set_state(name: String, to: String) -> void:
	if not state.has(name) or to == state[name] or not states(name).has(to):
		return
	var was: String = state[name]
	state[name] = to
	_apply()
	var now := _now(name)
	if now.has("say"):
		Game.say(str(now["say"]), str(now.get("kind", "info")))
	LM.sound(str(now.get("sound", "")))
	Events.emit("system.changed", {"system": name, "state": to, "was": was})
	Game.run_effects(spec[name].get("do", {}).get(to, []), {})


## The next of its states, in order (a switch of two flips).
func cycle(name: String) -> void:
	var all := states(name)
	if state.has(name) and not all.is_empty():
		set_state(name, all[(all.find(state[name]) + 1) % all.size()])


## How much longer than it would a cloud hangs now (every system's state's "clouds", multiplied).
func factor(key: String) -> float:
	var f := 1.0
	for n in state:
		f *= float(_now(n).get(key, 1.0))
	return f


## A terminal's words with "{sys:<name>}" put as the system's state now ("Main power: {sys:power}").
func fill(text: String) -> String:
	for n in state:
		text = text.replace("{sys:%s}" % n, state_name(n))
	return text


## The level's memory (LevelMemory): every system's state.
func remember() -> Dictionary:
	return state.duplicate()


## Back as it was left: the states, the things and the lights as they say, quietly (what came of a change then has
## been remembered with what it changed).
func recall(r: Dictionary) -> void:
	for n in r:
		if state.has(n) and states(n).has(str(r[n])):
			state[n] = str(r[n])
	_apply()


## Everything told again, and the lights.
func _apply() -> void:
	for w in _watch:
		if is_instance_valid(w[0]):
			LevelSystems._tell(w[0], ok(w[1]))
	_lights()


## The lights of each room served by a system whose states change its lights: as built, then dimmed (energy) and
## tinted (color) by each such system's state (power off: the emergency lights; security on alert: red).
func _lights() -> void:
	var touching: Array = state.keys().filter(func(n: String) -> bool:
		return kinds.get(n, {}).get("states", {}).values().any(func(s: Dictionary) -> bool: return s.has("lights")))
	if touching.is_empty():
		return
	for room in level.lights_by_room:
		var mine: Array = touching.filter(func(n: String) -> bool: return _serves(n, room))
		if mine.is_empty():
			continue
		var energy := 1.0
		var color: Variant = null
		for n in mine:
			var li: Dictionary = _now(n).get("lights", {})
			energy *= float(li.get("energy", 1.0))
			if li.has("color"):
				color = LM.col(li["color"])
		for l in level.lights_by_room[room]:
			if not is_instance_valid(l) or l.get_meta("off", false):
				continue
			if not l.has_meta("built_color"):
				l.set_meta("built_color", l.light_color)
			l.light_energy = float(l.get_meta("base", l.light_energy)) * energy
			l.light_color = color if color != null else l.get_meta("built_color")


## Does the system serve that room ("rooms": names, or "*", the default)?
func _serves(name: String, room: String) -> bool:
	var rooms: Variant = spec.get(name, {}).get("rooms", "*")
	return str(rooms) == "*" or (rooms is Array and rooms.has(room))


## Its state now, as the game describes it.
func _now(name: String) -> Dictionary:
	return kinds.get(name, {}).get("states", {}).get(state.get(name, ""), {})


static func _wanted(v: Variant) -> Array:
	return (v as Array).map(func(s: Variant) -> String: return str(s)) if v is Array else [str(v)]


static func _tell(n: Node, on: bool) -> void:
	if n.has_method("set_working"):
		n.set_working(on)
	elif n.has_method("set_enabled"):
		n.set_enabled(on)
