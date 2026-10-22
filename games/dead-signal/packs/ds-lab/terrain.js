/* Dead Signal — packs/ds-lab/terrain.js
 * Tiles for the building.
 *
 *   ds-stairs-up          stairs on to the next floor that climb (exit, like '>')
 *   ds-stairs-down        stairs back to the floor below (entry, like '<')
 *   ds-stairs-down-on     stairs on to a floor that is below this one (exit, drawn going down): the basement
 *   ds-stairs-up-back     stairs back to the floor above (entry, drawn going up): the way out of the basement
 *   ds-shutter-wall       a lockdown shutter over an outside window or doorway (a wall)
 *   ds-door-shutter       a shutter that opens like a door (seal it from a trap, or props { sealed: true })
 *   ds-door-lockdown      the basement shutter: opens for basementOpen or master
 *   ds-door-fire          a stairwell fire door
 *   ds-door-security      a steel office door with a card reader
 *   ds-door-cage          the armory cage gate: opens for Officer Ruiz's badge (flag ruizBadge)
 *   ds-mesh-h, -v, -elbow, -junction   wire-mesh walls (you can see through them, not shoot through them)
 *   ds-live-water         water with a live cable in it: it shocks on a pulse until the floor's
 *                         liveWaterOff flag is set (level field liveWaterOff; default 'liveWaterOff')
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;

  // ------------------------------------------------------------ stairs
  // A flight of treads across the tile. look 'up': the treads brighten toward the top of the tile, where
  // they rise to; 'down': they fall away into the dark. Turn the tile for the other directions.
  function stairsBake(look) {
    return function (g, x, y, info) {
      const env = info.env;
      const base = (env.floors && env.floors[6]) || null;
      if (base) LM.get('textures', base.style).paint(g, x, y, info, base);
      else LM.paintFloor(g, x, y, info);
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(x + 1, y + 1, T - 2, T - 2);
      const n = 6, step = (T - 4) / n;
      for (let i = 0; i < n; i++) {
        // i = 0 is the top tread
        const k = look === 'up' ? 1 - i / n : i / n;
        const c = U.shade('#7a7f86', -0.55 + k * 0.6);
        g.fillStyle = c;
        g.fillRect(x + 3, y + 2 + i * step, T - 6, step - 1.1);
        g.fillStyle = 'rgba(255,255,255,' + (0.05 + k * 0.12) + ')';
        g.fillRect(x + 3, y + 2 + i * step, T - 6, 0.8);
        // a yellow nosing strip on every tread
        g.fillStyle = U.rgba(DS.C.hazard, 0.25 + k * 0.35);
        g.fillRect(x + 3, y + 2 + i * step + step - 2.2, T - 6, 0.9);
      }
      // handrails at the sides
      g.fillStyle = '#2a2d31';
      g.fillRect(x + 1, y + 1, 2, T - 2);
      g.fillRect(x + T - 3, y + 1, 2, T - 2);
      g.fillStyle = '#9aa1a8';
      g.fillRect(x + 1.6, y + 1, 0.8, T - 2);
      g.fillRect(x + T - 2.4, y + 1, 0.8, T - 2);
    };
  }
  function stairsGlow(look, color) {
    // the engine turns animated drawing with the tile, so this draws the stairs facing north
    return function (g, x, y, tx, ty, game, t) {
      g.save();
      g.translate(x + T / 2, y + T / 2);
      G.glow(g, 0, 0, 22, color, 0.12 + 0.05 * Math.sin(t * 2));
      g.strokeStyle = U.rgba(color, 0.35 + 0.2 * Math.sin(t * 3));
      g.lineWidth = 1.2;
      // chevrons pointing the way the stairs go
      for (let i = 0; i < 2; i++) {
        const ph = (t * 0.8 + i * 0.5) % 1;
        const yy = look === 'up' ? 6 - ph * 12 : -6 + ph * 12;
        const d = look === 'up' ? -3 : 3;
        g.globalAlpha = Math.sin(ph * Math.PI);
        g.beginPath();
        g.moveTo(-5, yy - d);
        g.lineTo(0, yy);
        g.lineTo(5, yy - d);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.restore();
    };
  }
  const stairs = (look, role, color, mapColor) =>
    Object.assign({ floorLike: true, mapColor, bake: stairsBake(look), drawGlow: stairsGlow(look, color), turns: true }, role === 'exit' ? { exit: true } : { entry: true });

  // ------------------------------------------------------------ doors
  function doorBake(g, x, y, info) {
    LM.paintFloor(g, x, y, info);
    const horiz = info.across != null ? info.across : info.n(-1, 0).solid || info.n(1, 0).solid;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    if (horiz) g.fillRect(x, y + T / 2 - 6, T, 12);
    else g.fillRect(x + T / 2 - 6, y, 12, T);
  }
  const door = (spec, mapColor) => ({ floorLike: true, door: spec, bake: doorBake, mapColor: mapColor || 'rgba(205,190,160,0.16)' });

  // ------------------------------------------------------------ mesh (the armory cage)
  const ARMS = { h: 'ew', v: 'ns', elbow: 'es', junction: 'esw' };
  function meshRects(arms) {
    const c0 = 14.5, w = 3, out = [];
    if (arms.includes('n')) out.push([c0, 0, w, c0 + w]);
    if (arms.includes('s')) out.push([c0, c0, w, T - c0]);
    if (arms.includes('e')) out.push([c0, c0, T - c0, w]);
    if (arms.includes('w')) out.push([0, c0, c0 + w, w]);
    return out;
  }
  function meshBake(arms) {
    const rects = meshRects(arms);
    return function (g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      for (const [rx, ry, rw, rh] of rects) {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x + rx + 1.5, y + ry + 2, rw, rh);
        g.strokeStyle = 'rgba(170,178,186,0.75)';
        g.lineWidth = 0.5;
        g.beginPath();
        if (rw > rh) for (let i = 0; i < rw; i += 2.2) { g.moveTo(x + rx + i, y + ry); g.lineTo(x + rx + i + 1.6, y + ry + rh); }
        else for (let i = 0; i < rh; i += 2.2) { g.moveTo(x + rx, y + ry + i); g.lineTo(x + rx + rw, y + ry + i + 1.6); }
        g.stroke();
        g.fillStyle = '#6a7178';
        if (rw > rh) { g.fillRect(x + rx, y + ry, rw, 0.7); g.fillRect(x + rx, y + ry + rh - 0.7, rw, 0.7); }
        else { g.fillRect(x + rx, y + ry, 0.7, rh); g.fillRect(x + rx + rw - 0.7, y + ry, 0.7, rh); }
      }
      // a post where arms meet
      g.fillStyle = '#4a5056';
      g.fillRect(x + 14, y + 14, 4, 4);
    };
  }
  const mesh = {};
  for (const [k, arms] of Object.entries(ARMS)) mesh['ds-mesh-' + k] = { solid: true, rects: meshRects(arms), blocksShots: true, layer: 1, noAO: true, mapColor: '#9aa1a8', bake: meshBake(arms) };

  // ------------------------------------------------------------ live water
  const PULSE = 3, ON = 1.1;
  const liveOff = (game) => game.hasFlag((game.level && game.level.def.liveWaterOff) || 'liveWaterOff');
  const pulseOn = (game, tx, ty) => ((game.time + (tx + ty) * 0.02) % PULSE) < ON;
  const water = LM.find('terrain', 'water');
  const live = {
    swim: true, noDecals: true, hazard: 'shock', damage: 14, interval: 0.5, mapColor: '#2a5e6a',
    active: (game, tx, ty) => !liveOff(game) && pulseOn(game, tx, ty),
    onHurt(game, P) {
      P.vx *= 0.2;
      P.vy *= 0.2;
      game.addShake(0.2);
      LM.audio.play('shock');
    },
    bake: (g, x, y, info) => (water && water.bake ? water.bake(g, x, y, info) : null),
    drawDynamic: water && water.drawDynamic,
    drawGlow(g, x, y, tx, ty, game, t) {
      if (liveOff(game)) return;
      const on = pulseOn(game, tx, ty);
      const k = on ? 1 : 0.15;
      const r = U.mulberry32(((tx * 73856093) ^ (ty * 19349663) ^ Math.floor(t * 14)) >>> 0);
      G.glow(g, x + T / 2, y + T / 2, 26, '#9fe8ff', 0.18 * k);
      if (!on && r() > 0.25) return;
      g.strokeStyle = 'rgba(200,245,255,' + (0.7 * k) + ')';
      g.lineWidth = 0.9;
      for (let a = 0; a < (on ? 3 : 1); a++) {
        let px = x + r() * T, py = y + r() * T;
        g.beginPath();
        g.moveTo(px, py);
        for (let i = 0; i < 4; i++) {
          px += (r() - 0.5) * 12;
          py += (r() - 0.5) * 12;
          g.lineTo(px, py);
        }
        g.stroke();
      }
    },
  };

  const terrain = Object.assign({
    'ds-stairs-up': stairs('up', 'exit', DS.C.accent, '#8fb8a8'),
    'ds-stairs-down': stairs('down', 'entry', '#9aa3ad', '#6f7a84'),
    'ds-stairs-down-on': stairs('down', 'exit', DS.C.warn, '#e0b25a'),
    'ds-stairs-up-back': stairs('up', 'entry', '#9aa3ad', '#6f7a84'),
    'ds-shutter-wall': {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor: '#7a6a3a',
      bake: (g, x, y, info) => LM.paintWall(g, x, y, info, DS.SHUTTER),
    },
    'ds-door-shutter': door({ lock: null, style: 'shutter' }),
    'ds-door-lockdown': door({ lock: null, style: 'shutter', flag: ['basementOpen', 'master'], need: 'Lockdown override', color: '#e0b25a' }, '#e0b25a'),
    'ds-door-fire': door({ lock: null, style: 'fire' }),
    'ds-door-security': door({ lock: null, style: 'security' }),
    'ds-door-cage': door({ lock: null, style: 'cage', flag: ['ruizBadge', 'master'], need: 'An officer’s badge', color: '#58b2ff' }, '#58b2ff'),
    'ds-live-water': live,
  }, mesh);

  if (LM.audio && LM.audio.define) {
    LM.audio.define('shock', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 3000, dur: 0.18, gain: 0.12 });
      kit.tone(t, o, { type: 'sawtooth', f0: 120, f1: 60, dur: 0.2, gain: 0.06 });
    });
  }

  LM.definePack({ id: 'ds-lab', terrain });
})();
