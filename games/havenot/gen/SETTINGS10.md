# HaveNot settings libraries in the generator

How outside content libraries become functional rooms in generated installations, what is done, and what isn't
yet. There are two: *JAGS HaveNot — Ten Settings & Two Hundred Functional Rooms* (`gen/library/settings10/`,
library 1) and *Havenot-Settings-Library* (`gen/library/settings10b/`, library 2: another ten settings and two
hundred rooms, in another schema). By default an installation draws on both (a brief's `library` picks one:
`'settings10'`, `'settings10b'`, or `'all'`).

## How it fits together

| Piece | Where | What it does |
| --- | --- | --- |
| Source | `gen/library/settings10/HaveNot_10_Settings_Library.{json,md}` | Kept exactly as supplied (checksums in the import report). |
| Companion | `gen/library/settings10/companion.json` | Implementation details the source doesn't have: palettes, material painters, drawing families and footprints for furniture, derived clusters, hazard behaviours, device kinds, loot categories and values, the installation types' leanings, setting-mode weights, size classes. Rules are ordered regexes; `overrides` takes per-id corrections. |
| Adapter and validator | `editor/gen/content.js` | `G.CONTENT_ADAPTERS[format]` turns a source + companion into the generator's own shape, so the generator never reads a source format directly; a new library format is one new adapter. `G.validateContent` checks unique ids, foreign keys (and back-references), required fields, weights and probabilities, missing graphics (no painter, palette or drawing family), unsupported behaviours, duplicates. |
| Importer | `tools/import-content.mjs havenot settings10 [--check]` | Validates, writes `IMPORT-REPORT.md`, and writes `gen/library/settings10.js` (generated; the game and the CLI load it). `tools/gen-tests.mjs` fails if the import is stale. |
| Generation | `editor/gen/stages-function.js` | Stage `functions` (after layout) and `functionsFill` (after dressing); hooks in access (furniture), treasure (loot), words (names and notes) and emit (material tiles). |
| Game side | `packs/hn-gen-kit/`: `materials.js`, `furniture.js`, `devices.js`, `hazards.js` | Terrains, furniture art, devices, hazards; `hn-ruins/ruins.js` registers the tiles and the loot items. |

### Generation

- **Settings.** An installation picks a dominant setting from its type's leanings (companion `type_settings`) and a
  mode: single, dominant + secondary, a setting per floor, mixed within a floor (by region), or chaotic. The
  secondary is usually the dominant's `related_setting`. A brief can fix them: `settings: { mode, dominant, secondary }`.
- **Functional rooms.** Each room other than the entrance, stairs and goal becomes functional with
  `functional_room_probability` (0.25; brief `functional`, `false` turns it off; `preserveOld` keeps the old
  generator exactly). The room type is picked by relation to the neighbours already assigned (parent and children
  in the room tree): same cluster 55, same setting 20, related setting 15, unrelated 10 (brief `clusterStrength`
  sharpens or flattens the first three), then by `frequency_weight`, among types whose `size_class` fits the room.
  A type is used once per floor.
- **Clusters are derived**: the source has no cluster field. A room's cluster is the first companion `clusters`
  rule matching its name and function (medical, command, living, food, ceremony, reception, commerce, storage,
  research, industry, detention, office, passage, display, general).
- **Per room:** a density class (sparse 20, normal 55, crowded 20, excessive 5; scaled to the floor area); an 18%
  name descriptor that changes the room (Crimson and other colours tint its light; Abandoned and Condemned wear it
  and add debris; Imperial and Deluxe crowd it; Provisional thins it); a 6% misleading name (another setting's room
  name); a rare twist (12%: a mismatched object from another cluster, every device malfunctioning, a caretaker
  robot, odd light); a history overlay (32%: scavenged, damaged, repurposed, blast, fire, flooding, growth, cult
  conversion, habitation, restoration, collapse, robotic modification, contamination: decals, a telling object,
  wear, and a line in the room's note); loot (28%) and a hazard (20%, scaled up a little by Threat Level).
- **Placement:** the two mandatory features first (kept by the unblocker), then optional furnishings and the
  furniture record's pieces, by family rule (centre, middle, wall row, corner, any, wall-mounted); a piece that
  won't fit is tried turned, then small; a mandatory feature that still won't fit is recorded in `fn.missing`.
  The generator's unblocker keeps every door, stair and route open, as for all furniture.
- **Materials** go down last: the room's floor (state from the descriptor or overlay: intact, worn, ruined), the
  wall ring, and light fittings. About 30% of ordinary rooms in a setting's area take its floor.

### In the game

- **Devices** (each room's interactable): a state (working, partly working, malfunctioning, disabled, active,
  destroyed) kept with the run, and a kind with its own actions: heal, rest, credits, data, buff, salvage,
  machine (power on: the room's hazard runs; off: it stops), ceremony, cage, show. All can be examined; the panel
  shows the room, the device's state, the record's possible results, and (GM notes) the room's hazard.
- **Hazards**: ten behaviours (shock, beam, gas, turret, ambush, crush, heat, flood, seal, mind), each visible
  (emitter, glyph, zone, telegraph), examinable (clue, effect, countermeasure, GM notes with damage), with damage
  from the generator's trap scale for the floor's Threat Level, switched off by the room's control panel (a hack),
  the room's device, or the floor's facilities terminal.
- **Loot**: 375 satchel items made from the 200 loot records (named pieces, category, value), in a container of
  the room, valued for the Threat Level, within the floor's treasure budget.

## Coverage (library 1: ten settings)

Checked by `tools/gen-tests.mjs` (content section), a forced-generation sweep of all 200 room types, and a
drawing sweep in the game of every object, material state, light, decal and hazard (no errors, no blank drawings).

| Records | Imported | Graphics complete | Behaviour implemented | Tested |
| --- | --- | --- | --- | --- |
| Settings (10) | 10 | 10 palettes | settings modes, related setting, type leanings | yes: every setting generated as dominant (contact sheet) |
| Room types (200) | 200 | via their tiles and objects | 200 assignable, size-fitted, clustered | yes: all 200 generated |
| Floor tiles (29) | 29 | 29, ×3 states (18 painters) | — | yes: all baked in 3 states |
| Wall tiles (29) | 29 | 29, ×3 states (21 painters) | — | yes: all baked in 3 states |
| Lights (20) | 20 | 20 (11 fitting styles) | light colour and radius; tint and dim by descriptor | yes |
| Furniture groups (200) / objects (591) | 200 / 591 | 591, 45 drawing families, setting palettes, name-seeded detail, wear and device states, turned to face | placement roles (focal, seating rows, working space, chairs round tables, aisles, consoles by machines), footprints, centrepieces, stripping for salvage | yes: all 591 drawn in every state; 548 placed in the sweep |
| Interactables (200) | 200 | as their objects; status lamp and 7 state looks | 10 device kinds with state machines; wired to lights, traps, turrets, doors, other machines, lockers, alarms | 199 placed in the sweep; actions and power cuts tested in the game |
| Loot (200) | 200 (375 items) | category icons | satchel items in six tiers, budgeted; salvage by function | 170 dropped in the sweep (the budget cap stops the rest) |
| Hazards (200) | 200 | 12 behaviour visuals | 12 behaviours (with alarm and identity), attached to room, door, floor, wall, device or container; clue, countermeasure, control, re-arming | yes: 194 placed in the sweep; attachments and identity checks tested in the game |

## Coverage (library 2: ten more settings, another schema)

The source (`Havenot-Settings-Library.json`) is kept as supplied. Its rooms name their tiles, furniture, devices,
treasure, traps, hazards, dressing and key objects by id, and most of those ids aren't defined in the file, or are
defined as placeholders. Its adapter (`havenot-settings-library-b1` in `editor/gen/content.js`) and validator
report every gap; `settings10b/companion.json` fills them, extending library 1's companion (its drawing families,
hazard behaviours, device kinds and loot rules are tried after library 2's own). The full list is in
`settings10b/IMPORT-REPORT.md`: 0 errors, 746 gaps filled, 21 warnings.

**What the validator found:**

- **Tiles (90 ids, 30 floor, 30 wall, 30 light): none defined.** `shared_libraries` has 20 tile records, but
  their ids are written with spaces (`FLOOR_BLACK MARBLE VEINED GOLD`) where rooms use underscores, and 4 of
  them match nothing. Each tile is drawn from its name (companion `materials`).
- **Room fixtures: placeholders.** Every room's first required feature is "Primary <room> fixture". The rooms are
  20 templates × 10 settings; each template's real fixtures are in the companion (`room_archetypes`: reception
  desk, spectacle stage dais, power core turbine...). The second, setting-specific feature (holographic
  eulogists, CRISPR looms...) is kept.
- **Shared records are placeholders**: all 20 furniture records say "Bizarre HaveNot furniture piece", all 20
  treasures "Salvage, curiosity, or artifact", all 20 interactives "Investigate, hack, bribe, or apologize to it",
  all 10 traps "Humiliating, transformative, or lethal in bureaucratic way". Names come from ids (a few
  reworded, companion `names`); each device's use and each trap's trigger, clues, effect, countermeasure and
  severity are written in the companion.
- **Hazards (10 ids, `HAZ_<setting>_DECAY`): undefined.** Written from each setting's decay patterns.
- **Dressing (600 ids): undefined.** Written from the setting's signage, smells and decay.
- **Key objects (10 ids, `KEY_<setting>_HEART`): undefined**, and every room of a setting lists the same one. It
  becomes one named object per setting, loot only in that setting's Power Core & Heart room.
- **Furniture belongs to no setting**, and each room's furniture pool mixes settings. Each piece's home setting is
  in the companion: home pieces are the room's furniture; the others are its deliberate mismatch pool (a quarter
  of rooms show one, in its own setting's colours).
- **No generation parameters** (the generator's defaults apply) and no related setting (the strongest
  `adjacent_setting_weights` entry is used). Two new size classes, tiny and monumental (90+ floor cells: rooms of
  110+, as first set, almost never occur).

| Records | Imported | Graphics complete | Behaviour implemented | Tested |
| --- | --- | --- | --- | --- |
| Settings (10) | 10 | 10 palettes | modes, related (from adjacency weights), type leanings | yes: every setting generated as the only setting (contact sheet `settings10b-contact-sheet.png`) |
| Room types (200) | 200 | via their tiles and objects | 200 assignable, size-fitted, clustered (by template) | yes: all 200 generated |
| Floor tiles (30) | 30 (none defined in the source) | 30, ×3 states | — | yes: all baked in 3 states |
| Wall tiles (30) | 30 (none defined) | 30, ×3 states | — | yes: all baked in 3 states |
| Lights (30) | 30 (none defined) | 30 (10 fitting styles) | colour and radius | yes |
| Furniture: 20 shared pieces, 40 template fixtures, 10 setting features, 20 devices / 129 objects | 129 | 129, 32 drawing families, setting palettes, states | as library 1; home vs mismatch pool | yes: all 129 drawn in every state; 104 placed in the sweep (devices besides) |
| Interactables (20, as 200 room devices) | 200 | as their objects; status lamp and state looks | 8 device kinds, wired as library 1's | 200 placed in the sweep; all opened in the game |
| Treasure (20) + key objects (10) | 200 loot records, 610 items | category icons | satchel items in six tiers, budgeted | 166 dropped in the sweep (budget cap) |
| Hazards: 10 decay + 10 traps | 200 room hazards | behaviour visuals | 9 behaviours (with identity), attached as library 1's | 193 placed in the sweep; all opened in the game |

## Done since the first milestone

- **Advanced generation** (character creation, "Advanced generation"): functional rooms (none, few, standard,
  many, most), which libraries, settings per installation (rolled, one, main and second, per floor, mixed,
  anything goes), main setting, era emphasis (Age of Wonders or Age of War: that era's settings three times as
  likely to lead; brief `era`), how rooms group (cluster strength), furniture density, twists/history/hazards/loot
  (fewer, standard, more), and the classic generator (`preserveOld`). The choices go onto every installation brief
  of the run and are kept with it.
- **Centrepieces**: a functional room's first required piece of a centrepiece family (thrones, vats, altars,
  coffins, turbines, daises, baths, cages, pods) or name (surgical, operating, cannon, reactor, centrifuge, stage,
  tank) is one size bigger in the middle of a room of 50 floor cells, two from 110, on a plinth with a lit rim.
  About one functional room in five has one.
- **Doorway transitions**: where a room's material floor meets a door or another floor, a threshold on its side
  fades into the next floor, with a sill (`hn-threshold`).
- **Room inspect panel (L)** and **hazard overlay (O)** (`hn-gen-kit/inspect.js`): one panel with the room's
  setting, function, cluster, condition, history, materials, furniture, device and state, treasure, hazards and
  traps; the overlay marks every hazard's room, emitter and control and armed traps' trigger tiles.

- **Placement** (`arrange` in stages-function.js): a throne, altar or dais stands against the wall farthest from
  the doors and faces them, the room's seating in rows before it; an operating table keeps a ring of working
  space; chairs surround conference and dining tables; shelving in storage rooms and shops forms aisles; consoles
  stand by the room's machine; pieces are drawn turned to face what they're for; a hazard's control hangs by the
  door.
- **Devices wired to the floor**: a machine's room lights go with it; a power source (generator, core, turbine,
  reactor, furnace) shut down, wrecked or cut at its breaker kills lights, switch traps, turrets and machines
  within 12 tiles and unseals sealed doors; data consoles pull locker codes; security consoles stand alarms
  and identity checks down. Kept with the run.
- **Hazards attached** to the room, a doorway, a section of floor, a wall, the room's device (using it springs it)
  or a container (opening it does), re-arming after 45 s; two new behaviours, **alarm** and **identity** (a human
  waved through, anyone else jolted and reported). The panel gives threat category, suggested level, detection,
  countermeasure and GM notes (no invented JAGS numbers).
- **Device looks** for every state: a status lamp on each, damaged, disabled, active (faster), triggered (red flash)
  and destroyed (charred, split, smoking). Sheet: `device-states.png`.
- **Walls**: windows in thin walls (sight and light through, not shots) and displays or machine panels set into
  rooms' walls, for every wall material. Sheet: `wall-variants.png`.
- **Loot tiers** (ordinary salvage, decorative curiosity, useful equipment, valuable collectible, rare artifact,
  exceptional discovery) and **salvage by function** (machines give parts, thrones fittings, beds medical
  supplies, weapons weapon parts); any library furniture can be stripped once.
- **Names**: atmosphere, historical, corporate, HaveNot and title words beside colours and status, each with its
  effect, a quarter with a colour as well (Crimson Executive ...); a repeated function name takes its setting.
- **Advanced generation**: hazards, loot, historical damage and anomalies each have their own control. "One
  setting" is one setting now (its own rooms, but for one anomaly in ten).
- **Tests** (`tools/gen-tests.mjs`, section `functional rooms`): every size, functional off and classic, the
  default rate, each library alone with one setting leading, chaotic mixing, sparse against crowded, low against
  high hazard, both eras, every functional room complete and drawable, determinism.

## Not done yet (and what remains)

- **Library 2's furniture is thinner than library 1's**: 129 objects against 591, because its rooms are 20
  templates repeated per setting. Each setting's rooms differ by materials, palette, the setting feature, its
  devices and its own shared pieces. Remaining, if wanted: more setting-specific pieces per template.
- **Doorway transitions are floor-only**: where two wall materials meet there's no trim piece between them.
- **Sound**: devices and hazards use the engine's existing sounds (alarm, pickup, trap, shock); there are no
  per-object sound sets.
