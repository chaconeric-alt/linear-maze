extends RefCounted
## rooms - the example generator, and a tour of what a level can be: rooms of many shapes joined by corridors and
## loops, a locked way out, monsters, treasure, scanner arches, wall lockers and dressing, all picked from lists in
## game.json (generator_params, generator_themes).
##
## A generator is any script in generators/ with generate(seed, params) -> level dictionary
## (the same shape as a level JSON file). List it in game.json "generators" and it appears on
## the title screen. Bigger generators plug in the same way; this one shows the interface.
##
## What it builds, each with a chance set in params "shapes" (0 switches it off):
##   shape    rooms that are eight-sided, round-cornered, L-shaped, cross-shaped or full of piers      "fancy"
##   suites   one big box divided into two rooms by a thin wall with an opening and windows            "suite"
##   close    rooms one wall apart, so the wall between them can hold windows                          "close"
##   storeys  rooms two and three storeys high                                                         "tall"
##   gallery  balconies along one, two, three or all four walls, with a ramp up; in three-storey
##            rooms a second balcony a storey higher, with its own ramp from the first                 "balcony", "tiers"
##   window   observation windows wherever a wall has floor both sides                                 "window", "max_windows"
##   pool     flooded patches and wholly flooded rooms (level "fluid" gives the look)                  "pool", "max_pools"
##   loops    extra corridors, so there is more than one way round                                     "loops"
##   traps    lasers across corridors, shock plates and gas vents                                      "traps": {"laser": 2, ...}
##   jammed   doors that grind and spark                                                               "jammed"
##   ambush   taking the red card sets off the alarm and brings company                                "ambush"
##   upstairs doors a storey up between the balconies of two halls; rooms upstairs through a door off
##            a balcony, or reached only by a lift                                                     "upper_doors", "upper_rooms", "lift_rooms"
##   basement chambers under the place, a lift down to them, and pits in the floor above               "basement", "basement_rooms", "pits"
##
## Doors: a door only ever goes on a THRESHOLD: a corridor cell with a room on one side, open
## floor on the other and solid wall to both flanks, so it always closes an opening wall to wall.
## They are placed after every corridor is carved, because a later corridor can widen an opening.
## Shapes never touch a room's middle row or column, which is where corridors arrive.

## How it is built: _try runs the stages below in order over one GenContext (generators/rooms/context.gd), which
## carries the map and everything placed so far from stage to stage. Each stage is named for the phase it does and
## lives with its neighbours in generators/rooms/. Every random number comes from the context's one generator, in a
## fixed order, so the same seed always makes the same level.

const Layout := preload("res://generators/rooms/layout.gd")
const Galleries := preload("res://generators/rooms/galleries.gd")
const Contents := preload("res://generators/rooms/contents.gd")
const Hazards := preload("res://generators/rooms/hazards.gd")
const Storeys := preload("res://generators/rooms/storeys.gd")
const Stations := preload("res://generators/rooms/stations.gd")


func generate(seed_value: int, p: Dictionary) -> Dictionary:
	for attempt in 40:
		var lv := _try(seed_value + attempt * 7919, p)
		if not lv.is_empty():
			lv["id"] = "gen-%d" % seed_value
			return lv
	push_warning("rooms generator: no solvable layout found; returning a try without a lock")
	for attempt in 40:                       # the same seeds again, unlocked; the first is the one this always returned
		var lv := _try(seed_value + attempt * 7919, p, false)
		if not lv.is_empty():
			return lv
	push_error("rooms generator: these settings fit fewer than three rooms on every try; no level")
	return {}                                # Main says so and goes back to the title instead of building nothing


## One layout from one seed, or {} if this seed's layout will not do (too few rooms, or the vault cannot be locked).
func _try(seed_value: int, p: Dictionary, lock := true) -> Dictionary:
	var ctx := GenContext.new(seed_value, p, lock)
	if not Layout.units(ctx):                # boxes for the rooms
		return {}
	Layout.shapes(ctx)                       # cut corners, crosses, piers, suites
	Layout.areas(ctx)                        # what gets a style, a height and furniture
	Layout.corridors(ctx)                    # carve only; doors come afterwards
	if not Layout.thresholds(ctx):           # doors, and where the red card can go
		return {}
	Galleries.cut_corners(ctx)
	Galleries.galleries(ctx)                 # balconies and ramps, before the furniture
	Contents.essentials(ctx)                 # the start, the card, the guns, the way out
	Contents.arches(ctx)
	Contents.rooms(ctx)                      # monsters, treasure, furniture, dressing, lockers
	Contents.balconies(ctx)                  # something worth the climb
	Hazards.windows(ctx)
	Hazards.traps(ctx)
	Hazards.pools(ctx)                       # last of the main floor's features
	Storeys.storeys(ctx)                     # doors and rooms upstairs, the basement, lifts and pits
	Stations.stations(ctx)                   # robots off duty into their stations; sphinx guns
	_ambush(ctx)
	return _assemble(ctx)


## Taking the card brings company to the big room.
func _ambush(ctx: GenContext) -> void:
	var p := ctx.p
	var amb: Variant = ctx.sh.get("ambush", true)
	if not (amb and ctx.lock and not ctx.actors.is_empty() and ctx.last >= 2):
		return
	var hr: Rect2i = ctx.rects[1 if ctx.key_room != 1 else 2]
	var spots: Array = []
	for dc in [Vector2i(0, 0), Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var c: Vector2i = ctx.clear(hr.get_center() + dc)
		if ctx.g[c.y][c.x] != "#" and ctx.room_of[c.y][c.x] >= 0 and not spots.has([c.x, c.y]):
			spots.append([c.x, c.y])
	if spots.is_empty():
		return
	ctx.tags["ambush"] = spots
	ctx.triggers.append({"on": {"type": "flag", "name": "key_red"}, "do": [
		{"type": "message", "text": p.get("ambush_text", "RED CARD REMOVED. Somebody has been told."), "kind": "warn", "delay": 0.6},
		{"type": "alarm", "delay": 0.6},
		{"type": "spawn", "tag": "ambush", "actor": ctx.weighted(p.get("ambush_actors", ctx.actors)), "count": ctx.rng.randi_range(2, 3), "delay": 1.5}]})


## The level dictionary, in the shape of a level file.
func _assemble(ctx: GenContext) -> Dictionary:
	var p := ctx.p
	var seed_value := ctx.seed_value
	var out := {"diags": ctx.diags, "decks": ctx.decks, "ramps": ctx.ramps, "windows": ctx.windows, "walls": ctx.walls, "seed": seed_value,
		"name": "%s %d" % [p.get("place", "Installation"), seed_value % 1000], "kit": p.get("kit", "hightech"),
		"style": p.get("corridor", "corridor"), "ambient_energy": 0.6, "legend": ctx.legend, "map": GenContext.rows(ctx.g), "rooms": ctx.rooms, "things": ctx.things,
		"tags": ctx.tags, "triggers": ctx.triggers,
		"intro": "%s %d. Find the red card, reach the last room." % [p.get("place", "Installation"), seed_value % 1000],
		"objectives": [{"text": "Find the RED card.", "done": "key_red"}, {"text": "Get through the vault door and signal the surface."}]}
	if not ctx.storeys.is_empty():
		out["floors"] = ctx.storeys
	if ctx.flooded:
		out["fluid"] = p.get("fluid", {"level": 0.7, "color": [0.12, 0.55, 0.35, 0.6], "glow": 0.35})
	return out
