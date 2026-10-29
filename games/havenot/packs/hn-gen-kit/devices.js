/* HaveNot — packs/hn-gen-kit/devices.js
 * Devices: the interactable of a content library's room (props.dev on an hn-s10 / hn-s10w piece: an INT_ record).
 * Every device has a state, kept with the run (HN.st(game).devices[uid]): working, partly-working, malfunctioning,
 * disabled, active or destroyed, and a kind (companion.json `interactables`) that decides what it does:
 *
 *   heal      Use: heals (more when working, a gamble when malfunctioning). Repair (a hack) puts it right.
 *   rest      Rest: a little health and a short buff, once a mission; a broken one grabs you.
 *   credits   Use: pays out, once; a malfunctioning one charges you. Hack: more, or the alarm.
 *   data      Read: its records (a line in the Ledger) and the room's hazard, if it knows it. Hack: switches the
 *             room's hazard off; pulls the room's locker codes; a security console stands down the floor's
 *             alarms and identity checks.
 *   buff      Use: a buff or a regret, once a mission.
 *   salvage   Strip: parts for the satchel; stripping it breaks it.
 *   machine   Power: on (active: the room's hazard runs) or off (disabled: the hazard stops, its lights die). A
 *             power source (generator, core, turbine, reactor) shut down or wrecked also kills the lights, switch
 *             traps, turrets and other machines within 12 tiles and unseals sealed doors there.
 *   ceremony  Use (sit, speak, pray): a blessing, nothing, or the room's displeasure.
 *   cage      Open: something in it comes out, or something was left in it.
 *   show      Inspect, Wake: an animated display; waking it is sometimes a mistake.
 * Every device can be inspected: what it is, its state, what the record says it can do, the room's function and
 * setting, and (GM view) its hazard and loot. Destroying any working device yields salvage.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, T = LM.TILE;
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
  // what a piece yields when it's stripped: by what it is (a robot workshop's machines give parts, a palace's
  // thrones give fittings, a clinic's beds give supplies), as many as the floor's Threat Level warrants
  const SALVAGE = {
    'hn-salv-parts': { name: 'Machine parts', cat: 'Component', value: 30, icon: { glyph: 'C', color: '#a8b8c8' }, fams: ['machine', 'console', 'turbine', 'press', 'conveyor', 'drum', 'pipes', 'arm', 'tower', 'drone', 'furnace', 'screen', 'vat', 'window'] },
    'hn-salv-fittings': { name: 'Decorative fittings', cat: 'Valuable', value: 45, icon: { glyph: '$', color: '#ffd060' }, fams: ['throne', 'altar', 'statue', 'chandelier', 'dais', 'arch', 'coffin', 'fountain', 'mirror', 'sign', 'lamp', 'pews'] },
    'hn-salv-medical': { name: 'Medical supplies', cat: 'Medical', value: 35, icon: { glyph: '+', color: '#ff6a6a' }, fams: ['bed', 'pod', 'bath', 'washroom'] },
    'hn-salv-arms': { name: 'Weapon parts', cat: 'Military', value: 40, icon: { glyph: 'M', color: '#c84a3a' }, fams: ['weapon', 'cage'] },
    'hn-salv-scrap': { name: 'Scrap and fabric', cat: 'Salvage', value: 15, icon: { glyph: 'S', color: '#9a9a8a' }, fams: [] },
  };
  HN.defineItems(Object.fromEntries(Object.entries(SALVAGE).map(([id, d]) => [id, { name: d.name, cat: d.cat, value: d.value, icon: d.icon, tier: d.cat === 'Salvage' ? 'ordinary salvage' : 'useful equipment', desc: d.name + ', stripped from furniture and machinery in the ruins.' }])));
  HN.salvageOf = function (it) {
    const fam = it.props.fam || 'machine', name = String(it.props.name || '');
    if (/surg|medic|clinic|operating|triage|gurney/.test(name)) return 'hn-salv-medical';
    if (/weapon|gun|cannon|howitzer|missile|armou?r/.test(name)) return 'hn-salv-arms';
    for (const [id, d] of Object.entries(SALVAGE)) if (d.fams.includes(fam)) return id;
    return 'hn-salv-scrap';
  };
  const salvageItem = (game, it) => {
    const tl = HN.threatHere(game) || 1, id = HN.salvageOf(it);
    if (!HN.award(game, 'salv:' + it.props.uid, [{ type: 'gold', amount: 10 + tl * 8 }], it.name)) return;
    HN.give(game, id, 1 + Math.floor(tl / 3), { from: it.props.name });
    game.toast('You strip the ' + (it.props.name || 'device') + ' for parts.', 'good');
  };
  // stripping ordinary furniture: once a piece, kept with the run, and it stays stripped
  const pieceKey = (game, it) => game.level.def.id + ':' + it.tx + ',' + it.ty;
  const stripped = (game, it) => !!(HN.st(game).stripped || {})[pieceKey(game, it)];
  const stripPiece = (game, it) => {
    const s = HN.st(game);
    (s.stripped = s.stripped || {})[pieceKey(game, it)] = true;
    const tl = HN.threatHere(game) || 1;
    HN.give(game, HN.salvageOf(it), 1 + Math.floor(tl / 4), { from: it.props.name });
    it.props.state = 2;
    it.props.stripped = true;
  };
  LM.on('levelLoaded', (game) => {
    if (!game.player || game.attract) return;
    const s = HN.st(game);
    if (s.stripped) for (const it of game.items) if (/^hn-s10w?$/.test(it.def.id) && s.stripped[pieceKey(game, it)]) Object.assign(it.props, { state: 2, stripped: true });
  });
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
  // ------------------------------------------------------------ what a device is wired to
  // A machine's room lights go with it. A power source (a generator, core, turbine, reactor) shut down or wrecked
  // takes the floor round it with it: lights, switch traps, turrets, other machines, and any sealed security door
  // within 12 tiles. Kept with the run, and put back that way when you come back to the floor.
  const POWER = /generator|power|core\b|turbine|reactor|dynamo|battery|engine|furnace|boiler/;
  const isPower = (it) => it.props.fam === 'turbine' || POWER.test(it.props.name || '');
  const powerKey = (it) => it.props.uid || 'p' + it.tx + ',' + it.ty;
  const near = (a, b, tiles) => Math.hypot(a.x - b.x, a.y - b.y) < tiles * T;
  const roomItems = (game, it, pred) => {
    const rm = roomOf(game, it);
    return rm ? game.items.filter((x) => !x.dead && x.tx >= rm.rect[0] && x.ty >= rm.rect[1] && x.tx < rm.rect[0] + rm.rect[2] && x.ty < rm.rect[1] + rm.rect[3] && pred(x)) : [];
  };
  const lightsOut = (game, list, outv) => {
    for (const l of list) if (l.light) l.light.off = outv;
  };
  function cutPower(game, it, quiet) {
    // the room's own lights
    lightsOut(game, roomItems(game, it, (x) => x.def.id === 'hn-mat-light'), true);
    if (!isPower(it)) return;
    const R = 12;
    let traps = 0, turrets = 0, doors = 0, machines = 0;
    lightsOut(game, game.items.filter((x) => x.def.id === 'hn-mat-light' && near(x, it, R)), true);
    for (const tr of game.traps || []) {
      if (!tr.armed || tr.def.gen !== 'switch') continue;
      const tiles = (tr.trigger && tr.trigger.tag && game.level.tags[tr.trigger.tag]) || [];
      if (tiles.some((p) => near({ x: p.x * T + T / 2, y: p.y * T + T / 2 }, it, R))) {
        tr.armed = false;
        tr.beams = [];
        traps++;
      }
    }
    for (const e of game.enemies) if (!e.dead && /turret/.test(e.def.id) && near(e, it, R)) {
      e.stunned = 1e6;
      e.aggro = false;
      turrets++;
    }
    for (const d of game.doors || []) if (d.sealed && near(d, it, R)) {
      d.sealed = false;
      doors++;
    }
    for (const x of game.items) if (x !== it && x.props && x.props.dev && x.props.kind === 'machine' && near(x, it, R) && dstate(game, x) !== 'destroyed') {
      setState(game, x, 'disabled');
      machines++;
    }
    if (!quiet) {
      const what = [traps && traps + ' trap' + (traps > 1 ? 's' : ''), turrets && turrets + ' turret' + (turrets > 1 ? 's' : ''), doors && doors + ' sealed door' + (doors > 1 ? 's' : ''), machines && machines + ' other machine' + (machines > 1 ? 's' : '')].filter(Boolean);
      game.toast('The lights go out round the ' + it.props.name + (what.length ? '; with them, ' + what.join(', ') + '.' : '.'), 'key');
      HN.note(game, 'change', 'You cut the power at the ' + it.props.name + '.');
    }
    const s = HN.st(game);
    ((s.powerCut = s.powerCut || {})[game.level.def.id] = s.powerCut[game.level.def.id] || {})[powerKey(it)] = true;
  }
  function restorePower(game, it) {
    lightsOut(game, roomItems(game, it, (x) => x.def.id === 'hn-mat-light'), false);
    if (isPower(it)) lightsOut(game, game.items.filter((x) => x.def.id === 'hn-mat-light' && near(x, it, 12)), false);
    const s = HN.st(game), m = (s.powerCut || {})[game.level.def.id];
    if (m) delete m[powerKey(it)];
  }
  // devices show their kept state from the moment you arrive; a sprung trap's flash wears off
  LM.on('levelLoaded', (game) => {
    if (!game.player || game.attract) return;
    for (const it of game.items) if (it.props && it.props.dev) it.props.devState = dstate(game, it);
    game.fx.push({
      update(dt, g) {
        for (const it of g.items) if (it._trigT > 0) it._trigT -= dt;
        return false;
      },
    });
  });
  HN.onArrive((game) => {
    const m = (HN.st(game).powerCut || {})[game.level.def.id];
    if (!m) return;
    for (const it of game.items) if (/^hn-s10w?$/.test(it.def.id) && m[powerKey(it)]) cutPower(game, it, true);
  });
  // a data console opens the room's coded lockers; a security console stands down the floor's alarms and checks
  function pullCodes(game, it) {
    const boxes = roomItems(game, it, (x) => x.def.id === 'hn-cache' && x.props.code && !x.unlocked);
    for (const b of boxes) {
      if (b.props.codeFlag) HN.setFlag(game, b.props.codeFlag);
      b.unlocked = true;
    }
    game.toast(boxes.length ? 'The ' + it.props.name + ' coughs up the room’s locker codes. ' + boxes.length + ' unlocked.' : 'No codes on file for anything in here.', boxes.length ? 'good' : 'key');
  }
  function standDown(game) {
    let n = 0;
    for (const x of game.items) if (x.def.id === 'hn-hazard' && /alarm|identity/.test(x.props.behaviour) && x.props.off && !game.hasFlag(x.props.off)) {
      HN.setFlag(game, x.props.off);
      n++;
    }
    game.toast(n ? 'Security stood down: ' + n + ' alarm' + (n > 1 ? 's' : '') + ' and checkpoint' + (n > 1 ? 's' : '') + ' off on this floor.' : 'Nothing on this floor answers to it.', n ? 'good' : 'key');
  }
  const SECURITY = /security|surveillance|camera|alarm|checkpoint|monitor|watch/;

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
      st !== 'destroyed' && roomItems(game, it, (x) => x.def.id === 'hn-cache' && x.props.code && !x.unlocked).length && { label: 'Hack it: locker codes', run: () => hack(game, it, 'Pull the room’s locker codes from its records.', () => pullCodes(game, it), 'shock') },
      st !== 'destroyed' && SECURITY.test(it.props.name || '') && { label: 'Hack it: stand security down', run: () => hack(game, it, 'Stand down this floor’s alarms and identity checks.', () => standDown(game), 'shock') },
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
        restorePower(game, it);
        game.toast('The ' + it.props.name + ' grinds into life.' + (hazardIn(game, it) ? ' Something else in the room wakes with it.' : ''), hazardIn(game, it) ? 'warn' : 'key');
      } },
      st !== 'destroyed' && st !== 'disabled' && { label: 'Shut it down', run: () => {
        setState(game, it, 'disabled');
        stopHazard(game, it, 'You shut the ' + it.props.name + ' down. The room goes quiet: whatever it powered stops.');
        if (!hazardIn(game, it)) game.toast('The ' + it.props.name + ' spins down.', 'key');
        cutPower(game, it);
      } },
      (st === 'disabled' || st === 'destroyed') && { label: 'Salvage parts', run: () => {
        salvageItem(game, it);
        setState(game, it, 'destroyed');
        cutPower(game, it, st === 'disabled');
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
    const done = stripped(game, it), yields = HN.ITEMS[HN.salvageOf(it)];
    LM.ui.open({
      kicker: (rm ? rm.name : 'Fixture') + (done ? ' · stripped' : ''), title: it.name,
      body: h('div', { class: 'hn-panel' },
        lore('A ' + it.props.name + (it.props.odd ? ' that has no business being in here' : '') + '.' + (done ? ' Everything useful has been had off it.' : '')),
        rm && rm.note ? h('p', { class: 'muted' }, rm.name + ': ' + rm.note) : null,
        set ? h('p', { class: 'muted' }, set.name + ' (' + set.era + ').') : null),
      actions: (done ? [] : [{ label: 'Strip it for ' + yields.name.toLowerCase(), onClick: () => stripPiece(game, it) }])
        // a power source that isn't anyone's device: its breaker
        .concat(isPower(it) && !((HN.st(game).powerCut || {})[game.level.def.id] || {})[powerKey(it)] ? [{ label: 'Cut its power', onClick: () => setTimeout(() => hack(game, it, 'Find the breaker and pull it.', () => cutPower(game, it), 'shock'), 0) }] : [])
        .concat([{ label: 'Leave it', quiet: true }]),
    });
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
