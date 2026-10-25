/* The Linear Maze engine — engine/game.js
 * The game object: level loading, the update loop, camera, pickups,
 * interaction, saving, and level flow. LM.start(gameId) starts the game
 * a games/<id>/game.js manifest describes (engine/loader.js calls it).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;

  // ------------------------------------------------------------ the game being played
  /** Choose the game (its manifest, with defaults filled in) without starting it. */
  LM.useGame = function (id) {
    const m = LM.games[id];
    if (!m) throw new Error('There is no game called ' + id + ' (no LM.defineGame({ id: "' + id + '" }) has run).');
    LM.gameInfo = LM.manifest.normalize(m);
    return LM.gameInfo;
  };
  /** Words on the engine's screens, from the game's manifest (words), with {placeholders} filled. */
  LM.text = function (key, vars) {
    const w = (LM.gameInfo && LM.gameInfo.words) || LM.manifest.WORDS;
    return LM.manifest.fill(w[key] != null ? w[key] : LM.manifest.WORDS[key], vars);
  };
  /** Where this game keeps its checkpoint in the browser (each game has its own). */
  LM.saveKey = () => (LM.gameInfo ? LM.manifest.saveKey(LM.gameInfo) : 'linear-maze-save-v1');

  function readSave() {
    try {
      const s = JSON.parse(localStorage.getItem(LM.saveKey()) || 'null');
      if (s && s.levelId && LM.find('levels', s.levelId)) return s;
    } catch (e) {}
    return null;
  }
  function writeSave(s) {
    // a pack that writes its own checkpoint (LM.saves.write) keeps the floors' memory with it
    const g = LM.game;
    if (s && !s.floors && g && g.floors && s.levelId === g.levelId && !g.attract) Object.assign(s, g.memorySave());
    try {
      localStorage.setItem(LM.saveKey(), JSON.stringify(s));
    } catch (e) {
      // browser storage full: keep the floors without their bloodstains, then without their memory
      try {
        const lean = Object.assign({}, s, { floors: {} });
        for (const [id, m] of Object.entries(s.floors || {})) lean.floors[id] = Object.assign({}, m, { decals: undefined });
        localStorage.setItem(LM.saveKey(), JSON.stringify(lean));
      } catch (e2) {
        try {
          localStorage.setItem(LM.saveKey(), JSON.stringify(Object.assign({}, s, { floors: undefined })));
          console.warn('[LM] The browser’s storage is full: this checkpoint doesn’t remember the floors you left.');
        } catch (e3) {}
      }
    }
  }
  function clearSave() {
    try {
      localStorage.removeItem(LM.saveKey());
    } catch (e) {}
  }
  LM.saves = { read: readSave, write: writeSave, clear: clearSave };

  /** The sound for a stairs entry's dir ('up' | 'down'), or null for the usual one. */
  const stairSound = (st) => (st && st.dir === 'up' ? 'ascend' : st && st.dir === 'down' ? 'descend' : null);

  class Game {
    constructor() {
      LM.game = this;
      this.canvas = document.getElementById('game');
      this.renderer = new LM.Renderer(this.canvas);
      LM.input.attach(this.canvas);
      this.particles = new LM.Particles(1800);
      this.cam = { x: 0, y: 0, shakeX: 0, shakeY: 0, trauma: 0, kickX: 0, kickY: 0 };
      this.state = 'title';
      this.attract = true;
      this.items = [];
      this.enemies = [];
      this.npcs = [];
      this.projectiles = [];
      this.doors = [];
      this.traps = [];
      this.fx = [];
      this.flashT = 0;
      this.lights = [];
      this.staticLights = [];
      this.timers = [];
      this.plates = new Map();
      this.time = 0;
      this.dt = 0;
      this.hitStop = 0;
      this.hitMarker = 0;
      this.frame = 0;
      this.difficulty = 1;
      this.floors = {}; // floorId → how you left it (engine/memory.js)
      this.above = {}; // floorId → the floor whose stairs down you took to get there
      this.arrival = null; // how you arrived on this floor: { memory, at } (what dying restores)
      this.lifts = [];
      this.stats = this.newStats();
      this.levelOrder = Object.values(LM.registry.levels)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((l) => l.id);
      if (!this.levelOrder.length) throw new Error('This game has no floors yet. Add one in the editor (Floors → New floor), or load a pack that has some.');
      const info = LM.gameInfo || {};
      const ts = info.titleScreen || {};
      // the title screen shows the floor the game names, else the first floor that defines a camera path
      this.attractLevelId = (ts.background && LM.find('levels', ts.background) && ts.background) || this.levelOrder.find((id) => LM.get('levels', id).attractPath) || this.levelOrder[0];
      // a new run starts on the game's start floor, else at the top of the floor order
      this.startLevelId = info.start && LM.find('levels', info.start) ? info.start : this.levelOrder[0];
      LM.ui.init(this);
      this.toTitle();
      this.last = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    newStats() {
      return { kills: 0, enemies: 0, gold: 0, time: 0, shots: 0, damageTaken: 0, chests: 0, chestsTotal: 0 };
    }

    // ---------------------------------------------------- flow
    toTitle() {
      LM.ui.closeAll();
      if (LM.comms) LM.comms.clear();
      this.loadLevel(this.attractLevelId, null, true);
      this.state = 'title';
      LM.ui.showTitle(readSave());
    }
    newRun() {
      clearSave();
      if (LM.comms) LM.comms.clear();
      this.runStart = Date.now();
      this.floors = {};
      this.above = {};
      this.loadLevel(this.startLevelId, null, false, { stash: false });
      this.state = 'play';
    }
    continueRun() {
      const s = readSave();
      if (LM.comms) LM.comms.clear();
      if (!s) return this.newRun();
      this.floors = s.floors && typeof s.floors === 'object' ? s.floors : {};
      this.above = s.above && typeof s.above === 'object' ? s.above : {};
      this.loadLevel(s.levelId, s.player, false, { stash: false, at: s.at || null });
      this.state = 'play';
    }
    /** What a checkpoint keeps besides the player: the floors left behind and how you got here. */
    memorySave() {
      return { floors: this.floors, above: this.above, at: this.arrival ? this.arrival.at : null };
    }
    floorNumber(id) {
      // floors with their own label (e.g. a prologue) don't take a number
      const numbered = this.levelOrder.filter((l) => !LM.get('levels', l).floorLabel);
      return numbered.indexOf(id || this.levelId) + 1;
    }
    /** 'Floor 2' (the game's words.floor), or the level's own floorLabel. */
    floorLabel(id) {
      const def = LM.get('levels', id || this.levelId);
      return def.floorLabel || LM.text('floor', { n: this.floorNumber(def.id) });
    }

    /**
     * Load a floor. opts:
     *   stash: false     don't remember the floor being left (it was remembered already, or the run is new)
     *   memory           how to lay the floor out (a snapshot from engine/memory.js, or null for fresh);
     *                    by default the floor is as you last left it, if you've been there
     *   at: { x, y }     where you arrive (world units); by default the floor's start, or for via 'up'
     *                    the stairs down you last took from it
     *   via              'down' (stairs down), 'up' (stairs up), 'elevator' (with lift: its id), or a pack's word
     *   leftAt: { x, y } the stairs tile you're leaving the old floor by (remembered with it)
     *   arrive           a tag on the new floor: arrive on its first tile (stairs that lead somewhere of their own)
     */
    loadLevel(id, playerSave, attract, opts) {
      opts = opts || {};
      const FM = LM.floorMemory;
      const def = LM.get('levels', id);
      const prevId = this.levelId;
      // leaving a floor you were playing: it remembers how you left it
      const leaving = !attract && !this.attract && this.level && this.player && !this.player.dead && prevId && prevId !== id && opts.stash !== false;
      if (leaving) {
        this.rememberFloor(opts.leftAt);
        if (opts.via !== 'up' && opts.via !== 'elevator') this.above[id] = prevId;
      }
      this.levelId = id;
      const L = (this.level = new LM.Level(def));
      L.sig = FM.signature(L);
      L.baseTerrain = L.terrain.map((t) => t.id);
      // coming back: the fresh floor, with what you left laid over it
      const memory = attract ? null : opts.memory !== undefined ? opts.memory : (this.floors && this.floors[id]) || null;
      const plan = memory ? FM.prepare(L, memory) : null;
      this.items = [];
      this.enemies = [];
      this.npcs = [];
      this.projectiles = [];
      this.doors = [];
      this.fx = [];
      this.flashT = 0;
      this.lights = [];
      this.staticLights = [];
      this.timers = [];
      this.plates = new Map();
      this.particles.clear();
      this.renderer.setLevel(L);
      this.attract = !!attract;
      this.focus = null;
      this.time = 0;

      for (let si = 0; si < L.spawns.length; si++) {
        const s = L.spawns[si];
        if (s.kind === 'door') {
          const d = new LM.Door(this, s.x, s.y, s.lock, s.tag, s.style);
          if (s.sealed || (s.props && s.props.sealed)) d.sealed = true;
          // a placement can make any door a clearance door: props { flag, need, color }
          if (s.props && s.props.flag) {
            d.flag = s.props.flag;
            d.unlocked = false;
            if (s.props.need) d.need = s.props.need;
            if (s.props.color) d.flagColor = s.props.color;
          }
          this.doors.push(d);
        } else if (s.kind === 'item') {
          if (plan && plan.gone.has(si)) continue;
          const it = this.spawnItem(s.id, s.x, s.y, s.props, s.tag);
          if (it) {
            it._si = si;
            FM.baseline(it);
          }
        } else if (s.kind === 'enemy') {
          // a remembered floor brings back the monsters still alive, where they were
          if (!plan) this.spawnEnemy(s.id, s.x * T + T / 2, s.y * T + T / 2, Object.assign({ tag: s.tag }, s.props));
        } else if (s.kind === 'npc') {
          if (plan && plan.npcsGone.has(si)) continue;
          const n = this.spawnNPC(s.id, s.x, s.y, s.props, s.tag);
          if (n) {
            n._si = si;
            FM.baseline(n);
          }
        }
      }
      // ceiling-light grids: { variants, every, offset, color, radius, intensity, flicker, skip, tag }
      for (const cl of def.ceilingLights || []) {
        const every = cl.every || 4, off = cl.offset || [0, 0];
        for (let y = 0; y < L.h; y++) {
          if ((((y - off[1]) % every) + every) % every) continue;
          for (let x = 0; x < L.w; x++) {
            if ((((x - off[0]) % every) + every) % every) continue;
            const i = y * L.w + x, td = L.terrain[i];
            if (td.solid || (cl.variants && !cl.variants.includes(L.variant[i]))) continue;
            if (cl.skip && U.hash2(x, y, 77) < cl.skip) continue;
            this.addStaticLight({ x: x * T + T / 2, y: y * T + T / 2, color: cl.color || '#f2f5ff', radius: cl.radius || 180, intensity: cl.intensity == null ? 0.5 : cl.intensity, flicker: cl.flicker || 0, tag: cl.tag });
          }
        }
      }
      // lights that belong to terrain (molten slag, glowing water...)
      for (let y = 0; y < L.h; y++) {
        for (let x = 0; x < L.w; x++) {
          const d = L.terrain[y * L.w + x];
          if (!d.light) continue;
          const spec = typeof d.light === 'function' ? d.light(L, x, y) : d.light;
          if (spec) this.addStaticLight(Object.assign({ x: x * T + T / 2, y: y * T + T / 2 }, spec));
        }
      }
      // a next-generation floor's fixtures: ceiling silhouettes and neon (engine/nextgen.js)
      if (LM.ng) LM.ng.attach(this, L);
      // where you arrive: given, the stairs you came up by, or the floor's start
      let at = opts.at && Number.isFinite(opts.at.x) && Number.isFinite(opts.at.y) ? opts.at : null;
      if (!at && opts.arrive) {
        const p = (L.tags[opts.arrive] || [])[0];
        if (p) at = { x: p.x * T + T / 2, y: p.y * T + T / 2 };
      }
      if (!at && opts.via === 'up') at = this.upArrival(L, memory);
      if (!at) at = { x: L.start.x * T + T / 2, y: L.start.y * T + T / 2 };
      const sx = at.x, sy = at.y;
      if (!attract) {
        this.player = new LM.Player(playerSave);
        // a fresh run starting on this floor takes the floor's loadout: { weapons, gadgets, gold }
        if (!playerSave && def.loadout) {
          const lo = def.loadout;
          if (lo.weapons) this.player.weapons = lo.weapons.slice();
          if (lo.gadgets) this.player.gadgets = lo.gadgets.slice();
          if (lo.gold) this.player.gold = lo.gold;
          this.player.weaponIdx = 0;
          this.player.statsDirty = true;
        }
        this.player.x = sx;
        this.player.y = sy;
        this.player.lastSafe = { x: sx, y: sy };
        this.player.stats();
        if (!playerSave) this.player.hp = this.player.stats().maxHp;
        // stairs under you on arrival wait until you've stepped off them
        this.stairsHold = true;
      } else {
        this.player = null;
        for (const e of this.enemies) e.vis = 1;
        for (const n of this.npcs) if (!n.def.spectral) n.vis = 1;
      }
      this.traps = (def.traps || []).map((t, i) => new LM.Trap(this, t, i));
      if (LM.elevators) LM.elevators.attach(this, opts);
      this.cam.x = sx;
      this.cam.y = sy;
      this.cam.trauma = 0;
      this.stats = this.newStats();
      this.stats.enemies = this.enemies.length;
      this.stats.chestsTotal = this.items.filter((i) => i.def.isChest).length;
      FM.baselineLights(this);
      if (plan) {
        FM.finish(this, plan);
        if (attract) for (const e of this.enemies) e.vis = 1;
      }
      this.los = null;
      const atx = Math.floor(sx / T), aty = Math.floor(sy / T);
      LM.nav.compute(L, L.inBounds(atx, aty) ? atx : L.start.x, L.inBounds(atx, aty) ? aty : L.start.y);
      LM.audio.setAmbience(L.env.ambience);
      if (!attract) {
        this.checkpoint = playerSave ? JSON.parse(JSON.stringify(playerSave)) : this.player.serialize();
        // dying puts you back the way you arrived: this floor as it was then, where you stood
        this.arrival = { memory: plan ? memory : null, at: { x: sx, y: sy }, via: opts.via };
        if (!plan && this.floors && this.floors[id]) delete this.floors[id]; // remembered, but the floor has changed since
        writeSave(Object.assign({ levelId: id, player: this.checkpoint, savedAt: Date.now() }, this.memorySave()));
        LM.ui.levelIntro(this, L);
      }
      // things a pack makes on every arrival aren't remembered with the floor (they're made again)
      this._hooking = true;
      try {
        LM.emit('levelLoaded', this);
      } finally {
        this._hooking = false;
      }
    }

    /** Remember the floor being played as it is now (engine/memory.js). */
    rememberFloor(leftAt) {
      if (!this.level || this.attract || !this.player || !this.floors) return null;
      try {
        const m = LM.floorMemory.snapshot(this);
        if (leftAt) m.leftAt = { x: leftAt.x, y: leftAt.y };
        this.floors[this.levelId] = m;
        return m;
      } catch (e) {
        console.warn('[LM] Couldn’t remember ' + this.levelId + '; it will be fresh next time.', e);
        delete this.floors[this.levelId];
        return null;
      }
    }

    /** Where you step off the stairs up: onto the stairs down you last took from that floor, or its first ones. */
    upArrival(L, memory) {
      const ok = (x, y) => L.inBounds(x, y) && L.t(x, y).exit;
      let t = memory && memory.leftAt && ok(memory.leftAt.x, memory.leftAt.y) ? memory.leftAt : null;
      if (!t) {
        for (let i = 0; i < L.n && !t; i++) if (L.terrain[i].exit) t = { x: i % L.w, y: Math.floor(i / L.w) };
      }
      return t ? { x: t.x * T + T / 2, y: t.y * T + T / 2 } : null;
    }

    /** The floor a floor's stairs down lead to (its exitTo, its next, or the next in the floor order). */
    nextOf(id) {
      const d = LM.find('levels', id);
      if (!d) return null;
      if (d.exitTo && LM.find('levels', d.exitTo)) return d.exitTo;
      const i = this.levelOrder.indexOf(id);
      return d.next || (i >= 0 ? this.levelOrder[i + 1] : null) || null;
    }
    /**
     * Where a floor's stairs up lead: the floor named by its stairsUp, else the floor you came down
     * from, else (except on a run's first floor) the floor whose stairs down lead here. stairsUp: false closes them.
     */
    floorAbove(id) {
      id = id || this.levelId;
      const def = LM.find('levels', id);
      if (!def || def.stairsUp === false) return null;
      if (typeof def.stairsUp === 'string' && def.stairsUp !== id && LM.find('levels', def.stairsUp)) return def.stairsUp;
      const came = this.above && this.above[id];
      if (came && came !== id && LM.find('levels', came)) return came;
      // a run's first floor has nothing above it unless it says so
      if (id === this.startLevelId) return null;
      for (const o of this.levelOrder) if (o !== id && this.nextOf(o) === id) return o;
      return null;
    }

    /**
     * Go to another floor without the end-of-floor screen: a quick fade, and the floor as you left it.
     * o: { via, at, leftAt, lift, arrive, sound, quiet } (see loadLevel). The stairs up, a second trip down, and elevators use it.
     */
    travel(id, o) {
      o = o || {};
      if (!LM.find('levels', id) || this.state === 'travel') return;
      const carry = this.player.serialize();
      this.state = 'travel';
      if (!o.quiet) LM.audio.play(o.sound || (o.via === 'up' ? 'ascend' : 'descend'));
      LM.ui.fade(() => {
        LM.ui.closeAll();
        this.loadLevel(id, carry, false, { via: o.via, at: o.at, leftAt: o.leftAt, lift: o.lift, arrive: o.arrive });
        this.state = 'play';
      });
    }

    /** The stairs up: back to the floor above, as you left it (or where the stairs' own entry says: st, see stairsAt). */
    takeStairsUp(st) {
      if (this.state !== 'play') return;
      const up = st && st.to ? (LM.find('levels', st.to) ? st.to : null) : this.floorAbove();
      this.stairsHold = true;
      if (!up) {
        this.toast((st && st.locked) || LM.text('noWayUp'), 'warn');
        return;
      }
      const P = this.player;
      this.travel(up, { via: 'up', leftAt: { x: Math.floor(P.x / T), y: Math.floor(P.y / T) }, arrive: st && st.arrive, sound: st && stairSound(st) });
    }

    /**
     * The entry in the floor's `stairs` for the stairs tile at (tx, ty), found by the tile's tag:
     *   stairs: { eastDown: { to: 'b1', until: 'basementOpen', locked: 'Sealed.', arrive: 'eastLanding', dir: 'down', go: 'Down to {floor}' } }
     * to: where they lead (stairs down: instead of the floor's next; stairs up: instead of the way you came);
     * until: a flag (or a list, any of them) that has to be set before they open; locked: what you're told until then;
     * arrive: a tag on the floor they lead to, to arrive on; dir: 'up' | 'down', the sound; go: the button on the
     * floor-finished screen ({floor} {name}). null when the tile has no entry.
     */
    stairsAt(tx, ty) {
      const st = this.level && this.level.def.stairs;
      if (!st || typeof st !== 'object') return null;
      for (const tag of Object.keys(st)) {
        const e = st[tag];
        if (!e || typeof e !== 'object') continue;
        if ((this.level.tags[tag] || []).some((p) => p.x === tx && p.y === ty)) return Object.assign({ tag }, e);
      }
      return null;
    }
    /** Is any of these flags set? (a name, or a list of names) */
    anyFlag(f) {
      return [].concat(f || []).some((n) => this.hasFlag(n));
    }

    restartLevel() {
      LM.ui.closeAll();
      if (LM.comms) LM.comms.clear();
      const a = this.arrival || {};
      this.loadLevel(this.levelId, this.checkpoint, false, { stash: false, memory: a.memory || null, at: a.at });
      this.state = 'play';
    }

    completeLevel(st) {
      if (this.state !== 'play') return;
      const idx = this.levelOrder.indexOf(this.levelId);
      const P = this.player;
      if (st && st.to && !LM.find('levels', st.to)) {
        // stairs that lead to a floor this game doesn't have (yet)
        this.stairsHold = true;
        this.toast(st.locked || LM.text('stairsLocked'), 'warn');
        return;
      }
      const next = (st && st.to) || this.level.def.next || this.levelOrder[idx + 1];
      const here = { x: Math.floor(P.x / T), y: Math.floor(P.y / T) };
      const arrive = st && st.arrive, sound = (st && stairSound(st)) || 'descend';
      if (next && LM.find('levels', next)) {
        this.above[next] = this.levelId;
        // a floor you've been down to before: straight there, as you left it
        if (this.floors[next]) return this.travel(next, { via: 'down', leftAt: here, arrive, sound });
        this.state = 'complete';
        LM.audio.play(sound);
        const carry = P.serialize();
        this.rememberFloor(here);
        writeSave({ levelId: next, player: carry, savedAt: Date.now(), floors: this.floors, above: this.above, at: null });
        LM.ui.showLevelComplete(this, next, () => {
          this.loadLevel(next, carry, false, { stash: false, via: 'down', arrive });
          this.state = 'play';
        }, st && st.go);
      } else {
        clearSave();
        LM.ui.showVictory(this);
      }
    }

    playerDied() {
      const P = this.player;
      if (P.dead) return;
      P.dead = true;
      this.state = 'dying';
      this.hitStop = 0.25;
      this.particles.burst(P.x, P.y, 30, { type: 'dot', color: '#8e1d1d', speed: 200, life: 0.7, size: [1, 2.5], drag: 4 });
      this.renderer.addDecal({ type: 'blood', x: P.x, y: P.y, r: 16, color: '#5e1616' });
      LM.audio.play('lose');
      this.schedule(1.1, () => {
        this.state = 'dead';
        LM.ui.showDeath(this);
      }, true);
    }

    // ---------------------------------------------------- spawning
    spawnItem(id, tx, ty, props, tag) {
      const def = LM.find('items', id);
      if (!def) {
        console.warn('[LM] Unknown item ' + id);
        return null;
      }
      const it = new LM.Item(this, def, tx, ty, props, tag);
      if (this._hooking) it._hook = true;
      this.items.push(it);
      const lightSpec = typeof def.light === 'function' ? def.light(it, this) : def.light;
      if (lightSpec) {
        const ox = it.face ? it.face.x * 4 : 0, oy = it.face ? it.face.y * 4 : 0;
        // a light set off the piece's centre turns with the piece
        const [lx, ly] = LM.Level.turnDir(0, lightSpec.dy || 0, it.turn || 0);
        it.light = this.addStaticLight(Object.assign({}, lightSpec, { x: it.x + ox + lx, y: it.y + oy + ly, tag }));
      }
      return it;
    }
    /** Spawn an item at a world position, optionally popping out with velocity. */
    spawnItemAt(id, x, y, props) {
      const it = this.spawnItem(id, Math.floor(x / T), Math.floor(y / T), props);
      if (!it) return null;
      it.x = x;
      it.y = y;
      const a = Math.random() * U.TAU, sp = U.rand(50, 130);
      it.pop = { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: 0, vz: U.rand(80, 140) };
      it.pickupDelay = 0.35;
      return it;
    }
    spawnEnemy(id, x, y, props) {
      const def = LM.find('enemies', id);
      if (!def) {
        console.warn('[LM] Unknown enemy ' + id);
        return null;
      }
      const e = new LM.Enemy(this, def, x, y, props);
      e._props = props || {};
      if (this._hooking) e._hook = true;
      this.enemies.push(e);
      return e;
    }
    spawnNPC(id, tx, ty, props, tag) {
      const def = LM.find('npcs', id);
      if (!def) {
        console.warn('[LM] Unknown NPC ' + id);
        return null;
      }
      const n = new LM.NPC(this, def, tx, ty, props, tag);
      if (this._hooking) n._hook = true;
      this.npcs.push(n);
      return n;
    }
    /** Story flags live on the player, so they are saved with the run. Setting one fires 'flag' traps. */
    setFlag(name) {
      const P = this.player;
      if (!P || P.flags.has(name)) return;
      P.flags.add(name);
      this.triggerEvent('flag', name);
      LM.emit('flag', { name, game: this });
    }
    hasFlag(name) {
      return !!(this.player && this.player.flags.has(name));
    }
    /**
     * Key items: things the player carries from floor to floor (a supervisor's card, a fuse, a core) and
     * sees in the inventory under Carried. info: { name, text, color }; info.flag also sets that story flag
     * (doors, stairs and traps read flags). Saved with the player. Giving one the player has does nothing.
     */
    giveKeyItem(id, info) {
      const P = this.player;
      if (!P || this.hasKeyItem(id)) return false;
      info = info || {};
      P.keyItems.push({ id, name: info.name || id, text: info.text || '', color: info.color || '#e0b25a' });
      if (info.flag) this.setFlag(info.flag);
      LM.emit('keyItem', { id, game: this });
      return true;
    }
    hasKeyItem(id) {
      return !!(this.player && this.player.keyItems.some((k) => k.id === id));
    }
    takeKeyItem(id) {
      const P = this.player;
      if (!P) return false;
      const n = P.keyItems.length;
      P.keyItems = P.keyItems.filter((k) => k.id !== id);
      return P.keyItems.length < n;
    }
    /** Change a tile at runtime (secret doors, collapsing floors, doors that weren't there before). */
    setTerrain(tx, ty, id, tag) {
      const L = this.level, d = LM.get('terrain', id), i = L.idx(tx, ty);
      if (!L.inBounds(tx, ty)) return;
      L.terrain[i] = d;
      const old = L.doorAt[i];
      if (old && !d.door) {
        this.doors = this.doors.filter((x) => x !== old);
        L.doorAt[i] = null;
        L.dyn[i] = 0;
      }
      if (d.door && !old) {
        const door = new LM.Door(this, tx, ty, d.door.lock || null, tag, d.door.style);
        if (d.door.sealed) door.sealed = true;
        this.doors.push(door);
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.renderer.invalidateTile(tx + dx, ty + dy);
      for (const li of this.staticLights) if (U.dist(li.x, li.y, tx * T + T / 2, ty * T + T / 2) < li.r + T) li.dirty = true;
      L.navDirty = true;
    }
    addStaticLight(spec) {
      const li = Object.assign({ r: spec.radius || 160, color: '#ffb060', intensity: 0.8, flicker: 0, phase: Math.random() * 10, poly: null, dirty: true }, spec);
      li.r = spec.radius || li.r;
      this.staticLights.push(li);
      return li;
    }
    /** drops: { gold: [min,max], items: [{ id, chance, props }] } or a loot table id */
    dropLoot(x, y, drops) {
      if (typeof drops === 'string') drops = LM.get('lootTables', drops).roll();
      if (Array.isArray(drops)) {
        for (const d of drops) this.dropEntry(x, y, d);
        return;
      }
      if (drops.gold && (drops.goldChance == null || Math.random() < drops.goldChance)) {
        const st = this.player ? this.player.stats() : { goldFind: 0 };
        const amt = Math.round(U.randInt(drops.gold[0], drops.gold[1]) * (1 + st.goldFind));
        if (amt > 0) this.spawnItemAt('gold', x, y, { amount: amt });
      }
      for (const it of drops.items || []) if (Math.random() < (it.chance == null ? 1 : it.chance)) this.spawnItemAt(it.id, x, y, it.props);
    }
    /** A single loot entry: { type: 'gold'|'item'|'ammo'|'weapon'|'armor'|'key', ... } dropped on the floor. */
    dropEntry(x, y, d) {
      if (d.type === 'gold') this.spawnItemAt('gold', x, y, { amount: d.amount });
      else if (d.type === 'item') this.spawnItemAt(d.id, x, y, d.props);
      else if (d.type === 'ammo') this.spawnItemAt('ammo-' + d.ammo, x, y, { amount: d.amount });
      else if (d.type === 'weapon') this.spawnItemAt('weapon-pickup', x, y, { weapon: d.id });
      else if (d.type === 'armor') this.spawnItemAt('armor-pickup', x, y, { armor: d.id });
      else if (d.type === 'key') this.spawnItemAt('key', x, y, { color: d.color });
    }

    // ---------------------------------------------------- services used by content
    schedule(delay, fn, realTime) {
      this.timers.push({ t: delay, fn, realTime: !!realTime });
    }
    toast(text, kind) {
      LM.ui.toast(text, kind);
    }
    addShake(amount, angle) {
      this.cam.trauma = Math.min(1, this.cam.trauma + amount);
      if (angle != null) {
        this.cam.kickX -= Math.cos(angle) * amount * 30;
        this.cam.kickY -= Math.sin(angle) * amount * 30;
      }
    }
    vol(x, y) {
      const P = this.player || this.cam;
      return U.clamp(1 - U.dist(x, y, P.x, P.y) / 800, 0, 1);
    }
    triggerEvent(type, tag) {
      if (!tag) return;
      for (const tr of this.traps) tr.onEvent(this, type, tag);
      LM.emit('event:' + type, tag);
    }
    onDoorChanged(door) {
      for (const li of this.staticLights) if (U.dist(li.x, li.y, door.x, door.y) < li.r + T) li.dirty = true;
      this.level.navDirty = true;
    }
    pushOutOfItems(ent) {
      for (const it of this.items) {
        const solid = it.solid != null ? it.solid : it.def.solid; // per-instance override
        if (it.dead || !solid) continue;
        if (solid === 'rect') {
          const b = it.getRect();
          const px = U.clamp(ent.x, b.x0, b.x1), py = U.clamp(ent.y, b.y0, b.y1);
          const dx = ent.x - px, dy = ent.y - py, d2 = dx * dx + dy * dy;
          if (d2 < ent.r * ent.r) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2);
              ent.x += (dx / d) * (ent.r - d);
              ent.y += (dy / d) * (ent.r - d);
            } else {
              const l = ent.x - b.x0, r = b.x1 - ent.x, tp = ent.y - b.y0, bt = b.y1 - ent.y, m = Math.min(l, r, tp, bt);
              if (m === l) ent.x = b.x0 - ent.r;
              else if (m === r) ent.x = b.x1 + ent.r;
              else if (m === tp) ent.y = b.y0 - ent.r;
              else ent.y = b.y1 + ent.r;
            }
          }
          continue;
        }
        const rr = (it.def.solidRadius || it.r) + ent.r;
        const dx = ent.x - it.x, dy = ent.y - it.y, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.01;
          ent.x = it.x + (dx / d) * rr;
          ent.y = it.y + (dy / d) * rr;
        }
      }
    }
    /** Pick up / grant a loot entry directly (used by chests). Returns a short label.
     *  `at` is where consumables (health, etc.) are dropped if they can't be granted directly. */
    grant(entry, at) {
      const P = this.player;
      switch (entry.type) {
        case 'gold': {
          P.gold += entry.amount;
          this.stats.gold += entry.amount;
          LM.audio.play('coin');
          return '+' + entry.amount + ' gold';
        }
        case 'ammo': {
          const got = P.addAmmo(entry.ammo, entry.amount);
          LM.audio.play('pickup');
          return '+' + got + ' ' + LM.AMMO_NAMES[entry.ammo].toLowerCase();
        }
        case 'weapon': {
          const r = P.giveWeapon(entry.id, this);
          LM.audio.play('pickup');
          return r === 'new' ? LM.get('weapons', entry.id).name : LM.get('weapons', entry.id).name + ' ammo';
        }
        case 'armor': {
          const a = LM.get('armor', entry.id);
          if (!P.equip[a.slot]) P.equipArmor(entry.id);
          else P.bag.push(entry.id);
          LM.audio.play('pickup');
          return a.name;
        }
        case 'key': {
          P.keys.add(entry.color);
          LM.audio.play('key');
          return LM.KEY_NAMES[entry.color];
        }
        case 'item': {
          const def = LM.get('items', entry.id);
          if (def.grant) return def.grant(this, entry, at);
          const p = at || { x: P.x, y: P.y };
          this.spawnItemAt(entry.id, p.x, p.y, entry.props);
          LM.audio.play('pickup');
          return def.name + ' (dropped beside you)';
        }
      }
      return '';
    }

    // ---------------------------------------------------- loop
    loop(now) {
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (!(dt > 0)) dt = 0;
      dt = Math.min(dt, 0.05);
      const realDt = dt;
      if (this.hitStop > 0) {
        this.hitStop -= dt;
        dt *= 0.2;
      }
      this.dt = dt;
      try {
        this.update(dt, realDt);
        this.renderer.render(this, this.state === 'play' || this.attract || this.state === 'dying' ? dt : realDt * 0.25);
        LM.ui.frame(this, realDt);
      } catch (err) {
        console.error(err);
        LM.ui.error(err);
      }
      LM.input.endFrame();
      requestAnimationFrame(this.loop);
    }

    update(dt, realDt) {
      const I = LM.input;
      // global keys
      if (I.hit('KeyM')) {
        LM.audio.setMuted(!LM.audio.muted);
        this.toast(LM.audio.muted ? 'Sound off' : 'Sound on');
      }
      if (this.state === 'play') {
        if (I.hit('Escape') || I.hit('KeyP')) return LM.ui.showPause(this);
        if (I.hit('Tab') || I.hit('KeyI')) return LM.ui.showInventory(this);
      }
      // timers (real-time ones run even during the death slow-down)
      for (const tm of this.timers) {
        if (this.state === 'play' || this.state === 'dying' || tm.realTime) {
          tm.t -= tm.realTime ? realDt : dt;
          if (tm.t <= 0 && !tm.done) {
            tm.done = true;
            tm.fn();
          }
        }
      }
      this.timers = this.timers.filter((t) => !t.done);

      if (this.attract) return this.updateAttract(realDt);
      if (this.state !== 'play' && this.state !== 'dying') return;

      const L = this.level, P = this.player;
      this.time += dt;
      this.stats.time += dt;
      this.frame++;
      this.hitMarker -= dt;

      this.flashT = Math.max(0, this.flashT - dt);
      if (!P.dead) P.update(dt, this);
      if (!P.dead && this.state === 'play') {
        for (const id of P.gadgets) {
          const gd = LM.get('gadgets', id);
          if (gd.update) gd.update(this, P, dt);
          if (gd.key && I.hit(gd.key) && gd.use) gd.use(this, P);
        }
      }
      for (const n of this.npcs) n.update(dt, this);
      if (!P.dead) this.pushOutOfNPCs(P);
      for (const e of this.enemies) if (!e.dead) e.update(dt, this);
      this.enemies = this.enemies.filter((e) => !e.dead);
      for (const d of this.doors) d.update(dt, this);
      for (const it of this.items) {
        if (it.dead) continue;
        it.update(dt, this);
        if (it.pop) this.updatePop(it, dt);
      }
      this.collectPickups(dt);
      this.items = this.items.filter((i) => !i.dead);
      for (const tr of this.traps) tr.update(dt, this);
      for (const p of this.projectiles) p.update(dt, this);
      this.projectiles = this.projectiles.filter((p) => !p.dead);
      this.fx = this.fx.filter((f) => !f.update(dt, this));
      for (const li of this.lights) li.life -= dt;
      this.lights = this.lights.filter((l) => l.life > 0);
      this.particles.update(dt, this);

      // enemy flow field follows the player's tile
      const ptx = Math.floor(P.x / T), pty = Math.floor(P.y / T);
      const pi = pty * L.w + ptx;
      this.navT = (this.navT || 0) - dt;
      if ((pi !== L.navFrom && this.navT <= 0) || L.navDirty) {
        if (L.inBounds(ptx, pty) && !L.t(ptx, pty).solid) LM.nav.compute(L, ptx, pty);
        this.navT = 0.15;
      }

      // line of sight polygon (also drives lighting and exploration)
      const vh = this.renderer.viewHalf();
      const R = Math.hypot(vh.w, vh.h) + 40;
      this.los = LM.physics.visibility(L, P.x, P.y, R, { uniform: 160, extend: 14 });
      if (this.frame % 3 === 0) LM.physics.markExplored(L, P.x, P.y, this.los);

      if (LM.elevators) LM.elevators.update(this, dt);
      if (!P.dead) {
        this.updateInteraction();
        this.updateRooms(dt);
        // stairs: down to the next floor, or back up the way you came (once you've stepped off the ones you arrived on)
        const here = L.tileAtWorld(P.x, P.y);
        if (this.stairsHold && !here.exit && !here.entry) this.stairsHold = false;
        if (!this.stairsHold && P.falling <= 0 && this.state === 'play' && (here.exit || here.entry)) {
          const st = this.stairsAt(Math.floor(P.x / T), Math.floor(P.y / T));
          if (st && st.until && !this.anyFlag(st.until)) {
            // locked stairs: say so once, until you step off them
            this.stairsHold = true;
            this.toast(st.locked || LM.text('stairsLocked'), 'warn');
            LM.audio.play('locked');
          } else if (here.exit) this.completeLevel(st);
          else this.takeStairsUp(st);
        }
      }
      this.spawnAmbient(dt);
      this.updateCamera(dt);
    }

    updatePop(it, dt) {
      const p = it.pop;
      const f = Math.exp(-3 * dt);
      p.vx *= f;
      p.vy *= f;
      const save = it.r;
      it.r = 4;
      LM.physics.move(this.level, it, p.vx * dt, p.vy * dt);
      it.r = save;
      p.z += p.vz * dt;
      p.vz -= 500 * dt;
      if (p.z <= 0) {
        p.z = 0;
        p.vz = Math.abs(p.vz) > 40 ? -p.vz * 0.35 : 0;
      }
      if (Math.abs(p.vx) + Math.abs(p.vy) < 4 && p.z === 0 && p.vz === 0) it.pop = null;
    }

    collectPickups(dt) {
      const P = this.player;
      if (!P || P.dead || P.falling > 0) return;
      for (const it of this.items) {
        if (it.dead || !it.def.onTouch) continue;
        if (it.pickupDelay > 0) {
          it.pickupDelay -= dt;
          continue;
        }
        const d = U.dist(P.x, P.y, it.x, it.y);
        if (it.def.magnet && d < it.def.magnet) {
          const k = (1 - d / it.def.magnet) * 420 * dt;
          it.x += ((P.x - it.x) / (d || 1)) * k;
          it.y += ((P.y - it.y) / (d || 1)) * k;
        }
        if (d < P.r + it.r + 2) {
          const res = it.def.onTouch(it, this);
          if (res !== false) {
            it.remove(this);
            if (it.tag) this.triggerEvent('pickup', it.tag);
          }
        }
      }
    }

    updateInteraction() {
      const P = this.player;
      let best = null, bestScore = Infinity;
      const candidates = this.npcs.length ? this.items.concat(this.npcs) : this.items;
      for (const it of candidates) {
        if (it.dead || !(it.isNPC || it.def.interact)) continue;
        const d = U.dist(P.x, P.y, it.x, it.y);
        // it.reach lets someone be talked to across a desk or counter
        const reach = P.r + it.r + 18 + (it.reach || it.def.reach || 0);
        if (d > reach) continue;
        if (!it.canInteract(this)) continue;
        const facing = Math.abs(U.angDiff(P.aim, Math.atan2(it.y - P.y, it.x - P.x)));
        const score = d + facing * 8;
        if (score < bestScore) {
          bestScore = score;
          best = it;
        }
      }
      this.focus = best;
      LM.ui.prompt(best ? best.prompt(this) : null);
      if (best && LM.input.hit('KeyE')) {
        LM.audio.play('ui');
        best.use(this);
      }
    }

    pushOutOfNPCs(ent) {
      for (const n of this.npcs) {
        if (n.def.spectral || n.def.ghost) continue;
        const dx = ent.x - n.x, dy = ent.y - n.y, d = Math.hypot(dx, dy), rr = ent.r + n.r;
        if (d < rr && d > 0.01) {
          ent.x = n.x + (dx / d) * rr;
          ent.y = n.y + (dy / d) * rr;
        }
      }
    }
    updateRooms(dt) {
      this.roomT = (this.roomT || 0) - dt;
      if (this.roomT > 0) return;
      this.roomT = 0.25;
      const r = this.level.roomAt(this.player.x, this.player.y);
      if (r && !r.visited) {
        r.visited = true;
        LM.ui.roomTitle(r.name, r.note);
      }
    }

    spawnAmbient(dt) {
      const env = this.level.env;
      const sp = env.particles;
      if (!sp) return;
      const v = this.renderer.view;
      if (!v) return;
      let n = sp.rate * dt;
      while (n > 0) {
        if (Math.random() < n) {
          this.particles.add({
            type: sp.type || 'mote',
            x: U.rand(v.x0, v.x1), y: U.rand(v.y0, v.y1),
            vx: U.rand(-1, 1) * (sp.drift || 8) + (sp.windX || 0), vy: U.rand(-1, 1) * (sp.drift || 8) + (sp.windY || 0),
            life: U.rand(2, 5), size: sp.size || 1, color: sp.color, drag: 0, alpha: sp.alpha || 0.5,
          });
        }
        n -= 1;
      }
    }

    updateCamera(dt) {
      const P = this.player, c = this.cam;
      const lead = Math.min(P.aimDist * 0.22, 95);
      const tx = P.x + Math.cos(P.aim) * lead, ty = P.y + Math.sin(P.aim) * lead;
      c.x = U.damp(c.x, tx, 8, dt);
      c.y = U.damp(c.y, ty, 8, dt);
      this.applyShake(dt);
    }
    applyShake(dt) {
      const c = this.cam;
      c.trauma = Math.max(0, c.trauma - dt * 1.7);
      c.kickX = U.damp(c.kickX, 0, 14, dt);
      c.kickY = U.damp(c.kickY, 0, 14, dt);
      const s = c.trauma * c.trauma * 11;
      const t = performance.now() / 1000;
      c.shakeX = c.kickX + s * (Math.sin(t * 61) * 0.6 + Math.sin(t * 37) * 0.4);
      c.shakeY = c.kickY + s * (Math.sin(t * 53 + 1) * 0.6 + Math.sin(t * 29 + 2) * 0.4);
    }
    updateAttract(dt) {
      this.attractT = (this.attractT || 0) + dt;
      const L = this.level, a = this.attractT * 0.07;
      const s = L.start;
      const path = this.level.def.attractPath;
      let tx, ty;
      if (path && path.length > 1) {
        // glide between waypoints (tile coords)
        const seg = (this.attractT * 0.12) % path.length;
        const i = Math.floor(seg), k = U.ease.inOutSine(seg - i);
        const p0 = path[i], p1 = path[(i + 1) % path.length];
        tx = U.lerp(p0[0], p1[0], k) * T;
        ty = U.lerp(p0[1], p1[1], k) * T;
      } else {
        tx = s.x * T + Math.cos(a) * 160;
        ty = s.y * T + Math.sin(a * 1.3) * 90;
      }
      this.cam.x = U.damp(this.cam.x, tx, 1.5, dt);
      this.cam.y = U.damp(this.cam.y, ty, 1.5, dt);
      for (const it of this.items) it.update(dt, this);
      this.particles.update(dt, this);
      this.spawnAmbient(dt);
      this.applyShake(dt);
    }
  }
  LM.Game = Game;

  // ------------------------------------------------------------ debug helpers (console)
  LM.debug = {
    warp(id) {
      const g = LM.game;
      g.loadLevel(id, g.player ? g.player.serialize() : null, false);
      g.state = 'play';
      LM.ui.closeAll();
    },
    giveAll() {
      const P = LM.game.player;
      for (const id of Object.keys(LM.registry.weapons)) P.giveWeapon(id, LM.game);
      for (const k of Object.keys(LM.AMMO_MAX)) P.ammo[k] = P.ammoMax(k);
      P.keys = new Set(Object.keys(LM.KEY_COLORS));
    },
    god(on) {
      LM.game.godMode = on !== false;
    },
    reveal() {
      LM.game.level.explored.fill(1);
    },
  };

  // ------------------------------------------------------------ boot
  function boot() {
    if (LM.game) return;
    LM.game = new Game();
    const hot = window.claude && window.claude.hot;
    if (hot && hot.snapshot) {
      try {
        hot.snapshot(() => ({ save: readSave() }));
      } catch (e) {}
    }
  }
  function start(data) {
    if (data && data.save && !readSave()) writeSave(data.save);
    boot();
  }
  LM.boot = function () {
    const hot = window.claude && window.claude.hot;
    if (hot && hot.ready) hot.ready(start);
    else start(hot && hot.data ? hot.data : {});
  };

  /** Start a game: its title screen, its words, its save. engine/loader.js (or a single-file build) calls this
   *  once every pack, level and editor change is loaded. */
  LM.start = function (id) {
    LM.useGame(id);
    LM.ui.applyTitleScreen();
    if (!LM._titleWired) {
      LM._titleWired = true;
      const on = (elId, fn) => {
        const el = document.getElementById(elId);
        if (el) el.addEventListener('click', fn);
      };
      on('btn-new', () => { LM.audio.unlock(); LM.ui.hideTitle(); LM.game.newRun(); });
      on('btn-continue', () => { LM.audio.unlock(); LM.ui.hideTitle(); LM.game.continueRun(); });
    }
    LM.boot();
  };
})();
