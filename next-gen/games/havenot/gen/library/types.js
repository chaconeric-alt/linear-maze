/* HaveNot generator library — types.js, zones.js material, locks and keys.
 * Installation types (Vol 2 pp. 54–57), zones front to back (Vol 2 p. 59), and access control:
 * the lock kinds and the keys that open them (Vol 2 pp. 60, 68–74).
 *
 * A type: era tag, floors [min, max], vertical ('up' | 'down': which way its stairs go), zones in rank
 * order, looks { look: weight }, goals { kind: weight }, encounters { monster kind: weight },
 * backstory and names (text-pool keys), roomBias { template: multiplier }, bossFromTl, kioskChance.
 */
LM.genLibrary('havenot', {
  types: {
    'wonder-office': {
      name: 'Age of Wonder corporate office', ref: 'Vol 2 pp. 50–61, 56', tags: ['era:wonder'],
      floors: [1, 4], vertical: 'up',
      zones: ['public', 'employee', 'security', 'labs', 'executive'],
      looks: { institutional: 4, 'sterile-white': 2, 'industrial-metal': 1, emergency: 1, postmodern: 1 },
      goals: { 'shut-down': 2, recover: 2, 'reach-vault': 1 },
      encounters: { robot: 3, bio: 2, toxin: 1 },
      backstory: 'wonder', names: 'companyWonder', titles: 'wonder-office',
      roomBias: { 'open-plan': 1.5, 'coffee-shop': 1.3, 'meeting-room': 1.2 },
      kioskChance: 0.8,
    },
    'war-lab': {
      name: 'Age of War research station', ref: 'Vol 2 pp. 54–55', tags: ['era:war-early'],
      floors: [1, 4], vertical: 'down',
      zones: ['public', 'employee', 'security', 'labs', 'command'],
      looks: { 'sterile-white': 3, 'industrial-metal': 2, bulkhead: 1, 'toxic-waste': 1, 'observation-decks': 1 },
      goals: { 'shut-down': 3, recover: 2 },
      encounters: { robot: 2, bio: 3, toxin: 2 },
      backstory: 'war', names: 'companyWar', titles: 'war-lab',
      roomBias: { lab: 2, 'bio-lab': 1.5, 'specimen-store': 1.3 },
      kioskChance: 0.5,
    },
    'war-bunker': {
      name: 'Age of War command bunker', ref: 'Vol 2 pp. 54–55', tags: ['era:war-middle'],
      floors: [1, 4], vertical: 'down',
      zones: ['public', 'service', 'security', 'command'],
      looks: { bulkhead: 4, 'industrial-metal': 2, emergency: 1, submarine: 1 },
      goals: { 'reach-vault': 2, kill: 1, recover: 1 },
      encounters: { robot: 4, bio: 1 },
      backstory: 'war', names: 'companyWar', titles: 'war-bunker',
      roomBias: { barracks: 1.5, armory: 1.3, 'mess-hall': 1.2 },
      kioskChance: 0.3,
    },
    'bolt-hole': {
      name: 'Age of War bolt hole', ref: 'Vol 2 pp. 49–50, 55', tags: ['era:war-middle'],
      floors: [1, 2], vertical: 'down',
      zones: ['public', 'service', 'vault'],
      looks: { bulkhead: 4, 'bare-concrete': 2 },
      goals: { 'reach-vault': 1 },
      encounters: { robot: 3, bio: 2 },
      backstory: 'bolthole', names: 'companyWar', titles: 'bolt-hole',
      roomBias: { storeroom: 1.6, armory: 1.4 },
      bossFromTl: 3, kioskChance: 0, levelling: false,
    },
    tomb: {
      name: 'Warlord’s tomb', ref: 'Vol 2 p. 55; Vol 1 (Tombs)', tags: ['era:war-middle'],
      floors: [1, 3], vertical: 'down',
      zones: ['public', 'gallery', 'vault'],
      looks: { crypt: 4, bulkhead: 1 },
      goals: { 'reach-vault': 2, recover: 1 },
      encounters: { robot: 3, bio: 1, toxin: 1 },
      backstory: 'tomb', names: 'tomb', titles: 'tomb',
      roomBias: { gallery: 2, ossuary: 1.5, shrine: 1.5 },
      kioskChance: 0,
    },
    'toxin-plant': {
      name: 'Toxin treatment plant', ref: 'Vol 2 pp. 51–53, 62, 75', tags: ['era:wonder'],
      floors: [1, 4], vertical: 'down',
      zones: ['public', 'service', 'labs', 'command'],
      looks: { 'treatment-plant': 3, 'toxic-waste': 2, 'industrial-metal': 1 },
      goals: { 'shut-down': 3, recover: 1 },
      encounters: { toxin: 3, bio: 2, robot: 1 },
      backstory: 'wonder', names: 'companyWonder', titles: 'toxin-plant',
      roomBias: { 'pump-room': 2, lab: 1.2 },
      kioskChance: 0.5,
    },
    'civil-mall': {
      name: 'Age of War shopping centre', ref: 'Vol 2 pp. 50–51, 54', tags: ['era:war-middle'],
      floors: [1, 3], vertical: 'up',
      zones: ['public', 'employee', 'security', 'executive'],
      looks: { institutional: 2, postmodern: 2, carnival: 1 },
      goals: { recover: 2, 'reach-vault': 1 },
      encounters: { robot: 2, bio: 2, toxin: 1 },
      backstory: 'wonder', names: 'companyWonder', titles: 'civil-mall',
      roomBias: { 'coffee-shop': 1.6, 'waiting-room': 1.4, washroom: 1.2 },
      kioskChance: 0.9,
    },
  },

  // zones, front to back (Vol 2 p. 59): rank sets the order; lockKinds: how the way into this zone is locked
  zones: {
    public: { name: 'Public Zone', rank: 0, lockKinds: { hack: 1 } },
    employee: { name: 'Employee Zone', rank: 1, lockKinds: { badge: 3, hack: 1, switch: 1 } },
    service: { name: 'Service Area', rank: 1, lockKinds: { power: 2, hack: 1, switch: 1 } },
    security: { name: 'Security Zone', rank: 2, lockKinds: { hack: 2, badge: 1, switch: 1 } },
    gallery: { name: 'The Galleries', rank: 2, lockKinds: { switch: 2, hack: 1, power: 1 } },
    labs: { name: 'Laboratory Zone', rank: 3, lockKinds: { hack: 2, power: 1, switch: 1 } },
    command: { name: 'Command', rank: 3, lockKinds: { hack: 2, switch: 1 } },
    executive: { name: 'Executive Zone', rank: 4, lockKinds: { hack: 2, badge: 1 } },
    vault: { name: 'The Vault', rank: 4, lockKinds: { hack: 1, switch: 1, power: 1 } },
  },

  // lock kinds: how a door is built and what opens it (the generator reads keyKind, bypass, need, color)
  locks: {
    keycard: { name: 'Key card door', ref: 'Vol 2 pp. 60, 69', keyKind: 'card', bypass: 'hack', panelTitle: 'card reader', critical: true },
    badge: { name: 'ID badge door', ref: 'Vol 2 p. 60', keyKind: 'badge', bypass: 'hack', need: 'an ID badge', color: '#5ab8e8', panelTitle: 'staff door' },
    hack: { name: 'Security door', ref: 'Vol 2 pp. 69, 84–88 (Security Systems)', keyKind: 'none', bypass: 'hack', need: 'security clearance: hack the panel', color: '#ff5a3a', panelTitle: 'security door' },
    switch: { name: 'Door sealed from elsewhere', ref: 'Vol 2 p. 69 (Sealed)', keyKind: 'switch', bypass: 'hack', need: 'the door release', color: '#e8a23a', panelTitle: 'door controls' },
    power: { name: 'Power-locked door', ref: 'Vol 2 p. 69 (Power-locked)', keyKind: 'power', need: 'power: a breaker panel on this floor', color: '#9adf6a' },
    mech: { name: 'Mechanical lock', ref: 'Vol 2 p. 69 (Locked)', keyKind: 'mech', critical: false },
    'secret-door': { name: 'Secret door', ref: 'Vol 2 p. 68', status: 'planned', notes: 'A wall tile that becomes a door when found (Sense stat, Threat Sensor, a terminal). Optional areas only.' },
    'stuck-door': { name: 'Stuck door', ref: 'Vol 2 pp. 69–70', status: 'planned', notes: 'Needs a pry bar or door jack item, placed earlier. Needs the kit.' },
    'puzzle-door': { name: 'Puzzle door', ref: 'Vol 2 pp. 139–144', status: 'planned', notes: 'Opened by a kit puzzle fixture (Hangman terminal, logic gates).' },
  },
  // keys: where they are kept; codeChance: how often the container is a code locker with its code on a memo elsewhere
  keys: {
    card: { name: 'Access card', containers: ['locker', 'desk', 'safe', 'corpse', 'case'], codeChance: 0.45 },
    badge: { name: 'ID badge', containers: ['locker', 'desk', 'corpse'], codeChance: 0.25 },
  },
});
