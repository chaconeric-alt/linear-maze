extends SelfTestPart
## Every weapon the game has, fired at every actor (on an off-duty floor, the off-duty checks first; on the test
## floor, that it has everything). Each actor is let out of its station or knocked off its wall, and fought from a spot
## with a clear line to it. Known to be flaky: a fleeing or tough monster can outlast the 900-frame limit, and there is
## sometimes no spot to stand in a tight corner.


func run() -> void:
	for wid in LM.defs.get("weapons", {}):
		pl.give_weapon(wid)
	for k in pl.ammo:
		pl.ammo[k] = 9999
	var wi := 0
	var took := 0.0
	if level.data.get("off_duty", false):
		await runner.part("off_duty").run()
	if level.data.get("covers_all", false):
		await runner.part("covers_all").run()
	for a in level.actors.duplicate():
		if is_instance_valid(a) and a.dead and not a.off_duty:
			print("INFO  %s was already dead when its turn came (killed during an earlier fight)" % a.d.get("name", "?"))
		if not is_instance_valid(a) or a.dead or a.off_duty:
			continue
		pl.equip(wi % pl.weapons.size())
		wi += 1
		var nm: String = a.d.get("name", "?")
		if a.dock != null:                           # switch it on and let it out of its station
			var was_calm: bool = Game.calm
			a.dock.release()
			for _i in 110:
				await get_tree().physics_frame
			Game.calm = was_calm
		if a.surf != 0:                              # bring it down off the wall to be fought
			a.knock_off()
			for _i in 50:
				await get_tree().physics_frame
		if not is_instance_valid(a) or a.dead:
			continue
		if not stand_near(a.eye()) and not stand_near(a.eye(), 5.0, true):      # in a tight corner: closer, or from a doorway
			say(false, "no place to stand to fight %s at %s (%s)" % [nm, level.cell_of(a.global_position), a.global_position])
			continue
		var hp0 := pl.hp
		var t := 0
		while is_instance_valid(a) and not a.dead and t < 900:
			var aim: Vector3 = a.global_position + Vector3(0, a.d.get("center", a.d.get("height", 1.6) / 2.0), 0)
			look_at(aim)
			if pl.ready_to_fire():
				pl.fire()
			if t % 60 == 59 and not level.los(pl.cam.global_position, aim):
				stand_near(a.eye())
			if OS.get_cmdline_user_args().has("--verbose") and t % 150 == 149:
				var q := PhysicsRayQueryParameters3D.create(pl.cam.global_position, pl.cam.global_position - pl.cam.global_transform.basis.z * 60.0, 5)
				q.exclude = [pl.get_rid()]
				var hit := level.get_world_3d().direct_space_state.intersect_ray(q)
				print("INFO    ", nm, " hp ", a.hp, " dist ", snappedf(a.global_position.distance_to(pl.global_position), 0.1), " ray hits ", hit.get("collider"), " los ", level.los(pl.cam.global_position, aim), " pl ", pl.global_position, " a ", a.global_position, " layer ", a.collision_layer, " cs ", a.get_child(0).global_position, " ", a.get_child(0).shape.radius, "/", a.get_child(0).shape.height, " dis ", a.get_child(0).disabled, " srv ", PhysicsServer3D.body_get_state(a.get_rid(), PhysicsServer3D.BODY_STATE_TRANSFORM).origin, " space ", PhysicsServer3D.body_get_space(a.get_rid()) == level.get_world_3d().space, " mode ", PhysicsServer3D.body_get_mode(a.get_rid()), " lay ", PhysicsServer3D.body_get_collision_layer(a.get_rid()), " awake ", a.awake, " inside ", a.is_inside_tree(), " eng ", ProjectSettings.get_setting("physics/3d/physics_engine"))
			await get_tree().physics_frame
			t += 1
		took += hp0 - pl.hp
		say(not is_instance_valid(a) or a.dead, "%s dies to the %s (%d frames, it dealt %.0f)" % [nm, pl.weapon().get("name", "?"), t, hp0 - pl.hp])
	if not level.data.get("off_duty", false):
		say(took > 0.0, "actors fight back (%.0f damage taken in all)" % took)
	await frames(30)
