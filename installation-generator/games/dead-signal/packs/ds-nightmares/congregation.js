/* Dead Signal — packs/ds-nightmares/congregation.js
 * The Congregation (Floor 2's Shelter B; dreamer: S. Pell, whose nightmares are faceless). It came
 * down the shelter's air duct from Floor 3 and took the faces of the people sheltering there. It wears
 * them: a heap of pale strands like wet pasta, with faces set in it like masks.
 *
 *   ds-congregation   asleep where it's placed: the faces' eyes are closed and it breathes. Gunfire near
 *                     it, getting close, a hit, or an alarm wakes it, and every face opens its eyes and
 *                     screams (flag congregationAwake). Awake, the faces close and open on a cycle: open,
 *                     it screams and takes much more damage; closed, the strands shield the faces. It lashes
 *                     a strand out and drags you in (held), slams up close, and every so often crawls to a
 *                     body that still has a face and takes it (it heals, and the face joins the others):
 *                     hit it hard while it's reaching and it recoils. Cold (chilled) makes the strands
 *                     brittle: slower lashes, more damage. Dead (flag congregationDead) it comes apart into
 *                     crawling strands. props.faces: how many faces it starts with (9).
 *   ds-strand         one of the strands, crawling.
 * Attacks: ds-lash (a strand that grabs and pulls: { range, damage, windup, pull, status }),
 * ds-scream (a ring: { radius, damage, windup, status }; only while the faces are open),
 * ds-clot (a wet clump of strands thrown in an arc at anyone keeping their distance: { damage, radius,
 * minRange, maxRange, windup, flight, status }).
 * Bodies it can take a face from: ds-body items with props.face (props.after: what they say after).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;
  const PALE = '#e8dccb', STRANDS = ['#e8dccb', '#ddcfba', '#f2e8d8', '#cfbfa8'];
  const SKIN = ['#e0c0a0', '#c49a7a', '#a8744a', '#7a4a30', '#f0d4b8', '#8a5a3a', '#d8b090'];

  const chilled = (e) => LM.status && LM.status.has(e, 'chilled');

  // ------------------------------------------------------------ attacks
  function segDist(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    const k = U.clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
    return Math.hypot(px - (x0 + dx * k), py - (y0 + dy * k));
  }
  const attacks = {
    // a strand lashes out along a line; it grabs and drags you back to the heap (dash to tear free)
    'ds-lash': {
      canStart: (e, a, game) => e.seeLos && e.distP <= (a.range || 240) && e.distP >= (a.minRange || 40),
      start(e, atk, game) {
        const P = game.player;
        atk.dir = Math.atan2(P.y - e.y, P.x - e.x);
        atk.ext = 0;
        LM.audio.play('coatRustle', { vol: game.vol(e.x, e.y) });
      },
      update(e, atk, dt, game) {
        const a = atk.def, P = game.player;
        const wind = (a.windup || 0.7) * (chilled(e) ? 1.6 : 1);
        const R = a.range || 240;
        e.speedMul *= 0.1;
        if (atk.t < wind) {
          // it aims, then commits
          if (atk.t < wind * 0.8) atk.dir += U.angDiff(atk.dir, Math.atan2(P.y - e.y, P.x - e.x)) * Math.min(1, dt * 9);
          atk.shake = (atk.t / wind) * 1.2;
          return;
        }
        atk.shake = 0;
        if (!atk.cracked) {
          atk.cracked = true;
          LM.audio.play('lashCrack', { vol: game.vol(e.x, e.y) });
        }
        if (!atk.grab && !atk.back) {
          atk.ext = Math.min(R, atk.ext + dt * 1150);
          const tx = e.x + Math.cos(atk.dir) * atk.ext, ty = e.y + Math.sin(atk.dir) * atk.ext;
          // a wall stops it
          if (!LM.physics.los(game.level, e.x, e.y, tx, ty, 'shot')) atk.back = true;
          if (!atk.hit && !P.dead && segDist(P.x, P.y, e.x, e.y, tx, ty) < P.r + 9) {
            atk.hit = true;
            LM.combat.hurt(game, P, a.damage || 12, { source: 'enemy', type: 'melee', status: a.status });
            if (a.pull) {
              atk.grab = true;
              atk.grabT = 0;
              game.toast('It has you. Dash to tear free.', 'warn');
            } else atk.back = true;
          }
          if (atk.ext >= R) atk.back = true;
        } else if (atk.grab) {
          // reel in: drag the player toward the heap (walls still stop him)
          atk.grabT += dt;
          const d = Math.hypot(P.x - e.x, P.y - e.y);
          atk.ext = d;
          atk.dir = Math.atan2(P.y - e.y, P.x - e.x);
          if (P.dashT > 0 || P.dead || atk.grabT > (a.pullTime || 0.7) || d < e.r + P.r + 6) {
            atk.grab = false;
            atk.back = true;
          } else LM.physics.move(game.level, P, -Math.cos(atk.dir) * (a.pull === true ? 240 : a.pull) * dt, -Math.sin(atk.dir) * (a.pull === true ? 240 : a.pull) * dt);
        } else {
          atk.ext = Math.max(0, atk.ext - dt * 900);
          if (atk.ext <= 0) atk.done = true;
        }
      },
      drawGlow(g, e, atk) {
        const wind = (atk.def.windup || 0.7) * (chilled(e) ? 1.6 : 1);
        if (atk.t >= wind) return;
        const k = atk.t / wind, R = atk.def.range || 240;
        g.strokeStyle = 'rgba(240,228,210,' + (0.1 + k * 0.4) + ')';
        g.lineWidth = 1 + k * 2;
        g.setLineDash([5, 6]);
        g.beginPath();
        g.moveTo(e.x, e.y);
        g.lineTo(e.x + Math.cos(atk.dir) * R, e.y + Math.sin(atk.dir) * R);
        g.stroke();
        g.setLineDash([]);
      },
    },
    // a clump of strands thrown in an arc: where it lands it splashes, and what it hits is snared
    'ds-clot': {
      canStart: (e, a, game) => e.seeLos && e.distP >= (a.minRange || 170) && e.distP <= (a.maxRange || 420),
      update(e, atk, dt, game) {
        const a = atk.def, P = game.player, wind = a.windup || 0.6;
        e.speedMul *= 0.2;
        atk.shake = atk.t < wind ? (atk.t / wind) * 1 : 0;
        if (!atk.thrown && atk.t >= wind) {
          atk.thrown = true;
          const flight = a.flight || 0.8;
          let tx = P.x + P.vx * flight * 0.6, ty = P.y + P.vy * flight * 0.6;
          if (game.level.solidAt(Math.floor(tx / T), Math.floor(ty / T))) {
            tx = P.x;
            ty = P.y;
          }
          game.fx.push(new Clot({ x: e.x, y: e.y, tx, ty, flight, radius: a.radius || 38, damage: a.damage || 8, status: a.status }));
          LM.audio.play('coatRustle', { vol: game.vol(e.x, e.y) });
        }
        if (atk.t >= wind + 0.3) atk.done = true;
      },
    },
    // every mouth at once: a ring that knocks you back and staggers you
    'ds-scream': {
      canStart: (e, a, game) => e.mem.open && e.seeLos && e.distP < (a.radius || 180) * 0.95,
      start(e, atk, game) {
        LM.audio.play('congregationScream', { vol: Math.max(0.5, game.vol(e.x, e.y)) });
      },
      update(e, atk, dt, game) {
        const a = atk.def, P = game.player, wind = a.windup || 0.6, R = a.radius || 180;
        e.speedMul = 0;
        atk.shake = atk.t < wind ? (atk.t / wind) * 2 : 0;
        if (!atk.burst && atk.t >= wind) {
          atk.burst = true;
          game.particles.add({ type: 'ring', x: e.x, y: e.y, life: 0.5, size: e.r, grow: R, color: PALE, width: 4 });
          game.particles.add({ type: 'ring', x: e.x, y: e.y, life: 0.7, size: e.r, grow: R * 0.8, color: '#b8a890', width: 2 });
          game.addShake(0.45);
          const d = U.dist(e.x, e.y, P.x, P.y);
          if (d < R + P.r && LM.physics.los(game.level, e.x, e.y, P.x, P.y, 'shot')) {
            const ang = Math.atan2(P.y - e.y, P.x - e.x);
            LM.combat.hurt(game, P, a.damage || 9, { kx: Math.cos(ang) * 260, ky: Math.sin(ang) * 260, source: 'enemy', type: 'blast', status: a.status });
          }
        }
        if (atk.t >= wind + (a.recover || 0.5)) atk.done = true;
      },
      drawGlow(g, e, atk) {
        const wind = atk.def.windup || 0.6, R = atk.def.radius || 180;
        if (atk.t >= wind) return;
        const k = atk.t / wind;
        g.strokeStyle = U.rgba(PALE, 0.15 + k * 0.5);
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(e.x, e.y, R, 0, U.TAU);
        g.stroke();
        g.fillStyle = U.rgba(PALE, 0.04 + k * 0.1);
        g.beginPath();
        g.arc(e.x, e.y, R * k, 0, U.TAU);
        g.fill();
      },
    },
  };

  class Clot {
    constructor(o) {
      Object.assign(this, o);
      this.t = 0;
    }
    pos() {
      const k = this.t / this.flight;
      return { x: U.lerp(this.x, this.tx, k), y: U.lerp(this.y, this.ty, k), z: Math.sin(k * Math.PI) * 60 };
    }
    update(dt, game) {
      this.t += dt;
      if (this.t < this.flight) return false;
      const P = game.player;
      game.particles.burst(this.tx, this.ty, 18, { type: 'dot', color: STRANDS, speed: 140, life: 0.6, size: [1, 2.2], drag: 4 });
      game.renderer.addDecal({ type: 'blood', x: this.tx, y: this.ty, r: this.radius * 0.6, color: '#8a7a66' });
      LM.audio.play('lashCrack', { vol: game.vol(this.tx, this.ty) * 0.7 });
      if (P && !P.dead && U.dist(P.x, P.y, this.tx, this.ty) < this.radius + P.r && LM.physics.los(game.level, this.tx, this.ty, P.x, P.y, 'shot')) {
        LM.combat.hurt(game, P, this.damage, { source: 'enemy', type: 'blast', status: this.status });
      }
      return true;
    }
    draw(ctx) {
      const p = this.pos();
      G.shadow(ctx, p.x, p.y, 5, 0.35);
      ctx.save();
      ctx.translate(p.x, p.y - p.z);
      ctx.rotate(this.t * 9);
      ctx.strokeStyle = PALE;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 3 + i, i, i + 2.2);
        ctx.stroke();
      }
      ctx.restore();
    }
    drawGlow(ctx) {
      const k = this.t / this.flight;
      ctx.strokeStyle = U.rgba(PALE, 0.25 + k * 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.tx, this.ty, this.radius, 0, U.TAU);
      ctx.stroke();
      ctx.fillStyle = U.rgba(PALE, 0.05 + k * 0.12);
      ctx.beginPath();
      ctx.arc(this.tx, this.ty, this.radius * k, 0, U.TAU);
      ctx.fill();
    }
  }

  // ------------------------------------------------------------ faces it can take
  const bodiesWithFaces = (game) => game.items.filter((it) => !it.dead && it.def.id === 'ds-body' && it.props.face);
  function startHarvest(e, game) {
    const m = e.mem;
    const list = bodiesWithFaces(game).filter((it) => U.dist(it.x, it.y, e.x, e.y) < 520);
    if (!list.length) return false;
    list.sort((a, b) => U.dist(a.x, a.y, e.x, e.y) - U.dist(b.x, b.y, e.x, e.y));
    m.harvest = { it: list[0], phase: 'go', t: 0, dmg: 0 };
    return true;
  }
  function endHarvest(e, game, taken) {
    const m = e.mem, hv = m.harvest;
    m.harvest = null;
    m.harvestT = taken ? 15 : 11;
    if (!taken || !hv) return;
    const it = hv.it;
    const name = it.props.title || 'someone';
    it.props = Object.assign({}, it.props, { face: false, faceless: true, text: it.props.after || 'Their face is gone now.' });
    it.spr = null;
    m.faces++;
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.06);
    m.open = true;
    m.cycle = 2.4;
    LM.audio.play('congregationScream', { vol: 0.8 });
    game.toast('It takes ' + name + '’s face. Another mouth opens.', 'warn');
  }

  const behaviors = {
    'ds-congregation': {
      update(e, dt, game) {
        const m = e.mem;
        if (!m.init) {
          m.init = true;
          m.faces = m.faces || (e._props && e._props.faces) || 9;
          m.cycle = 0;
          m.harvestT = 12;
          m.breathT = 2;
        }
        if (!e.aggro) {
          // asleep: it only listens
          e.speedMul = 0;
          e.armor = 0.2;
          const shots = game.stats.shots;
          if (m.shots != null && shots !== m.shots && e.distP < (e.def.hear || 400)) e.alert(game, true);
          m.shots = shots;
          return;
        }
        if (!m.awake) {
          m.awake = true;
          m.open = true;
          m.cycle = 3;
          LM.audio.play('congregationScream', { vol: 1 });
          game.addShake(0.7);
          game.toast('Every face opens its eyes.', 'warn');
          game.setFlag('congregationAwake');
        }
        const hv = m.harvest;
        if (hv) {
          const it = hv.it;
          if (!it || it.dead || !it.props.face) return endHarvest(e, game, false);
          e.globalCd = Math.max(e.globalCd, 0.3);
          if (hv.phase === 'go') {
            const dx = it.x - e.x, dy = it.y - e.y, d = Math.hypot(dx, dy) || 1;
            if (d < e.r + 14) {
              hv.phase = 'take';
              hv.t = 0;
              hv.dmg = 0;
              game.toast('It’s reaching for ' + (it.props.title || 'a body') + '’s face. Hurt it.', 'warn');
              return;
            }
            e.mx += dx / d;
            e.my += dy / d;
            e.speedMul = 1.35;
            if ((hv.t += dt) > 7) endHarvest(e, game, false);
            return;
          }
          // taking it
          e.speedMul = 0;
          hv.t += dt;
          if (hv.t >= 1.8) endHarvest(e, game, true);
          return;
        }
        AI.chase(e, game, 1);
        e.speedMul = (m.open ? 0.6 : 0.9) * (m.rage === 2 ? 1.3 : 1);
      },
    },
  };

  // ------------------------------------------------------------ drawing
  // strands writhing in a heap; faces set in it like masks (eyes shut, or open and screaming)
  const FACE_AT = [];
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39996, r = 5 + Math.sqrt(i / 18) * 16;
    FACE_AT.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.82, tilt: Math.sin(i * 7.3) * 0.7, skin: SKIN[i % SKIN.length], s: 1 + ((i * 37) % 10) / 34 });
  }
  function face(g, f, open, scream, t, i) {
    g.save();
    g.translate(f.x, f.y);
    g.rotate(f.tilt + Math.sin(t * 0.7 + i) * 0.05);
    g.scale(f.s, f.s);
    // a pale mask: smooth, without hair or ears
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.ellipse(0.6, 0.8, 4.4, 5.4, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = U.mix(f.skin, '#efe6da', 0.45);
    g.beginPath();
    g.ellipse(0, 0, 4.2, 5.2, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.ellipse(-1.2, -1.8, 1.8, 2.2, 0, 0, U.TAU);
    g.fill();
    if (!open) {
      // asleep: lids closed, mouth shut
      g.strokeStyle = 'rgba(70,45,35,0.7)';
      g.lineWidth = 0.55;
      g.beginPath();
      g.arc(-1.6, -1, 1.1, 0.3, Math.PI - 0.3);
      g.moveTo(2.7, -0.6);
      g.arc(1.6, -1, 1.1, 0.3, Math.PI - 0.3);
      g.moveTo(-1.2, 2.6);
      g.lineTo(1.2, 2.6);
      g.stroke();
    } else {
      g.fillStyle = '#140c0a';
      g.beginPath();
      g.ellipse(-1.6, -1, 0.95, 1.15, 0, 0, U.TAU);
      g.ellipse(1.6, -1, 0.95, 1.15, 0, 0, U.TAU);
      g.fill();
      const mo = scream ? 1.6 + 0.4 * Math.abs(Math.sin(t * 9 + i)) : 0.9;
      g.fillStyle = '#2a0e0c';
      g.beginPath();
      g.ellipse(0, 2.7, 1.1 + mo * 0.3, mo, 0, 0, U.TAU);
      g.fill();
    }
    g.restore();
  }
  function heap(g, e, t) {
    const m = e.mem, R = e.r;
    const writhe = e.aggro ? 1 : 0.35;
    const r = U.mulberry32(77);
    // tendrils on the floor round it
    g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * U.TAU + r() * 0.4 + Math.sin(t * 0.3 * writhe + i) * 0.15;
      const l = R + 6 + r() * 14 + Math.sin(t * 1.3 * writhe + i * 2) * 4 * writhe;
      g.strokeStyle = STRANDS[i % 4];
      g.lineWidth = 1.4 + r() * 1.2;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6);
      g.quadraticCurveTo(Math.cos(a + 0.4) * l * 0.8, Math.sin(a + 0.4) * l * 0.8, Math.cos(a) * l, Math.sin(a) * l);
      g.stroke();
    }
    // the mass itself: a dark core, and strands looped over it, each with its own shadow
    g.fillStyle = '#8a7a66';
    g.beginPath();
    g.ellipse(0, 0, R, R * 0.86, 0, 0, U.TAU);
    g.fill();
    for (let i = 0; i < 46; i++) {
      const a0 = r() * U.TAU, a1 = a0 + (r() - 0.5) * 3;
      const r0 = r() * R * 0.95, r1 = r() * R * 0.95;
      const w = Math.sin(t * (0.6 + r()) * writhe + i) * 3 * writhe;
      const lw = 1.6 + r() * 1.6;
      const path = (ox, oy) => {
        g.beginPath();
        g.moveTo(Math.cos(a0) * r0 + ox, Math.sin(a0) * r0 * 0.86 + oy);
        g.bezierCurveTo(
          Math.cos(a0 + 1) * R * 0.5 + w + ox, Math.sin(a0 + 1) * R * 0.45 - w + oy,
          Math.cos(a1 - 1) * R * 0.5 - w + ox, Math.sin(a1 - 1) * R * 0.45 + w + oy,
          Math.cos(a1) * r1 + ox, Math.sin(a1) * r1 * 0.86 + oy);
      };
      g.strokeStyle = 'rgba(50,36,28,0.45)';
      g.lineWidth = lw + 1.2;
      path(0.7, 0.9);
      g.stroke();
      g.strokeStyle = STRANDS[i % 4];
      g.lineWidth = lw;
      path(0, 0);
      g.stroke();
    }
    // a wet sheen
    g.strokeStyle = 'rgba(255,250,240,0.35)';
    g.lineWidth = 0.7;
    for (let i = 0; i < 10; i++) {
      const a = r() * U.TAU, rr = r() * R * 0.8;
      g.beginPath();
      g.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.86, 2 + r() * 4, a, a + 1.2);
      g.stroke();
    }
    g.lineCap = 'butt';
    // the faces
    const n = Math.min(FACE_AT.length, m.faces || 9);
    const scream = e.atk && e.atk.def.type === 'ds-scream';
    for (let i = 0; i < n; i++) face(g, FACE_AT[i], !!(m.awake && m.open) || scream, scream || (m.open && m.awake), t, i);
  }

  const enemies = {
    'ds-congregation': {
      name: 'The Congregation', hp: 1150, speed: 76, radius: 26, mass: 8, accel: 6, turn: 3, ai: 'ds-congregation', sight: 92, hear: 400, leash: 99999,
      color: PALE, blood: '#6a4a3a', gib: PALE, deathGlow: '#f4ece0', deathSound: 'congregationWail', dreamer: 'S. Pell', summonColor: PALE,
      bossBar: {
        name: 'The Congregation', color: '#e8dccb', range: 1000,
        sub: (e) => (e.mem.faces || 9) + ' faces' + (e.mem.awake ? (e.mem.open ? ' · eyes open' : ' · eyes shut') : ''),
        phases: [
          { at: 0.6, text: 'More of the faces open their eyes at once.', do: (e) => (e.mem.rage = 1) },
          { at: 0.3, text: 'It’s screaming with every mouth it has.', do: (e) => (e.mem.rage = 2) },
        ],
      },
      attacks: [
        { type: 'ds-scream', radius: 190, damage: 9, windup: 0.6, recover: 0.5, cooldown: 6, status: 'staggered' },
        { type: 'ds-lash', range: 280, minRange: 50, damage: 12, windup: 0.7, cooldown: 2.4, pull: 240, pullTime: 0.7, status: 'held' },
        { type: 'ds-clot', damage: 8, radius: 40, minRange: 170, maxRange: 430, windup: 0.6, flight: 0.8, cooldown: 3.2, status: 'snared' },
        { type: 'melee', damage: 18, range: 16, windup: 0.5, recover: 0.4, cooldown: 1.4, knock: 240 },
      ],
      drops: { items: [{ id: 'ds-trauma-kit', chance: 1 }, { id: 'ammo-cryo', chance: 1 }, { id: 'ammo-shells', chance: 0.8 }] },
      update(e, dt, game) {
        const m = e.mem;
        if (!m.awake) {
          // asleep, it breathes; you can hear it before you see it
          m.breathT = (m.breathT || 2) - dt;
          if (m.breathT <= 0) {
            m.breathT = 3.4;
            if (e.distP < 520) LM.audio.play('congregationBreath', { vol: U.clamp(1 - e.distP / 520, 0, 1) * 0.9 });
          }
          return;
        }
        // the faces close and open
        m.cycle -= dt;
        if (m.cycle <= 0) {
          m.open = !m.open;
          const rage = m.rage || 0;
          m.cycle = m.open ? 2.6 + rage * 0.4 : [4.6, 3.6, 2.6][rage];
          if (m.open) LM.audio.play('congregationWail', { vol: game.vol(e.x, e.y) });
        }
        // shut, the strands cover the faces; open, the faces are what you hit
        e.armor = m.open ? -0.35 : 0.5;
        if (!m.harvest) {
          m.harvestT -= dt;
          if (m.harvestT <= 0 && !startHarvest(e, game)) m.harvestT = 9;
        }
      },
      onHurt(e, game, dmg) {
        const hv = e.mem.harvest;
        if (hv && hv.phase === 'take') {
          hv.dmg += dmg;
          if (hv.dmg >= 50) {
            endHarvest(e, game, false);
            e.stunned = 1.4;
            game.toast('It recoils. The face stays where it is.', 'good');
            LM.audio.play('congregationWail', { vol: 0.8 });
          }
        }
      },
      onDeath(e, game) {
        game.setFlag('congregationDead');
        if (game.hasFlag('releasePulled')) game.setFlag('quarantineLifted');
        game.addShake(0.6);
        game.particles.burst(e.x, e.y, 40, { type: 'chunk', color: STRANDS, speed: 160, life: 1.2, size: 2, drag: 3, vz: 80, z: 2, vr: 8 });
        game.renderer.addDecal({ type: 'blood', x: e.x, y: e.y, r: 34, color: '#5a4434' });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          game.spawnEnemy('ds-strand', e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, { summoned: true, aggro: true });
        }
        game.toast('The faces close, all of them. It comes apart.', 'good');
      },
      draw(g, e, t) {
        g.save();
        g.rotate(Math.sin(t * 0.13) * 0.2);
        heap(g, e, t);
        g.restore();
        // a strand reaching for the player (the lash) or for a body (the harvest)
        const a = e.atk;
        g.lineCap = 'round';
        if (a && a.def.type === 'ds-lash' && a.ext > 0) {
          const dx = Math.cos(a.dir), dy = Math.sin(a.dir), L = a.ext;
          for (let k = 0; k < 3; k++) {
            g.strokeStyle = STRANDS[k];
            g.lineWidth = 3.2 - k;
            g.beginPath();
            g.moveTo(0, 0);
            const w = Math.sin(t * 20 + k) * 6;
            g.quadraticCurveTo(dx * L * 0.5 - dy * w, dy * L * 0.5 + dx * w, dx * L, dy * L);
            g.stroke();
          }
        }
        const hv = e.mem.harvest;
        if (hv && hv.phase === 'take' && hv.it) {
          const ox = hv.it.x - e.x, oy = hv.it.y - e.y;
          for (let k = 0; k < 4; k++) {
            g.strokeStyle = STRANDS[k];
            g.lineWidth = 1.6;
            const w = Math.sin(t * 6 + k * 1.7) * 5;
            g.beginPath();
            g.moveTo(0, 0);
            g.quadraticCurveTo(ox * 0.5 + w, oy * 0.5 - w, ox + (k - 1.5) * 2, oy + (k - 1.5) * 1.5);
            g.stroke();
          }
        }
        g.lineCap = 'butt';
      },
      drawGlow(g, e, t) {
        const m = e.mem;
        if (m.awake && m.open) G.glow(g, e.x, e.y, e.r * 1.6, '#f4ece0', 0.16 + 0.06 * Math.sin(t * 9));
        else G.glow(g, e.x, e.y, e.r * 1.4, '#f4ece0', 0.06);
        const hv = m.harvest;
        if (hv && hv.it) G.glow(g, hv.it.x, hv.it.y, 18, '#f4ece0', hv.phase === 'take' ? 0.3 + 0.2 * Math.sin(t * 10) : 0.12);
      },
    },

    'ds-strand': {
      name: 'Strand', hp: 10, speed: 150, radius: 6, ai: 'swarmer', sight: 420, accel: 12, turn: 12, color: PALE,
      blood: '#6a4a3a', gib: PALE, dreamer: 'S. Pell',
      attacks: [{ type: 'melee', damage: 5, range: 9, windup: 0.18, cooldown: 0.7, recover: 0.2, knock: 40 }],
      draw(g, e, t) {
        g.rotate(e.facing);
        g.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const w = Math.sin(e.t * 14 + k * 1.6) * 3;
          g.strokeStyle = STRANDS[k];
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(-8, (k - 1.5) * 1.6);
          g.quadraticCurveTo(0, w, 8, (k - 1.5) * 0.8);
          g.stroke();
        }
        g.lineCap = 'butt';
      },
    },
  };

  if (LM.audio && LM.audio.define) {
    // many voices at once, none of them quite in tune, sliding up into a shriek
    LM.audio.define('congregationScream', (t, o, opt, kit) => {
      const base = [240, 287, 311, 352, 401, 466, 523];
      base.forEach((f, i) => {
        kit.tone(t + i * 0.025, o, { type: i % 2 ? 'sawtooth' : 'triangle', f0: f * 0.8, f1: f * 1.9, dur: 1.1 + (i % 3) * 0.15, gain: 0.022, attack: 0.08 });
      });
      kit.noise(t, o, { type: 'bandpass', freq: 1800, freqEnd: 3600, dur: 1.2, gain: 0.06, q: 0.9, attack: 0.1 });
    });
    LM.audio.define('congregationWail', (t, o, opt, kit) => {
      [330, 349, 392].forEach((f, i) => kit.tone(t + i * 0.04, o, { type: 'triangle', f0: f, f1: f * 1.35, dur: 0.7, gain: 0.02, attack: 0.1 }));
    });
    LM.audio.define('congregationBreath', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 520, freqEnd: 300, dur: 1.4, gain: 0.07, attack: 0.6 });
      kit.noise(t + 1.5, o, { type: 'lowpass', freq: 380, freqEnd: 220, dur: 1.2, gain: 0.05, attack: 0.3 });
    });
    LM.audio.define('lashCrack', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 2600, dur: 0.07, gain: 0.12 });
      kit.noise(t + 0.02, o, { type: 'bandpass', freq: 700, dur: 0.18, gain: 0.05, q: 1 });
    });
  }

  LM.definePack({ id: 'ds-nightmares', attacks, behaviors, enemies });
})();
