/* games/dead-signal/packs/ds-tartarus/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Tartarus',
  version: '0.1.0',
  description: 'Sub-level B (DESIGN.md 4.7): the ds-tartarus tile set (black basalt column tops, bronze deck plate, the cells’ scorched floors, black water, white rime, ARIADNE’s glass floor with her blue traces; vault walls of iron and bronze gone green at the seams; armoured viewing windows; bronze bars; drains; bronze doors), and what is kept down here: the Titans, synthids that don’t age or die (the Leviathan, a jade serpent covered in eyes, forty tiles long, chasing its tail round a figure-eight; the Behemoth, a black-scaled bull with bronze horns and fire in its throat, that charges the glass; Tiamat, living water with a dividing heart, whose young come up through the drains; the Eye of Judgment, whose gaze burns through the glass; the Circle of Wings, which loves you; the Frog, which smiles; the Crystal Garden, which grows over everything it touches; the Hundred-Handed, behind bars). The Heirs (Line H) and their Firstborn, and their offer. The Tartarus Wardens, the board’s plate cutters and Enforcers, ARIADNE’s core in its ring of nine plates. The Tartarus Armory: the Prometheus Lance, the Stasis Projector, the Singularity Driver, the containment suit, titan cells.',
  requires: ['linear-maze/core', 'ds-lab', 'ds-arsenal', 'ds-robots', 'ds-nightmares', 'ds-executive'],
  scripts: ['environment.js', 'titans.js', 'machines.js', 'heirs.js', 'armory.js', 'dressings.js'],
});
