# maze3d: notes for whoever works on the code

maze3d is a data-driven first-person engine in Godot 4 (GDScript; built and tested on 4.7.2) and the first game on it, HaveNot. The reference for every format and subsystem is `SPEC.md`; what changed and when is `CHANGELOG.md`; what the game is is `README.md`. Read `SPEC.md` sections 1 and 5 before changing engine code.

## What each subsystem does, and where it lives

| Subsystem | Where | What it does |
|---|---|---|
| Registry | `engine/lm.gd` (autoload `LM`) | Boots a game: reads `game.json`, kits, defs, levels, generators; checks the schema. Model and def lookups, sounds. |
| Run state | `engine/game.gd` (autoload `Game`) | One run: player, level, flags; keys, credits, haul, stats (kept in `State.run()`); `run_effects`; `Game.interaction`. |
| Saved state | `engine/state.gd` (autoload `State`, class `WorldState`) + `engine/state/` | The one record of the world, and the one thing saved (`user://saves/<world>.json`, `.tmp` then rename, `.bak`): world (home = the bunker), characters, run, levels; versioned, migrated as read (`StateMigrations`). `SavePoint`: where a save comes back to (`run.where`); `Main.save_game` / `restore_game` (F9, F10, Save, Restore from save). |
| Bunker record | `engine/profile.gd` (autoload `Profile`) | A front over `State.home()`: banked credits, weapons, armour, salvage, trophies, furnishings, the robot; `record()` = the character's runs, deaths, best. |
| Event bus | `engine/events.gd` (autoload `Events`) | Game facts (`actor.died`, `item.taken`, `door.changed`, `flag.set`, ...) from whoever caused them to whoever listens; plain-data payloads; `--trace=events`; event triggers in level data. |
| Effects | `engine/effects.gd` | `EffectRegistry`: effect type to handler. Run-wide types in `game.gd`, the place's in `engine/level/level_effects.gd`, a prop's `use` in `engine/prop_uses.gd`. |
| Panels | `engine/interaction.gd`, `engine/option_gates.gd` | What a panel offers and what choosing does (conditions, cost, hack, risk, used marks, effects). `hud.gd` only draws. |
| Level | `engine/level.gd` + `engine/level/` | A thin `Level` node owning `LevelData` (cells and queries), `LevelBuilder` (shell, collision, nav, fluid, environment), `LevelLights`, `Spawner` (things, by kind, with stable keys), `PropParts` (what comes with a piece of furniture: its chair, the chairs round a table, a footlocker, the goods it holds), `LevelSigns`, `LevelZones` (a level's `zones`: danger zones), `Triggers`, `LightingDebug`, `LevelMemory` (what a level remembers between visits: taken on leaving, laid on building), `Restock` (what its makers made again while the player was away, counted in the world's days). |
| Actors | `engine/actor/` | `Actor` on `ActorCore` (body, state machine, damage) plus components added only when their def key is present; `ActorRemains` is added when it dies (dying, the fall, the model laid on the floor); `ActorWary` keeps flyers and climbers out of traps; `ActorFoes` picks whom it fights when factions are at war in the level (`Factions`: the game's `factions`, a level's over them); `ActorPatrol` walks an entry's `patrol` beat; the danger-zone monsters' pieces: `ActorWounds` (armour by side, splitting, fearing the lamp), `ActorMoves` (beam, latch, charge, burst), `ActorBrood` (what it makes in a fight, the doors it seals), `ActorCloak`; `ActorClips` plays clips. |
| Player | `engine/player.gd` + `engine/player/` | The body, health and use; `PlayerControls`, `PlayerMovement`, `PlayerCamera`, `PlayerWeapons`, `PlayerUnstick` (puts a boxed-in player back where they stood a step before). |
| World things | `engine/prop.gd`, `station.gd`, `door.gd`, `pickup.gd`, `trap.gd`, `pit.gd`, `lift.gd`, `target.gd`, `rebuilder.gd`, `projectile.gd`, `puddle.gd`, `fx.gd` | One class each. A trap's kind is its own class in `engine/traps/` (`TrapKind`: `TrapLaser`, `TrapDarts`, `TrapShock`, `TrapVent`, and the danger zones' `TrapCrusher`, `TrapFlame`, `TrapSweep`, `TrapMine`, `TrapSpores`), made by `Trap.make_kind`; `collapse.gd` the rotten floor, `maker.gd` what makes monsters while the level is played (a danger zone's alarm), `cloud.gd` a cloud that hangs and hurts (the `cloud` effect, a Sporecap's burst), `afflictions.gd` burning, poison and stun (what a hit leaves behind). |
| Damage types | `engine/damage_types.gd` | `DamageTypes`: the game's `damage_types`, one list of the kinds of hurt; a kind's aliases are the same type, so `takes` written with an old name still applies (`taken`). Blasts (`Fx.explode`) take a kind, knock, lift, the player's own and a fireball from a projectile's `blast`. |
| HUD | `engine/hud.gd` + `engine/hud/` | Status, messages, panels (drawing); `HudStyle`, `HudCrosshair`, `HudMap`, `HudScreens` (title, pause and end). |
| Easy mode | `engine/identify.gd`, `engine/imageprompt.gd` + `engine/imageprompt/` | E names what you look at; P writes an image-generator prompt for it (wording in `prompts.json` and each kit's `prompt.json`). |
| Installations and travel | `engine/installations.gd`, `engine/main/arrival.gd`, `Main.travel` | Places made of several levels (the game's `defs/installations.json`: levels, named entrances); the `travel` effect carries the expedition into another level, arriving at a named way in (`{"start": "<name>"}`); `Arrival` makes the player as a level is entered (a save, travel, the bunker's lift, or plain). |
| Bunker | `engine/home.gd` + `engine/home/decorating.gd`, `engine/home/armoury.gd`, `engine/home/creation.gd` | What the home level's furniture does, decorating, the armoury rack as the loadout (with the outfitter), and making a new scavenger at the ledger (`HomeCreation`); its content and words are `games/<game>/defs/home.json`. |
| Character | `engine/character_sheet.gd` | `CharacterSheet`: what a character's origin, mutations and skills come to (the game's `defs/character.json` and `character`): stats, and what they give by name (`hp`, `move`, `pack`, `slots`, `hack`, `heal`, `sense`, `armor`, `lamp`), read by the player, carrying, hacking, the `skill` gate and the map. |
| Carrying | `engine/carrying.gd` | `Carrying`: weapons in hand, the pack's bulk, worn gear (the game's `carrying`); where a pickup goes; the HUD's pack readout. `Debug.carry_anything` lifts it for the self-test. |
| Switches | `engine/debug.gd`, `engine/main/command_line.gd` | Test and look switches; `main.gd` sets them from the command line, and `CommandLine` runs the ones that act while the game runs (`--shot`, `--frames`, `--trace`, `--at` ...). Game code never reads the command line. |
| Schema | `engine/schema.gd` | The valid keys of actors, items, weapons and level things (mirrors `SPEC.md`). |
| Generators | `generators/rooms.gd` + `generators/rooms/`; `generators/programme.gd` + `generators/programme/` | `rooms`: a pipeline of named stages over a `GenContext`. `programme` (`ProgrammeGen`): a level file's written `programme` (rooms with purposes, sizes, neighbours; wings; locks) laid out from the world's seed as it is entered, and proved finishable (`ProgrammeCheck`). Both make danger zones (`generators/rooms/danger.gd`, `ProgrammeDanger`) from the game's `defs/danger.json`. |
| Game data | `games/havenot/` | `game.json`, `defs/`, `levels/` (and a level's own test, `<id>_test.gd`). |
| Kits and models | `kits/<kit>/`, `actors/` | Tiles, models, materials; rigged monsters. Generated by `tools/blender/`. |
| Tools | `tools/levels/` (with `levelkit.py`), `tools/blender/`, `tools/inspect_model.py`, `tools/gen_check.gd` | Level scripts, model scripts. |
| Tests | `tests/` | The self-test runner (`selftest.gd`), `part.gd`, one part per feature. |

## Invariants

- **Data-driven.** Levels, defs and kits are JSON; models come from `tools/blender/`; hand-built levels come from `tools/levels/`. A game is a folder of data. Do not change a JSON format, a def key, a level file or a kit file without updating `SPEC.md` and `Schema` together, and old data must still load.
- **No game ids in `engine/`.** The engine must not name a monster, item, weapon, model, level or kit of any game, or carry its words. Content goes in the game's data. (The last ones, the fallback game, the `+` door and the default kit, moved out on 20 Nov: the fallback game is the first folder in `games/`, the `+` door is the game's `legend`, the default kit is the game's first.) Still in a generator: `generators/rooms/context.gd` falls back to `door_split` when `generator_params` names no doors.
- **Effects are the only scripting language.** Anything that should happen because of a trigger, a terminal, an item, an arch, a death or a locker is an effect type registered in the `EffectRegistry`. Do not add per-level code paths; add an effect.
- **Same seed, same level.** Generators draw every random number from their one generator in a fixed order. A change to a generator that is meant to be structural must leave `--dump` output byte-for-byte identical.
- **Public members across classes.** Do not reach into another class's underscore fields or methods; add a small public method. Tests use public methods only.
- **Level keeps its public API**; actor components exist only when their def key is there; the target is read through `Actor.target()`.
- **Comments say why, in plain English.** Every file starts with `##` lines saying what it is for.

## Budgets

- No file over about 400 lines; no function over about 60 lines. Cut by job, not by line count: a new file for a new job, a function per step.
- Still over (to be cut when next touched): `tools/levels/staffonly.py` (`kit_wing` 274) and `anomalous.py` (633 lines of layout); the Blender kit scripts (one model per function, many files over 400 lines).

## Running the tests

```
godot --headless --path maze3d --import                   # after adding a script with a class_name
python3 maze3d/tests/run_baseline.py --out before          # the whole baseline, repeatably, before a change ...
python3 maze3d/tests/run_baseline.py --compare before      # ... and after it: every check that differs is listed
godot --headless --fixed-fps 60 --path maze3d -- --level=<id> --selftest      # one run by hand
```

The baseline is `tests/baseline.txt`: `staffonly`, `deepworks`, `menagerie`, `anomalous` (and with `--story`), `home`, `gen:rooms` with seeds 5, 7, 11 and 22, every theme at seed 5, the Descent (`descent_1`, its own test: travel between levels), the Yard (`yard`, its own test: factions and patrols), the Proving Range (`range`, its own test: damage types and explosives), the Blueprint (`blueprint`, its own test: a level laid out from a programme), the Blueprint, Two Floors (`blueprint2`, its own test: a programme of two floors) the Warlord's Bunker (`warlord_1`, its own test: Levels 1 and 2 from their programme) the Collections Office (`collections`, its own test: danger zones) the Pen (`pen`, its own test: the danger-zone monsters' pieces and afflictions) and the Listening Post (`perception`, its own test: what monsters see and hear and where they go). Every check that passed must still pass; never fix a failure by weakening a test. A script error does not always fail the test: look for `SCRIPT ERROR` in the output too (the runner counts them).

- The self-test is repeatable by default (a fixed seed, the clock counted in physics frames); with Godot's `--fixed-fps 60`, which the runner passes, a run prints the same lines every time, so a difference between two runs is a difference in the code. `--realtime` makes physics follow real time as in the game: use it to hunt checks that fail only now and then (`SPEC.md` section 9 lists the known ones). `--repeatable` does the same for runs that are not self-tests.
- A change that only moves things about should leave the baseline line for line the same (`--compare`). A change that moves the player or a monster, or adds frames to a test (a key press waits three), shifts every fight after it: compare the checks, not the lines, and look at any fight that now fails.
- GitHub runs the same baseline on every push and pull request that touches `maze3d/` (`.github/workflows/maze3d-selftest.yml`, headless Godot 4.7.2, three runs at a time); a red check means a run failed a check, hit a script error or printed no result, and the logs are kept as the run's `selftest-logs` artifact.
- Never read `Time.get_ticks_msec()` in game or test code; use `Debug.now_msec()`, or the runs stop being repeatable.
- Staff Only peaks near 3 GB: do not run two at once on a small machine.
- `--dump=file.json` with `--frames=2` writes a generated level and quits; compare before and after a generator change.
- Godot rewrites `.import` files when it runs; revert them before committing (`git checkout -- '*.import'`). New scripts get `.uid` files: commit those.

## Changing things

- A new def key or thing key: read it in the engine, document it in `SPEC.md`, add it to `engine/schema.gd`. The self-test fails if `Schema` knows a key `SPEC.md` does not mention.
- A new effect: `EffectRegistry.register` in the part of the engine it belongs to; document it in `SPEC.md` 4.10.
- A new level thing: `Spawner.register_kind`; document it in `SPEC.md` 4.5; add it to `Schema.THING_KINDS`.
- A new feature check: a `SelfTestPart` in `tests/`, listed in `SelfTest.STANDARD`; a check for one level only goes in `games/<game>/levels/<id>_test.gd`.
- New content (a kit, style, model, door, monster, item): run `python3 tools/levels/staffonly.py` so the test floor has it, then the Staff Only self-test.
- Level scripts: after editing one, run it and check the level file changed only as intended (`git diff`).
- Write the change into `CHANGELOG.md`.
