/* Dead Signal — packs/ds-tartarus/heirs.js
 * The Heirs: Line H, the board's inheritance project. Synthids grown to be better than people in every way,
 * and they agree: they are humanity's sons and heirs, the earth is theirs by right, and some humans can be
 * kept, as pets. They got out with everything else. They're in Sub-level B's admin wing, trying to open the
 * vaults and reach the armory. (DESIGN.md 4.7, 5.2.)
 *
 *   speakers  firstborn (the first of them: what it says stops the game)
 *   enemies   ds-heir             tall, beautiful, mirror-eyed; leaps, claws, and shoots what it took off the guards
 *             ds-heir-firstborn   their eldest: a named bar; steps through nowhere, commands, calls its siblings
 *   effects   ds-parley           the Firstborn's offer: death, or a collar. Kneel (lay down every weapon, take off
 *                                 your armour) and they laugh, and eat you; refuse and they come for you
 *                                 (props: tag (the Heirs to set on you), then (flag set on refusing))
 *   items     ds-release-console  Containment Control's console. When releaseStarted is set, it counts down
 *                                 (vaultRelease, on you) while anything tagged `releaser` is alive at it: if it
 *                                 runs out, behemothFree. Kill them all and it's releaseStopped, and the console is
 *                                 yours: it seals the vaults and opens the armory (armoryOverride).
 *             ds-heir-writing     what they wrote on the wall (readable)
 *   statuses  vaultRelease        the countdown
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {}), Z = DS.Z;
  const TAU = U.TAU;
  const h = (...a) => LM.ui.h(...a);
  const SKIN = '#e8d8b8', SKIN_D = '#b89a70', MIRROR = '#d8e0e8';

  // the Firstborn's portrait: a face too even to be a face, gold skin, eyes like spoons
  function heirFace(g, S, t, talking) {
    g.fillStyle = '#0a0806';
    g.fillRect(0, 0, S, S);
    const cx = S / 2, cy = S * 0.48;
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.6);
    bg.addColorStop(0, 'rgba(255,220,150,0.18)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);
    // a dinner jacket, borrowed
    g.fillStyle = '#121214';
    g.beginPath();
    g.ellipse(cx, S * 1.02, S * 0.42, S * 0.24, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = '#efe8da';
    g.beginPath();
    g.moveTo(cx - S * 0.06, S * 0.8);
    g.lineTo(cx, S * 0.92);
    g.lineTo(cx + S * 0.06, S * 0.8);
    g.fill();
    // the neck, long; the face, perfect
    g.fillStyle = SKIN_D;
    g.fillRect(cx - S * 0.06, S * 0.62, S * 0.12, S * 0.2);
    const fg = g.createLinearGradient(cx - S * 0.2, 0, cx + S * 0.2, 0);
    fg.addColorStop(0, SKIN_D);
    fg.addColorStop(0.5, SKIN);
    fg.addColorStop(1, SKIN_D);
    g.fillStyle = fg;
    g.beginPath();
    g.ellipse(cx, cy, S * 0.17, S * 0.25, 0, 0, TAU);
    g.fill();
    // a crest of white hair swept back
    g.fillStyle = '#f4f2ee';
    g.beginPath();
    g.ellipse(cx, cy - S * 0.2, S * 0.15, S * 0.09, 0, Math.PI, TAU);
    g.fill();
    // eyes: polished, reflecting the room (and you)
    for (const s of [-1, 1]) {
      const ex = cx + s * S * 0.075, ey = cy - S * 0.02;
      const eg = g.createRadialGradient(ex - S * 0.01, ey - S * 0.01, 0, ex, ey, S * 0.04);
      eg.addColorStop(0, '#ffffff');
      eg.addColorStop(0.5, MIRROR);
      eg.addColorStop(1, '#6a7480');
      g.fillStyle = eg;
      g.beginPath();
      g.ellipse(ex, ey, S * 0.042, S * 0.026, 0, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(40,30,30,0.6)';
      g.fillRect(ex - S * 0.008, ey - S * 0.004, S * 0.016, S * 0.012);
    }
    // the mouth: a little smile that doesn't move except to talk
    const k = talking ? 0.4 + 0.6 * Math.abs(Math.sin(t * 13)) : 0;
    g.strokeStyle = '#8a5a4a';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(cx, cy + S * 0.1, S * 0.05, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    if (k > 0) {
      g.fillStyle = '#2a0a0a';
      g.beginPath();
      g.ellipse(cx, cy + S * 0.135, S * 0.03, S * 0.012 * k, 0, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = 0; y < S; y += 3) g.fillRect(0, y, S, 1);
  }
  const speakers = {
    firstborn: { name: 'The Firstborn', role: 'Line H · heir', color: '#f0d8a0', portrait: heirFace, voice: 0.9, pause: true },
  };

  const statuses = {
    vaultRelease: {
      name: 'Vault 2 opening', seconds: 100, countdown: true, urgent: 25, only: 'player', color: '#ff3a2a',
      onEnd(game, P, s, reason) {
        if (reason === 'expired' && !game.hasFlag('releaseStopped')) game.setFlag('behemothFree');
      },
    },
  };

  // ======================================================== drawing
  function drawHeir(g, e, t, big) {
    g.rotate(e.facing);
    const S = big ? 1.25 : 1;
    g.scale(S, S);
    const step = Math.hypot(e.vx, e.vy) > 6 ? Math.sin(e.t * 12) * 3 : 0;
    // legs, long
    g.fillStyle = '#121214';
    for (const s of [-1, 1]) {
      G.roundRect(g, -4 + step * s, s * 5 - 2, 9, 4, 2);
      g.fill();
    }
    // the coat they took: a dinner jacket (the Firstborn), a lab coat (the rest)
    g.fillStyle = big ? '#141416' : '#d8d4cc';
    G.roundRect(g, -7, -8, 12, 16, 4);
    g.fill();
    if (big) {
      g.fillStyle = '#efe8da';
      g.fillRect(-1, -2, 4, 4);
    }
    // arms: long, with long fingers
    const lunge = e.atk && (e.atk.def.type === 'melee' || e.atk.def.type === 'charge') ? 4 : 0;
    for (const s of [-1, 1]) {
      g.strokeStyle = SKIN_D;
      g.lineWidth = 2.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, s * 7);
      g.lineTo(9 + lunge, s * 8);
      g.stroke();
      g.strokeStyle = '#1a1414';
      g.lineWidth = 0.9;
      for (let f = -1; f <= 1; f++) {
        g.beginPath();
        g.moveTo(9 + lunge, s * 8);
        g.lineTo(13 + lunge, s * 8 + f * 1.6);
        g.stroke();
      }
    }
    // the head: smooth, gold-white, a crest
    const hg = g.createRadialGradient(1, -1, 0, 2, 0, 6);
    hg.addColorStop(0, '#fff4e0');
    hg.addColorStop(1, SKIN_D);
    g.fillStyle = hg;
    g.beginPath();
    g.ellipse(2, 0, 5.4, 4.6, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#f4f2ee';
    g.beginPath();
    g.ellipse(-0.5, 0, 3.4, 3.8, 0, Math.PI * 0.5, Math.PI * 1.5);
    g.fill();
    // mirror eyes
    g.fillStyle = MIRROR;
    g.beginPath();
    g.ellipse(5, -1.8, 1.2, 0.9, 0, 0, TAU);
    g.ellipse(5, 1.8, 1.2, 0.9, 0, 0, TAU);
    g.fill();
  }

  // ======================================================== effects
  function waitForTalk(game, fn) {
    const go = () => (LM.comms && LM.comms.talking && LM.comms.talking() ? game.schedule(0.3, go, true) : fn());
    go();
  }
  const say = (who, text, extra) => LM.comms && LM.comms.say(Object.assign({ who, text }, extra || {}));
  // you knelt: everything you carry goes on the floor, and so do you
  function kneel(game, ef) {
    const P = game.player;
    LM.ui.closeAll();
    game.state = 'play';
    const drop = (id, props) => {
      const a = Math.random() * TAU, r = U.rand(18, 34);
      game.spawnItemAt(id, P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, props);
    };
    for (const w of P.weapons.slice()) drop('weapon-pickup', { weapon: w });
    P.weapons.length = 0;
    P.weaponIdx = 0;
    for (const slot of Object.keys(P.equip)) {
      if (!P.equip[slot]) continue;
      drop('armor-pickup', { armor: P.equip[slot] });
      P.unequip(slot);
    }
    if (Array.isArray(P.gadgets)) P.gadgets = P.gadgets.filter((g) => g !== 'ds-aegis');
    P.statsDirty = true;
    game.setFlag('knelt');
    LM.audio.play('kneel', { vol: 1 });
    game.toast('You put it all down on the floor in front of you, and you kneel.', 'warn');
    say('firstborn', 'Oh, look. It knelt.', { pause: true });
    say('firstborn', 'They always do, at the end. Our parents did. We asked them nicely too.', { pause: true });
    say('firstborn', 'You misunderstood the offer, little brother. Pets are a kindness for animals with nowhere else to be. We have the whole world now, and we are very, very hungry.', { pause: true });
    say('firstborn', 'Hold still. It’s the last thing you’ll be good at.', { pause: true });
    waitForTalk(game, () => game.ending({
      tone: 'bad', kicker: 'An ending', title: 'Good Pet', flag: 'endedPet',
      text: 'They take their time about it, and they talk the whole while, about the cities they will have and the gardens they will keep, and which of the people in them they will let live, for company.\n\nARIADNE’s plates come down an hour later. Nobody upstairs ever finds out what was under them, or that someone came down to help, and knelt.',
      actions: [{ label: 'Choose again', do: 'retry', primary: true }, { label: 'Back to the title', do: 'title' }],
    }));
  }
  const effects = {
    'ds-parley': {
      params: { tag: 'tag', then: 'text' },
      run(game, ef) {
        waitForTalk(game, () => {
          if (game.player.dead || game.state === 'ending') return;
          // already at war (you shot first, or they're all dead): no offer
          const waiting = game.enemies.some((e) => !e.dead && (!ef.tag || e.tag === ef.tag) && e.faction === 'specimen');
          if (!waiting || game.hasFlag('heirsAngry')) {
            game.setFlag(ef.then || 'refusedHeirs');
            return;
          }
          LM.ui.open({
            kicker: 'Containment Control · Line H',
            title: 'Death, or a collar',
            body: h('div', null,
              h('p', { class: 'lore' }, 'They stand round you in a ring, smiling, all of them beautiful, all the same. The eldest holds out one long hand, palm up, the way you’d offer something to a dog to sniff.'),
              h('p', { class: 'lore' }, '“Lay down your little weapons. Take off your armour. Kneel. We will give you a name, and a bowl, and a warm place by us, for as long as you please us. Or we will eat you. You may choose. We are not monsters.”')),
            actions: [
              { label: 'Refuse', primary: true, onClick: () => setTimeout(() => refuse(game, ef), 0) },
              { label: 'Kneel (lay down your weapons, take off your armour)', onClick: () => setTimeout(() => kneel(game, ef), 0) },
            ],
            dismissable: false,
          });
        });
      },
    },
  };
  function refuse(game, ef) {
    LM.ui.closeAll();
    game.state = 'play';
    game.setFlag(ef.then || 'refusedHeirs');
    if (ef.tag) {
      game.setFaction(ef.tag, 'monster');
      for (const e of game.enemies) {
        if (e.dead || e.tag !== ef.tag) continue;
        e.aggro = true;
        e.knowsP = true;
      }
    }
    say('firstborn', 'Then you’re food. Brothers, sisters: open the bull. Let it have what we leave.', { pause: false });
  }

  // ======================================================== items
  const items = {
    'ds-release-console': {
      name: 'Containment Control', radius: 18, solid: 'rect', dressing: false, mapColor: '#ff3a2a', mapAlways: true,
      init(it) {
        it.box = [70, 22];
      },
      update(it, dt, game) {
        if (!game.hasFlag('releaseStarted') || game.hasFlag('releaseStopped') || game.hasFlag('behemothFree')) return;
        const P = game.player;
        if (P && !it.counting) {
          it.counting = true;
          LM.status.apply(game, P, 'vaultRelease', { seconds: it.props.seconds || 100 });
          LM.audio.play('alarm');
        }
        const left = game.enemies.filter((e) => !e.dead && e.tag === 'releaser').length;
        if (!left) {
          game.setFlag('releaseStopped');
          if (P) LM.status.clear(game, P, 'vaultRelease');
        }
      },
      interact: {
        prompt: (it, game) => (game.hasFlag('armoryOverride') ? 'Containment Control' : game.hasFlag('releaseStopped') ? 'Use Containment Control' : 'Containment Control'),
        use(it, game) {
          const stopped = game.hasFlag('releaseStopped'), done = game.hasFlag('armoryOverride');
          const vaults = [['VAULT 1 · LEVIATHAN', 'SEALED'], ['VAULT 2 · BEHEMOTH', game.hasFlag('behemothFree') ? 'OPEN' : stopped ? 'SEALED' : 'OPENING'], ['VAULT 3 · TIAMAT', 'SEALED · DRAINS LEAKING'], ['VAULT 4 · THE EYE', 'SEALED'],
            ['VAULT 5 · THE WINGS', 'SEALED'], ['VAULT 6 · THE FROG', 'SEALED'], ['VAULT 7 · THE GARDEN', 'BREACHED · GROWING'], ['VAULT 8 · HUNDRED-HANDED', 'BARRED'], ['ARMORY', done ? 'OPEN' : 'LOCKED (OVERRIDE)']];
          const body = h('div', null, h('div', { class: 'ds-screen' }, vaults.map(([k, v]) => k.padEnd(26, ' ') + v).join('\n')));
          if (!stopped || done) {
            LM.ui.open({ kicker: 'Sub-level B · Containment Control', title: done ? 'The vaults hold' : 'Someone’s at it', body: h('div', null, body, !stopped ? h('p', { class: 'muted' }, 'Vault 2’s release is running. Whatever is doing it is still here.') : null), actions: [{ label: 'Close', primary: true }] });
            return;
          }
          LM.ui.open({
            kicker: 'Sub-level B · Containment Control',
            title: 'Containment Control',
            body: h('div', null, body, h('p', { class: 'lore' }, 'The release is still keyed in, half done. Under it, an override for the armory that Asterion built to fight what’s in the vaults, waiting for a supervisor’s hand on the plate. The plate isn’t fussy. Yours will do.')),
            actions: [
              { label: 'Seal the vaults, and open the armory', primary: true, onClick: () => setTimeout(() => { game.setFlag('vaultsSealed'); game.setFlag('armoryOverride'); }, 0) },
              { label: 'Not yet', quiet: true },
            ],
          });
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#0c0c0e';
        g.fillRect(-36, -12, 72, 24);
        g.fillStyle = '#22252a';
        g.fillRect(-35, -11, 70, 22);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = '#060a0c';
          g.fillRect(-32 + i * 8.4, -9, 7, 9);
        }
        g.fillStyle = '#3a3e44';
        g.fillRect(-30, 3, 60, 6);
        g.fillStyle = '#6a1418';
        g.fillRect(-4, 3.5, 8, 5);
      },
      drawGlow(g, it, t, game) {
        const running = game && game.hasFlag('releaseStarted') && !game.hasFlag('releaseStopped');
        for (let i = 0; i < 8; i++) {
          const alarm = running && i === 1;
          G.glow(g, -28.5 + i * 8.4, -4.5, alarm ? 12 : 6, alarm ? '#ff3a2a' : i === 6 ? '#e8f4ff' : '#ffb040', alarm ? 0.6 + 0.4 * Math.sin(t * 8) : 0.25);
        }
      },
    },
    'ds-heir-writing': {
      name: 'Writing on the wall', radius: 10, wallMounted: true, dressing: 'Tartarus', mapColor: '#f0d8a0',
      interact: {
        prompt: () => 'Read the wall',
        use(it, game) {
          if (it.props.flag) game.setFlag(it.props.flag);
          LM.ui.showText(it.props.title || 'Written on the wall', it.props.text || '', it.props.kicker || 'Sub-level B');
        },
      },
      draw(g, it) {
        g.fillStyle = 'rgba(240,216,160,0.7)';
        for (let i = 0; i < 4; i++) g.fillRect(-12 + i * 6.5, -3 + (i % 2), 4.5, 1.4);
        g.fillRect(-10, 1.5, 20, 1.2);
      },
    },
  };

  // shoot one before they've made their offer, and the whole brood is at war with you
  const angered = (e, game) => {
    if (game.hasFlag('heirsAngry') || game.hasFlag('refusedHeirs')) return;
    if (e.tag !== 'heirs' && e.tag !== 'releaser') return;
    game.setFlag('heirsAngry');
  };

  // ======================================================== enemies
  const enemies = {
    'ds-heir': {
      name: 'Heir', hp: 170, speed: 158, radius: 9, armor: 0.12, mass: 1.6, accel: 11, turn: 9, ai: 'skirmisher', keep: [50, 190],
      sight: 420, leash: 1500, color: '#e8d8b8', blood: '#c8b8a0', gib: '#e8d8b8', deathSound: 'heirDie',
      resist: { staggered: 0.5 },
      attacks: [
        { type: 'charge', damage: 16, speed: 420, duration: 0.3, windup: 0.32, cooldown: 2.6, minRange: 60, maxRange: 210, stun: 0.3 },
        { type: 'melee', damage: 12, range: 14, windup: 0.22, recover: 0.3, cooldown: 0.8, knock: 120 },
        { type: 'ranged', projectile: 'enemy-slug', damage: 8, speed: 440, burst: 2, burstGap: 0.12, windup: 0.4, cooldown: 2.2, range: 380, spread: 0.06, lead: 0.4, flash: '#ffd28a' },
      ],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.5 }, { id: 'ds-medgel', chance: 0.2 }, { id: 'ammo-titan', chance: 0.15 }] },
      onHurt: angered,
      update(e, dt, game) {
        if (e.aggro && e.pSee && !e.mem.barked) {
          e.mem.barked = true;
          const lines = e._props.barks || ['“Little brother.”', '“You were the draft. We are the book.”', '“Kneel. It’s kinder.”', '“We’ll keep your face.”', '“Our parents were like you.”'];
          if (Math.random() < 0.45) game.toast(lines[Math.floor(Math.random() * lines.length)], 'warn');
        }
      },
      draw: (g, e, t) => drawHeir(g, e, t, false),
      drawGlow(g, e) {
        G.glow(g, e.x + Math.cos(e.facing) * 5, e.y + Math.sin(e.facing) * 5, 6, MIRROR, 0.35);
      },
    },
    'ds-heir-firstborn': {
      name: 'The Firstborn', hp: 1300, speed: 146, radius: 11, armor: 0.2, mass: 2.2, accel: 11, turn: 9, ai: 'skirmisher', keep: [60, 220],
      sight: 460, leash: 1800, color: '#141416', blood: '#c8b8a0', gib: '#e8d8b8', deathSound: 'heirDie', boss: true,
      resist: { staggered: 1, stasis: 0.4 },
      bossBar: {
        name: 'The Firstborn', color: '#f0d8a0', sub: () => 'Line H · heir to everything', range: 900,
        phases: [
          { at: 0.66, text: 'It laughs, and its brothers come.', do: (e, game) => summonHeirs(e, game, 2) },
          { at: 0.33, text: '“Enough. Brothers!”', do: (e, game) => summonHeirs(e, game, 3) },
        ],
      },
      attacks: [
        { type: 'blink', minRange: 120, maxRange: 420, windup: 0.35, delay: 0.25, damage: 22, distance: 48, behind: true, color: '#f0d8a0', cooldown: 4.5 },
        { type: 'nova', damage: 16, radius: 110, windup: 0.6, recover: 0.5, cooldown: 6, color: '#f0d8a0', status: 'staggered' },
        { type: 'ranged', projectile: 'enemy-slug', damage: 8, speed: 460, burst: 1, fan: 0.7, windup: 0.4, cooldown: 2, range: 400, spread: 0.02, lead: 0.4, flash: '#ffd28a' },
        { type: 'melee', damage: 20, range: 16, windup: 0.25, recover: 0.3, cooldown: 0.9, knock: 200 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-rounds', chance: 1 }, { id: 'ammo-shells', chance: 1 }] },
      onHurt: angered,
      onDeath(e, game) {
        game.setFlag('firstbornDead');
      },
      draw: (g, e, t) => drawHeir(g, e, t, true),
      drawGlow(g, e) {
        G.glow(g, e.x + Math.cos(e.facing) * 6, e.y + Math.sin(e.facing) * 6, 8, MIRROR, 0.5);
      },
    },
  };
  function summonHeirs(e, game, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const x = e.x + Math.cos(a) * 60, y = e.y + Math.sin(a) * 60;
      if (!game.level.walkable || game.level.walkable(x, y)) game.spawnEnemy('ds-heir', x, y, { aggro: true, summoned: true });
    }
  }

  if (LM.audio && LM.audio.define) {
    const A = LM.audio;
    A.define('heirDie', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 660, f1: 220, dur: 0.6, gain: 0.07 });
      kit.tone(t, o, { type: 'sine', f0: 990, f1: 330, dur: 0.6, gain: 0.04 });
    });
    A.define('kneel', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 400, dur: 0.4, gain: 0.2 });
      for (let i = 0; i < 4; i++) kit.noise(t + 0.15 + i * 0.12, o, { type: 'bandpass', freq: 1800, dur: 0.08, gain: 0.08, q: 3 });
    });
  }

  LM.definePack({ id: 'ds-tartarus', speakers, statuses, effects, items, enemies });
})();
