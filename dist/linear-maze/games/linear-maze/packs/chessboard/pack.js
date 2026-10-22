/* games/linear-maze/packs/chessboard/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Chessboard',
  version: '0.1.0',
  description: 'The Office on Chessboard 1: everyone is the real version of themselves, Bob guards the server farm, Gertrude haunts the supply closet, and there are three tasks to finish before 5:00.',
  requires: ['office', 'memos'],
  scripts: [
    'environment.js',
    'enemies.js',
    'npcs.js',
    'meeting.js',
    'workday.js',
    'items.js',
    'placements.js',
    'layout.js',
  ],
  levels: ['levels/04-chessboard-one.js'],
});
