/* HaveNot — packs/hn-rules/fixtures.js
 * World objects every HaveNot floor can place.
 *
 *   hn-loot          a pickup that goes into the satchel: props { hn: item id, n }
 *   hn-cache         anything that holds a find: props { kind: 'locker' | 'desk' | 'corpse' | 'register' | 'safe' | 'case' | 'shelf',
 *                    name, text, loot: [entries], uid, code, codeFlag, hackDiff, needFlag, needText, trap: 'explode' | 'shock' | 'card' }
 *                    Loot is handed over once (LM.HN.award by uid), so it can't be collected twice.
 *   hn-crate         a packing crate with weird markings: props { contents: 'robots' | 'treasure' | 'body' | 'balls', loot, label }
 *   hn-cookie-box    a box of Good Job Cookies: props { trapped } (a careful look tells you which)
 *   hn-mist          a mist generator: props { toxic } — toxic mist is yellow-green and hisses
 *   hn-health-station a wall health station with a finite charge: props { charge }
 *   hn-shopper       the Personal Shopper Tablet: feed it credits, an ancient product materializes
 *   hn-terminal      a terminal: props { action, title, text, difficulty, risk, flag, doneText } (actions: LM.HN.TERMINALS)
 *   hn-sec-panel     a security door's hack panel: props { flag, difficulty, cardFlag, cardName, title }
 *   hn-kiosk         a help-desk kiosk: shows the whole floor on the minimap
 *   hn-safety-sign   a workplace safety sign (maintenance robots stop to read it): props { text, short }
 *   hn-ad-screen     an ad screen; dark once the ad system is silenced (flag hnAdsSilent): props { ad }
 *   hn-exit          the way back out to the near-area map: props { text }
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;

  const wallRot = (g, it) => g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
  const uidOf = (it, game) => it.props.uid || (game.levelId + ':' + it.tx + ',' + it.ty);
  const lore = (t) => h('p', { class: 'lore' }, t);

  // ------------------------------------------------------------ containers
  const CACHE_LOOK = {
    locker: { w: 20, h: 12, c: '#5a6a72', t: '#2a3036' },
    desk: { w: 26, h: 14, c: '#6a5a48', t: '#2a2018' },
    corpse: { w: 18, h: 12, c: '#5a4a3a', t: '#2a1a14' },
    register: { w: 16, h: 12, c: '#7a6a5a', t: '#2a2420' },
    safe: { w: 18, h: 16, c: '#4a4c52', t: '#1a1c20' },
    case: { w: 22, h: 14, c: '#7a8a9a', t: '#2a3038' },
    shelf: { w: 24, h: 10, c: '#5a4a3a', t: '#2a2018' },
  };
  function trapGoes(game, it) {
    const P = game.player, kind = it.props.trap;
    it.props.trap = null;
    if (kind === 'explode') {
      game.toast('Click.', 'warn');
      game.schedule(0.35, () => LM.combat.explode(game, it.x, it.y, { radius: 70, damage: 34, owner: 'enemy', color: '#ffb060' }));
    } else if (kind === 'shock') {
      HN.shockPlayer(game, 14);
      game.toast('The handle is live.', 'warn');
    } else if (kind === 'card') {
      HN.ITEMS['hn-insulting-card'].use(game, P);
    }
  }
  function openCache(game, it) {
    const p = it.props, uid = uidOf(it, game);
    if (p.needFlag && !game.anyFlag(p.needFlag)) {
      LM.audio.play('locked');
      return game.toast(p.needText || 'Locked.', 'warn');
    }
    const finish = () => {
      it.emptied = true;
      game.stats.chests++;
      if (p.trap) trapGoes(game, it);
      const got = HN.award(game, uid, p.loot || [], p.name || 'Found');
      if (!got) game.toast('Empty. You already took what was here.', 'warn');
      if (p.flag) HN.setFlag(game, p.flag);
      if (p.onOpen && HN.CACHE_HOOKS[p.onOpen]) HN.CACHE_HOOKS[p.onOpen](game, it);
      LM.audio.play('open');
    };
    const contents = (p.loot || []).filter((e) => e && e.type !== 'flag').map((e) => HN.lootName(e)).filter(Boolean);
    const actions = [];
    if (p.code && !it.unlocked) {
      const known = p.codeFlag && game.anyFlag(p.codeFlag);
      if (known) actions.push({ label: 'Enter ' + p.code + ' (from the memo)', primary: true, key: 'E', onClick: () => { it.unlocked = true; LM.audio.play('key'); finish(); } });
      actions.push({
        label: 'Hack the keypad', primary: !known, onClick: () => setTimeout(() => HN.hack(game, {
          kicker: p.name || 'Keypad', title: 'A three-digit keypad', difficulty: p.hackDiff || 9,
          text: 'Somebody wrote the code down somewhere, because somebody always does. Or you could argue with the keypad.',
          risk: 'it bites (a small electric shock). You can try again.',
          onSuccess: () => { it.unlocked = true; finish(); },
          onFail: () => HN.shockPlayer(game, 8),
        }), 0),
      });
      actions.push({ label: 'Leave it', quiet: true });
      return LM.ui.open({ kicker: p.kicker || 'Locked', title: p.name || 'A locker', body: h('div', null, lore(p.text || 'A keypad wants three digits.'), h('p', { class: 'muted' }, 'Code lock. The code is written down somewhere on this floor.')), actions });
    }
    LM.ui.open({
      kicker: p.kicker || ({ corpse: 'Someone got this far', desk: 'Desk', register: 'Cash register', safe: 'Safe', case: 'Display case', locker: 'Locker', shelf: 'Shelf' })[p.kind || 'locker'],
      title: p.name || 'A locker',
      body: h('div', null, lore(p.text || 'Whatever is inside has been waiting a long time.'), contents.length && !HN.hasFound(game, uid) ? h('p', { class: 'muted' }, 'Inside: ' + contents.join(', ')) : null,
        p.trap && p.trapHint ? h('p', { class: 'muted' }, p.trapHint) : null),
      actions: [{ label: 'Take it', primary: true, key: 'E', onClick: finish }, { label: 'Leave it', quiet: true }],
    });
  }
  HN.CACHE_HOOKS = HN.CACHE_HOOKS || {};

  // ------------------------------------------------------------ crates
  function openCrate(game, it, how) {
    if (it.opened) return;
    it.opened = true;
    const p = it.props, c = p.contents || 'treasure';
    LM.audio.play('open');
    game.particles.burst(it.x, it.y, 14, { type: 'chunk', color: '#7a6a4a', speed: 120, life: 0.6, size: 1.6, drag: 4 });
    if (how === 'pry') for (const e of game.enemies) if (!e.dead && U.dist(e.x, e.y, it.x, it.y) < 300) e.alert(game, false);
    if (c === 'robots') {
      game.toast('The crate was packed with an attack robot. Shipping status: delivered.', 'warn');
      for (let i = 0; i < (p.count || 1); i++) game.spawnEnemy(p.enemy || 'hn-maintbot', it.x + U.rand(-8, 8), it.y + U.rand(-8, 8), { aggro: true, summoned: true });
    } else if (c === 'body') {
      game.toast('An embalmed body in a business suit, with a name tag: HELLO, MY NAME IS EMPLOYEE.', 'warn');
      if (p.loot) HN.award(game, uidOf(it, game), p.loot, 'The body’s pockets');
    } else if (c === 'balls') {
      game.toast('Hundreds of ping-pong balls bounce out across the floor.', 'good');
      game.particles.burst(it.x, it.y, 60, { type: 'dot', color: '#f4f0e0', speed: 220, life: 1.6, size: 1.6, drag: 1.2 });
      HN.award(game, uidOf(it, game), [{ hn: 'hn-ping-pong' }], 'Crate');
    } else HN.award(game, uidOf(it, game), p.loot || [{ type: 'gold', amount: 40 }], 'Crate');
    it.remove(game);
  }

  // ------------------------------------------------------------ the near-area exit
  HN.toMap = function (game) {
    if (!LM.find('levels', 'hn-area-map')) return game.toast('The area map isn’t built.', 'warn');
    game.travel('hn-area-map', { sound: 'ascend' });
  };

  const AD_TEXT = [
    ['DYNAMO-FIZZ: Now with 40% less involuntary personality restructuring!', '#ff4ad8'],
    ['HYPNO-TAB™: Be the employee your manager already thinks you are.', '#22e6ff'],
    ['TIRED? THAT’S THEFT. Productivity is a gift you give the company.', '#ffe04a'],
    ['VERT-O-MATIC: Want something? Want it more.', '#9dff3a'],
    ['THIS AD HAS NOTICED YOU. Thank you for noticing it back.', '#ff4ad8'],
  ];

  const items = {
    'hn-loot': {
      name: 'Find', radius: 6, bob: true, shadowScale: 0.6, magnet: 40,
      hnValuable: () => true,
      onTouch(it, game) {
        const n = it.props.n || 1;
        if (it.props.uid) {
          if (!HN.award(game, it.props.uid, [{ hn: it.props.hn, n }], it.props.from)) return;
        } else HN.give(game, it.props.hn, n);
      },
      draw(g, it) {
        const d = HN.ITEMS[it.props.hn] || { icon: {} };
        if (HN.drawIconArt && HN.drawIconArt(g, d, 13)) return;
        const c = (d.icon && d.icon.color) || '#c8a060';
        g.fillStyle = '#141210';
        G.roundRect(g, -5.5, -5.5, 11, 11, 2);
        g.fill();
        g.fillStyle = c;
        G.roundRect(g, -4.5, -4.5, 9, 9, 2);
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(-2, -2, 4, 4);
      },
      drawGlow(g, it, t) {
        const d = HN.ITEMS[it.props.hn] || { icon: {} };
        G.glow(g, 0, 0, 11, (d.icon && d.icon.color) || '#c8a060', 0.3 + 0.12 * Math.sin(t * 3 + it.t));
      },
    },
    'hn-cache': {
      name: 'Cache', radius: 11, solid: true, solidRadius: 10, isChest: true, mapColor: '#e0b25a',
      init(it) { it.emptied = !!it.emptied; },
      hnValuable: (it) => !it.emptied,
      hnThreat: (it) => (it.props.trap === 'explode' ? 'EXPLOSIVE' : it.props.trap ? 'LIVE' : null),
      hnContents: (it) => (it.emptied ? 'EMPTY' : (it.props.loot || []).map((e) => HN.lootName(e)).slice(0, 2).join(', ')),
      interact: {
        available: (it) => !it.emptied,
        prompt: (it) => (it.props.verb || ({ corpse: 'Search ', desk: 'Search ', register: 'Open ', safe: 'Open ', case: 'Open ', shelf: 'Look at ' })[it.props.kind] || 'Open ') + (it.props.name ? 'the ' + it.props.name.replace(/^the /i, '') : 'it'),
        use: (it, game) => openCache(game, it),
      },
      draw(g, it) {
        const L = CACHE_LOOK[it.props.kind || 'locker'];
        if (it.props.kind === 'corpse') {
          g.fillStyle = '#1a1410';
          g.beginPath();
          g.ellipse(0, 0, 10, 6, 0.4, 0, U.TAU);
          g.fill();
          g.fillStyle = it.props.color || '#5a4a3a';
          g.beginPath();
          g.ellipse(-1, 0, 8.5, 5, 0.4, 0, U.TAU);
          g.fill();
          G.circle(g, 7, 3.5, 3.2, '#c8b8a0');
          g.fillStyle = '#3a2a1a';
          g.fillRect(-6, -2, 5, 4);
          return;
        }
        g.fillStyle = L.t;
        g.fillRect(-L.w / 2 - 1, -L.h / 2 - 1, L.w + 2, L.h + 2);
        g.fillStyle = it.emptied ? U.shade(L.c, -0.25) : L.c;
        g.fillRect(-L.w / 2, -L.h / 2, L.w, L.h);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(-L.w / 2, -L.h / 2, L.w, 2);
        if (it.props.kind === 'locker') for (let i = -1; i <= 1; i++) g.fillRect(i * 6 - 0.5, -L.h / 2 + 2, 1, L.h - 4);
        if (it.props.code && !it.unlocked) {
          g.fillStyle = '#1a1c20';
          g.fillRect(L.w / 2 - 6, -3, 4, 6);
        }
        if (it.props.kind === 'case') {
          g.fillStyle = 'rgba(180,220,255,0.25)';
          g.fillRect(-L.w / 2 + 2, -L.h / 2 + 2, L.w - 4, L.h - 4);
        }
      },
      drawGlow(g, it, t) {
        if (it.emptied) return;
        if (it.props.code && !it.unlocked) G.glow(g, 8, 0, 6, '#ff5a3a', 0.4 + 0.2 * Math.sin(t * 4));
        else G.glow(g, 0, 0, 12, '#f2c96b', 0.14 + 0.06 * Math.sin(t * 2 + it.t));
      },
    },
    'hn-crate': {
      name: 'Packing crate', radius: 12, solid: 'rect', mapColor: '#a88a5a',
      init(it) { it.box = [26, 22]; },
      destructible: { hp: 60, onBreak: (it, game) => { it.dead = false; openCrate(game, it, 'break'); } },
      hnValuable: (it) => !it.opened && it.props.contents === 'treasure',
      hnThreat: (it) => (it.props.contents === 'robots' ? 'ROBOT' : null),
      hnContents: (it) => ({ robots: 'ATTACK ROBOT', treasure: 'GOODS', body: 'A BODY', balls: 'SPHERES (MANY)' })[it.props.contents || 'treasure'],
      interact: {
        available: (it) => !it.opened,
        prompt: 'Pry the crate open',
        use(it, game) {
          LM.ui.open({
            kicker: 'Packing crate', title: it.props.label || 'FRAGILE · THIS END UP · DO NOT FEED',
            body: h('div', null, lore('Heavy agency shipping crate, nailed and banded. The stencils make no sense: a skull wearing a party hat, the words NET WT 1 EMPLOYEE, and a cheerful arrow pointing at nothing.'), h('p', { class: 'muted' }, 'Prying it open is loud and wakes things nearby. Breaking it (shoot or melee) is louder still, but you stay back.')),
            actions: [{ label: 'Pry it open', primary: true, key: 'E', onClick: () => openCrate(game, it, 'pry') }, { label: 'Leave it', quiet: true }],
          });
        },
      },
      draw(g, it) {
        g.fillStyle = '#2a2014';
        g.fillRect(-14, -12, 28, 24);
        g.fillStyle = '#8a6e44';
        g.fillRect(-13, -11, 26, 22);
        g.fillStyle = '#6a5232';
        for (const y of [-6, 0, 6]) g.fillRect(-13, y - 0.6, 26, 1.2);
        g.fillStyle = '#3a3a3e';
        g.fillRect(-13, -11, 3, 22);
        g.fillRect(10, -11, 3, 22);
        g.fillStyle = '#1a1410';
        g.font = '700 5px monospace';
        g.textAlign = 'center';
        g.fillText('☠', 0, 2);
      },
    },
    'hn-cookie-box': {
      name: 'Good Job Cookies', radius: 7, mapColor: '#c8924a',
      hnValuable: (it) => !it.props.trapped,
      hnThreat: (it) => (it.props.trapped ? 'EXPLOSIVE' : null),
      interact: {
        prompt: 'Look at the EMPLOYEE TREAT box',
        use(it, game) {
          const trapped = !!it.props.trapped;
          const sensed = trapped && (HN.count(game, 'hn-threat-sensor') > 0 || game.time < HN.scanUntil);
          const actions = [{
            label: 'Take the cookies', primary: !trapped, key: trapped ? null : 'E',
            onClick: () => {
              it.remove(game);
              if (trapped) {
                game.toast('The lid lifts. Something under it clicks.', 'warn');
                game.schedule(0.4, () => LM.combat.explode(game, it.x, it.y, { radius: 80, damage: 40, owner: 'enemy', color: '#ffb060' }));
              } else HN.award(game, uidOf(it, game), [{ hn: 'hn-cookies' }], 'EMPLOYEE TREAT');
            },
          }];
          if (sensed) actions.unshift({ label: 'Disarm the charge (the sensor shows the wire)', primary: true, key: 'E', onClick: () => { it.remove(game); HN.award(game, uidOf(it, game), [{ hn: 'hn-cookies' }, { hn: 'hn-grenade' }], 'Disarmed'); game.toast('You lift out the charge. The cookies are fine. The charge makes a decent grenade.', 'good'); } });
          actions.push({ label: 'Leave it', quiet: true });
          LM.ui.open({
            kicker: 'Age of War snack', title: 'EMPLOYEE TREAT · GOOD JOB COOKIES',
            body: h('div', null, lore('A cheerful box with a gold star on the lid: “YOU DID A GOOD JOB!”'),
              lore(trapped ? 'It is heavier than a box of cookies should be. The lid is taped down at the corners, and when you hold your breath you can hear it tick, very faintly.' : 'It smells of butter and sugar and centuries. The tape on the lid was opened and closed again, long ago.'),
              sensed ? h('p', { class: 'muted' }, 'The Threat Sensor chirps: explosive.') : null),
            actions,
          });
        },
      },
      draw(g, it) {
        g.fillStyle = '#2a1a10';
        g.fillRect(-7, -5, 14, 10);
        g.fillStyle = it.props.trapped ? '#d8b05a' : '#e0b860';
        g.fillRect(-6, -4, 12, 8);
        g.fillStyle = '#c83a2a';
        g.fillRect(-6, -1, 12, 2);
        G.circle(g, 0, 0, 2.2, '#ffe04a');
        if (it.props.trapped) {
          g.fillStyle = 'rgba(200,200,190,0.8)';
          g.fillRect(-6, -4, 2, 2);
          g.fillRect(4, 2, 2, 2);
        }
      },
      drawGlow(g, it, t) { G.glow(g, 0, 0, 9, '#ffe04a', 0.15 + 0.05 * Math.sin(t * 2)); },
    },
    'hn-mist': {
      name: 'Mist generator', radius: 9, solid: true, mapColor: '#8a9a8a',
      hnThreat: (it, game) => (it.props.toxic && !(game && HN.flag(game, 'hnMistOff')) ? 'TOXIC' : null),
      init(it) { it.seed = U.hash2(it.tx, it.ty, 41); },
      update(it, dt, game) {
        const P = game.player;
        if (!P || game.attract) return;
        const off = it.props.toxic && HN.flag(game, 'hnMistOff');
        if (!off && Math.random() < dt * 9) {
          const a = Math.random() * U.TAU, r = Math.random() * 30;
          game.particles.add({ type: 'smoke', x: it.x + Math.cos(a) * r, y: it.y + Math.sin(a) * r, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12 - 4, life: 1.6, size: U.rand(6, 10), color: it.props.toxic ? '#b8c84a' : '#d8e0e8', alpha: it.props.toxic ? 0.22 : 0.16, drag: 0.6 });
        }
        if (it.props.toxic && !off && U.dist(P.x, P.y, it.x, it.y) < 2.6 * T && !P.dead) LM.status.apply(game, P, 'hn-toxic', { seconds: 1 });
      },
      draw(g, it) {
        g.fillStyle = '#1a1c1e';
        G.circle(g, 0, 0, 9, '#1a1c1e');
        G.circle(g, 0, 0, 7.4, it.props.toxic ? '#5a6040' : '#5a6068');
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          G.circle(g, Math.cos(a) * 4.5, Math.sin(a) * 4.5, 1.1, '#141618');
        }
        // the tell: toxic units have a yellow hazard band, the harmless ones a blue "AMBIANCE" band
        g.fillStyle = it.props.toxic ? '#e0c030' : '#4a9ad8';
        g.fillRect(-7, 6, 14, 2.2);
      },
      drawGlow(g, it, t) { G.glow(g, 0, 0, 12, it.props.toxic ? '#c8e84a' : '#9fd8ff', 0.18 + 0.08 * Math.sin(t * 3 + it.seed * 9)); },
      interact: {
        prompt: 'Read the mist generator’s plate',
        use: (it) => LM.ui.showText(it.props.toxic ? 'PEST MANAGEMENT · KEEP OUT OF CLOUD' : 'AMBIANCE UNIT · PROTOTYPE LAB MOOD', it.props.toxic ? 'Yellow band. The plate reads: “Primogen-class deterrent. Harmless to authorized employees.” You are not an authorized employee. A filter mask or Anti-Tox would see you through.' : 'Blue band. “Scented fog for a more creative workspace. Fragrance: Ocean of Ambition.” It smells like wet cardboard. Harmless.', 'Mist generator'),
      },
    },
    'hn-health-station': {
      name: 'Health station', radius: 6, wallMounted: true, shadow: false, mapColor: '#ff6a6a',
      light: { color: '#ff6a6a', radius: 70, intensity: 0.4, flicker: 0.04 },
      init(it) { if (it.charge == null) it.charge = it.props.charge || 60; },
      hnValuable: (it) => it.charge > 0,
      interact: {
        available: (it) => it.charge > 0,
        prompt: (it) => 'Use the health station (' + Math.round(it.charge) + ' left)',
        use(it, game) {
          const P = game.player;
          const want = Math.min(it.charge, P.stats().maxHp - P.hp);
          if (want <= 0) return game.toast('“You appear to be in perfect health. Please return to work.”', 'warn');
          const got = LM.combat.heal(game, P, want);
          it.charge -= got;
          LM.audio.play('heal');
          game.toast('“Wellness dispensed. This has been noted in your file.” (' + Math.round(it.charge) + ' left)', 'good');
        },
      },
      draw(g, it) {
        wallRot(g, it);
        g.fillStyle = '#1a1a1c';
        g.fillRect(-7, -6, 14, 9);
        g.fillStyle = it.charge > 0 ? '#e8e0d8' : '#6a6460';
        g.fillRect(-6, -5, 12, 7);
        g.fillStyle = '#d23a3a';
        g.fillRect(-1, -4.5, 2, 6);
        g.fillRect(-3, -2.5, 6, 2);
      },
    },
    'hn-shopper': {
      name: 'Personal Shopper Tablet', radius: 10, solid: true, mapColor: '#ff4ad8',
      light: { color: '#ff4ad8', radius: 110, intensity: 0.5, flicker: 0.12 },
      init(it) { if (it.sold == null) it.sold = 0; },
      interact: {
        prompt: 'Watch the Personal Shopper Tablet',
        use(it, game) {
          const P = game.player;
          const stock = it.props.stock || HN.SHOPPER_STOCK;
          const left = (it.props.limit || 4) - it.sold;
          const offer = stock[(it.sold + (it.props.offset || 0)) % stock.length];
          const d = HN.ITEMS[offer.hn];
          LM.ui.open({
            kicker: 'Personal Shopper Tablet (Vol 3)', title: left > 0 ? 'ORDER NOW: ' + d.name.toUpperCase() : 'SOLD OUT FOREVER',
            body: h('div', null, lore('A 24-inch tablet on a stand. An excited voice drones about the product in a language that might be yours: you MUST have this, and you should ORDER NOW.'),
              left > 0 ? [lore('“' + offer.pitch + '”'), h('p', { class: 'muted' }, d.desc), h('p', { class: 'muted' }, 'Feed it ' + offer.price + ' credits (you have ' + P.gold + '). Deliveries left before the slot jams: ' + left + '.')] : lore('The screen shows a single tear rolling down a cartoon credit chip.')),
            actions: left > 0 ? [
              { label: 'Feed it ' + offer.price + 'c', primary: true, key: 'E', disabled: P.gold < offer.price, onClick: () => { P.gold -= offer.price; it.sold++; LM.audio.play('coin'); game.particles.burst(it.x, it.y - 8, 20, { type: 'ember', color: '#ff9af0', speed: 70, life: 0.8, size: 1.2 }); HN.give(game, offer.hn, 1, { from: 'it materializes' }); } },
              { label: 'Not now', quiet: true },
            ] : [{ label: 'Close', primary: true }],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#121214';
        g.fillRect(-11, -8, 22, 15);
        g.fillStyle = '#2a1a2a';
        g.fillRect(-10, -7, 20, 12);
        g.fillStyle = '#3a3a40';
        g.fillRect(-2, 7, 4, 4);
      },
      drawGlow(g, it, t) {
        const k = 0.5 + 0.5 * Math.sin(t * 6);
        G.glow(g, 0, -1, 14, k > 0.5 ? '#ff4ad8' : '#22e6ff', 0.5);
        g.fillStyle = 'rgba(255,220,250,0.8)';
        g.fillRect(-8, -5, 16 * k, 1.5);
      },
    },
    'hn-terminal': {
      name: 'Terminal', radius: 9, solid: true, mapColor: '#5ab8e8',
      light: { color: '#5ab8e8', radius: 70, intensity: 0.35, flicker: 0.06 },
      hnValuable: (it, game) => !!(it.props.flag && !game.anyFlag(it.props.flag)),
      interact: {
        prompt: (it) => 'Use the ' + (it.props.title || 'terminal'),
        use(it, game) {
          const act = HN.TERMINALS[it.props.action];
          if (act) return act(game, it);
          const p = it.props;
          if (p.flag && game.anyFlag(p.flag)) return LM.ui.showText(p.title || 'Terminal', p.doneText || 'The terminal shows a green tick and nothing else to do.', 'Terminal');
          if (!p.difficulty) {
            if (p.flag) HN.setFlag(game, p.flag);
            return LM.ui.showText(p.title || 'Terminal', p.text || 'Static and old memos.', 'Terminal');
          }
          HN.hack(game, {
            kicker: 'Terminal', title: p.title || 'Terminal', text: p.text, difficulty: p.difficulty, risk: p.risk || 'a jolt through the keys (electrical).', override: !!p.override,
            onSuccess: (g) => { if (p.flag) HN.setFlag(g, p.flag); if (p.successText) setTimeout(() => LM.ui.showText(p.title || 'Terminal', p.successText, 'Hacked'), 0); },
            onFail: (g) => HN.failHack(g, it, p.fail || 'shock'),
          });
        },
      },
      draw(g) {
        g.fillStyle = '#16181c';
        g.fillRect(-10, -8, 20, 16);
        g.fillStyle = '#2a3038';
        g.fillRect(-9, -7, 18, 9);
        g.fillStyle = '#3a4048';
        g.fillRect(-9, 3, 18, 4);
        g.fillStyle = '#1a1c20';
        for (let i = -7; i < 8; i += 3) g.fillRect(i, 4, 2, 2);
      },
      drawGlow(g, it, t, game) {
        const done = it.props.flag && game && game.anyFlag(it.props.flag);
        G.glow(g, 0, -3, 12, done ? '#4ad88a' : '#5ab8e8', 0.4 + 0.1 * Math.sin(t * 3 + it.t));
        g.fillStyle = done ? 'rgba(120,255,170,0.6)' : 'rgba(150,220,255,0.6)';
        for (let i = 0; i < 3; i++) g.fillRect(-7, -5.5 + i * 2.4, 6 + ((Math.sin(t * 2 + i) + 1) * 4), 0.8);
      },
    },
    'hn-sec-panel': {
      name: 'Security panel', radius: 5, wallMounted: true, shadow: false, mapColor: '#ff5a3a',
      interact: {
        available: (it, game) => !game.anyFlag(it.props.flag),
        prompt: (it) => 'Hack the ' + (it.props.title || 'security door'),
        use(it, game) {
          const p = it.props;
          if (p.cardFlag && game.anyFlag(p.cardFlag)) {
            HN.setFlag(game, p.flag);
            LM.audio.play('key');
            return game.toast((p.cardName || 'The card') + ' opens the security door.', 'key');
          }
          HN.hack(game, {
            kicker: 'Security door', title: p.title || 'SECURITY DOOR · AUTHORIZED STAFF ONLY',
            text: p.text || 'A heavy door with a grey panel. The panel asks for a card or a manager. It will settle for being out-argued.',
            difficulty: p.difficulty || 11, override: true,
            risk: p.fail === 'shock' ? 'a jolt through the keys (electrical). You can try again.' : 'the building raises its threat level: an alarm, and something comes to look. You can try again.',
            onSuccess: (g) => { HN.setFlag(g, p.flag); g.toast(p.okText || 'The security door unlocks with a polite chime.', 'key'); },
            onFail: (g) => HN.failHack(g, it, p.fail || 'alarm'),
          });
        },
      },
      draw(g, it, t, game) {
        wallRot(g, it);
        const open = game && game.anyFlag(it.props.flag);
        g.fillStyle = '#121214';
        g.fillRect(-5, -6, 10, 8);
        g.fillStyle = open ? '#2a5a3a' : '#5a2a2a';
        g.fillRect(-4, -5, 8, 6);
      },
      drawGlow(g, it, t, game) {
        wallRot(g, it);
        const open = game && game.anyFlag(it.props.flag);
        G.glow(g, 0, -2, 7, open ? '#4ad88a' : '#ff5a3a', 0.5 + 0.2 * Math.sin(t * 4));
      },
    },
    'hn-kiosk': {
      name: 'Help desk kiosk', radius: 9, solid: true, mapColor: '#22e6ff',
      light: { color: '#22e6ff', radius: 90, intensity: 0.45, flicker: 0.05 },
      interact: {
        prompt: 'Ask the help desk kiosk',
        use(it, game) {
          const reveal = () => {
            game.level.explored.fill(1);
            it.used = true;
            LM.audio.play('key');
            game.toast('The kiosk prints a floor map onto your minimap. “Have a wonderful visit!”', 'key');
            HN.note(game, 'map', 'A help desk kiosk mapped ' + (game.level.def.floorLabel || game.level.def.name) + '.');
          };
          if (it.used) return LM.ui.showText('HELP DESK', 'YOU ARE HERE. You are always here. The map is already on your minimap.', 'Kiosk');
          if (game.hasKeyItem('hn-badge')) return LM.ui.open({ kicker: 'Help desk', title: 'WELCOME, EMPLOYEE', body: lore(it.props.text || 'The kiosk reads your badge and brightens. “How can I help you be more productive today?”'), actions: [{ label: 'Show me the floor', primary: true, key: 'E', onClick: reveal }, { label: 'Never mind', quiet: true }] });
          HN.hack(game, {
            kicker: 'Help desk kiosk', title: 'PLEASE PRESENT YOUR EMPLOYEE BADGE',
            text: (it.props.text || 'A friendly kiosk with a cartoon face.') + ' Without a badge it wants convincing. (An ID badge would make it helpful.)',
            difficulty: 7, risk: 'a small shock, and it calls you a “visitor” in a hurt voice. You can try again.',
            onSuccess: reveal, onFail: () => HN.shockPlayer(game, 6),
          });
        },
      },
      draw(g) {
        g.fillStyle = '#16181c';
        G.roundRect(g, -9, -9, 18, 18, 4);
        g.fill();
        g.fillStyle = '#1e3a4a';
        G.roundRect(g, -7, -7, 14, 11, 3);
        g.fill();
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, -2, 14, '#22e6ff', 0.45 + 0.1 * Math.sin(t * 2));
        G.circle(g, -2.5, -3, 1, '#e0ffff');
        G.circle(g, 2.5, -3, 1, '#e0ffff');
        g.strokeStyle = 'rgba(220,255,255,0.8)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.arc(0, -1, 2.6, 0.3, Math.PI - 0.3);
        g.stroke();
      },
    },
    'hn-safety-sign': {
      name: 'Safety sign', radius: 6, wallMounted: true, shadow: false,
      interact: { prompt: 'Read the safety sign', use: (it) => LM.ui.showText(it.props.short || 'SAFETY FIRST', it.props.text || 'A pictogram of a stick figure being hit by a falling crate, and a smiling stick figure who was wearing a hard hat. Maintenance robots were trained on these for centuries. They still stop to read them.', 'Workplace safety sign') },
      draw(g, it) {
        wallRot(g, it);
        g.translate(0, -2);
        g.fillStyle = '#141210';
        g.fillRect(-7, -5, 14, 10);
        g.fillStyle = '#e8d030';
        g.fillRect(-6, -4, 12, 8);
        g.fillStyle = '#141210';
        g.beginPath();
        g.moveTo(0, -3); g.lineTo(3.5, 3); g.lineTo(-3.5, 3); g.closePath();
        g.fill();
        g.fillStyle = '#e8d030';
        g.fillRect(-0.4, -1.2, 0.8, 2.4);
      },
    },
    'hn-ad-screen': {
      name: 'Ad screen', radius: 7, wallMounted: true, shadow: false,
      light: (it, game) => (game && HN.flag(game, 'hnAdsSilent') ? null : { color: AD_TEXT[(it.props.ad || 0) % AD_TEXT.length][1], radius: 100, intensity: 0.45, flicker: 0.1 }),
      interact: {
        prompt: 'Watch the ad',
        use: (it, game) => LM.ui.showText(HN.flag(game, 'hnAdsSilent') ? 'A dark screen' : 'NOW SHOWING', HN.flag(game, 'hnAdsSilent') ? 'The screen is dark. Reflected in it, for the first time in three hundred years, is someone who isn’t being sold anything.' : AD_TEXT[(it.props.ad || 0) % AD_TEXT.length][0] + '\n\nThe colors swirl in a pattern that makes your thumbs want to sign something.', 'Ad screen'),
      },
      draw(g, it) {
        wallRot(g, it);
        g.translate(0, -2);
        g.fillStyle = '#0a0a0c';
        g.fillRect(-11, -5, 22, 9);
      },
      drawGlow(g, it, t, game) {
        if (game && HN.flag(game, 'hnAdsSilent')) return;
        wallRot(g, it);
        g.translate(0, -2);
        const col = AD_TEXT[(it.props.ad || 0) % AD_TEXT.length][1];
        G.glow(g, 0, 0, 16, col, 0.55 + 0.2 * Math.sin(t * 5 + it.tx));
        g.fillStyle = U.rgba(col, 0.9);
        for (let i = 0; i < 3; i++) g.fillRect(-9 + ((t * 12 + i * 7) % 18), -3 + i * 2.2, 4, 1);
      },
    },
    'hn-exit': {
      name: 'Way out', radius: 9, mapColor: '#9dff3a', mapAlways: true,
      light: { color: '#9dff3a', radius: 80, intensity: 0.4, flicker: 0.05 },
      interact: {
        prompt: (it) => it.props.prompt || 'Go back out to the near-area map',
        use: (it, game) => {
          if (it.props.confirm === false) return HN.toMap(game);
          LM.ui.open({
            kicker: game.level.def.name, title: it.props.title || 'Leave for the near-area map?',
            body: lore(it.props.text || 'Daylight, wind, and the long walk back. This place will remember how you left it.'),
            actions: [{ label: 'Go', primary: true, key: 'E', onClick: () => HN.toMap(game) }, { label: 'Stay', quiet: true }],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#1a1c14';
        g.fillRect(-9, -6, 18, 12);
        g.fillStyle = '#2a3a1a';
        g.fillRect(-8, -5, 16, 10);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 14, '#9dff3a', 0.4 + 0.15 * Math.sin(t * 2));
        g.fillStyle = 'rgba(210,255,170,0.95)';
        g.font = '700 4.5px monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('EXIT', 0, 0.4);
      },
    },
  };

  // what a failed hack does: a shock, an alarm (and a visitor), or robots
  HN.failHack = function (game, it, kind) {
    if (kind === 'shock') return HN.shockPlayer(game, 12);
    const P = game.player;
    if (kind === 'alarm' || kind === 'robots') {
      game.toast(kind === 'alarm' ? 'THREAT LEVEL RAISED. A security unit is on its way to assist you.' : 'MAINTENANCE REQUESTED. Units dispatched.', 'warn');
      LM.audio.play('alarm');
      const L = game.level;
      const spots = (L.tags.threat || []).slice().sort((a, b) => U.dist2(a.x * T, a.y * T, P.x, P.y) - U.dist2(b.x * T, b.y * T, P.x, P.y));
      const at = spots[0] ? { x: spots[0].x * T + T / 2, y: spots[0].y * T + T / 2 } : { x: it.x + 40, y: it.y };
      const n = kind === 'alarm' ? 2 : 1;
      for (let i = 0; i < n; i++) game.spawnEnemy(kind === 'alarm' ? 'hn-knife' : 'hn-maintbot', at.x + U.rand(-10, 10), at.y + U.rand(-10, 10), { aggro: true, summoned: true });
      HN.st(game).threat = (HN.st(game).threat || 0) + 1;
    }
  };
  HN.TERMINALS = HN.TERMINALS || {};

  HN.SHOPPER_STOCK = [
    { hn: 'hn-cookies', price: 250, pitch: 'GOOD JOB! You did a GOOD JOB! Reward yourself with a GOOD JOB!' },
    { hn: 'hn-anti-tox', price: 50, pitch: 'Breathe EASY, breathe ANYTHING!' },
    { hn: 'hn-health-charge', price: 30, pitch: 'Ouch? OUCH NO MORE! Now in Cherry!' },
    { hn: 'hn-insulting-card', price: 15, pitch: 'Tell them how you REALLY feel! Hammermark!' },
    { hn: 'hn-hypno-tab', price: 80, pitch: 'Be the employee your manager ALREADY THINKS YOU ARE.' },
    { hn: 'hn-mug', price: 8, pitch: 'Synergy you can DRINK.' },
  ];

  LM.definePack({ id: 'hn-rules', items });
})();
