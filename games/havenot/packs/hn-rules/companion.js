/* HaveNot — packs/hn-rules/companion.js
 * Sides (engine factions, SPEC 6.20) and a robot on yours.
 *
 * The table: the player's shots hit monsters (not allies); monsters go for the player and for allies; allies
 * fight monsters. Every HaveNot enemy is a monster unless something says otherwise.
 *
 * The old maintenance bot: a dead one in the corner of your home bunker. Repair it (credits, or a hack) and it
 * follows you from floor to floor (HN.st(game).companion: its health, carried with the run), fights what attacks
 * you, and waits by the door at home. If it's destroyed, it's gone; the wreck at home can be patched up again.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const REPAIR_COST = 120;

  // following you about, unless something hostile is in sight
  const behaviors = {
    'hn-follow': {
      update(e, dt, game) {
        const P = game.player;
        if (e.foe && e.foe !== P && !e.foe.dead) return LM.get('behaviors', 'chaser').update(e, dt, game);
        if (!P) return;
        const d = U.dist(e.x, e.y, P.x, P.y);
        e.aggro = false;
        if (d > 2.5 * T) {
          const dx = P.x - e.x, dy = P.y - e.y;
          e.mx = dx / d;
          e.my = dy / d;
        }
        // lost: catch up through the walls (it knows a short cut)
        if (d > 18 * T) {
          e.x = P.x - Math.cos(P.aim) * 30;
          e.y = P.y - Math.sin(P.aim) * 30;
        }
      },
    },
  };
  const enemies = {
    'hn-buddy': {
      name: 'Old maintenance bot (yours)', faction: 'ally', hp: 90, armor: 0.25, speed: 175, radius: 9, ai: 'hn-follow', sight: 360, accel: 10, turn: 10, robot: true,
      takes: { electric: 1.5, bleed: 0, toxic: 0, acid: 0.5 }, color: '#5a8a6a', blood: '#ffcf6a', gib: '#4a5a4a', deathSound: 'explode',
      attacks: [
        { type: 'ranged', projectile: 'enemy-bolt', damage: 7, speed: 520, windup: 0.25, cooldown: 0.9, range: 300, spread: 0.06, flash: '#7affb0' },
        { type: 'melee', damage: 9, range: 12, windup: 0.2, cooldown: 0.8, recover: 0.2, knock: 120 },
      ],
      drops: null,
      onDeath(e, game) {
        const s = HN.st(game);
        s.companion = null;
        game.toast('Your maintenance bot is down. What’s left of it goes back to being a wreck.', 'warn');
      },
      draw(g, e, t) {
        G.circle(g, 0, 0, 9, '#2a3a30');
        G.circle(g, 0, 0, 7.4, '#5a8a6a');
        g.rotate(e.facing);
        g.fillStyle = '#c8d8c8';
        g.fillRect(2, -5, 6, 2);
        g.fillRect(2, 3, 6, 2);
        g.fillStyle = '#1a1a1a';
        g.fillRect(3, -2, 5, 4);
        G.circle(g, 6, 0, 1.2, '#7affb0');
      },
      drawGlow(g, e, t) {
        g.strokeStyle = 'rgba(122,255,176,0.6)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(e.x, e.y, 12, 0, U.TAU);
        g.stroke();
      },
    },
  };
  const items = {
    'hn-old-bot': {
      name: 'Dead maintenance bot', radius: 10, solid: true, mapColor: '#5a6a5a',
      interact: {
        available: (it, game) => !HN.st(game).companion,
        prompt: 'Look at the dead maintenance bot',
        use(it, game) {
          const P = game.player;
          LM.ui.open({
            kicker: 'Home', title: 'Dead maintenance bot',
            body: h('div', { class: 'hn-panel' },
              h('p', { class: 'lore' }, 'A maintenance robot that crawled in here to die a long time ago. Its chassis is sound. Its brain is mostly sound. Its loyalty chip says OWNER: NONE, which is negotiable.'),
              h('p', { class: 'muted' }, 'Repaired, it follows you, fights what attacks you, and carries on from floor to floor until something breaks it.')),
            actions: [
              { label: 'Repair it (' + REPAIR_COST + 'c in parts)', primary: true, disabled: P.gold < REPAIR_COST, onClick: () => { P.gold -= REPAIR_COST; wake(game, it); } },
              { label: 'Hack it awake', onClick: () => setTimeout(() => HN.hack(game, { kicker: 'Robot', title: 'Loyalty chip', difficulty: 9, text: 'Rewrite OWNER: NONE to OWNER: YOU.', risk: 'a jolt, and it stays dead.', onSuccess: (g) => wake(g, it), onFail: (g) => HN.failHack(g, it, 'shock') }), 0) },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g, it) {
        G.circle(g, 0, 0, 9, '#2a2e2a');
        G.circle(g, 0, 0, 7.4, '#4a564a');
        g.fillStyle = '#1a1a1a';
        g.fillRect(-1, -5, 6, 10);
      },
    },
  };
  function spawnBuddy(game, x, y, hp) {
    const e = game.spawnEnemy('hn-buddy', x, y, { faction: 'ally' });
    if (e) {
      if (hp) e.hp = Math.min(e.maxHp, hp);
      e.faction = 'ally';
    }
    return e;
  }
  function wake(game, it) {
    const s = HN.st(game);
    s.companion = { hp: 90 };
    spawnBuddy(game, it.x + 24, it.y);
    LM.audio.play('pickup');
    game.toast('The bot boots, looks at you, and decides you’ll do. It follows you now.', 'good');
    HN.note(game, 'change', 'An old maintenance bot follows you now.');
  }
  LM.definePack({
    id: 'hn-rules', behaviors, enemies, items,
    factions: { player: ['monster'], monster: ['player', 'ally'], ally: ['monster'] },
  });

  // it comes with you: on every floor, beside you; its health goes with it
  HN.onArrive((game, def, s) => {
    if (s.companion && game.player) {
      const P = game.player;
      spawnBuddy(game, P.x + 20, P.y + 10, s.companion.hp);
    }
    // the wreck lives at home
    if (def.id === 'hn-home' && !game.items.some((i) => i.def.id === 'hn-old-bot')) {
      const L = game.level, P = game.player;
      for (let r = 3; r < 10; r++) {
        const tx = Math.floor(P.x / T) + r, ty = Math.floor(P.y / T) + 1;
        if (L.inBounds(tx, ty) && !L.solidAt(tx, ty)) {
          game.spawnItemAt('hn-old-bot', tx * T + T / 2, ty * T + T / 2, {});
          break;
        }
      }
    }
  });
  // keep its health with the run as it changes
  LM.on('levelLoaded', (game) => {
    game.fx.push({
      update(dt, g) {
        const s = g.player && HN.st(g);
        if (!s || !s.companion) return false;
        const b = g.enemies.find((e) => e.def.id === 'hn-buddy' && !e.dead);
        if (b) s.companion.hp = b.hp;
        return false;
      },
    });
  });
})();
