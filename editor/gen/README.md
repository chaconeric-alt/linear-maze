# The installation generator

Generates whole installations (dungeons) for a game from lists: types, rooms, looks, monsters, traps, locks,
treasure, dressing and text. What comes out is an ordinary pack (level files, `pack.js`, `site.js`) that the
editor opens and edits like any hand-built one. `GENERATOR-PLAN.md` records how it was calibrated and why it is
built the way it is.

Today only HaveNot has a library (`games/havenot/gen/library/`).

## Running it

```sh
node tools/generate.mjs havenot --types                                   # the installation types
node tools/generate.mjs havenot --type war-lab --tl 3 --floors 2 --seed 7 --dry   # look first, write nothing
node tools/generate.mjs havenot --type war-lab --tl 3 --floors 2 --seed 7 --slug reactor --add
node tools/generate.mjs havenot --brief bunker --add                      # from games/havenot/gen/briefs/bunker.json
node tools/generate.mjs havenot --batch 140                               # many seeds, nothing written
node tools/generate.mjs havenot --library --write                         # check the lists, write LIBRARY-REPORT.md
node tools/gen-tests.mjs                                                   # the tests
```

`--add` puts the pack in the game's manifest (and `hn-gen-kit`, which generated packs need), records it in
`games/<game>/gen/corpus.json`, and with `--replaces <pin>` takes the stub's level out of the manifest. Nothing
is pushed anywhere: review the files and the diff, then commit.

The same seed, brief and library always give the same installation. A seed that fails its checks is retried as
`seed~1`, `seed~2`... so that stays true. The library's hash is written into every file the generator makes.

## Briefs

A brief says what to make. On the command line it's the options; in a file it's JSON in
`games/<game>/gen/briefs/`, and options still win over the file.

```json
{
  "type": "war-bunker", "tl": 1, "floors": 2, "size": "standard", "seed": "6",
  "slug": "bunker", "title": "The Bunker", "replaces": "bunker",
  "story": {
    "intro": "The first thing the player reads on floor 1.",
    "backstory": { "builder": "…", "purpose": "…", "fate": "…", "occupants": "…" },
    "goal": { "kind": "recover", "target": "the duty log" },
    "boss": { "monster": "hn-drone", "name": "The Duty Officer" }
  },
  "words": { "pin.desc": "…", "f2.goal.name": "…", "f1.r3.name": "…" }
}
```

- `type`: from the library's types (`--types`). `tl`: Threat Level 1–10 (budgets past 6 grow by 1.4 a level). `size`: small, standard or large.
- `tlStep` (CLI `--tl-step`): raise the Threat Level by one every that many floors; `tl` is the first floor's. Each floor's
  monsters, traps, treasure and hacks follow its own level, and the level file says it (`hn.threat`).
- `anyFloors` (CLI `--any-floors`): take `floors` as given, up to 10, instead of the type's own range.
- `story` sets the concept; anything left out comes from the text pools.
- `words` fixes any text slot by its id. The ids are in the pack's `generation.json` under `words`.

## What it does, in order

| Stage | File | What happens |
| --- | --- | --- |
| concept | `stages-concept.js` | Back-story (Vol 2's four questions), company, title, goal, boss. |
| zones | `stages-concept.js` | How many floors, which zones each covers front to back, each floor's look. |
| graph | `stages-graph.js` | Rooms as a tree: the critical path, side branches, which doors lock and where each key goes. |
| layout | `stages-layout.js` | Rooms grown outward from the entrance along the tree, corridors, loops, curved rooms. |
| access | `stages-fill.js` | Doors and panels, cards, badges, switches, code lockers and their memos, the goal, the stairs. |
| encounters | `stages-fill.js` | Set pieces and wandering groups to the floor's monster budget. |
| traps | `stages-fill.js` | Trap set-ups from the library, with their warnings and a way to switch them off. |
| treasure | `stages-fill.js` | Credits and items to the floor's treasure budget, in containers. |
| dressing | `stages-fill.js` | Furniture, clutter, posters, kiosks and health stations. Pieces can stand against walls, but nothing solid goes on the tile just inside a doorway, and no piece (at its full size, turned the way it faces) may cut a doorway off from the rest of its room. |
| words | `stages-words.js` | Every name and text from the pools (or the brief, or edited words). |
| checks | `validate.js` | The proof: walking the real tiles from the start with only what's been found so far; and, room by room, that every doorway opens onto all of the room's floor. |
| files | `emit.js` | Level files, `pack.js`, `site.js`, `generation.json`, `REPORT.md`. |

The proof must reach the goal and every floor's stairs with keys, clues, switches and the hacks anyone wins by
retrying (difficulty 10 or less on a d10). A brief that fails is never written out. `REPORT.md` in each pack
lists the locks and keys and what the checks found.

## Editing what it made

The level files are the game's from the moment they are written: open them in the editor and change anything.

Regenerating (running the same brief again) rewrites every file in the pack from the brief and
`generation.json`, so hand edits to the level files would be lost. Two ways to keep them:

- **Words.** Put the text in the brief's `words`, or set its entry in `generation.json` to
  `{ "text": "…", "src": "edited" }`. Rerolls and regenerations keep words from a brief, from Claude, and
  edited ones.
- **Maps.** Once a pack's maps are edited by hand, treat it as hand-built: set its entry in `corpus.json` to
  `"status": "edited"` and don't regenerate it. `tools/gen-tests.mjs` then stops expecting its files to match a
  fresh generation.

## Libraries

A library is plain data in `games/<game>/gen/library/*.js`, one `LM.genLibrary(game, { … })` call per file.
Sections: settings, budgets, types, zones, rooms, looks, dressings, monsters, encounters, locks, keys, traps,
puzzles, treasure, interest, text. Every entry can have `status: 'built'` (placed) or `'planned'` (listed from the
books, never placed) and a `ref` to the page it comes from. `--library` checks the lists against the game: a
built entry that names a monster, item or terrain the game doesn't have is an error.

To add something new to the generator's choices, build it in the game first, then mark its entry built.

## In the game

HaveNot runs the generator in the game too: the `hn-ruins` pack loads `editor/gen/` and the library and builds a
fresh Bunker and three Installation-Ruins when a run starts (`games/havenot/packs/hn-ruins/ruins.js`). Their briefs
are saved with the run, so Continue rebuilds the same ones.

## What isn't built yet

- The editor's Installations page (milestone 6 of the build prompt).
- Story arcs across several installations, and Claude writing the words (milestones 7 and 8). The words stage
  already gives every text a slot id, so Claude's text will drop into the same places.
- Puzzles beyond code lockers, and the planned monsters, traps and looks (see `LIBRARY-REPORT.md`).
