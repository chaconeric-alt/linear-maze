/* HaveNot — packs/hn-rules/combat.js
 * Melee on V, grenades on G, the med-kit on H, cookie bait, and hacking.
 *
 * Melee: a short frontal arc (LM.combat.hurt on everything in it) for the character's melee damage, with
 *   damageType 'melee' (Knife Fighters take extra). Hyenas and some mutants add Bleed or Acid.
 * Grenades: the core's grenade projectile, thrown to the cursor (up to 380 units), damageType 'blast'.
 * Hacking: LM.HN.hack(game, spec) opens one panel: d10 + Mental + gear (+4 hacker kit) against a difficulty.
 *   It shows the odds and the risk before you commit, and offers the hacker kit's automatic success and a
 *   Security Override Module where they apply. spec:
 *     { title, kicker, text, difficulty, risk, onSuccess(game), onFail(game, roll), override: true, retry: true }
 *   Failure consequences are up to the caller (shock, alarm, robots); nothing critical hangs on one roll,
 *   because every critical hack can be retried (at a price) and every key card also has another way in.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;
  const peaceful = (game) => game.level.def.armed === false;

  // ------------------------------------------------------------ melee
  class SwingFx {
    constructor(x, y, a, r, col) { Object.assign(this, { x, y, a, r, col, t: 0 }); }
    update(dt) { this.t += dt; return this.t > 0.16; }
    drawGlow(g) {
      const k = this.t / 0.16;
      g.strokeStyle = U.rgba(this.col, 0.7 * (1 - k));
      g.lineWidth = 3;
      g.beginPath();
      g.arc(this.x, this.y, this.r, this.a - 0.9 + k * 0.5, this.a + 0.9 - (1 - k) * 0.4);
      g.stroke();
    }
  }
  HN.melee = function (game, P) {
    if (peaceful(game)) return game.toast('Not here. People live here.', 'warn');
    if ((P._hnMeleeCd || 0) > game.time) return;
    P._hnMeleeCd = game.time + 0.45;
    const s = HN.st(game);
    const dmg = HN.meleeDamage(s) * P.stats().damageMul;
    const bite = s.origin === 'hyena' || s.mutations.includes('quills') ? 'hn-bleed' : s.mutations.includes('acid') ? 'hn-acid' : null;
    const reach = 36;
    let hit = 0;
    for (const e of game.enemies) {
      if (e.dead || e.spawning > 0) continue;
      const d = U.dist(P.x, P.y, e.x, e.y);
      if (d > reach + e.r) continue;
      const da = Math.abs(U.angDiff(P.aim, Math.atan2(e.y - P.y, e.x - P.x)));
      if (da > 1.05 && d > e.r + 6) continue;
      if (!LM.physics.los(game.level, P.x, P.y, e.x, e.y, 'shot')) continue;
      LM.combat.hurt(game, e, dmg, { kx: Math.cos(P.aim) * 160, ky: Math.sin(P.aim) * 160, source: 'player', type: 'melee', damageType: 'melee', status: bite || undefined });
      hit++;
    }
    for (const it of game.items) {
      if (it.dead || !it.def.destructible) continue;
      if (U.dist(P.x, P.y, it.x, it.y) < reach + it.r) LM.combat.hurt(game, it, dmg, { source: 'player', type: 'melee' });
    }
    game.fx.push(new SwingFx(P.x, P.y, P.aim, 24, bite === 'hn-acid' ? '#9dff3a' : bite ? '#ff6a5a' : '#f0e0c0'));
    LM.audio.play(hit ? 'hit' : 'dash', { vol: hit ? 1 : 0.5 });
    if (hit) game.addShake(0.08, P.aim);
  };

  // ------------------------------------------------------------ grenades
  HN.throwGrenade = function (game, P) {
    if (peaceful(game)) return game.toast('Not here. People live here.', 'warn');
    const s = HN.st(game);
    if ((P._hnThrowCd || 0) > game.time) return;
    if (s.kitLeft.grenade > 0) s.kitLeft.grenade -= 1;
    else if (!HN.take(game, 'hn-grenade', 1)) {
      LM.audio.play('empty');
      return game.toast('No grenades left.', 'warn');
    }
    P._hnThrowCd = game.time + 0.6;
    const range = U.clamp(P.aimDist || 200, 60, 380);
    LM.combat.shoot(game, {
      type: 'grenade', x: P.x + Math.cos(P.aim) * 12, y: P.y + Math.sin(P.aim) * 12, angle: P.aim, speed: 520, owner: 'player',
      damage: 8, range, damageType: 'blast',
      aoe: { radius: 92, damage: 85 * P.stats().damageMul, color: '#ffb060', selfDamage: 0.35 },
    });
    LM.audio.play('launcher', { vol: 0.6 });
  };

  // ------------------------------------------------------------ cookies: roach bait
  HN.lures = [];
  class LureFx {
    constructor(x, y, t) { Object.assign(this, { x, y, until: t + 8 }); HN.lures.push(this); }
    update(dt, game) {
      if (game.time > this.until) {
        HN.lures = HN.lures.filter((l) => l !== this);
        return true;
      }
      return false;
    }
    draw(g) {
      for (let i = 0; i < 5; i++) {
        g.fillStyle = i % 2 ? '#a8743a' : '#c8924a';
        g.beginPath();
        g.arc(this.x + Math.cos(i * 1.7) * 5, this.y + Math.sin(i * 2.3) * 4, 2.6, 0, U.TAU);
        g.fill();
      }
    }
    drawGlow(g, game, t) { G.glow(g, this.x, this.y, 14, '#ffd08a', 0.25 + 0.1 * Math.sin(t * 4)); }
  }
  HN.throwCookies = function (game) {
    const P = game.player;
    const d = U.clamp(P.aimDist || 160, 40, 300);
    let x = P.x, y = P.y;
    // land on the last open spot along the throw
    for (let k = 8; k <= d; k += 8) {
      const nx = P.x + Math.cos(P.aim) * k, ny = P.y + Math.sin(P.aim) * k;
      if (game.level.solidAt(Math.floor(nx / T), Math.floor(ny / T))) break;
      x = nx;
      y = ny;
    }
    game.fx.push(new LureFx(x, y, game.time));
    LM.audio.play('pickup');
    game.toast('The box bursts. The smell of sugar fills the room.', 'good');
  };
  /** For bio-weapons that love sweets: the nearest live lure within reach, or null. */
  HN.nearestLure = function (e, reach) {
    let best = null, bd = reach * reach;
    for (const l of HN.lures) {
      const d2 = U.dist2(e.x, e.y, l.x, l.y);
      if (d2 < bd) { bd = d2; best = l; }
    }
    return best;
  };
  LM.on('levelLoaded', () => (HN.lures = []));

  // ------------------------------------------------------------ hacking
  HN.hackBonus = function (game) {
    const s = HN.st(game);
    return HN.mentalBonus(s) + (s.kit === 'hack' ? 4 : 0);
  };
  HN.hackChance = function (game, difficulty) {
    const need = difficulty - HN.hackBonus(game); // roll 1-10 must meet this
    return U.clamp((11 - need) / 10, 0, 1);
  };
  HN.hack = function (game, spec) {
    const s = HN.st(game);
    const diff = spec.difficulty || 10;
    const chance = HN.hackChance(game, diff);
    const bonus = HN.hackBonus(game);
    const canAuto = s.kitLeft.hack > 0;
    const canOverride = spec.override && HN.count(game, 'hn-override') > 0;
    const win = (how) => {
      s.tally.hacks++;
      LM.audio.play('key');
      if (how) game.toast(how, 'good');
      spec.onSuccess(game);
    };
    const actions = [
      {
        label: 'Hack it (' + Math.round(chance * 100) + '%)', primary: true, key: 'E', disabled: chance <= 0,
        onClick: () => {
          const roll = 1 + Math.floor(Math.random() * 10);
          const total = roll + bonus;
          if (total >= diff) win('Hack: rolled ' + roll + ' + ' + bonus + ' = ' + total + ' against ' + diff + '. In.');
          else {
            s.tally.hacksFailed++;
            LM.audio.play('locked');
            game.toast('Hack: rolled ' + roll + ' + ' + bonus + ' = ' + total + ' against ' + diff + '. It noticed.', 'warn');
            if (spec.onFail) spec.onFail(game, roll);
          }
        },
      },
    ];
    if (canAuto) actions.push({ label: 'Hacker kit: automatic success (' + s.kitLeft.hack + ' left)', onClick: () => { s.kitLeft.hack -= 1; win('The hacker kit’s skeleton key does its quiet work.'); } });
    if (canOverride) actions.push({ label: 'Use the Security Override Module', onClick: () => { HN.take(game, 'hn-override', 1); win('The override chip says “management”. The system believes it.'); } });
    actions.push({ label: 'Leave it', quiet: true });
    LM.ui.open({
      kicker: spec.kicker || 'Hack',
      title: spec.title || 'A terminal',
      body: h('div', { class: 'hn-panel' },
        spec.text ? h('p', { class: 'lore' }, spec.text) : null,
        h('div', { style: 'display:flex;gap:18px;align-items:baseline;flex-wrap:wrap' },
          h('span', { class: 'hn-odds' }, Math.round(chance * 100) + '%'),
          h('span', { class: 'muted' }, 'd10 + ' + bonus + ' (Mental ' + HN.mentalBonus(s) + (s.kit === 'hack' ? ', hacker kit +4' : '') + ') against difficulty ' + diff)),
        spec.risk ? h('div', { class: 'hn-risk' }, h('strong', null, 'If it fails: '), spec.risk) : null),
      actions,
    });
  };
  /** A common failure: the terminal bites back with a jolt (electrical, so insulated boots help). */
  HN.shockPlayer = function (game, dmg) {
    const P = game.player;
    LM.combat.hurt(game, P, dmg || 12, { source: 'hazard', type: 'hazard', damageType: 'electric' });
    game.particles.burst(P.x, P.y, 12, { type: 'spark', color: '#9fe8ff', speed: 200, life: 0.25, size: 1 });
    LM.audio.play('arc');
  };

  LM.definePack({
    id: 'hn-rules',
    gadgets: {
      'hn-melee': {
        name: 'Melee', short: 'Melee', key: 'KeyV',
        use: (game, P) => HN.melee(game, P),
        drawIcon(g, W, H) {
          g.strokeStyle = '#d8d0c0';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(W * 0.3, H * 0.75);
          g.lineTo(W * 0.7, H * 0.25);
          g.stroke();
        },
      },
      'hn-grenade': {
        name: 'Grenade', short: 'Grenade', key: 'KeyG',
        badge: (game) => HN.grenades(game),
        use: (game, P) => HN.throwGrenade(game, P),
        drawIcon(g, W, H) {
          g.fillStyle = '#5a6a3a';
          g.beginPath();
          g.arc(W / 2, H * 0.55, Math.min(W, H) * 0.28, 0, U.TAU);
          g.fill();
        },
      },
      'hn-medkit': {
        name: 'Med-kit', short: 'Med-kit', key: 'KeyH',
        badge: (game) => HN.st(game).kitLeft.med,
        use(game, P) {
          const s = HN.st(game);
          if (s.kitLeft.med <= 0) return game.toast('The med-kit is empty until the next mission.', 'warn');
          if (P.hp >= P.stats().maxHp) return game.toast('You’re not hurt.', 'warn');
          s.kitLeft.med -= 1;
          HN.minorHeal(game);
          LM.audio.play('heal');
        },
        drawIcon(g, W, H) {
          g.fillStyle = '#d8d2c4';
          g.fillRect(W * 0.25, H * 0.3, W * 0.5, H * 0.45);
          g.fillStyle = '#c8302a';
          g.fillRect(W * 0.46, H * 0.36, W * 0.08, H * 0.33);
          g.fillRect(W * 0.36, H * 0.48, W * 0.28, H * 0.1);
        },
      },
    },
  });
})();
