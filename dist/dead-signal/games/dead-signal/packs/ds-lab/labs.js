/* Dead Signal — packs/ds-lab/labs.js
 * Floor 2's furniture: the synthid labs, the Discovery Center and Shelter B. Floor pieces with a
 * front take props.dir ('s' | 'n' | 'e' | 'w'), wide ones props.w; anything with props.text can be read.
 *
 *   labs           ds-lab-bench (props.kit: 'scope' | 'sink' | 'rack'), ds-fume-hood, ds-sample-fridge,
 *                  ds-biobin, ds-gurney, ds-eyewash (wall), ds-labmate-dock (where LabMates charge)
 *   Discovery      ds-synthid-model (a model synthid hanging over the floor, 3 x 3), ds-kiosk (an exhibit),
 *   Center         ds-mural (wall, props.w), ds-cutout (Syd the Synthid, for school tours), ds-display-case
 *                  (props.broken), ds-theatre-seat, ds-kid-drawing (wall)
 *   desalination   ds-membrane-tank (2 x 2; props.burst), ds-valve (props.flag, props.group, props.done:
 *                  every valve in a group turned sets props.done), ds-pump
 *   microplastics  ds-fungus-chamber (props.broken: it breathes spores; shoot an intact one and it breaks),
 *                  ds-plastic-bale
 *   carbon         ds-frond-bed (synthid "plants", breathing), ds-co2-column
 *   oncology       ds-micro-display (wall: the microscope feed), ds-infusion-chair, ds-dispenser (a dose
 *                  heals: props.heal, props.charges), ds-cold-store (wall, props.w)
 *   shelter        ds-bunk, ds-supply-crate, ds-torn-vent (hanging), ds-strands (props.len, props.angle),
 *                  ds-torch (a dropped torch, still on: props.angle), ds-blanket (props.color, props.angle)
 *   anywhere       ds-frost (a frosted floor)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);
  const { rot, faceRot, say, textOf, setBox, spanW, housing } = DS.dress;
  const screen = (it, game, kicker, title) =>
    LM.ui.open({ kicker: it.props.kicker || kicker, title: it.props.title || title, body: h('div', null, DS.screenText(textOf(it.props.text, game), !!it.props.ariadne)), actions: [{ label: 'Close', primary: true }] });
  const readable = (prompt, kicker, title, asScreen) => ({
    available: (it) => !!it.props.text,
    prompt: (it) => it.props.prompt || prompt,
    use: (it, game) => {
      if (it.props.flag) game.setFlag(it.props.flag);
      if (asScreen) screen(it, game, kicker, title);
      else say(it.props.title || title, textOf(it.props.text, game), it.props.kicker || kicker);
    },
  });
  const TEAL = '#5fd8c8', FROND = '#cfe8c8', SPORE = '#d8e0a8';

  // a bottle of something, seen from above
  const bottle = (g, x, y, c, r) => {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.arc(x + 0.6, y + 0.8, r, 0, U.TAU);
    g.fill();
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, U.TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath();
    g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, U.TAU);
    g.fill();
  };
  const steelTop = (g, x, y, w, hh, c) => {
    g.fillStyle = '#5d666e';
    g.fillRect(x - 0.6, y - 0.6, w + 1.2, hh + 1.2);
    const grd = g.createLinearGradient(x, y, x, y + hh);
    grd.addColorStop(0, U.shade(c || '#e6eaec', 0.04));
    grd.addColorStop(1, U.shade(c || '#e6eaec', -0.08));
    g.fillStyle = grd;
    g.fillRect(x, y, w, hh);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x, y, w, 0.7);
  };

  const items = {
    // ========================================================== the labs
    'ds-lab-bench': {
      name: 'Lab bench', solid: 'rect', radius: 14, dressing: 'Furniture', cache: true,
      cacheRadius: (it) => (it.props.w || 2) * 16 + 10,
      init(it) {
        const w = it.props.w || 2;
        spanW(it, w);
        setBox(it, w * T - 4, 18, 0, -6);
      },
      interact: readable('Look at the bench', 'Lab bench', 'A lab bench'),
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 4, kit = it.props.kit || 'rack';
        steelTop(g, -W / 2, -15, W, 18, '#e2e7ea');
        // a reagent shelf along the back
        g.fillStyle = '#9aa4ab';
        g.fillRect(-W / 2 + 2, -14.4, W - 4, 3.4);
        const r = U.mulberry32((it.tx * 31 + it.ty * 17) >>> 0);
        const cols = it.props.colors || ['#5fb8c8', '#e0b25a', '#c8d8e0', '#8fd0a0', '#d8907a'];
        for (let x = -W / 2 + 4; x < W / 2 - 3; x += 3.6) if (r() < 0.75) bottle(g, x, -12.7, cols[Math.floor(r() * cols.length)], 1.2);
        if (kit === 'sink') {
          g.fillStyle = '#7a868e';
          G.roundRect(g, -6, -9, 12, 9, 2);
          g.fill();
          g.fillStyle = '#4a565e';
          G.roundRect(g, -5, -8, 10, 7, 2);
          g.fill();
          g.fillStyle = '#c9d0d5';
          g.fillRect(-0.6, -10.5, 1.2, 3);
        } else if (kit === 'scope') {
          // a microscope: base, arm, eyepieces
          g.fillStyle = '#2a2e33';
          G.roundRect(g, -5, -9, 10, 8, 2);
          g.fill();
          g.fillStyle = '#e8ecee';
          G.roundRect(g, -3.5, -8, 7, 4, 1.5);
          g.fill();
          g.fillStyle = '#16181b';
          g.beginPath();
          g.arc(-1.6, -3, 1.2, 0, U.TAU);
          g.arc(1.6, -3, 1.2, 0, U.TAU);
          g.fill();
        }
        // racks of tubes and a pipette or two
        for (let i = 0; i < Math.round(W / 22); i++) {
          const x = -W / 2 + 8 + i * 20 + (kit !== 'rack' && Math.abs(-W / 2 + 8 + i * 20) < 10 ? 14 : 0);
          if (x > W / 2 - 8) continue;
          g.fillStyle = '#c9d0d5';
          g.fillRect(x - 5, -7, 10, 4);
          for (let k = 0; k < 4; k++) {
            g.fillStyle = cols[(i + k) % cols.length];
            g.beginPath();
            g.arc(x - 3.6 + k * 2.4, -5, 0.9, 0, U.TAU);
            g.fill();
          }
        }
        g.strokeStyle = '#5a646c';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(W / 2 - 10, -2);
        g.lineTo(W / 2 - 4, -5);
        g.stroke();
      },
    },

    'ds-fume-hood': {
      name: 'Fume hood', solid: 'rect', radius: 14, dressing: 'Furniture',
      light: { color: '#cfe8ff', radius: 80, intensity: 0.3, flicker: 0 },
      init(it) {
        const w = it.props.w || 2;
        spanW(it, w);
        setBox(it, w * T - 4, 20, 0, -5);
      },
      interact: readable('Look in the fume hood', 'Fume hood', 'Fume hood'),
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 4;
        g.fillStyle = '#7d878f';
        g.fillRect(-W / 2, -15, W, 20);
        g.fillStyle = '#d7dde1';
        g.fillRect(-W / 2 + 1, -14, W - 2, 18);
        g.fillStyle = '#3d474f';
        g.fillRect(-W / 2 + 3, -12, W - 6, 11);
        // the sash: glass with a grab bar
        g.fillStyle = 'rgba(170,205,225,0.35)';
        g.fillRect(-W / 2 + 3, -2, W - 6, 4.4);
        g.fillStyle = '#9aa4ab';
        g.fillRect(-W / 2 + 3, 1.6, W - 6, 1.1);
        const r = U.mulberry32((it.tx * 13 + it.ty * 41) >>> 0);
        for (let i = 0; i < 4; i++) bottle(g, -W / 2 + 8 + r() * (W - 16), -10 + r() * 7, r() < 0.5 ? '#8fd0a0' : '#d8e0e4', 1.3);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 4;
        g.fillStyle = 'rgba(200,230,255,0.22)';
        g.fillRect(-W / 2 + 3, -12, W - 6, 1);
        G.glow(g, 0, -7, W * 0.5, '#cfe8ff', 0.12);
      },
    },

    'ds-sample-fridge': {
      name: 'Sample fridge', solid: 'rect', radius: 12, dressing: 'Furniture',
      light: { color: '#9fd8ff', radius: 60, intensity: 0.28, flicker: 0 },
      init(it) {
        setBox(it, 26, 16, 0, -7);
      },
      interact: readable('Look in the fridge', 'Sample fridge', 'Sample fridge'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#7d878f';
        g.fillRect(-13, -15, 26, 16);
        g.fillStyle = '#e7ebee';
        g.fillRect(-12, -14, 24, 14);
        g.fillStyle = 'rgba(120,180,215,0.45)';
        g.fillRect(-10, -12.5, 20, 11);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        for (let y = -11.5; y < -2; y += 3) g.fillRect(-9.5, y, 19, 0.5);
        const r = U.mulberry32((it.tx * 7 + it.ty * 3) >>> 0);
        for (let i = 0; i < 9; i++) {
          g.fillStyle = r() < 0.5 ? '#e0b25a' : r() < 0.5 ? '#d8907a' : '#8fd0a0';
          g.fillRect(-9 + r() * 17, -11 + Math.floor(r() * 3) * 3, 1.4, 1.6);
        }
        g.fillStyle = '#5a646c';
        g.fillRect(9.5, -10, 1, 6);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        G.glow(g, 0, -7, 16, '#9fd8ff', 0.16);
      },
    },

    'ds-biobin': {
      name: 'Biohazard bin', solid: true, radius: 7, dressing: 'Furniture', cache: true,
      draw(g) {
        g.fillStyle = '#7a1e1a';
        G.roundRect(g, -7, -7, 14, 14, 3);
        g.fill();
        g.fillStyle = '#c8302a';
        G.roundRect(g, -6, -6, 12, 12, 2.5);
        g.fill();
        // the trefoil, simply
        g.strokeStyle = '#1a1a18';
        g.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * U.TAU - Math.PI / 2;
          g.beginPath();
          g.arc(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 1.8, 0, U.TAU);
          g.stroke();
        }
        g.fillStyle = '#1a1a18';
        g.beginPath();
        g.arc(0, 0, 0.9, 0, U.TAU);
        g.fill();
      },
    },

    'ds-gurney': {
      name: 'Gurney', solid: 'rect', radius: 13, dressing: 'Furniture', cache: true, cacheRadius: 26,
      init(it) {
        setBox(it, 16, 30, 0, 0);
      },
      interact: readable('Look at the gurney', 'Gurney', 'A gurney'),
      draw(g, it) {
        g.rotate(rot(it) + (it.props.askew ? 0.35 : 0));
        g.fillStyle = '#5a646c';
        for (const [x, y] of [[-7, -14], [7, -14], [-7, 14], [7, 14]]) {
          g.beginPath();
          g.arc(x, y, 1.6, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = '#9aa4ab';
        g.fillRect(-8, -15, 16, 30);
        g.fillStyle = '#e8eef0';
        G.roundRect(g, -7, -14, 14, 28, 2);
        g.fill();
        g.fillStyle = '#cfe0ea';
        G.roundRect(g, -6, -13, 12, 5, 2);
        g.fill();
        if (it.props.sheet) {
          g.fillStyle = 'rgba(160,30,30,0.45)';
          g.beginPath();
          g.ellipse(1, 4, 4, 2.5, 0.4, 0, U.TAU);
          g.fill();
        }
      },
    },

    'ds-eyewash': {
      name: 'Eyewash station', radius: 5, wallMounted: true, shadow: false, dressing: 'Walls',
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -6, 3, 12, '#2a8a4a');
        g.fillStyle = '#e0c040';
        g.beginPath();
        g.arc(5, 0, 3.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#7a6a20';
        g.beginPath();
        g.arc(5, -1.4, 0.9, 0, U.TAU);
        g.arc(5, 1.4, 0.9, 0, U.TAU);
        g.fill();
      },
    },

    'ds-labmate-dock': {
      name: 'Charging dock', solid: false, radius: 12, z: -2, dressing: 'Furniture',
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#2a2e33';
        G.roundRect(g, -13, -15, 26, 8, 2);
        g.fill();
        g.fillStyle = '#5a646c';
        g.fillRect(-11, -14, 22, 6);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(0, 2, 12, 10, 0, 0, U.TAU);
        g.fill();
        DS.hazard(g, -13, -7, 26, 1.6, 2);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        DS.led(g, -8, -11, '#5fe08a', 0.4 + 0.3 * Math.sin(t * 2 + it.tx), 0.8);
        DS.led(g, 8, -11, '#5fe08a', 0.4 + 0.3 * Math.sin(t * 2 + it.tx + 1), 0.8);
      },
    },

    // ========================================================== the Discovery Center
    'ds-synthid-model': {
      name: 'Synthid model', radius: 56, z: 6, shadow: false, dressing: 'Decor',
      light: { color: '#8fe8f0', radius: 220, intensity: 0.32, flicker: 0 },
      init(it) {
        it.x = it.tx * T + T * 1.5;
        it.y = it.ty * T + T * 1.5;
      },
      drawShadow() {},
      draw(g, it, t) {
        g.scale(1.45, 1.45);
        // it hangs from the ceiling: its shadow on the floor, then the model itself a little above
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.beginPath();
        g.ellipse(6, 10, 34, 18, 0.3, 0, U.TAU);
        g.fill();
        g.rotate(0.3 + Math.sin(t * 0.15) * 0.2);
        // cilia, waving
        g.strokeStyle = 'rgba(190,240,240,0.7)';
        g.lineWidth = 1;
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * U.TAU;
          const ex = Math.cos(a) * 32, ey = Math.sin(a) * 15;
          const w = Math.sin(t * 3 + i * 0.7) * 3;
          g.beginPath();
          g.moveTo(ex, ey);
          g.quadraticCurveTo(ex * 1.14 + w, ey * 1.25, ex * 1.24, ey * 1.45 + w * 0.5);
          g.stroke();
        }
        // the body: a translucent capsule
        const grd = g.createRadialGradient(-6, -4, 2, 0, 0, 34);
        grd.addColorStop(0, 'rgba(220,255,250,0.95)');
        grd.addColorStop(0.6, 'rgba(120,210,215,0.85)');
        grd.addColorStop(1, 'rgba(60,140,150,0.9)');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(0, 0, 32, 15, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        g.lineWidth = 1.2;
        g.stroke();
        // its insides: a lattice core and little machines
        g.fillStyle = 'rgba(40,90,110,0.6)';
        g.beginPath();
        g.ellipse(-4, 0, 11, 7, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = 'rgba(200,250,255,0.55)';
        g.lineWidth = 0.6;
        for (let i = -12; i <= 6; i += 3) {
          g.beginPath();
          g.moveTo(i, -6);
          g.lineTo(i + 3, 6);
          g.stroke();
        }
        for (const [x, y, r] of [[14, -5, 3], [18, 4, 2.4], [9, 7, 2], [-20, -4, 2.6], [-17, 6, 2]]) {
          g.fillStyle = 'rgba(240,200,120,0.85)';
          g.beginPath();
          g.arc(x, y, r, 0, U.TAU);
          g.fill();
        }
        // the hanging wires
        g.strokeStyle = 'rgba(200,210,220,0.35)';
        g.lineWidth = 0.5;
        g.beginPath();
        g.moveTo(-20, -6);
        g.lineTo(-24, -40);
        g.moveTo(20, -6);
        g.lineTo(24, -40);
        g.stroke();
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 66, '#8fe8f0', 0.16 + 0.04 * Math.sin(t * 1.3));
      },
    },

    'ds-kiosk': {
      name: 'Exhibit kiosk', solid: 'rect', radius: 10, dressing: 'Furniture', mapColor: '#6fb8c8',
      light: { color: '#8fd8e8', radius: 70, intensity: 0.3, flicker: 0 },
      init(it) {
        setBox(it, 20, 12, 0, -2);
      },
      interact: readable('Read the exhibit', 'Synthid Discovery Center', 'Exhibit', true),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#2a2e33';
        G.roundRect(g, -10, -8, 20, 12, 2);
        g.fill();
        g.fillStyle = '#e6eaec';
        G.roundRect(g, -9, -7, 18, 10, 2);
        g.fill();
        g.fillStyle = '#16303a';
        g.fillRect(-7.5, -6, 15, 7);
        g.fillStyle = it.props.color || TEAL;
        g.fillRect(-9, 2, 18, 1.4);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        const c = it.props.color || TEAL;
        g.fillStyle = U.rgba(c, 0.5);
        const r = U.mulberry32((it.tx * 5 + Math.floor(t * 1.5)) >>> 0);
        for (let i = 0; i < 4; i++) g.fillRect(-6.5, -5 + i * 1.6, 4 + r() * 9, 0.8);
        G.glow(g, 0, -3, 14, c, 0.22);
      },
    },

    'ds-mural': {
      name: 'Mural', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls',
      interact: readable('Read the timeline', 'Synthid Discovery Center', 'The story of synthids'),
      draw(g, it) {
        faceRot(g, it);
        const W = (it.props.w || 3) * T - 4;
        housing(g, -0.5, -W / 2, 2.8, W, '#e6eaec');
        const cols = ['#6fb8c8', '#8fd0a0', '#e0b25a', '#d8907a', '#a8a0e0'];
        for (let i = 0; i < W - 6; i += 5) {
          g.fillStyle = cols[Math.floor(i / 12) % cols.length];
          g.fillRect(0.5, -W / 2 + 3 + i, 1.6, 3.4);
        }
      },
    },

    'ds-cutout': {
      name: 'Syd the Synthid', solid: 'rect', radius: 9, dressing: 'Decor', cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 18, 6, 0, 0);
      },
      interact: readable('Read the speech bubble', 'School tours', 'Syd the Synthid'),
      draw(g, it) {
        g.rotate(rot(it) + (it.props.fallen ? 1.2 : 0));
        // a cardboard cutout seen from above: its stand, and the round smiling cartoon lying flat
        if (it.props.fallen) {
          g.fillStyle = '#7fd0c8';
          g.beginPath();
          g.ellipse(0, 2, 12, 9, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(-3.5, 0, 2.6, 0, U.TAU);
          g.arc(3.5, 0, 2.6, 0, U.TAU);
          g.fill();
          g.fillStyle = '#1a2a30';
          g.beginPath();
          g.arc(-3, 0.5, 1.3, 0, U.TAU);
          g.arc(4, 0.5, 1.3, 0, U.TAU);
          g.fill();
          g.strokeStyle = '#1a2a30';
          g.lineWidth = 0.8;
          g.beginPath();
          g.arc(0, 3, 3.5, 0.3, Math.PI - 0.3);
          g.stroke();
          return;
        }
        g.fillStyle = '#a8865a';
        g.fillRect(-9, -2, 18, 4);
        g.fillStyle = '#7fd0c8';
        g.fillRect(-8, -1.4, 16, 2.8);
        g.fillStyle = '#ffffff';
        g.fillRect(-3, -1.4, 6, 1);
      },
    },

    'ds-display-case': {
      name: 'Display case', solid: 'rect', radius: 14, dressing: 'Furniture', mapColor: '#9fc8d8',
      light: (it) => (it.props.broken ? null : { color: '#cfe8ff', radius: 70, intensity: 0.28, flicker: 0 }),
      init(it) {
        const w = it.props.w || 2;
        spanW(it, w);
        setBox(it, w * T - 8, 20, 0, 0);
      },
      interact: readable('Read the plaque', 'Display case', 'Display case'),
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 8;
        g.fillStyle = '#2a2e33';
        g.fillRect(-W / 2, -10, W, 20);
        g.fillStyle = '#4a545c';
        g.fillRect(-W / 2 + 1, -9, W - 2, 18);
        if (!it.props.broken) {
          const show = it.props.show;
          if (show === 'membrane') {
            for (let i = 0; i < 5; i++) {
              g.fillStyle = 'rgba(150,230,240,' + (0.4 + i * 0.1) + ')';
              g.fillRect(-8 + i * 3.4, -6, 1.6, 12);
            }
          } else if (show === 'fungus') {
            g.fillStyle = 'rgba(90,150,200,0.8)';
            g.fillRect(-7, -3, 12, 5);
            g.fillStyle = 'rgba(225,230,200,0.85)';
            for (const [x, y, r] of [[-5, -2, 2.4], [-1, 1, 2], [3, -1, 2.6], [5, 2, 1.6]]) {
              g.beginPath();
              g.arc(x, y, r, 0, U.TAU);
              g.fill();
            }
          } else if (show === 'frond') {
            for (let k = 0; k < 7; k++) {
              const a = (k / 7) * U.TAU;
              g.fillStyle = k % 2 ? FROND : '#a8d0b0';
              g.beginPath();
              g.ellipse(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 4, 1.4, a, 0, U.TAU);
              g.fill();
            }
          } else if (show === 'vial') {
            for (let i = -1; i <= 1; i++) {
              g.fillStyle = '#e8ecee';
              G.roundRect(g, i * 6 - 1.8, -6, 3.6, 12, 1.5);
              g.fill();
              g.fillStyle = 'rgba(95,216,200,0.9)';
              g.fillRect(i * 6 - 1.2, -1, 2.4, 6);
            }
          }
          g.fillStyle = 'rgba(170,210,230,0.32)';
          g.fillRect(-W / 2 + 2, -8, W - 4, 16);
          g.strokeStyle = 'rgba(255,255,255,0.5)';
          g.lineWidth = 0.6;
          g.strokeRect(-W / 2 + 2, -8, W - 4, 16);
          return;
        }
        // broken outward: the frame empty, glass everywhere on the floor in front
        g.fillStyle = '#1c2024';
        g.fillRect(-W / 2 + 2, -8, W - 4, 16);
        // what used to stand in it left this: two scuffed hoof-shaped marks
        g.fillStyle = 'rgba(200,200,190,0.18)';
        g.beginPath();
        g.ellipse(-5, 0, 3, 4, 0, 0, U.TAU);
        g.ellipse(5, 0, 3, 4, 0, 0, U.TAU);
        g.fill();
        const r = U.mulberry32((it.tx * 11 + it.ty * 23) >>> 0);
        g.fillStyle = 'rgba(200,230,245,0.55)';
        for (let i = 0; i < 26; i++) {
          const x = -W / 2 + r() * W, y = 10 + r() * 16, s = 1 + r() * 2.4, a = r() * 6;
          g.save();
          g.translate(x, y);
          g.rotate(a);
          g.beginPath();
          g.moveTo(-s, 0);
          g.lineTo(0, -s * 0.6);
          g.lineTo(s * 0.8, s * 0.4);
          g.closePath();
          g.fill();
          g.restore();
        }
      },
    },

    'ds-theatre-seat': {
      name: 'Seats', solid: 'rect', radius: 12, dressing: 'Furniture', cache: true,
      cacheRadius: (it) => (it.props.w || 3) * 16 + 8,
      init(it) {
        const w = it.props.w || 3;
        spanW(it, w);
        setBox(it, w * T - 2, 14, 0, 2);
      },
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 3) * T - 2, n = (it.props.w || 3) * 2;
        for (let i = 0; i < n; i++) {
          const x = -W / 2 + (i + 0.5) * (W / n);
          g.fillStyle = '#26303a';
          G.roundRect(g, x - 6, -5, 12, 14, 2);
          g.fill();
          g.fillStyle = it.props.color || '#2f6a78';
          G.roundRect(g, x - 5, -4, 10, 9, 2);
          g.fill();
          g.fillStyle = U.shade(it.props.color || '#2f6a78', -0.25);
          g.fillRect(x - 5, 5, 10, 3);
        }
      },
    },

    'ds-kid-drawing': {
      name: 'A drawing', radius: 5, wallMounted: true, shadow: false, dressing: 'Walls',
      interact: readable('Look at the drawing', 'Little Labs', 'A drawing'),
      draw(g, it) {
        faceRot(g, it);
        g.rotate(U.hash2(it.tx, it.ty, 2) * 0.3 - 0.15);
        g.fillStyle = '#f4f0e6';
        g.fillRect(-0.5, -6, 2.4, 12);
        const cols = ['#e0524f', '#5fb8c8', '#e0b25a', '#8fd0a0'];
        g.fillStyle = cols[Math.floor(U.hash2(it.tx, it.ty, 9) * 4)];
        g.fillRect(0.2, -3, 1, 4);
      },
    },

    // ========================================================== desalination
    'ds-membrane-tank': {
      name: 'Membrane tank', solid: 'rect', radius: 28, dressing: 'Furniture', mapColor: '#5fb8c8',
      light: { color: '#7fe0e0', radius: 130, intensity: 0.34, flicker: 0 },
      init(it) {
        it.x = it.tx * T + T;
        it.y = it.ty * T + T;
        it.box = [58, 56];
        it.boxOff = [0, 0];
      },
      interact: readable('Read the tank’s panel', 'Membrane lab', 'Desalination tank', true),
      draw(g, it, t) {
        g.fillStyle = '#5d666e';
        G.roundRect(g, -29, -28, 58, 56, 4);
        g.fill();
        g.fillStyle = '#c9d0d5';
        G.roundRect(g, -27, -26, 54, 52, 3);
        g.fill();
        // seawater in, through the membranes, fresh water out
        g.fillStyle = it.props.burst ? 'rgba(60,90,86,0.45)' : 'rgba(40,110,120,0.85)';
        g.fillRect(-25, -24, 20, 48);
        g.fillStyle = 'rgba(150,215,235,0.75)';
        g.fillRect(7, -24, 18, 48);
        for (let i = 0; i < 5; i++) {
          const x = -4 + i * 2.4;
          g.fillStyle = 'rgba(200,250,245,' + (0.35 + 0.1 * i) + ')';
          g.fillRect(x, -24, 1.4, 48);
        }
        g.fillStyle = '#7d878f';
        g.fillRect(-27, -3, 3, 6);
        g.fillRect(24, -3, 3, 6);
        if (it.props.burst) {
          g.strokeStyle = 'rgba(30,40,40,0.8)';
          g.lineWidth = 0.9;
          g.beginPath();
          g.moveTo(-27, 6);
          g.lineTo(-18, 2);
          g.lineTo(-12, 9);
          g.lineTo(-6, 4);
          g.moveTo(-18, 2);
          g.lineTo(-20, -8);
          g.stroke();
        }
      },
      drawGlow(g, it, t) {
        for (let i = 0; i < 5; i++) {
          const x = -4 + i * 2.4, k = 0.5 + 0.5 * Math.sin(t * 2 + i);
          g.fillStyle = 'rgba(150,250,240,' + 0.12 * k + ')';
          g.fillRect(x, -24, 1.4, 48);
        }
        G.glow(g, 0, 0, 34, '#7fe0e0', 0.14);
      },
    },

    'ds-valve': {
      name: 'Valve', solid: true, radius: 7, reach: 12, dressing: 'Furniture', mapColor: '#e0524f',
      init(it) {
        it.turned = it.turned || false;
        it.spin = it.turned ? 1 : 0;
      },
      interact: {
        available: (it) => !it.turned,
        prompt: (it) => it.props.prompt || 'Turn the valve',
        use(it, game) {
          it.turned = true;
          LM.audio.play('switch');
          LM.audio.play('door', { vol: 0.5 });
          if (it.props.flag) game.setFlag(it.props.flag);
          const grp = it.props.group;
          const left = grp ? game.items.filter((o) => !o.dead && o.def.id === 'ds-valve' && o.props.group === grp && !o.turned).length : 0;
          if (grp && left === 0 && it.props.done) {
            game.setFlag(it.props.done);
          } else if (grp && it.props.waiting) game.toast(LM.manifest.fill(it.props.waiting, { n: left }), 'key');
          if (it.props.text) game.toast(it.props.text, 'good');
        },
      },
      update(it, dt) {
        if (it.turned && it.spin < 1) it.spin = Math.min(1, it.spin + dt * 0.8);
      },
      draw(g, it) {
        // a pipe stub, and the wheel on top of it
        g.fillStyle = '#5d666e';
        g.fillRect(-3, -9, 6, 18);
        g.save();
        g.rotate((it.spin || 0) * Math.PI * 3);
        g.strokeStyle = it.props.color || '#c8302a';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, 6, 0, U.TAU);
        g.stroke();
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-6, 0);
        g.lineTo(6, 0);
        g.moveTo(0, -6);
        g.lineTo(0, 6);
        g.stroke();
        g.restore();
        g.fillStyle = '#2a2e33';
        g.beginPath();
        g.arc(0, 0, 1.6, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (it.turned) return;
        G.glow(g, 0, 0, 12, '#ff6a5a', 0.18 + 0.1 * Math.sin(t * 3));
      },
    },

    'ds-pump': {
      name: 'Pump', solid: 'rect', radius: 14, dressing: 'Furniture',
      init(it) {
        setBox(it, 28, 18, 0, -5);
      },
      interact: readable('Read the pump’s gauge', 'Membrane lab', 'Brine pump', true),
      draw(g, it, t, game) {
        g.rotate(rot(it));
        g.fillStyle = '#3a4046';
        G.roundRect(g, -14, -14, 28, 18, 3);
        g.fill();
        g.fillStyle = '#4f7a8a';
        G.roundRect(g, -12, -12, 18, 14, 3);
        g.fill();
        g.fillStyle = '#7d878f';
        g.fillRect(6, -10, 7, 10);
        // the gauge
        g.fillStyle = '#e8ecee';
        g.beginPath();
        g.arc(-3, -5, 4, 0, U.TAU);
        g.fill();
        const on = game && it.props.flag && game.hasFlag(it.props.flag);
        const a = on ? -0.6 + Math.sin(t * 9) * 0.08 : 2.4;
        g.strokeStyle = '#c8302a';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(-3, -5);
        g.lineTo(-3 + Math.cos(a) * 3.2, -5 + Math.sin(a) * 3.2);
        g.stroke();
      },
      drawGlow(g, it, t, game) {
        g.rotate(rot(it));
        const on = game && it.props.flag && game.hasFlag(it.props.flag);
        DS.led(g, 9, -8, on ? '#5fe08a' : '#ff4a3a', 0.6, 0.8);
      },
    },

    // ========================================================== microplastics
    'ds-fungus-chamber': {
      name: 'Growth chamber', solid: 'rect', radius: 16, dressing: 'Furniture', mapColor: '#b8c890',
      light: (it) => ({ color: '#d8f0b8', radius: 70, intensity: it.props.broken ? 0.12 : 0.26, flicker: it.props.broken ? 0.3 : 0 }),
      destructible: {
        hp: 16,
        onBreak(it, game) {
          // the glass goes, the chamber stays: it breathes spores from now on
          it.dead = false;
          it.hp = 1e9;
          it.props = Object.assign({}, it.props, { broken: true });
          if (it.light) it.light.off = false;
          game.particles.burst(it.x, it.y, 18, { type: 'dot', color: 'rgba(200,230,245,0.8)', speed: 160, life: 0.5, size: [0.8, 1.6] });
          game.particles.burst(it.x, it.y, 10, { type: 'smoke', color: SPORE, speed: 50, life: 1.6, size: 6, alpha: 0.3 });
          LM.audio.play('break', { vol: game.vol(it.x, it.y) });
          game.toast('The chamber’s glass breaks. Something pale drifts out of it.', 'warn');
        },
      },
      init(it) {
        const w = it.props.w || 2;
        spanW(it, w);
        setBox(it, w * T - 6, 24, 0, 0);
      },
      interact: readable('Read the chamber’s label', 'Mycology lab', 'Growth chamber'),
      update(it, dt, game) {
        if (!it.props.broken) return;
        const P = game.player;
        // spores: a cloud round the chamber
        if (Math.random() < dt * 14) {
          const a = Math.random() * U.TAU, d = Math.random() * 52;
          game.particles.add({ type: 'smoke', x: it.x + Math.cos(a) * d, y: it.y + Math.sin(a) * d, vx: U.rand(-6, 6), vy: U.rand(-10, 2), life: U.rand(1.8, 3), size: U.rand(5, 10), color: SPORE, alpha: 0.22, drag: 0.4 });
        }
        if (P && !P.dead && LM.status && U.dist(P.x, P.y, it.x, it.y) < (it.props.radius || 62)) LM.status.apply(game, P, 'spores');
      },
      draw(g, it, t) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 6;
        g.fillStyle = '#5d666e';
        g.fillRect(-W / 2, -12, W, 24);
        g.fillStyle = '#2a3026';
        g.fillRect(-W / 2 + 2, -10, W - 4, 20);
        // the plastic waste inside: bottles, lids, film
        const r = U.mulberry32((it.tx * 61 + it.ty * 7) >>> 0);
        for (let i = 0; i < W / 4; i++) {
          g.fillStyle = r() < 0.5 ? 'rgba(90,150,200,0.7)' : r() < 0.5 ? 'rgba(220,230,235,0.6)' : 'rgba(200,90,70,0.6)';
          g.save();
          g.translate(-W / 2 + 4 + r() * (W - 8), -8 + r() * 16);
          g.rotate(r() * 6);
          g.fillRect(-3, -1.2, 6, 2.4);
          g.restore();
        }
        // and the fungus eating it: pale mats and threads
        for (let i = 0; i < W / 3; i++) {
          const x = -W / 2 + 4 + r() * (W - 8), y = -8 + r() * 16, s = 1.5 + r() * 3.5;
          g.fillStyle = 'rgba(225,230,200,' + (0.45 + r() * 0.35) + ')';
          g.beginPath();
          g.arc(x, y, s, 0, U.TAU);
          g.fill();
        }
        g.strokeStyle = 'rgba(230,235,210,0.4)';
        g.lineWidth = 0.4;
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          g.moveTo(-W / 2 + 4 + r() * (W - 8), -8 + r() * 16);
          g.lineTo(-W / 2 + 4 + r() * (W - 8), -8 + r() * 16);
        }
        g.stroke();
        if (!it.props.broken) {
          g.fillStyle = 'rgba(190,220,235,0.18)';
          g.fillRect(-W / 2 + 2, -10, W - 4, 20);
          g.strokeStyle = 'rgba(255,255,255,0.4)';
          g.lineWidth = 0.6;
          g.strokeRect(-W / 2 + 2, -10, W - 4, 20);
        } else {
          // jagged glass round the frame, and the mat spilling out over the edge
          g.fillStyle = 'rgba(200,230,245,0.5)';
          for (let i = 0; i < 8; i++) {
            const x = -W / 2 + r() * W;
            g.beginPath();
            g.moveTo(x, -10);
            g.lineTo(x + 2, -6 - r() * 3);
            g.lineTo(x + 4, -10);
            g.fill();
          }
          g.fillStyle = 'rgba(225,230,200,0.6)';
          g.beginPath();
          g.ellipse(W / 4, 12, 9, 3.5, 0, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 6;
        G.glow(g, 0, 0, W * 0.55, it.props.broken ? SPORE : '#d8f0b8', it.props.broken ? 0.1 + 0.06 * Math.sin(t * 2) : 0.1);
      },
    },

    'ds-plastic-bale': {
      name: 'Plastic bale', solid: 'rect', radius: 12, dressing: 'Furniture', cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 24, 22, 0, 0);
      },
      draw(g, it) {
        g.rotate(rot(it) + (U.hash2(it.tx, it.ty, 3) - 0.5) * 0.3);
        g.fillStyle = '#2a3a4a';
        g.fillRect(-12, -11, 24, 22);
        const r = U.mulberry32((it.tx * 3 + it.ty * 29) >>> 0);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = ['#4a8ac0', '#7ab0d8', '#d8e0e8', '#c85a4a', '#5aa070'][Math.floor(r() * 5)];
          g.fillRect(-11 + r() * 21, -10 + r() * 19, 2 + r() * 3, 1.2 + r() * 1.5);
        }
        g.strokeStyle = '#1a1a18';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(-12, -4);
        g.lineTo(12, -4);
        g.moveTo(-12, 4);
        g.lineTo(12, 4);
        g.stroke();
        // fungus has started on the top
        g.fillStyle = 'rgba(225,230,200,0.5)';
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          g.arc(-8 + r() * 16, -8 + r() * 16, 1.5 + r() * 2.5, 0, U.TAU);
          g.fill();
        }
      },
    },

    // ========================================================== carbon capture
    'ds-frond-bed': {
      name: 'Frond bed', solid: 'rect', radius: 16, dressing: 'Furniture', mapColor: '#8fd0a0',
      light: { color: '#cfe8c8', radius: 90, intensity: 0.2, flicker: 0 },
      init(it) {
        const w = it.props.w || 2;
        spanW(it, w);
        setBox(it, w * T - 6, 24, 0, 0);
      },
      interact: readable('Read the bed’s card', 'Air garden', 'Frond bed'),
      draw(g, it, t) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 6;
        g.fillStyle = '#3a4046';
        G.roundRect(g, -W / 2, -12, W, 24, 3);
        g.fill();
        g.fillStyle = '#1e2a22';
        g.fillRect(-W / 2 + 2, -10, W - 4, 20);
        // pale synthid fronds that open and close, slowly, as if breathing
        const r = U.mulberry32((it.tx * 17 + it.ty * 5) >>> 0);
        const n = Math.round(W / 9);
        for (let i = 0; i < n; i++) {
          const x = -W / 2 + 6 + (i + 0.5) * ((W - 12) / n) + (r() - 0.5) * 3, y = (r() - 0.5) * 10;
          const breath = 0.75 + 0.25 * Math.sin(t * 0.9 + i * 0.6);
          const blades = 6 + Math.floor(r() * 3);
          for (let k = 0; k < blades; k++) {
            const a = (k / blades) * U.TAU + r() * 0.4, l = (5 + r() * 3) * breath;
            g.fillStyle = k % 2 ? FROND : '#a8d0b0';
            g.beginPath();
            g.moveTo(x, y);
            g.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.6, y + Math.sin(a + 0.3) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
            g.quadraticCurveTo(x + Math.cos(a - 0.3) * l * 0.6, y + Math.sin(a - 0.3) * l * 0.6, x, y);
            g.fill();
          }
          g.fillStyle = '#e8f4e0';
          g.beginPath();
          g.arc(x, y, 1, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 6;
        G.glow(g, 0, 0, W * 0.6, '#cfe8c8', 0.08 + 0.04 * Math.sin(t * 0.9));
      },
    },

    'ds-co2-column': {
      name: 'CO₂ column', solid: true, radius: 10, dressing: 'Furniture',
      light: { color: '#a8e8c0', radius: 70, intensity: 0.24, flicker: 0 },
      interact: readable('Read the column’s display', 'Air garden', 'CO₂ scrubber column', true),
      draw(g, it, t) {
        g.fillStyle = '#5d666e';
        g.beginPath();
        g.arc(0, 0, 10, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(150,220,190,0.45)';
        g.beginPath();
        g.arc(0, 0, 8.4, 0, U.TAU);
        g.fill();
        for (let i = 0; i < 7; i++) {
          const ph = (t * 0.6 + i * 0.37) % 1;
          const a = i * 2.1 + t * 0.2;
          g.fillStyle = 'rgba(240,255,250,' + (0.6 * (1 - ph)) + ')';
          g.beginPath();
          g.arc(Math.cos(a) * ph * 7, Math.sin(a) * ph * 7, 0.8 + ph * 1.2, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 16, '#a8e8c0', 0.18);
      },
    },

    // ========================================================== oncology
    'ds-micro-display': {
      name: 'Microscope feed', radius: 8, wallMounted: true, shadow: false, dressing: 'Walls',
      light: { color: '#ff9a8a', radius: 110, intensity: 0.3, flicker: 0 },
      interact: readable('Watch the feed', 'Oncology lab', 'Microscope feed · live', true),
      draw(g, it) {
        faceRot(g, it);
        const W = (it.props.w || 2) * T - 6;
        housing(g, -0.5, -W / 2, 4, W, '#1a1c20');
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        const W = (it.props.w || 2) * T - 6;
        // edge-on, the screen is a strip; draw what it shows just in front of it, faintly, on the floor
        g.fillStyle = 'rgba(255,170,150,0.35)';
        g.fillRect(3.4, -W / 2 + 1, 1.2, W - 2);
        const cy = 0;
        for (let c = 0; c < 3; c++) {
          const y = cy + (c - 1) * W * 0.28, k = ((t * 0.18 + c * 0.33) % 1);
          // a red cell, and teal synthids closing in on it until it's gone
          G.glow(g, 14, y, 7 * (1 - k * 0.8), '#ff6a5a', 0.35 * (1 - k));
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * U.TAU + c;
            const d = 12 * (1 - k);
            G.glow(g, 14 + Math.cos(a) * d, y + Math.sin(a) * d, 2.5, TEAL, 0.5);
          }
        }
      },
    },

    'ds-infusion-chair': {
      name: 'Infusion chair', solid: 'rect', radius: 12, dressing: 'Furniture', cache: true, cacheRadius: 24,
      init(it) {
        setBox(it, 18, 26, 0, 0);
      },
      interact: readable('Look at the chair', 'Oncology lab', 'Infusion chair'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#26303a';
        G.roundRect(g, -9, -13, 18, 26, 4);
        g.fill();
        g.fillStyle = it.props.color || '#5a8a9a';
        G.roundRect(g, -7.5, -11.5, 15, 23, 3.5);
        g.fill();
        g.fillStyle = U.shade(it.props.color || '#5a8a9a', 0.2);
        G.roundRect(g, -6, -10.5, 12, 6, 3);
        g.fill();
        // the IV pole and its bag of teal synthids
        g.fillStyle = '#9aa4ab';
        g.beginPath();
        g.arc(12, -8, 1.4, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(95,216,200,0.8)';
        G.roundRect(g, 10, -14, 4, 5, 1.2);
        g.fill();
        g.strokeStyle = 'rgba(200,230,235,0.6)';
        g.lineWidth = 0.4;
        g.beginPath();
        g.moveTo(12, -9);
        g.quadraticCurveTo(10, 0, 6, 2);
        g.stroke();
      },
    },

    'ds-dispenser': {
      name: 'Therapeutic dispenser', solid: 'rect', radius: 10, dressing: 'Furniture', mapColor: '#5fd8c8',
      light: { color: TEAL, radius: 80, intensity: 0.32, flicker: 0 },
      init(it) {
        setBox(it, 20, 14, 0, -6);
        if (it.uses == null) it.uses = 0;
      },
      interact: {
        available: (it) => it.uses < (it.props.charges || 2),
        prompt: (it) => 'Take a therapeutic dose (' + ((it.props.charges || 2) - it.uses) + ' left)',
        use(it, game) {
          const P = game.player;
          if (P.hp >= P.stats().maxHp) return game.toast('You’re not hurt. The dispenser won’t open.', '');
          it.uses++;
          LM.combat.heal(game, P, it.props.heal || 40);
          LM.audio.play('heal');
          game.toast(it.props.text || 'A cold sting in the arm. The synthids get to work on you; the pain goes off like a light.', 'good');
          if (it.light && it.uses >= (it.props.charges || 2)) it.light.off = true;
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#5d666e';
        G.roundRect(g, -10, -13, 20, 14, 3);
        g.fill();
        g.fillStyle = '#e6eaec';
        G.roundRect(g, -9, -12, 18, 12, 2.5);
        g.fill();
        for (let i = 0; i < (it.props.charges || 2); i++) {
          g.fillStyle = i < it.uses ? '#3a4046' : 'rgba(95,216,200,0.85)';
          G.roundRect(g, -6 + i * 6, -9, 4, 6, 1.2);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        if (it.uses >= (it.props.charges || 2)) return;
        g.rotate(rot(it));
        G.glow(g, 0, -6, 14, TEAL, 0.25 + 0.08 * Math.sin(t * 2.5));
      },
    },

    'ds-cold-store': {
      name: 'Cold store', radius: 8, wallMounted: true, shadow: false, dressing: 'Walls',
      light: { color: '#bfe8ff', radius: 90, intensity: 0.3, flicker: 0 },
      interact: readable('Read the cold store’s panel', 'Oncology lab', 'Cold store', true),
      draw(g, it) {
        faceRot(g, it);
        const W = (it.props.w || 2) * T - 6;
        housing(g, -0.5, -W / 2, 5, W, '#c9d0d5');
        g.fillStyle = '#9aa4ab';
        g.fillRect(3, -W / 2 + 3, 1.4, W - 6);
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        const W = (it.props.w || 2) * T - 6;
        G.glow(g, 8, 0, W * 0.55, '#bfe8ff', 0.16);
      },
    },

    'ds-frost': {
      name: 'Frost', radius: 14, z: -3, shadow: false, dressing: 'Decor', cache: true, cacheRadius: 24,
      draw(g, it) {
        const r = U.mulberry32((it.tx * 37 + it.ty * 11) >>> 0);
        g.fillStyle = 'rgba(225,245,255,0.18)';
        g.beginPath();
        g.ellipse(0, 0, 16, 13, r() * 3, 0, U.TAU);
        g.fill();
        g.strokeStyle = 'rgba(240,250,255,0.45)';
        g.lineWidth = 0.5;
        for (let i = 0; i < 9; i++) {
          let x = (r() - 0.5) * 24, y = (r() - 0.5) * 20;
          g.beginPath();
          g.moveTo(x, y);
          for (let k = 0; k < 3; k++) {
            x += (r() - 0.5) * 7;
            y += (r() - 0.5) * 7;
            g.lineTo(x, y);
          }
          g.stroke();
        }
      },
    },

    // ========================================================== the shelter
    'ds-bunk': {
      name: 'Bunk', solid: 'rect', radius: 14, dressing: 'Furniture', cache: true, cacheRadius: 34,
      init(it) {
        // two tiles long along its dir's side
        const d = it.props.dir || 's';
        if (d === 's' || d === 'n') it.x = it.tx * T + T;
        else it.y = it.ty * T + T;
        setBox(it, 58, 22, 0, 0);
      },
      interact: readable('Look at the bunk', 'Shelter B', 'A bunk'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#3a4046';
        g.fillRect(-29, -11, 58, 22);
        g.fillStyle = '#6a737b';
        g.fillRect(-28, -10, 56, 20);
        g.fillStyle = '#d8dcd6';
        g.fillRect(-27, -9, 54, 18);
        // the blanket, thrown back, and a pillow
        g.fillStyle = it.props.color || '#4a6a5a';
        g.beginPath();
        g.moveTo(-6, -9);
        g.lineTo(27, -9);
        g.lineTo(27, 9);
        g.lineTo(2, 9);
        g.quadraticCurveTo(-8, 2, -6, -9);
        g.fill();
        g.fillStyle = '#eef0ec';
        G.roundRect(g, -25, -7, 10, 14, 3);
        g.fill();
        if (it.props.strands) {
          g.strokeStyle = 'rgba(235,225,215,0.55)';
          g.lineWidth = 0.8;
          const r = U.mulberry32((it.tx * 19 + it.ty * 3) >>> 0);
          for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.moveTo(-28 + r() * 56, -10);
            g.bezierCurveTo(-20 + r() * 40, -2, -20 + r() * 40, 4, -28 + r() * 56, 10);
            g.stroke();
          }
        }
      },
    },

    'ds-supply-crate': {
      name: 'Emergency supplies', solid: 'rect', radius: 11, dressing: 'Furniture',
      init(it) {
        setBox(it, 22, 18, 0, 0);
      },
      interact: readable('Read the crate', 'Shelter B', 'Emergency supplies'),
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#25402c';
        g.fillRect(-11, -9, 22, 18);
        g.fillStyle = '#3f6a48';
        g.fillRect(-10, -8, 20, 16);
        g.fillStyle = '#e8ecee';
        g.fillRect(-1.5, -5.5, 3, 11);
        g.fillRect(-5.5, -1.5, 11, 3);
        if (it.props.open) {
          g.fillStyle = '#16231a';
          g.fillRect(-10, -8, 20, 6);
        }
      },
    },

    'ds-torn-vent': {
      name: 'Torn vent', radius: 18, z: 6, shadow: false, dressing: 'Decor',
      drawShadow() {},
      interact: readable('Look up at the vent', 'Shelter B', 'The ceiling vent'),
      draw(g, it, t) {
        // a square ceiling vent, its grille bent down and open; pale strands hang out of it and sway
        g.fillStyle = '#16181b';
        g.fillRect(-12, -12, 24, 24);
        g.fillStyle = '#060607';
        g.fillRect(-9, -9, 18, 18);
        g.strokeStyle = '#7d878f';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-12, 12);
        g.lineTo(-16, 20);
        g.moveTo(-4, 12);
        g.lineTo(-6, 22);
        g.moveTo(4, 12);
        g.lineTo(7, 21);
        g.stroke();
        g.strokeStyle = 'rgba(235,228,218,0.7)';
        g.lineWidth = 1;
        for (let i = 0; i < 9; i++) {
          const x0 = -8 + i * 2, sw = Math.sin(t * 0.8 + i) * 3;
          g.beginPath();
          g.moveTo(x0, -6 + (i % 3) * 4);
          g.bezierCurveTo(x0 + sw, 4, x0 - sw, 10, x0 + sw * 0.6, 16 + (i % 4) * 3);
          g.stroke();
        }
      },
    },

    'ds-torch': {
      name: 'Torch', radius: 4, z: -1, dressing: 'Lights',
      light: { color: '#fff0d0', radius: 120, intensity: 0.32, flicker: 0.03 },
      draw(g, it) {
        g.rotate(it.props.angle || 0);
        g.fillStyle = '#2a2e33';
        G.roundRect(g, -6, -1.6, 9, 3.2, 1.2);
        g.fill();
        g.fillStyle = '#e0b25a';
        g.fillRect(-2, -1.6, 1.4, 3.2);
        g.fillStyle = '#9aa4ab';
        g.fillRect(3, -2.2, 2.4, 4.4);
      },
      drawGlow(g, it, t) {
        g.rotate(it.props.angle || 0);
        // the beam along the floor
        const R = 90;
        const grd = g.createRadialGradient(5, 0, 0, 5, 0, R);
        grd.addColorStop(0, 'rgba(255,240,210,0.32)');
        grd.addColorStop(1, 'rgba(255,240,210,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(5, 0);
        g.arc(5, 0, R, -0.32, 0.32);
        g.closePath();
        g.fill();
        G.glow(g, 5.5, 0, 5, '#fff6e0', 0.7);
      },
    },

    'ds-blanket': {
      name: 'Blanket', radius: 12, z: -2, shadow: false, dressing: 'Decor', cache: true, cacheRadius: 22,
      draw(g, it) {
        g.rotate(it.props.angle || 0);
        const c = it.props.color || '#5a6a7a';
        const r = U.mulberry32((it.tx * 29 + it.ty * 41) >>> 0);
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(-14, -8);
        for (let i = 0; i < 7; i++) g.lineTo(-14 + i * 4.6, -9 + r() * 3);
        g.lineTo(14, 8);
        for (let i = 0; i < 7; i++) g.lineTo(14 - i * 4.6, 8 + r() * 3);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.moveTo(-12 + r() * 6, -6 + r() * 12);
          g.quadraticCurveTo(r() * 6 - 3, r() * 10 - 5, 10 - r() * 6, -6 + r() * 12);
          g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(-14, -8, 28, 1.5);
      },
    },

    'ds-strands': {
      name: 'Strands', radius: 6, z: -2, shadow: false, dressing: 'Decor',
      draw(g, it, t) {
        const L = (it.props.len || 3) * T;
        g.rotate(it.props.angle || 0);
        const r = U.mulberry32((it.tx * 53 + it.ty * 13) >>> 0);
        g.strokeStyle = 'rgba(232,224,212,0.55)';
        for (let i = 0; i < 6; i++) {
          g.lineWidth = 0.6 + r() * 0.9;
          const off = (r() - 0.5) * 8;
          g.beginPath();
          g.moveTo(-L / 2, off);
          g.bezierCurveTo(-L / 6, off + (r() - 0.5) * 14, L / 6, off + (r() - 0.5) * 14, L / 2, off + (r() - 0.5) * 6);
          g.stroke();
        }
      },
      drawGlow(g, it, t) {
        const L = (it.props.len || 3) * T;
        g.rotate(it.props.angle || 0);
        // a wet glint travelling along them
        const k = ((t * 0.25 + it.tx * 0.1) % 1) - 0.5;
        G.glow(g, k * L, 0, 6, '#f4ece0', 0.18);
      },
    },
  };

  LM.definePack({ id: 'ds-lab', items });
})();
