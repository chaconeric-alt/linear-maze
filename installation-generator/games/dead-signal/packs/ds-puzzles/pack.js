/* games/dead-signal/packs/ds-puzzles/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Puzzles',
  version: '0.1.0',
  description: 'Puzzle pieces that set story flags: the breaker panel (throw it, or shoot it) and the keypad (type the code; it can hand over what it guards).',
  requires: ['linear-maze/core', 'ds-lab'],
  scripts: ['puzzles.js'],
});
