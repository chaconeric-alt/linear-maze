/* HaveNot — packs/hn-sites/levels/home.js
 * Home: a small sealed Burner-era bunker. Living room (comms terminal, ledger desk, trophy shelf,
 * retirement terminal) and a workshop (the medical station, the supply locker, the door out).
 * A new run starts here; the character creation panel opens on arrival (hnCreation).
 */
'use strict';
LM.definePack({
  id: 'hn-sites',
  levels: {
    'hn-home': {
      name: 'Home',
      floorLabel: 'Home',
      order: 1,
      environment: 'hn-home',
      hn: { place: 'Home', home: true },
      hnCreation: true,
      armed: false,
      stairsUp: false,
      loadout: { weapons: [], gadgets: [] },
      intro: 'Home: four walls, a door that seals, and everything you own.',
      attractPath: [[4, 3], [17, 4]],
      nextGen: {
        enabled: true,
        oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.35, pipes: true, ducts: false, cables: true, beams: true, fans: false, hanging: true, opacity: 0.9, color: '#030303', height: 1.6, parallax: 0.2, rim: true, seed: 2 },
        neon: { on: false },
      },
      ceilingLights: [{ variants: [0], every: 4, offset: [2, 2], color: '#ffd8a8', radius: 120, intensity: 0.55, flicker: 0.04 }],
      rooms: [
        { name: 'Living room', rect: [1, 1, 10, 7], note: 'Home' },
        { name: 'Workshop', rect: [12, 1, 11, 7], note: 'Home' },
      ],
      objectLegend: {
        S: { item: 'hn-trophy-shelf', props: { face: 's' } },
        N: { item: 'hn-sign', props: { face: 's', title: 'House rules', text: '1. Wipe your boots.\n\n2. Do not bring home anything that ticks.\n\n3. If it talks, it stays outside until it explains itself.' } },
        H: { item: 'hn-home-med', props: { face: 's' } },
        C: 'hn-comms',
        D: 'hn-ledger-desk',
        Q: 'hn-retire',
        b: { item: 'couch', props: { dir: 's' } },
        r: 'rug',
        L: { item: 'hn-cache', props: { kind: 'locker', name: 'supply locker', uid: 'home-locker', text: 'Your own locker. You put a box of shells in here for a bad day and then forgot about it, which is the best kind of saving.', loot: [{ type: 'ammo', ammo: 'shells', amount: 100 }] } },
        w: 'counter',
        X: { item: 'hn-exit', props: { prompt: 'Go out to the near-area map', title: 'Leave home?', text: 'Leaving starts a mission: your kit refills now, and won’t again until you’re back.' } },
        '@': { start: true },
      },
      map: [
        '########################',
        '#..........#...........#',
        '#..........#...........#',
        '#..........#...........#',
        '#..........+...........#',
        '#..........#...........#',
        '#..........#...........#',
        '#..........#...........#',
        '########################',
      ],
      objects: [
        '   S   N      H         ',
        '  C                 L   ',
        '      b                 ',
        '                        ',
        '     r               X  ',
        '     @                  ',
        '  D     Q         w     ',
        '                        ',
        '                        ',
      ],
    },
  },
});
