/* Dead Signal — packs/ds-nightmares/gestation.js
 * Floor 3's specimens (Gestation: DESIGN.md section 4.3). Every one of them hunts out loud: each has a
 * sound it makes while it's after something, and a quieter one while it waits.
 *
 *   ds-midwife       tall and careful, on four long legs. It circles, darts in, and lays a clutch under
 *                    your skin (status implanted: a long countdown, then they hatch), then backs off
 *                    into the dark to wait. Brandt's.
 *   ds-tenant        a pale crawling thing that wants a dead body (a ds-body with props.host). It gets in
 *                    at the base of the skull and stands the body up as a Ridden. It bites if you're close.
 *   ds-ridden        a dead scientist, walked about by a Tenant. Put it down and the Tenant crawls out
 *                    looking for another. props.card: a card the body was carrying (it drops it).
 *   ds-lantern       a Flesh Lantern: a drifting sac lit from inside. It spits bile (infected). It is
 *                    the light in the dark labs: kill one, and that part of the room goes dark.
 *   ds-sitter        huge, slow and all but bulletproof. You hear it walking long before you see it. It
 *                    can't fit through a door. Don't be where it's going.
 *   ds-juvenile      a young Congregation colony, in a pen. A few faces so far.
 *
 * Contained specimens: an enemy on the 'specimen' side (props.faction: 'specimen') is in a cell. Nothing
 * fights it and it fights nothing; it presses against the glass when it sees you. A `faction` trap
 * effect (to 'monster') lets it out.
 * Seeing them sets story flags: sawSpecimen, and sawMidwife / sawTenant / sawLantern / sawSitter / sawColony.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;
  const DS = (LM.DS = LM.DS || {});
  const PALE = '#e6dcd2', PINK = '#d89aa8', BILE = '#b8d84a', LANTERN = '#f2c888';

  // ------------------------------------------------------------ shared
  /** A sound that carries further than the engine's (heard through walls, as hunting is). */
  const far = (game, e, range) => {
    const P = game.player;
    if (!P) return 0;
    return U.clamp(1 - U.dist(e.x, e.y, P.x, P.y) / (range || 1100), 0, 1);
  };
  /** Its hunting call while it's after something, and a quieter one while it waits. */
  DS.hunt = function (e, game, dt, o) {
    const m = e.mem;
    m.huntT = (m.huntT == null ? U.rand(0.5, 3) : m.huntT) - dt;
    if (m.huntT > 0) return;
    const busy = e.aggro || (e.faction === 'specimen' && m.press);
    m.huntT = busy ? U.rand(o.every[0], o.every[1]) : U.rand(o.idle ? o.idle[0] : 6, o.idle ? o.idle[1] : 11);
    const v = far(game, e, o.range || 1000) * (busy ? 1 : 0.45);
    if (v > 0.04) LM.audio.play(busy ? o.sound : o.idleSound || o.sound, { vol: v, throttle: 0.15 });
  };
  /** The player has laid eyes on one: story flags (the Director asks about them on the stairs). */
  DS.sighted = function (e, game, kind) {
    if (!e.visible || e.vis < 0.6 || e.pDist > 520 || game.attract) return;
    if (!game.hasFlag('sawSpecimen')) game.setFlag('sawSpecimen');
    if (kind && !game.hasFlag('saw' + kind)) game.setFlag('saw' + kind);
  };
  /** It hears your gunshots within R. */
  DS.hearShots = function (e, game, R) {
    const shots = game.stats.shots;
    if (e.mem.shots != null && shots !== e.mem.shots && !e.aggro && e.pDist < R && LM.factions.hostile(e.faction, 'player')) e.alert(game, true);
    e.mem.shots = shots;
  };
  const contained = (e) => e.faction === 'specimen';
  /** In a cell: it paces, and presses against the glass toward you when it can see you. */
  function inCell(e, dt, game) {
    const m = e.mem;
    m.press = e.pSee && e.pDist < (e.def.pressRange || 300);
    if (m.press) {
      const P = game.player;
      const dx = P.x - e.x, dy = P.y - e.y, l = Math.hypot(dx, dy) || 1;
      e.mx += dx / l;
      e.my += dy / l;
      e.speedMul = 0.55;
      e.facing += U.angDiff(e.facing, Math.atan2(dy, dx)) * Math.min(1, dt * 6);
      return;
    }
    AI.wander(e, game, 0.4);
    e.speedMul = 0.3;
  }
  /** Is there nothing solid (walls, glass) between the two? */
  const clear = (game, a, b) => LM.physics.los(game.level, a.x, a.y, b.x, b.y, 'shot');

  // ------------------------------------------------------------ behaviours
  const behaviors = {
    'ds-contained': { update: inCell },

    // the Midwife: circles at a distance, darts in, and after it has laid, backs away into the dark
    'ds-midwife': {
      update(e, dt, game) {
        if (contained(e)) return inCell(e, dt, game);
        const m = e.mem;
        if (!e.aggro) {
          AI.wander(e, game, 0.3);
          e.speedMul = 0.35;
          return;
        }
        const F = AI.foe(e, game);
        if (!F) return;
        m.retreat = (m.retreat || 0) - dt;
        if (m.retreat > 0) {
          AI.away(e, game, 1);
          AI.strafe(e, game, 0.4);
          e.speedMul = 1.15;
          return;
        }
        // a robot gets no ceremony
        if (!F.isPlayer) {
          AI.chase(e, game, 1);
          e.speedMul = 1.1;
          return;
        }
        m.circle = (m.circle == null ? U.rand(1.4, 2.6) : m.circle) - dt;
        if (!e.seeLos || e.distP > 230) {
          AI.chase(e, game, 1);
          e.speedMul = 0.95;
        } else if (m.circle > 0) {
          if (e.distP < 110) AI.away(e, game, 0.7);
          else if (e.distP > 160) AI.chase(e, game, 0.6);
          AI.strafe(e, game, 0.9);
          e.speedMul = 0.85;
        } else {
          // the dart
          AI.chase(e, game, 1);
          e.speedMul = 1.45;
          if (e.distP < 40 || m.circle < -2.5) m.circle = U.rand(1.6, 3);
        }
      },
    },

    // the Tenant: a body first, you if you get close
    'ds-tenant': {
      update(e, dt, game) {
        if (contained(e)) return inCell(e, dt, game);
        const m = e.mem;
        const F = AI.foe(e, game);
        const close = F && e.seeLos && e.distP < (m.hurt ? 260 : 150);
        if (e.aggro && close) {
          AI.chase(e, game, 1);
          const l = Math.hypot(e.mx, e.my) || 1, w = Math.sin(e.t * 12) * 0.6;
          e.mx += (-e.my / l) * w;
          e.my += (e.mx / l) * w;
          e.speedMul = 1;
          return;
        }
        // look for a host now and then
        m.seekT = (m.seekT || 0) - dt;
        if (m.seekT <= 0) {
          m.seekT = 0.6;
          let best = null, bd = 460;
          for (const it of game.items) {
            if (it.dead || it.def.id !== 'ds-body' || !it.props.host) continue;
            const d = U.dist(e.x, e.y, it.x, it.y);
            if (d < bd) {
              bd = d;
              best = it;
            }
          }
          m.host = best;
        }
        const H = m.host;
        if (H && !H.dead) {
          const d = U.dist(e.x, e.y, H.x, H.y);
          if (d < 14) return possess(e, H, game);
          if (d < 60 || LM.physics.los(game.level, e.x, e.y, H.x, H.y, 'shot')) {
            e.mx += (H.x - e.x) / (d || 1);
            e.my += (H.y - e.y) / (d || 1);
          } else AI.goTo(e, game, H.x, H.y, 1);
          e.speedMul = 0.9;
          return;
        }
        if (e.aggro && F) {
          AI.chase(e, game, 1);
          e.speedMul = 0.9;
          return;
        }
        AI.wander(e, game, 0.5);
        e.speedMul = 0.45;
      },
    },

    // a Ridden walks like something wearing a body: in lurches
    'ds-shamble': {
      update(e, dt, game) {
        const gait = 0.55 + 0.45 * Math.max(0, Math.sin(e.t * 3.1 + e.home.x));
        if (!e.aggro) {
          // it goes back to where the body used to work
          const d = U.dist(e.x, e.y, e.home.x, e.home.y);
          if (d > 40) AI.goTo(e, game, e.home.x, e.home.y, 0.6);
          else AI.wander(e, game, 0.25);
          e.speedMul = 0.4 * gait;
          return;
        }
        AI.chase(e, game, 1);
        e.speedMul = gait;
      },
    },

    // the Sitter, once it has seen you: slow and certain
    'ds-lumber': {
      update(e, dt, game) {
        AI.chase(e, game, 1);
        e.speedMul = e.seeLos ? 1.25 : 1;
      },
    },
  };

  /** A Tenant reaches a body: the body gets up. */
  function possess(e, body, game) {
    const p = body.props;
    const props = { coat: p.color, skin: p.skin, hair: p.hair, name: p.title, faction: e.faction === 'specimen' ? 'monster' : e.faction, aggro: false };
    for (const k of ['card', 'cardName', 'cardTitle', 'cardText', 'cardDesc', 'cardFlag', 'cardColor']) if (p[k] != null) props[k] = p[k];
    const r = game.spawnEnemy('ds-ridden', body.x, body.y, props);
    body.remove(game);
    e.dead = true;
    if (r) {
      r.spawning = 0;
      r.facing = p.angle != null ? p.angle : e.facing;
      r.mem.rising = 1.1;
      if (r.pSee || U.dist(r.x, r.y, game.player.x, game.player.y) < 400) game.toast((p.title ? p.title.replace(/^Dr\. /, '') : 'A body') + ' sits up.', 'warn');
    }
    LM.audio.play('tenantRide', { vol: far(game, body, 900) });
    game.particles.burst(body.x, body.y, 8, { type: 'dot', color: '#5e1616', speed: 60, life: 0.5, size: [0.8, 1.6], drag: 5 });
  }

  // ------------------------------------------------------------ attacks
  const lob = () => LM.get('attacks', 'lob');
  const attacks = {
    // a Lantern's spit: a lobbed glob of bile, but only with nothing in the way (not over glass)
    'ds-spit': {
      canStart: (e, a, game) => {
        const F = AI.foe(e, game);
        return F && lob().canStart(e, a, game) && clear(game, e, F);
      },
      update: (e, atk, dt, game) => lob().update(e, atk, dt, game),
      drawGlow: (g, e, atk, t, game) => lob().drawGlow && lob().drawGlow(g, e, atk, t, game),
    },
    // the Midwife's ovipositor: it rears back, then strikes; if it lands, it lays
    'ds-oviposit': {
      canStart: (e, a, game) => {
        const F = AI.foe(e, game);
        return F && F.isPlayer && e.seeLos && e.distP <= (a.range || 26) + e.r + F.r && clear(game, e, F);
      },
      start(e, atk, game) {
        LM.audio.play('midwifeRear', { vol: far(game, e, 700) });
      },
      update(e, atk, dt, game) {
        const a = atk.def, P = AI.foe(e, game), wind = a.windup || 0.5;
        e.speedMul *= atk.t < wind ? 0.15 : 0.5;
        atk.lunge = atk.t < wind ? -atk.t / wind : Math.max(0, 1 - (atk.t - wind) / 0.18);
        if (!atk.struck && atk.t >= wind) {
          atk.struck = true;
          if (P && !P.dead && U.dist(e.x, e.y, P.x, P.y) <= (a.range || 26) + e.r + P.r + 8 && clear(game, e, P)) {
            const ang = Math.atan2(P.y - e.y, P.x - e.x);
            const before = P.invuln;
            LM.combat.hurt(game, P, a.damage || 10, { kx: Math.cos(ang) * 60, ky: Math.sin(ang) * 60, source: 'enemy', type: 'melee', status: before > 0 ? null : 'implanted', by: e });
            if (before <= 0) {
              e.mem.retreat = a.retreat || 3.5;
              LM.audio.play('midwifeLay', { vol: 1 });
            }
          }
        }
        if (atk.t >= wind + (a.recover || 0.4)) atk.done = true;
      },
      drawGlow(g, e, atk) {
        const wind = atk.def.windup || 0.5;
        if (atk.t < wind) G.glow(g, e.x - Math.cos(e.facing) * 10, e.y - Math.sin(e.facing) * 10, 14, PINK, (atk.t / wind) * 0.5);
      },
    },
  };

  // ------------------------------------------------------------ drawing
  const legs4 = (g, e, len, col, w) => {
    const walk = Math.hypot(e.vx, e.vy) > 6 ? e.t * 9 : 0;
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = 'round';
    for (const [ax, side, ph] of [[5, -1, 0], [5, 1, Math.PI], [-4, -1, Math.PI], [-4, 1, 0]]) {
      const swing = Math.sin(walk + ph) * 0.35;
      const kx = ax + Math.cos(side * 1.2 + swing) * len * 0.55, ky = side * (len * 0.55);
      const fx = kx + (ax > 0 ? len * 0.6 : -len * 0.5), fy = ky + side * len * 0.35;
      g.beginPath();
      g.moveTo(ax, side * 2);
      g.lineTo(kx, ky);
      g.lineTo(fx, fy);
      g.stroke();
    }
    g.lineCap = 'butt';
  };

  function midwife(g, e, t) {
    g.rotate(e.facing);
    const a = e.atk;
    const lunge = a && a.lunge != null ? a.lunge : 0;
    legs4(g, e, 15, '#b8a8a0', 1.3);
    // the abdomen behind, long and heavy, beads of eggs under a thin skin; the ovipositor curls at the end
    const curl = lunge < 0 ? -lunge : 0, strike = lunge > 0 ? lunge : 0;
    g.fillStyle = '#c8b0ac';
    g.beginPath();
    g.ellipse(-9 + strike * 4, 0, 10, 6, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = 'rgba(240,220,215,0.65)';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(-14 + i * 2.6 + strike * 4, (i % 2 ? 1.6 : -1.4), 1.6, 0, U.TAU);
      g.fill();
    }
    g.strokeStyle = '#8a6a6a';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-18 + strike * 4, 0);
    // rearing back over the body, then thrust forward past the head
    if (strike > 0) {
      g.quadraticCurveTo(-4, -9, 8 + strike * 14, -1);
    } else g.quadraticCurveTo(-26 + curl * 10, -6 - curl * 8, -20 + curl * 14, -10 - curl * 4);
    g.stroke();
    g.lineCap = 'butt';
    // the thorax, narrow
    g.fillStyle = '#d8c4c0';
    G.roundRect(g, -3, -3.5, 9, 7, 3);
    g.fill();
    // the head: smooth, no eyes, a vertical slit
    g.fillStyle = PALE;
    g.beginPath();
    g.ellipse(8, 0, 4.2, 3.4, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = '#5a2a2a';
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(10.5, -1.6);
    g.lineTo(10.5, 1.6);
    g.stroke();
  }

  function tenant(g, e, t) {
    g.rotate(e.facing);
    const wr = Math.sin(e.t * 18);
    // a skinned, segmented thing, the colour of the inside of a cheek; a ring of teeth at the front
    for (let i = 0; i < 6; i++) {
      const x = 5 - i * 2.8, y = Math.sin(e.t * 14 - i * 0.9) * 1.4;
      g.fillStyle = i % 2 ? '#d8a8a0' : '#e8bcb4';
      g.beginPath();
      g.ellipse(x, y, 2.4, 3.2 - i * 0.25, 0, 0, U.TAU);
      g.fill();
      // little legs
      g.strokeStyle = 'rgba(140,90,90,0.8)';
      g.lineWidth = 0.5;
      g.beginPath();
      g.moveTo(x, y - 2.6);
      g.lineTo(x - 1 + wr * (i % 2 ? 1 : -1), y - 5);
      g.moveTo(x, y + 2.6);
      g.lineTo(x - 1 - wr * (i % 2 ? 1 : -1), y + 5);
      g.stroke();
    }
    g.fillStyle = '#7a2a2a';
    g.beginPath();
    g.arc(7, 0, 1.8, 0, U.TAU);
    g.fill();
    g.fillStyle = '#f0e6e0';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * U.TAU;
      g.fillRect(7 + Math.cos(a) * 1.8 - 0.3, Math.sin(a) * 1.8 - 0.3, 0.6, 0.6);
    }
  }

  function ridden(g, e, t, game) {
    const p = e._props || {};
    const rising = e.mem.rising > 0 ? e.mem.rising / 1.1 : 0;
    g.rotate(e.facing);
    if (rising) g.scale(1 - rising * 0.25, 1);
    const lurch = Math.sin(e.t * 3.1 + e.home.x);
    const reach = e.atk && e.atk.def.type === 'melee' ? Math.min(1, e.atk.t / (e.atk.def.windup || 0.4)) * 4 : 0;
    // arms hanging forward, not quite together
    g.fillStyle = p.coat || '#d8dcdf';
    g.beginPath();
    g.ellipse(6 + reach, -6.5 + lurch * 0.8, 5.5, 2.2, 0.3, 0, U.TAU);
    g.ellipse(5 + reach, 6.5 - lurch * 0.6, 5, 2.2, -0.25, 0, U.TAU);
    g.fill();
    g.fillStyle = p.skin || '#c49a7a';
    g.beginPath();
    g.arc(11 + reach, -7 + lurch * 0.8, 1.7, 0, U.TAU);
    g.arc(10 + reach, 7 - lurch * 0.6, 1.7, 0, U.TAU);
    g.fill();
    // the coat
    g.fillStyle = p.coat || '#d8dcdf';
    G.roundRect(g, -6, -8.5, 11, 17, 4.5);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(-6, -0.4, 11, 0.8);
    // a dark stain down the back
    g.fillStyle = 'rgba(80,10,10,0.55)';
    g.beginPath();
    g.ellipse(-4, 0, 3.5, 2.2, 0, 0, U.TAU);
    g.fill();
    // what's riding it, along the spine from the neck
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? '#d8a8a0' : '#e8bcb4';
      g.beginPath();
      g.ellipse(-1 - i * 2.4, Math.sin(e.t * 6 - i) * 0.6, 1.6, 2.2, 0, 0, U.TAU);
      g.fill();
    }
    // the head, lolled to one side
    const tilt = 2.4 + lurch * 0.8;
    g.fillStyle = p.skin || '#c49a7a';
    g.beginPath();
    g.arc(2.5, tilt, 3.8, 0, U.TAU);
    g.fill();
    g.fillStyle = p.hair || '#2a1a12';
    g.beginPath();
    g.arc(1.4, tilt - 0.4, 3.6, Math.PI * 0.6, Math.PI * 1.65);
    g.fill();
  }

  function lantern(g, e, t) {
    const bob = Math.sin(t * 1.3 + e.home.x) * 1.5;
    g.translate(0, bob);
    // tendrils hanging below, swaying
    g.strokeStyle = 'rgba(200,150,130,0.7)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const a = -0.8 + i * 0.4;
      const sw = Math.sin(t * 2 + i * 1.3) * 3;
      g.beginPath();
      g.moveTo(Math.sin(a) * 6, 5);
      g.quadraticCurveTo(Math.sin(a) * 9 + sw, 12, Math.sin(a) * 7 + sw * 1.4, 18 + i % 2 * 3);
      g.stroke();
    }
    // the sac: thin skin over light, veins
    const pulse = 1 + Math.sin(t * 2.2 + e.home.y) * 0.05;
    g.fillStyle = '#e8b890';
    g.beginPath();
    g.ellipse(0, 0, 10 * pulse, 9 * pulse, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#fbe6c4';
    g.beginPath();
    g.ellipse(-1.5, -1.5, 6 * pulse, 5.5 * pulse, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = 'rgba(150,60,50,0.55)';
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(-7, 2); g.quadraticCurveTo(-2, -2, 4, 5);
    g.moveTo(-3, -7); g.quadraticCurveTo(1, -2, 7, -4);
    g.moveTo(2, 7); g.quadraticCurveTo(3, 2, 8, 1);
    g.stroke();
    // something curled up inside, a shape you'd rather not name
    g.fillStyle = 'rgba(120,60,50,0.28)';
    g.beginPath();
    g.ellipse(0.5, 0.5, 3.4, 2.4, 0.8, 0, U.TAU);
    g.fill();
  }

  function sitter(g, e, t) {
    g.rotate(e.facing);
    const step = Math.hypot(e.vx, e.vy) > 4 ? Math.sin(e.t * 3.2) : 0;
    const slam = e.atk && e.atk.def.type === 'nova' ? Math.min(1, e.atk.t / (e.atk.def.windup || 1)) : 0;
    // feet, short and wide
    g.fillStyle = '#a89c94';
    G.roundRect(g, -6 + step * 4, -17, 13, 7, 3);
    g.fill();
    G.roundRect(g, -6 - step * 4, 10, 13, 7, 3);
    g.fill();
    // the arms, long, knuckles on the floor
    const lift = slam * 6;
    g.fillStyle = '#cfc3b8';
    g.beginPath();
    g.ellipse(12 + lift, -17 - step, 11, 5, 0.25, 0, U.TAU);
    g.ellipse(12 + lift, 17 + step, 11, 5, -0.25, 0, U.TAU);
    g.fill();
    // the bulk: a vast soft back, folded at the shoulders
    g.fillStyle = '#d8cec4';
    g.beginPath();
    g.ellipse(-2, 0, 19, 20, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = 'rgba(120,100,90,0.35)';
    g.lineWidth = 1;
    for (const r of [8, 12, 16]) {
      g.beginPath();
      g.arc(-6, 0, r, -0.9, 0.9);
      g.stroke();
    }
    // a smock, too small, tied behind with a bow
    g.fillStyle = '#9ab8c8';
    g.beginPath();
    g.moveTo(10, -16);
    g.quadraticCurveTo(-4, -20, -14, -10);
    g.lineTo(-14, 10);
    g.quadraticCurveTo(-4, 20, 10, 16);
    g.closePath();
    g.globalAlpha *= 0.6;
    g.fill();
    g.globalAlpha /= 0.6;
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(-8 + (i % 3) * 6, -7 + Math.floor(i / 3) * 12, 1.2, 0, U.TAU);
      g.fill();
    }
    g.strokeStyle = '#7a98a8';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-16, -3); g.lineTo(-21, -6);
    g.moveTo(-16, 3); g.lineTo(-21, 6);
    g.stroke();
    // the head, small, sunk in the shoulders, looking down
    g.fillStyle = '#e6dcd2';
    g.beginPath();
    g.arc(13, 0, 5.5, 0, U.TAU);
    g.fill();
    g.fillStyle = 'rgba(60,40,40,0.5)';
    g.beginPath();
    g.ellipse(16.5, 0, 0.8, 2.2, 0, 0, U.TAU);
    g.fill();
  }

  function juvenile(g, e, t) {
    const reach = e.mem.press ? 1 : 0.3;
    g.rotate(e.facing);
    // strands, fewer than a grown one has
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * U.TAU + Math.sin(t * 0.7 + i) * 0.2;
      const len = 13 + Math.sin(t * 2 + i * 1.7) * 3 + (Math.cos(a) > 0.3 ? reach * 6 : 0);
      g.strokeStyle = i % 2 ? '#d8cbbb' : '#c9b9a6';
      g.lineWidth = 2.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      g.quadraticCurveTo(Math.cos(a + 0.4) * len * 0.7, Math.sin(a + 0.4) * len * 0.7, Math.cos(a) * len, Math.sin(a) * len);
      g.stroke();
    }
    g.lineCap = 'butt';
    g.fillStyle = '#d8ccbc';
    g.beginPath();
    g.ellipse(0, 0, 11, 10, 0, 0, U.TAU);
    g.fill();
    // three small faces, eyes shut; one of them a child's
    const faces = [[3, -4, 2.8], [-3, 3, 3.2], [4, 4, 2]];
    for (const [x, y, r] of faces) {
      g.fillStyle = '#ecdcd0';
      g.beginPath();
      g.arc(x, y, r, 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(90,60,50,0.6)';
      g.lineWidth = 0.45;
      g.beginPath();
      g.moveTo(x - r * 0.5, y - r * 0.2); g.lineTo(x - r * 0.15, y - r * 0.2);
      g.moveTo(x + r * 0.15, y - r * 0.2); g.lineTo(x + r * 0.5, y - r * 0.2);
      g.stroke();
      g.beginPath();
      g.arc(x, y + r * 0.4, r * 0.25, 0, Math.PI);
      g.stroke();
    }
  }

  // ------------------------------------------------------------ the specimens
  const enemies = {
    'ds-midwife': {
      name: 'Midwife', hp: 150, speed: 128, radius: 12, armor: 0.1, mass: 1.6, accel: 10, turn: 9, ai: 'ds-midwife',
      sight: 300, leash: 1100, color: '#d8c4c0', blood: '#5a1a2a', gib: '#c8b0ac', bark: 'midwifeClick', dreamer: 'I. Brandt',
      pressRange: 320,
      attacks: [
        { type: 'ds-oviposit', damage: 10, range: 24, windup: 0.5, recover: 0.4, cooldown: 7, retreat: 3.5 },
        { type: 'melee', damage: 9, range: 16, windup: 0.3, recover: 0.3, cooldown: 1.2, knock: 90 },
      ],
      drops: { items: [{ id: 'ds-purge', chance: 0.6 }, { id: 'ds-medgel', chance: 0.15 }, { id: 'ammo-rounds', chance: 0.2 }] },
      update(e, dt, game) {
        DS.sighted(e, game, 'Midwife');
        DS.hearShots(e, game, 360);
        DS.hunt(e, game, dt, { sound: 'midwifeClick', idleSound: 'midwifeHum', every: [1.4, 2.6], idle: [5, 9] });
      },
      draw: midwife,
    },
    'ds-tenant': {
      name: 'Tenant', hp: 24, speed: 150, radius: 7, mass: 0.6, accel: 12, turn: 13, ai: 'ds-tenant', sight: 200, leash: 900,
      color: '#e8bcb4', blood: '#7a2a2a', gib: '#d8a8a0', dreamer: 'S. Pell', pressRange: 240,
      attacks: [{ type: 'melee', damage: 6, range: 10, windup: 0.22, recover: 0.25, cooldown: 0.8, knock: 30, status: 'infected' }],
      drops: { items: [{ id: 'ds-purge', chance: 0.12 }] },
      update(e, dt, game) {
        if (e.lastHurt != null && !e.mem.hurt) e.mem.hurt = true;
        DS.sighted(e, game, 'Tenant');
        DS.hunt(e, game, dt, { sound: 'tenantChitter', every: [1.2, 2.4], idle: [3, 6], range: 800 });
      },
      draw: tenant,
    },
    'ds-ridden': {
      name: 'Ridden', hp: 85, speed: 74, radius: 10, armor: 0.05, mass: 1.6, turn: 5, ai: 'ds-shamble', sight: 260, leash: 1000,
      color: '#d8dcdf', blood: '#4a1010', gib: '#c9ccc8', bark: 'riddenGroan',
      attacks: [{ type: 'melee', damage: 13, range: 14, windup: 0.45, recover: 0.4, cooldown: 1.3, knock: 110, status: 'infected' }],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.25 }, { id: 'ds-medgel', chance: 0.12 }] },
      update(e, dt, game) {
        if (e.mem.rising > 0) {
          e.mem.rising -= dt;
          e.speedMul = 0;
          e.globalCd = Math.max(e.globalCd, 0.2);
        }
        DS.sighted(e, game, 'Tenant');
        DS.hearShots(e, game, 300);
        DS.hunt(e, game, dt, { sound: 'riddenGroan', idleSound: 'riddenBreath', every: [2.4, 4.2], idle: [5, 9], range: 900 });
      },
      onDeath(e, game) {
        const p = e._props || {};
        const x = e.x, y = e.y;
        // the body stays down this time
        const body = game.spawnItemAt('ds-body', x, y, { angle: e.facing, color: p.coat, skin: p.skin, hair: p.hair, title: p.name || 'Someone in a lab coat', kicker: 'Gestation', text: (p.name ? p.name + '. ' : '') + 'Something has been living in the back of their neck. It isn’t there now.' });
        if (body) body.pop = null;
        // a card it was carrying
        if (p.card) {
          // a little way off, so it isn't under the body (but never in a wall: it has to be picked up)
          let cx = x, cy = y;
          for (const a of [e.facing, e.facing + Math.PI, e.facing + Math.PI / 2, e.facing - Math.PI / 2]) {
            const tx = x + Math.cos(a) * 26, ty = y + Math.sin(a) * 26;
            if (!game.level.solidAt(Math.floor(tx / T), Math.floor(ty / T)) && LM.physics.los(game.level, x, y, tx, ty, 'shot')) {
              cx = tx;
              cy = ty;
              break;
            }
          }
          const c = game.spawnItemAt('ds-keycard', cx, cy, { key: p.card, flag: p.cardFlag || p.card, name: p.cardName || 'Clearance card', title: p.cardTitle || p.cardName, text: p.cardText, desc: p.cardDesc, color: p.cardColor || '#58b2ff', prompt: 'Take the card' });
          if (c) c.pop = null;
        }
        // and the thing on its back lets go
        game.schedule(0.45, () => {
          if (!game.level || game.levelId !== e._level) return;
          const t2 = game.spawnEnemy('ds-tenant', x + U.rand(-6, 6), y + U.rand(-6, 6), { summoned: true, aggro: true, faction: e.faction });
          if (t2) {
            t2.spawning = 0;
            t2.mem.hurt = true;
            game.toast('The thing on its back lets go.', 'warn');
          }
        });
      },
      init(e, game) {
        e._level = game.levelId;
      },
      draw: ridden,
    },
    'ds-lantern': {
      name: 'Flesh Lantern', hp: 45, speed: 42, radius: 11, flying: true, mass: 0.8, accel: 3, turn: 3, ai: 'lobber', keep: [140, 270],
      sight: 300, leash: 900, color: LANTERN, blood: '#c89a3a', gib: '#e8b890', deathGlow: LANTERN, bark: 'lanternSigh', dreamer: 'M. Thale',
      deathSound: 'lanternPop', pressRange: 260,
      light: { color: LANTERN, radius: 150, intensity: 0.6 },
      attacks: [{ type: 'ds-spit', damage: 7, radius: 36, minRange: 60, maxRange: 300, windup: 0.75, cooldown: 3.2, flight: 0.9, color: BILE, status: 'infected' }],
      drops: { items: [{ id: 'ds-purge', chance: 0.25 }, { id: 'ammo-cells', chance: 0.2 }] },
      update(e, dt, game) {
        // its own light goes where it goes
        const L = e.def.light;
        let li = e.mem.light;
        if (!li || !game.lights.includes(li)) {
          li = e.mem.light = { x: e.x, y: e.y, r: L.radius, color: L.color, intensity: L.intensity, life: Infinity };
          game.lights.push(li);
        }
        li.x = e.x;
        li.y = e.y - 2;
        li.intensity = L.intensity * (0.9 + 0.1 * Math.sin(e.t * 2.2 + e.home.y));
        if (contained(e)) inCell(e, dt, game);
        DS.sighted(e, game, 'Lantern');
        DS.hunt(e, game, dt, { sound: 'lanternSigh', idleSound: 'lanternPulse', every: [2.2, 3.6], idle: [4, 7], range: 850 });
      },
      onDeath(e, game) {
        if (e.mem.light) e.mem.light.life = 0;
        game.particles.burst(e.x, e.y, 18, { type: 'dot', color: [LANTERN, BILE, '#c89a3a'], speed: 150, life: 0.6, size: [1, 2.2], drag: 4 });
        game.renderer.addDecal({ type: 'blood', x: e.x, y: e.y, r: 14, color: '#6a6a1a' });
        game.lights.push({ x: e.x, y: e.y, r: 200, color: LANTERN, intensity: 0.9, life: 0.5, max: 0.5 });
      },
      draw: lantern,
      drawGlow(g, e, t) {
        G.glow(g, e.x, e.y + Math.sin(t * 1.3 + e.home.x) * 1.5, 22, LANTERN, 0.55);
        G.glow(g, e.x - 1.5, e.y - 1.5, 8, '#fff2d8', 0.6);
      },
    },
    'ds-sitter': {
      name: 'Sitter', hp: 1100, speed: 38, radius: 21, armor: 0.95, mass: 40, accel: 2.4, turn: 2.2, ai: 'patrol', then: 'ds-lumber',
      sight: 210, view: { range: 320, cone: 0.85 }, leash: 560, color: '#d8cec4', blood: '#6a4a3a', gib: '#cfc3b8', bark: 'sitterHum',
      deathSound: 'explode', dreamer: 'G. Moss', pause: 2.2, patrolSpeed: 0.85,
      resist: { burning: 1, staggered: 1, sedated: 1, chilled: 0.6 },
      attacks: [
        { type: 'nova', damage: 30, radius: 72, windup: 1.05, recover: 0.7, cooldown: 4, color: '#e8dccb' },
        { type: 'melee', damage: 34, range: 18, windup: 0.75, recover: 0.55, cooldown: 2.2, knock: 300 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }] },
      update(e, dt, game) {
        const m = e.mem;
        // footsteps: you hear it a long way off, through the walls
        const moving = Math.hypot(e.vx, e.vy) > 6;
        m.stepT = (m.stepT == null ? 0.5 : m.stepT) - dt * (moving ? Math.max(0.6, Math.hypot(e.vx, e.vy) / 40) : 0);
        if (m.stepT <= 0) {
          m.stepT = 1;
          const v = far(game, e, 1400);
          if (v > 0.03) LM.audio.play('sitterStep', { vol: v, throttle: 0.1 });
          if (e.pDist < 360) game.addShake(0.05 + (1 - e.pDist / 360) * 0.12);
          if (Math.random() < 0.5) game.particles.add({ type: 'smoke', x: e.x + U.rand(-10, 10), y: e.y + U.rand(-10, 10), life: 0.8, size: 4, color: '#8a8070', alpha: 0.18, drag: 2 });
        }
        DS.sighted(e, game, 'Sitter');
        DS.hearShots(e, game, 260);
        DS.hunt(e, game, dt, { sound: 'sitterHum', every: [3.5, 5.5], idle: [7, 12], range: 1000 });
      },
      draw: sitter,
    },
    'ds-juvenile': {
      name: 'Juvenile colony', hp: 300, speed: 46, radius: 14, armor: 0.2, mass: 6, turn: 3, ai: 'ds-contained', sight: 260, leash: 600,
      faction: 'specimen', color: '#d8ccbc', blood: '#6a4a3a', gib: '#c9b9a6', dreamer: 'S. Pell', pressRange: 340,
      attacks: [{ type: 'melee', damage: 16, range: 16, windup: 0.5, recover: 0.4, cooldown: 1.4, knock: 140 }],
      update(e, dt, game) {
        DS.sighted(e, game, 'Colony');
        DS.hunt(e, game, dt, { sound: 'juvenileMurmur', every: [2.6, 4.2], idle: [5, 9], range: 700 });
      },
      draw: juvenile,
    },
  };

  // the specimens' side: in a cell, nothing fights it and it fights nothing
  const factions = { specimen: [] };

  // ------------------------------------------------------------ the sounds of things hunting
  if (LM.audio && LM.audio.define) {
    const S = LM.audio.define;
    S('midwifeClick', (t, o, opt, kit) => {
      // wet clicks in a run, quickening, over a low hum
      for (let i = 0; i < 5; i++) kit.noise(t + i * (0.09 - i * 0.008), o, { type: 'bandpass', freq: 2400 + i * 200, dur: 0.025, gain: 0.12, q: 4 });
      kit.tone(t, o, { type: 'sine', f0: 92, f1: 88, dur: 0.6, gain: 0.05, attack: 0.1 });
    });
    S('midwifeHum', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 196, f1: 185, dur: 1.2, gain: 0.03, attack: 0.3 });
      kit.tone(t + 0.4, o, { type: 'sine', f0: 247, f1: 233, dur: 0.9, gain: 0.02, attack: 0.3 });
    });
    S('midwifeRear', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 600, freqEnd: 2200, dur: 0.4, gain: 0.12, q: 1.5, attack: 0.05 });
    });
    S('midwifeLay', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 500, dur: 0.25, gain: 0.25 });
      kit.tone(t + 0.05, o, { type: 'sine', f0: 140, f1: 70, dur: 0.3, gain: 0.12 });
    });
    S('tenantChitter', (t, o, opt, kit) => {
      for (let i = 0; i < 8; i++) kit.noise(t + i * 0.035, o, { type: 'highpass', freq: 3800 + (i % 3) * 600, dur: 0.018, gain: 0.08 });
    });
    S('tenantRide', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 1400, dur: 0.06, gain: 0.3, q: 3 });
      kit.noise(t + 0.08, o, { type: 'lowpass', freq: 400, dur: 0.5, gain: 0.18 });
      kit.tone(t + 0.3, o, { type: 'sawtooth', f0: 110, f1: 80, dur: 0.7, gain: 0.04, attack: 0.15 });
    });
    S('riddenGroan', (t, o, opt, kit) => {
      // a voice, with nobody behind it
      kit.tone(t, o, { type: 'sawtooth', f0: 98, f1: 82, dur: 0.9, gain: 0.05, attack: 0.2 });
      kit.tone(t, o, { type: 'sawtooth', f0: 147, f1: 120, dur: 0.8, gain: 0.025, attack: 0.25, detune: 18 });
      kit.noise(t + 0.2, o, { type: 'bandpass', freq: 700, dur: 0.6, gain: 0.05, q: 2 });
    });
    S('riddenBreath', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 500, dur: 0.7, gain: 0.04, attack: 0.3, q: 1.2 });
    });
    S('lanternSigh', (t, o, opt, kit) => {
      // a choir of one, very softly
      kit.tone(t, o, { type: 'sine', f0: 523, f1: 494, dur: 1.4, gain: 0.03, attack: 0.4 });
      kit.tone(t + 0.15, o, { type: 'sine', f0: 659, f1: 622, dur: 1.2, gain: 0.02, attack: 0.4 });
      kit.noise(t, o, { type: 'bandpass', freq: 900, dur: 1, gain: 0.02, attack: 0.4, q: 3 });
    });
    S('lanternPulse', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 70, f1: 60, dur: 0.25, gain: 0.08 });
    });
    S('lanternPop', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 700, dur: 0.3, gain: 0.3 });
      kit.tone(t, o, { type: 'sine', f0: 400, f1: 120, dur: 0.25, gain: 0.08 });
    });
    S('sitterStep', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 48, f1: 30, dur: 0.35, gain: 0.5 });
      kit.noise(t, o, { type: 'lowpass', freq: 220, dur: 0.3, gain: 0.22 });
    });
    S('sitterHum', (t, o, opt, kit) => {
      // it hums: three notes of a lullaby, very low and a little wrong
      [[110, 0], [123, 0.5], [98, 1.0]].forEach(([f, d]) => kit.tone(t + d, o, { type: 'triangle', f0: f, f1: f * 0.99, dur: 0.55, gain: 0.07, attack: 0.08 }));
    });
    S('juvenileMurmur', (t, o, opt, kit) => {
      // several voices under one another, none of them saying anything
      for (let i = 0; i < 4; i++) kit.tone(t + i * 0.13, o, { type: 'sine', f0: 180 + i * 37, f1: 170 + i * 29, dur: 0.6, gain: 0.025, attack: 0.15, detune: i * 9 });
      kit.noise(t, o, { type: 'bandpass', freq: 1200, dur: 0.8, gain: 0.025, attack: 0.2, q: 2 });
    });
  }

  LM.definePack({ id: 'ds-nightmares', behaviors, attacks, enemies, factions });
})();
