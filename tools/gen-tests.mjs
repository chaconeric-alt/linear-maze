// Tests for the installation generator. No dependencies: node tools/gen-tests.mjs [game] [--quick]
//
//   library      the library names nothing the game lacks
//   determinism  the same brief gives the same plan and the same files, twice over
//   corpus       every generated pack in the game regenerates byte for byte from its generation.json
//   batch        many briefs across types, Threat Levels, sizes and floor counts all pass their checks
//   graph        keys sit outside what their lock guards; rooms don't overlap; doors are doors
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
