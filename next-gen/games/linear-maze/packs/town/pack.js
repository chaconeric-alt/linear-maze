/* games/linear-maze/packs/town/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Town',
  version: '0.1.0',
  description: 'The morning after: the Town Map and its pins, the places you and Alice went (Coffee Shop, Book Nook and its Chessboard 2 version, Falcon Gas, Forking Paths Park and six smaller places), their people, the Printing Press, and The Maze of Forking Paths with its Minotaurs, traps and the Sphinx Gate.',
  requires: ['memos', 'apartment', 'home-story'],
  scripts: ['environment.js', 'items.js', 'map.js', 'npcs.js', 'enemies.js', 'maze.js'],
  levels: ['levels/town-map.js', 'levels/town-places.js', 'levels/maze-of-forking-paths.js'],
});
