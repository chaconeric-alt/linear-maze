/* Linear Maze Editor — gen/emit.js
 * Stage 12: writing an installation out as an ordinary pack, in the style of the hand-built floors.
 *
 *   games/<game>/packs/hn-g-<slug>/
 *     pack.js           LM.describePack: what it needs and its files
 *     site.js           its pin on the near-area map (HN.genSite, from hn-gen-kit)
 *     levels/f<n>.js    one LM.definePack per floor
 *     generation.json   the brief, seed, library hash, the whole plan and its words (the editor and CLI read it)
 *     REPORT.md         budgets, locks and keys, checks, in words
 *
 * G.levelDef(plan, lib, floor) builds a floor's level definition as data (the editor previews it with
 * the real engine); G.emitFiles(plan, lib) returns { path: text } for every file.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});
  const K = (x, y) => x + ',' + y;
  const VARIANT_CH = ['.', ',', ';', ':'];

  // ------------------------------------------------------------ writing JavaScript by hand, readably
  const IDENT = /^[A-Za-z_$][\w$]*$/;
  const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  function js(v, indent, inline) {
    indent = indent || '';
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') return q(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      const parts = v.map((x) => js(x, indent + '  ', true));
      const one = '[' + parts.join(', ') + ']';
      if (inline !== false && one.length < 110 && !one.includes('\n')) return one;
      return '[\n' + parts.map((p) => indent + '  ' + p).join(',\n') + ',\n' + indent + ']';
    }
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (!keys.length) return '{}';
    const parts = keys.map((k) => (IDENT.test(k) ? k : q(k)) + ': ' + js(v[k], indent + '  ', true));
    const one = '{ ' + parts.join(', ') + ' }';
    if (inline !== false && one.length < 150 && !one.includes('\n')) return one;
    return '{\n' + parts.map((p) => indent + '  ' + p).join(',\n') + ',\n' + indent + '}';
  }
  G.js = js;

  // characters for legend entries: readable first, then letters from further along (Latin-1, then Latin Extended-A
  // and Cyrillic: a floor full of functional rooms, each piece and material state its own entry, can use hundreds)
  const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!$%&*=?^_~|'.split('').concat(
    Array.from({ length: 96 }, (_, i) => String.fromCharCode(0xc0 + i)),
    Array.from({ length: 128 }, (_, i) => String.fromCharCode(0x100 + i)),
    Array.from({ length: 256 }, (_, i) => String.fromCharCode(0x400 + i)),
  );
  function allocator(reserved) {
    const used = new Set(reserved);
    const map = new Map();
    return (entry, prefer) => {
      const key = G.stableStringify(entry);
      if (map.has(key)) return map.get(key);
      let ch = prefer && !used.has(prefer) ? prefer : POOL.find((c) => !used.has(c));
      if (!ch) throw new Error('Ran out of legend characters.');
      used.add(ch);
      map.set(key, ch);
      return ch;
    };
  }

  /** A floor's level definition, as data. */
  G.levelDef = function (plan, lib, floor) {
    const look = lib.looks[floor.look] || {};
    const S = lib.settings;
    const nF = plan.floors.length;
    const roomOf = (x, y) => floor.rooms.find((r) => x >= r.rect[0] && y >= r.rect[1] && x < r.rect[0] + r.rect[2] && y < r.rect[1] + r.rect[3]);
    const variantOf = (x, y) => {
      const c = floor.layout.cells[y][x];
      if (c === ',') return (look.variants || {}).corridor || 0;
      const r = roomOf(x, y);
      if (!r) return 0;
      const t = lib.rooms[r.template] || {};
      const v = (look.variants || {})[t.variant || 'room'];
      return v == null ? (look.variants || {}).room || 0 : v;
    };
    const legend = {};
    const doorT = look.doorTerrain || 'door';
    const mapAlloc = allocator(['#', '.', ',', ';', ':', '+', '<', '>', ' ']);
    const map = [];
    for (let y = 0; y < floor.layout.h; y++) {
      let row = '';
      for (let x = 0; x < floor.layout.w; x++) {
        const c = floor.layout.cells[y][x];
        const t = floor.tiles[K(x, y)];
        if (c === ' ' || c === '#') {
          if (t && (t.tag || t.terrain)) {
            // a tagged wall, or a material wall (a functional room's)
            const e = { terrain: t.terrain || 'wall' };
            if (t.tag) e.tag = t.tag;
            if (t.variant) e.variant = t.variant;
            const ch = mapAlloc(e);
            legend[ch] = e;
            row += ch;
          } else row += '#';
          continue;
        }
        const v = variantOf(x, y);
        if (!t) {
          if (c === '+') {
            if (doorT !== 'door') legend['+'] = { terrain: doorT };
            row += '+';
          } else {
            const ch = VARIANT_CH[v] || '.';
            if (v) legend[ch] = { terrain: 'floor', variant: v };
            row += ch;
          }
          continue;
        }
        const e = {};
        e.terrain = t.terrain || (c === '+' ? doorT : 'floor');
        if (v && !(e.terrain || '').startsWith('door') && e.terrain !== 'hn-iris') e.variant = v;
        // a material floor's variant is its state (intact, worn, ruined)
        if (t.variant != null && (e.terrain || '').startsWith('mat-')) {
          if (t.variant) e.variant = t.variant;
          else delete e.variant;
        }
        if (t.tag) e.tag = t.tag;
        if (t.props) e.props = t.props;
        let prefer = null;
        if (e.terrain === 'entry' && !e.tag && !e.variant) prefer = '<';
        if (e.terrain === 'exit') prefer = '>';
        if (e.terrain === 'spikes' && !e.tag) prefer = '^';
        const ch = prefer === '<' ? '<' : mapAlloc(e, prefer);
        if (ch !== '<') legend[ch] = e;
        row += ch;
      }
      map.push(row.replace(/\s/g, '#'));
    }
    // the objects layer
    const objLegend = {};
    const objAlloc = allocator([' ', '.', '@']);
    const objects = [];
    for (let y = 0; y < floor.layout.h; y++) {
      let row = '';
      for (let x = 0; x < floor.layout.w; x++) {
        const o = floor.objs[K(x, y)];
        if (!o || o.cover) {
          row += ' ';
          continue;
        }
        if (o.start) {
          objLegend['@'] = { start: true };
          row += '@';
          continue;
        }
        const e = {};
        if (o.item) e.item = o.item;
        if (o.enemy) e.enemy = o.enemy;
        if (o.props && Object.keys(o.props).length) e.props = o.props;
        if (o.tag) e.tag = o.tag;
        const plain = !e.props && !e.tag;
        const ch = objAlloc(plain ? e.item || e.enemy : e);
        objLegend[ch] = plain ? e.item || e.enemy : e;
        row += ch;
      }
      objects.push(row);
    }
    const def = {
      name: floor.name,
      floorLabel: plan.concept.title + (nF > 1 ? ' · ' + floor.n : ''),
      order: (plan.brief.order || S.orderBase || 100) + floor.n,
      environment: look.environment,
      hn: { place: plan.concept.title, threat: floor.tl || plan.brief.tl, floor: plan.concept.title + (nF > 1 ? ', floor ' + floor.n : '') + ': ' + floor.name, gen: { slug: plan.slug, trapsOff: floor.trapsOff || null, done: plan.doneFlag || null, roaches: true } },
    };
    if (floor.n === 1) def.stairsUp = false;
    if (floor.n < nF) {
      const L = plan.locks.find((l) => l.floor === floor.n && l.stairs);
      const dir = G.typeOf(lib, plan.brief.type).vertical || 'down';
      def.stairs = { [floor.stairsTag]: { to: plan.floors[floor.n].id, until: L ? [L.flag] : undefined, locked: floor.stairsLocked, dir, go: (dir === 'up' ? 'Up to' : 'Down to') + ' {name}' } };
    }
    if (floor.intro) def.intro = floor.intro;
    // what to do next (engine objectives, SPEC 6.21): the stairs card, the way on, and on the last floor the goal
    const objectives = [];
    const tileOf = (k) => k.split(',').map(Number);
    if (floor.n < nF && floor.exitAt) {
      const L = plan.locks.find((l) => l.floor === floor.n && l.stairs);
      const dir = G.typeOf(lib, plan.brief.type).vertical || 'down';
      if (L && L.keyAt && (L.keyKind === 'card' || L.keyKind === 'badge')) {
        const name = L.keyKind === 'card' ? ((S.tierInfo || {})[L.tier] || {}).name || 'access card' : 'ID badge';
        objectives.push({ id: 'key', text: 'Find the ' + name + ' for the stairs (or hack their panel)', done: [L.flag, L.hackFlag].filter(Boolean), target: { tile: tileOf(L.keyAt) } });
      }
      objectives.push({ id: 'way', text: 'Find the stairs ' + dir + ' to floor ' + (floor.n + 1), target: { tile: floor.exitAt.slice() } });
    }
    if (floor.n === nF && plan.doneFlag) {
      const gk = Object.keys(floor.objs).find((k) => floor.objs[k].goal);
      const g = plan.concept.goal || {};
      const text = { recover: 'Recover ' + (g.target || 'what you came for'), 'shut-down': 'Shut the place down', 'reach-vault': 'Reach the vault', kill: 'Put down ' + ((plan.concept.boss || {}).name || 'whatever runs this place') }[g.kind] || 'Finish what you came for';
      if (gk) objectives.push({ id: 'goal', text, done: plan.doneFlag, target: { tile: tileOf(gk) } });
    }
    if (objectives.length) def.objectives = objectives;
    if (floor.below) def.below = G.clone(floor.below);
    if (look.nextGen) {
      def.nextGen = G.clone(look.nextGen);
      if (def.nextGen.ceiling) def.nextGen.ceiling.seed = (G.hashStr(plan.slug + floor.n) % 90) + 10;
    }
    if (look.ceilingLights) def.ceilingLights = G.clone(look.ceilingLights);
    def.rooms = floor.rooms.map((r) => {
      const o = { name: r.name, rect: r.rect.slice() };
      if (r.shape) o.shape = r.shape;
      if (r.note) o.note = r.note;
      return o;
    });
    if (Object.keys(legend).length) def.legend = legend;
    def.objectLegend = objLegend;
    if (floor.traps.length) def.traps = floor.traps.map((t) => {
      const o = { trigger: t.trigger };
      if (t.once === false) o.once = false;
      if (t.cooldown) o.cooldown = t.cooldown;
      if (t.gen) o.gen = t.gen;
      if (t.off) o.off = t.off;
      o.effects = t.effects;
      return o;
    });
    def.map = map;
    def.objects = objects;
    return def;
  };

  // ------------------------------------------------------------ the files
  G.emitFiles = function (plan, lib) {
    const S = lib.settings;
    const dir = 'games/' + plan.game + '/packs/' + S.packPrefix + plan.slug + '/';
    const packId = S.packPrefix + plan.slug;
    const files = {};
    const c = plan.concept;
    const today = plan.brief.date || '';
    for (const floor of plan.floors) {
      const def = G.levelDef(plan, lib, floor);
      const head = [
        '/* HaveNot — packs/' + packId + '/levels/f' + floor.n + '.js',
        ' * ' + c.title + ', floor ' + floor.n + ' of ' + plan.floors.length + ': ' + floor.name + ' (' + ((lib.looks[floor.look] || {}).name || floor.look) + ').',
        ' * Generated by the installation generator ' + G.VERSION + ' from seed ' + plan.seed + ', library ' + plan.libHash + (today ? ', ' + today : '') + '.',
        ' * Edit it like any hand-built floor; editor/gen/README.md says how rerolls treat hand edits.',
        ' *',
      ].concat(floorStory(plan, lib, floor).map((l) => ' *   ' + l), [' */']);
      files[dir + 'levels/f' + floor.n + '.js'] = head.join('\n') + "\n'use strict';\nLM.definePack({\n  id: " + q(packId) + ',\n  levels: {\n    ' + q(floor.id) + ': ' + js(def, '    ', false) + ',\n  },\n});\n';
    }
    const req = (S.packRequires || []).slice();
    files[dir + 'pack.js'] = [
      '/* HaveNot — packs/' + packId + '/pack.js',
      ' * A generated installation: ' + c.title + ' (' + c.typeName + ', Threat Level ' + plan.brief.tl + ').',
      ' */',
      'LM.describePack(' + js({
        name: 'HaveNot: ' + c.title,
        version: '0.1.0',
        description: c.typeName + ', Threat Level ' + plan.brief.tl + ', ' + plan.floors.length + (plan.floors.length > 1 ? ' floors' : ' floor') + '. Generated from seed ' + plan.seed + '.',
        requires: req,
        scripts: ['site.js'],
        levels: plan.floors.map((f) => 'levels/f' + f.n + '.js'),
      }, '', false) + ');',
      '',
    ].join('\n');
    const pin = sitePin(plan, lib);
    files[dir + 'site.js'] = [
      '/* HaveNot — packs/' + packId + '/site.js',
      ' * Its pin on the near-area map' + (plan.brief.replaces ? ' (it replaces the “' + plan.brief.replaces + '” stub)' : '') + '.',
      ' */',
      "'use strict';",
      'window.LM.HN.genSite(' + js(pin, '', false) + ');',
      '',
    ].join('\n');
    files[dir + 'generation.json'] = JSON.stringify(G.record(plan), null, 1) + '\n';
    files[dir + 'REPORT.md'] = G.reportText(plan, lib);
    return files;
  };

  function sitePin(plan, lib) {
    const c = plan.concept;
    const dangers = [];
    const seen = new Set();
    for (const f of plan.floors) for (const o of Object.values(f.objs)) if (o.enemy && !seen.has(o.enemy)) {
      seen.add(o.enemy);
      const m = plan.registry && plan.registry.enemies[o.enemy];
      dangers.push(m ? m.name : o.enemy);
    }
    if (plan.floors.some((f) => f.trapCount)) dangers.push('Traps');
    const b = plan.brief;
    return {
      slug: plan.slug,
      replaces: b.replaces || null,
      levels: plan.floors.map((f) => f.id),
      pin: {
        id: b.replaces || plan.slug,
        level: plan.floors[0].id,
        name: c.title,
        kind: b.pinKind || G.typeOf(lib, b.type).name,
        x: b.pinAt ? b.pinAt[0] : undefined,
        y: b.pinAt ? b.pinAt[1] : undefined,
        state: b.pinState || 'known',
        desc: c.pinDesc,
        services: ['Treasure'],
        dangers: dangers.slice(0, 6),
        threat: [plan.floors[0].tl || b.tl, plan.floors[plan.floors.length - 1].tl || b.tl],
      },
    };
  }
  G.sitePin = sitePin;

  /** The floor's story for its header comment: rooms front to back, and how the locks fit together. */
  function floorStory(plan, lib, floor) {
    const out = [];
    const rooms = floor.rooms;
    const name = (i) => (rooms[i] ? rooms[i].name : '?');
    out.push('The way in: ' + rooms[0].name + '. ' + (floor.n === 1 ? 'The way out is under the start.' : 'The stairs back are here.'));
    out.push('Critical path: ' + floor.path.map(name).join(' -> ') + '.');
    for (const L of plan.locks.filter((l) => l.floor === floor.n)) {
      const what = L.stairs ? 'The stairs on' : L.goal ? 'The goal, ' + name(L.to) : name(L.to);
      const key = L.keyKind === 'none' ? 'a hack panel' : L.keyKind === 'card' || L.keyKind === 'badge' ? (L.keyKind === 'badge' ? 'the ID badge' : 'the ' + (L.needText || 'card')) + ' in ' + name(L.keyRoom) + (L.code ? ' (a code locker; the code ' + L.code + ' is on a memo in ' + name(L.clueRoom) + ')' : '') : L.keyKind === 'mech' ? 'the ' + L.color + ' key in ' + name(L.keyRoom) : 'the ' + (L.keyKind === 'power' ? 'breaker' : 'door release') + ' in ' + name(L.keyRoom);
      out.push(what + (L.critical ? '' : ' (optional)') + ': ' + key + (L.hackFlag && L.kind !== 'hack' ? ', or hack the panel' : '') + '.');
    }
    if (floor.trapsOff && floor.traps.some((t) => t.gen === 'switch')) out.push('A facilities terminal on this floor switches its traps off.');
    const boss = Object.values(floor.objs).find((o) => o.boss);
    if (boss) out.push('The boss: ' + plan.concept.boss.name + ' (' + boss.enemy + ').');
    return out;
  }

  /** What generation.json keeps: everything needed to rerun any stage, minus the registry. */
  G.record = function (plan) {
    const keep = Object.assign({}, plan);
    delete keep.registry;
    delete keep.vars;
    keep.floors = plan.floors.map((f) => {
      const o = Object.assign({}, f);
      delete o.lockById;
      return o;
    });
    return keep;
  };

  G.reportText = function (plan, lib) {
    const c = plan.concept;
    const L = [];
    L.push('# ' + c.title);
    L.push('');
    L.push(c.typeName + ', Threat Level ' + plan.brief.tl + ', ' + plan.floors.length + ' floor' + (plan.floors.length > 1 ? 's' : '') + ', seed `' + plan.seed + '`, library `' + plan.libHash + '`, generator ' + G.VERSION + '.');
    L.push('');
    L.push('**Back-story.** ' + [c.backstory.builder, c.backstory.purpose, c.backstory.fate, c.backstory.occupants].filter(Boolean).join(' '));
    L.push('');
    const verb = { 'shut-down': 'Shut down', recover: 'Recover', 'reach-vault': 'Reach', kill: 'Destroy' }[c.goal.kind] || G.titleCase(c.goal.kind.replace(/-/g, ' ')) + ':';
    L.push('**Goal.** ' + verb + ' ' + c.goal.target + '.' + (c.boss ? ' Boss: ' + c.boss.name + '.' : ''));
    L.push('');
    L.push('| Floor | Look | Size | Rooms | Monsters (points / budget) | Treasure (credits / target) | Traps | Checks |');
    L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const f of plan.floors) {
      L.push('| ' + f.n + ' ' + f.name + ' | ' + ((lib.looks[f.look] || {}).name || f.look) + ' | ' + f.layout.w + ' × ' + f.layout.h + ' | ' + f.rooms.length + ' | ' + (f.encounter ? f.encounter.spent + ' / ' + f.encounter.budget : '') + ' | ' + (f.treasure ? f.treasure.spent + ' / ' + f.treasure.target : '') + ' | ' + (f.trapCount || 0) + ' | ' + (f.check ? f.check.keysOnly + ' tiles with keys, ' + f.check.all + ' with hacks' : '') + ' |');
    }
    L.push('');
    L.push('## Locks and keys');
    L.push('');
    for (const f of plan.floors) for (const line of floorStory(plan, lib, f).slice(2)) L.push('- Floor ' + f.n + ': ' + line);
    L.push('');
    const probs = (plan.validation ? plan.validation.problems : []).concat(plan.report.problems || []);
    L.push('## Checks');
    L.push('');
    if (!probs.length) L.push('Everything passed: the goal and every floor’s stairs can be reached with keys alone.');
    for (const p of probs) L.push('- ' + (p.level === 'bad' ? '**Problem:** ' : 'Note: ') + p.text);
    if ((plan.report.fallbacks || []).length) {
      L.push('');
      L.push('## Substitutions');
      L.push('');
      for (const f of plan.report.fallbacks) L.push('- ' + f);
    }
    L.push('');
    return L.join('\n');
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
