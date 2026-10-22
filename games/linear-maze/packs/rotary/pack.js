/* games/linear-maze/packs/rotary/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Red rotary phones',
  version: '0.1.0',
  description: 'A red rotary phone on every floor listed in LM.ROTARY.LINES, each with its own 7-digit number; dialing another phone’s number takes you to that floor.',
  requires: ['core'],
  scripts: ['rotary.js'],
  levels: [],
});
