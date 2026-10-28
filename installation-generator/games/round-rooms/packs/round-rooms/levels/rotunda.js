/* Round Rooms — packs/round-rooms/levels/rotunda.js
 * One floor of curved rooms (engine/SPEC.md section 23). Each room's floor is drawn as a plain block in the
 * map; its `shape` trims it. The corridors and the door on the rotunda's rim are kept open by the engine.
 *
 *   Entry hall (rounded) -> Rotunda (circle, with a round pillar) -> door -> Octagon (the stairs down)
 *                                    \-> south -> Oval (an armor stand and a chest)
 */
'use strict';
LM.definePack({
  id: 'round-rooms',
  levels: {
    'rr-rotunda': {
      name: 'The Rotunda',
      order: 1,
      environment: 'hn-complex',
      intro: 'Somebody built this place without a single corner. The building is very proud of it.',
      attractPath: [[4, 8], [16, 4], [32, 8], [16, 21]],
      nextGen: {
        enabled: true,
        oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.35, hanging: true, seed: 3 },
        neon: { on: false },
      },
      legend: {
        W: { item: 'weapon-rack', props: { weapon: 'rr-gauss' } },
        U: { item: 'armor-stand', props: { armor: 'rr-chest-plate' } },
      },
      rooms: [
        { name: 'Entry Hall', rect: [2, 6, 5, 5], shape: { type: 'rounded', radius: 1.6 } },
        { name: 'Rotunda', rect: [10, 2, 13, 13], shape: 'circle', note: 'Round, as advertised' },
        { name: 'Octagon', rect: [27, 3, 11, 11], shape: 'octagon' },
        { name: 'Oval', rect: [6, 18, 21, 7], shape: 'ellipse' },
      ],
      shapes: [
        { type: 'circle', x: 16.5, y: 8.5, r: 1.5, solid: true },
      ],
      loadout: { weapons: ['pistol', 'rr-scattergun'] },
      map: [
        '',
        '         ###############',
        '         #.............#  #############',
        '         #......g......#  #...........#',
        '         #.............#  #...........#',
        ' ####### #..h..........#  #...f.......#',
        ' #.....# #.............#  #...........#',
        ' #.....###.............####...........#',
        ' #.<..................+......W.....>..#',
        ' #.....###.............####...........#',
        ' #.....# #.............#  #...........#',
        ' ####### #.............#  #......f....#',
        '         #..........a..#  #...........#',
        '         #.............#  #...........#',
        '         #.............#  #############',
        '         #######.#######',
        '               #.#',
        '     ###########.###########',
        '     #.....................#',
        '     #.....................#',
        '     #......M..............#',
        '     #..c...............U..#',
        '     #..............f......#',
        '     #.....................#',
        '     #.....................#',
        '     #######################',
      ],
    },
  },
});
