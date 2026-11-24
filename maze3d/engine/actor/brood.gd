extends Node
## ActorBrood - what it makes while it fights, and the doors it seals (defs "makes" and "seals_doors"; SPEC.md 3.3).
## "makes" is a list of:
##   {"actor": "roach", "every": 12, "max": 6, "when": "fight"}   born at its feet every 12 s while it hunts
##   {"trap": "mine", "ignore": "robots", "every": 5, "max": 4, "when": "walk"}   laid behind it as it goes (one due
##       while it stands is laid when it next moves)
##   {"actor": "roach", "when": "hurt", "chance": 0.35, "max": 6}   shed when it is hurt
## Any other key of an entry is the made thing's own (an actor's "hp_mul", a trap's "damage"). Never more than "max"
## of one entry's at once (alive, or still set). What it makes is made while playing, so the level remembers it.
## "seals_doors": true (or {"reach": 14}) seals every unlocked door within reach on its floor the moment it starts to
## fight, and opens them again when it dies: the fight cannot be walked away from. Only the doors it sealed open
## again, so a door the level locked stays locked; the actor remembers which they were (Actor.remember), so a save made
## mid-fight still opens them.
class_name ActorBrood

const REACH := 14.0

var a: Actor
var sealed: Array = []            # keys of the doors it sealed
var _t: Array = []                # seconds to the next, per entry
var _made: Array = []             # what each entry has made
var _sealing := false             # has a door to seal when the fight starts


func setup(actor: Actor) -> void:
	a = actor
	for m in a.d.get("makes", []):
		_t.append(float(m.get("every", 10.0)))
		_made.append([])
	_sealing = a.d.get("seals_doors", false) != false


func _physics_process(dt: float) -> void:
	if a.dead or not a.awake or a.off_duty or a.target() == null:
		return
	if _sealing:
		seal()
	var list: Array = a.d.get("makes", [])
	for i in list.size():
		var m: Dictionary = list[i]
		var when := str(m.get("when", "fight"))
		if when == "hurt":
			continue
		_t[i] = maxf(0.0, _t[i] - dt)
		var moving := Vector2(a.velocity.x, a.velocity.z).length() > 1.0
		if _t[i] <= 0.0 and (when != "walk" or moving):      # one laid as it walks waits, once due, for it to move
			_t[i] = float(m.get("every", 10.0))
			make(i, when == "walk")


## Hurt: an entry made "when": "hurt" may shed one.
func hurt() -> void:
	var list: Array = a.d.get("makes", [])
	for i in list.size():
		if str(list[i].get("when", "")) == "hurt" and randf() < float(list[i].get("chance", 0.3)):
			make(i, false)


## How many of one entry's are still about.
func count(i: int) -> int:
	return _made[i].filter(func(n: Variant) -> bool: return is_instance_valid(n) and not (n is Actor and n.dead) and not (n is Trap and not n.enabled)).size()


## Make one of an entry's: at its feet, or behind it (laid as it walks).
func make(i: int, behind: bool) -> Node3D:
	var m: Dictionary = a.d["makes"][i]
	if count(i) >= int(m.get("max", 4)):
		return null
	var at := a.global_position
	if behind:
		at -= Vector3(a.global_transform.basis.z.x, 0, a.global_transform.basis.z.z).normalized() * (float(a.d.get("radius", 0.5)) + 0.8)
	var c := a.level.cell_of(at)
	var s := a.level.floor_of(a.global_position)
	if not a.level.open_s(c.x, c.y, s):
		return null
	var e: Dictionary = m.duplicate(true)
	for k in ["every", "max", "when", "chance"]:
		e.erase(k)
	var mid := a.level.center(c)
	e["offset"] = [at.x - mid.x, 0, at.z - mid.z]
	e["level"] = s
	if e.has("actor"):
		e["alert"] = true
	var n := a.level.spawn_thing(e, c)
	if n != null:
		_made[i].append(n)
	return n


## Seal the unlocked doors within reach on its floor (once a fight).
func seal() -> void:
	_sealing = false
	var spec: Variant = a.d.get("seals_doors", true)
	var reach := float(spec.get("reach", REACH)) if spec is Dictionary else REACH
	var s := a.level.floor_of(a.global_position)
	for dr in a.level.doors.values() + a.level.doors_up.values():
		var key := a.level.key_of(dr)
		if dr.storey != s or dr.is_locked() or key == "" or dr.global_position.distance_to(a.global_position) > reach:
			continue
		dr.command("seal")
		sealed.append(key)
	if not sealed.is_empty():
		LM.sound("denied", a.global_position)


## It died: the doors it sealed open again.
func on_death() -> void:
	for key in sealed:
		var dr: Node = a.level.thing(key)
		if dr is Door and dr.sealed:
			dr.command("unlock")
	sealed.clear()
