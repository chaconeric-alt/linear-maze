/* HaveNot — packs/hn-world/placeart.js
 * Pictures of places: on the near-area map in place of a site's pin, in its panel when you look at it, and on a card
 * as you arrive. The Anomalous Structure, the Greasy Bolt Hole and the Bunker are drawn (games/havenot/art, the
 * 'places' layers). Every Installation-Ruin is painted here from its own seed, so no two look alike: a damaged
 * single-storey installation, partly fenced, with antennas or a radio tower on the roof, and some of: a dome, a
 * water tank, glowing wall panels, a big bulkhead door, black-and-yellow hazard stripes; under a sky of its own.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const HN = (LM.HN = LM.HN || {});
  const h = (...a) => LM.ui.h(...a);
  const DRAWN = { agency: 'anomalous', greasy: 'greasy', bunker: 'bunker' };

  // ---- an Installation-Ruin, from its seed
  const n1 = (v) => Math.round(v * 10) / 10;
  HN.installationSVG = function (seedText) {
    let hs = 0;
    for (const c of String(seedText)) hs = (hs * 31 + c.charCodeAt(0)) >>> 0;
    const r = U.mulberry32(hs);
    const rr = (a, b) => a + r() * (b - a), pick = (xs) => xs[Math.floor(r() * xs.length)], chance = (p) => r() < p;
    const W = 320, H = 200, ground = rr(132, 146);
    const out = [];
    // the sky: a time of day of its own
    const sky = pick([['#6a90b0', '#d8c8a0', '#f0dcb0'], ['#3a2a4a', '#c8603a', '#f8d090'], ['#8aa8b8', '#e8d8b8', '#f4e4c4'], ['#2a3048', '#6a5a7a', '#c89a7a'], ['#a8a090', '#d8b888', '#e8c898']]);
    out.push(`<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="0.6" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>`);
    out.push('<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0b070"/><stop offset="1" stop-color="#a8703a"/></linearGradient>');
    const wall = pick([['#9a948a', '#5a564e'], ['#8a8a80', '#4a4a44'], ['#a89a84', '#6a5a46'], ['#7a8088', '#3e444c'], ['#9a8a7a', '#5a4a3e']]);
    out.push(`<linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${wall[0]}"/><stop offset="1" stop-color="${wall[1]}"/></linearGradient>`);
    out.push('<pattern id="hz" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#1a1a1a"/><rect width="4" height="8" fill="#e8c030"/></pattern>');
    out.push('<pattern id="fn" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 L5 0 M0 0 L0 5" stroke="#3a3a3a" stroke-width="0.6"/></pattern>');
    out.push('<radialGradient id="dk" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#1a140c"/></radialGradient></defs>');
    out.push('<rect width="320" height="200" fill="url(#s)"/>');
    if (chance(0.5)) out.push(`<circle cx="${n1(rr(30, 290))}" cy="${n1(rr(30, 70))}" r="${n1(rr(14, 26))}" fill="#fff0c8" opacity="0.5"/>`);
    // far dunes
    out.push(`<path d="M0 ${n1(ground - rr(18, 30))} Q${n1(rr(60, 120))} ${n1(ground - rr(30, 44))} 170 ${n1(ground - rr(16, 26))} Q${n1(rr(220, 280))} ${n1(ground - rr(34, 46))} 320 ${n1(ground - rr(18, 28))} V200 H0 Z" fill="#c8905a" opacity="0.6"/>`);
    // the building
    const bw = rr(150, 220), bx = (W - bw) / 2 + rr(-30, 30), bh = rr(46, 64), by = ground - bh;
    const roofBits = [];
    // a broken roof line: notches where it fell in
    let roof = `M${n1(bx)} ${n1(by)}`;
    const notches = Math.floor(rr(1, 4));
    const xs = Array.from({ length: notches }, () => rr(bx + 20, bx + bw - 30)).sort((a, b) => a - b);
    for (const x of xs) roof += ` L${n1(x)} ${n1(by)} L${n1(x + rr(4, 10))} ${n1(by + rr(6, 16))} L${n1(x + rr(14, 24))} ${n1(by + rr(2, 8))} L${n1(x + rr(24, 32))} ${n1(by)}`;
    roof += ` L${n1(bx + bw)} ${n1(by)} L${n1(bx + bw)} ${n1(ground)} L${n1(bx)} ${n1(ground)} Z`;
    out.push(`<path d="${roof}" fill="url(#w)" stroke="#1e1a14" stroke-width="1.4"/>`);
    out.push(`<rect x="${n1(bx)}" y="${n1(by)}" width="${n1(bw)}" height="4" fill="#000" opacity="0.25"/>`);
    // hazard stripes along the base or the roof edge
    if (chance(0.65)) out.push(`<rect x="${n1(bx)}" y="${n1(chance(0.5) ? ground - 7 : by + 4)}" width="${n1(bw)}" height="6" fill="url(#hz)" opacity="0.9"/>`);
    // a bulkhead door, or a plain one
    const dw = chance(0.55) ? rr(34, 48) : rr(16, 22), dx = bx + rr(16, bw - dw - 16), dh = Math.min(bh - 10, dw * rr(0.8, 1.1));
    const open = chance(0.5);
    out.push(`<rect x="${n1(dx - 3)}" y="${n1(ground - dh - 3)}" width="${n1(dw + 6)}" height="${n1(dh + 3)}" fill="url(#hz)" stroke="#1a1a1a" stroke-width="1"/>`);
    out.push(`<rect x="${n1(dx)}" y="${n1(ground - dh)}" width="${n1(dw)}" height="${n1(dh)}" fill="${open ? 'url(#dk)' : '#5a5e64'}" stroke="#1a1a1a" stroke-width="1"/>`);
    if (!open) for (let i = 1; i < 4; i++) out.push(`<path d="M${n1(dx + 2)} ${n1(ground - dh + (dh * i) / 4)} h${n1(dw - 4)}" stroke="#2a2e34" stroke-width="1.2"/>`);
    else out.push(`<path d="M${n1(dx + dw)} ${n1(ground - dh)} l${n1(dw * 0.35)} 6 v${n1(dh - 6)} h${n1(-dw * 0.35)} Z" fill="#6a6e74" stroke="#1a1a1a" stroke-width="1"/>`);
    // windows and glowing panels
    const glow = pick(['#5ae8b0', '#5ab8ff', '#ffb04a', '#ff5a4a', '#c46aff']);
    const panels = Math.floor(rr(2, 6));
    for (let i = 0; i < panels; i++) {
      const px = bx + rr(8, bw - 22), py = by + rr(10, bh - 24);
      if (px + 14 > dx - 4 && px < dx + dw + 4) continue;
      const lit = chance(0.6);
      out.push(`<rect x="${n1(px)}" y="${n1(py)}" width="${n1(rr(10, 18))}" height="${n1(rr(6, 10))}" fill="${lit ? glow : '#1e2226'}" opacity="${lit ? 0.85 : 1}" stroke="#14100a" stroke-width="0.8"/>`);
      if (lit) out.push(`<rect x="${n1(px - 3)}" y="${n1(py - 3)}" width="${n1(24)}" height="${n1(16)}" fill="${glow}" opacity="0.12"/>`);
    }
    // cracks and a hole blown in the wall
    for (let i = 0; i < 3; i++) {
      const cx = bx + rr(10, bw - 10), cy = by + rr(6, bh - 10);
      out.push(`<path d="M${n1(cx)} ${n1(cy)} l${n1(rr(-6, 6))} ${n1(rr(4, 9))} l${n1(rr(-6, 6))} ${n1(rr(3, 8))}" stroke="#1e1a14" stroke-width="0.9" fill="none"/>`);
    }
    if (chance(0.5)) {
      const hx = bx + rr(20, bw - 40), hy = by + rr(8, bh - 26);
      out.push(`<path d="M${n1(hx)} ${n1(hy)} l7 -3 l9 4 l3 9 l-6 7 l-10 -2 l-5 -8 Z" fill="#14100a" stroke="#3a342c" stroke-width="0.8"/>`);
    }
    // on the roof: a dome, a tank, antennas, a radio tower
    if (chance(0.45)) {
      const dmx = bx + rr(30, bw - 30), drr = rr(14, 24);
      out.push(`<path d="M${n1(dmx - drr)} ${n1(by)} A${n1(drr)} ${n1(drr)} 0 0 1 ${n1(dmx + drr)} ${n1(by)} Z" fill="${pick(['#c8ccd0', '#a8b0b8', '#d8d0c0'])}" stroke="#1e1a14" stroke-width="1.2"/>`);
      out.push(`<path d="M${n1(dmx - drr * 0.7)} ${n1(by - drr * 0.5)} Q${n1(dmx)} ${n1(by - drr * 0.9)} ${n1(dmx + drr * 0.7)} ${n1(by - drr * 0.5)}" stroke="#7a7e84" stroke-width="0.8" fill="none"/>`);
      if (chance(0.5)) out.push(`<path d="M${n1(dmx + drr * 0.2)} ${n1(by - drr)} l${n1(drr * 0.5)} ${n1(drr * 0.4)} l-3 6 Z" fill="#14100a"/>`);
      roofBits.push(dmx);
    }
    if (chance(0.35)) {
      const tx = bx + rr(14, bw - 30);
      out.push(`<rect x="${n1(tx)}" y="${n1(by - 20)}" width="20" height="14" rx="3" fill="#8a7a5a" stroke="#1e1a14" stroke-width="1"/><path d="M${n1(tx + 3)} ${n1(by - 6)} v6 M${n1(tx + 17)} ${n1(by - 6)} v6" stroke="#1e1a14" stroke-width="1.4"/>`);
    }
    const masts = Math.floor(rr(1, 4));
    for (let i = 0; i < masts; i++) {
      const mx = bx + rr(8, bw - 8), mh = rr(14, 34), bent = chance(0.4) ? rr(-8, 8) : 0;
      out.push(`<path d="M${n1(mx)} ${n1(by)} L${n1(mx + bent)} ${n1(by - mh)}" stroke="#2a2620" stroke-width="1.4"/>`);
      if (chance(0.6)) out.push(`<path d="M${n1(mx + bent - 5)} ${n1(by - mh + 6)} h10 M${n1(mx + bent - 3)} ${n1(by - mh + 11)} h6" stroke="#2a2620" stroke-width="1"/>`);
      if (chance(0.5)) out.push(`<circle cx="${n1(mx + bent)}" cy="${n1(by - mh)}" r="1.6" fill="#ff3a2a"/>`);
    }
    if (chance(0.55)) {
      // a lattice radio tower
      const tx = chance(0.5) ? bx + rr(6, 30) : bx + bw - rr(6, 30), th = rr(50, 84), tw = rr(10, 16);
      const top = by - th;
      out.push(`<path d="M${n1(tx - tw / 2)} ${n1(by)} L${n1(tx - 1.5)} ${n1(top)} M${n1(tx + tw / 2)} ${n1(by)} L${n1(tx + 1.5)} ${n1(top)}" stroke="#3a342c" stroke-width="1.4"/>`);
      const steps = Math.floor(th / 9);
      for (let i = 1; i < steps; i++) {
        const y1 = by - (th * i) / steps, y2 = by - (th * (i + 1)) / steps, w1 = (tw / 2) * (1 - i / steps), w2 = (tw / 2) * (1 - (i + 1) / steps);
        out.push(`<path d="M${n1(tx - w1)} ${n1(y1)} L${n1(tx + w2)} ${n1(y2)} M${n1(tx + w1)} ${n1(y1)} L${n1(tx - w2)} ${n1(y2)}" stroke="#3a342c" stroke-width="0.6"/>`);
      }
      out.push(`<circle cx="${n1(tx)}" cy="${n1(top)}" r="2" fill="#ff3a2a"/>`);
      if (chance(0.5)) out.push(`<path d="M${n1(tx)} ${n1(top + 12)} q8 -4 12 2 q-6 4 -12 -2 Z" fill="#c8ccd0" stroke="#3a342c" stroke-width="0.6"/>`);
    }
    // the fence: chain-link in panels, with gaps and a sagging one
    const fy = ground + rr(6, 14);
    let fx = rr(-10, 30);
    while (fx < W) {
      const fw = rr(30, 54);
      if (!chance(0.32)) {
        const sag = chance(0.2) ? rr(4, 10) : 0;
        out.push(`<path d="M${n1(fx)} ${n1(fy - 26)} L${n1(fx + fw)} ${n1(fy - 26 + sag)} L${n1(fx + fw)} ${n1(fy)} L${n1(fx)} ${n1(fy)} Z" fill="url(#fn)" opacity="0.9"/>`);
        out.push(`<path d="M${n1(fx)} ${n1(fy - 28)} V${n1(fy + 2)} M${n1(fx + fw)} ${n1(fy - 28 + sag)} V${n1(fy + 2)} M${n1(fx)} ${n1(fy - 26)} L${n1(fx + fw)} ${n1(fy - 26 + sag)}" stroke="#4a4a44" stroke-width="1.2"/>`);
        if (chance(0.3)) out.push(`<path d="M${n1(fx)} ${n1(fy - 29)} q${n1(fw / 4)} -3 ${n1(fw / 2)} 0 q${n1(fw / 4)} 3 ${n1(fw / 2)} 0" stroke="#6a6a64" stroke-width="0.6" fill="none" stroke-dasharray="1.5 1.5"/>`);
      } else if (chance(0.5)) out.push(`<path d="M${n1(fx)} ${n1(fy - 28)} V${n1(fy + 2)}" stroke="#4a4a44" stroke-width="1.2"/>`);
      fx += fw;
    }
    if (chance(0.6)) {
      const sx = rr(30, 280);
      out.push(`<g transform="translate(${n1(sx)} ${n1(fy - 20)}) rotate(${n1(rr(-14, 14))})"><rect x="-9" y="-6" width="18" height="12" fill="#e8c030" stroke="#1a1a1a" stroke-width="1"/><path d="M-6 -3 h12 M-6 0 h9 M-6 3 h11" stroke="#1a1a1a" stroke-width="1"/></g>`);
    }
    // sand drifted in front
    out.push(`<path d="M0 ${n1(ground + rr(4, 12))} Q${n1(rr(50, 110))} ${n1(ground - rr(0, 10))} 160 ${n1(ground + rr(6, 14))} Q${n1(rr(210, 270))} ${n1(ground - rr(0, 8))} 320 ${n1(ground + rr(4, 12))} V200 H0 Z" fill="url(#d)"/>`);
    out.push(`<path d="M${n1(rr(10, 60))} ${n1(ground + 30)} q30 -6 60 0 M${n1(rr(180, 240))} ${n1(ground + 38)} q30 -6 60 0" stroke="#f0c888" stroke-width="1.2" fill="none" opacity="0.7"/>`);
    void roofBits;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join('')}</svg>`;
  };

  // ---- a place's picture as a URL (null: it has none yet)
  const urls = new Map();
  HN.placePicture = function (p) {
    if (!p) return null;
    // a settled place's floor plan (hn-world/plans.js)
    const plan = HN.placePlan && HN.placePlan(p);
    if (plan && HN.planURL(plan)) return HN.planURL(plan);
    if (p.gen) {
      const key = 'gen:' + p.id + ':' + p.gen;
      if (!urls.has(key)) urls.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(HN.installationSVG(p.id + '|' + p.gen + '|' + p.level + '|' + p.x + ',' + p.y)));
      return urls.get(key);
    }
    const frame = DRAWN[p.art];
    const a = frame && HN.artSheet && HN.artSheet('places');
    if (!a) return null;
    const i = a.states.indexOf(frame);
    if (i < 0) return null;
    if (!urls.has(frame)) {
      const c = document.createElement('canvas');
      c.width = a.w;
      c.height = a.h;
      c.getContext('2d').drawImage(a.img, i * a.w, 0, a.w, a.h, 0, 0, a.w, a.h);
      urls.set(frame, c.toDataURL());
    }
    return urls.get(frame);
  };

  // ---- the card as you arrive
  let card = null;
  function arrivalCard(game, p, tries = 0) {
    const url = HN.placePicture(p);
    if (!url) {
      // the drawn pictures may still be loading on the first arrival: try again for a moment
      const lvl = game.levelId;
      if (DRAWN[p.art] && tries < 20) setTimeout(() => game.levelId === lvl && arrivalCard(game, p, tries + 1), 100);
      return;
    }
    if (card) card.remove();
    const plan = HN.placePlan && HN.placePlan(p);
    card = h('div', { class: 'hn-arrive' + (plan ? ' plan' : '') },
      plan ? HN.planElement(plan) : h('div', { class: 'pic', style: 'background-image:url("' + url + '")' }),
      h('div', { class: 'cap' }, h('span', { class: 'kind' }, p.kind || ''), h('strong', null, p.name)));
    const app = document.getElementById('app') || document.body, modal = document.getElementById('modal');
    if (modal && modal.parentNode === app) app.insertBefore(card, modal);
    else app.appendChild(card);
    const c = card;
    c.addEventListener('click', () => c.remove());
    setTimeout(() => c.classList.add('gone'), 4200);
    setTimeout(() => c.remove(), 5200);
  }
  let lastAt = null;
  HN.onArrive((game, def, s) => {
    const l = (HN.LOCATIONS || []).find((x) => x.level === def.id);
    if (!l || !s.created || l.id === lastAt) return;
    lastAt = l.id;
    arrivalCard(game, l);
  });
  LM.on('levelLoaded', (game) => {
    // leaving a place lets its card show again next time you come
    if (game && game.levelId === 'hn-area-map') lastAt = null;
  });

  const css = document.createElement('style');
  css.textContent = `
    .hn-arrive { position: absolute; left: 50%; top: 18%; transform: translateX(-50%); width: min(560px, 80%); border: 2px solid #2a1408; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.7), 0 0 0 6px #f2e2bc, 0 0 0 7px #2a1408; background: #f2e2bc; transition: opacity 1s; cursor: pointer; }
    .hn-arrive.plan { width: min(640px, 86%); top: 8%; }
    .hn-arrive .pic { aspect-ratio: 320 / 200; background: #2a1a10 center/cover no-repeat; }
    .hn-arrive .cap { display: flex; flex-direction: column; align-items: center; padding: 6px 10px 8px; color: #2a1408; font-family: Georgia, serif; }
    .hn-arrive .cap .kind { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.75; }
    .hn-arrive .cap strong { font-size: 22px; letter-spacing: 0.06em; }
    .hn-arrive.gone { opacity: 0; }
    .hn-loc-art.pic { height: auto; aspect-ratio: 320 / 200; background-size: cover !important; background-position: center !important; }
  `;
  document.head.appendChild(css);
})();
