// Tests for the installation generator. No dependencies: node tools/gen-tests.mjs [game] [--quick]
//
//   content      outside content libraries validate, are imported and current, and the validator catches errors
//   library      the library names nothing the game lacks
//   determinism  the same brief gives the same plan and the same files, twice over
//   corpus       every generated pack in the game regenerates byte for byte from its generation.json
//   batch        many briefs across types, Threat Levels, sizes and floor counts all pass their checks
//   graph        keys sit outside what their lock guards; rooms don't overlap; doors are doors
//   functional   functional rooms: sizes, settings modes, density, hazards, eras, libraries, completeness, seeds
//   reroll       rerolling treasure changes treasure and nothing it shouldn't
//
// Exits 1 if anything fails.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadGame, loadLibrary } from './generate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const G = createRequire(import.meta.url)(join(root, 'editor/gen/core.js'));
const args = process.argv.slice(2);
const game = args.find((a) => !a.startsWith('--')) || 'havenot';
const quick = args.includes('--quick');

let failed = 0, passed = 0;
const check = (name, ok, detail) => {
  if (ok) passed++;
  else {
    failed++;
    console.log('  FAIL ' + name + (detail ? ': ' + detail : ''));
  }
};
const section = (name) => console.log(name);

const lib = loadLibrary(game);
const { LM, errors } = await loadGame(game);
if (errors.length) console.log('(loading the game: ' + errors.join('; ') + ')');
const reg = G.registryOf(LM);
const types = Object.keys(lib.types).sort();

// ------------------------------------------------------------ content libraries (gen/library/<name>/: source + companion)
section('content');
const libDir = join(root, 'games', game, 'gen', 'library');
for (const name of existsSync(libDir) ? readdirSync(libDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []) {
  const dir = join(libDir, name);
  const srcName = readdirSync(dir).find((f) => f.endsWith('.json') && f !== 'companion.json');
  if (!srcName || !existsSync(join(dir, 'companion.json'))) continue;
  const src = JSON.parse(readFileSync(join(dir, srcName), 'utf8'));
  const comp = JSON.parse(readFileSync(join(dir, 'companion.json'), 'utf8'));
  if (comp.extends) comp.base = JSON.parse(readFileSync(join(libDir, comp.extends, 'companion.json'), 'utf8'));
  const probs = G.validateContent(src, comp);
  check(name + ' validates', !probs.some((p) => p.level === 'bad'), probs.filter((p) => p.level === 'bad').slice(0, 3).map((p) => p.id + ' ' + p.text).join('; '));
  const c = (lib.content || {})[name];
  check(name + ' is imported (run tools/import-content.mjs)', !!c);
  if (c) {
    const fresh = G.CONTENT_ADAPTERS[comp.format](src, comp);
    check(name + ' import is up to date with its source and companion', JSON.stringify(fresh) === JSON.stringify(c));
    for (const s of ['settings', 'tiles', 'rooms', 'furniture', 'interactables', 'loot', 'hazards']) check(name + ': every ' + s + ' record registered', (src[s] || []).every((r) => c[s][r.id || r.room_id || r.setting_id]), s);
    for (const r of Object.values(c.rooms)) for (const n of [].concat(r.mandatory_features || [], r.optional_furnishings || [])) if (!c.objects[n]) check(name + ' ' + r.id + ' object ' + n, false);
    for (const r of Object.values(c.rooms)) for (const [f, s] of [['furniture_record', 'furniture'], ['interactive_record', 'interactables'], ['loot_record', 'loot'], ['hazard_record', 'hazards']]) if (r[f] && !c[s][r[f]]) check(name + ' ' + r.id + ' ' + f + ' ' + r[f], false);
    for (const r of Object.values(c.rooms)) for (const t of [].concat(r.floor_tile_pool || [], r.wall_tile_pool || [], r.lighting_pool || [])) if (!(c.tiles[t] && c.tiles[t].style)) check(name + ' ' + r.id + ' tile ' + t + ' drawn', false);
    for (const o of Object.keys(c.objects)) if (c.objects[o].fallback) check(name + ' object “' + o + '” has a drawing family', false);
  }
  // the validator catches what it should: a broken copy
  const broken = JSON.parse(JSON.stringify(src));
  if (broken.rooms && broken.rooms.length > 1) {
    broken.rooms[0].setting_id = 'SET_NOPE';
    for (const k of ['id', 'room_id']) if (broken.rooms[0][k]) broken.rooms[1][k] = broken.rooms[0][k];
    broken.rooms[0].frequency_weight = -1;
    if (broken.tiles && broken.tiles[0]) broken.tiles[0].description = 'unpaintable nothing';
    else if (broken.rooms[2].floor_tiles) broken.rooms[2].floor_tiles = ['FLOOR_UNPAINTABLE_NOTHING'];
    const bp = G.validateContent(broken, comp).filter((p) => p.level === 'bad').map((p) => p.text).join(' | ');
    check(name + ': validator finds a bad foreign key', /no such setting/.test(bp));
    check(name + ': validator finds a duplicate id', /duplicate id/.test(bp));
    check(name + ': validator finds a bad weight', /not a positive weight/.test(bp));
    check(name + ': validator finds missing graphics', /missing graphics/.test(bp));
  }
}

// ------------------------------------------------------------ library
section('library');
const probs = G.checkLibrary(lib, reg).filter((p) => p.level === 'bad');
check('no bad entries', !probs.length, probs.map((p) => p.section + '/' + p.id + ' ' + p.text).join('; '));

// ------------------------------------------------------------ determinism
section('determinism');
const briefs = types.map((type, i) => ({ type, tl: 1 + (i % 4), floors: 1 + (i % 3), size: ['small', 'standard', 'large'][i % 3], seed: 'det' + i, date: '2000-01-01' }));
for (const b of briefs) {
  const a = G.generate(b, lib, reg), c = G.generate(b, lib, reg);
  check(b.type + ' generates', a.ok && c.ok, a.ok ? '' : (a.problems || []).map((p) => p.text).join('; '));
  if (!a.ok || !c.ok) continue;
  check(b.type + ' same plan', JSON.stringify(G.record(a.plan)) === JSON.stringify(G.record(c.plan)));
  const fa = G.emitFiles(a.plan, lib), fc = G.emitFiles(c.plan, lib);
  check(b.type + ' same files', JSON.stringify(fa) === JSON.stringify(fc));
}

// ------------------------------------------------------------ corpus: what's in the game regenerates exactly
section('corpus');
const packsDir = join(root, 'games', game, 'packs');
const cfile = join(root, 'games', game, 'gen', 'corpus.json');
const corpus = existsSync(cfile) ? JSON.parse(readFileSync(cfile, 'utf8')).installations || [] : [];
for (const dir of readdirSync(packsDir).filter((d) => d.startsWith(lib.settings.packPrefix)).sort()) {
  const gj = join(packsDir, dir, 'generation.json');
  if (!existsSync(gj)) continue;
  const rec = JSON.parse(readFileSync(gj, 'utf8'));
  // a pack whose maps were edited by hand is the game's now: it isn't expected to match a fresh generation
  if ((corpus.find((c) => c.slug === rec.slug) || {}).status === 'edited') continue;
  const res = G.generate(rec.brief, lib, reg, { words: rec.words });
  check(dir + ' regenerates', res.ok, res.ok ? '' : (res.problems || []).map((p) => p.text).join('; '));
  if (!res.ok) continue;
  const files = G.emitFiles(res.plan, lib);
  const differ = Object.entries(files).filter(([p, text]) => !existsSync(join(root, p)) || readFileSync(join(root, p), 'utf8') !== text).map(([p]) => p);
  check(dir + ' matches its files', !differ.length, differ.length ? differ.join(', ') + (rec.libHash !== lib.hash ? ' (the library changed since: ' + rec.libHash + ' → ' + lib.hash + ')' : '') : '');
}

// ------------------------------------------------------------ batch and graph properties
section('batch and graph');
const n = quick ? 35 : 140;
const tls = [1, 2, 3, 4, 6];
let ok = 0;
const fails = [];
for (let i = 0; i < n; i++) {
  const b = { type: types[i % types.length], tl: tls[i % tls.length], size: ['small', 'standard', 'large'][i % 3], floors: 1 + (i % 3), seed: 'test' + i };
  const res = G.generate(b, lib, reg);
  if (!res.ok) {
    fails.push(JSON.stringify(b) + ' ' + (res.problems || []).filter((p) => p.level === 'bad').map((p) => p.text).join('; '));
    continue;
  }
  ok++;
  graphProps(res.plan, b);
}
check(n + ' briefs pass', ok === n, fails.slice(0, 5).join(' | '));

function graphProps(plan, b) {
  const tag = b.type + '/' + b.seed;
  const [mw, mh] = lib.settings.mapMax || [72, 48];
  for (const f of plan.floors) {
    const rooms = f.rooms;
    check(tag + ' f' + f.n + ' fits the map', f.layout.w <= mw && f.layout.h <= mh, f.layout.w + '×' + f.layout.h);
    check(tag + ' f' + f.n + ' path runs entry to exit', f.path[0] === 0 && rooms[f.path[f.path.length - 1]] && rooms[f.path[f.path.length - 1]].critical !== false);
    // no two rooms share a tile
    let overlap = null;
    for (let i = 0; i < rooms.length && !overlap; i++) for (let j = i + 1; j < rooms.length; j++) {
      const [ax, ay, aw, ah] = rooms[i].rect, [bx, by, bw, bh] = rooms[j].rect;
      if (ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah) {
        overlap = rooms[i].id + '/' + rooms[j].id;
        break;
      }
    }
    check(tag + ' f' + f.n + ' rooms apart', !overlap, overlap);
    // every door of every edge is a doorway on the map
    const notDoor = f.edges.flatMap((e) => e.doors).filter(([x, y]) => f.layout.cells[y][x] !== '+');
    check(tag + ' f' + f.n + ' doors are doorways', !notDoor.length, JSON.stringify(notDoor.slice(0, 3)));
    // a key is never behind the door it opens
    for (const L of plan.locks.filter((l) => l.floor === f.n && l.keyRoom != null && l.to != null)) {
      const behind = new Set();
      const walk = (i) => {
        behind.add(i);
        for (const k of rooms[i].kids || []) walk(k);
      };
      walk(L.to);
      check(tag + ' f' + f.n + ' ' + L.id + ' key outside its lock', !behind.has(L.keyRoom));
      if (L.clueRoom != null) check(tag + ' f' + f.n + ' ' + L.id + ' clue outside its lock', !behind.has(L.clueRoom));
    }
  }
}

// ------------------------------------------------------------ functional rooms from the settings libraries
// The variations the development prompt asks for (14.3): small and large, one setting and mixed, sparse and
// crowded, few and many hazards, both eras, each library alone, the classic generator; and what must hold in all.
section('functional rooms');
{
  const C = G.contentOf(lib);
  const types7 = types;
  const gen = (extra, i) => {
    const b = Object.assign({ type: types7[i % types7.length], tl: 1 + (i % 4), floors: 2, size: 'large', seed: 'fn' + i, date: '2000-01-01' }, extra);
    const res = G.generate(b, lib, reg);
    return res.ok ? res.plan : null;
  };
  const fnRooms = (plan) => plan.floors.flatMap((f) => f.rooms.filter((r) => r.fn).map((r) => ({ f, r })));
  const objsIn = (f, r) => Object.values(f.objs).filter((o) => o.room === r.i);
  const count = (plans, pred) => plans.reduce((n, pl) => n + fnRooms(pl).filter(pred).length, 0);
  const N = quick ? 4 : 10;
  const batch = (extra) => Array.from({ length: N }, (_, i) => gen(extra, i)).filter(Boolean);
  // generates, with functional rooms, at every size
  for (const size of ['small', 'standard', 'large']) {
    const ps = batch({ size, functional: 0.5 });
    check('functional: ' + size + ' installations generate', ps.length === N);
    check('functional: ' + size + ' installations have functional rooms', count(ps, () => true) > 0);
  }
  // off, and the classic generator, have none
  check('functional: off gives none', count(batch({ functional: false }), () => true) === 0);
  check('functional: classic (preserveOld) gives none', count(batch({ preserveOld: true }), () => true) === 0);
  // the default rate is about a quarter of the rooms that may be functional
  {
    const ps = batch({});
    const all = ps.reduce((n, pl) => n + pl.floors.reduce((m, f) => m + f.rooms.length, 0), 0), fn = count(ps, () => true);
    check('functional: default rate near a quarter', fn / all > 0.08 && fn / all < 0.4, Math.round((100 * fn) / all) + '%');
  }
  // one setting: the chosen one leads; mixed and chaotic bring others in
  for (const lib1 of ['settings10', 'settings10b']) {
    const Cl = G.contentOf(lib, lib1), set = Object.keys(Cl.settings).sort()[3];
    const ps = batch({ functional: 0.6, library: lib1, settings: { mode: 'single', dominant: set } });
    const n = count(ps, () => true), main = count(ps, ({ r }) => r.fn.setting === set);
    check('functional: ' + lib1 + ' alone uses only its rooms', count(ps, ({ r }) => !Cl.rooms[r.fn.id]) === 0);
    check('functional: ' + lib1 + ' one setting leads (' + set + ')', main / n > 0.45, main + '/' + n);
  }
  {
    const ps = batch({ functional: 0.6, settings: { mode: 'chaotic' } });
    const sets = new Set(ps.flatMap((pl) => fnRooms(pl).map(({ r }) => r.fn.setting)));
    check('functional: chaotic installations mix many settings', sets.size >= 8, sets.size + ' settings');
  }
  // density: crowded rooms hold more than sparse ones
  {
    const avg = (d) => {
      const ps = batch({ functional: 0.6, density: d });
      const rs = ps.flatMap(fnRooms);
      return rs.reduce((n, { f, r }) => n + objsIn(f, r).filter((o) => o.item === 'hn-s10').length / G.roomCells(r).length, 0) / (rs.length || 1);
    };
    const sp = avg('sparse'), cr = avg('crowded');
    check('functional: crowded rooms fuller than sparse', cr > sp * 1.15, 'sparse ' + sp.toFixed(3) + ', crowded ' + cr.toFixed(3) + ' pieces a cell');
  }
  // hazards: many more when asked for
  {
    const hz = (p) => count(batch({ functional: 0.6, frequencies: { probability_room_hazard: p } }), ({ f, r }) => objsIn(f, r).some((o) => o.item === 'hn-hazard'));
    const lo = hz(0.05), hi = hz(0.6);
    check('functional: high-hazard installations have more hazards', hi > lo * 2, lo + ' → ' + hi);
  }
  // era emphasis: the leading setting is of that era more often
  for (const era of ['Age of Wonders', 'Age of War']) {
    const ps = batch({ functional: 0.4, era });
    const of = ps.filter((pl) => String((C.settings[pl.functions.dominant] || {}).era || '').includes(era)).length;
    check('functional: era emphasis ' + era + ' leads', of / ps.length >= 0.5, of + '/' + ps.length);
  }
  // in every functional room: its records resolve, its required pieces are there or recorded as not fitting, and
  // its pieces have drawings
  {
    const ps = batch({ functional: 0.7 });
    let bad = [];
    for (const pl of ps) for (const { f, r } of fnRooms(pl)) {
      const rec = C.rooms[r.fn.id];
      if (!rec) { bad.push(r.fn.id + ' unknown'); continue; }
      const got = new Set(objsIn(f, r).map((o) => o.props && o.props.name));
      for (const m of (rec.mandatory_features || []).slice(0, 2)) if (!got.has(m) && !(r.fn.missing || []).includes(m)) bad.push(r.fn.id + ' lost ' + m);
      for (const o of objsIn(f, r)) if (o.item === 'hn-s10' && !C.objects[o.props.name] && !['chair', 'drone'].includes(o.props.fam)) bad.push(r.fn.id + ' undrawn ' + o.props.name);
      for (const t of [r.fn.floor, r.fn.wall, r.fn.light]) if (t && !(C.tiles[t] && C.tiles[t].style)) bad.push(r.fn.id + ' tile ' + t);
    }
    check('functional: every room complete and drawable', !bad.length, bad.slice(0, 5).join('; '));
  }
  // a library's setting pieces (library B's three per room template per setting): every one is placed somewhere
  // when each room type is generated, crowded, with up to ten seeds
  for (const name of Object.keys(lib.content || {})) {
    const Cl = lib.content[name];
    const want = new Set(Object.entries(Cl.objects || {}).filter(([, o]) => o.home).map(([n]) => n));
    if (!want.size || quick) continue;
    const placed = new Set();
    for (const id of Object.keys(Cl.rooms).sort()) {
      const own = Cl.rooms[id].setting_pieces || [];
      for (let t = 0; t < 10 && !own.every((n) => placed.has(n)); t++) {
        const res = G.generate({ type: types7[t % types7.length], tl: 2, floors: 1, size: 'large', seed: 'pc' + id + t, date: '2000-01-01', library: name, functional: 1, functionPool: [id], density: 'crowded' }, lib, reg);
        if (!res.ok) continue;
        for (const f of res.plan.floors) for (const r of f.rooms) if (r.fn && r.fn.id === id) for (const o of Object.values(f.objs)) if (o.room === r.i && o.props && o.props.name) placed.add(o.props.name);
      }
    }
    const missing = [...want].filter((n) => !placed.has(n));
    check('functional: ' + name + ' every setting piece placed (' + want.size + ')', !missing.length, missing.slice(0, 6).join(', '));
  }
  // the same brief, twice: the same functional rooms and the same pieces in the same places
  {
    const b = { type: types7[2], tl: 3, floors: 2, size: 'large', seed: 'fn-det', date: '2000-01-01', functional: 0.6, settings: { mode: 'mixed' }, density: 'crowded' };
    const a1 = G.generate(b, lib, reg), a2 = G.generate(b, lib, reg);
    check('functional: deterministic', a1.ok && a2.ok && JSON.stringify(G.emitFiles(a1.plan, lib)) === JSON.stringify(G.emitFiles(a2.plan, lib)));
  }
}

// ------------------------------------------------------------ reroll
section('reroll');
{
  const res = G.generate({ type: 'war-bunker', tl: 2, floors: 2, seed: 'reroll' }, lib, reg);
  check('base generates', res.ok);
  if (res.ok) {
    const before = G.record(res.plan);
    const rr = G.rerun(res.plan, lib, reg, 'treasure');
    check('reroll passes', rr.ok, (rr.problems || []).filter((p) => p.level === 'bad').map((p) => p.text).join('; '));
    if (rr.ok) {
      const after = G.record(rr.plan);
      check('layout kept', JSON.stringify(before.floors.map((f) => f.layout.cells)) === JSON.stringify(after.floors.map((f) => f.layout.cells)));
      check('locks kept', JSON.stringify(before.locks.map((l) => [l.id, l.keyRoom])) === JSON.stringify(after.locks.map((l) => [l.id, l.keyRoom])));
      const enemies = (p) => JSON.stringify(p.floors.map((f) => Object.entries(f.objs).filter(([, o]) => o.enemy).map(([k, o]) => k + o.enemy)));
      check('monsters kept', enemies(before) === enemies(after));
      const loot = (p) => JSON.stringify(p.floors.map((f) => Object.values(f.objs).filter((o) => o.container).map((o) => o.props.loot)));
      check('treasure changed', loot(before) !== loot(after));
    }
  }
}

console.log((failed ? failed + ' failed, ' : 'All ') + passed + ' passed.');
process.exitCode = failed ? 1 : 0;
