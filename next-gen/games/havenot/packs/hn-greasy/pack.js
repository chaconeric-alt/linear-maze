/* games/havenot/packs/hn-greasy/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'HaveNot: The Greasy Bolt Hole',
  version: '0.1.0',
  description: 'Enoch the Greasy’s bunker, uncovered by the dunes: the upper bunker (Threat Level 2: quarters, mess hall, armory, the oddly unused san-station, goop traps, turrets, a Slop-Tread) and, past the control room’s blast-door elevator, two floors of his robot works (Threat Level 3), infected by the Eggbot virus: conveyor floors, the museum of his victories, the Greasing Throne, the coms station and Princess Eggbot.',
  requires: ['linear-maze/core', 'linear-maze/office', 'havenot-test/hn-complex', 'hn-rules', 'hn-world'],
  scripts: ['gear.js', 'bestiary.js', 'fixtures.js', 'eggbots.js'],
  levels: ['levels/upper.js', 'levels/works.js', 'levels/crown.js'],
});
