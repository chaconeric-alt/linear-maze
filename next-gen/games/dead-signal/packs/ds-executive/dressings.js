/* Dead Signal — packs/ds-executive/dressings.js
 * The executive floor's furniture and its art (DESIGN.md 4.5): everything that isn't alive, or isn't
 * supposed to be.
 *
 * Rooms: ds-exec-desk (a board member's desk: mahogany, green leather, a banker's lamp; props.name on
 * the nameplate, props.text to read what's on it), ds-secretary-desk (a typewriter and an intercom;
 * props.name, props.text), ds-typing-desk (a row desk in the typing pool), ds-club-chair, ds-chesterfield
 * (w tiles), ds-bookcase (props.dir, w), ds-library-ladder, ds-reading-lamp (light), ds-sconce (on a wall,
 * light), ds-chandelier (light, hangs over everything), ds-jade-urn (breaks), ds-orchid, ds-globe-bar,
 * ds-velvet-rope (a run of stanchions: props.len tiles, dir), ds-viewing-chair (a leather seat at the
 * glass; props.text, a programme on it), ds-gallery-rail (a brass rail along glass: len, dir),
 * ds-billiards, ds-humidor, ds-wine-rack, ds-board-table (w × h tiles), ds-board-chair, ds-round-bed,
 * ds-vanity, ds-wardrobe, ds-prep-counter (w), ds-range (a robot kitchen's range), ds-conveyor (len,
 * dir: it carries plates), ds-robot-pod (a charging alcove; props.empty), ds-parts-rack, ds-hvac,
 * ds-power-panel (switchgear; readable), ds-pipe-run (len, dir), ds-control-console (w, a ring of
 * screens), ds-wall-display (on a wall: the building, floor by floor), ds-board-eye (a camera eye on the
 * boardroom's shutters that follows you), ds-office-sign (on a wall: a brass nameplate).
 *
 * Art: ds-statue (props.kind: minotaur | hydra | sphinx | cerberus | medusa | andromeda; props.text,
 * the plaque), ds-fountain (Andromeda chained to her rock, and Cetus coming up out of the water for
 * her: a round basin, w tiles across), ds-charybdis (a basin with a drain that turns into a whirlpool
 * and drags anything near into its teeth: on a cycle, props.on / props.off seconds; quiet with the
 * floor's flag props.until).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {});
  const X = DS.X;
  const h = (...a) => LM.ui.h(...a);
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  function setBox(it, w, hh, ox, oy) {
    const d = it.props.dir || 's';
    if (d === 's') { it.box = [w, hh]; it.boxOff = [ox || 0, oy || 0]; }
    else if (d === 'n') { it.box = [w, hh]; it.boxOff = [-(ox || 0), -(oy || 0)]; }
    else if (d === 'e') { it.box = [hh, w]; it.boxOff = [oy || 0, -(ox || 0)]; }
    else { it.box = [hh, w]; it.boxOff = [-(oy || 0), ox || 0]; }
  }
  /** Spread a piece w tiles along its front (from its placed tile, east for s/n, south for e/w). */
  function along(it, w) {
    const d = it.props.dir || 's';
    if (d === 's' || d === 'n') it.x = it.tx * T + (w * T) / 2;
    else it.y = it.ty * T + (w * T) / 2;
  }
  const textOf = (v, game) => (typeof v === 'function' ? v(game) : v);
  function read(title, text, kicker) {
    LM.ui.open({ kicker: kicker || 'The executive floor', title, body: h('div', { class: 'lore-block' }, String(text || '').split('\n\n').map((p) => h('p', { class: 'lore' }, p))), actions: [{ label: 'Close', primary: true }] });
  }
  const readable = (prompt) => ({
    prompt: (it) => it.props.prompt || prompt,
    available: (it) => !!it.props.text,
    use(it, game) {
      if (it.props.flag) game.setFlag(it.props.flag);
      read(it.props.title || it.def.name, textOf(it.props.text, game), it.props.kicker);
    },
  });
  const verdigris = (g, k) => U.shade('#4a8a72', k || 0);
  const bronze = (k) => U.shade('#8a6a3a', k || 0);

  // ------------------------------------------------------------ the plinth every statue stands on
  function plinth(g, r) {
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.arc(2, 3, r + 1, 0, U.TAU);
    g.fill();
    g.fillStyle = '#121312';
    g.beginPath();
    g.arc(0, 0, r, 0, U.TAU);
    g.fill();
    const grd = g.createRadialGradient(-r * 0.4, -r * 0.4, 0, 0, 0, r);
    grd.addColorStop(0, '#2c302c');
    grd.addColorStop(1, '#141514');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, r - 1.6, 0, U.TAU);
    g.fill();
    g.strokeStyle = X.brass;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(0, 0, r - 0.8, 0, U.TAU);
    g.stroke();
  }
  // ------------------------------------------------------------ the statues, seen from above
  const STATUES = {
    // Asterion: the bull-headed man, a labrys over his shoulder
    minotaur(g, t) {
      g.fillStyle = bronze(-0.2);
      g.beginPath();
      g.ellipse(0, 2, 10, 7.5, 0, 0, U.TAU);
      g.fill();
      // arms, the axe
      g.fillStyle = bronze(-0.1);
      g.beginPath();
      g.ellipse(-9, 4, 3.4, 5.4, 0.3, 0, U.TAU);
      g.ellipse(9, 4, 3.4, 5.4, -0.3, 0, U.TAU);
      g.fill();
      g.strokeStyle = '#4a3a20';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-12, 10);
      g.lineTo(9, -10);
      g.stroke();
      g.fillStyle = bronze(0.25);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(6, -8);
        g.quadraticCurveTo(6 + s * 5, -14 + s * 3, 10 + s * 3, -10 - s * 4);
        g.quadraticCurveTo(9, -9, 6, -8);
        g.fill();
      }
      // the bull's head and its horns
      g.fillStyle = bronze(0.05);
      g.beginPath();
      g.ellipse(0, -4, 5.4, 6.2, 0, 0, U.TAU);
      g.fill();
      g.strokeStyle = '#e8dcc0';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-4, -7);
      g.quadraticCurveTo(-11, -9, -10, -15);
      g.moveTo(4, -7);
      g.quadraticCurveTo(11, -9, 10, -15);
      g.stroke();
      g.fillStyle = 'rgba(255,240,200,0.18)';
      g.beginPath();
      g.ellipse(-1.5, -6, 2, 3, 0, 0, U.TAU);
      g.fill();
    },
    // seven necks from one coiled body
    hydra(g, t) {
      g.fillStyle = verdigris(g, -0.25);
      g.beginPath();
      g.ellipse(0, 4, 9, 7, 0, 0, U.TAU);
      g.fill();
      g.strokeStyle = verdigris(g, -0.05);
      g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42;
        const l = 12 + (i % 2) * 3;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(0, 2);
        g.quadraticCurveTo(Math.cos(a + 0.5) * l * 0.6, 2 + Math.sin(a + 0.5) * l * 0.6, Math.cos(a) * l, 2 + Math.sin(a) * l);
        g.stroke();
        g.fillStyle = verdigris(g, 0.12);
        g.beginPath();
        g.ellipse(Math.cos(a) * l, 2 + Math.sin(a) * l, 2.6, 1.8, a, 0, U.TAU);
        g.fill();
      }
      g.lineCap = 'butt';
    },
    // a lion lying down, wings folded, a woman's face
    sphinx(g, t) {
      g.fillStyle = '#b8a07a';
      g.beginPath();
      g.ellipse(0, 3, 6.5, 12, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = '#a08860';
      g.beginPath();
      g.ellipse(-5, 3, 3.6, 9, 0.12, 0, U.TAU);
      g.ellipse(5, 3, 3.6, 9, -0.12, 0, U.TAU);
      g.fill();
      g.fillStyle = '#c8b08a';
      g.fillRect(-4, -13, 2.4, 6);
      g.fillRect(1.6, -13, 2.4, 6);
      g.beginPath();
      g.ellipse(0, -9, 4.2, 4.6, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = '#3a5a8a';
      g.beginPath();
      g.ellipse(0, -10, 5.4, 3.4, 0, Math.PI, U.TAU);
      g.fill();
    },
    // three heads on one body, straining forward
    cerberus(g, t) {
      g.fillStyle = '#2a2a2c';
      g.beginPath();
      g.ellipse(0, 4, 8, 10, 0, 0, U.TAU);
      g.fill();
      for (const [x, y, a] of [[-6, -6, -0.5], [0, -9, 0], [6, -6, 0.5]]) {
        g.fillStyle = '#3a3a3e';
        g.beginPath();
        g.ellipse(x, y, 3.2, 4.4, a, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8a440';
        g.fillRect(x - 1.6 + Math.sin(a) * 2, y - 3, 0.9, 0.9);
        g.fillRect(x + 0.7 + Math.sin(a) * 2, y - 3, 0.9, 0.9);
      }
    },
    // the Gorgon (the one that doesn't move): a woman's head of snakes, a hand raised
    medusa(g, t) {
      g.fillStyle = verdigris(g, -0.2);
      g.beginPath();
      g.ellipse(0, 4, 8, 6, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = verdigris(g, 0);
      g.beginPath();
      g.arc(0, -2, 4.6, 0, U.TAU);
      g.fill();
      g.strokeStyle = verdigris(g, 0.15);
      g.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * U.TAU;
        g.beginPath();
        g.moveTo(Math.cos(a) * 4, -2 + Math.sin(a) * 4);
        g.quadraticCurveTo(Math.cos(a + 0.4) * 7, -2 + Math.sin(a + 0.4) * 7, Math.cos(a) * 9.5, -2 + Math.sin(a) * 9.5);
        g.stroke();
      }
    },
    // the princess on her rock, alone (a study for the fountain)
    andromeda(g, t) {
      g.fillStyle = '#4a4440';
      g.beginPath();
      g.ellipse(0, 3, 9, 7, 0.3, 0, U.TAU);
      g.fill();
      g.fillStyle = X.ivory;
      g.beginPath();
      g.ellipse(0, 0, 3.6, 7, 0, 0, U.TAU);
      g.fill();
      g.beginPath();
      g.arc(0, -7, 2.6, 0, U.TAU);
      g.fill();
      g.strokeStyle = '#6a6a6e';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-3, -3);
      g.lineTo(-8, -6);
      g.moveTo(3, -3);
      g.lineTo(8, -6);
      g.stroke();
    },
  };

  const items = {
    // ============================================================ the offices
    'ds-exec-desk': {
      name: 'Executive desk', solid: 'rect', radius: 22, dressing: 'Executive', cache: true, cacheRadius: 42,
      light: { color: '#ffcf8a', radius: 95, intensity: 0.38, dy: -6 },
      init(it) {
        along(it, 2);
        setBox(it, 62, 26, 0, -4);
      },
      interact: readable('Look at the desk'),
      draw(g, it) {
        g.rotate(rot(it));
        // the chair behind it
        g.fillStyle = '#0e0c0a';
        g.beginPath();
        g.arc(0, 16, 9.5, 0, U.TAU);
        g.fill();
        g.fillStyle = X.oxblood;
        G.roundRect(g, -9, 17, 18, 8, 3.5);
        g.fill();
        g.fillStyle = 'rgba(255,200,170,0.12)';
        g.fillRect(-7, 18, 14, 1);
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(-29, -14, 62, 27);
        g.fillStyle = '#1e0f08';
        g.fillRect(-31, -18, 62, 28);
        g.fillStyle = '#4a2416';
        g.fillRect(-30, -17, 60, 26);
        g.fillStyle = 'rgba(255,220,180,0.1)';
        g.fillRect(-30, -17, 60, 1.6);
        // the leather and its gilt tooling
        g.fillStyle = '#1f4a3a';
        g.fillRect(-15, -13, 30, 16);
        g.strokeStyle = U.rgba(X.brass, 0.7);
        g.lineWidth = 0.6;
        g.strokeRect(-14, -12, 28, 14);
        // the banker's lamp, a pen, a blotter, papers
        g.fillStyle = '#2f6b55';
        G.roundRect(g, -27, -15, 9, 4, 2);
        g.fill();
        g.fillStyle = X.brass;
        g.fillRect(-23.6, -11, 1.4, 4);
        g.fillStyle = '#e8e2d4';
        g.save();
        g.translate(21, -6);
        g.rotate(0.25);
        g.fillRect(-4, -5, 8, 10);
        g.fillStyle = 'rgba(0,0,0,0.2)';
        for (let i = -3; i < 4; i += 1.5) g.fillRect(-3, i, 6, 0.4);
        g.restore();
        g.fillStyle = '#121212';
        g.fillRect(-6, -9, 10, 1);
        // the nameplate
        g.fillStyle = X.brass;
        g.fillRect(-7, 5, 14, 2.6);
        g.fillStyle = '#3a2a10';
        g.fillRect(-5, 5.9, 10, 0.6);
      },
      drawGlow(g, it) {
        g.rotate(rot(it));
        G.glow(g, -22.5, -12, 12, '#ffd28a', 0.5);
      },
    },
    'ds-secretary-desk': {
      name: 'Secretary’s desk', solid: 'rect', radius: 18, dressing: 'Executive', cache: true, cacheRadius: 34,
      light: { color: '#ffd28a', radius: 70, intensity: 0.28 },
      init(it) {
        along(it, 2);
        setBox(it, 52, 20, 0, -2);
      },
      interact: readable('Look at the desk'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#121010';
        g.beginPath();
        g.arc(-6, 14, 7, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a4a3a';
        G.roundRect(g, -12, 14, 12, 6, 2.5);
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(-24, -10, 52, 21);
        g.fillStyle = '#24120a';
        g.fillRect(-26, -12, 52, 22);
        g.fillStyle = '#56301c';
        g.fillRect(-25, -11, 50, 20);
        // a typewriter
        g.fillStyle = '#1a1c1e';
        G.roundRect(g, -14, -6, 16, 11, 2);
        g.fill();
        g.fillStyle = '#e8e4da';
        g.fillRect(-11, -9, 10, 4);
        g.fillStyle = '#3a3c40';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) g.fillRect(-12.5 + j * 2, -2 + i * 1.6, 1.1, 1);
        // the intercom, a vase, a blotter
        g.fillStyle = '#2a2a2e';
        g.fillRect(8, -8, 9, 6);
        g.fillStyle = X.amber;
        g.fillRect(9.5, -6.5, 2, 1.2);
        g.fillStyle = '#3f8a6e';
        g.beginPath();
        g.arc(19, 4, 2.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#f2e6f0';
        for (const [x, y] of [[18, 2], [20.4, 3], [19, 5.4]]) {
          g.beginPath();
          g.arc(x, y, 1, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = X.brass;
        g.fillRect(-5, 6, 10, 2);
      },
      drawGlow(g, it) {
        g.rotate(rot(it));
        G.glow(g, 10.5, -6, 5, X.amber, 0.6);
      },
    },
    // the grand desk at Reception: black marble on dark wood, brass, a bell, a guest book (w × h tiles)
    'ds-reception-desk': {
      name: 'Reception desk', solid: 'rect', radius: 30, dressing: 'Executive', cache: true, cacheRadius: (it) => Math.max(it.props.w || 6, it.props.h || 2) * 16 + 8,
      init(it) {
        const w = it.props.w || 6, hh = it.props.h || 2;
        it.x = it.tx * T + (w * T) / 2;
        it.y = it.ty * T + (hh * T) / 2;
        it.box = [w * T - 8, hh * T - 12];
      },
      interact: readable('Read the guest book'),
      draw(g, it) {
        const W = it.box[0], H = it.box[1];
        g.fillStyle = 'rgba(0,0,0,0.45)';
        G.roundRect(g, -W / 2 + 2, -H / 2 + 3, W, H, 10);
        g.fill();
        g.fillStyle = '#1e0f08';
        G.roundRect(g, -W / 2, -H / 2, W, H, 10);
        g.fill();
        g.fillStyle = '#4a2416';
        G.roundRect(g, -W / 2 + 2, -H / 2 + 2, W - 4, H - 4, 8);
        g.fill();
        // the marble top, the inner well where the staff stand
        g.fillStyle = '#121412';
        G.roundRect(g, -W / 2 + 5, -H / 2 + 5, W - 10, H - 14, 6);
        g.fill();
        g.strokeStyle = 'rgba(63,138,110,0.6)';
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(-W / 2 + 10, -H / 2 + 8);
        g.quadraticCurveTo(0, -H / 2 + 14, W / 2 - 14, -H / 2 + 7);
        g.stroke();
        g.strokeStyle = X.brass;
        g.lineWidth = 1;
        G.roundRect(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 9);
        g.stroke();
        // the bell, the guest book, orchids at each end
        g.fillStyle = X.brass;
        g.beginPath();
        g.arc(W / 2 - 22, -2, 2.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#efe6d2';
        g.fillRect(-8, -6, 16, 10);
        g.fillStyle = X.oxblood;
        g.fillRect(-0.5, -6, 1, 10);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = -4; i < 3; i += 1.6) {
          g.fillRect(-6.5, i, 5, 0.4);
          g.fillRect(1.5, i, 5, 0.4);
        }
        for (const s of [-1, 1]) {
          g.fillStyle = '#0c0c0c';
          g.beginPath();
          g.arc(s * (W / 2 - 9), -H / 2 + 8, 4, 0, U.TAU);
          g.fill();
          g.fillStyle = '#f4e8f4';
          for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.arc(s * (W / 2 - 9) + Math.cos(i * 1.6) * 3, -H / 2 + 8 + Math.sin(i * 1.6) * 3, 1.5, 0, U.TAU);
            g.fill();
          }
        }
      },
    },
    'ds-typing-desk': {
      name: 'Typing desk', solid: 'rect', radius: 12, dressing: 'Executive', cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 26, 16, 0, -2);
      },
      interact: readable('Read the page in the typewriter'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#1a1a1a';
        g.beginPath();
        g.arc(0, 11, 5.5, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(-12, -8, 26, 16);
        g.fillStyle = '#4a3a2a';
        g.fillRect(-13, -10, 26, 16);
        g.fillStyle = '#2a2c2e';
        G.roundRect(g, -7, -6, 13, 9, 1.6);
        g.fill();
        g.fillStyle = '#e8e4da';
        g.fillRect(-5, -9, 9, 4);
        if (U.hash2(it.tx, it.ty, 3) < 0.5) {
          g.fillStyle = 'rgba(80,10,10,0.55)';
          g.beginPath();
          g.ellipse(8, 2, 3, 2, 0.3, 0, U.TAU);
          g.fill();
        }
      },
    },
    'ds-club-chair': {
      name: 'Club chair', solid: true, radius: 9, dressing: 'Executive', cache: true,
      draw(g, it) {
        g.rotate(rot(it));
        const c = it.props.color || X.oxblood;
        g.fillStyle = 'rgba(0,0,0,0.4)';
        G.roundRect(g, -9, -8, 19, 18, 5);
        g.fill();
        g.fillStyle = U.shade(c, -0.3);
        G.roundRect(g, -10, -10, 20, 19, 6);
        g.fill();
        g.fillStyle = c;
        G.roundRect(g, -6, -5, 12, 11, 3);
        g.fill();
        g.fillStyle = 'rgba(255,220,200,0.12)';
        g.fillRect(-5, -4, 10, 1);
        // the buttons of a tufted back
        g.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = -1; i <= 1; i++) g.fillRect(i * 5 - 0.5, -8.5, 1, 1);
      },
    },
    'ds-chesterfield': {
      name: 'Chesterfield', solid: 'rect', radius: 14, dressing: 'Executive', cache: true, cacheRadius: 40,
      init(it) {
        const w = it.props.w || 2;
        along(it, w);
        setBox(it, w * T - 6, 18, 0, -2);
      },
      draw(g, it) {
        g.rotate(rot(it));
        const w = (it.props.w || 2) * T - 4, c = it.props.color || '#1f3a2e';
        g.fillStyle = 'rgba(0,0,0,0.4)';
        G.roundRect(g, -w / 2 + 1, -9, w, 20, 5);
        g.fill();
        g.fillStyle = U.shade(c, -0.35);
        G.roundRect(g, -w / 2, -11, w, 20, 5);
        g.fill();
        g.fillStyle = c;
        G.roundRect(g, -w / 2 + 5, -6, w - 10, 13, 3);
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.3)';
        for (let x = -w / 2 + 8; x < w / 2 - 6; x += 5) for (const y of [-9, -6.5]) g.fillRect(x, y, 1, 1);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(-w / 2 + 6, -5, w - 12, 1);
      },
    },
    'ds-bookcase': {
      name: 'Bookcase', solid: 'rect', radius: 12, dressing: 'Executive', cache: true, cacheRadius: 40,
      init(it) {
        const w = it.props.w || 1;
        along(it, w);
        // backs onto a wall: set to the back of the tile
        const d = it.props.dir || 's', k = T / 2 - 6;
        if (d === 's') it.y -= k;
        else if (d === 'n') it.y += k;
        else if (d === 'e') it.x -= k;
        else it.x += k;
        setBox(it, w * T - 2, 12, 0, 0);
      },
      interact: readable('Look at the books'),
      draw(g, it) {
        g.rotate(rot(it));
        const w = (it.props.w || 1) * T - 2;
        g.fillStyle = '#1a0e08';
        g.fillRect(-w / 2, -6, w, 12);
        g.fillStyle = '#2a170e';
        g.fillRect(-w / 2 + 1, -5, w - 2, 10);
        const cols = ['#5a1a16', '#1f4a3a', '#3a2a5a', '#6a5a2a', '#2a2a2a', '#7a3a1a', '#1a2a4a', '#4a4a3a'];
        let x = -w / 2 + 1.6;
        let k = 0;
        while (x < w / 2 - 2.5) {
          const hsh = U.hash2(it.tx * 31 + k, it.ty * 17, 9);
          const bw = 1.6 + hsh * 2.2;
          g.fillStyle = cols[Math.floor(hsh * cols.length)];
          g.fillRect(x, -4 + hsh * 2, bw - 0.3, 8 - hsh * 2);
          if (hsh > 0.7) {
            g.fillStyle = U.rgba(X.brass, 0.6);
            g.fillRect(x, -1, bw - 0.3, 0.5);
          }
          x += bw;
          k++;
        }
        g.fillStyle = X.brass;
        g.fillRect(-w / 2, 5, w, 0.8);
      },
    },
    'ds-library-ladder': {
      name: 'Library ladder', radius: 6, dressing: 'Executive', cache: true, z: 1,
      draw(g, it) {
        g.rotate(rot(it));
        g.strokeStyle = '#3a2014';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-4, -8);
        g.lineTo(-4, 9);
        g.moveTo(4, -8);
        g.lineTo(4, 9);
        g.stroke();
        g.strokeStyle = X.brass;
        g.lineWidth = 1;
        for (let y = -6; y < 9; y += 3) {
          g.beginPath();
          g.moveTo(-4, y);
          g.lineTo(4, y);
          g.stroke();
        }
      },
    },
    'ds-reading-lamp': {
      name: 'Reading lamp', radius: 5, solid: true, dressing: 'Lights', cache: true,
      light: (it) => (it.props.off ? null : { color: it.props.color || '#ffcf8a', radius: it.props.radius || 120, intensity: it.props.intensity == null ? 0.42 : it.props.intensity }),
      draw(g) {
        g.fillStyle = '#1a1a1a';
        g.beginPath();
        g.arc(0, 0, 4.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#f2dcae';
        g.beginPath();
        g.arc(0, 0, 3.4, 0, U.TAU);
        g.fill();
        g.fillStyle = X.brass;
        g.beginPath();
        g.arc(0, 0, 1, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it) {
        if (!it.light || !it.light.off) G.glow(g, 0, 0, 14, '#ffd28a', 0.55);
      },
    },
    'ds-sconce': {
      name: 'Wall sconce', radius: 3, wallMounted: true, shadow: false, dressing: 'Lights',
      light: (it) => ({ color: it.props.color || '#ffc878', radius: it.props.radius || 110, intensity: it.props.intensity == null ? 0.36 : it.props.intensity }),
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        g.fillStyle = X.brass;
        g.fillRect(-3, -2, 6, 2);
        g.fillStyle = '#f6e2b8';
        g.beginPath();
        g.ellipse(0, 1.4, 2.6, 2, 0, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it) {
        if (!it.light || !it.light.off) G.glow(g, 0, 0, 12, '#ffd28a', 0.6);
      },
    },
    'ds-chandelier': {
      name: 'Chandelier', radius: 12, z: 9, shadow: false, dressing: 'Lights',
      light: (it) => ({ color: it.props.color || '#ffdca8', radius: it.props.radius || 240, intensity: it.props.intensity == null ? 0.5 : it.props.intensity }),
      draw(g, it, t) {
        const R = it.props.big ? 16 : 11;
        g.strokeStyle = U.rgba(X.brass, 0.85);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(0, 0, R, 0, U.TAU);
        g.stroke();
        g.beginPath();
        g.arc(0, 0, R * 0.55, 0, U.TAU);
        g.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * U.TAU;
          g.fillStyle = 'rgba(240,250,255,0.55)';
          g.beginPath();
          g.arc(Math.cos(a) * R, Math.sin(a) * R, 1.3, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        if (it.light && it.light.off) return;
        const R = it.props.big ? 16 : 11;
        G.glow(g, 0, 0, R * 2.4, '#ffe0b0', 0.4);
        for (let i = 0; i < 12; i += 2) {
          const a = (i / 12) * U.TAU + t * 0.05;
          G.glow(g, Math.cos(a) * R, Math.sin(a) * R, 4, '#ffffff', 0.3 + 0.2 * Math.sin(t * 3 + i));
        }
      },
    },
    'ds-jade-urn': {
      name: 'Jade urn', radius: 7, solid: true, dressing: 'Executive', destructible: {
        hp: 8,
        onBreak(it, game) {
          game.particles.burst(it.x, it.y, 18, { type: 'chunk', color: [X.jade, X.jadeLight, X.jadeDark], speed: 150, life: 0.8, size: 1.6, vz: 90, z: 3, vr: 10 });
          LM.audio.play('urnBreak', { vol: game.vol(it.x, it.y) });
          if (it.props.holds) game.spawnItemAt(it.props.holds, it.x, it.y, it.props.holdsProps || {});
        },
      },
      draw(g) {
        g.fillStyle = '#121212';
        g.beginPath();
        g.arc(0, 2, 7, 0, U.TAU);
        g.fill();
        const grd = g.createRadialGradient(-2, -2, 0, 0, 0, 6.5);
        grd.addColorStop(0, X.jadeLight);
        grd.addColorStop(1, X.jadeDark);
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, 6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#0e1e18';
        g.beginPath();
        g.arc(0, -1, 2.4, 0, U.TAU);
        g.fill();
        g.strokeStyle = U.rgba(X.brass, 0.8);
        g.lineWidth = 0.7;
        g.beginPath();
        g.arc(0, 0, 4.4, 0, U.TAU);
        g.stroke();
      },
    },
    'ds-orchid': {
      name: 'Orchid', radius: 6, solid: true, dressing: 'Executive', cache: true,
      draw(g, it) {
        g.fillStyle = '#0c0c0c';
        g.beginPath();
        g.arc(0, 0, 5.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a4a2a';
        for (const a of [0.3, 2.2, 4.1]) {
          g.beginPath();
          g.ellipse(Math.cos(a) * 4, Math.sin(a) * 4, 4.6, 1.8, a, 0, U.TAU);
          g.fill();
        }
        const pet = it.props.color || (U.hash2(it.tx, it.ty, 2) < 0.5 ? '#f4e8f4' : '#e8a8d0');
        for (const [x, y] of [[-3, -4], [1, -6], [4, -2], [-1, -1]]) {
          g.fillStyle = pet;
          g.beginPath();
          g.arc(x, y, 1.8, 0, U.TAU);
          g.fill();
          g.fillStyle = '#c84a8a';
          g.fillRect(x - 0.4, y - 0.4, 0.8, 0.8);
        }
      },
    },
    'ds-globe-bar': {
      name: 'Globe bar', radius: 8, solid: true, dressing: 'Executive', cache: true,
      interact: readable('Open the globe'),
      draw(g) {
        g.fillStyle = '#2a170e';
        g.beginPath();
        g.arc(0, 0, 8.5, 0, U.TAU);
        g.fill();
        const grd = g.createRadialGradient(-3, -3, 0, 0, 0, 7.5);
        grd.addColorStop(0, '#d8c08a');
        grd.addColorStop(1, '#7a6030');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, 7, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(60,90,70,0.55)';
        g.beginPath();
        g.ellipse(-2, -1, 3, 2, 0.4, 0, U.TAU);
        g.ellipse(3, 2, 2, 3, -0.3, 0, U.TAU);
        g.fill();
        g.strokeStyle = X.brass;
        g.lineWidth = 0.8;
        g.beginPath();
        g.arc(0, 0, 7.6, 0, U.TAU);
        g.stroke();
      },
    },
    'ds-velvet-rope': {
      name: 'Velvet rope', radius: 4, dressing: 'Executive', cache: true, cacheRadius: (it) => (it.props.len || 2) * T + 8,
      draw(g, it) {
        g.rotate(rot(it));
        const len = (it.props.len || 2) * T;
        g.strokeStyle = '#7a1418';
        g.lineWidth = 1.8;
        for (let x = 0; x < len - T; x += T) {
          g.beginPath();
          g.moveTo(x, 0);
          g.quadraticCurveTo(x + T / 2, 4, x + T, 0);
          g.stroke();
        }
        for (let x = 0; x < len; x += T) {
          g.fillStyle = '#1a1a1a';
          g.beginPath();
          g.arc(x, 0, 3, 0, U.TAU);
          g.fill();
          g.fillStyle = X.brass;
          g.beginPath();
          g.arc(x, 0, 1.8, 0, U.TAU);
          g.fill();
        }
      },
    },
    'ds-viewing-chair': {
      name: 'Viewing chair', solid: true, radius: 9, dressing: 'Executive',
      interact: readable('Read the programme on the seat'),
      cache: true,
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(0,0,0,0.45)';
        G.roundRect(g, -9, -8, 19, 18, 5);
        g.fill();
        g.fillStyle = '#121010';
        G.roundRect(g, -10, -10, 20, 19, 6);
        g.fill();
        g.fillStyle = '#2a1a14';
        G.roundRect(g, -6.5, -4, 13, 11, 3);
        g.fill();
        g.fillStyle = 'rgba(255,220,190,0.1)';
        g.fillRect(-5.5, -3, 11, 1);
        if (it.props.text) {
          g.fillStyle = '#efe6d2';
          g.save();
          g.translate(1, 2);
          g.rotate(0.3);
          g.fillRect(-2.5, -3.5, 5, 7);
          g.fillStyle = X.oxblood;
          g.fillRect(-2.5, -3.5, 5, 1.6);
          g.restore();
        }
      },
    },
    'ds-gallery-rail': {
      name: 'Brass rail', radius: 3, dressing: 'Executive', shadow: false, cache: true, cacheRadius: (it) => (it.props.len || 2) * T + 8,
      draw(g, it) {
        g.rotate(rot(it));
        const len = (it.props.len || 2) * T;
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(-1, 1.4, len + 2, 1.6);
        g.fillStyle = X.brass;
        g.fillRect(-1, -1, len + 2, 2);
        g.fillStyle = 'rgba(255,240,200,0.5)';
        g.fillRect(-1, -1, len + 2, 0.6);
        for (let x = 0; x <= len; x += 16) {
          g.fillStyle = '#6a5020';
          g.beginPath();
          g.arc(x, 0, 1.6, 0, U.TAU);
          g.fill();
        }
      },
    },
    'ds-billiards': {
      name: 'Billiard table', solid: 'rect', radius: 22, dressing: 'Executive', cache: true, cacheRadius: 44,
      init(it) {
        it.x = it.tx * T + T;
        it.y = it.ty * T + T / 2 + 8;
        it.box = [60, 34];
      },
      draw(g) {
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(-29, -15, 62, 36);
        g.fillStyle = '#2a170e';
        g.fillRect(-31, -18, 62, 36);
        g.fillStyle = '#1d4a34';
        g.fillRect(-27, -14, 54, 28);
        g.fillStyle = 'rgba(255,255,255,0.05)';
        g.fillRect(-27, -14, 54, 2);
        g.fillStyle = '#060606';
        for (const [x, y] of [[-27, -14], [0, -14], [27, -14], [-27, 14], [0, 14], [27, 14]]) {
          g.beginPath();
          g.arc(x, y, 2.4, 0, U.TAU);
          g.fill();
        }
        const balls = ['#e8e4da', '#e8c040', '#3050c0', '#c03030', '#5a2a8a', '#e87a20', '#2a8a4a', '#8a2020', '#111111'];
        for (let i = 0; i < balls.length; i++) {
          g.fillStyle = balls[i];
          g.beginPath();
          g.arc(-8 + (i % 4) * 6 + Math.floor(i / 4) * 3, -5 + Math.floor(i / 4) * 5, 1.9, 0, U.TAU);
          g.fill();
        }
      },
    },
    'ds-humidor': {
      name: 'Humidor', radius: 8, solid: 'rect', dressing: 'Executive', cache: true,
      init(it) {
        setBox(it, 22, 14, 0, 0);
      },
      interact: readable('Open the humidor'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#1a0e08';
        g.fillRect(-11, -7, 22, 14);
        g.fillStyle = '#5a3018';
        g.fillRect(-10, -6, 20, 12);
        g.fillStyle = 'rgba(200,240,255,0.15)';
        g.fillRect(-8, -4, 16, 8);
        g.fillStyle = '#7a4a2a';
        for (let i = 0; i < 5; i++) g.fillRect(-7 + i * 3, -3, 2, 6);
        g.fillStyle = X.brass;
        g.fillRect(-1.5, 5, 3, 1.2);
      },
    },
    'ds-wine-rack': {
      name: 'Wine rack', radius: 10, solid: 'rect', dressing: 'Executive', cache: true, cacheRadius: 26,
      init(it) {
        setBox(it, T - 2, 10, 0, -T / 2 + 6);
        const d = it.props.dir || 's';
        const k = T / 2 - 5;
        if (d === 's') it.y -= k;
        else if (d === 'n') it.y += k;
        else if (d === 'e') it.x -= k;
        else it.x += k;
        it.boxOff = [0, 0];
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#1a0e08';
        g.fillRect(-15, -5, 30, 10);
        for (let i = 0; i < 7; i++) {
          g.fillStyle = ['#2a0a10', '#1a2a12', '#3a1a08'][(i + it.tx) % 3];
          g.beginPath();
          g.arc(-12 + i * 4, 0, 1.7, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(255,240,220,0.3)';
          g.fillRect(-12.6 + i * 4, -1.2, 0.6, 0.6);
        }
      },
    },
    'ds-board-table': {
      name: 'The board’s table', solid: 'rect', radius: 30, dressing: 'Executive', cache: true, cacheRadius: (it) => Math.max(it.props.w || 4, it.props.h || 2) * T,
      init(it) {
        const w = it.props.w || 4, hh = it.props.h || 2;
        it.x = it.tx * T + (w * T) / 2;
        it.y = it.ty * T + (hh * T) / 2;
        it.box = [w * T - 8, hh * T - 8];
      },
      draw(g, it) {
        const w = (it.props.w || 4) * T - 8, hh = (it.props.h || 2) * T - 8;
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.beginPath();
        g.ellipse(2, 3, w / 2, hh / 2, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#0c0a08';
        g.beginPath();
        g.ellipse(0, 0, w / 2, hh / 2, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1e140e';
        g.beginPath();
        g.ellipse(0, 0, w / 2 - 2, hh / 2 - 2, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = U.rgba(X.amber, 0.7);
        g.lineWidth = 0.8;
        g.beginPath();
        g.ellipse(0, 0, w / 2 - 5, hh / 2 - 5, 0, 0, U.TAU);
        g.stroke();
        // the labrys inlaid at its heart: a double axe whose blades are open hands
        g.fillStyle = U.rgba(X.amber, 0.75);
        g.fillRect(-0.8, -8, 1.6, 16);
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(0, -5);
          g.quadraticCurveTo(s * 9, -9, s * 8, 0);
          g.quadraticCurveTo(s * 9, 6, 0, 3);
          g.fill();
        }
      },
    },
    'ds-board-chair': {
      name: 'Board chair', solid: true, radius: 8, dressing: 'Executive', cache: true,
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#060606';
        G.roundRect(g, -8, -9, 16, 17, 5);
        g.fill();
        g.fillStyle = '#1a1614';
        G.roundRect(g, -5.5, -4, 11, 10, 3);
        g.fill();
        g.fillStyle = X.amber;
        g.fillRect(-1, -8, 2, 1.6);
      },
    },
    'ds-round-bed': {
      name: 'A round bed', solid: true, radius: 28, solidRadius: 26, dressing: 'Executive', cache: true, cacheRadius: 40,
      init(it) {
        it.x = it.tx * T + T;
        it.y = it.ty * T + T;
      },
      draw(g) {
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.beginPath();
        g.arc(2, 3, 30, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1a0e08';
        g.beginPath();
        g.arc(0, 0, 30, 0, U.TAU);
        g.fill();
        g.fillStyle = '#4a1418';
        g.beginPath();
        g.arc(0, 0, 27, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a1c20';
        g.beginPath();
        g.arc(2, 4, 22, 0, U.TAU);
        g.fill();
        g.fillStyle = '#efe6d2';
        for (const [x, y] of [[-10, -14], [6, -16]]) {
          G.roundRect(g, x - 7, y - 4, 14, 8, 3);
          g.fill();
        }
        g.strokeStyle = U.rgba(X.brass, 0.6);
        g.lineWidth = 0.8;
        g.beginPath();
        g.arc(0, 0, 28.5, 0, U.TAU);
        g.stroke();
      },
    },
    'ds-vanity': {
      name: 'Vanity', solid: 'rect', radius: 12, dressing: 'Executive', cache: true,
      init(it) {
        setBox(it, 28, 12, 0, -3);
      },
      interact: readable('Look in the drawer'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#1a0e08';
        g.fillRect(-14, -9, 28, 12);
        g.fillStyle = '#4a2416';
        g.fillRect(-13, -8, 26, 10);
        g.fillStyle = 'rgba(210,230,240,0.5)';
        g.beginPath();
        g.ellipse(0, -9, 8, 2.4, 0, Math.PI, U.TAU);
        g.fill();
        for (const [x, c] of [[-8, '#e8c040'], [-5, '#a03050'], [6, '#e8e4da']]) {
          g.fillStyle = c;
          g.fillRect(x, -5, 2, 3);
        }
      },
    },
    'ds-wardrobe': {
      name: 'Wardrobe', solid: 'rect', radius: 14, dressing: 'Executive', cache: true, cacheRadius: 30,
      init(it) {
        setBox(it, 30, 14, 0, -T / 2 + 8);
      },
      interact: readable('Open the wardrobe'),
      draw(g, it) {
        g.rotate(rot(it));
        g.translate(0, -T / 2 + 8);
        g.fillStyle = '#140a06';
        g.fillRect(-15, -7, 30, 14);
        g.fillStyle = '#3a1e12';
        g.fillRect(-14, -6, 13.5, 12);
        g.fillRect(0.5, -6, 13.5, 12);
        g.fillStyle = X.brass;
        g.fillRect(-2, -1, 1, 3);
        g.fillRect(1, -1, 1, 3);
      },
    },
    // ============================================================ the kitchen
    'ds-prep-counter': {
      name: 'Prep counter', solid: 'rect', radius: 14, dressing: 'Executive', cache: true, cacheRadius: (it) => (it.props.w || 2) * T,
      init(it) {
        const w = it.props.w || 2;
        along(it, w);
        setBox(it, w * T - 2, 20, 0, 0);
      },
      draw(g, it) {
        g.rotate(rot(it));
        const w = (it.props.w || 2) * T - 2;
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(-w / 2 + 1, -8, w, 21);
        g.fillStyle = '#5a5e62';
        g.fillRect(-w / 2, -10, w, 20);
        g.fillStyle = '#8a9096';
        g.fillRect(-w / 2 + 1, -9, w - 2, 18);
        g.fillStyle = 'rgba(255,255,255,0.15)';
        g.fillRect(-w / 2 + 1, -9, w - 2, 1);
        // what's on it: cleavers, a board, something red
        const r = U.mulberry32(it.tx * 7 + it.ty * 13);
        for (let i = 0; i < 2; i++) {
          const x = -w / 2 + 8 + r() * (w - 18);
          g.fillStyle = '#6a4a2a';
          g.fillRect(x - 5, -5, 10, 8);
          g.fillStyle = r() < 0.6 ? 'rgba(120,10,16,0.6)' : '#e8d8b0';
          g.beginPath();
          g.ellipse(x, -1, 3, 2, 0, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = '#c8ccd0';
        g.fillRect(w / 2 - 12, 3, 8, 1.6);
        g.fillStyle = '#1a1a1a';
        g.fillRect(w / 2 - 15, 2.6, 3, 2.4);
      },
    },
    'ds-range': {
      name: 'Range', solid: 'rect', radius: 14, dressing: 'Executive', cacheRadius: 34,
      light: (it) => ({ color: '#ff7a3a', radius: 90, intensity: 0.25, flicker: 0.2 }),
      init(it) {
        along(it, it.props.w || 2);
        setBox(it, (it.props.w || 2) * T - 2, 22, 0, 0);
      },
      draw(g, it, t, game) {
        g.rotate(rot(it));
        const w = (it.props.w || 2) * T - 2, on = !(game && game.hasFlag && game.hasFlag('kitchenOff'));
        g.fillStyle = '#1a1b1c';
        g.fillRect(-w / 2, -11, w, 22);
        g.fillStyle = '#2a2c2e';
        g.fillRect(-w / 2 + 1, -10, w - 2, 20);
        for (let i = 0; i < Math.floor(w / 14); i++) {
          const x = -w / 2 + 8 + i * 14;
          for (const y of [-4, 4]) {
            g.strokeStyle = on ? 'rgba(255,' + Math.round(100 + 40 * Math.sin(t * 6 + i)) + ',40,0.9)' : '#3a3c3e';
            g.lineWidth = 1.2;
            g.beginPath();
            g.arc(x, y, 3.6, 0, U.TAU);
            g.stroke();
          }
        }
        // a pan with something in it
        g.fillStyle = '#0c0c0c';
        g.beginPath();
        g.arc(-w / 2 + 8, -4, 4.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a1a10';
        g.beginPath();
        g.arc(-w / 2 + 8, -4, 3.4, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t, game) {
        if (game && game.hasFlag('kitchenOff')) return;
        g.rotate(rot(it));
        const w = (it.props.w || 2) * T - 2;
        for (let i = 0; i < Math.floor(w / 14); i++) G.glow(g, -w / 2 + 8 + i * 14, 0, 14, '#ff6a2a', 0.25 + 0.1 * Math.sin(t * 5 + i));
      },
    },
    // a belt that carries plates: from the kitchen into the dining room, under a hatch
    'ds-conveyor': {
      name: 'Conveyor', radius: 6, dressing: 'Executive', shadow: false, cacheRadius: (it) => (it.props.len || 3) * T,
      draw(g, it, t, game) {
        g.rotate(rot(it));
        const len = (it.props.len || 3) * T, run = game && game.hasFlag && game.hasFlag('kitchenOff') ? 0 : t * 20;
        g.fillStyle = '#2a2c2e';
        g.fillRect(-T / 2, -8, len, 16);
        g.fillStyle = '#121314';
        g.fillRect(-T / 2, -6, len, 12);
        g.fillStyle = '#2a2c2e';
        for (let x = -T / 2 + (run % 6); x < len - T / 2; x += 6) g.fillRect(x, -6, 1, 12);
        for (let x = -T / 2 + (run % 40); x < len - T / 2 - 8; x += 40) {
          g.fillStyle = '#efe6d2';
          g.beginPath();
          g.arc(x + 6, 0, 4.6, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(110,10,14,0.8)';
          g.beginPath();
          g.arc(x + 6, 0, 2.4, 0, U.TAU);
          g.fill();
        }
      },
    },
    // ============================================================ robots at rest
    'ds-robot-pod': {
      name: 'Charging pod', radius: 13, solid: 'rect', dressing: 'Executive', cacheRadius: 26,
      init(it) {
        setBox(it, 26, 10, 0, -T / 2 + 5);
      },
      draw(g, it, t) {
        g.rotate(rot(it));
        g.fillStyle = '#121314';
        g.fillRect(-14, -T / 2, 28, 12);
        g.fillStyle = '#2a2c30';
        g.fillRect(-13, -T / 2 + 1, 26, 10);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath();
        g.ellipse(0, 2, 12, 9, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = U.rgba(X.amber, 0.6);
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(0, 2, 12, 9, 0, 0, U.TAU);
        g.stroke();
        if (!it.props.empty) {
          // a shape in it, standing very still
          g.fillStyle = '#d8d4c8';
          G.roundRect(g, -5, -4, 10, 8, 3);
          g.fill();
          g.fillStyle = '#e8e4da';
          g.beginPath();
          g.arc(0, 1, 3.2, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        G.glow(g, 0, -T / 2 + 6, 8, it.props.empty ? '#ff3a2a' : X.amber, 0.35 + 0.15 * Math.sin(t * 2 + it.tx));
      },
    },
    'ds-parts-rack': {
      name: 'Parts rack', radius: 12, solid: 'rect', dressing: 'Executive', cache: true, cacheRadius: 24,
      init(it) {
        setBox(it, T - 2, 12, 0, -T / 2 + 7);
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.translate(0, -T / 2 + 7);
        g.fillStyle = '#1a1b1c';
        g.fillRect(-15, -6, 30, 12);
        for (let i = 0; i < 5; i++) {
          g.fillStyle = ['#e8e4da', '#8a9096', X.amber, '#5a5e62', '#d8d4c8'][(i + it.ty) % 5];
          g.beginPath();
          g.arc(-11 + i * 5.5, 0, 2.2, 0, U.TAU);
          g.fill();
        }
      },
    },
    // ============================================================ the plant
    'ds-hvac': {
      name: 'Air handler', radius: 22, solid: 'rect', dressing: 'Executive', cacheRadius: 40,
      init(it) {
        it.x = it.tx * T + T;
        it.y = it.ty * T + T / 2;
        it.box = [60, 28];
      },
      interact: readable('Read the plate'),
      draw(g, it, t) {
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(-28, -12, 60, 28);
        g.fillStyle = '#3a3d40';
        g.fillRect(-30, -14, 60, 28);
        g.fillStyle = '#4a4e52';
        g.fillRect(-29, -13, 58, 26);
        for (const cx of [-14, 14]) {
          g.fillStyle = '#121314';
          g.beginPath();
          g.arc(cx, 0, 10, 0, U.TAU);
          g.fill();
          g.save();
          g.translate(cx, 0);
          g.rotate(t * 7);
          g.fillStyle = '#5a5e62';
          for (let i = 0; i < 5; i++) {
            g.rotate(U.TAU / 5);
            g.beginPath();
            g.ellipse(4.5, 0, 4.5, 1.8, 0.3, 0, U.TAU);
            g.fill();
          }
          g.restore();
        }
      },
    },
    'ds-power-panel': {
      name: 'Switchgear', radius: 12, solid: 'rect', dressing: 'Executive', cacheRadius: 24,
      init(it) {
        setBox(it, T - 2, 12, 0, -T / 2 + 7);
      },
      interact: readable('Read the panel'),
      draw(g, it, t) {
        g.rotate(rot(it));
        g.translate(0, -T / 2 + 7);
        g.fillStyle = '#1a1b1c';
        g.fillRect(-15, -6, 30, 12);
        g.fillStyle = '#5a5e62';
        g.fillRect(-14, -5, 28, 10);
        for (let i = 0; i < 6; i++) {
          g.fillStyle = '#121314';
          g.fillRect(-12 + i * 4.4, -3, 3, 6);
          g.fillStyle = (it.props.dead || []).includes(i) ? '#ff3a2a' : X.amber;
          g.fillRect(-12 + i * 4.4 + 0.8, (it.props.dead || []).includes(i) ? 1 : -2, 1.4, 1.4);
        }
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        g.translate(0, -T / 2 + 7);
        for (let i = 0; i < 6; i++) G.glow(g, -12 + i * 4.4 + 1.5, (it.props.dead || []).includes(i) ? 1.7 : -1.3, 3.5, (it.props.dead || []).includes(i) ? '#ff3a2a' : X.amber, 0.6);
      },
    },
    'ds-pipe-run': {
      name: 'Pipe run', radius: 4, dressing: 'Executive', shadow: false, cache: true, cacheRadius: (it) => (it.props.len || 3) * T,
      draw(g, it) {
        g.rotate(rot(it));
        const len = (it.props.len || 3) * T;
        for (const [y, c] of [[-4, '#5a3a2a'], [1, '#3a4a5a'], [5, '#4a4e52']]) {
          g.fillStyle = 'rgba(0,0,0,0.4)';
          g.fillRect(-T / 2, y + 1.5, len, 2.6);
          g.fillStyle = c;
          g.fillRect(-T / 2, y, len, 2.8);
          g.fillStyle = 'rgba(255,255,255,0.15)';
          g.fillRect(-T / 2, y, len, 0.6);
          for (let x = -T / 2 + 20; x < len - T / 2; x += 40) {
            g.fillStyle = '#1a1b1c';
            g.fillRect(x, y - 0.6, 2.4, 4);
          }
        }
      },
    },
    // ============================================================ the Control Room
    'ds-control-console': {
      name: 'Control console', radius: 14, solid: 'rect', dressing: 'Executive', cacheRadius: (it) => (it.props.w || 2) * T,
      init(it) {
        const w = it.props.w || 2;
        along(it, w);
        setBox(it, w * T - 4, 16, 0, -4);
      },
      interact: readable('Read the screens'),
      draw(g, it, t) {
        g.rotate(rot(it));
        const w = (it.props.w || 2) * T - 4;
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(-w / 2 + 1, -11, w, 17);
        g.fillStyle = '#1a1b1c';
        g.fillRect(-w / 2, -13, w, 16);
        g.fillStyle = '#2a2c2e';
        g.fillRect(-w / 2 + 1, -12, w - 2, 14);
        const n = Math.max(2, Math.floor(w / 13));
        for (let i = 0; i < n; i++) {
          const x = -w / 2 + 3 + i * ((w - 6) / n);
          g.fillStyle = '#081210';
          g.fillRect(x, -11, (w - 6) / n - 2, 7);
        }
        g.fillStyle = '#121314';
        for (let i = 0; i < w - 8; i += 3) g.fillRect(-w / 2 + 4 + i, -2, 2, 1.6);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        const w = (it.props.w || 2) * T - 4, n = Math.max(2, Math.floor(w / 13));
        for (let i = 0; i < n; i++) {
          const x = -w / 2 + 3 + i * ((w - 6) / n), ww = (w - 6) / n - 2;
          const red = it.props.alarm;
          g.fillStyle = red ? 'rgba(255,58,42,0.5)' : 'rgba(122,200,164,0.4)';
          for (let k = 0; k < 3; k++) g.fillRect(x + 1, -10 + k * 2, ww * (0.3 + 0.6 * U.hash2(i, k + Math.floor(t * 2), it.tx)), 0.8);
          G.glow(g, x + ww / 2, -7.5, 8, red ? '#ff3a2a' : X.jadeLight, 0.3);
        }
      },
    },
    'ds-wall-display': {
      name: 'Wall display', radius: 6, wallMounted: true, shadow: false, dressing: 'Executive',
      interact: readable('Read the display'),
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        const w = (it.props.w || 2) * T - 6;
        g.fillStyle = '#0a0c0b';
        g.fillRect(-w / 2, -3, w, 4.6);
      },
      drawGlow(g, it, t) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        const w = (it.props.w || 2) * T - 6;
        // the building, floor by floor: five bars and a sixth below, one of them pulsing
        for (let i = 0; i < 6; i++) {
          const x = -w / 2 + 2 + (i * (w - 4)) / 6;
          const live = i === 5 ? 0.25 + 0.25 * Math.sin(t * 3) : 0.35;
          g.fillStyle = i === 5 ? 'rgba(122,200,164,' + (live + 0.3) + ')' : 'rgba(232,164,64,' + live + ')';
          g.fillRect(x, -2, (w - 4) / 6 - 1.5, 2.6);
        }
        G.glow(g, 0, -1, w * 0.5, X.amber, 0.12);
      },
    },
    // the eye in the boardroom's shutters: a lens that turns to keep you in view
    'ds-board-eye': {
      name: 'Camera eye', radius: 5, wallMounted: true, shadow: false, dressing: 'Executive',
      update(it, dt, game) {
        const P = game.player;
        if (!P) return;
        const want = Math.atan2(P.y - it.y, P.x - it.x);
        it.look = it.look == null ? want : it.look + U.angDiff(it.look, want) * Math.min(1, dt * 3);
      },
      draw(g, it) {
        g.fillStyle = '#0a0a0a';
        g.beginPath();
        g.arc(0, 0, 5.4, 0, U.TAU);
        g.fill();
        g.fillStyle = X.amber;
        g.beginPath();
        g.arc(0, 0, 4.2, 0, U.TAU);
        g.fill();
        const a = it.look || 0;
        g.fillStyle = '#0a0a0a';
        g.beginPath();
        g.arc(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        const a = it.look || 0;
        G.glow(g, Math.cos(a) * 1.8, Math.sin(a) * 1.8, 9, '#ff6a2a', 0.5 + 0.15 * Math.sin(t * 2));
      },
    },
    'ds-office-sign': {
      name: 'Nameplate', radius: 4, wallMounted: true, shadow: false, dressing: 'Executive',
      interact: readable('Read the nameplate'),
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        g.fillStyle = '#3a2a10';
        g.fillRect(-9, -2.2, 18, 4);
        g.fillStyle = X.brass;
        g.fillRect(-8.4, -1.8, 16.8, 3.2);
        g.fillStyle = '#3a2a10';
        g.fillRect(-6, -0.6, 12, 0.6);
      },
    },

    // ============================================================ the art
    'ds-statue': {
      name: 'Statue', solid: true, radius: 14, solidRadius: 14, dressing: 'Executive', cache: true, cacheRadius: 30,
      interact: readable('Read the plaque'),
      draw(g, it, t) {
        plinth(g, 15);
        g.save();
        g.rotate(rot(it));
        (STATUES[it.props.kind] || STATUES.minotaur)(g, t);
        g.restore();
      },
    },
    // Andromeda on her rock, chained, and Cetus coiling up out of the water for her
    'ds-fountain': {
      name: 'Fountain', solid: true, radius: 40, dressing: 'Executive', shadow: false,
      light: { color: '#8ad8c0', radius: 170, intensity: 0.22, flicker: 0.04 },
      init(it) {
        const w = it.props.w || 5;
        it.R = (w * T) / 2 - 3;
        it.r = it.R;
        it.x = it.tx * T + T / 2;
        it.y = it.ty * T + T / 2;
      },
      interact: readable('Read the inscription on the rim'),
      draw(g, it, t) {
        const R = it.R;
        // the basin: green marble, a gilt lip, water
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.beginPath();
        g.arc(3, 4, R + 2, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1c3a2e';
        g.beginPath();
        g.arc(0, 0, R, 0, U.TAU);
        g.fill();
        g.strokeStyle = X.brass;
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, 0, R - 0.8, 0, U.TAU);
        g.stroke();
        const W = R - 6;
        const grd = g.createRadialGradient(0, 0, 4, 0, 0, W);
        grd.addColorStop(0, '#1f5a4a');
        grd.addColorStop(1, '#0c2a22');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, W, 0, U.TAU);
        g.fill();
        // ripples moving out from the middle
        for (let i = 0; i < 4; i++) {
          const k = ((t * 0.35 + i / 4) % 1);
          g.strokeStyle = 'rgba(168,224,196,' + (0.22 * (1 - k)) + ')';
          g.lineWidth = 0.8;
          g.beginPath();
          g.arc(0, 0, 14 + k * (W - 14), 0, U.TAU);
          g.stroke();
        }
        // Cetus: a long body in coils round the rock, fins along it, its head rising toward her
        g.save();
        const sk = Math.max(1, R / 77);
        g.scale(sk, sk);
        g.lineCap = 'round';
        const coil = (w, col) => {
          g.strokeStyle = col;
          g.lineWidth = w;
          g.beginPath();
          for (let i = 0; i <= 40; i++) {
            const a = -0.6 + (i / 40) * 5.2, rr = 22 - i * 0.22;
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.85;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        };
        coil(9, '#1a3a32');
        coil(6.4, '#3a6a5a');
        coil(2, '#5a8a7a');
        g.lineCap = 'butt';
        // fins
        g.fillStyle = '#2a5a4a';
        for (let i = 4; i < 38; i += 6) {
          const a = -0.6 + (i / 40) * 5.2, rr = 22 - i * 0.22;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.85;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 5);
          g.lineTo(x + Math.cos(a + 0.4) * 2, y + Math.sin(a + 0.4) * 2);
          g.fill();
        }
        // the head, jaws open, rising at the end of the coil
        const ha = -0.6 + 5.2, hr = 13.2;
        const hx = Math.cos(ha) * hr, hy = Math.sin(ha) * hr * 0.85;
        g.save();
        g.translate(hx, hy);
        g.rotate(ha + Math.PI / 2 + 0.8);
        g.fillStyle = '#3a6a5a';
        g.beginPath();
        g.ellipse(0, 0, 5, 8, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#0a1a14';
        g.beginPath();
        g.moveTo(-3, -6);
        g.lineTo(0, -12);
        g.lineTo(3, -6);
        g.fill();
        g.fillStyle = '#e8e0c8';
        for (let i = -2; i <= 2; i++) g.fillRect(i * 1.2 - 0.3, -8, 0.6, 1.6);
        g.restore();
        // the rock, and Andromeda chained to it, white marble
        g.fillStyle = '#3a3632';
        g.beginPath();
        g.ellipse(0, 0, 10, 8.4, 0.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#4a4640';
        g.beginPath();
        g.ellipse(-1.5, -1, 7, 5.6, 0.4, 0, U.TAU);
        g.fill();
        g.fillStyle = X.ivory;
        g.beginPath();
        g.ellipse(0.5, 0.5, 2.6, 5.4, -0.2, 0, U.TAU);
        g.fill();
        g.beginPath();
        g.arc(1.4, -5, 2.1, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#7a7a80';
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(-1.5, -2);
        g.lineTo(-7, -4);
        g.moveTo(2.5, -2);
        g.lineTo(7.5, -2);
        g.stroke();
        g.fillStyle = X.ivory;
        g.beginPath();
        g.arc(-6.5, -4, 1, 0, U.TAU);
        g.arc(7, -2, 1, 0, U.TAU);
        g.fill();
        g.restore();
      },
      drawGlow(g, it, t) {
        // the water catches the light; the jet from the beast's mouth
        G.glow(g, 0, 0, it.R * 1.1, '#5ab89a', 0.12 + 0.03 * Math.sin(t));
        const sk = Math.max(1, it.R / 77);
        g.scale(sk, sk);
        const ha = -0.6 + 5.2, hr = 13.2;
        const hx = Math.cos(ha) * hr, hy = Math.sin(ha) * hr * 0.85;
        for (let i = 0; i < 5; i++) {
          const k = (t * 1.6 + i / 5) % 1;
          G.glow(g, hx + (1 - k) * 2 - 6 * k, hy - 10 * k + 12 * k * k, 2.5, '#c8f0e0', 0.4 * (1 - k));
        }
      },
      update(it, dt, game) {
        if (Math.random() < dt * 6) game.particles.add({ type: 'dot', x: it.x + U.rand(-10, 10), y: it.y + U.rand(-10, 10), vx: U.rand(-20, 20), vy: U.rand(-30, 5), life: 0.6, size: 0.9, color: '#c8f0e0', drag: 2 });
      },
    },
    // the drain that drinks the sea: a basin; on a cycle it turns, and pulls, and has teeth at the bottom
    'ds-charybdis': {
      name: 'Charybdis', radius: 44, dressing: 'Executive', shadow: false, mapColor: '#2f6b8a', z: -2,
      pull: { radius: 150, strength: 230, swirl: 0.55, core: 18, damage: 11, interval: 0.4, enemies: true },
      init(it) {
        const w = it.props.w || 4;
        it.R = (w * T) / 2 - 2;
        it.x = it.tx * T + T / 2;
        it.y = it.ty * T + T / 2;
        it.spin = 0;
        it.pullOff = true;
        it.phase = U.rand(0, 3);
      },
      update(it, dt, game) {
        const on = it.props.on || 7, off = it.props.off || 4;
        const quiet = it.props.until && game.hasFlag(it.props.until);
        it.phase = (it.phase + dt) % (on + off);
        const turning = !quiet && it.phase < on;
        // it winds up before it pulls, and slows before it stops
        it.k = quiet ? 0 : turning ? Math.min(1, it.phase / 1.2) : Math.max(0, 1 - (it.phase - on) / 0.8);
        it.pullOff = it.k < 0.5;
        it.spin += dt * (0.4 + it.k * 3.4);
        if (it.k > 0.5 && game.player) {
          const v = U.clamp(1 - U.dist(it.x, it.y, game.player.x, game.player.y) / 520, 0, 1);
          it.roarT = (it.roarT || 0) - dt;
          if (it.roarT <= 0 && v > 0.05) {
            it.roarT = 1.1;
            LM.audio.play('whirlpool', { vol: v * it.k });
          }
        }
      },
      draw(g, it, t) {
        const R = it.R;
        g.fillStyle = '#1c3a2e';
        g.beginPath();
        g.arc(0, 0, R, 0, U.TAU);
        g.fill();
        g.strokeStyle = X.brass;
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(0, 0, R - 0.8, 0, U.TAU);
        g.stroke();
        const W = R - 4;
        const grd = g.createRadialGradient(0, 0, 0, 0, 0, W);
        grd.addColorStop(0, '#000000');
        grd.addColorStop(0.25, '#06141a');
        grd.addColorStop(1, '#14404a');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, W, 0, U.TAU);
        g.fill();
        // the spiral arms of the current
        const k = it.k || 0;
        g.save();
        g.rotate(it.spin || 0);
        for (let arm = 0; arm < 5; arm++) {
          g.strokeStyle = 'rgba(168,224,220,' + (0.1 + 0.3 * k) + ')';
          g.lineWidth = 1 + k;
          g.beginPath();
          for (let i = 0; i <= 24; i++) {
            const f = i / 24, a = arm * (U.TAU / 5) + f * 4.2, rr = 6 + f * (W - 8);
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        }
        g.restore();
        // at the bottom, teeth: a ring of them, and they close
        const close = 0.5 + 0.5 * Math.sin(t * 4);
        g.fillStyle = '#e8e0c8';
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * U.TAU - (it.spin || 0) * 0.3;
          const r0 = 9, r1 = 9 - 4 - 3 * close * k;
          g.beginPath();
          g.moveTo(Math.cos(a - 0.15) * r0, Math.sin(a - 0.15) * r0);
          g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
          g.lineTo(Math.cos(a + 0.15) * r0, Math.sin(a + 0.15) * r0);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        const k = it.k || 0;
        if (k > 0.05) G.glow(g, 0, 0, it.R, '#5ab8c8', 0.12 * k);
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('whirlpool', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 380, freqEnd: 180, dur: 1.2, gain: 0.22, attack: 0.25 });
      kit.noise(t, o, { type: 'bandpass', freq: 900, freqEnd: 500, dur: 1, gain: 0.05, q: 2, attack: 0.3 });
    });
    LM.audio.define('urnBreak', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 3000, dur: 0.25, gain: 0.2 });
      for (let i = 0; i < 4; i++) kit.tone(t + i * 0.03, o, { type: 'sine', f0: 2400 + i * 500, f1: 1800 + i * 400, dur: 0.12, gain: 0.03 });
    });
  }

  LM.definePack({ id: 'ds-executive', items });
})();
