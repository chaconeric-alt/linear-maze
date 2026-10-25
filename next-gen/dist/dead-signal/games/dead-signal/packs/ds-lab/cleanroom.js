/* Dead Signal — packs/ds-lab/cleanroom.js
 * Floor 2's look: ds-cleanroom, Asterion's synthid research floor. White panels, glass, the green
 * guide lights of an evacuation, and the shelter's blast door.
 *
 * Floor variants (legend `variant`):
 *   0 corridor panel         1 Discovery Center terrazzo   2 gowning-room tile   3 admin carpet
 *   4 lab panel (perforated) 5 shelter floor (rubber)      6 concrete (stairs)   7 greenhouse grating
 *   8 oncology panel (pale blue)
 *
 * Terrain:
 *   ds-brine        brine a burst tank has flooded the floor with: you wade (slow, no dash); a `terrain`
 *                   trap effect turns it to ds-brine-dry when it's pumped out
 *   ds-brine-dry    the floor once the brine is gone: a crust of salt
 *   ds-door-blast   Shelter B's blast door (seal it with props { sealed: true }, unseal it from a trap)
 *   ds-door-bio     the lab wing's biosafety door: opens for labsOpen or master
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;

  // ======================================================== door styles
  // Shelter B's blast door: two thick steel leaves with hazard edges and heavy bolts, a status lamp.
  function blast(ctx, door) {
    ctx.save();
    ctx.translate(door.x, door.y);
    if (!door.horizontal) ctx.rotate(Math.PI / 2);
    const half = T / 2, k = U.ease.inOutSine(door.open), slide = k * (half - 1);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * slide, 0);
      const x0 = side < 0 ? -half : 0;
      ctx.fillStyle = '#2a2e33';
      ctx.fillRect(x0, -7.5, half, 15);
      ctx.fillStyle = '#5b636b';
      ctx.fillRect(x0 + 0.8, -6.7, half - 1.6, 13.4);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x0 + 0.8, -6.7, half - 1.6, 1);
      // the meeting edge
      DS.hazard(ctx, side < 0 ? half - 3 - half : 0, -6.7, 3, 13.4, 2);
      ctx.fillStyle = '#3a4046';
      for (const by of [-4.5, 0, 4.5]) {
        ctx.beginPath();
        ctx.arc(x0 + (side < 0 ? 4 : half - 4), by, 1.1, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle = '#1b1e22';
    ctx.fillRect(-half, -9, 3, 18);
    ctx.fillRect(half - 3, -9, 3, 18);
    ctx.restore();
  }
  function blastGlow(ctx, door, game, t) {
    const open = door.open > 0.5 && !door.sealed;
    const c = open ? '#5fe08a' : door.sealed ? '#ff3a2a' : '#e0b25a';
    const lx = door.x + (door.horizontal ? 0 : -10), ly = door.y + (door.horizontal ? -10 : 0);
    DS.led(ctx, lx, ly, c, open ? 0.5 : 0.55 + 0.35 * (Math.sin(t * 4) > 0 ? 1 : 0), 1);
  }
  // the lab wing's biosafety door: white leaves, a yellow band, a reader light
  function bio(ctx, door) {
    ctx.save();
    ctx.translate(door.x, door.y);
    if (!door.horizontal) ctx.rotate(Math.PI / 2);
    const half = T / 2, k = U.ease.inOutSine(door.open), slide = k * (half - 2);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * slide, 0);
      const x0 = side < 0 ? -half : 0;
      ctx.fillStyle = '#8f989f';
      ctx.fillRect(x0, -5, half, 10);
      ctx.fillStyle = '#e4e9ec';
      ctx.fillRect(x0 + 0.7, -4.3, half - 1.4, 8.6);
      ctx.fillStyle = DS.C.hazard;
      ctx.fillRect(x0 + 0.7, -1.2, half - 1.4, 2.4);
      // a small window
      ctx.fillStyle = 'rgba(120,170,200,0.55)';
      ctx.fillRect(x0 + (side < 0 ? 4 : half - 8), -3.6, 4, 1.8);
      ctx.restore();
    }
    ctx.fillStyle = '#5a636b';
    ctx.fillRect(-half, -6, 3, 12);
    ctx.fillRect(half - 3, -6, 3, 12);
    ctx.restore();
  }
  function bioGlow(ctx, door, game, t) {
    if (!door.flag) return;
    const ok = door.unlocked;
    G.glow(ctx, door.x, door.y, 10, ok ? '#5fe08a' : door.flagColor || '#e0b25a', ok ? 0.25 : 0.35 + 0.15 * Math.sin(t * 3));
  }

  // ======================================================== the synthid research floor
  const office = LM.find('environments', 'office');
  const glass = office && office.doorStyles ? { glass: office.doorStyles.glass, stall: office.doorStyles.stall } : {};
  const environments = {
    'ds-cleanroom': {
      name: 'Asterion · Synthid research',
      voidColor: '#07090b',
      ambient: '#3d454d',
      attractAmbient: '#646d76',
      outsideSight: '#30363d',
      playerLight: '#f2f8ff',
      torch: '#ff6a50',
      floors: {
        0: { style: 'clean-panel', base: '#c3cacf', seam: '#8a949b' },
        1: { style: 'terrazzo', base: '#aab6bd', chips: ['#9fb0b8', '#5f7f8a', '#e6eef0', '#6fb8c8', '#3e5058'], strip: '#7fb8c4' },
        2: { style: 'bath-tile', tile: '#d4dce0', grout: '#94a0a7', accent: '#6fb8c8' },
        3: { style: 'carpet-tile', colors: ['#3e4a5a', '#3a4656'], line: '#8a9ab0', speck: '#202634' },
        4: { style: 'clean-panel', base: '#d0d6da', seam: '#8f99a0', perforated: true },
        5: { style: 'concrete', base: '#4d5459', joint: 2 },
        6: { style: 'concrete', base: '#5b5e62', joint: 3 },
        7: { style: 'grate', under: '#18221c', heat: '#4f9a5c', bar: '#66746c' },
        8: { style: 'clean-panel', base: '#c3d2da', seam: '#869aa6', perforated: true },
      },
      floor: { style: 'clean-panel', base: '#c3cacf', seam: '#8a949b' },
      wall: { style: 'drywall', top: ['#dfe4e7'], edge: '#ffffff', face: '#c4cbd0', faceDark: '#9ca5ab', base: '#55606a' },
      water: { deep: '#3c5a56', shallow: '#6a8c84', foam: '#eef4ee' },
      pit: { core: '#030304', wall: '#1d1f22', rim: '#3a3d42' },
      door: { panel: '#c9d0d5', frame: '#6f7a83', trim: '#eef1f3' },
      doorStyles: Object.assign({}, glass, DS.doorStyles, { blast, bio }),
      doorGlows: Object.assign({}, DS.doorGlows, { blast: blastGlow, bio: bioGlow }),
      particles: { type: 'mote', color: '#e6f2ff', rate: 2, alpha: 0.1, drift: 2 },
      ambience: { base: 60, cutoff: 420, wind: 900, gain: 0.035, wave: 'sine' },
    },
  };

  // ======================================================== terrain
  const water = LM.find('terrain', 'water');
  function saltBake(g, x, y, info) {
    LM.paintFloor(g, x, y, info);
    const r = info.rnd;
    // a tide-mark of salt where the brine stood, and a damp sheen
    g.fillStyle = 'rgba(60,90,86,0.18)';
    g.fillRect(x, y, T, T);
    g.strokeStyle = 'rgba(245,250,245,0.55)';
    g.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(x + r() * T, y + r() * T, 3 + r() * 9, r() * 6, r() * 6 + 2.5);
      g.stroke();
    }
    g.fillStyle = 'rgba(250,252,250,0.5)';
    for (let i = 0; i < 18; i++) g.fillRect(x + r() * T, y + r() * T, 1, 1);
  }
  const door = (spec, mapColor) => ({
    floorLike: true, door: spec, mapColor: mapColor || 'rgba(205,190,160,0.16)',
    bake(g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      const horiz = info.across != null ? info.across : info.n(-1, 0).solid || info.n(1, 0).solid;
      g.fillStyle = 'rgba(0,0,0,0.38)';
      if (horiz) g.fillRect(x, y + T / 2 - 8, T, 16);
      else g.fillRect(x + T / 2 - 8, y, 16, T);
    },
  });
  const terrain = {
    'ds-brine': {
      swim: true, noDecals: true, mapColor: '#5a8a80',
      bake: (g, x, y, info) => (water && water.bake ? water.bake(g, x, y, info) : null),
      drawDynamic: water && water.drawDynamic,
      drawGlow(g, x, y, tx, ty, game, t) {
        // salt glints on the surface
        const r = U.mulberry32(((tx * 92821) ^ (ty * 68917) ^ Math.floor(t * 1.5)) >>> 0);
        if (r() < 0.6) return;
        G.glow(g, x + r() * T, y + r() * T, 4, '#eaf6f0', 0.25);
      },
    },
    'ds-brine-dry': { floorLike: true, mapColor: 'rgba(205,215,210,0.2)', bake: saltBake },
    'ds-door-blast': door({ lock: null, style: 'blast' }, '#c0503a'),
    'ds-door-bio': door({ lock: null, style: 'bio', flag: ['labsOpen', 'master'], need: 'Biosafety release', color: '#e0b25a' }, '#e0b25a'),
  };

  LM.definePack({ id: 'ds-lab', environments, terrain });
})();
