/* Dead Signal — packs/ds-tartarus/dressings.js
 * Tartarus's fittings. (DESIGN.md 7.2.)
 *   ds-vault-door    a bank-vault door in the wall, round, bronze: props.w (tiles across, 3), dir (the side it faces:
 *                    n, s, e, w), label (VAULT 2 · BEHEMOTH), flag (set: it rolls aside), text (its inscription)
 *   ds-titan-plaque  the plaque by a viewing window: props.title, text, flag (wall-mounted)
 *   ds-beacon        an amber warning beacon, turning (wall-mounted)
 *   ds-chains        chains hanging from the ceiling, swaying
 *   ds-feathers      white feathers, and what's left of whoever went in after them
 *   ds-bones         bones, picked
 *   ds-heir-nest     where the Heirs sleep: coats and stolen jewellery in a ring
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {}), Z = DS.Z;
  const TAU = U.TAU;
  const FACE = { n: -Math.PI / 2, s: Math.PI / 2, e: 0, w: Math.PI };

  function drawVaultDoor(g, it, t) {
    const w = (it.props.w || 3) * T;
    const R = w / 2 - 2;
    const open = it.open || 0;
    const dir = it.props.dir || 's';
    // along the wall: east-west for a door facing north or south
    const along = dir === 'n' || dir === 's' ? [1, 0] : [0, 1];
    const out = dir === 'n' ? [0, -1] : dir === 's' ? [0, 1] : dir === 'e' ? [1, 0] : [-1, 0];
    // the recess: dark, a bronze collar round it
    g.fillStyle = '#060504';
    g.beginPath();
    g.arc(0, 0, R + 2, 0, TAU);
    g.fill();
    g.strokeStyle = Z.bronzeDark;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(0, 0, R + 3, 0, TAU);
    g.stroke();
    // the door, rolled aside as it opens (and out a little toward the hall)
    const k = U.ease.inOutSine(open);
    g.save();
    g.translate(along[0] * k * (R * 2 + 6) + out[0] * k * 10, along[1] * k * (R * 2 + 6) + out[1] * k * 10);
    g.rotate(k * 2.2);
    const grd = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
    grd.addColorStop(0, Z.bronzeLight);
    grd.addColorStop(0.55, Z.bronze);
    grd.addColorStop(1, Z.bronzeDark);
    g.fillStyle = '#1a1008';
    g.beginPath();
    g.arc(1.5, 2, R, 0, TAU);
    g.fill();
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.fill();
    // rings and bolts
    g.strokeStyle = 'rgba(40,24,8,0.6)';
    g.lineWidth = 1.4;
    for (const rr of [R * 0.82, R * 0.55]) {
      g.beginPath();
      g.arc(0, 0, rr, 0, TAU);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,232,190,0.55)';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      g.beginPath();
      g.arc(Math.cos(a) * R * 0.91, Math.sin(a) * R * 0.91, 1.5, 0, TAU);
      g.fill();
    }
    // the wheel: six spokes and a hub
    g.strokeStyle = '#2a1a0c';
    g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.26;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * R * 0.48, Math.sin(a) * R * 0.48);
      g.stroke();
    }
    g.strokeStyle = Z.bronzeLight;
    g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.26;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * R * 0.48, Math.sin(a) * R * 0.48);
      g.stroke();
    }
    g.fillStyle = '#2a1a0c';
    g.beginPath();
    g.arc(0, 0, 5, 0, TAU);
    g.fill();
    g.fillStyle = Z.bronzeLight;
    g.beginPath();
    g.arc(0, 0, 3, 0, TAU);
    g.fill();
    // verdigris where the sea air of the cells got at it
    g.fillStyle = 'rgba(79,143,122,0.35)';
    for (let i = 0; i < 5; i++) {
      const a = U.hash2(i, it.tx, 3) * TAU, r = R * (0.6 + U.hash2(i, it.ty, 4) * 0.3);
      g.beginPath();
      g.ellipse(Math.cos(a) * r, Math.sin(a) * r, 4, 2, a, 0, TAU);
      g.fill();
    }
    g.restore();
    // the nameplate, on the hall side
    if (it.props.label) {
      g.save();
      g.translate(out[0] * (R * 0.2), out[1] * (R * 0.2));
      g.fillStyle = 'rgba(10,8,6,0.85)';
      const lw = Math.min(w - 10, it.props.label.length * 4.2 + 8);
      g.fillRect(-lw / 2 + out[0] * 0, R * 0.62 * (dir === 'n' ? -1 : 1) - 5, lw, 9);
      g.fillStyle = Z.amber;
      g.font = '600 6.5px "IBM Plex Mono", monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(it.props.label, 0, R * 0.62 * (dir === 'n' ? -1 : 1));
      g.restore();
    }
  }

  const items = {
    'ds-vault-door': {
      name: 'Vault door', radius: 20, shadow: false, dressing: 'Tartarus', drawRadius: 80, mapColor: '#b5803f',
      interact: {
        available: (it) => !!it.props.text && !(it.open > 0.5),
        prompt: (it) => 'Read the door: ' + (it.props.label || 'a vault'),
        use(it, game) {
          if (it.props.readFlag) game.setFlag(it.props.readFlag);
          LM.ui.showText(it.props.label || 'A vault', it.props.text, 'Tartarus');
        },
      },
      reach: 30,
      update(it, dt, game) {
        const want = it.props.flag && game.anyFlag(it.props.flag) ? 1 : 0;
        const before = it.open || 0;
        it.open = U.approach(before, want, dt / (it.props.time || 2.4));
        if (before === 0 && it.open > 0) {
          LM.audio.play('vaultOpen', { vol: Math.max(0.5, game.vol(it.x, it.y)) });
          game.addShake(0.25);
        }
      },
      draw: drawVaultDoor,
      drawGlow(g, it, t) {
        if ((it.open || 0) > 0.05 && it.props.glow) G.glow(g, 0, 0, 60, it.props.glow, 0.4 * it.open);
      },
    },
    'ds-titan-plaque': {
      name: 'Plaque', radius: 8, wallMounted: true, dressing: 'Tartarus', mapColor: '#b5803f',
      interact: {
        prompt: (it) => 'Read the plaque' + (it.props.title ? ': ' + it.props.title : ''),
        use(it, game) {
          if (it.props.flag) game.setFlag(it.props.flag);
          // a plaque read is evidence (titanFiles counts them)
          const read = (game.player.data.titanPlaques = game.player.data.titanPlaques || []);
          if (it.props.title && !read.includes(it.props.title)) read.push(it.props.title);
          if (read.length >= 3 && !game.hasFlag('fileTitans')) game.setFlag('fileTitans');
          LM.ui.showText(it.props.title || 'Plaque', it.props.text || '', it.props.kicker || 'Tartarus · Asterion Biologics');
        },
      },
      draw(g) {
        g.fillStyle = '#1a1008';
        g.fillRect(-11, -4, 22, 8);
        g.fillStyle = Z.bronze;
        g.fillRect(-10, -3.2, 20, 6.4);
        g.fillStyle = 'rgba(40,24,8,0.8)';
        for (let i = 0; i < 3; i++) g.fillRect(-8, -2 + i * 1.8, 16 - i * 4, 0.8);
      },
    },
    'ds-beacon': {
      name: 'Warning beacon', radius: 6, wallMounted: true, dressing: 'Tartarus', mapColor: 'none',
      light: { color: '#ffb040', radius: 140, intensity: 0.3, flicker: 0.5 },
      draw(g) {
        g.fillStyle = '#1a1008';
        g.fillRect(-4, -3, 8, 6);
        g.fillStyle = '#7a4a10';
        g.beginPath();
        g.arc(0, 0, 3, 0, TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        const a = t * 4 + it.tx;
        g.fillStyle = 'rgba(255,176,64,0.18)';
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, 60, a - 0.3, a + 0.3);
        g.closePath();
        g.fill();
        G.glow(g, 0, 0, 10, '#ffb040', 0.6 + 0.3 * Math.sin(t * 8));
      },
    },
    'ds-chains': {
      name: 'Chains', radius: 10, dressing: 'Tartarus', shadow: false, mapColor: 'none', z: 2,
      draw(g, it, t) {
        const n = it.props.n || 3;
        for (let c = 0; c < n; c++) {
          const sway = Math.sin(t * 0.8 + c * 1.7 + it.tx) * 3;
          const x0 = (c - (n - 1) / 2) * 8;
          g.strokeStyle = '#4a3a2a';
          g.lineWidth = 1.6;
          for (let i = 0; i < 6; i++) {
            const y = -18 + i * 6, x = x0 + sway * (i / 6);
            g.beginPath();
            g.ellipse(x, y, i % 2 ? 1.4 : 2.4, 3, 0, 0, TAU);
            g.stroke();
          }
          g.fillStyle = '#6a5a4a';
          g.beginPath();
          g.arc(x0 + sway, 18, 3, 0, TAU);
          g.fill();
        }
      },
    },
    'ds-feathers': {
      name: 'Feathers', radius: 14, dressing: 'Tartarus', shadow: false, mapColor: 'none', z: -2, cache: true, cacheRadius: 24,
      draw(g, it) {
        const r = U.mulberry32((it.tx * 31 + it.ty * 17) >>> 0);
        for (let i = 0; i < 9; i++) {
          g.save();
          g.translate((r() - 0.5) * 34, (r() - 0.5) * 26);
          g.rotate(r() * TAU);
          g.fillStyle = r() < 0.25 ? 'rgba(160,40,40,0.8)' : 'rgba(240,236,226,0.85)';
          g.beginPath();
          g.ellipse(0, 0, 6 + r() * 3, 1.6, 0, 0, TAU);
          g.fill();
          g.restore();
        }
        if (it.props.remains) {
          g.fillStyle = 'rgba(110,20,20,0.6)';
          g.beginPath();
          g.ellipse(0, 4, 12, 6, 0.3, 0, TAU);
          g.fill();
          g.fillStyle = '#d8d0c0';
          g.fillRect(-6, 2, 9, 2);
          g.fillRect(2, 5, 7, 1.6);
        }
      },
    },
    'ds-bones': {
      name: 'Bones', radius: 12, dressing: 'Tartarus', shadow: false, mapColor: 'none', z: -2, cache: true, cacheRadius: 20,
      draw(g, it) {
        const r = U.mulberry32((it.tx * 13 + it.ty * 29) >>> 0);
        g.fillStyle = '#d8ccb0';
        for (let i = 0; i < 7; i++) {
          g.save();
          g.translate((r() - 0.5) * 22, (r() - 0.5) * 16);
          g.rotate(r() * TAU);
          g.fillRect(-5, -0.9, 10, 1.8);
          g.beginPath();
          g.arc(-5, 0, 1.6, 0, TAU);
          g.arc(5, 0, 1.6, 0, TAU);
          g.fill();
          g.restore();
        }
        if (it.props.skull) {
          g.beginPath();
          g.arc(4, -3, 4, 0, TAU);
          g.fill();
          g.fillStyle = '#2a2420';
          g.fillRect(2, -4, 1.4, 1.4);
          g.fillRect(5, -4, 1.4, 1.4);
        }
      },
    },
    'ds-heir-nest': {
      name: 'A nest', radius: 16, dressing: 'Tartarus', shadow: false, mapColor: 'none', z: -2, cache: true, cacheRadius: 28,
      interact: {
        prompt: () => 'Look at the nest',
        use(it, game) {
          LM.ui.showText('Where they sleep', 'Coats from the board’s cloakroom, laid in a ring with the collars in. Pearls, a watch, a pair of cufflinks with little double-headed axes on them. In the middle, a child’s book about kings and queens, every page turned down at a coronation.', 'Sub-level B');
        },
      },
      draw(g, it) {
        const r = U.mulberry32((it.tx * 7 + it.ty * 3) >>> 0);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + r() * 0.3;
          g.save();
          g.translate(Math.cos(a) * 12, Math.sin(a) * 9);
          g.rotate(a + Math.PI / 2);
          g.fillStyle = ['#141416', '#2a2a34', '#3a1014', '#d8d4cc'][i % 4];
          g.beginPath();
          g.ellipse(0, 0, 9, 5, 0, 0, TAU);
          g.fill();
          g.restore();
        }
        g.fillStyle = '#efe8da';
        for (let i = 0; i < 8; i++) {
          g.beginPath();
          g.arc(-6 + i * 1.8, 4 + Math.sin(i) * 1.2, 0.9, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#6a2a3a';
        g.fillRect(-3, -3, 7, 5);
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('vaultOpen', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 220, freqEnd: 120, dur: 2.2, gain: 0.35, attack: 0.2 });
      for (let i = 0; i < 4; i++) kit.tone(t + i * 0.5, o, { type: 'square', f0: 70 + i * 6, dur: 0.12, gain: 0.04 });
      kit.noise(t + 2, o, { type: 'bandpass', freq: 600, dur: 0.4, gain: 0.15, q: 2 });
    });
  }

  LM.definePack({ id: 'ds-tartarus', items });
})();
