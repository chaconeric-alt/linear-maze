/* HaveNot — packs/hn-greasy/fixtures.js
 * The Greasy Bolt Hole’s looks, floors and furniture.
 *
 *   Looks: 'hn-greasy-bunker' (the upper bunker: oily plate, soot, one spotless san-station) and 'hn-greasy-works'
 *   (the robot works below: paradoxically lovely marble, terrazzo and gold, under three centuries of filth).
 *
 *   Terrain
 *     hn-belt       a conveyor floor (the glowing > > > arrows): it carries you, helplessly, the way it runs. Turn it
 *                   with the legend’s rot (0 east, 1 south, 2 west, 3 north). A level’s hnBelts: { tag: { flag } }
 *                   reverses every belt tile with that tag while the flag is set. A dash gets you off.
 *     hn-grime      floor under a crust of old grease; hn-drip: floor with green drip stains (a goop trap above)
 *     door style 'blast': the heavy armored doors
 *
 *   Trap effect 'hn-goop': the ceiling dumps toxic goop on you (status hn-drenched) unless hnGoopOff.
 *
 *   Items
 *     hn-gposter    a wall poster: props { kind: 'enoch' | 'egg' | 'slogan', title, text }
 *     hn-exhibit    a museum case: props { kind, title, text, loot, uid }
 *     hn-belt-lever reverses a conveyor group: props { flag, title, difficulty (0: no hack) }
 *     hn-control    the upper bunker’s control room console (lift, goop traps, turrets)
 *     hn-vat        a grease vat: refills the Grease Thrower
 *     hn-decon      a decontamination shower: washes goop off (the san-station’s has never been used)
 *     hn-forge      an Eggbot forge: makes Class-1 Eggbots while it runs (shut it down at its panel, or break it)
 *     hn-machine    big works machinery (props { kind: 'press' | 'mold' | 'kiln' | 'drum', w, h })
 *     hn-gm-shell   a dormant Grease Monkey shell with a Grease Thrower on its back (hack it loose, or wake it)
 *     hn-specimen   a rack of tubes (Rare Slime, Exotic Filth): props { uid, loot }
 *     hn-giftshop   the museum gift shop
 *     hn-throne     the Greasing Throne (in eggbots.js’ neighbour: the trial is here)
 *     hn-bunk       a bunk (eight of them in the quarters)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;
  const lore = (t) => h('p', { class: 'lore' }, t);
  const flag = (game, f) => HN.flag(game, f);
  const wallRot = (g, it) => g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);

  // ------------------------------------------------------------ looks
  const doorStyles = {
    blast(ctx, door) {
      const k = U.ease.inOutSine(door.open);
      const across = door.across !== false;
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!across) ctx.rotate(Math.PI / 2);
      const slide = k * (T - 3);
      ctx.translate(-slide, 0);
      ctx.fillStyle = '#16140a';
      ctx.fillRect(-T / 2, -7, T, 14);
      ctx.fillStyle = '#4a4630';
      ctx.fillRect(-T / 2 + 1, -6, T - 2, 12);
      ctx.fillStyle = '#e0c030';
      for (let i = -T / 2 + 2; i < T / 2 - 2; i += 6) ctx.fillRect(i, -6, 3, 12);
      ctx.fillStyle = 'rgba(30,26,10,0.7)';
      ctx.fillRect(-T / 2 + 1, -2, T - 2, 4);
      if (door.flag && !door.unlocked) {
        ctx.fillStyle = door.flagColor || '#ff5a3a';
        ctx.fillRect(-2, -2, 4, 4);
      }
      ctx.restore();
    },
  };
  const doorGlows = {
    blast(ctx, door, game, t) {
      if (door.open > 0.8 || !door.flag || door.unlocked) return;
      G.glow(ctx, door.x, door.y, 14, door.flagColor || '#ff5a3a', 0.25 + 0.15 * Math.sin(t * 3));
    },
  };
  const SOOT_WALL = { style: 'bulkhead', top: ['#2e2a20', '#2a261c', '#322e22'], seam: '#100e08', bolt: '#6a6448', rust: '#4a3a18', edge: '#5a5438', face: '#1e1a12', stripe: ['#c8b030', '#141008'] };
  const WORKS_WALL = { style: 'drywall', top: ['#e8dcc0'], edge: '#fff6e0', face: '#c8b890', faceDark: '#9a8a64', base: '#5a4a2a' };
  const environments = {
    'hn-greasy-bunker': {
      name: 'The Greasy Bolt Hole · Bunker', voidColor: '#060504', ambient: '#2e2a1e', attractAmbient: '#4a4430', outsideSight: '#1e1c14', playerLight: '#fff0c8', torch: '#e0c060',
      floors: {
        0: { style: 'plates', colors: ['#3a3628', '#363224', '#3e3a2a'], seam: '#14120a', rivet: '#6a6448', rust: '#4a3a18', stripe: ['#c8b030', '#141008'] },
        1: { style: 'grate', bar: '#36321e', under: '#060604', heat: '#8a9a2a' },
        2: { style: 'carpet-warped', colors: ['#4a3e26', '#463a22'], line: '#7a6a3a', concrete: '#3a3628', stain: '#14120a', wrong: '#5a5a1a' },
        3: { style: 'bath-tile', tile: '#eef2f4', grout: '#c8d0d4', accent: '#9fd8ff' },
        4: { style: 'planks', colors: ['#4a3a24', '#463622', '#4e3e26'], grain: '#22180c', gap: '#140e06' },
        5: { style: 'flagstone', colors: ['#b8885a', '#b0825a', '#c0905e', '#a87a50'], grout: '#8a5e3a', crack: '#7a5232', moss: '#7a8a4a', mossAmt: 0.05 },
        6: { style: 'carpet', base: '#3a2a10', pattern: '#4a3818', border: '#c8b030' },
      },
      floor: { style: 'plates', colors: ['#3a3628', '#363224', '#3e3a2a'], seam: '#14120a', rivet: '#6a6448', rust: '#4a3a18', stripe: ['#c8b030', '#141008'] },
      floorAlt: { style: 'grate', bar: '#36321e', under: '#060604', heat: '#8a9a2a' },
      wall: SOOT_WALL, door: { panel: '#3a3624', frame: '#141008', trim: '#c8b030' },
      doorStyles, doorGlows,
      pit: { core: '#020202', wall: '#16140a', rim: '#3a3624' },
      particles: { type: 'mote', color: '#8a8a5a', rate: 6, alpha: 0.22, drift: 3 },
      ambience: { base: 42, cutoff: 260, wind: 300, gain: 0.05, wave: 'sawtooth' },
    },
    'hn-greasy-works': {
      name: 'The Greasy Bolt Hole · The Works', voidColor: '#070605', ambient: '#3a3428', attractAmbient: '#5a5240', outsideSight: '#24201a', playerLight: '#fff4dc', torch: '#ffd08a',
      floors: {
        0: { style: 'terrazzo', base: '#d8ccb0', chips: ['#a89a7a', '#7a6a4a', '#e8dcc0', '#c8a040', '#5a5040'], strip: '#c8a040' },
        1: { style: 'marble', base: ['#e0d8c8', '#d8d0c0', '#e8e0d0', '#d0c8b8'], vein: '#a89878', inlay: '#c8a040' },
        2: { style: 'bath-tile', tile: '#f0ece0', grout: '#c8bca0', accent: '#c8a040' },
        3: { style: 'plates', colors: ['#8a8a84', '#84847e', '#90908a'], seam: '#3a3a36', rivet: '#c8c8c0', rust: '#6a5a3a', stripe: ['#c8a040', '#1a1810'] },
        4: { style: 'carpet', base: '#5a1a1e', pattern: '#6a2428', border: '#c8a040' },
        5: { style: 'marble', base: ['#f0d8e0', '#e8d0d8', '#f4dce4', '#e4ccd4'], vein: '#c8a0b0', inlay: '#e8b8d0' },
        6: { style: 'grate', bar: '#7a7a74', under: '#0a0a08', heat: '#8a9a2a' },
      },
      floor: { style: 'terrazzo', base: '#d8ccb0', chips: ['#a89a7a', '#7a6a4a', '#e8dcc0', '#c8a040', '#5a5040'], strip: '#c8a040' },
      floorAlt: { style: 'marble', base: ['#e0d8c8', '#d8d0c0', '#e8e0d0', '#d0c8b8'], vein: '#a89878', inlay: '#c8a040' },
      wall: WORKS_WALL, door: { panel: '#c8b890', frame: '#5a4a2a', trim: '#c8a040' },
      doorStyles, doorGlows,
      pit: { core: '#020202', wall: '#2a2418', rim: '#8a7a5a' },
      particles: { type: 'mote', color: '#e8e0b0', rate: 5, alpha: 0.18, drift: 3 },
      ambience: { base: 55, cutoff: 520, wind: 260, gain: 0.04, wave: 'triangle' },
    },
  };

  // ------------------------------------------------------------ terrain
  const BELT_DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  HN.beltReversed = function (game, tx, ty) {
    const m = game.level._hnBeltTag;
    const tag = m && m[ty * game.level.w + tx];
    const cfg = tag && game.level.def.hnBelts && game.level.def.hnBelts[tag];
    return !!(cfg && cfg.flag && game.hasFlag(cfg.flag));
  };
  HN.beltDir = function (game, tx, ty) {
    const r = Math.max(0, game.level.rotAt(tx, ty));
    const d = BELT_DIR[r % 4];
    return HN.beltReversed(game, tx, ty) ? [-d[0], -d[1]] : d;
  };
  function grimeSplats(g, x, y, info, amount, col) {
    const r = info.rnd;
    const n = Math.floor(r() * amount * 3);
    for (let i = 0; i < n; i++) {
      g.fillStyle = col || 'rgba(40,36,14,0.45)';
      g.beginPath();
      g.ellipse(x + r() * T, y + r() * T, 2 + r() * 7, 1.5 + r() * 5, r() * 3, 0, U.TAU);
      g.fill();
    }
  }
  const terrain = {
    'hn-belt': {
      floorLike: true, hnBelt: true, mapColor: '#2a6a3a',
      bake(g, x, y, info) {
        g.fillStyle = '#1a1a16';
        g.fillRect(x, y, T, T);
        g.fillStyle = '#2a2a24';
        g.fillRect(x, y + 3, T, T - 6);
        // the belt's rubber slats and the rollers at its edges
        g.fillStyle = '#22221c';
        for (let i = 0; i < T; i += 4) g.fillRect(x + i, y + 3, 1.5, T - 6);
        g.fillStyle = '#6a6a5a';
        for (let i = 2; i < T; i += 8) {
          g.fillRect(x + i, y + 0.5, 4, 2);
          g.fillRect(x + i, y + T - 2.5, 4, 2);
        }
        grimeSplats(g, x, y, info, 0.6);
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        const rev = game && HN.beltReversed(game, tx, ty);
        const s = rev ? -1 : 1;
        const off = ((t * 28) % 16) * s;
        g.strokeStyle = 'rgba(80,255,120,0.75)';
        g.lineWidth = 1.6;
        for (let i = -16; i < T + 16; i += 16) {
          const cx = x + ((i + off + 32) % (T + 16)) - 8;
          if (cx < x + 2 || cx > x + T - 2) continue;
          g.beginPath();
          g.moveTo(cx - 4 * s, y + 9);
          g.lineTo(cx + 2 * s, y + T / 2);
          g.lineTo(cx - 4 * s, y + T - 9);
          g.stroke();
        }
        G.glow(g, x + T / 2, y + T / 2, 12, '#3aff6a', 0.08);
      },
    },
    'hn-grime': {
      floorLike: true, mapColor: 'rgba(205,190,160,0.16)',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        grimeSplats(g, x, y, info, 1.4);
        if (info.rnd() < 0.3) grimeSplats(g, x, y, info, 0.6, 'rgba(120,140,30,0.35)');
      },
    },
    'hn-drip': {
      floorLike: true, mapColor: 'rgba(205,190,160,0.16)',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        // the tell: green drip stains, right under a nozzle in the ceiling
        const r = info.rnd;
        for (let i = 0; i < 5; i++) {
          g.fillStyle = 'rgba(140,170,40,' + (0.25 + r() * 0.25) + ')';
          g.beginPath();
          g.arc(x + 8 + r() * 16, y + 8 + r() * 16, 1 + r() * 2.5, 0, U.TAU);
          g.fill();
        }
      },
    },
    'hn-blast': { floorLike: true, door: { lock: null, style: 'blast' }, mapColor: '#c8b030', bake: (g, x, y, info) => LM.get('terrain', 'door').bake(g, x, y, info) },
  };

  // ------------------------------------------------------------ the belts carry you
  class BeltFx {
    constructor(game) {
      const L = game.level, m = {};
      for (const tag of Object.keys(L.def.hnBelts || {})) for (const p of L.tags[tag] || []) m[p.y * L.w + p.x] = tag;
      L._hnBeltTag = m;
    }
    update(dt, game) {
      const L = game.level, P = game.player;
      const SPEED = 235;
      const carry = (ent, mul) => {
        const tx = Math.floor(ent.x / T), ty = Math.floor(ent.y / T);
        if (!L.t(tx, ty).hnBelt) return false;
        const [dx, dy] = HN.beltDir(game, tx, ty);
        LM.physics.move(L, ent, dx * SPEED * mul * dt, dy * SPEED * mul * dt);
        return [dx, dy];
      };
      if (P && !P.dead && P.falling <= 0 && P.dashT <= 0) {
        const d = carry(P, 1);
        if (d) {
          // your own legs count for little along the belt, and only a little across it
          const along = P.vx * d[0] + P.vy * d[1];
          P.vx -= along * d[0];
          P.vy -= along * d[1];
          P.vx *= 0.55;
          P.vy *= 0.55;
          if (!P._hnOnBelt) {
            P._hnOnBelt = true;
            if (!HN.st(game).beltTold) {
              HN.st(game).beltTold = true;
              game.toast('The floor takes you. Dash (Space) to jump off it.', 'key');
            }
          }
        } else P._hnOnBelt = false;
      }
      for (const e of game.enemies) if (!e.dead && !e.def.flying && !e.def.stationary) carry(e, 0.8);
      for (const it of game.items) if (!it.dead && it.def.id === 'hn-loot') carry(it, 0.6);
      return false;
    }
  }

  // ------------------------------------------------------------ the ceiling goop
  const effects = {
    'hn-goop': {
      params: { text: 'text' },
      run(game, ef, trap) {
        if (flag(game, 'hnGoopOff')) return;
        const P = game.player;
        for (let i = 0; i < 26; i++) game.particles.add({ type: 'dot', x: P.x + U.rand(-14, 14), y: P.y - 60 + U.rand(-10, 10), vy: U.rand(220, 320), life: 0.25, size: U.rand(1.4, 2.6), color: i % 2 ? '#8a9a2a' : '#c8d04a' });
        game.schedule(0.22, () => {
          if (P.dead) return;
          LM.combat.hurt(game, P, 6, { source: 'hazard', type: 'hazard', damageType: 'slime' });
          LM.status.apply(game, P, 'hn-drenched', { seconds: 6 });
          HN.slimePuddle(game, P.x, P.y, 34, 6);
          LM.audio.play('splash', { vol: 0.8 });
        });
        const s = HN.st(game);
        if (!s.goopTold) {
          s.goopTold = true;
          game.toast(ef.text || 'A nozzle in the ceiling coughs. Then it drenches you in warm toxic goop.', 'warn');
          game.schedule(2.5, () => game.toast('Green drip stains on the floor: that’s where the nozzles are.', 'key'));
        }
      },
    },
  };

  // ------------------------------------------------------------ furniture
  const ENOCH = (g, s) => {
    // Enoch the Greasy in his battle armor, as a poster: a bulky dark silhouette, a dripping helmet, a hose
    g.fillStyle = '#2a2410';
    g.beginPath();
    g.ellipse(0, s * 0.35, s * 0.55, s * 0.45, 0, 0, U.TAU);
    g.fill();
    G.circle(g, 0, -s * 0.25, s * 0.3, '#3a3418');
    g.fillStyle = '#c8d04a';
    g.fillRect(-s * 0.18, -s * 0.3, s * 0.36, s * 0.08);
    g.fillStyle = '#6a7a1a';
    for (let i = -2; i <= 2; i++) g.fillRect(i * s * 0.12, -s * 0.05, s * 0.05, s * 0.2 + (i % 2) * s * 0.1);
  };
  const EGG = (g, s) => {
    g.fillStyle = '#f4ecd8';
    g.beginPath();
    g.ellipse(0, s * 0.1, s * 0.32, s * 0.42, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#141210';
    g.fillRect(-s * 0.26, s * 0.02, s * 0.52, s * 0.1);
    g.beginPath();
    g.ellipse(s * 0.04, -s * 0.3, s * 0.24, s * 0.08, 0, 0, U.TAU);
    g.fill();
  };
  const items = {
    'hn-gposter': {
      name: 'Poster', radius: 6, wallMounted: true, shadow: false,
      interact: {
        prompt: (it) => 'Look at the ' + ({ enoch: 'poster of Enoch', egg: 'Eggbot sigil', slogan: 'banner' })[it.props.kind || 'enoch'],
        use: (it) => LM.ui.showText(it.props.title || 'ENOCH THE GREASY', it.props.text || 'Enoch the Greasy in his foul battle armor, dripping. Under him: FILTH IS STRENGTH.', ({ enoch: 'Propaganda', egg: 'Eggbot sigil', slogan: 'Banner' })[it.props.kind || 'enoch']),
      },
      draw(g, it) {
        wallRot(g, it);
        g.translate(0, -2);
        const k = it.props.kind || 'enoch';
        if (k === 'slogan') {
          g.fillStyle = '#141008';
          g.fillRect(-15, -4, 30, 8);
          g.fillStyle = it.props.color || '#5a1a1e';
          g.fillRect(-14, -3, 28, 6);
          g.fillStyle = '#e8d8a0';
          for (let i = -12; i < 12; i += 3) g.fillRect(i, -0.6, 2, 1.2);
          return;
        }
        g.fillStyle = '#141008';
        g.fillRect(-8, -7, 16, 13);
        g.fillStyle = k === 'egg' ? '#1a1418' : '#4a3a14';
        g.fillRect(-7, -6, 14, 11);
        g.save();
        g.translate(0, -0.5);
        (k === 'egg' ? EGG : ENOCH)(g, 10);
        g.restore();
        if (k === 'egg') {
          // a little airship and a factory line
          g.fillStyle = '#c8b8d8';
          g.beginPath();
          g.ellipse(-4, -4.5, 2.4, 1, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = '#5a4a5a';
          g.fillRect(-6, 3, 12, 1.5);
        }
      },
      drawGlow(g, it, t) {
        if (it.props.kind !== 'egg') return;
        wallRot(g, it);
        G.glow(g, 0, -2, 10, '#ff4ab8', 0.25 + 0.1 * Math.sin(t * 2 + it.tx));
      },
    },
    'hn-exhibit': {
      name: 'Exhibit', radius: 12, solid: 'rect', mapColor: '#c8a040',
      init(it) { it.box = [28, 20]; },
      hnValuable: (it, game) => !!(it.props.loot && !HN.hasFound(game, it.props.uid)),
      interact: {
        prompt: (it) => 'Read the plaque: ' + (it.props.title || 'an exhibit'),
        use(it, game) {
          const p = it.props;
          const has = p.loot && !HN.hasFound(game, p.uid);
          if (p.flag) HN.setFlag(game, p.flag);
          LM.ui.open({
            kicker: 'The Museum of Greasy Victories', title: p.title || 'EXHIBIT',
            body: h('div', { class: 'hn-panel' }, (p.text || '').split('\n\n').map(lore), p.plaque ? h('p', { class: 'muted' }, p.plaque) : null, has ? h('p', { class: 'muted' }, 'The case isn’t locked. Of course it isn’t: who would steal from Enoch?') : null),
            actions: has ? [{ label: p.takeLabel || 'Open the case', primary: true, key: 'E', onClick: () => HN.award(game, p.uid, p.loot, p.title) }, { label: 'Leave it', quiet: true }] : [{ label: 'Close', primary: true }],
          });
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#2a1a0e';
        g.fillRect(-15, -11, 30, 22);
        g.fillStyle = '#5a3a1e';
        g.fillRect(-14, -10, 28, 20);
        g.fillStyle = 'rgba(200,230,255,0.18)';
        g.fillRect(-12, -9, 24, 15);
        const k = it.props.kind;
        // a diorama inside the case
        if (k === 'fouling') {
          for (let i = 0; i < 5; i++) G.circle(g, -8 + i * 4, 0 + (i % 2), 3, '#6a7a1a');
          g.fillStyle = '#4a4a44';
          g.fillRect(-10, 2, 20, 3);
        } else if (k === 'pit') {
          g.fillStyle = '#3a2a1a';
          g.beginPath();
          g.ellipse(0, 1, 9, 5, 0, 0, U.TAU);
          g.fill();
          G.circle(g, -3, 0, 1.4, '#f2c96b');
          G.circle(g, 3, 1, 1.2, '#9fe8ff');
          G.circle(g, 0, -2, 2.4, '#5a7a2a');
        } else if (k === 'adversaries') {
          for (let i = -1; i <= 1; i++) {
            g.fillStyle = '#6a6a5a';
            g.fillRect(i * 7 - 2, -6, 4, 9);
            g.fillStyle = '#8a9a2a';
            g.fillRect(i * 7 - 3, 2, 6, 2);
          }
        } else if (k === 'plague') {
          g.strokeStyle = '#a8c83a';
          g.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.moveTo(-10, -4 + i * 4);
            g.quadraticCurveTo(0, -7 + i * 4, 10, -3 + i * 4);
            g.stroke();
          }
        } else if (k === 'soap') {
          g.fillStyle = '#f0f4f8';
          g.fillRect(-4, -3, 8, 5);
          g.fillStyle = '#c83a2a';
          g.fillRect(-6, -1, 12, 1);
        } else if (k === 'armor') {
          ENOCH(g, 16);
        }
        if (it.props.loot && game && !HN.hasFound(game, it.props.uid)) G.circle(g, 9, 5, 1.6, '#f2c96b');
      },
      drawGlow(g, it, t) { G.glow(g, 0, -2, 16, '#ffd08a', 0.16 + 0.05 * Math.sin(t * 1.5 + it.tx)); },
    },
    'hn-belt-lever': {
      name: 'Conveyor control', radius: 8, solid: true, mapColor: '#3aff6a',
      light: { color: '#3aff6a', radius: 60, intensity: 0.35, flicker: 0.05 },
      interact: {
        prompt: (it) => 'Use the ' + (it.props.title || 'conveyor control'),
        use(it, game) {
          const p = it.props;
          const rev = flag(game, p.flag);
          const flip = () => {
            if (game.hasFlag(p.flag)) game.player.flags.delete(p.flag);
            else game.setFlag(p.flag);
            it.hacked = true;
            LM.audio.play('switch');
            game.toast((p.title || 'Conveyor') + ': ' + (game.hasFlag(p.flag) ? 'REVERSED' : 'FORWARD') + '. The arrows turn around.', 'key');
          };
          if (p.difficulty && !it.hacked) {
            return HN.hack(game, {
              kicker: 'Conveyor control', title: p.title || 'LINE DIRECTION · SUPERVISOR ONLY', difficulty: p.difficulty,
              text: 'A big green lever under a cage with an Eggbot-shaped padlock. The panel beside it wants a supervisor, and would accept an argument.',
              risk: 'a jolt through the cage (electrical). You can try again.',
              onSuccess: flip, onFail: () => HN.shockPlayer(game, 9),
            });
          }
          LM.ui.open({
            kicker: 'Conveyor control', title: p.title || 'LINE DIRECTION',
            body: lore('A big green lever. A plate: FORWARD · REVERSE. It is set to ' + (rev ? 'REVERSE' : 'FORWARD') + '.'),
            actions: [{ label: 'Throw the lever', primary: true, key: 'E', onClick: flip }, { label: 'Leave it', quiet: true }],
          });
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#1a1a14';
        g.fillRect(-7, -7, 14, 14);
        g.fillStyle = '#3a4a3a';
        g.fillRect(-6, -6, 12, 12);
        const rev = game && flag(game, it.props.flag);
        g.fillStyle = '#c8c8b8';
        g.save();
        g.rotate(rev ? 0.7 : -0.7);
        g.fillRect(-1, -8, 2, 8);
        g.restore();
        G.circle(g, 0, 0, 2.4, '#3aff6a');
      },
    },
    'hn-control': {
      name: 'Bunker control console', radius: 13, solid: true, mapColor: '#c8b030', mapAlways: true,
      light: { color: '#e0c060', radius: 120, intensity: 0.5, flicker: 0.1 },
      interact: {
        prompt: 'Use the bunker control console',
        use(it, game) {
          const lift = flag(game, 'hnGreasyLift'), goop = flag(game, 'hnGoopOff'), tur = flag(game, 'hnTurretsOff');
          LM.ui.open({
            kicker: 'Control room', title: 'BOLT HOLE COMMAND · ENOCH ONLY',
            body: h('div', { class: 'hn-panel' },
              lore('A horseshoe of grimy switches and dials, every one labelled in Enoch’s own fat handwriting. A dish of something that was once a snack. A microphone on a goose-neck, crusted solid.'),
              lore('The biggest switch, under a cage of rebar: LIFT · BLAST DOOR · TO THE WORKS. Somebody has written under it, much later and in a much neater hand: OVOID PERSONNEL ONLY.'),
              h('p', { class: 'muted' }, 'Lift: ' + (lift ? 'OPEN' : 'SEALED') + ' · Ceiling goop: ' + (goop ? 'OFF' : 'ARMED') + ' · Turrets: ' + (tur ? 'OFF' : 'ARMED'))),
            actions: [
              { label: lift ? 'The blast door is open' : 'Open the blast door and power the lift', primary: !lift, disabled: lift, onClick: () => { HN.setFlag(game, 'hnGreasyLift'); LM.audio.play('lift'); game.toast('Somewhere north a blast door grinds open. The lift hums.', 'key'); HN.note(game, 'change', 'You opened the Greasy Bolt Hole’s blast door: the lift goes down to the works.'); } },
              { label: goop ? 'Ceiling goop is off' : 'Shut off the ceiling goop', disabled: goop, onClick: () => { HN.setFlag(game, 'hnGoopOff'); game.toast('CEILING GOOP: OFF. “Morale may suffer.”', 'good'); } },
              { label: tur ? 'Turrets are off' : 'Stand the turrets down', disabled: tur, onClick: () => { HN.setFlag(game, 'hnTurretsOff'); game.toast('TURRETS: STOOD DOWN. They sag on their mounts.', 'good'); } },
              { label: 'Close', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#16140a';
        g.fillRect(-15, -10, 30, 20);
        g.fillStyle = '#3a3624';
        g.fillRect(-14, -9, 28, 18);
        for (let i = 0; i < 6; i++) G.circle(g, -11 + i * 4.4, -4, 1.4, ['#c83a2a', '#c8b030', '#3aff6a'][i % 3]);
        g.fillStyle = '#5a5438';
        g.fillRect(-12, 1, 24, 5);
      },
      drawGlow(g, it, t) { for (let i = 0; i < 3; i++) G.glow(g, -8 + i * 8, -4, 5, i === 1 ? '#e0c060' : '#3aff6a', 0.35 + 0.15 * Math.sin(t * 3 + i)); },
    },
    'hn-vat': {
      name: 'Grease vat', radius: 12, solid: true, mapColor: '#c8d04a',
      init(it) { if (it.charge == null) it.charge = it.props.charge || 240; },
      hnValuable: (it, game) => it.charge > 0 && game.player && game.player.hasWeapon('hn-grease-thrower'),
      interact: {
        prompt: (it) => (it.charge > 0 ? 'Fill up from the grease vat (' + it.charge + ' left)' : 'The grease vat is empty'),
        use(it, game) {
          const P = game.player;
          if (it.charge <= 0) return game.toast('Scraped dry.', 'warn');
          if (!P.hasWeapon('hn-grease-thrower')) return LM.ui.showText('GREASE · TROOP ISSUE', 'A waist-high vat of warm, dark grease with a ladle chained to it. A sign: ONE LADLE PER TROOPER PER MEAL. You have nothing to put it in that you’d want to put it in. (It feeds a Grease Thrower.)', 'Grease vat');
          const want = Math.min(it.charge, P.ammoMax('grease') - (P.ammo.grease || 0));
          if (want <= 0) return game.toast('The tank is full.', 'warn');
          P.addAmmo('grease', want);
          it.charge -= want;
          LM.audio.play('pickup');
          game.toast('Glug, glug, glug: +' + want + ' grease.', 'good');
        },
      },
      draw(g, it) {
        G.circle(g, 0, 0, 12, '#16140a');
        G.circle(g, 0, 0, 10.5, '#5a5438');
        G.circle(g, 0, 0, 8.5, it.charge > 0 ? '#2a2810' : '#3a3628');
        if (it.charge > 0) G.circle(g, -2, -2, 2.5, '#6a6a24');
      },
      drawGlow(g, it, t) { if (it.charge > 0) G.glow(g, 0, 0, 12, '#c8d04a', 0.12 + 0.05 * Math.sin(t * 2)); },
    },
    'hn-decon': {
      name: 'Decontamination shower', radius: 10, solid: false, mapColor: '#9fd8ff',
      light: { color: '#bfe8ff', radius: 80, intensity: 0.35 },
      interact: {
        prompt: 'Step into the decontamination shower',
        use(it, game) {
          const P = game.player;
          for (const id of ['hn-grimed', 'hn-drenched', 'hn-toxic', 'hn-acid', 'hn-burning']) LM.status.clear(game, P, id);
          for (const fx of game.fx) if (fx.constructor && fx.constructor.name === 'SlimePuddle' && U.dist(fx.x, fx.y, P.x, P.y) < 60) fx.life = 0;
          game.particles.burst(P.x, P.y - 10, 24, { type: 'dot', color: '#bfe8ff', speed: 90, life: 0.5, size: 1.2, angle: Math.PI / 2, spread: 0.5 });
          LM.audio.play('splash');
          const first = !it.used && it.props.unused;
          it.used = true;
          if (first) {
            HN.award(game, 'gb-soap', [{ hn: 'hn-pristine-soap' }], 'The soap dish');
            LM.ui.showText('FIRST USE IN 312 YEARS', 'The shower coughs, clanks, and then runs clean, hot and strong, like it has been waiting its whole life for this. A plaque on the tile: THIS STATION IS FOR INSPECTION PURPOSES ONLY. PERSONNEL FOUND WASHING WILL BE RE-GREASED. — E.\n\nThe soap in the dish has never been unwrapped.', 'San-station');
          } else game.toast('Hot water. The goop slides off. You feel like a traitor to the Greasy cause.', 'good');
        },
      },
      draw(g) {
        g.fillStyle = '#c8d0d8';
        g.fillRect(-9, -9, 18, 18);
        g.fillStyle = '#e8f0f4';
        g.fillRect(-8, -8, 16, 16);
        G.circle(g, 0, 0, 4, '#9aa4ac');
        for (let i = 0; i < 6; i++) G.circle(g, Math.cos(i) * 2.4, Math.sin(i) * 2.4, 0.6, '#3a4248');
      },
    },
    'hn-forge': {
      name: 'Eggbot forge', radius: 16, solid: 'rect', mapColor: '#ff4ab8', mapAlways: true,
      light: (it, game) => (game && (flag(game, 'hnForgeOff') || it.broken) ? null : { color: '#ff7ac8', radius: 150, intensity: 0.55, flicker: 0.12 }),
      init(it) { it.box = [44, 34]; if (it.made == null) it.made = 0; if (it.forgeT == null) it.forgeT = 4; },
      destructible: { hp: 420, onBreak: (it, game) => { it.dead = false; it.broken = true; HN.setFlag(game, 'hnForgeOff'); LM.combat.explode(game, it.x, it.y, { radius: 70, damage: 20, owner: 'enemy' }); game.toast('The forge bursts. Half-made eggs roll out of it, cracked.', 'good'); } },
      hnThreat: (it, game) => (flag(game, 'hnForgeOff') || it.broken ? null : 'EGGBOT FORGE'),
      update(it, dt, game) {
        if (game.attract || !game.player || it.broken || flag(game, 'hnForgeOff')) return;
        const P = game.player;
        if (U.dist(P.x, P.y, it.x, it.y) > 15 * T) return;
        it.forgeT -= dt;
        if (it.forgeT > 0) return;
        it.forgeT = it.props.every || 16;
        const mine = game.enemies.filter((e) => !e.dead && e.hnForge === it.props.uid).length;
        if (mine >= (it.props.max || 3)) return;
        const out = it.props.out || [0, 1];
        const e = game.spawnEnemy('hn-eggbot', it.x + out[0] * 30, it.y + out[1] * 30, { aggro: !HN.masked(game) });
        if (e) {
          e.hnForge = it.props.uid;
          it.made++;
          game.particles.burst(e.x, e.y, 14, { type: 'ember', color: '#ffb8e8', speed: 90, life: 0.5, size: 1.2 });
          LM.audio.play('liftDing', { vol: 0.6 });
          if (it.made === 1) game.toast('The forge dings like an oven timer. A fresh Eggbot rolls out, still warm.', 'warn');
        }
      },
      interact: {
        available: (it, game) => !it.broken && !flag(game, 'hnForgeOff'),
        prompt: 'Use the forge’s control panel',
        use(it, game) {
          HN.hack(game, {
            kicker: 'Eggbot forge', title: 'PRODUCTION: OVOID · QUOTA: INFINITE', difficulty: 10, override: true,
            text: 'A big egg-shaped furnace that used to stamp out Greasy war robots. The panel’s old menu (TROOPER SHELL · SLOP-TREAD · TURRET) has been scratched out by something without hands and replaced with one option: EGG. To shut it down you have to convince it the quota is met.',
            risk: 'it takes offence and finishes an Eggbot early, right next to you. You can try again (or break the forge: it is tough).',
            onSuccess: (g) => { HN.setFlag(g, 'hnForgeOff'); g.toast('QUOTA MET. THE EGG IS COMPLETE. The forge cools.', 'good'); HN.note(g, 'change', 'You shut down the Eggbot forge in the works.'); },
            onFail: (g) => { const e = g.spawnEnemy('hn-eggbot', it.x, it.y + 30, { aggro: true }); if (e) e.hnForge = it.props.uid; },
          });
        },
      },
      draw(g, it, t, game) {
        const off = it.broken || (game && flag(game, 'hnForgeOff'));
        g.fillStyle = '#2a1a24';
        G.roundRect(g, -22, -17, 44, 34, 6);
        g.fill();
        g.fillStyle = off ? '#5a4a52' : '#c8a0b8';
        g.beginPath();
        g.ellipse(0, -2, 14, 13, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1a1014';
        g.fillRect(-8, 10, 16, 6);
        g.fillStyle = '#c8a040';
        for (let i = -20; i < 20; i += 8) g.fillRect(i, 14, 4, 2);
      },
      drawGlow(g, it, t, game) {
        if (it.broken || (game && flag(game, 'hnForgeOff'))) return;
        const k = 1 - Math.max(0, it.forgeT || 0) / (it.props.every || 16);
        G.glow(g, 0, -2, 18 + k * 10, '#ff7ac8', 0.3 + 0.4 * k);
      },
    },
    'hn-machine': {
      name: 'Machinery', radius: 14, solid: 'rect', mapColor: '#8a8a84',
      init(it) {
        const w = (it.props.w || 2) * T - 6, hh = (it.props.h || 2) * T - 6;
        it.box = [w, hh];
        it.boxOff = [((it.props.w || 2) - 1) * T / 2, ((it.props.h || 2) - 1) * T / 2];
      },
      interact: {
        prompt: (it) => 'Look at the ' + ({ press: 'stamping press', mold: 'egg mold', kiln: 'curing kiln', drum: 'grease drum' })[it.props.kind || 'press'],
        use: (it) => LM.ui.showText(it.props.title || ({ press: 'SHELL PRESS No. 4', mold: 'OVOID MOLD', kiln: 'CURING KILN', drum: 'GREASE DRUM' })[it.props.kind || 'press'], it.props.text || ({
          press: 'A stamping press as big as a house, built to beat out Grease Monkey chest-plates. Its dies have been re-cut, badly, into the shape of half an egg. Every forty seconds it slams down on nothing and the floor jumps.',
          mold: 'Two polished half-shells on hydraulic arms, opening and closing like a mouth. A brass plate: SHAPE OF THE FUTURE. Under it, older and painted over: TROOPER HELMET, MEDIUM.',
          kiln: 'A long kiln that cures shells at a temperature the dial describes as “HARD-BOILED.” Something inside dings, now and then, for no reason.',
          drum: 'A drum of Grease, troop issue. Stencilled: KEEP AWAY FROM SOAP.',
        })[it.props.kind || 'press'], 'The works'),
      },
      draw(g, it, t) {
        const W = (it.props.w || 2) * T - 4, H = (it.props.h || 2) * T - 4;
        g.save();
        g.translate(((it.props.w || 2) - 1) * T / 2, ((it.props.h || 2) - 1) * T / 2);
        g.fillStyle = '#1a1814';
        g.fillRect(-W / 2, -H / 2, W, H);
        g.fillStyle = '#7a7a72';
        g.fillRect(-W / 2 + 2, -H / 2 + 2, W - 4, H - 4);
        g.fillStyle = '#c8a040';
        for (let i = -W / 2 + 2; i < W / 2 - 2; i += 8) g.fillRect(i, H / 2 - 5, 4, 3);
        const k = it.props.kind || 'press';
        if (k === 'press') {
          const y = Math.abs(Math.sin(t * 0.9)) * 6;
          g.fillStyle = '#4a4a44';
          g.fillRect(-W / 2 + 6, -H / 2 + 4 + y, W - 12, 10);
        } else if (k === 'mold') {
          const o = (Math.sin(t * 1.2) + 1) * 4;
          g.fillStyle = '#e8e0d0';
          g.beginPath();
          g.ellipse(-o - 4, 0, 8, 11, 0, Math.PI / 2, Math.PI * 1.5);
          g.fill();
          g.beginPath();
          g.ellipse(o + 4, 0, 8, 11, 0, -Math.PI / 2, Math.PI / 2);
          g.fill();
        } else if (k === 'kiln') {
          g.fillStyle = '#3a2a1a';
          g.fillRect(-W / 2 + 6, -6, W - 12, 12);
        } else if (k === 'drum') {
          G.circle(g, 0, 0, Math.min(W, H) / 2 - 3, '#3a3418');
          G.circle(g, 0, 0, Math.min(W, H) / 2 - 7, '#2a2810');
        }
        g.restore();
      },
      drawGlow(g, it, t) {
        if (it.props.kind !== 'kiln') return;
        g.translate(((it.props.w || 2) - 1) * T / 2, ((it.props.h || 2) - 1) * T / 2);
        G.glow(g, 0, 0, 22, '#ff8a3a', 0.35 + 0.1 * Math.sin(t * 2));
      },
    },
    'hn-gm-shell': {
      name: 'Dormant Grease Monkey', radius: 13, solid: true, mapColor: '#c8d04a',
      hnValuable: (it) => !it.done,
      hnThreat: (it) => (it.done ? null : 'DORMANT UNIT'),
      interact: {
        available: (it) => !it.done,
        prompt: 'Look at the dormant Grease Monkey',
        use(it, game) {
          const wake = () => {
            it.done = true;
            it.remove(game);
            const e = game.spawnEnemy('hn-grease-monkey', it.x, it.y, { aggro: true });
            if (e) e.hnCarriesThrower = true;
            game.toast('The shell’s visor lights up yellow. “ROLL CALL,” it says, to nobody. Then it turns to you.', 'warn');
          };
          LM.ui.open({
            kicker: 'Machine shop', title: 'GREASE MONKEY · UNIT 0 OF 0',
            body: h('div', { class: 'hn-panel' },
              lore('A Grease Monkey trooper shell in a maintenance cradle: a hulking suit of greasy plate with nobody inside it, and on its back a Grease Thrower, tank, hose and all. Its visor is dark. A tag on the cradle: STAND-BY · DO NOT DISTURB · STILL ON DUTY.'),
              h('div', { class: 'hn-risk' }, h('strong', null, 'If it wakes: '), 'a Level 3 trooper shell with the hose. It drops the Grease Thrower when it goes down.')),
            actions: [
              {
                label: 'Hack the cradle’s release', primary: true, key: 'E', onClick: () => setTimeout(() => HN.hack(game, {
                  kicker: 'Grease Monkey cradle', title: 'UNBUCKLE THE TANK WITHOUT WAKING IT', difficulty: 10, override: true,
                  text: 'The tank is locked to the shell. The cradle can release it if it thinks maintenance is due.',
                  risk: 'the shell wakes up, and it is not happy.',
                  onSuccess: (g) => { it.done = true; g.player.giveWeapon('hn-grease-thrower', g); g.toast('The harness unbuckles with a sigh. The Grease Thrower is yours. (Refill it at the grease vats.)', 'good'); },
                  onFail: () => wake(),
                }), 0),
              },
              { label: 'Just take it (wakes it)', onClick: wake },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#1a1608';
        g.fillRect(-14, -14, 28, 28);
        g.fillStyle = '#3a3624';
        g.fillRect(-13, -13, 26, 26);
        G.circle(g, 0, 0, 10, '#2a2410');
        G.circle(g, 0, 0, 8.6, '#5a5020');
        G.circle(g, -4, -2, 4, '#6a6a24');
        g.fillStyle = '#0a0a06';
        g.fillRect(4, -2, 4, 4);
      },
    },
    'hn-specimen': {
      name: 'Specimen rack', radius: 10, solid: true, mapColor: '#6aff9a',
      hnValuable: (it, game) => !HN.hasFound(game, it.props.uid),
      interact: {
        available: (it, game) => !HN.hasFound(game, it.props.uid),
        prompt: 'Look at the specimen rack',
        use(it, game) {
          const p = it.props;
          LM.ui.open({
            kicker: p.kicker || 'Specimens', title: p.title || 'RARE SLIMES · EXOTIC FILTHS',
            body: h('div', { class: 'hn-panel' }, lore(p.text || 'A rack of glass tubes in a padded frame, each labelled in Enoch’s hand. Most are empty or cracked. A few still glow.'), h('p', { class: 'muted' }, 'Inside: ' + (p.loot || []).map((e) => HN.lootName(e)).join(', '))),
            actions: [{ label: 'Take the tubes', primary: true, key: 'E', onClick: () => HN.award(game, p.uid, p.loot || [], 'Specimen rack') }, { label: 'Leave them', quiet: true }],
          });
        },
      },
      draw(g, it, t, game) {
        g.fillStyle = '#1a1814';
        g.fillRect(-10, -6, 20, 12);
        const full = !(game && HN.hasFound(game, it.props.uid));
        for (let i = 0; i < 4; i++) {
          g.fillStyle = full ? (i % 2 ? '#6aff9a' : '#8a5a2a') : 'rgba(200,220,220,0.3)';
          g.fillRect(-8 + i * 4.4, -4, 3, 8);
        }
      },
      drawGlow(g, it, t, game) { if (!(game && HN.hasFound(game, it.props.uid))) G.glow(g, 0, 0, 12, '#6aff9a', 0.25 + 0.1 * Math.sin(t * 2.4)); },
    },
    'hn-giftshop': {
      name: 'Museum gift shop', radius: 11, solid: true, mapColor: '#c8a040',
      init(it) { if (it.sold == null) it.sold = 0; },
      interact: {
        prompt: 'Browse the museum gift shop',
        use(it, game) {
          const P = game.player;
          const stock = [
            { hn: 'hn-enoch-bobble', price: 30, pitch: 'NODDING ENOCH · REAL GREASE · LIMITED EDITION OF 40,000' },
            { hn: 'hn-sootcake', price: 20, pitch: 'SOOT-CAKE · AS EATEN ON THE MARCH TO THE GREAT FOULING' },
            { hn: 'hn-pickled-eggs', price: 35, pitch: 'PICKLED EGGS · A TROOPER’S FAVORITE · (REMOVED FROM SALE BY ORDER OF THE PRINCESS)' },
            { hn: 'hn-slime-grenade', price: 90, pitch: 'SOUVENIR SLIME GRENADE · LIVE · NOT A TOY · ALSO A TOY' },
          ];
          const left = 6 - it.sold;
          LM.ui.open({
            kicker: 'The Museum of Greasy Victories', title: 'EXIT THROUGH THE GIFT SHOP',
            body: h('div', { class: 'hn-panel' }, lore('A counter with a cash slot and a cracked sign: ALL PROCEEDS TO THE GREASY WAR CHEST. The goods behind the glass are dusty, greasy, and somehow still for sale.'), h('p', { class: 'muted' }, 'You have ' + P.gold + 'c. The slot will jam after ' + left + ' more purchases.')),
            actions: left > 0 ? stock.map((s) => ({ label: HN.ITEMS[s.hn].name + ' · ' + s.price + 'c', disabled: P.gold < s.price, onClick: () => { P.gold -= s.price; it.sold++; LM.audio.play('coin'); HN.give(game, s.hn, 1, { from: 'gift shop' }); game.toast(s.pitch, 'key'); } })).concat([{ label: 'Close', quiet: true }]) : [{ label: 'SOLD OUT (the slot is jammed)', primary: true }],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#2a1a0e';
        g.fillRect(-12, -8, 24, 16);
        g.fillStyle = '#5a3a1e';
        g.fillRect(-11, -7, 22, 14);
        G.circle(g, -5, -1, 2.6, '#8a7a2a');
        G.circle(g, 2, 0, 2, '#f4ecd8');
        g.fillStyle = '#3a3430';
        g.fillRect(5, -3, 4, 5);
      },
    },
    'hn-gnote': {
      name: 'Note', radius: 6, shadow: false, mapColor: '#e8d8a0',
      interact: {
        prompt: (it) => 'Read the ' + (it.props.name || 'note'),
        use(it, game) {
          if (it.props.flag) HN.setFlag(game, it.props.flag);
          if (it.props.clue) HN.note(game, 'clue', it.props.clue);
          LM.ui.showText(it.props.title || 'A NOTE', it.props.text || '', it.props.kicker || 'Found');
        },
      },
      draw(g) {
        g.rotate(0.3);
        g.fillStyle = '#c8b888';
        g.fillRect(-4, -5, 8, 10);
        g.fillStyle = 'rgba(60,50,20,0.6)';
        for (let i = -3; i < 4; i += 2) g.fillRect(-3, i, 6, 0.8);
        G.circle(g, 2, 2, 2, 'rgba(40,36,14,0.5)');
      },
    },
    'hn-bunk': {
      name: 'Bunk', radius: 12, solid: 'rect', cache: true, cacheRadius: 20,
      init(it) { it.box = [22, 14]; },
      draw(g, it) {
        g.fillStyle = '#1a160c';
        g.fillRect(-12, -8, 24, 16);
        g.fillStyle = '#4a4430';
        g.fillRect(-11, -7, 22, 14);
        g.fillStyle = '#6a6448';
        g.fillRect(-11, -7, 6, 14);
        g.fillStyle = 'rgba(30,26,10,0.6)';
        const r = U.mulberry32((it.tx * 31 + it.ty * 17) >>> 0);
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.ellipse(-4 + r() * 14, -4 + r() * 8, 2 + r() * 3, 1.5 + r() * 2, r() * 3, 0, U.TAU);
          g.fill();
        }
      },
    },
  };

  // ------------------------------------------------------------ the chemistry terminal
  Object.assign(HN.TERMINALS, {
    'gb-chem'(game) {
      HN.award(game, 'gb-compounds', [{ hn: 'hn-compound-sheet' }], 'The terminal’s printer');
      HN.note(game, 'clue', 'The Greasing Throne’s toxins are halved by Anti-Tox (the chemistry terminal says cheating is permitted).');
      LM.ui.showText('GREASY CHEMICAL CORPS · COMPOUND REGISTER', [
        'COMPOUND 1 · GREASE SLIME (TROOP ISSUE). Adheres to: everything. Removed by: nothing we have found. Status: PERFECT.',
        'COMPOUND 7 · EAU DE ENOCH. A cologne. Tested on prisoners. The prisoners preferred the alternative.',
        'COMPOUND 12 · SOAP. Classified HAZARDOUS. Store under guard in the san-station. Do not open the san-station.',
        'COMPOUND 19 · THE PLAGUE WIND. See: Museum, Exhibit 4. Do not see: the eastern barracks (gone).',
        'COMPOUND 23 · LUBRICANT FOR THE THRONE. Acids 3, toxins 2, “a little something” 1. Halved by any chemical resistance agent. Cheating is permitted. Cheating is GREASY.',
        'COMPOUND 31 · RARE SLIME. We do not know what it does. It is RARE. Keep it.',
        'NOTE (new, in very small neat letters): ALL RECIPES HAVE BEEN ADAPTED FOR OVOID USE. THE GREASE IS OURS NOW. — P.E.',
      ].join('\n\n'), 'Chemistry terminal');
    },
  });

  // ------------------------------------------------------------ the lift: one blast-door elevator through the three floors
  const elevators = {
    'hn-greasy-lift': {
      name: 'Blast-door lift', x: 22, y: 1, dir: 's', w: 2, d: 2,
      floors: ['hn-greasy-1', 'hn-greasy-2', 'hn-greasy-3'],
      power: 'hnGreasyLift',
      stops: { 'hn-greasy-3': { until: 'hnCrownPass', text: 'THE CROWN · EGG-HEADS AND FAVORED SERVANTS ONLY (the pass is on the works floor)' } },
    },
  };

  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player || !game.level.def.hnBelts) return;
    game.fx.push(new BeltFx(game));
  });

  LM.definePack({ id: 'hn-greasy', environments, terrain, effects, items, elevators });
})();
