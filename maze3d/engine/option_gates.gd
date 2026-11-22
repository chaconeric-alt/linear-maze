extends RefCounted
## OptionGates - keys on a panel option that have to be got past before its effects run (SPEC.md, "Terminals"):
##   "cost": credits      not enough: it says so and nothing happens; enough: paid once the option goes ahead
##   "hack": true         a job that may fail: Game.hack_chance(o["hard"]). Failing runs "fail" and says "fail_result";
##                        it can be tried again, at the same price
##   "risk": 0..1         it goes wrong that often, after it has been paid for: "fail" effects, "fail_result" words,
##                        and it can be tried again
##   "carrying": item id  (or a list: any one will do) it needs that with you: worn, in hand or in the pack (a cutting
##                        torch, a technician's kit). Without it, it says so ("missing", or "You need ...") and nothing
##                        happens. It is not used up. Asked first, before anything is paid or tried
## Each is registered with the EffectRegistry as a gate (register_gate). `s` is the panel session (Game.interaction):
## in_panel(), panel_text(), show_panel(text, working), close_panel(), panel_ctx(), unmark_used().
class_name OptionGates


func register(reg: EffectRegistry) -> void:
	reg.register_gate("carrying", carrying)
	reg.register_gate("cost", cost_check, cost_pay)
	reg.register_gate("hack", hack)
	reg.register_gate("risk", Callable(), risk)


func carrying(o: Dictionary, s: Object) -> bool:
	var need: Array = OptionGates.needs(o)
	for id in need:
		if Carrying.carries(Game.player, str(id)):
			return true
	LM.sound("denied")
	s.show_panel("%s\n\n%s" % [s.panel_text(), o.get("missing", "You need %s." % Carrying.names(need))])
	return false


## The items an option's `carrying` gate asks for, as a list.
static func needs(o: Dictionary) -> Array:
	return o["carrying"] if o.get("carrying") is Array else [o.get("carrying", "")]


func cost_check(o: Dictionary, s: Object) -> bool:
	var cost: int = int(o.get("cost", 0))
	if cost > Game.credits:
		LM.sound("denied")
		s.show_panel("%s\n\nThat is %d cr. You have %d." % [s.panel_text(), cost, Game.credits])
		return false
	return true


func cost_pay(o: Dictionary, _s: Object) -> bool:
	var cost: int = int(o.get("cost", 0))
	if cost > 0:
		Game.add_credits(-cost)
	return true


## The chance is Game.hack_chance(o["hard"]): 10% + 5% a level, less what the job takes off. Debug.sure_rolls (the
## self-test) makes every hack come off, and Debug.quick_hacks makes the wait a moment.
func hack(o: Dictionary, s: Object) -> bool:
	s.show_panel(s.panel_text(), o.get("working", "Bypassing…"))
	LM.sound("hack")
	await Game.get_tree().create_timer(0.02 if Debug.quick_hacks else 1.2, true).timeout
	if not s.in_panel():
		return false
	if Debug.sure_rolls or randf() < Game.hack_chance(float(o.get("hard", 0.0))):
		return true
	LM.sound("denied")
	Game.run_effects(o.get("fail"), s.panel_ctx())
	if o.has("fail") and o.get("fail_close", true):
		s.close_panel()
		Game.say(o.get("fail_result", "The hack failed."), "warn")
	else:
		s.show_panel("%s\n\n%s" % [s.panel_text(), o.get("fail_result", "The hack failed. It can be tried again.")])
	return false


func risk(o: Dictionary, s: Object) -> bool:
	if not (randf() < float(o["risk"]) and not Debug.sure_rolls):
		return true
	LM.sound("denied")
	s.unmark_used()
	Game.run_effects(o.get("fail"), s.panel_ctx())
	if o.get("fail_close", true):
		s.close_panel()
		Game.say(o.get("fail_result", "It did not work."), "warn")
	else:
		s.show_panel(o.get("fail_result", "It did not work."))
	return false
