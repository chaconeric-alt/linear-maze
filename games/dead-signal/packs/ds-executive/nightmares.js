/* Dead Signal — packs/ds-executive/nightmares.js
 * What got loose on the executive floor (DESIGN.md 5.2): the board kept its worst up here, close to
 * hand. The statues in the Rotunda were never only statues.
 *
 *   ds-gorgon        the Gorgon (Voss's): the bronze Medusa on her plinth, until you're close. Her gaze:
 *                    when her eyes open (you see them coming), look at her and you start turning to
 *                    stone (stone, then petrified: you can't move or shoot). Look away. Snakes spit;
 *                    her tail lashes. A named bar; at half her stone skin falls away and she's quicker.
 *   ds-scylla        Scylla (Moss's): six dogs' heads on long necks round a body that never moves. Any
 *                    head within reach lunges and bites. Hurt her enough and heads die.
 *   ds-patron        a Patron (the board's guests): evening dress, a porcelain mask, jointed wrong.
 *                    Watches from the Gallery's rail until something starts; throws champagne glass.
 *   ds-mother        Mother of Teeth (Brandt's): a mouth the size of a doorway walking on human hands.
 *                    Its back is armoured; hit it in the face. Bites, charges, spits teeth.
 *   ds-tally         the Tally (Thale's): a centipede of hands, every finger counting. It takes
 *                    ammunition from the weapon in your hand when it hits; kill it and it drops it.
 *   ds-usher         a Faceless Usher (Pell's): a good suit, an open palm for a face. It steps out of
 *                    nowhere behind you.
 *   ds-swaddler      the Swaddler (Brandt's): a nanny and a spider and a perambulator. It weaves: silk
 *                    that webs you where you stand, webs on the floor, eggs it wraps people in. Fire
 *                    hurts it badly. A named bar.
 *   ds-swaddling     what hatches from its eggs: little swaddled things with porcelain faces.
 * Items: ds-web (a web across the floor: it holds you a moment; fire takes it), ds-web-wall (a curtain of
 * silk across a doorway: shoot it down or burn it), ds-woven-egg (a person wrapped in silk: cut it open
 * (E) or break it. props.holds: survivor | body | swaddling | item, and that thing's props: name, text,
 * role, coat, skin, hair, flag, knows, key (a ds-brass-key's props, on a body), item).
 * Statuses: stone (turning: slow, a stack of five), petrified (stone: you can't move or shoot), webbed
 * (held in silk: you can't move or shoot, a moment).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai, DS = (LM.DS = LM.DS || {});
  const X = DS.X;
  const SILK = '#efe8da', STONE = '#b8b4aa', VERD = '#4a8a72';
  const far = (game, e, range) => {
    const P = game.player;
    return P ? U.clamp(1 - U.dist(e.x, e.y, P.x, P.y) / (range || 1100), 0, 1) : 0;
  };
  const hunt = (e, game, dt, o) => DS.hunt && DS.hunt(e, game, dt, o);
  const sighted = (e, game, kind) => DS.sighted && DS.sighted(e, game, kind);
  const clear = (game, a, b) => LM.physics.los(game.level, a.x, a.y, b.x, b.y, 'shot');
  const walk = (game, x, y) => game.level.walkable(Math.floor(x / T), Math.floor(y / T));

  // ======================================================== statuses
  const statuses = {
    stone: { name: 'Turning to stone', seconds: 0.7, speedMul: 0.5, stack: 5, refresh: true, tint: STONE, tintAlpha: 0.4, color: '#c8c4b8', only: 'player' },
    petrified: { name: 'Stone', seconds: 1.7, speedMul: 0, bound: true, tint: STONE, tintAlpha: 0.8, color: '#d8d4c8', only: 'player', cures: ['stone'] },
    webbed: { name: 'Webbed', seconds: 1.2, speedMul: 0.08, bound: true, tint: SILK, tintAlpha: 0.55, color: SILK, only: 'player' },
  };

  // ======================================================== projectiles
  const projectiles = {
    'ds-venom': {
      radius: 3, color: '#b8e05a', trail: 4, wallSparks: 3, sparkColor: '#b8e05a',
      draw(g, p) {
        g.fillStyle = '#d8f07a';
        g.beginPath();
        g.arc(p.x, p.y, 2.2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, p) {
        G.glow(g, p.x, p.y, 9, '#b8e05a', 0.55);
      },
    },
    // a gob of silk: where it lands it leaves a web, whoever it hits is webbed
    'ds-silk': {
      radius: 4, color: SILK, status: 'webbed', quiet: true, wallSparks: 0,
      draw(g, p, t) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(t * 9);
        g.strokeStyle = 'rgba(239,232,218,0.85)';
        g.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.ellipse(0, 0, 4.4, 1.6, (i * Math.PI) / 4, 0, U.TAU);
          g.stroke();
        }
        g.restore();
      },
      drawGlow(g, p) {
        G.glow(g, p.x, p.y, 8, SILK, 0.3);
      },
      onImpact(p, game, hitWall) {
        const x = p.x - p.vx * 0.012, y = p.y - p.vy * 0.012;
        if (!walk(game, x, y)) return;
        if (game.items.filter((i) => !i.dead && i.def.id === 'ds-web').length > 22) return;
        const w = game.spawnItemAt('ds-web', x, y, { small: true });
        if (w) w.pop = null;
      },
    },
    'ds-flute': {
      radius: 3, color: '#f0e8c8', wallSparks: 6, sparkColor: '#f8f4e8',
      draw(g, p, t) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(t * 16);
        g.strokeStyle = 'rgba(240,250,255,0.8)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-4, 0);
        g.lineTo(3, 0);
        g.stroke();
        g.fillStyle = 'rgba(240,220,160,0.7)';
        g.beginPath();
        g.ellipse(3.5, 0, 1.8, 2.4, 0, 0, U.TAU);
        g.fill();
        g.restore();
      },
      drawGlow(g, p) {
        G.glow(g, p.x, p.y, 6, '#fff4d8', 0.3);
      },
    },
    'ds-tooth': {
      radius: 2.6, color: '#efe6d2', wallSparks: 2, sparkColor: '#efe6d2',
      draw(g, p) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.angle);
        g.fillStyle = '#efe6d2';
        g.beginPath();
        g.moveTo(4, 0);
        g.lineTo(-2, -1.8);
        g.lineTo(-2, 1.8);
        g.closePath();
        g.fill();
        g.fillStyle = '#8a1a1a';
        g.fillRect(-2.6, -1.2, 1, 2.4);
        g.restore();
      },
    },
  };

  // ======================================================== behaviours
  const behaviors = {
    // a statue that isn't: still until you come near (or hurt it), then it's a chaser that keeps its distance
    // (asleep, it's on the specimen side: nobody's enemy, and a hit wakes it the way a caged thing wakes)
    'ds-statue-wakes': {
      update(e, dt, game) {
        const m = e.mem, P = game.player;
        if (!m.awake) {
          e.speedMul = 0;
          e.globalCd = Math.max(e.globalCd, 0.3);
          const asleep = e.faction === 'specimen';
          const near = P && e.pSee && e.pDist < (e.def.wakeRange || 190);
          if (!asleep || near || (e._props && e._props.awake)) {
            m.awake = true;
            m.waking = 1.1;
            if (asleep && game.setFaction) game.setFaction((x) => x === e, 'monster');
            e.aggro = true;
            e.knowsP = true;
            if (e.def.onWake) e.def.onWake(e, game);
          }
          return;
        }
        if (m.waking > 0) {
          m.waking -= dt;
          e.speedMul = 0;
          e.globalCd = Math.max(e.globalCd, 0.2);
          return;
        }
        if (!e.aggro) {
          AI.wander(e, game, 0.3);
          e.speedMul = 0.4;
          return;
        }
        const [lo, hi] = e.def.keep || [110, 260];
        if (!e.seeLos || e.distP > hi) AI.chase(e, game, 1);
        else if (e.distP < lo) AI.away(e, game, 0.8);
        else AI.strafe(e, game, 0.6);
        e.speedMul = e.mem.quick ? 1.25 : 0.9;
      },
    },
    // never moves; its heads do the work (ds-scylla's update)
    'ds-rooted': { update(e) { e.speedMul = 0; } },
    // a guest at the rail: watches what's below, turns its mask toward you; once let loose, a skirmisher
    'ds-patron': {
      update(e, dt, game) {
        const P = game.player;
        if (e.faction === 'specimen' || e.faction === 'dormant') {
          e.speedMul = 0;
          const look = P && e.pSee && e.pDist < 300 ? Math.atan2(P.y - e.y, P.x - e.x) : e.mem.watch != null ? e.mem.watch : e.facing;
          if (e.mem.watch == null) e.mem.watch = e.facing;
          e.facing += U.angDiff(e.facing, look) * Math.min(1, dt * 1.6);
          return;
        }
        if (!e.aggro) {
          AI.wander(e, game, 0.3);
          e.speedMul = 0.35;
          return;
        }
        const [lo, hi] = e.def.keep;
        if (!e.seeLos || e.distP > hi) AI.chase(e, game, 1);
        else if (e.distP < lo) {
          AI.away(e, game, 0.8);
          AI.strafe(e, game, 0.6);
        } else AI.strafe(e, game, 0.9);
      },
    },
    // the Swaddler: keeps its distance and weaves, laying webs as it goes; when hurt badly, it ambushes
    'ds-weaver': {
      update(e, dt, game) {
        const m = e.mem;
        if (!e.aggro) {
          AI.wander(e, game, 0.25);
          e.speedMul = 0.35;
          return;
        }
        m.webT = (m.webT == null ? 1.5 : m.webT) - dt;
        if (m.webT <= 0 && walk(game, e.x, e.y)) {
          m.webT = e.hp < e.maxHp * 0.5 ? 1.6 : 2.6;
          if (game.items.filter((i) => !i.dead && i.def.id === 'ds-web').length < 26) {
            const w = game.spawnItemAt('ds-web', e.x, e.y, {});
            if (w) w.pop = null;
          }
        }
        const P = AI.foe(e, game);
        // close and you're webbed: it comes in to wrap you
        if (P && P.isPlayer && LM.status.has(P, 'webbed') && e.seeLos) {
          AI.chase(e, game, 1);
          e.speedMul = 1.2;
          return;
        }
        const [lo, hi] = e.def.keep;
        if (!e.seeLos || e.distP > hi) AI.chase(e, game, 1);
        else if (e.distP < lo) {
          AI.away(e, game, 1);
          AI.strafe(e, game, 0.7);
        } else AI.strafe(e, game, 1);
        e.speedMul = 1;
      },
    },
  };

  // ======================================================== attacks
  const attacks = {
    // the Tally's touch: it hurts, and it takes ammunition from the weapon in your hand
    'ds-count': {
      canStart: (e, a, game) => {
        const F = AI.foe(e, game);
        return F && e.seeLos && e.distP <= (a.range || 12) + e.r + F.r + 4;
      },
      update(e, atk, dt, game) {
        const a = atk.def, F = AI.foe(e, game);
        if (!F) return (atk.done = true);
        const wind = a.windup || 0.22;
        e.speedMul *= atk.t < wind ? 0.3 : 0.7;
        atk.lunge = atk.t < wind ? atk.t / wind : Math.max(0, 1 - (atk.t - wind) / 0.15);
        if (!atk.struck && atk.t >= wind) {
          atk.struck = true;
          const d = U.dist(e.x, e.y, F.x, F.y), ang = Math.atan2(F.y - e.y, F.x - e.x);
          if (d <= (a.range || 12) + e.r + F.r + 8 && !F.dead && clear(game, e, F)) {
            LM.combat.hurt(game, F, a.damage || 8, { kx: Math.cos(ang) * 90, ky: Math.sin(ang) * 90, source: 'enemy', type: 'melee', by: e });
            if (F.isPlayer) {
              const w = F.currentWeapon && F.currentWeapon();
              if (w && w.ammo && (F.ammo[w.ammo] || 0) > 0) {
                const n = Math.min(F.ammo[w.ammo], a.steal || 6);
                F.ammo[w.ammo] -= n;
                e.mem.stolen = e.mem.stolen || {};
                e.mem.stolen[w.ammo] = (e.mem.stolen[w.ammo] || 0) + n;
                game.particles.add({ type: 'text', x: F.x, y: F.y - 16, vy: -30, drag: 3, life: 0.9, text: '−' + n + ' ' + LM.AMMO_NAMES[w.ammo].toLowerCase(), color: '#e8a440', size: 8 });
                LM.audio.play('tallyCount', { vol: 0.8 });
              }
            }
          }
        }
        if (atk.t >= wind + (a.recover || 0.3)) atk.done = true;
      },
    },
    // the Swaddler's embrace: it holds you (webbed) and wraps, hurting until you get free
    'ds-swaddle': {
      canStart: (e, a, game) => {
        const F = AI.foe(e, game);
        return F && F.isPlayer && e.seeLos && e.distP <= e.r + F.r + 16 && LM.status.has(F, 'webbed');
      },
      start(e, atk, game) {
        LM.audio.play('swaddle', { vol: 1 });
      },
      update(e, atk, dt, game) {
        const a = atk.def, F = AI.foe(e, game);
        e.speedMul = 0;
        if (!F || F.dead) return (atk.done = true);
        // while it holds you it wraps you round and round
        if (U.dist(e.x, e.y, F.x, F.y) < e.r + F.r + 26) {
          LM.status.apply(game, F, 'webbed', { seconds: 0.35 });
          atk.tick = (atk.tick || 0) - dt;
          if (atk.tick <= 0) {
            atk.tick = 0.4;
            LM.combat.hurt(game, F, a.damage || 7, { source: 'enemy', type: 'melee', by: e });
          }
        } else atk.done = true;
        // it lets go after a while, or when hurt hard
        if (atk.t > (a.duration || 2.2) || (e.flash > 0 && (atk.hits = (atk.hits || 0) + 1) > 6)) atk.done = true;
      },
      drawGlow(g, e, atk, t) {
        const P = LM.game && LM.game.player;
        if (!P) return;
        g.strokeStyle = 'rgba(239,232,218,0.5)';
        g.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          g.moveTo(e.x + Math.cos(i) * 6, e.y + Math.sin(i) * 6);
          g.quadraticCurveTo((e.x + P.x) / 2 + Math.sin(t * 4 + i) * 8, (e.y + P.y) / 2 + Math.cos(t * 3 + i) * 8, P.x + Math.cos(i * 2) * 5, P.y + Math.sin(i * 2) * 5);
          g.stroke();
        }
      },
    },
  };

  // ======================================================== drawing
  function snakes(g, n, R, t, col, eyes) {
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU + 0.2;
      const w1 = Math.sin(t * 5 + i * 1.7) * 0.5, w2 = Math.sin(t * 6.3 + i) * 0.6;
      const x1 = Math.cos(a + w1 * 0.4) * R * 0.6, y1 = Math.sin(a + w1 * 0.4) * R * 0.6;
      const x2 = Math.cos(a + w2 * 0.5) * R, y2 = Math.sin(a + w2 * 0.5) * R;
      g.strokeStyle = U.shade(col, (i % 3) * 0.08 - 0.1);
      g.lineWidth = 1.7;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25);
      g.quadraticCurveTo(x1, y1, x2, y2);
      g.stroke();
      g.fillStyle = U.shade(col, 0.1);
      g.beginPath();
      g.ellipse(x2, y2, 1.9, 1.3, a + w2, 0, U.TAU);
      g.fill();
      if (eyes) {
        g.fillStyle = '#e8e040';
        g.fillRect(x2 - 0.4, y2 - 0.4, 0.8, 0.8);
      }
    }
    g.lineCap = 'butt';
  }
  function gorgon(g, e, t) {
    const m = e.mem, stoneK = m.awake ? (m.quick ? 0 : 0.45) : 1;
    if (!m.awake || m.waking > 0) {
      // still on her plinth
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.beginPath();
      g.arc(2, 3, 16, 0, U.TAU);
      g.fill();
      g.fillStyle = '#141514';
      g.beginPath();
      g.arc(0, 0, 15, 0, U.TAU);
      g.fill();
      g.strokeStyle = X.brass;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, 0, 14.2, 0, U.TAU);
      g.stroke();
    }
    const skin = U.mix('#9ab8a0', STONE, stoneK), scale = U.mix('#2a5a46', '#7a8a80', stoneK);
    g.rotate(e.facing);
    // the tail: a long coil behind her, moving as she moves
    g.lineCap = 'round';
    const sw = m.awake ? Math.sin(t * 4) : 0;
    for (const [w, c] of [[11, U.shade(scale, -0.35)], [8, scale], [3, U.shade(scale, 0.25)]]) {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(-4, 0);
      g.bezierCurveTo(-16, 9 * sw + 6, -22, -10 - sw * 6, -34, -4 + sw * 4);
      g.stroke();
    }
    g.lineCap = 'butt';
    // her body: shoulders, arms (one raised, clawed), a breastplate of scales
    g.fillStyle = scale;
    g.beginPath();
    g.ellipse(-2, 0, 8, 9.5, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(1, 0, 6, 8, 0, 0, U.TAU);
    g.fill();
    const lunge = e.atk && e.atk.lunge ? e.atk.lunge * 6 : 0;
    g.beginPath();
    g.ellipse(6 + lunge, 8, 5, 2, 0.5, 0, U.TAU);
    g.ellipse(7, -8, 5, 2, -0.6, 0, U.TAU);
    g.fill();
    // her head and her hair
    g.save();
    g.translate(3, 0);
    snakes(g, 11, 13, m.awake ? t : 0, U.mix('#4a8a62', '#8a948c', stoneK), m.awake);
    g.fillStyle = skin;
    g.beginPath();
    g.arc(0, 0, 4.6, 0, U.TAU);
    g.fill();
    g.restore();
    // cracks in the stone
    if (stoneK > 0.2) {
      g.strokeStyle = 'rgba(30,40,34,' + 0.5 * stoneK + ')';
      g.lineWidth = 0.5;
      g.beginPath();
      g.moveTo(-3, -6);
      g.lineTo(0, -2);
      g.lineTo(-2, 3);
      g.moveTo(3, 4);
      g.lineTo(5, 7);
      g.stroke();
    }
  }
  function scylla(g, e, t) {
    // the body: a woman's torso rising out of a mass of fur and rock, and the necks
    const heads = e.mem.heads || [];
    for (const hd of heads) {
      if (hd.dead) continue;
      const x = hd.x - e.x, y = hd.y - e.y;
      g.lineCap = 'round';
      g.strokeStyle = '#3a3230';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(x * 0.4 + Math.cos(hd.a + 1.4) * 14, y * 0.4 + Math.sin(hd.a + 1.4) * 14, x, y);
      g.stroke();
      g.strokeStyle = '#5a4a44';
      g.lineWidth = 3;
      g.stroke();
      g.lineCap = 'butt';
    }
    g.fillStyle = '#2a2624';
    g.beginPath();
    g.arc(0, 0, 15, 0, U.TAU);
    g.fill();
    g.fillStyle = '#4a3e38';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * U.TAU + t * 0.2;
      g.beginPath();
      g.arc(Math.cos(a) * 10, Math.sin(a) * 10, 4.6, 0, U.TAU);
      g.fill();
    }
    g.fillStyle = '#c8b0a0';
    g.beginPath();
    g.ellipse(0, 0, 5, 6.4, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#1a1210';
    g.beginPath();
    g.arc(0, -1.5, 3.6, Math.PI, U.TAU);
    g.fill();
    // the heads: dogs' heads with too many teeth
    for (const hd of heads) {
      if (hd.dead) continue;
      g.save();
      g.translate(hd.x - e.x, hd.y - e.y);
      g.rotate(hd.a);
      const open = hd.state === 'strike' ? 1 : hd.state === 'rear' ? 0.5 : 0.15;
      g.fillStyle = '#4a3c36';
      g.beginPath();
      g.ellipse(0, 0, 7, 5, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = '#3a2e2a';
      g.beginPath();
      g.moveTo(4, -3.5 - open * 2);
      g.lineTo(11, -1 - open * 3);
      g.lineTo(11, 1 + open * 3);
      g.lineTo(4, 3.5 + open * 2);
      g.fill();
      g.fillStyle = '#efe6d2';
      for (let i = 0; i < 4; i++) {
        g.fillRect(5 + i * 1.6, -1 - open * 2.2, 0.8, 1.4);
        g.fillRect(5 + i * 1.6, open * 2.2 - 0.4, 0.8, 1.4);
      }
      g.fillStyle = '#ff5a2a';
      g.fillRect(1, -3, 1.2, 1.2);
      g.fillRect(1, 1.8, 1.2, 1.2);
      g.restore();
    }
  }
  function patron(g, e, t) {
    const p = e._props || {}, coat = p.coat || ['#0e0e10', '#14261e', '#2a0e12'][Math.floor(U.hash2(Math.floor(e.home.x), Math.floor(e.home.y), 1) * 3)];
    g.rotate(e.facing);
    const walkK = Math.hypot(e.vx, e.vy) > 10 ? Math.sin(e.t * 9) : 0;
    // legs that bend the wrong way: elbows of knees out to the sides
    g.strokeStyle = '#0a0a0a';
    g.lineWidth = 2;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(-2, s * 3);
      g.lineTo(-8 - walkK * s * 3, s * 9);
      g.lineTo(-3 + walkK * s * 4, s * 12);
      g.stroke();
    }
    // a tailcoat (or a gown), a white shirt front
    g.fillStyle = coat;
    g.beginPath();
    g.ellipse(-1, 0, 6.5, 7.5, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#e8e2d4';
    g.beginPath();
    g.ellipse(2, 0, 2.4, 2.6, 0, 0, U.TAU);
    g.fill();
    // long arms, too many joints; a flute of champagne
    g.strokeStyle = coat;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(1, 6);
    g.lineTo(6, 11);
    g.lineTo(11, 7 + (e.atk ? -4 : 0));
    g.moveTo(1, -6);
    g.lineTo(5, -12);
    g.lineTo(10, -10);
    g.stroke();
    g.strokeStyle = 'rgba(240,250,255,0.75)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(11, 7);
    g.lineTo(14, 7);
    g.stroke();
    g.fillStyle = 'rgba(240,220,150,0.6)';
    g.fillRect(13.5, 6, 2, 2);
    // the mask: porcelain, gilt, a fixed smile
    g.fillStyle = '#1a1414';
    g.beginPath();
    g.arc(1, 0, 4.4, 0, U.TAU);
    g.fill();
    g.fillStyle = '#f4efe6';
    g.beginPath();
    g.ellipse(3.4, 0, 2.6, 3.6, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = X.brass;
    g.fillRect(4.4, -2.4, 0.8, 1.4);
    g.fillRect(4.4, 1, 0.8, 1.4);
  }
  function mother(g, e, t) {
    g.rotate(e.facing);
    const m = e.mem, step = Math.hypot(e.vx, e.vy) > 8 ? e.t * 8 : 0;
    // hands, many of them, walking it
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU;
      const ph = Math.sin(step + i * 1.9);
      const r0 = 15, r1 = 23 + ph * 2;
      const hx = Math.cos(a) * r1 + Math.cos(a + Math.PI / 2) * ph * 2, hy = Math.sin(a) * r1 * 0.9 + Math.sin(a + Math.PI / 2) * ph * 2;
      g.strokeStyle = '#b89080';
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.9);
      g.lineTo(hx, hy);
      g.stroke();
      g.fillStyle = '#c8a090';
      g.beginPath();
      g.arc(hx, hy, 2.6, 0, U.TAU);
      g.fill();
      g.strokeStyle = '#c8a090';
      g.lineWidth = 0.9;
      for (let f = -2; f <= 2; f++) {
        g.beginPath();
        g.moveTo(hx, hy);
        g.lineTo(hx + Math.cos(a + f * 0.35) * 4.6, hy + Math.sin(a + f * 0.35) * 4.6);
        g.stroke();
      }
    }
    // the armoured back: plates of something like a fingernail
    g.fillStyle = '#6a5048';
    g.beginPath();
    g.ellipse(-4, 0, 17, 16, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#d8c8b8';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.ellipse(-14 + i * 3, 0, 3, 11 - i, 0, 0, U.TAU);
      g.fill();
    }
    // the mouth: lips, a doorway of teeth, a tongue
    const bite = e.atk ? (e.atk.lunge || 0.4) : 0.15 + 0.1 * Math.sin(t * 2);
    g.fillStyle = '#8a3a3a';
    g.beginPath();
    g.ellipse(6, 0, 11, 13, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#1a0606';
    g.beginPath();
    g.ellipse(8, 0, 6 + bite * 4, 10, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#efe6d2';
    for (let i = -4; i <= 4; i++) {
      g.fillRect(3 + bite * -2, i * 2.2 - 0.8, 2.2, 1.6);
      g.fillRect(12 + bite * 2, i * 2.2 - 0.8, 2.2, 1.6);
    }
    g.fillStyle = '#b84a5a';
    g.beginPath();
    g.ellipse(8, 2, 3, 5, 0.3, 0, U.TAU);
    g.fill();
  }
  function tally(g, e, t) {
    // the segments follow where the head has been
    const seg = e.mem.trail || [];
    for (let i = seg.length - 1; i >= 0; i--) {
      const s = seg[i];
      const x = s.x - e.x, y = s.y - e.y, a = s.a;
      // a pair of hands per segment, fingers drumming
      for (const side of [-1, 1]) {
        const fx = x + Math.cos(a + side * Math.PI / 2) * 7, fy = y + Math.sin(a + side * Math.PI / 2) * 7;
        g.strokeStyle = '#c8a890';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(fx, fy);
        g.stroke();
        g.fillStyle = '#d8b8a0';
        g.beginPath();
        g.arc(fx, fy, 1.8, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#d8b8a0';
        g.lineWidth = 0.7;
        for (let f = 0; f < 4; f++) {
          const tap = Math.sin(t * 18 + i + f * 1.3) > 0.6 ? 1.6 : 0;
          g.beginPath();
          g.moveTo(fx, fy);
          g.lineTo(fx + Math.cos(a + (f - 1.5) * 0.4) * (3 + tap), fy + Math.sin(a + (f - 1.5) * 0.4) * (3 + tap));
          g.stroke();
        }
      }
      g.fillStyle = i % 2 ? '#b89880' : '#a88870';
      g.beginPath();
      g.ellipse(x, y, 4.6, 3.6, a, 0, U.TAU);
      g.fill();
    }
    // its head: a fist, knuckles forward
    g.rotate(e.facing);
    g.fillStyle = '#c8a890';
    g.beginPath();
    g.ellipse(1, 0, 6, 5, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#b89880';
    for (let i = -1.5; i <= 1.5; i++) {
      g.beginPath();
      g.arc(5.4, i * 2.4, 1.5, 0, U.TAU);
      g.fill();
    }
  }
  function usher(g, e, t) {
    const atk = e.atk;
    if (atk && atk.def.type === 'blink' && !atk.moved) g.globalAlpha *= Math.max(0.1, 1 - atk.fade);
    g.rotate(e.facing);
    g.fillStyle = '#0c0c0e';
    G.roundRect(g, -6, -8, 11, 16, 4);
    g.fill();
    g.fillStyle = '#e8e2d4';
    g.beginPath();
    g.moveTo(1, -2);
    g.lineTo(4, 0);
    g.lineTo(1, 2);
    g.fill();
    g.fillStyle = '#7a1418';
    g.fillRect(3, -0.5, 2.6, 1);
    // white gloves
    g.fillStyle = '#efe8da';
    g.beginPath();
    g.arc(4, 8, 2, 0, U.TAU);
    g.arc(4, -8, 2, 0, U.TAU);
    g.fill();
    // where the face should be: an open palm, fingers up
    g.fillStyle = '#d8b8a0';
    g.beginPath();
    g.ellipse(2, 0, 4, 3.6, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = '#d8b8a0';
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    for (let f = -2; f <= 2; f++) {
      g.beginPath();
      g.moveTo(4, f * 1.4);
      g.lineTo(9 - Math.abs(f) * 0.6, f * 2.2);
      g.stroke();
    }
    g.lineCap = 'butt';
  }
  function swaddler(g, e, t) {
    g.rotate(e.facing);
    g.scale(1.35, 1.35);
    const moving = Math.hypot(e.vx, e.vy) > 10;
    // eight long legs, two joints each
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = i % 4;
      const ba = side * (0.5 + k * 0.62);
      const ph = moving ? Math.sin(e.t * 11 + i * 1.7) * 0.25 : Math.sin(t * 1.5 + i) * 0.04;
      const a = ba + ph;
      const kx = Math.cos(a) * 20, ky = Math.sin(a) * 20;
      const fx = Math.cos(a + side * 0.4) * 34, fy = Math.sin(a + side * 0.4) * 34;
      g.strokeStyle = '#1a1414';
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      g.lineTo(kx, ky);
      g.lineTo(fx, fy);
      g.stroke();
      g.strokeStyle = '#3a3030';
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = '#efe6d2';
      g.beginPath();
      g.arc(kx, ky, 1.4, 0, U.TAU);
      g.fill();
    }
    // the perambulator: a hood of oxblood leather trimmed with lace, eggs packed in it
    g.fillStyle = '#2a0a0e';
    g.beginPath();
    g.ellipse(-12, 0, 16, 14, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = X.oxblood;
    g.beginPath();
    g.ellipse(-12, 0, 14.5, 12.5, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = 'rgba(239,232,218,0.75)';
    g.lineWidth = 1;
    g.setLineDash([1.6, 1.2]);
    g.beginPath();
    g.ellipse(-12, 0, 14.5, 12.5, 0, 0, U.TAU);
    g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39996, r = 2 + Math.sqrt(i) * 3.4;
      g.fillStyle = i % 3 ? '#efe6d2' : '#d8ccb8';
      g.beginPath();
      g.ellipse(-12 + Math.cos(a) * r, Math.sin(a) * r, 2.6, 2, a, 0, U.TAU);
      g.fill();
    }
    // the nanny: an apron, a bonnet, a porcelain face
    g.fillStyle = '#2a2a30';
    g.beginPath();
    g.ellipse(4, 0, 8, 7.5, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#efe8da';
    g.beginPath();
    g.ellipse(5, 0, 5, 5.4, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#efe8da';
    g.beginPath();
    g.arc(10, 0, 5.4, 0, U.TAU);
    g.fill();
    g.strokeStyle = 'rgba(200,190,170,0.9)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * U.TAU;
      g.beginPath();
      g.arc(10 + Math.cos(a) * 5.4, Math.sin(a) * 5.4, 1.2, 0, U.TAU);
      g.stroke();
    }
    g.fillStyle = '#f6f2ea';
    g.beginPath();
    g.ellipse(12, 0, 2.6, 3.2, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#1a1a1a';
    g.fillRect(13, -1.6, 0.8, 0.8);
    g.fillRect(13, 0.8, 0.8, 0.8);
    g.fillStyle = '#c84a5a';
    g.fillRect(14.2, -0.6, 0.6, 1.2);
  }
  function swaddling(g, e, t) {
    g.rotate(e.facing);
    const wr = Math.sin(e.t * 14) * 1.2;
    g.strokeStyle = '#3a3030';
    g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1, k = i % 3;
      g.beginPath();
      g.moveTo(-1 + k * 2, s * 2);
      g.lineTo(-3 + k * 3 + wr * s, s * 7);
      g.stroke();
    }
    g.fillStyle = SILK;
    g.beginPath();
    g.ellipse(-1, 0, 6, 4.4, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = 'rgba(160,150,130,0.6)';
    g.lineWidth = 0.5;
    for (let i = -4; i < 4; i += 2) {
      g.beginPath();
      g.moveTo(-6, i);
      g.lineTo(4, i + 2);
      g.stroke();
    }
    g.fillStyle = '#f6f2ea';
    g.beginPath();
    g.arc(5, 0, 2.6, 0, U.TAU);
    g.fill();
    g.fillStyle = '#2a1a1a';
    g.fillRect(6, -1, 0.6, 0.6);
    g.fillRect(6, 0.5, 0.6, 0.6);
  }

  // ======================================================== the monsters
  const SCYLLA_REACH = 118;
  const enemies = {
    'ds-gorgon': {
      name: 'The Gorgon', hp: 950, speed: 74, radius: 13, armor: 0.15, mass: 5, accel: 7, turn: 6, ai: 'ds-statue-wakes', sight: 460, leash: 1600, faction: 'specimen',
      keep: [110, 280], wakeRange: 200, color: '#7a9a88', blood: '#2a3a20', gib: '#8a948c', dreamer: 'A. Voss', deathSound: 'gorgonDie',
      hitbox: { front: 6, back: 12, r: 10 },
      bossBar: {
        name: 'The Gorgon', color: '#7ac8a4', range: 900, sub: (e) => (e.mem.quick ? 'her stone skin is gone' : 'don’t meet her eyes'),
        phases: [{ at: 0.5, text: 'Her stone skin cracks and falls away. She’s faster.', do: (e, game) => {
          e.mem.quick = true;
          game.particles.burst(e.x, e.y, 30, { type: 'chunk', color: [STONE, '#8a948c', '#5a6a60'], speed: 160, life: 0.9, size: 2, vz: 90, z: 3, vr: 10 });
          LM.audio.play('petrify', { vol: 1 });
          for (const ad of e.atkCd.keys()) e.atkCd[ad] = Math.min(e.atkCd[ad], 1);
        } }],
      },
      attacks: [
        { type: 'gaze', range: 430, windup: 1.0, duration: 2.6, recover: 0.6, cone: 0.5, status: 'stone', every: 0.22, petrify: 1.0, petrifyStatus: 'petrified', damage: 18, move: 0.1, cooldown: 6.5, color: '#c8ff9a' },
        { type: 'ranged', projectile: 'ds-venom', damage: 8, speed: 300, burst: 3, burstGap: 0.08, fan: 0.5, windup: 0.4, cooldown: 2.1, range: 400, spread: 0.05, lead: 0.3, flash: '#b8e05a' },
        { type: 'melee', damage: 17, range: 20, windup: 0.32, recover: 0.4, cooldown: 1.3, knock: 220 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-shells', chance: 1 }, { id: 'ammo-fuel', chance: 0.6 }, { id: 'armor-pickup', chance: 1, props: { armor: 'ds-gorgon-eye' } }] },
      onWake(e, game) {
        // (coming back to a floor where she was already awake: no second waking)
        if (game.hasFlag('gorgonWoke')) {
          e.mem.waking = 0;
          return;
        }
        LM.audio.play('stoneCrack', { vol: 1 });
        game.addShake(0.35);
        game.particles.burst(e.x, e.y, 22, { type: 'chunk', color: [STONE, '#8a948c'], speed: 120, life: 0.8, size: 1.8, vz: 80, z: 3 });
        game.toast('The bronze Medusa turns her head.', 'warn');
        if (!game.hasFlag('gorgonWoke')) game.setFlag('gorgonWoke');
      },
      update(e, dt, game) {
        if (e.mem.awake) {
          sighted(e, game, 'Gorgon');
          hunt(e, game, dt, { sound: 'gorgonHiss', every: [2.2, 4], idle: [5, 9], range: 900 });
        }
        // asleep she's bronze: what hits her hardly marks her
        e.armor = e.mem.awake ? (e.mem.quick ? 0.05 : 0.15) : 0.6;
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 34, { type: 'chunk', color: [STONE, '#8a948c', '#4a8a62'], speed: 180, life: 1, size: 2.2, vz: 100, z: 3, vr: 10 });
        if (!game.hasFlag('gorgonDead')) game.setFlag('gorgonDead');
      },
      draw: gorgon,
      drawGlow(g, e, t) {
        if (!e.mem.awake) return;
        const ex = e.x + Math.cos(e.facing) * 4, ey = e.y + Math.sin(e.facing) * 4;
        G.glow(g, ex, ey, 7, '#c8ff9a', 0.25 + 0.1 * Math.sin(t * 3));
      },
    },
    'ds-scylla': {
      name: 'Scylla', hp: 760, speed: 0, radius: 16, armor: 0.2, mass: 99, stationary: true, ai: 'ds-rooted', sight: 420, leash: 99999,
      color: '#4a3e38', blood: '#3a0a0a', gib: '#4a3c36', dreamer: 'G. Moss', deathSound: 'scyllaDie', pullImmune: true,
      bossBar: {
        name: 'Scylla', color: '#c8a070', range: 520, sub: (e) => (e.mem.heads || []).filter((h) => !h.dead).length + ' heads',
        phases: [
          { at: 0.66, text: 'A head goes limp on its neck.', do: (e, game) => killHead(e, game) },
          { at: 0.4, text: 'Another head drops.', do: (e, game) => killHead(e, game) },
          { at: 0.18, text: 'Another.', do: (e, game) => killHead(e, game) },
        ],
      },
      attacks: [],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-rounds', chance: 1 }, { id: 'ammo-shells', chance: 1 }] },
      init(e) {
        e.mem.heads = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          e.mem.heads.push({ i, home: a, a, x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30, state: 'idle', t: 0, cd: U.rand(0.3, 1.5), dead: false });
        }
      },
      update(e, dt, game) {
        const P = game.player;
        sighted(e, game, 'Scylla');
        hunt(e, game, dt, { sound: 'scyllaSnarl', every: [1.6, 3], idle: [4, 7], range: 700 });
        const targets = [];
        if (P && !P.dead && e.pDist < SCYLLA_REACH + 40 && clear(game, e, P)) targets.push(P);
        // she bites anything in reach: what wanders into the strait gets eaten too
        for (const o of game.enemies) if (o !== e && !o.dead && !o.def.flying && U.dist(o.x, o.y, e.x, e.y) < SCYLLA_REACH + 10 && LM.factions.hostile(e.faction, o.faction)) targets.push(o);
        if (targets.length) {
          e.aggro = true;
          e.alertT = Math.max(e.alertT, 0);
        }
        const striking = e.mem.heads.filter((h) => !h.dead && h.state !== 'idle').length;
        for (const hd of e.mem.heads) {
          if (hd.dead) continue;
          hd.cd -= dt;
          hd.t += dt;
          const sway = Math.sin(game.time * 1.3 + hd.i * 1.1) * 0.25;
          if (hd.state === 'idle') {
            const ha = hd.home + sway + (e.flash > 0 ? 0.3 : 0);
            const r = 28 + Math.sin(game.time * 2 + hd.i) * 4;
            hd.x += (e.x + Math.cos(ha) * r - hd.x) * Math.min(1, dt * 5);
            hd.y += (e.y + Math.sin(ha) * r - hd.y) * Math.min(1, dt * 5);
            hd.a += U.angDiff(hd.a, ha) * Math.min(1, dt * 5);
            if (hd.cd <= 0 && striking < 3 && targets.length && e.flash <= 0) {
              // the nearest thing in reach of this head's side
              let best = null, bd = Infinity;
              for (const o of targets) {
                const d = U.dist(e.x, e.y, o.x, o.y), oa = Math.atan2(o.y - e.y, o.x - e.x);
                const k = d + Math.abs(U.angDiff(hd.home, oa)) * 40;
                if (d < SCYLLA_REACH + o.r && k < bd) {
                  bd = k;
                  best = o;
                }
              }
              if (best) {
                hd.state = 'rear';
                hd.t = 0;
                hd.target = best;
                LM.audio.play('scyllaSnap', { vol: far(game, e, 700), throttle: 0.1 });
              }
            }
          } else if (hd.state === 'rear') {
            // it draws back, then it goes
            const o = hd.target, oa = o ? Math.atan2(o.y - e.y, o.x - e.x) : hd.a;
            hd.a += U.angDiff(hd.a, oa) * Math.min(1, dt * 8);
            hd.x += (e.x + Math.cos(oa) * 16 - hd.x) * Math.min(1, dt * 8);
            hd.y += (e.y + Math.sin(oa) * 16 - hd.y) * Math.min(1, dt * 8);
            if (hd.t >= 0.42) {
              hd.state = 'strike';
              hd.t = 0;
              const d = o ? Math.min(SCYLLA_REACH, U.dist(e.x, e.y, o.x, o.y) + 6) : SCYLLA_REACH;
              hd.tx = e.x + Math.cos(oa) * d;
              hd.ty = e.y + Math.sin(oa) * d;
              hd.bit = false;
            }
          } else if (hd.state === 'strike') {
            hd.x += (hd.tx - hd.x) * Math.min(1, dt * 22);
            hd.y += (hd.ty - hd.y) * Math.min(1, dt * 22);
            if (!hd.bit && hd.t > 0.08) {
              hd.bit = true;
              for (const o of targets) {
                if (o.dead || U.dist(hd.x, hd.y, o.x, o.y) > o.r + 13) continue;
                const ang = Math.atan2(o.y - e.y, o.x - e.x);
                LM.combat.hurt(game, o, o.isPlayer ? 15 : 30, { kx: Math.cos(ang) * 160, ky: Math.sin(ang) * 160, source: 'enemy', type: 'melee', by: e });
                LM.audio.play('bite', { vol: game.vol(hd.x, hd.y) });
              }
            }
            if (hd.t > 0.32) {
              hd.state = 'idle';
              hd.cd = U.rand(0.7, 1.4);
            }
          }
        }
      },
      draw: scylla,
      drawGlow(g, e, t) {
        for (const hd of e.mem.heads || []) {
          if (hd.dead || hd.state !== 'rear') continue;
          G.glow(g, hd.x, hd.y, 14, '#ff5a2a', Math.min(1, hd.t / 0.42) * 0.6);
        }
      },
    },
    'ds-patron': {
      name: 'Patron', hp: 62, speed: 122, radius: 9, armor: 0, mass: 1.2, accel: 9, turn: 7, ai: 'ds-patron', sight: 360, leash: 1300,
      keep: [110, 250], color: '#121212', blood: '#3a0a0a', gib: '#f4efe6', dreamer: 'the board',
      attacks: [
        { type: 'ranged', projectile: 'ds-flute', damage: 8, speed: 330, burst: 1, windup: 0.42, cooldown: 1.6, range: 380, spread: 0.06, lead: 0.4, flash: '#fff4d8' },
        { type: 'melee', damage: 11, range: 14, windup: 0.28, recover: 0.35, cooldown: 1.0, knock: 120 },
      ],
      drops: { gold: [4, 14], goldChance: 0.6, items: [{ id: 'ds-medgel', chance: 0.15 }, { id: 'ammo-rounds', chance: 0.25 }] },
      update(e, dt, game) {
        if (e.faction === 'monster') {
          sighted(e, game, 'Patron');
          hunt(e, game, dt, { sound: 'patronTitter', every: [2.5, 4.5], idle: [6, 10], range: 700 });
        }
      },
      onDeath(e, game) {
        game.particles.burst(e.x, e.y, 8, { type: 'chunk', color: '#f4efe6', speed: 120, life: 0.7, size: 1.4, vz: 80, z: 2 });
        LM.audio.play('urnBreak', { vol: 0.5 });
      },
      draw: patron,
      drawGlow(g, e, t) {
        if (e.faction === 'monster' && e.aggro) G.glow(g, e.x + Math.cos(e.facing) * 3.6, e.y + Math.sin(e.facing) * 3.6, 5, '#ffe0a0', 0.25);
      },
    },
    'ds-mother': {
      name: 'Mother of Teeth', hp: 680, speed: 96, radius: 17, armor: 0.05, mass: 6, accel: 7, turn: 4.5, ai: 'chaser', sight: 420, leash: 1500,
      color: '#8a3a3a', blood: '#5a0a0a', gib: '#efe6d2', dreamer: 'I. Brandt', deathSound: 'motherDie', eats: true, feedHeal: 10,
      hitbox: { front: 10, back: 10, r: 15 },
      bossBar: { name: 'Mother of Teeth', color: '#e8a0a0', range: 900, sub: () => 'its back is armoured' },
      attacks: [
        { type: 'charge', damage: 22, speed: 380, duration: 0.45, windup: 0.6, cooldown: 3.6, minRange: 80, maxRange: 280, stun: 0.9 },
        { type: 'ds-bite', damage: 24, range: 18, windup: 0.4, recover: 0.5, cooldown: 1.2, heal: 14, knock: 200 },
        { type: 'ranged', projectile: 'ds-tooth', damage: 7, speed: 340, burst: 7, burstGap: 0.03, fan: 0.9, windup: 0.55, cooldown: 3.2, range: 360, spread: 0.04, lead: 0.2, flash: '#efe6d2' },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-shells', chance: 1 }, { id: 'ammo-fuel', chance: 0.6 }] },
      update(e, dt, game) {
        sighted(e, game, 'Mother');
        hunt(e, game, dt, { sound: 'motherHum', every: [2, 3.6], idle: [5, 8], range: 900 });
        // hit it from behind and the plates take it; from in front, the mouth
        const P = game.player;
        if (P) {
          const from = Math.atan2(P.y - e.y, P.x - e.x);
          e.armor = Math.abs(U.angDiff(e.facing, from)) > 1.9 ? 0.78 : 0.05;
        }
      },
      onDeath(e, game) {
        if (!game.hasFlag('motherDead')) game.setFlag('motherDead');
      },
      draw: mother,
    },
    'ds-tally': {
      name: 'The Tally', hp: 170, speed: 156, radius: 9, armor: 0.05, mass: 1.6, accel: 10, turn: 7, ai: 'chaser', sight: 340, leash: 1400,
      color: '#c8a890', blood: '#5a1a14', gib: '#d8b8a0', dreamer: 'M. Thale', hitbox: { front: 6, back: 26, r: 7 },
      attacks: [
        { type: 'charge', damage: 10, speed: 400, duration: 0.35, windup: 0.3, cooldown: 2.8, minRange: 70, maxRange: 220, stun: 0.5 },
        { type: 'ds-count', damage: 8, range: 12, windup: 0.18, recover: 0.25, cooldown: 0.75, steal: 6 },
      ],
      drops: { items: [{ id: 'ds-medgel', chance: 0.3 }] },
      update(e, dt, game) {
        sighted(e, game, 'Tally');
        hunt(e, game, dt, { sound: 'tallyCount', every: [0.8, 1.6], idle: [3, 6], range: 800 });
        // a trail of segments, each following the one before
        const m = e.mem;
        m.trail = m.trail || [];
        const head = m.trail[0];
        if (!head || U.dist(head.x, head.y, e.x, e.y) > 5) {
          m.trail.unshift({ x: e.x, y: e.y, a: e.facing });
          if (m.trail.length > 7) m.trail.length = 7;
        }
      },
      onDeath(e, game) {
        // it gives back what it counted
        const st = e.mem.stolen || {};
        const ids = { shells: 'ammo-shells', rounds: 'ammo-rounds', cells: 'ammo-cells', rockets: 'ammo-rockets', cryo: 'ammo-cryo', fuel: 'ammo-fuel' };
        for (const k of Object.keys(st)) {
          if (st[k] <= 0) continue;
          const id = ids[k] || 'ammo-' + k;
          if (LM.find('items', id)) game.spawnItemAt(id, e.x, e.y, { amount: st[k] });
          else if (game.player && game.player.ammo[k] != null) game.player.ammo[k] += st[k];
        }
        if (!game.hasFlag('tallyDead')) game.setFlag('tallyDead');
      },
      draw: tally,
    },
    'ds-usher': {
      name: 'Faceless Usher', hp: 110, speed: 104, radius: 9, armor: 0.1, mass: 1.4, accel: 9, turn: 8, ai: 'chaser', sight: 360, leash: 1300,
      color: '#0c0c0e', blood: '#2a0a0a', gib: '#efe8da', dreamer: 'S. Pell',
      attacks: [
        { type: 'blink', minRange: 100, maxRange: 420, windup: 0.4, delay: 0.32, damage: 16, distance: 50, color: '#1a1a1e', cooldown: 4.2, sound: 'usherOut', arriveSound: 'usherIn' },
        { type: 'melee', damage: 12, range: 14, windup: 0.3, recover: 0.35, cooldown: 1.0, knock: 140 },
      ],
      drops: { gold: [5, 18], goldChance: 0.7, items: [{ id: 'ammo-rounds', chance: 0.3 }] },
      update(e, dt, game) {
        sighted(e, game, 'Usher');
      },
      draw: usher,
    },
    'ds-swaddler': {
      name: 'The Swaddler', hp: 1700, speed: 132, radius: 20, armor: 0.1, mass: 5, accel: 8, turn: 6, ai: 'ds-weaver', sight: 480, leash: 1700,
      keep: [150, 300], color: '#4a1416', blood: '#e8e0d0', gib: '#efe6d2', dreamer: 'I. Brandt', deathSound: 'swaddlerDie', flying: false,
      hitbox: { front: 16, back: 28, r: 17 },
      bossBar: {
        name: 'The Swaddler', color: '#efe6d2', range: 1000, sub: () => 'it burns',
        phases: [
          { at: 0.66, text: 'The perambulator splits. Things spill out of it.', do: (e, game) => brood(e, game, 4) },
          { at: 0.33, text: 'It tears its own hood open. More of them.', do: (e, game) => brood(e, game, 5) },
        ],
      },
      attacks: [
        { type: 'ranged', projectile: 'ds-silk', damage: 6, speed: 300, burst: 3, burstGap: 0.12, fan: 0.4, windup: 0.5, cooldown: 2.4, range: 440, spread: 0.06, lead: 0.5, flash: SILK },
        { type: 'ds-swaddle', damage: 7, duration: 2.0, cooldown: 3.5 },
        { type: 'ds-bite', damage: 16, range: 16, windup: 0.32, recover: 0.4, cooldown: 1.2, heal: 0, knock: 160 },
        { type: 'summon', enemy: 'ds-swaddling', count: 2, max: 6, windup: 0.7, cooldown: 7 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-fuel', chance: 1 }, { id: 'ammo-shells', chance: 1 }] },
      update(e, dt, game) {
        sighted(e, game, 'Swaddler');
        hunt(e, game, dt, { sound: 'swaddlerLullaby', every: [3, 5], idle: [6, 10], range: 1100 });
      },
      // fire: it goes up like paper
      onHurt(e, game, dmg, o) {
        const st = o && o.status && (typeof o.status === 'string' ? o.status : o.status.id);
        if (st === 'burning' || o.type === 'status') {
          if (st === 'burning' || LM.status.has(e, 'burning')) e.hp -= dmg * 0.8;
        }
      },
      onDeath(e, game) {
        if (!game.hasFlag('swaddlerDead')) game.setFlag('swaddlerDead');
        // every web on the floor is hers: they come down, nearest first (her curtains only near the nest)
        for (const it of game.items) {
          if (it.dead) continue;
          const d = U.dist(it.x, it.y, e.x, e.y);
          if (it.def.id === 'ds-web' || (it.def.id === 'ds-web-wall' && d < 600)) game.schedule(0.2 + Math.min(2.2, d / 700) + U.rand(0, 0.4), () => it.destroy(game, { quiet: true }));
        }
      },
      draw: swaddler,
      drawGlow(g, e, t) {
        G.glow(g, e.x + Math.cos(e.facing) * 12, e.y + Math.sin(e.facing) * 12, 9, '#f6e8d0', 0.18);
      },
    },
    'ds-swaddling': {
      name: 'Swaddling', hp: 22, speed: 168, radius: 6, mass: 0.6, accel: 12, turn: 12, ai: 'swarmer', sight: 320, leash: 1200,
      color: SILK, blood: '#c8b8a0', gib: SILK, dreamer: 'I. Brandt',
      attacks: [{ type: 'melee', damage: 5, range: 8, windup: 0.16, recover: 0.2, cooldown: 0.7, knock: 50, status: 'snared' }],
      drops: { items: [{ id: 'ds-medgel', chance: 0.06 }, { id: 'ammo-rounds', chance: 0.12 }] },
      update(e, dt, game) {
        hunt(e, game, dt, { sound: 'swaddlingCry', every: [1.6, 3], idle: [4, 7], range: 600 });
      },
      draw: swaddling,
    },
  };
  function killHead(e, game) {
    const live = (e.mem.heads || []).filter((h) => !h.dead);
    if (live.length <= 1) return;
    const hd = live[Math.floor(Math.random() * live.length)];
    hd.dead = true;
    game.particles.burst(hd.x, hd.y, 16, { type: 'dot', color: '#5a0a0a', speed: 140, life: 0.6, size: [1, 2], drag: 4 });
    LM.audio.play('scyllaDie', { vol: 0.8 });
  }
  function brood(e, game, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * U.TAU, x = e.x + Math.cos(a) * 22, y = e.y + Math.sin(a) * 22;
      if (!walk(game, x, y)) continue;
      game.spawnEnemy('ds-swaddling', x, y, { summoned: true, aggro: true });
    }
    game.addShake(0.25);
  }

  // ======================================================== silk, and what's in it
  function web(g, it, t) {
    const R = it.props.small ? 11 : 15;
    g.rotate(U.hash2(it.tx, it.ty, 3) * U.TAU);
    g.strokeStyle = 'rgba(239,232,218,0.5)';
    g.lineWidth = 0.6;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * U.TAU;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      g.stroke();
    }
    for (let r = 3; r < R; r += 3) {
      g.beginPath();
      for (let i = 0; i <= 7; i++) {
        const a = (i / 7) * U.TAU, rr = r + (i % 2) * 0.8;
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.stroke();
    }
  }
  function burnAway(it, game) {
    game.particles.burst(it.x, it.y, 10, { type: 'ember', color: ['#ffb060', '#ff6a2a'], speed: 60, life: 0.8, size: 1.1, drag: 2 });
    game.particles.add({ type: 'smoke', x: it.x, y: it.y, vy: -15, life: 0.9, size: 5, color: '#4a4440', alpha: 0.35 });
  }
  const items = {
    'ds-web': {
      name: 'Web', radius: 12, z: -3, shadow: false, dressing: 'Executive', burns: true, cache: true, cacheRadius: 18,
      destructible: { hp: 14, onBreak: (it, game, o) => burnAway(it, game) },
      snare: { status: 'snared', seconds: 0.35 },
      draw: web,
    },
    'ds-web-wall': {
      name: 'Curtain of silk', radius: 14, solid: 'rect', dressing: 'Executive', burns: true, mapColor: '#d8d0c0',
      destructible: {
        hp: 90,
        onBreak(it, game) {
          burnAway(it, game);
          game.particles.burst(it.x, it.y, 16, { type: 'dot', color: SILK, speed: 90, life: 0.7, size: [0.8, 1.6], drag: 3 });
          LM.audio.play('silkTear', { vol: game.vol(it.x, it.y) });
        },
      },
      init(it) {
        const across = it.props.dir === 'e' || it.props.dir === 'w';
        it.box = across ? [12, T] : [T, 12];
      },
      draw(g, it, t) {
        if (it.props.dir === 'e' || it.props.dir === 'w') g.rotate(Math.PI / 2);
        const k = it.hp != null ? it.hp / 90 : 1;
        g.fillStyle = 'rgba(239,232,218,' + (0.35 + 0.35 * k) + ')';
        G.roundRect(g, -T / 2, -5, T, 10, 4);
        g.fill();
        g.strokeStyle = 'rgba(200,190,170,0.8)';
        g.lineWidth = 0.6;
        for (let i = -T / 2 + 2; i < T / 2; i += 3) {
          g.beginPath();
          g.moveTo(i, -5);
          g.quadraticCurveTo(i + 2, 0, i - 1, 5);
          g.stroke();
        }
      },
    },
    // a person, wrapped: cut it open (E) or break it, and what's inside comes out
    'ds-woven-egg': {
      name: 'A woven egg', radius: 11, solid: true, solidRadius: 9, dressing: 'Executive', mapColor: '#efe6d2', mapAlways: false, burns: false,
      destructible: { hp: 40, onBreak: (it, game) => hatch(it, game) },
      interact: {
        prompt: (it) => (it.props.holds === 'swaddling' ? 'Cut it open (something moves inside)' : 'Cut it open'),
        use(it, game) {
          LM.audio.play('silkTear', { vol: 1 });
          it.destroy(game);
        },
      },
      draw(g, it, t) {
        const live = it.props.holds === 'survivor' || it.props.holds === 'swaddling';
        const pulse = live ? Math.sin(t * (it.props.holds === 'swaddling' ? 7 : 2.2) + it.tx) * 0.6 : 0;
        // anchor strands to the floor
        g.strokeStyle = 'rgba(239,232,218,0.35)';
        g.lineWidth = 0.6;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU + 0.3;
          g.beginPath();
          g.moveTo(Math.cos(a) * 6, Math.sin(a) * 8);
          g.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
          g.stroke();
        }
        g.fillStyle = '#c8bca8';
        g.beginPath();
        g.ellipse(0, 0, 8.4 + pulse * 0.4, 11.5, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = SILK;
        g.beginPath();
        g.ellipse(-0.6, -0.6, 7.6 + pulse * 0.4, 10.8, 0, 0, U.TAU);
        g.fill();
        // a shape inside it
        g.fillStyle = 'rgba(80,60,50,0.18)';
        g.beginPath();
        g.ellipse(0, -1, 4, 8, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = 'rgba(170,160,140,0.75)';
        g.lineWidth = 0.6;
        for (let i = -9; i < 10; i += 2.2) {
          g.beginPath();
          g.moveTo(-8, i);
          g.quadraticCurveTo(0, i + 3 + pulse, 8, i + 1);
          g.stroke();
        }
        if (it.props.hand) {
          g.fillStyle = it.props.skin || '#d8b090';
          g.beginPath();
          g.ellipse(7, 4, 2.4, 1.6, 0.6, 0, U.TAU);
          g.fill();
        }
      },
      update(it, dt, game) {
        // the living ones make a sound when you're near
        if (it.props.holds !== 'survivor' || !game.player) return;
        it.mT = (it.mT || U.rand(1, 3)) - dt;
        if (it.mT <= 0) {
          it.mT = U.rand(3, 6);
          const v = U.clamp(1 - U.dist(it.x, it.y, game.player.x, game.player.y) / 260, 0, 1);
          if (v > 0.05) LM.audio.play('muffled', { vol: v });
        }
      },
    },
  };
  function hatch(it, game) {
    const p = it.props, x = it.x, y = it.y;
    game.particles.burst(x, y, 14, { type: 'dot', color: SILK, speed: 80, life: 0.7, size: [0.8, 1.8], drag: 3 });
    LM.audio.play('silkTear', { vol: game.vol(x, y) });
    const cocoon = game.spawnItemAt('ds-cocoon', x, y, {});
    if (cocoon) cocoon.pop = null;
    if (p.holds === 'survivor') {
      const s = game.spawnItemAt('ds-survivor', x + 14, y, { name: p.name, role: p.role, coat: p.coat || '#2a2a30', skin: p.skin, hair: p.hair, text: p.text, title: p.name, flag: p.flag, knows: p.knows, angle: p.angle });
      if (s) s.pop = null;
      if (p.key) {
        const k = game.spawnItemAt('ds-brass-key', x + 14, y + 14, p.key);
        if (k) k.pop = null;
      }
      if (!game.hasFlag('cutFree')) game.setFlag('cutFree');
      game.toast((p.name || 'Someone') + ' is alive.', 'good');
    } else if (p.holds === 'body') {
      const b = game.spawnItemAt('ds-body', x + 12, y, { title: p.name || 'A worker', kicker: p.kicker || 'Wrapped in silk', angle: p.angle || 1.2, color: p.coat || '#2a2a30', skin: p.skin, hair: p.hair, text: p.text, flag: p.flag });
      if (b) b.pop = null;
      if (p.key) {
        const k = game.spawnItemAt('ds-brass-key', x + 12, y + 14, p.key);
        if (k) k.pop = null;
      }
    } else if (p.holds === 'swaddling') {
      const n = p.count || 3;
      for (let i = 0; i < n; i++) game.spawnEnemy('ds-swaddling', x + U.rand(-8, 8), y + U.rand(-8, 8), { summoned: true, aggro: true });
      LM.audio.play('swaddlingCry', { vol: 1 });
    } else if (p.holds === 'item' && p.item) {
      const k = game.spawnItemAt(p.item, x, y, p.itemProps || {});
      if (k) k.pop = null;
    }
  }
  items['ds-cocoon'] = {
    name: 'An empty cocoon', radius: 9, z: -2, dressing: 'Executive', cache: true,
    draw(g, it) {
      g.rotate(U.hash2(it.tx, it.ty, 5) * 3);
      g.strokeStyle = 'rgba(239,232,218,0.6)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(0, 0, 8, 11, 0, 0.5, U.TAU - 0.5);
      g.stroke();
      g.fillStyle = 'rgba(200,190,170,0.35)';
      g.beginPath();
      g.ellipse(-2, 2, 5, 7, 0.4, 0, U.TAU);
      g.fill();
    },
  };

  // ======================================================== sounds
  if (LM.audio && LM.audio.define) {
    const S = LM.audio.define;
    S('stoneCrack', (t, o, opt, kit) => {
      for (let i = 0; i < 5; i++) kit.noise(t + i * 0.07, o, { type: 'bandpass', freq: 500 + i * 300, dur: 0.06, gain: 0.25, q: 2 });
      kit.tone(t, o, { type: 'sine', f0: 70, f1: 40, dur: 0.5, gain: 0.25 });
    });
    S('gorgonHiss', (t, o, opt, kit) => {
      for (let i = 0; i < 3; i++) kit.noise(t + i * 0.18, o, { type: 'highpass', freq: 4200, dur: 0.22, gain: 0.07, attack: 0.04 });
    });
    S('gorgonDie', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 900, freqEnd: 80, dur: 1, gain: 0.5 });
      kit.tone(t, o, { type: 'sawtooth', f0: 400, f1: 90, dur: 0.9, gain: 0.05 });
    });
    S('scyllaSnarl', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 110, f1: 90, dur: 0.4, gain: 0.05, detune: 20 });
      kit.noise(t, o, { type: 'bandpass', freq: 500, dur: 0.4, gain: 0.08, q: 2 });
    });
    S('scyllaSnap', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 1400, dur: 0.05, gain: 0.2, q: 3 });
      kit.tone(t, o, { type: 'sawtooth', f0: 300, f1: 160, dur: 0.12, gain: 0.04 });
    });
    S('scyllaDie', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 520, f1: 120, dur: 0.6, gain: 0.06 });
    });
    S('patronTitter', (t, o, opt, kit) => {
      for (let i = 0; i < 4; i++) kit.tone(t + i * 0.09, o, { type: 'triangle', f0: 720 - i * 30, f1: 640 - i * 30, dur: 0.07, gain: 0.03 });
    });
    S('motherHum', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 196, f1: 220, dur: 0.9, gain: 0.06, attack: 0.2 });
      kit.tone(t + 0.9, o, { type: 'sine', f0: 247, f1: 233, dur: 0.7, gain: 0.05, attack: 0.15 });
    });
    S('motherDie', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 600, freqEnd: 90, dur: 1.2, gain: 0.5 });
      kit.tone(t, o, { type: 'sine', f0: 220, f1: 60, dur: 1.1, gain: 0.12 });
    });
    S('tallyCount', (t, o, opt, kit) => {
      for (let i = 0; i < 6; i++) kit.noise(t + i * 0.045, o, { type: 'bandpass', freq: 2600 + (i % 2) * 600, dur: 0.012, gain: 0.12, q: 4 });
    });
    S('usherOut', (t, o, opt, kit) => kit.noise(t, o, { type: 'lowpass', freq: 400, freqEnd: 120, dur: 0.3, gain: 0.15 }));
    S('usherIn', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 160, freqEnd: 500, dur: 0.18, gain: 0.2 });
      kit.tone(t, o, { type: 'sine', f0: 110, dur: 0.25, gain: 0.08 });
    });
    S('swaddlerLullaby', (t, o, opt, kit) => {
      const notes = [523, 659, 587, 523, 392];
      notes.forEach((f, i) => kit.tone(t + i * 0.28, o, { type: 'triangle', f0: f * 0.98, f1: f, dur: 0.24, gain: 0.03, detune: -15 }));
    });
    S('swaddlerDie', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 1200, freqEnd: 100, dur: 1.3, gain: 0.45 });
      kit.tone(t, o, { type: 'triangle', f0: 660, f1: 110, dur: 1.2, gain: 0.05 });
    });
    S('swaddle', (t, o, opt, kit) => kit.noise(t, o, { type: 'highpass', freq: 2200, dur: 0.6, gain: 0.08, attack: 0.1 }));
    S('swaddlingCry', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 880, f1: 990, dur: 0.3, gain: 0.025, attack: 0.05 });
      kit.tone(t + 0.32, o, { type: 'sawtooth', f0: 990, f1: 820, dur: 0.35, gain: 0.025 });
    });
    S('silkTear', (t, o, opt, kit) => kit.noise(t, o, { type: 'bandpass', freq: 1800, freqEnd: 900, dur: 0.25, gain: 0.15, q: 1.5 }));
    S('muffled', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 210, f1: 240, dur: 0.4, gain: 0.025, attack: 0.08 });
      kit.noise(t, o, { type: 'lowpass', freq: 400, dur: 0.4, gain: 0.04 });
    });
  }

  LM.definePack({ id: 'ds-executive', statuses, projectiles, behaviors, attacks, enemies, items });
})();
