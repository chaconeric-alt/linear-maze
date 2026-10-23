/* Dead Signal — packs/ds-arsenal/aegis.js
 * The AEGIS field: what ARIADNE sends up the dead freight shaft on Floor 4 (DESIGN.md section 4.4).
 *   gadgets   ds-aegis (a personal containment field: always on, no slot, worn over whatever armour you
 *             have. A strong shield that comes back fast, damage taken off whatever gets through,
 *             grips that slide off. When a hit would kill you it overloads instead: you live, everything
 *             near you is thrown off, and it takes a while to come back)
 *   items     ds-aegis-case (the hard case it comes in; open it to put the field on)
 *
 * Every number that sets how strong it is lives in TUNE below, for balancing later.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const BLUE = '#7fd4ff', rgba = (a) => 'rgba(127,212,255,' + U.clamp(a, 0, 1).toFixed(3) + ')';

  // ------------------------------------------------------------ the knobs
  const TUNE = {
    shield: 120, // field strength: shield points, on top of anything you wear
    regen: 45, // points a second while it recharges
    delay: 1.2, // seconds after a hit before it starts to recharge (normally 2.5)
    armor: 0.2, // fraction taken off whatever gets through the field
    resist: { held: 1, staggered: 0.6, burning: 0.5 }, // grips slide off; knocks and fire matter less
    overload: {
      hp: 0.4, // when a hit would kill you: you're left with this much of your health
      invuln: 2.5, // seconds nothing can hurt you
      radius: 150, // the blast that throws everything off you
      damage: 40,
      push: 420,
      stagger: 1.4, // seconds what's thrown off can't move or bite
      cooldown: 60, // seconds before it can do it again
    },
  };
  LM.DS = LM.DS || {};
  LM.DS.AEGIS = TUNE;

  const data = (P) => P.data.aegis || (P.data.aegis = { cd: 0 });
  const BAD = ['held', 'staggered', 'burning', 'chilled', 'sedated', 'spores', 'infected'];

  // the overload's ring, thrown outward
  function Ring(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.t = 0;
  }
  Ring.prototype.update = function (dt) {
    this.t += dt;
    return this.t > 0.7;
  };
  Ring.prototype.drawGlow = function (g) {
    const k = this.t / 0.7, e = U.ease && U.ease.outCubic ? U.ease.outCubic(k) : 1 - Math.pow(1 - k, 3);
    const r = 14 + e * this.r;
    G.glow(g, this.x, this.y, r, BLUE, 0.35 * (1 - k));
    g.strokeStyle = 'rgba(220,245,255,' + (0.9 * (1 - k)).toFixed(3) + ')';
    g.lineWidth = 3 * (1 - k) + 0.5;
    g.beginPath();
    g.arc(this.x, this.y, r, 0, U.TAU);
    g.stroke();
  };

  const gadgets = {
    'ds-aegis': {
      name: 'AEGIS field', short: 'AEGIS',
      desc: 'A personal containment field from the sub-level, sent up by ARIADNE.',
      mods: { maxShield: TUNE.shield, shieldRegen: TUNE.regen, armor: TUNE.armor },
      resist: TUNE.resist,
      shieldRing: false,
      // the chip counts down while it mends after an overload
      badge: (game, P) => Math.ceil(data(P).cd || 0),
      update(game, P, dt) {
        const d = data(P);
        if (d.cd > 0) {
          d.cd = Math.max(0, d.cd - dt);
          if (d.cd === 0) {
            LM.audio.play('aegisReady');
            game.toast('The AEGIS field is whole again.', 'good');
          }
        }
        // it comes back sooner than a vest's shield does
        if (P.shieldDelay > TUNE.delay) P.shieldDelay = TUNE.delay;
        // a crackle when it gives way
        const up = P.shield > 0.5;
        if (d.up && !up) LM.audio.play('aegisDown');
        d.up = up;
      },
      lastStand(game, P) {
        const d = data(P), O = TUNE.overload;
        if (d.cd > 0) return false;
        d.cd = O.cooldown;
        const st = P.stats();
        P.hp = Math.max(1, Math.round(st.maxHp * O.hp));
        P.shield = 0;
        P.invuln = Math.max(P.invuln || 0, O.invuln);
        d.burst = game.time;
        if (LM.status) for (const id of BAD) LM.status.clear(game, P, id);
        // everything near you is thrown off
        for (const e of game.enemies) {
          if (e.dead || (e.spawning || 0) > 0) continue;
          if (LM.factions && !LM.factions.hostile('player', e.faction)) continue;
          const dx = e.x - P.x, dy = e.y - P.y, dd = Math.hypot(dx, dy) || 1;
          if (dd > O.radius + (e.r || 10)) continue;
          const k = 1 - 0.5 * Math.min(1, dd / O.radius);
          LM.combat.hurt(game, e, O.damage * k, { source: 'player', type: 'blast', kx: (dx / dd) * O.push * k, ky: (dy / dd) * O.push * k });
          // knocked senseless for a moment (less, or not at all, for what shrugs off a stagger)
          if (!e.dead) {
            const res = (e.def.resist && (e.def.resist.staggered || e.def.resist.stunned)) || 0;
            if (res < 1) e.stunned = Math.max(e.stunned || 0, O.stagger * (1 - res));
          }
        }
        game.fx.push(new Ring(P.x, P.y, O.radius));
        game.particles.burst(P.x, P.y, 26, { type: 'dot', color: BLUE, speed: 280, life: 0.5, size: [0.8, 2], drag: 3 });
        game.addShake(0.6);
        game.hitStop = Math.max(game.hitStop || 0, 0.12);
        LM.audio.play('aegisOverload');
        game.toast('The AEGIS field overloads. It took that for you.', 'good');
        if (!game.hasFlag('aegisSaved')) game.setFlag('aegisSaved');
        return true;
      },
      drawAura(g, P, game, t) {
        if (P.dead) return;
        const st = P.stats(), d = data(P);
        const k = st.maxShield > 0 ? U.clamp(P.shield / st.maxShield, 0, 1) : 0;
        const hit = Math.min(1, (P.shieldFlash || 0) * 4);
        const R = P.r + 9, x = P.x, y = P.y;
        // just overloaded: a white-hot shell while nothing can touch you
        const since = d.burst != null ? game.time - d.burst : 99;
        if (since >= 0 && since < TUNE.overload.invuln) {
          const f = 1 - since / TUNE.overload.invuln;
          G.glow(g, x, y, R + 16, '#dff6ff', 0.25 * f + 0.08 * Math.sin(t * 30));
          g.strokeStyle = 'rgba(235,250,255,' + (0.4 + 0.5 * f).toFixed(3) + ')';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(x, y, R + 2, 0, U.TAU);
          g.stroke();
          return;
        }
        if (k <= 0.02) {
          // down: a broken outline that stutters while it recharges
          if (Math.sin(t * 37) > 0.2) {
            g.strokeStyle = rgba(0.22);
            g.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
              const a = t * 0.8 + i * (U.TAU / 6);
              g.beginPath();
              g.arc(x, y, R, a, a + 0.35);
              g.stroke();
            }
          }
          return;
        }
        const flick = k < 0.3 ? 0.6 + 0.4 * Math.sin(t * 40) : 1;
        G.glow(g, x, y, R + 12, BLUE, (0.05 + 0.1 * k + 0.3 * hit) * flick);
        g.strokeStyle = rgba((0.16 + 0.3 * k + 0.5 * hit) * flick);
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, R, 0, U.TAU);
        g.stroke();
        // six brighter facets, turning slowly
        g.strokeStyle = rgba((0.25 + 0.45 * k + 0.3 * hit) * flick);
        g.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = t * 0.6 + i * (U.TAU / 6);
          g.beginPath();
          g.arc(x, y, R, a, a + 0.42);
          g.stroke();
        }
      },
      drawIcon(g, W, H) {
        const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.36;
        G.glow(g, cx, cy, r * 1.4, BLUE, 0.35);
        g.strokeStyle = BLUE;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, r, 0, U.TAU);
        g.stroke();
        g.fillStyle = '#dff6ff';
        g.beginPath();
        g.arc(cx, cy, r * 0.28, 0, U.TAU);
        g.fill();
      },
    },
  };

  // ------------------------------------------------------------ the case
  function caseShape(g, open, t) {
    // a hard grey case, a little longer than it is wide
    g.fillStyle = 'rgba(0,0,0,0.35)';
    G.roundRect(g, -14, -9, 29, 20, 4);
    g.fill();
    g.fillStyle = '#2b3036';
    G.roundRect(g, -15, -10, 30, 20, 4);
    g.fill();
    g.strokeStyle = '#4a525a';
    g.lineWidth = 1;
    g.stroke();
    if (open) {
      // lid thrown back; the foam inside, with the shape of what was in it
      g.fillStyle = '#1a1d21';
      G.roundRect(g, -13, -8, 26, 16, 3);
      g.fill();
      g.fillStyle = '#0c0d0f';
      g.beginPath();
      g.ellipse(-3, 0, 7, 5, 0, 0, U.TAU);
      g.fill();
      g.fillRect(4, -2, 7, 4);
      g.fillStyle = '#3a4048';
      g.fillRect(-15, -13, 30, 3);
      return;
    }
    // ribs, latches, and ARIADNE's eye on the lid
    g.fillStyle = '#3a4148';
    g.fillRect(-15, -4, 30, 1);
    g.fillRect(-15, 3, 30, 1);
    g.fillStyle = '#9aa3ab';
    g.fillRect(-12, 8, 4, 2);
    g.fillRect(8, 8, 4, 2);
    g.fillStyle = '#10161b';
    g.beginPath();
    g.ellipse(0, 0, 6, 3.6, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = BLUE;
    g.beginPath();
    g.arc(0, 0, 1.9 + 0.3 * Math.sin(t * 2.2), 0, U.TAU);
    g.fill();
  }

  const items = {
    'ds-aegis-case': {
      name: 'Hard case', radius: 13, dressing: false, mapColor: BLUE, mapAlways: true,
      light: { color: BLUE, radius: 110, intensity: 0.45, flicker: 0.03 },
      // an opened case (remembered by the floor) has no light left in it
      update(it) {
        if (it.opened && it.light && !it.light.off) it.light.off = true;
      },
      interact: {
        available: (it) => !it.opened,
        prompt: () => 'Open the case',
        use(it, game) {
          const P = game.player;
          LM.audio.play('ui');
          const g = gadgets['ds-aegis'], O = TUNE.overload;
          const have = P.hasGadget('ds-aegis');
          const body = h('div', null,
            h('p', { class: 'lore' }, it.props.text || 'Grey foam, and in it a harness: two flat plates on webbing, one for your chest and one for your back, joined by a cable that is warm to the touch. A sticker on the lid: AEGIS · PERSONAL CONTAINMENT · SUB-LEVEL B · NOT FOR USE ABOVE B.\n\nSomeone has scratched a new line into the foam, very neatly: FOR T. LARK.'),
            LM.ui.modList(g.mods),
            h('p', { class: 'muted' }, 'Worn over whatever armour you have: it takes no slot. Grips slide off it, and knocks and fire matter less. When a hit would kill you, the field overloads instead: you live, and everything near you is thrown off. Then it needs ' + O.cooldown + ' seconds to mend.'));
          LM.ui.open({
            kicker: it.props.kicker || 'Freight car', title: it.props.title || 'AEGIS', body,
            actions: [
              {
                label: 'Put it on', primary: true, key: 'E',
                onClick: () => {
                  if (!have) {
                    P.gadgets.push('ds-aegis');
                    P.statsDirty = true;
                    P.stats();
                    P.shieldDelay = 0;
                  }
                  it.opened = true;
                  if (it.light) it.light.off = true;
                  LM.audio.play('aegisOn');
                  game.particles.burst(P.x, P.y, 14, { type: 'dot', color: BLUE, speed: 120, life: 0.6, size: [0.6, 1.4], drag: 4 });
                  game.toast('The plates hum, and the air round you goes tight.', 'good');
                  if (it.props.flag && !game.hasFlag(it.props.flag)) game.setFlag(it.props.flag);
                  if (!game.hasFlag('aegisWorn')) game.setFlag('aegisWorn');
                },
              },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g, it, t) {
        caseShape(g, !!it.opened, t);
      },
      drawGlow(g, it, t) {
        if (it.opened) return;
        G.glow(g, 0, 0, 28, BLUE, 0.22 + 0.08 * Math.sin(t * 2.2));
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('aegisOn', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 180, f1: 720, dur: 0.6, gain: 0.12, attack: 0.05 });
      kit.tone(t + 0.1, o, { type: 'triangle', f0: 360, f1: 1440, dur: 0.5, gain: 0.04, attack: 0.05 });
      kit.noise(t, o, { type: 'bandpass', freq: 2400, dur: 0.5, gain: 0.03, q: 4 });
    });
    LM.audio.define('aegisOverload', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 120, f1: 40, dur: 0.7, gain: 0.3 });
      kit.noise(t, o, { type: 'lowpass', freq: 1400, freqEnd: 200, dur: 0.6, gain: 0.2 });
      kit.tone(t + 0.05, o, { type: 'sawtooth', f0: 900, f1: 2400, dur: 0.35, gain: 0.04 });
    });
    LM.audio.define('aegisDown', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 3000, dur: 0.25, gain: 0.06 });
      kit.tone(t, o, { type: 'square', f0: 420, f1: 90, dur: 0.25, gain: 0.03 });
    });
    LM.audio.define('aegisReady', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 660, dur: 0.12, gain: 0.07 });
      kit.tone(t + 0.12, o, { type: 'sine', f0: 990, dur: 0.2, gain: 0.07 });
    });
  }

  LM.definePack({ id: 'ds-arsenal', gadgets, items });
})();
