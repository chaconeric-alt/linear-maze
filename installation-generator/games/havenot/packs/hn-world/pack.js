/* games/havenot/packs/hn-world/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'HaveNot Near Area',
  version: '0.1.0',
  description: 'The near-area map: eleven pins as data (position, state, description that grows with what you learn, services, dangers), a location panel for each, travel, and the start and end of a mission.',
  requires: ['linear-maze/core', 'hn-rules'],
  scripts: ['map.js'],
});
