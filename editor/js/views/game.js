/* Linear Maze Editor — js/views/game.js
 * The Game page: everything in games/<id>/game.js. The title screen (with a live preview
 * drawn by the real engine), the words on the engine's own screens, the asset packs the
 * game loads, and its details. Saved with everything else (Ctrl+S); new packs load after
 * a reload.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, M = () => ED.model;
  const MF = () => ED.engine.MF;

  const WORD_LABELS = [
    ['floor', 'A floor’s number', '{n} is the number', 'HUD and screens'],
    ['continueGame', 'Continue button', '{floor}, {name}', 'Title screen'],
    ['descend', 'Go to the next floor', '{floor}, {name}', 'Floor finished'],
    ['nextIntro', 'When the next floor has no intro', '', 'Floor finished'],
    ['cleared', 'Floor finished: above the name', '{floor}', 'Floor finished'],
    ['leftBehind', 'Peaceful floor left: above the name', '{floor}', 'Floor finished'],
    ['victoryKicker', 'The end: above the title', '', 'The end'],
    ['victoryTitle', 'The end: title', '', 'The end'],
    ['victoryText', 'The end: text', 'blank lines make paragraphs', 'The end'],
    ['playAgain', 'The end: play again button', '', 'The end'],
    ['deathTitle', 'Death: title', '', 'Death'],
    ['deathText', 'Death: text', '', 'Death'],
    ['tryAgain', 'Death: try again button', '', 'Death'],
    ['backToTitle', 'Back to title button', '', 'The end, death'],
    ['noWayUp', 'Stairs up that lead nowhere', '', 'Stairs back up'],
    ['elevator', 'Elevator: above the floors (an elevator without a name)', '', 'Elevator panel'],
    ['elevatorTitle', 'Elevator: title', '', 'Elevator panel'],
    ['elevatorPrompt', 'Elevator: the E prompt at its panel', '', 'Elevator'],
    ['elevatorHere', 'Elevator: beside this floor', '', 'Elevator panel'],
    ['elevatorBlocked', 'Elevator: beside a floor where its doors open onto a wall', '', 'Elevator panel'],
    ['elevatorStay', 'Elevator: the close button', '', 'Elevator panel'],
    ['elevatorNoPower', 'Elevator: walking up to one with no power', '', 'Elevator'],
    ['elevatorLocked', 'Elevator: beside a floor it can’t go to yet', '', 'Elevator panel'],
    ['stairsLocked', 'Stairs that are locked, or lead to a floor that isn’t there', '', 'Stairs'],
    ['doorNeeds', 'A clearance door that won’t open yet', '{need}: what it needs', 'Doors'],
    ['doorAccepts', 'A clearance door opening', '{need}', 'Doors'],
  ];

  ED.views.game = {
    title: 'Game',
    render(el) {
      const g = M().game();
      const id = ED.engine.gameId;
      const P = ED.engine.paths(id);
      const page = h('div', { class: 'page game-page' });
      el.appendChild(page);
      // every change is one undoable step; the preview follows on the 'change' event
      const set = (label, fn, rerender) => {
        M().setGame(label, fn);
        if (rerender) {
          const v = ED.$('#view'), top = v.scrollTop;
          ED.rerender();
          v.scrollTop = top;
        }
      };

      page.appendChild(h('div', { class: 'page-head' }, h('h1', null, 'Game'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', on: { click: () => ED.play.open() } }, 'Play test'),
          h('button', { class: 'btn', disabled: !ED.fs.canWrite() && ED.fs.kind !== 'readonly', on: { click: (e) => ED.games.packageUi(id, e.target) } }, 'Package for players'),
          ED.fs.canWrite() ? h('button', { class: 'btn quiet', on: { click: () => ED.games.newGame() } }, 'New game') : null)));
      page.appendChild(h('p', { class: 'muted' }, 'What the game is called, how its title screen looks, the words on the engine’s own screens, and the packs of assets it loads. Saved into ', h('code', null, P.game), '.'));

      // ---------------------------------------------------- title screen + live preview
      const ts = g.titleScreen;
      const form = h('div', { class: 'title-form' });
      const titleIn = F().text(g.title, (v) => commitTitle(v), { world: true });
      let titleVal = g.title;
      const commitTitle = (v) => {
        titleVal = v;
        commitTitleD();
      };
      const commitTitleD = ED.pendingCommit(() => set('Rename the game', (G) => {
        const before = G.title;
        G.title = titleVal.trim() || before;
        // lines that were the title's words follow the new title
        if (G.titleScreen.lines.join(' ') === String(before).split(/\s+/).filter(Boolean).join(' ')) G.titleScreen.lines = G.title.split(/\s+/).filter(Boolean);
      }), 450);
      const linesIn = F().longtext(ts.lines.join('\n'), (v) => { linesVal = v; commitLines(); }, { rows: Math.max(2, ts.lines.length + 1), world: true });
      let linesVal = ts.lines.join('\n');
      const commitLines = ED.pendingCommit(() => set('Title screen lines', (G) => {
        const l = linesVal.split('\n').map((x) => x.trim()).filter(Boolean);
        G.titleScreen.lines = l.length ? l : G.title.split(/\s+/);
      }), 350);
      const tsText = (key, label) => {
        let v = ts[key];
        const c = ED.pendingCommit(() => set(label, (G) => { G.titleScreen[key] = v; }), 350);
        return (nv) => {
          v = nv;
          c();
        };
      };
      const fontOpts = MF().FONTS.map((f) => [f, f]);
      const customFont = !MF().FONTS.includes(ts.font);
      form.append(
        F().field('Title', titleIn, 'The game’s name: the browser tab, the launcher, packaged files.'),
        F().field('Title screen lines', linesIn, 'One line per row. The stairs layout steps each line to the right.'),
        F().field('Layout', h('div', { class: 'row' },
          F().select(ts.layout, [['stairs', 'Stairs'], ['stacked', 'Stacked']], (v) => set('Title layout', (G) => { G.titleScreen.layout = v; })),
          F().select(ts.size, [['large', 'Large'], ['medium', 'Medium'], ['small', 'Small']], (v) => set('Title size', (G) => { G.titleScreen.size = v; })))),
        F().field('Font', h('div', null,
          F().select(customFont ? '' : ts.font, fontOpts.concat([['', 'Another font (type its name)']]), (v) => {
            if (v) set('Title font', (G) => { G.titleScreen.font = v; }, true);
            else set('Title font', (G) => { G.titleScreen.font = ''; }, true);
          }),
          customFont ? F().text(ts.font, tsText('font', 'Title font'), { placeholder: 'A font installed on players’ computers, e.g. Georgia', mono: true }) : null),
        customFont ? 'The four listed fonts come with the engine. Another font only shows if the player’s computer has it.' : ''),
        F().field('Accent colour', F().color(g.theme.accent, (v) => { if (/^#[0-9a-f]{6}$/i.test(v || '') || /^#[0-9a-f]{3}$/i.test(v || '')) set('Accent colour', (G) => { G.theme.accent = v; }); }), 'The title, buttons, frames and highlights everywhere in the game.'),
        F().field('Tagline', F().longtext(ts.tagline, tsText('tagline', 'Tagline'), { world: true, rows: 3 }), 'Under the title. Leave it empty for none.'),
        F().field('New game button', F().text(ts.newGame, tsText('newGame', 'New game button'))),
        F().field('Controls', F().bool(ts.showControls !== false, (v) => set('Show the controls', (G) => { G.titleScreen.showControls = v; }), 'Show the list of controls'), 'Gadgets the game has (like the phone’s F) are added to the list.'),
        F().field('Footer', F().text(ts.footer, tsText('footer', 'Title footer')), '{packs} lists the content packs, {version} is the version, {title} the title.'),
        backdropField(g, set));
      const previewBox = h('div', { class: 'title-preview' }, h('div', { class: 'tp-label' }, h('span', null, 'Title screen'), h('small', { class: 'muted' }, 'drawn by the engine, as players see it')));
      const stage = h('div', { class: 'tp-stage' });
      previewBox.appendChild(stage);
      page.appendChild(h('fieldset', { class: 'title-fieldset' }, h('legend', null, 'Title screen'), h('div', { class: 'title-grid' }, form, previewBox)));
      buildPreview(stage);

      // ---------------------------------------------------- packs (redrawn on its own, so the preview keeps running)
      let packsBox = packsSection(g, setPacks);
      function setPacks(label, fn) {
        M().setGame(label, fn);
        const nb = packsSection(M().game(), setPacks);
        packsBox.replaceWith(nb);
        packsBox = nb;
      }
      page.appendChild(packsBox);

      // ---------------------------------------------------- words
      const words = h('fieldset', null, h('legend', null, 'Words on the engine’s screens'),
        h('p', { class: 'muted' }, 'The engine’s own screens: finishing a floor, the end of the game, dying, and the floor numbers. Floors and packs have their own words (intros, outros, conversations).'));
      const wgrid = h('div', { class: 'words-grid' });
      for (const [key, label, ph, where] of WORD_LABELS) {
        let v = g.words[key];
        const c = ED.pendingCommit(() => set('Words: ' + label, (G) => { G.words[key] = v; }), 350);
        const ctl = key === 'victoryText' || key === 'deathText' ? F().longtext(v, (nv) => { v = nv; c(); }, { world: true, rows: 2 }) : F().text(v, (nv) => { v = nv; c(); }, { world: true });
        const def = MF().WORDS[key];
        wgrid.appendChild(F().field(label, ctl, [where, ph ? 'uses ' + ph : '', v !== def ? 'engine default: “' + def + '”' : ''].filter(Boolean).join(' · ')));
      }
      words.appendChild(wgrid);
      page.appendChild(words);

      // ---------------------------------------------------- details
      const det = h('fieldset', null, h('legend', null, 'Details'));
      const txt = (key, label) => {
        let v = g[key];
        const c = ED.pendingCommit(() => set(label, (G) => { G[key] = v; }), 350);
        return (nv) => {
          v = nv;
          c();
        };
      };
      const order = M().levelOrder();
      det.append(
        h('div', { class: 'grid2' },
          F().field('Version', F().text(g.version, txt('version', 'Version'), { mono: true })),
          F().field('First floor of a new run', F().select(g.start && order.includes(g.start) ? g.start : '', [['', 'The top of the floor order (' + (order[0] ? M().name('levels', order[0]) : 'none') + ')']].concat(order.map((l) => [l, M().floorLabel(l) + ': ' + M().name('levels', l)])), (v) => set('First floor', (G) => { G.start = v || null; })), 'The Floors page sets the order.')),
        F().field('Description', F().longtext(g.description, txt('description', 'Description'), { rows: 3 }), 'Shown in the launcher, the game list here, and a packaged game’s README.'),
        F().field('Notes for Claude', F().longtext(g.brief, txt('brief', 'Notes for Claude'), { rows: 3 }), 'Sent with every Ask Claude request for this game: its style, mood and how its text should read.'),
        F().field('Save slot', F().text(g.saveKey || '', (v) => { saveV = v; commitSave(); }, { mono: true, placeholder: MF().saveKey({ id }) }), 'Where the browser keeps this game’s checkpoint. Each game needs its own; leave it empty for the usual one.'),
        F().field('Editor changes', F().bool(g.editorChanges !== false, (v) => set('Editor changes on or off', (G) => { G.editorChanges = v; }, true), 'Load this game’s editor changes when it plays'), g.editorChanges === false ? h('span', { class: 'error-text' }, 'Off: the game plays as its packs define it, without anything made or changed here. The editor still shows and saves your changes.') : 'Turn off to play the game as its packs alone define it.'));
      let saveV = g.saveKey || '';
      const commitSave = ED.pendingCommit(() => set('Save slot', (G) => { G.saveKey = saveV.trim() || null; }), 400);
      page.appendChild(det);

      page.appendChild(h('fieldset', null, h('legend', null, 'Files'),
        h('dl', { class: 'kv' },
          h('dt', null, 'Manifest'), h('dd', null, P.game),
          h('dt', null, 'Editor changes'), h('dd', null, P.edits + ', ' + P.sprites),
          h('dt', null, 'Its own packs'), h('dd', null, P.dir + 'packs/ (if any)'),
          h('dt', null, 'Play it'), h('dd', null, 'engine/index.html?game=' + id))));
    },
  };

  // ------------------------------------------------------------ the backdrop: a floor or a picture
  function backdropField(g, set) {
    const ts = g.titleScreen;
    const order = M().levelOrder();
    const withPath = order.find((l) => M().raw('levels', l).attractPath);
    const kind = ts.picture ? 'picture' : 'floor';
    const floorSel = F().select(ts.background && order.includes(ts.background) ? ts.background : '', [['', 'Automatic (' + (withPath ? M().name('levels', withPath) + ', it has a camera path' : order[0] ? M().name('levels', order[0]) : 'none') + ')']].concat(order.map((l) => [l, M().name('levels', l)])), (v) => set('Title backdrop floor', (G) => { G.titleScreen.background = v || null; }));
    const pics = M().spriteIds().sort();
    const picRow = h('div', { class: 'row' },
      F().select(ts.picture || '', [['', '(none)']].concat(pics.map((p) => [p, p])), (v) => set('Title picture', (G) => { G.titleScreen.picture = v || null; }, true)),
      h('button', { class: 'btn small', on: { click: () => ED.content.importPicture('title-' + ED.engine.gameId, (pid) => { set('Title picture', (G) => { G.titleScreen.picture = pid; }, true); }, { backdrop: true, max: 1600 }) } }, 'Import a picture…'));
    return F().field('Behind the title', h('div', null,
      F().select(kind, [['floor', 'A floor, drifting slowly'], ['picture', 'A picture']], (v) => {
        if (v === 'floor') set('Title backdrop', (G) => { G.titleScreen.picture = null; }, true);
        else {
          const first = M().spriteIds()[0];
          if (first) set('Title backdrop', (G) => { G.titleScreen.picture = first; }, true);
          else ED.content.importPicture('title-' + ED.engine.gameId, (pid) => set('Title picture', (G) => { G.titleScreen.picture = pid; }, true), { backdrop: true, max: 1600 });
        }
      }),
      kind === 'floor' ? floorSel : picRow), kind === 'floor' ? 'A floor with a camera path (attractPath) glides along it; others circle the start.' : 'The picture is darkened on the left so the title stays readable.');
  }

  // ------------------------------------------------------------ the live preview
  let previewWin = null;
  let lastBackground;
  function buildPreview(stage) {
    const holder = h('div', { class: 'tp-frame' });
    stage.appendChild(holder);
    const fit = () => {
      const w = stage.clientWidth || 600;
      holder.style.transform = 'scale(' + w / 1280 + ')';
      stage.style.height = Math.round((w / 1280) * 720) + 'px';
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    ED.onLeave(() => {
      ro.disconnect();
      previewWin = null;
    });
    const M0 = M();
    const doc = ED.engine.frameDoc({ runtime: true, sprites: ED.ser.spritesFile(M0.sprites), edits: ED.ser.editsFile(M0.edits()), boot: true })
      .replace('<head>', '<head><script>' + ED.play.isolate(ED.play.saveKey()) + '</script>');
    lastBackground = undefined;
    ED.engine.makeFrame(doc, 'title-preview-frame', holder).then((w) => {
      const iframe = holder.querySelector('iframe');
      iframe.className = 'tp-iframe';
      iframe.tabIndex = -1;
      const ready = () => {
        if (!w.LM || !w.LM.game) return setTimeout(ready, 60);
        previewWin = w;
        lastBackground = M().game().titleScreen.background;
        pushPreview();
      };
      setTimeout(ready, 40);
    });
  }
  /** Hand the edited manifest to the preview's engine and redraw its title screen. */
  function pushPreview() {
    const w = previewWin;
    if (!w || !w.LM || !w.LM.game) return;
    try {
      const g = M().game();
      const LM = w.LM;
      LM.games[g.id] = JSON.parse(JSON.stringify(g));
      LM.useGame(g.id);
      // pictures imported since the preview opened
      for (const [k, v] of Object.entries(M().sprites)) if (LM.editor.sprites[k] !== v) LM.editor.sprites[k] = v;
      LM.ui.applyTitleScreen();
      if (g.titleScreen.background !== lastBackground) {
        lastBackground = g.titleScreen.background;
        const order = LM.game.levelOrder;
        const bg = g.titleScreen.background;
        LM.game.attractLevelId = (bg && LM.find('levels', bg) && bg) || order.find((id) => LM.get('levels', id).attractPath) || order[0];
        LM.game.toTitle();
      } else LM.ui.fillTitleFoot();
    } catch (e) {
      console.warn('title preview', e);
    }
  }
  ED.on('change', () => {
    if (previewWin && ED.currentView() === 'game') pushPreview();
  });

  // ------------------------------------------------------------ packs
  function packsSection(g, set) {
    const id = ED.engine.gameId;
    const box = h('fieldset', { class: 'packs-fieldset' }, h('legend', null, 'Packs'));
    box.appendChild(h('p', { class: 'muted' }, 'The asset packs this game loads, in order: floors, monsters, items, tile sets, furniture, people and stories. A pack can come from any game in the workspace, with or without its floors. Packs load top to bottom, and a pack has to come after the packs it needs.'));
    const cat = ED.engine.packCatalog || [];
    const findCat = (key) => cat.find((c) => c.key === key);
    const list = h('ol', { class: 'pack-list' });
    const entries = g.packs || [];
    const move = (from, to) => set('Reorder packs', (G) => {
      const [x] = G.packs.splice(from, 1);
      G.packs.splice(to, 0, x);
    }, true);
    entries.forEach((raw, i) => {
      const e = MF().entry(raw);
      const r = MF().parseRef(e.pack, id);
      const wild = r.pack === '*';
      const c = wild ? null : findCat(r.game + '/' + r.pack);
      const ownerTitle = ((ED.engine.games || []).find((x) => x.id === r.game) || {}).manifest;
      const name = wild ? 'Everything from ' + ((ownerTitle && ownerTitle.title) || r.game) : c ? c.info.name || r.pack : r.pack;
      const setEntry = (label, fn) => set(label, (G) => {
        const cur = MF().entry(G.packs[i]);
        fn(cur);
        const simple = cur.levels && !cur.exclude.length;
        G.packs[i] = simple ? cur.pack : Object.assign({ pack: cur.pack }, cur.levels ? {} : { levels: false }, cur.exclude.length ? { exclude: cur.exclude } : {});
      }, true);
      const files = c ? (c.info.scripts || []).concat(c.info.levels || []) : [];
      const loads = files.filter((f) => !e.exclude.includes(f) && (e.levels || !(c.info.levels || []).includes(f))).length;
      const fileBox = files.length ? h('details', { class: 'pack-files' }, h('summary', null, loads ? loads + ' of ' + files.length + ' files load' : 'Loads nothing as set: its floors are left out and it has no other files'),
        h('div', { class: 'file-checks' }, files.map((f) => {
          const isLevel = (c.info.levels || []).includes(f);
          return h('label', { class: 'check' + (isLevel && !e.levels ? ' off' : '') }, (() => {
            const cb = h('input', { type: 'checkbox', checked: !e.exclude.includes(f), disabled: isLevel && !e.levels });
            cb.addEventListener('change', () => setEntry((cb.checked ? 'Load ' : 'Leave out ') + f, (cur) => {
              cur.exclude = cur.exclude.filter((x) => x !== f);
              if (!cb.checked) cur.exclude.push(f);
            }));
            return cb;
          })(), h('span', { class: 'mono' }, f));
        }), h('p', { class: 'hint' }, 'Leaving out a file can break the files after it that use it; the game reports what fails when it loads.'))) : null;
      const hasLevels = wild || (c && (c.info.levels || []).length);
      list.appendChild(h('li', { class: 'pack-row' + (!wild && !c ? ' missing' : '') },
        h('span', { class: 'num' }, String(i + 1)),
        h('div', { class: 'pack-info' },
          h('div', null, h('b', null, name), h('small', { class: 'mono muted' }, '  ' + (wild ? 'games/' + r.game + '/ (every pack it loads)' : MF().packDir(r.game, r.pack)))),
          c && c.info.description ? h('small', { class: 'muted desc' }, c.info.description) : null,
          !wild && !c ? h('small', { class: 'error-text' }, 'This pack isn’t in the workspace.') : null,
          fileBox),
        h('div', { class: 'btns' },
          wild ? h('button', { class: 'btn tiny', title: 'Replace this line with one line per pack, so you can leave some out or reorder them', on: { click: () => expandWild(i, r, e) } }, 'List them separately') : null,
          hasLevels ? F().bool(e.levels, (v) => setEntry(v ? 'Load its floors' : 'Leave its floors out', (cur) => { cur.levels = v; }), 'Its floors') : h('span', { class: 'muted small' }, 'no floors'),
          h('button', { class: 'btn tiny quiet', title: 'Load earlier', disabled: i === 0, on: { click: () => move(i, i - 1) } }, '↑'),
          h('button', { class: 'btn tiny quiet', title: 'Load later', disabled: i === entries.length - 1, on: { click: () => move(i, i + 1) } }, '↓'),
          h('button', { class: 'btn tiny quiet danger', on: { click: () => set('Remove a pack', (G) => { G.packs.splice(i, 1); }, true) } }, 'Remove'))));
    });
    if (!entries.length) list.appendChild(h('li', { class: 'muted' }, 'No packs. Add some: every game needs Core, or a pack like it.'));
    /** 'other-game/*' → one entry per pack that game loads, with the wildcard's options carried over. */
    function expandWild(i, r, e) {
      const other = ((ED.engine.games || []).find((x) => x.id === r.game) || {}).manifest;
      if (!other) return ED.toast('There is no game ' + r.game + ' in this workspace.', 'bad');
      const out = [];
      for (const raw of other.packs || []) {
        const oe = MF().entry(raw);
        const orf = MF().parseRef(oe.pack, r.game);
        if (orf.pack === '*') continue;
        const levels = e.levels && oe.levels;
        const exclude = e.exclude.concat(oe.exclude);
        const ref = MF().refFor(orf.game, orf.pack, id);
        out.push(levels && !exclude.length ? ref : Object.assign({ pack: ref }, levels ? {} : { levels: false }, exclude.length ? { exclude } : {}));
      }
      set('List ' + (other.title || r.game) + '’s packs separately', (G) => {
        G.packs.splice(i, 1, ...out);
      }, true);
    }
    box.appendChild(list);
    const problems = h('div', { class: 'pack-problems' });
    box.appendChild(h('div', { class: 'actions' },
      h('button', { class: 'btn small', on: { click: () => addPacks(g, set) } }, 'Add or remove packs…'),
      M().packsChanged() ? h('button', { class: 'btn small primary', on: { click: async () => { await ED.save(); } } }, 'Save and load the new packs') : null));
    if (M().packsChanged()) box.appendChild(h('p', { class: 'note info' }, 'The packs changed. The editor still shows the packs it opened with; save, then reload, to work with the new ones (Save offers to reload).'));
    box.appendChild(problems);
    if (!M().packsChanged()) {
      const miss = missingContent();
      if (miss.length) {
        const byId = new Map();
        for (const m of miss) {
          const k = m.kind + ':' + m.id;
          if (!byId.has(k)) byId.set(k, Object.assign({ levels: new Set() }, m));
          byId.get(k).levels.add(M().name('levels', m.level));
        }
        const shown = [...byId.values()].slice(0, 12);
        const where = shown.map(() => h('span', { class: 'muted' }));
        box.appendChild(h('div', { class: 'note warn' }, h('b', null, 'Floors use things no loaded pack has: '),
          h('ul', null, shown.map((m, i) => h('li', null, h('code', null, m.id), ' (' + m.label + ') on ' + [...m.levels].join(', '), where[i]))),
          byId.size > 12 ? h('p', null, 'and ' + (byId.size - 12) + ' more.') : null,
          h('p', { class: 'muted' }, 'Add the pack they come from, or change those floors. They are left out when the floor loads.')));
        ED.engine.findProviders(shown.map((m) => m.id)).then((found) => shown.forEach((m, i) => {
          const list = found.get(m.id) || [];
          where[i].textContent = list.length ? ' · in ' + list.map((c) => (c.info.name || c.pack) + ' (' + c.key + ')').join(', ') : ' · not in any pack here';
        })).catch(() => {});
      }
    }
    // check the list as the engine would read it
    ED.engine.planFor(id, M().game()).then((plan) => {
      ED.clear(problems);
      const nFloors = plan.packs.reduce((n, p) => n + (p.levels ? (p.info.levels || []).filter((f) => !p.exclude.includes(f)).length : 0), 0);
      problems.appendChild(h('p', { class: 'hint' }, 'Loads ' + ED.plural(plan.packs.length, 'pack') + ', ' + ED.plural(plan.scripts.length, 'file') + ' (' + ED.plural(nFloors, 'floor file') + '), then this game’s editor changes' + (plan.game.editorChanges === false ? ' (switched off below)' : '') + '.'));
      if (plan.problems.length) problems.appendChild(h('div', { class: 'note warn' }, h('b', null, 'Check these: '), h('ul', null, plan.problems.map((p) => h('li', null, p)))));
    }).catch((e) => problems.appendChild(h('p', { class: 'error-text' }, e.message)));
    return box;
  }

  /** Ids the game's floors place (tiles, items, monsters, people, tile sets) that no loaded pack or edit defines. */
  function missingContent() {
    const LM = ED.engine.LM, out = [];
    const KIND = { terrain: ['terrain', 'tile'], item: ['items', 'item'], enemy: ['enemies', 'monster'], npc: ['npcs', 'person'] };
    for (const lid of M().levelOrder()) {
      const L = M().raw('levels', lid);
      if (!L) continue;
      if (L.environment && !M().exists('environments', L.environment)) out.push({ level: lid, kind: 'environments', id: L.environment, label: 'tile set' });
      const legend = Object.assign({}, LM.registry.legend, L.legend || {});
      const chars = new Set();
      for (const row of L.map || []) for (const ch of row) chars.add(ch);
      for (const ch of chars) {
        const e = legend[ch];
        if (!e || typeof e !== 'object') continue;
        for (const [field, [kind, label]] of Object.entries(KIND)) if (e[field] && !M().exists(kind, e[field])) out.push({ level: lid, kind, id: e[field], label });
      }
      const ol = L.objectLegend || {};
      const ochars = new Set();
      for (const row of L.objects || []) for (const ch of row) ochars.add(ch);
      for (const ch of ochars) {
        const e = ol[ch];
        if (!e) continue;
        const ids = typeof e === 'string' ? [['items', e, 'item']] : Object.entries(KIND).filter(([f]) => e[f]).map(([f, [kind, label]]) => [kind, e[f], label]);
        for (const [kind, id, label] of ids) if (!M().exists(kind, id)) out.push({ level: lid, kind, id, label });
      }
    }
    return out;
  }

  function addPacks(g, set) {
    let next = (g.packs || []).slice();
    ED.modal({
      title: 'Packs for ' + g.title,
      wide: true,
      body: h('div', null, h('p', { class: 'muted' }, 'Tick the packs to load. New ones go to the end of the list; reorder them on the Game page. “Everything from this game” loads every pack that game loads, in its order.'), ED.games.packPicker(next, (l) => (next = l), ED.engine.gameId)),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Use these packs', primary: true, onClick: () => set('Choose packs', (G) => {
        // keep the options (no floors, left-out files) of packs that stay
        const MF0 = MF();
        const old = new Map(G.packs.map((p) => [MF0.entry(p).pack, p]));
        G.packs = next.map((p) => (old.has(MF0.entry(p).pack) ? old.get(MF0.entry(p).pack) : p));
      }, true) }],
    });
  }
})();
