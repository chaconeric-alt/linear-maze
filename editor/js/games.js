/* Linear Maze Editor — js/games.js
 * The games in a workspace: the chooser shown after opening the folder, making a new
 * game (blank, from chosen packs, or a copy of another game), and packaging one for
 * players. A game is a folder under games/ with a game.js (its manifest), its own packs
 * (if any) and editor/edits.js + editor/sprites.js for what the editor saves.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h, $ = ED.$;
  const G = (ED.games = {});

  /** A small wordmark in the game's own font and accent colour. */
  G.mark = function (m, size) {
    const MF = ED.engine.MF;
    const n = MF.normalize(m || {});
    return h('span', { class: 'game-mark', style: { fontFamily: "'" + n.titleScreen.font + "', var(--f-mono)", color: n.theme.accent, fontSize: (size || 28) + 'px' } }, n.titleScreen.lines.join(' '));
  };
  const packLabel = (entry, fromGame) => {
    const MF = ED.engine.MF;
    const e = MF.entry(entry);
    const r = MF.parseRef(e.pack, fromGame);
    const cat = (ED.engine.packCatalog || []).find((c) => c.key === r.game + '/' + r.pack);
    const owner = (ED.engine.games || []).find((g) => g.id === r.game);
    const name = r.pack === '*' ? 'everything from ' + ((owner && owner.manifest && owner.manifest.title) || r.game) : cat ? cat.info.name || r.pack : (r.game === fromGame ? '' : r.game + '/') + r.pack;
    return name + (e.levels ? '' : ' (no floors)');
  };
  G.packSummary = (m) => (m.packs || []).map((p) => packLabel(p, m.id)).join(', ') || 'no packs';

  // ------------------------------------------------------------ the chooser
  G.showChooser = async function (games, highlight) {
    const box = $('#chooser');
    ED.clear(box);
    box.hidden = false;
    ED.$$('.welcome-list, #open-hint').forEach((el) => (el.hidden = true));
    try {
      await ED.engine.catalog();
    } catch (e) {
      console.warn('pack catalog', e);
    }
    box.appendChild(h('div', { class: 'chooser-head' }, h('h2', null, 'Games in ' + ED.fs.name), h('span', { class: 'muted' }, ED.plural(games.length, 'game'))));
    const grid = h('div', { class: 'game-grid' });
    for (const g of games) {
      const m = g.manifest;
      if (!m) {
        grid.appendChild(h('div', { class: 'game-card broken' }, h('b', null, g.id), h('p', { class: 'error-text' }, g.error)));
        continue;
      }
      const open = h('button', { class: 'btn primary', on: { click: () => ED.loadGame(g.id) } }, 'Open');
      grid.appendChild(h('div', { class: 'game-card' + (g.id === highlight ? ' last' : ''), style: { '--accent': ED.engine.MF.normalize(m).theme.accent } },
        G.mark(m, 26),
        h('small', { class: 'mono muted' }, 'games/' + g.id + '/ · ' + (m.version || '')),
        m.description ? h('p', null, m.description) : null,
        h('p', { class: 'muted packs-line' }, 'Packs: ' + G.packSummary(m)),
        h('div', { class: 'actions' }, open,
          h('button', { class: 'btn quiet', title: 'Write it for players into dist/', disabled: !ED.fs.canWrite() && ED.fs.kind !== 'readonly', on: { click: (e) => G.packageUi(g.id, e.target) } }, 'Package'))));
      if (g.id === highlight) setTimeout(() => open.focus(), 0);
    }
    if (ED.fs.canWrite()) grid.appendChild(h('button', { class: 'game-card new', on: { click: () => G.newGame() } }, h('b', null, '+ New game'), h('span', { class: 'muted' }, 'Blank, from the packs you choose, or a copy of a game here.')));
    box.appendChild(grid);
    if (!ED.fs.canWrite()) box.appendChild(h('p', { class: 'note warn' }, 'This browser opened the folder read-only: saving downloads the changed files instead. Use Chrome or Edge to save in place, make games or package them.'));
  };

  // ------------------------------------------------------------ packaging
  G.packageUi = async function (id, btn) {
    if (btn) btn.disabled = true;
    try {
      const r = await ED.packageGame(id, { folder: ED.fs.kind !== 'readonly' });
      ED.modal({
        title: 'Packaged for players',
        body: h('div', null,
          ED.fs.kind === 'readonly' ? h('p', null, 'This browser can’t write folders, so the one-file version was downloaded.') : h('p', null, 'Written into ', h('code', null, r.out + '/'), ' in ' + ED.fs.name + ':'),
          ED.fs.kind === 'readonly' ? null : h('ul', null,
            h('li', null, h('code', null, r.out + '/' + r.id + '/'), ': a folder to zip and hand out (' + r.files + ' files). Players open its index.html.'),
            h('li', null, h('code', null, r.out + '/' + r.id + '.html'), ': the same game as one file (' + r.size + ' KB).'),
            h('li', null, h('code', null, r.out + '/' + r.id + '.artifact.html'), ': that file ready to publish as a claude.ai Artifact.')),
          r.problems.length ? h('div', { class: 'note warn' }, h('b', null, 'Check these first: '), r.problems.join(' ')) : null,
          h('p', { class: 'muted' }, 'Only the engine, this game’s files and the packs it loads go in. Unsaved changes to the game you are editing are included.')),
      });
    } catch (e) {
      console.error(e);
      ED.toast('Packaging failed: ' + e.message, 'bad', 9000);
    }
    if (btn) btn.disabled = false;
  };

  // ------------------------------------------------------------ new games
  /** games/games.js with this id added (or removed). */
  async function writeGameList(add, remove) {
    const listed = await ED.engine.listedGames();
    let ids = listed.length ? listed : (ED.engine.games || []).map((g) => g.id);
    ids = ids.filter((x) => x !== remove);
    if (add && !ids.includes(add)) ids.push(add);
    await ED.fs.write('games/games.js', ED.engine.MF.gamesFile(ids));
  }
  G.writeGameList = writeGameList;
  const takenIds = () => (ED.engine.games || []).map((g) => g.id).concat((ED.engine.packCatalog || []).map((c) => c.game));

  /** A pack picker: every pack in the workspace, grouped by the game it belongs to.
   *  value: a packs list (manifest form); onChange(list). fromGame: the game the list belongs to. */
  G.packPicker = function (value, onChange, fromGame) {
    const MF = ED.engine.MF;
    const cat = ED.engine.packCatalog || [];
    let list = (value || []).slice();
    const box = h('div', { class: 'pack-picker' });
    const has = (key) => list.some((e) => {
      const r = MF.parseRef(MF.entry(e).pack, fromGame);
      return r.game + '/' + r.pack === key;
    });
    const hasAll = (game) => list.some((e) => MF.parseRef(MF.entry(e).pack, fromGame).game === game && MF.parseRef(MF.entry(e).pack, fromGame).pack === '*');
    const draw = () => {
      ED.clear(box);
      const byGame = {};
      for (const c of cat) (byGame[c.game] = byGame[c.game] || []).push(c);
      for (const [game, packs] of Object.entries(byGame)) {
        const all = hasAll(game);
        const sec = h('div', { class: 'pick-game' }, h('div', { class: 'pick-head' }, h('b', null, packs[0].gameTitle), h('small', { class: 'mono muted' }, 'games/' + game + '/packs/'),
          game !== fromGame ? h('label', { class: 'check' }, (() => {
            const cb = h('input', { type: 'checkbox', checked: all });
            cb.addEventListener('change', () => {
              list = list.filter((e) => MF.parseRef(MF.entry(e).pack, fromGame).game !== game);
              if (cb.checked) list.push(MF.refFor(game, '*', fromGame));
              onChange(list.slice());
              draw();
            });
            return cb;
          })(), h('span', null, 'Everything from this game')) : null));
        for (const c of packs) {
          const on = all || has(c.key);
          const cb = h('input', { type: 'checkbox', checked: on, disabled: all });
          cb.addEventListener('change', () => {
            if (cb.checked) {
              // go before the first pack that loads later in the workspace's own order, so needs come first
              const at = cat.indexOf(c);
              const j = list.findIndex((e) => {
                const r = MF.parseRef(MF.entry(e).pack, fromGame);
                const k = cat.findIndex((x) => x.key === r.game + '/' + r.pack);
                return k > at;
              });
              const ref = MF.refFor(c.game, c.pack, fromGame);
              if (j < 0) list.push(ref);
              else list.splice(j, 0, ref);
            } else list = list.filter((e) => {
              const r = MF.parseRef(MF.entry(e).pack, fromGame);
              return r.game + '/' + r.pack !== c.key;
            });
            onChange(list.slice());
          });
          sec.appendChild(h('label', { class: 'pick-pack check' }, cb, h('span', null, h('b', null, c.info.name || c.pack), (c.info.requires || []).length ? h('small', { class: 'muted' }, '  needs ' + c.info.requires.join(', ')) : null, h('br'), h('small', { class: 'muted' }, c.info.description || ''))));
        }
        box.appendChild(sec);
      }
      if (!cat.length) box.appendChild(h('p', { class: 'muted' }, 'No packs found under games/*/packs/.'));
    };
    draw();
    return box;
  };

  G.newGame = async function () {
    const F = ED.forms, MF = ED.engine.MF;
    if (!ED.engine.packCatalog) await ED.engine.catalog();
    const games = (ED.engine.games || []).filter((g) => g.manifest);
    const first = games[0];
    let title = '', idTouched = false, from = 'blank', copyOf = first ? first.id : '';
    const coreRef = (ED.engine.packCatalog || []).find((c) => c.pack === 'core');
    let packs = coreRef ? [coreRef.key] : [];
    const titleIn = h('input', { type: 'text', placeholder: 'e.g. The Drowned Archive' });
    const idIn = h('input', { type: 'text', class: 'mono', placeholder: 'drowned-archive' });
    const err = h('p', { class: 'error-text' });
    titleIn.addEventListener('input', () => {
      title = titleIn.value;
      if (!idTouched) idIn.value = ED.uniqueId(title || 'new-game', takenIds());
    });
    idIn.addEventListener('input', () => (idTouched = true));
    // '__new__' stands for the game being made: it has no packs of its own yet, so every pack is named with its game
    const blankBox = h('div', null, h('p', { class: 'hint' }, 'The packs it loads. You can change them, and their order, later on its Game page. It starts with one empty floor.'), G.packPicker(packs, (l) => (packs = l), '__new__'));
    const copyBox = h('div', { hidden: true }, F.field('Copy of', F.select(copyOf, games.map((g) => [g.id, g.manifest.title || g.id]), (v) => (copyOf = v))),
      h('p', { class: 'hint' }, 'The copy loads the same packs as the original (it uses them where they are, it doesn’t duplicate them) and starts with a copy of the original’s editor changes: its floors, monsters, items and settings.'));
    const fromSel = F.select(from, [['blank', 'A blank game, from the packs I choose'], ['copy', 'A copy of a game in this workspace']], (v) => {
      from = v;
      blankBox.hidden = v !== 'blank';
      copyBox.hidden = v !== 'copy';
    });
    if (!games.length) fromSel.disabled = true;
    ED.modal({
      title: 'New game',
      wide: true,
      body: h('div', null, F.field('Title', titleIn, 'Shown on its title screen, which you can design on its Game page.'), F.field('Folder', h('div', { class: 'row' }, h('span', { class: 'mono muted' }, 'games/'), idIn, h('span', { class: 'mono muted' }, '/')), 'Lower-case letters, numbers and dashes.'),
        F.field('Start from', fromSel), blankBox, copyBox, err),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Make it', primary: true, onClick: async (btn) => {
        const t = titleIn.value.trim();
        const id = idIn.value.trim() || ED.slug(t);
        if (!t) {
          err.textContent = 'Give it a title first.';
          titleIn.focus();
          return false;
        }
        if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
          err.textContent = 'The folder name can only use lower-case letters, numbers and dashes.';
          return false;
        }
        if (takenIds().includes(id)) {
          err.textContent = 'games/' + id + '/ already exists. Choose another folder name.';
          return false;
        }
        if (from === 'blank' && !packs.length) {
          err.textContent = 'Choose at least one pack (every game needs Core, or a pack like it).';
          return false;
        }
        btn.disabled = true;
        try {
          await create(id, t, from, from === 'copy' ? copyOf : null, packs);
        } catch (e) {
          console.error(e);
          err.textContent = 'Couldn’t make it: ' + e.message;
          btn.disabled = false;
          return false;
        }
      } }],
    });
  };

  async function create(id, title, from, copyOf, packs) {
    const fs = ED.fs, MF = ED.engine.MF;
    const P = ED.engine.paths(id);
    let manifest, editsText = null, spritesText = null;
    if (from === 'copy') {
      const src = (ED.engine.games || []).find((g) => g.id === copyOf);
      if (!src || !src.manifest) throw new Error('There is no game ' + copyOf + ' to copy.');
      manifest = ED.clone(MF.normalize(src.manifest));
      // the original's own packs are named from the copy's point of view: 'core' becomes 'linear-maze/core'
      manifest.packs = (src.manifest.packs || []).map((raw) => {
        const e = MF.entry(raw);
        const r = MF.parseRef(e.pack, copyOf);
        const ref = MF.refFor(r.game, r.pack, id);
        return typeof raw === 'string' ? ref : Object.assign({}, raw, { pack: ref });
      });
      const SP = ED.engine.paths(copyOf);
      // the copy's own header line names its own files
      const head = (t, file) => (t ? t.replace(/^\/\* games\/[^/\s]+\/editor\/[\w.]+( — [^\n]*)?/, '/* ' + file + ' — ' + title.replace(/\*\//g, '* /')) : t);
      editsText = head(await fs.readMaybe(SP.edits), P.edits);
      spritesText = head(await fs.readMaybe(SP.sprites), P.sprites);
      manifest.titleScreen.lines = title.split(/\s+/).filter(Boolean);
    } else {
      manifest = MF.normalize({ id, title, packs });
      manifest.description = '';
    }
    Object.assign(manifest, { id, title, version: '0.1.0', saveKey: null, start: from === 'copy' ? manifest.start : null });
    await fs.write(P.game, MF.gameFile(manifest));
    const blankEdits = "/* " + P.edits + " — " + title + "\n * GENERATED by the Linear Maze Editor (editor/index.html). Nothing changed yet.\n */\n'use strict';\n(function () {\n  LM.editor.apply({ format: 1 });\n})();\n";
    await fs.write(P.edits, editsText || blankEdits);
    await fs.write(P.sprites, spritesText || "/* " + P.sprites + " — " + title + "\n * GENERATED by the Linear Maze Editor: pictures imported for monsters, items and tile sets.\n */\n'use strict';\n(function () {\n  const S = (window.LM.editor.sprites = window.LM.editor.sprites || {});\n})();\n");
    await writeGameList(id);
    await ED.engine.listGames();
    ED.toast('Made games/' + id + '/', 'good');
    await ED.loadGame(id);
    if (ED.ready && ED.engine.gameId === id && !ED.model.levelOrder().length) {
      ED.createFloor('First floor', ED.preview.defaultEnv(), 40, 24, 'room');
      ED.toast('Added a first floor: one room with a start and an exit. Save to keep it.', 'good', 6000);
      ED.go('/game');
    } else ED.go('/game');
  }
})();
