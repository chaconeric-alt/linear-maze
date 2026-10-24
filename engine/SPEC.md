# The Linear Maze engine — technical spec

Engine 0.5.7 · October 2026

The Linear Maze engine runs fast, top-down 2D games in a browser: lit, shadowed floors built from ASCII maps, shooting and dashing, people to talk to, traps, chests and story flags. It knows nothing about any particular game. A game is a folder of **asset packs** (floors, monsters, items, tile sets, furniture, people, stories) plus a **manifest** that names the packs it loads and sets its title screen.

This document is the engine's reference: how it is built (sections 4 and 5), how content is written (6 and 7), the look (9), its limits (10), the editor's saved format (15), and games, packs and the loader (21). It is written to be handed to a collaborator, or to Claude, so sections 6, 7, 15 and 21 are precise.

Section numbers match the one-file spec of 0.4 and earlier, so old references still land in the right place. The sections about one game (1–3, 8, 11, 12, 14 and 16–20) moved to that game's own `SPEC.md`; for The Linear Maze that is `games/linear-maze/SPEC.md`.

**New in 0.5:** the engine, the games and the editor are three separate folders. Each game has its own folder under `games/` with a `game.js` manifest (title screen, words on the engine's screens, the packs it loads, its save slot) and its packs in folders of their own, each described by a `pack.js`. Any game can load any other game's packs, all of them or a few, with or without their floors. `engine/loader.js` reads the manifest and loads what it lists; `tools/package.mjs` (or the editor) writes a game for players with only the files it needs. See sections 4 and 21.

**New in 0.5.1:** floors remember how you left them, and the stairs you arrived by take you back up (section 5, *Stairs* and *Saving*; `engine/memory.js`). Elevators run through every floor they stop at, in the same place and the same way round on each (section 6.15; `engine/elevators.js`); the editor places and edits them on the map's Elevators tab (section 15.5).

**New in 0.5.2:** stairs can lead somewhere of their own, stay locked until a story flag, and land you on a tagged tile (section 5, *Stairs*; a level's `stairs`). Elevators can wait for power and keep a stop locked (section 6.15, `power` and `stops`). Doors can open for a story flag instead of a key: clearance doors (section 6.2). Transmissions: someone speaks over an intercom while the game runs, from a trap or from code (section 6.16; `engine/comms.js`), with a new kind of content, `speakers`. Trap effects a pack defines can describe their settings for the editor (`params`, section 6.8).

**New in 0.5.3:** status effects: timed conditions on the player or an enemy (slowed, chilled, burning, stunned...) that any weapon, projectile, attack, explosion or trap can carry, with resistance from armor and a chip on the HUD (section 6.17; `engine/status.js`, a new kind of content, `statuses`). Named boss bars across the top of the screen, with phases (section 6.5, `bossBar`). More kinds of ammunition than the four built in (section 6.18, `LM.defineAmmo`). Key items: things the player carries from floor to floor and sees in the inventory (section 6.19). An enemy can change its own damage reduction as it fights (`e.armor`) and hear every hit (`onHurt`). `LM.comms.speaking()` says who is talking.

**New in 0.5.4:** factions: who fights whom. Enemies have sides; robots and monsters can fight each other, and an enemy can be on yours (an ally that fights with you and never hurts you, whose health bar and map dot are green). A game sets the table, a floor can change it, a trap or code can move enemies from one side to another (section 6.20). Enemies chasing something other than the player find their way with a short search (`LM.nav.step`, `LM.ai.goTo`), and robots' view cones (`view`) count for every foe. Statuses can count down on the HUD, stack, run code every frame, say how they ended, and be carried up and down the stairs (section 6.17). A `branch` trap effect runs one list of effects or another depending on story flags (section 6.8). A melee swipe or a charge no longer lands through glass or a wall.

**New in 0.5.5:** waves. A `spawn` trap effect can tag what it spawns (`as`), and a `clear` trap waits for a group that appears later, so a sealed arena can send one wave after another (section 6.8). The `faction` effect's `aggro` lets enemies out hunting: they come straight for you. `LM.ai.goTo` takes a search limit, for something that has to cross a whole maze (section 6.5).

**New in 0.5.6:** an elevator with no power can still be parked on one floor (its `parked`): once a flag is set it waits there, lit, doors held open, panel dead, and if you're on that floor when the flag is set it comes up the shaft first and can bring cargo (section 6.15). Gear can keep you alive: armour, gadgets and blessings can have `lastStand`, asked when a hit would kill you (section 4, *Damage*; 6.7). Gadgets can resist statuses like armour, and draw an aura round you all the time (`drawAura`, `shieldRing: false`; section 6.12).

**New in 0.5.7:** objectives: what to do next on the HUD, with the thing to find picked out when you're near it and marked on the minimap (a level's `objectives`; section 6.21, `engine/objectives.js`). Story lines that stop the game: a speaker with `pause` (or a line's own `pause: true`) is read in the middle of the screen with the game stopped, Continue and Skip, unless you're in a fight; the player can turn it off on the pause screen (section 6.16). A long body can have a `hitbox` (a capsule along the way it faces) so shots land on all of it (section 6.5). A side can wake when you hurt it (a pack's `factionWake`: your shots land on it, and it turns on you; section 6.20). Floors remember a monster's hunting and a tag it was given while playing (section 5).

---

## 4. Technology

**Stack:** plain JavaScript, HTML Canvas 2D, WebAudio. No framework, no bundler, no dependencies, no image or audio files. Fonts come from Google Fonts (Major Mono Display, Big Shoulders Display, IBM Plex Mono, Spectral) with system fallbacks.

**Why:** it loads instantly, runs anywhere a browser does, and keeps every piece of content readable and editable as a small text file. All art is procedural (textures are painted by code and cached); all sound is synthesised. Pictures imported in the editor are stored as data URLs in the game's own files.

### The workspace

A workspace is the folder that holds the engine, the games and the editor side by side. Each of the three stands on its own:

| Folder | What it is | Who gets it |
|---|---|---|
| `engine/` | The runtime. Plays any game in `games/`. | Players, inside every packaged game. |
| `games/` | One folder per game: its manifest, its asset packs and its editor changes. | Players get one game and only the packs it loads. |
| `editor/` | The Linear Maze Editor. | Whoever makes games. It can be handed out on its own: it opens any workspace, or any packaged game's folder. |
| `tools/` | `package.mjs`, which packages a game (needs Node; the editor does the same without it). | Developers. |
| `index.html` | A launcher listing every game in `games/`, with Play buttons and a link to the editor. | Developers. |

### Running and building

- **Play from source:** open `index.html` (the launcher) and click Play, or open `engine/index.html?game=linear-maze` directly. Without `?game=`, `engine/index.html` plays the first game in `games/games.js`. Classic `<script>` tags are used (not ES modules), so it all works from `file://`; a local server works too (`python3 -m http.server` in the workspace).
- **Package a game for players:** `node tools/package.mjs linear-maze` (several ids, or `--all`) writes, under `dist/`:
  - `dist/<id>/`: a folder to zip and hand out. Players open its `index.html`. It holds `engine/`, `games/<id>/` and only the packs the game loads (from whichever game they belong to), with the manifest's wildcards written out.
  - `dist/<id>.html`: the same game as one standalone file, every script inlined.
  - `dist/<id>.artifact.html`: that file without the `<html>/<head>/<body>` wrapper, for publishing as a claude.ai Artifact.
  The editor's **Package for players** button (Game page, Settings, or the game list) does the same, including unsaved changes.
- **Debug helpers** (browser console): `LM.debug.warp('ember-foundry')`, `LM.debug.giveAll()` (every weapon, full ammo, all keys), `LM.debug.god()` (no damage), `LM.debug.reveal()` (full minimap). `LM.gameInfo` is the manifest being played and `LM.loaded` what the loader loaded.

### File layout

```
index.html                 the workspace launcher
tools/package.mjs          package a game: dist/<id>/, dist/<id>.html, dist/<id>.artifact.html
engine/
  index.html               the page every game plays in: styles, HUD and title-screen markup, the engine scripts in order, then the loader
  core.js                  LM namespace, content registry, definePack, defineGame, math and colour helpers, event bus
  input.js                 keyboard and mouse state
  audio.js                 WebAudio synth sound library + ambience drone; LM.audio.define()
  level.js                 Level (parses map + legend), flow-field navigation
  physics.js               circle-vs-tile collision, ray casting, visibility polygons
  render.js                renderer: chunk cache, lighting, emissive pass, overlays; LM.gfx helpers
  particles.js             pooled particles; LM.particleTypes
  combat.js                projectiles, damage, healing, explosions, firing weapons
  status.js                status effects on the player and enemies (chilled, burning, stunned...): apply, tick, resist
  player.js                player movement, dash, hazards, weapons, gear-derived stats, ammunition kinds (LM.defineAmmo), key items
  entities.js              Enemy, Item, Door, Lob (mortar shell), AI steering helpers
  npc.js                   NPC (non-hostile people), movement behaviours, speech bubbles, LM.gfx.person
  traps.js                 Trap (trigger + effects)
  memory.js                floors remember how you left them: snapshots of a floor, laid back over it when you return
  objectives.js            objectives: what to do next on the HUD, its targets picked out in the world and on the minimap
  elevators.js             elevators: shafts built into every floor they stop at, the cars, the panel; its tiles and sounds
  ui.js                    HUD, minimap, toasts, room titles, boss bars, status chips, pop-up system, dialog, portraits, title screen, standard screens
  comms.js                 transmissions: lines typed into a panel while the game runs, speakers, the transmission trap effect
  game.js                  Game: loading, update loop, camera, pickups, interaction, saving, boot; LM.useGame, LM.start, LM.text, LM.saveKey
  manifest.js              games and packs: what a game loads and in what order (shared by the loader, the editor and tools/package.mjs)
  loader.js                reads a game's manifest, loads its packs and editor changes, then calls LM.start
  editor-runtime.js        applies a game's editor changes on top of its packs (section 15)
  SPEC.md                  this document
games/
  games.js                 the games in this workspace, in order (the launcher reads it; the editor keeps it up to date)
  <id>/
    game.js                the game's manifest (section 21)
    packs/<pack>/
      pack.js              what the pack is, what it needs, its files in order
      *.js                 its assets: environments, terrain, weapons, enemies, items, people, story code...
      levels/*.js          its floors
    editor/edits.js        everything changed in the editor (section 15)
    editor/sprites.js      pictures imported in the editor
    README.md, SPEC.md     the game's own notes and design spec
editor/                    the Linear Maze Editor (editor/README.md)
```

**Load order** (`engine/loader.js`, and the same order inlined in a single-file build): the engine scripts `engine/index.html` lists, then `games/<id>/game.js`, then each pack in the manifest's order (its `scripts`, then its `levels`), then `engine/editor-runtime.js`, `games/<id>/editor/sprites.js` and `editor/edits.js`, and finally `LM.start(id)`, which fills the title screen from the manifest and boots the game. Within a game, a later pack can change anything an earlier one defined (section 6), and the editor's changes come last of all.

---

## 5. Architecture

### Units and coordinates

- One tile is `LM.TILE = 32` world units. Positions are in world units, with tile `(tx, ty)` covering `[tx*32, tx*32+32)`.
- Speeds are units per second; times are seconds; angles are radians with 0 pointing right and y pointing down.
- The camera shows roughly 1000 × 620 world units on a typical screen (`zoom = min(w/1000, h/620)`), device pixel ratio capped at 2.

### The frame

`Game.loop` runs on `requestAnimationFrame` with `dt` clamped to 50 ms. Hit-stop briefly slows `dt` on heavy hits. Each frame:

1. Global keys (pause, inventory, mute), scheduled timers.
2. Player → enemies → NPCs → doors → items (and popping loot) → pickups → traps → projectiles → timed effects → short-lived lights → particles.
3. Flow field recomputed when the player changes tile (at most every 0.15 s) or a door changes.
4. Line-of-sight polygon from the player (also marks tiles explored for the minimap).
5. Elevators, interaction focus, room titles, the stairs (down, and back up), ambient particles, camera.
6. Render (below), then HUD diff-update.

Pop-ups pause the world (`state = 'popup'`); rendering continues so flames still flicker behind the panel.

### Rendering

1. **Terrain chunks.** The level is baked lazily into 8 × 8-tile canvases at the exact screen scale, painted by each terrain's `bake()` (floors, then contact shadows, then walls and pillars). Blood, scorch marks and debris are painted into chunks as permanent decals. One extra chunk just outside the view is baked on quiet frames so walking never hitches.
2. **Animated terrain:** water ripples, spikes, pressure plates.
3. **Objects**, sorted by y: shadows, items, doors, enemies (only those in line of sight), the player, projectiles, effects, particles.
4. **Lightmap** at half resolution: an ambient fill, then every light added (`lighter`) clipped by its own visibility polygon, then the player's aura and aim cone, then short-lived lights (muzzle flashes, explosions, glowing projectiles). Finally everything outside the player's line of sight is multiplied darker. The lightmap is multiplied over the scene. Steady static lights (no flicker: ceiling panels, windows, screens) are painted once into world-space light tiles of 12 × 12 tiles and reused; a tile is repainted only when a light in it is switched, dimmed or set flickering, or a wall near it changes. Flickering lights are drawn every frame.
5. **Emissive pass** (`lighter`, unaffected by darkness): flames, glints, tracers, beams, telegraphs, eyes.
6. **Overlays:** damage numbers, the interaction ring, crosshair, damage vignette.

Static light polygons are cached and only recomputed when a nearby door opens or closes or a tile changes. Items whose drawing never animates set `cache: true` and are painted once into a sprite (section 6.6), which keeps a room with eighty desks nearly as cheap as a room with eight.

### Collision and movement

Entities are circles. Movement is sub-stepped and resolved axis by axis against solid tiles (rectangles: the whole tile, or a thin tile's boxes turned with the tile; or circles for pillars), so bodies slide along walls. Closed doors are dynamic solids. Solid furniture pushes bodies out. Bullets march in 5-unit steps and stop on anything that blocks shots.

### Enemy AI

Each enemy has one **behaviour** (how it moves) and a list of **attacks** (what it does). Every frame the behaviour writes a desired direction; then the attack system either continues the current attack or starts the first one whose `canStart` passes and whose cooldown is ready. Attacks can override movement (a charge, a nova that roots the caster).

Enemies notice the player by line of sight within `sight` range, by being shot, or by an alarm; noticing wakes friends (of the same faction) within 150 units. Navigation: straight at the player when visible, otherwise downhill on a breadth-first flow field rooted at the player's tile (8-way, no corner cutting). Hazard tiles are avoided; knockback can still throw enemies into pits.

**Who an enemy is after** is its *foe* (`e.foe`; `LM.ai.foe(e, game)`). With the default factions that is always the player, and the rest of this paragraph changes nothing. When the faction table gives an enemy other enemies to fight (section 6.20), it looks round a few times a second for the nearest hostile it can see (within `sight` all round, or within its `view` cone ahead, and with a clear shot: nothing picks a fight through glass), keeps its current foe a little longer than a new one, turns on whoever hurts it, and, once nothing is in sight, keeps after the one it was fighting, or the player if it knows about them. `e.distP` and `e.seeLos` are measured to the foe (behaviours and attacks read them, so every core behaviour and attack fights whatever the foe is); `e.pDist` and `e.pSee` are always the player's (whether the player can see the enemy, for drawing). A foe that isn't the player is chased straight when visible and otherwise by a short search (`LM.nav.step(level, x, y, toX, toY, maxTiles)`, wrapped as `LM.ai.goTo(e, game, x, y, weight)`).

### Damage

`LM.combat.hurt(game, target, amount, opts)` handles all three target kinds. For the player: invulnerability check, shield absorbs first, then armor reduces the rest, then knockback, shake and hit-stop. For enemies: armor reduces damage (the enemy's own `e.armor` if it has one, else its def's; statuses can make it take more), knockback is divided by mass, a damage number floats up, `def.onHurt(e, game, dmg, opts)` hears it, death drops loot. Destructible items lose hit points and break. `opts.status` (an id, or `{ id, seconds }`) puts a status on the target when the hit lands (section 6.17); a status ticking (`opts.type: 'status'`) hurts the player without the screen kick or the short invulnerability a hit gives.

**A last stand.** When a hit would take the player to 0, `LM.combat.lastStand(game, P, opts)` asks what they carry, in order: armour worn, gadgets, blessings. The first whose `lastStand(game, P, opts)` returns true keeps them alive; it sets `P.hp` itself (1 if it doesn't), and does whatever else it does (a cooldown, a blast, invulnerability). Only damage asks: a pit or drowning doesn't.

Explosions damage everything in radius that has a clear line from the centre. The player's own blasts hurt them at 35%, and don't hurt enemies on the player's side. An enemy's blast hurts what its faction fights (only the player, with the default table); barrel blasts hurt everyone. Projectiles and blasts from an enemy carry `faction` and `by` (the enemy), so a hit can be traced back: `opts.by` makes the target turn on its attacker, and a kill by another enemy doesn't count toward the floor's kills.

### People, conversations and story

NPCs (section 6.11) are drawn like the player and never take part in combat. Pressing E on one opens a conversation: a portrait, a few paragraphs and numbered replies, driven by a small node graph. Conversations and furniture read and write **story flags** on the player (`game.setFlag(name)`, `game.hasFlag(name)`). Flags last for the whole run, carry between floors and are saved, so a message on Floor 2 can know that you stole Gary's salmon on the 14th floor. Setting a flag fires `flag` traps, which is how a level scripts a sequence of events from one action (section 6.8).

A level can also change itself while you play: `game.setTerrain(tx, ty, id, tag)` swaps a tile (a window becomes a door, the door becomes wall again), rebakes the chunk around it, re-casts nearby light and refreshes navigation.

### Stairs

A floor's exit stairs (`>`, any terrain with `exit`) lead down to its `next` floor. The first time, the floor's summary screen comes between; once you have been down there, the stairs take you straight there (a quick fade) and the floor below is as you left it.

Its entry stairs (`<`, any terrain with `entry`) lead back up. Stairs under you when you arrive (or when you climb out of a pit onto them) wait until you've stepped off them, so arriving never sends you straight back; walk off and back on to take them. Going up lands you on the stairs down you last took from that floor (or its first ones), and the floor is as you left it. Where they lead (`Game.floorAbove(id)`):
1. the level's `stairsUp`, if it names a floor; `stairsUp: false` closes them (stepping on them says the game's `noWayUp` words);
2. otherwise the floor you came down from (by its stairs down, or by a pack moving you there: a door, a phone); an elevator ride doesn't count, so after riding to Floor 3 its stairs up still go to Floor 2;
3. otherwise, except on the first floor of a run, the floor whose stairs down lead here (its `exitTo`, `next`, or the floor before it in the order);
4. otherwise nowhere.

**Stairs of their own.** A level's `stairs` names stairs by the tag on their tiles and says where they go:

```js
stairs: {
  eastDown: { to: 'basement', until: ['basementOpen', 'master'], locked: 'Sealed: LOCKDOWN.', dir: 'down', go: 'Go down to {floor}: {name}', arrive: 'eastLanding' },
  westUp:   { dir: 'up' },
},
```

| Field | Meaning |
|---|---|
| `to` | Where they lead: for stairs down (`exit`) instead of the floor's `next`, for stairs up (`entry`) instead of the way you came. A floor this game doesn't have (yet) leaves them shut, and stepping on them says `locked` (or the game's `stairsLocked` words). |
| `until` | A story flag, or a list (any of them), that must be set first. Until then stepping on them says `locked` once, until you step off. |
| `arrive` | A tag on the floor they lead to: you arrive on its first tile (otherwise the start, or for stairs up the stairs down you last took). |
| `dir` | `'up'` or `'down'`: the sound (`ascend`, `descend`), for a game whose stairs on go up. |
| `go` | The button on the floor-finished screen (`{floor}`, `{name}`), instead of the game's `descend` words. |

`game.stairsAt(tx, ty)` gives the entry for a stairs tile (with its `tag`), and `game.anyFlag(f)` whether a flag, or any of a list, is set. The stairs down that a floor's `next` leads to and the way back up work as above whether or not a floor has `stairs`; the field only changes the stairs it names.

`game.travel(id, { via, at, leftAt, arrive, sound })` is the quick trip packs can use too: it fades, remembers the floor you're on, and arrives on `id` as you left it (on the tile tagged `arrive`, if given).

### Floors remember how you left them

Leaving a floor by any route (stairs, elevator, or a pack calling `game.loadLevel`) takes a snapshot of it, and coming back lays that snapshot over the freshly built floor (`engine/memory.js`). What you picked up stays gone; monsters you killed stay dead and the rest are where they were, with the health they had; opened chests stay opened with what's left in them; unlocked doors stay unlocked; tiles a trap or script changed stay changed; traps that fired stay fired; switched lights stay switched; the minimap stays explored; rooms already announced aren't announced again; blood and scorch marks stay (the most recent 240); the floor's tally carries on. People keep where they were standing and anything a script changed on them.

Keys belong to the floor they're found on: they don't come with you to another floor (as before), but they're waiting in your pocket when you come back to it.

A monster keeps its side (a `faction` change is part of its props), whether it was hunting, and a tag it was given while playing (a wave's `as`); one far beyond its `leash` when you come back gives up the hunt as usual.

A snapshot keeps an item's, person's or monster's **fields**: its own properties that are plain data (numbers, strings, booleans, and plain objects and arrays of them, up to 2000 characters each), and only those that changed since it was made, plus things that weren't on the map (loot that dropped). A pack whose objects keep their state that way (`it.used`, `it.opened`, `npc.mem.appeased`) is remembered for free. Not remembered: state kept in a `Set`, a class instance or a closure; timers (`game.schedule`) and anything in flight (shots, particles); and anything a pack's `levelLoaded` handler makes, since the handler makes it again on every arrival (the Linear Maze's rotary phones and desk toys). A floor whose map has changed since its snapshot (an edited game) starts fresh.

Packs that need to know: `LM.floorMemory.snapshot(game)` and `game.floors[id]` (the snapshots), `game.above[id]` (the floor you came down from), `game.arrival` (how you arrived on this floor).

### Saving

Each game keeps its own checkpoint in `localStorage`, under its manifest's `saveKey` (by default `lm-save-v1:<game id>`; The Linear Maze keeps `linear-maze-save-v1`, so saves from before 0.5 still continue). It is written on entering each floor: the floor id, the player's state as they arrived (gadgets, story flags and pack data such as the phone's messages and photos), where they arrived, and the snapshots of every floor left behind (`floors`, `above`, `at`). Death restores that checkpoint: the floor as it was when you arrived (fresh, or as you had left it), you where you arrived, the other floors as you left them. The title screen offers Continue when a save exists, and Continue carries the floors' memory too. Content removed from the registry is dropped from saves safely. A snapshot is a few hundred to a few thousand characters (the 14th floor, with 333 things and 31 people, is about 2,300); if the browser's storage is ever full, the checkpoint is kept without bloodstains, then without the floors' memory.

Packs that keep their own progress write through the engine's `LM.saves.read()` / `LM.saves.write(save)` / `LM.saves.clear()`, so they land in the right game's slot (`LM.saveKey()` returns the key).

---

## 6. Content pack reference

Everything is registered through one call:

```js
LM.definePack({
  id: 'catacombs',            // required
  name: 'Catacombs',          // listed on the title screen (the footer's {packs})
  version: '0.1.0',
  environments: { ... }, terrain: { ... }, legend: { ... },
  weapons: { ... }, projectiles: { ... },
  enemies: { ... }, behaviors: { ... }, attacks: { ... },
  items: { ... }, armor: { ... }, blessings: { ... },
  lootTables: { ... }, effects: { ... }, textures: { ... },
  npcs: { ... }, gadgets: { ... },
  levels: { ... }, elevators: { ... }, speakers: { ... }, statuses: { ... },
});
```

NPC movement behaviours are plain functions on `LM.npcBehaviors` (section 6.11) rather than a registry kind.

A pack may be split across several files that each call `definePack` with the same `id` (on disk, a pack folder groups such files; section 21). A later definition with the same kind and id replaces the earlier one, so a pack can also re-skin or rebalance core content. Look-ups go through `LM.get(kind, id)` (throws if missing) and `LM.find(kind, id)` (returns undefined).

Draw functions receive a canvas context already translated (and for most things rotated) into the object's local space, in world units. Colours are CSS strings; helpers live in `LM.util` (`rgba`, `shade`, `mix`) and `LM.gfx` (`glow`, `shadow`, `circle`, `roundRect`).

### 6.1 Environments and textures

```js
environments: {
  catacombs: {
    name: 'Catacombs',
    voidColor: '#050606',          // outside the map
    ambient: '#26302a',            // lightmap base (darker = moodier)
    attractAmbient: '#3e4a42',     // brighter ambient for the title screen
    outsideSight: '#3a3e3a',       // multiply applied outside line of sight
    playerLight: '#f0ffe0',
    torch: '#a8ff7a',              // default colour for torches and braziers
    floor:    { style: 'flagstone', colors: [...], grout, crack, moss, mossAmt },
    floorAlt: { style: 'mosaic', colors: [...], grout },   // used by ',' tiles
    wall:     { style: 'brick', top: [...], mortar, edge, face, faceDark, moss, trim? },
    water:    { deep, shallow, foam },
    pit:      { core, wall, rim },
    slag:     { crust, crust2, glow, hot },                // only if the floor uses slag
    door:     { panel, frame, trim },
    particles: { type: 'mote' | 'ember', color, rate, alpha, drift, windX, windY, size },
    ambience:  { base: 49, cutoff: 220, wind: 340, gain: 0.05, wave: 'sawtooth' | 'triangle' | 'sine' },
  },
},
```

Each environment palette names a painter by `style`. Floor painters in The Linear Maze's Core pack: `flagstone`, `mosaic`, `plates`, `grate`, `marble`, `carpet`. Wall painters: `brick`, `bulkhead`, `ashlar`. Its Office pack adds floor painters `carpet-tile`, `terrazzo`, `bath-tile`, `planks`, `carpet-warped` and the wall painter `drywall`.

An environment can define more than two floors with `floors: { 0: palette, 1: palette, ... }`; a map tile picks one with the legend's `variant`. The office environment has eight: 0 open-plan carpet, 1 lobby terrazzo, 2 restroom tile, 3 pantry wood, 4 executive walnut, 5 damaged carpet, 6 old flagstone, 7 conference carpet. A terrain can paint with another palette by passing it to `LM.paintWall(g, x, y, info, palette)` (the office's stone walls do this). `env.doorStyles` and `env.doorGlows` let a pack draw its own kinds of door (`glass`, `stall`, `odd`), chosen by a door terrain's `door.style`. A new painter:

```js
textures: {
  bonework: { kind: 'floor', paint(g, x, y, info, pal) { /* draw a 32x32 tile at x,y */ } },
  ossuaryWall: { kind: 'wall', top(g, x, y, h, info, pal) {...}, face(g, x, y, fh, info, pal) {...} },
}
```

`info` gives `rnd()` (seeded per tile, so baking is stable), `x`/`y` (tile coords), `n(dx, dy)` (neighbour terrain), `level`, `env`, `variant`. Wall painters get the height of the top face; `LM.paintWall` adds lit lips on exposed edges and a front face where the south side is open.

### 6.2 Terrain

| Field | Meaning |
|---|---|
| `solid` | Blocks movement. With `shape: 'circle'` and `radius`, it is round (pillars). |
| `blocksShots`, `blocksLight` | Stops bullets; stops light and sight. |
| `tall` | Casts a contact shadow on neighbouring floor. |
| `layer` | 0 = ground (baked first), 1 = raised (walls, pillars). |
| `floorLike` | Counts as floor for carpet borders. |
| `hazard` | `'pit'` = fall; any other value hurts: `damage` every `interval` seconds while `active(game, tx, ty)` returns true (or always). `onHurt(game, player)` for effects. |
| `swim`, `speedMul` | Water behaviour; ground that slows. |
| `door: { lock }` | Spawns a Door entity. `lock` is a key colour or null. |
| `plate`, `entry`, `exit` | Pressure plate visuals; level start (and the stairs back up); level end (the stairs down). |
| `light` | `{ color, radius, intensity, flicker }` or `(level, x, y) => spec or null`. |
| `bake(g, x, y, info)` | Painted once into the terrain cache. |
| `drawDynamic`, `drawGlow` | `(g, x, y, tx, ty, game, t)`: lit animation, and emissive animation. |
| `mapColor` | Minimap colour; `'none'` hides the tile. |

| `door: { lock, style, sealed }` | `style` picks a pack-drawn door look; `sealed: true` keeps it shut until something unseals it. |
| `door: { flag, need, color }` | A **clearance door**: it stays locked until the story flag `flag` (or any of a list) is set, then unlocks for good (floors remember it). Flags carry from floor to floor, keys don't. Walking up to it says the game's `doorNeeds` words with `{need}`, and `doorAccepts` when it opens; `color` is its lock stripe and glow. A placement can make any door a clearance door: legend `props: { flag, need, color }`. Monsters can't open one that's locked. |
| `rect: [x, y, w, h]`, `rects: [[x, y, w, h], ...]` | A solid tile that only fills part of its square (thin glass walls, stall partitions); `rects` for pieces made of several boxes (corners, junctions). Only the boxes block movement and shots. |
| `turns` | Whether the tile can be turned (see below). Default: everything except `tall` blocks such as walls. |

**Turning tiles.** A legend entry's `rot` turns its tile clockwise: `0`–`3` quarter turns (`90`, `180`, `270` are read as degrees). The engine turns the tile's painting about its centre, and turns its `rect` / `rects` with it, so collision, shots and light follow what is drawn. Inside `bake`, `info.rot` is the turn and `info.n(dx, dy)` looks at neighbours in the tile's own frame (a turned elbow's painter still asks "is there glass to my east?"). `LM.paintFloor` keeps the floor under a turned piece the same way round as its neighbours; on a plain `floor` tile (`info.turnFloor`) the turn is the floor's own and the pattern turns. Animated drawing (`drawDynamic`, `drawGlow`) is turned too.

**Doors** aren't drawn turned. A door's `rot` says which way it runs: even (`0`, `2`) east–west, odd north–south. With no `rot` the door lines up by itself: it runs east–west when what is west or east of it closes the doorway (a wall, another door, or a thin solid whose boxes reach the door's side of their tile, so a north–south pane beside a door doesn't count but an elbow whose arm points at it does), and north–south otherwise. `LM.Door.runsAcross(level, tx, ty)` gives the answer, and door painters get it as `info.across` (true: east–west).

Core terrain ids (`games/linear-maze/packs/core/terrain.js`): `void`, `wall`, `floor`, `door`, `door-red`, `door-gold`, `door-violet`, `plate`, `water`, `pit`, `spikes`, `slag`, `pillar`, `entry`, `exit`. Office adds `glass-h`, `glass-v` (see-through walls that block movement and bullets but not light or sight), `partition-h`, `partition-v`, their corners and junctions `glass-elbow`, `glass-junction`, `glass-cross`, `partition-elbow`, `partition-junction` and `partition-cross` (drawn one way round: an elbow joins east and south, a junction east, south and west; turn the tile for the rest), `door-glass`, `door-stall`, `door-stall-locked`, `door-odd` (sealed until opened from its pop-up), `stone-wall`, `stone-pillar` and `grand-exit`. The engine itself adds `elevator-wall`, `elevator-floor` and `elevator-door` (section 6.15).

### 6.3 The default legend

| Char | Means | Char | Means |
|---|---|---|---|
| `#` | wall | `$` | gold |
| (space) | void | `*` | glowing crystal |
| `.` | floor | `h` / `H` | health vial / medical kit |
| `,` | room floor (the environment's `floorAlt`) | `a` | shells |
| `+` | door | `c` | chest (common loot table) |
| `R` `Y` `V` | red / gold / violet locked door | `t` | brazier |
| `r` `y` `v` | red / gold / violet key | `T` | wall with a torch (faces the open side) |
| `~` | water | `x` / `b` | crate / explosive barrel |
| `O` | pit | `n` / `-` | table / bench |
| `^` | spikes | `l` | lectern |
| `o` | pillar | `E` | recharge station |
| `_` | pressure plate | `A` | altar |
| `%` | molten slag | `S` | slot machine |
| `<` | entry stairs (player start; back up) | `W` | weapon rack (Scattergun unless overridden) |
| `>` | exit stairs | `U` | armor stand (set `props.armor`) |
| `F` | healing font | `k` / `i` | bones / candles |
| `m` | Drowned Husk | `M` | Brute |
| `f` | Skitter | `p` | Ember Lobber |
| `g` | Cult Gunner | `X` | Sentry Turret |
| `w` | Gilded Warden | | |

A legend entry is `{ terrain, item, enemy, npc, tag, props, variant, rot, start }`. Anything left out defaults: terrain is `floor`, variant is 0, and the tile isn't turned. `rot` turns the tile (section 6.2): `{ terrain: 'glass-elbow', rot: 1 }` is an elbow joining south and west; `{ terrain: 'door', rot: 1 }` is a door that runs north–south whatever is beside it. A level's own `legend` overrides these characters for that floor only, which is how floors give a chest specific contents, tag a door for a trap, or put an item on carpet (`variant: 1`).

### 6.4 Weapons and projectiles

| Weapon field | Meaning |
|---|---|
| `name`, `short`, `slot`, `desc` | Display name, HUD label, sort order, flavour text. |
| `ammo`, `ammoPerShot`, `pickupAmmo` | `null` (unlimited), `'shells'`, `'rounds'`, `'cells'`, `'rockets'`, or a kind a pack adds (section 6.18). |
| `damage`, `pellets`, `fireRate` | Per projectile; projectiles per shot; shots per second (all weapons fire while held). |
| `spread`, `bloom` | Radians; extra spread per point of recoil. |
| `speed`, `range`, `maxRange`, `falloff` | Projectile speed; distance or `'cursor'` (burst where you aim); cap; damage lost at max range (0–1). |
| `pierce` | Extra enemies a projectile passes through. |
| `projectile`, `tracer` | Projectile id; tracer colour override. |
| `aoe: { radius, damage, color, selfDamage }` | Explodes on impact or at range. |
| `knock`, `recoil`, `kick`, `pushback` | Knockback; crosshair bloom; screen shake; shove on the shooter. |
| `sound`, `flash`, `flashRadius`, `flashSize`, `sparks`, `casing`, `smoke`, `muzzle` | Feel. |
| `length`, `drawHeld(g, player, kick)` | How it looks in hand; also used for icons. |
| `status` | A status every projectile carries to what it hits (section 6.17): `'chilled'` or `{ id, seconds }`. |

Projectile fields: `radius`, `color`, `tracer`, `width`, `glow`, `wallSparks`, `sparkColor`, `light: { r, color, intensity }`, `status` (as the weapon's), `quiet` (no sparks, smoke or sound against walls: sprays and mists), and optional `draw(g, p, t)` / `drawGlow(g, p, t)`.

### 6.5 Enemies, behaviours and attacks

| Enemy field | Meaning |
|---|---|
| `name`, `hp`, `speed`, `radius` | Basics. |
| `armor`, `mass` | Damage reduction 0–1; knockback divisor. |
| `accel`, `turn` | Steering responsiveness. |
| `sight`, `leash` | Notice distance; give-up distance. |
| `view: { range, cone }` | A cone ahead of it (half-angle `cone`, radians) it also sees into, out to `range`; with factions it finds foes in it too. |
| `faction` | Its side (section 6.20; default `'monster'`). A placed one can change it in `props.faction`. |
| `ai`, `keep: [min, max]` | Behaviour id; preferred distance for ranged behaviours. |
| `attacks: [{ type, ...params }]` | Tried in order when off cooldown. |
| `drops` | `{ gold: [min, max], goldChance, items: [{ id, chance, props }] }` or a loot table id. |
| `flying`, `swimmer`, `stationary`, `boss` | Ignores hazards; full speed in water; never moves; gold health bar. |
| `bossBar: { name, color, sub(e, game), range, phases }` | A named bar across the top of the screen while it's awake and within `range` (900) of the player; up to three at once. `sub` is a short line beside the name ("9 faces"). `phases: [{ at: 0.5, text, do(e, game) }]` each run once as its health falls past `at` (a fraction); `text` is a toast. |
| `resist: { chilled: 1 }` | Statuses it shrugs off (1) or that last less long on it (0.5). |
| `hitbox: { front, back, r }` | A long body: shots land anywhere on a capsule along the way it faces, from `back` behind its centre to `front` ahead of it, `r` wide from the middle (the radius if left out); scaled with its radius. Without it, a circle of its radius. Movement and walls still use the radius. `LM.combat.touches(e, x, y, r)`. |
| `blood`, `gib`, `deathGlow`, `deathSound`, `bark`, `color` | Feel. |
| `draw(g, e, t)`, `drawGlow(g, e, t)` | Body (in local space, call `g.rotate(e.facing)` yourself) and emissive bits. |
| `init`, `update`, `onDeath` | Hooks `(e, game)` / `(e, dt, game)`. |
| `onHurt(e, game, dmg, opts)` | Every hit that lands, after damage (before death). A behaviour can set `e.armor` (a number, even negative) to change the enemy's damage reduction as it fights: shields up, a weak spot showing. |

Core behaviours: `chaser`, `swarmer`, `skirmisher`, `lobber`, `turret`, `warden`, `boss`. A behaviour is `{ update(e, dt, game) }` that adds to `e.mx`, `e.my` and may scale `e.speedMul`. Helpers: `LM.ai.chase`, `away`, `strafe` (all toward or around the foe), `goTo(e, game, x, y, weight, lim)` (a point, the long way round if need be; it searches out to `lim` tiles, 40 by default, and returns false when there's no way), `wander`, `separate`, `avoidHazards`, `foe` (who it's after), `hostilesNear(e, game, x, y, R)` (everything its blast would hurt).

Core attacks and their parameters:

| Type | Parameters |
|---|---|
| `melee` | `damage`, `range`, `windup`, `recover`, `cooldown`, `knock` |
| `ranged` | `projectile`, `damage`, `speed`, `burst`, `burstGap`, `fan`, `spread`, `lead`, `windup`, `cooldown`, `range`, `minRange`, `moveWhileFiring`, `flash` |
| `lob` | `damage`, `radius`, `flight`, `windup`, `cooldown`, `minRange`, `maxRange`, `indirect`, `color` |
| `nova` | `damage`, `radius`, `windup`, `recover`, `cooldown`, `color`, `shards`, `shardDamage` |
| `charge` | `damage`, `speed`, `duration`, `windup`, `cooldown`, `minRange`, `maxRange`, `stun` |
| `summon` | `enemy`, `count`, `max`, `windup`, `cooldown` |

Every core attack also takes `status`: what the hit puts on its target (`{ type: 'melee', damage: 8, status: 'sedated' }`). Every core attack goes for the foe (the player, without factions); `nova` hurts everything its faction fights inside the ring. A melee swipe or a charge only lands with a clear way between the two (not through glass).

An attack type is `{ canStart(e, a, game), start?(e, atk, game), update(e, atk, dt, game), drawGlow?(g, e, atk, t, game) }`. `atk.t` counts up from 0; set `atk.done = true` to finish.

### 6.6 Items

| Field | Meaning |
|---|---|
| `name`, `radius`, `z`, `shadow`, `shadowScale`, `bob` | Basics and presentation. |
| `solid`, `solidRadius` | Bodies are pushed out (circle). |
| `wallMounted` | Placed on a wall tile, snapped to the open side; `item.face` is the facing. |
| `light` | `{ color, radius, intensity, flicker }` or `(item, game) => spec`. Lights inherit the item's tag (so traps can switch them). |
| `magnet`, `onTouch(item, game)` | Pickups. Return `false` to leave the item (e.g. health at full health). |
| `interact: { prompt, use, available }` | Interactive objects. `prompt` and `available` may be functions of `(item, game)`. `use` usually opens a pop-up. |
| `destructible: { hp, onBreak(item, game) }` | Shootable and blast-able. |
| `init`, `update`, `draw`, `drawGlow`, `drawIcon`, `iconScale` | Hooks; `draw` runs in the item's local space. |
| `mapColor`, `mapAlways`, `isChest` | Minimap marker; keep showing once used; counts toward the chest total. |
| `grant(game, entry, at)` | How a chest hands this item over (default: dropped beside the chest). |
| `solid: 'rect'` | Box collision instead of a circle: set `it.box = [w, h]` and optional `it.boxOff = [dx, dy]` in `init` (desks, counters, tables). |
| `cache`, `cacheRadius`, `cacheKey(item, game)` | Paint `draw` once into a sprite of half-size `cacheRadius` (a number, or a function of the item) and reuse it. Only for drawings that never animate; `cacheKey` returns a string that changes whenever the picture should (a flag, a used state). `drawGlow` still runs every frame. |
| `reach` | Extra interaction range in units (someone behind a desk). |

Placement props every item understands: `ox`, `oy` (a nudge in units, for pieces that sit between tiles), `turn` (quarter turns clockwise, `1`–`3`, for any piece that isn't wall-mounted: the engine turns its drawing, its sprite, its glow, its solid box and, for a piece that spans several tiles, its footprint, which keeps its top-left tile where it was placed; `it.box` and `it.boxOff` stay in the piece's own frame and `it.getRect()` gives the turned box) and, on wall-mounted items, `face: 'n' | 's' | 'e' | 'w'` to choose which side of a wall it hangs on (otherwise the first open side, checked south, east, west, north). Office furniture also takes `dir` (the side its front faces; a piece that reads `dir` draws its own front, and the editor uses `dir` for it rather than `turn`) and, for multi-tile pieces, `w` and `h` in tiles anchored at the top-left tile. Drawing code must take randomness from a seeded generator (`U.mulberry32`, `U.hash2`, `info.rnd`), never `Math.random`, or the piece changes every frame.

**Pop-ups.** `LM.ui.open({ kicker, title, body, actions, wide, dismissable, onClose })`. `body` is a DOM node built with `LM.ui.h(tag, attrs, ...children)`. Actions: `{ label, primary, quiet, key: 'E', disabled, close: false, onClick }`; an action closes the pop-up unless `onClick` returns `false`. Helpers: `LM.ui.icons.weapon/armor/item`, `LM.ui.lootIcon`, `LM.ui.weaponStats`, `LM.ui.modList`, `LM.ui.showText(title, text, kicker)`.

**Loot entries** (chests, `dropLoot`, `grant`): `{ type: 'gold', amount }`, `{ type: 'ammo', ammo, amount }`, `{ type: 'weapon', id }`, `{ type: 'armor', id }`, `{ type: 'key', color }`, `{ type: 'item', id, props }`. A loot table is `{ roll() => [entries] }`; Core has `crate`, `chest-common`, `chest-rich`.

### 6.7 Armor and blessings

Both add numbers to the player's stats. Every stat a modifier can touch:

| Stat | Base | Notes |
|---|---|---|
| `maxHp` | 100 | |
| `speed` | 172 | units per second; floor of 90 |
| `armor` | 0 | fraction of damage ignored after shields; capped at 0.75 |
| `maxShield`, `shieldRegen` | 0, 0 | shield absorbs damage first; regenerates after 2.5 s without hits |
| `lightRadius` | 300 | length of the aim cone; the aura is 42% of it |
| `dashCooldown` | 0.9 | seconds; floor of 0.3 |
| `swimMul` | 0.55 | speed multiplier in water |
| `damageMul` | 1 | |
| `goldFind` | 0 | extra gold from enemy drops |
| `ammoMul` | 1 | ammunition capacity multiplier |

Armor: `{ name, slot: 'head'|'body'|'feet'|'trinket', mods, resist, desc, color, trim, lamp, drawIcon, lastStand }`. `resist: { spores: 1 }`: statuses it keeps off (1) or shortens (0.5); several pieces add up (a gadget's `resist` counts too). Blessings: `{ name, mods, desc, stack, onGrant(game, player), lastStand }`. `lastStand(game, P, opts)`: a hit is about to kill you; return true to survive it (section 4, *Damage*).

### 6.8 Levels

```js
LM.definePack({
  id: 'core',
  levels: {
    'my-floor': {
      name: 'The Drowned Library',
      order: 4,                      // sort order; also used for "Floor N" (the game's words.floor)
      environment: 'cloister',
      next: 'another-floor',         // optional; defaults to the next by order
      intro: 'Shown on the summary screen before this floor.',
      outro: 'Shown instead of the stats when this floor is finished.',
      floorLabel: '14th floor',      // replaces "Floor N" (labelled floors don't take a number)
      armed: false,                  // peaceful floor: no firing, combat HUD hidden, the held gadget is used instead
      loadout: { weapons: [], gadgets: ['phone'], gold: 0 },  // a new run that starts here starts with this
      attractPath: [[x, y], ...],    // title-screen camera path, tile coords (the first floor that has one, unless the manifest names one)
      stairsUp: 'a-floor',           // optional: where its stairs up (<) lead; false closes them; default: the floor you came from (section 5)
      stairs: { tag: { to, until, locked, arrive, dir, go } },   // optional: stairs of their own, by the tag on their tiles (section 5)
      elevatorShift: [dx, dy],       // optional: move every elevator on this floor by whole tiles (section 6.15)
      legend: { /* per-floor terrain overrides */ },
      objectLegend: { /* characters for the objects layer */ },
      rooms: [{ name, rect: [x, y, w, h], note }],   // announced on first entry; first match wins where rects overlap
      traps: [ /* see below */ ],
      objectives: [{ id, text, when, any, not, done, optional, target, map }],   // optional: what to do next (section 6.21)
      ceilingLights: [{ variants: [0, 1], every: 4, offset: [2, 2], color, radius, intensity, flicker, skip, tag }],
      map: [ '#####', '#<.>#', '#####' ],
      objects: [ '     ', ' @ c ', '     ' ],   // optional second layer on the same grid
    },
  },
});
```

Map rows may differ in length (short rows are padded with void). Unknown characters log a warning and become floor.

**The objects layer.** A busy room runs out of characters fast when furniture shares the terrain map, so a level may add `objects`: a second grid of the same size whose characters are looked up in `objectLegend` (which does not inherit the default legend). Spaces and `.` are empty. An entry is `{ item | npc | enemy, props, tag, start }`, or just an id string, which resolves to whatever kind it is registered as (item, then NPC, then enemy). `start: true` marks the player's starting tile. Characters outside ASCII are fine (the office uses `‹ › « » τ σ Ω`).

**Ceiling lights** lay a grid of static lights over every non-solid tile whose floor `variant` is listed, every `every` tiles from `offset`. `skip` (0–1) leaves random gaps; a `tag` lets a trap switch the whole grid.

**Traps** pair one trigger with a list of effects, wired by tag names from the legend:

| Trigger `type` | Fires when |
|---|---|
| `plate` | the player steps onto a tile with the tag (re-arms after `cooldown` if `once: false`) |
| `zone` | the player enters a tagged tile (invisible) |
| `beam` | the player crosses a laser between two tagged wall emitters that face each other across open floor |
| `door` | a door with the tag first opens |
| `pickup` | an item with the tag is taken |
| `clear` | every enemy with the tag is dead: placed with it, or spawned with it (a `spawn` effect's `as`); until there are any, it waits |
| `flag` | the story flag named by `tag` is set (by a conversation, an item or another trap) |

| Effect `type` | Parameters |
|---|---|
| `darts` | `tag` (dart-emitter items), `volleys`, `interval`, `damage`, `speed` |
| `spawn` | `tag` (floor tiles), `enemy` or `enemies[]`, `count`, `faction` (section 6.20), `as` (a tag for what it spawns: a `clear` trap with that tag fires when they're all dead) |
| `seal` / `unseal` / `open` | `tag` (doors), `text` |
| `alarm` | `radius`, `text` |
| `lights` | `tag` (light sources), `on`, `text` |
| `explode` | `tag`, `radius`, `damage`, `stagger` |
| `message` | `text`, `kind` (`warn`, `good`, `key`) |
| `quake` | `strength` |
| `terrain` | `tag` (tiles), `terrain` (new terrain id), `doorTag`, `sound`: change tiles while playing; waits if the player is standing where a solid tile would go |
| `flag` | `name`: set a story flag (which can fire `flag` traps) |
| `ambient` | `ambient`, `outsideSight` (hex colours), `time`: fade the floor's darkness |
| `flicker` | `tag` or `radius`, `time`, `strength`: make lights stutter for a while |
| `phone` (The Linear Maze's Office pack) | `thread`, `text`, `replies`: deliver a phone message (`games/linear-maze/SPEC.md`, section 6.13) |
| `transmission` (the engine's) | `who` (a speaker), `text`, `glitch`, `seconds`, `flag`: someone speaks over the intercom (section 6.16) |
| `faction` | `tag` or `enemy`, `faction`, `aggro`: put those enemies on another side (section 6.20); with `aggro`, they come looking for you at once (let out to hunt) |
| `branch` | `any` (flags; at least `min` of them, default 1), `all`, `not`, `then`, `else`: if the story flags agree, run the effects listed in `then`, otherwise those in `else`. The lists hold ordinary effects, each with its own `delay`, and can hold more branches. |

The trap effects are registry content (`effects`): `{ run(game, ef, trap), params }`, where `trap.spawned` and `trap.sealed` are what the trap has spawned and sealed. `params` (`{ name: 'number' | 'text' | 'longtext' | 'bool' | 'color' | 'tag' | 'id:<kind>' | 'stringlist' | [options] }`) tells the editor what settings to offer for an effect it doesn't know.

Every effect also accepts `delay`. A `seal` lasts until everything the same trap spawned is dead (a trap that seals and spawns nothing stays sealed until something unseals it).

**Waves.** A sealed arena with three waves is four traps: one seals the doors (and spawns nothing, so the seal holds), the next spawns the first wave `as: 'wave1'`, a `clear` trap on `wave1` spawns the second `as: 'wave2'`, and a `clear` trap on the last wave unseals the doors and sets a flag. Dead Signal's Floor 4 arena:

```js
{ trigger: { type: 'zone', tag: 'arenaZone' }, effects: [
  { type: 'seal', tag: 'subjectDoor' },
  { type: 'spawn', tag: 'arenaSpawn', enemy: 'ds-hound', count: 3, as: 'wave1', delay: 1.6 } ] },
{ trigger: { type: 'clear', tag: 'wave1' }, effects: [{ type: 'spawn', tag: 'arenaSpawn', enemies: ['ds-hound', 'ds-rat', 'ds-rat'], count: 9, as: 'wave2', delay: 2.5 }] },
{ trigger: { type: 'clear', tag: 'wave2' }, effects: [{ type: 'spawn', tag: 'arenaSpawn', enemies: ['ds-smiler', 'ds-hound', 'ds-hound'], count: 3, as: 'wave3', delay: 3.2 }] },
{ trigger: { type: 'clear', tag: 'wave3' }, effects: [{ type: 'flag', name: 'trialEnded' }, { type: 'unseal', tag: 'subjectDoor' }] },
``` Doors can start sealed with `props: { sealed: true }` in the legend.

A conversation that depends on what the player has done is a `branch`. Dead Signal's Director, on the stairs out of Floor 3, makes one of four speeches, by what the player has read and seen:

```js
{ trigger: { type: 'zone', tag: 'stairBLanding' }, effects: [
  { type: 'branch', any: ['fileColony'], then: [ /* transmissions */ ], else: [
    { type: 'branch', any: ['fileMidwife', 'fileTenant', 'fileLantern'], min: 2, then: [ /* ... */ ], else: [ /* ... */ ] },
  ] },
] }
```

A sequence is a `flag` trap with delayed effects. The Linear Maze's prologue door is one trap: when `readNote` is set it sends a text at 3 s, flickers every light at 10 s, shakes the floor at 10.4 s, turns the tagged wall tile into `door-odd` and sets `doorAppeared` at 10.6 s, and texts "West hall." at 14 s.

### 6.9 Sounds and particles

- `LM.audio.define('name', (t, out, opt, kit) => { kit.noise(t, out, {...}); kit.tone(t, out, {...}); })`. Weapons and enemies reference sounds by name. `LM.audio.setAmbience({ base, cutoff, wind, gain, wave })` changes the drone.
- `LM.particleTypes.name = { pass: 'under' | 'normal' | 'glow' | 'overlay', draw(g, p, k) }` where `k` runs from 1 to 0 over the particle's life. Spawn with `game.particles.add({...})` or `game.particles.burst(x, y, n, {...})`.

### 6.10 Events

`LM.on('enemyDied', fn)`, `LM.on('levelLoaded', fn)`, `LM.on('flag', ({ name, game }) => ...)`, `LM.on('event:door' | 'event:pickup' | 'event:flag', fn)`. Useful for packs that track achievements, quests or statistics without touching the engine. The phone uses `levelLoaded` to keep texting you on the maze floors.

### 6.11 NPCs

```js
npcs: {
  receptionist: {
    name: 'Marisol Reyes', role: 'Front desk',
    behavior: 'sit',                 // stand | sit | wander | pace | face-wall | spin, or your own
    face: 's',                       // resting direction: n e s w, or radians
    mood: 'tired',                   // default portrait: neutral smile tired annoyed wide blank glitch
    look: { skin, hair, hairStyle, shirt, pants, shoes, tie, lanyard, blazer, glasses, headset, holding, bg },
    barks: ['Please hold—', ...],    // or (npc, game) => [lines]; speech bubbles when you're near
    barkRange: 160, barkMin: 7, barkMax: 15,
    flashBarks: ['Delete that.'],    // said when the phone camera flashes nearby
    speed: 55, radius: 9, roam: 3, reach: 48,   // walk speed, body size, wander range (tiles), extra talk range
    alpha: 0.9, ignoresPlayer: true, // translucent; doesn't turn to look at you
    spectral: true, onFlash(npc, game) {},     // only visible in a camera flash; reacts to it
    dialog: { start, again, nodes },           // see below
    init(npc, game) {}, update(npc, dt, game) {}, draw(g, npc, t, game) {},
  },
},
```

Placement props override any of these per instance (`name`, `role`, `look`, `behavior`, `face`, `barks`, `dialog`, `roam`, `to`, `reach`) and add `ox`/`oy` (to sit someone in a chair that isn't centred on a tile) plus anything a dialog reads (the office's generic `coworker` reads `props.lines` and `props.linear`). Hairstyles: `short`, `long`, `bun`, `ponytail`, `curly`, `buzz`, `bald`. Held things: `mug`, `coffee`, `clipboard`, `tablet`, `phone`, `papers`. `pace` walks between home and `props.to: [dx, dy]` tiles; `wander` picks visible spots within `roam` tiles. Seated people get 18 units of extra talk range automatically, and only one person in a small group speaks at a time.

Behaviours: `LM.npcBehaviors.name = (npc, dt, game) => { npc.mx = ...; npc.my = ...; npc.wantFace = ...; }`. `npc.home`, `npc.mem` (scratch state), `npc.distP` and `npc.seeLos` are available.

**Dialog trees.**

```js
dialog: {
  start: 'hello',                    // or (game, npc) => node id
  again: 'menu',                     // used from the second conversation on
  nodes: {
    hello: {
      text: ['First paragraph.', 'Second.'],   // or a string, or (game, npc) => ...
      mood: 'smile',                 // portrait for this node
      flag: 'metMarisol',            // set when the node is shown
      do: (game, npc) => {},         // side effect when shown
      options: [                     // or () => [...] to rebuild each time
        { label: 'Where is it?', next: 'where', flag: 'asked' },
        { label: 'About the door…', next: 'door', if: (game) => game.hasFlag('doorAppeared'), once: true },
        { label: 'Never mind.', end: true },
      ],
    },
  },
},
```

`once` hides an option after it has been picked; `if` hides it until it applies. An option without `next` ends the conversation. A piece of furniture can hold a conversation too, by passing a speaker object to `LM.ui.dialog(game, speaker)` (the occupied stall does this). `LM.ui.portrait(look, mood, size)` draws a portrait canvas for any look.

### 6.12 Gadgets

Gadgets are tools that are always carried (no slot, no ammunition), shown as chips beside the weapon card with their key.

```js
gadgets: {
  phone: {
    name: 'Phone', short: 'Phone', key: 'KeyF',
    hint: (game, P) => 'click: photo · F: open',   // shown on the weapon card while it is held
    badge: (game, P) => unreadCount,                 // number on the chip
    use(game, P) {},                                 // key or chip pressed
    primary(game, P) {},                             // left click while it is held (unarmed)
    update(game, P, dt) {},
    mods: (P) => ({ lightRadius: 170 }),             // stat modifiers while carried, like armor
    resist: { held: 1 },                             // statuses it keeps off or shortens, like armor
    lastStand(game, P, opts) {},                     // a hit would kill you: return true to live (section 4, Damage)
    drawHeld(g, P, game, t), drawGlow(g, P, game, t), drawIcon(g, W, H),
    drawAura(g, P, game, t),                         // drawn round you in the glow layer all the time, held or not
    shieldRing: false,                               // with drawAura: it draws the shield, so the plain ring isn't
  },
},
```

A game's gadgets are listed on its title screen with their keys. `P.gadgets` lists carried ids; `P.hasGadget(id)`; `P.heldGadget()` is what's in hand when `P.isArmed(game)` is false (no weapons, or a floor with `armed: false`). `P.data` is free storage for packs and is saved; the phone keeps its state in `P.data.phone`. `P.addBuff(id, name, mods, seconds)` grants a timed modifier (the espresso).

What a particular pack adds (the phone's messaging, story flags, task lists) is documented with its game: The Linear Maze's are in `games/linear-maze/SPEC.md`.

### 6.15 Elevators

(6.13 and 6.14 are The Linear Maze's own: `games/linear-maze/SPEC.md`.)

An elevator belongs to the whole game, not to a floor. It has one place on the building's plan, and every floor it stops at builds it into its map as it loads, at that place and the same way round. Cars side by side on one floor are side by side on every floor, and banks of cars keep the same distance between them, because there is only one plan.

```js
elevators: {
  'east-1': {
    name: 'East elevator',     // shown on its panel
    x: 30, y: 12,              // the top-left tile of the shaft, walls included, on the plan
    dir: 's',                  // which way the doors open: 's' (default), 'w', 'n' or 'e' (as furniture turns: s 0, w 1, n 2, e 3)
    w: 2, d: 2,                // the car inside, in tiles: width along the doors, depth (1-8; default 2 × 2)
    door: 2,                   // the doorway's width in tiles, centred (default: the car's width)
    floors: ['lab', 'annex'],  // optional: stop only at these floors
    except: ['vault'],         // optional: stop at every floor but these (floors added later are included)
    power: 'liftsOn',          // optional: a story flag (or a list, any of them); until it's set the car is dark and shut
    stops: { vault: { until: 'keycard', text: 'needs a keycard' } },  // optional: a stop listed but not yet choosable
  },
},
```

With neither `floors` nor `except` an elevator stops at every floor of the game. The shaft is the car plus a wall all round, so a 2 × 2 car facing south takes a 4 × 4 box from `(x, y)`; turned to face west or east the box is turned too. Cars placed one wall apart (`x` 3 apart for 2-wide cars facing south) share that wall.

**On each floor.** `LM.elevators.stamp(level)` (called by the `Level` constructor) writes `elevator-wall`, `elevator-floor` and `elevator-door` tiles over the map, drops whatever the map placed under them, and adds the car's call panel (`elevator-panel`, a wall-mounted item on the inside wall beside the doors). A floor can move every elevator at once with `elevatorShift: [dx, dy]` (for a floor drawn further along its map than the others; distances and facing stay the same). A floor where a shaft doesn't fit inside the map doesn't get it, and its panels leave that floor out. The shaft's walls are painted by the floor's own `wall` terrain (any tile set), the car and doors are steel.

**Riding.** The doors open as you walk up (and for monsters chasing you). Inside, E at the panel lists the floors the car stops at, in the order of the run (1-9 pick one; this floor is marked, and a floor where the doors would open onto a wall is listed but can't be chosen). The doors close, the car hums for a moment, and you step out on that floor standing where you stood in the car; its doors open after a ding. Step out before the doors shut and the ride is off. Floors remember how you left them (section 5), and the ride doesn't change where the stairs up lead.

**Parked.** A car with no power can still be sent to one floor and left there, for a story beat: something sends it up with a delivery.

```js
'freight': { ..., power: 'liftsOn',
  parked: { 'floor-4': { flag: 'sentUp', cargo: [{ item: 'crate', props: { ... }, tag: 'crate' }] } } },
// or just a flag: parked: { 'floor-4': 'sentUp' }
```

Keyed by floor: a flag (or a list, any of them), or `{ flag, cargo }`. Once the flag is set the car waits on that floor lit, with its doors held open and its lamp on, but its panel is still dead (the game's `elevatorParked` words) and it goes nowhere. If the flag is set while you're on that floor, you hear it come: it hums up the shaft for a couple of seconds (blue lamp), sets down its `cargo` inside behind the shut doors (items, each `{ item, props, tag }`, side by side in the car), rings, and opens. Arriving on a floor where it's already parked, it is simply there, and anything left in it is where you left it (the floor remembers). `LM.elevators.parkedAt(el, levelId)`, `parked(el, game)`, `live(el, game)` (powered, or parked here).

**Power.** An elevator with `power` stays dark (its lamp off, a red standby dot over its doors) and its doors stay shut until the flag is set; walking up to it says the game's `elevatorNoPower` words. When the flag is set, on any floor, every car of that elevator comes on. A stop listed in `stops` with `until` is shown on the panel but can't be chosen until its flag is set (with its `text`, or the game's `elevatorLocked` word). `LM.elevators.powered(el, game)`, `LM.elevators.stopOpen(el, levelId, game)`.

`LM.elevators`: `list()`, `serves(el, levelId)`, `forLevel(levelId)`, `footprint(el, shift)` (every tile, the doors, the car, the tiles in front, the panel), `check(levelId, el)` (`{ fits, clear, problems }`), `stops(game, el)`, `openPanel(game, id)`; on a floor being played, `game.lifts` are its cars (`car.send(game, levelId)` rides). The tiles, the panel and the sounds (`lift`, `liftDing`) are defined by the engine in a pack called `elevators`, so a game can restyle any of them by defining the same ids in a later pack. The panel's words are in the manifest's `words` (`elevator`, `elevatorTitle`, `elevatorPrompt`, `elevatorHere`, `elevatorBlocked`, `elevatorStay`, `elevatorNoPower`, `elevatorParked`, `elevatorLocked`).

### 6.16 Transmissions

`engine/comms.js`. Someone speaks to the player while the game keeps running: a voice on an intercom, a radio, a broken screen. A line types itself out in a panel at the bottom of the screen with the speaker's name, role and a small portrait, stays long enough to read, and gives way to the next; lines queue in the order they were said, and a line with others waiting behind it moves along sooner. Lines wait while the game is paused, in a pop-up or between floors, and are dropped on a new run, Continue, trying a floor again and the title screen. The pause screen lists the last few (`LM.comms.log`).

```js
LM.comms.say({ who: 'director', text: 'Get to the stairs.', glitch: false, seconds: 4, flag: 'heardHim' });

speakers: {
  director: { name: 'Dr. Voss', role: 'Director · intercom', color: '#e0b25a',
              face: 'intercom',      // 'intercom' | 'eye' | 'screen' | 'radio', or portrait(g, size, t, talking) to draw one
              voice: 0.8,            // pitch of the typing ticks; 0 is silent
              pause: true },         // what they say stops the game (below)
},
```

| Line field | Meaning |
|---|---|
| `who` | A speaker id (the `speakers` kind), or a speaker object given inline. |
| `text` | The line. |
| `glitch` | It comes through broken: letters scramble near the cursor, the panel jitters. |
| `seconds` | How long it stays once typed (default 1.2 s plus a little per character). |
| `flag` | A story flag set when the line has been shown, so a trap can follow it. |
| `pause` | `true`: it stops the game even in a fight; `false`: never (left out: as its speaker says). |

The trap effect `transmission` takes the same fields (and `delay`, as every effect; give a trap's lines the same delay and they play in order). `LM.comms.busy()` says whether anything is playing or queued; `LM.comms.speaking()` is the id of who is talking now (a speaker on the wall can light up for them); `LM.comms.clear()` drops it all. Each entry in `LM.comms.log` has the speaker's `who` (name) and `id`.

**Lines that stop the game.** A speaker with `pause: true` carries the story: what they say stops the game and is read in the middle of the screen, larger, with Continue (E, Enter, Space or a click; the first press finishes a line still typing) and Skip (Esc: the rest of this conversation, every line still logged and every flag still set). Whatever is queued behind it carries on in the same box, whoever says it; then the game goes on. In a fight (a hunting enemy that's hostile to the player within 200, or within 420 in sight) a line plays in the corner as usual. A line's own `pause` overrides its speaker: `true` (or `'always'`) stops the game even in a fight, `false` (or `'never'`) never does. The player can turn it off on the pause screen (*Story lines: stop the game / in the corner*, kept in the browser), which is offered only when some speaker pauses. While a conversation is up the game's state is `'talk'`: nothing moves and no timer runs. `LM.comms.talking()`, `next()`, `skip()`, `pauses()` / `setPauses(on)`, `inFight(game)`; `LM.comms.talk = true | false` overrides the player's choice (tests).

### 6.17 Statuses

`engine/status.js`. A status is a timed condition on the player or an enemy: it slows them, hurts them over time, stuns them or makes them take more damage, and it shows. A game defines its own:

```js
statuses: {
  chilled: { name: 'Chilled', seconds: 2, speedMul: 0.5, vulnerable: 0.2, color: '#bfe8ff', cures: ['burning'] },
  burning: { name: 'Burning', seconds: 3, dps: 6, color: '#ff8a3a' },
  shocked: { name: 'Shocked', seconds: 4, stun: true, only: 'robot' },
  spores:  { name: 'Spores', seconds: 1.4, dps: 5, interval: 0.5, only: 'player' },
},
```

| Field | Meaning |
|---|---|
| `name` | The HUD chip (the player's statuses show under the health bar, with the time left). |
| `seconds` | How long it lasts, unless whatever put it on says otherwise. Putting it on again refreshes it (unless it stacks). |
| `speedMul` | Movement multiplier while it lasts (several multiply). |
| `dps`, `interval` | Damage a second, dealt in ticks every `interval` seconds (0.5). |
| `stun` | An enemy can't move or attack while it lasts. |
| `vulnerable` | Extra damage taken: 0.2 is 20% more. |
| `color` | The chip's colour, and a faint glow under an enemy that has it. |
| `only` | Who it can land on: `'player'`, `'robot'` (enemies with `robot: true`) or `'monster'` (the rest). |
| `cures` | Statuses it ends when it lands. |
| `hud: false` | No chip. |
| `countdown`, `urgent` | The chip shows the seconds left (`1:28`); from `urgent` seconds left it pulses. |
| `stack`, `refresh` | Putting it on again adds one (as `s.n`, up to `stack`) instead of more time, and `dps` counts once per stack; with `refresh` it also restarts the clock. |
| `keep` | The player carries it up and down the stairs (it is saved with them). |
| `onApply(game, target, s)`, `update(game, target, s, dt)`, `onEnd(game, target, s, reason)` | Hooks: when it lands, every frame while it lasts, and when it ends (`reason`: `'expired'` when it ran out, `'cleared'` when something ended it). |

A long one, for example: a clutch of eggs that hatches unless it's flushed in time.

```js
implanted: { name: 'Implanted', seconds: 90, countdown: true, urgent: 20, stack: 4, keep: true, only: 'player',
  onEnd(game, P, s, reason) { if (reason === 'expired') hatch(game, P, s.n); } },
```

Anything that hurts can carry one as `status` (an id or `{ id, seconds }`): a weapon, a projectile, any core attack, `LM.combat.explode`, `LM.combat.hurt`'s options. Code can call `LM.status.apply(game, target, 'chilled', { seconds: 3 })`, `LM.status.has(target, id)`, `LM.status.clear(game, target, id)`. Armor `resist`, a gadget's `resist` and an enemy's `resist` keep a status off (1) or shorten it. Only `keep` statuses are saved (`LM.status.save` / `load`, with the player); a new floor starts without the rest.

### 6.18 Ammunition

The engine has four kinds (`shells`, `rounds`, `cells`, `rockets`). A pack adds more as it loads:

```js
LM.defineAmmo('cryo', { name: 'Cryo', max: 200, amount: 40, color: '#2a5a7a', band: '#bfe8ff' });
LM.AMMO_NAMES.rounds = 'Rounds';   // a built-in kind can be renamed
```

Weapons then say `ammo: 'cryo'`; every player carries a count of it (saved with the run); the inventory lists it once you have some or a weapon that takes it. Its pickup is the item `ammo-<kind>`, which the game supplies (`{ onTouch }`, like the core's ammunition boxes); drops and loot entries (`{ type: 'ammo', ammo: 'cryo', amount }`) look for that id, and the core's loot tables use `amount` when they pick it for a carried weapon. The editor adds the new kinds to its ammunition lists.

### 6.19 Key items

Things the player carries from floor to floor: a supervisor's card, a fuse, a core. Unlike keys (which belong to a floor), they are saved with the player, and the inventory lists them under **Carried** with their text.

```js
game.giveKeyItem('override', { name: 'Supervisor override card', text: 'It opens Shelter B.', color: '#e0b25a', flag: 'shelterOverride' });
game.hasKeyItem('override');   game.takeKeyItem('override');
```

`flag` also sets a story flag (doors, stairs and traps read flags, so a clearance door opens for the card). Giving one the player already has does nothing.

### 6.20 Factions

Who fights whom (`LM.factions`, in `engine/core.js`). Every enemy has a side, `e.faction`: `props.faction` where it's placed, else its def's `faction`, else `'monster'`. The player's is `'player'`. The table lists, for each side, the sides it attacks; `'*'` is every other side.

```js
LM.factions.base   // the game's table; by default { player: ['*'], monster: ['player'] }
```

With the default table, monsters attack only the player and the player's shots hit every enemy: a game that never mentions factions plays exactly as before. A pack adds rows with `factions` (as Dead Signal does):

```js
LM.definePack({ id: 'ds-robots', factions: {
  player: ['monster', 'robot'],          // your shots go through anything else (allies)
  monster: ['player', 'ally'],
  robot: ['player', 'ally'],
  ally: ['monster', 'robot'],            // on your side: fights them, never you
} });
```

**Waking.** A pack's `factionWake: { specimen: 'monster' }` names sides that wake when the player hurts them: the player's shots and blasts land on them (as on a foe), and the first hit puts the one hit on the new side, hunting the player (`LM.factions.wake`, `LM.factions.playerHits(f)`). Dead Signal's specimens: one you shoot through its cage's open door, or one that got out, comes for you; bars and glass still take the shot.

A level's own `factions` lays rows over the game's while that floor is played (Dead Signal's Floor 3: `{ robot: ['player', 'monster', 'ally'], monster: ['player', 'robot', 'ally'] }`, where the robots and the specimens are at war). A side with an empty row (`specimen: []`) fights nobody, and nobody fights it unless their row names it: a monster in a cell, a robot with no power.

What it changes: who an enemy looks for (section 5, *Enemy AI*); what an enemy's shots and blasts hit (an enemy shot with no faction hits only the player, as always); what the player's shots hit (they pass through enemies the player's row doesn't name); who wakes whom (an enemy wakes friends of its own side). Allies show green on the map and have green health bars; whatever else marks them (Dead Signal's robots: a green visor and a blue ring) is the pack's drawing.

| Call | What it does |
|---|---|
| `LM.factions.hostile(a, b)` (also `LM.isHostile`) | Does side `a` attack side `b`? |
| `LM.factions.use(levelRows)` | Rebuild the table: the game's, with these rows laid over (the engine calls it as a floor loads). |
| `game.setFaction(sel, faction)` | Put enemies on another side: `sel` is a tag, an enemy id, or a test `(e) => bool`. They forget who they were fighting and look again; the floor remembers the change. Returns how many changed. |
| trap effect `faction` | `{ tag \| enemy, faction, aggro }`: the same, from a trap (a cell's glass breaks: its specimen joins the monsters). With `aggro: true` they're let out hunting: awake, and they know where you are. |
| trap effect `spawn`'s `faction` | What side the spawned enemies are on. |

### 6.21 Objectives

`engine/objectives.js`. What to do next, on the HUD under the health plate, with the thing to find picked out when you're near it. A level lists them in order:

```js
objectives: [
  { id: 'breaker', text: 'Throw the breaker in the comms closet', done: 'breakerOn',
    target: { item: 'ds-breaker', props: { flag: 'breakerOn' } } },
  { id: 'terminal', text: 'Get to the terminal in the security office', when: 'breakerOn', done: 'atTerminal',
    target: { item: 'ds-console', props: { flag: 'atTerminal' } } },
  { id: 'locker', optional: true, text: 'Open Officer Ruiz’s locker', when: 'atTerminal', done: 'lockerOpen',
    target: [{ item: 'ds-keypad', props: { flag: 'lockerOpen' } }, { item: 'ds-note', props: { title: 'Sticky note' } }] },
]
```

| Field | Meaning |
|---|---|
| `id` | Names it (`LM.objectives.current(game)` returns the one showing). |
| `text` | What the HUD says (in code, a function `(game) => text`). |
| `when` | A flag, or a list (all of them), that must be set before it shows. |
| `any` | A list: at least one of these set too. |
| `not` | A flag or a list: hidden while any is set. |
| `done` | A flag or a list: any one set and it's done (in code, a function `(game) => true`). An objective with no `done` stays until you leave the floor (the stairs). |
| `optional` | Shown under the main one, marked Optional (two at most). |
| `target` | What to pick out, or a list: `{ tag }` (items, monsters, people and doors with that tag, else the tagged tiles, outlined), `{ item: id, props }` and `{ enemy: id, props }` (of that kind; `props` matches what they were placed or spawned with), `{ npc: id }`, `{ tile: [x, y] }`, `{ room: 'Name' }` (the room's middle, on the minimap only). |
| `map` | `false` keeps its targets off the minimap. |

The main objective is the first in the list that's showing and not done. When it changes the plate flashes and a chime plays. A target in the same room as the player (the level's `rooms`), or within 8 tiles, pulses: a glow, four ticks round it and a marker bobbing over it, drawn over the lighting so it shows in the dark. Every target is marked on the minimap, with an arrow on the edge for one that's off it. The pause screen lists what's open. `LM.objectives.color` is the marker colour (`#ffd36a`); `LM.objectives.showing(game)`, `points(target, game)`, `near(game, p)`.

---

## 7. Recipes

**A new enemy.** Add an entry to `enemies` with stats, an existing `ai` and `attacks`, and a `draw`. Give it a legend character in the level that uses it. If no existing attack fits, add one to `attacks` first (most new ideas are a parameter change: a fan of shots is `ranged` with `fan`; an exploding crawler is `melee` plus an `onDeath` that calls `LM.combat.explode`).

**A new weapon.** Add to `weapons` (and a projectile if it looks or behaves differently). Place it in a chest's `loot`, on a weapon rack (`{ item: 'weapon-rack', props: { weapon: 'id' } }`), or as an enemy drop (`{ id: 'weapon-pickup', props: { weapon: 'id' } }`).

**A new environment.** Add a palette to `environments` reusing existing painters; only write a painter when the material itself is new. Pick an ambient colour first: it sets the mood more than anything else.

**A new interactive object.** Add an item with `interact.use` that opens `LM.ui.open(...)`. Keep state on the item instance (`it.used`, `it.reserve`); re-open the pop-up to refresh it after a change.

**A new trap.** Tag the trigger tiles and the target tiles in the level legend, then add a `traps` entry. Only write a new effect type when combining existing ones can't express it.

**A new floor.** Make it in the editor (Floors → New floor, then paint it), or copy a level file into a pack's `levels/` folder and add it to that pack's `pack.js` `levels` list. Set `order` and `environment`; the floor before it decides `next` (or reorder floors on the editor's Floors page). Make sure every key the floor needs is reachable before its door, and that the exit is reachable (the map editor's Check does both).

**A bank of elevators.** In the editor: on any floor's map, the palette's Elevators tab, choose the car's size and which way its doors face, click Place an elevator and click the map; then, in its settings, **+ Car after it** for the next car in the bank (it shares a wall). Every floor gets the same bank. Untick floors it shouldn't stop at; if a floor's map is drawn somewhere else, shift that floor's elevators (Floor settings → Stairs and elevators). By hand: an `elevators` entry per car in any pack, `x` stepping by the car's width + 1.

**Rebalancing.** Change numbers in the editor (they're saved with the game, not in the packs), or ship a small balance pack listed after the packs it changes in the game's manifest, which redefines the same ids.

**A new person.** Add an entry to `npcs` with a look, a behaviour and a few barks, then a dialog tree. Start the tree with the question the player is carrying (on The Linear Maze's 14th floor: where is the Linear Conference room?) and give each person one thing of their own to talk about. Place them through the objects layer; one generic definition with placement props (like `coworker`) covers a whole office of minor characters.

**A story beat.** Pick a flag name. Set it from a dialog option, an item's pop-up action or a trap. Then add a `flag` trap that runs the consequences with delays: messages, `flicker`, `quake`, `terrain`, `ambient`, `lights`, another `flag`. Let other conversations and objects check the flag with `if:` and in their text, so the world reacts.

**A peaceful floor.** Set `armed: false` and a `loadout`, use an objects layer for furniture and people, light it with `ceilingLights`, and finish it with an `outro`. Give it a `floorLabel` so it doesn't shift the maze's floor numbers.

**A new game.** In the editor: open the workspace, then **+ New game**. Give it a title, then pick the packs it starts with (Core at least), or make it a copy of another game. It gets its own folder, `games/<id>/`, with a manifest and empty editor files. If none of its packs has floors, the editor adds one empty room. Design its title screen on the Game page. By hand: make `games/<id>/game.js` with `LM.defineGame({ id, title, packs: ['linear-maze/core'] })`, add the id to `games/games.js`, and open `engine/index.html?game=<id>`. See section 21.

**A game from a few of another game's assets.** List only those packs, with `levels: false` on the ones whose floors you don't want. To take most of a game, start from `'other-game/*'` (`levels: false` keeps its floors out), then use the editor's **List them separately** and remove the ones you don't need. The Game page names anything a floor still uses that no loaded pack provides, and which pack has it.

**A new pack.** Make a folder `games/<id>/packs/<pack>/` with your files and a `pack.js` that lists them (and the packs it needs). Add `'<pack>'` to the game's `packs`; other games add `'<id>/<pack>'`.

---

## 9. Art and interface direction

- **Look:** dark, warm and tactile. Each floor commits to one material and one ambient colour (teal stone, rust and ember, marble and gold). Darkness is the default; colour comes from the light sources.
- **Lit versus emissive:** anything that is a surface (floors, bodies, furniture) is drawn before the lightmap so it is only visible where lit. Anything that gives off light (flames, tracers, eyes, telegraphs, beams) goes in the emissive pass so it reads in the dark.
- **Telegraph colours:** red-orange means enemy danger, gold means the warden family and treasure, cyan means shield and water, violet means energy and magic.
- **Interface:** brass on ink (a game's manifest can change the brass: `theme.accent`). Big Shoulders Display for names and headings, IBM Plex Mono for numbers and labels, Spectral italic for anything written in the world (lore, altars), Major Mono Display only for the wordmark (a game's title screen may choose another of the four). Panels are thin brass-cornered plates; keep them small and keep the action visible behind them.
- **Writing:** in-world text is short, specific and slightly ominous, and it always carries a hint (where a key is, what not to touch). Interface text says exactly what will happen ("Take everything", "Recharge cells only").

---

## 10. Known limitations

- Keyboard and mouse only. No gamepad, no touch controls, no key rebinding.
- Moving lights (muzzle flashes, explosions, glowing projectiles) do not cast shadows; only static lights do.
- Enemies don't take cover, flank, or hear gunfire beyond the alarm effect and waking nearby friends (packs add hearing of their own).
- An enemy after another enemy finds its way with a search out to 40 tiles (a pack's behaviour can ask `goTo` for more); beyond that it waits. The flow field is the player's alone. Body size isn't part of navigation: a big enemy will try a door it can't fit through (and wait there). Nor is furniture: a path can run through a table (the enemy slides along it, or waits); hazard tiles are walls to it.
- An enemy opens a door only while it's after something (`aggro`): a pack's runaway that should get through doors keeps itself `aggro`.
- No reloading, no dropping or selling weapons, no way to remove gear except swapping or taking it off into the pack.
- One checkpoint per game, stored in the browser (written as you arrive on each floor, with every floor's memory).
- A floor's memory keeps plain data only: state a pack keeps in a `Set`, a class instance or a closure is reset when you come back, and timers and things in flight are dropped when you leave.
- Elevators are straight shafts on one plan: a floor can shift every elevator together, but not one on its own, and there are no stairs between floors other than each floor's own `<` and `>`.
- Sound is synthesised placeholder effects plus a drone; there is no music.
- Only statuses marked `keep` are saved with the run, and area hazards (a cloud of gas, a pool of fire) are still a pack's own business: an item that puts a status on whoever stands near it.
- Levels are ASCII maps, typed by hand or painted in the editor. There is no procedural generation yet.
- Fonts load from Google Fonts; offline, system fonts are used. A title screen can name another font, but it only shows on computers that have it.
- NPCs don't pathfind: wanderers pick visible spots near home and pacers walk a straight line. Nobody follows the player.
- Conversations are written in code (JavaScript objects), not in a dialog editor or data file. The editor edits their plain-text parts.
- A game's packs are loaded with script tags when the page opens; they can't be swapped while it runs. Two packs that define the same id: the later one wins, silently.
- Leaving out a pack (or one of its files) can break the packs after it that use it. `requires` in `pack.js` catches whole packs, not single files.
- The editor saves in place in Chrome and Edge only (the File System Access API); other browsers open a workspace read-only and download changed files.
- Performance relies on a GPU-accelerated canvas. It is smooth in current Chrome, Edge, Firefox and Safari on ordinary hardware; very old integrated GPUs on 4K screens may struggle.

---

## 13. If the game moves to Godot later

The content is plain data plus small functions, so it maps cleanly onto Godot 4:

| Here | Godot |
|---|---|
| A game's `game.js` and its pack folders | A Godot project per game, with packs as folders of resources it loads |
| `LM.definePack` registries | Custom `Resource` types (`WeaponData`, `EnemyData`, `ItemData`...) loaded from folders, or JSON imported into them |
| ASCII map + legend | `TileMapLayer` with a `TileSet`; legend characters become tile ids plus spawned scenes for items and enemies |
| Static lights with visibility polygons | `PointLight2D` with shadows, `LightOccluder2D` on walls and pillars |
| Line-of-sight mask | A `PointLight2D` on the player with shadows, plus a `CanvasModulate` for ambient darkness |
| Flow-field navigation | `NavigationAgent2D`, or keep the flow field in GDScript (it is about 60 lines) |
| Behaviours and attacks | A small state machine per enemy scene, with attack scripts as `Resource`s |
| Pop-ups | `Control` scenes |
| NPC dialog trees | Dialogue resources (a dialogue plugin, or the same node graph as a `Resource`) |
| Story flags | An autoload singleton holding a `Dictionary` of flags, saved with the run |
| Objects layer | A second `TileMapLayer` used only for spawning scenes, or scenes placed directly in the level scene |
| Synth audio | Pre-rendered sound files, or `AudioStreamGenerator` |

The browser build would then come from Godot's web export, which is heavier to load than the current version but gives editor tooling for levels.

---

## 15. The editor and the editor pack

`editor/index.html` is a point-and-click editor for games built on the engine (see `editor/README.md` for using it). It opens a workspace, lets you choose a game, loads that game into a hidden frame exactly as `engine/loader.js` would, reads the registry, and draws with the real engine. Its changes never touch pack files. They are saved in the game's own folder and loaded after every pack the game loads, just before the game starts:

```
engine/editor-runtime.js          applies the edits (part of the engine)
games/<id>/editor/sprites.js      imported pictures, as data URLs
games/<id>/editor/edits.js        generated: one LM.editor.apply({...}) call
```

Set `editorChanges: false` in the game's manifest (the Game page's **Editor changes** switch) and the game runs exactly as its packs define it. The manifest itself (`games/<id>/game.js`: title screen, words, packs) is written by the editor's Game page; section 21 has its format.

### 15.1 The edit set

```js
LM.editor.apply({
  add:    { enemies: { 'bone-archer': { name, hp, ... }, 'husk-elite': { $extends: 'husk', hp: 90 } } },
  patch:  { items: { altar: { abilities: [...], popup: {...} } }, levels: { 'sunken-cloister': { map: [...], legend: { B: {...} } } } },
  remove: { levels: ['gilded-reliquary'] },
  levelOrder: ['meridian-fourteen', 'sunken-cloister', ...],
  player: { base: { maxHp: 150 }, start: { gold: 50, weapons: ['pistol'] }, ammoMax: { shells: 60 } },
  knobs:  { 'CHESSBOARD.CONFIG': { minutesPerSecond: 1 } },
});
```

Elevators are content like any other: the editor saves new ones under `add: { elevators: { 'elevator-1': { x, y, dir, w, d, name } } }` and changes to a pack's as `patch.elevators`.

- **add** registers new content. `$extends: 'id'` copies an existing definition (code included, by reference) and merges the entry into the copy. Copies resolve against the original, before patches.
- **patch** merges changed fields into the registered definition, in place. Plain objects merge key by key; arrays, functions and values replace; `'$unset'` deletes a key; an object with `$replace: true` replaces wholesale (used for changed legend entries).
- **remove** deletes ids from the registry. Blessings marked `hidden: true` stay in the registry but are left out of enumeration, so altars don't offer them.
- **levelOrder** sets each level's `order` and `next`; the last one has no `next`, so finishing it is the victory.
- **player.base** is merged into `LM.PLAYER_BASE`, **ammoMax** into `LM.AMMO_MAX`. **player.start** (weapons, ammo, gold, equip, bag, blessings, gadgets, flags, radius) is given to the player of a new run. A first floor's own `loadout` still replaces weapons, gadgets and gold afterwards.
- **knobs** are merged into objects under `LM` by path (arrays replace).

Functions in the edit set are written as code in `edits.js`. They run with these names in scope: `LM U T G AI h eyes lunge flame has flag wallRot rot ROT` (`LM.editor.helpers`). Each one is guarded: an error is logged once and the frame carries on.

### 15.2 Data fields the editor pack understands

These turn data into behaviour, so new content needs no code. They work on any definition, new or patched.

**`look`** (items and monsters; people take the `sprite` type only). Replaces `draw` and `drawGlow`.
- `{ type: 'creature', shape: 'humanoid' | 'brute' | 'beast' | 'insect' | 'blob' | 'floater' | 'turret', body, outline, head, limbs, eyes, glow, accent, extras: ['gun', 'blade', 'staff', 'armor', 'shell', 'spikes', 'horns', 'tail', 'tentacles', 'wings', 'cloak'], armsForward }`
- `{ type: 'object', shape: 'box' | 'chest' | 'orb' | 'pedestal' | 'altar' | 'crystal' | 'barrel' | 'bottle' | 'coin' | 'gem' | 'scroll' | 'book' | 'machine' | 'statue' | 'plant' | 'rune' | 'sign', color, trim, accent, glow, glowSize, scale }`
- `{ type: 'sprite', sprite: 'id in the game’s editor/sprites.js', size, facing: 'right' | 'up' | 'left' | 'down', rotate, glow, eyes, bob }`

**Effects**, run by abilities, pickups, breaking and deaths: a list of `{ type, ...settings, delay }`.

| Type | Settings |
|---|---|
| `heal`, `hurt`, `shield` | `amount` |
| `gold` | `amount` (negative takes gold) |
| `ammo` | `ammo` (`'current'` or a type), `amount`, `fraction` (of a full load) |
| `weapon`, `armor` | `id` |
| `key` | `color` |
| `item` | `id`, `count`, `props` (dropped beside the item) |
| `loot` | `table` |
| `blessing` | `id` (`'random'` picks one the player can still take), `pool: [ids]` |
| `buff` | `name`, `mods`, `seconds` |
| `spawn` | `enemy`, `count`, `radius`, `at: 'item' | 'player'` |
| `explode` | `radius`, `damage`, `at`, `color` |
| `message` | `text`, `kind` |
| `text` | `title`, `text`, `kicker` (opens a page and closes the pop-up) |
| `textCycle` | `title`, `texts: []` (the next one each time; the vending machine's hints) |
| `flag`, `sound`, `quake` | `name`, `name`, `strength` |
| `sparkle`, `flash` | `color`, `count` / `color`, `radius`, `time` |
| `teleport` | `tag` (the first tile with the tag) |
| `trap` | `effect` plus that trap effect's settings (any of section 6.8) |

Result texts can use `{healed} {gold} {blessing} {blessingDesc} {ammo} {item} {buff} {shield}`. An effect setting can come from the placed item's props: `fromProps: { amount: 'heal' }`.

**`abilities`** (items): a pop-up of choices, drawn like the altar's.

```js
popup: { kicker, title, text, prompt, leave, dimWhenUsed },
abilities: [{
  label, desc, cost, costProp: 'tithe', limit, limitProp: 'uses', usedText,
  requires: { hurt: true, flag, notFlag }, pick: 'random' | 'all', flag,
  outcomes: [{ weight, text, kind: 'good' | 'bad', sound, effects: [...] }],
}]
```

A placed item's `title`, `deity`, `name` and `text` props override the popup's. The editor shows the altar, healing font, espresso machine and Vend-O-Matic as abilities; changing one makes the game use this pop-up instead of the built-in one.

**`touch`** (items): a pickup. `{ effects, text, float, needsHurt, flag }`, with `magnet` for the pull.

**`readable`** (items): `{ title, text, kicker, flag }`.

**Breaking** (items): `destructible: { hp }` with `breakLoot: tableId` and/or `breakEffects: [...]`. An item's own `onBreak` still runs unless `breakKeepOriginal: false`.

**`deathEffects`** (monsters): effects run when it dies.

**`slots`** (items): a slot machine with an editable paytable. `{ bets, intro, pair: { symbol, count, pay }, symbols: [{ id, name, weight, pay, color, glyph, sprite, effects, text, kind, close }] }`. The five core symbols keep their drawings.

**`data`** (loot tables): `{ always: [entry], groups: [{ chance, picks, options: [{ weight, entries: [entry] }] }] }`. Amounts can be `[min, max]`; `{ type: 'ammo', ammo: 'carried' }` picks a type the player's weapons use.

**Picture tiles** (environments): `floor: { style: 'image', images: [ids], tint, grout }` and `wall: { style: 'image-wall', topImage, faceImage, ...the usual wall colours }`. Keep the usual colour keys: pillars and doors read them.

### 15.3 How the map editor writes levels

The map editor keeps each tile as a legend entry (terrain, variant, rot, tag, start, and at most one item, enemy or NPC) plus an optional objects-layer entry. Turning a tile writes its `rot` (a door keeps an explicit `rot: 0`, which pins it east–west; other tiles drop a turn of 0). Turning furniture writes `props.dir` for pieces that draw their own front and `props.turn` for the rest, taking a piece as drawn facing south: facing west is `turn: 1`, north `2`, east `3`. Untouched tiles keep their characters; a changed tile reuses a character whose entry matches, or gets a new one in the level's own `legend` (or `objectLegend`). A changed level is saved as a patch with the full `map` (and `objects`) plus the legend entries it added or changed. Characters the editor added and no longer uses are dropped.

### 15.4 Dressings

The editor's map palette has a Dressings tab: furniture and fixtures from every pack the game loads, usable on any floor. An item can file itself with `dressing: 'Furniture' | 'Walls' | 'Lights' | 'Decor' | true | false`; the game ignores the field. The Linear Maze's spec, section 18, has the details and its sets.

### 15.5 Elevators and stairs in the editor

`editor/js/lifts.js`. The map palette's **Elevators** tab is the brush for a new elevator (car width and depth, door width, which way the doors face; `[` and `]` turn it) and the list of every elevator in the game with how it sits on this floor (stops here, skips, doesn't fit, blocked, overlaps). With the brush, a click places one with its shaft's top-left corner at that tile; it is written into the plan (minus the floor's `elevatorShift`) and appears on every floor. Every shaft is outlined over the map (dashed where it skips the floor or doesn't fit), with an arrow out of its doors. Select a shaft to edit it: name, place (arrows, or Move… and click), facing (`[` `]`), size, doors, the floors it stops at (every floor, every floor but some, or only some), **+ Car before it / after it** (the next car in a bank, sharing a wall), Delete (or the Delete key). Pick (I) on a shaft takes its size and facing as the brush. Painting under a shaft changes the map underneath, which stays hidden while the shaft is there.

Floor settings → **Stairs and elevators**: where the floor's stairs up lead (`stairsUp`: automatic, closed, or a floor), **stairs that go somewhere of their own** (the level's `stairs`: by tag, with where they lead, the flags that unlock them, what they say while locked, the tag you arrive on, the sound and the floor-finished button), which elevators stop here, and moving every elevator on this floor (`elevatorShift`). Floor settings → **Objectives** lists the floor's objectives (section 6.21) to edit: text, the flags (when, any, not, done), optional, the target as JSON, and whether it's on the minimap. The `transmission` effect's form has **pause** (the speaker's choice, always or never). The elevator inspector has a **Power** field (its `power` flags) and **Parked here** (the flag that parks it on this floor, `parked`; its cargo, if it has one, is listed, and is written in code). A tile type with a door has **Opens for a story flag**, **What it needs** and **Lock colour** (a clearance door). Trap effects a pack defines with `params` get a form like the engine's own (the transmission effect's speaker list, for one). Statuses are a kind the editor lists (with speakers, under the game's settings), and ammunition a pack adds with `LM.defineAmmo` joins the editor's ammunition lists. Check reports an elevator that doesn't fit, opens onto a wall, overlaps another, or is built over the floor's start or stairs down, and counts things on the map under a shaft; it also warns about stairs in `stairs` whose tag no tile has, and notes stairs that lead to a floor the game doesn't have yet. The Floors page has a table of which elevator stops at which floor.

---

## 21. Games, packs and the loader

### 21.1 A game's manifest: `games/<id>/game.js`

One call, `LM.defineGame({...})`. The editor's Game page writes it (hand edits are kept as long as it stays one call). Only `id` is required; every other field has a default (`engine/manifest.js`, `MF.normalize`).

```js
LM.defineGame({
  id: 'dead-signal',                 // the folder name under games/
  title: 'Dead Signal',              // the browser tab, the launcher, packaged files
  version: '0.1.0',
  description: 'A sentence or two for the launcher and a packaged game’s README.',
  brief: 'Notes sent with every Ask Claude request in the editor: style, mood, how text reads.',
  packs: [                           // what the game loads, in order (21.2)
    'linear-maze/core',
    { pack: 'linear-maze/office', levels: false },
    'archive',                       // games/dead-signal/packs/archive/
  ],
  start: null,                       // the first floor of a new run; null: the top of the floor order
  saveKey: null,                     // the browser storage key for its checkpoint; null: 'lm-save-v1:<id>'
  editorChanges: true,               // false: play without games/<id>/editor/*.js
  titleScreen: {
    lines: ['dead', 'signal'],       // the wordmark, one entry per line (default: the title's words)
    layout: 'stairs',                // 'stairs' steps each line right; 'stacked' keeps them flush left
    size: 'large',                   // 'large' | 'medium' | 'small'
    font: 'Major Mono Display',      // one of the four fonts engine/index.html loads, or any installed font
    tagline: 'Under the title.',
    newGame: 'New game',             // the first button
    showControls: true,              // the list of controls (gadgets add their own rows)
    footer: 'Version {version}',     // {packs} {version} {title}
    background: 'dead-signal-lab',   // a floor drifting behind the title; null: the first floor with an attractPath
    picture: null,                   // or an imported picture (the editor's Pictures) instead of a floor
  },
  theme: { accent: '#8fb8a8' },      // replaces the brass everywhere: the title, buttons, frames, highlights
  words: {                           // the engine's own screens; {floor} {name} {n} are filled in
    floor: 'Floor {n}',
    continueGame: 'Continue: {floor}, {name}',
    descend: 'Go on to {floor}: {name}',
    nextIntro: 'The way goes on.',   // when the next floor has no intro
    cleared: '{floor} cleared',
    leftBehind: '{floor} · left behind',   // a peaceful floor (armed: false) left behind
    victoryKicker: 'The end', victoryTitle: 'You made it', victoryText: '',
    playAgain: 'Play again',
    deathTitle: 'You died', deathText: 'Trying again restores you to how you entered this floor.',
    tryAgain: 'Try the floor again', backToTitle: 'Back to title',
    noWayUp: 'The way back up is closed.',          // stairs up that lead nowhere
    elevator: 'Elevator', elevatorTitle: 'Which floor?', elevatorPrompt: 'Choose a floor',
    elevatorHere: 'you are here', elevatorBlocked: 'no way out there', elevatorStay: 'Stay on this floor',
    elevatorNoPower: 'No power. The doors won’t open.', elevatorLocked: 'locked',   // an elevator without power; a stop not open yet
    stairsLocked: 'The way is shut.',                   // stairs locked by their `until`, or leading to a floor that isn't there
    doorNeeds: 'Locked. It needs {need}.', doorAccepts: '{need} accepted.',        // clearance doors
  },
});
```

In the game, `LM.gameInfo` is the manifest with every default filled in, `LM.text(key, vars)` gives a word with its placeholders filled, and `LM.saveKey()` the save key.

### 21.2 Packs

A pack is a folder, `games/<owner>/packs/<pack>/`, of content files: environments, terrain, weapons, enemies, items, people, story code, and its floors in `levels/`. Its `pack.js` describes it:

```js
LM.describePack({
  name: 'Office',
  version: '0.1.0',
  description: 'What it adds, in a sentence or two (the editor shows it when choosing packs).',
  requires: ['core'],                // packs that must load before this one: same owner, or 'other-game/pack'
  scripts: ['environment.js', 'furniture.js', 'npcs.js', 'phone.js'],   // its assets, in load order
  levels: ['levels/00-meridian-fourteen.js'],                            // its floors, loaded after its scripts
});
```

A game's `packs` list names packs in four ways:

| Entry | Means |
|---|---|
| `'core'` | the game's own pack, `games/<this game>/packs/core/` |
| `'linear-maze/office'` | another game's pack |
| `'linear-maze/*'` | every pack that game loads, in that game's order (its own and any it borrows) |
| `{ pack: 'linear-maze/office', levels: false, exclude: ['phone.js'] }` | with options: `levels: false` loads the assets but none of the floors; `exclude` leaves out some of its files (names as its `pack.js` lists them) |

Options given with a wildcard apply to every pack it brings in. A pack listed twice loads once, at its first place. The loader checks `requires`: a needed pack that is missing or comes later is reported (in the console, and on the editor's Game page) but loading carries on.

So a game can load everything another game has (`'linear-maze/*'`), everything but its floors (`{ pack: 'linear-maze/*', levels: false }`), or a handful of packs, and add packs of its own. The engine expects the basics that `linear-maze/core` defines (gold, keys, ammunition and the weapon and armor pickups, the `void` and `floor` terrain, the default legend), so every game needs that pack or one that defines the same ids.

### 21.3 Loading and starting

`engine/loader.js` (the last script in `engine/index.html`):

1. Picks the game: `?game=<id>` in the address, else the script tag's `data-game`, else the first id in `games/games.js`.
2. Loads `games/<id>/game.js`, then every `pack.js` the manifest leads to (and, for a wildcard, that game's `game.js`).
3. Works out the file list with `LM.manifest.plan(id, host)` (`engine/manifest.js`), the same code the editor and `tools/package.mjs` use.
4. Adds every file as a script tag at once (`async = false`, so they run in order), then `engine/editor-runtime.js` and the game's two editor files (which may not exist yet).
5. Calls `LM.start(id)`: `LM.useGame(id)` chooses the manifest, `LM.ui.applyTitleScreen()` fills the title screen and the accent colour, and `LM.boot()` makes the game.

The script tag's `data-root` is the workspace folder relative to the page: `..` for `engine/index.html`, `.` for the `index.html` at the top of a packaged game. A single-file build has no loader: every script is inlined in the same order, ending with `LM.start("<id>")`.

### 21.4 Packaging

`node tools/package.mjs <id>` (or the editor's Package button) writes `dist/<id>/`: `index.html` (`engine/index.html` with paths from the top and the game chosen), `engine/`, `games/games.js` naming just this game, `games/<id>/game.js` with any wildcards written out as the packs they stand for, the game's editor files, and, for each pack it loads, the `pack.js` and only the files it loads. It also writes `dist/<id>.html` and `dist/<id>.artifact.html` (21.3). A packaged folder is itself a workspace: the editor can open it.

### 21.5 Moving a game, or renaming one

A game's folder name is its id. To rename one: rename the folder, change `id` in its `game.js`, change the id in `games/games.js`, and change `'old-id/...'` in any other game that loads its packs. Keep `saveKey` as it was if players should keep their saves.
