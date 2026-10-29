/* The Linear Maze engine — engine/nextgen.js
 * The next-generation look, switched on floor by floor (a level's nextGen settings, which the editor
 * sets in Floor settings → Next generation). A floor without them, or with them switched off, draws
 * exactly as it always has: nothing here runs.
 *
 *   oblique   a slightly tilted camera: walls and closed doors stand up and show their fronts (and,
 *             with parallax, their sides). The tilt leans a little as the player moves.
 *   ceiling   black silhouettes overhead: pipes, ducts, cables, beams, hanging lamps and turning fans
 *             (engine/nextgen-ceiling.js)
 *   neon      coloured neon tubes along the walls that light the room (engine/nextgen-neon.js)
 *   sheets    sprite-sheet looks the editor makes from 3D models (engine/nextgen-sheets.js)
 *
 * Only drawing changes. The ground plane, collision, aiming, line of sight and the lightmap stay where
 * they were; a raised wall is the same tile it always was, drawn standing up.
 *
 *   level.nextGen = {
 *     enabled: true,
 *     oblique: { on, tilt 0..1, height (world units), parallax 0..1, sway 0..1 },
 *     ceiling: { on, clutter 0..1, pipes, ducts, cables, beams, fans, hanging, fanTag, fanSpeed,
 *                opacity, color, height (× wall height), parallax, rim, seed },
 *     neon:    { on, colors: [...], where: 'all' | 'rooms' | 'corridors' | 'tag' | 'none', rooms: [names],
 *                tag, density 0..1, flicker 0..1, brightness, radius, style: 'tube' | 'dashed' | 'double',
 *                colorMode: 'room' | 'random' | 'cycle', mount 0..1, lightTag },
 *   }
 * engine/SPEC.md section 22 documents every field.
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE, U = LM.util;
  const CH = 8, CHW = CH * T; // the renderer's chunk size (engine/render.js)
  const FH = 9; // the front face LM.paintWall bakes into a wall tile with open floor south of it

  const NG = (LM.ng = {});
  NG.DEFAULTS = {
    oblique: { on: false, tilt: 0.55, height: 24, parallax: 0.25, sway: 0.35 },
    ceiling: { on: false, clutter: 0.45, pipes: true, ducts: true, cables: true, beams: true, fans: true, hanging: false, fanTag: '', fanSpeed: 1, opacity: 0.94, color: '#030407', height: 1.7, parallax: 0.18, rim: true, seed: 0 },
    neon: { on: false, colors: ['#ff2fd0', '#22e6ff', '#9dff3a'], where: 'all', rooms: [], tag: '', density: 0.35, flicker: 0.15, brightness: 0.9, radius: 120, style: 'tube', colorMode: 'room', mount: 0.7, lightTag: 'neon' },
  };

  /** A level definition's next-gen settings with every field filled in, or null when they're off. */
  NG.settings = function (def) {
    const raw = def && def.nextGen;
    if (!raw || !raw.enabled) return null;
    const out = { enabled: true };
    for (const [k, base] of Object.entries(NG.DEFAULTS)) {
      const r = raw[k] && typeof raw[k] === 'object' ? raw[k] : {};
      out[k] = Object.assign({}, base, r, { on: !!r.on });
    }
    const O = out.oblique;
    O.tilt = U.clamp(+O.tilt || 0, 0, 1);
    O.height = U.clamp(+O.height || 0, 4, 30); // past a tile's depth the raised top no longer covers its own square
    O.parallax = U.clamp(+O.parallax || 0, 0, 1);
    O.sway = U.clamp(+O.sway || 0, 0, 1);
    return out;
  };

  /** Called by Game.loadLevel once the floor's own lights are in: works out the floor's fixtures. */
  NG.attach = function (game, L) {
    const cfg = NG.settings(L.def);
    L.ng = null;
    if (!cfg) return;
    const N = (L.ng = { cfg, edges: NG.wallEdges(L) });
    if (cfg.ceiling.on && NG.ceiling) N.ceiling = NG.ceiling.build(L, cfg.ceiling, N);
    if (cfg.neon.on && NG.neon) N.neon = NG.neon.build(game, L, cfg.neon, N);
  };

  // ------------------------------------------------------------ the floor's shape
  const raisedCache = new WeakMap();
  /** A tile that stands up in the tilted view: a full-square solid such as a wall (not glass, partitions or pillars). */
  NG.raised = function (d) {
    if (!d) return false;
    let r = raisedCache.get(d);
    if (r === undefined) {
      r = !!(d.tall && d.solid && !d.rect && !d.rects && d.shape !== 'circle' && !d.door);
      raisedCache.set(d, r);
    }
    return r;
  };
  /** Runs of wall edge facing open floor: [{ dir: 's'|'n'|'e'|'w', x0, y0, x1, y1 (tile edge coords), len, open: [tiles] }].
   *  An 's' run is the south edge of a row of walls with floor below it, and so on. */
  NG.wallEdges = function (L) {
    const runs = [];
    const isWall = (x, y) => NG.raised(L.t(x, y));
    const isOpen = (x, y) => L.inBounds(x, y) && !L.t(x, y).solid && L.t(x, y).id !== 'void';
    const scan = (dir, outer, inner, at) => {
      for (let a = 0; a < outer; a++) {
        let run = null;
        for (let b = 0; b <= inner; b++) {
          const p = b < inner ? at(a, b) : null;
          const ok = p && isWall(p.wx, p.wy) && isOpen(p.ox, p.oy);
          if (ok && !run) run = { dir, b0: b, open: [] };
          if (ok) run.open.push({ x: p.ox, y: p.oy });
          if (!ok && run) {
            run.len = b - run.b0;
            run.a = a;
            runs.push(run);
            run = null;
          }
        }
      }
    };
    scan('s', L.h, L.w, (y, x) => ({ wx: x, wy: y, ox: x, oy: y + 1 }));
    scan('n', L.h, L.w, (y, x) => ({ wx: x, wy: y, ox: x, oy: y - 1 }));
    scan('e', L.w, L.h, (x, y) => ({ wx: x, wy: y, ox: x + 1, oy: y }));
    scan('w', L.w, L.h, (x, y) => ({ wx: x, wy: y, ox: x - 1, oy: y }));
    // edge coordinates of the run's line, in tiles
    for (const r of runs) {
      if (r.dir === 's' || r.dir === 'n') {
        const ey = r.dir === 's' ? r.a + 1 : r.a;
        Object.assign(r, { x0: r.b0, y0: ey, x1: r.b0 + r.len, y1: ey });
      } else {
        const ex = r.dir === 'e' ? r.a + 1 : r.a;
        Object.assign(r, { x0: ex, y0: r.b0, x1: ex, y1: r.b0 + r.len });
      }
    }
    return runs;
  };
  /** Which room (by name) a tile is in, if any. */
  NG.roomAt = function (L, x, y) {
    for (const r of L.def.rooms || []) {
      const [rx, ry, rw, rh] = r.rect || [];
      if (x >= rx && y >= ry && x < rx + rw && y < ry + rh) return r.name;
    }
    return null;
  };
  /** A seeded random stream for a floor's fixtures. */
  NG.rng = (L, salt, seed) => U.mulberry32((L.seed ^ U.strHash(salt) ^ ((seed | 0) * 2654435761)) >>> 0);

  // ------------------------------------------------------------ the camera's lean, once per frame
  /** Works out this frame's tilt for the renderer: r.ngf = { tilt, height, lx, ly, par, cam, half } or null. */
  NG.frame = function (r, game, dt) {
    const L = game.level, N = L && L.ng;
    if (!N || r.ngOff) return (r.ngf = null);
    const O = N.cfg.oblique;
    const st = r.ngState || (r.ngState = { sx: 0, sy: 0 });
    // the camera trails the player a little: walking east leans the walls west, and back as you stop
    const P = game.player, sp = (LM.PLAYER_BASE && LM.PLAYER_BASE.speed) || 172;
    const vx = P && !game.attract ? U.clamp(P.vx / sp, -1.5, 1.5) : Math.sin((game.time || 0) * 0.25) * 0.4;
    const vy = P && !game.attract ? U.clamp(P.vy / sp, -1.5, 1.5) : 0;
    st.sx = U.damp(st.sx, -vx * O.sway * 0.7, 2.2, dt || 0);
    st.sy = U.damp(st.sy, vy * O.sway * 0.25, 2.2, dt || 0);
    const vh = r.viewHalf();
    r.ngf = {
      tilt: O.on ? O.tilt : 0,
      height: O.height,
      lx: st.sx,
      ly: -1 + st.sy,
      par: O.on ? O.parallax : 0,
      camX: game.cam.x,
      camY: game.cam.y,
      halfW: Math.max(1, vh.w),
      halfH: Math.max(1, vh.h),
    };
    return r.ngf;
  };
  /** How far a point z units above (x, y) moves on screen: [dx, dy]. extraPar adds parallax of its own (the ceiling's). */
  NG.lift = function (f, x, y, z, extraPar) {
    const k = f.tilt * f.par + (extraPar || 0);
    return [z * (f.tilt * f.lx + (k * (x - f.camX)) / f.halfW), z * (f.tilt * f.ly + (k * (y - f.camY)) / f.halfH)];
  };

  // ------------------------------------------------------------ raised walls
  // Each wall tile in view becomes a piece sorted with the objects by its south edge, so whatever stands
  // south of a wall is drawn over its front and whatever stands north of it is hidden behind its top.
  const O = (NG.oblique = {});
  const STUB = {};
  function stubs() {
    if (!STUB.wall) {
      STUB.wall = LM.find('terrain', 'wall') || { id: 'wall', tall: true, solid: true };
      STUB.floor = LM.find('terrain', 'floor') || { id: 'floor' };
    }
    return STUB;
  }
  /** The wall tops of one chunk, baked with no front face (the face is drawn standing up instead). */
  function topChunk(r, cx, cy) {
    const cache = r.ngTops || (r.ngTops = new Map());
    const key = cx + ',' + cy;
    let c = cache.get(key);
    if (c) return c;
    const L = r.level, env = L.env, s = r.scale;
    c = document.createElement('canvas');
    c.width = Math.ceil(CHW * s) + 1;
    c.height = Math.ceil(CHW * s) + 1;
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, -cx * CHW * s, -cy * CHW * s);
    const S = stubs();
    const info = { level: L, env, T, x: 0, y: 0, rnd: null, rot: 0, across: undefined, turnFloor: false, variant: 0,
      n: (dx, dy) => (dx === 0 && dy === 1 && !NG.raised(L.t(info.x, info.y + 1)) ? S.wall : L.t(info.x + dx, info.y + dy)),
    };
    for (let ty = cy * CH; ty < cy * CH + CH; ty++) {
      for (let tx = cx * CH; tx < cx * CH + CH; tx++) {
        if (!L.inBounds(tx, ty)) continue;
        const d = L.t(tx, ty);
        if (!NG.raised(d) || !d.bake) continue;
        info.x = tx;
        info.y = ty;
        info.variant = L.variant[ty * L.w + tx];
        info.rnd = U.mulberry32((L.seed ^ (tx * 7919 + ty * 104729)) >>> 0);
        g.save();
        g.beginPath();
        g.rect(tx * T, ty * T, T, T);
        g.clip();
        d.bake(g, tx * T, ty * T, info);
        g.restore();
      }
    }
    cache.set(key, c);
    if (cache.size > 64) cache.delete(cache.keys().next().value);
    return c;
  }
  /** The front face of a wall tile: the strip its painter bakes when there is open floor south of it. */
  function faceStrip(r, L, tx, ty, d) {
    const cache = r.ngFaces || (r.ngFaces = new Map());
    const v = L.variant[ty * L.w + tx];
    const key = d.id + '|' + v + '|' + (tx & 1) + '|' + (ty & 1);
    let c = cache.get(key);
    if (c) return c;
    const s = r.scale, S = stubs();
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(T * s));
    c.height = Math.max(1, Math.ceil(FH * s));
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, -tx * T * s, -(ty * T + T - FH) * s);
    const info = { level: L, env: L.env, T, x: tx, y: ty, rnd: U.mulberry32((L.seed ^ (tx * 7919 + ty * 104729)) >>> 0), rot: 0, across: undefined, turnFloor: false, variant: v,
      n: (dx, dy) => (dx === 0 && dy === 1 ? S.floor : L.t(tx + dx, ty + dy)),
    };
    try {
      if (d.bake) d.bake(g, tx * T, ty * T, info);
    } catch (e) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = (L.env.wall && L.env.wall.face) || '#2a2a2a';
      g.fillRect(0, 0, c.width, c.height);
    }
    cache.set(key, c);
    if (cache.size > 160) cache.delete(cache.keys().next().value);
    return c;
  }
  /** Forget what was baked (a new floor, a new scale, or a tile that changed). */
  O.forget = function (r, tx, ty) {
    if (tx == null) {
      if (r.ngTops) r.ngTops.clear();
      if (r.ngFaces) r.ngFaces.clear();
      return;
    }
    if (r.ngTops) r.ngTops.delete(Math.floor(tx / CH) + ',' + Math.floor(ty / CH));
  };

  /** Draw a picture over the parallelogram from (ex, ey) (its top-left) along (ux, uy) and down (vx, vy). */
  function quad(ctx, img, sx, sy, sw, sh, ex, ey, ux, uy, vx, vy) {
    ctx.save();
    ctx.transform(ux, uy, vx, vy, ex, ey);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1, 1);
    ctx.restore();
  }
  function quadFill(ctx, fill, ex, ey, ux, uy, vx, vy) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + ux, ey + uy);
    ctx.lineTo(ex + ux + vx, ey + uy + vy);
    ctx.lineTo(ex + vx, ey + vy);
    ctx.closePath();
    ctx.fill();
  }
  /** The faces of a block from (x0, y0) to (x1, y1) standing from z0 to z1 that the camera can see:
   *  [{ side, ex, ey, ux, uy, vx, vy }], each running along the edge (u) and from its top down (v). */
  function faces(f, x0, y0, x1, y1, z0, z1, open) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const [ax, ay] = NG.lift(f, cx, cy, z1);
    const [bx, by] = z0 ? NG.lift(f, cx, cy, z0) : [0, 0];
    const dx = ax - bx, dy = ay - by;
    const out = [];
    if (open.s && dy < -0.15) out.push({ side: 's', ex: x0 + ax, ey: y1 + ay, ux: x1 - x0, uy: 0, vx: -dx, vy: -dy });
    if (open.n && dy > 0.15) out.push({ side: 'n', ex: x0 + ax, ey: y0 + ay, ux: x1 - x0, uy: 0, vx: -dx, vy: -dy });
    if (open.e && dx < -0.15) out.push({ side: 'e', ex: x1 + ax, ey: y0 + ay, ux: 0, uy: y1 - y0, vx: -dx, vy: -dy });
    if (open.w && dx > 0.15) out.push({ side: 'w', ex: x0 + ax, ey: y0 + ay, ux: 0, uy: y1 - y0, vx: -dx, vy: -dy });
    return { top: [ax, ay], faces: out };
  }

  class WallPiece {
    draw(ctx) {
      const r = this.r, f = r.ngf, L = r.level, tx = this.tx, ty = this.ty, d = this.d;
      const x0 = tx * T, y0 = ty * T;
      const geo = faces(f, x0, y0, x0 + T, y0 + T, 0, f.height, this.open);
      this.geo = geo;
      const strip = faceStrip(r, L, tx, ty, d);
      for (const q of geo.faces) {
        quad(ctx, strip, 0, 0, strip.width, strip.height, q.ex, q.ey, q.ux, q.uy, q.vx, q.vy);
        // the sides take less light than the front; the top edge catches a little
        if (q.side !== 's') quadFill(ctx, 'rgba(0,0,0,0.28)', q.ex, q.ey, q.ux, q.uy, q.vx, q.vy);
        quadFill(ctx, 'rgba(0,0,0,0.22)', q.ex + q.vx * 0.82, q.ey + q.vy * 0.82, q.ux, q.uy, q.vx * 0.18, q.vy * 0.18);
      }
      const c = topChunk(r, Math.floor(tx / CH), Math.floor(ty / CH));
      const s = r.scale;
      const sx = (tx - Math.floor(tx / CH) * CH) * T * s, sy = (ty - Math.floor(ty / CH) * CH) * T * s;
      ctx.drawImage(c, sx, sy, T * s, T * s, x0 + geo.top[0], y0 + geo.top[1], T, T);
    }
  }
  class DoorPiece {
    draw(ctx) {
      const r = this.r, f = r.ngf, door = this.door, env = r.level.env;
      const pal = env.door || {};
      const x0 = door.tx * T, y0 = door.ty * T;
      const open = U.clamp(door.open || 0, 0, 1);
      // a closed door stands as tall as the walls; as it opens it pulls up into a lintel over the doorway
      const z0 = f.height * 0.72 * open;
      const inset = door.horizontal ? [0, 9, T, T - 9] : [9, 0, T - 9, T];
      const [ix0, iy0, ix1, iy1] = [x0 + inset[0], y0 + inset[1], x0 + inset[2], y0 + inset[3]];
      const geo = faces(f, ix0, iy0, ix1, iy1, z0, f.height, this.open);
      this.geo = geo;
      this.box = [ix0, iy0, ix1, iy1];
      const panel = pal.panel || '#4a3a2a', frame = pal.frame || '#231c15', trim = pal.trim || '#8a6a40';
      for (const q of geo.faces) {
        quadFill(ctx, q.side === 's' ? panel : U.shade(panel, -0.3), q.ex, q.ey, q.ux, q.uy, q.vx, q.vy);
        ctx.save();
        ctx.strokeStyle = U.rgba(trim, 0.7);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(q.ex + q.ux * 0.5, q.ey + q.uy * 0.5);
        ctx.lineTo(q.ex + q.ux * 0.5 + q.vx, q.ey + q.uy * 0.5 + q.vy);
        ctx.stroke();
        ctx.restore();
      }
      const [ax, ay] = geo.top;
      ctx.fillStyle = frame;
      ctx.fillRect(ix0 + ax, iy0 + ay, ix1 - ix0, iy1 - iy0);
      ctx.fillStyle = U.rgba(trim, 0.5);
      ctx.fillRect(ix0 + ax, iy0 + ay, ix1 - ix0, 0.8);
    }
  }
  const piecePool = [], doorPool = [];

  /** Add this frame's raised walls and doors to the renderer's drawables. */
  O.addPieces = function (r, game, drawables) {
    const f = r.ngf;
    r.ngPieces = r.ngPieces || [];
    r.ngPieces.length = 0;
    if (!f || f.tilt <= 0.01) return;
    const L = game.level, tv = r.tileView;
    let n = 0, nd = 0;
    const tx0 = Math.max(0, tv.tx0 - 1), tx1 = Math.min(L.w - 1, tv.tx1 + 1);
    const ty0 = Math.max(0, tv.ty0), ty1 = Math.min(L.h - 1, tv.ty1 + 1);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const d = L.terrain[ty * L.w + tx];
        const door = L.doorAt[ty * L.w + tx];
        if (door) {
          if (!game.doors.includes(door)) continue;
          const p = doorPool[nd] || (doorPool[nd] = new DoorPiece());
          nd++;
          p.r = r;
          p.door = door;
          p.y = ty * T + 0.5;
          p.z = 0;
          p.open = door.horizontal ? { s: true, n: true, e: false, w: false } : { s: true, n: true, e: true, w: true };
          r.ngPieces.push(p);
          drawables.push(p);
          continue;
        }
        if (!NG.raised(d)) continue;
        const p = piecePool[n] || (piecePool[n] = new WallPiece());
        n++;
        p.r = r;
        p.tx = tx;
        p.ty = ty;
        p.d = d;
        // sorted by its north edge: things on the wall square itself (a breaker panel, a picture) draw over
        // it, things north of it hide behind it, things south of it stand in front of it
        p.y = ty * T + 0.01;
        p.z = 0;
        const solid = (x, y) => NG.raised(L.t(x, y)) || !L.inBounds(x, y);
        p.open = { s: !solid(tx, ty + 1), n: !solid(tx, ty - 1), e: !solid(tx + 1, ty), w: !solid(tx - 1, ty) };
        r.ngPieces.push(p);
        drawables.push(p);
      }
    }
  };

  /** After the lightmap is made: each raised top takes the light of its own square, and each face the
   *  light of the floor in front of it, so a lit room lights the walls around it. */
  O.stampLight = function (r, game) {
    const f = r.ngf, pieces = r.ngPieces;
    if (!f || !pieces || !pieces.length || r.flat) return;
    const lc = r.lc, g = r.lctx;
    const snap = r.ngSnap || (r.ngSnap = document.createElement('canvas'));
    if (snap.width !== lc.width || snap.height !== lc.height) {
      snap.width = lc.width;
      snap.height = lc.height;
    }
    const sg = snap.getContext('2d');
    sg.globalCompositeOperation = 'copy';
    sg.drawImage(lc, 0, 0);
    const s2 = r.scale / 2, ox = r.ox / 2, oy = r.oy / 2;
    g.setTransform(s2, 0, 0, s2, ox, oy);
    g.globalCompositeOperation = 'source-over';
    const W = snap.width, H = snap.height;
    // a world rectangle as a source rectangle of the snapshot (clamped: drawImage refuses rectangles off the canvas)
    const src = (x, y, w, h) => {
      let sx = x * s2 + ox, sy = y * s2 + oy, sw = w * s2, sh = h * s2;
      if (sx < 0) { sw += sx; sx = 0; }
      if (sy < 0) { sh += sy; sy = 0; }
      sw = Math.min(sw, W - sx);
      sh = Math.min(sh, H - sy);
      return sw > 0.5 && sh > 0.5 ? [sx, sy, sw, sh] : null;
    };
    for (const p of pieces) {
      const geo = p.geo;
      if (!geo) continue;
      const [x0, y0, x1, y1] = p.box || [p.tx * T, p.ty * T, p.tx * T + T, p.ty * T + T];
      const top = src(x0, y0, x1 - x0, y1 - y0);
      if (top) g.drawImage(snap, top[0], top[1], top[2], top[3], x0 + geo.top[0], y0 + geo.top[1], x1 - x0, y1 - y0);
      for (const q of geo.faces) {
        // the strip of floor just in front of the face
        const k = 7;
        const rect = q.side === 's' ? [x0, y1, x1 - x0, k] : q.side === 'n' ? [x0, y0 - k, x1 - x0, k] : q.side === 'e' ? [x1, y0, k, y1 - y0] : [x0 - k, y0, k, y1 - y0];
        const sr = src(rect[0], rect[1], rect[2], rect[3]);
        if (!sr) continue;
        g.save();
        g.transform(q.ux, q.uy, q.vx, q.vy, q.ex, q.ey);
        // horizontal faces read the strip left to right; side faces read it top to bottom
        if (q.side === 'e' || q.side === 'w') {
          g.transform(0, 1, 1, 0, 0, 0);
          g.drawImage(snap, sr[0], sr[1], sr[2], sr[3], 0, 0, 1, 1);
        } else g.drawImage(snap, sr[0], sr[1], sr[2], sr[3], 0, 0, 1, 1);
        g.restore();
      }
    }
  };
})();
