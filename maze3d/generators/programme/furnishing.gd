extends RefCounted
## ProgrammeFurnishing - furniture for each room of a laid-out programme, for what the room is for (SPEC.md 6.3): a
## room's "purpose" names one of the game's purposes (defs "purposes": id -> {"name", "wall", "floor", "centre",
## "corner", "fill", "rows"}), and the rooms generator's own furnishing (generators/rooms/furnish.gd) puts it in, by
## its rules: the ways between doorways and the cells inside them kept clear, nothing out on the floor beside anything
## else, nothing that would cut a room in two. A room without a purpose is left bare. It goes in after the programme's
## own things, round them.
## Programme rooms are small beside the rooms generator's, and in a small room the rows the furnishing picks for seats
## or beds can all fall on the edge or the way through; so each room is furnished from a few seeds of its own and the
## one that puts most in is kept (the rooms generator is left as it is). Its random numbers are its own, seeded from
## the level's seed, so the furniture can change without moving anything else.
class_name ProgrammeFurnishing

const Furnish := preload("res://generators/rooms/furnish.gd")
const SALT := 104729
const TRIES := 4


## The furniture, as level things.
static func furnish(lay: ProgrammeLayout, fill: ProgrammeFill, kit: String, seed_value: int, amount: float) -> Array:
	var params: Dictionary = LM.game.get("generator_params", {}).duplicate()
	params["size"] = [1, 1]                            # the context's own map is not used: the layout's is
	var used := {}
	for c in fill.used_cells():
		used[c] = true
	var out: Array = []
	var n := 0
	for id in ProgrammeFurnishing.order(lay):
		var pur: Dictionary = LM.defs.get("purposes", {}).get(str(lay.plan.rooms[id].get("purpose", "")), {})
		if pur.is_empty():
			continue
		var rc: Rect2i = lay.rects[id]
		var cells: Array = []
		for y in range(rc.position.y, rc.end.y):
			for x in range(rc.position.x, rc.end.x):
				cells.append(Vector2i(x, y))
		var best: Array = []
		for k in TRIES:
			var ctx := GenContext.new(seed_value + SALT + n * 31 + k * 7, params, false)
			ctx.g = lay.g
			ctx.W = lay.W
			ctx.H = lay.H
			ctx.used = used.duplicate()
			ctx.things = []
			Furnish.furnish(ctx, n, cells, pur, kit, amount)
			if ctx.things.size() > best.size():
				best = ctx.things
		for e in best:
			used[Vector2i(int(e["at"][0]), int(e["at"][1]))] = true
		out += best
		n += 1
	return out


## The rooms in a fixed order: the spine's, then each wing's west side and east side.
static func order(lay: ProgrammeLayout) -> Array:
	var out: Array = lay.plan.spine.duplicate()
	for w in lay.plan.wings:
		out += w["west"] + w["east"]
	return out
