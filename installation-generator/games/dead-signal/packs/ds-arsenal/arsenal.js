/* Dead Signal — packs/ds-arsenal/arsenal.js
 * What Theo fights with and wears (DESIGN.md section 6), and what can happen to him.
 *   weapons   ds-bolt-driver (his own tool: unlimited, short range), ds-sidearm (rounds), ds-riot-shotgun
 *             (shells); Floor 2: ds-cryo-sprayer (cryo: a short freezing spray that chills what it hits)
 *   armor     ds-security-vest (body), ds-hard-hat (head, a lamp), ds-ruiz-badge (trinket: a small shield);
 *             Floor 2: ds-hazmat-hood (head: spores can't reach you; no lamp)
 *   items     ds-medgel (+30 health), ds-trauma-kit (+70), ammo-cryo (a cryo canister)
 *   statuses  sedated (a LabMate's syringe: slow), chilled (the Cryo Sprayer: slow, takes more damage),
 *             staggered (a scream: slow), held (caught by a strand), snared (a clump of strands), spores (the mycology lab: hurts),
 *             uv (a Sterilizer's lamp: burns)
 * The engine's "rivets" are called rounds here; `cryo` is a new kind of ammunition (LM.defineAmmo).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  if (LM.AMMO_NAMES) LM.AMMO_NAMES.rounds = 'Rounds';
  if (LM.defineAmmo) LM.defineAmmo('cryo', { name: 'Cryo', max: 200, amount: 40, color: '#2a5a7a', band: '#bfe8ff' });
  const ICE = '#bfe8ff';

  const metal = (g, x, y, w, h, c) => {
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, U.shade(c, 0.3));
    grd.addColorStop(0.5, c);
    grd.addColorStop(1, U.shade(c, -0.4));
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
  };

  const weapons = {
    'ds-bolt-driver': {
      name: 'Bolt Driver', short: 'Bolts', slot: 1,
      desc: 'A pneumatic fastener gun from Theo’s tool bag. It drives a steel bolt through a fire door. Short range, never runs dry.',
      ammo: null, damage: 10, fireRate: 3, spread: 0.035, speed: 860, range: 270, falloff: 0.35,
      projectile: 'rivet', knock: 85, recoil: 0.34, kick: 0.06, sound: 'boltDriver', casing: false, flash: '#d8e4ff', flashRadius: 70, muzzle: 18, length: 15,
      drawHeld(g, p, k) {
        // yellow body, black grip and a steel nose
        g.fillStyle = '#1c1c1c';
        g.fillRect(2 - k, -1.6, 5, 4.4);
        g.fillStyle = '#d9a21c';
        G.roundRect(g, 4 - k, -3, 9, 5.4, 1.5);
        g.fill();
        g.fillStyle = '#1c1c1c';
        g.fillRect(6 - k, -3, 2, 5.4);
        metal(g, 13 - k, -1.4, 5, 2.8, '#8a9198');
        g.fillStyle = '#2a2a2a';
        g.fillRect(17 - k, -0.8, 1.4, 1.6);
        // the air hose
        g.strokeStyle = '#3a6ab0';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(3 - k, 2.4);
        g.quadraticCurveTo(-2, 6, -5, 3);
        g.stroke();
      },
    },
    'ds-sidearm': {
      name: 'Security Sidearm', short: 'Sidearm', slot: 2,
      desc: 'Officer Ruiz’s service pistol. Quick and accurate; it takes rounds.',
      ammo: 'rounds', pickupAmmo: 36, damage: 14, fireRate: 4.2, spread: 0.03, speed: 980, range: 900,
      knock: 55, recoil: 0.32, kick: 0.05, sound: 'pistol', casing: true, flash: '#ffd38a', muzzle: 17, length: 12,
      drawHeld(g, p, k) {
        metal(g, 5 - k, -1.8, 12, 3.6, '#2a2d33');
        g.fillStyle = '#16181b';
        g.fillRect(4 - k, -1.2, 4, 3.4);
        g.fillStyle = '#8a9198';
        g.fillRect(14 - k, -1.2, 3, 1);
      },
    },
    'ds-riot-shotgun': {
      name: 'Riot Shotgun', short: 'Riot', slot: 3,
      desc: 'From the armory cage. Eight pellets a shell: it stops a security robot at arm’s length and does nothing across a room.',
      ammo: 'shells', pickupAmmo: 10, pellets: 8, damage: 7, fireRate: 1.3, spread: 0.22, speed: 820, range: 300, falloff: 0.6,
      projectile: 'pellet', knock: 85, recoil: 1.0, kick: 0.22, pushback: 70, sound: 'scatter', casing: '#2a5a8a', smoke: true,
      flash: '#ffc070', flashRadius: 160, flashSize: 26, sparks: 7, muzzle: 23, length: 21, kickBack: 6,
      drawHeld(g, p, k) {
        g.fillStyle = '#1a1c1f';
        g.fillRect(0 - k, -2.4, 8, 4.8);
        metal(g, 8 - k, -2, 15, 2.6, '#2a2d33');
        metal(g, 8 - k, 0.8, 11, 1.8, '#3a3f45');
        g.fillStyle = '#1a1c1f';
        g.fillRect(12 - k, -3, 5, 6);
        g.fillStyle = '#d9a21c';
        g.fillRect(9 - k, -2.6, 1.2, 0.8);
      },
    },
    'ds-cryo-sprayer': {
      name: 'Cryo Sprayer', short: 'Cryo', slot: 4,
      desc: 'A sample-transport cryo wand from the oncology cold store, made into something worse. A short hiss of freezing mist: it stiffens whatever it touches, slows it, and makes it brittle. Hold the trigger down.',
      ammo: 'cryo', pickupAmmo: 80, pellets: 2, damage: 2.6, fireRate: 12, spread: 0.13, speed: 430, range: 185, falloff: 0.3, pierce: 1,
      projectile: 'cryo-mist', status: 'chilled', knock: 8, recoil: 0.05, kick: 0.012, sound: 'cryoHiss', casing: false,
      flash: ICE, flashRadius: 60, flashSize: 8, sparks: 0, muzzle: 15, length: 14,
      drawHeld(g, p, k) {
        // a white canister with a blue band, and a long nozzle
        g.fillStyle = '#e8ecee';
        G.roundRect(g, 0 - k, -3.2, 9, 6.4, 2.4);
        g.fill();
        g.fillStyle = '#3a7aa0';
        g.fillRect(3 - k, -3.2, 1.6, 6.4);
        metal(g, 9 - k, -1.1, 7, 2.2, '#8a9198');
        g.fillStyle = '#2a2e33';
        g.fillRect(15 - k, -1.5, 2, 3);
      },
    },
  };

  const projectiles = {
    // a puff of freezing mist: it spreads as it goes and fades out at the end of its range
    'cryo-mist': {
      radius: 4, color: ICE, wallSparks: 0, quiet: true,
      draw(g, p) {
        const k = Math.min(1, p.traveled / (p.range || 180));
        g.fillStyle = 'rgba(220,245,255,' + (0.32 * (1 - k)) + ')';
        g.beginPath();
        g.arc(p.x, p.y, 3 + k * 9, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, p) {
        const k = Math.min(1, p.traveled / (p.range || 180));
        G.glow(g, p.x, p.y, 8 + k * 10, ICE, 0.32 * (1 - k));
      },
    },
  };

  const statuses = {
    sedated: { name: 'Sedated', seconds: 2.5, speedMul: 0.6, color: '#a8c8ff', only: 'player' },
    chilled: { name: 'Chilled', seconds: 2, speedMul: 0.5, vulnerable: 0.2, color: ICE },
    staggered: { name: 'Staggered', seconds: 1.2, speedMul: 0.5, color: '#f4ece0', only: 'player' },
    held: { name: 'Held', seconds: 0.9, speedMul: 0.15, color: '#e8dccb', only: 'player' },
    snared: { name: 'Snared', seconds: 1.4, speedMul: 0.4, color: '#d8c8b4', only: 'player' },
    spores: { name: 'Spores', seconds: 1.4, dps: 5, interval: 0.5, color: '#d8e0a8', only: 'player' },
    uv: { name: 'UV burn', seconds: 0.5, dps: 12, interval: 0.25, color: '#c8a8ff', only: 'player' },
  };

  const armor = {
    'ds-security-vest': {
      name: 'Security Vest', slot: 'body', color: '#2f3a4a', trim: '#cfd5dc',
      mods: { armor: 0.1 },
      desc: 'A guard’s ballistic vest, SECURITY across the back in reflective letters. It has stopped something before: there’s a dent over the heart.',
    },
    'ds-hard-hat': {
      name: 'Hard Hat with Lamp', slot: 'head', color: '#d9a21c', trim: '#1c1c1c', lamp: true,
      mods: { lightRadius: 120, armor: 0.02 },
      desc: 'Facilities issue, with a lamp clipped to the brim. You see a long way further into the dark.',
    },
    'ds-hazmat-hood': {
      name: 'Hazmat Hood', slot: 'head', color: '#e0c040', trim: '#2a2e33',
      mods: { armor: 0.03 }, resist: { spores: 1 },
      desc: 'A yellow hood with a clear visor and a filter on a hose. Spores can’t get at you in it. There’s no lamp, and your own breathing is very loud.',
    },
    'ds-ruiz-badge': {
      name: 'Ruiz’s Badge', slot: 'trinket', color: '#c9a046', trim: '#2f3a4a',
      mods: { maxShield: 25, shieldRegen: 4 },
      desc: 'D. RUIZ · SECURITY · NIGHTS · ON SHIFT 02:14. His badge, his photo, his lanyard with a cartoon bull on it. Armory access is printed on the back. Holding on to it makes you feel steadier, and it seems to work.',
    },
  };

  const heal = (amount) =>
    function (it, game) {
      const P = game.player;
      if (P.hp >= P.stats().maxHp) return false;
      LM.combat.heal(game, P, it.props.heal || amount);
      LM.audio.play('heal');
      game.toast('+' + (it.props.heal || amount) + ' health', 'good');
    };
  const items = {
    'ds-medgel': {
      name: 'Med-gel', radius: 6, shadowScale: 0.6, bob: true, dressing: false,
      onTouch: heal(30),
      draw(g) {
        g.fillStyle = 'rgba(200,240,235,0.55)';
        G.roundRect(g, -4, -5.5, 8, 11, 2.5);
        g.fill();
        g.fillStyle = '#4ad0b0';
        G.roundRect(g, -3.2, -3, 6.4, 7, 2);
        g.fill();
        g.fillStyle = '#e8ecef';
        g.fillRect(-1.5, -7, 3, 2);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, '#4ad0b0', 0.3 + 0.1 * Math.sin(t * 3));
      },
    },
    'ammo-cryo': {
      name: 'Cryo canister', radius: 7, shadowScale: 0.7, dressing: false,
      onTouch(it, game) {
        const P = game.player;
        if ((P.ammo.cryo || 0) >= P.ammoMax('cryo')) return false;
        const got = P.addAmmo('cryo', it.props.amount || 40);
        LM.audio.play('pickup');
        game.particles.add({ type: 'text', x: it.x, y: it.y - 10, vy: -30, drag: 2, life: 0.8, text: '+' + got + ' cryo', color: '#dff4ff', size: 7 });
      },
      draw(g) {
        g.fillStyle = '#16181b';
        G.roundRect(g, -4.5, -7, 9, 14, 3);
        g.fill();
        g.fillStyle = '#e8ecee';
        G.roundRect(g, -3.8, -6.3, 7.6, 12.6, 2.6);
        g.fill();
        g.fillStyle = '#3a7aa0';
        g.fillRect(-3.8, -1, 7.6, 2);
        g.fillStyle = '#8a9198';
        g.fillRect(-1.5, -8, 3, 2);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 11, ICE, 0.25 + 0.08 * Math.sin(t * 3));
      },
    },
    'ds-trauma-kit': {
      name: 'Trauma kit', radius: 8, shadowScale: 0.8, dressing: false,
      onTouch: heal(70),
      draw(g) {
        g.fillStyle = '#d8dcdf';
        G.roundRect(g, -8, -6, 16, 12, 2);
        g.fill();
        g.fillStyle = '#c8302a';
        g.fillRect(-1.6, -4.5, 3.2, 9);
        g.fillRect(-4.5, -1.6, 9, 3.2);
        g.fillStyle = '#5a5e64';
        g.fillRect(-3, -7, 6, 1.6);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 16, '#ff6a5a', 0.22 + 0.08 * Math.sin(t * 3));
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('cryoHiss', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 5200, dur: 0.11, gain: 0.07, attack: 0.01 });
      kit.noise(t, o, { type: 'bandpass', freq: 1400, dur: 0.08, gain: 0.03, q: 0.7 });
    });
    LM.audio.define('boltDriver', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 1800, freqEnd: 600, dur: 0.09, gain: 0.22, q: 1.2 });
      kit.tone(t, o, { type: 'square', f0: 180, f1: 70, dur: 0.07, gain: 0.08 });
      kit.noise(t + 0.03, o, { type: 'highpass', freq: 4000, dur: 0.12, gain: 0.05 });
    });
  }

  LM.definePack({ id: 'ds-arsenal', name: 'Arsenal', version: '0.2.0', weapons, projectiles, armor, items, statuses });
})();
