/* games/dead-signal/packs/ds-arsenal/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Arsenal',
  version: '0.2.0',
  description: 'What Theo fights with and wears, and what can happen to him: the Bolt Driver from his tool bag, the Security Sidearm, the Riot Shotgun, the Cryo Sprayer (and its own ammunition, cryo); the Security Vest, the Hard Hat with Lamp, the Hazmat Hood and Ruiz’s Badge; med-gel, trauma kits, cryo canisters; the statuses robots and monsters put on him (sedated, chilled, staggered, held, spores, UV burn).',
  requires: ['linear-maze/core'],
  scripts: ['arsenal.js'],
});
