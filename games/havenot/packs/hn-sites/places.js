/* HaveNot — packs/hn-sites/places.js
 * The look of the civilized places (environments), their set dressing, and what happens on arrival:
 *   home ends a mission and greets a new character; the Outpost's dishes turn once it has power;
 *   Boom-Town's ad board goes dark when the agency's ad system is silenced.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const HN = LM.HN;

  // ------------------------------------------------------------ environments
  const PLATES = { style: 'plates', colors: ['#4c4a46', '#47453f', '#504e48'], seam: '#1c1a18', rivet: '#7a766c', rust: '#6a4a2a', stripe: ['#e0a830', '#141210'] };
  const BULKHEAD = { style: 'bulkhead', top: ['#3e3d3a', '#393836', '#44423e'], seam: '#1a1816', bolt: '#7a746a', rust: '#6a3f20', edge: '#8a847a', face: '#262421', stripe: ['#e0a830', '#141210'] };
  const SAND = { style: 'flagstone', colors: ['#b8885a', '#b0825a', '#c0905e', '#a87a50'], grout: '#8a5e3a', crack: '#7a5232', moss: '#7a8a4a', mossAmt: 0.08 };
  const ADOBE = { style: 'brick', top: ['#b07a4a', '#a87248', '#b88250'], mortar: '#7a4a2a', edge: '#e0b080', face: '#7a4e2e', faceDark: '#4a2e18', moss: '#7a8a4a' };
  const environments = {
    'hn-home': {
      name: 'Home bunker', voidColor: '#050404', ambient: '#3a3430', attractAmbient: '#4a4440', outsideSight: '#2e2a26', playerLight: '#ffe6c4', torch: '#ffb35a',
      floor: PLATES, floorAlt: { style: 'planks', colors: ['#6a4a2e', '#62442a', '#704e30'], grain: '#3a2614', gap: '#24160a' },
      wall: BULKHEAD, door: { panel: '#5a5650', frame: '#1c1a18', trim: '#e0a830' },
      particles: { type: 'mote', color: '#e0d0b8', rate: 4, alpha: 0.22, drift: 3 },
      ambience: { base: 46, cutoff: 200, wind: 300, gain: 0.035, wave: 'triangle' },
    },
    'hn-outpost': {
      name: 'Out-rider Outpost', voidColor: '#1a0e08', ambient: '#7a6650', attractAmbient: '#8a7660', outsideSight: '#4a3a2e', playerLight: '#fff0d8', torch: '#ffb35a',
      floor: { style: 'planks', colors: ['#7a5a3a', '#725436', '#80603e'], grain: '#4a321c', gap: '#2a1a0c' },
      floorAlt: SAND, wall: Object.assign({}, BULKHEAD, { rust: '#8a4a20' }), door: { panel: '#6a5a44', frame: '#2a2018', trim: '#e0a830' },
      particles: { type: 'mote', color: '#e8c8a0', rate: 10, alpha: 0.3, drift: 14, windX: 22 },
      ambience: { base: 40, cutoff: 520, wind: 900, gain: 0.05, wave: 'triangle' },
    },
    'hn-boomtown': {
      name: 'Boom-Town', voidColor: '#1a0e08', ambient: '#8a7458', attractAmbient: '#9a8468', outsideSight: '#5a4a3a', playerLight: '#fff0d8', torch: '#ffb35a',
      floor: { style: 'planks', colors: ['#6a4e32', '#62482e', '#704f34'], grain: '#3a2614', gap: '#24160a' },
      floorAlt: SAND, wall: ADOBE, door: { panel: '#6a4a2a', frame: '#3a2414', trim: '#e8a23a' },
      particles: { type: 'mote', color: '#f0d0a0', rate: 9, alpha: 0.28, drift: 12, windX: 18 },
      ambience: { base: 44, cutoff: 600, wind: 800, gain: 0.045, wave: 'triangle' },
    },
    'hn-den': {
      name: 'The den', voidColor: '#020202', ambient: '#14110f', attractAmbient: '#2a2622', outsideSight: '#0e0c0b', playerLight: '#d8e8ff', torch: '#9fd8ff',
      floor: { style: 'flagstone', colors: ['#3a3a38', '#363634', '#3e3e3c', '#333331'], grout: '#1a1a18', crack: '#222220', moss: '#4a5a4a', mossAmt: 0.12 },
      wall: { style: 'brick', top: ['#4a4a46', '#444440', '#4e4e4a'], mortar: '#262624', edge: '#6a6a64', face: '#2a2a28', faceDark: '#121210', moss: '#3a4a3a' },
      particles: { type: 'mote', color: '#c8d8e8', rate: 3, alpha: 0.18, drift: 2 },
      ambience: { base: 36, cutoff: 140, wind: 160, gain: 0.05, wave: 'sine' },
    },
  };

  // ------------------------------------------------------------ set dressing
  const items = {
    'hn-dish': {
      name: 'Radar dish', radius: 12, solid: true, mapColor: '#a8a8a0',
      draw(g, it, t, game) {
        const on = game && HN.flag(game, 'hnOutpostPowered');
        g.fillStyle = '#3a3a38';
        g.fillRect(-2, -2, 4, 10);
        g.rotate(on ? t * 0.6 + it.tx : 0.6 + it.tx);
        g.fillStyle = '#c8c8c0';
        g.beginPath();
        g.ellipse(0, 0, 12, 7, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#7a7a72';
        g.lineWidth = 1;
        g.stroke();
        g.fillStyle = '#5a5a54';
        g.fillRect(-1, -1, 9, 2);
      },
      drawGlow(g, it, t, game) { if (game && HN.flag(game, 'hnOutpostPowered')) G.glow(g, 0, 0, 6, '#ff5a3a', 0.4 + 0.4 * (Math.sin(t * 3 + it.tx) > 0.8 ? 1 : 0)); },
    },
    'hn-generator': {
      name: 'Generator', radius: 14, solid: 'rect', mapColor: '#8a7a5a',
      init(it) { it.box = [30, 22]; },
      interact: { prompt: 'Look at the generator', use: (it, game) => LM.ui.showText('The Outpost generator', HN.flag(game, 'hnOutpostPowered') ? 'It hums like it means it. A hand-painted sign on the side: DO NOT THANK THE GENERATOR, IT GETS IDEAS.' : 'Burner-era, rewired a dozen times. The power cell socket is empty and scorched. Somebody has written NEEDS A REAL CELL on it in grease pencil.', 'Out-rider Outpost') },
      draw(g, it, t, game) {
        const on = game && HN.flag(game, 'hnOutpostPowered');
        g.fillStyle = '#1a1814';
        g.fillRect(-16, -12, 32, 24);
        g.fillStyle = '#5a5240';
        g.fillRect(-15, -11, 30, 22);
        g.fillStyle = '#3a3428';
        for (let i = -12; i < 14; i += 4) g.fillRect(i, -9, 2, 10);
        g.fillStyle = on ? '#4ad88a' : '#5a2a2a';
        g.fillRect(8, 4, 5, 4);
        if (on) g.translate(Math.sin(t * 40) * 0.3, 0);
      },
      drawGlow(g, it, t, game) { if (game && HN.flag(game, 'hnOutpostPowered')) G.glow(g, 10, 6, 9, '#4ad88a', 0.5); },
    },
    'hn-glowcap': {
      name: 'Glowcaps', radius: 5, mapColor: 'none',
      light: { color: '#7ac8ff', radius: 64, intensity: 0.35, flicker: 0.05 },
      draw(g, it) {
        const r = U.mulberry32(it.tx * 31 + it.ty * 7);
        for (let i = 0; i < 4; i++) G.circle(g, (r() - 0.5) * 10, (r() - 0.5) * 8, 1.6 + r() * 1.6, '#2a3a4a');
      },
      drawGlow(g, it, t) {
        const r = U.mulberry32(it.tx * 31 + it.ty * 7);
        for (let i = 0; i < 4; i++) G.glow(g, (r() - 0.5) * 10, (r() - 0.5) * 8, 5, '#9fd8ff', 0.4 + 0.15 * Math.sin(t + i));
      },
    },
    'hn-sign': {
      name: 'Sign', radius: 7, wallMounted: true, shadow: false,
      interact: { prompt: (it) => 'Read: ' + (it.props.title || 'the sign'), use: (it) => LM.ui.showText(it.props.title || 'A sign', it.props.text || '', it.props.kicker || 'Sign') },
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        g.translate(0, -2);
        g.fillStyle = '#2a1a0e';
        g.fillRect(-10, -4, 20, 8);
        g.fillStyle = it.props.color || '#c8a060';
        g.fillRect(-9, -3, 18, 6);
        g.fillStyle = '#2a1a0e';
        for (let i = 0; i < 3; i++) g.fillRect(-7 + i * 5, -0.6, 3.5, 1.2);
      },
    },
    'hn-pingpong-table': {
      name: 'Ping-pong table', radius: 16, solid: 'rect', mapColor: '#3a6a3a',
      init(it) { it.box = [40, 22]; },
      interact: { prompt: 'Look at the table', use: (it, game) => LM.ui.showText('The Boom-Town Ping-Pong League', HN.flag(game, 'hnLeagueBalls') ? 'The net is new, the paddles are old, and there is a ball on the table. Someone has chalked a tournament bracket on the wall. Your name is on it, misspelled.' : 'A real table, two paddles, a net made of fence wire. No balls. The League meets anyway and mimes.', 'Boom-Town') },
      draw(g, it, t, game) {
        g.fillStyle = '#1a2a1a';
        g.fillRect(-21, -12, 42, 24);
        g.fillStyle = '#2a5a3a';
        g.fillRect(-20, -11, 40, 22);
        g.fillStyle = '#e8e8e0';
        g.fillRect(-0.6, -11, 1.2, 22);
        g.fillRect(-20, -0.4, 40, 0.8);
        if (game && HN.flag(game, 'hnLeagueBalls')) G.circle(g, 8 + Math.sin(t * 3) * 8, -4, 1.4, '#f4f0e0');
      },
    },
  };

  // ------------------------------------------------------------ arrivals
  HN.onArrive((game, def, s) => {
    if (def.hn.home) {
      if (s.inMission) {
        HN.endMission(game);
        HN.note(game, 'mission', 'Mission ' + s.mission + ' ended at home (' + (s.missions[s.missions.length - 1] || { places: [] }).places.join(', ') + ').');
      }
    }
  });
  HN.homeWelcome = function (game) {
    const s = HN.st(game);
    LM.ui.open({
      kicker: 'Home', title: s.name + ' steps out of bed',
      body: h('div', { class: 'hn-panel' },
        h('p', { class: 'lore' }, 'The bunker is small, sealed, and yours. The communications terminal blinks: the Outpost and Boom-Town are on the band. The door at the east end leads out to the near area.'),
        h('p', { class: 'muted' }, 'E use things · C satchel and character · V melee · G grenade · H med-kit · R reload · Tab gear. A mission starts when you leave home and ends when you come back: that is when your kit refills. Death ends the run.')),
      actions: [{ label: 'Get going', primary: true }],
    });
  };

  LM.definePack({ id: 'hn-sites', environments, items });
})();
