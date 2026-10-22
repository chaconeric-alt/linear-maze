# The Linear Maze engine

The runtime every game in `../games/` plays on. It holds no game content of its own.

- `index.html?game=<id>` plays `games/<id>/`. Without `?game=` it plays the first game in `games/games.js`.
- `loader.js` reads the game's `game.js`, loads the packs it lists in order, then the game's editor changes, then calls `LM.start(id)`.
- `manifest.js` holds the rules for what a game loads. The loader, the editor and `tools/package.mjs` all use it.
- `editor-runtime.js` applies what the editor saved for a game (`games/<id>/editor/edits.js`).
- `memory.js` lets floors remember how you left them (the stairs back up, return trips, elevators).
- `elevators.js` builds a game's elevators into every floor they stop at.

`SPEC.md` is the technical reference: how the engine works, how packs and levels are written, the editor's format, and games and packs (section 21).
