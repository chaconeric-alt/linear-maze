/* Dead Signal — packs/ds-arsenal/supply.js
 * A security resupply cabinet, added after playtests (players ran out of ammunition on Floor 5).
 *   items   ds-supply-cabinet   a steel wall cabinet, stencilled SECURITY · RESUPPLY, with ammunition for every
 *                               ordinary weapon. Open it and every weapon you carry that takes one of its kinds is
 *                               filled to the top. It holds one full load of each kind (the most you can carry);
 *                               what you don't take stays in it for next time (the floor remembers).
 *           props   dir      the way it faces, away from its wall: 's' (on a north wall, the default), 'n', 'e', 'w'
 *                   w        how many tiles of wall it's centred on (default 2)
 *                   ammo     the kinds it holds (default rounds, shells, cryo, cells, fuel: everything but the
 *                            armory's weapons, which never run dry)
 *                   refill   true: full again every time it's opened (default false)
 *                   title, kicker, label   the pop-up's title and kicker, and the stencil on its door
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  const KINDS = ['rounds', 'shells', 'cryo', 'cells', 'fuel'];
  const GREEN = '#8fe0a0', AMBER = '#f2c35b';

  const kinds = (it) => (Array.isArray(it.props.ammo) && it.props.ammo.length ? it.props.ammo : KINDS).filter((k) => LM.AMMO_MAX[k]);
  const full = (k) => LM.AMMO_MAX[k] || 0;
  const name = (k) => String((LM.AMMO_NAMES && LM.AMMO_NAMES[k]) || k).toLowerCase();
  // what's left of each kind (a full load until something is taken)
  const left = (it, k) => (it.props.refill || it.stock[k] == null ? full(k) : it.stock[k]);
  const empty = (it) => !it.props.refill && kinds(it).every((k) => left(it, k) <= 0);
  const list = (parts) => (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0] || '');

  const items = {
    'ds-supply-cabinet': {
      name: 'Supply cabinet', solid: 'rect', radius: 14, dressing: 'Furniture', mapColor: GREEN,
      light: { color: GREEN, radius: 70, intensity: 0.22 },
      init(it) {
        const w = it.props.w || 2;
        const d = it.props.dir || 's';
        if (d === 'e' || d === 'w') it.y = it.ty * T + (w * T) / 2;
        else it.x = it.tx * T + (w * T) / 2;
        const bw = Math.min(w * T - 8, 64), bh = 14;
        if (d === 's') { it.box = [bw, bh]; it.boxOff = [0, -9]; }
        else if (d === 'n') { it.box = [bw, bh]; it.boxOff = [0, 9]; }
        else if (d === 'e') { it.box = [bh, bw]; it.boxOff = [-9, 0]; }
        else { it.box = [bh, bw]; it.boxOff = [9, 0]; }
        it.stock = it.stock || {};
      },
      interact: {
        available: (it) => !empty(it),
        prompt: () => 'Open the supply cabinet',
        use(it, game) {
          const P = game.player;
          // only what the weapons in your hands take; the rest stays on the shelf
          const carried = new Set(P.weapons.map((id) => LM.find('weapons', id)).filter((w) => w && w.ammo).map((w) => w.ammo));
          const took = [], still = [];
          for (const k of kinds(it)) {
            const have = left(it, k);
            const want = carried.has(k) ? Math.max(0, P.ammoMax(k) - (P.ammo[k] || 0)) : 0;
            const n = Math.min(have, want);
            if (n > 0) {
              P.addAmmo(k, n);
              took.push(n + ' ' + name(k));
            }
            if (!it.props.refill) {
              it.stock[k] = have - n;
              if (have - n > 0) still.push(have - n + ' ' + name(k));
            }
          }
          if (!took.length) {
            game.toast('Everything you carry is already full.', 'good');
            LM.audio.play('ui', { vol: 0.6 });
            return;
          }
          LM.audio.play('pickup');
          LM.audio.play('key', { vol: 0.6 });
          // what it couldn't fill: it ran out of that
          const short = [...carried].filter((k) => kinds(it).includes(k) && (P.ammo[k] || 0) < P.ammoMax(k)).map(name);
          game.particles.add({ type: 'text', x: it.x, y: it.y - 22, vy: -30, drag: 2, life: 1.2, text: short.length ? '+ammo' : 'Full', color: GREEN, size: 8 });
          const text = 'Steel shelves of boxed ammunition, canisters and tanks, for a lockdown nobody expected to last.\n\nYou take ' + list(took) + '.' +
            (short.length ? ' That was the last of its ' + list(short) + '.' : ' Every weapon you carry is full.') +
            (it.props.refill ? '' : '\n\n' + (still.length ? 'Still in the cabinet: ' + list(still) + '.' : 'The cabinet is empty now.'));
          LM.ui.showText(it.props.title || 'Security resupply', text, it.props.kicker || 'Supply cabinet');
        },
      },
      draw(g, it, t) {
        g.rotate(rot(it));
        const w = it.props.w || 2;
        const W = Math.min(w * T - 8, 64), x0 = -W / 2;
        const out = empty(it);
        // the carcass, bolted to the wall
        g.fillStyle = '#121518';
        g.fillRect(x0 - 1, -17, W + 2, 16);
        g.fillStyle = '#3c4650';
        g.fillRect(x0, -16, W, 14);
        // two doors with mesh windows; through them, the boxes (each kind in its own colours)
        const ks = kinds(it);
        for (let d = 0; d < 2; d++) {
          const dx = x0 + 1 + d * (W / 2), dw = W / 2 - 2;
          g.fillStyle = '#4b5763';
          g.fillRect(dx, -15, dw, 12);
          g.fillStyle = '#0d1013';
          g.fillRect(dx + 2, -13.5, dw - 4, 6.5);
          if (!out) {
            const per = Math.ceil(ks.length / 2);
            for (let i = 0; i < per; i++) {
              const k = ks[d * per + i];
              if (!k || left(it, k) <= 0) continue;
              const info = (LM.AMMO_INFO && LM.AMMO_INFO[k]) || { color: '#5a5c62', band: '#d9a32a' };
              const bx = dx + 2.5 + i * ((dw - 5) / per), bw = (dw - 5) / per - 1;
              g.fillStyle = info.color;
              g.fillRect(bx, -12.6, bw, 4.8);
              g.fillStyle = info.band;
              g.fillRect(bx, -11, bw, 1.2);
            }
          }
          // the mesh
          g.strokeStyle = 'rgba(160,175,185,0.35)';
          g.lineWidth = 0.5;
          g.beginPath();
          for (let mx = dx + 3; mx < dx + dw - 2; mx += 2.2) {
            g.moveTo(mx, -13.5);
            g.lineTo(mx, -7);
          }
          g.stroke();
          // handle
          g.fillStyle = '#c8ced4';
          g.fillRect(d ? dx + 1.5 : dx + dw - 2.5, -6.5, 1, 2.6);
        }
        // a hazard stripe along the bottom and the stencil
        for (let x = x0; x < x0 + W; x += 4) {
          g.fillStyle = Math.floor((x - x0) / 4) % 2 ? '#1a1a1a' : AMBER;
          g.fillRect(x, -3.4, Math.min(4, x0 + W - x), 1.6);
        }
        g.fillStyle = 'rgba(242,195,91,0.85)';
        g.font = '700 3.6px "IBM Plex Mono", monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(it.props.label || 'SECURITY · RESUPPLY', 0, -5.2);
        // the status light
        g.fillStyle = out ? '#5a2a26' : GREEN;
        g.beginPath();
        g.arc(x0 + W - 3, -14.6, 1.1, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (empty(it)) return;
        g.rotate(rot(it));
        const W = Math.min((it.props.w || 2) * T - 8, 64);
        G.glow(g, W / 2 - 3, -14.6, 6, GREEN, 0.6 + 0.25 * Math.sin(t * 3));
        G.glow(g, 0, -8, W * 0.55, GREEN, 0.08);
      },
    },
  };

  LM.definePack({ id: 'ds-arsenal', items });
})();
