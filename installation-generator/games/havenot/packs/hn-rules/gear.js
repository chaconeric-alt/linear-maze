/* HaveNot — packs/hn-rules/gear.js
 * Weapons, armor, statuses and the satchel item catalog.
 *
 * Starting gear (engine 0.6.0 fields): the handgun never runs dry; the scattergun has an 8-shell magazine
 * (magazine / reloadTime) and the chest plate covers six hits in ten (coverage); the gauss pistol
 * overheats after six shots in three seconds (heat).
 *
 * Catalog sources: items marked (Vol 3) keep the book's name, flavor and list price (the HaveNot books,
 * Vol 3, Age of War treasure, pp. 175–195). Items marked (original) are invented for this game.
 * Weapons and armor resell at a tenth of their value (Vol 2 p. 156); salvage sells at its value.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  const HN = LM.HN;
  const core = LM.registry.weapons;

  // more shells than the core's 48: the scattergun package starts with 80, the home locker holds 100
  LM.AMMO_MAX.shells = 200;
  LM.AMMO_MAX.cells = 60;
  LM.AMMO_NAMES.cells = 'Power cells';

  const metal = (g, x, y, w, hh, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, hh);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(x, y, w, Math.max(0.8, hh * 0.25));
  };

  const weapons = {
    'hn-handgun': Object.assign({}, core.pistol, {
      name: 'Frontier Handgun', short: 'Handgun', slot: 1,
      desc: 'A six-gun with a self-loading cylinder from the Age of War. It never runs dry, which is why everyone wants one.',
      damage: 15, fireRate: 3.6, spread: 0.035,
    }),
    'hn-scattergun': Object.assign({}, core.scattergun, {
      name: 'Pump Scattergun', short: 'Scatter', slot: 2,
      desc: 'Eight shells to a magazine and two seconds to reload (R). Heavy up close, wasted across a room.',
      magazine: 8, reloadTime: 2, pickupAmmo: 16, damage: 9, range: 280,
    }),
    'hn-gauss': Object.assign({}, core.pistol, {
      name: 'Gauss Pistol', short: 'Gauss', slot: 2,
      desc: 'Long reach, heavy slugs, no ammunition. Six shots inside three seconds and it overheats for three. Age of War gauss weapons had a reputation for exploding; this one only threatens to.',
      damage: 34, fireRate: 3, speed: 1500, range: 1100, pierce: 1, tracer: '#9fe8ff', flash: '#9fe8ff', sound: 'arc',
      heat: {
        shots: 6, window: 3, cooldown: 3, color: '#ff3a1e',
        onOverheat: (game) => game.toast(U.pick(['GAUSS COIL TEMPERATURE: CONCERNING. Please stop.', 'The grip is too hot to hold. Something inside is ticking.', 'Coil warning. The pistol hums a note you don’t like.']), 'warn'),
      },
      drawHeld(g, p, k) {
        metal(g, 4 - k, -2, 15, 4, '#2a3038');
        g.fillStyle = '#5ab8e8';
        for (let i = 0; i < 3; i++) g.fillRect(8 + i * 3 - k, -2.8, 1.4, 5.6);
        g.fillStyle = '#4a3a2a';
        g.fillRect(3 - k, 0, 4, 3.5);
      },
    }),
    'hn-gauss-cap': null, // filled in below: the gauss pistol with the Prototype Capacitor
    'hn-plasma-musket': {
      name: 'Plasma Musket', short: 'Musket', slot: 3,
      desc: 'Late Age of War: one power cell per shot, loaded by hand. Slow, loud, and it burns whatever it hits. Robots hate it a little less than electricity.',
      ammo: 'cells', magazine: 1, reloadTime: 1.4, pickupAmmo: 6, damage: 70, fireRate: 1.2, spread: 0.01, speed: 900, range: 900,
      projectile: 'hn-plasma', tracer: '#ff8a3a', knock: 120, recoil: 0.9, kick: 0.2, pushback: 50, sound: 'launcher', flash: '#ff8a3a', flashRadius: 150, flashSize: 22,
      status: { id: 'hn-burning', seconds: 2 }, damageType: 'fire', muzzle: 24, length: 22,
      drawHeld(g, p, k) {
        g.fillStyle = '#5a3a20';
        g.fillRect(0 - k, -2, 8, 4);
        metal(g, 7 - k, -1.8, 16, 3.6, '#3a3430');
        g.fillStyle = '#ff8a3a';
        g.fillRect(12 - k, -2.6, 4, 1);
      },
    },
    'hn-arc-carbine': {
      name: 'Security Arc Carbine', short: 'Arc', slot: 4,
      desc: 'Agency security issue. Bottled lightning in bursts; robots take double from it. It drinks power cells.',
      ammo: 'cells', ammoPerShot: 1, pickupAmmo: 12, damage: 22, fireRate: 4, spread: 0.03, speed: 1300, range: 700, pierce: 1,
      projectile: 'arc-bolt', tracer: '#9fd8ff', knock: 40, recoil: 0.3, kick: 0.07, sound: 'arc', flash: '#9fd8ff', flashRadius: 120, damageType: 'electric', muzzle: 22, length: 20,
      drawHeld(g, p, k) {
        metal(g, 3 - k, -2.4, 17, 4.8, '#3a4048');
        g.fillStyle = '#9fd8ff';
        g.fillRect(9 - k, -3.2, 6, 1);
        g.fillRect(9 - k, 2.2, 6, 1);
        g.fillStyle = '#e0a830';
        g.fillRect(4 - k, -0.6, 3, 1.2);
      },
    },
  };
  weapons['hn-gauss-cap'] = Object.assign({}, weapons['hn-gauss'], {
    name: 'Gauss Pistol (capacitor)', desc: 'The gauss pistol with a Prototype Capacitor wired into the grip: nine shots before it overheats.',
    heat: Object.assign({}, weapons['hn-gauss'].heat, { shots: 9 }),
  });
  Object.assign(HN.WEAPON_VALUE, { 'hn-handgun': 300, 'hn-scattergun': 800, 'hn-gauss': 2500, 'hn-gauss-cap': 3200, 'hn-plasma-musket': 3000, 'hn-arc-carbine': 4000 });

  const projectiles = {
    'hn-plasma': {
      radius: 4, color: '#ffb060', wallSparks: 8, sparkColor: '#ffd08a',
      light: { r: 80, color: '#ff8a3a', intensity: 0.6 },
      drawGlow(g, p) {
        G.glow(g, p.x, p.y, 16, '#ff8a3a', 0.9);
        G.glow(g, p.x, p.y, 5, '#fff0c0', 1);
      },
    },
    'hn-sphinx-laser': {
      radius: 2.5, color: '#ff3a3a', tracer: 26, width: 2, glow: 10, wallSparks: 4,
      light: { r: 60, color: '#ff3a3a', intensity: 0.5 },
    },
    'hn-cookie': {
      radius: 3,
      draw(g, p) {
        g.fillStyle = '#c8924a';
        g.beginPath();
        g.arc(p.x, p.y, 3, 0, U.TAU);
        g.fill();
      },
    },
  };

  const armor = {
    'hn-vest': {
      name: 'Light Ballistic Vest', slot: 'body', color: '#5a5a3a', trim: '#8a8a5a',
      mods: { armor: 0.15 }, desc: 'Woven armor-cloth over a padded jacket. Takes the edge off everything.',
    },
    'hn-plate': {
      name: 'Heavy Chest Plate', slot: 'body', color: '#5a5f66', trim: '#a9b0b8',
      mods: { armor: 0.5, speed: -12 }, coverage: 0.6,
      desc: 'Halves a hit when the hit lands on it. It covers about six hits in ten, and you feel every pound.',
    },
    'hn-boots': {
      name: 'Insulated Service Boots', slot: 'feet', color: '#3a3020', trim: '#e0a830',
      takes: { electric: 0.25 }, desc: 'Agency maintenance boots, rated for live floors. Electrical damage is cut to a quarter. (original)',
    },
    'hn-filter-mask': {
      name: 'Filter Mask', slot: 'head', color: '#4a5a4a', trim: '#9ab89a',
      resist: { 'hn-toxic': 1 }, takes: { toxic: 0 }, desc: 'A rubber mask with two fresh canisters. Toxic mist can’t touch you. (original)',
    },
    'hn-radar-goggles': {
      name: 'Radar Goggles (Mk 1)', slot: 'head', color: '#2a3a4a', trim: '#5ab8e8',
      mods: { lightRadius: 40 }, desc: 'A penetrating scanning beam looks a few inches into solid things: traps show up, and you sense three tiles further. (Vol 3)',
    },
    'hn-coltron': {
      name: 'Coltron Belt Pack Power Field', slot: 'trinket', color: '#3a3a6a', trim: '#8a8aff',
      mods: { maxShield: 25, shieldRegen: 9 }, desc: 'Coltron Industries’ standard personal power field. It soaks the first hits, then recharges when the shooting stops. Only one field can sync at a time. (Vol 3)',
    },
    'hn-bulletscreen': {
      name: 'Kaveros BulletScreen', slot: 'trinket', color: '#2a4a5a', trim: '#9fd8ff',
      desc: 'Tuned to stop fast-moving projectiles only: it soaks most of a bullet’s hit until it runs low, then recovers. Punches, blades, blasts and energy pass straight through. (Vol 3)',
    },
    'hn-carapace': {
      name: 'Agency Security Carapace', slot: 'body', color: '#2a2e36', trim: '#e0a830',
      mods: { armor: 0.3, speed: -6 }, takes: { electric: 0.6 }, desc: 'Black-and-gold security armor with the agency’s smiling logo on the chest. Solid, insulated, and faintly embarrassing. (original)',
    },
  };
  Object.assign(HN.ARMOR_VALUE, { 'hn-vest': 400, 'hn-plate': 1200, 'hn-boots': 300, 'hn-filter-mask': 150, 'hn-radar-goggles': 500, 'hn-coltron': 1000, 'hn-bulletscreen': 1000, 'hn-carapace': 3500 });

  const statuses = {
    'hn-bleed': { name: 'Bleeding', seconds: 3, dps: 3, interval: 0.5, color: '#c83a3a', damageType: 'bleed' },
    'hn-burning': { name: 'Burning', seconds: 3, dps: 9, interval: 0.5, color: '#ff8a3a', damageType: 'fire' },
    'hn-acid': { name: 'Acid', seconds: 3, dps: 6, interval: 0.5, ignoreArmor: true, color: '#9dff3a', damageType: 'acid' },
    'hn-toxic': { name: 'Toxic mist', seconds: 1.2, dps: 7, interval: 0.4, color: '#c8e84a', damageType: 'toxic' },
    'hn-shaken': { name: 'Shocking thought', seconds: 3, speedMul: 0.6, color: '#ff4ad8', only: 'player' },
    'hn-lured': { name: 'Eating', seconds: 6, stun: true, color: '#e0a860', hud: false, only: 'monster' },
    'hn-confused': { name: 'Reading the sign', seconds: 2.5, stun: true, color: '#e0d040', hud: false, only: 'robot' },
    'hn-irradiated': { name: 'Irradiated', seconds: 3, dps: 4, interval: 0.5, color: '#b8ff4a', only: 'player', damageType: 'radiation' },
  };

  // ------------------------------------------------------------ the satchel catalog
  const ico = (glyph, color) => ({ glyph, color });
  HN.defineItems({
    // medical
    'hn-health-charge': {
      name: 'Health Charge', cat: 'Medical', value: 30, icon: ico('+', '#e05a5a'),
      desc: 'An auto-injector of glowing red nano-repair. Press it to your thigh: a minor heal (a third of your health). (Vol 3)',
      canUse: (game) => game.player.hp < game.player.stats().maxHp,
      use: (game) => { if (game.player.hp >= game.player.stats().maxHp) return false; HN.minorHeal(game); LM.audio.play('heal'); },
    },
    'hn-health-pak': {
      name: 'Health Pak', cat: 'Medical', value: 200, rarity: 'rare', icon: ico('✚', '#ff6a6a'),
      desc: 'The armband version of the Health Charge, with sensors and a dial. A major heal: all of it. Not rechargeable. (Vol 3)',
      canUse: (game) => game.player.hp < game.player.stats().maxHp,
      use: (game) => { if (game.player.hp >= game.player.stats().maxHp) return false; HN.majorHeal(game); LM.audio.play('heal'); game.toast('The Health Pak hums and whirs. You feel new.', 'good'); },
    },
    'hn-anti-tox': {
      name: 'Anti-Tox', cat: 'Expendable', value: 50, icon: ico('A', '#9adf6a'),
      desc: 'An injector of chemical resistance. For two minutes toxic mist can’t hurt you and radiation doesn’t build. (Vol 3)',
      use: (game, P) => {
        P.addBuff('hn-antitox', 'Anti-Tox', {}, 120);
        const b = P.buffs.find((x) => x.id === 'hn-antitox');
        if (b) b.resist = { 'hn-toxic': 1, 'hn-irradiated': 1 };
        LM.status.clear(game, P, 'hn-toxic');
        LM.audio.play('heal');
        game.toast('Anti-Tox: your blood tastes like pennies. Mist and radiation can’t touch you for two minutes.', 'good');
      },
    },
    'hn-cookies': {
      name: 'Good Job Cookies', cat: 'Expendable', value: 250, icon: ico('C', '#c8924a'),
      desc: '“EMPLOYEE TREAT.” The addictive chemicals decayed centuries ago; the cookies are still delicious. Eat them (a small heal and a lift), or throw them: Gladiator Roaches can’t resist sweets. (Vol 3)',
      useLabel: 'Eat', throwLabel: 'Throw as bait',
      use: (game, P) => { LM.combat.heal(game, P, 15); P.addBuff('hn-cookie', 'Good Job!', { speed: 14 }, 30); game.toast('Good job! You feel appreciated for thirty seconds.', 'good'); },
      throw: (game) => HN.throwCookies(game),
    },
    'hn-hypno-tab': {
      name: 'Hypno-Tab Sample', cat: 'Expendable', value: 80, icon: ico('H', '#ff4ad8'),
      desc: 'The agency’s productivity tablet. For forty seconds your Sense reaches three tiles further and your dash recovers faster, then you spend a few seconds compulsively tidying the air. (original)',
      use: (game, P) => {
        P.addBuff('hn-hypno', 'Hyper-productive', { dashCooldown: -0.25 }, 40);
        game.toast('PRODUCTIVITY ENGAGED. Everything is so clear. Everything needs straightening.', 'key');
        game.schedule(40, () => {
          LM.status.apply(game, P, 'hn-shaken', { seconds: 3 });
          game.toast('You realign a doorway that was already straight. The tab wears off.', 'warn');
        });
      },
    },
    'hn-grenade': {
      name: 'Frag Grenade', cat: 'Expendable', value: 60, icon: ico('G', '#7a8a4a'), consumable: false,
      desc: 'Age of War fragmentation grenade. Thrown with G; heavy area damage. Knife Fighters hate them most.',
    },
    // utility
    'hn-mw-scanner': {
      name: 'Millimeter Wave Scanner', cat: 'Utility', value: 1500, rarity: 'rare', charges: 3, trophy: true, icon: ico('W', '#5ab8e8'),
      desc: 'Looks through doors and walls, into crates, and shows traps: a twenty-second sweep. Three charges a mission. (Vol 3)',
      use: (game) => { HN.scanUntil = game.time + 20; LM.audio.play('arc'); game.toast('MW sweep: doors, crates and traps show through for twenty seconds.', 'key'); },
    },
    'hn-threat-sensor': {
      name: 'Threat Sensor', cat: 'Utility', value: 750, rarity: 'rare', trophy: true, consumable: false, icon: ico('T', '#b8ff4a'),
      desc: 'A hand unit and a wand. While you carry it, radiation, toxic mist and explosives show up about a room away (green). (Vol 3)',
    },
    'hn-override': {
      name: 'Security Override Module', cat: 'Utility', value: 400, icon: ico('O', '#e0a830'),
      desc: 'A chip that one compatible agency turret or security door will accept as management. One use. (original)',
    },
    // oddities and junk
    'hn-insulting-card': {
      name: 'Hammermark Insulting Card', cat: 'Junk', value: 15, icon: ico('!', '#ff4ad8'),
      desc: 'An envelope: “A Special Message for a Special Someone.” Opening it pops up a rude hand and a shocking thought. Better to sell it, or leave it for someone you don’t like. (Vol 3)',
      useLabel: 'Open it',
      use: (game, P) => { LM.status.apply(game, P, 'hn-shaken', { seconds: 3 }); LM.combat.hurt(game, P, 6, { source: 'hazard', type: 'status', ignoreArmor: true }); game.toast('A cardboard hand flips you off. The thought it gives you is very, very rude.', 'warn'); },
    },
    'hn-desktop-defender': {
      name: 'Boxed Desktop Defender', cat: 'Oddity', value: 400, icon: ico('D', '#8a6a4a'),
      desc: 'A rectangular box marked DESK SECURITY. Something inside scratches. Opening it lets out a small, vicious guard animal that defends the nearest desk from everyone but its owner. You are not its owner. (Vol 3)',
      useLabel: 'Open the box',
      use: (game, P) => { if (game.level.def.armed === false) { game.toast('Not here. People live here.', 'warn'); return false; } game.spawnEnemy('hn-defender', P.x + Math.cos(P.aim) * 30, P.y + Math.sin(P.aim) * 30, { aggro: true }); game.toast('It comes out of the box already biting.', 'warn'); },
    },
    'hn-ping-pong': { name: 'Crate of ping-pong balls', cat: 'Junk', value: 4, icon: ico('o', '#f0f0e0'), desc: 'Hundreds of them. Brand new. Nobody knows why.' },
    'hn-presentation': { name: 'Marketing presentation', cat: 'Junk', value: 1, icon: ico('P', '#a8a8b8'), desc: '“Q3 Synergy Roadmap: Making Want Infinite.” Guarded for three centuries by a combat robot. Worth exactly nothing.' },
    // salvage and sellables
    'hn-fuel-cell': { name: 'Fuel cell', cat: 'Fuel cell', value: 10, icon: ico('F', '#e0a830'), desc: 'A small power cell harvested from a robot. Every town buys them. (Vol 2/3: small bots ~10c)' },
    'hn-fuel-cell-big': { name: 'Heavy fuel cell', cat: 'Fuel cell', value: 100, rarity: 'rare', icon: ico('F', '#ff8a3a'), desc: 'A fat power cell from a big robot. Worth real money. (Vol 3: boss robots ~100c+)' },
    'hn-sprocket': { name: 'Sprocket', cat: 'Salvage', value: 20, icon: ico('S', '#a8a090'), desc: 'A multi-function robot component. Engineers pay for them. (Vol 3)' },
    'hn-circuit': { name: 'Gold-trace circuit board', cat: 'Salvage', value: 15, icon: ico('c', '#4a8a4a'), desc: 'Pried out of an agency terminal. Gold in the traces.' },
    'hn-pen': { name: 'Executive pen', cat: 'Salvage', value: 45, icon: ico('p', '#c8a060'), desc: 'Heavy, gold, and it still writes. The ink is a slightly different color every time.' },
    'hn-watch': { name: 'Executive wristwatch', cat: 'Salvage', value: 120, rarity: 'rare', icon: ico('w', '#e0c070'), desc: 'It shows the time in four cities that no longer exist, and your current productivity score: 61%.' },
    'hn-mug': { name: '“World’s Most Synergistic” mug', cat: 'Salvage', value: 8, icon: ico('m', '#e0e0e0'), desc: 'A promotional mug. Collectors in Boom-Town pay for these, inexplicably.' },
    'hn-lucky-chip': { name: 'Lucky credit chip', cat: 'Salvage', value: 25, icon: ico('$', '#f2c96b'), desc: 'A gambler’s token from the coffee shop tip jar, worn smooth by a thumb. Someone in this building would want it.' },
    'hn-statuette': { name: 'Employee of the Century statuette', cat: 'Salvage', value: 180, rarity: 'rare', trophy: true, icon: ico('★', '#f2c96b'), desc: 'A gold figure of a smiling worker holding a smaller gold figure of a smiling worker.' },
    'hn-coupling': {
      name: 'Repair Bay power coupling', cat: 'Salvage', value: 300, rarity: 'rare', trophy: true, icon: ico('⚡', '#ff8a3a'),
      desc: 'The heart of the agency’s Robot Repair Bay. Without it the bay can’t rebuild anything. The Outpost could run on it for a year.',
    },
    // information (key documents)
    'hn-termination-order': {
      name: 'Termination Order 77-B', cat: 'Information', value: 0, unsellable: true, unique: true, trophy: true, consumable: false, icon: ico('§', '#f0e0b0'),
      desc: 'An executive authorization, signed and stamped: “Close the facility. Effective immediately.” Nobody ever filed it.',
    },
    'hn-courier-map': {
      name: 'Courier’s map', cat: 'Information', value: 0, unsellable: true, unique: true, consumable: false, icon: ico('✕', '#e0c070'),
      desc: 'A hand-drawn map from a dead courier’s pack, with a hole in the ground marked “BOLT HOLE: CACHE, DON’T TELL.”',
    },
  });
  // the gauss pistol takes the capacitor as an add-on (a use that swaps the weapon)
  HN.defineItems({
    'hn-capacitor': {
      name: 'Prototype Capacitor', cat: 'Add-on', value: 700, rarity: 'rare', icon: ico('K', '#9fe8ff'), trophy: true,
      desc: 'A lab prototype the size of a cigarette pack. Wired into a gauss pistol it takes nine shots before it overheats. (original)',
      useLabel: 'Fit it to the gauss pistol',
      canUse: (game) => game.player.hasWeapon('hn-gauss'),
      use: (game, P) => {
        const i = P.weapons.indexOf('hn-gauss');
        if (i < 0) { game.toast('You need a gauss pistol to fit it to.', 'warn'); return false; }
        P.weapons[i] = 'hn-gauss-cap';
        P.statsDirty = true;
        LM.audio.play('switch');
        game.toast('The capacitor clicks into the grip. Nine shots before it overheats.', 'good');
      },
    },
  });

  LM.definePack({ id: 'hn-rules', weapons, projectiles, armor, statuses });
})();
