/* Dead Signal — packs/ds-story/proving.js
 * Floor 4's story pieces (the Proving Grounds: DESIGN.md section 4.4).
 *   speakers  trial (the Proving Grounds' announcer: a recording, a game-show voice that never stops
 *             smiling, run by the trial system whoever is listening)
 *   items     ds-survivor (a contestant who made it to the Box, sitting with their knees up. When you come
 *             close they speak to you, once, as a conversation (it stops the game: engine/comms.js); E
 *             to hear it again. props.text is what they say (paragraphs become lines); props.flag and
 *             props.knows are set when they've said it (Kwan's knows: knowsArmoryCode))
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {});
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
  // a contestant's face, for the conversation: their skin, their hair, the orange jumpsuit's collar
  DS.personPortrait = function (look) {
    const skin = look.skin || '#d8b090', hair = look.hair || '#2a1a10', coat = look.coat || '#e0702a';
    return function (g, S, t, talking) {
      g.fillStyle = '#0d0f12';
      g.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S * 0.46;
      // shoulders in orange
      g.fillStyle = coat;
      g.beginPath();
      g.ellipse(cx, S * 0.98, S * 0.42, S * 0.26, 0, Math.PI, U.TAU);
      g.fill();
      g.fillStyle = U.shade(coat, -0.25);
      g.fillRect(cx - S * 0.08, S * 0.72, S * 0.16, S * 0.06);
      // the head
      g.fillStyle = skin;
      g.beginPath();
      g.ellipse(cx, cy, S * 0.2, S * 0.25, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = hair;
      g.beginPath();
      g.ellipse(cx, cy - S * 0.1, S * 0.215, S * 0.17, 0, Math.PI * 1.02, Math.PI * 1.98);
      g.fill();
      // eyes, red-rimmed; a mouth that moves when they talk
      g.fillStyle = '#1a1210';
      g.fillRect(cx - S * 0.09, cy - S * 0.01, S * 0.04, S * 0.025);
      g.fillRect(cx + S * 0.05, cy - S * 0.01, S * 0.04, S * 0.025);
      const open = talking ? S * (0.012 + 0.03 * Math.abs(Math.sin(t * 13) * Math.sin(t * 3.7))) : S * 0.008;
      g.fillStyle = '#3a1410';
      g.fillRect(cx - S * 0.05, cy + S * 0.12, S * 0.1, open + S * 0.008);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      for (let y = 0; y < S; y += 3) g.fillRect(0, y, S, 1);
    };
  };
  /** A survivor speaks: their words as a conversation, and what they told you is known. */
  DS.survivorSpeaks = function (it, game) {
    const p = it.props;
    if (p.flag && !game.hasFlag(p.flag)) game.setFlag(p.flag);
    if (p.knows && !game.hasFlag(p.knows)) game.setFlag(p.knows);
    if (!game.hasFlag('talkedToSurvivor')) game.setFlag('talkedToSurvivor');
    const text = typeof p.text === 'function' ? p.text(game) : p.text || 'They don’t say anything. They’re shaking.';
    const who = { name: p.name || 'A survivor', role: 'Contestant · made it to the Box', color: '#ff9a4a', portrait: DS.personPortrait(p), voice: 0.9, pause: true };
    for (const para of String(text).split(/\n\s*\n/)) if (para.trim()) LM.comms.say({ who, text: para.trim() });
  };

  const speakers = {
    trial: { name: 'The Proving Grounds', role: 'Trial system · recorded', color: PINK, portrait: marquee, voice: 1.15 },
  };

  const items = {
    'ds-survivor': {
      name: 'Survivor', radius: 9, dressing: false, mapColor: '#5fe08a', mapAlways: true,
      interact: {
        prompt: (it) => 'Talk to ' + (it.props.name || 'them'),
        use(it, game) {
          it.spoke = true;
          DS.survivorSpeaks(it, game);
        },
      },
      // they speak up when you come close (once; it.spoke is remembered by the floor)
      update(it, dt, game) {
        if (it.spoke || !game.player || game.state !== 'play' || LM.comms.busy()) return;
        const P = game.player;
        if (U.dist(P.x, P.y, it.x, it.y) > 112 || !LM.physics.los(game.level, P.x, P.y, it.x, it.y, 'shot')) return;
        it.spoke = true;
        DS.survivorSpeaks(it, game);
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
