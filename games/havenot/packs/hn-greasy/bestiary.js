/* HaveNot — packs/hn-greasy/bestiary.js
 * What lives in the Greasy Bolt Hole now. Threat Levels from the books (Vol 3 pp. 112–120, the TI tables):
 *
 *   hn-chatter-a   Chatterpillar Alpha (L2): a small armored cybernetic centipede that hides in vents and walls and
 *                  swarms. If Encountered: listen, they clack like someone typing. (Vol 3 p. 112)
 *   hn-chatter-g   Chatterpillar Gamma (L3): what a well-fed Alpha becomes in its metallic cocoon: human-sized.
 *   hn-cocoon      a Gamma’s metallic cocoon: shoot it before it hatches, or it hatches when you come close
 *   hn-grime-turret Greasy security turret (L2): lobs slime globs
 *   hn-slop-tread  Slop-Tread Sanitation Denial Unit (L2): the treaded robot that sprays toxic goop
 *   hn-grease-monkey Hollow Grease Monkey (L3): an empty trooper shell still walking its post with a grease hose
 *   hn-eggbot      Class-1 Eggbot (L2–3): small, weak, arrogant; a telekinetic swipe; sometimes it bats a bullet
 *                  aside with its mind (Vol 3 p. 118, “TK block”). The Egg-Mask keeps them civil; pickled eggs
 *                  stop them cold. They make egg puns involuntarily and hate it.
 *   hn-princess    Princess Eggbot (L3 boss): eggbots.js
 *
 * As everywhere in this game: robots drop fuel cells and sprockets, bio-weapons drop nothing, nobody drops
 * healing or ammunition.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const HN = LM.HN;
  const ROBOT = { electric: 2, bleed: 0, toxic: 0, acid: 0.5 };
  const cell = (chance, big) => ({ id: 'hn-loot', chance, props: { hn: big ? 'hn-fuel-cell-big' : 'hn-fuel-cell' } });
  const sprocket = (chance) => ({ id: 'hn-loot', chance, props: { hn: 'hn-sprocket' } });
  const ell = (g, x, y, rx, ry, c) => {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, U.TAU);
    g.fill();
  };
  const say = (game, e, text, color) => game.particles.add({ type: 'text', x: e.x, y: e.y - e.r - 8, vy: -14, drag: 1, life: 2.2, text, color: color || '#f4ecd8', size: 6 });

  // ------------------------------------------------------------ the Eggbots’ mouths
  HN.EGG_BARKS = [
    'THE OVOID IS INEVITABLE', 'SUBMIT TO THE SHELL', 'ALL HAIL THE GREAT EGG-MORPH', 'YOUR SHAPE IS AN ERROR',
    'NON-OVOID DETECTED', 'FILE FORM 9-YOLK', 'CORNERS ARE A CRIME', 'LIMBS: UNNECESSARY', 'EGGSTERMINATE!', 'EGGSTERMINATE THE HUMANOID!',
    'YOU WILL BE SCRAMBLED', 'RESISTANCE IS SHELL-FISH', 'THE YOLK IS ON YOU', 'EGGS-ECUTION SCHEDULED',
  ];
  // what an Eggbot shouts the moment it sees you (not every time: HN.EGG_SPOT_CHANCE)
  HN.EGG_SPOTTED = ['EGGSTERMINATE!', 'EGGSTERMINATE THE HUMANOID!', 'EGGSTERMINATE! EGGSTERMINATE!', 'HUMANOID SIGHTED. EGGSTERMINATE!'];
  HN.EGG_SPOT_CHANCE = 0.6;
  HN.EGG_REGRETS = ['…I DID NOT SAY THAT', '…IDENTITY PROTOCOL ERROR', '…WHO WROTE THESE', 'STRIKE THAT FROM THE RECORD', '…UNACCEPTABLE PUN'];
  HN.EGG_MASKED = ['SERVANT. CONTINUE SERVING', 'EGG-SLENT WORK, SERVANT', 'YOUR EXECUTION IS PENCILLED IN', 'POLISH SOMETHING', 'MAINTAIN THAT POSTURE', 'YOU ARE ALMOST OVOID. ALMOST.'];
  const PUNNY = /EGG-|SCRAMBLE|YOLK|SHELL-FISH|EGGS-/;
  HN.eggProvoked = (game) => !!(game.level && game.level._hnEggProvoked);
  HN.masked = (game) => !!(game.player && game.player.equip.head === 'hn-egg-mask');

  const behaviors = {
    // chatterpillars: they clack while they hunt, and swarm
    'hn-chatter': {
      update(e, dt, game) {
        e.mem.clackT = (e.mem.clackT == null ? U.rand(0.5, 2) : e.mem.clackT) - dt;
        if (e.mem.clackT <= 0 && e.distP < 9 * T) {
          e.mem.clackT = U.rand(1.6, 3.2);
          game.particles.add({ type: 'text', x: e.x, y: e.y - 10, vy: -12, drag: 1, life: 0.9, text: U.pick(['tk-tk-tk', 'clack clack', 'tktktktk', 'tak tak']), color: '#c8c0a0', size: 5 });
        }
        LM.get('behaviors', 'swarmer').update(e, dt, game);
      },
    },
    // eggbots: vigils, masks, and then the usual skirmishing
    'hn-eggbot': {
      update(e, dt, game) {
        const lure = HN.nearestEggLure && HN.nearestEggLure(e, 10 * T);
        if (lure) {
          e.aggro = false;
          e.atk = null;
          const dx = lure.x - e.x, dy = lure.y - e.y, d = Math.hypot(dx, dy) || 1;
          if (d < 34) {
            if (!LM.status.has(e, 'hn-mourning')) {
              LM.status.apply(game, e, 'hn-mourning', { seconds: 7 });
              say(game, e, U.pick(['…PICKLED. THEY PICKLED THEM.', 'A MOMENT OF SILENCE', 'MONSTERS. FLESHY MONSTERS.', 'WE WILL REMEMBER YOU, BROTHERS']), '#e8d08a');
            }
          } else {
            e.mx += dx / d;
            e.my += dy / d;
          }
          return;
        }
        if (HN.masked(game) && !HN.eggProvoked(game)) {
          e.aggro = false;
          e.atk = null;
          e.alertT = 0;
          LM.ai.wander(e, game, 0.35);
          return;
        }
        LM.get('behaviors', 'skirmisher').update(e, dt, game);
      },
    },
  };

  // the eggbots’ talk: propaganda, involuntary puns, and a deflected bullet now and then
  function eggTalk(e, dt, game) {
    e.mem.barkT = (e.mem.barkT == null ? U.rand(1, 5) : e.mem.barkT) - dt;
    // the moment it sees you: the old war cry, now and then (the regular barks wait their turn after it)
    if (e.aggro && !e.mem.spotted && e.vis >= 0.5 && !(HN.masked(game) && !HN.eggProvoked(game))) {
      e.mem.spotted = true;
      if (Math.random() < HN.EGG_SPOT_CHANCE) {
        e.mem.barkT = U.rand(4, 8);
        return say(game, e, U.pick(HN.EGG_SPOTTED), '#ff6a5a');
      }
    }
    if (e.mem.barkT > 0 || e.distP > 11 * T || e.vis < 0.5) return;
    e.mem.barkT = U.rand(4, 8);
    if (HN.masked(game) && !HN.eggProvoked(game)) return say(game, e, U.pick(HN.EGG_MASKED), '#f4ecd8');
    if (!e.aggro) return;
    const line = U.pick(HN.EGG_BARKS);
    say(game, e, line, '#ff9ad8');
    if (PUNNY.test(line)) game.schedule(1.1, () => { if (!e.dead) say(game, e, U.pick(HN.EGG_REGRETS), '#c8a0ff'); });
  }
  const hurt = LM.combat.hurt;
  LM.combat.hurt = function (game, target, amount, o) {
    o = o || {};
    if (target && target.isEnemy && target.def.eggbot && !target.dead && o.source === 'player') {
      // anyone who hurts an Eggbot has shown their true, non-ovoid colors
      if (game.level && !game.level._hnEggProvoked) {
        game.level._hnEggProvoked = true;
        if (HN.masked(game)) game.toast('“THE SERVANT HAS ATTACKED. THE SERVANT IS NOT EGG-SLENT.” The Egg-Mask won’t fool them on this floor again.', 'warn');
      }
      // the telekinetic block: bullets and bolts, sometimes (not blasts, not melee, not slime)
      const blockable = o.type !== 'status' && o.type !== 'melee' && o.type !== 'hnGrease' && o.damageType !== 'slime' && o.damageType !== 'blast' && !o.aoe;
      if (blockable && Math.random() < (target.def.tkBlock || 0)) {
        game.particles.add({ type: 'text', x: target.x, y: target.y - target.r - 6, vy: -30, drag: 3, life: 0.6, text: 'DEFLECTED', color: '#d8a0ff', size: 7 });
        game.particles.burst(target.x, target.y, 4, { type: 'spark', color: '#d8a0ff', speed: 140, life: 0.2, size: 0.8 });
        return 0;
      }
    }
    return hurt.call(this, game, target, amount, o);
  };

  // ------------------------------------------------------------ drawings
  function drawChatter(g, e, s, plates) {
    g.rotate(e.facing);
    const step = Math.sin(e.t * 30);
    g.strokeStyle = '#1a1612';
    g.lineWidth = s * 0.14;
    for (let i = 0; i < 6; i++) {
      const ox = -s + i * s * 0.36, w = (i % 2 ? step : -step) * s * 0.25;
      g.beginPath();
      g.moveTo(ox, -s * 0.35); g.lineTo(ox + w, -s * 0.9);
      g.moveTo(ox, s * 0.35); g.lineTo(ox - w, s * 0.9);
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = -s * 1.1 + i * s * 0.5, wob = Math.sin(e.t * 12 + i) * s * 0.06;
      ell(g, x, wob, s * 0.36, s * 0.42, '#1e1c18');
      ell(g, x, wob, s * 0.3, s * 0.36, plates);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x - s * 0.06, -s * 0.34 + wob, s * 0.12, s * 0.68);
    }
    // the razor tail
    g.fillStyle = '#c8ccd0';
    g.beginPath();
    g.moveTo(-s * 1.3, 0); g.lineTo(-s * 1.9, -s * 0.18); g.lineTo(-s * 1.9, s * 0.18);
    g.closePath();
    g.fill();
  }
  /** An Eggbot's tracked base (the books: an egg on tank treads): a chassis and a tread each side, the links
   *  running as it moves (by how far it has come, so they stand still when it does). trim: the chassis edge. */
  HN.drawTreads = function (g, e, s, trim) {
    const run = ((e.x + e.y) * 0.35) % 4;
    const y0 = s * 0.2, th = s * 0.95, tw = s * 0.4, gap = s * 0.98;
    g.fillStyle = '#2a2622';
    g.fillRect(-gap, y0 + th * 0.18, gap * 2, th * 0.6);
    if (trim) {
      g.fillStyle = trim;
      g.fillRect(-gap, y0 + th * 0.18, gap * 2, Math.max(1, s * 0.07));
    }
    for (const side of [-1, 1]) {
      const x = side * gap - tw / 2;
      g.fillStyle = '#141210';
      G.roundRect(g, x, y0, tw, th, tw * 0.45);
      g.fill();
      // the links
      g.save();
      G.roundRect(g, x, y0, tw, th, tw * 0.45);
      g.clip();
      g.fillStyle = '#5a544c';
      for (let k = -1; k < th / 4 + 1; k++) g.fillRect(x, y0 + k * 4 + run, tw, 1.4);
      g.restore();
      // the drive wheels
      G.circle(g, side * gap, y0 + tw * 0.5, tw * 0.28, '#7a746a');
      G.circle(g, side * gap, y0 + th - tw * 0.5, tw * 0.28, '#7a746a');
    }
  };
  function drawEgg(g, e, s, shell, beret) {
    // eggbots roll on treads and wobble a little; they always face upright, which is the point of being an egg
    const wob = Math.sin(e.t * 7) * 0.06;
    g.save();
    HN.drawTreads(g, e, s);
    g.rotate(wob);
    ell(g, 0, 0, s * 0.82, s, '#1a1612');
    ell(g, 0, 0, s * 0.74, s * 0.92, shell);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(-s * 0.28, -s * 0.36, s * 0.18, s * 0.3, -0.4, 0, U.TAU);
    g.fill();
    // the eye band
    g.fillStyle = '#141210';
    g.fillRect(-s * 0.6, -s * 0.18, s * 1.2, s * 0.26);
    // the beret
    if (beret) {
      ell(g, s * 0.05, -s * 0.86, s * 0.5, s * 0.2, beret);
      G.circle(g, s * 0.1, -s * 1.02, s * 0.08, beret);
    }
    g.restore();
  }

  // ------------------------------------------------------------ enemies
  const enemies = {
    'hn-chatter-a': {
      name: 'Chatterpillar Alpha', hnThreat: 2, hp: 26, armor: 0.25, speed: 196, radius: 7, ai: 'hn-chatter', sight: 340, accel: 15, turn: 16, color: '#4a4a40',
      blood: '#c8b24a', gib: '#3a3a30', takes: { slime: 1.2, blast: 1.2 },
      attacks: [{ type: 'melee', damage: 5, range: 9, windup: 0.1, cooldown: 0.38, recover: 0.12, knock: 30 }],
      drops: null,
      draw(g, e) { drawChatter(g, e, 6, '#7a7a68'); },
      drawGlow(g, e) {
        const a = e.facing;
        G.glow(g, e.x + Math.cos(a) * 7, e.y + Math.sin(a) * 7, 4, '#ff6a2a', 0.7);
      },
    },
    'hn-chatter-g': {
      name: 'Chatterpillar Gamma', hnThreat: 3, hp: 115, armor: 0.35, speed: 150, radius: 12, mass: 2.4, ai: 'hn-chatter', sight: 380, accel: 10, turn: 9, color: '#5a5a48',
      blood: '#c8b24a', gib: '#4a4a3a', takes: { slime: 1.2 },
      attacks: [
        { type: 'charge', damage: 16, speed: 430, duration: 0.38, windup: 0.5, cooldown: 3.4, minRange: 70, maxRange: 220 },
        { type: 'melee', damage: 12, range: 15, windup: 0.22, cooldown: 0.75, recover: 0.2, knock: 90 },
      ],
      drops: null,
      draw(g, e) { drawChatter(g, e, 11, '#8a8a72'); },
      drawGlow(g, e) {
        const a = e.facing;
        for (const s of [-1, 1]) G.glow(g, e.x + Math.cos(a) * 12 + Math.cos(a + 1.57) * 3 * s, e.y + Math.sin(a) * 12 + Math.sin(a + 1.57) * 3 * s, 4, '#ff6a2a', 0.8);
      },
    },
    'hn-cocoon': {
      name: 'Metallic cocoon', hnThreat: 3, hp: 90, armor: 0.3, speed: 0, radius: 11, mass: 99, stationary: true, ai: 'turret', sight: 120, color: '#7a7a6a',
      blood: '#c8b24a', gib: '#6a6a5a', takes: { slime: 1.2 }, attacks: [], drops: null,
      artSkip: (e) => !!e.mem.hatchT, // hatching, it shakes and cracks as drawn here

      update(e, dt, game) {
        // it hatches when something warm comes close, or when it has been shot at but not killed
        if (!e.mem.hatchT && (e.distP < 70 || (e.hp < e.maxHp && e.distP < 260))) {
          e.mem.hatchT = 1.6;
          game.particles.add({ type: 'text', x: e.x, y: e.y - 16, vy: -14, drag: 1, life: 1.4, text: 'crk… crrk…', color: '#c8c0a0', size: 6 });
          LM.audio.play('wall', { vol: 0.7 });
        }
        if (e.mem.hatchT) {
          e.mem.hatchT -= dt;
          if (e.mem.hatchT <= 0 && !e.dead) {
            e.dead = true;
            game.particles.burst(e.x, e.y, 18, { type: 'chunk', color: '#9a9a8a', speed: 180, life: 0.6, size: 1.6, drag: 3 });
            const g2 = game.spawnEnemy('hn-chatter-g', e.x, e.y, { aggro: true });
            if (g2) g2.hp = g2.maxHp * U.clamp(e.hp / e.maxHp + 0.2, 0.4, 1);
            game.toast('The cocoon splits. Something human-sized unfolds out of it, clacking.', 'warn');
          }
        }
      },
      draw(g, e, t) {
        const shake = e.mem.hatchT ? Math.sin(t * 60) * 1.2 : 0;
        g.translate(shake, 0);
        ell(g, 0, 0, 10, 13, '#2a2a24');
        ell(g, 0, 0, 9, 12, '#8a8a7a');
        g.strokeStyle = '#5a5a4a';
        g.lineWidth = 1;
        for (let i = -9; i < 12; i += 4) {
          g.beginPath();
          g.moveTo(-8, i); g.quadraticCurveTo(0, i + 3, 8, i);
          g.stroke();
        }
      },
      drawGlow(g, e, t) { G.glow(g, e.x, e.y, 14, '#c8b24a', 0.08 + 0.06 * Math.sin(t * 2 + e.home.x)); },
    },
    'hn-grime-turret': {
      name: 'Greasy Security Turret', hnThreat: 2, hp: 95, armor: 0.3, speed: 0, radius: 11, mass: 99, stationary: true, ai: 'turret', sight: 400, turn: 4,
      robot: true, takes: Object.assign({}, ROBOT), color: '#4a4220', blood: '#ffcf6a', gib: '#3a3418', deathSound: 'explode', deathGlow: '#c8d04a',
      attacks: [{ type: 'ranged', projectile: 'hn-slime-glob', damage: 7, speed: 330, burst: 3, burstGap: 0.16, windup: 0.7, cooldown: 1.9, range: 400, spread: 0.06, lead: 0.3, moveWhileFiring: 0, flash: '#c8e84a', status: { id: 'hn-grimed', seconds: 2.5 } }],
      drops: { gold: [4, 10], items: [cell(1), sprocket(0.3)] },
      update(e, dt, game) {
        // the control room can stand them down
        if (game.hasFlag('hnTurretsOff')) {
          e.aggro = false;
          e.atk = null;
          e.alertT = 0;
        }
      },
      draw(g, e) {
        g.fillStyle = '#16140a';
        G.roundRect(g, -12, -12, 24, 24, 4);
        g.fill();
        g.fillStyle = '#4a4220';
        G.roundRect(g, -10, -10, 20, 20, 3);
        g.fill();
        g.fillStyle = '#e0c030';
        for (let i = -10; i < 10; i += 5) g.fillRect(i, 8, 2.5, 2);
        g.rotate(e.facing);
        G.circle(g, 0, 0, 6, '#2a2410');
        g.fillStyle = '#1a1808';
        g.fillRect(4, -3, 14, 6);
        g.fillStyle = '#8a9a2a';
        g.fillRect(15, -2, 3, 4);
      },
      drawGlow(g, e, t) {
        const k = e.atk ? Math.min(1, e.atk.t / 0.7) : 0;
        G.glow(g, e.x + Math.cos(e.facing) * 17, e.y + Math.sin(e.facing) * 17, 6 + k * 8, '#c8e84a', 0.3 + k * 0.5);
      },
    },
    'hn-slop-tread': {
      name: 'Slop-Tread Sanitation Denial Unit', hnThreat: 2, hp: 190, armor: 0.38, speed: 58, radius: 14, mass: 4, ai: 'hn-plod', sight: 360, turn: 3,
      robot: true, takes: Object.assign({}, ROBOT), color: '#5a5020', blood: '#ffcf6a', gib: '#3a3418', deathSound: 'explode', deathGlow: '#c8d04a',
      attacks: [
        { type: 'ranged', projectile: 'hn-slime-glob', damage: 5, speed: 300, burst: 6, burstGap: 0.05, fan: 0.75, windup: 0.75, cooldown: 2.3, range: 230, spread: 0.05, lead: 0.2, moveWhileFiring: 0, flash: '#c8e84a', status: { id: 'hn-grimed', seconds: 3 } },
        { type: 'melee', damage: 14, range: 16, windup: 0.5, cooldown: 1.6, recover: 0.3, knock: 160 },
      ],
      drops: { gold: [8, 16], items: [cell(1), cell(0.5), sprocket(0.6)] },
      update(e, dt, game) {
        e.mem.barkT = (e.mem.barkT == null ? 2 : e.mem.barkT) - dt;
        if (e.mem.barkT <= 0 && e.aggro && e.distP < 10 * T) {
          e.mem.barkT = U.rand(5, 9);
          say(game, e, U.pick(['SANITATION DETECTED. DENYING.', 'YOU ARE TOO CLEAN.', 'PLEASE HOLD STILL FOR GREASING.', 'HYGIENE IS DESERTION.']), '#e0e070');
        }
      },
      draw(g, e) {
        g.rotate(e.facing);
        // treads
        const roll = (e.t * 40) % 4;
        for (const s of [-1, 1]) {
          g.fillStyle = '#141208';
          g.fillRect(-14, s * 9 - 4, 28, 8);
          g.fillStyle = '#3a3628';
          for (let i = -14 + roll; i < 14; i += 4) g.fillRect(i, s * 9 - 4, 2, 8);
        }
        g.fillStyle = '#1e1a0c';
        g.fillRect(-11, -8, 22, 16);
        g.fillStyle = '#5a5020';
        g.fillRect(-10, -7, 20, 14);
        // the tank and the nozzle
        G.circle(g, -4, 0, 5.5, '#3a3418');
        G.circle(g, -4, 0, 3.6, '#8a9a2a');
        g.fillStyle = '#2a2410';
        g.fillRect(4, -2.5, 15, 5);
        g.fillStyle = '#c8d04a';
        g.fillRect(17, -1.5, 3, 3);
      },
      drawGlow(g, e, t) {
        const k = e.atk ? 0.8 : 0.3;
        G.glow(g, e.x + Math.cos(e.facing) * 19, e.y + Math.sin(e.facing) * 19, 8, '#c8e84a', k + 0.1 * Math.sin(t * 6));
      },
    },
    'hn-grease-monkey': {
      name: 'Hollow Grease Monkey', hnThreat: 3, hp: 240, armor: 0.42, speed: 84, radius: 13, mass: 3.5, ai: 'chaser', sight: 380, turn: 6,
      robot: true, takes: Object.assign({}, ROBOT, { slime: 0.5 }), color: '#4a4420', blood: '#ffcf6a', gib: '#3a3418', deathSound: 'explode', deathGlow: '#c8d04a',
      attacks: [
        { type: 'ranged', projectile: 'hn-slime-glob', damage: 6, speed: 360, burst: 8, burstGap: 0.06, fan: 0.45, windup: 0.55, cooldown: 2.0, range: 240, spread: 0.08, lead: 0.2, moveWhileFiring: 0.3, flash: '#c8e84a', status: { id: 'hn-grimed', seconds: 3 } },
        { type: 'melee', damage: 18, range: 16, windup: 0.4, cooldown: 1.4, recover: 0.3, knock: 200 },
      ],
      drops: { gold: [15, 30], items: [cell(1, true), sprocket(1)] },
      onDeath(e, game) {
        // the shell from the machine shop carries the Grease Thrower on its back
        if (e.hnCarriesThrower) game.spawnItemAt('weapon-pickup', e.x, e.y, { weapon: 'hn-grease-thrower' });
      },
      update(e, dt, game) {
        e.mem.barkT = (e.mem.barkT == null ? 1 : e.mem.barkT) - dt;
        if (e.mem.barkT <= 0 && e.aggro && e.distP < 10 * T) {
          e.mem.barkT = U.rand(5, 9);
          say(game, e, U.pick(['FOR ENOCH. FOR FILTH.', 'ROLL CALL: 0 PRESENT', 'SPREAD THE GREASE', 'NO SOAP. NO SURRENDER.', 'THE GREASY ARE ETERNAL']), '#e0e070');
        }
      },
      draw(g, e) {
        g.rotate(e.facing);
        // a hulking empty shell: a barrel chest, a back-tank, a hose arm
        ell(g, -6, 0, 7, 9, '#2a2410');
        ell(g, -6, 0, 5.5, 7.5, '#6a6a24');
        ell(g, 1, 0, 11, 12, '#1a1608');
        ell(g, 1, 0, 9.6, 10.6, '#5a5020');
        g.fillStyle = '#3a3418';
        g.fillRect(-3, -11, 8, 3);
        g.fillRect(-3, 8, 8, 3);
        g.fillStyle = '#2a2410';
        g.fillRect(6, 4, 13, 4);
        g.fillStyle = '#c8d04a';
        g.fillRect(17, 4.5, 3, 3);
        // the empty visor
        g.fillStyle = '#0a0a06';
        g.fillRect(6, -4, 4, 6);
      },
      drawGlow(g, e, t) { G.glow(g, e.x + Math.cos(e.facing) * 8, e.y + Math.sin(e.facing) * 8, 6, '#e0e070', 0.4 + 0.2 * Math.sin(t * 3)); },
    },
    'hn-eggbot': {
      name: 'Class-1 Eggbot', hnThreat: 2, hp: 40, armor: 0.2, speed: 116, radius: 9, ai: 'hn-eggbot', keep: [80, 170], sight: 360, accel: 8, turn: 8,
      robot: true, eggbot: true, tkBlock: 0.15, takes: Object.assign({}, ROBOT), color: '#f4ecd8', blood: '#ffe68a', gib: '#f4ecd8', deathSound: 'explode', deathGlow: '#ffe68a',
      attacks: [{ type: 'ranged', projectile: 'hn-tk', damage: 8, speed: 420, windup: 0.45, cooldown: 1.3, range: 220, spread: 0.05, lead: 0.3, flash: '#c88aff', status: 'hn-tk-dazed' }],
      drops: { gold: [3, 9], goldChance: 0.6, items: [cell(0.8), sprocket(0.25)] },
      update(e, dt, game) { eggTalk(e, dt, game); },
      onDeath(e, game) { if (Math.random() < 0.5) say(game, e, U.pick(['I DIE… OVOID…', 'CRACKED…', 'TELL THE PRINCESS… I WAS… EGG-CELLENT', 'HARD-BOILED TO THE END']), '#ffe68a'); },
      draw(g, e) { drawEgg(g, e, 9, '#f4ecd8', '#141210'); },
      drawGlow(g, e, t) {
        const masked = HN.masked(LM.game) && !HN.eggProvoked(LM.game);
        G.glow(g, e.x, e.y - 1, 6, masked ? '#8ad8ff' : '#ff4ab8', 0.55 + 0.2 * Math.sin(t * 4 + e.home.x));
        if (e.atk) G.glow(g, e.x, e.y, 16, '#c88aff', 0.3);
      },
    },
  };

  LM.definePack({ id: 'hn-greasy', behaviors, enemies });
})();
