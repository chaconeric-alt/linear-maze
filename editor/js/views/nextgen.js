/* Linear Maze Editor — js/views/nextgen.js
 * The Next gen page: which floors use the next-generation look (engine/nextgen.js) and how, plus the
 * asset tools that go with it: tile sets made from your own pictures (js/ng-tiles.js) and 3D models
 * turned into sprite sheets (js/ng-models.js).
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, M = () => ED.model;

  ED.views.nextgen = {
    title: 'Next gen',
    render(el, args) {
      const page = h('div', { class: 'page' });
      el.appendChild(page);
      page.appendChild(h('div', { class: 'page-head' }, h('h1', null, 'Next generation')));
      page.appendChild(h('p', { class: 'muted' }, 'A tilted camera that stands walls up, silhouettes overhead and neon on the walls, floor by floor; tile sets from your own pictures; and 3D models as sprites. Floors you don’t switch on, and every game that doesn’t use this, play exactly as before.'));
      page.appendChild(ED.tabs([
        { id: 'floors', label: 'Floors', render: floorsTab },
        { id: 'tiles', label: 'Tile sets from pictures', render: () => { const d = h('div'); ED.ngTiles.render(d); return d; } },
        { id: 'models', label: '3D models', render: modelsTab, badge: ED.ngModels.list().length || null },
      ], args[0] || ED.store.get('ngTab', 'floors'), (t) => ED.store.set('ngTab', t)));
    },
  };

  // ------------------------------------------------------------ floors
  function floorsTab() {
    const box = h('div');
    const LMx = ED.engine.LM;
    const order = M().levelOrder();
    if (!order.length) return h('p', { class: 'muted' }, 'This game has no floors yet.');
    const table = h('table', { class: 'ng-floors' }, h('tr', null, h('th', null, 'Floor'), h('th', null, 'On'), h('th', null, 'Camera'), h('th', null, 'Ceiling'), h('th', null, 'Neon'), h('th', null, '')));
    for (const id of order) {
      const d = M().raw('levels', id);
      const s = LMx.ng ? LMx.ng.settings(d) : null;
      const toggle = F().bool(!!s, (v) => {
        M().update('levels', id, (dd) => {
          if (v) dd.nextGen = Object.assign({ oblique: { on: true }, ceiling: { on: true }, neon: { on: false } }, dd.nextGen || {}, { enabled: true });
          else if (dd.nextGen) dd.nextGen.enabled = false;
        }, (v ? 'Next-gen look on ' : 'Next-gen look off ') + M().name('levels', id));
        ED.rerender();
      });
      const neon = s && s.neon.on ? h('span', { class: 'row' }, (s.neon.colors || []).map((c) => h('span', { class: 'ng-dot', style: { background: c } })), h('span', { class: 'muted' }, s.neon.where)) : h('span', { class: 'muted' }, s ? 'off' : '');
      table.appendChild(h('tr', null,
        h('td', null, h('b', null, d.name || id), h('div', { class: 'muted' }, M().floorLabel(id))),
        h('td', null, toggle),
        h('td', { class: 'mono' }, s ? (s.oblique.on ? Math.round(s.oblique.tilt * 100) + '% tilt' : 'flat') : ''),
        h('td', { class: 'mono' }, s ? (s.ceiling.on ? Math.round(s.ceiling.clutter * 100) + '% clutter' : 'off') : ''),
        h('td', null, neon),
        h('td', null, h('button', { class: 'btn tiny', on: { click: () => ED.go('/map/' + encodeURIComponent(id) + '/nextgen') } }, s ? 'Change…' : 'Open the map'))));
    }
    box.appendChild(table);
    // copy one floor's settings to others
    const withNg = order.filter((id) => (M().raw('levels', id).nextGen || {}).enabled);
    if (withNg.length) {
      let from = withNg[0];
      const to = new Set();
      box.appendChild(h('fieldset', null, h('legend', null, 'Copy the look to other floors'),
        F().field('From', F().select(from, withNg.map((id) => [id, M().name('levels', id)]), (v) => (from = v))),
        F().field('To', h('div', { class: 'chips' }, order.map((id) => F().bool(false, (v) => (v ? to.add(id) : to.delete(id)), M().name('levels', id))))),
        h('div', { class: 'actions' }, h('button', { class: 'btn small', on: { click: () => {
          const src = ED.clone(M().raw('levels', from).nextGen);
          const ids = [...to].filter((x) => x !== from);
          if (!ids.length) return ED.toast('Tick the floors to copy it to.');
          M().change('Copy the next-gen look to ' + ED.plural(ids.length, 'floor'), (E) => {
            for (const id of ids) {
              if (E.add.levels && E.add.levels[id]) E.add.levels[id].nextGen = ED.clone(src);
              else {
                E.patch.levels = E.patch.levels || {};
                E.patch.levels[id] = Object.assign({}, E.patch.levels[id] || {}, { nextGen: Object.assign({ $replace: true }, ED.clone(src)) });
              }
            }
          }, ids.map((id) => ['levels', id]));
          ED.rerender();
        } } }, 'Copy'))));
    }
    box.appendChild(h('div', { class: 'note info', style: { marginTop: '14px' } }, 'Each floor’s settings are in the map editor: Floor settings → Next generation. Turn on ', h('b', null, 'Next-gen view'), ' in the map’s toolbar to see them while you paint; Play shows them as players will.'));
    return box;
  }

  // ------------------------------------------------------------ 3D models
  function modelsTab() {
    const box = h('div');
    box.appendChild(h('p', { class: 'muted' }, 'A .glb model, with or without animations, becomes a sprite sheet: drawn from every direction through the same tilted camera as your floors, and played back by the game as the thing turns, walks, attacks, is hurt and dies. Give it to a monster, an item or a person here, or from their Look tab.'));
    box.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn primary', on: { click: () => ED.ngModels.open({ done: () => ED.rerender() }) } }, 'Import a 3D model…')));
    const list = ED.ngModels.list();
    if (!list.length) {
      box.appendChild(h('p', { class: 'muted', style: { marginTop: '12px' } }, 'No models yet.'));
      return box;
    }
    for (const s of list) {
      const img = ED.engine.X.image(s.id);
      const look = ED.ngModels.lookFor(s.id);
      let kind = 'enemies', target;
      const targetBox = h('span');
      const drawTarget = () => {
        ED.clear(targetBox).appendChild(F().idSelect(kind, target, (v) => (target = v), { allowEmpty: true }));
      };
      drawTarget();
      const users = [];
      for (const k of ['enemies', 'items', 'npcs']) for (const id of M().ids(k)) {
        const l = M().raw(k, id).look;
        if (l && l.type === 'sheet' && l.sprite === s.id) users.push(M().name(k, id));
      }
      const a = s.look.anims || {};
      box.appendChild(h('div', { class: 'ng-model-row' },
        ED.ngModels.demo(look, () => img),
        h('div', { style: { flex: 1 } },
          h('h3', null, s.name || s.id), h('div', { class: 'muted mono' }, s.id + (s.source ? ' · from ' + s.source : '')),
          h('p', { class: 'muted' }, ED.plural(Object.keys(a).length, 'animation') + ' (' + Object.keys(a).join(', ') + ') × ' + s.look.dirs + ' directions, frames of ' + s.look.fw + ' × ' + s.look.fh + ' px. ' + (users.length ? 'Used by ' + users.join(', ') + '.' : 'Not used yet.')),
          h('div', { class: 'row' },
            F().select(kind, [['enemies', 'A monster'], ['items', 'An item'], ['npcs', 'A person']], (v) => { kind = v; target = undefined; drawTarget(); }),
            targetBox,
            h('button', { class: 'btn small', on: { click: () => {
              if (!target) return ED.toast('Choose who gets it.');
              M().update(kind, target, (d) => { d.look = ED.ngModels.lookFor(s.id); }, 'Give ' + M().name(kind, target) + ' the 3D model ' + (s.name || s.id));
              ED.toast(M().name(kind, target) + ' now looks like ' + (s.name || s.id), 'good');
              ED.rerender();
            } } }, 'Give it to them'),
            h('span', { class: 'spacer', style: { flex: 1 } }),
            h('button', { class: 'btn tiny quiet danger', on: { click: async () => {
              if (users.length && !(await ED.confirm('Delete ' + (s.name || s.id) + '?', 'It is used by ' + users.join(', ') + '. They will draw as a plain circle until you give them another look.', 'Delete', true))) return;
              ED.ngModels.remove(s.id);
              ED.rerender();
            } } }, 'Delete')))));
    }
    return box;
  }
})();
