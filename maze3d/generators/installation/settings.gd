extends RefCounted
## InstallationSettings - the game's settings put together for the writer (SPEC.md 6.4). A setting (defs "settings")
## is what a place was; its clusters (defs "clusters") are groups of rooms that work together, its room types (defs
## "room_types") what a room is for. Clusters and room types are the game's, shared between settings; a setting may
## take its own view of either: its "rooms" change a room type's fields for it (another name, another style, no card
## kept there), and each entry of its clusters' "list" a cluster's name and corridor.
## resolve() puts one together in the shape InstallationWriter reads: its spine of rooms, its wings (the clusters, each
## with its rooms), and "roles", each room type it uses as this setting has it. Old data still loads: a game's defs
## "archetypes" (the shape before settings) are read as they are.
class_name InstallationSettings


## The ids of the settings an installation can be written from (and of any old archetypes), in the order the defs
## give them.
static func ids() -> Array:
	return LM.defs.get("settings", {}).keys() + LM.defs.get("archetypes", {}).keys()


## What a setting is called ("Regional Medical Centre"), or its id if it has no name.
static func name_of(id: String) -> String:
	var s: Dictionary = LM.defs.get("settings", {}).get(id, LM.defs.get("archetypes", {}).get(id, {}))
	return str(s.get("name", id))


## A setting put together (see the top of this file), or {} if there is none of that id.
static func resolve(id: String) -> Dictionary:
	if LM.defs.get("archetypes", {}).has(id):
		return LM.defs["archetypes"][id]
	var s: Dictionary = LM.defs.get("settings", {}).get(id, {})
	if s.is_empty():
		return {}
	var out: Dictionary = s.duplicate(true)
	out.erase("rooms")
	out.erase("clusters")
	var used: Array = []
	out["spine"] = s.get("spine", []).map(func(st: Dictionary) -> Dictionary:
		used.append_array(st["room"] if st.get("room") is Array else [st.get("room", "")])
		return {"role": st.get("room", "")})
	var cl: Dictionary = s.get("clusters", {})
	var wings := {"count": cl.get("count", [2, 3]), "always": cl.get("always", []), "list": {}}
	for cid in cl.get("list", {}):
		var w: Dictionary = LM.defs.get("clusters", {}).get(cid, {}).duplicate(true)
		w.merge(cl["list"][cid] if cl["list"][cid] is Dictionary else {}, true)
		w["rooms"] = w.get("rooms", []).map(func(e: Variant) -> Variant:
			used.append(str(e.get("room", "")) if e is Dictionary else str(e))
			return InstallationSettings._as_role(e))
		wings["list"][cid] = w
	out["wings"] = wings
	var roles := {}
	for rid in used:
		var rt: Dictionary = LM.defs.get("room_types", {}).get(rid, {}).duplicate(true)
		rt.merge(s.get("rooms", {}).get(rid, {}), true)
		roles[rid] = rt
	out["roles"] = roles
	return out


## A cluster's room as the writer reads it: its id, or {"role": id, ...} with the rest of what the entry says.
static func _as_role(e: Variant) -> Variant:
	if not e is Dictionary:
		return e
	var d: Dictionary = (e as Dictionary).duplicate(true)
	d["role"] = d.get("room", "")
	d.erase("room")
	return d
