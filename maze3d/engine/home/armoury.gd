extends RefCounted
## HomeArmoury - the bunker's armoury rack as the loadout (SPEC.md 5.17): what the character takes when they leave, as
## many weapons as their hands hold and the gear they will wear, chosen from what the bunker has (the rack, the gear
## in store, and the game's own kit, the handgun); and the outfitter, where gear is bought. What they came home with is
## what they take unless they choose again here (Profile.load_of). Its words are the game's (defs/home.json: rack_*,
## gear_*, outfitter_*); what is for sale is the bunker's "outfitter" ([item, price], ...).
class_name HomeArmoury

var home: Home


func _init(h: Home) -> void:
	home = h


## The rack's panel: what they will take and wear, what else there is, and a line for each to change it.
func rack() -> void:
	var ld := Profile.load_of()
	var worn := Profile.worn()
	var hands := "%d of %d" % [ld["weapons"].size(), Carrying.slots(worn)] if Carrying.limited() else "%d" % ld["weapons"].size()
	var rest: Array = weapons().filter(func(w: String) -> bool: return not ld["weapons"].has(w))
	var text: String = home.word("rack_text") % [_names(ld["weapons"], "weapons"), hands, _names(worn, "items"), _names(rest, "weapons")]
	var opts: Array = []
	for w in weapons():
		opts.append({"label": home.word("rack_leave" if ld["weapons"].has(w) else "rack_take") % _name(w, "weapons"), "do": _toggle.bind(w)})
	for g in Profile.d.get("gear", []):
		opts.append({"label": home.word("gear_off" if worn.has(g) else "gear_wear") % _name(g, "items"), "do": _toggle_gear.bind(g)})
	opts.append({"label": home.word("outfitter_open"), "do": outfitter})
	home.say_panel("rack", text, opts)


## What can be taken: the game's own kit, then what is on the rack.
func weapons() -> Array:
	var out: Array = LM.game.get("player", {}).get("weapons", []).duplicate()
	for w in Profile.d["weapons"]:
		if not out.has(w):
			out.append(w)
	return out


## Gear for sale: [item id, price in credits].
func goods() -> Array:
	return home.cfg.get("outfitter", [])


## The outfitter's panel.
func outfitter() -> void:
	var opts: Array = []
	var list := goods()
	for i in list.size():
		var have: bool = Profile.d.get("gear", []).has(list[i][0])
		opts.append({"label": home.word("outfitter_item") % [_name(list[i][0], "items"), int(list[i][1]), home.word("outfitter_have") if have else ""], "do": buy.bind(i)})
	opts.append({"label": home.word("outfitter_back"), "do": rack})
	home.panel(home.word("outfitter_kicker"), home.word("outfitter_title"), home.word("outfitter_text") % int(Profile.d["credits"]), opts)


## Buy the i-th piece of gear, paid from the bunker's credits, into the store: false if it is had already or too dear.
func buy(i: int) -> bool:
	var id: String = goods()[i][0]
	var price := int(goods()[i][1])
	if Profile.d.get("gear", []).has(id):
		Game.say(home.word("outfitter_had") % _name(id, "items"), "info")
		return false
	if int(Profile.d["credits"]) < price:
		Game.say(home.word("buy_short") % [_name(id, "items"), price, int(Profile.d["credits"])], "warn")
		LM.sound("denied")
		return false
	Profile.d["credits"] = int(Profile.d["credits"]) - price
	if not Profile.d.has("gear"):
		Profile.d["gear"] = []
	Profile.d["gear"].append(id)
	Profile.save()
	Game.credits = int(Profile.d["credits"])
	Game.changed.emit()
	Game.say(home.word("outfitter_done") % _name(id, "items"), "good")
	if Game.hud and Game.hud.in_panel():
		outfitter()
	return true


func _toggle(w: String) -> void:
	if Profile.load_of()["weapons"].has(w):
		Profile.leave(w)
	elif not Profile.carry(w):
		Game.say(home.word("rack_full"), "warn")
		LM.sound("denied")
	rack()


func _toggle_gear(g: String) -> void:
	if Profile.worn().has(g):
		Profile.take_off(g)
	else:
		Profile.wear(g)
	rack()


func _name(id: String, kind: String) -> String:
	return str(LM.defs.get(kind, {}).get(id, {}).get("name", id))


func _names(ids: Array, kind: String) -> String:
	return ", ".join(ids.map(func(id: String) -> String: return _name(id, kind))) if not ids.is_empty() else home.word("list_none")
