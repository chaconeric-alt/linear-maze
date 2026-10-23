/* Dead Signal — packs/ds-arsenal/proving.js
 * Floor 4's share of the arsenal (the Proving Grounds: DESIGN.md section 4.4).
 *   weapons   ds-incinerator (fuel: a short roaring jet that sets everything it touches burning and goes
 *             through the first few things in its way; the answer to rats)
 *   ammo      fuel (LM.defineAmmo), and its pickup ammo-fuel (a red can)
 *   armor     ds-riot-helmet (head), ds-exo-frame (body), ds-nightlight-charm (trinket), ds-handler-boots
 *             (feet)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const FIRE = '#ff8a3a', FUEL = '#c8301a';

  if (LM.defineAmmo) LM.defineAmmo('fuel', { name: 'Fuel', max: 240, amount: 60, color: '#6a2a10', band: FIRE });

  const metal = (g, x, y, w, hh, c) => {
    const grd = g.createLinearGradient(0, y, 0, y + hh);
    grd.addColorStop(0, U.shade(c, 0.3));
    grd.addColorStop(0.5, c);
    grd.addColorStop(1, U.shade(c, -0.4));
    g.fillStyle = grd;
    g.fillRect(x, y, w, hh);
  };
  const weapons = {
    'ds-incinerator': {
      name: 'Incinerator', short: 'Burner', slot: 6,
      desc: 'Garrick Moss’s answer to a containment breach: a riot-squad flamethrower from the Proving Grounds’ armory, with a tank on the back and HANDLER stencilled on it. A short roaring jet that sets everything it touches burning and goes through the first few things in its way. Takes fuel. Hold the trigger down.',
      ammo: 'fuel', pickupAmmo: 80, damage: 3.4, fireRate: 14, spread: 0.13, speed: 380, range: 215, falloff: 0.2, pierce: 3,
      projectile: 'ds-flame', status: { id: 'burning', seconds: 3 }, knock: 5, recoil: 0.05, kick: 0.012, sound: 'flameJet', casing: false,
      flash: FIRE, flashRadius: 110, flashSize: 10, sparks: 0, muzzle: 19, length: 18,
      drawHeld(g, p, k) {
        // a long black lance with a red fuel line, a pilot light at the tip
        g.fillStyle = '#1c1c1c';
        g.fillRect(0 - k, -2, 6, 4.4);
        metal(g, 5 - k, -2.6, 9, 5.2, '#3a3e44');
        g.fillStyle = FUEL;
        g.fillRect(6 - k, 2.2, 8, 1.2);
        metal(g, 14 - k, -1.4, 5, 2.8, '#8a9198');
        g.fillStyle = '#ffb060';
        g.fillRect(19 - k, -0.7, 1.2, 1.4);
      },
    },
  };
  const projectiles = {
    'ds-flame': {
      radius: 5, color: FIRE, quiet: true, wallSparks: 0,
      light: { r: 90, color: FIRE, intensity: 0.35 },
      draw() {},
      drawGlow(g, p) {
        const k = Math.min(1, p.traveled / (p.range || 215));
        const r = 4 + k * 13;
        G.glow(g, p.x, p.y, r * 1.6, k < 0.5 ? '#ffd27a' : FIRE, 0.55 * (1 - k * 0.7));
        G.glow(g, p.x, p.y, r * 0.6, '#fff0c0', 0.4 * (1 - k));
        if (k > 0.6) G.glow(g, p.x, p.y - 4, r, '#3a2a20', 0.15);
      },
    },
  };

  const armor = {
    'ds-riot-helmet': {
      name: 'Riot Helmet', slot: 'head', color: '#2a2e33', trim: '#c9ced4',
      mods: { armor: 0.08, maxShield: 10 }, resist: { staggered: 0.5, held: 0.5 },
      desc: 'A handler’s helmet from the Long Room, where somebody hung it on the back of the host’s chair: a black shell and a scratched visor with something’s tooth marks across it. Knocks don’t knock you down so long, and grips slip.',
    },
    'ds-exo-frame': {
      name: 'Exo-Frame', slot: 'body', color: '#4a4f55', trim: '#d9a21c',
      mods: { armor: 0.16, maxHp: 30, speed: -12 }, resist: { held: 1, staggered: 0.5 },
      desc: 'A powered frame the handlers wore to hold a Grinner down: steel struts down the back and the legs, a hum in the joints. It makes you slower and very hard to hold. It came off a man at the party who had been made to wear a paper hat.',
    },
    'ds-nightlight-charm': {
      name: 'The Nightlight', slot: 'trinket', color: '#f6eecc', trim: '#2e3a6a', lamp: true,
      mods: { lightRadius: 170, maxShield: 10, shieldRegen: 3 }, resist: { held: 0.5 },
      desc: 'The Nursery’s moon lamp, small enough to clip to a jacket, still warm. It throws a long soft light, and whatever was under the bed didn’t like it.',
    },
    'ds-handler-boots': {
      name: 'Handler’s Boots', slot: 'feet', color: '#3a3026', trim: '#d9a21c',
      mods: { speed: 10, dashCooldown: -0.15 },
      desc: 'Steel toes, a sole that grips on wet plate, and the left one bitten through at the heel and taped. The handlers had to be able to run.',
    },
  };

  const items = {
    'ammo-fuel': {
      name: 'Fuel can', radius: 7, shadowScale: 0.7, dressing: false,
      onTouch(it, game) {
        const P = game.player;
        if ((P.ammo.fuel || 0) >= P.ammoMax('fuel')) return false;
        const got = P.addAmmo('fuel', it.props.amount || 60);
        LM.audio.play('pickup');
        game.particles.add({ type: 'text', x: it.x, y: it.y - 10, vy: -30, drag: 2, life: 0.8, text: '+' + got + ' fuel', color: '#ffd2a0', size: 7 });
      },
      draw(g) {
        g.fillStyle = '#16181b';
        G.roundRect(g, -5.5, -6.5, 11, 13, 2);
        g.fill();
        g.fillStyle = FUEL;
        G.roundRect(g, -4.8, -5.8, 9.6, 11.6, 1.6);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.3)';
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(-4, -4);
        g.lineTo(4, 4);
        g.moveTo(4, -4);
        g.lineTo(-4, 4);
        g.stroke();
        g.fillStyle = '#e8c84a';
        g.fillRect(2, -8, 2.4, 2.4);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 11, FIRE, 0.22 + 0.08 * Math.sin(t * 3));
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    LM.audio.define('flameJet', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 900, dur: 0.09, gain: 0.07 });
      kit.noise(t, o, { type: 'bandpass', freq: 300, dur: 0.08, gain: 0.05, q: 0.8 });
    });
  }

  LM.definePack({ id: 'ds-arsenal', weapons, projectiles, armor, items });
})();
