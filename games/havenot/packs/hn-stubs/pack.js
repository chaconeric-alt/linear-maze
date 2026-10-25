/* games/havenot/packs/hn-stubs/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'HaveNot Stubs',
  version: '0.1.0',
  description: 'One-floor placeholders for the installations not built yet: The Bunker, The Warren and The Bolt Hole. Each has its entrance, one room, and a sealed way further in.',
  requires: ['linear-maze/core', 'hn-rules', 'hn-sites'],
  scripts: ['stubs.js'],
  levels: ['levels/bunker.js', 'levels/warren.js', 'levels/bolthole.js'],
});
