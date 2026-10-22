/* The Linear Maze engine — engine/manifest.js
 * Games and asset packs. Turns a game's manifest (games/<id>/game.js) into the files to load,
 * in order. The loader (engine/loader.js), the editor and tools/package.mjs all use this file,
 * so the game you play, the game you edit and the game you ship always load the same things.
 *
 * A game's `packs` list, in load order:
 *   'core'                          one of this game's own packs: games/<this game>/packs/core/
 *   'linear-maze/office'            a pack that belongs to another game
 *   'linear-maze/*'                 every pack another game loads, in that game's order
 *   { pack: 'linear-maze/office', levels: false, exclude: ['phone.js'] }
 *       levels: false               the pack's assets, but none of its floors
 *       exclude: [file, ...]        leave some of the pack's files out (names as its pack.js lists them)
 * Options given with a wildcard apply to every pack it brings in.
 *
 * Every pack folder has a pack.js describing it:
 *   LM.describePack({ name, description, requires: ['office'], scripts: ['a.js', ...], levels: ['levels/x.js'] })
 * `requires` names packs (of the same game, or 'other-game/pack') that must load before this one.
 *
 * engine/SPEC.md section 21 documents every field of both files.
 */
'use strict';
(function (root) {
  const MF = {};

  // ------------------------------------------------------------ defaults
  /** Words on the engine's own screens. {floor} {name} {n} are filled in. */
  MF.WORDS = {
    floor: 'Floor {n}',
    continueGame: 'Continue: {floor}, {name}',
    descend: 'Go on to {floor}: {name}',
    nextIntro: 'The way goes on.',
    cleared: '{floor} cleared',
    leftBehind: '{floor} · left behind',
    victoryKicker: 'The end',
    victoryTitle: 'You made it',
    victoryText: '',
    playAgain: 'Play again',
    deathTitle: 'You died',
    deathText: 'Trying again restores you to how you entered this floor.',
    tryAgain: 'Try the floor again',
    backToTitle: 'Back to title',
    noWayUp: 'The way back up is closed.',
    elevator: 'Elevator',
    elevatorTitle: 'Which floor?',
    elevatorPrompt: 'Choose a floor',
    elevatorHere: 'you are here',
    elevatorBlocked: 'no way out there',
    elevatorStay: 'Stay on this floor',
    elevatorNoPower: 'No power. The doors won’t open.',
    elevatorLocked: 'locked',
    stairsLocked: 'The way is shut.',
    doorNeeds: 'Locked. It needs {need}.',
    doorAccepts: '{need} accepted.',
  };
  MF.TITLE = {
    lines: null, // the title in lines; null splits the game's title into words
    layout: 'stairs', // stairs: each line steps right · stacked: lines flush left
    size: 'large', // large | medium | small
    font: 'Major Mono Display',
    tagline: '',
    newGame: 'New game',
    showControls: true,
    footer: 'Content packs: {packs}', // {packs} {version} {title}
    background: null, // a floor id: its camera path plays behind the title (default: the first floor with one)
    picture: null, // an imported picture (editor Pictures) shown behind the title instead
  };
  MF.THEME = { accent: '#e0b25a' };
  MF.FONTS = ['Major Mono Display', 'Big Shoulders Display', 'Spectral', 'IBM Plex Mono'];

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  /** A manifest with every field present (defaults filled in). The original isn't changed. */
  MF.normalize = function (m) {
    m = m || {};
    const out = Object.assign({ title: m.id || 'Untitled game', version: '0.1.0', description: '', brief: '', packs: [], start: null, saveKey: null, editorChanges: true }, m);
    out.titleScreen = Object.assign({}, MF.TITLE, isObj(m.titleScreen) ? m.titleScreen : {});
    out.theme = Object.assign({}, MF.THEME, isObj(m.theme) ? m.theme : {});
    out.words = Object.assign({}, MF.WORDS, isObj(m.words) ? m.words : {});
    if (!Array.isArray(out.titleScreen.lines) || !out.titleScreen.lines.length) out.titleScreen.lines = String(out.title).split(/\s+/).filter(Boolean);
    return out;
  };
  /** Fill {placeholders} from vars. */
  MF.fill = (s, vars) => String(s == null ? '' : s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
  /** The browser storage key for a game's checkpoint. */
  MF.saveKey = (m) => (m && m.saveKey) || 'lm-save-v1:' + ((m && m.id) || 'game');

  // ------------------------------------------------------------ pack references
  MF.entry = function (raw) {
    if (typeof raw === 'string') return { pack: raw, levels: true, exclude: [] };
    if (isObj(raw)) return { pack: String(raw.pack || ''), levels: raw.levels !== false, exclude: Array.isArray(raw.exclude) ? raw.exclude.slice() : [] };
    return { pack: '', levels: true, exclude: [] };
  };
  /** 'core' (in fromGame) → { game, pack }; 'other/core' → { game: 'other', pack: 'core' }; pack may be '*'. */
  MF.parseRef = function (ref, fromGame) {
    const s = String(ref || '').trim();
    const i = s.indexOf('/');
    return i < 0 ? { game: fromGame, pack: s } : { game: s.slice(0, i), pack: s.slice(i + 1) };
  };
  MF.packDir = (game, pack) => 'games/' + game + '/packs/' + pack + '/';
  /** The ref to write in `fromGame`'s manifest for a pack: bare for its own packs. */
  MF.refFor = (game, pack, fromGame) => (game === fromGame ? pack : game + '/' + pack);

  /**
   * Work out what a game loads.
   *   host.game(id)          → that game's manifest (throw if there is none)
   *   host.pack(game, pack)  → that pack's pack.js description (throw if there is none)
   * Returns { game, packs: [{ key, game, pack, info, levels, exclude, files }], scripts, runtime, editor, problems }.
   * Paths are relative to the folder that holds engine/ and games/.
   */
  MF.plan = async function (gameId, host) {
    const problems = [];
    const game = await host.game(gameId);
    const packs = [];
    const seen = new Set();
    async function expand(list, fromGame, inherited, trail) {
      for (const raw of Array.isArray(list) ? list : []) {
        const e = MF.entry(raw);
        if (!e.pack) continue;
        const r = MF.parseRef(e.pack, fromGame);
        const levels = inherited.levels && e.levels;
        const exclude = inherited.exclude.concat(e.exclude);
        if (r.pack === '*') {
          if (trail.includes(r.game) && r.game !== fromGame) {
            problems.push('“' + e.pack + '” loops back to a game already being read; skipped.');
            continue;
          }
          let other;
          try {
            other = await host.game(r.game);
          } catch (err) {
            problems.push('“' + e.pack + '”: there is no game called ' + r.game + '.');
            continue;
          }
          if (r.game === fromGame) {
            // 'this-game/*' means every pack folder of this game; only the editor can list folders, so it's the same as listing them
            problems.push('“' + e.pack + '” names this game itself; list its packs instead.');
            continue;
          }
          await expand(other.packs, r.game, { levels, exclude }, trail.concat(r.game));
          continue;
        }
        const key = r.game + '/' + r.pack;
        if (seen.has(key)) continue;
        seen.add(key);
        let info;
        try {
          info = await host.pack(r.game, r.pack);
        } catch (err) {
          problems.push('The pack ' + key + ' is missing (' + MF.packDir(r.game, r.pack) + 'pack.js).');
          continue;
        }
        packs.push({ key, game: r.game, pack: r.pack, info: info || {}, levels, exclude, files: [] });
      }
    }
    await expand(game.packs, gameId, { levels: true, exclude: [] }, [gameId]);
    packs.forEach((p, i) => {
      for (const req of p.info.requires || []) {
        const r = MF.parseRef(req, p.game);
        const key = r.game + '/' + r.pack;
        const j = packs.findIndex((q) => q.key === key);
        const name = p.info.name || p.key;
        if (j < 0) problems.push(name + ' (' + p.key + ') needs ' + key + ', which this game doesn’t load.');
        else if (j > i) problems.push(name + ' (' + p.key + ') needs ' + key + ' to load before it.');
      }
    });
    const scripts = [];
    for (const p of packs) {
      const dir = MF.packDir(p.game, p.pack);
      const own = (p.info.scripts || []).concat(p.levels ? p.info.levels || [] : []);
      p.files = own.filter((f) => !p.exclude.includes(f)).map((f) => dir + f);
      scripts.push(...p.files);
    }
    const editorOn = game.editorChanges !== false;
    return {
      game,
      packs,
      scripts,
      runtime: editorOn ? 'engine/editor-runtime.js' : null,
      editor: editorOn ? ['games/' + gameId + '/editor/sprites.js', 'games/' + gameId + '/editor/edits.js'] : [],
      problems,
    };
  };
  /** The packs list with wildcards spelled out, for a packaged copy that doesn't carry the other games' manifests. */
  MF.explicitPacks = function (plan) {
    const id = plan.game.id;
    return plan.packs.map((p) => {
      const ref = MF.refFor(p.game, p.pack, id);
      if (p.levels && !p.exclude.length) return ref;
      const o = { pack: ref };
      if (!p.levels) o.levels = false;
      if (p.exclude.length) o.exclude = p.exclude.slice();
      return o;
    });
  };

  // ------------------------------------------------------------ pages
  MF.SCRIPT_RE = /<script src="([^"]+)"([^>]*)><\/script>/g;
  /** The engine scripts engine/index.html loads itself (paths relative to engine/), in order. */
  MF.shellScripts = (shell) => [...String(shell).matchAll(MF.SCRIPT_RE)].map((m) => m[1]);
  const safe = (code) => String(code).replace(/<\/script/gi, '<\\/script');

  /**
   * One HTML page with everything inlined (a single-file build, or the editor's frames).
   *   shell     the text of engine/index.html
   *   read      (path) → text, or null to skip that file
   *   scripts   workspace paths to inline after the engine, in order (game.js, packs, editor files)
   *   start     code run last ('LM.start("linear-maze")'), or ''
   *   fonts     keep the Google Fonts link (default true)
   *   comments  label each script with its path (default true)
   */
  MF.inlinePage = function (o) {
    let doc = String(o.shell);
    if (o.fonts === false) doc = doc.replace(/<link[^>]*fonts\.g[^>]*>\n?/g, '');
    const tag = (path, code) => '<script>' + (o.comments === false ? '' : '/* ' + path + ' */\n') + safe(code) + '\n//# sourceURL=' + path + '\n</script>';
    let tail = '';
    for (const p of o.scripts || []) {
      const t = o.read(p);
      if (t != null) tail += tag(p, t) + '\n';
    }
    if (o.start) tail += '<script>' + o.start + '</script>\n';
    let placed = false;
    doc = doc.replace(MF.SCRIPT_RE, (m, src) => {
      if (/(^|\/)loader\.js$/.test(src)) {
        placed = true;
        return tail;
      }
      const path = 'engine/' + src;
      const t = o.read(path);
      if (t == null) throw new Error('Missing engine file ' + path);
      return tag(path, t);
    });
    if (!placed) doc = doc.replace('</body>', tail + '</body>');
    return doc;
  };
  /** The same page without its <html>/<head>/<body> wrapper, for publishing as a claude.ai Artifact. */
  MF.artifactPage = (page) => page.replace(/^[\s\S]*?<title>/, '<title>').replace(/<\/head>\s*<body>\s*/, '\n').replace(/<\/body>\s*<\/html>\s*$/, '');
  /** engine/index.html rewritten to sit at the top of a packaged folder, with the game chosen. */
  MF.rootPage = function (shell, gameId) {
    return String(shell).replace(MF.SCRIPT_RE, (m, src, rest) => {
      if (/(^|\/)loader\.js$/.test(src)) return '<script src="engine/loader.js" data-root="." data-game="' + gameId + '"></script>';
      return '<script src="engine/' + src + '"' + rest + '></script>';
    });
  };
  // ------------------------------------------------------------ writing manifests
  const IDENT = /^[A-Za-z_$][\w$]*$/;
  const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/<\/(script)/gi, '<\\/$1') + "'";
  /** A plain data value as readable JavaScript (strings, numbers, booleans, null, arrays, objects). */
  MF.literal = function lit(v, depth) {
    depth = depth || 0;
    const ind = (n) => '  '.repeat(n);
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') return q(v);
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
    if (typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      const parts = v.map((x) => lit(x, depth + 1));
      const flat = '[' + parts.join(', ') + ']';
      if (flat.length + depth * 2 < 100 && !flat.includes('\n')) return flat;
      return '[\n' + parts.map((p) => ind(depth + 1) + p).join(',\n') + ',\n' + ind(depth) + ']';
    }
    if (isObj(v)) {
      const keys = Object.keys(v).filter((k) => v[k] !== undefined && typeof v[k] !== 'function');
      if (!keys.length) return '{}';
      const parts = keys.map((k) => (IDENT.test(k) ? k : q(k)) + ': ' + lit(v[k], depth + 1));
      const flat = '{ ' + parts.join(', ') + ' }';
      if (flat.length + depth * 2 < 100 && !flat.includes('\n') && depth > 0) return flat;
      return '{\n' + parts.map((p) => ind(depth + 1) + p).join(',\n') + ',\n' + ind(depth) + '}';
    }
    return 'null';
  };
  MF.KEY_ORDER = ['id', 'title', 'version', 'description', 'brief', 'packs', 'start', 'saveKey', 'editorChanges', 'titleScreen', 'theme', 'words'];
  /** The text of games/<id>/game.js for a manifest. */
  MF.gameFile = function (m) {
    const o = {};
    for (const k of MF.KEY_ORDER) if (k in m) o[k] = m[k];
    for (const k of Object.keys(m)) if (!(k in o)) o[k] = m[k];
    return [
      '/* games/' + m.id + '/game.js — ' + String(m.title || m.id).replace(/\*\//g, '* /'),
      ' * The game’s manifest: what it’s called, its title screen, the words on the engine’s own',
      ' * screens, and the asset packs it loads, in order. The editor’s Game page writes this file;',
      ' * hand edits are kept as long as it stays one LM.defineGame({...}) call.',
      ' * engine/SPEC.md section 21 explains every field.',
      ' */',
      'LM.defineGame(' + MF.literal(o, 0) + ');',
      '',
    ].join('\n');
  };
  /** Read a game.js or pack.js text without running a game: returns what it defines. */
  MF.read = function (text, kind, evaluate) {
    let got = null;
    const LM = { defineGame: (m) => (got = m), describePack: (p) => (got = p) };
    (evaluate || ((src, lm) => new Function('LM', 'window', src)(lm, { LM: lm })))(String(text), LM);
    if (!got) throw new Error(kind === 'pack' ? 'pack.js doesn’t call LM.describePack({...})' : 'game.js doesn’t call LM.defineGame({...})');
    return got;
  };

  /** games/games.js: the games in a folder, for the launcher and engine/index.html without ?game=. */
  MF.gamesFile = (ids) => [
    '/* games/games.js: the games in this folder. The first is the one engine/index.html plays',
    ' * when no ?game= is given. The editor keeps this list up to date. */',
    '(window.LM = window.LM || {}).gameList = ' + JSON.stringify(ids) + ';',
    '',
  ].join('\n');

  root.LM = root.LM || {};
  root.LM.manifest = MF;
  if (typeof module === 'object' && module.exports) module.exports = MF;
})(typeof window !== 'undefined' ? window : globalThis);
