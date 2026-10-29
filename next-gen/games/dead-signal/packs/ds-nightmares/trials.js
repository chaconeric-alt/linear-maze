/* Dead Signal — packs/ds-nightmares/trials.js
 * Floor 4's nightmares (the Proving Grounds: DESIGN.md section 4.4). The board kept these for its
 * evenings. Every one hunts out loud, as Floor 3's do (DS.hunt), and most of them eat what they kill.
 *
 *   ds-hound       a Grinner: a long hairless dog with no eyes and a grin all the way round its head.
 *                  They hunt in packs: they circle, then one darts in; a bite pins you (held). Moss's.
 *   ds-rat         one of Thale's rats. Never one.
 *   ds-rat-king    the Rat King: a wheel of rats knotted at the tails, rolling. It calls more rats, and
 *                  it screams (a ring that staggers you). A named bar while you fight it. Thale's.
 *   ds-jester      the Jester: a tall clown with three heads on long necks (one laughs, one weeps, one
 *                  sings). It throws knives in fans, laughs (a ring that staggers), and steps out of the
 *                  air behind you to cut. Each head that dies makes it quicker. A named bar. Voss's.
 *   ds-underbed    what lives under the Nursery's bed. Hidden on the specimen side until it's let out;
 *                  then long arms reach out from under the bed and drag you to it. It comes out to hunt,
 *                  and when it has been hurt enough it goes back under. Brandt's.
 *   ds-diner       a guest at the Long Room's table: evening dress, a porcelain mask that smiles, and
 *                  under the mask, nothing but a mouth. Strapped in its chair (the specimen side) it
 *                  watches you; let out, it feeds. Pell's.
 *   ds-captive     a person in an orange jumpsuit: tonight's other contestants. Nobody's side
 *                  (faction captive; the monsters hunt them). Caged (faction dormant) they cower; let
 *                  out, they run for the tiles tagged props.refuge (default 'refuge'). One who gets there
 *                  is safe (a ds-survivor sits down there: ds-story/proving.js) and sets captiveSaved and
 *                  saved<key>; one who dies leaves a body (props.body text) and sets captiveDied<key>.
 *                  props: key, name, coat, skin, hair, saved (what they say when you talk to them).
 * Feeding: DS.findMeal(e, game, R) / DS.feeding(e, dt, game). A monster with nothing to fight goes to a
 * body (ds-body, not covered) and eats; what it eats heals it. Anything close and worth fighting stops it.
 * Attacks: ds-bite (a melee bite that heals the biter: { damage, range, windup, recover, heal, status }),
 * ds-blink (step out of the air behind the foe and cut: { damage, windup, delay, minRange, maxRange }).
 * Projectile: ds-knife.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;
  const DS = (LM.DS = LM.DS || {});
  const SKIN = '#c8a8a0', GRIN = '#f4ede0', MOTLEY = ['#d8303a', '#f2ece2', '#1a1418'];

  const contained = (e) => e.faction === 'specimen';
  const far = (game, e, range) => {
    const P = game.player;
    return P ? U.clamp(1 - U.dist(e.x, e.y, P.x, P.y) / (range || 1100), 0, 1) : 0;
  };
  const hunt = (e, game, dt, o) => DS.hunt && DS.hunt(e, game, dt, o);
  const sighted = (e, game, kind) => DS.sighted && DS.sighted(e, game, kind);
  const clear = (game, a, b) => LM.physics.los(game.level, a.x, a.y, b.x, b.y, 'shot');
  const freeAt = (game, x, y, r) => {
    const L = game.level;
    for (const [dx, dy] of [[0, 0], [-r, -r], [r, -r], [-r, r], [r, r]]) if (L.solidAt(Math.floor((x + dx) / T), Math.floor((y + dy) / T))) return false;
    return true;
  };

  // ------------------------------------------------------------ feeding
  DS.findMeal = function (e, game, R) {
    let best = null, bd = R || 360;
    for (const it of game.items) {
      if (it.dead || it.def.id !== 'ds-body' || it.props.covered || (it.eaten || 0) >= 3) continue;
      const d = U.dist(e.x, e.y, it.x, it.y);
      if (d < bd && (d < 60 || clear(game, e, it))) {
        best = it;
        bd = d;
      }
    }
    if (!best) return false;
    e.mem.meal = best;
    e.mem.mealT = 0;
    return true;
  };
  DS.feeding = function (e, dt, game) {
    const m = e.mem, M = m.meal;
    if (!M || M.dead || (M.eaten || 0) >= 3) {
      m.meal = null;
      m.eating = false;
      return false;
    }
    // something worth more than a meal, close: leave it
    const F = AI.foe(e, game);
    if (F && e.aggro && e.seeLos && e.distP < (m.eating ? 80 : 170)) {
      m.meal = null;
      m.eating = false;
      return false;
    }
    if (e.flash > 0 && m.eating) {
      m.meal = null;
      m.eating = false;
      return false;
    }
    const d = U.dist(e.x, e.y, M.x, M.y);
    if (d > 18) {
      if (d < 70 || clear(game, e, M)) {
        e.mx += (M.x - e.x) / d;
        e.my += (M.y - e.y) / d;
      } else AI.goTo(e, game, M.x, M.y, 1);
      e.speedMul = 0.95;
      return true;
    }
    m.eating = true;
    e.speedMul = 0;
    e.facing += U.angDiff(e.facing, Math.atan2(M.y - e.y, M.x - e.x)) * Math.min(1, dt * 8);
    M.eaten = (M.eaten || 0) + dt * 0.3;
    e.hp = Math.min(e.maxHp, e.hp + (e.def.feedHeal || 5) * dt);
    m.chewT = (m.chewT || 0) - dt;
    if (m.chewT <= 0) {
      m.chewT = U.rand(0.35, 0.7);
      const v = far(game, e, 700);
      if (v > 0.05) LM.audio.play('chew', { vol: v, throttle: 0.12 });
      if (Math.random() < 0.5) game.particles.add({ type: 'dot', x: M.x + U.rand(-6, 6), y: M.y + U.rand(-6, 6), vx: U.rand(-30, 30), vy: U.rand(-30, 30), life: 0.4, size: 1.2, color: '#6a0e0e', drag: 6 });
    }
    m.mealT = (m.mealT || 0) + dt;
    if (M.eaten >= 3 || m.mealT > (e.def.mealTime || 7)) {
      m.meal = null;
      m.eating = false;
    }
    return true;
  };
  /** A kill: whatever made it, and anything else hungry close by, comes to eat. */
  function dinnerBell(game, x, y, body) {
    if (!body) return;
    for (const o of game.enemies) {
      if (o.dead || !o.def.eats || contained(o)) continue;
      if (U.dist(o.x, o.y, x, y) < 220 && !o.mem.meal) {
        o.mem.meal = body;
        o.mem.mealT = 0;
      }
    }
  }
  DS.dinnerBell = dinnerBell;

  // ------------------------------------------------------------ the cage: cower, or press the bars
  function inCage(e, dt, game) {
    const m = e.mem;
    m.press = e.pSee && e.pDist < (e.def.pressRange || 260);
    if (m.press) {
      const P = game.player;
      const dx = P.x - e.x, dy = P.y - e.y, l = Math.hypot(dx, dy) || 1;
      e.mx += dx / l;
      e.my += dy / l;
      e.speedMul = 0.5;
      e.facing += U.angDiff(e.facing, Math.atan2(dy, dx)) * Math.min(1, dt * 6);
      return;
    }
    AI.wander(e, game, 0.35);
    e.speedMul = 0.3;
  }

  // ------------------------------------------------------------ behaviours
  const behaviors = {
    // the Grinners: a pack. They circle at a distance, then one darts in.
    'ds-pack': {
      update(e, dt, game) {
        if (contained(e)) return inCage(e, dt, game);
        if (DS.feeding(e, dt, game)) return;
        const m = e.mem, F = AI.foe(e, game);
        if (!e.aggro || !F) {
          if (DS.findMeal(e, game, 300)) return;
          AI.wander(e, game, 0.45);
          e.speedMul = 0.5;
          return;
        }
        m.circle = (m.circle == null ? U.rand(0.5, 1.4) : m.circle) - dt;
        if (!e.seeLos || e.distP > 210) {
          AI.chase(e, game, 1);
          e.speedMul = 1.05;
        } else if (m.circle > 0) {
          if (e.distP < 80) AI.away(e, game, 0.7);
          else AI.chase(e, game, 0.45);
          AI.strafe(e, game, 1.1);
          e.speedMul = 0.95;
        } else {
          AI.chase(e, game, 1);
          e.speedMul = 1.2;
          if (e.distP < 30 || m.circle < -1.8) m.circle = U.rand(0.7, 1.7);
        }
      },
    },

    // a captive: cower in the cage; out, run for the refuge, and away from anything hunting you
    'ds-flee': {
      update(e, dt, game) {
        const m = e.mem;
        if (e.faction === 'dormant') {
          e.speedMul = 0;
          m.cower = true;
          return;
        }
        m.cower = false;
        if (m.loose > 0) {
          m.loose -= dt;
          e.speedMul = 0;
          return;
        }
        // what's hunting it
        m.threatT = (m.threatT || 0) - dt;
        if (m.threatT <= 0) {
          m.threatT = 0.2;
          m.threat = null;
          let bd = 170;
          for (const o of game.enemies) {
            if (o.dead || o === e || !LM.factions.hostile(o.faction, e.faction)) continue;
            const d = U.dist(e.x, e.y, o.x, o.y);
            if (d < bd && clear(game, e, o)) {
              bd = d;
              m.threat = o;
            }
          }
        }
        const th = m.threat;
        let w = 1;
        if (th && !th.dead) {
          const dx = e.x - th.x, dy = e.y - th.y, l = Math.hypot(dx, dy) || 1;
          e.mx += (dx / l) * 1.3;
          e.my += (dy / l) * 1.3;
          w = 0.6;
          m.screamT = (m.screamT || 0) - dt;
          if (m.screamT <= 0) {
            m.screamT = U.rand(1.6, 3);
            const v = far(game, e, 1200);
            if (v > 0.04) LM.audio.play('scream', { vol: v * 0.9, throttle: 0.4 });
          }
        }
        // the refuge
        const R = refugeOf(e, game);
        if (R) {
          const d = U.dist(e.x, e.y, R.x, R.y);
          if (d < 20) return reachRefuge(e, game);
          if (d < 50 && clear(game, e, R)) {
            e.mx += ((R.x - e.x) / d) * w;
            e.my += ((R.y - e.y) / d) * w;
          } else if (!AI.goTo(e, game, R.x, R.y, w, 220)) AI.wander(e, game, 0.5);
        } else AI.wander(e, game, 0.5);
        e.speedMul = th ? 1.15 : 1;
      },
    },

    // the Rat King rolls toward you, a little at a time
    'ds-roll': {
      update(e, dt, game) {
        const F = AI.foe(e, game);
        if (!e.aggro || !F) {
          AI.wander(e, game, 0.3);
          e.speedMul = 0.4;
          return;
        }
        AI.chase(e, game, 1);
        e.speedMul = 0.7 + 0.5 * Math.max(0, Math.sin(e.t * 2.2));
      },
    },

    // the Jester: behind the curtain until it's let out; then it dances at knife range
    'ds-jester': {
      update(e, dt, game) {
        if (contained(e)) {
          e.speedMul = 0;
          return;
        }
        const m = e.mem, F = AI.foe(e, game);
        if (!e.aggro || !F) {
          AI.wander(e, game, 0.3);
          e.speedMul = 0.35;
          return;
        }
        const heads = m.heads || 3;
        const want = heads === 1 ? 120 : heads === 2 ? 160 : 200;
        if (!e.seeLos || e.distP > want + 70) AI.chase(e, game, 1);
        else if (e.distP < want - 50) AI.away(e, game, 0.9);
        AI.strafe(e, game, 0.9);
        // it skips: a hop every so often
        const skip = 0.75 + 0.45 * Math.max(0, Math.sin(e.t * 5.5));
        e.speedMul = skip * (heads === 1 ? 1.5 : heads === 2 ? 1.22 : 1);
      },
    },

    // what lives under the bed
    'ds-underbed': {
      update(e, dt, game) {
        const m = e.mem;
        if (!m.den) m.den = { x: e.x, y: e.y };
        if (contained(e)) {
          e.speedMul = 0;
          e.visible = false;
          return;
        }
        if (m.under == null) {
          m.under = true;
          m.underT = 0;
          m.hpMark = e.hp;
          m.outAfter = 4.5;
        }
        if (m.under) {
          e.speedMul = 0;
          e.armor = 0.55;
          m.underT += dt;
          if (m.underT > m.outAfter || e.hp < m.hpMark - e.maxHp * 0.16) {
            m.under = false;
            m.outT = 0;
            m.hpMark = e.hp;
            e.armor = e.def.armor || 0;
            LM.audio.play('underbedOut', { vol: Math.max(0.5, far(game, e, 600)) });
            if (!m.cameOut) {
              m.cameOut = true;
              game.toast('It comes out from under the bed.', 'warn');
              game.addShake(0.3);
            }
          }
          return;
        }
        m.outT += dt;
        if (m.back || m.outT > 9 || e.hp < m.hpMark - e.maxHp * 0.22) {
          // back under the bed
          m.back = true;
          const d = U.dist(e.x, e.y, m.den.x, m.den.y);
          if (d < 14) {
            m.back = false;
            m.under = true;
            m.underT = 0;
            m.hpMark = e.hp;
            m.outAfter = U.rand(3, 5);
            LM.audio.play('underbedScrape', { vol: far(game, e, 600) });
            return;
          }
          if (d < 60 || clear(game, e, m.den)) {
            e.mx += (m.den.x - e.x) / d;
            e.my += (m.den.y - e.y) / d;
          } else AI.goTo(e, game, m.den.x, m.den.y, 1);
          e.speedMul = 1.35;
          return;
        }
        const F = AI.foe(e, game);
        if (!F) return;
        AI.chase(e, game, 1);
        // it scuttles sideways, never straight at you
        AI.strafe(e, game, 0.5);
        e.speedMul = 1;
      },
    },

    // a Diner: strapped in, it watches you; let out, it rises, and then it eats
    'ds-diner': {
      update(e, dt, game) {
        const m = e.mem, P = game.player;
        if (contained(e)) {
          e.speedMul = 0;
          m.seated = true;
          if (P && e.pSee && e.pDist < 420) e.facing += U.angDiff(e.facing, Math.atan2(P.y - e.y, P.x - e.x)) * Math.min(1, dt * 2.5);
          return;
        }
        if (m.seated) {
          m.seated = false;
          m.rise = U.rand(0.5, 1.1);
        }
        if (m.rise > 0) {
          m.rise -= dt;
          e.speedMul = 0;
          e.globalCd = Math.max(e.globalCd, 0.2);
          if (m.rise <= 0) LM.audio.play('dinerRise', { vol: far(game, e, 700) });
          return;
        }
        if (DS.feeding(e, dt, game)) return;
        const F = AI.foe(e, game);
        if (F && e.aggro) {
          AI.chase(e, game, 1);
          e.speedMul = 1;
          return;
        }
        if (DS.findMeal(e, game, 500)) return;
        AI.wander(e, game, 0.4);
        e.speedMul = 0.4;
      },
    },
  };

  // ------------------------------------------------------------ the refuge
  function refugeOf(e, game) {
    const tag = (e._props && e._props.refuge) || 'refuge';
    const pts = game.level.tags[tag];
    if (!pts || !pts.length) return null;
    let best = null, bd = Infinity;
    for (const p of pts) {
      const x = p.x * T + T / 2, y = p.y * T + T / 2, d = U.dist(e.x, e.y, x, y);
      if (d < bd) {
        bd = d;
        best = { x, y };
      }
    }
    return best;
  }
  function reachRefuge(e, game) {
    const p = e._props || {};
    const tag = p.refuge || 'refuge';
    // a seat of their own in there
    const pts = (game.level.tags[tag] || []).map((q) => ({ x: q.x * T + T / 2, y: q.y * T + T / 2 }));
    const taken = (q) => game.items.some((it) => !it.dead && it.def.id === 'ds-survivor' && U.dist(it.x, it.y, q.x, q.y) < 20);
    const seat = pts.find((q) => !taken(q)) || { x: e.x, y: e.y };
    e.dead = true;
    const s = game.spawnItemAt('ds-survivor', seat.x, seat.y, { name: p.name, key: p.key, coat: p.coat, skin: p.skin, hair: p.hair, text: p.saved, title: p.name, flag: p.savedFlag, knows: p.knows });
    if (s) s.pop = null;
    if (!game.hasFlag('captiveSaved')) game.setFlag('captiveSaved');
    if (p.key && !game.hasFlag('saved' + p.key)) game.setFlag('saved' + p.key);
    game.toast((p.name || 'Someone') + ' made it.', 'good');
    LM.audio.play('key', { vol: 0.6 });
  }

  // ------------------------------------------------------------ attacks
  const attacks = {
    // a bite: it hurts, it may pin you, and the biter is the better for it
    'ds-bite': {
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
          const reach = (a.range || 12) + e.r + F.r + 8, d = U.dist(e.x, e.y, F.x, F.y);
          const ang = Math.atan2(F.y - e.y, F.x - e.x);
          e.kvx += Math.cos(ang) * 110;
          e.kvy += Math.sin(ang) * 110;
          if (d <= reach && !F.dead && clear(game, e, F)) {
            LM.combat.hurt(game, F, a.damage || 9, { kx: Math.cos(ang) * (a.knock || 80), ky: Math.sin(ang) * (a.knock || 80), source: 'enemy', type: 'melee', status: F.isPlayer ? a.status : null, by: e });
            e.hp = Math.min(e.maxHp, e.hp + (a.heal || 0));
            LM.audio.play(e.def.biteSound || 'bite', { vol: game.vol(e.x, e.y) });
          }
        }
        if (atk.t >= wind + (a.recover || 0.3)) atk.done = true;
      },
    },
    // the Jester's trick: gone in a puff of confetti, and then behind you
    'ds-blink': {
      canStart: (e, a, game) => {
        const F = AI.foe(e, game);
        return F && e.seeLos && e.distP >= (a.minRange || 90) && e.distP <= (a.maxRange || 460);
      },
      start(e, atk, game) {
        LM.audio.play('jesterBlink', { vol: game.vol(e.x, e.y) });
        confetti(game, e.x, e.y, 18);
      },
      update(e, atk, dt, game) {
        const a = atk.def, F = AI.foe(e, game);
        e.speedMul = 0;
        if (!F) return (atk.done = true);
        const wind = a.windup || 0.35;
        atk.fade = atk.moved ? Math.max(0, 1 - (atk.t - atk.movedAt) / 0.15) : Math.min(1, atk.t / wind);
        if (!atk.moved && atk.t >= wind) {
          atk.moved = true;
          atk.movedAt = atk.t;
          // behind the foe: away from where it's looking
          const look = F.isPlayer ? F.aim : Math.atan2(e.y - F.y, e.x - F.x) + Math.PI;
          const back = look + Math.PI;
          for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, Math.PI]) {
            const x = F.x + Math.cos(back + off) * 54, y = F.y + Math.sin(back + off) * 54;
            if (!freeAt(game, x, y, e.r) || !LM.physics.los(game.level, F.x, F.y, x, y, 'shot')) continue;
            confetti(game, e.x, e.y, 10);
            e.x = x;
            e.y = y;
            e.vx = e.vy = e.kvx = e.kvy = 0;
            confetti(game, x, y, 18);
            break;
          }
          e.facing = Math.atan2(F.y - e.y, F.x - e.x);
          LM.audio.play('jesterLaugh', { vol: Math.max(0.6, game.vol(e.x, e.y)) });
        }
        if (atk.moved && !atk.struck && atk.t >= atk.movedAt + (a.delay || 0.28)) {
          atk.struck = true;
          const d = U.dist(e.x, e.y, F.x, F.y), ang = Math.atan2(F.y - e.y, F.x - e.x);
          LM.audio.play('swing', { vol: game.vol(e.x, e.y) });
          if (d <= e.r + F.r + 26 && !F.dead && clear(game, e, F)) LM.combat.hurt(game, F, a.damage || 18, { kx: Math.cos(ang) * 180, ky: Math.sin(ang) * 180, source: 'enemy', type: 'melee', status: a.status, by: e });
        }
        if (atk.struck && atk.t >= atk.movedAt + (a.delay || 0.28) + 0.3) atk.done = true;
      },
      drawGlow(g, e, atk) {
        if (!atk.moved) G.glow(g, e.x, e.y, 30, '#ff5ab0', (atk.t / (atk.def.windup || 0.35)) * 0.5);
        else if (!atk.struck) G.glow(g, e.x + Math.cos(e.facing) * 14, e.y + Math.sin(e.facing) * 14, 14, '#f2ece2', 0.5);
      },
    },
  };
  function confetti(game, x, y, n) {
    game.particles.burst(x, y, n, { type: 'dot', color: ['#ff5ab0', '#5ad0ff', '#ffe04a', '#8aff6a', '#f2ece2'], speed: 160, life: 0.7, size: [0.8, 1.8], drag: 3 });
  }

  // ------------------------------------------------------------ the knives
  const projectiles = {
    'ds-knife': {
      radius: 3, color: '#e8ecee', wallSparks: 2, sparkColor: '#f2ece2',
      draw(g, p, t) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(t * 22 + p.x * 0.1);
        g.fillStyle = '#e8ecee';
        g.beginPath();
        g.moveTo(5, 0);
        g.lineTo(-1, -1.4);
        g.lineTo(-1, 1.4);
        g.closePath();
        g.fill();
        g.fillStyle = '#3a2418';
        g.fillRect(-4, -0.9, 3, 1.8);
        g.restore();
      },
      drawGlow(g, p) {
        G.glow(g, p.x, p.y, 7, '#ff9ad8', 0.25);
      },
    },
  };

  // ------------------------------------------------------------ drawing
  function hound(g, e, t) {
    g.rotate(e.facing);
    const run = Math.hypot(e.vx, e.vy) > 8 ? e.t * 13 : 0;
    const lunge = e.atk && e.atk.lunge ? e.atk.lunge : 0;
    const charging = e.atk && e.atk.def.type === 'charge' && e.atk.t > (e.atk.def.windup || 0.3);
    // four long thin legs, a lope
    g.strokeStyle = '#a88a84';
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    for (const [ax, side, ph] of [[6, -1, 0], [6, 1, Math.PI], [-7, -1, Math.PI * 0.6], [-7, 1, Math.PI * 1.6]]) {
      const sw = Math.sin(run + ph) * 4;
      g.beginPath();
      g.moveTo(ax, side * 3);
      g.lineTo(ax + sw * 0.5, side * 7);
      g.lineTo(ax + sw, side * 9.5);
      g.stroke();
    }
    g.lineCap = 'butt';
    // the body: long, low, the ribs showing; the spine a ridge
    const stretch = charging ? 1.18 : 1;
    g.fillStyle = SKIN;
    g.beginPath();
    g.ellipse(-1, 0, 11 * stretch, 5, 0, 0, U.TAU);
    g.fill();
    g.strokeStyle = 'rgba(120,80,80,0.45)';
    g.lineWidth = 0.5;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(i * 1.8, -4.4);
      g.quadraticCurveTo(i * 1.8 + 0.8, 0, i * 1.8, 4.4);
      g.stroke();
    }
    g.fillStyle = 'rgba(90,50,50,0.4)';
    g.fillRect(-10, -0.5, 18, 1);
    // a rat's tail
    g.strokeStyle = '#b89a94';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-11, 0);
    g.quadraticCurveTo(-16, Math.sin(e.t * 6) * 3, -19, Math.sin(e.t * 6 + 1) * 4);
    g.stroke();
    // the head: no eyes at all. The grin goes all the way round, and the teeth are a person's.
    const hx = 12 + lunge * 4;
    g.fillStyle = '#d4b4ac';
    g.beginPath();
    g.ellipse(hx, 0, 5.4, 4.6, 0, 0, U.TAU);
    g.fill();
    const open = e.atk ? 0.5 + lunge * 0.5 : 0.25 + 0.15 * Math.sin(e.t * 3);
    g.fillStyle = '#3a0c10';
    g.beginPath();
    g.ellipse(hx + 1.6, 0, 3.6, 3.6 * open + 0.6, 0, -1.2, 1.2);
    g.fill();
    g.fillStyle = GRIN;
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.36;
      g.fillRect(hx + 1.6 + Math.cos(a) * 3.4 - 0.5, Math.sin(a) * 3.4 - (3.6 * open) * 0.2 - 0.7, 1, 1.1);
      g.fillRect(hx + 1.6 + Math.cos(a) * 3.4 - 0.5, Math.sin(a) * 3.4 + (3.6 * open) * 0.2 - 0.4, 1, 1.1);
    }
    // the line of the grin wraps back past where the eyes would be
    g.strokeStyle = 'rgba(70,20,20,0.6)';
    g.lineWidth = 0.6;
    g.beginPath();
    g.arc(hx, 0, 4.4, -1.9, -1.1);
    g.moveTo(hx + Math.cos(1.1) * 4.4, Math.sin(1.1) * 4.4);
    g.arc(hx, 0, 4.4, 1.1, 1.9);
    g.stroke();
  }

  function rat(g, e, t) {
    g.rotate(e.facing);
    const w = Math.sin(e.t * 26) * 0.6;
    g.strokeStyle = '#c89088';
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(-3.5, 0);
    g.quadraticCurveTo(-6, w * 3, -9, w * 2);
    g.stroke();
    g.fillStyle = '#7a6a5c';
    g.beginPath();
    g.ellipse(0, 0, 4.2, 2.6, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#8c7c6c';
    g.beginPath();
    g.ellipse(3.6, 0, 2, 1.6, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#d89a90';
    g.beginPath();
    g.arc(5.4, 0, 0.6, 0, U.TAU);
    g.fill();
  }

  function ratKing(g, e, t) {
    const n = Math.max(4, Math.ceil(12 * (e.hp / e.maxHp)));
    const spin = e.t * 0.9;
    // the knot at the middle: tails, braided and black
    g.fillStyle = '#4a3026';
    g.beginPath();
    g.arc(0, 0, 6, 0, U.TAU);
    g.fill();
    g.strokeStyle = '#8a5a50';
    g.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(0, 0, 2 + i * 0.6, spin + i, spin + i + 2.4);
      g.stroke();
    }
    // the rats, head out, each straining its own way
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * U.TAU + Math.sin(e.t * 4 + i * 2.1) * 0.12;
      const r0 = 7, r1 = 15 + Math.sin(e.t * 7 + i) * 1.2;
      g.save();
      g.rotate(a);
      g.strokeStyle = '#b8807a';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(r0, 0);
      g.lineTo(r0 - 3, Math.sin(i) * 1.5);
      g.stroke();
      g.fillStyle = i % 3 ? '#7a6a5c' : '#6a5a4e';
      g.beginPath();
      g.ellipse((r0 + r1) / 2, 0, (r1 - r0) / 2 + 1, 2.8, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = '#8c7c6c';
      g.beginPath();
      g.ellipse(r1 + 1, 0, 2.2, 1.7, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = '#d89a90';
      g.beginPath();
      g.arc(r1 + 3, 0, 0.6, 0, U.TAU);
      g.fill();
      g.restore();
    }
  }

  function jester(g, e, t) {
    g.rotate(e.facing);
    const m = e.mem, heads = m.heads || 3;
    const blink = e.atk && e.atk.def.type === 'ds-blink' ? e.atk.fade || 0 : 0;
    if (blink > 0) g.globalAlpha *= 1 - blink * 0.9;
    const skip = Math.max(0, Math.sin(e.t * 5.5)) * 1.5;
    // long legs in diamond hose; pointed shoes with bells
    g.fillStyle = MOTLEY[2];
    g.fillRect(-9, -6 - skip, 8, 3);
    g.fillRect(-9, 3 + skip, 8, 3);
    g.fillStyle = '#ffe04a';
    g.beginPath();
    g.arc(-10, -4.5 - skip, 1, 0, U.TAU);
    g.arc(-10, 4.5 + skip, 1, 0, U.TAU);
    g.fill();
    // the body: red and white diamonds
    g.save();
    g.beginPath();
    g.ellipse(-1, 0, 8, 9, 0, 0, U.TAU);
    g.clip();
    for (let y = -10; y < 10; y += 4) {
      for (let x = -10; x < 8; x += 4) {
        g.fillStyle = ((x + y) / 4) % 2 ? MOTLEY[0] : MOTLEY[1];
        g.beginPath();
        g.moveTo(x + 2, y);
        g.lineTo(x + 4, y + 2);
        g.lineTo(x + 2, y + 4);
        g.lineTo(x, y + 2);
        g.closePath();
        g.fill();
      }
    }
    g.restore();
    // arms out, a fan of knives in each hand
    const juggle = e.t * 6;
    for (const side of [-1, 1]) {
      g.strokeStyle = MOTLEY[0];
      g.lineWidth = 2.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(2, side * 7);
      g.lineTo(8, side * 12);
      g.stroke();
      g.lineCap = 'butt';
      for (let k = 0; k < 3; k++) {
        const a = side * (0.6 + k * 0.35) + Math.sin(juggle + k) * 0.1;
        g.strokeStyle = '#e8ecee';
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(8, side * 12);
        g.lineTo(8 + Math.cos(a) * 7, side * 12 + Math.sin(a) * 7);
        g.stroke();
      }
    }
    // the ruff
    g.fillStyle = '#f2ece2';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 9) * Math.PI;
      g.beginPath();
      g.arc(4 + Math.cos(a) * 3, Math.sin(a) * 8, 2.2, 0, U.TAU);
      g.fill();
    }
    // three necks, three heads: laughing (middle), weeping, singing
    const H = [
      { y: 0, kind: 'laugh', alive: true },
      { y: -8, kind: 'weep', alive: heads >= 3 },
      { y: 8, kind: 'sing', alive: heads >= 2 },
    ];
    for (const hd of H) {
      const sway = Math.sin(e.t * (hd.alive ? 2.6 : 0.7) + hd.y) * (hd.alive ? 2 : 0.5);
      const hx = hd.alive ? 16 : 11, hy = hd.y * 1.4 + sway;
      g.strokeStyle = hd.alive ? '#e8dcd0' : '#8a7a70';
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(5, hd.y * 0.4);
      g.quadraticCurveTo(10, hd.y * 0.6, hx, hy);
      g.stroke();
      if (!hd.alive) {
        // hanging, slack, the paint running
        g.fillStyle = '#9a8a80';
        g.beginPath();
        g.arc(hx, hy, 3.6, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(120,10,20,0.7)';
        g.fillRect(hx - 2, hy - 0.5, 4, 1);
        continue;
      }
      g.fillStyle = '#f6f2ec';
      g.beginPath();
      g.arc(hx, hy, 4.4, 0, U.TAU);
      g.fill();
      // a tuft of hair either side
      g.fillStyle = hd.kind === 'weep' ? '#5a8ad0' : hd.kind === 'sing' ? '#ffe04a' : '#ff3a5a';
      g.beginPath();
      g.arc(hx - 1, hy - 4.6, 2, 0, U.TAU);
      g.arc(hx - 1, hy + 4.6, 2, 0, U.TAU);
      g.fill();
      // the face, toward its front
      g.fillStyle = '#1a1010';
      g.fillRect(hx + 1.4, hy - 2, 1, 1);
      g.fillRect(hx + 1.4, hy + 1, 1, 1);
      if (hd.kind === 'laugh') {
        g.strokeStyle = '#c8102a';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(hx + 1.4, hy, 2.8, -0.9, 0.9);
        g.stroke();
      } else if (hd.kind === 'weep') {
        g.fillStyle = '#5a8ad0';
        g.fillRect(hx + 1.2, hy - 1.2, 2.2, 0.6);
        g.fillRect(hx + 1.2, hy + 1.8, 2.2, 0.6);
        g.strokeStyle = '#c8102a';
        g.lineWidth = 0.9;
        g.beginPath();
        g.arc(hx + 4.4, hy, 1.8, 2.2, 4.1);
        g.stroke();
      } else {
        g.fillStyle = '#3a0c10';
        g.beginPath();
        g.ellipse(hx + 3, hy, 1.2, 1.5 + Math.abs(Math.sin(e.t * 4)) * 0.6, 0, 0, U.TAU);
        g.fill();
      }
    }
  }

  function underbed(g, e, t) {
    const m = e.mem;
    // its arm, when it's reaching for you (the lash): drawn from under the bed to the grab
    const a = e.atk && e.atk.def.type === 'ds-lash' ? e.atk : null;
    if (a && (a.ext || 0) > 0) {
      g.save();
      g.rotate(a.dir);
      const L = a.ext;
      g.strokeStyle = '#e8e0d8';
      g.lineWidth = 2.4;
      g.lineCap = 'round';
      // a long arm with too many elbows
      g.beginPath();
      g.moveTo(0, 0);
      for (let i = 1; i <= 4; i++) g.lineTo((L * i) / 4, (i % 2 ? 1 : -1) * 3 * Math.sin(t * 9 + i));
      g.stroke();
      // the hand: long fingers spread
      g.lineWidth = 1;
      for (let f = -2; f <= 2; f++) {
        g.beginPath();
        g.moveTo(L, 0);
        g.lineTo(L + 6, f * 2.2);
        g.stroke();
      }
      g.lineCap = 'butt';
      g.restore();
    }
    if (m.under !== false) {
      // under the bed: fingers curled over the edge, and that's all you see
      g.rotate(e.facing);
      g.fillStyle = '#e8e0d8';
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.ellipse(6 + Math.abs(i) * -0.6 + Math.sin(t * 3 + i) * 0.6, i * 2.6, 2.2, 0.9, 0, 0, U.TAU);
        g.fill();
      }
      return;
    }
    g.rotate(e.facing);
    const crawl = Math.hypot(e.vx, e.vy) > 6 ? e.t * 12 : 0;
    // four very long limbs, jointed twice, like a spider made of a person
    g.strokeStyle = '#e0d8d0';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    for (const [ax, side, ph] of [[3, -1, 0], [3, 1, Math.PI], [-4, -1, Math.PI], [-4, 1, 0]]) {
      const sw = Math.sin(crawl + ph) * 0.5;
      const k1x = ax + Math.cos(side * 1.1 + sw) * 9, k1y = side * 9;
      const k2x = k1x + (ax > 0 ? 8 : -6), k2y = k1y + side * 4;
      g.beginPath();
      g.moveTo(ax, side * 2);
      g.lineTo(k1x, k1y - side * 3);
      g.lineTo(k2x, k2y);
      g.lineTo(k2x + (ax > 0 ? 4 : -3), k2y - side * 2);
      g.stroke();
    }
    g.lineCap = 'butt';
    // a thin pale back
    g.fillStyle = '#ece4dc';
    g.beginPath();
    g.ellipse(-1, 0, 8, 4.4, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = 'rgba(120,100,90,0.35)';
    for (let i = -3; i <= 3; i++) g.fillRect(i * 2 - 0.4, -0.6, 0.8, 1.2);
    // the head, upside down: the smile on top, the eyes below it
    g.fillStyle = '#f2ece6';
    g.beginPath();
    g.arc(9, 0, 4, 0, U.TAU);
    g.fill();
    g.fillStyle = '#100808';
    g.beginPath();
    g.arc(10, -1.6, 0.9, 0, U.TAU);
    g.arc(10, 1.6, 0.9, 0, U.TAU);
    g.fill();
    g.strokeStyle = '#100808';
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(8, 0, 2.6, Math.PI - 0.9, Math.PI + 0.9);
    g.stroke();
    g.fillStyle = '#2a1810';
    g.beginPath();
    g.arc(12.6, 0, 2.4, -1.4, 1.4);
    g.fill();
  }

  function diner(g, e, t) {
    const m = e.mem, p = e._props || {};
    const seated = contained(e) || m.rise > 0;
    const gown = p.dress === 'gown';
    const body = seated && p.seat != null ? p.seat : e.facing;
    // the body
    g.save();
    g.rotate(body);
    const reach = e.atk ? Math.min(1, e.atk.t / (e.atk.def.windup || 0.3)) * 3 : 0;
    // hands: long, very white, resting on the table or reaching
    g.fillStyle = '#efe8e2';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(9 + reach + (seated ? 2 : 0), side * 6, 3.4, 1.2, side * 0.2, 0, U.TAU);
      g.fill();
    }
    g.fillStyle = gown ? (p.color || '#3a0e1e') : '#121214';
    G.roundRect(g, -6, -8, 11, 16, 4.5);
    g.fill();
    if (!gown) {
      // a white shirt front and a bow tie
      g.fillStyle = '#e8e4dc';
      g.beginPath();
      g.moveTo(5, -2.6);
      g.lineTo(-1, 0);
      g.lineTo(5, 2.6);
      g.closePath();
      g.fill();
      g.fillStyle = '#121214';
      g.fillRect(3, -1.4, 2, 2.8);
    } else {
      g.fillStyle = 'rgba(255,220,180,0.4)';
      g.beginPath();
      g.arc(3, 0, 2.6, 0, U.TAU);
      g.fill();
    }
    g.restore();
    // the head turns on its own (strapped in, it can still turn its head: all the way)
    g.save();
    g.rotate(e.facing);
    const cracked = e.hp < e.maxHp * 0.5;
    g.fillStyle = p.hair || '#1a1410';
    g.beginPath();
    g.arc(-0.6, 0, 4.4, 0, U.TAU);
    g.fill();
    // the porcelain mask, smiling; cracked, there's no face under it, only a mouth that opens upright
    g.fillStyle = '#f6f2ea';
    g.beginPath();
    g.ellipse(1.8, 0, 3, 3.8, 0, 0, U.TAU);
    g.fill();
    if (!cracked) {
      g.fillStyle = '#1a1414';
      g.fillRect(2.6, -1.8, 1, 0.9);
      g.fillRect(2.6, 0.9, 1, 0.9);
      g.strokeStyle = '#c8102a';
      g.lineWidth = 0.6;
      g.beginPath();
      g.arc(2.4, 0, 2.2, -0.7, 0.7);
      g.stroke();
    } else {
      g.fillStyle = '#d8c0b0';
      g.beginPath();
      g.ellipse(2.6, 0.8, 2, 2.6, 0, -1.2, 1.9);
      g.fill();
      const o = e.atk ? 1 : 0.4 + 0.3 * Math.sin(e.t * 5);
      g.fillStyle = '#3a0408';
      g.beginPath();
      g.ellipse(3, 0, 0.8 * o + 0.3, 2.4, 0, 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(30,20,20,0.7)';
      g.lineWidth = 0.4;
      g.beginPath();
      g.moveTo(0.4, -3);
      g.lineTo(2, -1);
      g.lineTo(1.4, 1);
      g.stroke();
    }
    g.restore();
  }

  function captive(g, e, t) {
    const p = e._props || {};
    const m = e.mem;
    g.rotate(e.facing);
    if (m.cower) {
      // curled up, arms over the head, rocking
      g.translate(Math.sin(e.t * 3) * 0.8, 0);
      g.fillStyle = p.coat || '#e0702a';
      g.beginPath();
      g.ellipse(-1, 0, 7, 7, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = p.skin || '#d8b090';
      g.beginPath();
      g.ellipse(4, -3, 3, 1.6, 0.6, 0, U.TAU);
      g.ellipse(4, 3, 3, 1.6, -0.6, 0, U.TAU);
      g.fill();
      g.fillStyle = p.hair || '#2a1a10';
      g.beginPath();
      g.arc(3, 0, 3.2, 0, U.TAU);
      g.fill();
      return;
    }
    const run = Math.hypot(e.vx, e.vy) > 10 ? Math.sin(e.t * 14) : 0;
    // arms pumping
    g.fillStyle = p.coat || '#e0702a';
    g.beginPath();
    g.ellipse(2 + run * 3, -7, 4.6, 2, 0.2, 0, U.TAU);
    g.ellipse(2 - run * 3, 7, 4.6, 2, -0.2, 0, U.TAU);
    g.fill();
    g.fillStyle = p.skin || '#d8b090';
    g.beginPath();
    g.arc(6.4 + run * 3, -7.4, 1.6, 0, U.TAU);
    g.arc(6.4 - run * 3, 7.4, 1.6, 0, U.TAU);
    g.fill();
    g.fillStyle = p.coat || '#e0702a';
    G.roundRect(g, -6, -7.5, 11, 15, 4.5);
    g.fill();
    // SUBJECT across the back, stencilled
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(-5, -2.5, 3, 5);
    g.fillStyle = p.skin || '#d8b090';
    g.beginPath();
    g.arc(2, 0, 3.8, 0, U.TAU);
    g.fill();
    g.fillStyle = p.hair || '#2a1a10';
    g.beginPath();
    g.arc(1, 0, 3.6, Math.PI * 0.6, Math.PI * 1.4);
    g.fill();
  }

  // ------------------------------------------------------------ the nightmares
  const enemies = {
    'ds-hound': {
      name: 'Grinner', hp: 58, speed: 200, radius: 9, armor: 0, mass: 1.1, accel: 11, turn: 11, ai: 'ds-pack', sight: 360, leash: 1600,
      // a long, low body: shots land anywhere from the grin to the haunch, not only the middle
      hitbox: { front: 11, back: 9, r: 6.5 },
      color: SKIN, blood: '#5a0e14', gib: '#c8a8a0', bark: 'grinGiggle', dreamer: 'G. Moss', pressRange: 300, eats: true, feedHeal: 6, biteSound: 'bite',
      attacks: [
        { type: 'charge', damage: 12, speed: 440, duration: 0.3, windup: 0.32, cooldown: 2.6, minRange: 55, maxRange: 170, stun: 0.5 },
        { type: 'ds-bite', damage: 9, range: 12, windup: 0.2, recover: 0.3, cooldown: 1.0, heal: 4, status: 'held', knock: 70 },
      ],
      drops: { items: [{ id: 'ammo-shells', chance: 0.18 }, { id: 'ds-medgel', chance: 0.1 }, { id: 'ammo-fuel', chance: 0.12 }] },
      init(e, game) {
        if (!contained(e) && e.aggro) LM.audio.play('grinHowl', { vol: Math.max(0.25, far(game, e, 1400)) });
      },
      update(e, dt, game) {
        sighted(e, game, 'Grinner');
        if (DS.hearShots) DS.hearShots(e, game, 420);
        hunt(e, game, dt, { sound: 'grinGiggle', idleSound: 'grinPant', every: [1.1, 2.2], idle: [3, 6], range: 1300 });
      },
      onDeath(e) {
        LM.audio.play('grinYelp', { vol: 0.7 });
      },
      draw: hound,
    },
    // the house favourite: the biggest of them, with a collar and a name tag
    'ds-smiler': {
      name: 'Smiler', hp: 520, speed: 190, radius: 14, armor: 0.15, mass: 4, accel: 9, turn: 8, ai: 'ds-pack', sight: 520, leash: 1800,
      hitbox: { front: 17, back: 14, r: 10 },
      color: SKIN, blood: '#5a0e14', gib: '#c8a8a0', dreamer: 'G. Moss', boss: true, eats: true, feedHeal: 10, biteSound: 'bite', deathSound: 'grinYelp',
      resist: { staggered: 1, held: 1, chilled: 0.5 },
      bossBar: { name: 'Smiler', color: '#ff5ab0', range: 900, sub: () => 'the house favourite' },
      attacks: [
        { type: 'charge', damage: 22, speed: 480, duration: 0.35, windup: 0.4, cooldown: 2.2, minRange: 60, maxRange: 220, stun: 0.6 },
        { type: 'ds-bite', damage: 18, range: 14, windup: 0.24, recover: 0.35, cooldown: 1.0, heal: 12, status: 'held', knock: 120 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-fuel', chance: 1 }] },
      init(e, game) {
        LM.audio.play('grinHowl', { vol: 1 });
      },
      update(e, dt, game) {
        sighted(e, game, 'Grinner');
        hunt(e, game, dt, { sound: 'grinGiggle', every: [0.8, 1.6], idle: [2, 4], range: 1400 });
      },
      onDeath(e, game) {
        LM.audio.play('grinHowl', { vol: 0.6 });
        if (!game.hasFlag('smilerDead')) game.setFlag('smilerDead');
      },
      draw(g, e, t) {
        g.save();
        g.scale(1.55, 1.55);
        hound(g, e, t);
        g.restore();
        // the collar, studded, and its tag
        g.save();
        g.rotate(e.facing);
        g.strokeStyle = '#8a1a2a';
        g.lineWidth = 2.2;
        g.beginPath();
        g.ellipse(13, 0, 2.5, 7, 0, 0, U.TAU);
        g.stroke();
        g.fillStyle = '#e8c84a';
        g.beginPath();
        g.arc(13, 7.5, 1.6, 0, U.TAU);
        g.fill();
        g.restore();
      },
    },
    'ds-rat': {
      name: 'Rat', hp: 6, speed: 165, radius: 4.5, mass: 0.3, accel: 14, turn: 16, ai: 'swarmer', sight: 260, leash: 900,
      color: '#5a4a40', blood: '#5a1010', gib: '#5a4a40', dreamer: 'M. Thale', eats: true, feedHeal: 2,
      attacks: [{ type: 'ds-bite', damage: 3, range: 6, windup: 0.14, recover: 0.2, cooldown: 0.6, heal: 1, knock: 10 }],
      drops: { items: [{ id: 'ammo-rounds', chance: 0.03 }] },
      update(e, dt, game) {
        sighted(e, game, 'Rats');
        e.mem.sq = (e.mem.sq == null ? U.rand(0, 3) : e.mem.sq) - dt;
        if (e.mem.sq <= 0) {
          e.mem.sq = U.rand(1.4, 3.4);
          const v = far(game, e, 600);
          if (v > 0.05) LM.audio.play('ratSqueak', { vol: v * 0.6, throttle: 0.09 });
        }
      },
      draw: rat,
    },
    'ds-rat-king': {
      name: 'Rat King', hp: 560, speed: 70, radius: 17, armor: 0.12, mass: 9, accel: 4, turn: 3, ai: 'ds-roll', sight: 320, leash: 1100,
      color: '#4a3c34', blood: '#5a1010', gib: '#5a4a40', dreamer: 'M. Thale', boss: true, deathSound: 'ratKingDie',
      resist: { staggered: 1, held: 1 },
      bossBar: {
        name: 'The Rat King', color: '#c8a070', range: 700,
        sub: (e) => Math.max(4, Math.ceil(12 * (e.hp / e.maxHp))) + ' heads',
        phases: [{ at: 0.5, text: 'The knot tears: half of it comes loose.', do: (e, game) => spill(e, game, 7) }],
      },
      attacks: [
        { type: 'nova', damage: 12, radius: 120, windup: 0.85, recover: 0.6, cooldown: 6, color: '#e8c8a0', status: 'staggered' },
        { type: 'ds-bite', damage: 16, range: 16, windup: 0.4, recover: 0.4, cooldown: 1.4, heal: 6, knock: 140 },
        { type: 'summon', enemy: 'ds-rat', count: 4, max: 14, windup: 0.8, cooldown: 5 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-fuel', chance: 1 }] },
      update(e, dt, game) {
        sighted(e, game, 'RatKing');
        hunt(e, game, dt, { sound: 'ratChorus', every: [2.4, 3.8], idle: [5, 8], range: 1000 });
      },
      onDeath(e, game) {
        spill(e, game, 6);
        if (!game.hasFlag('ratKingDead')) game.setFlag('ratKingDead');
      },
      draw: ratKing,
    },
    'ds-jester': {
      name: 'The Jester', hp: 1250, speed: 130, radius: 13, armor: 0.08, mass: 5, accel: 9, turn: 8, ai: 'ds-jester', sight: 420, leash: 1400,
      color: MOTLEY[0], blood: '#6a0a1a', gib: '#f2ece2', dreamer: 'A. Voss, REM cycle 2', boss: true, deathSound: 'jesterDie', deathGlow: '#ff5ab0',
      resist: { staggered: 1, held: 1, chilled: 0.5 },
      bossBar: {
        name: 'The Jester', color: '#ff5ab0', range: 900,
        sub: (e) => (e.mem.heads || 3) + ((e.mem.heads || 3) === 1 ? ' head' : ' heads'),
        phases: [
          { at: 0.66, text: 'The weeping head stops weeping.', do: (e, game) => loseHead(e, game) },
          { at: 0.33, text: 'The singing head stops singing. The last one is still laughing.', do: (e, game) => loseHead(e, game) },
        ],
      },
      attacks: [
        { type: 'nova', damage: 11, radius: 140, windup: 0.85, recover: 0.5, cooldown: 5.5, color: '#ff5ab0', status: 'staggered' },
        { type: 'ds-blink', damage: 20, windup: 0.4, delay: 0.3, cooldown: 6.5, minRange: 110, maxRange: 480 },
        { type: 'ranged', projectile: 'ds-knife', damage: 9, speed: 430, burst: 5, burstGap: 0, fan: 0.9, spread: 0.02, lead: 0.3, windup: 0.6, cooldown: 2.4, range: 460, flash: '#ff9ad8' },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-shells', chance: 1 }] },
      init(e) {
        e.mem.heads = e.mem.heads || 3;
      },
      update(e, dt, game) {
        sighted(e, game, 'Jester');
        if (!contained(e)) hunt(e, game, dt, { sound: 'jesterLaugh', idleSound: 'jesterHum', every: [3, 5], idle: [6, 10], range: 1000 });
        // with fewer heads it blinks more often
        const heads = e.mem.heads || 3;
        if (heads < 3 && e.atkCd) {
          const bi = 1;
          if (e.atkCd[bi] > (heads === 1 ? 3.2 : 4.6)) e.atkCd[bi] = heads === 1 ? 3.2 : 4.6;
        }
      },
      onDeath(e, game) {
        confetti(game, e.x, e.y, 60);
        if (!game.hasFlag('jesterDead')) game.setFlag('jesterDead');
      },
      draw: jester,
    },
    'ds-underbed': {
      name: 'The thing under the bed', hp: 380, speed: 215, radius: 11, armor: 0.05, mass: 2, accel: 12, turn: 12, ai: 'ds-underbed', sight: 380, leash: 1000,
      color: '#ece4dc', blood: '#4a0a0a', gib: '#e0d8d0', dreamer: 'I. Brandt, REM cycle 5', deathSound: 'underbedDie', bark: 'underbedGiggle',
      resist: { staggered: 1 },
      bossBar: { name: 'Under the bed', color: '#e8e0d0', range: 600 },
      attacks: [
        { type: 'ds-lash', range: 190, minRange: 30, damage: 10, windup: 0.55, pull: 300, pullTime: 0.8, cooldown: 3.2 },
        { type: 'melee', damage: 15, range: 14, windup: 0.28, recover: 0.35, cooldown: 1.0, knock: 130 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }] },
      update(e, dt, game) {
        if (!contained(e)) {
          sighted(e, game, 'Underbed');
          hunt(e, game, dt, { sound: 'underbedGiggle', idleSound: 'underbedScrape', every: [2.6, 4.4], idle: [4, 7], range: 800 });
        } else e.visible = false;
      },
      onDeath(e, game) {
        if (!game.hasFlag('underbedDead')) game.setFlag('underbedDead');
      },
      draw: underbed,
    },
    'ds-diner': {
      name: 'Diner', hp: 115, speed: 128, radius: 10, armor: 0.1, mass: 1.6, accel: 9, turn: 7, ai: 'ds-diner', sight: 340, leash: 1200,
      color: '#121214', blood: '#4a0a0a', gib: '#f6f2ea', dreamer: 'S. Pell', eats: true, feedHeal: 8, mealTime: 9, biteSound: 'bite',
      attacks: [{ type: 'ds-bite', damage: 13, range: 12, windup: 0.3, recover: 0.35, cooldown: 1.2, heal: 8, knock: 100 }],
      drops: { items: [{ id: 'ds-medgel', chance: 0.25 }, { id: 'ammo-rounds', chance: 0.25 }] },
      update(e, dt, game) {
        sighted(e, game, 'Diner');
        if (!contained(e)) hunt(e, game, dt, { sound: 'dinerHum', every: [2.6, 4.2], idle: [5, 8], range: 800 });
      },
      onDeath(e, game) {
        // the mask comes off and lands face up
        game.particles.burst(e.x, e.y, 8, { type: 'chunk', color: '#f6f2ea', speed: 120, life: 0.7, size: 1.6, vz: 80, z: 2 });
      },
      draw: diner,
    },
    'ds-captive': {
      name: 'Captive', hp: 40, speed: 140, radius: 9, mass: 1, accel: 10, turn: 10, ai: 'ds-flee', sight: 300, leash: 99999,
      faction: 'captive', color: '#e0702a', blood: '#7a1010', gib: '#e0702a',
      attacks: [],
      update(e, dt, game) {
        // nobody's side, so it's never after anyone; but out of the cage it's always on the move (and
        // only something on the move gets a door opened for it)
        e.aggro = e.faction !== 'dormant';
        e.knowsP = false;
      },
      onDeath(e, game) {
        const p = e._props || {};
        // what they knew is on the body (props.knows: a flag; Kwan's armory code)
        const body = game.spawnItemAt('ds-body', e.x, e.y, { angle: e.facing, color: p.coat || '#e0702a', skin: p.skin, hair: p.hair, title: p.name || 'A contestant', kicker: 'The Proving Grounds', flag: p.knows, text: p.body || ((p.name ? p.name + '. ' : '') + 'An orange jumpsuit with SUBJECT across the back. They ran as far as here.') });
        if (body) body.pop = null;
        if (p.key && !game.hasFlag('captiveDied' + p.key)) game.setFlag('captiveDied' + p.key);
        game.toast((p.name || 'Someone') + ' is down.', 'warn');
        LM.audio.play('scream', { vol: Math.max(0.3, far(game, e, 1400)) });
        dinnerBell(game, e.x, e.y, body);
      },
      draw: captive,
    },
  };
  function loseHead(e, game) {
    e.mem.heads = Math.max(1, (e.mem.heads || 3) - 1);
    LM.audio.play('jesterHeadDie', { vol: 1 });
    game.addShake(0.35);
    game.particles.burst(e.x + Math.cos(e.facing) * 14, e.y + Math.sin(e.facing) * 14, 20, { type: 'dot', color: ['#6a0a1a', '#f2ece2'], speed: 160, life: 0.6, size: [1, 2.2], drag: 4 });
    confetti(game, e.x, e.y, 24);
  }
  function spill(e, game, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU + Math.random();
      const x = e.x + Math.cos(a) * (e.r + 8), y = e.y + Math.sin(a) * (e.r + 8);
      if (game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) continue;
      const r = game.spawnEnemy('ds-rat', x, y, { summoned: true, aggro: true });
      if (r) r.spawning = 0;
    }
  }

  const factions = { specimen: [], captive: [] };

  // ------------------------------------------------------------ the sounds of things hunting
  if (LM.audio && LM.audio.define) {
    const S = LM.audio.define;
    S('grinGiggle', (t, o, opt, kit) => {
      // a dog laughing like a man: breathy, in hiccups
      for (let i = 0; i < 5; i++) {
        kit.noise(t + i * 0.11, o, { type: 'bandpass', freq: 900 + i * 60, dur: 0.07, gain: 0.12, q: 3 });
        kit.tone(t + i * 0.11, o, { type: 'sawtooth', f0: 260 - i * 8, f1: 220 - i * 8, dur: 0.07, gain: 0.025 });
      }
    });
    S('grinPant', (t, o, opt, kit) => {
      for (let i = 0; i < 3; i++) kit.noise(t + i * 0.28, o, { type: 'bandpass', freq: 600, dur: 0.16, gain: 0.05, q: 1.5, attack: 0.04 });
    });
    S('grinHowl', (t, o, opt, kit) => {
      // it howls, and the howl turns into a laugh at the end
      kit.tone(t, o, { type: 'sawtooth', f0: 330, f1: 520, dur: 0.9, gain: 0.05, attack: 0.15, detune: 12 });
      kit.tone(t, o, { type: 'sine', f0: 660, f1: 1040, dur: 0.9, gain: 0.03, attack: 0.15 });
      for (let i = 0; i < 4; i++) kit.noise(t + 0.95 + i * 0.1, o, { type: 'bandpass', freq: 1100, dur: 0.06, gain: 0.1, q: 3 });
    });
    S('grinYelp', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 900, f1: 300, dur: 0.18, gain: 0.07 });
    });
    S('bite', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 900, dur: 0.08, gain: 0.25 });
      kit.noise(t + 0.03, o, { type: 'highpass', freq: 3000, dur: 0.03, gain: 0.08 });
    });
    S('chew', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 500, dur: 0.12, gain: 0.14 });
      kit.noise(t + 0.14, o, { type: 'bandpass', freq: 1200, dur: 0.05, gain: 0.06, q: 2 });
    });
    S('scream', (t, o, opt, kit) => {
      // a person, a long way off
      kit.tone(t, o, { type: 'sawtooth', f0: 620, f1: 880, dur: 0.7, gain: 0.04, attack: 0.05, detune: 20 });
      kit.tone(t, o, { type: 'sine', f0: 1240, f1: 1500, dur: 0.6, gain: 0.02, attack: 0.05 });
      kit.noise(t, o, { type: 'bandpass', freq: 1800, dur: 0.7, gain: 0.04, q: 2 });
    });
    S('ratSqueak', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 3200, f1: 4200, dur: 0.05, gain: 0.03 });
      kit.tone(t + 0.07, o, { type: 'sine', f0: 3600, f1: 3000, dur: 0.04, gain: 0.02 });
    });
    S('ratChorus', (t, o, opt, kit) => {
      for (let i = 0; i < 9; i++) kit.tone(t + i * 0.05, o, { type: 'sine', f0: 2800 + i * 170, f1: 3400 + (i % 3) * 300, dur: 0.06, gain: 0.025 });
      kit.noise(t, o, { type: 'highpass', freq: 4000, dur: 0.5, gain: 0.03 });
    });
    S('ratKingDie', (t, o, opt, kit) => {
      for (let i = 0; i < 14; i++) kit.tone(t + i * 0.04, o, { type: 'sine', f0: 3800 - i * 120, f1: 2600 - i * 100, dur: 0.08, gain: 0.03 });
      kit.noise(t, o, { type: 'lowpass', freq: 600, dur: 0.4, gain: 0.25 });
    });
    S('jesterLaugh', (t, o, opt, kit) => {
      // three voices laughing, none of them together
      for (let v = 0; v < 3; v++) {
        for (let i = 0; i < 4; i++) {
          const tt = t + v * 0.05 + i * (0.13 + v * 0.02);
          kit.tone(tt, o, { type: 'sawtooth', f0: 300 + v * 110 + i * 6, f1: 240 + v * 90, dur: 0.09, gain: 0.03, detune: v * 14 });
        }
      }
    });
    S('jesterHum', (t, o, opt, kit) => {
      // a few bars of "Happy Birthday", hummed through three throats
      [[392, 0], [392, 0.25], [440, 0.5], [392, 0.9], [523, 1.3], [494, 1.7]].forEach(([f, d]) => {
        kit.tone(t + d, o, { type: 'triangle', f0: f * 0.5, f1: f * 0.5, dur: 0.3, gain: 0.04, attack: 0.04 });
        kit.tone(t + d + 0.02, o, { type: 'triangle', f0: f * 0.5 * 1.06, f1: f * 0.5 * 1.05, dur: 0.28, gain: 0.025, attack: 0.04 });
      });
    });
    S('jesterBlink', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 3000, freqEnd: 600, dur: 0.3, gain: 0.12, q: 2 });
      kit.tone(t, o, { type: 'square', f0: 1200, f1: 300, dur: 0.15, gain: 0.03 });
    });
    S('jesterHeadDie', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 520, f1: 90, dur: 0.6, gain: 0.08 });
      kit.noise(t, o, { type: 'lowpass', freq: 800, dur: 0.3, gain: 0.25 });
    });
    S('jesterDie', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 400, f1: 60, dur: 1.2, gain: 0.08, detune: 20 });
      [523, 659, 784, 1046].forEach((f, i) => kit.tone(t + 0.4 + i * 0.12, o, { type: 'triangle', f0: f, f1: f * 0.5, dur: 0.3, gain: 0.04 }));
      kit.noise(t, o, { type: 'lowpass', freq: 600, dur: 0.5, gain: 0.3 });
    });
    S('underbedGiggle', (t, o, opt, kit) => {
      // a small, high giggle, slowed down until it's wrong
      for (let i = 0; i < 4; i++) kit.tone(t + i * 0.16, o, { type: 'sine', f0: 520 - i * 20, f1: 430 - i * 20, dur: 0.12, gain: 0.04 });
      kit.noise(t, o, { type: 'bandpass', freq: 700, dur: 0.6, gain: 0.02, q: 2 });
    });
    S('underbedScrape', (t, o, opt, kit) => {
      // fingernails on floorboards
      kit.noise(t, o, { type: 'bandpass', freq: 3200, freqEnd: 2200, dur: 0.6, gain: 0.06, q: 8, attack: 0.05 });
    });
    S('underbedOut', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 400, dur: 0.3, gain: 0.2 });
      kit.noise(t + 0.05, o, { type: 'bandpass', freq: 2800, dur: 0.4, gain: 0.08, q: 6 });
    });
    S('underbedDie', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 600, f1: 100, dur: 0.9, gain: 0.08 });
      kit.noise(t, o, { type: 'lowpass', freq: 500, dur: 0.4, gain: 0.25 });
    });
    S('dinerHum', (t, o, opt, kit) => {
      // polite conversation from a table where nobody has a mouth you can see
      for (let i = 0; i < 5; i++) kit.tone(t + i * 0.18, o, { type: 'triangle', f0: 160 + (i % 3) * 30, f1: 150 + (i % 2) * 20, dur: 0.16, gain: 0.025, attack: 0.03 });
    });
    S('dinerRise', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 500, dur: 0.25, gain: 0.12, q: 2 });
      kit.noise(t + 0.1, o, { type: 'highpass', freq: 2500, dur: 0.08, gain: 0.06 });
    });
  }

  // a specimen you hurt is a specimen let out: your shots land on it, and it comes for you
  const factionWake = { specimen: 'monster' };

  LM.definePack({ id: 'ds-nightmares', behaviors, attacks, projectiles, enemies, factions, factionWake });
})();
