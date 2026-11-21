extends Node
## CommandLine - the switches for looking at things that act while the game runs, given on the command line (the
## rest are set once, in Main._debug_switches): --lights, --god, --at, --alert, --up, --yaw, --pitch and --nohud on
## the second frame, --trace (what each actor is doing, as it changes), --shot (a screenshot, then quit) and --frames
## (run that many frames, then quit). Main adds it only when there are switches and it is not the self-test.
class_name CommandLine

var main: Node                   # Main: its level, player and HUD
var args: Dictionary
var _frame := 0


func _init(m: Node, a: Dictionary) -> void:
	main = m
	args = a
	name = "CommandLine"


func _process(_dt: float) -> void:
	_frame += 1
	if _frame == 2:
		if args.has("lights"):                      # --lights: how many lights the level has, and the most the view could hold at once
			var ls: Array = []
			for n in main.level.get_children():
				if n is OmniLight3D:
					ls.append(n.global_position)
			var worst := 0
			for i in range(0, ls.size(), 7):
				var c := 0
				for q in ls:
					if q.distance_to(ls[i]) < 48.0:
						c += 1
				worst = maxi(worst, c)
			print("LIGHTS  %d omni lights in the level; up to %d within 48 m of one place (Forward+ holds %d in view)" % [ls.size(), worst, ProjectSettings.get_setting("rendering/limits/cluster_builder/max_clustered_elements")])
		if args.has("god"):
			main.player.max_hp = 99999
			main.player.hp = 99999
		if args.has("at"):
			var p: PackedStringArray = args["at"].split(",")
			main.player.position = main.level.center(Vector2i(int(p[0]), int(p[1])), 0.05) + Vector3(float(p[2]) if p.size() > 2 else 0.0, 0, float(p[3]) if p.size() > 3 else 0.0)
		if args.has("alert"):                       # --alert: everything knows where the player is from the start
			for a in main.level.actors:
				a.alert.call_deferred()
		if args.has("up"):                          # --up=1: start on that storey (for looking at balconies)
			main.player.position.y += float(args["up"]) * main.level.H
		if args.has("yaw"):
			main.player.rotation.y = deg_to_rad(float(args["yaw"]))
		if args.has("pitch"):
			main.player.pitch = deg_to_rad(float(args["pitch"]))
		if args.has("nohud"):
			main.hud.visible = false
	if args.has("trace") and args["trace"] != "events" and main.level:      # --trace: print whenever an actor changes what it is doing
		for a in main.level.actors:
			if is_instance_valid(a):
				var st: String = a.trace_text()
				if a.get_meta("trace", "") != st:
					a.set_meta("trace", st)
					print("[%.2fs] %s#%d %s at (%.1f %.1f %.1f) player hp=%d" % [Game.stats["time"], a.d.get("name", "?"), a.get_index(), st, a.position.x, a.position.y, a.position.z, main.player.hp])
				if args.get("trace", "") == a.d.get("name", "") and _frame % 300 == 0:      # --trace=Name: where that one is, every so often
					print("[%.1fs] %s at (%.1f %.1f %.1f)" % [Game.stats["time"], a.d.get("name", "?"), a.position.x, a.position.y, a.position.z])
	if args.has("shot") and _frame == int(args.get("frames", "40")):
		var img := get_viewport().get_texture().get_image()
		img.save_png(args["shot"])
		print("shot saved ", args["shot"])
		get_tree().quit()
	elif not args.has("shot") and args.has("frames") and _frame >= int(args["frames"]):
		print("ran ", _frame, " frames; actors=", main.level.actors.size(), " hp=", main.player.hp)
		get_tree().quit()
