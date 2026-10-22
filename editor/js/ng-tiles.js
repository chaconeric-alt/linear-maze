/* Linear Maze Editor — js/ng-tiles.js
 * Tile sets from your own pictures, made ready for the game. Add single tiles or whole tile sheets;
 * slice a sheet into cells; pick which cells are floor, room floor, wall top and wall front; and each
 * is cut square, brought down to the size the game draws a tile at, matched to the colours of an
 * existing tile set if you like, and its edges blended so it repeats without seams. The result is a
 * new tile set (an environment with picture floors and walls, engine/editor-runtime.js), copied from
 * one you choose for its darkness, light, particles and doors.
 *
 *   ED.ngTiles.render(el)    the Next gen page's Tile sets tab
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, M = () => ED.model;
  const NT = (ED.ngTiles = {});
  const ROLES = [
    ['floor', 'Floor', '#5cc8e8'],
    ['alt', 'Room floor', '#8fe0a0'],
    ['top', 'Wall top', '#e0b25a'],
    ['face', 'Wall front', '#f08a7a'],
  ];
  // what the importer is holding, kept while you move between pages
  const S = (NT.state = NT.state || { sources: [], role: 'floor', o: { px: 64, pixel: false, env: null, mix: 0.35, seamless: true, posterize: 0, name: '', base: null, level: null } });

  // ------------------------------------------------------------ pixels
  /** A cell of a picture as a square canvas of n × n. */
  function cut(img, rect, n, pixel) {
    let [x, y, w, hh] = rect;
    // square it, from the middle
    if (w > hh) {
      x += (w - hh) / 2;
      w = hh;
    } else if (hh > w) {
      y += (hh - w) / 2;
      hh = w;
    }
    let src = img, sx = x, sy = y, sw = w, sh = hh;
    // halve in steps: one big jump down loses the fine detail a tile needs
    if (!pixel) {
      while (sw / 2 >= n * 1.5) {
        const c = document.createElement('canvas');
        c.width = Math.round(sw / 2);
        c.height = Math.round(sh / 2);
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
        src = c;
        sx = sy = 0;
        sw = c.width;
        sh = c.height;
      }
    }
    const out = document.createElement('canvas');
    out.width = out.height = n;
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = !pixel;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, sx, sy, sw, sh, 0, 0, n, n);
    return out;
  }
  const hexRgb = (s) => {
    s = String(s || '').replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s, 16);
    return /^[0-9a-f]{6}$/i.test(s) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : null;
  };
  /** The average colour a tile set paints a part with ('floor' or 'wall'). */
  function envMean(envId, part) {
    const env = envId && ED.engine.LM.registry.environments[envId];
    if (!env) return null;
    const p = part === 'wall' ? env.wall : part === 'alt' ? env.floorAlt || env.floor : env.floor;
    const cols = [];
    const walk = (v, d) => {
      if (d > 3 || v == null) return;
      if (typeof v === 'string') {
        const c = hexRgb(v);
        if (c) cols.push(c);
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1));
      else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'style' && k !== 'edge' && k !== 'trim') walk(x, d + 1);
    };
    walk(part === 'wall' ? { top: p && p.top, face: p && p.face } : p, 0);
    if (!cols.length) return null;
    return [0, 1, 2].map((k) => cols.reduce((s, c) => s + c[k], 0) / cols.length);
  }
  /** Shift a tile's colours toward a target average, keeping its own light and shade. */
  function matchColours(c, target, mix) {
    if (!target || mix <= 0) return;
    const g = c.getContext('2d');
    const img = g.getImageData(0, 0, c.width, c.height), px = img.data;
    const mean = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue;
      mean[0] += px[i];
      mean[1] += px[i + 1];
      mean[2] += px[i + 2];
      n++;
    }
    if (!n) return;
    for (let k = 0; k < 3; k++) mean[k] /= n;
    const shift = [0, 1, 2].map((k) => (target[k] - mean[k]) * mix);
    for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) px[i + k] = px[i + k] + shift[k];
    g.putImageData(img, 0, 0);
  }
  /** Blend the edges with the middle so the tile repeats without a seam. */
  function seamless(c) {
    const n = c.width;
    const g = c.getContext('2d');
    const a = g.getImageData(0, 0, n, n).data;
    const out = g.createImageData(n, n), o = out.data;
    const band = Math.max(2, Math.round(n * 0.18));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
        const w = Math.min(1, edge / band);
        const i = (y * n + x) * 4, j = (((y + n / 2) % n) * n + ((x + n / 2) % n)) * 4;
        for (let k = 0; k < 4; k++) o[i + k] = a[i + k] * w + a[j + k] * (1 - w);
      }
    }
    g.putImageData(out, 0, 0);
  }
  function posterize(c, levels) {
    if (!(levels > 1)) return;
    const g = c.getContext('2d');
    const img = g.getImageData(0, 0, c.width, c.height), px = img.data;
    for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) px[i + k] = Math.round((px[i + k] / 255) * (levels - 1)) * (255 / (levels - 1));
    g.putImageData(img, 0, 0);
  }
  /** One chosen cell, made ready: a canvas of the chosen size. */
  function process(src, cell, role) {
    const o = S.o;
    const c = cut(src.img, cell.rect, o.px, o.pixel);
    matchColours(c, envMean(o.env, role === 'top' || role === 'face' ? 'wall' : role), o.mix);
    if (o.seamless && role !== 'face') seamless(c);
    posterize(c, o.posterize);
    return c;
  }

  // ------------------------------------------------------------ slicing sheets
  /** A likely cell size: the whole picture if it's square, else the largest common tile size that fits both sides. */
  function guessCell(w, hh) {
    if (w === hh) return w;
    if (w % hh === 0) return hh;
    if (hh % w === 0) return w;
    for (const n of [256, 128, 96, 64, 48, 32, 24, 16]) if (w % n === 0 && hh % n === 0 && w / n <= 16 && hh / n <= 16) return n;
    return Math.min(w, hh);
  }
  function cells(src) {
    const out = [];
    const { cell, gap, margin } = src;
    for (let y = margin, r = 0; y + cell <= src.img.height; y += cell + gap, r++) {
      for (let x = margin, c = 0; x + cell <= src.img.width; x += cell + gap, c++) out.push({ key: r + ',' + c, rect: [x, y, cell, cell] });
    }
    return out;
  }
  async function addFiles() {
    const inp = h('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' } });
    document.body.appendChild(inp);
    const files = await new Promise((res) => {
      inp.addEventListener('change', () => res([...inp.files]));
      inp.click();
    });
    inp.remove();
    for (const f of files) {
      const url = await ED.readFile(f, 'dataURL');
      const img = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = url;
      });
      if (!img) {
        ED.toast(f.name + ' isn’t a picture the browser can read.', 'bad');
        continue;
      }
      const cell = guessCell(img.width, img.height);
      const src = { name: f.name, img, cell, gap: 0, margin: 0, picks: {} };
      // a single tile is picked straight away for the role you're on
      if (cell === img.width && cell === img.height) src.picks['0,0'] = S.role;
      S.sources.push(src);
    }
  }

  // ------------------------------------------------------------ the tab
  NT.render = function (el) {
    const root = h('div', { class: 'ng-tiles' });
    el.appendChild(root);
    const draw = () => {
      ED.clear(root);
      const o = S.o;
      if (!o.env) o.env = M().ids('environments')[0];
      if (!o.base) o.base = o.env;
      root.appendChild(h('p', { class: 'muted' }, 'Add tiles or tile sheets (PNG, JPEG, WebP). Pick a part below, then click the cells of a sheet that are that part. Every pick is cut square, scaled to the size the game draws a tile at and matched to a tile set’s colours, then they become a new tile set.'));
      // which part the clicks pick
      root.appendChild(h('div', { class: 'row ng-roles' }, h('span', { class: 'muted' }, 'Clicking picks'), ROLES.map(([id, label, col]) => h('button', { class: 'btn small' + (S.role === id ? ' on' : ''), style: { borderColor: col }, on: { click: () => { S.role = id; draw(); } } }, h('span', { class: 'ng-dot', style: { background: col } }), label)),
        h('span', { class: 'spacer', style: { flex: 1 } }), h('button', { class: 'btn small primary', on: { click: async () => { await addFiles(); draw(); } } }, 'Add pictures…')));
      if (!S.sources.length) {
        root.appendChild(h('div', { class: 'empty' }, h('p', null, 'No pictures yet.')));
        return;
      }
      for (const src of S.sources) root.appendChild(sourceBox(src, draw));
      root.appendChild(optionsBox(draw));
      root.appendChild(resultBox(draw));
    };
    draw();
  };
  function sourceBox(src, redraw) {
    const box = h('div', { class: 'ng-source' });
    const view = h('canvas', { class: 'ng-sheet' });
    const scale = Math.min(1, 520 / src.img.width, 360 / src.img.height) * (src.img.width < 200 ? Math.min(4, 200 / src.img.width) : 1);
    view.width = Math.round(src.img.width * scale);
    view.height = Math.round(src.img.height * scale);
    const paint = () => {
      const g = view.getContext('2d');
      g.imageSmoothingEnabled = scale < 1;
      g.clearRect(0, 0, view.width, view.height);
      g.drawImage(src.img, 0, 0, view.width, view.height);
      for (const c of cells(src)) {
        const [x, y, w, hh] = c.rect.map((v) => v * scale);
        const role = src.picks[c.key];
        g.lineWidth = role ? 2.5 : 1;
        g.strokeStyle = role ? ROLES.find((r) => r[0] === role)[2] : 'rgba(255,255,255,0.25)';
        g.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1);
        if (role) {
          g.fillStyle = 'rgba(0,0,0,0.6)';
          g.fillRect(x + 2, y + 2, 16, 14);
          g.fillStyle = ROLES.find((r) => r[0] === role)[2];
          g.font = '600 11px sans-serif';
          g.fillText(ROLES.find((r) => r[0] === role)[1][0] + (role === 'alt' ? 'r' : ''), x + 5, y + 13);
        }
      }
    };
    view.addEventListener('click', (e) => {
      const r = view.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * src.img.width, py = ((e.clientY - r.top) / r.height) * src.img.height;
      const c = cells(src).find((c) => px >= c.rect[0] && px < c.rect[0] + c.rect[2] && py >= c.rect[1] && py < c.rect[1] + c.rect[3]);
      if (!c) return;
      if (src.picks[c.key] === S.role) delete src.picks[c.key];
      else {
        // a wall top and a wall front are one picture each: a new pick replaces the old one
        if (S.role === 'top' || S.role === 'face') for (const s of S.sources) for (const k of Object.keys(s.picks)) if (s.picks[k] === S.role) delete s.picks[k];
        src.picks[c.key] = S.role;
      }
      redraw();
    });
    paint();
    const n = cells(src).length;
    const later = ED.debounce(redraw, 300);
    box.append(
      h('div', { class: 'row' }, h('b', null, src.name), h('span', { class: 'muted' }, src.img.width + ' × ' + src.img.height + ' px, ' + ED.plural(n, 'cell')), h('span', { class: 'spacer', style: { flex: 1 } }),
        h('button', { class: 'btn tiny', on: { click: () => { for (const c of cells(src)) src.picks[c.key] = S.role; redraw(); } } }, 'Pick every cell'),
        h('button', { class: 'btn tiny quiet', on: { click: () => { src.picks = {}; redraw(); } } }, 'Clear picks'),
        h('button', { class: 'btn tiny quiet danger', on: { click: () => { S.sources.splice(S.sources.indexOf(src), 1); redraw(); } } }, 'Remove')),
      h('div', { class: 'ng-source-body' }, view, h('div', { class: 'subform', style: { minWidth: '200px' } },
        F().field('Cell size (px)', F().number(src.cell, (v) => { if (v >= 4) { src.cell = Math.round(v); src.picks = {}; later(); } }, { min: 4, step: 1 })),
        F().field('Gap between cells', F().number(src.gap, (v) => { src.gap = Math.max(0, Math.round(v || 0)); redraw(); }, { min: 0, step: 1 })),
        F().field('Margin', F().number(src.margin, (v) => { src.margin = Math.max(0, Math.round(v || 0)); redraw(); }, { min: 0, step: 1 })))));
    return box;
  }
  function optionsBox(redraw) {
    const o = S.o;
    const refresh = ED.debounce(redraw, 200);
    return h('fieldset', null, h('legend', null, 'Make them game-ready'),
      h('div', { class: 'subform' },
        F().field('Size of a tile', F().select(o.px, [[16, '16 px (chunky)'], [24, '24 px'], [32, '32 px (pixel art)'], [48, '48 px'], [64, '64 px (recommended)'], [96, '96 px'], [128, '128 px (big screens)']], (v) => { o.px = v; redraw(); }), 'The game draws a tile about 55 to 110 pixels across on most screens; 64 keeps the detail without bloating the game.'),
        F().field('Style', F().select(o.pixel, [[false, 'Smooth'], [true, 'Pixel art (no blur)']], (v) => { o.pixel = v; redraw(); })),
        F().field('Match the colours of', F().idSelect('environments', o.env, (v) => { o.env = v; redraw(); })),
        F().field('…by', ED.ng.slider(o.mix, (v) => { o.mix = v; refresh(); }, { fmt: (x) => Math.round(x * 100) + '%' }), '0% keeps the picture’s own colours.'),
        F().field('Repeat without seams', F().bool(o.seamless, (v) => { o.seamless = v; redraw(); }, 'Blend the edges')),
        F().field('Fewer colours', F().select(o.posterize, [[0, 'No'], [24, 'Some'], [12, 'Many fewer'], [6, 'Very few']], (v) => { o.posterize = v; redraw(); }))));
  }
  function picked() {
    const out = { floor: [], alt: [], top: [], face: [] };
    for (const src of S.sources) for (const c of cells(src)) if (src.picks[c.key]) out[src.picks[c.key]].push({ src, cell: c });
    return out;
  }
  function resultBox(redraw) {
    const o = S.o;
    const p = picked();
    const made = {};
    for (const role of Object.keys(p)) made[role] = p[role].map((x) => process(x.src, x.cell, role));
    const box = h('fieldset', null, h('legend', null, 'The tile set'));
    const strip = h('div', { class: 'row' });
    for (const [role, label, col] of ROLES) {
      for (const c of made[role]) {
        c.className = 'ng-tile';
        c.style.borderColor = col;
        c.title = label + ' (' + c.width + ' px)';
        strip.appendChild(c);
      }
    }
    if (!strip.children.length) {
      box.appendChild(h('p', { class: 'muted' }, 'Pick at least one floor cell above.'));
      return box;
    }
    box.appendChild(strip);
    box.appendChild(sampleRoom(made));
    const name = o.name || 'My tiles';
    box.appendChild(h('div', { class: 'subform' },
      F().field('Name', F().text(name, (v) => (o.name = v))),
      F().field('Darkness, light and doors from', F().idSelect('environments', o.base, (v) => (o.base = v)), 'Everything that isn’t a picture is copied from this tile set.'),
      F().field('Use it on the floor', F().select(o.level, [[null, '(not yet)']].concat(M().levelOrder().map((id) => [id, M().name('levels', id)])), (v) => (o.level = v)))));
    if (!p.floor.length) box.appendChild(h('p', { class: 'note warn' }, 'There is no floor picture yet: pick at least one Floor cell.'));
    box.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn primary', disabled: !p.floor.length, on: { click: () => make(made) } }, 'Make the tile set')));
    return box;
  }
  /** A little room laid out with the tiles, walls on three sides, so you can see them together. */
  function sampleRoom(made) {
    const W = 8, H = 6, n = 28;
    const c = h('canvas', { class: 'ng-room', width: W * n, height: H * n });
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = !S.o.pixel;
    const floor = made.floor.length ? made.floor : made.alt;
    const top = made.top[0], face = made.face[0] || made.top[0];
    let k = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const wall = y === 0 || x === 0 || x === W - 1;
        const alt = !wall && made.alt.length && x >= 4 && y >= 3;
        const pool = alt ? made.alt : floor;
        if (!wall && pool.length) g.drawImage(pool[(x * 7 + y * 13 + k++) % pool.length], x * n, y * n, n, n);
        if (wall) {
          if (top) g.drawImage(top, x * n, y * n, n, n);
          else {
            g.fillStyle = '#333';
            g.fillRect(x * n, y * n, n, n);
          }
          // the front shows where the floor is south of the wall
          if (y === 0 && x > 0 && x < W - 1 && face) {
            const fh = Math.round(n * 0.3);
            g.drawImage(face, 0, 0, face.width, face.height, x * n, y * n + n - fh, n, fh);
            g.fillStyle = 'rgba(0,0,0,0.35)';
            g.fillRect(x * n, y * n + n - fh, n, fh);
          }
        }
      }
    }
    return h('div', { class: 'ng-room-wrap' }, c, h('p', { class: 'hint' }, 'A sample room: walls on three sides, room floor in the corner.'));
  }
  async function make(made) {
    const o = S.o;
    const name = (o.name || 'My tiles').trim();
    const id = ED.uniqueId(ED.slug(name), (x) => M().exists('environments', x));
    const pics = {};
    const pic = (suffix, c) => {
      const pid = ED.uniqueId(id + '-' + suffix, (x) => !!M().sprites[x] || !!pics[x]);
      pics[pid] = c.toDataURL('image/png');
      return pid;
    };
    const floorIds = made.floor.map((c, i) => pic('floor-' + (i + 1), c));
    const altIds = made.alt.map((c, i) => pic('room-floor-' + (i + 1), c));
    const topId = made.top[0] ? pic('wall-top', made.top[0]) : null;
    const faceId = made.face[0] ? pic('wall-front', made.face[0]) : topId;
    const base = M().raw('environments', o.base) || {};
    const over = { name };
    const mean = (c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) {
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        n++;
      }
      const hx = (v) => Math.round(v / n).toString(16).padStart(2, '0');
      return '#' + hx(r) + hx(g) + hx(b);
    };
    // pictures paint; the colour keys stay for what reads them (pillars, doors, the minimap)
    over.floor = Object.assign({}, base.floor || {}, { style: 'image', images: floorIds, colors: [mean(made.floor[0])], grout: 'rgba(0,0,0,0.18)' });
    if (altIds.length) over.floorAlt = Object.assign({}, base.floorAlt || base.floor || {}, { style: 'image', images: altIds, colors: [mean(made.alt[0])], grout: 'rgba(0,0,0,0.18)' });
    if (topId) over.wall = Object.assign({ edge: '#9a917f', face: '#3a352e', faceDark: '#1b1915' }, base.wall || {}, { style: 'image-wall', topImage: topId, faceImage: faceId, top: [mean(made.top[0])], face: mean(made.face[0] || made.top[0]) });
    M().change('New tile set ' + name + ' from pictures', (E) => {
      Object.assign(M().sprites, pics);
      E.add.environments = E.add.environments || {};
      E.add.environments[id] = Object.assign({ $extends: o.base }, over);
      if (o.level) {
        E.patch.levels = E.patch.levels || {};
        const isAdded = E.add.levels && E.add.levels[o.level];
        if (isAdded) E.add.levels[o.level].environment = id;
        else E.patch.levels[o.level] = Object.assign({}, E.patch.levels[o.level] || {}, { environment: id });
      }
    }, null);
    // let the new pictures decode before the tile set page draws its swatches with them
    await Promise.all(Object.keys(pics).map((pid) => {
      const im = ED.engine.X.image(pid);
      return im && im.decode ? im.decode().catch(() => {}) : null;
    }));
    if (ED.preview.forgetTiles) ED.preview.forgetTiles();
    ED.toast('Made the tile set ' + name + (o.level ? ' and put it on ' + M().name('levels', o.level) : ''), 'good');
    ED.go('/tilesets/sets/' + encodeURIComponent(id));
  }
})();
