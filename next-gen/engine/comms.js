/* The Linear Maze engine — engine/comms.js
 * Transmissions: someone speaking to the player over an intercom, a radio or a screen, while the
 * game keeps running. A line types itself out in a panel at the bottom of the screen with the
 * speaker's name and a small portrait, waits long enough to be read, and gives way to the next.
 *
 *   LM.comms.say({ who: 'director', text: 'Get to the stairs.', glitch: false, seconds: 4, flag: 'heardHim' })
 *     who      a speaker id (the `speakers` registry), or { name, role, color, face } given here
 *     text     the line; blank lines start a new paragraph
 *     glitch   the line comes through broken: letters scramble as it types, the panel jitters
 *     seconds  how long it stays once typed (default: enough to read it)
 *     flag     a story flag to set when the line has been shown (so a trap can wait for it)
 *
 *   speakers: {
 *     director: { name: 'Dr. Voss', role: 'Lab director · intercom', color: '#e0b25a',
 *                 face: 'intercom' | 'eye' | 'screen' | 'radio', or portrait(g, size, t) to draw your own,
 *                 voice: 0.8 }      // pitch of the typing ticks (1 = default; 0 = silent)
 *   }
 *
 * Trap effect: { type: 'transmission', who, text, glitch, seconds, flag } (plus delay, as every effect).
 * The lines heard so far are in LM.comms.log (newest last); the pause screen lists the last few.
 * LM.comms.busy() is true while a line is up or waiting; LM.comms.speaking() is the id of who is talking.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const C = (LM.comms = {});
  const h = (...a) => LM.ui.h(...a);
  const CPS = 52; // characters typed a second
  C.log = [];
  let queue = [], cur = null, el = null, raf = 0, last = 0;

  LM.ui.addStyles(`
    #comms { position: absolute; left: 50%; bottom: calc(var(--gap, 18px) + 4px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);
      width: min(520px, calc(100vw - 2 * var(--gap, 18px))); box-sizing: border-box; display: grid; grid-template-columns: 54px 1fr; gap: 12px; align-items: start;
      padding: 10px 14px 11px 10px; background: rgba(8, 10, 13, 0.86); border: 1px solid rgba(255, 255, 255, 0.08); border-left: 3px solid var(--comms, #e0b25a);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease; }
    #comms[hidden] { display: none; }
    #comms.out { opacity: 0; transform: translate(-50%, 6px); }
    #comms.glitch { animation: commsJitter 0.18s steps(2) infinite; }
    @keyframes commsJitter { 0% { transform: translate(-50%, 0); } 50% { transform: translate(calc(-50% + 1.5px), -1px); } 100% { transform: translate(calc(-50% - 1px), 0.5px); } }
    #comms canvas { width: 54px; height: 54px; display: block; background: #050607; border: 1px solid rgba(255, 255, 255, 0.07); }
    #comms .comms-who { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; font: 700 11px/1.2 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--comms, #e0b25a); }
    #comms .comms-who span { font-weight: 500; letter-spacing: 0.06em; color: var(--muted, #8a8f98); text-transform: none; }
    #comms .comms-text { font: 400 15px/1.45 var(--font-lore, Georgia, serif); color: #e8e4dc; min-height: 1.45em; white-space: pre-wrap; }
    #comms .comms-text i { font-style: normal; opacity: 0.55; }
    @media (max-width: 900px) { #comms { bottom: calc(118px + env(safe-area-inset-bottom, 0px)); } }
    .comms-log { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; max-height: 40vh; overflow: auto; }
    .comms-log li { font: 400 13px/1.45 var(--font-ui); padding-left: 10px; border-left: 2px solid var(--line, rgba(255,255,255,0.2)); }
    .comms-log b { display: block; font: 700 10.5px/1.3 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; }
  `);

  /** The speaker for a line: a registry entry, an object given inline, or a plain name. */
  C.speaker = function (who) {
    if (who && typeof who === 'object') return who;
    return (who && LM.find('speakers', who)) || { name: who || 'Unknown', color: '#9aa3ad', face: 'intercom' };
  };

  function build() {
    if (el && el.isConnected) return el;
    const hud = document.getElementById('hud') || document.body;
    const canvas = h('canvas', { width: 108, height: 108 });
    const who = h('div', { class: 'comms-who' });
    const text = h('div', { class: 'comms-text' });
    el = h('div', { id: 'comms', hidden: true, role: 'status', 'aria-live': 'polite' }, canvas, h('div', null, who, text));
    el._c = canvas;
    el._who = who;
    el._text = text;
    hud.appendChild(el);
    return el;
  }

  /** Queue a line. Returns nothing; the line plays when the ones before it are done. */
  C.say = function (spec) {
    if (typeof spec === 'string') spec = { text: spec };
    if (!spec || !spec.text) return;
    queue.push(Object.assign({}, spec));
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  /** Drop everything queued and hide the panel (a new run, the title screen, trying a floor again). */
  C.clear = function () {
    queue = [];
    cur = null;
    if (el) {
      el.hidden = true;
      el.classList.remove('out', 'glitch');
    }
  };
  C.busy = () => !!cur || queue.length > 0;
  /** The speaker id of the line on screen now (null when nobody is talking, or the line named its speaker inline). */
  C.speaking = () => (cur && typeof cur.spec.who === 'string' ? cur.spec.who : null);

  const GLYPHS = '#%&@$*+=?!/\\<>[]{}~^01';
  function show(spec) {
    const sp = C.speaker(spec.who);
    const e = build();
    e.style.setProperty('--comms', sp.color || '#e0b25a');
    e._who.replaceChildren(document.createTextNode(sp.name || ''), sp.role ? h('span', null, sp.role) : '');
    e._text.textContent = '';
    e.classList.toggle('glitch', !!spec.glitch);
    e.classList.remove('out');
    e.hidden = false;
    const text = String(spec.text);
    const hold = spec.seconds != null ? +spec.seconds : 1.2 + text.length / 40;
    cur = { spec, sp, text, t: 0, typed: 0, hold, done: false, out: 0, seed: (Math.random() * 1e9) | 0 };
    LM.audio.play('commsOn', { vol: 0.7 });
    C.log.push({ who: sp.name || '', id: typeof spec.who === 'string' ? spec.who : null, color: sp.color, text, glitch: !!spec.glitch, at: Date.now() });
    if (C.log.length > 40) C.log.shift();
  }

  /** The text as typed so far; a glitching line scrambles a few letters near the cursor. */
  function render(now) {
    const n = Math.floor(cur.typed);
    let s = cur.text.slice(0, n);
    if (cur.spec.glitch) {
      const r = U.mulberry32((cur.seed + Math.floor(now / 70)) >>> 0);
      const a = s.split('');
      const span = n < cur.text.length ? 6 : 2;
      for (let i = Math.max(0, a.length - span); i < a.length; i++) if (a[i] !== ' ' && a[i] !== '\n' && r() < 0.5) a[i] = GLYPHS[Math.floor(r() * GLYPHS.length)];
      // a finished line still drops out now and then
      if (n >= cur.text.length && r() < 0.18) {
        const k = Math.floor(r() * a.length);
        for (let i = k; i < Math.min(a.length, k + 3); i++) if (a[i] !== ' ') a[i] = GLYPHS[Math.floor(r() * GLYPHS.length)];
      }
      s = a.join('');
    }
    if (el._text.textContent !== s) el._text.textContent = s;
  }

  function drawFace(t) {
    const cv = el._c, g = cv.getContext('2d');
    const S = cv.width;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, S, S);
    const sp = cur.sp, col = sp.color || '#e0b25a';
    const talking = cur.typed < cur.text.length;
    if (typeof sp.portrait === 'function') {
      try {
        sp.portrait(g, S, t, talking);
      } catch (e) {}
      return;
    }
    const face = sp.face || 'intercom';
    const cx = S / 2, cy = S / 2;
    const pulse = talking ? 0.55 + 0.45 * Math.abs(Math.sin(t * 17) * Math.sin(t * 5.3)) : 0.25;
    if (face === 'eye') {
      // a lens: rings and an iris that widens as it speaks
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = U.rgba(col, 0.18 + i * 0.12);
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, S * 0.42 - i * 9, 0, U.TAU);
        g.stroke();
      }
      const r = S * (0.1 + 0.08 * pulse);
      const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
      grd.addColorStop(0, U.rgba(col, 0.95));
      grd.addColorStop(0.4, U.rgba(col, 0.5));
      grd.addColorStop(1, U.rgba(col, 0));
      g.fillStyle = grd;
      g.beginPath();
      g.arc(cx, cy, r * 2.4, 0, U.TAU);
      g.fill();
      g.fillStyle = '#f4fbff';
      g.beginPath();
      g.arc(cx, cy, r * 0.45, 0, U.TAU);
      g.fill();
    } else if (face === 'screen') {
      g.fillStyle = U.rgba(col, 0.12);
      g.fillRect(10, 14, S - 20, S - 28);
      g.fillStyle = U.rgba(col, 0.75);
      const rows = 6;
      for (let i = 0; i < rows; i++) {
        const w = (S - 34) * (0.35 + 0.65 * Math.abs(Math.sin(i * 2.1 + Math.floor(t * (talking ? 9 : 1)))));
        g.fillRect(17, 22 + i * 11, w, 4);
      }
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = 14; y < S - 14; y += 3) g.fillRect(10, y, S - 20, 1);
    } else {
      // an intercom grille, its slots lit by the voice
      g.fillStyle = '#16181b';
      g.fillRect(12, 12, S - 24, S - 24);
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.strokeRect(12.5, 12.5, S - 25, S - 25);
      const bars = 7;
      for (let i = 0; i < bars; i++) {
        const k = talking ? 0.35 + 0.65 * Math.abs(Math.sin(t * (9 + i * 1.7) + i)) : 0.2;
        const w = (S - 44) * (face === 'radio' ? k : 0.4 + 0.6 * k);
        g.fillStyle = '#060708';
        g.fillRect(22, 22 + i * 10, S - 44, 4);
        g.fillStyle = U.rgba(col, 0.25 + 0.65 * k * pulse);
        g.fillRect(cx - w / 2, 22 + i * 10, w, 4);
      }
      g.fillStyle = talking ? col : U.rgba(col, 0.4);
      g.beginPath();
      g.arc(S - 20, S - 20, 3, 0, U.TAU);
      g.fill();
    }
  }

  function tick(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const game = LM.game;
    // paused, in a pop-up, between floors or on the title screen: the line waits
    const running = game && !game.attract && (game.state === 'play' || game.state === 'dying') && !(LM.ui && LM.ui.modalOpen);
    if (game && game.attract) C.clear();
    if (!cur && queue.length && running) show(queue.shift());
    if (cur) {
      if (running) {
        const before = Math.floor(cur.typed);
        if (cur.typed < cur.text.length) {
          cur.typed = Math.min(cur.text.length, cur.typed + dt * CPS * (cur.spec.glitch ? 0.8 : 1));
          const v = cur.sp.voice == null ? 1 : +cur.sp.voice;
          if (v > 0 && Math.floor(cur.typed / 3) !== Math.floor(before / 3)) LM.audio.play('commsTick', { vol: 0.5, pitch: v, throttle: 0.03 });
        } else if (!cur.done) {
          // lines waiting behind this one: move along sooner
          cur.t += dt * (queue.length ? 1.6 : 1);
          if (cur.t >= cur.hold) {
            cur.done = true;
            el.classList.add('out');
            if (cur.spec.flag && game && game.setFlag) game.setFlag(cur.spec.flag);
          }
        } else {
          cur.out += dt;
          if (cur.out > 0.3) {
            el.hidden = true;
            el.classList.remove('glitch');
            cur = null;
          }
        }
      }
      if (cur) {
        render(now);
        drawFace(now / 1000);
      }
    }
    if (cur || queue.length) raf = requestAnimationFrame(tick);
  }

  /** The last few lines heard, for the pause screen. */
  C.logView = function (n) {
    const list = C.log.slice(-(n || 6));
    if (!list.length) return null;
    return h('ul', { class: 'comms-log' }, list.map((l) => h('li', { style: 'border-left-color:' + (l.color || '') }, h('b', { style: 'color:' + (l.color || '') }, l.who), l.text)));
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('commsOn', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 2400, dur: 0.12, gain: 0.07, q: 1.5 });
      kit.tone(t, o, { type: 'square', f0: 1800, f1: 1400, dur: 0.05, gain: 0.025 });
    });
    LM.audio.define('commsTick', (t, o, opt, kit) => {
      const p = (opt && opt.pitch) || 1;
      kit.tone(t, o, { type: 'square', f0: 260 * p + Math.random() * 60 * p, dur: 0.025, gain: 0.012 });
    });
  }

  LM.definePack({
    id: 'comms',
    name: 'Transmissions',
    version: LM.VERSION,
    effects: {
      transmission: {
        // the editor builds the trap form from params
        params: { who: 'id:speakers', text: 'longtext', glitch: 'bool', seconds: 'number', flag: 'text' },
        run(game, ef) {
          C.say({ who: ef.who, text: ef.text, glitch: ef.glitch, seconds: ef.seconds, flag: ef.flag });
        },
      },
    },
  });
})();
