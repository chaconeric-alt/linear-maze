/* Dead Signal — packs/ds-executive/environment.js
 * Floor 5's look: ds-executive, the executive floor, and its upper level, 5a. The board's floor: dark
 * wood and red wood, polished marble, black and green, jade and amber, brass. Low warm light; silence.
 *
 * Floor variants (legend `variant`):
 *   0 black marble, green-veined (corridors, reception)    1 jade marble, gold inlay (the Rotunda)
 *   2 rosewood herringbone (the corner offices)            3 jade carpet, amber border (anterooms, library)
 *   4 kitchen steel                                       5 dining carpet, oxblood and gold
 *   6 stone (stairs)                                      7 black marble, amber inlay (the Gallery)
 *   8 clerical carpet tile (the typing pool)               9 steel plate (robot chambers, plant rooms)
 *   10 ebony parquet (the boardroom, Voss's rooms)        11 the nest: silk over carpet
 *
 * Painters: marble (slabs that run across tiles, veins that cross them, inlaid joints), herringbone
 * (wood blocks at forty-five degrees, laid across the whole floor), silk (a floor under webbing),
 * paneling (a wall: a wood top with a brass lip, and on its face raised panels, a jade inlay and a
 * skirting), marble-wall (green marble, fluted, a gilt band), tile-wall (kitchen white tile on steel).
 * Terrain:
 *   ds-exec-wall, ds-exec-wall-jade, ds-exec-wall-steel, ds-exec-wall-board   the walls
 *   ds-glass-floor   a glass floor: you walk on it and see the floor below (the level's `below`)
 *   ds-atrium        the open well of an atrium: you see the floor below; a balustrade round its edge
 *                    (solid; shots and light cross it)
 *   ds-hotplate      a kitchen's induction plate: it glows and burns on a cycle, until kitchenOff
 *   ds-private-up    the board's private stairs, up (exit: a spiral of wood and brass)
 *   ds-private-down  the same stairs, down (entry)
 *   ds-door-exec     double doors in dark wood, brass handles
 *   ds-door-office   a corner office's door: a nameplate; locked to the floor's own flag (props/terrain door)
 *   ds-door-blast    the boardroom's blast shutters (sealed)
 *   ds-door-secret   a bookcase that's a door (sealed until a trap opens it)
 *   ds-door-control  the Control Room: opens for master
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {});
  const X = (DS.X = {
    wood: '#3a2014', rosewood: '#5a2418', walnut: '#2a170e', jade: '#3f8a6e', jadeDark: '#1f4a3a', jadeLight: '#7ac8a4',
    amber: '#e8a440', amberLight: '#ffd28a', brass: '#c9a046', black: '#0f100f', green: '#1d3a2c', ivory: '#efe6d2', oxblood: '#4a1416',
  });

  // ======================================================== painters
  const slabRnd = (sx, sy, k) => U.mulberry32((((sx * 7349) ^ (sy * 9157)) + k * 31) >>> 0);
  const textures = {
    // polished marble slabs (p.slab tiles a side), joints inlaid, veins that run across the joints
    marble: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const S = (p.slab || 2) * T;
        const wx = info.x * T, wy = info.y * T;
        const sx = Math.floor(wx / S), sy = Math.floor(wy / S);
        g.save();
        g.beginPath();
        g.rect(x, y, T, T);
        g.clip();
        // each slab its own shade
        const r0 = slabRnd(sx, sy, 1);
        g.fillStyle = U.shade(p.base, (r0() - 0.5) * 0.1);
        g.fillRect(x, y, T, T);
        // clouds in the stone
        for (let i = 0; i < 3; i++) {
          const cx = sx * S + r0() * S - wx + x, cy = sy * S + r0() * S - wy + y;
          const grd = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.5);
          grd.addColorStop(0, U.rgba(p.cloud || p.base, 0.18));
          grd.addColorStop(1, U.rgba(p.cloud || p.base, 0));
          g.fillStyle = grd;
          g.fillRect(x, y, T, T);
        }
        // veins: long, faint, gently curving, drawn in the slab's frame so they carry on from tile to tile
        for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]]) {
          const r = slabRnd(sx + ox, sy + oy, 7);
          const bx = (sx + ox) * S - wx + x, by = (sy + oy) * S - wy + y;
          const n = 1 + (r() < 0.45 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const col = p.veins[Math.floor(r() * p.veins.length)];
            const a = r() * Math.PI;
            const cx = bx + S * (0.25 + r() * 0.5), cy = by + S * (0.25 + r() * 0.5), L = S * (0.7 + r() * 0.6);
            const x0 = cx - Math.cos(a) * L, y0 = cy - Math.sin(a) * L, x1 = cx + Math.cos(a) * L, y1 = cy + Math.sin(a) * L;
            const bend = (r() - 0.5) * S * 0.6;
            const mx = cx - Math.sin(a) * bend, my = cy + Math.cos(a) * bend;
            g.strokeStyle = U.rgba(col, (p.veinAlpha || 0.16) * (0.6 + r() * 0.6));
            g.lineWidth = 0.4 + r() * 0.7;
            g.beginPath();
            g.moveTo(x0, y0);
            g.quadraticCurveTo(mx, my, x1, y1);
            g.stroke();
            // a hair-thin branch off it, now and then
            if (r() < 0.5) {
              const t0 = 0.3 + r() * 0.4, qx = (1 - t0) * (1 - t0) * x0 + 2 * (1 - t0) * t0 * mx + t0 * t0 * x1, qy = (1 - t0) * (1 - t0) * y0 + 2 * (1 - t0) * t0 * my + t0 * t0 * y1;
              const b = a + (r() < 0.5 ? 0.6 : -0.6), bl = S * (0.2 + r() * 0.3);
              g.lineWidth = 0.35;
              g.beginPath();
              g.moveTo(qx, qy);
              g.quadraticCurveTo(qx + Math.cos(b) * bl * 0.5 + (r() - 0.5) * 6, qy + Math.sin(b) * bl * 0.5 + (r() - 0.5) * 6, qx + Math.cos(b) * bl, qy + Math.sin(b) * bl);
              g.stroke();
            }
          }
        }
        g.restore();
        // the joints between slabs, inlaid
        const jx = wx % S === 0, jy = wy % S === 0;
        g.fillStyle = p.joint || 'rgba(0,0,0,0.5)';
        if (jx) g.fillRect(x, y, p.inlay ? 1.4 : 0.8, T);
        if (jy) g.fillRect(x, y, T, p.inlay ? 1.4 : 0.8);
        if (p.inlay) {
          g.fillStyle = U.rgba(p.inlay, 0.75);
          if (jx) g.fillRect(x + 0.3, y, 0.6, T);
          if (jy) g.fillRect(x, y + 0.3, T, 0.6);
        }
        // a high polish
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        grd.addColorStop(0, 'rgba(255,250,235,' + (p.sheen == null ? 0.07 : p.sheen) + ')');
        grd.addColorStop(0.5, 'rgba(255,250,235,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.08)');
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
      },
    },
    // wood blocks laid at forty-five degrees, in a pattern that runs across the floor
    herringbone: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.gap || '#120a06';
        g.fillRect(x, y, T, T);
        g.save();
        g.beginPath();
        g.rect(x, y, T, T);
        g.clip();
        const L = 16, W = 5.6; // a block's length and width
        const wx = info.x * T, wy = info.y * T;
        // in the floor's frame: columns of chevrons, every W across
        const c0 = Math.floor((wx - L) / W), c1 = Math.ceil((wx + T + L) / W);
        for (let c = c0; c <= c1; c++) {
          const colX = c * W;
          const flip = c % 2 === 0;
          const r0 = Math.floor((wy - L * 2) / W), r1 = Math.ceil((wy + T + L) / W);
          for (let rw = r0; rw <= r1; rw++) {
            const by = rw * W;
            const h = U.hash2(c, rw, 11);
            g.fillStyle = U.shade(p.colors[Math.floor(h * p.colors.length)], (h - 0.5) * 0.14);
            g.save();
            g.translate(colX - wx + x, by - wy + y);
            g.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
            g.fillRect(0, 0, L, W - 0.7);
            g.fillStyle = 'rgba(255,240,220,0.06)';
            g.fillRect(0, 0, L, 0.6);
            g.restore();
          }
        }
        g.restore();
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        grd.addColorStop(0, 'rgba(255,220,180,0.06)');
        grd.addColorStop(1, 'rgba(0,0,0,0.12)');
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
      },
    },
    // a floor under webbing: what it was, and silk over it
    silk: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.base;
        g.fillRect(x, y, T, T);
        for (let i = 0; i < 14; i++) {
          g.fillStyle = U.rgba('#000000', 0.08);
          g.fillRect(x + r() * T, y + r() * T, 2, 2);
        }
        g.strokeStyle = U.rgba(p.silk, 0.22);
        g.lineWidth = 0.6;
        for (let i = 0; i < 7; i++) {
          g.beginPath();
          const a = r() * U.TAU, cx = x + r() * T, cy = y + r() * T, l = 10 + r() * 22;
          g.moveTo(cx - Math.cos(a) * l, cy - Math.sin(a) * l);
          g.quadraticCurveTo(cx + (r() - 0.5) * 8, cy + (r() - 0.5) * 8, cx + Math.cos(a) * l, cy + Math.sin(a) * l);
          g.stroke();
        }
        if (r() < 0.25) {
          g.fillStyle = U.rgba(p.silk, 0.14);
          g.beginPath();
          g.ellipse(x + r() * T, y + r() * T, 5 + r() * 8, 3 + r() * 5, r() * 3, 0, U.TAU);
          g.fill();
        }
      },
    },
    // a wood-panelled wall: the top in dark wood with a brass lip; the face in raised panels over a skirting
    paneling: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        // the grain, running along the wall
        const r = info.rnd;
        for (let i = 0; i < 5; i++) {
          g.fillStyle = U.rgba(i % 2 ? '#000000' : '#ffffff', 0.04 + r() * 0.04);
          g.fillRect(x, y + r() * h, T, 0.5 + r());
        }
        if (p.cap) {
          g.fillStyle = U.rgba(p.cap, 0.35);
          g.fillRect(x, y + h / 2 - 0.5, T, 1);
        }
      },
      face(g, x, y, fh, info, p) {
        g.fillStyle = p.face;
        g.fillRect(x, y, T, fh);
        // two raised panels a tile
        for (let i = 0; i < 2; i++) {
          const px = x + 1.5 + i * 16;
          g.fillStyle = p.panel;
          g.fillRect(px, y + 1, 13, fh - 4);
          g.fillStyle = 'rgba(255,230,200,0.12)';
          g.fillRect(px, y + 1, 13, 0.6);
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(px, y + fh - 3.6, 13, 0.6);
        }
        if (p.inlay) {
          g.fillStyle = p.inlay;
          g.fillRect(x, y + fh * 0.42, T, 0.9);
        }
        g.fillStyle = p.base;
        g.fillRect(x, y + fh - 2.2, T, 2.2);
        g.fillStyle = U.rgba(p.edge, 0.5);
        g.fillRect(x, y + fh - 2.2, T, 0.5);
      },
    },
    // green marble, fluted pilasters, a gilt band
    'marble-wall': {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        const r = info.rnd;
        g.strokeStyle = U.rgba(p.vein, 0.4);
        g.lineWidth = 0.6;
        for (let i = 0; i < 2; i++) {
          g.beginPath();
          g.moveTo(x + r() * T, y);
          g.quadraticCurveTo(x + r() * T, y + h / 2, x + r() * T, y + h);
          g.stroke();
        }
      },
      face(g, x, y, fh, info, p) {
        const grd = g.createLinearGradient(x, y, x, y + fh);
        grd.addColorStop(0, p.face);
        grd.addColorStop(1, U.shade(p.face, -0.3));
        g.fillStyle = grd;
        g.fillRect(x, y, T, fh);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 2; i < T; i += 4) g.fillRect(x + i, y + 1.5, 0.8, fh - 3.5);
        g.fillStyle = p.gilt;
        g.fillRect(x, y, T, 1.2);
        g.fillRect(x, y + fh - 1.6, T, 1.6);
      },
    },
    // a kitchen wall: white tile over a steel kick
    'tile-wall': {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(x, y + 2, T, 0.6);
      },
      face(g, x, y, fh, info, p) {
        g.fillStyle = p.face;
        g.fillRect(x, y, T, fh);
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < T; i += 8) g.fillRect(x + i + ((info.y % 2) * 4), y, 0.6, fh - 2);
        g.fillRect(x, y + fh / 2 - 1, T, 0.6);
        g.fillStyle = p.base;
        g.fillRect(x, y + fh - 2, T, 2);
      },
    },
  };

  const WALL = {
    exec: { style: 'paneling', top: ['#24140c'], cap: X.brass, edge: X.brass, face: '#3a1e12', panel: '#4e2818', inlay: U.rgba(X.jade, 0.8), base: '#140a06', trim: X.amber },
    jade: { style: 'marble-wall', top: ['#1c3a2e'], vein: '#7ac8a4', edge: X.brass, face: '#2a5a46', gilt: X.brass, trim: X.amber },
    steel: { style: 'tile-wall', top: ['#3a3d40'], edge: '#8a9096', face: '#d8d8d0', base: '#3a3d40' },
    board: { style: 'paneling', top: ['#0e0e0e'], cap: X.amber, edge: X.amber, face: '#141414', panel: '#1e1c1a', inlay: U.rgba(X.amber, 0.7), base: '#060606', trim: X.amber },
  };
  DS.EXEC_WALL = WALL;

  // ======================================================== door styles
  function leaves(ctx, door, paint) {
    const half = T / 2, k = U.ease.inOutSine(door.open), slide = k * (half - 2);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * slide, 0);
      paint(side < 0 ? -half : 0, side);
      ctx.restore();
    }
  }
  const doorStyles = {
    // dark wood double doors, brass pulls
    exec(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0, side) => {
        ctx.fillStyle = '#1e0f08';
        ctx.fillRect(x0, -5, half, 10);
        ctx.fillStyle = '#4a2416';
        ctx.fillRect(x0 + 0.8, -4.2, half - 1.6, 8.4);
        ctx.fillStyle = 'rgba(255,220,180,0.1)';
        ctx.fillRect(x0 + 0.8, -4.2, half - 1.6, 0.6);
        ctx.fillStyle = X.brass;
        ctx.fillRect(x0 + (side < 0 ? half - 3.4 : 1.6), -2.6, 1.8, 5.2);
        if (door.flag && !door.unlocked) {
          ctx.fillStyle = door.flagColor || X.amber;
          ctx.fillRect(x0 + (side < 0 ? half - 2 : 0.4), -5, 1.6, 10);
        }
      });
      ctx.fillStyle = '#120804';
      ctx.fillRect(-half, -6, 2.6, 12);
      ctx.fillRect(half - 2.6, -6, 2.6, 12);
      ctx.restore();
    },
    // the boardroom's blast shutters: thick steel slabs, hazard edges, bolted
    blast(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0) => {
        ctx.fillStyle = '#1a1b1d';
        ctx.fillRect(x0, -8, half, 16);
        ctx.fillStyle = '#3a3c40';
        ctx.fillRect(x0 + 1, -7, half - 2, 14);
        ctx.fillStyle = '#2a2c30';
        for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 1, -6 + i * 4.6, half - 2, 1);
        ctx.fillStyle = '#7a7f86';
        for (const bx of [3, half - 4]) for (const by of [-5, 4]) ctx.fillRect(x0 + bx, by, 1.2, 1.2);
      });
      // the frame and its stripes
      ctx.fillStyle = '#0c0c0c';
      ctx.fillRect(-half - 1, -9, 4, 18);
      ctx.fillRect(half - 3, -9, 4, 18);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#141414' : X.amber;
        ctx.fillRect(-half - 1, -9 + i * 4.5, 4, 4.5);
        ctx.fillRect(half - 3, -9 + i * 4.5, 4, 4.5);
      }
      ctx.restore();
    },
    // a bookcase: books on shelves, and it swings aside when it opens
    secret(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2, k = U.ease.inOutSine(door.open);
      ctx.translate(-half, -5);
      ctx.rotate(-k * 1.35);
      ctx.fillStyle = '#2a170e';
      ctx.fillRect(0, 0, T, 10);
      for (let i = 0; i < 9; i++) {
        const h = U.hash2(door.tx * 9 + i, door.ty, 3);
        ctx.fillStyle = ['#5a1a16', '#1f4a3a', '#3a2a5a', '#6a5a2a', '#2a2a2a'][Math.floor(h * 5)];
        ctx.fillRect(1 + i * 3.4, 1.2 + h * 1.5, 2.8, 7.4 - h * 1.5);
      }
      ctx.fillStyle = X.brass;
      ctx.fillRect(0, 0, T, 0.8);
      ctx.restore();
    },
  };
  const doorGlows = {
    blast(ctx, door, game, t) {
      if (door.sealed) G.glow(ctx, door.x, door.y, 26, '#ff3a2a', 0.25 + 0.15 * Math.sin(t * 3));
    },
    secret() {},
  };

  // ======================================================== environment
  const office = LM.find('environments', 'office');
  const glass = office && office.doorStyles ? { glass: office.doorStyles.glass } : {};
  const environments = {
    'ds-executive': {
      name: 'Asterion · The Executive Floor',
      voidColor: '#050605',
      ambient: '#28291f',
      attractAmbient: '#5a5240',
      outsideSight: '#1b1c17',
      playerLight: '#fff0d8',
      torch: '#ffb060',
      floors: {
        0: { style: 'marble', base: '#141614', cloud: '#26342c', veins: ['#3f8a6e', '#5aa886', '#8a9a90'], veinAlpha: 0.2, slab: 2, joint: 'rgba(0,0,0,0.6)', inlay: null, sheen: 0.08 },
        1: { style: 'marble', base: '#24503e', cloud: '#5aa888', veins: ['#a8e0c4', '#0e2a20', '#e8e0c0'], veinAlpha: 0.22, slab: 2, joint: '#0e1e18', inlay: '#c9a046', sheen: 0.1 },
        2: { style: 'herringbone', colors: ['#5a2418', '#4a1c12', '#66301e', '#3e1810'], gap: '#140806' },
        3: { style: 'carpet', base: '#173a2c', pattern: '#1f4a3a', border: '#e0a040' },
        4: { style: 'clean-panel', base: '#3a3c3e', seam: '#1a1b1c' },
        5: { style: 'carpet', base: '#3a1012', pattern: '#4a1618', border: '#c9a046' },
        6: { style: 'marble', base: '#2a2824', cloud: '#4a463e', veins: ['#6a665c'], veinAlpha: 0.18, slab: 1, joint: 'rgba(0,0,0,0.5)', sheen: 0.04 },
        7: { style: 'marble', base: '#0e0f0e', cloud: '#1c2622', veins: ['#2f5a48', '#6a7a70'], veinAlpha: 0.2, slab: 2, joint: '#000000', inlay: '#e8a440', sheen: 0.09 },
        8: { style: 'carpet-tile', colors: ['#3a4038', '#343a32', '#3e443c'], line: '#0c0e0c', speck: '#7a8070', accent: '#c9a046' },
        9: { style: 'plates', colors: ['#3a3d40', '#36393c', '#3e4144'], seam: '#151617', rivet: '#6a6f76', rust: '#4a3020', stripe: ['#e8a440', '#141414'] },
        10: { style: 'parquet', colors: ['#1e120c', '#2a1810', '#160c08'], gap: '#060302' },
        11: { style: 'silk', base: '#1a2a22', silk: '#e8e0d0' },
      },
      floor: { style: 'marble', base: '#141614', cloud: '#26342c', veins: ['#3f8a6e', '#5aa886', '#8a9a90'], veinAlpha: 0.2, slab: 2, joint: 'rgba(0,0,0,0.6)', sheen: 0.08 },
      wall: WALL.exec,
      water: { deep: '#0e2a24', shallow: '#1f4a3a', foam: '#a8e0c4' },
      pit: { core: '#030303', wall: '#141614', rim: '#2a2c2a' },
      door: { panel: '#4a2416', frame: '#1e0f08', trim: X.brass },
      doorStyles: Object.assign({}, glass, DS.doorStyles || {}, doorStyles),
      doorGlows: Object.assign({}, DS.doorGlows || {}, doorGlows),
      particles: { type: 'mote', color: '#ffe0b0', rate: 1.6, alpha: 0.08, drift: 2 },
      ambience: { base: 46, cutoff: 260, wind: 120, gain: 0.04, wave: 'sine' },
    },
  };

  // ======================================================== terrain
  const wallT = (pal, mapColor) => ({ solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor, palette: pal, bake: (g, x, y, info) => LM.paintWall(g, x, y, info, pal) });
  const doorT = (spec, mapColor) => ({
    floorLike: true, door: spec, mapColor: mapColor || 'rgba(205,190,160,0.16)',
    bake(g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      const horiz = info.across != null ? info.across : info.n(-1, 0).solid || info.n(1, 0).solid;
      g.fillStyle = 'rgba(0,0,0,0.4)';
      if (horiz) g.fillRect(x, y + T / 2 - 8, T, 16);
      else g.fillRect(x + T / 2 - 8, y, 16, T);
    },
  });
  // the board's spiral stair: treads round a newel post, a brass rail. A 2 × 2 block of the same stairs is
  // one stair: each tile draws its quarter of a spiral centred on the block's middle.
  function spiralBake(up) {
    return function (g, x, y, info) {
      LM.paintFloor(g, x, y, Object.assign({}, info, { variant: 6 }));
      const same = (dx, dy) => info.level.t(info.x + dx, info.y + dy) === info.level.t(info.x, info.y);
      // where this tile sits in its block: the block's middle is the corner it shares with its neighbours
      const hx = same(1, 0) ? 1 : same(-1, 0) ? -1 : 0, hy = same(0, 1) ? 1 : same(0, -1) ? -1 : 0;
      const big = hx && hy;
      const cx = big ? (hx > 0 ? x + T : x) : x + T / 2, cy = big ? (hy > 0 ? y + T : y) : y + T / 2;
      const R = big ? T - 2 : T / 2 - 1;
      g.save();
      g.beginPath();
      g.rect(x, y, T, T);
      g.clip();
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.beginPath();
      g.arc(cx, cy, R, 0, U.TAU);
      g.fill();
      const n = big ? 16 : 10;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * U.TAU - Math.PI / 2, a1 = a0 + U.TAU / n - 0.05;
        const k = up ? i / n : 1 - i / n;
        g.fillStyle = U.shade('#6a3a22', -0.55 + k * 0.65);
        g.beginPath();
        g.moveTo(cx + Math.cos(a0) * 4, cy + Math.sin(a0) * 4);
        g.arc(cx, cy, R - 2.5, a0, a1);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,230,200,' + (0.04 + k * 0.08) + ')';
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, R - 2.5, a0, a0 + 0.04);
        g.closePath();
        g.fill();
      }
      g.strokeStyle = X.brass;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(cx, cy, R - 1, 0, U.TAU);
      g.stroke();
      g.fillStyle = '#2a170e';
      g.beginPath();
      g.arc(cx, cy, 4.4, 0, U.TAU);
      g.fill();
      g.fillStyle = X.brass;
      g.beginPath();
      g.arc(cx, cy, 2, 0, U.TAU);
      g.fill();
      g.restore();
    };
  }
  const kitchenOn = (game) => !game.hasFlag('kitchenOff');
  const terrain = {
    'ds-exec-wall': wallT(WALL.exec, '#5a3a26'),
    'ds-exec-wall-jade': wallT(WALL.jade, '#2f6b55'),
    'ds-exec-wall-steel': wallT(WALL.steel, '#6a6e72'),
    'ds-exec-wall-board': wallT(WALL.board, '#3a3020'),
    // glass underfoot: the floor below shows through (the level's `below`); brass ribs, a sheen
    'ds-glass-floor': {
      floorLike: true, seeBelow: true, noDecals: true, mapColor: '#2f5a50',
      bake(g, x, y) {
        g.fillStyle = '#0a1210';
        g.fillRect(x, y, T, T);
      },
      drawDynamic(g, x, y, tx, ty, game, t) {
        const L = game.level, see = (dx, dy) => L.t(tx + dx, ty + dy).seeBelow;
        // reflections that slide as you move: one diagonal streak, cut to the tile by arithmetic (a canvas clip
        // per tile, every frame, is the expensive way)
        const P = game.player;
        const off = P ? (P.x * 0.15 + P.y * 0.1) % 64 : 0;
        const ax = x - 32 + off, ay = y + T + 16, bx = x + 16 + off, by = y - 16;
        let t0 = 0, t1 = 1;
        const dx = bx - ax, dy = by - ay;
        for (const [p, q] of [[-dx, ax - x], [dx, x + T - ax], [-dy, ay - y], [dy, y + T - ay]]) {
          if (p === 0) {
            if (q < 0) t1 = -1;
          } else {
            const r = q / p;
            if (p < 0) t0 = Math.max(t0, r);
            else t1 = Math.min(t1, r);
          }
        }
        if (t1 > t0) {
          g.strokeStyle = 'rgba(220,255,240,0.05)';
          g.lineWidth = 6;
          g.lineCap = 'butt';
          g.beginPath();
          g.moveTo(ax + dx * t0, ay + dy * t0);
          g.lineTo(ax + dx * t1, ay + dy * t1);
          g.stroke();
        }
        // the ribs: brass at the panes' edges, heavier where the glass meets the floor
        g.fillStyle = U.rgba(X.brass, 0.55);
        if (!(tx % 2)) g.fillRect(x - 0.5, y, 1, T);
        if (!(ty % 2)) g.fillRect(x, y - 0.5, T, 1);
        g.fillStyle = X.brass;
        if (!see(-1, 0)) g.fillRect(x, y, 2, T);
        if (!see(1, 0)) g.fillRect(x + T - 2, y, 2, T);
        if (!see(0, -1)) g.fillRect(x, y, T, 2);
        if (!see(0, 1)) g.fillRect(x, y + T - 2, T, 2);
      },
    },
    // the atrium's well: open to the floor below, a balustrade round it
    'ds-atrium': {
      solid: true, blocksShots: false, blocksLight: false, seeBelow: true, noDecals: true, noAO: true, mapColor: '#141c18',
      bake(g, x, y) {
        g.fillStyle = '#050605';
        g.fillRect(x, y, T, T);
      },
      drawDynamic(g, x, y, tx, ty, game) {
        const L = game.level, open = (dx, dy) => !L.t(tx + dx, ty + dy).seeBelow && !L.t(tx + dx, ty + dy).solid;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          if (!open(dx, dy)) continue;
          // the rail on the walkway's side of the edge: balusters, a polished handrail
          const hx = dx < 0 ? x : dx > 0 ? x + T - 5 : x, hy = dy < 0 ? y : dy > 0 ? y + T - 5 : y;
          const w = dx ? 5 : T, h = dy ? 5 : T;
          g.fillStyle = 'rgba(0,0,0,0.5)';
          g.fillRect(hx + (dx > 0 ? -2 : dx < 0 ? 5 : 0), hy + (dy > 0 ? -2 : dy < 0 ? 5 : 0), dx ? 2 : T, dy ? 2 : T);
          for (let i = 2; i < T; i += 4) {
            g.fillStyle = '#c9b48a';
            if (dx) g.fillRect(hx + 1, y + i, 3, 1.6);
            else g.fillRect(x + i, hy + 1, 1.6, 3);
          }
          g.fillStyle = '#3a2014';
          g.fillRect(hx + (dx ? 1.2 : 0), hy + (dy ? 1.2 : 0), dx ? 2.6 : w, dy ? 2.6 : h);
          g.fillStyle = 'rgba(255,220,170,0.35)';
          g.fillRect(hx + (dx ? 1.6 : 0), hy + (dy ? 1.6 : 0), dx ? 0.7 : w, dy ? 0.7 : h);
        }
      },
    },
    // an induction plate set into a kitchen counter run: glows, then burns, while the kitchen's on
    'ds-hotplate': {
      floorLike: true, hazard: 'heat', damage: 9, interval: 0.4, mapColor: '#6a3020',
      active: (game) => kitchenOn(game) && (game.time % 4) > 1.6,
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = '#121314';
        g.fillRect(x + 2, y + 2, T - 4, T - 4);
        g.strokeStyle = '#2a2c2e';
        g.lineWidth = 1;
        for (const [cx, cy] of [[9, 9], [23, 9], [9, 23], [23, 23]]) {
          g.beginPath();
          g.arc(x + cx, y + cy, 5, 0, U.TAU);
          g.stroke();
        }
      },
      drawDynamic(g, x, y, tx, ty, game, t) {
        if (!kitchenOn(game)) return;
        const ph = game.time % 4, k = ph < 1.6 ? (ph > 0.8 ? (ph - 0.8) / 0.8 : 0) * 0.4 : 1;
        if (k <= 0) return;
        for (const [cx, cy] of [[9, 9], [23, 9], [9, 23], [23, 23]]) {
          g.strokeStyle = 'rgba(255,' + Math.round(90 + 60 * k) + ',40,' + (0.4 + 0.5 * k) + ')';
          g.lineWidth = 1.4;
          g.beginPath();
          g.arc(x + cx, y + cy, 5, 0, U.TAU);
          g.stroke();
        }
      },
      drawGlow(g, x, y, tx, ty, game) {
        if (!kitchenOn(game)) return;
        const ph = game.time % 4;
        if (ph > 1.6) G.glow(g, x + T / 2, y + T / 2, 26, '#ff6a2a', 0.45);
        else if (ph > 0.8) G.glow(g, x + T / 2, y + T / 2, 20, '#ff6a2a', ((ph - 0.8) / 0.8) * 0.25);
      },
    },
    'ds-private-up': { floorLike: true, exit: true, mapColor: '#e0b25a', bake: spiralBake(true) },
    'ds-private-down': { floorLike: true, entry: true, mapColor: '#8a7a5a', bake: spiralBake(false) },
    'ds-door-exec': doorT({ style: 'exec' }),
    'ds-door-office': doorT({ style: 'exec' }),
    'ds-door-blast': doorT({ style: 'blast', sealed: true }, '#5a2020'),
    'ds-door-secret': doorT({ style: 'secret', sealed: true }, '#5a3a26'),
    'ds-door-control': doorT({ style: 'exec', flag: ['master'], need: 'The Director’s card', color: '#ff3a2a' }),
  };

  LM.definePack({ id: 'ds-executive', textures, environments, terrain });
})();
