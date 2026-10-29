/* Linear Maze Editor — js/lifts.js
 * Elevators. An elevator belongs to the whole game, not to a floor: it has one place on the
 * building's plan, and the engine builds it into every floor it stops at, at that place, the
 * same way round (engine/elevators.js). So the editor keeps one list of elevators (the edit set's
 * `elevators`), and the map editor shows each floor's view of it:
 *   - the Elevators tab of the map palette: the brush for a new one (size, doors, which way it
 *     faces) and the list of every elevator, with how it sits on this floor;
 *   - an outline of every shaft over the map (dashed where it skips this floor);
 *   - the elevator inspector: name, place, facing, size, the floors it stops at, a car beside it;
 *   - Floor settings → Stairs and elevators: where the stairs up lead, which elevators stop
 *     here, and moving every elevator on this floor at once (elevatorShift).
 * The Floors page has the same stops as a table (ED.lifts.matrix).
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const M = () => ED.model, F = () => ED.forms;
  const EL = () => ED.engine.LM.elevators;
  const T = 32;
  const DIRS = ['s', 'w', 'n', 'e'];
  const DIR_NAMES = { s: 'south', w: 'west', n: 'north', e: 'east' };
  const DIR_ARROWS = { s: '↓', w: '←', n: '↑', e: '→' };
  const LF = (ED.lifts = {});
  LF.TERRAIN = { wall: 'elevator-wall', car: 'elevator-floor', door: 'elevator-door' };
  LF.DIR_NAMES = DIR_NAMES;

  // ------------------------------------------------------------ reading
  /** Does the engine this workspace runs have elevators? (A workspace from before 0.5.1 doesn't.) */
  LF.available = () => !!(ED.engine && ED.engine.LM && ED.engine.LM.elevators && ED.engine.LM.registry.elevators);
  LF.ids = () => (LF.available() ? M().ids('elevators').slice().sort() : []);
  LF.get = (id) => M().raw('elevators', id);
  LF.all = () => LF.ids().map((id) => LF.get(id)).filter(Boolean);
  LF.name = (el) => (el && el.name) || ED.titleCase((el && el.id) || 'elevator');
  /** Changes whenever any elevator does (for caches such as floor thumbnails). */
  LF.version = () => (LF.available() ? JSON.stringify(LF.all()) : '');
  LF.size = (el) => EL().size(el);
  LF.dirOf = (el) => DIRS[EL().turnOf(el)];
  /** Does it stop at this floor? (floors: only these; except: all but these; neither: every floor) */
  LF.serves = function (el, levelId) {
    if (Array.isArray(el.floors)) return el.floors.includes(levelId);
    if (Array.isArray(el.except)) return !el.except.includes(levelId);
    return true;
  };
  LF.onFloor = (levelId) => LF.all().filter((el) => LF.serves(el, levelId));
  LF.shiftOf = (levelId) => EL().shiftOf(M().raw('levels', levelId));
  LF.footprint = (el, levelId) => EL().footprint(el, LF.shiftOf(levelId));
  LF.check = (levelId, el) => EL().check(levelId, el, M().raw('levels', levelId));
  /** cell index → { el, kind } for every shaft built into this floor (later ids on top, as the engine builds them). */
  LF.cells = function (levelId, W, H) {
    const out = new Map();
    if (!LF.available()) return out;
    for (const el of LF.onFloor(levelId)) {
      const fp = LF.footprint(el, levelId);
      if (!fp.cells.every((c) => c.x >= 0 && c.y >= 0 && c.x < W && c.y < H)) continue;
      for (const c of fp.cells) out.set(c.y * W + c.x, { el, kind: c.kind });
    }
    return out;
  };
  /** 'every floor', 'every floor but Floor 3', 'Floors 1 and 2 only'... */
  LF.stopsText = function (el) {
    const order = M().levelOrder();
    const stops = order.filter((id) => LF.serves(el, id));
    if (stops.length === order.length) return Array.isArray(el.floors) ? 'every floor (as listed)' : 'every floor';
    if (!stops.length) return 'no floor';
    const lbl = (ids) => ids.map((id) => M().floorLabel(id)).join(', ');
    const skipped = order.filter((id) => !stops.includes(id));
    if (!Array.isArray(el.floors) && skipped.length <= 3) return 'every floor but ' + lbl(skipped);
    return lbl(stops.slice(0, 4)) + (stops.length > 4 ? ' and ' + (stops.length - 4) + ' more' : '') + ' only';
  };
  /** How it sits on a floor, in a word and a sentence: { cls: 'ok' | 'warn' | 'off', word, text } */
  LF.status = function (el, levelId) {
    if (!LF.serves(el, levelId)) return { cls: 'off', word: 'skips', text: 'Doesn’t stop at this floor.' };
    const ck = LF.check(levelId, el);
    if (!ck.fits) return { cls: 'warn', word: 'doesn’t fit', text: 'Isn’t built here: ' + ck.problems[0] + '.' };
    if (ck.problems.length) return { cls: 'warn', word: ck.clear ? 'overlaps' : 'blocked', text: ck.problems.map((p) => p[0].toUpperCase() + p.slice(1)).join('. ') + '.' };
    return { cls: 'ok', word: 'stops here', text: 'Stops here.' };
  };
  /** The Check panel's notes about elevators on this floor. */
  LF.problems = function (levelId, doc) {
    const out = [];
    if (!LF.available()) return out;
    const W = doc.w;
    for (const el of LF.onFloor(levelId)) {
      const ck = LF.check(levelId, el);
      const fp = ck.fp;
      const at = (c) => (c && c.x >= 0 && c.y >= 0 && c.x < doc.w && c.y < doc.h ? c.y * W + c.x : null);
      if (!ck.fits) out.push({ level: 'warn', text: LF.name(el) + ' isn’t built on this floor: ' + ck.problems[0] + '. Move it, shift this floor’s elevators (Floor settings → Stairs and elevators), or stop it skipping here.', lift: el.id });
      else for (const p of ck.problems) out.push({ level: 'warn', text: LF.name(el) + ': ' + p + '.', i: at(p.includes('wall') ? fp.front[0] : fp.cells[0]), lift: el.id });
      if (ck.fits) {
        let n = 0, stairs = null;
        for (const c of fp.cells) {
          const i = at(c);
          const g = doc.ground[i];
          if ((g && (g.item || g.enemy || g.npc)) || doc.objs[i]) n++;
          const td = g && ED.engine.LM.find('terrain', g.terrain || 'floor');
          const o = doc.objs[i];
          if (!stairs && ((td && (td.entry || td.exit)) || (g && g.start) || (o && typeof o === 'object' && o.start))) stairs = { i, what: td && td.exit ? 'the stairs down' : 'where the player starts' };
        }
        if (stairs) out.push({ level: 'warn', text: LF.name(el) + ' is built over ' + stairs.what + (stairs.what === 'where the player starts' ? ' (a run would start inside the car)' : '') + '.', i: stairs.i, lift: el.id });
        if (n) out.push({ level: 'info', text: ED.plural(n, 'thing') + ' on the map under ' + LF.name(el) + ' are left out (the shaft takes the space).', i: at(fp.cells[0]), lift: el.id });
      }
    }
    return out;
  };

  // ------------------------------------------------------------ changing
  LF.newId = function () {
    let n = LF.ids().length + 1;
    while (M().exists('elevators', 'elevator-' + n)) n++;
    return 'elevator-' + n;
  };
  LF.create = function (def, label) {
    const id = LF.newId();
    const clean = Object.assign({}, def);
    if (!clean.name) clean.name = 'Elevator ' + id.replace('elevator-', '');
    M().create('elevators', id, clean, label || 'New elevator: ' + clean.name);
    return id;
  };
  LF.update = (id, fn, label) => M().update('elevators', id, fn, label || 'Edit ' + LF.name(LF.get(id)));
  LF.remove = (id) => M().remove('elevators', id);
  /** Stop at (or skip) one floor. */
  LF.setStop = function (id, levelId, on) {
    const order = M().levelOrder();
    LF.update(id, (d) => {
      if (Array.isArray(d.floors)) {
        const s = new Set(d.floors);
        if (on) s.add(levelId);
        else s.delete(levelId);
        d.floors = order.filter((x) => s.has(x)).concat([...s].filter((x) => !order.includes(x)));
      } else {
        const s = new Set(d.except || []);
        if (on) s.delete(levelId);
        else s.add(levelId);
        if (s.size) d.except = [...s];
        else delete d.except;
      }
    }, (on ? 'Stop at ' : 'Skip ') + M().floorLabel(levelId) + ': ' + LF.name(LF.get(id)));
  };
  /** 'all': every floor, new ones too · 'except': every floor but the unticked ones · 'only': just the ticked ones. */
  LF.setMode = function (id, mode) {
    const order = M().levelOrder();
    LF.update(id, (d) => {
      const stops = order.filter((x) => LF.serves(d, x));
      delete d.floors;
      delete d.except;
      if (mode === 'only') d.floors = stops;
      else if (mode === 'except') {
        const skip = order.filter((x) => !stops.includes(x));
        if (skip.length) d.except = skip;
      }
    }, 'Where ' + LF.name(LF.get(id)) + ' stops');
  };
  LF.modeOf = (el) => (Array.isArray(el.floors) ? 'only' : Array.isArray(el.except) && el.except.length ? 'except' : 'all');
  /** Turn an elevator a quarter turn about its middle. */
  LF.turned = function (el, delta) {
    const fp = EL().footprint(el, [0, 0]);
    const r = (EL().turnOf(el) + (delta > 0 ? 1 : 3)) % 4;
    const n = Object.assign({}, el, { dir: DIRS[r] });
    const fp2 = EL().footprint(n, [0, 0]);
    n.x = Math.round(fp.x0 + fp.w / 2 - fp2.w / 2);
    n.y = Math.round(fp.y0 + fp.h / 2 - fp2.h / 2);
    return n;
  };
  /** Where a car beside this one goes (sharing a wall), side -1 or 1 along its doors. */
  LF.besidePos = function (el, side) {
    const { w } = LF.size(el);
    const r = EL().turnOf(el);
    const step = w + 1;
    // along the doors: east for a car facing south, then turned with the car
    const [ax, ay] = ED.engine.LM.Level.turnDir(1, 0, r);
    return { x: (el.x | 0) + ax * step * side, y: (el.y | 0) + ay * step * side };
  };

  // ------------------------------------------------------------ drawing
  /** A small picture of an elevator seen from above, for the palette. */
  LF.icon = function (spec, size) {
    const el = Object.assign({}, spec, { x: 0, y: 0 });
    const fp = EL().footprint(el, [0, 0]);
    const c = h('canvas', { width: size * 2, height: size * 2 });
    c.style.width = c.style.height = size + 'px';
    const g = c.getContext('2d');
    const k = (size * 2) / Math.max(fp.w, fp.h);
    const ox = (size * 2 - fp.w * k) / 2, oy = (size * 2 - fp.h * k) / 2;
    for (const cell of fp.cells) {
      g.fillStyle = cell.kind === 'wall' ? '#5a6168' : cell.kind === 'car' ? '#9fb8c6' : '#f2c35b';
      g.fillRect(ox + cell.x * k + 0.5, oy + cell.y * k + 0.5, k - 1, k - 1);
    }
    return c;
  };
  LF.brushLabel = (b) => {
    const s = LF.size(b);
    return 'Elevator ' + s.w + '×' + s.d + ', doors ' + DIR_NAMES[LF.dirOf(b)];
  };

  // ================================================================ the map editor
  const P = ED.MapEditor && ED.MapEditor.prototype;
  if (!P) return;

  /** The elevator whose shaft covers this cell on this floor, if any. */
  P.liftAt = function (i) {
    const c = this.liftCells && this.liftCells.get(i);
    return c ? c.el.id : null;
  };
  /** Work out the shafts on this floor again (after loading, or an elevator changed). */
  P.refreshLiftCells = function () {
    this.liftCells = LF.cells(this.id, this.doc.w, this.doc.h);
  };
  P.liftsChanged = function () {
    const cam = Object.assign({}, this.game.cam);
    this.reload();
    Object.assign(this.game.cam, { x: cam.x, y: cam.y });
    this.problems = ED.mapdoc.validate(this.doc, this.def);
    this.drawStatus();
    if (this.palTabs && this.palTabs.current() === 'lifts') this.palTabs.show('lifts');
    this.dirty = true;
  };

  // ------------------------------------------------------------ the palette tab
  P.liftsTab = function () {
    if (!LF.available()) return h('p', { class: 'hint' }, 'This workspace’s engine is older than elevators (0.5.1).');
    const box = h('div', { class: 'lifts-tab' });
    const st = ED.store.get('liftBrush', { w: 2, d: 2, door: 2, dir: 's' });
    const brush = () => Object.assign({ type: 'lift' }, st);
    const save = () => {
      ED.store.set('liftBrush', st);
      if (this.brush.type === 'lift') this.setBrush(brush());
      drawPreview();
    };
    const preview = h('div', { class: 'lift-brush-icon' });
    const drawPreview = () => ED.clear(preview).append(LF.icon(st, 44));
    const dirSel = F().select(st.dir, DIRS.map((d) => [d, DIR_ARROWS[d] + ' ' + DIR_NAMES[d]]), (v) => {
      st.dir = v;
      save();
    });
    this.liftDirSel = dirSel;
    this.liftBrushState = st;
    const num = (key, min, max) => F().number(st[key], (v) => {
      if (v == null) return;
      st[key] = Math.max(min, Math.min(max, Math.round(v)));
      if (st.door > st.w) st.door = st.w;
      save();
    }, { min, max, step: 1 });
    drawPreview();
    box.append(
      h('div', { class: 'lift-brush-fields' },
        h('div', { class: 'grid2' }, F().field('Car width', num('w', 1, 8)), F().field('Car depth', num('d', 1, 8))),
        h('div', { class: 'grid2' }, F().field('Doors (tiles)', num('door', 1, 8)), F().field('Doors face', dirSel))),
      h('div', { class: 'lift-brush' },
        preview,
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn small primary', on: { click: () => { this.liftMove = null; this.setBrush(brush()); this.setTool('paint'); ED.toast('Click the map where the elevator’s top-left corner goes.'); } } }, 'Place an elevator'),
          h('button', { type: 'button', class: 'btn tiny', title: 'Turn ([)', on: { click: () => this.turnLiftBrush(-1) } }, '⟲'),
          h('button', { type: 'button', class: 'btn tiny', title: 'Turn (])', on: { click: () => this.turnLiftBrush(1) } }, '⟳'))),
      h('p', { class: 'hint' }, 'An elevator is built into every floor, in the same place and the same way round, so cars side by side on one floor are side by side on all of them. Untick floors in its settings to skip them. Walls are added round the car (1 tile), and cars placed one wall apart share it.'));
    const all = LF.all();
    box.appendChild(h('h4', { class: 'lifts-head' }, all.length ? 'Elevators in this game (' + all.length + ')' : 'No elevators yet'));
    const list = h('div', { class: 'lift-list' });
    for (const el of all) {
      const s = LF.status(el, this.id);
      const sz = LF.size(el);
      list.appendChild(h('div', { class: 'legend-row lift-row' + (this.selLift === el.id ? ' on' : ''), title: s.text, on: { click: () => this.selectLift(el.id, true) } },
        LF.icon(el, 22),
        h('span', { class: 'desc' }, h('b', null, LF.name(el)), h('small', { class: 'muted' }, ' ' + sz.w + '×' + sz.d + ' · ' + DIR_ARROWS[LF.dirOf(el)] + ' · ' + LF.stopsText(el))),
        h('span', { class: 'lift-status ' + s.cls }, s.word)));
    }
    box.appendChild(list);
    return box;
  };
  P.turnLiftBrush = function (delta) {
    const st = this.liftBrushState || ED.store.get('liftBrush', { w: 2, d: 2, door: 2, dir: 's' });
    st.dir = DIRS[(DIRS.indexOf(st.dir || 's') + (delta > 0 ? 1 : 3)) % 4];
    ED.store.set('liftBrush', st);
    if (this.brush.type === 'lift') this.setBrush(Object.assign({ type: 'lift' }, st));
    if (this.palTabs && this.palTabs.current() === 'lifts') this.palTabs.show('lifts');
    this.dirty = true;
  };

  // ------------------------------------------------------------ placing and moving
  /** The plan position for a shaft whose box starts at this cell on this floor. */
  P.planAt = function (i) {
    const W = this.doc.w, sh = LF.shiftOf(this.id);
    return { x: (i % W) - sh[0], y: ((i / W) | 0) - sh[1] };
  };
  P.placeLift = function (i) {
    const b = this.brush;
    const pos = this.planAt(i);
    const def = { x: pos.x, y: pos.y, dir: b.dir || 's', w: b.w || 2, d: b.d || 2 };
    if (b.door && b.door !== def.w) def.door = Math.min(b.door, def.w);
    const id = LF.create(def);
    this.selLift = id;
    this.liftsChanged();
    this.showLiftPanel(id);
    const n = M().levelOrder().length;
    ED.toast(LF.name(LF.get(id)) + ' is built into ' + (n > 1 ? 'all ' + n + ' floors' : 'this floor') + ' here. Click again for another; Select to edit it.');
  };
  P.startLiftMove = function (id) {
    this.liftMove = id;
    this.setTool('select');
    ED.toast('Click where its top-left corner goes (Esc to stay put).');
    this.dirty = true;
  };
  P.dropLift = function (i) {
    const id = this.liftMove;
    this.liftMove = null;
    const pos = this.planAt(i);
    LF.update(id, (d) => {
      d.x = pos.x;
      d.y = pos.y;
    }, 'Move ' + LF.name(LF.get(id)));
    this.liftsChanged();
    this.showLiftPanel(id);
  };
  P.nudgeLift = function (id, dx, dy) {
    LF.update(id, (d) => {
      d.x = (d.x | 0) + dx;
      d.y = (d.y | 0) + dy;
    }, 'Move ' + LF.name(LF.get(id)));
    this.liftsChanged();
    this.showLiftPanel(id);
  };
  P.turnSelectedLift = function (delta) {
    if (!this.selLift || !M().exists('elevators', this.selLift)) return false;
    const n = LF.turned(LF.get(this.selLift), delta);
    LF.update(this.selLift, (d) => {
      d.dir = n.dir;
      d.x = n.x;
      d.y = n.y;
    }, 'Turn ' + LF.name(n));
    this.liftsChanged();
    this.showLiftPanel(this.selLift);
    return true;
  };
  P.selectLift = function (id, center) {
    this.selLift = id;
    this.sel = null;
    this.area = null;
    if (center) {
      const fp = LF.footprint(LF.get(id), this.id);
      this.game.cam.x = (fp.x0 + fp.w / 2) * T;
      this.game.cam.y = (fp.y0 + fp.h / 2) * T;
    }
    this.showLiftPanel(id);
    if (this.palTabs && this.palTabs.current() === 'lifts') this.palTabs.show('lifts');
    this.dirty = true;
  };

  // ------------------------------------------------------------ the inspector
  P.showLiftPanel = function (id) {
    const el = LF.get(id);
    if (!el) return this.showLevelPanel();
    const box = ED.clear(this.insp);
    const sz = LF.size(el);
    const sh = LF.shiftOf(this.id);
    const set = (label, fn) => {
      LF.update(id, fn, label);
      this.liftsChanged();
      this.showLiftPanel(id);
    };
    // typed values wait until you pause (and are saved by Save or Undo even if you don't)
    const typed = (label, apply, rerender) => {
      let v;
      const c = ED.pendingCommit(() => {
        LF.update(id, (d) => apply(d, v), label);
        this.liftsChanged();
        if (rerender) this.showLiftPanel(id);
      }, 450);
      return (nv) => {
        v = nv;
        c();
      };
    };
    box.append(
      h('div', { class: 'row' }, LF.icon(el, 30), h('h3', { style: { flex: 1 } }, LF.name(el)), h('button', { class: 'btn tiny quiet', on: { click: () => { this.selLift = null; this.showLevelPanel(); this.dirty = true; } } }, 'Close')),
      h('p', { class: 'muted' }, 'One elevator for the whole game: what you change here changes it on every floor.'),
      F().field('Name', F().text(el.name, typed('Rename elevator', (d, v) => { if (v) d.name = v; else delete d.name; }), { world: true }), 'On its panel in the game.'),
      F().field('Where', h('div', { class: 'row lift-move' },
        h('span', { class: 'mono' }, (el.x | 0) + ', ' + (el.y | 0)),
        sh[0] || sh[1] ? h('span', { class: 'muted' }, '(here ' + ((el.x | 0) + sh[0]) + ', ' + ((el.y | 0) + sh[1]) + ')') : null,
        h('button', { type: 'button', class: 'btn tiny', title: 'Left', on: { click: () => this.nudgeLift(id, -1, 0) } }, '←'),
        h('button', { type: 'button', class: 'btn tiny', title: 'Up', on: { click: () => this.nudgeLift(id, 0, -1) } }, '↑'),
        h('button', { type: 'button', class: 'btn tiny', title: 'Down', on: { click: () => this.nudgeLift(id, 0, 1) } }, '↓'),
        h('button', { type: 'button', class: 'btn tiny', title: 'Right', on: { click: () => this.nudgeLift(id, 1, 0) } }, '→'),
        h('button', { type: 'button', class: 'btn tiny', on: { click: () => this.startLiftMove(id) } }, 'Move…')),
        'The top-left corner of the shaft, walls included, on the building’s plan' + (sh[0] || sh[1] ? '. This floor shifts every elevator by ' + sh.join(', ') + '.' : '.')),
      F().field('Doors face', h('div', { class: 'row lift-turn' },
        h('button', { type: 'button', class: 'btn tiny', title: 'Turn anticlockwise ([)', on: { click: () => this.turnSelectedLift(-1) } }, '⟲'),
        F().select(LF.dirOf(el), DIRS.map((d) => [d, DIR_ARROWS[d] + ' ' + DIR_NAMES[d]]), (v) => set('Turn ' + LF.name(el), (d) => { d.dir = v; })),
        h('button', { type: 'button', class: 'btn tiny', title: 'Turn clockwise (])', on: { click: () => this.turnSelectedLift(1) } }, '⟳')), 'Selected on the map, [ and ] turn it too.'),
      h('div', { class: 'grid3' },
        F().field('Car width', F().number(sz.w, typed('Elevator size', (d, v) => { if (!v) return; d.w = Math.max(1, Math.min(8, Math.round(v))); if (d.door && d.door >= d.w) delete d.door; }, true), { min: 1, max: 8, step: 1 })),
        F().field('Car depth', F().number(sz.d, typed('Elevator size', (d, v) => { if (!v) return; d.d = Math.max(1, Math.min(8, Math.round(v))); }, true), { min: 1, max: 8, step: 1 })),
        F().field('Doors (tiles)', F().number(sz.door, typed('Elevator doors', (d, v) => { if (!v) return; const n = Math.max(1, Math.min(LF.size(d).w, Math.round(v))); if (n === LF.size(d).w) delete d.door; else d.door = n; }, true), { min: 1, max: sz.w, step: 1 }))));
    box.appendChild(F().field('Power', F().text([].concat(el.power || []).join(', '), typed('Elevator power', (d, v) => {
      const l = String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (!l.length) delete d.power;
      else d.power = l.length === 1 ? l[0] : l;
    }), { mono: true, placeholder: 'always on' }), 'A story flag (or several, comma-separated: any of them). Until one is set the car is dark and its doors stay shut. Empty: it always runs.'));
    // parked on this floor without power (and what it brings): the elevator's `parked`, for this floor
    const pk = el.parked && el.parked[this.id];
    const pkObj = pk && typeof pk === 'object' && !Array.isArray(pk) ? pk : null;
    const pkFlag = pk ? [].concat(pkObj ? pkObj.flag || [] : pk).join(', ') : '';
    const lvl = this.id;
    box.appendChild(F().field('Parked here', F().text(pkFlag, typed('Park ' + LF.name(el), (d, v) => {
      const l = String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
      const cur = d.parked && d.parked[lvl];
      if (!l.length) {
        if (d.parked) {
          delete d.parked[lvl];
          if (!Object.keys(d.parked).length) delete d.parked;
        }
        return;
      }
      const flag = l.length === 1 ? l[0] : l;
      d.parked = d.parked || {};
      d.parked[lvl] = cur && typeof cur === 'object' && !Array.isArray(cur) ? Object.assign({}, cur, { flag }) : flag;
    }), { mono: true, placeholder: 'never' }), 'With no power, the car can still be sent to this floor and left here: once this story flag is set it waits here, lit, doors held open, its panel dead. If the flag is set while you’re on this floor, it comes up the shaft and rings first.' +
      (pkObj && pkObj.cargo && [].concat(pkObj.cargo).length ? ' It brings: ' + [].concat(pkObj.cargo).map((c) => (c && c.item) || '?').join(', ') + ' (its cargo; see engine/SPEC.md 6.15).' : '')));
    // where it stops
    const order = M().levelOrder();
    const mode = LF.modeOf(el);
    const stops = h('div', { class: 'insp-section' }, h('h4', null, 'Stops at'),
      F().select(mode, [['all', 'Every floor (new floors too)'], ['except', 'Every floor except the unticked ones'], ['only', 'Only the ticked floors']], (v) => { LF.setMode(id, v); this.liftsChanged(); this.showLiftPanel(id); }));
    const tbl = h('div', { class: 'lift-stops-ed' });
    for (const lid of order) {
      const s = LF.status(el, lid);
      tbl.appendChild(h('label', { class: 'lift-stop-row' + (lid === this.id ? ' here' : ''), title: s.text },
        F().bool(LF.serves(el, lid), (on) => { LF.setStop(id, lid, on); this.liftsChanged(); this.showLiftPanel(id); }),
        h('span', { class: 'lbl' }, M().floorLabel(lid)), h('span', { class: 'nm' }, M().name('levels', lid)),
        h('span', { class: 'lift-status ' + s.cls }, s.word)));
    }
    stops.appendChild(tbl);
    if (mode === 'all') stops.appendChild(h('p', { class: 'hint' }, 'Unticking a floor switches to “every floor except”, so floors you add later still get it.'));
    box.appendChild(stops);
    const here = LF.status(el, this.id);
    if (here.cls === 'warn') box.appendChild(h('div', { class: 'note warn' }, here.text));
    box.appendChild(h('div', { class: 'insp-section actions' },
      h('button', { class: 'btn small', title: 'Another car the same size, beside this one, sharing a wall', on: { click: () => this.liftBeside(id, -1) } }, '+ Car before it'),
      h('button', { class: 'btn small', title: 'Another car the same size, beside this one, sharing a wall', on: { click: () => this.liftBeside(id, 1) } }, '+ Car after it'),
      h('button', { class: 'btn small quiet danger', on: { click: () => { const nm = LF.name(el); LF.remove(id); this.selLift = null; this.liftsChanged(); this.showLevelPanel(); ED.toast('Deleted ' + nm + ' from every floor (Ctrl+Z to undo).'); } } }, 'Delete')));
    box.appendChild(h('p', { class: 'hint' }, 'In the game: walk into the car and press E at its panel to choose a floor. You step out on that floor where you stood in the car. Monsters and items on the map where the shaft goes are left out.'));
  };
  P.liftBeside = function (id, side) {
    const el = LF.get(id);
    const pos = LF.besidePos(el, side);
    const def = Object.assign({}, el, pos);
    delete def.id;
    delete def.pack;
    delete def.name;
    const nid = LF.create(def, 'New car beside ' + LF.name(el));
    this.selLift = nid;
    this.liftsChanged();
    this.showLiftPanel(nid);
  };

  // ------------------------------------------------------------ the overlay
  P.drawLifts = function (ctx, s, r) {
    if (!LF.available()) return;
    const doc = this.doc;
    const W = doc.w, H = doc.h;
    const fpBox = (fp) => [fp.x0 * T, fp.y0 * T, fp.w * T, fp.h * T];
    const arrow = (fp, col) => {
      if (!fp.doors.length) return;
      const xs = fp.doors.map((c) => c.x), ys = fp.doors.map((c) => c.y);
      const cx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * T, cy = ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * T;
      const [ox, oy] = fp.out;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2 / s;
      ctx.beginPath();
      ctx.moveTo(cx - ox * 6, cy - oy * 6);
      ctx.lineTo(cx + ox * 14, cy + oy * 14);
      ctx.moveTo(cx + ox * 14 - oy * 5 - ox * 5, cy + oy * 14 + ox * 5 - oy * 5);
      ctx.lineTo(cx + ox * 14, cy + oy * 14);
      ctx.lineTo(cx + ox * 14 + oy * 5 - ox * 5, cy + oy * 14 - ox * 5 - oy * 5);
      ctx.stroke();
    };
    ctx.font = '600 ' + Math.max(9, 11 / r.zoom) + 'px "IBM Plex Sans", sans-serif';
    for (const el of LF.all()) {
      const fp = LF.footprint(el, this.id);
      const served = LF.serves(el, this.id);
      const fits = fp.cells.every((c) => c.x >= 0 && c.y >= 0 && c.x < W && c.y < H);
      const sel = this.selLift === el.id;
      const col = !served ? 'rgba(160,170,180,0.55)' : fits ? (sel ? '#9fe8ff' : 'rgba(92,200,232,0.85)') : 'rgba(240,138,122,0.9)';
      const [bx, by, bw, bh] = fpBox(fp);
      if (sel) {
        ctx.fillStyle = 'rgba(92,200,232,0.14)';
        ctx.fillRect(bx, by, bw, bh);
      }
      ctx.setLineDash(served && fits ? [] : [6 / s, 4 / s]);
      ctx.strokeStyle = col;
      ctx.lineWidth = (sel ? 3 : 1.5) / s;
      ctx.strokeRect(bx + 1 / s, by + 1 / s, bw - 2 / s, bh - 2 / s);
      ctx.setLineDash([]);
      if (served && fits) arrow(fp, col);
      if (r.zoom >= 0.28 || sel) {
        ctx.fillStyle = col;
        ctx.fillText(LF.name(el) + (!served ? ' · skips this floor' : !fits ? ' · doesn’t fit' : ''), bx + 2, by - 4 / r.zoom);
      }
    }
    // where a new one, or the one being moved, would go
    const b = this.brush;
    const placing = this.liftMove ? LF.get(this.liftMove) : this.tool === 'paint' && b.type === 'lift' ? b : null;
    if (placing && this.hover >= 0 && !this.panning) {
      const pos = this.planAt(this.hover);
      const fp = LF.footprint(Object.assign({}, placing, pos), this.id);
      for (const c of fp.cells) {
        ctx.fillStyle = c.kind === 'wall' ? 'rgba(150,160,170,0.45)' : c.kind === 'car' ? 'rgba(92,200,232,0.35)' : 'rgba(242,195,91,0.6)';
        ctx.fillRect(c.x * T, c.y * T, T, T);
      }
      arrow(fp, '#f2c35b');
      const fits = fp.cells.every((c) => c.x >= 0 && c.y >= 0 && c.x < W && c.y < H);
      ctx.strokeStyle = fits ? '#f2c35b' : '#f08a7a';
      ctx.lineWidth = 2 / s;
      ctx.strokeRect(...fpBox(fp));
    }
  };

  // ------------------------------------------------------------ Floor settings → Stairs and elevators
  P.floorLiftsSection = function (d, commit) {
    const box = h('div');
    const order = M().levelOrder();
    // the stairs up
    const auto = (() => {
      if (this.id === M().startFloor()) return null;
      const i = order.indexOf(this.id);
      const prev = order.filter((x) => x !== this.id).find((x) => {
        const xd = M().raw('levels', x);
        const nx = (xd.exitTo && M().exists('levels', xd.exitTo) && xd.exitTo) || xd.next || order[order.indexOf(x) + 1];
        return nx === this.id;
      });
      return prev || (i > 0 ? order[i - 1] : null);
    })();
    const opts = [[undefined, 'The floor you came down from' + (auto ? ' (usually ' + M().floorLabel(auto) + ')' : this.id === M().startFloor() ? ' (a run starts here: none)' : '')], [false, 'Nowhere: they’re closed']]
      .concat(order.filter((x) => x !== this.id).map((x) => [x, M().floorLabel(x) + ': ' + M().name('levels', x)]));
    box.appendChild(F().field('The stairs up (<) lead to', F().select(d.stairsUp, opts, (v) => { if (v === undefined) delete d.stairsUp; else d.stairsUp = v; commit(); }),
      'Walking back onto the stairs you arrived by takes you up, and the floor above is as you left it. The first floor of a run has nowhere to go up to.'));
    // stairs of their own, found by the tag on their tiles
    const tags = new Set();
    for (const g of this.doc.ground) if (g && g.tag) tags.add(g.tag);
    for (const o of this.doc.objs) if (o && typeof o === 'object' && o.tag) tags.add(o.tag);
    const listId = 'stairtags-' + this.id.replace(/\W/g, '');
    const entries = Object.entries(d.stairs || {}).map(([tag, e]) => Object.assign({ tag }, e));
    const toObj = (l) => {
      const o = {};
      for (const e of l) {
        if (!e || !e.tag) continue;
        const c = Object.assign({}, e);
        delete c.tag;
        o[e.tag] = c;
      }
      return o;
    };
    const spec = { tag: 'tag', to: 'id:levels', dir: [['up', 'up'], ['down', 'down']], until: 'stringlist', locked: 'text', arrive: 'tag', go: 'text' };
    const labels = { tag: 'Its tiles’ tag', to: 'Lead to', dir: 'Sound', until: 'Locked until (any flag)', locked: 'Said while locked', arrive: 'Arrive on the tag', go: 'Button when the floor is finished' };
    box.appendChild(F().field('Stairs that go somewhere of their own', h('div', null,
      h('datalist', { id: listId }, [...tags].map((t) => h('option', { value: t }))),
      F().list(entries, (e, n, set) => {
        const p = F().params(spec, e, (v) => set(v), { labels });
        ED.$$('input.mono', p).forEach((inp) => inp.setAttribute('list', listId));
        return p;
      }, {
        onChange: (l) => {
          const o = toObj(l);
          if (Object.keys(o).length) d.stairs = o;
          else delete d.stairs;
          commit();
        },
        title: (e) => '#' + (e.tag || '?') + (e.to ? ' → ' + (M().exists('levels', e.to) ? M().floorLabel(e.to) : e.to + ' (not made yet)') : '') + (e.until ? ' · until ' + [].concat(e.until).join(' or ') : ''),
        addLabel: 'Add stairs', newItem: () => ({ tag: 'stairs2' }),
      })),
      'Tag a flight of stairs with the Tag tool and it can lead somewhere other than the next floor (stairs down) or the way you came (stairs up), stay locked until a story flag is set, and land you on a tagged tile of the floor it leads to.'));
    if (!LF.available()) return box;
    // elevators stopping here
    const all = LF.all();
    const list = h('div', { class: 'lift-stops-ed' });
    for (const el of all) {
      const s = LF.status(el, this.id);
      list.appendChild(h('label', { class: 'lift-stop-row', title: s.text },
        F().bool(LF.serves(el, this.id), (on) => { LF.setStop(el.id, this.id, on); this.liftsChanged(); this.showLevelPanel(true, 'lifts'); }),
        h('span', { class: 'nm' }, LF.name(el)),
        h('a', { href: '#', on: { click: (e) => { e.preventDefault(); this.selectLift(el.id, true); } } }, 'edit'),
        h('span', { class: 'lift-status ' + s.cls }, s.word)));
    }
    box.appendChild(F().field('Elevators that stop here', all.length ? list : h('p', { class: 'muted' }, 'None yet. The palette’s Elevators tab places one.')));
    // move them all on this floor
    const sh = LF.shiftOf(this.id);
    const setShift = (nx, ny) => {
      if (nx || ny) d.elevatorShift = [nx, ny];
      else delete d.elevatorShift;
      commit();
      if (commit.flush) commit.flush();
      this.liftsChanged();
      this.showLevelPanel(true, 'lifts');
    };
    box.appendChild(F().field('Move every elevator on this floor', h('div', { class: 'row lift-move' },
      h('span', { class: 'mono' }, sh[0] + ', ' + sh[1]),
      h('button', { type: 'button', class: 'btn tiny', on: { click: () => setShift(sh[0] - 1, sh[1]) } }, '←'),
      h('button', { type: 'button', class: 'btn tiny', on: { click: () => setShift(sh[0], sh[1] - 1) } }, '↑'),
      h('button', { type: 'button', class: 'btn tiny', on: { click: () => setShift(sh[0], sh[1] + 1) } }, '↓'),
      h('button', { type: 'button', class: 'btn tiny', on: { click: () => setShift(sh[0] + 1, sh[1]) } }, '→'),
      sh[0] || sh[1] ? h('button', { type: 'button', class: 'btn tiny quiet', on: { click: () => setShift(0, 0) } }, 'Reset') : null),
      'For a floor drawn further along its map than the others. Every elevator moves together, so they keep the same distances and facing.'));
    return box;
  };

  // ================================================================ the Floors page: which elevator stops where
  LF.matrix = function () {
    if (!LF.available()) return null;
    const all = LF.all();
    const order = M().levelOrder();
    const sec = h('section', { class: 'lift-matrix-wrap' }, h('h2', null, 'Elevators'),
      h('p', { class: 'muted' }, all.length
        ? 'Each elevator is in the same place on every floor it stops at. Tick or untick to change where it stops; the map’s Elevators tab places, moves and turns them.'
        : 'None yet. Open a floor’s map, and use the palette’s Elevators tab to place one: it’s built into every floor at the same place.'));
    if (!all.length) return sec;
    const table = h('table', { class: 'lift-matrix' },
      h('thead', null, h('tr', null, h('th', null, 'Floor'), all.map((el) => h('th', { title: LF.stopsText(el) }, LF.name(el))))),
      h('tbody', null, order.map((lid) => h('tr', null,
        h('th', null, h('a', { href: '#/map/' + encodeURIComponent(lid) }, M().floorLabel(lid)), h('small', { class: 'muted' }, ' ' + M().name('levels', lid))),
        all.map((el) => {
          const s = LF.status(el, lid);
          return h('td', { class: 'lift-cell ' + s.cls, title: s.text },
            F().bool(LF.serves(el, lid), (on) => { LF.setStop(el.id, lid, on); ED.rerender(); }),
            s.cls === 'warn' ? h('span', { class: 'lift-status warn' }, s.word) : null);
        })))));
    sec.appendChild(h('div', { class: 'lift-matrix-scroll' }, table));
    return sec;
  };
})();
