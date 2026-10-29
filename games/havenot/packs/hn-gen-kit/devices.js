/* HaveNot — packs/hn-gen-kit/devices.js
 * Devices: the interactable of a content library's room (props.dev on an hn-s10 / hn-s10w piece: an INT_ record).
 * Every device has a state, kept with the run (HN.st(game).devices[uid]): working, partly-working, malfunctioning,
 * disabled, active or destroyed, and a kind (companion.json `interactables`) that decides what it does:
 *
 *   heal      Use: heals (more when working, a gamble when malfunctioning). Repair (a hack) puts it right.
 *   rest      Rest: a little health and a short buff, once a mission; a broken one grabs you.
 *   credits   Use: pays out, once; a malfunctioning one charges you. Hack: more, or the alarm.
 *   data      Read: its records (a line in the Ledger) and the room's hazard, if it knows it. Hack: switches the
 *             room's hazard off.
 *   buff      Use: a buff or a regret, once a mission.
 *   salvage   Strip: parts for the satchel; stripping it breaks it.
 *   machine   Power: on (active: the room's hazard runs) or off (disabled: the hazard stops, its lights die).
 *   ceremony  Use (sit, speak, pray): a blessing, nothing, or the room's displeasure.
 *   cage      Open: something in it comes out, or something was left in it.
 *   show      Inspect, Wake: an animated display; waking it is sometimes a mistake.
 * Every device can be inspected: what it is, its state, what the record says it can do, the room's function and
 * setting, and (GM view) its hazard and loot. Destroying any working device yields salvage.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util;
  const h = (...a) => LM.ui.h(...a);
  const lore = (t) => h('p', { class: 'lore' }, t);
  const content = () => (window.LMGen && window.LMGen.libraries && window.LMGen.libraries.havenot && window.LMGen.contentOf ? window.LMGen.contentOf(window.LMGen.libraries.havenot) : null) || null;
  const dstate = (game, it) => {
    const s = HN.st(game);
    s.devices = s.devices || {};
    return s.devices[it.props.uid] || it.props.devState || 'working';
  };
  const setState = (game, it, st) => {
    const s = HN.st(game);
    s.devices = s.devices || {};
    s.devices[it.props.uid] = st;
    it.props.devState = st;
  };
  const oncePer = (game, it, what) => {
    const s = HN.st(game), k = 'dev:' + what + ':' + it.props.uid + ':' + s.mission;
    if (s.found[k]) return false;
    s.found[k] = true;
    return true;
  };
  const roomOf = (game, it) => (game.level.def.rooms || []).find((r) => it.tx >= r.rect[0] && it.ty >= r.rect[1] && it.tx < r.rect[0] + r.rect[2] && it.ty < r.rect[1] + r.rect[3]);
  const hazardIn = (game, it) => game.items.find((x) => x.def.id === 'hn-hazard' && x.props.rect && it.tx >= x.props.rect[0] && it.ty >= x.props.rect[1] && it.tx < x.props.rect[0] + x.props.rect[2] && it.ty < x.props.rect[1] + x.props.rect[3]);
  const salvageItem = (game, it) => {
    const C = content(), tl = HN.threatHere(game) || 1;
    const name = (it.props.name || 'device') + ' parts';
    HN.award(game, 'salv:' + it.props.uid, [{ type: 'gold', amount: 10 + tl * 8 }], it.name);
    game.toast('You strip the ' + (it.props.name || 'device') + ' for parts worth a little.', 'good');
    return name && C;
  };
  const zap = (game, n, why) => {
    HN.shockPlayer ? HN.shockPlayer(game, n) : LM.combat.hurtPlayer(game, game.player, n, { source: 'hazard' });
    if (why) game.toast(why, 'warn');
  };
  const stopHazard = (game, it, why) => {
    const hz = hazardIn(game, it);
    if (hz && hz.props.off && !game.hasFlag(hz.props.off)) {
      HN.setFlag(game, hz.props.off);
      game.toast(why || 'The room’s ' + hz.props.name + ' powers down.', 'good');
      return true;
    }
    return false;
  };
  const startHazard = (game, it) => {
    const hz = hazardIn(game, it);
    if (hz) {
      hz._armed = true;
      hz._cool = 0;
    }
  };

  // ------------------------------------------------------------ what each kind does: actions(game, it, st) → [{ label, run }]
  const KINDS = {
    heal: (game, it, st) => [
      st !== 'disabled' && st !== 'destroyed' && { label: 'Use it', run: () => {
        if (!oncePer(game, it, 'heal')) return LM.ui.showText(it.name, 'It has given you all it will this mission. A small screen says: COME BACK SOON. WE MISS YOU ALREADY.', 'Device');
        const P = game.player, max = P.stats().maxHp;
        if (st === 'malfunctioning' && Math.random() < 0.45) return zap(game, 8, 'It treats you for something you didn’t have.');
        LM.combat.heal(game, P, Math.round(max * (st === 'working' ? 0.3 : 0.15)));
        game.toast('The ' + it.props.name + ' patches you up' + (st === 'working' ? '.' : ', a bit.'), 'good');
      } },
      (st === 'malfunctioning' || st === 'disabled' || st === 'partly-working') && { label: 'Repair it (hack)', run: () => repair(game, it) },
    ],
    rest: (game, it, st) => [
      st !== 'destroyed' && { label: 'Rest here', run: () => {
        if (st === 'malfunctioning' && Math.random() < 0.5) {
          LM.status.apply(game, game.player, 'hn-shaken', { seconds: 2 });
          return zap(game, 4, 'The ' + it.props.name + ' grabs hold of you. It wants you to rest LONGER.');
        }
        if (!oncePer(game, it, 'rest')) return game.toast('You’ve rested here this mission. You’re not sleepy.', 'key');
        LM.combat.heal(game, game.player, 15);
        game.player.addBuff('hn-rested', 'Rested', { speed: 8 }, 60);
        game.toast('Thirty seconds of the best sleep in three hundred years. (+15 health, +8 speed for a minute)', 'good');
      } },
      { label: 'Search it', run: () => (HN.award(game, 'rest:' + it.props.uid, [{ type: 'gold', amount: 6 + Math.floor(Math.random() * 20) }], it.name) ? null : game.toast('Nothing left in it.', 'key')) },
    ],
    credits: (game, it, st) => [
      st !== 'disabled' && st !== 'destroyed' && { label: 'Use it', run: () => {
        if (st === 'malfunctioning') {
          const P = game.player, n = Math.min(P.gold, 10 + Math.floor(Math.random() * 30));
          P.gold -= n;
          return game.toast('PAYMENT ACCEPTED. You didn’t offer one. (−' + n + ' credits)', 'warn');
        }
        if (!HN.award(game, 'cred:' + it.props.uid, [{ type: 'gold', amount: (st === 'working' ? 40 : 15) + (HN.threatHere(game) || 1) * 15 }], it.name)) game.toast('It has paid out already. INSUFFICIENT FUNDS. INSUFFICIENT YOU.', 'key');
      } },
      st !== 'destroyed' && { label: 'Hack it', run: () => hack(game, it, 'Make it pay what it owes everyone who ever fed it.', () => HN.award(game, 'credh:' + it.props.uid, [{ type: 'gold', amount: 60 + (HN.threatHere(game) || 1) * 25 }], it.name), 'alarm') },
    ],
    data: (game, it, st) => [
      st !== 'destroyed' && { label: 'Read it', run: () => {
        const C = content(), rm = roomOf(game, it), hz = hazardIn(game, it);
        const lines = [(it.props.use ? 'Purpose: ' + it.props.use + '.' : ''), rm ? 'This is the ' + rm.name + '.' : ''];
        if (hz) lines.push('WARNING ON FILE: ' + hz.props.name.toUpperCase() + '. ' + (hz.props.counter ? 'Procedure: ' + hz.props.counter + '.' : ''));
        if (st === 'malfunctioning') lines.push('…the rest is static, and a jingle you will hum for a week.');
        HN.note(game, 'clue', (rm ? rm.name + ': ' : '') + 'a ' + it.props.name + ' (' + (it.props.use || 'records') + ')' + (hz ? '; warns of ' + hz.props.name : '') + '.');
        LM.ui.showText(it.name, lines.filter(Boolean).join('\n\n') || 'Records of a world that kept very good records.', 'Device');
        void C;
      } },
      st !== 'destroyed' && hazardIn(game, it) && { label: 'Hack it: safety off', run: () => hack(game, it, 'Switch the room’s safety features off from here.', () => stopHazard(game, it), 'shock') },
    ],
    buff: (game, it, st) => [
      st !== 'disabled' && st !== 'destroyed' && { label: 'Use it', run: () => {
        if (!oncePer(game, it, 'buff')) return game.toast('ONE PER CUSTOMER PER SHIFT.', 'key');
        const good = st === 'working' ? Math.random() < 0.75 : Math.random() < 0.4;
        if (good) {
          game.player.addBuff('hn-devbuff', 'Fortified', { damageMul: 0.1, speed: 8 }, 60);
          game.toast('It tastes like an advertisement and works like one. (+10% damage, +8 speed for a minute)', 'good');
        } else {
          game.player.addBuff('hn-devbuff', 'Regretful', { speed: -18 }, 25);
          game.toast('That was a mistake. Your legs agree. (−18 speed for 25 seconds)', 'warn');
        }
      } },
    ],
    salvage: (game, it, st) => [
      st !== 'destroyed' && { label: 'Strip it for parts', run: () => {
        salvageItem(game, it);
        setState(game, it, 'destroyed');
      } },
      st !== 'destroyed' && { label: 'Search it', run: () => (HN.award(game, 'srch:' + it.props.uid, [{ type: 'gold', amount: 5 + Math.floor(Math.random() * 25) }], it.name) ? null : game.toast('Already searched.', 'key')) },
    ],
    machine: (game, it, st) => [
      st !== 'destroyed' && st !== 'active' && { label: st === 'disabled' ? 'Power it up' : 'Run it', run: () => {
        if (st === 'malfunctioning' && Math.random() < 0.4) {
          setState(game, it, 'destroyed');
          return zap(game, 10, 'The ' + it.props.name + ' runs, once, very hard, and then never again.');
        }
        setState(game, it, 'active');
        startHazard(game, it);
        game.toast('The ' + it.props.name + ' grinds into life.' + (hazardIn(game, it) ? ' Something else in the room wakes with it.' : ''), hazardIn(game, it) ? 'warn' : 'key');
      } },
      st !== 'destroyed' && st !== 'disabled' && { label: 'Shut it down', run: () => {
        setState(game, it, 'disabled');
        stopHazard(game, it, 'You shut the ' + it.props.name + ' down. The room goes quiet: whatever it powered stops.');
        if (!hazardIn(game, it)) game.toast('The ' + it.props.name + ' spins down.', 'key');
      } },
      (st === 'disabled' || st === 'destroyed') && { label: 'Salvage parts', run: () => {
        salvageItem(game, it);
        setState(game, it, 'destroyed');
      } },
    ],
    ceremony: (game, it, st) => [
      st !== 'destroyed' && { label: 'Take part', run: () => {
        const roll = Math.random();
        if (roll < (st === 'working' ? 0.5 : 0.3)) {
          game.player.addBuff('hn-blessed', 'Ceremonially approved', { armor: 0.08 }, 90);
          game.toast('The ' + it.props.name + ' accepts you. You feel officially important. (+8% armor for 90 seconds)', 'good');
        } else if (roll < 0.8) game.toast('Nothing happens, with great dignity.', 'key');
        else {
          startHazard(game, it);
          zap(game, 6, 'The ' + it.props.name + ' finds you unworthy.');
        }
      } },
    ],
    cage: (game, it, st) => [
      st !== 'destroyed' && st !== 'active' && { label: 'Open it', run: () => {
        setState(game, it, 'active');
        if (Math.random() < 0.45) {
          const id = (HN.threatHere(game) || 1) >= 3 ? 'hn-chatter-a' : 'hn-roach';
          for (let i = 0; i < 2; i++) game.spawnEnemy(id, it.x + (Math.random() - 0.5) * 30, it.y + (Math.random() - 0.5) * 30, { aggro: true, summoned: true });
          game.toast('Something was still in there. It is very pleased to see you.', 'warn');
        } else HN.award(game, 'cage:' + it.props.uid, [{ type: 'gold', amount: 20 + (HN.threatHere(game) || 1) * 12 }], it.name);
      } },
    ],
    show: (game, it, st) => [
      st !== 'destroyed' && st !== 'disabled' && { label: 'Wake it', run: () => {
        setState(game, it, 'active');
        if (st === 'malfunctioning' && Math.random() < 0.35) {
          game.spawnEnemy('hn-knife', it.x + 20, it.y, { aggro: true, summoned: true });
          return game.toast('The ' + it.props.name + ' wakes up angry, and so does its security.', 'warn');
        }
        LM.ui.showText(it.name, 'The ' + it.props.name + ' stirs into its old routine' + (it.props.use ? ': to ' + it.props.use : '') + '. It performs for nobody, beautifully.', 'Device');
      } },
    ],
  };
  function repair(game, it) {
    hack(game, it, 'Coax the ' + it.props.name + ' back to working order.', () => {
      setState(game, it, 'working');
      game.toast('The ' + it.props.name + ' hums properly again.', 'good');
    }, 'shock');
  }
  function hack(game, it, text, ok, fail) {
    setTimeout(() => HN.hack(game, {
      kicker: 'Device', title: it.name, text, difficulty: 6 + (HN.threatHere(game) || 1),
      risk: fail === 'alarm' ? 'an alarm, and someone comes to see about it.' : 'a jolt through the keys (electrical).',
      onSuccess: (g) => ok(g),
      onFail: (g) => HN.failHack(g, it, fail || 'shock'),
    }), 0);
  }

  /** The panel: what it is, its state, its record, and the GM's notes. */
  HN.useDevice = function (game, it) {
    const st = dstate(game, it);
    it.props.devState = st;
    const kind = KINDS[it.props.kind] || KINDS.show;
    const acts = kind(game, it, st).filter(Boolean);
    const C = content();
    const dev = C && C.interactables[it.props.dev];
    const rm = roomOf(game, it);
    const hz = hazardIn(game, it);
    const gm = [];
    if (dev) gm.push('Record ' + dev.id + ': ' + (dev.results || []).join('; ') + '.');
    if (hz) gm.push('Hazard here: ' + hz.props.name + ' (' + hz.props.severity + ', ' + hz.props.behaviour + '). Clue: ' + hz.props.clue + '. Countermeasure: ' + hz.props.counter + '.');
    LM.ui.open({
      kicker: (rm ? rm.name : 'Device') + ' · ' + st.replace('-', ' '), title: it.name,
      body: h('div', { class: 'hn-panel' },
        lore('A ' + it.props.name + (it.props.use ? ', for ' + it.props.use : '') + '. ' + ({ working: 'It works.', 'partly-working': 'It mostly works.', malfunctioning: 'Something about it is very wrong.', disabled: 'It is switched off.', active: 'It is running.', destroyed: 'It is wrecked.' })[st]),
        gm.length ? h('p', { class: 'muted' }, gm.join(' ')) : null),
      actions: acts.map((a) => ({ label: a.label, onClick: () => { setTimeout(a.run, 0); } })).concat([{ label: 'Leave it', quiet: true }]),
    });
  };
  // the pieces that are devices get this interaction; the rest can be examined
  const examine = (game, it) => {
    const C = content(), rm = roomOf(game, it);
    const set = C && C.settings[it.props.set];
    LM.ui.showText(it.name, 'A ' + it.props.name + (it.props.odd ? ' that has no business being in here' : '') + '.' + (rm ? ' ' + rm.name + (rm.note ? ': ' + rm.note : '') : '') + (set ? '\n\n' + set.name + ' (' + set.era + ').' : ''), 'Fixture');
  };
  for (const id of ['hn-s10', 'hn-s10w']) {
    const def = LM.find('items', id);
    def.interact = {
      prompt: (it) => (it.props.dev ? 'Use the ' : 'Examine the ') + (it.props.name || 'fixture'),
      use: (it, game) => (it.props.dev ? HN.useDevice(game, it) : examine(game, it)),
    };
    def.hnValuable = (it, game) => !!it.props.dev && dstate(game, it) !== 'destroyed';
  }
  HN.DEVICE_KINDS = Object.keys(KINDS);
})();
