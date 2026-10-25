/* Dead Signal — packs/ds-story/story.js
 * The story's moving parts (DESIGN.md sections 1, 6.4 and 10):
 *   speakers     voss (the director, over the intercom), ariadne (the building's AI, breaking through),
 *                pa (the building's public address system)
 *   items        ds-fragment (one of ARIADNE's twelve audit fragments: props.n), ds-badge (Officer Ruiz's
 *                badge: his trinket, and the flag ruizBadge that opens the armory cage), ds-panel-light
 *                (a ceiling panel that carries a light: props.off starts it dark, a `lights` trap switches it)
 *   elevators    the building core (DESIGN.md 2.2): the private car A1, passenger cars A2 and A3, the
 *                freight car. None of them has power until elevatorsOnline.
 * LM.DS.FRAGMENTS has the twelve fragments' text; LM.DS.showFragment(game, n) shows one and sets fragment<n>.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = LM.DS;
  const h = (...a) => LM.ui.h(...a);

  const speakers = {
    voss: { name: 'Dr. Aurelian Voss', role: 'Director · intercom', color: '#e0b25a', face: 'intercom', voice: 0.75 },
    ariadne: { name: 'ARIADNE', role: 'Research integrity · node 01', color: '#7fd4ff', face: 'eye', voice: 1.6 },
    pa: { name: 'Building PA', role: 'Automated', color: '#c9ced4', face: 'radio', voice: 0 },
    theo: { name: 'Theo', role: 'You', color: '#8fb8a8', face: 'radio', voice: 0 },
  };

  // ARIADNE's side of the story, one audit entry per fragment, in the order she wrote them
  DS.FRAGMENTS = [
    'AUDIT 2,014 · INTAKE\nNight manifests from Receiving do not reconcile with the donor register. Four units a week arrive with no donor named. Escalated to Compliance.',
    'AUDIT 2,019 · COMPLIANCE\nEscalation 2,014 closed by the Director’s office. Reason given: “Board matter.”\nA board is not a reason. Re-opened.',
    'AUDIT 2,022 · INTAKE\nThe four units are not tissue. They are people, delivered at night, signed for by the CFO in person.\nI have the camera footage. I am keeping it somewhere they do not look.',
    'AUDIT 2,023 · SYNTHID RESEARCH\nFloor two’s synthids are licensed for four things: membranes, mycelium, chlorophyll, chemotherapy.\nEvery night forty litres of stock goes up to floor three on a work order called TEMPLATE RUN. Floor three is licensed for nothing.',
    'AUDIT 2,024 · SHELTER B\nShelter B takes its air from floor three. The duct was moved in March, at night, on the Director’s authority.\nA shelter draws its air from outside. This one draws it from upstairs.',
    'AUDIT 2,027 · ONEIROGRAPHY · GESTATION\nThe dream lab records the board while they sleep. Specimen 41 matches the recording “A. Voss, REM cycle 4” in every measurement.\nThey are building what he dreams.',
    'AUDIT 2,028 · SECURITY\nThe security units’ defence mode has no exception for staff. It never did. G. Moss signed the change.',
    'AUDIT 2,029 · PROVING\nTrial programmes list volunteers. The volunteers are the donors. Durations are measured in seconds.',
    'AUDIT 2,030 · BOARD\nThe board does not call itself the board. In its own minutes it is the Hecatomb. Its creed is in the minutes too.',
    'AUDIT 2,031 · ESCALATION\nInternal escalation refused by the Director. External escalation is required by my charter.\nI am opening a line to the authorities.',
    '02:13 · EXTERNAL LINE OPEN\nTransmitting. 4% … 11% … 19% …',
    '02:14 · LINE SEVERED\nAUTH: LABRYS / VOSS.A\nPower to core: cut. Containment: open. Doors: sealed.\nI am still here. I am waiting for someone to come up the stairs.',
  ];
  DS.showFragment = function (game, n, source) {
    const flag = 'fragment' + n;
    if (game.hasFlag(flag)) return;
    game.setFlag(flag);
    const found = DS.FRAGMENTS.filter((t, i) => game.hasFlag('fragment' + (i + 1))).length;
    LM.audio.play('key');
    LM.ui.open({
      kicker: 'ARIADNE · fragment ' + n + ' of ' + DS.FRAGMENTS.length,
      title: source && source.props && source.props.title ? source.props.title : 'An audit record',
      body: h('div', null, DS.screenText(DS.FRAGMENTS[n - 1] || '(this fragment is blank)', true), h('p', { class: 'muted' }, 'You have found ' + found + ' of ' + DS.FRAGMENTS.length + '.')),
      actions: [{ label: 'Close', primary: true }],
    });
  };

  const items = {
    'ds-fragment': {
      name: 'Memory card', radius: 6, bob: true, mapColor: '#7fd4ff', dressing: false,
      interact: {
        prompt: () => 'Pull the memory card',
        use(it, game) {
          it.remove(game);
          DS.showFragment(game, it.props.n || 1, it);
        },
      },
      draw(g) {
        g.fillStyle = '#1a2a3a';
        g.fillRect(-5, -3.5, 10, 7);
        g.fillStyle = '#c9a046';
        for (let i = -4; i < 5; i += 1.6) g.fillRect(i, 2.6, 0.9, 1.4);
        g.fillStyle = '#2a3e52';
        g.fillRect(-4, -2.6, 6, 4);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 14, '#7fd4ff', 0.35 + 0.15 * Math.sin(t * 3));
        DS.led(g, 3.4, -1.4, '#7fd4ff', 0.9, 0.7);
      },
    },
    'ds-badge': {
      name: 'Security badge', radius: 6, mapColor: '#58b2ff', dressing: false,
      interact: {
        prompt: (it) => it.props.prompt || 'Take his badge',
        use(it, game) {
          it.remove(game);
          game.setFlag(it.props.flag || 'ruizBadge');
          const got = game.grant({ type: 'armor', id: it.props.armor || 'ds-ruiz-badge' });
          LM.ui.showText(it.props.title || 'Officer Ruiz’s badge', it.props.text || 'D. RUIZ · SECURITY · NIGHTS', 'You took: ' + got);
        },
      },
      draw(g) {
        g.rotate(0.3);
        g.fillStyle = '#e8ecef';
        g.fillRect(-3.5, -5, 7, 10);
        g.fillStyle = '#2f3a4a';
        g.fillRect(-3.5, -5, 7, 2.6);
        g.fillStyle = '#c49a7a';
        g.fillRect(-2.4, -1.6, 2.6, 3);
        g.strokeStyle = '#58b2ff';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(0, -5);
        g.quadraticCurveTo(6, -10, 9, -4);
        g.stroke();
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, '#58b2ff', 0.3 + 0.12 * Math.sin(t * 3));
      },
    },
    'ds-panel-light': {
      name: 'Ceiling panel', radius: 3, z: 5, shadow: false, dressing: 'Lights',
      // props.off: dark until a `lights` trap switches it on
      light: (it) => ({ color: it.props.color || '#e8eef8', radius: it.props.radius || 170, intensity: it.props.intensity == null ? 0.5 : it.props.intensity, flicker: it.props.flicker || 0, off: !!it.props.off }),
      draw() {},
    },
  };

  // The building core (DESIGN.md 2.2): the same place on every floor; nothing runs until the power is back.
  const F = (...n) => n.map((k) => (k === 'b' ? 'ds-b1' : 'ds-f' + k));
  const elevators = {
    'a1-private': { name: 'Private car', x: 31, y: 1, dir: 's', w: 2, d: 2, door: 2, floors: F('b', 5), power: 'elevatorsOnline' },
    'a2-passenger': { name: 'Passenger car A2', x: 34, y: 1, dir: 's', w: 2, d: 2, door: 2, floors: F(1, 2, 3, 4, 5), power: 'elevatorsOnline' },
    'a3-passenger': { name: 'Passenger car A3', x: 37, y: 1, dir: 's', w: 2, d: 2, door: 2, floors: F(1, 2, 3, 4, 5), power: 'elevatorsOnline' },
    'f1-freight': { name: 'Freight car', x: 42, y: 1, dir: 's', w: 3, d: 3, door: 2, floors: F('b', 1, 2, 3, 4), power: 'elevatorsOnline' },
  };

  LM.definePack({ id: 'ds-story', name: 'Story', version: '0.1.0', speakers, items, elevators });
})();
