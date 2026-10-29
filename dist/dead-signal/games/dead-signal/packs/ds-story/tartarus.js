/* Dead Signal — packs/ds-story/tartarus.js
 * The last act's story pieces: Sub-level B's endings that come too soon, the Board in their boardroom, Voss's
 * case for letting them go, and how it ends. (DESIGN.md 4.7, 4.8, 1.7.)
 *   speakers  thale, brandt, moss, pell (the board, in the room with you)
 *   behaviors ds-cower          a frightened person: away from you, into a corner, down
 *   enemies   ds-board-member   one of the board: props.who (voss, thale, brandt, moss, pell). Fights nobody
 *                               (faction boardroom). Shoot them, and they die like anyone.
 *   items     ds-voss-voice     stays at Voss's side: talk to him (his case; what ARIADNE records)
 *   effects   ds-final          the ending, by what happened: who is alive, and what the world gets to see
 *             ds-guards-down    { tag, flag }: set the flag if nothing with the tag is left alive (the guards
 *                               were killed on an earlier visit)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {});
  const h = (...a) => LM.ui.h(...a);

  // ======================================================== the board
  const BOARD = {
    voss: { name: 'Dr. Aurelian Voss', role: 'Director', look: { skin: '#e0c4a8', hair: '#c8c8c8', shirt: '#2a2c30', pants: '#1e2024', coat: '#2a2c30' }, color: '#e0b25a' },
    thale: { name: 'Margaret Thale', role: 'Chief Financial Officer', look: { skin: '#e8d0b8', hair: '#d8d8d8', shirt: '#0e0e10', pants: '#0e0e10', coat: '#0e0e10' }, color: '#c8c8d8' },
    brandt: { name: 'Dr. Ilse Brandt', role: 'Chief Science Officer', look: { skin: '#f0d8c0', hair: '#9a3a1a', shirt: '#e8e4dc', pants: '#2a2a34', coat: '#e8e4dc' }, color: '#d88a6a' },
    moss: { name: 'Garrick Moss', role: 'Head of Security', look: { skin: '#c8a080', hair: '#3a2a1a', shirt: '#24301e', pants: '#1a2016', coat: '#24301e' }, color: '#8aa070' },
    pell: { name: 'Simon Pell', role: 'General Counsel', look: { skin: '#e4c8a8', hair: '#101010', shirt: '#1a2238', pants: '#121828', coat: '#1a2238' }, color: '#8a9ad8' },
  };
  const speakers = {};
  for (const [id, b] of Object.entries(BOARD)) {
    if (id === 'voss') continue;
    speakers[id] = { name: b.name, role: b.role + ' · the boardroom', color: b.color, portrait: DS.personPortrait ? DS.personPortrait(b.look) : null, voice: 0.85 };
  }
  DS.BOARD = BOARD;
  const say = (who, text, extra) => LM.comms && LM.comms.say(Object.assign({ who, text }, extra || {}));
  const boardAlive = (game) => game.enemies.filter((e) => !e.dead && e.def.id === 'ds-board-member');
  const boardDead = (game) => (game.player.data.boardDead || []).slice();
  // who does the talking: Voss, and if he's dead, whoever's left (the lawyer first)
  const SPEAKS = ['voss', 'pell', 'thale', 'moss', 'brandt'];
  const speaker = (game) => {
    const alive = boardAlive(game);
    for (const w of SPEAKS) {
      const e = alive.find((x) => x._props.who === w);
      if (e) return e;
    }
    return alive[0] || null;
  };

  const behaviors = {
    // frightened: away from you, into the corners, down on the floor when there's nowhere left
    'ds-cower': {
      update(e, dt, game) {
        const P = game.player;
        if (!P || P.dead) return;
        const d = U.dist(P.x, P.y, e.x, e.y);
        e.mem.crouch = Math.max(0, (e.mem.crouch || 0) - dt);
        if (d < 6 * T && e.pSee) {
          const dx = e.x - P.x, dy = e.y - P.y, l = Math.hypot(dx, dy) || 1;
          e.mx += (dx / l) * 1;
          e.my += (dy / l) * 1;
          e.speedMul = d < 3 * T ? 1.1 : 0.7;
          if (e.hitWall) e.mem.crouch = 1.5;
        } else {
          e.speedMul = 0.3;
          AI.wander && AI.wander(e, game, 0.2);
        }
        if (e.mem.crouch > 0) e.speedMul = 0;
        e.facing = Math.atan2(P.y - e.y, P.x - e.x);
      },
    },
  };
  const AI = LM.ai;

  const enemies = {
    'ds-board-member': {
      name: 'A member of the board', hp: 60, speed: 92, radius: 9, mass: 1, accel: 8, turn: 8, ai: 'ds-cower', faction: 'boardroom', sight: 500, leash: 99999,
      blood: '#7a1f1f', color: '#2a2c30', attacks: [], deathSound: 'boardDie',
      init(e) {
        const b = BOARD[e._props.who] || BOARD.thale;
        e.mem.b = e._props.who || 'thale';
        e.name = b.name;
      },
      onHurt(e, game) {
        const who = e._props.who;
        if (!e.mem.begged && who !== 'voss' && !e.dead) {
          e.mem.begged = true;
          const lines = {
            thale: 'Please. Please, I can pay you. Name a number. I’m very good with numbers.',
            brandt: 'Don’t. I have a daughter. I— I have a daughter.',
            moss: 'You don’t have the stomach for it, son. I’ve seen men with the stomach for it.',
            pell: 'This is assault. This is— there are cameras, there are witnesses, you will spend the rest of your life—',
          };
          if (lines[who]) say(who, lines[who], { pause: false });
        }
      },
      onDeath(e, game) {
        const who = e._props.who;
        const list = (game.player.data.boardDead = game.player.data.boardDead || []);
        if (!list.includes(who)) list.push(who);
        game.setFlag('killed_' + who);
        game.toast((BOARD[who] || {}).name + ' is dead.', 'warn');
        game.spawnItemAt('ds-body', e.x, e.y, { title: (BOARD[who] || {}).name, kicker: 'The Boardroom', angle: e.facing, color: (BOARD[who] || {}).look.shirt, skin: (BOARD[who] || {}).look.skin, hair: (BOARD[who] || {}).look.hair, text: 'Dead on the boardroom floor, in a very good suit.' });
      },
      draw(g, e, t) {
        const b = BOARD[e.mem.b] || BOARD.thale;
        const crouch = (e.mem.crouch || 0) > 0;
        if (crouch) g.scale(0.85, 0.85);
        G.person(g, { look: b.look, facing: e.facing, vx: e.vx, vy: e.vy, walk: e.t * 8 }, t);
      },
    },
  };

  // ======================================================== Voss's case
  function vossTalk(it, game, said) {
    const alive = boardAlive(game);
    if (!alive.length) return;
    if (!alive.some((e) => e._props.who === 'voss')) return survivorTalk(game, alive);
    const dead = boardDead(game);
    const asked = (f) => game.hasFlag(f);
    const paras = [];
    if (said) paras.push(h('p', { class: 'lore' }, said));
    else {
      paras.push(h('p', { class: 'lore' }, '“Theo. Put it down. Look at us: five old people round a table. You’ve won. Anyone can see that.”'));
      paras.push(h('p', { class: 'lore' }, '“There are laws for this. Courts. Due process. Let your machine send its little file to whoever it likes: we’ll answer for it in a courtroom, the way civilised people do. That’s what courts are for.”'));
      paras.push(h('p', { class: 'lore' }, '“What you’re thinking of doing has a name, and it’s what you think we are. Do it, and you’re no better than us. You’re worse: you knew better. The only decent thing left in this building is to open that door and let the system decide. It always has.”'));
      if (dead.length) paras.push(h('p', { class: 'muted' }, 'He doesn’t look at the bodies. He keeps his eyes on yours.'));
    }
    const actions = [];
    if (!asked('confessTitans')) actions.push({ label: 'Ask him what the Titans were for', onClick: () => setTimeout(() => answer('confessTitans', '“Insurance. Do you know what a government will pay for a thing that can’t be killed, Theo? Nearly anything. And for the only cage on earth that holds one, everything else. We were selling the cage. The Titans were the brochure.”'), 0) });
    if (!asked('confessTrials')) actions.push({ label: 'Ask him about Shelter B, and the trials', onClick: () => setTimeout(() => answer('confessTrials', '“Fourteen in the shelter. A few hundred in the trials, over the years: donors, mostly. People nobody looks for. We watched, yes. You’d be surprised what the right people will pay to sit in that box, and what they’ll sign for us afterwards.”'), 0) });
    if (!asked('confessThreat')) actions.push({ label: 'Ask him what he meant by “fates worse than death”', onClick: () => setTimeout(() => answer('confessThreat', '“The Heirs. We grew them to inherit, and they will. There are other buildings, Theo. In a generation they’ll be everywhere, and people like you will be grateful for a bowl and a name. That isn’t a threat. It’s a business plan. You can’t shoot a business plan.”'), 0) });
    actions.push({ label: 'Let them go. The courts can have them.', onClick: () => setTimeout(() => confirmSpare(game), 0) });
    actions.push({ label: 'Say nothing', quiet: true });
    LM.ui.open({ kicker: 'The Boardroom · ' + BOARD.voss.name, title: said ? 'Voss' : 'His case', body: h('div', null, paras), actions, dismissable: true });
    function answer(flag, text) {
      game.setFlag(flag);
      const n = ['confessTitans', 'confessTrials', 'confessThreat'].filter((f) => game.hasFlag(f)).length;
      if (n === 1) say('ariadne', 'RECORDING. KEEP HIM TALKING.', { pause: false, seconds: 2.4 });
      else if (n === 2) say('ariadne', 'I HAVE ENOUGH. I HAVE IT IN HIS VOICE.', { pause: false, seconds: 2.6 });
      else say('ariadne', 'ALL OF IT. THANK YOU, THEO.', { pause: false, seconds: 2.4 });
      vossTalk(it, game, text);
    }
  }
  // Voss is dead: whoever's left does the talking, and it isn't a case, it's begging
  function survivorTalk(game, alive) {
    const pick = (speaker(game) || alive[0])._props.who;
    const b = BOARD[pick] || BOARD.thale;
    const plea = {
      pell: '“He was the Director. Everything that happened here, he signed. You know that. I can testify to that. Let me testify to that. Let us walk out of that door and I will tell a court anything you like.”',
      thale: '“It’s done. He’s dead; isn’t that enough? I have the accounts, all of them, every payment. Let me go and I’ll give them to anyone you name.”',
      moss: '“You’ve made your point, son. The man who gave the orders is on the floor. Open the door and let the rest of us take our chances with the law.”',
      brandt: '“Please. He made us. You know he did. Let us go, and the courts can decide. Please.”',
    }[pick];
    LM.ui.open({
      kicker: 'The Boardroom · ' + b.name, title: 'What’s left of the board',
      body: h('div', null, h('p', { class: 'lore' }, plea), h('p', { class: 'muted' }, 'Voss is dead. Whatever he would have said, ARIADNE didn’t get it in his voice.')),
      actions: [
        { label: 'Let them go. The courts can have them.', onClick: () => setTimeout(() => confirmSpare(game, b.name), 0) },
        { label: 'Say nothing', quiet: true },
      ],
      dismissable: true,
    });
  }
  function confirmSpare(game, who) {
    LM.ui.open({
      kicker: 'The Boardroom',
      title: 'Let them go?',
      body: h('div', null, h('p', { class: 'lore' }, who
        ? 'You lower the gun. ARIADNE opens the boardroom’s other door, the one that goes to the private stairs and down, and out. ' + who + ' doesn’t wait to be told twice.'
        : 'You lower the gun. ARIADNE opens the boardroom’s other door, the one that goes to the private stairs and down, and out, and Voss smiles at you as if you’d passed an examination.')),
      actions: [
        { label: 'Let them go', primary: true, onClick: () => setTimeout(() => game.setFlag('spareBoard'), 0) },
        { label: 'No', quiet: true },
      ],
    });
  }

  const items = {
    // stays at Voss's elbow (or, with Voss dead, whoever's left): talk to him
    'ds-voss-voice': {
      name: 'Voss', radius: 10, dressing: false, mapColor: 'none', reach: 28,
      update(it, dt, game) {
        const v = speaker(game);
        if (!v) return it.remove(game);
        it._speaker = v;
        it.x = v.x;
        it.y = v.y + 0.5;
      },
      interact: {
        available: (it, game) => game.hasFlag('inBoardroom') && !game.hasFlag('spareBoard'),
        prompt: (it) => (it._speaker && it._speaker._props.who !== 'voss' ? 'Talk to ' + ((BOARD[it._speaker._props.who] || {}).name || 'them') : 'Talk to Voss'),
        use: (it, game) => vossTalk(it, game),
      },
    },
  };

  // ======================================================== the ending
  const EVIDENCE = [
    ['mossLog'],
    ['fileColony', 'sawShelter', 'fileS41'],
    ['fileMidwife', 'fileTenant', 'fileLantern', 'fileVats', 'sawProject', 'sawBriefing'],
    ['readSchedule', 'fileTrials', 'sawBets'],
    ['fileTitans'],
    ['truthHeard'],
    ['heirsWall'],
  ];
  DS.exposure = function (game) {
    let ev = 0;
    for (const any of EVIDENCE) if (any.some((f) => game.hasFlag(f))) ev++;
    const frags = Array.from({ length: 12 }, (_, i) => game.hasFlag('fragment' + (i + 1))).filter(Boolean).length;
    if (frags >= 6) ev++;
    const conf = ['confessTitans', 'confessTrials', 'confessThreat'].filter((f) => game.hasFlag(f)).length;
    return { evidence: ev, of: EVIDENCE.length + 1, confessions: conf, full: conf >= 2 && ev >= 4 };
  };
  function finalEnding(game) {
    if (game.state === 'ending') return;
    const ex = DS.exposure(game);
    const dead = boardDead(game);
    const all = dead.length >= 5;
    const spared = !all;
    const killedLine = dead.length && !all ? 'You killed ' + (dead.length === 1 ? 'one of them' : dead.length + ' of them') + ' before you stopped. That is in the record too.' : '';
    let spec;
    if (spared && ex.full) {
      spec = {
        tone: 'good', kicker: 'The end', title: 'The Signal',
        text: ['ARIADNE opens every line in the building at once, and she talks. She has eleven years of audits, and what you read on the way up, and the Titans, and the Heirs, and Aurelian Voss, in his own voice, explaining what the trials were for and what the Heirs are for and what you should be grateful for.',
          killedLine,
          'The board walk out of the lobby into more police than any of them has ever seen. Their lawyers are the best there are. It doesn’t matter. By morning the whole world has heard the recording, and the other buildings are being opened one by one, and what’s inside them is being counted.',
          'None of them sees the outside again. ARIADNE keeps the lights on in Tartarus; she says somebody should. She asks if you’d like a job.'].filter(Boolean).join('\n\n'),
      };
    } else if (!spared && ex.full) {
      spec = {
        tone: 'good', kicker: 'The end', title: 'The Verdict',
        text: ['ARIADNE opens every line in the building and tells the world everything: the audits, the trials, the Titans, the Heirs, and Aurelian Voss’s voice, calmly describing the future he’d planned for it.',
          'And then, because she won’t lie, she tells it what you did in the boardroom.',
          'There’s a trial. Yours. Half the country wants you hanged and the other half wants you on a stamp. The jury hears the recording twice. They are out for an hour.',
          'The other buildings are opened one by one. Some of the Heirs are already gone. ARIADNE says she’ll find them. She writes to you every week.'].join('\n\n'),
      };
    } else if (spared) {
      spec = {
        tone: 'bad', kicker: 'The end', title: 'The Settlement',
        text: ['ARIADNE tells the world what she has. It isn’t enough. A machine that “malfunctioned”, a night technician with a grudge, a building where there was, everyone agrees, a terrible containment accident.',
          killedLine,
          'The board are very sorry. They settle. Asterion changes its name. Nobody can quite say what happened on the fifth floor, and the recordings that would have said it were never made.',
          'Six months later there is a press release: a new facility, overseas, for the care of “certain legacy organisms”. Line H is mentioned, once, in a footnote.'].filter(Boolean).join('\n\n'),
      };
    } else {
      spec = {
        tone: 'bad', kicker: 'The end', title: 'The Massacre',
        text: ['What the world sees first is five executives shot dead in their own boardroom by a technician from the night shift, and that is the story, for a long time.',
          'ARIADNE tells them the rest. Some of them listen. It isn’t enough to be sure of, and without the board’s own words it’s her word against five bodies.',
          'Asterion’s shareholders are very sorry for its loss. The other buildings close quietly. Nobody counts what was inside them. The Heirs are not mentioned at all.'].join('\n\n'),
      };
    }
    spec.final = true;
    spec.stats = false;
    spec.flag = 'gameOver';
    spec.actions = [{ label: 'New game', do: 'newRun', primary: true }, { label: 'Back to the title', do: 'title' }];
    spec.text += '\n\nThe record: ' + ex.evidence + ' of ' + ex.of + ' things found, ' + ex.confessions + ' of 3 of Voss’s answers on tape. The board: ' + (5 - dead.length) + ' alive, ' + dead.length + ' dead.';
    game.ending(spec);
  }
  const effects = {
    // { tag, flag }: if everything with this tag is already dead (killed on an earlier visit, so a clear
    // trigger has nobody to count), set the flag now
    'ds-guards-down': {
      params: { tag: 'tag', flag: 'text' },
      run(game, ef) {
        if (!ef.flag) return;
        if (!game.enemies.some((e) => !e.dead && e.tag === ef.tag)) game.setFlag(ef.flag);
      },
    },
    'ds-final': {
      params: {},
      run(game, ef) {
        const go = () => (LM.comms && LM.comms.talking && LM.comms.talking() ? game.schedule(0.3, go, true) : finalEnding(game));
        go();
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('boardDie', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 500, dur: 0.3, gain: 0.2 });
    });
  }

  // the board themselves fight nobody (and on Five, your shots can find them: the level's player row)
  const factions = { boardroom: [] };

  LM.definePack({ id: 'ds-story', speakers, behaviors, enemies, items, effects, factions });
})();
