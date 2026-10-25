/* The Linear Maze engine — engine/memory.js
 * Floors remember how you left them. When you leave a floor (by its stairs, an elevator, or a
 * pack that moves you), Game.loadLevel asks for a snapshot of it; when you come back, the floor
 * is rebuilt from its map and the snapshot is laid over it: what you picked up stays gone, the
 * dead stay dead, opened chests stay open, doors stay unlocked, tiles a trap changed stay changed,
 * fired traps stay fired, the minimap stays explored, the blood stays on the floor.
 *
 * A snapshot is plain JSON (it is saved with the run). It holds differences, not the whole floor:
 *   sig       the floor's shape when it was taken (size and what its map places); a floor whose
 *             map has changed since (an edited game) starts fresh instead
 *   terrain   { tileIndex: terrainId } tiles changed while playing (setTerrain)
 *   explored  the minimap, as bits (base64)
 *   rooms     indexes of rooms already announced
 *   doors     { tileIndex: bits } 1 unlocked (a key or clearance door), 2 sealed, 4 has opened (door triggers fired)
 *   gone      map items no longer there (indexes into the level's spawns)
 *   items     { spawnIndex: { field: value } } map items that changed (used, opened, hp...)
 *   extra     items that weren't on the map (loot, drops): { id, tx, ty, props, tag, s: fields }
 *   enemies   every living enemy: { id, x, y, hp, p: spawn props, h: [homeX, homeY] }
 *   npcsGone, npcs, npcsExtra   as for items
 *   traps     { trapIndex: [armed, timesFired] } traps that have fired
 *   lights    { key: { off, intensity, flicker, color, r } } static lights a trap or script changed
 *   decals    the most recent blood and scorch marks
 *   stats     the floor's tally (time, kills, gold, chests...)
 *   keys      the keys the player was carrying on this floor (keys belong to a floor)
 *   leftAt    { x, y } the stairs tile last used to leave (Game.rememberFloor adds it)
 *
 * Things made by a pack's levelLoaded handler (the rotary phone, the town's search spot, desk toys)
 * are not remembered: the handler makes them again on every arrival. Timers, projectiles and
 * particles in flight are not remembered either.
 *
 * "Fields" are an object's own properties that are plain data (numbers, strings, booleans, plain
 * objects and arrays of them), minus the ones that change every frame or hold drawing caches.
 * A pack whose item keeps state in such a field (it.used, it.opened, it.mem.count) gets it
 * remembered for free; state kept in a Set, a class instance or a closure is not.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const FM = (LM.floorMemory = {});
  FM.VERSION = 1;
  FM.MAX_DECALS = 240;
  FM.MAX_FIELD = 2000; // characters of JSON

  // per-frame state, drawing caches, references and values the constructor works out again
  const SKIP = new Set([
    'def', 'game', 'level', 't', 'flash', 'vis', 'visible', 'seeLos', 'losT', 'distP', 'bubble', 'barkT',
    'vx', 'vy', 'mx', 'my', 'kvx', 'kvy', 'walk', 'spr', 'sprKey', 'sprScale', 'sprR', 'pop', 'pickupDelay',
    'lastBark', 'wantFace', 'alertT', 'hazardCd', 'globalCd', 'stunned', 'atk', 'atkCd', 'hitWall', 'passHazard',
    'speedMul', 'light', 'isItem', 'isNPC', 'isEnemy', 'isDoor', 'turnAngle', 'face', 'said', 'ctrl',
  ]);
  const isPlain = (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const p = Object.getPrototypeOf(v);
    return p === null || Object.getPrototypeOf(p) === null; // works across frames (the editor's play test)
  };
  /** Is v plain data that survives JSON (and small enough to be worth keeping)? */
  function plainOk(v, depth) {
    if (v === null) return true;
    const t = typeof v;
    if (t === 'string') return v.length < 4000;
    if (t === 'boolean') return true;
    if (t === 'number') return Number.isFinite(v);
    if (t !== 'object' || depth > 5) return false;
    if (Array.isArray(v)) return v.length <= 200 && v.every((x) => plainOk(x, depth + 1));
    if (!isPlain(v)) return false;
    const ks = Object.keys(v);
    return ks.length <= 60 && ks.every((k) => v[k] === undefined || plainOk(v[k], depth + 1));
  }
  FM.plainOk = (v) => plainOk(v, 0);
  // two decimals are plenty for positions and timers, and keep saves small
  const rounder = (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);
  const json = (v) => JSON.stringify(v, rounder);
  const rnd = (v) => Math.round(v * 100) / 100;

  /** An object's remembered fields: { key: plain value }. Big values (a copy of a light's shadow polygon,
   *  say) are left out: state worth remembering is small, and saves stay small. */
  function fields(o) {
    const out = {};
    for (const k of Object.keys(o)) {
      if (k[0] === '_' || SKIP.has(k)) continue;
      const v = o[k];
      if (v === undefined || typeof v === 'function') continue;
      if (!plainOk(v, 0)) continue;
      if (v && typeof v === 'object' && JSON.stringify(v).length > FM.MAX_FIELD) continue;
      out[k] = v;
    }
    return out;
  }
  FM.fields = fields;
  /** Note an object's fields as it was made, so a snapshot can keep only what changed since. */
  FM.baseline = function (o) {
    const b = {};
    const f = fields(o);
    for (const k of Object.keys(f)) b[k] = json(f[k]);
    o._b = b;
  };
  /** The fields that differ from the object's baseline, or null. */
  function changed(o) {
    const f = fields(o), b = o._b || {};
    let d = null;
    for (const k of Object.keys(f)) {
      const s = json(f[k]);
      if (s !== b[k]) (d = d || {})[k] = JSON.parse(s);
    }
    return d;
  }

  // ------------------------------------------------------------ bits
  function packBits(arr) {
    const n = arr.length, bytes = new Uint8Array((n + 7) >> 3);
    for (let i = 0; i < n; i++) if (arr[i]) bytes[i >> 3] |= 1 << (i & 7);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unpackBits(str, arr) {
    let s;
    try {
      s = atob(str);
    } catch (e) {
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      const b = s.charCodeAt(i >> 3);
      arr[i] = b & (1 << (i & 7)) ? 1 : 0;
    }
  }

  /** A floor's shape: its size and everything its map places (after elevators are built into it). */
  FM.signature = function (L) {
    let s = L.w + 'x' + L.h;
    for (const sp of L.spawns) s += '|' + sp.kind + ':' + (sp.id || '') + '@' + sp.x + ',' + sp.y;
    return U.strHash(s).toString(36);
  };
  /** A static light's name in a snapshot: where it is (and its tag), counted when several share a spot. */
  function lightKeys(lights) {
    const seen = new Map();
    return lights.map((li) => {
      const k = Math.round(li.x) + ',' + Math.round(li.y) + (li.tag ? '#' + li.tag : '');
      const n = (seen.get(k) || 0) + 1;
      seen.set(k, n);
      return n > 1 ? k + '~' + n : k;
    });
  }
  const LIGHT_FIELDS = ['off', 'intensity', 'flicker', 'color', 'r'];
  FM.baselineLights = function (game) {
    for (const li of game.staticLights) {
      const b = {};
      for (const k of LIGHT_FIELDS) b[k] = json(li[k]);
      li._b = b;
    }
  };

  // ------------------------------------------------------------ taking a snapshot
  FM.snapshot = function (game) {
    const L = game.level, P = game.player;
    const m = { v: FM.VERSION, sig: L.sig || FM.signature(L) };
    // tiles changed while playing
    if (L.baseTerrain) {
      let t = null;
      for (let i = 0; i < L.n; i++) if (L.terrain[i].id !== L.baseTerrain[i]) (t = t || {})[i] = L.terrain[i].id;
      if (t) m.terrain = t;
    }
    m.explored = packBits(L.explored);
    const rooms = [];
    L.rooms.forEach((r, i) => r.visited && rooms.push(i));
    if (rooms.length) m.rooms = rooms;
    // a lockdown in progress is let go when you leave (its seals would otherwise outlast the monsters)
    const lockdown = new Set();
    for (const tr of game.traps) for (const d of tr.sealed || []) lockdown.add(d);
    const doors = {};
    let nd = 0;
    for (const d of game.doors) {
      const bits = (d.unlocked && (d.lock || d.flag) ? 1 : 0) | (d.sealed && !lockdown.has(d) ? 2 : 0) | (d.opened ? 4 : 0);
      doors[L.idx(d.tx, d.ty)] = bits;
      nd++;
    }
    if (nd) m.doors = doors;
    // items
    const alive = new Set();
    const items = {}, extra = [];
    for (const it of game.items) {
      if (it.dead || it._hook) continue;
      if (it._si != null) {
        alive.add(it._si);
        const d = changed(it);
        if (d) items[it._si] = d;
      } else {
        const e = { id: it.def.id, tx: it.tx, ty: it.ty };
        if (it.props && Object.keys(it.props).length && plainOk(it.props, 0)) e.props = JSON.parse(json(it.props));
        if (it.tag) e.tag = it.tag;
        const s = fields(it);
        for (const k of ['props', 'tag', 'tx', 'ty', 'dead']) delete s[k];
        e.s = JSON.parse(json(s));
        extra.push(e);
      }
    }
    const gone = [];
    L.spawns.forEach((sp, i) => sp.kind === 'item' && !alive.has(i) && gone.push(i));
    if (gone.length) m.gone = gone;
    if (Object.keys(items).length) m.items = items;
    if (extra.length) m.extra = extra;
    // monsters: every one still alive, where it is now
    m.enemies = game.enemies.filter((e) => !e.dead && !e._hook).map((e) => {
      const o = { id: e.def.id, x: rnd(e.x), y: rnd(e.y), hp: rnd(e.hp) };
      if (e._props && Object.keys(e._props).length && plainOk(e._props, 0)) o.p = JSON.parse(json(e._props));
      if (e.home && (Math.abs(e.home.x - e.x) > 1 || Math.abs(e.home.y - e.y) > 1)) o.h = [rnd(e.home.x), rnd(e.home.y)];
      return o;
    });
    // people
    const nAlive = new Set(), npcs = {}, nExtra = [];
    for (const n of game.npcs) {
      if (n.dead || n._hook) continue;
      if (n._si != null) {
        nAlive.add(n._si);
        const d = changed(n);
        if (d) npcs[n._si] = d;
      } else {
        const e = { id: n.def.id, tx: Math.floor(n.home.x / T), ty: Math.floor(n.home.y / T) };
        if (n.props && Object.keys(n.props).length && plainOk(n.props, 0)) e.props = JSON.parse(json(n.props));
        if (n.tag) e.tag = n.tag;
        const s = fields(n);
        for (const k of ['props', 'tag', 'dead']) delete s[k];
        e.s = JSON.parse(json(s));
        nExtra.push(e);
      }
    }
    const nGone = [];
    L.spawns.forEach((sp, i) => sp.kind === 'npc' && !nAlive.has(i) && nGone.push(i));
    if (nGone.length) m.npcsGone = nGone;
    if (Object.keys(npcs).length) m.npcs = npcs;
    if (nExtra.length) m.npcsExtra = nExtra;
    // traps that have gone off
    const traps = {};
    let ntr = 0;
    game.traps.forEach((tr, i) => {
      if (tr.fired || !tr.armed) {
        traps[i] = [tr.armed ? 1 : 0, tr.fired | 0];
        ntr++;
      }
    });
    if (ntr) m.traps = traps;
    // static lights a trap or script switched, dimmed or set flickering
    const keys = lightKeys(game.staticLights);
    const lights = {};
    let nl = 0;
    game.staticLights.forEach((li, i) => {
      if (!li._b) return;
      let d = null;
      for (const k of LIGHT_FIELDS) if (json(li[k]) !== li._b[k]) (d = d || {})[k] = li[k] === undefined ? null : li[k];
      if (d) {
        lights[keys[i]] = d;
        nl++;
      }
    });
    if (nl) m.lights = lights;
    // marks on the floor
    const dec = game.renderer && game.renderer.decals ? game.renderer.decals.slice(-FM.MAX_DECALS).filter((d) => plainOk(d, 0)) : [];
    if (dec.length) m.decals = JSON.parse(json(dec));
    if (game.stats && plainOk(game.stats, 0)) m.stats = JSON.parse(json(game.stats));
    if (P && P.keys && P.keys.size) m.keys = [...P.keys];
    return m;
  };

  // ------------------------------------------------------------ coming back
  /**
   * Lay a snapshot's tiles over a freshly built level, before anything is spawned. Returns the plan
   * Game.loadLevel follows while spawning, or null when the snapshot no longer fits the floor.
   */
  FM.prepare = function (L, m) {
    if (!m || m.v !== FM.VERSION || m.sig !== L.sig) return null;
    const changedTiles = [];
    for (const [i, id] of Object.entries(m.terrain || {})) {
      const td = LM.find('terrain', id);
      const k = +i;
      if (!td || k < 0 || k >= L.n) continue;
      L.terrain[k] = td;
      changedTiles.push(k);
    }
    // doors follow the tiles: a tile that stopped being a door loses its door, one that became one gets one
    if (changedTiles.length) {
      const set = new Set(changedTiles);
      L.spawns = L.spawns.map((sp) => (sp.kind === 'door' && set.has(L.idx(sp.x, sp.y)) && !L.terrain[L.idx(sp.x, sp.y)].door ? Object.assign({}, sp, { kind: 'none' }) : sp));
      for (const k of changedTiles) {
        const td = L.terrain[k];
        const x = k % L.w, y = (k - x) / L.w;
        if (td.door && !L.spawns.some((sp) => sp.kind === 'door' && sp.x === x && sp.y === y)) L.spawns.push({ kind: 'door', x, y, lock: td.door.lock || null, style: td.door.style, sealed: td.door.sealed, props: {} });
      }
    }
    if (m.explored) unpackBits(m.explored, L.explored);
    for (const i of m.rooms || []) if (L.rooms[i]) L.rooms[i].visited = true;
    return { m, gone: new Set(m.gone || []), npcsGone: new Set(m.npcsGone || []) };
  };

  /** After the map's own things are spawned: put back what changed, what was added, and who is still alive. */
  FM.finish = function (game, plan) {
    const m = plan.m, L = game.level;
    // map items that changed
    for (const it of game.items) {
      if (it._si == null) continue;
      const d = m.items && m.items[it._si];
      if (d) Object.assign(it, JSON.parse(JSON.stringify(d)));
    }
    // things that weren't on the map
    for (const e of m.extra || []) {
      if (!LM.find('items', e.id)) continue;
      const it = game.spawnItem(e.id, e.tx, e.ty, e.props ? JSON.parse(JSON.stringify(e.props)) : undefined, e.tag);
      if (it && e.s) Object.assign(it, JSON.parse(JSON.stringify(e.s)));
    }
    for (const n of game.npcs) {
      if (n._si == null) continue;
      const d = m.npcs && m.npcs[n._si];
      if (d) Object.assign(n, JSON.parse(JSON.stringify(d)));
    }
    for (const e of m.npcsExtra || []) {
      if (!LM.find('npcs', e.id)) continue;
      const n = game.spawnNPC(e.id, e.tx, e.ty, e.props ? JSON.parse(JSON.stringify(e.props)) : undefined, e.tag);
      if (n && e.s) Object.assign(n, JSON.parse(JSON.stringify(e.s)));
    }
    // monsters
    for (const o of m.enemies || []) {
      if (!LM.find('enemies', o.id)) continue;
      const e = game.spawnEnemy(o.id, o.x, o.y, o.p ? JSON.parse(JSON.stringify(o.p)) : {});
      if (!e) continue;
      e.spawning = 0;
      if (o.hp != null) e.hp = Math.min(e.maxHp, o.hp);
      if (o.h) e.home = { x: o.h[0], y: o.h[1] };
    }
    // doors
    for (const d of game.doors) {
      const bits = m.doors && m.doors[L.idx(d.tx, d.ty)];
      if (bits == null) continue;
      if (bits & 1) d.unlocked = true;
      d.sealed = !!(bits & 2);
      d.opened = !!(bits & 4);
    }
    // traps
    for (const [i, v] of Object.entries(m.traps || {})) {
      const tr = game.traps[+i];
      if (!tr) continue;
      tr.armed = !!v[0];
      tr.fired = v[1] | 0;
    }
    // lights
    if (m.lights) {
      const keys = lightKeys(game.staticLights);
      game.staticLights.forEach((li, i) => {
        const d = m.lights[keys[i]];
        if (!d) return;
        for (const k of LIGHT_FIELDS) if (k in d) li[k] = d[k] === null ? undefined : d[k];
        li.dirty = true;
      });
    }
    if (m.decals && game.renderer) game.renderer.decals = JSON.parse(JSON.stringify(m.decals));
    if (m.stats) game.stats = Object.assign(game.newStats(), m.stats);
    if (game.player) game.player.keys = new Set((m.keys || []).filter((k) => LM.KEY_COLORS[k]));
  };

  /** Rough size of everything remembered (characters of JSON), for the debug helpers and tests. */
  FM.size = (floors) => {
    try {
      return JSON.stringify(floors || {}).length;
    } catch (e) {
      return -1;
    }
  };
})();
