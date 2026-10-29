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
  NAV.passable = function (level, x, y) {
    if (!level.inBounds(x, y)) return false;
    const i = y * level.w + x;
    const d = level.terrain[i];
    if (level.navBlock && level.navBlock[i]) return false; // a curved edge whose middle is wall (shapes)
    if (d.hazard || (d.solid && !(d.curve && level.curveIn && level.curveIn[i]))) return false;
    const door = level.doorAt[i];
    if (door && door.blocking && (door.lock || door.sealed || (door.flag && !door.unlocked))) return false;
    return true;
  };
  NAV.compute = function (level, sx, sy, maxDist) {
    const dist = level.navDist, q = level.navQueue, w = level.w;
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
      for (let k = 0; k < 8; k++) {
        const nx = cx + DIRS[k][0], ny = cy + DIRS[k][1];
        if (!NAV.passable(level, nx, ny)) continue;
        if (k >= 4 && (!NAV.passable(level, cx + DIRS[k][0], cy) || !NAV.passable(level, cx, cy + DIRS[k][1]))) continue;
        const ni = ny * w + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = cd + 1;
        q[tail++] = ni;
      }
    }
    level.navFrom = s;
    level.navDirty = false;
  };
  NAV.distAt = function (level, px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!level.inBounds(x, y)) return -1;
    return level.navDist[y * level.w + x];
  };
  /** The next tile on a short walk from world point (fx, fy) to (tx, ty): { tx, ty } (a tile), or null when
   *  there's no way within `lim` tiles. A breadth-first search from the goal that stops when it reaches
   *  the start, for an enemy chasing something other than the player (the flow field is the player's). */
  NAV.step = function (level, fx, fy, gx, gy, lim) {
    const w = level.w;
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
      for (let k = 0; k < 8; k++) {
        const nx = cx + DIRS[k][0], ny = cy + DIRS[k][1];
        const ni = ny * w + nx;
        if (!level.inBounds(nx, ny) || seen[ni] === gen) continue;
        // the start tile may be one the walker stands half in (a doorway); let it through
        if (ni !== s && !NAV.passable(level, nx, ny)) continue;
        if (k >= 4 && (!NAV.passable(level, cx + DIRS[k][0], cy) || !NAV.passable(level, cx, cy + DIRS[k][1]))) continue;
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
    for (let k = 0; k < 8; k++) {
      const nx = sx + DIRS[k][0], ny = sy + DIRS[k][1];
      if (!level.inBounds(nx, ny)) continue;
      const ni = ny * w + nx;
      if (seen[ni] !== gen || dist[ni] >= best) continue;
      if (k >= 4 && (!NAV.passable(level, sx + DIRS[k][0], sy) || !NAV.passable(level, sx, sy + DIRS[k][1]))) continue;
      best = dist[ni];
      bx = nx;
      by = ny;
    }
    return bx < 0 ? null : { tx: bx, ty: by };
  };
  /** Unit vector pointing downhill on the flow field, or null. */
  NAV.dir = function (level, px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!level.inBounds(x, y)) return null;
    const w = level.w, dist = level.navDist;
    const here = dist[y * w + x];
    let best = here < 0 ? 32767 : here, bx = -1, by = -1;
    for (let k = 0; k < 8; k++) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1];
      if (!level.inBounds(nx, ny)) continue;
      const d = dist[ny * w + nx];
      if (d < 0) continue;
      if (k >= 4 && (!NAV.passable(level, x + DIRS[k][0], y) || !NAV.passable(level, x, y + DIRS[k][1]))) continue;
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
})();
