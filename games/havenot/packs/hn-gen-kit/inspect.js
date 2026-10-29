/* HaveNot — packs/hn-gen-kit/inspect.js
 * Looking a room over (L), and the hazard overlay (O).
 *
 * L opens one panel for the room you stand in: its name, setting, function, what happened to it, its objects, its
 * device and that device's state, its treasure, its hazards and traps. A generated functional room says the most
 * (its record from the content library, def.rooms[i].fn); any other room lists what's in it.
 *
 * O marks every hazard on the floor where you can see it: the room it covers, its emitter and name, live or off,
 * and where its control is; traps' trigger tiles; it stays on until O again (kept with the run).
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const content = () => (window.LMGen && window.LMGen.libraries && window.LMGen.libraries.havenot && window.LMGen.contentOf ? window.LMGen.contentOf(window.LMGen.libraries.havenot) : null);
  const inRect = (rc, x, y) => x >= rc[0] && y >= rc[1] && x < rc[0] + rc[2] && y < rc[1] + rc[3];
  const tileOf = (o) => [Math.floor(o.x / T), Math.floor(o.y / T)];
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
  const off = (game, it) => game.anyFlag([it.props.off, it.props.floorOff].filter(Boolean));
  const STATE = ['intact', 'worn', 'ruined'];
  // a trap's trigger tiles: its tag's tiles on the level (zones, plates, beams)
  const trapTiles = (game, tr) => (tr.trigger && tr.trigger.tag && game.level.tags[tr.trigger.tag]) || [];

  /** The room at the player's feet: { i, room, def } (def: the level's room entry), or null. */
  HN.roomHere = function (game) {
    const L = game.level, P = game.player;
    if (!L || !P) return null;
    const [tx, ty] = tileOf(P);
    const i = L.rooms.findIndex((r) => inRect(r.rect, tx, ty));
    return i < 0 ? null : { i, room: L.rooms[i], def: (L.def.rooms || [])[i] || {} };
  };

  HN.inspectRoom = function (game) {
    const here = HN.roomHere(game);
    if (!here) return game.toast('You’re between rooms.', 'warn');
    const { room, def } = here, fn = def.fn, C = content();
    const rec = fn && C ? C.rooms[fn.id] : null;
    const set = fn && C ? C.settings[fn.setting] : null;
    const items = game.items.filter((it) => !it.dead && inRect(room.rect, ...tileOf(it)));
    const rows = [];
    const row = (k, v) => v && rows.push(h('div', { class: 'hn-row' }, h('b', {}, k + ': '), v));
    if (fn) {
      row('Setting', set ? set.name + (set.era ? ' (' + set.era + ')' : '') : fn.setting);
      row('Function', rec ? cap(rec.function) + (rec.full_name ? ' · ' + rec.full_name : '') : fn.id);
      row('Cluster', fn.cluster + (fn.relation ? ' · placed as ' + fn.relation.replace(/_/g, ' ') : ''));
      row('Condition', STATE[fn.state || 0] + (fn.descriptor ? ' · “' + fn.descriptor + '”' : '') + (fn.overlay ? ' · ' + fn.overlay : '') + (fn.twist ? ' · twist: ' + fn.twist : ''));
      if (fn.misleading && C && C.rooms[fn.misleading]) row('Misnamed', 'its sign says ' + C.rooms[fn.misleading].name + '; it is a ' + (rec ? rec.name : 'something else'));
      const mat = (id) => (C && C.tiles[id] ? C.tiles[id].description : id);
      row('Materials', [fn.floor, fn.wall, fn.light].filter(Boolean).map(mat).join(' · '));
      if (rec && rec.alternate_purpose) row('Also used for', rec.alternate_purpose);
    }
    // objects
    const pieces = items.filter((it) => /^hn-s10(w)?$/.test(it.def.id)).map((it) => it.name + (it.props.centre ? ' (centrepiece)' : '') + (it.props.odd ? ' (out of place)' : ''));
    const other = items.filter((it) => !/^hn-s10|hn-threshold|hn-hazard|hn-cache|hn-mat-light/.test(it.def.id) && it.def.name && it.def.mapColor !== 'none').map((it) => it.name || it.def.name);
    row('Furniture', pieces.length ? pieces.join(', ') : '');
    if (fn && fn.missing) row('Wouldn’t fit', fn.missing.join(', '));
    row('Also here', [...new Set(other)].slice(0, 12).join(', '));
    // the device
    for (const it of items.filter((x) => x.props && x.props.dev)) {
      const st = (HN.st(game).devices || {})[it.props.uid] || it.props.devState || 'working';
      row('Device', cap(it.props.name) + ' · ' + it.props.kind + ' · ' + st.replace('-', ' ') + (it.props.use ? ' · for ' + it.props.use : ''));
    }
    // treasure
    const loot = [];
    for (const it of items) for (const e of it.props.loot || []) {
      const d = e.hn && HN.ITEMS[e.hn];
      loot.push((d ? d.name + (d.tier ? ' (' + d.tier + ')' : '') : e.item || e.type || 'something') + (it.props.looted || it.opened ? ' (taken)' : ''));
    }
    row('Treasure', loot.length ? loot.join(', ') : '');
    // hazards and traps
    for (const it of items.filter((x) => x.def.id === 'hn-hazard')) row('Hazard', cap(it.props.name) + ' · ' + it.props.behaviour + ', ' + it.props.severity + ' · ' + (off(game, it) ? 'off' : 'live') + (it.props.counter ? ' · countermeasure: ' + it.props.counter : ''));
    const traps = (game.traps || []).filter((tr) => trapTiles(game, tr).some((p) => inRect(room.rect, p.x, p.y)));
    if (traps.length) row('Traps', traps.map((tr) => tr.trigger.type + ': ' + (tr.def.effects || []).map((e) => e.type).filter((x) => x !== 'message').join(' + ') + (tr.armed ? '' : ' (spent)')).join(', '));
    LM.ui.open({
      kicker: fn ? 'Functional room' : 'Room', title: room.name,
      body: h('div', { class: 'hn-panel' },
        room.note ? h('p', { class: 'lore' }, room.note) : null,
        rec && rec.description ? h('p', { class: 'muted' }, rec.description) : null,
        ...rows),
      actions: [
        { label: overlayOn(game) ? 'Hide the hazard overlay (O)' : 'Show the hazard overlay (O)', onClick: () => toggleOverlay(game) },
        { label: 'Close', primary: true },
      ],
    });
  };

  // ------------------------------------------------------------ the hazard overlay
  const overlayOn = (game) => !!HN.st(game).hazardOverlay;
  function toggleOverlay(game) {
    const s = HN.st(game);
    s.hazardOverlay = !s.hazardOverlay;
    game.toast(s.hazardOverlay ? 'Hazard overlay on (O to hide).' : 'Hazard overlay off.', 'key');
  }
  HN.toggleHazardOverlay = toggleOverlay;
  class Overlay {
    update(dt, game) {
      if (game.state === 'play' && !LM.ui.modalOpen) {
        if (LM.input.hit('KeyL')) HN.inspectRoom(game);
        if (LM.input.hit('KeyO')) toggleOverlay(game);
      }
      return false;
    }
    drawGlow(g, game, t) {
      if (!game.player || !overlayOn(game)) return;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      g.save();
      for (const it of game.items) {
        if (it.dead) continue;
        if (it.def.id === 'hn-hazard') {
          const live = !off(game, it), c = live ? '255,70,50' : '120,200,120';
          const rc = it.props.rect;
          if (rc) {
            g.fillStyle = 'rgba(' + c + ',' + (live ? 0.06 + 0.04 * pulse : 0.04) + ')';
            g.fillRect(rc[0] * T, rc[1] * T, rc[2] * T, rc[3] * T);
            g.strokeStyle = 'rgba(' + c + ',0.6)';
            g.setLineDash([6, 4]);
            g.lineWidth = 1.5;
            g.strokeRect(rc[0] * T + 1, rc[1] * T + 1, rc[2] * T - 2, rc[3] * T - 2);
            g.setLineDash([]);
          }
          g.strokeStyle = 'rgba(' + c + ',0.9)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(it.x, it.y, 12 + 3 * pulse, 0, U.TAU);
          g.stroke();
          g.fillStyle = 'rgba(' + c + ',0.95)';
          g.font = 'bold 9px sans-serif';
          g.textAlign = 'center';
          g.fillText(cap(it.props.name) + (live ? '' : ' (off)'), it.x, it.y - 18);
        } else if (it.def.id === 'hn-hazard-ctl') {
          g.strokeStyle = 'rgba(122,255,160,0.9)';
          g.lineWidth = 1.5;
          g.strokeRect(it.x - 8, it.y - 8, 16, 16);
        }
      }
      // traps: their trigger tiles
      g.strokeStyle = 'rgba(255,200,60,' + (0.5 + 0.4 * pulse) + ')';
      g.lineWidth = 1.5;
      for (const tr of game.traps || []) if (tr.armed) for (const p of trapTiles(game, tr)) g.strokeRect(p.x * T + 3, p.y * T + 3, T - 6, T - 6);
      g.restore();
    }
  }
  LM.on('levelLoaded', (game) => game.fx.push(new Overlay()));
  // on the title screen's list of controls
  const rows = LM.ui.controlRows;
  if (rows) LM.ui.controlRows = () => rows().concat([['L', 'Look the room over'], ['O', 'Hazard overlay']]);
})();
