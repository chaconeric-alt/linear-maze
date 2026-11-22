extends RefCounted
## Restock - what a level's makers put back while the player was away (SPEC.md 5.18). A maker is any thing in the
## level's data with "restock":
##   {"restock": {"every": 3, "max": 4, "makes": ["fouler"], "off": "tanks_off", "faster": {"while": "drillmaster", "times": 2}}}
## It makes again what was destroyed, never more than the level was made with: monsters and robots of the kinds it
## "makes" that stood on its own storey ("level"), as monsters do not use lifts. A robot's station makes its own robot,
## and a repair bay ({"rebuild": ...}) the kinds it rebuilds. What it makes is there again where the level's data put
## it, as on a first visit: a station's robot back in its station, shut and switched off.
##
## Time is the world's day (State.day), which moves on as a character comes home alive. A level's memory notes the day
## it was left ("left"); on the next visit each maker catches up for the days in between: one thing every "every" days
## (a number, or [low, high]: each wait is one of those days, the same each time for the same maker and count), at
## most "max" in all (no limit if not given). Time a maker has nothing to make for is not saved up. "faster": while a
## monster of that kind made by the level's data is alive (the boss who keeps the place running), the days count
## "times" over. A maker does nothing when it is gone itself (broken, or killed), when its "off" flag is set (a repair
## bay's own "off" too), or when the level is safe (make_safe). What it has made so far is kept in the memory, under
## "makers" (key -> {"owed": days saved up, "n": made}).
class_name Restock

const NO_LIMIT := 1000000


## Catch the level's makers up for `days`, in its memory `mem` (before its things are made): what they make again is no
## longer gone. `plan` is the level's Spawner.plan(); `world_flags` the world's ("world:" flags). The keys made again.
static func catch_up(mem: Dictionary, plan: Array, days: int, world_flags: Dictionary) -> Array:
	var back: Array = []
	if days <= 0 or mem.get("safe", false):
		return back
	var gone := {}
	for k in mem.get("gone", []):
		gone[k] = true
	if not mem.has("makers"):
		mem["makers"] = {}
	for st in plan:
		var e: Dictionary = st.get("e", {})
		if not e.has("restock") or gone.has(st["key"]) or Restock.off(e, mem, world_flags):
			continue
		var r: Dictionary = e["restock"]
		if not mem["makers"].has(st["key"]):
			mem["makers"][st["key"]] = {"owed": 0.0, "n": 0}
		var s: Dictionary = mem["makers"][st["key"]]
		var times: float = float(r["faster"].get("times", 2.0)) if r.has("faster") and Restock._alive(plan, str(r["faster"].get("while", "")), gone) else 1.0
		s["owed"] = float(s["owed"]) + days * times
		while int(s["n"]) < int(r.get("max", NO_LIMIT)):
			var k := Restock._next(plan, st, gone)
			if k == "":
				s["owed"] = 0.0                       # nothing to make: the time is not saved up
				break
			var wait := Restock.wait(r, st["key"], int(s["n"]))
			if float(s["owed"]) < wait:
				break
			s["owed"] = float(s["owed"]) - wait
			s["n"] = int(s["n"]) + 1
			gone.erase(k)
			back.append(k)
			if k.ends_with("/robot"):                    # its station shuts over it again
				var things: Dictionary = mem.get("things", {})
				if things.has(k.trim_suffix("/robot")):
					things[k.trim_suffix("/robot")].erase("released")
	mem["gone"] = (mem.get("gone", []) as Array).filter(func(k: String) -> bool: return gone.has(k))
	return back


## How many days the maker waits before it makes its n-th thing (from 0).
static func wait(r: Dictionary, key: String, n: int) -> float:
	var every: Variant = r.get("every", 1)
	if every is Array:
		var lo := int(every[0])
		var hi := int(every[1])
		return float(lo + absi(("%s#%d" % [key, n]).hash()) % maxi(1, hi - lo + 1))
	return maxf(float(every), 0.01)


## The key of the next thing the maker at `st` would make: the first of its kinds, on its storey, that is gone.
static func _next(plan: Array, st: Dictionary, gone: Dictionary) -> String:
	var e: Dictionary = st["e"]
	if e.has("station"):
		return st["key"] + "/robot" if gone.has(st["key"] + "/robot") else ""
	var kinds: Array = e["restock"].get("makes", e.get("rebuild", {}).get("actors", []))
	var storey := int(e.get("level", 0))
	for o in plan:
		var oe: Dictionary = o.get("e", {})
		if oe.has("actor") and kinds.has(oe["actor"]) and int(oe.get("level", 0)) == storey:
			var k: String = o["key"] + "/robot" if oe.has("station") else o["key"]
			if gone.has(k):
				return k
	return ""


## A monster of that kind made by the level's data is still alive (not gone).
static func _alive(plan: Array, kind: String, gone: Dictionary) -> bool:
	for o in plan:
		var oe: Dictionary = o.get("e", {})
		if oe.get("actor", "") == kind and kind != "":
			if not gone.has(o["key"] + "/robot" if oe.has("station") else o["key"]):
				return true
	return false


## The maker `e` (its entry in the level's data) is switched off: its "off" flag (or its repair bay's) is set, a level
## flag or a world one ("world:..."); or the level is safe.
static func off(e: Dictionary, mem: Dictionary, world_flags: Dictionary) -> bool:
	if mem.get("safe", false):
		return true
	var f := str(e["restock"].get("off", e.get("rebuild", {}).get("off", "")))
	if f == "":
		return false
	return world_flags.has(f) if f.begins_with("world:") else mem.get("flags", {}).has(f)
