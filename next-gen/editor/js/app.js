/* Linear Maze Editor — js/app.js
 * Start-up, opening the folder, navigation, undo and redo, and saving.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h, $ = ED.$;

  // ------------------------------------------------------------ view scope: listeners and pending edits per page
  let scope = [];
  ED.listen = (ev, fn) => scope.push(ED.on(ev, fn));
  ED.onLeave = (fn) => scope.push(fn);
  const pending = new Set();
  /** A debounced commit that is flushed before navigating, saving or play testing. */
  ED.pendingCommit = function (fn, ms) {
    const d = ED.debounce(() => {
      pending.delete(d);
      fn();
    }, ms || 350);
    const wrapped = (...a) => {
      pending.add(d);
      d(...a);
    };
    wrapped.flush = () => {
      if (pending.has(d)) {
        pending.delete(d);
        d.flush();
      }
    };
    return wrapped;
  };
  ED.flushAll = () => {
    for (const d of [...pending]) {
      pending.delete(d);
      d.flush();
    }
  };

  // ------------------------------------------------------------ routing
  ED.go = (path) => {
    if (location.hash === '#' + path) route();
    else location.hash = path;
  };
  ED.route = () => location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let current = null;
  function route() {
    if (!ED.ready) return;
    ED.flushAll();
    for (const fn of scope) {
      try {
        fn();
      } catch (e) {}
    }
    scope = [];
    let [view, ...args] = ED.route();
    if (!ED.views[view]) view = 'floors';
    current = view;
    ED.$$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.view === view));
    const el = $('#view');
    el.className = ED.views[view].full ? 'full' : '';
    ED.clear(el);
    try {
      ED.views[view].render(el, args);
    } catch (e) {
      console.error(e);
      el.appendChild(h('div', { class: 'empty' }, h('h2', null, 'This page failed to draw'), h('p', { class: 'error-text' }, e.message), h('pre', { class: 'mono muted' }, String(e.stack || '').slice(0, 800))));
    }
  }
  window.addEventListener('hashchange', route);
  ED.rerender = route;
  ED.currentView = () => current;

  // ------------------------------------------------------------ top bar
  function refreshBar() {
    const M = ED.model;
    $('#btn-undo').disabled = !M.undoStack.length;
    $('#btn-redo').disabled = !M.redoStack.length;
    $('#btn-undo').title = M.undoStack.length ? 'Undo: ' + M.undoStack[M.undoStack.length - 1].label + ' (Ctrl+Z)' : 'Nothing to undo';
    $('#btn-redo').title = M.redoStack.length ? 'Redo: ' + M.redoStack[M.redoStack.length - 1].label + ' (Ctrl+Shift+Z)' : 'Nothing to redo';
    const dirty = M.isDirty();
    $('#dirty').hidden = !dirty;
    $('#dirty').textContent = 'Unsaved changes';
    $('#btn-save').disabled = !dirty && ED.fs.kind !== 'readonly' && ED.engine.hasEditorFiles !== false;
    const n = ED.ser.summary(M.edits()).length;
    const ch = ED.$('#nav a[data-view=changes]');
    if (ch) ch.innerHTML = 'Changes' + (n ? ' <span class="count">' + n + '</span>' : '');
  }
  ED.on('change', () => {
    if (ED.ready) refreshBar();
  });
  ED.undo = () => {
    ED.flushAll();
    const l = ED.model.undo();
    if (l) {
      ED.toast('Undid: ' + l);
      ED.emit('history');
      route();
    }
  };
  ED.redo = () => {
    ED.flushAll();
    const l = ED.model.redo();
    if (l) {
      ED.toast('Redid: ' + l);
      ED.emit('history');
      route();
    }
  };

  // ------------------------------------------------------------ saving
  ED.save = async function () {
    ED.flushAll();
    const M = ED.model, fs = ED.fs, P = ED.engine.paths(ED.engine.gameId);
    if (ED.engine.editsError && !ED.editsErrorAccepted) {
      const ok = await ED.confirm('Replace the unreadable edits file?', P.edits + ' had an error when the editor opened (' + ED.engine.editsError + '). Saving now replaces it with only what is in the editor.', 'Replace it', true);
      if (!ok) return;
      ED.editsErrorAccepted = true;
    }
    const mtime = await fs.modified(P.edits);
    if (ED.engine.editsMtime && mtime && mtime !== ED.engine.editsMtime && !ED.conflictAccepted) {
      const ok = await ED.confirm('The edits file changed on disk', P.edits + ' was changed outside the editor since you opened the game. Saving overwrites those changes. Reload the game instead to keep them.', 'Overwrite it', true);
      if (!ok) return;
      ED.conflictAccepted = true;
    }
    const gmtime = await fs.modified(P.game);
    if (M.gameDirty() && ED.engine.gameMtime && gmtime && gmtime !== ED.engine.gameMtime && !ED.gameConflictAccepted) {
      const ok = await ED.confirm('game.js changed on disk', P.game + ' was changed outside the editor since you opened the game. Saving overwrites those changes. Reload the game instead to keep them.', 'Overwrite it', true);
      if (!ok) return;
      ED.gameConflictAccepted = true;
    }
    const editsText = ED.ser.editsFile(M.edits());
    const spritesText = ED.ser.spritesFile(M.sprites);
    // the file must run: check it in a scratch frame before writing it
    const problem = checkEditsText(editsText);
    if (problem) {
      ED.modal({ title: 'Not saved', body: h('div', null, h('p', null, 'The saved file would not run in the game:'), h('pre', { class: 'mono error-text' }, problem), h('p', { class: 'muted' }, 'This usually means some code typed into a Code tab is unfinished. Fix it and save again.')) });
      return;
    }
    try {
      const wrote = [];
      const packsChanged = M.packsChanged();
      if (M.editsDirty() || !ED.engine.hasEditorFiles) {
        wrote.push(P.sprites, P.edits);
        await fs.write(P.sprites, spritesText);
        await fs.write(P.edits, editsText);
        ED.engine.hasEditorFiles = true;
      }
      if (M.gameDirty()) {
        wrote.push(P.game);
        await fs.write(P.game, ED.engine.MF.gameFile(M.game()));
      }
      ED.engine.editsMtime = await fs.modified(P.edits);
      ED.engine.gameMtime = await fs.modified(P.game);
      M.markSaved();
      refreshBar();
      if (fs.kind === 'readonly') {
        ED.modal({ title: 'Files downloaded', body: h('div', null,
          h('p', null, 'This browser can’t write into the folder, so the changed files were downloaded. Put them in the workspace folder:'),
          h('ul', null, wrote.map((w) => h('li', null, h('code', null, w.split('/').pop()), ' → ', h('code', null, w.replace(/[^/]+$/, '')))))) });
      } else ED.toast('Saved ' + (M.game().title || ED.engine.gameId), 'good');
      ED.emit('saved');
      if (packsChanged && fs.kind !== 'readonly') {
        const again = await ED.confirm('Load the new packs?', 'This game’s packs changed. Reload the game to load them, so floors, items and monsters from the new packs show up in the editor.', 'Reload now');
        if (again) ED.reloadGame(true);
      }
    } catch (e) {
      console.error(e);
      ED.modal({ title: 'Not saved', body: h('div', null, h('p', null, 'Writing to the folder failed: ' + e.message), h('p', { class: 'muted' }, 'If the browser asked for permission and it was refused, open the folder again and allow editing.')) });
    }
  };
  function checkEditsText(text) {
    try {
      const win = ED.engine.win;
      const X = ED.engine.X;
      const real = X.apply;
      let got = null;
      X.apply = (d) => (got = d);
      try {
        new win.Function(text)();
      } finally {
        X.apply = real;
      }
      if (!got) return 'The file did not call LM.editor.apply.';
      return null;
    } catch (e) {
      return e.message;
    }
  }

  // ------------------------------------------------------------ packaging a game for players
  /**
   * Write a game for players into dist/ (what node tools/package.mjs does, without Node):
   *   dist/<id>/               the engine plus the game's files and only the packs it loads
   *   dist/<id>.html           the same game as one file;  dist/<id>.artifact.html  for a claude.ai Artifact
   * The game being edited is packaged with its unsaved changes.
   */
  ED.packageGame = async function (id, opts) {
    ED.flushAll();
    opts = opts || {};
    const fs = ED.fs, E = ED.engine, MF = E.MF, M = ED.model;
    id = id || E.gameId;
    const current = id === E.gameId;
    const P = E.paths(id);
    const plan = await E.planFor(id, current ? M.game() : null);
    const live = {};
    if (current) {
      live[P.edits] = ED.ser.editsFile(M.edits());
      live[P.sprites] = ED.ser.spritesFile(M.sprites);
    }
    const cache = {};
    const read = async (p) => {
      if (p in live) return live[p];
      if (p in cache) return cache[p];
      return (cache[p] = await fs.read(p));
    };
    const readMaybe = async (p) => {
      try {
        return await read(p);
      } catch (e) {
        return null;
      }
    };
    const title = plan.game.title || id;
    const setTitle = (html) => html.replace(/<title>[^<]*<\/title>/, '<title>' + String(title).replace(/</g, '&lt;') + '</title>');
    const scripts = [P.game].concat(plan.scripts, plan.runtime ? [plan.runtime] : [], plan.editor);
    const manifestText = MF.gameFile(plan.game);
    const texts = {};
    texts[P.game] = manifestText;
    for (const p of scripts.slice(1)) texts[p] = plan.editor.includes(p) ? await readMaybe(p) : await read(p);
    for (const s of MF.shellScripts(E.shell)) texts['engine/' + s] = await read('engine/' + s);
    const page = setTitle(MF.inlinePage({ shell: E.shell, read: (p) => (p in texts ? texts[p] : null), scripts, start: 'LM.start(' + JSON.stringify(id) + ');' }));
    const out = (opts.out || 'dist').replace(/\/+$/, '');
    let n = 0;
    const put = async (p, text) => {
      await fs.write(out + '/' + p, text);
      n++;
    };
    await fs.write(out + '/' + id + '.html', page);
    await fs.write(out + '/' + id + '.artifact.html', MF.artifactPage(page));
    if (opts.folder !== false && fs.kind !== 'readonly') {
      const base = id + '/';
      await put(base + 'engine/index.html', E.shell);
      for (const s of MF.shellScripts(E.shell)) await put(base + 'engine/' + s, texts['engine/' + s]);
      await put(base + 'engine/editor-runtime.js', await read('engine/editor-runtime.js'));
      await put(base + P.game, MF.gameFile(Object.assign({}, plan.game, { packs: MF.explicitPacks(plan) })));
      for (const p of plan.editor) if (texts[p] != null) await put(base + p, texts[p]);
      for (const pk of plan.packs) {
        await put(base + MF.packDir(pk.game, pk.pack) + 'pack.js', await read(MF.packDir(pk.game, pk.pack) + 'pack.js'));
        for (const f of pk.files) await put(base + f, await read(f));
      }
      await put(base + 'games/games.js', MF.gamesFile([id]));
      await put(base + 'index.html', setTitle(MF.rootPage(E.shell, id)));
      await put(base + 'README.txt', [title + (plan.game.version ? ' ' + plan.game.version : ''), '', plan.game.description || '', '',
        'To play, open index.html in a browser (Chrome, Edge, Firefox or Safari). It needs a keyboard and mouse.',
        'Made with the Linear Maze engine (engine/). The game itself is in games/' + id + '/.', ''].join('\n'));
    }
    return { size: Math.round(page.length / 1024), files: n, out, id, problems: plan.problems };
  };

  // ------------------------------------------------------------ opening the workspace, choosing a game
  function status(text, bad) {
    const el = $('#load-status');
    el.hidden = false;
    el.className = 'load-status' + (bad ? ' bad' : '');
    el.textContent = text;
  }
  ED.status = status;
  function showWelcome() {
    ED.ready = false;
    $('#view').hidden = true;
    $('#nav').hidden = true;
    $('#app').classList.add('no-nav');
    $('#top-actions').hidden = true;
    $('#game-chip').hidden = true;
    $('#welcome').hidden = false;
  }
  /** Open the folder as a workspace and show its games (or open one straight away). */
  async function openWorkspace(autoGame) {
    try {
      $('#btn-open').disabled = true;
      $('#chooser').hidden = true;
      const games = await ED.engine.openWorkspace((s) => status(s + '…'));
      $('#load-status').hidden = true;
      $('#folder-chip').hidden = false;
      $('#folder-chip').textContent = ED.fs.name + (ED.fs.kind === 'readonly' ? ' (read-only)' : '');
      const last = ED.store.get('last-game:' + ED.fs.name, null);
      const pick = autoGame && games.find((g) => g.id === autoGame && g.manifest);
      if (pick) return loadGame(pick.id);
      ED.games.showChooser(games, last);
    } catch (e) {
      console.error(e);
      status(e.message, true);
    } finally {
      $('#btn-open').disabled = false;
    }
  }
  ED.openWorkspace = openWorkspace;
  async function loadGame(id) {
    try {
      $('#chooser').hidden = true;
      const { edits, sprites, manifest } = await ED.engine.load(id, (s) => status(s + '…'));
      status('Listing the workspace’s packs…');
      await ED.engine.catalog().catch((e) => console.warn('pack catalog', e));
      ED.model.init(edits, sprites, manifest);
      ED.store.set('last-game:' + ED.fs.name, id);
      ED.editsErrorAccepted = ED.conflictAccepted = ED.gameConflictAccepted = false;
      // pictures decode after the first bake; repaint tiles and maps when one arrives
      ED.engine.X.onImageLoad = ED.debounce(() => {
        ED.preview.forgetTiles();
        const m = ED.currentMap;
        if (m && m.alive) {
          m.renderer.chunks.clear();
          m.dirty = true;
        }
      }, 120);
      ED.ready = true;
      $('#load-status').hidden = true;
      $('#welcome').hidden = true;
      $('#view').hidden = false;
      $('#nav').hidden = false;
      $('#app').classList.remove('no-nav');
      $('#folder-chip').hidden = false;
      $('#top-actions').hidden = false;
      $('#btn-play').disabled = false;
      refreshGameChip();
      refreshBar();
      if (ED.engine.loadErrors.length) ED.toast('Some game scripts reported errors: ' + ED.engine.loadErrors[0], 'bad', 9000);
      if (ED.engine.problems.length) ED.toast(ED.engine.problems[0] + (ED.engine.problems.length > 1 ? ' (and ' + (ED.engine.problems.length - 1) + ' more on the Game page)' : ''), 'bad', 9000);
      if (ED.engine.editsError) {
        ED.modal({ title: 'The saved edits couldn’t be read', body: h('div', null, h('p', null, ED.engine.paths(id).edits + ' has an error:'), h('pre', { class: 'mono error-text' }, ED.engine.editsError), h('p', null, 'The editor opened without those changes. Fix the file by hand and reopen the game, or carry on: saving will replace the file.')) });
      }
      if (!location.hash || location.hash === '#') location.hash = '/floors';
      else route();
    } catch (e) {
      console.error(e);
      ED.ready = false;
      $('#welcome').hidden = false;
      $('#view').hidden = true;
      status(e.message, true);
      if (ED.engine.games) ED.games.showChooser(ED.engine.games, id);
    }
  }
  ED.loadGame = loadGame;
  function refreshGameChip() {
    const g = ED.model.game();
    const chip = $('#game-chip');
    chip.hidden = !g;
    if (g) chip.textContent = g.title || ED.engine.gameId;
  }
  ED.on('change', () => {
    if (ED.ready) refreshGameChip();
  });
  /** Reload the game being edited (after its packs change, or to pick up files changed on disk). */
  ED.reloadGame = async function (skipAsk) {
    if (!skipAsk && ED.model.isDirty() && !(await ED.confirm('Reload the game?', 'Unsaved changes will be lost.', 'Reload', true))) return;
    const id = ED.engine.gameId;
    showWelcome();
    await ED.engine.listGames();
    await loadGame(id);
  };
  ED.reloadFolder = ED.reloadGame;
  /** Back to the list of games in this workspace. */
  ED.switchGame = async function () {
    if (ED.ready && ED.model.isDirty() && !(await ED.confirm('Leave this game?', 'It has unsaved changes. They will be lost.', 'Leave it', true))) return;
    showWelcome();
    $('#load-status').hidden = true;
    try {
      const games = await ED.engine.listGames();
      ED.games.showChooser(games, ED.engine.gameId);
    } catch (e) {
      status(e.message, true);
    }
  };

  async function boot() {
    const params = new URLSearchParams(location.search);
    if (params.has('dev')) {
      ED.fs.useDev(params.get('dev') || '../', params.has('put'));
      return openWorkspace(params.get('game'));
    }
    if (!ED.fs.supported()) {
      $('#btn-open').hidden = true;
      $('#open-hint').hidden = true;
      $('#open-fallback').hidden = false;
    } else {
      const remembered = await ED.fs.remembered();
      if (remembered) {
        const b = $('#btn-reopen');
        b.hidden = false;
        b.textContent = 'Reopen ' + remembered.name;
        b.addEventListener('click', async () => {
          try {
            await ED.fs.reopen(remembered);
            await openWorkspace();
          } catch (e) {
            status(e.message, true);
          }
        });
      }
    }
    $('#btn-open').addEventListener('click', async () => {
      try {
        await ED.fs.pick();
      } catch (e) {
        if (e.name !== 'AbortError') status(e.message, true);
        return;
      }
      await openWorkspace();
    });
    $('#dir-input').addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      ED.fs.useFiles(e.target.files);
      await openWorkspace();
    });
  }

  $('#btn-games').addEventListener('click', () => ED.switchGame());
  $('#btn-undo').addEventListener('click', ED.undo);
  $('#btn-redo').addEventListener('click', ED.redo);
  $('#btn-save').addEventListener('click', () => ED.save());
  $('#btn-play').addEventListener('click', () => ED.play.open());
  document.addEventListener('keydown', (e) => {
    if (!ED.ready || ED.$('.modal-wrap') || ED.$('.play-wrap')) return;
    const mod = e.ctrlKey || e.metaKey;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      ED.save();
    } else if (mod && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      if (e.shiftKey) ED.redo();
      else ED.undo();
    } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
      e.preventDefault();
      ED.redo();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (ED.ready && ED.model.isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  boot();
})();
