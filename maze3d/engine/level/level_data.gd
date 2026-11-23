extends RefCounted
## LevelData - a level dictionary read into cells, and the questions asked of them: what is at (x, y) on which storey,
## where is open, how high is the ceiling, which room is this. No nodes: the Level, its builder and its spawner all
## read the map through this. SPEC.md, "Levels" and "Level shape".
class_name LevelData

const DIRS := [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]     # n e s w
const DIR_NAMES := {"n": 0, "e": 1, "s": 2, "w": 3}
const DIR_ROT := [0.0, -PI / 2, PI, PI / 2]       # a wall on that side, facing in
const DEFAULT_LEGEND := {"#": {"solid": true}, " ": {"solid": true, "void": true}, ".": {}}     # the game adds its own (game.json "legend")
## Corner name -> (the two sides that corner closes, the yaw of a wall across it facing the open half)
const DIAG := {"ne": [[0, 1], -PI / 4], "nw": [[0, 3], PI / 4], "se": [[2, 1], -3 * PI / 4], "sw": [[2, 3], 3 * PI / 4]}
const VOID := {"solid": true, "void": true, "height": 0, "door": "", "style": "", "room": "", "tag": "", "fluid": false, "diag": "", "decks": [], "ramp": {}, "window": "", "edges": {}, "f": 0}
const UNDER := 0.8               # how thick the floor between two rooms is, one on top of the other

var data: Dictionary
var kit: Dictionary
var kit_id: String
var C := 4.0
var H := 4.0
var w := 0
var h := 0
var cells: Array = []            # per cell: { solid, door, style, height, tag, room }: the main floor (storey 0)
var floors: Dictionary = {}      # storey -> the cells of the floor whose ground is at that storey ("floors" in the level adds to the map)
var f_min := 0
var f_max := 0
var tags: Dictionary = {}        # tag -> Array of Vector2i
var rooms: Array = []
var start_cell := Vector2i.ZERO
var start_level := 0
var start_yaw := 0.0
var arrivals: Dictionary = {}    # name -> {"cell", "level", "yaw"}: the named ways in ({"start": "<name>"}), where travel arrives
var hung: Dictionary = {}        # Vector4i(x, y, storey, side): a wall face with a sign or a wall-mounted prop on it, or furniture against it
var rng := RandomNumberGenerator.new()      # one stream for everything the build picks, so a level always comes out the same


func _init(level_data: Dictionary) -> void:
	data = level_data
	kit_id = data.get("kit", str(LM.game.get("kits", [""])[0]))      # a level that names no kit uses the game's first
	kit = LM.kits[kit_id]
	C = kit.get("cell", 4.0)
	H = kit.get("height", 4.0)
	rng.seed = hash(data.get("id", "level")) + int(data.get("seed", 0))


# ------------------------------------------------------------------ reading the map
func parse() -> void:
	var rows: Array = data.get("map", [])
	h = rows.size()
	for r in rows:
		w = max(w, str(r).length())
	rooms = []
	_parse_floor(data, 0)
	for fd in data.get("floors", []):        # {"level": 1, "map": [...], "rooms": [...], ...}: another floor, above or below
		if int(fd.get("level", 1)) != 0:
			_parse_floor(fd, int(fd.get("level", 1)))
	cells = floors[0]
	for f in floors:
		f_min = mini(f_min, f)
		f_max = maxi(f_max, f)
	for e in data.get("things", []):         # lifts and pits change the shape of the place, so they are read before it is built
		if e.has("at"):
			_shaping_thing(e, int(e["at"][0]), int(e["at"][1]))


func _shaping_thing(e: Dictionary, x: int, y: int) -> void:
	if e.has("lift"):
		var stops: Array = (e["lift"] as Array).map(func(a): return int(a))
		stops.sort()
		var bc := cell(x, y, stops[0])
		if bc["solid"]:
			push_warning("Level %s: lift at %s has no floor at its lowest stop" % [data.get("id"), e["at"]])
			return
		bc["height"] = maxi(bc["height"], stops[-1] - stops[0] + 1)
		bc["lift"] = stops
		for f in range(stops[0] + 1, stops[-1] + 1):     # the shaft is the lowest floor's cell, grown tall: nothing else may be in it
			if floors.has(f):
				var blank: Dictionary = VOID.duplicate(true)
				blank["void"] = false
				blank["f"] = f
				floors[f][y * w + x] = blank
	elif e.get("trap", "") == "pit":
		var s := int(e.get("level", 0))
		if is_open(x, y, s) and open_s(x, y, s - 1):
			cell(x, y, s)["pit"] = true
		else:
			push_warning("Level %s: pit at %s has no floor to open or nothing below it" % [data.get("id"), e["at"]])


func _parse_floor(fd: Dictionary, f: int) -> void:
	var legend: Dictionary = DEFAULT_LEGEND.duplicate()
	for src in [LM.game.get("legend", {}), data.get("legend", {}), fd.get("legend", {})]:      # the game's, the level's, the floor's
		for k in src:
			legend[k] = src[k]
	var rows: Array = fd.get("map", [])
	var frooms: Array = fd.get("rooms", [])
	for rm in frooms:
		rm["floor"] = f
		rooms.append(rm)
	var def_style: String = fd.get("style", data.get("style", kit["styles"].keys()[0]))
	var def_h: int = int(fd.get("height", 1))
	var fc: Array = []
	fc.resize(w * h)
	floors[f] = fc
	for y in h:
		var row: String = rows[y] if y < rows.size() else ""
		for x in w:
			var ch := row[x] if x < row.length() else "#"
			fc[y * w + x] = _read_cell(legend.get(ch, {}), frooms, x, y, f, def_style, def_h)
	_listed_shape(fd, f)
	_settle_edges(f)
	if f == 0:
		for t in fd.get("tags", {}):        # tags can also be listed: "tags": { "ambush": [[4, 7], [5, 7]] }
			for p in fd["tags"][t]:
				_tag(t, Vector2i(int(p[0]), int(p[1])))
				if cell(int(p[0]), int(p[1]))["tag"] == "":
					fc[int(p[1]) * w + int(p[0])]["tag"] = t


## One map letter, read through the legend into a cell of floor f.
func _read_cell(e: Dictionary, frooms: Array, x: int, y: int, f: int, def_style: String, def_h: int) -> Dictionary:
	var c := {"solid": e.get("solid", false), "void": e.get("void", false), "door": e.get("door", ""), "entry": e, "f": f,
		"style": e.get("style", def_style), "height": def_h, "fluid": e.get("fluid", false),
		"diag": e.get("diag", ""), "decks": _decks_of(e.get("deck", 0)), "ramp": e.get("ramp", {}), "window": _win_of(e.get("window", "")), "edges": _edges_of(e.get("walls", {})), "tag": e.get("tag", ""), "room": ""}
	for rm in frooms:
		var rc: Array = rm["rect"]
		if x >= rc[0] and y >= rc[1] and x < rc[0] + rc[2] and y < rc[1] + rc[3]:
			c["room"] = rm.get("name", "")
			if not e.has("style"):
				c["style"] = rm.get("style", def_style)
			c["height"] = int(rm.get("height", def_h))
			break
	if c["door"] != "" or c["window"] != "":
		c["height"] = 1
	if not c["ramp"].is_empty():
		c["ramp"] = {"dir": c["ramp"].get("dir", "n"), "from": float(c["ramp"].get("from", 0)) + f * H, "to": float(c["ramp"].get("to", 2)) + f * H}
	if c["tag"] != "" and f == 0:
		_tag(c["tag"], Vector2i(x, y))
	if e.get("start", false):
		start_cell = Vector2i(x, y)
		start_level = f
		start_yaw = face_yaw(e.get("face", "n"))
	return c


## The shape can also be listed, which is easier for a generator than a legend.
func _listed_shape(fd: Dictionary, f: int) -> void:
	for e in fd.get("diags", []):            # {"at": [x, y], "corner": "ne"}: that corner of the cell is wall, cut across
		cell(int(e["at"][0]), int(e["at"][1]), f)["diag"] = e.get("corner", "ne")
	for e in fd.get("decks", []):            # {"rect": [x, y, w, h], "level": 1}: a floor that many storeys up, over whatever is below
		var rc: Array = e.get("rect", [e.get("at", [0, 0])[0], e.get("at", [0, 0])[1], 1, 1])
		for yy in range(rc[1], rc[1] + rc[3]):
			for xx in range(rc[0], rc[0] + rc[2]):
				var cc := cell(xx, yy, f)
				if not cc["solid"] and not cc["decks"].has(int(e.get("level", 1))):
					cc["decks"] = cc["decks"] + [int(e.get("level", 1))]
	for e in fd.get("ramps", []):            # {"at": [x, y], "dir": "n", "from": 0, "to": 2}: metres above this floor, rising toward dir
		cell(int(e["at"][0]), int(e["at"][1]), f)["ramp"] = {"dir": e.get("dir", "n"), "from": float(e.get("from", 0)) + f * H, "to": float(e.get("to", 2)) + f * H}
	for e in fd.get("windows", []):          # [x, y] or {"at": [x, y], "model": ...}: a wall cell that is a window instead
		var wa: Array = e["at"] if e is Dictionary else e
		var wc := cell(int(wa[0]), int(wa[1]), f)
		wc["solid"] = false
		wc["window"] = (e.get("model", "window_obs") if e is Dictionary else "window_obs")
		wc["height"] = 1
	for e in fd.get("walls", []):            # {"at": [x, y], "side": "e", "kind": "wall" | "window"}: a thin wall on that edge
		cell(int(e["at"][0]), int(e["at"][1]), f)["edges"][DIR_NAMES.get(e.get("side", "e"), 1)] = e.get("kind", "wall")


## A thin wall belongs to both cells it stands between; a balcony makes its room that tall.
func _settle_edges(f: int) -> void:
	for y in h:
		for x in w:
			var c2 := cell(x, y, f)
			for d in c2["edges"].keys():
				var nb := cell(x + DIRS[d].x, y + DIRS[d].y, f)
				if not nb.get("void", false) and nb.has("edges") and not nb["edges"].has((d + 2) % 4):
					nb["edges"][(d + 2) % 4] = c2["edges"][d]
			for lv in c2["decks"]:
				c2["height"] = max(c2["height"], lv + 1)


func _decks_of(v: Variant) -> Array:
	if v is Array:
		return v.map(func(a): return int(a))
	return [int(v)] if int(v) > 0 else []


func _win_of(v: Variant) -> String:
	if v is bool:
		return "window_obs" if v else ""
	return str(v)


func _edges_of(v: Variant) -> Dictionary:
	var out := {}
	if v is String:
		for ch in v:
			if DIR_NAMES.has(ch):
				out[DIR_NAMES[ch]] = "wall"
	elif v is Dictionary:
		for k in v:
			if DIR_NAMES.has(k):
				out[DIR_NAMES[k]] = v[k]
	return out


func _tag(t: String, p: Vector2i) -> void:
	if not tags.has(t):
		tags[t] = []
	tags[t].append(p)


# ------------------------------------------------------------------ questions about the map
## The cell at (x, y) of the floor whose ground is storey f. Storey 0 is the main map.
func cell(x: int, y: int, f := 0) -> Dictionary:
	if x < 0 or y < 0 or x >= w or y >= h or not floors.has(f):
		return VOID
	return floors[f][y * w + x]


func is_open(x: int, y: int, f := 0) -> bool:
	return not cell(x, y, f)["solid"]


## The cell whose air fills storey s at (x, y): a floor at that storey, or a taller room that started lower. {} if rock.
func cell_s(x: int, y: int, s: int) -> Dictionary:
	for f in range(s, f_min - 1, -1):
		if floors.has(f):
			var c: Dictionary = cell(x, y, f)
			if not c["solid"] and f + int(c["height"]) > s:
				return c
	return {}


## The height of the ceiling over (x, y) for something in storey s: lower where another room stands right on top.
func ceiling_y(x: int, y: int, s: int) -> float:
	var c := cell_s(x, y, s)
	if c.is_empty():
		return (s + 1) * H
	var t: int = int(c["f"]) + int(c["height"])
	var above := cell(x, y, t)
	return t * H - (UNDER if not above["solid"] and not above.get("pit", false) else 0.0)


## The same, for code that wants a cell whatever is there: rock comes back as a solid, empty cell.
func air(x: int, y: int, s: int) -> Dictionary:
	var c := cell_s(x, y, s)
	return c if not c.is_empty() else VOID


func open_s(x: int, y: int, s: int) -> bool:
	return not cell_s(x, y, s).is_empty()


## Which floor something at pos is in (the storey of that floor's ground).
func floor_of(pos: Vector3) -> int:
	var p := cell_of(pos)
	var s := floori((pos.y + 0.9) / H)                 # feet a little below a floor are still on it: a pool is sunk
	for t in [s, s - 1, s + 1, s - 2]:
		var c := cell_s(p.x, p.y, t)
		if not c.is_empty():
			return int(c["f"])
	return clampi(s, f_min, f_max)


func cell_at(pos: Vector3) -> Dictionary:
	var p := cell_of(pos)
	return cell(p.x, p.y, floor_of(pos))


func center(p: Vector2i, y := 0.0) -> Vector3:
	return Vector3(p.x * C + C / 2, y, p.y * C + C / 2)


func cell_of(pos: Vector3) -> Vector2i:
	return Vector2i(floori(pos.x / C), floori(pos.z / C))


func room_at(p: Vector2i) -> String:
	return cell(p.x, p.y)["room"]


func fluid_at(pos: Vector3) -> bool:
	var c := cell_at(pos)
	return c["fluid"] and pos.y < int(c["f"]) * H - 0.22


## The yaw that makes a model's front (+Z) look that way; for the player, the way they look.
func face_yaw(f: Variant) -> float:
	match str(f):
		"n": return PI
		"e": return PI / 2
		"w": return -PI / 2
	return 0.0


## One of a style's list ("wall": [["tile", weight], ...] or a single id), picked with the level's own stream.
func pick(list: Variant) -> String:
	if list is String:
		return list
	if list == null or list.is_empty():
		return ""
	var total := 0.0
	for e in list:
		total += (e[1] if e is Array else 1.0)
	var r := rng.randf() * total
	for e in list:
		r -= (e[1] if e is Array else 1.0)
		if r <= 0.0:
			return e[0] if e is Array else e
	var last: Variant = list[list.size() - 1]
	return last[0] if last is Array else last


## A room can adjust its style's lighting: "lights": { "ox": 1, "every": 3, "flicker": 1.0 }
func lights_for(st: Dictionary, room: String) -> Dictionary:
	var li: Dictionary = st.get("lights", {})
	for rm in rooms:
		if rm.get("name", "") == room and rm.has("lights"):
			li = li.duplicate()
			for k in rm["lights"]:
				li[k] = rm["lights"][k]
			break
	return li


# ------------------------------------------------------------------ walls things hang on or stand against
## Wall faces that have a sign or a wall-mounted prop on them, or a piece of furniture standing back against them, get
## the style's plain wall ("wall_plain" in the style, or else its commonest wall tile), so what hangs there is not lost
## among pipes and screens, and nothing stands in front of lockers or shelves that are part of the wall (Eric, 22 Nov:
## "if an object is meant to be against a wall, it should be against a bare wall"). A thing marked "crammed" (a room
## meant to be crammed full) stands in front of whatever the wall shows.
func find_hung() -> void:
	hung.clear()
	for e in data.get("things", []):
		if not (e is Dictionary) or not e.has("at") or e.get("crammed", false):
			continue
		var s := int(e.get("level", 0))
		var p := Vector2i(int(e["at"][0]), int(e["at"][1]))
		var meta: Dictionary = LM.model_meta(kit_id, e["prop"]) if e.has("prop") else {}
		if e.has("sign") or meta.get("mount", "") == "wall":
			hung[Vector4i(p.x, p.y, s, wall_side(p, e.get("face", ""), s))] = true
		elif e.has("prop"):
			for d in _backed(e, meta, p, s):
				hung[Vector4i(p.x, p.y, s, d)] = true


## The walls round its cell a piece of furniture stands back against: within AGAINST metres of the wall's face, by its
## size ("solid" in its model's meta: width, height, depth, the depth along the way it faces), where it faces and how
## far its "offset" moves it.
const AGAINST := 0.6

func _backed(e: Dictionary, meta: Dictionary, p: Vector2i, s: int) -> Array:
	var out: Array = []
	var sz: Array = meta.get("solid", [1.0, 1.0, 1.0])
	var off: Vector3 = LM.vec(e.get("offset"), Vector3.ZERO)
	var facing: int = DIR_NAMES.get(str(e.get("face", "s")), 2)
	for d in 4:
		var n: Vector2i = p + DIRS[d]
		if open_s(n.x, n.y, s):
			continue
		var half: float = float(sz[2] if d % 2 == facing % 2 else sz[0]) / 2.0
		if off.x * DIRS[d].x + off.z * DIRS[d].y + half >= C / 2.0 - AGAINST:
			out.append(d)
	return out


func plain_wall(st: Dictionary) -> String:
	if st.has("wall_plain"):
		return st["wall_plain"]
	var list: Variant = st.get("wall")
	if list is String:
		return list
	var best := ""
	var bw := -1.0
	for it in list:
		var wgt: float = it[1] if it is Array else 1.0
		if wgt > bw:
			bw = wgt
			best = it[0] if it is Array else it
	return best


## The side of cell p that something facing `want` hangs on: the wall behind it, or the first wall found.
func wall_side(p: Vector2i, want: String, s := 0) -> int:
	if DIR_NAMES.has(want):
		return (DIR_NAMES[want] + 2) % 4
	for d in [0, 3, 1, 2]:
		if not open_s(p.x + DIRS[d].x, p.y + DIRS[d].y, s):
			return d
	return 0


## Wall, or something that stands in a wall's place (a window, a door).
func wallish(x: int, y: int, f := 0) -> bool:
	var c := cell(x, y, f)
	return not open_s(x, y, f) or c["window"] != "" or c["door"] != ""
