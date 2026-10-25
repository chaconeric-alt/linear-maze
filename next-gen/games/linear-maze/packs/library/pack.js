/* games/linear-maze/packs/library/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Library',
  version: '0.1.0',
  description: 'The Library Maze behind Dave’s door: bookcase walls, reading tables and catalogues, Librarians, Book Worms and Overdue Ghosts, KNOWLEDGE IS POWER books and QUIET PLEASE signs, and its two floors.',
  requires: ['core'],
  scripts: ['environment.js', 'items.js', 'enemies.js'],
  levels: ['levels/library-maze.js'],
});
