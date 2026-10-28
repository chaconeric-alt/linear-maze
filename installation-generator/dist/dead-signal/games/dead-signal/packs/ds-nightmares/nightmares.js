/* Dead Signal — packs/ds-nightmares/nightmares.js
 * The board's nightmares, made flesh on the lab floors (DESIGN.md section 5.2). Floor 1's share:
 *
 *   ds-hollow-coat    an empty lab coat walking upright, buttoned to the collar, nothing inside.
 *                     It stands facing a wall until you come close. Put down, it lies in a heap and,
 *                     a few seconds later, gets up once more (props.revived: it already has).
 *   ds-nursery-grub   a pale larva with an infant's face where its mouth should be; clutches of six.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;

  const items = {
    // what a Hollow Coat leaves while it decides whether to get up again
    'ds-coat-heap': {
      name: 'A lab coat', radius: 9, z: -2, dressing: false,
      draw(g, it, t) {
        const twitch = it.props.rising ? Math.sin(t * 30) * 0.6 : 0;
        g.rotate(it.props.angle || 0);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(1, 1.5, 12, 8, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d8dad6';
        g.beginPath();
        g.moveTo(-10 + twitch, -4);
        g.quadraticCurveTo(-2, -9, 9, -5);
        g.quadraticCurveTo(12, 1, 8, 6);
        g.quadraticCurveTo(-3, 9, -10, 4);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.18)';
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(-6, -2); g.quadraticCurveTo(0, 0, 6, -2);
        g.moveTo(-5, 3); g.quadraticCurveTo(1, 2, 7, 4);
        g.stroke();
        g.fillStyle = '#5a7aa0';
        g.fillRect(2, -3, 3, 2);
      },
    },
  };

  // the empty coat, seen from above: shoulders, collar open on nothing, sleeves that reach
  function coat(g, e, t) {
    g.rotate(e.facing);
    const swing = Math.hypot(e.vx, e.vy) > 6 ? Math.sin(e.t * 9) * 2.2 : Math.sin(e.t * 2) * 0.4;
    const reach = e.atk && e.atk.def.type === 'melee' ? Math.min(1, e.atk.t / (e.atk.def.windup || 0.3)) * 5 : 0;
    // the hem trailing behind
    g.fillStyle = '#b9bcb8';
    g.beginPath();
    g.moveTo(-3, -8);
    g.quadraticCurveTo(-13, -9 + swing * 0.4, -14, 0);
    g.quadraticCurveTo(-13, 9 - swing * 0.4, -3, 8);
    g.closePath();
    g.fill();
    // sleeves
    g.fillStyle = '#d4d6d2';
    g.beginPath();
    g.ellipse(4 + swing + reach, -8.5, 6.5, 2.6, 0.18, 0, U.TAU);
    g.ellipse(4 - swing + reach, 8.5, 6.5, 2.6, -0.18, 0, U.TAU);
    g.fill();
    // scalpels where the hands should be
    g.fillStyle = '#e8ecef';
    g.fillRect(10 + swing + reach, -9.2, 5, 1);
    g.fillRect(10 - swing + reach, 8.2, 5, 1);
    // shoulders
    g.fillStyle = '#e4e6e2';
    G.roundRect(g, -5, -9, 10, 18, 4.5);
    g.fill();
    // the collar, open on darkness
    g.fillStyle = '#0a0a0b';
    g.beginPath();
    g.ellipse(0.5, 0, 3.6, 4.4, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = '#c4c6c2';
    g.lineWidth = 1.1;
    g.beginPath();
    g.ellipse(0.5, 0, 4.2, 5, 0, -1.3, 1.3);
    g.stroke();
    // a name badge
    g.fillStyle = '#5a7aa0';
    g.fillRect(-2, 5, 3, 2);
  }

  function grub(g, e, t) {
    g.rotate(e.facing);
    const wr = Math.sin(e.t * 16) * 1.2;
    // segments, fattest in the middle
    const segs = [[-8, 3.4], [-4.5, 4.6], [-0.5, 5.2], [3.2, 4.6]];
    segs.forEach(([x, r], i) => {
      g.fillStyle = i % 2 ? '#d8c8be' : '#e4d6cc';
      g.beginPath();
      g.ellipse(x, (i % 2 ? wr : -wr) * 0.5, r * 1.05, r, 0, 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(120,80,70,0.35)';
      g.lineWidth = 0.5;
      g.stroke();
    });
    // the face, small and wrong, where a mouth should be
    g.fillStyle = '#f0e2d8';
    g.beginPath();
    g.arc(6.8, 0, 3.4, 0, U.TAU);
    g.fill();
    g.fillStyle = '#2a1414';
    g.beginPath();
    g.arc(7.6, -1.2, 0.55, 0, U.TAU);
    g.arc(7.6, 1.2, 0.55, 0, U.TAU);
    g.fill();
    const cry = e.aggro ? 0.9 + 0.5 * Math.abs(Math.sin(e.t * 7)) : 0.5;
    g.fillStyle = '#5a1a1a';
    g.beginPath();
    g.ellipse(9.4, 0, 0.8, cry, 0, 0, U.TAU);
    g.fill();
  }

  const behaviors = {
    // stands where it was put, facing the way props.faceAngle says (radians; the wall), until it notices you
    lurker: {
      update(e, dt, game) {
        if (!e.mem.faced) {
          e.mem.faced = true;
          if (e._props && e._props.faceAngle != null) e.facing = +e._props.faceAngle;
        }
        if (!e.aggro) {
          e.speedMul = 0;
          return;
        }
        LM.ai.chase(e, game, 1);
      },
    },
  };

  const enemies = {
    'ds-hollow-coat': {
      name: 'Hollow Coat', hp: 40, speed: 110, radius: 10, ai: 'lurker', sight: 110, leash: 1200, turn: 7, color: '#d8dad6',
      blood: '#1a1a1c', gib: '#c9cbc7', bark: 'coatRustle', dreamer: 'S. Pell',
      attacks: [{ type: 'melee', damage: 12, range: 15, windup: 0.32, recover: 0.25, cooldown: 0.85, knock: 70 }],
      drops: { items: [{ id: 'ds-medgel', chance: 0.12 }, { id: 'ammo-rounds', chance: 0.18 }] },
      onDeath(e, game) {
        if (e._props && e._props.revived) return;
        const heap = game.spawnItemAt('ds-coat-heap', e.x, e.y, { angle: e.facing });
        if (heap) heap.pop = null;
        const x = e.x, y = e.y;
        game.schedule(1.8, () => heap && (heap.props.rising = true));
        game.schedule(3.2, () => {
          if (game.level && heap && !heap.dead && game.levelId === (heap._level || game.levelId)) {
            heap.remove(game);
            const back = game.spawnEnemy('ds-hollow-coat', x, y, { revived: true, aggro: true, summoned: true });
            if (back) game.toast('The coat gets up again.', 'warn');
          }
        });
        if (heap) heap._level = game.levelId;
      },
      draw: coat,
    },
    'ds-nursery-grub': {
      name: 'Nursery Grub', hp: 12, speed: 168, radius: 7, ai: 'swarmer', sight: 360, accel: 13, turn: 14, color: '#e4d6cc',
      blood: '#8a3a2a', gib: '#d8c8be', bark: 'grubCry', dreamer: 'I. Brandt',
      attacks: [{ type: 'melee', damage: 5, range: 9, windup: 0.16, cooldown: 0.6, recover: 0.2, knock: 40 }],
      drops: { items: [{ id: 'ds-medgel', chance: 0.05 }] },
      draw: grub,
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('grubCry', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'triangle', f0: 620, f1: 980, dur: 0.22, gain: 0.05, attack: 0.03 });
      kit.tone(t + 0.18, o, { type: 'triangle', f0: 940, f1: 560, dur: 0.3, gain: 0.04 });
    });
    LM.audio.define('coatRustle', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 900, dur: 0.35, gain: 0.08, attack: 0.08, q: 0.8 });
    });
  }

  LM.definePack({ id: 'ds-nightmares', name: 'Nightmares', version: '0.1.0', behaviors, enemies, items });
})();
