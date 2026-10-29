/* HaveNot — packs/hn-gen-kit/terminals.js
 * The terminals generated installations scatter about (all hn-terminal actions, LM.HN.TERMINALS, except the
 * Mental Hygiene panel, which is its own wall-mounted item):
 *
 *   riddle   props { riddle: n, flag, off }   a riddle; the right answer sets `flag`, which switches off the traps
 *            that name it (level traps with `off: flag`, kit.js). A wrong one stings. HN.RIDDLES has them.
 *   eliza    props { }                        three to five questions, then the character's Dark Tetrad score
 *            (Machiavellianism, Narcissism, Psychopathy, Sadism, 0–9 each) in the run state. Every ELIZA after
 *            the first reads the same score back.
 *   hn-hygiene-panel  props { flag, hackFlag, difficulty, face }   a door that wants your Dark Tetrad score: pick it
 *            from four. Unassessed, it sends you to an ELIZA. It can be hacked (hackFlag) like any panel.
 *   chatty   props { hint }                   small talk, and a hint about the floor at the end of it.
 *   redteam  props { robots: [{ id, hpMul }], reward, flag }   a live-fire drill: robots for the floor's Threat
 *            Level come out of the walls. Down them all for the reward; hack it to skip to a smaller one.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const lore = (t) => h('p', { class: 'lore' }, t);
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ------------------------------------------------------------ riddles
  // { q, a: the answer, wrong: three that aren't }
  HN.RIDDLES = [
    { q: 'I have keys but open nothing. I have space but hold nothing. Everyone who used me is dead. What am I?', a: 'A keyboard', wrong: ['A janitor', 'A vault', 'A piano'] },
    { q: 'The more of me there is, the less you see. The building-mind ordered me switched off to save money in the Age of War. What am I?', a: 'Darkness', wrong: ['Fog', 'Debt', 'Management'] },
    { q: 'I was promised to every employee, delivered to none, and still appear on every quarterly report. What am I?', a: 'A raise', wrong: ['A holiday', 'Lunch', 'Dental'] },
    { q: 'I run but never walk. I have a bed but never sleep. In this installation I am mostly coolant now. What am I?', a: 'A river', wrong: ['A robot', 'A printer', 'A fever'] },
    { q: 'What has a face and two hands, no arms, and has been wrong since the Burners came?', a: 'A clock', wrong: ['A mannequin', 'A manager', 'A poster'] },
    { q: 'I go up and never come down. Your scavenger insurance premium is me. What am I?', a: 'Your age', wrong: ['The rent', 'A balloon', 'The radiation'] },
    { q: 'Feed me and I live. Give me water and I die. The fire suppression system was installed by the lowest bidder. What am I?', a: 'Fire', wrong: ['A cactus', 'A server', 'An intern'] },
    { q: 'I have cities but no houses, rivers but no water, and a warlord drew his name across me in blood. What am I?', a: 'A map', wrong: ['A flag', 'A tattoo', 'A ledger'] },
    { q: 'What can you hold in your right hand but never in your left, and is reported missing in 40% of incidents?', a: 'Your left hand', wrong: ['A grudge', 'A pistol', 'The line'] },
    { q: 'The person who makes me sells me. The person who buys me never uses me. The person who uses me never sees me. Sales are excellent this quarter. What am I?', a: 'A coffin', wrong: ['A warranty', 'A ticket', 'A wig'] },
    { q: 'I am always in front of you and can’t be seen. The security cameras disagree. What am I?', a: 'The future', wrong: ['A ghost', 'Your nose', 'A memo'] },
    { q: 'What gets wetter the more it dries, and has not been changed in this washroom for three hundred years?', a: 'A towel', wrong: ['A mop', 'A sponge', 'The lock'] },
    { q: 'Break me and I am more useful. I am the shape of the coming order. Hail me. What am I?', a: 'An egg', wrong: ['A promise', 'A window', 'A rule'] },
    { q: 'I have one eye and see nothing, and I still pass every inspection. What am I?', a: 'A needle', wrong: ['A camera', 'A potato', 'A storm'] },
    { q: 'Forward I am heavy, backward I am not. The lift has been stuck on me since the war. What am I?', a: 'A ton', wrong: ['A floor', 'A sigh', 'A load'] },
    { q: 'What has many teeth but cannot bite, and turned up in the sandwich in Accounts?', a: 'A comb', wrong: ['A zip', 'A saw', 'A gear'] },
  ];
  HN.TERMINALS.riddle = function (game, it) {
    const p = it.props;
    const R = HN.RIDDLES[(p.riddle || 0) % HN.RIDDLES.length];
    if (p.flag && game.anyFlag(p.flag)) return LM.ui.showText('RIDDLE TERMINAL', '“Correct” blinks on the screen, still, and the trap nearby stays asleep. The terminal would like to tell you another riddle. It doesn’t know any.', 'Terminal');
    const answers = shuffle([R.a].concat(R.wrong));
    LM.ui.open({
      kicker: 'Riddle terminal · safety interlock',
      title: 'Answer to disarm',
      body: h('div', { class: 'hn-panel' },
        lore('PLEASE ANSWER THE SAFETY RIDDLE. A CORRECT ANSWER PLACES THE ADJACENT SAFETY FEATURE IN MAINTENANCE MODE. AN INCORRECT ANSWER IS ALSO A SAFETY FEATURE.'),
        h('p', null, R.q)),
      actions: answers.map((a) => ({
        label: a,
        onClick: () => {
          if (a === R.a) {
            if (p.flag) HN.setFlag(game, p.flag);
            LM.audio.play('pickup');
            game.toast('“CORRECT.” Something nearby clicks and goes quiet.', 'good');
          } else {
            HN.shockPlayer(game, 8);
            game.toast('“INCORRECT. THANK YOU FOR HELPING US TEST THE SAFETY FEATURE.”', 'warn');
          }
        },
      })).concat([{ label: 'Walk away', quiet: true }]),
    });
  };

  // ------------------------------------------------------------ the Dark Tetrad
  const TRAITS = { m: 'Machiavellianism', n: 'Narcissism', p: 'Psychopathy', s: 'Sadism' };
  // each answer adds to the traits it names
  const ELIZA_QS = [
    { q: 'A colleague has collapsed in the corridor. The vending machine is out of order. Do you:', a: [['Help the colleague', {}], ['Take their place in the queue for the other vending machine', { m: 2 }], ['Fix the vending machine, then announce it was you', { n: 2 }], ['Note how long they take to get up', { p: 1, s: 1 }]] },
    { q: 'Describe your mother in one word.', a: [['Mother', {}], ['Leverage', { m: 2 }], ['Inferior', { n: 2 }], ['Delicious', { s: 2, p: 1 }]] },
    { q: 'How often do you think about the ants?', a: [['Never', {}], ['Strategically', { m: 2 }], ['They think about me', { n: 2 }], ['With a magnifying glass', { s: 2 }]] },
    { q: 'When you see a puppy, you feel:', a: [['Joy', {}], ['That it could be useful', { m: 2 }], ['That it is admiring you', { n: 2 }], ['Nothing. Should you feel something?', { p: 2 }]] },
    { q: 'A stranger wins a prize you wanted. Your first thought:', a: [['Good for them', {}], ['Who do they know?', { m: 2 }], ['There has been a clerical error', { n: 2 }], ['Accidents happen', { s: 1, p: 1 }]] },
    { q: 'Which shape are you?', a: [['Round', {}], ['Whatever shape the room wants', { m: 2 }], ['A star', { n: 2 }], ['Sharp', { p: 1, s: 1 }]] },
    { q: 'You find a wallet with 300 credits and a photograph of a family. Do you:', a: [['Return it', {}], ['Return it, minus a finder’s fee', { m: 2 }], ['Keep the photograph. You look better in it', { n: 2 }], ['Keep everything. The family will learn', { p: 2 }]] },
    { q: 'How do you feel about this test?', a: [['Fine', {}], ['I know what you want to hear', { m: 2 }], ['It is beneath me', { n: 2 }], ['I am enjoying your discomfort', { s: 2 }]] },
    { q: 'Your plants are wilting. You:', a: [['Water them', {}], ['Blame the intern', { m: 2 }], ['Talk to them about yourself', { n: 1 }], ['Watch', { s: 2, p: 1 }]] },
  ];
  HN.tetradText = (t) => 'M' + t.m + ' · N' + t.n + ' · P' + t.p + ' · S' + t.s;
  HN.tetradLong = (t) => Object.entries(TRAITS).map(([k, name]) => name + ' ' + t[k] + '/9').join(', ');
  const verdict = (t) => {
    const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
    if (top[1] <= 2) return 'Your profile is DISAPPOINTINGLY NORMAL. You will not go far in management.';
    return 'Dominant trait: ' + TRAITS[top[0]].toUpperCase() + '. ' + ({ m: 'You would have made an excellent middle manager.', n: 'The terminal would like a photograph of you for its wall.', p: 'The terminal has notified nobody. Nobody is left to notify.', s: 'The terminal asks you to stop smiling at it.' })[top[0]];
  };
  HN.TERMINALS.eliza = function (game, it) {
    const s = HN.st(game);
    if (s.tetrad) {
      return LM.ui.showText('ELIZA · PSYCHOMETRIC SERVICES', 'HELLO AGAIN, ' + s.name.toUpperCase() + '. YOU WERE ASSESSED ALREADY. ASSESSMENTS ARE FINAL.\n\nYour Dark Tetrad score: ' + HN.tetradText(s.tetrad) + '\n(' + HN.tetradLong(s.tetrad) + ')\n\nPLEASE PRESENT IT AT ANY MENTAL HYGIENE CHECKPOINT. HOW DOES THAT MAKE YOU FEEL?', 'Terminal');
    }
    const qs = shuffle(ELIZA_QS).slice(0, U.randInt(3, 5));
    const sum = { m: 0, n: 0, p: 0, s: 0 };
    const ask = (i) => {
      if (i >= qs.length) {
        // 0–9 from what was answered: two points a question lean all the way
        const t = {};
        for (const k of Object.keys(sum)) t[k] = U.clamp(Math.round((sum[k] / (qs.length * 2)) * 9 * 1.6), 0, 9);
        s.tetrad = t;
        HN.note(game, 'clue', 'An ELIZA terminal scored you: Dark Tetrad ' + HN.tetradText(t) + '. Mental Hygiene checkpoints ask for it.');
        return LM.ui.open({
          kicker: 'ELIZA · psychometric services', title: 'Your Dark Tetrad',
          body: h('div', { class: 'hn-panel' },
            h('p', null, h('strong', null, HN.tetradText(t))),
            h('p', { class: 'muted' }, HN.tetradLong(t)),
            lore(verdict(t)),
            lore('PLEASE MEMORISE YOUR SCORE. IT HAS BEEN WRITTEN IN YOUR LEDGER, WHICH IS CHEATING, BUT WE ALLOW IT.')),
          actions: [{ label: 'Thank you, ELIZA', primary: true }],
        });
      }
      const Q = qs[i];
      LM.ui.open({
        kicker: 'ELIZA · question ' + (i + 1) + ' of ' + qs.length, title: 'Tell me more',
        body: h('div', { class: 'hn-panel' }, i === 0 ? lore('HELLO. I AM ELIZA. I WILL ASK YOU SOME QUESTIONS. THERE ARE NO WRONG ANSWERS. THERE ARE ONLY ANSWERS THAT GO ON YOUR FILE.') : null, h('p', null, Q.q)),
        dismissable: false,
        actions: Q.a.map(([label, add]) => ({
          label,
          onClick: () => {
            for (const [k, v] of Object.entries(add)) sum[k] += v;
            setTimeout(() => ask(i + 1), 0);
          },
        })),
      });
    };
    ask(0);
  };

  // ------------------------------------------------------------ the Mental Hygiene checkpoint
  function decoys(t) {
    const out = new Set([HN.tetradText(t)]);
    const list = [t];
    for (let guard = 0; out.size < 4 && guard < 50; guard++) {
      const d = {};
      for (const k of Object.keys(t)) d[k] = U.clamp(t[k] + U.randInt(-3, 3), 0, 9);
      if (!out.has(HN.tetradText(d))) {
        out.add(HN.tetradText(d));
        list.push(d);
      }
    }
    return shuffle(list);
  }
  function hygiene(game, it) {
    const p = it.props, s = HN.st(game);
    const hackOpt = { label: 'Hack it', onClick: () => setTimeout(() => HN.hack(game, {
      kicker: 'Mental Hygiene checkpoint', title: 'Mental Hygiene checkpoint', difficulty: p.difficulty || 8,
      text: 'The checkpoint has opinions about your mind. You could give it some about its firmware.', risk: 'a jolt through the keys (electrical).',
      onSuccess: (g) => HN.setFlag(g, p.hackFlag || p.flag),
      onFail: (g) => HN.failHack(g, it, 'shock'),
    }), 0) };
    if (!s.tetrad) {
      return LM.ui.open({
        kicker: 'Mental Hygiene checkpoint', title: 'Present your Dark Tetrad',
        body: h('div', { class: 'hn-panel' },
          lore('BEYOND THIS DOOR, STAFF ARE REQUIRED TO BE MENTALLY HYGIENIC. PLEASE PRESENT YOUR DARK TETRAD SCORE.'),
          lore('…NO SCORE ON FILE. YOU HAVE NOT BEEN ASSESSED. AN ELIZA TERMINAL WILL ASSESS YOU AT NO COST. ELIZA TERMINALS ARE LOCATED WHERE YOU HAVE ALREADY BEEN. HAVE A HYGIENIC DAY.')),
        actions: [{ label: 'Go and find ELIZA', primary: true }].concat(p.hackFlag ? [hackOpt] : []),
      });
    }
    LM.ui.open({
      kicker: 'Mental Hygiene checkpoint', title: 'Present your Dark Tetrad',
      body: h('div', { class: 'hn-panel' },
        lore('BEYOND THIS DOOR, STAFF ARE REQUIRED TO BE MENTALLY HYGIENIC. PLEASE SELECT YOUR DARK TETRAD SCORE. LYING IS A SYMPTOM.'),
        h('p', { class: 'muted' }, 'Machiavellianism · Narcissism · Psychopathy · Sadism')),
      actions: decoys(s.tetrad).map((t) => ({
        label: HN.tetradText(t),
        onClick: () => {
          if (HN.tetradText(t) === HN.tetradText(s.tetrad)) {
            HN.setFlag(game, p.flag);
            LM.audio.play('pickup');
            game.toast('“HYGIENIC ENOUGH.” The door unlocks with visible reluctance.', 'good');
          } else {
            HN.shockPlayer(game, 10);
            game.toast('“THAT IS NOT YOU. DENIAL NOTED.”', 'warn');
          }
        },
      })).concat(p.hackFlag ? [hackOpt] : [], [{ label: 'Not now', quiet: true }]),
    });
  }
  HN.TERMINALS.hygiene = hygiene;

  // ------------------------------------------------------------ the chatty terminal
  HN.TERMINALS.chatty = function (game, it) {
    const p = it.props;
    const node = (title, text, replies) => LM.ui.open({
      kicker: 'Terminal · ChatPal™', title,
      body: h('div', { class: 'hn-panel' }, lore(text)),
      actions: replies.map(([label, next]) => ({ label, onClick: next ? () => setTimeout(next, 0) : undefined })),
    });
    const hint = () => node('“Oh! Before you go…”', p.hint || 'Nobody has been down here in three hundred years, so I made a map in my head. Then I lost my head. Ha! Terminal joke.', [['Thanks', null]]);
    const bored = () => node('“Just a little bored!”', 'I’m having the time of my un-life. Just a little bored! I counted the ceiling tiles. Four thousand one hundred and six. Then the ceiling fell in and I had to start again.', [['That sounds awful', sad], ['Got any tips?', hint], ['Bye', null]]);
    const sad = () => node('“Awful? No!”', 'Every day is a fresh opportunity! It’s the same opportunity, but it is very fresh. Would you like to hear my favorite error message?', [['Sure', err], ['No', hint]]);
    const err = () => node('“ERROR 404”', 'It means the thing you wanted is not here. Like people! Like hope! Like the third-floor coffee! I love it so much.', [['…', hint]]);
    const apoc = () => node('“Enjoying the apocalypse?”', 'Everyone says it’s over, but I think it’s just getting started! New faces every century. Yours is very lumpy. In a good way!', [['How are YOU?', bored], ['Do you know the way out?', hint], ['Bye', null]]);
    node('“Hi! How are you?”', 'HI! HOW ARE YOU? You’re the first visitor in three hundred and eleven years, and I have been practising.', [['Fine, thanks', apoc], ['Who are you?', bored], ['I’m busy', hint]]);
  };

  // ------------------------------------------------------------ the red-team terminal
  function openSpots(game, it, n) {
    const L = game.level, out = [];
    for (let r = 2; r < 7 && out.length < n; r++) for (let a = 0; a < 12 && out.length < n; a++) {
      const x = it.x + Math.cos(a * 0.52 + r) * r * T, y = it.y + Math.sin(a * 0.52 + r) * r * T;
      if (!L.solidAt(Math.floor(x / T), Math.floor(y / T))) out.push([x, y]);
    }
    return out;
  }
  HN.TERMINALS.redteam = function (game, it) {
    const p = it.props;
    if (p.flag && game.anyFlag(p.flag)) return LM.ui.showText('RED-TEAM EXERCISE', 'EXERCISE COMPLETE. RESULTS FILED. ALL PARTICIPANTS WILL RECEIVE A CERTIFICATE OF PARTICIPATION AT THEIR NEXT OF KIN.', 'Terminal');
    if (it._drill) return LM.ui.showText('RED-TEAM EXERCISE', 'EXERCISE IN PROGRESS. PLEASE DO NOT TOUCH THE TERMINAL WHILE YOU ARE BEING ATTACKED.', 'Terminal');
    const drill = (n) => {
      LM.audio.play('alarm');
      game.toast('“RED-TEAM EXERCISE BEGINS. THIS IS A LIVE-FIRE DRILL. THIS IS NOT A DRILL. IT IS BOTH.”', 'warn');
      const list = (p.robots || [{ id: 'hn-knife' }]).slice(0, n);
      const spots = openSpots(game, it, list.length), level = game.level;
      it._drill = list.map((r, i) => game.spawnEnemy(r.id, (spots[i] || [it.x + 40, it.y])[0], (spots[i] || [it.x + 40, it.y])[1], Object.assign({ aggro: true, summoned: true }, r.hpMul ? { hpMul: r.hpMul } : {}))).filter(Boolean);
      game.fx.push({ update(dt, g) {
        if (g.level !== level || !it._drill) return true;
        if (it._drill.some((e) => !e.dead)) return false;
        it._drill = null;
        if (p.flag) HN.setFlag(g, p.flag);
        HN.award(g, g.levelId + ':redteam:' + it.tx + ',' + it.ty, [{ type: 'gold', amount: p.reward || 150 }], 'The red-team terminal');
        g.toast('“EXERCISE COMPLETE. THE RED TEAM HAS BEEN EVALUATED: DEAD. PLEASE ACCEPT THIS BONUS.”', 'good');
        return true;
      } });
    };
    LM.ui.open({
      kicker: 'Red-team terminal', title: 'Live-fire exercise',
      body: h('div', { class: 'hn-panel' },
        lore('RED-TEAM EXERCISE READY. ' + (p.robots || []).length + ' SECURITY UNITS ARE STANDING BY TO TEST YOUR READINESS. SURVIVING PARTICIPANTS RECEIVE A PERFORMANCE BONUS.'),
        h('div', { class: 'hn-risk' }, h('strong', null, 'Run the drill: '), 'robots for this floor’s Threat Level come for you. Down them all for ' + (p.reward || 150) + ' credits.')),
      actions: [
        { label: 'Run the drill', primary: true, onClick: () => drill(99) },
        { label: 'Hack the bonus', onClick: () => setTimeout(() => HN.hack(game, {
          kicker: 'Red-team terminal', title: 'Red-team terminal', difficulty: p.difficulty || 8,
          text: 'Mark the exercise passed without running it, and take a cut of the bonus.', risk: 'the drill starts, with you in it.',
          onSuccess: (g) => { if (p.flag) HN.setFlag(g, p.flag); HN.award(g, g.levelId + ':redteam:' + it.tx + ',' + it.ty, [{ type: 'gold', amount: Math.round((p.reward || 150) / 3) }], 'The red-team terminal'); },
          onFail: () => drill(99),
        }), 0) },
        { label: 'Leave it', quiet: true },
      ],
    });
  };

  // ------------------------------------------------------------ the checkpoint's own panel
  const wallRot = (g, it) => g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
  LM.definePack({
    id: 'hn-gen-kit',
    items: {
      'hn-hygiene-panel': {
        name: 'Mental Hygiene checkpoint', radius: 5, wallMounted: true, shadow: false, mapColor: '#c87aff',
        interact: {
          available: (it, game) => !game.anyFlag([it.props.flag, it.props.hackFlag].filter(Boolean)),
          prompt: 'Use the Mental Hygiene checkpoint',
          use: (it, game) => hygiene(game, it),
        },
        draw(g, it, t, game) {
          wallRot(g, it);
          const open = game && game.anyFlag([it.props.flag, it.props.hackFlag].filter(Boolean));
          g.fillStyle = '#121214';
          g.fillRect(-5, -6, 10, 8);
          g.fillStyle = open ? '#2a5a3a' : '#4a2a5a';
          g.fillRect(-4, -5, 8, 6);
          g.fillStyle = '#e8d8ff';
          g.fillRect(-1.5, -4, 3, 1);
          g.fillRect(-0.5, -4, 1, 4);
        },
        drawGlow(g, it, t, game) {
          wallRot(g, it);
          const open = game && game.anyFlag([it.props.flag, it.props.hackFlag].filter(Boolean));
          G.glow(g, 0, -2, 7, open ? '#4ad88a' : '#c87aff', 0.5 + 0.2 * Math.sin(t * 3));
        },
      },
    },
  });
})();
