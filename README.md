# Linear Maze workspace

Version 0.7.1. The Linear Maze engine, the games built on it, and the editor, as three separate folders.

New in 0.7.1: big monsters find their way by their size: through gaps and doors they fit, round by a wider way, or they wait at the gap and shoot (engine SPEC 6.26).

New in 0.7.0: the next-generation line (0.6.0, below) and Dead Signal's engine (0.5.4–0.5.11, below) are one engine again: factions and allies, objectives and their markers, story lines in the middle of the screen, long bodies, curved rooms and the floor below, endings and scripted travel, places on the minimap, alongside shapes, the tilted camera, reloads and heat, partial armor and damage types.

New: the **next-generation** look, switched on floor by floor in the editor (Floor settings → Next generation, or the new **Next gen** page): a slightly tilted camera that stands the walls up and leans as you move, black ceiling silhouettes (pipes, ducts, cables, beams, turning fans), and neon tubes in your colours that light the room. The Next gen page also makes tile sets from your own pictures (sliced, scaled to game size and matched to a tile set's colours) and turns 3D models (.glb, animated or not) into sprite sheets for monsters, items and people. Floors you don't switch on, and both existing games, play exactly as before. See `engine/SPEC.md` section 22 and `editor/README.md`.

New in 0.6.0: round and other non-square rooms (circles, ovals, octagons, rounded rooms, any polygon) and round pillars, with curved walls that collide, block shots and light, and stand up on next-gen floors; weapon magazines with reloading, weapons that overheat, armor that only covers part of the body, damage types, and a hook for a game's own death screen. See `engine/SPEC.md` sections 6.4, 6.7, 21.3 and 23, and the test floor `games/round-rooms/`.
Hosted (once GitHub Pages is on for this repo: Settings → Pages → Deploy from a branch, `main`, `/ (root)`): the launcher is at `https://chaconeric-alt.github.io/linear-maze/`, Dead Signal at `https://chaconeric-alt.github.io/linear-maze/dist/dead-signal.html`, The Linear Maze at `…/dist/linear-maze.html`, and the editor at `…/editor/`. `.nojekyll` tells Pages to serve the files as they are.

New in 0.5.11: Dead Signal's prologue, *The Night Shift*: the ground floor at 01:41, before the lockdown, as the tutorial. The night staff are alive and talking about the board, which is meeting upstairs at two in the morning; ARIADNE gives you your work (your uniform and bolt driver, Jo Brennan, Kowalski's test board, four work orders round the floor); the PA calls the ones who end up on Floor 4 upstairs; and ARIADNE puts you in Comms Closet 1-C and shuts the door, just before the sirens, the shutters, the screaming and the gunfire. Then Floor 1 as before. The pause screen can skip it. Also: a supply cabinet in Floor 4's armory, and the pause screen's setting for story lines in the middle of the screen now says what it is (it read like a command, and got switched off by accident) and starts again from on. Engine: the `travel` trap effect, a level's `skip` on the pause screen, `LM.runEffects` (`engine/SPEC.md` sections 6.8, 6.16, 6.24).

New in 0.5.10: from Dead Signal's playtests of the end. On Sub-level B the board's cutters take four times as long over ARIADNE's plates (four minutes a plate while you explore, and 280 seconds on the ninth once you step into the core), so there's time to look at the Titans. The Tartarus Armory is on the map from ARIADNE's briefing, labelled, and getting there is an objective with a marker on its vault door, then one for its cases. Its weapons do six times the damage and never run dry: after the armory the game is a mop-up. And the Cryo Sprayer and Plasma Cutter do three times their damage, the Riot Shotgun twice, the Incinerator four times. Engine: rooms can be named on the minimap and put on it before you've been there (`mapLabel`, `mapWhen`; `engine/SPEC.md` section 6.21).

New in 0.5.9: the end of Dead Signal. Sub-level B, *Tartarus*: a dungeon of things the board made and couldn't kill, the Titans, behind bronze vault doors with windows (the Leviathan, the Behemoth, Tiamat, the Eye of Judgment, the Circle of Wings, the Frog, the Crystal Garden, the Hundred-Handed); bronze Wardens on their rounds; the Heirs, who offer you a collar; an armory of weapons made for the vaults; ARIADNE's core behind nine plates the board's machines are cutting. Then back up to Five, the board's last guards, and five frightened people in a boardroom, with Voss making his case for letting them go. Seven endings. Engine: `immune` enemies, shots no mirror turns, item lifetimes, `drawRadius`, the `arrive` trap trigger and trigger conditions (`when`, `unless`). See `games/dead-signal/DESIGN.md` (sections 1.7, 4.7, 4.8) and `engine/SPEC.md` (sections 6.4–6.6, 6.8).

New in 0.5.8: Dead Signal's Floor 5, *the Executive Floor*, and above it 5a, *the board's private floor*: four corner offices with private stairs up, the Gallery over the Proving Grounds, the Rotunda's fountain, a robotic kitchen, a library with a secret door, the Control Room, and the choice there: purge the mainframe as Voss says (an ending), or give the elevators power and go down to ARIADNE (the end of chapter five). Engine: curved rooms (a level's `ovals`: an ellipse fitted into a rectangle of the map, a true curve for walking, shots, sight and light, with recessed ceiling lights), seeing the floor below through glass floors and atriums (a level's `below`, terrain `seeBelow`), things that pull you in (`pull`), catch you (`snare`) or burn (`burns`), enemies that send your shots back (`reflect`), the `gaze` and `blink` attacks, statuses that hold you fast or show on you (`bound`, `tint`), endings and mid-floor checkpoints (`game.ending`, `game.checkpointHere`, trap effects `ending` and `checkpoint`), and `quick` stairs. See `games/dead-signal/DESIGN.md` (section 4.5) and `engine/SPEC.md` sections 6.22–6.24.

New in 0.5.7: from Dead Signal's playtests. Objectives: what to do next on the HUD, the thing to find picked out when you're near it and marked on the minimap (a level's `objectives`, `engine/objectives.js`; written for all four of Dead Signal's floors, and editable in the editor's floor settings). Story lines that stop the game: a speaker with `pause` is read in the middle of the screen with Continue and Skip, except in a fight (Dead Signal's Voss and ARIADNE); the pause screen can turn it off. Long bodies get a `hitbox` so shots land on all of them (the Grinners), a side can wake when you shoot it (`factionWake`: Dead Signal's specimens), and floors remember which monsters were hunting. See `engine/SPEC.md` sections 6.5, 6.16, 6.20 and 6.21.

New in 0.5.6: the AEGIS field on Dead Signal's Floor 4: ARIADNE sends the dead freight elevator up with a containment field in it that makes you much harder to hurt and, once a minute, to kill. Engine: an elevator can be parked on a floor without power and bring cargo (`parked`), gear can have a `lastStand` when a hit would kill you, and gadgets can resist statuses and draw an aura. See `engine/SPEC.md` sections 4 (*Damage*), 6.12 and 6.15.

New in 0.5.5: Dead Signal's Floor 4 (*the Proving Grounds*): a trial, a maze of traps, and the board's nightmares in their private suites. Engine: waves (a `spawn` trap effect can tag what it spawns with `as`, and a `clear` trap waits for a group spawned later), a `faction` effect with `aggro` (let out to hunt), and a search limit for `LM.ai.goTo`. See `games/dead-signal/DESIGN.md` (section 4.4) and `engine/SPEC.md` section 6.8.

New in 0.5.4: Dead Signal's Floor 3 (*Gestation*), and the engine feature it needed: factions. Enemies have sides: robots and monsters fight each other, and an enemy can be on yours (it fights with you and never hurts you; your shots go through it). A game sets who fights whom, a floor can change it, and a trap or code can move enemies from one side to another. Statuses can count down on the HUD, stack, and follow you up the stairs; a `branch` trap effect plays one set of effects or another depending on story flags. Every Linear Maze floor plays as before. See `games/dead-signal/DESIGN.md` (section 4.3) and `engine/SPEC.md` sections 5, 6.8, 6.17 and 6.20.

New in 0.5.3: Dead Signal's Floor 2 (*Synthid Research*), and the engine features it needed: status effects on the player and on enemies (slowed, chilled, stunned, damage over time), with resistance from armor and chips on the HUD; named boss bars with phases; more kinds of ammunition than the built-in four; key items you carry from floor to floor. See `games/dead-signal/DESIGN.md` (section 4.2) and `engine/SPEC.md` sections 6.5 and 6.17–6.19.

New in 0.5.2: Dead Signal's Floor 1 (*Lockdown*), and the engine features it needed: stairs that lead somewhere of their own and stay locked until a story flag; elevators that wait for power; clearance doors that open for a flag; transmissions, someone speaking over the intercom while you play. See `games/dead-signal/DESIGN.md` and `engine/SPEC.md` sections 5, 6.2, 6.15 and 6.16.

New in 0.5.1: the stairs you arrived by take you back up, and every floor is as you left it when you return. Elevators: place one on any floor's map (the palette's Elevators tab) and it is built into every floor, at the same place and the same way round. See `engine/SPEC.md` sections 5 and 6.15.

| Folder | What it is |
|---|---|
| `engine/` | The runtime. It plays any game in `games/`: it reads the game's manifest, loads only the asset packs that manifest lists, and builds the title screen from it. |
| `games/` | One folder per game. Each has a `game.js` (title, title screen, words on the end screens, the packs it loads), its own asset packs (levels, monsters, items, tile sets, furniture, people, stories), and what the editor saved for it. |
| `editor/` | The Linear Maze Editor. It stands alone: it opens any workspace, or any packaged game's folder. |
| `tools/` | `package.mjs`: writes one game for players (the engine plus that game's files). |
| `index.html` | A launcher: every game here, with Play buttons, and the way into the editor. |

The games:
- **`games/linear-maze/`: The Linear Maze.** Its eleven packs are in their own folders: core, maze, office, memos, chessboard, apartment, rotary, dressings, home-story, library and town.
- **`games/dead-signal/`: Dead Signal.** A technician trapped in a biotech lab gone wrong fights his way to the top floor. The plan is `games/dead-signal/DESIGN.md`. A prologue (*The Night Shift*) and Floors 1 to 4 (*Lockdown*, *Synthid Research*, *Gestation*, *the Proving Grounds*) are built, in Dead Signal's own packs (`packs/ds-*`); the floors you made in the editor on October 14 (*The Sterile Annex*, *The Dead Signal Laboratory*, *The Complex*) follow it as placeholders. It loads the Linear Maze's core, office (without its people and phone) and dressings packs.

## Play

Open `index.html` and click Play, or open `engine/index.html?game=linear-maze` (or `?game=dead-signal`). It works straight from the folder; no server needed.

Controls: WASD move, mouse aim, hold click to fire, Shift dash, E interact or talk, 1–9 or wheel to switch weapons, Tab inventory, Esc pause, M sound. Gadgets add their own keys (The Linear Maze's phone is F).

## Make and change games

Open `editor/index.html` in Chrome or Edge, click **Open workspace folder**, and pick this folder (the one with `engine`, `games` and `editor` in it). Choose a game, or **+ New game**:
- **A blank game:** you pick the packs it starts from, from any game here.
- **A copy of a game:** it loads the same packs and starts with a copy of that game's editor changes.

Each game's **Game page** in the editor has:
- its title screen, with a live preview: the title's lines, layout, size and font, the accent colour, tagline, button, footer, and the floor or picture behind it;
- the words on the engine's own screens: the end of a floor, the end of the game, dying, floor numbers;
- the packs it loads, in order: any pack from any game, with or without its floors, or everything another game has. It flags packs that need others first, and things your floors use that no loaded pack provides (and which pack has them).

Everything else is where it was: floors, maps, items, monsters, the player, gear, tile sets, pictures, people, settings and Ask Claude. See `editor/README.md`.

## Give a game to players

```
node tools/package.mjs linear-maze      # or dead-signal, several ids, or --all
```

The editor's **Package for players** button does the same without Node. Either way you get, in `dist/`:
- `dist/<id>/`: zip it and hand it out. Players open its `index.html`. It holds the engine, that game, and only the packs it loads.
- `dist/<id>.html`: the same game as one file.
- `dist/<id>.artifact.html`: that file, ready to publish as a claude.ai Artifact.

## Give the editor to someone

Copy the `editor/` folder on its own. Whoever has it opens a workspace (or a packaged game's folder) with it. It uses the `engine/` inside the folder it opens, so it always agrees with the engine that game runs on.

## What moved, from 0.4.4

| 0.4.4 | 0.5 |
|---|---|
| `index.html` | `engine/index.html`. The game it plays comes from `games/<id>/game.js`. The title screen is no longer written into the page. |
| `packs/<pack>/` | `games/linear-maze/packs/<pack>/`, each with a `pack.js` listing its files. |
| `levels/<floor>.js` | `games/linear-maze/packs/<pack>/levels/<floor>.js`, inside the pack it belongs to (the three maze floors are the `maze` pack). |
| `packs/apartment/story.js` | `games/linear-maze/packs/home-story/story.js` (the apartment can now be used without its story). |
| `packs/editor/runtime.js` | `engine/editor-runtime.js` |
| `packs/editor/edits.js`, `sprites.js` | `games/<id>/editor/`. Linear Maze's are as 0.4.4 shipped them; your October 14 save is now Dead Signal's. |
| `tools/build.mjs` | `tools/package.mjs` |
| `tools/chessboard/`, `tools/memos/` | `games/linear-maze/tools/` |
| `SPEC.md` | `engine/SPEC.md` (the engine, packs, editor format, games) and `games/linear-maze/SPEC.md` (the game). |
| `HANDOFF.md`, `README.md` | `games/linear-maze/` |

Saves carry on: The Linear Maze still keeps its checkpoint under `linear-maze-save-v1`. Every other game has its own save slot.

## Read more

- `engine/SPEC.md`: the technical reference. Section 21 covers games, packs and the loader.
- `games/linear-maze/SPEC.md`, `HANDOFF.md`: The Linear Maze's design spec and hand-off notes.
- `editor/README.md`: using the editor.
