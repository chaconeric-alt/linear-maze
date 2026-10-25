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
 *     pause    true: this line stops the game and is read in the middle of the screen; false: never
 *              (left out: as its speaker says)
 *
 *   speakers: {
 *     director: { name: 'Dr. Voss', role: 'Lab director · intercom', color: '#e0b25a',
 *                 face: 'intercom' | 'eye' | 'screen' | 'radio', or portrait(g, size, t) to draw your own,
 *                 voice: 0.8,       // pitch of the typing ticks (1 = default; 0 = silent)
 *                 pause: true }     // what they say matters: it stops the game (see below)
 *   }
 *
 * A conversation that matters: a line whose speaker has `pause` (or the line's own pause: true) stops
 * the game and is shown in the middle of the screen, larger, with Continue (E, Enter, Space or a click:
 * the first finishes the typing) and Skip (Esc: the rest of this conversation, every line still logged
 * and every flag still set). Whatever is queued behind it carries on in the same box, whoever says it
 * (a line with pause: false waits for the game); then the game goes on. In a fight (something hunting you, close), a line plays in the corner as usual
 * unless it says pause: true. The player can turn it off on the pause screen (kept in the browser);
 * LM.comms.talk = false (or true) overrides that, for tests.
 *
 * Trap effect: { type: 'transmission', who, text, glitch, seconds, flag, pause } (plus delay, as every effect).
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
  let queue = [], cur = null, el = null, raf = 0, last = 0, talkEl = null, talkHide = 0;
  C.talk = undefined; // true / false: override the player's choice (tests)

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
    #talk { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; box-sizing: border-box;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.25), rgba(0,0,0,0.55)); transition: opacity 0.22s ease; cursor: pointer; }
    #talk[hidden] { display: none; }
    #talk.out { opacity: 0; pointer-events: none; }
    #talk .talk-panel { width: min(640px, 100%); box-sizing: border-box; display: grid; grid-template-columns: 96px 1fr; gap: 16px; align-items: start;
      padding: 16px 18px 14px 16px; background: rgba(8, 10, 13, 0.95); border: 1px solid rgba(255, 255, 255, 0.09); border-left: 4px solid var(--comms, #e0b25a);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6); cursor: default; }
    #talk.glitch .talk-panel { animation: talkJitter 0.18s steps(2) infinite; }
    @keyframes talkJitter { 0% { transform: translate(0, 0); } 50% { transform: translate(1.5px, -1px); } 100% { transform: translate(-1px, 0.5px); } }
    #talk canvas { width: 96px; height: 96px; display: block; background: #050607; border: 1px solid rgba(255, 255, 255, 0.08); }
    #talk .comms-who { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 6px; font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: var(--comms, #e0b25a); }
    #talk .comms-who span { font-weight: 500; letter-spacing: 0.06em; color: var(--muted, #8a8f98); text-transform: none; }
    #talk .comms-text { font: 400 18px/1.5 var(--font-lore, Georgia, serif); color: #efebe3; min-height: 3em; white-space: pre-wrap; }
    #talk .talk-foot { display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-top: 12px; }
    #talk .talk-foot .talk-more { margin-right: auto; font: 500 11px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted, #8a8f98); }
    #talk .talk-foot button { display: inline-flex; gap: 7px; align-items: center; padding: 7px 12px; font: 600 12.5px/1 var(--font-ui); color: #e8e4dc;
      background: #1c1f23; border: 1px solid #3a3e44; border-radius: 3px; cursor: pointer; }
    #talk .talk-foot button.primary { background: var(--comms, #e0b25a); color: #141210; border-color: transparent; }
    #talk .talk-foot kbd { font: 600 10px/1 var(--font-ui); padding: 2px 4px; border-radius: 2px; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.15); }
    @media (max-width: 560px) { #talk .talk-panel { grid-template-columns: 1fr; } #talk canvas { width: 64px; height: 64px; } #talk .comms-text { font-size: 16px; } }
  `);

  /** The speaker for a line: a registry entry, an object given inline, or a plain name. */
  C.speaker = function (who) {
    if (who && typeof who === 'object') return who;
    return (who && LM.find('speakers', who)) || { name: who || 'Unknown', color: '#9aa3ad', face: 'intercom' };
  };

  // ------------------------------------------------------------ a conversation that stops the game
  const PREF = 'lm-talk-pauses';
  /** Does the player want important lines to stop the game? (On unless they turned it off.) */
  C.pauses = function () {
    if (C.talk === true || C.talk === false) return C.talk;
    try {
      return localStorage.getItem(PREF) !== 'off';
    } catch (e) {
      return true;
    }
  };
  C.setPauses = function (on) {
    try {
      localStorage.setItem(PREF, on ? 'on' : 'off');
    } catch (e) {}
  };
  /** Does any speaker in this game stop the game? (The pause screen offers the choice only then.) */
  C.anyPause = () => Object.values(LM.registry.speakers || {}).some((sp) => sp && sp.pause);
  /** Something is hunting you, close: a fight, where a line doesn't stop the game. */
  C.inFight = function (game) {
    const P = game && game.player;
    if (!P || P.dead) return false;
    const FA = LM.factions;
    for (const e of game.enemies || []) {
      if (e.dead || !e.aggro || (e.spawning || 0) > 0) continue;
      if (FA && !FA.hostile(e.faction, 'player')) continue;
      const d = U.dist(e.x, e.y, P.x, P.y);
      if (d < 200 || (d < 420 && e.pSee)) return true;
    }
    return false;
  };
  const forced = (p) => p === true || p === 'always' || p === 'yes';
  const never = (p) => p === false || p === 'never' || p === 'no';
  /** Does this line stop the game? (continuing: a conversation is on screen, and whatever is queued
   *  behind it, whoever says it, carries on in the same box unless it says pause: false.) */
  function stops(spec, game, continuing) {
    if (!C.pauses() || never(spec.pause)) return false;
    if (continuing) return true;
    const sp = C.speaker(spec.who);
    if (!forced(spec.pause) && !sp.pause) return false;
    if (!game || game.attract || game.state !== 'play') return false;
    return forced(spec.pause) || !C.inFight(game);
  }
  function buildTalk() {
    if (talkEl && talkEl.isConnected) return talkEl;
    const root = document.getElementById('app') || document.body;
    const canvas = h('canvas', { width: 192, height: 192 });
    const who = h('div', { class: 'comms-who' });
    const text = h('div', { class: 'comms-text' });
    const more = h('span', { class: 'talk-more' });
    const skip = h('button', { type: 'button', class: 'talk-skip' }, h('span', null, 'Skip'), h('kbd', null, 'Esc'));
    const next = h('button', { type: 'button', class: 'primary talk-next' }, h('span', null, 'Continue'), h('kbd', null, 'E'));
    const panel = h('div', { class: 'talk-panel', role: 'dialog', 'aria-live': 'polite' }, canvas, h('div', null, who, text, h('div', { class: 'talk-foot' }, more, skip, next)));
    talkEl = h('div', { id: 'talk', hidden: true }, panel);
    talkEl._c = canvas;
    talkEl._who = who;
    talkEl._text = text;
    talkEl._more = more;
    talkEl._next = next;
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      C.skip();
    });
    next.addEventListener('click', (e) => {
      e.stopPropagation();
      C.next();
    });
    panel.addEventListener('click', (e) => e.stopPropagation());
    talkEl.addEventListener('click', () => C.next());
    // over the game and the HUD, under the pop-ups and the title screen
    const modal = document.getElementById('modal');
    if (modal && modal.parentNode === root) root.insertBefore(talkEl, modal);
    else root.appendChild(talkEl);
    return talkEl;
  }
  /** The conversation on screen: true while a line is stopping the game. */
  C.talking = () => !!(cur && cur.talk);
  /** Continue: finish typing the line, or go on to the next. */
  C.next = function () {
    if (!cur || !cur.talk) return;
    if (cur.typed < cur.text.length) {
      cur.typed = cur.text.length;
      return;
    }
    LM.audio.play('ui', { vol: 0.5 });
    endLine();
    const game = LM.game;
    if (queue.length && stops(queue[0], game, true)) show(queue.shift(), true);
    else closeTalk();
  };
  /** Skip: the rest of this conversation, still logged and with every flag set. */
  C.skip = function () {
    if (!cur || !cur.talk) return;
    LM.audio.play('ui', { vol: 0.5 });
    endLine();
    const game = LM.game;
    while (queue.length && stops(queue[0], game, true)) {
      const spec = queue.shift();
      logLine(spec, C.speaker(spec.who));
      if (spec.flag && game && game.setFlag) game.setFlag(spec.flag);
    }
    closeTalk();
  };
  function endLine() {
    const game = LM.game;
    if (cur && !cur.done) {
      cur.done = true;
      if (cur.spec.flag && game && game.setFlag) game.setFlag(cur.spec.flag);
    }
  }
  function closeTalk() {
    const game = LM.game;
    cur = null;
    if (game && game.state === 'talk') game.state = 'play';
    if (LM.input) {
      LM.input.mouse.down = false;
      LM.input.mouse.clicked = false;
    }
    if (talkEl) {
      talkEl.classList.add('out');
      clearTimeout(talkHide);
      talkHide = setTimeout(() => {
        if (!(cur && cur.talk)) talkEl.hidden = true;
      }, 230);
    }
    if (queue.length && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  // keys while a conversation is up: E, Enter, Space go on; Esc skips. The game doesn't see them.
  window.addEventListener('keydown', (e) => {
    if (!cur || !cur.talk) return;
    const go = e.code === 'KeyE' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space';
    if (!go && e.code !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat) return;
    if (go) C.next();
    else C.skip();
    if (LM.input && LM.input.pressed) LM.input.pressed.delete(e.code);
  }, true);

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
    const talked = cur && cur.talk;
    cur = null;
    if (el) {
      el.hidden = true;
      el.classList.remove('out', 'glitch');
    }
    if (talkEl) talkEl.hidden = true;
    if (talked && LM.game && LM.game.state === 'talk') LM.game.state = 'play';
  };
  C.busy = () => !!cur || queue.length > 0;
  /** The speaker id of the line on screen now (null when nobody is talking, or the line named its speaker inline). */
  C.speaking = () => (cur && typeof cur.spec.who === 'string' ? cur.spec.who : null);

  const GLYPHS = '#%&@$*+=?!/\\<>[]{}~^01';
  function logLine(spec, sp) {
    C.log.push({ who: sp.name || '', id: typeof spec.who === 'string' ? spec.who : null, color: sp.color, text: String(spec.text), glitch: !!spec.glitch, at: Date.now() });
    if (C.log.length > 40) C.log.shift();
  }
  /** Put a line up: in the corner, or (talk) in the middle with the game stopped. */
  function show(spec, talk) {
    const sp = C.speaker(spec.who);
    const game = LM.game;
    let e;
    if (talk) {
      e = buildTalk();
      clearTimeout(talkHide);
      if (el) el.hidden = true;
      if (game && game.state === 'play') game.state = 'talk';
      e._more.textContent = '';
    } else e = build();
    e.style.setProperty('--comms', sp.color || '#e0b25a');
    e._who.replaceChildren(document.createTextNode(sp.name || ''), sp.role ? h('span', null, sp.role) : '');
    e._text.textContent = '';
    e.classList.toggle('glitch', !!spec.glitch);
    e.classList.remove('out');
    e.hidden = false;
    const text = String(spec.text);
    const hold = spec.seconds != null ? +spec.seconds : 1.2 + text.length / 40;
    cur = { spec, sp, text, t: 0, typed: 0, hold, done: false, out: 0, seed: (Math.random() * 1e9) | 0, talk: !!talk, box: e };
    LM.audio.play('commsOn', { vol: 0.7 });
    logLine(spec, sp);
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
    const box = cur.box || el;
    if (box._text.textContent !== s) box._text.textContent = s;
    if (cur.talk) {
      const more = queue.length && stops(queue[0], LM.game, true);
      const label = n < cur.text.length ? '' : more ? 'More ▸' : '';
      if (box._more.textContent !== label) box._more.textContent = label;
      const nl = more || n < cur.text.length ? 'Continue' : 'Close';
      const sp = box._next.firstChild;
      if (sp.textContent !== nl) sp.textContent = nl;
    }
  }

  function drawFace(t) {
    const cv = (cur.box || el)._c, g = cv.getContext('2d');
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
    if (!cur && queue.length && running) {
      const spec = queue.shift();
      show(spec, stops(spec, game, false));
    }
    if (cur && cur.talk) {
      // a conversation: it types, then waits for Continue; the game is stopped meanwhile
      if (game && game.state === 'talk' && !(LM.ui && LM.ui.modalOpen)) {
        const before = Math.floor(cur.typed);
        if (cur.typed < cur.text.length) {
          cur.typed = Math.min(cur.text.length, cur.typed + dt * CPS * (cur.spec.glitch ? 0.8 : 1));
          const v = cur.sp.voice == null ? 1 : +cur.sp.voice;
          if (v > 0 && Math.floor(cur.typed / 3) !== Math.floor(before / 3)) LM.audio.play('commsTick', { vol: 0.5, pitch: v, throttle: 0.03 });
        }
      } else if (game && game.state !== 'talk' && game.state !== 'popup') {
        // the game moved on without us (a new run, the title, another floor): let it go
        const flag = cur.spec.flag;
        cur = null;
        if (talkEl) talkEl.hidden = true;
        if (flag && game.setFlag && game.player) game.setFlag(flag);
      }
      if (cur) {
        render(now);
        drawFace(now / 1000);
      }
    } else if (cur) {
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
        params: { who: 'id:speakers', text: 'longtext', glitch: 'bool', seconds: 'number', flag: 'text', pause: ['always', 'never'] },
        run(game, ef) {
          C.say({ who: ef.who, text: ef.text, glitch: ef.glitch, seconds: ef.seconds, flag: ef.flag, pause: ef.pause });
        },
      },
      // (the game's own flow, here with the other story effects)
      checkpoint: {
        params: { text: 'text' },
        run(game, ef) {
          // after whatever's being said has been said, so a line queued with it isn't lost on a retry
          game.checkpointHere(ef.text === '' ? false : ef.text);
        },
      },
      ending: {
        params: { kicker: 'text', title: 'text', text: 'longtext', tone: ['bad', 'good', 'chapter'], stats: 'bool', final: 'bool', flag: 'text', actions: 'json' },
        run(game, ef) {
          // wait for a line that stops the game to be read first
          const go = () => (C.talking && C.talking() ? game.schedule(0.3, go, true) : game.ending(ef));
          go();
        },
      },
    },
  });
})();
