/* HaveNot — packs/hn-anomalous/agency.js
 * The Anomalous Structure: an Age of War advertising agency whose security-and-promotion system is still
 * running. Its three looks (Institutional, Sterile White, Industrial-Metal → Emergency), its iris doors, its
 * shock floors and defense field, the set pieces (the Sphinx Gun's question, the Monoid's bargain, the test
 * chamber's three modes, the Security Station, the Robot Repair Bay, the inner core), and the building's memory:
 *
 *   hnTrapsOff     the Security Station shut the crossing traps down (beams, plates, shock floors), all floors
 *   hnTerm1        the floor-1 office terminal shut that floor's dart corridor down
 *   hnMistOff      the floor-2 lab terminal shut the toxic mist generators off
 *   hnBayOff       the Repair Bay is off: robots you destroy stay destroyed
 *   hnAlarm        floor 3's alarm has gone off: Emergency lighting
 *   hnAgencyClosed the security system accepted that the agency is closed (The Silent Agency)
 *   hnAdsSilent    the ad system is silent (The Last Campaign)
 *
 * Between missions (HN.onArrive with the floor's last-visit mission): Gladiator Roaches come back at
 * 'roachSpawn' tiles (native bio-weapons; they never drop anything), and while the Repair Bay runs it
 * rebuilds up to two robots per floor at 'rebuild' tiles. Nothing else comes back.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;
  const lore = (t) => h('p', { class: 'lore' }, t);
  const flag = (game, f) => HN.flag(game, f);

  // ------------------------------------------------------------ the iris doors (Sterile White)
  const doorStyles = {
    iris(ctx, door) {
      const k = U.ease.inOutSine(door.open);
      const R = T / 2 + 1;
      const lockCol = door.flag && !door.unlocked ? door.flagColor || '#58b2ff' : null;
      ctx.save();
      ctx.translate(door.x, door.y);
      // the ring
      ctx.fillStyle = '#c8ccd0';
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, U.TAU);
      ctx.arc(0, 0, R - 3, 0, U.TAU, true);
      ctx.fill();
      // six blades that turn aside as it opens
      const hole = (R - 3) * k;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * U.TAU + k * 1.2;
        ctx.fillStyle = i % 2 ? '#e8eaec' : '#d8dcdf';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * hole, Math.sin(a) * hole);
        ctx.lineTo(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3));
        ctx.lineTo(Math.cos(a + 1.15) * (R - 3), Math.sin(a + 1.15) * (R - 3));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,90,100,0.5)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      if (lockCol && k < 0.2) {
        ctx.fillStyle = lockCol;
        ctx.beginPath();
        ctx.arc(0, 0, 2.4, 0, U.TAU);
        ctx.fill();
      }
      if (door.sealed) {
        ctx.strokeStyle = '#c82a2a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, R - 1.5, 0, U.TAU);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
  const doorGlows = {
    iris(ctx, door, game, t) {
      if (door.open > 0.8) return;
      G.glow(ctx, door.x, door.y, 18, '#bfe8ff', 0.15 * (1 - door.open) + 0.05 * Math.sin(t * 2));
    },
  };

  // ------------------------------------------------------------ the three looks
  const INST_WALL = { style: 'drywall', top: ['#a8c4a8'], edge: '#d8ecd8', face: '#8aa88a', faceDark: '#5a785a', base: '#2a3a2a' };
  const LAB_WALL = { style: 'drywall', top: ['#e8ecee'], edge: '#ffffff', face: '#ccd2d6', faceDark: '#a8b0b6', base: '#6a747a' };
  const SEC_WALL = { style: 'bulkhead', top: ['#3a3c40', '#36383c', '#404246'], seam: '#16181a', bolt: '#7a7e84', rust: '#5a3a20', edge: '#7a7e84', face: '#222428', stripe: ['#e0c030', '#141210'] };
  const environments = {
    'hn-agency-inst': {
      name: 'The Anomalous Structure · Institutional', voidColor: '#060807', ambient: '#3a423c', attractAmbient: '#5a625c', outsideSight: '#2a302c', playerLight: '#f0fff4', torch: '#e8f4ff',
      floors: {
        0: { style: 'bath-tile', tile: '#b8b4a0', grout: '#7a7664', accent: '#8aa88a' },
        1: { style: 'carpet-tile', colors: ['#4a5246', '#464e42'], line: '#8a9a7a', speck: '#22281e' },
        2: { style: 'planks', colors: ['#8a6a46', '#826244', '#92704a'], grain: '#4a321c', gap: '#2a1a0c' },
        3: { style: 'terrazzo', base: '#b8b8ac', chips: ['#8a8a82', '#5a6a62', '#a88a6a', '#e0e0d8', '#3a4440'], strip: '#c84ad8' },
      },
      floor: { style: 'bath-tile', tile: '#b8b4a0', grout: '#7a7664', accent: '#8aa88a' },
      floorAlt: { style: 'carpet-tile', colors: ['#4a5246', '#464e42'], line: '#8a9a7a', speck: '#22281e' },
      wall: INST_WALL, door: { panel: '#6a7a6a', frame: '#2a3a2a', trim: '#d8e8d8' },
      water: { deep: '#18303a', shallow: '#2c5462', foam: '#a8d4dc' }, pit: { core: '#030304', wall: '#1d1f22', rim: '#3a3d42' },
      particles: { type: 'mote', color: '#e8f4e8', rate: 4, alpha: 0.16, drift: 3 },
      ambience: { base: 60, cutoff: 900, wind: 300, gain: 0.03, wave: 'sine' },
    },
    'hn-agency-lab': {
      name: 'The Anomalous Structure · Sterile White', voidColor: '#0a0c0e', ambient: '#5a6066', attractAmbient: '#7a8086', outsideSight: '#3a4044', playerLight: '#ffffff', torch: '#d8f4ff',
      floors: {
        0: { style: 'bath-tile', tile: '#e4e8ea', grout: '#b8c0c4', accent: '#9fd8ff' },
        1: { style: 'carpet-tile', colors: ['#4a5246', '#464e42'], line: '#8a9a7a', speck: '#22281e' },
        2: { style: 'terrazzo', base: '#e0e4e6', chips: ['#c0c8cc', '#a8b4ba', '#ffffff', '#9fd8ff', '#8a949a'], strip: '#9fd8ff' },
      },
      floor: { style: 'bath-tile', tile: '#e4e8ea', grout: '#b8c0c4', accent: '#9fd8ff' },
      floorAlt: { style: 'carpet-tile', colors: ['#4a5246', '#464e42'], line: '#8a9a7a', speck: '#22281e' },
      wall: LAB_WALL, door: { panel: '#c8ccd0', frame: '#8a9094', trim: '#ffffff' },
      doorStyles, doorGlows,
      particles: { type: 'mote', color: '#ffffff', rate: 3, alpha: 0.12, drift: 2 },
      ambience: { base: 70, cutoff: 1200, wind: 200, gain: 0.025, wave: 'sine' },
    },
    'hn-agency-sec': {
      name: 'The Anomalous Structure · Security', voidColor: '#040404', ambient: '#26282c', attractAmbient: '#3a3c40', outsideSight: '#1a1c1e', playerLight: '#ffe6c4', torch: '#ffb35a',
      floor: { style: 'plates', colors: ['#3e4044', '#3a3c40', '#424448'], seam: '#141516', rivet: '#6a6e74', rust: '#5a3a20', stripe: ['#e0c030', '#141210'] },
      floorAlt: { style: 'grate', bar: '#3a3c40', under: '#060606', heat: '#ff3a2a' },
      wall: SEC_WALL, door: { panel: '#4a4c50', frame: '#16181a', trim: '#e0c030' },
      pit: { core: '#020202', wall: '#16181a', rim: '#3a3c40' },
      particles: { type: 'mote', color: '#c8c8c0', rate: 5, alpha: 0.2, drift: 4 },
      ambience: { base: 38, cutoff: 220, wind: 260, gain: 0.06, wave: 'sawtooth' },
    },
  };

  // ------------------------------------------------------------ terrain
  const floorBake = (variant) => (g, x, y, info) => LM.paintFloor(g, x, y, Object.assign({}, info, { variant }));
  const terrain = {
    'hn-iris': { floorLike: true, door: { lock: null, style: 'iris' }, mapColor: '#bfe8ff', bake: (g, x, y, info) => LM.get('terrain', 'door').bake(g, x, y, info) },
    'hn-shock': {
      floorLike: true, hnShock: true, mapColor: '#3a6a8a',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = 'rgba(10,20,30,0.55)';
        g.fillRect(x + 1, y + 1, T - 2, T - 2);
        g.strokeStyle = '#b87a3a';
        g.lineWidth = 1;
        for (let i = 4; i < T; i += 6) {
          g.beginPath();
          g.moveTo(x + i, y + 1);
          g.lineTo(x + i, y + T - 1);
          g.stroke();
        }
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        if (!game || !HN.shockAt(game, tx, ty)) return;
        const k = 0.5 + 0.5 * Math.sin(t * 9 + tx * 1.7 + ty);
        g.fillStyle = 'rgba(140,220,255,' + (0.08 + 0.1 * k) + ')';
        g.fillRect(x + 1, y + 1, T - 2, T - 2);
        if (k > 0.85) {
          g.strokeStyle = 'rgba(200,240,255,0.8)';
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(x + 4, y + 4 + k * 20);
          g.lineTo(x + 16, y + 12);
          g.lineTo(x + 28, y + 26 - k * 10);
          g.stroke();
        }
      },
    },
    'hn-field': {
      solid: true, blocksShots: true, mapColor: '#9fd8ff',
      bake: (g, x, y, info) => LM.paintFloor(g, x, y, info),
      drawGlow(g, x, y, tx, ty, game, t) {
        const k = 0.5 + 0.5 * Math.sin(t * 4 + tx + ty * 0.7);
        g.fillStyle = 'rgba(140,210,255,' + (0.16 + 0.12 * k) + ')';
        g.fillRect(x, y, T, T);
        g.strokeStyle = 'rgba(200,240,255,0.5)';
        g.lineWidth = 0.7;
        for (let i = 0; i < 3; i++) {
          const yy = y + ((t * 20 + i * 11 + tx * 3) % T);
          g.beginPath();
          g.moveTo(x, yy);
          g.lineTo(x + T, yy);
          g.stroke();
        }
      },
    },
    'hn-vent': {
      floorLike: true, mapColor: 'rgba(205,190,160,0.16)',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = '#141414';
        g.fillRect(x + 6, y + 6, T - 12, T - 12);
        g.fillStyle = '#4a4a46';
        for (let i = 8; i < T - 6; i += 3) g.fillRect(x + 6, y + i, T - 12, 1);
      },
    },
  };

  // ------------------------------------------------------------ the Sphinx Gun's question
  HN.SPHINX = {
    slogan: 'WANT MORE. WORK MORE. BE MORE.',
    preludes: [
      'IDENTIFY YOURSELF. NO. DON’T. I DON’T CARE.',
      'WHAT IS THE AIRSPEED OF A— NO. WRONG QUESTION. CORRECT QUESTION FOLLOWS.',
      'I HAVE BEEN ALONE WITH THIS QUESTION FOR THREE HUNDRED YEARS.',
      'ARE YOU A CUSTOMER? EVERYONE IS A CUSTOMER.',
    ],
    answers: ['WANT MORE. WORK MORE. BE MORE.', 'WORK HARD. PLAY HARD. BUY HARDER.', 'PRODUCTIVITY IS ITS OWN REWARD.', 'THE CUSTOMER IS ALWAYS RIGHT.'],
  };
  HN.askSphinx = function (game) {
    if (flag(game, 'hnSphinxOk') || flag(game, 'hnSphinxDead')) return;
    if (LM.ui.modalOpen) return;
    // one attempt per mission: a wrong answer keeps it shooting until you leave and come back
    if (flag(game, 'hnSphinxAngry')) return game.toast('“YOU HAVE ALREADY ANSWERED. INCORRECTLY.” Come back another day.', 'warn');
    const S = HN.SPHINX;
    const pre = S.preludes[(HN.st(game).mission + (game.time | 0)) % S.preludes.length];
    const order = S.answers.slice().sort((a, b) => U.hash2(a.length, HN.st(game).mission, 3) - U.hash2(b.length, HN.st(game).mission, 3));
    const answer = (a) => {
      if (a === S.slogan) {
        HN.setFlag(game, 'hnSphinxOk');
        LM.audio.play('key');
        game.toast('“CORRECT. WELCOME, EMPLOYEE. YOUR ENTHUSIASM HAS BEEN NOTED.” The Sphinx Gun powers down.', 'good');
        HN.note(game, 'clue', 'The Sphinx Gun stood down for the slogan: WANT MORE. WORK MORE. BE MORE.');
      } else {
        HN.setFlag(game, 'hnSphinxAngry');
        HN.st(game).sphinxWrong = HN.st(game).mission;
        LM.audio.play('alarm');
        game.toast('“INCORRECT. YOUR EMPLOYMENT STATUS HAS BEEN UPGRADED TO: TERMINATED.” It powers up.', 'warn');
      }
    };
    const actions = order.map((a) => ({ label: a, onClick: () => answer(a) }));
    if (HN.count(game, 'hn-override') > 0) actions.push({ label: 'Use the Security Override Module', onClick: () => { HN.take(game, 'hn-override'); HN.setFlag(game, 'hnSphinxOk'); game.toast('“MANAGEMENT RECOGNIZED. STANDING DOWN. SORRY, SIR. MA’AM. SIR.”', 'good'); } });
    actions.push({ label: 'Hack it instead', onClick: () => setTimeout(() => HN.hack(game, {
      kicker: 'Sphinx Gun', title: 'Argue with an insane expert system', difficulty: 10, override: true,
      text: 'The Sphinx Gun’s access panel is under its chin. Its expert system is very sure of itself and very confused.',
      risk: 'it gets angry and opens fire.',
      onSuccess: (g) => { HN.setFlag(g, 'hnSphinxOk'); g.toast('“…YES. YOU ARE MANAGEMENT. I ALWAYS KNEW.” It powers down.', 'good'); },
      onFail: (g) => answer(''),
    }), 0) });
    LM.ui.open({
      kicker: 'Reception · Sphinx Gun', title: 'STATE THE COMPANY’S OFFICIAL PRODUCTIVITY SLOGAN',
      body: h('div', { class: 'hn-panel' }, lore('A squat turret on the reception desk swivels to face you. Its face plate is a stylised sphinx with a laser where the nose should be. “' + pre + '”'), lore('“STATE THE COMPANY’S OFFICIAL PRODUCTIVITY SLOGAN. YOU HAVE ONE ATTEMPT. I HAVE TWO SHOTS PER CYCLE.”'),
        h('div', { class: 'hn-risk' }, h('strong', null, 'Get it wrong: '), 'it powers up and fires. You can still fight it, run past it, or come back.')),
      actions,
      dismissable: false,
    });
  };
  LM.on('flag', ({ name, game }) => {
    if (name === 'hnSphinxAsk') setTimeout(() => HN.askSphinx(game), 120);
  });

  // ------------------------------------------------------------ terminals
  Object.assign(HN.TERMINALS, {
    'f1-traps'(game, it) {
      if (flag(game, 'hnTerm1') || flag(game, 'hnTrapsOff')) return LM.ui.showText('Facilities terminal', 'CORRIDOR COURTESY SYSTEMS: OFF. “We hope you enjoyed them.”', 'Terminal');
      HN.hack(game, {
        kicker: 'Facilities terminal', title: 'CORRIDOR COURTESY SYSTEMS', difficulty: 8,
        text: 'A green-screen terminal with a menu: CORRIDOR COURTESY SYSTEMS (DARTS) · EAST HALL · ARMED. It wants a facilities password, or an argument.',
        risk: 'a shock through the keyboard, and the building sends a maintenance robot to “assist”. You can try again.',
        onSuccess: (g) => { HN.setFlag(g, 'hnTerm1'); HN.disarmTraps(g, 'darts'); g.toast('East hall courtesy darts: OFF.', 'good'); },
        onFail: (g) => { HN.shockPlayer(g, 8); HN.failHack(g, it, 'robots'); },
      });
    },
    'f2-mist'(game, it) {
      if (flag(game, 'hnMistOff')) return LM.ui.showText('Lab environment terminal', 'PEST DETERRENT MIST: OFF. AMBIANCE FOG: ON. (Nobody can find the switch for the ambiance fog.)', 'Terminal');
      HN.hack(game, {
        kicker: 'Lab environment terminal', title: 'PEST DETERRENT MIST', difficulty: 9,
        text: 'LAB ENVIRONMENT · PEST DETERRENT (YELLOW BAND UNITS): ACTIVE · AMBIANCE FOG (BLUE BAND UNITS): ACTIVE.',
        risk: 'a jolt, and two Knife Fighters come to see who is typing. You can try again.',
        onSuccess: (g) => { HN.setFlag(g, 'hnMistOff'); g.toast('The yellow-band mist generators sigh and stop.', 'good'); },
        onFail: (g) => { HN.shockPlayer(g, 8); HN.failHack(g, it, 'alarm'); },
      });
    },
    'f2-memo'(game) {
      HN.note(game, 'clue', 'Lab memo: ARCHIVE opens the auditors’ floor safe; ENDURANCE is a live-fire stress test; SHOWCASE is the client demo.');
      LM.ui.showText('Test chamber operating notes', 'SHOWCASE: the client demo. Lights, music, a hologram of a happy customer. Totally safe. Clients love it.\n\nARCHIVE: drops the floor safe in the middle of the chamber for the auditors. Please put things BACK in it, Gary.\n\nENDURANCE: live-fire stress test of the prototype security units. Seals the chamber. Do NOT run with a visitor inside, Gary. I mean it.', 'Terminal');
    },
  });

  HN.disarmTraps = function (game, kind) {
    for (const tr of game.traps) {
      const k = tr.def.hn;
      if (!k) continue;
      if (kind === 'all' ? k === 'crossing' || k === 'darts' : k === kind) {
        tr.armed = false;
        tr.beams = [];
      }
    }
  };

  // ------------------------------------------------------------ fixtures of the set pieces
  const items = {
    'hn-sphinx-console': {
      name: 'Reception screen', radius: 7, wallMounted: false, solid: false, mapColor: '#f2c96b',
      interact: {
        available: (it, game) => !flag(game, 'hnSphinxOk') && !flag(game, 'hnSphinxDead'),
        prompt: 'Answer the Sphinx Gun',
        use: (it, game) => HN.askSphinx(game),
      },
      draw(g) {
        g.fillStyle = '#16181a';
        g.fillRect(-6, -4, 12, 8);
        g.fillStyle = '#3a2a14';
        g.fillRect(-5, -3, 10, 6);
      },
      drawGlow(g, it, t, game) { if (game && !flag(game, 'hnSphinxOk')) G.glow(g, 0, 0, 8, '#f2c96b', 0.4 + 0.2 * Math.sin(t * 3)); },
    },
    'hn-test-console': {
      name: 'Test chamber console', radius: 10, solid: true, mapColor: '#9fd8ff',
      light: { color: '#9fd8ff', radius: 90, intensity: 0.45, flicker: 0.05 },
      interact: {
        available: (it, game) => !flag(game, 'hnTestDone'),
        prompt: 'Use the test chamber console',
        use(it, game) {
          const run = (mode) => {
            HN.setFlag(game, 'hnTestDone');
            HN.setFlag(game, mode);
            if (mode === 'hnTestShow') game.toast('SHOWCASE: a hologram of a happy customer appears in the chamber and thanks you for your business, forever.', 'good');
            if (mode === 'hnTestArchive') game.toast('ARCHIVE: the chamber floor opens. A safe rises out of it on a hydraulic column.', 'key');
            if (mode === 'hnTestEndure') game.toast('ENDURANCE: “VISITOR DETECTED IN CHAMBER. PROCEEDING ANYWAY.”', 'warn');
          };
          LM.ui.open({
            kicker: 'Testing chamber', title: 'SELECT OPERATING MODE',
            body: h('div', { class: 'hn-panel' }, lore('Three big buttons under a cracked glass cover, labels in cheerful agency type. A sticky note on the cover: “PLEASE READ THE NOTES FIRST — G.”'),
              h('p', { class: 'muted' }, 'One mode only: the console locks after a run.')),
            actions: [
              { label: 'SHOWCASE', onClick: () => run('hnTestShow') },
              { label: 'ARCHIVE', onClick: () => run('hnTestArchive') },
              { label: 'ENDURANCE', onClick: () => run('hnTestEndure') },
              { label: 'Not yet', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#c8ccd0';
        G.roundRect(g, -11, -8, 22, 16, 3);
        g.fill();
        for (const [x, c] of [[-6, '#4ad88a'], [0, '#5ab8e8'], [6, '#ff5a3a']]) G.circle(g, x, 1, 2.4, c);
      },
    },
    'hn-station-console': {
      name: 'Security Station console', radius: 12, solid: true, mapColor: '#ff5a3a',
      light: { color: '#ff7a5a', radius: 110, intensity: 0.5, flicker: 0.08 },
      interact: {
        prompt: 'Use the Security Station console',
        use(it, game) {
          const off = flag(game, 'hnTrapsOff');
          LM.ui.open({
            kicker: 'Security Station', title: 'AGENCY SECURITY · ALL FLOORS',
            body: h('div', { class: 'hn-panel' }, lore('A wall of monitors. Video feeds of every floor: the reception desk, the labs, a roach eating a stapler, you, from behind. A big console with switches under plastic covers.'),
              h('p', { class: 'muted' }, off ? 'Crossing traps: OFF on every floor.' : 'Crossing traps (beams, pressure plates, shock floors): ARMED on every floor.')),
            actions: [
              { label: 'Shut down the crossing traps, building-wide', primary: !off, disabled: off, onClick: () => { HN.setFlag(game, 'hnTrapsOff'); HN.disarmTraps(game, 'all'); LM.audio.play('key'); game.toast('CROSSING SECURITY: OFF, ALL FLOORS. The shock floors go dark.', 'good'); HN.note(game, 'change', 'You shut down the agency’s crossing traps from the Security Station.'); } },
              { label: 'Show floor 3 on the minimap', onClick: () => { game.level.explored.fill(1); game.toast('The feeds map the whole floor onto your minimap.', 'key'); } },
              { label: 'Unlock the armory', disabled: flag(game, 'hnSec3'), onClick: () => { HN.setFlag(game, 'hnSec3'); game.toast('ARMORY: UNLOCKED. “Please sign for all ordnance.”', 'key'); } },
              { label: 'Close', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#16181a';
        g.fillRect(-14, -9, 28, 18);
        g.fillStyle = '#2a3038';
        for (let i = 0; i < 3; i++) g.fillRect(-12 + i * 9, -7, 7, 6);
        g.fillStyle = '#3a3c40';
        g.fillRect(-12, 2, 24, 5);
      },
      drawGlow(g, it, t) {
        for (let i = 0; i < 3; i++) G.glow(g, -8.5 + i * 9, -4, 6, i === 1 ? '#ff5a3a' : '#5ab8e8', 0.4 + 0.15 * Math.sin(t * 3 + i));
      },
    },
    'hn-bay-console': {
      name: 'Repair Bay control', radius: 11, solid: true, mapColor: '#e0c030',
      light: (it, game) => (game && flag(game, 'hnBayOff') ? null : { color: '#e0c030', radius: 120, intensity: 0.5, flicker: 0.1 }),
      interact: {
        prompt: 'Use the Repair Bay control',
        use(it, game) {
          const off = flag(game, 'hnBayOff');
          const pulled = HN.hasFound(game, 'bay-coupling');
          LM.ui.open({
            kicker: 'Robot Repair Bay', title: off ? 'REPAIR BAY: OFFLINE' : 'REPAIR BAY: REBUILDING',
            body: h('div', { class: 'hn-panel' },
              lore(off ? 'The tracks are still. The arms hang. A robot half-rebuilt stares at nothing with one eye.' : 'Tracks, arms, black-and-yellow danger stripes. The arms are lovingly re-assembling a maintenance robot from the parts of three others. A board reads: UNITS REBUILT THIS QUARTER: 1,104.'),
              h('p', { class: 'muted' }, off ? '' : 'While it runs, robots you destroy anywhere in the agency are rebuilt between missions. The power coupling at its heart is worth a lot to anyone who needs power.')),
            actions: [
              { label: 'Shut it down', disabled: off, onClick: () => { HN.bayOff(game); } },
              { label: pulled ? 'The coupling is gone' : 'Pull the power coupling (shuts it down)', primary: !pulled, disabled: pulled, onClick: () => { HN.bayOff(game); HN.award(game, 'bay-coupling', [{ hn: 'hn-coupling' }], 'Repair Bay'); } },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#16181a';
        g.fillRect(-12, -9, 24, 18);
        g.fillStyle = '#e0c030';
        for (let i = -12; i < 12; i += 6) g.fillRect(i, 6, 3, 3);
        g.fillStyle = game && flag(game, 'hnBayOff') ? '#3a2a2a' : '#4ad88a';
        g.fillRect(-6, -5, 12, 7);
      },
    },
    'hn-core': {
      name: 'Inner core', radius: 16, solid: true, mapColor: '#ff4ad8', mapAlways: true,
      light: (it, game) => (game && flag(game, 'hnAdsSilent') ? { color: '#5ab8e8', radius: 120, intensity: 0.3 } : { color: '#ff4ad8', radius: 200, intensity: 0.7, flicker: 0.15 }),
      interact: {
        available: (it, game) => !flag(game, 'hnAdsSilent'),
        prompt: 'Face the inner core',
        use: (it, game) => HN.openCore(game, it),
      },
      draw(g, it, t, game) {
        const silent = game && flag(game, 'hnAdsSilent');
        g.fillStyle = '#121216';
        G.circle(g, 0, 0, 17, '#121216');
        G.circle(g, 0, 0, 14, silent ? '#2a2a34' : '#3a1a3a');
        g.rotate(silent ? 0 : t * 0.7);
        for (let i = 0; i < 6; i++) {
          g.rotate(U.TAU / 6);
          g.fillStyle = silent ? '#3a3a44' : '#ff4ad8';
          g.fillRect(6, -1.5, 6, 3);
        }
      },
      drawGlow(g, it, t, game) {
        if (game && flag(game, 'hnAdsSilent')) return;
        G.glow(g, 0, 0, 30, (t * 2) % 2 < 1 ? '#ff4ad8' : '#22e6ff', 0.55);
      },
    },
  };

  // a memo, a note, a whiteboard: reading it sets its flag (a code, a clue) and writes the clue in the ledger
  items['hn-memo'] = {
    name: 'Memo', radius: 8, solid: true, mapColor: '#e8dcc0',
    interact: {
      prompt: (it) => 'Read: ' + (it.props.title || 'the memo'),
      use(it, game) {
        if (it.props.flag) HN.setFlag(game, it.props.flag);
        if (it.props.clue) HN.note(game, 'clue', it.props.clue);
        LM.ui.showText(it.props.title || 'Memo', it.props.text || '', it.props.kicker || 'Memo');
      },
    },
    draw(g) {
      g.fillStyle = '#2a2420';
      g.fillRect(-7, -6, 14, 12);
      g.fillStyle = '#e8e0cc';
      g.fillRect(-6, -5, 12, 10);
      g.fillStyle = '#8a8070';
      for (let i = 0; i < 4; i++) g.fillRect(-4.5, -3.5 + i * 2.2, 9 - (i % 2) * 3, 0.7);
    },
    drawGlow(g, it, t, game) { if (game && it.props.flag && !game.hasFlag(it.props.flag)) G.glow(g, 0, 0, 9, '#f2c96b', 0.12 + 0.06 * Math.sin(t * 2)); },
  };
  // the executive desk's DESK SECURITY box opens when the drawer does
  HN.CACHE_HOOKS.defender = function (game, it) {
    game.toast('The DESK SECURITY box bursts open. Something small and furious comes out of it.', 'warn');
    for (let i = 0; i < 2; i++) game.spawnEnemy('hn-defender', it.x + U.rand(-10, 10), it.y + 14, { aggro: true });
  };

  // the dead courier's map puts the Bolt Hole on the near-area map
  HN.CACHE_HOOKS.courier = function (game) {
    HN.revealLocation(game, 'bolthole', 'the courier’s map');
    HN.objective(game, 'bolthole', 'done');
    HN.note(game, 'clue', 'The courier’s map marks the Bolt Hole: a hatch under a dead billboard, west of the Outpost.');
  };

  // the test chamber's three modes (floor 2): ARCHIVE raises a safe, ENDURANCE leaves a prize once its units are down
  const ARCHIVE_SAFE = { kind: 'safe', name: 'auditors’ floor safe', uid: 'f2-archive', text: 'The auditors’ safe, risen out of the chamber floor on a hydraulic column. Inside, sealed in foam: the prototype Gary was supposed to put back.', loot: [{ hn: 'hn-capacitor' }, { type: 'gold', amount: 180 }, { hn: 'hn-anti-tox' }] };
  const ENDURE_PRIZE = { kind: 'case', name: 'test certification locker', uid: 'f2-endure', text: 'TEST COMPLETE. CONGRATULATIONS, PROTOTYPE UNIT. A locker opens with your prize for surviving: a Coltron belt pack, still in its box.', loot: [{ type: 'armor', id: 'hn-coltron' }, { type: 'gold', amount: 120 }] };
  function spot(game) {
    const p = (game.level.tags.safeSpot || [])[0];
    return p || { x: game.level.start.x, y: game.level.start.y };
  }
  function raiseArchive(game) {
    if (HN.hasFound(game, 'f2-archive')) return;
    const p = spot(game);
    game.spawnItem('hn-cache', p.x, p.y, Object.assign({}, ARCHIVE_SAFE));
  }
  function endurancePrize(game) {
    if (HN.hasFound(game, 'f2-endure')) return;
    const p = spot(game);
    game.spawnItem('hn-cache', p.x, p.y, Object.assign({}, ENDURE_PRIZE));
  }
  class EnduranceWatch {
    constructor(trap) { this.trap = trap; this.t = 0; }
    update(dt, game) {
      this.t += dt;
      if (this.t < 2.5) return false;
      if (this.trap.spawned.some((e) => !e.dead)) return false;
      endurancePrize(game);
      game.toast('“ENDURANCE TEST COMPLETE. THE PROTOTYPE UNITS HAVE BEEN… RETIRED. CONGRATULATIONS.”', 'good');
      return true;
    }
  }
  LM.on('flag', ({ name, game }) => {
    if (game.levelId !== 'hn-agency-2') return;
    if (name === 'hnTestArchive') game.schedule(1, () => raiseArchive(game));
    if (name === 'hnTestShow') game.schedule(2, () => HN.award(game, 'f2-showcase', [{ hn: 'hn-hypno-tab' }], 'Complimentary sample'));
    if (name === 'hnTestEndure') {
      const tr = game.traps.find((t) => t.trigger.type === 'flag' && t.trigger.tag === 'hnTestEndure');
      if (tr) game.fx.push(new EnduranceWatch(tr));
    }
  });
  HN.onArrive((game, def) => {
    if (def.id !== 'hn-agency-2') return;
    if (flag(game, 'hnTestArchive')) raiseArchive(game);
    if (flag(game, 'hnTestEndure')) endurancePrize(game);
  });

  HN.bayOff = function (game) {
    if (flag(game, 'hnBayOff')) return;
    HN.setFlag(game, 'hnBayOff');
    LM.audio.play('lose');
    game.toast('The Repair Bay winds down. Robots you destroy will stay destroyed.', 'good');
    HN.note(game, 'change', 'You shut down the agency’s Robot Repair Bay.');
  };

  // ------------------------------------------------------------ the inner core: The Silent Agency, The Last Campaign
  HN.openCore = function (game, it) {
    const closed = flag(game, 'hnAgencyClosed');
    if (!closed) {
      const hasOrder = HN.count(game, 'hn-termination-order') > 0;
      const fieldDown = flag(game, 'hnFieldDown');
      LM.ui.open({
        kicker: 'The inner core', title: 'AGENCY SECURITY-AND-PROMOTION SYSTEM',
        body: h('div', { class: 'hn-panel' },
          lore('A drum of humming glass and pink light, wired into the floor, the ceiling and every screen in the building. When it speaks it uses the voice from the ads.'),
          lore('“ALL AUTHORIZED EMPLOYEES ARE DECEASED. THIS HAS BEEN NOTED. HOWEVER: NO VALID TERMINATION ORDER HAS BEEN RECEIVED. THEREFORE THE AGENCY REMAINS OPEN. THEREFORE I REMAIN. HOW MAY I HELP YOU WANT THINGS?”'),
          h('p', { class: 'muted' }, 'Three ways to close it: give it the termination order it never got, out-argue it, or tear out its connections (the defense field must be down).')),
        actions: [
          { label: 'File Termination Order 77-B', primary: hasOrder, disabled: !hasOrder, onClick: () => closeAgency(game, 'order') },
          { label: 'Hack it: argue that the agency is closed', onClick: () => setTimeout(() => HN.hack(game, {
            kicker: 'The inner core', title: 'Convince it the agency is closed', difficulty: 12, override: false,
            text: 'Its logic is airtight, three hundred years of airtight. You need it to accept that the agency closed when the last employee died.',
            risk: 'it calls security: an alarm and two Knife Fighters. You can try again.',
            onSuccess: (g) => closeAgency(g, 'hack'), onFail: (g) => HN.failHack(g, it, 'alarm'),
          }), 0) },
          { label: fieldDown ? 'Tear out its connections' : 'Tear out its connections (the defense field is still up)', disabled: !fieldDown, onClick: () => closeAgency(game, 'force') },
          { label: 'Leave it', quiet: true },
        ],
      });
      return;
    }
    LM.ui.open({
      kicker: 'The inner core', title: 'THE LAST CAMPAIGN',
      body: h('div', { class: 'hn-panel' }, lore('“FACILITY CLOSED. THANK YOU FOR YOUR BUSINESS.” But the ad system is still running, and the jingles still go out to every screen in the near area. It waits for an instruction, the way it always has.')),
      actions: [
        { label: 'Silence the ad system', primary: true, onClick: () => campaign(game, 'silenced') },
        { label: 'Seize the core (a fortune, and the ads stop)', onClick: () => campaign(game, 'seized') },
        { label: 'Smash it', onClick: () => campaign(game, 'smashed') },
        { label: 'Not yet', quiet: true },
      ],
    });
  };
  function closeAgency(game, how) {
    HN.setFlag(game, 'hnAgencyClosed');
    HN.objective(game, 'silent', 'done');
    HN.objective(game, 'campaign', 'open');
    HN.note(game, 'change', how === 'order' ? 'You filed the termination order. The agency is closed.' : how === 'hack' ? 'You argued the agency into closing.' : 'You tore out the core’s connections. The agency is closed.');
    if (how === 'force') LM.combat.explode(game, game.player.x + 30, game.player.y, { radius: 40, damage: 12, owner: 'enemy', silent: false });
    LM.audio.play('heal');
    setTimeout(() => HN.openCore(game), 400);
  }
  function campaign(game, how) {
    HN.setFlag(game, 'hnAdsSilent');
    if (how === 'seized') {
      HN.setFlag(game, 'hnCoreSeized');
      HN.award(game, 'agency-core', [{ hn: 'hn-ad-core' }], 'The inner core');
    }
    if (how === 'smashed') LM.combat.explode(game, game.player.x + 20, game.player.y - 20, { radius: 50, damage: 10, owner: 'enemy' });
    HN.objective(game, 'campaign', 'done');
    HN.note(game, 'change', 'The agency’s ad system is silent (' + how + ').');
    for (const it of game.items) if (it.def.id === 'hn-ad-screen' && it.light) it.light.off = true;
    game.level.def.hnCoreEnding = how;
    setTimeout(() => HN.endRun(game, 'slice', how, { keepPlaying: true, after: () => {} }), 900);
  }
  HN.defineItems({
    'hn-ad-core': {
      name: 'The agency’s inner core', cat: 'Wonder', era: 'Age of War', value: 2500, rarity: 'unique', unique: true, trophy: true, icon: { glyph: '◉', color: '#ff4ad8' },
      desc: 'A drum of humming glass the size of a hatbox, still faintly pink. Three centuries of advertising know-how in a box. Every broker in Boom-Town would pay for it, and so would worse people.',
    },
  });

  // ------------------------------------------------------------ the Monoid (floor 1's break room)
  const npcs = {
    'hn-monoid-npc': {
      name: 'The Monoid', role: 'Break room · on break since the Age of War', behavior: 'stand', face: 'w', radius: 12, mood: 'neutral', ignoresPlayer: true,
      barks: ['Again. Again. Lose. Again.', '…come on, cherries…', 'I’m on break.'], barkRange: 120,
      init(n) { n.portrait = monoidPortrait; },
      draw(g, n, t) {
        g.rotate(n.facing);
        G.circle(g, 0, 0, 12, '#2a2a30');
        G.circle(g, 0, 0, 10.5, '#6a6a78');
        G.circle(g, 5, 0, 4.6, '#e8e4dc');
        G.circle(g, 6, 0, 2.2, '#c83a2a');
        g.fillStyle = '#4a4a54';
        g.fillRect(-11, -14, 6, 4);
        g.fillRect(-11, 10, 6, 4);
      },
      drawGlow(g, n, t) { G.glow(g, n.x + Math.cos(n.facing) * 6, n.y + Math.sin(n.facing) * 6, 8, '#ff5a3a', 0.4 + 0.15 * Math.sin(t * 2)); },
      dialog: {
        start: 'hi', again: 'again',
        nodes: {
          hi: {
            text: ['A one-eyed robot slouches at the slot machine, feeding it the same credit over and over. Its eye swivels to you, then back to the reels. “I’m on break.”', '“Been on break since the war. Nobody cancelled it.”'],
            options: [{ label: 'What do you want?', next: 'want' }, { label: 'I need your ID badge.', next: 'badge' }, { label: 'Then I’ll take it.', next: 'fight' }, { label: 'Never mind.', end: true }],
          },
          again: { text: '“Still on break.”', options: [{ label: 'About that badge…', next: 'badge', if: (g) => !g.hasKeyItem('hn-badge') }, { label: 'Then I’ll take it.', next: 'fight', if: (g) => !g.hasKeyItem('hn-badge') }, { label: 'Never mind.', end: true }] },
          want: { text: '“A LUCKY chip. The barista had one in the tip jar. I can’t get it. The coffee shop doesn’t serve robots. It’s traditional.”', options: [{ label: 'And for the chip?', next: 'badge' }, { label: 'Later.', end: true }] },
          badge: {
            text: (game) => [HN.count(game, 'hn-lucky-chip') > 0 ? '“Is that…?” Its eye fixes on your satchel. “The lucky chip. Swap you. Badge for chip. I don’t need the badge. I’m on break.”' : '“The badge? Get me the lucky chip from the coffee shop tip jar and it’s yours. Or don’t. I’m on break.”'],
            options: [
              { label: 'Swap: the lucky chip for the badge.', if: (g) => HN.count(g, 'hn-lucky-chip') > 0, do: (g, n) => monoidDeal(g, n), next: 'deal' },
              { label: 'Then I’ll take it.', next: 'fight' },
              { label: 'I’ll be back.', end: true },
            ],
          },
          deal: { text: (game) => [flag(game, 'hnMonoidSnitched') ? '“Pleasure.” As you turn away you hear it tap something on its wrist. Somewhere a door hisses. It never said it was honest.' : '“Pleasure.” It feeds the chip into the machine and loses it instantly. “Lucky.”'], options: [{ label: 'Leave it there.', end: true }] },
          fight: { text: '“Ugh. Fine.” It sighs, which is a strange sound from a robot, and stands up. Its eye goes red.', options: [{ label: 'Fight', do: (g, n) => monoidFight(g, n), end: true }] },
        },
      },
    },
  };
  function monoidPortrait(mood, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    g.fillStyle = '#1a1a20';
    g.fillRect(0, 0, size, size);
    G.circle(g, size / 2, size * 0.55, size * 0.36, '#6a6a78');
    G.circle(g, size / 2, size * 0.5, size * 0.17, '#e8e4dc');
    G.circle(g, size / 2, size * 0.5, size * 0.08, mood === 'annoyed' ? '#ff3a2a' : '#c83a2a');
    return c;
  }
  function monoidDeal(game, n) {
    HN.take(game, 'hn-lucky-chip');
    game.giveKeyItem('hn-badge', { name: 'Agency ID badge', text: 'An employee badge with a smiling face that isn’t yours. Staff doors and help desks accept it.', color: '#5ab8e8', flag: 'hnBadge' });
    game.toast('Agency ID badge', 'key');
    // it's untrustworthy: half the time it tips off security
    if (U.hash2(HN.st(game).mission, game.player.gold, 7) < 0.5) {
      HN.setFlag(game, 'hnMonoidSnitched');
      game.schedule(4, () => HN.failHack(game, n, 'alarm'));
    }
  }
  function monoidFight(game, n) {
    HN.st(game).monoidFought = true;
    n.dead = true;
    game.npcs = game.npcs.filter((x) => x !== n);
    const e = game.spawnEnemy('hn-monoid', n.x, n.y, { aggro: true });
    if (e) e.hnBadge = true;
  }
  // the fought Monoid drops the badge
  LM.on('enemyDied', (e) => {
    const game = LM.game;
    if (!game || !game.player || !e || e.def.id !== 'hn-monoid' || game.levelId !== 'hn-agency-1') return;
    game.giveKeyItem('hn-badge', { name: 'Agency ID badge', text: 'An employee badge with a smiling face that isn’t yours. Staff doors and help desks accept it.', color: '#5ab8e8', flag: 'hnBadge' });
    game.toast('The Monoid’s ID badge', 'key');
  });

  // ------------------------------------------------------------ arriving on an agency floor
  HN.onArrive((game, def, s, last) => {
    if (!def.hn.agency) return;
    // the Sphinx Gun calms down between missions, so you can try the slogan again
    if (s.sphinxWrong && s.sphinxWrong < s.mission && game.player.flags.delete('hnSphinxAngry')) s.sphinxWrong = 0;
    HN.setFlag(game, 'hnAgencyKnown');
    // the building's memory of its security state
    if (flag(game, 'hnTrapsOff')) HN.disarmTraps(game, 'all');
    if (flag(game, 'hnTerm1') && def.id === 'hn-agency-1') HN.disarmTraps(game, 'darts');
    if (flag(game, 'hnAdsSilent')) for (const it of game.items) if (it.def.id === 'hn-ad-screen' && it.light) it.light.off = true;
    // a fought Monoid is gone for good; a bargained one keeps gambling
    if (def.id === 'hn-agency-1' && s.monoidFought) game.npcs = game.npcs.filter((n) => n.def.id !== 'hn-monoid-npc');
    // the floor's alarm and emergency lighting
    if (def.id === 'hn-agency-3' && flag(game, 'hnAlarm')) HN.emergency(game);
    // between missions: the native bio-weapons come back; the Repair Bay rebuilds robots
    if (last != null && last < s.mission) {
      const roachTiles = game.level.tags.roachSpawn || [];
      let n = 0;
      for (const p of roachTiles) {
        if (n >= 5) break;
        game.spawnEnemy('hn-roach', p.x * T + T / 2, p.y * T + T / 2, {});
        n++;
      }
      if (n) game.toast('Scratching in the vents. The roaches are back.', 'warn');
      if (!flag(game, 'hnBayOff')) {
        const rebuild = game.level.tags.rebuild || [];
        const want = Math.min(2, rebuild.length, (s.agencyKills && s.agencyKills[def.id]) || 0);
        for (let i = 0; i < want; i++) game.spawnEnemy(i % 2 ? 'hn-knife' : 'hn-maintbot', rebuild[i].x * T + T / 2, rebuild[i].y * T + T / 2, {});
        if (want) {
          s.agencyKills[def.id] -= want;
          game.toast('Fresh paint on the robots. The Repair Bay upstairs has been busy (' + want + ' rebuilt).', 'warn');
        }
      }
    }
  });
  // robots destroyed on an agency floor are what the Repair Bay rebuilds
  LM.on('enemyDied', (e) => {
    const game = LM.game;
    if (!game || !game.player || !e || !e.def.robot) return;
    const def = game.level.def;
    if (!def.hn || !def.hn.agency || e.def.id === 'hn-sphinx' || e.def.id === 'hn-drone' || e.def.id === 'hn-emitter') return;
    const s = HN.st(game);
    s.agencyKills = s.agencyKills || {};
    s.agencyKills[def.id] = (s.agencyKills[def.id] || 0) + 1;
  });
  HN.emergency = function (game) {
    game.level.def.hnEmergencyOn = true;
    LM.get('effects', 'ambient').run(game, { ambient: '#3a1414', outsideSight: '#2a0e0e', time: 1.2 }, {});
    LM.get('effects', 'flicker').run(game, { radius: 2000, time: 2.5, strength: 0.6 }, {});
  };
  LM.on('flag', ({ name, game }) => {
    if (name === 'hnAlarm' && game.levelId === 'hn-agency-3') {
      HN.emergency(game);
      HN.note(game, 'change', 'The agency’s floor-3 alarm went off: Emergency lighting.');
    }
  });

  // ------------------------------------------------------------ Emergency: rotating red lights while the alarm is on
  class Beacons {
    update() { return false; }
    drawGlow(g, game, t) {
      if (!game.level.def.hnEmergencyOn) return;
      for (const p of game.level.tags.beacon || []) {
        const x = p.x * T + T / 2, y = p.y * T + T / 2, a = t * 4 + p.x;
        G.glow(g, x, y, 14, '#ff2a1a', 0.5);
        g.fillStyle = 'rgba(255,40,20,0.12)';
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, 120, a, a + 0.5);
        g.closePath();
        g.fill();
      }
    }
  }
  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player || game.levelId !== 'hn-agency-3') return;
    game.fx.push(new Beacons());
  });

  LM.definePack({ id: 'hn-anomalous', environments, terrain, items, npcs });
})();
