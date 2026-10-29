/* Linear Maze Editor — gen/stages-layout.js
 * Stage 4: the floor plan. Rooms grow outward from the way in along the progression graph's tree
 * edges: each room is set beside its parent, sharing a wall with a door in it, or at the end of a short
 * corridor (1 or 3 tiles wide). A room that won't fit anywhere beside its parent is hung off another
 * room of the same lock region, so no lock changes meaning. Loops are added where two rooms of the same
 * region share a wall. Then the plan is cropped and room shapes (SPEC 23) are chosen.
 *
 * The result, per floor: layout { w, h, cells } where cells are rows of ' ' (rock), '#' (wall),
 * '.' (room floor), ',' (corridor), '+' (doorway); each room's rect [x, y, w, h] (its floor, walls
 * round it); each edge's door cells and corridor cells.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});
  const EMPTY = 0, WALL = 1, FLOOR = 2, CORR = 3, DOOR = 4;
  const DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

  function layoutFloor(plan, lib, floor, attempt) {
    const rng = G.srng(plan, 'layout', 'f' + floor.n, attempt);
    const W = 160, H = 130;
    const cell = new Uint8Array(W * H);
    const I = (x, y) => y * W + x;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : cell[I(x, y)]);
    const set = (x, y, v) => (cell[I(x, y)] = v);
    const rooms = floor.rooms, edges = floor.edges;
    for (const r of rooms) {
      r.rect = null;
      r.shape = null;
    }
    for (const e of edges) {
      e.doors = [];
      e.cells = [];
      e.side = null;
    }
    edges.splice(0, edges.length, ...edges.filter((e) => e.tree));
    edges.forEach((e, i) => {
      e.i = i;
      rooms[e.b].edge = i;
    });

    // A room's shape is chosen with its size, before any door is cut: a curved room's doors must sit in the
    // middle of its sides, where the curve meets the rectangle (engine/shapes.js keeps them open there).
    const sizeOf = (r, shrink) => {
      const t = lib.rooms[r.template] || {};
      const sz = t.size || [[4, 4], [8, 6]];
      let w = rng.int(sz[0][0], sz[1][0]), h = rng.int(sz[0][1], sz[1][1]);
      if (shrink) {
        w = sz[0][0];
        h = sz[0][1];
      }
      r.shapeWant = null;
      if (t.shapes && !r.isEntry && !r.isExit && !shrink) {
        const opts = G.sorted(t.shapes).filter(([sh]) => {
          if (sh === 'rect') return true;
          if (sh === 'circle' || sh === 'octagon' || sh === 'hexagon') return Math.max(w, h) >= 7;
          if (sh === 'ellipse') return w >= 8 && h >= 6;
          if (sh === 'rounded') return w >= 5 && h >= 5;
          return false;
        });
        const sh = rng.weighted(opts);
        if (sh && sh !== 'rect') {
          if (sh === 'circle' || sh === 'octagon' || sh === 'hexagon') {
            // odd and square, so the middle of each side is one tile
            w = h = Math.max(w, h) | 1;
          } else {
            w |= 1;
            h |= 1;
          }
          r.shapeWant = sh === 'rounded' ? { type: 'rounded', radius: w >= 9 && h >= 9 ? 2.5 : 1.6 } : sh;
        }
      }
      return [w, h];
    };
    const ringCells = (x, y, w, h) => {
      const out = [];
      for (let i = x - 1; i <= x + w; i++) out.push([i, y - 1], [i, y + h]);
      for (let j = y; j < y + h; j++) out.push([x - 1, j], [x + w, j]);
      return out;
    };
    // the running bounding box: a placement that would push the floor past the map limit is refused
    const [maxW, maxH] = lib.settings.mapMax || [72, 48];
    const box = { x0: W, y0: H, x1: 0, y1: 0 };
    const grow = (x0, y0, x1, y1) => {
      box.x0 = Math.min(box.x0, x0);
      box.y0 = Math.min(box.y0, y0);
      box.x1 = Math.max(box.x1, x1);
      box.y1 = Math.max(box.y1, y1);
    };
    const fits = (x0, y0, x1, y1) => Math.max(box.x1, x1) - Math.min(box.x0, x0) + 1 <= maxW && Math.max(box.y1, y1) - Math.min(box.y0, y0) + 1 <= maxH;
    const markRoom = (r, x, y, w, h) => {
      grow(x - 1, y - 1, x + w, y + h);
      r.rect = [x, y, w, h];
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, FLOOR);
      for (const [i, j] of ringCells(x, y, w, h)) if (at(i, j) === EMPTY) set(i, j, WALL);
    };

    // the way in: bottom middle of the canvas
    const e0 = rooms[0];
    const [w0, h0] = sizeOf(e0);
    markRoom(e0, Math.floor(W / 2 - w0 / 2), H - 10 - h0, w0, h0);

    function tryAttach(v, u, tries) {
      const [ux, uy, uw, uh] = u.rect;
      for (let t = 0; t < tries; t++) {
        // prefer growing where there is room left in the box
        const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
        const ux0 = ux + uw / 2, uy0 = uy + uh / 2;
        const side = rng.weighted({
          N: (box.y1 - box.y0 < maxH - 12 ? 4 : 1.5) * (uy0 > cy ? 1.5 : 1),
          E: 2.4 * (ux0 < cx ? 1.6 : 1),
          W: 2.4 * (ux0 > cx ? 1.6 : 1),
          S: u.isEntry ? 0 : 0.9 * (uy0 < cy ? 1.6 : 1),
        });
        const [dx, dy] = DIRS[side];
        const [w, h] = sizeOf(v, t > tries * 0.6);
        const k = rng.chance(0.42) ? 0 : rng.int(1, 4);
        const cw = k >= 2 && rng.chance(0.5) ? 3 : 1;
        const half = (cw - 1) / 2;
        let door;
        if (side === 'N' || side === 'S') door = [u.shapeWant ? ux + Math.floor(uw / 2) : rng.int(ux + half, ux + uw - 1 - half), side === 'N' ? uy - 1 : uy + uh];
        else door = [side === 'E' ? ux + uw : ux - 1, u.shapeWant ? uy + Math.floor(uh / 2) : rng.int(uy + half, uy + uh - 1 - half)];
        if (u.shapeWant && cw > 1 && Math.min(uw, uh) < 7) continue;
        const px = dy !== 0 ? 1 : 0, py = dx !== 0 ? 1 : 0; // across the corridor
        const corr = [], sides = [];
        for (let s = 1; s <= k; s++) {
          for (let j = -half; j <= half; j++) corr.push([door[0] + dx * s + px * j, door[1] + dy * s + py * j]);
          sides.push([door[0] + dx * s + px * (half + 1), door[1] + dy * s + py * (half + 1)], [door[0] + dx * s - px * (half + 1), door[1] + dy * s - py * (half + 1)]);
        }
        const cd = k === 0 ? door : [door[0] + dx * (k + 1), door[1] + dy * (k + 1)];
        const along = dy !== 0 ? w : h;
        const m = along >= 5 ? 1 : 0;
        const off = v.shapeWant ? Math.floor(along / 2) : rng.int(Math.min(m + half, along - 1), Math.max(0, along - 1 - m - half));
        let x, y;
        if (side === 'N') [x, y] = [cd[0] - off, cd[1] - h];
        else if (side === 'S') [x, y] = [cd[0] - off, cd[1] + 1];
        else if (side === 'E') [x, y] = [cd[0] + 1, cd[1] - off];
        else [x, y] = [cd[0] - w, cd[1] - off];
        if (x < 3 || y < 3 || x + w > W - 4 || y + h > H - 4) continue;
        if (!fits(Math.min(x - 1, door[0]), Math.min(y - 1, door[1]), Math.max(x + w, door[0]), Math.max(y + h, door[1]))) continue;
        let ok = true;
        for (let j = y; j < y + h && ok; j++) for (let i = x; i < x + w; i++) if (at(i, j) !== EMPTY) { ok = false; break; }
        if (!ok) continue;
        for (const [i, j] of ringCells(x, y, w, h)) {
          const c = at(i, j);
          if (c !== EMPTY && c !== WALL) { ok = false; break; }
        }
        if (!ok) continue;
        for (const [i, j] of corr) if (at(i, j) !== EMPTY) { ok = false; break; }
        if (!ok) continue;
        for (const [i, j] of sides) { const c = at(i, j); if (c !== EMPTY && c !== WALL) { ok = false; break; } }
        if (!ok) continue;
        if (at(door[0], door[1]) !== WALL) continue;
        // place it
        markRoom(v, x, y, w, h);
        for (const [i, j] of corr) set(i, j, CORR);
        for (const [i, j] of sides) if (at(i, j) === EMPTY) set(i, j, WALL);
        // corridor end caps beyond a 3-wide corridor's sides are already walls of one room or the other
        set(door[0], door[1], DOOR);
        if (k > 0) set(cd[0], cd[1], DOOR);
        const e = edges[v.edge];
        e.doors = k > 0 ? [door, cd] : [door];
        e.cells = corr;
        e.side = side;
        e.k = k;
        e.width = cw;
        return true;
      }
      return false;
    }

    // breadth first from the way in
    const order = [0];
    for (let q = 0; q < order.length; q++) order.push(...rooms[order[q]].kids);
    const placed = new Set([0]);
    for (const vi of order.slice(1)) {
      const v = rooms[vi], u = rooms[v.parent];
      if (tryAttach(v, u, 60)) {
        placed.add(vi);
        continue;
      }
      // hang it off another placed room of the same region instead
      const alts = rng.shuffle([...placed].map((i) => rooms[i]).filter((p) => p !== u && p.region === u.region && p.opt === u.opt && !p.isExit));
      let done = false;
      for (const p of alts) {
        if (tryAttach(v, p, 30)) {
          u.kids = u.kids.filter((k) => k !== vi);
          p.kids.push(vi);
          v.parent = p.i;
          edges[v.edge].a = p.i;
          const L = edges[v.edge].lock && floor.lockById[edges[v.edge].lock];
          if (L) L.from = p.i;
          done = true;
          break;
        }
      }
      if (!done) return { ok: false, why: 'room ' + v.id + ' (' + v.template + ') would not fit' };
      placed.add(vi);
    }

    // loops: a door through a wall two rooms of the same region share
    const want = Math.floor(rooms.length / 6) + (rng.chance(0.5) ? 1 : 0);
    const owner = (x, y) => {
      for (const r of rooms) {
        const [rx, ry, rw, rh] = r.rect;
        if (x >= rx && y >= ry && x < rx + rw && y < ry + rh) return r;
      }
      return null;
    };
    const linked = new Set(edges.map((e) => Math.min(e.a, e.b) + ':' + Math.max(e.a, e.b)));
    const cands = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (at(x, y) !== WALL) continue;
        for (const [ax, ay, bx, by] of [[x - 1, y, x + 1, y], [x, y - 1, x, y + 1]]) {
          if (at(ax, ay) !== FLOOR || at(bx, by) !== FLOOR) continue;
          const a = owner(ax, ay), b = owner(bx, by);
          if (!a || !b || a === b) continue;
          if (a.region !== b.region || a.opt !== b.opt) continue;
          const ta = lib.rooms[a.template] || {}, tb = lib.rooms[b.template] || {};
          if (ta.noLoop || tb.noLoop || a.isExit || b.isExit || a.shapeWant || b.shapeWant) continue;
          const key = Math.min(a.i, b.i) + ':' + Math.max(a.i, b.i);
          if (linked.has(key)) continue;
          // not at the end of the shared run (keep doors off corners)
          const vert = ax === x - 1;
          const n1 = vert ? [x, y - 1] : [x - 1, y], n2 = vert ? [x, y + 1] : [x + 1, y];
          const side = (p) => at(p[0] + (vert ? -1 : 0), p[1] + (vert ? 0 : -1)) === FLOOR && at(p[0] + (vert ? 1 : 0), p[1] + (vert ? 0 : 1)) === FLOOR && at(p[0], p[1]) === WALL;
          if (!side(n1) || !side(n2)) continue;
          cands.push({ x, y, a: a.i, b: b.i, key });
        }
      }
    }
    for (const c of rng.shuffle(cands)) {
      if (floor.loops >= want) break;
      if (linked.has(c.key)) continue;
      linked.add(c.key);
      set(c.x, c.y, DOOR);
      edges.push({ i: edges.length, a: c.a, b: c.b, tree: false, loop: true, lock: null, doors: [[c.x, c.y]], cells: [], side: null, k: 0 });
      floor.loops = (floor.loops || 0) + 1;
    }

    // crop
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cell[I(x, y)] !== EMPTY) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const [mw, mh] = (lib.settings.mapMax || [72, 48]);
    if (w > mw || h > mh) return { ok: false, why: 'too big (' + w + ' × ' + h + ')' };
    const CH = [' ', '#', '.', ',', '+'];
    const rows = [];
    for (let y = y0; y <= y1; y++) {
      let s = '';
      for (let x = x0; x <= x1; x++) s += CH[cell[I(x, y)]];
      rows.push(s);
    }
    for (const r of rooms) r.rect = [r.rect[0] - x0, r.rect[1] - y0, r.rect[2], r.rect[3]];
    for (const e of edges) {
      e.doors = e.doors.map(([x, y]) => [x - x0, y - y0]);
      e.cells = e.cells.map(([x, y]) => [x - x0, y - y0]);
    }
    floor.layout = { w, h, cells: rows };
    for (const r of rooms) r.shape = r.shapeWant || null;
    return { ok: true };
  }

  G.stageLayout = function (plan, lib) {
    for (const floor of plan.floors) {
      const tried = [];
      let res = null;
      for (let a = 0; a < 16; a++) {
        floor.loops = 0;
        res = layoutFloor(plan, lib, floor, a);
        if (res.ok) break;
        tried.push(res.why);
      }
      if (!res.ok) throw new Error('Floor ' + floor.n + ' would not lay out: ' + tried.slice(-3).join('; '));
    }
  };

  // ------------------------------------------------------------ helpers the later stages use
  /** Is tile (x, y) usable inside a room, given its shape? inset: tiles kept clear of the curve. */
  G.inRoom = function (r, x, y, inset) {
    const [rx, ry, rw, rh] = r.rect;
    if (x < rx || y < ry || x >= rx + rw || y >= ry + rh) return false;
    if (!r.shape) return true;
    const t = typeof r.shape === 'string' ? r.shape : r.shape.type;
    const cx = rx + rw / 2, cy = ry + rh / 2;
    const px = x + 0.5 - cx, py = y + 0.5 - cy;
    const d = inset == null ? 0.7 : inset;
    if (t === 'rounded') {
      const rad = (r.shape.radius || 1.6) + d;
      const qx = Math.abs(px) - (rw / 2 - rad), qy = Math.abs(py) - (rh / 2 - rad);
      if (qx > 0 && qy > 0) return qx * qx + qy * qy <= (rad - d) * (rad - d);
      return Math.abs(px) <= rw / 2 - d && Math.abs(py) <= rh / 2 - d;
    }
    const ax = rw / 2 - d, ay = rh / 2 - d;
    if (ax <= 0 || ay <= 0) return false;
    if (t === 'diamond') return Math.abs(px) / ax + Math.abs(py) / ay <= 1;
    if (t === 'octagon' || t === 'hexagon') return (px * px) / (ax * ax) + (py * py) / (ay * ay) <= 1.08;
    return (px * px) / (ax * ax) + (py * py) / (ay * ay) <= 1;
  };
  /** Interior tiles of a room that are usable (inside its shape), in row order. */
  G.roomCells = function (r, inset) {
    const out = [];
    const [rx, ry, rw, rh] = r.rect;
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) if (G.inRoom(r, x, y, inset)) out.push([x, y]);
    return out;
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
