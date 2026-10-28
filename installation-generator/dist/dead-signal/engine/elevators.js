/* The Linear Maze engine — engine/elevators.js
 * Elevators: shafts that run through every floor they stop at.
 *
 * An elevator is defined once for the whole game (a pack's `elevators`, or the editor's), not on a
 * floor. Its place is a tile position on the building's plan, so every floor gets it at the same
 * spot, the same way round, the same size. Three cars side by side on one floor are side by side on
 * every floor; two banks keep the same distance on every floor. Each floor builds the shaft into its
 * map as it loads (the walls, the car's floor, the doors and the call panel), so the floor's own map
 * doesn't have to draw it, and it can't be drawn differently on one floor by mistake.
 *
 *   elevators: {
 *     'east-1': {
 *       name: 'East elevator',  // shown on the panel
 *       x: 30, y: 12,           // the top-left tile of the shaft (walls included) on the plan
 *       dir: 's',               // which way the doors open: 's' (default), 'w', 'n' or 'e'
 *       w: 2, d: 2,             // the car inside: width along the doors, depth (tiles); walls add 1 all round
 *       door: 2,                // how wide the doors are (tiles, centred; default: the car's width)
 *       floors: ['a', 'b'],     // optional: stop only at these floors
 *       except: ['c'],          // optional: stop everywhere but these (new floors are included)
 *       power: 'liftsOn',       // optional: a story flag (or a list, any of them); until it's set the car is
 *                               // dark and its doors stay shut (the game's elevatorNoPower words say so)
 *       stops: { c: { until: 'keycard', text: 'needs a keycard' } },  // optional: a stop you can't choose yet
 *     },
 *   }
 *
 * With neither floors nor except, an elevator stops at every floor of the game.
 * A floor can shift the whole plan with `elevatorShift: [dx, dy]` (tiles), for a floor drawn further
 * along its map than the others: every elevator moves together, so distances and facing stay the same.
 * A floor where the shaft doesn't fit inside the map doesn't get that elevator; the editor says so.
 *
 * Inside, the panel (E) lists the floors; the doors close, the car hums, and you step out on the
 * floor you chose, standing where you stood in the car. Floors remember how you left them
 * (engine/memory.js), so an elevator ride back finds a floor as you left it.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const EL = (LM.elevators = {});
  const DIR_TURN = { s: 0, w: 1, n: 2, e: 3 };
  const TURN_DIR = ['s', 'w', 'n', 'e'];
  const FACE_OF = { '0,1': 's', '0,-1': 'n', '1,0': 'e', '-1,0': 'w' };
  EL.DIR_TURN = DIR_TURN;
  EL.TURN_DIR = TURN_DIR;

  // ------------------------------------------------------------ the plan
  const int = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? Math.round(+v) : d);
  /** Quarter turns clockwise from facing south (0 south, 1 west, 2 north, 3 east), as furniture turns. */
  EL.turnOf = (el) => (el && DIR_TURN[el.dir] != null ? DIR_TURN[el.dir] : (((int(el && el.dir, 0) % 4) + 4) % 4));
  EL.size = function (el) {
    const w = U.clamp(int(el.w, 2), 1, 8), d = U.clamp(int(el.d, 2), 1, 8);
    return { w, d, door: U.clamp(int(el.door, w), 1, w) };
  };
  /** Every elevator in the game, in a fixed order. */
  EL.list = () => Object.keys(LM.registry.elevators || {}).sort().map((id) => LM.registry.elevators[id]).filter((e) => e && typeof e === 'object');
  /** Does this elevator stop at this floor? */
  EL.serves = function (el, levelId) {
    if (!el || !LM.find('levels', levelId)) return false;
    if (Array.isArray(el.floors)) return el.floors.includes(levelId);
    if (Array.isArray(el.except) && el.except.includes(levelId)) return false;
    return true;
  };
  EL.forLevel = (levelId) => EL.list().filter((el) => EL.serves(el, levelId));
  const anyFlag = (game, f) => [].concat(f).some((n) => game && game.hasFlag && game.hasFlag(n));
  /** Does this elevator have power? (no `power` field: always) */
  EL.powered = (el, game) => !el || !el.power || (Array.isArray(el.power) && !el.power.length) || anyFlag(game, el.power);
  /** Is this stop open to choose? { ok, text } from the elevator's `stops`. */
  EL.stopOpen = function (el, levelId, game) {
    const s = el && el.stops && el.stops[levelId];
    if (!s || !s.until || anyFlag(game, s.until)) return { ok: true };
    return { ok: false, text: s.text || LM.text('elevatorLocked') };
  };
  /** A floor's shift of the whole plan, in tiles. */
  EL.shiftOf = (def) => (def && Array.isArray(def.elevatorShift) ? [int(def.elevatorShift[0], 0), int(def.elevatorShift[1], 0)] : [0, 0]);

  /**
   * The tiles an elevator covers on a floor whose plan is shifted by `shift`:
   * { x0, y0, w, h (the box), turn, cells: [{ x, y, kind: 'wall' | 'car' | 'door' }], doors, car,
   *   front (the tiles just outside the doors), out: [dx, dy] (the way out), panel: { x, y, face } }
   */
  EL.footprint = function (el, shift) {
    const { w, d, door } = EL.size(el);
    const r = EL.turnOf(el);
    const LW = w + 2, LD = d + 2;
    const x0 = int(el.x, 0) + ((shift && shift[0]) | 0), y0 = int(el.y, 0) + ((shift && shift[1]) | 0);
    // the shaft as drawn facing south, turned clockwise r times inside its box (the box keeps its top-left)
    const place = (lx, ly) => {
      if (r === 1) return [LD - 1 - ly, lx];
      if (r === 2) return [LW - 1 - lx, LD - 1 - ly];
      if (r === 3) return [ly, LW - 1 - lx];
      return [lx, ly];
    };
    const off = Math.floor((w - door) / 2);
    const cells = [], doors = [], car = [];
    for (let ly = 0; ly < LD; ly++) {
      for (let lx = 0; lx < LW; lx++) {
        let kind = 'wall';
        if (lx >= 1 && lx <= w && ly >= 1 && ly <= d) kind = 'car';
        else if (ly === LD - 1 && lx >= 1 + off && lx <= off + door) kind = 'door';
        const [mx, my] = place(lx, ly);
        const c = { x: x0 + mx, y: y0 + my, kind };
        cells.push(c);
        if (kind === 'door') doors.push(c);
        else if (kind === 'car') car.push(c);
      }
    }
    const out = LM.Level.turnDir(0, 1, r);
    const front = doors.map((c) => ({ x: c.x + out[0], y: c.y + out[1] }));
    const [px, py] = place(0, d);
    const inward = LM.Level.turnDir(1, 0, r);
    const box = r % 2 ? [LD, LW] : [LW, LD];
    return { x0, y0, w: box[0], h: box[1], turn: r, cells, doors, car, front, out, panel: { x: x0 + px, y: y0 + py, face: FACE_OF[inward[0] + ',' + inward[1]] } };
  };

  /** A floor's map tile at (x, y), read straight from its definition (no level needs building). */
  function terrainReader(def) {
    const rows = def.map || [];
    const legend = Object.assign({}, LM.registry.legend, def.legend || {});
    const VOID = LM.find('terrain', 'void') || { solid: true };
    const W = rows.reduce((m, r) => Math.max(m, r.length), 0), H = rows.length;
    const at = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return VOID;
      const ch = x < rows[y].length ? rows[y][x] : ' ';
      let e = legend[ch];
      if (e === undefined) return LM.find('terrain', 'floor') || VOID;
      if (typeof e === 'string') e = { terrain: e };
      return LM.find('terrain', e.terrain || 'floor') || VOID;
    };
    return { W, H, at };
  }
  EL.terrainReader = terrainReader;

  /**
   * How an elevator sits on a floor: { serves, fits, clear, fp, problems: [text] }.
   * fits: the whole shaft is inside the map. clear: at least one tile in front of the doors can be
   * walked on (not a wall, the void, a pit or another shaft).
   */
  EL.check = function (levelId, el, defOverride) {
    const def = defOverride || LM.find('levels', levelId);
    const res = { serves: EL.serves(el, levelId), fits: false, clear: false, fp: null, problems: [] };
    if (!def) return res;
    const rd = terrainReader(def);
    const fp = (res.fp = EL.footprint(el, EL.shiftOf(def)));
    res.fits = fp.cells.every((c) => c.x >= 0 && c.y >= 0 && c.x < rd.W && c.y < rd.H);
    if (!res.fits) {
      res.problems.push('it doesn’t fit inside the map (the shaft runs from ' + fp.x0 + ', ' + fp.y0 + ' to ' + (fp.x0 + fp.w - 1) + ', ' + (fp.y0 + fp.h - 1) + '; the map is ' + rd.W + '×' + rd.H + ')');
      return res;
    }
    const shift = EL.shiftOf(def);
    const walls = new Set();
    for (const o of EL.forLevel(levelId)) if (o !== el && o.id !== el.id) for (const c of EL.footprint(o, shift).cells) walls.add(c.x + ',' + c.y);
    res.clear = fp.front.some((c) => {
      const td = rd.at(c.x, c.y);
      return !walls.has(c.x + ',' + c.y) && (!td.solid || td.door) && td.hazard !== 'pit';
    });
    if (!res.clear) res.problems.push('its doors open onto a wall (or nothing) here');
    for (const c of fp.cells) {
      if (walls.has(c.x + ',' + c.y)) {
        const other = EL.forLevel(levelId).find((o) => o !== el && o.id !== el.id && EL.footprint(o, shift).cells.some((k) => k.x === c.x && k.y === c.y && (k.kind !== 'wall' || c.kind !== 'wall')));
        if (other) {
          res.problems.push('it overlaps ' + (other.name || other.id));
          break;
        }
      }
    }
    return res;
  };

  // ------------------------------------------------------------ building it into a floor
  /** Called by the Level constructor: write every elevator that stops here into the floor's tiles. */
  EL.stamp = function (L) {
    L.lifts = [];
    const id = L.def && L.def.id;
    if (!id || !LM.registry.elevators || !LM.find('levels', id)) return;
    const list = EL.forLevel(id);
    if (!list.length) return;
    const W = LM.find('terrain', 'elevator-wall'), F = LM.find('terrain', 'elevator-floor'), D = LM.find('terrain', 'elevator-door');
    if (!W || !F || !D) return;
    const shift = EL.shiftOf(L.def);
    for (const el of list) {
      const fp = EL.footprint(el, shift);
      if (!fp.cells.every((c) => L.inBounds(c.x, c.y))) continue;
      const covered = new Set(fp.cells.map((c) => L.idx(c.x, c.y)));
      // the shaft replaces whatever the map had there, and anything placed on it
      L.spawns = L.spawns.filter((sp) => !covered.has(L.idx(sp.x, sp.y)));
      for (const c of fp.cells) {
        const i = L.idx(c.x, c.y);
        L.terrain[i] = c.kind === 'wall' ? W : c.kind === 'car' ? F : D;
        L.variant[i] = 0;
        L.rot[i] = c.kind === 'door' ? fp.turn % 2 : -1;
        if (c.kind === 'door') L.spawns.push({ kind: 'door', x: c.x, y: c.y, lock: null, style: 'elevator', props: {}, lift: el.id });
      }
      L.spawns.push({ kind: 'item', id: 'elevator-panel', x: fp.panel.x, y: fp.panel.y, props: { face: fp.panel.face, elevator: el.id } });
      L.lifts.push({ id: el.id, def: el, fp });
      // a start that the shaft walled over moves into the car
      if (L.start && covered.has(L.idx(L.start.x, L.start.y)) && L.terrain[L.idx(L.start.x, L.start.y)] !== F) L.start = { x: fp.car[0].x, y: fp.car[0].y };
    }
  };

  // ------------------------------------------------------------ the car, on the floor being played
  class Car {
    constructor(game, lift) {
      const L = game.level;
      this.id = lift.id;
      this.def = lift.def;
      this.fp = lift.fp;
      this.doors = lift.fp.doors.map((c) => L.doorAt[L.idx(c.x, c.y)]).filter(Boolean);
      this.doors.forEach((d, i) => {
        d.ctrl = this;
        d.part = i;
      });
      const xs = lift.fp.car.map((c) => c.x), ys = lift.fp.car.map((c) => c.y);
      this.box = { x0: Math.min(...xs) * T, y0: Math.min(...ys) * T, x1: (Math.max(...xs) + 1) * T, y1: (Math.max(...ys) + 1) * T };
      // the doorway, for drawing the doors as one pair
      const dx = this.doors.map((d) => d.tx), dy = this.doors.map((d) => d.ty);
      this.way = { x0: Math.min(...dx) * T, y0: Math.min(...dy) * T, x1: (Math.max(...dx) + 1) * T, y1: (Math.max(...dy) + 1) * T };
      this.hold = 0;
      this.ride = null;
      this.light = 0;
    }
    /** Is this body inside the car (pad: how far past the walls still counts)? */
    holds(e, pad) {
      const p = pad || 0, b = this.box;
      return e.x > b.x0 - p && e.x < b.x1 + p && e.y > b.y0 - p && e.y < b.y1 + p;
    }
    /** The doors open for you when you're at them or inside, and for monsters chasing you. */
    wantOpen(game) {
      if (this.ride || this.hold > 0) return false;
      const P = game.player;
      if (!P || P.dead) return false;
      if (!EL.powered(this.def, game)) return false;
      if (this.holds(P, 0)) return true;
      for (const d of this.doors) if (U.dist(P.x, P.y, d.x, d.y) < 50) return true;
      for (const e of game.enemies) {
        if (e.dead || !e.aggro) continue;
        for (const d of this.doors) if (U.dist(e.x, e.y, d.x, d.y) < 40) return true;
      }
      return false;
    }
    shut() {
      return this.doors.every((d) => d.open <= 0.001);
    }
    update(game, dt) {
      this.light = U.approach(this.light, this.ride && this.ride.moving ? 1 : 0, dt * 3);
      // no power: dark inside, and the doors say why when you walk up to them
      const on = EL.powered(this.def, game);
      if (this.lamp && this.lamp.off === on) this.lamp.off = !on;
      if (!on) {
        const P = game.player;
        const near = P && !P.dead && this.doors.some((d) => U.dist(P.x, P.y, d.x, d.y) < 44);
        if (near && !this.told) {
          this.told = true;
          game.toast(LM.text('elevatorNoPower'), 'warn');
          LM.audio.play('locked', { vol: 0.6 });
        } else if (!near && P && this.doors.every((d) => U.dist(P.x, P.y, d.x, d.y) > 90)) this.told = false;
      }
      if (this.hold > 0) {
        this.hold -= dt;
        if (this.hold <= 0 && this.arriving) {
          this.arriving = false;
          LM.audio.play('liftDing', { vol: game.vol(this.way.x0, this.way.y0) });
        }
      }
      const r = this.ride;
      if (!r) return;
      const P = game.player;
      if (!P || P.dead) {
        this.ride = null;
        return;
      }
      if (!r.moving) {
        r.wait += dt;
        if (!this.holds(P, -3)) {
          this.ride = null;
          game.toast('You stepped out. The doors open again.');
          return;
        }
        if (this.shut() && r.wait > 0.3) {
          r.moving = true;
          r.t = 0;
          LM.audio.play('lift');
          game.addShake(0.1);
        } else if (r.wait > 6) {
          this.ride = null;
          game.toast('The doors won’t close.', 'warn');
        }
        return;
      }
      r.t += dt;
      game.cam.trauma = Math.max(game.cam.trauma, 0.06);
      if (r.t > 1.15 && !r.left) {
        r.left = true;
        EL.leave(game, this, r.target);
      }
    }
    /** Choose a floor: the doors close and the car goes. */
    send(game, levelId) {
      if (this.ride || levelId === game.levelId) return;
      this.ride = { target: levelId, wait: 0, moving: false, t: 0 };
      for (const d of this.doors) d.closeT = 0;
      LM.audio.play('switch');
    }
  }
  EL.Car = Car;

  /** Build the cars on a freshly loaded floor. opts.via === 'elevator' with opts.lift: you're arriving in that car. */
  EL.attach = function (game, opts) {
    const L = game.level;
    game.lifts = (L.lifts || []).map((lift) => new Car(game, lift));
    // a ceiling light in every car
    for (const c of game.lifts) {
      const b = c.box;
      c.lamp = game.addStaticLight({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, color: '#e9f1ff', radius: Math.max(b.x1 - b.x0, b.y1 - b.y0) + 40, intensity: 0.55, flicker: 0 });
      if (c.lamp) c.lamp.off = !EL.powered(c.def, game);
    }
    if (opts && opts.via === 'elevator' && opts.lift) {
      const car = game.lifts.find((c) => c.id === opts.lift);
      if (car) {
        car.hold = 0.75;
        car.arriving = true;
        for (const d of car.doors) d.open = 0;
      }
    }
  };
  EL.update = function (game, dt) {
    for (const c of game.lifts || []) c.update(game, dt);
  };
  EL.carOf = (game, id) => (game.lifts || []).find((c) => c.id === id) || null;

  /** The floors this car can go to, in the order of the run. */
  EL.stops = function (game, el) {
    return game.levelOrder.filter((id) => EL.serves(el, id)).map((id) => {
      const ck = EL.check(id, el);
      const open = EL.stopOpen(el, id, game);
      return { id, label: game.floorLabel(id), name: LM.get('levels', id).name || id, here: id === game.levelId, fits: ck.fits, clear: ck.clear, locked: open.ok ? null : open.text };
    }).filter((s) => s.fits);
  };

  /** Ride: arrive on the chosen floor in the same car, standing where you stood. */
  EL.leave = function (game, car, levelId) {
    const P = game.player;
    const here = EL.shiftOf(game.level.def), there = EL.shiftOf(LM.get('levels', levelId));
    const at = { x: P.x + (there[0] - here[0]) * T, y: P.y + (there[1] - here[1]) * T };
    game.travel(levelId, { via: 'elevator', lift: car.id, at, quiet: true });
  };

  // ------------------------------------------------------------ the panel
  EL.openPanel = function (game, id) {
    const car = EL.carOf(game, id);
    if (!car) return;
    if (!EL.powered(car.def, game)) return game.toast(LM.text('elevatorNoPower'), 'warn');
    const h = LM.ui.h;
    const stops = EL.stops(game, car.def);
    const buttons = [];
    const rows = stops.map((s, i) => {
      const key = i < 9 ? String(i + 1) : null;
      const b = h('button', { type: 'button', class: 'lift-stop' + (s.here ? ' here' : ''), disabled: s.here || !s.clear || !!s.locked },
        h('kbd', null, key || ''), h('span', { class: 'lift-floor' }, s.label), h('span', { class: 'lift-name' }, s.name),
        s.here ? h('em', null, LM.text('elevatorHere')) : !s.clear ? h('em', null, LM.text('elevatorBlocked')) : s.locked ? h('em', null, s.locked) : null);
      b.addEventListener('click', () => {
        LM.audio.play('ui');
        LM.ui.close();
        car.send(game, s.id);
      });
      if (key) buttons.push(b);
      return b;
    });
    LM.ui.open({
      kicker: car.def.name || LM.text('elevator'),
      title: LM.text('elevatorTitle'),
      className: 'lift-panel',
      body: h('div', { class: 'lift-stops' }, rows.length ? rows : h('p', { class: 'muted' }, 'This elevator stops nowhere else.')),
      actions: [{ label: LM.text('elevatorStay'), quiet: true }],
      numbered: buttons,
    });
  };

  // ------------------------------------------------------------ the doors (Door with style 'elevator')
  /** The first door of a car draws the whole doorway: two steel leaves that part from the middle. */
  EL.drawDoor = function (ctx, door, game, t) {
    const car = door.ctrl;
    if (!car) return false;
    if (door.part) return true;
    const w = car.way, k = U.ease.inOutSine(car.doors[0].open);
    const across = door.horizontal;
    ctx.save();
    // draw in the doorway's own frame: x along the doors, y across them (thickness)
    const cx = (w.x0 + w.x1) / 2, cy = (w.y0 + w.y1) / 2;
    const len = across ? w.x1 - w.x0 : w.y1 - w.y0;
    ctx.translate(cx, cy);
    if (!across) ctx.rotate(Math.PI / 2);
    const half = len / 2, th = 5;
    // threshold
    ctx.fillStyle = '#2a2d31';
    ctx.fillRect(-half, -th - 1, len, (th + 1) * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(-half, -0.5, len, 1);
    ctx.beginPath();
    ctx.rect(-half + 2, -th - 2, len - 4, (th + 2) * 2);
    ctx.clip();
    const slide = k * (half - 3);
    for (const side of [-1, 1]) {
      const x = side < 0 ? -half - slide : slide;
      const grd = ctx.createLinearGradient(x, 0, x + half, 0);
      grd.addColorStop(0, '#8d949b');
      grd.addColorStop(0.45, '#c5cbd1');
      grd.addColorStop(1, '#8a9197');
      ctx.fillStyle = grd;
      ctx.fillRect(x, -th, half, th * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x, -th, half, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x, th - 1, half, 1);
      // brushed lines
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 2; i < half - 1; i += 3) ctx.fillRect(x + i, -th + 1.5, 0.6, th * 2 - 3);
      // the meeting edge
      ctx.fillStyle = '#4b5056';
      ctx.fillRect(side < 0 ? x + half - 1 : x, -th, 1, th * 2);
    }
    ctx.restore();
    // frame posts at both ends
    ctx.save();
    ctx.translate(cx, cy);
    if (!across) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#1f2226';
    ctx.fillRect(-half, -th - 2, 3, (th + 2) * 2);
    ctx.fillRect(half - 3, -th - 2, 3, (th + 2) * 2);
    ctx.fillStyle = '#9aa1a8';
    ctx.fillRect(-half + 1, -th - 2, 1, (th + 2) * 2);
    ctx.fillRect(half - 2, -th - 2, 1, (th + 2) * 2);
    ctx.restore();
    return true;
  };
  /** A lamp over the doors on the outside: amber while the car is here, bright while it moves. */
  EL.drawDoorGlow = function (ctx, door, game, t) {
    const car = door.ctrl;
    if (!car || door.part) return;
    const w = car.way, o = car.fp.out;
    const x = (w.x0 + w.x1) / 2 + o[0] * (T / 2 - 1), y = (w.y0 + w.y1) / 2 + o[1] * (T / 2 - 1);
    const across = door.horizontal;
    const lx = across ? x + ((w.x1 - w.x0) / 2 - 6) : x, ly = across ? y : y + ((w.y1 - w.y0) / 2 - 6);
    if (!EL.powered(car.def, game)) {
      // a dead lamp: a faint red standby dot
      LM.gfx.circle(ctx, lx, ly, 1.1, 'rgba(160,40,30,' + (0.35 + 0.15 * Math.sin(t * 1.3)) + ')');
      return;
    }
    const on = car.arriving || car.ride ? 0.85 + 0.15 * Math.sin(t * 12) : 0.45;
    LM.gfx.glow(ctx, lx, ly, 7, car.ride ? '#9fe8ff' : '#ffb84a', on * 0.7);
    LM.gfx.circle(ctx, lx, ly, 1.3, car.ride ? '#dff8ff' : '#ffe2a8');
  };

  // ------------------------------------------------------------ tiles, the panel, sounds (any game can restyle them)
  const steelFloor = (g, x, y) => {
    g.fillStyle = '#3d4247';
    g.fillRect(x, y, T, T);
    g.fillStyle = '#4a5056';
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const px = x + i * 8 + (j % 2) * 4, py = y + j * 8;
        g.save();
        g.translate(px + 2, py + 4);
        g.rotate(-0.6);
        g.fillRect(-2.2, -0.7, 4.4, 1.4);
        g.restore();
      }
    }
    g.fillStyle = 'rgba(255,255,255,0.04)';
    g.fillRect(x, y, T, 1);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(x, y + T - 1, T, 1);
  };
  const terrain = {
    'elevator-wall': {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor: '#5a6168', elevator: true,
      bake(g, x, y, info) {
        const wall = LM.find('terrain', 'wall');
        if (wall && wall.bake && LM.paintWall) return wall.bake(g, x, y, info);
        const top = (info.env.wall && info.env.wall.top && info.env.wall.top[0]) || '#4a4e54';
        g.fillStyle = top;
        g.fillRect(x, y, T, T);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(x, y, T, 1.4);
        if (!info.n(0, 1).tall) {
          g.fillStyle = (info.env.wall && info.env.wall.face) || '#25282c';
          g.fillRect(x, y + T - 9, T, 9);
        }
      },
    },
    'elevator-floor': {
      floorLike: true, elevator: true, mapColor: '#7fa8bd',
      bake(g, x, y) {
        steelFloor(g, x, y);
      },
    },
    'elevator-door': {
      floorLike: true, elevator: true, door: { style: 'elevator' }, mapColor: '#9fc6d8',
      bake(g, x, y, info) {
        steelFloor(g, x, y);
        const across = info.across;
        g.fillStyle = 'rgba(0,0,0,0.4)';
        if (across) g.fillRect(x, y + T / 2 - 7, T, 14);
        else g.fillRect(x + T / 2 - 7, y, 14, T);
      },
    },
  };
  const items = {
    'elevator-panel': {
      name: 'Elevator panel', radius: 7, wallMounted: true, shadow: false, dressing: false,
      init(it) {
        // reachable from anywhere in the car (and only from inside it: see available)
        const el = LM.find('elevators', it.props.elevator);
        const sz = el ? EL.size(el) : { w: 2, d: 2 };
        it.reach = Math.hypot(sz.w, sz.d) * T;
      },
      interact: {
        available: (it, game) => {
          const car = EL.carOf(game, it.props.elevator);
          return !!car && !car.ride && !!game.player && car.holds(game.player, 0);
        },
        prompt: () => LM.text('elevatorPrompt'),
        use: (it, game) => EL.openPanel(game, it.props.elevator),
      },
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x));
        g.fillStyle = '#25282c';
        g.fillRect(-1, -9, 4.5, 18);
        g.fillStyle = '#a9b0b7';
        g.fillRect(-0.5, -8.5, 3.6, 17);
        g.fillStyle = '#15171a';
        g.fillRect(0.2, -7.6, 2.2, 3.4);
        g.fillStyle = '#6a7178';
        for (let i = 0; i < 4; i++) {
          g.fillRect(0.3, -2.6 + i * 2.6, 0.9, 1.6);
          g.fillRect(1.6, -2.6 + i * 2.6, 0.9, 1.6);
        }
      },
      drawGlow(g, it, t, game) {
        g.rotate(Math.atan2(it.face.y, it.face.x));
        const car = game && EL.carOf(game, it.props.elevator);
        const busy = car && car.ride;
        LM.gfx.glow(g, 1.3, -5.9, 3.5, busy ? '#9fe8ff' : '#ff9a3a', 0.6);
        if (busy) LM.gfx.glow(g, 1.3, -1.8 + ((t * 4) % 4) * 2.6, 2.5, '#ffd27a', 0.6);
      },
    },
  };
  LM.definePack({ id: 'elevators', name: 'Elevators', version: LM.VERSION, terrain, items });

  if (LM.audio && LM.audio.define) {
    LM.audio.define('lift', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 62, f1: 70, dur: 1.2, gain: 0.22, attack: 0.15 });
      kit.noise(t, o, { type: 'bandpass', freq: 240, freqEnd: 320, dur: 1.2, gain: 0.12, attack: 0.2, q: 2 });
      kit.tone(t + 0.05, o, { type: 'triangle', f0: 124, f1: 140, dur: 1.0, gain: 0.04, attack: 0.2 });
    });
    LM.audio.define('liftDing', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 1318, dur: 0.7, gain: 0.12 });
      kit.tone(t + 0.02, o, { type: 'sine', f0: 2636, dur: 0.25, gain: 0.03 });
    });
  }
})();
