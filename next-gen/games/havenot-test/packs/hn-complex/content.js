/* HaveNot test floor — packs/hn-complex/content.js
 * Everything the Sunken Installation needs that Core doesn't have: its tile set, statuses,
 * pog blessings, eight monsters from the HaveNot bestiary, and the installation's fixtures and loot.
 *
 * Monsters (bestiary inspiration in brackets):
 *   hn-roach      Gladiator Roach: packs that drop from the ceiling             (swarmer)
 *   hn-knife      Knife Fighter: a flying ball of blades and insults            (swarmer, flying)
 *   hn-glorexx    Glorexx tube monster: leaps out of stasis, taser bite          (chaser + charge)
 *   hn-maintbot   Weaponized Maintenance Robot: slow, heavy wrench               (chaser, robot)
 *   hn-monoid     Monoid: lazy one-eyed gambler with an eye beam                 (skirmisher, robot)
 *   hn-toad       Bombast Toad: two heads, glows as it charges a plasma belch    (lobber)
 *   hn-wasp       Sparkle-Vos Wasp: drawn to credits, bursts into them           (skirmisher, flying)
 *   hn-drone      Heavy Security Drone: scatter-blaster, launches Knife Fighters (boss)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);

  // ------------------------------------------------------------ drawing helpers
  // enemy drawGlow runs in world space; draw runs in the enemy's local space
  function eyeGlow(g, e, color, spread, fwd, size) {
    const a = e.facing;
    for (const s of spread ? [-1, 1] : [0]) {
      const x = e.x + Math.cos(a) * fwd + Math.cos(a + Math.PI / 2) * spread * s;
      const y = e.y + Math.sin(a) * fwd + Math.sin(a + Math.PI / 2) * spread * s;
      G.glow(g, x, y, size * 3, color, 0.75);
      G.circle(g, x, y, size * 0.6, '#ffffff');
    }
  }
  const lunge = (e) => (e.atk && e.atk.lunge ? e.atk.lunge * 4 : 0);
  const ell = (g, x, y, rx, ry, c, rot) => {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot || 0, 0, U.TAU);
    g.fill();
  };

  // ------------------------------------------------------------ tile set
  const environments = {
    'hn-complex': {
      name: 'HaveNot Installation',
      voidColor: '#050404',
      ambient: '#1e1c1c',
      attractAmbient: '#3a3430',
      outsideSight: '#2e2a28',
      playerLight: '#ffe6c4',
      torch: '#ffb35a',
      // sun-bleached, ash-dusted deck plates; grating over the dark for room floors
      floor: { style: 'plates', colors: ['#56524c', '#4f4b46', '#5b5750'], seam: '#1c1a18', rivet: '#8c867a', rust: '#7a4a2a', stripe: ['#e0a830', '#141210'] },
      floorAlt: { style: 'grate', bar: '#3a3834', under: '#0a0806', heat: '#2affb0' },
      wall: { style: 'bulkhead', top: ['#3e3b38', '#393633', '#44403c'], seam: '#1a1816', bolt: '#7a746a', rust: '#7a3f20', edge: '#8a847a', face: '#24211e', stripe: ['#e0a830', '#141210'] },
      water: { deep: '#0b2a2a', shallow: '#1a5550', foam: '#9ff2d8' },
      pit: { core: '#020202', wall: '#1a1816', rim: '#3a3632' },
      door: { panel: '#4a4640', frame: '#1c1a18', trim: '#e0a830' },
      particles: { type: 'mote', color: '#cfc6b8', rate: 7, alpha: 0.3, drift: 4 },
      ambience: { base: 44, cutoff: 260, wind: 420, gain: 0.05, wave: 'triangle' },
    },
  };

  const statuses = {
    'hn-tased': { name: 'Tased', seconds: 1.2, speedMul: 0.45, color: '#7ad8ff', only: 'player' },
    'hn-irradiated': { name: 'Irradiated', seconds: 3, dps: 4, interval: 0.5, color: '#b8ff4a', only: 'player' },
  };

  // Pogs: karmic tokens that bind to you. Each kind stacks.
  const blessings = {
    'pog-turtle': { name: 'Pog: Turtle', mods: { armor: 0.05 }, desc: 'A pog with a cartoon turtle on it. Blows land softer.', stack: 4 },
    'pog-fist': { name: 'Pog: Big Fist', mods: { damageMul: 0.08 }, desc: 'A pog with a fist on it. Every hit bites a little deeper.', stack: 4 },
    'pog-heart': { name: 'Pog: Heart', mods: { maxHp: 12 }, desc: 'A pog with a lopsided heart. You feel sturdier.', stack: 4 },
    'pog-sprint': { name: 'Pog: Sneaker', mods: { speed: 10 }, desc: 'A pog with a winged sneaker. Your stride lengthens.', stack: 4 },
  };
  const POGS = Object.keys(blessings);
  const POG_COLORS = { 'pog-turtle': '#4ad89a', 'pog-fist': '#ff6a4a', 'pog-heart': '#ff4a9a', 'pog-sprint': '#4ab8ff' };

  function bindPog(game, id) {
    const P = game.player, b = blessings[id];
    if (P.blessings.filter((x) => x === id).length >= b.stack) {
      game.grant({ type: 'gold', amount: 40 });
      game.toast(b.name + ' won’t stack any higher. You pocket it for 40 credits.', 'good');
      return;
    }
    P.blessings.push(id);
    P.statsDirty = true;
    LM.audio.play('heal');
    game.toast(b.name + ' binds to you. ' + b.desc.split('. ').slice(1).join('. '), 'good');
  }

  // ------------------------------------------------------------ monsters
  const enemies = {
    'hn-roach': {
      name: 'Gladiator Roach', hp: 14, speed: 176, radius: 7, ai: 'swarmer', sight: 360, accel: 14, turn: 16, color: '#5a3a1e',
      blood: '#c8b24a', gib: '#3a2412',
      attacks: [{ type: 'melee', damage: 5, range: 8, windup: 0.14, cooldown: 0.55, recover: 0.2, knock: 50 }],
      drops: { gold: [1, 4], goldChance: 0.4 },
      draw(g, e) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        const step = Math.sin(e.t * 24);
        g.strokeStyle = '#2a1a0c';
        g.lineWidth = 1.1;
        for (let i = 0; i < 3; i++) {
          const ox = -4 + i * 3.5, w = (i % 2 ? step : -step) * 1.8;
          g.beginPath();
          g.moveTo(ox, -3); g.lineTo(ox + w, -9);
          g.moveTo(ox, 3); g.lineTo(ox - w, 9);
          g.stroke();
        }
        g.beginPath(); // antennae
        g.moveTo(5, -1.5); g.quadraticCurveTo(10, -4, 13, -7 + step);
        g.moveTo(5, 1.5); g.quadraticCurveTo(10, 4, 13, 7 - step);
        g.stroke();
        ell(g, -1, 0, 7.5, 5.2, '#3a2412');
        ell(g, -1, 0, 6.5, 4.4, '#6a4424');
        g.fillStyle = '#8a6036'; // armour plates
        g.fillRect(-5, -0.6, 9, 1.2);
        g.fillRect(-2, -4, 1, 8);
        ell(g, 5, 0, 2.6, 2.4, '#4a2e16');
      },
      drawGlow(g, e) { eyeGlow(g, e, '#ffcf4a', 1.2, 5.5, 0.6); },
    },
    'hn-knife': {
      name: 'Knife Fighter', hp: 18, speed: 205, radius: 7, ai: 'swarmer', sight: 400, accel: 12, turn: 14, flying: true, robot: true, color: '#3a3e46',
      blood: '#ffcf6a', gib: '#5a5e66', deathSound: 'explode',
      attacks: [{ type: 'melee', damage: 7, range: 10, windup: 0.12, cooldown: 0.5, recover: 0.15, knock: 40 }],
      drops: { gold: [2, 6], goldChance: 0.5, items: [{ id: 'ammo-cells', chance: 0.12 }] },
      draw(g, e) {
        const spin = e.t * 18;
        g.save();
        g.rotate(spin);
        g.fillStyle = '#c8ccd4';
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(0, s * 5); g.lineTo(s * 3, s * 13); g.lineTo(-s * 1.5, s * 11);
          g.closePath();
          g.fill();
        }
        g.restore();
        G.circle(g, 0, 0, 6.2, '#22252b');
        G.circle(g, 0, 0, 5.2, '#4a4f58');
        g.rotate(e.facing);
        g.fillStyle = '#100808';
        g.fillRect(1, -3, 4, 6);
      },
      drawGlow(g, e, t) {
        // the insult display
        const x = e.x + Math.cos(e.facing) * 3, y = e.y + Math.sin(e.facing) * 3;
        G.glow(g, x, y, 9, '#ff3a3a', 0.55 + 0.25 * Math.sin(t * 13));
      },
    },
    'hn-glorexx': {
      name: 'Glorexx Tube Monster', hp: 48, speed: 128, radius: 10, ai: 'chaser', sight: 420, color: '#7a8a3a',
      blood: '#9adf3a', gib: '#4a5a1a', bark: 'enemyShot',
      attacks: [
        { type: 'charge', damage: 14, speed: 470, duration: 0.4, windup: 0.45, cooldown: 3.2, minRange: 70, maxRange: 240 },
        { type: 'melee', damage: 9, range: 14, windup: 0.22, cooldown: 0.8, status: 'hn-tased' },
      ],
      drops: { gold: [4, 10], goldChance: 0.7, items: [{ id: 'hn-pog', chance: 0.25 }, { id: 'health-vial', chance: 0.15 }] },
      draw(g, e) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        // the spring tail
        g.strokeStyle = '#5a6a24';
        g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i <= 8; i++) {
          const x = -8 - i * 1.4, y = Math.sin(i * 1.6 + e.t * 10) * 2.5;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        ell(g, -1, 0, 9, 7.5, '#3e4a18');
        ell(g, 0, 0, 7.8, 6.4, '#7a8a3a');
        g.strokeStyle = '#2a3010';
        g.lineWidth = 1.4;
        const c = Math.sin(e.t * 9) * 1.5;
        g.beginPath(); // claws
        g.moveTo(5, -4); g.lineTo(12, -7 + c); g.lineTo(14, -4);
        g.moveTo(5, 4); g.lineTo(12, 7 - c); g.lineTo(14, 4);
        g.stroke();
        ell(g, 5, 0, 3.6, 3.2, '#9aa84a');
      },
      drawGlow(g, e, t) {
        eyeGlow(g, e, '#e8ff6a', 2, 6, 0.8);
        if (e.atk) G.glow(g, e.x + Math.cos(e.facing) * 8, e.y + Math.sin(e.facing) * 8, 8, '#7ad8ff', 0.5 + 0.4 * Math.sin(t * 40));
      },
    },
    'hn-maintbot': {
      name: 'Weaponized Maintenance Robot', hp: 70, speed: 62, radius: 12, mass: 2.5, armor: 0.3, ai: 'chaser', sight: 320, robot: true, color: '#c89a3a',
      blood: '#ffcf6a', gib: '#6a5a3a', deathSound: 'explode',
      attacks: [{ type: 'melee', damage: 16, range: 16, windup: 0.55, cooldown: 1.5, knock: 180 }],
      drops: { gold: [6, 14], items: [{ id: 'ammo-cells', chance: 0.6 }] },
      draw(g, e) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        g.fillStyle = '#1e1c18';
        g.fillRect(-11, -11, 20, 22);
        g.fillStyle = '#c89a3a';
        g.fillRect(-10, -10, 18, 20);
        g.fillStyle = '#141210'; // hazard stripes
        for (let i = -10; i < 8; i += 4) g.fillRect(i, -10, 2, 3);
        g.fillStyle = '#6a6458'; // wrench arm
        g.fillRect(6, 6, 10, 3);
        g.fillRect(14, 4, 4, 7);
        g.fillStyle = '#3a3630';
        g.fillRect(-4, -4, 8, 8);
      },
      drawGlow(g, e) { eyeGlow(g, e, '#ff9a2a', 0, 2, 1.3); },
    },
    'hn-monoid': {
      name: 'Monoid', hp: 44, speed: 80, radius: 10, ai: 'skirmisher', keep: [150, 280], sight: 340, robot: true, color: '#8a8f9a',
      blood: '#ffcf6a', gib: '#5a5e66', deathSound: 'explode',
      attacks: [{ type: 'ranged', projectile: 'enemy-bolt', damage: 10, speed: 360, windup: 0.7, cooldown: 2.4, range: 420, spread: 0.04, lead: 0.3, flash: '#ff4ad8' }],
      drops: { gold: [20, 45] },   // it was winning at the slot machine
      draw(g, e) {
        g.rotate(e.facing);
        G.circle(g, 0, 0, 10, '#3a3e46');
        G.circle(g, 0, 0, 9, '#8a8f9a');
        g.fillStyle = '#5a5e66';
        g.fillRect(-9, -2, 4, 4);
        G.circle(g, 4, 0, 4.5, '#1a1c20');
      },
      drawGlow(g, e, t) {
        const x = e.x + Math.cos(e.facing) * 4, y = e.y + Math.sin(e.facing) * 4;
        G.glow(g, x, y, 14, '#ff4ad8', 0.65 + 0.2 * Math.sin(t * 2));
        G.circle(g, x, y, 2.4, '#ffd8f4');
      },
    },
    'hn-toad': {
      name: 'Bombast Toad', hp: 110, speed: 48, radius: 14, mass: 3, ai: 'lobber', keep: [160, 320], sight: 380, leash: 420, color: '#6a9a2a',
      blood: '#b8ff4a', gib: '#3a5a1a',
      attacks: [{ type: 'lob', damage: 22, radius: 70, flight: 1.0, windup: 1.1, cooldown: 2.8, minRange: 90, maxRange: 380, color: '#b8ff4a', status: 'hn-irradiated' }],
      drops: { gold: [12, 24], items: [{ id: 'hn-pog', chance: 0.6 }, { id: 'medkit', chance: 0.3 }] },
      draw(g, e) {
        g.rotate(e.facing);
        const puff = e.atk ? Math.min(1, e.atk.t / 1.1) * 2.5 : Math.sin(e.t * 2) * 0.6;
        ell(g, -2, 0, 13 + puff, 14 + puff, '#2e4a12');
        ell(g, -1, 0, 11.5 + puff, 12.5 + puff, '#6a9a2a');
        for (const [x, y] of [[-6, -6], [-3, 7], [-9, 2], [2, -9]]) G.circle(g, x, y, 1.8, '#a8d84a');
        for (const s of [-1, 1]) { // two heads
          ell(g, 9, s * 6, 5, 4.2, '#4a7a1e');
          ell(g, 10, s * 6, 3.8, 3.2, '#7aaa3a');
        }
      },
      drawGlow(g, e, t) {
        // it glows brighter as it charges
        const k = e.atk ? Math.min(1, e.atk.t / 1.1) : 0;
        G.glow(g, e.x, e.y, 26 + k * 24, '#b8ff4a', 0.18 + k * 0.6 + 0.05 * Math.sin(t * 3));
        for (const s of [-1, 1]) {
          const a = e.facing, x = e.x + Math.cos(a) * 11 + Math.cos(a + Math.PI / 2) * s * 6, y = e.y + Math.sin(a) * 11 + Math.sin(a + Math.PI / 2) * s * 6;
          G.glow(g, x, y, 4, '#f4ff8a', 0.8);
        }
      },
    },
    'hn-wasp': {
      name: 'Sparkle-Vos Wasp', hp: 30, speed: 150, radius: 8, ai: 'skirmisher', keep: [60, 140], sight: 380, flying: true, color: '#e8c84a',
      blood: '#ffe68a', gib: '#e8c84a',
      attacks: [{ type: 'melee', damage: 8, range: 10, windup: 0.2, cooldown: 1.1, knock: 30 }],
      drops: { gold: [90, 130] },   // it bursts into credits
      draw(g, e) {
        g.rotate(e.facing);
        const flap = Math.sin(e.t * 50) * 0.4;
        g.fillStyle = 'rgba(230,240,255,0.45)';
        for (const s of [-1, 1]) {
          g.beginPath();
          g.ellipse(-1, s * 6, 6, 2.8, s * (0.5 + flap), 0, U.TAU);
          g.fill();
        }
        ell(g, -4, 0, 5.5, 3.4, '#1a1408');
        for (let i = -8; i < 0; i += 3) { g.fillStyle = '#e8c84a'; g.fillRect(i, -3, 1.5, 6); }
        ell(g, 3, 0, 3.2, 3, '#e8c84a');
      },
      drawGlow(g, e, t) {
        G.glow(g, e.x, e.y, 18, '#ffe68a', 0.45 + 0.15 * Math.sin(t * 7));
      },
    },
    'hn-drone': {
      name: 'Heavy Security Drone', hp: 460, speed: 58, radius: 18, mass: 6, armor: 0.3, ai: 'skirmisher', keep: [120, 260], sight: 440, leash: 2000,
      robot: true, boss: true, color: '#5a6068', blood: '#ffcf6a', gib: '#3a3e46', deathSound: 'explode',
      bossBar: {
        name: 'Heavy Security Drone', color: '#ff4a3a', range: 700,
        sub: () => 'IFF: no match',
        phases: [{ at: 0.5, text: 'DRONE: Escalating to Threat Posture Two. Thank you for your patience.' }],
      },
      attacks: [
        { type: 'summon', enemy: 'hn-knife', count: 2, max: 3, windup: 0.8, cooldown: 9 },
        { type: 'ranged', projectile: 'enemy-slug', damage: 7, speed: 380, burst: 7, burstGap: 0.03, fan: 0.9, windup: 0.6, cooldown: 2.2, range: 420, spread: 0.02, flash: '#ff6a3a' },
      ],
      drops: { gold: [120, 160], items: [{ id: 'ammo-cells', chance: 1 }, { id: 'hn-pog', chance: 1 }] },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.translate(lunge(e) * 0.5, 0);
        g.fillStyle = '#1a1c20';
        g.fillRect(-17, -18, 32, 36);
        g.fillStyle = '#5a6068';
        g.fillRect(-16, -17, 30, 34);
        g.fillStyle = '#e0a830'; // hazard band
        g.fillRect(-16, -3, 30, 6);
        g.fillStyle = '#141210';
        for (let i = -16; i < 14; i += 5) g.fillRect(i, -3, 2.5, 6);
        g.fillStyle = '#3a3e46'; // the scatter-blaster
        g.fillRect(10, -6, 14, 12);
        g.fillStyle = '#202226';
        for (const y of [-4, 0, 4]) g.fillRect(20, y - 1, 6, 2);
        g.fillStyle = '#2a2d33'; // treads
        g.fillRect(-16, -21, 28, 4);
        g.fillRect(-16, 17, 28, 4);
      },
      drawGlow(g, e, t) {
        eyeGlow(g, e, '#ff3a2a', 7, 8, 1.4);
        G.glow(g, e.x, e.y, 30, '#ff3a2a', 0.08 + 0.06 * Math.sin(t * 4));
      },
    },
  };

  // ------------------------------------------------------------ fixtures, loot, signs
  const VENDING = [
    { id: 'placebo', name: 'Placebo (chew 24)', price: 15, text: 'Restores 40 health. The packet insists it works if you believe.', use: (game) => LM.combat.heal(game, game.player, 40) },
    { id: 'hardbody', name: 'Hard Body', price: 30, text: '+40 max health for a minute. Side effects: bronze.', use: (game) => { game.player.addBuff('hn-hardbody', 'Hard Body', { maxHp: 40 }, 60); LM.combat.heal(game, game.player, 40); } },
    { id: 'embiggen', name: 'Embiggen', price: 25, text: 'Hit 30% harder, move a little slower, for a minute.', use: (game) => game.player.addBuff('hn-embiggen', 'Embiggen', { damageMul: 0.3, speed: -24 }, 60) },
  ];

  function vendingPopup(game, it) {
    const P = game.player;
    LM.ui.open({
      kicker: 'Wellness Dispensary',
      title: it.props.title || 'PILLZ 4 U',
      body: h('div', null,
        h('p', { class: 'lore' }, it.props.text || 'A cheerful voice, very old: “Feeling unproductive? There’s a pill for that!” Most of the slots are empty. Three still light up.'),
        h('p', { class: 'muted' }, 'You have ' + P.gold + ' credits.'),
        h('ul', null, VENDING.map((v) => h('li', null, h('strong', null, v.name + ' · ' + v.price + 'c'), ' ', h('span', { class: 'muted' }, v.text))))),
      actions: VENDING.map((v) => ({
        label: v.name + ' (' + v.price + 'c)', disabled: P.gold < v.price,
        onClick: () => {
          P.gold -= v.price;
          v.use(game);
          LM.audio.play('coin');
          game.toast('The machine dispenses ' + v.name + '. “Enjoy responsibly!”', 'good');
        },
      })).concat([{ label: 'Walk away', quiet: true, key: 'E' }]),
    });
  }

  const SODA_ANSWERS = ['Yes.', 'No.', 'Mu.', 'Mu.', 'Yes, but not the way you mean.', 'No, and stop asking.'];

  function wallSign(g, it, w, hgt) {
    const a = Math.atan2(it.face.y, it.face.x);
    g.rotate(a - Math.PI / 2);
    g.translate(0, -2);
    g.fillStyle = '#121010';
    g.fillRect(-w / 2 - 1, -hgt / 2 - 1, w + 2, hgt + 2);
  }

  const items = {
    'hn-trap-light': {
      name: 'TRAP light', radius: 5, wallMounted: true, shadow: false,
      light: { color: '#ff3a2a', radius: 80, intensity: 0.5, flicker: 0.08 },
      interact: {
        prompt: 'Read the light',
        use: (it, game) => LM.ui.showText('TRAP', it.props.text || 'An Age of Wonder courtesy light. By law, the doors here must tell you when they are trapped. They are.', 'Courtesy notice'),
      },
      draw(g, it) {
        wallSign(g, it, 16, 7);
        g.fillStyle = '#4a0e0a';
        g.fillRect(-8, -3.5, 16, 7);
      },
      drawGlow(g, it, t) {
        const a = Math.atan2(it.face.y, it.face.x);
        g.rotate(a - Math.PI / 2);
        g.translate(0, -2);
        const on = Math.sin(t * 5) > -0.6;
        G.glow(g, 0, 0, 14, '#ff3a2a', on ? 0.8 : 0.25);
        g.fillStyle = on ? '#ffd0c0' : '#7a2a20';
        g.font = 'bold 5px monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('TRAP', 0, 0.3);
      },
    },
    'hn-stasis-tube': {
      name: 'Stasis tube', radius: 7, wallMounted: true, shadow: false, mapColor: '#2affb0',
      light: { color: '#2affb0', radius: 90, intensity: 0.45, flicker: 0.04 },
      init(it) { it.seed = U.hash2 ? U.hash2(it.x | 0, it.y | 0) : 0.5; },
      draw(g, it, t) {
        const a = Math.atan2(it.face.y, it.face.x);
        g.rotate(a - Math.PI / 2);
        g.fillStyle = '#1a1c1e';
        g.fillRect(-9, -9, 18, 12);
        g.fillStyle = 'rgba(42,255,176,0.18)';
        g.fillRect(-7, -7, 14, 10);
        // a sleeping silhouette in the fluid
        g.fillStyle = 'rgba(10,20,14,0.85)';
        g.beginPath();
        g.ellipse(0, -2, 3.2, 4.2, 0, 0, U.TAU);
        g.fill();
        g.fillRect(-1, -8, 2, 3);
      },
      drawGlow(g, it, t) {
        const a = Math.atan2(it.face.y, it.face.x);
        g.rotate(a - Math.PI / 2);
        G.glow(g, 0, -2, 14, '#2affb0', 0.35 + 0.12 * Math.sin(t * 1.3 + (it.seed || 0) * 9));
        const b = ((t * 0.6 + (it.seed || 0)) % 1) * 9;  // rising bubbles
        G.circle(g, -2, 2 - b, 0.7, 'rgba(200,255,230,0.8)');
        G.circle(g, 2.5, 3 - ((b + 4) % 9), 0.5, 'rgba(200,255,230,0.8)');
      },
    },
    'hn-poster': {
      name: 'Motivational poster', radius: 6, wallMounted: true, shadow: false,
      interact: {
        prompt: 'Read the poster',
        use: (it, game) => LM.ui.showText(it.props.title || 'SYNERGY', it.props.text || 'A smiling worker shakes hands with a robot. Someone has drawn teeth on both of them.', 'Poster'),
      },
      draw(g, it) {
        wallSign(g, it, 14, 10);
        g.fillStyle = it.props.color || '#2a4a6a';
        g.fillRect(-7, -5, 14, 10);
        g.fillStyle = '#f0d8a0';
        g.fillRect(-5, 2, 10, 1.4);
        G.circle(g, 0, -1.5, 2.4, '#f0d8a0');
      },
    },
    'hn-vending': {
      name: 'Pill vending machine', radius: 12, solid: true, mapColor: '#ff4ad8',
      light: { color: '#ff4ad8', radius: 100, intensity: 0.5, flicker: 0.1 },
      init(it) { it.box = [24, 16]; },
      interact: { prompt: 'Browse the pills', use: (it, game) => vendingPopup(game, it) },
      draw(g) {
        g.fillStyle = '#141216';
        g.fillRect(-13, -9, 26, 18);
        g.fillStyle = '#5a2a5a';
        g.fillRect(-12, -8, 24, 16);
        g.fillStyle = '#1a0a1a';
        g.fillRect(-10, -6, 14, 12);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) G.circle(g, -7.5 + i * 4.5, -3.5 + j * 4, 1.2, ['#ff4a4a', '#4ad8ff', '#ffe04a'][(i + j) % 3]);
        g.fillStyle = '#3a3a40';
        g.fillRect(6, -6, 4, 12);
      },
      drawGlow(g, it, t) {
        G.glow(g, -3, 0, 16, '#ff4ad8', 0.35 + 0.1 * Math.sin(t * 2.3));
      },
    },
    'hn-pog': {
      name: 'Pog', radius: 6, bob: true, shadowScale: 0.5, mapColor: '#ffe04a',
      init(it) { it.kind = it.props.kind || POGS[Math.floor(Math.random() * POGS.length)]; },
      onTouch(it, game) { bindPog(game, it.kind); },
      draw(g, it) {
        G.circle(g, 0, 0, 5.4, '#141210');
        G.circle(g, 0, 0, 4.6, '#f0e0b0');
        G.circle(g, 0, 0, 3.2, POG_COLORS[it.kind] || '#ffe04a');
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, POG_COLORS[it.kind] || '#ffe04a', 0.35 + 0.15 * Math.sin(t * 3));
      },
    },
    'hn-vert-soda': {
      name: 'Vert Soda', radius: 6, mapColor: '#9dff3a',
      init(it) { it.drunk = false; },
      interact: {
        available: (it) => !it.drunk,
        prompt: 'Pick up the Vert Soda',
        use(it, game) {
          LM.ui.open({
            kicker: 'Age of Wonder novelty beverage',
            title: 'Vert Soda',
            body: h('div', null,
              h('p', { class: 'lore' }, 'A can shaped like a grenade, still cold. The label says one sip lets you ask the universe a single yes-or-no question. The small print says the universe is not obliged to be helpful.')),
            actions: [
              {
                label: 'Drink it and ask: “Will I get out of here?”', primary: true, key: 'E',
                onClick: () => {
                  it.drunk = true;
                  LM.combat.heal(game, game.player, 15);
                  const ans = SODA_ANSWERS[Math.floor(Math.random() * SODA_ANSWERS.length)];
                  game.toast('A vast, bored voice answers: “' + ans + '”', 'key');
                  it.remove(game);
                },
              },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        ell(g, 0, 0, 4.6, 5.8, '#1a2a0a');
        ell(g, 0, 0, 3.8, 5, '#6ac82a');
        g.fillStyle = '#c8c8c0';
        g.fillRect(-1.5, -7.5, 3, 2.5);
        g.fillStyle = '#2a4a10';
        for (const y of [-2, 1, 4]) g.fillRect(-3.8, y, 7.6, 0.8);
      },
      drawGlow(g, it, t) { G.glow(g, 0, 0, 10, '#9dff3a', 0.3 + 0.1 * Math.sin(t * 2)); },
    },
    'hn-hoard': {
      name: 'Warlord’s hoard', radius: 10, solid: true, mapColor: '#f2c96b', mapAlways: true,
      light: { color: '#f2c96b', radius: 150, intensity: 0.6, flicker: 0.03 },
      interact: {
        prompt: 'Look at the hoard',
        use(it, game) {
          LM.ui.open({
            kicker: 'Tomb of a minor warlord',
            title: 'The Hoard of Sub-Commander Vell',
            body: h('div', null,
              h('p', { class: 'lore' }, 'A plinth of polished credit-chips, a bowl of pogs, and a brass plate: HERE LIES SUB-COMMANDER VELL, WHO WAS NEVER WRONG. RESPECT HIS REST. The plinth sits on a pressure seal.'),
              h('p', { class: 'muted' }, '250 credits and two pogs.')),
            actions: [
              {
                label: 'Take it', primary: true, key: 'E',
                onClick: () => {
                  game.grant({ type: 'gold', amount: 250 });
                  bindPog(game, POGS[Math.floor(Math.random() * POGS.length)]);
                  bindPog(game, POGS[Math.floor(Math.random() * POGS.length)]);
                  it.remove(game);
                  if (it.tag) game.triggerEvent('pickup', it.tag);
                },
              },
              { label: 'Show respect and leave it', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#1a1612';
        g.fillRect(-12, -9, 24, 18);
        g.fillStyle = '#4a4238';
        g.fillRect(-11, -8, 22, 16);
        g.fillStyle = '#c99a3a';
        for (let i = 0; i < 6; i++) g.fillRect(-9 + i * 3, -4 - (i % 2), 2.4, 7);
        G.circle(g, 6, 3, 3.4, '#2a2420');
        for (const [x, y, c] of [[5, 2, '#4ad89a'], [7, 3.5, '#ff6a4a'], [6, 4.5, '#4ab8ff']]) G.circle(g, x, y, 1.2, c);
      },
      drawGlow(g, it, t) { G.glow(g, 0, -2, 22, '#f2c96b', 0.45 + 0.15 * Math.sin(t * 2)); },
    },
  };

  LM.definePack({ id: 'hn-complex', name: 'HaveNot Complex', version: '0.1.0', environments, statuses, blessings, enemies, items });
})();
