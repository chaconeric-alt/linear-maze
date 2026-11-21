# maze3d: changelog

What changed and when, newest first. The reference for how things are now is `SPEC.md`; how to work on the code is `CLAUDE.md`.

## 2026-11-21

- **The baseline runs on GitHub.** `.github/workflows/maze3d-selftest.yml` runs `tests/run_baseline.py` on every push and pull request that touches `maze3d/`, on headless Godot 4.7.2, and fails the check if any run fails.

## 2026-11-20 (evening): menus that fit, image prompts, repeatable tests

- **Menus fit the window.** The title, pause and end screens and the terminal panels sit in the middle of the window in a frame (`HudFit`, `engine/hud/fit.gd`) that scrolls, with a scroll bar, when what they hold is taller or wider than the window; the keyboard focus is followed, and a panel that changes page starts at the top again. The title screen used to run off the bottom of the window once the list of levels grew. The self-test's new `menus` part opens each one, and a panel with 24 options, on a 1280 × 720 window and checks that every button is on screen or can be scrolled to. (`Hud._pause` is now `show_pause`, and `show_end` shows the end screen at once.)
- **Easy mode's P: image prompts** (the patch that was delivered as a zip on 20 Nov, now part of the branch). After E has named something, P writes a prompt for an image generator to draw a new version of it (lead, footprint class, proportions, measured colour scheme with hex codes, glow, moving parts, the kit's style line, the low-poly and shot lines) to the console, the clipboard and `user://image_prompts.txt`, with notes for the 3D generator and the hand-over under it. New data: `games/havenot/prompts.json` (now also holding what kit material names mean, which the patch had in code) and `kits/<kit>/prompt.json` for 15 kits; E now shows a kit's name for a model when its `prompt.json` gives one. Code: `engine/imageprompt.gd` (`ImagePrompt`), cut into `engine/imageprompt/measure.gd` (`PromptMeasure`) and `writer.gd` (`PromptWriter`) to keep to the size limits. `--prompts` makes the self-test print every prompt it writes. Its prompts are word for word the patch's.
- **The self-test is repeatable by default, with a runner.** `--selftest` now seeds the random numbers and counts the clock in frames, as `--repeatable` does (`--realtime` for the old behaviour). `python tests/run_baseline.py` runs every line of the new `tests/baseline.txt` with Godot's `--fixed-fps 60`, two at a time if asked (Staff Only alone), prints a line per run with its failed checks, keeps the logs in `tests/out/`, and with `--out` and `--compare` lists every check that differs between two runs. Run this way the baseline gives the same result every time: 2,208 checks, with three fights that never finish (Ceiling Turret on generated seed 11, Dancer on the Megaplex, Mourner on the Basilica), looked at below.
- **The remaining bugs, looked at again.** The three fights that never finished in repeatable runs were the test's doing, not the game's: on the Megaplex and the Basilica (seed 5) it stood the player in the middle of a cell that had a piece of furniture in it, the physics pushed the player out behind the furniture, and the Dancer and the Mourner were on the far side of it for all 900 frames; on generated seed 11 it shot at a Ceiling Turret twelve metres up from straight underneath, past the 86° a mouse can tilt the head, so recoil carried the aim past it. The fight test now stands the player only where the player's body fits, no more than 70° below the target if anywhere else will do, and aims no higher than `PlayerCamera.PITCH_LIMIT`; all three fights are won. The generator's last resort could itself return nothing when a theme's settings fit fewer than three rooms, and the game would then try to build nothing: it now tries every seed again without the lock, and if none fits Main says so (back to the title, or an error and exit 1 from the command line). The last game ids in `engine/` went to data: `+` is a door because the game's new `legend` in `game.json` says so, a level that names no kit uses the game's first kit, and with no game named anywhere the engine boots the first folder in `games/`. `tools/blender/kits_home.py` pointed at a file that does not exist.

## 2026-11-20: after the refactor

- **Repeatable runs, built in.** `--repeatable[=seed]` (`Debug.repeatable`) seeds the random numbers before the level is built and counts the clock in physics frames (`Debug.now_msec()`, which every bob, pulse and grind now reads instead of `Time.get_ticks_msec()`). With Godot's `--fixed-fps 60` a self-test run is the same line for line every time, so two versions of the code can be compared without patching throwaway copies.
- **The last long code cut up, and the bunker's words moved to data.** `engine/hud.gd` (591 lines, `_ready` 129) builds its status, messages and panel in a function each and has its parts in `engine/hud/`: `HudStyle`, `HudCrosshair`, `HudMap`, `HudScreens` (title, pause and end). `engine/home.gd` (524 lines) keeps the furniture and the panels; decorating is `HomeDecorating` (`engine/home/decorating.gd`). Every text the bunker shows is `words` in `defs/home.json` (new key; nothing old changed), and the rack and the trophy case use the models standing there instead of naming `hm_rack` and `hm_trophy`. `Trap` builds and runs each kind in a function of its own; `Identify` describes each kind of thing in one; `Prop.setup` and `Lift.setup` are cut into their steps. `Identify` asks doors, pickups, props, stations and pits through public methods instead of reading their private fields (`Pit.is_sprung()` is new).
- **Generator: no door left standing beside the basement's lift shaft.** The basement's doors were placed on its thresholds while the lift shaft was still rock; digging the shaft afterwards could leave a door beside it with floor on one flank, which the engine then left out with a warning (13 of 330 generated levels, seeds 1–30 of every theme, among them `gen:rooms:deep --seed=5`). Such a door is now a plain opening. No random numbers are drawn for it, so every other level is unchanged.

## 2026-11-20: the maintainability refactor (branch `maze3d-refactor`)

A structural cleanup. The game plays as it did; formats, def keys, level files and kit files are unchanged except where noted.

1. **Effects.** One `EffectRegistry` (`engine/effects.gd`): effect type to handler. `Game`, `Level` and `Prop` use types and the HUD's option keys register into it (`engine/level/level_effects.gd`, `engine/prop_uses.gd`, `engine/option_gates.gd`). `Game.run_effects` kept its signature.
2. **Interaction.** Everything the HUD's `_choose` did except drawing moved to `engine/interaction.gd` (`Game.interaction`): conditions, costs, hack and risk rolls, "used" marks (kept by the thing's id, not written into level dictionaries), effects, callbacks. Command-line test switches became `engine/debug.gd` (`Debug`), set by `Main` and by the self-test.
3. **Level split.** `engine/level.gd` became a thin node that owns `LevelData`, `LevelBuilder` (with `LevelCollision`, `LevelNav`, `LevelFluid`, `LevelEnvironment`), `LevelLights`, `Spawner` (a registry of factories by entry kind), `LevelSigns`, `Triggers` and the F1–F3 `LightingDebug`, all in `engine/level/`. Its public methods are unchanged.
4. **Actor split.** `engine/enemy.gd` (`Enemy`) became `engine/actor/`: `ActorCore` and `Actor`, with component nodes (`ActorSenses`, `ActorLocomotion`, `ActorClimb`, `ActorAttacks`, `ActorAimRig`, `ActorLooks`, `ActorLounge`, `ActorOffDuty`, `ActorConversation`) added only when their def key is present, an explicit state (dormant, idle, alert, attacking, stunned, climbing, off duty, dead) and one `target()`.
5. **Player split.** `engine/player.gd` keeps the body, health and use; `engine/player/` has `PlayerControls`, `PlayerMovement`, `PlayerCamera` and `PlayerWeapons`.
6. **Generator pipeline.** `generators/rooms.gd` `_try` (one 1,100-line function) became named stages over a `GenContext` in `generators/rooms/`. Same seed, same level, byte for byte.
7. **Content out of code.** The bunker's catalogue, prices, repair recipe, robot, broadcasts and programmes are `games/havenot/defs/home.json`; the generator's locker table is `generator_params.lockers` in `game.json`. (New data; nothing old changed.)
8. **Schema.** `engine/schema.gd` checks the keys of actors, items, weapons and level things against the lists in `SPEC.md`, at boot and in the self-test. `SPEC.md` gained the keys the engine read without documenting them (`gib`, `still` and `turn` on actors, `kit`, `text` and `trophy` on items, `greet` on things).
9. **Tools.** `tools/levels/levelkit.py` holds what the level scripts shared. The Blender kit scripts are named for their kits (`kits3.py` to `kits8.py` became `kits_works_bunker_crypt.py`, `kits_executive_megaplex_hospital_basilica.py`, `kits_robots_loot.py`, `kits_drowned_dust.py`, `kits_home.py`, `kits_anomalous.py`).
10. **Tests.** `engine/selftest.gd` became `tests/` (a runner and one part per feature); the bunker's and the Anomalous Structure's own tests sit beside their levels (`games/havenot/levels/<id>_test.gd`). Tests use public methods only.
11. **Documentation.** `SPEC.md` is one section per subsystem; this file holds the history; `CLAUDE.md` is new.

## 2026-11-19: the Anomalous Structure

- The 2D game's Installation A as one level of three stacked floors joined by two lifts, with its own kit (`kits/anomalous`), two new machines (the Heavy Security Drone, the field emitter), and new pieces usable anywhere: effects `anger`, `pacify`, `show`, `hide`, `drop`, `chance`; `lights` by floor and with `energy`; `spawn` by storey; `alarm` heard on the player's floor only; panel options `cost`, `hack`/`hard`, `risk`, `fail`; traps `darts`, tripwires (`trip`) and `off` lists; the repair bay (`rebuild`); item kind `quest`; signs on monitors of their own; per-thing conversations with `talk.after`.
- Hacking became a chance (`hacking.base` + `hacking.per_level` × `player.level`, less `hard`), not a wait.
- A trap works only on its own storey (it used to hurt anyone standing above or below it) and finds the walls for its emitters on its own storey. Dart ports are left off a side that is a door or a window. A flyer lowers itself under a low ceiling. A dead flyer's model is lifted onto the floor it lands on (it used to hang through the ceiling of the room below).
- Shock plates are heard only within `hear` metres on their own storey (they sounded like a siren across the level).
- Sign monitors fit their text and their room; a wall face with something hung on it gets a plain tile.

## 2026-11-18

- **Home**, the bunker: the `home` kit, the level, banking (`Profile`), the armoury, the repairable robot, decorating.
- Two more ruined installations: Thalassa Deep Array (`drowned`) and Helion Dust Station (`dust`).
- **Staff Only** rebuilt as the test floor: everything off duty, monsters that talk and show what they do on targets (`drill`, `drill_stop`), panel options `results`, `final`, `after`, `call`.
- Robot stations (`kits/robots`), loot containers (`kits/loot`), nooks for lifts and Sphinx guns.
- Ceilings under other rooms: the lower room's own ceiling tiles squashed under the slab (it was a bare slab with a strip lamp; then the tile was hidden inside the slab). Things that die on a lift ride it.
- Lighting: equal shadow-atlas quadrants, gentler full-resolution ambient occlusion, screen-space indirect light off, narrower shadow blur, the player's lamp casts no shadows, `--lights`, F1–F3 lighting tests; the `worn` shader takes world position from the camera, not the model matrix.
- Z-fighting: models no longer have two coloured faces in the same plane (`Mesh._unfight`).

## 2026-11-12

- Four more places (Executive Floor, Megaplex, Hospital, Basilica) and rooms with a purpose; four Kaveros chairs, the outside-furniture pipeline, chair-and-station sets (`seat`).
- Floors on floors: upper doors, upstairs rooms, basements, lifts, pit traps, sunk pools.
- Sniper zoom; dead things fall; shelving rare upstairs.
- Adopted: the Sphinx Gun (in three sections), the Dancer and the Hammerhead Gallumper (equalizer lights, dancing in pairs, per-attack clips, `grapple`), the Mourner (trailing tatters), the Deadbot (heavy feet).
- The Plodder fires where its gun points, and its gun swivels on to the player first.
- Easy mode's E names what you look at.

## 2026-11-11

- Level shapes: cut corners, three storeys, balconies, ramps, thin walls, windows; seen enemies on the map. The generator builds every room shape the engine has.
- Easy mode for play-testing (the player deals ×3, takes ÷3); single-theme random levels on the title screen.
- Adopted: the Fouler (jelly shader, burning `touch`, acid `puddle`), the Plodder (a new machine rig, shells from the barrel tip, `aim.muzzle`), the Knife Fighter (replacing the Drone's model).
- Iris doors open fully.

## 2026-11-10

- Scanner arches, wall lockers, the Agency kit; doors only on thresholds (a generated door could stand free inside a room).
- Three more places (Works, Bunker, Crypt) and twelve more monsters. Kit ids carry a tag (`wk`, `bk`, `cr`) because kits borrow from each other.
- Lounging, pouncing and wall-crawling; fluid and swimming. Adopted from Tripo: the Roach, the Monoid, the Glorexx, the Eggbot, the Custodian.
- The self-test brings perched monsters down before fighting them.

## 2026-11-09

- A first-person 3D engine in Godot 4, with one HaveNot level (Kaveros Deepworks).
- The HUD no longer swallows key presses (E, F and the number keys reach the player). Pausing stops the world as well as physics.
