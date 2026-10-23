/* games/dead-signal/packs/ds-nightmares/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Nightmares',
  version: '0.3.0',
  description: 'The board’s nightmares: the Hollow Coat (an empty lab coat that gets up once more) and the Nursery Grub; the Congregation (Floor 2’s Shelter B: a heap of pale strands wearing the faces of the people it killed; asleep until woken, then a named fight) and the strands it comes apart into; the lurker behaviour (stand still, face the wall, until you come close). Floor 3 (gestation.js): the Midwife (lays eggs in you), the Tenant and the Ridden it walks about, the Flesh Lantern, the Sitter, juvenile Congregation colonies; contained specimens (the specimen side); every one hunts out loud.',
  requires: ['linear-maze/core', 'ds-arsenal'],
  scripts: ['nightmares.js', 'congregation.js', 'gestation.js'],
});
