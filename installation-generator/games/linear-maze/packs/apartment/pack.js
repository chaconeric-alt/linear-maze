/* games/linear-maze/packs/apartment/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Apartment',
  version: '0.1.0',
  description: 'The player’s apartment: its tile set, the furniture and appliances (fridge, oven, TV, laptop, bed, dresser), the neighbours’ doors, and the floor Apartment (Chessboard 0).',
  requires: ['office', 'memos'],
  scripts: ['content.js', 'environment.js', 'items.js'],
  levels: ['levels/apartment-chessboard-zero.js'],
});
