/* games/linear-maze/packs/maze/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'The maze floors',
  version: '0.1.0',
  description: 'The three hand-built maze floors: The Sunken Cloister, The Ember Foundry and The Gilded Reliquary (with its boss).',
  requires: ['core'],
  scripts: [],
  levels: [
    'levels/01-sunken-cloister.js',
    'levels/02-ember-foundry.js',
    'levels/03-gilded-reliquary.js',
  ],
});
