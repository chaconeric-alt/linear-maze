/* Dead Signal — packs/ds-lab/gestation.js
 * Floor 3's dressings: Gestation's labs, its growth vats, its cells and their files, and the briefing
 * suite where partners were told about macroscopic synthids.
 *
 *   ds-vat              a growth vat (a glass cylinder, 2 x 2 tiles, lit from inside). props.state: occupied
 *                       (default), moving (it shifts in there), empty, broken. props.shape: what's in it
 *                       (sitter, lantern, curled, limbs, midwife). props.title / props.text: its label.
 *   ds-cell-sign        the placard beside a containment cell (on a wall): props.label, props.status
 *                       (CONTAINED, BREACH, EMPTY, TRANSFERRED), props.text when read
 *   ds-specimen-file    a specimen file terminal on a stand. Reading it sets every flag in props.flags
 *                       (the Director asks about them on the stairs); props.ariadne adds a line in her voice.
 *   ds-briefing-screen  the briefing suite's big screen (props.w tiles): props.slides [{ title, text }]
 *                       cycle on it and can all be read; props.flags as a file's
 *   ds-poster           a framed poster on a wall: props.title, props.text, props.art (macro, hands, route,
 *                       eye), props.color, props.flags
 *   ds-egg-cluster      a glossy clutch of eggs on the floor (props.wall: on a wall). props.hatch: when you
 *                       come close they hatch (props.count Nursery Grubs). Shoot it and it bursts.
 *   ds-tenant-tank      a narrow tank with a Tenant floating in it (props.empty: drained)
 *   ds-autopsy-table    a steel table, 2 tiles (props.dir); props.covered: something under a sheet
 *   ds-route-arrow      the staff route painted on the floor: a yellow arrow (props.dir), props.label
 *   ds-scratches        deep marks in the floor, or the inside of the glass (props.turn)
 *   ds-feed-hatch       a feeding hatch in a pen wall: props.text
 *   ds-macro-model      a model on a plinth (2 x 1): HELIOS, the brochure's macroscopic synthid
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);
  const { rot, faceRot, textOf, setBox, spanW, housing } = DS.dress;
  const VAT = '#6fe0a0', TEAL = '#7fd4ff', WARN = '#e0b25a', RED = '#ff3a2a';

  const setFlags = (it, game) => {
    for (const f of [].concat(it.props.flags || [])) if (f && !game.hasFlag(f)) game.setFlag(f);
  };
  /** A terminal's page: its text, and ARIADNE's annotation under it if it has one. */
  function filePage(it, game, text) {
    const kids = [DS.screenText(textOf(text, game))];
    if (it.props.ariadne) kids.push(DS.screenText(it.props.ariadne, true));
    LM.ui.open({ kicker: it.props.kicker || 'Specimen file', title: it.props.title || 'Terminal', body: h('div', null, ...kids), actions: [{ label: 'Close', primary: true }] });
  }

  // ------------------------------------------------------------ what's in a vat
  function vatShape(g, shape, t, k, moving) {
    const sway = moving ? Math.sin(t * 1.7) * 2.2 : Math.sin(t * 0.4) * 0.6;
    g.save();
    g.rotate(moving ? Math.sin(t * 0.9) * 0.25 : 0);
    g.translate(sway, 0);
    g.fillStyle = 'rgba(20,40,28,' + 0.55 * k + ')';
    if (shape === 'sitter') {
      // a great soft mass, folded on itself
      g.beginPath();
      g.ellipse(0, 0, 13, 12, 0, 0, U.TAU);
      g.fill();
      g.beginPath();
      g.ellipse(8, -9, 6, 3, 0.4, 0, U.TAU);
      g.ellipse(8, 9, 6, 3, -0.4, 0, U.TAU);
      g.fill();
    } else if (shape === 'lantern') {
      g.beginPath();
      g.arc(0, -2, 7, 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(20,40,28,' + 0.5 * k + ')';
      g.lineWidth = 0.8;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(i * 2, 4);
        g.quadraticCurveTo(i * 3 + sway, 9, i * 2.4, 14);
        g.stroke();
      }
    } else if (shape === 'limbs') {
      // too many of them, folded like a deckchair
      g.strokeStyle = 'rgba(20,40,28,' + 0.6 * k + ')';
      g.lineWidth = 2;
      g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * U.TAU + 0.3;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        g.lineTo(Math.cos(a + 0.9) * 13, Math.sin(a + 0.9) * 13);
        g.stroke();
      }
      g.lineCap = 'butt';
    } else if (shape === 'midwife') {
      g.beginPath();
      g.ellipse(-4, 0, 9, 4.5, 0, 0, U.TAU);
      g.ellipse(6, 0, 4, 3, 0, 0, U.TAU);
      g.fill();
    } else {
      // curled up, the way a person sleeps
      g.beginPath();
      g.arc(0, 0, 9, 0.5, U.TAU - 0.3);
      g.lineTo(0, 0);
      g.fill();
      g.beginPath();
      g.arc(5, -4, 4, 0, U.TAU);
      g.fill();
    }
    g.restore();
  }

  const items = {
    'ds-vat': {
      name: 'Growth vat', solid: 'rect', radius: 22, dressing: 'Furniture', mapColor: VAT,
      light: (it) => (it.props.state === 'broken' || it.props.state === 'empty'
        ? { color: VAT, radius: 60, intensity: 0.08, flicker: 0.5 }
        : { color: it.props.color || VAT, radius: 150, intensity: 0.42, flicker: 0.04 }),
      init(it) {
        // a 2 x 2 piece, anchored at its top-left tile
        it.x = it.tx * T + T;
        it.y = it.ty * T + T;
        it.box = [50, 50];
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Read the vat’s label',
        use(it, game) {
          setFlags(it, game);
          filePage(it, game, it.props.text);
        },
      },
      draw(g, it, t) {
        const st = it.props.state || 'occupied';
        // the base ring and its pipes
        g.fillStyle = '#1c2220';
        g.beginPath();
        g.arc(0, 0, 25, 0, U.TAU);
        g.fill();
        g.fillStyle = '#4a5852';
        g.beginPath();
        g.arc(0, 0, 23, 0, U.TAU);
        g.fill();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          g.fillStyle = '#2a322e';
          g.beginPath();
          g.arc(Math.cos(a) * 21, Math.sin(a) * 21, 2, 0, U.TAU);
          g.fill();
        }
        if (st === 'broken') {
          // a ring of teeth where the glass was, and the floor wet all round
          g.fillStyle = 'rgba(40,90,60,0.5)';
          g.beginPath();
          g.ellipse(4, 6, 26, 19, 0.4, 0, U.TAU);
          g.fill();
          g.fillStyle = '#0e1412';
          g.beginPath();
          g.arc(0, 0, 18, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(200,235,220,0.6)';
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * U.TAU, r0 = 17.5, s = 2 + ((i * 7) % 4);
            g.beginPath();
            g.moveTo(Math.cos(a - 0.1) * r0, Math.sin(a - 0.1) * r0);
            g.lineTo(Math.cos(a) * (r0 - s), Math.sin(a) * (r0 - s));
            g.lineTo(Math.cos(a + 0.1) * r0, Math.sin(a + 0.1) * r0);
            g.fill();
          }
          return;
        }
        // the fluid, seen down through the lid
        const k = st === 'empty' ? 0 : 1;
        g.fillStyle = k ? '#163a28' : '#121816';
        g.beginPath();
        g.arc(0, 0, 18, 0, U.TAU);
        g.fill();
        if (k) vatShape(g, it.props.shape, t + it.tx, 1, st === 'moving');
        // bubbles
        if (k) {
          g.fillStyle = 'rgba(200,255,220,0.35)';
          for (let i = 0; i < 4; i++) {
            const ph = (t * 0.6 + i * 0.27 + it.ty * 0.1) % 1;
            g.beginPath();
            g.arc(-8 + i * 5, 10 - ph * 20, 0.9 + ph, 0, U.TAU);
            g.fill();
          }
        }
        // the glass lid, and its hoops
        g.strokeStyle = 'rgba(220,255,235,0.35)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(0, 0, 18, 0, U.TAU);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.beginPath();
        g.ellipse(-6, -7, 7, 3.5, -0.6, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#2a322e';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-18, 0);
        g.lineTo(18, 0);
        g.stroke();
      },
      drawGlow(g, it, t) {
        const st = it.props.state || 'occupied';
        if (st === 'broken') return;
        const c = it.props.color || VAT;
        if (st === 'empty') return G.glow(g, 0, 0, 20, c, 0.06);
        const k = 0.42 + 0.08 * Math.sin(t * 1.1 + it.tx) + (st === 'moving' ? 0.1 * Math.sin(t * 4.3) : 0);
        G.glow(g, 0, 0, 30, c, k);
        // a status light on the rim
        DS.led(g, 20, -12, st === 'moving' ? WARN : '#5fe08a', 0.6, 0.8);
      },
    },

    'ds-cell-sign': {
      name: 'Cell placard', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: WARN,
      light: (it) => ({ color: it.props.status === 'BREACH' ? RED : it.props.status === 'CONTAINED' ? WARN : TEAL, radius: 70, intensity: 0.3, flicker: it.props.status === 'BREACH' ? 0.6 : 0 }),
      interact: {
        prompt: (it) => 'Read the placard: ' + (it.props.label || 'cell'),
        use(it, game) {
          setFlags(it, game);
          filePage(it, game, (it.props.label || 'CELL') + ' · ' + (it.props.status || 'CONTAINED') + (it.props.text ? '\n\n' + textOf(it.props.text, game) : ''));
        },
      },
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -7, 3.4, 14, '#20262a');
        g.fillStyle = '#d8dcdf';
        g.fillRect(0.5, -5.5, 1.8, 11);
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        const s = it.props.status || 'CONTAINED';
        const c = s === 'BREACH' ? RED : s === 'CONTAINED' ? WARN : TEAL;
        DS.led(g, 3.2, 0, c, s === 'BREACH' ? (Math.sin(t * 9) > 0 ? 0.95 : 0.2) : 0.6, 1);
      },
    },

    'ds-specimen-file': {
      name: 'Specimen file terminal', solid: 'rect', radius: 9, dressing: 'Furniture', mapColor: TEAL,
      light: { color: TEAL, radius: 80, intensity: 0.3, flicker: 0 },
      init(it) {
        setBox(it, 14, 12, 0, 0);
      },
      interact: {
        prompt: (it) => it.props.prompt || 'Read the file',
        use(it, game) {
          setFlags(it, game);
          LM.audio.play('ui');
          filePage(it, game, it.props.text);
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        // a pedestal with an angled screen on top, facing the way you'd stand to read it
        g.fillStyle = '#1a1e20';
        G.roundRect(g, -7, -6, 14, 12, 2);
        g.fill();
        g.fillStyle = '#3a4246';
        G.roundRect(g, -6, -5, 12, 10, 2);
        g.fill();
        g.fillStyle = '#0b1418';
        g.fillRect(-5, -4, 10, 6);
        g.fillStyle = '#5a646a';
        g.fillRect(-4, 3, 8, 1);
      },
      drawGlow(g, it, t, game) {
        g.rotate(rot(it));
        const read = game && [].concat(it.props.flags || []).every((f) => game.hasFlag(f));
        g.fillStyle = U.rgba(TEAL, 0.45 + 0.1 * Math.sin(t * 2 + it.tx));
        g.fillRect(-5, -4, 10, 6);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = 'rgba(220,245,255,0.5)';
          g.fillRect(-4, -3 + i * 1.8, 3 + ((i * 5 + it.ty) % 5), 0.7);
        }
        if (!read) DS.led(g, 5, 3.5, WARN, 0.5 + 0.4 * (Math.sin(t * 4) > 0 ? 1 : 0), 0.6);
        G.glow(g, 0, -1, 14, TEAL, 0.14);
      },
    },

    'ds-briefing-screen': {
      name: 'Briefing screen', radius: 8, reach: 26, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: TEAL,
      light: { color: '#cfefff', radius: 220, intensity: 0.42, flicker: 0 },
      init(it) {
        const w = it.props.w || 4;
        // along the wall it hangs on
        if (it.face.y !== 0) it.x = it.tx * T + (w * T) / 2;
        else it.y = it.ty * T + (w * T) / 2;
      },
      interact: {
        prompt: () => 'Watch the presentation',
        use(it, game) {
          setFlags(it, game);
          LM.audio.play('ui');
          const slides = it.props.slides || [];
          let i = 0;
          const show = () => {
            const s = slides[i] || { title: '', text: '' };
            LM.ui.open({
              kicker: 'Slide ' + (i + 1) + ' of ' + slides.length, title: s.title || it.props.title || 'Presentation',
              body: h('div', null, h('div', { class: 'ds-slide' }, s.text || '')),
              actions: [
                i > 0 ? { label: 'Back', onClick: () => { i--; show(); return false; } } : null,
                i < slides.length - 1 ? { label: 'Next', primary: true, onClick: () => { i++; show(); return false; } } : { label: 'Close', primary: true },
              ].filter(Boolean),
            });
          };
          show();
        },
      },
      draw(g, it) {
        faceRot(g, it);
        const W = (it.props.w || 4) * T - 10;
        g.fillStyle = '#121416';
        g.fillRect(-0.5, -W / 2 - 1, 4, W + 2);
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        const W = (it.props.w || 4) * T - 10;
        const n = (it.props.slides || []).length || 1;
        const k = Math.floor(t / 6) % n;
        // the slide, as light: a title bar, a picture, three lines
        g.fillStyle = 'rgba(210,240,255,0.75)';
        g.fillRect(2.5, -W / 2, 1.2, W);
        G.glow(g, 14, 0, W * 0.5, '#cfefff', 0.12);
        g.fillStyle = U.rgba(['#7fd4ff', '#8fe0c0', '#e0b25a', '#c8a8ff'][k % 4], 0.5);
        g.fillRect(2.5, -W / 2 + 6, 1.4, W * 0.35);
      },
    },

    'ds-poster': {
      name: 'Poster', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: TEAL,
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => 'Read the poster' + (it.props.title ? ': ' + it.props.title : ''),
        use(it, game) {
          setFlags(it, game);
          LM.ui.showText(it.props.title || 'Poster', textOf(it.props.text, game), it.props.kicker || 'Gestation');
        },
      },
      draw(g, it) {
        faceRot(g, it);
        g.fillStyle = '#c9ced4';
        g.fillRect(-0.5, -11, 2.4, 22);
        g.fillStyle = it.props.color || '#1e3a50';
        g.fillRect(0.2, -10, 1.8, 20);
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.fillRect(0.4, -8, 1.2, 4);
      },
    },

    'ds-egg-cluster': {
      name: 'Eggs', radius: 9, z: -1, dressing: 'Decor', mapColor: '#d8a8b8',
      destructible: {
        hp: 8,
        onBreak(it, game) {
          game.particles.burst(it.x, it.y, 14, { type: 'dot', color: ['#e8d0c8', '#b8d84a', '#d89aa8'], speed: 120, life: 0.5, size: [0.8, 2] });
          game.renderer.addDecal({ type: 'blood', x: it.x, y: it.y, r: 9, color: '#6a6a3a' });
          LM.audio.play('lanternPop', { vol: game.vol(it.x, it.y) * 0.7 });
        },
      },
      update(it, dt, game) {
        if (!it.props.hatch || it.hatched) return;
        const P = game.player;
        if (!P || P.dead || U.dist(P.x, P.y, it.x, it.y) > (it.props.near || 70)) return;
        it.hatched = true;
        const n = it.props.count || 2;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * U.TAU;
          const x = it.x + Math.cos(a) * 8, y = it.y + Math.sin(a) * 8;
          if (!game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) game.spawnEnemy('ds-nursery-grub', x, y, { summoned: true, aggro: true });
        }
        game.toast('The eggs split open.', 'warn');
        it.destroy(game);
      },
      draw(g, it, t) {
        const r = U.mulberry32((it.tx * 977 + it.ty * 131) >>> 0);
        if (it.props.wall) {
          // smeared up the wall behind
          g.translate(0, -10);
        }
        g.fillStyle = 'rgba(120,100,60,0.4)';
        g.beginPath();
        g.ellipse(0, 1, 12, 9, r() * 3, 0, U.TAU);
        g.fill();
        const n = 7 + Math.floor(r() * 5);
        for (let i = 0; i < n; i++) {
          const a = r() * U.TAU, d = r() * 7, s = 2.2 + r() * 1.6;
          const x = Math.cos(a) * d, y = Math.sin(a) * d;
          const throb = it.props.hatch ? Math.sin(t * 3 + i) * 0.2 : 0;
          g.fillStyle = '#e4ccc4';
          g.beginPath();
          g.ellipse(x, y, s + throb, s * 0.85 + throb, a, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(120,60,70,0.4)';
          g.beginPath();
          g.arc(x + 0.4, y + 0.3, s * 0.4, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.55)';
          g.fillRect(x - s * 0.5, y - s * 0.5, 0.8, 0.8);
        }
      },
    },

    'ds-tenant-tank': {
      name: 'Specimen tank', solid: 'rect', radius: 10, dressing: 'Furniture', mapColor: TEAL,
      light: (it) => ({ color: '#b8e8d8', radius: 70, intensity: it.props.empty ? 0.06 : 0.24, flicker: 0 }),
      init(it) {
        it.box = [20, 20];
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Read the tank’s label',
        use(it, game) {
          setFlags(it, game);
          filePage(it, game, it.props.text);
        },
      },
      draw(g, it, t) {
        g.fillStyle = '#20262a';
        g.beginPath();
        g.arc(0, 0, 10.5, 0, U.TAU);
        g.fill();
        g.fillStyle = it.props.empty ? '#141a1c' : '#1e3a34';
        g.beginPath();
        g.arc(0, 0, 8.5, 0, U.TAU);
        g.fill();
        if (!it.props.empty) {
          g.save();
          g.rotate(t * 0.2 + it.tx);
          for (let i = 0; i < 5; i++) {
            g.fillStyle = i % 2 ? 'rgba(216,168,160,0.8)' : 'rgba(232,188,180,0.8)';
            g.beginPath();
            g.ellipse(3 - i * 2, Math.sin(t * 2 + i) * 0.6, 1.4, 2, 0, 0, U.TAU);
            g.fill();
          }
          g.restore();
        }
        g.strokeStyle = 'rgba(220,255,240,0.3)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.arc(0, 0, 8.5, 0, U.TAU);
        g.stroke();
      },
      drawGlow(g, it, t) {
        if (!it.props.empty) G.glow(g, 0, 0, 13, '#b8e8d8', 0.3);
      },
    },

    'ds-autopsy-table': {
      name: 'Steel table', solid: 'rect', radius: 16, dressing: 'Furniture', mapColor: '#9aa4ab',
      init(it) {
        spanW(it, 2);
        setBox(it, 54, 20, 0, 0);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => (it.props.covered ? 'Lift the sheet' : 'Look at the table'),
        use(it, game) {
          setFlags(it, game);
          LM.ui.showText(it.props.title || 'A steel table', textOf(it.props.text, game), it.props.kicker || 'Gestation');
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#5d666e';
        G.roundRect(g, -28, -10, 56, 20, 2);
        g.fill();
        g.fillStyle = '#aab3ba';
        G.roundRect(g, -27, -9, 54, 18, 2);
        g.fill();
        // the drain channel
        g.fillStyle = '#6a737a';
        g.fillRect(-24, -0.6, 48, 1.2);
        g.fillStyle = 'rgba(80,10,10,0.35)';
        g.fillRect(-10, -0.6, 22, 1.2);
        if (it.props.covered) {
          g.fillStyle = '#d8dcdf';
          g.beginPath();
          g.ellipse(-2, 0, 22, 7, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.beginPath();
          g.ellipse(-18, 0, 4, 4.5, 0, 0, U.TAU);
          g.fill();
          // the sheet is lower than it should be, in the middle
          g.fillStyle = 'rgba(0,0,0,0.1)';
          g.beginPath();
          g.ellipse(2, 0, 8, 4, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(120,20,20,0.45)';
          g.beginPath();
          g.ellipse(2, 1, 5, 2.5, 0.2, 0, U.TAU);
          g.fill();
        } else {
          // instruments, laid out
          g.fillStyle = '#e8ecef';
          for (let i = 0; i < 5; i++) g.fillRect(-22 + i * 4, 5, 2.4, 0.8);
        }
      },
    },

    'ds-route-arrow': {
      name: 'Staff route', radius: 8, z: -3, shadow: false, dressing: 'Decor',
      cache: true, cacheRadius: 20,
      draw(g, it) {
        g.rotate({ n: -Math.PI / 2, e: 0, s: Math.PI / 2, w: Math.PI }[it.props.dir || 'e'] || 0);
        g.fillStyle = 'rgba(217,162,28,0.7)';
        g.fillRect(-14, -1.6, 18, 3.2);
        g.beginPath();
        g.moveTo(4, -6);
        g.lineTo(13, 0);
        g.lineTo(4, 6);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = -12; i < 4; i += 3) g.fillRect(i, -1.6, 0.6, 3.2);
      },
    },

    'ds-scratches': {
      name: 'Scratches', radius: 6, z: -3, shadow: false, dressing: 'Decor', cache: true, cacheRadius: 20,
      draw(g, it) {
        g.rotate(it.props.turn || 0);
        const r = U.mulberry32((it.tx * 13 + it.ty * 7) >>> 0);
        for (let s = 0; s < 3; s++) {
          g.strokeStyle = 'rgba(0,0,0,0.45)';
          g.lineWidth = 1.2;
          g.beginPath();
          const y0 = -6 + s * 5 + r() * 2;
          g.moveTo(-12, y0);
          g.quadraticCurveTo(0, y0 + 2 + r() * 2, 12, y0 + 1);
          g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.12)';
          g.lineWidth = 0.5;
          g.stroke();
        }
      },
    },

    'ds-feed-hatch': {
      name: 'Feeding hatch', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: WARN,
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Read the hatch',
        use(it, game) {
          setFlags(it, game);
          LM.ui.showText(it.props.title || 'Feeding hatch', textOf(it.props.text, game), 'Colony pens');
        },
      },
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -9, 4, 18, '#2a2e33');
        DS.hazard(g, 0.5, -9, 3, 3, 1.5);
        g.fillStyle = '#16181b';
        g.fillRect(1, -5, 2.4, 10);
      },
    },

    'ds-macro-model': {
      name: 'Model on a plinth', solid: 'rect', radius: 18, reach: 8, dressing: 'Furniture', mapColor: TEAL,
      light: { color: '#cfefff', radius: 110, intensity: 0.3, flicker: 0 },
      init(it) {
        spanW(it, 2);
        setBox(it, 56, 26, 0, 0);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Read the plinth',
        use(it, game) {
          setFlags(it, game);
          LM.ui.showText(it.props.title || 'HELIOS', textOf(it.props.text, game), it.props.kicker || 'Partner briefing');
        },
      },
      draw(g, it, t) {
        g.rotate(rot(it));
        g.fillStyle = '#20262a';
        G.roundRect(g, -28, -13, 56, 26, 3);
        g.fill();
        g.fillStyle = '#e8ecee';
        G.roundRect(g, -27, -12, 54, 24, 3);
        g.fill();
        // HELIOS: a smooth, friendly shape with a wide translucent sail, like a ray in water
        g.save();
        g.translate(0, Math.sin(t * 0.8) * 0.8);
        g.fillStyle = 'rgba(127,212,255,0.35)';
        g.beginPath();
        g.moveTo(-20, 0);
        g.quadraticCurveTo(-6, -11, 16, -2);
        g.quadraticCurveTo(-6, 11, -20, 0);
        g.fill();
        g.fillStyle = '#9ab8c8';
        g.beginPath();
        g.ellipse(2, 0, 9, 3.4, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#f0f6f8';
        g.beginPath();
        g.ellipse(4, -0.8, 5, 1.4, 0, 0, U.TAU);
        g.fill();
        g.restore();
        // the glass case
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        g.lineWidth = 0.7;
        g.strokeRect(-25, -10, 50, 20);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        G.glow(g, 0, 0, 30, TEAL, 0.14);
      },
    },
  };

  LM.ui.addStyles(`
    .ds-slide { font: 400 15px/1.6 var(--font-ui); color: #1b2a33; background: linear-gradient(180deg, #f4f8fa, #dde8ee); border: 1px solid #9ab8c8;
      padding: 18px 20px; white-space: pre-wrap; margin-bottom: 12px; box-shadow: 0 0 0 4px #121416; }
  `);

  LM.definePack({ id: 'ds-lab', items });
})();
