/* Linear Maze Editor — gen/stages-words.js
 * Stage 10: words. Every text slot the earlier stages opened is filled from the library's text pools,
 * so an installation reads properly with no Claude at all. Slot ids are stable (they come from what the
 * slot belongs to: 'f2.r7.name', 'f1.memoL3.text'), so text written by Claude or by hand (plan.words
 * entries with src 'claude' or 'edited') survives a reroll of anything else.
 *
 * Slot targets:
 *   { obj: 'x,y', prop }    floor.objs[...].props[prop]  (a pool entry that is an object sets all its fields)
 *   { loot: 'x,y', prop }   the key item inside that container: its info[prop]
 *   { room: i, prop }       floor.rooms[i].name / .note
 *   { floor: prop }         floor.intro, floor.name
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});

  G.stageWords = function (plan, lib) {
    const old = plan.words || {};
    const words = {};
    // words the brief sets (brief.words: { slotId: text }) win; then words Claude wrote or someone edited
    const briefWords = plan.brief.words || {};
    const keep = (id) => (briefWords[id] != null ? { text: briefWords[id], src: 'brief' } : old[id] && (old[id].src === 'claude' || old[id].src === 'edited') ? old[id] : null);
    const set = (id, text, src) => {
      words[id] = { text, src: src || 'pool' };
      return text;
    };
    // the concept's own words
    const crng = G.srng(plan, 'words', 'concept');
    const cw = (id, pool, vars) => {
      const k = keep(id);
      if (k) return set(id, k.text, k.src);
      return set(id, G.say(lib, crng, pool, Object.assign({}, plan.vars, vars)) || '');
    };
    plan.concept.pinDesc = cw('pin.desc', 'pins.' + (G.typeOf(lib, plan.brief.type).backstory || 'war'));
    plan.concept.rumor = cw('pin.rumor', 'rumors.any');
    // a floor is named for the zone that most sets it apart (the most rooms, then the deepest), never twice
    const usedFloorNames = new Set();
    const floorName = (floor, rng) => {
      const count = {};
      for (const r of floor.rooms) if (!r.isEntry) count[r.zone] = (count[r.zone] || 0) + 1;
      const rank = (z) => ((lib.zones[z] || {}).rank || 0);
      const zones = Object.keys(count).sort((a, b) => (a === 'public') - (b === 'public') || count[b] - count[a] || rank(b) - rank(a) || (a < b ? -1 : 1));
      for (const z of zones.concat('any')) {
        const pool = G.textPool(lib, 'floorNames.' + z).map((v) => G.fill(v, plan.vars)).filter((v) => !usedFloorNames.has(v));
        if (pool.length) {
          const v = rng.pick(pool);
          usedFloorNames.add(v);
          return v;
        }
      }
      return floor.rooms[floor.path[Math.floor(floor.path.length / 2)]].name.replace(/^The /, '');
    };
    for (const floor of plan.floors) {
      const rng = G.srng(plan, 'words', 'f' + floor.n);
      const room = (i) => (floor.rooms[i] && floor.rooms[i].name) || 'somewhere on this floor';
      const vars = (extra) => Object.assign({ floor: floor.n }, plan.vars, extra);
      const fillTokens = (s) => (typeof s === 'string' ? s.replace(/\{room:(\d+)\}/g, (m, i) => room(Number(i))) : s);
      // room names, unique on the floor (the engine matches shaped rooms by name)
      const names = new Set();
      for (const r of floor.rooms) {
        const t = lib.rooms[r.template] || {};
        const id = 'f' + floor.n + '.' + r.id + '.name';
        let name = (keep(id) || {}).text || (r.fn && r.fn.name) || G.say(lib, rng, t.names || 'roomNames.' + r.template, vars()) || G.titleCase(r.template.replace(/-/g, ' '));
        if (names.has(name) && !keep(id) && r.fn) {
          // a functional room whose type another setting's room on this floor shares (library 2's rooms are templates
          // repeated per setting): its setting tells them apart
          const C = G.contentOf && G.contentOf(lib, plan.brief.library), S = C && C.settings[r.fn.setting];
          if (S) name = name + ' (' + String(S.name).split(/ - |: | & /)[0] + ')';
        }
        if (names.has(name) && !keep(id) && !r.fn) {
          // another name from the pool before a number
          const left = G.textPool(lib, t.names || 'roomNames.' + r.template).map((v) => G.fill(v, vars())).filter((v) => !names.has(v));
          if (left.length) name = rng.pick(left);
        }
        let k = 2;
        const baseName = name;
        while (names.has(name)) name = baseName + ' ' + k++;
        names.add(name);
        r.name = set(id, name, keep(id) ? keep(id).src : 'pool');
        const nid = 'f' + floor.n + '.' + r.id + '.note';
        r.note = set(nid, (keep(nid) || {}).text || (r.fn && r.fn.note) || G.say(lib, rng, t.notes || 'zoneNotes.' + r.zone, vars()) || (lib.zones[r.zone] || {}).name || '', keep(nid) ? keep(nid).src : 'pool');
      }
      floor.name = set('f' + floor.n + '.name', (keep('f' + floor.n + '.name') || {}).text || floorName(floor, rng));
      floor.intro = set('f' + floor.n + '.intro', (keep('f' + floor.n + '.intro') || {}).text || (floor.n === 1 ? plan.concept.intro : G.say(lib, rng, 'floorIntros.' + floor.look, vars()) || G.say(lib, rng, 'floorIntros.any', vars()) || ''));
      // the slots the stages opened
      for (const s of floor.slots) {
        const k = keep(s.id);
        let v = k ? k.text : G.say(lib, rng, s.pool, vars(s.vars));
        if (v == null) {
          plan.report.problems.push(G.problem('warn', 'Text pool “' + s.pool + '” is empty (slot ' + s.id + ').'));
          continue;
        }
        if (typeof v === 'string') v = fillTokens(G.fill(v, vars(s.vars)));
        else v = Object.fromEntries(Object.entries(v).map(([a, b]) => [a, fillTokens(G.fill(b, vars(s.vars)))]));
        set(s.id, v, k ? k.src : 'pool');
        applySlot(floor, s.target, v);
      }
      // trap and stage messages written as {say:pool}
      floor.traps.forEach((tr, ti) => (tr.effects || []).forEach((ef, ei) => {
        if (typeof ef.text === 'string' && ef.text.startsWith('{say:')) {
          const id = 'f' + floor.n + '.trap' + ti + '.e' + ei;
          const k = keep(id);
          ef.text = set(id, k ? k.text : G.say(lib, rng, ef.text.slice(5, -1), vars()) || '', k ? k.src : 'pool');
        }
      }));
      // locked stairs say what they need
      floor.stairsLocked = set('f' + floor.n + '.stairs', (keep('f' + floor.n + '.stairs') || {}).text || G.say(lib, rng, 'stairsLocked', vars({ need: ((plan.locks.find((l) => l.floor === floor.n && l.stairs) || {}).needText) || 'a card' })) || 'Locked.');
    }
    plan.words = words;
  };

  function applySlot(floor, t, v) {
    if (!t) return;
    if (t.obj) {
      const o = floor.objs[t.obj];
      if (!o) return;
      o.props = o.props || {};
      if (v && typeof v === 'object') Object.assign(o.props, v);
      else o.props[t.prop || 'text'] = v;
    } else if (t.loot) {
      const o = floor.objs[t.loot];
      const e = o && (o.props.loot || []).find((x) => x.type === 'keyItem');
      if (e) e.info[t.prop || 'text'] = typeof v === 'object' ? v.text : v;
    } else if (t.room != null) {
      const r = floor.rooms[t.room];
      if (r) r[t.prop] = v;
    } else if (t.floor) floor[t.floor] = v;
  }
  G.applySlot = applySlot;

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
