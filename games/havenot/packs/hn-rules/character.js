/* HaveNot — packs/hn-rules/character.js
 * Character creation: origin (Human, Mutant Hyena, Random Mutant), a gear package and a mission kit.
 * It opens on the home base the first time a new run arrives there (LM.ui.open, not dismissable),
 * and every choice is saved in P.data.hn. The stats reach the engine as the Satchel gadget's mods.
 *
 *   Speed     ground speed (+10 per point over 3)
 *   Sense     marks valuables and threats (4 + Sense) tiles away, through walls
 *   Physical  max health (100 at 3, ±20 a point) and melee damage (8 at 3, ±2 a point)
 *   Mental    added to every hack roll
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;

  HN.ORIGINS = {
    human: {
      name: 'Human', stats: { speed: 3, sense: 3, physical: 3, mental: 3 },
      text: 'The average, which out here is an achievement. 100 health, melee 8, nothing to apologize for.',
    },
    hyena: {
      name: 'Mutant Hyena', stats: { speed: 6, sense: 6, physical: 2, mental: 2 }, bite: 'bite: Bleed',
      text: 'An Evolved Hyena: smaller, weaker, faster, sharper. 80 health, a bite for 6 that makes things bleed, +30 ground speed, and you sense things 10 tiles away.',
    },
    mutant: {
      name: 'Random Mutant', stats: { speed: 3, sense: 3, physical: 3, mental: 3 },
      text: 'Human-ish, plus one to three mutations from the wastes. Some help, some don’t. You see the roll, and you can roll again once.',
    },
  };
  HN.MUTATIONS = {
    chitin: { name: 'Chitin Plates', desc: 'Natural armor 10%, Speed −1.', apply: (s) => { s.natural.armor += 0.1; s.stats.speed -= 1; } },
    arm: { name: 'Third Arm', desc: 'Melee +4.', apply: (s) => { s.natural.melee += 4; } },
    eyes: { name: 'Stalk Eyes', desc: 'Sense +3.', apply: (s) => { s.stats.sense += 3; } },
    lungs: { name: 'Bellows Lungs', desc: 'Speed +2.', apply: (s) => { s.stats.speed += 2; } },
    stunted: { name: 'Stunted', desc: 'Physical −1, Speed +1.', apply: (s) => { s.stats.physical -= 1; s.stats.speed += 1; } },
    cranium: { name: 'Bulging Cranium', desc: 'Mental +2, Physical −1.', apply: (s) => { s.stats.mental += 2; s.stats.physical -= 1; } },
    glow: { name: 'Glowing Skin', desc: 'You light up the dark (+90 light reach), Sense −1.', apply: (s) => { s.natural.light += 90; s.stats.sense -= 1; } },
    quills: { name: 'Quills', desc: 'Your melee makes things bleed.', apply: (s) => { s.bite = 'quills: Bleed'; } },
    acid: { name: 'Acid Spit', desc: 'Your melee spits acid, which ignores armor.', apply: (s) => { s.bite = 'spit: Acid'; } },
    skull: { name: 'Thick Skull', desc: 'Physical +1, Mental −1.', apply: (s) => { s.stats.physical += 1; s.stats.mental -= 1; } },
    twitchy: { name: 'Twitchy', desc: 'Speed +2, Mental −1.', apply: (s) => { s.stats.speed += 2; s.stats.mental -= 1; } },
    echo: { name: 'Echolocation', desc: 'Sense +2.', apply: (s) => { s.stats.sense += 2; } },
    brittle: { name: 'Brittle Bones', desc: 'Physical −1.', apply: (s) => { s.stats.physical -= 1; } },
  };
  HN.GEAR = {
    handgun: { name: 'Handgun + light ballistic vest', text: 'The frontier handgun never runs out of ammunition (the one exception out here). The vest takes 15% off every hit.', weapons: ['hn-handgun'], armor: ['hn-vest'], ammo: {} },
    scatter: { name: 'Scattergun + heavy chest plate', text: 'Magazine of 8, two-second reload, heavy damage up close, 80 shells to start. The plate halves the hits that land on it, about six in ten.', weapons: ['hn-scattergun'], armor: ['hn-plate'], ammo: { shells: 80 } },
    gauss: { name: 'Gauss pistol, no armor', text: 'Long range, heavy damage, no ammunition. Six shots in three seconds overheat it for three. Nothing between you and the world.', weapons: ['hn-gauss'], armor: [], ammo: {} },
  };
  HN.KITS = {
    med: { name: 'Med-kit', text: 'Three minor heals every mission, on H. Each heals a third of your health.' },
    hack: { name: 'Hacker kit', text: '+4 on every hack, and one automatic success every mission, offered as a button.' },
    grenade: { name: 'Grenades', text: 'Three grenades every mission, thrown with G. Heavy area damage.' },
  };
  const NAMES = ['Dusty', 'Rook', 'Juniper', 'Sable', 'Tamsin', 'Cobb', 'Wren', 'Ash', 'Marlow', 'Vesper', 'Kestrel', 'Bram'];

  /** Roll 1–3 mutations from a seed: the same seed always gives the same roll. */
  HN.rollMutations = function (seed) {
    const r = U.mulberry32(seed >>> 0);
    const n = 1 + Math.floor(r() * 3);
    const pool = Object.keys(HN.MUTATIONS);
    const out = [];
    while (out.length < n) {
      const id = pool[Math.floor(r() * pool.length)];
      if (!out.includes(id)) out.push(id);
    }
    return out;
  };
  /** Work the stats out from the origin and mutations (clamped 1–7). */
  HN.applyCharacterStats = function (s) {
    const o = HN.ORIGINS[s.origin];
    s.stats = Object.assign({}, o.stats);
    s.natural = { armor: 0, melee: 0, light: 0 };
    s.bite = o.bite || null;
    if (s.origin === 'mutant') for (const m of s.mutations) HN.MUTATIONS[m].apply(s);
    for (const k of Object.keys(s.stats)) s.stats[k] = U.clamp(s.stats[k], 1, 7);
  };
  /** Hand over the chosen gear and kit, and make the character real. */
  HN.createCharacter = function (game, choice) {
    const P = game.player, s = HN.st(game);
    Object.assign(s, { name: choice.name || 'Scavenger', origin: choice.origin, gear: choice.gear, kit: choice.kit, mutations: choice.origin === 'mutant' ? choice.mutations.slice() : [], mutSeed: choice.seed || 0 });
    HN.applyCharacterStats(s);
    const pkg = HN.GEAR[s.gear];
    P.weapons = pkg.weapons.slice();
    P.weaponIdx = 0;
    for (const a of pkg.armor) P.equipArmor(a);
    for (const [k, n] of Object.entries(pkg.ammo)) P.ammo[k] = n;
    const want = ['hn-satchel', 'hn-melee', 'hn-grenade'].concat(s.kit === 'med' ? ['hn-medkit'] : []);
    for (const g of want) if (!P.gadgets.includes(g)) P.gadgets.push(g);
    s.created = true;
    s.kitLeft = HN.kitFor(s);
    s.locs = Object.assign({}, HN.START_LOCS || {});
    P.statsDirty = true;
    P.hp = P.stats().maxHp;
    HN.objective(game, 'silent', 'open');
    HN.objective(game, 'access', 'open');
    LM.audio.play('heal');
  };

  HN.openCreation = function (game) {
    const choice = { origin: 'human', gear: 'handgun', kit: 'med', name: U.pick(NAMES), seed: (Math.random() * 1e9) | 0, rerolled: false, mutations: [] };
    choice.mutations = HN.rollMutations(choice.seed);
    const preview = () => {
      const s = { origin: choice.origin, mutations: choice.mutations };
      HN.applyCharacterStats(s);
      return s;
    };
    const card = (group, id, def) => h('button', {
      type: 'button', class: choice[group] === id ? 'on' : '',
      on: { click: () => { choice[group] = id; rerender(); } },
    }, h('strong', null, def.name), h('span', null, def.text));
    const render = () => {
      const p = preview();
      const statLine = 'Speed ' + p.stats.speed + ' · Sense ' + p.stats.sense + ' · Physical ' + p.stats.physical + ' · Mental ' + p.stats.mental +
        ' → ' + (100 + (p.stats.physical - 3) * 20) + ' health, melee ' + (8 + (p.stats.physical - 3) * 2 + p.natural.melee) + (p.bite ? ' (' + p.bite + ')' : '') + (p.natural.armor ? ', natural armor ' + Math.round(p.natural.armor * 100) + '%' : '');
      const nameIn = h('input', { type: 'text', value: choice.name, maxlength: 24, 'aria-label': 'Name', style: 'width:100%;box-sizing:border-box;padding:8px 10px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.2);color:inherit;font:600 15px/1.2 var(--font-head)' });
      nameIn.addEventListener('input', () => (choice.name = nameIn.value.trim() || 'Scavenger'));
      nameIn.addEventListener('keydown', (e) => e.stopPropagation());
      return h('div', { class: 'hn-panel' },
        h('p', { class: 'lore' }, 'The bunker door is behind you, the wastes ahead. Somewhere out there the old world left things lying around that nobody alive can make. Who goes to get them?'),
        h('h3', null, 'Name'), nameIn,
        h('h3', null, '1 · Origin'), h('div', { class: 'hn-choice' }, Object.entries(HN.ORIGINS).map(([id, d]) => card('origin', id, d))),
        choice.origin === 'mutant' ? h('div', { class: 'hn-risk', style: 'border-left-color:#b8ff4a;background:rgba(184,255,74,0.07)' },
          h('strong', null, 'Your mutations: '), choice.mutations.map((m) => h('span', { class: 'hn-pill', title: HN.MUTATIONS[m].desc }, HN.MUTATIONS[m].name + ' (' + HN.MUTATIONS[m].desc + ')')),
          h('div', null, h('button', { class: 'btn small', type: 'button', disabled: choice.rerolled, on: { click: () => { choice.rerolled = true; choice.seed = (choice.seed * 7919 + 104729) >>> 0; choice.mutations = HN.rollMutations(choice.seed); rerender(); } } }, choice.rerolled ? 'Rerolled (no more)' : 'Roll again (once)'))) : null,
        h('p', { class: 'muted' }, statLine),
        h('h3', null, '2 · Gear package'), h('div', { class: 'hn-choice' }, Object.entries(HN.GEAR).map(([id, d]) => card('gear', id, d))),
        h('h3', null, '3 · Mission kit (refills every time you leave home)'), h('div', { class: 'hn-choice' }, Object.entries(HN.KITS).map(([id, d]) => card('kit', id, d))));
    };
    let panel;
    const rerender = () => {
      const body = panel.querySelector('.panel-body');
      const y = body.scrollTop;
      body.replaceChildren(render());
      body.scrollTop = y;
    };
    panel = LM.ui.open({
      kicker: 'New scavenger', title: 'Who are you?', body: render(), wide: true, dismissable: false,
      actions: [{ label: 'Step outside', primary: true, onClick: () => { HN.createCharacter(game, choice); setTimeout(() => HN.homeWelcome && HN.homeWelcome(game), 50); } }],
    });
  };

  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player) return;
    if (!HN.st(game).created && game.level.def.hnCreation) setTimeout(() => { if (LM.game === game && !HN.st(game).created) HN.openCreation(game); }, 400);
  });
})();
