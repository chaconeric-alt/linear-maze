// The installation generator, from the command line (the editor's Installations page does the same).
//
//   node tools/generate.mjs havenot --type wonder-office --tl 2 --floors 3 --seed 41 --slug reified
//       generate one installation and write it as a pack: games/havenot/packs/hn-g-<slug>/
//   ... --replaces bunker        it takes over that stub's pin (and the stub's level leaves the manifest with --add)
//   ... --add                    also add the pack to the game's manifest and to gen/corpus.json
//   ... --dry                    generate and check, write nothing (prints the report)
//   node tools/generate.mjs havenot --brief bunker --add
//       a brief from games/havenot/gen/briefs/bunker.json: type, seed, title, story, words; options still win
//   node tools/generate.mjs havenot --batch 100 [--type t] [--tl n] [--size s] [--floors n]
//       generate many seeds without writing; prints failures and how budgets spread
//   node tools/generate.mjs havenot --check <slug>      re-validate a written installation from its generation.json
//   node tools/generate.mjs havenot --library           check the library against the game and print LIBRARY-REPORT.md
//   node tools/generate.mjs havenot --types             list the installation types
//
// No dependencies: the game's own scripts are run in a Node vm with a small stand-in for the DOM,
// so the generator sees exactly the registry the game has.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const MF = require(join(root, 'engine/manifest.js'));
const read = (p) => readFileSync(join(root, p), 'utf8');

// ------------------------------------------------------------ the generator core
const G = require(join(root, 'editor/gen/core.js'));
for (const f of G.FILES.slice(1)) require(join(root, 'editor/gen', f));

// ------------------------------------------------------------ the game, loaded in a vm
export async function loadGame(id) {
  const host = {
    async game(g) { return MF.read(read('games/' + g + '/game.js'), 'game'); },
    async pack(g, p) { return MF.read(read(MF.packDir(g, p) + 'pack.js'), 'pack'); },
  };
  const plan = await MF.plan(id, host);
  const any = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : any()), apply: () => any(), construct: () => any(), set: () => true });
  const doc = { createElement: () => any(), createElementNS: () => any(), createTextNode: () => any(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, head: any(), body: any(), documentElement: any(), currentScript: null, fonts: { ready: Promise.resolve() } };
  const win = { document: doc, addEventListener() {}, removeEventListener() {}, requestAnimationFrame() {}, performance: { now: () => 0 }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { userAgent: 'node' }, devicePixelRatio: 1, innerWidth: 1000, innerHeight: 620, location: { search: '' }, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {}, info() {} }, Image: function () { return any(); }, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  win.window = win;
  win.self = win;
  const ctx = vm.createContext(win);
  const errors = [];
  const run = (p) => {
    try {
      vm.runInContext(read(p), ctx, { filename: p });
    } catch (e) {
      errors.push(p + ': ' + e.message);
    }
  };
  for (const s of MF.shellScripts(read('engine/index.html'))) if (s !== 'loader.js') run('engine/' + s);
  run('games/' + id + '/game.js');
  for (const s of plan.scripts) run(s);
  return { LM: win.LM, plan, errors };
}

export function loadLibrary(game) {
  const dir = join(root, 'games', game, 'gen', 'library');
  if (!existsSync(dir)) throw new Error('No library at games/' + game + '/gen/library/');
  const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  return G.libraryFromSources(game, files.map((f) => ({ name: f, text: readFileSync(join(dir, f), 'utf8') })));
}

export function writeFiles(files) {
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), text);
  }
}

/** Add a generated pack to the game's manifest (and take a replaced stub's level out), and to the corpus. */
export function addToGame(game, plan, lib) {
  const gfile = 'games/' + game + '/game.js';
  const manifest = MF.read(read(gfile), 'game');
  const packId = lib.settings.packPrefix + plan.slug;
  const packs = manifest.packs.slice();
  if (!packs.some((p) => (typeof p === 'string' ? p : p.pack) === 'hn-gen-kit')) packs.push('hn-gen-kit');
  if (!packs.some((p) => (typeof p === 'string' ? p : p.pack) === packId)) packs.push(packId);
  if (plan.brief.replaces) {
    const stubFile = { bunker: 'levels/bunker.js', warren: 'levels/warren.js', bolthole: 'levels/bolthole.js' }[plan.brief.replaces];
    const i = packs.findIndex((p) => (typeof p === 'string' ? p : p.pack) === 'hn-stubs');
    if (stubFile && i >= 0) {
      const e = typeof packs[i] === 'string' ? { pack: 'hn-stubs', exclude: [] } : Object.assign({ exclude: [] }, packs[i]);
      if (!e.exclude.includes(stubFile)) e.exclude.push(stubFile);
      packs[i] = e;
    }
  }
  manifest.packs = packs;
  const old = read(gfile);
  const head = (old.match(/^\/\*[\s\S]*?\*\/\n/) || [''])[0];
  writeFileSync(join(root, gfile), head + MF.gameFile(manifest).replace(/^\/\*[\s\S]*?\*\/\n/, ''));
  const cfile = join(root, 'games', game, 'gen', 'corpus.json');
  const corpus = existsSync(cfile) ? JSON.parse(readFileSync(cfile, 'utf8')) : { installations: [] };
  corpus.installations = corpus.installations.filter((c) => c.slug !== plan.slug);
  corpus.installations.push({ slug: plan.slug, title: plan.concept.title, type: plan.brief.type, tl: plan.brief.tl, floors: plan.floors.length, size: plan.brief.size, seed: plan.brief.seed, replaces: plan.brief.replaces || null, status: 'in game', library: plan.libHash, date: plan.brief.date || null });
  writeFileSync(cfile, JSON.stringify(corpus, null, 2) + '\n');
}

// ------------------------------------------------------------ command line
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
};
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const game = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--')) || 'havenot';
  const lib = loadLibrary(game);
  const t0 = Date.now();
  const { LM, errors } = await loadGame(game);
  if (errors.length) console.warn('Loading the game: ' + errors.join('; '));
  const reg = G.registryOf(LM);
  if (opt('types')) {
    for (const [id, t] of G.sorted(lib.types)) console.log(id.padEnd(16) + t.name + '  (floors ' + t.floors.join('–') + ')');
  } else if (opt('library')) {
    const probs = G.checkLibrary(lib, reg);
    const counts = G.libraryCounts(lib);
    console.log(libraryReport(lib, counts, probs));
    if (opt('write')) writeFileSync(join(root, 'games', game, 'gen', 'LIBRARY-REPORT.md'), libraryReport(lib, counts, probs));
  } else if (opt('batch')) {
    const n = Number(opt('batch')) || 50;
    const types = opt('type') ? [opt('type')] : Object.keys(lib.types).sort();
    const tls = opt('tl') ? [Number(opt('tl'))] : [1, 2, 3, 4, 6];
    const sizes = opt('size') ? [opt('size')] : ['small', 'standard', 'large'];
    let fails = 0, total = 0;
    const spread = {};
    for (let i = 0; i < n; i++) {
      const brief = { type: types[i % types.length], tl: tls[i % tls.length], size: sizes[i % sizes.length], floors: Number(opt('floors')) || 1 + (i % 3), seed: 'batch' + i };
      total++;
      const res = G.generate(brief, lib, reg);
      if (opt('verbose')) for (const f of res.failures || []) console.log('  retried ' + JSON.stringify(brief) + ' ' + f);
      if (!res.ok) {
        fails++;
        console.log('FAIL ' + JSON.stringify(brief) + ': ' + (res.error ? res.error.message : res.problems.filter((p) => p.level === 'bad').map((p) => p.text).join('; ')));
        continue;
      }
      const p = res.plan;
      const k = brief.type;
      const s = (spread[k] = spread[k] || { n: 0, tries: 0, rooms: [], w: [], h: [], treasure: [], monsters: [], warnings: 0 });
      s.n++;
      s.tries += res.attempt;
      for (const f of p.floors) {
        s.rooms.push(f.rooms.length);
        s.w.push(f.layout.w);
        s.h.push(f.layout.h);
        s.treasure.push(f.treasure.spent / f.treasure.target);
        s.monsters.push(f.encounter.spent / f.encounter.budget);
      }
      s.warnings += res.problems.filter((q) => q.level === 'warn').length;
    }
    const st = (a) => (a.length ? Math.min(...a).toFixed(2) + '–' + Math.max(...a).toFixed(2) + ' (avg ' + (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) + ')' : '');
    for (const [k, s] of Object.entries(spread)) console.log(k.padEnd(14) + ' ok ' + s.n + ', retries ' + s.tries + ', rooms ' + st(s.rooms) + ', w ' + st(s.w) + ', h ' + st(s.h) + ', treasure/target ' + st(s.treasure) + ', monsters/budget ' + st(s.monsters) + ', warnings ' + s.warnings);
    console.log(total - fails + '/' + total + ' passed in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
    process.exitCode = fails ? 1 : 0;
  } else if (opt('check')) {
    const slug = opt('check');
    const rec = JSON.parse(readFileSync(join(root, 'games', game, 'packs', lib.settings.packPrefix + slug, 'generation.json'), 'utf8'));
    rec.registry = reg;
    for (const f of rec.floors) f.lockById = Object.fromEntries(rec.locks.filter((l) => l.floor === f.n).map((l) => [l.id, l]));
    const v = G.stageValidate(rec, lib);
    console.log(v.ok ? 'OK' : 'PROBLEMS', JSON.stringify(v.problems, null, 1));
    process.exitCode = v.ok ? 0 : 1;
  } else {
    const brief = {
      type: opt('type'), tl: opt('tl'), tlStep: opt('tl-step'), anyFloors: opt('any-floors') ? 1 : undefined, floors: opt('floors'), size: opt('size'), seed: opt('seed'), slug: opt('slug'), title: opt('title') === true ? undefined : opt('title'),
      replaces: opt('replaces') === true ? undefined : opt('replaces'), looks: opt('looks') && opt('looks') !== true ? String(opt('looks')).split(',') : [],
      date: new Date().toISOString().slice(0, 10),
    };
    if (opt('pin')) brief.pinAt = String(opt('pin')).split(',').map(Number);
    for (const k of Object.keys(brief)) if (brief[k] === undefined || brief[k] === true || (Array.isArray(brief[k]) && !brief[k].length)) delete brief[k];
    // a brief file (games/<game>/gen/briefs/*.json) gives the rest; options on the command line win
    if (opt('brief') && opt('brief') !== true) {
      const file = String(opt('brief'));
      const path = existsSync(join(root, file)) ? join(root, file) : join(root, 'games', game, 'gen', 'briefs', file.replace(/\.json$/, '') + '.json');
      const fromFile = JSON.parse(readFileSync(path, 'utf8'));
      delete fromFile.$comment;
      for (const [k, v] of Object.entries(fromFile)) if (!(k in brief) || k === 'date') brief[k] = v;
      brief.date = new Date().toISOString().slice(0, 10);
    }
    const res = G.generate(brief, lib, reg);
    if (!res.ok) {
      console.error('Generation failed: ' + (res.error ? res.error.stack : res.problems.map((p) => p.text).join('\n')));
      process.exit(1);
    }
    if (opt('verbose')) for (const f of res.failures || []) console.log('retried: ' + f);
    const files = G.emitFiles(res.plan, lib);
    console.log(files[Object.keys(files).find((f) => f.endsWith('REPORT.md'))]);
    if (!opt('dry')) {
      writeFiles(files);
      console.log('Wrote ' + Object.keys(files).length + ' files under games/' + game + '/packs/' + lib.settings.packPrefix + res.plan.slug + '/');
      if (opt('add')) {
        addToGame(game, res.plan, lib);
        console.log('Added it to games/' + game + '/game.js and gen/corpus.json.');
      }
    }
  }
}

function libraryReport(lib, counts, probs) {
  const L = ['# HaveNot generator library', '', 'What the generator can place today (built) and what is listed from the books for later (planned). Regenerate with `node tools/generate.mjs havenot --library --write`.', ''];
  L.push('| Section | Built | Planned |', '| --- | --- | --- |');
  for (const [k, c] of Object.entries(counts)) L.push('| ' + k + ' | ' + c.built + ' | ' + c.planned + ' |');
  L.push('', '## Problems', '');
  if (!probs.length) L.push('None: every built entry names something the game has.');
  for (const p of probs) L.push('- ' + (p.level === 'bad' ? '**' + p.section + ' / ' + p.id + ':** ' : p.section + ' / ' + p.id + ': ') + p.text);
  L.push('', '## Planned, by section', '');
  for (const sec of ['looks', 'monsters', 'traps', 'puzzles', 'locks', 'encounters', 'interest']) {
    const planned = G.sorted(lib[sec]).filter(([, e]) => e.status === 'planned');
    if (!planned.length) continue;
    L.push('**' + sec + ':** ' + planned.map(([id, e]) => (e.name || id) + (e.ref ? ' (' + e.ref + ')' : '')).join('; ') + '.', '');
  }
  L.push('## Worth building next', '');
  L.push('The ten planned entries that would add the most variety, in order:', '');
  const next = [
    ['looks / crypt', 'Tombs currently borrow the bulkhead look; a stone-and-arches painter makes the tomb type look like itself.'],
    ['looks / toxic-waste', 'Gives the toxin plant and the labs their own look: glowing barrels, sealed doors, a breathing hazard.'],
    ['puzzles / hangman-terminal', 'A real logic puzzle for optional vaults (Vol 2 p. 140); data-driven, cheap to build.'],
    ['traps / flame-jets', 'The first trial (Vol 2 p. 145): obvious, timed, with an off-switch on the far side.'],
    ['monsters / fungoids', 'A sleeper-spawner bio-weapon for labs; adds a fight that changes on round two.'],
    ['monsters / dust-spiders', 'A colony with a nest full of loot: a treasure set piece as well as a fight.'],
    ['locks / secret-door', 'Optional rooms found by the Sense stat or a terminal (Vol 2 p. 68).'],
    ['monsters / cyberspine', 'A proper sleeper boss for security floors (TL 4+).'],
    ['interest / teleport-console', 'Shortcuts between consoles; makes large floors faster on the way back.'],
    ['monsters / hn-sphinx', 'A generic riddle console would let the generator place Sphinx Guns with any slogan.'],
  ];
  next.forEach(([k, why], i) => L.push(i + 1 + '. **' + k + '**: ' + why));
  L.push('');
  return L.join('\n');
}
