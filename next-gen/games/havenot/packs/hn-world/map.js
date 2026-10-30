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
      services: ['Rest', 'A full heal at the medical station for 15 credits', 'The Expedition Ledger', 'The retirement terminal'],
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
      id: 'anomalous', level: 'hn-agency-1', name: 'The Anomalous Structure', kind: 'Installation A', x: 650, y: 450, state: 'known', art: 'agency', threat: 1,
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
    {
      id: 'greasy', level: 'hn-greasy-1', name: 'The Greasy Bolt Hole', kind: 'Installation · Age of War', x: 565, y: 585, state: 'known', art: 'greasy', threat: [2, 3],
      desc: 'The dunes south of the old foundations shifted in the last storm and uncovered a hatch: one of Enoch the Greasy’s bunkers, from the Age of War. It is standing open. Travelers say something inside clicks like typing.',
      more: [
        { flag: 'hnGreasyLift', text: 'Under the bunker is Enoch’s robot works, and the Eggbots have it now.' },
        { flag: 'hnEggJam', text: 'You jammed the works’ infection broadcast.' },
        { flag: 'hnPrincessDone', text: 'Princess Eggbot is scrap. The works still hums, but nobody is telling it what shape to be.' },
      ],
      services: ['An armory of Level 3 weapons', 'A med-bay', 'Grease, a lot of it'],
      dangers: ['Chatterpillars', 'Turrets and a Slop-Tread', 'Ceiling goop', 'Eggbots (Threat Level 3 below)', 'Conveyor floors'],
    },
    {
      id: 'mushroom', name: 'The Mushroom', kind: 'Mid-range', x: 900, y: 100, state: 'locked', art: 'mushroom', desc: 'A grey dome on a stalk, taller than anything for a day’s walk. Nobody who went to look has said what it is.', services: [], dangers: ['Unknown'],
      more: [{ flag: 'hnMushroomRoute', text: 'From the Greasy Bolt Hole’s coms log you know the way: north-east along the dead pipeline to the dry lake, then follow the stalk’s shadow at noon. There is a robot facility the size of a city inside, and the Eggbots want it.' }],
    },
    { id: 'freeway', name: 'The Freeway', kind: 'Mid-range', x: 100, y: 560, state: 'locked', art: 'freeway', desc: 'A shattered roadway on legs, running off toward places the maps stopped naming.', services: [], dangers: ['Raiders', 'Falling'] },
    { id: 'stacks', name: 'The Tall Stacks', kind: 'Mid-range', x: 950, y: 330, state: 'locked', art: 'stacks', desc: 'Smokestacks on the horizon that still breathe a little smoke on cold mornings.', services: [], dangers: ['Unknown'], more: [{ flag: 'hnMushroomRoute', text: 'The Eggbots have been calling it too. It only ever answers with smoke.' }] },
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
    .hn-map { position: absolute; inset: 0; background: #2a1a0c; overflow: hidden; }
    .hn-map svg { touch-action: none; }
    .hnm-tip { position: absolute; display: none; width: 250px; padding: 8px 10px; background: #f6e8c8; color: #2a1408; border: 1px solid #4a2a14; box-shadow: 0 4px 14px rgba(0,0,0,0.4); font: 12px/1.35 Georgia, serif; pointer-events: none; z-index: 2; }
    .hnm-tip b { font-size: 14px; } .hnm-tip .muted { color: #6a4a2a; margin-top: 4px; }
    .hn-map svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .hn-map .pin { cursor: pointer; }
    .hn-map .pin:focus-visible { outline: none; }
    .hn-map .pin:focus-visible .pin-head circle:first-child, .hn-map .pin:hover .pin-head circle:first-child { stroke: #b8342a; stroke-width: 3.5; }
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
    greasy: ['#3a3418', '#ff7ac8'], mushroom: ['#8a8a90', '#c8a07a'], freeway: ['#6a6058', '#c87a4a'], stacks: ['#5a5048', '#c86a3a'],
  };
  // the old highway: polylines between the first settlements (trails to every other site are worked out from
  // where the pins are, mapart.js)
  const ROADS = [
    [[0, 300], [180, 310], [330, 220], [500, 330], [720, 200], [1000, 260]],
    [[500, 330], [380, 470], [100, 560]],
    [[500, 330], [650, 450], [840, 470]],
  ];
  let overlay = null;
  function closeMap() {
    if (overlay) overlay.remove();
    overlay = null;
    document.body.classList.remove('hn-map-open');
  }
  HN.closeMap = closeMap;
  const STATE_COL = { visited: '#e8a23a', known: '#7ac8b0', locked: '#a89884' };
  /** A Threat range against the player's level, by its top: green (at or below you), amber (one above), red
   *  (two or more: the panel says you'll probably die). */
  function threatChip(game, threat) {
    const [lo, hi] = [].concat(threat, threat).slice(0, 2);
    const lvl = HN.level ? HN.level(game) : 1;
    const col = hi <= lvl ? '#5a8a34' : hi <= lvl + 1 ? '#c8862a' : '#b8342a';
    return { text: 'Threat ' + (lo === hi ? lo : lo + '–' + hi), col };
  }
  // a drawn place's picture in place of its pin's glyph: a little framed vignette (hn-world/placeart.js)
  function picIcon(p, colour, ring) {
    const url = HN.placePicture && HN.placePicture(p);
    if (!url) return null;
    const svg = HN.MAPART.svg;
    return svg('g', { class: 'pin-head' },
      svg('rect', { x: -33, y: -25, width: 66, height: 44, rx: 3, fill: '#f6e8c8', stroke: ring || '#2a1408', 'stroke-width': ring ? 3 : 2 }),
      svg('image', { href: url, x: -30, y: -22, width: 60, height: 38, preserveAspectRatio: 'xMidYMid slice' }),
      svg('rect', { x: -30, y: -22, width: 60, height: 38, fill: 'none', stroke: colour, 'stroke-width': 2, opacity: 0.9 }));
  }
  function openMap(game) {
    closeMap();
    document.body.classList.add('hn-map-open');
    const A = HN.MAPART, svg = A.svg;
    const s = HN.st(game);
    const here = s.at || 'home';
    const shown = HN.LOCATIONS.filter((p) => HN.locState(game, p.id) !== 'hidden');
    // the land, the same every time for this run (the run's seed), drawn round wherever the pins are
    const seed = (s.ruins && s.ruins.seed) || 4471;
    const view = svg('g', { class: 'hnm-view' });
    view.append(...A.land(HN.LOCATIONS, seed));
    for (const p of shown) if (A.kindOf(p) === 'ruin') view.appendChild(A.ruinPrint(p, (seed ^ (p.x * 31 + p.y)) >>> 0));
    view.append(...A.routes([HN.loc(here) || shown[0]].concat(shown.filter((p) => p.id !== here)), ROADS));
    // fog of war: the sheet is dark where nobody has been; it lifts round what you've seen or heard of
    const fogMask = svg('mask', { id: 'hnm-fog' }, svg('rect', { x: -50, y: -50, width: A.W + 100, height: A.H + 100, fill: '#fff' }),
      shown.map((p) => {
        const st = HN.locState(game, p.id), rr = p.id === here ? 190 : st === 'visited' ? 160 : st === 'known' ? 120 : 75;
        return svg('circle', { cx: p.x, cy: p.y, r: rr, fill: 'url(#hnm-fogfade)' });
      }));
    view.appendChild(svg('g', { mask: 'url(#hnm-fog)', 'pointer-events': 'none' },
      svg('rect', { x: -50, y: -50, width: A.W + 100, height: A.H + 100, fill: '#3a2410', opacity: 0.62 }),
      svg('rect', { x: -50, y: -50, width: A.W + 100, height: A.H + 100, fill: 'url(#hnm-hatch)', opacity: 0.22 })));
    // the pins: a glyph for what the place is, its name, and its Threat
    const tip = h('div', { class: 'hnm-tip' });
    const pins = shown.map((p) => {
      const st = HN.locState(game, p.id), kind = A.kindOf(p), col = STATE_COL[st] || STATE_COL.known;
      const chip = p.threat ? threatChip(game, p.threat) : null;
      const g = svg('g', { class: 'pin' + (st === 'locked' ? ' locked' : ''), tabindex: 0, role: 'button', 'aria-label': p.name + (chip ? ', ' + chip.text : '') + (st === 'locked' ? ' (not reachable yet)' : ''), transform: `translate(${p.x} ${p.y})`, 'data-pin': p.id },
        p.id === here ? svg('circle', { class: 'here-ring', r: 22, fill: 'none', stroke: '#b8342a', 'stroke-width': 3 }) : null,
        picIcon(p, col, p.id === here ? '#b8342a' : null) || A.icon(kind, col, p.id === here ? '#b8342a' : null),
        st === 'locked' ? svg('path', { d: 'M8 4 h8 v6 h-8 Z M9.5 4 v-3 a2.5 2.5 0 0 1 5 0 v3', fill: '#f6e8c8', stroke: '#2a1408', 'stroke-width': 1.4 }) : null,
        svg('text', { x: 0, y: 30, 'text-anchor': 'middle', fill: '#2a1408', 'font-size': 13, 'font-weight': 700, 'font-family': 'Georgia, serif', stroke: '#f6e8c8', 'stroke-width': 4, 'paint-order': 'stroke' }, p.name),
        chip ? svg('g', { transform: 'translate(0 42)' }, svg('rect', { x: -30, y: -8, width: 60, height: 14, rx: 3, fill: chip.col, stroke: '#2a1408', 'stroke-width': 1 }), svg('text', { y: 3, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#fff8e8', 'font-family': 'sans-serif' }, chip.text)) : null,
        p.id === here ? svg('g', { transform: 'translate(0 -26)' }, svg('path', { d: 'M-46 -14 H46 V2 H6 L0 8 L-6 2 H-46 Z', fill: '#b8342a', stroke: '#2a1408', 'stroke-width': 1 }), svg('text', { y: -2, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#fff8e8', 'font-family': 'sans-serif', 'letter-spacing': 1 }, 'YOU ARE HERE')) : null);
      const choose = () => openLocation(game, p);
      g.addEventListener('click', (e) => {
        if (!moved) choose();
        e.stopPropagation();
      });
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          choose();
        }
      });
      // a hover card: what it is, how you stand with it
      g.addEventListener('pointerenter', () => {
        const stWord = { known: 'Known', visited: 'Visited', locked: 'Out of reach' }[st] || st;
        tip.replaceChildren(h('b', null, p.name), h('div', null, (A.KIND_WORD[kind] || p.kind) + ' · ' + stWord + (p.id === here ? ' · you are here' : '')), chip ? h('div', { style: 'color:' + chip.col }, chip.text + (HN.threatWord ? ' — ' + HN.threatWord([].concat(p.threat).slice(-1)[0], HN.level ? HN.level(game) : 1) : '')) : null, h('div', { class: 'muted' }, String(p.desc || '').split('. ')[0] + '.'));
        tip.style.display = 'block';
      });
      g.addEventListener('pointermove', (e) => {
        const rc = overlay.getBoundingClientRect();
        tip.style.left = Math.min(rc.width - 270, e.clientX - rc.left + 16) + 'px';
        tip.style.top = Math.min(rc.height - 120, e.clientY - rc.top + 16) + 'px';
      });
      g.addEventListener('pointerleave', () => (tip.style.display = 'none'));
      return g;
    });
    view.append(...pins);
    const kinds = [...new Set(shown.map((p) => A.kindOf(p)))];
    // the legend: over the bottom right of the sheet when you want it (the button, or L)
    const legendG = A.legend(A.W - 214, A.H - 18 - (30 + 3 * 18 + Math.ceil(kinds.length / 2) * 22 + 46), kinds);
    const showLegend = (on) => {
      legendG.style.display = on ? '' : 'none';
      s.mapLegend = !!on;
    };
    showLegend(!!s.mapLegend);
    const map = svg('svg', { viewBox: `0 0 ${A.W} ${A.H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Map of the near area' },
      A.defs(), fogMask, view,
      A.cartouche('THE NEAR AREA', 'a survey of the wastes · mission ' + Math.max(1, s.mission)),
      A.compass(A.W - 54, 62),
      legendG);
    // pan and zoom: the wheel zooms about the pointer, a drag moves the sheet, the buttons and +/- too
    let k = 1, tx = 0, ty = 0, moved = false;
    const apply = () => {
      k = Math.max(1, Math.min(4, k));
      tx = Math.min(0, Math.max(A.W - A.W * k, tx));
      ty = Math.min(0, Math.max(A.H - A.H * k, ty));
      view.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k.toFixed(3)})`);
    };
    const toSheet = (e) => {
      const pt = map.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(map.getScreenCTM().inverse());
    };
    const zoomAt = (f, x, y) => {
      const nk = Math.max(1, Math.min(4, k * f));
      tx = x - ((x - tx) * nk) / k;
      ty = y - ((y - ty) * nk) / k;
      k = nk;
      apply();
    };
    map.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const p = toSheet(e);
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
    }, { passive: false });
    let drag = null;
    map.addEventListener('pointerdown', (e) => {
      drag = { p: toSheet(e), tx, ty };
      moved = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag || !overlay) return;
      const p = toSheet(e);
      if (Math.hypot(p.x - drag.p.x, p.y - drag.p.y) > 4) moved = true;
      if (!moved) return;
      tx = drag.tx + (p.x - drag.p.x);
      ty = drag.ty + (p.y - drag.p.y);
      apply();
    });
    window.addEventListener('pointerup', () => {
      drag = null;
      setTimeout(() => (moved = false), 0);
    });
    const centre = () => zoomAt(1, A.W / 2, A.H / 2);
    const bar = h('div', { class: 'hn-map-bar' },
      h('button', { type: 'button', title: 'Zoom in (+)', on: { click: () => zoomAt(1.4, A.W / 2, A.H / 2) } }, '+'),
      h('button', { type: 'button', title: 'Zoom out (−)', on: { click: () => zoomAt(1 / 1.4, A.W / 2, A.H / 2) } }, '−'),
      h('button', { type: 'button', title: 'Back to you', on: { click: () => { const p = HN.loc(here); k = 2.2; tx = A.W / 2 - p.x * k; ty = A.H / 2 - p.y * k; apply(); } } }, 'Where am I'),
      h('button', { type: 'button', title: 'Show or hide the legend (L)', on: { click: () => showLegend(legendG.style.display === 'none') } }, 'Legend (L)'),
      h('span', null, 'Wheel: zoom · drag: move · click a place'),
      h('button', { type: 'button', on: { click: () => HN.openSatchel(game, 'ledger') } }, 'Ledger (C)'));
    overlay = h('div', { class: 'hn-map' });
    const onKey = (e) => {
      if (!overlay) return window.removeEventListener('keydown', onKey);
      if (LM.ui.modalOpen) return;
      if (e.key === '+' || e.key === '=') zoomAt(1.25, A.W / 2, A.H / 2);
      if (e.key === '-' || e.key === '_') zoomAt(0.8, A.W / 2, A.H / 2);
      if (e.key === 'l' || e.key === 'L') showLegend(legendG.style.display === 'none');
    };
    window.addEventListener('keydown', onKey);
    overlay.append(map, tip, bar);
    void centre;
    const app = document.getElementById('app');
    app.insertBefore(overlay, document.getElementById('hud'));
  }
  HN.openAreaMap = openMap;

  function threatLine(game, threat) {
    const [lo, hi] = [].concat(threat, threat).slice(0, 2);
    const lvl = HN.level ? HN.level(game) : 1;
    return h('p', { class: 'muted' }, 'Threat Level ' + (lo === hi ? lo : lo + ' (the top) to ' + hi + ' (deeper down)') + ' · you are Level ' + lvl + ': ' + (HN.threatWord ? HN.threatWord(hi, lvl) : '') + '.');
  }
  function openLocation(game, p) {
    if (LM.ui.modalOpen) return;
    LM.audio.play('ui');
    const st = HN.locState(game, p.id);
    const more = (p.more || []).filter((m) => HN.flag(game, m.flag)).map((m) => h('p', { class: 'lore' }, m.text));
    const [c1, c2] = ART[p.art] || ['#5a4a3a', '#2a1a10'];
    const pic = HN.placePicture ? HN.placePicture(p) : null;
    const plan = HN.placePlan && HN.placePlan(p);
    const list = (title, xs) => (xs && xs.length ? [h('h3', null, title), h('ul', { class: 'hn-loc-list' }, xs.map((x) => h('li', null, x)))] : null);
    const stateWord = { known: 'Known', visited: 'Visited', locked: 'Out of reach (the mid-range maps aren’t built yet)' }[st] || st;
    const actions = st === 'locked'
      ? [{ label: 'Close', primary: true }]
      : [{ label: p.id === 'home' ? 'Go home' : 'Enter', primary: true, key: 'E', onClick: () => HN.travelTo(game, p.id) }, { label: 'Not now', quiet: true }];
    LM.ui.open({
      kicker: p.kind + ' · ' + stateWord,
      title: p.name,
      body: h('div', { class: 'hn-panel' },
        plan ? HN.planElement(plan) : pic ? h('div', { class: 'hn-loc-art pic', style: `background:url("${pic}") center/cover no-repeat` }) : h('div', { class: 'hn-loc-art', style: `background:linear-gradient(160deg, ${c1}, ${c2})` }, 'Picture to come'),
        h('p', { class: 'lore' }, p.desc), more,
        p.threat ? threatLine(game, p.threat) : null,
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
