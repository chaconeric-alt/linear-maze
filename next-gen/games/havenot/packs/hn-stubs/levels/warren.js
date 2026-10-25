/* HaveNot — packs/hn-stubs/levels/warren.js
 * The Warren (Installation C): tunnels under a dead mall.
 * A stub: the entrance and one room are built; the way further in is sealed until the full installation exists.
 */
'use strict';
LM.definePack({
  id: 'hn-stubs',
  levels: {
    'hn-warren': {
      name: 'The Warren',
      floorLabel: 'The Warren',
      order: 31,
      environment: 'hn-den',
      hn: { place: 'The Warren', stub: true },
      stairsUp: false,
      intro: 'A collapsed escalator into the dark under a dead mall. The walls are scored with claw marks, fresh ones over old.',
      nextGen: {
        enabled: true,
        oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.4, pipes: true, ducts: false, cables: true, beams: true, fans: false, hanging: true, opacity: 0.9, color: '#030303', height: 1.7, parallax: 0.2, rim: true, seed: 31 },
        neon: { on: false },
      },
      ceilingLights: [{ variants: [0], every: 4, offset: [1, 1], color: '#ffd8a8', radius: 100, intensity: 0.4, flicker: 0.15, skip: 0.3 }],
      rooms: [{ name: 'Entrance', rect: [7, 7, 8, 5], note: 'The Warren' }, { name: 'First room', rect: [5, 2, 12, 4], note: 'The Warren' }],
      legend: {
        D: { terrain: 'door', props: { sealed: true } },
      },
      objectLegend: {
        '@': { start: true },
        X: { item: 'hn-exit', props: { prompt: 'Head back out to the near-area map', confirm: false } },
        N: { item: 'hn-sign', props: { face: 's', title: 'Sealed', kicker: 'The Warren', text: 'A tunnel mouth packed with rubble and webbing. Something on the other side is digging toward you, slowly.\n\n(Only the entrance of this place is built in this vertical slice.)' } },
        g: 'hn-glowcap',
        r: 'hn-roach',
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
        '                      ',
        '         r     g      ',
        '      g      r        ',
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
