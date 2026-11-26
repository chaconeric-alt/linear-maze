extends RefCounted
## SchemaSettings - the keys of what writes an installation (SPEC.md 6.4), and the check that the game's defs keep to
## them: settings, clusters, room types and contradictions, and the older archetypes. Beside the keys it checks that
## every id one record names is one the defs have: a setting's clusters, contradictions and rooms, a cluster's rooms.
## Schema runs it with the rest of the defs' checks.
class_name SchemaSettings

const SETTING := ["name", "kit", "style", "systems", "core_lock", "spine", "clusters", "rooms", "occupants", "loot",
	"contradictions", "words", "hub", "gate", "way_round", "containers", "doors", "dressing"]    # defs "settings": what a place was
const SETTING_CLUSTERS := ["count", "always", "list"]
const SETTING_CLUSTER := ["name", "corridor"]                     # a setting's own view of a cluster it has
const SPINE_STEP := ["room"]
const CLUSTER := ["name", "corridor", "rooms"]                    # defs "clusters": rooms that work together
const CLUSTER_ROOM := ["room", "chance", "door_to", "next_to"]
const ROOM_TYPE := ["name", "style", "purpose", "size", "way_in", "empty", "memos", "card", "loot", "trap", "core",
	"generator", "security", "fit", "contents", "density"]      # defs "room_types": what a room is for
const ROOM_FIT := ["size", "storeys"]                            # the room it suits on the rooms generator's geometry
const ROOM_CONTENTS := ["common", "uncommon", "rare", "anomalous"]   # what may stand in it, by how often
const DENSITIES := ["sparse", "normal", "cluttered", "crowded", "crammed"]
const CORE_LOCK := ["when", "flag", "need", "color"]
const OCCUPANTS := ["per_room", "empty", "actors"]
const GATE := ["step", "by", "color", "flag", "need"]
const WAY_ROUND := ["name", "corridor"]
const CONTRADICTION := ["mandate", "now", "bias", "words"]        # defs "contradictions"
const ARCHETYPE := ["name", "kit", "style", "systems", "core_lock", "spine", "wings", "roles", "occupants", "loot",
	"contradictions", "words", "hub", "gate", "way_round", "containers"]  # defs "archetypes": the older shape, still read
const ARCH_WINGS := ["count", "always", "list"]
const ARCH_WING := ["name", "corridor", "rooms"]
const ARCH_STEP := ["role", "chance", "door_to", "next_to"]
const KEYS := SETTING + SETTING_CLUSTERS + SETTING_CLUSTER + SPINE_STEP + CLUSTER + CLUSTER_ROOM + ROOM_TYPE + ROOM_FIT + ROOM_CONTENTS + CORE_LOCK \
	+ OCCUPANTS + GATE + WAY_ROUND + CONTRADICTION + ARCHETYPE + ARCH_WINGS + ARCH_WING + ARCH_STEP


## Problems with what writes an installation: unknown keys, and ids named that the defs do not have.
static func check(defs: Dictionary) -> Array:
	var pairs: Array = []
	var out: Array = []
	for id in defs.get("contradictions", {}):
		pairs.append([defs["contradictions"][id], CONTRADICTION, "contradiction '%s'" % id])
	for id in defs.get("clusters", {}):
		var c: Dictionary = defs["clusters"][id]
		pairs.append([c, CLUSTER, "cluster '%s'" % id])
		out += SchemaSettings._rooms_named(defs, c.get("rooms", []), "cluster '%s'" % id, pairs)
	for id in defs.get("room_types", {}):
		pairs.append([defs["room_types"][id], ROOM_TYPE, "room type '%s'" % id])
		pairs.append([defs["room_types"][id].get("fit", {}), ROOM_FIT, "room type '%s', its fit" % id])
		pairs.append([defs["room_types"][id].get("contents", {}), ROOM_CONTENTS, "room type '%s', its contents" % id])
		var den := str(defs["room_types"][id].get("density", "normal"))
		if not den in DENSITIES:
			out.append("room type '%s': no density '%s' (%s)" % [id, den, ", ".join(DENSITIES)])
	for id in defs.get("settings", {}):
		out += SchemaSettings._setting(defs, id, pairs)
	for id in defs.get("archetypes", {}):
		SchemaSettings._archetype(defs["archetypes"][id], "archetype '%s'" % id, pairs)
	for pr in pairs:
		for k in pr[0]:
			if k != "id" and not k in pr[1]:              # LM adds "id" to each entry of a defs file
				out.append("%s: %s" % [pr[2], Schema.unknown(k, pr[1])])
	return out


## One setting's keys (into `pairs`), and the ids it names that the defs do not have.
static func _setting(defs: Dictionary, id: String, pairs: Array) -> Array:
	var s: Dictionary = defs["settings"][id]
	var at := "setting '%s'" % id
	var out: Array = []
	var cl: Dictionary = s.get("clusters", {})
	pairs.append_array([[s, SETTING, at], [cl, SETTING_CLUSTERS, at + ", clusters"],
		[s.get("core_lock", {}), CORE_LOCK, at + ", core_lock"], [s.get("occupants", {}), OCCUPANTS, at + ", occupants"],
		[s.get("gate", {}), GATE, at + ", gate"], [s.get("way_round", {}), WAY_ROUND, at + ", way_round"]])
	for cid in cl.get("list", {}):
		pairs.append([cl["list"][cid], SETTING_CLUSTER, "%s, cluster %s" % [at, cid]])
		if not defs.get("clusters", {}).has(cid):
			out.append("%s: no cluster '%s'" % [at, cid])
	for cid in cl.get("always", []):
		if not cl.get("list", {}).has(cid):
			out.append("%s: it must have cluster '%s', which is not in its list" % [at, cid])
	for st in s.get("spine", []):
		var step: Dictionary = st if st is Dictionary else {"room": st}
		pairs.append([step, SPINE_STEP, at + ", a spine step"])
		var named: Variant = step.get("room", "")
		out += SchemaSettings._rooms_named(defs, named if named is Array else [named], at, [])
	for rid in s.get("rooms", {}):
		pairs.append([s["rooms"][rid], ROOM_TYPE, "%s, its room %s" % [at, rid]])
		if not defs.get("room_types", {}).has(rid):
			out.append("%s: no room type '%s'" % [at, rid])
	for cid in s.get("contradictions", []):
		if not defs.get("contradictions", {}).has(cid):
			out.append("%s: no contradiction '%s'" % [at, cid])
	return out


## The rooms a cluster or a spine step names: each one a room type the defs have (each entry's keys into `pairs`).
static func _rooms_named(defs: Dictionary, rooms: Array, at: String, pairs: Array) -> Array:
	var out: Array = []
	for e in rooms:
		if e is Dictionary:
			pairs.append([e, CLUSTER_ROOM, at + ", a room"])
		var rid := str(e.get("room", "") if e is Dictionary else e)
		if not defs.get("room_types", {}).has(rid):
			out.append("%s: no room type '%s'" % [at, rid])
	return out


## An archetype of the older shape: its keys into `pairs`.
static func _archetype(a: Dictionary, at: String, pairs: Array) -> void:
	pairs.append_array([[a, ARCHETYPE, at], [a.get("wings", {}), ARCH_WINGS, at + ", wings"],
		[a.get("core_lock", {}), CORE_LOCK, at + ", core_lock"], [a.get("occupants", {}), OCCUPANTS, at + ", occupants"],
		[a.get("gate", {}), GATE, at + ", gate"], [a.get("way_round", {}), WAY_ROUND, at + ", way_round"]])
	for r in a.get("roles", {}):
		pairs.append([a["roles"][r], ROOM_TYPE, "%s, role %s" % [at, r]])
	var steps: Array = a.get("spine", []).duplicate()
	for w in a.get("wings", {}).get("list", {}):
		pairs.append([a["wings"]["list"][w], ARCH_WING, "%s, wing %s" % [at, w]])
		steps += a["wings"]["list"][w].get("rooms", [])
	for st in steps:
		if st is Dictionary:
			pairs.append([st, ARCH_STEP, at + ", a room"])
