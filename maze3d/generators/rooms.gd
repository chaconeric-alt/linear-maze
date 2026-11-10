extends RefCounted
## rooms - a small example generator: rooms on a grid joined by corridors, a locked way out,
## monsters, treasure and dressing picked from lists in game.json (generator_params).
##
## A generator is any script in generators/ with generate(seed, params) -> level dictionary
## (the same shape as a level JSON file). List it in game.json "generators" and it appears on
## the title screen. Bigger generators (keys and locks in order, zones, set pieces) plug in the
## same way; this one is here to show the interface end to end.

func generate(seed_value: int, p: Dictionary) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var size: Array = p.get("size", [28, 24])
	var W: int = int(size[0])
	var H: int = int(size[1])
	var g: Array = []
	for y in H:
		var row: Array = []
		row.resize(W)
		row.fill("#")
		g.append(row)
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
		rooms.append({"name": "Room %d" % rects.size(), "rect": [r.position.x, r.position.y, w, h], "style": styles[rng.randi() % styles.size()],
			"height": 2 if (w >= 5 and h >= 5 and rng.randf() < 0.4) else 1, "quiet": true})
	# join each room to the next with an L-shaped corridor, with a door where it leaves the room
	var doors: Array = p.get("doors", ["door_split"])
	var legend := {}
	var letters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	for i in doors.size():
		legend[letters[i]] = {"door": doors[i]}
	legend["Z"] = {"door": "door_vault", "lock": "red"}
	var last := rects.size() - 1
	for i in range(1, rects.size()):
		var a: Vector2i = rects[i - 1].get_center()
		var b: Vector2i = rects[i].get_center()
		var pts: Array = []
		var x := a.x
		var y := a.y
		while x != b.x:
			x += signi(b.x - x)
			pts.append(Vector2i(x, y))
		while y != b.y:
			y += signi(b.y - y)
			pts.append(Vector2i(x, y))
		var prev_in := true
		for q in pts:
			var inside := false
			for r in rects:
				if r.has_point(q):
					inside = true
					break
			if g[q.y][q.x] == "#":
				g[q.y][q.x] = "."
				# a door on the first corridor cell after leaving a room, if walls close it either side
				if prev_in and _narrow(g, q, W, H):
					g[q.y][q.x] = "Z" if i == last else letters[rng.randi() % doors.size()]
			prev_in = inside
	var things: Array = []
	var free := func(r: Rect2i) -> Vector2i:
		return Vector2i(rng.randi_range(r.position.x, r.end.x - 1), rng.randi_range(r.position.y, r.end.y - 1))
	things.append({"at": [rects[0].get_center().x, rects[0].get_center().y], "start": true, "face": "n"})
	var actors: Array = p.get("actors", [])
	var treasure: Array = p.get("treasure", [])
	var props: Array = p.get("props", [])
	var used := {rects[0].get_center(): true}
	var key_room := rng.randi_range(1, max(1, last - 1))
	for i in range(1, rects.size()):
		var r: Rect2i = rects[i]
		var n := 1 + r.get_area() / 9
		for k in n:
			var c: Vector2i = free.call(r)
			if used.has(c):
				continue
			used[c] = true
			things.append({"at": [c.x, c.y], "actor": _weighted(rng, actors), "face": ["n", "e", "s", "w"][rng.randi() % 4]})
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
				var e := {"at": [corner.x, corner.y], "prop": pid, "blocks": false}
				if pid == "barrel":
					e["hp"] = 12
					e["explode"] = {"radius": 5.5, "damage": 70}
				elif pid == "crate":
					e["hp"] = 20
					e["loot"] = [{"item": ["shells", "cells", "health"][rng.randi() % 3]}]
				things.append(e)
		if i == key_room:
			var c3: Vector2i = r.get_center()
			things.append({"at": [c3.x, c3.y], "item": "keycard", "color": "red"})
		if i == 1:
			things.append({"at": [r.get_center().x, r.get_center().y], "item": "scattergun"})
		if i == max(2, last / 2):
			things.append({"at": [r.get_center().x, r.get_center().y], "item": "plasma", "offset": [1.0, 0, 0]})
	var ex: Vector2i = rects[last].get_center()
	things.append({"at": [ex.x, ex.y], "prop": "holo_table", "blocks": false, "use": {"type": "effects", "prompt": "Signal the surface",
		"effects": [{"type": "end", "title": "Out, and richer", "text": "Installation %d is somebody else's problem now." % (seed_value % 1000)}]}})
	var map: Array = []
	for row in g:
		map.append("".join(PackedStringArray(row)))
	return {"id": "gen-%d" % seed_value, "seed": seed_value, "name": "Installation %d" % (seed_value % 1000), "kit": p.get("kit", "hightech"),
		"style": "corridor", "ambient_energy": 0.6, "legend": legend, "map": map, "rooms": rooms, "things": things,
		"intro": "Installation %d. Find the red card, reach the last room." % (seed_value % 1000),
		"objectives": [{"text": "Find the RED card.", "done": "key_red"}, {"text": "Get through the vault door and signal the surface."}]}


func _narrow(g: Array, q: Vector2i, W: int, H: int) -> bool:
	var we: bool = q.x > 0 and q.x < W - 1 and g[q.y][q.x - 1] == "#" and g[q.y][q.x + 1] == "#"
	var ns: bool = q.y > 0 and q.y < H - 1 and g[q.y - 1][q.x] == "#" and g[q.y + 1][q.x] == "#"
	return we or ns


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
