/* The Linear Maze engine — engine/objectives.js
 * Objectives: what to do next, on the HUD, with the thing to find picked out when you're near it.
 *
 *   objectives: [                                  // a level's
 *     { id: 'breaker', text: 'Throw the breaker in the comms closet', done: 'breakerOn',
 *       target: { item: 'ds-breaker', props: { flag: 'breakerOn' } } },
 *     { id: 'terminal', text: 'Get to the terminal in the security office', when: 'breakerOn', done: 'atTerminal',
 *       target: { item: 'ds-console', props: { flag: 'atTerminal' } } },
 *     { id: 'locker', text: 'Open the guard’s locker', optional: true, when: 'atTerminal', done: 'lockerOpen',
 *       target: { item: 'ds-keypad', props: { flag: 'lockerOpen' } } },
 *   ]
 *
 *   id        names it (LM.objectives.current(game) gives the one showing)
 *   text      what the HUD says (in code it can be a function (game) => text)
 *   when      a flag, or a list (all of them), before it shows
 *   any       a list: at least one of these set too
 *   not       a flag or a list: it doesn't show while any of these is set
 *   done      a flag or a list: any of them set, and it's done (in code, a function (game) => true)
 *   optional  shown under the main one, marked Optional (two at most)
 *   target    what to pick out, or a list of them:
 *               { tag }              items, monsters, people and doors with that tag; else the tagged tiles
 *               { item: id, props }  items of that kind (props: only those whose props match)
 *               { enemy: id, props } monsters of that kind (props: the ones placed or spawned with them)
 *               { npc: id }, { tile: [x, y] }, { room: 'Name' } (the room's middle, on the minimap only)
 *             When you're in the same room as a target, or within 8 tiles of it, it pulses and a marker
 *             bobs over it. On the minimap every target is marked; one off the edge gets an arrow there.
 *             map: false (on the objective) keeps its targets off the minimap.
 *
 * The main objective is the first in the list that's showing and not done. A new one flashes on the HUD
 * with a chime. The pause screen lists what's open. LM.objectives.color is the marker colour.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const O = (LM.objectives = { color: '#ffd36a' });
  const h = (...a) => LM.ui.h(...a);

  LM.ui.addStyles(`
    .obj-plate { margin-top: 8px; max-width: 330px; padding: 8px 12px 9px; pointer-events: none; transition: box-shadow 0.4s ease; }
    .obj-plate[hidden] { display: none; }
    .obj-plate .obj-kicker { font: 700 10px/1.2 var(--font-ui); letter-spacing: 0.18em; text-transform: uppercase; color: var(--obj, #ffd36a); margin-bottom: 3px; }
    .obj-plate .obj-main { font: 500 14px/1.35 var(--font-ui); color: #efe9dc; }
    .obj-plate .obj-opt { margin-top: 6px; font: 400 12.5px/1.35 var(--font-ui); color: #b9b2a4; }
    .obj-plate .obj-opt b { display: block; font: 700 9.5px/1.3 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #8a8f98; }
    .obj-plate.new { animation: objNew 1.6s ease-out; }
    @keyframes objNew { 0% { box-shadow: 0 0 0 2px var(--obj, #ffd36a), 0 0 28px rgba(255, 211, 106, 0.55); } 100% { box-shadow: 0 0 0 0 transparent, 0 0 0 transparent; } }
    .pause-objectives { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font: 400 13.5px/1.4 var(--font-ui); }
    .pause-objectives li::before { content: '\\25B8'; margin-right: 8px; color: var(--obj, #ffd36a); }
    .pause-objectives li.opt { color: #b9b2a4; }
    .pause-objectives li.opt::before { content: '\\25B9'; }
    @media (max-width: 700px) { .obj-plate { max-width: 230px; } .obj-plate .obj-main { font-size: 13px; } }
  `);

  const list = (v) => (v == null ? [] : [].concat(v));
  const has = (game, f) => game.hasFlag(f);
  /** Is this objective showing (its conditions met) and not done yet? */
  O.open = function (o, game) {
    if (!o || !game || !game.player) return false;
    if (!list(o.when).every((f) => has(game, f))) return false;
    if (o.any && list(o.any).length && !list(o.any).some((f) => has(game, f))) return false;
    if (list(o.not).some((f) => has(game, f))) return false;
    return !O.done(o, game);
  };
  O.done = function (o, game) {
    if (typeof o.done === 'function') return !!o.done(game);
    const d = list(o.done);
    return d.length > 0 && d.some((f) => has(game, f));
  };
  O.textOf = (o, game) => (typeof o.text === 'function' ? o.text(game) : o.text || '');
  O.all = (game) => (game && game.level && Array.isArray(game.level.def.objectives) ? game.level.def.objectives : []);
  /** { main, optional: [] } showing now. */
  O.showing = function (game) {
    const open = O.all(game).filter((o) => O.open(o, game));
    return { main: open.find((o) => !o.optional) || null, optional: open.filter((o) => o.optional).slice(0, 2) };
  };
  O.current = (game) => O.showing(game).main;

  // ------------------------------------------------------------ targets
  const propsMatch = (have, want) => !want || Object.keys(want).every((k) => have && JSON.stringify(have[k]) === JSON.stringify(want[k]));
  /** Every place a target selector points at: [{ x, y, r, tiles?, room? }]. */
  O.points = function (sel, game) {
    const out = [];
    if (!sel || !game || !game.level) return out;
    if (Array.isArray(sel)) {
      for (const s of sel) out.push(...O.points(s, game));
      return out;
    }
    const L = game.level;
    if (sel.tag) {
      for (const it of game.items) if (!it.dead && it.tag === sel.tag) out.push({ x: it.x, y: it.y, r: it.r || 10 });
      for (const e of game.enemies) if (!e.dead && e.tag === sel.tag) out.push({ x: e.x, y: e.y, r: e.r });
      for (const n of game.npcs) if (!n.dead && n.tag === sel.tag) out.push({ x: n.x, y: n.y, r: n.r || 10 });
      for (const d of game.doors) if (d.tag === sel.tag) out.push({ x: d.x, y: d.y, r: 15, door: true });
      if (!out.length && L.tags && L.tags[sel.tag]) {
        const ts = L.tags[sel.tag];
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (const p of ts) {
          x0 = Math.min(x0, p.x);
          y0 = Math.min(y0, p.y);
          x1 = Math.max(x1, p.x);
          y1 = Math.max(y1, p.y);
        }
        if (ts.length) out.push({ x: ((x0 + x1 + 1) / 2) * T, y: ((y0 + y1 + 1) / 2) * T, r: 12, box: [x0 * T, y0 * T, (x1 + 1) * T, (y1 + 1) * T] });
      }
    }
    if (sel.item) for (const it of game.items) if (!it.dead && it.def.id === sel.item && propsMatch(it.props, sel.props)) out.push({ x: it.x, y: it.y, r: it.r || 10 });
    if (sel.enemy) for (const e of game.enemies) if (!e.dead && e.def.id === sel.enemy && propsMatch(e._props, sel.props)) out.push({ x: e.x, y: e.y, r: e.r });
    if (sel.npc) for (const n of game.npcs) if (!n.dead && n.def.id === sel.npc) out.push({ x: n.x, y: n.y, r: n.r || 10 });
    if (Array.isArray(sel.tile)) out.push({ x: (sel.tile[0] + 0.5) * T, y: (sel.tile[1] + 0.5) * T, r: 12, box: [sel.tile[0] * T, sel.tile[1] * T, (sel.tile[0] + 1) * T, (sel.tile[1] + 1) * T] });
    if (sel.room) {
      const rm = (L.def.rooms || []).find((r) => r.name === sel.room);
      if (rm) out.push({ x: (rm.rect[0] + rm.rect[2] / 2) * T, y: (rm.rect[1] + rm.rect[3] / 2) * T, r: 0, room: true });
    }
    return out;
  };
  /** The room (from the level's rooms) a point is in, or null. */
  O.roomAt = function (game, x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    for (const r of game.level.def.rooms || []) {
      const [rx, ry, rw, rh] = r.rect;
      if (tx >= rx && tx < rx + rw && ty >= ry && ty < ry + rh) return r;
    }
    return null;
  };
  /** Is a target close enough to pick out: in your room, or within 8 tiles? */
  O.near = function (game, p) {
    const P = game.player;
    if (!P || p.room) return false;
    if (U.dist(P.x, P.y, p.x, p.y) < 8 * T) return true;
    const a = O.roomAt(game, P.x, P.y);
    return !!a && a === O.roomAt(game, p.x, p.y);
  };

  // targets of what's showing, worked out a few times a second
  let cache = null;
  O.targets = function (game) {
    const now = game.time || 0;
    if (cache && cache.game === game && cache.level === game.level && Math.abs(now - cache.t) < 0.2) return cache.list;
    const s = O.showing(game), list2 = [];
    for (const o of [s.main].concat(s.optional)) {
      if (!o || !o.target) continue;
      for (const p of O.points(o.target, game)) {
        p.optional = !!o.optional;
        p.map = o.map !== false;
        list2.push(p);
      }
    }
    cache = { game, level: game.level, t: now, list: list2 };
    return list2;
  };

  // ------------------------------------------------------------ drawing in the world
  O.drawGlow = function (ctx, game, t) {
    if (game.attract || !game.player) return;
    for (const p of O.targets(game)) {
      if (p.room || !O.near(game, p)) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 4.2);
      LM.gfx.glow(ctx, p.x, p.y, (p.r || 10) + 26, O.color, (p.optional ? 0.2 : 0.32) + 0.22 * k);
    }
  };
  O.drawOverlay = function (ctx, game, t) {
    if (game.attract || !game.player) return;
    const col = O.color;
    for (const p of O.targets(game)) {
      if (p.room || !O.near(game, p)) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 4.2);
      ctx.save();
      ctx.globalAlpha = (p.optional ? 0.6 : 0.95) * (0.6 + 0.4 * k);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      if (p.box) {
        const [x0, y0, x1, y1] = p.box, m = 2 + 2 * k;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x0 - m, y0 - m, x1 - x0 + m * 2, y1 - y0 + m * 2);
        ctx.setLineDash([]);
      } else {
        // four corner ticks round it, breathing
        const r = (p.r || 10) + 8 + 4 * k;
        for (let i = 0; i < 4; i++) {
          const a = i * (Math.PI / 2) + Math.PI / 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, a - 0.42, a + 0.42);
          ctx.stroke();
        }
      }
      // a marker bobbing over it
      const top = p.box ? p.box[1] - 6 : p.y - (p.r || 10) - 14;
      const by = top - 8 - 5 * Math.abs(Math.sin(t * 3.2));
      ctx.globalAlpha = p.optional ? 0.75 : 1;
      ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(20,14,4,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, by + 9);
      ctx.lineTo(p.x - 7, by);
      ctx.lineTo(p.x + 7, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------ the minimap
  O.drawMap = function (g, game, ox, oy, s, W, H) {
    const t = performance.now() / 1000, k = 0.5 + 0.5 * Math.sin(t * 4);
    const seen = new Set();
    for (const p of O.targets(game)) {
      if (!p.map) continue;
      const key = Math.round(p.x / 48) + ',' + Math.round(p.y / 48);
      if (seen.has(key)) continue;
      seen.add(key);
      const mx = ox + (p.x / T) * s, my = oy + (p.y / T) * s;
      g.save();
      if (mx >= 4 && mx <= W - 4 && my >= 4 && my <= H - 4) {
        g.strokeStyle = O.color;
        g.globalAlpha = p.optional ? 0.6 : 0.95;
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(mx, my, 3 + 2.2 * k, 0, U.TAU);
        g.stroke();
        g.fillStyle = O.color;
        g.beginPath();
        g.arc(mx, my, 1.4, 0, U.TAU);
        g.fill();
      } else {
        // off the edge: an arrow on the edge, pointing at it
        const cx = W / 2, cy = H / 2, dx = mx - cx, dy = my - cy;
        const sc = Math.min((W / 2 - 7) / Math.max(1e-6, Math.abs(dx)), (H / 2 - 7) / Math.max(1e-6, Math.abs(dy)));
        g.translate(cx + dx * sc, cy + dy * sc);
        g.rotate(Math.atan2(dy, dx));
        g.globalAlpha = (p.optional ? 0.5 : 0.85) * (0.6 + 0.4 * k);
        g.fillStyle = O.color;
        g.beginPath();
        g.moveTo(5, 0);
        g.lineTo(-3, 3.5);
        g.lineTo(-3, -3.5);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
  };

  // ------------------------------------------------------------ the HUD
  let plate = null, last = '';
  function build() {
    if (plate && plate.isConnected) return plate;
    const tl = document.querySelector('#hud .hud-tl');
    if (!tl) return null;
    plate = h('div', { class: 'hud-plate obj-plate', hidden: true }, h('div', { class: 'obj-kicker' }, 'Objective'), h('div', { class: 'obj-main' }), h('div', { class: 'obj-opt' }));
    plate.style.setProperty('--obj', O.color);
    tl.appendChild(plate);
    return plate;
  }
  /** Called every frame by the HUD: keep the plate up to date, and flash it when something new shows. */
  O.frame = function (game) {
    if (!game || !game.level || game.attract) return;
    const el = build();
    if (!el) return;
    const s = O.showing(game);
    const main = s.main ? O.textOf(s.main, game) : '';
    const opts = s.optional.map((o) => O.textOf(o, game));
    const key = game.levelId + '|' + (s.main ? s.main.id || main : '') + '|' + main + '|' + opts.join('|');
    if (key === last) return;
    const firstOnFloor = !last || last.split('|')[0] !== game.levelId;
    const mainChanged = !firstOnFloor && last.split('|')[1] !== (s.main ? s.main.id || main : '');
    last = key;
    el.hidden = !main && !opts.length;
    el.children[0].textContent = main ? 'Objective' : 'Optional';
    el.children[1].textContent = main;
    el.children[1].hidden = !main;
    el.children[2].replaceChildren(...opts.map((t) => h('div', null, main ? h('b', null, 'Optional') : null, t)));
    el.children[2].hidden = !opts.length;
    if (!el.hidden && (mainChanged || firstOnFloor)) {
      el.classList.remove('new');
      void el.offsetWidth;
      el.classList.add('new');
      if (mainChanged && main) LM.audio.play('objective', { vol: 0.8 });
    }
  };
  /** For the pause screen: what's open on this floor. */
  O.view = function (game) {
    const s = O.showing(game);
    if (!s.main && !s.optional.length) return null;
    return h('ul', { class: 'pause-objectives' }, [s.main ? h('li', null, O.textOf(s.main, game)) : null].concat(s.optional.map((o) => h('li', { class: 'opt' }, 'Optional: ' + O.textOf(o, game)))).filter(Boolean));
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('objective', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 784, dur: 0.14, gain: 0.06 });
      kit.tone(t + 0.11, o, { type: 'sine', f0: 1175, dur: 0.24, gain: 0.06 });
    });
  }
})();
