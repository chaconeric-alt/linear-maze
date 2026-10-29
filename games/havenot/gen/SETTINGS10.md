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
| Furniture groups (200) / objects (591) | 200 / 591 | 591, 45 drawing families, setting palettes, name-seeded detail, states | placement rules, footprints | yes: all 591 drawn; 544 placed in the sweep |
| Interactables (200) | 200 | as their objects | 10 device kinds with state machines | 198 placed in the sweep; actions spot-checked |
| Loot (200) | 200 (375 items) | category icons | recoverable satchel items, budgeted | 162 dropped in the sweep (the budget cap stops the rest) |
| Hazards (200) | 200 | 10 behaviour visuals | 10 behaviours, clue, countermeasure, control | yes: all 200 placed; behaviours spot-checked |

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
| Furniture: 20 shared pieces, 40 template fixtures, 10 setting features / 109 objects | 109 | 109, 31 drawing families, setting palettes, states | placement rules; home vs mismatch | yes: all 109 drawn in 3 states; 105 placed in the sweep |
| Interactables (20, as 200 room devices) | 200 | as their objects | 8 device kinds | 199 placed in the sweep; all opened in the game |
| Treasure (20) + key objects (10) | 200 loot records, 610 items | category icons | satchel items, budgeted | 157 dropped in the sweep (budget cap) |
| Hazards: 10 decay + 10 traps | 200 room hazards | behaviour visuals | 8 behaviours | 194 placed in the sweep; all opened in the game |

## Not done yet (and what remains)

- **The generator settings UI** (enable, probability, setting choice, cluster strength, density, frequencies,
  era emphasis, preserve-old). The brief already takes every option (`functional`, `settings`, `clusterStrength`,
  `density`, `frequencies`, `preserveOld`); there is no panel for them yet. Remaining: an "Advanced generation"
  panel (character creation or the editor) that writes them into the run's briefs. Era emphasis isn't a brief
  option yet.
- **Library 2's furniture is thinner than library 1's**: 109 objects against 591, because its rooms are 20
  templates repeated per setting. Each setting's rooms differ by materials, palette, the setting feature and its
  own shared pieces. Remaining: more setting-specific pieces per template, if wanted.
- **Furniture readability.** Every object has real art, but at the game's normal zoom small pieces read as small
  shapes; centrepieces (thrones, vats, coffins, turbines) carry the rooms. Remaining: bigger centrepieces for
  large rooms, and denser 'normal' rooms.
- **Transitions between areas** (marble giving way to grating at a doorway) aren't drawn yet beyond each room's
  own walls and floor. Remaining: threshold decals and blended corridor tiles at doors between differently
  materialled rooms.
- **Room inspect panel** (13.1: a room's name, setting, function, objects, devices, treasure and traps on one
  panel). Devices and hazards show their part; a whole-room panel and a hazard overlay toggle are still to do.
- **Interactive objects' animation states** are drawn for working, malfunctioning (sparks), disabled and destroyed
  (dark); 'triggered' shares 'active'.
- **Wall art**: walls get the room's material with trim and damage, but no embedded displays or window openings
  of their own beyond the wall-mounted pieces.
