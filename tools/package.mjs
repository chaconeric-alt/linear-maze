// Package a game for players: the engine plus that game's files, and nothing else.
//   node tools/package.mjs linear-maze          one game
//   node tools/package.mjs --all                every game in games/games.js
//   node tools/package.mjs dead-signal --out somewhere/else
// For each game it writes, under dist/ (or --out):
//   <id>/                  a folder to zip and hand out: index.html, engine/, games/<id>/ and only
//                          the packs the game loads (from any game), with wildcards spelled out
//   <id>.html              the same game as one standalone file (open it or host it anywhere)
//   <id>.artifact.html     that file without its <html>/<head>/<body>, for a claude.ai Artifact
// The editor's Settings page does the same thing without Node.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MF = createRequire(import.meta.url)(join(root, 'engine/manifest.js'));
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const outDir = outAt >= 0 ? args[outAt + 1] : join(root, 'dist');
const named = args.filter((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1));

const read = (p) => readFileSync(join(root, p), 'utf8');
const readMaybe = (p) => (existsSync(join(root, p)) ? read(p) : null);
const host = {
  async game(id) {
    if (!existsSync(join(root, 'games', id, 'game.js'))) throw new Error('games/' + id + '/game.js is missing');
    return MF.read(read('games/' + id + '/game.js'), 'game');
  },
  async pack(game, pack) {
    return MF.read(read(MF.packDir(game, pack) + 'pack.js'), 'pack');
  },
};
function gameList() {
  let ids = [];
  const t = readMaybe('games/games.js');
  if (t) {
    const w = {};
    new Function('window', t)(w);
    ids = (w.LM && w.LM.gameList) || [];
  }
  return ids;
}
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';

export async function packageGame(id, out = outDir) {
  const plan = await MF.plan(id, host);
  for (const p of plan.problems) console.warn('  warning: ' + p);
  const shell = read('engine/index.html');
  const title = plan.game.title || id;
  const setTitle = (html) => html.replace(/<title>[^<]*<\/title>/, '<title>' + title.replace(/</g, '&lt;') + '</title>');

  // ---- one file
  const scripts = ['games/' + id + '/game.js', ...plan.scripts, ...(plan.runtime ? [plan.runtime] : []), ...plan.editor];
  const page = setTitle(MF.inlinePage({
    shell,
    read: (p) => (plan.editor.includes(p) ? readMaybe(p) : read(p)),
    scripts,
    start: 'LM.start(' + JSON.stringify(id) + ');',
  }));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, id + '.html'), page);
  writeFileSync(join(out, id + '.artifact.html'), MF.artifactPage(page));

  // ---- a folder
  const dir = join(out, id);
  rmSync(dir, { recursive: true, force: true });
  let count = 0;
  const put = (p, text) => {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
    count++;
  };
  const copy = (p) => put(p, read(p));
  copy('engine/index.html');
  for (const s of MF.shellScripts(shell)) copy('engine/' + s);
  copy('engine/editor-runtime.js');
  const manifest = Object.assign({}, plan.game, { packs: MF.explicitPacks(plan) });
  put('games/' + id + '/game.js', MF.gameFile(manifest));
  for (const p of plan.editor) if (readMaybe(p) != null) copy(p);
  for (const p of plan.packs) {
    copy(MF.packDir(p.game, p.pack) + 'pack.js');
    for (const f of p.files) copy(f);
  }
  put('games/games.js', MF.gamesFile([id]));
  put('index.html', setTitle(MF.rootPage(shell, id)));
  put('README.txt', [
    title + (plan.game.version ? ' ' + plan.game.version : ''),
    '',
    plan.game.description || '',
    '',
    'To play, open index.html in a browser (Chrome, Edge, Firefox or Safari). It needs a keyboard and mouse.',
    'Made with the Linear Maze engine (engine/). The game itself is in games/' + id + '/.',
    '',
  ].join('\n'));
  console.log(title + ': ' + join(out, id) + '/ (' + plan.packs.length + ' packs, ' + count + ' files) and ' + id + '.html (' + kb(page) + ')');
  return { plan, page };
}

if (import.meta.url === 'file://' + process.argv[1] || process.argv[1].endsWith('package.mjs')) {
  const ids = args.includes('--all') ? gameList() : named;
  if (!ids.length) {
    console.log('Usage: node tools/package.mjs <game id> [more ids] [--out folder]   or   --all');
    console.log('Games here: ' + (gameList().join(', ') || '(none listed in games/games.js)'));
    process.exit(1);
  }
  for (const id of ids) await packageGame(id);
}
