/* HaveNot — packs/hn-ruins/ruins.js
 * The installations a run rolls for itself. When a character is made, the run picks a seed and writes four
 * briefs into its state (P.data.hn.ruins), and the installation generator (editor/gen/) builds them on the spot:
 *
 *   The Bunker            war-bunker, Threat Level 1, two floors (it takes over the Bunker's pin)
 *   Installation-Ruin 1–3 any type, 3–10 floors; the Threat Level rises by one every 2–3 floors. One ruin starts
 *                         at Level 1, one at 3–5 and one at 4–10, in a shuffled order.
 *
 * The briefs are saved with the run and the generator is deterministic, so Continue (and a reload) rebuild the
 * same installations: this file reads the checkpoint as soon as it loads, before the engine looks for the floor
 * it was saved on. Pins show each ruin's Threat range; each floor says its own Threat Level on arrival.
 *
 *   HN.rollRuins(seed)     → { seed, briefs }
 *   HN.buildRuins(ruins)   generate every brief and register its floors and pin (returns the site specs)
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, G = window.LMGen;
  const U = LM.util;

  // the Bunker's story, from gen/briefs/bunker.json (the CLI's brief for it); only the seed changes per run
  const BUNKER = {
    type: 'war-bunker', tl: 1, floors: 2, size: 'standard', slug: 'bunker', title: 'The Bunker', replaces: 'bunker',
    story: {
      intro: 'Behind the blast door: a guard post, a dead light, and a second blast door with PLEASE painted on it in red. On its inside, someone scratched a tally into the steel: hundreds of marks, then nothing. The weld has been cut.',
      backstory: {
        builder: 'A warlord’s army cut it into the hill as a forward command post.',
        purpose: 'It was meant to run the war for the near-area. The war moved on and forgot to tell it.',
        fate: 'The garrison sealed the doors against the Burners and waited for relief, counting the days on the inner door.',
        occupants: 'The guard robots never got the order to stand down. The roaches got in anyway.',
      },
      goal: { kind: 'recover', target: 'the duty log' },
    },
    words: {
      'pin.desc': 'A blast door in a hillside, half-buried in red sand. Someone has painted KEEP OUT on it, then crossed it out and painted PLEASE.',
      'f2.goal.name': 'The duty log',
      'f2.goal.text': 'A steel case bolted to the command desk, still locked. Inside: the garrison’s last log, the tally finished in a neat hand, and the pay nobody was left to collect.',
    },
  };
  // where each ruin's first floor starts: one at Level 1, one at 3–5, one at 4–10
  const STARTS = [[1, 1], [3, 5], [4, 10]];
  const FLOORS = [3, 10];
  const STEP = [2, 3];

  let lib = null, reg = null;
  function library() {
    if (!lib) {
      lib = G.libraries.havenot;
      lib.hash = G.hashData(Object.fromEntries(G.SECTIONS.map((s) => [s, lib[s]])));
    }
    // the registry is read once everything is loaded (this pack goes last)
    if (!reg) reg = G.registryOf(LM);
    return lib;
  }

  // ------------------------------------------------------------ advanced generation (character creation)
  // What a new run's installations are made of. Each choice goes onto every brief of the run (kept with it).
  const GEN_FREQ = { probability_place_room_rare_twist: [0.04, 0.12, 0.3], probability_history_overlay: [0.12, 0.32, 0.6], probability_room_hazard: [0.1, 0.2, 0.4], probability_room_loot: [0.15, 0.28, 0.5] };
  HN.GEN_OPTIONS = {
    functional: { label: 'Functional rooms', options: [['', 'Standard (a quarter)'], ['0', 'None'], ['0.12', 'Few'], ['0.45', 'Many'], ['0.7', 'Most']] },
    library: { label: 'Settings libraries', options: [['', 'Both'], ['settings10', 'Ten Settings (library 1)'], ['settings10b', 'Settings Library B']] },
    mode: { label: 'Settings per installation', options: [['', 'Rolled'], ['single', 'One setting'], ['dominant-secondary', 'A main one and a second'], ['per-floor', 'One per floor'], ['mixed', 'Mixed within floors'], ['chaotic', 'Anything goes']] },
    dominant: { label: 'Main setting', options: null },
    era: { label: 'Era emphasis', options: [['', 'None'], ['Age of Wonders', 'Age of Wonders'], ['Age of War', 'Age of War']] },
    clusterStrength: { label: 'How rooms group', options: [['', 'Normal'], ['0.5', 'Loosely'], ['2', 'Tightly']] },
    density: { label: 'Furniture', options: [['', 'Rolled per room'], ['sparse', 'Sparse'], ['normal', 'Normal'], ['crowded', 'Crowded'], ['excessive', 'Excessive']] },
    hazards: { label: 'Hazards', options: [['', 'Standard (1 room in 5)'], ['0', 'Fewer'], ['2', 'More']], freq: 'probability_room_hazard' },
    loot: { label: 'Loot', options: [['', 'Standard'], ['0', 'Less'], ['2', 'More']], freq: 'probability_room_loot' },
    history: { label: 'Historical damage', options: [['', 'Standard (a third)'], ['0', 'Less'], ['2', 'More']], freq: 'probability_history_overlay' },
    anomalies: { label: 'HaveNot anomalies', options: [['', 'Standard'], ['0', 'Fewer'], ['2', 'More']], freq: 'probability_place_room_rare_twist' },
    preserveOld: { label: 'Generator', options: [['', 'With functional rooms'], ['1', 'Classic (as before them)']] },
  };
  /** Turn the panel's choices into brief fields. */
  HN.genBriefOptions = function (opts) {
    const o = opts || {}, b = {};
    if (o.preserveOld) return { preserveOld: true };
    if (o.functional !== undefined && o.functional !== '') b.functional = Number(o.functional) || false;
    if (o.library) b.library = o.library;
    if (o.mode || o.dominant) b.settings = Object.assign(o.mode ? { mode: o.mode } : {}, o.dominant ? { dominant: o.dominant } : {});
    if (o.era) b.era = o.era;
    if (o.clusterStrength) b.clusterStrength = Number(o.clusterStrength);
    if (o.density) b.density = o.density;
    for (const [key, d] of Object.entries(HN.GEN_OPTIONS)) {
      if (!d.freq || o[key] === undefined || o[key] === '') continue;
      (b.frequencies = b.frequencies || {})[d.freq] = GEN_FREQ[d.freq][Number(o[key])];
    }
    return b;
  };
  /** The "Advanced generation" section of character creation: choice.gen holds what's picked. */
  HN.genOptionsPanel = function (choice) {
    const h = (...a) => LM.ui.h(...a);
    const gen = (choice.gen = choice.gen || {});
    const C = G.contentOf(library(), gen.library || undefined);
    const sets = C ? Object.values(C.settings).sort((a, b) => (a.name < b.name ? -1 : 1)).map((x) => [x.id, x.name.split(/ - |: /)[0]]) : [];
    const field = (key) => {
      const d = HN.GEN_OPTIONS[key];
      const opts = key === 'dominant' ? [['', 'Rolled (by installation type)']].concat(sets) : d.options;
      const sel = h('select', { 'aria-label': d.label, style: 'width:100%;padding:5px 6px;background:rgba(0,0,0,0.35);color:inherit;border:1px solid rgba(255,255,255,0.2)' }, opts.map(([v, l]) => h('option', { value: v }, l)));
      sel.value = gen[key] || '';
      sel.addEventListener('change', () => {
        gen[key] = sel.value;
        if (key === 'library') gen.dominant = '';
        if (choice.rerender) choice.rerender();
      });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      return h('label', { style: 'display:block' }, h('span', { class: 'muted', style: 'display:block;font-size:12px' }, d.label), sel);
    };
    const classic = gen.preserveOld === '1';
    const keys = classic ? ['preserveOld'] : Object.keys(HN.GEN_OPTIONS);
    const det = h('details', { style: 'margin-top:14px' },
      h('summary', { style: 'cursor:pointer;font-weight:600' }, 'Advanced generation (the installations this run makes)'),
      h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px 14px;margin-top:8px' }, keys.map(field)),
      h('p', { class: 'muted', style: 'font-size:12px' }, 'Functional rooms come from the settings libraries: real furniture, devices, hazards and loot. Leave everything as it is for the usual mix.'));
    if (choice.genOpen) det.open = true;
    det.addEventListener('toggle', () => (choice.genOpen = det.open));
    return det;
  };

  HN.rollRuins = function (seed, opts) {
    const extra = HN.genBriefOptions(opts);
    const r = U.mulberry32(seed >>> 0);
    const int = (a, b) => a + Math.floor(r() * (b - a + 1));
    const types = Object.keys(library().types).sort();
    const starts = STARTS.slice();
    for (let i = starts.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [starts[i], starts[j]] = [starts[j], starts[i]];
    }
    const briefs = [Object.assign(G.clone(BUNKER), { seed: 'b' + seed }, G.clone(extra))];
    starts.forEach((range, i) => {
      const n = i + 1;
      const tl = int(range[0], range[1]);
      briefs.push(Object.assign({
        type: types[int(0, types.length - 1)], tl, tlStep: int(STEP[0], STEP[1]), floors: int(FLOORS[0], FLOORS[1]), anyFloors: true,
        size: r() < 0.3 ? 'small' : r() < 0.85 ? 'standard' : 'large',
        seed: 'r' + n + '-' + seed, slug: 'ruin' + n, title: 'Installation-Ruin ' + n,
      }, G.clone(extra)));
    });
    return { seed, briefs };
  };

  HN.buildRuins = function (ruins) {
    const L = library();
    const S = L.settings;
    const sites = [];
    for (const brief of ruins.briefs) {
      const res = G.generate(brief, L, reg);
      if (!res.ok) {
        console.warn('[hn-ruins] ' + brief.title + ' could not be generated: ' + (res.error ? res.error.message : res.problems.map((p) => p.text).join('; ')));
        continue;
      }
      const plan = res.plan;
      const levels = {};
      for (const floor of plan.floors) {
        const def = G.levelDef(plan, L, floor);
        const last = floor === plan.floors[plan.floors.length - 1];
        // what the levelling rules need: the floor's rooms are in def.rooms; the boss waits on the last floor
        if (last && plan.concept.boss) def.hn.gen.boss = plan.concept.boss.monster;
        def.floorLabel = plan.concept.title + ' · ' + floor.n;
        levels[floor.id] = def;
      }
      LM.definePack({ id: S.packPrefix + plan.slug, levels });
      if (LM.game && LM.game.levelOrder) for (const id of Object.keys(levels)) if (!LM.game.levelOrder.includes(id)) LM.game.levelOrder.push(id);
      const site = G.sitePin(plan, L);
      const [lo, hi] = site.pin.threat;
      if (!brief.replaces) site.pin.kind = G.typeOf(L, brief.type).name + ' · ' + plan.floors.length + ' floors · Threat ' + (lo === hi ? lo : lo + '–' + hi);
      HN.genSite(site);
      sites.push(site);
    }
    return sites;
  };

  // content libraries' floor and wall tiles are terrains (hn-gen-kit/materials.js), registered before any level names them
  for (const content of Object.values((G.libraries.havenot || {}).content || {})) for (const t of Object.values(content.tiles || {})) if (t.kind !== 'light' && HN.materialTerrain) HN.materialTerrain(t);
  /** A loot item's tier, from its category and value: ordinary salvage, decorative curiosity, useful equipment,
   *  valuable collectible, rare artifact, exceptional discovery (a setting's heart). */
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  HN.LOOT_TIERS = ['ordinary salvage', 'decorative curiosity', 'useful equipment', 'valuable collectible', 'rare artifact', 'exceptional discovery'];
  HN.lootTier = function (it) {
    const v = it.value || 0;
    if (v >= 160) return 'exceptional discovery';
    if (v >= 120) return 'rare artifact';
    if (v >= 100) return 'valuable collectible';
    if (['Medical', 'Military', 'Access', 'Component', 'Food', 'Data'].includes(it.cat)) return v < 30 ? 'ordinary salvage' : 'useful equipment';
    if (it.cat === 'Valuable') return 'decorative curiosity';
    return 'ordinary salvage';
  };
  // and their loot records are satchel items
  const ICON = { Access: ['K', '#e8c030'], Valuable: ['$', '#ffd060'], Data: ['D', '#7ad8ff'], Component: ['C', '#a8b8c8'], Medical: ['+', '#ff6a6a'], Food: ['F', '#c8a060'], Military: ['M', '#c84a3a'], Salvage: ['S', '#9a9a8a'] };
  for (const content of Object.values((G.libraries.havenot || {}).content || {})) {
    const defs = {};
    for (const L of Object.values(content.loot || {})) for (const it of L.items || []) {
      const room = content.rooms[L.room_id] || {};
      const set = content.settings[room.setting_id] || {};
      const ic = ICON[it.cat] || ICON.Salvage;
      const tier = HN.lootTier(it);
      defs[it.id] = { name: it.name, cat: it.cat, era: set.era || 'Age of Wonders', value: it.value, tier, rarity: /rare|exceptional/.test(tier) ? 'rare' : 'common', icon: { glyph: ic[0], color: ic[1] }, desc: cap(tier) + '. ' + it.name + ', from ' + (room.name ? 'a ' + room.name.toLowerCase() : 'a ruin') + (set.name ? ' in ' + set.name : '') + '. ' + (L.discovery ? 'It was ' + L.discovery.split(';')[0] + '.' : '') };
    }
    HN.defineItems(defs);
  }

  // ------------------------------------------------------------ a new character rolls a new set
  const createCharacter = HN.createCharacter;
  HN.createCharacter = function (game, choice) {
    const s = HN.st(game);
    // (the balance sim makes a character every trial and has no use for ruins)
    if (!choice.noRuins) {
      s.ruins = HN.rollRuins((choice.seed ^ Date.now()) >>> 0, choice.gen);
      HN.buildRuins(s.ruins);
    }
    return createCharacter.call(this, game, choice);
  };

  // ------------------------------------------------------------ a checkpoint brings its own back
  // The engine only offers Continue when the saved floor exists, so a run saved inside a ruin needs its
  // ruins rebuilt now, before the title screen reads the save.
  let pending = null;
  try {
    // the engine picks the game after the packs have loaded, so work its save key out from the manifest
    const info = LM.gameInfo || (LM.games && LM.games.havenot && LM.manifest.normalize(LM.games.havenot));
    const save = JSON.parse(localStorage.getItem(info ? LM.manifest.saveKey(info) : LM.saveKey()) || 'null');
    const st = save && save.player && save.player.data && save.player.data.hn;
    if (st && st.created) {
      // a run from before ruins existed gets a set of its own
      pending = st.ruins || HN.rollRuins((st.mutSeed || 1) >>> 0);
      HN.buildRuins(pending);
    }
  } catch (e) {
    console.warn('[hn-ruins] could not read the checkpoint: ' + e.message);
  }
  HN.onArrive((game, def, s) => {
    if (!s.created) return;
    if (!s.ruins && pending) s.ruins = pending;
    // every ruin's pin is on the map for this run, even in a run that was saved before they existed
    s.locs = s.locs || {};
    for (const b of (s.ruins && s.ruins.briefs) || []) {
      const id = b.replaces || b.slug;
      if (!s.locs[id]) s.locs[id] = 'known';
    }
  });
})();
