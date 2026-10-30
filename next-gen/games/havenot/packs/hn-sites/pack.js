/* games/havenot/packs/hn-sites/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'HaveNot Sites',
  version: '0.1.0',
  description: 'The civilized places of the near area: the home bunker (comms, medical station, supply locker, ledger, trophy shelf, retirement), the Out-rider Outpost, Boom-Town behind its 100-credit gate, and Mother Long-Legs’ den. Vendors, medics, rumors, standing.',
  requires: ['linear-maze/core', 'hn-rules', 'hn-world'],
  scripts: ['services.js', 'person.js', 'people.js', 'places.js'],
  levels: ['levels/home.js', 'levels/outpost.js', 'levels/boomtown.js', 'levels/longlegs.js'],
});
