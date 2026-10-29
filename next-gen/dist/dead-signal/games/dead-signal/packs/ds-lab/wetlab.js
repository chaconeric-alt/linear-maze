/* Dead Signal — packs/ds-lab/wetlab.js
 * Floor 3's look: ds-wetlab, Gestation. Wet and green-black; the growth vats are the brightest things
 * on the floor. Sections of ceiling light have failed. The containment ring smells of the sea.
 *
 * Floor variants (legend `variant`):
 *   0 corridor tile (wet)       1 vat hall grating, over drainage   2 lab resin     3 office carpet
 *   4 briefing suite terrazzo   5 containment cell (stained resin)  6 concrete (stairs)
 *   7 pen floor (sawdust)       8 dark lab resin (no lights)
 *
 * Painters: wet-tile (square tiles with standing water in the grout), resin (a seamless poured floor,
 * stains and scuffs), sawdust (the colony pens), foam (a wall: biocontainment foam, set hard).
 * Terrain:
 *   ds-foam          biocontainment foam filling a doorway or a stairwell: a wall
 *   ds-door-clear3   a security door that opens for Level 3 clearance (flag clearance3, or master)
 *   ds-door-contain  a containment door: heavy, a round window, sealed until a trap unseals it
 *   ds-glass-broken  the floor where a cell's glass front was: shards
 *   ds-fluid         a spill of vat fluid: you wade it (slow, no dash)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;

  // ======================================================== painters
  const textures = {
    'wet-tile': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.grout;
        g.fillRect(x, y, T, T);
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const hsh = U.hash2(info.x * 2 + i, info.y * 2 + j, 31);
            const sx = x + i * 16 + 0.8, sy = y + j * 16 + 0.8;
            g.fillStyle = U.shade(p.tile, (hsh - 0.5) * 0.12);
            g.fillRect(sx, sy, 14.4, 14.4);
            g.fillStyle = 'rgba(255,255,255,0.05)';
            g.fillRect(sx, sy, 14.4, 0.6);
          }
        }
        // standing water: a sheen in the low corners, and the odd puddle
        const r = info.rnd;
        if (r() < 0.35) {
          const px = x + r() * T, py = y + r() * T, s = 4 + r() * 8;
          const grd = g.createRadialGradient(px, py, 0, px, py, s);
          grd.addColorStop(0, U.rgba(p.sheen, 0.16));
          grd.addColorStop(1, U.rgba(p.sheen, 0));
          g.fillStyle = grd;
          g.beginPath();
          g.ellipse(px, py, s * 1.4, s, r() * 3, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = 0; i < 6; i++) g.fillRect(x + r() * T, y + r() * T, 1, 1);
      },
    },
    resin: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        const tone = (U.hash2(info.x >> 2, info.y >> 2, 11) - 0.5) * 0.06;
        g.fillStyle = U.shade(p.base, tone);
        g.fillRect(x, y, T, T);
        // a faint sheen, poured
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        grd.addColorStop(0, 'rgba(255,255,255,0.03)');
        grd.addColorStop(1, 'rgba(0,0,0,0.05)');
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = U.rgba(p.fleck || '#8a9a94', 0.12 + r() * 0.12);
          g.fillRect(x + r() * T, y + r() * T, 0.9, 0.9);
        }
        // old stains that didn't come out
        if (p.stain && r() < (p.stains || 0.12)) {
          g.fillStyle = U.rgba(p.stain, 0.18 + r() * 0.12);
          g.beginPath();
          g.ellipse(x + r() * T, y + r() * T, 3 + r() * 7, 2 + r() * 5, r() * 3, 0, U.TAU);
          g.fill();
        }
        // scuffs: wheels, and things dragged
        if (r() < 0.25) {
          g.strokeStyle = 'rgba(0,0,0,0.12)';
          g.lineWidth = 0.8;
          g.beginPath();
          const a = r() * 6;
          const cx = x + r() * T, cy = y + r() * T;
          g.moveTo(cx, cy);
          g.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
          g.stroke();
        }
      },
    },
    sawdust: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.base;
        g.fillRect(x, y, T, T);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = U.rgba(r() < 0.5 ? p.light : p.dark, 0.3 + r() * 0.3);
          g.fillRect(x + r() * T, y + r() * T, 1 + r() * 2, 0.7);
        }
        if (r() < 0.2) {
          g.fillStyle = 'rgba(70,20,20,0.25)';
          g.beginPath();
          g.ellipse(x + r() * T, y + r() * T, 4 + r() * 5, 3, r() * 3, 0, U.TAU);
          g.fill();
        }
      },
    },
    // a wall painter: biocontainment foam, sprayed in and set hard, bulging out of the opening
    foam: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        const r = info.rnd;
        for (let i = 0; i < 9; i++) {
          const bx = x + r() * T, by = y + r() * h, s = 4 + r() * 7;
          const grd = g.createRadialGradient(bx - s * 0.3, by - s * 0.3, 0, bx, by, s);
          grd.addColorStop(0, U.shade(p.top[0], 0.18));
          grd.addColorStop(1, U.shade(p.top[0], -0.12));
          g.fillStyle = grd;
          g.beginPath();
          g.arc(bx, by, s, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = 'rgba(120,100,40,0.15)';
        for (let i = 0; i < 12; i++) g.fillRect(x + r() * T, y + r() * h, 1, 1);
      },
      face(g, x, y, fh, info, p) {
        g.fillStyle = p.face;
        g.fillRect(x, y, T, fh);
        const r = info.rnd;
        for (let i = 0; i < 5; i++) {
          g.fillStyle = U.shade(p.face, (r() - 0.5) * 0.2);
          g.beginPath();
          g.arc(x + r() * T, y + fh * 0.4, 2.5 + r() * 3, 0, Math.PI);
          g.fill();
        }
      },
    },
  };
  DS.FOAM = { style: 'foam', top: ['#d8d2a8'], edge: '#ece6c0', face: '#b8b088', faceDark: '#98906a' };

  // ======================================================== the containment door
  function contain(ctx, door) {
    ctx.save();
    ctx.translate(door.x, door.y);
    if (!door.horizontal) ctx.rotate(Math.PI / 2);
    const half = T / 2, k = U.ease.inOutSine(door.open), slide = k * (T - 3);
    // one heavy leaf that slides into the wall
    ctx.save();
    ctx.translate(slide, 0);
    ctx.fillStyle = '#1f2326';
    ctx.fillRect(-half, -7, T, 14);
    ctx.fillStyle = '#4a545a';
    ctx.fillRect(-half + 1, -6, T - 2, 12);
    DS.hazard(ctx, -half + 1, -6, 3, 12, 2);
    DS.hazard(ctx, half - 4, -6, 3, 12, 2);
    // the round window
    ctx.fillStyle = '#121619';
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,180,160,0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, U.TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#16191b';
    ctx.fillRect(-half, -8, 3, 16);
    ctx.fillRect(half - 3, -8, 3, 16);
    ctx.restore();
  }
  function containGlow(ctx, door, game, t) {
    const open = door.open > 0.5 && !door.sealed;
    const c = open ? '#5fe08a' : door.sealed ? '#ff3a2a' : '#e0b25a';
    const lx = door.x + (door.horizontal ? -11 : -10), ly = door.y + (door.horizontal ? -10 : -11);
    DS.led(ctx, lx, ly, c, open ? 0.45 : 0.5 + 0.35 * (Math.sin(t * 3) > 0 ? 1 : 0), 0.9);
  }

  // ======================================================== the floor
  const office = LM.find('environments', 'office');
  const clean = LM.find('environments', 'ds-cleanroom');
  const glass = office && office.doorStyles ? { glass: office.doorStyles.glass, stall: office.doorStyles.stall } : {};
  const environments = {
    'ds-wetlab': {
      name: 'Asterion · Gestation',
      voidColor: '#050706',
      ambient: '#28322e',
      attractAmbient: '#4f5c56',
      outsideSight: '#1c2220',
      playerLight: '#eafff2',
      torch: '#ff6a50',
      floors: {
        0: { style: 'wet-tile', tile: '#46524d', grout: '#252d2a', sheen: '#9ad8c0' },
        1: { style: 'grate', under: '#08100c', heat: '#2f7a52', bar: '#47544d' },
        2: { style: 'resin', base: '#34413c', stain: '#5a1a1a', fleck: '#8aa49a', stains: 0.14 },
        3: { style: 'carpet-tile', colors: ['#323848', '#2e3444'], line: '#6a7488', speck: '#151820' },
        4: { style: 'terrazzo', base: '#b6c2c8', chips: ['#a6b4bc', '#5f7f8a', '#e6eef0', '#7fd4ff', '#3e5058'], strip: '#7fd4ff' },
        5: { style: 'resin', base: '#2a302d', stain: '#6a1414', fleck: '#6a7a74', stains: 0.45 },
        6: { style: 'concrete', base: '#555a58', joint: 3 },
        7: { style: 'sawdust', base: '#5a4e3a', light: '#a89470', dark: '#2e2618' },
        8: { style: 'resin', base: '#1c2320', stain: '#3a1010', fleck: '#4a5a54', stains: 0.2 },
      },
      floor: { style: 'wet-tile', tile: '#46524d', grout: '#252d2a', sheen: '#9ad8c0' },
      wall: { style: 'drywall', top: ['#5a6660'], edge: '#7d8c85', face: '#47524d', faceDark: '#313a36', base: '#171c1a' },
      water: { deep: '#14261c', shallow: '#2a4634', foam: '#a8d8b0' },
      pit: { core: '#020303', wall: '#141816', rim: '#2e3632' },
      door: { panel: '#59646a', frame: '#2c3236', trim: '#9aa8ae' },
      doorStyles: Object.assign({}, glass, DS.doorStyles, clean ? clean.doorStyles : {}, { contain }),
      doorGlows: Object.assign({}, DS.doorGlows, clean ? clean.doorGlows : {}, { contain: containGlow }),
      particles: { type: 'mote', color: '#c8f0d8', rate: 2, alpha: 0.08, drift: 3 },
      ambience: { base: 44, cutoff: 240, wind: 360, gain: 0.05, wave: 'sine' },
    },
  };

  // ======================================================== terrain
  const doorT = (spec, mapColor) => ({
    floorLike: true, door: spec, mapColor: mapColor || 'rgba(205,190,160,0.16)',
    bake(g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      const horiz = info.across != null ? info.across : info.n(-1, 0).solid || info.n(1, 0).solid;
      g.fillStyle = 'rgba(0,0,0,0.38)';
      if (horiz) g.fillRect(x, y + T / 2 - 8, T, 16);
      else g.fillRect(x + T / 2 - 8, y, 16, T);
    },
  });
  const water = LM.find('terrain', 'water');
  const terrain = {
    'ds-foam': {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor: '#c8c098',
      bake: (g, x, y, info) => LM.paintWall(g, x, y, info, DS.FOAM),
    },
    'ds-door-clear3': doorT({ lock: null, style: 'security', flag: ['clearance3', 'master'], need: 'Level 3 clearance', color: '#58b2ff' }, '#58b2ff'),
    'ds-door-contain': doorT({ lock: null, style: 'contain' }, '#c0503a'),
    'ds-glass-broken': {
      floorLike: true, mapColor: 'rgba(205,215,220,0.2)',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        const r = info.rnd;
        g.fillStyle = 'rgba(200,230,240,0.45)';
        for (let i = 0; i < 14; i++) {
          const px = x + r() * T, py = y + T / 2 + (r() - 0.5) * 20, s = 1 + r() * 3;
          g.beginPath();
          g.moveTo(px, py - s);
          g.lineTo(px + s, py + s * 0.6);
          g.lineTo(px - s * 0.8, py + s * 0.4);
          g.closePath();
          g.fill();
        }
      },
    },
    'ds-fluid': {
      swim: true, noDecals: true, mapColor: '#3a6a4a',
      bake: (g, x, y, info) => (water && water.bake ? water.bake(g, x, y, info) : null),
      drawDynamic: water && water.drawDynamic,
      drawGlow(g, x, y, tx, ty, game, t) {
        const r = U.mulberry32(((tx * 92821) ^ (ty * 68917) ^ Math.floor(t * 0.8)) >>> 0);
        if (r() < 0.75) return;
        G.glow(g, x + r() * T, y + r() * T, 6, '#8fe0a8', 0.18);
      },
    },
  };

  LM.definePack({ id: 'ds-lab', textures, environments, terrain });
})();
