/* HaveNot — packs/hn-world/map.js
 * The near-area map. The level 'hn-area-map' is a tiny room you never see: while you're on it, a drawn
 * map of the near area covers the screen, with a pin for every place. The pins are data (HN.LOCATIONS),
 * separate from the drawing, so the procedural map can be swapped for a painted image later: each pin
 * has its x, y on a 1000 × 640 sheet.
 *
 * A pin's state (HN.locState): 'hidden' (not drawn), 'known' (you can go), 'visited', or 'locked'
 * (drawn, with its description, but the way there isn't open in this slice). Saved in P.data.hn.locs.
 * A pin's description grows as you learn more: each entry of `more` is shown once its flag is set.
 *
 * Missions: arriving on the map from home starts a mission (the kit refills); arriving home ends it.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;

  // ------------------------------------------------------------ the pins (x, y on a 1000 × 640 sheet)
  HN.LOCATIONS = [
    {
      id: 'home', level: 'hn-home', name: 'Home', kind: 'Your bunker', x: 500, y: 330, state: 'known', art: 'home',
      desc: 'A Burner-era bunker with a door that still seals, a bed, and a medical station that has seen better centuries.',
      services: ['Rest', 'One major and two minor heals in the medical station (they never refill)', 'The Expedition Ledger', 'The retirement terminal'],
      dangers: [],
    },
    {
      id: 'outpost', level: 'hn-outpost', name: 'Out-rider Outpost', kind: 'Scout station', x: 330, y: 220, state: 'known', art: 'outpost',
      desc: 'Part bunker, part mobile home, ringed with radar dishes and antennas. The Outriders patrol the wastes and sell what they don’t need.',
      more: [{ flag: 'hnOutpostPowered', text: 'Since you fixed their power problem the dishes turn again, and the stock is better.' }],
      services: ['Trader: buys and sells', 'Medic', 'Rumors'],
      dangers: ['Opinions about the weather'],
    },
    {
      id: 'boomtown', level: 'hn-boomtown', name: 'Boom-Town', kind: 'Corporate town', x: 720, y: 200, state: 'known', art: 'boomtown',
      desc: 'A walled company town under a water tower painted with a smiling logo. Security at the gate. Entry costs a 100-credit pass.',
      more: [
        { flag: 'hnBoomPass', text: 'You have a pass. Inside: the Bazaar, a clinic that treats radiation, and a weapon shop.' },
        { flag: 'hnAdsSilent', text: 'The town’s ad boards have gone dark. People stop in the street and look up.' },
      ],
      services: ['Bazaar', 'Clinic (radiation treatment)', 'Weapon shop'],
      dangers: ['Paperwork', 'Security, if you misbehave'],
    },
    {
      id: 'longlegs', level: 'hn-longlegs', name: 'Mother Long-Legs', kind: 'A hole in the ground', x: 380, y: 470, state: 'known', art: 'longlegs',
      desc: 'A dark shaft in the cement of an old foundation. Travelers say something huge lives at the bottom, and that she is kind.',
      services: ['She heals, for free'],
      dangers: ['Her size', 'Your nerves'],
    },
    {
      id: 'anomalous', level: 'hn-agency-1', name: 'The Anomalous Structure', kind: 'Installation A', x: 650, y: 450, state: 'known', art: 'agency',
      desc: 'A square three-storey block of distressed concrete with a logo nobody can read and screens that still play ads at night. Its security system is very much awake.',
      more: [
        { flag: 'hnAgencyKnown', text: 'It was an Age of War advertising agency. Reception, offices, prototype labs, and a security complex on the top floor.' },
        { flag: 'hnTrapsOff', text: 'You shut its crossing traps down from the Security Station. They stay down.' },
        { flag: 'hnBayOff', text: 'You shut down its Robot Repair Bay: robots you destroy stay destroyed.' },
        { flag: 'hnAdsSilent', text: 'The ad system is silent.' },
      ],
      services: ['Treasure', 'Answers'],
      dangers: ['Maintenance robots', 'Knife Fighters', 'Gladiator Roaches (they come back)', 'A Sphinx Gun', 'Traps'],
    },
    {
      id: 'bunker', level: 'hn-bunker', name: 'The Bunker', kind: 'Installation B', x: 170, y: 380, state: 'known', art: 'bunker',
      desc: 'A blast door in a hillside, half-buried in red sand. Someone has painted KEEP OUT on it, then crossed it out and painted PLEASE.',
      services: [], dangers: ['Unknown'], stub: true,
    },
    {
      id: 'warren', level: 'hn-warren', name: 'The Warren', kind: 'Installation C', x: 840, y: 470, state: 'known', art: 'warren',
      desc: 'Collapsed tunnels under a dead mall. Things dig there.',
      services: [], dangers: ['Unknown'], stub: true,
    },
    {
      id: 'bolthole', level: 'hn-bolthole', name: 'The Bolt Hole', kind: 'A rumor', x: 110, y: 160, state: 'hidden', art: 'bolthole',
      desc: 'The courier’s map marks a hatch under a dead billboard: an Age of War executive’s private shelter, sealed from the inside.',
      services: [], dangers: ['Unknown'], stub: true,
    },
    { id: 'mushroom', name: 'The Mushroom', kind: 'Mid-range', x: 900, y: 100, state: 'locked', art: 'mushroom', desc: 'A grey dome on a stalk, taller than anything for a day’s walk. Nobody who went to look has said what it is.', services: [], dangers: ['Unknown'] },
    { id: 'freeway', name: 'The Freeway', kind: 'Mid-range', x: 100, y: 560, state: 'locked', art: 'freeway', desc: 'A shattered roadway on legs, running off toward places the maps stopped naming.', services: [], dangers: ['Raiders', 'Falling'] },
    { id: 'stacks', name: 'The Tall Stacks', kind: 'Mid-range', x: 950, y: 330, state: 'locked', art: 'stacks', desc: 'Smokestacks on the horizon that still breathe a little smoke on cold mornings.', services: [], dangers: ['Unknown'] },
  ];
  HN.START_LOCS = Object.fromEntries(HN.LOCATIONS.map((l) => [l.id, l.state]));
  HN.loc = (id) => HN.LOCATIONS.find((l) => l.id === id);

  /** 'hidden' | 'known' | 'visited' | 'locked' */
  HN.locState = function (game, id) {
    const s = HN.st(game);
    const l = HN.loc(id);
    return (s.locs && s.locs[id]) || (l && l.state) || 'hidden';
  };
  /** Put a pin on the map (a rumor, a clue). */
  HN.revealLocation = function (game, id, why) {
    const s = HN.st(game);
    if (!s.locs) s.locs = {};
    const now = HN.locState(game, id);
    if (now !== 'hidden') return false;
    s.locs[id] = 'known';
    const l = HN.loc(id);
    game.toast('New place on the map: ' + l.name + (why ? ' (' + why + ')' : ''), 'key');
    HN.note(game, 'place', l.name + ': ' + l.desc);
    return true;
  };
  HN.recordDiscovery = function (game, id) {
    const s = HN.st(game);
    if (HN.locState(game, id) === 'known') s.locs[id] = 'visited';
  };
  HN.travelTo = function (game, id) {
    const l = HN.loc(id);
    if (!l || !l.level || !LM.find('levels', l.level)) return game.toast((l ? l.name : id) + ' isn’t built yet.', 'warn');
    HN.st(game).at = id;
    closeMap();
    game.travel(l.level, { sound: 'descend' });
  };

  // ------------------------------------------------------------ the drawing
  LM.ui.addStyles(`
    .hn-map { position: absolute; inset: 0; background: #b07040; overflow: hidden; }
    .hn-map svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .hn-map .pin { cursor: pointer; }
    .hn-map .pin:focus-visible { outline: none; }
    .hn-map .pin:focus-visible .pin-head, .hn-map .pin:hover .pin-head { stroke: #fff4d8; stroke-width: 3; }
    .hn-map .pin.locked { cursor: help; }
    .hn-map .here-ring { animation: hn-here 1.6s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes hn-here { from { opacity: 0.9; transform: scale(0.6); } to { opacity: 0; transform: scale(1.8); } }
    .hn-map-open #minimap, .hn-map-open #hud { visibility: hidden; }
    .hn-map-bar { position: absolute; left: 50%; transform: translateX(-50%); bottom: 14px; display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; padding: 8px 14px; max-width: calc(100vw - 32px); box-sizing: border-box;
      background: rgba(30,18,10,0.88); border: 1px solid #8a5a2a; color: #f0dcb8; font: 600 11px/1.3 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; }
    .hn-map-bar i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
    .hn-map-bar button { font: inherit; color: #1a1008; background: #e8a23a; border: 0; padding: 4px 10px; cursor: pointer; }
    .hn-loc-art { height: 110px; margin: 0 0 12px; border: 1px solid rgba(255,255,255,0.14); display: grid; place-items: center; color: rgba(255,240,210,0.5); font: 600 10px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; }
    .hn-loc-list { margin: 4px 0 10px; padding-left: 18px; }
    .hn-loc-list li { margin: 2px 0; }
  `);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, ...kids) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    for (const c of kids.flat()) if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return el;
  };
  const W = 1000, H = 640;
  // placeholder art for a pin's panel until the painted pictures exist (ART-PROMPTS.md)
  const ART = {
    home: ['#4a4a44', '#2a2a26'], outpost: ['#6a5a3a', '#2a3a4a'], boomtown: ['#8a6a3a', '#3a2a1a'], longlegs: ['#2a2420', '#0a0806'],
    agency: ['#5a5650', '#ff4ad8'], bunker: ['#7a5a3a', '#3a2a1a'], warren: ['#4a3a2a', '#1a1208'], bolthole: ['#3a3a3a', '#e8a23a'],
    mushroom: ['#8a8a90', '#c8a07a'], freeway: ['#6a6058', '#c87a4a'], stacks: ['#5a5048', '#c86a3a'],
  };
  function terrain() {
    const r = U.mulberry32(4471), out = [];
    // mesas: flat-topped blobs with a shadow side
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, w = 30 + r() * 70, hh = 14 + r() * 26;
      if (HN.LOCATIONS.some((p) => Math.hypot(x - p.x, y - p.y) < 60)) continue;
      out.push(svg('ellipse', { cx: x + 4, cy: y + 6, rx: w / 2, ry: hh / 2, fill: '#8a4a2a', opacity: 0.55 }));
      out.push(svg('ellipse', { cx: x, cy: y, rx: w / 2, ry: hh / 2, fill: '#c8784a', stroke: '#8a4a2a', 'stroke-width': 1.5 }));
      out.push(svg('ellipse', { cx: x - w * 0.08, cy: y - hh * 0.1, rx: w * 0.34, ry: hh * 0.28, fill: '#d8905a' }));
    }
    // scrub and rocks
    for (let i = 0; i < 220; i++) out.push(svg('circle', { cx: r() * W, cy: r() * H, r: 1 + r() * 2, fill: r() < 0.5 ? '#7a8a4a' : '#9a6a4a', opacity: 0.7 }));
    return out;
  }
  // roads: polylines between pins (a broken highway and its offshoots)
  const ROADS = [
    [[0, 300], [180, 310], [330, 220], [500, 330], [720, 200], [1000, 260]],
    [[500, 330], [380, 470], [100, 560]],
    [[500, 330], [650, 450], [840, 470]],
    [[330, 220], [170, 380]],
    [[720, 200], [900, 100]],
    [[650, 450], [950, 330]],
  ];
  let overlay = null;
  function closeMap() {
    if (overlay) overlay.remove();
    overlay = null;
    document.body.classList.remove('hn-map-open');
  }
  HN.closeMap = closeMap;
  function pinColor(st) {
    return st === 'locked' ? '#7a6a5a' : st === 'visited' ? '#e8a23a' : '#3ac8b8';
  }
  function openMap(game) {
    closeMap();
    document.body.classList.add('hn-map-open');
    const s = HN.st(game);
    const here = s.at || 'home';
    const pins = HN.LOCATIONS.filter((p) => HN.locState(game, p.id) !== 'hidden').map((p) => {
      const st = HN.locState(game, p.id);
      const col = pinColor(st);
      const g = svg('g', { class: 'pin' + (st === 'locked' ? ' locked' : ''), tabindex: 0, role: 'button', 'aria-label': p.name + (st === 'locked' ? ' (not reachable yet)' : ''), transform: `translate(${p.x} ${p.y})`, 'data-pin': p.id },
        p.id === here ? svg('circle', { class: 'here-ring', cx: 0, cy: -22, r: 16, fill: 'none', stroke: '#fff4d8', 'stroke-width': 3 }) : null,
        p.id === 'home'
          ? svg('path', { class: 'pin-head', d: 'M-14 -6 L-14 -26 L0 -38 L14 -26 L14 -6 Z', fill: '#e8a23a', stroke: '#6a3a10', 'stroke-width': 1.5 })
          : svg('path', { class: 'pin-head', d: 'M0 0 C-4 -10 -13 -14 -13 -24 A13 13 0 1 1 13 -24 C13 -14 4 -10 0 0 Z', fill: col, stroke: U.shade(col, -0.4), 'stroke-width': 1.5 }),
        st === 'locked' ? svg('path', { d: 'M-4 -22 h8 v6 h-8 Z M-2.5 -22 v-3 a2.5 2.5 0 0 1 5 0 v3', fill: 'none', stroke: '#2a2018', 'stroke-width': 1.6 }) : svg('circle', { cx: 0, cy: p.id === 'home' ? -20 : -24, r: 5, fill: st === 'visited' ? '#fff4d8' : '#1a2a28' }),
        svg('text', { x: 0, y: 16, 'text-anchor': 'middle', fill: '#fff4d8', 'font-size': 14, 'font-weight': 700, 'font-family': 'var(--font-ui)', stroke: '#2a1408', 'stroke-width': 4, 'paint-order': 'stroke' }, p.name));
      const choose = () => openLocation(game, p);
      g.addEventListener('click', choose);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          choose();
        }
      });
      return g;
    });
    const map = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Map of the near area' },
      svg('defs', null, svg('radialGradient', { id: 'hn-sand', cx: '50%', cy: '52%', r: '70%' }, svg('stop', { offset: '0', 'stop-color': '#e8b880' }), svg('stop', { offset: '1', 'stop-color': '#a8683a' }))),
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#hn-sand)' }),
      // a dry riverbed
      svg('path', { d: 'M0 120 C150 140 240 90 420 120 S700 80 1000 140', fill: 'none', stroke: '#b88a5a', 'stroke-width': 18, 'stroke-linecap': 'round', opacity: 0.6 }),
      terrain(),
      ROADS.map((pts) => svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: '#5a4a3a', 'stroke-width': 7, 'stroke-linejoin': 'round', opacity: 0.75 })),
      ROADS.map((pts) => svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: '#e8d0a0', 'stroke-width': 1.2, 'stroke-dasharray': '8 10', opacity: 0.7 })),
      svg('text', { x: W - 24, y: H - 20, 'text-anchor': 'end', fill: '#5a2a10', 'font-size': 20, 'font-family': 'var(--font-head)', 'letter-spacing': 3 }, 'THE NEAR AREA'),
      svg('g', { transform: 'translate(950 64)' }, svg('circle', { r: 22, fill: 'none', stroke: '#5a2a10' }), svg('path', { d: 'M0 -20 L5 0 L0 20 L-5 0 Z', fill: '#5a2a10' }), svg('text', { y: -26, 'text-anchor': 'middle', 'font-size': 11, fill: '#5a2a10' }, 'N')),
      pins);
    const bar = h('div', { class: 'hn-map-bar' },
      h('span', null, h('i', { style: 'background:#3ac8b8' }), 'Known'),
      h('span', null, h('i', { style: 'background:#e8a23a' }), 'Visited'),
      h('span', null, h('i', { style: 'background:#7a6a5a' }), 'Out of reach'),
      h('span', null, 'Mission ' + Math.max(1, s.mission)),
      h('button', { type: 'button', on: { click: () => HN.openSatchel(game, 'ledger') } }, 'Ledger (C)'));
    overlay = h('div', { class: 'hn-map' });
    overlay.append(map, bar);
    const app = document.getElementById('app');
    app.insertBefore(overlay, document.getElementById('hud'));
  }
  HN.openAreaMap = openMap;

  function openLocation(game, p) {
    if (LM.ui.modalOpen) return;
    LM.audio.play('ui');
    const st = HN.locState(game, p.id);
    const more = (p.more || []).filter((m) => HN.flag(game, m.flag)).map((m) => h('p', { class: 'lore' }, m.text));
    const [c1, c2] = ART[p.art] || ['#5a4a3a', '#2a1a10'];
    const list = (title, xs) => (xs && xs.length ? [h('h3', null, title), h('ul', { class: 'hn-loc-list' }, xs.map((x) => h('li', null, x)))] : null);
    const stateWord = { known: 'Known', visited: 'Visited', locked: 'Out of reach (the mid-range maps aren’t built yet)' }[st] || st;
    const actions = st === 'locked'
      ? [{ label: 'Close', primary: true }]
      : [{ label: p.id === 'home' ? 'Go home' : 'Enter', primary: true, key: 'E', onClick: () => HN.travelTo(game, p.id) }, { label: 'Not now', quiet: true }];
    LM.ui.open({
      kicker: p.kind + ' · ' + stateWord,
      title: p.name,
      body: h('div', { class: 'hn-panel' },
        h('div', { class: 'hn-loc-art', style: `background:linear-gradient(160deg, ${c1}, ${c2})` }, 'Picture to come'),
        h('p', { class: 'lore' }, p.desc), more,
        list('Known services and rewards', p.services), list('Known dangers', p.dangers),
        p.stub ? h('p', { class: 'muted' }, 'Only the entrance of this place is built in this slice.') : null),
      actions,
    });
  }
  HN.openLocationPanel = (game, id) => openLocation(game, HN.loc(id));

  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player || game.levelId !== 'hn-area-map') return closeMap();
    const s = HN.st(game);
    if (s.created && !s.inMission) HN.startMission(game);
    if (s.at) HN.recordDiscovery(game, s.at);
    setTimeout(() => game.levelId === 'hn-area-map' && openMap(game), 0);
  });
  HN.onArrive((game, def, s) => {
    // arriving somewhere marks its pin visited
    const l = HN.LOCATIONS.find((x) => x.level === def.id);
    if (l) {
      s.at = l.id;
      if (HN.locState(game, l.id) === 'known') s.locs[l.id] = 'visited';
    }
  });

  LM.definePack({
    id: 'hn-world',
    levels: {
      'hn-area-map': {
        name: 'The Near Area',
        floorLabel: 'The near area',
        order: 100,
        environment: 'hn-complex',
        armed: false,
        stairsUp: false,
        map: ['#####', '#.<.#', '#####'],
      },
    },
  });
})();
