/* HaveNot — packs/hn-rules/epilogue.js
 * How a run ends. There are three ways:
 *   death       LM.onDeath: an epilogue built from the run (the ledger, the tally, the objectives),
 *               the checkpoint is cleared and the run is over (HaveNot has no "try again from the floor")
 *   retirement  the terminal at home: hang up the satchel and read what the wastes will say about you
 *   the slice   resolving the Anomalous Structure's inner core: an epilogue, then you may keep playing
 *               (the near area stays open) or retire
 * HN.epilogue(game, how, extra) builds the text; HN.endRun(game, how) shows it and clears the save.
 */
'use strict';
(function () {
  const LM = window.LM;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;

  const CORE_ENDINGS = {
    silenced: 'You talked the inner core into a long-overdue retirement. Across the near area the ad screens went dark, and for the first time in three centuries people looked at the sky instead of a product.',
    seized: 'You took the inner core for yourself. Somewhere in Boom-Town a salvage broker is already selling “genuine agency hypnotics”, and you know exactly whose they are.',
    smashed: 'You smashed the inner core. The Anomalous Structure screamed in every voice it had ever used to sell you something, and then it was only a building.',
  };

  HN.epilogue = function (game, how, extra) {
    const s = HN.st(game);
    const paras = [];
    const who = s.name + ', ' + (HN.ORIGINS[s.origin] || { name: 'scavenger' }).name.toLowerCase();
    if (how === 'death') {
      const where = game.level ? game.level.def.name : 'the wastes';
      const cause = game.deathCause;
      const by = cause && cause.source && cause.source.def ? ' (' + (cause.source.def.name || 'something') + ')' : '';
      paras.push(who + ', died in ' + where + by + ' on mission ' + Math.max(1, s.mission) + '. Out here nobody comes to collect you. Something will collect your gear.');
    } else if (how === 'retire') {
      paras.push(who + ', hung up the satchel after ' + s.mission + ' mission' + (s.mission === 1 ? '' : 's') + '. The bunker door stays shut now, and that is its own kind of winning.');
    } else if (how === 'slice') {
      paras.push(who + ', walked out of the Anomalous Structure’s inner core alive.');
      if (CORE_ENDINGS[extra]) paras.push(CORE_ENDINGS[extra]);
    }
    const done = Object.entries(s.objectives).filter(([, v]) => v === 'done').map(([k]) => HN.OBJECTIVES[k] && HN.OBJECTIVES[k].name).filter(Boolean);
    if (done.length) paras.push('Done along the way: ' + done.join(', ') + '.');
    if (s.objectives.power === 'done') paras.push('The Out-rider Outpost keeps its lights on, and its mechanic tells your story to anyone who sits still long enough.');
    if (s.standing >= 3) paras.push('Boom-Town remembers you as a ' + HN.standingWord(s.standing) + '. There is a stool at the Bazaar with your name scratched into it.');
    else if (s.standing < 0) paras.push('Boom-Town remembers you as a ' + HN.standingWord(s.standing) + '. The gate guards still describe you to new recruits.');
    if (HN.flag(game, 'hnBoltHoleFound')) paras.push('You found the Bolt Hole. Whatever is in it is still waiting for whoever goes next.');
    if (HN.flag(game, 'hnSphinxOk')) paras.push('The Sphinx Gun at reception still talks about the visitor who answered its question.');
    const t = s.tally;
    paras.push('Tally: ' + t.kills + ' things killed (' + t.robots + ' robots, ' + t.bio + ' bio-weapons), ' + t.hacks + ' systems out-argued, ' + t.credits + ' credits found, ' + s.trophies.length + ' notable finds, radiation ' + s.rad + '.');
    return paras;
  };

  /** Show the epilogue and end the run (the checkpoint goes; the title screen comes back). */
  HN.endRun = function (game, how, extra, opts) {
    opts = opts || {};
    const s = HN.st(game);
    s.epilogue = { how, extra: extra || null, at: Date.now() };
    const paras = HN.epilogue(game, how, extra);
    if (!opts.keepPlaying) LM.saves.clear();
    LM.ui.open({
      kicker: how === 'death' ? 'Epilogue' : how === 'retire' ? 'Retirement' : 'The Anomalous Structure',
      title: how === 'death' ? 'You became salvage' : how === 'retire' ? 'The satchel goes on the hook' : 'The core is quiet',
      body: h('div', { class: 'hn-panel' }, paras.map((p) => h('p', { class: 'lore' }, p))),
      wide: true,
      dismissable: false,
      actions: opts.keepPlaying
        ? [
          { label: 'Keep scavenging', primary: true, onClick: () => { if (opts.after) opts.after(game); } },
          { label: 'Retire now', quiet: true, onClick: () => setTimeout(() => HN.endRun(game, 'retire'), 0) },
        ]
        : [{ label: LM.text('backToTitle'), primary: true, onClick: () => setTimeout(() => game.toTitle(), 0) }],
    });
  };

  LM.onDeath((game) => {
    if (!LM.gameInfo || LM.gameInfo.id !== 'havenot' || !game.player) return false;
    HN.endRun(game, 'death');
    return true;
  });
})();
