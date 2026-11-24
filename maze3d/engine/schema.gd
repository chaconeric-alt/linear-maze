extends RefCounted
## Schema - the keys a def or a level thing may have, so a misspelt one is reported instead of silently ignored.
## The lists are SPEC.md's: weapons 3.2, actors 3.3 (and the behaviour sections after it), items 3.4, things 4 (and
## the sections on stations, lifts, pits, targets, signs and the repair bay). A key the engine starts reading goes in
## SPEC.md and here together; the self-test checks that every key here is written in SPEC.md.
## LM.boot checks the game's defs and level files; the self-test checks those and the level it is playing.
class_name Schema

const WEAPON := ["name", "model", "kit", "hold", "scale", "ammo", "per_shot", "pickup_ammo", "damage", "pellets", "spread",
	"rate", "auto", "range", "falloff", "projectile", "recoil", "kick", "sound", "color", "kind"]
const ACTOR := ["name", "model", "kit", "scale", "robot", "hp", "armor", "takes", "mass", "gib", "speed", "accel", "turn", "radius",
	"height", "center", "eye", "fly", "mount", "still", "sight", "hearing", "wake_sight", "behavior", "keep", "attacks",
	"flee_below", "flee_text", "barks", "bark_color", "drops", "explode", "sounds", "blood", "clips", "walk_rate",
	"footfall", "dormant_clip", "startle_time", "startle_text", "lounge", "climb", "aim", "screen", "gait", "bob", "swim",
	"own_materials", "model_yaw", "model_y", "jelly", "touch", "equalizer", "dance", "trail", "talk", "faction",
	"sides", "split", "fears_light", "makes", "cloak", "drain", "stolen_item", "seals_doors"]
const ITEM := ["name", "kind", "value", "amount", "ammo", "color", "weapon", "model", "kit", "scale", "glow", "sound",
	"effects", "flag", "text", "trophy", "bulk", "wear", "capacity", "slots"]
const INSTALLATION := ["name", "text", "levels", "entrances"]
const ENTRANCE := ["name", "level", "arrive"]
const STAT := ["name", "text", "gives"]                          # the character (SPEC.md 5.22)
const SKILL := ["name", "text", "max", "gives"]
const ORIGIN := ["name", "text", "stats", "mutations", "rerolls"]
const MUTATION := ["name", "text", "stats", "gives"]
const GIVES := ["hp", "move", "pack", "slots", "hack", "heal", "sense", "armor", "lamp"]     # what the engine reads (CharacterSheet)
const PROGRAMME := ["spine", "rooms", "wings", "locks", "lock_door", "furnish", "bank", "bank_at", "below"]   # a level's written programme (SPEC.md 6.3)
const PROG_LIFTS := ["count", "travel", "start", "lock"]
const PURPOSE := ["name", "wall", "floor", "centre", "corner", "fill", "rows", "floor_fill", "crammed"]   # defs "purposes" (furnishing a room for its use)
const DANGER := ["name", "kicker", "sign", "title", "notice", "open", "opened", "leave", "need", "note", "enter", "clear",
	"color", "light", "seal", "monsters", "per_room", "keeper", "traps", "traps_per_room", "trap_ignore", "maker", "extra", "loot",
	"treasure", "prizes"]                                          # defs "danger": a danger zone's set (SPEC.md 4.13)
const PIECE := ["piece", "seat", "around", "chairs", "foot", "turn", "count", "side_by_side", "per_cell"]   # a purpose's piece written out
const PROG_SPINE := ["gap"]
const PROG_ROOM := ["id", "name", "style", "size", "things", "next_to", "door_to", "height", "purpose", "chance", "down", "lifts", "door_above"]
const PROG_WING := ["id", "name", "style", "corridor", "after", "side", "door", "rooms", "danger"]
const PROG_LOCK := ["room", "wing", "color", "card", "door", "flag", "need"]
# Every thing takes these; then the keys of its kind. A thing's kind is the first of these keys it has (as Spawner
# decides what to make), except that a "trap": "pit" is a pit.
const THING := ["at", "tag", "offset", "face", "level", "restock"]
const THING_KINDS := {
	"start": ["start"],
	"lift": ["lift", "home", "speed", "color", "travel", "lock"],
	"target": ["target"],
	"station": ["station", "actor", "shut", "wake", "blocks"],
	"maker": ["maker", "every", "zone", "when", "off", "max", "model", "say"],
	"actor": ["actor", "still", "alert", "hp_mul", "on_death", "on_anger", "lounge", "perch", "off_duty", "talk", "provoke",
		"roam", "greet", "faction", "patrol"],
	"prop": ["prop", "use", "hp", "loot", "explode", "screen", "solid", "blocks", "lit", "turn", "seat", "seat_gap",
		"seat_turn", "around", "chairs", "foot", "holds", "hidden", "rattle", "walk", "crammed"],
	"item": ["item", "y", "rest"],                     # and any item def key, to override it for this one
	"rebuild": ["rebuild", "as"],
	"trap": ["trap", "off", "phase", "ignore", "cycle", "heights", "damage", "axis", "period", "on", "color", "hear", "quiet",
		"trip", "effects", "delay", "volleys", "interval", "cooldown", "height", "radius", "blast", "cloud", "time"],
	"sign": ["sign", "size", "color", "y", "out", "width", "plain"],
	"light": ["light", "y", "flicker", "shadows"],
}
const PIT := ["trap", "delay", "damage"]
const COLLAPSE := ["trap", "warn", "damage"]


## Problems with the defs the game loaded: "<kind> '<id>': unknown key '<k>' (did you mean '<j>'?)".
static func check_defs(defs: Dictionary) -> Array:
	var out: Array = []
	for pair in [["weapons", WEAPON], ["actors", ACTOR], ["items", ITEM], ["installations", INSTALLATION],
			["stats", STAT], ["skills", SKILL], ["origins", ORIGIN], ["mutations", MUTATION], ["purposes", PURPOSE], ["danger", DANGER]]:
		for id in defs.get(pair[0], {}):
			for k in defs[pair[0]][id]:
				if k != "id" and not k in pair[1]:                # LM adds "id" itself
					out.append("%s '%s': %s" % [pair[0].trim_suffix("s"), id, _unknown(k, pair[1])])
	for id in defs.get("installations", {}):
		for e in defs["installations"][id].get("entrances", []):
			for k in e:
				if not k in ENTRANCE:
					out.append("installation '%s', an entrance: %s" % [id, _unknown(k, ENTRANCE)])
	for id in defs.get("purposes", {}):
		for list_key in ["wall", "floor", "centre"]:
			for pc in defs["purposes"][id].get(list_key, []):
				for k in (pc if pc is Dictionary else []):    # a piece written out as a dictionary
					if not k in PIECE:
						out.append("purpose '%s', a piece in %s: %s" % [id, list_key, _unknown(k, PIECE)])
	for kind in ["stats", "skills", "mutations"]:
		for id in defs.get(kind, {}):
			for k in defs[kind][id].get("gives", {}):
				if not k in GIVES:
					out.append("%s '%s', what it gives: %s" % [kind.trim_suffix("s"), id, _unknown(k, GIVES)])
	return out


## Problems with one level's things (and its objectLegend entries).
static func check_level(lv: Dictionary) -> Array:
	var out: Array = []
	var entries: Array = lv.get("things", []).duplicate()
	var out_p := Schema._check_programme(lv, entries)
	var legend: Dictionary = lv.get("objectLegend", {})
	for ch in legend:
		entries.append(legend[ch])
	for e in entries:
		if not e is Dictionary:
			continue
		var kind := thing_kind(e)
		var valid: Array = THING + (PIT if kind == "pit" else (COLLAPSE if kind == "collapse" else THING_KINDS.get(kind, [])))
		if kind == "item":
			valid = valid + ITEM
		for k in e:
			if not k in valid:
				out.append("level '%s', %s at %s: %s" % [lv.get("id", "?"), kind, e.get("at", e.get("tag", "?")), _unknown(k, valid)])
	return out + out_p


## A level's programme: its own keys, its spine's, each room's, wing's and lock's; each room's things are added to
## `entries`, to be checked as things ("count" with them).
static func _check_programme(lv: Dictionary, entries: Array) -> Array:
	var out: Array = []
	var p: Dictionary = lv.get("programme", {})
	if p.has("below"):                                 # the floor below is a programme too
		out += Schema._check_programme({"id": "%s (below)" % lv.get("id", "?"), "programme": p["below"]}, entries)
	var at := "level '%s', programme" % lv.get("id", "?")
	var pairs: Array = [[p, PROGRAMME, ""], [p.get("spine", {}), PROG_SPINE, " spine"]]
	var rooms: Array = p.get("rooms", []).duplicate()
	for w in p.get("wings", []):
		pairs.append([w, PROG_WING, " wing '%s'" % w.get("id", "?")])
		rooms += w.get("rooms", [])
	for r in rooms:
		pairs.append([r, PROG_ROOM, " room '%s'" % r.get("id", "?")])
		if r.has("lifts"):
			pairs.append([r["lifts"], PROG_LIFTS, " room '%s' lifts" % r.get("id", "?")])
		for t in r.get("things", []):
			var e: Dictionary = t.duplicate()
			e.erase("count")
			entries.append(e)
	for lk in p.get("locks", []):
		pairs.append([lk, PROG_LOCK, " lock"])
	for pr in pairs:
		for k in pr[0]:
			if not k in pr[1]:
				out.append("%s%s: %s" % [at, pr[2], _unknown(k, pr[1])])
	return out


static func thing_kind(e: Dictionary) -> String:
	if e.get("trap", "") == "pit":
		return "pit"
	if e.get("trap", "") == "collapse":
		return "collapse"
	for kind in THING_KINDS:
		if e.has(kind):
			return kind
	return "?"


## Every key the schema knows that SPEC.md does not mention in code type (`key`): they must be kept in step.
static func undocumented(spec_text: String) -> Array:
	var re := RegEx.create_from_string("[A-Za-z_][A-Za-z0-9_]*")
	var said := {}
	var span := RegEx.create_from_string("`[^`\\n]+`")
	for m in span.search_all(spec_text.replace("```", "\n")):
		for w in re.search_all(m.get_string()):
			said[w.get_string()] = true
	var fence := RegEx.create_from_string("```[a-z]*\\n([\\s\\S]*?)```")
	for m in fence.search_all(spec_text):
		for w in re.search_all(m.get_string(1)):
			said[w.get_string()] = true
	var all: Array = WEAPON + ACTOR + ITEM + INSTALLATION + ENTRANCE + THING + PIT + COLLAPSE + STAT + SKILL + ORIGIN + MUTATION + GIVES \
		+ PROGRAMME + PROG_SPINE + PROG_ROOM + PROG_WING + PROG_LOCK + PURPOSE + PIECE + PROG_LIFTS + DANGER
	for kind in THING_KINDS:
		all += THING_KINDS[kind]
	var out: Array = []
	for k in all:
		if not said.has(k) and not k in out:
			out.append(k)
	return out


static func _unknown(k: String, valid: Array) -> String:
	var best := ""
	var bd := 3
	for v in valid:
		var dist := _distance(k, v)
		if dist < bd:
			bd = dist
			best = v
	return "unknown key '%s'%s" % [k, (" (did you mean '%s'?)" % best) if best != "" else ""]


## Edit distance (Levenshtein), for "did you mean".
static func _distance(a: String, b: String) -> int:
	var prev: Array = range(b.length() + 1)
	for i in a.length():
		var cur: Array = [i + 1]
		for j in b.length():
			cur.append(mini(mini(prev[j + 1] + 1, cur[j] + 1), prev[j] + (0 if a[i] == b[j] else 1)))
		prev = cur
	return prev[b.length()]
