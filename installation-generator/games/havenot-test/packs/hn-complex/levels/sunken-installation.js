/* HaveNot test floor — packs/hn-complex/levels/sunken-installation.js
 * One small floor that shows off the next-generation look (engine/SPEC.md section 22):
 * a tilted camera with standing walls, ceiling silhouettes (pipes, ducts, cables, beams,
 * hanging lamps, and fans over the roach gallery's tagged tiles) and amber/jade/purple neon.
 *
 * The way through:
 *   Foyer -> Courtesy Corridor (dart plates, then a laser beam that fires a ceiling node)
 *   -> Tube Bay (crossing the middle decants three Glorexx) -> Roach Gallery (roaches drop
 *   from the fans; a Bombast Toad guards the red door) -> Tomb of Sub-Commander Vell (take the
 *   hoard: the doors seal, Knife Fighters pour in, the room floods until they're dead)
 *   -> Break Room (a Monoid at the slot machine, the red key in the locker)
 *   -> back to the gallery, through the red door -> Security Vault (the Heavy Security Drone) -> out.
 */
'use strict';
LM.definePack({
  id: 'hn-complex',
  levels: {
    'hn-sunken-installation': {
      name: 'The Sunken Installation',
      order: 1,
      environment: 'hn-complex',
      intro: 'The ruin above was quiet and sun-bleached. The hatch at the bottom of the stairs still had power. A smart door said “Welcome back, employee,” and let you in.',
      outro: 'The exfil hatch hisses open onto ash and amber light. Behind you, the installation politely reminds no one to clock out.',
      attractPath: [[6, 5], [20, 5], [36, 6], [36, 18], [21, 17]],

      nextGen: {
        enabled: true,
        oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: {
          on: true, clutter: 0.6, pipes: true, ducts: true, cables: true, beams: true, fans: true, hanging: true,
          fanTag: 'fan', fanSpeed: 1.2, opacity: 0.95, color: '#030303', height: 1.7, parallax: 0.2, rim: true, seed: 7,
        },
        neon: {
          on: true, colors: ['#ffa030', '#2affb0', '#b04aff', '#ff5a2a'], where: 'rooms', rooms: [], tag: '', density: 0.45,
          flicker: 0.2, brightness: 0.85, radius: 120, style: 'tube', colorMode: 'room', mount: 0.7, lightTag: 'neon',
        },
      },

      legend: {
        // fixtures
        Q: { terrain: 'wall', item: 'hn-trap-light', props: { face: 'w', text: 'TRAP. An Age of Wonder courtesy light: the law said a trapped door must say so. It is. Have a nice day.' } },
        e: { terrain: 'wall', item: 'hn-poster', props: { title: 'HUSTLE IS A LIFESTYLE', text: 'A worker sprints past a pit with a smile. Under it: “The floor is optional. The deadline is not.”', color: '#6a2a2a' } },
        q: { terrain: 'wall', item: 'hn-stasis-tube', props: { face: 's' } },
        v: { item: 'hn-vending' },
        '&': { item: 'hn-vert-soda' },
        u: { item: 'hn-pog' },
        '5': { item: 'hn-hoard', tag: 'hoard' },
        '6': {
          item: 'lectern',
          props: {
            title: 'Workplace Safety Notice #4471',
            text: 'Congratulations on your continued employment!\n\nThis facility contains: pressure plates, courtesy lasers, Specimen Tubes (do NOT tap the glass), a Tomb (do NOT take the Tomb), and a Heavy Security Drone, who is your friend unless your IFF chip says otherwise.\n\nIf you do not have an IFF chip, please report to Security, where the Drone will help you.',
          },
        },
        '7': {
          item: 'lectern',
          props: {
            title: 'Specimen Handling Memo',
            text: 'Re: the Glorexx in Bay 2.\n\nThey are asleep. They are only asleep. The tubes decant automatically if anyone crosses the bay floor, which is why we ask that nobody crosses the bay floor.\n\nThe locker by the far wall has the arc lance. Please return it charged.',
          },
        },
        W: { item: 'weapon-rack', props: { weapon: 'scattergun' } },
        C: {
          item: 'chest',
          props: {
            name: 'Lab locker',
            loot: [{ type: 'weapon', id: 'arc-lance' }, { type: 'ammo', ammo: 'cells', amount: 24 }, { type: 'item', id: 'hn-pog' }],
          },
        },
        E: {
          item: 'chest',
          props: {
            name: 'Break-room locker',
            loot: [{ type: 'key', color: 'red' }, { type: 'gold', amount: 30 }, { type: 'ammo', ammo: 'shells', amount: 12 }],
          },
        },
        c: { item: 'chest', props: { name: 'Vault strongbox', table: 'chest-rich' } },
        // monsters
        J: { enemy: 'hn-maintbot' },
        P: { enemy: 'hn-monoid' },
        K: { enemy: 'hn-knife' },
        B: { enemy: 'hn-toad' },
        w: { enemy: 'hn-wasp' },
        X: { enemy: 'hn-drone' },
        // traps
        '1': { terrain: 'plate', tag: 'plates' },
        D: { terrain: 'wall', item: 'dart-emitter', tag: 'darts', props: { face: 's' } },
        d: { terrain: 'wall', item: 'dart-emitter', tag: 'darts', props: { face: 'n' } },
        L: { terrain: 'wall', item: 'beam-emitter', tag: 'laser', props: { face: 's' } },
        l: { terrain: 'wall', item: 'beam-emitter', tag: 'laser', props: { face: 'n' } },
        '2': { tag: 'damocles' },
        Z: { tag: 'tubeSpawn' },
        z: { tag: 'tubeBay' },
        '3': { tag: 'roachZone' },
        '4': { tag: 'roachDrop' },
        j: { tag: 'fan' },
        s: { terrain: 'door', tag: 'tombDoor' },
        '9': { tag: 'flood1' },
        '0': { tag: 'flood2' },
      },

      rooms: [
        { name: 'Employee Foyer', rect: [1, 1, 11, 9] },
        { name: 'The Courtesy Corridor', rect: [13, 4, 15, 3], note: 'Passage' },
        { name: 'Specimen Tube Bay', rect: [29, 1, 16, 11] },
        { name: 'The Roach Gallery', rect: [29, 13, 16, 11] },
        { name: 'Tomb of Sub-Commander Vell', rect: [16, 12, 12, 11] },
        { name: 'The Break Room', rect: [2, 12, 13, 11] },
        { name: 'Security Vault', rect: [46, 13, 12, 11] },
      ],

      traps: [
        {
          // pressure plates set off the ninja-star slots in both walls
          trigger: { type: 'plate', tag: 'plates' },
          effects: [{ type: 'darts', tag: 'darts', volleys: 3, interval: 0.3, damage: 8 }],
          once: false,
          cooldown: 2.5,
        },
        {
          // crossing the beam wakes the Damocles node in the ceiling; it fires a moment later
          trigger: { type: 'beam', tag: 'laser' },
          effects: [
            { type: 'message', text: 'A ceiling node whines up to full charge.', kind: 'warn' },
            { type: 'flicker', radius: 220, time: 0.8, strength: 0.7 },
            { type: 'explode', tag: 'damocles', radius: 30, damage: 18, stagger: 0.08, delay: 0.9 },
          ],
          once: false,
          cooldown: 4,
        },
        {
          // crossing the bay floor decants the specimens
          trigger: { type: 'zone', tag: 'tubeBay' },
          effects: [
            { type: 'message', text: 'BAY 2: DECANTING SPECIMENS. PLEASE REMAIN CALM.', kind: 'warn' },
            { type: 'flicker', radius: 400, time: 1.2, strength: 0.8 },
            { type: 'spawn', tag: 'tubeSpawn', enemy: 'hn-glorexx', count: 3, delay: 0.8 },
          ],
        },
        {
          // the roaches nest above the fans
          trigger: { type: 'zone', tag: 'roachZone' },
          effects: [
            { type: 'message', text: 'Something armored skitters across the ceiling.', kind: 'warn' },
            { type: 'spawn', tag: 'roachDrop', enemy: 'hn-roach', count: 7, delay: 1.2 },
          ],
        },
        {
          // the tomb seals and floods when the hoard leaves its plinth
          trigger: { type: 'pickup', tag: 'hoard' },
          effects: [
            { type: 'seal', tag: 'tombDoor', text: 'TOMB SECURED FOR YOUR PROTECTION.' },
            { type: 'quake', strength: 6 },
            { type: 'spawn', tag: 'flood1', enemy: 'hn-knife', count: 6, delay: 1 },
            { type: 'message', text: 'Water pours in from vents along the walls.', kind: 'warn', delay: 2.5 },
            { type: 'terrain', tag: 'flood1', terrain: 'water', delay: 3 },
            { type: 'terrain', tag: 'flood2', terrain: 'water', delay: 9 },
            { type: 'message', text: 'The water is at your knees. Clear the room and the seal lets go.', kind: 'warn', delay: 9 },
          ],
        },
      ],

      map: [
        "#T###e###T###               ###q###q###q###q##",
        "#...........#               #..Z..zZ...Z...Z.#",
        "#.....6.....#               #.....z.........u#",
        "#...........####DDDD###L#####.....z.....J....#",
        "#.......k...Q....11.....22..Q.....z..........#",
        "#..<........+....11.....22..+..nn.z..nn..nn..#",
        "#...........#.h..11.....22..#.....z..........#",
        "#...........####dddd###l#####.....z..........#",
        "#.W.xx....v.#               #..nn.z..nn..nn..#",
        "#...........#               #.....z..........#",
        "#############               #.7...z.J.......C#",
        " #####e#T############T#######.....z..........#",
        " #.............#999999999999############+##########T#######",
        " #..S.......v..#999999999999#3333333333333333#.a..........#",
        " #...P.........#990000000099#...............a#..........c.#",
        " #.............#99o00000o099#.4j4......4j4...#...o....o...#",
        " #.....nnn.....#9900....0099#.....O..........#............#",
        " #.............s990i.5.i0099#....OOOO........Q............#",
        " #.......&.....#9900....0099s....OOOOO....B..R......X.....#",
        " #..........K..#99o00000o099#.w..OOOO........#............#",
        " #.E...........#990000000099#................#............#",
        " #........K....#999999999999#.4j........4j4..#...o....o...#",
        " #H............#999999999999#................#..u.......>.#",
        " ####################T#######xx............b.#............#",
        "                            #######################T#######",
      ],
    },
  },
});
