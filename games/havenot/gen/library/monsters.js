/* HaveNot generator library — monsters.js and encounters.
 * Every Vol 3 monster, built or planned (page numbers are the Vol 3 PDF's), with what the generator
 * needs to place it well. Strategies and roles are Vol 2 pp. 146–147's names.
 *
 *   id          the registry enemy (default: the key)
 *   kind        robot | bio | toxin | human | avatar (a type's encounters pick by kind)
 *   cost        budget points (calibrated: GENERATOR-PLAN.md)
 *   group       [min, max] in a group
 *   placement   patrol | post | swarm | vents | tube | sleep | boss
 *   boss        can be an installation's boss; escort: what comes with it
 */
LM.genLibrary('havenot', {
  monsters: {
    // ---------------------------------------------------------------- built
    'hn-roach': { name: 'Gladiator Roach', ref: 'Vol 3 p. 63', status: 'built', kind: 'bio', tl: [1, 3], cost: 1, strategy: 'attrition', roles: ['ambush', 'passive-aggressive'], group: [3, 6], placement: 'vents', weight: 1.2, notes: 'Comes back between missions at roachSpawn vents (the game’s rule); goes for thrown cookies.' },
    'hn-knife': { name: 'Knife Fighter', ref: 'Vol 3 p. 69', status: 'built', kind: 'robot', tl: [1, 4], cost: 2, strategy: 'minion', roles: ['hunter-killer'], group: [2, 4], placement: ['patrol', 'swarm'], weight: 1.4 },
    'hn-defender': { name: 'Desktop Defender', ref: 'Vol 3 p. 184', status: 'built', kind: 'robot', tl: [1, 2], cost: 1, strategy: 'minion', roles: ['ambush'], group: [2, 3], placement: 'swarm', weight: 0.5 },
    'hn-glorexx': { name: 'Glorexx Tube Monster', ref: 'Vol 3 p. 65', status: 'built', kind: 'bio', tl: [1, 3], cost: 4, strategy: 'kill-quick', roles: ['ambush'], group: [1, 2], placement: 'tube' },
    'hn-maintbot': { name: 'Weaponized Maintenance Robot', ref: 'Vol 3 p. 66', status: 'built', kind: 'robot', tl: [1, 3], cost: 5, strategy: 'soldier', roles: ['guardian', 'hunter-killer'], group: [1, 2], placement: ['patrol', 'post'], weight: 1.2 },
    'hn-monoid': { name: 'Monoid Robot', ref: 'Vol 3 p. 68; Vol 2 p. 148 (Monoids at rest)', status: 'built', kind: 'robot', tl: [1, 3], cost: 4, strategy: 'soldier', roles: ['enemy-group'], group: [2, 4], placement: 'patrol' },
    'hn-wasp': { name: 'Sparkle-Vos Wasp', ref: 'Vol 3 p. 88', status: 'built', kind: 'toxin', tl: [2, 5], cost: 3, strategy: 'minion', roles: ['treasure'], group: [1, 3], placement: ['patrol', 'swarm'] },
    'hn-toad': { name: 'Bombast Toad', ref: 'Vol 3 p. 58', status: 'built', kind: 'toxin', tl: [1, 5], cost: 8, strategy: 'kill-quick', roles: ['passive-aggressive'], group: [1, 1], placement: 'post', boss: true, weight: 0.4, escort: ['hn-roach'] },
    'hn-turret': { name: 'Security turret', ref: 'Vol 2 p. 132 (Auto-Guns); hn-agency-3', status: 'built', kind: 'robot', tl: [2, 6], cost: 6, strategy: 'bullet-screened', roles: ['guardian'], group: [1, 2], placement: 'post' },
    'hn-drone': { name: 'Heavy Security Drone', ref: 'Vol 3 p. 67', status: 'built', kind: 'robot', tl: [2, 6], cost: 30, strategy: 'boss-multi', roles: ['sleeper', 'guardian'], group: [1, 1], placement: 'boss', boss: true, weight: 2, escort: ['hn-knife'] },
    'hn-sphinx': { name: 'Sphinx Gun', ref: 'Vol 2 p. 136', status: 'planned', bespoke: true, kind: 'robot', tl: [1, 4], cost: 10, strategy: 'puzzle', roles: ['puzzle'], notes: 'Built for the Anomalous Structure only: its riddle (the slogan) is wired to that building. A generic riddle console would make it placeable.' },
    'hn-emitter': { name: 'Defense field emitter', ref: 'hn-agency-3', status: 'planned', bespoke: true, kind: 'robot', tl: [3, 6], cost: 4, notes: 'Built, but only meaningful with a defense field across a doorway; needs a field-gate set piece.' },
    // ---------------------------------------------------------------- planned (Vol 3)
    'rave-raptors': { name: 'Rave Raptors', ref: 'Vol 3 p. 59', status: 'planned', kind: 'bio', tl: [2, 4], strategy: 'soldier', roles: ['hunter-killer'], notes: 'Party-drug pack hunters; music charms them.' },
    fungoids: { name: 'Fungoids (Soldier, Ripper, Hive)', ref: 'Vol 3 p. 61', status: 'planned', kind: 'bio', tl: [1, 3], strategy: 'spawner', roles: ['sleeper'], notes: 'Soldiers explode and infect; a Hive bursts spores. Dormant until disturbed.' },
    'cyber-scorpion': { name: 'Cyber Scorpion (Jaekelopterus)', ref: 'Vol 3 p. 62', status: 'planned', kind: 'robot', tl: [3, 10], strategy: 'boss-tank', roles: ['hunter-killer'], notes: 'Tracks radio signals. Mk-1 fight, Mk-2 hide, Mk-3 run.' },
    'dust-spiders': { name: 'Dust Spiders', ref: 'Vol 3 p. 64', status: 'planned', kind: 'bio', tl: [1, 3], strategy: 'soldier', roles: ['ambush'], notes: 'King, Queens, Soldiers; paralytic bite; cocoon nests full of victims’ loot.' },
    wunk: { name: 'Wunk', ref: 'Vol 3 p. 70', status: 'planned', kind: 'toxin', tl: [1, 6], strategy: 'negator', roles: ['stalker'], notes: 'Phases through walls and armour; one Wunk can be several.' },
    leptosome: { name: 'Leptosome', ref: 'Vol 3 p. 72', status: 'planned', kind: 'toxin', tl: [4, 7], strategy: 'boss-multi', roles: ['stalker'], boss: true, notes: 'Grapples everything within 20 yards; squeezes through tiny holes; lured by candy.' },
    ravener: { name: 'Ravener', ref: 'Vol 3 p. 73', status: 'planned', kind: 'bio', tl: [6, 9], strategy: 'kill-quick', roles: ['stalker'], notes: 'Time-shifted pouncers in twos and threes; trophy lairs.' },
    'blue-claw': { name: 'Towering Blue-Claw', ref: 'Vol 3 p. 75', status: 'planned', kind: 'bio', tl: [3, 6], strategy: 'boss-tank', roles: ['passive-aggressive'], notes: '15-foot armoured scavenger; bribe it with food.' },
    'stalking-worm': { name: 'Stalking Worm', ref: 'Vol 3 p. 76', status: 'planned', kind: 'bio', tl: [1, 2], strategy: 'attrition', roles: ['ambush'], notes: 'Hides in vents and lockers; slime trails and eggs warn of it.' },
    armorback: { name: 'Armorback', ref: 'Vol 3 p. 79', status: 'planned', kind: 'bio', tl: [3, 6], strategy: 'fair-fight', roles: ['enemy-group'], notes: 'An intelligent bandit leader.' },
    quockerwodger: { name: 'Quockerwodger', ref: 'Vol 3 p. 80', status: 'planned', kind: 'toxin', tl: [5, 8], strategy: 'boss-multi', roles: ['ambush'], boss: true, notes: 'Ricochets off walls hitting everyone nearby; hides deflated in barrels.' },
    zillixx: { name: 'Zillixx Mk-1', ref: 'Vol 3 p. 81', status: 'planned', kind: 'bio', tl: [2, 4], strategy: 'soldier', roles: ['ambush'], notes: 'Decanted in threes from a monster tank; an alarm releases many.' },
    cyberspine: { name: 'Cyberspine', ref: 'Vol 3 p. 82', status: 'planned', kind: 'robot', tl: [4, 7], strategy: 'boss-tank', roles: ['sleeper', 'guardian'], boss: true, notes: 'Near-immortal guardian dormant in kennels; wakes on alarm; sees heat.' },
    'war-dogs': { name: 'War-Dogs', ref: 'Vol 3 p. 83', status: 'planned', kind: 'bio', tl: [2, 5], strategy: 'regenerator', roles: ['hunter-killer'], notes: 'Regenerating, clever packs.' },
    chatterpillar: { name: 'Chatterpillar', ref: 'Vol 3 p. 113; Vol 2 p. 148', status: 'planned', kind: 'robot', tl: [2, 4], strategy: 'boss-tank', roles: ['ambush'], notes: 'Cybernetic centipede; clatters like a typewriter, so alert scavengers hear it.' },
    'kill-kart': { name: 'Kill-Kart', ref: 'Vol 2 p. 149', status: 'planned', kind: 'robot', tl: [2, 4], strategy: 'attrition', roles: ['hunter-killer'], notes: 'Treaded wave robots with light auto-guns.' },
  },

  // encounter templates (Vol 2 pp. 147–149): how a set piece is built (compile), and where it suits
  encounters: {
    meeting: { name: 'Meeting engagement', ref: 'Vol 2 p. 148', compile: 'meeting', placements: ['patrol', 'post'], weight: 3 },
    vents: { name: 'Ambush from the vents', ref: 'Vol 2 p. 148 (Ambush); Vol 3 p. 63', compile: 'vents', weight: 1.4 },
    tubes: { name: 'Tube ambush', ref: 'Vol 2 p. 135 (Monster Tube); hn-agency-2', compile: 'tubes', rooms: ['lab', 'bio-lab', 'specimen-store', 'testing-chamber', 'server-room'], weight: 3 },
    waves: { name: 'Wave attack (sealed room)', ref: 'Vol 2 p. 149', compile: 'waves', rooms: ['testing-chamber', 'command-center', 'mess-hall', 'barracks', 'open-plan', 'robot-bay', 'gallery', 'junk-hall', 'reception'], weight: 2 },
    sleeper: { name: 'Sleeper', ref: 'Vol 2 p. 147', compile: 'sleeper', tl: [3, 6], weight: 1 },
    turrets: { name: 'Guard posts', ref: 'Vol 2 p. 147 (Guardian)', compile: 'turrets', tl: [2, 6], rooms: ['security-checkpoint', 'security-station', 'armory', 'command-center', 'vault', 'server-room'], weight: 2 },
    crate: { name: 'Shipping status: delivered', ref: 'Vol 2 p. 64 (Packing Crates)', compile: 'crate', rooms: ['storeroom', 'robot-bay', 'junk-hall', 'specimen-store', 'barracks'], weight: 1.5 },
    'puzzle-monster': { name: 'Puzzle monster', ref: 'Vol 2 p. 149', status: 'planned', notes: 'A talking guardian freed by a puzzle; needs the kit.' },
  },
});
