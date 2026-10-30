/* HaveNot — packs/hn-world/plans.js
 * Floor plans of the settled places, drawn the way a table-top battle map is: straight down, one square to five
 * feet under a faint grid; salvaged walls (rammed earth, concrete, corrugated sheet) with blue window panes and
 * wooden doors; each room's own floor (red tile, flagstone, plank, concrete, paving) and its name lettered in
 * blackletter; the furniture as simple shapes with soft shadows; the wasteland round about (sand, scrub, cactus,
 * rubble and scrap) and a path out to the edge; a parchment cartouche in a wooden frame with the title, the floor,
 * a scale bar and a compass. Every plan is drawn from the level itself (its map, rooms and objects), so it is
 * where everything really is.
 *
 * HN.PLANS[id] says which level and what the cartouche says; HN.planSVG(id) draws it; HN.placePlan(pin) finds a
 * place's plan. The map's pin, the place's panel (click to see it full size) and the arrival card use it.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const HN = (LM.HN = LM.HN || {});
  const h = (...a) => LM.ui.h(...a);
  const T = 24; // a square, in the plan's units

  HN.PLANS = {
    outpost: { level: 'hn-outpost', title: 'The Out-rider Outpost', sub: 'the scouts’ station on the near-area road', line: 'The Near Area · surveyed in the Now', floor: 'GROUND FLOOR', contents: 'the yard, the trailer, the clinic & the radio shack', perimeter: 'fence', walls: 'metal' },
    boomtown: { level: 'hn-boomtown', title: 'Boom-Town', sub: 'a company town, by order of the Company', line: 'The Near Area · surveyed in the Now', floor: 'GROUND FLOOR', contents: 'the square, the clinic, the armourer, the hall & the gate', perimeter: 'wall', walls: 'earth' },
    longlegs: { level: 'hn-longlegs', title: 'Mother Long-Legs', sub: 'a den at the bottom of a shaft', line: 'Under the Near Area', floor: 'THE DEN', contents: 'the round room, its pillars & the foot of the shaft', underground: true, walls: 'concrete' },
    warren: { level: 'hn-warren', title: 'The Warren', sub: 'Installation C · tunnels under a dead mall', line: 'Under the Near Area', floor: 'ENTRANCE LEVEL', contents: 'the entrance & the first room · sealed beyond', underground: true, walls: 'concrete' },
  };

  // ---- a little seeded randomness, so a plan is the same every time
  const rng = (seed) => {
    let hs = 0;
    for (const c of String(seed)) hs = (hs * 31 + c.charCodeAt(0)) >>> 0;
    return U.mulberry32(hs);
  };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // floors, by what the room is
  const FLOORS = { tile: 'url(#pl-tile)', flag: 'url(#pl-flag)', plank: 'url(#pl-plank)', concrete: 'url(#pl-conc)', paving: 'url(#pl-pave)' };
  function floorOf(name, r) {
    const n = String(name || '').toLowerCase();
    if (/clinic|med|wellness/.test(n)) return 'paving';
    if (/counter|shop|armament|bang|store|trader/.test(n)) return 'plank';
    if (/hall|league|ping/.test(n)) return 'plank';
    if (/radio|shack|den|shaft|entrance|first room|tunnel/.test(n)) return 'concrete';
    return ['tile', 'flag', 'plank', 'concrete'][Math.floor(r() * 4)];
  }

  // furniture, from the object's id: simple shapes with a soft shadow
  function furniture(id, x, y, r) {
    const c = x * T + T / 2, m = y * T + T / 2;
    const box = (w, hh, fill, stroke = '#2a1a0a', extra = '') => `<g filter="url(#pl-shadow)"><rect x="${c - w / 2}" y="${m - hh / 2}" width="${w}" height="${hh}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>${extra}</g>`;
    if (/counter|desk|table|bench|cooler/.test(id)) {
      const w = /counter|bench/.test(id) ? T * 1.8 : T * 1.2;
      return box(w, T * 0.6, /cooler/.test(id) ? '#7aa8c8' : '#7a4a22', '#2a1408', /pingpong/.test(id) ? '' : `<path d="M${c - w / 2 + 3} ${m} h${w - 6}" stroke="#5a3214" stroke-width="0.8"/>`);
    }
    if (/pingpong/.test(id)) return box(T * 1.8, T * 1.1, '#2a6a3a', '#0a2a12', `<path d="M${c} ${m - T * 0.55} v${T * 1.1} M${c - T * 0.9} ${m} h${T * 1.8}" stroke="#f4f0e8" stroke-width="1"/>`);
    if (/filing|locker|shelf|cabinet/.test(id)) return box(T * 0.8, T * 0.55, '#8a929a', '#2a2e34', `<path d="M${c - T * 0.3} ${m - 3} h${T * 0.6} M${c - T * 0.3} ${m + 3} h${T * 0.6}" stroke="#4a4e54" stroke-width="1"/>`);
    if (/chair/.test(id)) return box(T * 0.45, T * 0.45, '#5a3a1a');
    if (/plant|glowcap/.test(id)) {
      const col = /glowcap/.test(id) ? '#7affd8' : '#4a7a3a';
      let s = `<g filter="url(#pl-shadow)"><circle cx="${c}" cy="${m}" r="${T * 0.28}" fill="#7a5a3a" stroke="#2a1a0a"/>`;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        s += `<path d="M${c} ${m} L${c + Math.cos(a) * T * 0.45} ${m + Math.sin(a) * T * 0.45}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
      }
      return s + '</g>';
    }
    if (/generator/.test(id)) return box(T * 1.4, T * 0.9, '#5a5a2a', '#1a1a0a', `<rect x="${c - T * 0.7}" y="${m - T * 0.45}" width="${T * 1.4}" height="5" fill="url(#pl-haz)"/><circle cx="${c + T * 0.35}" cy="${m + 2}" r="4" fill="#2a2a1a"/>`);
    if (/dish/.test(id)) return `<g filter="url(#pl-shadow)"><circle cx="${c}" cy="${m}" r="${T * 0.7}" fill="#d8dce0" stroke="#3a3e44" stroke-width="1.4"/><circle cx="${c}" cy="${m}" r="${T * 0.45}" fill="none" stroke="#9aa2aa"/><path d="M${c} ${m} l${T * 0.4} ${-T * 0.4}" stroke="#3a3e44" stroke-width="2"/><circle cx="${c + T * 0.4}" cy="${m - T * 0.4}" r="2" fill="#c82a2a"/></g>`;
    if (/sign|ad-screen|poster/.test(id)) return `<rect x="${c - T * 0.4}" y="${m - T * 0.5}" width="${T * 0.8}" height="4" fill="${/ad-screen/.test(id) ? '#ff4ad8' : '#e8a23a'}" stroke="#2a1a0a" stroke-width="0.8"/>`;
    if (/longlegs/.test(id)) return `<g filter="url(#pl-shadow)"><circle cx="${c}" cy="${m}" r="${T * 0.9}" fill="#3a2e3a" stroke="#0a0608" stroke-width="1.4"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2 + 0.2; return `<path d="M${c + Math.cos(a) * T * 0.8} ${m + Math.sin(a) * T * 0.8} q${Math.cos(a + 0.6) * T} ${Math.sin(a + 0.6) * T} ${Math.cos(a) * T * 1.8} ${Math.sin(a) * T * 1.8}" stroke="#2a222a" stroke-width="2.4" fill="none"/>`; }).join('')}</g>`;
    if (/exit/.test(id)) return '';
    // anything else: a crate
    return box(T * 0.7, T * 0.7, '#a8783a', '#3a2410', `<path d="M${c - T * 0.35} ${m - T * 0.35} l${T * 0.7} ${T * 0.7} M${c + T * 0.35} ${m - T * 0.35} l${-T * 0.7} ${T * 0.7}" stroke="#5a3a1a" stroke-width="1"/>`);
  }

  // the wasteland's dressing
  function scrub(x, y, r) {
    const k = r();
    if (k < 0.3) {
      // a cactus, spiky
      let s = `<g filter="url(#pl-shadow)">`;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r();
        s += `<path d="M${x} ${y} L${(x + Math.cos(a) * 11).toFixed(1)} ${(y + Math.sin(a) * 11).toFixed(1)}" stroke="#4a6a3a" stroke-width="3" stroke-linecap="round"/>`;
      }
      return s + `<circle cx="${x}" cy="${y}" r="4" fill="#5a7a4a"/></g>`;
    }
    if (k < 0.6) {
      // a dead shrub
      let s = '';
      for (let i = 0; i < 6; i++) {
        const a = r() * Math.PI * 2, L = 6 + r() * 8;
        s += `<path d="M${x} ${y} l${(Math.cos(a) * L).toFixed(1)} ${(Math.sin(a) * L).toFixed(1)}" stroke="#6a4a2a" stroke-width="1.4"/>`;
      }
      return s;
    }
    if (k < 0.82) {
      // rubble
      let s = `<g filter="url(#pl-shadow)">`;
      for (let i = 0; i < 4; i++) s += `<path d="M${(x + (r() - 0.5) * 16).toFixed(1)} ${(y + (r() - 0.5) * 12).toFixed(1)} l5 -3 l4 4 l-3 5 l-6 -1 Z" fill="${['#8a8278', '#6a645a', '#a89a88'][i % 3]}" stroke="#3a342c" stroke-width="0.8"/>`;
      return s + '</g>';
    }
    // scrap: a rusted sheet or a tire
    return r() < 0.5
      ? `<g filter="url(#pl-shadow)"><rect x="${x - 9}" y="${y - 5}" width="18" height="10" fill="#8a4a2a" stroke="#3a1a0a" transform="rotate(${Math.round(r() * 60 - 30)} ${x} ${y})"/></g>`
      : `<g filter="url(#pl-shadow)"><circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#1a1a1a" stroke-width="4"/></g>`;
  }

  /** A place's floor plan, as an SVG string (null: no such plan, or its level isn't loaded). */
  HN.planSVG = function (id) {
    const P = HN.PLANS[id];
    const L = P && LM.registry.levels[P.level];
    if (!L || !L.map) return null;
    const map = L.map, rows = map.length, cols = map[0].length;
    const r = rng(id);
    const M = 2, BOT = 6; // margins, in squares: all round, and under it for the cartouche
    const W = (cols + M * 2) * T, H = (rows + M * 2 + BOT) * T;
    const at = (x, y) => (y >= 0 && y < rows && x >= 0 && x < cols ? map[y][x] : P.underground ? '#' : ',');
    const legend = Object.assign({}, L.legend || {});
    const isDoor = (ch) => ch === '+' || (legend[ch] && legend[ch].terrain === 'door');
    const isWall = (ch) => ch === '#';
    const isFloor = (ch) => ch === '.';
    const rooms = (L.rooms || []).slice().sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
    const roomAt = (x, y) => rooms.find((rm) => x >= rm.rect[0] && x < rm.rect[0] + rm.rect[2] && y >= rm.rect[1] && y < rm.rect[1] + rm.rect[3]);
    const floorFor = new Map(rooms.map((rm) => [rm, floorOf(rm.name, r)]));
    const out = [];
    const ox = M * T, oy = M * T;

    // ground: sand and dust, or rock underground
    out.push(`<rect width="${W}" height="${H}" fill="${P.underground ? '#3a332c' : '#d8b07a'}"/>`);
    out.push(`<rect width="${W}" height="${H}" fill="${P.underground ? '#000' : '#8a5a2a'}" filter="url(#pl-mottle)" opacity="${P.underground ? 0.5 : 0.45}"/>`);
    out.push(`<g transform="translate(${ox} ${oy})">`);
    // the path out, from the way out to the edge of the sheet
    const objects = L.objects || [];
    let exit = null;
    objects.forEach((row, y) => [...row].forEach((ch, x) => { const d = (L.objectLegend || {})[ch]; if (d && (d === 'hn-exit' || d.item === 'hn-exit')) exit = [x, y]; }));
    const pathCols = new Set();
    if (exit && !P.underground) {
      const [ex, ey] = exit;
      out.push(`<rect x="${ex * T - 6}" y="${ey * T}" width="${T + 12}" height="${(rows - ey + M + BOT) * T}" fill="#ecd2a4" opacity="0.85"/><rect x="${ex * T - 6}" y="${ey * T}" width="${T + 12}" height="${(rows - ey + M + BOT) * T}" fill="url(#pl-pave)" opacity="0.35"/>`);
      pathCols.add(ex);
    }
    // floors, room by room
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (!(isFloor(ch) || isDoor(ch))) continue;
      const rm = roomAt(x, y);
      out.push(`<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="${FLOORS[rm ? floorFor.get(rm) : 'concrete']}"/>`);
    }
    // round rooms: the floor is a circle
    for (const rm of rooms) if (rm.shape === 'circle') {
      const [rx, ry, rw, rh] = rm.rect;
      const ecx = (rx + rw / 2) * T, ecy = (ry + rh / 2) * T, erx = (rw / 2) * T, ery = (rh / 2) * T;
      // rock in the corners the circle leaves, then its curved wall
      out.push(`<path d="M${rx * T} ${ry * T} h${rw * T} v${rh * T} h${-rw * T} Z M${ecx - erx} ${ecy} a${erx} ${ery} 0 1 0 ${erx * 2} 0 a${erx} ${ery} 0 1 0 ${-erx * 2} 0 Z" fill="${P.underground ? '#2a241e' : '#d8b07a'}" fill-rule="evenodd"/>`);
      out.push(`<ellipse cx="${ecx}" cy="${ecy}" rx="${erx - T * 0.2}" ry="${ery - T * 0.2}" fill="none" stroke="#8a847a" stroke-width="${T * 0.5}"/><ellipse cx="${ecx}" cy="${ecy}" rx="${erx - T * 0.45}" ry="${ery - T * 0.45}" fill="none" stroke="#3a1e12" stroke-width="2.4"/><ellipse cx="${ecx}" cy="${ecy}" rx="${erx + T * 0.05}" ry="${ery + T * 0.05}" fill="none" stroke="#3a1e12" stroke-width="2.4"/>`);
    }
    // walls: the faces of the solid; the outer ring is the fence or the town wall
    const ring = (x, y) => !P.underground && (x === 0 || y === 0 || x === cols - 1 || y === rows - 1);
    const wallFill = { metal: 'url(#pl-corr)', earth: '#c8704e', concrete: '#8a847a' }[P.walls];
    const edges = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!isWall(at(x, y))) continue;
      let open = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !isWall(at(x + dx, y + dy))) open = true;
      if (!open) {
        if (P.underground) out.push(`<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="#2a241e"/>`);
        continue;
      }
      if (ring(x, y)) {
        if (pathCols.has(x)) continue; // the gate
        if (P.perimeter === 'fence') {
          out.push(`<rect x="${x * T}" y="${y * T + T * 0.35}" width="${T}" height="${T * 0.3}" fill="url(#pl-mesh)"/>`);
          if ((x + y) % 2 === 0) out.push(`<circle cx="${x * T + T / 2}" cy="${y * T + T / 2}" r="3" fill="#4a4a44"/>`);
          continue;
        }
      }
      out.push(`<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="${ring(x, y) && P.perimeter === 'wall' ? '#b8603e' : wallFill}"/>`);
      if (ring(x, y) && P.perimeter === 'wall' && x % 3 === 0) out.push(`<rect x="${x * T + 3}" y="${y * T + 3}" width="${T - 6}" height="${T - 6}" fill="#7a7e84" opacity="0.6"/>`);
      // outline where the wall meets anything else
      for (const [dx, dy, d] of [[0, -1, `M${x * T} ${y * T} h${T}`], [0, 1, `M${x * T} ${y * T + T} h${T}`], [-1, 0, `M${x * T} ${y * T} v${T}`], [1, 0, `M${x * T + T} ${y * T} v${T}`]]) if (!isWall(at(x + dx, y + dy))) edges.push(d);
      // a window where a building's wall has inside on one side and outside on the other
      if (!ring(x, y) && (x + y) % 3 === 0) {
        const h2 = isFloor(at(x, y - 1)) && at(x, y + 1) === ',' || isFloor(at(x, y + 1)) && at(x, y - 1) === ',';
        const v2 = isFloor(at(x - 1, y)) && at(x + 1, y) === ',' || isFloor(at(x + 1, y)) && at(x - 1, y) === ',';
        if (h2) out.push(`<rect x="${x * T + 4}" y="${y * T + T / 2 - 3}" width="${T - 8}" height="6" fill="#9ad8f0" stroke="#2a4a5a" stroke-width="1"/>`);
        else if (v2) out.push(`<rect x="${x * T + T / 2 - 3}" y="${y * T + 4}" width="6" height="${T - 8}" fill="#9ad8f0" stroke="#2a4a5a" stroke-width="1"/>`);
      }
    }
    out.push(`<path d="${edges.join(' ')}" stroke="#3a1e12" stroke-width="2.4" fill="none"/>`);
    // doors: a wooden slab across the gap (a sealed one is rubble)
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const ch = at(x, y);
      if (!isDoor(ch)) continue;
      const sealed = legend[ch] && legend[ch].props && legend[ch].props.sealed;
      const horiz = isWall(at(x - 1, y)) || isWall(at(x + 1, y));
      if (sealed) out.push(`<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="#5a5048"/><path d="M${x * T + 4} ${y * T + 6} l6 -2 l5 4 l-4 6 Z M${x * T + 13} ${y * T + 14} l6 -1 l2 6 l-7 1 Z" fill="#8a8278"/>`);
      else if (horiz) out.push(`<rect x="${x * T + 1}" y="${y * T + T / 2 - 4}" width="${T - 2}" height="8" fill="#5a3214" stroke="#1a0a04" stroke-width="1"/>`);
      else out.push(`<rect x="${x * T + T / 2 - 4}" y="${y * T + 1}" width="8" height="${T - 2}" fill="#5a3214" stroke="#1a0a04" stroke-width="1"/>`);
    }
    // round pillars (the level's shapes)
    for (const s of L.shapes || []) if (s.type === 'circle' && s.solid) out.push(`<circle cx="${s.x * T}" cy="${s.y * T}" r="${s.r * T}" fill="#9a948a" stroke="#3a342c" stroke-width="1.6" filter="url(#pl-shadow)"/>`);
    // the furniture (people are left off, as on any battle map)
    const OL = L.objectLegend || {};
    const occupied = new Set();
    objects.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === ' ') return;
      occupied.add(x + ',' + y);
      const d = OL[ch];
      if (!d || d.npc || d.start || (typeof d === 'string' && /^hn-(hesketh|varga|pell|mae|halloran|bang|primm|okonkwo|spool|gatekeeper)/.test(d))) return;
      const iid = typeof d === 'string' ? d : d.item || '';
      if (LM.registry.npcs && LM.registry.npcs[iid]) return;
      out.push(furniture(iid, x, y, r));
    }));
    // the wasteland's scrub and scrap, outside on the ground (and round the edge of the sheet)
    if (!P.underground) for (let y = -M; y < rows + M + BOT - 1; y++) for (let x = -M; x < cols + M; x++) {
      const ch = at(x, y);
      if (ch !== ',' || occupied.has(x + ',' + y) || pathCols.has(x) || r() > 0.09) continue;
      if (y >= rows + M - 1 && x < 13) continue; // the cartouche's corner
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isWall(at(x + dx, y + dy)) && !ring(x + dx, y + dy)) near = true;
      if (!near) out.push(scrub(x * T + T / 2 + (r() - 0.5) * 10, y * T + T / 2 + (r() - 0.5) * 10, r));
    }
    // the labels: each room's name, in the open middle of its own floor
    for (const rm of rooms.slice().reverse()) {
      const own = [];
      const [rx, ry, rw, rh] = rm.rect;
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) if (roomAt(x, y) === rm && !isWall(at(x, y)) && !occupied.has(x + ',' + y)) own.push([x, y]);
      if (!own.length) continue;
      const cx = own.reduce((a, p) => a + p[0], 0) / own.length, cy = own.reduce((a, p) => a + p[1], 0) / own.length;
      const spot = own.slice().sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
      const big = rw * rh > 120;
      out.push(`<text x="${(spot[0] + 0.5) * T}" y="${(spot[1] + 0.5) * T + 5}" text-anchor="middle" font-family="'UnifrakturMaguntia', 'Old English Text MT', 'Goudy Text MT', serif" font-size="${big ? 20 : 15}" fill="#1a0e06" stroke="#f4e4c0" stroke-width="3" paint-order="stroke">${esc(rm.name)}</text>`);
    }
    out.push('</g>');
    // the grid over everything
    out.push(`<rect width="${W}" height="${H}" fill="url(#pl-grid)"/>`);
    // the cartouche, bottom left: parchment in a wooden frame
    const cw = 13 * T, ch2 = 6 * T, cx = T * 0.8, cy = H - ch2 - T * 0.5, tx = cw / 2 - 22;
    out.push(`<g transform="translate(${cx} ${cy})"><rect width="${cw}" height="${ch2}" fill="#6a3a1a" stroke="#2a1408" stroke-width="2"/><rect x="7" y="7" width="${cw - 14}" height="${ch2 - 14}" fill="url(#pl-parch)" stroke="#2a1408" stroke-width="1"/>`
      + `<text x="${tx}" y="38" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#7a1a10" textLength="${Math.min(240, P.title.length * 12)}" lengthAdjust="spacingAndGlyphs">${esc(P.title)}</text>`
      + `<text x="${tx}" y="58" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="11" fill="#3a2410">${esc(P.sub)}</text>`
      + `<text x="${tx}" y="74" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#3a2410">${esc(P.line)}</text>`
      + `<text x="${tx}" y="94" text-anchor="middle" font-family="Georgia, serif" font-size="13" letter-spacing="2" fill="#a82a1a">${esc(P.floor)}</text>`
      + `<text x="${tx}" y="108" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="9" fill="#3a2410">${esc(P.contents)}</text>`
      + [0, 1, 2, 3, 4].map((i) => `<rect x="${tx - 60 + i * 24}" y="117" width="24" height="5" fill="${i % 2 ? '#f4e4c0' : '#1a1410'}" stroke="#1a1410" stroke-width="0.8"/>`).join('')
      + `<text x="${tx}" y="134" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="#3a2410">one square · five feet</text>`
      + `<g transform="translate(${cw - 34} ${ch2 / 2 + 4})"><circle r="24" fill="none" stroke="#3a2410" stroke-width="0.8"/><path d="M0 -28 L5 0 L0 28 L-5 0 Z" fill="#7a1a10" stroke="#2a1408"/><path d="M-22 0 L0 4 L22 0 L0 -4 Z" fill="#3a2410"/><text y="-32" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#2a1408">N</text></g></g>`);
    const defs = `<defs>
      <filter id="pl-mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${Math.floor(r() * 99)}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -0.35"/><feComposite in2="SourceGraphic" operator="in"/></filter>
      <filter id="pl-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.45"/></filter>
      <pattern id="pl-grid" width="${T}" height="${T}" patternUnits="userSpaceOnUse" x="${ox}" y="${oy}"><path d="M${T} 0 V${T} H0" fill="none" stroke="#1a1008" stroke-width="0.7" opacity="0.22"/></pattern>
      <pattern id="pl-tile" width="${T / 2}" height="${T / 2}" patternUnits="userSpaceOnUse"><rect width="${T / 2}" height="${T / 2}" fill="#9a3a26"/><path d="M${T / 2} 0 V${T / 2} H0" fill="none" stroke="#6a2214" stroke-width="1"/></pattern>
      <pattern id="pl-flag" width="${T}" height="${T}" patternUnits="userSpaceOnUse"><rect width="${T}" height="${T}" fill="#8a8a86"/><path d="M0 9 L10 7 L12 0 M10 7 L13 16 L24 14 M13 16 L9 24 M0 18 L9 24" stroke="#5a5a56" stroke-width="1.1" fill="none"/><rect x="2" y="2" width="6" height="4" fill="#9a9a96"/><rect x="15" y="17" width="6" height="5" fill="#7a7a76"/></pattern>
      <pattern id="pl-plank" width="${T}" height="${T / 4}" patternUnits="userSpaceOnUse"><rect width="${T}" height="${T / 4}" fill="#8a5a2a"/><path d="M0 ${T / 4 - 0.5} H${T} M${T * 0.6} 0 V${T / 4}" stroke="#5a3214" stroke-width="1"/></pattern>
      <pattern id="pl-conc" width="${T}" height="${T}" patternUnits="userSpaceOnUse"><rect width="${T}" height="${T}" fill="#a8a296"/><circle cx="5" cy="7" r="1" fill="#8a847a"/><circle cx="17" cy="15" r="1.4" fill="#8a847a"/><path d="M12 0 l3 8 l-2 6" stroke="#8a847a" stroke-width="0.7" fill="none"/></pattern>
      <pattern id="pl-pave" width="${T / 2}" height="${T / 2}" patternUnits="userSpaceOnUse"><rect width="${T / 2}" height="${T / 2}" fill="#d8c8a8"/><path d="M${T / 2} 0 V${T / 2} H0" fill="none" stroke="#b8a888" stroke-width="1"/></pattern>
      <pattern id="pl-corr" width="5" height="${T}" patternUnits="userSpaceOnUse"><rect width="5" height="${T}" fill="#8a8e94"/><rect width="2.5" height="${T}" fill="#6a6e74"/><rect x="0" y="0" width="5" height="${T}" fill="#a8542e" opacity="0.25"/></pattern>
      <pattern id="pl-mesh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 H6 M0 0 V6" stroke="#4a4a44" stroke-width="1"/></pattern>
      <pattern id="pl-haz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#1a1a1a"/><rect width="3" height="6" fill="#e8c030"/></pattern>
      <linearGradient id="pl-parch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6ead0"/><stop offset="1" stop-color="#e2d0a8"/></linearGradient>
    </defs>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${out.join('')}</svg>`;
  };

  /** The plan for a pin on the map (its id, or the level it opens), or null. */
  HN.placePlan = function (p) {
    if (!p) return null;
    const id = HN.PLANS[p.id] ? p.id : Object.keys(HN.PLANS).find((k) => HN.PLANS[k].level === p.level);
    return id || null;
  };
  const cache = new Map();
  HN.planURL = function (id) {
    if (!cache.has(id)) {
      const s = HN.planSVG(id);
      cache.set(id, s ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) : null);
    }
    return cache.get(id);
  };
  /** The plan as an element (inline, so its lettering uses the page's blackletter); click it to see it full size. */
  HN.planElement = function (id, cls) {
    const s = HN.planSVG(id);
    if (!s) return null;
    const el = h('div', { class: 'hn-plan ' + (cls || ''), title: 'Click to see the plan full size' });
    el.innerHTML = s;
    const svg = el.firstChild;
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      HN.openPlan(id);
    });
    return el;
  };
  /** The plan full size, over everything: scroll about it, click or Escape to close. */
  HN.openPlan = function (id) {
    const s = HN.planSVG(id);
    if (!s) return;
    const view = h('div', { class: 'hn-plan-view' });
    view.innerHTML = s;
    const close = () => {
      view.remove();
      window.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    view.addEventListener('click', close);
    window.addEventListener('keydown', onKey, true);
    document.body.appendChild(view);
  };

  // the blackletter for the labels (Google Fonts), and how plans sit in a panel and full size
  if (!document.querySelector('link[data-hn-plan-font]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&display=swap';
    link.setAttribute('data-hn-plan-font', '');
    document.head.appendChild(link);
  }
  const css = document.createElement('style');
  css.textContent = `
    .hn-plan { margin: 0 0 12px; border: 3px solid #4a2a12; background: #d8b07a; cursor: zoom-in; line-height: 0; }
    .hn-plan svg { width: 100%; height: auto; display: block; }
    .hn-arrive .hn-plan { margin: 0; border: 0; }
    .hn-plan-view { position: fixed; inset: 0; z-index: 9999; background: rgba(8,6,4,0.92); overflow: auto; cursor: zoom-out; display: grid; place-items: center; padding: 20px; }
    .hn-plan-view svg { max-width: none; box-shadow: 0 10px 50px rgba(0,0,0,0.8); }
  `;
  document.head.appendChild(css);
})();
