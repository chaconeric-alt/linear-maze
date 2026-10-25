/* Dead Signal — packs/ds-story/shelter.js
 * Floor 2's story pieces: the evacuation that sent everyone to Shelter B, and what was waiting there.
 *
 *   ds-guide-light       a strip of green evacuation lights in the floor; props.dir points the way
 *                        ('n' | 'e' | 's' | 'w'); they go dark when props.off is set (default shelterOpen)
 *   ds-shelter-sign      a lit wall sign: props.label (SHELTER B), props.arrow ('l' | 'r' | 'u' | 'd')
 *   ds-pa-speaker        a ceiling speaker that lights up while the building PA talks
 *   ds-pa-loop           (invisible) the PA's recorded announcement: props.lines said in turn, one every
 *                        props.every seconds (when nobody else is talking), until props.until is set
 *   ds-shelter-panel     Shelter B's door panel: says why it's sealed; with the supervisor's override
 *                        (flag shelterOverride) it opens the shelter (flag shelterOpen)
 *   ds-quarantine-lever  the quarantine release inside the shelter: pulled while the Congregation is
 *                        alive it sets releasePulled (the klaxon wakes it); once it's dead
 *                        (congregationDead), or if it was pulled before, quarantineLifted
 *   ds-keycard           a card you pick up and carry (a key item): props.key, name, text, flag, color
 * Speaker: docent (the Discovery Center's tour guide).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);
  const { faceRot, housing, textOf } = DS.dress;
  const GREEN = '#5fe08a';
  const DIRS = { n: -Math.PI / 2, e: 0, s: Math.PI / 2, w: Math.PI };

  const speakers = {
    docent: { name: 'DOCENT-3', role: 'Guided tours · Discovery Center', color: '#7fd0c8', face: 'screen', voice: 1.3 },
  };

  const lightsOut = (it, game) => !!(game && game.hasFlag(it.props.off || 'shelterOpen'));
  const items = {
    'ds-guide-light': {
      name: 'Guide lights', radius: 6, z: -3, shadow: false, dressing: 'Lights',
      draw(g, it) {
        g.rotate(DIRS[it.props.dir || 'e'] || 0);
        g.fillStyle = '#1a1e22';
        g.fillRect(-15, -2.2, 30, 4.4);
        g.fillStyle = '#2c3a30';
        for (let i = -12; i <= 12; i += 6) g.fillRect(i - 1, -1.2, 2, 2.4);
      },
      drawGlow(g, it, t, game) {
        g.rotate(DIRS[it.props.dir || 'e'] || 0);
        if (lightsOut(it, game)) return;
        // the lights chase along the strip in the direction to go
        const ph = (t * 1.6 + (it.tx + it.ty) * 0.2) % 1;
        for (let i = 0; i < 5; i++) {
          const x = -12 + i * 6;
          const k = Math.max(0, 1 - Math.abs(((i / 5 - ph + 1) % 1) - 0.5) * 3);
          G.glow(g, x, 0, 6, GREEN, 0.18 + k * 0.5);
          G.circle(g, x, 0, 0.9, '#c8ffd8');
        }
        G.glow(g, 0, 0, 22, GREEN, 0.06);
      },
    },

    'ds-shelter-sign': {
      name: 'Shelter sign', radius: 6, wallMounted: true, shadow: false, dressing: 'Lights',
      light: { color: GREEN, radius: 110, intensity: 0.34, flicker: 0 },
      interact: {
        available: (it) => !!it.props.text,
        prompt: () => 'Read the sign',
        use: (it, game) => LM.ui.showText(it.props.title || it.props.label || 'SHELTER B', textOf(it.props.text, game), 'Sign'),
      },
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -12, 3, 24, '#1c2420');
      },
      drawGlow(g, it, t) {
        faceRot(g, it);
        g.fillStyle = 'rgba(95,224,138,0.85)';
        g.fillRect(2.4, -11, 1, 22);
        // the arrow, drawn on the floor in front of the sign as the light it throws
        const a = { l: Math.PI / 2, r: -Math.PI / 2, u: Math.PI, d: 0 }[it.props.arrow];
        G.glow(g, 6, 0, 18, GREEN, 0.3);
        if (a == null) return;
        g.save();
        g.translate(9, 0);
        g.rotate(a);
        g.strokeStyle = 'rgba(150,255,190,0.55)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-4, -2);
        g.lineTo(0, 3);
        g.lineTo(4, -2);
        g.stroke();
        g.restore();
      },
    },

    'ds-pa-speaker': {
      name: 'PA speaker', radius: 5, wallMounted: true, shadow: false, dressing: 'Walls',
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -5, 3, 10, '#d8dcdf');
        g.fillStyle = '#2a2e33';
        for (let i = -3.5; i <= 3; i += 1.6) g.fillRect(1.2, i, 1.4, 0.8);
      },
      drawGlow(g, it, t) {
        if (!LM.comms || LM.comms.speaking() !== 'pa') return;
        faceRot(g, it);
        DS.led(g, 2.6, 4, '#e8ecee', 0.5 + 0.4 * Math.abs(Math.sin(t * 12)), 0.7);
        G.glow(g, 8, 0, 16, '#e8ecee', 0.08);
      },
    },

    'ds-pa-loop': {
      name: 'PA announcement', radius: 4, shadow: false, dressing: 'Decor',
      init(it) {
        it.next = it.props.first == null ? 6 : +it.props.first;
        it.line = it.line || 0;
      },
      update(it, dt, game) {
        if (!LM.comms || game.attract || !game.player) return;
        if (it.props.until && game.hasFlag(it.props.until)) return;
        it.next -= dt;
        if (it.next > 0 || LM.comms.busy()) return;
        const lines = it.props.lines || [];
        if (!lines.length) return;
        LM.comms.say({ who: it.props.who || 'pa', text: lines[it.line % lines.length] });
        it.line++;
        it.next = it.props.every || 40;
      },
      draw() {},
    },

    'ds-shelter-panel': {
      name: 'Shelter B door panel', radius: 6, reach: 14, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: '#e0b25a',
      light: { color: '#ffb84a', radius: 70, intensity: 0.3, flicker: 0 },
      interact: {
        prompt: (it, game) => (game.hasFlag('shelterOpen') ? 'Read the door panel' : game.hasFlag('shelterOverride') ? 'Use the supervisor override' : 'Read the door panel'),
        use(it, game) {
          if (!game.hasFlag('shelterOpen') && game.hasFlag('shelterOverride')) {
            game.setFlag('shelterOpen');
            LM.audio.play('key');
            return;
          }
          if (!game.hasFlag('shelterOpen')) game.setFlag('sawShelterPanel');
          const text = game.hasFlag('shelterOpen') ? it.props.openText || it.props.text : it.props.text;
          LM.ui.open({ kicker: 'Shelter B', title: it.props.title || 'Door panel', body: h('div', null, DS.screenText(textOf(text, game) || 'SHELTER B · SEALED')), actions: [{ label: 'Close', primary: true }] });
        },
      },
      draw(g, it) {
        faceRot(g, it);
        housing(g, -0.5, -6, 4, 12, '#2a2e33');
      },
      drawGlow(g, it, t, game) {
        faceRot(g, it);
        const open = game && game.hasFlag('shelterOpen');
        const c = open ? GREEN : '#ffb84a';
        g.fillStyle = U.rgba(c, 0.7);
        g.fillRect(3.4, -4.5, 1, 9);
        G.glow(g, 6, 0, 12, c, 0.25 + (open ? 0 : 0.12 * Math.sin(t * 3)));
      },
    },

    'ds-quarantine-lever': {
      name: 'Quarantine release', radius: 7, reach: 12, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: '#ff6a5a',
      light: { color: '#ff6a5a', radius: 80, intensity: 0.32, flicker: 0 },
      interact: {
        available: (it, game) => !game.hasFlag('quarantineLifted'),
        prompt: () => 'Pull the quarantine release',
        use(it, game) {
          it.pulled = true;
          LM.audio.play('switch');
          if (game.hasFlag('congregationDead')) {
            game.setFlag('quarantineLifted');
            return;
          }
          if (!game.hasFlag('releasePulled')) game.setFlag('releasePulled');
          else game.toast('RELEASE HELD · CONTAMINANT PRESENT', 'warn');
        },
      },
      draw(g, it, t, game) {
        faceRot(g, it);
        housing(g, -0.5, -8, 4, 16, '#3a2a28');
        DS.hazard(g, 0.5, -8, 2.5, 16, 2);
        const down = it.pulled || (game && game.hasFlag('quarantineLifted'));
        g.fillStyle = '#9aa4ab';
        g.fillRect(3, down ? 1 : -6, 7, 2);
        g.fillStyle = '#c8302a';
        g.beginPath();
        g.arc(10, down ? 2 : -5, 2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t, game) {
        faceRot(g, it);
        const done = game && game.hasFlag('quarantineLifted');
        DS.led(g, 2, 6, done ? GREEN : '#ff3a2a', done ? 0.5 : 0.5 + 0.4 * (Math.sin(t * 5) > 0 ? 1 : 0), 0.9);
      },
    },

    'ds-keycard': {
      name: 'A card', radius: 6, mapColor: '#e0b25a', dressing: false,
      interact: {
        prompt: (it) => it.props.prompt || 'Take the card',
        use(it, game) {
          it.remove(game);
          const name = it.props.name || 'Clearance card';
          game.giveKeyItem(it.props.key || it.props.flag || 'card', { name, text: it.props.desc || '', color: it.props.color, flag: it.props.flag });
          LM.audio.play('key');
          LM.ui.showText(it.props.title || name, textOf(it.props.text, game) || name, 'You took: ' + name);
        },
      },
      draw(g, it) {
        g.rotate(0.4);
        g.fillStyle = '#e8ecee';
        G.roundRect(g, -5, -3.5, 10, 7, 1.2);
        g.fill();
        g.fillStyle = it.props.color || '#e0b25a';
        g.fillRect(-5, -3.5, 10, 2);
        g.fillStyle = '#c49a7a';
        g.fillRect(-3.6, -0.6, 2.4, 3);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, it.props.color || '#e0b25a', 0.3 + 0.12 * Math.sin(t * 3));
      },
    },
  };

  LM.definePack({ id: 'ds-story', speakers, items });
})();
