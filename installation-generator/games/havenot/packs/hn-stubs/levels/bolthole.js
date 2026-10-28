/* HaveNot — packs/hn-stubs/levels/bolthole.js
 * The Bolt Hole: an Age of War executive’s private shelter, revealed by the courier’s map.
 * A stub: the entrance and one room are built; the way further in is sealed until the full installation exists.
 */
'use strict';
LM.definePack({
  id: 'hn-stubs',
  levels: {
    'hn-bolthole': {
      name: 'The Bolt Hole',
      floorLabel: 'The Bolt Hole',
      order: 32,
      environment: 'hn-home',
      hn: { place: 'The Bolt Hole', stub: true },
      stairsUp: false,
      intro: 'The hatch under the billboard opens on an executive’s private shelter: a carpeted airlock, a wine rack, and an inner door sealed from inside.',
      nextGen: {
        enabled: true,
        oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.4, pipes: true, ducts: false, cables: true, beams: true, fans: false, hanging: true, opacity: 0.9, color: '#030303', height: 1.7, parallax: 0.2, rim: true, seed: 32 },
        neon: { on: false },
      },
      ceilingLights: [{ variants: [0], every: 4, offset: [1, 1], color: '#ffd8a8', radius: 100, intensity: 0.4, flicker: 0.15, skip: 0.3 }],
      rooms: [{ name: 'Entrance', rect: [7, 7, 8, 5], note: 'The Bolt Hole' }, { name: 'First room', rect: [5, 2, 12, 4], note: 'The Bolt Hole' }],
      legend: {
        D: { terrain: 'door', props: { sealed: true } },
      },
      objectLegend: {
        '@': { start: true },
        X: { item: 'hn-exit', props: { prompt: 'Head back out to the near-area map', confirm: false } },
        N: { item: 'hn-sign', props: { face: 's', title: 'Sealed', kicker: 'The Bolt Hole', text: 'The inner door is sealed from the inside. A brass plate: PRIVATE · THE EXECUTIVE IS NOT TO BE DISTURBED. A smell of cedar and something else.\n\n(Only the entrance of this place is built in this vertical slice.)' } },
        c: { item: 'hn-cache', props: { kind: 'case', name: 'wine rack', uid: 'bolthole-rack', text: 'A wine rack. One bottle is not wine: a sealed tube of credits with a note, “For the courier. Don’t tell.”', loot: [{ type: 'gold', amount: 150 }] } },
        p: 'plant',
      },
      map: [
        '######################',
        '###########D##########',
        '#####............#####',
        '#####............#####',
        '#####............#####',
        '#####............#####',
        '##########+###########',
        '#######........#######',
        '#######........#######',
        '#######........#######',
        '#######........#######',
        '#######........#######',
        '######################',
        '######################',
      ],
      objects: [
        '                      ',
        '            N         ',
        '      c               ',
        '                      ',
        '                p     ',
        '                      ',
        '                      ',
        '                      ',
        '                      ',
        '                      ',
        '          @           ',
        '          X           ',
        '                      ',
        '                      ',
      ],
    },
  },
});
