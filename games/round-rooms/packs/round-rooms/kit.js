/* Round Rooms — packs/round-rooms/kit.js
 * Test kit for the engine's magazines, overheating and partial plate coverage (engine/SPEC.md 6.4, 6.7).
 */
'use strict';
(function () {
  const LM = window.LM;
  const core = LM.registry.weapons;
  LM.definePack({
    id: 'round-rooms',
    weapons: {
      'rr-scattergun': Object.assign({}, core.scattergun, {
        name: 'Magazine Scattergun', short: 'Scatter', slot: 2,
        desc: 'Eight shells to a magazine, two seconds to reload. Press R to reload early.',
        magazine: 8, reloadTime: 2, pickupAmmo: 40,
      }),
      'rr-gauss': Object.assign({}, core.pistol, {
        name: 'Gauss Pistol', short: 'Gauss', slot: 3,
        desc: 'Long reach, heavy slugs. Six shots inside three seconds and it overheats for three.',
        damage: 34, fireRate: 3, speed: 1500, range: 1100, tracer: '#9fe8ff', flash: '#9fe8ff',
        heat: { shots: 6, window: 3, cooldown: 3, color: '#ff3a1e' },
        damageType: 'electric',
      }),
    },
    armor: {
      'rr-chest-plate': {
        name: 'Heavy Chest Plate', slot: 'body', color: '#5a5f66', trim: '#a9b0b8',
        mods: { armor: 0.5, speed: -12 }, coverage: 0.6,
        desc: 'Stops half of a hit, when the hit lands on it. It covers about six in ten.',
      },
      'rr-insulated-boots': {
        name: 'Insulated Boots', slot: 'feet', color: '#3a3020',
        takes: { electric: 0.25 },
        desc: 'Electrical damage is cut to a quarter.',
      },
    },
    statuses: {
      'rr-acid': { name: 'Acid', seconds: 3, dps: 6, ignoreArmor: true, color: '#9dff3a' },
    },
  });
})();
