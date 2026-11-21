# maze3d: technical reference

Engine 0.1 · November 2026 · Godot 4.4+ (GDScript), built and tested on 4.7.2. One section per subsystem. What changed and when is in `CHANGELOG.md`; how to work on the code (invariants, budgets, tests) is in `CLAUDE.md`.

1. Layout and boot · 2. Kits · 3. Game data · 4. Levels · 5. The engine · 6. Generators · 7. The game's levels · 8. Tools · 9. Testing · 10. Recipes · 11. Known limits

## 1. Layout and boot

```
project.godot        maze3d/game in Project Settings names the game to boot
engine/              no game content. Autoloads: lm.gd (LM, the registry), game.gd (Game, run state), profile.gd (Profile, the bunker)
  main.gd            boots the game, the title screen, starts levels, reads the command line into Debug
  effects.gd         EffectRegistry: effect type -> handler (the one scripting language)
  interaction.gd     Interaction: the rules of panels; option_gates.gd (cost, hack, risk); prop_uses.gd (what a prop's use does)
  level.gd           Level, a thin node that owns level/: level_data, builder (collision, nav, fluid, environment),
                     lights, spawner, signs, triggers, level_effects, lighting_debug
  actor/             Actor (actor.gd) on ActorCore (actor_core.gd), and its components
  player.gd          Player, and player/: controls, movement, camera_rig, weapons
  door.gd prop.gd station.gd pickup.gd trap.gd pit.gd lift.gd target.gd rebuilder.gd projectile.gd puddle.gd fx.gd
  hud.gd (and hud/: style, crosshair, map_view, screens) identify.gd home.gd (and home/decorating.gd)
  debug.gd schema.gd shaders/
kits/<kit>/          kit.json, generated.json, materials.json, models/*.glb
actors/              rigged monsters (*.glb); actors/source/ what came from elsewhere
games/<game>/        game.json, defs/*.json, levels/*.json (and a level's own test, <id>_test.gd)
generators/          <name>.gd; rooms.gd with its stages in generators/rooms/
tests/               the self-test: selftest.gd (runner), part.gd, one <feature>_test.gd per feature
tools/               blender/ (model scripts), levels/ (level scripts, levelkit.py), inspect_model.py, gen_check.gd
```

At start `LM.boot(game)` reads `games/<game>/game.json`, loads the kits it lists, merges every defs file into `LM.defs[kind][id]`, reads the levels, instantiates the generators and checks the defs and level files against the schema (section 3.7). `main.gd` then builds a `Level` from a level dictionary and puts a `Player` in it.

Units are metres. Godot's axes: Y up, and on the map **north is −Z** (row 0 of a map is the north edge), east is +X.

Physics layers: 1 world (walls, doors, props), 2 player, 3 actors, 4 pickups; glass has a layer of its own (`Level.GLASS`).

## 2. Kits

A kit is a look for a kind of place. `kits/<id>/` holds:

- **`kit.json`** (written by hand): `name`, `cell` (cell width, 4), `height` (storey height, 4), `grime` (scales the wear on every surface), `styles`, and any `tiles` or `models` made by hand. `"uses": ["hightech"]` borrows another kit's tiles, models and materials, so a new kit can start as a few new walls.
- **`generated.json`** (written by `tools/blender/build_all.py`): `tiles` and `models` for everything the scripts make. `kit.json` is read second and wins, so a hand-made replacement is an entry in `kit.json` with the same id.
- **`materials.json`**: material name → look.
- **`models/*.glb`**.

### 2.1 Tiles

```json
"tiles": { "wall_pipes": { "model": "models/wall_pipes.glb", "kind": "wall",
                           "light": { "color": [1,0.6,0.2], "energy": 1.5, "range": 8, "at": [0, 2, 0.6] } } }
```

`kind` is `floor`, `wall` or `ceiling`. A tile is **one mesh object** (several materials are fine); tiles are drawn in batches with MultiMesh (6 × 6 cells to a batch). `light` puts an omni light at `at` (tile space, Godot axes) wherever the tile is used.

Sizes, in Blender terms (Z up, metres):

| Kind | Occupies | Notes |
|---|---|---|
| floor | x, y in [−2, 2]; top surface at z = 0 | Detail may go below 0 (grates, trenches). Keep what you walk on within 2–3 cm of 0: collision is a flat plane. |
| ceiling | x, y in [−2, 2]; underside at z = 0 | Detail goes up from 0 (ducts, trusses) and may hang down (cables). The engine lifts it to the room's height. |
| wall | x in [−2, 2], z in [0, 4]; its face on the plane y = 0, **looking at −Y** | Thickness goes behind the face (+Y), up to 0.3. Relief may come up to 0.15 into the room. |

The ceiling of a room with another room over it is that room's own ceiling tiles, squashed to fit the 0.8 m under the slab above; the underside of a balcony gets the same.

### 2.2 Styles

A style says which tiles a room is built from. Lists are `[tile, weight]` pairs; weights may be fractions.

```json
"styles": { "lab": {
  "floor":   [["floor_glow", 2], ["floor_plate_b", 4]],
  "wall":    [["wall_hex", 3], ["wall_screen", 2], ["wall_light", 1]],
  "wall_upper": [["wall_plain_a", 1]],                  // optional: second storey and above
  "wall_plain": "wall_plain_a",                         // optional: one tile, behind signs and hung things
  "ceiling": [["ceil_plain", 4], ["ceil_ducts", 1]],
  "lights":  { "tile": "ceil_light", "every": 2, "flicker": 0.15, "dead": 0.1, "dead_tile": "ceil_plain",
               "energy": 1.0, "shadows": true } } }
```

`lights` puts the light tile on every `every`th cell of the ceiling. `flicker` is the share of lights that are failing; `dead` the share that are out (and get `dead_tile`); `shadows: false` turns their shadows off. **Upstairs walls**: shelving, lockers, cupboards and vending walls belong where someone can reach them, so a style's `wall_upper` list should give them a small weight (0.4 against 3 to 5 for plain walls): rare, not never. A wall face with a sign or a wall-mounted prop on it gets the style's `wall_plain` tile (or, without one, its commonest wall tile), so nothing hangs over pipes, screens or shelves.

### 2.3 Models (doors, props, items, weapons)

```json
"models": {
  "door_split": { "model": "models/door_split.glb", "type": "door", "time": 0.45, "sound": "door_slide",
                  "parts": { "leaf_l": { "move": [-1.34, 0, 0] }, "leaf_r": { "move": [1.34, 0, 0] } } },
  "cache":      { "model": "models/cache.glb", "type": "prop", "solid": [1.3, 0.9, 0.8], "time": 0.5,
                  "parts": { "lid": { "rot_axis": [1, 0, 0], "rot_deg": -105 } } },
  "reactor":    { "model": "models/reactor.glb", "type": "prop", "solid": [2.6, 4, 2.6],
                  "spin": { "spin0": 50, "spin1": -80 }, "light": { "color": [...], "energy": 3, "range": 9, "at": [0, 2, 0], "pulse": 0.35 } },
  "terminal_wall": { "model": "...", "type": "prop", "mount": "wall", "solid": [1.3, 2.4, 0.6],
                     "screen": { "at": [0, 1.8, 0.35], "size": [0.9, 0.6], "tilt": -12 } },
  "weapon_handgun": { "model": "...", "type": "weapon", "muzzle": [0, 0.035, 0.36] }
}
```

All vectors here are in Godot axes (Y up). The build script converts from Blender's.

- **`parts`**: moving pieces. Each key is the name of an **object inside the .glb**; `move` slides it, `rot_axis` + `rot_deg` turn it about its own origin, `delay` (0–1) staggers it. A door plays them 0 → 1 over `time` seconds to open; a cache plays them when opened. A new kind of door is a model whose leaves are separate objects, plus these numbers.
- **`spin`**: object name → degrees per second, turned about its own Y axis for ever.
- **`solid`**: `[width, height, depth]` of a collision box. Props at least 1.4 wide also block the cell for path-finding (a placement's `blocks` overrides).
- **`solids`**: several boxes, `[x, y, z, width, height, depth]` each, for things you walk through or under (an arch's two posts).
- **`walk`** and **`opening`**: makes the model a **scanner arch** (section 4.9).
- **`mount: "wall"`**: the model is built like a wall tile (face on y = 0, looking at −Y) and the engine hangs it on a wall of its cell.
- **`screen`**: where a placement's `screen` text is drawn.
- **`light`**, with `pulse` for a slow throb.
- **`slots`**: `[[x, y, z], ..]`, places in the model's own space where held things sit (shelves, cases, racks).
- A station's `shut_box`, `stand` and `shutter` part: section 2.6.

Doors fill a whole cell cross-section: 4 wide, 4 high, the opening centred. The frame is one object (any name); every moving piece is its own object. A material called **`lock`** on a door (or a key card) is recoloured by the engine: the lock's colour while locked, cyan when open.

### 2.4 Materials

Models carry material **names** only. `materials.json` gives each name a look:

```json
"hull":      { "color": [0.74,0.74,0.70], "metal": 0.15, "rough": 0.45, "shader": "worn", "grime": 0.55 },
"glow_cyan": { "emit": [0.2,0.9,1.0], "energy": 4, "shader": "glow" },
"glass":     { "color": [0.45,0.85,0.9], "alpha": 0.22, "shader": "glass" }
```

`shader` is one of `worn` (hard surfaces; grime, streaks and scuffs from position, so nothing repeats and no UVs are needed), `screen` (a live display), `glow`, `glass`, `flesh`, `ad` (the Agency's displays), or absent for a plain material. A name the kit doesn't list keeps whatever material the model file has, textures included, so a fully textured hand-made model works too. Glow materials take `pulse` (breathing, 0..1) and `flicker` (failing, 0..1): flames and furnace mouths use both.

The `worn` shader works out where each pixel is in the world from the camera's position and the view-space position, not from the model matrix, so its grime stays put on batched tiles. The global shader parameter `lm_grime` (1) scales grime everywhere.

The high-tech kit's names: `hull`, `hull_dark`, `trim`, `floor`, `accent` (orange), `accent2` (teal), `hazard`, `rust`, `rubber`, `cable`, `copper`, `gold`, `chrome`, `glass`, `screen`, `screen_dead`, `glow_cyan/pink/amber/red/green/white/violet`, `lock`, and for creatures `flesh`, `flesh_pale`, `chitin`, `chitin_red`, `bone`, `eye`, `eye_red`, `slime`.

**Borrowing.** `"uses": ["hightech"]` in `kit.json` brings in another kit's tiles, models and styles. Borrowed models keep their own kit's materials, so a level whose kit is `agency` can have high-tech rooms and Agency rooms side by side, each looking as its kit meant. A kit's models use that kit's materials, so the same modelling code comes out differently in two kits that give the same names their own looks.

**A kit for somewhere that isn't high-tech** (a crypt, a cave, a frontier town) is a new folder with its own `materials.json` (stone, wood, moss; add a shader to `engine/shaders/` and to `SHADERS` in `lm.gd` if the material itself is new), its own tiles at the sizes above, and its own styles. Nothing in the engine assumes metal panels; `Level` only asks the kit for tiles by style.

### 2.5 The kits there are

Kit ids carry a tag in their model ids (`wk`, `bk`, `cr`, `ex`, `mp`, `hs`, `bb`, `dr`, `du`, `hm`, `an`, `rb`, `lt`) because kits borrow from each other and ids must not collide. The README lists what each kit holds; the scripts that build them are in section 8.2.

- **hightech** (Kaveros) and **agency** (porcelain, onyx, rose gold, pink neon; styles `showroom`, `white_hall`, `focus`; furniture `ag_desk`, `ag_pedestal`, `ag_kiosk`, `ag_sofa`, `ag_pod`, `ag_planter`).
- **works**, **bunker**, **crypt**; **executive**, **megaplex**, **hospital**, **basilica**.
- **drowned** (Thalassa Deep Array, tag `dr`) and **dust** (Helion Dust Station, tag `du`): built with the Kaveros kit's own grammar (`tiles.plates()` packing every surface with plates, vents, light strips, indicator boxes and handles), both ribbing their walls with lit moldings: a rib at the left of every wall tile, a line of light under the cornice, and on the plainer tiles a second line at hand height.

  | | `drowned` | `dust` |
  |---|---|---|
  | Colours | sea-green paint over black hull, tarnished bronze, verdigris, signal yellow; pale green light | sun-bleached ivory ceramic over umber frames, sandblasted steel, faded red oxide; violet light |
  | Ribs and trim | round bulkhead ribs with collars and lamps let into them; a pipe rail along the skirting | slanted fins with slits of light; stepped skirting and cornice |
  | Decay | wet: algae, slime trails, salt and barnacles, rusted plates, standing water, salt points dripping from the ceiling | dry: drifted sand, fallen tiles leaning where they landed, bleached and missing panels, cracks, hanging wiring and ceiling panels |
  | Door | `door_dr_hatch`: two bulkhead leaves with portholes | `door_du_shutter`: a shutter in three segments that folds up |

  Each has 13 walls (`rib`, `rib2`, `plate`, `plate2`, `gauges`, `screens`, `bigscreen`, `bigscreen2`, `tank`, `rack`, `works`, `breach`, `light`), 6 floors, 5 ceilings and 7 pieces of furniture (`_console`, a work station that goes with a chair; `_bench`; `_rack`; `_cart`; `_arm`, a service arm for robot rooms; and `dr_tank` / `du_reel`, `dr_pump` / `du_scope`). Styles: a hall, a lab, a data hall (`dr_servers`, `du_archive`), a robot bay and a ruin. `glow_a` is the kit's light; `rot_a`, `rot_b`, `rot_c` its decay. A third installation in this family is `make(tag, wet)` with a new table of materials.
- **robots**, **loot**: used by every kit (section 2.6).
- **home** (tag `hm`): cozy brass steampunk that keeps a high-tech sense. Styles `hm_hall`, `hm_living`, `hm_bedroom`, `hm_den`, `hm_comms`, `hm_armory`, `hm_robot` (walnut wainscot, a brass dado rail with a line of lamplight, plaster, a copper pipe under the cornice), `hm_bath` (white tile, teal band, chrome) and `hm_security` (grey riveted armour plate, green monitors). `door_hm_gear` is two walnut leaves under a lintel of six gears that turn as it opens (door `parts` with `rot_axis`); `door_hm_vault` is half a metre of steel that rolls aside in 2.4 s. Room furniture: `hm_bed`, `hm_dresser`, `hm_toilet`, `hm_shower`, `hm_sink`, `hm_medic` (wall), `hm_bookcase`, `hm_desk`, `hm_trophy` (9 `slots`), `hm_sofa`, `hm_armchair`, `hm_table`, `hm_video` (wall), `hm_radio`, `hm_rack` (6 `slots`), `hm_armor`, `hm_workbench`, `hm_cradle`, `hm_console`, `hm_lift`. Catalogue furnishings: `hm_plant`, `hm_painting` (wall), `hm_rug`, `hm_lamp` (lights), `hm_clock` (wall), `hm_globe`, `hm_gramophone`, `hm_aquarium`. Wall-mounted models have their height built in.
- **anomalous** (tag `an`): the Anomalous Structure's offices, labs and core, and everything that dungeon needs that no other kit had (section 7).
- **omni**: no models; borrows every kit so one level can use them all.

### 2.6 Stations and containers (`kits/robots`, `kits/loot`)

Robots that are not out on patrol wait in a **station**: a bay with a lit ceiling and its own floor plate, fitted out to watch, mend and charge whatever stands in it. One model for each kind of robot:

| Robot | Station | Shape |
|---|---|---|
| Custodian (maintenance) | `rb_station_custodian` | a 3.5 m cube |
| Dancer (spinning) | `rb_station_dancer` | a cylinder; the front third of the drum turns round behind the rest |
| Knife Fighter | `rb_station_knife` | a pillar it rests over, a mast with lamp and monitor, a cage that sinks into the floor |
| Plodder (big sentry) | `rb_station_plodder` | tall (3.95 m) and heavy: ribs, clamps, hazard stripes |
| Monoid | `rb_station_monoid` | a narrow upright frame |
| Deadbot | `rb_station_deadbot` | a rusted rack |
| Eggbot | `rb_station_eggbot` | a low dock |
| Desktop Defender | `rb_station_defender` | a waist-high kennel with a flap |

A station model is an ordinary prop built SHUT, with a part named `shutter` in `parts` (how it moves to open), `solids` for its walls, `"shut_box": [x, y, z, w, h, d]` (what the shutter stops while it is down: sight, shots, the player), `"stand"` (where the robot stands, from the middle of the cell) and a `light`. `engine/station.gd` (`Station extends Prop`). Placing one: section 4.6.

Treasure does not float about the rooms; it is kept in a **container** standing against a wall, with the things in it to be taken by walking up:

| Kind | Model | Holds | Places |
|---|---|---|---|
| `shelf` | `lt_shelf_<tag>` | cookie boxes, power cells, circuit boards | 6 |
| `trophy` | `lt_trophy_<tag>` | the Employee of the Century | 1 |
| `box` | `lt_box_<tag>` (the Basilica: `lt_reliquary`) | credit chips, crystals | 2 |
| `cells` | `lt_charge_rack` | power cells on charge, in robot rooms | 6 |

`<tag>` is the place: `ht ag wk bk cr ex mp hs bb`, each in that kit's own materials.

### 2.7 Layers in the same place (z-fighting)

Two faces of different materials in the same plane, facing the same way and overlapping, flicker between each other as the view moves. `mz.py` separates them when a model is built (`Mesh._unfight`): a model is laid on part by part, detail over base, so the later part's face is moved 4 mm out along its normal for each layer beneath it. It needs `shapely` (`pip install shapely`); without it the step is skipped. `tools/blender/check_layers.py 'kits/*/models/*.glb'` lists what is left. For hand-made and outside models: never leave two coloured faces coplanar; give a decal, panel, plinth or inlay at least 3 mm of its own. The engine's own slabs under balconies and ramps are 3 cm smaller than the floor tile on them for the same reason.

## 3. Game data

### 3.1 `game.json`

`id`, `title`, `tagline`, `version`, `theme.accent`, `kits`, `defs` (files), `levels` (files), `generators` (names), `generator_params`, `generator_themes`, `start`, `menu` (levels on the title screen), `player`, `words` (`death_title`, `death_text`, `end_title`), `easy`, `hacking`.

- `player`: `hp`, `speed`, `jump`, `fov`, `zoom_fov`, `zoom_speed`, `weapons`, `ammo`, `lamp`, `dash_cooldown`, `sensitivity`, `level`.
- `easy`: `{"deal": 3, "take": 3}`, used with easy mode on (section 5.9).
- `hacking`: `base` (0.10) and `per_level` (0.05): a hack's chance is `base` + `per_level` × `player.level`, less the job's `hard`.

### 3.2 Weapons, ammunition, projectiles (`defs`: `weapons`, `ammo`, `projectiles`)

| Weapon field | Meaning |
|---|---|
| `name`, `model`, `kit`, `hold`, `scale` | The kit model held in view, where (camera space), how big. |
| `ammo`, `per_shot`, `pickup_ammo` | An `ammo` id, or `null` for unlimited. |
| `damage`, `pellets`, `spread` (degrees), `rate` (shots/s), `auto` | |
| `range`, `falloff` | Hit-scan reach; damage lost at full range (0–1). |
| `projectile` | Fires this instead of a hit-scan ray. |
| `recoil`, `kick`, `sound`, `color`, `kind` | Feel; `kind` is the damage type actors' `takes` reads. |

Ammunition: `name`, `max`. Projectile: `speed`, `radius`, `color`, `light`, `gravity`, `kind`, `blast: { radius, damage }`, and `puddle` (`radius`, `dps`, `life`, `color`, `kind`, `max`): where it lands it leaves a glowing pool (`engine/puddle.gd`) that hurts the player while they stand in it, then fades; at most `max` at once, the oldest drying up first.

### 3.3 Actors (`defs`: `actors`)

| Field | Meaning |
|---|---|
| `name`, `model` (path from the project root), `kit`, `scale` | |
| `hp`, `armor` (0–1), `takes: { blast: 1.6 }`, `mass`, `gib` | `gib: false`: a blast that kills it throws no burst of sparks (machines that should just stop). |
| `speed`, `accel`, `radius`, `height`, `center`, `eye` | The body is a capsule; `center` is its middle's height (default half the height). |
| `fly`, `mount: "ceiling"` | Ignores gravity; hangs from the ceiling. |
| `still`, `turn` | `still: true`: it never walks (turrets, emitters); `turn`: how fast a thing that cannot walk turns to face you (4). |
| `sight`, `hearing`, `wake_sight` | It notices you in sight (or behind it, close), when shot, or when it hears a shot. Noticing wakes friends within 10 m. Asleep it sees `wake_sight` (`sight` × 0.75). Noise and death cries do not carry through floors. |
| `behavior`, `keep` | `chaser`, `skirmisher` (holds `keep: [min, max]` and strafes), `turret`. |
| `attacks` | Tried in order. `{ type: "melee", damage, range, windup, recover, cooldown, knock }` or `{ type: "ranged", projectile, damage, range, min_range, burst, burst_gap, spread, lead, muzzle, windup, recover, cooldown }`; also `pounce` and `grapple` (below). An attack may name its own `clip` (`"clip": "butt"`; otherwise `attack` is played), and carry `"say": [...]` and `"say_chance"`: what it shouts as it winds up. |
| `flee_below`, `flee_text` | Runs when its health falls under this fraction. |
| `barks`, `bark_color` | Words that float over it. `sounds.bark` is played with every bark. |
| `drops: [{ item, chance }]`, `explode: { radius, damage }` | |
| `sounds: { alert, hurt, die, bark }`, `blood` (spark colour), `clips`, `walk_rate` | `clips` renames animations: `{ "walk": "scuttle" }`. |
| `talk` | What it says off duty (section 4.11). |

**The model** is any rigged glTF with an AnimationPlayer and clips named `idle`, `walk`, `attack`, `hurt`, `die` (Blender NLA tracks; name the looping ones `idle-loop`, `walk-loop` and Godot imports them as loops called `idle` and `walk`). It **faces Blender's front view (−Y)**, stands on z = 0, origin between its feet (for a ceiling mount: origin on the ceiling, hanging down). `attack` should land its blow at about the attack's `windup` time. `die` ends in the pose the body is left in. Clips beyond the standard five are extra NLA tracks. Idle, walk and lounge clips are looped by the engine whether or not the file says so.

**Models from elsewhere** (Tripo, Meshy, hand-made): any rigged `.glb` in `actors/` works. Def keys that adapt a foreign model: `"own_materials": true` (keep its textures; do not look its material names up in the kit), `"scale"`, `"model_yaw"` (degrees, if it faces the wrong way), `"model_y"` (if its feet are not at 0), `"clips": {"walk": "TheirClipName", ...}` (the engine's names are idle, walk, attack, hurt, die, and optionally pounce, startle, and whatever `lounge` and `dormant_clip` name). How to give such a model clips: section 8.2.

#### Behaviours

Each is an engine feature switched on by its def key, so any model can use them. Each is a component of the actor that is added only when its key is there (section 5.5).

**Lounging** (`lounge`). What it does until something wakes it, in place of standing idle:

```json
"lounge": [{"clip": "lean", "at": "wall"},
           {"clip": "smoke", "at": "wall", "smoke": true, "every": 6},
           {"clip": "sit", "at": "floor", "drop": -0.6}],
"startle_time": 0.6, "startle_text": "I WAS ON BREAK"
```

One entry is picked when the level is built; a level entry can name it (`{"actor": "monoid", "lounge": "sit"}`, or `"lounge": "none"`). `"at": "wall"` backs the actor up against a wall of its cell (`gap` = how far off it), facing the room; `face` on the level entry chooses the wall; `"look": "in"` puts its nose to the wall. `drop` moves the part that can be shot to where the body now is. `smoke` puffs every `every` seconds. `"at": "screen"` sends it to the nearest prop with a screen (or one named in `"props": [...]`) within `reach` metres, to stand `stand` metres in front and watch; with none about it falls back to another entry. `"says": [...]` are things it mutters while lounging when the player is near. When it wakes it plays the clip `startle` for `startle_time` before it does anything: that is the player's free shot.

**Pounce** (an attack of `"type": "pounce"`):

```json
{"type": "pounce", "range": 12, "min_range": 4, "windup": 0.5, "clip_windup": 0.3, "speed": 18,
 "damage": 20, "knock": 9, "recover": 0.35, "recover_miss": 1.0, "cooldown": 5}
```

It gathers itself for `windup` (the tell: the first `clip_windup` seconds of the clip `pounce`, stretched to fit), is then thrown at where the player will be, and cannot steer. The end of the clip is held in the air. A hit does `damage`; a miss leaves it sprawled for `recover_miss`. It works from a wall or the ceiling too.

**Grapple** (an attack of `"type": "grapple"`: `range`, `windup`, `hold`, `damage`, `dps`, `throw`, `throw_damage`, `break`, `reach`, `lift`, `miss_at`): if its arms close on the player at `windup` it holds them `reach` metres in front of it, `lift` off the floor, for `hold` seconds, hurting them `dps` a second, then throws them. The player cannot move but can look and shoot; `break` damage dealt to it during the hold makes it let go and staggers it. `miss_at` is the time in the clip to jump to when it grabs nothing, or when it throws.

**Walls and ceilings** (`climb`):

```json
"climb": {"speed": 7.5, "ceiling": true, "perch": 0.55, "chance": 0.6, "min_dist": 6,
          "drop_at": 1.8, "drop_damage": 5, "off": 0.3}
```

`perch`: how often one starts a level waiting on a wall (head down) or the ceiling; a level entry can say `"perch": "wall" | "ceiling" | "floor"`. Awake on a wall it runs up to the ceiling or down to the floor; on the ceiling it follows the route it would have walked and lets go above the player (`drop_at`, metres), at a door, or where the ceiling changes height. `chance`: how often, hunting on foot and still `min_dist` away, it takes to the nearest wall instead. Shooting one usually knocks it off. With a pounce attack it will jump at the player straight off the wall. The walk clip is used on every surface; `off` is how far from the surface its feet are.

**A head that turns on its own** (`aim`): `"aim": {"yaw_bone": "turret", "pitch_bone": "gun", "speed": 5, "pitch": [-30, 35], "body_turn": 0.25}`. `"muzzle": [x, up, forward]` in `aim` is the barrel's tip in the model's own units at rest: shots leave from there, wherever the turret has swung it (without it they leave from the middle of the head). Once awake, `yaw_bone` is turned about the vertical to face the player whichever way the body is going and `pitch_bone` tips to their height; shots leave along the barrel. The body turns at `body_turn` of its usual rate (0: never). The engine owns those bones: when the monster is set up it takes their rotation out of every clip except the ones played while it is not aiming (the dormant clip, startle, die, and any listed in `"keyed": [..]`), because an exporter that bakes every bone into every clip would otherwise drag the turret back to the clip's pose. A gun's slide (recoil) in the attack clip is kept; the engine puts its own turn back on the aim bones after every animation step (`mixer_applied`). **It fires where the gun points**: no ranged attack starts until the barrel is within `aligned` degrees (6 unless given) of the line to the player's chest; a shot that comes due while it is not is held (the attack clip waits with it), and given up after `hold` seconds (1.5); the shot's direction is kept within `aligned` degrees of the barrel. **A gun that swivels** (`"bore": [x, up, forward]`, the way the barrel points at rest): the `pitch_bone` also turns on its own pivot, so a barrel mounted to one side or toed out is still brought dead on to the player; `"swivel": [-50, 22]` is how far it may turn either side of the turret's straight ahead (degrees, + toward its left) and `"gun_rate": 220` how fast. **Turrets in sections**: `"rate": 75` turns the turret bone at a steady number of degrees a second instead of easing in (`speed`); `"lead_bone": "apex"`, `"lead_speed": 7` (and `"lead_offset"` in degrees if its face is not its front) is a second bone that turns to the player on its own, faster, and must not be a child of the turret bone.

**Powered down** (`dormant_clip`, with `wake_sight`, `hearing`, `startle_time`): it plays the dormant clip until the player comes within `wake_sight` metres in view (from any side) or it hears or feels something, then plays `startle` for `startle_time` before it acts. `sight` is how far it sees once awake.

**A screen for a face** (`screen`): `"screen": {"bone": "body", "at": [0, 0.70, 0.3], "width": 0.21, "height": 0.15, "color": [...], "bg": [...], "idle": ["...", ">:("]}`. A panel of text fixed to a bone of the model, at `at` in the model's own units (x, up, forward). It shows each bark as it is shouted, and one of `idle` while the thing has not noticed anybody; text shrinks to fit.

**Heavy feet** (`footfall`): `{"at": [0.0, 0.5], "sound": "clang", "db": -9, "pitch": 0.45, "shake": 0.22, "reach": 9}`: each time the walk clip passes one of the `at` points (fractions of the clip) the actor sounds, kicks up dust, and shakes the player's view within `reach` metres, harder the nearer.

**Flyers that weave**: `gait` with a long `burst`, no `pause` and a `weave` makes a serpentine approach; `"bob": {"height": 0.22, "rate": 5}` makes it rise and fall as it comes. A flyer lowers itself under a low ceiling.

**Scuttling** (`gait`): `"gait": {"burst": [0.25, 0.7], "pause": [0.05, 0.18], "fast": 1.3, "weave": 0.35, "weave_rate": 9}`. It moves in darts with dead stops between and does not come straight at the player.

**Swimming** (`swim`): `"swim": {"clip": "swim", "speed": 9, "sink": 0.35}`. In fluid it plays that clip instead of walk and idle, moves at `speed`, and rides `sink` metres lower. Anything without `swim` is slowed in fluid.

**Soft bodies** (`jelly`: `amp`, `speed`, `freq`, `glow`, `glow_energy`, `pulse`, `wet`): the model's own textures are moved into `engine/shaders/jelly.gdshader`, which wobbles the surface along its normals, makes it wet and lights it from inside with a glow that breathes. Needs `own_materials`. `amp` is in the model's units (before `scale`).

**Burning to touch** (`touch`: `dps`, `reach`, `kind`): the player is hurt four times a second while within `radius + 0.45 + reach` of it. No animation, no attack.

**Equalizer lights** (`equalizer`: `glow`, `energy`, `idle`, `rate`, `bars`, `lo`, `hi`): for a model with its own textures, whatever is red on it lights up in columns that rise and fall between heights `lo` and `hi` (model units); low and slow while it idles, full and fast while it attacks (`engine/shaders/equalizer.gdshader`).

**Dancing** (`dance`: `reach`, `speed`, `radius`): before it has noticed anybody it circles the spot it started on, or, with another of its kind within `reach`, the two circle the point between them, always opposite each other. Its idle clip is the dance step.

**Trailing tatters** (`trail`: `prefix`, `lean`, `max`, `stiff`, `damp`, `turn`, `flutter`, `second`): every bone whose name starts with `prefix` hangs from its head and is driven by the engine, not by clips. It streams out behind the thing as it moves, swings wide when it turns, and overshoots and settles when it stops. Bones ending in `_b` are lower lengths and lean further and more loosely.

**Dead things fall.** Anything killed off the ground (a flyer, something mid-pounce, something thrown, something over a pit or a pool) keeps half its speed and falls under gravity until it has lain still on a floor for 0.4 s. Only what is bolted to a ceiling (`"mount": "ceiling"`) stays up. A dead thing checks every half second that there is still floor under it; one lying on a lift rides it, and falls if the lift leaves. A dead flyer's model is lifted onto the floor it lands on.

### 3.4 Items (`defs`: `items`)

`name`, `kind` (`treasure` with `value`; `health`, `armor` with `amount`; `ammo` with `ammo`, `amount`; `key` with `color`; `weapon` with `weapon`; `quest` with `text`), `model`, `kit` (the kit its model is in, if not the level's), `scale`, `glow`, `sound`, `effects`, `flag`, `trophy`. Item models are centred on their own middle. A `quest` item says its `text` and sets its `flag`. Items with `"trophy": true` go in the bunker's trophy case when brought home.

### 3.5 Sounds (`defs`: `sounds`)

All synthesised at start-up: `freq`, `to` (glide), `dur`, `wave` (`sine`, `square`, `saw`), `noise` (0–1), `decay`, `gain`, `lowpass` (0–1), `vibrato`.

### 3.6 The bunker (`defs`: `home`)

`games/<game>/defs/home.json` gives each bunker level (by level id) what `engine/home.gd` offers:

```json
"home": { "home": {
  "robot": "custodian",                         // lies broken in the cradle until repaired
  "repair": {"circuit": 3, "fuel_cell": 2},     // what the repair takes, out of the salvage brought home
  "catalogue": [["hm_plant", 40], ["hm_painting", 45], ...],   // [model, price in credits]; names come from the models
  "broadcasts": ["...", "...", "..."],          // what the video radio always has on
  "broadcasts_sometimes": ["...", "..."],       // and one of these as well
  "programmes": ["...", ...],                   // the television by the sofa, one at a time
  "words": {"comms_title": "VIDEO RADIO", ...} } }   // every line the bunker shows (below)
```

`words` holds every text the bunker's panels and its decorating bar show, by key: for each piece of furniture `<what>_kicker` and `<what>_title` (the small line over the title and the title) and, where it has one, `<what>_text`; the ledger's `ledger_order`, `ledger_decorate`, `ledger_retire` and `retire_*`; the catalogue's `catalogue_*`, `buy_short`, `buy_done`; the cradle's `cradle_*` and `repaired_say`; the lift's `lift_*`; the decorating bar's `decor_*`; `list_item` and `list_none` for lists. Texts with `%s` or `%d` are filled in by the engine (a name, a count, a price) in the order the original line had them. A missing key shows as the key itself.

### 3.7 The schema check

`engine/schema.gd` (`Schema`) lists the keys this section and section 4 give for weapons, actors, items and level things. At boot `LM` warns (`Schema: actor 'x': unknown key 'heaing' (did you mean 'hearing'?)`) for each unknown key in the game's defs and level files, and the self-test checks the defs and the level it plays. A key the engine starts reading is added to this document and to `Schema` together; the self-test fails if `Schema` knows a key this document does not mention.

## 4. Levels

A level is a dictionary: a JSON file in `games/<game>/levels/`, or what a generator returns.

```json
{ "id": "deepworks", "name": "...", "kit": "hightech", "style": "corridor", "height": 1,
  "intro": "...", "ambient": [0.22,0.28,0.36], "ambient_energy": 0.55, "exposure": 1.0, "fog": { "color": [...], "density": 0.014 },
  "legend": { "B": { "door": "door_jaw", "lock": "blue", "tag": "blue_door" } },
  "map": ["#####", "#...#", "#####"],
  "rooms": [{ "name": "Reactor Hall", "rect": [23,1,7,9], "style": "machine", "height": 2 }],
  "tags": { "ambush": [[4,7],[5,7]] },
  "things": [{ "at": [15,24], "start": true, "face": "n" }, { "at": [3,20], "actor": "glorexx", "still": true }],
  "objectives": [{ "text": "Find the BLUE card.", "done": "key_blue" }],
  "triggers": [{ "on": { "type": "flag", "name": "got_red" }, "do": [{ "type": "alarm" }] }],
  "player": { "weapons": ["handgun"] } }
```

Level flags: `off_duty` (section 4.11), `home` (the bunker: `Level.build` gives it a `Home` node, section 5.10), `covers_all` (the self-test checks it has everything, section 9), `fluid` (the look of flooded cells).

### 4.1 The map

One character per cell. Built in: `#` solid, space void, `.` floor, `+` a `door_split`. A legend entry is `{ solid, door, lock, flag, need, sealed, jammed, style, tag, start, face, fluid, window, diag, deck, ramp, walls }`. A cell takes its style and height from the first room whose `rect` (`[x, y, w, h]`) contains it, else the level's. The builder puts a floor and ceiling on every open cell and a wall on every side that meets a solid cell (and above the opening where a tall room meets a lower one), picks tiles from the style with a seeded generator (the level's `id` and `seed`), and gives every solid cell beside an open one a collision box. A room's `lights` (`every`, `ox`, `oy`) say which cells get ceiling lamps: (x + `ox`) % `every` == 0 and (y + `oy`) % `every` == 0.

### 4.2 Level shape: cut corners, storeys, balconies, ramps, thin walls, windows

A cell does not have to be all floor or all wall. Each of these can be given in the legend (for hand-drawn maps) or in a list at the top of the level (easier for a generator):

| What | Legend entry | Level list | Meaning |
|---|---|---|---|
| Cut corner | `{"diag": "ne"}` | `"diags": [{"at": [x, y], "corner": "ne"}]` | That corner of the cell is wall, with a wall face across the diagonal. A run of them makes angled walls and eight-sided rooms. Cut corners touch only at their points, so a walkway that follows one needs the cell inside it too. |
| Storeys | room `"height": 3` | | Rooms may be 1 to 3 storeys (4 m each). |
| Balcony | `{"deck": 1}` or `{"deck": [1, 2]}` | `"decks": [{"rect": [x, y, w, h], "level": 1}]` | A floor at that storey over whatever is below, which stays walkable. Railings appear wherever there is a drop. A room grows to fit its decks. |
| Ramp | `{"ramp": {"dir": "n", "from": 0, "to": 2}}` | `"ramps": [{"at": [x, y], "dir": "n", "from": 0, "to": 2}]` | Rises from `from` to `to` metres toward `dir` across one cell. Two in a row (0→2, 2→4) climb a storey at a slope anything can walk. The ground under a ramp that starts below 4 m is closed. |
| Thin wall | `{"walls": "e"}` or `{"walls": {"e": "wall", "n": "window"}}` | `"walls": [{"at": [x, y], "side": "e", "kind": "wall"}]` | A wall 0.3 m thick on that edge of an open cell, so two rooms can share a wall with no cell between them. Leave an edge without one for an opening. |
| Window in a thin wall | kind `"window"` | same | Glass at ground level in that thin wall; storeys above it are wall. |
| Window cell | `{"window": true}` | `"windows": [[x, y]]` | A wall cell that is an observation window instead: it stands across the cell as a door would, between wall (or doors, or other windows) either side. |

Glass stops bodies, bullets and projectiles but not sight: `Level.los(a, b)` sees through it and `Level.los(a, b, true)` does not. Things that see the player through a window wake, but do not waste shots on the glass.

### 4.3 Floors on floors

A level is a stack of floors. `"map"` is storey 0; `"floors"` adds others, each the same size:

```json
"floors": [ {"level": 1,  "map": ["####", ...], "rooms": [...]},
            {"level": -1, "map": [...], "rooms": [...]} ]
```

A floor entry takes what a level takes for its shape: `map`, `rooms`, `legend` (added to the level's), `style`, `height`, `diags`, `decks`, `ramps`, `windows`, `walls`. Storeys are `H` (4 m) apart; a room's `height` still counts storeys upward from its own floor, and ramp heights are metres above its own floor. Anything in `things` goes on another floor (or on a balcony) with `"level": n`: it is simply the storey.

- **Air is air, whichever floor it belongs to.** Each wall is decided storey by storey: there is a wall unless the cell next door has air at that height on any floor. So a door on storey 1 can open off one hall's balcony into the next hall, and an upstairs room beside a tall hall looks down into it over a railing.
- **A door needs a floor each side.** Upstairs that means a room of its own floor, or a balcony (`decks`) of a tall room below. Doors, windows, thin walls, cut corners, pools and props all work on any floor.
- **A room right on top of another** shares a slab 0.8 m thick (`UNDER`): the lower room's ceiling is its own tiles, squashed under it, and the room is that much lower.
- **Every storey is sealed** right across the map except where air goes through (tall rooms, pits, lift shafts), so nothing can drop through rock.
- **Navigation** joins every floor and balcony to whatever stands at the same height next door. `Level.path(from, to)` returns a walkable route over ramps and along balconies; `Level.reach(a, b)` also counts lifts and falls (monsters use neither, so they stay on the floors they can walk to); `Level.floor_y(pos)` is the height of the floor under a point.
- **The map** shows the floor you are on, with B1 / L0 / L1 in its corner; windows (cyan), ramps (sand) and balconies (lighter).

**Lifts.** `{"lift": [-1, 0, 1], "at": [x, y], "home": 0, "speed": 3.2, "color": [0.4, 1.0, 0.6]}` in `things`. The numbers are the storeys it stops at. The shaft is the cell at its lowest stop, which the level makes tall enough; cells of the floors in between are taken out of their maps, so those floors need somewhere to step off beside it. Stand on it and it goes to its next stop; step off and on again to go further. Stand beside the shaft on another floor and it comes to you. It will not come down on the player.

**Pits.** `{"trap": "pit", "at": [x, y], "level": 0, "delay": 0.15, "damage": 6}`. The cell has a trapdoor for a floor, drawn with the room's own floor tile; it opens under the player, drops them into whatever room is below, and shuts. There has to be air below. Monsters walk over it.

**Pools.** A legend entry with `"fluid": true` floods its cells (`"~": {"fluid": true}`), and the level's `"fluid": {"level": 0.7, "color": [r, g, b, a], "glow": 0.3, "lip": [...]}` sets the look. Flooded cells are sunk: the pool's floor is `fluid.level` below the room's, the surface sits just under floor level, the basin has walls, and a kerb (`lip` gives its colour) runs wherever you could walk in. The way in and out is a slope under the surface. A pool over a room on the floor below is not sunk. The player wades at 0.62 speed.

### 4.4 Doors

**Doors** must close an opening from wall to wall. A door cell without solid cells on both flanks is left out with a warning (and counted in `Level.bad_doors`; the self-test fails on it). Doors run across the corridor they close: across when the cells west and east are solid, otherwise turned. `lock` is a key colour (`red`, `blue`, `yellow`); `flag` (a story flag, or a list: any) keeps it shut until set, with `need` as the words; `sealed` shuts it until an `unlock` or `open` effect; `jammed` makes it grind and spark. Doors open for the player and for anything that is hunting them. Taking a key card sets `key_<colour>`.

### 4.5 Things

`things`, with `at: [x, y]` or `tag`; or an `objects` grid with an `objectLegend`, as in the 2D engine. Every one takes `offset: [dx, 0, dz]`, `face` (`n e s w`: the way its front looks), `tag` and `level`. What an entry makes is decided by its kind, the first of these keys it has (`Spawner`, section 5.4):

| Entry | Extra fields |
|---|---|
| `start: true` | Where the player begins. |
| `lift: [stops]` | `home`, `speed`, `color` (section 4.3). |
| `trap: "pit"` | `delay`, `damage` (section 4.3). |
| `target: tag` | A target for off-duty monsters to show their attacks on (section 4.11). |
| `station: model` | `actor`, `shut`, `wake`, `blocks` (section 4.6). |
| `actor: id` | `still` (doesn't wander), `alert`, `hp_mul`, `on_death` (effects), `on_anger` (effects, when it turns), `lounge`, `perch`, `off_duty`, `talk`, `provoke`, `roam`, `greet`. |
| `prop: model` | `use`, `hp`, `loot`, `explode`, `screen` (text on its display), `solid`, `blocks`, `lit`, `turn`, `seat`, `seat_gap`, `seat_turn`, `holds`, `hidden`, `rattle`, `walk`. |
| `item: id` | Any item field, to override it for this one (`color`, `value`, `flag`). `y` for its height; `rest`. |
| `rebuild: {...}` | A repair bay (section 4.7); `as` tags what it rebuilds. |
| `trap: kind` | `laser` (`cycle: [on, off]`, `heights`, `damage`, `axis`, `trip`, `effects`), `shock` (`period`, `damage`, `hear`, `quiet`), `vent` (`period`, `on`, `damage`, `color`), `darts` (`delay`, `volleys`, `interval`, `damage`, `cooldown`); all take `off` (a flag, or a list of flags, that disarms it) and `phase`. |
| `sign: text` | Lettering on the wall behind it: `size`, `color`, `y`, `out`, `width`, `plain` (section 4.8). |
| `light: {color, energy, range}` | A loose light: `y`, `flicker`, `shadows`. |

**Holding things.** `{"prop": "lt_shelf_ex", "at": [x, y], "face": "s", "offset": [0, 0, -1.6], "blocks": false, "holds": ["cookies", "cookies", "circuit"]}`: any model with `slots` can hold things. A held thing is a pickup with `"rest": true`: it sits on its place, does not hover or turn, and is taken from 1.3 m. `{"item": "chips", "rest": true}` alone is a thing lying on the floor, which is what dropped things are. Things thrown out of lockers, crates and coffins still hover so they are seen.

**A chair with a station.** Any prop entry may name `"seat": "<chair id>"`: the chair is put in front of the prop, facing it, `seat_gap` (0.25 m) away; `seat_turn` (degrees) leaves it pushed aside.

**Hidden props.** Props placed with `hidden: true` are not there (no collision, no light, cannot be used) until a `show` effect; they rise through the floor. `hide` takes a prop away.

**Traps.** A trap works only on its own storey and finds the walls for its emitters there. A shock plate cycles for ever, so its charge and discharge are heard only within `hear` metres (12) on its own storey; `quiet: true` silences it. A laser with `trip: true` is a tripwire: no damage; it runs its `effects` once and goes out. Darts need the kit models `trap_plate` and `trap_dart`; dart ports are left off a side that is a door or a window. Traps take `offset`.

### 4.6 Stations

`{"station": "rb_station_custodian", "actor": "custodian", "at": [x, y], "face": "s", "shut": true}`. `face` is the way the opening looks. `shut`: the shutter is down over a hibernating robot; otherwise the station is an open frame with the robot standing in it. Leave `actor` out for an empty station (its robot is out). `"blocks": true` when it stands in a room and not in an alcove of its own.

The robot is switched off until something activates it: it sees the player; the station's sensor does (8 m for a shut one, 14 m for an open one, `"wake"` to change it, and it needs a line of sight from the door); it is shot at; it hears gunfire; or a robot within 10 m raises the alarm. Then the shutter opens (the model's `time`) and it comes out. So a row of stations goes off together.

### 4.7 The repair bay

`{"rebuild": {"actors": ["custodian", "drone"], "every": 40, "max": 6, "off": "bay_off", "level": 2, "text": "..."}, "at": [x, y], "as": "rebuilt"}` (`engine/rebuilder.gd`). While its `off` flag is unset, every `every` seconds it rebuilds one destroyed robot of the listed kinds on its storey (`max` in all), unless the player is within 7 m. `Level.died` is the log it reads.

### 4.8 Signs

Lettering is shown on a wall monitor of its own (dark screen, bezel, a mount back to the wall), standing `out` metres (0.36) off the wall. The engine wraps the words itself to `width` pixels and makes the screen exactly their size; a word too long for the width makes the lettering smaller. The whole monitor is kept under the ceiling. `offset` moves it; `plain: true` is bare lettering. (`engine/level/signs.gd`)

### 4.9 Using a prop; scanner arches

**Using a prop** (`use`): `prompt`, `when` (flag needed; `locked` says why not), `once`, and a `type`:

- `terminal` / `read`: a panel that stops the game. `kicker`, `title`, `text`, `options` (section 4.12). `result` replaces the text; `screen` changes the prop's display.
- `cache`: opens its lid and throws out `loot: [item entries]`; `text` is what the game says. Loot from a wall-mounted cache comes out the front.
- `heal`: `charges`, `amount`.
- `locker`: swings its door open, once. `loot: [item entries]` come out to be taken; `actor` + `count` put monsters in front of it, awake (`text` is what the game says); `effects` run with the locker as their place (an `explode` goes off there). None of them: it is empty. A placement's `rattle: true` makes the door shiver and knock while you are near, the tell for something alive inside. The kit has two models: `locker` and `locker_bad` (dented from inside, leaking).
- `home`: `what` is passed to the bunker (section 5.10).
- `effects` (default): runs `effects`.

**Scanner arches.** A prop whose model has `walk` (the kit's `arch_medical`, `arch_security`, `arch_supply`, `arch_toll`) does something when the player crosses its opening. The symbol on its header and the colour of its lights say which kind it is; the lights go grey when it is spent. The kit gives each a default `walk`; a placement's `walk` overrides any field.

| Field | Meaning |
|---|---|
| `effects` | What happens (any effects). |
| `need` | `hurt` (only if below full health) or `armed` (only if carrying more than the first weapon). Otherwise `idle_text` is shown. |
| `when`, `unless` | Story flags. |
| `cost`, `fail` | Credits taken to pass; `fail` effects run if you can't pay. |
| `charges`, `empty_text` | How many times it works. |
| `once`, `cooldown`, `sound`, `color`, `kind` | |

Shipped: **medical** (green cross: heals 30, three times), **security** (red eye: an armed visitor sets off the alarm and a turret drops in, once), **supply** (cyan bolt: half a load of every ammunition, twice), **toll** (amber coin: 15 cr, or a shock). A `disable` effect on an arch's tag switches it off. They stand free; face them along the way people walk (`face: "s"` for a north–south passage).

### 4.10 Effects, triggers, objectives

**Effects** (triggers, terminals, items, `on_death`, `on_anger`, arches): each is `{ type, delay, ... }`. Every type is a handler in the `EffectRegistry` (section 5.2).

| Type | Fields |
|---|---|
| `message` | `text`, `kind` (`info`, `warn`, `good`, `loot`, `key`) |
| `flag` | `name` |
| `unlock`, `open`, `seal`, `close` | `tag` (doors). `open` also holds it open. |
| `spawn` | `tag` (cells), `actor`, `count`, `as` (a tag for what it spawns); `here: true` spawns where the thing that ran the effect is; `level: n` says which storey its tagged cells are on |
| `ammo` | `amount`: a share of a full load, for every kind |
| `explode` | `radius`, `damage`, at the thing that ran the effect |
| `lights` | `room` (`"*"` is every room), `floor` (one storey), `on`, `color`, `energy` |
| `alarm` | `radius` (everything, without it); heard on the player's own floor only |
| `enable`, `disable` | `tag` (traps, arches) |
| `credits`, `key`, `heal`, `hurt`, `quake`, `sound` | `amount` / `color` / `strength` / `id` |
| `end` | `title`, `text`: the level is finished |
| `anger`, `pacify` | `tag`: an off-duty actor with that tag becomes a monster and comes for you (its `on_anger` effects run); or a monster stands down for good |
| `show`, `hide` | `tag` (props placed `hidden`) |
| `drop` | `items`: pickups appear between the thing that ran the effect and the player (never inside a wall); an item is an id or an item entry |
| `chance` | `p`, `do`: sometimes |
| `drill`, `drill_stop` | `actor`, `tag`: sends the nearest free off-duty monster of that kind (any, without `actor`) to the first free target with that tag; `drill_stop` calls them all off |

**Triggers**: `{ on: { type, name }, once, when, unless, do: [effects] }`. Types: `walk` (a tagged arch walked through), `flag` (set), `room` (first entered, by room name), `enter` (a tagged cell), `clear` (every actor with that tag dead), `use` (a tagged prop used), `pickup` (a tagged item taken). (`engine/level/triggers.gd`)

**Objectives**: the HUD shows the first whose `when` holds and whose `done` (a flag, or any of a list) is not yet set.

### 4.11 Off duty, talking and targets

A level with `"off_duty": true` (or one thing with it) is a floor where nothing fights. Every monster on it:

- **notices you** when you are in sight within `talk.reach` (9 m; `wake_sight` for things that stand dormant; a thing's `greet` sets it): it says one of `talk.greet` as floating words, turns to you if it can, and every so often says one of `talk.idle` (its `barks`, without);
- **stops noticing** four seconds after you have gone. A thing with a `dormant_clip` powers up when you arrive and goes dormant again when you leave. One in a station that was `shut` is shut in again: the station opens as you come up to it and closes behind you;
- **wanders** near where the level put it, if it can walk and has nothing else to do (not in a station, not lounging, not perched, not `"still": true`). `"roam": cells` on the thing sets how far (4);
- **talks** when you press E on it (the prompt is "Talk to the ..."). The panel is the terminal panel;
- **shows what it does**: the last option in every panel asks it to. It then runs its ordinary fighting code against a **Target** in place of you, for `talk.drill_time` seconds (8) from its first attack, and goes back to where it was. What can walk goes to the gun range: the nearest free target tagged `range`. What cannot (turrets, the Snapper, anything on a ceiling) needs a target it can see from where it stands;
- can be shot, and dies, and says one of `talk.hurt` about it, and still does not fight. Things let out by lockers and arches on such a floor are off duty too. `provoke: true` on a thing: shooting it angers it.

`talk` in an actor's def (or on one thing, for its own conversation instead of its kind's, with no drill option):

```json
"talk": {"kicker": "OFF DUTY", "reach": 9, "drill_time": 8, "color": [0.6, 0.95, 0.8],
  "greet": ["OH. IT'S YOU."], "idle": ["FIFTEEN MINUTES. I TIMED IT."], "hurt": ["I'M ON MY BREAK"],
  "open": ["what the panel says when it opens; one is picked"],
  "options": [{"label": "\"What's wrong?\"", "results": ["one of these is picked", "..."]},
              {"label": "Take the coolant stick", "result": "...", "effects": [{"type": "message", "text": "..."}]}],
  "riddles": [{"q": "...", "answers": ["right", "wrong", "wrong"], "right": 0, "yes": "...", "no": "..."}],
  "prize": 25, "again": "Another riddle", "drill_label": "Show me what you do on duty",
  "after": [{"when": "flag", "prompt": "...", "open": [...], "greet": [...], "idle": [...], "options": [...]}]}
```

With `riddles`, each time the panel opens it asks one, with the answers shuffled; a right answer pays `prize` credits the first time. `talk.after` is a list of blocks laid over the conversation once their flag is set, so a character has something else to say when its business is done.

**Targets**: `{"target": "range", "at": [x, y], "face": "w"}`. The name is its tag. A target stands in for the player in a monster's fighting code: it is seen, shot, hit, pounced on, grabbed and thrown, counts what lands on a label over it, and rocks. The player can shoot it too. It does not block sight. (`engine/target.gd`)

### 4.12 Panels

A terminal's, a reader's and a conversation's `options`: `[{ label, effects, result, results, when, unless, once, after, final, call, screen, close, cost, hack, hard, working, risk, fail, fail_result, fail_close }]`.

- `result` replaces the text; `results` is a list, one is picked; `screen` changes the prop's display; `close` closes the panel.
- `when` / `unless` / `once`: offered only while a flag is (not) set, or once. `final`: after it, only options marked `after` are offered. `call`: a method of the thing itself.
- `cost`: credits; not enough and it says so.
- `hack` (with `hard`, `working`): a hack succeeds by chance (section 3.1, `hacking`), less the job's `hard` (0.05 = five points); the option shows its odds. Failing runs `fail` and says `fail_result`; it can be tried again.
- `risk` (0 to 1): for choices that are not hacks, the chance it goes wrong (`fail`, `fail_result`, `fail_close`).

Effects from a panel know which prop ran them. These rules are `engine/interaction.gd` and `engine/option_gates.gd` (section 5.3); the HUD only draws the panel.

## 5. The engine

The engine knows no game: every game id, number and line of text comes from a game's data (`CLAUDE.md` lists the few exceptions still in code). Each subsystem below is a file or a folder with one job.

### 5.1 Autoloads

- **`LM`** (`engine/lm.gd`): the registry. `boot(game)`, `game`, `kits`, `defs`, `levels`, `generators`; `get_def(kind, id)`, `model_meta(kit, id)`, `spawn_model`, `spawn_scene`, `sound`, `col`, `vec`, `read_json`.
- **`Game`** (`engine/game.gd`): the state of one run: `player`, `level`, `hud`, flags, keys, credits, `haul`, `stats`, `over`, `calm`, `easy`; `run_effects(effects, ctx)`; `interaction` (5.3); signals `changed`, `ended`, `identified`.
- **`Profile`** (`engine/profile.gd`): what lasts between expeditions (5.10).

### 5.2 Effects (`engine/effects.gd`)

`EffectRegistry` is the one table of everything that can be made to happen: effect type → handler. It is the only scripting language: triggers, terminals, items, arches, `on_death` and lockers all run effects through `Game.run_effects`, which waits out each `delay`. `Game` registers the run-wide types (`message`, `flag`, `sound`, `credits`, `key`, `heal`, `ammo`, `explode`, `hurt`, `quake`, `chance`, `end`), `engine/level/level_effects.gd` the place's (`unlock`, `open`, `seal`, `close`, `spawn`, `lights`, `alarm`, `enable`, `disable`, `show`, `hide`, `drop`, `anger`, `pacify`, `drill`, `drill_stop`), and `engine/prop_uses.gd` what a prop's `use` does, by its type (`use:terminal`, `use:read`, `use:cache`, `use:locker`, `use:heal`, `use:home`, `use:effects`). A new kind of effect is one `register` call.

### 5.3 Interaction (`engine/interaction.gd`)

The rules of panels, held as `Game.interaction`: which options are offered (`when`, `unless`, `once`, `after`, `final`), the option gates (`OptionGates`: `cost`, `hack`, `risk`), "used" marks (kept here by the thing's id, never written into level dictionaries), effects, `do` callbacks, results and `call`. `Hud` draws the panel (`open_panel`, `repanel`, `close_panel`) and hands each choice to `Game.interaction.choose(i)`.

### 5.4 Level (`engine/level.gd`, `engine/level/`)

`Level` is a thin node that owns its parts and keeps every public method and field callers use:

- `LevelData` (`level_data.gd`): the map read into cells; floors, legend, shapes, lifts, pits; cell queries (`cell`, `cell_s`, `open_s`, `air`, `ceiling_y`, `floor_of`, `cell_at`, `center`, `cell_of`, `room_at`, `fluid_at`); `pick()`, the level's one seeded random stream; the walls things hang on.
- `LevelBuilder` (`builder.gd`): bodies, the shell (tiles), balconies, rails, ramps, thin walls and windows; `LevelCollision`, `LevelNav` (the walking graph: `path`, `reach`, `block`, `floor_y`), `LevelFluid`, `LevelEnvironment` (ambient, tone mapping, glow, fog, ambient occlusion).
- `LevelLights` (`lights.gd`): lights by room, flicker.
- `Spawner` (`spawner.gd`): doors and windows from the map, then every thing, by a registry of factories by entry kind (`register_kind`), tried in the order of section 4.5. `LevelSigns` (`signs.gd`) makes the lettering.
- `Triggers` (`triggers.gd`): triggers, notifications, deaths, the explored map and room names.
- `LightingDebug` (`lighting_debug.gd`): the F1–F3 lighting tests (5.11).

`Level` for code: `cell(x, y, f)`, `cell_s(x, y, storey)` / `air(...)` / `open_s(...)`, `floor_of(pos)`, `cell_at(pos)`, `ceiling_y(x, y, storey)`, `block(p, solid, f)`, `is_blocked`, `los`, `path`, `reach`, `floor_y`, `spawn_thing`, `run_effect`, `make_light`, `doors`, `doors_up` (doors off storey 0, keyed `Vector3i(x, y, storey)`), `lifts`, `actors`, `targets`, `things_by_tag`, `tiles_at` (which tile was laid where).

### 5.5 Actors (`engine/actor/`)

`Actor` (`actor.gd`) is what the rest of the engine asks of an actor and tells it (`target()`, `state_name`, `hurt`, `alert`, `hear`, `knock_off`, `cannot_walk`, `drill`, `talk`, `use`, `prompt` ...); it extends `ActorCore` (`actor_core.gd`): the body, components, animation, waking (alert, anger), damage and death, and the tick. The tick is a state machine, decided in one place: `DORMANT`, `IDLE`, `ALERT`, `ATTACKING`, `STUNNED`, `CLIMBING`, `OFF_DUTY`, `DEAD` (`actor.state`, readable by anyone). Everything reads its target through `target()`, which is the player (or a `Target` while drilling).

Components are child nodes, each added only when its def key is there: `ActorSenses` (always: sight and hearing), `ActorLocomotion` (always: ground, fly, swim, gait, wander, dance, routes, the fall of the dead), `ActorClimb` (`climb`), `ActorAttacks` (`attacks`, `touch`: melee, ranged, pounce, grapple), `ActorAimRig` (`aim`), `ActorLooks` (`screen`, barks, `jelly`, `equalizer`, `trail`, `footfall`), `ActorLounge` (`lounge`), `ActorOffDuty` and `ActorConversation` (when off duty).

### 5.6 Player (`engine/player.gd`, `engine/player/`)

`Player` is the body: health and armour, being held or frozen, what is in front of you to use (`focus`), and the members the rest of the game reads (`weapons`, `ammo`, `current`, `recoil`, `zoom`, `pitch`; `weapon()`, `equip()`, `give_weapon()`, `add_ammo()`, `heal()`, `hurt()`, `shake()`, `fire()`, `ready_to_fire()`). Its components, called in a fixed order each physics frame: `PlayerControls` (`controls.gd`: mouse and keys), `PlayerMovement` (`movement.gd`: walking, wading, dash, jump, gravity, footsteps), `PlayerCamera` (`camera_rig.gd`: the head, camera, lamp and the hand; pitch, sniper zoom, shake, the slump when you die) and `PlayerWeapons` (`weapons.gd`: what you carry, the gun in hand, firing).

**Sniper mode.** Hold the right mouse button: the view closes from `player.fov` (84) to `player.zoom_fov` (20), a scope's reticle replaces the cross hairs, the gun drops out of view, mouse sensitivity falls in step with the zoom, and movement slows to `player.zoom_speed` (0.22) of normal. Dashing breaks it.

The player's lamp (F) casts no shadows: a light at the eye throws slivers of shadow beside every ledge and pillar, and they shift whenever the view does.

### 5.7 Props, doors, pickups and the rest

`Prop` (`prop.gd`: any kit model standing in the world; arches walked through; parts, spin, screens; `show_up`), `Station` (`station.gd`), `Door` (`door.gd`), `Pickup` (`pickup.gd`), `Trap` (`trap.gd`), `Pit` (`pit.gd`), `Lift` (`lift.gd`), `Target` (`target.gd`), `Rebuilder` (`rebuilder.gd`), `Projectile` (`projectile.gd`), `Puddle` (`puddle.gd`), `Fx` (`fx.gd`: sparks, flashes, tracers, blasts, floating words).

### 5.8 HUD and the map (`engine/hud.gd`, `engine/hud/`)

Status, messages, the objective, the map (the floor you are on; any enemy the player has had in view shows as a red signal that follows it: a diamond with a ring that pulses, faster and wider once it is hunting), panels (drawing only: 5.3), the title, pause and end screens. `Hud` keeps the state (title, play, panel, pause, end) and builds the status, messages and panel; its parts are `HudStyle` (`hud/style.gd`: the accent colour, the font, how labels, bars and buttons look), `HudCrosshair` (`hud/crosshair.gd`: the cross hairs, and the scope when zoomed), `HudMap` (`hud/map_view.gd`: the map, small or big with Tab) and `HudScreens` (`hud/screens.gd`: the title, pause and end overlays).

### 5.9 Easy mode and Identify (`engine/identify.gd`)

For play-testing. `game.json` `"easy": {"deal": 3, "take": 3}`: with easy mode on, everything the player's weapons deal (bullets, projectiles, their blasts) is multiplied by `deal`, and everything the player takes is divided by `take` before armour. Switched by the button on the title screen, which is remembered between sessions (`user://maze3d.cfg`), or for one run with `--easy` (`--easy=0` forces it off). The health readout shows EASY while it is on. Monsters' health, pickups and the self-test are untouched.

**What is that? (E).** With easy mode on, E first names whatever is under the crosshair (at any distance), then does what E always does. The HUD shows it for a few seconds, bottom centre, and the log gets a line starting `IDENT`: the name, then the id it goes by in the files, the kit it comes from, its state, and the cell, room and style it is in. For example `Fabricator` / `prop "fabricator" · kit hightech · furniture (does nothing) · cell 12,7 · room "lab" · style lab`. It knows monsters (living or dead), props, doors, windows, pickups, traps, pits, lifts, puddles, signs, and every wall, floor and ceiling tile. Plain engine-built surfaces (decks, slabs, rails) say so. Easy mode's E on a container names it and what is left in it; on a station, whether it is open and who is in it.

### 5.10 Home and Profile (`engine/home.gd`, `engine/profile.gd`)

A level with `"home": true` gets a `Home` node (`level.home`). Furniture that does something carries `"use": {"type": "home", "what": <word>, "prompt": ...}` and `Prop.use` passes the word to `Home.use_prop`: `comms`, `ledger`, `trophy`, `rack`, `armor`, `locker`, `medic`, `bed`, `sofa`, `security`, `cradle`, `diagnostic`, `lift`. `Home` finds the rack, the armour stand, the trophy case and the cradle by `tag` (`rack`, `armor`, `trophy`, `cradle`). What it offers (robot, repair, catalogue, broadcasts, programmes) and every word it shows are the game's `defs/home.json` (section 3.6): `catalogue()`, `repair_needs()`, `robot_id()`, `word(key)`. The rack and the trophy case show their contents on whatever models stand there with those tags. Decorating is `HomeDecorating` (`engine/home/decorating.gd`), a child of `Home`; `Home` passes `toggle`, `place`, `take_back`, `aim` and `select` on to it.

**Profile** (autoload, `user://havenot_home.json`): `credits`, `weapons`, `armor`, `salvage` {item id: count}, `trophies` [item ids], `owned` {model: count}, `decor` [{m, x, z, yaw}], `robot`, `runs`, `deaths`, `best`. `--selftest` and `--noprofile` keep it in memory and never touch the file.

- **Banking.** Treasure picked up is counted in `Game.haul`. When a level ends and the player is alive, `Main` calls `Profile.bank(credits, weapons, armor, haul)`; items whose def has `"trophy": true` also go in the trophy case. Dying banks nothing.
- **Setting out.** `Home.go(level_id)` sets `Profile.sortie`; the next level's player gets every banked weapon, the banked armour, and half a load of ammunition for each (`Profile.outfit`). Levels started from the title screen are not outfitted.
- **Panels.** `Hud.repanel(owner, spec)` opens a panel or swaps the one that is open; an option may carry `"do": Callable`.
- **The robot.** The repair takes `repair` from `salvage`; then `Profile.robot` is true and an off-duty robot of kind `robot` lives in the bunker and talks. Until then its model hangs in the cradle.
- **Decorating.** `buy(i)` pays from banked credits for the i-th of the `catalogue`. **B** toggles decorating: the next unplaced thing is carried as a ghost on the floor in front of the player (snapped to 0.25 m and 45°), or on the wall being looked at for wall-mounted models; click places it (a `Prop`, saved in `decor`), **R** turns, **Z** or the wheel picks the next, **X** takes back the nearest placed thing within reach. To add a furnishing: model it in `tools/blender/kits_home.py`, add it to `PROPS` there and to `catalogue` in `defs/home.json`.
- **Retiring** (the ledger) empties the profile.

### 5.11 Lighting

Ambient occlusion is on, gentle (intensity 1.2, radius 0.8) and at full resolution. Screen-space indirect light is off (`--ssil` turns it on). Volumetric fog is on in Forward+. The shadow atlas has four equal quadrants (64 shadows at 1024 px) so a shadow's resolution does not change as its light's share of the screen does. Shadow edges are softened at the "high" grade with a narrow blur (0.6): Godot dithers soft shadow edges with a pattern fixed to the screen, so a wide, coarse one crawls as the view turns.

**Lighting tests while playing** (`engine/level/lighting_debug.gd`). F1 picks the next test (F3 the one before) and says what it is and how it stands; F2 switches it. The tests: the view (normal, unshaded, lighting only, lights per screen area, overdraw, occlusion alone), surface grime, room-light shadows, shadow edges, ambient occlusion, volumetric fog, distance fog, glow, highlights, far lights fading out, the near clip plane, anti-aliasing, all room lights. (F5 to F8 are the editor's run and stop keys.)

### 5.12 Debug switches and the command line (`engine/debug.gd`, `engine/main.gd`)

Game code never reads the command line: `Main` sets the static switches in `Debug` (`sure_rolls`, `quick_hacks`, `hold_zoom`, `memory_profile`, `fixed_settings`, `no_ao`, `ssil`, `no_vfog`) from its arguments, and the self-test sets what it needs (`SelfTest.configure`). Arguments (after `--`): `--level=<id>` or `--level=gen:<generator>[:<theme>]` with `--seed=N` and `--dump=file.json`; `--selftest` (and `--story`, `--verbose`); `--easy`, `--calm` (nothing notices the player), `--god`, `--alert`, `--at=x,y[,dx,dz]`, `--up=1`, `--yaw`, `--pitch`, `--zoom`, `--noprofile`, `--noao`, `--ssil`, `--novfog`, `--lights`, `--trace` (every actor's change of state; `--trace=Name` follows one), `--shot=file.png` with `--frames=N`, `--nohud`.

## 6. Generators

A generator is a script in `generators/` with one function, listed in `game.json` `generators`:

```gdscript
func generate(seed: int, params: Dictionary) -> Dictionary   # a level dictionary, as in section 4
```

`params` is the game's `generator_params`, with a theme's overrides merged over it. `game.json` may hold `generator_themes`: named sets of overrides (`title`, `place`, `kit`, `corridor`, `styles`, `doors`, `props`, `style_props`, `actors`, `boss`, `exit_prop`, `size`, `rooms`, `menu`, ...). Each theme with `"menu"` not false gets its own title-screen entry; any runs as `--level=gen:<name>:<theme>`. Each generator appears on the title screen; `--level=gen:<name> --seed=N` runs one from a terminal. Because a level is plain data, a generator can also be written outside Godot.

### 6.1 `rooms`: the stages

`generators/rooms.gd` builds rooms of many shapes joined by corridors and loops, a locked way out, monsters, treasure, scanner arches, wall lockers and dressing, all picked from the params. Its `_try` runs these stages in order over one `GenContext` (`generators/rooms/context.gd`: every field the stages share, grouped by the stage that fills it, and the helpers several stages use). Every random number comes from the context's one generator in a fixed order, so the same seed always makes the same level.

| Stage | File | What it does |
|---|---|---|
| `units` | `layout.gd` | Boxes for the rooms; the second, and one about halfway, are halls. Fails under three. |
| `shapes` | `layout.gd` | Eight-sided, round, L, cross, piers, suites. Only corners are cut, so the middle row and column, where corridors arrive, stay open. |
| `areas` | `layout.gd` | What gets a style, a height and furniture; a suite is one unit and two areas with a thin wall between. |
| `corridors` | `layout.gd` | Carve only; doors come afterwards. Loops, but never a second way into the last room. |
| `thresholds` | `layout.gd` | Doors only on thresholds (a corridor cell with a room one side, floor the other, solid wall both flanks), never two back to back, placed after every corridor is carved; the vault door; the red card's room must be reachable without it. |
| `cut_corners`, `galleries` | `galleries.gd` | Cut corners; balconies and ramps, before any furniture. |
| `essentials`, `arches`, `rooms`, `balconies` | `contents.gd` | The start, the card, the guns, the way out and its boss; scanner arches inside doorways; per room monsters, treasure in containers, furniture for its purpose (`furnish.gd`), dressing in the corners, lockers; something worth the climb on the balconies. |
| `windows`, `traps`, `pools` | `hazards.gd` | Observation windows; lasers and shock plates in corridors, vents in rooms; flooded patches. |
| `storeys` | `storeys.gd` | Doors a storey up between halls, rooms upstairs (off a balcony, or by lift only), the basement with its lift and pits. |
| `stations` | `stations.gd` | Sphinx guns by the doors of valuable rooms; robots into stations. |
| ambush, assembly | `rooms.gd` | Taking the card brings company; the level dictionary. |

`tools/gen_check.gd` runs the generator over 40 seeds a theme and counts what it made.

### 6.2 `rooms`: shapes and features

Its `"shapes"` param (each a chance from 0 to 1 unless noted; 0 switches the feature off):

| Setting | Default | What it does |
|---|---|---|
| `fancy` | 0.8 | A room of 5 x 5 or more is eight-sided, round-cornered, L-shaped, cross-shaped, full of piers, or a suite. |
| `octagon` | 0.4 | A plain large room has its corners cut anyway. |
| `suite` | 1.0 | Lets a long room be divided in two by a thin wall with an opening and windows; each half has its own style; they share a height, because nothing closes the gap above the lower of two rooms joined by a thin wall. |
| `close` | 0.5 | A room may sit one wall from its neighbour instead of two, so the wall between can hold windows. |
| `hall` | true | One or two rooms of 7 x 7 and up. |
| `tall` | 0.65 | A 7 x 7 room is three storeys rather than two; smaller large rooms less often. |
| `balcony` | 0.7 | A tall room gets a gallery: along one wall, round two, three or all four, as the room is big enough to carry. A ramp comes up from the floor, off the room's middle line where it can be. |
| `tiers` | 0.75 | A three-storey room 7 deep gets a second gallery a storey higher, reached by its own ramp from the first. |
| `window`, `max_windows` | 0.45, 14 | A wall one cell thick with floor both sides becomes an observation window (never behind a container). |
| `pool`, `max_pools` | 0.3, 3 | A room gets a flooded patch, or is flooded wall to wall. The theme's `fluid` gives the colour; its `swimmers` list says what may be put in it. |
| `loops` | 2 | Extra corridors between rooms (a number, not a chance). |
| `traps` | `{"laser": 2, "shock": 2, "vent": 3}` | Lasers and shock plates in corridors, gas vents in rooms. |
| `jammed` | 0.08 | A door grinds and sparks. |
| `ambush` | true | Taking the red card sets off the alarm and spawns two or three of `ambush_actors` (default: the theme's `actors`) in a big room. |
| `upper_doors` | 2 | Doors a storey up, through the wall between two tall rooms, from one's balcony to a landing in the other (a number). |
| `upper_rooms`, `lift_rooms` | 2, 1 | Rooms on storey 1, over rock or over one-storey rooms: reached through a door off a balcony, or only by a lift. |
| `basement`, `basement_rooms` | 0.85, 4 | Chambers and corridors on storey -1, with a lift down from a nook of a one-storey room the player can reach without the red card. |
| `pits` | 3 | Trapdoors in room floors over the basement, never on the lines corridors come in on (a number). |

Other params: `size` ([36, 28]), `rooms` (10), `styles`, `style_props` (a room style → the furniture that belongs in it), `props`, `doors`, `actors` and `pairs` (placed two at a time), `gallery_actors` (who is put on balconies), `boss`, `exit_prop`, `place`, `kit`, `corridor`, `treasure`, `arches`, `swimmers`, `fluid`, `ambush_actors`, `ambush_text`, `basement_name`, `coffin_actor`, `furnish`, `purposes`, `containers`, `loot_kinds`, `stations`, `stationed`, `hibernating`, `sphinx`, `lockers`, `locker_loot`.

**Rooms with a purpose.** `"purposes": {"<style>": [purpose, ..]}`. Each room of that style picks one, is named for it (the name Identify and the map show), and is furnished for it:

```json
{"name": "Ward", "wall": ["hs_bed", "hs_monitor"], "floor": ["hs_gurney"], "centre": ["hs_table"],
 "corner": ["hs_screen"], "fill": 0.7, "floor_fill": 1.0, "rows": true, "valuable": true, "bay": false}
```

- `wall`: pieces that stand against a wall facing the room, on every other wall cell, up to `fill` of the wall cells (0.5). Each is pushed back against the wall by its own depth (the model's `solid`).
- `centre`: one piece in the middle of a room of 20 cells or more, with a clear lap all round it.
- `floor`: pieces out in the open, about one per seven cells times `floor_fill`, never two side by side. With `rows` they all face the same way and sit in alternate rows (seats, pews, desks).
- `corner`: what the corner dressing uses in this room (defaults to the theme's `props`).
- Anywhere a piece is named, `["station", "chair"]` names a set (the chair in front, facing it); `"@custodian"` names that robot's station, 60% of them occupied.
- `valuable`: the room is worth guarding (a Sphinx gun by its door). `bay`: a robot room ("Robot Bay", "Drone Bay"...), which gets the power-cell charging rack.

What keeps a furnished room from becoming an obstacle course: the cells on the shortest way between every pair of the room's doorways, and the cell in front of each doorway, are never furnished; open-floor pieces never have furniture beside them; wall pieces alternate with empty cells; and after placing, anything that cuts part of the floor off is taken out again. Cells are 4 m, so a kept-clear cell is a lane a player at full speed fits down. Furnished cells are blocked for monster path-finding. `"furnish": 0..1` scales how much goes in (1 by default; 0 leaves only corner dressing). A model for a wall piece should be no deeper than 1.2 m; an open-floor piece should fit in 2.8 × 2.8 m; a centrepiece in 3.4 × 3.4 m.

**Treasure in containers.** `"containers": {kind: model}` picks them; `"loot_kinds": {item: kind}` says what goes in what. A room gets a container or two against its walls, not beside a way in; walls with a container against them get no window (and upstairs, no door). Where there is no wall to stand one against (a landing, the middle of an upstairs room) the thing lies on the floor. A room with a trophy case or a strongbox is valuable.

**Stations.** `"stations": {actor: model}` says which robots have one; `"stationed": 0.65` of those on the main floor are taken off patrol and put in a station, `"hibernating": 0.5` of them shut. Each station is let into the wall of the room its robot was in: an alcove of its own, one cell of rock opened on to the room. Where a room has no rock to spare it stands against the wall with clear floor in front and to both sides. `"sphinx": {"actor": "sphinx", "max": 2}`: one Sphinx gun is let into the wall of each valuable room, in the alcove nearest that room's door, up to `max` a level.

**Nooks.** A lift is never out in a room: the generator opens one cell of rock off a one-storey room for it (rock on three sides, nothing else let into the wall beside it) and keeps the floor in front clear. In the basement and upstairs the room it serves is put beside the shaft, not round it. Stations use the same rule, and may open on a tall room.

**Lockers.** `"lockers"`: how many lockers a room gets, and what is in them. Without it a room gets none.

```json
"lockers": {"per_room": [0, 2], "prop": "locker", "prompt": "Open the locker",
  "outcomes": [{"below": 0.55, "loot": [1, 2]}, {"below": 0.7},
               {"below": 0.9, "prop": "locker_bad", "rattle": true, "actor": "roach", "count": [1, 3]},
               {"prop": "locker_bad", "text": "Somebody wired it.", "effects": [{"type": "explode", "radius": 4.0, "damage": 30}]}]}
```

One roll per locker picks the first outcome whose `below` is over it (the last needs none). An outcome may name a different `prop`, make it `rattle`, fill it with `loot: [min, max]` things from `locker_loot`, or put in its `use` an `actor` (with `count: [min, max]`), a `text` and `effects`.

## 7. The game's levels

Hand-made levels are written by scripts in `tools/levels/` (section 8.1) and can be edited by hand afterwards.

**Staff Only** (`staffonly`, `tools/levels/staffonly.py`): the test floor. The script reads every kit in `game.json` and the game's defs and lays out one spine corridor with wings off it in bands:

| Wing | What is in it |
|---|---|
| Break Room | Where you start. Monoids smoking, leaning and sitting; the notice that says where things are. Next door the Locker Room: both lockers (locker 1 has the **blue card**), the WellPoint, one of every item. |
| one wing for each kit | The kit's hall style as the corridor, a room in each of its other styles (the style's name is on a sign over the door), every piece of the kit's furniture once round the walls, the kit's door, and the monsters that belong there. The high-tech hall has the four scanner arches and the three traps (one lane is always clear) and a Sphinx Gun with its target; its Vault is behind the **blue door** and has the cache with the **red card**. |
| Gun Range | Four targets at the east end, a gallery behind glass along the north side, and two consoles that call any kind of monster that can walk. |
| Robot Depot | Every robot's station twice: open, and shut. |
| Stores | Every loot container, stocked, and a Sphinx Gun with its target. |
| The Nest | Two storeys, a pool: Roaches on the walls and ceiling, Glorexx (one in the water), the Snapper with its target, the Fouler. |
| Shapes | An atrium with a balcony, a ramp, a cut corner and windows; a store with a loft over it (door off the balcony); a lift lobby with a lift, a pit, and a basement under it. |
| Way Out | A security lobby, the **red door**, and the terminal that ends the level. |

Every door kind is used in turn. Everything is off duty. **Keeping it complete**: add a kit, a style, a model, a door, a monster or an item and run the script again: a new kit gets a wing, a new style a room, new furniture a place on a wall, a new monster a place on the spine (give it a home in `HOMES` at the top of the script to put it somewhere better), a new station a bay in the Depot, a new container a place in the Stores. The script stops with an error naming anything it could not place. `SO_ACTORS=monoid,sphinx` keeps just those monsters. The level is marked `"covers_all": true`.

**Home** (`home`, `tools/levels/home.py`): the bunker. Rooms: bedroom, bathroom, den, living room, communications, armoury, robot room, security. The level gives the player no weapons (`"player": {"weapons": []}`) and is `off_duty`. Not built yet: the outdoor near-area map (the security desk says so; the lift lists installations instead).

**The Anomalous Structure** (`anomalous`, `tools/levels/anomalous.py`): the 2D game's Installation A (`games/havenot/packs/hn-anomalous`), as one level of three stacked floors (storeys 0, 1, 2) joined by two lifts: `lift_a` (0 to 1) behind the blue door, `lift_b` (1 to 2) behind the yellow door. The rooms, the puzzle chain, the text and the three endings follow the 2D floors; the plan is redrawn at about a third of the 2D tile count because a cell here is 4 m. New in the defs for it: actors `heavy` (Heavy Security Drone: flies, dormant on its station until you are within 13 m or it is hurt, 320 hp, a six-bolt burst and a shell) and `emitter` (Field Emitter: stands still, no attacks, 70 hp; three of them hold the core's field up); items `lucky_chip`, `badge`, `order` (quest), `ad_core` (2500 cr, a trophy), `arc`; weapon `arc` (Arc Carbine: cells, 9 shots a second, 11 damage).

**Flags** it uses: `sphinx_ok`, `sphinx_angry`, `sphinx_dead`, `memo314`, `got_blue`, `darts_off`, `lucky_chip`, `badge`, `monoid_deal`, `staff1`, `sec1`, `safe_code`, `order`, `test_done` + `test_show` / `test_archive` / `test_endure`, `endure_done`, `mist_off`, `sec2`, `bolthole`, `alarm`, `station`, `sec3`, `traps_off` (+ `shock_off`, `beam_off`), `bay_off`, `coupling`, `field_down`, `agency_closed`, `ads_silent`, `core_seized`, `core_smashed`, and `key_blue` / `key_yellow` / `key_red` from the cards.

**Changed from the 2D game.** Hacks use the basic chance (15% at level 1; the hard ones 8 to 13%) until skill and equipment exist. Closing the agency drops the field; what happens to the ad system (silence, seize, smash) is chosen at the core itself. The Sphinx Gun asks when you come in and fires if you leave reception without answering. The core's field is solid, so there is a lectern outside it for filing the order or arguing; tearing out the connections needs the field down. The Repair Bay rebuilds robots during the level (on floor 3) rather than between missions. The threat sensor, hypno-tabs, grenades and the carapace suit are stood in for by things this game has (vest, health, cells, shells). Nothing persists between visits except what is banked at home.

**Deepworks**, **the Menagerie**, **the Depot** (every station twice, open along the north wall and shut along the south, and every kind of container next door), **the Atrium** (shapes, storeys, ramps, balconies, thin walls, windows) and **the Stack** (`tools/levels/stack.py`: two halls with a door between their balconies, a loft over a store room, a sump and a vault underneath reached by a pit and a lift, and a sunk pool) are described in the README.

## 8. Tools

### 8.1 Level scripts (`tools/levels/`)

`python3 tools/levels/<name>.py` writes `games/havenot/levels/<name>.json`. `levelkit.py` holds what they share: `models()` (the kit model metas), `grid`, `carve`, `rows`, `room`, `lights_for` (one lamp in a cell, or every n cells lined up on the room's middle), `tag`, `wall_offset` (a piece's back against a wall by its depth), `Things` (`put`, `actor`, `item`, `trap`, `sign`, `add`; a `floor` becomes "level"), `Legend` (a letter for each door kind) and `write`.

### 8.2 Model scripts (`tools/blender/`)

```
pip install bpy          # or use Blender itself:  blender -b -P tools/blender/build_all.py
python3 tools/blender/build_all.py              # everything
python3 tools/blender/build_all.py -- roach wall_pipes
MZ_KITS=hospital,basilica python3 tools/blender/build_all.py   # only those kits, no actors
MZ_ACTORS=heavy,emitter python3 tools/blender/build_all.py     # only those actors, no kits
```

`mz.py` is the modelling library: `Mesh` (boxes with bevels, cylinders, balls, prisms, lathes, tubes along a path, rings; `m.bone = "name"` binds what follows to a bone, and a tube can blend along a chain), `Rig` (bones, `clip(name, length, keys)` with rotations given in model space) and `export`. `tiles.py`, `props.py` and `actors.py`, `actors2.py` are the high-tech kit and the monsters; `palette.py` is the materials; `agency.py` the Agency kit. The other kits, one script each named for what it builds: `kits_works_bunker_crypt.py`, `kits_executive_megaplex_hospital_basilica.py`, `kits_robots_loot.py`, `kits_drowned_dust.py`, `kits_home.py`, `kits_anomalous.py` (which also has the Heavy Security Drone and the field emitter).

**Models from elsewhere.** `tools/blender/adopt.py` loads a rigged `.glb` (sources in `actors/source/`), renames bones and takes clips written as keyed poses; `adopt_roach.py`, `adopt_monoid.py`, `adopt_glorexx.py`, `adopt_eggbot.py`, `adopt_custodian.py` and the other `adopt_*.py` are worked examples. `Adopted.decimate(ratio)` thins a heavy mesh, `Adopted.split_off(...)` gives part of the mesh a new bone, `world_axes=True` is for files whose armature sits crooked, and `Adopted.rerig(bones, assign)` throws a useless skeleton away and builds a new rigid one (`adopt_plodder.py`). `adopt_sphinx.py` shows a turret in sections: clips only ever key the `lift_` bones, the engine only ever turns `mid` and `apex`. `adopt_fouler.py` gives a model with no skeleton a spine, lips, toes and feelers, with clips that use bone scale. `adopt_mourner.py` rigs trailing tatters. Bone names must not contain `:` (Godot uses it in animation paths), so Tripo's `tripo::` and Mixamo's `mixamorig:` prefixes are renamed away. `python3 tools/inspect_model.py actors/thing.glb` reports size, triangles, textures, skeleton and clips, and lists what needs fixing.

**Outside furniture** (Tripo, Meshy): `tools/blender/adopt_props.py` holds one line per outside model: kit, id, source file (in `kits/<kit>/source/`, which Godot ignores), the name Identify shows, and options (`height`, `width` or `fit` in metres; `yaw` if it does not already face front; `tris`; `tex`). Running it stands each model on the ground at its middle, scales it, thins it to about 9,000 triangles, shrinks its textures to 2K JPEG, writes `kits/<kit>/models/ext/<id>.glb`, and puts a `"models"` entry in the kit's `kit.json` with a `solid` measured from the model. The model keeps its own textures. Giving a model the id of a code-built placeholder replaces that placeholder everywhere.

## 9. Testing

```
godot --headless --path maze3d -- --level=<id> --selftest
godot --headless --path maze3d -- --level=gen:rooms:<theme> --seed=N --selftest
godot --headless --path maze3d -- --level=anomalous --selftest --story
```

The self-test plays a level by script and prints `PASS` / `FAIL` / `INFO` lines, then `RESULT  n failures`, and exits with the number of failures. `tests/selftest.gd` (`SelfTest`) is the runner; each feature is a part (`SelfTestPart`, `tests/part.gd`) in `tests/<feature>_test.gd`, run in this order: `schema`, then `movement`, `reach`, `traps`, `identify`, `arches`, `actors` (with `off_duty` on an off-duty floor and `covers_all` on a level that says so), `use_key`, `containers`, `pickups`, `doors`, `finish`. A level can bring its own test beside its level file, `games/<game>/levels/<id>_test.gd`; if its `replaces_standard()` says so it runs instead of the standard parts: the bunker always (rooms, every working piece of furniture, banking and what goes on show, the repair, buying, placing on floor and wall, taking back, the vault door, the lift's destinations, the outfit, and that a reload finds it all as it was left), the Anomalous Structure with `--story` (the intended route: both ways past the Sphinx Gun and the Monoid, the darts, the memo and locker 4, the three cards, the executive desk and safe, both lifts, the tubes, the mist, ENDURANCE, the tripwire, the Security Station, the Repair Bay, the emitters and the field, closing the agency, seizing the core, leaving, and what is banked). Tests use public methods only.

On a level with `"covers_all": true` the self-test fails if any style, prop, door, monster or item in the game is not on the floor; on an off-duty floor it also checks that every kind of monster talks, lands an attack on a target, hurts nobody, that one called from the range walks there and back, and that a shut station shuts again. `LM_RANGE_ONLY=1` goes straight to the range; `LM_RANGE_ACTOR=<id>` picks who is called; `--verbose` prints a fight's state every 150 frames.

**Known flaky checks** (in the test, not the game; they come and go from run to run because physics steps follow real time): a monster can outlast the 900-frame fight limit (a fleeing Monoid, a Ceiling Turret on generated seed 11, the Princess); the test sometimes finds no spot to stand to fight a monster in a tight corner; a scanner arch walked through while something is attacking may not register; a monster wandering an upstairs room can be caught standing at the edge of its lift shaft by the "other storeys" check.

## 10. Recipes

**A new monster.** Model and rig it in Blender facing the front view, with the five clips as NLA tracks; export `.glb` into `actors/` (include animations; +Y up). Or add a function to `tools/blender/actors.py` and run `build_all.py -- <name>`. Add an entry to `games/havenot/defs/actors.json`. Place it with `{ "actor": "<id>" }`. Use the kit's material names and it is lit and worn like everything else. Run `tools/levels/staffonly.py` so the test floor has it.

**A new wall, floor or ceiling.** One mesh at the sizes in 2.1, exported to `kits/hightech/models/`; an entry under `tiles` in `kit.json`; its id in one or more styles' lists with a weight.

**A new door.** Frame as one object, each moving piece as its own, a `lock` material where it should show its state; an entry under `models` with `type: "door"` and `parts`; use it from a level legend: `{ "door": "<id>" }`.

**A new machine or terminal.** A model under `models` with `solid`, and optionally `parts`, `spin`, `light`, `screen`; what it does is in the level entry's `use`.

**A new treasure or pickup.** A small model centred on its middle; an entry under `models`, and one in `defs/items.json`.

**A new trap kind.** Add a branch to `engine/trap.gd` (`setup` builds it, `_process` runs it) and call `pl.hurt(...)`; add its keys to section 4.5 and to `Schema`.

**A new effect.** `EffectRegistry.register("<type>", handler)` from the part of the engine it belongs to (section 5.2); document it in section 4.10.

**A new kind of level thing.** `Spawner.register_kind(...)` (section 5.4); document it in section 4.5 and add its keys to `Schema.THING_KINDS`.

**A new def key.** Read it in the engine, document it in section 3, add it to `Schema`.

**A new kit.** Section 2.4's last paragraph.

**Replacing a generated model with a hand-made one.** Save over the `.glb` (and stop the script from rewriting it by removing its entry from `tiles.py` / `props.py` / `actors.py`), or keep both: give yours a new file name and point the id at it in `kit.json`.

## 11. Known limits

- Collision is the grid: walls are cell boxes, floors are flat (ramps are slopes on cells).
- Path-finding is A* over cells. Big props block a cell; small ones are walked round by sliding.
- Lights are omni lights from tiles and props. Shadows come from ceiling lights; many shadowed lights in view will cost on a weak GPU (a style's `lights.shadows: false` turns them off). `--lights` counts a level's lights.
- Tiles are batched per 6 × 6 cells; there is no occlusion culling yet, so very large levels draw more than they need to.
- No save inside a level (the bunker is what lasts), one level at a time, one faction.
