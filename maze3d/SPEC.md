# maze3d: technical reference

Engine 0.1 · November 2026 · Godot 4.4+ (GDScript)

## 1. Shape of the thing

```
project.godot            maze3d/game in Project Settings names the game to boot
engine/                  lm.gd (autoload LM: registry), game.gd (autoload Game: run state, effects),
                         main.gd, level.gd, player.gd, enemy.gd, projectile.gd, door.gd, prop.gd,
                         pickup.gd, trap.gd, hud.gd, fx.gd, selftest.gd, shaders/
kits/<kit>/              kit.json, generated.json, materials.json, models/*.glb
actors/                  rigged monsters (*.glb)
games/<game>/            game.json, defs/*.json, levels/*.json
generators/              <name>.gd
tools/                   blender/ (model scripts), levels/ (level scripts)
```

At start `LM.boot(game)` reads `games/<game>/game.json`, loads the kits it lists, merges every defs file into `LM.defs[kind][id]`, reads the levels and instantiates the generators. `main.gd` then builds a `Level` from a level dictionary and puts a `Player` in it.

Units are metres. Godot's axes: Y up, and on the map **north is −Z** (row 0 of a map is the north edge), east is +X.

Physics layers: 1 world (walls, doors, props), 2 player, 3 actors, 4 pickups.

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

`kind` is `floor`, `wall` or `ceiling`. A tile is **one mesh object** (several materials are fine); tiles are drawn in batches with MultiMesh. `light` puts an omni light at `at` (tile space, Godot axes) wherever the tile is used.

Sizes, in Blender terms (Z up, metres):

| Kind | Occupies | Notes |
|---|---|---|
| floor | x, y in [−2, 2]; top surface at z = 0 | Detail may go below 0 (grates, trenches). Keep what you walk on within 2–3 cm of 0: collision is a flat plane. |
| ceiling | x, y in [−2, 2]; underside at z = 0 | Detail goes up from 0 (ducts, trusses) and may hang down (cables). The engine lifts it to the room's height. |
| wall | x in [−2, 2], z in [0, 4]; its face on the plane y = 0, **looking at −Y** | Thickness goes behind the face (+Y), up to 0.3. Relief may come up to 0.15 into the room. |

### 2.2 Styles

A style says which tiles a room is built from. Lists are `[tile, weight]` pairs.

```json
"styles": { "lab": {
  "floor":   [["floor_glow", 2], ["floor_plate_b", 4]],
  "wall":    [["wall_hex", 3], ["wall_screen", 2], ["wall_light", 1]],
  "wall_upper": [["wall_plain_a", 1]],                  // optional: second storey and above
  "ceiling": [["ceil_plain", 4], ["ceil_ducts", 1]],
  "lights":  { "tile": "ceil_light", "every": 2, "flicker": 0.15, "dead": 0.1, "dead_tile": "ceil_plain",
               "energy": 1.0, "shadows": true } } }
```

`lights` puts the light tile on every `every`th cell of the ceiling. `flicker` is the share of lights that are failing; `dead` the share that are out (and get `dead_tile`).

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
- **`walk`** and **`opening`**: makes the model a **scanner arch** (section 4.1).
- **`mount: "wall"`**: the model is built like a wall tile (face on y = 0, looking at −Y) and the engine hangs it on a wall of its cell.
- **`screen`**: where a placement's `screen` text is drawn.
- **`light`**, with `pulse` for a slow throb.

Doors fill a whole cell cross-section: 4 wide, 4 high, the opening centred. The frame is one object (any name); every moving piece is its own object. A material called **`lock`** on a door (or a key card) is recoloured by the engine: the lock's colour while locked, cyan when open.

### 2.4 Materials

Models carry material **names** only. `materials.json` gives each name a look:

```json
"hull":      { "color": [0.74,0.74,0.70], "metal": 0.15, "rough": 0.45, "shader": "worn", "grime": 0.55 },
"glow_cyan": { "emit": [0.2,0.9,1.0], "energy": 4, "shader": "glow" },
"glass":     { "color": [0.45,0.85,0.9], "alpha": 0.22, "shader": "glass" }
```

`shader` is one of `worn` (hard surfaces; grime, streaks and scuffs from position, so nothing repeats and no UVs are needed), `screen` (a live display), `glow`, `glass`, `flesh`, or absent for a plain material. A name the kit doesn't list keeps whatever material the model file has, textures included, so a fully textured hand-made model works too.

The high-tech kit's names: `hull`, `hull_dark`, `trim`, `floor`, `accent` (orange), `accent2` (teal), `hazard`, `rust`, `rubber`, `cable`, `copper`, `gold`, `chrome`, `glass`, `screen`, `screen_dead`, `glow_cyan/pink/amber/red/green/white/violet`, `lock`, and for creatures `flesh`, `flesh_pale`, `chitin`, `chitin_red`, `bone`, `eye`, `eye_red`, `slime`.

**Borrowing.** `"uses": ["hightech"]` in `kit.json` brings in another kit's tiles, models and styles. Borrowed models keep their own kit's materials, so a level whose kit is `agency` can have high-tech rooms and Agency rooms side by side, each looking as its kit meant. The Agency kit (`kits/agency/`: porcelain, onyx, rose gold, pink neon; styles `showroom`, `white_hall`, `focus`; furniture `ag_desk`, `ag_pedestal`, `ag_kiosk`, `ag_sofa`, `ag_pod`, `ag_planter`; an `ad` shader for its displays) is built this way.

**A kit for somewhere that isn't high-tech** (a crypt, a cave, a frontier town) is a new folder with its own `materials.json` (stone, wood, moss; add a shader to `engine/shaders/` and to `SHADERS` in `lm.gd` if the material itself is new), its own tiles at the sizes above, and its own styles. Nothing in the engine assumes metal panels; `Level` only asks the kit for tiles by style.

Glow materials take `pulse` (breathing, 0..1) and `flicker` (failing, 0..1): flames and furnace mouths use both.

## 3. Game data

### 3.1 `game.json`

`id`, `title`, `tagline`, `theme.accent`, `kits`, `defs` (files), `levels` (files), `generators` (names), `generator_params`, `start`, `menu` (levels on the title screen), `player` (`hp`, `speed`, `jump`, `fov`, `weapons`, `ammo`, `lamp`, `dash_cooldown`, `sensitivity`), `words` (`death_title`, `death_text`, `end_title`).

### 3.2 Weapons, ammunition, projectiles (`defs`: `weapons`, `ammo`, `projectiles`)

| Weapon field | Meaning |
|---|---|
| `name`, `model`, `kit`, `hold`, `scale` | The kit model held in view, where (camera space), how big. |
| `ammo`, `per_shot`, `pickup_ammo` | An `ammo` id, or `null` for unlimited. |
| `damage`, `pellets`, `spread` (degrees), `rate` (shots/s), `auto` | |
| `range`, `falloff` | Hit-scan reach; damage lost at full range (0–1). |
| `projectile` | Fires this instead of a hit-scan ray. |
| `recoil`, `kick`, `sound`, `color`, `kind` | Feel; `kind` is the damage type actors' `takes` reads. |

Projectile: `speed`, `radius`, `color`, `light`, `gravity`, `kind`, `blast: { radius, damage }`.

### 3.3 Actors (`defs`: `actors`)

| Field | Meaning |
|---|---|
| `name`, `model` (path from the project root), `kit`, `scale` | |
| `hp`, `armor` (0–1), `takes: { blast: 1.6 }`, `mass` | |
| `speed`, `accel`, `radius`, `height`, `center`, `eye` | The body is a capsule; `center` is its middle's height (default half the height). |
| `fly`, `mount: "ceiling"` | Ignores gravity; hangs from the ceiling. |
| `sight`, `hearing` | It notices you in sight (or behind it, close), when shot, or when it hears a shot. Noticing wakes friends within 10 m. |
| `behavior` | `chaser`, `skirmisher` (holds `keep: [min, max]` and strafes), `turret`. |
| `attacks` | Tried in order. `{ type: "melee", damage, range, windup, recover, cooldown, knock }` or `{ type: "ranged", projectile, damage, range, min_range, burst, burst_gap, spread, lead, muzzle, windup, recover, cooldown }`. |
| `flee_below`, `flee_text` | Runs when its health falls under this fraction. |
| `barks`, `bark_color` | Words that float over it. |
| `drops: [{ item, chance }]`, `explode: { radius, damage }` | |
| `sounds: { alert, hurt, die }`, `blood` (spark colour), `clips`, `walk_rate` | `clips` renames animations: `{ "walk": "scuttle" }`. |

**The model** is any rigged glTF with an AnimationPlayer and clips named `idle`, `walk`, `attack`, `hurt`, `die` (Blender NLA tracks; name the looping ones `idle-loop`, `walk-loop` and Godot imports them as loops called `idle` and `walk`). It **faces Blender's front view (−Y)**, stands on z = 0, origin between its feet (for a ceiling mount: origin on the ceiling, hanging down). `attack` should land its blow at about the attack's `windup` time. `die` ends in the pose the body is left in.

An actor with `"dormant_clip": "<clip>"` plays that clip instead of idle until something wakes it (the Deadbot stands switched off; give it a short `sight` and `hearing`). Clips beyond the standard five are simply extra NLA tracks in the `.glb`.

#### Behaviors that go with a personality

Three things an actor def can switch on. They are engine features, so any model can use them.

**Off duty** (`lounge`). What it does until something wakes it, in place of standing idle:

```json
"lounge": [{"clip": "lean", "at": "wall"},
           {"clip": "smoke", "at": "wall", "smoke": true, "every": 6},
           {"clip": "sit", "at": "floor", "drop": -0.6}],
"startle_time": 0.6, "startle_text": "I WAS ON BREAK"
```

One entry is picked when the level is built; a level entry can name it (`{"actor": "monoid", "lounge": "sit"}`, or `"lounge": "none"`). `"at": "wall"` backs the actor up against a wall of its cell (`gap` = how far off it), facing the room; `face` on the level entry chooses the wall. `drop` moves the part that can be shot to where the body now is. `smoke` puffs every `every` seconds. When it wakes it plays the clip `startle` for `startle_time` before it does anything: that is the player's free shot.

**Pounce** (an attack of `"type": "pounce"`):

```json
{"type": "pounce", "range": 12, "min_range": 4, "windup": 0.5, "clip_windup": 0.3, "speed": 18,
 "damage": 20, "knock": 9, "recover": 0.35, "recover_miss": 1.0, "cooldown": 5}
```

It gathers itself for `windup` (the tell: the first `clip_windup` seconds of the clip `pounce`, stretched to fit), is then thrown at where the player will be, and cannot steer. The end of the clip is held in the air. A hit does `damage`; a miss leaves it sprawled for `recover_miss`. It works from a wall or the ceiling too.

**Walls and ceilings** (`climb`):

```json
"climb": {"speed": 7.5, "ceiling": true, "perch": 0.55, "chance": 0.6, "min_dist": 6,
          "drop_at": 1.8, "drop_damage": 5, "off": 0.3}
```

`perch`: how often one starts a level waiting on a wall (head down) or the ceiling; a level entry can say `"perch": "wall" | "ceiling" | "floor"`. Awake on a wall it runs up to the ceiling or down to the floor; on the ceiling it follows the route it would have walked and lets go above the player (`drop_at`, metres), at a door, or where the ceiling changes height. `chance`: how often, hunting on foot and still `min_dist` away, it takes to the nearest wall instead. Shooting one usually knocks it off. With a pounce attack it will jump at the player straight off the wall. The walk clip is used on every surface; `off` is how far from the surface its feet are.

**Scuttling** (`gait`): `"gait": {"burst": [0.25, 0.7], "pause": [0.05, 0.18], "fast": 1.3, "weave": 0.35, "weave_rate": 9}`. It moves in darts with dead stops between and does not come straight at the player.

**Swimming** (`swim`): `"swim": {"clip": "swim", "speed": 9, "sink": 0.35}`. In fluid it plays that clip instead of walk and idle, moves at `speed`, and rides `sink` metres lower. Fluid is part of a level: a legend entry with `"fluid": true` floods its cells (`"~": {"fluid": true}`), and the level's `"fluid": {"level": 0.7, "color": [r, g, b, a], "glow": 0.3}` sets the surface. It is shallow: the player wades at 0.62 speed and anything without `swim` is slowed.

#### Models from elsewhere (Tripo, Meshy, hand-made)

Any rigged `.glb` in `actors/` works. To give one clips, `tools/blender/adopt.py` loads it, renames bones and takes clips written as keyed poses; `adopt_roach.py`, `adopt_monoid.py` and `adopt_glorexx.py` are the three worked examples (sources in `actors/source/`). Bone names must not contain `:` (Godot uses it in animation paths), so Tripo's `tripo::` and Mixamo's `mixamorig:` prefixes are renamed away. `python3 tools/inspect_model.py actors/thing.glb` reports size, triangles, textures, skeleton and clips, and lists what needs fixing. Def keys that adapt a foreign model: `"own_materials": true` (keep its textures; do not look its material names up in the kit), `"scale"`, `"model_yaw"` (degrees, if it faces the wrong way), `"model_y"` (if its feet are not at 0), `"clips": {"walk": "TheirClipName", ...}` (the engine's names are idle, walk, attack, hurt, die, and optionally pounce, startle, and whatever `lounge` and `dormant_clip` name). Idle, walk and lounge clips are looped by the engine whether or not the file says so.

### 3.4 Items (`defs`: `items`)

`name`, `kind` (`treasure` with `value`; `health`, `armor` with `amount`; `ammo` with `ammo`, `amount`; `key` with `color`; `weapon` with `weapon`), `model`, `scale`, `glow`, `sound`, `effects`, `flag`. Item models are centred on their own middle.

### 3.5 Sounds (`defs`: `sounds`)

All synthesised at start-up: `freq`, `to` (glide), `dur`, `wave` (`sine`, `square`, `saw`), `noise` (0–1), `decay`, `gain`, `lowpass` (0–1), `vibrato`.

## 4. Levels

A level is a dictionary: a JSON file in `games/<game>/levels/`, or what a generator returns.

```json
{ "id": "deepworks", "name": "...", "kit": "hightech", "style": "corridor", "height": 1,
  "intro": "...", "ambient": [0.22,0.28,0.36], "ambient_energy": 0.55, "fog": { "color": [...], "density": 0.014 },
  "legend": { "B": { "door": "door_jaw", "lock": "blue", "tag": "blue_door" } },
  "map": ["#####", "#...#", "#####"],
  "rooms": [{ "name": "Reactor Hall", "rect": [23,1,7,9], "style": "machine", "height": 2 }],
  "tags": { "ambush": [[4,7],[5,7]] },
  "things": [{ "at": [15,24], "start": true, "face": "n" }, { "at": [3,20], "actor": "glorexx", "still": true }],
  "objectives": [{ "text": "Find the BLUE card.", "done": "key_blue" }],
  "triggers": [{ "on": { "type": "flag", "name": "got_red" }, "do": [{ "type": "alarm" }] }],
  "player": { "weapons": ["handgun"] } }
```

**The map.** One character per cell. Built in: `#` solid, space void, `.` floor, `+` a `door_split`. A legend entry is `{ solid, door, lock, flag, need, sealed, jammed, style, tag, start, face }`. A cell takes its style and height from the first room whose `rect` (`[x, y, w, h]`) contains it, else the level's. The builder puts a floor and ceiling on every open cell and a wall on every side that meets a solid cell (and above the opening where a tall room meets a lower one), picks tiles from the style with a seeded generator (the level's `id` and `seed`), and gives every solid cell beside an open one a collision box.

**Doors** must close an opening from wall to wall. A door cell without solid cells on both flanks is left out with a warning (and counted in `Level.bad_doors`; the self-test fails on it). **Doors** run across the corridor they close: across when the cells west and east are solid, otherwise turned. `lock` is a key colour (`red`, `blue`, `yellow`); `flag` (a story flag, or a list: any) keeps it shut until set, with `need` as the words; `sealed` shuts it until an `unlock` or `open` effect; `jammed` makes it grind and spark. Doors open for the player and for anything that is hunting them.

**Things** (`things`, with `at: [x, y]` or `tag`; or an `objects` grid with an `objectLegend`, as in the 2D engine). Every one takes `offset: [dx, 0, dz]`, `face` (`n e s w`: the way its front looks) and `tag`.

| Entry | Extra fields |
|---|---|
| `start: true` | Where the player begins. |
| `actor: id` | `still` (doesn't wander), `alert`, `hp_mul`, `on_death` (effects). |
| `prop: model` | `use`, `hp`, `loot`, `explode`, `screen` (text on its display), `solid`, `blocks`, `lit`, `turn`. |
| `item: id` | Any item field, to override it for this one (`color`, `value`, `flag`). `y` for its height. |
| `trap: kind` | `laser` (`cycle: [on, off]`, `heights`, `damage`, `axis`), `shock` (`period`, `damage`), `vent` (`period`, `on`, `damage`, `color`); all take `off` (a flag that disarms it) and `phase`. |
| `sign: text` | Lettering on the wall behind it: `size`, `color`, `y`. |
| `light: {color, energy, range}` | A loose light: `y`, `flicker`, `shadows`. |

**Using a prop** (`use`): `prompt`, `when` (flag needed; `locked` says why not), `once`, and a `type`:

- `terminal` / `read`: a panel that stops the game. `kicker`, `title`, `text`, `options: [{ label, effects, result, when, unless, once, hack (seconds), working, screen, close }]`. `result` replaces the text; `screen` changes the prop's display.
- `cache`: opens its lid and throws out `loot: [item entries]`.
- `heal`: `charges`, `amount`.
- `locker`: swings its door open, once. `loot: [item entries]` come out to be taken; `actor` + `count` put monsters in front of it, awake (`text` is what the game says); `effects` run with the locker as their place (an `explode` goes off there). None of them: it is empty. A placement's `rattle: true` makes the door shiver and knock while you are near, the tell for something alive inside. The kit has two models: `locker` and `locker_bad` (dented from inside, leaking).
- `effects` (default): runs `effects`.

### 4.1 Scanner arches

A prop whose model has `walk` (the kit's `arch_medical`, `arch_security`, `arch_supply`, `arch_toll`) does something when the player crosses its opening. The symbol on its header and the colour of its lights say which kind it is; the lights go grey when it is spent. The kit gives each a default `walk`; a placement's `walk` overrides any field.

| Field | Meaning |
|---|---|
| `effects` | What happens (any effects). |
| `need` | `hurt` (only if below full health) or `armed` (only if carrying more than the first weapon). Otherwise `idle_text` is shown. |
| `when`, `unless` | Story flags. |
| `cost`, `fail` | Credits taken to pass; `fail` effects run if you can't pay. |
| `charges`, `empty_text` | How many times it works. |
| `once`, `cooldown`, `sound`, `color`, `kind` | |

Shipped: **medical** (green cross: heals 30, three times), **security** (red eye: an armed visitor sets off the alarm and a turret drops in, once), **supply** (cyan bolt: half a load of every ammunition, twice), **toll** (amber coin: 15 cr, or a shock). A `disable` effect on an arch's tag switches it off. They stand free; face them along the way people walk (`face: "s"` for a north–south passage).

**Effects** (triggers, terminals, items, `on_death`): each is `{ type, delay, ... }`.

| Type | Fields |
|---|---|
| `message` | `text`, `kind` (`info`, `warn`, `good`, `loot`, `key`) |
| `flag` | `name` |
| `unlock`, `open`, `seal`, `close` | `tag` (doors). `open` also holds it open. |
| `spawn` | `tag` (cells), `actor`, `count`, `as` (a tag for what it spawns); `here: true` spawns where the thing that ran the effect is |
| `ammo` | `amount`: a share of a full load, for every kind |
| `explode` | `radius`, `damage`, at the thing that ran the effect |
| `lights` | `room`, `on`, `color` |
| `alarm` | `radius` (everything, without it) |
| `enable`, `disable` | `tag` (traps) |
| `credits`, `key`, `heal`, `hurt`, `quake`, `sound` | `amount` / `color` / `strength` / `id` |
| `end` | `title`, `text`: the level is finished |

**Triggers**: `{ on: { type, name }, once, when, unless, do: [effects] }`. Types: `walk` (a tagged arch walked through), `flag` (set), `room` (first entered, by room name), `enter` (a tagged cell), `clear` (every actor with that tag dead), `use` (a tagged prop used), `pickup` (a tagged item taken). Taking a key card sets `key_<colour>`.

**Objectives**: the HUD shows the first whose `when` holds and whose `done` (a flag, or any of a list) is not yet set.

## 5. Generators

A generator is a script in `generators/` with one function, listed in `game.json` `generators`:

```gdscript
func generate(seed: int, params: Dictionary) -> Dictionary   # a level dictionary, as in section 4
```

`params` is the game's `generator_params`. `game.json` may also hold `generator_themes`: named sets of overrides (`title`, `place`, `kit`, `corridor`, `styles`, `doors`, `props`, `style_props`, `actors`, `boss`, `exit_prop`, `size`, `rooms`). Each theme gets its own title-screen entry and runs as `--level=gen:<name>:<theme>`. `style_props` maps a room style to the furniture that belongs in it, so a mixed level puts bunks in barracks and coffins in chapels. Each generator appears on the title screen; `--level=gen:<name> --seed=N` runs one from a terminal. `--calm` stops anything noticing the player (for looking); `--trace` prints every actor's change of state. `rooms.gd` (rooms, L-shaped corridors, doors on thresholds only (placed after all carving, so no door is ever left standing in a widened opening), scanner arches inside some doorways, wall lockers with loot, nothing, roaches or a charge, a red card and a vault door before the last room, monsters and treasure from weighted lists) is deliberately small. Because a level is plain data, a generator can also be written outside Godot: the 2D installation generator (`editor/gen/`) could emit this format from the same lists.

## 6. Recipes

**A new monster.** Model and rig it in Blender facing the front view, with the five clips as NLA tracks; export `.glb` into `actors/` (include animations; +Y up). Or add a function to `tools/blender/actors.py` and run `build_all.py -- <name>`. Add an entry to `games/havenot/defs/actors.json`. Place it with `{ "actor": "<id>" }`. Use the kit's material names and it is lit and worn like everything else.

**A new wall, floor or ceiling.** One mesh at the sizes in 2.1, exported to `kits/hightech/models/`; an entry under `tiles` in `kit.json`; its id in one or more styles' lists with a weight.

**A new door.** Frame as one object, each moving piece as its own, a `lock` material where it should show its state; an entry under `models` with `type: "door"` and `parts`; use it from a level legend: `{ "door": "<id>" }`.

**A new machine or terminal.** A model under `models` with `solid`, and optionally `parts`, `spin`, `light`, `screen`; what it does is in the level entry's `use`.

**A new treasure or pickup.** A small model centred on its middle; an entry under `models`, and one in `defs/items.json`.

**A new trap kind.** Add a branch to `engine/trap.gd` (`setup` builds it, `_process` runs it) and call `pl.hurt(...)`.

**A new kit.** Section 2.4's last paragraph.

**Replacing a generated model with a hand-made one.** Save over the `.glb` (and stop the script from rewriting it by removing its entry from `tiles.py` / `props.py` / `actors.py`), or keep both: give yours a new file name and point the id at it in `kit.json`.

## 7. Rebuilding the generated models

```
pip install bpy          # or use Blender itself:  blender -b -P tools/blender/build_all.py
python3 tools/blender/build_all.py              # everything
python3 tools/blender/build_all.py -- roach wall_pipes
```

`mz.py` is the modelling library: `Mesh` (boxes with bevels, cylinders, balls, prisms, lathes, tubes along a path, rings; `m.bone = "name"` binds what follows to a bone, and a tube can blend along a chain), `Rig` (bones, `clip(name, length, keys)` with rotations given in model space) and `export`. `tiles.py`, `props.py` and `actors.py` are the models; `palette.py` is the materials.

## 8. Known limits

- Collision is the grid: walls are cell boxes, floors are flat. Ramps, stairs and balconies need engine work (rooms can be two or more storeys tall, but only as open space).
- Path-finding is A* over cells. Big props block a cell; small ones are walked round by sliding.
- Lights are omni lights from tiles and props. Shadows come from ceiling lights and the player's lamp; many shadowed lights in view will cost on a weak GPU (a style's `lights.shadows: false` turns them off).
- Tiles are batched per 6 × 6 cells; there is no occlusion culling yet, so very large levels draw more than they need to.
- No save, one level at a time, one faction.
