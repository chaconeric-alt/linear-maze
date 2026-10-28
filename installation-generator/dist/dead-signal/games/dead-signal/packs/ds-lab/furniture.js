/* Dead Signal — packs/ds-lab/furniture.js
 * The Linear Maze's office furniture, told Asterion's story instead of Meridian's: the same pieces
 * (and the same ids, so every floor that uses them gets these words), with new things to say.
 * Also the Asterion wordmark for the lobby wall (ds-logo).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);
  const say = (title, text, kicker) => LM.ui.showText(title, text, kicker);
  const popup = (kicker, title, paras, actions) =>
    LM.ui.open({ kicker, title, body: h('div', { class: 'lore-block' }, paras.map((p) => (typeof p === 'string' ? h('p', { class: 'lore' }, p) : p))), actions: actions || [{ label: 'Close', primary: true }] });
  const flag = (game, f) => !!(game && game.hasFlag && game.hasFlag(f));

  /** The office piece with a new interaction (its look and collision stay the same). */
  const retell = (id, interact) => {
    const base = LM.find('items', id);
    return base ? Object.assign({}, base, { interact: Object.assign({ available: () => true }, interact) }) : null;
  };

  const items = {
    printer: retell('printer', {
      prompt: 'Look at the copier',
      use: (it, game) =>
        popup('Copier', 'The copier', [
          'It woke up when the power dipped and printed the same page forty times. They lie in a fan across the carpet:',
          DS.screenText('ASTERION BIOLOGICS · FACILITY NOTICE\n\nPROTOCOL LABRYS IS IN EFFECT.\nREMAIN WHERE YOU ARE.\nDO NOT APPROACH SECURITY UNITS.\nTHIS NOTICE WILL NOT REPEAT.'),
          'The page count says it has printed it 41 times. There are 40 on the floor.',
        ]),
    }),
    filing: retell('filing', {
      prompt: 'Look in the filing cabinet',
      use: (it, game) => say('Filing cabinet', 'Personnel files, A to Z, in green hanging folders. Most of them have a red dot on the tab. You don’t know what the red dot means, but there are a lot of them, and the most recent was added last week.', 'Records'),
    }),
    cooler: retell('cooler', {
      prompt: 'Have a drink',
      use: (it, game) => {
        const P = game.player;
        if (P.hp < P.stats().maxHp) {
          LM.combat.heal(game, P, 5);
          LM.audio.play('heal');
          return popup('Water cooler', 'Water cooler', ['The jug glugs. The water is cold and tastes of the plastic. You feel a little steadier. +5 health.']);
        }
        popup('Water cooler', 'Water cooler', ['The jug glugs. Somewhere in the building, something answers it.']);
      },
    }),
    vending: retell('vending', {
      prompt: 'Buy a snack',
      use(it, game) {
        it.n = ((it.n || 0) + 1) % 4;
        const P = game.player;
        if (it.n === 1 && P.hp < P.stats().maxHp) {
          LM.combat.heal(game, P, 10);
          LM.audio.play('heal');
        }
        const lines = [
          'The display says LOCKDOWN — CASHLESS ONLY. Then it says THANK YOU. Nothing falls.',
          'A granola bar drops. Asterion-branded: a little gold bull on the wrapper. You eat it in two bites. +10 health.',
          'The machine thinks about your card for a long time and then gives it back, warm.',
          'Row E is all the same thing: VITAE energy drink, “Engineered for You.” The cans are a colour you don’t like.',
        ];
        popup('Break room', 'The vending machine', [lines[it.n]]);
      },
    }),
    fridge: retell('fridge', {
      prompt: 'Open the fridge',
      use: (it, game) =>
        popup('Break room', 'The fridge', [
          h('ul', { class: 'labels' },
            h('li', null, 'TOMMY - LEFTOVER CHILI - 3/14'),
            h('li', null, 'Night shift birthday cake (Marisa’s, 30!!), one slice gone.'),
            h('li', null, 'A tray of sample tubes with BOARD — DO NOT DISCARD on the lid. They are warm. The fridge is not.'),
            h('li', { class: 'cold' }, 'Oat milk, labelled THEO. You don’t remember buying it.')),
          'The light inside flickers in time with the strobes.',
        ]),
    }),
    'coffee-machine': retell('coffee-machine', {
      prompt: 'Make a coffee',
      use(it, game) {
        const P = game.player;
        popup('Break room', 'The coffee machine', [
          'It still has power: it’s on the same circuit as the fridge. It grinds, hisses and fills a paper cup with something black and very hot.',
        ], [
          { label: 'Drink it', primary: true, onClick: () => { P.addBuff('ds-coffee', 'Coffee', { speed: 16, dashCooldown: -0.1 }, 40); game.toast('Wide awake: you move faster for a while.', 'good'); } },
          { label: 'Leave it', quiet: true },
        ]);
      },
    }),

    // the wordmark on the lobby wall
    'ds-logo': {
      name: 'Asterion sign', radius: 8, wallMounted: true, shadow: false, dressing: 'Walls',
      light: { color: '#e8f0f8', radius: 160, intensity: 0.3 },
      interact: {
        prompt: 'Read the sign',
        use: () => say('ASTERION BIOLOGICS', 'Brushed steel letters, lit from behind. Under them, smaller: Life, to order.\n\nUnder that, scratched into the wall at knee height with something sharp, a double-headed axe whose blades are two open hands.', 'Lobby'),
      },
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x));
        const n = it.props.w || 3, W = n * T - 8;
        g.fillStyle = '#1e2125';
        g.fillRect(-0.5, -W / 2, 2.6, W);
        g.fillStyle = '#c9ced4';
        const letters = 8;
        for (let i = 0; i < letters; i++) g.fillRect(1.6, -W / 2 + 3 + (i * (W - 6)) / letters, 2.2, (W - 6) / letters - 2);
      },
      drawGlow(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x));
        const n = it.props.w || 3, W = n * T - 8;
        G.glow(g, 6, 0, W * 0.55, '#e8f0f8', 0.16);
      },
    },

    // ---------------------------------------------------------- borrowed by the editor-made floors
    // (from packs Dead Signal no longer loads: the Town's fire jet, the Library's desk, the Apartment's shelf)
    'fire-jet': fireJet(),
    'lib-desk': alias('desk', 'Desk'),
    'apt-bookshelf': alias('bookshelf', 'Bookshelf'),
  };
  for (const k of Object.keys(items)) if (!items[k]) delete items[k];

  function alias(id, name) {
    const base = LM.find('items', id);
    return base ? Object.assign({}, base, { name, dressing: false }) : null;
  }
  /** A jet on a wall that fires on a cycle (props.on / off seconds, offset, len tiles, damage). props.kind:
   *  'fire' (default), 'steam' (white, scalds) or 'weld' (a blue-white torch). */
  function fireJet() {
    const KIND = {
      fire: { stops: ['rgba(255,240,180,0.95)', 'rgba(255,140,40,0.75)', 'rgba(255,60,20,0)'], embers: ['#ff8a2a', '#ffd04a', '#ff4a1a'], light: '#ff8a3a' },
      steam: { stops: ['rgba(255,255,255,0.8)', 'rgba(220,230,235,0.45)', 'rgba(200,210,215,0)'], embers: null, light: '#cfd8e0' },
      weld: { stops: ['rgba(240,250,255,0.95)', 'rgba(140,200,255,0.7)', 'rgba(80,140,255,0)'], embers: ['#ffffff', '#9fd8ff', '#ffd27a'], light: '#9fd8ff' },
    };
    const kind = (it) => KIND[it.props.kind] || KIND.fire;
    const face = (it) => Math.atan2(it.face.y, it.face.x);
    return {
      name: 'Jet', dressing: false, radius: 6, wallMounted: true, shadow: false,
      light: (it) => ({ color: kind(it).light, radius: 110, intensity: 0.35, flicker: 0.5 }),
      update(it, dt, game) {
        const p = it.props, on = p.on || 1.4, cyc = on + (p.off || 2.2);
        const off = p.offset == null ? (it.tx + it.ty) * 0.9 : p.offset;
        const ph = (((game.time + off) % cyc) + cyc) % cyc;
        it.warn = ph > cyc - 0.6;
        it.burning = ph < on;
        if (!it.burning) return;
        if (it.reach == null) {
          const L = game.level;
          let n = 0;
          while (n < (p.len || 4) && !L.solidAt(it.tx + it.face.x * (n + 1), it.ty + it.face.y * (n + 1))) n++;
          it.reach = n * T + 4;
        }
        const k = kind(it);
        if (Math.random() < 0.7) {
          const d = Math.random() * it.reach;
          game.particles.add(k.embers
            ? { type: 'ember', x: it.x + it.face.x * d + U.rand(-6, 6), y: it.y + it.face.y * d + U.rand(-6, 6), vx: it.face.x * 120, vy: it.face.y * 120 - 20, life: 0.4, size: 1.6, color: U.pick(k.embers) }
            : { type: 'smoke', x: it.x + it.face.x * d, y: it.y + it.face.y * d, vx: it.face.x * 60, vy: it.face.y * 60 - 10, life: 0.7, size: 4, color: '#e8ecef', alpha: 0.25 });
        }
        const P = game.player;
        if (!P || P.dead) return;
        const rx = P.x - it.x, ry = P.y - it.y, along = rx * it.face.x + ry * it.face.y, across = Math.abs(rx * it.face.y - ry * it.face.x);
        it.cd = (it.cd || 0) - dt;
        if (along > 0 && along < it.reach && across < 14 + P.r && it.cd <= 0) {
          it.cd = 0.45;
          LM.combat.hurt(game, P, p.damage || 12, { source: 'hazard', type: 'hazard' });
        }
      },
      draw(g, it) {
        g.rotate(face(it));
        g.fillStyle = '#3a2a1a';
        g.fillRect(-1, -6, 5, 12);
        g.fillStyle = it.warn ? '#ff6a2a' : '#1a1410';
        g.beginPath();
        g.arc(3, 0, 2.6, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (!it.burning || !it.reach) {
          if (it.warn) G.glow(g, it.face.x * 4, it.face.y * 4, 12, '#ff6a2a', 0.5);
          return;
        }
        const st = kind(it).stops;
        g.save();
        g.rotate(face(it));
        const len = it.reach;
        const grd = g.createLinearGradient(0, 0, len, 0);
        grd.addColorStop(0, st[0]);
        grd.addColorStop(0.4, st[1]);
        grd.addColorStop(1, st[2]);
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(2, -4);
        g.lineTo(len, -12 - Math.sin(t * 30) * 2);
        g.lineTo(len, 12 + Math.sin(t * 27) * 2);
        g.lineTo(2, 4);
        g.closePath();
        g.fill();
        g.restore();
      },
    };
  }

  LM.definePack({ id: 'ds-lab', items });
})();
