/* HaveNot — packs/hn-gen-kit/rooms.js
 * What generated rooms are furnished with, by their function (gen/library/rooms.js says which room gets what):
 *
 *   hn-console     props { kind: control | monitor | server | diag, flag, title }   banks of lights and buttons; a
 *                  monitor console with a flag is the Security Center's: it switches the floor's traps off
 *   hn-tree, hn-coffin, hn-statue (props.text: its plaque)                          the arboretum, crypt and chapel
 *   hn-tapes, hn-tape-player   the library's A/V tapes: word-salad titles, one to take, a player to watch them on
 *   hn-autochef, hn-mixologist  the mess hall's tray and the auto-bar's drink: once a mission, buff or regret
 *   hn-exerciser   the exercise room's machines: come too close and they exercise you
 *   enemies        hn-dancer (the VIP room), hn-snapper (the arboretum), hn-deadbot (the crypt: lies still until
 *                  you come in)
 *   satchel items  hn-meal-pack, hn-drink-mix, hn-neggs (a buff and an insult), hn-av-tape
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, G = LM.gfx, T = LM.TILE;
  const ROBOT = { electric: 2, bleed: 0, toxic: 0, acid: 0.5 };
  const ico = (glyph, color) => ({ glyph, color });
  const say = (game, e, text, color) => game.particles.add({ type: 'text', x: e.x, y: e.y - e.r - 8, vy: -14, drag: 1, life: 2.2, text, color: color || '#f4ecd8', size: 6 });
  // the same few things a mission (s.found remembers each, with the mission number)
  const oncePerMission = (game, it, what) => {
    const s = HN.st(game), k = what + ':' + game.levelId + ':' + it.tx + ',' + it.ty + ':' + s.mission;
    if (s.found[k]) return false;
    s.found[k] = true;
    return true;
  };
  // a few stable random numbers from an item's place
  const seeded = (it, salt) => U.mulberry32(((it.tx * 73856093) ^ (it.ty * 19349663) ^ (salt || 0)) >>> 0);

  // ------------------------------------------------------------ satchel items
  const INSULTS = [
    'You eat a Negg. It tastes like a stranger saying “oh, you’re still here?” You feel sharper out of spite.',
    'The Negg is rubbery and faintly sarcastic. Somewhere inside you, a voice says “nice try.” You want to prove it wrong.',
    'You eat a Negg. It is the culinary equivalent of being called “buddy” by someone who doesn’t know your name. Your hands steady with resentment.',
    'NEGGS: “Not quite an egg, not quite food, not quite your fault.” You feel mildly insulted and extremely motivated.',
  ];
  HN.defineItems({
    'hn-meal-pack': {
      name: 'Meal-pack', cat: 'Food', era: 'Age of War', value: 4, icon: ico('M', '#a89a6a'),
      desc: 'A foil meal-pack: BEEF-TYPE PROTEIN WITH GRAVY-TYPE SAUCE. Most of these have gone bad. Some have gone worse.',
      canUse: (game) => true,
      use: (game, P) => {
        if (Math.random() < 0.55) {
          LM.status.apply(game, P, 'hn-shaken', { seconds: 4 });
          LM.combat.hurtPlayer(game, P, 4, { source: 'hazard', type: 'status' });
          game.toast('It has gone bad. Three hundred years bad. You keep it down, mostly.', 'warn');
        } else {
          LM.combat.heal(game, P, 12);
          game.toast('Still good, somehow. The gravy-type sauce is warm from your hands. +12 health.', 'good');
        }
      },
    },
    'hn-drink-mix': {
      name: 'Powdered drink mix', cat: 'Food', era: 'Age of War', value: 6, icon: ico('D', '#ff8a3a'),
      desc: 'A sachet of orange powder: VITA-BLAST, NOW WITH 40% MORE COLOR. Mix with water. Or don’t.',
      use: (game, P) => {
        P.addBuff('hn-vitablast', 'Vita-Blast', { speed: 14 }, 30);
        game.toast('You eat it dry. Your teeth are orange. Your legs are very keen. (+14 speed for 30 seconds)', 'key');
      },
    },
    'hn-neggs': {
      name: 'Carton of Neggs', cat: 'Food', era: 'Age of War', value: 12, stack: true, icon: ico('N', '#e8e0c0'),
      desc: 'NEGGS: a synthetic egg product with a chemical stimulant that works by making you feel mildly insulted. Tastes awful on purpose.',
      use: (game, P) => {
        P.addBuff('hn-neggs', 'Mildly insulted', { damageMul: 0.12, speed: 6 }, 45);
        game.toast(U.pick(INSULTS) + ' (+12% damage for 45 seconds)', 'key');
      },
    },
    'hn-av-tape': {
      name: 'A/V tape', cat: 'Salvage', era: 'Age of Wonder', value: 18, icon: ico('▭', '#5ab8e8'),
      desc: 'A tape cassette in a hard case. Collectors in Boom-Town pay for the titles. Nobody plays them.',
    },
  });

  // ------------------------------------------------------------ tape titles: word salad from lists
  const W1 = ['Advanced', 'Intermediate', 'Remedial', 'Mandatory', 'Optional', 'Executive', 'Celebratory', 'Hostile', 'Gentle', 'Post-Apocalyptic', 'Corporate', 'Tactical', 'Emotional'];
  const W2 = ['Synergy', 'Grief', 'Paperwork', 'Napkin', 'Warlord', 'Ladder', 'Egg', 'Spreadsheet', 'Teeth', 'Retirement', 'Toaster', 'Tomorrow', 'Lunch', 'Firing Squad', 'Vowel'];
  const W3 = ['for Beginners', 'in Twelve Easy Steps', 'Volume IV', 'and You', 'Without Fear', 'the Musical', 'Unplugged', 'Revisited', 'for the Recently Deceased', '(Director’s Cut)', 'at Sunset', 'on Ice'];
  const SYN = [
    'A narrator explains, slowly, that {t} is everyone’s responsibility. A man in a tie nods for forty minutes.',
    'Interpretive dance. The dancers wear hard hats. The subject is, apparently, {t}.',
    'A puppet called Mister Compliance learns about {t}. Mister Compliance does not survive the episode.',
    'Footage of an empty office set to triumphant music. The title card says {t}. The credits run for an hour.',
    'Someone has taped over {t} with a warlord’s birthday speech. He is very proud of his chin.',
  ];
  HN.tapeTitle = (r) => W1[Math.floor(r() * W1.length)] + ' ' + W2[Math.floor(r() * W2.length)] + ' ' + W3[Math.floor(r() * W3.length)];

  // ------------------------------------------------------------ the mixologist's drinks
  const DRINKS = [
    { name: 'The Corner Office', text: 'Smoky, smug, served in a glass shaped like a promotion.', mods: { damageMul: 0.1 }, seconds: 60, good: true },
    { name: 'Gentle Layoff', text: 'Soft, warm, and it lets you go gently. Your legs feel lighter.', mods: { speed: 18 }, seconds: 60, good: true },
    { name: 'Quarterly Review', text: 'Bitter. Very bitter. You feel judged and also slightly armoured against it.', mods: { armor: 0.08 }, seconds: 60, good: true },
    { name: 'Three Umbrellas', text: 'It has three tiny umbrellas, two straws and no mercy. The room tilts.', mods: { speed: -24 }, seconds: 30, good: false },
    { name: 'Hostile Takeover', text: 'It fizzes until you agree to its terms. Your hands shake.', mods: { damageMul: -0.12 }, seconds: 30, good: false },
  ];

  // ------------------------------------------------------------ fixtures
  const lights = (g, t, x, y, n, cols, seed) => {
    for (let i = 0; i < n; i++) {
      const on = Math.sin(t * (2 + (i % 3)) + i * 1.7 + seed) > -0.2;
      g.fillStyle = on ? cols[i % cols.length] : '#202428';
      g.fillRect(x + i * 2.6, y, 1.8, 1.8);
    }
  };
  const DIAG = ['DIAGNOSIS: NORMAL. (NORMAL HAS BEEN REDEFINED.)', 'DIAGNOSIS: YOU HAVE A BODY. TREATMENT: REMOVE STRESS FROM BODY.', 'DIAGNOSIS: ACUTE SCAVENGING. PROGNOSIS: MORE SCAVENGING.', 'DIAGNOSIS: 4% MUTANT. WITHIN ACCEPTABLE LIMITS FOR MIDDLE MANAGEMENT.', 'DIAGNOSIS: ERROR. PATIENT IS NOT AN EMPLOYEE. PLEASE DIE ELSEWHERE.'];
  const items = {
    'hn-console': {
      name: 'Console', radius: 10, solid: true, mapColor: '#5a6a7a',
      light: (it) => ({ color: { control: '#e8a23a', monitor: '#5ab8e8', server: '#4ad88a', diag: '#ff6a8a' }[it.props.kind || 'control'], radius: 70, intensity: 0.35, flicker: 0.1 }),
      interact: {
        available: (it) => it.props.kind !== 'server',
        prompt: (it) => 'Use the ' + (it.props.title || { control: 'control console', monitor: 'monitor console', diag: 'diagnostic machine' }[it.props.kind] || 'console'),
        use(it, game) {
          const p = it.props;
          if (p.kind === 'diag') {
            const healed = oncePerMission(game, it, 'diag') && game.player.hp < game.player.stats().maxHp;
            if (healed) LM.combat.heal(game, game.player, 10);
            return LM.ui.showText('DIAGNOSTIC UNIT', U.pick(DIAG) + (healed ? '\n\nA cold arm gives you an injection you didn’t agree to. (+10 health)' : ''), 'Med-bay');
          }
          if (p.flag) {
            if (game.anyFlag(p.flag)) return LM.ui.showText('SECURITY CONSOLE', 'COURTESY SYSTEMS: OFF FOR THIS FLOOR. Every camera feed shows the same thing: you, at a console.', 'Security Center');
            HN.setFlag(game, p.flag);
            return LM.ui.showText('SECURITY CONSOLE', 'SECURITY OVERRIDE ACCEPTED. You are logged in as “Duty Officer (deceased)”. Darts, beams and floor safety on this floor: OFF.', 'Security Center');
          }
          LM.ui.showText(p.kind === 'monitor' ? 'MONITORS' : 'CONTROL CONSOLE', p.kind === 'monitor'
            ? 'A grid of camera feeds: empty corridors, a roach eating a memo, and a room you haven’t been to with someone in it who hasn’t moved in a long time.'
            : 'Rows of lights and buttons, all labelled DO NOT. One is labelled DO. It has been pressed so often the label is gone.', 'Console');
        },
      },
      draw(g, it, t) {
        const k = it.props.kind || 'control';
        if (k === 'server') {
          g.fillStyle = '#121418';
          g.fillRect(-7, -10, 14, 20);
          g.fillStyle = '#1e2228';
          for (let y = -8; y < 9; y += 4) g.fillRect(-6, y, 12, 3);
          for (let y = -8; y < 9; y += 4) lights(g, t, -5, y + 0.6, 4, ['#4ad88a', '#e8d84a'], it.tx + y);
          return;
        }
        g.fillStyle = '#16181c';
        g.fillRect(-11, -7, 22, 14);
        g.fillStyle = k === 'diag' ? '#3a2a30' : '#262a30';
        g.fillRect(-10, -6, 20, 6);
        if (k === 'monitor' || k === 'diag') {
          g.fillStyle = k === 'diag' ? '#5a2a3a' : '#1a3a4a';
          g.fillRect(-9, -5.5, 8, 5);
          g.fillRect(1, -5.5, 8, 5);
        } else lights(g, t, -9, -5, 8, ['#e8a23a', '#ff4a3a', '#4ad88a'], it.tx);
        lights(g, t, -9, 2, 8, ['#e8d84a', '#5ab8e8'], it.ty);
      },
      drawGlow(g, it, t) {
        const k = it.props.kind || 'control';
        const col = { control: '#e8a23a', monitor: '#5ab8e8', server: '#4ad88a', diag: '#ff6a8a' }[k];
        G.glow(g, 0, -2, 11, col, 0.25 + 0.08 * Math.sin(t * 3 + it.tx));
      },
    },
    'hn-tree': {
      name: 'Tree', radius: 12, solid: true, mapColor: '#3a6a2a',
      draw(g, it, t) {
        G.circle(g, 0, 0, 4, '#4a3420');
        const r = seeded(it, 3);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * U.TAU + r() * 0.6, d = 6 + r() * 4;
          G.circle(g, Math.cos(a) * d, Math.sin(a) * d + Math.sin(t * 0.8 + i) * 0.4, 6 + r() * 3, i % 2 ? '#2e5a24' : '#3a6e2c');
        }
        G.circle(g, 0, 0, 6, '#467a34');
      },
    },
    'hn-coffin': {
      name: 'Coffin', radius: 10, solid: 'rect', mapColor: '#4a3a2a',
      init(it) { it.box = [14, 26]; },
      interact: { prompt: 'Read the coffin', use: (it) => LM.ui.showText('A coffin', seeded(it, 9)() < 0.5 ? 'A steel coffin with a servo port in the lid. The nameplate: LOYAL UNTIL DEATH. The lid is unlatched from the inside.' : 'HERE LIES A GOOD SOLDIER. STILL ON DUTY. DO NOT DISTURB. (He is not here. The coffin is warm.)', 'Crypt') },
      draw(g) {
        g.fillStyle = '#1e1812';
        g.beginPath();
        g.moveTo(-5, -13); g.lineTo(5, -13); g.lineTo(7, -6); g.lineTo(5, 13); g.lineTo(-5, 13); g.lineTo(-7, -6);
        g.closePath();
        g.fill();
        g.fillStyle = '#4a3a28';
        g.fillRect(-1, -9, 2, 9);
        g.fillRect(-4, -6, 8, 2);
      },
    },
    'hn-statue': {
      name: 'Statue', radius: 12, solid: true, mapColor: '#9a8a6a', mapAlways: true,
      interact: { prompt: 'Read the plaque', use: (it) => LM.ui.showText('THE PLAQUE', it.props.text || 'THE GREAT WARLORD. KNEEL.', 'Chapel') },
      draw(g) {
        g.fillStyle = '#3a3630';
        g.fillRect(-11, -11, 22, 22);
        G.circle(g, 0, 2, 7, '#8a8070');
        G.circle(g, 0, -3, 4.6, '#9a907e');
        g.fillStyle = '#7a7060';
        g.fillRect(-9, 0, 18, 3);
        g.fillStyle = '#c8a040';
        g.fillRect(-4, 8, 8, 2);
      },
    },
    'hn-tapes': {
      name: 'Tape shelf', radius: 10, solid: true, mapColor: '#5a4a3a',
      hnValuable: (it, game) => !HN.hasFound(game, 'tape:' + game.levelId + ':' + it.tx + ',' + it.ty),
      interact: {
        prompt: 'Look through the tapes',
        use(it, game) {
          const r = seeded(it, 21);
          const titles = [0, 1, 2, 3].map(() => '“' + HN.tapeTitle(r) + '”');
          const got = HN.award(game, 'tape:' + game.levelId + ':' + it.tx + ',' + it.ty, [{ hn: 'hn-av-tape' }], 'The tape shelf');
          LM.ui.showText('A/V LIBRARY', 'Rows of tapes in hard cases, alphabetised by someone who gave up at F. Among them:\n\n' + titles.join('\n') + (got ? '\n\nYou take the least damaged one.' : ''), 'Library');
        },
      },
      draw(g, it) {
        g.fillStyle = '#2a2018';
        g.fillRect(-10, -8, 20, 16);
        const r = seeded(it, 4);
        for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
          g.fillStyle = ['#3a5a7a', '#7a3a3a', '#5a5a3a', '#3a3a3a', '#6a4a7a'][Math.floor(r() * 5)];
          g.fillRect(-9 + i * 3.1, -7 + row * 5, 2.4, 4);
        }
      },
    },
    'hn-tape-player': {
      name: 'Tape player terminal', radius: 9, solid: true, mapColor: '#5ab8e8',
      light: { color: '#8ac8ff', radius: 60, intensity: 0.3, flicker: 0.15 },
      interact: {
        prompt: 'Play a tape',
        use(it, game) {
          const r = U.mulberry32((Math.random() * 1e9) >>> 0);
          const title = HN.tapeTitle(r);
          LM.ui.showText('NOW PLAYING: ' + title.toUpperCase(), U.pick(SYN).replace('{t}', '“' + title + '”'), 'Tape player');
        },
      },
      draw(g, it, t) {
        g.fillStyle = '#16181c';
        g.fillRect(-9, -7, 18, 14);
        g.fillStyle = '#2a3a48';
        g.fillRect(-8, -6, 16, 8);
        g.fillStyle = '#0e1012';
        g.fillRect(-6, 3, 12, 2.4);
      },
      drawGlow(g, it, t) { G.glow(g, 0, -2, 9, '#8ac8ff', 0.3 + 0.15 * Math.sin(t * 9)); },
    },
    'hn-autochef': {
      name: 'Auto-chef', radius: 10, solid: true, mapColor: '#c8a040',
      light: { color: '#ffb84a', radius: 70, intensity: 0.35, flicker: 0.08 },
      interact: {
        prompt: 'Order from the auto-chef',
        use(it, game) {
          if (!oncePerMission(game, it, 'chef')) return LM.ui.showText('AUTO-CHEF', 'ONE TRAY PER EMPLOYEE PER SHIFT. YOUR SHIFT IS NOT OVER. YOUR SHIFT IS NEVER OVER.', 'Mess hall');
          const P = game.player;
          if (Math.random() < 0.6) {
            LM.combat.heal(game, P, 15);
            LM.ui.showText('AUTO-CHEF', 'TODAY’S SPECIAL: GREY. A tray slides out with a grey square, a smaller grey square and a cup of hot grey. It is, against all odds, food. (+15 health)', 'Mess hall');
          } else {
            HN.give(game, 'hn-meal-pack', 1, { silent: true });
            LM.ui.showText('AUTO-CHEF', 'KITCHEN IS EXPERIENCING HIGH DEMAND. HERE IS A MEAL-PACK FOR LATER. ENJOY LATER RESPONSIBLY. (A meal-pack goes in your satchel.)', 'Mess hall');
          }
        },
      },
      draw(g, it, t) {
        g.fillStyle = '#2a2622';
        g.fillRect(-10, -8, 20, 16);
        g.fillStyle = '#8a8478';
        g.fillRect(-8, -6, 16, 6);
        g.fillStyle = '#16120e';
        g.fillRect(-6, 2, 12, 4);
        lights(g, t, -7, -4.5, 5, ['#ffb84a', '#4ad88a'], it.tx);
      },
    },
    'hn-mixologist': {
      name: 'Auto-mixologist', radius: 10, solid: true, mapColor: '#ff7ac8',
      light: { color: '#ff7ac8', radius: 90, intensity: 0.4, flicker: 0.1 },
      interact: {
        prompt: 'Order a drink',
        use(it, game) {
          if (!oncePerMission(game, it, 'mix')) return LM.ui.showText('AUTO-MIXOLOGIST', '“You’ve had one. I keep a list. I am ALWAYS keeping a list.” It polishes a glass with a rag that is also a glass.', 'Auto-bar');
          const d = U.pick(DRINKS);
          game.player.addBuff('hn-drink', d.name, d.mods, d.seconds);
          game.toast(d.name + (d.good ? ': it agrees with you.' : ': it does not agree with you.'), d.good ? 'good' : 'warn');
          LM.ui.showText('AUTO-MIXOLOGIST', '“One ' + d.name.toUpperCase() + ', coming up.” Three arms blur. ' + d.text, 'Auto-bar');
        },
      },
      draw(g, it, t) {
        G.circle(g, 0, 0, 8, '#2a2228');
        G.circle(g, 0, 0, 6, '#5a4a58');
        for (let i = 0; i < 3; i++) {
          const a = t * 3 + (i * U.TAU) / 3;
          g.strokeStyle = '#aaa0b0';
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
          g.stroke();
        }
        G.circle(g, 0, 0, 2.6, '#ff7ac8');
      },
    },
    'hn-exerciser': {
      name: 'Exercise machine', radius: 10, solid: true, mapColor: '#c84a3a',
      interact: { prompt: 'Read the machine', use: () => LM.ui.showText('PERSONAL TRAINER UNIT', 'A frame of padded arms and cables. A sticker: “STEP IN AND LET ME DO THE WORK.” A smaller sticker: “I WILL DO THE WORK WHETHER YOU STEP IN OR NOT.”', 'Exercise room') },
      update(it, dt, game) {
        const P = game.player;
        it._cd = (it._cd || 0) - dt;
        if (!P || P.dead || it._cd > 0) return;
        const d = Math.hypot(P.x - it.x, P.y - it.y);
        if (d > 22 + P.r) return;
        // it grabs you and puts you through a rep: a fling to the far side, and sore legs
        it._cd = 2.2;
        const a = Math.atan2(P.y - it.y, P.x - it.x) + U.rand(-0.6, 0.6);
        LM.combat.hurt(game, P, 3, { kx: Math.cos(a) * 520, ky: Math.sin(a) * 520, source: 'hazard', type: 'status' });
        LM.status.apply(game, P, 'hn-shaken', { seconds: 1.5 });
        game.particles.add({ type: 'text', x: it.x, y: it.y - 16, vy: -14, drag: 1, life: 1.6, text: U.pick(['FEEL THE BURN!', 'ONE MORE REP!', 'NO PAIN NO GAIN!', 'GOOD FORM!', 'AND STRETCH!']), color: '#ff8a5a', size: 6 });
        it._pump = 0.4;
      },
      draw(g, it, t) {
        const p = it._pump > 0 ? (it._pump -= 0.016) : 0;
        g.fillStyle = '#2a2a2e';
        g.fillRect(-9, -9, 18, 18);
        g.fillStyle = '#c84a3a';
        g.fillRect(-7, -7, 14, 4);
        g.strokeStyle = '#8a8a90';
        g.lineWidth = 2;
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(s * 6, 2);
          g.lineTo(s * (9 + p * 12), 6 + Math.sin(t * 2) * 1.5);
          g.stroke();
        }
      },
    },
  };

  // ------------------------------------------------------------ the rooms' monsters
  const behaviors = {
    // lies in state until you come near (or shoot it), then gets up and walks at you
    'hn-dormant': {
      update(e, dt, game) {
        if (!e.mem.risen) {
          e.aggro = false;
          e.atk = null;
          if (e.distP < 5 * T || e.hp < e.maxHp) {
            e.mem.risen = true;
            e.mem.riseT = 0.8;
            e.stunned = 0.8;
            say(game, e, U.pick(['RISE. SERVE. RISE.', 'DUTY RESUMED', 'ROLL CALL: PRESENT', 'LOYAL UNTIL DEATH. AND AFTER.']), '#c8e0a0');
            e.alert(game, true);
          }
          return;
        }
        LM.get('behaviors', 'chaser').update(e, dt, game);
      },
    },
  };
  const enemies = {
    'hn-dancer': {
      name: 'Robot dancer', hnThreat: 2, hp: 55, armor: 0.15, speed: 195, radius: 8, ai: 'swarmer', sight: 380, accel: 11, turn: 12, robot: true,
      takes: ROBOT, color: '#c8c8d8', blood: '#ffcf6a', gib: '#9a9aa8', deathSound: 'explode',
      attacks: [
        { type: 'melee', damage: 10, range: 12, windup: 0.18, cooldown: 0.7, recover: 0.2, knock: 120 },
        // the light show: a disco laser from across the floor
        { type: 'ranged', projectile: 'enemy-bolt', damage: 6, speed: 380, windup: 0.4, cooldown: 1.8, range: 320, spread: 0.12, flash: '#ff7ac8' },
      ],
      drops: { gold: [3, 9], goldChance: 0.6 },
      update(e, dt, game) {
        e.mem.barkT = (e.mem.barkT == null ? U.rand(2, 5) : e.mem.barkT) - dt;
        if (e.aggro && e.mem.barkT <= 0 && e.distP < 9 * T) {
          e.mem.barkT = U.rand(5, 9);
          say(game, e, U.pick(['FIVE, SIX, SEVEN, EIGHT', 'AND KICK!', 'JAZZ HANDS', 'THE CLUB IS FOR MEMBERS', 'DANCE WITH ME. DANCE OR ELSE.']), '#ff9ad8');
        }
      },
      draw(g, e, t) {
        const spin = t * 6;
        g.save();
        g.rotate(spin);
        g.strokeStyle = 'rgba(255,122,200,0.8)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(0, 0, 10, 0, Math.PI * 1.2);
        g.stroke();
        g.restore();
        G.circle(g, 0, 0, 7, '#5a5a68');
        G.circle(g, 0, 0, 5.6, '#c8c8d8');
        g.rotate(e.facing);
        const kick = Math.sin(t * 10) * 3;
        g.fillStyle = '#9a9aa8';
        g.fillRect(3, -6 + kick, 6, 2);
        g.fillRect(3, 4 - kick, 6, 2);
        G.circle(g, 1.5, 0, 2.6, '#e8e8f0');
      },
      drawGlow(g, e, t) { G.glow(g, e.x, e.y, 14, ['#ff7ac8', '#5ab8e8', '#e8d84a'][Math.floor(t * 3) % 3], 0.35); },
    },
    'hn-snapper': {
      name: 'Carnivorous plant', hnThreat: 1, hp: 70, armor: 0.1, speed: 0, radius: 11, mass: 99, stationary: true, ai: 'turret', sight: 260, turn: 6,
      takes: { fire: 2, toxic: 0.5, electric: 1, bleed: 0.5 }, color: '#3a7a2a', blood: '#9adf3a', gib: '#2a5a1a',
      attacks: [
        { type: 'melee', damage: 12, range: 22, windup: 0.3, cooldown: 1.1, recover: 0.3, knock: 160 },
        { type: 'ranged', projectile: 'hn-slime-glob', damage: 5, speed: 260, windup: 0.5, cooldown: 2.4, range: 180, spread: 0.1, flash: '#9adf3a', status: { id: 'hn-grimed', seconds: 2 } },
      ],
      drops: null,
      draw(g, e, t) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU + Math.sin(t + i) * 0.1;
          G.circle(g, Math.cos(a) * 9, Math.sin(a) * 9, 4, i % 2 ? '#2a5a1a' : '#3a6e24');
        }
        g.rotate(e.facing);
        const open = e.atk ? 0.6 : 0.25 + 0.1 * Math.sin(t * 3);
        g.fillStyle = '#8a2a3a';
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, 9, -open, open);
        g.closePath();
        g.fill();
        g.fillStyle = '#5a9a3a';
        g.beginPath();
        g.arc(0, 0, 8, open, U.TAU - open);
        g.lineTo(0, 0);
        g.fill();
        g.fillStyle = '#f0f0d0';
        for (let i = -2; i <= 2; i++) g.fillRect(6, i * 1.8 - 0.4, 2, 0.8);
      },
    },
    'hn-deadbot': {
      name: 'Automated undead', hnThreat: 1, hp: 40, armor: 0.2, speed: 115, radius: 8, ai: 'hn-dormant', sight: 360, accel: 7, turn: 6, robot: true,
      takes: Object.assign({}, ROBOT, { fire: 1.5 }), color: '#6a6a5a', blood: '#8a7a5a', gib: '#4a4a3a', deathSound: 'explode',
      attacks: [{ type: 'melee', damage: 9, range: 11, windup: 0.35, cooldown: 1.2, recover: 0.3, knock: 80 }],
      drops: { gold: [2, 6], goldChance: 0.4 },
      artSkip: (e) => !e.mem.risen, // its sprite is for once it's up; lying in state it's drawn here
      draw(g, e, t) {
        const up = e.mem.risen ? 1 : 0;
        if (!up) {
          // lying in state
          g.fillStyle = '#2a2a24';
          g.fillRect(-4, -9, 8, 18);
          G.circle(g, 0, -7, 3, '#8a8470');
          return;
        }
        const sway = Math.sin(t * 4 + e.x) * 1.2;
        G.circle(g, 0, 0, 7, '#3a3a32');
        G.circle(g, 0, 0, 5.6, '#6a6a5a');
        g.rotate(e.facing);
        g.fillStyle = '#8a8470';
        g.fillRect(4, -5 + sway, 7, 2);
        g.fillRect(4, 3 - sway, 7, 2);
        G.circle(g, 1, 0, 3.2, '#b8b098');
        g.fillStyle = '#2a1a10';
        g.fillRect(2.4, -1.4, 1.2, 1);
        g.fillRect(2.4, 0.6, 1.2, 1);
      },
      drawGlow(g, e) { if (e.mem.risen) G.glow(g, e.x + Math.cos(e.facing) * 3, e.y + Math.sin(e.facing) * 3, 6, '#9aff6a', 0.4); },
    },
  };

  LM.definePack({ id: 'hn-gen-kit', items, behaviors, enemies });
})();
