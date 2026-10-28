/* Linear Maze Editor — gen/stages-graph.js
 * Stage 3: the progression graph, before any geometry (section 7 of the build prompt).
 *
 * Per floor: a critical path of rooms from the way in to the way on (stairs, or the goal), side rooms
 * hanging off it, zones ranked front to back along it, and locks:
 *   - a lock where the path crosses into a higher zone (badge, hack, switch, power: from the zone's list);
 *   - the floor's card lock: its stairs on (or, on the last floor, the goal room) need that floor's card
 *     (Blue, Yellow, Red... in the book's order, Vol 2 p. 60), found on the same floor;
 *   - optional locks on some side branches (a hack panel, or a coloured key), guarding extra treasure.
 * Each lock's key, switch or clue goes in a room reachable before the lock without it. Regions number
 * what can be reached with the keys found so far; the validator proves it again after layout.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});

  function pickTemplate(lib, rng, type, zone, role, used, floor) {
    const opts = [];
    for (const [id, t] of G.sorted(lib.rooms)) {
      if ((t.status || 'built') !== 'built') continue;
      if (t.types && !t.types.includes(type.id)) continue;
      if (t.notTypes && t.notTypes.includes(type.id)) continue;
      const roles = t.roles || ['path', 'side'];
      if (!roles.includes(role)) continue;
      if (t.zones && !t.zones.includes(zone) && !(role === 'goal' || role === 'entrance' || role === 'stairs')) continue;
      if (t.goals && role === 'goal' && floor.goalKind && !t.goals.includes(floor.goalKind)) continue;
      const n = used[id] || 0;
      if (t.max != null && n >= t.max) continue;
      let w = (t.weight || 1) * ((type.roomBias || {})[id] || 1) * Math.pow(0.3, n);
      if (t.zones && t.zones[0] === zone) w *= 1.3;
      opts.push([id, w]);
    }
    const id = rng.weighted(opts);
    if (id) used[id] = (used[id] || 0) + 1;
    return id;
  }

  /** Build one floor's graph. Returns false if the library can't fill it. */
  G.buildFloorGraph = function (plan, lib, floor, attempt) {
    const rng = G.srng(plan, 'graph', 'f' + floor.n, attempt || 0);
    const type = Object.assign({ id: plan.brief.type }, G.typeOf(lib, plan.brief.type));
    const N = Math.max(3, floor.roomCount);
    const last = floor.role === 'goal' || floor.role === 'only';
    floor.goalKind = last ? plan.concept.goal.kind : null;
    const P = G.clamp(Math.round(N * (0.45 + rng.real(0, 0.12))), 3, N - 1);
    const Z = floor.zones;
    // zone of each path position: spread the floor's zones along the path, at least 2 rooms each where possible
    const zoneAt = [];
    const per = Z.length > 1 ? Math.max(2, Math.floor(P / Z.length)) : P;
    for (let i = 0; i < P; i++) zoneAt.push(Z[Math.min(Z.length - 1, Math.floor(i / per))]);
    zoneAt[P - 1] = Z[Z.length - 1];
    const used = {};
    const rooms = [];
    const edges = [];
    const add = (template, zone, role, parent, critical) => {
      const r = { id: 'r' + rooms.length, i: rooms.length, template, zone, rank: lib.zones[zone].rank, role, parent, critical: !!critical, depth: parent == null ? 0 : rooms[parent].depth + 1, kids: [] };
      rooms.push(r);
      if (parent != null) {
        rooms[parent].kids.push(r.i);
        edges.push({ i: edges.length, a: parent, b: r.i, tree: true, lock: null });
        r.edge = edges.length - 1;
      }
      return r;
    };
    // the critical path
    const entryRole = floor.n === 1 ? 'entrance' : 'stairs';
    const exitRole = last ? 'goal' : 'stairs';
    for (let i = 0; i < P; i++) {
      const role = i === 0 ? entryRole : i === P - 1 ? exitRole : 'path';
      const tpl = pickTemplate(lib, rng, type, zoneAt[i], role, used, floor) || pickTemplate(lib, rng, type, zoneAt[i], 'path', used, floor);
      if (!tpl) return G.problem('bad', 'No room template for ' + role + ' in zone ' + zoneAt[i] + '.');
      add(tpl, zoneAt[i], role, i === 0 ? null : i - 1, true);
    }
    floor.path = rooms.map((r) => r.i);
    rooms[0].isEntry = true;
    rooms[P - 1].isExit = true;
    // side rooms: off the path (never off the exit), sometimes off another side room
    for (let k = P; k < N; k++) {
      let parent;
      const sides = rooms.filter((r) => !r.critical && r.depth < 3);
      if (sides.length && rng.chance(0.3)) parent = rng.pick(sides).i;
      else parent = rng.weighted(floor.path.slice(0, P - 1).map((i) => [i, i === 0 ? 0.5 : 1 + (i / P)]));
      const zone = rooms[parent].zone;
      const tpl = pickTemplate(lib, rng, type, zone, 'side', used, floor);
      if (!tpl) continue;
      add(tpl, zone, 'side', parent, false);
    }
    floor.rooms = rooms;
    floor.edges = edges;
    return true;
  };

  // ------------------------------------------------------------ locks, keys and clues
  function subtree(rooms, i) {
    const out = [i];
    for (let k = 0; k < out.length; k++) out.push(...rooms[out[k]].kids);
    return out;
  }
  /** Region numbers: how many critical locks lie between the entry and each room; optional subtrees marked. */
  G.regions = function (floor) {
    const rooms = floor.rooms;
    for (const r of rooms) {
      r.region = 0;
      r.opt = null;
    }
    const walk = (i, reg, opt) => {
      const r = rooms[i];
      r.region = reg;
      r.opt = opt;
      for (const k of r.kids) {
        const e = floor.edges[rooms[k].edge];
        const L = e.lock ? floor.lockById[e.lock] : null;
        walk(k, reg + (L && L.critical ? 1 : 0), opt || (L && !L.critical ? L.id : null));
      }
    };
    walk(0, 0, null);
    floor.maxRegion = Math.max(...rooms.map((r) => r.region));
  };

  G.stageGraph = function (plan, lib) {
    plan.locks = [];
    const S = lib.settings;
    const tiers = S.tiers || ['blue', 'yellow', 'red'];
    let lockN = 0;
    for (const floor of plan.floors) {
      let ok = false;
      for (let a = 0; a < 6 && !ok; a++) {
        const r = G.buildFloorGraph(plan, lib, floor, a);
        if (r === true) ok = true;
        else if (a === 5) throw new Error('Floor ' + floor.n + ': ' + (r && r.text));
      }
      const rng = G.srng(plan, 'locks', 'f' + floor.n);
      const rooms = floor.rooms;
      floor.lockById = {};
      const newLock = (o) => {
        const L = Object.assign({ id: 'L' + ++lockN, floor: floor.n }, o);
        plan.locks.push(L);
        floor.lockById[L.id] = L;
        return L;
      };
      const last = floor.role === 'goal' || floor.role === 'only';
      const tier = tiers[Math.min(tiers.length - 1, floor.n - 1)];
      // 1. zone locks on the path
      for (let i = 1; i < floor.path.length; i++) {
        const a = rooms[floor.path[i - 1]], b = rooms[floor.path[i]];
        if (a.zone === b.zone) continue;
        if (last && i === floor.path.length - 1) continue; // the goal edge gets the card lock below
        const kinds = G.sorted(lib.zones[b.zone].lockKinds || { hack: 1 }).filter(([k]) => lib.locks[k] && (lib.locks[k].status || 'built') === 'built');
        const kind = rng.weighted(kinds) || 'hack';
        const L = newLock({ kind, critical: true, edge: b.edge, from: a.i, to: b.i });
        floor.edges[b.edge].lock = L.id;
      }
      // 2. the floor's card lock: the goal room, or the stairs on
      if (last) {
        const g = rooms[floor.path[floor.path.length - 1]];
        const prev = floor.edges[g.edge];
        if (prev.lock) delete floor.lockById[prev.lock];
        plan.locks = plan.locks.filter((L) => L.id !== prev.lock);
        const L = newLock({ kind: 'keycard', tier, critical: true, edge: g.edge, from: prev.a, to: g.i, goal: true });
        prev.lock = L.id;
      } else {
        newLock({ kind: 'keycard', tier, critical: true, edge: null, stairs: true, from: floor.path[floor.path.length - 1], to: null });
      }
      // 3. optional locks on some side branches
      const mechColors = rng.shuffle(['red', 'gold', 'violet']);
      let optional = 0;
      for (const r of rooms) {
        if (r.critical || rooms[r.parent].critical === false) continue;
        if (optional >= (lib.settings.optionalLocksMax || 2)) break;
        if (!rng.chance((lib.settings.optionalLockChance || 0.25))) continue;
        optional++;
        const kind = rng.weighted(G.sorted(lib.settings.optionalLocks || { hack: 2, mech: 1 }).filter(([k]) => lib.locks[k]));
        if (!kind) continue;
        if (kind === 'mech' && !mechColors.length) continue;
        const L = newLock({ kind, critical: false, edge: r.edge, from: r.parent, to: r.i, color: kind === 'mech' ? mechColors.pop() : undefined });
        floor.edges[r.edge].lock = L.id;
      }
      G.regions(floor);
      // 4. keys, switches and clues, each before its lock
      const holding = new Set();
      const placeBefore = (L, needSlot) => {
        const toRegion = L.stairs ? floor.maxRegion + 1 : rooms[L.to].region;
        const blocked = L.critical ? null : new Set(subtree(rooms, L.to));
        let cands = rooms.filter((r) => r.region < toRegion && !r.opt && !(blocked && blocked.has(r.i)));
        if (!L.critical) cands = rooms.filter((r) => r.region <= rooms[L.from].region && !r.opt && !blocked.has(r.i));
        const pool = cands.filter((r) => !r.isEntry || cands.length === 1);
        const opts = pool.map((r) => {
          const t = lib.rooms[r.template] || {};
          const slot = (t.slots || {})[needSlot];
          let w = slot == null ? 0.3 : slot;
          if (holding.has(r.i)) w *= 0.15;
          if (!r.critical) w *= 3;
          if (r.region === toRegion - 1) w *= 3;
          if (L.from != null && (r.i === L.from || rooms[L.from].kids.includes(r.i))) w *= 0.4;
          return [r.i, Math.max(w, 0.01)];
        });
        const at = rng.weighted(opts);
        if (at != null) holding.add(at);
        return at;
      };
      for (const L of plan.locks.filter((x) => x.floor === floor.n)) {
        const def = lib.locks[L.kind] || {};
        L.keyKind = def.keyKind || 'none';
        const slug = plan.slug;
        if (L.kind === 'keycard') L.flag = G.flagName(slug, L.tier);
        else if (L.kind === 'badge') L.flag = G.flagName(slug, 'badge');
        else if (L.keyKind === 'switch' || L.keyKind === 'power') L.flag = G.flagName(slug, 'f' + floor.n + '_' + L.id.toLowerCase());
        if (def.bypass === 'hack') L.hackFlag = G.flagName(slug, 'f' + floor.n + '_' + L.id.toLowerCase() + '_hack');
        if (L.kind === 'hack') L.flag = L.hackFlag;
        if (L.keyKind !== 'none') {
          L.keyRoom = placeBefore(L, L.keyKind === 'switch' || L.keyKind === 'power' ? 'control' : 'key');
          if (L.keyRoom == null) throw new Error('Floor ' + floor.n + ': nowhere to put the key for ' + L.kind + '.');
          // a card or badge may sit in a code locker, its code written down somewhere else first
          const kdef = (lib.keys || {})[L.keyKind] || {};
          if ((L.keyKind === 'card' || L.keyKind === 'badge') && rng.chance(kdef.codeChance || 0)) {
            const keyRoom = rooms[L.keyRoom];
            const cands = rooms.filter((r) => r.i !== L.keyRoom && r.region <= keyRoom.region && !r.opt);
            if (cands.length) {
              L.code = String(rng.int(100, 999));
              L.codeFlag = G.flagName(slug, 'f' + floor.n + '_code' + L.id.toLowerCase());
              L.clueRoom = rng.weighted(cands.map((r) => [r.i, ((lib.rooms[r.template] || {}).slots || {}).clue || 0.2]));
            }
          }
        }
      }
    }
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
