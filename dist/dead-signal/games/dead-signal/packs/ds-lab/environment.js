/* Dead Signal — packs/ds-lab/environment.js
 * The look of Asterion Biologics: three new painters (concrete, clean-room panel, steel shutter),
 * the doors the building uses (lockdown shutters, fire doors, the armory cage, security doors), and
 * the ground floor's tile set, ds-lobby: offices at three in the morning with the lockdown on.
 *
 * Floor variants (legend `variant`):
 *   0 corridor and open-plan carpet   1 lobby terrazzo     2 restroom tile      3 break-room wood
 *   4 clean-room panel (IT, closets)  5 carpet, bloodied   6 concrete           7 office carpet, darker
 *
 * LM.DS is shared by every Dead Signal pack: colours, and small drawing helpers.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const DS = (LM.DS = LM.DS || {});

  DS.C = {
    accent: '#8fb8a8', // the game's own green-grey
    warn: '#e0b25a',
    alarm: '#ff3a2a',
    steel: '#7c838b',
    steelDark: '#3a3f45',
    hazard: '#d9a21c',
    ariadne: '#7fd4ff',
    voss: '#e0b25a',
  };
  /** Yellow and black hazard stripes in a rect (world or local space). */
  DS.hazard = function (g, x, y, w, h, step) {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.fillStyle = '#1a1a18';
    g.fillRect(x, y, w, h);
    g.fillStyle = DS.C.hazard;
    const s = step || 4;
    for (let k = -h; k < w + h; k += s * 2) {
      g.beginPath();
      g.moveTo(x + k, y + h);
      g.lineTo(x + k + s, y + h);
      g.lineTo(x + k + s + h, y);
      g.lineTo(x + k + h, y);
      g.fill();
    }
    g.restore();
  };
  /** A small LED with its glow (drawGlow pass). */
  DS.led = function (g, x, y, color, a, r) {
    G.glow(g, x, y, (r || 1) * 5, color, a == null ? 0.7 : a);
    G.circle(g, x, y, (r || 1) * 0.9, color);
  };
  const speck = (g, x, y, w, h, n, r, col, a) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = U.rgba(col, a * (0.4 + r() * 0.6));
      g.fillRect(x + r() * w, y + r() * h, 0.9, 0.9);
    }
  };

  // ======================================================== painters
  const textures = {
    concrete: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        const tone = (U.hash2(info.x >> 1, info.y >> 1, 3) - 0.5) * 0.05;
        grd.addColorStop(0, U.shade(p.base, tone + 0.03));
        grd.addColorStop(1, U.shade(p.base, tone - 0.03));
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
        speck(g, x, y, T, T, 26, r, '#000000', 0.18);
        speck(g, x, y, T, T, 10, r, '#ffffff', 0.08);
        // trowel swirls and the odd hairline crack
        g.strokeStyle = 'rgba(255,255,255,0.025)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x + r() * T, y + r() * T, 6 + r() * 10, r() * 6, r() * 6 + 2);
        g.stroke();
        if (r() < 0.12) {
          g.strokeStyle = 'rgba(0,0,0,0.3)';
          g.lineWidth = 0.6;
          g.beginPath();
          let cx = x + r() * T, cy = y + r() * T;
          g.moveTo(cx, cy);
          for (let i = 0; i < 4; i++) {
            cx += (r() - 0.5) * 12;
            cy += (r() - 0.5) * 12;
            g.lineTo(cx, cy);
          }
          g.stroke();
        }
        // saw-cut expansion joints every few tiles
        const every = p.joint || 3;
        g.fillStyle = 'rgba(0,0,0,0.3)';
        if (info.x % every === 0) g.fillRect(x, y, 0.8, T);
        if (info.y % every === 0) g.fillRect(x, y, T, 0.8);
        if (p.line && info.x % (every * 2) === 0) {
          // painted safety line
          g.fillStyle = U.rgba(p.line, 0.35);
          g.fillRect(x + 2, y, 2, T);
        }
      },
    },
    'clean-panel': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.seam;
        g.fillRect(x, y, T, T);
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const hsh = U.hash2(info.x * 2 + i, info.y * 2 + j, 7);
            const sx = x + i * 16 + 0.6, sy = y + j * 16 + 0.6;
            g.fillStyle = U.shade(p.base, (hsh - 0.5) * 0.05);
            g.fillRect(sx, sy, 14.8, 14.8);
            g.fillStyle = 'rgba(255,255,255,0.14)';
            g.fillRect(sx, sy, 14.8, 0.7);
            if (p.perforated) {
              g.fillStyle = 'rgba(0,0,0,0.16)';
              for (let b = 2; b < 14; b += 3) for (let a = 2; a < 14; a += 3) g.fillRect(sx + a, sy + b, 0.9, 0.9);
            }
          }
        }
      },
    },
    // a wall painter: rolled steel lockdown shutters over windows and doorways on the outside walls
    shutter: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 2; i < h; i += 4) g.fillRect(x, y + i, T, 1);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 4; i < h; i += 4) g.fillRect(x, y + i, T, 0.7);
      },
      face(g, x, y, fh, info, p) {
        const grd = g.createLinearGradient(x, y, x, y + fh);
        grd.addColorStop(0, p.face);
        grd.addColorStop(1, p.faceDark);
        g.fillStyle = grd;
        g.fillRect(x, y, T, fh);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = 2; i < fh - 3; i += 2.2) g.fillRect(x, y + i, T, 0.6);
        DS.hazard(g, x, y + fh - 3, T, 3, 3);
      },
    },
  };

  // ======================================================== door styles
  function leaves(ctx, door, paint, gap) {
    const half = T / 2, k = U.ease.inOutSine(door.open), slide = k * (half - (gap || 2));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * slide, 0);
      paint(side < 0 ? -half : 0, side);
      ctx.restore();
    }
  }
  function frame(ctx, door, col) {
    const half = T / 2;
    ctx.fillStyle = col || '#2a2d31';
    ctx.fillRect(-half, -6, 3, 12);
    ctx.fillRect(half - 3, -6, 3, 12);
  }
  const doorStyles = {
    // a rolling steel shutter: it rolls up into the ceiling (top-down: the slats thin out and lift away)
    shutter(ctx, door, game, t) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2, k = U.ease.inOutSine(door.open);
      ctx.fillStyle = '#1d2024';
      ctx.fillRect(-half, -7, T, 2.5);
      if (k < 0.98) {
        ctx.globalAlpha = 1 - k * 0.85;
        const th = 6 * (1 - k * 0.8);
        ctx.fillStyle = '#6d747c';
        ctx.fillRect(-half + 1, -th, T - 2, th * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = -half + 3; i < half - 1; i += 3) ctx.fillRect(i, -th, 0.7, th * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-half + 1, -th, T - 2, 0.8);
        DS.hazard(ctx, -half + 1, th - 2, T - 2, 2, 2.5);
        ctx.globalAlpha = 1;
      }
      frame(ctx, door, '#2a2d31');
      ctx.restore();
    },
    // stairwell fire door: two heavy leaves, red-grey, with push bars
    fire(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0, side) => {
        ctx.fillStyle = '#5a2a26';
        ctx.fillRect(x0, -5, half, 10);
        ctx.fillStyle = '#7a3a32';
        ctx.fillRect(x0 + 0.8, -4.2, half - 1.6, 8.4);
        ctx.fillStyle = '#b8bec6';
        ctx.fillRect(x0 + 2, side < 0 ? 1.4 : 1.4, half - 4, 1.2);
        if (door.sealed) {
          ctx.fillStyle = '#d0402e';
          ctx.fillRect(x0 + (side < 0 ? half - 3 : 1), -1, 2, 2);
        }
      });
      frame(ctx, door, '#3a2a28');
      ctx.restore();
    },
    // the armory cage: a mesh gate
    cage(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0) => {
        ctx.strokeStyle = '#9aa1a8';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x0 + 0.5, -2, half - 1, 4);
        ctx.beginPath();
        for (let i = 1; i < half; i += 2.4) {
          ctx.moveTo(x0 + i, -2);
          ctx.lineTo(x0 + i + 1.6, 2);
        }
        ctx.stroke();
        ctx.fillStyle = '#5a6168';
        ctx.fillRect(x0, -2.4, half, 0.9);
        ctx.fillRect(x0, 1.5, half, 0.9);
      });
      frame(ctx, door, '#4a4f55');
      ctx.restore();
    },
    // a plain steel security door with a card reader
    security(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0) => {
        ctx.fillStyle = '#4c5258';
        ctx.fillRect(x0, -5, half, 10);
        ctx.fillStyle = '#626970';
        ctx.fillRect(x0 + 0.8, -4.2, half - 1.6, 8.4);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x0 + 0.8, -4.2, half - 1.6, 0.8);
        if (door.lock || door.flag) {
          ctx.fillStyle = door.flagColor || (door.lock && LM.KEY_COLORS[door.lock]) || '#58b2ff';
          ctx.fillRect(x0 + 1.5, -5, half - 3, 1.4);
        }
      });
      frame(ctx, door, '#2a2d31');
      ctx.restore();
    },
  };
  const doorGlows = {
    // a sealed or locked shutter blinks amber
    shutter(ctx, door, game, t) {
      if (door.open > 0.3) return;
      if (!(door.sealed || (door.flag && !door.unlocked))) return;
      const on = Math.sin(t * 5 + door.tx) > 0.2 ? 1 : 0.25;
      G.glow(ctx, door.x, door.y, 16, door.flagColor || DS.C.warn, 0.35 * on);
    },
    security(ctx, door, game, t) {
      if (!(door.lock || door.flag)) return;
      const ok = door.unlocked;
      G.glow(ctx, door.x, door.y, 9, ok ? '#5fe08a' : '#ff4a3a', ok ? 0.25 : 0.35 + 0.15 * Math.sin(t * 4));
    },
    cage(ctx, door, game, t) {
      if (door.unlocked) return;
      G.glow(ctx, door.x, door.y, 10, door.flagColor || '#58b2ff', 0.3 + 0.12 * Math.sin(t * 3));
    },
    fire(ctx, door, game, t) {
      if (!door.sealed) return;
      G.glow(ctx, door.x, door.y, 12, '#ff3a2a', 0.25 + 0.12 * Math.sin(t * 6));
    },
  };
  DS.doorStyles = doorStyles;
  DS.doorGlows = doorGlows;

  // ======================================================== the ground floor
  const office = LM.find('environments', 'office');
  const glass = office && office.doorStyles ? { glass: office.doorStyles.glass, stall: office.doorStyles.stall } : {};
  const environments = {
    'ds-lobby': {
      name: 'Asterion · Ground floor',
      voidColor: '#07080a',
      ambient: '#353a43',
      attractAmbient: '#5a606b',
      outsideSight: '#2b2f37',
      playerLight: '#eef4ff',
      torch: '#ff6a50',
      floors: {
        0: { style: 'carpet-tile', colors: ['#454b57', '#414753'], line: '#9aa4b6', speck: '#22262e' },
        1: { style: 'terrazzo', base: '#878c91', chips: ['#7d8288', '#4f585e', '#9aa7ae', '#e2e4e6', '#353b40'], strip: '#8b96a0' },
        2: { style: 'bath-tile', tile: '#cfd6da', grout: '#8e989f', accent: '#6f9aa8' },
        3: { style: 'planks', colors: ['#9c7a54', '#94734f', '#a4825c'], grain: '#5a3e22', gap: '#4a3420' },
        4: { style: 'clean-panel', base: '#c3c9cd', seam: '#868f96', perforated: true },
        5: { style: 'carpet-warped', colors: ['#3b414d', '#373d49'], line: '#7e889a', concrete: '#45464a', stain: '#3a0c0c', wrong: '#5a1e22' },
        6: { style: 'concrete', base: '#5b5e62', joint: 3 },
        7: { style: 'carpet-tile', colors: ['#3a4152', '#363d4e'], line: '#8a94a6', speck: '#1e2230', accent: '#8a94a6' },
      },
      floor: { style: 'carpet-tile', colors: ['#454b57', '#414753'], line: '#9aa4b6', speck: '#22262e' },
      wall: { style: 'drywall', top: ['#c4c8cc'], edge: '#eceef0', face: '#a3a8ad', faceDark: '#83888d', base: '#36383c' },
      water: { deep: '#14262c', shallow: '#24424c', foam: '#9ac8d4' },
      pit: { core: '#030304', wall: '#1d1f22', rim: '#3a3d42' },
      door: { panel: '#6a7078', frame: '#3a3e44', trim: '#b8bec6' },
      doorStyles: Object.assign({}, glass, doorStyles),
      doorGlows,
      particles: { type: 'mote', color: '#cfd8e6', rate: 2, alpha: 0.12, drift: 2 },
      ambience: { base: 55, cutoff: 300, wind: 700, gain: 0.04, wave: 'sine' },
    },
  };
  DS.SHUTTER = { style: 'shutter', top: ['#4a4f55'], edge: '#7c838b', face: '#5d646b', faceDark: '#33373c', trim: '#2a2d31' };

  LM.definePack({ id: 'ds-lab', name: 'Lab', version: '0.1.0', textures, environments });
})();
