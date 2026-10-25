/* Dead Signal — packs/ds-story/executive.js
 * Floor 5's story pieces (the executive floor and its upper level, 5a: DESIGN.md 4.5).
 *   speakers  concierge (the board's reception android: a recorded courtesy)
 *   items     ds-brass-key (a board member's office key: props.name, flag, color, text; you carry it, and
 *             its flag opens that office's door), ds-secret-bookcase (the Director's reading list: pick his
 *             book and the case beside it swings open: props.books, answer, flag, wrongSpawn (a tag), wrong
 *             (an enemy id)), ds-mainframe-console (the Control Room's console: shut the mainframe down
 *             (choseObey) or give the elevators power (chosePower); traps on those flags run what follows)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {});
  const h = (...a) => LM.ui.h(...a);
  const BRASS = '#c9a046';

  // the Concierge's portrait: a porcelain face, painted, a red light behind the eyes
  function porcelain(g, S, t, talking) {
    g.fillStyle = '#0c0b0a';
    g.fillRect(0, 0, S, S);
    const cx = S / 2, cy = S * 0.47;
    g.fillStyle = '#0e0e10';
    g.beginPath();
    g.ellipse(cx, S, S * 0.4, S * 0.22, 0, Math.PI, U.TAU);
    g.fill();
    g.fillStyle = '#efe8da';
    g.beginPath();
    g.moveTo(cx - S * 0.05, S * 0.82);
    g.lineTo(cx, S * 0.9);
    g.lineTo(cx + S * 0.05, S * 0.82);
    g.fill();
    g.fillStyle = '#f4efe6';
    g.beginPath();
    g.ellipse(cx, cy, S * 0.2, S * 0.26, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath();
    g.ellipse(cx, cy - S * 0.12, S * 0.21, S * 0.16, 0, Math.PI, U.TAU);
    g.fill();
    for (const s of [-1, 1]) {
      g.fillStyle = '#ff3a2a';
      g.beginPath();
      g.ellipse(cx + s * S * 0.075, cy, S * 0.03, S * 0.016, 0, 0, U.TAU);
      g.fill();
    }
    // a painted smile that never moves; a speaker grille under it that does
    g.strokeStyle = '#a04050';
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx, cy + S * 0.05, S * 0.08, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
    const k = talking ? 0.5 + 0.5 * Math.abs(Math.sin(t * 14)) : 0.15;
    g.fillStyle = 'rgba(40,30,30,' + (0.3 + 0.5 * k) + ')';
    for (let i = -2; i <= 2; i++) g.fillRect(cx + i * S * 0.025 - 1, cy + S * 0.15, 2, S * 0.03);
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < S; y += 3) g.fillRect(0, y, S, 1);
  }
  const speakers = {
    concierge: { name: 'The Concierge', role: 'Executive reception · recorded courtesy', color: '#f4efe6', portrait: porcelain, voice: 1.3 },
  };

  // ------------------------------------------------------------ the Control Room's choice
  function consolePanel(it, game) {
    const status = [
      ['CORE (ARIADNE)', game.hasFlag('chosePower') ? 'ISOLATED · LABRYS · CAR DESCENDING' : 'ISOLATED · LABRYS'],
      ['ELEVATOR BUS', game.hasFlag('elevatorsOnline') ? 'LIVE' : 'OFF'],
      ['EXTERNAL LINES', 'SEVERED'],
      ['CONTAINMENT', 'OPEN · ALL FLOORS'],
      ['BOARDROOM', 'SEALED · OCCUPIED (6)'],
    ];
    const rows = h('div', { class: 'ds-screen' }, status.map(([k, v]) => k.padEnd(18, ' ') + v).join('\n'));
    if (game.hasFlag('choseObey') || game.hasFlag('chosePower')) {
      LM.ui.open({ kicker: 'Mainframe control', title: 'The console', body: h('div', null, rows, h('p', { class: 'muted' }, game.hasFlag('chosePower') ? 'The elevator bus is live. The private car is on its way up for you.' : '')), actions: [{ label: 'Close', primary: true }] });
      return;
    }
    if (!game.hasFlag('inControl')) {
      LM.ui.open({ kicker: 'Mainframe control', title: 'The console', body: h('div', null, rows, h('p', { class: 'muted' }, 'Two commands are lit, side by side. One isolates and purges the core. The other puts power back on the elevator bus.')), actions: [{ label: 'Step back', primary: true }] });
      return;
    }
    LM.ui.open({
      kicker: 'Mainframe control · Asterion Biologics',
      title: 'What do you do?',
      body: h('div', null, rows,
        h('p', { class: 'lore' }, 'PURGE CORE: the Director’s command, keyed and waiting. It shuts down the mainframe in the sub-level for good.'),
        h('p', { class: 'lore' }, 'ELEVATOR BUS: power to every car in the building. The private car goes to one place: the sub-level, where the mainframe is.')),
      actions: [
        { label: 'Purge the core (do as Voss says)', onClick: () => setTimeout(() => confirmObey(game), 0) },
        { label: 'Restore elevator power (go down to ARIADNE)', primary: true, onClick: () => setTimeout(() => game.setFlag('chosePower'), 0) },
        { label: 'Not yet', quiet: true },
      ],
      dismissable: true,
    });
  }
  function confirmObey(game) {
    LM.ui.open({
      kicker: 'Mainframe control',
      title: 'Purge the core?',
      body: h('div', null, h('div', { class: 'ds-screen' }, 'ISOLATE AND PURGE CORE 01 (ARIADNE)\nAUTH: VOSS.A · KEYED\nTHIS CANNOT BE UNDONE.')),
      actions: [
        { label: 'Purge it', onClick: () => setTimeout(() => game.setFlag('choseObey'), 0) },
        { label: 'No', primary: true },
      ],
    });
  }

  // ------------------------------------------------------------ the Director's reading list
  function bookcase(it, game) {
    const p = it.props;
    const books = p.books || ['The House of Asterion', 'Meditations', 'The Prince', 'A Treatise on Pain'];
    LM.ui.open({
      kicker: p.kicker || 'The Director’s shelf',
      title: p.title || 'His reading list',
      body: h('div', null, h('p', { class: 'lore' }, p.text || 'One shelf of the case is his alone: the same few books, the spines broken from use. One of them is set a little forward of the others, as if it’s taken out more often. Which one does he read?')),
      actions: books.map((b) => ({ label: b, onClick: () => setTimeout(() => pick(b), 0) })).concat([{ label: 'Leave them', quiet: true }]),
    });
    function pick(b) {
      if (b === (p.answer || books[0])) {
        LM.audio.play('key');
        game.toast(p.right || 'The book tilts out on a hinge. Somewhere behind the case, a latch.', 'good');
        if (p.flag) game.setFlag(p.flag);
        it.solved = true;
        return;
      }
      LM.audio.play('locked');
      game.toast(p.wrongText || 'Just a book. Behind you, something clears its throat.', 'warn');
      // the wrong one: something comes to see who's at his shelf
      const pts = p.wrongSpawn && game.level.tags[p.wrongSpawn];
      if (pts && pts.length && !it.wrongOnce) {
        it.wrongOnce = true;
        const q = pts[Math.floor(Math.random() * pts.length)];
        game.spawnEnemy(p.wrong || 'ds-usher', q.x * T + T / 2, q.y * T + T / 2, { summoned: true, aggro: true });
      }
    }
  }

  const items = {
    'ds-brass-key': {
      name: 'A key', radius: 6, mapColor: BRASS, dressing: false,
      interact: {
        prompt: (it) => it.props.prompt || 'Take the key',
        use(it, game) {
          it.remove(game);
          const name = it.props.name || 'Office key';
          game.giveKeyItem(it.props.key || it.props.flag || 'officeKey', { name, text: it.props.desc || '', color: it.props.color || BRASS, flag: it.props.flag });
          LM.audio.play('key');
          if (it.props.text) LM.ui.showText(it.props.title || name, it.props.text, 'You took: ' + name);
          else game.toast('You took ' + name.charAt(0).toLowerCase() + name.slice(1) + '.', 'key');
        },
      },
      draw(g, it) {
        g.rotate(0.6);
        g.strokeStyle = BRASS;
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(-4, 0, 3, 0, U.TAU);
        g.stroke();
        g.fillStyle = BRASS;
        g.fillRect(-1, -0.9, 9, 1.8);
        g.fillRect(5, 0.5, 1.4, 3);
        g.fillRect(7, 0.5, 1.4, 2.2);
        g.fillStyle = it.props.color || '#7a1418';
        g.beginPath();
        g.arc(-4, 0, 1.2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 13, BRASS, 0.35 + 0.15 * Math.sin(t * 3));
      },
    },
    'ds-secret-bookcase': {
      name: 'The Director’s shelf', radius: 12, solid: 'rect', dressing: false, mapColor: '#c9a046',
      init(it) {
        it.box = [T - 2, 12];
        it.y = it.ty * T + T - 7;
      },
      interact: {
        available: (it, game) => !(it.props.flag && game.hasFlag(it.props.flag)),
        prompt: () => 'Look at his books',
        use: (it, game) => bookcase(it, game),
      },
      draw(g, it) {
        g.fillStyle = '#1a0e08';
        g.fillRect(-15, -6, 30, 12);
        g.fillStyle = '#2a170e';
        g.fillRect(-14, -5, 28, 10);
        const cols = ['#5a1a16', '#1f4a3a', '#3a2a5a', '#6a5a2a'];
        for (let i = 0; i < 8; i++) {
          g.fillStyle = cols[i % 4];
          g.fillRect(-13 + i * 3.3, -4 + (i === 3 ? -1.4 : 0), 2.8, 8);
        }
        g.fillStyle = BRASS;
        g.fillRect(-15, 5, 30, 0.8);
      },
      drawGlow(g, it, t, game) {
        if (game && it.props.flag && game.hasFlag(it.props.flag)) return;
        G.glow(g, -13 + 3 * 3.3 + 1.4, -1.4, 6, '#ffd28a', 0.15 + 0.1 * Math.sin(t * 2));
      },
    },
    'ds-mainframe-console': {
      name: 'Mainframe control', radius: 16, solid: 'rect', dressing: false, mapColor: '#ff3a2a', mapAlways: true,
      init(it) {
        it.box = [60, 30];
        it.x = it.tx * T + T / 2;
      },
      interact: {
        prompt: (it, game) => (game.hasFlag('chosePower') || game.hasFlag('choseObey') ? 'Look at the console' : 'Use the console'),
        use: (it, game) => consolePanel(it, game),
      },
      draw(g, it, t, game) {
        g.scale(1.36, 1.36);
        // a ring inlaid in the floor round it
        g.strokeStyle = 'rgba(201,160,70,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(0, 0, 34, 22, 0, 0, U.TAU);
        g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(-21, -9, 44, 22);
        g.fillStyle = '#121314';
        g.fillRect(-23, -12, 46, 22);
        g.fillStyle = '#2a2c2e';
        g.fillRect(-22, -11, 44, 20);
        // two keyed switches under glass, red and amber
        for (const [x, c] of [[-10, '#7a1418'], [10, '#6a4a10']]) {
          g.fillStyle = '#0a0a0a';
          g.fillRect(x - 7, -2, 14, 9);
          g.fillStyle = c;
          g.fillRect(x - 5, 0, 10, 5);
          g.fillStyle = 'rgba(220,240,255,0.18)';
          g.fillRect(x - 6, -1, 12, 1);
        }
        g.fillStyle = '#081210';
        g.fillRect(-20, -10, 40, 6);
      },
      drawGlow(g, it, t, game) {
        g.scale(1.36, 1.36);
        const obey = game && game.hasFlag('choseObey'), power = game && game.hasFlag('chosePower');
        G.glow(g, -10, 2.5, 14, '#ff3a2a', obey ? 0.9 : 0.35 + 0.15 * Math.sin(t * 3));
        G.glow(g, 10, 2.5, 14, '#ffb040', power ? 0.95 : 0.35 + 0.15 * Math.sin(t * 3 + 1.5));
        g.fillStyle = obey ? 'rgba(255,58,42,0.6)' : 'rgba(127,212,255,0.5)';
        for (let i = 0; i < 6; i++) g.fillRect(-19 + i * 6.4, -9 + (i % 2), 4 + 1.5 * Math.sin(t * 3 + i), 0.8);
        G.glow(g, 0, -7, 20, obey ? '#ff3a2a' : '#7fd4ff', 0.25);
      },
    },
  };

  LM.definePack({ id: 'ds-story', speakers, items });
})();
