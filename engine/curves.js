/* The Linear Maze engine — engine/curves.js
 * Curved rooms. A level's `ovals` each name a rectangle of the map, and the engine fits an ellipse into it:
 *
 *   ovals: [{ rect: [x, y, w, h], wall: '#', variant: 3, lights: { count: 10, inset: 1.3, color: '#ffc879' } }]
 *
 * Inside the ellipse is floor; outside it, wall. Tiles the ellipse crosses become curve tiles: part floor,
 * part wall, with the boundary a true curve for walking, shooting, sight and light, and baked as one (the
 * floor, the wall's top, and a curved front face along the northern arc where a straight wall would show its
 * face). Tiles of the rectangle the ellipse doesn't reach become the wall. Doors, stairs and other terrain
 * that isn't plain floor or wall are left as they are, so a doorway in the curve still works (put it where
 * the ellipse meets the rectangle's edge: the middle of a side).
 *
 * Fields: rect [x, y, w, h] in tiles (the ellipse touches its four sides); wall: a legend character or a
 * terrain id for the wall (default the legend's '#'); variant: the floor variant under the curve (default
 * the variant at the oval's centre); lights: a ring of recessed ceiling lights { count, inset (tiles in from
 * the wall), color, radius, intensity, flicker, centre: true (one more in the middle), cove: a colour (a
 * soft line of light along the top of the wall), tag }.
 *
 * Engine use: LM.curves.stamp (level.js), the physics hooks (physics.js), bakeChunk (render.js),
 * addLights (game.js), drawGlow (render.js, the emissive pass).
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE, U = LM.util;
  const C = (LM.curves = {});
  const FH = 9; // the height of a wall's front face (LM.paintWall)

  /** The nearest point to (px, py) on the ellipse x²/a² + y²/b² = 1 (centred on the origin). A few steps of
   *  the curvature iteration, which converges from anywhere and never needs a trig call. */
  C.closest = function (px, py, a, b) {
    const ax = Math.abs(px), ay = Math.abs(py);
    let tx = 0.70710678, ty = 0.70710678;
    for (let i = 0; i < 4; i++) {
      const x = a * tx, y = b * ty;
      const ex = ((a * a - b * b) * tx * tx * tx) / a;
      const ey = ((b * b - a * a) * ty * ty * ty) / b;
      const rx = x - ex, ry = y - ey, qx = ax - ex, qy = ay - ey;
      const r = Math.hypot(rx, ry), q = Math.hypot(qx, qy) || 1e-9;
      tx = U.clamp(((qx * r) / q + ex) / a, 0, 1);
      ty = U.clamp(((qy * r) / q + ey) / b, 0, 1);
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
    }
    return [(px < 0 ? -1 : 1) * a * tx, (py < 0 ? -1 : 1) * b * ty];
  };
  /** Is the world point inside the oval's ellipse? */
  const inside = (ov, x, y) => {
    const u = (x - ov.cx) / ov.a, v = (y - ov.cy) / ov.b;
    return u * u + v * v < 1;
  };
  C.inside = inside;
  /** Does any part of tile (tx, ty) lie inside the ellipse? (its nearest point to the centre does) */
  const touches = (ov, tx, ty) => {
    const x = U.clamp(ov.cx, tx * T, tx * T + T), y = U.clamp(ov.cy, ty * T, ty * T + T);
    return inside(ov, x, y);
  };
  /** Is every corner of the tile inside? */
  const within = (ov, tx, ty) => inside(ov, tx * T, ty * T) && inside(ov, tx * T + T, ty * T) && inside(ov, tx * T, ty * T + T) && inside(ov, tx * T + T, ty * T + T);

  // ------------------------------------------------------------ building them into the map
  const curveDefs = new Map();
  const TALL = { tall: true, solid: true, id: 'curve-neighbour' };
  /** The curve tile made from a wall: the wall's look and stops, part of the tile floor. */
  function curveOf(wd) {
    let d = curveDefs.get(wd);
    if (d) return d;
    d = Object.assign({}, wd, {
      id: wd.id + '~curve', curve: true, wall: wd, solid: true, blocksShots: true, blocksLight: true, tall: false, noAO: true,
      noDecals: true, turns: false, shape: undefined, rect: undefined, rects: undefined, door: undefined, hazard: undefined,
      layer: 1, bake: bakeCurve,
    });
    curveDefs.set(wd, d);
    return d;
  }
  function bakeCurve(g, x, y, info) {
    const L = info.level, ov = L.curveAt && L.curveAt[info.y * L.w + info.x];
    LM.paintFloor(g, x, y, info);
    if (!ov) return;
    const wd = this.wall;
    g.save();
    g.beginPath();
    g.rect(x, y, T, T);
    g.ellipse(ov.cx, ov.cy, ov.a, ov.b, 0, 0, U.TAU);
    g.clip('evenodd');
    // the wall's top, as if walled in all round: the curve's own face and lip are baked over it (bakeChunk)
    const n0 = info.n;
    info.n = (dx, dy) => {
      const nx = info.x + dx, ny = info.y + dy;
      if (nx >= ov.x - 1 && ny >= ov.y - 1 && nx <= ov.x + ov.w && ny <= ov.y + ov.h) return TALL;
      return n0(dx, dy);
    };
    try {
      if (wd.bake) wd.bake(g, x, y, info);
    } finally {
      info.n = n0;
      g.restore();
    }
  }

  C.stamp = function (level) {
    const list = level.def.ovals;
    level.ovals = [];
    if (!Array.isArray(list) || !list.length) return;
    const legend = Object.assign({}, LM.registry.legend, level.def.legend || {});
    const terrainOf = (k) => {
      if (k == null) return null;
      let e = legend[k];
      if (typeof e === 'string') e = { terrain: e };
      const id = e ? e.terrain : k;
      return LM.find('terrain', id) || null;
    };
    const dfltWall = terrainOf('#') || LM.find('terrain', 'wall');
    level.curveAt = new Array(level.n).fill(null);
    level.curveIn = new Uint8Array(level.n);
    list.forEach((o, k) => {
      if (!o || !Array.isArray(o.rect) || o.rect.length < 4) return;
      const [rx, ry, rw, rh] = o.rect.map((v) => Math.round(+v));
      if (!(rw >= 2 && rh >= 2)) return;
      const ov = { i: k, x: rx, y: ry, w: rw, h: rh, cx: (rx + rw / 2) * T, cy: (ry + rh / 2) * T, a: (rw * T) / 2, b: (rh * T) / 2, spec: o };
      let wd = terrainOf(o.wall) || dfltWall;
      if (!wd || !wd.solid) wd = dfltWall;
      ov.wallDef = wd;
      const mx = Math.floor(rx + rw / 2), my = Math.floor(ry + rh / 2);
      const variant = o.variant != null ? +o.variant : level.inBounds(mx, my) ? level.variant[my * level.w + mx] : 0;
      ov.variant = variant;
      const cd = curveOf(wd);
      for (let ty = ry; ty < ry + rh; ty++) {
        for (let tx = rx; tx < rx + rw; tx++) {
          if (!level.inBounds(tx, ty)) continue;
          const i = ty * level.w + tx, td = level.terrain[i];
          // doors, stairs, water, pillars...: kept (only plain floor and plain wall are reshaped)
          const plain = td === wd || (td.solid && td.tall && !td.door) || (td.floorLike && !td.door && !td.entry && !td.exit && !td.hazard && !td.elevator);
          if (!plain || within(ov, tx, ty)) continue;
          if (!touches(ov, tx, ty)) {
            level.terrain[i] = wd;
            continue;
          }
          (ov.was || (ov.was = new Map())).set(i, td);
          level.terrain[i] = cd;
          level.curveAt[i] = ov;
          level.curveIn[i] = inside(ov, tx * T + T / 2, ty * T + T / 2) ? 1 : 0;
          level.variant[i] = variant;
        }
      }
      // a doorway in the curve: the curve tile just inside it goes back to plain floor, so the way through
      // is a doorway's width and not pinched to nothing where the curve touches it
      for (let ty = ry - 1; ty <= ry + rh; ty++) {
        for (let tx = rx - 1; tx <= rx + rw; tx++) {
          if (!level.inBounds(tx, ty)) continue;
          const d = level.terrain[ty * level.w + tx];
          if (d.curve || (d.solid && !d.door) || d.hazard) continue;
          const inRect = tx >= rx && ty >= ry && tx < rx + rw && ty < ry + rh;
          if (inRect && within(ov, tx, ty)) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = tx + dx, ny = ty + dy;
            if (!level.inBounds(nx, ny)) continue;
            const j = ny * level.w + nx;
            if (level.curveAt[j] !== ov) continue;
            // only the tile on the way in (toward the middle)
            if ((nx * T + T / 2 - (tx * T + T / 2)) * (ov.cx - (tx * T + T / 2)) + (ny * T + T / 2 - (ty * T + T / 2)) * (ov.cy - (ty * T + T / 2)) <= 0) continue;
            const was = ov.was && ov.was.get(j);
            level.terrain[j] = was && was.floorLike && !was.solid ? was : LM.find('terrain', 'floor') || was;
            level.curveAt[j] = null;
            level.curveIn[j] = 0;
            (ov.opened || (ov.opened = [])).push(j);
          }
        }
      }
      level.ovals.push(ov);
    });
  };

  /** The oval whose ellipse holds the world point, or null. */
  C.at = function (level, x, y) {
    const ovs = level.ovals;
    if (!ovs || !ovs.length) return null;
    for (const ov of ovs) {
      if (x < ov.cx - ov.a || x > ov.cx + ov.a || y < ov.cy - ov.b || y > ov.cy + ov.b) continue;
      if (inside(ov, x, y)) return ov;
    }
    return null;
  };

  // ------------------------------------------------------------ physics
  /** A tile that, seen from inside this oval, is all wall: a curve tile of it, or a solid tile around it that
   *  the ellipse doesn't reach. (Things inside the ellipse, a pillar, a statue on terrain, still collide.) */
  C.wallFor = function (level, ov, tx, ty, d) {
    if (d.curve) return level.curveAt[ty * level.w + tx] === ov;
    if (tx < ov.x - 1 || ty < ov.y - 1 || tx > ov.x + ov.w || ty > ov.y + ov.h) return false;
    return !touches(ov, tx, ty);
  };
  /** Keep a circle that's inside the ellipse at least its radius from the curve, where the curve is wall
   *  (not a doorway). Returns true if it touched. */
  C.push = function (level, ov, e) {
    const lx = e.x - ov.cx, ly = e.y - ov.cy;
    const [qx, qy] = C.closest(lx, ly, ov.a, ov.b);
    let dx = lx - qx, dy = ly - qy;
    const d = Math.hypot(dx, dy);
    if (d >= e.r) return false;
    // the outward normal at the nearest point, and the tile just beyond it
    let nx = qx / (ov.a * ov.a), ny = qy / (ov.b * ov.b);
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const bx = Math.floor((ov.cx + qx + nx * 2) / T), by = Math.floor((ov.cy + qy + ny * 2) / T);
    if (!level.solidAt(bx, by)) return false;
    if (d > 1e-4) {
      dx /= d;
      dy /= d;
    } else {
      dx = -nx;
      dy = -ny;
    }
    e.x += dx * (e.r - d);
    e.y += dy * (e.r - d);
    return true;
  };
  /** A ray through curve tile (tile entered at distance t0, left at t1): where it meets wall, or -1 if it gets
   *  through on the floor side. */
  C.rayTile = function (ov, ox, oy, dx, dy, t0, t1) {
    const px = (ox - ov.cx) / ov.a, py = (oy - ov.cy) / ov.b, qx = dx / ov.a, qy = dy / ov.b;
    const A = qx * qx + qy * qy, B = 2 * (px * qx + py * qy), Cc = px * px + py * py - 1;
    const disc = B * B - 4 * A * Cc;
    if (disc <= 0 || A < 1e-12) return t0;
    const s = Math.sqrt(disc), e1 = (-B - s) / (2 * A), e2 = (-B + s) / (2 * A);
    if (t0 < e1 - 1e-4 || t0 > e2) return t0;
    return e2 < t1 ? Math.max(t0, e2) : -1;
  };
  /** Extra directions for a visibility polygon: where the curve crosses each curve tile's edges, and the
   *  middle of the arc between, so lit and seen areas follow the curve. */
  C.angles = function (level, tx, ty, ox, oy, r2, push) {
    const ov = level.curveAt[ty * level.w + tx];
    if (!ov) return;
    const pts = [];
    const x0 = tx * T, y0 = ty * T, x1 = x0 + T, y1 = y0 + T;
    // vertical edges: x fixed
    for (const x of [x0, x1]) {
      const u = (x - ov.cx) / ov.a;
      if (u * u >= 1) continue;
      const h = ov.b * Math.sqrt(1 - u * u);
      for (const y of [ov.cy - h, ov.cy + h]) if (y >= y0 && y <= y1) pts.push(x, y);
    }
    for (const y of [y0, y1]) {
      const v = (y - ov.cy) / ov.b;
      if (v * v >= 1) continue;
      const w = ov.a * Math.sqrt(1 - v * v);
      for (const x of [ov.cx - w, ov.cx + w]) if (x >= x0 && x <= x1) pts.push(x, y);
    }
    if (pts.length >= 4) {
      // the middle of the arc: halfway round between the first two crossings
      const a0 = Math.atan2((pts[1] - ov.cy) / ov.b, (pts[0] - ov.cx) / ov.a), a1 = Math.atan2((pts[3] - ov.cy) / ov.b, (pts[2] - ov.cx) / ov.a);
      const am = a0 + U.angDiff(a0, a1) / 2;
      pts.push(ov.cx + Math.cos(am) * ov.a, ov.cy + Math.sin(am) * ov.b);
    }
    for (let i = 0; i < pts.length; i += 2) {
      if (U.dist2(pts[i], pts[i + 1], ox, oy) > r2) continue;
      push(Math.atan2(pts[i + 1] - oy, pts[i] - ox));
    }
  };

  // ------------------------------------------------------------ baking
  /** The palette a wall terrain paints with: its def's own `palette`, else whatever its bake hands
   *  LM.paintWall (found by asking it to bake once with LM.paintWall listening), else the environment's wall. */
  const palettes = new Map();
  let scratch = null;
  C.paletteOf = function (wd, info) {
    const key = wd.id + '|' + ((info.env && info.env.name) || '');
    if (palettes.has(key)) return palettes.get(key);
    let p = wd.palette || null;
    if (!p && wd.bake) {
      const pw = LM.paintWall;
      scratch = scratch || document.createElement('canvas').getContext('2d');
      LM.paintWall = (g, x, y, inf, pal) => {
        p = pal || inf.env.wall;
      };
      try {
        wd.bake(scratch, 0, 0, Object.assign({}, info, { x: 0, y: 0, n: () => TALL }));
      } catch (e) {
        p = null;
      } finally {
        LM.paintWall = pw;
      }
    }
    p = p || info.env.wall || {};
    palettes.set(key, p);
    return p;
  };
  /** The curved face, lip and contact shadow, over a chunk's tiles (after they're baked). */
  C.bakeChunk = function (g, L, tx0, ty0, n, info) {
    if (!L.ovals || !L.ovals.length) return;
    for (const ov of L.ovals) {
      if (ov.x + ov.w < tx0 - 1 || ov.y + ov.h < ty0 - 1 || ov.x - 1 > tx0 + n || ov.y - 1 > ty0 + n) continue;
      const wd = ov.wallDef;
      const p = C.paletteOf(wd, info);
      const painter = p.style ? LM.find('textures', p.style) : null;
      // where there's wall: the curve tiles and the solid ring around them (not doors, not openings)
      const wallClip = () => {
        g.beginPath();
        for (let ty = Math.max(ov.y - 1, ty0 - 1); ty <= Math.min(ov.y + ov.h, ty0 + n); ty++) {
          for (let tx = Math.max(ov.x - 1, tx0 - 1); tx <= Math.min(ov.x + ov.w, tx0 + n); tx++) {
            if (!L.inBounds(tx, ty)) continue;
            const d = L.t(tx, ty);
            if ((d.curve && L.curveAt[ty * L.w + tx] === ov) || (d.tall && !d.door)) g.rect(tx * T, ty * T, T, T);
          }
        }
        g.clip();
      };
      const ell = (dy, grow) => g.ellipse(ov.cx, ov.cy + (dy || 0), ov.a + (grow || 0), ov.b + (grow || 0), 0, 0, U.TAU);
      // 1. the front face: the band of wall just above the northern arc
      g.save();
      wallClip();
      g.beginPath();
      g.rect(ov.cx - ov.a - T, ov.cy - ov.b - T, ov.a * 2 + T * 2, ov.b * 2 + T * 2);
      ell();
      g.clip('evenodd');
      g.beginPath();
      ell(-FH);
      g.clip();
      const sx0 = Math.max(ov.cx - ov.a, tx0 * T - 2), sx1 = Math.min(ov.cx + ov.a, (tx0 + n) * T + 2);
      const ox = info.x, oy = info.y;
      for (let sx = Math.floor(sx0); sx < sx1; sx += 2) {
        const u = (sx + 1 - ov.cx) / ov.a;
        if (u * u >= 1) continue;
        const yt = ov.cy - ov.b * Math.sqrt(1 - u * u);
        const ctx0 = Math.floor(sx / T) * T;
        g.save();
        g.beginPath();
        g.rect(sx, yt - FH - 2, 2.2, FH + 3);
        g.clip();
        info.x = Math.floor(sx / T);
        info.y = Math.floor((yt - 1) / T);
        if (painter && painter.face) painter.face(g, ctx0, yt - FH, FH, info, p);
        else {
          g.fillStyle = p.face || '#3a3530';
          g.fillRect(ctx0, yt - FH, T, FH);
        }
        g.restore();
      }
      info.x = ox;
      info.y = oy;
      g.restore();
      // 2. lips: along the top of the face, and along the curve where there's no face (the south side)
      g.save();
      wallClip();
      g.beginPath();
      g.rect(ov.cx - ov.a - T, ov.cy - ov.b - T, ov.a * 2 + T * 2, ov.b * 2 + T * 2);
      ell();
      g.clip('evenodd');
      g.strokeStyle = p.edge || 'rgba(255,255,255,0.2)';
      g.lineWidth = 1.3;
      g.beginPath();
      g.ellipse(ov.cx, ov.cy - FH, ov.a, ov.b, 0, Math.PI, U.TAU);
      g.stroke();
      g.beginPath();
      g.rect(ov.cx - ov.a - T, ov.cy - ov.b - T, ov.a * 2 + T * 2, ov.b * 2 + T * 2);
      ell(-FH);
      g.clip('evenodd');
      g.lineWidth = 2.4;
      g.beginPath();
      ell();
      g.stroke();
      if (p.trim) {
        g.strokeStyle = U.rgba(p.trim, 0.5);
        g.lineWidth = 0.8;
        g.beginPath();
        ell(0, 3.2);
        g.stroke();
      }
      g.restore();
      // 3. the floor's contact shadow round the inside of the curve
      g.save();
      g.beginPath();
      ell();
      g.clip();
      for (const [w, a] of [[16, 0.1], [9, 0.13], [4, 0.16]]) {
        g.strokeStyle = 'rgba(0,0,0,' + a + ')';
        g.lineWidth = w;
        g.beginPath();
        ell();
        g.stroke();
      }
      g.restore();
    }
  };

  // ------------------------------------------------------------ recessed lights
  C.ringPoints = function (ov, count, inset) {
    const pts = [], a = Math.max(8, ov.a - inset * T), b = Math.max(8, ov.b - inset * T);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * U.TAU - Math.PI / 2;
      pts.push({ x: ov.cx + Math.cos(t) * a, y: ov.cy + Math.sin(t) * b });
    }
    return pts;
  };
  C.addLights = function (game) {
    const L = game.level;
    for (const ov of L.ovals || []) {
      const li = ov.spec.lights;
      ov.fixtures = [];
      if (!li) continue;
      const count = Math.max(0, Math.round(li.count != null ? li.count : Math.round((ov.a + ov.b) / 34)));
      const spec = (x, y) => ({ x, y, color: li.color || '#ffd9a0', radius: li.radius || 150, intensity: li.intensity == null ? 0.42 : li.intensity, flicker: li.flicker || 0, tag: li.tag });
      for (const p of C.ringPoints(ov, count, li.inset == null ? 1.25 : li.inset)) ov.fixtures.push({ x: p.x, y: p.y, light: game.addStaticLight(spec(p.x, p.y)) });
      if (li.centre || li.center) ov.fixtures.push({ x: ov.cx, y: ov.cy, light: game.addStaticLight(Object.assign(spec(ov.cx, ov.cy), { radius: (li.radius || 150) * 1.4 })) });
    }
  };
  /** The emissive pass: each recessed light's lens, and the cove's line of light along the top of the wall. */
  C.drawGlow = function (ctx, game, t, view) {
    const L = game.level;
    for (const ov of L.ovals || []) {
      if (ov.cx + ov.a < view.x0 || ov.cx - ov.a > view.x1 || ov.cy + ov.b < view.y0 || ov.cy - ov.b > view.y1) continue;
      const li = ov.spec.lights;
      if (!li) continue;
      for (const f of ov.fixtures || []) {
        const on = f.light && !f.light.off;
        if (!on) continue;
        const k = f.light.intensity / (li.intensity == null ? 0.42 : li.intensity || 0.42);
        LM.gfx.glow(ctx, f.x, f.y, 9, li.color || '#ffd9a0', 0.55 * k);
        ctx.fillStyle = U.rgba('#fff6e6', 0.45 * k);
        ctx.beginPath();
        ctx.arc(f.x, f.y, 1.6, 0, U.TAU);
        ctx.fill();
      }
      if (li.cove) {
        const anyOn = (ov.fixtures || []).some((f) => f.light && !f.light.off);
        if (!anyOn) continue;
        ctx.save();
        ctx.strokeStyle = U.rgba(li.cove, 0.16);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(ov.cx, ov.cy - FH * 0.6, ov.a - 1, ov.b - 1, 0, 0, U.TAU);
        ctx.stroke();
        ctx.strokeStyle = U.rgba(li.cove, 0.32);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
    }
  };
})();
