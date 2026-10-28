/* HaveNot — packs/hn-rules/bestiary.js
 * The HaveNot test floor's monsters (havenot-test/hn-complex), retuned for this game, and the new ones.
 * Behaviour follows each Vol 3 "If Encountered" note:
 *
 *   hn-roach     Gladiator Roach: drops from vents and ceilings; goes for thrown cookies and stops to eat
 *   hn-knife     Knife Fighter: fragile, flashes insults; takes extra from melee (×1.6) and blasts (×2)
 *   hn-glorexx   Glorexx: decanted from stasis tubes; claws, and a taser sting on a longer cycle
 *   hn-maintbot  Weaponized Maintenance Robot: slow, can't move while it swings; safety signs stall it
 *   hn-monoid    Monoid (when it fights): keeps its distance and retreats when hurt
 *   hn-drone     Heavy Security Drone: surveillance mode at its charger; hunts, gives up, goes home and
 *                powers down for a few seconds (vulnerable: its armor drops and the vents glow)
 *   hn-sphinx    Sphinx Gun (Vol 2 p. 136): dormant until it gets a wrong answer; powers up, fires twice a cycle
 *   hn-defender  Desktop Defender: a small, vicious desk guard that comes out of a box
 *   hn-turret    agency security turret; hn-emitter: a defense-field emitter (no attack)
 *
 * The rule of this game: monsters never drop healing or ammunition. Robots drop fuel cells (and sprockets),
 * which sell at a fixed value. Roaches drop nothing, so their return between missions can't be farmed.
 * Every robot takes double electrical damage and nothing from bleeding or toxins.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const HN = LM.HN;
  const base = LM.registry.enemies;
  const ROBOT = { electric: 2, bleed: 0, toxic: 0, acid: 0.5 };
  const cell = (chance, big) => ({ id: 'hn-loot', chance, props: { hn: big ? 'hn-fuel-cell-big' : 'hn-fuel-cell' } });
  const sprocket = (chance) => ({ id: 'hn-loot', chance, props: { hn: 'hn-sprocket' } });

  const INSULTS = ['UR MOM IS A TOASTER', 'LOW PRODUCTIVITY DETECTED', 'NICE HAT, IDIOT', 'YOU SMELL LIKE THE NOW', 'ERROR: FACE', '404 SKILL NOT FOUND', 'I WILL CUBE YOU', 'MEATBAG EMPLOYEE OF NEVER', 'RATED 1 STAR', 'YOUR BLOOD TYPE IS DISAPPOINTING', 'STAB STAB STAB', 'HAVE A NICE DEATH :)'];

  const behaviors = {
    // roaches: a swarmer that drops everything for sweets
    'hn-roach': {
      update(e, dt, game) {
        const lure = HN.nearestLure(e, 12 * T);
        if (lure) {
          e.aggro = false;
          e.alertT = 0;
          e.atk = null;
          const dx = lure.x - e.x, dy = lure.y - e.y, d = Math.hypot(dx, dy) || 1;
          if (d < 14) {
            if (!LM.status.has(e, 'hn-lured')) LM.status.apply(game, e, 'hn-lured', { seconds: 6 });
          } else {
            e.mx += dx / d;
            e.my += dy / d;
          }
          return;
        }
        LM.get('behaviors', 'swarmer').update(e, dt, game);
      },
    },
    // maintenance robots: they plod after you, and stop dead to swing
    'hn-plod': {
      update(e, dt, game) {
        if (e.atk) {
          e.speedMul = 0;
          return;
        }
        if (e.aggro) LM.ai.chase(e, game, 1);
        else LM.ai.wander(e, game, 0.3);
      },
    },
    // the Monoid in a fight: keeps away, and runs for it when the fight goes badly
    'hn-monoid': {
      update(e, dt, game) {
        if (e.hp < e.maxHp * 0.35) {
          if (!e.mem.fled) {
            e.mem.fled = true;
            game.toast('The Monoid’s eye flickers. “This is above my pay grade.” It retreats.', 'warn');
          }
          LM.ai.away(e, game, 1.2);
          e.speedMul = 1.6;
          e.atk = null;
          return;
        }
        LM.get('behaviors', 'skirmisher').update(e, dt, game);
      },
    },
    // the drone: surveillance mode at its charger, hunt, give up, go home, power down
    'hn-drone': {
      update(e, dt, game) {
        const m = e.mem;
        m.state = m.state || 'watch';
        const P = game.player;
        const homeD = U.dist(e.x, e.y, e.home.x, e.home.y);
        if (m.state === 'watch') {
          e.armor = 0.35;
          if (e.aggro) {
            m.state = 'hunt';
            m.t = 0;
            game.toast('DRONE: Surveillance mode ended. Hello.', 'warn');
          } else return;
        }
        if (m.state === 'hunt') {
          m.t += dt;
          const far = !e.seeLos && e.distP > 7 * T;
          if (m.t > 16 || (far && m.t > 4) || homeD > 14 * T) {
            m.state = 'return';
            e.aggro = false;
            e.atk = null;
            game.toast('DRONE: Intruder status: no longer my department. Returning to charger.', 'key');
          } else {
            LM.get('behaviors', 'skirmisher').update(e, dt, game);
            return;
          }
        }
        if (m.state === 'return') {
          e.aggro = false;
          e.atk = null;
          if (homeD < 10) {
            m.state = 'vent';
            m.t = 0;
            LM.audio.play('lift', { vol: 0.5 });
          } else {
            e.mx += (e.home.x - e.x) / homeD;
            e.my += (e.home.y - e.y) / homeD;
            if (e.hitWall) LM.ai.chase(e, game, 0.3);
          }
          return;
        }
        if (m.state === 'vent') {
          // powered down on its charger: the armor drops and it can't fight back
          m.t += dt;
          e.armor = -0.4;
          e.aggro = false;
          e.atk = null;
          if (m.t > 4.5) {
            m.state = 'watch';
            e.armor = 0.35;
          }
        }
        void P;
      },
    },
  };

  const enemies = {};
  const reuse = (id, over) => (enemies[id] = Object.assign({}, base[id], over));

  reuse('hn-roach', {
    ai: 'hn-roach', hp: 16, takes: { melee: 1 }, drops: null,
    resist: {},
  });
  reuse('hn-knife', {
    robot: true, takes: Object.assign({ melee: 1.6, blast: 2 }, ROBOT),
    drops: { gold: [1, 5], goldChance: 0.4, items: [cell(0.35)] },
    update(e, dt, game) {
      e.mem.insultT = (e.mem.insultT == null ? U.rand(1, 4) : e.mem.insultT) - dt;
      if (e.mem.insultT <= 0 && e.aggro && e.vis > 0.5) {
        e.mem.insultT = U.rand(3.5, 7);
        game.particles.add({ type: 'text', x: e.x, y: e.y - 14, vy: -16, drag: 1, life: 1.6, text: U.pick(INSULTS), color: '#ff5a4a', size: 6 });
      }
    },
  });
  reuse('hn-glorexx', {
    attacks: [
      { type: 'charge', damage: 14, speed: 470, duration: 0.4, windup: 0.45, cooldown: 3.2, minRange: 70, maxRange: 240 },
      { type: 'melee', damage: 6, range: 14, windup: 0.2, cooldown: 2.4, status: 'hn-tased' },
      { type: 'melee', damage: 9, range: 14, windup: 0.22, cooldown: 0.9 },
    ],
    takes: { blast: 1.2 },
    drops: { gold: [3, 8], goldChance: 0.5 },
  });
  reuse('hn-maintbot', {
    ai: 'hn-plod', speed: 66, takes: Object.assign({}, ROBOT),
    attacks: [{ type: 'melee', damage: 16, range: 16, windup: 0.6, cooldown: 1.6, recover: 0.4, knock: 180 }],
    drops: { gold: [3, 9], goldChance: 0.6, items: [cell(1), sprocket(0.4)] },
    update(e, dt, game) {
      // workplace safety signs: centuries of training make it stop and read
      if ((e.mem.signCd || 0) > 0) { e.mem.signCd -= dt; return; }
      for (const it of game.items) {
        if (it.dead || it.def.id !== 'hn-safety-sign') continue;
        if (U.dist2(e.x, e.y, it.x, it.y) > 3 * T * 3 * T) continue;
        if (!LM.physics.los(game.level, e.x, e.y, it.x, it.y)) continue;
        e.mem.signCd = 10;
        LM.status.apply(game, e, 'hn-confused', { seconds: 2.6 });
        e.atk = null;
        game.particles.add({ type: 'text', x: e.x, y: e.y - 18, vy: -12, drag: 1, life: 2, text: it.props.short || 'SAFETY FIRST?', color: '#ffe04a', size: 6 });
        break;
      }
    },
  });
  reuse('hn-monoid', {
    ai: 'hn-monoid', sight: 170, takes: Object.assign({}, ROBOT),
    drops: { gold: [20, 45], items: [cell(1)] },
  });
  reuse('hn-toad', { drops: { gold: [12, 24] } });
  reuse('hn-wasp', { drops: { gold: [90, 130] } });
  reuse('hn-drone', {
    ai: 'hn-drone', hp: 420, takes: Object.assign({}, ROBOT), leash: 99999,
    bossBar: {
      name: 'Heavy Security Drone', color: '#ff4a3a', range: 600,
      sub: (e) => (e.mem.state === 'vent' ? 'POWERED DOWN' : e.mem.state === 'watch' ? 'surveillance mode' : 'IFF: no match'),
      phases: [{ at: 0.5, text: 'DRONE: Escalating to Threat Posture Two. Thank you for your patience.' }],
    },
    drops: { gold: [60, 90], items: [cell(1, true), sprocket(1)] },
    drawGlow(g, e, t) {
      const venting = e.mem.state === 'vent', idle = e.mem.state === 'watch' || e.mem.state === 'return';
      const a = e.facing;
      for (const s of [-1, 1]) {
        const x = e.x + Math.cos(a) * 8 + Math.cos(a + Math.PI / 2) * 7 * s, y = e.y + Math.sin(a) * 8 + Math.sin(a + Math.PI / 2) * 7 * s;
        G.glow(g, x, y, idle ? 4 : 6, venting ? '#5a2a2a' : '#ff3a2a', idle ? 0.35 : 0.85);
      }
      if (venting) {
        // the cooling vents glow: hit it now
        G.glow(g, e.x, e.y, 34, '#ffb060', 0.35 + 0.25 * Math.sin(t * 9));
        G.glow(g, e.x - Math.cos(a) * 12, e.y - Math.sin(a) * 12, 12, '#fff0c0', 0.6);
      } else if (idle) G.glow(g, e.x, e.y, 22, '#3a6aff', 0.08 + 0.05 * Math.sin(t * 1.5));
      else G.glow(g, e.x, e.y, 30, '#ff3a2a', 0.08 + 0.06 * Math.sin(t * 4));
    },
  });

  enemies['hn-sphinx'] = {
    name: 'Sphinx Gun', hp: 170, speed: 0, radius: 13, armor: 0.35, mass: 99, stationary: true, ai: 'turret', sight: 520, turn: 3,
    robot: true, takes: Object.assign({}, ROBOT), color: '#8a7a4a', blood: '#ffcf6a', gib: '#6a5a3a', deathSound: 'explode', deathGlow: '#ffb050',
    attacks: [{ type: 'ranged', projectile: 'hn-sphinx-laser', damage: 13, speed: 900, burst: 2, burstGap: 0.12, windup: 1.0, cooldown: 1.9, range: 520, spread: 0.03, lead: 0.15, moveWhileFiring: 0, flash: '#ff3a3a' }],
    drops: { gold: [20, 40], items: [cell(1, true)] },
    update(e, dt, game) {
      if (!game.hasFlag('hnSphinxAngry') || game.hasFlag('hnSphinxOk')) {
        e.aggro = false;
        e.atk = null;
        e.alertT = 0;
      }
    },
    onDeath(e, game) {
      LM.combat.explode(game, e.x, e.y, { radius: 40, damage: 16, owner: 'enemy', silent: true });
      HN.setFlag(game, 'hnSphinxDead');
    },
    draw(g, e, t) {
      // a squat turret with a stylised sphinx face plate
      g.fillStyle = '#2a2620';
      LM.gfx.roundRect(g, -14, -14, 28, 28, 5);
      g.fill();
      g.fillStyle = '#6a5a3a';
      LM.gfx.roundRect(g, -12, -12, 24, 24, 4);
      g.fill();
      g.rotate(e.facing);
      g.fillStyle = '#1c1a16';
      g.fillRect(6, -2.5, 15, 5);
      g.fillStyle = '#c8a860';
      g.beginPath();
      g.moveTo(-8, -9); g.lineTo(6, -6); g.lineTo(8, 0); g.lineTo(6, 6); g.lineTo(-8, 9); g.closePath();
      g.fill();
      g.fillStyle = '#3a3020';
      g.fillRect(-4, -5, 6, 2);
      g.fillRect(-4, 3, 6, 2);
    },
    drawGlow(g, e, t) {
      const angry = game().hasFlag('hnSphinxAngry') && !game().hasFlag('hnSphinxOk');
      const x = e.x + Math.cos(e.facing) * 4, y = e.y + Math.sin(e.facing) * 4;
      const charge = e.atk ? Math.min(1, e.atk.t / 1.0) : 0;
      G.glow(g, x, y, 10 + charge * 18, angry ? '#ff3a3a' : '#f2c96b', angry ? 0.5 + charge * 0.5 : 0.3 + 0.1 * Math.sin(t * 2));
    },
  };
  const game = () => LM.game;

  enemies['hn-defender'] = {
    name: 'Desktop Defender', hp: 14, speed: 230, radius: 5, ai: 'swarmer', sight: 400, accel: 18, turn: 18, color: '#6a4a3a',
    blood: '#c83a3a', gib: '#4a3020', bark: 'enemyShot',
    attacks: [{ type: 'melee', damage: 4, range: 7, windup: 0.08, cooldown: 0.35, recover: 0.1, knock: 30 }],
    drops: null,
    draw(g, e) {
      g.rotate(e.facing);
      const s = Math.sin(e.t * 30);
      G.circle(g, 0, 0, 5.4, '#2a1a12');
      G.circle(g, 0, 0, 4.4, '#7a5a42');
      g.fillStyle = '#f0e0d0';
      for (let i = -2; i <= 2; i++) g.fillRect(3, i * 1.2 - 0.3, 2.4 + s * 0.6, 0.6);
    },
    drawGlow(g, e) { G.glow(g, e.x + Math.cos(e.facing) * 3, e.y + Math.sin(e.facing) * 3, 6, '#ff3a2a', 0.7); },
  };
  enemies['hn-turret'] = Object.assign({}, base.sentry, {
    name: 'Agency Security Turret', robot: true, takes: Object.assign({}, ROBOT), hp: 85,
    drops: { gold: [4, 10], items: [cell(1)] },
  });
  enemies['hn-emitter'] = {
    name: 'Defense Field Emitter', hp: 110, speed: 0, radius: 12, armor: 0.2, mass: 99, stationary: true, ai: 'turret', sight: 300,
    robot: true, takes: Object.assign({}, ROBOT), color: '#3a4a6a', blood: '#9fd8ff', gib: '#3a3e46', deathSound: 'explode', deathGlow: '#9fd8ff',
    attacks: [],
    drops: { items: [cell(1)] },
    draw(g) {
      g.fillStyle = '#1a1c22';
      LM.gfx.roundRect(g, -12, -12, 24, 24, 4);
      g.fill();
      g.fillStyle = '#3a4a6a';
      G.circle(g, 0, 0, 8, '#3a4a6a');
      G.circle(g, 0, 0, 4, '#9fd8ff');
    },
    drawGlow(g, e, t) { G.glow(g, e.x, e.y, 26, '#9fd8ff', 0.35 + 0.2 * Math.sin(t * 5 + e.home.x)); },
  };

  LM.definePack({ id: 'hn-rules', behaviors, enemies });
})();
