extends TrapKind
## The crusher: a steel block the size of the cell hung under the ceiling. Every "period" (4 s) it shudders and sheds
## dust for a second (the warning), drops in 0.15 s, stays down 0.4 s and winds back up over a second. Everything in
## the cell when it lands, at any height (a flyer under it too), takes "damage" (60, physical: crushed).
class_name TrapCrusher

const WARN := 1.0
const FALL := 0.15
const DOWN := 0.4
const RISE := 1.0
const GAP := 0.3                  # how far in from the cell's edge it reaches

var _block: MeshInstance3D
var _dust: CPUParticles3D
var _top := 3.0                   # the block's bottom when it is up
var _struck := false
var _warned := false


func build(_kit_id: String) -> void:
	var lv := trap.level
	_top = lv.H - 0.9
	_block = MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(lv.C - GAP * 2, 0.7, lv.C - GAP * 2)
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.22, 0.22, 0.24)
	m.metallic = 0.8
	m.roughness = 0.45
	bm.material = m
	_block.mesh = bm
	trap.add_child(_block)
	var edge := MeshInstance3D.new()             # a band of warning light round its foot, so it reads from below
	var em := BoxMesh.new()
	em.size = Vector3(lv.C - GAP * 2 + 0.04, 0.08, lv.C - GAP * 2 + 0.04)
	em.material = Fx.glow_mat(Color(1.0, 0.45, 0.05), 2.5)
	edge.mesh = em
	edge.position.y = -0.31
	_block.add_child(edge)
	_dust = CPUParticles3D.new()
	_dust.amount = 30
	_dust.lifetime = 1.2
	_dust.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	_dust.emission_box_extents = Vector3(lv.C / 2 - GAP, 0.05, lv.C / 2 - GAP)
	_dust.gravity = Vector3(0, -3.0, 0)
	var q := QuadMesh.new()
	q.size = Vector2(0.06, 0.06)
	q.material = Fx.glow_mat(Color(0.7, 0.65, 0.55), 0.2)
	_dust.mesh = q
	_dust.emitting = false
	_dust.position.y = _top - 0.05
	trap.add_child(_dust)
	trap.light.light_color = Color(1.0, 0.45, 0.05)
	trap.light.position.y = 1.0
	_pose()


func off() -> void:
	on = false
	_dust.emitting = false
	_block.position = Vector3(0, _top + 0.35, 0)          # switched off, it is left wound up


## Where in its cycle it is: from 0 it winds up, waits, warns, falls and lands at period - DOWN.
func _phase() -> float:
	return fmod(trap.t, _period())


## A cycle has room for the warning, the drop and the wind back up: never under 3 s.
func _period() -> float:
	return maxf(3.0, float(e.get("period", 4.0)))


func _pose() -> void:
	var period := _period()
	var ph := _phase()
	var y := _top
	if ph < RISE:
		y = lerpf(0.36, _top, ph / RISE)
	elif ph >= period - DOWN:
		y = 0.36
	elif ph >= period - DOWN - FALL:
		y = lerpf(_top, 0.36, (ph - (period - DOWN - FALL)) / FALL)
	var shake := 0.0
	if ph >= period - DOWN - FALL - WARN and ph < period - DOWN - FALL:
		shake = 0.03 * sin(trap.t * 70.0)
	_block.position = Vector3(shake, y + 0.35, 0)


func tick(_dt: float, pl: Node3D, who: Array) -> void:
	var period := _period()
	var ph := _phase()
	_pose()
	var warning := ph >= period - DOWN - FALL - WARN and ph < period - DOWN - FALL
	_dust.emitting = warning
	trap.light.light_energy = 1.5 if warning else 0.2
	on = ph >= period - DOWN - FALL
	if warning and not _warned:
		_warned = true
		if trap.near(pl):
			LM.sound("servo", trap.global_position, -6.0)
	if ph >= period - DOWN and not _struck:
		_struck = true
		LM.sound("crash", trap.global_position)
		Fx.sparks(trap.level, trap.global_position + Vector3(0, 0.2, 0), Color(0.75, 0.7, 0.6), 30, 5.0, 0.6, 0.08)
		for v in who:
			if trap.here(v.global_position - trap.global_position, -GAP):
				v.hurt(e.get("damage", 60.0), {"type": "crush", "from": trap.global_position})
	elif ph < period - DOWN - FALL - WARN:
		_struck = false
		_warned = false


func danger(_who: Node3D, rel: Vector3, _sp: Vector2, room: float, lead: float) -> bool:
	var period := _period()
	var ph := _phase()
	var coming := ph >= period - DOWN - FALL - lead or ph < RISE * 0.5
	return coming and trap.here(rel, room - GAP)
