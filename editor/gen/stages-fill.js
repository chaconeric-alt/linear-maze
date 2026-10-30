/* Linear Maze Editor — gen/stages-fill.js
 * Stages 5–9: what goes in the rooms.
 *
 *   access      the way in and on (start, way out, stairs), every lock built as a door, its hack panel,
 *               each key in a container (sometimes a code locker whose code is on a memo elsewhere),
 *               door-release terminals, the rooms' own fixtures, and the items of interest
 *   encounters  the monster budget spent on set pieces (meeting engagement, ambush, waves, tubes, sleeper,
 *               boss and escort) and attrition between them (Vol 2 pp. 147–149)
 *   traps       traps by the job each place needs, damage by Threat Level, TRAP lights, an off-switch on
 *               the far side (Vol 2 pp. 76–92)
 *   treasure    the credit budget spent by type shares and strategies (Vol 2 pp. 152–157)
 *   dressing    furniture, posters and signs from the look's and the room's pools
 *
 * Everything is written into each floor as plain data:
 *   floor.tiles   { 'x,y': legend entry }     terrain the map needs at that tile (doors, stairs, plates...)
 *   floor.objs    { 'x,y': object entry }     the objects layer: items, monsters, the start
 *   floor.traps   [ trap defs ]
 *   floor.slots   [ text slots ]             words filled in by stage 10
 * Coordinates are tiles of floor.layout.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});
  const K = (x, y) => x + ',' + y;
  const ORTHO = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  // ------------------------------------------------------------ the painter: what is free where
  class Painter {
    constructor(plan, lib, floor) {
      this.plan = plan;
      this.lib = lib;
      this.floor = floor;
      this.cells = floor.layout.cells;
      floor.tiles = floor.tiles || {};
      floor.objs = floor.objs || {};
      floor.traps = floor.traps || [];
      floor.slots = floor.slots || [];
      this.reserved = new Set(floor.reserved || []);
    }
    base(x, y) {
      const row = this.cells[y];
      return row && x >= 0 && x < row.length ? row[x] : ' ';
    }
    open(x, y) {
      const c = this.base(x, y);
      return c === '.' || c === ',' || c === '+';
    }
    roomAt(x, y) {
      for (const r of this.floor.rooms) {
        const [rx, ry, rw, rh] = r.rect;
        if (x >= rx && y >= ry && x < rx + rw && y < ry + rh) return r;
      }
      return null;
    }
    /** Keep the tiles inside every doorway clear (and a shaped room's straight run in from its doors). */
    reserveDoors() {
      for (const e of this.floor.edges) for (const [dx, dy] of e.doors) {
        for (const [ox, oy] of ORTHO) {
          const x = dx + ox, y = dy + oy;
          if (this.base(x, y) === '.' || this.base(x, y) === ',') {
            this.reserved.add(K(x, y));
            const r = this.roomAt(x, y);
            if (r && r.shape) for (let s = 1; s <= 4; s++) if (this.base(x + ox * s, y + oy * s) === '.') this.reserved.add(K(x + ox * s, y + oy * s));
          }
        }
      }
    }
    taken(x, y) {
      return !!this.floor.objs[K(x, y)] || this.reserved.has(K(x, y)) || !!this.floor.tiles[K(x, y)];
    }
    /** Usable floor tiles of a room, free of everything. */
    free(r, inset) {
      return G.roomCells(r, inset).filter(([x, y]) => this.base(x, y) === '.' && !this.taken(x, y));
    }
    /** The room's doorway tiles (on its edge, from the floor's edges). */
    doorsOf(r) {
      const [rx, ry, rw, rh] = r.rect, out = [];
      for (const e of this.floor.edges) for (const [dx, dy] of e.doors) if (dx >= rx - 1 && dy >= ry - 1 && dx <= rx + rw && dy <= ry + rh) out.push([dx, dy]);
      return out;
    }
    /** Free wall-row tiles on the side of the room farthest from its doors, middle of that wall first: where a
     *  throne, an altar or a stage faces the room. */
    focal(r) {
      const doors = this.doorsOf(r), row = this.wallRow(r);
      if (!doors.length || !row.length) return row;
      const far = ([x, y]) => Math.min(...doors.map(([dx, dy]) => Math.abs(dx - x) + Math.abs(dy - y)));
      const [rx, ry, rw, rh] = r.rect, cx = rx + (rw - 1) / 2, cy = ry + (rh - 1) / 2;
      const best = Math.max(...row.map(far));
      return row.filter((c) => far(c) >= best - 2).sort((a, b) => Math.abs(a[0] - cx) + Math.abs(a[1] - cy) - (Math.abs(b[0] - cx) + Math.abs(b[1] - cy)));
    }
    /** Free tiles against a wall (not a door), inside the room. */
    wallRow(r) {
      return this.free(r).filter(([x, y]) => ORTHO.some(([ox, oy]) => this.base(x + ox, y + oy) === '#'));
    }
    /** Wall tiles a wall-mounted item can hang on, facing into the room: [{ x, y, face, ix, iy }]. */
    wallSpots(r) {
      if (r.shape) return [];
      const [rx, ry, rw, rh] = r.rect;
      const out = [];
      const add = (x, y, ix, iy, face) => {
        if (this.base(x, y) !== '#' || this.floor.objs[K(x, y)]) return;
        if (this.base(ix, iy) !== '.') return;
        if (this.isSolid(this.floor.objs[K(ix, iy)])) return;
        // not right beside a doorway along the wall
        const along = face === 'n' || face === 's' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
        if (along.some(([ax, ay]) => this.base(x + ax, y + ay) === '+')) return;
        out.push({ x, y, face, ix, iy });
      };
      for (let x = rx; x < rx + rw; x++) {
        add(x, ry - 1, x, ry, 's');
        add(x, ry + rh, x, ry + rh - 1, 'n');
      }
      for (let y = ry; y < ry + rh; y++) {
        add(rx - 1, y, rx, y, 'e');
        add(rx + rw, y, rx + rw - 1, y, 'w');
      }
      return out;
    }
    isSolid(o) {
      if (!o) return false;
      if (o.solid != null) return !!o.solid;
      const reg = this.plan.registry;
      return !!(o.item && reg && reg.items[o.item] && reg.items[o.item].solid);
    }
    isInteractive(o) {
      if (!o || o.start) return false;
      if (o.container) return true;
      const reg = this.plan.registry;
      return !!(o.item && reg && reg.items[o.item] && reg.items[o.item].interact);
    }
    /** Open tiles beside (x, y) a player can stand on, not counting `except`. */
    freeSides(x, y, except) {
      let n = 0;
      for (const [ox, oy] of ORTHO) {
        const nx = x + ox, ny = y + oy;
        if (except && nx === except[0] && ny === except[1]) continue;
        if (!this.open(nx, ny)) continue;
        if (this.isSolid(this.floor.objs[K(nx, ny)])) continue;
        n++;
      }
      return n;
    }
    /** May a solid thing stand at (x, y) without walling in something people need to use? */
    canBlock(x, y, entry) {
      if (this.isInteractive(entry) && this.freeSides(x, y) < 1) return false;
      for (const [ox, oy] of ORTHO) {
        const o = this.floor.objs[K(x + ox, y + oy)];
        if (this.isInteractive(o) && this.freeSides(x + ox, y + oy, [x, y]) < 1) return false;
      }
      return true;
    }
    /** The open tiles just inside a room's doorways: where a player steps in. */
    doorApproaches(r) {
      const out = [];
      for (const [dx, dy] of this.doorsOf(r)) {
        if (this.base(dx, dy) !== '+') continue;
        for (const [ox, oy] of ORTHO) {
          const x = dx + ox, y = dy + oy, c = this.base(x, y);
          if ((c === '.' || c === ',') && G.inRoom(r, x, y, 0)) out.push([x, y]);
        }
      }
      return out;
    }
    /** How much of a room a player stepping in at a doorway can't walk to without leaving it: its open tiles out of
     *  reach, and (counting far more) doorways whose first step in is blocked or that the room's furniture cuts off
     *  from its other doorways. `block`: tiles to treat as solid. */
    cutOff(r, block) {
      const seeds = this.doorApproaches(r);
      if (!seeds.length) return 0;
      const open = new Set();
      for (const [x, y] of G.roomCells(r, 0)) {
        const c = this.base(x, y), k = K(x, y);
        if ((c === '.' || c === ',') && !this.isSolid(this.floor.objs[k]) && !(block && block.has(k))) open.add(k);
      }
      const seen = new Set(), q = [];
      let n = 0;
      for (const [x, y] of seeds) {
        const k = K(x, y);
        if (!open.has(k)) n += 1000;
        else if (!q.length) {
          seen.add(k);
          q.push([x, y]);
        }
      }
      while (q.length) {
        const [x, y] = q.pop();
        for (const [ox, oy] of ORTHO) {
          const k = K(x + ox, y + oy);
          if (open.has(k) && !seen.has(k)) {
            seen.add(k);
            q.push([x + ox, y + oy]);
          }
        }
      }
      for (const [x, y] of seeds) if (open.has(K(x, y)) && !seen.has(K(x, y))) n += 1000;
      return n + open.size - seen.size;
    }
    /** Would solid things on these tiles block a doorway of room r, or cut part of the room off from its doors? */
    splits(r, tiles) {
      if (!r) return false;
      const block = new Set(tiles.map(([x, y]) => K(x, y)));
      return this.cutOff(r, block) > this.cutOff(r, null);
    }
    /** Place an object. A solid one is refused (null) if it would stand where a player steps in at a doorway, cut
     *  part of its room off from the doors, or wall in an interactive neighbour. */
    put(x, y, entry, force) {
      if (entry.solid == null && !entry.start) entry.solid = this.isSolid(entry);
      // a piece bigger than a tile needs all of its tiles free, in the same room
      const [fw, fh] = entry.item ? G.footprint(this.plan.registry, entry.item, entry.props) : [1, 1];
      const extra = [];
      const r = this.roomAt(x, y);
      if (fw > 1 || fh > 1) {
        for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
          if (!i && !j) continue;
          const cx = x + i, cy = y + j;
          if (this.base(cx, cy) !== '.' || this.taken(cx, cy) || this.roomAt(cx, cy) !== r || (r && !G.inRoom(r, cx, cy))) return null;
          extra.push([cx, cy]);
        }
      }
      if (entry.solid && !force) {
        const all = [[x, y]].concat(extra);
        // the tiles inside every doorway (and a work space, and the front of a wall fixture) stay clear
        if (all.some(([cx, cy]) => this.reserved.has(K(cx, cy)))) return null;
        if (!this.canBlock(x, y, entry)) return null;
        if (extra.some(([cx, cy]) => !this.canBlock(cx, cy, {}))) return null;
        // and nothing solid shuts a doorway or splits a room: every open tile stays walkable from every door
        if (this.open(x, y) && this.splits(r, all)) return null;
      }
      this.floor.objs[K(x, y)] = entry;
      if (extra.length) {
        // the other tiles hold a marker pointing at the piece (emit leaves them empty)
        entry.covers = extra.map(([cx, cy]) => K(cx, cy));
        for (const [cx, cy] of extra) this.floor.objs[K(cx, cy)] = { cover: K(x, y), solid: !!entry.solid };
      }
      // a wall-mounted thing to use keeps the tile in front of it clear
      const reg = this.plan.registry;
      if (entry.item && entry.props && entry.props.face && reg && reg.items[entry.item] && reg.items[entry.item].wallMounted) {
        const [fx, fy] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[entry.props.face] || [0, 0];
        this.reserved.add(K(x + fx, y + fy));
      }
      return entry;
    }
    /** Try cells in turn until one takes the object; returns [x, y] or null. */
    putFirst(cells, make) {
      for (const [x, y] of cells) if (this.put(x, y, make(x, y))) return [x, y];
      return null;
    }
    /** Take a placed object (and the tiles it covers) off the map; returns its tile or null. */
    lift(entry) {
      const k = Object.keys(this.floor.objs).find((q) => this.floor.objs[q] === entry);
      if (!k) return null;
      for (const c of entry.covers || []) delete this.floor.objs[c];
      delete entry.covers;
      delete this.floor.objs[k];
      return k.split(',').map(Number);
    }
    /** Turn a placed piece (props.turn). A piece that lies differently turned is put down again, and keeps the way
     *  it faced if it wouldn't fit turned (it may not cover a doorway or split a room). Returns its turn. */
    turn(entry, turn) {
      const reg = this.plan.registry, p = entry.props || (entry.props = {});
      const before = G.footprint(reg, entry.item, p), old = p.turn;
      const after = G.footprint(reg, entry.item, Object.assign({}, p, { turn }));
      if (before[0] === after[0] && before[1] === after[1]) {
        p.turn = turn;
        return turn;
      }
      const at = this.lift(entry);
      if (!at) return old;
      p.turn = turn;
      if (this.put(at[0], at[1], entry)) return turn;
      if (old == null) delete p.turn;
      else p.turn = old;
      this.put(at[0], at[1], entry, true);
      return old;
    }
    tile(x, y, entry) {
      this.floor.tiles[K(x, y)] = Object.assign({}, this.floor.tiles[K(x, y)] || {}, entry);
      return this.floor.tiles[K(x, y)];
    }
    /** A text slot: stage 10 fills `pool` (with vars) into the target. */
    slot(id, pool, target, vars) {
      this.floor.slots.push({ id: 'f' + this.floor.n + '.' + id, pool, target, vars: vars || {} });
      return 'f' + this.floor.n + '.' + id;
    }
    near(list, x, y) {
      return list.slice().sort((a, b) => Math.abs(a[0] - x) + Math.abs(a[1] - y) - (Math.abs(b[0] - x) + Math.abs(b[1] - y)));
    }
  }
  G.Painter = Painter;
  G.placeFixtureIn = (P, rng, r, f) => placeFixture(P, rng, r, f);
  G.putCache = (P, rng, r, props, kinds) => putCache(P, rng, r, props, kinds);

  const lookOf = (lib, floor) => lib.looks[floor.look] || {};
  const tierInfo = (lib, tier) => ((lib.settings.tierInfo || {})[tier]) || { name: G.titleCase(tier) + ' card', color: '#e8a23a' };
  const tlOf = (plan, floor) => (floor && floor.tl) || plan.brief.tl;
  G.tlOf = tlOf;
  const hackDiff = (plan, lib, rank, floor) => G.clamp((lib.settings.hackBase || 6) + tlOf(plan, floor) - 1 + (rank || 0), 5, 14);
  /** A per-Threat-Level budget; past the table's last level each level is worth 1.4 times the one before. */
  G.perTl = function (table, tl, dflt) {
    if (table && table[tl] != null) return table[tl];
    const top = Math.max(...Object.keys(table || {}).map(Number));
    return isFinite(top) && tl > top ? Math.round(table[top] * Math.pow(1.4, tl - top)) : dflt;
  };

  /** Put a container (hn-cache) on a free wall-row tile of a room. */
  function putCache(P, rng, r, props, kinds) {
    const t = P.lib.rooms[r.template] || {};
    const kind = props.kind || rng.pick(G.asList(kinds || t.containers || ['locker', 'desk', 'shelf']));
    const spots = P.wallRow(r);
    const cand = rng.shuffle(spots.length ? spots : P.free(r)).concat(rng.shuffle(P.free(r)));
    let e = null, x, y;
    for ([x, y] of cand) {
      const p = Object.assign({ kind, uid: P.plan.slug + '-f' + P.floor.n + '-' + r.id + '-' + x + '-' + y, loot: [] }, props);
      p.kind = kind;
      e = P.put(x, y, { item: 'hn-cache', props: p, room: r.i, container: true, solid: true });
      if (e) break;
    }
    if (!e) return null;
    P.slot('c' + x + '-' + y + '.name', 'containers.' + kind + '.name', { obj: K(x, y), prop: 'name' });
    P.slot('c' + x + '-' + y + '.text', 'containers.' + kind + '.text', { obj: K(x, y), prop: 'text' });
    return e;
  }

  // ------------------------------------------------------------ stage 5: access, fixtures, items of interest
  G.stageAccess = function (plan, lib) {
    const nF = plan.floors.length;
    const type = G.typeOf(lib, plan.brief.type);
    for (const floor of plan.floors) {
      floor.tiles = {};
      floor.objs = {};
      floor.traps = [];
      floor.slots = [];
      floor.reserved = [];
      const P = new Painter(plan, lib, floor);
      P.reserveDoors();
      const rng = G.srng(plan, 'access', 'f' + floor.n);
      const rooms = floor.rooms;
      const entry = rooms[0];
      const exit = rooms[floor.path[floor.path.length - 1]];
      const look = lookOf(lib, floor);
      // the way in
      const [ex, ey, ew, eh] = entry.rect;
      const doorsOf = (r) => floor.edges.filter((e) => e.a === r.i || e.b === r.i).flatMap((e) => e.doors);
      const farFromDoors = (r, cells) => {
        const ds = doorsOf(r);
        return cells.slice().sort((a, b) => {
          const da = Math.min(...ds.map((d) => Math.abs(d[0] - a[0]) + Math.abs(d[1] - a[1])), 99);
          const db = Math.min(...ds.map((d) => Math.abs(d[0] - b[0]) + Math.abs(d[1] - b[1])), 99);
          return db - da || a[1] - b[1] || a[0] - b[0];
        });
      };
      if (floor.n === 1) {
        // the start in the middle of the bottom of the vestibule, the way out under it
        const sx = ex + Math.floor(ew / 2), sy = ey + eh - 2;
        P.put(sx, sy, { start: true });
        P.put(sx, sy + 1, { item: 'hn-exit', props: { prompt: 'Leave for the near-area map' } });
        for (const [ox, oy] of ORTHO) P.reserved.add(K(sx + ox, sy + oy));
        floor.startAt = [sx, sy];
      } else {
        const [sx, sy] = farFromDoors(entry, P.wallRow(entry))[0] || P.free(entry)[0];
        P.tile(sx, sy, { terrain: 'entry' });
        for (const [ox, oy] of ORTHO) P.reserved.add(K(sx + ox, sy + oy));
        floor.startAt = [sx, sy];
      }
      // the way on: stairs in the exit room (not on the last floor)
      if (floor.n < nF) {
        const [sx, sy] = farFromDoors(exit, P.wallRow(exit))[0] || P.free(exit)[0];
        floor.stairsTag = G.tagName(plan.slug, 'f' + floor.n + '_on');
        P.tile(sx, sy, { terrain: 'exit', tag: floor.stairsTag });
        for (const [ox, oy] of ORTHO) P.reserved.add(K(sx + ox, sy + oy));
        floor.exitAt = [sx, sy];
      }
      // locks: the door on the near (parent) side, its panel beside it facing the near room
      for (const L of plan.locks.filter((l) => l.floor === floor.n)) {
        const ti = tierInfo(lib, L.tier);
        if (L.stairs) {
          L.needText = ti.name;
          continue;
        }
        const e = floor.edges[L.edge];
        const [dx, dy] = e.doors[0];
        const near = rooms[L.from];
        const def = lib.locks[L.kind] || {};
        let entryT;
        const color = L.kind === 'keycard' ? ti.color : def.color || '#ff5a3a';
        if (L.kind === 'mech') entryT = { terrain: 'door-' + L.color };
        else {
          const flags = [L.flag, L.hackFlag].filter(Boolean).filter((f, i, a) => a.indexOf(f) === i);
          const need = L.kind === 'keycard' ? ti.name : (lib.locks[L.kind] || {}).need || 'clearance';
          entryT = { terrain: look.doorTerrain || 'door', props: { flag: flags, need: need + (L.hackFlag && L.kind !== 'hack' ? ' (or hack the panel)' : ''), color } };
          L.needText = need;
        }
        P.tile(dx, dy, entryT);
        L.doorAt = [dx, dy];
        if (L.hackFlag) {
          // the wall tile beside the door, on the near room's side
          const horiz = P.base(dx - 1, dy) === '#' && P.base(dx + 1, dy) === '#';
          const along = horiz ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
          const [nx, ny] = near.rect;
          let face;
          if (horiz) face = dy < ny ? 's' : 'n';
          else face = dx < nx ? 'e' : 'w';
          const inward = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[face];
          let spot = null;
          for (const [ax, ay] of rng.shuffle(along)) {
            const x = dx + ax, y = dy + ay;
            if (P.base(x, y) === '#' && !P.floor.objs[K(x, y)] && P.open(x + inward[0], y + inward[1])) {
              spot = [x, y];
              break;
            }
          }
          if (spot) {
            // a panel that is the only way through must be beatable by anyone who keeps trying (d10: 10 or less)
            let diff = hackDiff(plan, lib, rooms[L.to].rank, floor);
            if ((L.kind === 'hack' || def.panelItem) && L.critical) diff = Math.min(diff, 9);
            if (def.panelItem) {
              // a lock with its own panel (the Mental Hygiene checkpoint): it sets the lock's flag, or its hack flag
              P.put(spot[0], spot[1], { item: def.panelItem, props: { face, flag: L.flag, hackFlag: L.hackFlag, difficulty: diff }, keep: true });
              continue;
            }
            const p = { face, flag: L.hackFlag, title: def.panelTitle || 'security door', difficulty: diff, fail: rng.chance(0.5) ? 'alarm' : 'shock' };
            if (L.kind !== 'hack' && L.flag && L.keyKind !== 'switch' && L.keyKind !== 'power') {
              p.cardFlag = L.flag;
              p.cardName = L.kind === 'keycard' ? 'The ' + ti.name : 'The ID badge';
            }
            P.put(spot[0], spot[1], { item: 'hn-sec-panel', props: p });
            P.slot('lock' + L.id + '.panel', 'panels.' + L.kind, { obj: K(spot[0], spot[1]), prop: 'text' }, { need: L.needText });
          } else if (def.panelItem) {
            // no wall beside the door: the checkpoint stands in the room in front of it
            const at = P.putFirst(rng.shuffle(P.wallRow(near)).concat(rng.shuffle(P.free(near))), () => ({ item: 'hn-terminal', props: { action: 'hygiene', title: def.panelTitle, flag: L.flag, hackFlag: L.hackFlag, difficulty: Math.min(hackDiff(plan, lib, rooms[L.to].rank, floor), 9) }, room: near.i, keep: true }));
            if (!at) throw new Error('Floor ' + floor.n + ': no room for the ' + def.panelTitle + ' by ' + L.id + '.');
          } else if (L.kind === 'hack') {
            // no wall for a panel: the door opens for a switch instead, so it can still be passed
            plan.report.problems.push(G.problem('warn', 'Floor ' + floor.n + ': no wall beside the ' + L.id + ' door for a panel.'));
          }
        }
      }
      // keys, switches and clues
      for (const L of plan.locks.filter((l) => l.floor === floor.n)) {
        if (L.keyRoom == null) continue;
        const r = rooms[L.keyRoom];
        const ti = tierInfo(lib, L.tier);
        if (L.keyKind === 'card' || L.keyKind === 'badge') {
          const id = L.keyKind === 'card' ? G.flagName(plan.slug, L.tier) : G.flagName(plan.slug, 'badge');
          const info = L.keyKind === 'card' ? { name: ti.name, color: ti.color, flag: L.flag } : { name: 'ID badge', color: '#5ab8e8', flag: L.flag };
          const props = { loot: [{ type: 'keyItem', id, info }] };
          if (L.code) Object.assign(props, { kind: 'locker', code: L.code, codeFlag: L.codeFlag, hackDiff: hackDiff(plan, lib, r.rank + 1, floor) });
          const kinds = (lib.keys[L.keyKind] || {}).containers;
          const c = putCache(P, rng, r, props, L.code ? ['locker', 'safe'] : kinds);
          if (!c) throw new Error('Floor ' + floor.n + ': no room for the ' + info.name + ' in ' + r.template);
          L.keyAt = Object.keys(floor.objs).find((k) => floor.objs[k] === c);
          P.slot('key' + L.id + '.text', L.keyKind === 'card' ? 'keys.card' : 'keys.badge', { loot: L.keyAt, prop: 'text' }, { card: info.name, opens: L.stairs ? 'the stairs on' : L.goal ? 'the way to ' + plan.concept.goal.target : 'the ' + (lib.zones[rooms[L.to] ? rooms[L.to].zone : ''] || {}).name });
          if (L.code) {
            const cr = rooms[L.clueRoom];
            const spots = P.free(cr).filter(([x, y]) => ORTHO.some(([ox, oy]) => P.base(x + ox, y + oy) === '#'));
            const at = P.putFirst(rng.shuffle(spots).concat(rng.shuffle(P.free(cr))), () => ({ item: 'hn-memo', props: { flag: L.codeFlag }, room: cr.i, keep: true }));
            if (!at) throw new Error('Floor ' + floor.n + ': no room for a memo in ' + cr.template);
            const [mx, my] = at;
            const v = { code: L.code, container: (P.lib.text.containers || {})[props.kind || 'locker'] ? props.kind || 'locker' : 'locker', room: '{room:' + r.i + '}' };
            P.slot('memo' + L.id + '.title', 'memos.title', { obj: K(mx, my), prop: 'title' }, v);
            P.slot('memo' + L.id + '.text', 'memos.code', { obj: K(mx, my), prop: 'text' }, v);
            P.slot('memo' + L.id + '.clue', 'memos.clue', { obj: K(mx, my), prop: 'clue' }, v);
          }
        } else if (L.keyKind === 'switch' && (lib.locks[L.kind] || {}).keyItem === 'eliza') {
          // the Mental Hygiene door's key: an ELIZA terminal to be scored at (the score itself is 'tetrad')
          const at = P.putFirst(rng.shuffle(P.wallRow(r)).concat(rng.shuffle(P.free(r))), () => ({ item: 'hn-terminal', props: { action: 'eliza', title: 'ELIZA terminal', gives: 'tetrad' }, room: r.i, keep: true }));
          if (!at) throw new Error('Floor ' + floor.n + ': no room for an ELIZA terminal in ' + r.template);
        } else if (L.keyKind === 'switch' || L.keyKind === 'power') {
          const spots = P.wallRow(r);
          const at = P.putFirst(rng.shuffle(spots).concat(rng.shuffle(P.free(r))), () => ({ item: 'hn-terminal', props: { flag: L.flag, title: L.keyKind === 'power' ? 'breaker panel' : 'door release' }, room: r.i, keep: true }));
          if (!at) throw new Error('Floor ' + floor.n + ': no room for a door release in ' + r.template);
          const [tx, ty] = at;
          P.slot('sw' + L.id + '.text', 'terminals.' + L.keyKind, { obj: K(tx, ty), prop: 'text' }, { need: L.needText });
          P.slot('sw' + L.id + '.done', 'terminals.' + L.keyKind + 'Done', { obj: K(tx, ty), prop: 'doneText' });
        } else if (L.keyKind === 'mech') {
          const [kx, ky] = rng.pick(P.free(r)) || [];
          if (kx == null) throw new Error('Floor ' + floor.n + ': no room for a key in ' + r.template);
          P.put(kx, ky, { item: 'key', props: { color: L.color } });
        }
      }
      // the goal: what finishing the installation means, in its last room
      if (floor.n === nF) {
        const g = exit;
        const kind = plan.concept.goal.kind;
        plan.doneFlag = G.flagName(plan.slug, 'done');
        if (kind === 'shut-down') {
          const spots = P.wallRow(g);
          const at = P.putFirst(rng.shuffle(spots).concat(rng.shuffle(P.free(g))), () => ({ item: 'hn-terminal', props: { flag: plan.doneFlag }, room: g.i, solid: true, keep: true, goal: true }));
          if (!at) throw new Error('No room for the goal terminal in ' + g.template);
          const [tx, ty] = at;
          P.slot('goal.title', 'goalFixtures.shut-down.title', { obj: K(tx, ty), prop: 'title' });
          P.slot('goal.text', 'goalFixtures.shut-down.text', { obj: K(tx, ty), prop: 'text' });
          P.slot('goal.done', 'goalFixtures.shut-down.done', { obj: K(tx, ty), prop: 'doneText' });
        } else {
          const c = putCache(P, rng, g, { kind: kind === 'recover' ? 'case' : 'safe', flag: plan.doneFlag }, kind === 'recover' ? ['case'] : ['safe']);
          if (!c) throw new Error('No room for the goal in ' + g.template);
          c.goal = true;
          c.keep = true;
          const k = Object.keys(floor.objs).find((q) => floor.objs[q] === c);
          floor.slots = floor.slots.filter((sl) => !(sl.target && sl.target.obj === k));
          P.slot('goal.name', 'goalFixtures.' + kind + '.name', { obj: k, prop: 'name' });
          P.slot('goal.text', 'goalFixtures.' + kind + '.text', { obj: k, prop: 'text' });
        }
      }
      // the rooms' own fixtures (a functional room's come from its library room type)
      for (const r of rooms) {
        const t = lib.rooms[r.template] || {};
        if (r.fn) {
          G.placeFunctionFurniture(P, rng, r, plan, lib);
          continue;
        }
        for (const f of t.fixtures || []) placeFixture(P, rng, r, f);
      }
      // items of interest at pacing points: a help desk early, health where it's needed, a vending machine
      const size = plan.brief.size || 'standard';
      const hs = ((lib.budgets.healthStations || {})[size]) || [1, 1];
      const nHealth = rng.int(hs[0], hs[1]) + (floor.role === 'goal' || floor.role === 'only' ? 1 : 0);
      const mid = rooms.filter((r) => !r.isEntry && !r.opt);
      const byDepth = mid.slice().sort((a, b) => b.region - a.region || b.depth - a.depth);
      for (let i = 0; i < nHealth && byDepth.length; i++) {
        const r = byDepth[Math.min(byDepth.length - 1, Math.floor((i + 0.6) * byDepth.length / (nHealth + 0.5)))];
        const spot = rng.pick(P.wallSpots(r));
        if (spot) P.put(spot.x, spot.y, { item: 'hn-health-station', props: { face: spot.face, charge: rng.int(40, 60) } });
      }
      if (rng.chance(type.kioskChance == null ? 0.7 : type.kioskChance) && lib.interest.kiosk) {
        const early = rooms.filter((r) => r.region === 0 && !r.opt && !r.shape);
        const r = rng.pick(early.filter((x) => !x.isEntry).concat(floor.n === 1 ? [] : [entry])) || entry;
        const [kx, ky] = rng.pick(P.free(r, 1.2).filter(([x, y]) => !ORTHO.some(([ox, oy]) => P.base(x + ox, y + oy) === '#'))) || [];
        if (kx != null) {
          P.put(kx, ky, { item: 'hn-kiosk', props: {} });
          P.slot('kiosk.text', 'kiosk.' + (type.backstory || 'war'), { obj: K(kx, ky), prop: 'text' });
        }
      }
      floor.reserved = [...P.reserved];
    }
  };

  /** One fixture rule from a room template or a dressing pool. Returns how many it placed. */
  function placeFixture(P, rng, r, f) {
    if (f.chance != null && !rng.chance(f.chance)) return 0;
    const reg = P.plan.registry;
    if (reg && !reg.items[f.item]) return 0;
    const n = f.count ? rng.range(f.count) : f.density ? Math.max(0, Math.round(G.roomCells(r).length * f.density + rng.real(-0.5, 0.5))) : 1;
    let placed = 0;
    for (let i = 0; i < n; i++) {
      const props = G.clone(f.props || {});
      let spot = null;
      const wm = reg ? reg.items[f.item].wallMounted : f.place === 'wall';
      if (wm || f.place === 'wall') {
        const s = rng.pick(P.wallSpots(r));
        if (!s) break;
        props.face = s.face;
        spot = [s.x, s.y];
      } else {
        let cells;
        if (f.place === 'wall-row') cells = P.wallRow(r);
        else if (f.place === 'center') {
          const [rx, ry, rw, rh] = r.rect;
          cells = P.near(P.free(r, 1.2), rx + Math.floor(rw / 2), ry + Math.floor(rh / 2)).slice(0, 3);
        } else if (f.place === 'focal') cells = P.focal(r).slice(0, 4);
        else if (f.place === 'corner') cells = P.wallRow(r).filter(([x, y]) => ORTHO.filter(([ox, oy]) => P.base(x + ox, y + oy) === '#').length >= 2);
        else if (f.place === 'middle') cells = P.free(r, 1.2).filter(([x, y]) => !ORTHO.some(([ox, oy]) => P.base(x + ox, y + oy) === '#'));
        else if (f.place === 'grid') {
          // desks in rows with aisles between: every third tile, chairs fit on the tile south
          const [rx, ry] = r.rect;
          cells = P.free(r, 1.2).filter(([x, y]) => (x - rx) % 3 === 1 && (y - ry) % 3 === 1 && !ORTHO.some(([ox, oy]) => P.base(x + ox, y + oy) === '#'));
        }
        else cells = P.free(r);
        if (!cells.length) break;
        const [fw, fh] = G.footprint(reg, f.item, props);
        if (fw > 1 || fh > 1) {
          // a big piece: try spots in turn, centred on the chosen tile; along a wall it runs along the north or south wall
          let along = null;
          if (f.place === 'wall-row' && fh === 1) along = cells.filter(([cx, cy]) => P.base(cx, cy - 1) === '#' || P.base(cx, cy + 1) === '#');
          const tries = rng.shuffle(along || cells).slice(0, 16);
          let e = null, at = null;
          for (const [cx, cy] of tries) {
            const ax = along ? cx : cx - Math.floor((fw - 1) / 2), ay = along ? cy : cy - Math.floor((fh - 1) / 2);
            if (P.taken(ax, ay) || P.base(ax, ay) !== '.') continue;
            const pr = G.clone(props);
            if (along) pr.dir = P.base(ax, ay - 1) === '#' ? 's' : 'n';
            e = P.put(ax, ay, { item: f.item, props: pr, room: r.i, solid: f.solid === false ? false : undefined });
            if (e) {
              at = [ax, ay];
              break;
            }
          }
          if (!e) continue;
          if (f.say) P.slot('o' + at[0] + '-' + at[1], f.say, { obj: K(at[0], at[1]), prop: f.prop || 'text' });
          placed++;
          continue;
        }
        spot = rng.pick(cells);
      }
      const [x, y] = spot;
      const e = P.put(x, y, { item: f.item, props, room: r.i, solid: f.solid === false ? false : undefined });
      if (!e) continue;
      if (f.say) P.slot('o' + x + '-' + y, f.say, { obj: K(x, y), prop: f.prop || 'text' });
      if (f.container) {
        e.container = true;
        e.props.uid = P.plan.slug + '-f' + P.floor.n + '-' + r.id + '-' + x + '-' + y;
        e.props.loot = e.props.loot || [];
        P.slot('c' + x + '-' + y + '.name', 'containers.' + (props.kind || 'locker') + '.name', { obj: K(x, y), prop: 'name' });
        P.slot('c' + x + '-' + y + '.text', 'containers.' + (props.kind || 'locker') + '.text', { obj: K(x, y), prop: 'text' });
      }
      // a desk gets its chair on the side away from the wall
      for (const w of f.with || []) {
        const [ox, oy] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[w.side || 's'];
        if (P.base(x + ox, y + oy) === '.' && !P.taken(x + ox, y + oy) && G.inRoom(r, x + ox, y + oy)) P.put(x + ox, y + oy, { item: w.item, props: G.clone(w.props || {}), room: r.i, solid: !!(reg && reg.items[w.item] && reg.items[w.item].solid) });
      }
      placed++;
    }
    return placed;
  }
  G.placeFixture = placeFixture;

  // ------------------------------------------------------------ stage 6: encounters
  /** Monsters a type can field at this Threat Level. Above a monster's own range (up to 3 levels) it still
   *  comes, toughened: more hit points (hpMul), and it costs more of the budget. */
  const toughen = (m, tl) => (m.tl && tl > m.tl[1] ? 1 + 0.35 * (tl - m.tl[1]) : 1);
  G.toughen = toughen;
  function monsterCands(plan, lib, filter, floor) {
    const type = G.typeOf(lib, plan.brief.type);
    const kinds = type.encounters || {};
    const tl = tlOf(plan, floor);
    return G.sorted(lib.monsters)
      .filter(([id, m]) => (m.status || 'built') === 'built' && !m.roomOnly && (!m.tl || (tl >= m.tl[0] && tl <= m.tl[1] + (m.boss ? 0 : 3))))
      .filter(([id, m]) => kinds[m.kind] && (!filter || filter(id, m)))
      .map(([id, m]) => [id, (m.weight || 1) * kinds[m.kind] * (toughen(m, tl) > 1 ? 0.6 : 1)]);
  }
  const costOf = (m, tl) => Math.round(m.cost * toughen(m, tl));
  const enemyProps = (m, tl) => (toughen(m, tl) > 1 ? { hpMul: Math.round(toughen(m, tl) * 100) / 100 } : {});
  function placeEnemies(P, rng, r, id, n, avoid) {
    const m = P.lib.monsters[id];
    const eid = m.id || id;
    let cells = P.free(r, 1).filter(([x, y]) => !avoid || Math.abs(x - avoid[0]) + Math.abs(y - avoid[1]) > 5);
    let placed = 0;
    for (let i = 0; i < n && cells.length; i++) {
      const c = rng.pick(cells);
      cells = cells.filter((q) => q !== c);
      P.put(c[0], c[1], { enemy: eid, props: enemyProps(m, tlOf(P.plan, P.floor)), room: r.i, cost: costOf(m, tlOf(P.plan, P.floor)), lib: id });
      placed++;
    }
    return placed;
  }

  /** A room's own monsters: gd.ids (any the floor's Threat Level allows), or a kind and roles with a cost range. */
  function guardCands(plan, lib, floor, gd) {
    const tl = tlOf(plan, floor);
    const fits = (m) => (m.status || 'built') === 'built' && !m.boss && (!m.tl || (tl >= m.tl[0] && tl <= m.tl[1] + 3)) && (!gd.cost || (m.cost >= gd.cost[0] && m.cost <= gd.cost[1]));
    if (gd.ids) return gd.ids.filter((id) => lib.monsters[id] && fits(lib.monsters[id])).map((id) => [id, lib.monsters[id].weight || 1]);
    return G.sorted(lib.monsters).filter(([id, m]) => fits(m) && (!gd.kind || m.kind === gd.kind) && (!gd.roles || G.overlap(m.roles, gd.roles)) && (!gd.placement || G.overlap(m.placement, gd.placement))).map(([id, m]) => [id, m.weight || 1]);
  }

  G.stageEncounters = function (plan, lib) {
    const B = lib.budgets;
    const size = plan.brief.size || 'standard';
    for (const floor of plan.floors) {
      const tl = tlOf(plan, floor);
      const P = new Painter(plan, lib, floor);
      const rng = G.srng(plan, 'encounters', 'f' + floor.n);
      const rooms = floor.rooms;
      const budget = Math.round(G.perTl(B.monstersPerFloor, tl, 28) * ((B.sizeMul || {})[size] || 1));
      let spent = 0;
      const pieces = [];
      const last = floor.role === 'goal' || floor.role === 'only';
      // the boss, with its escort, guarding the goal (in the room before it when that room is big enough)
      if (last && plan.concept.boss) {
        const goal = rooms[floor.path[floor.path.length - 1]];
        const before = rooms[floor.path[floor.path.length - 2]];
        const r = before && !before.isEntry && G.roomCells(before, 1).length >= 30 ? before : goal;
        const bm = lib.monsters[plan.concept.boss.monster];
        const cells = P.near(P.free(r, 1.5), r.rect[0] + Math.floor(r.rect[2] / 2), r.rect[1] + Math.floor(r.rect[3] / 2));
        if (cells.length) {
          const [bx, by] = cells[0];
          P.put(bx, by, { enemy: plan.concept.boss.enemy, props: {}, room: r.i, cost: 0, boss: true, lib: plan.concept.boss.monster });
          for (const esc of bm.escort || []) if (lib.monsters[esc]) placeEnemies(P, rng, r, esc, rng.range(lib.monsters[esc].group || [1, 2]), null);
          pieces.push({ kind: 'boss', room: r.i });
          r.bossRoom = true;
        }
      }
      // rooms whose function comes with its own monsters (the armory's guard, the crypt's dead, the VIP room's dancers)
      for (const r of rooms) {
        const t = lib.rooms[r.template] || {};
        if (!t.guards || r.isEntry || r.bossRoom) continue;
        for (const gd of t.guards) {
          if (spent >= budget || (gd.chance != null && !rng.chance(gd.chance))) continue;
          const id = rng.weighted(guardCands(plan, lib, floor, gd));
          if (!id) continue;
          const m = lib.monsters[id];
          const got = placeEnemies(P, rng, r, id, rng.range(gd.count || m.group || [1, 1]), floor.startAt);
          if (got) {
            spent += got * costOf(m, tl);
            pieces.push({ kind: 'guard', room: r.i, cost: got * costOf(m, tl) });
          }
        }
      }
      // set pieces in the bigger rooms; never the way in
      const nPieces = rng.range(((B.setPieces || {})[size]) || [3, 4]);
      const candRooms = rng.shuffle(rooms.filter((r) => !r.isEntry && !r.bossRoom && G.roomCells(r).length >= 16));
      const enc = G.usable(lib, 'encounters', tl);
      for (const r of candRooms) {
        if (pieces.length >= nPieces + (last && plan.concept.boss ? 1 : 0) || spent >= budget) break;
        const t = lib.rooms[r.template] || {};
        if (t.slots && t.slots.encounter === 0) continue;
        const opts = enc.filter(([id, e]) => !e.rooms || e.rooms.includes(r.template) || G.overlap(e.roomTags, t.tags)).map(([id, e]) => [id, e.weight || 1]);
        const kind = rng.weighted(opts);
        if (!kind) continue;
        const done = runPiece(P, rng, plan, lib, floor, r, kind, budget - spent);
        if (done) {
          spent += done;
          pieces.push({ kind, room: r.i, cost: done });
        }
      }
      // attrition: small groups through the rest of the floor until the budget is spent
      const small = monsterCands(plan, lib, (id, m) => m.cost <= 3 && !m.boss && m.placement !== 'tube' && m.placement !== 'boss', floor);
      let guard = 0;
      while (spent < budget * 0.92 && small.length && guard++ < 40) {
        const id = rng.weighted(small);
        const m = lib.monsters[id];
        const rs = rooms.filter((r) => !r.isEntry && !(floor.n === 1 && r.region === 0 && r.depth < 2));
        const r = rng.pick(rs);
        if (!r) break;
        const n = Math.min(rng.range(m.group || [1, 2]), Math.max(1, Math.floor((budget - spent) / costOf(m, tl))));
        const got = placeEnemies(P, rng, r, id, n, floor.startAt);
        spent += got * costOf(m, tl);
        if (!got) continue;
      }
      floor.encounter = { budget, spent, pieces };
    }
  };

  /** One set piece in one room. Returns the budget it spent (0: didn't fit). */
  function runPiece(P, rng, plan, lib, floor, r, kind, left) {
    const e = lib.encounters[kind];
    const slug = plan.slug;
    const tagBase = G.tagName(slug, 'f' + floor.n + '_' + r.id);
    const pick = (filter) => rng.weighted(monsterCands(plan, lib, filter, floor));
    // what a piece costs at its smallest must fit what's left of the floor's budget (a little over is fine)
    const fits = (min) => min <= left * 1.2 + 1;
    if (e.compile === 'meeting' || e.compile === 'attrition') {
      const id = pick((id, m) => G.overlap(m.placement, e.placements || ['patrol', 'post']) && !m.boss && fits(costOf(m, tlOf(plan, floor))));
      if (!id) return 0;
      const m = lib.monsters[id];
      const c = costOf(m, tlOf(plan, floor));
      const n = Math.max(1, Math.min(rng.range(m.group || [2, 3]), Math.floor(left / c)));
      return placeEnemies(P, rng, r, id, n, floor.startAt) * c;
    }
    if (e.compile === 'vents') {
      const id = pick((id, m) => m.placement === 'vents' && fits(2 * m.cost));
      if (!id) return 0;
      const m = lib.monsters[id];
      const cells = rng.shuffle(P.free(r, 1));
      const nv = Math.min(cells.length, rng.int(2, 4));
      if (nv < 2) return 0;
      for (let i = 0; i < nv; i++) P.tile(cells[i][0], cells[i][1], { terrain: 'hn-vent', tag: 'roachSpawn' });
      const n = Math.max(2, Math.min(rng.range(m.group || [3, 6]), Math.floor(left / m.cost)));
      const zone = cells.slice(nv, nv + 6);
      for (const [x, y] of zone) P.tile(x, y, { tag: tagBase + '_amb' });
      if (!zone.length) return 0;
      floor.traps.push({ trigger: { type: 'zone', tag: tagBase + '_amb' }, once: true, effects: [{ type: 'message', text: '{say:ambush.vents}', kind: 'warn' }, { type: 'spawn', tag: 'roachSpawn', enemy: m.id || id, count: n, delay: 0.5 }], room: r.i, cost: n * m.cost });
      return n * m.cost;
    }
    if (e.compile === 'tubes') {
      const id = pick((id, m) => m.placement === 'tube' && fits(m.cost));
      if (!id) return 0;
      const m = lib.monsters[id];
      const spots = rng.shuffle(P.wallSpots(r)).slice(0, rng.int(2, 4));
      if (spots.length < 2) return 0;
      const n = Math.max(1, Math.min(spots.length, rng.range(m.group || [1, 2]), Math.floor(left / m.cost)));
      let spawnAt = 0;
      for (const s of spots) {
        if (!P.floor.objs[K(s.ix, s.iy)] && !P.floor.tiles[K(s.ix, s.iy)]) {
          P.tile(s.ix, s.iy, { tag: tagBase + '_tube' });
          spawnAt++;
        }
        P.put(s.x, s.y, { item: 'hn-stasis-tube', props: { face: s.face }, room: r.i });
      }
      if (!spawnAt) return 0;
      const zone = P.free(r, 1.5).filter(([x, y]) => !ORTHO.some(([ox, oy]) => P.base(x + ox, y + oy) === '#'));
      const band = rng.shuffle(zone).slice(0, 6);
      if (!band.length) return 0;
      for (const [x, y] of band) P.tile(x, y, { tag: tagBase + '_tz' });
      floor.traps.push({ trigger: { type: 'zone', tag: tagBase + '_tz' }, once: true, effects: [{ type: 'message', text: '{say:ambush.tubes}', kind: 'warn' }, { type: 'spawn', tag: tagBase + '_tube', enemy: m.id || id, count: n, delay: 0.6 }], room: r.i, cost: n * m.cost });
      return n * m.cost;
    }
    if (e.compile === 'waves') {
      // seal the room's doors and send two waves; the seal lifts when they're all dead (engine/traps.js)
      const doors = floor.edges.filter((x) => (x.a === r.i || x.b === r.i)).map((x) => x.k > 0 && x.b === r.i ? x.doors[1] : x.doors[0]);
      if (doors.some(([x, y]) => P.floor.tiles[K(x, y)] && P.floor.tiles[K(x, y)].tag)) return 0;
      const id = pick((id, m) => G.overlap(m.placement, ['patrol', 'swarm']) && m.cost <= 4 && !m.boss && fits(4 * m.cost));
      if (!id) return 0;
      const m = lib.monsters[id];
      const cells = rng.shuffle(P.free(r, 1)).slice(0, 4);
      if (cells.length < 2) return 0;
      for (const [x, y] of cells) P.tile(x, y, { tag: tagBase + '_ws' });
      for (const [x, y] of doors) P.tile(x, y, { tag: tagBase + '_wd' });
      const mid = P.near(P.free(r, 1.5), r.rect[0] + Math.floor(r.rect[2] / 2), r.rect[1] + Math.floor(r.rect[3] / 2)).slice(0, 4);
      if (!mid.length) return 0;
      for (const [x, y] of mid) P.tile(x, y, { tag: tagBase + '_wz' });
      const per = Math.max(2, Math.min(rng.range(m.group || [2, 4]), Math.floor(left / (2 * m.cost))));
      floor.traps.push({ trigger: { type: 'zone', tag: tagBase + '_wz' }, once: true, effects: [
        { type: 'seal', tag: tagBase + '_wd', text: '{say:ambush.seal}' },
        { type: 'spawn', tag: tagBase + '_ws', enemy: m.id || id, count: per, delay: 1.2 },
        { type: 'spawn', tag: tagBase + '_ws', enemy: m.id || id, count: per, delay: 7 },
      ], room: r.i, cost: 2 * per * m.cost, waves: true });
      return 2 * per * m.cost;
    }
    if (e.compile === 'sleeper') {
      const id = pick((id, m) => m.placement === 'sleep' || G.asList(m.roles).includes('sleeper'));
      if (!id) return 0;
      const m = lib.monsters[id];
      if (m.cost > left * 1.2) return 0;
      const cells = P.near(P.free(r, 1.5), r.rect[0] + Math.floor(r.rect[2] / 2), r.rect[1] + Math.floor(r.rect[3] / 2));
      if (!cells.length) return 0;
      P.put(cells[0][0], cells[0][1], { enemy: m.id || id, props: {}, room: r.i, cost: m.cost, lib: id });
      return m.cost;
    }
    if (e.compile === 'turrets') {
      const id = pick((id, m) => m.placement === 'post' && G.overlap(m.roles, ['guardian']) && fits(costOf(m, tlOf(plan, floor))));
      if (!id) return 0;
      const m = lib.monsters[id];
      const c = costOf(m, tlOf(plan, floor));
      const n = Math.max(1, Math.min(2, Math.floor(left / c)));
      return placeEnemies(P, rng, r, id, n, floor.startAt) * c;
    }
    if (e.compile === 'crate') {
      const spots = P.wallRow(r);
      if (!spots.length) return 0;
      const id = pick((id, m) => m.kind === 'robot' && !m.boss && m.placement !== 'post' && m.cost <= 6 && fits(m.cost));
      if (!id) return 0;
      const m = lib.monsters[id];
      const [x, y] = rng.pick(spots);
      P.put(x, y, { item: 'hn-crate', props: { contents: 'robots', enemy: m.id || id, count: 1 }, room: r.i, solid: true });
      P.slot('crate' + x + '-' + y, 'crates.label', { obj: K(x, y), prop: 'label' });
      return m.cost;
    }
    return 0;
  }

  // ------------------------------------------------------------ stage 7: traps
  G.stageTraps = function (plan, lib) {
    const B = lib.budgets;
    const size = plan.brief.size || 'standard';
    const scale = lib.settings.trapDamageScale || 0.75;
    for (const floor of plan.floors) {
      const tl = tlOf(plan, floor);
      const dmgRow = (B.trapDamage || {})[G.clamp(tl, 2, 6)] || [8, 12, 21, 31];
      const dmg = (leth) => Math.max(3, Math.round(dmgRow[['low', 'medium', 'high', 'lethal'].indexOf(leth)] * scale * (tl < 2 ? 0.8 : tl > 6 ? 1 + 0.15 * (tl - 6) : 1)));
      const P = new Painter(plan, lib, floor);
      const rng = G.srng(plan, 'traps', 'f' + floor.n);
      const n = rng.range((B.trapsPerFloor || {})[size] || [2, 3]);
      const offFlag = G.flagName(plan.slug, 'f' + floor.n + '_trapsoff');
      floor.trapsOff = offFlag;
      floor.containerTraps = 0;
      let made = 0, firstTrapRoom = null;
      const traps = G.usable(lib, 'traps', tl).map(([id, t]) => [id, t.weight || 1]);
      // a trap that can't be built on this floor isn't tried again; one trapped container a floor until nothing
      // else fits, so the traps people can see and play around aren't crowded out by the ones that always fit
      const cantBuild = new Set();
      let inContainers = 0;
      for (let guard = 0; made < n && guard < 30; guard++) {
        const left = traps.filter(([id]) => !cantBuild.has(id));
        const varied = left.filter(([id]) => !(lib.traps[id].build === 'container' && inContainers >= 1));
        const id = rng.weighted(varied.length ? varied : left);
        if (!id) break;
        const t = lib.traps[id];
        const before = floor.traps.length;
        const ok = buildTrap(P, rng, plan, lib, floor, id, t, dmg, offFlag);
        if (ok) {
          made++;
          // now and then a riddle terminal beside it, whose answer switches just this trap off
          const own = floor.traps.slice(before).filter((tr) => tr.gen === 'switch');
          if (own.length && ok.room != null && rng.chance(lib.settings.riddleChance || 0)) {
            const rr = floor.rooms[ok.room];
            const flag = G.flagName(plan.slug, 'f' + floor.n + '_riddle' + before);
            const at = P.putFirst(rng.shuffle(P.wallRow(rr)).concat(rng.shuffle(P.free(rr))), () => ({ item: 'hn-terminal', props: { action: 'riddle', title: 'riddle terminal', riddle: rng.int(0, 999), flag }, room: rr.i }));
            if (at) for (const tr of own) tr.off = flag;
          }
          if (t.build === 'container') inContainers++;
          if (firstTrapRoom == null && ok.room != null) firstTrapRoom = ok.room;
        } else cantBuild.add(id);
      }
      floor.trapCount = made;
      // a fixture whose flag is '$trapsOff' (the Security Center's console) switches this floor's traps off, if it has any
      const hasSwitch = floor.traps.some((tr) => tr.gen === 'switch');
      for (const o of Object.values(floor.objs)) if (o.props && o.props.flag === '$trapsOff') {
        if (hasSwitch) o.props.flag = offFlag;
        else delete o.props.flag;
      }
      // the off-switch: a facilities terminal past the first switchable trap (Vol 2: on the far side)
      if (floor.traps.some((t) => t.gen === 'switch')) {
        const rooms = floor.rooms;
        const from = firstTrapRoom != null ? rooms[firstTrapRoom] : rooms[0];
        const cands = rooms.filter((r) => !r.opt && r.region >= from.region && r !== rooms[0] && r.i !== from.i);
        const r = rng.pick(cands.length ? cands : [from]);
        const spots = P.wallRow(r);
        const [x, y] = rng.pick(spots.length ? spots : P.free(r)) || [];
        if (x != null) {
          P.put(x, y, { item: 'hn-terminal', props: { flag: offFlag, title: 'facilities terminal', difficulty: rng.chance(0.5) ? hackDiff(plan, lib, r.rank, floor) : 0 } });
          P.slot('trapsoff.text', 'terminals.traps', { obj: K(x, y), prop: 'text' });
          P.slot('trapsoff.done', 'terminals.trapsDone', { obj: K(x, y), prop: 'doneText' });
          P.slot('trapsoff.ok', 'terminals.trapsOk', { obj: K(x, y), prop: 'successText' });
        }
      }
    }
  };

  function corridorRuns(P, floor) {
    // straight corridor stretches at least 3 long with a wall either side
    const out = [];
    for (const e of floor.edges) {
      if (!e.cells || e.k < 3) continue;
      out.push({ edge: e, cells: e.cells, side: e.side, width: e.width || 1 });
    }
    return out;
  }

  function buildTrap(P, rng, plan, lib, floor, id, t, dmg, offFlag) {
    const tag = G.tagName(plan.slug, 'f' + floor.n + '_t' + floor.traps.length);
    const lightNear = (x, y, roomR) => {
      if (!rng.chance(t.signChance == null ? 0.6 : t.signChance)) return;
      const spots = roomR ? P.wallSpots(roomR) : [];
      const s = P.near(spots.map((q) => [q.x, q.y, q]), x, y)[0];
      if (s) {
        P.put(s[0], s[1], { item: 'hn-trap-light', props: { face: s[2].face } });
        P.slot('tl' + s[0] + '-' + s[1], 'traplights', { obj: K(s[0], s[1]), prop: 'text' });
      }
    };
    // a straight corridor whose middle row is free, with a wall tile free at each end of that row
    const crossing = () => {
      for (const run of rng.shuffle(corridorRuns(P, floor))) {
        const vertical = run.side === 'N' || run.side === 'S';
        const lines = {};
        for (const [x, y] of run.cells) (lines[vertical ? y : x] = lines[vertical ? y : x] || []).push([x, y]);
        const keys = Object.keys(lines).map(Number).sort((a, b) => a - b);
        const mid = lines[keys[Math.floor(keys.length / 2)]];
        if (!mid || mid.length !== run.width || mid.some(([x, y]) => P.taken(x, y))) continue;
        mid.sort((a, b) => (vertical ? a[0] - b[0] : a[1] - b[1]));
        const a = mid[0], b = mid[mid.length - 1];
        const e1 = vertical ? [a[0] - 1, a[1], 'e'] : [a[0], a[1] - 1, 's'];
        const e2 = vertical ? [b[0] + 1, b[1], 'w'] : [b[0], b[1] + 1, 'n'];
        if (P.base(e1[0], e1[1]) !== '#' || P.base(e2[0], e2[1]) !== '#' || P.floor.objs[K(e1[0], e1[1])] || P.floor.objs[K(e2[0], e2[1])]) continue;
        return { run, mid, a, e1, e2 };
      }
      return null;
    };
    if (t.build === 'darts-corridor') {
      const c = crossing();
      if (!c) return null;
      for (const [x, y] of c.mid) P.tile(x, y, { terrain: 'plate', tag: tag + '_p' });
      P.put(c.e1[0], c.e1[1], { item: 'dart-emitter', props: { face: c.e1[2] }, tag: tag + '_d' });
      P.put(c.e2[0], c.e2[1], { item: 'dart-emitter', props: { face: c.e2[2] }, tag: tag + '_d' });
      floor.traps.push({ trigger: { type: 'plate', tag: tag + '_p' }, once: false, cooldown: 2.5, gen: 'switch', lib: id, effects: [{ type: 'darts', tag: tag + '_d', volleys: t.volleys || 2, interval: 0.3, damage: dmg(t.lethality || 'medium') }] });
      lightNear(c.a[0], c.a[1], floor.rooms[c.run.edge.a]);
      return { room: c.run.edge.a };
    }
    if (t.build === 'alarm-beam') {
      const c = crossing();
      if (!c) return null;
      P.put(c.e1[0], c.e1[1], { item: 'beam-emitter', props: { face: c.e1[2] }, tag: tag + '_b' });
      P.put(c.e2[0], c.e2[1], { item: 'beam-emitter', props: { face: c.e2[2] }, tag: tag + '_b' });
      for (const [x, y] of c.mid) P.reserved.add(K(x, y));
      // something comes to look: robots from the room the corridor leads to
      const to = floor.rooms[c.run.edge.b];
      const spawnCells = rng.shuffle(P.free(to, 1)).slice(0, 2);
      const effects = [{ type: 'alarm', radius: 900, text: '{say:alarm}' }];
      const robot = rng.weighted(monsterCands(plan, lib, (mid2, m) => m.kind === 'robot' && !m.boss && m.cost <= 4 && m.placement !== 'post', floor));
      if (robot && spawnCells.length) {
        for (const [x, y] of spawnCells) P.tile(x, y, { tag: tag + '_s' });
        effects.push({ type: 'spawn', tag: tag + '_s', enemy: lib.monsters[robot].id || robot, count: spawnCells.length, delay: 1.5 });
      }
      floor.traps.push({ trigger: { type: 'beam', tag: tag + '_b' }, once: true, gen: 'switch', lib: id, effects });
      return { room: c.run.edge.a };
    }
    if (t.build === 'spikes') {
      const rooms = rng.shuffle(floor.rooms.filter((r) => !r.isEntry && !r.isExit && !r.shape && r.rect[2] >= 5 && r.rect[3] >= 5));
      for (const r of rooms) {
        const [rx, ry, rw, rh] = r.rect;
        // a band across the room leaving a one-tile gap at one end (a careful scavenger walks round it)
        const vertical = rng.chance(0.5);
        const line = vertical ? rx + rng.int(1, rw - 2) : ry + rng.int(1, rh - 2);
        const cells = [];
        const len = vertical ? rh : rw;
        const gapAt = rng.chance(0.5) ? 0 : len - 1;
        let bad = false;
        for (let i = 0; i < len; i++) {
          if (i === gapAt) continue;
          const x = vertical ? line : rx + i, y = vertical ? ry + i : line;
          if (P.taken(x, y)) { bad = true; break; }
          cells.push([x, y]);
        }
        if (bad || cells.length < 3) continue;
        for (const [x, y] of cells) P.tile(x, y, { terrain: 'spikes', tag: tag + '_k' });
        floor.traps.push({ trigger: { type: 'flag', tag: offFlag }, once: true, lib: id, effects: [{ type: 'terrain', tag: tag + '_k', terrain: 'floor', sound: false }] });
        lightNear(cells[0][0], cells[0][1], r);
        return { room: r.i };
      }
      return null;
    }
    if (t.build === 'container') {
      floor.containerTraps++;
      return { room: null };
    }
    if (t.build === 'cookies') {
      if (!Object.values(floor.objs).some((o) => o.enemy === 'hn-roach') && !floor.traps.some((tr) => (tr.effects || []).some((e) => e.enemy === 'hn-roach'))) return null;
      const r = rng.pick(floor.rooms.filter((x) => !x.isEntry));
      const [x, y] = rng.pick(P.free(r)) || [];
      if (x == null) return null;
      P.put(x, y, { item: 'hn-cookie-box', props: { trapped: true }, room: r.i });
      return { room: r.i };
    }
    if (t.build === 'mist') {
      const rooms = floor.rooms.filter((r) => !r.critical && !r.isEntry && G.roomCells(r).length >= 20);
      const r = rng.pick(rooms);
      if (!r) return null;
      const cells = rng.shuffle(P.free(r, 1.2)).slice(0, rng.int(2, 3));
      if (!cells.length) return null;
      for (const [x, y] of cells) P.put(x, y, { item: 'hn-mist', props: { toxic: true }, room: r.i, solid: true });
      return { room: r.i };
    }
    return null;
  }

  // ------------------------------------------------------------ stage 8: treasure
  G.stageTreasure = function (plan, lib) {
    const B = lib.budgets;
    const TR = lib.treasure;
    const size = plan.brief.size || 'standard';
    const reg = plan.registry;
    for (const floor of plan.floors) {
      const tl = tlOf(plan, floor);
      const P = new Painter(plan, lib, floor);
      const rng = G.srng(plan, 'treasure', 'f' + floor.n);
      const target = Math.round(G.perTl(B.treasurePerFloor, tl, 1700) * ((B.sizeMul || {})[size] || 1));
      let spent = 0;
      const rooms = floor.rooms;
      const items = G.sorted(TR.items).filter(([id, t]) => G.inRange(t.tl, tl) && (!reg || t.kind === 'gold' || (t.kind === 'weapon' ? reg.weapons[id] : t.kind === 'armor' ? reg.armor[id] : reg.hnItems[id])));
      const value = (id) => (TR.items[id].value != null ? TR.items[id].value : reg && reg.hnItems[id] ? reg.hnItems[id].value : 0);
      // containers that exist (fixtures and key lockers), then new ones per room template
      const conts = () => Object.entries(floor.objs).filter(([, o]) => o.container);
      // no more containers than the budget can fill with something worth finding (about 70 credits each)
      const most = Math.max(6, Math.round(target / 70));
      for (const r of rng.shuffle(rooms.slice())) {
        const t = lib.rooms[r.template] || {};
        const want = rng.range((t.slots || {}).treasure || [0, 1]) - conts().filter(([, o]) => o.room === r.i).length;
        for (let i = 0; i < want && conts().length < most; i++) putCache(P, rng, r, {}, t.containers);
      }
      // an adventurer who got this far (Vol 2 p. 157)
      if (rng.chance(TR.corpseChance || 0.6)) {
        const r = rng.pick(rooms.filter((x) => !x.isEntry && !x.critical)) || rng.pick(rooms.slice(1));
        if (r) {
          const c = putCache(P, rng, r, { kind: 'corpse' });
          if (c) {
            const k = Object.keys(floor.objs).find((q) => floor.objs[q] === c);
            P.slot('corpse' + k, 'corpses', { obj: k, prop: 'text' });
            floor.slots = floor.slots.filter((s) => s.id !== 'f' + floor.n + '.c' + k.replace(',', '-') + '.text');
          }
        }
      }
      const add = (o, entry, v) => {
        o.props.loot = o.props.loot || [];
        o.props.loot.push(entry);
        spent += v;
      };
      const all = conts().map(([, o]) => o);
      if (!all.length) {
        floor.treasure = { target, spent: 0 };
        continue;
      }
      // gear first: a weapon or a piece of armour of the level, at full value (Vol 2 p. 153)
      if (rng.chance(TR.gearChance || 0.55)) {
        const gear = items.filter(([id, t]) => t.group === 'gear' && value(id) <= target * 0.7);
        const g = rng.weighted(gear.map(([id, t]) => [id, t.weight || 1]));
        if (g) {
          const t = TR.items[g];
          const o = rng.pick(all.filter((x) => ['case', 'locker', 'safe', 'shelf'].includes(x.props.kind))) || rng.pick(all);
          add(o, { type: t.kind, id: g }, value(g));
        }
      }
      // rooms with their own stock (template loot: item ids, or 'gear' / 'sell' / 'expend' / 'artifact' for a pick of that
      // group): the armory's weapons and grenades, the storeroom's Neggs. Gear is the floor's level plus one where it can be.
      for (const r of rooms) {
        const t = lib.rooms[r.template] || {};
        if (!t.loot) continue;
        const pick = (key) => {
          if (key === 'gear') {
            const gear = items.filter(([id, it]) => it.group === 'gear' && value(id) <= target * 0.8);
            const want = tl + 1;
            const best = gear.filter(([id, it]) => (it.level || 1) === want);
            const near = best.length ? best : gear.filter(([id, it]) => (it.level || 1) <= want).sort((a, b) => (b[1].level || 1) - (a[1].level || 1)).slice(0, 3);
            return rng.weighted(near.map(([id, it]) => [id, it.weight || 1]));
          }
          if (TR.items[key]) return items.some(([id]) => id === key) ? key : null;
          return rng.weighted(items.filter(([id, it]) => it.group === key).map(([id, it]) => [id, it.weight || 1]));
        };
        for (const o of all.filter((x) => x.room === r.i)) {
          for (let i = 0, n = rng.int(1, 2); i < n; i++) {
            const id = pick(rng.weighted(t.loot));
            if (!id || spent + value(id) > target * 1.05) continue;
            const it = TR.items[id];
            if (it.kind === 'weapon' || it.kind === 'armor') add(o, { type: it.kind, id }, value(id));
            else add(o, { hn: id, n: it.stack ? rng.int(1, it.stack) : 1 }, value(id));
          }
        }
      }
      // functional rooms that rolled loot: their library loot, in a container of the room's
      if (G.functionLoot) G.functionLoot(P, rng, plan, lib, floor, all, add, target, () => spent);
      // the rest by shares: things to sell, expendables, artifacts
      const shares = TR.shares || { sell: 0.35, expend: 0.3, artifact: 0.35 };
      const byGroup = {};
      for (const [id, t] of items) if (t.group !== 'gear') (byGroup[t.group] = byGroup[t.group] || []).push([id, t.weight || 1]);
      // the goal's own container: a fifth of the floor's haul, in credits
      const goalC = all.find((o) => o.goal && o.container);
      if (goalC) add(goalC, { type: 'gold', amount: Math.max(50, Math.round((target * 0.2) / 10) * 10) }, Math.max(50, Math.round((target * 0.2) / 10) * 10));
      let guard = 0, extra = 0;
      // gold comes in bigger handfuls where floors are richer; every empty container will get junk (8 credits)
      const goldScale = Math.max(1, target / ((B.treasurePerFloor || {})[2] || 1700));
      const junkOwed = () => 8 * all.filter((o) => !(o.props.loot || []).length).length;
      while (spent + junkOwed() < target * 0.95 && guard++ < 160) {
        if (all.every((o) => (o.props.loot || []).length >= 4) && extra < 8) {
          const r = rng.pick(rooms.filter((x) => !x.isEntry));
          const c = r && putCache(P, rng, r, {}, (lib.rooms[r.template] || {}).containers);
          if (c) all.push(c);
          extra++;
        }
        const group = rng.weighted(Object.entries(shares).filter(([g]) => byGroup[g]));
        if (!group) break;
        const id = rng.weighted(byGroup[group]);
        const t = TR.items[id];
        let v, entry;
        if (t.kind === 'gold') {
          const amt = Math.min(Math.max(5, Math.round((target - spent) * rng.real(0.15, 0.4) / 5) * 5), Math.round(((t.max || 400) * goldScale) / 10) * 10);
          entry = { type: 'gold', amount: amt };
          v = amt;
        } else {
          const n = t.stack ? rng.int(1, t.stack) : 1;
          v = value(id) * n;
          // nothing that would take the floor more than a tenth over its target, except small things
          if (spent + v > target * 1.1 && v > Math.max(60, target * 0.04)) continue;
          if (t.rare && !rng.chance(t.rare)) continue;
          entry = n > 1 ? { hn: id, n } : { hn: id };
        }
        const o = rng.pick(all);
        if ((o.props.loot || []).length >= 4) continue;
        add(o, entry, v);
      }
      // a container never comes up empty: junk at least
      for (const o of all) if (!(o.props.loot || []).length) add(o, { hn: rng.pick(TR.junk || ['hn-mug']) }, 8);
      // trapped containers (the trap stage reserved them), each with a hint
      const trappable = rng.shuffle(all.filter((o) => !o.props.code && !(o.props.loot || []).some((e) => e.type === 'keyItem')));
      for (let i = 0; i < (floor.containerTraps || 0) && i < trappable.length; i++) {
        const o = trappable[i];
        o.props.trap = rng.weighted({ explode: 1, shock: 2, card: 1 });
        const k = Object.keys(floor.objs).find((q) => floor.objs[q] === o);
        P.slot('trap' + k, 'trapHints.' + o.props.trap, { obj: k, prop: 'trapHint' });
      }
      floor.treasure = { target, spent };
    }
  };

  // ------------------------------------------------------------ stage 9: dressing
  G.stageDressing = function (plan, lib) {
    for (const floor of plan.floors) {
      const P = new Painter(plan, lib, floor);
      const rng = G.srng(plan, 'dressing', 'f' + floor.n);
      const look = lookOf(lib, floor);
      const S = lib.settings, jit = S.dressingJitter || [1, 1], strays = lib.dressings['dress-strays'] || [];
      for (const r of floor.rooms) {
        const t = lib.rooms[r.template] || {};
        const pools = G.asList(t.dressing).concat(G.asList(look.dressing));
        // each room a little fuller or emptier than the last of its kind
        const k = rng.real(jit[0], jit[1]);
        for (const pid of pools) for (const f of lib.dressings[pid] || []) {
          if (f.rooms && !f.rooms.includes(r.template)) continue;
          placeFixture(P, rng, r, f.density ? Object.assign({}, f, { density: f.density * k }) : f);
        }
        if (strays.length && rng.chance(S.strayDressing || 0)) {
          const n = rng.int(1, 2);
          for (let i = 0; i < n; i++) placeFixture(P, rng, r, strays[rng.weighted(strays.map((f, j) => [j, f.weight || 1]))]);
        }
      }
      placeTerminals(P, rng, plan, lib, floor);
      // corridors: now and then a sign or a poster on a corridor wall
      for (const e of floor.edges) {
        if (!e.cells || e.k < 3 || !rng.chance(0.35)) continue;
        const [cx, cy] = e.cells[Math.floor(e.cells.length / 2)];
        for (const [ox, oy, face] of [[-1, 0, 'e'], [1, 0, 'w'], [0, -1, 's'], [0, 1, 'n']]) {
          const x = cx + ox, y = cy + oy;
          if (P.base(x, y) === '#' && !P.floor.objs[K(x, y)]) {
            P.put(x, y, { item: 'hn-poster', props: { face } });
            P.slot('cp' + x + '-' + y, look.posters || 'posters.corporate', { obj: K(x, y), prop: 'text' });
            break;
          }
        }
      }
      unblock(P, floor);
    }
  };

  /** A floor's talkative terminals: a chatty one with a hint, a red-team drill, and sometimes an ELIZA of its own. */
  function placeTerminals(P, rng, plan, lib, floor) {
    const S = lib.settings;
    const last = floor.rooms[floor.path[floor.path.length - 1]];
    const rooms = floor.rooms.filter((r) => !r.isEntry && r !== last);
    const put = (props) => {
      const r = rng.pick(rooms.length ? rooms : floor.rooms);
      const at = P.putFirst(rng.shuffle(P.wallRow(r)).concat(rng.shuffle(P.free(r))), () => ({ item: 'hn-terminal', props, room: r.i }));
      return at ? K(at[0], at[1]) : null;
    };
    // rooms that come with a terminal (template terminals: { chatty, eliza, redteam: chance }) get theirs first
    const want = { chatty: 0, eliza: 0, redteam: 0 };
    for (const r of floor.rooms) for (const [kind, p] of Object.entries((lib.rooms[r.template] || {}).terminals || {})) if (!want[kind] && rng.chance(p)) want[kind] = r;
    const putIn = (r, props) => {
      const at = P.putFirst(rng.shuffle(P.wallRow(r)).concat(rng.shuffle(P.free(r))), () => ({ item: 'hn-terminal', props, room: r.i }));
      return at ? K(at[0], at[1]) : null;
    };
    const putAt = (kind, props) => (want[kind] ? putIn(want[kind], props) : put(props));
    if (want.chatty || rng.chance(S.chattyChance || 0)) {
      const k = putAt('chatty', { action: 'chatty', title: 'chatty terminal' });
      const L = plan.locks.find((l) => l.floor === floor.n && l.stairs && l.keyRoom != null && (l.keyKind === 'card' || l.keyKind === 'badge'));
      if (k && L) P.slot('chat' + floor.n, 'terminals.chattyHint', { obj: k, prop: 'hint' }, { card: L.keyKind === 'card' ? tierInfo(lib, L.tier).name : 'ID badge', room: '{room:' + L.keyRoom + '}' });
      else if (k && last) P.slot('chat' + floor.n, 'terminals.chattyNoKey', { obj: k, prop: 'hint' }, { room: '{room:' + last.i + '}' });
    }
    if (want.redteam || rng.chance(S.redTeamChance || 0)) {
      const tl = tlOf(plan, floor);
      const cands = monsterCands(plan, lib, (id, m) => m.kind === 'robot' && !m.boss && m.placement !== 'post' && m.cost <= 8, floor);
      if (cands.length) {
        const robots = [];
        for (let i = 0, n = rng.int(2, 3 + Math.floor(tl / 3)); i < n; i++) {
          const id = rng.weighted(cands), m = lib.monsters[id];
          robots.push(Object.assign({ id: m.id || id }, enemyProps(m, tl)));
        }
        putAt('redteam', { action: 'redteam', title: 'red-team terminal', robots, reward: Math.round(G.perTl(lib.budgets.treasurePerFloor, tl, 1700) * 0.12), difficulty: hackDiff(plan, lib, 1, floor), flag: G.flagName(plan.slug, 'f' + floor.n + '_redteam') });
      }
    }
    if (want.eliza || rng.chance(S.elizaChance || 0)) putAt('eliza', { action: 'eliza', title: 'ELIZA terminal', gives: 'tetrad' });
  }

  G.unblock = (P, floor) => unblock(P, floor);

  /** Solid furniture must never cut anything off: every open tile reachable, every usable thing beside a reachable tile.
   *  Decor goes first; a container goes only if it holds no key and isn't the goal. */
  function unblock(P, floor) {
    const W = floor.layout.w, H = floor.layout.h;
    const essential = (o) => o.keep || o.goal || o.start || ((o.props && o.props.loot) || []).some((e) => e.type === 'keyItem');
    const solid = (x, y) => P.isSolid(floor.objs[K(x, y)]);
    const passable = (x, y) => P.open(x, y) && !solid(x, y);
    const flood = (sx, sy) => {
      const seen = new Uint8Array(W * H);
      const q = [[sx, sy]];
      seen[sy * W + sx] = 1;
      while (q.length) {
        const [x, y] = q.pop();
        for (const [ox, oy] of ORTHO) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !passable(nx, ny)) continue;
          seen[ny * W + nx] = 1;
          q.push([nx, ny]);
        }
      }
      return seen;
    };
    const anchorKey = (k) => (floor.objs[k] && floor.objs[k].cover) || k;
    const drop = (k) => {
      k = anchorKey(k);
      for (const c of (floor.objs[k] && floor.objs[k].covers) || []) delete floor.objs[c];
      delete floor.objs[k];
      floor.slots = floor.slots.filter((sl) => !(sl.target && (sl.target.obj === k || sl.target.loot === k)));
    };
    const blockers = (cells) => {
      const out = new Map();
      for (const [x, y] of cells) for (const [ox, oy] of ORTHO) {
        const k = anchorKey(K(x + ox, y + oy)), o = floor.objs[k];
        if (o && P.isSolid(o) && !essential(o)) out.set(k, o);
      }
      // decor before containers
      return [...out.entries()].sort((a, b) => (a[1].container ? 1 : 0) - (b[1].container ? 1 : 0));
    };
    for (let pass = 0; pass < 80; pass++) {
      const [sx, sy] = floor.startAt;
      const seen = flood(sx, sy);
      const reach = (x, y) => x >= 0 && y >= 0 && x < W && y < H && seen[y * W + x];
      // an open tile nobody can reach: open the pocket up
      let stuck = null;
      for (let y = 0; y < H && !stuck; y++) for (let x = 0; x < W; x++) if (passable(x, y) && !seen[y * W + x]) { stuck = [x, y]; break; }
      if (stuck) {
        const pocket = flood(stuck[0], stuck[1]);
        const cells = [];
        for (let i = 0; i < W * H; i++) if (pocket[i]) cells.push([i % W, Math.floor(i / W)]);
        const b = blockers(cells);
        if (!b.length) return;
        drop(b[0][0]);
        continue;
      }
      // something to use that nobody can stand beside
      let fixed = false;
      for (const [k, o] of Object.entries(floor.objs)) {
        if (!P.isInteractive(o) && !o.enemy) continue;
        const [x, y] = k.split(',').map(Number);
        if (reach(x, y) || ORTHO.some(([ox, oy]) => reach(x + ox, y + oy))) continue;
        const b = blockers([[x, y]]);
        if (b.length) drop(b[0][0]);
        else if (!essential(o)) drop(k);
        else continue;
        fixed = true;
        break;
      }
      if (!fixed) return;
    }
  }
  G.unblock = unblock;

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
