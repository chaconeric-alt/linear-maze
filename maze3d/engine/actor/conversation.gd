extends Node
## ActorConversation - what an off-duty thing says, and the panel when you talk to it (E). defs "talk":
##   {"kicker": "OFF DUTY", "open": [what the panel says, one picked], "greet": [..], "idle": [..], "hurt": [..],
##    "options": [{"label": "..", "result": ".." or "results": [one picked], "effects": [..]}],
##    "riddles": [{"q": "..", "answers": ["..", ".."], "right": 0, "yes": "..", "no": ".."}], "prize": credits (once),
##    "drill_label": "..", "reach": 9, "drill_time": 8, "color": [r, g, b], "prompt": ".."}
## The level may give one its own ("talk" on the thing), and "after": [{"when": flag, ...}] blocks lay changes over it
## once their flag is set. Anything with attacks gets a last option that sends it to show what it does (drill_ask).
class_name ActorConversation

var a: Actor
var d: Dictionary


func setup(actor: Actor) -> void:
	a = actor
	d = actor.d


## What this one has to say: its kind's "talk", or its own, with any "after" block whose flag is set laid over it.
func talk() -> Dictionary:
	var t: Dictionary = a.e.get("talk", d.get("talk", {}))
	for blk in t.get("after", []):
		if Game.has_flag(blk.get("when", "")):
			t = t.duplicate()
			for k in blk:
				if k != "when":
					t[k] = blk[k]
	return t


## Say one of its lines of that kind (or of `fallback`, or its barks): on its face, over its head, and out loud.
func say(kind: String, fallback: Array = []) -> void:
	var lines: Array = talk().get(kind, fallback if not fallback.is_empty() else d.get("barks", []))
	if lines.is_empty():
		return
	var line: String = lines[a.rng.randi() % lines.size()]
	a.set_screen(line)
	Fx.words(a.level, a.eye() + Vector3(0, 0.6, 0), line, LM.col(d.get("talk", {}).get("color", d.get("bark_color")), Color(0.6, 0.95, 0.8)), 2.6)
	LM.sound(d.get("sounds", {}).get("bark", ""), a.global_position, -6.0)


func prompt() -> String:
	if a.dead or a.drilling() or (a.dock != null and a.dock.open_amount() < 0.9):
		return ""
	return talk().get("prompt", "Talk to the %s" % d.get("name", "thing"))


func use() -> void:
	if a.prompt() == "":
		return
	var t: Dictionary = talk()                       # the level may give this one its own conversation
	var opens: Array = t.get("open", ["It looks at you. It does not seem to mind."])
	var spec := {"kicker": t.get("kicker", "OFF DUTY"), "title": d.get("name", ""), "text": opens[a.rng.randi() % opens.size()], "options": []}
	Game.interaction.forget_used(a)                 # a new conversation: every option is on offer again
	if t.has("riddles"):
		_riddle(t, spec)
	for o in t.get("options", []):
		spec["options"].append(o)
	if not d.get("attacks", []).is_empty() and not a.e.has("talk"):
		spec["options"].append({"label": t.get("drill_label", "Show me what you do on duty"), "call": "drill_ask", "close": true, "after": true})
	a.od.attend()
	Game.hud.open_panel(a, spec)


## One of its riddles, its answers in a shuffled order; the right one pays its prize, once.
func _riddle(t: Dictionary, spec: Dictionary) -> void:
	var r: Dictionary = t["riddles"][a.rng.randi() % t["riddles"].size()]
	spec["text"] = "%s\n\n%s" % [spec["text"], r.get("q", "")]
	var order: Array = range(r.get("answers", []).size())
	Dice.shuffle(a.rng, order)
	for i in order:
		var right: bool = i == int(r.get("right", 0))
		var o := {"label": r["answers"][i], "result": r.get("yes", "CORRECT.") if right else r.get("no", "INCORRECT."), "final": true}
		if right and t.has("prize") and not Game.interaction.has_mark(a, "prize"):
			o["effects"] = [{"type": "credits", "amount": int(t["prize"])}]
			o["call"] = "prize_given"
		spec["options"].append(o)
	spec["options"].append({"label": t.get("again", "Another riddle"), "call": "use_again", "close": true, "after": true})


func use_again() -> void:
	a.use.call_deferred(Game.player)


func prize_given() -> void:
	Game.interaction.set_mark(a, "prize")
