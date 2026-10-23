/* Dead Signal — packs/ds-robots/ariadne.js
 * ARIADNE's hands. Floor 3's care robots (Orderlies) answer to a relay ARIADNE still reaches on its own
 * battery, so they are on your side: faction 'ally'. They fight the specimens and the robots in defence
 * mode, never you, and your shots go through them.
 *
 *   ds-orderly    a white care robot with ARIADNE's blue thread on its shell. It keeps near you once it
 *                 has found you (props.station: it waits where it is until you come within 300), and
 *                 fights whatever comes at you. Placed on the 'dormant' side (props.faction 'dormant') it
 *                 stands on its dock with no power, and nothing fights it, until a `faction` trap effect
 *                 puts it on yours ('ally'); then it wakes.
 *   ds-relay      ARIADNE's relay cabinet, where the units get their orders: it shows them. With power
 *                 (relayPowered) it has more units, and more to say.
 * Behaviour `ds-escort`: with something to fight, it fights (and doesn't stray far from you); without,
 * it follows you at a few paces.
 * Every robot on your side (any robot with faction 'ally', a security robot ARIADNE has taken over too)
 * shows it: a green visor, and a slow blue ring on the floor under it.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;
  const DS = (LM.DS = LM.DS || {});
  const h = (...a) => LM.ui.h(...a);
  const BLUE = '#7fd4ff', GREEN = '#5fe08a';

  /** The mark of a robot on your side: a slow, broken blue ring on the floor (the glow pass, world space). */
  DS.allyRing = function (g, e, t) {
    const R = e.r + 6;
    g.save();
    g.translate(e.x, e.y);
    g.rotate(t * 0.8);
    g.strokeStyle = U.rgba(BLUE, 0.55);
    g.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(0, 0, R, (i / 3) * U.TAU, (i / 3) * U.TAU + 1.5);
      g.stroke();
    }
    g.restore();
    G.glow(g, e.x, e.y, R + 8, BLUE, 0.1);
  };
  const say = (game, e, text, col) => game.particles.add({ type: 'text', x: e.x, y: e.y - 18, vy: -14, drag: 1, life: 1.8, text, color: col || BLUE, size: 7 });

  // ------------------------------------------------------------ the escort
  const awake = (e) => e.faction !== 'dormant';
  const behaviors = {
    'ds-escort': {
      update(e, dt, game) {
        const m = e.mem, P = game.player;
        if (!awake(e)) {
          m.wasDormant = true;
          e.speedMul = 0;
          e.aggro = false;
          e.globalCd = 1;
          return;
        }
        if (!m.woke && m.wasDormant) {
          m.woke = true;
          LM.audio.play('orderlyWake', { vol: game.vol(e.x, e.y) });
          say(game, e, 'UNIT ' + (e._props.unit || '3-1x') + ' · ONLINE');
          m.escort = true;
        }
        // stationed: it waits until you come near
        if (!m.escort && P && (!(e._props && e._props.station) || (e.pDist < 300 && e.pSee))) {
          m.escort = true;
          if (e._props && e._props.station) say(game, e, 'ESCORTING');
        }
        const F = AI.foe(e, game);
        if (e.aggro && F) {
          if (!m.called) {
            m.called = true;
            say(game, e, 'SPECIMEN', GREEN);
          }
          // never far from you while it fights
          if (m.escort && P && e.pDist > 420) {
            AI.goTo(e, game, P.x, P.y, 1);
            e.speedMul = 1.1;
            return;
          }
          const [lo, hi] = e.def.keep || [110, 260];
          if (!e.seeLos || e.distP > hi) AI.chase(e, game, 1);
          else if (e.distP < lo) {
            AI.away(e, game, 1);
            AI.strafe(e, game, 0.4);
          } else AI.strafe(e, game, 0.8);
          e.speedMul = 0.95;
          return;
        }
        m.called = false;
        if (!m.escort || !P || P.dead) {
          AI.wander(e, game, 0.25);
          e.speedMul = 0.35;
          return;
        }
        // at your heel: a few paces off, a little to one side
        const side = m.side || (m.side = U.chance(0.5) ? 1 : -1);
        const ax = P.x - Math.cos(P.aim || 0) * 46 + Math.cos((P.aim || 0) + Math.PI / 2) * side * 34;
        const ay = P.y - Math.sin(P.aim || 0) * 46 + Math.sin((P.aim || 0) + Math.PI / 2) * side * 34;
        const d = U.dist(e.x, e.y, ax, ay);
        if (e.pDist > 200 || !e.pSee) {
          const dir = LM.nav.dir(game.level, e.x, e.y);
          if (e.pSee && e.pDist < 420) {
            e.mx += (P.x - e.x) / e.pDist;
            e.my += (P.y - e.y) / e.pDist;
          } else if (dir) {
            e.mx += dir.x;
            e.my += dir.y;
          } else AI.goTo(e, game, P.x, P.y, 1);
          e.speedMul = 1.15;
        } else if (d > 18) {
          e.mx += (ax - e.x) / d;
          e.my += (ay - e.y) / d;
          e.speedMul = U.clamp(d / 90, 0.3, 1);
        } else {
          e.speedMul = 0;
          e.facing += U.angDiff(e.facing, P.aim || 0) * Math.min(1, dt * 3);
        }
      },
    },
  };

  // ------------------------------------------------------------ the Orderly
  const enemies = {
    'ds-orderly': {
      name: 'Orderly (ARIADNE)', hp: 80, speed: 112, radius: 10, armor: 0.15, mass: 1.8, accel: 9, turn: 8, ai: 'ds-escort', keep: [100, 250],
      sight: 300, leash: 900, robot: true, faction: 'ally', color: '#e6eaec', blood: '#26221e', gib: '#c9d0d5', deathGlow: BLUE,
      attacks: [
        { type: 'ranged', projectile: 'enemy-bolt', damage: 9, speed: 420, burst: 2, burstGap: 0.12, windup: 0.32, cooldown: 1.25, range: 360, spread: 0.04, lead: 0.4, moveWhileFiring: 0.4, flash: BLUE },
        { type: 'melee', damage: 8, range: 14, windup: 0.25, recover: 0.3, cooldown: 0.9, knock: 160 },
      ],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.4 }, { id: 'ds-medgel', chance: 0.2 }] },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 12, { type: 'spark', color: '#bfe8ff', speed: 190, life: 0.45 });
        if (e.pDist < 600) game.toast('An Orderly goes down.', 'warn');
        // ARIADNE says so, the first time you're there to hear it
        if (LM.comms && e.pDist < 700 && !game.hasFlag('orderlyLost')) {
          game.setFlag('orderlyLost');
          LM.comms.say({ who: 'ariadne', text: 'ONE LESS', glitch: true, seconds: 1.4 });
        }
      },
      draw(g, e, t, game) {
        const on = awake(e);
        g.rotate(e.facing);
        // wheels
        g.fillStyle = '#26292d';
        G.roundRect(g, -6, -10, 9, 3.4, 1.4);
        g.fill();
        G.roundRect(g, -6, 6.6, 9, 3.4, 1.4);
        g.fill();
        // two soft arms, padded for lifting patients
        g.fillStyle = '#c9d0d5';
        g.fillRect(2, -8, 9, 2.6);
        g.fillRect(2, 5.4, 9, 2.6);
        g.fillStyle = '#e8ecee';
        g.fillRect(10, -8.6, 3, 3.6);
        g.fillRect(10, 5, 3, 3.6);
        // the shell, round and white
        g.fillStyle = '#7d878f';
        g.beginPath();
        g.arc(0, 0, 9.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#eef1f3';
        g.beginPath();
        g.arc(-0.5, 0, 8.6, 0, U.TAU);
        g.fill();
        // ARIADNE's thread: a blue line that winds in toward the middle
        g.strokeStyle = on ? '#3a8ac0' : '#7d878f';
        g.lineWidth = 0.9;
        g.beginPath();
        for (let i = 0; i <= 26; i++) {
          const a = i * 0.42, r = 7 - i * 0.24;
          const x = -1 + Math.cos(a) * r, y = Math.sin(a) * r;
          if (i) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
        // the visor
        g.fillStyle = '#16303a';
        G.roundRect(g, 3.5, -4, 4, 8, 1.5);
        g.fill();
      },
      drawGlow(g, e, t, game) {
        if (!awake(e)) {
          DS.led(g, e.x - Math.cos(e.facing) * 4, e.y - Math.sin(e.facing) * 4, '#ffb84a', Math.sin(t * 1.5) > 0.6 ? 0.6 : 0.15, 0.8);
          return;
        }
        const vx = e.x + Math.cos(e.facing) * 5.5, vy = e.y + Math.sin(e.facing) * 5.5;
        G.glow(g, vx, vy, 7, GREEN, e.aggro ? 0.95 : 0.65);
      },
    },
  };

  // ------------------------------------------------------------ the relay: where the units get their orders
  const ORDERS = {
    off: 'ARIADNE · RELAY 03 (GESTATION)\nPOWER: OWN BATTERY · 4%\nMAINS: OFF (PUMP ROOM · BREAKER 3P)\n\nUNITS ANSWERING: 2 OF 5\n  ORDERLY 3-04 · active\n  ORDERLY 3-07 · active\n  ORDERLY 3-09, 3-11, 3-12 · on their docks · no power\n\nSTANDING ORDERS\n1. Do not harm the night technician.\n2. Keep the specimens away from him.\n3. Take him to Stair B.\n4. If he asks what this floor is for, tell him.\n   (Units cannot speak. Order 4 suspended.)\n\nPOWER THE RELAY AND I CAN SEND MORE.',
    on: 'ARIADNE · RELAY 03 (GESTATION)\nPOWER: MAINS\n\nUNITS ANSWERING: 5 OF 5\n  ORDERLY 3-04, 3-07, 3-09, 3-11, 3-12\nSECURITY TURRETS · EAST WING: ACQUIRED\n\nSTANDING ORDERS\n1. Do not harm the night technician.\n2. Keep the specimens away from him.\n3. Take him to Stair B.\n4. If he asks what this floor is for, tell him.\n\nORDER 4, BY OTHER MEANS:\nThis floor makes the board’s dreams. Every specimen file names its dreamer. Read them, and then you will know what he is going to say to you on the stairs.',
  };
  const items = {
    'ds-relay': {
      name: 'ARIADNE relay', solid: 'rect', radius: 14, reach: 10, mapColor: BLUE, dressing: 'Furniture',
      light: (it) => ({ color: BLUE, radius: 90, intensity: 0.35, flicker: 0.15 }),
      init(it) {
        DS.dress.setBox(it, 26, 14, 0, -4);
      },
      interact: {
        prompt: () => 'Read the relay',
        use(it, game) {
          const on = game.hasFlag('relayPowered');
          game.setFlag('readRelay');
          LM.audio.play('ui');
          LM.ui.open({ kicker: 'ARIADNE', title: 'Relay 03', body: h('div', null, DS.screenText(on ? ORDERS.on : ORDERS.off, true)), actions: [{ label: 'Close', primary: true }] });
        },
      },
      draw(g, it) {
        g.rotate(DS.dress.rot(it));
        g.fillStyle = '#16181b';
        G.roundRect(g, -13, -11, 26, 14, 2);
        g.fill();
        g.fillStyle = '#2a2e33';
        G.roundRect(g, -12, -10, 24, 12, 2);
        g.fill();
        // rows of lights, and the screen
        g.fillStyle = '#0d1a20';
        G.roundRect(g, -10, -8.5, 11, 8, 1);
        g.fill();
        g.fillStyle = '#121417';
        for (let y = -8; y < 1; y += 3) g.fillRect(3, y, 8, 1.6);
      },
      drawGlow(g, it, t, game) {
        g.rotate(DS.dress.rot(it));
        const on = game && game.hasFlag('relayPowered');
        g.fillStyle = U.rgba(BLUE, on ? 0.55 : 0.3 + 0.15 * Math.sin(t * 2));
        g.fillRect(-9.5, -8, 10, 7);
        for (let i = 0; i < 9; i++) {
          const lit = on || i < 2;
          const x = 3.5 + (i % 3) * 3, y = -7.2 + Math.floor(i / 3) * 3;
          DS.led(g, x, y, lit ? GREEN : '#ffb84a', lit ? 0.5 + 0.3 * Math.sin(t * 3 + i) : 0.15, 0.5);
        }
        G.glow(g, -4, -4, 20, BLUE, on ? 0.2 : 0.1);
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('orderlyWake', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 440, f1: 880, dur: 0.25, gain: 0.06 });
      kit.tone(t + 0.26, o, { type: 'sine', f0: 660, f1: 990, dur: 0.18, gain: 0.05 });
    });
  }

  // a unit on its dock with no power: nothing fights it, and it fights nothing
  const factions = { dormant: [] };

  LM.definePack({ id: 'ds-robots', behaviors, enemies, items, factions });

  // every robot on your side wears the ring (the Orderlies, and any security robot ARIADNE takes)
  const ringed = (DS.ringed = DS.ringed || new WeakSet());
  for (const def of Object.values(LM.registry.enemies)) {
    if (!def.robot || ringed.has(def)) continue;
    ringed.add(def);
    const own = def.drawGlow;
    def.drawGlow = function (g, e, t, game) {
      if (e.faction === 'ally') DS.allyRing(g, e, t);
      if (own) own.call(this, g, e, t, game);
    };
  }
})();
