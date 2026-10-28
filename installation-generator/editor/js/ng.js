/* Linear Maze Editor — js/ng.js
 * The next-generation look for one floor (engine/nextgen.js): the Floor settings section that turns it
 * on and sets its tilted camera, ceiling silhouettes and neon. Everything is saved in the floor's
 * nextGen field; a floor without it plays exactly as before.
 *   ED.ng.levelSection(draft, commit, mapEditor)   the section's controls
 *   ED.ng.slider(value, cb, o)                     a range control with its number beside it
 * The asset tools (tile sets from pictures, 3D models to sprite sheets) are on the Next gen page
 * (js/views/nextgen.js, js/ng-tiles.js, js/ng-models.js).
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms;
  const NGE = (ED.ng = ED.ng || {});
  const defaults = () => (ED.engine.LM.ng && ED.engine.LM.ng.DEFAULTS) || {};

  /** A slider: o { min, max, step, fmt }. */
  NGE.slider = function (v, cb, o) {
    o = o || {};
    const fmt = o.fmt || ((x) => String(Math.round(x * 100) / 100));
    const inp = h('input', { type: 'range', min: o.min == null ? 0 : o.min, max: o.max == null ? 1 : o.max, step: o.step || 0.01, value: v == null ? 0 : v });
    const out = h('span', { class: 'ng-val mono' }, fmt(+inp.value));
    inp.addEventListener('input', () => {
      out.textContent = fmt(+inp.value);
      cb(+inp.value);
    });
    return h('span', { class: 'ng-slider' }, inp, out);
  };
  const pct = (x) => Math.round(x * 100) + '%';

  /** Ready-made looks: each sets the parts it names. */
  NGE.PRESETS = {
    neon: { label: 'Neon noir', oblique: { on: true, tilt: 0.6, parallax: 0.25, sway: 0.4 }, ceiling: { on: true, clutter: 0.5, rim: true }, neon: { on: true, colors: ['#ff2fd0', '#22e6ff', '#9dff3a'], density: 0.45, flicker: 0.15, brightness: 1 } },
    industrial: { label: 'Industrial', oblique: { on: true, tilt: 0.5, parallax: 0.2, sway: 0.3 }, ceiling: { on: true, clutter: 0.8, pipes: true, ducts: true, cables: true, beams: true, fans: true, rim: false }, neon: { on: true, colors: ['#ffb347'], density: 0.15, flicker: 0.3, brightness: 0.7, where: 'corridors' } },
    clean: { label: 'Clean lab', oblique: { on: true, tilt: 0.45, parallax: 0.15, sway: 0.2 }, ceiling: { on: true, clutter: 0.25, cables: false, beams: false, fans: true, hanging: true }, neon: { on: true, colors: ['#9ff4ff', '#e8fbff'], density: 0.3, flicker: 0.02, style: 'double', colorMode: 'cycle' } },
    subtle: { label: 'Just the tilt', oblique: { on: true, tilt: 0.45, parallax: 0.2, sway: 0.25 }, ceiling: { on: false }, neon: { on: false } },
  };
  const PALETTES = [
    ['Synthwave', ['#ff2fd0', '#22e6ff', '#9dff3a']],
    ['Toxic', ['#7dff2f', '#d4ff3a']],
    ['Ice', ['#9ff4ff', '#4fb6ff']],
    ['Blood', ['#ff2a3a', '#ff6a2a']],
    ['Sodium', ['#ffb347']],
    ['Ultraviolet', ['#b44bff', '#ff3af0']],
  ];

  /** The Floor settings section. d is the level's draft; commit() saves it and rebuilds the map. */
  NGE.levelSection = function (d, commit, me) {
    const box = h('div', { class: 'ng-level' });
    const draw = () => {
      ED.clear(box);
      const ng = d.nextGen || {};
      const D = defaults();
      const part = (k) => Object.assign({}, D[k] || {}, ng[k] || {});
      const set = (k, field, v) => {
        d.nextGen = d.nextGen || { enabled: true };
        d.nextGen[k] = Object.assign({}, d.nextGen[k] || {}, { [field]: v });
        if (v === undefined) delete d.nextGen[k][field];
        commit();
      };
      box.appendChild(h('p', { class: 'hint' }, 'A tilted camera that stands the walls up, silhouettes overhead and neon on the walls. Only this floor changes; floors without it play exactly as before.'));
      box.appendChild(F().field('Next-generation look', F().bool(!!ng.enabled, (v) => {
        if (v) d.nextGen = Object.assign({ oblique: { on: true }, ceiling: { on: true }, neon: { on: false } }, d.nextGen || {}, { enabled: true });
        else if (d.nextGen) d.nextGen.enabled = false;
        commit();
        if (v && me && me.setNgView) me.setNgView(true);
        draw();
      }, 'On for this floor')));
      if (!ng.enabled) return;
      if (me && me.setNgView && !me.ngView) box.appendChild(h('div', { class: 'note info' }, 'The map shows it when ', h('b', null, 'Next-gen view'), ' is on in the toolbar. ', h('button', { class: 'btn tiny', on: { click: () => { me.setNgView(true); draw(); } } }, 'Show it')));
      box.appendChild(h('div', { class: 'row', style: { margin: '8px 0' } }, h('span', { class: 'muted' }, 'Start from'), Object.entries(NGE.PRESETS).map(([id, p]) => h('button', { class: 'btn tiny', on: { click: () => {
        const next = Object.assign({}, d.nextGen, { enabled: true });
        for (const k of ['oblique', 'ceiling', 'neon']) if (p[k]) next[k] = Object.assign({}, p[k]);
        d.nextGen = next;
        commit();
        draw();
      } } }, p.label))));

      // ---- the camera
      const O = part('oblique');
      const cam = h('fieldset', null, h('legend', null, 'Tilted camera'),
        F().field('Walls stand up', F().bool(O.on, (v) => { set('oblique', 'on', v); draw(); })));
      if (O.on) cam.append(
        F().field('Tilt', NGE.slider(O.tilt, (v) => set('oblique', 'tilt', v), { fmt: pct }), '0% is straight down; more shows more of each wall’s front.'),
        F().field('Wall height', NGE.slider(O.height, (v) => set('oblique', 'height', v), { min: 6, max: 30, step: 1, fmt: (x) => x + ' units' }), 'A tile is 32 units across.'),
        F().field('Parallax', NGE.slider(O.parallax, (v) => set('oblique', 'parallax', v), { fmt: pct }), 'Walls near the edges of the screen lean out, so their sides show.'),
        F().field('Sway', NGE.slider(O.sway, (v) => set('oblique', 'sway', v), { fmt: pct }), 'How much the tilt leans as the player walks.'));
      box.appendChild(cam);

      // ---- the ceiling
      const C = part('ceiling');
      const ceil = h('fieldset', null, h('legend', null, 'Ceiling silhouettes'),
        F().field('Silhouettes overhead', F().bool(C.on, (v) => { set('ceiling', 'on', v); draw(); })));
      if (C.on) {
        const kinds = [['pipes', 'Pipes'], ['ducts', 'Ducts'], ['cables', 'Hanging cables'], ['beams', 'Beams'], ['fans', 'Turning fans'], ['hanging', 'Hanging lamps']];
        const tags = me ? me.tagsOnFloor() : [];
        const listId = 'ng-tags-' + String(d.id || '').replace(/\W/g, '');
        const fanTag = F().text(C.fanTag, (v) => set('ceiling', 'fanTag', v || undefined), { mono: true, emptyUndefined: true, placeholder: 'tag name' });
        fanTag.setAttribute('list', listId);
        ceil.append(
          h('datalist', { id: listId }, tags.map((t) => h('option', { value: t }))),
          F().field('Clutter', NGE.slider(C.clutter, (v) => set('ceiling', 'clutter', v), { fmt: pct }), 'How much hangs overhead.'),
          F().field('What hangs there', h('div', { class: 'chips' }, kinds.map(([k, label]) => F().bool(C[k], (v) => set('ceiling', k, v), label)))),
          F().field('Fans over tagged tiles', fanTag, 'Paint a tag with the Tag tool where you want a fan; it gets one whatever the clutter.'),
          h('div', { class: 'grid2' },
            F().field('Fan speed', NGE.slider(C.fanSpeed, (v) => set('ceiling', 'fanSpeed', v), { max: 3, fmt: (x) => '×' + x })),
            F().field('Darkness', NGE.slider(C.opacity, (v) => set('ceiling', 'opacity', v), { min: 0.3, fmt: pct })),
            F().field('Height', NGE.slider(C.height, (v) => set('ceiling', 'height', v), { min: 1, max: 3, step: 0.05, fmt: (x) => '×' + x + ' wall' })),
            F().field('Drift', NGE.slider(C.parallax, (v) => set('ceiling', 'parallax', v), { max: 0.5, fmt: pct }))),
          h('div', { class: 'grid2' },
            F().field('Colour', F().color(C.color, (v) => set('ceiling', 'color', v || undefined))),
            F().field('Edges catch the light', F().bool(C.rim, (v) => set('ceiling', 'rim', v), 'Rim light'))),
          h('div', { class: 'actions' }, h('button', { class: 'btn small', on: { click: () => { set('ceiling', 'seed', ((C.seed | 0) + 1) % 997); } } }, 'Shuffle the layout')));
      }
      box.appendChild(ceil);

      // ---- neon
      const N = part('neon');
      const neon = h('fieldset', null, h('legend', null, 'Neon'),
        F().field('Neon tubes', F().bool(N.on, (v) => { set('neon', 'on', v); draw(); })));
      if (N.on) {
        const colors = (N.colors || []).slice();
        const colorRow = h('div', { class: 'chips' },
          colors.map((c, i) => h('span', { class: 'chip ng-color' }, F().color(c, (v) => { if (v) { colors[i] = v; set('neon', 'colors', colors.slice()); } }),
            colors.length > 1 ? h('button', { class: 'x', title: 'Remove', on: { click: () => { colors.splice(i, 1); set('neon', 'colors', colors.slice()); draw(); } } }, '×') : null)),
          h('button', { class: 'btn tiny', on: { click: () => { colors.push('#ffffff'); set('neon', 'colors', colors.slice()); draw(); } } }, '+ Colour'),
          F().select(undefined, [[undefined, 'or a palette…']].concat(PALETTES.map(([n, l]) => [l, n])), (l) => { if (l) { set('neon', 'colors', l.slice()); draw(); } }));
        const rooms = (d.rooms || []).map((r) => r.name);
        const chosen = new Set(N.rooms || []);
        const tags = me ? me.tagsOnFloor() : [];
        const listId = 'ng-ntags-' + String(d.id || '').replace(/\W/g, '');
        const tagIn = F().text(N.tag, (v) => set('neon', 'tag', v || undefined), { mono: true, emptyUndefined: true, placeholder: 'tag name' });
        tagIn.setAttribute('list', listId);
        neon.append(
          h('datalist', { id: listId }, tags.map((t) => h('option', { value: t }))),
          F().field('Colours', colorRow),
          F().field('Where', F().select(N.where || 'all', [['all', 'Any wall facing open floor'], ['rooms', 'The walls of chosen rooms'], ['corridors', 'Corridors'], ['tag', 'Only where I tag'], ['none', 'Nowhere (switched off)']], (v) => { set('neon', 'where', v); draw(); })));
        if (N.where === 'rooms') neon.append(F().field('Rooms', rooms.length ? h('div', { class: 'chips' }, rooms.map((r) => F().bool(chosen.has(r), (v) => { if (v) chosen.add(r); else chosen.delete(r); set('neon', 'rooms', [...chosen]); }, r))) : h('span', { class: 'muted' }, 'This floor has no rooms yet (Rooms, below, or the Room tool).'), 'None ticked: every named room.'));
        if (N.where === 'tag') neon.append(F().field('Tag', tagIn, 'Paint it with the Tag tool on the floor tiles (or wall tiles) along the walls that should carry a tube.'));
        neon.append(
          N.where !== 'tag' ? F().field('How many walls', NGE.slider(N.density, (v) => set('neon', 'density', v), { fmt: pct })) : null,
          h('div', { class: 'grid2' },
            F().field('Brightness', NGE.slider(N.brightness, (v) => set('neon', 'brightness', v), { max: 1.6, fmt: pct })),
            F().field('Light reaches', NGE.slider(N.radius, (v) => set('neon', 'radius', v), { min: 40, max: 260, step: 5, fmt: (x) => x + ' units' })),
            F().field('Flickering tubes', NGE.slider(N.flicker, (v) => set('neon', 'flicker', v), { fmt: pct })),
            F().field('Height on the wall', NGE.slider(N.mount, (v) => set('neon', 'mount', v), { min: 0.05, fmt: pct }))),
          h('div', { class: 'grid2' },
            F().field('Tube', F().select(N.style || 'tube', [['tube', 'One tube'], ['double', 'Two tubes'], ['dashed', 'Segments']], (v) => set('neon', 'style', v))),
            F().field('Colours go', F().select(N.colorMode || 'room', [['room', 'One per room'], ['random', 'At random'], ['cycle', 'In turn']], (v) => set('neon', 'colorMode', v)))),
          F().field('Light tag', F().text(N.lightTag, (v) => set('neon', 'lightTag', v || undefined), { mono: true, emptyUndefined: true, placeholder: 'neon' }), 'A trap’s Lights effect with this tag switches the neon on or off.'));
      }
      box.appendChild(neon);
    };
    draw();
    return box;
  };
})();
