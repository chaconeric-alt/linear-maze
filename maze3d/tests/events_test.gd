extends SelfTestPart
## The event bus heard the run. The self-test records every event from before the level is loaded
## (Debug.record_events); this part runs last and holds the record up against the level as it is now: the level was
## entered; every dead monster was reported dead once; everything reported taken is gone; every flag that is set was
## reported; every payload was plain data; a trigger that listens for an event went off when it came. It prints what
## was emitted, by name, and a digest of it all, which the repeatable mode makes exact.


func run() -> void:
	var all: Array = Events.recorded()
	var since := 0                                   # this level's events: from its own level.entered on (and the
	for i in all.size():                             # run.started just before it, if a run began here)
		if all[i][0] == "level.entered":
			since = i
	var entry: Dictionary = all[since][1] if since < all.size() and all[since][0] == "level.entered" else {}
	if since > 0 and all[since - 1][0] == "run.started":
		since -= 1
	var log: Array = all.slice(since)
	say(entry.get("level", "") != "", "the level's entry was announced (%s)" % entry)
	say(Events.bad_payloads == 0, "every event carried plain data (%d did not)" % Events.bad_payloads)
	_deaths(log)
	_taken(log)
	var flags := {}
	for ev in log:
		if ev[0] == "flag.set":
			flags[ev[1]["name"]] = true
	var set_now: Array = Game.flags.keys() + State.flags_for("world:").keys()
	var unsaid: Array = set_now.filter(func(f: String) -> bool: return not flags.has(f))
	say(unsaid.is_empty(), "every flag set was announced (%d flags%s)" % [set_now.size(), "" if unsaid.is_empty() else "; not: %s" % ", ".join(unsaid)])
	_listening_triggers(log)
	var counts := {}
	for ev in log:
		counts[ev[0]] = int(counts.get(ev[0], 0)) + 1
	var names: Array = counts.keys()
	names.sort()
	print("INFO  events: %s; digest %08x" % [", ".join(names.map(func(n: String) -> String: return "%s %d" % [n, counts[n]])), JSON.stringify(log).hash() & 0xffffffff])


## Every monster lying dead was reported dead, once, under its own key.
func _deaths(log: Array) -> void:
	var told := {}
	var twice := 0
	for ev in log:
		if ev[0] == "actor.died":
			twice += 1 if told.has(ev[1]["key"]) else 0
			told[ev[1]["key"]] = true
	var dead := 0
	var untold: Array = []
	for a in level.actors:
		if is_instance_valid(a) and a.dead:
			dead += 1
			if not told.has(level.key_of(a)):
				untold.append(level.key_of(a))
	say(untold.is_empty() and twice == 0, "every death was announced, once (%d dead%s)" % [dead, "" if untold.is_empty() and twice == 0 else "; not: %s; twice: %d" % [", ".join(untold.slice(0, 5)), twice]])


## Everything reported taken is gone from the level, and nothing was taken twice.
func _taken(log: Array) -> void:
	var seen := {}
	var wrong: Array = []
	for ev in log:
		if ev[0] != "item.taken":
			continue
		var k: String = ev[1]["key"]
		if seen.has(k) or k == "" or level.thing(k) != null:
			wrong.append(k)
		seen[k] = true
	say(wrong.is_empty(), "everything announced as taken is gone (%d taken%s)" % [seen.size(), "" if wrong.is_empty() else "; not: %s" % ", ".join(wrong.slice(0, 5))])


## A trigger that listens for an event and sets a flag: if that event came, the flag is set.
func _listening_triggers(log: Array) -> void:
	for t in level.data.get("triggers", []):
		var on: Dictionary = t.get("on", {})
		if on.get("type", "") != "event":
			continue
		var flag := ""
		for ef in t.get("do", []):
			if ef.get("type", "") == "flag":
				flag = ef.get("name", "")
		var came := false
		for ev in log:
			if ev[0] == on.get("name", ""):
				var fits := true
				for k in on:
					if k != "type" and k != "name" and ev[1].get(k) != on[k]:
						fits = false
				came = came or fits
		if flag != "" and came:
			say(Game.has_flag(flag), "a trigger listening for %s %s went off (flag %s)" % [on.get("name"), JSON.stringify(on), flag])
