extends Node3D
## Trap - a hazard built into a cell: a laser, darts, a shock floor, a gas vent; a crusher, a flame jet, a sweeping
## laser, a mine, a spore pod. What it does is its kind's (engine/traps/, made by make_kind); what every kind
## shares is here: its entry, its clock, its light, who it spares, the measures of a body, and switching it off.
## Every one can be switched off by a story flag ("off": a flag, or a list of them) or a "disable" effect on its tag.
## It hurts whatever is in it, the player, monsters and robots alike, except those it is told to spare: "ignore":
## "robots", "monsters" (living things), "player", or a list of them. A tripwire is tripped by the player only.
## Flyers and wall-climbers ask danger() before they move, and keep out (ActorWary); walkers do not see it coming.
class_name Trap

const SPARE := 0.2                # metres beyond where it burns that danger() still counts as in it

var level: Level
var e: Dictionary
var kind := ""
var enabled := true
var cell_pos: Vector2i
var storey := 0
var t := 0.0                      # seconds it has run, from its "phase": what its cycle is timed by
var cool := 0.0                   # seconds before it may go off again (the darts' cooldown)
var light: OmniLight3D
var job: TrapKind                 # what its kind does
var ignore: Array = []            # who it spares: "player", "robots", "monsters"
var _next_hit: Dictionary = {}    # instance id -> the time (t) it may burn that one again: a beam or gas burns every
                                  # half second or so, not every frame


func setup(lv: Level, entry: Dictionary, p: Vector2i, kit_id: String) -> void:
	level = lv
	e = entry
	cell_pos = p
	kind = e["trap"]
	storey = int(e.get("level", 0))
	t = e.get("phase", 0.0)
	var ig: Variant = e.get("ignore", [])
	ignore = ig if ig is Array else [ig]
	light = OmniLight3D.new()
	light.omni_range = 5.0
	light.light_energy = 0.0
	add_child(light)
	job = Trap.make_kind(kind, self)
	job.build(kit_id)
	var offs: Array = e["off"] if e.get("off") is Array else ([e["off"]] if e.has("off") else [])
	for f in offs:
		if Game.has_flag(f):
			set_enabled(false)
	Game.flag_set.connect(func(n): if offs.has(n): set_enabled(false))


## What each kind of trap does: a new kind is a new file in engine/traps/ and a line here.
static func make_kind(k: String, t: Trap) -> TrapKind:
	match k:
		"laser":
			return TrapLaser.new(t)
		"darts":
			return TrapDarts.new(t)
		"shock":
			return TrapShock.new(t)
		"vent":
			return TrapVent.new(t)
		"crusher":
			return TrapCrusher.new(t)
		"flame":
			return TrapFlame.new(t)
		"sweep":
			return TrapSweep.new(t)
		"mine":
			return TrapMine.new(t)
		"spores":
			return TrapSpores.new(t)
	return TrapKind.new(t)


## Switched off (by a flag or an effect): the level's memory keeps it off (LevelMemory).
func remember() -> Dictionary:
	return {} if enabled else {"off": true}


func recall(r: Dictionary) -> void:
	if r.get("off", false):
		set_enabled(false)


## Something of it there to see and name (Identify): its kind says (a spent mine has nothing left).
func shows() -> bool:
	return job == null or job.there()


func set_enabled(on: bool) -> void:
	enabled = on
	if not on:
		light.light_energy = 0.0
		job.off()


func _process(dt: float) -> void:
	if not enabled:
		return
	t += dt
	cool -= dt
	var pl := Game.player
	if pl == null or not is_instance_valid(pl):
		return
	job.tick(dt, pl, victims(pl))


## Does it hurt this one at all? Robots and living things are told apart by the actor def's "robot".
func hurts(who: Node3D) -> bool:
	if who is Actor:
		return not ignore.has("robots" if (who as Actor).is_robot() else "monsters")
	return not ignore.has("player")


## Everyone close enough to be in it this frame, on its own storey (a trap works on its own floor only): the player
## and every live actor within a cell of it that it does not spare.
func victims(pl: Node3D) -> Array:
	var out: Array = []
	if hurts(pl) and _on_storey(pl, pl.global_position):
		out.append(pl)
	for ac in level.actors:
		if not is_instance_valid(ac) or ac.dead:
			continue
		var rel: Vector3 = ac.global_position - global_position
		if absf(rel.x) < level.C and absf(rel.z) < level.C and hurts(ac) and _on_storey(ac, ac.global_position):
			out.append(ac)
	return out


func _on_storey(who: Node3D, at: Vector3) -> bool:
	var sp := span(who, at)
	return sp.x >= -0.65 and sp.x <= level.H - 0.85


## The bottom and top of a body, in metres above this trap, if its origin were at `at`: the player's from its feet,
## an actor's from its collision capsule as it lies now (a flyer's rides well above its origin; one on a wall lies on
## its side). `upright`: as it would stand on the floor (a climber asking where it would land).
func span(who: Node3D, at: Vector3, upright := false) -> Vector2:
	var base: float = at.y - global_position.y
	if not (who is Actor):
		return Vector2(base - 0.05, base + 1.8)
	var ac := who as Actor
	var cap := ac.cs.shape as CapsuleShape3D
	if upright or cap == null:
		return Vector2(base, base + float(ac.d.get("height", 1.6)))
	var mid: float = ac.cs.global_position.y - ac.global_position.y + base
	var half: float = absf(ac.cs.global_basis.y.y) * (cap.height / 2.0 - cap.radius) + cap.radius
	return Vector2(mid - half, mid + half)


## How far across a beam a body reaches: the player's 0.45 m, an actor's radius.
func reach(who: Node3D) -> float:
	return float((who as Actor).d.get("radius", 0.5)) + 0.05 if who is Actor else 0.45


## In its cell (or within `margin` metres of it).
func here(rel: Vector3, margin := 0.0) -> bool:
	return absf(rel.x) < level.C / 2 + margin and absf(rel.z) < level.C / 2 + margin


## May it burn this one now? Then not again for `gap` seconds.
func due(who: Node3D, gap: float) -> bool:
	var id := who.get_instance_id()
	if t < float(_next_hit.get(id, -1.0)):
		return false
	_next_hit[id] = t + gap
	return true


## Would it hurt `who` if its origin were at `at`, now or within `lead` seconds? What flyers and climbers ask before
## they move (ActorWary). `upright`: as it would stand there on its feet (a climber asking where it would land).
func danger(who: Node3D, at: Vector3, lead := 0.0, upright := false) -> bool:
	if not enabled or not hurts(who) or job.harmless():
		return false
	var rel := at - global_position
	var sp := span(who, at, upright)
	if sp.x < -0.65 or sp.x > level.H - 0.85:
		return false
	return job.danger(who, rel, sp, reach(who) + SPARE, lead)


## Traps that cycle for ever (the shock floor) are heard only from close by, on their own storey: "hear" metres (12), or "quiet": true for never.
func near(pl: Node3D) -> bool:
	if e.get("quiet", false) or pl == null or not is_instance_valid(pl):
		return false
	return pl.global_position.distance_to(global_position) < float(e.get("hear", 12.0)) and level.floor_of(pl.global_position) == level.floor_of(global_position)


## Is that cell, on this trap's storey, something to fix an emitter to?
func solid_at(x: int, y: int) -> bool:
	return level.air(x, y, storey)["solid"]
