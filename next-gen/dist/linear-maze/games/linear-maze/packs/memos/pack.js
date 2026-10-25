/* games/linear-maze/packs/memos/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Memos',
  version: '0.1.0',
  description: 'Motivational posters, notices and a message board, security cameras, desk toys, email at your desk, Alice’s encrypted goodbye, and the NOTICE / MESSAGE / EMAIL scores on the HUD (shown on every floor).',
  requires: ['office'],
  scripts: ['content.js', 'scores.js', 'items.js', 'email.js', 'placements.js'],
  levels: [],
});
