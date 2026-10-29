/* Dead Signal — packs/ds-tartarus/environment.js
 * Sub-level B's look: ds-tartarus. Under the building, where Asterion keeps what it made and couldn't
 * unmake: black basalt, bronze vault doors and plating gone green at the seams, amber warning light, the
 * glow from the cells. (DESIGN.md 4.7.)
 *
 * Floor variants (legend `variant`):
 *   0 basalt: the tops of hexagonal columns, bronze in the cracks (the halls)
 *   1 bronze deck plate (the admin wing, the armory)       2 clean panel (Containment Control, Records)
 *   3 a cell's floor: scorched, a drain channel, gouges     4 the Leviathan's pit: dark jade sand
 *   5 the basin: black water over stone (Tiamat)            6 rime: white crystal frost (the Garden)
 *   7 the core: black glass with ARIADNE's blue traces      8 stone (the landing)
 *   9 dark carpet (Records' reading room)                   10 the Hundred-Handed's straw and bones
 *
 * Painters: basalt (hex column tops in world space), deck (riveted bronze plate, a tread pattern),
 * cellfloor (a cell's floor: p.base, p.mark, p.channel), circuit (glass, traces, nodes), vault-wall (a
 * wall: iron top with rows of bronze rivets; a face of bronze plates, ribbed, green at the seams).
 * Terrain:
 *   ds-tartarus-wall, ds-tartarus-wall-cell   walls (the halls' and the cells' own)
 *   ds-vault-glass    a viewing window: thick armoured glass in a bronze frame; you see in (and what's in
 *                     there sees out); variants tint it: 0 amber, 1 jade, 2 sea, 3 white, 4 red
 *   ds-vault-glass-cracked   the Garden's: cracked, crystal growing through
 *   ds-vault-seal     behind a vault door (the ds-vault-door item draws the door): solid until opened
 *   ds-tartarus-bars  bronze bars (the Hundred-Handed's cell): you can't pass; hands can
 *   ds-drain          a floor drain: what's under the floor comes up through these
 *   ds-door-bronze    heavy bronze doors            ds-door-core    the core's door (sealed; opens for armoryOpen)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {});
  const Z = (DS.Z = {
    bronze: '#b5803f', bronzeDark: '#6a4520', bronzeLight: '#e6b672', verdigris: '#4f8f7a', basalt: '#17151a', iron: '#2a2c30',
    amber: '#ffb040', red: '#ff3a2a', white: '#f2f0e8', jade: '#3f8a6e', sea: '#1d4a66', blue: '#7fd4ff',
  });

  // ======================================================== painters
  const H3 = Math.sqrt(3);
  const textures = {
    // the tops of basalt columns: a hex grid laid in world space, each column its own shade, bronze in the cracks
    basalt: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const R = p.hex || 13;
        const wx = info.x * T, wy = info.y * T;
        g.save();
        g.beginPath();
        g.rect(x, y, T, T);
        g.clip();
        g.fillStyle = p.grout || '#0a0908';
        g.fillRect(x, y, T, T);
        const cw = R * 1.5, chh = R * H3;
        const c0 = Math.floor((wx - R) / cw), c1 = Math.ceil((wx + T + R) / cw);
        for (let c = c0; c <= c1; c++) {
          const oy = c % 2 ? chh / 2 : 0;
          const r0 = Math.floor((wy - chh - oy) / chh), r1 = Math.ceil((wy + T + chh - oy) / chh);
          for (let r = r0; r <= r1; r++) {
            const cx = c * cw - wx + x, cy = r * chh + oy - wy + y;
            const h = U.hash2(c, r, 11);
            g.fillStyle = U.shade(p.base, (h - 0.5) * 0.22);
            g.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * U.TAU;
              const px = cx + Math.cos(a) * (R - 1.1), py = cy + Math.sin(a) * (R - 1.1);
              if (i) g.lineTo(px, py);
              else g.moveTo(px, py);
            }
            g.closePath();
            g.fill();
            // the column's worn top: lighter toward the north-west
            g.fillStyle = 'rgba(255,240,220,' + (0.02 + h * 0.03) + ')';
            g.beginPath();
            g.arc(cx - R * 0.25, cy - R * 0.25, R * 0.45, 0, U.TAU);
            g.fill();
            // a crack filled with bronze, now and then
            if (h > 0.86 && p.crack) {
              g.strokeStyle = U.rgba(p.crack, 0.55);
              g.lineWidth = 0.8;
              g.beginPath();
              g.moveTo(cx - R * 0.5, cy - R * 0.2);
              g.lineTo(cx + R * (0.1 - h * 0.2), cy + R * 0.1);
              g.lineTo(cx + R * 0.5, cy + R * 0.35);
              g.stroke();
            }
          }
        }
        g.restore();
      },
    },
    // bronze-tinted deck plate: four panels a tile, rivets at the corners, a tread of little lozenges
    deck: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = U.mulberry32((info.x * 7919 + info.y * 104729) >>> 0);
        g.fillStyle = U.shade(p.base, (r() - 0.5) * 0.06);
        g.fillRect(x, y, T, T);
        g.fillStyle = 'rgba(255,220,160,0.05)';
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            g.save();
            g.translate(x + 4 + i * 8, y + 4 + j * 8);
            g.rotate(((i + j) % 2 ? 1 : -1) * 0.6);
            g.fillRect(-2.2, -0.7, 4.4, 1.4);
            g.restore();
          }
        }
        g.fillStyle = p.seam;
        g.fillRect(x, y, T, 1);
        g.fillRect(x, y, 1, T);
        g.fillStyle = p.rivet;
        for (const [rx, ry] of [[3, 3], [T - 4, 3], [3, T - 4], [T - 4, T - 4]]) {
          g.beginPath();
          g.arc(x + rx, y + ry, 1.1, 0, U.TAU);
          g.fill();
        }
        if (r() < 0.12) {
          g.fillStyle = 'rgba(79,143,122,0.18)';
          g.beginPath();
          g.ellipse(x + r() * T, y + r() * T, 4 + r() * 6, 2 + r() * 3, r() * 3, 0, U.TAU);
          g.fill();
        }
      },
    },
    // a cell's floor: poured stone, scorched, a drain channel down the middle and gouges
    cellfloor: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = U.mulberry32((info.x * 3571 + info.y * 6113) >>> 0);
        g.fillStyle = U.shade(p.base, (r() - 0.5) * 0.12);
        g.fillRect(x, y, T, T);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = U.rgba(p.mark, 0.06 + r() * 0.08);
          g.beginPath();
          g.ellipse(x + r() * T, y + r() * T, 3 + r() * 9, 2 + r() * 6, r() * 3, 0, U.TAU);
          g.fill();
        }
        if (p.channel && info.y % 6 === 3) {
          g.fillStyle = 'rgba(0,0,0,0.4)';
          g.fillRect(x, y + T / 2 - 2, T, 4);
          g.fillStyle = U.rgba(p.channel, 0.3);
          g.fillRect(x, y + T / 2 - 0.6, T, 1.2);
        }
        if (p.gouge && r() < 0.18) {
          g.strokeStyle = 'rgba(0,0,0,0.45)';
          g.lineWidth = 1;
          const a = r() * 3, cx = x + r() * T, cy = y + r() * T;
          for (let k = -1; k <= 1; k++) {
            g.beginPath();
            g.moveTo(cx + Math.cos(a + 1.57) * k * 3, cy + Math.sin(a + 1.57) * k * 3);
            g.lineTo(cx + Math.cos(a + 1.57) * k * 3 + Math.cos(a) * 12, cy + Math.sin(a + 1.57) * k * 3 + Math.sin(a) * 12);
            g.stroke();
          }
        }
        if (p.sparkle) {
          g.fillStyle = U.rgba(p.sparkle, 0.5);
          for (let i = 0; i < 5; i++) g.fillRect(x + r() * T, y + r() * T, 0.9, 0.9);
        }
      },
    },
    // ARIADNE's floor: black glass, her blue traces running between nodes
    circuit: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = U.mulberry32((info.x * 9241 + info.y * 1171) >>> 0);
        g.fillStyle = p.base;
        g.fillRect(x, y, T, T);
        g.strokeStyle = U.rgba(p.trace, 0.28);
        g.lineWidth = 0.9;
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const vert = r() < 0.5, k = 4 + Math.floor(r() * 6) * 4;
          g.beginPath();
          if (vert) {
            g.moveTo(x + k, y);
            g.lineTo(x + k, y + T * (0.4 + r() * 0.6));
          } else {
            g.moveTo(x, y + k);
            g.lineTo(x + T * (0.4 + r() * 0.6), y + k);
          }
          g.stroke();
        }
        g.fillStyle = U.rgba(p.trace, 0.5);
        if (r() < 0.5) {
          g.beginPath();
          g.arc(x + 4 + Math.floor(r() * 6) * 4, y + 4 + Math.floor(r() * 6) * 4, 1.4, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,0.03)';
        g.fillRect(x, y, T, 1);
      },
    },
    // a vault wall: an iron top with rows of bronze rivets; on its face, bronze plates, ribbed, green at the seams
    'vault-wall': {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        g.fillStyle = 'rgba(255,255,255,0.04)';
        g.fillRect(x, y, T, 1.5);
        g.fillStyle = p.rivet;
        for (let i = 4; i < T; i += 8) {
          if (h > 6) {
            g.beginPath();
            g.arc(x + i, y + 4, 1, 0, U.TAU);
            g.fill();
          }
          if (h > 14) {
            g.beginPath();
            g.arc(x + i, y + h - 4, 1, 0, U.TAU);
            g.fill();
          }
        }
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x + T / 2 - 0.5, y, 1, h);
      },
      face(g, x, y, fh, info, p) {
        const grd = g.createLinearGradient(0, y, 0, y + fh);
        grd.addColorStop(0, U.shade(p.face, 0.25));
        grd.addColorStop(0.45, p.face);
        grd.addColorStop(1, U.shade(p.face, -0.45));
        g.fillStyle = grd;
        g.fillRect(x, y, T, fh);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x + (info.x % 2 ? 0 : T - 1), y, 1, fh);
        g.fillRect(x, y + fh * 0.5, T, 0.7);
        g.fillStyle = U.rgba(p.green || Z.verdigris, 0.45);
        g.fillRect(x + (info.x % 2 ? 0.5 : T - 2), y + 1, 1.2, fh - 2);
        g.fillStyle = 'rgba(255,230,180,0.22)';
        for (let i = 3; i < T; i += 6) g.fillRect(x + i, y + 1.5, 0.9, 0.9);
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(x, y + fh - 1.4, T, 1.4);
      },
    },
  };

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
    // heavy bronze doors: two leaves, a wheel boss on each, a bar across
    bronze(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0, side) => {
        ctx.fillStyle = '#2a1a0c';
        ctx.fillRect(x0, -6.5, half, 13);
        const grd = ctx.createLinearGradient(0, -6, 0, 6);
        grd.addColorStop(0, Z.bronzeLight);
        grd.addColorStop(0.5, Z.bronze);
        grd.addColorStop(1, Z.bronzeDark);
        ctx.fillStyle = grd;
        ctx.fillRect(x0 + 0.6, -5.8, half - 1.2, 11.6);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x0 + 0.6, -1, half - 1.2, 2);
        ctx.fillStyle = Z.bronzeDark;
        ctx.beginPath();
        ctx.arc(x0 + half / 2, 0, 3.2, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = Z.bronzeLight;
        ctx.beginPath();
        ctx.arc(x0 + half / 2, 0, 1.3, 0, U.TAU);
        ctx.fill();
        if (door.flag && !door.unlocked) {
          ctx.fillStyle = door.flagColor || Z.amber;
          ctx.fillRect(x0 + (side < 0 ? half - 1.8 : 0.2), -5.8, 1.6, 11.6);
        }
      });
      ctx.fillStyle = '#100a06';
      ctx.fillRect(-half, -7, 2.4, 14);
      ctx.fillRect(half - 2.4, -7, 2.4, 14);
      ctx.restore();
    },
  };
  const doorGlows = {
    bronze(ctx, door, game, t) {
      if (door.sealed) G.glow(ctx, door.x, door.y, 22, Z.red, 0.2 + 0.12 * Math.sin(t * 3));
      else if (door.flag && !door.unlocked) G.glow(ctx, door.x, door.y, 18, door.flagColor || Z.amber, 0.18);
    },
  };

  // ======================================================== environment
  const WALL = {
    vault: { style: 'vault-wall', top: ['#1b1a1d'], rivet: 'rgba(181,128,63,0.55)', edge: Z.bronze, face: '#7a5428', green: Z.verdigris, trim: Z.bronzeDark },
    cell: { style: 'vault-wall', top: ['#121114'], rivet: 'rgba(181,128,63,0.35)', edge: '#4a3018', face: '#4a3420', green: '#2f5a4a', trim: '#2a1a0c' },
  };
  DS.TARTARUS_WALL = WALL;
  const environments = {
    'ds-tartarus': {
      name: 'Asterion · Sub-level B',
      voidColor: '#040405',
      ambient: '#1a1714',
      attractAmbient: '#4a4036',
      outsideSight: '#100f0e',
      playerLight: '#ffe8c8',
      torch: '#ffb040',
      floors: {
        0: { style: 'basalt', base: '#1d1b20', grout: '#09080a', crack: Z.bronze, hex: 13 },
        1: { style: 'deck', base: '#3a3024', seam: '#141008', rivet: 'rgba(230,182,114,0.45)' },
        2: { style: 'clean-panel', base: '#2a2c2e', seam: '#121314' },
        3: { style: 'cellfloor', base: '#1e1c1a', mark: '#000000', channel: '#2a1a0c', gouge: true },
        4: { style: 'cellfloor', base: '#14221c', mark: '#3f8a6e', channel: '#0e1a14', gouge: true },
        5: { style: 'cellfloor', base: '#081620', mark: '#2a6a8a', channel: '#0a2a3a', sparkle: '#7fd4ff' },
        6: { style: 'cellfloor', base: '#c8ccd0', mark: '#ffffff', sparkle: '#ffffff' },
        7: { style: 'circuit', base: '#06090c', trace: '#7fd4ff' },
        8: { style: 'basalt', base: '#262428', grout: '#0c0b0d', crack: null, hex: 16 },
        9: { style: 'carpet', base: '#1a1416', pattern: '#221a1c', border: '#b5803f' },
        10: { style: 'cellfloor', base: '#2a2418', mark: '#a89060', channel: null, gouge: true },
      },
      floor: { style: 'basalt', base: '#1d1b20', grout: '#09080a', crack: Z.bronze, hex: 13 },
      wall: WALL.vault,
      water: { deep: '#06141c', shallow: '#0e2a3a', foam: '#7fd4ff' },
      pit: { core: '#020202', wall: '#121114', rim: '#2a2420' },
      door: { panel: '#6a4520', frame: '#1e140a', trim: Z.bronze },
      doorStyles: Object.assign({}, DS.doorStyles || {}, doorStyles),
      doorGlows: Object.assign({}, DS.doorGlows || {}, doorGlows),
      particles: { type: 'mote', color: '#ffcf90', rate: 1.2, alpha: 0.07, drift: 3 },
      ambience: { base: 34, cutoff: 180, wind: 90, gain: 0.05, wave: 'sine' },
    },
  };

  // ======================================================== terrain
  const wallT = (pal, mapColor) => ({ solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor, palette: pal, bake: (g, x, y, info) => LM.paintWall(g, x, y, info, pal) });
  const TINT = ['#ffb040', '#5ac8a0', '#3a8ac8', '#e8f0ff', '#ff4a3a'];
  // a viewing window: thick armoured glass in a bronze frame, set in the wall. You see through it (and so
  // does whatever is behind it); bullets don't. Its frame joins up with the windows beside it.
  function glassBake(cracked) {
    return function (g, x, y, info) {
      const tint = TINT[info.variant % TINT.length] || TINT[0];
      const L = info.level, me = L.t(info.x, info.y);
      const sameAt = (dx, dy) => {
        const d = L.t(info.x + dx, info.y + dy);
        return d === me || (d && d.vaultGlass);
      };
      const across = sameAt(-1, 0) || sameAt(1, 0) || !(sameAt(0, -1) || sameAt(0, 1));
      // the floor shows under the glass's edges
      LM.paintFloor(g, x, y, Object.assign({}, info, { variant: info.variant >= 10 ? 0 : 0 }));
      g.save();
      g.translate(x + T / 2, y + T / 2);
      if (!across) g.rotate(Math.PI / 2);
      // the sill: bronze, heavy
      g.fillStyle = '#1a1008';
      g.fillRect(-T / 2, -11, T, 22);
      const grd = g.createLinearGradient(0, -11, 0, 11);
      grd.addColorStop(0, Z.bronzeLight);
      grd.addColorStop(0.2, Z.bronze);
      grd.addColorStop(0.8, Z.bronzeDark);
      grd.addColorStop(1, '#2a1a0c');
      g.fillStyle = grd;
      g.fillRect(-T / 2, -11, T, 3.5);
      g.fillRect(-T / 2, 7.5, T, 3.5);
      // the glass itself: dark, tinted by what's behind it
      const gg = g.createLinearGradient(0, -7.5, 0, 7.5);
      gg.addColorStop(0, U.rgba(tint, 0.18));
      gg.addColorStop(0.5, 'rgba(10,14,18,0.82)');
      gg.addColorStop(1, U.rgba(tint, 0.12));
      g.fillStyle = gg;
      g.fillRect(-T / 2, -7.5, T, 15);
      // reflections
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-T / 2 + 4 + (info.x % 3) * 6, -7);
      g.lineTo(-T / 2 + 10 + (info.x % 3) * 6, 7);
      g.stroke();
      // the frame's mullions where one pane meets the next
      if (!sameAt(across ? -1 : 0, across ? 0 : -1)) {
        g.fillStyle = Z.bronze;
        g.fillRect(-T / 2, -8, 2.5, 16);
      }
      if (!sameAt(across ? 1 : 0, across ? 0 : 1)) {
        g.fillStyle = Z.bronzeDark;
        g.fillRect(T / 2 - 2.5, -8, 2.5, 16);
      }
      g.fillStyle = 'rgba(230,182,114,0.4)';
      for (const bx of [-T / 2 + 4, 0, T / 2 - 4]) {
        g.beginPath();
        g.arc(bx, -9.2, 0.9, 0, U.TAU);
        g.arc(bx, 9.2, 0.9, 0, U.TAU);
        g.fill();
      }
      if (cracked) {
        g.strokeStyle = 'rgba(240,248,255,0.55)';
        g.lineWidth = 0.7;
        const r = U.mulberry32((info.x * 31 + info.y * 17) >>> 0);
        for (let i = 0; i < 5; i++) {
          let px = (r() - 0.5) * 10, py = (r() - 0.5) * 6;
          g.beginPath();
          g.moveTo(px, py);
          for (let k = 0; k < 3; k++) {
            px += (r() - 0.5) * 12;
            py += (r() - 0.5) * 8;
            g.lineTo(px, U.clamp(py, -7, 7));
          }
          g.stroke();
        }
      }
      g.restore();
    };
  }
  const glassT = (cracked) => ({
    solid: true, blocksShots: true, blocksLight: false, tall: false, layer: 1, noAO: true, noDecals: true, vaultGlass: true, turns: false,
    mapColor: '#2a4a5a', bake: glassBake(cracked),
    drawGlow(g, x, y, tx, ty, game, t) {
      if (!cracked) return;
      G.glow(g, x + T / 2, y + T / 2, 14, '#e8f4ff', 0.12 + 0.06 * Math.sin(t * 2 + tx));
    },
  });
  const doorT = (spec, mapColor) => ({
    floorLike: true, door: spec, mapColor: mapColor || 'rgba(205,170,120,0.2)',
    bake(g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      const horiz = info.across != null ? info.across : info.n(-1, 0).solid || info.n(1, 0).solid;
      g.fillStyle = 'rgba(0,0,0,0.45)';
      if (horiz) g.fillRect(x, y + T / 2 - 8, T, 16);
      else g.fillRect(x + T / 2 - 8, y, 16, T);
    },
  });
  const terrain = {
    'ds-tartarus-wall': wallT(WALL.vault, '#5a4028'),
    'ds-tartarus-wall-cell': wallT(WALL.cell, '#3a2a1a'),
    'ds-vault-glass': glassT(false),
    'ds-vault-glass-cracked': glassT(true),
    // behind a vault door: a dark recess; the door itself is an item (ds-vault-door), and when it opens a trap
    // turns this tile to floor
    'ds-vault-seal': {
      solid: true, blocksShots: true, blocksLight: true, tall: false, layer: 1, noAO: true, noDecals: true, mapColor: '#6a4520',
      bake(g, x, y, info) {
        g.fillStyle = '#0a0806';
        g.fillRect(x, y, T, T);
        g.fillStyle = 'rgba(181,128,63,0.25)';
        g.fillRect(x, y + T / 2 - 1, T, 2);
      },
    },
    // bronze bars: nothing your size gets through; hands do
    'ds-tartarus-bars': {
      solid: true, blocksShots: false, blocksLight: false, tall: false, layer: 1, noAO: true, mapColor: '#8a6030', turns: false,
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, Object.assign({}, info, { variant: 0 }));
        const across = info.n(-1, 0).id === 'ds-tartarus-bars' || info.n(1, 0).id === 'ds-tartarus-bars' || info.n(-1, 0).solid;
        g.save();
        g.translate(x + T / 2, y + T / 2);
        if (!across) g.rotate(Math.PI / 2);
        g.fillStyle = '#1a1008';
        g.fillRect(-T / 2, -2.5, T, 5);
        for (let i = 0; i < 4; i++) {
          const bx = -T / 2 + 4 + i * 8;
          g.fillStyle = 'rgba(0,0,0,0.5)';
          g.beginPath();
          g.arc(bx + 1, 1, 2.6, 0, U.TAU);
          g.fill();
          const grd = g.createRadialGradient(bx - 0.8, -0.8, 0, bx, 0, 2.6);
          grd.addColorStop(0, Z.bronzeLight);
          grd.addColorStop(1, Z.bronzeDark);
          g.fillStyle = grd;
          g.beginPath();
          g.arc(bx, 0, 2.4, 0, U.TAU);
          g.fill();
        }
        g.restore();
      },
    },
    // a floor drain: a grate over the dark; what lives in the water comes up through these
    'ds-drain': {
      floorLike: true, mapColor: 'rgba(60,90,110,0.3)',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = '#050608';
        g.beginPath();
        g.arc(x + T / 2, y + T / 2, 10, 0, U.TAU);
        g.fill();
        g.strokeStyle = Z.bronzeDark;
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(x + T / 2, y + T / 2, 10, 0, U.TAU);
        g.stroke();
        g.lineWidth = 1.2;
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(x + T / 2 + i * 3.6, y + T / 2 - Math.sqrt(Math.max(0, 100 - (i * 3.6) ** 2)) + 1);
          g.lineTo(x + T / 2 + i * 3.6, y + T / 2 + Math.sqrt(Math.max(0, 100 - (i * 3.6) ** 2)) - 1);
          g.stroke();
        }
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        G.glow(g, x + T / 2, y + T / 2, 12, '#3a8ac8', 0.08 + 0.05 * Math.sin(t * 1.3 + tx * 2));
      },
    },
    'ds-door-bronze': doorT({ lock: null, style: 'bronze' }),
    'ds-door-bronze-sealed': doorT({ lock: null, style: 'bronze', sealed: true }),
    // the core's door: ARIADNE won't let you in until you're armed
    'ds-door-core': doorT({ lock: null, style: 'bronze', flag: 'armoryOpen', need: 'Something from the armory first', color: Z.blue }, 'rgba(127,212,255,0.3)'),
  };

  LM.definePack({ id: 'ds-tartarus', textures, environments, terrain });
})();
