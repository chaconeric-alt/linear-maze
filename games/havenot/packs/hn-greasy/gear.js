/* HaveNot — packs/hn-greasy/gear.js
 * What the Greasy Bolt Hole hands out, and how slime works.
 *
 *   Slime (damageType 'slime'): Enoch the Greasy’s whole doctrine. Robots are not immune to it (it gums
 *   them up); filter masks don’t stop it (it’s on your skin, not in your lungs). Statuses:
 *     hn-grimed     a coat of toxic goop: slowed, and it eats at you (turret globs, slime puddles)
 *     hn-drenched   the ceiling goop traps: a bucketful of it
 *     hn-greased    an enemy the Grease Thrower has coated: slowed, and it builds up (below)
 *   Grease stacks: every Grease Thrower glob that lands adds a stack (up to 10) to an enemy; twice a second the
 *   stacks burn for 1 damage each (through armor), and they wear off two at a time once you stop spraying.
 *
 *   Weapons (Level 3, the upper bunker’s armory and the works): the Soot-Line Carbine, the Fouler Riot Gun, and
 *   the Grease Thrower (heavy: you crawl while it’s in your hands; it eats Grease from the vats).
 *   Throwables on T (the satchel picks which one is ready): Slime Grenades (a blast and a toxic puddle that the
 *   label swears wears off quickly) and Egg Grenades (Level 4, very few of them).
 *   Pickled eggs, thrown, make every Eggbot nearby stop and hold a horrified vigil.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const HN = LM.HN;

  LM.defineAmmo('grease', { name: 'Grease', max: 240, amount: 60, color: '#3a3418', band: '#c8d04a' });

  const metal = (g, x, y, w, hh, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, hh);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(x, y, w, Math.max(0.8, hh * 0.25));
  };

  // ------------------------------------------------------------ statuses
  const statuses = {
    'hn-grimed': { name: 'Grimed', seconds: 3, dps: 4, interval: 0.5, speedMul: 0.8, color: '#a8b03a', damageType: 'slime' },
    'hn-drenched': { name: 'Drenched in goop', seconds: 6, dps: 5, interval: 0.5, speedMul: 0.55, color: '#8a9a2a', damageType: 'slime', only: 'player' },
    'hn-greased': { name: 'Greased', seconds: 3, speedMul: 0.6, color: '#c8d04a', hud: false },
    'hn-mourning': { name: 'Holding a vigil', seconds: 7, stun: true, color: '#f0e0a0', hud: false, only: 'robot' },
    'hn-preening': { name: 'Preening', seconds: 8, stun: true, color: '#ff9ad8', hud: false, only: 'robot' },
    'hn-tk-dazed': { name: 'Telekinetic jolt', seconds: 0.8, speedMul: 0.5, color: '#d8a0ff', only: 'player' },
  };

  // ------------------------------------------------------------ projectiles
  const projectiles = {
    'hn-grease-glob': {
      radius: 3.4, quiet: true,
      draw(g, p) {
        G.circle(g, p.x, p.y, 3.4, '#2a2810');
        G.circle(g, p.x - 0.8, p.y - 0.8, 2.2, '#8a8a2a');
      },
      drawGlow(g, p) { G.glow(g, p.x, p.y, 7, '#c8d04a', 0.35); },
    },
    'hn-slime-glob': {
      radius: 3.2, quiet: true, damageType: 'slime', color: '#a8c83a',
      draw(g, p) {
        G.circle(g, p.x, p.y, 3.4, '#3a4010');
        G.circle(g, p.x - 0.7, p.y - 0.7, 2.4, '#a8c83a');
      },
      drawGlow(g, p) { G.glow(g, p.x, p.y, 9, '#b8e84a', 0.5); },
    },
    'hn-tk': {
      radius: 4, quiet: true,
      drawGlow(g, p, t) {
        const a = Math.atan2(p.vy, p.vx);
        g.strokeStyle = 'rgba(210,160,255,0.75)';
        g.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.arc(p.x - Math.cos(a) * i * 5, p.y - Math.sin(a) * i * 5, 5 + i * 1.5, a - 0.9, a + 0.9);
          g.stroke();
        }
        G.glow(g, p.x, p.y, 10, '#c88aff', 0.35);
      },
    },
    'hn-death-ray': {
      radius: 2.6, color: '#ff4ab8', tracer: 30, width: 2.2, glow: 12, wallSparks: 5, sparkColor: '#ffb0e8',
      light: { r: 70, color: '#ff4ab8', intensity: 0.6 },
    },
    'hn-slime-nade': {
      radius: 4,
      draw(g, p) {
        G.circle(g, p.x, p.y, 4.2, '#1a1c0c');
        G.circle(g, p.x, p.y, 3.4, '#6a7a1a');
        g.fillStyle = '#e0e070';
        g.fillRect(p.x - 3, p.y - 0.6, 6, 1.2);
      },
      drawGlow(g, p) { G.glow(g, p.x, p.y, 10, '#c8e84a', 0.45); },
    },
    'hn-egg-nade': {
      radius: 4,
      draw(g, p) {
        g.fillStyle = '#f4ecd8';
        g.beginPath();
        g.ellipse(p.x, p.y, 3.4, 4.4, p.age * 9, 0, U.TAU);
        g.fill();
        g.fillStyle = '#141210';
        g.fillRect(p.x - 2.4, p.y - 3.4, 4.8, 1.4);
      },
      drawGlow(g, p) { G.glow(g, p.x, p.y, 12, '#ffe68a', 0.5); },
    },
  };

  // ------------------------------------------------------------ weapons (Level 3)
  const weapons = {
    'hn-soot-carbine': {
      name: 'Soot-Line Carbine', short: 'Carbine', slot: 3, hnLevel: 3,
      desc: 'Enoch’s line-trooper rifle. A blackened receiver that has never been cleaned, on principle. Twenty-four rounds a magazine, quick and steady, and every shot coughs a little soot back at you.',
      ammo: 'rounds', pickupAmmo: 72, magazine: 24, reloadTime: 2.2, damage: 15, fireRate: 7.5, spread: 0.045, bloom: 0.02, speed: 1150, range: 780,
      projectile: 'bullet', knock: 40, recoil: 0.22, kick: 0.05, sound: 'smg', casing: '#b8a070', flash: '#ffd08a', flashRadius: 100, smoke: true, muzzle: 22, length: 20,
      drawHeld(g, p, k) {
        metal(g, 2 - k, -2.4, 18, 4.8, '#22201a');
        g.fillStyle = '#5a4a2a';
        g.fillRect(-2 - k, -1.6, 6, 3.6);
        g.fillStyle = '#121008';
        g.fillRect(8 - k, 2.2, 3, 4);
        g.fillStyle = '#6a6a2a';
        g.fillRect(12 - k, -3.2, 5, 1);
      },
    },
    'hn-fouler': {
      name: 'Fouler Riot Gun', short: 'Fouler', slot: 2, hnLevel: 3,
      desc: 'A drum-fed riot gun from the Greasy quartermaster. Six fat shells a drum, eight pellets a shell, each pellet rolled in grease “for adhesion.” Murder up close.',
      ammo: 'shells', pickupAmmo: 18, magazine: 6, reloadTime: 2.2, pellets: 8, damage: 11.5, fireRate: 1.6, spread: 0.19, speed: 840, range: 310, falloff: 0.55,
      projectile: 'pellet', knock: 85, recoil: 1.0, kick: 0.24, pushback: 80, sound: 'scatter', casing: '#6a5a2a', smoke: true,
      flash: '#ffc070', flashRadius: 170, flashSize: 28, sparks: 7, muzzle: 22, length: 20, kickBack: 6,
      drawHeld(g, p, k) {
        g.fillStyle = '#3a2a14';
        g.fillRect(0 - k, -2.4, 7, 4.8);
        metal(g, 7 - k, -2.6, 15, 5.2, '#2a2820');
        G.circle(g, 11 - k, 3.2, 3, '#4a4224');
        g.fillStyle = '#c8d04a';
        g.fillRect(18 - k, -3, 2, 1);
      },
    },
    'hn-grease-thrower': {
      name: 'Grease Thrower', short: 'Grease', slot: 5, hnLevel: 3, hnHeavy: true,
      desc: 'A Grease Monkey’s back-tank and hose. It hurls gouts of toxic Grease Slime that coat whatever they hit, and the coat keeps eating: the longer you hose something, the faster it dies. It is also very heavy: with it in your hands you waddle (switch weapons to set it on your back). Refill it at the grease vats.',
      ammo: 'grease', pickupAmmo: 120, damage: 5, fireRate: 12, spread: 0.17, bloom: 0.01, speed: 430, range: 235, falloff: 0.2,
      projectile: 'hn-grease-glob', damageType: 'slime', status: { id: 'hn-greased', seconds: 3 }, knock: 8, recoil: 0.1, kick: 0.02, sound: 'smg',
      flash: '#c8d04a', flashRadius: 80, flashSize: 10, muzzle: 22, length: 22,
      drawHeld(g, p, k) {
        metal(g, 2 - k, -2.8, 16, 5.6, '#3a3418');
        g.fillStyle = '#6a6a24';
        g.fillRect(14 - k, -2, 8, 4);
        g.fillStyle = '#c8d04a';
        g.fillRect(19 - k, -1, 3, 2);
        g.strokeStyle = '#2a2410';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(3 - k, 2.8);
        g.quadraticCurveTo(-4, 9, -8, 4);
        g.stroke();
      },
    },
  };
  Object.assign(HN.WEAPON_VALUE, { 'hn-soot-carbine': 5200, 'hn-fouler': 4800, 'hn-grease-thrower': 6000 });

  // ------------------------------------------------------------ armor (Level 3)
  const armor = {
    'hn-sootcoat': {
      name: 'Grime Trooper’s Soot-Coat', slot: 'body', color: '#2a2618', trim: '#8a8a2a', hnLevel: 3,
      mods: { armor: 0.32, speed: -5 }, takes: { slime: 0.6 },
      desc: 'Layered canvas and plate, waxed with three centuries of grease. Turns a third of every hit, and slime rolls off it. It smells exactly like you think.',
    },
    'hn-slickmail': {
      name: 'Enoch’s Slick-Mail', slot: 'body', color: '#3a3410', trim: '#e8d84a', hnLevel: 3,
      mods: { armor: 0.4, speed: -4 }, takes: { slime: 0.2, toxic: 0.5 }, resist: { 'hn-grimed': 0.5, 'hn-drenched': 0.5 },
      desc: 'The Greasing Throne’s prize: chain mail that has been dipped so many times it is more grease than metal. It takes forty percent off every hit, and goop barely touches you. Enoch wore a set to every battle and to bed.',
    },
    'hn-egg-mask': {
      name: 'Egg-Mask', slot: 'head', color: '#f0e8d4', trim: '#141210', hnLevel: 3, hnEggMask: true,
      mods: { armor: 0.05 },
      desc: 'A smooth white ovoid face-mask with a little black beret printed on the brow. Eggbots read it as the face of a willing servant: while you wear it they won’t start a fight with you (they will finish one). They intend to execute you eventually. For now you are an EGG-SLENT servant.',
    },
  };
  Object.assign(HN.ARMOR_VALUE, { 'hn-sootcoat': 4200, 'hn-slickmail': 6500, 'hn-egg-mask': 900 });

  // ------------------------------------------------------------ the satchel catalog
  const ico = (glyph, color) => ({ glyph, color });
  HN.defineItems({
    'hn-slime-grenade': {
      name: 'Slime Grenade', cat: 'Expendable', era: 'Age of War', value: 70, icon: ico('S', '#a8c83a'), consumable: false,
      desc: 'Greasy ordnance. It bursts, and leaves the floor coated in toxic slime that eats anything standing in it (robots too). The stencil on the side: TOXIN DISSIPATES RAPIDLY*. The asterisk is not explained. Thrown with T.',
      throwLabel: 'Ready it for T', throw: (game) => HN.readySpecial(game, 'hn-slime-grenade'),
    },
    'hn-egg-grenade': {
      name: 'Egg Grenade', cat: 'Expendable', era: 'Age of War', value: 300, rarity: 'rare', icon: ico('◯', '#f4ecd8'), consumable: false,
      desc: 'An Eggbot munition: a perfect white ovoid that cracks open into a telekinetic blast. Level 4 ordnance, and the most powerful thing you can throw. Eggbots consider it a sacrament. Thrown with T.',
      throwLabel: 'Ready it for T', throw: (game) => HN.readySpecial(game, 'hn-egg-grenade'),
    },
    'hn-pickled-eggs': {
      name: 'Jar of pickled eggs', cat: 'Oddity', value: 35, icon: ico('e', '#e8d08a'),
      desc: 'Enoch’s mess hall pickled eggs, in a brine the color of a bruise. To an Eggbot this is an atrocity. Throw the jar near them and every Eggbot that sees it stops to hold a horrified vigil. (You could also eat them. Please don’t.)',
      useLabel: 'Eat them', throwLabel: 'Throw the jar',
      use: (game, P) => { LM.combat.heal(game, P, 12); LM.status.apply(game, P, 'hn-grimed', { seconds: 2 }); game.toast('Vinegar, sulfur and regret. You feel a little better and a lot worse.', 'warn'); },
      throw: (game) => HN.throwEggLure(game),
    },
    'hn-rare-slime': { name: 'Tube of Rare Slime', cat: 'Sample', value: 90, rarity: 'rare', icon: ico('~', '#6aff9a'), desc: 'A sealed glass tube of luminous green slime, labelled RARE · DO NOT LICK (AGAIN). Alchemists and worse people in Boom-Town pay well for it.' },
    'hn-exotic-filth': { name: 'Tube of Exotic Filth', cat: 'Sample', value: 120, rarity: 'rare', icon: ico('~', '#8a5a2a'), desc: 'A tube of something brown that moves when you aren’t looking. The label: EXOTIC FILTH · VINTAGE · THE GOOD STUFF. Enoch’s private reserve.' },
    'hn-mini-egg': { name: 'Mini-Eggbot', cat: 'Collectible', value: 25, icon: ico('o', '#f4ecd8'), desc: 'A palm-sized dormant Eggbot from the end of a production line, with a tiny black beret. Collectors in Boom-Town buy them; the Eggbots themselves call them “the unhatched.” (Collect the clutch.)' },
    'hn-lard-ration': {
      name: 'Greasy Lard Ration', cat: 'Food', value: 15, icon: ico('L', '#d8c890'),
      desc: 'A brick of seasoned lard in waxed paper, three centuries old and somehow fine. ENOCH’S OWN RECIPE: LARD, SALT, MORE LARD. Eat it for a small heal.',
      canUse: (game) => game.player.hp < game.player.stats().maxHp,
      use: (game, P) => { if (P.hp >= P.stats().maxHp) return false; LM.combat.heal(game, P, 22); game.toast('It goes down like a candle. You feel… lubricated.', 'good'); },
    },
    'hn-sootcake': {
      name: 'Soot-Cake', cat: 'Food', value: 20, icon: ico('c', '#3a3430'),
      desc: 'A dense black cake from the Greasy field kitchen. Charcoal, molasses and a stimulant the label calls MARCHING POWDER. A small heal, and you move faster for half a minute.',
      use: (game, P) => { LM.combat.heal(game, P, 10); P.addBuff('hn-sootcake', 'Marching powder', { speed: 18 }, 30); game.toast('Gritty, sweet, and your feet want to march somewhere.', 'good'); },
    },
    'hn-pristine-soap': { name: 'Pristine bar of soap', cat: 'Salvage', value: 40, icon: ico('□', '#e8f0f8'), desc: 'Still in its paper. From the san-station, where it waited three hundred years for someone to use it. Out here, a luxury.' },
    'hn-enoch-bobble': { name: 'Enoch bobblehead', cat: 'Salvage', value: 30, icon: ico('E', '#8a7a2a'), desc: 'From the museum gift shop: a nodding Enoch the Greasy in battle armor, with a real smear of real grease. The spring still works.' },
    'hn-compound-sheet': {
      name: 'Chemical compounds printout', cat: 'Information', value: 0, unsellable: true, consumable: false, icon: ico('§', '#c8d04a'),
      desc: 'A printout from the bunker’s chemistry terminal. Most of it is recipes for things that should not exist. One line is underlined: THE THRONE’S TOXINS ARE HALVED BY ANY CHEMICAL RESISTANCE AGENT (ANTI-TOX). CHEATING IS PERMITTED. CHEATING IS GREASY.',
    },
  });

  // ------------------------------------------------------------ the special throw (T): slime or egg grenades
  const SPECIALS = ['hn-slime-grenade', 'hn-egg-grenade'];
  HN.readySpecial = function (game, id) {
    HN.st(game).special = id;
    game.toast(HN.ITEMS[id].name + ' ready on T.', 'key');
    return false; // readying doesn't use one up
  };
  HN.specialNow = function (game) {
    const s = HN.st(game);
    if (s.special && HN.count(game, s.special) > 0) return s.special;
    return SPECIALS.find((id) => HN.count(game, id) > 0) || null;
  };
  // getting a special grenade puts the T gadget on you
  const give = HN.give;
  HN.give = function (game, id, n, opts) {
    const r = give.call(this, game, id, n, opts);
    if (SPECIALS.includes(id) && game.player && !game.player.gadgets.includes('hn-special')) game.player.gadgets.push('hn-special');
    return r;
  };
  HN.throwSpecial = function (game, P) {
    if (game.level.def.armed === false) return game.toast('Not here. People live here.', 'warn');
    if ((P._hnThrowCd || 0) > game.time) return;
    const id = HN.specialNow(game);
    if (!id || !HN.take(game, id, 1)) {
      LM.audio.play('empty');
      return game.toast('Nothing special to throw.', 'warn');
    }
    P._hnThrowCd = game.time + 0.7;
    const range = U.clamp(P.aimDist || 200, 60, 360);
    const egg = id === 'hn-egg-grenade';
    LM.combat.shoot(game, {
      type: egg ? 'hn-egg-nade' : 'hn-slime-nade', x: P.x + Math.cos(P.aim) * 12, y: P.y + Math.sin(P.aim) * 12, angle: P.aim, speed: 500, owner: 'player',
      damage: 6, range, damageType: egg ? 'blast' : 'slime',
      aoe: egg
        ? { radius: 118, damage: 150 * P.stats().damageMul, color: '#ffe68a', selfDamage: 0.35, hnEgg: true }
        : { radius: 64, damage: 28 * P.stats().damageMul, color: '#b8e84a', selfDamage: 0.35, hnPuddle: { r: 66, seconds: 24 }, status: 'hn-grimed' },
    });
    LM.audio.play('launcher', { vol: 0.6 });
    if (!egg && !HN.st(game).slimeWarned) {
      HN.st(game).slimeWarned = true;
      game.schedule(1.2, () => game.toast('The stencil promised the toxin dissipates rapidly.', 'key'));
      game.schedule(16, () => game.toast('The slime has not dissipated. You re-read the stencil. *Rapidly in geological terms.', 'warn'));
    }
  };

  // ------------------------------------------------------------ explosions: slime puddles and the egg crack
  class SlimePuddle {
    constructor(x, y, r, seconds) {
      Object.assign(this, { x, y, r, life: seconds, t: 0, seed: (x * 7 + y * 13) | 0 });
    }
    update(dt, game) {
      this.t += dt;
      this.tick = (this.tick || 0) - dt;
      if (this.tick <= 0) {
        this.tick = 0.25;
        const P = game.player, r2 = this.r * this.r;
        if (P && !P.dead && P.dashT <= 0 && U.dist2(P.x, P.y, this.x, this.y) < r2) LM.status.apply(game, P, 'hn-grimed', { seconds: 1.2 });
        for (const e of game.enemies) if (!e.dead && !e.def.flying && U.dist2(e.x, e.y, this.x, this.y) < r2) LM.status.apply(game, e, 'hn-grimed', { seconds: 1.2 });
      }
      if (Math.random() < dt * 4) game.particles.add({ type: 'smoke', x: this.x + U.rand(-this.r, this.r) * 0.6, y: this.y + U.rand(-this.r, this.r) * 0.6, vy: -8, life: 1.4, size: U.rand(3, 6), color: '#a8c83a', alpha: 0.12, drag: 1 });
      return this.t > this.life;
    }
    draw(g, game, t) {
      const k = Math.min(1, (this.life - this.t) / 3);
      const r = U.mulberry32(this.seed >>> 0);
      g.save();
      g.globalAlpha = 0.55 * k;
      for (let i = 0; i < 7; i++) {
        const a = r() * U.TAU, d = r() * this.r * 0.55;
        g.fillStyle = i % 2 ? '#5a6a14' : '#7a8a1e';
        g.beginPath();
        g.ellipse(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, this.r * (0.35 + r() * 0.3), this.r * (0.25 + r() * 0.25), r() * 3, 0, U.TAU);
        g.fill();
      }
      g.restore();
    }
    drawGlow(g, game, t) {
      const k = Math.min(1, (this.life - this.t) / 3);
      G.glow(g, this.x, this.y, this.r, '#b8e84a', 0.12 * k + 0.04 * Math.sin(t * 3));
      const b = (t * 0.8 + (this.seed % 7) * 0.13) % 1;
      G.circle(g, this.x + Math.sin(this.seed) * this.r * 0.4, this.y + Math.cos(this.seed) * this.r * 0.3, 1.6 * (1 - b), 'rgba(220,255,140,' + 0.6 * k + ')');
    }
  }
  HN.slimePuddle = (game, x, y, r, seconds) => game.fx.push(new SlimePuddle(x, y, r || 60, seconds || 20));
  const explode = LM.combat.explode;
  LM.combat.explode = function (game, x, y, o) {
    const r = explode.call(this, game, x, y, o);
    if (o && o.hnPuddle) HN.slimePuddle(game, x, y, o.hnPuddle.r, o.hnPuddle.seconds);
    if (o && o.hnEgg) {
      game.particles.burst(x, y, 26, { type: 'chunk', color: '#f4ecd8', speed: 260, life: 0.7, size: 1.8, drag: 3 });
      game.particles.burst(x, y, 30, { type: 'ember', color: '#ffe68a', speed: 200, life: 0.6, size: 1.4 });
      game.particles.add({ type: 'text', x, y: y - 20, vy: -20, drag: 1, life: 1.4, text: 'CRACK', color: '#ffe68a', size: 9 });
    }
    return r;
  };

  // ------------------------------------------------------------ grease stacks
  const hurt = LM.combat.hurt;
  LM.combat.hurt = function (game, target, amount, o) {
    o = o || {};
    if (target && target.isEnemy && !target.dead && o.damageType === 'slime' && o.source === 'player' && o.type !== 'status' && o.type !== 'hnGrease') {
      target._hnGrease = Math.min(10, (target._hnGrease || 0) + 1);
      target._hnGreaseQuiet = 0;
    }
    return hurt.call(this, game, target, amount, o);
  };
  class GreaseTicker {
    constructor() { this.t = 0; }
    update(dt, game) {
      this.t -= dt;
      for (const e of game.enemies) if (e._hnGrease) e._hnGreaseQuiet = (e._hnGreaseQuiet || 0) + dt;
      if (this.t > 0) return false;
      this.t = 0.5;
      for (const e of game.enemies) {
        if (e.dead || !e._hnGrease) continue;
        hurt.call(LM.combat, game, e, e._hnGrease * 1.0, { source: 'player', type: 'hnGrease', damageType: 'slime', ignoreArmor: true, silent: true });
        if (Math.random() < 0.6) game.particles.add({ type: 'dot', x: e.x + U.rand(-e.r, e.r), y: e.y + U.rand(-e.r, e.r) * 0.5, vy: 30, life: 0.6, size: 1.4, color: '#8a8a2a', drag: 1 });
        if (e._hnGreaseQuiet > 1.2) e._hnGrease = Math.max(0, e._hnGrease - 2);
      }
      return false;
    }
  }

  // ------------------------------------------------------------ the Grease Thrower is heavy
  class HeavyCheck {
    update(dt, game) {
      const P = game.player;
      if (!P || P.dead) return false;
      const w = P.weapons.length ? P.currentWeapon() : null;
      const heavy = !!(w && w.hnHeavy);
      const has = P.buffs.some((b) => b.id === 'hn-heavy');
      if (heavy && !has) {
        P.buffs.push({ id: 'hn-heavy', name: null, mods: { speed: -78 }, t: 1e9 });
        P.statsDirty = true;
      } else if (!heavy && has) {
        P.buffs = P.buffs.filter((b) => b.id !== 'hn-heavy');
        P.statsDirty = true;
      }
      return false;
    }
  }

  // ------------------------------------------------------------ the pickled-egg vigil
  HN.eggLures = [];
  class EggLure {
    constructor(x, y, t) { Object.assign(this, { x, y, until: t + 9 }); HN.eggLures.push(this); }
    update(dt, game) {
      if (game.time > this.until) {
        HN.eggLures = HN.eggLures.filter((l) => l !== this);
        return true;
      }
      return false;
    }
    draw(g) {
      g.fillStyle = 'rgba(200,190,140,0.6)';
      g.fillRect(this.x - 4, this.y - 5, 8, 10);
      for (let i = 0; i < 3; i++) G.circle(g, this.x - 2 + i * 2, this.y - 1 + (i % 2) * 2, 1.6, '#e8d08a');
    }
    drawGlow(g, game, t) { G.glow(g, this.x, this.y, 12, '#e8d08a', 0.2 + 0.08 * Math.sin(t * 3)); }
  }
  HN.throwEggLure = function (game) {
    const P = game.player;
    const d = U.clamp(P.aimDist || 160, 40, 300);
    let x = P.x, y = P.y;
    for (let k = 8; k <= d; k += 8) {
      const nx = P.x + Math.cos(P.aim) * k, ny = P.y + Math.sin(P.aim) * k;
      if (game.level.solidAt(Math.floor(nx / T), Math.floor(ny / T))) break;
      x = nx;
      y = ny;
    }
    game.fx.push(new EggLure(x, y, game.time));
    LM.audio.play('wall');
    game.toast('The jar smashes. Brine, and three grey eggs rolling on the floor.', 'good');
  };
  HN.nearestEggLure = function (e, reach) {
    let best = null, bd = reach * reach;
    for (const l of HN.eggLures) {
      const d2 = U.dist2(e.x, e.y, l.x, l.y);
      if (d2 < bd) { bd = d2; best = l; }
    }
    return best;
  };

  LM.on('levelLoaded', (game) => {
    HN.eggLures = [];
    if (game.attract || !game.player) return;
    game.fx.push(new GreaseTicker(), new HeavyCheck());
  });

  // ------------------------------------------------------------ the vats' grease, as a pickup
  const items = {
    'ammo-grease': {
      name: 'Grease', radius: 7, shadowScale: 0.7,
      onTouch(it, game) {
        const P = game.player;
        if ((P.ammo.grease || 0) >= P.ammoMax('grease')) return false;
        const got = P.addAmmo('grease', it.props.amount || 60);
        LM.audio.play('pickup');
        game.particles.add({ type: 'text', x: it.x, y: it.y - 10, vy: -30, drag: 2, life: 0.8, text: '+' + got + ' grease', color: '#e0e070', size: 7 });
      },
      draw(g) {
        g.fillStyle = '#16140a';
        g.fillRect(-6, -7, 12, 14);
        g.fillStyle = '#3a3418';
        g.fillRect(-5, -6, 10, 12);
        g.fillStyle = '#c8d04a';
        g.fillRect(-5, -1, 10, 2);
      },
      drawGlow(g, it, t) { G.glow(g, 0, 0, 10, '#c8d04a', 0.15 + 0.06 * Math.sin(t * 3)); },
    },
  };

  LM.definePack({
    id: 'hn-greasy', weapons, projectiles, armor, statuses, items,
    gadgets: {
      'hn-special': {
        name: 'Special grenade', short: 'Special', key: 'KeyT',
        badge: (game) => { const id = HN.specialNow(game); return id ? HN.count(game, id) : 0; },
        use: (game, P) => HN.throwSpecial(game, P),
        drawIcon(g, W, H) {
          g.fillStyle = '#f4ecd8';
          g.beginPath();
          g.ellipse(W / 2, H * 0.55, W * 0.18, H * 0.26, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = '#a8c83a';
          g.fillRect(W * 0.32, H * 0.5, W * 0.36, H * 0.08);
        },
      },
    },
  });
})();
