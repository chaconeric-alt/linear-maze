/* games/dead-signal/packs/ds-lab/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Lab',
  version: '0.2.0',
  description: 'Asterion Biologics, the building: the lobby tile set (ds-lobby) and its painters (concrete, clean-room panel, steel shutters), stairs that look like they go up or down, lockdown shutters, fire doors, clearance doors and the armory cage, live water, and the building’s dressings: emergency strobes, wall screens, security cameras, lockers, server racks, turnstiles, the Asterion sculpture, bodies and notes. It also gives the office furniture Asterion’s words instead of Meridian’s. Floor 2: the synthid research tile set (ds-cleanroom), brine that floods a floor and drains, Shelter B’s blast door and the lab wing’s biosafety door, and the labs’ furniture: benches, fume hoods, membrane tanks, valves and pumps, fungus chambers that breathe spores, frond beds, CO₂ columns, microscope feeds, infusion chairs, a therapeutic dispenser, the Discovery Center’s exhibits, a hanging synthid model, and the shelter’s bunks and supplies.',
  requires: ['linear-maze/core', 'linear-maze/office'],
  scripts: ['environment.js', 'terrain.js', 'dressings.js', 'furniture.js', 'cleanroom.js', 'labs.js'],
});
