/* games/havenot-test/packs/hn-complex/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'HaveNot Complex',
  version: '0.1.0',
  description: 'A HaveNot installation for the next-generation look: an ash-dusted bulkhead tile set, monsters from the bestiary (Gladiator Roaches, Knife Fighters, Glorexx tube monsters, a Weaponized Maintenance Robot, a Monoid, a Bombast Toad, a Sparkle-Vos Wasp, a Heavy Security Drone), treasure (credits, pogs, pill vending machines, Vert Soda, a warlord’s hoard) and the fixtures traps hang off (TRAP lights, stasis tubes, motivational posters). One floor: The Sunken Installation.',
  requires: ['linear-maze/core'],
  scripts: ['content.js'],
  levels: ['levels/sunken-installation.js'],
});
