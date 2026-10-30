/* HaveNot — packs/hn-gen-kit/robots.js
 * Asterion's robots (from Dead Signal: games/dead-signal/packs/ds-robots, ds-executive, ds-tartarus), brought out
 * into the wastes: the same bodies, guns and habits, gone feral in the ruined installations. Their Threat is the
 * Dead Signal floor each first turns up on (the prologue and floor 1 → 1, ... the Tartarus vaults → 6), and the
 * generator places them by it (gen/library/monsters.js). They fight with this game's behaviours (Dead Signal's
 * patrol routes, ARIADNE's escorts and the Sterilizer's turning lamp stay in Dead Signal); where Dead Signal used a
 * status or a projectile of its own, the nearest of this game's stands in. Drawn from the art (art/src/<id>.svg,
 * hn-gen-kit/monsterart.js); `robotBody` below is the stand-in until the sheet loads.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  const ROBOT = { electric: 2, bleed: 0, toxic: 0, acid: 0.5 };
  const cell = (chance, big) => ({ id: 'hn-loot', chance, props: { hn: big ? 'hn-fuel-cell-big' : 'hn-fuel-cell' } });
  const sprocket = (chance) => ({ id: 'hn-loot', chance, props: { hn: 'hn-sprocket' } });

  /** A plain robot: a shell in its colour with a red visor, facing its way (the stand-in drawing). */
  function robotBody(g, e) {
    const r = e.def.radius, c = e.def.color || '#5a6068';
    G.circle(g, 0, 0, r, U.shade(c, -0.45));
    G.circle(g, 0, 0, r * 0.82, c);
    g.rotate(e.facing || 0);
    g.fillStyle = '#ff3a2a';
    g.fillRect(r * 0.35, -r * 0.4, r * 0.3, r * 0.8);
  }
  const slug = (o) => Object.assign({ type: 'ranged', projectile: 'enemy-slug', speed: 430, spread: 0.05, lead: 0.4, flash: '#ff6a3a' }, o);
  const bolt = (o) => Object.assign({ type: 'ranged', projectile: 'enemy-bolt', speed: 360, spread: 0.04, lead: 0.4, flash: '#ff5a3a' }, o);
  const melee = (o) => Object.assign({ type: 'melee', windup: 0.25, recover: 0.3, cooldown: 0.9 }, o);
  const charge = (o) => Object.assign({ type: 'charge', speed: 330, duration: 0.5, windup: 0.4, cooldown: 2.5, minRange: 50, maxRange: 220 }, o);

  // [threat, the def]: the threat goes in as hnThreat
  const R = {
    'hn-sentinel': [1, {
      name: 'Sentinel MK-IV', hp: 55, armor: 0.2, speed: 82, radius: 11, ai: 'skirmisher', sight: 340, turn: 6, mass: 2.2, color: '#4a5058',
      attacks: [slug({ damage: 7, burst: 3, burstGap: 0.11, windup: 0.5, cooldown: 2, range: 430, moveWhileFiring: 0.15 })],
      drops: { gold: [4, 10], goldChance: 0.6, items: [cell(0.7), sprocket(0.2)] },
    }],
    'hn-warden': [1, {
      name: 'Warden Drone', hp: 28, speed: 140, radius: 9, ai: 'skirmisher', sight: 300, turn: 5, mass: 0.8, flying: true, color: '#3a3f45',
      attacks: [bolt({ damage: 10, windup: 0.35, cooldown: 1.5, range: 380, lead: 0.5 })],
      drops: { gold: [2, 6], goldChance: 0.5, items: [cell(0.5)] },
    }],
    'hn-ceiling-turret': [1, {
      name: 'Ceiling Turret', hp: 75, armor: 0.3, speed: 0, radius: 10, ai: 'turret', sight: 360, turn: 4, mass: 99, flying: true, stationary: true, color: '#3a3f45',
      attacks: [bolt({ damage: 9, speed: 320, burst: 5, burstGap: 0.09, windup: 0.6, cooldown: 2.4, range: 470, spread: 0.12, lead: 0.3, moveWhileFiring: 0 })],
      drops: { gold: [3, 8], goldChance: 0.5, items: [cell(0.8), sprocket(0.3)] },
    }],
    'hn-sweeper': [1, {
      name: 'Sweeper', hp: 45, speed: 96, radius: 11, ai: 'chaser', sight: 230, turn: 5, mass: 2, color: '#c9ced4',
      attacks: [charge({ damage: 12, duration: 0.6, windup: 0.5, cooldown: 2.6, maxRange: 230, stun: 0.3 }), melee({ damage: 6, range: 12, knock: 160 })],
      drops: { gold: [1, 5], goldChance: 0.4, items: [cell(0.5)] },
    }],
    'hn-scalpel': [1, {
      name: 'Scalpel Drone', hp: 14, speed: 175, radius: 8, ai: 'swarmer', sight: 330, accel: 11, turn: 12, mass: 0.6, flying: true, color: '#9aa1a8',
      attacks: [charge({ damage: 5, duration: 0.3, windup: 0.3, minRange: 60, maxRange: 180 }), melee({ damage: 6, range: 13, windup: 0.22, recover: 0.2, cooldown: 0.55, knock: 40, status: 'hn-bleed' })],
      drops: { gold: [0, 3], goldChance: 0.3, items: [cell(0.2)] },
    }],
    'hn-labmate': [2, {
      name: 'LabMate', hp: 40, armor: 0.1, speed: 98, radius: 10, ai: 'chaser', sight: 260, turn: 7, mass: 1.6, color: '#e6eaec',
      attacks: [
        melee({ damage: 8, range: 13, windup: 0.32, cooldown: 1.1, knock: 60, status: 'hn-tased' }),
        { type: 'lob', damage: 10, radius: 34, minRange: 110, maxRange: 320, windup: 0.5, cooldown: 3.4, flight: 0.85, color: '#8fe0c0', status: 'hn-toxic' },
      ],
      drops: { gold: [2, 8], goldChance: 0.6, items: [cell(0.6)] },
    }],
    'hn-courier': [2, {
      name: 'Courier', hp: 22, speed: 196, radius: 8, ai: 'swarmer', sight: 250, accel: 10, turn: 10, mass: 0.9, color: '#e6eaec',
      attacks: [charge({ damage: 9, speed: 380, duration: 0.45, windup: 0.35, cooldown: 2.2, minRange: 40, maxRange: 210, stun: 0.5 }), melee({ damage: 4, range: 10, windup: 0.2, recover: 0.2, cooldown: 0.7, knock: 80 })],
      drops: { gold: [1, 4], goldChance: 0.4, items: [cell(0.3)] },
    }],
    'hn-bench-arm': [2, {
      name: 'Bench Arm', hp: 50, armor: 0.15, speed: 0, radius: 9, ai: 'turret', sight: 120, turn: 5, mass: 99, stationary: true, color: '#c9d0d5',
      attacks: [melee({ damage: 14, range: 30, windup: 0.45, recover: 0.35, cooldown: 1.2, knock: 170 })],
      drops: { gold: [1, 5], goldChance: 0.4, items: [sprocket(0.6)] },
    }],
    'hn-sterilizer': [2, {
      name: 'Sterilizer', hp: 90, armor: 0.15, speed: 58, radius: 12, ai: 'hn-plod', sight: 260, turn: 3, mass: 3, color: '#c9d0d5',
      attacks: [{ type: 'ranged', projectile: 'arc-bolt', damage: 4, speed: 300, burst: 6, burstGap: 0.07, windup: 0.6, cooldown: 2.4, range: 220, spread: 0.1, lead: 0.2, flash: '#c46aff', status: 'hn-irradiated' }],
      drops: { gold: [4, 10], goldChance: 0.6, items: [cell(1), sprocket(0.3)] },
    }],
    'hn-docent': [2, {
      name: 'DOCENT-3', hp: 220, armor: 0.1, speed: 92, radius: 12, ai: 'skirmisher', sight: 300, turn: 6, mass: 1.4, flying: true, color: '#e6eaec',
      attacks: [bolt({ damage: 7, speed: 330, burst: 3, burstGap: 0.08, fan: 0.55, windup: 0.5, cooldown: 2.2, range: 400, spread: 0.02, lead: 0.3, moveWhileFiring: 0.3, flash: '#7fd0c8' }), { type: 'summon', enemy: 'hn-courier', count: 2, max: 2, windup: 0.8, cooldown: 9 }],
      bossBar: { name: 'DOCENT-3', color: '#7fd0c8', range: 500, sub: () => 'Discovery Center tour guide' },
      drops: { gold: [40, 70], items: [cell(1, true), sprocket(1)] },
    }],
    'hn-orderly': [3, {
      name: 'Orderly', hp: 80, armor: 0.15, speed: 112, radius: 10, ai: 'skirmisher', sight: 300, accel: 9, turn: 8, mass: 1.8, color: '#e6eaec',
      attacks: [bolt({ damage: 9, speed: 420, burst: 2, burstGap: 0.12, windup: 0.32, cooldown: 1.25, range: 360, moveWhileFiring: 0.4, flash: '#7fd4ff' }), melee({ damage: 8, range: 14, knock: 160 })],
      drops: { gold: [5, 12], goldChance: 0.6, items: [cell(0.8)] },
    }],
    'hn-concierge': [5, {
      name: 'Concierge', hp: 130, armor: 0.15, speed: 122, radius: 9, ai: 'skirmisher', sight: 300, accel: 10, turn: 9, mass: 1.6, color: '#0c0c0e',
      attacks: [
        { type: 'blink', minRange: 110, maxRange: 400, windup: 0.35, delay: 0.25, damage: 14, distance: 46, behind: false, color: '#f4efe6', cooldown: 3.6 },
        { type: 'ranged', projectile: 'dart', damage: 7, speed: 360, burst: 3, burstGap: 0.06, fan: 0.42, windup: 0.4, cooldown: 2.1, range: 380, spread: 0.04, lead: 0.4, flash: '#f2ece2' },
        melee({ damage: 12, range: 14, knock: 120 }),
      ],
      drops: { gold: [20, 40], items: [cell(1)] },
    }],
    'hn-chef': [5, {
      name: 'Chef', hp: 150, armor: 0.2, speed: 104, radius: 10, ai: 'chaser', sight: 280, accel: 9, turn: 7, mass: 2.4, color: '#c8ccd0',
      attacks: [
        melee({ damage: 9, range: 16, windup: 0.18, recover: 0.18, cooldown: 0.45, knock: 70, status: 'hn-bleed' }),
        { type: 'ranged', projectile: 'pellet', damage: 4, speed: 250, burst: 9, burstGap: 0.045, windup: 0.5, cooldown: 3.2, range: 170, minRange: 40, spread: 0.18, lead: 0.2, moveWhileFiring: 0.2, flash: '#ff8a3a', status: 'hn-burning' },
      ],
      drops: { gold: [15, 35], items: [cell(1)] },
    }],
    'hn-kitchen-arm': [5, {
      name: 'Kitchen Arm', hp: 70, armor: 0.2, speed: 0, radius: 9, ai: 'turret', sight: 120, turn: 6, mass: 99, stationary: true, color: '#c9d0d5',
      attacks: [melee({ damage: 13, range: 30, windup: 0.4, cooldown: 1, knock: 170, status: 'hn-bleed' })],
      drops: { gold: [3, 9], goldChance: 0.5, items: [sprocket(0.7)] },
    }],
    'hn-praetorian': [5, {
      name: 'Praetorian', hp: 2400, armor: 0.7, speed: 92, radius: 12, ai: 'chaser', sight: 380, accel: 8, turn: 3.2, mass: 9, color: '#c9a046',
      reflect: { arc: 1.35, aim: true, damage: 1.25, speed: 1.1, color: '#ffe0a0' },
      attacks: [
        charge({ damage: 30, speed: 420, duration: 0.4, windup: 0.5, cooldown: 2.6, maxRange: 200, stun: 0.4 }),
        slug({ damage: 16, speed: 470, burst: 2, burstGap: 0.12, windup: 0.45, cooldown: 1.6, range: 340, spread: 0.03, lead: 0.5, flash: '#ffd28a' }),
        melee({ damage: 24, range: 18, recover: 0.35, cooldown: 1, knock: 260 }),
      ],
      bossBar: { name: 'Praetorian', color: '#c9a046', range: 600, sub: () => 'shots bounce off the shield: go round it' },
      drops: { gold: [150, 260], items: [cell(1, true), cell(1, true), sprocket(1)] },
    }],
    'hn-railgun': [5, {
      name: 'Rail Gun', hp: 420, armor: 0.55, speed: 0, radius: 12, ai: 'turret', sight: 380, turn: 5, mass: 99, flying: true, stationary: true, color: '#2a2c30',
      attacks: [slug({ damage: 13, speed: 560, burst: 8, burstGap: 0.06, windup: 0.75, cooldown: 1.7, range: 380, spread: 0.07, lead: 0.55, moveWhileFiring: 0 })],
      drops: { gold: [30, 60], items: [cell(1, true), sprocket(1)] },
    }],
    'hn-enforcer': [5, {
      name: 'Enforcer', hp: 300, armor: 0.3, speed: 112, radius: 11, ai: 'skirmisher', sight: 420, accel: 9, turn: 6, mass: 2.6, color: '#141416',
      reflect: { arc: 0.85, aim: true, damage: 1, speed: 1, chance: 0.55, color: '#ffe0a0' },
      attacks: [slug({ damage: 10, speed: 470, burst: 3, burstGap: 0.1, windup: 0.45, cooldown: 1.7, range: 400, spread: 0.04, lead: 0.5, flash: '#ffd28a' }), melee({ damage: 16, range: 16, recover: 0.35, cooldown: 1, knock: 180 })],
      drops: { gold: [30, 55], items: [cell(1), sprocket(0.6)] },
    }],
    'hn-tartarus': [6, {
      name: 'Tartarus Warden', hp: 900, armor: 0.45, speed: 66, radius: 17, ai: 'chaser', sight: 330, accel: 5, turn: 3, mass: 9, color: '#b5803f',
      attacks: [
        { type: 'nova', damage: 22, radius: 72, windup: 0.7, recover: 0.6, cooldown: 4, color: '#ffb040', status: 'hn-shaken' },
        melee({ damage: 30, range: 26, windup: 0.45, recover: 0.4, cooldown: 1.3, knock: 360 }),
        slug({ damage: 14, speed: 420, burst: 3, burstGap: 0.14, windup: 0.6, cooldown: 2.4, range: 380, spread: 0.06, flash: '#ffb040' }),
      ],
      bossBar: { name: 'Tartarus Warden', color: '#ffb040', range: 600, sub: () => 'vault security, still on shift' },
      drops: { gold: [120, 200], items: [cell(1, true), sprocket(1), sprocket(1)] },
    }],
    'hn-plate-cutter': [6, {
      name: 'Plate Cutter', hp: 560, armor: 0.4, speed: 70, radius: 14, ai: 'chaser', sight: 260, accel: 6, turn: 5, mass: 6, color: '#1e1c18',
      attacks: [
        { type: 'ranged', projectile: 'arc-bolt', damage: 7, speed: 520, burst: 8, burstGap: 0.05, windup: 0.45, cooldown: 1.8, range: 220, spread: 0.12, flash: '#ffb040', status: 'hn-burning' },
        melee({ damage: 22, range: 20, windup: 0.35, recover: 0.4, cooldown: 1.1, knock: 200, status: 'hn-burning' }),
      ],
      drops: { gold: [60, 110], items: [cell(1, true), sprocket(1)] },
    }],
  };

  const enemies = {};
  for (const [id, [threat, d]] of Object.entries(R)) {
    enemies[id] = Object.assign({ robot: true, hnThreat: threat, takes: Object.assign({}, ROBOT), blood: '#26221e', gib: U.shade(d.color, 0.25), deathSound: 'explode', draw: robotBody }, d);
  }
  LM.definePack({ id: 'hn-gen-kit', enemies });
})();
