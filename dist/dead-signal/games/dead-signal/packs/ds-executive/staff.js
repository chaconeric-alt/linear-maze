/* Dead Signal — packs/ds-executive/staff.js
 * The executive floor's robots, in defence mode like every robot in the building (DESIGN.md 5.1): the
 * board's staff, and its guard.
 *
 *   ds-concierge     porcelain face, tailcoat, a silver tray. Greets you (props.greet: a line, once),
 *                    then steps through the air to stand beside you (blink) and throws cutlery.
 *   ds-chef          the robot kitchen's chef: four arms, four knives, a torch for the flambé.
 *   ds-kitchen-arm   an arm on the kitchen's counters: anything within reach gets the cleaver.
 *   ds-praetorian    the boardroom's guard: gold and black, a mirror shield that sends your shots back
 *                    at you, and armour that shrugs off the rest. It keeps its post (props.post: a tag,
 *                    else where it stands) and comes off it only for whoever comes too close.
 *   ds-board-turret  a rail gun in the boardroom's approach: a red line, and then a lot of rounds.
 * Behaviour ds-sentry: stands its post facing out; engages what comes within its `guard` distance of the
 * post, and goes back to it.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai, DS = (LM.DS = LM.DS || {});
  const X = DS.X;
  const RED = '#ff3a2a', GREEN = '#5fe08a';
  const visor = (e) => (e.faction === 'ally' ? GREEN : RED);

  const behaviors = {
    'ds-sentry': {
      update(e, dt, game) {
        const m = e.mem, F = AI.foe(e, game);
        if (!m.post) {
          const tag = e._props && e._props.post, pts = tag && game.level.tags[tag];
          m.post = pts && pts.length ? { x: pts[0].x * T + T / 2, y: pts[0].y * T + T / 2 } : { x: e.home.x, y: e.home.y };
          m.face = e._props && e._props.face != null ? +e._props.face : e.facing;
        }
        const guard = e.def.guard || 220;
        // props.huntWhen: once that flag is set it leaves its post and hunts
        const hunting = e._props && e._props.huntWhen && game.hasFlag(e._props.huntWhen) && e.faction !== 'dormant';
        if (hunting && F && !F.dead) {
          e.aggro = true;
          if (!e.seeLos || e.distP > 120) AI.chase(e, game, 1);
          else AI.strafe(e, game, 0.4);
          e.speedMul = 0.95;
          return;
        }
        const near = F && !F.dead && U.dist(F.x, F.y, m.post.x, m.post.y) < guard && e.seeLos;
        if (near) {
          e.aggro = true;
          const [lo, hi] = e.def.keep || [60, 160];
          if (e.distP > hi) AI.chase(e, game, 1);
          else if (e.distP < lo) AI.away(e, game, 0.5);
          else AI.strafe(e, game, 0.4);
          e.speedMul = 0.85;
          return;
        }
        // back to the post, and face the way it faces
        e.aggro = false;
        const d = U.dist(e.x, e.y, m.post.x, m.post.y);
        if (d > 6) {
          AI.goTo(e, game, m.post.x, m.post.y, 1, 30);
          e.speedMul = 0.7;
        } else {
          e.speedMul = 0;
          e.facing += U.angDiff(e.facing, F && e.pSee && e.pDist < 420 ? Math.atan2(F.y - e.y, F.x - e.x) : m.face) * Math.min(1, dt * 2);
        }
      },
    },
  };

  // ------------------------------------------------------------ drawing
  function concierge(g, e, t) {
    const atk = e.atk;
    if (atk && atk.def.type === 'blink' && !atk.moved) g.globalAlpha *= Math.max(0.15, 1 - atk.fade);
    g.rotate(e.facing);
    // tails, a tailcoat, a white front
    g.fillStyle = '#0c0c0e';
    g.beginPath();
    g.moveTo(-9, -5);
    g.lineTo(-14, -3);
    g.lineTo(-14, 3);
    g.lineTo(-9, 5);
    g.fill();
    G.roundRect(g, -8, -8, 13, 16, 5);
    g.fill();
    g.fillStyle = '#efe8da';
    g.beginPath();
    g.moveTo(-2, -3);
    g.lineTo(4, 0);
    g.lineTo(-2, 3);
    g.fill();
    // white gloves; a silver tray on the left hand
    g.fillStyle = '#efe8da';
    g.beginPath();
    g.arc(4, 7.5, 2, 0, U.TAU);
    g.fill();
    g.fillStyle = '#c8ccd0';
    g.beginPath();
    g.ellipse(5, -9, 6, 4, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.beginPath();
    g.ellipse(4, -10, 3, 1.4, 0, 0, U.TAU);
    g.fill();
    // the porcelain head, the painted face
    g.fillStyle = '#f4efe6';
    g.beginPath();
    g.arc(0.5, 0, 4.4, 0, U.TAU);
    g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath();
    g.arc(-0.8, 0, 4.6, Math.PI * 0.55, Math.PI * 1.45);
    g.fill();
  }
  function chef(g, e, t) {
    g.rotate(e.facing);
    // four arms, each with a blade, chopping
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1, k = i % 2;
      const chop = Math.sin(t * 14 + i * 1.6) * (e.aggro ? 0.5 : 0.1);
      const a = side * (0.6 + k * 0.7) + chop;
      const ex = Math.cos(a) * 12, ey = Math.sin(a) * 12;
      g.strokeStyle = '#8a9096';
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(ex, ey);
      g.stroke();
      g.fillStyle = '#e8ecee';
      g.save();
      g.translate(ex, ey);
      g.rotate(a);
      g.fillRect(0, -1.2, 7, 2.4);
      g.restore();
    }
    // a chrome drum of a body, an apron, a toque
    const grd = g.createLinearGradient(-8, -8, 8, 8);
    grd.addColorStop(0, '#e8ecee');
    grd.addColorStop(1, '#6a7076');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, 8, 0, U.TAU);
    g.fill();
    g.fillStyle = '#f2f2ee';
    g.beginPath();
    g.arc(-1, 0, 5.6, 0, U.TAU);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * U.TAU;
      g.beginPath();
      g.arc(-1 + Math.cos(a) * 4, Math.sin(a) * 4, 1.4, 0, U.TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(120,10,14,0.5)';
    g.beginPath();
    g.ellipse(5, 2, 2, 3, 0.4, 0, U.TAU);
    g.fill();
  }
  function kitchenArm(g, e, t) {
    g.fillStyle = '#3a3d40';
    g.beginPath();
    g.arc(0, 0, 7, 0, U.TAU);
    g.fill();
    g.fillStyle = '#8a9096';
    g.beginPath();
    g.arc(0, 0, 5, 0, U.TAU);
    g.fill();
    const a = e.atk;
    const reach = a && a.def.type === 'melee' ? (a.t < (a.def.windup || 0.4) ? 0.4 - (a.t / (a.def.windup || 0.4)) * 0.3 : 1) : e.aggro ? 0.55 : 0.3;
    g.rotate(e.facing);
    const l1 = 10 + reach * 8, l2 = 8 + reach * 12, bend = (1 - reach) * 1.1;
    g.strokeStyle = '#d8dce0';
    g.lineCap = 'round';
    g.lineWidth = 3.4;
    g.beginPath();
    g.moveTo(0, 0);
    const jx = Math.cos(-bend) * l1, jy = Math.sin(-bend) * l1;
    g.lineTo(jx, jy);
    const tx = jx + Math.cos(bend * 0.8) * l2, ty = jy + Math.sin(bend * 0.8) * l2;
    g.lineTo(tx, ty);
    g.stroke();
    g.lineCap = 'butt';
    // a cleaver
    g.save();
    g.translate(tx, ty);
    g.rotate(bend * 0.8);
    g.fillStyle = '#e8ecee';
    g.fillRect(0, -4, 7, 6);
    g.fillStyle = '#2a170e';
    g.fillRect(-3, -1, 3, 2);
    g.restore();
  }
  function praetorian(g, e, t) {
    g.rotate(e.facing);
    // a cloak of black, gold edging
    g.fillStyle = '#0a0a0a';
    g.beginPath();
    g.ellipse(-3, 0, 9, 11, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = U.rgba(X.amber, 0.8);
    g.lineWidth = 0.8;
    g.beginPath();
    g.ellipse(-3, 0, 9, 11, 0, 0.9, U.TAU - 0.9);
    g.stroke();
    // the body: gold and black plate
    g.fillStyle = '#1a1814';
    G.roundRect(g, -7, -8, 13, 16, 5);
    g.fill();
    g.fillStyle = '#c9a046';
    G.roundRect(g, -5, -6, 9, 12, 3);
    g.fill();
    g.fillStyle = '#8a6a2a';
    g.fillRect(-5, -0.6, 9, 1.2);
    // a baton in the right hand
    g.fillStyle = '#2a2a2a';
    g.fillRect(2, 8, 12, 2);
    // the helm, the visor slit
    g.fillStyle = '#e0c060';
    g.beginPath();
    g.arc(0, 0, 4.4, 0, U.TAU);
    g.fill();
    g.fillStyle = '#121212';
    g.fillRect(2.6, -2.4, 1.4, 4.8);
    // the mirror shield, tall, in front
    const grd = g.createLinearGradient(9, -12, 13, 12);
    grd.addColorStop(0, '#f8f4e8');
    grd.addColorStop(0.4, '#a8acb0');
    grd.addColorStop(0.6, '#e8ecf0');
    grd.addColorStop(1, '#6a6e72');
    g.fillStyle = '#3a3020';
    G.roundRect(g, 8, -13, 5, 26, 2);
    g.fill();
    g.fillStyle = grd;
    G.roundRect(g, 8.6, -12.2, 3.8, 24.4, 1.6);
    g.fill();
  }
  function boardTurret(g, e) {
    g.fillStyle = '#0c0c0c';
    g.beginPath();
    g.arc(0, 0, 13, 0, U.TAU);
    g.fill();
    g.strokeStyle = U.rgba(X.amber, 0.8);
    g.lineWidth = 1;
    g.beginPath();
    g.arc(0, 0, 12, 0, U.TAU);
    g.stroke();
    g.rotate(e.facing);
    g.fillStyle = '#2a2c30';
    G.roundRect(g, -7, -7, 14, 14, 4);
    g.fill();
    g.fillStyle = '#121212';
    g.fillRect(4, -4, 16, 2.6);
    g.fillRect(4, 1.4, 16, 2.6);
    g.fillStyle = '#5a5e62';
    g.fillRect(4, -4, 4, 8);
  }

  const enemies = {
    'ds-concierge': {
      name: 'Concierge', hp: 130, speed: 122, radius: 9, armor: 0.15, mass: 1.6, accel: 10, turn: 9, ai: 'skirmisher', keep: [70, 200],
      sight: 300, leash: 1300, robot: true, color: '#0c0c0e', blood: '#26221e', gib: '#f4efe6', deathGlow: '#ffb050', deathSound: 'explode',
      attacks: [
        { type: 'blink', minRange: 110, maxRange: 400, windup: 0.35, delay: 0.25, damage: 14, distance: 46, behind: false, color: '#f4efe6', cooldown: 3.6, sound: 'conciergeChime', arriveSound: 'conciergeChime' },
        { type: 'ranged', projectile: 'ds-knife', damage: 7, speed: 360, burst: 3, burstGap: 0.06, fan: 0.42, windup: 0.4, cooldown: 2.1, range: 380, spread: 0.04, lead: 0.4, flash: '#f2ece2' },
        { type: 'melee', damage: 12, range: 14, windup: 0.25, recover: 0.3, cooldown: 0.9, knock: 120 },
      ],
      drops: { gold: [10, 30], goldChance: 1, items: [{ id: 'ammo-rounds', chance: 0.4 }, { id: 'ds-medgel', chance: 0.2 }] },
      update(e, dt, game) {
        if (DS.robotSenses) DS.robotSenses(e, game);
        // it says its piece first, when you come near: then it serves
        const p = e._props || {};
        if (p.greet && !e.mem.greeted && game.player && e.pSee && e.pDist < (p.greetRange || 230)) {
          e.mem.greeted = true;
          if (LM.comms) LM.comms.say({ who: 'concierge', text: p.greet });
          if (p.greetFlag) game.setFlag(p.greetFlag);
          e.globalCd = Math.max(e.globalCd, 3.2);
          e.aggro = true;
          e.knowsP = true;
        }
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 10, { type: 'chunk', color: '#f4efe6', speed: 130, life: 0.7, size: 1.4, vz: 80, z: 2 });
        game.particles.burst(e.x, e.y, 10, { type: 'spark', color: '#ffd27a', speed: 200, life: 0.4 });
        if (e._props && e._props.flag && !game.hasFlag(e._props.flag)) game.setFlag(e._props.flag);
      },
      draw: concierge,
      drawGlow(g, e, t) {
        const c = visor(e);
        for (const s of [-1, 1]) G.glow(g, e.x + Math.cos(e.facing) * 3 + Math.cos(e.facing + Math.PI / 2) * 1.6 * s, e.y + Math.sin(e.facing) * 3 + Math.sin(e.facing + Math.PI / 2) * 1.6 * s, 4, c, e.aggro ? 0.9 : 0.4);
      },
    },
    'ds-chef': {
      name: 'Chef', hp: 150, speed: 104, radius: 10, armor: 0.2, mass: 2.4, accel: 9, turn: 7, ai: 'chaser', sight: 280, leash: 1100,
      robot: true, color: '#c8ccd0', blood: '#26221e', gib: '#8a9096', deathGlow: '#ffb050', deathSound: 'explode',
      attacks: [
        { type: 'melee', damage: 9, range: 16, windup: 0.18, recover: 0.18, cooldown: 0.45, knock: 70 },
        { type: 'ranged', projectile: 'ds-flame', damage: 4, speed: 250, burst: 9, burstGap: 0.045, windup: 0.5, cooldown: 3.2, range: 170, minRange: 40, spread: 0.18, lead: 0.2, moveWhileFiring: 0.2, flash: '#ff8a3a', status: 'burning' },
      ],
      drops: { items: [{ id: 'ammo-fuel', chance: 0.5 }, { id: 'ds-medgel', chance: 0.15 }] },
      update(e, dt, game) {
        if (DS.robotSenses) DS.robotSenses(e, game);
        if (DS.hearShots) DS.hearShots(e, game, 360);
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 12, { type: 'spark', color: '#ffd27a', speed: 200, life: 0.4 });
      },
      draw: chef,
      drawGlow(g, e) {
        G.glow(g, e.x + Math.cos(e.facing) * 5, e.y + Math.sin(e.facing) * 5, 5, visor(e), e.aggro ? 0.85 : 0.35);
      },
    },
    'ds-kitchen-arm': {
      name: 'Kitchen arm', hp: 70, speed: 0, radius: 9, armor: 0.2, mass: 99, stationary: true, ai: 'turret', sight: 120, leash: 2000, turn: 6, robot: true,
      color: '#c9d0d5', blood: '#26221e', gib: '#9aa1a8', deathGlow: '#ffb050', noShadow: true,
      attacks: [{ type: 'melee', damage: 13, range: 30, windup: 0.4, recover: 0.3, cooldown: 1.0, knock: 170 }],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.15 }] },
      update(e, dt, game) {
        if (e.aggro && e.distP > 240) e.mem.bored = (e.mem.bored || 0) + dt;
        else e.mem.bored = 0;
        if (e.mem.bored > 2.5) e.aggro = false;
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 10, { type: 'spark', color: '#ffd27a', speed: 190, life: 0.4 });
      },
      draw: kitchenArm,
      drawGlow(g, e) {
        G.glow(g, e.x, e.y, 6, visor(e), e.aggro ? 0.8 : 0.3);
      },
    },
    'ds-praetorian': {
      name: 'Praetorian', hp: 2400, speed: 92, radius: 12, armor: 0.7, mass: 9, accel: 8, turn: 3.2, ai: 'ds-sentry', guard: 230, keep: [50, 140],
      sight: 380, leash: 99999, robot: true, color: '#c9a046', blood: '#26221e', gib: '#c9a046', deathGlow: '#ffd28a', deathSound: 'explode', pullImmune: true,
      resist: { burning: 0.8, chilled: 0.8, staggered: 1, held: 1 },
      // the mirror: your shots come back, at you
      reflect: { arc: 1.35, aim: true, damage: 1.25, speed: 1.1, color: '#ffe0a0' },
      attacks: [
        { type: 'charge', damage: 30, speed: 420, duration: 0.4, windup: 0.5, cooldown: 2.6, minRange: 50, maxRange: 200, stun: 0.4 },
        { type: 'ranged', projectile: 'enemy-slug', damage: 16, speed: 470, burst: 2, burstGap: 0.12, windup: 0.45, cooldown: 1.6, range: 340, spread: 0.03, lead: 0.5, flash: '#ffd28a' },
        { type: 'melee', damage: 24, range: 18, windup: 0.3, recover: 0.35, cooldown: 1.0, knock: 260 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }] },
      update(e, dt, game) {
        // it mends whatever gets through, if you give it a moment
        e.mem.calm = e.flash > 0 ? 0 : (e.mem.calm || 0) + dt;
        if (e.mem.calm > 2.5 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + 60 * dt);
        if (!game.hasFlag('sawPraetorian') && e.pSee && e.pDist < 380) game.setFlag('sawPraetorian');
      },
      onReflect(e, game) {
        if (!game.hasFlag('praetorianReflected')) game.setFlag('praetorianReflected');
      },
      draw: praetorian,
      drawGlow(g, e, t) {
        G.glow(g, e.x + Math.cos(e.facing) * 3, e.y + Math.sin(e.facing) * 3, 6, visor(e), e.aggro ? 0.9 : 0.5);
        // the shield catches the light
        const sx = e.x + Math.cos(e.facing) * 10.5, sy = e.y + Math.sin(e.facing) * 10.5;
        G.glow(g, sx, sy, 12, '#fff2c8', 0.18 + 0.08 * Math.sin(t * 2 + e.home.x));
      },
    },
    'ds-board-turret': {
      name: 'Rail gun', hp: 420, speed: 0, radius: 12, armor: 0.55, mass: 99, stationary: true, flying: true, ai: 'turret', sight: 330, leash: 2000, turn: 5, robot: true,
      color: '#2a2c30', blood: '#ffb050', gib: '#55585f', deathGlow: '#ffb050', deathSound: 'explode', pullImmune: true,
      attacks: [{ type: 'ranged', projectile: 'enemy-slug', damage: 13, speed: 560, burst: 8, burstGap: 0.06, windup: 0.75, cooldown: 1.7, range: 380, spread: 0.07, lead: 0.55, moveWhileFiring: 0, flash: '#ff6a3a' }],
      update(e, dt, game) {
        // it forgets you the moment you're out of the approach
        if (e.aggro && e.distP > 360) e.aggro = false;
      },
      onDeath(e, game) {
        LM.combat.explode(game, e.x, e.y, { radius: 40, damage: 16, owner: 'enemy', silent: true });
      },
      draw: boardTurret,
      drawGlow(g, e, t) {
        G.glow(g, e.x + Math.cos(e.facing) * 4, e.y + Math.sin(e.facing) * 4, 7, visor(e), e.aggro ? 0.95 : 0.35);
        const a = e.atk, P = LM.game && AI.foe(e, LM.game);
        if (a && a.def.type === 'ranged' && a.t < (a.def.windup || 0.5) && P) {
          g.strokeStyle = 'rgba(255,58,42,' + (0.3 + 0.6 * (a.t / a.def.windup)) + ')';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(e.x + Math.cos(e.facing) * 18, e.y + Math.sin(e.facing) * 18);
          g.lineTo(P.x, P.y);
          g.stroke();
        }
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('conciergeChime', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 1318, dur: 0.18, gain: 0.05 });
      kit.tone(t + 0.12, o, { type: 'sine', f0: 1046, dur: 0.24, gain: 0.05 });
    });
  }

  // the board's staff are robots: on the robots' side (as ds-robots does for its own)
  for (const d of Object.values(enemies)) if (d.robot && !d.faction) d.faction = 'robot';

  LM.definePack({ id: 'ds-executive', behaviors, enemies });
})();
