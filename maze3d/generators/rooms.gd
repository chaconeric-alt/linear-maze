extends RefCounted
## rooms - a small example generator: rooms on a grid joined by corridors, a locked way out,
## monsters, treasure, scanner arches, wall lockers and dressing, picked from lists in game.json
## (generator_params).
##
## A generator is any script in generators/ with generate(seed, params) -> level dictionary
## (the same shape as a level JSON file). List it in game.json "generators" and it appears on
## the title screen. Bigger generators plug in the same way; this one shows the interface.
##
## Doors: a door only ever goes on a THRESHOLD: a corridor cell with a room on one side, open
## floor on the other and solid wall to both flanks, so it always closes an opening wall to wall.
## They are placed after every corridor is carved, because a later corridor can widen an opening.

const DIRS := [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]
const NAMES := ["n", "e", "s", "w"]
const AGENCY := ["showroom", "white_hall", "focus"]


func generate(seed_value: int, p: Dictionary) -> Dictionary:
	for attempt in 30:
		var lv := _try(seed_value + attempt * 7919, p)
		if not lv.is_empty():
			lv["id"] = "gen-%d" % seed_value
			return lv
	push_warning("rooms generator: no solvable layout found; returning the last try without a lock")
	return _try(seed_value, p, false)


func _try(seed_value: int, p: Dictionary, lock := true) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var size: Array = p.get("size", [28, 24])
	var W: int = int(size[0])
	var H: int = int(size[1])
	var g: Array = []
	var room_of: Array = []
	for y in H:
		var row: Array = []
		row.resize(W)
		row.fill("#")
		g.append(row)
		var r2: Array = []
		r2.resize(W)
		r2.fill(-1)
		room_of.append(r2)
	var rooms: Array = []
	var rects: Array = []
	var tries := 0
	var styles: Array = p.get("styles", ["lab"])
	while rects.size() < int(p.get("rooms", 8)) and tries < 400:
		tries += 1
		var w := rng.randi_range(3, 7)
		var h := rng.randi_range(3, 6)
		var r := Rect2i(rng.randi_range(1, W - w - 1), rng.randi_range(1, H - h - 1), w, h)
		var ok := true
		for o in rects:
			if r.grow(2).intersects(o):
				ok = false
				break
		if not ok:
			continue
		rects.append(r)
		for y in range(r.position.y, r.end.y):
			for x in range(r.position.x, r.end.x):
				g[y][x] = "."
				room_of[y][x] = rects.size() - 1
		rooms.append({"name": "Room %d" % rects.size(), "rect": [r.position.x, r.position.y, w, h], "style": styles[rng.randi() % styles.size()],
			"height": 2 if (w >= 5 and h >= 5 and rng.randf() < 0.4) else 1, "quiet": true})
	if rects.size() < 3:
		return {}
	var last := rects.size() - 1
	# corridors: carve only; doors come afterwards
	for i in range(1, rects.size()):
		var a: Vector2i = rects[i - 1].get_center()
		var b: Vector2i = rects[i].get_center()
		var x := a.x
		var y := a.y
		while x != b.x:
			x += signi(b.x - x)
			if g[y][x] == "#":
				g[y][x] = "."
		while y != b.y:
			y += signi(b.y - y)
			if g[y][x] == "#":
				g[y][x] = "."
	# thresholds
	var doors: Array = p.get("doors", ["door_split"])
	var legend := {}
	var letters := "ABCDEFGHIJKLMNOPQRSTUVWXY"
	for i in doors.size():
		legend[letters[i]] = {"door": doors[i]}
	legend["Z"] = {"door": "door_vault", "lock": "red"}
	var door_cells: Array = []        # [cell, direction index pointing INTO the room it serves]
	for y in range(1, H - 1):
		for x in range(1, W - 1):
			if g[y][x] != "." or room_of[y][x] >= 0:
				continue
			var q := Vector2i(x, y)
			for d in 2:               # d = 0: passage runs north-south; 1: east-west
				var f: Vector2i = DIRS[d]
				var s: Vector2i = DIRS[d + 1]
				if g[y + f.y][x + f.x] == "#" or g[y - f.y][x - f.x] == "#" or g[y + s.y][x + s.x] != "#" or g[y - s.y][x - s.x] != "#":
					continue
				var ra: int = room_of[y + f.y][x + f.x]
				var rb: int = room_of[y - f.y][x - f.x]
				if ra < 0 and rb < 0:
					continue
				if _is_door(g, q + f) or _is_door(g, q - f):      # never two doors back to back
					continue
				var into := d if ra >= 0 else d + 2
				var guards_last := ra == last or rb == last
				if guards_last and lock:
					g[y][x] = "Z"
				elif rng.randf() < 0.85:
					g[y][x] = letters[rng.randi() % doors.size()]
				else:
					continue
				door_cells.append([q, into, guards_last])
	# the red card has to be findable without going through the vault door
	var start: Vector2i = rects[0].get_center()
	var seen := {start: true}
	var queue: Array = [start]
	while not queue.is_empty():
		var c: Vector2i = queue.pop_back()
		for d in DIRS:
			var n: Vector2i = c + d
			if seen.has(n) or g[n.y][n.x] == "#" or g[n.y][n.x] == "Z":
				continue
			seen[n] = true
			queue.append(n)
	var key_rooms: Array = []
	for i in range(1, last):
		if seen.has(rects[i].get_center()):
			key_rooms.append(i)
	if lock and (seen.has(rects[last].get_center()) or key_rooms.is_empty()):
		return {}          # a corridor leaks into the last room, or nowhere to put the card: try another layout
	var key_room: int = key_rooms[rng.randi() % key_rooms.size()] if not key_rooms.is_empty() else 1

	var things: Array = []
	var used := {start: true}
	var free := func(r: Rect2i) -> Vector2i:
		return Vector2i(rng.randi_range(r.position.x, r.end.x - 1), rng.randi_range(r.position.y, r.end.y - 1))
	things.append({"at": [start.x, start.y], "start": true, "face": "n"})
	# scanner arches: some stand just inside a doorway, the way you would fit one
	var arches: Array = p.get("arches", [])
	for dc in door_cells:
		var q: Vector2i = dc[0]
		var inside: Vector2i = q + DIRS[dc[1]]
		if arches.is_empty() or dc[2] or used.has(inside) or rng.randf() > 0.3:
			continue
		used[inside] = true
		for d in DIRS:                      # keep the cells round an arch clear, so nothing wide crowds the way through
			used[inside + d] = true
		things.append({"at": [inside.x, inside.y], "prop": _weighted(rng, arches), "face": "s" if dc[1] % 2 == 0 else "e", "blocks": false})
	var actors: Array = p.get("actors", [])
	var treasure: Array = p.get("treasure", [])
	var loot: Array = p.get("locker_loot", treasure)
	for i in range(1, rects.size()):
		var r: Rect2i = rects[i]
		var props: Array = p.get("style_props", {}).get(rooms[i]["style"], p.get("props", []))
		for k in 1 + r.get_area() / 9:
			var c: Vector2i = free.call(r)
			if used.has(c):
				continue
			used[c] = true
			things.append({"at": [c.x, c.y], "actor": _weighted(rng, actors), "face": NAMES[rng.randi() % 4]})
		for k in 1 + int(rng.randf() * 2.0):
			var c2: Vector2i = free.call(r)
			if not used.has(c2) and not treasure.is_empty():
				used[c2] = true
				things.append({"at": [c2.x, c2.y], "item": treasure[rng.randi() % treasure.size()]})
		# dressing goes in the corners so it never blocks the way through
		for corner in [r.position, Vector2i(r.end.x - 1, r.position.y), Vector2i(r.position.x, r.end.y - 1), r.end - Vector2i.ONE]:
			if rng.randf() < 0.55 and not used.has(corner) and not props.is_empty():
				used[corner] = true
				var pid: String = props[rng.randi() % props.size()]
				var e := {"at": [corner.x, corner.y], "prop": pid, "blocks": false, "turn": rng.randi() % 4 * 90}
				if pid == "barrel":
					e["hp"] = 12
					e["explode"] = {"radius": 5.5, "damage": 70}
				elif pid == "crate":
					e["hp"] = 20
					e["loot"] = [{"item": ["shells", "cells", "health"][rng.randi() % 3]}]
				elif pid in ["wk_drums"]:
					e["hp"] = 16
					e["explode"] = {"radius": 5.0, "damage": 60}
				elif pid == "bk_crates":
					e["hp"] = 24
					e["loot"] = [{"item": ["shells", "cells", "health"][rng.randi() % 3]}, {"item": ["shells", "cells"][rng.randi() % 2]}]
				elif pid == "cr_coffin":                  # most coffins hold grave goods; some hold whoever was buried
					e["use"] = {"type": "locker", "prompt": "Push the lid"}
					if rng.randf() < 0.6 or actors.is_empty():
						e["use"]["loot"] = [{"item": treasure[rng.randi() % treasure.size()]}] if not treasure.is_empty() else []
					else:
						e["use"]["actor"] = p.get("coffin_actor", "deadbot")
						e["use"]["text"] = "It sits up."
				elif pid in ["ag_pedestal", "cr_plinth"] and not treasure.is_empty():
					e["use"] = {"type": "cache", "prompt": "Lift the dome", "loot": [{"item": treasure[rng.randi() % treasure.size()]}]}
				things.append(e)
		# lockers on the walls: mostly useful, sometimes not
		for k in rng.randi_range(0, 2):
			var c4: Vector2i = free.call(r)
			var wall := -1
			for d in 4:
				var n2: Vector2i = c4 + DIRS[d]
				if g[n2.y][n2.x] == "#":
					wall = d
					break
			if wall < 0 or used.has(c4):
				continue
			used[c4] = true
			var roll := rng.randf()
			var lk := {"at": [c4.x, c4.y], "prop": "locker", "face": NAMES[(wall + 2) % 4], "use": {"type": "locker", "prompt": "Open the locker"}}
			if roll < 0.55:
				var items: Array = []
				for n3 in rng.randi_range(1, 2):
					items.append({"item": loot[rng.randi() % loot.size()]})
				lk["use"]["loot"] = items
			elif roll < 0.7:
				pass                                   # empty
			elif roll < 0.9:
				lk["prop"] = "locker_bad"              # dented, leaking, and it rattles: something lives in it
				lk["rattle"] = true
				lk["use"]["actor"] = "roach"
				lk["use"]["count"] = rng.randi_range(1, 3)
			else:
				lk["prop"] = "locker_bad"              # dented and quiet: wired
				lk["use"]["text"] = "Somebody wired it."
				lk["use"]["effects"] = [{"type": "explode", "radius": 4.0, "damage": 30}]
			things.append(lk)
		if i == key_room:
			var c3: Vector2i = r.get_center()
			things.append({"at": [c3.x, c3.y], "item": "keycard", "color": "red"})
		if i == 1:
			things.append({"at": [r.get_center().x, r.get_center().y], "item": "scattergun", "offset": [-1.0, 0, 0]})
		if i == max(2, last / 2):
			things.append({"at": [r.get_center().x, r.get_center().y], "item": "plasma", "offset": [1.0, 0, 0]})
	var ex: Vector2i = rects[last].get_center()
	if p.has("boss"):                                 # whoever runs the place waits in the last room
		things.append({"at": [ex.x, ex.y], "actor": p["boss"], "offset": [1.2, 0, 1.2], "face": "s"})
	things.append({"at": [ex.x, ex.y], "prop": p.get("exit_prop", "holo_table"), "blocks": false, "use": {"type": "effects", "prompt": "Signal the surface",
		"effects": [{"type": "end", "title": "Out, and richer", "text": "Installation %d is somebody else's problem now." % (seed_value % 1000)}]}})
	var map: Array = []
	for row in g:
		map.append("".join(PackedStringArray(row)))
	return {"seed": seed_value, "name": "%s %d" % [p.get("place", "Installation"), seed_value % 1000], "kit": p.get("kit", "hightech"),
		"style": p.get("corridor", "corridor"), "ambient_energy": 0.6, "legend": legend, "map": map, "rooms": rooms, "things": things,
		"intro": "%s %d. Find the red card, reach the last room." % [p.get("place", "Installation"), seed_value % 1000],
		"objectives": [{"text": "Find the RED card.", "done": "key_red"}, {"text": "Get through the vault door and signal the surface."}]}


func _is_door(g: Array, q: Vector2i) -> bool:
	var ch: String = g[q.y][q.x]
	return ch != "#" and ch != "."


func _weighted(rng: RandomNumberGenerator, list: Array) -> String:
	var total := 0.0
	for e in list:
		total += e[1]
	var r := rng.randf() * total
	for e in list:
		r -= e[1]
		if r <= 0.0:
			return e[0]
	return list[0][0]
