/* games/round-rooms/packs/round-rooms/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Round Rooms',
  version: '0.1.0',
  description: 'A test floor for curved rooms, and test weapons and armor for magazines, overheating and partial plate coverage.',
  requires: ['linear-maze/core', 'havenot-test/hn-complex'],
  scripts: ['kit.js'],
  levels: ['levels/rotunda.js'],
});
