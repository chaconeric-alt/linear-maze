/* Linear Maze Editor — js/engine.js
 * Reads a workspace (the folder holding engine/ and games/), lists its games and packs,
 * and loads one game into a hidden frame exactly as engine/loader.js would (its manifest,
 * the packs it lists, the editor runtime), so the editor reads the real content registry
 * and draws with the real engine. The workspace's own engine/manifest.js decides what a
 * game loads, so the editor always agrees with the engine it is editing.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const E = (ED.engine = {});
  E.KINDS_SHOWN = ['levels', 'items', 'enemies', 'npcs', 'weapons', 'armor', 'blessings', 'lootTables', 'environments', 'terrain', 'textures', 'projectiles', 'behaviors', 'attacks', 'effects', 'gadgets', 'legend', 'elevators', 'speakers', 'statuses'];
  /** Where a game keeps what the editor saves. */
  E.paths = (id) => ({
    dir: 'games/' + id + '/',
    game: 'games/' + id + '/game.js',
    edits: 'games/' + id + '/editor/edits.js',
    sprites: 'games/' + id + '/editor/sprites.js',
    spec: 'games/' + id + '/SPEC.md',
  });

  // ------------------------------------------------------------ the workspace
  /** Check the folder is a workspace and read the engine's shell and manifest code. Returns the games. */
  E.openWorkspace = async function (status) {
    const fs = ED.fs;
    status('Reading engine/index.html');
    const shell = await fs.readMaybe('engine/index.html');
    if (!shell) {
      if ((await fs.readMaybe('index.html')) && (await fs.readMaybe('engine/core.js')) && !(await fs.readMaybe('engine/manifest.js')))
        throw new Error('“' + fs.name + '” is a game folder from before 0.5, with everything in one folder. This editor opens a 0.5 workspace: the folder with engine, games and editor in it.');
      if (await fs.readMaybe('core.js')) throw new Error('“' + fs.name + '” is the engine folder. Pick the folder above it, the one with engine and games in it.');
      if (await fs.readMaybe('game.js')) throw new Error('“' + fs.name + '” is one game’s folder. Pick the folder two levels up, the one with engine and games in it.');
      if (await fs.readMaybe('games.js')) throw new Error('“' + fs.name + '” is the games folder. Pick the folder above it, the one with engine and games in it.');
      throw new Error('There is no engine/index.html in “' + fs.name + '”. Pick the workspace folder: the one with engine, games and editor in it.');
    }
    const mtext = await fs.readMaybe('engine/manifest.js');
    if (!mtext) throw new Error('engine/manifest.js is missing from “' + fs.name + '”, so this engine is older than the editor. Use the engine that came with this editor.');
    const holder = {};
    try {
      new Function('window', 'module', mtext + '\n//# sourceURL=engine/manifest.js')(holder, undefined);
    } catch (e) {
      throw new Error('engine/manifest.js has an error: ' + e.message);
    }
    E.MF = holder.LM.manifest;
    E.shell = shell;
    E.workspaceName = fs.name;
    return E.listGames(status);
  };

  /** games/games.js, as a list of ids. */
  async function listedGames() {
    const t = await ED.fs.readMaybe('games/games.js');
    if (!t) return [];
    try {
      const w = {};
      new Function('window', t)(w);
      return (w.LM && w.LM.gameList) || [];
    } catch (e) {
      return [];
    }
  }
  E.listedGames = listedGames;
  /** Folders under games/ (null if this browser can't list folders). */
  async function gameDirs() {
    const entries = await ED.fs.list('games');
    return entries ? entries.filter((e) => e.kind === 'directory').map((e) => e.name) : null;
  }
  /** Every game in the workspace: [{ id, manifest, error }], in games/games.js order, then the rest. */
  E.listGames = async function (status) {
    const fs = ED.fs, MF = E.MF;
    if (status) status('Looking for games');
    const listed = await listedGames();
    const dirs = await gameDirs();
    let ids = listed.slice();
    if (dirs) {
      const withGame = [];
      for (const d of dirs) if (await fs.readMaybe('games/' + d + '/game.js')) withGame.push(d);
      ids = listed.filter((id) => withGame.includes(id)).concat(withGame.filter((id) => !listed.includes(id)).sort());
    }
    const out = [];
    for (const id of ids) {
      const t = await fs.readMaybe('games/' + id + '/game.js');
      if (!t) {
        out.push({ id, manifest: null, error: 'games/' + id + '/game.js is missing' });
        continue;
      }
      try {
        out.push({ id, manifest: MF.read(t, 'game') });
      } catch (e) {
        out.push({ id, manifest: null, error: 'games/' + id + '/game.js: ' + e.message });
      }
    }
    E.games = out;
    E.gameIdsListed = listed;
    return out;
  };

  /** Every pack in the workspace, from every game folder: [{ game, pack, key, info, gameTitle }]. */
  E.catalog = async function () {
    const fs = ED.fs, MF = E.MF;
    const games = E.games || [];
    const titles = {};
    for (const g of games) if (g.manifest) titles[g.id] = g.manifest.title || g.id;
    let owners = await gameDirs();
    if (!owners) owners = games.map((g) => g.id);
    const out = [];
    for (const g of owners) {
      let names = null;
      const entries = await fs.list('games/' + g + '/packs');
      if (entries) names = entries.filter((e) => e.kind === 'directory').map((e) => e.name).sort();
      else {
        // no folder listing (dev mode): the packs the game's own manifest names
        const m = games.find((x) => x.id === g);
        names = m && m.manifest ? (m.manifest.packs || []).map((r) => MF.parseRef(MF.entry(r).pack, g)).filter((r) => r.game === g && r.pack !== '*').map((r) => r.pack) : [];
      }
      // keep the owner's own load order first, so a game's packs read top to bottom as it loads them
      const own = games.find((x) => x.id === g);
      if (own && own.manifest) {
        const order = (own.manifest.packs || []).map((r) => MF.parseRef(MF.entry(r).pack, g)).filter((r) => r.game === g).map((r) => r.pack);
        names.sort((a, b) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)));
      }
      for (const p of names) {
        const t = await fs.readMaybe(MF.packDir(g, p) + 'pack.js');
        if (!t) continue;
        try {
          out.push({ game: g, pack: p, key: g + '/' + p, info: MF.read(t, 'pack'), gameTitle: titles[g] || g });
        } catch (e) {
          out.push({ game: g, pack: p, key: g + '/' + p, info: { name: p, description: 'pack.js has an error: ' + e.message }, gameTitle: titles[g] || g, broken: true });
        }
      }
    }
    E.packCatalog = out;
    return out;
  };

  /** Which packs in the workspace define these ids (by reading their files): Map id → [catalog entries]. */
  E.findProviders = async function (ids) {
    const fs = ED.fs, MF = E.MF;
    const out = new Map(ids.map((id) => [id, []]));
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const res = ids.map((id) => [id, new RegExp("(['\"])" + esc(id) + "\\1\\s*:" + (/^[A-Za-z_$][\w$]*$/.test(id) ? '|^\\s+' + esc(id) + '\\s*:\\s*\\{' : ''), 'm')]);
    for (const c of E.packCatalog || []) {
      const files = (c.info.scripts || []).concat(c.info.levels || []);
      for (const f of files) {
        const path = MF.packDir(c.game, c.pack) + f;
        const text = E.texts && E.texts[path] != null ? E.texts[path] : await fs.readMaybe(path);
        if (!text) continue;
        for (const [id, re] of res) if (re.test(text) && !out.get(id).includes(c)) out.get(id).push(c);
      }
    }
    return out;
  };

  // ------------------------------------------------------------ one game
  /** Work out what a game loads (the workspace's own rules), reading through the open folder. */
  E.planFor = function (gameId, manifestOverride) {
    const fs = ED.fs, MF = E.MF;
    return MF.plan(gameId, {
      game: async (id) => (id === gameId && manifestOverride ? manifestOverride : MF.read(await fs.read('games/' + id + '/game.js'), 'game')),
      pack: async (g, p) => MF.read(await fs.read(MF.packDir(g, p) + 'pack.js'), 'pack'),
    });
  };

  /** Read a game's files, build the frame, and capture its saved edits. */
  E.load = async function (gameId, status) {
    const fs = ED.fs, MF = E.MF;
    const P = E.paths(gameId);
    status('Reading ' + P.game);
    const gameText = await fs.read(P.game).catch(() => {
      throw new Error(P.game + ' is missing.');
    });
    MF.read(gameText, 'game');
    const plan = await E.planFor(gameId);
    E.gameId = gameId;
    E.plan = plan;
    E.manifest = plan.game;
    E.problems = plan.problems.slice();
    E.engineScripts = MF.shellScripts(E.shell).filter((s) => !/(^|\/)loader\.js$/.test(s)).map((s) => 'engine/' + s);
    const want = E.engineScripts.concat(plan.scripts);
    status('Reading ' + want.length + ' engine and game files');
    const texts = {};
    await Promise.all(want.map(async (s) => {
      texts[s] = await fs.read(s).catch(() => {
        throw new Error((s.startsWith('engine/') ? 'engine/index.html' : 'The game') + ' loads ' + s + ', but that file is missing.');
      });
    }));
    const runtime = await fs.readMaybe('engine/editor-runtime.js');
    if (!runtime) throw new Error('engine/editor-runtime.js is missing from the workspace. It comes with the engine: every game’s editor changes need it.');
    const sprites = await fs.readMaybe(P.sprites);
    const edits = await fs.readMaybe(P.edits);
    E.texts = texts;
    E.runtimeText = runtime;
    E.spec = (await fs.readMaybe('engine/SPEC.md')) || '';
    E.gameSpec = (await fs.readMaybe(P.spec)) || '';
    E.editsMtime = await fs.modified(P.edits);
    E.gameMtime = await fs.modified(P.game);
    E.hasEditorFiles = !!(sprites || edits);

    status('Starting the engine');
    const win = await E.makeFrame(E.frameDoc({ runtime: true }), 'engine-frame');
    E.win = win;
    E.LM = win.LM;
    E.X = win.LM && win.LM.editor;
    if (!E.LM || !E.X) throw new Error('The game’s scripts didn’t start. ' + (E.loadErrors[0] || ''));

    // pictures and saved edits are read without applying them: the editor keeps the originals
    // as its baseline and applies edits itself
    status('Reading saved changes');
    E.editsError = null;
    if (sprites) {
      try {
        new win.Function(sprites)();
      } catch (e) {
        E.loadErrors.push(P.sprites + ': ' + e.message);
      }
    }
    let captured = null;
    if (edits) {
      const real = E.X.apply;
      E.X.apply = (d) => (captured = d);
      try {
        new win.Function(edits + '\n//# sourceURL=' + P.edits)();
      } catch (e) {
        E.editsError = e.message;
      }
      E.X.apply = real;
    }
    E.savedEdits = captured;
    E.snapshotBase();
    return { edits: captured, sprites: Object.assign({}, E.X.sprites), manifest: E.manifest };
  };

  /** The game's page with every script inlined. opts: { runtime, edits (text), sprites (text), extra, boot, manifest } */
  E.frameDoc = function (opts) {
    opts = opts || {};
    const MF = E.MF, id = E.gameId, P = E.paths(id);
    // the live manifest (with unsaved Game-page changes) once the model holds this game; the file's until then
    const live = ED.model && ED.model.game && ED.model.game();
    const manifestText = MF.gameFile(opts.manifest || (live && live.id === id ? live : E.manifest));
    const scripts = [P.game].concat(E.plan.scripts);
    const virtual = {};
    virtual[P.game] = manifestText;
    if (opts.runtime) {
      scripts.push('engine/editor-runtime.js');
      virtual['engine/editor-runtime.js'] = E.runtimeText;
    }
    if (opts.sprites) {
      scripts.push(P.sprites);
      virtual[P.sprites] = opts.sprites;
    }
    if (opts.edits) {
      scripts.push(P.edits);
      virtual[P.edits] = opts.edits;
    }
    const read = (p) => (p in virtual ? virtual[p] : E.texts[p] != null ? E.texts[p] : null);
    const start = (opts.extra ? opts.extra + '\n' : '') + (opts.boot ? 'LM.start(' : 'LM.useGame(') + JSON.stringify(id) + ');';
    return MF.inlinePage({ shell: E.shell, read, scripts, start, fonts: !!opts.boot });
  };

  /** Write a document into a fresh same-origin frame and return its window. */
  E.makeFrame = function (doc, id, visible) {
    const old = document.getElementById(id);
    if (old) old.remove();
    const f = h('iframe', { id, class: visible ? 'frame-visible' : 'frame-hidden', title: id });
    (visible || ED.$('#frames')).appendChild(f);
    const win = f.contentWindow;
    E.loadErrors = [];
    const d = f.contentDocument;
    d.open();
    win.addEventListener('error', (ev) => {
      E.loadErrors.push((ev.filename ? ev.filename.split('/').pop() + ':' + ev.lineno + ' ' : '') + ev.message);
    });
    d.write(doc);
    d.close();
    return Promise.resolve(win);
  };

  /** Remember the original definitions (the baseline every edit is measured against). */
  E.snapshotBase = function () {
    const LM = E.LM;
    E.base = {};
    for (const k of LM.KINDS) E.base[k] = Object.assign({}, LM.registry[k]);
    E.baseLevelOrder = Object.values(LM.registry.levels).sort((a, b) => (a.order || 0) - (b.order || 0)).map((l) => l.id);
    E.basePlayer = E.X.clone(LM.PLAYER_BASE);
    E.baseAmmoMax = E.X.clone(LM.AMMO_MAX);
    // ammunition a game's packs added (LM.defineAmmo) joins the editor's lists
    if (ED.schemas && ED.schemas.syncAmmo) ED.schemas.syncAmmo(Object.keys(LM.AMMO_MAX));
    E.knobs = E.discoverKnobs();
  };

  /** Pack settings: plain data objects and arrays hanging off LM in UPPER_CASE (CHESSBOARD.CONFIG...). */
  E.discoverKnobs = function () {
    const LM = E.LM, X = E.X, out = {};
    const plainData = (v, depth) => {
      if (typeof v === 'function') return false;
      if (Array.isArray(v)) return v.every((x) => plainData(x, depth + 1));
      if (X.isPlain(v)) return depth < 6 && Object.values(v).every((x) => plainData(x, depth + 1));
      return v == null || ['string', 'number', 'boolean'].includes(typeof v);
    };
    const SKIP = new Set(['KINDS', 'TILE', 'VERSION', 'PLAYER_BASE', 'AMMO_MAX', 'AMMO_INFO', 'AMMO_BUILTIN', 'CHUNK', 'DIR', 'CHESSBOARD_LAYOUT']);
    const visit = (obj, path, depth) => {
      for (const [k, v] of Object.entries(obj)) {
        if (depth === 0 && (!/^[A-Z][A-Z0-9_]+$/.test(k) || SKIP.has(k))) continue;
        if (depth > 0 && !/^[A-Z][A-Z0-9_]+$/.test(k)) continue;
        const p = path ? path + '.' + k : k;
        if ((X.isPlain(v) || Array.isArray(v)) && plainData(v, 0) && (Array.isArray(v) ? v.length : Object.keys(v).length)) out[p] = X.clone(v);
        else if (X.isPlain(v) && depth < 2) visit(v, p, depth + 1);
      }
    };
    visit(LM, '', 0);
    return out;
  };

  E.compile = (src, name) => E.X.compile(src, name);

  // ------------------------------------------------------------ fake game + renderer for drawing
  /** A Renderer drawing into an editor canvas at a chosen zoom, keeping every baked chunk. */
  E.makeRenderer = function (canvas) {
    const LM = E.LM;
    class EditorRenderer extends LM.Renderer {
      resize() {
        const c = this.canvas;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.cssW = Math.max(16, c.clientWidth || c.width);
        this.cssH = Math.max(16, c.clientHeight || c.height);
        this.dpr = dpr;
        c.width = Math.round(this.cssW * dpr);
        c.height = Math.round(this.cssH * dpr);
        this.zoom = this.edZoom || 1;
        this.scale = this.zoom * dpr;
        this.lc.width = Math.ceil(c.width / 2);
        this.lc.height = Math.ceil(c.height / 2);
        this.chunks.clear();
        this.chunkOrder.length = 0;
      }
      getChunk(cx, cy) {
        const key = cx + ',' + cy;
        let c = this.chunks.get(key);
        if (!c) {
          c = this.bakeChunk(cx, cy);
          this.chunks.set(key, c);
        }
        return c;
      }
      renderLight(game, view, ox, oy) {
        if (this.flat) {
          const g = this.lctx;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, this.lc.width, this.lc.height);
          return;
        }
        super.renderLight(game, view, ox, oy);
      }
    }
    // the base constructor listens for window resizes; the editor sizes canvases itself
    const r = new EditorRenderer(canvas);
    return r;
  };
  E.fakeGame = function (renderer) {
    const LM = E.LM;
    const g = Object.create(LM.Game.prototype);
    Object.assign(g, {
      canvas: renderer ? renderer.canvas : null, renderer, particles: new LM.Particles(400),
      cam: { x: 0, y: 0, shakeX: 0, shakeY: 0, trauma: 0, kickX: 0, kickY: 0 },
      items: [], enemies: [], npcs: [], projectiles: [], doors: [], traps: [], fx: [], lights: [], staticLights: [], timers: [],
      plates: new Map(), time: 0, difficulty: 1, stats: { kills: 0, enemies: 0, gold: 0, time: 0 }, attract: true, state: 'title', frame: 0,
      editor: true,
    });
    return g;
  };
  /** A tiny level for drawing previews (items that look at their surroundings need one). */
  E.stubLevel = function (envId) {
    const LM = E.LM;
    if (!E._stub || E._stub.envId !== envId) {
      const env = envId && LM.find('environments', envId) ? envId : Object.keys(LM.registry.environments)[0];
      E._stub = new LM.Level({ id: 'editor-stub', environment: env, map: ['#####', '#...#', '#...#', '#...#', '#####'], legend: { '.': { terrain: 'floor', start: true } } });
      E._stub.envId = envId;
    }
    return E._stub;
  };
})();
