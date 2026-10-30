/* HaveNot — packs/hn-rules/state.js
 * The run's own state and the systems everything else leans on. All of it lives in P.data.hn
 * (saved with the player) or in story flags, so it survives floors, missions and Continue.
 *
 *   LM.HN.st(game)                     the run's state (made on first use)
 *   LM.HN.defineItems({...})           satchel items: { name, desc, cat, era, rarity, value, stack, charges, unique, use, icon }
 *   LM.HN.give(game, id, n, opts)      put n of an item in the satchel (opts.silent, opts.from)
 *   LM.HN.take(game, id, n) / count    take some out / how many there are
 *   LM.HN.award(game, lootId, entries, from)
 *                                      hand over a find once only (duplicate protection by lootId); entries are
 *                                      engine loot entries ({ type: 'gold' | 'weapon' | 'armor' | 'ammo' ... })
 *                                      or satchel entries ({ hn: 'hn-health-charge', n: 2 })
 *   LM.HN.startMission(game) / endMission(game)
 *                                      a mission runs from leaving home to coming back; kits refill when one starts
 *   LM.HN.note(game, kind, text)       a line for the Expedition Ledger (rumors, clues, world changes)
 *   LM.HN.objective(game, id, state)   'open' | 'done'
 *   LM.HN.standing(game, n, why)       Boom-Town's opinion of you
 *   LM.HN.onArrive(fn)                 fn(game, def, st) on every arrival on a HaveNot floor (after the engine's levelLoaded)
 *
 * The Satchel (C) opens the character sheet and the item list. A line under the health bar shows radiation,
 * the mission kit and grenades. The Sense stat marks valuables and threats through walls.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = (LM.HN = LM.HN || {});

  // ------------------------------------------------------------ the run's state
  HN.fresh = () => ({
    v: 1,
    created: false,
    name: 'Scavenger',
    origin: 'human', gear: 'handgun', kit: 'med',
    stats: { speed: 3, sense: 3, physical: 3, mental: 3 },
    natural: { armor: 0, melee: 0, light: 0 }, // from mutations
    mutations: [], mutSeed: 0, rerolled: false, bite: null,
    rad: 0,
    level: 1, cleared: {}, // character level and the installations completed (levels.js)
    mission: 0, inMission: false, missions: [],
    kitLeft: { med: 0, hack: 0, grenade: 0 },
    inv: {}, charges: {},
    found: {}, // unique finds already handed over
    locs: {}, // area-map pins: 'hidden' | 'known' | 'visited'
    visits: {}, // floor id -> the mission you were last there on
    standing: 0, standingLog: [],
    objectives: {},
    ledger: [], // { kind, text }
    trophies: [], // ids of notable finds
    tally: { kills: 0, robots: 0, bio: 0, credits: 0, hacks: 0, hacksFailed: 0, sold: 0 },
    homeMed: { major: 1, minor: 2 },
    epilogue: null,
  });
  HN.st = function (game) {
    const P = game.player;
    if (!P) return HN.fresh();
    if (!P.data.hn) P.data.hn = HN.fresh();
    return P.data.hn;
  };
  HN.flag = (game, f) => !!(game && game.player && game.hasFlag(f));
  HN.setFlag = (game, f) => { if (!game.hasFlag(f)) game.setFlag(f); };
  HN.inSite = (game) => !!(game.level && game.level.def.hn);
  HN.siteOf = (game) => (game.level && game.level.def.hn) || {};
  const arrivals = [];
  HN.onArrive = (fn) => arrivals.push(fn);

  // ------------------------------------------------------------ satchel items
  HN.ITEMS = {};
  HN.defineItems = function (defs) {
    for (const [id, d] of Object.entries(defs)) HN.ITEMS[id] = Object.assign({ id, stack: true, value: 0, cat: 'Salvage', era: 'Age of War', rarity: 'common' }, d);
  };
  HN.item = (id) => HN.ITEMS[id];
  HN.count = (game, id) => (HN.st(game).inv[id] || 0);
  HN.give = function (game, id, n, opts) {
    n = n == null ? 1 : n;
    opts = opts || {};
    const d = HN.ITEMS[id];
    if (!d) return console.warn('[HN] unknown item ' + id);
    const s = HN.st(game);
    s.inv[id] = (s.inv[id] || 0) + n;
    if (d.charges && s.charges[id] == null) s.charges[id] = d.charges;
    if (d.trophy && !s.trophies.includes(id)) s.trophies.push(id);
    if (!opts.silent) {
      LM.audio.play('pickup');
      game.toast((n > 1 ? n + ' × ' : '') + d.name + (opts.from ? ' (' + opts.from + ')' : ''), d.unique || d.rarity === 'rare' ? 'key' : 'good');
    }
    return n;
  };
  HN.take = function (game, id, n) {
    n = n == null ? 1 : n;
    const s = HN.st(game);
    if ((s.inv[id] || 0) < n) return false;
    s.inv[id] -= n;
    if (!s.inv[id]) delete s.inv[id];
    return true;
  };
  /** A pickup in the world that goes into the satchel: an item 'hn-loot' with props { hn, n }. */
  HN.lootName = (e) => (e.hn ? (e.n > 1 ? e.n + ' × ' : '') + ((HN.ITEMS[e.hn] || {}).name || e.hn) : e.type === 'keyItem' ? (e.info && e.info.name) || e.id : LM.ui.lootName ? LM.ui.lootName(e) : e.type);
  HN.grantAll = function (game, entries, from) {
    const got = [];
    for (const e of [].concat(entries || [])) {
      if (!e) continue;
      if (e.hn) {
        HN.give(game, e.hn, e.n || 1, { silent: true });
        got.push(HN.lootName(e));
      } else if (e.type === 'gold') {
        game.grant(e);
        HN.st(game).tally.credits += e.amount;
        got.push(e.amount + ' credits');
      } else if (e.type === 'keyItem') {
        game.giveKeyItem(e.id, e.info);
        got.push(e.info.name);
      } else if (e.type === 'flag') {
        HN.setFlag(game, e.name);
      } else {
        got.push(game.grant(e) || '');
      }
    }
    if (got.length) {
      LM.audio.play('pickup');
      game.toast((from ? from + ': ' : 'Found: ') + got.filter(Boolean).join(', '), 'good');
    }
    return got;
  };
  /** A find that exists once: the second time (another visit, a reload) it isn't handed over again. */
  HN.award = function (game, lootId, entries, from) {
    const s = HN.st(game);
    if (lootId && s.found[lootId]) return null;
    if (lootId) s.found[lootId] = true;
    return HN.grantAll(game, entries, from);
  };
  HN.hasFound = (game, lootId) => !!HN.st(game).found[lootId];

  // ------------------------------------------------------------ the ledger, objectives, standing
  HN.note = function (game, kind, text) {
    const s = HN.st(game);
    if (s.ledger.some((l) => l.text === text)) return;
    s.ledger.push({ kind, text, mission: s.mission });
    if (kind === 'clue' || kind === 'rumor') game.toast('Ledger: ' + text, 'key');
  };
  HN.OBJECTIVES = {
    silent: { name: 'The Silent Agency', text: 'Find out why the Anomalous Structure’s security is still running.' },
    power: { name: 'A Problem with the Power', text: 'Bring the Out-rider Outpost a power component: three fuel cells, or something better.' },
    bolthole: { name: 'The Bolt Hole Rumor', text: 'Find whatever reveals the Bolt Hole.' },
    access: { name: 'Corporate Access', text: 'Earn the 100 credits Boom-Town charges at the gate.' },
    campaign: { name: 'The Last Campaign', text: 'Silence the agency’s hypnotic ad system.' },
  };
  HN.objective = function (game, id, state) {
    const s = HN.st(game);
    const was = s.objectives[id];
    if (state === 'open' && was) return;
    if (was === 'done') return;
    s.objectives[id] = state;
    const o = HN.OBJECTIVES[id];
    if (o) game.toast((state === 'done' ? 'Objective complete: ' : 'New objective: ') + o.name, state === 'done' ? 'good' : 'key');
    if (state === 'done') LM.audio.play('heal');
  };
  HN.standing = function (game, n, why) {
    const s = HN.st(game);
    s.standing += n;
    if (why) s.standingLog.push((n > 0 ? '+' : '') + n + ' ' + why);
    game.toast('Boom-Town standing ' + (n > 0 ? 'rises' : 'falls') + (why ? ': ' + why : ''), n > 0 ? 'good' : 'warn');
  };
  HN.standingWord = function (n) {
    return n >= 6 ? 'Valued Citizen' : n >= 3 ? 'Good Customer' : n >= 1 ? 'Known Face' : n <= -3 ? 'Person of Interest' : n < 0 ? 'Troublemaker' : 'Stranger';
  };

  // ------------------------------------------------------------ missions
  HN.startMission = function (game) {
    const s = HN.st(game);
    if (s.inMission) return;
    s.mission += 1;
    s.inMission = true;
    s.missions.push({ n: s.mission, places: [] });
    s.kitLeft = HN.kitFor(s);
    for (const [id, d] of Object.entries(HN.ITEMS)) if (d.charges && s.inv[id]) s.charges[id] = d.charges;
    game.toast('Mission ' + s.mission + '. Kit refilled.', 'key');
  };
  HN.endMission = function (game) {
    const s = HN.st(game);
    if (!s.inMission) return;
    s.inMission = false;
    game.toast('Home. Mission ' + s.mission + ' is over.', 'good');
  };
  HN.kitFor = (s) => ({ med: s.kit === 'med' ? 3 : 0, hack: s.kit === 'hack' ? 1 : 0, grenade: s.kit === 'grenade' ? 3 : 0 });
  HN.missionNow = (game) => HN.st(game).mission;

  // ------------------------------------------------------------ prices and selling
  HN.WEAPON_VALUE = {};
  HN.ARMOR_VALUE = {};
  HN.sellPrice = function (kind, id) {
    if (kind === 'item') {
      const d = HN.ITEMS[id];
      if (!d || d.unsellable) return 0;
      return d.sell != null ? d.sell : Math.max(1, Math.round(d.value * (d.cat === 'Salvage' || d.cat === 'Fuel cell' ? 1 : 0.5)));
    }
    // weapons and armor resell at a tenth of their list value (Vol 2 p. 156)
    const v = kind === 'weapon' ? HN.WEAPON_VALUE[id] : HN.ARMOR_VALUE[id];
    return v ? Math.max(1, Math.round(v * 0.1)) : 0;
  };

  // ------------------------------------------------------------ healing
  HN.minorHeal = (game) => LM.combat.heal(game, game.player, Math.round(game.player.stats().maxHp / 3));
  HN.majorHeal = (game) => LM.combat.heal(game, game.player, game.player.stats().maxHp);
  HN.addRad = function (game, n) {
    const s = HN.st(game), P = game.player;
    if (n > 0 && P.buffs.some((b) => b.id === 'hn-antitox')) return;
    const before = s.rad;
    s.rad = U.clamp(s.rad + n, 0, 70);
    if (Math.floor(before / 5) !== Math.floor(s.rad / 5)) P.statsDirty = true;
    if (n > 0 && before < 10 && s.rad >= 10) game.toast('Radiation is eating into your health. A clinic can treat it.', 'warn');
  };
  HN.radLoss = (s) => Math.floor(s.rad / 5) * 5;

  // ------------------------------------------------------------ the HUD line
  LM.ui.addStyles(`
    .hn-hud { margin-top: 7px; display: flex; flex-wrap: wrap; gap: 4px 10px; font: 600 10.5px/1.2 var(--font-ui); letter-spacing: 0.05em; text-transform: uppercase; color: #cfc4ae; }
    .hn-hud:empty { display: none; }
    .hn-hud b { color: var(--brass); font-weight: 700; }
    .hn-hud .rad b { color: #b8ff4a; }
    .hn-panel h3 { margin: 14px 0 6px; font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: var(--brass); }
    .hn-panel h3:first-child { margin-top: 0; }
    .hn-row { display: grid; grid-template-columns: 30px 1fr auto; gap: 10px; align-items: center; padding: 7px 0; border-top: 1px solid rgba(255,255,255,0.06); }
    .hn-row .ico { width: 26px; height: 26px; border-radius: 5px; display: grid; place-items: center; font: 700 12px/1 var(--font-ui); color: #111; }
    .hn-row strong { display: block; font: 600 14px/1.25 var(--font-head); letter-spacing: 0.02em; }
    .hn-row .muted { font-size: 12px; }
    .hn-row .btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .hn-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 26px; }
    @media (max-width: 720px) { .hn-cols { grid-template-columns: 1fr; } }
    .hn-stats { display: grid; grid-template-columns: auto 1fr; gap: 3px 14px; font: 400 13px/1.4 var(--font-ui); }
    .hn-stats dt { color: #b8ad98; } .hn-stats dd { margin: 0; }
    .hn-pill { display: inline-block; padding: 2px 7px; margin: 0 4px 4px 0; border: 1px solid rgba(232,162,58,0.45); border-radius: 10px; font: 600 11px/1.3 var(--font-ui); }
    .hn-vals-sum { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0 0 10px; font: 400 13px/1.4 var(--font-ui); color: #c8bea8; }
    .hn-vals-sum b { color: var(--brass); font-weight: 700; }
    .hn-vals { display: grid; grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)); gap: 8px; margin-bottom: 4px; }
    .hn-val { position: relative; display: grid; grid-template-columns: 34px 1fr; gap: 9px; align-items: start; padding: 8px 9px; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; background: rgba(255,255,255,0.03); }
    .hn-val.rare { border-color: rgba(232,162,58,0.55); background: rgba(232,162,58,0.06); }
    .hn-val .ico { width: 34px; height: 34px; border-radius: 6px; display: grid; place-items: center; font: 700 15px/1 var(--font-ui); color: #111; }
    .hn-val strong { display: block; font: 600 13px/1.25 var(--font-head); letter-spacing: 0.01em; }
    .hn-val .muted { display: block; font-size: 11.5px; margin-top: 2px; }
    .hn-val .n { position: absolute; top: -7px; left: 26px; min-width: 22px; padding: 2px 5px; border-radius: 10px; background: var(--brass); color: #111; font: 700 11px/1.1 var(--font-ui); text-align: center; box-shadow: 0 0 0 2px rgba(9,11,15,0.9); }
    .hn-choice { display: grid; gap: 8px; margin: 8px 0 4px; }
    .hn-choice button { text-align: left; padding: 10px 12px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.12); color: inherit; cursor: pointer; font: inherit; }
    .hn-choice button.on { border-color: var(--brass); background: rgba(232,162,58,0.12); }
    .hn-choice button strong { display: block; font: 600 15px/1.25 var(--font-head); }
    .hn-choice button span { display: block; font: 400 12.5px/1.45 var(--font-ui); color: #c8bea8; margin-top: 3px; }
    .hn-risk { padding: 9px 12px; margin: 10px 0; border-left: 3px solid #e0524f; background: rgba(224,82,79,0.08); font: 400 12.5px/1.45 var(--font-ui); }
    .hn-odds { font: 700 22px/1 var(--font-head); color: var(--brass); }
  `);
  let hudEl = null;
  function hudLine(game) {
    if (!hudEl || !hudEl.isConnected) {
      for (const old of document.querySelectorAll('.hn-hud')) old.remove();
      const row = document.getElementById('status-row');
      if (!row) return;
      hudEl = h('div', { class: 'hn-hud' });
      row.parentNode.insertBefore(hudEl, row.nextSibling);
    }
    const s = HN.st(game), P = game.player;
    const bits = [];
    if (s.rad > 0) bits.push('<span class="rad">Rad <b>' + Math.round(s.rad) + '</b> (−' + HN.radLoss(s) + ' max)</span>');
    if (s.created) {
      if (s.kit === 'med' || s.kitLeft.med) bits.push('<span>Med-kit <b>' + s.kitLeft.med + '/' + HN.kitFor(s).med + '</b></span>');
      if (s.kit === 'hack') bits.push('<span>Auto-hack <b>' + s.kitLeft.hack + '</b></span>');
      const gr = HN.grenades(game);
      if (gr || s.kit === 'grenade') bits.push('<span>Grenades <b>' + gr + '</b></span>');
      if (HN.count(game, 'hn-mw-scanner')) bits.push('<span>MW scan <b>' + (s.charges['hn-mw-scanner'] || 0) + '</b></span>');
      if (s.inMission) bits.push('<span>Mission <b>' + s.mission + '</b></span>');
      const thr = HN.threatHere ? HN.threatHere(game) : 0;
      bits.push('<span>Level <b>' + (s.level || 1) + '</b></span>');
      if (thr) bits.push('<span' + (thr > (s.level || 1) ? ' style="color:#ff8a7a"' : '') + '>Threat <b>' + thr + (thr > (s.level || 1) ? ' ▲' : '') + '</b></span>');
      if (HN.hudDungeon && HN.inSite(game)) bits.push(HN.hudDungeon(game));
    }
    const html = bits.join('');
    if (hudEl._html !== html) {
      hudEl._html = html;
      hudEl.innerHTML = html;
    }
    void P;
  }
  HN.grenades = (game) => HN.st(game).kitLeft.grenade + HN.count(game, 'hn-grenade');

  // ------------------------------------------------------------ the character's numbers
  /** What the character's stats, mutations and radiation add to the player's stats (as gadget mods). */
  HN.charMods = function (P) {
    const s = P.data && P.data.hn;
    if (!s || !s.created) return {};
    const st = s.stats;
    return {
      speed: (st.speed - 3) * 10,
      maxHp: (st.physical - 3) * 20 - HN.radLoss(s),
      armor: s.natural.armor || 0,
      lightRadius: s.natural.light || 0,
    };
  };
  HN.meleeDamage = (s) => 8 + (s.stats.physical - 3) * 2 + (s.natural.melee || 0);
  HN.senseRange = (s, P) => (4 + s.stats.sense + (P && P.equip.head === 'hn-radar-goggles' ? 3 : 0) + (P && P.buffs.some((b) => b.id === 'hn-hypno') ? 3 : 0)) * T;
  HN.mentalBonus = (s) => s.stats.mental;

  // ------------------------------------------------------------ sense: valuables and threats through walls
  HN.scanUntil = 0; // the MW scanner's sweep (game time)
  class SenseFx {
    update() { return false; }
    drawGlow(g, game, t) {
      const P = game.player;
      if (!P || P.dead || game.attract) return;
      const s = HN.st(game);
      if (!s.created) return;
      const R = HN.senseRange(s, P), R2 = R * R;
      const scan = game.time < HN.scanUntil;
      const sensor = HN.count(game, 'hn-threat-sensor') > 0;
      const goggles = P.equip.head === 'hn-radar-goggles';
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      for (const e of game.enemies) {
        if (e.dead || e.vis > 0.6) continue;
        const d2 = U.dist2(e.x, e.y, P.x, P.y);
        if (d2 > R2 && !(scan && d2 < R2 * 2.2)) continue;
        G.glow(g, e.x, e.y, 10, '#ff4a3a', 0.25 + 0.2 * pulse);
        g.strokeStyle = 'rgba(255,90,70,' + (0.35 + 0.2 * pulse) + ')';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(e.x, e.y, e.r + 3, 0, U.TAU);
        g.stroke();
      }
      for (const it of game.items) {
        if (it.dead) continue;
        const d = it.def;
        const valuable = (d.isChest && !it.emptied) || (d.hnValuable && d.hnValuable(it, game));
        const threat = (sensor || scan) && d.hnThreat && d.hnThreat(it, game);
        if (!valuable && !threat) continue;
        const d2 = U.dist2(it.x, it.y, P.x, P.y);
        if (d2 > R2 * (threat ? 1.6 : 1)) continue;
        const col = threat ? '#b8ff4a' : '#f2c96b';
        G.glow(g, it.x, it.y, 9, col, 0.22 + 0.18 * pulse);
        g.save();
        g.translate(it.x, it.y);
        g.rotate(Math.PI / 4);
        g.strokeStyle = U.rgba(col, 0.5 + 0.2 * pulse);
        g.lineWidth = 1;
        g.strokeRect(-5, -5, 10, 10);
        g.restore();
        if (threat && scan) {
          g.fillStyle = U.rgba(col, 0.9);
          g.font = '700 6px "IBM Plex Mono", monospace';
          g.textAlign = 'center';
          g.fillText(typeof d.hnThreat === 'function' ? d.hnThreat(it, game) : 'HAZARD', it.x, it.y - 10);
        }
        if (scan && d.hnContents) {
          g.fillStyle = 'rgba(160,220,255,0.9)';
          g.font = '600 6px "IBM Plex Mono", monospace';
          g.textAlign = 'center';
          g.fillText(d.hnContents(it, game), it.x, it.y + 16);
        }
      }
      // traps show to the scanner and to radar goggles
      if (scan || goggles) {
        const L = game.level;
        for (const tr of game.traps) {
          if (!tr.armed) continue;
          for (const p of tr.tiles || []) {
            const x = p.x * T + T / 2, y = p.y * T + T / 2;
            if (U.dist2(x, y, P.x, P.y) > R2) continue;
            if (tr.trigger.type === 'zone' && !scan) continue;
            g.strokeStyle = 'rgba(255,60,50,' + (0.25 + 0.2 * pulse) + ')';
            g.lineWidth = 1;
            g.strokeRect(p.x * T + 4, p.y * T + 4, T - 8, T - 8);
          }
        }
        void L;
      }
    }
  }

  // ------------------------------------------------------------ hazards the pack runs: shock floors, mist, radiation
  HN.shockAt = function (game, tx, ty) {
    const d = game.level.t(tx, ty);
    return !!(d.hnShock && !HN.flag(game, 'hnTrapsOff') && (!d.hnActive || d.hnActive(game, tx, ty)));
  };
  function hazardTick(game, P, dt) {
    const s = HN.st(game);
    P._hnShockCd = (P._hnShockCd || 0) - dt;
    const tx = Math.floor(P.x / T), ty = Math.floor(P.y / T);
    if (P.falling <= 0 && P.dashT <= 0 && HN.shockAt(game, tx, ty) && P._hnShockCd <= 0) {
      P._hnShockCd = 0.5;
      const saved = P.invuln;
      P.invuln = 0;
      LM.combat.hurt(game, P, 9, { source: 'hazard', type: 'hazard', damageType: 'electric' });
      P.invuln = Math.max(P.invuln, saved);
      game.particles.burst(P.x, P.y, 6, { type: 'spark', color: '#9fe8ff', speed: 160, life: 0.2, size: 0.9 });
      LM.audio.play('arc', { throttle: 0.3, vol: 0.4 });
    }
    // radiation builds while irradiated
    if (LM.status.has(P, 'hn-irradiated')) HN.addRad(game, dt * 1.6);
    if (game.level.def.hnRad) {
      for (const z of [].concat(game.level.tags.radZone || [])) {
        if (z.x === tx && z.y === ty) {
          HN.addRad(game, dt * 2.2);
          if (Math.random() < dt * 3) game.particles.add({ type: 'ember', x: P.x + U.rand(-8, 8), y: P.y + U.rand(-8, 8), vy: -20, life: 0.6, size: 1, color: '#b8ff4a' });
          break;
        }
      }
    }
    void s;
  }

  // ------------------------------------------------------------ the BulletScreen and other armor tricks
  // A pack-level wrapper (no engine change): the Kaveros BulletScreen only stops fast physical projectiles,
  // so it soaks part of an enemy's projectile hits and nothing else.
  const hurtPlayer = LM.combat.hurtPlayer;
  LM.combat.hurtPlayer = function (game, P, amount, o) {
    o = o || {};
    if (P.equip.trinket === 'hn-bulletscreen' && o.source === 'enemy' && !o.type && !o.damageType && P.invuln <= 0) {
      P._hnScreen = P._hnScreen == null ? 40 : P._hnScreen;
      if (P._hnScreen > 0) {
        const soak = Math.min(P._hnScreen, amount * 0.7);
        P._hnScreen -= soak;
        amount -= soak;
        P._hnScreenT = 3;
        game.particles.burst(P.x, P.y, 5, { type: 'spark', color: '#9fd8ff', speed: 120, life: 0.18, size: 0.8 });
        LM.audio.play('shieldHit', { throttle: 0.1, vol: 0.6 });
      }
    }
    return hurtPlayer.call(this, game, P, amount, o);
  };

  // ------------------------------------------------------------ the satchel (C): character sheet and items
  HN.itemIcon = itemIcon;
  function itemIcon(d) {
    const ic = d.icon || {};
    return h('span', { class: 'ico', style: 'background:' + (ic.color || '#c8a060') }, ic.glyph || d.name.charAt(0));
  }
  HN.useItem = function (game, id, how) {
    const d = HN.ITEMS[id];
    if (!d || !HN.count(game, id)) return false;
    const fn = how === 'throw' ? d.throw : d.use;
    if (!fn) return false;
    if (d.charges) {
      const s = HN.st(game);
      if (!(s.charges[id] > 0)) {
        game.toast(d.name + ': no charges left this mission.', 'warn');
        return false;
      }
    }
    const r = fn(game, game.player, d);
    if (r === false) return false;
    if (d.charges) HN.st(game).charges[id] -= 1;
    else if (d.consumable !== false) HN.take(game, id, 1);
    return true;
  };
  HN.openSatchel = function (game, tab) {
    const P = game.player, s = HN.st(game);
    tab = tab || 'items';
    const render = () => {
      const st = P.stats();
      const tabs = h('div', { class: 'hn-choice', style: 'grid-template-columns:repeat(3,1fr);display:grid' },
        ['items', 'self', 'ledger'].map((k) => h('button', { type: 'button', class: k === tab ? 'on' : '', on: { click: () => { tab = k; rerender(); } } }, h('strong', null, { items: 'Satchel', self: 'Character', ledger: 'Ledger' }[k]))));
      let body;
      if (tab === 'items') {
        const ids = Object.keys(s.inv).filter((id) => HN.ITEMS[id] && s.inv[id] > 0).sort((a, b) => (HN.ITEMS[a].cat + a).localeCompare(HN.ITEMS[b].cat + b));
        body = h('div', null,
          ids.length ? ids.map((id) => {
            const d = HN.ITEMS[id], n = s.inv[id];
            const charges = d.charges ? ' · ' + (s.charges[id] || 0) + '/' + d.charges + ' charges this mission' : '';
            const btns = [];
            if (d.use) btns.push(h('button', { class: 'btn small', type: 'button', disabled: d.canUse && !d.canUse(game), on: { click: () => { LM.ui.close(); HN.useItem(game, id, 'use'); } } }, d.useLabel || 'Use'));
            if (d.throw) btns.push(h('button', { class: 'btn small quiet', type: 'button', disabled: game.level.def.armed === false, on: { click: () => { LM.ui.close(); HN.useItem(game, id, 'throw'); } } }, d.throwLabel || 'Throw'));
            return h('div', { class: 'hn-row' }, itemIcon(d),
              h('div', null, h('strong', null, d.name + (n > 1 ? ' × ' + n : '')), h('span', { class: 'muted' }, d.cat + ' · ' + d.era + (d.value ? ' · worth ' + d.value + 'c' : '') + charges), h('div', { class: 'inv-desc' }, d.desc)),
              h('div', { class: 'btns' }, btns));
          }) : h('p', { class: 'muted' }, 'Nothing yet. The ruins are full of things the present can’t make.'));
      } else if (tab === 'self') {
        const origin = (HN.ORIGINS && HN.ORIGINS[s.origin]) || { name: s.origin };
        body = h('div', { class: 'hn-cols' },
          h('div', null,
            h('h3', null, s.name + ' · ' + origin.name),
            h('dl', { class: 'hn-stats' },
              h('dt', null, 'Level'), h('dd', null, (s.level || 1) + (HN.threatHere && HN.threatHere(game) ? '  (this floor: Threat ' + HN.threatHere(game) + ')' : '')),
              h('dt', null, 'Speed'), h('dd', null, s.stats.speed + '  (' + Math.round(st.speed) + ' ground speed)'),
              h('dt', null, 'Sense'), h('dd', null, s.stats.sense + '  (marks things ' + Math.round(HN.senseRange(s, P) / T) + ' tiles away)'),
              h('dt', null, 'Physical'), h('dd', null, s.stats.physical + '  (melee ' + HN.meleeDamage(s) + (s.bite ? ', ' + s.bite : '') + ')'),
              h('dt', null, 'Mental'), h('dd', null, s.stats.mental + '  (+' + HN.mentalBonus(s) + ' on hacks)'),
              h('dt', null, 'Health'), h('dd', null, Math.ceil(P.hp) + ' / ' + st.maxHp),
              h('dt', null, 'Radiation'), h('dd', null, s.rad ? Math.round(s.rad) + ' (−' + HN.radLoss(s) + ' max health until treated)' : 'none'),
              h('dt', null, 'Natural armor'), h('dd', null, s.natural.armor ? Math.round(s.natural.armor * 100) + '%' : 'none')),
            s.mutations.length ? [h('h3', null, 'Mutations'), s.mutations.map((m) => h('span', { class: 'hn-pill', title: (HN.MUTATIONS[m] || {}).desc || '' }, (HN.MUTATIONS[m] || { name: m }).name))] : null,
            HN.levelPanel ? HN.levelPanel(game) : null),
          h('div', null,
            h('h3', null, 'Mission kit'),
            h('p', { class: 'muted' }, ({ med: 'Med-kit: three minor heals a mission (H).', hack: 'Hacker kit: +4 on hacks and one automatic hack a mission.', grenade: 'Grenades: three a mission (G).' })[s.kit] || ''),
            h('dl', { class: 'hn-stats' },
              h('dt', null, 'Mission'), h('dd', null, s.inMission ? 'Mission ' + s.mission + ' (out)' : s.mission ? 'Home after mission ' + s.mission : 'Not started'),
              h('dt', null, 'Credits'), h('dd', null, P.gold + 'c'),
              h('dt', null, 'Boom-Town'), h('dd', null, HN.standingWord(s.standing) + ' (' + s.standing + ')')),
            h('h3', null, 'Controls'),
            h('p', { class: 'muted' }, 'V melee · G grenade · R reload · H med-kit · C this satchel · E use · Tab gear · M map')));
      } else {
        const obj = Object.entries(HN.OBJECTIVES).filter(([id]) => s.objectives[id]);
        body = h('div', { class: 'hn-cols' },
          h('div', null, h('h3', null, 'Objectives'),
            obj.length ? obj.map(([id, o]) => h('div', { class: 'hn-row', style: 'grid-template-columns:18px 1fr' }, h('span', null, s.objectives[id] === 'done' ? '✓' : '○'), h('div', null, h('strong', null, o.name), h('span', { class: 'muted' }, o.text)))) : h('p', { class: 'muted' }, 'None yet.')),
          h('div', null, h('h3', null, 'Notes'),
            s.ledger.length ? s.ledger.slice(-14).reverse().map((l) => h('div', { class: 'hn-row', style: 'grid-template-columns:62px 1fr' }, h('span', { class: 'hn-pill' }, l.kind), h('span', null, l.text))) : h('p', { class: 'muted' }, 'Rumors, clues and the changes you make will be written here.')));
      }
      return h('div', { class: 'hn-panel' }, tabs, body);
    };
    let panel;
    const rerender = () => panel.querySelector('.panel-body').replaceChildren(render());
    panel = LM.ui.open({ kicker: game.floorLabel(), title: 'Satchel', body: render(), wide: true, closeOnTab: false, actions: [{ label: 'Close', primary: true, key: 'C' }] });
  };

  // ------------------------------------------------------------ valuables: the Inventory's view of what you've found
  /** What you carry to sell, trade or keep: satchel things with no use of their own (pens, mugs, crates of ping-pong
   *  balls, everything the ruins' rooms give up), not kit, grenades, food or medicine you use. */
  const NOT_VALUABLE = ['Expendable', 'Utility', 'Add-on'];
  HN.isValuable = (d) => !!d && !d.use && !d.throw && !d.charges && !NOT_VALUABLE.includes(d.cat);
  HN.valuables = function (game) {
    const s = HN.st(game);
    return Object.keys(s.inv).filter((id) => s.inv[id] > 0 && HN.isValuable(HN.ITEMS[id])).map((id) => ({ id, d: HN.ITEMS[id], n: s.inv[id] }));
  };
  HN.openValuables = function (game) {
    const list = HN.valuables(game);
    const pieces = list.reduce((a, v) => a + v.n, 0), worth = list.reduce((a, v) => a + v.n * (v.d.value || 0), 0);
    // by category, the most valuable category first; in each, the most valuable things first
    const cats = new Map();
    for (const v of list) (cats.get(v.d.cat) || cats.set(v.d.cat, []).get(v.d.cat)).push(v);
    const total = (vs) => vs.reduce((a, v) => a + v.n * (v.d.value || 0), 0);
    const groups = [...cats.entries()].sort((a, b) => total(b[1]) - total(a[1]) || a[0].localeCompare(b[0]));
    const tile = ({ d, n }) => h('div', { class: 'hn-val' + (d.rarity === 'rare' || d.unique ? ' rare' : ''), title: d.desc || '' },
      itemIcon(d), n > 1 ? h('span', { class: 'n' }, '×' + n) : null,
      h('div', null, h('strong', null, d.name),
        h('span', { class: 'muted' }, (d.value ? d.value + 'c' + (n > 1 ? ' each · ' + n * d.value + 'c' : '') : 'no price') + (d.tier ? ' · ' + d.tier : ''))));
    const body = h('div', { class: 'hn-panel' },
      list.length ? h('div', { class: 'hn-vals-sum' }, h('span', null, h('b', null, String(pieces)), pieces === 1 ? ' piece' : ' pieces'), h('span', null, h('b', null, String(list.length)), list.length === 1 ? ' kind' : ' kinds'), h('span', null, 'worth about ', h('b', null, worth + 'c'), ' (vendors pay less)')) : null,
      list.length ? groups.map(([cat, vs]) => [h('h3', null, cat + ' · ' + vs.reduce((a, v) => a + v.n, 0)), h('div', { class: 'hn-vals' }, vs.sort((a, b) => (b.d.value || 0) - (a.d.value || 0) || a.d.name.localeCompare(b.d.name)).map(tile))])
        : h('p', { class: 'muted' }, 'Nothing yet. Executive pens, mugs, crates of ping-pong balls: whatever you pick up in the ruins shows here, with how many you have.'));
    LM.ui.open({ kicker: 'Inventory', title: 'Valuables', body, wide: true, closeOnTab: true, actions: [
      { label: 'Back to inventory', key: null, onClick: () => { setTimeout(() => LM.ui.showInventory(game), 0); } },
      { label: 'Satchel', quiet: true, onClick: () => { setTimeout(() => HN.openSatchel(game), 0); } },
      { label: 'Close', primary: true },
    ] });
  };
  LM.ui.inventoryButtons.push({
    label: (game) => { const n = HN.valuables(game).reduce((a, v) => a + v.n, 0); return 'Valuables' + (n ? ' (' + n + ')' : ''); },
    available: (game) => !!HN.st(game).created,
    open: (game) => HN.openValuables(game),
  });

  // ------------------------------------------------------------ arrival on a floor
  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player) return;
    const s = HN.st(game);
    game.fx.push(new SenseFx());
    HN.scanUntil = 0;
    hudEl = null;
    const def = game.level.def;
    // floors this pack built remember the mission you were last on them, so repopulation can tell
    if (def.hn) {
      const last = s.visits[def.id];
      for (const fn of arrivals) {
        try {
          fn(game, def, s, last);
        } catch (e) {
          console.error('[HN] arrival', e);
        }
      }
      s.visits[def.id] = s.mission;
      const m = s.missions[s.missions.length - 1];
      if (m && s.inMission && def.hn.place && !m.places.includes(def.hn.place)) m.places.push(def.hn.place);
    }
  });
  LM.on('enemyDied', (e) => {
    const game = LM.game;
    if (!game || game.attract || !game.player) return;
    const s = HN.st(game);
    s.tally.kills++;
    if (e.def.robot) s.tally.robots++;
    else s.tally.bio++;
  });

  // ------------------------------------------------------------ the always-carried gadget
  LM.definePack({
    id: 'hn-rules',
    gadgets: {
      'hn-satchel': {
        name: 'Satchel', short: 'Satchel', key: 'KeyC',
        mods: (P) => HN.charMods(P),
        badge: (game) => Object.keys(HN.st(game).inv).length ? 0 : 0,
        use: (game) => HN.openSatchel(game),
        update(game, P, dt) {
          P._hnHudT = (P._hnHudT || 0) - dt;
          if (P._hnHudT <= 0) {
            P._hnHudT = 0.2;
            hudLine(game);
          }
          if (P._hnScreenT > 0) {
            P._hnScreenT -= dt;
            if (P._hnScreenT <= 0) P._hnScreen = 40;
          }
          hazardTick(game, P, dt);
        },
        drawIcon(g, W, H) {
          g.fillStyle = '#8a5a2a';
          g.fillRect(W * 0.3, H * 0.3, W * 0.4, H * 0.5);
          g.fillStyle = '#c89a4a';
          g.fillRect(W * 0.3, H * 0.3, W * 0.4, H * 0.12);
        },
      },
    },
  });
})();
