/* Linear Maze Editor — gen/library.js
 * Content libraries: the lists every generator choice is picked from.
 *
 * A game's library lives in games/<id>/gen/library/*.js. Each file is one call holding plain data:
 *
 *   LM.genLibrary('havenot', { monsters: { ... }, traps: { ... } });
 *
 * Files merge section by section (a later file's entry with the same id replaces an earlier one).
 * Sections: settings, budgets, types, zones, rooms, looks, dressings, monsters, encounters, locks, keys,
 * traps, puzzles, treasure, interest, text. Every entry may carry: name, ref, status ('built' |
 * 'planned'), tl [min, max], weight, tags, bespoke (in the game, but made for one level: planned on purpose).
 * Only 'built' entries are ever placed.
 *
 * G.registryOf(LM) boils a loaded game's registry down to the ids and facts the generator needs, and
 * G.checkLibrary(lib, reg) reports anything the library names that the game doesn't have.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});
  const LMroot = (root.LM = root.LM || {});

  G.SECTIONS = ['settings', 'budgets', 'types', 'zones', 'rooms', 'looks', 'dressings', 'monsters', 'encounters', 'locks', 'keys', 'traps', 'puzzles', 'treasure', 'interest', 'text', 'content'];
  G.libraries = G.libraries || {};

  G.emptyLibrary = (game) => {
    const lib = { game };
    for (const s of G.SECTIONS) lib[s] = {};
    return lib;
  };
  /** Merge one file's data into a game's library. */
  G.addLibrary = function (game, data, into) {
    const lib = into || (G.libraries[game] = G.libraries[game] || G.emptyLibrary(game));
    for (const [sec, v] of Object.entries(data || {})) {
      if (!G.SECTIONS.includes(sec)) {
        (lib.unknown = lib.unknown || []).push(sec);
        continue;
      }
      lib[sec] = Object.assign(lib[sec] || {}, G.clone(v));
    }
    return lib;
  };
  LMroot.genLibrary = function (game, data) {
    if (G.collecting) return G.addLibrary(game, data, G.collecting);
    return G.addLibrary(game, data);
  };
  /** Run library files' text into a fresh library (the CLI and the editor both use this). */
  G.libraryFromSources = function (game, sources) {
    const lib = G.emptyLibrary(game);
    const prev = G.collecting;
    G.collecting = lib;
    const LMshim = { genLibrary: (g, d) => G.addLibrary(g, d, lib) };
    try {
      for (const { name, text } of sources) {
        try {
          new Function('LM', 'window', text)(LMshim, { LM: LMshim });
        } catch (e) {
          (lib.loadErrors = lib.loadErrors || []).push(name + ': ' + e.message);
        }
      }
    } finally {
      G.collecting = prev;
    }
    lib.hash = G.hashData(Object.fromEntries(G.SECTIONS.map((s) => [s, lib[s]])));
    return lib;
  };

  // ------------------------------------------------------------ the registry, boiled down
  G.registryOf = function (LM) {
    const R = LM.registry || {};
    const out = { enemies: {}, items: {}, terrain: {}, environments: {}, effects: [], weapons: {}, armor: {}, hnItems: {}, levels: [], statuses: [], legend: {} };
    for (const [id, d] of Object.entries(R.enemies || {})) out.enemies[id] = { name: d.name, hp: d.hp, robot: !!d.robot, boss: !!d.boss, flying: !!d.flying, stationary: !!d.stationary };
    for (const [id, d] of Object.entries(R.items || {})) {
      out.items[id] = { name: d.name, wallMounted: !!d.wallMounted, solid: d.solid === 'rect' ? 'rect' : !!d.solid, interact: !!d.interact };
      // pieces bigger than a tile (couches, conference tables, the reception desk) anchor at their top-left tile;
      // so do pieces sized by their props (a functional room's fixtures: props.w × props.h tiles)
      const foot = d.solid === 'rect' && !d.wallMounted ? footprintOf(LM, d, {}) : null;
      const big = foot ? footprintOf(LM, d, { w: 3, h: 3 }) || foot : null;
      if (foot && (foot[0] > 1 || foot[1] > 1 || big[0] > 1 || big[1] > 1)) {
        Object.assign(out.items[id], { foot, footW: big[0] !== foot[0], footH: big[1] !== foot[1] });
      }
    }
    for (const [id, d] of Object.entries(R.terrain || {})) out.terrain[id] = { solid: !!d.solid, door: !!d.door, hazard: d.hazard || null, entry: !!d.entry, exit: !!d.exit };
    for (const [id, d] of Object.entries(R.environments || {})) out.environments[id] = { name: d.name, variants: d.floors ? Object.keys(d.floors).length : d.floorAlt ? 2 : 1 };
    out.effects = Object.keys(R.effects || {}).sort();
    for (const [id, d] of Object.entries(R.weapons || {})) out.weapons[id] = { name: d.name };
    for (const [id, d] of Object.entries(R.armor || {})) out.armor[id] = { name: d.name, slot: d.slot };
    const HI = (LM.HN && LM.HN.ITEMS) || {};
    for (const [id, d] of Object.entries(HI)) out.hnItems[id] = { name: d.name, value: d.value || 0, rarity: d.rarity || 'common', cat: d.cat || '', unique: !!d.unique };
    out.levels = Object.keys(R.levels || {}).sort();
    out.statuses = Object.keys(R.statuses || {}).sort();
    for (const [ch, e] of Object.entries(R.legend || {})) out.legend[ch] = typeof e === 'string' ? { terrain: e } : { terrain: e.terrain, item: e.item, enemy: e.enemy };
    return out;
  };

  /** The tiles a rect-solid piece covers, found by running its init on a test piece at tile 0,0: [w, h], or null
   *  when it doesn't sit in a block from its anchor tile. */
  function footprintOf(LM, d, props) {
    const T = LM.TILE || 32;
    try {
      const it = { tx: 0, ty: 0, x: T / 2, y: T / 2, props: Object.assign({}, props), def: d, turn: 0 };
      if (typeof d.init === 'function') d.init(it, null);
      const [bw, bh] = it.box || d.box || [24, 24];
      const [ox, oy] = it.boxOff || [0, 0];
      const x0 = it.x + ox - bw / 2, x1 = it.x + ox + bw / 2, y0 = it.y + oy - bh / 2, y1 = it.y + oy + bh / 2;
      const xs = [], ys = [];
      for (let t = -2; t < 10; t++) {
        if ((t + 0.5) * T > x0 && (t + 0.5) * T < x1) xs.push(t);
        if ((t + 0.5) * T > y0 && (t + 0.5) * T < y1) ys.push(t);
      }
      if (!xs.length || !ys.length || xs[0] !== 0 || ys[0] !== 0) return null;
      return [xs.length, ys.length];
    } catch (e) {
      return null;
    }
  }
  /** Tiles an item takes, [w, h], anchored at its top-left tile (1 × 1 for almost everything). A piece turned a
   *  quarter (props.turn 1 or 3) lies the other way: the engine keeps its top-left tile and swaps its sides. */
  G.footprint = function (reg, item, props) {
    const d = reg && reg.items && reg.items[item];
    if (!d || !d.foot) return [1, 1];
    const p = props || {};
    const w = (d.footW && p.w) || d.foot[0], h = (d.footH && p.h) || d.foot[1];
    return G.quarterTurns(p.turn) % 2 === 1 ? [h, w] : [w, h];
  };
  /** props.turn as quarter turns clockwise, 0–3 (-1 for none): the engine's Level.quarterTurns. */
  G.quarterTurns = function (v) {
    if (v == null || v === '' || !Number.isFinite(+v)) return -1;
    let n = Math.round(+v);
    if (Math.abs(n) >= 4) n = Math.round(n / 90);
    return ((n % 4) + 4) % 4;
  };

  // ------------------------------------------------------------ checking a library against a game
  G.checkLibrary = function (lib, reg) {
    const out = [];
    const bad = (sec, id, text) => out.push({ level: 'bad', section: sec, id, text });
    const warn = (sec, id, text) => out.push({ level: 'warn', section: sec, id, text });
    const item = (id) => !!reg.items[id];
    const built = (e) => (e.status || 'built') === 'built';
    for (const e of lib.loadErrors || []) bad('files', '', e);
    for (const s of lib.unknown || []) warn('files', s, 'Unknown section “' + s + '” (ignored).');
    for (const [id, m] of G.sorted(lib.monsters)) {
      const rid = m.id || id;
      if (built(m) && !reg.enemies[rid]) bad('monsters', id, 'Marked built, but the game has no enemy “' + rid + '”.');
      // bespoke: the game has it, but only for a level it was made for (the entry says why)
      if (!built(m) && !m.bespoke && reg.enemies[rid]) warn('monsters', id, '“' + rid + '” exists in the game now: mark it built?');
      if (built(m) && !(m.cost > 0)) bad('monsters', id, 'No cost.');
    }
    for (const [id, l] of G.sorted(lib.looks)) {
      if (built(l) && !reg.environments[l.environment]) bad('looks', id, 'No environment “' + l.environment + '”.');
      if (!built(l) && l.fallback && !lib.looks[l.fallback]) bad('looks', id, 'Fallback “' + l.fallback + '” is not a look.');
    }
    for (const [id, t] of G.sorted(lib.types)) {
      for (const z of t.zones || []) if (!lib.zones[z]) bad('types', id, 'Zone “' + z + '” is not in the zones list.');
      for (const l of Object.keys(t.looks || {})) if (!lib.looks[l]) bad('types', id, 'Look “' + l + '” is not in the looks list.');
    }
    const fixtureIds = (list) => G.asList(list).filter(Boolean).map((f) => f.item).filter(Boolean);
    for (const [id, r] of G.sorted(lib.rooms)) {
      for (const z of r.zones || []) if (!lib.zones[z]) bad('rooms', id, 'Zone “' + z + '” is not in the zones list.');
      for (const f of fixtureIds(r.fixtures)) if (!item(f)) bad('rooms', id, 'Fixture “' + f + '” is not an item in the game.');
      for (const p of G.asList(r.dressing)) if (!lib.dressings[p]) bad('rooms', id, 'Dressing pool “' + p + '” doesn’t exist.');
    }
    for (const [id, pool] of G.sorted(lib.dressings)) for (const d of pool) if (!item(d.item)) bad('dressings', id, '“' + d.item + '” is not an item in the game.');
    for (const [id, t] of G.sorted(lib.traps)) {
      if (!built(t)) continue;
      for (const f of fixtureIds([].concat(t.emitters || [], t.items || []))) if (!item(f)) bad('traps', id, '“' + f + '” is not an item in the game.');
      for (const ef of t.effects || []) if (!reg.effects.includes(ef.type)) bad('traps', id, 'No trap effect “' + ef.type + '”.');
      if (t.terrain && !reg.terrain[t.terrain]) bad('traps', id, 'No terrain “' + t.terrain + '”.');
    }
    for (const [id, p] of G.sorted(lib.puzzles)) {
      if (!built(p)) continue;
      for (const f of fixtureIds([p.lock, p.clue])) if (!item(f)) bad('puzzles', id, '“' + f + '” is not an item in the game.');
    }
    for (const [id, t] of G.sorted((lib.treasure || {}).items)) {
      const ok = t.kind === 'weapon' ? reg.weapons[id] : t.kind === 'armor' ? reg.armor[id] : t.kind === 'gold' ? true : reg.hnItems[id];
      if (!ok) bad('treasure', id, 'The game has no ' + (t.kind || 'satchel item') + ' “' + id + '”.');
    }
    for (const [id, f] of G.sorted(lib.interest)) if (built(f) && !item(f.item)) bad('interest', id, '“' + f.item + '” is not an item in the game.');
    return out;
  };

  /** Counts for reports: { section: { built, planned } }. */
  G.libraryCounts = function (lib) {
    const out = {};
    for (const s of ['types', 'rooms', 'looks', 'monsters', 'encounters', 'locks', 'traps', 'puzzles', 'interest']) {
      const v = Object.values(lib[s] || {});
      out[s] = { built: v.filter((e) => (e.status || 'built') === 'built').length, planned: v.filter((e) => e.status === 'planned').length };
    }
    out.treasure = { built: Object.keys((lib.treasure || {}).items || {}).length, planned: 0 };
    out.dressings = { built: Object.values(lib.dressings || {}).reduce((s, p) => s + p.length, 0), planned: 0 };
    return out;
  };

  // ------------------------------------------------------------ picking from lists
  /** Entries of a section that are built and fit a Threat Level, sorted by id. */
  G.usable = (lib, sec, tl) => G.sorted(lib[sec]).filter(([, e]) => (e.status || 'built') === 'built' && G.inRange(e.tl, tl));
  /** A text-pool line: G.say(lib, rng, 'posters.corporate', vars). Pool entries are strings or { title, text }. */
  G.say = function (lib, rng, key, vars) {
    const pool = G.textPool(lib, key);
    if (!pool.length) return null;
    const v = rng.pick(pool);
    if (typeof v === 'string') return G.fill(v, vars);
    const o = {};
    for (const [k, s] of Object.entries(v)) o[k] = typeof s === 'string' ? G.fill(s, vars) : s;
    return o;
  };
  G.textPool = function (lib, key) {
    let v = lib.text;
    for (const part of String(key).split('.')) v = v && v[part];
    return Array.isArray(v) ? v : [];
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
