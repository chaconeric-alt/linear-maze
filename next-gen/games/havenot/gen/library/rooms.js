/* HaveNot generator library — rooms.js
 * Room templates: what a room is, how big, its shape, what must be in it and what jobs it can take.
 * Sources: the Anomalous Structure's rooms, and the set pieces of Vol 2 pp. 59–65.
 *
 *   roles     entrance | stairs | goal | path | side   (path and side by default)
 *   zones     zones it belongs to (goal, entrance and stairs rooms ignore this)
 *   goals     for goal rooms: the goal kinds it suits
 *   size      [[min w, min h], [max w, max h]] in floor tiles, walls not counted
 *   shapes    { rect, circle, ellipse, octagon, rounded: weight } (SPEC 23; only when the room is big enough)
 *   variant   which of the look's floors: corridor | room | lobby | cafe | wet | lab
 *   fixtures  [{ item, props, count | density | chance, place, container, say, prop, with }]
 *             place: wall (wall-mounted), wall-row, corner, center, middle, grid, any
 *   dressing  extra dressing pools
 *   slots     how welcome each job is here, 0–1: key, clue, control (switches), encounter, trap; treasure [min, max] containers
 *   containers  hn-cache kinds for treasure and keys: locker | desk | safe | case | shelf | register | corpse
 *   names, notes  text-pool keys (default roomNames.<id>, zoneNotes.<zone>)
 */
LM.genLibrary('havenot', {
  rooms: {
    // ---------------------------------------------------------------- the way in
    vestibule: {
      name: 'Vestibule', ref: 'hn-agency-1', roles: ['entrance'], size: [[7, 5], [9, 6]], variant: 'lobby',
      types: ['wonder-office', 'civil-mall', 'war-lab', 'toxin-plant'],
      fixtures: [{ item: 'plant', place: 'corner', count: [1, 2] }, { item: 'hn-poster', place: 'wall', count: [0, 1], say: 'posters.welcome' }],
      slots: { key: 0, clue: 0.2, control: 0, encounter: 0, treasure: [0, 0] }, noLoop: true,
    },
    'blast-lock': {
      name: 'Blast lock', ref: 'hn-bunker', roles: ['entrance'], size: [[6, 5], [8, 6]], variant: 'room',
      types: ['war-bunker', 'bolt-hole', 'tomb', 'war-lab'],
      fixtures: [{ item: 'hn-sign', place: 'wall', count: 1, say: 'signs.blastLock' }, { item: 'crate', place: 'corner', count: [0, 1] }],
      slots: { key: 0, clue: 0.3, control: 0, encounter: 0, treasure: [0, 1] }, containers: ['locker', 'corpse'], noLoop: true,
    },
    // ---------------------------------------------------------------- stairs
    stairwell: {
      name: 'Stairwell', ref: 'hn-agency-1', roles: ['stairs'], size: [[5, 4], [8, 6]], variant: 'corridor',
      fixtures: [{ item: 'hn-poster', place: 'wall', count: [0, 1], say: 'posters.stairs' }],
      slots: { key: 0.1, clue: 0.3, control: 0.2, encounter: 0.2, treasure: [0, 1] }, containers: ['locker', 'corpse'],
    },
    // ---------------------------------------------------------------- goals (the last floor's last room)
    vault: {
      name: 'Vault', ref: 'Vol 2 p. 157; hn-agency-2', roles: ['goal'], goals: ['reach-vault', 'recover'], size: [[8, 8], [10, 9]],
      shapes: { rect: 1, octagon: 2 }, variant: 'room', noLoop: true,
      fixtures: [{ item: 'hn-cache', props: { kind: 'safe' }, container: true, count: [1, 2], place: 'wall-row' }, { item: 'hn-cache', props: { kind: 'case' }, container: true, count: [1, 2], place: 'middle' }],
      slots: { key: 0, clue: 0, control: 0, encounter: 0.6, treasure: [2, 3] }, containers: ['safe', 'case'],
    },
    'control-core': {
      name: 'Master control', ref: 'Vol 2 p. 60 (Control Center)', roles: ['goal'], goals: ['shut-down'], size: [[9, 9], [11, 11]],
      shapes: { rect: 1, circle: 2, octagon: 1 }, variant: 'lab', noLoop: true,
      fixtures: [{ item: 'hn-terminal', place: 'wall-row', count: [1, 2], say: 'terminals.decor' }],
      slots: { key: 0, clue: 0.2, control: 0, encounter: 0.8, treasure: [1, 2] }, containers: ['shelf', 'case'],
    },
    'command-center': {
      name: 'Command center', ref: 'Vol 2 p. 60', roles: ['goal', 'path'], goals: ['shut-down', 'kill', 'recover'], zones: ['command', 'security'],
      size: [[9, 7], [12, 9]], shapes: { rect: 3, ellipse: 1 }, variant: 'room',
      fixtures: [{ item: 'conf-table', place: 'center', count: 1 }, { item: 'tv', place: 'wall', count: [1, 2], say: 'screens.command' }, { item: 'hn-terminal', place: 'wall-row', count: [1, 2], say: 'terminals.decor' }],
      slots: { key: 0.4, clue: 0.5, control: 0.8, encounter: 0.8, treasure: [1, 2] }, containers: ['desk', 'shelf'],
    },
    'warlord-quarters': {
      name: 'Warlord’s quarters', ref: 'Vol 2 p. 157 (Personal effects)', roles: ['goal', 'side'], goals: ['reach-vault', 'recover', 'kill'], zones: ['vault', 'executive', 'command'],
      size: [[8, 7], [11, 9]], variant: 'room', types: ['war-bunker', 'tomb', 'bolt-hole'],
      fixtures: [{ item: 'exec-desk', place: 'middle', count: 1 }, { item: 'bookshelf', place: 'wall-row', count: [1, 2] }, { item: 'armchair', place: 'corner', count: [0, 1] }, { item: 'banner', place: 'wall', count: [1, 2] }],
      slots: { key: 0.5, clue: 0.3, control: 0.2, encounter: 0.5, treasure: [2, 3] }, containers: ['safe', 'case', 'desk'],
    },
    // ---------------------------------------------------------------- public
    reception: {
      name: 'Reception', ref: 'hn-agency-1', zones: ['public'], size: [[9, 6], [13, 8]], variant: 'lobby', max: 1,
      types: ['wonder-office', 'civil-mall', 'war-lab', 'toxin-plant'],
      fixtures: [{ item: 'reception', place: 'middle', count: 1 }, { item: 'plant', place: 'corner', count: [1, 2] }, { item: 'hn-ad-screen', place: 'wall', count: [0, 2], props: { ad: 0 } }],
      dressing: ['dress-lobby'], slots: { key: 0.2, clue: 0.5, control: 0.3, encounter: 0.4, treasure: [0, 1] }, containers: ['desk', 'register'],
    },
    'waiting-room': {
      name: 'Waiting room', notTypes: ['tomb'], ref: 'Vol 2 p. 57 (never-ending waiting rooms)', zones: ['public', 'employee'], size: [[6, 5], [9, 7]], variant: 'lobby',
      fixtures: [{ item: 'couch', place: 'wall-row', count: [1, 2] }, { item: 'coffee-table', place: 'middle', count: [0, 1] }, { item: 'plant', place: 'corner', count: [0, 2] }, { item: 'vending', place: 'wall-row', chance: 0.4 }],
      slots: { key: 0.2, clue: 0.5, control: 0.1, encounter: 0.4, treasure: [0, 1] }, containers: ['desk'],
    },
    'coffee-shop': {
      name: 'Coffee shop', ref: 'Vol 2 p. 59 (It’s traditional)', zones: ['public', 'employee'], size: [[8, 7], [11, 9]], variant: 'cafe', max: 1,
      types: ['wonder-office', 'civil-mall', 'war-lab'],
      fixtures: [{ item: 'counter', place: 'wall-row', count: [2, 3] }, { item: 'cafe-table', place: 'middle', count: [2, 4] }, { item: 'hn-sign', place: 'wall', count: 1, say: 'signs.coffee' }],
      slots: { key: 0.3, clue: 0.5, control: 0.1, encounter: 0.5, treasure: [1, 1] }, containers: ['register'],
    },
    // ---------------------------------------------------------------- employees
    'open-plan': {
      name: 'Open-plan office', notTypes: ['tomb'], ref: 'Vol 2 p. 64 (Open Plan Office); hn-agency-1', zones: ['employee'], size: [[9, 7], [13, 10]], variant: 'room',
      fixtures: [{ item: 'desk', place: 'grid', count: [3, 6], with: [{ item: 'chair', side: 's' }] }, { item: 'filing', place: 'wall-row', count: [1, 2] }, { item: 'whiteboard', place: 'wall', count: [0, 1], say: 'whiteboards' }],
      dressing: ['dress-office'], slots: { key: 0.6, clue: 0.7, control: 0.4, encounter: 0.6, treasure: [1, 2] }, containers: ['desk'],
    },
    'meeting-room': {
      name: 'Meeting room', notTypes: ['tomb'], ref: 'hn-agency-1', zones: ['employee', 'executive'], size: [[6, 5], [8, 6]], variant: 'room',
      fixtures: [{ item: 'conf-table', place: 'center', count: 1 }, { item: 'whiteboard', place: 'wall', count: [0, 1], say: 'whiteboards' }],
      slots: { key: 0.4, clue: 0.8, control: 0.2, encounter: 0.3, treasure: [0, 1] }, containers: ['corpse', 'desk'],
    },
    'locker-area': {
      name: 'Locker area', ref: 'Vol 2 p. 63; hn-agency-1', zones: ['employee', 'security', 'service'], size: [[5, 4], [8, 6]], variant: 'room',
      fixtures: [{ item: 'hn-cache', props: { kind: 'locker' }, container: true, count: [3, 5], place: 'wall-row' }],
      slots: { key: 0.8, clue: 0.4, control: 0.1, encounter: 0.3, treasure: [0, 1] }, containers: ['locker'],
    },
    'break-room': {
      name: 'Break room', notTypes: ['tomb'], ref: 'hn-agency-1', zones: ['employee', 'service'], size: [[6, 5], [8, 7]], variant: 'cafe',
      fixtures: [{ item: 'couch', place: 'wall-row', count: [1, 1] }, { item: 'counter', place: 'wall-row', count: [1, 2] }, { item: 'vending', place: 'wall-row', count: [0, 1] }, { item: 'hn-shopper', place: 'middle', chance: 0.25 }],
      dressing: ['dress-office'], slots: { key: 0.4, clue: 0.6, control: 0.2, encounter: 0.6, treasure: [0, 1] }, containers: ['locker', 'shelf'],
    },
    washroom: {
      name: 'Washroom', notTypes: ['tomb'], ref: 'Vol 2 p. 65 (employee washroom)', zones: ['employee', 'public', 'service'], size: [[4, 4], [6, 5]], variant: 'wet',
      fixtures: [{ item: 'toilet', place: 'wall-row', count: [1, 2] }, { item: 'mirror', place: 'wall', count: [1, 1] }, { item: 'hn-vending', place: 'wall-row', chance: 0.5 }],
      slots: { key: 0.2, clue: 0.5, control: 0, encounter: 0.2, treasure: [0, 1] }, containers: ['shelf', 'corpse'],
    },
    'medical-bay': {
      name: 'Medical bay', notTypes: ['tomb'], ref: 'Vol 2 p. 64 (Health Station), p. 67 (Medical Couch)', zones: ['employee', 'service', 'labs'], size: [[6, 5], [8, 7]], variant: 'wet', max: 1,
      fixtures: [{ item: 'hn-health-station', place: 'wall', count: 1, props: { charge: 50 } }, { item: 'counter', place: 'wall-row', count: [1, 2] }, { item: 'hn-cache', props: { kind: 'shelf' }, container: true, count: [1, 1], place: 'wall-row' }],
      slots: { key: 0.3, clue: 0.4, control: 0.1, encounter: 0.2, treasure: [0, 1] }, containers: ['shelf'],
    },
    // ---------------------------------------------------------------- service
    storeroom: {
      name: 'Storeroom', ref: 'Vol 2 p. 64 (Packing Crates); hn-agency-1', zones: ['service', 'employee', 'security', 'public', 'vault'], size: [[5, 4], [8, 6]], variant: 'room',
      fixtures: [{ item: 'hn-crate', props: { contents: 'treasure', kind: 'crate' }, container: true, count: [1, 3], place: 'wall-row', say: 'crates.label', prop: 'label' }, { item: 'crate', place: 'wall-row', count: [0, 2] }],
      slots: { key: 0.4, clue: 0.3, control: 0.2, encounter: 0.4, treasure: [0, 1] }, containers: ['shelf'],
    },
    'robot-bay': {
      name: 'Robot repair bay', ref: 'Vol 2 p. 64; hn-agency-3', zones: ['service', 'security'], size: [[8, 6], [11, 8]], variant: 'room', max: 1,
      fixtures: [{ item: 'hn-safety-sign', place: 'wall', count: [1, 2], say: 'signs.safety' }, { item: 'barrel', place: 'corner', count: [0, 2] }, { item: 'hn-crate', props: { contents: 'treasure', kind: 'crate' }, container: true, count: [0, 1], place: 'wall-row', say: 'crates.label', prop: 'label' }],
      slots: { key: 0.3, clue: 0.3, control: 0.6, encounter: 0.9, treasure: [0, 1] }, containers: ['shelf'],
    },
    barracks: {
      name: 'Barracks', ref: 'Vol 2 p. 148 (robot barracks)', zones: ['service', 'security'], size: [[8, 6], [11, 8]], variant: 'room',
      types: ['war-bunker', 'war-lab', 'bolt-hole'],
      fixtures: [{ item: 'bench', place: 'wall-row', count: [2, 3] }, { item: 'table', place: 'middle', count: [1, 2] }, { item: 'hn-cache', props: { kind: 'locker' }, container: true, count: [1, 3], place: 'wall-row' }],
      slots: { key: 0.5, clue: 0.4, control: 0.2, encounter: 0.9, treasure: [0, 1] }, containers: ['locker'],
    },
    'mess-hall': {
      name: 'Mess hall', notTypes: ['tomb'], ref: 'Vol 2 p. 63 (Dining Hall)', zones: ['service', 'employee'], size: [[9, 7], [12, 9]], variant: 'cafe', max: 1,
      fixtures: [{ item: 'table', place: 'middle', count: [2, 4] }, { item: 'bench', place: 'middle', count: [1, 3] }, { item: 'counter', place: 'wall-row', count: [1, 3] }, { item: 'vending', place: 'wall-row', count: [0, 1] }],
      slots: { key: 0.3, clue: 0.5, control: 0.2, encounter: 0.8, treasure: [0, 1] }, containers: ['register', 'shelf'],
    },
    'junk-hall': {
      name: 'Junk hall', ref: 'Vol 2 p. 157 (Ancient junk)', zones: ['service', 'public'], size: [[7, 6], [10, 8]], variant: 'room',
      fixtures: [{ item: 'hn-crate', props: { contents: 'treasure', kind: 'crate' }, container: true, count: [1, 2], place: 'any', say: 'crates.label', prop: 'label' }, { item: 'crate', place: 'any', count: [1, 3] }, { item: 'barrel', place: 'wall-row', count: [0, 2] }, { item: 'ceiling-debris', place: 'any', count: [1, 3] }],
      slots: { key: 0.3, clue: 0.3, control: 0.1, encounter: 0.6, treasure: [0, 1] }, containers: ['shelf', 'corpse'],
    },
    'pump-room': {
      name: 'Pump room', ref: 'Vol 2 p. 62 (Treatment Plant)', zones: ['service', 'labs'], size: [[7, 6], [10, 8]], variant: 'room',
      types: ['toxin-plant', 'war-lab', 'wonder-office'],
      fixtures: [{ item: 'barrel', place: 'wall-row', count: [2, 4] }, { item: 'hn-mist', props: { toxic: false }, place: 'middle', count: [0, 2] }, { item: 'hn-terminal', place: 'wall-row', count: [0, 1], say: 'terminals.decor' }],
      slots: { key: 0.3, clue: 0.3, control: 0.8, encounter: 0.6, treasure: [0, 1] }, containers: ['shelf'],
    },
    // ---------------------------------------------------------------- security
    'security-checkpoint': {
      name: 'Security checkpoint', ref: 'Vol 2 pp. 59, 64 (Security Zone)', zones: ['security'], size: [[6, 5], [9, 7]], variant: 'room',
      fixtures: [{ item: 'counter', place: 'wall-row', count: [1, 2] }, { item: 'hn-sign', place: 'wall', count: 1, say: 'signs.checkpoint' }],
      slots: { key: 0.4, clue: 0.4, control: 0.5, encounter: 0.7, treasure: [0, 1] }, containers: ['locker', 'desk'],
    },
    'security-station': {
      name: 'Security station', ref: 'Vol 2 p. 64; hn-agency-3', zones: ['security', 'command'], size: [[7, 6], [10, 8]], variant: 'room', max: 1,
      fixtures: [{ item: 'tv', place: 'wall', count: [1, 3], say: 'screens.security' }, { item: 'filing', place: 'wall-row', count: [0, 2] }, { item: 'desk', place: 'middle', count: [1, 2], with: [{ item: 'chair', side: 's' }] }],
      slots: { key: 0.5, clue: 0.6, control: 0.9, encounter: 0.7, treasure: [1, 1] }, containers: ['desk', 'locker'],
    },
    armory: {
      name: 'Armory', ref: 'Vol 2 p. 64 (Security Station may have an armory)', zones: ['security', 'command', 'vault'], size: [[6, 5], [9, 7]], variant: 'room', max: 1,
      fixtures: [{ item: 'hn-cache', props: { kind: 'case' }, container: true, count: [1, 2], place: 'wall-row' }, { item: 'hn-cache', props: { kind: 'shelf' }, container: true, count: [1, 2], place: 'wall-row' }],
      slots: { key: 0.4, clue: 0.2, control: 0.2, encounter: 0.7, treasure: [1, 2] }, containers: ['case', 'shelf'],
    },
    kennels: {
      name: 'Kennels', ref: 'Vol 3 (Cyberspine kennels)', zones: ['security'], size: [[7, 6], [10, 8]], variant: 'room', types: ['war-bunker', 'war-lab'],
      fixtures: [{ item: 'bones', place: 'any', count: [2, 4] }, { item: 'hn-safety-sign', place: 'wall', count: [0, 1], say: 'signs.kennels' }],
      slots: { key: 0.2, clue: 0.2, control: 0.2, encounter: 1, treasure: [0, 1] }, containers: ['corpse'],
    },
    // ---------------------------------------------------------------- labs
    lab: {
      name: 'Laboratory', ref: 'Vol 2 pp. 59–60; hn-agency-2', zones: ['labs'], size: [[8, 7], [11, 10]], shapes: { rect: 3, ellipse: 1, rounded: 1 }, variant: 'lab',
      fixtures: [{ item: 'counter', place: 'wall-row', count: [1, 3] }, { item: 'hn-terminal', place: 'wall-row', count: [0, 1], say: 'terminals.decor' }],
      dressing: ['dress-lab-room'], slots: { key: 0.5, clue: 0.6, control: 0.5, encounter: 0.8, treasure: [1, 1] }, containers: ['shelf', 'case'],
    },
    'bio-lab': {
      name: 'Bio lab', ref: 'hn-agency-2 (Bio lab)', zones: ['labs'], size: [[8, 7], [11, 9]], shapes: { rect: 2, ellipse: 2 }, variant: 'lab',
      fixtures: [{ item: 'counter', place: 'wall-row', count: [1, 2] }, { item: 'hn-mist', props: { toxic: false }, place: 'middle', count: [0, 1] }],
      slots: { key: 0.4, clue: 0.5, control: 0.4, encounter: 0.9, treasure: [0, 1] }, containers: ['shelf'],
    },
    'testing-chamber': {
      name: 'Testing chamber', ref: 'Vol 2 p. 47; hn-agency-2', zones: ['labs', 'command'], size: [[11, 11], [13, 13]], shapes: { circle: 3, octagon: 1 }, variant: 'lab', max: 1,
      fixtures: [{ item: 'hn-terminal', place: 'wall-row', count: [0, 1], say: 'terminals.decor' }],
      slots: { key: 0.2, clue: 0.3, control: 0.3, encounter: 1, treasure: [0, 1] }, containers: ['case'],
    },
    'specimen-store': {
      name: 'Specimen store', ref: 'Vol 2 p. 67 (Tubes and Tanks)', zones: ['labs'], size: [[6, 5], [9, 7]], variant: 'lab',
      fixtures: [{ item: 'hn-cache', props: { kind: 'shelf' }, container: true, count: [1, 2], place: 'wall-row' }, { item: 'hn-crate', props: { contents: 'treasure', kind: 'crate' }, container: true, count: [0, 1], place: 'wall-row', say: 'crates.label', prop: 'label' }],
      slots: { key: 0.4, clue: 0.3, control: 0.2, encounter: 0.8, treasure: [0, 1] }, containers: ['shelf'],
    },
    'server-room': {
      name: 'Server room', ref: 'Vol 2 p. 63 (Cold Machines, Green Terminals)', zones: ['labs', 'command', 'security'], size: [[7, 5], [10, 7]], variant: 'room',
      fixtures: [{ item: 'filing', place: 'grid', count: [2, 4] }, { item: 'hn-terminal', place: 'wall-row', count: [1, 2], say: 'terminals.decor' }],
      slots: { key: 0.3, clue: 0.5, control: 0.9, encounter: 0.5, treasure: [0, 1] }, containers: ['shelf'],
    },
    // ---------------------------------------------------------------- executive
    'executive-suite': {
      name: 'Executive suite', ref: 'hn-agency-1', zones: ['executive'], size: [[7, 6], [10, 8]], variant: 'room',
      fixtures: [{ item: 'exec-desk', place: 'middle', count: 1 }, { item: 'bookshelf', place: 'wall-row', count: [0, 2] }, { item: 'armchair', place: 'corner', count: [0, 1] }, { item: 'art', place: 'wall', count: [1, 2] }, { item: 'hn-cache', props: { kind: 'safe' }, container: true, count: [0, 1], place: 'wall-row' }],
      dressing: ['dress-exec'], slots: { key: 0.6, clue: 0.5, control: 0.4, encounter: 0.4, treasure: [1, 2] }, containers: ['safe', 'desk', 'case'],
    },
    boardroom: {
      name: 'Boardroom', ref: 'Vol 2 p. 60 (Command Center for running the company)', zones: ['executive', 'command'], size: [[8, 6], [11, 8]], variant: 'room', max: 1,
      fixtures: [{ item: 'conf-table', place: 'center', count: 1 }, { item: 'tv', place: 'wall', count: [1, 1], say: 'screens.board' }, { item: 'art', place: 'wall', count: [0, 2] }],
      slots: { key: 0.5, clue: 0.7, control: 0.4, encounter: 0.5, treasure: [0, 1] }, containers: ['desk', 'case'],
    },
    // ---------------------------------------------------------------- tombs
    gallery: {
      name: 'Gallery', ref: 'Vol 1 (Tombs: hagiography); Vol 2 p. 55', zones: ['gallery', 'public'], size: [[9, 6], [13, 8]], shapes: { rect: 3, ellipse: 1 }, variant: 'room',
      types: ['tomb'],
      fixtures: [{ item: 'pedestal', place: 'middle', count: [2, 4] }, { item: 'banner', place: 'wall', count: [1, 3] }, { item: 'hn-cache', props: { kind: 'case' }, container: true, count: [0, 2], place: 'middle' }],
      dressing: ['dress-tomb'], slots: { key: 0.5, clue: 0.6, control: 0.4, encounter: 0.7, treasure: [1, 2] }, containers: ['case'],
    },
    ossuary: {
      name: 'Ossuary', ref: 'Vol 2 p. 62 (Crypt)', zones: ['gallery', 'vault', 'public'], size: [[6, 5], [9, 7]], variant: 'room', types: ['tomb'],
      fixtures: [{ item: 'bones', place: 'any', count: [3, 6] }, { item: 'candles', place: 'corner', count: [1, 2] }],
      dressing: ['dress-tomb'], slots: { key: 0.4, clue: 0.4, control: 0.2, encounter: 0.6, treasure: [1, 1] }, containers: ['corpse'],
    },
    shrine: {
      name: 'Shrine', ref: 'Vol 2 p. 55 (warlords worshipped as gods)', zones: ['gallery', 'vault'], size: [[7, 7], [9, 9]], shapes: { rect: 1, octagon: 2, circle: 1 }, variant: 'room', types: ['tomb', 'war-bunker'],
      fixtures: [{ item: 'brazier', place: 'corner', count: [2, 2] }, { item: 'banner', place: 'wall', count: [1, 2] }],
      dressing: ['dress-tomb'], slots: { key: 0.4, clue: 0.5, control: 0.5, encounter: 0.6, treasure: [1, 1] }, containers: ['case'],
    },
  },
});
