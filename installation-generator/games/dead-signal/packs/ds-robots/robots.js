/* Dead Signal — packs/ds-robots/robots.js
 * Asterion's robots in defence mode (DESIGN.md section 5.1): red visors, and they go for anything
 * that moves. Floor 1's security robots:
 *
 *   ds-sentinel        the backbone: walks a patrol route, sees in a cone ahead of it (and hears
 *                      gunshots nearby), fires three-round bursts after a red aiming laser
 *   ds-warden-drone    a flying drone with a searchlight: anything in its beam alerts every robot near it
 *   ds-ceiling-turret  a dome in the ceiling: blind until an alarm wakes it
 *   ds-sweeper         a cleaning robot gone berserk: rams you, brushes spinning
 *   ds-scalpel-drone   small blade drones that come in threes
 *
 * Floor 2's lab assistants (the synthid labs' own robots, in the same defence mode):
 *   ds-labmate         the common one: rolls about on a route, a screen for a face; a sedative syringe
 *                      (slows you) up close and sample vials lobbed from further off. props.docked: it
 *                      stands on its charging dock, listening, until something wakes it
 *   ds-courier         a fast little sample cart, in pairs: it rams you, and its beeping calls every
 *                      robot nearby when it spots you
 *   ds-bench-arm       a robot arm bolted to a lab bench: it sweeps at anything within reach
 *   ds-sterilizer      a slow cart with a UV lamp on a mast: the lamp turns after you, and its violet
 *                      beam burns (stay out of it, or get behind it)
 *   ds-docent          DOCENT-3, the Discovery Center's tour guide: hovers, talks, fires a fan of bolts
 *                      and calls in Couriers ("meet our helpers"). A named bar while you fight it.
 *
 * Behaviour `patrol`: walks between the tiles tagged with the enemy's props.route (a loop, ordered
 * around its middle; two tiles is back and forth), pausing at each (props.pause, seconds) and
 * looking about. Once it notices you it fights with props.then (default the def's `then`, else
 * skirmisher), and goes back to its route when it gives up.
 *
 * Robot vision (any enemy with `view: { range, cone }`): it notices you only ahead of it, inside the
 * cone, or right beside it (its `sight`), and it hears gunshots within `hear` units.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;
  const DS = (LM.DS = LM.DS || {});
  const RED = '#ff3a2a', GREEN = '#5fe08a';
  /** The visor colour: red in defence mode; green once a robot is on your side (faction 'ally', later). */
  const visor = (e) => (e.faction === 'ally' ? GREEN : RED);

  // ------------------------------------------------------------ vision and hearing
  DS.robotSenses = function (e, game) {
    const P = game.player, v = e.def.view;
    if (e.aggro || !P || P.dead || !v) return;
    // a robot on its charging dock only listens
    const docked = e._props && e._props.docked;
    if (!docked && e.seeLos && e.distP < (v.range || 320)) {
      const a = Math.atan2(P.y - e.y, P.x - e.x);
      if (Math.abs(U.angDiff(e.facing, a)) < (v.cone || 1)) return e.alert(game, true);
    }
    const shots = game.stats.shots;
    if (e.mem.shots != null && shots !== e.mem.shots && e.distP < (e.def.hear || 300)) e.alert(game, true);
    e.mem.shots = shots;
  };

  // ------------------------------------------------------------ patrol
  function routeOf(e, game) {
    const L = game.level, tag = (e._props && e._props.route) || e.def.route;
    if (!tag) return null;
    L._routes = L._routes || {};
    if (L._routes[tag] !== undefined) return L._routes[tag];
    const tiles = L.tags[tag] || [];
    if (!tiles.length) return (L._routes[tag] = null);
    const pts = tiles.map((p) => ({ x: p.x * T + T / 2, y: p.y * T + T / 2 }));
    if (pts.length > 2) {
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
    }
    return (L._routes[tag] = pts);
  }
  const behaviors = {
    patrol: {
      update(e, dt, game) {
        const then = (e._props && e._props.then) || e.def.then || 'skirmisher';
        if (e.aggro) {
          e.mem.wp = null;
          return LM.get('behaviors', then).update(e, dt, game);
        }
        // props.docked (on a charging dock) or props.hold: stand still until something wakes it
        if (e._props && (e._props.docked || e._props.hold)) {
          e.speedMul = 0;
          return;
        }
        const pts = routeOf(e, game);
        if (!pts) {
          AI.wander(e, game, 0.3);
          e.speedMul = 0.4;
          return;
        }
        if (e.mem.wp == null) {
          let best = 0, bd = Infinity;
          pts.forEach((p, i) => {
            const d = U.dist(e.x, e.y, p.x, p.y);
            if (d < bd) { bd = d; best = i; }
          });
          e.mem.wp = best;
          e.mem.dirn = 1;
          e.mem.stuck = 0;
        }
        if (e.mem.pause > 0) {
          e.mem.pause -= dt;
          // look about while it waits
          e.facing += Math.sin(game.time * 1.6 + e.home.x) * dt * 1.4;
          e.speedMul = 0;
          return;
        }
        const p = pts[e.mem.wp];
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
        if (d < 10) {
          e.mem.pause = (e._props && e._props.pause != null ? +e._props.pause : e.def.pause != null ? e.def.pause : 0.9) * U.rand(0.8, 1.2);
          if (pts.length === 2) e.mem.wp = 1 - e.mem.wp;
          else e.mem.wp = (e.mem.wp + 1) % pts.length;
          return;
        }
        // something in the way for a while: give up on this point
        e.mem.stuck = e.hitWall ? (e.mem.stuck || 0) + dt : 0;
        if (e.mem.stuck > 1.2) {
          e.mem.stuck = 0;
          e.mem.wp = (e.mem.wp + 1) % pts.length;
        }
        e.mx += dx / d;
        e.my += dy / d;
        e.speedMul = e.def.patrolSpeed || 0.55;
      },
    },
  };

  // ------------------------------------------------------------ the Sterilizer
  // closes to a working distance and holds it; its lamp (e.mem.lamp) turns after you at its own pace
  behaviors['ds-sterilize'] = {
    update(e, dt, game) {
      if (!e.aggro) return LM.get('behaviors', 'patrol').update(e, dt, game);
      const want = e.def.workRange || 115;
      if (!e.seeLos || e.distP > want + 30) AI.chase(e, game, 1);
      else if (e.distP < want - 40) AI.away(e, game, 0.8);
      else AI.strafe(e, game, 0.25);
      e.speedMul = 0.85;
    },
  };
  /** Turn a robot's lamp toward the player at `rate` radians a second; returns whether the player is in its beam. */
  DS.lampTrack = function (e, game, dt, rate, range, cone) {
    const P = game.player;
    if (e.mem.lamp == null) e.mem.lamp = e.facing;
    if (!P || P.dead) return false;
    if (e.aggro) {
      const a = Math.atan2(P.y - e.y, P.x - e.x);
      const d = U.angDiff(e.mem.lamp, a);
      e.mem.lamp += U.clamp(d, -rate * dt, rate * dt);
    } else e.mem.lamp += U.angDiff(e.mem.lamp, e.facing) * Math.min(1, dt * 3);
    if (!e.aggro || e.distP > range || !e.seeLos) return false;
    return Math.abs(U.angDiff(e.mem.lamp, Math.atan2(P.y - e.y, P.x - e.x))) < cone;
  };

  // ------------------------------------------------------------ the Docent's tour
  const DOCENT = {
    hello: 'Welcome to the Synthid Discovery Center! I’m your guide. Please stay with your group.',
    lines: [
      'Synthids are smaller than a red blood cell, and smarter than a thermostat!',
      'Intruder. Please remain with your group.',
      'Our synthids clean the oceans, eat our waste, and breathe for us. Isn’t that wonderful?',
      'Please do not touch the exhibits. Please do not touch the exhibits. Please do not',
      'Fun fact! A litre of synthid stock holds more workers than there are people on Earth.',
      'Visitors who leave the tour will be collected.',
    ],
    summon: 'Let’s meet some of our helpers!',
    low: 'This concludes— this concludes the— please exit through the gift shop.',
    end: 'Tour concluded. Thank you for visiting Asterion.',
  };
  const docentSay = (text) => LM.comms && LM.comms.say({ who: 'docent', text, seconds: 2.6 });

  // ------------------------------------------------------------ drawing helpers
  const legs = (g, e, spread, len, col) => {
    const step = Math.hypot(e.vx, e.vy) > 6 ? Math.sin(e.t * 11) * len * 0.5 : 0;
    g.fillStyle = col;
    G.roundRect(g, -3 + step, -spread - 2, 7, 4, 1.5);
    g.fill();
    G.roundRect(g, -3 - step, spread - 2, 7, 4, 1.5);
    g.fill();
  };
  const muzzle = (e, d) => ({ x: e.x + Math.cos(e.facing) * d - Math.sin(e.facing) * 5, y: e.y + Math.sin(e.facing) * d + Math.cos(e.facing) * 5 });

  const enemies = {
    'ds-sentinel': {
      name: 'Sentinel MK-IV', hp: 55, speed: 82, radius: 11, armor: 0.2, mass: 2.2, ai: 'patrol', then: 'skirmisher', keep: [150, 290],
      sight: 70, view: { range: 340, cone: 1.05 }, hear: 320, leash: 1100, turn: 6, robot: true, color: '#4a5058',
      blood: '#26221e', gib: '#5a6168', deathGlow: '#ffb050', deathSound: 'explode', pause: 1.1, patrolSpeed: 0.5,
      attacks: [{ type: 'ranged', projectile: 'enemy-slug', damage: 7, speed: 430, burst: 3, burstGap: 0.11, windup: 0.5, cooldown: 2.0, range: 430, spread: 0.05, lead: 0.4, moveWhileFiring: 0.15, flash: '#ff6a3a' }],
      drops: { gold: [0, 0], goldChance: 0, items: [{ id: 'ammo-rounds', chance: 0.3 }, { id: 'ammo-shells', chance: 0.12 }, { id: 'ds-medgel', chance: 0.06 }] },
      update(e, dt, game) {
        DS.robotSenses(e, game);
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 14, { type: 'spark', color: '#ffd27a', speed: 220, life: 0.45 });
      },
      draw(g, e, t) {
        g.rotate(e.facing);
        legs(g, e, 6, 5, '#25282c');
        // torso and shoulder plates
        g.fillStyle = '#25282c';
        G.roundRect(g, -8, -10, 14, 20, 4);
        g.fill();
        g.fillStyle = '#4a5058';
        G.roundRect(g, -7, -9, 12, 18, 3.5);
        g.fill();
        g.fillStyle = '#6a727b';
        G.roundRect(g, -6, -10.5, 8, 5, 2);
        g.fill();
        G.roundRect(g, -6, 5.5, 8, 5, 2);
        g.fill();
        // gun arm
        g.fillStyle = '#1e2125';
        g.fillRect(2, 4, 13, 3.4);
        g.fillStyle = '#3a3f45';
        g.fillRect(2, 3.4, 6, 4.6);
        // head
        g.fillStyle = '#2f3439';
        g.beginPath();
        g.arc(1, 0, 4.8, 0, U.TAU);
        g.fill();
        g.fillStyle = '#121417';
        g.fillRect(3.2, -3, 2, 6);
      },
      drawGlow(g, e, t) {
        const c = visor(e);
        const vx = e.x + Math.cos(e.facing) * 4.4, vy = e.y + Math.sin(e.facing) * 4.4;
        G.glow(g, vx, vy, 7, c, e.aggro ? 0.95 : 0.55);
        // the aiming laser while it winds up
        const a = e.atk;
        if (a && a.def.type === 'ranged' && a.t < (a.def.windup || 0.4) && LM.game && LM.game.player) {
          const P = LM.game.player, m = muzzle(e, 15);
          g.strokeStyle = 'rgba(255,58,42,' + (0.25 + 0.5 * (a.t / (a.def.windup || 0.4))) + ')';
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(m.x, m.y);
          g.lineTo(P.x, P.y);
          g.stroke();
        }
      },
    },

    'ds-warden-drone': {
      name: 'Warden Drone', hp: 28, speed: 140, radius: 9, flying: true, ai: 'patrol', then: 'skirmisher', keep: [170, 300], mass: 0.8,
      sight: 60, view: { range: 250, cone: 0.34 }, hear: 260, leash: 1100, turn: 5, robot: true, color: '#3a3f45',
      blood: '#26221e', gib: '#5a6168', deathGlow: '#ffb050', pause: 0.6, patrolSpeed: 0.45,
      attacks: [{ type: 'ranged', projectile: 'enemy-bolt', damage: 10, speed: 360, burst: 1, windup: 0.35, cooldown: 1.5, range: 380, spread: 0.04, lead: 0.5, flash: '#ff5a3a' }],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.25 }] },
      update(e, dt, game) {
        const was = e.aggro;
        // the searchlight sweeps while it patrols
        if (!e.aggro) e.facing += Math.sin(game.time * 0.9 + e.home.y) * dt * 0.8;
        DS.robotSenses(e, game);
        // caught in the beam: every robot nearby knows
        if (e.aggro && !was) for (const o of game.enemies) if (!o.dead && o !== e && o.def.robot && U.dist(o.x, o.y, e.x, e.y) < 420) o.alert(game, false);
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 12, { type: 'spark', color: '#ffd27a', speed: 200, life: 0.4 });
      },
      draw(g, e, t) {
        g.rotate(e.facing);
        // four rotors
        for (const [rx, ry] of [[-6, -6], [-6, 6], [6, -6], [6, 6]]) {
          g.fillStyle = 'rgba(30,32,36,0.9)';
          g.beginPath();
          g.arc(rx, ry, 4.4, 0, U.TAU);
          g.fill();
          g.strokeStyle = 'rgba(200,210,220,0.35)';
          g.lineWidth = 0.6;
          g.beginPath();
          const a = t * 40 + rx;
          g.moveTo(rx + Math.cos(a) * 4, ry + Math.sin(a) * 4);
          g.lineTo(rx - Math.cos(a) * 4, ry - Math.sin(a) * 4);
          g.stroke();
        }
        g.strokeStyle = '#2a2d31';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-6, -6); g.lineTo(6, 6);
        g.moveTo(-6, 6); g.lineTo(6, -6);
        g.stroke();
        g.fillStyle = '#3a3f45';
        g.beginPath();
        g.arc(0, 0, 5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c9ced4';
        g.fillRect(3, -2, 3.5, 4);
      },
      drawGlow(g, e, t) {
        const c = visor(e);
        const lx = e.x + Math.cos(e.facing) * 6, ly = e.y + Math.sin(e.facing) * 6;
        G.glow(g, lx, ly, 6, c, 0.8);
        if (e.aggro) return;
        // the searchlight
        const v = e.def.view, R = v.range;
        g.save();
        g.translate(lx, ly);
        g.rotate(e.facing);
        const grd = g.createRadialGradient(0, 0, 0, 0, 0, R);
        grd.addColorStop(0, 'rgba(255,248,225,0.28)');
        grd.addColorStop(1, 'rgba(255,248,225,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, R, -v.cone, v.cone);
        g.closePath();
        g.fill();
        g.restore();
      },
    },

    'ds-ceiling-turret': {
      name: 'Ceiling Turret', hp: 75, speed: 0, radius: 10, armor: 0.3, mass: 99, stationary: true, flying: true, ai: 'turret', sight: 150, leash: 2000, turn: 4, robot: true,
      color: '#3a3f45', blood: '#ffb050', gib: '#55585f', deathGlow: '#ffb050', deathSound: 'explode',
      attacks: [{ type: 'ranged', projectile: 'enemy-bolt', damage: 9, speed: 320, burst: 5, burstGap: 0.09, windup: 0.6, cooldown: 2.4, range: 470, spread: 0.12, lead: 0.3, moveWhileFiring: 0, flash: '#ff5a3a' }],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.4 }] },
      onDeath(e, game) {
        LM.combat.explode(game, e.x, e.y, { radius: 36, damage: 14, owner: 'enemy', silent: true });
      },
      draw(g, e) {
        g.fillStyle = '#1a1c1f';
        g.beginPath();
        g.arc(0, 0, 11, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2f3439';
        g.beginPath();
        g.arc(0, 0, 9, 0, U.TAU);
        g.fill();
        g.rotate(e.facing);
        g.fillStyle = 'rgba(20,24,28,0.85)';
        g.beginPath();
        g.arc(0, 0, 6.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#121417';
        g.fillRect(3, -1.6, 10, 1.4);
        g.fillRect(3, 0.4, 10, 1.4);
      },
      drawGlow(g, e) {
        G.glow(g, e.x + Math.cos(e.facing) * 3, e.y + Math.sin(e.facing) * 3, 7, visor(e), e.aggro ? 0.9 : 0.25);
      },
    },

    'ds-sweeper': {
      name: 'Sweeper', hp: 45, speed: 96, radius: 11, mass: 2, ai: 'chaser', sight: 230, leash: 900, turn: 5, robot: true, color: '#c9ced4',
      blood: '#26221e', gib: '#9aa1a8', deathGlow: '#ffb050',
      attacks: [
        { type: 'charge', damage: 12, speed: 330, duration: 0.6, windup: 0.5, cooldown: 2.6, minRange: 50, maxRange: 230, stun: 0.3 },
        { type: 'melee', damage: 6, range: 12, windup: 0.25, recover: 0.3, cooldown: 0.9, knock: 160 },
      ],
      drops: { items: [{ id: 'ammo-shells', chance: 0.3 }] },
      update(e, dt, game) {
        e.mem.spin = (e.mem.spin || 0) + dt * (e.aggro ? 26 : 9);
      },
      draw(g, e, t) {
        g.rotate(e.facing);
        // side brushes, spinning
        for (const s of [-1, 1]) {
          g.save();
          g.translate(7, s * 7);
          g.rotate((e.mem.spin || 0) * s);
          g.strokeStyle = 'rgba(40,40,40,0.8)';
          g.lineWidth = 0.7;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * U.TAU;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
            g.stroke();
          }
          g.restore();
        }
        g.fillStyle = '#7a8188';
        g.beginPath();
        g.arc(0, 0, 11, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c9ced4';
        g.beginPath();
        g.arc(-0.5, 0, 9.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a2d31';
        g.beginPath();
        g.arc(0, 0, 11, -0.9, 0.9);
        g.arc(0, 0, 8.6, 0.9, -0.9, true);
        g.closePath();
        g.fill();
        g.fillStyle = '#9aa1a8';
        g.beginPath();
        g.arc(-2, 0, 3.5, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e) {
        G.glow(g, e.x - Math.cos(e.facing) * 2, e.y - Math.sin(e.facing) * 2, 5, e.aggro ? RED : '#5fb8ff', 0.7);
      },
    },

    'ds-scalpel-drone': {
      name: 'Scalpel Drone', hp: 14, speed: 175, radius: 8, armor: 0, mass: 0.6, accel: 11, turn: 12, ai: 'swarmer', sight: 330, leash: 800, flying: true, robot: true,
      color: '#9aa1a8', blood: '#26221e', gib: '#9aa1a8', deathGlow: '#9fe8ff',
      attacks: [
        { type: 'charge', damage: 5, speed: 330, duration: 0.3, windup: 0.3, cooldown: 2.5, minRange: 60, maxRange: 180, stun: 0 },
        { type: 'melee', damage: 6, range: 13, windup: 0.22, recover: 0.2, cooldown: 0.55, knock: 40 },
      ],
      drops: { gold: [0, 0], goldChance: 0, items: [{ id: 'ammo-rounds', chance: 0.08 }, { id: 'ds-medgel', chance: 0.04 }] },
      draw(g, e, t) {
        g.rotate(e.facing);
        // the blade
        g.fillStyle = '#e8ecef';
        g.beginPath();
        g.moveTo(16, 0);
        g.lineTo(5, -1.6);
        g.lineTo(5, 1.6);
        g.closePath();
        g.fill();
        // a delta body with two pods
        g.fillStyle = '#2a2d31';
        g.beginPath();
        g.moveTo(6, 0);
        g.lineTo(-6, -7);
        g.lineTo(-3, 0);
        g.lineTo(-6, 7);
        g.closePath();
        g.fill();
        g.fillStyle = '#6a727b';
        g.beginPath();
        g.arc(-1, 0, 3.2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e, t) {
        const bx = e.x - Math.cos(e.facing) * 5, by = e.y - Math.sin(e.facing) * 5;
        G.glow(g, bx, by, 7, '#9fe8ff', 0.4 + 0.2 * Math.sin(t * 30));
        G.glow(g, e.x + Math.cos(e.facing) * 1, e.y + Math.sin(e.facing) * 1, 4, visor(e), 0.8);
      },
    },

    // ======================================================== Floor 2: the lab assistants
    'ds-labmate': {
      name: 'LabMate', hp: 40, speed: 98, radius: 10, armor: 0.1, mass: 1.6, ai: 'patrol', then: 'chaser',
      sight: 64, view: { range: 260, cone: 0.9 }, hear: 280, leash: 1100, turn: 7, robot: true, color: '#e6eaec',
      blood: '#26221e', gib: '#c9d0d5', deathGlow: '#9fe8ff', pause: 1.4, patrolSpeed: 0.5,
      attacks: [
        { type: 'melee', damage: 8, range: 13, windup: 0.32, recover: 0.3, cooldown: 1.1, knock: 60, status: 'sedated' },
        { type: 'lob', damage: 10, radius: 34, minRange: 110, maxRange: 320, windup: 0.5, cooldown: 3.4, flight: 0.85, color: '#8fe0c0' },
      ],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.2 }, { id: 'ds-medgel', chance: 0.08 }, { id: 'ammo-cryo', chance: 0.06 }] },
      update(e, dt, game) {
        DS.robotSenses(e, game);
        if (e.aggro && !e.mem.said) {
          e.mem.said = true;
          LM.audio.play('labmateChirp', { vol: game.vol(e.x, e.y) });
          game.particles.add({ type: 'text', x: e.x, y: e.y - 18, vy: -16, drag: 1, life: 1.6, text: 'PLEASE HOLD STILL', color: '#ff8a7a', size: 7 });
        }
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 10, { type: 'spark', color: '#bfe8ff', speed: 180, life: 0.4 });
      },
      draw(g, e, t) {
        g.rotate(e.facing);
        const lunge = e.atk && e.atk.lunge ? e.atk.lunge * 5 : 0;
        // wheels
        g.fillStyle = '#26292d';
        G.roundRect(g, -7, -10.5, 9, 3.4, 1.4);
        g.fill();
        G.roundRect(g, -7, 7.1, 9, 3.4, 1.4);
        g.fill();
        // arms: a syringe on the right, a gripper on the left
        g.fillStyle = '#9aa4ab';
        g.fillRect(2, 5.5, 8 + lunge, 2);
        g.fillStyle = '#e8ecee';
        g.fillRect(9 + lunge, 5, 5, 3);
        g.fillStyle = '#d8e8f0';
        g.fillRect(14 + lunge, 6, 4, 1);
        g.fillStyle = '#9aa4ab';
        g.fillRect(2, -7.5, 8, 2);
        g.fillStyle = '#5a646c';
        g.fillRect(10, -8.5, 2, 1.4);
        g.fillRect(10, -5.6, 2, 1.4);
        // body: a white shell with a teal stripe
        g.fillStyle = '#7d878f';
        G.roundRect(g, -9, -8.5, 16, 17, 5);
        g.fill();
        g.fillStyle = '#e8ecee';
        G.roundRect(g, -8, -7.5, 14, 15, 4.5);
        g.fill();
        g.fillStyle = '#5fb8c8';
        g.fillRect(-8, -1, 3, 2);
        // the screen face
        g.fillStyle = '#16303a';
        G.roundRect(g, 1, -4.5, 5, 9, 1.5);
        g.fill();
      },
      drawGlow(g, e, t) {
        // the face: a blue smile, or two red eyes
        const fx = e.x + Math.cos(e.facing) * 3.6, fy = e.y + Math.sin(e.facing) * 3.6;
        const ang = e.facing + Math.PI / 2;
        if (e.aggro) {
          for (const s of [-1, 1]) G.glow(g, fx + Math.cos(ang) * 2 * s, fy + Math.sin(ang) * 2 * s, 3.5, visor(e), 0.9);
        } else G.glow(g, fx, fy, 5, '#7fd8ff', 0.5);
      },
    },

    'ds-courier': {
      name: 'Courier', hp: 22, speed: 196, radius: 8, mass: 0.9, accel: 10, turn: 10, ai: 'swarmer', sight: 250, leash: 900, robot: true, color: '#e6eaec',
      blood: '#26221e', gib: '#c9d0d5', deathGlow: '#ffb050',
      attacks: [
        { type: 'charge', damage: 9, speed: 380, duration: 0.45, windup: 0.35, cooldown: 2.2, minRange: 40, maxRange: 210, stun: 0.5 },
        { type: 'melee', damage: 4, range: 10, windup: 0.2, recover: 0.2, cooldown: 0.7, knock: 80 },
      ],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.12 }, { id: 'ammo-cryo', chance: 0.08 }] },
      update(e, dt, game) {
        if (e.aggro && !e.mem.beeped) {
          e.mem.beeped = true;
          LM.audio.play('courierBeep', { vol: game.vol(e.x, e.y) });
          // it calls the others
          for (const o of game.enemies) if (!o.dead && o !== e && o.def.robot && U.dist(o.x, o.y, e.x, e.y) < 380) o.alert(game, false);
        }
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 8, { type: 'spark', color: '#ffd27a', speed: 170, life: 0.35 });
        // its samples
        game.particles.burst(e.x, e.y, 6, { type: 'dot', color: ['#8fd0a0', '#e0b25a', '#5fb8c8'], speed: 110, life: 0.6, size: [1, 1.8] });
      },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.fillStyle = '#26292d';
        for (const [x, y] of [[-5, -7], [4, -7], [-5, 7], [4, 7]]) {
          g.beginPath();
          g.arc(x, y, 2, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = '#7d878f';
        G.roundRect(g, -8, -6.5, 16, 13, 2.5);
        g.fill();
        g.fillStyle = '#e8ecee';
        G.roundRect(g, -7, -5.5, 14, 11, 2);
        g.fill();
        // a rack of sample tubes
        const cols = ['#8fd0a0', '#e0b25a', '#5fb8c8', '#d8907a'];
        for (let i = 0; i < 4; i++) {
          g.fillStyle = cols[i];
          g.beginPath();
          g.arc(-4 + i * 2.6, -1.6, 0.9, 0, U.TAU);
          g.arc(-4 + i * 2.6, 1.6, 0.9, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = '#2a2e33';
        g.fillRect(6, -2, 2, 4);
      },
      drawGlow(g, e, t) {
        const on = Math.sin(t * (e.aggro ? 18 : 4) + e.home.x) > 0;
        DS.led(g, e.x - Math.cos(e.facing) * 4, e.y - Math.sin(e.facing) * 4, e.aggro ? RED : '#ffb84a', on ? 0.9 : 0.25, 1);
      },
    },

    'ds-bench-arm': {
      name: 'Bench Arm', hp: 50, speed: 0, radius: 9, armor: 0.15, mass: 99, stationary: true, ai: 'turret', sight: 120, leash: 2000, turn: 5, robot: true,
      color: '#c9d0d5', blood: '#26221e', gib: '#9aa1a8', deathGlow: '#ffb050', noShadow: true,
      attacks: [{ type: 'melee', damage: 14, range: 30, windup: 0.45, recover: 0.35, cooldown: 1.2, knock: 170 }],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.15 }] },
      update(e, dt, game) {
        // it loses interest when you're out of reach for a while
        if (e.aggro && e.distP > 240) e.mem.bored = (e.mem.bored || 0) + dt;
        else e.mem.bored = 0;
        if (e.mem.bored > 2.5) e.aggro = false;
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 10, { type: 'spark', color: '#ffd27a', speed: 190, life: 0.4 });
      },
      draw(g, e, t) {
        // the base, bolted down
        g.fillStyle = '#3a4046';
        g.beginPath();
        g.arc(0, 0, 7, 0, U.TAU);
        g.fill();
        g.fillStyle = '#7d878f';
        g.beginPath();
        g.arc(0, 0, 5, 0, U.TAU);
        g.fill();
        // two segments reaching out, further while it strikes
        const a = e.atk;
        const reach = a && a.def.type === 'melee' ? (a.t < (a.def.windup || 0.4) ? 0.4 - (a.t / (a.def.windup || 0.4)) * 0.3 : 1) : e.aggro ? 0.55 : 0.3;
        g.rotate(e.facing);
        const l1 = 10 + reach * 8, l2 = 8 + reach * 12;
        const bend = (1 - reach) * 1.1;
        g.strokeStyle = '#e8ecee';
        g.lineCap = 'round';
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(0, 0);
        const jx = Math.cos(-bend) * l1, jy = Math.sin(-bend) * l1;
        g.lineTo(jx, jy);
        g.lineTo(jx + Math.cos(bend * 0.8) * l2, jy + Math.sin(bend * 0.8) * l2);
        g.stroke();
        g.lineCap = 'butt';
        g.fillStyle = '#5fb8c8';
        g.beginPath();
        g.arc(jx, jy, 2, 0, U.TAU);
        g.fill();
        // the tool: a pair of tongs
        const tx = jx + Math.cos(bend * 0.8) * l2, ty = jy + Math.sin(bend * 0.8) * l2;
        g.fillStyle = '#5a646c';
        g.fillRect(tx - 1, ty - 3, 4, 1.4);
        g.fillRect(tx - 1, ty + 1.6, 4, 1.4);
      },
      drawGlow(g, e, t) {
        G.glow(g, e.x, e.y, 6, visor(e), e.aggro ? 0.8 : 0.3);
      },
    },

    'ds-sterilizer': {
      name: 'Sterilizer', hp: 90, speed: 58, radius: 12, armor: 0.15, mass: 3, ai: 'ds-sterilize', sight: 70, view: { range: 220, cone: 0.7 }, hear: 260,
      leash: 1100, turn: 3, robot: true, color: '#c9d0d5', blood: '#26221e', gib: '#9aa1a8', deathGlow: '#c8a8ff', deathSound: 'explode',
      pause: 1.6, patrolSpeed: 0.45, workRange: 115, attacks: [],
      lamp: { range: 175, cone: 0.42, rate: 1.5 },
      drops: { items: [{ id: 'ammo-shells', chance: 0.25 }, { id: 'ammo-cryo', chance: 0.15 }, { id: 'ds-medgel', chance: 0.1 }] },
      update(e, dt, game) {
        DS.robotSenses(e, game);
        const L = e.def.lamp;
        e.mem.inBeam = DS.lampTrack(e, game, dt, L.rate, L.range, L.cone);
        if (e.mem.inBeam && LM.status) LM.status.apply(game, game.player, 'uv');
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 14, { type: 'spark', color: '#e0c8ff', speed: 200, life: 0.5 });
      },
      draw(g, e, t) {
        g.save();
        g.rotate(e.facing);
        g.fillStyle = '#26292d';
        for (const [x, y] of [[-8, -10], [6, -10], [-8, 10], [6, 10]]) {
          g.beginPath();
          g.arc(x, y, 2.4, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = '#7d878f';
        G.roundRect(g, -11, -9.5, 20, 19, 3);
        g.fill();
        g.fillStyle = '#d8dde1';
        G.roundRect(g, -10, -8.5, 18, 17, 2.5);
        g.fill();
        DS.hazard(g, -10, 6, 18, 2.4, 2);
        g.restore();
        // the mast and its lamp head, which turn on their own
        g.rotate(e.mem.lamp != null ? e.mem.lamp : e.facing);
        g.fillStyle = '#3a4046';
        g.beginPath();
        g.arc(0, 0, 4.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a2e33';
        G.roundRect(g, 2, -5, 9, 10, 2);
        g.fill();
        g.fillStyle = '#5a4a7a';
        g.fillRect(9, -4, 2.4, 8);
      },
      drawGlow(g, e, t) {
        const L = e.def.lamp, a = e.mem.lamp != null ? e.mem.lamp : e.facing;
        const lx = e.x + Math.cos(a) * 11, ly = e.y + Math.sin(a) * 11;
        G.glow(g, lx, ly, 9, '#c8a8ff', e.aggro ? 0.9 : 0.45);
        // the beam
        g.save();
        g.translate(lx, ly);
        g.rotate(a);
        const R = L.range * (e.aggro ? 1 : 0.6);
        const grd = g.createRadialGradient(0, 0, 0, 0, 0, R);
        grd.addColorStop(0, 'rgba(200,160,255,' + (e.aggro ? 0.42 : 0.16) + ')');
        grd.addColorStop(1, 'rgba(200,160,255,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, R, -L.cone, L.cone);
        g.closePath();
        g.fill();
        g.restore();
      },
    },

    'ds-docent': {
      name: 'DOCENT-3', hp: 220, speed: 92, radius: 12, armor: 0.1, mass: 1.4, flying: true, ai: 'skirmisher', keep: [150, 280],
      sight: 300, leash: 1400, turn: 6, robot: true, color: '#e6eaec', blood: '#26221e', gib: '#c9d0d5', deathGlow: '#7fd0c8', deathSound: 'explode',
      bossBar: { name: 'DOCENT-3', color: '#7fd0c8', sub: () => 'Guided tour', range: 700 },
      attacks: [
        { type: 'ranged', projectile: 'enemy-bolt', damage: 7, speed: 330, burst: 3, burstGap: 0.08, fan: 0.55, windup: 0.5, cooldown: 2.2, range: 400, spread: 0.02, lead: 0.3, moveWhileFiring: 0.3, flash: '#7fd0c8' },
        { type: 'summon', enemy: 'ds-courier', count: 2, max: 2, windup: 0.8, cooldown: 9 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-rounds', chance: 0.6 }] },
      update(e, dt, game) {
        const m = e.mem;
        if (e.aggro && !m.hello) {
          m.hello = true;
          m.lineT = 9;
          docentSay(DOCENT.hello);
        }
        if (!e.aggro) return;
        m.lineT = (m.lineT || 9) - dt;
        if (e.atk && e.atk.def.type === 'summon' && !e.atk.said) {
          e.atk.said = true;
          docentSay(DOCENT.summon);
          m.lineT = Math.max(m.lineT, 5);
        }
        if (!m.low && e.hp < e.maxHp * 0.35) {
          m.low = true;
          docentSay(DOCENT.low);
          m.lineT = 12;
        } else if (m.lineT <= 0 && !(LM.comms && LM.comms.busy())) {
          m.lineT = U.rand(9, 13);
          docentSay(DOCENT.lines[(m.n = ((m.n || 0) + 1)) % DOCENT.lines.length]);
        }
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 16, { type: 'spark', color: '#bfe8ff', speed: 220, life: 0.5 });
        if (LM.comms) LM.comms.say({ who: 'docent', text: DOCENT.end, glitch: true, seconds: 2.4 });
      },
      draw(g, e, t) {
        const bob = Math.sin(t * 2.4) * 1.2;
        g.translate(0, bob);
        // a hovering ring with a tablet for a face, and a tour guide's flag on a stick
        g.rotate(e.facing);
        g.strokeStyle = 'rgba(200,210,220,0.35)';
        g.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
          const a = t * 30 + i * 2.1;
          g.beginPath();
          g.moveTo(-4 + Math.cos(a) * 5, Math.sin(a) * 5);
          g.lineTo(-4 - Math.cos(a) * 5, -Math.sin(a) * 5);
          g.stroke();
        }
        g.fillStyle = '#7d878f';
        g.beginPath();
        g.arc(0, 0, 11, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8ecee';
        g.beginPath();
        g.arc(0, 0, 9.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5fb8c8';
        g.beginPath();
        g.arc(0, 0, 9.6, 2.3, 3.98);
        g.lineTo(0, 0);
        g.fill();
        g.fillStyle = '#16303a';
        G.roundRect(g, 2, -6, 7, 12, 2);
        g.fill();
        // the flag
        g.strokeStyle = '#3a4046';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(-6, 6);
        g.lineTo(-14, 12);
        g.stroke();
        g.fillStyle = '#e0b25a';
        g.beginPath();
        g.moveTo(-14, 12);
        g.lineTo(-19, 9);
        g.lineTo(-14, 7);
        g.closePath();
        g.fill();
      },
      drawGlow(g, e, t) {
        const fx = e.x + Math.cos(e.facing) * 5.5, fy = e.y + Math.sin(e.facing) * 5.5;
        G.glow(g, fx, fy, 9, e.aggro ? RED : '#7fd0c8', e.aggro ? 0.7 : 0.5);
        G.glow(g, e.x, e.y, 22, '#7fd0c8', 0.12);
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('courierBeep', (t, o, opt, kit) => {
      for (let i = 0; i < 3; i++) kit.tone(t + i * 0.12, o, { type: 'square', f0: 1320, f1: 1320, dur: 0.07, gain: 0.05 });
    });
    LM.audio.define('labmateChirp', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 880, f1: 660, dur: 0.12, gain: 0.06 });
      kit.tone(t + 0.13, o, { type: 'sine', f0: 660, f1: 440, dur: 0.16, gain: 0.05 });
    });
  }

  LM.definePack({ id: 'ds-robots', name: 'Robots', version: '0.2.0', behaviors, enemies });
})();
