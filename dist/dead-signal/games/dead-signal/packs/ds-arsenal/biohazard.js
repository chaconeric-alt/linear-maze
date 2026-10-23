/* Dead Signal — packs/ds-arsenal/biohazard.js
 * Floor 3's share of the arsenal: what the specimens do to you, what undoes it, and a tool to fight back.
 *   statuses  implanted (a Midwife's clutch: a long countdown, and then they hatch; purge it first),
 *             infected (a Lantern's bile, a Tenant's bite: it burns for a while, and stacks),
 *             burning (the Plasma Cutter: what it touches keeps cooking)
 *   items     ds-purge (a purge injector: it flushes eggs and infection, so you only take it when you need
 *             it), ds-purge-station (a decontamination unit on a wall: a few flushes)
 *   weapons   ds-plasma-cutter (cells: a short hot arc that sets things burning)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const DS = (LM.DS = LM.DS || {});
  const h = (...a) => LM.ui.h(...a);
  const PINK = '#e07ab0', BILE = '#b8d84a', PURGE = '#b48cff', FIRE = '#ff8a3a';

  // ------------------------------------------------------------ the clutch hatching
  function hatch(game, P, n) {
    if (!P || P.dead) return;
    P.invuln = 0;
    game.particles.burst(P.x, P.y, 26, { type: 'dot', color: ['#8e1d1d', '#c86a7a', '#e8d0c0'], speed: 210, life: 0.6, size: [1, 2.6], drag: 5 });
    game.renderer.addDecal({ type: 'blood', x: P.x, y: P.y, r: 16, color: '#5e1616' });
    LM.audio.play('hatchBurst', { vol: 1 });
    game.addShake(0.6);
    LM.combat.hurt(game, P, 30 + 10 * n, { source: 'status', type: 'hatch' });
    const count = 2 + n;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * U.TAU + Math.random();
      const x = P.x + Math.cos(a) * 14, y = P.y + Math.sin(a) * 14;
      if (game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) continue;
      game.spawnEnemy('ds-nursery-grub', x, y, { summoned: true, aggro: true });
    }
    game.toast('They come out of you.', 'warn');
  }
  /** Flush eggs and infection out of the player. Returns whether there was anything to flush. */
  DS.purge = function (game, P) {
    const S = LM.status;
    const had = S.has(P, 'implanted') || S.has(P, 'infected');
    if (!had) return false;
    S.clear(game, P, 'implanted');
    S.clear(game, P, 'infected');
    LM.audio.play('purgeHiss');
    game.particles.burst(P.x, P.y, 14, { type: 'ember', color: [PURGE, '#e8dcff'], speed: 70, life: 0.8, size: 1.2, drag: 2 });
    return true;
  };

  const statuses = {
    implanted: {
      name: 'Implanted', seconds: 90, countdown: true, urgent: 20, stack: 4, keep: true, color: PINK, only: 'player',
      onApply(game, P) {
        game.toast('It put something in you. Find a purge station.', 'warn');
      },
      update(game, P, s, dt) {
        const k = U.clamp(1 - s.t / (s.max || 90), 0, 1);
        s.beat = (s.beat == null ? 1 : s.beat) - dt;
        if (s.beat <= 0) {
          s.beat = U.lerp(2.4, 0.42, k);
          LM.audio.play('implantPulse', { vol: 0.3 + k * 0.55, throttle: 0.2 });
          if (k > 0.55) game.addShake(0.02 + k * 0.05);
          if (k > 0.3) P.hurtFlash = Math.min(1, (P.hurtFlash || 0) + 0.05 + k * 0.08);
        }
        const note = (at, text) => {
          if (!s['n' + at] && s.t <= at) {
            s['n' + at] = true;
            game.toast(text, 'warn');
          }
        };
        note(60, 'Something shifts under your ribs.');
        note(30, 'They’re moving. You can feel them turning over.');
        note(10, 'Purge it. Now.');
      },
      onEnd(game, P, s, reason) {
        if (reason === 'expired') hatch(game, P, s.n || 1);
        else game.toast('The flush burns going in. Whatever was in you goes still.', 'good');
      },
    },
    infected: {
      name: 'Infected', seconds: 12, dps: 2, interval: 1, stack: 3, refresh: true, color: BILE, only: 'player',
      onApply(game) {
        game.toast('The bile burns. It’s getting into the cut.', 'warn');
      },
    },
    burning: { name: 'Burning', seconds: 2, dps: 6, interval: 0.5, color: FIRE },
  };

  // ------------------------------------------------------------ cures
  const items = {
    'ds-purge': {
      name: 'Purge injector', radius: 6, shadowScale: 0.6, bob: true, dressing: false, mapColor: PURGE,
      onTouch(it, game) {
        const P = game.player;
        if (!DS.purge(game, P)) {
          if (!it.hinted) {
            it.hinted = true;
            game.toast('A purge injector. You’d only need it if something got into you.');
          }
          return false;
        }
        game.toast('You jam the injector into your thigh.', 'good');
      },
      draw(g) {
        g.rotate(-0.6);
        g.fillStyle = '#e8ecee';
        G.roundRect(g, -6, -2.4, 10, 4.8, 2);
        g.fill();
        g.fillStyle = PURGE;
        g.fillRect(-3, -2.4, 3, 4.8);
        g.fillStyle = '#5a5e64';
        g.fillRect(4, -0.8, 3, 1.6);
        g.fillStyle = '#c9ced4';
        g.fillRect(7, -0.3, 2, 0.6);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, PURGE, 0.3 + 0.12 * Math.sin(t * 3));
      },
    },
    'ds-purge-station': {
      name: 'Purge station', radius: 7, reach: 12, wallMounted: true, shadow: false, dressing: 'Walls', mapColor: PURGE,
      light: { color: PURGE, radius: 80, intensity: 0.32, flicker: 0 },
      interact: {
        prompt(it) {
          const left = (it.props.charges || 3) - (it.uses || 0);
          return left > 0 ? 'Use the purge station (' + left + ' left)' : 'Read the purge station';
        },
        use(it, game) {
          const left = (it.props.charges || 3) - (it.uses || 0);
          const P = game.player;
          if (left > 0 && DS.purge(game, P)) {
            it.uses = (it.uses || 0) + 1;
            game.toast('The station hisses. A needle, a cold flush, and then nothing moves inside you.', 'good');
            return;
          }
          LM.audio.play('ui');
          LM.ui.open({
            kicker: 'Decontamination', title: 'Purge station',
            body: h('div', null, DS.screenText('ANTHELMINTIC FLUSH · STATION ' + (it.props.n || '3-07') + '\n\nFOR IMPLANTED OR INFECTED STAFF ONLY\nFLUSHES REMAINING: ' + Math.max(0, left) +
              '\n\nIf you have been implanted, do not wait for symptoms.\nThe flush is effective until the last few seconds.\n\n' + (left > 0 ? 'You’re clean. For now.' : 'Empty.'))),
            actions: [{ label: 'Close', primary: true }],
          });
        },
      },
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x));
        g.fillStyle = '#1a1c1f';
        g.fillRect(-1, -9, 6, 18);
        g.fillStyle = '#d8dcdf';
        g.fillRect(-0.5, -8.5, 5, 17);
        g.fillStyle = '#5a4a7a';
        g.fillRect(0.5, -6, 3, 6);
        // the needle arm
        g.fillStyle = '#7d878f';
        g.fillRect(4.5, 2, 3.5, 1.6);
        g.fillStyle = '#c9ced4';
        g.fillRect(8, 2.4, 2.4, 0.8);
      },
      drawGlow(g, it, t) {
        g.rotate(Math.atan2(it.face.y, it.face.x));
        const left = (it.props.charges || 3) - (it.uses || 0);
        DS.led(g, 2, -3, left > 0 ? PURGE : '#ff3a2a', left > 0 ? 0.5 + 0.3 * Math.sin(t * 2.5) : 0.4, 1);
        G.glow(g, 7, 0, 16, PURGE, left > 0 ? 0.12 : 0.03);
      },
    },
  };

  // ------------------------------------------------------------ the Plasma Cutter
  const metal = (g, x, y, w, hh, c) => {
    const grd = g.createLinearGradient(0, y, 0, y + hh);
    grd.addColorStop(0, U.shade(c, 0.3));
    grd.addColorStop(0.5, c);
    grd.addColorStop(1, U.shade(c, -0.4));
    g.fillStyle = grd;
    g.fillRect(x, y, w, hh);
  };
  const weapons = {
    'ds-plasma-cutter': {
      name: 'Plasma Cutter', short: 'Cutter', slot: 5,
      desc: 'A maintenance cutter from the vat hall, for steel plate and the growth vats’ hoops. A short, hot arc: whatever it touches keeps burning for a moment. Takes cells. Hold the trigger down.',
      ammo: 'cells', pickupAmmo: 45, damage: 6, fireRate: 8, spread: 0.05, speed: 640, range: 200, falloff: 0.25, pierce: 1,
      projectile: 'plasma-arc', status: 'burning', knock: 14, recoil: 0.08, kick: 0.018, sound: 'plasmaCut', casing: false,
      flash: FIRE, flashRadius: 80, flashSize: 9, sparks: 2, muzzle: 17, length: 16,
      drawHeld(g, p, k) {
        // an orange tool body, a black grip, a ceramic nozzle with a blue tip
        g.fillStyle = '#1c1c1c';
        g.fillRect(1 - k, -1.8, 5, 4.6);
        g.fillStyle = '#d86a2a';
        G.roundRect(g, 4 - k, -3.2, 9, 6, 1.6);
        g.fill();
        g.fillStyle = '#1c1c1c';
        g.fillRect(8 - k, -3.2, 1.2, 6);
        metal(g, 13 - k, -1.6, 4, 3.2, '#c9c0b0');
        g.fillStyle = '#5ab0ff';
        g.fillRect(17 - k, -0.9, 1.2, 1.8);
      },
    },
  };
  const projectiles = {
    'plasma-arc': {
      radius: 3.5, color: FIRE, wallSparks: 3, sparkColor: '#ffd27a',
      draw() {},
      drawGlow(g, p) {
        const k = Math.min(1, p.traveled / (p.range || 200));
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const tx = p.x - (p.vx / sp) * 12, ty = p.y - (p.vy / sp) * 12;
        g.strokeStyle = 'rgba(255,190,110,' + (0.85 * (1 - k * 0.6)) + ')';
        g.lineWidth = 2.2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(p.x + U.rand(-1, 1), p.y + U.rand(-1, 1));
        g.stroke();
        G.glow(g, p.x, p.y, 10, FIRE, 0.7 * (1 - k * 0.5));
        G.glow(g, p.x, p.y, 4, '#9fd0ff', 0.5);
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('implantPulse', (t, o, opt, kit) => {
      // a wet double heartbeat, too low and too close
      kit.tone(t, o, { type: 'sine', f0: 62, f1: 44, dur: 0.16, gain: 0.32 });
      kit.tone(t + 0.19, o, { type: 'sine', f0: 56, f1: 40, dur: 0.2, gain: 0.26 });
      kit.noise(t + 0.02, o, { type: 'lowpass', freq: 380, dur: 0.12, gain: 0.05 });
    });
    LM.audio.define('hatchBurst', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 900, freqEnd: 200, dur: 0.5, gain: 0.32 });
      for (let i = 0; i < 6; i++) kit.tone(t + 0.1 + i * 0.07, o, { type: 'triangle', f0: 1700 + i * 140, f1: 2400 + i * 90, dur: 0.06, gain: 0.04 });
    });
    LM.audio.define('purgeHiss', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 3000, dur: 0.45, gain: 0.1, attack: 0.02 });
      kit.tone(t, o, { type: 'sine', f0: 900, f1: 300, dur: 0.3, gain: 0.04 });
    });
    LM.audio.define('plasmaCut', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 2600, dur: 0.07, gain: 0.08, q: 2 });
      kit.tone(t, o, { type: 'sawtooth', f0: 120, f1: 90, dur: 0.06, gain: 0.03 });
    });
  }

  LM.definePack({ id: 'ds-arsenal', statuses, items, weapons, projectiles });
})();
