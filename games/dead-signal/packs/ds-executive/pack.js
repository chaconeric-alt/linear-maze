/* games/dead-signal/packs/ds-executive/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Executive',
  version: '0.1.0',
  description: 'Floor 5, the executive floor, and its private upper level, 5a (DESIGN.md 4.5): the ds-executive tile set (black and jade marble with veins that run across the slabs, rosewood herringbone, jade carpet, ebony parquet, wood panelling with brass, green marble walls, kitchen tile, a floor under silk), glass floors you see the floor below through, an atrium’s open well with its balustrade, kitchen hotplates, the board’s spiral stairs, executive doors, the boardroom’s blast shutters and a bookcase that is a door. Its furniture (desks, a reception desk, chesterfields, club chairs, bookcases, chandeliers, sconces, jade urns, orchids, the boardroom’s table, a round bed, a robot kitchen, charging pods, plant and the Control Room’s consoles), its art (the board’s bronzes; Andromeda and Cetus in the fountain; Charybdis, a basin that turns into a whirlpool with teeth), what got loose (the Gorgon, Scylla, the Patrons, Mother of Teeth, the Tally, Faceless Ushers, the Swaddler and its Swaddlings, webs and the eggs it wraps people in), the board’s staff (the Concierge, the kitchen’s robots, the Praetorians and their mirror shields, the rail guns), and two pieces of gear (the Director’s Coat, the Gorgon’s Eye).',
  requires: ['linear-maze/core', 'linear-maze/office', 'ds-lab', 'ds-arsenal', 'ds-robots', 'ds-nightmares'],
  scripts: ['environment.js', 'dressings.js', 'nightmares.js', 'staff.js', 'gear.js'],
});
