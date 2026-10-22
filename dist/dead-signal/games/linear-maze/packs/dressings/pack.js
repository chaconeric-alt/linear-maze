/* games/linear-maze/packs/dressings/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Dressings',
  version: '0.1.0',
  description: 'A marble pillar for any floor, filed under the map editor’s Dressings tab.',
  requires: ['core'],
  scripts: ['dressings.js'],
  levels: [],
});
