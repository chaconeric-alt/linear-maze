/* HaveNot — packs/hn-gen-kit/materials.js
 * Floors, walls and light fittings for content libraries' tiles (gen/library/settings10: 29 floors, 29 walls, 20
 * lights). Each tile record becomes a terrain, 'mat-<id>', drawn by a painter chosen by the companion's material
 * rules (its `style`) in the record's colours; a tile's legend `variant` is its state: 0 intact, 1 worn, 2 ruined.
 * Lights are items, 'hn-mat-light' (props { style, color, radius }): the fitting and the light it gives.
 *
 *   HN.MATERIAL_STATES = ['intact', 'worn', 'ruined']
 *   HN.materialTerrain(tile) → terrain id (registers it on first use; hn-ruins registers every library tile as it loads)
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, G = LM.gfx, T = LM.TILE;
  HN.MATERIAL_STATES = ['intact', 'worn', 'ruined'];
  const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
  const sh = (c, k) => U.shade(c, k);
  function speckle(g, x, y, w, h, n, r, dark, light) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = r() < 0.55 ? dark : light;
      g.fillRect(x + r() * w, y + r() * h, r() < 0.2 ? 1.5 : 0.8, r() < 0.2 ? 1.5 : 0.8);
    }
  }
  function crack(g, x, y, r, col, len) {
    g.strokeStyle = col;
    g.lineWidth = 0.8;
    g.beginPath();
    let cx = x + 4 + r() * (T - 8), cy = y + 4 + r() * (T - 8);
    g.moveTo(cx, cy);
    for (let i = 0; i < (len || 4); i++) {
      cx += (r() - 0.5) * 12;
      cy += (r() - 0.5) * 12;
      g.lineTo(U.clamp(cx, x, x + T), U.clamp(cy, y, y + T));
    }
    g.stroke();
  }
  // wear and ruin on top of any floor: scuffs and grime; then cracks, chips, rubble and scorch
  function weather(g, x, y, info, base) {
    const r = info.rnd, st = info.variant || 0;
    if (st >= 1) {
      speckle(g, x, y, T, T, 14, r, 'rgba(0,0,0,0.16)', 'rgba(255,255,255,0.05)');
      if (r() < 0.5) {
        g.fillStyle = 'rgba(40,30,20,0.12)';
        g.beginPath();
        g.ellipse(x + r() * T, y + r() * T, 6 + r() * 8, 4 + r() * 6, r() * 3, 0, U.TAU);
        g.fill();
      }
    }
    if (st >= 2) {
      crack(g, x, y, r, 'rgba(0,0,0,0.55)', 5);
      if (r() < 0.6) crack(g, x, y, r, 'rgba(0,0,0,0.4)', 3);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = r() < 0.5 ? sh(base, -0.35) : 'rgba(60,56,50,0.8)';
        const s = 1.5 + r() * 2.5;
        g.fillRect(x + r() * (T - s), y + r() * (T - s), s, s * (0.6 + r() * 0.6));
      }
      if (r() < 0.25) {
        const grd = g.createRadialGradient(x + T / 2, y + T / 2, 1, x + T / 2, y + T / 2, T * 0.6);
        grd.addColorStop(0, 'rgba(10,8,6,0.45)');
        grd.addColorStop(1, 'rgba(10,8,6,0)');
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
      }
    }
  }

  // ------------------------------------------------------------ floor painters: paint(g, x, y, info, colours)
  const FLOORS = {
    marble(g, x, y, info, c) {
      const r = info.rnd;
      g.fillStyle = c[(info.x + info.y) % 2 ? 0 : 1] || c[0];
      g.fillRect(x, y, T, T);
      g.strokeStyle = U.rgba(c[2] || '#000', 0.55);
      g.lineWidth = 0.7;
      for (let v = 0; v < 2; v++) {
        g.beginPath();
        let vx = x + r() * T, vy = y;
        g.moveTo(vx, vy);
        for (let i = 0; i < 5; i++) {
          vx += (r() - 0.5) * 10;
          vy += T / 5;
          g.lineTo(vx, vy);
        }
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(x, y, T, 1);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x, y + T - 0.8, T, 0.8);
      g.fillRect(x + T - 0.8, y, 0.8, T);
    },
    obsidian(g, x, y, info, c) {
      const grd = g.createLinearGradient(x, y, x + T, y + T);
      grd.addColorStop(0, c[1]);
      grd.addColorStop(0.5, c[0]);
      grd.addColorStop(1, c[1]);
      g.fillStyle = grd;
      g.fillRect(x, y, T, T);
      g.fillStyle = U.rgba(c[2], 0.25);
      g.fillRect(x + 3, y + 3, T - 18, 1);
      g.fillRect(x + 3, y + 3, 1, T - 20);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x, y + T - 0.8, T, 0.8);
      g.fillRect(x + T - 0.8, y, 0.8, T);
    },
    mosaic(g, x, y, info, c) {
      const r = info.rnd, n = 4, s = T / n;
      g.fillStyle = c[3] || sh(c[0], -0.6);
      g.fillRect(x, y, T, T);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        // a geometric pattern across tiles: diamonds of the accent on the base
        const gx = info.x * n + i, gy = info.y * n + j;
        const d = (Math.abs((gx % 8) - 3.5) + Math.abs((gy % 8) - 3.5)) | 0;
        g.fillStyle = d === 3 ? c[2] || c[1] : d % 2 ? c[0] : c[1];
        g.fillRect(x + i * s + 0.6, y + j * s + 0.6, s - 1.2, s - 1.2);
      }
      speckle(g, x, y, T, T, 6, r, 'rgba(0,0,0,0.12)', 'rgba(255,255,255,0.1)');
    },
    inlay(g, x, y, info, c) {
      FLOORS.marble(g, x, y, info, [c[0], sh(c[0], -0.05), c[2]]);
      g.strokeStyle = c[1];
      g.lineWidth = 1.4;
      if (info.x % 3 === 0) { g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 1, y + T); g.stroke(); }
      if (info.y % 3 === 0) { g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + T, y + 1); g.stroke(); }
      if (info.x % 3 === 0 && info.y % 3 === 0) G.circle(g, x + 1, y + 1, 2.6, c[1]);
    },
    terrazzo(g, x, y, info, c) {
      const r = info.rnd;
      g.fillStyle = c[0];
      g.fillRect(x, y, T, T);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = c[1 + Math.floor(r() * (c.length - 1))];
        g.fillRect(x + r() * T, y + r() * T, 1 + r() * 1.6, 1 + r() * 1.4);
      }
      g.fillStyle = 'rgba(0,0,0,0.12)';
      if (info.x % 4 === 0) g.fillRect(x, y, 0.8, T);
      if (info.y % 4 === 0) g.fillRect(x, y, T, 0.8);
    },
    stone(g, x, y, info, c) {
      const r = info.rnd;
      g.fillStyle = c[2];
      g.fillRect(x, y, T, T);
      const half = (info.y % 2) * 16;
      for (let k = 0; k < 2; k++) {
        const bx = x + ((k * 16 + half) % T);
        g.fillStyle = pick([c[0], c[1]], r);
        g.fillRect(bx + 0.6, y + 0.6, Math.min(16, x + T - bx) - 1.2, T - 1.2);
        if (bx > x) {
          g.fillStyle = pick([c[0], c[1]], r);
          g.fillRect(x + 0.6, y + 0.6, bx - x - 1.2, T - 1.2);
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(x, y + 1, T, 1);
    },
    carpet(g, x, y, info, c) {
      const r = info.rnd;
      g.fillStyle = (info.x + info.y) % 2 ? c[0] : c[1];
      g.fillRect(x, y, T, T);
      g.fillStyle = U.rgba(c[2], 0.5);
      for (let i = 0; i < 40; i++) g.fillRect(x + r() * T, y + r() * T, 0.7, 0.7);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(x, y, T, 0.6);
      g.fillRect(x, y, 0.6, T);
    },
    ceramic(g, x, y, info, c) {
      const s = T / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        g.fillStyle = (i + j + info.x + info.y) % 2 ? c[0] : c[1];
        g.fillRect(x + i * s, y + j * s, s, s);
        g.fillStyle = U.rgba(c[2], 0.35);
        g.fillRect(x + i * s + 1, y + j * s + 1, s - 6, 1);
      }
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x, y + s - 0.5, T, 1);
      g.fillRect(x + s - 0.5, y, 1, T);
    },
    tile(g, x, y, info, c) {
      const r = info.rnd, s = T / 2;
      g.fillStyle = c[2];
      g.fillRect(x, y, T, T);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        g.fillStyle = r() < 0.15 ? sh(c[1], -0.08) : r() < 0.5 ? c[0] : c[1];
        g.fillRect(x + i * s + 0.8, y + j * s + 0.8, s - 1.6, s - 1.6);
        if (r() < 0.25) {
          g.fillStyle = c[2];
          g.beginPath();
          g.moveTo(x + i * s + 0.8, y + j * s + 0.8);
          g.lineTo(x + i * s + 4, y + j * s + 0.8);
          g.lineTo(x + i * s + 0.8, y + j * s + 4);
          g.fill();
        }
      }
    },
    porcelain(g, x, y, info, c) {
      g.fillStyle = c[0];
      g.fillRect(x, y, T, T);
      const grd = g.createRadialGradient(x + T / 2, y + T / 2, 2, x + T / 2, y + T / 2, T);
      grd.addColorStop(0, 'rgba(255,255,255,0.25)');
      grd.addColorStop(1, U.rgba(c[1], 0.3));
      g.fillStyle = grd;
      g.fillRect(x, y, T, T);
      g.fillStyle = U.rgba(c[2], 0.35);
      if (info.x % 4 === 0) g.fillRect(x, y, 0.5, T);
    },
    elastomer(g, x, y, info, c) {
      g.fillStyle = c[0];
      g.fillRect(x, y, T, T);
      g.fillStyle = U.rgba(c[2], 0.4);
      for (let i = 4; i < T; i += 8) for (let j = 4; j < T; j += 8) G.circle(g, x + i + ((j / 8) % 2) * 4, y + j, 1.4, c[1]);
    },
    glassfloor(g, x, y, info, c) {
      g.fillStyle = sh(c[1], -0.5);
      g.fillRect(x, y, T, T);
      const grd = g.createLinearGradient(x, y, x + T, y + T);
      grd.addColorStop(0, U.rgba(c[0], 0.75));
      grd.addColorStop(1, U.rgba(c[1], 0.55));
      g.fillStyle = grd;
      g.fillRect(x + 1, y + 1, T - 2, T - 2);
      g.strokeStyle = U.rgba(c[2], 0.6);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x + 4, y + T - 6);
      g.lineTo(x + T - 6, y + 4);
      g.stroke();
    },
    resin(g, x, y, info, c) {
      const r = info.rnd;
      g.fillStyle = c[0];
      g.fillRect(x, y, T, T);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = U.rgba(i % 2 ? c[1] : c[2], 0.35);
        g.beginPath();
        g.ellipse(x + r() * T, y + r() * T, 4 + r() * 6, 2 + r() * 4, r() * 3, 0, U.TAU);
        g.fill();
      }
    },
    hex(g, x, y, info, c, t) {
      g.fillStyle = sh(c[1], -0.3);
      g.fillRect(x, y, T, T);
      const R = 7;
      for (let j = -1; j < 4; j++) for (let i = -1; i < 4; i++) {
        const cx = x + i * R * 1.5, cy = y + j * R * 1.732 + (i % 2 ? R * 0.866 : 0);
        g.fillStyle = (i + j + info.x) % 3 ? c[0] : c[1];
        g.beginPath();
        for (let k = 0; k < 6; k++) g.lineTo(cx + Math.cos((k * Math.PI) / 3) * (R - 1), cy + Math.sin((k * Math.PI) / 3) * (R - 1));
        g.fill();
      }
      g.fillStyle = U.rgba(c[2], 0.25);
      g.fillRect(x + (info.x * 7) % T, y + (info.y * 11) % T, 2, 2);
    },
    plate(g, x, y, info, c) {
      g.fillStyle = c[0];
      g.fillRect(x, y, T, T);
      g.fillStyle = c[2];
      for (let i = 2; i < T; i += 6) for (let j = 2; j < T; j += 6) {
        g.save();
        g.translate(x + i + ((j / 6) % 2) * 3, y + j);
        g.rotate(((j / 6) % 2 ? 1 : -1) * 0.7);
        g.fillRect(-1.6, -0.5, 3.2, 1);
        g.restore();
      }
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(x, y + T - 1, T, 1);
      g.fillRect(x + T - 1, y, 1, T);
    },
    grate(g, x, y, info, c) {
      g.fillStyle = c[1];
      g.fillRect(x, y, T, T);
      g.fillStyle = c[0];
      for (let i = 0; i < T; i += 4) g.fillRect(x + i, y, 2.4, T);
      g.fillStyle = c[2];
      g.fillRect(x, y, T, 1.4);
      g.fillRect(x, y + T / 2, T, 1.4);
    },
    drain(g, x, y, info, c) {
      FLOORS.tile(g, x, y, info, [c[0], sh(c[0], -0.06), sh(c[0], -0.3)]);
      if ((info.x + info.y * 3) % 5 === 0) {
        g.fillStyle = c[1];
        g.fillRect(x + 8, y + 8, 16, 16);
        g.fillStyle = c[2];
        for (let i = 10; i < 24; i += 3) g.fillRect(x + i, y + 9, 1.4, 14);
      }
      if (info.y % 6 === 0) {
        g.fillStyle = U.rgba(c[2], 0.8);
        g.fillRect(x, y + 13, T, 6);
      }
    },
    concrete(g, x, y, info, c) {
      const r = info.rnd;
      g.fillStyle = (info.x * 7 + info.y * 3) % 5 ? c[0] : c[1];
      g.fillRect(x, y, T, T);
      speckle(g, x, y, T, T, 22, r, 'rgba(0,0,0,0.14)', 'rgba(255,255,255,0.07)');
      g.fillStyle = 'rgba(0,0,0,0.2)';
      if (info.x % 3 === 0) g.fillRect(x, y, 0.8, T);
      if (info.y % 3 === 0) g.fillRect(x, y, T, 0.8);
      // painted stripes (hazard lines, worn markings) along some edges
      if (c[2] && (info.x * 13 + info.y * 7) % 11 === 0) {
        g.fillStyle = U.rgba(c[2], 0.55);
        g.fillRect(x, y + T - 5, T, 3);
      }
    },
  };

  // ------------------------------------------------------------ wall painters: top + face, in the record's colours
  const top = (g, x, y, h, c, fn) => {
    g.fillStyle = c[1];
    g.fillRect(x, y, T, h);
    if (fn) fn();
  };
  const faceGrad = (g, x, y, fh, col) => {
    const grd = g.createLinearGradient(x, y, x, y + fh);
    grd.addColorStop(0, col);
    grd.addColorStop(1, sh(col, -0.5));
    g.fillStyle = grd;
    g.fillRect(x, y, T, fh);
  };
  const WALLS = {
    panel: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; for (let i = 2; i < T; i += 8) g.fillRect(x + i, y + 2, 6, h - 4); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = c[2]; g.fillRect(x, y + 1, T, 0.8); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < T; i += 8) g.fillRect(x + i, y + 2, 0.8, fh - 2); },
    },
    gilt: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x + 2, y + 2, T - 4, h - 4); g.fillStyle = U.rgba(c[2], 0.6); g.fillRect(x + 4, y + 4, T - 8, 1); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = c[2]; g.fillRect(x, y + 1, T, 1); g.fillRect(x + ((info.x * 9) % 20) + 4, y + 3, 4, 3); },
    },
    portraits: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[0], c[0]]); },
      face(g, x, y, fh, info, c, t) {
        faceGrad(g, x, y, fh, c[0]);
        if (info.x % 2 === 0) {
          g.fillStyle = c[1];
          g.fillRect(x + 6, y + 1, 20, fh - 2);
          g.fillStyle = c[2];
          g.fillRect(x + 7.5, y + 2.2, 17, fh - 4.4);
          G.circle(g, x + 16, y + fh / 2, 2.2, sh(c[2], 0.3));
        }
      },
    },
    partition: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = U.rgba(c[2], 0.6); g.fillRect(x, y + h / 2 - 1, T, 2); }); },
      face(g, x, y, fh, info, c) { g.fillStyle = U.rgba(c[0], 0.85); g.fillRect(x, y, T, fh); g.fillStyle = c[1]; g.fillRect(x + (info.x % 2 ? 0 : 15), y, 1.4, fh); },
    },
    rails: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[1], sh(c[1], -0.3)]); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, sh(c[1], -0.2)); g.fillStyle = c[0]; g.fillRect(x, y + 2, T, 1.6); g.fillRect(x, y + 5.5, T, 1.6); g.fillStyle = c[2]; g.fillRect(x, y + 2, T, 0.5); },
    },
    glasswall: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[0], c[1]], () => { g.fillStyle = U.rgba(c[2], 0.45); g.fillRect(x + 2, y + 2, T - 4, 1.2); }); },
      face(g, x, y, fh, info, c) { g.fillStyle = U.rgba(c[0], 0.75); g.fillRect(x, y, T, fh); g.strokeStyle = U.rgba(c[2], 0.7); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + 3, y + fh - 1); g.lineTo(x + 10, y + 1); g.stroke(); g.fillStyle = c[1]; g.fillRect(x, y, 1, fh); },
    },
    bulkhead: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x + 1, y + 1, T - 2, h - 2); g.fillStyle = c[2]; for (const [px, py] of [[3, 3], [T - 4, 3], [3, h - 4], [T - 4, h - 4]]) G.circle(g, x + px, y + py, 0.9, c[2]); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 15, y, 1.2, fh); g.fillStyle = c[2]; g.fillRect(x + 3, y + 3, 1, 1); g.fillRect(x + 27, y + 3, 1, 1); },
    },
    stainedglass: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[0], c[0]]); },
      face(g, x, y, fh, info, c) {
        g.fillStyle = c[0];
        g.fillRect(x, y, T, fh);
        for (let i = 0; i < 4; i++) { g.fillStyle = U.rgba(c[1 + ((i + info.x) % 3)], 0.85); g.fillRect(x + 2 + i * 7, y + 1.5, 6, fh - 3); }
      },
    },
    carved: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x + 1, y + 1, T - 2, h - 2); speckle(g, x, y, T, h, 8, info.rnd, 'rgba(0,0,0,0.15)', 'rgba(255,255,255,0.1)'); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = c[2]; for (let i = 2; i < T; i += 6) { g.beginPath(); g.arc(x + i + 1, y + fh - 1, 2.2, Math.PI, 0); g.fill(); } },
    },
    screens: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[0], c[0]]); },
      face(g, x, y, fh, info, c) {
        g.fillStyle = c[0];
        g.fillRect(x, y, T, fh);
        g.fillStyle = U.rgba(c[1 + (info.x % 2)], 0.75);
        g.fillRect(x + 2, y + 1.5, T - 4, fh - 3);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x + 4, y + 3, (info.x * 7) % 14 + 4, 1);
      },
    },
    shutter: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; for (let j = 2; j < h; j += 3) g.fillRect(x + 1, y + j, T - 2, 1.6); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = 'rgba(0,0,0,0.35)'; for (let j = 1; j < fh; j += 2.4) g.fillRect(x, y + j, T, 0.7); g.fillStyle = c[2]; g.fillRect(x, y + fh - 2, T, 1); },
    },
    hazard: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[0], c[0]]); },
      face(g, x, y, fh, info, c) {
        g.fillStyle = c[0];
        g.fillRect(x, y, T, fh);
        g.save();
        g.beginPath();
        g.rect(x, y + 2, T, fh - 4);
        g.clip();
        g.fillStyle = c[1];
        for (let s = -fh; s < T + fh; s += 6) { g.beginPath(); g.moveTo(x + s, y + fh); g.lineTo(x + s + 3, y + fh); g.lineTo(x + s + 3 + fh, y); g.lineTo(x + s + fh, y); g.fill(); }
        g.restore();
      },
    },
    membrane: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[0], c[1]], () => { g.fillStyle = U.rgba(c[2], 0.3); g.beginPath(); g.ellipse(x + T / 2, y + h / 2, T / 2 - 2, h / 2 - 2, 0, 0, U.TAU); g.fill(); }); },
      face(g, x, y, fh, info, c) { g.fillStyle = U.rgba(c[0], 0.85); g.fillRect(x, y, T, fh); g.strokeStyle = U.rgba(c[1], 0.8); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y + fh / 2); g.quadraticCurveTo(x + T / 2, y + (info.x % 2 ? 1 : fh - 1), x + T, y + fh / 2); g.stroke(); },
    },
    steel: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x + 1, y + 1, T - 2, h - 2); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = U.rgba(c[2], 0.6); g.fillRect(x, y + 1, T, 0.8); g.fillStyle = 'rgba(0,0,0,0.2)'; if (info.x % 2) g.fillRect(x, y, 0.8, fh); },
    },
    tissue: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { const r = info.rnd; for (let i = 0; i < 6; i++) G.circle(g, x + r() * T, y + r() * h, 2 + r() * 3, U.rgba(c[0], 0.6)); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.strokeStyle = U.rgba(c[1], 0.8); g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y + 2); g.bezierCurveTo(x + 10, y + fh, x + 20, y, x + T, y + fh - 2); g.stroke(); },
    },
    concretewall: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x + 1, y + 1, T - 2, h - 2); speckle(g, x, y, T, h, 10, info.rnd, 'rgba(0,0,0,0.15)', 'rgba(255,255,255,0.08)'); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + (info.x % 2) * 16, y, 0.8, fh); },
    },
    riveted: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x + 1, y + 1, T - 2, h - 2); for (let i = 3; i < T; i += 6) G.circle(g, x + i, y + 3, 0.8, c[2]); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); for (let i = 0; i < T; i += 5) g.fillRect(x + i, y, 1.4, fh); g.fillStyle = c[2]; for (let i = 3; i < T; i += 6) G.circle(g, x + i, y + fh / 2, 0.8, c[2]); },
    },
    streaked: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x + 1, y + 1, T - 2, h - 2); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[0]); g.fillStyle = U.rgba(c[2], 0.75); const r = info.rnd; for (let i = 0; i < 3; i++) g.fillRect(x + r() * T, y, 1 + r() * 2, fh * (0.4 + r() * 0.6)); },
    },
    pipes: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; g.fillRect(x, y + 3, T, 6); g.fillRect(x, y + 13, T, 5); g.fillStyle = c[2]; g.fillRect(x + ((info.x * 11) % 24), y + 2, 3, 8); }); },
      face(g, x, y, fh, info, c) { faceGrad(g, x, y, fh, c[1]); g.fillStyle = c[0]; g.fillRect(x, y + 1, T, 3.5); g.fillRect(x, y + 5.5, T, 2.5); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x, y + 1.4, T, 0.8); },
    },
    brick: {
      top(g, x, y, h, info, c) { top(g, x, y, h, c, () => { g.fillStyle = c[0]; for (let j = 0; j < h; j += 5) for (let i = (j / 5) % 2 ? -4 : 0; i < T; i += 8) g.fillRect(x + Math.max(0, i) + 0.6, y + j + 0.6, 7 - (i < 0 ? 4 : 0), 3.8); }); },
      face(g, x, y, fh, info, c) { g.fillStyle = c[1]; g.fillRect(x, y, T, fh); g.fillStyle = c[0]; for (let j = 0; j < fh; j += 3.2) for (let i = (j / 3.2) % 2 ? -3 : 0; i < T; i += 6) g.fillRect(x + Math.max(0, i) + 0.5, y + j + 0.4, 5, 2.4); g.fillStyle = U.rgba(c[2], 0.25); g.fillRect(x, y + fh - 1.5, T, 1.5); },
    },
    drapes: {
      top(g, x, y, h, info, c) { top(g, x, y, h, [c[0], c[1]]); },
      face(g, x, y, fh, info, c) { for (let i = 0; i < T; i += 4) { const grd = g.createLinearGradient(x + i, y, x + i + 4, y); grd.addColorStop(0, sh(c[0], -0.3)); grd.addColorStop(0.5, sh(c[0], 0.15)); grd.addColorStop(1, sh(c[0], -0.3)); g.fillStyle = grd; g.fillRect(x + i, y, 4, fh); } g.fillStyle = c[2]; g.fillRect(x, y + 0.5, T, 1); },
    },
  };
  // wear and ruin on walls: grime, then gouges and holes showing the dark behind
  function wallWeather(g, x, y, h, info) {
    const r = info.rnd, st = info.variant || 0;
    if (st >= 1) speckle(g, x, y, T, h, 10, r, 'rgba(0,0,0,0.2)', 'rgba(255,255,255,0.04)');
    if (st >= 2) {
      g.fillStyle = 'rgba(8,6,5,0.85)';
      g.beginPath();
      g.ellipse(x + 6 + r() * (T - 12), y + 4 + r() * (h - 8), 2 + r() * 4, 1.5 + r() * 3, r() * 3, 0, U.TAU);
      g.fill();
      crack(g, x, y, r, 'rgba(0,0,0,0.5)', 3);
    }
  }

  // ------------------------------------------------------------ textures and terrains
  const textures = {};
  for (const [style, paint] of Object.entries(FLOORS)) {
    textures['mf-' + style] = { kind: 'floor', paint(g, x, y, info, p) { paint(g, x, y, info, p.colors); weather(g, x, y, info, p.colors[0]); } };
  }
  for (const [style, w] of Object.entries(WALLS)) {
    textures['mw-' + style] = {
      kind: 'wall',
      top(g, x, y, h, info, p) { w.top(g, x, y, h, info, p.colors); wallWeather(g, x, y, h, info); },
      face(g, x, y, fh, info, p) { w.face(g, x, y, fh, info, p.colors); if ((info.variant || 0) >= 1) speckle(g, x, y, T, fh, 6, info.rnd, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.03)'); },
    };
  }
  HN.MATERIAL_FLOORS = Object.keys(FLOORS);
  HN.MATERIAL_WALLS = Object.keys(WALLS);

  const terrains = {};
  HN.materialTerrain = function (tile) {
    const id = 'mat-' + tile.id;
    if (terrains[id] || LM.find('terrain', id)) return id;
    const colors = tile.colors || ['#808080', '#606060', '#a0a0a0'];
    let def;
    if (tile.kind === 'wall') {
      const pal = { style: 'mw-' + tile.style, colors, edge: U.shade(colors[0], 0.25), trim: colors[2] || colors[0] };
      def = { solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor: U.shade(colors[0], -0.2), hnMaterial: tile.id, bake: (g, x, y, info) => LM.paintWall(g, x, y, info, pal) };
    } else {
      const pal = { style: 'mf-' + tile.style, colors };
      def = { floorLike: true, mapColor: U.rgba(colors[0], 0.35), hnMaterial: tile.id, bake: (g, x, y, info) => LM.get('textures', pal.style).paint(g, x, y, info, pal) };
    }
    terrains[id] = def;
    const more = {};
    if (tile.kind === 'wall') {
      // the generator's wall variants (stages-function.js laySurfaces): a window in the wall (you see and light passes
      // through; shots and people don't), and a display or machine panel set into its face
      const pal = { style: 'mw-' + tile.style, colors, edge: U.shade(colors[0], 0.25), trim: colors[2] || colors[0] };
      more[id + '-win'] = Object.assign({}, def, { blocksLight: false, hnWindow: true, mapColor: '#6a8aa0', bake: (g, x, y, info) => { LM.paintWall(g, x, y, info, pal); paintWindow(g, x, y, info, colors); } });
      more[id + '-disp'] = Object.assign({}, def, {
        hnDisplay: true,
        bake: (g, x, y, info) => { LM.paintWall(g, x, y, info, pal); paintDisplay(g, x, y, info, colors); },
        drawDynamic: (g, x, y, tx, ty, game, t) => displayGlow(g, x, y, tx, ty, game, t || 0, colors),
      });
      Object.assign(terrains, more);
    }
    LM.definePack({ id: 'hn-gen-kit', terrain: Object.assign({ [id]: def }, more) });
    return id;
  };
  // which way a wall tile runs, from its neighbours (true: along x), and which side faces open floor
  const runsAlong = (info) => {
    const solid = (dx, dy) => { const t = info.n(dx, dy); return !!(t && t.solid); };
    return solid(-1, 0) || solid(1, 0) ? !(solid(0, -1) && solid(0, 1)) || (solid(-1, 0) && solid(1, 0)) : false;
  };
  const openSide = (info) => {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const t = info.n(dx, dy); if (t && !t.solid) return [dx, dy]; }
    return [0, 1];
  };
  function paintWindow(g, x, y, info, colors) {
    const along = runsAlong(info), m = 9;
    const [rx, ry, rw, rh] = along ? [x + 2, y + m, T - 4, T - 2 * m] : [x + m, y + 2, T - 2 * m, T - 4];
    g.fillStyle = U.shade(colors[1] || colors[0], -0.5);
    g.fillRect(rx - 1.5, ry - 1.5, rw + 3, rh + 3);
    g.fillStyle = 'rgba(150,200,230,0.42)';
    g.fillRect(rx, ry, rw, rh);
    // mullions and a sheen
    g.fillStyle = U.shade(colors[1] || colors[0], -0.35);
    if (along) g.fillRect(x + T / 2 - 1, ry, 2, rh);
    else g.fillRect(rx, y + T / 2 - 1, rw, 2);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    if (along) g.fillRect(rx + 3, ry + 1, rw * 0.3, 1.2);
    else g.fillRect(rx + 1, ry + 3, 1.2, rh * 0.3);
    if ((info.variant || 0) >= 2) {
      // cracked
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(rx + rw * 0.3, ry);
      g.lineTo(rx + rw * 0.55, ry + rh * 0.6);
      g.lineTo(rx + rw * 0.8, ry + rh);
      g.stroke();
    }
  }
  function paintDisplay(g, x, y, info, colors) {
    const [dx, dy] = openSide(info);
    // the panel sits against the face toward the room
    const w = 22, d = 9;
    const cx = x + T / 2 + dx * (T / 2 - d / 2 - 1), cy = y + T / 2 + dy * (T / 2 - d / 2 - 1);
    const [pw, ph] = dx ? [d, w] : [w, d];
    g.fillStyle = '#121418';
    g.fillRect(cx - pw / 2 - 1.5, cy - ph / 2 - 1.5, pw + 3, ph + 3);
    g.fillStyle = U.shade(colors[2] || '#7ad8ff', -0.55);
    g.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
    // read-outs or gauges, by the wall
    const r = U.mulberry32(((info.x || 0) * 7919 + (info.y || 0) * 104729) >>> 0);
    g.fillStyle = U.rgba(colors[2] || '#7ad8ff', 0.8);
    for (let i = 0; i < 4; i++) {
      if (dx) g.fillRect(cx - pw / 2 + 1.5, cy - ph / 2 + 2 + i * 5, 2 + r() * (pw - 4), 1.4);
      else g.fillRect(cx - pw / 2 + 2 + i * 5, cy - ph / 2 + 1.5, 1.4, 2 + r() * (ph - 4));
    }
    if ((info.variant || 0) >= 2) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
    }
  }
  function displayGlow(g, x, y, tx, ty, game, t, colors) {
    const L = game.level, v = L.variant ? L.variant[ty * L.w + tx] : 0;
    if (v >= 2) return;
    const info = { n: (dx, dy) => L.t(tx + dx, ty + dy) };
    const [dx, dy] = openSide(info);
    const cx = x + T / 2 + dx * (T / 2 - 5.5), cy = y + T / 2 + dy * (T / 2 - 5.5);
    const k = 0.25 + 0.15 * Math.sin(t * 2 + tx * 1.7 + ty);
    g.fillStyle = U.rgba(colors[2] || '#7ad8ff', k);
    g.fillRect(cx - (dx ? 4 : 10), cy - (dx ? 10 : 4), dx ? 8 : 20, dx ? 20 : 8);
    // a scan line
    g.fillStyle = 'rgba(255,255,255,0.5)';
    const s = (t * 12 + tx * 5) % 20;
    if (dx) g.fillRect(cx - 4, cy - 10 + s, 8, 1);
    else g.fillRect(cx - 10 + s, cy - 4, 1, 8);
  }

  // ------------------------------------------------------------ light fittings
  const FITTINGS = {
    chandelier(g, c, t) { for (let i = 0; i < 6; i++) { const a = (i / 6) * U.TAU + t * 0.2; G.circle(g, Math.cos(a) * 6, Math.sin(a) * 6, 1.4, U.rgba(c, 0.9)); } G.circle(g, 0, 0, 2.4, '#c8a040'); },
    candles(g, c, t) { for (let i = 0; i < 3; i++) { const a = i * 2.1 + Math.sin(t * 0.7 + i) * 0.3; G.circle(g, Math.cos(a) * 5, Math.sin(a) * 5 + Math.sin(t * 2 + i) * 0.6, 1.2, U.rgba(c, 0.95)); } },
    procedure(g, c) { G.circle(g, 0, 0, 7, '#c8d0d4'); G.circle(g, 0, 0, 5.4, U.rgba(c, 0.9)); for (let i = 0; i < 6; i++) G.circle(g, Math.cos(i) * 3, Math.sin(i) * 3, 1, '#ffffff'); },
    strip(g, c) { g.fillStyle = '#20242a'; g.fillRect(-9, -1.6, 18, 3.2); g.fillStyle = U.rgba(c, 0.95); g.fillRect(-8, -0.8, 16, 1.6); },
    panel(g, c) { g.fillStyle = '#2a2e32'; g.fillRect(-7, -4, 14, 8); g.fillStyle = U.rgba(c, 0.9); g.fillRect(-6, -3, 12, 6); },
    halo(g, c, t) { g.strokeStyle = U.rgba(c, 0.8 + 0.2 * Math.sin(t * 2)); g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 6, 0, U.TAU); g.stroke(); },
    beacon(g, c, t) { G.circle(g, 0, 0, 4, '#2a2420'); G.circle(g, 0, 0, 3, U.rgba(c, Math.sin(t * 5) > 0 ? 1 : 0.3)); },
    veins(g, c, t) { g.strokeStyle = U.rgba(c, 0.6 + 0.3 * Math.sin(t * 1.5)); g.lineWidth = 1; g.beginPath(); g.moveTo(-9, 2); g.bezierCurveTo(-3, -6, 3, 6, 9, -2); g.stroke(); },
    signbox(g, c, t) { g.fillStyle = '#1a1a24'; g.fillRect(-8, -4, 16, 8); g.fillStyle = U.rgba(c, 0.8 + 0.2 * Math.sin(t * 4)); g.fillRect(-7, -3, 6, 6); g.fillRect(1, -3, 6, 6); },
    bulb(g, c) { g.strokeStyle = '#3a3a36'; g.lineWidth = 1; g.strokeRect(-3.5, -3.5, 7, 7); g.beginPath(); g.moveTo(-3.5, 0); g.lineTo(3.5, 0); g.moveTo(0, -3.5); g.lineTo(0, 3.5); g.stroke(); G.circle(g, 0, 0, 2.2, U.rgba(c, 0.95)); },
    spot(g, c) { G.circle(g, 0, 0, 4, '#2a2a2a'); G.circle(g, 0, 0, 2.6, U.rgba(c, 1)); },
  };
  const items = {
    'hn-mat-light': {
      name: 'Light fitting', radius: 6, solid: false, shadow: false, mapColor: 'none',
      light: (it) => ({ color: it.props.color || '#fff0c0', radius: it.props.radius || 120, intensity: it.props.state === 2 ? 0.25 : 0.55, flicker: it.props.state ? 0.25 : 0.05 }),
      draw(g, it, t) { (FITTINGS[it.props.style] || FITTINGS.bulb)(g, it.props.color || '#fff0c0', t + (it.tx || 0)); },
      drawGlow(g, it, t) { G.glow(g, 0, 0, 14, it.props.color || '#fff0c0', it.props.state === 2 ? 0.2 : 0.45); },
    },
  };
  HN.MATERIAL_FITTINGS = Object.keys(FITTINGS);
  // glass underfoot: the floor below shows through (a level's `below`, engine SPEC 6.23); steel ribs and a sheen
  const terrain = {
    'hn-glass-floor': {
      floorLike: true, seeBelow: true, noDecals: true, mapColor: '#3a5a6a',
      bake(g, x, y) {
        g.fillStyle = '#0a1014';
        g.fillRect(x, y, T, T);
      },
      drawDynamic(g, x, y, tx, ty, game) {
        const L = game.level, see = (dx, dy) => L.t(tx + dx, ty + dy).seeBelow;
        const P = game.player;
        const off = P ? (P.x * 0.15 + P.y * 0.1) % 48 : 0;
        g.fillStyle = 'rgba(200,235,255,0.05)';
        g.fillRect(x + ((off + tx * 7) % T), y, 5, T);
        g.fillStyle = 'rgba(140,160,170,0.55)';
        if (!(tx % 2)) g.fillRect(x - 0.5, y, 1, T);
        if (!(ty % 2)) g.fillRect(x, y - 0.5, T, 1);
        g.fillStyle = '#7a8890';
        if (!see(-1, 0)) g.fillRect(x, y, 2, T);
        if (!see(1, 0)) g.fillRect(x + T - 2, y, 2, T);
        if (!see(0, -1)) g.fillRect(x, y, T, 2);
        if (!see(0, 1)) g.fillRect(x, y + T - 2, T, 2);
      },
    },
  };
  LM.definePack({ id: 'hn-gen-kit', textures, items, terrain });

})();
