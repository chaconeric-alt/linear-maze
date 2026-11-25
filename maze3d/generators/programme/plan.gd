extends RefCounted
## ProgrammePlan - a level's written programme (SPEC.md 6.3) read into a plan, with every choice the seed makes taken
## here, in a fixed order, from the one generator: each room's size within its range, which side of the spine each wing
## goes and which side of its branch corridor each room. What it gives the layout:
##   spine   the rooms threaded on the critical path, in order from the start to the end
##   wings   per wing: its rooms on the west and east sides of its branch corridor, nearest the spine first, and the
##           spine room it branches after, and its side ("n" or "s")
##   rooms   id -> the room as written, with "w" and "h" chosen
##   gaps    spine room id -> how many corridor cells at least follow it (the programme's "spine": {"gap": [least, most]})
## A room's "next_to" puts it on the same side as that room, straight after it (they share a wall); "door_to" does the
## same and puts a door in that wall. The seed also picks (Eric, 21 Nov: "the programmes say what each level must hold;
## the world's seed picks the rest"): which spine room a wing branches after, when "after" lists several; whether a
## wing room with a "chance" is there at all; and, later, in ProgrammeFill, which room holds a card and which monster or
## item a thing is, when they list several.
class_name ProgrammePlan

var rng := RandomNumberGenerator.new()          # the plan's own choices; later stages draw from streams of their own
var seed_value := 0
var spine: Array = []            # room ids
var wings: Array = []            # {"id", "name", "style", "after", "side", "west": [ids], "east": [ids]}
var rooms: Dictionary = {}       # id -> room dict (+ "w", "h", "wing")
var gaps: Dictionary = {}        # spine room id -> the corridor after it, at least
var left_out: Array = []         # wing rooms whose "chance" the seed did not give
var problems: Array = []         # what is wrong with the programme as written (nothing is laid out then)


func _init(prog: Dictionary, seed_v: int) -> void:
	seed_value = seed_v
	rng.seed = seed_v
	for r in prog.get("rooms", []):
		_room(r, "")
		spine.append(str(r.get("id", "")))
	if spine.size() < 2:
		problems.append("a programme needs at least two rooms on the spine (a start and an end)")
	var n := 0
	for w in prog.get("wings", []):
		_wing(w, n)
		n += 1
	for lk in prog.get("locks", []):                   # a locked wing has a door where it meets the spine
		for w in wings:
			if w["id"] == str(lk.get("wing", "")):
				w["door"] = true
	var gap: Array = prog.get("spine", {}).get("gap", [1, 2])
	for i in spine.size() - 1:
		gaps[spine[i]] = rng.randi_range(int(gap[0]), int(gap[1]))


## A stream of this plan's seed for a later stage (Dice.derive): what one stage draws never moves another's.
func stream(name: String) -> RandomNumberGenerator:
	return Dice.derive(seed_value, name)


func _room(r: Dictionary, wing: String) -> void:
	var id := str(r.get("id", ""))
	if id == "" or rooms.has(id):
		problems.append("every room needs an id of its own ('%s')" % id)
		return
	var d: Dictionary = r.duplicate(true)
	var sz: Array = r.get("size", [3, 3])
	d["w"] = _pick(sz[0])
	d["h"] = _pick(sz[1])
	d["wing"] = wing
	rooms[id] = d


## A size, or a [least, most] range picked from.
func _pick(v: Variant) -> int:
	if v is Array:
		return rng.randi_range(int(v[0]), int(v[1]))
	return int(v)


## A wing: its side ("any" picks, the wings taking turns where the seed leaves it even), then its rooms onto the two
## sides of its branch corridor: a room that is next to another goes straight after it on its side; any other goes on
## the side that is shorter so far (the seed breaks a tie).
func _wing(w: Dictionary, n: int) -> void:
	var id := str(w.get("id", "wing%d" % n))
	var after_v: Variant = w.get("after", spine[0] if not spine.is_empty() else "")
	if after_v is Array:                               # several places it could branch: the seed picks
		after_v = after_v[rng.randi() % after_v.size()] if not after_v.is_empty() else ""
	var after := str(after_v)
	if not spine.has(after) or after == spine.back():
		problems.append("wing '%s' must branch after a spine room that is not the last" % id)
		return
	var side := str(w.get("side", "any"))
	if side == "any":
		side = "n" if rng.randi() % 2 == 0 else "s"
	var wing := {"id": id, "name": w.get("name", id), "style": w.get("style", ""), "corridor": w.get("corridor", ""),
		"after": after, "side": side, "west": [], "east": [], "danger": str(w.get("danger", "")),
		"door": bool(w.get("door", false)) or str(w.get("danger", "")) != ""}       # a danger zone is behind a door
	for r in w.get("rooms", []):
		var rid := str(r.get("id", ""))
		if r.has("chance") and rng.randf() >= float(r["chance"]):
			left_out.append(rid)
			continue
		_room(r, id)
		if not rooms.has(rid):
			continue
		var anchor := str(r.get("next_to", r.get("door_to", "")))
		if anchor != "" and not left_out.has(anchor):     # (next to a room the seed left out: placed as any other)
			if not _after(wing, anchor, rid):
				problems.append("room '%s' is next to '%s', which is not in wing '%s'" % [rid, anchor, id])
			continue
		var west := length(wing["west"])
		var east := length(wing["east"])
		var to_west := west < east or (west == east and rng.randi() % 2 == 0)
		wing["west" if to_west else "east"].append(rid)
	wings.append(wing)


## Put a room straight after its anchor, on the anchor's side.
func _after(wing: Dictionary, anchor: String, rid: String) -> bool:
	for s in ["west", "east"]:
		var i: int = wing[s].find(anchor)
		if i >= 0:
			wing[s].insert(i + 1, rid)
			return true
	return false


## How far a side reaches from the spine so far: its rooms' heights and a wall between each.
func length(ids: Array) -> int:
	var n := 0
	for id in ids:
		n += int(rooms[id]["h"]) + 1
	return n


## The widest room on a side (the side's rooms line up against the branch corridor).
func width(ids: Array) -> int:
	var n := 0
	for id in ids:
		n = maxi(n, int(rooms[id]["w"]))
	return n


## The wings that branch after this spine room, on this side.
func wings_after(room: String, side: String) -> Array:
	return wings.filter(func(w: Dictionary) -> bool: return w["after"] == room and w["side"] == side)
