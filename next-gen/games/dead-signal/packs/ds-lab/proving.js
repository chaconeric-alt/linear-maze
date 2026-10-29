/* Dead Signal — packs/ds-lab/proving.js
 * Floor 4's look: ds-proving, the Proving Grounds. Garrick Moss's floor: bare concrete and steel plate
 * under sodium light, the Run (a maze of bulkheads the board watched people die in), and behind sealed
 * doors the board's private suites, each dressed as a nightmare: a nursery, a dinner party, a birthday.
 *
 * Floor variants (legend `variant`):
 *   0 concrete corridor (a painted safety line)   1 the Run's steel plate     2 the board's carpet
 *   3 nursery carpet (stars and moons)              4 dining-room parquet      5 party tiles
 *   6 concrete (stairs)                             7 kennel floor (stained)   8 dream studio (dark panel)
 *   9 the arena's sawdust
 *
 * Painters: starry-carpet, parquet (herringbone), party-tile (pastel check, confetti), wallpaper (a wall:
 * plaster on top, papered face and a skirting board; props.pattern stars | damask | stripes).
 * Terrain:
 *   ds-bars-h, ds-bars-v    steel cage bars (you can see through them, not walk or shoot through them)
 *   ds-door-bars            a barred cage gate (seal it with props.sealed; a trap unseals it)
 *   ds-blades               a floor of blade slots: on a cycle, blades come up out of them. A red glow
 *                           in the slots warns you first. Until the floor's trialEnded flag.
 *   ds-shock-plate          a floor plate that shocks on a pulse (the field pulses as one), until trialEnded
 *   ds-door-trial           a trial gate: locked until the trial ends (flag trialEnded, or master)
 *   ds-door-suite           a private suite's door: dark wood and a brass plate (seal it with props.sealed)
 *   ds-door-armory          Security Command's armory door: opens for armoryOpen (its keypad) or master
 *   ds-wall-nursery, ds-wall-dining, ds-wall-party   papered walls for the suites
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const TRIAL = '#ff3a6a', SODIUM = '#ffb060';
  const trialOver = (game) => game.hasFlag('trialEnded');

  // ======================================================== painters
  const star4 = (g, x, y, s) => {
    g.beginPath();
    g.moveTo(x, y - s);
    g.quadraticCurveTo(x, y, x + s, y);
    g.quadraticCurveTo(x, y, x, y + s);
    g.quadraticCurveTo(x, y, x - s, y);
    g.quadraticCurveTo(x, y, x, y - s);
    g.fill();
  };
  const textures = {
    // a child's bedroom carpet: deep blue, scattered with stars and the odd moon
    'starry-carpet': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.base;
        g.fillRect(x, y, T, T);
        for (let i = 0; i < 24; i++) {
          g.fillStyle = U.rgba(r() < 0.5 ? '#000000' : '#ffffff', 0.05);
          g.fillRect(x + r() * T, y + r() * T, 1, 1);
        }
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          g.fillStyle = U.rgba(p.star, 0.55 + r() * 0.3);
          star4(g, x + 4 + r() * (T - 8), y + 4 + r() * (T - 8), 1.6 + r() * 1.8);
        }
        if (r() < 0.12) {
          const mx = x + 8 + r() * 16, my = y + 8 + r() * 16;
          g.fillStyle = U.rgba(p.moon || p.star, 0.7);
          g.beginPath();
          g.arc(mx, my, 3.6, 0, U.TAU);
          g.fill();
          g.fillStyle = p.base;
          g.beginPath();
          g.arc(mx + 1.6, my - 1, 3.1, 0, U.TAU);
          g.fill();
        }
        // a stain that didn't come out, here and there
        if (p.stain && r() < 0.06) {
          g.fillStyle = U.rgba(p.stain, 0.3);
          g.beginPath();
          g.ellipse(x + r() * T, y + r() * T, 4 + r() * 6, 3 + r() * 4, r() * 3, 0, U.TAU);
          g.fill();
        }
      },
    },
    // basket-weave blocks of dark polished wood
    parquet: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.gap;
        g.fillRect(x, y, T, T);
        const S = 16, W = S / 3;
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const qx = info.x * 2 + i, qy = info.y * 2 + j, across = (qx + qy) % 2 === 0;
            for (let k = 0; k < 3; k++) {
              const hsh = U.hash2(qx * 3 + k, qy * 5 + k, 5);
              g.fillStyle = U.shade(p.colors[Math.floor(hsh * p.colors.length)], (hsh - 0.5) * 0.12);
              const bx = x + i * S, by = y + j * S;
              if (across) g.fillRect(bx + 0.4, by + k * W + 0.4, S - 0.8, W - 0.8);
              else g.fillRect(bx + k * W + 0.4, by + 0.4, W - 0.8, S - 0.8);
              g.fillStyle = 'rgba(255,255,255,0.05)';
              if (across) g.fillRect(bx + 0.4, by + k * W + 0.4, S - 0.8, 0.5);
              else g.fillRect(bx + k * W + 0.4, by + 0.4, 0.5, S - 0.8);
            }
          }
        }
        // a polish that catches the candles
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        grd.addColorStop(0, 'rgba(255,230,190,0.05)');
        grd.addColorStop(1, 'rgba(0,0,0,0.1)');
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
      },
    },
    // a party floor: pastel squares, confetti trodden in
    'party-tile': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.grout;
        g.fillRect(x, y, T, T);
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const k = (info.x * 2 + i + info.y * 2 + j) % 2;
            g.fillStyle = U.shade(p.colors[k ? 0 : 1], (U.hash2(info.x * 2 + i, info.y * 2 + j, 4) - 0.5) * 0.06);
            g.fillRect(x + i * 16 + 0.5, y + j * 16 + 0.5, 15, 15);
          }
        }
        for (let i = 0; i < 6; i++) {
          g.fillStyle = U.rgba(p.confetti[Math.floor(r() * p.confetti.length)], 0.8);
          g.save();
          g.translate(x + r() * T, y + r() * T);
          g.rotate(r() * 3);
          g.fillRect(-1.2, -0.5, 2.4, 1);
          g.restore();
        }
        if (r() < 0.1) {
          g.fillStyle = 'rgba(90,10,20,0.35)';
          g.beginPath();
          g.ellipse(x + r() * T, y + r() * T, 4 + r() * 8, 3 + r() * 5, r() * 3, 0, U.TAU);
          g.fill();
        }
      },
    },
    // a papered wall: plaster on top, and on its face the paper, a dado rail and a skirting board
    wallpaper: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        g.fillStyle = U.shade(p.top[0], -0.12);
        g.fillRect(x, y + h / 2 - 1.5, T, 0.6);
        g.fillRect(x, y + h / 2 + 1, T, 0.6);
      },
      face(g, x, y, fh, info, p) {
        g.fillStyle = p.face;
        g.fillRect(x, y, T, fh);
        g.save();
        g.beginPath();
        g.rect(x, y, T, fh - 2);
        g.clip();
        g.fillStyle = p.ink;
        if (p.pattern === 'stars') {
          for (let i = 0; i < 4; i++) star4(g, x + 4 + i * 8 + (info.x % 2) * 4, y + 2 + (i % 2) * 3.5, 1.1);
        } else if (p.pattern === 'stripes') {
          for (let i = 0; i < T; i += 6) g.fillRect(x + i, y, 3, fh);
        } else {
          // damask: a gold lozenge on deep red
          for (let i = 0; i < 2; i++) {
            const cx = x + 8 + i * 16, cy = y + fh / 2 - 1;
            g.beginPath();
            g.moveTo(cx, cy - 3.2);
            g.lineTo(cx + 2.4, cy);
            g.lineTo(cx, cy + 3.2);
            g.lineTo(cx - 2.4, cy);
            g.closePath();
            g.fill();
          }
        }
        g.restore();
        g.fillStyle = p.base;
        g.fillRect(x, y + fh - 2, T, 2);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(x, y + fh - 2, T, 0.5);
      },
    },
  };
  const PAPER = {
    nursery: { style: 'wallpaper', pattern: 'stars', top: ['#d8d2c8'], edge: '#efe9df', face: '#2e3a66', ink: '#e8dca0', base: '#f0ece4' },
    dining: { style: 'wallpaper', pattern: 'damask', top: ['#3a2a26'], edge: '#6a4a3a', face: '#4a141c', ink: '#a8823a', base: '#1e1410' },
    party: { style: 'wallpaper', pattern: 'stripes', top: ['#d8cfc4'], edge: '#f2ece2', face: '#e8b8c8', ink: '#f6e6ec', base: '#6a4a8a' },
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
  function frame(ctx, col) {
    const half = T / 2;
    ctx.fillStyle = col;
    ctx.fillRect(-half, -6, 3, 12);
    ctx.fillRect(half - 3, -6, 3, 12);
  }
  const doorStyles = {
    // a cage gate: round steel bars on a frame; it slides open
    bars(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0) => {
        ctx.fillStyle = '#3a3e44';
        ctx.fillRect(x0, -2.6, half, 1.2);
        ctx.fillRect(x0, 1.4, half, 1.2);
        for (let i = 1.5; i < half; i += 3.2) {
          ctx.fillStyle = '#1a1c1f';
          ctx.beginPath();
          ctx.arc(x0 + i + 0.4, 0.5, 1.25, 0, U.TAU);
          ctx.fill();
          ctx.fillStyle = '#9aa1a8';
          ctx.beginPath();
          ctx.arc(x0 + i, 0, 1.1, 0, U.TAU);
          ctx.fill();
        }
      });
      frame(ctx, '#2a2d31');
      ctx.restore();
    },
    // a private suite: dark polished wood, a brass plate
    suite(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0, side) => {
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(x0, -5, half, 10);
        ctx.fillStyle = '#4a2c1c';
        ctx.fillRect(x0 + 0.8, -4.2, half - 1.6, 8.4);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x0 + 2.2, -2.8, half - 4.4, 5.6);
        ctx.fillStyle = '#c9a046';
        ctx.fillRect(x0 + (side < 0 ? half - 3 : 1.6), -0.8, 1.4, 1.6);
      });
      frame(ctx, '#1a100a');
      ctx.restore();
    },
    // the trial gate: heavy steel with red and white chevrons
    trial(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      leaves(ctx, door, (x0, side) => {
        ctx.fillStyle = '#2a2c30';
        ctx.fillRect(x0, -6, half, 12);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0 + 1, -4.5, half - 2, 9);
        ctx.clip();
        ctx.fillStyle = '#e8e4dc';
        ctx.fillRect(x0 + 1, -4.5, half - 2, 9);
        ctx.fillStyle = '#b8203a';
        for (let i = -12; i < half + 12; i += 5) {
          ctx.beginPath();
          ctx.moveTo(x0 + i, -4.5);
          ctx.lineTo(x0 + i + 2.5, -4.5);
          ctx.lineTo(x0 + i + 2.5 + side * 4.5, 0);
          ctx.lineTo(x0 + i + 2.5, 4.5);
          ctx.lineTo(x0 + i, 4.5);
          ctx.lineTo(x0 + i + side * 4.5, 0);
          ctx.fill();
        }
        ctx.restore();
      }, 1);
      frame(ctx, '#16171a');
      ctx.restore();
    },
  };
  const doorGlows = {
    bars(ctx, door, game, t) {
      if (!door.sealed || door.open > 0.3) return;
      G.glow(ctx, door.x, door.y, 10, '#ff3a2a', 0.18 + 0.1 * Math.sin(t * 4 + door.tx));
    },
    suite(ctx, door, game, t) {
      if (door.open > 0.3) return;
      // a little lamp over the door: red while it's sealed
      const c = door.sealed ? '#ff3a2a' : '#e0b25a';
      G.glow(ctx, door.x, door.y, 12, c, door.sealed ? 0.3 + 0.12 * Math.sin(t * 2.5) : 0.18);
    },
    trial(ctx, door, game, t) {
      if (door.open > 0.3) return;
      const locked = door.sealed || (door.flag && !door.unlocked);
      const on = Math.sin(t * 6 + door.tx) > 0 ? 1 : 0.3;
      G.glow(ctx, door.x, door.y, 16, locked ? TRIAL : '#5fe08a', locked ? 0.35 * on : 0.2);
    },
  };

  // ======================================================== the floor
  const office = LM.find('environments', 'office');
  const clean = LM.find('environments', 'ds-cleanroom');
  const wet = LM.find('environments', 'ds-wetlab');
  const glass = office && office.doorStyles ? { glass: office.doorStyles.glass, stall: office.doorStyles.stall } : {};
  const environments = {
    'ds-proving': {
      name: 'Asterion · Proving Grounds',
      voidColor: '#060505',
      ambient: '#2c2622',
      attractAmbient: '#544a42',
      outsideSight: '#201b18',
      playerLight: '#fff0dc',
      torch: '#ff7a3a',
      floors: {
        0: { style: 'concrete', base: '#4c4844', joint: 3, line: '#d9a21c' },
        1: { style: 'plates', colors: ['#45484d', '#404348', '#4a4d52'], seam: '#17181b', rivet: '#7a7f86', rust: '#6a3a20', stripe: ['#d9a32a', '#16161a'] },
        2: { style: 'carpet', base: '#3a161c', pattern: '#4a2026', border: '#c9a046' },
        3: { style: 'starry-carpet', base: '#28305a', star: '#efe2a0', moon: '#f6eecc', stain: '#3a0a10' },
        4: { style: 'parquet', colors: ['#4a2c1a', '#3e2414', '#56341e'], gap: '#1a0e08' },
        5: { style: 'party-tile', colors: ['#f0c8d4', '#c8e8d8'], grout: '#9a8a90', confetti: ['#ff5ab0', '#5ad0ff', '#ffe04a', '#8aff6a', '#c08aff'] },
        6: { style: 'concrete', base: '#56595c', joint: 3 },
        7: { style: 'resin', base: '#38342f', stain: '#4a1010', fleck: '#7a6a5a', stains: 0.32 },
        8: { style: 'clean-panel', base: '#26282e', seam: '#121317', perforated: true },
        9: { style: 'sawdust', base: '#6a5a40', light: '#b09a70', dark: '#3a2e1c' },
      },
      floor: { style: 'concrete', base: '#4c4844', joint: 3, line: '#d9a21c' },
      wall: { style: 'bulkhead', top: ['#3c3e42', '#383a3e', '#404246'], seam: '#18191c', bolt: '#6f747b', rust: '#6a3a20', edge: '#80868e', face: '#25272a', stripe: ['#d9a32a', '#141418'] },
      water: { deep: '#14201c', shallow: '#26382e', foam: '#a8c8b0' },
      pit: { core: '#030303', wall: '#161616', rim: '#303030' },
      door: { panel: '#4c5056', frame: '#24272a', trim: '#d9a21c' },
      doorStyles: Object.assign({}, glass, DS.doorStyles, clean ? clean.doorStyles : {}, wet ? { contain: wet.doorStyles.contain } : {}, doorStyles),
      doorGlows: Object.assign({}, DS.doorGlows, clean ? clean.doorGlows : {}, wet ? { contain: wet.doorGlows.contain } : {}, doorGlows),
      particles: { type: 'mote', color: '#ffd8a8', rate: 2, alpha: 0.09, drift: 3 },
      ambience: { base: 38, cutoff: 220, wind: 300, gain: 0.055, wave: 'sawtooth' },
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

  // cage bars: a line of round bars on a rail, across the middle of the tile
  function barsBake(horiz) {
    return function (g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      g.save();
      g.translate(x + T / 2, y + T / 2);
      if (!horiz) g.rotate(Math.PI / 2);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(-T / 2, 0, T, 4);
      g.fillStyle = '#2e3236';
      g.fillRect(-T / 2, -2.2, T, 1);
      g.fillRect(-T / 2, 1.2, T, 1);
      for (let i = -T / 2 + 2; i < T / 2; i += 4) {
        g.fillStyle = '#121416';
        g.beginPath();
        g.arc(i + 0.5, 0.6, 1.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#8e959c';
        g.beginPath();
        g.arc(i, 0, 1.3, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.fillRect(i - 0.6, -0.8, 0.6, 0.6);
      }
      g.restore();
    };
  }

  // blade slots: on a cycle the blades come up. A wave runs across a strip, so it reads as a sweep.
  const BLADE_CYCLE = 2.6, BLADE_UP = 0.85, BLADE_WARN = 0.55;
  const bladePhase = (game, tx, ty) => (((game.time + (tx + ty) * 0.09) % BLADE_CYCLE) + BLADE_CYCLE) % BLADE_CYCLE;
  const bladesUp = (game, tx, ty) => !trialOver(game) && bladePhase(game, tx, ty) < BLADE_UP;
  const blades = {
    hazard: 'blade', damage: 18, interval: 0.45, mapColor: '#8a3a3a', turns: true,
    active: bladesUp,
    onHurt(game, P) {
      game.addShake(0.15);
      LM.audio.play('bladeHit', { vol: 0.8 });
    },
    bake(g, x, y, info) {
      // a plain steel plate, bolted down
      g.fillStyle = '#141518';
      g.fillRect(x, y, T, T);
      const grd = g.createLinearGradient(x, y, x + T, y + T);
      grd.addColorStop(0, '#50545a');
      grd.addColorStop(1, '#383b40');
      g.fillStyle = grd;
      g.fillRect(x + 1, y + 1, T - 2, T - 2);
      // three slots across the tile, with old blood in them
      for (let i = 0; i < 3; i++) {
        const sy = y + 7 + i * 9;
        g.fillStyle = '#08090a';
        g.fillRect(x + 2, sy - 1.4, T - 4, 2.8);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(x + 2, sy + 1.4, T - 4, 0.5);
        if (info.rnd() < 0.5) {
          g.fillStyle = 'rgba(110,14,14,0.6)';
          g.fillRect(x + 4 + info.rnd() * 18, sy - 1, 3 + info.rnd() * 6, 2);
        }
      }
    },
    drawDynamic(g, x, y, tx, ty, game, t) {
      if (trialOver(game)) return;
      const ph = bladePhase(game, tx, ty);
      if (ph >= BLADE_UP) return;
      // up: serrated steel standing out of each slot
      const k = Math.min(1, ph / 0.08, (BLADE_UP - ph) / 0.12);
      for (let i = 0; i < 3; i++) {
        const sy = y + 7 + i * 9;
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x + 2, sy + 1, T - 4, 2.5 * k);
        g.fillStyle = '#c9ced4';
        g.beginPath();
        g.moveTo(x + 2, sy + 1);
        for (let j = 0; j <= 7; j++) g.lineTo(x + 2 + j * 4, sy + 1 - (j % 2 ? 4.5 : 2.2) * k);
        g.lineTo(x + T - 2, sy + 1);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.fillRect(x + 2, sy - 1.4 * k, T - 4, 0.5);
      }
    },
    drawGlow(g, x, y, tx, ty, game, t) {
      if (trialOver(game)) return;
      const ph = bladePhase(game, tx, ty);
      // the warning: the slots glow red just before the blades come up
      const warn = ph > BLADE_CYCLE - BLADE_WARN ? (ph - (BLADE_CYCLE - BLADE_WARN)) / BLADE_WARN : 0;
      const up = ph < BLADE_UP ? 0.35 : 0;
      const a = Math.max(warn * 0.6, up);
      if (a <= 0.02) return;
      for (let i = 0; i < 3; i++) {
        g.fillStyle = 'rgba(255,40,40,' + a * 0.8 + ')';
        g.fillRect(x + 2, y + 6 + i * 9, T - 4, 2);
      }
      G.glow(g, x + T / 2, y + T / 2, 22, '#ff2a2a', a * 0.35);
    },
  };

  // shock plates: a field that pulses as one (by the 4 x 4 block it's in)
  const PLATE_CYCLE = 3.2, PLATE_ON = 1.0;
  const platePhase = (game, tx, ty) => (game.time + ((tx >> 2) * 0.7 + (ty >> 2) * 1.1)) % PLATE_CYCLE;
  const plateOn = (game, tx, ty) => !trialOver(game) && platePhase(game, tx, ty) < PLATE_ON;
  const shock = {
    hazard: 'shock', damage: 13, interval: 0.5, mapColor: '#3a6a8a',
    active: plateOn,
    onHurt(game, P) {
      P.vx *= 0.25;
      P.vy *= 0.25;
      game.addShake(0.18);
      LM.audio.play('shock');
    },
    bake(g, x, y, info) {
      g.fillStyle = '#121416';
      g.fillRect(x, y, T, T);
      g.fillStyle = '#4a4438';
      g.fillRect(x + 1.5, y + 1.5, T - 3, T - 3);
      const grd = g.createLinearGradient(x, y, x + T, y + T);
      grd.addColorStop(0, '#6a5e48');
      grd.addColorStop(1, '#3a3428');
      g.fillStyle = grd;
      g.fillRect(x + 3, y + 3, T - 6, T - 6);
      // a lightning stencil, worn
      g.fillStyle = 'rgba(217,162,28,0.55)';
      g.beginPath();
      g.moveTo(x + 18, y + 7);
      g.lineTo(x + 12, y + 17);
      g.lineTo(x + 16, y + 17);
      g.lineTo(x + 13, y + 25);
      g.lineTo(x + 21, y + 14);
      g.lineTo(x + 17, y + 14);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.3)';
      for (const [bx, by] of [[4, 4], [T - 4, 4], [4, T - 4], [T - 4, T - 4]]) g.fillRect(x + bx - 0.8, y + by - 0.8, 1.6, 1.6);
    },
    drawGlow(g, x, y, tx, ty, game, t) {
      if (trialOver(game)) return;
      const ph = platePhase(game, tx, ty), on = ph < PLATE_ON;
      // charging: a faint blue that builds; on: arcs
      const k = on ? 1 : Math.max(0, (ph - (PLATE_CYCLE - 0.8)) / 0.8) * 0.4;
      if (k < 0.03) return;
      G.glow(g, x + T / 2, y + T / 2, 24, '#9fe8ff', 0.2 * k);
      if (!on) return;
      const r = U.mulberry32(((tx * 73856093) ^ (ty * 19349663) ^ Math.floor(t * 16)) >>> 0);
      g.strokeStyle = 'rgba(210,248,255,0.8)';
      g.lineWidth = 0.9;
      for (let a = 0; a < 2; a++) {
        let px = x + 3 + r() * (T - 6), py = y + 3 + r() * (T - 6);
        g.beginPath();
        g.moveTo(px, py);
        for (let i = 0; i < 4; i++) {
          px = U.clamp(px + (r() - 0.5) * 12, x + 2, x + T - 2);
          py = U.clamp(py + (r() - 0.5) * 12, y + 2, y + T - 2);
          g.lineTo(px, py);
        }
        g.stroke();
      }
    },
  };

  const terrain = {
    'ds-bars-h': { solid: true, rect: [0, 13, T, 6], blocksShots: true, layer: 1, noAO: true, mapColor: '#9aa1a8', bake: barsBake(true) },
    'ds-bars-v': { solid: true, rect: [13, 0, 6, T], blocksShots: true, layer: 1, noAO: true, mapColor: '#9aa1a8', bake: barsBake(false) },
    'ds-door-bars': doorT({ lock: null, style: 'bars' }, '#9aa1a8'),
    'ds-blades': blades,
    'ds-shock-plate': shock,
    'ds-door-trial': doorT({ lock: null, style: 'trial', flag: ['trialEnded', 'master'], need: 'the trial to end', color: TRIAL }, TRIAL),
    'ds-door-suite': doorT({ lock: null, style: 'suite' }, '#c9a046'),
    'ds-door-armory': doorT({ lock: null, style: 'security', flag: ['armoryOpen', 'master'], need: 'the armory code', color: '#e0b25a' }, '#e0b25a'),
    'ds-wall-nursery': { solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, mapColor: '#5a6a9a', bake: (g, x, y, info) => LM.paintWall(g, x, y, info, PAPER.nursery) },
    'ds-wall-dining': { solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, mapColor: '#6a2a2a', bake: (g, x, y, info) => LM.paintWall(g, x, y, info, PAPER.dining) },
    'ds-wall-party': { solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, mapColor: '#c88aa8', bake: (g, x, y, info) => LM.paintWall(g, x, y, info, PAPER.party) },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('bladeHit', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 2600, dur: 0.12, gain: 0.2 });
      kit.tone(t, o, { type: 'square', f0: 900, f1: 500, dur: 0.05, gain: 0.05 });
    });
  }

  LM.definePack({ id: 'ds-lab', textures, environments, terrain });
})();
