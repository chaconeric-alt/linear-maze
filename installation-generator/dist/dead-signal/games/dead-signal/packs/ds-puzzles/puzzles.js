/* Dead Signal — packs/ds-puzzles/puzzles.js
 * Puzzle pieces (DESIGN.md section 8.3, P2). Floor 1's share:
 *
 *   ds-breaker   a breaker panel on a wall. E throws it: it sets props.flag (once). props.requires: a flag
 *                that has to be set first (props.needText says why not). props.text: the toast when it goes.
 *                It can be shot, too: a broken breaker counts as thrown (props.shootable: false stops that).
 *   ds-keypad    a keypad on a wall. E opens it: type props.code (digits, or the number keys) and Enter.
 *                Right: it sets props.flag and hands over props.loot (loot entries: weapons, armor, items),
 *                then shows props.text. props.hint is printed under the display.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);
  const faceRot = (g, it) => g.rotate(Math.atan2(it.face.y, it.face.x));

  LM.ui.addStyles(`
    .kp { display: grid; gap: 12px; justify-items: center; }
    .kp-display { width: 200px; box-sizing: border-box; padding: 10px 12px; text-align: center; font: 600 26px/1 var(--font-ui); letter-spacing: 0.35em;
      color: #ffb84a; background: #0b0c0e; border: 1px solid #2a2d31; box-shadow: 0 0 18px rgba(255,184,74,0.08) inset; }
    .kp-display.bad { color: #ff5a4a; animation: kpShake 0.3s; }
    .kp-display.good { color: #5fe08a; }
    @keyframes kpShake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
    .kp-grid { display: grid; grid-template-columns: repeat(3, 58px); gap: 6px; }
    .kp-grid button { height: 44px; font: 600 17px/1 var(--font-ui); color: #e8e4dc; background: #24272b; border: 1px solid #3a3e44; cursor: pointer; }
    .kp-grid button:hover { background: #2e3237; }
    .kp-msg { min-height: 1.4em; font: 400 13px/1.4 var(--font-ui); color: var(--muted, #8a8f98); text-align: center; max-width: 320px; }
  `);

  function throwBreaker(it, game, how) {
    if (game.hasFlag(it.props.flag)) return;
    game.setFlag(it.props.flag);
    LM.audio.play('switch');
    game.addShake(0.08);
    game.toast(it.props.text || (how === 'shot' ? 'The breaker bursts in a shower of sparks.' : 'The breaker goes over with a clunk.'), 'good');
  }

  function openKeypad(it, game) {
    const code = String(it.props.code || '0000');
    let entry = '';
    const disp = h('div', { class: 'kp-display' });
    const msg = h('div', { class: 'kp-msg' }, it.props.hint || '');
    const show = () => (disp.textContent = (entry + '····················').slice(0, code.length));
    const press = (k) => {
      disp.classList.remove('bad');
      if (k === 'C') entry = '';
      else if (entry.length < code.length) entry += k;
      LM.audio.play('ui', { vol: 0.6 });
      show();
    };
    const submit = () => {
      if (entry === code) {
        disp.classList.add('good');
        LM.audio.play('key');
        window.removeEventListener('keydown', onKey, true);
        setTimeout(() => {
          LM.ui.close();
          solved(it, game);
        }, 380);
        return;
      }
      disp.classList.remove('bad');
      void disp.offsetWidth;
      disp.classList.add('bad');
      LM.audio.play('locked');
      msg.textContent = entry.length < code.length ? 'The code is ' + code.length + ' digits.' : 'WRONG CODE';
      entry = '';
      show();
    };
    const onKey = (e) => {
      const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
      if (m) press(m[1]);
      else if (e.code === 'Backspace') {
        entry = entry.slice(0, -1);
        show();
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter') submit();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⏎'];
    const grid = h('div', { class: 'kp-grid' }, keys.map((k) => {
      const b = h('button', { type: 'button' }, k);
      b.addEventListener('click', () => (k === '⏎' ? submit() : press(k)));
      return b;
    }));
    show();
    LM.ui.open({
      kicker: it.props.kicker || 'Keypad',
      title: it.props.title || 'Enter the code',
      body: h('div', { class: 'kp' }, disp, grid, msg),
      actions: [{ label: 'Step away', quiet: true }],
      onClose: () => window.removeEventListener('keydown', onKey, true),
    });
    window.addEventListener('keydown', onKey, true);
  }
  function solved(it, game) {
    if (it.props.flag) game.setFlag(it.props.flag);
    const at = { x: it.x + it.face.x * 24, y: it.y + it.face.y * 24 };
    for (const entry of it.props.loot || []) {
      const got = game.grant(entry, at);
      if (got) game.toast(got, 'good');
    }
    if (it.props.text) LM.ui.showText(it.props.title || 'Open', it.props.text, it.props.kicker || 'Keypad');
    else game.toast('The lock releases.', 'good');
  }

  const items = {
    'ds-breaker': {
      name: 'Breaker panel', radius: 7, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: '#e0b25a',
      destructible: {
        hp: 6,
        onBreak(it, game) {
          game.particles.burst(it.x, it.y, 14, { type: 'spark', color: '#ffd27a', speed: 190, life: 0.45 });
          if (it.props.shootable !== false && (!it.props.requires || game.hasFlag(it.props.requires))) throwBreaker(it, game, 'shot');
          // the empty box stays on the wall
          const left = game.spawnItem('ds-breaker', it.tx, it.ty, Object.assign({}, it.props, { face: it.props.face || faceName(it.face), broken: true }));
          if (left) left.hp = 9999;
        },
      },
      interact: {
        available: (it, game) => !it.props.broken && !!it.props.flag && !game.hasFlag(it.props.flag),
        prompt: (it) => it.props.prompt || 'Throw the breaker',
        use(it, game) {
          if (it.props.requires && !game.hasFlag(it.props.requires)) {
            LM.audio.play('locked');
            return game.toast(it.props.needText || 'It won’t move.', 'warn');
          }
          throwBreaker(it, game, 'hand');
        },
      },
      draw(g, it, t, game) {
        faceRot(g, it);
        g.fillStyle = '#16181b';
        g.fillRect(-0.8, -8.8, 5.6, 17.6);
        g.fillStyle = it.props.broken ? '#2a2c2e' : '#6a7178';
        g.fillRect(-0.5, -8.5, 5, 17);
        DS.hazard(g, -0.5, -8.5, 5, 2, 2);
        const on = game && it.props.flag && game.hasFlag(it.props.flag);
        if (it.props.broken) {
          g.fillStyle = '#0a0a0a';
          g.fillRect(0.5, -5, 3, 9);
          return;
        }
        // the lever: down (off) or up (on)
        g.fillStyle = '#1e2125';
        g.fillRect(1.6, -3, 1.6, 7);
        g.fillStyle = '#c9302a';
        g.fillRect(1, on ? -4 : 2.4, 4.6, 2.4);
      },
      drawGlow(g, it, t, game) {
        if (it.props.broken) return;
        faceRot(g, it);
        const on = game && it.props.flag && game.hasFlag(it.props.flag);
        DS.led(g, 2.4, 6.4, on ? '#5fe08a' : '#ff4a3a', on ? 0.6 : 0.4 + 0.3 * Math.sin(t * 4), 0.7);
        if (!on && it.props.flag && game && !game.hasFlag(it.props.flag)) G.glow(g, 3, 0, 14, '#e0b25a', 0.08 + 0.05 * Math.sin(t * 2.5));
      },
    },

    'ds-keypad': {
      name: 'Keypad', radius: 5, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: '#ffb84a',
      interact: {
        available: (it, game) => !(it.props.flag && game.hasFlag(it.props.flag)),
        prompt: (it) => it.props.prompt || 'Use the keypad',
        use: (it, game) => openKeypad(it, game),
      },
      draw(g, it) {
        faceRot(g, it);
        g.fillStyle = '#16181b';
        g.fillRect(-0.8, -5.3, 4.6, 10.6);
        g.fillStyle = '#3a3f45';
        g.fillRect(-0.5, -5, 4, 10);
        g.fillStyle = '#9aa1a8';
        for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) g.fillRect(1 + i * 1.6, -2.6 + j * 1.8, 1, 1.2);
      },
      drawGlow(g, it, t, game) {
        faceRot(g, it);
        const ok = it.props.flag && game && game.hasFlag(it.props.flag);
        g.fillStyle = ok ? 'rgba(95,224,138,0.9)' : 'rgba(255,184,74,0.85)';
        g.fillRect(1.2, -4.4, 2.4, 1.2);
        G.glow(g, 2.4, -3.8, 5, ok ? '#5fe08a' : '#ffb84a', 0.4);
      },
    },
  };
  const faceName = (f) => (f.x > 0 ? 'e' : f.x < 0 ? 'w' : f.y < 0 ? 'n' : 's');

  LM.definePack({ id: 'ds-puzzles', name: 'Puzzles', version: '0.1.0', items });
})();
