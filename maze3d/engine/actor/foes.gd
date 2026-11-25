extends Node
## ActorFoes - what an actor fights when that is not simply the player (SPEC.md 5.20). Added only when its faction is
## at war with another faction in the level, or is not at war with the player (an ally, or a neutral), or the level
## places allies of the player (in its data); every other actor goes on hunting the player as before, with no faction
## work at all.
## Four times a second it looks round: of everything it is at war with (the player, and the actors of hostile factions
## that are not off duty), the nearest it can see within its sight; it keeps what it is after while it can still see
## it, unless something much nearer turns up. Seeing nobody, it keeps after what it had; with nothing at all, after
## the player if it is at war with them (it knows where they are, as monsters always have), else nothing, and it
## potters. Hurt by an enemy, it turns on them; hurt by its own side, it does not. A neutral hurt by the player is
## at war with the player from then on (this one only); an ally takes the player's stray shots without turning.
class_name ActorFoes

const LOOK_EVERY := 0.25
const NEARER := 0.6               # something this much nearer than what it is after takes its place
const CHECK := 4                  # how many of the nearest it looks at, each time (a line of sight each)

var a: Actor
var faction := ""
var angry := false                # a neutral the player hurt: at war with the player from now on
var _foe: Node3D = null
var _t := 0.0


## Does this actor need one? (Its faction is at war with others in this level, or not at war with the player; or the
## level places the player's allies, whom the player's enemies fight too.)
static func wanted(actor: Node) -> bool:
	var f := Factions.of(actor)
	var vs_player := Factions.hostile(f, Factions.PLAYER)
	return Factions.fights_others(f) or not vs_player or Factions.allies_here()


func setup(actor: Actor) -> void:
	a = actor
	faction = Factions.of(actor)


## What it is after now, or null.
func target() -> Node3D:
	return _foe if _alive(_foe) else null


func _physics_process(dt: float) -> void:
	if a.dead or a.off_duty:
		return
	_t -= dt
	if _t > 0.0:
		return
	_t = LOOK_EVERY
	_choose()


func _choose() -> void:
	if not _alive(_foe):
		_foe = null
	var sight: float = a.d.get("sight", 24.0) if a.awake else a.d.get("wake_sight", a.d.get("sight", 24.0) * 0.75)
	var near: Array = []
	for c in _enemies():
		var dist: float = c.global_position.distance_to(a.global_position)
		if dist < sight:
			near.append([dist, c])
	near.sort_custom(func(x: Array, y: Array) -> bool: return x[0] < y[0])
	var keep := _foe != null and _sees(_foe)
	var foe_d := a.global_position.distance_to(_foe.global_position) if _foe != null else INF
	for i in mini(near.size(), CHECK):
		if near[i][1] == _foe:
			break                                    # the nearest it might see is the one it is after
		if (not keep or near[i][0] < foe_d * NEARER) and _sees(near[i][1]):
			_foe = near[i][1]
			break
	if _foe == null and at_war_with_player():
		_foe = Game.player


## Everything it is at war with, alive and fighting.
func _enemies() -> Array:
	var out: Array = []
	if at_war_with_player() and _alive(Game.player):
		out.append(Game.player)
	for o in a.level.actors:
		if o != a and _alive(o) and not (o as Actor).off_duty and Factions.hostile(faction, Factions.of(o)):
			out.append(o)
	return out


func at_war_with_player() -> bool:
	return angry or Factions.hostile(faction, Factions.PLAYER)


## It was hurt by `by`: an enemy is turned on; its own side is not; the player makes a neutral an enemy.
func hurt_by(by: Variant) -> void:
	if not (by is Node3D) or not is_instance_valid(by) or by == a:
		return
	if by == Game.player:
		if faction != Factions.PLAYER and not at_war_with_player():
			angry = true
			_foe = Game.player
		return
	if by is Actor and Factions.hostile(faction, Factions.of(by)) and _alive(by):
		_foe = by


func _sees(n: Node3D) -> bool:
	return a.level.perception.sees(a.eye(), n)


func _alive(n: Variant) -> bool:
	return n != null and is_instance_valid(n) and not n.dead
