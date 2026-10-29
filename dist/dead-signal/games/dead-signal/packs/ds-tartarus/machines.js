/* Dead Signal — packs/ds-tartarus/machines.js
 * Sub-level B's machines: the Wardens that walk Tartarus's halls (the building's, in defence mode: they turn
 * when ARIADNE comes back), the board's own robots sent down to finish her (the cutters at her plates, the
 * Enforcers sent after you), and ARIADNE's core behind its nine plates. (DESIGN.md 4.7.)
 *
 *   enemies   ds-tartarus-warden   a hulking bronze guardian; patrols a route (props.route), stomps, punches
 *             ds-plate-cutter      the board's: cuts at the core's plates until it's disturbed (tag `cutter`)
 *             ds-enforcer          the board's: black and gold, a shield that sends some shots back
 *   behaviors ds-cutter            stand at your plate and cut; fight what bothers you
 *   items     ds-ariadne-core      ARIADNE's core and its nine plates (props.cut: plates already cut when you
 *                                  arrive). While a cutter lives it cuts: a plate every props.every seconds (240:
 *                                  four minutes), up to eight. It's slow on purpose: it isn't a race, there's time
 *                                  to look at the vaults. Step into the hall (flag inCoreHall) and they hurry: what's
 *                                  left of the eight at props.hurry seconds a plate (10), then the ninth plate, a
 *                                  countdown on you (props.ninth seconds, 280); if it falls, coreBreached. Kill
 *                                  every cutter and it's cuttersDown.
 *             ds-core-console      reconnect ARIADNE to the building (once the cutters are down): ariadneOnline
 *   statuses  ninthPlate           the countdown
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {}), Z = DS.Z, AI = LM.ai;
  const TAU = U.TAU;
  const h = (...a) => LM.ui.h(...a);
  const RED = '#ff3a2a', GREEN = '#5aff9a', GOLD = '#d8a640';
  const visor = (e) => (e.faction === 'ally' ? GREEN : e.faction === 'board' ? GOLD : RED);
  const robotish = (e) => e.faction === 'ally' ? GREEN : RED;

  const statuses = {
    ninthPlate: {
      name: 'The ninth plate', seconds: 280, countdown: true, urgent: 60, only: 'player', color: '#7fd4ff',
      onEnd(game, P, s, reason) {
        if (reason === 'expired' && !game.hasFlag('cuttersDown')) game.setFlag('coreBreached');
      },
    },
  };

  // ======================================================== behaviours
  const behaviors = {
    // a cutter at its plate: it cuts, and doesn't look up until something makes it
    'ds-cutter': {
      update(e, dt, game) {
        const P = game.player;
        if (!e.aggro && P && !P.dead && e.pDist < 5 * T && e.pSee) e.alert(game, true);
        if (e.aggro) return LM.get('behaviors', 'skirmisher').update(e, dt, game);
        e.speedMul = 0;
        const core = e.mem.core || (e.mem.core = game.items.find((i) => !i.dead && i.def.id === 'ds-ariadne-core'));
        if (core) e.facing = Math.atan2(core.y - e.y, core.x - e.x);
        e.mem.cutting = !!core && !core.done;
      },
    },
  };

  // ======================================================== drawing
  function drawWarden(g, e, t) {
    g.rotate(e.facing);
    const step = Math.hypot(e.vx, e.vy) > 6 ? Math.sin(e.t * 7) * 5 : 0;
    // feet
    for (const s of [-1, 1]) {
      g.fillStyle = '#1a140c';
      G.roundRect(g, -8 + step * s, s * 13 - 5, 16, 10, 3);
      g.fill();
    }
    // the trunk: bronze, plated, a furnace grille in the chest
    const grd = g.createLinearGradient(-14, -18, 14, 18);
    grd.addColorStop(0, Z.bronzeLight);
    grd.addColorStop(0.5, Z.bronze);
    grd.addColorStop(1, Z.bronzeDark);
    g.fillStyle = '#140e08';
    G.roundRect(g, -15, -19, 28, 38, 7);
    g.fill();
    g.fillStyle = grd;
    G.roundRect(g, -13.5, -17.5, 25, 35, 6);
    g.fill();
    g.fillStyle = 'rgba(79,143,122,0.45)';
    g.fillRect(-12, -6, 2, 12);
    g.fillStyle = '#1a0e06';
    g.fillRect(2, -7, 6, 14);
    g.fillStyle = 'rgba(255,140,40,0.35)';
    for (let i = 0; i < 4; i++) g.fillRect(2.6, -6 + i * 3.5, 4.8, 1.4);
    // shoulders and great arms
    for (const s of [-1, 1]) {
      g.fillStyle = Z.bronzeDark;
      g.beginPath();
      g.arc(-2, s * 18, 8, 0, TAU);
      g.fill();
      g.fillStyle = Z.bronze;
      g.beginPath();
      g.arc(-3, s * 17.5, 6.5, 0, TAU);
      g.fill();
      const punch = e.atk && e.atk.def.type === 'melee' ? Math.sin(Math.min(1, e.atk.t / (e.atk.def.windup || 0.4)) * Math.PI) * 10 : 0;
      g.fillStyle = '#2a1a0c';
      G.roundRect(g, 0, s * 18 - 5, 16 + punch, 10, 4);
      g.fill();
      g.fillStyle = Z.bronze;
      g.beginPath();
      g.arc(17 + punch, s * 18, 6.2, 0, TAU);
      g.fill();
    }
    // the head: a dome with a slit
    g.fillStyle = '#100a06';
    g.beginPath();
    g.arc(3, 0, 8.5, 0, TAU);
    g.fill();
    g.fillStyle = Z.bronze;
    g.beginPath();
    g.arc(2, 0, 7.5, 0, TAU);
    g.fill();
    g.fillStyle = '#050403';
    g.fillRect(6, -5, 3, 10);
    g.fillStyle = robotish(e);
    g.fillRect(6.6, -4, 1.8, 8);
  }
  function drawCutter(g, e, t) {
    g.rotate(e.facing);
    const m = e.mem || {};
    // a low body on treads, four arms, one with the torch
    g.fillStyle = '#0c0c0e';
    G.roundRect(g, -14, -14, 24, 28, 5);
    g.fill();
    for (const s of [-1, 1]) {
      g.fillStyle = '#1a1a1e';
      g.fillRect(-14, s * 13 - 3, 24, 6);
      g.fillStyle = '#3a3a40';
      for (let i = 0; i < 5; i++) g.fillRect(-13 + i * 5 + ((t * 20) % 5) * (Math.hypot(e.vx, e.vy) > 5 ? 1 : 0), s * 13 - 2.5, 2, 5);
    }
    g.fillStyle = '#1e1c18';
    G.roundRect(g, -10, -10, 18, 20, 4);
    g.fill();
    g.fillStyle = GOLD;
    g.fillRect(-10, -1, 18, 2);
    // the arms: two clamps, a torch, a cooling hose
    const cut = m.cutting && !e.aggro;
    for (const [ay, len, col] of [[-8, 16, '#3a3428'], [8, 16, '#3a3428']]) {
      g.strokeStyle = col;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(4, ay);
      g.lineTo(4 + len, ay * 0.6);
      g.stroke();
    }
    g.strokeStyle = '#5a5248';
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(6, 0);
    g.lineTo(22 + (cut ? Math.sin(t * 9) * 1.5 : 0), 0);
    g.stroke();
    g.fillStyle = '#c0c4c8';
    g.fillRect(21, -1.5, 4, 3);
    // the sensor: a gold eye
    g.fillStyle = '#050505';
    g.beginPath();
    g.arc(0, 0, 4, 0, TAU);
    g.fill();
    g.fillStyle = visor(e);
    g.beginPath();
    g.arc(0.8, 0, 1.8, 0, TAU);
    g.fill();
  }
  function drawEnforcer(g, e, t) {
    g.rotate(e.facing);
    const step = Math.hypot(e.vx, e.vy) > 6 ? Math.sin(e.t * 11) * 3 : 0;
    for (const s of [-1, 1]) {
      g.fillStyle = '#0a0a0a';
      G.roundRect(g, -4 + step * s, s * 7 - 3, 8, 6, 2);
      g.fill();
    }
    g.fillStyle = '#0e0e10';
    G.roundRect(g, -8, -10, 15, 20, 4);
    g.fill();
    g.fillStyle = '#1c1c20';
    G.roundRect(g, -7, -9, 13, 18, 3.5);
    g.fill();
    g.fillStyle = GOLD;
    g.fillRect(-7, -9, 2, 18);
    // the shield on its left arm, a rifle in its right
    g.fillStyle = '#16161a';
    g.beginPath();
    g.ellipse(7, -8, 4, 9, 0.3, 0, TAU);
    g.fill();
    g.strokeStyle = GOLD;
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = '#1a1a1e';
    g.fillRect(2, 5, 15, 3);
    g.fillStyle = '#3a3a40';
    g.fillRect(12, 5.5, 6, 2);
    g.fillStyle = '#050505';
    g.beginPath();
    g.arc(1, 0, 4.4, 0, TAU);
    g.fill();
    g.fillStyle = visor(e);
    g.fillRect(3, -2.4, 1.6, 4.8);
  }

  // ARIADNE's core: a well of blue light in a ring of nine plates; the cut ones lie where they fell
  function drawCore(g, it, t, game) {
    const R = (it.props.r || 2.6) * T;
    const cut = it.cut || 0, prog = it.prog || 0;
    // the floor ring
    g.strokeStyle = 'rgba(127,212,255,0.25)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, R + 14, 0, TAU);
    g.stroke();
    // the core itself
    const on = game && game.hasFlag('ariadneOnline');
    const pulse = 0.5 + 0.5 * Math.sin(t * (on ? 3 : 1.2));
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.7);
    grd.addColorStop(0, on ? '#e8f8ff' : '#7fd4ff');
    grd.addColorStop(0.5, on ? 'rgba(127,212,255,0.8)' : 'rgba(40,110,160,0.7)');
    grd.addColorStop(1, 'rgba(10,30,50,0.9)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, R * 0.7, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(200,240,255,' + (0.3 + 0.3 * pulse) + ')';
    g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.ellipse(0, 0, R * (0.3 + i * 0.13), R * (0.18 + i * 0.1), t * (0.4 + i * 0.3) * (i % 2 ? 1 : -1), 0, TAU);
      g.stroke();
    }
    // ARIADNE's eye, in the middle
    g.fillStyle = '#e8f8ff';
    g.beginPath();
    g.arc(0, 0, 5 + pulse * 1.5, 0, TAU);
    g.fill();
    g.fillStyle = '#0a2a3a';
    g.beginPath();
    g.arc(0, 0, 2.2, 0, TAU);
    g.fill();
    // the plates: nine, thick, round her
    for (let i = 0; i < 9; i++) {
      const a0 = (i / 9) * TAU - Math.PI / 2 + 0.03, a1 = ((i + 1) / 9) * TAU - Math.PI / 2 - 0.03;
      const mid = (a0 + a1) / 2;
      if (i < cut) {
        // it fell outward and lies on the floor, glowing at the cut
        const fx = Math.cos(mid) * (R + 30), fy = Math.sin(mid) * (R + 30);
        g.save();
        g.translate(fx, fy);
        g.rotate(mid + Math.PI / 2 + (U.hash2(i, 2, 3) - 0.5) * 0.6);
        g.fillStyle = '#1e1e22';
        g.fillRect(-16, -5, 32, 10);
        g.fillStyle = '#4a4c52';
        g.fillRect(-15, -4, 30, 8);
        g.fillStyle = 'rgba(255,160,60,0.5)';
        g.fillRect(-16, -5, 32, 1.4);
        g.restore();
        continue;
      }
      g.fillStyle = '#121216';
      g.beginPath();
      g.arc(0, 0, R + 4, a0, a1);
      g.arc(0, 0, R * 0.74, a1, a0, true);
      g.closePath();
      g.fill();
      g.fillStyle = '#4a4c52';
      g.beginPath();
      g.arc(0, 0, R + 2, a0 + 0.02, a1 - 0.02);
      g.arc(0, 0, R * 0.78, a1 - 0.02, a0 + 0.02, true);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.beginPath();
      g.arc(0, 0, R + 1, a0 + 0.04, a1 - 0.04);
      g.arc(0, 0, R - 2, a1 - 0.04, a0 + 0.04, true);
      g.closePath();
      g.fill();
      // rivets
      g.fillStyle = '#8a8c92';
      for (const k of [0.25, 0.75]) {
        const a = a0 + (a1 - a0) * k;
        g.beginPath();
        g.arc(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4), 1.3, 0, TAU);
        g.fill();
      }
      // the plate being cut: a glowing line across it
      if (i === cut && prog > 0) {
        g.strokeStyle = 'rgba(255,190,90,0.9)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, 0, R - 1, a0, a0 + (a1 - a0) * prog);
        g.stroke();
      }
    }
  }

  // ======================================================== items
  const items = {
    'ds-ariadne-core': {
      name: 'ARIADNE · core 01', radius: 30, solid: true, solidRadius: 74, shadow: false, dressing: false, mapColor: '#7fd4ff', mapAlways: true, drawRadius: 160,
      light: { color: '#7fd4ff', radius: 300, intensity: 0.55 },
      init(it) {
        it.cut = it.props.cut == null ? 4 : it.props.cut;
        it.prog = 0;
      },
      update(it, dt, game) {
        if (game.hasFlag('ariadneOnline') || game.hasFlag('coreBreached')) return;
        const cutters = game.enemies.filter((e) => !e.dead && e.tag === 'cutter');
        const working = cutters.filter((e) => !e.aggro).length;
        const P = game.player;
        if (!cutters.length) {
          if (!game.hasFlag('cuttersDown')) {
            game.setFlag('cuttersDown');
            if (P) LM.status.clear(game, P, 'ninthPlate');
          }
          return;
        }
        if (game.hasFlag('inCoreHall')) {
          // they've seen you: the ninth plate
          if (!it.hurry) {
            it.hurry = true;
            if (P) LM.status.apply(game, P, 'ninthPlate', { seconds: it.props.ninth || 280 });
            LM.audio.play('alarm');
          }
          // what's left of the first eight comes down faster
          if (it.cut < 8) {
            it.prog += dt / (it.props.hurry || 10);
            if (it.prog >= 1) {
              it.prog = 0;
              it.cut++;
              LM.audio.play('plateFall', { vol: 1 });
              game.addShake(0.2);
            }
          } else {
            const s = P && LM.status.get(P, 'ninthPlate');
            it.prog = s ? U.clamp(1 - s.t / s.max, 0, 1) : it.prog;
          }
          it.sparks = cutters.length;
        } else if (working && it.cut < 8) {
          // a plate every four minutes, while they're at it
          it.prog += dt / (it.props.every || 240);
          if (it.prog >= 1) {
            it.prog = 0;
            it.cut++;
            LM.audio.play('plateFall', { vol: Math.max(0.3, game.vol(it.x, it.y)) });
            if (!it.told && it.cut >= 6) {
              it.told = true;
              game.setFlag('platesLow');
            }
          }
        }
        // sparks where they cut
        for (const c of cutters) {
          if (c.aggro || Math.random() > dt * 20) continue;
          const a = Math.atan2(it.y - c.y, it.x - c.x);
          const sx = c.x + Math.cos(a) * 26, sy = c.y + Math.sin(a) * 26;
          game.particles.burst(sx, sy, 2, { type: 'spark', color: '#ffd27a', speed: 160, life: 0.35, angle: a + Math.PI, spread: 1.2, size: 1 });
          if (Math.random() < 0.15) LM.audio.play('cutterHiss', { vol: game.vol(sx, sy) * 0.5, throttle: 0.2 });
        }
      },
      draw: drawCore,
      drawGlow(g, it, t, game) {
        const on = game && game.hasFlag('ariadneOnline');
        G.glow(g, 0, 0, 70, '#7fd4ff', on ? 0.8 : 0.4 + 0.1 * Math.sin(t * 1.2));
        if ((it.prog || 0) > 0 && !on) {
          const R = (it.props.r || 2.6) * T;
          const a = ((it.cut + it.prog) / 9) * TAU - Math.PI / 2;
          G.glow(g, Math.cos(a) * R, Math.sin(a) * R, 18, '#ffb040', 0.7);
        }
      },
    },
    'ds-core-console': {
      name: 'Core bus · reconnect', radius: 14, solid: 'rect', dressing: false, mapColor: '#7fd4ff', mapAlways: true,
      init(it) {
        it.box = [40, 18];
      },
      interact: {
        prompt: (it, game) => (game.hasFlag('ariadneOnline') ? 'The console' : game.hasFlag('cuttersDown') ? 'Reconnect ARIADNE' : 'The console'),
        use(it, game) {
          const on = game.hasFlag('ariadneOnline');
          const ready = game.hasFlag('cuttersDown');
          const rows = [
            ['CORE 01 (ARIADNE)', on ? 'ONLINE' : ready ? 'ISOLATED · READY' : 'ISOLATED · UNDER ATTACK'],
            ['PLATES', on ? 'HOLDING' : ready ? 'ONE OF NINE LEFT' : 'BEING CUT'],
            ['BUILDING BUS', on ? 'CONNECTED' : 'LABRYS · SEVERED'],
            ['EXTERNAL LINES', on ? 'ARIADNE · OPEN' : 'SEVERED'],
          ];
          const body = h('div', null, h('div', { class: 'ds-screen' }, rows.map(([k, v]) => k.padEnd(18, ' ') + v).join('\n')));
          if (on || !ready) {
            LM.ui.open({ kicker: 'Sub-level B · core bus', title: on ? 'She’s back' : 'Not while they’re cutting', body, actions: [{ label: 'Close', primary: true }] });
            return;
          }
          LM.ui.open({
            kicker: 'Sub-level B · core bus',
            title: 'Reconnect ARIADNE?',
            body: h('div', null, body, h('p', { class: 'lore' }, 'One heavy switch under a cover marked LABRYS. Under it, someone has scratched a little picture of a thread, running out of a maze.')),
            actions: [
              { label: 'Reconnect her', primary: true, onClick: () => setTimeout(() => game.setFlag('ariadneOnline'), 0) },
              { label: 'Not yet', quiet: true },
            ],
          });
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#0c0c0e';
        g.fillRect(-21, -10, 42, 20);
        g.fillStyle = '#26282c';
        g.fillRect(-20, -9, 40, 18);
        g.fillStyle = '#081210';
        g.fillRect(-17, -7, 22, 8);
        g.fillStyle = '#6a1418';
        g.fillRect(9, -6, 8, 12);
        g.fillStyle = '#c0c4c8';
        g.fillRect(11.5, game && game.hasFlag('ariadneOnline') ? -5 : 1, 3, 4);
      },
      drawGlow(g, it, t, game) {
        const on = game && game.hasFlag('ariadneOnline');
        const ready = game && game.hasFlag('cuttersDown');
        G.glow(g, -6, -3, 16, on ? '#7fd4ff' : ready ? '#ffb040' : '#ff3a2a', 0.45 + 0.2 * Math.sin(t * 3));
      },
    },
  };

  // ======================================================== enemies
  const enemies = {
    'ds-tartarus-warden': {
      name: 'Tartarus Warden', hp: 900, speed: 66, radius: 17, armor: 0.45, mass: 9, accel: 5, turn: 3, ai: 'patrol', then: 'chaser', robot: true,
      sight: 120, view: { range: 330, cone: 0.8 }, hear: 280, leash: 1600, pause: 1.6, patrolSpeed: 0.6, drawRadius: 30,
      color: '#b5803f', blood: '#26221e', gib: '#b5803f', deathGlow: '#ffb050', deathSound: 'explode', pullImmune: true,
      resist: { staggered: 1, held: 1, snared: 1, stasis: 0.5, burning: 0.6 },
      attacks: [
        { type: 'nova', damage: 22, radius: 72, windup: 0.7, recover: 0.6, cooldown: 4, color: '#ffb040', status: 'staggered' },
        { type: 'melee', damage: 30, range: 26, windup: 0.45, recover: 0.4, cooldown: 1.3, knock: 360 },
        { type: 'ranged', projectile: 'enemy-slug', damage: 14, speed: 420, burst: 3, burstGap: 0.14, windup: 0.6, cooldown: 2.4, range: 380, spread: 0.06, lead: 0.4, flash: '#ffb040' },
      ],
      drops: { items: [{ id: 'ammo-shells', chance: 0.6 }, { id: 'ammo-rounds', chance: 0.6 }, { id: 'ds-medgel', chance: 0.3 }] },
      update(e, dt, game) {
        if (DS.robotSenses) DS.robotSenses(e, game);
        e.mem.clank = (e.mem.clank || 0) - dt;
        if (e.mem.clank <= 0 && Math.hypot(e.vx, e.vy) > 10) {
          e.mem.clank = 0.55;
          LM.audio.play('wardenStep', { vol: game.vol(e.x, e.y) * 0.5, throttle: 0.1 });
        }
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 22, { type: 'spark', color: '#ffd27a', speed: 240, life: 0.5 });
        game.addShake(0.3);
      },
      draw: drawWarden,
      drawGlow(g, e, t) {
        G.glow(g, e.x + Math.cos(e.facing) * 10, e.y + Math.sin(e.facing) * 10, 9, robotish(e), 0.6);
        G.glow(g, e.x + Math.cos(e.facing) * 5, e.y + Math.sin(e.facing) * 5, 12, '#ff8a3a', 0.25);
      },
    },
    'ds-plate-cutter': {
      name: 'Plate cutter', hp: 560, speed: 70, radius: 14, armor: 0.4, mass: 6, accel: 6, turn: 5, ai: 'ds-cutter', faction: 'board', robot: true, keep: [40, 150],
      sight: 260, leash: 900, color: '#1e1c18', blood: '#26221e', gib: '#d8a640', deathGlow: '#ffd27a', deathSound: 'explode',
      resist: { staggered: 0.5, held: 1 },
      attacks: [
        { type: 'ranged', projectile: 'plasma-arc', damage: 7, speed: 520, burst: 8, burstGap: 0.05, windup: 0.45, cooldown: 1.8, range: 220, spread: 0.12, status: 'burning', flash: '#ffb040' },
        { type: 'melee', damage: 22, range: 20, windup: 0.35, recover: 0.4, cooldown: 1.1, knock: 200, status: 'burning' },
      ],
      drops: { items: [{ id: 'ammo-cells', chance: 0.5 }] },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 18, { type: 'spark', color: '#ffd27a', speed: 220, life: 0.45 });
      },
      draw: drawCutter,
      drawGlow(g, e, t) {
        const m = e.mem || {};
        if (m.cutting && !e.aggro) {
          const x = e.x + Math.cos(e.facing) * 26, y = e.y + Math.sin(e.facing) * 26;
          G.glow(g, x, y, 14 + Math.sin(t * 30) * 4, '#ffd27a', 0.9);
          G.glow(g, x, y, 5, '#ffffff', 0.9);
        }
        G.glow(g, e.x, e.y, 6, visor(e), 0.5);
      },
    },
    'ds-enforcer': {
      name: 'Enforcer', hp: 300, speed: 112, radius: 11, armor: 0.3, mass: 2.6, accel: 9, turn: 6, ai: 'skirmisher', faction: 'board', robot: true, keep: [110, 260],
      sight: 420, leash: 1500, color: '#141416', blood: '#26221e', gib: '#d8a640', deathGlow: '#ffd27a', deathSound: 'explode',
      reflect: { arc: 0.85, aim: true, damage: 1, speed: 1, chance: 0.55, color: '#ffe0a0' },
      attacks: [
        { type: 'ranged', projectile: 'enemy-slug', damage: 10, speed: 470, burst: 3, burstGap: 0.1, windup: 0.45, cooldown: 1.7, range: 400, spread: 0.04, lead: 0.5, flash: '#ffd28a' },
        { type: 'melee', damage: 16, range: 16, windup: 0.3, recover: 0.35, cooldown: 1, knock: 180 },
      ],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.5 }, { id: 'ds-medgel', chance: 0.15 }] },
      update(e, dt, game) {
        if (!e.mem.said && e.aggro && e.pSee) {
          e.mem.said = true;
          if (Math.random() < 0.5) LM.audio.play('enforcerBark', { vol: game.vol(e.x, e.y) });
        }
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 14, { type: 'spark', color: '#ffd27a', speed: 220, life: 0.45 });
      },
      draw: drawEnforcer,
      drawGlow(g, e) {
        G.glow(g, e.x + Math.cos(e.facing) * 3, e.y + Math.sin(e.facing) * 3, 7, visor(e), 0.6);
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    const A = LM.audio;
    A.define('plateFall', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 300, freqEnd: 90, dur: 0.8, gain: 0.4 });
      kit.tone(t, o, { type: 'square', f0: 110, f1: 60, dur: 0.5, gain: 0.05 });
      kit.noise(t + 0.3, o, { type: 'bandpass', freq: 1200, dur: 0.4, gain: 0.08, q: 3 });
    });
    A.define('cutterHiss', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 2200, dur: 0.3, gain: 0.06 });
    });
    A.define('wardenStep', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 180, dur: 0.18, gain: 0.25 });
      kit.tone(t, o, { type: 'triangle', f0: 90, f1: 60, dur: 0.15, gain: 0.05 });
    });
    A.define('enforcerBark', (t, o, opt, kit) => {
      for (let i = 0; i < 3; i++) kit.tone(t + i * 0.09, o, { type: 'square', f0: 640 - i * 80, dur: 0.06, gain: 0.03 });
    });
  }

  // the building's robots are on the robots' side (the board's say board)
  for (const d of Object.values(enemies)) if (d.robot && !d.faction) d.faction = 'robot';

  // the board's own machines: against you, ARIADNE's side, and anything loose
  const factions = { board: ['player', 'ally', 'monster'] };

  LM.definePack({ id: 'ds-tartarus', statuses, behaviors, items, enemies, factions });
})();
