extends Node
## Events - the event bus (autoload "Events"). Game facts, in the past tense, go from whoever caused them to whoever
## cares: Events.emit("actor.died", {...}); Events.on("actor.died", callable). Nothing that emits knows who listens.
##
## Rules (SPEC.md 5.13):
## - Facts, not orders. An event says what happened; it never asks for something to be done. A listener that wants
##   the level changed does it on the next frame (call_deferred), not in the middle of whoever emitted.
## - Payloads are plain data: ids, keys, numbers, strings, bools, and arrays and dictionaries of them. Never a node,
##   so any event can be printed, compared in a test or written to a save. A payload with an object in it is still
##   sent, but counted in bad_payloads and reported (the self-test fails on it).
## - Order does not matter: two listeners on one event must not depend on which runs first.
## - It saves nothing. What has to last is asked of the things themselves when the player leaves (later: the level's
##   memory), so a missed event can never lose state.
## Game's HUD signals (changed, toast, identified, ended) stay as they are: they are about the screen, not the world.

var bad_payloads := 0            # events whose payload held something that is not plain data
var _listeners: Dictionary = {}  # event name -> [Callable]; "*" hears every event
var _log: Array = []             # [name, payload] for every event since recording began (Debug.record_events)


## Tell everyone listening that this happened.
func emit(name: String, payload: Dictionary = {}) -> void:
	if not _plain(payload):
		bad_payloads += 1
		push_error("Events: %s carries something that is not plain data: %s" % [name, payload])
	if Debug.trace_events:
		print("EVENT  %s %s" % [name, JSON.stringify(payload)])
	if Debug.record_events:
		_log.append([name, payload.duplicate(true)])
	for who in [name, "*"]:
		var list: Array = _listeners.get(who, [])
		for c in list.duplicate():
			if not (c as Callable).is_valid():
				list.erase(c)                     # its owner is gone (a level that was left)
			elif who == "*":
				c.call(name, payload)
			else:
				c.call(payload)


## Hear this event from now on: callable(payload); with "*", every event: callable(name, payload).
func on(name: String, c: Callable) -> void:
	if not _listeners.has(name):
		_listeners[name] = []
	if not _listeners[name].has(c):
		_listeners[name].append(c)


func off(name: String, c: Callable) -> void:
	_listeners.get(name, []).erase(c)


## Every event since recording began (the self-test turns it on before the level is loaded), oldest first.
func recorded() -> Array:
	return _log


func _plain(v: Variant) -> bool:
	if v is Object:
		return false
	if v is Dictionary:
		for k in v:
			if not _plain(k) or not _plain(v[k]):
				return false
	elif v is Array:
		for x in v:
			if not _plain(x):
				return false
	return true
