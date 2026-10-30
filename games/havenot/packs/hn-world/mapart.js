/* HaveNot — packs/hn-world/mapart.js
 * The near-area map's drawing: a survey sheet of the wastes on old parchment, in the books' palette (ochre,
 * rust, sienna, bleached tan). Everything is drawn here as SVG from a seed, around wherever the pins are, so
 * generated ruins sit in the land rather than on top of it; map.js lays the pins, the routes, the fog and the
 * controls over it.
 *
 *   HN.MAPART.defs()                     filters, gradients, patterns (once per map)
 *   HN.MAPART.land(pins, seed)           the ground: dunes, mesas, craters, the dry river and lake, dead
 *                                        forests, rubble fields, the mountains; nothing within reach of a pin
 *   HN.MAPART.routes(pins, highway)      the old highway, and trails linking every site to its nearest
 *   HN.MAPART.icon(kind, colour)         a site's glyph (home, outpost, town, ruin, bunker, …) in a badge
 *   HN.MAPART.compass(), legend(), cartouche()
 *   HN.MAPART.kindOf(pin)                which glyph a pin gets
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, HN = LM.HN;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, ...kids) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
    for (const c of kids.flat()) if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return el;
  };
  const W = 1000, H = 640;
  const INK = '#4a2a14', INK2 = '#7a4a24', WASH = '#c8783a';

  const defs = () => svg('defs', null,
    // the parchment: fibres, blotches and a burnt edge
    svg('filter', { id: 'hnm-paper', x: 0, y: 0, width: '100%', height: '100%' },
      svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 3, seed: 7, result: 'grain' }),
      svg('feColorMatrix', { in: 'grain', type: 'matrix', values: '0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.15  0 0 0 0.16 0', result: 'g2' }),
      svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.012, numOctaves: 4, seed: 3, result: 'blot' }),
      svg('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0.55  0 0 0 0 0.33  0 0 0 0 0.12  0 0 0 0.55 -0.12', result: 'b2' }),
      svg('feMerge', null, svg('feMergeNode', { in: 'SourceGraphic' }), svg('feMergeNode', { in: 'b2' }), svg('feMergeNode', { in: 'g2' }))),
    // ink that bleeds a little
    svg('filter', { id: 'hnm-ink' }, svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.06, numOctaves: 2, seed: 11, result: 'n' }), svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 2.2 })),
    svg('radialGradient', { id: 'hnm-vignette', cx: '50%', cy: '50%', r: '72%' }, svg('stop', { offset: '0.6', 'stop-color': '#000', 'stop-opacity': 0 }), svg('stop', { offset: '1', 'stop-color': '#3a1a06', 'stop-opacity': 0.55 })),
    svg('radialGradient', { id: 'hnm-sand' }, svg('stop', { offset: 0, 'stop-color': '#efdcb2' }), svg('stop', { offset: 1, 'stop-color': '#dcc08a' })),
    svg('radialGradient', { id: 'hnm-fogfade' }, svg('stop', { offset: '0.55', 'stop-color': '#000' }), svg('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': 0 })),
    svg('pattern', { id: 'hnm-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, svg('rect', { width: 6, height: 6, fill: '#6a4a2a' }), svg('path', { d: 'M0 0 V6', stroke: '#4a2e18', 'stroke-width': 1.4 })),
    svg('pattern', { id: 'hnm-salt', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, svg('rect', { width: 24, height: 24, fill: '#f2e8d2' }), svg('path', { d: 'M0 9 L7 11 L12 4 M7 11 L10 19 L18 22 M12 4 L20 8 L24 6 M20 8 L18 16 L24 18', stroke: '#c8a87a', 'stroke-width': 0.8, fill: 'none' })));

  // ------------------------------------------------------------ the ground
  function land(pins, seed) {
    const r = U.mulberry32(seed || 4471);
    const near = (x, y, d) => pins.some((p) => Math.hypot(x - p.x, y - p.y) < d);
    // features keep clear of the pins and of each other (rad: how much room this one needs)
    const taken = [];
    const pick = (d, rad = 40, tries = 60) => {
      for (let i = 0; i < tries; i++) {
        const x = 30 + r() * (W - 60), y = 30 + r() * (H - 60);
        if (near(x, y, d) || taken.some(([tx, ty, tr]) => Math.hypot(x - tx, y - ty) < tr + rad)) continue;
        taken.push([x, y, rad]);
        return [x, y];
      }
      return null;
    };
    const g = [];
    // the sheet itself
    g.push(svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#hnm-sand)', filter: 'url(#hnm-paper)' }));
    // washes of colour: rust lowlands, pale flats
    for (let i = 0; i < 9; i++) {
      const [x, y] = [r() * W, r() * H];
      g.push(svg('ellipse', { cx: x, cy: y, rx: 80 + r() * 140, ry: 50 + r() * 90, fill: r() < 0.5 ? WASH : '#f4e6c4', opacity: 0.12 + r() * 0.08 }));
    }
    const ink = svg('g', { filter: 'url(#hnm-ink)', fill: 'none', stroke: INK, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    g.push(ink);
    const add = (el) => ink.appendChild(el);

    // the mountains along the north edge: ridged peaks, hatched on the shadow side
    for (let x = 10; x < W; x += 34 + r() * 22) {
      const y = 18 + r() * 34, s = 16 + r() * 18;
      if (near(x, y, 60)) continue;
      add(svg('path', { d: `M${x - s} ${y + s * 0.7} L${x} ${y - s * 0.6} L${x + s} ${y + s * 0.7}`, 'stroke-width': 1.6 }));
      add(svg('path', { d: `M${x} ${y - s * 0.6} L${x + s * 0.5} ${y + s * 0.7} L${x + s} ${y + s * 0.7} Z`, fill: 'url(#hnm-hatch)', stroke: 'none', opacity: 0.6 }));
    }
    // the dry river: a meander from the west, into a cracked salt lake
    const lake = [790 + r() * 60, 520 + r() * 40];
    taken.push([lake[0], lake[1], 85]);
    let d = `M0 ${150 + r() * 40}`;
    let x = 0, y = 170;
    while (x < lake[0] - 40) {
      const nx = x + 70 + r() * 50, ny = Math.max(90, Math.min(H - 80, y + (lake[1] - y) * 0.18 + (r() - 0.5) * 80));
      d += ` Q${x + (nx - x) * 0.5 + (r() - 0.5) * 30} ${y + (r() - 0.5) * 60} ${nx} ${ny}`;
      x = nx;
      y = ny;
    }
    d += ` L${lake[0]} ${lake[1]}`;
    g.splice(2, 0, svg('path', { d, stroke: '#e8d4a8', 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round', opacity: 0.9 }));
    add(svg('path', { d, 'stroke-width': 1.2, stroke: INK2, 'stroke-dasharray': '1 4' }));
    add(svg('path', { d, 'stroke-width': 0.8, stroke: INK2, transform: 'translate(0 7)', opacity: 0.6 }));
    g.splice(3, 0, svg('ellipse', { cx: lake[0], cy: lake[1], rx: 78, ry: 44, fill: 'url(#hnm-salt)', stroke: INK2, 'stroke-width': 1.2, opacity: 0.95 }));
    g.push(svg('text', { x: lake[0], y: lake[1] + 4, 'text-anchor': 'middle', fill: INK2, 'font-size': 11, 'font-style': 'italic', 'font-family': 'Georgia, serif', 'letter-spacing': 2 }, 'the dry lake'));

    // mesas: an irregular plateau, a wash of rust, hachures down the south-east faces
    for (let i = 0; i < 16; i++) {
      const at = pick(70, 55);
      if (!at) continue;
      const [cx, cy] = at, rx = 22 + r() * 34, ry = 12 + r() * 18, n = 9;
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * rx * (0.8 + r() * 0.35), cy + Math.sin(a) * ry * (0.8 + r() * 0.35)]);
      }
      const path = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + ' Z';
      g.splice(4, 0, svg('path', { d: path, fill: '#c87a46', opacity: 0.5 }));
      add(svg('path', { d: path, 'stroke-width': 1.5 }));
      for (let k = 0; k < 10; k++) {
        const a = Math.PI * (0.05 + 0.6 * (k / 9));
        const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
        add(svg('path', { d: `M${px.toFixed(1)} ${py.toFixed(1)} l${(Math.cos(a) * 7).toFixed(1)} ${(Math.sin(a) * 7 + 3).toFixed(1)}`, 'stroke-width': 1 }));
      }
    }
    // dune fields: rows of crescent ridges
    for (let i = 0; i < 7; i++) {
      const at = pick(80, 60);
      if (!at) continue;
      for (let k = 0; k < 7; k++) {
        const x0 = at[0] + (r() - 0.5) * 110, y0 = at[1] + (r() - 0.5) * 60, s = 10 + r() * 14;
        add(svg('path', { d: `M${x0 - s} ${y0} Q${x0} ${y0 - s * 0.6} ${x0 + s} ${y0}`, 'stroke-width': 1, stroke: INK2 }));
        add(svg('path', { d: `M${x0 - s * 0.6} ${y0 + 3} Q${x0} ${y0 - s * 0.2} ${x0 + s * 0.6} ${y0 + 3}`, 'stroke-width': 0.6, stroke: INK2, opacity: 0.6 }));
      }
    }
    // craters: rims with hachures pointing in
    for (let i = 0; i < 6; i++) {
      const at = pick(70, 35);
      if (!at) continue;
      const rr = 10 + r() * 22;
      add(svg('circle', { cx: at[0], cy: at[1], r: rr, 'stroke-width': 1.4 }));
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        add(svg('path', { d: `M${(at[0] + Math.cos(a) * rr).toFixed(1)} ${(at[1] + Math.sin(a) * rr).toFixed(1)} l${(-Math.cos(a) * 5).toFixed(1)} ${(-Math.sin(a) * 5).toFixed(1)}`, 'stroke-width': 0.8 }));
      }
    }
    // dead forests: stands of bare trees
    for (let i = 0; i < 5; i++) {
      const at = pick(75, 45);
      if (!at) continue;
      for (let k = 0; k < 9; k++) {
        const tx = at[0] + (r() - 0.5) * 70, ty = at[1] + (r() - 0.5) * 40, s = 5 + r() * 4;
        add(svg('path', { d: `M${tx} ${ty} v${-s * 1.6} m0 ${s * 0.6} l${-s * 0.6} ${-s * 0.7} m${s * 0.6} ${s * 0.4} l${s * 0.6} ${-s * 0.8}`, 'stroke-width': 1 }));
      }
    }
    // rubble cities: the broken grid of an old town
    for (let i = 0; i < 3; i++) {
      const at = pick(85, 60);
      if (!at) continue;
      const rot = (r() - 0.5) * 40;
      const city = svg('g', { transform: `rotate(${rot.toFixed(1)} ${at[0].toFixed(1)} ${at[1].toFixed(1)})` });
      for (let k = 0; k < 26; k++) {
        const bx = at[0] + (r() - 0.5) * 90, by = at[1] + (r() - 0.5) * 56, s = 4 + r() * 7;
        city.appendChild(svg('rect', { x: bx.toFixed(1), y: by.toFixed(1), width: s.toFixed(1), height: (s * (0.6 + r())).toFixed(1), fill: r() < 0.5 ? '#8a5a34' : 'none', 'stroke-width': 0.8, opacity: 0.85 }));
      }
      add(city);
    }
    // scrub
    for (let i = 0; i < 160; i++) {
      const sx = r() * W, sy = r() * H;
      if (near(sx, sy, 26)) continue;
      add(svg('path', { d: `M${sx.toFixed(1)} ${sy.toFixed(1)} l-2 -3 m2 3 l0 -4 m0 4 l2 -3`, 'stroke-width': 0.7, stroke: '#6a5a2a', opacity: 0.7 }));
    }
    // the sheet's edge, darkened with handling
    g.push(svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#hnm-vignette)', 'pointer-events': 'none' }));
    return g;
  }

  /** The footprint of a ruin under its pin: broken walls round a dark hole. */
  function ruinPrint(p, seed) {
    const r = U.mulberry32(seed);
    const g = svg('g', { filter: 'url(#hnm-ink)', stroke: INK, fill: 'none', opacity: 0.85 });
    g.appendChild(svg('ellipse', { cx: p.x, cy: p.y + 2, rx: 30, ry: 18, fill: '#8a5a34', opacity: 0.35, stroke: 'none' }));
    for (let k = 0; k < 12; k++) {
      const a = r() * Math.PI * 2, d = 14 + r() * 18;
      const x = p.x + Math.cos(a) * d * 1.3, y = p.y + Math.sin(a) * d * 0.8;
      g.appendChild(svg('path', { d: `M${x.toFixed(1)} ${y.toFixed(1)} l${(r() * 10 - 5).toFixed(1)} 0 l0 ${(r() * 6 - 3).toFixed(1)}`, 'stroke-width': 1.3 }));
    }
    return g;
  }

  // ------------------------------------------------------------ routes
  /** The old highway (fixed), and a trail from every site to its nearest neighbour that's already joined (a
   *  spanning tree, so every site can be reached), drawn as gently curving paths. */
  function routes(pins, highway) {
    const out = [];
    for (const pts of highway) {
      const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
      out.push(svg('path', { d, fill: 'none', stroke: '#5a3a1e', 'stroke-width': 6, opacity: 0.55, 'stroke-linejoin': 'round' }));
      out.push(svg('path', { d, fill: 'none', stroke: '#f0dcb0', 'stroke-width': 1.4, 'stroke-dasharray': '7 7', 'stroke-linejoin': 'round' }));
    }
    const done = [pins[0]], left = pins.slice(1);
    const trails = [];
    while (left.length) {
      let best = null;
      for (const a of left) for (const b of done) {
        const dd = Math.hypot(a.x - b.x, a.y - b.y);
        if (!best || dd < best[2]) best = [a, b, dd];
      }
      trails.push(best);
      done.push(best[0]);
      left.splice(left.indexOf(best[0]), 1);
    }
    for (const [a, b] of trails) {
      const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.12, my = (a.y + b.y) / 2 - (a.x - b.x) * 0.12;
      out.push(svg('path', { d: `M${a.x} ${a.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x} ${b.y}`, fill: 'none', stroke: INK2, 'stroke-width': 1.6, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round', opacity: 0.85, class: 'hnm-trail' }));
    }
    return out;
  }

  // ------------------------------------------------------------ site glyphs
  const GLYPH = {
    home: 'M-9 4 V-4 L0 -11 L9 -4 V4 Z M-3 4 V-2 H3 V4',
    outpost: 'M-8 6 H8 M0 6 V-2 M-9 -6 A9 9 0 0 1 9 -6 L0 -2 Z M0 -8 L6 -12',
    town: 'M-10 6 V-2 H-4 V-6 H2 V-1 H8 V6 Z M3 -6 V-12 M-1 -12 H7 M3 -12 V-9',
    tower: 'M-2 6 L-6 -10 H6 L2 6 Z M-8 -10 H8 M-5 -2 H5 M0 -10 V-13',
    agency: 'M-8 -8 H8 V8 H-8 Z M-8 -8 L-3 -12 H12 L8 -8 M8 8 L12 4 V-12',
    bunker: 'M-10 5 Q0 -12 10 5 Z M-4 5 V-1 H4 V5',
    warren: 'M-9 4 A4 3 0 1 1 -1 4 M2 0 A4 3 0 1 1 10 0 M-4 -6 A3 2 0 1 1 2 -6',
    hatch: 'M-8 -8 H8 V8 H-8 Z M-8 0 H8 M0 -8 V8 M-5 -5 L5 5',
    egg: 'M0 -11 C7 -11 9 1 0 4 C-9 1 -7 -11 0 -11 Z M-9 6 H9 M-7 4 V8 M7 4 V8',
    mushroom: 'M-11 -2 Q0 -15 11 -2 Z M-2 -2 V8 H2 V-2',
    bridge: 'M-11 -3 H11 M-8 -3 V7 M0 -3 V7 M8 -3 V7 M-11 -3 Q-4 -9 0 -3 Q4 -9 11 -3',
    stacks: 'M-8 8 V-6 H-4 V8 M-1 8 V-10 H3 V8 M6 8 V-3 H9 V8 M1 -12 q2 -3 0 -5',
    ruin: 'M-10 6 H10 M-8 6 V-4 L-5 -8 V6 M-1 6 V-10 L2 -6 V6 M5 6 V-2 L8 -5 V6',
  };
  const KIND_OF_ART = { home: 'home', outpost: 'outpost', boomtown: 'town', longlegs: 'tower', agency: 'agency', bunker: 'bunker', warren: 'warren', bolthole: 'hatch', greasy: 'egg', mushroom: 'mushroom', freeway: 'bridge', stacks: 'stacks' };
  const kindOf = (p) => (/^ruin/.test(p.id) || (HN.GEN_SITES && Object.values(HN.GEN_SITES).some((s) => s.pin && s.pin.id === p.id && !s.replaces)) ? 'ruin' : KIND_OF_ART[p.art] || 'ruin');
  const KIND_WORD = { home: 'Home', outpost: 'Outpost', town: 'Town', tower: 'Landmark', agency: 'Anomaly', bunker: 'Bunker', warren: 'Warren', hatch: 'Bolt hole', egg: 'Bolt hole', mushroom: 'Wonder', bridge: 'Way out', stacks: 'Landmark', ruin: 'Installation-ruin' };
  function icon(kind, colour, ring) {
    return svg('g', { class: 'pin-head' },
      svg('circle', { r: 15, fill: '#f6e8c8', stroke: ring || INK, 'stroke-width': 2.2 }),
      svg('circle', { r: 12, fill: colour, opacity: 0.9 }),
      svg('path', { d: GLYPH[kind] || GLYPH.ruin, fill: 'none', stroke: '#2a1408', 'stroke-width': 1.7, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  }

  // ------------------------------------------------------------ the furniture of a map
  function compass(x, y) {
    const g = svg('g', { transform: `translate(${x} ${y})`, filter: 'url(#hnm-ink)', 'pointer-events': 'none' });
    g.appendChild(svg('circle', { r: 34, fill: '#f2e2bc', stroke: INK, 'stroke-width': 1.5, opacity: 0.85 }));
    g.appendChild(svg('circle', { r: 28, fill: 'none', stroke: INK2, 'stroke-width': 0.8, 'stroke-dasharray': '2 3' }));
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4, L = k % 2 ? 18 : 30;
      const p = (rr, aa) => `${(Math.sin(aa) * rr).toFixed(1)} ${(-Math.cos(aa) * rr).toFixed(1)}`;
      g.appendChild(svg('path', { d: `M0 0 L${p(5, a - Math.PI / 2)} L${p(L, a)} Z`, fill: k % 2 ? INK2 : INK }));
      g.appendChild(svg('path', { d: `M0 0 L${p(5, a + Math.PI / 2)} L${p(L, a)} Z`, fill: '#f6e8c8', stroke: INK, 'stroke-width': 0.6 }));
    }
    g.appendChild(svg('text', { y: -38, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: INK, 'font-family': 'Georgia, serif' }, 'N'));
    return g;
  }
  function cartouche(title, sub) {
    const g = svg('g', { transform: 'translate(24 22)', 'pointer-events': 'none' });
    g.appendChild(svg('path', { d: 'M0 6 Q0 0 6 0 H262 Q268 0 268 6 V50 Q268 56 262 56 H6 Q0 56 0 50 Z', fill: '#f2e2bc', stroke: INK, 'stroke-width': 1.6, opacity: 0.92 }));
    g.appendChild(svg('path', { d: 'M8 8 H260 V48 H8 Z', fill: 'none', stroke: INK2, 'stroke-width': 0.7 }));
    g.appendChild(svg('text', { x: 134, y: 30, 'text-anchor': 'middle', 'font-size': 20, 'letter-spacing': 4, fill: INK, 'font-family': 'Georgia, serif', 'font-weight': 700 }, title));
    g.appendChild(svg('text', { x: 134, y: 45, 'text-anchor': 'middle', 'font-size': 10, 'font-style': 'italic', fill: INK2, 'font-family': 'Georgia, serif' }, sub));
    return g;
  }
  function legend(x, y, kinds) {
    const rows = [['visited', 'Visited', '#e8a23a'], ['known', 'Known', '#7ac8b0'], ['locked', 'Out of reach', '#a89884']];
    const g = svg('g', { transform: `translate(${x} ${y})`, 'pointer-events': 'none', 'font-family': 'Georgia, serif', 'font-size': 10, fill: INK });
    const hgt = 30 + rows.length * 18 + Math.ceil(kinds.length / 2) * 22 + 46;
    g.appendChild(svg('rect', { width: 196, height: hgt, rx: 4, fill: '#f2e2bc', stroke: INK, 'stroke-width': 1.4, opacity: 0.93 }));
    g.appendChild(svg('text', { x: 98, y: 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, 'letter-spacing': 2 }, 'LEGEND'));
    let yy = 34;
    for (const [, word, col] of rows) {
      g.appendChild(svg('circle', { cx: 16, cy: yy - 4, r: 6, fill: col, stroke: INK }));
      g.appendChild(svg('text', { x: 30, y: yy }, word));
      yy += 18;
    }
    kinds.forEach((k, i) => {
      const cx = 16 + (i % 2) * 94, cy = yy + Math.floor(i / 2) * 22;
      const ic = icon(k, '#e8d0a0');
      ic.setAttribute('transform', `translate(${cx} ${cy - 4}) scale(0.55)`);
      g.appendChild(ic);
      g.appendChild(svg('text', { x: cx + 14, y: cy }, KIND_WORD[k]));
    });
    yy += Math.ceil(kinds.length / 2) * 22 + 2;
    g.appendChild(svg('path', { d: `M10 ${yy} H40`, stroke: '#5a3a1e', 'stroke-width': 5, opacity: 0.55 }));
    g.appendChild(svg('path', { d: `M10 ${yy} H40`, stroke: '#f0dcb0', 'stroke-width': 1.2, 'stroke-dasharray': '5 5' }));
    g.appendChild(svg('text', { x: 48, y: yy + 3 }, 'The old highway'));
    yy += 16;
    g.appendChild(svg('path', { d: `M10 ${yy} H40`, stroke: INK2, 'stroke-width': 1.6, 'stroke-dasharray': '2 5' }));
    g.appendChild(svg('text', { x: 48, y: yy + 3 }, 'Trails'));
    yy += 16;
    g.appendChild(svg('rect', { x: 10, y: yy - 6, width: 30, height: 9, fill: '#c8783a' }));
    g.appendChild(svg('text', { x: 48, y: yy + 3 }, 'Threat: level of danger'));
    return g;
  }

  HN.MAPART = { W, H, svg, defs, land, ruinPrint, routes, icon, compass, cartouche, legend, kindOf, KIND_WORD };
})();
