extends RefCounted
## Dice - random numbers in streams of their own (the generation review, 25 Nov: "use independently seeded random
## streams ... prevents changing a furniture asset from inadvertently changing the entire dungeon").
## Every actor draws from its own stream, seeded from the run's seed, its level and its key (Spawner); the player from
## theirs; each kind of chance a level takes from one named for it (Level.dice: an effect's odds, a hack or a risk, where
## a thing falls); and a generator from a stream for each stage (derive). So what one draws never moves another's
## numbers: a monster that strafes once more does not change how every later fight goes, and a stage of the generator
## that changes does not move what the others made. The global stream (randf, randi) is left to what only looks or
## sounds different: sparks, a footstep's pitch, a camera's shake, a bark's words.
class_name Dice

static var base := 0               # the run's seed (Main: the repeatable seed, or one drawn at start)


## A stream of the run's, by name: the same run and name, the same numbers.
static func stream(name: String) -> RandomNumberGenerator:
	return Dice.derive(base, name)


## A stream from a seed and a name (a generator's stage): the same seed and name, the same numbers.
static func derive(seed_value: int, name: String) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = hash("%d|%s" % [seed_value, name])
	return r


## One of the list, from that stream.
static func pick(r: RandomNumberGenerator, list: Array) -> Variant:
	return list[r.randi() % list.size()]


## The list put in a random order, from that stream (Array.shuffle draws from the global one).
static func shuffle(r: RandomNumberGenerator, list: Array) -> void:
	for i in range(list.size() - 1, 0, -1):
		var j := r.randi_range(0, i)
		var t: Variant = list[i]
		list[i] = list[j]
		list[j] = t
