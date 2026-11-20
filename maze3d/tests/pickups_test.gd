extends SelfTestPart
## Pickups: every one is taken by walking over it, and all treasure is counted.


func run() -> void:
	for k in pl.ammo:
		pl.ammo[k] = 0
	var got := 0
	for i in 3:
		for n in level.get_children():
			if is_instance_valid(n) and n is Pickup and not n.is_queued_for_deletion():
				pl.hp = 50
				pl.armor = 0
				for k in pl.ammo:
					pl.ammo[k] = 0
				pl.global_position = Vector3(n.global_position.x, level.floor_y(n.global_position) + 0.05, n.global_position.z)
				await frames(8)
				got += 1
	pl.hp = pl.max_hp
	var left := 0
	for n in level.get_children():
		if is_instance_valid(n) and n is Pickup and not n.is_queued_for_deletion():
			left += 1
			print("INFO  not taken: ", n.d.get("id"), " at ", level.cell_of(n.global_position), " ", n.global_position)
	say(left == 0, "pickups are taken (%d visits, %d left)" % [got, left])
	say(Game.stats["treasure"] == Game.stats["treasure_total"], "all treasure counted (%d of %d, %d cr)" % [Game.stats["treasure"], Game.stats["treasure_total"], Game.credits])
