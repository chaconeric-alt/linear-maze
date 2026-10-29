/* Dead Signal — packs/ds-tartarus/armory.js
 * The Tartarus Armory: what Asterion built to fight the Titans, and never had to use. (DESIGN.md 6.1.)
 *   ammo      titan ("Titan cells", LM.defineAmmo) and its pickup ammo-titan (nothing takes them now: the armory's
 *             weapons never run dry, and nothing drops them)
 *   weapons   Built to end the game as a mop-up: six times what they first did, they never run dry (ammo: null),
 *             and no mirror sends their shots back (reflectable: false on all three projectiles).
 *             ds-prometheus-lance     a bolt of plasma that goes through everything in a line, shields included.
 *             ds-stasis-projector     a spray of stasis: what it holds can't move, can't fight, and breaks more
 *                                     easily.
 *             ds-singularity-driver   throws a seed of a black hole where you aim: for three seconds it drags in
 *                                     everything round it and crushes what reaches the middle, then bursts.
 *                                     It doesn't pull you.
 *   armor     ds-containment-suit     a Titan-rated containment suit (body)
 *   items     ds-singularity (the well: pull, life), ds-weapon-case (an armoury case: props.weapon or
 *             props.armor; take what's in it)
 *   statuses  stasis
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {}), Z = DS.Z;
  const TAU = U.TAU;
  const h = (...a) => LM.ui.h(...a);
  const LANCE = '#ffd27a', STASIS = '#9ae8ff', VOID = '#b46cff';
  if (LM.defineAmmo) LM.defineAmmo('titan', { name: 'Titan cells', max: 60, amount: 12, color: '#6a3a10', band: '#ffb040' });

  const metal = (g, x, y, w, hh, c) => {
    const grd = g.createLinearGradient(0, y, 0, y + hh);
    grd.addColorStop(0, U.shade(c, 0.3));
    grd.addColorStop(0.5, c);
    grd.addColorStop(1, U.shade(c, -0.4));
    g.fillStyle = grd;
    g.fillRect(x, y, w, hh);
  };

  const statuses = {
    stasis: { name: 'Stasis', seconds: 2.6, stun: true, speedMul: 0, vulnerable: 0.35, tint: STASIS, tintAlpha: 0.5, color: STASIS },
  };

  const weapons = {
    'ds-prometheus-lance': {
      name: 'Prometheus Lance', short: 'Lance', slot: 7,
      desc: 'TARTARUS ARMORY · ITEM 1. A man-portable plasma lance, built to cut a Titan apart faster than it can grow back. It doesn’t, quite. It goes through everything in a line, armour and shields and the thing behind the shield; no mirror turns it. It never runs dry.',
      ammo: null, damage: 450, fireRate: 1.5, spread: 0.004, bloom: 0.01, speed: 2600, range: 950, pierce: 8,
      projectile: 'ds-lance-bolt', status: { id: 'burning', seconds: 2 }, knock: 140, recoil: 0.6, kick: 0.14, pushback: 40, sound: 'lanceFire', casing: false,
      flash: LANCE, flashRadius: 220, flashSize: 14, sparks: 6, muzzle: 24, length: 24,
      drawHeld(g, p, k) {
        g.fillStyle = '#141416';
        g.fillRect(-1 - k, -2.6, 8, 5.2);
        metal(g, 5 - k, -3.4, 12, 6.8, '#6a5a3a');
        g.fillStyle = '#2a2014';
        for (let i = 0; i < 3; i++) g.fillRect(7 - k + i * 3.2, -3.4, 1, 6.8);
        metal(g, 17 - k, -1.8, 8, 3.6, '#c9a046');
        g.fillStyle = LANCE;
        g.fillRect(24 - k, -1, 1.6, 2);
        g.fillStyle = 'rgba(255,210,122,0.6)';
        g.fillRect(8 - k, 3.4, 7, 1);
      },
    },
    'ds-stasis-projector': {
      name: 'Stasis Projector', short: 'Stasis', slot: 8,
      desc: 'TARTARUS ARMORY · ITEM 2. Built to hold a Titan still long enough to move it. A spray of stasis: what it catches can’t move, can’t fight, and breaks more easily while it’s held. Not for very long. It never runs dry.',
      ammo: null, damage: 24, pellets: 5, fireRate: 2.6, spread: 0.24, speed: 520, range: 300, falloff: 0.2,
      projectile: 'ds-stasis-pulse', status: { id: 'stasis', seconds: 2.6 }, knock: 0, recoil: 0.25, kick: 0.04, sound: 'stasisFire', casing: false,
      flash: STASIS, flashRadius: 120, flashSize: 10, sparks: 0, muzzle: 18, length: 18,
      drawHeld(g, p, k) {
        g.fillStyle = '#16181b';
        g.fillRect(0 - k, -2.4, 6, 4.8);
        metal(g, 5 - k, -3.6, 9, 7.2, '#c8ccd0');
        g.fillStyle = '#2a5a7a';
        g.fillRect(6 - k, -2.6, 7, 5.2);
        g.fillStyle = STASIS;
        g.fillRect(7 - k, -1.6, 5, 3.2);
        metal(g, 14 - k, -2.6, 5, 5.2, '#8a9198');
        g.fillStyle = STASIS;
        g.fillRect(19 - k, -2, 1.2, 4);
      },
    },
    'ds-singularity-driver': {
      name: 'Singularity Driver', short: 'Gate', slot: 9,
      desc: 'TARTARUS ARMORY · ITEM 3. The last resort. It throws the seed of a black hole to where you aim; for three seconds it drags in everything round it and crushes what reaches the middle, then lets go all at once. It doesn’t pull you (the manual says “usually”). It never runs dry.',
      ammo: null, damage: 60, fireRate: 0.65, spread: 0, speed: 460, range: 'cursor', maxRange: 460,
      projectile: 'ds-singularity-seed', knock: 0, recoil: 0.5, kick: 0.1, sound: 'singularityFire', casing: false,
      flash: VOID, flashRadius: 140, flashSize: 12, sparks: 0, muzzle: 20, length: 20,
      drawHeld(g, p, k) {
        g.fillStyle = '#0c0c0e';
        g.fillRect(0 - k, -3, 7, 6);
        metal(g, 6 - k, -4.2, 10, 8.4, '#2a2a30');
        g.strokeStyle = VOID;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(11 - k, 0, 3, 0, TAU);
        g.stroke();
        metal(g, 16 - k, -2.4, 5, 4.8, '#4a4a52');
        g.fillStyle = VOID;
        g.fillRect(21 - k, -1.2, 1.2, 2.4);
      },
    },
  };

  const projectiles = {
    'ds-lance-bolt': {
      radius: 4, color: LANCE, reflectable: false, wallSparks: 8, sparkColor: LANCE,
      light: { r: 130, color: LANCE, intensity: 0.7 },
      draw() {},
      drawGlow(g, p) {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = Math.min(140, p.traveled + 4);
        const tx = p.x - (p.vx / sp) * len, ty = p.y - (p.vy / sp) * len;
        g.strokeStyle = 'rgba(255,200,110,0.45)';
        g.lineWidth = 7;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(p.x, p.y);
        g.stroke();
        g.strokeStyle = 'rgba(255,250,230,0.95)';
        g.lineWidth = 2.2;
        g.stroke();
        G.glow(g, p.x, p.y, 18, LANCE, 0.9);
      },
    },
    'ds-stasis-pulse': {
      radius: 5, color: STASIS, quiet: true, wallSparks: 0, reflectable: false,
      light: { r: 70, color: STASIS, intensity: 0.3 },
      draw() {},
      drawGlow(g, p) {
        const k = Math.min(1, p.traveled / (p.range || 300));
        g.strokeStyle = U.rgba(STASIS, 0.6 * (1 - k));
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(p.x, p.y, 3 + k * 9, 0, TAU);
        g.stroke();
        G.glow(g, p.x, p.y, 8 + k * 6, STASIS, 0.4 * (1 - k * 0.6));
      },
    },
    'ds-singularity-seed': {
      radius: 4, color: VOID, wallSparks: 0, quiet: true, reflectable: false,
      light: { r: 80, color: VOID, intensity: 0.4 },
      draw(g, p) {
        g.fillStyle = '#050208';
        g.beginPath();
        g.arc(p.x, p.y, 4, 0, TAU);
        g.fill();
      },
      drawGlow(g, p, t) {
        G.glow(g, p.x, p.y, 14, VOID, 0.7);
        g.strokeStyle = 'rgba(200,150,255,0.7)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(p.x, p.y, 6, t * 8, t * 8 + 4);
        g.stroke();
      },
      onImpact(p, game) {
        // just short of the wall, if it hit one
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const x = p.x - (p.vx / sp) * 10, y = p.y - (p.vy / sp) * 10;
        game.spawnItemAt('ds-singularity', x, y, {});
        LM.audio.play('singularityOpen', { vol: 1 });
      },
    },
  };

  const items = {
    // the well: a black hole for three seconds; it pulls everything but you, crushes what reaches it, then bursts
    'ds-singularity': {
      name: 'Singularity', radius: 8, shadow: false, dressing: false, life: 3.2, drawRadius: 160,
      pull: { radius: 165, strength: 380, swirl: 0.55, core: 28, damage: 156, interval: 0.25, flying: true, player: false },
      onExpire(it, game) {
        LM.combat.explode(game, it.x, it.y, { radius: 95, damage: 330, owner: 'player', color: VOID, selfDamage: 0 }); // it never hurts you
        LM.audio.play('singularityClose', { vol: 1 });
        game.addShake(0.35);
      },
      update(it, dt, game) {
        if (Math.random() < dt * 40) {
          const a = Math.random() * TAU, r = U.rand(70, 160);
          game.particles.add({ type: 'dot', x: it.x + Math.cos(a) * r, y: it.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.4 - Math.sin(a) * 80, vy: -Math.sin(a) * r * 1.4 + Math.cos(a) * 80, drag: 0, life: 0.6, color: '#c8a8ff', size: 1.1 });
        }
      },
      draw(g, it, t) {
        const k = Math.min(1, (it.age || 0) / 0.3);
        // the lensed ring round it, then nothing at all in the middle
        g.strokeStyle = 'rgba(180,108,255,' + 0.35 * k + ')';
        g.lineWidth = 6;
        g.beginPath();
        g.ellipse(0, 0, 30 * k, 22 * k, t * 4, 0, TAU);
        g.stroke();
        g.fillStyle = '#000000';
        g.beginPath();
        g.arc(0, 0, 16 * k, 0, TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        const k = Math.min(1, (it.age || 0) / 0.3);
        G.glow(g, 0, 0, 60 * k, VOID, 0.45);
        g.strokeStyle = 'rgba(230,200,255,' + 0.8 * k + ')';
        g.lineWidth = 1.4;
        g.beginPath();
        g.ellipse(0, 0, 20 * k, 14 * k, t * 6, 0, TAU);
        g.stroke();
      },
    },
    'ammo-titan': {
      name: 'Titan cells', radius: 7, shadowScale: 0.7, dressing: false,
      onTouch(it, game) {
        const P = game.player;
        if ((P.ammo.titan || 0) >= P.ammoMax('titan')) return false;
        const got = P.addAmmo('titan', it.props.amount || 12);
        LM.audio.play('pickup');
        game.particles.add({ type: 'text', x: it.x, y: it.y - 10, vy: -30, drag: 2, life: 0.8, text: '+' + got + ' titan cells', color: '#ffd2a0', size: 7 });
      },
      draw(g) {
        g.fillStyle = '#16181b';
        G.roundRect(g, -6, -4.5, 12, 9, 2);
        g.fill();
        g.fillStyle = '#6a3a10';
        G.roundRect(g, -5.2, -3.7, 10.4, 7.4, 1.6);
        g.fill();
        g.fillStyle = '#ffb040';
        for (let i = 0; i < 3; i++) g.fillRect(-4 + i * 3.2, -2.6, 2, 5.2);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, '#ffb040', 0.25 + 0.1 * Math.sin(t * 3));
      },
    },
    // an armoury case: glass over a cradle, the thing in it labelled. Take it.
    // props.full is true while there's something in it (an objective can point at the full ones); taking the last
    // one on the floor sets armoryEmptied.
    'ds-weapon-case': {
      name: 'Armoury case', radius: 14, solid: 'rect', dressing: 'Tartarus', mapColor: '#ffb040',
      init(it) {
        it.box = [28, 18];
        it.props.full = !it.taken;
      },
      update(it) {
        it.props.full = !it.taken;
      },
      interact: {
        available: (it) => !it.taken,
        prompt: (it) => 'Open the case: ' + (it.props.weapon ? LM.get('weapons', it.props.weapon).name : LM.get('armor', it.props.armor).name),
        use(it, game) {
          const P = game.player;
          if (it.props.weapon) {
            const w = LM.get('weapons', it.props.weapon);
            P.giveWeapon(it.props.weapon, game);
            if (w.ammo && it.props.ammo) P.addAmmo(w.ammo, it.props.ammo);
            LM.ui.showText(w.name, w.desc, 'Tartarus Armory');
          } else if (it.props.armor) {
            const a = LM.get('armor', it.props.armor);
            P.equipArmor(it.props.armor);
            LM.ui.showText(a.name, a.desc, 'Tartarus Armory · you put it on');
          }
          it.taken = true;
          it.props.full = false;
          LM.audio.play('key');
          if (it.props.flag) game.setFlag(it.props.flag);
          game.setFlag('armoryTaken');
          if (game.items.every((o) => o.dead || o.def.id !== 'ds-weapon-case' || o.taken)) game.setFlag('armoryEmptied');
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#0c0a08';
        g.fillRect(-15, -10, 30, 20);
        metal(g, -14, -9, 28, 18, '#3a3024');
        g.fillStyle = '#16120c';
        g.fillRect(-12, -7, 24, 14);
        if (!it.taken) {
          g.save();
          if (it.props.weapon) {
            const w = LM.get('weapons', it.props.weapon);
            g.translate(-10, 0);
            if (w.drawHeld) w.drawHeld(g, {}, 0);
          } else {
            const a = LM.get('armor', it.props.armor);
            g.fillStyle = a.color;
            g.beginPath();
            g.ellipse(0, 0, 7, 6, 0, 0, TAU);
            g.fill();
            g.strokeStyle = a.trim;
            g.lineWidth = 1;
            g.stroke();
          }
          g.restore();
        }
        // the glass lid, and a label
        g.fillStyle = it.taken ? 'rgba(200,220,240,0.05)' : 'rgba(200,220,240,0.12)';
        g.fillRect(-12, -7, 24, 14);
        g.fillStyle = Z.bronze;
        g.fillRect(-14, 7.6, 28, 1.4);
      },
      drawGlow(g, it, t) {
        if (!it.taken) G.glow(g, 0, 0, 24, '#ffb040', 0.18 + 0.08 * Math.sin(t * 2));
      },
    },
  };

  const armor = {
    'ds-containment-suit': {
      name: 'Titan containment suit', slot: 'body', color: '#c9a046', trim: '#2a2014',
      mods: { armor: 0.28, maxShield: 50, shieldRegen: 14, speed: -8 },
      resist: { engulfed: 0.6, crystallizing: 0.5, judged: 0.6, burning: 0.6, grasped: 0.5, staggered: 0.5 },
      desc: 'TARTARUS ARMORY · ITEM 4. Bronze-gold plate over a sealed suit, rated for work inside the vaults. The stencil on the chest says it’s good against the Garden and the Eye for a while, and that “a while” is not a figure of speech, it’s a measurement.',
    },
  };

  if (LM.audio && LM.audio.define) {
    const A = LM.audio;
    A.define('lanceFire', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 1400, f1: 120, dur: 0.35, gain: 0.12 });
      kit.noise(t, o, { type: 'bandpass', freq: 2600, freqEnd: 600, dur: 0.4, gain: 0.2, q: 1.5 });
      kit.tone(t, o, { type: 'sine', f0: 90, f1: 40, dur: 0.4, gain: 0.2 });
    });
    A.define('stasisFire', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 1800, f1: 2600, dur: 0.18, gain: 0.05 });
      kit.noise(t, o, { type: 'highpass', freq: 5000, dur: 0.15, gain: 0.05 });
    });
    A.define('singularityFire', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 200, f1: 60, dur: 0.3, gain: 0.15 });
    });
    A.define('singularityOpen', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 40, f1: 28, dur: 3, gain: 0.25, attack: 0.1 });
      kit.noise(t, o, { type: 'lowpass', freq: 300, freqEnd: 120, dur: 3, gain: 0.15, attack: 0.3 });
    });
    A.define('singularityClose', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 1200, freqEnd: 100, dur: 0.6, gain: 0.4 });
      kit.tone(t, o, { type: 'sine', f0: 60, f1: 30, dur: 0.5, gain: 0.3 });
    });
  }

  LM.definePack({ id: 'ds-tartarus', statuses, weapons, projectiles, items, armor });
})();
