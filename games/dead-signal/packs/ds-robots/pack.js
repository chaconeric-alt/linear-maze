/* games/dead-signal/packs/ds-robots/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Robots',
  version: '0.3.0',
  description: 'Asterion’s robots in defence mode. Floor 1’s security robots: the Sentinel (patrols, sees in a cone, hears gunshots), the Warden Drone and its searchlight, the Ceiling Turret, the Sweeper and the Scalpel Drone. Floor 2’s lab assistants: the LabMate (a sedative syringe, lobbed vials; it waits on its charging dock), the Courier (fast, rams, calls the others), the Bench Arm, the Sterilizer (a UV lamp that turns after you) and DOCENT-3, the Discovery Center’s tour guide. The patrol behaviour (walk a tagged route). Floor 3 (ariadne.js): ARIADNE’s Orderlies, on your side (faction ally: a green visor and a blue ring), the escort behaviour, and the relay where they get their orders. Dead Signal’s factions table.',
  requires: ['linear-maze/core', 'ds-lab', 'ds-arsenal'],
  scripts: ['robots.js', 'ariadne.js'],
});
