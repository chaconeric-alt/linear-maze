extends RefCounted
## GenContext - everything one try of the rooms generator knows, handed from stage to stage (generators/rooms.gd runs
## the stages in order). Each group of fields is filled by the stage named over it; later stages read and add to them.
## It also holds the few cell questions and placing helpers that more than one stage asks.
class_name GenContext

const DIRS := [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]
const NAMES := ["n", "e", "s", "w"]
const CORNERS := [["nw", 0, 0, -1, -1], ["ne", 1, 0, 1, -1], ["sw", 0, 1, -1, 1], ["se", 1, 1, 1, 1]]     # name, which end in x, in y, outward x, y

# given: the params and what is read straight from them
var rng := RandomNumberGenerator.new()
var seed_value := 0
var p: Dictionary                 # generator_params with the theme merged over them
var sh: Dictionary                # params "shapes": the chance of each feature (0 switches it off)
var lock := true                  # false only for the last resort: a layout with no vault door
var stations: Dictionary = {}     # actor id -> the station model its kind waits in (params "stations")
var hibernate := 0.5
var W := 0
var H := 0
var styles: Array
var actors: Array
var treasure: Array
var loot: Array                   # what wall lockers hold
var kit_name: String
# units
var g: Array = []                 # the main floor: one row of one-letter strings per y
var room_of: Array = []           # the unit each cell belongs to, -1 outside every unit
var rects: Array = []             # one per unit: a box that corridors join
var shape: Array = []             # per unit: rect, oct, round, ell, cross, piers, suite
var last := 0                     # the last unit: the vault, behind the locked door
# areas
var areas: Array = []             # what gets a style, a height and furniture: {unit, rect, style, height, room}
var walls: Array = []             # the thin walls that divide suites
var rooms: Array = []             # the level's "rooms"
# thresholds
var doors: Array                  # door models; a letter each in the legend
var legend := {}
var letters := "ABCDEFGHIJKLMNOPQRSTUVWXY"
var door_cells: Array = []        # [cell, direction index pointing INTO the room it serves, guards the last room]
var start := Vector2i.ZERO
var seen := {}                    # cells the player can reach without going through the vault door
var key_room := 1
# corners and galleries
var diags: Array = []
var decks: Array = []
var ramps: Array = []
var windows: Array = []
var taken: Dictionary = {}        # cells that furniture must leave alone
var is_diag: Dictionary = {}
var upstairs: Array = []          # [cell, level, unit]: places on a balcony where something could stand
# contents
var things: Array = []
var zones: Array = []             # the level's "zones": a danger zone (generators/rooms/danger.gd)
var used := {}
var no_win := {}                  # walls with a container against them: no window there
var no_door_up := {}              # nor, upstairs, a door
var valuable := {}                # unit -> how much it is worth guarding
var bays := {}                    # units where robots are kept
# traps and pools
var trapped := {}
var busy := {}                    # cells holding something that should stay dry
var flooded := false
# other floors
var storeys: Array = []
var h0: Array = []                # how many storeys of air stand on each cell of the main floor
var is_win := {}
var deck1 := {}
var up: Array = []                # storey 1
var up_rooms: Array = []
var lift_at := {}
var nook_tall := false            # a lift's nook opens on a one-storey room; a station's can open on a tall one
var wall_cells: Array = []
var nooks2: Array = []
var under := {}                   # basement cells with something in them: no pit over those
var grid_of := {}                 # storey -> its map, for stowing things there
# the red card's ambush
var triggers: Array = []
var tags := {}


## From here on the stages draw from a stream of their own, named for them and the kit (Dice.derive): what one draws
## never moves what another makes, and two themes on the same seed do not draw alike.
func stage(name: String) -> void:
	rng = Dice.derive(seed_value, "%s|%s" % [p.get("kit", ""), name])


func _init(seed_v: int, params: Dictionary, locked: bool) -> void:
	seed_value = seed_v
	p = params
	lock = locked
	rng.seed = seed_v
	stations = p.get("stations", {})
	hibernate = float(p.get("hibernating", 0.5))
	sh = p.get("shapes", {})
	var size: Array = p.get("size", [36, 28])
	W = int(size[0])
	H = int(size[1])
	styles = p.get("styles", ["lab"])
	actors = p.get("actors", [])
	treasure = p.get("treasure", [])
	loot = p.get("locker_loot", treasure)
	kit_name = p.get("kit", "hightech")
	doors = p.get("doors", ["door_split"])
	for y in H:
		var row: Array = []
		row.resize(W)
		row.fill("#")
		g.append(row)
		var r2: Array = []
		r2.resize(W)
		r2.fill(-1)
		room_of.append(r2)


func shuffle(a: Array) -> void:
	for i in range(a.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var t: Variant = a[i]
		a[i] = a[j]
		a[j] = t


## One of [[id, weight], ...], picked by weight.
func weighted(list: Array) -> String:
	var total := 0.0
	for e in list:
		total += e[1]
	var r := rng.randf() * total
	for e in list:
		r -= e[1]
		if r <= 0.0:
			return e[0]
	return list[0][0]


## A cell of a room given along-the-wall (u) and out-from-the-wall (v) steps from one of its four walls.
static func local(r: Rect2i, side: int, u: int, v: int) -> Vector2i:
	match side:
		0: return Vector2i(r.position.x + u, r.position.y + v)
		2: return Vector2i(r.position.x + u, r.end.y - 1 - v)
		3: return Vector2i(r.position.x + v, r.position.y + u)
	return Vector2i(r.end.x - 1 - v, r.position.y + u)


static func is_door(grid: Array, q: Vector2i) -> bool:
	var ch: String = grid[q.y][q.x]
	return ch != "#" and ch != "." and ch != "~"


func inside(c: Vector2i) -> bool:
	return c.x >= 1 and c.y >= 1 and c.x < W - 1 and c.y < H - 1


## That cell, or the nearest one of the same room that is not a ramp or a cut corner.
func clear(c: Vector2i) -> Vector2i:
	if not taken.has(c):
		return c
	for rad in range(1, 5):
		for dy in range(-rad, rad + 1):
			for dx in range(-rad, rad + 1):
				var q := c + Vector2i(dx, dy)
				if q.x >= 1 and q.y >= 1 and q.x < W - 1 and q.y < H - 1 and g[q.y][q.x] == "." and room_of[q.y][q.x] == room_of[c.y][c.x] and not taken.has(q):
					return q
	return c


## A main-floor cell with nothing on it that would mind.
func plain(c: Vector2i) -> bool:
	return g[c.y][c.x] == "." and not used.has(c) and not taken.has(c) and not busy.has(c) and not trapped.has(c) and not lift_at.has(c)


## Where a lift (or a station) can stand: a nook of its own. A cell of rock with rock on three sides, opening on to the
## plain floor of a room the player can get to (one storey high for a lift, see nook_tall). It is let into the wall
## there, never out in the room. Returns the floor cell in front of it, or (-1, -1).
func nook_front(c: Vector2i) -> Vector2i:
	if g[c.y][c.x] != "#" or is_win.has(c) or lift_at.has(c) or up[c.y][c.x] != "#":
		return Vector2i(-1, -1)
	var front := Vector2i(-1, -1)
	for d in DIRS:
		var n: Vector2i = c + d
		if g[n.y][n.x] == "#" and not lift_at.has(n):
			continue
		if front.x >= 0 or not plain(n) or room_of[n.y][n.x] < 1 or (h0[n.y][n.x] != 1 and not nook_tall) or not seen.has(n):
			return Vector2i(-1, -1)                  # open on two sides, or on to a door, a pool, a hall, something in the way
		front = n
	if front.x < 0:
		return front
	for dx in [-1, 0, 1]:                         # and nothing else let into the rock right beside it
		for dy in [-1, 0, 1]:
			var q := Vector2i(c.x + dx, c.y + dy)
			if q != c and q != front and g[q.y][q.x] != "#" and (q - front).length_squared() > 1:
				return Vector2i(-1, -1)
	return front


func nook(c: Vector2i) -> bool:
	return nook_front(c).x >= 0


## Open the nook, and keep the floor in front of it clear.
func dig(c: Vector2i) -> void:
	used[nook_front(c)] = true
	g[c.y][c.x] = "."
	h0[c.y][c.x] = 1


## Treasure is kept in something: a trophy case, shelves, a strongbox, a charging rack (params "containers": kind ->
## model, "loot_kinds": item -> kind), standing against a wall with the things in it. Only where there is no wall to
## stand one against does a thing lie on the floor, as if dropped. Returns the kind of container, or "" for the floor.
func stow(c: Vector2i, grid: Array, lvl: int, item: String, kind_as: String) -> String:
	var kind: String = kind_as if kind_as != "" else str(p.get("loot_kinds", {}).get(item, "box"))
	var id: String = str(p.get("containers", {}).get(kind, ""))
	var wd := -1
	var d0 := rng.randi() % 4
	var by_door := false
	for k in 4:
		var d := (d0 + k) % 4
		var n: Vector2i = c + DIRS[d]
		if n.x < 0 or n.y < 0 or n.x >= W or n.y >= H:
			continue
		var ch: String = grid[n.y][n.x]
		if ch == "#" and wd < 0:
			wd = d
		elif ch != "#" and ch != "." and ch != "~":
			by_door = true
	if id == "" or wd < 0 or by_door:
		var e0 := {"at": [c.x, c.y], "item": item, "rest": true}
		if lvl != 0:
			e0["level"] = lvl
		things.append(e0)
		return ""
	var holds: Array = []
	var count: int = {"trophy": 1, "box": rng.randi_range(1, 2), "shelf": rng.randi_range(2, 3), "cells": rng.randi_range(2, 4)}.get(kind, 1)
	for k in count:
		holds.append(item)
	var depth: float = float(LM.model_meta(kit_name, id).get("solid", [1.0, 1.0, 1.0])[2])
	var push: float = 2.0 - depth / 2.0 - 0.1
	var e := {"at": [c.x, c.y], "prop": id, "face": NAMES[(wd + 2) % 4], "offset": [DIRS[wd].x * push, 0, DIRS[wd].y * push], "blocks": false, "holds": holds}
	if lvl != 0:
		e["level"] = lvl
		if lvl > 0:
			no_door_up[c + DIRS[wd]] = true
	else:
		no_win[c + DIRS[wd]] = true
	things.append(e)
	return kind


## A grid of one letter, the size of the map.
func blank(ch: Variant) -> Array:
	var out: Array = []
	for y in H:
		var row: Array = []
		row.resize(W)
		row.fill(ch)
		out.append(row)
	return out


static func rows(grid: Array) -> Array:
	var out: Array = []
	for row in grid:
		out.append("".join(PackedStringArray(row)))
	return out
