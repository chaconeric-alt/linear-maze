/* HaveNot — packs/hn-gen-kit/hazards.js
 * Content libraries' room hazards (HAZ_ records). The generator puts one 'hn-hazard' in a room that rolled one,
 * with the record's behaviour (companion.json `hazards`), its clue and countermeasure, and damage from the
 * generator's trap damage row for the floor's Threat Level (moderate: medium, severe: high; no invented numbers).
 * Every hazard is visible (a warning glyph and its zone, plain to anyone who looks, marked by Sense), can be
 * examined (its clue, the countermeasure, and the GM's notes), and stops when its off flag is set: by its control
 * panel on the room's wall (hn-hazard-ctl: hack it), by the room's device (a machine shut down, a data console
 * hacked), or by the floor's facilities terminal.
 *
 *   shock   the floor round it is live: hurts in the zone, every second and a half
 *   beam    a beam sweeps the room on a cycle: crossing it while it fires hurts
 *   gas     a cloud: hurts a little and slows while you're in it
 *   turret  a turret comes out of the floor the first time you come in
 *   ambush  the room's guardians wake when you come in: robots, or something worse, for the Threat Level
 *   crush   something slams down on a cycle, with a warning shadow first
 *   heat    a burst of flame or steam on a cycle
 *   flood   a pool of something you shouldn't stand in
 *   seal    the room grabs you: held still, and it hurts, then a long cooldown
 *   mind    a compulsion: slows you and tells you how to feel, now and then
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const off = (game, it) => game.anyFlag([it.props.off, it.props.floorOff].filter(Boolean));
  const inRect = (P, rc) => P.x >= rc[0] * T && P.y >= rc[1] * T && P.x < (rc[0] + rc[2]) * T && P.y < (rc[1] + rc[3]) * T;
  const ZONE = { shock: 2.5, gas: 3, crush: 1.6, heat: 2.2, flood: 2.4, mind: 99, seal: 99, beam: 99, turret: 99, ambush: 99 };
  const CYCLE = { shock: 1.5, beam: 3.2, gas: 1, crush: 3, heat: 4, flood: 1, mind: 6, seal: 12 };
  const hurt = (game, it, n, why) => {
    const P = game.player;
    if (!P || P.dead || P.invuln > 0) return;
    LM.combat.hurtPlayer(game, P, n, { source: 'hazard', type: 'status' });
    if (why && !it._told) {
      it._told = true;
      game.toast(why, 'warn');
    }
  };
  function update(it, dt, game) {
    const P = game.player;
    if (!P || P.dead || game.attract) return;
    const p = it.props;
    if (off(game, it)) {
      it._live = false;
      return;
    }
    it._live = true;
    const here = inRect(P, p.rect);
    const d = Math.hypot(P.x - it.x, P.y - it.y) / T;
    it._t = (it._t || 0) + dt;
    const cyc = CYCLE[p.behaviour] || 2;
    const phase = (it._t % cyc) / cyc;
    it._phase = phase;
    const name = p.name.charAt(0).toUpperCase() + p.name.slice(1);
    switch (p.behaviour) {
      case 'shock':
      case 'flood':
      case 'gas':
        if (d < ZONE[p.behaviour] && (it._cd = (it._cd || 0) - dt) <= 0) {
          it._cd = p.behaviour === 'shock' ? 1.5 : 1;
          hurt(game, it, p.behaviour === 'shock' ? p.dmg * 0.6 : p.dmg * 0.25, name + '!');
          if (p.behaviour === 'gas') LM.status.apply(game, P, 'hn-shaken', { seconds: 1.2 });
        }
        break;
      case 'beam':
        // a line across the room at the hazard's row, live in the second half of its cycle
        if (here && phase > 0.55 && Math.abs(P.y - it.y) < 7 && (it._cd = (it._cd || 0) - dt) <= 0) {
          it._cd = 0.6;
          hurt(game, it, p.dmg * 0.7, name + '!');
        }
        break;
      case 'crush':
      case 'heat':
        if (phase > 0.85 && !it._fired && d < ZONE[p.behaviour]) {
          it._fired = true;
          hurt(game, it, p.dmg, name + '!');
          game.addShake && game.addShake(0.15, 0);
        }
        if (phase < 0.1) it._fired = false;
        break;
      case 'mind':
        if (here && (it._cd = (it._cd || 0) - dt) <= 0) {
          it._cd = cyc;
          LM.status.apply(game, P, 'hn-shaken', { seconds: 2.5 });
          if (!it._told2) {
            it._told2 = true;
            game.toast(name + ': it gets inside your head. (Find what drives it: ' + p.counter + '.)', 'warn');
          }
        }
        break;
      case 'seal':
        if (here && (it._cd = (it._cd || 0) - dt) <= 0) {
          it._cd = cyc;
          LM.status.apply(game, P, 'hn-shaken', { seconds: 2 });
          P.vx = P.vy = 0;
          hurt(game, it, p.dmg * 0.5, name + ': the room holds you still.');
        }
        break;
      case 'turret':
      case 'ambush':
        if (here && !it._sprung) {
          it._sprung = true;
          HN.st(game).found['haz:' + game.levelId + ':' + it.tx + ',' + it.ty] = true;
          const tl = p.tl || HN.threatHere(game) || 1;
          if (p.behaviour === 'turret') game.spawnEnemy(tl >= 2 ? 'hn-grime-turret' : 'hn-turret', it.x, it.y, { aggro: true, summoned: true });
          else {
            const ids = tl >= 4 ? ['hn-chatter-g', 'hn-eggbot'] : tl >= 2 ? ['hn-dancer', 'hn-knife', 'hn-eggbot'] : ['hn-knife', 'hn-deadbot', 'hn-roach'];
            const id = ids[Math.floor(Math.random() * ids.length)];
            for (let i = 0; i < 1 + Math.min(3, Math.floor(tl / 2)); i++) game.spawnEnemy(id, it.x + (Math.random() - 0.5) * 50, it.y + (Math.random() - 0.5) * 50, { aggro: true, summoned: true });
          }
          game.toast(name + '!', 'warn');
        }
        break;
    }
  }
  const GLYPH = { shock: '⚡', beam: '╳', gas: '☁', turret: '◎', ambush: '!', crush: '▼', heat: '♨', flood: '≈', seal: '⊠', mind: '◉' };
  const COLOR = { shock: '#7ad8ff', beam: '#ff3a3a', gas: '#9adf6a', turret: '#ff7a3a', ambush: '#ff4a4a', crush: '#e8c030', heat: '#ff7a2a', flood: '#5ae0a0', seal: '#c87aff', mind: '#ff7ad8' };
  const items = {
    'hn-hazard': {
      name: 'Hazard', radius: 8, solid: false, shadow: false, z: -1, mapColor: '#ff4a3a', hnThreatMark: true,
      init(it) { it.name = it.props.name ? it.props.name.charAt(0).toUpperCase() + it.props.name.slice(1) : 'Hazard'; },
      update,
      interact: {
        prompt: (it) => 'Examine the warning: ' + it.props.name,
        use(it, game) {
          const p = it.props, live = !off(game, it);
          LM.ui.open({
            kicker: 'Hazard · ' + p.severity + (live ? '' : ' · switched off'), title: it.name,
            body: h('div', { class: 'hn-panel' },
              h('p', { class: 'lore' }, 'The tell: ' + p.clue + '.'),
              h('p', null, h('strong', null, 'What it does: '), p.effect.split(';')[0] + '.'),
              h('p', null, h('strong', null, 'To stop it: '), p.counter + '. (A control panel on this room’s wall, the room’s machinery, or the floor’s facilities terminal.)'),
              h('p', { class: 'muted' }, 'GM: ' + p.behaviour + ', triggered by ' + p.trigger + '; damage for Threat Level ' + p.tl + ' is ' + p.dmg + ' (the generator’s trap scale). Record ' + p.haz + '.')),
            actions: [{ label: 'Step back', primary: true }],
          });
        },
      },
      draw(g, it, t) {
        const p = it.props, b = p.behaviour, c = COLOR[b] || '#ff4a3a';
        if (!it._live && it._live !== undefined) {
          G.circle(g, 0, 0, 6, 'rgba(40,40,40,0.6)');
          return;
        }
        const z = (ZONE[b] || 0) < 50 ? ZONE[b] * T : 0;
        if (z) {
          g.strokeStyle = U.rgba(c, 0.35);
          g.lineWidth = 1;
          g.setLineDash([4, 4]);
          g.beginPath();
          g.arc(0, 0, z, 0, U.TAU);
          g.stroke();
          g.setLineDash([]);
        }
        if (b === 'crush' || b === 'heat') {
          const ph = it._phase || 0;
          if (ph > 0.6) {
            g.fillStyle = U.rgba(c, (ph - 0.6) * 1.2);
            g.beginPath();
            g.arc(0, 0, z * Math.min(1, (ph - 0.6) * 4), 0, U.TAU);
            g.fill();
          }
        }
        if (b === 'flood') {
          g.fillStyle = U.rgba(c, 0.25);
          g.beginPath();
          g.ellipse(0, 0, z, z * 0.8, 0, 0, U.TAU);
          g.fill();
        }
        // the emitter: a hatched plate with a warning glyph
        g.fillStyle = '#1a1a1a';
        g.beginPath();
        g.moveTo(0, -8); g.lineTo(8, 6); g.lineTo(-8, 6);
        g.closePath();
        g.fill();
        g.strokeStyle = c;
        g.lineWidth = 1.4;
        g.stroke();
        g.fillStyle = c;
        g.font = 'bold 7px sans-serif';
        g.textAlign = 'center';
        g.fillText(GLYPH[b] || '!', 0, 4);
      },
      drawGlow(g, it, t, game) {
        const p = it.props, b = p.behaviour, c = COLOR[b] || '#ff4a3a';
        if (it._live === false) return;
        G.glow(g, 0, 0, 10, c, 0.35 + 0.2 * Math.sin(t * 4));
        if (b === 'beam' && (it._phase || 0) > 0.55 && p.rect) {
          const x0 = p.rect[0] * T - it.x, x1 = (p.rect[0] + p.rect[2]) * T - it.x;
          g.fillStyle = U.rgba(c, 0.8);
          g.fillRect(x0, -1.5, x1 - x0, 3);
          G.glow(g, 0, 0, 30, c, 0.3);
        }
        if (b === 'gas') for (let i = 0; i < 5; i++) G.glow(g, Math.sin(t * 0.7 + i * 2) * 50, Math.cos(t * 0.5 + i) * 45, 30, c, 0.12);
        if (b === 'shock' && Math.sin(t * 13) > 0.5) G.glow(g, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 10, c, 0.6);
        if (b === 'mind') G.glow(g, 0, 0, 40 + 10 * Math.sin(t * 2), c, 0.1);
      },
    },
    'hn-hazard-ctl': {
      name: 'Safety control', radius: 5, wallMounted: true, shadow: false, mapColor: '#e8c030',
      interact: {
        available: (it, game) => !game.anyFlag(it.props.flag),
        prompt: (it) => 'Use the safety control (' + it.props.name + ')',
        use(it, game) {
          const p = it.props;
          HN.hack(game, {
            kicker: 'Safety control', title: 'Safety override: ' + p.name, difficulty: p.difficulty || 8,
            text: 'The room’s safety control. Its manual says: ' + p.counter + '.',
            risk: 'a jolt through the keys (electrical).',
            onSuccess: (g) => { HN.setFlag(g, p.flag); g.toast(p.name.charAt(0).toUpperCase() + p.name.slice(1) + ': off.', 'good'); },
            onFail: (g) => HN.failHack(g, it, 'shock'),
          });
        },
      },
      draw(g, it, t, game) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        const offd = game && game.anyFlag(it.props.flag);
        g.fillStyle = '#121214';
        g.fillRect(-5, -6, 10, 8);
        g.fillStyle = '#e8c030';
        g.fillRect(-4, -5, 8, 2);
        g.fillStyle = offd ? '#4ad88a' : '#ff3a2a';
        g.fillRect(-1.5, -2, 3, 3);
      },
      drawGlow(g, it, t, game) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        G.glow(g, 0, -1, 6, game && game.anyFlag(it.props.flag) ? '#4ad88a' : '#ff3a2a', 0.45);
      },
    },
  };
  HN.HAZARD_BEHAVIOURS = Object.keys(ZONE);
  LM.definePack({ id: 'hn-gen-kit', items });
})();
