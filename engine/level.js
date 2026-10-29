/* The Linear Maze engine — engine/level.js
 * Turns a level definition (ASCII map + legend + traps + rooms) into a tile
 * grid the rest of the engine can query, and builds the enemy flow field.
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE;

  class Level {
    constructor(def) {
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.env = LM.get('environments', def.environment);
      const rows = def.map;
      this.h = rows.length;
      this.w = rows.reduce((m, r) => Math.max(m, r.length), 0);
      const n = (this.n = this.w * this.h);
      this.terrain = new Array(n);
      this.dyn = new Uint8Array(n); // 1 = blocked by a closed door
      this.doorAt = new Array(n); // Door entity per tile, if any
      this.explored = new Uint8Array(n);
      this.variant = new Uint8Array(n); // floor variant (room floors)
      this.rot = new Int8Array(n).fill(-1); // quarter turns clockwise from the legend's rot (-1: not set)
      this.tags = {};
      this.spawns = [];
      this.start = null;
      this.seed = LM.util.strHash(def.id || 'level');

      const legend = Object.assign({}, LM.registry.legend, def.legend || {});
      const VOID = LM.get('terrain', 'void');
      for (let y = 0; y < this.h; y++) {
        const row = rows[y];
        for (let x = 0; x < this.w; x++) {
          const ch = x < row.length ? row[x] : ' ';
          let e = legend[ch];
          if (e === undefined) {
            console.warn('[LM] Unknown map character "' + ch + '" in ' + def.id + ' at ' + x + ',' + y);
            e = { terrain: 'floor' };
          }
          if (typeof e === 'string') e = { terrain: e };
          const tId = e.terrain || 'floor';
          const td = LM.find('terrain', tId) || VOID;
          const i = y * this.w + x;
          this.terrain[i] = td;
          if (e.variant) this.variant[i] = e.variant;
          const r = Level.quarterTurns(e.rot);
          if (r >= 0 && Level.turns(td)) this.rot[i] = r;
          if (e.tag) (this.tags[e.tag] = this.tags[e.tag] || []).push({ x, y });
          if (td.entry || e.start) this.start = { x, y };
          if (td.door) this.spawns.push({ kind: 'door', x, y, lock: td.door.lock || null, style: td.door.style, sealed: td.door.sealed, tag: e.tag, props: e.props || {} });
          this.addSpawns(e, x, y);
        }
      }
      // optional second layer: furniture, people and pickups drawn over the terrain map
      if (def.objects) {
        const ol = def.objectLegend || {};
        def.objects.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            if (ch === ' ' || ch === '.') continue;
            let e = ol[ch];
            if (e === undefined) {
              console.warn('[LM] Unknown object character "' + ch + '" in ' + def.id + ' at ' + x + ',' + y);
              continue;
            }
            // a bare id names whatever it is registered as: an item, an NPC or an enemy
            if (typeof e === 'string') e = LM.find('items', e) ? { item: e } : LM.find('npcs', e) ? { npc: e } : LM.find('enemies', e) ? { enemy: e } : { item: e };
            if (e.tag) (this.tags[e.tag] = this.tags[e.tag] || []).push({ x, y });
            if (e.start) this.start = { x, y };
            this.addSpawns(e, x, y);
          }
        });
      }
      // curved rooms (engine/curves.js), then the elevators that stop here (engine/elevators.js), built into the map
      this.ovals = [];
      if (LM.curves) LM.curves.stamp(this);
      if (LM.elevators) LM.elevators.stamp(this);
      // round rooms, pillars and other shapes trim the grid and leave curved edges (engine/shapes.js)
      this.curve = null;
      this.navBlock = null;
      this.shapes = [];
      if (LM.shapes && LM.shapes.carve && ((def.shapes && def.shapes.length) || (def.rooms || []).some((r) => r.shape))) LM.shapes.carve(this);
      if (!this.start) {
        console.warn('[LM] Level ' + def.id + ' has no entry ("<"); using first floor tile');
        for (let i = 0; i < n && !this.start; i++) if (!this.terrain[i].solid) this.start = { x: i % this.w, y: Math.floor(i / this.w) };
      }
      this.rooms = (def.rooms || []).map((r) => {
        const shp = r.shape ? this.shapes.find((s) => s.spec.room === r.name) : null;
        return { name: r.name, rect: r.rect, visited: false, note: r.note, shape: r.shape, poly: shp ? shp.pts : null };
      });
      LM.nav.init(this);
    }
    addSpawns(e, x, y) {
      if (e.item) this.spawns.push({ kind: 'item', id: e.item, x, y, props: e.props || {}, tag: e.tag });
      if (e.enemy) this.spawns.push({ kind: 'enemy', id: e.enemy, x, y, props: e.props || {}, tag: e.tag });
      if (e.npc) this.spawns.push({ kind: 'npc', id: e.npc, x, y, props: e.props || {}, tag: e.tag });
    }
    inBounds(x, y) {
      return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }
    idx(x, y) {
      return y * this.w + x;
    }
    t(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return LM.registry.terrain.void;
      return this.terrain[y * this.w + x];
    }
    dynAt(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
      return this.dyn[y * this.w + x];
    }
    solidAt(x, y) {
      return this.t(x, y).solid || this.dynAt(x, y) === 1;
    }
    /** Can something stand on this tile's centre? Floor, or a curve tile whose middle is on the floor side. */
    walkable(x, y) {
      const d = this.t(x, y);
      if (this.dynAt(x, y) === 1) return false;
      return !d.solid || (!!d.curve && !!this.curveIn && this.curveIn[y * this.w + x] === 1);
    }
    /** The tile's turn: 0-3 quarter turns clockwise, or -1 when its legend entry doesn't set one. */
    rotAt(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
      return this.rot[y * this.w + x];
    }
    /** The solid boxes of a thin tile (a terrain's rect or rects), turned with the tile. null for whole-tile solids. */
    rectsAt(x, y) {
      const d = this.t(x, y);
      const base = d.rects || (d.rect ? [d.rect] : null);
      if (!base) return null;
      const r = this.rotAt(x, y);
      if (r <= 0) return base;
      const cache = d._turned && d._turned.base === base ? d._turned : (d._turned = { base, turns: [] });
      return cache.turns[r] || (cache.turns[r] = base.map((rc) => Level.turnRect(rc, r)));
    }
    blocksShot(x, y) {
      return this.t(x, y).blocksShots || this.dynAt(x, y) === 1;
    }
    blocksLight(x, y) {
      return this.t(x, y).blocksLight || this.dynAt(x, y) === 1;
    }
    tileAtWorld(px, py) {
      return this.t(Math.floor(px / T), Math.floor(py / T));
    }
    center(tx, ty) {
      return { x: tx * T + T / 2, y: ty * T + T / 2 };
    }
    roomAt(px, py) {
      const tx = px / T, ty = py / T;
      for (const r of this.rooms) {
        const [x, y, w, h] = r.rect;
        if (tx >= x && ty >= y && tx < x + w && ty < y + h && (!r.poly || LM.shapes.inPoly(r.poly, px, py))) return r;
      }
      return null;
    }
  }
  /** Can a tile of this terrain be turned? Walls and other tall blocks can't (their front face is always to the
   *  south), unless the terrain says turns: true; anything can opt out with turns: false. */
  Level.turns = (td) => (td && td.turns != null ? !!td.turns : !(td && td.tall));
  /** A legend entry's rot as quarter turns (0-3): accepts 0-3, or 90 / 180 / 270 degrees; -1 if not set. */
  Level.quarterTurns = function (v) {
    if (v == null || v === '' || !Number.isFinite(+v)) return -1;
    let n = Math.round(+v);
    if (Math.abs(n) >= 4) n = Math.round(n / 90);
    return ((n % 4) + 4) % 4;
  };
  /** A box [x, y, w, h] inside a tile, turned clockwise by r quarter turns about the tile's centre. */
  Level.turnRect = function (rc, r) {
    let [x, y, w, h] = rc;
    for (let k = 0; k < r; k++) [x, y, w, h] = [T - y - h, x, h, w];
    return [x, y, w, h];
  };
  /** A direction (dx, dy) in a tile's own frame, as a direction on the map, for a tile turned r quarter turns clockwise. */
  Level.turnDir = function (dx, dy, r) {
    for (let k = 0; k < r; k++) [dx, dy] = [-dy, dx];
    return [dx, dy];
  };
  LM.Level = Level;

  // ------------------------------------------------------------------ nav
  // A breadth-first flow field from the player's tile. Enemies that cannot
  // see the player walk downhill on it, which handles any maze shape.
  const NAV = (LM.nav = {});
  const DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  NAV.init = function (level) {
    level.navDist = new Int16Array(level.n).fill(-1);
    level.navQueue = new Int32Array(level.n);
    level.navFrom = -1;
    level.navDirty = true;
  };
  /** Can a body of size class k (NAV.sizeOf; 1, the default, is everything up to a tile wide) go onto this
   *  tile? Bigger classes also need the clearance map to say a k-by-k block of open floor holds it. */
  NAV.passable = function (level, x, y, k) {
    if (!level.inBounds(x, y)) return false;
    const i = y * level.w + x;
    if (k > 1 && !(level.navClear[i] >= k)) return false;
    const d = level.terrain[i];
    if (level.navBlock && level.navBlock[i]) return false; // a curved edge whose middle is wall (shapes)
    if (d.hazard || (d.solid && !(d.curve && level.curveIn && level.curveIn[i]))) return false;
    const door = level.doorAt[i];
    if (door && door.blocking && (door.lock || door.sealed || (door.flag && !door.unlocked))) return false;
    return true;
  };
  NAV.compute = function (level, sx, sy, maxDist) {
    flood(level, level.navDist, sx, sy, maxDist, 1);
    level.navFrom = level.inBounds(sx, sy) ? sy * level.w + sx : -1;
    level.navStamp = (level.navStamp || 0) + 1;
    level.navDirty = false;
  };
  // the breadth-first flood behind a flow field, for bodies of size class k
  function flood(level, dist, sx, sy, maxDist, k) {
    const q = level.navQueue, w = level.w;
    dist.fill(-1);
    if (!level.inBounds(sx, sy)) return;
    let head = 0, tail = 0;
    const s = sy * w + sx;
    dist[s] = 0;
    q[tail++] = s;
    const lim = maxDist || 70;
    while (head < tail) {
      const cur = q[head++];
      const cx = cur % w, cy = (cur - cx) / w;
      const cd = dist[cur];
      if (cd >= lim) continue;
      for (let j = 0; j < 8; j++) {
        const nx = cx + DIRS[j][0], ny = cy + DIRS[j][1];
        if (!NAV.passable(level, nx, ny, k)) continue;
        if (j >= 4 && (!NAV.passable(level, cx + DIRS[j][0], cy, k) || !NAV.passable(level, cx, cy + DIRS[j][1], k))) continue;
        const ni = ny * w + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = cd + 1;
        q[tail++] = ni;
      }
    }
  }
  NAV.distAt = function (level, px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!level.inBounds(x, y)) return -1;
    return level.navDist[y * level.w + x];
  };
  /** The next tile on a short walk from world point (fx, fy) to (tx, ty): { tx, ty } (a tile), or null when
   *  there's no way within `lim` tiles. A breadth-first search from the goal that stops when it reaches
   *  the start, for an enemy chasing something other than the player (the flow field is the player's). */
  NAV.step = function (level, fx, fy, gx, gy, lim, k) {
    const w = level.w;
    k = k || 1;
    if (k > 1) NAV.clearFor(level);
    const sx = Math.floor(fx / T), sy = Math.floor(fy / T), ex = Math.floor(gx / T), ey = Math.floor(gy / T);
    if (!level.inBounds(sx, sy) || !level.inBounds(ex, ey)) return null;
    if (sx === ex && sy === ey) return { tx: ex, ty: ey };
    if (!level.navSeen || level.navSeen.length !== level.n) {
      level.navSeen = new Int32Array(level.n);
      level.navD2 = new Int16Array(level.n);
      level.navQ2 = new Int32Array(level.n);
      level.navGen = 0;
    }
    const seen = level.navSeen, dist = level.navD2, q = level.navQ2, gen = ++level.navGen;
    const s = sy * w + sx, g0 = ey * w + ex, max = lim || 40;
    let head = 0, tail = 0;
    seen[g0] = gen;
    dist[g0] = 0;
    q[tail++] = g0;
    let found = false;
    while (head < tail && !found) {
      const cur = q[head++];
      const cx = cur % w, cy = (cur - cx) / w, cd = dist[cur];
      if (cd >= max) continue;
      for (let j = 0; j < 8; j++) {
        const nx = cx + DIRS[j][0], ny = cy + DIRS[j][1];
        const ni = ny * w + nx;
        if (!level.inBounds(nx, ny) || seen[ni] === gen) continue;
        // the start tile may be one the walker stands half in (a doorway); let it through
        if (ni !== s && !NAV.passable(level, nx, ny, k)) continue;
        if (j >= 4 && (!NAV.passable(level, cx + DIRS[j][0], cy, k) || !NAV.passable(level, cx, cy + DIRS[j][1], k))) continue;
        seen[ni] = gen;
        dist[ni] = cd + 1;
        q[tail++] = ni;
        if (ni === s) {
          found = true;
          break;
        }
      }
    }
    if (!found) return null;
    // downhill from the start
    let best = dist[s], bx = -1, by = -1;
    for (let j = 0; j < 8; j++) {
      const nx = sx + DIRS[j][0], ny = sy + DIRS[j][1];
      if (!level.inBounds(nx, ny)) continue;
      const ni = ny * w + nx;
      if (seen[ni] !== gen || dist[ni] >= best) continue;
      if (j >= 4 && (!NAV.passable(level, sx + DIRS[j][0], sy, k) || !NAV.passable(level, sx, sy + DIRS[j][1], k))) continue;
      best = dist[ni];
      bx = nx;
      by = ny;
    }
    return bx < 0 ? null : { tx: bx, ty: by };
  };
  /** Unit vector pointing downhill on the flow field (the player's), or null. k: the walker's size class; a
   *  big body gets its own field over the floor it fits (NAV.fieldFor). */
  NAV.dir = function (level, px, py, k) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!level.inBounds(x, y)) return null;
    k = k || 1;
    const w = level.w, dist = k > 1 ? NAV.fieldFor(level, k) : level.navDist;
    const here = dist[y * w + x];
    let best = here < 0 ? 32767 : here, bx = -1, by = -1;
    for (let j = 0; j < 8; j++) {
      const nx = x + DIRS[j][0], ny = y + DIRS[j][1];
      if (!level.inBounds(nx, ny)) continue;
      const d = dist[ny * w + nx];
      if (d < 0) continue;
      if (j >= 4 && (!NAV.passable(level, x + DIRS[j][0], y, k) || !NAV.passable(level, x, y + DIRS[j][1], k))) continue;
      if (d < best) {
        best = d;
        bx = nx;
        by = ny;
      }
    }
    if (bx < 0) return null;
    const tx = bx * T + T / 2 - px, ty = by * T + T / 2 - py;
    const l = Math.hypot(tx, ty) || 1;
    return { x: tx / l, y: ty / l };
  };

  // ------------------------------------------------------------------ size
  // Big bodies (engine SPEC 6.26). A body's size class is how many tiles wide a gap it needs: 1 up to a tile across
  // (radius 16 or less: everything that fits a one-tile door, as before), 2 up to two tiles, and so on to NAV.MAXK.
  // The clearance map says, for every tile, the biggest k-by-k block of open floor it's part of; a class-k body
  // walks only on tiles of clearance k or more, so it paths round a one-tile door instead of wedging in it. Worked
  // out once per level (the first time a big body asks), again when terrain changes or a solid object comes or goes.
  NAV.MAXK = 4;
  /** A body's size class from its radius (what it collides with). */
  NAV.sizeOf = function (e) {
    const r = e.r || 10;
    return r * 2 <= T ? 1 : Math.min(NAV.MAXK, Math.ceil(r * 2 / T));
  };
  // floor a body can stand on, ignoring doors (a closed door opens; a locked one is the flow field's business)
  function open(level, i) {
    const d = level.terrain[i];
    if (level.navBlock && level.navBlock[i]) return false;
    return !d.hazard && (!d.solid || (!!d.curve && !!level.curveIn && level.curveIn[i] === 1));
  }
  function solidItems(game) {
    let n = 0;
    if (game) for (const it of game.items) if (!it.dead && (it.solid != null ? it.solid : it.def.solid)) n++;
    return n;
  }
  /** Build the clearance map (level.navClear: one byte a tile, 0 for wall). */
  NAV.clearance = function (level, game) {
    const w = level.w, h = level.h, n = level.n, K = NAV.MAXK;
    const free = new Uint8Array(n);
    for (let i = 0; i < n; i++) free[i] = open(level, i) ? 1 : 0;
    // solid furniture takes the tiles it stands on
    if (game) {
      for (const it of game.items) {
        const solid = it.solid != null ? it.solid : it.def.solid;
        if (it.dead || !solid) continue;
        let x0, y0, x1, y1;
        if (solid === 'rect' && it.getRect) {
          const b = it.getRect();
          [x0, y0, x1, y1] = [b.x0, b.y0, b.x1, b.y1];
        } else {
          const r = it.def.solidRadius || it.r || 0;
          [x0, y0, x1, y1] = [it.x - r, it.y - r, it.x + r, it.y + r];
        }
        // a tile is taken when the object covers its middle (with a little to spare)
        const tx0 = Math.max(0, Math.ceil((x0 - 6) / T - 0.5)), tx1 = Math.min(w - 1, Math.floor((x1 + 6) / T - 0.5));
        const ty0 = Math.max(0, Math.ceil((y0 - 6) / T - 0.5)), ty1 = Math.min(h - 1, Math.floor((y1 + 6) / T - 0.5));
        for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) free[y * w + x] = 0;
      }
    }
    // the biggest open square with each tile as its top-left corner, then each tile's biggest square over it
    const sq = new Uint8Array(n), clear = new Uint8Array(n);
    for (let y = h - 1; y >= 0; y--) {
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        if (!free[i]) continue;
        const r = x + 1 < w ? sq[i + 1] : 0, d = y + 1 < h ? sq[i + w] : 0, rd = x + 1 < w && y + 1 < h ? sq[i + w + 1] : 0;
        sq[i] = Math.min(K, 1 + Math.min(r, d, rd));
      }
    }
    for (let i = 0; i < n; i++) {
      const s = sq[i];
      if (!s) continue;
      const x = i % w, y = (i - x) / w;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
        const j = (y + dy) * w + x + dx;
        if (clear[j] < s) clear[j] = s;
      }
    }
    level.navClear = clear;
    level.navClearItems = solidItems(game);
    level.navClearDirty = false;
    level.navFields = {};
  };
  /** The clearance map, up to date. */
  NAV.clearFor = function (level) {
    if (!level.navClear || level.navClearDirty) NAV.clearance(level, LM.game && LM.game.level === level ? LM.game : null);
    return level.navClear;
  };
  /** Check now and then that no solid object has come or gone (a crate smashed, a barricade built). */
  NAV.checkClearance = function (level, game) {
    if (level.navClear && !level.navClearDirty && solidItems(game) !== level.navClearItems) level.navClearDirty = true;
  };
  /** The player's flow field for size class k (from the same tile as the main one, refreshed with it). */
  NAV.fieldFor = function (level, k) {
    NAV.clearFor(level);
    const fs = level.navFields || (level.navFields = {});
    let f = fs[k];
    if (!f) f = fs[k] = { dist: new Int16Array(level.n).fill(-1), stamp: -1 };
    if (f.stamp !== level.navStamp) {
      const w = level.w, s = level.navFrom;
      if (s >= 0) flood(level, f.dist, s % w, Math.floor(s / w), 70, k);
      else f.dist.fill(-1);
      f.stamp = level.navStamp;
    }
    return f.dist;
  };
  /** Is the straight way from (x0, y0) to (x1, y1) wide enough for class k all along (the last tile aside, where
   *  the target stands)? */
  NAV.wideLine = function (level, x0, y0, x1, y1, k) {
    if (k <= 1) return true;
    const C = NAV.clearFor(level), w = level.w;
    const ex = Math.floor(x1 / T), ey = Math.floor(y1 / T);
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (T / 2));
    for (let s = 0; s <= n; s++) {
      const tx = Math.floor((x0 + ((x1 - x0) * s) / (n || 1)) / T), ty = Math.floor((y0 + ((y1 - y0) * s) / (n || 1)) / T);
      if (Math.abs(tx - ex) <= 1 && Math.abs(ty - ey) <= 1) break;
      if (!level.inBounds(tx, ty) || C[ty * w + tx] < k) return false;
    }
    return true;
  };
  /** When a big body can't get to the player at all: the way to the nearest place it fits, on the player's own
   *  field (downhill, over floor it fits). Null once it's there: the bottleneck, where it waits. */
  NAV.toward = function (level, px, py, k) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!level.inBounds(x, y)) return null;
    const w = level.w, dist = level.navDist;
    const here = dist[y * w + x];
    if (here < 0) return null;
    let best = here, bx = -1, by = -1;
    for (let j = 0; j < 8; j++) {
      const nx = x + DIRS[j][0], ny = y + DIRS[j][1];
      if (!NAV.passable(level, nx, ny, k)) continue;
      if (j >= 4 && (!NAV.passable(level, x + DIRS[j][0], y, k) || !NAV.passable(level, x, y + DIRS[j][1], k))) continue;
      const d = dist[ny * w + nx];
      if (d >= 0 && d < best) {
        best = d;
        bx = nx;
        by = ny;
      }
    }
    if (bx < 0) return null;
    const tx = bx * T + T / 2 - px, ty = by * T + T / 2 - py;
    const l = Math.hypot(tx, ty) || 1;
    return { x: tx / l, y: ty / l };
  };
})();
