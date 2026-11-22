extends RefCounted
## EffectRegistry - the one table of everything that can be made to happen: effect type -> handler.
##
## An effect is a dictionary, {"type": "open", "tag": "vault", ...}. Levels, terminals, traps, pickups and conversations
## all speak this one small language (SPEC.md, "Effects"), and Game.run_effects() runs a list of them. Whoever owns the
## workings registers a handler for each type it knows: Game the run's own (message, flag, credits ...), the Level the
## place's (doors, lights, spawns ...). A new kind of effect is a new handler, registered; nothing else has to change.
##
## Two families share the table under a prefix, because they are the same idea with a different caller:
##   "use:<type>"     what a Prop does when it is used ("use": {"type": "cache"} in a level), engine/prop_uses.gd
##   "option:<key>"   a key on a panel option that has to be got past first ("carrying", "cost", "hack", "risk"), engine/option_gates.gd
## Neither is meant for an effect list in a level file.
class_name EffectRegistry

var _handlers: Dictionary = {}       # type -> Callable(effect: Dictionary, ctx: Dictionary)
var _gates: Dictionary = {}          # option key -> {"check": Callable, "settle": Callable}, in the order they are applied


## Make `type` do what `handler` does. A later registration of the same type replaces the earlier one (a new level).
func register(type: String, handler: Callable) -> void:
	_handlers[type] = handler


func has(type: String) -> bool:
	return _handlers.has(type) and (_handlers[type] as Callable).is_valid()


## Every effect type a level file may use (no prefixed ones).
func types() -> Array:
	var out: Array = []
	for t in _handlers:
		if not str(t).contains(":"):
			out.append(t)
	return out


func run(ef: Dictionary, ctx: Dictionary) -> void:
	var t: String = str(ef.get("type", ""))
	if not has(t):
		push_warning("Unknown effect: " + str(ef.get("type")))
		return
	(_handlers[t] as Callable).call(ef, ctx)


## What a Prop does when used: the handler for "use:<type>", or plain effects if nobody knows that type.
## Returns false when nothing came of it (an empty dispenser), so the level is not told it was used.
func use(type: String, u: Dictionary, ctx: Dictionary) -> bool:
	var key := "use:" + type
	if not has(key):
		key = "use:effects"
	return bool((_handlers[key] as Callable).call(u, ctx))


# ------------------------------------------------------------------ panel option keys
## An option key that stands between choosing an option and its effects. `check` runs before the option is marked used
## (it may wait, and returns false to stop); `settle` runs after (it may undo the mark through the session, and returns
## false to stop). Either may be an empty Callable. Keys are applied in the order they were registered.
func register_gate(key: String, check: Callable, settle: Callable = Callable()) -> void:
	_gates[key] = {"check": check, "settle": settle}
	_handlers["option:" + key] = check if check.is_valid() else settle      # listed with the rest, for the schema check


func gates() -> Array:
	return _gates.keys()


func gate(key: String) -> Dictionary:
	return _gates.get(key, {})
