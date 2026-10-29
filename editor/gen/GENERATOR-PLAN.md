# The installation generator: build plan

Milestone 0 of the *HaveNot Installation Generator* build prompt. This file records what was measured, what was
decided, and where the build departs from the prompt, so the next session (and Eric) can see why.

## What already exists and what it means for the generator

- **The whole HaveNot game loads in Node.** Running the engine's scripts and every pack the manifest plans inside
  a `vm` context with a small DOM stand-in (a proxy that accepts any call) fills `LM.registry` completely: 20
  enemies, 107 items, 39 terrains, 12 environments, 27 satchel items, 11 levels. So the CLI reads the real
  registry; no exported snapshot is needed. (Registry-adapter choice for the prompt's section 4.)
- **The editor already has Ask Claude** (`editor/js/ai.js`) with a key in Settings and a Copy-the-prompt path.
  The generator's Claude requests (milestone 8) go through it.
- **Generated content can only use what is built.** Today that is 13 HaveNot monsters (`hn-roach`, `hn-knife`,
  `hn-glorexx`, `hn-maintbot`, `hn-monoid`, `hn-toad`, `hn-wasp`, `hn-drone`, `hn-sphinx`, `hn-defender`,
  `hn-turret`, `hn-emitter`, and the Monoid NPC), four HaveNot environments (`hn-agency-inst`, `hn-agency-lab`,
  `hn-agency-sec`, `hn-complex`), the fixtures in `hn-rules/fixtures.js`, the agency's items (posters, signs,
  memos, TRAP lights, vending, stasis tubes) and the office furniture.

## Calibration: the Anomalous Structure (Threat Level 2)

Measured from the level files (`node` over the loaded registry):

| Floor | Size | Rooms | Monsters placed (hit points) | Traps | Containers | Treasure (credits) | Hack difficulties |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Reception and Offices | 53 × 36 | 11 | 3 Knife Fighters, 3 roaches, 2 maintenance robots, Sphinx Gun (412) | 2 | 10 | 1,781 | 7, 9, 10, 11 |
| 2 Prototype Labs | 52 × 40 | 7 | 3 roaches, 2 Knife Fighters, 1 maintenance robot, plus test-chamber waves (154 placed) | 3 | 12 | 3,060 | 11 |
| 3 Security Complex | 50 × 37 | 7 | turret, 3 robots, 3 field emitters, 2 Knife Fighters, the Heavy Security Drone (1,081) | 2 | 2 | 370 | 10, 11 |

Weapons count 800 credits and armour 300 (Out-rider prices). What follows from it:

- **Treasure.** The agency hands out about 5,200 credits over three floors, roughly 1,700 a floor. Vol 2's
  absolute numbers (2,000 per character for a whole level-2 installation) would make generated installations far
  poorer than the hand-built one. **Decision:** TL 2 is 1,700 credits per standard floor; other levels keep the
  book's ratios between levels (TL 1 ×0.5, TL 3 ×2, TL 4 ×3.5, TL 5 ×5.5, TL 6 ×8). The shares, the one-tenth rule
  and the strategies are the book's.
- **Monsters.** Each monster gets a `cost` in the library (roach 1, Desktop Defender 1, Knife Fighter 2, wasp 3,
  Glorexx 4, Monoid 4, field emitter 4, maintenance robot 5, turret 6, toad 8, Sphinx Gun 10, Heavy Security Drone
  30). Floor 1 costs 29, floor 2 about 12 plus its waves, floor 3 37 plus the drone. **Decision:** TL 2 standard
  floor = 28 points, bosses paid separately; ×1.4 per TL above, ×0.75 per TL below.
- **Traps.** 2–3 trap set-ups a floor. Darts do 9 a dart. **Decision:** `trapDamageScale` 0.75 (book medium 12 at
  TL 2 → 9).
- **Hacks.** Staff door 7, lockers 9–10, executive and vault doors 11. **Decision:** difficulty = 6 + TL − 1 + zone
  rank (TL 2: 7 at the front, 10 at rank 3), clamped to 5–14.
- **Size.** Agency floors are about 52 × 38 with 7–11 rooms of 25–300 tiles. **Decision:** standard floors aim at
  9–13 rooms, maps at most 72 × 48.

## Modules

| File | Job |
| --- | --- |
| `editor/gen/core.js` | Namespace `LMGen`, seeded random streams, small utilities, the stage list. |
| `editor/gen/library.js` | `LM.genLibrary(game, data)`, merging, sorting, hashing, and the check against a registry. |
| `editor/gen/stages-concept.js` | Stages 0–2: brief, concept and back-story, floors and zones. |
| `editor/gen/stages-graph.js` | Stage 3: the progression graph (critical path, locks, keys, side branches, loops). |
| `editor/gen/stages-layout.js` | Stage 4: graph-guided growth of rooms and corridors on a grid, shapes, stairs. |
| `editor/gen/stages-fill.js` | Stages 5–9: access control, encounters, traps, treasure, dressing and items of interest. |
| `editor/gen/stages-words.js` | Stage 10: text pools and slot ids (Claude requests later reuse the same slots). |
| `editor/gen/validate.js` | Stage 11: the solvability proof on the progression graph and a tile-level walk of every floor. |
| `editor/gen/emit.js` | Stage 12: level files, `pack.js`, `site.js`, `generation.json`, `REPORT.md`. |
| `editor/gen/generate.js` | Runs the stages, repair and reroll, locks and reruns. |
| `tools/generate.mjs` | The CLI: loads the game in a `vm`, loads the library, generates, writes, checks, batches. |
| `games/havenot/gen/library/*.js` | The HaveNot lists. |
| `games/havenot/packs/hn-gen-kit/` | `HN.addLocation`, pin replacement for stubs, small run-time helpers. |
| `editor/js/views/installations.js` | The editor page (milestone 6). |

Each core file is a classic script that adds to `root.LMGen` and also exports it under Node (the
`engine/manifest.js` pattern), so the editor loads them with script tags and the CLI with `require`.

## The plan object

```js
InstallationPlan = {
  v: 1, game, slug, seed, libHash,
  brief: { type, tl, floors, size, looks: [...], title, story, pins, arc },
  concept: { type, era, builder, purpose, fate, occupants, company, warlord, slogan, goal: { kind, target }, boss },
  floors: [{
    n, id, role: 'entry' | 'middle' | 'goal', look, env,
    rooms: [{ id, template, zone, rank, region, critical, rect, shape, door..., slots, contents: [...] }],
    edges: [{ a, b, lock, door, corridor }],
    stairsUp, stairsDown,
    grid: { w, h, map: [...], objects: [...] },        // filled by layout and the fill stages
    legend, objectLegend, traps, objectives, rooms out, budget,
  }],
  locks: [{ id, kind, tier, floor, edge, keyRoom, clueRoom, flag, bypass }],
  words: { slotId: { text, src: 'pool' | 'claude' | 'edited' } },
  locked: { rooms: [...], stages: [...] },
  report: { budgets, counts, problems, fallbacks },
}
```

## Where this build departs from the prompt

1. **Treasure scale** (above): the game's own economy wins over Vol 2's absolute numbers; the book's ratios,
   shares and strategies are kept.
2. **Layout is graph-guided growth.** Stage 3 decides topology, locks and keys without geometry, as the prompt
   asks. Stage 4 grows rooms outward from the entrance along the graph's tree edges (each child beside its parent,
   sharing a wall or at the end of a short corridor) instead of solving a general graph embedding. Loop edges are
   added where two rooms of the same lock region end up close together; a loop that can't be embedded is dropped
   and reported. Solvability is then proved on what was actually built.
3. **Registry adapter** is the `vm` loader, not a snapshot.
4. **One session, several milestones.** Eric asked for the generator itself, so this session runs milestones 0
   to 5 (and as much of 6 as fits), committing after each, and stops for a play-test once a generated Bunker
   replaces the stub.
