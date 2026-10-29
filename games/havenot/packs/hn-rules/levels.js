/* HaveNot — packs/hn-rules/levels.js
 * Character levels and installation Threat Levels, after the books (Vol 1 p. 82, Vol 2 pp. 38–40, Vol 3 p. 4):
 *
 *   - A character starts at Level 1. Completing an installation whose Threat Level is your level or higher
 *     levels you up by one; a lower one doesn't ("you won't get a new level out of it").
 *   - Each floor of an installation says its Threat Level (def.hn.threat; an installation can be Level 2 in one
 *     place and Level 3 in another). On arrival you're told it against your own level, and the HUD keeps it.
 *   - Gear has a level too: an installation of Level N is stocked with Level N+1 gear (a Level 1 installation's
 *     armory holds Level 2 weapons). Starting gear is Level 1. The weapon cards show the level.
 *   - Each level adds 15 max health and one stat point of your choice (the "innate" growth in the books' level
 *     chart); the rest of the growth is the gear you find.
 *   - A floor above your level is meant to be hard to survive: its monsters are built for that level, and every
 *     level of difference makes their hits land harder (HN.THREAT_GAP; see games/havenot/BALANCE.md).
 *
 *   HN.INSTALLATIONS[id]  { name, threat, done: flag }  completing = the flag gets set
 *   HN.level(game) / HN.threatHere(game)
 *   HN.GEAR_LEVEL.weapons[id], .armor[id]
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;

  HN.INSTALLATIONS = HN.INSTALLATIONS || {};
  Object.assign(HN.INSTALLATIONS, {
    agency: { name: 'The Anomalous Structure', threat: 1, done: 'hnAgencyClosed', doneText: 'the security system accepted that the agency is closed' },
  });
  HN.GEAR_LEVEL = HN.GEAR_LEVEL || { weapons: {}, armor: {} };
  Object.assign(HN.GEAR_LEVEL.weapons, { 'hn-handgun': 1, 'hn-scattergun': 1, 'hn-gauss': 1, 'hn-gauss-cap': 2, 'hn-plasma-musket': 2, 'hn-arc-carbine': 2 });
  Object.assign(HN.GEAR_LEVEL.armor, { 'hn-vest': 1, 'hn-plate': 1, 'hn-boots': 1, 'hn-filter-mask': 1, 'hn-radar-goggles': 1, 'hn-coltron': 2, 'hn-bulletscreen': 2, 'hn-carapace': 2 });
  /** How much harder an enemy hits per Threat Level the floor is above you (0.25 = +25% a level). */
  HN.THREAT_GAP = 0.25;
  HN.HP_PER_LEVEL = 15;
  HN.MAX_LEVEL = 6;

  HN.level = (game) => (game && game.player ? HN.st(game).level || 1 : 1);
  HN.threatHere = (game) => (game && game.level && game.level.def.hn && game.level.def.hn.threat) || 0;
  HN.gap = (game) => Math.max(0, HN.threatHere(game) - HN.level(game));
  HN.threatWord = function (threat, lvl) {
    if (!threat) return 'Safe ground';
    const d = threat - lvl;
    return d >= 2 ? 'far above you: you will probably die here' : d === 1 ? 'above you: it will be hard to survive' : d === 0 ? 'your level: a fair fight, and a level up if you finish it' : 'below you: no level up in it, but the loot spends';
  };

  // the level's share of the character's numbers
  const baseMods = HN.charMods;
  HN.charMods = function (P) {
    const m = baseMods(P);
    const s = P.data && P.data.hn;
    if (s && s.created) m.maxHp = (m.maxHp || 0) + ((s.level || 1) - 1) * HN.HP_PER_LEVEL;
    return m;
  };

  // an enemy built for a higher level hits harder than one built for yours
  const hurtPlayer = LM.combat.hurtPlayer;
  LM.combat.hurtPlayer = function (game, P, amount, o) {
    o = o || {};
    const gap = HN.THREAT_GAP > 0 && (o.source === 'enemy' || o.type === 'status') ? HN.gap(game) : 0;
    if (gap > 0) amount *= 1 + HN.THREAT_GAP * gap;
    return hurtPlayer.call(this, game, P, amount, o);
  };

  // ------------------------------------------------------------ completing an installation
  HN.completeInstall = function (game, id) {
    const inst = HN.INSTALLATIONS[id];
    const s = HN.st(game);
    if (!inst || !s.created) return;
    s.cleared = s.cleared || {};
    if (s.cleared[id]) return;
    s.cleared[id] = { mission: s.mission, at: s.level || 1 };
    HN.note(game, 'change', 'Completed ' + inst.name + ' (Threat Level ' + inst.threat + ').');
    if (inst.threat >= (s.level || 1) && (s.level || 1) < HN.MAX_LEVEL) setTimeout(() => HN.levelUp(game, inst), 1200);
    else game.toast(inst.name + ' is complete, but it was below you: no new level from it.', 'key');
  };
  HN.levelUp = function (game, inst) {
    const s = HN.st(game), P = game.player;
    s.level = (s.level || 1) + 1;
    P.statsDirty = true;
    P.hp = P.stats().maxHp;
    LM.audio.play('heal');
    HN.note(game, 'change', 'Reached Level ' + s.level + (inst ? ' by completing ' + inst.name : '') + '.');
    const pick = (k) => {
      s.stats[k] = U.clamp(s.stats[k] + 1, 1, 8);
      s.statGains = s.statGains || [];
      s.statGains.push(k);
      P.statsDirty = true;
      P.hp = P.stats().maxHp;
      game.toast('Level ' + s.level + ': ' + k.charAt(0).toUpperCase() + k.slice(1) + ' +1.', 'good');
    };
    const open = () => {
      if (LM.ui.modalOpen) return setTimeout(open, 300);
      LM.ui.open({
        kicker: 'Level up · UbiNet', title: 'You are Level ' + s.level,
        body: h('div', { class: 'hn-panel' },
          h('p', { class: 'lore' }, 'Somewhere in the firmament the old network takes note of you: ' + (inst ? inst.doneText || 'an installation cleared' : 'a job well done') + '. It grants you “deeper access.” It feels like waking up a size larger.'),
          h('p', { class: 'muted' }, '+' + HN.HP_PER_LEVEL + ' max health (healed to full), and one point on a stat. From now on, floors of Threat Level ' + s.level + ' are your level; the gear that matches is Level ' + (s.level + 1) + ', and it is in installations of your level.')),
        dismissable: false,
        actions: [
          { label: 'Speed +1', onClick: () => pick('speed') },
          { label: 'Sense +1', onClick: () => pick('sense') },
          { label: 'Physical +1', primary: true, onClick: () => pick('physical') },
          { label: 'Mental +1', onClick: () => pick('mental') },
        ],
      });
    };
    open();
  };
  LM.on('flag', ({ name, game }) => {
    if (!game || !game.player) return;
    for (const [id, inst] of Object.entries(HN.INSTALLATIONS)) if (inst.done === name) HN.completeInstall(game, id);
  });

  // ------------------------------------------------------------ arrival: the floor's Threat Level against yours
  HN.onArrive((game, def, s) => {
    if (s.level == null && s.created) {
      // a run from before levels existed: the agency counts if it was closed
      s.level = 1;
      s.cleared = {};
      if (HN.flag(game, 'hnAgencyClosed')) {
        s.level = 2;
        s.cleared.agency = { mission: s.mission, at: 1 };
      }
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
