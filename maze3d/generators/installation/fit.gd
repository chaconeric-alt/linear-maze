extends RefCounted
## InstallationFit - how well a room type suits a room of the rooms generator's, and the best way to give a few room
## types a few rooms (SPEC 6.4: rooms by fit). A room type's "fit" says the size it wants ("small", "medium" or
## "large") and the storeys ([least, most]); a room is small under SMALL cells of floor, large from LARGE, medium
## between. The fit is a score: 0 when both are as wanted, one less for each size class and each storey off. It is a
## preference, never a refusal: a theatre with no tall room left goes in the best room there is, as a place that does
## not entirely make sense.
class_name InstallationFit

const SIZES := ["small", "medium", "large"]
const SMALL := 16
const LARGE := 36
const EVERY_WAY := 8             # a block of at most this many rooms is matched in every way; a bigger one greedily


## A room's size class by its floor.
static func size_of(cells: int) -> String:
	return SIZES[0 if cells < SMALL else (2 if cells >= LARGE else 1)]


## How well a room type with this fit suits a room of `cells` floor and `storeys` storeys (0 is as wanted).
static func score(fit: Dictionary, cells: int, storeys: int) -> int:
	if fit.is_empty():
		return 0
	var want := SIZES.find(str(fit.get("size", "medium")))
	if want < 0:                                   # a size it does not know: taken as medium
		want = 1
	var have := SIZES.find(InstallationFit.size_of(cells))
	var st: Array = fit.get("storeys", [1, 3])
	var lo := int(st[0])
	var hi := int(st[1]) if st.size() > 1 else lo
	var off := 0 if storeys >= lo and storeys <= hi else mini(absi(storeys - lo), absi(storeys - hi))
	return -absi(want - have) - off


## The rooms for `fits` (one fit per room type) out of `places` ([cells, storeys] each, at least as many): the index
## of the place each gets, the best total fit there is (the first such in order, so the same block always comes out
## the same). Beyond EVERY_WAY places, the best pair first, then the next.
static func best(fits: Array, places: Array) -> Array:
	if places.size() <= EVERY_WAY:
		var found := {"total": -INF, "at": []}
		InstallationFit._every_way(fits, places, [], 0, found)
		return found["at"]
	var out: Array = []
	out.resize(fits.size())
	out.fill(-1)
	var free: Array = range(places.size())
	for k in fits.size():
		var pick := [-INF, -1, -1]
		for i in fits.size():
			if out[i] >= 0:
				continue
			for j in free:
				var sc := InstallationFit.score(fits[i], places[j][0], places[j][1])
				if sc > pick[0]:
					pick = [sc, i, j]
		out[pick[1]] = pick[2]
		free.erase(pick[2])
	return out


## Every way to give the rooms from `taken.size()` on a place not yet taken, keeping the best total in `found`.
static func _every_way(fits: Array, places: Array, taken: Array, total: int, found: Dictionary) -> void:
	var i := taken.size()
	if i == fits.size():
		if total > found["total"]:
			found["total"] = total
			found["at"] = taken.duplicate()
		return
	for j in places.size():
		if not taken.has(j):
			taken.append(j)
			InstallationFit._every_way(fits, places, taken, total + InstallationFit.score(fits[i], places[j][0], places[j][1]), found)
			taken.pop_back()
