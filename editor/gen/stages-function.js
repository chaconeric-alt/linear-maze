/* Linear Maze Editor — gen/stages-function.js
 * Functional rooms from a content library (lib.content.<name>, editor/gen/content.js): a layer over the generated
 * layout that gives some rooms a library room type (a Throne Chamber, an Operating Theater), which then decides
 * their floor, walls, light, furniture, device, loot and hazard. The rest keep the generator's own rules.
 *
 * Brief options: functional (a probability, or false), settings { mode, dominant, secondary }, clusterStrength,
 * density (a class for every room), frequencies { probability_room_hazard... }, functionPool (room ids: only these),
 * preserveOld (the generator as it was).
 *
 * Stage 'functions' (after layout):
 *   - the installation's settings: one, a dominant with a secondary, a setting per floor, mixed or chaotic
 *     (brief.settings: { mode, dominant, secondary } or chosen by the installation type's leanings)
 *   - about functional_room_probability of the rooms (brief.functional: number | false) get a room type, picked by
 *     the adjacency weights against rooms already assigned next to them (same cluster 55, same setting 20, related
 *     setting 15, anything else 10), the room's size against the type's size class, and the type's frequency weight
 *   - each functional room: a furniture density, sometimes a descriptor in its name (Crimson, Abandoned, Imperial:
 *     each changes the room) or a misleading name, a rare twist (12%) and a history overlay (32%)
 *   - some ordinary rooms in a setting's area take its floor (a loose visual theme)
 *
 * The fill stages then place what it decided (stages-fill.js: G.placeFunctionFurniture in access, G.functionLoot in
 * treasure, G.stageFunctionsFill after dressing). Same seed, same brief, same result.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});

  /** The content a generation uses: one library by name (a brief's `library`), or, by default and for 'all', every
   *  library with rooms as one (G.mergeContent; worked out once per set of libraries). */
  const merged = new WeakMap();
  G.contentOf = (lib, name) => {
    const all = lib.content || {};
    if (name && name !== 'all') return all[name] || null;
    const names = Object.keys(all).filter((k) => all[k] && all[k].rooms);
    if (names.length < 2) return names.length ? all[names[0]] : undefined;
    const key = names.join('+'), m = merged.get(all);
    if (m && m.key === key) return m.C;
    const C = G.mergeContent(names.map((k) => all[k]));
    merged.set(all, { key, C });
    return C;
  };
  const ROLES_KEEP = ['entrance', 'stairs', 'goal'];

  // descriptors a functional room's name can carry, and what each does to the room
  G.FN_DESCRIPTORS = {
    colour: [
      { word: 'Crimson', tint: '#ff4a3a' }, { word: 'Ivory', tint: '#fff0d0' }, { word: 'Verdant', tint: '#7aff7a' },
      { word: 'Ultraviolet', tint: '#b07aff' }, { word: 'Golden', tint: '#ffd060' }, { word: 'Grey', tint: '#c8ccd0', dim: true },
      { word: 'Platinum', tint: '#e8eef4', extra: 1 }, { word: 'Obsidian', tint: '#6a5a8a', dim: true }, { word: 'Chartreuse', tint: '#c8ff3a' },
    ],
    status: [
      { word: 'Abandoned', worn: 2, debris: 3, dim: true }, { word: 'Condemned', worn: 2, debris: 2 }, { word: 'Substandard', worn: 1 },
      { word: 'Imperial', extra: 2 }, { word: 'Deluxe', extra: 1 }, { word: 'Executive', extra: 1 }, { word: 'Provisional', sparse: true },
      { word: 'Emergency', tint: '#ff3a2a' }, { word: 'Restored', worn: 0 }, { word: 'Mandatory' }, { word: 'Employee Happiness' },
    ],
    atmosphere: [
      { word: 'Silent', dim: true }, { word: 'Humming' }, { word: 'Weeping', worn: 1, debris: 1 }, { word: 'Frozen', tint: '#a8d8ff' },
      { word: 'Smouldering', tint: '#ff8a3a', worn: 1, debris: 2 }, { word: 'Whispering', dim: true }, { word: 'Sunlit', tint: '#fff0c0' },
    ],
    historical: [
      { word: 'Ancestral', worn: 1 }, { word: 'Pre-Collapse' }, { word: 'Victory', extra: 1 }, { word: 'Reconstruction', sparse: true }, { word: 'Last' }, { word: 'Wonder-Age', extra: 1 },
    ],
    corporate: [
      { word: 'Synergy™' }, { word: 'OmniCorp' }, { word: 'Premium Plus', extra: 1 }, { word: 'Sponsored', tint: '#ffe04a' }, { word: 'Brand-Loyal' }, { word: 'Value Tier', sparse: true },
    ],
    havenot: [
      { word: 'Wondermade', extra: 1 }, { word: 'Burner-Proof', worn: 1 }, { word: 'Neo-Sovereign', extra: 2 }, { word: 'Gladhand' }, { word: 'Licensed' }, { word: 'Recompensed' },
    ],
    title: [
      { word: 'Grand', extra: 1 }, { word: 'Royal', extra: 2 }, { word: 'Ministerial' }, { word: 'Supreme', extra: 1 }, { word: 'Regulatory' }, { word: 'Behavioral Correction' },
    ],
  };
  // how often each kind of descriptor is chosen
  G.FN_DESCRIPTOR_KINDS = { colour: 28, status: 28, atmosphere: 12, historical: 8, corporate: 10, havenot: 8, title: 6 };

  G.FN_OVERLAYS = ['scavenged', 'damaged', 'repurposed', 'blast', 'fire', 'flooding', 'biological growth', 'cult conversion', 'improvised habitation', 'automated restoration', 'collapse', 'robotic modification', 'contamination'];

  function cellsOf(r) {
    return G.roomCells ? G.roomCells(r).length : r.rect[2] * r.rect[3];
  }
  function fits(C, room, r) {
    const s = (C.sizes || {})[room.size_class];
    if (!s) return true;
    const n = cellsOf(r);
    return n >= s[0] && n <= s[1];
  }

  /** The settings this installation uses, and for each floor its main setting and others. */
  function chooseSettings(plan, lib, C, rng) {
    const b = plan.brief, ids = Object.keys(C.settings).sort();
    const want = b.settings || {};
    // the type's leanings among the settings this content has (a single library: only its own)
    let lean = Object.fromEntries(Object.entries(C.typeSettings[b.type] || {}).filter(([id]) => C.settings[id]));
    if (!Object.keys(lean).length) lean = Object.fromEntries(ids.map((i) => [i, 1]));
    // era emphasis (brief `era`): settings of that era three times as likely to lead
    if (b.era) lean = Object.fromEntries(ids.map((i) => [i, (lean[i] || 0.25) * (String((C.settings[i] || {}).era || '').includes(b.era) ? 3 : 1)]).filter(([, w]) => w > 0));
    const dominant = want.dominant && C.settings[want.dominant] ? want.dominant : rng.weighted(lean);
    const mode = want.mode || rng.weighted(C.modes);
    const related = (s) => (C.settings[s] || {}).related;
    const secondary = want.secondary && C.settings[want.secondary] ? want.secondary : rng.chance(0.6) && related(dominant) ? related(dominant) : rng.pick(ids.filter((i) => i !== dominant));
    const floors = plan.floors.map((f, i) => {
      if (mode === 'single') return { main: dominant, others: [] };
      if (mode === 'dominant-secondary') return { main: dominant, others: [secondary] };
      if (mode === 'per-floor') {
        const cycle = [dominant, secondary, related(secondary) || dominant];
        return { main: cycle[i % cycle.length], others: [] };
      }
      if (mode === 'mixed') return { main: dominant, others: [secondary, related(secondary)].filter((s) => s && s !== dominant) };
      return { main: dominant, others: ids.filter((s) => s !== dominant), chaotic: true };
    });
    return { mode, dominant, secondary, floors };
  }

  G.stageFunctions = function (plan, lib) {
    const C = G.contentOf(lib, plan.brief.library);
    const b = plan.brief;
    plan.functions = null;
    if (!C || b.functional === false || b.preserveOld) return;
    const rng = G.srng(plan, 'functions');
    const P0 = C.params || {};
    const chance = b.functional != null && b.functional !== true ? Number(b.functional) : P0.functional_room_probability != null ? P0.functional_room_probability : 0.25;
    const strength = b.clusterStrength != null ? Number(b.clusterStrength) : 1;
    const adj = Object.assign({ same_cluster: 55, same_setting_different_cluster: 20, related_setting: 15, unrelated_or_anomalous: 10 }, P0.adjacency_weights || {});
    const freq = (k, dflt) => (b.frequencies && b.frequencies[k] != null ? b.frequencies[k] : P0[k] != null ? P0[k] : dflt);
    const sets = chooseSettings(plan, lib, C, rng);
    plan.functions = { library: Object.keys(lib.content).find((k) => lib.content[k] === C) || 'all', mode: sets.mode, dominant: sets.dominant, secondary: sets.secondary, floors: sets.floors.map((f) => f.main), rooms: 0 };
    const all = Object.values(C.rooms).sort((a, c) => (a.id < c.id ? -1 : 1));
    const related = (a, c) => (C.settings[a] || {}).related === c || (C.settings[c] || {}).related === a;
    for (const floor of plan.floors) {
      const fs = sets.floors[floor.n - 1];
      const used = new Set();
      for (const r of floor.rooms) {
        const t = lib.rooms[r.template] || {};
        r.fn = null;
        r.theme = null;
        const keep = r.isEntry || r.goalRoom || (t.roles || []).some((x) => ROLES_KEEP.includes(x)) || floor.path[floor.path.length - 1] === r.i;
        // the setting of this part of the floor: the main one, or (mixed) by region, or (chaotic) anything
        const areaSet = fs.chaotic ? rng.pick([fs.main].concat(fs.others)) : fs.others.length && r.region % 2 ? rng.pick(fs.others) : fs.main;
        if (keep || !rng.chance(chance)) {
          if (!keep && rng.chance(0.3)) r.theme = areaSet;
          continue;
        }
        // neighbours already given a function steer this one
        const near = [r.parent].concat(r.kids || []).map((i) => floor.rooms[i]).filter((n) => n && n.fn);
        const pool = b.functionPool ? all.filter((c) => b.functionPool.includes(c.id)) : all;
        const cands = pool.filter((c) => fits(C, c, r) && !used.has(c.id));
        if (!cands.length) continue;
        const relOf = (c) => {
          const ref = near.length ? near[0].fn : { setting: areaSet, cluster: null };
          if (ref.cluster && c.cluster === ref.cluster) return 'same_cluster';
          if (c.setting_id === ref.setting) return ref.cluster ? 'same_setting_different_cluster' : 'same_cluster';
          if (related(c.setting_id, ref.setting)) return 'related_setting';
          return 'unrelated_or_anomalous';
        };
        const groups = {};
        for (const c of cands) (groups[relOf(c)] = groups[relOf(c)] || []).push(c);
        // cluster strength sharpens or flattens the preference for the near relations
        const w = (k) => (k === 'unrelated_or_anomalous' ? adj[k] : Math.pow(adj[k], strength));
        const rel = rng.weighted(Object.keys(groups).sort().map((k) => [k, w(k)]));
        const room = rng.weighted(groups[rel].map((c) => [c.id, c.frequency_weight || 1]));
        const rec = C.rooms[room];
        used.add(room);
        const fn = { id: room, setting: rec.setting_id, cluster: rec.cluster, relation: rel, name: rec.name, note: rec.function ? G.titleCase(rec.function) + '.' : '' };
        // density: a class per room, not a chance per item
        fn.density = rng.weighted(Object.assign({ sparse: 0.2, normal: 0.55, crowded: 0.2, excessive: 0.05 }, b.density ? { [b.density]: 100 } : P0.room_furniture_density || {}));
        // the name: sometimes a descriptor that changes the room, now and then a misleading one
        if (rng.chance(0.18)) {
          const kind = rng.weighted(G.FN_DESCRIPTOR_KINDS);
          let d = rng.pick(G.FN_DESCRIPTORS[kind]);
          fn.name = d.word + ' ' + fn.name;
          // now and then a colour in front as well (Crimson Executive Throne Room): its tint over the other's effects
          if (kind !== 'colour' && rng.chance(0.25)) {
            const c = rng.pick(G.FN_DESCRIPTORS.colour);
            fn.name = c.word + ' ' + fn.name;
            d = Object.assign({}, d, { word: c.word + ' ' + d.word, tint: c.tint, dim: d.dim || c.dim });
          }
          fn.descriptor = d;
          if (d.sparse) fn.density = 'sparse';
          if (d.extra) fn.density = d.extra > 1 ? 'excessive' : 'crowded';
        }
        if (rng.chance(0.06)) {
          const other = rng.pick(all.filter((c) => c.setting_id !== rec.setting_id));
          fn.misleading = other.id;
          fn.name = other.name;
        }
        if (rng.chance(freq('probability_place_room_rare_twist', 0.12))) {
          const kinds = ['mismatch', 'mismatch', 'state', 'encounter', 'light'];
          fn.twist = { kind: rng.pick(kinds), text: rec.rare_twist || '' };
          if (fn.twist.kind === 'mismatch') fn.twist.from = rng.pick(all.filter((c) => c.cluster !== rec.cluster)).id;
        }
        if (rng.chance(freq('probability_history_overlay', 0.32))) fn.overlay = rng.chance(0.6) && (rec.history_overlays || []).length ? rng.pick(rec.history_overlays) : rng.pick(G.FN_OVERLAYS);
        fn.hazard = rng.chance(freq('probability_room_hazard', 0.2) * Math.min(1.6, 0.8 + 0.1 * G.tlOf(plan, floor)));
        fn.loot = rng.chance(freq('probability_room_loot', 0.28));
        // the room's materials: its own pools, unless a descriptor or overlay says otherwise
        fn.floor = rng.pick(rec.floor_tile_pool || []);
        fn.wall = rng.pick(rec.wall_tile_pool || []);
        fn.light = rng.pick(rec.lighting_pool || []);
        let worn = rng.weighted({ 0: 5, 1: 4, 2: 1 });
        if (fn.descriptor && fn.descriptor.worn != null) worn = fn.descriptor.worn;
        if (['damaged', 'blast', 'fire', 'collapse', 'flooding'].includes(fn.overlay)) worn = 2;
        if (fn.overlay === 'automated restoration') worn = 0;
        fn.state = Number(worn);
        if (fn.twist) fn.note = fn.twist.text || fn.note;
        r.fn = fn;
        plan.functions.rooms++;
      }
    }
  };

  // ------------------------------------------------------------ filling a functional room
  const K = (x, y) => x + ',' + y;
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const WALL_FAMS = ['screen', 'sign', 'mirror', 'window'];
  const objProps = (C, name, fn, extra) => {
    const o = C.objects[name] || { fam: 'machine', w: 1, h: 1 };
    return Object.assign({ name, fam: o.fam, set: fn.setting, w: o.w, h: o.h, state: fn.state || 0 }, extra || {});
  };
  /** Place one library object in a room by its family's placement rule; a big piece that won't fit is tried
   *  turned, then small. Returns the object's entry, or null. */
  function placeObject(P, rng, r, C, name, fn, extra) {
    const o = C.objects[name] || { fam: 'machine', w: 1, h: 1, place: 'wall-row' };
    const before = new Set(Object.keys(P.floor.objs));
    const props = objProps(C, name, fn, extra);
    const wall = WALL_FAMS.includes(o.fam);
    const tries = wall ? [{ item: 'hn-s10w', place: 'wall' }] : [
      // a centrepiece in a big room: bigger, in the middle, so the room reads as what it is at normal zoom
      ...(extra && extra.grow ? [{ item: 'hn-s10', place: 'center', grow: extra.grow }] : []),
      { item: 'hn-s10', place: o.place === 'wall' ? 'wall-row' : o.place },
      { item: 'hn-s10', place: 'any', swap: true },
      { item: 'hn-s10', place: 'any', small: true },
    ];
    for (const t of tries) {
      const pr = G.clone(props);
      if (t.swap) [pr.w, pr.h] = [props.h, props.w];
      if (t.small) pr.w = pr.h = 1;
      if (t.grow) {
        pr.w = Math.max(props.w + t.grow, 1 + t.grow);
        pr.h = Math.max(props.h + t.grow, 1 + t.grow);
        pr.centre = true;
      }
      delete pr.grow;
      if (t.swap && pr.w === props.w && pr.h === props.h) continue;
      const n = G.placeFixtureIn(P, rng, r, { item: t.item, props: pr, place: t.place, count: 1 });
      if (n) {
        const k = Object.keys(P.floor.objs).find((q) => !before.has(q) && P.floor.objs[q].item === t.item);
        return k ? P.floor.objs[k] : null;
      }
    }
    return null;
  }
  const DENSITY_EXTRA = { sparse: 0, normal: 1, crowded: 3, excessive: 6 };
  // centrepieces: the families and names that carry a room (a throne room's throne, a lab's vat)
  const CENTRE_FAMS = ['throne', 'vat', 'altar', 'coffin', 'turbine', 'dais', 'fountain', 'statue', 'furnace', 'bath', 'cage', 'pod'];
  const CENTRE_NAMES = /surgical|operating|autopsy|cannon|howitzer|reactor|core|centrifuge|stage|tank/;
  /** How much bigger a room's required piece is drawn: +1 a side in a room of 50 floor cells, +2 from 110. */
  const growOf = (C, name, cells) => {
    const o = C.objects[name] || {};
    if (!(CENTRE_FAMS.includes(o.fam) || CENTRE_NAMES.test(name)) || WALL_FAMS.includes(o.fam)) return 0;
    return cells >= 110 ? 2 : cells >= 50 ? 1 : 0;
  };

  /** A functional room's furniture (stage access, in place of the template's fixtures). */
  G.placeFunctionFurniture = function (P, rng, r, plan, lib) {
    const C = G.contentOf(lib, plan.brief.library), fn = r.fn, rec = C.rooms[fn.id];
    const cells = G.roomCells(r).length;
    fn.placed = [];
    fn.missing = [];
    // the two required fixtures first: the room should read as what it is
    let grown = false;
    for (const name of (rec.mandatory_features || []).slice(0, 2)) {
      // the first centrepiece grows with the room (one per room)
      const grow = grown ? 0 : growOf(C, name, cells);
      const e = placeObject(P, rng, r, C, name, fn, grow ? { key: true, grow } : { key: true });
      if (e && e.props && e.props.centre) grown = true;
      if (e) {
        e.keep = true;
        fn.placed.push(name);
      } else fn.missing.push(name);
    }
    // then optional furnishings and the furniture record's other pieces, to the room's density and floor area
    const pool = [].concat(rec.optional_furnishings || [], ((C.furniture[rec.furniture_record] || {}).names || []).filter((n) => !(rec.mandatory_features || []).includes(n)));
    const want = Math.min(Math.floor(cells / 10), DENSITY_EXTRA[fn.density] + (fn.density === 'sparse' ? 0 : 1));
    for (let i = 0; i < want && pool.length; i++) {
      const name = pool[i % pool.length];
      if (placeObject(P, rng, r, C, name, fn)) fn.placed.push(name);
    }
    // the room's device: an object of the interactable's name, the one placed or a new one
    const dev = C.interactables[rec.interactive_record];
    if (dev) {
      let e = Object.values(P.floor.objs).find((o) => o.room === r.i && o.props && o.props.name === dev.device);
      if (!e) e = placeObject(P, rng, r, C, dev.device, fn);
      if (e) {
        const st = fn.twist && fn.twist.kind === 'state' ? 'malfunctioning' : rng.weighted({ working: 4, 'partly-working': 3, malfunctioning: 2, disabled: 1 });
        Object.assign(e.props, { dev: dev.id, kind: dev.kind, devState: st, use: dev.possible_use, uid: plan.slug + '-' + dev.id + '-' + r.i });
        e.keep = true;
      }
    }
    // a mismatch: something from a room that has no business here
    if (fn.twist && fn.twist.kind === 'mismatch' && fn.twist.from) {
      const other = C.rooms[fn.twist.from];
      for (const name of (other.mandatory_features || []).slice(0, 2)) {
        const e = placeObject(P, rng, r, C, name, Object.assign({}, fn, { setting: other.setting_id }), { odd: true });
        if (e) fn.placed.push(name + ' (out of place)');
      }
      fn.note = (fn.note ? fn.note + ' ' : '') + 'Someone has moved a ' + other.name.toLowerCase() + ' in here.';
    }
    // a library's own mismatch pool (furniture its room lists from another setting): now and then one such piece,
    // in its own setting's colours
    const odd = (C.furniture[rec.furniture_record] || {}).mismatch || [];
    if (odd.length && rng.chance(MISMATCH_CHANCE)) {
      const [name, set] = rng.pick(odd);
      if (placeObject(P, rng, r, C, name, Object.assign({}, fn, { setting: set }), { odd: true })) fn.placed.push(name + ' (out of place)');
    }
  };
  const MISMATCH_CHANCE = 0.25;

  /** A functional room's loot (stage treasure): its library loot record, in a container, valued for the floor. */
  G.functionLoot = function (P, rng, plan, lib, floor, all, add, target, spentNow) {
    const C = G.contentOf(lib, plan.brief.library);
    if (!C) return;
    const tl = G.tlOf(plan, floor);
    for (const r of floor.rooms) {
      if (!r.fn || !r.fn.loot) continue;
      const L = C.loot[C.rooms[r.fn.id].loot_record];
      if (!L || !L.items.length) continue;
      // the floor's budget still rules: no more once it is nearly spent
      if (spentNow() > target * 0.85) break;
      let c = all.find((o) => o.room === r.i && o.container && !(o.props.loot || []).length);
      if (!c) {
        c = G.putCache(P, rng, r, {}, ['case', 'locker', 'shelf', 'safe']);
        if (c) all.push(c);
      }
      if (!c) continue;
      const items = rng.shuffle(L.items.slice()).slice(0, rng.int(1, Math.min(2, L.items.length)));
      for (const it of items) add(c, { hn: it.id, n: 1 }, Math.round(it.value * (0.6 + 0.2 * tl)));
      c.props.lootFrom = L.id;
    }
  };

  /** Stage functionsFill (after dressing): materials, light, hazards, history overlays and twists. */
  /** A glass floor (engine SPEC 6.23): now and then one room in an installation has a glass panel in its floor,
   *  looking down into the floor below's biggest room. The level gets `below`; the tiles are 'hn-glass-floor'. */
  function glassRoom(plan, lib) {
    if (plan.floors.length < 2 || plan.brief.glass === false) return;
    const rng = G.srng(plan, 'glass');
    if (!plan.brief.glass && !rng.chance(lib.settings.glassChance != null ? lib.settings.glassChance : 0.5)) return;
    for (const floor of rng.shuffle(plan.floors.slice(0, -1))) {
      const P = new G.Painter(plan, lib, floor);
      const next = plan.floors[floor.n];
      const rooms = rng.shuffle(floor.rooms.filter((r) => !r.isEntry && !r.shape && r.rect[2] >= 5 && r.rect[3] >= 5));
      for (const r of rooms) {
        const [rx, ry, rw, rh] = r.rect;
        const gw = Math.min(4, rw - 2), gh = Math.min(3, rh - 2);
        const gx = rx + Math.floor((rw - gw) / 2), gy = ry + Math.floor((rh - gh) / 2);
        let ok = true;
        for (let y = gy; y < gy + gh && ok; y++) for (let x = gx; x < gx + gw; x++) if (P.base(x, y) !== '.' || P.floor.objs[K(x, y)] || P.floor.tiles[K(x, y)]) ok = false;
        if (!ok) continue;
        for (let y = gy; y < gy + gh; y++) for (let x = gx; x < gx + gw; x++) P.floor.tiles[K(x, y)] = { terrain: 'hn-glass-floor' };
        const big = next.rooms.slice().sort((a, c) => c.rect[2] * c.rect[3] - a.rect[2] * a.rect[3])[0];
        const bx = big.rect[0] + Math.floor(big.rect[2] / 2) - Math.floor(gw / 2), by = big.rect[1] + Math.floor(big.rect[3] / 2) - Math.floor(gh / 2);
        floor.below = { level: next.id, dx: gx - bx, dy: gy - by, depth: 0.3, dim: 0.5, tint: 'rgba(60,110,140,0.14)', rim: 12 };
        r.note = (r.note ? r.note + ' ' : '') + 'There’s a glass panel in the floor. Something moves underneath.';
        return;
      }
    }
  }

  G.stageFunctionsFill = function (plan, lib) {
    glassRoom(plan, lib);
    const C = G.contentOf(lib, plan.brief.library);
    if (!C || !plan.functions) return;
    const B = lib.budgets;
    for (const floor of plan.floors) {
      const P = new G.Painter(plan, lib, floor);
      const rng = G.srng(plan, 'functionsFill', 'f' + floor.n);
      const tl = G.tlOf(plan, floor);
      const dmgRow = (B.trapDamage || {})[G.clamp(tl, 2, 6)] || [8, 12, 21, 31];
      for (const r of floor.rooms) {
        const fn = r.fn;
        if (!fn && !r.theme) continue;
        const cells = G.roomCells(r);
        if (!fn) {
          laySurfaces(P, rng, r, C, null, cells);
          continue;
        }
        // light fittings
        const light = C.tiles[fn.light];
        if (light) {
          const n = Math.max(1, Math.round(cells.length / 40));
          const tint = fn.descriptor && fn.descriptor.tint;
          for (let i = 0; i < n; i++) {
            const c = rng.pick(P.free(r, 1));
            if (!c) break;
            P.put(c[0], c[1], { item: 'hn-mat-light', props: { style: light.style, color: tint || light.color, radius: light.radius, state: fn.descriptor && fn.descriptor.dim ? 2 : fn.state }, room: r.i, solid: false });
          }
        }
        // the hazard: a working trap with a clue and a countermeasure, damage from the floor's Threat Level
        if (fn.hazard) {
          const H = C.hazards[C.rooms[fn.id].hazard_record];
          const at = H && rng.pick(P.free(r, 1));
          if (at) {
            const off = G.flagName(plan.slug, 'f' + floor.n + '_haz' + r.i);
            const dmg = Math.max(3, Math.round(dmgRow[H.severity === 'severe' ? 2 : 1] * (lib.settings.trapDamageScale || 0.75)));
            P.put(at[0], at[1], { item: 'hn-hazard', props: { haz: H.id, behaviour: H.behaviour, name: H.name, severity: H.severity, clue: H.clues, counter: H.countermeasure, effect: H.effect, trigger: H.trigger, dmg, tl, off, floorOff: floor.trapsOff || null, rect: r.rect.slice(), set: fn.setting }, room: r.i, solid: false });
            // the countermeasure: a control on the room's wall (or the floor's facilities terminal, if it has one)
            const spot = rng.pick(P.wallSpots(r).filter((s) => !P.floor.objs[K(s.x, s.y)]));
            if (spot) P.put(spot.x, spot.y, { item: 'hn-hazard-ctl', props: { face: spot.face, flag: off, name: H.name, counter: H.countermeasure, difficulty: Math.min(9, (lib.settings.hackBase || 6) + tl - 1) }, room: r.i });
            fn.hazardAt = at;
          }
        }
        // history: what happened to the room since, drawn on it
        if (fn.overlay) applyOverlay(P, rng, r, fn, cells);
        if (fn.twist && fn.twist.kind === 'encounter') {
          const at = rng.pick(P.free(r, 1));
          if (at) P.put(at[0], at[1], { item: 'hn-s10', props: objProps(C, 'ancient caretaker robot', fn, { fam: 'drone', w: 1, h: 1, odd: true }), room: r.i });
        }
        if (fn.twist && fn.twist.kind === 'light') for (const o of Object.values(P.floor.objs)) if (o.room === r.i && o.item === 'hn-mat-light') o.props.color = rng.pick(['#ff3aff', '#3affb0', '#ff2a2a']);
        if (fn.descriptor && fn.descriptor.debris) for (let i = 0; i < fn.descriptor.debris; i++) {
          const at = rng.pick(P.free(r));
          if (at) P.put(at[0], at[1], { item: 'hn-s10-decal', props: { kind: rng.pick(['rubble', 'stain', 'papers']) }, room: r.i, solid: false });
        }
        // last, the floor and walls (a tile counts as taken, so nothing could be placed after them)
        laySurfaces(P, rng, r, C, fn, cells);
      }
      laySeams(P, C, floor);
      G.unblock(P, floor);
    }
  };
  /** Doorway transitions: where a room's material floor meets a door or an opening onto another floor, a threshold
   *  on the room's side fades its material into the next one's, with a sill at the edge ('hn-threshold'). Both rooms
   *  at a shared door get one. No randomness: it doesn't change anything else the seed decides. */
  function laySeams(P, C, floor) {
    const matOf = (x, y) => {
      const t = P.floor.tiles[K(x, y)];
      return t && /^mat-/.test(t.terrain || '') ? t.terrain.slice(4) : null;
    };
    const colOf = (id) => {
      const t = id && C.tiles[id];
      return t && t.colors ? t.colors[0] : null;
    };
    for (const r of floor.rooms) {
      const cells = G.roomCells(r), inRoom = new Set(cells.map(([x, y]) => K(x, y)));
      for (const [x, y] of cells) {
        const mine = matOf(x, y);
        if (!mine || P.floor.objs[K(x, y)]) continue;
        for (const [ox, oy] of ORTHO) {
          const nx = x + ox, ny = y + oy;
          if (inRoom.has(K(nx, ny)) || !P.open(nx, ny)) continue;
          // past a door, the floor beyond it
          const [bx, by] = P.base(nx, ny) === '+' ? [nx + ox, ny + oy] : [nx, ny];
          const other = matOf(bx, by);
          if (other === mine) continue;
          P.put(x, y, { item: 'hn-threshold', props: { dir: [ox, oy], from: colOf(mine), to: colOf(other) }, room: r.i, solid: false });
          break;
        }
      }
    }
  }
  /** A room's floor and walls in its materials (a themed ordinary room: its setting's first floor only). */
  function laySurfaces(P, rng, r, C, fn, cells) {
    const themeTile = r.theme ? Object.values(C.tiles).find((t) => t.setting_id === r.theme && t.kind === 'floor') : null;
    const floorTile = fn ? fn.floor : themeTile && themeTile.id;
    const state = fn ? fn.state : 0;
    if (floorTile) for (const [x, y] of cells) {
      if (P.base(x, y) !== '.' || P.floor.tiles[K(x, y)]) continue;
      const st = state === 2 ? (rng.chance(0.6) ? 2 : 1) : state === 1 ? (rng.chance(0.5) ? 1 : 0) : 0;
      P.floor.tiles[K(x, y)] = { terrain: 'mat-' + floorTile, variant: st };
    }
    if (!fn || !fn.wall) return;
    // the walls round it (shared walls take the later room's)
    const ring = new Set();
    for (const [x, y] of cells) for (const [ox, oy] of ORTHO.concat([[1, 1], [-1, -1], [1, -1], [-1, 1]])) if (P.base(x + ox, y + oy) === '#') ring.add(K(x + ox, y + oy));
    for (const k of ring) {
      const t = P.floor.tiles[k];
      if (t && t.tag) continue;
      P.floor.tiles[k] = { terrain: 'mat-' + fn.wall, variant: state === 2 && rng.chance(0.4) ? 2 : state };
    }
  }
  const OVERLAY_DECALS = {
    scavenged: ['stain', 'papers', 'rubble'], damaged: ['rubble', 'crack', 'scorch'], repurposed: ['graffiti', 'stain'], blast: ['scorch', 'rubble', 'crack'],
    fire: ['scorch', 'ash'], flooding: ['water', 'stain'], 'biological growth': ['growth', 'spores'], 'cult conversion': ['sigil', 'candles'], 'improvised habitation': ['bedroll', 'stain'],
    'automated restoration': ['polish'], collapse: ['rubble', 'rubble', 'crack'], 'robotic modification': ['cables', 'oil'], contamination: ['spores', 'water'],
  };
  const OVERLAY_NOTES = {
    scavenged: 'Picked over.', damaged: 'Badly damaged.', repurposed: 'Someone has used it for something else since.', blast: 'Blast-scarred.', fire: 'Burned out.',
    flooding: 'It has flooded, more than once.', 'biological growth': 'Something is growing in here.', 'cult conversion': 'Someone worships here now.',
    'improvised habitation': 'Someone lived here, after.', 'automated restoration': 'Freshly restored. By what?', collapse: 'Part of the ceiling is on the floor.',
    'robotic modification': 'The robots have been redecorating.', contamination: 'Contaminated: breathe lightly.',
  };
  function applyOverlay(P, rng, r, fn, cells) {
    const kinds = OVERLAY_DECALS[fn.overlay] || ['stain'];
    const n = Math.max(2, Math.round(cells.length / 12));
    for (let i = 0; i < n; i++) {
      const at = rng.pick(P.free(r));
      if (!at) break;
      P.put(at[0], at[1], { item: 'hn-s10-decal', props: { kind: rng.pick(kinds) }, room: r.i, solid: false });
    }
    // and something that tells the story outright
    const extra = { 'improvised habitation': 'hn-bunk', 'cult conversion': 'candles', collapse: 'ceiling-debris', 'biological growth': 'plant', scavenged: 'crate', 'robotic modification': 'barrel' }[fn.overlay];
    if (extra) {
      const at = rng.pick(P.wallRow(r));
      if (at) P.put(at[0], at[1], { item: extra, props: {}, room: r.i });
    }
    fn.note = (fn.note ? fn.note + ' ' : '') + (OVERLAY_NOTES[fn.overlay] || '');
  }

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
