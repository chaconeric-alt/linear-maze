/* HaveNot — packs/hn-rules/levels.js
 * Character levels and installation Threat Levels, after the books (Vol 1 p. 82, Vol 2 pp. 38–40, Vol 3 p. 4):
 *
 *   - Each floor of an installation says its Threat Level (def.hn.threat; an installation can be Level 2 in one
 *     place and Level 3 in another). On arrival you're told it against your own level, and the HUD keeps it.
 *   - A dungeon is every floor of one location at one Threat Level: a ruin that gets deeper and harder holds
 *     several (its Threat 1 floors, its Threat 2 floors...). A dungeon at your level is cleared when you have
 *     been in about 80% of its rooms (HN.CLEAR_ROOMS, counted over all its floors from the rooms each level
 *     defines) and its boss is down, if it has one.
 *   - Going from Level N to N+1 takes N dungeons cleared at Level N (1 for Level 2, 2 for Level 3...). Each
 *     location counts once per level. Dungeons above or below you don't count: above you they are allowed, and
 *     meant to be hard to survive (every level of difference makes the monsters hit harder, HN.THREAT_GAP).
 *   - Bosses: a generated ruin names its boss on its last floor (def.hn.gen.boss, the monster's id); the floors
 *     count it down when none of them is left alive. A hand-built site uses its done flag as its boss, on its
 *     floors at the site's Threat Level (HN.INSTALLATIONS[id].threat): the Anomalous Structure's security system
 *     accepting that the agency is closed, Princess Eggbot in the Greasy Bolt Hole. Rooms count the same way
 *     everywhere.
 *   - Each level adds HN.HP_PER_LEVEL max health and HN.MELEE_PER_LEVEL melee damage, and you pick one
 *     improvement (HN.IMPROVEMENTS: data, easy to change). See games/havenot/BALANCE.md for the tuning.
 *   - Gear has a level too: an installation of Level N is stocked with Level N+1 gear. Starting gear is Level 1.
 *
 *   HN.INSTALLATIONS[id]  { name, threat, done: flag, doneText }   hand-built sites (their floors say hn.install)
 *   HN.level(game) / HN.threatHere(game) / HN.dungeon(game, loc, threat) → { rooms, seen, boss, bossDown, cleared }
 *   HN.GEAR_LEVEL.weapons[id], .armor[id]
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;

  HN.INSTALLATIONS = HN.INSTALLATIONS || {};
  Object.assign(HN.INSTALLATIONS, {
    agency: { name: 'The Anomalous Structure', threat: 1, done: 'hnAgencyClosed', bossName: 'the security system', doneText: 'the security system accepted that the agency is closed' },
  });
  HN.GEAR_LEVEL = HN.GEAR_LEVEL || { weapons: {}, armor: {} };
  Object.assign(HN.GEAR_LEVEL.weapons, { 'hn-handgun': 1, 'hn-scattergun': 1, 'hn-gauss': 1, 'hn-gauss-cap': 2, 'hn-plasma-musket': 2, 'hn-arc-carbine': 2 });
  Object.assign(HN.GEAR_LEVEL.armor, { 'hn-vest': 1, 'hn-plate': 1, 'hn-boots': 1, 'hn-filter-mask': 1, 'hn-radar-goggles': 1, 'hn-coltron': 2, 'hn-bulletscreen': 2, 'hn-carapace': 2 });
  /** How much harder an enemy hits per Threat Level the floor is above you (0.25 = +25% a level). */
  HN.THREAT_GAP = 0.25;
  HN.HP_PER_LEVEL = 15;
  HN.MELEE_PER_LEVEL = 2;
  HN.MAX_LEVEL = 10;
  /** The share of a dungeon's rooms you must have been in to clear it. */
  HN.CLEAR_ROOMS = 0.8;
  HN.clearsNeeded = (lvl) => lvl;

  /**
   * What you can pick on levelling up. Each is { name, desc, mods (player stats, per pick), apply(s) (run state) }.
   * Picks stack; s.boons[id] counts them. Read by HN.charMods (mods), and by the rules that look at s.boons.
   */
  HN.IMPROVEMENTS = {
    tough: { name: 'Hard to kill', desc: '+20 max health.', mods: { maxHp: 20 } },
    brawler: { name: 'Brawler', desc: '+8 melee damage.', melee: 8 },
    quick: { name: 'Quick on your feet', desc: '+12 ground speed.', mods: { speed: 12 } },
    senses: { name: 'Sharp senses', desc: 'Sense +1: you mark valuables and threats a tile further away.', apply: (s) => { s.stats.sense += 1; } },
    tinker: { name: 'Tinker', desc: '+2 on every hack.', hack: 2 },
    hide: { name: 'Thick hide', desc: '12% of every hit ignored (stacks with armor).', mods: { armor: 0.12 } },
    hands: { name: 'Quick hands', desc: 'Reloads take 20% less time, and an overheated gun cools 20% sooner.', reload: 0.2 },
    dash: { name: 'Slippery', desc: 'Your dash recovers 0.25 seconds sooner.', mods: { dashCooldown: -0.25 } },
    medic: { name: 'Field medic', desc: '+1 med-kit charge every mission (and a med-kit, if you had none).', med: 1 },
  };
  /** How many improvements the level-up panel offers (picked at random, without repeats). */
  HN.IMPROVEMENT_OFFER = 4;
  const boons = (s) => s.boons || {};
  HN.boonSum = (s, key) => Object.entries(boons(s)).reduce((n, [id, k]) => n + ((HN.IMPROVEMENTS[id] || {})[key] || 0) * k, 0);

  HN.level = (game) => (game && game.player ? HN.st(game).level || 1 : 1);
  HN.threatHere = (game) => (game && game.level && game.level.def.hn && game.level.def.hn.threat) || 0;
  HN.gap = (game) => Math.max(0, HN.threatHere(game) - HN.level(game));
  HN.threatWord = function (threat, lvl) {
    if (!threat) return 'Safe ground';
    const d = threat - lvl;
    return d >= 2 ? 'far above you: you will probably die here' : d === 1 ? 'above you: it will be hard to survive' : d === 0 ? 'your level: clear it to count toward your next level' : 'below you: it won’t count toward a level, but the loot spends';
  };

  // the level's share of the character's numbers
  const baseMods = HN.charMods;
  HN.charMods = function (P) {
    const m = baseMods(P);
    const s = P.data && P.data.hn;
    if (!s || !s.created) return m;
    m.maxHp = (m.maxHp || 0) + ((s.level || 1) - 1) * HN.HP_PER_LEVEL;
    for (const [id, k] of Object.entries(boons(s))) {
      const imp = HN.IMPROVEMENTS[id];
      if (imp && imp.mods) for (const [stat, v] of Object.entries(imp.mods)) m[stat] = (m[stat] || 0) + v * k;
    }
    return m;
  };
  const baseMelee = HN.meleeDamage;
  HN.meleeDamage = (s) => baseMelee(s) + ((s.level || 1) - 1) * HN.MELEE_PER_LEVEL + HN.boonSum(s, 'melee');
  const baseMental = HN.mentalBonus;
  HN.mentalBonus = (s) => baseMental(s) + HN.boonSum(s, 'hack');
  const baseKit = HN.kitFor;
  HN.kitFor = function (s) {
    const k = baseKit(s);
    k.med += HN.boonSum(s, 'med');
    return k;
  };
  // Quick hands: a shorter reload, and an overheated gun back sooner
  const reload = LM.Player.prototype.startReload;
  if (reload) LM.Player.prototype.startReload = function (...a) {
    const r = reload.apply(this, a);
    const s = this.data && this.data.hn;
    const k = s ? HN.boonSum(s, 'reload') : 0;
    if (k > 0 && this.reloadT > 0) this.reloadMax = this.reloadT = this.reloadT * Math.max(0.3, 1 - k);
    return r;
  };
  const addHeat = LM.Player.prototype.addHeat;
  if (addHeat) LM.Player.prototype.addHeat = function (w, game) {
    const r = addHeat.call(this, w, game);
    const s = this.data && this.data.hn, h = this.heat[w.id];
    const k = s ? HN.boonSum(s, 'reload') : 0;
    if (k > 0 && h && h.until > game.time && !h.quick) {
      h.until = game.time + (h.until - game.time) * Math.max(0.3, 1 - k);
      h.quick = true;
    } else if (h && h.until <= game.time) h.quick = false;
    return r;
  };

  // an enemy built for a higher level hits harder than one built for yours
  const hurtPlayer = LM.combat.hurtPlayer;
  LM.combat.hurtPlayer = function (game, P, amount, o) {
    o = o || {};
    const gap = HN.THREAT_GAP > 0 && (o.source === 'enemy' || o.type === 'status') ? HN.gap(game) : 0;
    if (gap > 0) amount *= 1 + HN.THREAT_GAP * gap;
    return hurtPlayer.call(this, game, P, amount, o);
  };

  // ------------------------------------------------------------ dungeons: a location's floors at one Threat Level
  /** The location a floor belongs to (a hand-built site's install id, a generated ruin's pin), or null. */
  HN.locOf = (def) => (def && def.hn && def.hn.threat ? def.hn.install || (def.hn.gen && (def.hn.gen.site || def.hn.gen.slug)) || def.hn.place : null);
  HN.locName = function (loc) {
    const pin = HN.loc && HN.loc(loc);
    return (HN.INSTALLATIONS[loc] && HN.INSTALLATIONS[loc].name) || (pin && pin.name) || loc;
  };
  function floorsOf(loc, threat) {
    return Object.values(LM.registry.levels).filter((d) => HN.locOf(d) === loc && d.hn.threat === threat);
  }
  /** Where a dungeon stands: rooms seen of rooms there are, and its boss. */
  HN.dungeon = function (game, loc, threat) {
    const s = HN.st(game);
    const seen = s.roomsSeen || {};
    let rooms = 0, got = 0, boss = null, bossDown = true;
    for (const d of floorsOf(loc, threat)) {
      rooms += (d.rooms || []).length;
      got += (seen[d.id] || []).length;
      if (d.hn.gen && d.hn.gen.boss) {
        boss = boss || (LM.find('enemies', d.hn.gen.boss) || {}).name || d.hn.gen.boss;
        if (!(s.bossesDown || {})[d.id]) bossDown = false;
      }
    }
    const inst = HN.INSTALLATIONS[loc];
    if (inst && inst.done && inst.threat === threat) {
      boss = boss || inst.bossName || 'the goal';
      if (!HN.flag(game, inst.done)) bossDown = false;
    }
    const need = Math.ceil(rooms * HN.CLEAR_ROOMS);
    return { loc, threat, rooms, seen: got, need, boss, bossDown, cleared: rooms > 0 && got >= need && bossDown };
  };
  const clearsAt = (s, lvl) => ((s.clears || {})[lvl] || []);

  /** Has the dungeon you're in at your level just been cleared? Then count it, and level up when it's enough. */
  HN.checkDungeon = function (game) {
    const s = HN.st(game), def = game.level.def;
    const loc = HN.locOf(def), lvl = s.level || 1;
    if (!loc || !s.created || def.hn.threat !== lvl || lvl >= HN.MAX_LEVEL) return;
    if (clearsAt(s, lvl).includes(loc)) return;
    const d = HN.dungeon(game, loc, lvl);
    if (!d.cleared) return;
    s.clears = s.clears || {};
    s.clears[lvl] = clearsAt(s, lvl).concat(loc);
    const k = s.clears[lvl].length, need = HN.clearsNeeded(lvl);
    HN.note(game, 'change', 'Cleared ' + HN.locName(loc) + ' at Threat Level ' + lvl + ' (' + k + ' of ' + need + ' for Level ' + (lvl + 1) + ').');
    if (k >= need) setTimeout(() => HN.levelUp(game, HN.locName(loc)), 1200);
    else game.toast(HN.locName(loc) + ', Threat ' + lvl + ': cleared. ' + k + ' of ' + need + ' dungeons at your level for Level ' + (lvl + 1) + '.', 'key');
  };

  // rooms you've been in, and bosses, tracked as you move (one small effect per floor, like the sense sweep)
  class DungeonWatch {
    constructor(game) {
      const def = game.level.def;
      this.rooms = def.rooms || [];
      this.boss = def.hn && def.hn.gen && def.hn.gen.boss;
      this.t = 0;
    }
    update(dt, game) {
      if ((this.t -= dt) > 0) return false;
      this.t = 0.25;
      const P = game.player;
      if (!P || P.dead || !game.level.def.hn || game.attract) return false;
      const s = HN.st(game), id = game.level.def.id;
      let changed = false;
      const tx = Math.floor(P.x / T), ty = Math.floor(P.y / T);
      const i = this.rooms.findIndex((r) => tx >= r.rect[0] && ty >= r.rect[1] && tx < r.rect[0] + r.rect[2] && ty < r.rect[1] + r.rect[3]);
      if (i >= 0) {
        s.roomsSeen = s.roomsSeen || {};
        const list = (s.roomsSeen[id] = s.roomsSeen[id] || []);
        if (!list.includes(i)) {
          list.push(i);
          changed = true;
        }
      }
      if (this.boss && !(s.bossesDown || {})[id] && !game.enemies.some((e) => !e.dead && e.def.id === this.boss)) {
        s.bossesDown = Object.assign({}, s.bossesDown, { [id]: true });
        changed = true;
        game.toast('The boss of this place is down.', 'good');
      }
      if (changed) HN.checkDungeon(game);
      return false;
    }
  }
  LM.on('levelLoaded', (game) => {
    if (!game.attract && game.player && game.level.def.hn && game.level.def.hn.threat) game.fx.push(new DungeonWatch(game));
  });
  LM.on('flag', ({ name, game }) => {
    if (!game || !game.player || !game.level || !game.level.def.hn) return;
    for (const inst of Object.values(HN.INSTALLATIONS)) if (inst.done === name) setTimeout(() => HN.checkDungeon(game), 50);
  });

  // ------------------------------------------------------------ levelling up
  HN.levelUp = function (game, where) {
    const s = HN.st(game), P = game.player;
    s.level = (s.level || 1) + 1;
    P.statsDirty = true;
    P.hp = P.stats().maxHp;
    LM.audio.play('heal');
    HN.note(game, 'change', 'Reached Level ' + s.level + (where ? ' after clearing ' + where : '') + '.');
    const ids = Object.keys(HN.IMPROVEMENTS);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const offer = ids.slice(0, HN.IMPROVEMENT_OFFER);
    const pick = (id) => {
      const imp = HN.IMPROVEMENTS[id];
      s.boons = Object.assign({}, s.boons, { [id]: (boons(s)[id] || 0) + 1 });
      if (imp.apply) imp.apply(s);
      if (imp.med && !P.gadgets.includes('hn-medkit')) P.gadgets.push('hn-medkit');
      if (imp.med && s.kitLeft) s.kitLeft.med += imp.med;
      P.statsDirty = true;
      P.hp = P.stats().maxHp;
      game.toast('Level ' + s.level + ': ' + imp.name + '.', 'good');
    };
    const open = () => {
      if (LM.ui.modalOpen) return setTimeout(open, 300);
      LM.ui.open({
        kicker: 'Level up · UbiNet', title: 'You are Level ' + s.level,
        body: h('div', { class: 'hn-panel' },
          h('p', { class: 'lore' }, 'Somewhere in the firmament the old network takes note of you' + (where ? ': ' + where + ', handled' : '') + '. It grants you “deeper access.” It feels like waking up a size larger.'),
          h('p', { class: 'muted' }, '+' + HN.HP_PER_LEVEL + ' max health (healed to full) and +' + HN.MELEE_PER_LEVEL + ' melee damage. Floors of Threat Level ' + s.level + ' are your level now; you need ' + HN.clearsNeeded(s.level) + ' of them cleared for Level ' + (s.level + 1) + '. Pick one more thing:'),
          h('div', { class: 'hn-choice' }, offer.map((id) => h('div', { class: 'hn-row', style: 'grid-template-columns:1fr' }, h('div', null, h('strong', null, HN.IMPROVEMENTS[id].name), h('span', { class: 'muted' }, ' ' + HN.IMPROVEMENTS[id].desc)))))),
        dismissable: false,
        actions: offer.map((id, i) => ({ label: HN.IMPROVEMENTS[id].name, primary: i === 0, onClick: () => pick(id) })),
      });
    };
    open();
  };

  // ------------------------------------------------------------ what you see: the HUD and the satchel
  /** The HUD's word on the dungeon you're in, when it's at your level: rooms seen, and the boss. */
  HN.hudDungeon = function (game) {
    const s = HN.st(game), def = game.level.def, lvl = s.level || 1;
    const loc = HN.locOf(def);
    const k = clearsAt(s, lvl).length, need = HN.clearsNeeded(lvl);
    const bits = ['<span>Clears <b>' + k + '/' + need + '</b></span>'];
    if (loc && def.hn.threat === lvl) {
      const d = HN.dungeon(game, loc, lvl);
      bits.push('<span' + (d.cleared ? ' style="color:#9adf6a"' : '') + '>Rooms <b>' + d.seen + '/' + d.rooms + '</b>' + (d.boss ? ' · boss <b>' + (d.bossDown ? 'down' : 'up') + '</b>' : '') + '</span>');
    }
    return bits.join('');
  };
  /** The satchel's level section: clears toward the next level, and every location you've been in at your level. */
  HN.levelPanel = function (game) {
    const s = HN.st(game), lvl = s.level || 1;
    const k = clearsAt(s, lvl).length, need = HN.clearsNeeded(lvl);
    // every location with floors at your level: the ones you've been in first
    const been = new Set();
    for (const id of Object.keys(s.roomsSeen || {})) {
      const d = LM.find('levels', id);
      if (d && HN.locOf(d)) been.add(HN.locOf(d));
    }
    const locs = new Set([...been]);
    for (const d of Object.values(LM.registry.levels)) if (HN.locOf(d) && d.hn.threat === lvl) locs.add(HN.locOf(d));
    const rows = [...locs].filter((loc) => floorsOf(loc, lvl).length).map((loc) => {
      const d = HN.dungeon(game, loc, lvl);
      return h('div', { class: 'hn-row', style: 'grid-template-columns:18px 1fr' }, h('span', null, d.cleared ? '✓' : '○'),
        h('div', null, h('strong', null, HN.locName(loc) + ', Threat ' + lvl), h('span', { class: 'muted' }, ' rooms visited ' + d.seen + ' of ' + d.rooms + ' (' + d.need + ' to clear)' + (d.boss ? ' · ' + d.boss + ': ' + (d.bossDown ? 'down' : 'still up') : ''))));
    });
    const picked = Object.entries(boons(s)).map(([id, n]) => (HN.IMPROVEMENTS[id] || { name: id }).name + (n > 1 ? ' ×' + n : ''));
    return [
      h('h3', null, 'Level ' + lvl),
      h('p', { class: 'muted' }, lvl >= HN.MAX_LEVEL ? 'The top of the chart.' : 'Dungeons cleared at Level ' + lvl + ': ' + k + ' of ' + need + '. A dungeon is a location’s floors at your Threat Level; clear one by visiting ' + Math.round(HN.CLEAR_ROOMS * 100) + '% of their rooms and putting down their boss, if they have one.'),
      rows.length ? rows : h('p', { class: 'muted' }, 'Nowhere on the map is at your level.'),
      picked.length ? h('p', { class: 'muted' }, 'Improvements: ' + picked.join(', ') + '.') : null,
    ];
  };

  // ------------------------------------------------------------ arrival: the floor's Threat Level against yours
  HN.onArrive((game, def, s) => {
    if (s.level == null && s.created) {
      // a run from before levels existed
      s.level = 1;
      game.player.statsDirty = true;
    }
    const threat = def.hn.threat || 0;
    if (!threat || !s.created) return;
    const lvl = s.level || 1;
    const d = threat - lvl;
    setTimeout(() => game.toast('Threat Level ' + threat + ' · you are Level ' + lvl + ': ' + HN.threatWord(threat, lvl) + '.', d > 0 ? 'warn' : d === 0 ? 'key' : 'good'), 900);
  });

  // ------------------------------------------------------------ gear shows its level
  const weaponStats = LM.ui.weaponStats;
  LM.ui.weaponStats = function (w) {
    const dl = weaponStats(w);
    const lvl = w && (w.hnLevel || HN.GEAR_LEVEL.weapons[w.id]);
    const extra = [];
    if (lvl) extra.push(['Level', 'L' + lvl]);
    if (w && w.hnHeavy) extra.push(['Heavy', 'slows you while it is in your hands']);
    for (const [a, b] of extra) dl.prepend(h('dt', null, a), h('dd', null, b));
    return dl;
  };
  HN.weaponLevel = (id) => {
    const w = LM.find('weapons', id);
    return (w && w.hnLevel) || HN.GEAR_LEVEL.weapons[id] || 1;
  };
  HN.armorLevel = (id) => {
    const a = LM.find('armor', id);
    return (a && a.hnLevel) || HN.GEAR_LEVEL.armor[id] || 1;
  };
})();
