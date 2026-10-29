/* Linear Maze Editor — gen/validate.js
 * Stage 11: proving an installation can be finished, and checking everything else that can go wrong.
 *
 * The proof walks the real tiles, floor by floor, as a player would: from the start, through every
 * door the flags held so far open, picking up every key item, clue, switch and coloured key it can
 * reach, until nothing more opens. It runs twice: with keys only (must reach the goal and every floor's
 * stairs on), then also hacking every panel (to report rooms that nothing at all can reach).
 * Flags carry from floor to floor, as key items do in the game.
 *
 * G.checkTiles is the same walk for one level definition, shared with the editor's map Check.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});
  const K = (x, y) => x + ',' + y;
  const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  /** Walk one floor. held: Set of flags (and 'key:red' etc.), changed in place. Returns { seen, w }.
   *  hacks: false (keys only), 'sure' (also hacks anyone wins by retrying: difficulty 10 or less on a d10 roll),
   *  'all' (every hack, given the skill). */
  const SURE = 10;
  function walk(floor, held, hacks) {
    const canHack = (d) => hacks === 'all' || (hacks === 'sure' && (d || 9) <= SURE);
    const W = floor.layout.w, H = floor.layout.h;
    const cells = floor.layout.cells;
    const base = (x, y) => (y >= 0 && y < H && x >= 0 && x < cells[y].length ? cells[y][x] : ' ');
    const tile = (x, y) => floor.tiles[K(x, y)];
    const obj = (x, y) => floor.objs[K(x, y)];
    const doorOpen = (x, y) => {
      const t = tile(x, y);
      if (!t) return true;
      if (t.terrain && t.terrain.startsWith('door-')) return held.has('key:' + t.terrain.slice(5));
      const f = t.props && t.props.flag;
      if (!f) return true;
      return G.asList(f).some((q) => held.has(q));
    };
    // a curved room's corners are wall in the game (engine/shapes.js trims them)
    const trimmed = new Set();
    for (const r of floor.rooms) if (r.shape) {
      const [rx, ry, rw, rh] = r.rect;
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) if (!G.inRoom(r, x, y, 0)) trimmed.add(K(x, y));
    }
    const passable = (x, y) => {
      const c = base(x, y);
      if (c !== '.' && c !== ',' && c !== '+') return false;
      if (trimmed.has(K(x, y))) return false;
      if (c === '+' && !doorOpen(x, y)) return false;
      const o = obj(x, y);
      if (o && o.solid) return false;
      return true;
    };
    let seen;
    for (let pass = 0; pass < 50; pass++) {
      seen = new Uint8Array(W * H);
      const [sx, sy] = floor.startAt;
      const q = [[sx, sy]];
      seen[sy * W + sx] = 1;
      while (q.length) {
        const [x, y] = q.pop();
        for (const [ox, oy] of N4) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !passable(nx, ny)) continue;
          seen[ny * W + nx] = 1;
          q.push([nx, ny]);
        }
      }
      const near = (x, y) => seen[y * W + x] || N4.some(([ox, oy]) => x + ox >= 0 && y + oy >= 0 && x + ox < W && y + oy < H && seen[(y + oy) * W + x + ox]);
      let gained = false;
      const gain = (f) => {
        if (f && !held.has(f)) {
          held.add(f);
          gained = true;
        }
      };
      for (const [k, o] of Object.entries(floor.objs)) {
        const [x, y] = k.split(',').map(Number);
        if (!near(x, y)) continue;
        const p = o.props || {};
        if (o.item === 'hn-cache') {
          if (p.code && !held.has(p.codeFlag) && !canHack(p.hackDiff)) continue;
          if (p.needFlag && !G.asList(p.needFlag).some((f) => held.has(f))) continue;
          for (const e of p.loot || []) if (e.type === 'keyItem' && e.info && e.info.flag) gain(e.info.flag);
        } else if (o.item === 'hn-hygiene-panel' || (o.item === 'hn-terminal' && p.action === 'hygiene')) {
          // the Mental Hygiene checkpoint takes the Dark Tetrad score (an ELIZA's), or a hack
          if (held.has('tetrad')) gain(p.flag);
          if (canHack(p.difficulty)) gain(p.hackFlag);
        } else if (o.item === 'hn-terminal' && (p.action === 'redteam' || p.action === 'riddle' || p.action === 'chatty')) {
          // nothing the way on depends on these
        } else if (o.item === 'hn-memo' || (o.item === 'hn-terminal' && (!p.difficulty || canHack(p.difficulty)))) {
          gain(p.flag);
          gain(p.gives);
        }
        else if (o.item === 'hn-sec-panel') {
          if (canHack(p.difficulty)) gain(p.flag);
          if (p.cardFlag && held.has(p.cardFlag)) gain(p.flag);
        } else if (o.item === 'key') gain('key:' + p.color);
      }
      if (!gained) break;
    }
    return { seen, W };
  }

  G.stageValidate = function (plan, lib) {
    const probs = [];
    const bad = (t, f) => probs.push(G.problem('bad', (f ? 'Floor ' + f.n + ': ' : '') + t));
    const warn = (t, f) => probs.push(G.problem('warn', (f ? 'Floor ' + f.n + ': ' : '') + t));
    const info = (t, f) => probs.push(G.problem('info', (f ? 'Floor ' + f.n + ': ' : '') + t));
    const held = new Set();
    const heldKeys = new Set();
    const heldAll = new Set();
    const [mw, mh] = lib.settings.mapMax || [72, 48];
    for (const floor of plan.floors) {
      const { w, h } = floor.layout;
      if (w > mw || h > mh) bad('the map is ' + w + ' × ' + h + ', over ' + mw + ' × ' + mh + '.', floor);
      // the proof: keys, clues, switches, and hacks anyone wins by retrying
      const keysOnly = walk(floor, held, 'sure');
      const strict = walk(floor, heldKeys, false);
      const all = walk(floor, heldAll, 'all');
      const at = (res, x, y) => res.seen[y * res.W + x];
      const reachRoom = (res, r) => G.roomCells(r, 0).some(([x, y]) => at(res, x, y));
      // the way on, or the goal
      const last = floor.n === plan.floors.length;
      if (!last) {
        const [sx, sy] = floor.exitAt || [];
        if (sx == null) bad('no stairs on.', floor);
        else if (!at(keysOnly, sx, sy)) bad('the stairs on can’t be reached with the keys on this floor.', floor);
        else if (!at(strict, sx, sy)) info('the stairs on need a hack on the way (a panel anyone can beat by retrying).', floor);
        const L = plan.locks.find((l) => l.floor === floor.n && l.stairs);
        if (L && !held.has(L.flag)) bad('the ' + (L.needText || 'card') + ' for the stairs can’t be reached.', floor);
      } else {
        const goal = floor.rooms[floor.path[floor.path.length - 1]];
        if (!reachRoom(keysOnly, goal)) bad('the goal room (' + goal.name + ') can’t be reached.', floor);
        else if (!reachRoom(strict, goal)) info('the goal needs a hack on the way (a panel anyone can beat by retrying).', floor);
      }
      // every room, with hacks
      for (const r of floor.rooms) if (!reachRoom(all, r)) warn('nothing reaches ' + (r.name || r.id) + '.', floor);
      // everything placed is on a tile the player can get to (or beside one)
      const nearAll = (x, y) => at(all, x, y) || N4.some(([ox, oy]) => x + ox >= 0 && y + oy >= 0 && x + ox < w && y + oy < h && at(all, x + ox, y + oy));
      for (const [k, o] of Object.entries(floor.objs)) {
        const [x, y] = k.split(',').map(Number);
        const usable = o.enemy || o.container || o.goal || (plan.registry && o.item && plan.registry.items[o.item] && plan.registry.items[o.item].interact);
        if (usable && !nearAll(x, y)) warn((o.item || o.enemy || 'something') + ' at ' + k + ' can’t be reached.', floor);
        if (o.enemy && floor.startAt && Math.abs(x - floor.startAt[0]) + Math.abs(y - floor.startAt[1]) < 4) bad('a monster starts next to the way in.', floor);
      }
      // trap tags exist
      const tags = new Set();
      for (const t of Object.values(floor.tiles)) if (t.tag) tags.add(t.tag);
      for (const o of Object.values(floor.objs)) if (o.tag) tags.add(o.tag);
      for (const tr of floor.traps) {
        const tg = tr.trigger && tr.trigger.tag;
        if (tg && tr.trigger.type !== 'flag' && !tags.has(tg)) bad('trap trigger tag “' + tg + '” isn’t on the map.', floor);
        for (const ef of tr.effects || []) if (ef.tag && ef.type !== 'flag' && !tags.has(ef.tag) && ef.tag !== 'roachSpawn') bad('trap effect tag “' + ef.tag + '” isn’t on the map.', floor);
      }
      // doorways have floor on two opposite sides
      const cells = floor.layout.cells;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (cells[y][x] !== '+') continue;
        const o = (a, b) => /[.,+]/.test((cells[b] || '')[a] || ' ');
        if (!((o(x - 1, y) && o(x + 1, y)) || (o(x, y - 1) && o(x, y + 1)))) bad('a doorway at ' + x + ',' + y + ' leads nowhere.', floor);
      }
      floor.check = { keysOnly: countSeen(strict), sure: countSeen(keysOnly), all: countSeen(all) };
    }
    // budgets (warnings only)
    for (const f of plan.floors) {
      if (f.treasure && f.treasure.target && Math.abs(f.treasure.spent - f.treasure.target) > f.treasure.target * 0.25) warn('treasure ' + f.treasure.spent + ' against a target of ' + f.treasure.target + '.', f);
      if (f.encounter && f.encounter.spent < f.encounter.budget * 0.6) warn('monsters spent ' + f.encounter.spent + ' of ' + f.encounter.budget + '.', f);
    }
    plan.validation = { ok: !probs.some((p) => p.level === 'bad'), problems: probs };
    return plan.validation;
  };
  function countSeen(res) {
    let n = 0;
    for (const v of res.seen) n += v;
    return n;
  }

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
