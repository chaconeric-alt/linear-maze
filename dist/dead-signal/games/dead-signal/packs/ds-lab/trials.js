/* Dead Signal — packs/ds-lab/trials.js
 * Floor 4's dressings: the trial and the board's private suites (DESIGN.md section 4.4).
 *
 * The trial
 *   ds-odds-board       a scoreboard on a wall: tonight's subject, the odds, the time in the Run and the
 *                       contestants still alive, live. Read it for the house rules (props.text).
 *   ds-trial-horn       the trial system's horn speaker (lights up while the announcer talks)
 *   ds-trial-console    the console in the Box: it starts the final round (flag finalRound) and, once
 *                       the trial is over, gives the results (readResults)
 *   ds-betting-board    the board's own bets, on the Box's wall (props.w tiles; props.text; props.flags)
 *   ds-champagne        an ice bucket, a bottle and five glasses on a side table
 *   ds-kennel           a dog crate (props.state: empty | broken; props.text)
 *   ds-feed-bin         the handlers' feed bin (props.text)
 *   ds-leash-rack       catchpoles, leashes and muzzles on a wall
 *   ds-jumpsuits        a rail of orange jumpsuits stencilled SUBJECT, on a wall
 * The dream studios
 *   ds-sleep-pod        a recording pod, 1 x 2 tiles (props.dir), with a crown of electrodes. props.sleeper:
 *                       someone is asleep in it ({ skin, hair }); props.title / props.text
 *   ds-dream-console    a playback desk; reading it plays the recording's transcript (props.text) and sets
 *                       props.flags; props.ariadne adds her line
 *   ds-design-sheet     a design sheet pinned to a wall: props.art (jester, rats, hound, underbed, diner),
 *                       props.title, props.text, props.flags
 *   ds-hologram         a projector and what it projects: props.shape (jester, rats, hands, mouth, hound).
 *                       It flickers and turns to look at you. props.lunge: once, when you come close, it
 *                       comes at you (it's light; it goes through you).
 * The Nursery
 *   ds-kid-bed          a child's bed, 1 x 2 tiles (props.dir); props.lump: somebody grown is in it;
 *                       props.eyes: two lights under it until the flag props.until is set
 *   ds-nightlight       a moon lamp; a `lights` trap switches it (by tag)
 *   ds-toy-box          a painted toy box (props.text)
 *   ds-rocking-horse    it rocks, a little, with nobody on it
 *   ds-mobile           stars and moons turning over the cot (it hangs above everything)
 *   ds-music-box        a music box on a dresser: it plays while you're near, until the flag props.until
 *                       (then it winds down); E winds it (props.flag)
 * The Long Room
 *   ds-dining-table     a long table, props.w tiles by 2, laid for dinner
 *   ds-restraint-chair  a high-backed chair with straps (props.dir); its straps hang open once the flag
 *                       props.openFlag is set
 *   ds-cloche           the covered main course on the table (2 x 1). Lift it: someone is under there
 *                       (props.captive: what spawns when you cut him loose; props.flag is set either way)
 *   ds-gong             a dinner gong: strike it (props.flag); it rings by itself when the flag is set
 *   ds-place-card       a folded card on the table (props.text)
 *   ds-candelabra       a standing candelabrum (a light)
 * The Party Room
 *   ds-balloons         a bunch of balloons on a weight (props.colors); shoot them and they pop
 *   ds-party-cake       a cake on a little table, candles lit (props.text)
 *   ds-bunting          bunting along a wall (props.w tiles, props.text)
 *   ds-stage            a little stage with a curtain (props.w tiles by 2): the curtain opens on props.openFlag
 *   ds-party-hat        a paper hat on the floor (props.color)
 *   ds-jack-box         a jack-in-the-box: it goes off when you come close
 *   ds-gift             a wrapped present (props.color); props.loot: open it
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);
  const { rot, faceRot, say, textOf, setBox, spanW, housing } = DS.dress;
  const PINK = '#ff5ab0', TRIAL = '#ff3a6a', HOLO = '#7ff0ff', HOLO2 = '#ff7ad8', BRASS = '#c9a046', CANDLE = '#ffc070';

  const setFlags = (it, game) => {
    for (const f of [].concat(it.props.flags || [])) if (f && !game.hasFlag(f)) game.setFlag(f);
  };
  const page = (it, game, text, kicker, title) => {
    const kids = [DS.screenText(textOf(text, game))];
    if (it.props.ariadne) kids.push(DS.screenText(it.props.ariadne, true));
    LM.ui.open({ kicker: kicker || it.props.kicker || 'Proving Grounds', title: title || it.props.title || 'Terminal', body: h('div', null, ...kids), actions: [{ label: 'Close', primary: true }] });
  };
  const star4 = (g, x, y, s) => {
    g.beginPath();
    g.moveTo(x, y - s);
    g.quadraticCurveTo(x, y, x + s, y);
    g.quadraticCurveTo(x, y, x, y + s);
    g.quadraticCurveTo(x, y, x - s, y);
    g.quadraticCurveTo(x, y, x, y - s);
    g.fill();
  };
  const near = (game, it, R) => game.player && !game.player.dead && U.dist(game.player.x, game.player.y, it.x, it.y) < R;
  /** An item's share of the floor's anchor: a piece w x hh tiles, centred on its tiles (top-left anchor). */
  function anchor(it, w, hh) {
    const d = it.props.dir || 's';
    const sideways = d === 'e' || d === 'w';
    const W = sideways ? hh : w, H = sideways ? w : hh;
    it.x = it.tx * T + (W * T) / 2;
    it.y = it.ty * T + (H * T) / 2;
  }

  // ------------------------------------------------------------ the trial's state, for its boards
  DS.trial = {
    started: (game) => game.hasFlag('trialStarted'),
    over: (game) => game.hasFlag('trialEnded'),
    seconds(game) {
      const L = game.level;
      if (!L || L.trialT0 == null) return null;
      return Math.max(0, (L.trialEnd != null ? L.trialEnd : game.time) - L.trialT0);
    },
    captives(game) {
      let alive = 0, saved = 0, dead = 0;
      for (const e of game.enemies) if (!e.dead && e.def.id === 'ds-captive') alive++;
      for (const it of game.items) if (!it.dead && it.def.id === 'ds-survivor') saved++;
      for (const f of ['Kwan', 'Arden', 'Soto', 'Pryce']) if (game.hasFlag('captiveDied' + f)) dead++;
      return { alive, saved, dead };
    },
    clock(s) {
      if (s == null) return '--:--';
      const m = Math.floor(s / 60), x = Math.floor(s % 60);
      return m + ':' + (x < 10 ? '0' : '') + x;
    },
  };
  LM.on('flag', ({ name, game }) => {
    if (!game || !game.level) return;
    if (name === 'trialStarted' && game.level.trialT0 == null) game.level.trialT0 = game.time;
    if (name === 'trialEnded' && game.level.trialEnd == null) game.level.trialEnd = game.time;
  });
  function oddsLines(game) {
    const S = DS.trial;
    if (!S.started(game)) return ['PROVING GROUNDS', 'TONIGHT: T. LARK · FACILITIES', 'ODDS 1 : 9', 'BETS CLOSE AT THE GATE'];
    const c = S.captives(game), s = S.seconds(game);
    if (S.over(game)) return ['TRIAL 14 · RESULT', 'SUBJECT SURVIVED · ' + S.clock(s), 'CAPTIVES SAVED: ' + c.saved, 'THE HOUSE THANKS YOU'];
    const odds = Math.max(2, 9 - Math.floor((s || 0) / 20));
    return ['TRIAL 14 · IN PROGRESS', 'SUBJECT: T. LARK', 'IN THE RUN ' + S.clock(s), 'ODDS 1 : ' + odds, 'CONTESTANTS LEFT: ' + (c.alive + c.saved + 1)];
  }

  // ------------------------------------------------------------ small drawing helpers
  const person = (g, coat, skin, hair, k) => {
    g.fillStyle = coat;
    G.roundRect(g, -6, -8, 11, 16, 4.5);
    g.fill();
    g.fillStyle = skin;
    g.beginPath();
    g.arc(2, 0, 3.8, 0, U.TAU);
    g.fill();
    g.fillStyle = hair;
    g.beginPath();
    g.arc(1, 0, 3.6, Math.PI * 0.6, Math.PI * 1.4);
    g.fill();
  };
  // concept sketches and projections share these outlines (in a unit box about 20 across)
  const SHAPES = {
    jester(g, t, a) {
      // three heads on long necks over one ruffed collar
      g.lineWidth = 1.4;
      g.lineCap = 'round';
      for (const [dx, ph] of [[-6, 0], [0, 1.3], [6, 2.6]]) {
        const hx = dx * 1.3 + Math.sin(t * 2 + ph) * 1.5, hy = -13 - Math.abs(dx) * 0.2;
        g.beginPath();
        g.moveTo(dx * 0.4, -3);
        g.quadraticCurveTo(dx, -8, hx, hy);
        g.stroke();
        g.beginPath();
        g.arc(hx, hy, 3.2, 0, U.TAU);
        g.stroke();
        // the grin, ear to ear
        g.beginPath();
        g.arc(hx, hy + 0.4, 2, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
      }
      // the ruff
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const an = Math.PI + (i / 12) * Math.PI, r = i % 2 ? 5 : 7.5;
        g.lineTo(Math.cos(an) * r * 1.3, -2 + Math.sin(an) * r * 0.5 + 2);
      }
      g.stroke();
      // the body, in diamonds
      g.beginPath();
      g.moveTo(-6, 0);
      g.lineTo(-5, 13);
      g.lineTo(5, 13);
      g.lineTo(6, 0);
      g.moveTo(-5, 4);
      g.lineTo(0, 9);
      g.lineTo(5, 4);
      g.moveTo(-5, 9);
      g.lineTo(0, 4);
      g.lineTo(5, 9);
      g.stroke();
    },
    rats(g, t, a) {
      // a tide of them, going round
      for (let i = 0; i < 22; i++) {
        const an = (i / 22) * U.TAU + t * (0.6 + (i % 3) * 0.15), r = 4 + (i % 5) * 2.6;
        const x = Math.cos(an) * r * 1.3, y = Math.sin(an) * r * 0.9;
        g.beginPath();
        g.ellipse(x, y, 2.2, 1.2, an + Math.PI / 2, 0, U.TAU);
        g.fill();
        g.beginPath();
        g.moveTo(x - Math.cos(an + Math.PI / 2) * 2, y - Math.sin(an + Math.PI / 2) * 2);
        g.lineTo(x - Math.cos(an + Math.PI / 2) * 5, y - Math.sin(an + Math.PI / 2) * 5 + 1);
        g.stroke();
      }
    },
    hands(g, t, a) {
      // a bed's edge, and hands coming out from under it, far too many
      g.lineWidth = 1.2;
      g.strokeRect(-11, -12, 22, 9);
      for (let i = 0; i < 6; i++) {
        const x = -9 + i * 3.6, reach = 6 + Math.sin(t * 2.4 + i * 1.7) * 3 + (i % 2) * 3;
        g.beginPath();
        g.moveTo(x, -3);
        g.quadraticCurveTo(x + Math.sin(i) * 3, -3 + reach * 0.6, x + Math.sin(i * 2) * 2, -3 + reach + 3);
        g.stroke();
        for (let f = -1; f <= 1; f++) {
          g.beginPath();
          g.moveTo(x + Math.sin(i * 2) * 2, -3 + reach + 3);
          g.lineTo(x + Math.sin(i * 2) * 2 + f * 1.4, -3 + reach + 5.5);
          g.stroke();
        }
      }
    },
    mouth(g, t, a) {
      // a mouth, open, with a person's teeth, too many rows of them
      const o = 0.6 + 0.4 * Math.abs(Math.sin(t * 1.4));
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(0, 0, 14, 9 * o, 0, 0, U.TAU);
      g.stroke();
      for (let row = 0; row < 2; row++) {
        for (let i = -5; i <= 5; i++) {
          const x = i * 2.4 * (1 - row * 0.2), y0 = (row ? 1 : -1) * 8 * o * (1 - Math.abs(i) * 0.06) * (1 - row * 0.3);
          g.strokeRect(x - 1, y0 - (row ? 2.4 : 0), 2, 2.4);
        }
      }
    },
    hound(g, t, a) {
      // a long low dog with no eyes, and a grin that goes all the way round the head
      g.lineWidth = 1.3;
      g.beginPath();
      g.ellipse(-2, 2, 10, 4, 0, 0, U.TAU);
      g.stroke();
      for (const lx of [-8, -4, 4, 7]) {
        g.beginPath();
        g.moveTo(lx, 4);
        g.lineTo(lx + Math.sin(t * 6 + lx) * 1.5, 11);
        g.stroke();
      }
      g.beginPath();
      g.ellipse(10, -1, 5, 4, 0, 0, U.TAU);
      g.stroke();
      g.beginPath();
      g.arc(10, -1, 3.6, 0.1 * Math.PI, 0.95 * Math.PI);
      g.stroke();
      for (let i = 0; i < 6; i++) g.fillRect(7 + i * 1.2, 1.1, 0.6, 0.9);
    },
    underbed(g, t, a) {
      SHAPES.hands(g, t, a);
    },
    diner(g, t, a) {
      // a figure in evening dress at a table, its mask smiling
      g.lineWidth = 1.2;
      g.strokeRect(-12, 4, 24, 3);
      g.beginPath();
      g.moveTo(-4, 4);
      g.lineTo(-5, -6);
      g.lineTo(5, -6);
      g.lineTo(4, 4);
      g.stroke();
      g.beginPath();
      g.ellipse(0, -10, 3.4, 4.2, 0, 0, U.TAU);
      g.stroke();
      g.beginPath();
      g.arc(0, -9.4, 1.8, 0.2 * Math.PI, 0.8 * Math.PI);
      g.stroke();
      g.fillRect(-1.6, -11.6, 0.8, 0.8);
      g.fillRect(0.8, -11.6, 0.8, 0.8);
    },
  };
  DS.SHAPES = SHAPES;

  const items = {
    // ========================================================== the trial
    'ds-odds-board': {
      name: 'Odds board', radius: 7, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: PINK,
      light: { color: PINK, radius: 110, intensity: 0.32, flicker: 0.02 },
      interact: {
        prompt: () => 'Read the odds board',
        use(it, game) {
          LM.audio.play('ui');
          const lines = oddsLines(game).join('\n');
          const kids = [DS.screenText(lines + (it.props.text ? '\n\n' + textOf(it.props.text, game) : ''))];
          if (DS.trial.started(game) && !DS.trial.over(game)) kids.push(DS.screenText(it.props.ariadne || 'THEY ARE BETTING ON YOU.', true));
          setFlags(it, game);
          LM.ui.open({ kicker: 'Proving Grounds', title: it.props.title || 'Odds board', body: h('div', null, ...kids), actions: [{ label: 'Close', primary: true }] });
        },
      },
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -12, 4, 24, '#141518');
        g.fillStyle = '#08080a';
        g.fillRect(0.6, -10.5, 2.4, 21);
      },
      drawGlow(g, it, t, game) {
        faceRot(g, it);
        // rows of lit segments, changing as the numbers do
        const lines = game ? oddsLines(game) : [];
        const seed = lines.join('').length + Math.floor(t * (DS.trial.started(game) ? 2 : 0.5));
        const r = U.mulberry32((seed * 9301 + it.tx * 31) >>> 0);
        for (let i = 0; i < 9; i++) {
          const on = r() < 0.7;
          if (!on) continue;
          g.fillStyle = U.rgba(i < 2 ? '#ffe04a' : PINK, 0.85);
          g.fillRect(1, -10 + i * 2.3, 1.6, 1.4);
        }
        G.glow(g, 4, 0, 18, PINK, 0.18 + 0.06 * Math.sin(t * 3));
      },
    },
    'ds-trial-horn': {
      name: 'Trial horn', radius: 5, wallMounted: true, shadow: false, dressing: 'Walls',
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -3, 2.6, 6, '#2a2c30');
        // a flared horn
        g.fillStyle = '#c9ced4';
        g.beginPath();
        g.moveTo(1.8, -1.6);
        g.lineTo(7, -4.5);
        g.lineTo(7, 4.5);
        g.lineTo(1.8, 1.6);
        g.closePath();
        g.fill();
        g.fillStyle = '#3a3e44';
        g.fillRect(6.4, -4.5, 0.8, 9);
      },
      drawGlow(g, it, t) {
        if (!LM.comms || LM.comms.speaking() !== 'trial') return;
        faceRot(g, it);
        G.glow(g, 9, 0, 22, PINK, 0.18 + 0.12 * Math.abs(Math.sin(t * 11)));
      },
    },
    'ds-trial-console': {
      name: 'Trial console', solid: 'rect', radius: 16, dressing: 'Furniture', mapColor: PINK,
      light: { color: PINK, radius: 90, intensity: 0.35, flicker: 0 },
      init(it) {
        spanW(it, 2);
        setBox(it, 2 * T - 6, 16, 0, -6);
      },
      interact: {
        prompt: (it, game) => (game.hasFlag('trialEnded') ? 'Read the results' : game.hasFlag('finalRound') ? 'Read the console' : 'Use the trial console'),
        use(it, game) {
          LM.audio.play('ui');
          const S = DS.trial;
          if (game.hasFlag('trialEnded')) {
            const c = S.captives(game);
            if (!game.hasFlag('readResults')) game.setFlag('readResults');
            return page(it, game, 'PROVING GROUNDS · TRIAL 14 · RESULT\n\nSUBJECT: T. LARK (FACILITIES)\nOUTCOME: SURVIVED\nTIME IN THE RUN: ' + S.clock(S.seconds(game)) + '\nCONTESTANTS SAVED BY SUBJECT: ' + c.saved + '\n\nPAYOUTS\n  A.V. ..... subject survives ........ WON\n  M.T. ..... under three minutes ..... ' + ((S.seconds(game) || 999) < 180 ? 'WON' : 'LOST') + '\n  G.M. ..... the dogs ................ LOST\n  I.B. ..... the captives first ...... ' + (c.dead ? 'WON' : 'LOST') + '\n\nThe house thanks the subject for his participation.', 'Trial console', 'Results');
          }
          if (game.hasFlag('finalRound')) return page(it, game, 'TRIAL 14 · FINAL ROUND IN PROGRESS\n\nSUBJECT TO THE FLOOR.', 'Trial console', 'Final round');
          const body = h('div', null, DS.screenText('PROVING GROUNDS · TRIAL 14\n\nSUBJECT: T. LARK (FACILITIES)\nSTATUS: IN THE BOX\n\nTHE RUN: COMPLETE\nFINAL ROUND: SUBJECT TO THE FLOOR\n\nThe trial ends when the subject wins the final round.\nThe doors of the Proving Grounds open when the trial ends.'));
          LM.ui.open({
            kicker: 'Trial console', title: 'Final round', body,
            actions: [
              { label: 'Begin the final round', primary: true, onClick: () => { game.setFlag('finalRound'); } },
              { label: 'Not yet', quiet: true },
            ],
          });
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        const W = 2 * T - 6;
        g.fillStyle = '#1a1b1e';
        G.roundRect(g, -W / 2, -14, W, 16, 2);
        g.fill();
        g.fillStyle = '#2a2c31';
        G.roundRect(g, -W / 2 + 1, -13, W - 2, 14, 2);
        g.fill();
        // a big red button under a flip cover, and a microphone on a gooseneck
        g.fillStyle = '#121316';
        g.fillRect(-20, -4, 16, 3.6);
        g.fillStyle = '#8a1a2a';
        g.beginPath();
        g.arc(10, -6, 3.4, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#9aa1a8';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(20, -10);
        g.quadraticCurveTo(24, -2, 18, 2);
        g.stroke();
        g.fillStyle = '#16171a';
        g.beginPath();
        g.arc(18, 2, 1.6, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t, game) {
        g.rotate(rot(it));
        const live = game && game.hasFlag('trialStarted') && !game.hasFlag('trialEnded');
        g.fillStyle = U.rgba(PINK, 0.55);
        g.fillRect(-20, -12, 26, 6);
        G.glow(g, -7, -9, 18, PINK, 0.25);
        G.glow(g, 10, -6, 10, '#ff3a3a', live ? 0.35 + 0.25 * Math.sin(t * 4) : 0.12);
      },
    },
    'ds-betting-board': {
      name: 'Betting board', radius: 8, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: BRASS,
      light: { color: '#ffe0a0', radius: 120, intensity: 0.3, flicker: 0 },
      init(it) {
        const w = it.props.w || 2;
        if (it.face.x) it.y = it.ty * T + (w * T) / 2;
        else it.x = it.tx * T + (w * T) / 2;
      },
      interact: {
        prompt: () => 'Read the bets',
        use(it, game) {
          setFlags(it, game);
          LM.audio.play('ui');
          page(it, game, it.props.text || 'No bets.', 'The Box', it.props.title || 'Tonight’s bets');
        },
      },
      draw(g, it) {
        faceRot(g, it);
        const W = (it.props.w || 2) * T - 6;
        // a slate in a brass frame
        g.fillStyle = '#6a5426';
        g.fillRect(-0.5, -W / 2 - 1, 5, W + 2);
        g.fillStyle = '#16181a';
        g.fillRect(0.4, -W / 2, 3.4, W);
        g.fillStyle = 'rgba(240,236,228,0.7)';
        const r = U.mulberry32((it.tx * 97 + it.ty * 13) >>> 0);
        for (let i = 0; i < 9; i++) g.fillRect(1.2, -W / 2 + 3 + i * (W - 6) / 9, 1.8, 1.2 + r() * 0.6);
      },
    },
    'ds-champagne': {
      name: 'Champagne', solid: true, radius: 9, dressing: 'Furniture',
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Look at the champagne',
        use: (it, game) => say(it.props.title || 'Champagne', textOf(it.props.text, game), it.props.kicker || 'The Box'),
      },
      draw(g, it) {
        // a little round table
        g.fillStyle = '#2a1810';
        g.beginPath();
        g.arc(0, 0, 9, 0, U.TAU);
        g.fill();
        g.fillStyle = '#4a2c1c';
        g.beginPath();
        g.arc(0, 0, 8, 0, U.TAU);
        g.fill();
        // the ice bucket and the bottle in it
        g.fillStyle = '#c9ced4';
        g.beginPath();
        g.arc(-2, -1, 4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8f0f4';
        g.beginPath();
        g.arc(-2, -1, 3.2, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1e3a24';
        g.beginPath();
        g.arc(-2, -1, 1.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d8c070';
        g.beginPath();
        g.arc(-2, -1, 0.8, 0, U.TAU);
        g.fill();
        // five glasses, one on its side
        g.fillStyle = 'rgba(240,230,190,0.75)';
        for (const [x, y] of [[4, -4], [5.5, 0], [4, 4], [-1, 5]]) {
          g.beginPath();
          g.arc(x, y, 1.2, 0, U.TAU);
          g.fill();
        }
        g.fillRect(-7, 1, 3.2, 1);
      },
    },
    'ds-kennel': {
      name: 'Dog crate', solid: 'rect', radius: 13, dressing: 'Furniture', mapColor: '#9aa1a8',
      init(it) {
        it.box = [26, 26];
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Look in the crate',
        use: (it, game) => say(it.props.title || 'A dog crate', textOf(it.props.text, game), it.props.kicker || 'Kennels'),
      },
      draw(g, it) {
        const st = it.props.state || 'empty';
        g.fillStyle = '#1a1c1f';
        g.fillRect(-13, -13, 26, 26);
        g.fillStyle = '#3a3630';
        g.fillRect(-12, -12, 24, 24);
        // a blanket, chewed to rags, and something gnawed
        g.fillStyle = '#5a4a3a';
        g.beginPath();
        g.ellipse(-2, 2, 8, 6, 0.3, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8e0d0';
        g.fillRect(4, -6, 6, 1.6);
        g.beginPath();
        g.arc(4, -5.2, 1.4, 0, U.TAU);
        g.arc(10, -5.2, 1.4, 0, U.TAU);
        g.fill();
        // the bars over the top
        g.strokeStyle = '#8e959c';
        g.lineWidth = 1;
        for (let i = -11; i <= 11; i += 4) {
          g.beginPath();
          g.moveTo(i, -12);
          g.lineTo(i, 12);
          g.stroke();
        }
        g.strokeRect(-12, -12, 24, 24);
        if (st === 'broken') {
          // the front bent out from inside
          g.strokeStyle = '#b8bec6';
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(-10, 12);
          g.quadraticCurveTo(-4, 20, 2, 12);
          g.moveTo(-2, 12);
          g.quadraticCurveTo(4, 19, 10, 12);
          g.stroke();
        }
      },
    },
    'ds-feed-bin': {
      name: 'Feed bin', solid: 'rect', radius: 10, dressing: 'Furniture',
      init(it) {
        setBox(it, 20, 16, 0, 0);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Look in the bin',
        use: (it, game) => say(it.props.title || 'Feed bin', textOf(it.props.text, game), it.props.kicker || 'Kennels'),
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#1e3a5a';
        G.roundRect(g, -10, -8, 20, 16, 2);
        g.fill();
        g.fillStyle = '#2a4a6a';
        G.roundRect(g, -9, -7, 18, 9, 2);
        g.fill();
        g.fillStyle = '#e8e4dc';
        g.fillRect(-6, 3, 12, 3);
        g.fillStyle = '#16171a';
        g.beginPath();
        g.arc(-7, 8, 1.6, 0, U.TAU);
        g.arc(7, 8, 1.6, 0, U.TAU);
        g.fill();
      },
    },
    'ds-leash-rack': {
      name: 'Leash rack', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls',
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Look at the rack',
        use: (it, game) => say(it.props.title || 'Handlers’ rack', textOf(it.props.text, game), it.props.kicker || 'Kennels'),
      },
      draw(g, it) {
        faceRot(g, it);
        g.fillStyle = '#3a3e44';
        g.fillRect(0, -12, 1.6, 24);
        for (let i = -9; i <= 9; i += 6) {
          // a catchpole and its loop, a muzzle
          g.strokeStyle = '#9aa1a8';
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(1.6, i);
          g.lineTo(8, i + 1);
          g.stroke();
          g.strokeStyle = '#c84a2a';
          g.beginPath();
          g.arc(9, i + 1, 1.6, 0, U.TAU);
          g.stroke();
        }
      },
    },
    'ds-jumpsuits': {
      name: 'Jumpsuits', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls',
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Look at the jumpsuits',
        use: (it, game) => say(it.props.title || 'Jumpsuits', textOf(it.props.text, game), it.props.kicker || 'Holding'),
      },
      draw(g, it) {
        faceRot(g, it);
        g.fillStyle = '#5a5e64';
        g.fillRect(0, -13, 1.2, 26);
        for (let i = -11; i <= 9; i += 5) {
          g.fillStyle = '#e0702a';
          G.roundRect(g, 1.2, i, 6, 4.2, 1);
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(3.6, i + 0.6, 0.6, 3);
        }
      },
    },

    // ========================================================== the dream studios
    'ds-sleep-pod': {
      name: 'Sleep pod', solid: 'rect', radius: 16, reach: 12, dressing: 'Furniture', mapColor: '#b48cff',
      light: { color: '#b48cff', radius: 90, intensity: 0.28, flicker: 0.03 },
      init(it) {
        anchor(it, 1, 2);
        setBox(it, 24, 54, 0, 0);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => (it.props.sleeper ? 'Look into the pod' : 'Read the pod’s label'),
        use(it, game) {
          setFlags(it, game);
          page(it, game, it.props.text, it.props.kicker || 'Dream studio', it.props.title || 'Sleep pod');
        },
      },
      draw(g, it, t) {
        g.rotate(rot(it));
        // a white capsule; the head end is to the north
        g.fillStyle = '#16171a';
        G.roundRect(g, -13, -28, 26, 56, 11);
        g.fill();
        g.fillStyle = '#d8dcdf';
        G.roundRect(g, -12, -27, 24, 54, 10);
        g.fill();
        g.fillStyle = '#2a2c36';
        G.roundRect(g, -9, -24, 18, 48, 8);
        g.fill();
        const s = it.props.sleeper;
        if (s) {
          // someone asleep, wired in, and dreaming: the head never quite still
          g.save();
          g.rotate(Math.PI / 2);
          g.translate(-2, 0);
          g.fillStyle = s.coat || '#6a6e80';
          G.roundRect(g, -6, -6, 22, 12, 5);
          g.fill();
          const tw = Math.sin(t * 7 + it.tx) * Math.sin(t * 2.3) * 0.6;
          g.fillStyle = s.skin || '#d8b090';
          g.beginPath();
          g.arc(-12 + tw * 0.3, tw, 4.4, 0, U.TAU);
          g.fill();
          g.fillStyle = s.hair || '#3a2418';
          g.beginPath();
          g.arc(-13 + tw * 0.3, tw, 4.2, Math.PI * 0.55, Math.PI * 1.45);
          g.fill();
          g.restore();
        } else {
          g.fillStyle = '#e8ecee';
          G.roundRect(g, -6, -22, 12, 7, 3);
          g.fill();
        }
        // the crown of electrodes over the pillow
        g.strokeStyle = '#9aa1a8';
        g.lineWidth = 0.7;
        g.beginPath();
        g.arc(0, -16, 7, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (1.15 + i * 0.17);
          g.fillStyle = '#c9a046';
          g.beginPath();
          g.arc(Math.cos(a) * 7, -16 + Math.sin(a) * 7, 0.9, 0, U.TAU);
          g.fill();
        }
        // smoked glass over the lot
        g.fillStyle = 'rgba(150,120,200,0.18)';
        G.roundRect(g, -9, -24, 18, 48, 8);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.12)';
        G.roundRect(g, -7, -22, 5, 30, 3);
        g.fill();
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        G.glow(g, 0, -16, 16, '#b48cff', 0.18 + (it.props.sleeper ? 0.12 * Math.abs(Math.sin(t * 3.3)) : 0));
        DS.led(g, 10, 22, it.props.sleeper ? '#ff5ab0' : '#5fe08a', 0.55, 0.8);
      },
    },
    'ds-dream-console': {
      name: 'Dream playback', solid: 'rect', radius: 14, dressing: 'Furniture', mapColor: '#b48cff',
      light: { color: '#b48cff', radius: 80, intensity: 0.3, flicker: 0 },
      init(it) {
        setBox(it, 28, 16, 0, -6);
      },
      interact: {
        prompt: (it) => it.props.prompt || 'Play the recording',
        use(it, game) {
          setFlags(it, game);
          LM.audio.play('dreamPlay');
          page(it, game, it.props.text, it.props.kicker || 'Oneirography', it.props.title || 'Recording');
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#18191d';
        G.roundRect(g, -14, -14, 28, 16, 2);
        g.fill();
        g.fillStyle = '#262830';
        G.roundRect(g, -13, -13, 26, 14, 2);
        g.fill();
        g.fillStyle = '#0a0a0e';
        g.fillRect(-11, -11.5, 22, 6);
        // a slider bank
        g.fillStyle = '#5a5e64';
        for (let i = 0; i < 6; i++) g.fillRect(-10 + i * 4, -3.5, 1, 4);
        g.fillStyle = '#16171b';
        g.beginPath();
        g.arc(0, 8, 5, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        // a sleeper's waveform, slow, with bursts
        g.strokeStyle = 'rgba(200,170,255,0.85)';
        g.lineWidth = 0.6;
        g.beginPath();
        for (let i = 0; i <= 22; i++) {
          const x = -11 + i, ph = t * 3 + i * 0.6 + it.tx;
          const burst = Math.sin(t * 0.7 + it.ty) > 0.6 ? 2.2 : 0.8;
          g.lineTo(x, -8.5 + Math.sin(ph) * Math.sin(ph * 2.7) * burst);
        }
        g.stroke();
        G.glow(g, 0, -8, 16, '#b48cff', 0.25);
      },
    },
    'ds-design-sheet': {
      name: 'Design sheet', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: '#e8e0d0',
      interact: {
        prompt: (it) => 'Read the sheet' + (it.props.title ? ': ' + it.props.title : ''),
        use(it, game) {
          setFlags(it, game);
          LM.audio.play('ui', { vol: 0.6 });
          page(it, game, it.props.text, it.props.kicker || 'Design', it.props.title || 'A design sheet');
        },
      },
      draw(g, it, t) {
        faceRot(g, it);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(0.5, -9.5, 3, 20);
        g.fillStyle = '#ece6d6';
        g.fillRect(0, -10, 3, 20);
        g.fillStyle = '#c8302a';
        g.beginPath();
        g.arc(1.5, -9, 0.7, 0, U.TAU);
        g.fill();
        // the sketch on it (seen nearly side-on: a few dark strokes)
        g.fillStyle = 'rgba(30,24,20,0.6)';
        const r = U.mulberry32((it.tx * 53 + it.ty * 7) >>> 0);
        for (let i = 0; i < 7; i++) g.fillRect(0.6 + r() * 1.6, -7 + r() * 14, 0.8, 1 + r() * 2);
      },
    },
    'ds-hologram': {
      name: 'Hologram', radius: 10, z: -0.5, dressing: 'Decor', mapColor: HOLO,
      light: { color: HOLO, radius: 140, intensity: 0.3, flicker: 0.25 },
      init(it) {
        it.look = it.look == null ? U.hash2(it.tx, it.ty, 9) * U.TAU : it.look;
        it.flick = 1;
      },
      update(it, dt, game) {
        const P = game.player;
        if (!P) return;
        // only seen from where you can see it (it's light, not a lamp: walls hide it)
        it.seeT = (it.seeT || 0) - dt;
        if (it.seeT <= 0) {
          it.seeT = 0.2;
          it.seen = U.dist(P.x, P.y, it.x, it.y) < 640 && LM.physics.los(game.level, P.x, P.y, it.x, it.y);
        }
        it.show = U.approach(it.show || 0, it.seen ? 1 : 0, dt * 3);
        // it turns, slowly, to look at you
        const want = Math.atan2(P.y - it.y, P.x - it.x);
        const d = U.dist(P.x, P.y, it.x, it.y);
        if (d < 420) it.look += U.angDiff(it.look, want) * Math.min(1, dt * (d < 160 ? 2.2 : 0.7));
        // flicker: mostly there, sometimes not
        it.flickT = (it.flickT || 0) - dt;
        if (it.flickT <= 0) {
          it.flickT = U.rand(0.05, 0.9);
          it.flick = Math.random() < 0.18 ? U.rand(0.1, 0.5) : U.rand(0.8, 1);
        }
        // the one that comes at you
        if (it.props.lunge && !it.lunged && d < (it.props.near || 96) && !P.dead) {
          it.lunged = true;
          it.lungeT = 0.5;
          LM.audio.play('holoLunge', { vol: 1 });
          game.addShake(0.4);
          game.toast(it.props.lungeText || 'It comes at you, and goes straight through you. It was only light.', 'warn');
        }
        if (it.lungeT > 0) it.lungeT -= dt;
      },
      draw(g, it) {
        // the projector: a black disc with a ring of lenses
        g.fillStyle = '#121316';
        g.beginPath();
        g.arc(0, 0, 9, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a2c31';
        g.beginPath();
        g.arc(0, 0, 7.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#0a0a0c';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          g.beginPath();
          g.arc(Math.cos(a) * 5, Math.sin(a) * 5, 1.1, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        const k = (it.flick == null ? 1 : it.flick) * (it.show || 0);
        if (k <= 0.01) return;
        const lunge = it.lungeT > 0 ? Math.sin((1 - it.lungeT / 0.5) * Math.PI) : 0;
        // the cone of light up from the disc
        G.glow(g, 0, 0, 14, HOLO, 0.35 * k);
        g.save();
        g.rotate(it.look + Math.PI / 2);
        g.translate(0, -lunge * 46);
        const s = (it.props.scale || 1.6) * (1 + lunge * 1.4);
        g.scale(s, s);
        g.globalAlpha *= 0.75 * k;
        const shape = SHAPES[it.props.shape] || SHAPES.mouth;
        const col = it.props.shape === 'jester' || it.props.shape === 'mouth' ? HOLO2 : HOLO;
        g.strokeStyle = col;
        g.fillStyle = col;
        g.lineWidth = 1.2;
        shape(g, t + it.tx, k);
        // scan lines through it
        g.globalAlpha *= 0.35;
        g.fillStyle = '#ffffff';
        const off = (t * 20) % 4;
        for (let y = -18; y < 16; y += 4) g.fillRect(-16, y + off, 32, 0.4);
        g.restore();
        G.glow(g, 0, 0, 34 * (1 + lunge), col, 0.12 * k);
      },
    },

    // ========================================================== the Nursery
    'ds-kid-bed': {
      name: 'Child’s bed', solid: 'rect', radius: 16, dressing: 'Furniture',
      init(it) {
        anchor(it, 1, 2);
        setBox(it, 26, 58, 0, 0);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => it.props.prompt || (it.props.lump ? 'Look at who’s in the bed' : 'Look at the bed'),
        use(it, game) {
          setFlags(it, game);
          say(it.props.title || 'The bed', textOf(it.props.text, game), it.props.kicker || 'The Nursery');
        },
      },
      draw(g, it, t) {
        g.rotate(rot(it));
        // a white wooden frame; headboard at the north end, a carved moon on it
        g.fillStyle = '#e8e2d6';
        G.roundRect(g, -13, -29, 26, 58, 2);
        g.fill();
        g.fillStyle = '#c8bfae';
        g.fillRect(-13, -29, 26, 4);
        g.fillStyle = '#f0e6c0';
        g.beginPath();
        g.arc(0, -27, 2.4, 0, U.TAU);
        g.fill();
        // the pillow
        g.fillStyle = '#f4f2ee';
        G.roundRect(g, -9, -24, 18, 8, 3);
        g.fill();
        // the duvet: navy, with stars
        g.fillStyle = '#2e3a6a';
        G.roundRect(g, -12, -16, 24, 43, 3);
        g.fill();
        g.fillStyle = 'rgba(240,226,160,0.7)';
        const r = U.mulberry32((it.tx * 31 + it.ty * 7) >>> 0);
        for (let i = 0; i < 9; i++) g.fillRect(-10 + r() * 20, -14 + r() * 38, 1.2, 1.2);
        if (it.props.lump) {
          // somebody grown, in a bed far too small: knees up, feet over the end
          const p = it.props.lump;
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.beginPath();
          g.ellipse(0, -2, 9, 14, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = '#3a4878';
          g.beginPath();
          g.ellipse(-1, 6, 8, 6, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = p.skin || '#d8b090';
          g.beginPath();
          g.arc(0, -19, 4.4, 0, U.TAU);
          g.fill();
          g.fillStyle = p.hair || '#3a2418';
          g.beginPath();
          g.arc(0, -20.5, 4.2, Math.PI, U.TAU);
          g.fill();
          // the feet, bare, out of the end
          g.fillStyle = p.skin || '#d8b090';
          g.beginPath();
          g.ellipse(-3, 29, 2, 3, 0, 0, U.TAU);
          g.ellipse(3, 29, 2, 3, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(80,10,10,0.6)';
          g.beginPath();
          g.ellipse(5, 2, 4, 6, 0.4, 0, U.TAU);
          g.fill();
        }
        // the dark under the edge
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(12, -16, 2.5, 44);
        g.fillRect(-14.5, -16, 2.5, 44);
      },
      drawGlow(g, it, t, game) {
        if (!it.props.eyes || (game && it.props.until && game.hasFlag(it.props.until))) return;
        if (!game || !near(game, it, 220)) return;
        // two small lights in the dark under the bed, that blink
        if (Math.sin(t * 0.9 + it.tx) > 0.85) return;
        g.rotate(rot(it));
        const side = it.props.eyes === 'w' ? -1 : 1;
        for (const dy of [3, 7]) {
          g.fillStyle = 'rgba(255,240,200,0.9)';
          g.beginPath();
          g.arc(side * 13.5, dy, 0.6, 0, U.TAU);
          g.fill();
          G.glow(g, side * 13.5, dy, 3, '#fff0c0', 0.5);
        }
      },
    },
    'ds-nightlight': {
      name: 'Nightlight', radius: 5, solid: true, dressing: 'Lights',
      light: { color: '#ffe8a0', radius: 170, intensity: 0.45, flicker: 0.02 },
      draw(g, it) {
        g.fillStyle = '#e8e2d6';
        g.fillRect(-1, 1, 2, 4);
        g.fillStyle = it.light && it.light.off ? '#5a5640' : '#f6eecc';
        g.beginPath();
        g.arc(0, -1, 4, 0, U.TAU);
        g.fill();
        g.fillStyle = it.light && it.light.off ? '#3a3828' : '#d8c890';
        g.beginPath();
        g.arc(1.6, -2, 3.2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (it.light && it.light.off) return;
        G.glow(g, 0, -1, 20, '#ffe8a0', 0.4 + 0.04 * Math.sin(t * 2));
      },
    },
    'ds-toy-box': {
      name: 'Toy box', solid: 'rect', radius: 10, dressing: 'Furniture',
      init(it) {
        setBox(it, 22, 14, 0, 0);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Look in the toy box',
        use: (it, game) => {
          it.opened = true;
          say(it.props.title || 'The toy box', textOf(it.props.text, game), it.props.kicker || 'The Nursery');
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#5a7ab8';
        g.fillRect(-11, -7, 22, 14);
        g.fillStyle = '#e8c84a';
        g.fillRect(-11, -7, 22, 2);
        g.fillStyle = '#f2ece2';
        for (let i = 0; i < 3; i++) g.fillRect(-8 + i * 6, -2, 4, 4);
        g.fillStyle = '#c8302a';
        g.fillRect(-7, -1, 2, 2);
        g.fillRect(-1, -1, 2, 2);
        g.fillRect(5, -1, 2, 2);
        if (it.opened) {
          g.fillStyle = 'rgba(0,0,0,0.5)';
          g.fillRect(-10, -6, 20, 4);
          g.fillStyle = '#c8a070';
          g.beginPath();
          g.arc(-12, 9, 2.6, 0, U.TAU);
          g.fill();
        }
      },
    },
    'ds-rocking-horse': {
      name: 'Rocking horse', solid: true, radius: 8, dressing: 'Furniture',
      update(it, dt, game) {
        // it rocks: more when you're near
        const k = near(game, it, 160) ? 1 : 0.35;
        it.rockT = (it.rockT || 0) + dt * (1.6 + k);
        it.rock = Math.sin(it.rockT) * 0.18 * k;
        if (k === 1) {
          it.creakT = (it.creakT || 0) - dt;
          if (it.creakT <= 0) {
            it.creakT = U.rand(2.2, 4);
            LM.audio.play('creak', { vol: game.vol(it.x, it.y) * 0.6, throttle: 0.5 });
          }
        }
      },
      draw(g, it) {
        g.rotate(rot(it) + (it.rock || 0));
        g.strokeStyle = '#7a5030';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-8, -6);
        g.quadraticCurveTo(0, -3, 8, -6);
        g.moveTo(-8, 6);
        g.quadraticCurveTo(0, 3, 8, 6);
        g.stroke();
        g.fillStyle = '#f2ece2';
        G.roundRect(g, -6, -3, 12, 6, 2.5);
        g.fill();
        g.fillStyle = '#c8302a';
        g.fillRect(-2, -3, 3, 6);
        g.fillStyle = '#f2ece2';
        g.beginPath();
        g.ellipse(8, 0, 3.4, 2.2, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#3a2418';
        g.fillRect(5, -2.4, 2, 4.8);
        g.fillStyle = '#1a1010';
        g.beginPath();
        g.arc(9.4, -0.9, 0.5, 0, U.TAU);
        g.arc(9.4, 0.9, 0.5, 0, U.TAU);
        g.fill();
      },
    },
    'ds-mobile': {
      name: 'Mobile', radius: 10, z: 6, shadow: false, dressing: 'Decor',
      draw(g, it, t) {
        g.globalAlpha *= 0.85;
        g.rotate(t * 0.35);
        g.strokeStyle = 'rgba(220,220,220,0.5)';
        g.lineWidth = 0.5;
        g.beginPath();
        g.moveTo(-10, 0);
        g.lineTo(10, 0);
        g.moveTo(0, -10);
        g.lineTo(0, 10);
        g.stroke();
        for (const [x, y, c] of [[-10, 0, '#f0e6a0'], [10, 0, '#a8c8f0'], [0, -10, '#f0b8c8'], [0, 10, '#f0e6a0']]) {
          g.fillStyle = c;
          star4(g, x, y, 2.6);
        }
        g.fillStyle = '#e8e2d6';
        g.beginPath();
        g.arc(0, 0, 1.4, 0, U.TAU);
        g.fill();
      },
    },
    'ds-music-box': {
      name: 'Music box', solid: 'rect', radius: 10, dressing: 'Furniture',
      init(it) {
        setBox(it, 24, 14, 0, 0);
      },
      interact: {
        prompt: () => 'Wind the music box',
        use(it, game) {
          it.windT = 0;
          LM.audio.play('musicBox', { vol: 0.9 });
          if (it.props.flag && !game.hasFlag(it.props.flag)) game.setFlag(it.props.flag);
          if (it.props.text) say(it.props.title || 'The music box', textOf(it.props.text, game), it.props.kicker || 'The Nursery');
        },
      },
      update(it, dt, game) {
        if (game.attract) return;
        const stopped = it.props.until && game.hasFlag(it.props.until);
        if (stopped) {
          if (!it.died) {
            it.died = true;
            LM.audio.play('musicBoxDie', { vol: game.vol(it.x, it.y) });
          }
          return;
        }
        it.windT = (it.windT == null ? 0 : it.windT) - dt;
        if (it.windT > 0 || !near(game, it, 360)) return;
        it.windT = 5.2;
        LM.audio.play('musicBox', { vol: Math.max(0.15, 1 - U.dist(game.player.x, game.player.y, it.x, it.y) / 360) * 0.8, throttle: 1 });
      },
      draw(g, it, t, game) {
        g.rotate(rot(it));
        // a little white dresser, and on it a music box with its lid up
        g.fillStyle = '#e8e2d6';
        g.fillRect(-12, -7, 24, 14);
        g.fillStyle = '#c8bfae';
        g.fillRect(-12, 0, 24, 0.8);
        g.fillStyle = '#b89a60';
        g.fillRect(-12, 3, 24, 0.6);
        g.fillStyle = '#7a3040';
        g.fillRect(-5, -6, 10, 6);
        g.fillStyle = '#c8a060';
        g.fillRect(-5, -9, 10, 3);
        // the dancer on the spindle
        const spin = game && it.props.until && game.hasFlag(it.props.until) ? 0 : t * 2.4;
        g.save();
        g.translate(0, -3);
        g.rotate(spin);
        g.fillStyle = '#f4e8ec';
        g.beginPath();
        g.ellipse(0, 0, 2.4, 1.2, 0, 0, U.TAU);
        g.fill();
        g.restore();
      },
    },

    // ========================================================== the Long Room
    'ds-dining-table': {
      name: 'Dining table', solid: 'rect', radius: 20, dressing: 'Furniture', cache: true,
      cacheRadius: (it) => ((it.props.w || 8) * T) / 2 + 6,
      init(it) {
        const w = it.props.w || 8;
        it.x = it.tx * T + (w * T) / 2;
        it.y = it.ty * T + T;
        it.box = [w * T - 10, 2 * T - 8];
      },
      draw(g, it) {
        const w = (it.props.w || 8) * T - 10, hh = 2 * T - 8;
        // the cloth, and its folds
        g.fillStyle = '#1a100a';
        g.fillRect(-w / 2 - 1, -hh / 2 - 1, w + 2, hh + 2);
        g.fillStyle = '#efe8dc';
        g.fillRect(-w / 2, -hh / 2, w, hh);
        g.fillStyle = 'rgba(0,0,0,0.06)';
        for (let x = -w / 2 + 16; x < w / 2; x += 32) g.fillRect(x, -hh / 2, 1, hh);
        // a red runner down the middle
        g.fillStyle = '#6a1420';
        g.fillRect(-w / 2 + 8, -4, w - 16, 8);
        g.fillStyle = '#c9a046';
        g.fillRect(-w / 2 + 8, -4, w - 16, 0.6);
        g.fillRect(-w / 2 + 8, 3.4, w - 16, 0.6);
        // a place at every seat, both sides: plate, knife and fork, a glass
        const r = U.mulberry32((it.tx * 17 + it.ty * 29) >>> 0);
        for (let x = -w / 2 + T / 2; x < w / 2; x += T) {
          for (const side of [-1, 1]) {
            const y = side * (hh / 2 - 8);
            g.fillStyle = '#f8f6f2';
            g.beginPath();
            g.arc(x, y, 4.6, 0, U.TAU);
            g.fill();
            g.strokeStyle = '#c9a046';
            g.lineWidth = 0.5;
            g.stroke();
            g.fillStyle = '#b8bec6';
            g.fillRect(x - 7, y - 3, 0.8, 6);
            g.fillRect(x + 6.4, y - 3, 0.8, 6);
            g.fillStyle = 'rgba(200,220,230,0.7)';
            g.beginPath();
            g.arc(x + 7, y - side * 5, 1.4, 0, U.TAU);
            g.fill();
            if (r() < 0.35) {
              g.fillStyle = 'rgba(110,10,20,0.45)';
              g.beginPath();
              g.ellipse(x + (r() - 0.5) * 10, y - side * 3, 2 + r() * 3, 1.4 + r() * 2, r() * 3, 0, U.TAU);
              g.fill();
            }
          }
        }
        // candlesticks on the runner
        for (let x = -w / 2 + T * 1.5; x < w / 2 - T; x += T * 3) {
          g.fillStyle = BRASS;
          g.beginPath();
          g.arc(x, 0, 2.4, 0, U.TAU);
          g.fill();
          g.fillStyle = '#f4ecd8';
          g.beginPath();
          g.arc(x, 0, 1.2, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        const w = (it.props.w || 8) * T - 10;
        for (let x = -w / 2 + T * 1.5; x < w / 2 - T; x += T * 3) {
          G.glow(g, x, 0, 16, CANDLE, 0.35 + 0.08 * Math.sin(t * 7 + x));
          G.glow(g, x, 0, 3, '#fff4d0', 0.7);
        }
      },
    },
    'ds-restraint-chair': {
      name: 'Restraint chair', radius: 9, z: -0.5, dressing: 'Furniture', cache: true, cacheRadius: 14,
      cacheKey: (it, game) => (game && it.props.openFlag && game.hasFlag(it.props.openFlag) ? 'open' : 'shut'),
      draw(g, it, t, game) {
        g.rotate(rot(it));
        const open = game && it.props.openFlag && game.hasFlag(it.props.openFlag);
        // a high carved back (behind: the chair faces its dir, so the back is the north side in its frame)
        g.fillStyle = '#2a1810';
        G.roundRect(g, -9, -10, 18, 6, 2);
        g.fill();
        g.fillStyle = '#4a2c1c';
        G.roundRect(g, -8, -9.2, 16, 4.4, 1.6);
        g.fill();
        g.fillStyle = BRASS;
        g.beginPath();
        g.arc(0, -8, 1.2, 0, U.TAU);
        g.fill();
        // the seat, red velvet
        g.fillStyle = '#5a1420';
        G.roundRect(g, -7, -5, 14, 12, 2);
        g.fill();
        // the straps: across the chest and at the wrists; undone, they hang loose
        g.strokeStyle = '#1a1414';
        g.lineWidth = 1.6;
        if (!open) {
          g.beginPath();
          g.moveTo(-8, -1);
          g.lineTo(8, -1);
          g.moveTo(-8, 4);
          g.lineTo(-6, 4);
          g.moveTo(8, 4);
          g.lineTo(6, 4);
          g.stroke();
          g.fillStyle = '#b8bec6';
          g.fillRect(-1, -2, 2, 2);
        } else {
          g.beginPath();
          g.moveTo(-8, -1);
          g.quadraticCurveTo(-12, 3, -10, 8);
          g.moveTo(8, -1);
          g.quadraticCurveTo(12, 4, 11, 9);
          g.stroke();
        }
      },
    },
    'ds-cloche': {
      name: 'Main course', radius: 12, z: 1, reach: 22, dressing: 'Decor', mapColor: '#c9ced4',
      init(it) {
        it.x = it.tx * T + T;
        it.y = it.ty * T + T / 2;
      },
      interact: {
        available: (it, game) => !(it.props.flag && game.hasFlag(it.props.flag)),
        prompt: () => 'Lift the cover',
        use(it, game) {
          LM.audio.play('ui');
          const body = h('div', null, h('p', null, textOf(it.props.text, game) || 'Under the cover there is someone.'));
          LM.ui.open({
            kicker: it.props.kicker || 'The main course', title: it.props.title || 'Under the cover', body,
            actions: [
              {
                label: it.props.cut || 'Cut him loose', primary: true,
                onClick: () => {
                  if (it.props.flag) game.setFlag(it.props.flag);
                  const c = it.props.captive;
                  if (c) {
                    // he rolls off the table on the side nearest the door (props.side: -1 north, 1 south)
                    const side = it.props.side || 1;
                    const e = game.spawnEnemy('ds-captive', it.x, it.y + side * 54, Object.assign({ faction: 'captive' }, c));
                    if (e) {
                      e.spawning = 0;
                      e.mem.loose = 0.6;
                    }
                  }
                  game.toast(it.props.cutText || 'You cut the cord. He rolls off the table and onto the floor.', 'warn');
                },
              },
              { label: 'Put the cover back', quiet: true },
            ],
          });
        },
      },
      draw(g, it, t, game) {
        const lifted = game && it.props.flag && game.hasFlag(it.props.flag);
        // a long silver platter
        g.fillStyle = '#9aa1a8';
        g.beginPath();
        g.ellipse(0, 0, 26, 10, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c9ced4';
        g.beginPath();
        g.ellipse(0, 0, 24.5, 8.6, 0, 0, U.TAU);
        g.fill();
        if (lifted) {
          // a bed of greens with the shape of him pressed into it, and cut cord
          g.fillStyle = '#3a5a2a';
          g.beginPath();
          g.ellipse(0, 0, 20, 6, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.beginPath();
          g.ellipse(2, 0, 15, 4, 0, 0, U.TAU);
          g.fill();
          g.strokeStyle = '#d8c8a0';
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(-14, -3);
          g.lineTo(-10, 2);
          g.moveTo(12, -3);
          g.lineTo(15, 3);
          g.stroke();
          return;
        }
        // the dome, long, with the candles in it
        const grd = g.createLinearGradient(-20, -9, 20, 9);
        grd.addColorStop(0, '#f4f6f8');
        grd.addColorStop(0.45, '#b8bec6');
        grd.addColorStop(1, '#6a7078');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(0, 0, 22, 7.6, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath();
        g.ellipse(-8, -3, 8, 1.6, -0.1, 0, U.TAU);
        g.fill();
        g.fillStyle = '#8a9198';
        g.beginPath();
        g.arc(0, 0, 2.2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t, game) {
        if (game && it.props.flag && game.hasFlag(it.props.flag)) return;
        G.glow(g, -6, -2, 14, CANDLE, 0.12 + 0.04 * Math.sin(t * 6));
      },
    },
    'ds-gong': {
      name: 'Dinner gong', solid: true, radius: 9, dressing: 'Furniture',
      interact: {
        available: (it, game) => !(it.props.flag && game.hasFlag(it.props.flag)),
        prompt: () => 'Strike the gong',
        use(it, game) {
          it.struck = true;
          it.shake = 1.4;
          LM.audio.play('gong', { vol: 1 });
          if (it.props.flag && !game.hasFlag(it.props.flag)) game.setFlag(it.props.flag);
        },
      },
      update(it, dt, game) {
        // rung by anyone else (a trap, the cover lifting), it still rings
        if (!it.struck && it.props.flag && game.hasFlag(it.props.flag)) {
          it.struck = true;
          it.shake = 1.4;
          LM.audio.play('gong', { vol: Math.max(0.4, game.vol(it.x, it.y)) });
        }
        if (it.shake > 0) it.shake -= dt;
      },
      draw(g, it, t) {
        g.rotate(rot(it));
        const sh = it.shake > 0 ? Math.sin(t * 40) * it.shake * 0.8 : 0;
        // a dark wooden frame and the gong hung in it
        g.fillStyle = '#2a1810';
        g.fillRect(-9, -2, 2, 6);
        g.fillRect(7, -2, 2, 6);
        g.fillRect(-9, -3, 18, 2);
        g.fillStyle = '#a8782a';
        g.beginPath();
        g.ellipse(sh, 0, 7, 2.6, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d8a84a';
        g.beginPath();
        g.ellipse(sh, -0.4, 4, 1.4, 0, 0, U.TAU);
        g.fill();
        // the beater
        g.strokeStyle = '#4a2c1c';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(9, 6);
        g.lineTo(13, 10);
        g.stroke();
      },
      drawGlow(g, it) {
        if (it.shake > 0) G.glow(g, 0, 0, 30, '#ffd27a', it.shake * 0.25);
      },
    },
    'ds-place-card': {
      name: 'Place card', radius: 5, z: 1.5, reach: 20, shadow: false, dressing: 'Decor',
      interact: {
        prompt: () => 'Read the card',
        use: (it, game) => say(it.props.title || 'A place card', textOf(it.props.text, game), it.props.kicker || 'The Long Room'),
      },
      draw(g, it) {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.fillRect(-3.4, -1.6, 7.4, 3.6);
        g.fillStyle = '#f8f4ea';
        g.fillRect(-3.6, -2, 7.2, 3.4);
        g.fillStyle = BRASS;
        g.fillRect(-3.6, -2, 7.2, 0.5);
        g.fillStyle = 'rgba(30,20,10,0.6)';
        g.fillRect(-2.4, -0.6, 4.8, 0.6);
      },
    },
    'ds-candelabra': {
      name: 'Candelabrum', solid: true, radius: 6, dressing: 'Lights',
      light: { color: CANDLE, radius: 190, intensity: 0.5, flicker: 0.12 },
      draw(g) {
        g.fillStyle = '#6a5426';
        g.beginPath();
        g.arc(0, 0, 4, 0, U.TAU);
        g.fill();
        g.fillStyle = BRASS;
        for (const [x, y] of [[0, 0], [-4, -2], [4, -2], [0, -5]]) {
          g.beginPath();
          g.arc(x, y, 1.5, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        for (const [x, y] of [[0, 0], [-4, -2], [4, -2], [0, -5]]) G.glow(g, x, y, 7, CANDLE, 0.5 + 0.15 * Math.sin(t * 9 + x));
        G.glow(g, 0, -2, 26, CANDLE, 0.22);
      },
    },

    // ========================================================== the Party Room
    'ds-balloons': {
      name: 'Balloons', radius: 8, z: 3, dressing: 'Decor',
      destructible: {
        hp: 2,
        onBreak(it, game) {
          LM.audio.play('balloonPop', { vol: game.vol(it.x, it.y) });
          game.particles.burst(it.x, it.y - 10, 10, { type: 'dot', color: it.props.colors || ['#ff5ab0', '#5ad0ff', '#ffe04a'], speed: 120, life: 0.4, size: [0.8, 1.6] });
        },
      },
      draw(g, it, t) {
        const cols = it.props.colors || ['#ff5ab0', '#5ad0ff', '#ffe04a', '#8aff6a'];
        // the weight on the floor, and the strings
        g.fillStyle = '#3a3e44';
        g.fillRect(-2, -1, 4, 3);
        g.strokeStyle = 'rgba(230,230,230,0.6)';
        g.lineWidth = 0.4;
        cols.forEach((c, i) => {
          const a = -Math.PI / 2 + (i - (cols.length - 1) / 2) * 0.5 + Math.sin(t * 1.3 + i + it.tx) * 0.08;
          const x = Math.cos(a) * 16, y = Math.sin(a) * 16 - 2;
          g.beginPath();
          g.moveTo(0, 0);
          g.quadraticCurveTo(x * 0.3, y * 0.5, x, y);
          g.stroke();
          g.fillStyle = c;
          g.beginPath();
          g.ellipse(x, y, 5, 6, a + Math.PI / 2, 0, U.TAU);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.4)';
          g.beginPath();
          g.ellipse(x - 1.6, y - 2, 1.2, 2, 0.4, 0, U.TAU);
          g.fill();
        });
      },
    },
    'ds-party-cake': {
      name: 'Birthday cake', solid: true, radius: 10, dressing: 'Furniture',
      light: { color: CANDLE, radius: 120, intensity: 0.4, flicker: 0.15 },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Look at the cake',
        use: (it, game) => say(it.props.title || 'A birthday cake', textOf(it.props.text, game), it.props.kicker || 'The Party Room'),
      },
      draw(g) {
        g.fillStyle = '#f2ece2';
        g.beginPath();
        g.arc(0, 0, 10, 0, U.TAU);
        g.fill();
        g.fillStyle = '#f0b8c8';
        g.beginPath();
        g.arc(0, 0, 7.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#fff4f8';
        g.beginPath();
        g.arc(0, 0, 4.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c8302a';
        g.beginPath();
        g.arc(-2, 1.4, 0.8, 0, U.TAU);
        g.arc(2.4, -1, 0.8, 0, U.TAU);
        g.fill();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * U.TAU;
          g.fillStyle = i % 2 ? '#5ad0ff' : '#ffe04a';
          g.fillRect(Math.cos(a) * 6 - 0.4, Math.sin(a) * 6 - 0.4, 0.8, 0.8);
        }
      },
      drawGlow(g, it, t) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * U.TAU;
          G.glow(g, Math.cos(a) * 6, Math.sin(a) * 6, 3.5, CANDLE, 0.6 + 0.2 * Math.sin(t * 11 + i));
        }
        G.glow(g, 0, 0, 22, CANDLE, 0.2);
      },
    },
    'ds-bunting': {
      name: 'Bunting', radius: 6, wallMounted: true, shadow: false, dressing: 'Walls',
      init(it) {
        const w = it.props.w || 3;
        if (it.face.x) it.y = it.ty * T + (w * T) / 2;
        else it.x = it.tx * T + (w * T) / 2;
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Read the banner',
        use: (it, game) => say(it.props.title || 'A banner', textOf(it.props.text, game), it.props.kicker || 'The Party Room'),
      },
      draw(g, it) {
        faceRot(g, it);
        const W = (it.props.w || 3) * T;
        const cols = ['#ff5ab0', '#5ad0ff', '#ffe04a', '#8aff6a', '#c08aff'];
        g.strokeStyle = 'rgba(240,240,240,0.6)';
        g.lineWidth = 0.5;
        g.beginPath();
        g.moveTo(1, -W / 2);
        g.quadraticCurveTo(4, 0, 1, W / 2);
        g.stroke();
        let i = 0;
        for (let y = -W / 2 + 4; y < W / 2 - 2; y += 6) {
          const sag = 1 + Math.cos((y / W) * Math.PI) * 2.6;
          g.fillStyle = cols[i++ % cols.length];
          g.beginPath();
          g.moveTo(sag, y - 2.4);
          g.lineTo(sag + 5, y);
          g.lineTo(sag, y + 2.4);
          g.closePath();
          g.fill();
        }
      },
    },
    'ds-stage': {
      name: 'Stage', radius: 20, z: -1.5, dressing: 'Furniture', mapColor: '#8a2a3a',
      init(it) {
        const w = it.props.w || 3;
        it.x = it.tx * T + (w * T) / 2;
        it.y = it.ty * T + T;
      },
      draw(g, it, t, game) {
        const w = (it.props.w || 3) * T, hh = 2 * T;
        const open = game && it.props.openFlag && game.hasFlag(it.props.openFlag);
        // boards
        g.fillStyle = '#3a2414';
        g.fillRect(-w / 2, -hh / 2, w, hh);
        for (let y = -hh / 2 + 4; y < hh / 2; y += 5) {
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(-w / 2, y, w, 0.6);
        }
        g.fillStyle = BRASS;
        g.fillRect(-w / 2, hh / 2 - 2, w, 2);
        // the curtain along the back: drawn shut across the stage, or pulled to the sides
        const k = open ? 1 : 0;
        const cw = (w / 2) * (1 - k * 0.8);
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? -w / 2 : w / 2 - cw;
          g.fillStyle = '#7a1424';
          g.fillRect(x0, -hh / 2, cw, open ? 14 : hh * 0.7);
          g.fillStyle = 'rgba(0,0,0,0.3)';
          for (let x = x0 + 3; x < x0 + cw; x += 5) g.fillRect(x, -hh / 2, 1.2, open ? 14 : hh * 0.7);
        }
      },
      drawGlow(g, it, t, game) {
        const w = (it.props.w || 3) * T, hh = 2 * T;
        for (let x = -w / 2 + 8; x < w / 2; x += 16) G.glow(g, x, hh / 2 - 3, 12, '#ffd8a0', 0.3);
      },
    },
    'ds-party-hat': {
      name: 'Party hat', radius: 4, z: -1, dressing: 'Decor',
      draw(g, it) {
        g.rotate(U.hash2(it.tx, it.ty, 2) * U.TAU);
        g.fillStyle = it.props.color || '#ff5ab0';
        g.beginPath();
        g.moveTo(0, -5);
        g.lineTo(3.4, 3);
        g.lineTo(-3.4, 3);
        g.closePath();
        g.fill();
        g.fillStyle = '#ffe04a';
        g.beginPath();
        g.arc(0, -5, 1.2, 0, U.TAU);
        g.fill();
      },
    },
    'ds-jack-box': {
      name: 'Jack-in-the-box', solid: true, radius: 6, dressing: 'Decor',
      update(it, dt, game) {
        if (it.popped || !near(game, it, it.props.near || 72)) {
          if (it.spring > 0) it.spring = Math.max(0, it.spring - dt * 2);
          return;
        }
        it.popped = true;
        it.spring = 1;
        LM.audio.play('jackPop', { vol: 1 });
        game.addShake(0.25);
      },
      draw(g, it, t) {
        g.fillStyle = '#c8302a';
        g.fillRect(-6, -6, 12, 12);
        g.fillStyle = '#ffe04a';
        g.fillRect(-6, -6, 12, 2);
        g.fillStyle = '#2a5ab8';
        g.fillRect(-4, -2, 8, 6);
        if (it.popped) {
          // the lid back, and him on his spring, nodding
          const bob = Math.sin(t * 5) * 2 * (0.4 + (it.spring || 0));
          g.strokeStyle = '#9aa1a8';
          g.lineWidth = 0.7;
          g.beginPath();
          for (let i = 0; i < 6; i++) g.lineTo(Math.sin(i * 2.5) * 2, -6 - i * 1.6 + bob * 0.3);
          g.stroke();
          g.fillStyle = '#f4f0ea';
          g.beginPath();
          g.arc(bob * 0.3, -15 + bob * 0.4, 4.4, 0, U.TAU);
          g.fill();
          g.strokeStyle = '#c8302a';
          g.lineWidth = 0.9;
          g.beginPath();
          g.arc(bob * 0.3, -14.4 + bob * 0.4, 2.6, 0.1 * Math.PI, 0.9 * Math.PI);
          g.stroke();
          g.fillStyle = '#1a1010';
          g.fillRect(bob * 0.3 - 1.8, -16.6 + bob * 0.4, 1, 1);
          g.fillRect(bob * 0.3 + 0.8, -16.6 + bob * 0.4, 1, 1);
        }
      },
    },
    'ds-gift': {
      name: 'Present', solid: true, radius: 7, dressing: 'Decor',
      interact: {
        available: (it) => !it.opened && !!(it.props.loot || it.props.text),
        prompt: () => 'Open the present',
        use(it, game) {
          it.opened = true;
          LM.audio.play('pickup');
          for (const entry of it.props.loot || []) {
            const got = game.grant(entry, { x: it.x, y: it.y + 16 });
            if (got) game.toast(got, 'good');
          }
          if (it.props.text) say(it.props.title || 'The present', textOf(it.props.text, game), it.props.kicker || 'The Party Room');
        },
      },
      draw(g, it) {
        const c = it.props.color || '#5ad0ff';
        g.fillStyle = it.opened ? U.shade(c, -0.3) : c;
        g.fillRect(-6, -6, 12, 12);
        g.fillStyle = '#ffe04a';
        g.fillRect(-1, -6, 2, 12);
        g.fillRect(-6, -1, 12, 2);
        if (!it.opened) {
          g.beginPath();
          g.ellipse(-2, -6, 2.4, 1.2, -0.5, 0, U.TAU);
          g.ellipse(2, -6, 2.4, 1.2, 0.5, 0, U.TAU);
          g.fill();
        } else {
          g.fillStyle = 'rgba(0,0,0,0.5)';
          g.fillRect(-5, -5, 10, 10);
        }
      },
    },
  };

  // ------------------------------------------------------------ sounds
  if (LM.audio && LM.audio.define) {
    const S = LM.audio.define;
    S('musicBox', (t, o, opt, kit) => {
      // a lullaby on a comb of tines, a little out of tune and getting slower
      const notes = [784, 659, 698, 587, 659, 523, 587, 494];
      notes.forEach((f, i) => kit.tone(t + i * (0.32 + i * 0.012), o, { type: 'sine', f0: f * (1 - i * 0.002), f1: f * 0.995, dur: 0.6, gain: 0.05, attack: 0.004 }));
      notes.forEach((f, i) => kit.tone(t + i * (0.32 + i * 0.012), o, { type: 'triangle', f0: f * 2, f1: f * 2, dur: 0.18, gain: 0.012, attack: 0.002 }));
    });
    S('musicBoxDie', (t, o, opt, kit) => {
      [659, 587, 523, 494].forEach((f, i) => kit.tone(t + i * (0.5 + i * 0.3), o, { type: 'sine', f0: f, f1: f * 0.97, dur: 0.7, gain: 0.05 - i * 0.008, attack: 0.004 }));
    });
    S('creak', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 700, freqEnd: 420, dur: 0.35, gain: 0.06, q: 6, attack: 0.05 });
    });
    S('gong', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 110, f1: 104, dur: 3.2, gain: 0.3, attack: 0.005 });
      kit.tone(t, o, { type: 'sine', f0: 263, f1: 250, dur: 2.4, gain: 0.12, attack: 0.005 });
      kit.tone(t, o, { type: 'sine', f0: 411, f1: 398, dur: 1.8, gain: 0.07, attack: 0.005 });
      kit.noise(t, o, { type: 'bandpass', freq: 1800, dur: 0.6, gain: 0.06, q: 2 });
    });
    S('balloonPop', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 1200, dur: 0.06, gain: 0.3 });
    });
    S('jackPop', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'square', f0: 330, f1: 990, dur: 0.12, gain: 0.08 });
      kit.noise(t, o, { type: 'bandpass', freq: 2200, dur: 0.1, gain: 0.12, q: 3 });
      [523, 659, 784].forEach((f, i) => kit.tone(t + 0.14 + i * 0.09, o, { type: 'triangle', f0: f, f1: f, dur: 0.12, gain: 0.05 }));
    });
    S('holoLunge', (t, o, opt, kit) => {
      // a scream made of static
      kit.noise(t, o, { type: 'bandpass', freq: 1400, freqEnd: 3600, dur: 0.5, gain: 0.32, q: 1.2 });
      kit.tone(t, o, { type: 'sawtooth', f0: 520, f1: 1300, dur: 0.45, gain: 0.08, detune: 30 });
      kit.tone(t, o, { type: 'sawtooth', f0: 380, f1: 900, dur: 0.45, gain: 0.06 });
    });
    S('dreamPlay', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 600, dur: 1.2, gain: 0.05, attack: 0.3 });
      kit.tone(t, o, { type: 'sine', f0: 220, f1: 196, dur: 1.2, gain: 0.03, attack: 0.4 });
    });
  }

  LM.definePack({ id: 'ds-lab', items });
})();
