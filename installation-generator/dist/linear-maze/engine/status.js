/* The Linear Maze engine — engine/status.js
 * Status effects (sedated, chilled, burning, shocked...): timed conditions on the player or an enemy.
 * They are registry content (kind `statuses`), so a game defines its own:
 *
 *   statuses: {
 *     chilled: { name: 'Chilled', seconds: 2, speedMul: 0.5, vulnerable: 0.2, color: '#9fe8ff', cures: ['burning'] },
 *     burning: { name: 'Burning', seconds: 3, dps: 6, color: '#ff8a3a' },
 *     shocked: { name: 'Shocked', seconds: 4, stun: true, only: 'robot' },
 *   }
 *
 * Fields: name (the HUD chip), seconds (how long, unless the hit says), speedMul (movement ×), dps (damage
 * a second, in ticks of `interval` seconds, default 0.5), stun (an enemy can't act while it lasts),
 * vulnerable (+ fraction of damage taken: 0.2 = 20% more), color (the chip, and a glow under an enemy),
 * only ('player' | 'robot' | 'monster': who it can land on; robots are enemies with `robot: true`),
 * cures (statuses it ends when it lands), hud: false (no chip), onApply(game, target, s), onEnd(game, target, s).
 *
 * Applying one: anything that hurts can carry `status` — a weapon, a projectile, an enemy attack, an
 * explosion, a trap — as an id or { id, seconds }. LM.combat.hurt applies it when the hit lands.
 * Code can call LM.status.apply(game, target, 'chilled', { seconds: 3 }) directly.
 *
 * Resistance: armor `resist: { spores: 1 }` (1 = immune, 0.5 = half as long); an enemy's def `resist` likewise.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  const S = (LM.status = {});

  const def = (id) => (id && LM.find ? LM.find('statuses', id) : null);
  S.def = def;
  S.list = (t) => t.statuses || (t.statuses = []);

  /** How much a target resists a status: 0 (not at all) .. 1 (immune). */
  S.resist = function (target, id) {
    let r = 0;
    if (target.isPlayer) {
      for (const slot of Object.keys(target.equip || {})) {
        const aid = target.equip[slot];
        const a = aid && LM.find('armor', aid);
        if (a && a.resist && a.resist[id]) r += a.resist[id];
      }
      for (const b of target.buffs || []) if (b.resist && b.resist[id]) r += b.resist[id];
    } else if (target.def && target.def.resist && target.def.resist[id]) r += target.def.resist[id];
    return U.clamp(r, 0, 1);
  };

  function canLand(d, target) {
    if (!d.only) return true;
    if (d.only === 'player') return !!target.isPlayer;
    if (!target.isEnemy) return false;
    if (d.only === 'robot') return !!target.def.robot;
    if (d.only === 'monster') return !target.def.robot;
    return true;
  }

  /**
   * Put a status on a target. spec: an id, or { id, seconds }. opts: { seconds }.
   * Re-applying one it already has refreshes it (the longer of the two). Returns the status, or null.
   */
  S.apply = function (game, target, spec, opts) {
    if (!target || target.dead) return null;
    const id = typeof spec === 'string' ? spec : spec && spec.id;
    const d = def(id);
    if (!d) {
      if (id) console.warn('[LM] Unknown status ' + id);
      return null;
    }
    if (!canLand(d, target)) return null;
    const r = S.resist(target, id);
    if (r >= 1) return null;
    const secs = ((opts && opts.seconds) || (typeof spec === 'object' && spec.seconds) || d.seconds || 2) * (1 - r);
    const list = S.list(target);
    for (const c of d.cures || []) S.clear(game, target, c);
    let s = list.find((x) => x.id === id);
    if (s) {
      s.t = Math.max(s.t, secs);
      s.max = Math.max(s.max, s.t);
    } else {
      s = { id, def: d, t: secs, max: secs, tick: 0 };
      list.push(s);
      if (d.onApply) d.onApply(game, target, s);
    }
    if (d.stun && target.isEnemy) target.stunned = Math.max(target.stunned || 0, s.t);
    return s;
  };
  S.has = (target, id) => !!(target && target.statuses && target.statuses.some((s) => s.id === id));
  S.get = (target, id) => (target && target.statuses ? target.statuses.find((s) => s.id === id) || null : null);
  S.clear = function (game, target, id) {
    if (!target || !target.statuses) return;
    const gone = target.statuses.filter((s) => !id || s.id === id);
    if (!gone.length) return;
    target.statuses = target.statuses.filter((s) => !(!id || s.id === id));
    for (const s of gone) if (s.def.onEnd) s.def.onEnd(game, target, s);
  };
  /** Movement multiplier from everything the target has (1 when nothing slows it). */
  S.speedMul = function (target) {
    if (!target || !target.statuses || !target.statuses.length) return 1;
    let k = 1;
    for (const s of target.statuses) if (s.def.speedMul != null) k *= s.def.speedMul;
    return k;
  };
  /** Extra damage taken (0 when nothing makes it vulnerable). */
  S.vulnerable = function (target) {
    if (!target || !target.statuses || !target.statuses.length) return 0;
    let k = 0;
    for (const s of target.statuses) if (s.def.vulnerable) k += s.def.vulnerable;
    return k;
  };

  /** Count statuses down and tick their damage. Enemies and the player call this every frame. */
  S.update = function (game, target, dt) {
    const list = target.statuses;
    if (!list || !list.length) return;
    let ended = null;
    for (const s of list) {
      s.t -= dt;
      const d = s.def;
      if (d.dps && !target.dead) {
        const every = d.interval || 0.5;
        s.tick += dt;
        while (s.tick >= every && !target.dead) {
          s.tick -= every;
          const dmg = d.dps * every;
          if (target.isPlayer) {
            // a status ticks through the short invulnerability a hit gives, and doesn't give any itself
            const saved = target.invuln;
            target.invuln = 0;
            LM.combat.hurt(game, target, dmg, { source: 'status', type: 'status', status: null });
            if (!target.dead) target.invuln = saved;
          } else LM.combat.hurt(game, target, dmg, { source: 'status', type: 'status' });
        }
      }
      if (d.stun && target.isEnemy && s.t > 0) target.stunned = Math.max(target.stunned || 0, Math.min(s.t, 0.2));
      if (s.t <= 0) (ended || (ended = [])).push(s);
    }
    if (ended) {
      target.statuses = list.filter((s) => s.t > 0);
      for (const s of ended) if (s.def.onEnd) s.def.onEnd(game, target, s);
    }
  };

  /** A faint coloured glow under an enemy for each status that has a colour (the glow pass, world space). */
  S.drawGlow = function (ctx, target, t) {
    if (!target.statuses || !target.statuses.length) return;
    for (const s of target.statuses) {
      const c = s.def.color;
      if (!c) continue;
      G.glow(ctx, target.x, target.y, target.r * 2.2, c, 0.28 + 0.08 * Math.sin(t * 6));
    }
  };
})();
