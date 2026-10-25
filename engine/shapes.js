/* The Linear Maze engine — engine/shapes.js
 * Rooms and solids that aren't made of squares: round rooms, ovals, octagons, rounded rectangles,
 * any polygon, and round pillars of any size. The map stays a grid; a shape trims it.
 *
 *   rooms: [ { name: 'Rotunda', rect: [10, 4, 9, 9], shape: 'circle' } ],     // the room's floor, trimmed round
 *   shapes: [
 *     { type: 'circle', x: 14.5, y: 8.5, r: 1.6, solid: true },              // a round pillar in the middle
 *     { type: 'polygon', points: [[3, 3], [9, 3], [12, 8], [3, 8]] },         // a room with a slanted wall
 *   ]
 *
 * A shape that is open (a room) keeps the floor inside its outline and turns the squares of its rect (or
 * its own bounding box) that fall outside into wall. A solid shape (solid: true) does the opposite: what's
 * inside becomes wall. Squares the outline crosses become curved edge squares: floor for the game, with the
 * outline's segments inside them for collision, shots, sight and light, and the solid part painted as wall
 * (standing up on a tilted next-gen floor).
 *
 * Doorways and corridors: any open square on the edge of an open shape's rect (a door, or floor that runs
 * on out of the rect) is kept, and so is the straight run of squares from it in toward the middle until it
 * meets the room's floor, so a corridor drawn up to the rect reaches the curved room through its corner.
 *
 * Shape fields (positions and sizes in tiles; a tile's centre is x + 0.5):
 *   type     'circle' { x, y, r } · 'ellipse' { x, y, rx, ry } · 'ngon' { x, y, r (or rx, ry), sides, angle }
 *            'polygon' { points: [[x, y], ...] } · 'rounded' { rect: [x, y, w, h], radius }
 *            A room's `shape` is any of these names (fitted to its rect), plus 'octagon', 'hexagon', 'diamond',
 *            or an object { type, ... } whose missing sizes come from the rect.
 *   solid    true: the inside is wall (pillars, columns, round tanks)
 *   wall     the terrain the outside (or inside, for solid) becomes: a terrain id or a legend character (default '#')
 *   floor    the terrain an edge square becomes when the map has a wall there (default: the floor under the shape)
 *   rect     an open shape's area to trim [x, y, w, h]; default: its bounding box
 *   segments how many straight pieces a curve is drawn with (default: about three per tile of outline)
 */
'use strict';
(function () {
  // the editor loads this file too (for outlines) without the rest of the engine, so it doesn't make window.LM
  const LM = window.LM || {};
  const S = (window.LM_SHAPES = {});
  if (window.LM) LM.shapes = S;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------ outlines (tile units)
  function ellipsePts(cx, cy, rx, ry, n, a0) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (a0 || 0) + (i / n) * TAU;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return pts;
  }
  const curveN = (rx, ry, seg) => seg || Math.max(16, Math.min(160, Math.ceil(Math.PI * (rx + ry) * 3)));
  /** The fields of a room's shape, filled in from its rect. */
  S.fromRoom = function (room) {
    const sh = room.shape;
    const [x, y, w, h] = room.rect || [0, 0, 1, 1];
    const base = typeof sh === 'string' ? { type: sh } : Object.assign({}, sh);
    const named = { octagon: 8, hexagon: 6, diamond: 4 };
    if (named[base.type]) {
      base.sides = base.sides || named[base.type];
      if (base.type === 'octagon' && base.angle == null) base.angle = Math.PI / 8;
      if (base.type === 'hexagon' && base.angle == null) base.angle = 0;
      base.type = 'ngon';
    }
    const cx = x + w / 2, cy = y + h / 2;
    if (base.x == null) base.x = cx;
    if (base.y == null) base.y = cy;
    if (base.type === 'circle' && base.r == null) base.r = Math.min(w, h) / 2;
    if (base.type === 'ellipse' || base.type === 'ngon') {
      if (base.rx == null) base.rx = base.r != null ? base.r : w / 2;
      if (base.ry == null) base.ry = base.r != null ? base.r : h / 2;
    }
    if (base.type === 'rounded' && !base.rect) base.rect = [x, y, w, h];
    if (!base.rect) base.rect = [x, y, w, h];
    base.room = room.name;
    return base;
  };
  /** A shape's outline as points [[x, y], ...] in tiles, or null if it can't be read. */
  S.outline = function (sh) {
    if (!sh) return null;
    const t = sh.type || (sh.points ? 'polygon' : sh.rx != null ? 'ellipse' : 'circle');
    if (t === 'circle') return ellipsePts(+sh.x, +sh.y, +sh.r, +sh.r, curveN(sh.r, sh.r, sh.segments));
    if (t === 'ellipse') return ellipsePts(+sh.x, +sh.y, +sh.rx, +sh.ry, curveN(sh.rx, sh.ry, sh.segments));
    if (t === 'ngon') {
      const n = Math.max(3, Math.round(sh.sides || 8));
      const rx = sh.rx != null ? +sh.rx : +sh.r, ry = sh.ry != null ? +sh.ry : +sh.r;
      // a regular polygon fitted so its flat sides (not its corners) touch the rect when angle puts a side flat
      const k = sh.fit === 'corners' ? 1 : 1 / Math.cos(Math.PI / n);
      const a0 = sh.angle != null ? +sh.angle : -Math.PI / 2;
      const pts = ellipsePts(+sh.x, +sh.y, rx * k, ry * k, n, a0);
      // keep it inside its rect: scale back if a corner pokes out
      let mx = 0, my = 0;
      for (const [px, py] of pts) {
        mx = Math.max(mx, Math.abs(px - sh.x) / rx);
        my = Math.max(my, Math.abs(py - sh.y) / ry);
      }
      return pts.map(([px, py]) => [sh.x + (px - sh.x) / Math.max(1, mx), sh.y + (py - sh.y) / Math.max(1, my)]);
    }
    if (t === 'rounded') {
      const [x, y, w, h] = sh.rect;
      const r = Math.max(0, Math.min(sh.radius != null ? +sh.radius : Math.min(w, h) / 4, w / 2, h / 2));
      const n = Math.max(3, Math.ceil(r * 3));
      const pts = [];
      const corner = (cx, cy, a0) => {
        for (let i = 0; i <= n; i++) {
          const a = a0 + (i / n) * (Math.PI / 2);
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
      };
      corner(x + w - r, y + r, -Math.PI / 2);
      corner(x + w - r, y + h - r, 0);
      corner(x + r, y + h - r, Math.PI / 2);
      corner(x + r, y + r, Math.PI);
      return pts;
    }
    if (t === 'polygon' && Array.isArray(sh.points) && sh.points.length >= 3) return sh.points.map((p) => [+p[0], +p[1]]);
    return null;
  };

  // ------------------------------------------------------------ geometry
  function inPoly(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  S.inPoly = inPoly;
  /** The part of the segment (ax, ay)-(bx, by) inside the box, as [t0, t1] along it, or null. (Liang-Barsky) */
  function clipSeg(ax, ay, bx, by, x0, y0, x1, y1) {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dy = by - ay;
    const p = [-dx, dx, -dy, dy], q = [ax - x0, x1 - ax, ay - y0, y1 - ay];
    for (let k = 0; k < 4; k++) {
      if (p[k] === 0) {
        if (q[k] < 0) return false;
      } else {
        const r = q[k] / p[k];
        if (p[k] < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
        if (t0 > t1) return null;
      }
    }
    return t1 - t0 > 1e-6 ? [t0, t1] : null;
  }
  /** A straight piece of wall from (ax, ay) to (bx, by) whose open side is the way (nx, ny) points. */
  const piece = (ax, ay, bx, by, nx, ny) => ({ ax, ay, bx, by, nx, ny, len: Math.hypot(bx - ax, by - ay) || 1e-6 });

  /** A shape made ready for the game: world-space points, segments and normals. */
  function build(sh, T) {
    const out = S.outline(sh);
    if (!out || out.length < 3) return null;
    const pts = new Float64Array(out.length * 2);
    out.forEach(([x, y], i) => {
      pts[i * 2] = x * T;
      pts[i * 2 + 1] = y * T;
    });
    // which way round the outline runs, so every segment's normal can point at the open side
    let area = 0;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) area += pts[j] * pts[i + 1] - pts[i] * pts[j + 1];
    const flip = (area > 0) === !!sh.solid; // the raw normal below points inward when the area sum is positive
    const n = out.length, segs = [];
    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[((i + 1) % n) * 2], by = pts[((i + 1) % n) * 2 + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      let nx = (ay - by) / len, ny = (bx - ax) / len;
      if (flip) {
        nx = -nx;
        ny = -ny;
      }
      segs.push({ ax, ay, bx, by, nx, ny, len, cut: false });
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i]);
      x1 = Math.max(x1, pts[i]);
      y0 = Math.min(y0, pts[i + 1]);
      y1 = Math.max(y1, pts[i + 1]);
    }
    return { spec: sh, solid: !!sh.solid, pts, segs, box: [x0, y0, x1, y1], mark: 0 };
  }

  // ------------------------------------------------------------ carving a level
  /**
   * Called by the Level constructor once the map is read: trims the grid to the level's shapes and fills
   * level.curve (per tile: the shapes crossing it, or undefined), level.navBlock and level.shapes.
   */
  S.carve = function (L) {
    const def = L.def;
    const specs = [];
    for (const r of def.rooms || []) if (r.shape && r.rect) specs.push(S.fromRoom(r));
    for (const sh of def.shapes || []) specs.push(sh);
    L.shapes = [];
    if (!specs.length) return;
    const T = LM.TILE;
    const legend = Object.assign({}, LM.registry.legend, def.legend || {});
    const terrainOf = (v, fallback) => {
      if (!v) return fallback;
      const e = legend[v];
      const id = e ? (typeof e === 'string' ? e : e.terrain) : v;
      return LM.find('terrain', id) || fallback;
    };
    const WALL = terrainOf('#', LM.find('terrain', 'wall'));
    const FLOOR = terrainOf('.', LM.find('terrain', 'floor'));
    L.curve = L.curve || new Array(L.n);
    L.navBlock = L.navBlock || new Uint8Array(L.n);
    for (const spec of specs) {
      const shp = build(spec, T);
      if (!shp) {
        console.warn('[LM] A shape in ' + def.id + ' has no outline', spec);
        continue;
      }
      L.shapes.push(shp);
      const wall = terrainOf(spec.wall, WALL), floor = terrainOf(spec.floor, null);
      const pts = shp.pts;
      // the squares to look at: an open shape's rect (or box), a solid's box
      let rx0, ry0, rx1, ry1;
      if (!shp.solid && spec.rect) {
        rx0 = spec.rect[0];
        ry0 = spec.rect[1];
        rx1 = spec.rect[0] + spec.rect[2] - 1;
        ry1 = spec.rect[1] + spec.rect[3] - 1;
      } else {
        rx0 = Math.floor(shp.box[0] / T);
        ry0 = Math.floor(shp.box[1] / T);
        rx1 = Math.ceil(shp.box[2] / T) - 1;
        ry1 = Math.ceil(shp.box[3] / T) - 1;
      }
      rx0 = Math.max(0, rx0);
      ry0 = Math.max(0, ry0);
      rx1 = Math.min(L.w - 1, rx1);
      ry1 = Math.min(L.h - 1, ry1);
      // where each square stands against the outline: 'in', 'out' or 'edge'
      const W = rx1 - rx0 + 1, H = ry1 - ry0 + 1;
      const kind = new Array(W * H);
      const crossing = new Array(W * H);
      for (let ty = ry0; ty <= ry1; ty++) {
        for (let tx = rx0; tx <= rx1; tx++) {
          const bx0 = tx * T, by0 = ty * T, bx1 = bx0 + T, by1 = by0 + T;
          let corners = 0;
          for (const [cx, cy] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) if (inPoly(pts, cx, cy)) corners++;
          // each outline segment that crosses the square, cut to the square
          const hits = [];
          for (const sg of shp.segs) {
            const c = clipSeg(sg.ax, sg.ay, sg.bx, sg.by, bx0, by0, bx1, by1);
            if (!c) continue;
            const ex = sg.bx - sg.ax, ey = sg.by - sg.ay;
            hits.push(piece(sg.ax + ex * c[0], sg.ay + ey * c[0], sg.ax + ex * c[1], sg.ay + ey * c[1], sg.nx, sg.ny));
          }
          const j = (ty - ry0) * W + (tx - rx0);
          crossing[j] = hits;
          kind[j] = hits.length ? 'edge' : corners === 4 ? 'in' : 'out';
        }
      }
      const k = (tx, ty) => kind[(ty - ry0) * W + (tx - rx0)];
      // doorways and corridors into an open shape: an open square on the rect's rim, and the run in from it
      const keep = new Uint8Array(W * H);
      if (!shp.solid) {
        const open = (tx, ty) => {
          const d = L.t(tx, ty);
          return !d.solid || !!d.door;
        };
        const walkIn = (tx, ty, dx, dy) => {
          if (!open(tx, ty)) return;
          // only a door, or floor that carries on out of the rect (a corridor), not floor the room just fills
          const beyond = L.t(tx - dx, ty - dy);
          if (!L.t(tx, ty).door && (beyond.solid || !L.inBounds(tx - dx, ty - dy))) return;
          for (let x = tx, y = ty; x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1; x += dx, y += dy) {
            if (k(x, y) === 'in') break;
            keep[(y - ry0) * W + (x - rx0)] = 1;
            const cxw = x * T + T / 2, cyw = y * T + T / 2;
            if (k(x, y) === 'edge' && inPoly(pts, cxw, cyw)) break;
          }
        };
        for (let tx = rx0 + 1; tx < rx1; tx++) {
          walkIn(tx, ry0, 0, 1);
          walkIn(tx, ry1, 0, -1);
        }
        for (let ty = ry0 + 1; ty < ry1; ty++) {
          walkIn(rx0, ty, 1, 0);
          walkIn(rx1, ty, -1, 0);
        }
      }

      const solidPt = (x, y) => (inPoly(pts, x, y) ? shp.solid : !shp.solid);
      for (let ty = ry0; ty <= ry1; ty++) {
        for (let tx = rx0; tx <= rx1; tx++) {
          const j = (ty - ry0) * W + (tx - rx0);
          if (keep[j]) continue;
          const i = ty * L.w + tx, here = L.terrain[i];
          if (here.door) continue; // doors are never trimmed
          let kd = kind[j];
          const wallSide = shp.solid ? 'in' : 'out';
          if (kd === 'edge') {
            // how much of the square is open: a sliver of floor becomes wall, a sliver of wall becomes floor
            let openN = 0;
            for (let sy = 0; sy < 6; sy++) for (let sx = 0; sx < 6; sx++) if (!solidPt(tx * T + (sx + 0.5) * (T / 6), ty * T + (sy + 0.5) * (T / 6))) openN++;
            const f = openN / 36;
            if (f < 0.09) kd = wallSide;
            else if (f > 0.96) kd = shp.solid ? 'out' : 'in';
          }
          if (kd === wallSide) {
            if (!here.solid) L.terrain[i] = wall;
            continue;
          }
          if (kd !== 'edge') continue;
          if (here.solid) L.terrain[i] = floor || FLOOR;
          const pieces = crossing[j].slice();
          if (!pieces.length) continue;
          // where the square's wall part meets an open square that isn't curved (a kept doorway or corridor,
          // a door), close it off along the shared side too
          const bx0 = tx * T, by0 = ty * T;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = tx + dx, ny = ty + dy;
            const inR = nx >= rx0 && nx <= rx1 && ny >= ry0 && ny <= ry1;
            const nd = L.t(nx, ny);
            const keptN = inR && keep[(ny - ry0) * W + (nx - rx0)];
            if (!keptN && !(nd.door && inR)) continue;
            // walk the shared side in eight steps and keep the runs that are wall on this side
            const side = (u) => (dx ? [dx > 0 ? bx0 + T : bx0, by0 + u * T] : [bx0 + u * T, dy > 0 ? by0 + T : by0]);
            let run = -1;
            for (let st = 0; st <= 8; st++) {
              const u = (st + 0.5) / 8;
              const [px, py] = side(u);
              const solid = st < 8 && solidPt(px - dx * 0.5, py - dy * 0.5);
              if (solid && run < 0) run = st;
              if (!solid && run >= 0) {
                const [ax, ay] = side(run / 8), [bx, by] = side(st / 8);
                pieces.push(piece(ax, ay, bx, by, dx, dy));
                run = -1;
              }
            }
          }
          // the topmost point of the square's solid part: what it sorts by when it stands up
          let top = Infinity;
          for (let sy = 0; sy < 8 && top === Infinity; sy++) for (let sx = 0; sx < 8; sx++) if (solidPt(bx0 + (sx + 0.5) * (T / 8), by0 + (sy + 0.5) * (T / 8))) top = by0 + sy * (T / 8);
          const list = L.curve[i] || (L.curve[i] = []);
          list.push({ shape: shp, pieces, top: Number.isFinite(top) ? top : by0, wall });
          if (solidPt(tx * T + T / 2, ty * T + T / 2)) L.navBlock[i] = 1;
        }
      }
    }
  };

  // ------------------------------------------------------------ queries the physics uses
  /** Is this world point inside a curved edge's wall? (Only squares the outlines cross are asked.) */
  S.solidAt = function (L, x, y) {
    const T = LM.TILE;
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (!L.curve || tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) return false;
    const refs = L.curve[ty * L.w + tx];
    if (!refs) return false;
    for (const ref of refs) if (inPoly(ref.shape.pts, x, y) === ref.shape.solid) return true;
    return false;
  };
  /** Push a circle entity { x, y, r } out of the curved walls near it. Returns true if it touched one. */
  S.resolve = function (L, e, tx0, ty0, tx1, ty1) {
    let hit = false;
    const r = e.r;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) continue;
        const refs = L.curve[ty * L.w + tx];
        if (!refs) continue;
        for (const ref of refs) {
          for (const sg of ref.pieces) {
            const dx = sg.bx - sg.ax, dy = sg.by - sg.ay;
            let u = ((e.x - sg.ax) * dx + (e.y - sg.ay) * dy) / (sg.len * sg.len);
            u = Math.max(0, Math.min(1, u));
            const qx = sg.ax + dx * u, qy = sg.ay + dy * u;
            const ox = e.x - qx, oy = e.y - qy, d2 = ox * ox + oy * oy;
            const side = ox * sg.nx + oy * sg.ny;
            if (side < 0 && u > 0 && u < 1 && d2 < r * r * 4) {
              // the centre has got behind the wall: put it back on the open side
              e.x = qx + sg.nx * (r + 0.05);
              e.y = qy + sg.ny * (r + 0.05);
              hit = true;
            } else if (d2 < r * r) {
              const d = Math.sqrt(d2);
              if (d > 1e-4) {
                e.x += (ox / d) * (r - d);
                e.y += (oy / d) * (r - d);
              } else {
                e.x = qx + sg.nx * r;
                e.y = qy + sg.ny * r;
              }
              hit = true;
            }
          }
        }
      }
    }
    return hit;
  };
  /** The nearest curved wall a ray (unit direction) meets in this square between t0 and t1, or -1. */
  S.rayTile = function (L, i, ox, oy, dx, dy, t0, t1) {
    const refs = L.curve[i];
    if (!refs) return -1;
    let best = -1;
    for (const ref of refs) {
      for (const sg of ref.pieces) {
        const ex = sg.bx - sg.ax, ey = sg.by - sg.ay;
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const ax = sg.ax - ox, ay = sg.ay - oy;
        const t = (ax * ey - ay * ex) / den;
        const u = (ax * dy - ay * dx) / den;
        if (u < -1e-6 || u > 1 + 1e-6 || t < t0 - 0.01 || t > t1 + 0.01 || t < 0.25) continue;
        if (best < 0 || t < best) best = t;
      }
    }
    return best;
  };
  /** Seen from the square (fx, fy), is the side of its neighbour (x, y) that faces it wall? A painter asks this so a
   *  wall beside a curved edge treats the edge's wall part as wall. Returns the wall terrain, or null. */
  S.wallToward = function (L, x, y, fx, fy) {
    if (!L.curve || x < 0 || y < 0 || x >= L.w || y >= L.h) return null;
    const refs = L.curve[y * L.w + x];
    if (!refs) return null;
    const T = LM.TILE;
    const px = x * T + T / 2 + (fx - x) * (T / 2 - 1.5), py = y * T + T / 2 + (fy - y) * (T / 2 - 1.5);
    for (const ref of refs) if (inPoly(ref.shape.pts, px, py) === ref.shape.solid) return ref.wall;
    return null;
  };
  /** Clip a canvas to the wall part of one curved square (ref), moved by (ox, oy). */
  S.clipWall = function (g, ref, tx, ty, ox, oy) {
    const T = LM.TILE, p = ref.shape.pts;
    ox = ox || 0;
    oy = oy || 0;
    g.beginPath();
    g.rect(tx * T + ox, ty * T + oy, T, T);
    g.clip();
    g.beginPath();
    if (!ref.shape.solid) g.rect(tx * T - T + ox, ty * T - T + oy, T * 3, T * 3);
    g.moveTo(p[0] + ox, p[1] + oy);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] + ox, p[i + 1] + oy);
    g.closePath();
    g.clip(ref.shape.solid ? 'nonzero' : 'evenodd');
  };
  /** Clip a canvas to the open (floor) part of one curved square. */
  S.clipOpen = function (g, ref, tx, ty) {
    const T = LM.TILE, p = ref.shape.pts;
    g.beginPath();
    g.rect(tx * T, ty * T, T, T);
    g.clip();
    g.beginPath();
    if (ref.shape.solid) g.rect(tx * T - T, ty * T - T, T * 3, T * 3);
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
    g.clip(ref.shape.solid ? 'evenodd' : 'nonzero');
  };
  /** Room lookups follow the shape, not just the rect. */
  S.roomContains = function (room, px, py) {
    return !room.poly || inPoly(room.poly, px, py);
  };
})();
