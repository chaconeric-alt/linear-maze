/* HaveNot generator library — settings.js
 * How generated installations are named and packed, and the budgets by Threat Level.
 * Budgets are calibrated against the hand-built Anomalous Structure (Threat Level 2): see
 * editor/gen/GENERATOR-PLAN.md. Ratios between levels follow Vol 2 pp. 49 and 152.
 */
LM.genLibrary('havenot', {
  settings: {
    levelPrefix: 'hn-g-',
    packPrefix: 'hn-g-',
    packRequires: ['linear-maze/core', 'linear-maze/office', 'havenot-test/hn-complex', 'hn-rules', 'hn-world', 'hn-anomalous', 'hn-gen-kit'],
    orderBase: 100,
    mapMax: [72, 48],
    sizes: { small: [6, 8], standard: [9, 12], large: [13, 16] },
    // key cards in the book's order (Vol 2 p. 60): one per floor, found on that floor
    tiers: ['blue', 'yellow', 'red', 'green', 'violet'],
    tierInfo: {
      blue: { name: 'Blue card', color: '#3a7aff' },
      yellow: { name: 'Yellow card', color: '#ffd23a' },
      red: { name: 'Red card', color: '#ff3a3a' },
      green: { name: 'Green card', color: '#3aff7a' },
      violet: { name: 'Violet card', color: '#b05aff' },
    },
    optionalLockChance: 0.25, // each side branch off the critical path
    optionalLocksMax: 2, // a floor
    optionalLocks: { hack: 2, mech: 1 },
    trapDamageScale: 0.75,
    hackBase: 6,
    // dressing variety: each room's density is scaled by a random factor in this range, and with this chance a room
    // also gets 1–2 strays from the 'dress-strays' pool
    dressingJitter: [0.6, 1.6],
    strayDressing: 0.55,
    // terminals (hn-gen-kit/terminals.js): a riddle beside a trap, and per floor a chatty terminal, a red-team drill
    // and an ELIZA of its own (besides the one before each Mental Hygiene door)
    riddleChance: 0.5,
    chattyChance: 0.6,
    redTeamChance: 0.35,
    elizaChance: 0.2,
  },
  budgets: {
    // credits per standard floor (TL 2 = the Anomalous Structure's ~1,700 a floor)
    treasurePerFloor: { 1: 850, 2: 1700, 3: 3400, 4: 5950, 5: 9350, 6: 13600 },
    // monster points per standard floor, bosses paid separately (TL 2 = 28)
    monstersPerFloor: { 1: 18, 2: 28, 3: 39, 4: 55, 5: 77, 6: 108 },
    sizeMul: { small: 0.6, standard: 1, large: 1.4 },
    setPieces: { small: [1, 2], standard: [2, 3], large: [3, 4] },
    trapsPerFloor: { small: [1, 2], standard: [2, 3], large: [3, 4] },
    healthStations: { small: [0, 1], standard: [1, 1], large: [1, 2] },
    // Vol 2 p. 90, book Impact damage: low / medium / high / lethal
    trapDamage: { 2: [8, 12, 21, 31], 3: [9, 15, 25, 37], 4: [11, 17, 29, 43], 5: [12, 20, 33, 49], 6: [14, 22, 37, 55] },
  },
});
