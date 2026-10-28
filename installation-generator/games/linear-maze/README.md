# The Linear Maze

A fast, top-down 2D shooter for the browser. A quiet morning on the 14th floor of an office tower (the Office pack: coworkers to talk to, a phone instead of a gun, and a door that wasn't there before), then three maze floors with five weapons, eight enemy types including a boss, eleven pieces of gear, traps, chests, altars, slot machines and recharge stations. After those come the Office on Chessboard 1, the apartment, the evening and the night at home, the Library Maze, and the morning in town.

This is one game in a Linear Maze workspace: the engine is in `../../engine/`, the editor in `../../editor/`. See the workspace's `README.md`.

## Play

- Open `engine/index.html?game=linear-maze` in a browser, or open the workspace's `index.html` and click Play.
- Or package it (`node tools/package.mjs linear-maze`, from the workspace) and open `dist/linear-maze.html`.

Controls: WASD move, mouse aim, hold click to fire (or take a photo when you have no weapon), Shift dash, E interact or talk, F phone, 1–9 or wheel to switch weapons (or pick a reply), Tab inventory, Esc pause, M sound.

To skip the office and start in the maze, set the first floor to the Sunken Cloister on the editor's Game page, or use `LM.debug.warp('sunken-cloister')`.

## What's here

- `game.js`: the manifest. It sets the title screen, the words on the engine's end screens, the save slot (`linear-maze-save-v1`), and the packs, in load order:
  - `core` (needed by every game)
  - `maze`, `office`, `memos`, `chessboard`, `apartment`, `rotary`, `dressings`, `home-story`, `library`, `town`
- `packs/<pack>/`: each pack's files, its `pack.js`, and its floors in `levels/`.
- `editor/`: what the editor saved for this game.
- `tools/`: the Chessboard 1 layout builder and the Memos placement checker. Run them from the workspace folder: `node games/linear-maze/tools/chessboard/build-layout.mjs`.
- `SPEC.md`: the design spec (what's in the game, numbers, backlog).
- `HANDOFF.md`: who owns what, how the packs hook into each other, flags and knobs.

Console helpers while playing: `LM.debug.warp('ember-foundry')`, `LM.debug.giveAll()`, `LM.debug.god()`, `LM.debug.reveal()`.

## Iteration notes

**0.3: Memos and Chessboard.** Two more packs ride on the Office pack:
- **Memos:** motivational posters, notices and a message board, security cameras, desk toys, email at your desk, Alice's encrypted goodbye, and NOTICE / MESSAGE / EMAIL scores.
- **Chessboard:** a fifth floor after the Reliquary, *The Office on Chessboard 1*. Everyone is the real version of themselves, and you have three tasks to finish before 5:00.

See `SPEC.md` section 14, and `HANDOFF.md` for how the new files connect to the existing ones. `LM.debug.warp('chessboard-one')` jumps straight there.

**The editor.** `editor/index.html`, in the workspace, is a point-and-click editor for this game and any other: floors and their order, maps painted with the real renderer, items and their abilities, monsters, the player, weapons and gear, tile sets, people, pack settings, the title screen, and the packs a game loads. Claude can make or change any of them from a description. See the workspace's `editor/README.md`, and `engine/SPEC.md` section 15 for the format.

**Apartment (Chessboard 0)** is a new first floor: the player's apartment, the evening before. See `SPEC.md` section 16.

**Red rotary phones**: every floor has one, each with its own 7-digit number. Dial another floor's number to go there. See `SPEC.md` section 17.

**The evening, and Chessboard 1 at home**: dinner and TV are now tasks, the red phone rings, and a voice on it sends you to *Home (Chessboard 1)*, a warped copy of the apartment. Behind Dave's door down the hall is *The Library Maze*, two floors of bookshelves, Librarians, Book Worms and Overdue Ghosts. See `SPEC.md` section 19. `LM.debug.warp('home-cb1')` or `LM.debug.warp('library-1')` jumps straight there.

**The morning after**: back from the library, you sleep, and wake up on Chessboard 0. Alice calls on the red phone: she's lost somewhere familiar. The stairs lead to a *Town Map* with pins for the places you went together:
- a coffee shop;
- the Book Nook (and its Chessboard 2 version);
- a gas station;
- Forking Paths Park and, under its sundial, *The Maze of Forking Paths*.

See `SPEC.md` section 20. `LM.debug.warp('town-map')` jumps straight there.

**0.5: its own folder.** The game moved into `games/linear-maze/`, each pack into its own folder with its floors, and the title screen into `game.js`. Nothing about how it plays changed.
