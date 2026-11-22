extends Node3D
## Level - a playable place built from a level dictionary (a JSON file, or what a generator returns) and a kit.
## A thin node that owns the parts that do the work, and answers for them, so callers need only the Level:
##   LevelData      the map read into cells, and questions about it (engine/level/level_data.gd)
##   LevelBuilder   shell, collision, nav, fluid, environment (engine/level/builder.gd and the files it uses)
##   LevelNav       the walking graph: path, reach, floor_y (engine/level/nav.gd)
##   LevelLights    the lights, by room, and their flicker (engine/level/lights.gd)
##   Spawner        doors, windows and every thing in it, by kind (engine/level/spawner.gd)
##   Triggers       what sets the level's triggers off, and the explored map (engine/level/triggers.gd)
##   LightingDebug  the F1-F3 lighting tests (engine/level/lighting_debug.gd)
##   LevelEffects   the place's effects in the EffectRegistry (engine/level/level_effects.gd)
## SPEC.md, "Levels".
class_name Level

const DIRS := LevelData.DIRS
const DIR_NAMES := LevelData.DIR_NAMES
const DIR_ROT := LevelData.DIR_ROT
const GLASS := LevelBuilder.GLASS     # collision layer of things that stop bodies and shots but not sight
const UNDER := LevelData.UNDER

var ld: LevelData
var builder: LevelBuilder
var spawner: Spawner
var triggers: Triggers
var lights: LevelLights
var nav_graph: LevelNav

# What the rest of the engine reads. Containers are the parts' own, shared; sizes are fixed once the map is read.
var data: Dictionary
var kit: Dictionary
var kit_id: String
var C := 4.0
var H := 4.0
var w := 0
var h := 0
var cells: Array = []            # the main floor's cells (storey 0)
var floors: Dictionary = {}      # storey -> cells of the floor whose ground is at that storey
var f_min := 0
var f_max := 0
var rooms: Array = []
var tags: Dictionary = {}        # tag -> Array of Vector2i
var nav: AStar3D                 # points: ground, deck 1, deck 2 and ramp, per cell
var tiles_at: Dictionary = {}    # Vector2i -> [[tile id, where it was laid], ..]: which tile is where (Identify)
var lights_by_room: Dictionary = {}
var explored: Dictionary = {}
var doors: Dictionary = {}       # Vector2i -> Door
var doors_up: Dictionary = {}    # Vector3i(x, y, storey) -> Door, for doors that are not on storey 0
var lifts: Array = []
var things_by_tag: Dictionary = {}
var things: Dictionary = {}      # key -> node: every thing by the key its place in the level's data gives it (Spawner.plan)
var restocked: Array = []        # the keys of what its makers made again since the last visit (Restock)
var actors: Array = []
var targets: Array = []          # Targets (engine/target.gd)
var traps: Array = []            # Traps (engine/trap.gd), for hazard()
var died: Array = []             # [kind, storey] of everything that has died here, in order (the repair bay reads it)
var home: Home = null            # the bunker's workings, on a level with "home": true (engine/home.gd)
var bad_doors := 0
var _effects: LevelEffects

## Where the player starts. A thing in the level can move it, so it is the data's, read through.
var start_cell: Vector2i:
	get:
		return ld.start_cell
var start_level: int:
	get:
		return ld.start_level
var start_yaw: float:
	get:
		return ld.start_yaw


## Build the level from its data. `memory`: what it remembers from an earlier visit (State's memory of it, LevelMemory),
## laid over it as it is built; empty for a level seen for the first time, or one that keeps no memory (the bunker).
func build(level_data: Dictionary, memory: Dictionary = {}) -> void:
	ld = LevelData.new(level_data)
	data = ld.data
	kit = ld.kit
	kit_id = ld.kit_id
	C = ld.C
	H = ld.H
	_effects = LevelEffects.new(self)
	_effects.register(Game.effects)
	ld.parse()
	w = ld.w
	h = ld.h
	cells = ld.cells
	floors = ld.floors
	f_min = ld.f_min
	f_max = ld.f_max
	rooms = ld.rooms
	tags = ld.tags
	lights = LevelLights.new(self, ld)
	lights_by_room = lights.by_room
	builder = LevelBuilder.new(self, ld, lights)
	tiles_at = builder.tiles_at
	builder.make_bodies()
	ld.find_hung()
	builder.build_shell()
	builder.build_collision()
	nav_graph = builder.build_nav()
	nav = nav_graph.astar
	spawner = Spawner.new(self, ld)
	restocked = LevelMemory.prepare(self, memory)
	spawner.build_things()
	builder.build_fluid()
	builder.build_environment()
	var ldb := LightingDebug.new()
	ldb.name = "LightingDebug"
	ldb.setup(builder.env, lights)
	add_child(ldb)
	triggers = Triggers.new(self, ld)
	explored = triggers.explored
	LevelMemory.lay(self, memory)
	Game.flag_set.connect(_on_flag)
	if data.get("home", false):
		home = Home.new()
		home.name = "Home"
		add_child(home)
		home.setup(self)


# ------------------------------------------------------------------ the map (LevelData)
func cell(x: int, y: int, f := 0) -> Dictionary:
	return ld.cell(x, y, f)


func is_open(x: int, y: int, f := 0) -> bool:
	return ld.is_open(x, y, f)


func cell_s(x: int, y: int, s: int) -> Dictionary:
	return ld.cell_s(x, y, s)


func ceiling_y(x: int, y: int, s: int) -> float:
	return ld.ceiling_y(x, y, s)


func air(x: int, y: int, s: int) -> Dictionary:
	return ld.air(x, y, s)


func open_s(x: int, y: int, s: int) -> bool:
	return ld.open_s(x, y, s)


func floor_of(pos: Vector3) -> int:
	return ld.floor_of(pos)


func cell_at(pos: Vector3) -> Dictionary:
	return ld.cell_at(pos)


func center(p: Vector2i, y := 0.0) -> Vector3:
	return ld.center(p, y)


func cell_of(pos: Vector3) -> Vector2i:
	return ld.cell_of(pos)


func room_at(p: Vector2i) -> String:
	return ld.room_at(p)


func fluid_at(pos: Vector3) -> bool:
	return ld.fluid_at(pos)


## One of a style's list, picked with the level's own random stream (a pit's trapdoor uses it).
func pick(list: Variant) -> String:
	return ld.pick(list)


# ------------------------------------------------------------------ getting about (LevelNav)
func reach(from: Vector3, to: Vector3) -> bool:
	return nav_graph.reach(from, to)


func block(p: Vector2i, solid := true, f := 0) -> void:
	nav_graph.block(p, solid, f)


func is_blocked(p: Vector2i, f := 0) -> bool:
	return nav_graph.is_blocked(p, f)


func path(from: Vector3, to: Vector3) -> PackedVector3Array:
	return nav_graph.path(from, to)


func floor_y(pos: Vector3) -> float:
	return nav_graph.floor_y(pos)


## Can a be seen from b? Glass does not stop sight; pass shot = true to ask whether a bullet would get there.
func los(a: Vector3, b: Vector3, shot := false) -> bool:
	var q := PhysicsRayQueryParameters3D.create(a, b, 1 | (GLASS if shot else 0))
	return get_world_3d().direct_space_state.intersect_ray(q).is_empty()


## The body the walls, floors and ceilings are part of, and the one windows are.
func solid_body() -> StaticBody3D:
	return builder.solid


func glass_body() -> StaticBody3D:
	return builder.glass


# ------------------------------------------------------------------ things in it (Spawner, LevelLights)
func spawn_thing(e: Dictionary, p: Vector2i) -> Node3D:
	return spawner.spawn_thing(e, p)


## The key a thing is known by, the same on every load of this level ("door:12,7,0", "thing:41", "obj:3,9",
## "extra:2" for one made while playing), or "" for something the Spawner did not make.
func key_of(n: Object) -> String:
	return str(n.get_meta("key")) if n != null and is_instance_valid(n) and n.has_meta("key") else ""


## What to keep of the level as it is now, for its memory (LevelMemory.take): Main asks as the player leaves.
func remember() -> Dictionary:
	return LevelMemory.take(self)


## The thing with that key, if it is still there.
func thing(key: String) -> Node:
	var n: Variant = things.get(key)
	return n if n != null and is_instance_valid(n) else null


func make_light(spec: Dictionary, xf: Transform3D, room: String, flicker := 0.0, shadows := false, scale := 1.0) -> OmniLight3D:
	return lights.make(spec, xf, room, flicker, shadows, scale)


## A Target for an off-duty monster to show its attacks on. What cannot move needs one it can see from where it is;
## what can goes to the gun range (targets tagged "range"), or failing that to the nearest.
func drill_target_for(a: Actor) -> Node3D:
	var rooted: bool = a.cannot_walk()
	var best: Node3D = null
	var best_d := 1e9
	for pass_n in 2:
		for t in targets:
			if not is_instance_valid(t) or t.busy != null:
				continue
			var dd: float = a.global_position.distance_to(t.global_position)
			if rooted:
				if dd > a.d.get("sight", 24.0) or not los(a.eye(), t.global_position + Vector3(0, 1.3, 0)):
					continue
			elif pass_n == 0 and t.tag != "range":
				continue
			if dd < best_d:
				best = t
				best_d = dd
		if best != null or rooted:
			break
	return best


# ------------------------------------------------------------------ while playing (Triggers)
func _process(dt: float) -> void:
	lights.tick(dt)
	var pl: Node3D = Game.player
	if pl == null or not is_instance_valid(pl):
		return
	triggers.track(pl)


func _on_flag(name: String) -> void:
	triggers.fire("flag", name)


func notify(kind: String, what: String) -> void:
	if triggers:                                 # (nothing is listening until the level is built)
		triggers.fire(kind, what)


func actor_died(a: Node) -> void:
	if triggers:
		triggers.actor_died(a)


## Effects that belong to the place: doors, lights, spawns, alarms (engine/level/level_effects.gd, registered at build).
func run_effect(ef: Dictionary, ctx: Dictionary) -> void:
	Game.effects.run(ef, ctx)


## Would any trap hurt `who` if its origin were at `at`, now or within `lead` seconds? Flyers and climbers ask before
## they move (ActorWary). `upright`: as it would stand on its feet there.
func hazard(who: Node3D, at: Vector3, lead := 0.0, upright := false) -> bool:
	for t in traps:
		if is_instance_valid(t) and absf(t.global_position.x - at.x) < C and absf(t.global_position.z - at.z) < C and t.danger(who, at, lead, upright):
			return true
	return false
