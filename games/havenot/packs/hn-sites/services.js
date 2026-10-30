/* HaveNot — packs/hn-sites/services.js
 * What the civilized places offer: vendors (buy and sell), medics, the home bunker's fixtures,
 * the Expedition Ledger and the trophy shelf. The places themselves are in places.js and levels/.
 *
 *   HN.VENDORS[id]  { name, kicker, text, stock: [{ kind: 'item' | 'weapon' | 'armor' | 'ammo', id, ammo, amount, price, if }],
 *                     buys: ['Salvage', 'Fuel cell', ...] (satchel categories it buys; gear is always bought at 10%) }
 *   HN.openVendor(game, id)   the buy / sell panel
 *   HN.MEDICS[id]   { name, minor, major, rad }  prices (rad: per 5 points of radiation, or null)
 *   HN.openMedic(game, id)
 *   HN.openLedger(game)       the Expedition Ledger (a panel over saved data)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;
  const lore = (t) => h('p', { class: 'lore' }, t);

  // ------------------------------------------------------------ vendors
  HN.VENDORS = {
    outpost: {
      name: 'Hesketh’s Counter', kicker: 'Out-rider Outpost · trader',
      text: (game) => (HN.flag(game, 'hnOutpostPowered') ? '“Power’s on, so the good shelf’s open. Don’t touch the radio.”' : '“Shells, cells, bandages. Anything fancier and you go find it yourself, like the rest of us.”'),
      buys: ['Salvage', 'Fuel cell', 'Junk', 'Medical', 'Expendable', 'Utility', 'Oddity', 'Add-on'],
      stock: [
        { kind: 'ammo', ammo: 'shells', amount: 20, price: 30 },
        { kind: 'ammo', ammo: 'cells', amount: 6, price: 60 },
        { kind: 'item', id: 'hn-health-charge', price: 30 },
        { kind: 'item', id: 'hn-anti-tox', price: 50 },
        { kind: 'item', id: 'hn-insulting-card', price: 15 },
        { kind: 'armor', id: 'hn-filter-mask', price: 150 },
        { kind: 'armor', id: 'hn-boots', price: 300 },
        { kind: 'weapon', id: 'hn-scattergun', price: 800 },
        // the good shelf, once the Outpost has power
        { kind: 'item', id: 'hn-health-pak', price: 200, if: (g) => HN.flag(g, 'hnOutpostPowered') },
        { kind: 'armor', id: 'hn-radar-goggles', price: 500, if: (g) => HN.flag(g, 'hnOutpostPowered') },
        { kind: 'item', id: 'hn-grenade', price: 60, if: (g) => HN.flag(g, 'hnOutpostPowered') },
      ],
    },
    bazaar: {
      name: 'The Bazaar', kicker: 'Boom-Town · licensed retail',
      text: () => '“Every sale is final, taxed, and recorded. Have a compliant day.”',
      buys: ['Salvage', 'Fuel cell', 'Junk', 'Medical', 'Expendable', 'Utility', 'Oddity', 'Add-on', 'Information'],
      stock: [
        { kind: 'item', id: 'hn-health-charge', price: 30 },
        { kind: 'item', id: 'hn-health-pak', price: 200 },
        { kind: 'item', id: 'hn-anti-tox', price: 50 },
        { kind: 'item', id: 'hn-cookies', price: 250 },
        { kind: 'item', id: 'hn-insulting-card', price: 15 },
        { kind: 'item', id: 'hn-desktop-defender', price: 400 },
        { kind: 'item', id: 'hn-mw-scanner', price: 1500 },
        { kind: 'item', id: 'hn-grenade', price: 60 },
      ],
    },
    guns: {
      name: 'Bang & Sons, Licensed Armaments', kicker: 'Boom-Town · weapon shop',
      text: () => '“We sell, we buy, we don’t ask. Well. We ask for the permit fee.”',
      buys: [],
      stock: [
        { kind: 'ammo', ammo: 'shells', amount: 20, price: 30 },
        { kind: 'ammo', ammo: 'cells', amount: 6, price: 60 },
        { kind: 'weapon', id: 'hn-scattergun', price: 800 },
        { kind: 'weapon', id: 'hn-gauss', price: 2500 },
        { kind: 'weapon', id: 'hn-plasma-musket', price: 3000 },
        { kind: 'armor', id: 'hn-vest', price: 400 },
        { kind: 'armor', id: 'hn-plate', price: 1200 },
        { kind: 'armor', id: 'hn-coltron', price: 1000 },
        { kind: 'armor', id: 'hn-bulletscreen', price: 1000 },
      ],
    },
  };

  const stockName = (e) => {
    if (e.kind === 'item') return HN.ITEMS[e.id].name;
    if (e.kind === 'ammo') return e.amount + ' ' + (LM.AMMO_NAMES[e.ammo] || e.ammo).toLowerCase();
    return LM.get(e.kind === 'weapon' ? 'weapons' : 'armor', e.id).name;
  };
  const stockDesc = (e) => {
    if (e.kind === 'item') return HN.ITEMS[e.id].desc;
    if (e.kind === 'ammo') return 'Ammunition. Nobody out here gives it away.';
    const d = LM.get(e.kind === 'weapon' ? 'weapons' : 'armor', e.id);
    return d.desc || '';
  };
  const owns = (P, e) => (e.kind === 'weapon' ? P.weapons.includes(e.id) : e.kind === 'armor' ? Object.values(P.equip).includes(e.id) || P.bag.includes(e.id) : false);

  /** What the player could sell here: satchel items in the vendor's categories, and gear (at 10%). */
  function sellables(game, v) {
    const P = game.player, s = HN.st(game), out = [];
    for (const [id, n] of Object.entries(s.inv)) {
      const d = HN.ITEMS[id];
      if (!d || !n || d.unsellable || !v.buys.includes(d.cat)) continue;
      const price = HN.sellPrice('item', id);
      if (price > 0) out.push({ kind: 'item', id, n, price, name: d.name });
    }
    if (P.weapons.length > 1) for (const id of P.weapons) {
      const price = HN.sellPrice('weapon', id);
      if (price) out.push({ kind: 'weapon', id, n: 1, price, name: LM.get('weapons', id).name });
    }
    for (const id of P.bag) {
      const price = HN.sellPrice('armor', id);
      if (price) out.push({ kind: 'armor', id, n: 1, price, name: LM.get('armor', id).name + ' (spare)', spare: true });
    }
    for (const [slot, id] of Object.entries(P.equip)) {
      if (!id) continue;
      const price = HN.sellPrice('armor', id);
      if (price) out.push({ kind: 'armor', id, slot, n: 1, price, name: LM.get('armor', id).name + ' (worn)' });
    }
    return out;
  }
  function buy(game, e) {
    const P = game.player;
    if (P.gold < e.price) return false;
    P.gold -= e.price;
    if (e.kind === 'item') HN.give(game, e.id, 1, { silent: true });
    else if (e.kind === 'ammo') game.grant({ type: 'ammo', ammo: e.ammo, amount: e.amount });
    else game.grant({ type: e.kind, id: e.id });
    LM.audio.play('coin');
    game.toast('Bought: ' + stockName(e) + ' (−' + e.price + 'c)', 'good');
    return true;
  }
  function sell(game, o) {
    const P = game.player, s = HN.st(game);
    if (o.kind === 'item') {
      if (!HN.take(game, o.id, 1)) return false;
    } else if (o.kind === 'weapon') {
      if (P.weapons.length <= 1) return false;
      P.weapons = P.weapons.filter((w) => w !== o.id);
      P.weaponIdx = Math.min(P.weaponIdx, P.weapons.length - 1);
    } else if (o.spare) {
      const i = P.bag.indexOf(o.id);
      if (i < 0) return false;
      P.bag.splice(i, 1);
    } else {
      P.equip[o.slot] = null;
    }
    P.statsDirty = true;
    P.gold += o.price;
    s.tally.sold += o.price;
    LM.audio.play('coin');
    game.toast('Sold: ' + o.name + ' (+' + o.price + 'c)', 'good');
    return true;
  }
  HN.openVendor = function (game, id) {
    const v = HN.VENDORS[id];
    const P = game.player;
    let tab = 'buy';
    const render = () => {
      const tabs = h('div', { class: 'hn-choice', style: 'display:grid;grid-template-columns:1fr 1fr' },
        ['buy', 'sell'].map((k) => h('button', { type: 'button', class: k === tab ? 'on' : '', on: { click: () => { tab = k; rerender(); } } }, h('strong', null, k === 'buy' ? 'Buy' : 'Sell'), h('span', null, k === 'buy' ? 'You have ' + P.gold + ' credits' : v.buys.length ? 'Gear at a tenth of its value; salvage at its price' : 'Gear only, at a tenth of its value'))));
      let rows;
      if (tab === 'buy') {
        rows = v.stock.filter((e) => !e.if || e.if(game)).map((e) => {
          const have = owns(P, e);
          return h('div', { class: 'hn-row' },
            h('span', { class: 'hn-pill' }, e.price + 'c'),
            h('div', null, h('strong', null, stockName(e)), h('div', { class: 'inv-desc' }, stockDesc(e))),
            h('div', { class: 'btns' }, h('button', { class: 'btn small', type: 'button', disabled: P.gold < e.price || have, on: { click: () => { buy(game, e); rerender(); } } }, have ? 'Owned' : 'Buy')));
        });
      } else {
        const list = sellables(game, v);
        rows = list.length ? list.map((o) => h('div', { class: 'hn-row' },
          h('span', { class: 'hn-pill' }, '+' + o.price + 'c'),
          h('div', null, h('strong', null, o.name + (o.n > 1 ? ' × ' + o.n : '')), h('span', { class: 'muted' }, o.kind === 'item' ? HN.ITEMS[o.id].cat : 'Gear: ' + (o.kind === 'weapon' ? HN.WEAPON_VALUE[o.id] : HN.ARMOR_VALUE[o.id]) + 'c new, a tenth used')),
          h('div', { class: 'btns' }, h('button', { class: 'btn small', type: 'button', on: { click: () => { sell(game, o); rerender(); } } }, 'Sell one')))) : [h('p', { class: 'muted' }, 'Nothing they want. (Your last weapon isn’t for sale.)')];
      }
      return h('div', { class: 'hn-panel' }, lore(typeof v.text === 'function' ? v.text(game) : v.text), tabs, rows);
    };
    let panel;
    const rerender = () => {
      const body = panel.querySelector('.panel-body');
      const y = body.scrollTop;
      body.replaceChildren(render());
      body.scrollTop = y;
    };
    panel = LM.ui.open({ kicker: v.kicker, title: v.name, body: render(), wide: true, actions: [{ label: 'Done', primary: true }] });
  };

  // ------------------------------------------------------------ medics
  // the medical station at home: a full heal for about what a pack of Placebo costs at a PHARM machine (15c)
  HN.HOME_HEAL_PRICE = 15;
  HN.MEDICS = {
    outpost: { name: 'The Outpost medic', kicker: 'Out-rider Outpost', minor: 50, major: 220, rad: null, text: '“Hold still. If you’ve got radiation, I can’t help with that: Boom-Town’s clinic has the machine.”' },
    clinic: { name: 'Boom-Town Clinic', kicker: 'Boom-Town · Wellness & Compliance', minor: 40, major: 160, rad: 25, text: '“Please take a number. Your number is 1. Please wait.” (There is nobody else waiting.)' },
  };
  HN.openMedic = function (game, id) {
    const m = HN.MEDICS[id];
    const P = game.player, s = HN.st(game);
    const render = () => {
      const max = P.stats().maxHp, hurt = Math.ceil(max - P.hp);
      const radCost = m.rad ? Math.ceil(s.rad / 5) * m.rad : 0;
      return h('div', { class: 'hn-panel' }, lore(m.text),
        h('p', { class: 'muted' }, 'Health ' + Math.ceil(P.hp) + ' / ' + max + (s.rad ? ' · radiation ' + Math.round(s.rad) + ' (−' + HN.radLoss(s) + ' max health)' : '') + ' · ' + P.gold + ' credits'),
        h('div', { class: 'hn-row' }, h('span', { class: 'hn-pill' }, m.minor + 'c'), h('div', null, h('strong', null, 'Patch me up'), h('span', { class: 'muted' }, 'A minor heal: a third of your health.')),
          h('div', { class: 'btns' }, h('button', { class: 'btn small', type: 'button', disabled: !hurt || P.gold < m.minor, on: { click: () => { P.gold -= m.minor; HN.minorHeal(game); LM.audio.play('heal'); rerender(); } } }, 'Pay'))),
        h('div', { class: 'hn-row' }, h('span', { class: 'hn-pill' }, m.major + 'c'), h('div', null, h('strong', null, 'The works'), h('span', { class: 'muted' }, 'A major heal: all of it.')),
          h('div', { class: 'btns' }, h('button', { class: 'btn small', type: 'button', disabled: !hurt || P.gold < m.major, on: { click: () => { P.gold -= m.major; HN.majorHeal(game); LM.audio.play('heal'); rerender(); } } }, 'Pay'))),
        m.rad ? h('div', { class: 'hn-row' }, h('span', { class: 'hn-pill' }, (radCost || m.rad) + 'c'), h('div', null, h('strong', null, 'Radiation treatment'), h('span', { class: 'muted' }, m.rad + 'c for every 5 points. Clears it all and gives back the health it took.')),
          h('div', { class: 'btns' }, h('button', { class: 'btn small', type: 'button', disabled: !s.rad || P.gold < radCost, on: { click: () => { P.gold -= radCost; s.rad = 0; P.statsDirty = true; LM.audio.play('heal'); game.toast('The machine hums. Your fillings stop tingling.', 'good'); rerender(); } } }, 'Pay'))) : null);
    };
    let panel;
    const rerender = () => panel.querySelector('.panel-body').replaceChildren(render());
    panel = LM.ui.open({ kicker: m.kicker, title: m.name, body: render(), actions: [{ label: 'Done', primary: true }] });
  };

  // ------------------------------------------------------------ the Expedition Ledger
  /** World changes the ledger lists (and the epilogue reads the same flags). */
  HN.WORLD_CHANGES = [
    { flag: 'hnOutpostPowered', text: 'The Out-rider Outpost has power again; its good shelf is open.' },
    { flag: 'hnBoomPass', text: 'You hold a Boom-Town pass.' },
    { flag: 'hnSphinxOk', text: 'The agency’s Sphinx Gun stood down for you.' },
    { flag: 'hnSphinxDead', text: 'The agency’s Sphinx Gun is scrap.' },
    { flag: 'hnTrapsOff', text: 'The agency’s crossing traps are shut down, building-wide.' },
    { flag: 'hnBayOff', text: 'The agency’s Robot Repair Bay is shut down: no more rebuilt robots.' },
    { flag: 'hnAdsSilent', text: 'The agency’s hypnotic ad system is silent; the near area’s screens are dark.' },
    { flag: 'hnCoreSeized', text: 'You carry the agency’s inner core.' },
    { flag: 'hnBoltHoleFound', text: 'You found the Bolt Hole.' },
  ];
  HN.SYSTEMS = [
    { flag: 'hnSec1', text: 'Floor 1: the security door to the executive suite' },
    { flag: 'hnSec2', text: 'Floor 2: the security door to the prototype vault' },
    { flag: 'hnSec3', text: 'Floor 3: the security door to the armory' },
    { flag: 'hnTerm1', text: 'Floor 1: the office trap terminal' },
    { flag: 'hnMistOff', text: 'Floor 2: the toxic mist generators' },
    { flag: 'hnTrapsOff', text: 'Floor 3: the Security Station (traps, building-wide)' },
    { flag: 'hnBayOff', text: 'Floor 3: the Robot Repair Bay' },
  ];
  HN.openLedger = function (game) {
    const s = HN.st(game), P = game.player;
    const sec = (title, rows, empty) => h('div', null, h('h3', null, title), rows.length ? h('ul', { class: 'hn-loc-list' }, rows.map((r) => h('li', null, r))) : h('p', { class: 'muted' }, empty));
    const places = HN.LOCATIONS.filter((l) => HN.locState(game, l.id) !== 'hidden').map((l) => l.name + ': ' + ({ known: 'known', visited: 'visited', locked: 'out of reach' })[HN.locState(game, l.id)]);
    const floors = Object.keys(s.visits).map((id) => LM.find('levels', id)).filter((d) => d && d.hn && d.hn.floor).map((d) => d.hn.floor);
    const treasure = s.trophies.map((id) => (HN.ITEMS[id] || { name: id }).name);
    const systems = HN.SYSTEMS.filter((x) => HN.flag(game, x.flag)).map((x) => x.text);
    const rumors = s.ledger.filter((l) => l.kind === 'rumor').map((l) => l.text);
    const clues = s.ledger.filter((l) => l.kind === 'clue' || l.kind === 'map').map((l) => l.text);
    const changes = HN.WORLD_CHANGES.filter((x) => HN.flag(game, x.flag)).map((x) => x.text);
    const obj = Object.entries(HN.OBJECTIVES).filter(([id]) => s.objectives[id]).map(([id, o]) => (s.objectives[id] === 'done' ? '✓ ' : '○ ') + o.name + ': ' + o.text);
    LM.ui.open({
      kicker: s.name + ' · ' + s.mission + ' mission' + (s.mission === 1 ? '' : 's'),
      title: 'Expedition Ledger',
      wide: true,
      body: h('div', { class: 'hn-panel hn-cols' },
        h('div', null,
          sec('Objectives', obj, 'None yet.'),
          sec('Known destinations', places, '—'),
          sec('Floors found', floors, 'None yet.'),
          sec('Notable treasure', treasure, 'Nothing worth a shelf yet.'),
          sec('Security systems disabled', systems, 'None yet.')),
        h('div', null,
          sec('Rumors', rumors, 'Ask around at the Outpost.'),
          sec('Clues', clues, 'None yet.'),
          sec('Standing', [HN.standingWord(s.standing) + ' in Boom-Town (' + s.standing + ')'].concat(s.standingLog.slice(-4)), ''),
          sec('World changes', changes, 'The near area is as you found it.'),
          h('p', { class: 'muted' }, 'Credits ' + P.gold + ' · radiation ' + Math.round(s.rad) + ' · kills ' + s.tally.kills))),
      actions: [{ label: 'Close', primary: true }],
    });
  };

  // ------------------------------------------------------------ home fixtures
  const screen = (g, w, hh, c) => {
    g.fillStyle = '#16181a';
    g.fillRect(-w / 2 - 1, -hh / 2 - 1, w + 2, hh + 2);
    g.fillStyle = c;
    g.fillRect(-w / 2, -hh / 2, w, hh);
  };
  const items = {
    'hn-comms': {
      name: 'Communications terminal', radius: 10, solid: true, mapColor: '#5ab8e8',
      light: { color: '#5ab8e8', radius: 80, intensity: 0.4, flicker: 0.06 },
      interact: {
        prompt: 'Use the communications terminal',
        use(it, game) {
          const s = HN.st(game);
          const lines = [
            'OUT-RIDER OUTPOST: “Hesketh here. Shells, cells, a medic, rumors, and we buy fuel cells. Our power’s failing, if you come across anything that holds a charge.”',
            'BOOM-TOWN AUTOMATED GREETER: “Welcome to Boom-Town, where opportunity is mandatory! Entry requires a 100-credit visitor pass. Inside: the Bazaar, our Clinic (now treating radiation!), and Bang & Sons Armaments.”',
            HN.flag(game, 'hnAdsSilent') ? 'STATIC: For once, no ads on the band. Just wind.' : 'STATIC, then a jingle: “DYNAMO-FIZZ! Feel the buzz!” It comes from the direction of the Anomalous Structure.',
          ];
          LM.ui.open({ kicker: 'Home', title: 'Communications terminal', body: h('div', { class: 'hn-panel' }, lines.map(lore), h('p', { class: 'muted' }, 'Mission ' + s.mission + '. The door to the near-area map is at the end of the hall.')), actions: [{ label: 'Close', primary: true }] });
          HN.objective(game, 'access', 'open');
        },
      },
      draw(g) { screen(g, 20, 14, '#1e3a4a'); },
      drawGlow(g, it, t) { G.glow(g, 0, 0, 14, '#5ab8e8', 0.4 + 0.1 * Math.sin(t * 2)); },
    },
    'hn-home-med': {
      name: 'Medical station', radius: 7, wallMounted: true, shadow: false, mapColor: '#ff6a6a',
      light: { color: '#ff6a6a', radius: 60, intensity: 0.35, flicker: 0.04 },
      interact: {
        prompt: 'Use the medical station',
        use(it, game) {
          const s = HN.st(game), P = game.player;
          const price = HN.HOME_HEAL_PRICE, max = P.stats().maxHp;
          const hurt = P.hp < max, broke = P.gold < price;
          LM.ui.open({
            kicker: 'Home', title: 'Medical station',
            body: h('div', { class: 'hn-panel' }, lore('An old wall unit that still knows what a person is supposed to look like. It runs on scavenged gauze, glue and dose cartridges, and it heals you all the way for about what a pack of Placebo costs.'),
              h('p', { class: 'muted' }, 'Health ' + Math.ceil(P.hp) + ' / ' + max + ' · ' + P.gold + ' credits · a full heal is ' + price + 'c' + (s.rad ? ' · it can’t treat radiation (Boom-Town’s clinic can)' : ''))),
            actions: [
              { label: !hurt ? 'Full heal (you’re fine)' : broke ? 'Full heal (' + price + 'c: not enough credits)' : 'Full heal (' + price + 'c)', primary: true, disabled: !hurt || broke, onClick: () => { P.gold -= price; HN.majorHeal(game); LM.audio.play('heal'); game.toast('Healed to full: ' + Math.ceil(P.hp) + ' / ' + max + ' (−' + price + 'c)', 'good'); } },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        g.fillStyle = '#1a1a1c';
        g.fillRect(-8, -6, 16, 9);
        g.fillStyle = '#e8e0d8';
        g.fillRect(-7, -5, 14, 7);
        g.fillStyle = '#d23a3a';
        g.fillRect(-1, -4.5, 2, 6);
        g.fillRect(-3, -2.5, 6, 2);
      },
    },
    'hn-retire': {
      name: 'Retirement terminal', radius: 9, solid: true, mapColor: '#e8a23a',
      interact: {
        prompt: 'Use the retirement terminal',
        use(it, game) {
          const s = HN.st(game);
          LM.ui.open({
            kicker: 'Home', title: 'Hang up the satchel?',
            body: h('div', { class: 'hn-panel' }, lore('An old pension terminal someone rewired to print a single line: YOUR SERVICE IS APPRECIATED. Retiring ends this run and writes down how ' + s.name + '’s story went.'), h('p', { class: 'muted' }, 'This can’t be undone. The checkpoint is cleared.')),
            actions: [{ label: 'Retire', onClick: () => setTimeout(() => HN.endRun(game, 'retire'), 0) }, { label: 'Not yet', primary: true, quiet: true }],
          });
        },
      },
      draw(g) {
        screen(g, 16, 16, '#3a2a14');
        g.fillStyle = '#e8a23a';
        g.fillRect(-5, -2, 10, 1.4);
      },
      drawGlow(g, it, t) { G.glow(g, 0, 0, 10, '#e8a23a', 0.3 + 0.1 * Math.sin(t * 1.4)); },
    },
    'hn-ledger-desk': {
      name: 'Ledger desk', radius: 12, solid: 'rect', mapColor: '#c8a060',
      init(it) { it.box = [26, 16]; },
      interact: { prompt: 'Read the Expedition Ledger', use: (it, game) => HN.openLedger(game) },
      draw(g) {
        g.fillStyle = '#2a1e14';
        g.fillRect(-14, -9, 28, 18);
        g.fillStyle = '#6a4a2a';
        g.fillRect(-13, -8, 26, 16);
        g.fillStyle = '#e8dcc0';
        g.fillRect(-6, -5, 12, 9);
        g.fillStyle = '#6a5a4a';
        for (let i = 0; i < 4; i++) g.fillRect(-4.5, -3.5 + i * 2, 9, 0.6);
      },
    },
    'hn-trophy-shelf': {
      name: 'Trophy shelf', radius: 7, wallMounted: true, shadow: false, mapColor: '#f2c96b',
      interact: {
        prompt: 'Look at the trophy shelf',
        use(it, game) {
          const s = HN.st(game);
          const rows = s.trophies.map((id) => HN.ITEMS[id]).filter(Boolean).map((d) => h('div', { class: 'hn-row' }, HN.itemIcon ? HN.itemIcon(d) : h('span', { class: 'hn-pill' }, '★'), h('div', null, h('strong', null, d.name), h('div', { class: 'inv-desc' }, d.desc))));
          LM.ui.open({ kicker: 'Home', title: 'Trophy shelf', wide: true, body: h('div', { class: 'hn-panel' }, rows.length ? rows : lore('A bare shelf, dusted every week anyway. The good stuff is still out there.')), actions: [{ label: 'Close', primary: true }] });
        },
      },
      draw(g, it, t, game) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        g.fillStyle = '#4a3020';
        g.fillRect(-12, -3, 24, 4);
        const n = game && game.player ? Math.min(6, HN.st(game).trophies.length) : 0;
        for (let i = 0; i < n; i++) G.circle(g, -9 + i * 3.6, -5, 1.4, '#f2c96b');
      },
    },
  };

  LM.definePack({ id: 'hn-sites', items });
})();
