/* games/dead-signal/packs/ds-robots/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Robots',
  version: '0.2.0',
  description: 'Asterion’s robots in defence mode. Floor 1’s security robots: the Sentinel (patrols, sees in a cone, hears gunshots), the Warden Drone and its searchlight, the Ceiling Turret, the Sweeper and the Scalpel Drone. Floor 2’s lab assistants: the LabMate (a sedative syringe, lobbed vials; it waits on its charging dock), the Courier (fast, rams, calls the others), the Bench Arm, the Sterilizer (a UV lamp that turns after you) and DOCENT-3, the Discovery Center’s tour guide. The patrol behaviour (walk a tagged route).',
  requires: ['linear-maze/core', 'ds-arsenal'],
  scripts: ['robots.js'],
});
