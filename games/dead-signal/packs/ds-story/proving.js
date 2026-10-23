/* Dead Signal — packs/ds-story/proving.js
 * Floor 4's story pieces (the Proving Grounds: DESIGN.md section 4.4).
 *   speakers  trial (the Proving Grounds' announcer: a recording, a game-show voice that never stops
 *             smiling, run by the trial system whoever is listening)
 *   items     ds-survivor (a contestant who made it to the Box, sitting with their knees up: talk to
 *             them; props.text is what they say, props.flag is set when they've said it)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const PINK = '#ff5ab0';

  // the announcer's portrait: a marquee of bulbs round a smile
  function marquee(g, S, t, talking) {
    g.fillStyle = '#16090f';
    g.fillRect(8, 8, S - 16, S - 16);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const k = i / n, side = Math.floor(k * 4), f = (k * 4) % 1;
      const x = side === 0 ? 12 + f * (S - 24) : side === 1 ? S - 12 : side === 2 ? S - 12 - f * (S - 24) : 12;
      const y = side === 0 ? 12 : side === 1 ? 12 + f * (S - 24) : side === 2 ? S - 12 : S - 12 - f * (S - 24);
      const on = (Math.floor(t * 8) + i) % 3 !== 0;
      g.fillStyle = on ? '#ffe08a' : '#4a3a20';
      g.beginPath();
      g.arc(x, y, 2.4, 0, U.TAU);
      g.fill();
    }
    // the smile: wide, white, and it opens on the words
    const open = talking ? 4 + 8 * Math.abs(Math.sin(t * 15) * Math.sin(t * 4.3)) : 2;
    const cx = S / 2, cy = S / 2 + 4;
    g.fillStyle = '#3a0a14';
    g.beginPath();
    g.ellipse(cx, cy, S * 0.26, open, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = PINK;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy - S * 0.18, S * 0.32, 0.22 * Math.PI, 0.78 * Math.PI);
    g.stroke();
    g.fillStyle = '#f6f2ea';
    for (let i = -4; i <= 4; i++) g.fillRect(cx + i * 5 - 2, cy - open - 1, 4, Math.max(2, open * 0.7));
  }
  const speakers = {
    trial: { name: 'The Proving Grounds', role: 'Trial system · recorded', color: PINK, portrait: marquee, voice: 1.15 },
  };

  const items = {
    'ds-survivor': {
      name: 'Survivor', radius: 9, dressing: false, mapColor: '#5fe08a', mapAlways: true,
      interact: {
        prompt: (it) => 'Talk to ' + (it.props.name || 'them'),
        use(it, game) {
          if (it.props.flag && !game.hasFlag(it.props.flag)) game.setFlag(it.props.flag);
          if (!game.hasFlag('talkedToSurvivor')) game.setFlag('talkedToSurvivor');
          LM.ui.showText(it.props.name || 'A survivor', typeof it.props.text === 'function' ? it.props.text(game) : it.props.text || 'They don’t say anything. They’re shaking.', 'The Box');
        },
      },
      draw(g, it, t) {
        const p = it.props;
        g.rotate(it.props.angle != null ? it.props.angle : Math.PI / 2);
        // sitting against the wall, knees up, arms round them, rocking a little
        g.translate(Math.sin(t * 2.4 + it.tx) * 0.5, 0);
        g.fillStyle = U.shade(p.coat || '#e0702a', -0.2);
        g.beginPath();
        g.ellipse(5, -3, 5, 2.4, 0.2, 0, U.TAU);
        g.ellipse(5, 3, 5, 2.4, -0.2, 0, U.TAU);
        g.fill();
        g.fillStyle = p.coat || '#e0702a';
        G.roundRect(g, -6, -7, 9, 14, 4);
        g.fill();
        g.fillStyle = p.skin || '#d8b090';
        g.beginPath();
        g.ellipse(3, -1.5, 3, 1.4, 0.4, 0, U.TAU);
        g.ellipse(3, 1.5, 3, 1.4, -0.4, 0, U.TAU);
        g.fill();
        g.beginPath();
        g.arc(-1, 0, 3.6, 0, U.TAU);
        g.fill();
        g.fillStyle = p.hair || '#2a1a10';
        g.beginPath();
        g.arc(-2, 0, 3.4, Math.PI * 0.6, Math.PI * 1.4);
        g.fill();
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 14, '#5fe08a', 0.08 + 0.04 * Math.sin(t * 2));
      },
    },
  };

  LM.definePack({ id: 'ds-story', speakers, items });
})();
