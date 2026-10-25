/* games/linear-maze/packs/core/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Core',
  version: '0.1.0',
  description: 'The basics every floor is built from: the stone, brick and metal tile sets; walls, doors, water, pits, spikes and slag; five weapons and their ammunition; the maze monsters and the Reliquary Keeper; chests, crates, barrels, keys, gold, health, altars, slot machines, recharge stations and lights; armor and blessings; trap effects. The engine drops gold, keys, ammunition and weapon and armor pickups from here, so every game needs this pack (or one that defines the same things).',
  requires: [],
  scripts: [
    'environments.js',
    'terrain.js',
    'weapons.js',
    'enemies.js',
    'items.js',
    'armor.js',
    'effects.js',
  ],
  levels: [],
});
