/* HaveNot — packs/hn-stubs/levels/bunker.js
 * The Bunker (Installation B): a blast door in a hillside.
 * A stub: the entrance and one room are built; the way further in is sealed until the full installation exists.
 */
'use strict';
LM.definePack({
  id: 'hn-stubs',
  levels: {
    'hn-bunker': {
      name: 'The Bunker',
      floorLabel: 'The Bunker',
      order: 30,
      environment: 'hn-complex',
      hn: { place: 'The Bunker', stub: true },
      stairsUp: false,
      intro: 'Behind the blast door: a guard post, a dead light, and a second blast door that says PLEASE in red paint.',
      nextGen: {
        enabled: true,
        oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.4, pipes: true, ducts: false, cables: true, beams: true, fans: false, hanging: true, opacity: 0.9, color: '#030303', height: 1.7, parallax: 0.2, rim: true, seed: 30 },
        neon: { on: false },
      },
      ceilingLights: [{ variants: [0], every: 4, offset: [1, 1], color: '#ffd8a8', radius: 100, intensity: 0.4, flicker: 0.15, skip: 0.3 }],
      rooms: [{ name: 'Entrance', rect: [7, 7, 8, 5], note: 'The Bunker' }, { name: 'First room', rect: [5, 2, 12, 4], note: 'The Bunker' }],
      legend: {
        D: { terrain: 'door', props: { sealed: true } },
      },
      objectLegend: {
        '@': { start: true },
        X: { item: 'hn-exit', props: { prompt: 'Head back out to the near-area map', confirm: false } },
        N: { item: 'hn-sign', props: { face: 's', title: 'Sealed', kicker: 'The Bunker', text: 'A second blast door, welded. Someone on the other side has scratched a tally on it: hundreds of marks, then nothing.\n\n(Only the entrance of this place is built in this vertical slice.)' } },
        c: { item: 'hn-cache', props: { kind: 'locker', name: 'guard locker', uid: 'bunker-locker', text: 'A guard’s locker, rifled long ago. Whoever did it missed the coins in the boot.', loot: [{ type: 'gold', amount: 35 }] } },
        k: 'hn-roach',
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
        '      c               ',
        '               k      ',
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
