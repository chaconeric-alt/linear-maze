/* Dead Signal — packs/ds-lab/dressings.js
 * The building's fixtures and furniture. Wall pieces hang on the open side of a wall tile (props.face
 * pins which side); floor pieces with a front take props.dir ('s' | 'n' | 'e' | 'w'), wide ones props.w.
 *
 *   on walls   ds-strobe      emergency strobe (red); a `lights` trap effect switches it by tag
 *              ds-screen      wall screen: props.lines scroll (the lockdown notice); props.text when read;
 *                             props.fragment n: stand in front of it for props.hold seconds (3) and it
 *                             shows ARIADNE's audit fragment n (ds-story) and sets fragment<n>
 *              ds-camera      security camera: it pans; if it holds you in view for a moment it sets
 *                             props.flag (a flag trap can sound the alarm). Shoot it to blind it.
 *              ds-monitors    the security office's wall of camera feeds (props.w tiles, props.text)
 *              ds-intercom    an intercom speaker: lights up while anyone is speaking
 *              ds-drone-dock, ds-vent, ds-exit-sign
 *   on floors  ds-netrack     network rack (props.text: what its screen says)
 *              ds-console     a desk console you can use (props.flag set on use, props.text shown)
 *              ds-locker      a row of staff lockers (props.w)
 *              ds-body        someone who didn't make it (props.covered, props.title, props.text;
 *                             props.faceless / props.face: Floor 2's shelter, see ds-nightmares/congregation.js)
 *              ds-note        a sheet of paper or a sticky note (props.sticky) you can read
 *              ds-turnstile   a security gate
 *              ds-sculpture   the Asterion: a steel bull's head on a plinth (2 x 2 tiles)
 *              ds-planter     a long planter box (props.w), plants long dead
 *              ds-workbench   Facilities' bench (props.w)
 *              ds-cart        a mail cart full of parcels
 *              ds-cable       a fallen light fitting and its live cable (decoration for ds-live-water)
 *              ds-smear       a blood smear on the floor (props.turn, props.len)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  const faceRot = (g, it) => g.rotate(Math.atan2(it.face.y, it.face.x));
  const say = (title, text, kicker) => LM.ui.showText(title, text, kicker);
  const textOf = (v, game) => (typeof v === 'function' ? v(game) : v);
  function setBox(it, w, hh, ox, oy) {
    const d = it.props.dir || 's';
    if (d === 's') { it.box = [w, hh]; it.boxOff = [ox, oy]; }
    else if (d === 'n') { it.box = [w, hh]; it.boxOff = [-ox, -oy]; }
    else if (d === 'e') { it.box = [hh, w]; it.boxOff = [oy, -ox]; }
    else { it.box = [hh, w]; it.boxOff = [-oy, ox]; }
  }
  /** A multi-tile piece along its front: w tiles wide, centred on its tiles (anchored at the top-left tile). */
  function spanW(it, w) {
    const d = it.props.dir || 's';
    if (d === 'e' || d === 'w') it.y = it.ty * T + (w * T) / 2;
    else it.x = it.tx * T + (w * T) / 2;
  }

  LM.ui.addStyles(`
    .ds-screen { font: 500 13px/1.55 var(--font-ui); color: #a8d8f0; background: #071018; border: 1px solid #1c3a52; padding: 12px 14px; white-space: pre-wrap; margin-bottom: 12px; }
    .ds-screen.ariadne { color: #c8efff; border-color: #2c6a8a; box-shadow: 0 0 22px rgba(127,212,255,0.12) inset; }
    .ds-sticky { width: min(240px, 100%); box-sizing: border-box; padding: 16px 16px 20px; margin: 4px 0 14px; background: #f2d96a; color: #2b2410;
      font: italic 400 20px/1.3 var(--font-lore); transform: rotate(-1.4deg); box-shadow: 0 10px 22px rgba(0,0,0,0.45); white-space: pre-wrap; }
  `);
  DS.screenText = (text, ariadne) => h('div', { class: 'ds-screen' + (ariadne ? ' ariadne' : '') }, text);

  // ------------------------------------------------------------ helpers
  function housing(g, x, y, w, hh, c) {
    g.fillStyle = '#16181b';
    g.fillRect(x - 0.6, y - 0.6, w + 1.2, hh + 1.2);
    g.fillStyle = c || '#3a3f45';
    g.fillRect(x, y, w, hh);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(x, y, w, 0.7);
  }

  // the helpers other Dead Signal dressings (labs.js) draw with
  DS.dress = { ROT, rot, faceRot, say, textOf, setBox, spanW, housing };

  const items = {
    // ========================================================== on walls
    'ds-strobe': {
      name: 'Emergency strobe', radius: 5, wallMounted: true, shadow: false, dressing: 'Lights',
      light: { color: '#ff2a1a', radius: 190, intensity: 0.5, flicker: 0.02 },
      init(it) {
        it.phase = U.hash2(it.tx, it.ty, 3) * 1.4;
      },
      update(it, dt, game) {
        if (!it.light || it.light.off) return;
        const ph = (game.time + it.phase) % 1.4;
        it.light.intensity = ph < 0.18 ? 0.75 : ph < 0.32 ? 0.12 : 0.04;
      },
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -4, 4, 8, '#2a2d31');
        g.fillStyle = '#5a1410';
        g.beginPath();
        g.arc(3.4, 0, 2.6, -Math.PI / 2, Math.PI / 2);
        g.fill();
      },
      drawGlow(g, it, t, game) {
        if (it.light && it.light.off) return;
        faceRot(g, it);
        const k = it.light ? it.light.intensity : 0.5;
        G.glow(g, 3.5, 0, 9, '#ff3a2a', Math.min(1, k * 1.4));
        if (k > 0.5) G.circle(g, 3.6, 0, 1.6, '#ffd0c0');
      },
    },

    'ds-screen': {
      name: 'Wall screen', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls',
      light: { color: '#7fbfe8', radius: 90, intensity: 0.32, flicker: 0 },
      init(it) {
        it.watch = 0;
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Read the screen',
        use: (it, game) => LM.ui.open({ kicker: it.props.kicker || 'Wall screen', title: it.props.title || 'Asterion Biologics', body: h('div', null, DS.screenText(textOf(it.props.text, game))), actions: [{ label: 'Close', primary: true }] }),
      },
      update(it, dt, game) {
        const n = it.props.fragment;
        if (!n || game.hasFlag('fragment' + n) || !game.player) return;
        const P = game.player;
        const close = U.dist(P.x, P.y, it.x, it.y) < (it.props.near || 64);
        it.watch = close ? it.watch + dt : Math.max(0, it.watch - dt * 2);
        if (it.watch >= (it.props.hold || 3) && DS.showFragment) {
          it.watch = 0;
          DS.showFragment(game, n, it);
        }
      },
      draw(g, it, t) {
        faceRot(g, it);
        const W = (it.props.w || 1) * 24;
        housing(g, -0.5, -W / 2, 3.6, W, '#1c1f23');
      },
      drawGlow(g, it, t, game) {
        faceRot(g, it);
        const W = (it.props.w || 1) * 24;
        const n = it.props.fragment, glitch = n && !game.hasFlag('fragment' + n) && it.watch > 0;
        const col = glitch ? DS.C.ariadne : '#7fbfe8';
        g.fillStyle = U.rgba(col, 0.16);
        g.fillRect(2.6, -W / 2 + 1.5, 0.9, W - 3);
        // scrolling lines of text, seen edge-on: little moving dashes
        const r = U.mulberry32((it.tx * 31 + it.ty * 7 + Math.floor(t * (glitch ? 20 : 2))) >>> 0);
        for (let i = 0; i < W - 4; i += 3) {
          if (r() < 0.45) continue;
          g.fillStyle = U.rgba(col, glitch ? 0.9 : 0.5);
          g.fillRect(2.4, -W / 2 + 2 + i, 1.2, 1.6);
        }
        G.glow(g, 6, 0, W * 0.6, col, glitch ? 0.35 + 0.25 * r() : 0.12);
        if (glitch) {
          // the watch meter: how long until it gives up its fragment
          const k = Math.min(1, it.watch / (it.props.hold || 3));
          g.fillStyle = U.rgba(DS.C.ariadne, 0.8);
          g.fillRect(5, -W / 2, 1, W * k);
        }
      },
    },

    'ds-camera': {
      name: 'Security camera', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: '#ff6a5a',
      destructible: {
        hp: 8,
        onBreak(it, game) {
          game.particles.burst(it.x, it.y, 10, { type: 'spark', color: '#ffd27a', speed: 160, life: 0.4 });
          game.particles.burst(it.x, it.y, 4, { type: 'smoke', color: '#333', speed: 30, life: 0.8, size: 4, alpha: 0.4 });
          LM.audio.play('break', { vol: game.vol(it.x, it.y) });
        },
      },
      init(it) {
        it.pan = 0;
        it.seen = 0;
        it.base = Math.atan2(it.face.y, it.face.x);
        it.aim = it.base;
        it.range = it.props.range || 250;
        it.cone = it.props.cone || 0.42;
      },
      update(it, dt, game) {
        if (it.broken || it.tripped) return;
        const P = game.player;
        it.pan += dt;
        const sweep = it.props.sweep == null ? 0.8 : it.props.sweep;
        let target = it.base + Math.sin(it.pan * 0.7 + it.tx) * sweep;
        let sees = false;
        if (P && !P.dead) {
          const d = U.dist(P.x, P.y, it.x, it.y);
          const a = Math.atan2(P.y - it.y, P.x - it.x);
          if (d < it.range && Math.abs(U.angDiff(it.aim, a)) < it.cone && LM.physics.los(game.level, it.x + it.face.x * 6, it.y + it.face.y * 6, P.x, P.y)) {
            sees = true;
            target = a;
          }
        }
        it.aim += U.angDiff(it.aim, target) * Math.min(1, dt * (sees ? 6 : 1.5));
        it.seen = sees ? it.seen + dt : Math.max(0, it.seen - dt);
        if (sees && it.seen > 0 && !it.beeped) {
          it.beeped = true;
          LM.audio.play('warn', { vol: 0.5 });
        }
        if (!sees && it.seen <= 0) it.beeped = false;
        if (it.seen > (it.props.delay || 0.8)) {
          it.tripped = true;
          if (it.props.flag) game.setFlag(it.props.flag);
          game.toast(it.props.text || 'A camera has seen you.', 'warn');
        }
      },
      draw(g, it) {
        g.save();
        faceRot(g, it);
        housing(g, -0.5, -2.5, 3, 5, '#2a2d31');
        g.restore();
        g.rotate(it.aim || 0);
        g.fillStyle = it.broken ? '#2a2a2a' : '#c9ced4';
        G.roundRect(g, 1, -3, 10, 6, 2);
        g.fill();
        g.fillStyle = '#16181b';
        g.fillRect(10, -2, 2, 4);
      },
      drawGlow(g, it, t) {
        if (it.broken) return;
        g.rotate(it.aim || 0);
        const alarm = it.tripped || it.seen > 0;
        DS.led(g, 4, 0, alarm ? '#ff3a2a' : '#5fe08a', alarm ? 0.9 : 0.35 + 0.3 * (Math.sin(t * 3) > 0.6 ? 1 : 0), 0.8);
        // the view cone, faintly
        if (!it.tripped) {
          const R = it.range * 0.9;
          const grd = g.createRadialGradient(10, 0, 0, 10, 0, R);
          grd.addColorStop(0, alarm ? 'rgba(255,60,40,0.16)' : 'rgba(255,240,200,0.07)');
          grd.addColorStop(1, 'rgba(255,240,200,0)');
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(10, 0);
          g.arc(10, 0, R, -it.cone, it.cone);
          g.closePath();
          g.fill();
        }
      },
    },

    'ds-monitors': {
      name: 'Camera monitors', radius: 8, wallMounted: true, shadow: false, dressing: 'Walls',
      light: { color: '#8fc8e8', radius: 150, intensity: 0.42, flicker: 0.03 },
      interact: {
        prompt: () => 'Look at the camera feeds',
        use: (it, game) => LM.ui.open({ kicker: 'Security office', title: 'Camera feeds', body: h('div', null, DS.screenText(textOf(it.props.text, game) || 'Static.')), actions: [{ label: 'Close', primary: true }] }),
      },
      draw(g, it) {
        faceRot(g, it);
        const W = (it.props.w || 2) * T - 6;
        housing(g, -0.5, -W / 2, 5, W, '#1a1c20');
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        const W = (it.props.w || 2) * T - 6, n = Math.max(2, Math.round(W / 10));
        for (let i = 0; i < n; i++) {
          const r = U.mulberry32((i * 977 + it.tx + Math.floor(t * 3 + i)) >>> 0);
          const bad = r() < 0.2;
          g.fillStyle = bad ? 'rgba(200,210,220,' + (0.2 + r() * 0.3) + ')' : 'rgba(140,200,235,' + (0.35 + r() * 0.2) + ')';
          g.fillRect(3.6, -W / 2 + 1 + i * (W / n), 1.2, W / n - 1.5);
        }
        G.glow(g, 10, 0, W * 0.5, '#8fc8e8', 0.18);
      },
    },

    'ds-intercom': {
      name: 'Intercom', radius: 5, wallMounted: true, shadow: false, dressing: 'Walls',
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -4.5, 3.2, 9, '#4a4f55');
        g.fillStyle = '#1a1c1f';
        for (let i = -3; i <= 2; i += 1.6) g.fillRect(1.5, i, 1.2, 0.8);
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        const on = LM.comms && LM.comms.busy();
        DS.led(g, 2.6, 3.4, on ? DS.C.warn : '#3a6a3a', on ? 0.6 + 0.4 * Math.abs(Math.sin(t * 14)) : 0.25, 0.7);
      },
    },

    'ds-drone-dock': {
      name: 'Drone dock', radius: 7, wallMounted: true, shadow: false, dressing: 'Walls',
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -7, 4, 14, '#2a2d31');
        g.fillStyle = '#4a5056';
        g.fillRect(3, -5, 3, 10);
        DS.hazard(g, 3, -5, 1, 10, 2);
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        DS.led(g, 2, -5.5, '#ff4a3a', 0.4 + 0.3 * Math.sin(t * 2 + it.tx), 0.7);
      },
    },

    'ds-vent': {
      name: 'Air vent', radius: 7, wallMounted: true, shadow: false, dressing: 'Walls',
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -8, 2.6, 16, '#5a6168');
        g.fillStyle = '#16181b';
        for (let i = -6.5; i < 7; i += 2.2) g.fillRect(0.6, i, 1.6, 1.1);
        if (it.props.open) {
          g.fillStyle = '#060606';
          g.fillRect(-0.5, -8, 2.6, 16);
        }
      },
    },

    'ds-exit-sign': {
      name: 'Exit sign', radius: 5, wallMounted: true, shadow: false, dressing: 'Lights',
      light: { color: '#5fe08a', radius: 80, intensity: 0.32, flicker: 0 },
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -6, 3, 12, '#e8ece8');
      },
      drawGlow(g, it) {
        faceRot(g, it);
        g.fillStyle = 'rgba(95,224,138,0.9)';
        g.fillRect(2.4, -5, 0.9, 10);
        G.glow(g, 4, 0, 10, '#5fe08a', 0.35);
      },
    },

    // ========================================================== on floors
    'ds-netrack': {
      name: 'Network rack', solid: 'rect', radius: 13, mapColor: '#6a7f8a', dressing: 'Furniture',
      init(it) {
        setBox(it, 26, 20, 0, -2);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => it.props.prompt || 'Read the rack’s display',
        use: (it, game) => LM.ui.open({ kicker: it.props.kicker || 'Network', title: it.props.title || 'Core switch', body: h('div', null, DS.screenText(textOf(it.props.text, game))), actions: [{ label: 'Close', primary: true }] }),
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#121417';
        g.fillRect(-13, -12, 26, 20);
        g.fillStyle = '#23272c';
        g.fillRect(-12, -11, 24, 18);
        for (let i = 0; i < 5; i++) {
          g.fillStyle = i % 2 ? '#2e333a' : '#353b42';
          g.fillRect(-11, -10 + i * 3.4, 22, 2.8);
        }
        // a nest of patch cables at the front
        g.strokeStyle = '#3d7ab0';
        g.lineWidth = 0.8;
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          g.moveTo(-9 + i * 3.4, 7);
          g.quadraticCurveTo(-8 + i * 3, 11 + (i % 3), -4 + i * 2, 9);
        }
        g.stroke();
        g.strokeStyle = '#e0b25a';
        g.beginPath();
        g.moveTo(6, 7);
        g.quadraticCurveTo(9, 12, 11, 8);
        g.stroke();
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 6; j++) {
            const on = U.hash2(it.tx * 7 + j, Math.floor(t * (4 + j)) + i * 13, 5) > 0.45;
            if (!on) continue;
            const c = it.props.alarm && j === 0 ? '#ff4a3a' : j % 3 ? '#5fe08a' : '#ffb84a';
            g.fillStyle = c;
            g.fillRect(-10 + j * 3.6, -9.4 + i * 3.4, 1, 1);
          }
        }
        G.glow(g, 0, 0, 20, '#5fe08a', 0.06);
      },
    },

    'ds-console': {
      name: 'Console', solid: 'rect', radius: 14, mapColor: '#8fc8e8', dressing: 'Furniture',
      light: { color: '#8fc8e8', radius: 70, intensity: 0.3, flicker: 0 },
      init(it) {
        const w = it.props.w || 1;
        spanW(it, w);
        setBox(it, w * T - 4, 16, 0, -6);
      },
      interact: {
        available: (it, game) => !!(it.props.flag || it.props.text) && !(it.props.once !== false && it.props.flag && game.hasFlag(it.props.flag)),
        prompt: (it) => it.props.prompt || 'Use the console',
        use(it, game) {
          if (it.props.flag) game.setFlag(it.props.flag);
          if (it.props.text) LM.ui.open({ kicker: it.props.kicker || 'Console', title: it.props.title || 'Terminal', body: h('div', null, DS.screenText(textOf(it.props.text, game))), actions: [{ label: 'Close', primary: true }] });
          LM.audio.play('ui');
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 1) * T - 4;
        g.fillStyle = '#1e2125';
        G.roundRect(g, -W / 2, -14, W, 16, 2);
        g.fill();
        g.fillStyle = '#2c3036';
        G.roundRect(g, -W / 2 + 1, -13, W - 2, 14, 2);
        g.fill();
        // keyboards
        g.fillStyle = '#121417';
        for (let x = -W / 2 + 5; x < W / 2 - 8; x += 15) g.fillRect(x, -4, 10, 3.6);
        // a chair
        g.fillStyle = '#16171b';
        g.beginPath();
        g.arc(0, 9, 6.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2d3038';
        G.roundRect(g, -5.5, 4, 11, 9, 3);
        g.fill();
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        const W = (it.props.w || 1) * T - 4;
        for (let x = -W / 2 + 4; x < W / 2 - 6; x += 15) {
          g.fillStyle = 'rgba(140,200,235,0.55)';
          g.fillRect(x, -12.5, 12, 4);
        }
        G.glow(g, 0, -10, W * 0.6, '#8fc8e8', 0.14);
      },
    },

    'ds-locker': {
      name: 'Lockers', solid: 'rect', radius: 14, dressing: 'Furniture',
      init(it) {
        const w = it.props.w || 1;
        spanW(it, w);
        setBox(it, w * T - 2, 13, 0, -9);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => it.props.prompt || 'Look in the lockers',
        use: (it, game) => say(it.props.title || 'Lockers', textOf(it.props.text, game), it.props.kicker || 'Staff lockers'),
      },
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 1) * T - 2, n = (it.props.w || 1) * 3;
        g.fillStyle = '#20252a';
        g.fillRect(-W / 2, -16, W, 14);
        for (let i = 0; i < n; i++) {
          const x = -W / 2 + 0.5 + (i * (W - 1)) / n, w = (W - 1) / n - 0.6;
          const open = it.props.open && i === (it.props.open - 1);
          g.fillStyle = open ? '#121417' : i % 2 ? (it.props.color || '#4a5a6a') : U.shade(it.props.color || '#4a5a6a', 0.08);
          g.fillRect(x, -15.5, w, 13);
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(x + 1, -14, w - 2, 0.6);
          g.fillRect(x + 1, -12.8, w - 2, 0.6);
          g.fillStyle = '#b8bec6';
          g.fillRect(x + w - 2, -8, 1, 2.4);
        }
      },
    },

    'ds-body': {
      name: 'Body', radius: 10, z: -2, dressing: 'Decor', mapColor: '#7a2a2a', mapAlways: true,
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => it.props.prompt || (it.props.covered ? 'Lift the sheet' : 'Look at the body'),
        use: (it, game) => {
          if (it.props.flag) game.setFlag(it.props.flag);
          say(it.props.title || 'Someone you might have known', textOf(it.props.text, game), it.props.kicker || 'The dead');
        },
      },
      draw(g, it) {
        const r = U.mulberry32((it.tx * 131 + it.ty * 17) >>> 0);
        g.rotate((it.props.angle != null ? it.props.angle : r() * U.TAU));
        // the stain under them
        g.fillStyle = 'rgba(60,8,8,0.55)';
        g.beginPath();
        g.ellipse(2, 1, 15, 10, 0.3, 0, U.TAU);
        g.fill();
        if (it.props.covered) {
          g.fillStyle = '#d8dcdf';
          g.beginPath();
          g.ellipse(0, 0, 14, 7, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.beginPath();
          g.ellipse(-8, 0, 4, 4.5, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(130,20,20,0.6)';
          g.beginPath();
          g.ellipse(3, 2, 4, 2.5, 0.4, 0, U.TAU);
          g.fill();
          return;
        }
        const c = it.props.color || '#2f3a4a';
        // legs, body, arms flung out, head
        g.fillStyle = U.shade(c, -0.25);
        g.fillRect(4, -4, 12, 3);
        g.fillRect(4, 1.5, 11, 3);
        g.fillStyle = c;
        g.beginPath();
        g.ellipse(-1, 0, 7, 6, 0, 0, U.TAU);
        g.fill();
        g.fillRect(-6, -10, 3, 7);
        g.fillRect(-4, 4, 3, 8);
        g.fillStyle = it.props.skin || '#c49a7a';
        g.beginPath();
        g.arc(-10, 0.5, 3.6, 0, U.TAU);
        g.fill();
        g.fillStyle = it.props.hair || '#2a1e16';
        g.beginPath();
        g.arc(-11, 0.5, 3.2, Math.PI * 0.5, Math.PI * 1.5);
        g.fill();
        // props.faceless (Floor 2's shelter): where the face was, something smooth and pale
        if (it.props.faceless) {
          g.fillStyle = '#e8dccb';
          g.beginPath();
          g.ellipse(-9.4, 0.5, 2.6, 3, 0, 0, U.TAU);
          g.fill();
          g.strokeStyle = 'rgba(232,220,203,0.6)';
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(-7, 0);
          g.quadraticCurveTo(-3, -4, 1, -2);
          g.stroke();
        }
      },
    },

    'ds-note': {
      name: 'Note', radius: 5, z: -1, bob: false, dressing: 'Decor',
      interact: {
        prompt: (it) => it.props.prompt || 'Read the note',
        use(it, game) {
          if (it.props.flag) game.setFlag(it.props.flag);
          const body = it.props.sticky
            ? h('div', null, h('div', { class: 'ds-sticky' }, textOf(it.props.text, game)), it.props.after ? h('p', { class: 'muted' }, it.props.after) : null)
            : h('div', { class: 'lore-block' }, String(textOf(it.props.text, game) || '').split('\n\n').map((p) => h('p', { class: 'lore' }, p)));
          LM.ui.open({ kicker: it.props.kicker || 'A note', title: it.props.title || (it.props.sticky ? 'Sticky note' : 'A sheet of paper'), body, actions: [{ label: 'Close', primary: true }] });
        },
      },
      draw(g, it) {
        g.rotate(U.hash2(it.tx, it.ty, 4) * 1.2 - 0.6);
        if (it.props.sticky) {
          g.fillStyle = '#f2d96a';
          g.fillRect(-3.5, -3.5, 7, 7);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(-2.5, -1, 5, 0.5);
          g.fillRect(-2.5, 0.6, 4, 0.5);
          return;
        }
        g.fillStyle = '#e8e6e0';
        g.fillRect(-4.5, -6, 9, 12);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = -4; i < 5; i += 1.6) g.fillRect(-3.5, i, 6 + (i % 3), 0.5);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 10, '#fff2c8', 0.1 + 0.05 * Math.sin(t * 2.5));
      },
    },

    'ds-turnstile': {
      name: 'Security gate', solid: 'rect', radius: 8, mapColor: '#9aa1a8', dressing: 'Furniture',
      light: { color: '#ff4a3a', radius: 40, intensity: 0.3, flicker: 0 },
      init(it) {
        setBox(it, 8, 26, 0, 0);
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#1e2125';
        G.roundRect(g, -4, -13, 8, 26, 2);
        g.fill();
        g.fillStyle = '#9aa3ab';
        G.roundRect(g, -3.2, -12.2, 6.4, 24.4, 2);
        g.fill();
        g.fillStyle = '#2a2d31';
        g.fillRect(-2, -10, 4, 6);
        // the glass flap
        g.fillStyle = 'rgba(170,205,225,0.45)';
        g.fillRect(4, -1.5, 10, 3);
      },
      drawGlow(g, it) {
        g.rotate(rot(it));
        DS.led(g, 0, -7, '#ff4a3a', 0.6, 0.8);
      },
    },

    'ds-sculpture': {
      name: 'The Asterion', solid: 'rect', radius: 26, mapColor: '#b8bec6', dressing: 'Decor',
      light: { color: '#cfe0ee', radius: 150, intensity: 0.35, flicker: 0 },
      init(it) {
        it.x = it.tx * T + T;
        it.y = it.ty * T + T;
        it.box = [44, 44];
        it.boxOff = [0, 0];
      },
      interact: {
        prompt: () => 'Read the plaque',
        use: (it, game) => say('The Asterion', textOf(it.props.text, game) || 'THE ASTERION\nBrushed steel, 2019. Commissioned by the Board.\n\n“From the labyrinth, a new kind of life.”', 'Lobby'),
      },
      draw(g, it, t) {
        // plinth
        g.fillStyle = '#26292d';
        G.roundRect(g, -24, -24, 48, 48, 3);
        g.fill();
        g.fillStyle = '#3a3e44';
        G.roundRect(g, -22, -22, 44, 44, 3);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(-22, -22, 44, 1);
        // a bull's head in faceted steel, seen from above: horns sweeping forward
        const steel = (a, b) => {
          const grd = g.createLinearGradient(-16, -16, 16, 16);
          grd.addColorStop(0, a);
          grd.addColorStop(1, b);
          return grd;
        };
        g.fillStyle = steel('#d8dde2', '#6a7178');
        g.beginPath();
        g.moveTo(0, 14);
        g.lineTo(9, 4);
        g.lineTo(8, -8);
        g.lineTo(0, -12);
        g.lineTo(-8, -8);
        g.lineTo(-9, 4);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.3)';
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(0, 14);
        g.lineTo(0, -12);
        g.moveTo(-9, 4);
        g.lineTo(9, 4);
        g.stroke();
        g.fillStyle = steel('#eef1f4', '#7a8188');
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(s * 7, -7);
          g.quadraticCurveTo(s * 20, -10, s * 18, -20);
          g.quadraticCurveTo(s * 16, -12, s * 5, -10);
          g.closePath();
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, -4, 30, '#cfe0ee', 0.1);
      },
    },

    'ds-planter': {
      name: 'Planter', solid: 'rect', radius: 14, dressing: 'Furniture', cache: true,
      cacheRadius: (it) => (it.props.w || 2) * 16 + 8,
      init(it) {
        const w = it.props.w || 2;
        spanW(it, w);
        setBox(it, w * T - 6, 22, 0, 0);
      },
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 6;
        g.fillStyle = '#2a2d31';
        G.roundRect(g, -W / 2, -11, W, 22, 2);
        g.fill();
        g.fillStyle = '#4a4f55';
        G.roundRect(g, -W / 2 + 1, -10, W - 2, 20, 2);
        g.fill();
        g.fillStyle = '#2b2218';
        g.fillRect(-W / 2 + 3, -8, W - 6, 16);
        const r = U.mulberry32((it.tx * 53 + it.ty * 11) >>> 0);
        for (let i = 0; i < W / 6; i++) {
          const px = -W / 2 + 6 + r() * (W - 12), py = -5 + r() * 10;
          const dead = it.props.alive ? 0 : 1;
          g.strokeStyle = dead ? (r() < 0.5 ? '#6a5a3a' : '#5a4a2e') : '#3a6a3a';
          g.lineWidth = 1;
          for (let k = 0; k < 4; k++) {
            const a = r() * U.TAU, l = 3 + r() * 5;
            g.beginPath();
            g.moveTo(px, py);
            g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
            g.stroke();
          }
        }
      },
    },

    'ds-workbench': {
      name: 'Workbench', solid: 'rect', radius: 14, dressing: 'Furniture',
      init(it) {
        const w = it.props.w || 2;
        spanW(it, w);
        setBox(it, w * T - 4, 18, 0, -6);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => it.props.prompt || 'Look at the bench',
        use: (it, game) => say(it.props.title || 'Workbench', textOf(it.props.text, game), it.props.kicker || 'Facilities'),
      },
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 2) * T - 4;
        g.fillStyle = '#3a2c1e';
        g.fillRect(-W / 2, -15, W, 18);
        g.fillStyle = '#6a5038';
        g.fillRect(-W / 2 + 1, -14, W - 2, 16);
        g.fillStyle = 'rgba(0,0,0,0.2)';
        for (let x = -W / 2 + 6; x < W / 2; x += 9) g.fillRect(x, -14, 0.6, 16);
        // a vice, a drill, scattered parts
        g.fillStyle = '#4a5560';
        g.fillRect(-W / 2 + 3, -13, 6, 5);
        g.fillStyle = '#d9a21c';
        G.roundRect(g, -2, -11, 10, 4, 1.5);
        g.fill();
        g.fillStyle = '#1a1a1a';
        g.fillRect(6, -10, 4, 2);
        const r = U.mulberry32((it.tx * 7 + it.ty) >>> 0);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = r() < 0.5 ? '#9aa1a8' : '#5a6168';
          g.fillRect(-W / 2 + 12 + r() * (W - 24), -12 + r() * 10, 1.5 + r() * 2, 1 + r());
        }
      },
    },

    'ds-cart': {
      name: 'Mail cart', solid: 'rect', radius: 12, dressing: 'Furniture',
      init(it) {
        setBox(it, 26, 16, 0, 0);
      },
      draw(g, it) {
        g.rotate(rot(it) + (it.props.askew ? 0.4 : 0));
        g.fillStyle = '#1e2125';
        g.fillRect(-13, -8, 26, 16);
        g.fillStyle = '#5a6168';
        g.fillRect(-12, -7, 24, 14);
        const r = U.mulberry32((it.tx * 13 + it.ty * 3) >>> 0);
        for (let i = 0; i < 6; i++) {
          g.fillStyle = r() < 0.5 ? '#a8865a' : '#b8966a';
          const w = 6 + r() * 6, hh = 4 + r() * 4;
          g.fillRect(-11 + r() * (22 - w), -6 + r() * (12 - hh), w, hh);
          g.fillStyle = 'rgba(255,255,255,0.4)';
          g.fillRect(-9 + r() * 14, -4 + r() * 8, 3, 0.7);
        }
        g.fillStyle = '#9aa1a8';
        g.fillRect(-14, -6, 1.2, 12);
      },
    },

    'ds-cable': {
      name: 'Fallen light fitting', radius: 10, z: 1, shadow: false, dressing: 'Decor',
      draw(g, it) {
        g.rotate(it.props.angle || 0.5);
        g.fillStyle = '#c9ced4';
        g.fillRect(-14, -4, 28, 8);
        g.fillStyle = '#e8ecef';
        g.fillRect(-13, -3, 26, 6);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(-13, -0.4, 26, 0.8);
        g.strokeStyle = '#151515';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(14, 0);
        g.bezierCurveTo(22, 4, 18, 14, 26, 18);
        g.stroke();
      },
      drawGlow(g, it, t, game) {
        if (game && game.hasFlag((game.level.def.liveWaterOff) || 'liveWaterOff')) return;
        g.rotate(it.props.angle || 0.5);
        if (Math.sin(t * 9 + it.tx) > 0.3) {
          G.glow(g, 26, 18, 12, '#9fe8ff', 0.6);
          G.circle(g, 26, 18, 1.2, '#ffffff');
        }
      },
    },

    'ds-smear': {
      name: 'Blood', radius: 4, z: -3, shadow: false, dressing: 'Decor', cache: true, cacheRadius: (it) => (it.props.len || 2) * 16 + 8,
      draw(g, it) {
        const L = (it.props.len || 2) * T;
        g.rotate(it.props.angle || 0);
        const r = U.mulberry32((it.tx * 71 + it.ty * 29) >>> 0);
        g.fillStyle = 'rgba(80,10,10,0.55)';
        g.beginPath();
        g.moveTo(-L / 2, -3);
        for (let x = -L / 2; x <= L / 2; x += 4) g.lineTo(x, -3 - r() * 2);
        for (let x = L / 2; x >= -L / 2; x -= 4) g.lineTo(x, 3 + r() * 2);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(60,6,6,0.45)';
        for (let i = 0; i < 5; i++) {
          g.beginPath();
          g.arc(-L / 2 + r() * L, (r() - 0.5) * 10, 1 + r() * 2.5, 0, U.TAU);
          g.fill();
        }
      },
    },
  };

  LM.definePack({ id: 'ds-lab', items });
})();
