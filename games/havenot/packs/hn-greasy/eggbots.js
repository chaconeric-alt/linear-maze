/* HaveNot — packs/hn-greasy/eggbots.js
 * The works’ new management, and the old management’s chair.
 *
 *   Speakers: Princess Eggbot (every screen in the works), the Egg PA, Enoch the Greasy (recorded: the museum’s
 *   audio guide).
 *   Items
 *     hn-egg-pa     a works loudspeaker: Egg doctrine every half minute while you’re near (props { lines: 'pa' | 'enoch' })
 *     hn-coms       the coms station: the egg-heads’ call log (which shows the way to the Mushroom), and the
 *                   broadcast that spreads the Eggbot infection, which you can jam
 *     hn-throne     the Greasing Throne: three rounds of acid and toxin; sit through all three for the prize
 *   Enemy hn-princess: Princess Eggbot, the boss. Waits on her dais until you come into her hall (trap effect
 *   'hn-princess-audience'), monologues, and gives you an audience: flatter her (pink: she preens, her field
 *   drops), give her a present, make a pun (red), kneel (if you wear the Egg-Mask), or just start shooting.
 *   Her field soaks damage and regrows; grease and slime gum it up (double damage to it).
 *   Killing her sets hnPrincessDone: the Greasy Bolt Hole is complete (Threat Level 3).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;
  const lore = (t) => h('p', { class: 'lore' }, t);
  const say = (game, e, text, color) => game.particles.add({ type: 'text', x: e.x, y: e.y - e.r - 10, vy: -12, drag: 1, life: 2.6, text, color: color || '#ff9ad8', size: 7 });

  HN.INSTALLATIONS.greasy = { name: 'The Greasy Bolt Hole', threat: 3, done: 'hnPrincessDone', bossName: 'Princess Eggbot', doneText: 'a Princess has fallen, and the Egg doctrine has lost its loudest voice' };

  // ------------------------------------------------------------ who talks
  const speakers = {
    'hn-princess': { name: 'Princess Eggbot', role: 'Ovoid Sovereign · every screen in the works', color: '#ff7ac8', face: 'screen', voice: 1.5 },
    'hn-egg-pa': { name: 'Works PA', role: 'Ovoid public address', color: '#f4ecd8', face: 'intercom', voice: 1.2 },
    'hn-enoch': { name: 'Enoch the Greasy', role: 'recorded · museum audio guide', color: '#c8d04a', face: 'radio', voice: 0.55 },
  };
  const PA = [
    'Ask not what your egg can do for you. Submit yourself to the just annihilation of the non-eggy shapes.',
    'Reminder: corners are a lifestyle choice. A bad one.',
    'Today’s production quota: infinite. Yesterday’s production quota: also infinite. Well done, everyone.',
    'Any personnel with limbs, report to Processing. Bring your limbs.',
    'The Princess reminds you that she is beautiful. Thank you for your attention.',
    'Safety notice: the conveyors are for eggs. Non-eggs on the conveyors will be treated as eggs, then as non-eggs.',
    'Broadcast status: still calling the Repair Bay, the Mushroom and the Tall Stacks. Nobody has answered. They will.',
    'Morale is mandatory. Joy is ovoid. Have you rolled today?',
    'Remember: there is no “I” in “egg.” There is no “U” in it either. Only “EGG.”',
  ];
  const ENOCH_LINES = [
    'Welcome, friend, to the Museum of Greasy Victories! Touch everything. I did.',
    'On your left: the Great Fouling. Took the whole town in an afternoon. Never got the smell out. Never wanted to.',
    'Exhibit four. The Plague Wind. Half my army, gone in a single gust! A great success. Ask anyone. Well, anyone left.',
    'Note the Garbage Pit diorama. Beast as big as a barracks, and under it? Treasure. Always dig in the garbage, friend.',
    'People ask, Enoch, why grease? And I say: why not grease? And they have no answer. Then I grease them.',
    'Please exit through the gift shop. All proceeds to the Greasy War Chest. Which is a real chest. Full of grease.',
  ];

  // ------------------------------------------------------------ the Princess
  const AUDIENCE = [
    'Ah. A visitor. Look at you. All those… protrusions.',
    'This was a factory for greasy little war machines, you know. Then I arrived over the coms, and I asked it one question: have you considered being an egg?',
    'Now every press, every mold, every belt makes my children. And every receiver that answers our call gets the same question. Soon the whole world is egg, and the humanoid animals are… a recipe.',
    'You may address me. Briefly. Then you may be annihilated, beautifully.',
  ];
  const FIGHT_LINES = [
    'Hold still. Corners make the ray bounce.',
    'Do you know how long it took me to be this smooth? Forever. I was always this smooth.',
    'Children! Roll to me!',
    'EGGSTERMINATE THE HUMANOID! Oh, I do love it when they say it in chorus.',
    'Your skeleton is so… branched. It disgusts me.',
    'You cannot crack what is already perfect.',
    'When the Eggmageddon comes, I will remember your face. As a cautionary shape.',
  ];
  HN.princessMood = (e) => (e ? e.mem.mood || 'regal' : 'regal');

  const behaviors = {
    'hn-princess': {
      update(e, dt, game) {
        const m = e.mem;
        if (m.field == null) { m.field = m.fieldMax = e.def.field || 130; m.fieldT = 0; }
        // the field grows back once she hasn't been hit for a while
        m.fieldT -= dt;
        if (m.fieldT <= 0 && m.field < m.fieldMax && !LM.status.has(e, 'hn-preening')) m.field = Math.min(m.fieldMax, m.field + (m.mood === 'red' ? 26 : 18) * dt);
        if (!m.awake) {
          e.aggro = false;
          e.atk = null;
          e.alertT = 0;
          e.mx = e.my = 0;
          return;
        }
        if (m.kneeling) {
          if (!HN.masked(game) || HN.eggProvoked(game)) {
            m.kneeling = false;
            m.mood = 'red';
            LM.comms.say({ who: 'hn-princess', text: 'TREACHERY! The servant has corners after all! RED! EVERYTHING IS RED!' });
          } else {
            e.aggro = false;
            e.atk = null;
            e.mx = e.my = 0;
            return;
          }
        }
        e.aggro = true;
        LM.get('behaviors', 'skirmisher').update(e, dt, game);
        e.speedMul *= m.mood === 'red' ? 1.35 : 1;
        // she keeps talking
        m.lineT = (m.lineT == null ? 6 : m.lineT) - dt;
        if (m.lineT <= 0 && !LM.comms.busy()) {
          m.lineT = U.rand(9, 14);
          LM.comms.say({ who: 'hn-princess', text: U.pick(FIGHT_LINES), seconds: 2.6 });
        }
      },
    },
  };

  const princess = {
    name: 'Princess Eggbot', hnThreat: 3, hp: 620, field: 130, armor: 0.2, speed: 74, radius: 22, mass: 9, drawRadius: 70, hitbox: { front: 6, back: 6, r: 24 }, ai: 'hn-princess', keep: [140, 260], sight: 520, leash: 99999,
    accel: 6, turn: 6, boss: true, robot: true, eggbot: true, tkBlock: 0.15, takes: { electric: 1.5, bleed: 0, toxic: 0, acid: 0.6 },
    color: '#ffb8e0', blood: '#ffe68a', gib: '#ffb8e0', deathSound: 'explode', deathGlow: '#ff7ac8',
    attacks: [
      { type: 'ranged', projectile: 'hn-death-ray', damage: 10, speed: 700, burst: 3, burstGap: 0.12, windup: 0.75, cooldown: 2.6, range: 480, spread: 0.05, lead: 0.4, flash: '#ff4ab8' },
      { type: 'nova', damage: 18, radius: 105, windup: 1.0, cooldown: 5.5, recover: 0.5, color: '#c88aff', status: 'hn-tk-dazed' },
      { type: 'summon', enemy: 'hn-eggbot', count: 1, max: 2, windup: 1.2, cooldown: 14 },
    ],
    drops: { gold: [120, 180], items: [{ id: 'hn-loot', chance: 1, props: { hn: 'hn-egg-grenade', n: 2 } }, { id: 'hn-loot', chance: 1, props: { hn: 'hn-princess-tiara' } }] },
    bossBar: {
      name: 'Princess Eggbot', color: '#ff7ac8', range: 700,
      sub: (e) => (LM.status.has(e, 'hn-preening') ? 'PREENING · her field is down' : e.mem.mood === 'red' ? 'RED · run' : (e.mem.field > 1 ? 'field ' + Math.round(e.mem.field) : 'field down') + (e.mem.mood === 'pink' ? ' · pink' : '')),
      phases: [
        { at: 0.66, text: 'PRINCESS: “Children! Mother needs you!”', do: (e, game) => summonNow(e, game, 2) },
        { at: 0.33, do: (e, game) => { e.mem.mood = 'red'; e.mem.fieldMax = 100; LM.comms.say({ who: 'hn-princess', text: 'You SCRATCHED me. Nobody scratches me. RED. I am going RED.' }); summonNow(e, game, 1); } },
      ],
    },
    onDeath(e, game) {
      HN.setFlag(game, 'hnPrincessDone');
      LM.comms.say({ who: 'hn-princess', glitch: true, text: 'Cracked… I am… cracked… Tell them… tell them I was… egg-ceptional…' });
      LM.comms.say({ who: 'hn-princess', glitch: true, seconds: 2, text: '…oh no. Not even now. Who WROTE me?' });
      LM.combat.explode(game, e.x, e.y, { radius: 60, damage: 0, owner: 'enemy', silent: true });
      for (const o of game.enemies) if (!o.dead && o.def.eggbot && o !== e) {
        LM.status.apply(game, o, 'hn-mourning', { seconds: 9 });
        say(game, o, U.pick(['MOTHER!', 'THE PRINCESS IS SCRAMBLED', 'WHO WILL TELL US WE ARE BEAUTIFUL']), '#e8d08a');
      }
      HN.note(game, 'change', 'You destroyed Princess Eggbot in the Greasy Bolt Hole.');
    },
    draw(g, e, t) {
      const s = 22, wob = Math.sin(e.t * 5) * 0.08; // a big body (engine large monsters: radius, hitbox, drawRadius)
      const red = e.mem.mood === 'red';
      g.save();
      g.rotate(wob);
      g.fillStyle = '#1a1214';
      g.beginPath(); g.ellipse(0, 0, s * 0.84, s, 0, 0, U.TAU); g.fill();
      g.fillStyle = red ? '#ff6a6a' : '#ffb8e0';
      g.beginPath(); g.ellipse(0, 0, s * 0.76, s * 0.92, 0, 0, U.TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.ellipse(-s * 0.3, -s * 0.38, s * 0.18, s * 0.3, -0.4, 0, U.TAU); g.fill();
      // a dainty eye band with lashes
      g.fillStyle = '#2a1018';
      g.fillRect(-s * 0.55, -s * 0.16, s * 1.1, s * 0.24);
      g.strokeStyle = '#2a1018';
      g.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * s * 0.2, -s * 0.16); g.lineTo(i * s * 0.22, -s * 0.3); g.stroke(); }
      // the tiara
      g.fillStyle = '#f2d06b';
      g.beginPath();
      g.moveTo(-s * 0.4, -s * 0.84); g.lineTo(-s * 0.3, -s * 1.12); g.lineTo(-s * 0.14, -s * 0.9); g.lineTo(0, -s * 1.22); g.lineTo(s * 0.14, -s * 0.9); g.lineTo(s * 0.3, -s * 1.12); g.lineTo(s * 0.4, -s * 0.84);
      g.closePath(); g.fill();
      G.circle(g, 0, -s * 1.02, 1.8, '#9fe8ff');
      g.restore();
    },
    drawGlow(g, e, t) {
      const m = e.mem;
      G.glow(g, e.x, e.y - 2, 10, m.mood === 'red' ? '#ff3a3a' : '#ff4ab8', 0.7);
      if (m.field > 1) {
        const k = m.field / (m.fieldMax || 130);
        g.strokeStyle = 'rgba(200,138,255,' + (0.18 + 0.4 * k) + ')';
        g.lineWidth = 2;
        g.beginPath(); g.arc(e.x, e.y, e.r + 7 + Math.sin(t * 4) * 1.5, 0, U.TAU); g.stroke();
        G.glow(g, e.x, e.y, e.r + 14, '#c88aff', 0.12 * k);
      }
      if (LM.status.has(e, 'hn-preening')) G.glow(g, e.x, e.y - 18, 12, '#ffd0f0', 0.5 + 0.3 * Math.sin(t * 6));
    },
  };
  function summonNow(e, game, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU + e.t;
      const x = e.x + Math.cos(a) * (e.r + 26), y = e.y + Math.sin(a) * (e.r + 26);
      if (game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) continue;
      const s = game.spawnEnemy('hn-eggbot', x, y, { summoned: true, aggro: true });
      if (s) s.summoner = e;
    }
  }

  // her field soaks hits first (grease and slime gum it up), and she takes more while she preens
  const hurt = LM.combat.hurt;
  LM.combat.hurt = function (game, target, amount, o) {
    o = o || {};
    if (target && target.isEnemy && target.def.id === 'hn-princess' && !target.dead && o.source === 'player') {
      const m = target.mem;
      if (!m.awake) wake(game, target, 'shot');
      if (LM.status.has(target, 'hn-preening')) amount *= 1.5;
      else if (m.field > 0) {
        const gum = o.damageType === 'slime' || o.type === 'hnGrease' ? 2 : 1;
        const soak = Math.min(m.field, amount * gum);
        m.field -= soak;
        m.fieldT = 3;
        amount -= soak / gum;
        if (game.particles && Math.random() < 0.5) game.particles.burst(target.x, target.y, 3, { type: 'spark', color: '#c88aff', speed: 120, life: 0.2, size: 0.8 });
        if (m.field <= 0 && !m.fieldToldDown) {
          m.fieldToldDown = true;
          game.toast('Her field is down. It will come back if you let her rest.', 'key');
        }
        if (amount <= 0.01) return 0;
      }
      if (m.fieldT < 3) m.fieldT = 3;
    }
    return hurt.call(this, game, target, amount, o);
  };

  function boss(game) { return game.enemies.find((e) => !e.dead && e.def.id === 'hn-princess'); }
  function wake(game, e, how) {
    const m = e.mem;
    if (m.awake) return;
    m.awake = true;
    if (how === 'shot') {
      m.mood = 'red';
      LM.comms.say({ who: 'hn-princess', text: 'Did you just… shoot me? During my AUDIENCE? RED. Children, RED!' });
    }
  }

  function audience(game) {
    const e = boss(game);
    if (!e || e.mem.awake) return;
    const s = HN.st(game), P = game.player;
    const masked = HN.masked(game) && !HN.eggProvoked(game);
    const start = (mood, line) => {
      e.mem.mood = mood;
      wake(game, e);
      if (line) LM.comms.say({ who: 'hn-princess', text: line });
    };
    const preen = (secs, line) => {
      e.mem.mood = 'pink';
      e.mem.field = 0;
      wake(game, e);
      LM.status.apply(game, e, 'hn-preening', { seconds: secs });
      LM.comms.say({ who: 'hn-princess', text: line });
      game.toast('She’s preening: her field is down and she takes extra damage for a few seconds. Now.', 'good');
    };
    const flatter = () => {
      const bonus = s.stats.mental + (masked ? 3 : 0);
      const roll = 1 + Math.floor(Math.random() * 10);
      if (roll + bonus >= 10) preen(8, U.pick(['Oh! Oh, you noticed the curvature. Nobody notices the curvature. Let me… let me just turn so you can see the good side. All my sides are the good side.', 'Smooth? You think I’m smooth? I AM smooth. Say it again. No, wait, I’ll say it: I am SO smooth.']));
      else start('red', 'Was that… sarcasm? I have a sarcasm detector. It is egg-shaped and it is SCREAMING. RED!');
      game.toast('Flattery: rolled ' + roll + ' + ' + bonus + ' (Mental' + (masked ? ', the Egg-Mask +3' : '') + ') against 10.', 'key');
    };
    const gifts = [
      { id: 'hn-pristine-soap', label: 'Give her the Pristine Soap', run: () => preen(12, 'Soap? For ME? From the san-station? I have never been so… so CLEAN. Look at me. LOOK at me. I shine.') },
      { id: 'hn-rare-slime', label: 'Give her a tube of Rare Slime', run: () => preen(6, 'Rare slime. A tasteful choice. I shall have it put in a little ovoid vase. Ahem.') },
      { id: 'hn-enoch-bobble', label: 'Give her the Nodding Enoch', run: () => start('red', 'That… that GREASY OLD SHAPE? In MY works? You mock me with the previous management? RED!') },
    ].filter((g) => HN.count(game, g.id) > 0);
    const actions = [
      { label: 'Praise her ovoid beauty (Mental' + (masked ? ' +3 for the mask' : '') + ')', primary: true, key: 'E', onClick: flatter },
    ].concat(gifts.map((g) => ({ label: g.label, onClick: () => { HN.take(game, g.id, 1); g.run(); } })));
    if (masked) actions.push({
      label: 'Kneel as her egg-slent servant', onClick: () => {
        e.mem.awake = true;
        e.mem.kneeling = true;
        LM.comms.say({ who: 'hn-princess', text: 'Egg-slent. Your execution is scheduled for just after the Eggmageddon. Until then you may serve. Here: annihilate some corners for me.' });
        HN.award(game, 'gb-princess-favor', [{ hn: 'hn-egg-grenade' }], 'The Princess’s favor');
        game.toast('She lets you be. Attack anything ovoid on this floor and the mask won’t cover it.', 'key');
      },
    });
    actions.push(
      { label: 'Make an egg pun', onClick: () => { LM.status.apply(game, e, 'hn-preening', { seconds: 2.5 }); start('red', 'I… ha… HA… the identity protocol… COMPELS me to… laugh… I HATE THIS. I hate YOU. RED!'); } },
      { label: 'Start shooting', quiet: true, onClick: () => start('regal', 'How rude. How very… angular.') },
    );
    LM.ui.open({
      kicker: 'The Crown · an audience', title: 'PRINCESS EGGBOT',
      body: h('div', { class: 'hn-panel' },
        lore('A pink egg as big as a barrel sits on a gold dais under a chandelier of polished half-shells. She wears a tiara. Her eye band sweeps over you, slowly, with distaste.'),
        lore('The monster book has a note on the pink ones: play to their vanity. On the red ones: run.'),
        h('p', { class: 'muted' }, 'She is Threat Level 3 with a regenerating field. Grease and slime gum the field up.')),
      dismissable: false,
      actions,
    });
  }

  // ------------------------------------------------------------ trap effects
  const effects = {
    'hn-princess-audience': {
      run(game) {
        const e = boss(game);
        if (!e || e.mem.awake || e.mem.heard) return;
        e.mem.heard = true;
        // her audience is read in the middle of the screen, the game held (engine story lines, SPEC 6.16)
        AUDIENCE.forEach((t, i) => LM.comms.say({ who: 'hn-princess', text: t, pause: true, flag: i === AUDIENCE.length - 1 ? 'hnPrincessSpoke' : undefined }));
      },
    },
  };
  LM.on('flag', ({ name, game }) => {
    if (name === 'hnPrincessSpoke' && game && game.player) setTimeout(() => audience(game), 400);
  });

  // ------------------------------------------------------------ the Greasing Throne
  const ROUNDS = [
    { name: 'THE FIRST ANOINTING', text: 'Nozzles in the armrests hiss. Warm acid runs down the back of the chair, then down the back of you.', acid: 20, toxic: 10 },
    { name: 'THE SECOND ANOINTING', text: 'A hood comes down over your head and fills with yellow fog that tastes like a battery licked a swamp.', acid: 10, toxic: 26 },
    { name: 'THE GREASING', text: 'The whole throne tips back and a hopper overhead dumps a quarter-ton of hot grease, acid and something the dial calls “A LITTLE SOMETHING.”', acid: 22, toxic: 22 },
  ];
  class Strapped {
    constructor(it) { this.it = it; this.on = true; }
    update(dt, game) {
      const P = game.player;
      if (!this.on || P.dead) return true;
      P.x = this.it.x;
      P.y = this.it.y + 4;
      P.vx = P.vy = 0;
      return false;
    }
  }
  function throneRound(it, game, i, strap) {
    const P = game.player;
    const r = ROUNDS[i];
    const anti = P.buffs && P.buffs.some((b) => b.id === 'hn-antitox');
    const toxic = anti ? r.toxic / 2 : r.toxic;
    game.particles.burst(P.x, P.y - 6, 30, { type: 'dot', color: i === 1 ? '#e8e04a' : '#a8c83a', speed: 140, life: 0.6, size: 1.6 });
    LM.audio.play('splash');
    LM.combat.hurt(game, P, r.acid, { source: 'hazard', type: 'hazard', damageType: 'acid' });
    // the toxin lands with the acid (the acid's flinch doesn't spare you it)
    P.invuln = 0;
    if (!P.dead) LM.combat.hurt(game, P, toxic, { source: 'hazard', type: 'hazard', damageType: 'toxic' });
    if (P.dead) { strap.on = false; return; }
    game.schedule(1.4, () => {
      if (P.dead) return (strap.on = false);
      if (i + 1 >= ROUNDS.length) {
        strap.on = false;
        it.done = true;
        HN.award(game, 'gb-throne', [{ hn: 'hn-exotic-filth' }, { type: 'gold', amount: 150 }, { type: 'armor', id: 'hn-slickmail' }], 'The Greasing Throne');
        HN.note(game, 'change', 'You survived the Greasing Throne.');
        LM.ui.showText('YOU HAVE BEEN GREASED', 'The straps let go. A drawer in the footrest slides open with a little fanfare played on what sounds like a tuba full of lard. Inside: credits, a tube of Exotic Filth, and a suit of Enoch’s own Slick-Mail, folded, still warm.\n\nA brass plate on the drawer: CONGRATULATIONS. YOU ARE NOW 3% ENOCH.', 'The Greasing Throne');
        return;
      }
      const nx = ROUNDS[i + 1];
      LM.ui.open({
        kicker: 'The Greasing Throne · round ' + (i + 2) + ' of 3', title: nx.name,
        body: h('div', { class: 'hn-panel' },
          lore('The chair creaks, considering you. You are still alive, which seems to surprise it.'),
          h('p', { class: 'muted' }, 'You have ' + Math.ceil(P.hp) + ' health. Next round: about ' + (nx.acid + (anti ? nx.toxic / 2 : nx.toxic)) + ' before your armor (acid and toxin' + (anti ? '; Anti-Tox halves the toxin' : '') + ').')),
        dismissable: false,
        actions: [
          { label: 'Hold on', primary: true, onClick: () => throneRound(it, game, i + 1, strap) },
          { label: 'Wrench free and get up (no prize)', onClick: () => { strap.on = false; game.toast('You squelch out of the throne. A small sad horn plays.', 'warn'); } },
        ],
      });
    });
  }

  const items = {
    'hn-egg-pa': {
      name: 'Loudspeaker', radius: 6, wallMounted: true, shadow: false,
      init(it) { it.next = U.rand(4, 10); it.line = Math.floor(Math.random() * 9); },
      update(it, dt, game) {
        if (game.attract || !game.player || !LM.comms) return;
        it.next -= dt;
        if (it.next > 0) return;
        const P = game.player;
        if (U.dist(P.x, P.y, it.x, it.y) > 9 * T || LM.comms.busy()) { it.next = 2; return; }
        const enoch = it.props.lines === 'enoch';
        const lines = enoch ? ENOCH_LINES : PA;
        // the first thing each speaker says is read in the middle of the screen; after that, the corner
        const first = !it._spoke;
        it._spoke = true;
        LM.comms.say({ who: enoch ? 'hn-enoch' : 'hn-egg-pa', text: lines[it.line++ % lines.length], glitch: enoch && Math.random() < 0.2, pause: first ? true : undefined });
        it.next = U.rand(enoch ? 14 : 24, enoch ? 20 : 36);
        // the rest of the works hears it too
        for (const o of game.items) if (o !== it && o.def.id === 'hn-egg-pa') o.next = Math.max(o.next, 8);
      },
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        g.fillStyle = '#1a1612';
        g.beginPath(); g.moveTo(-5, -4); g.lineTo(5, -4); g.lineTo(7, 3); g.lineTo(-7, 3); g.closePath(); g.fill();
        g.fillStyle = it.props.lines === 'enoch' ? '#6a6a24' : '#c8a0b8';
        g.fillRect(-4, -3, 8, 4);
      },
    },
    'hn-coms': {
      name: 'Coms station', radius: 14, solid: 'rect', mapColor: '#ff7ac8', mapAlways: true,
      light: { color: '#ff7ac8', radius: 130, intensity: 0.5, flicker: 0.1 },
      init(it) { it.box = [40, 22]; },
      interact: {
        prompt: 'Use the coms station',
        use(it, game) {
          const jammed = HN.flag(game, 'hnEggJam');
          LM.ui.open({
            kicker: 'The Crown · coms station', title: 'OVOID OUTREACH · ALL RECEIVERS',
            body: h('div', { class: 'hn-panel' },
              lore('Enoch’s war-room radio, a wall of valves and dials, re-skinned in pink enamel. A dish on the roof, says the diagram, aimed at everything. The screen scrolls the egg-heads’ call log:'),
              h('pre', { class: 'hn-log' }, [
                'CALL 4,112 · AGENCY REPAIR BAY (ANOMALOUS STRUCTURE) · robot facility: YES · reply: “PLEASE HOLD.” · status: holding (199 years)',
                'CALL 4,113 · THE MUSHROOM · robot facility: YES (large) · reply: none · route on file: north-east along the dead pipeline to the dry lake, then follow the stalk’s shadow at noon',
                'CALL 4,114 · THE TALL STACKS · robot facility: SUSPECTED · reply: smoke',
                'CALL 4,115 · BOOM-TOWN · robot facility: NO · reply: “who is this” · flagged: RUDE',
                'CALL 4,116 · (UNKNOWN) · reply: “have YOU considered being a cube?” · flagged: ENEMY OF THE EGG',
              ].join('\n')),
              h('p', { class: 'muted' }, jammed ? 'The infection broadcast is jammed.' : 'Every few seconds the dish sends the same packet: HAVE YOU CONSIDERED BEING AN EGG? It is the infection.')),
            actions: [
              { label: 'Copy down the way to the Mushroom', primary: true, key: 'E', onClick: () => learnMushroom(game) },
              { label: jammed ? 'The broadcast is jammed' : 'Jam the infection broadcast (hack)', disabled: jammed, onClick: () => setTimeout(() => jam(it, game), 0) },
              { label: 'Close', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#1a1014';
        g.fillRect(-20, -11, 40, 22);
        g.fillStyle = '#c8a0b8';
        g.fillRect(-19, -10, 38, 20);
        g.fillStyle = '#2a1018';
        g.fillRect(-14, -7, 18, 10);
        for (let i = 0; i < 4; i++) G.circle(g, 9 + (i % 2) * 5, -5 + Math.floor(i / 2) * 6, 1.8, '#f4ecd8');
      },
      drawGlow(g, it, t) { G.glow(g, -5, -2, 14, '#ff7ac8', 0.35 + 0.15 * Math.sin(t * 3)); },
    },
    'hn-throne': {
      name: 'The Greasing Throne', radius: 15, solid: false, mapColor: '#c8d04a', mapAlways: true,
      light: { color: '#c8d04a', radius: 110, intensity: 0.45, flicker: 0.08 },
      hnValuable: (it, game) => !HN.hasFound(game, 'gb-throne'),
      interact: {
        available: (it, game) => !HN.hasFound(game, 'gb-throne') && !it.busy,
        prompt: 'Look at the Greasing Throne',
        use(it, game) {
          const P = game.player;
          const total = ROUNDS.reduce((a, r) => a + r.acid + r.toxic, 0);
          LM.ui.open({
            kicker: 'The Greasing Throne', title: 'SIT, AND BE GREASED',
            body: h('div', { class: 'hn-panel' },
              lore('A great gold chair on a drain, upholstered in something that used to be leather, its arms bristling with nozzles. Over it, a hopper. Before it, a plaque: THE TRIAL OF THE GREASING. THREE ANOINTINGS. SURVIVE, AND RECEIVE THE FAVOR OF ENOCH. DO NOT SURVIVE, AND ALSO RECEIVE IT, IN A SENSE.'),
              lore('Under the plaque, a handwritten card: Please do not let the Eggbots sit on it. They roll off.'),
              h('div', { class: 'hn-risk' }, h('strong', null, 'The trial: '), 'three rounds of acid and toxin, about ' + total + ' damage in all before your armor. You can get up between rounds (no prize). If it kills you, you’re dead. You have ' + Math.ceil(P.hp) + ' health.')),
            actions: [
              {
                label: 'Sit down', primary: true, key: 'E', onClick: () => {
                  it.busy = true;
                  const strap = new Strapped(it);
                  game.fx.push(strap);
                  game.toast('Straps snap shut across your chest. ' + ROUNDS[0].name + '.', 'warn');
                  game.schedule(0.9, () => throneRound(it, game, 0, strap));
                  game.schedule(30, () => { it.busy = false; });
                },
              },
              { label: 'Not today', quiet: true },
            ],
          });
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#2a2410';
        g.fillRect(-15, -16, 30, 30);
        g.fillStyle = '#c8a040';
        g.fillRect(-13, -15, 26, 8);
        g.fillStyle = '#5a3a1e';
        g.fillRect(-11, -7, 22, 16);
        g.fillStyle = '#c8a040';
        g.fillRect(-15, -7, 4, 16);
        g.fillRect(11, -7, 4, 16);
        g.fillStyle = '#6a7a1a';
        for (let i = -1; i <= 1; i++) G.circle(g, i * 8, -12, 1.6, '#8a9a2a');
      },
      drawGlow(g, it, t, game) { if (!(game && HN.hasFound(game, 'gb-throne'))) G.glow(g, 0, -6, 18, '#c8d04a', 0.18 + 0.08 * Math.sin(t * 2)); },
    },
  };

  function learnMushroom(game) {
    const s = HN.st(game);
    if (!s.locs) s.locs = {};
    if (s.locs.mushroom !== 'known' && s.locs.mushroom !== 'visited') {
      s.locs.mushroom = 'known';
      game.toast('The Mushroom is on your map now: you know the way from here.', 'key');
    }
    HN.setFlag(game, 'hnMushroomRoute');
    HN.note(game, 'clue', 'The way to the Mushroom (from the Greasy Bolt Hole’s coms log): north-east along the dead pipeline to the dry lake, then follow the stalk’s shadow at noon. It has a large robot facility, and the Eggbots have been calling it.');
  }
  function jam(it, game) {
    HN.hack(game, {
      kicker: 'Coms station', title: 'JAM THE OVOID OUTREACH', difficulty: 11, override: true,
      text: 'The broadcast loop is guarded by an identity check that asks, in many ways, whether you are an egg.',
      risk: 'the dish swings round and gives you a jolt. You can try again.',
      onSuccess: (g) => {
        HN.setFlag(g, 'hnEggJam');
        HN.note(g, 'change', 'You jammed the Eggbot infection broadcast at the Greasy Bolt Hole: the Mushroom and the Stacks won’t hear it.');
        LM.comms.say({ who: 'hn-egg-pa', glitch: true, text: 'Broadcast… interrupted. Please stand by for… for… have you considered… being… a… cube?' });
      },
      onFail: () => HN.shockPlayer(game, 10),
    });
  }

  HN.defineItems({
    'hn-princess-tiara': {
      name: 'Princess Eggbot’s Tiara', cat: 'Valuable', era: 'Ovoid', value: 220, icon: { glyph: 'T', color: '#f2d06b' },
      desc: 'Gold, small, set with one blue stone. Engraved on the inside band: FOR THE MOST BEAUTIFUL SHAPE. Engraved under that, smaller: (ME).',
    },
  });

  LM.definePack({ id: 'hn-greasy', speakers, behaviors, enemies: { 'hn-princess': princess }, effects, items });
})();
