/* HaveNot — packs/hn-sites/people.js
 * The people of the near area's civilized places, and their dialog trees.
 *
 *   Out-rider Outpost   Hesketh (trader), Doc Varga (medic), Lugnut Mae (technician: A Problem with the Power),
 *                       Pell (radio operator: rumors)
 *   Boom-Town           Gatekeeper 7 (the 100-credit pass), Clerk Primm (the Bazaar), Ezra Bang (weapons),
 *                       Nurse Halloran (the clinic), Widow Okonkwo and Deacon Spool (standing)
 *   The den             Mother Long-Legs (heals for free, once a mission; observations)
 * Lines change with the world: a powered Outpost, a silenced ad system, your standing.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  const HN = LM.HN;
  const later = (fn) => () => setTimeout(fn, 0); // open a panel after the dialog closes
  const silent = (game) => HN.flag(game, 'hnAdsSilent');

  // ------------------------------------------------------------ rumors (Pell)
  HN.RUMORS = [
    { id: 'agency', text: 'The square concrete block east of the road was an advertising agency. Its security never got the memo that everyone died.', flag: 'hnAgencyKnown' },
    { id: 'sphinx', text: 'Reception at the agency has a talking turret that asks questions. The answer is on the walls, they say: the company never shut up about its slogan.' },
    { id: 'roaches', text: 'Gladiator Roaches will do anything for something sweet. Somebody once walked through a nest behind a box of cookies.' },
    { id: 'longlegs', text: 'If you’re hurt and broke, there’s a hole south of here. Go down slow and talk polite. She helps.' },
    { id: 'robots', text: 'Maintenance robots stop dead in front of safety signs. Old programming. Hang one on your back, I always say. (Nobody has tried it.)' },
    { id: 'bolthole', text: 'A courier went missing near the agency years back carrying a map to some executive’s private bolt hole. Find the courier, find the map.', objective: 'bolthole' },
    { id: 'bay', text: 'Robots you smash at the agency come back. Something in there rebuilds them. Turn that off and they stay smashed.' },
  ];

  // ------------------------------------------------------------ portraits for people who aren't people
  function spiderPortrait(mood, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    g.fillStyle = '#0a0806';
    g.fillRect(0, 0, size, size);
    const cx = size / 2, cy = size * 0.56;
    g.strokeStyle = '#3a2a22';
    g.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * (0.1 + (i / 7) * 0.8) * (i < 4 ? -1 : 1) + (i < 4 ? 0 : Math.PI);
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + Math.cos(a) * size * 0.5, cy - size * 0.35, cx + Math.cos(a) * size * 0.62, cy + size * 0.4);
      g.stroke();
    }
    g.fillStyle = '#4a3428';
    g.beginPath();
    g.ellipse(cx, cy, size * 0.2, size * 0.16, 0, 0, U.TAU);
    g.fill();
    for (const [dx, dy, r] of [[-7, -4, 3], [7, -4, 3], [-3, -9, 2], [3, -9, 2], [-11, 1, 1.6], [11, 1, 1.6]]) {
      g.fillStyle = '#9fd8ff';
      g.beginPath();
      g.arc(cx + dx, cy + dy, r, 0, U.TAU);
      g.fill();
    }
    return c;
  }
  function gatePortrait(mood, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    g.fillStyle = '#2a2018';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#5a5a60';
    g.fillRect(size * 0.2, size * 0.18, size * 0.6, size * 0.62);
    g.fillStyle = '#1a2a2a';
    g.fillRect(size * 0.28, size * 0.28, size * 0.44, size * 0.26);
    g.fillStyle = mood === 'annoyed' ? '#ff5a3a' : '#5affb0';
    g.fillRect(size * 0.36, size * 0.36, size * 0.08, size * 0.06);
    g.fillRect(size * 0.56, size * 0.36, size * 0.08, size * 0.06);
    g.fillRect(size * 0.38, size * 0.46, size * 0.24, size * 0.03);
    g.fillStyle = '#e8a23a';
    g.fillRect(size * 0.2, size * 0.66, size * 0.6, size * 0.05);
    return c;
  }

  // ------------------------------------------------------------ dialog helpers
  const tradeOpt = (vendor, label) => ({ label: label || 'Let’s trade.', do: (game) => setTimeout(() => HN.openVendor(game, vendor), 0) });
  const bye = (label) => ({ label: label || 'See you.', end: true });

  const npcs = {
    // ================================================ the Outpost
    'hn-hesketh': {
      name: 'Hesketh', role: 'Outpost quartermaster', behavior: 'stand', face: 's', mood: 'tired',
      look: { skin: '#a8704a', hair: '#8a8a88', hairStyle: 'buzz', shirt: '#6a5a3a', pants: '#3a3428', bg: '#3a3020' },
      barks: (n, game) => (HN.flag(game, 'hnOutpostPowered') ? ['Good shelf’s open.', 'Lights on. Mae’s insufferable now.'] : ['Shells. Cells. Bandages.', 'We buy fuel cells.', 'Don’t lean on the counter.']),
      dialog: {
        start: 'hi', again: 'hi',
        nodes: {
          hi: {
            text: (game) => [HN.flag(game, 'hnOutpostPowered') ? '“You again. Since Mae got the power back I’ve got the good shelf open: Health Paks, radar goggles, grenades.”' : '“Outriders sell what we don’t need and buy what we can use. Fuel cells, mostly. Robots are full of them, if you’re the type to take a robot apart.”'],
            options: [tradeOpt('outpost'), { label: 'What’s wrong with the power?', next: 'power', if: (g) => !HN.flag(g, 'hnOutpostPowered') }, bye()],
          },
          power: { text: '“Ask Mae. She’s the one swearing at the generator.”', options: [tradeOpt('outpost'), bye()] },
        },
      },
    },
    'hn-varga': {
      name: 'Doc Varga', role: 'Outpost medic', behavior: 'sit', face: 'e', mood: 'neutral',
      look: { skin: '#e8bc96', hair: '#3a2a1a', hairStyle: 'bun', shirt: '#d8d4c8', glasses: true, bg: '#2a3a3a' },
      barks: ['Sit. Bleed quietly.', 'I don’t do radiation.'],
      dialog: {
        start: 'hi', again: 'hi',
        nodes: {
          hi: {
            text: '“Minor patch is 50 credits, the full job is 220. Radiation’s Boom-Town’s problem; they’ve got the machine.”',
            options: [{ label: 'Patch me up.', do: (game) => setTimeout(() => HN.openMedic(game, 'outpost'), 0) }, bye('Not today.')],
          },
        },
      },
    },
    'hn-mae': {
      name: 'Lugnut Mae', role: 'Outpost technician', behavior: 'stand', face: 'w', mood: 'annoyed',
      look: { skin: '#c89070', hair: '#c83a2a', hairStyle: 'ponytail', shirt: '#4a5a6a', pants: '#2a2a2a', holding: 'clipboard', bg: '#3a2a2a' },
      barks: (n, game) => (HN.flag(game, 'hnOutpostPowered') ? ['Hum. Beautiful hum.', 'Don’t touch the coupling.'] : ['Come ON, you stupid—', 'It’s not the wiring. It’s never the wiring.', 'I need a real cell.']),
      dialog: {
        start: (game) => (HN.flag(game, 'hnOutpostPowered') ? 'after' : 'hi'),
        again: (game) => (HN.flag(game, 'hnOutpostPowered') ? 'after' : 'ask'),
        nodes: {
          hi: {
            text: ['She has her arm inside a generator to the shoulder. “This thing ran on a Burner-era cell for sixty years. The cell’s dead. I know enough about the old tech to know I don’t know enough.”', '“Bring me three fuel cells, or one of those fat ones out of a big robot, and I’ll keep us lit. If you find a proper power coupling, I’d kiss you.”'],
            do: (game) => HN.objective(game, 'power', 'open'),
            options: [{ label: 'I’ll see what I can find.', next: 'ask' }, bye('Good luck with that.')],
          },
          ask: {
            text: (game) => ['“Well? Fuel cells: you’ve got ' + HN.count(game, 'hn-fuel-cell') + '. Heavy cells: ' + HN.count(game, 'hn-fuel-cell-big') + '. Couplings: ' + HN.count(game, 'hn-coupling') + '.”'],
            options: [
              { label: 'Here: a power coupling.', if: (g) => HN.count(g, 'hn-coupling') > 0, do: (g) => { HN.take(g, 'hn-coupling'); HN.powerOutpost(g, 'coupling'); }, next: 'thanks' },
              { label: 'Here: a heavy fuel cell.', if: (g) => HN.count(g, 'hn-fuel-cell-big') > 0, do: (g) => { HN.take(g, 'hn-fuel-cell-big'); HN.powerOutpost(g, 'big'); }, next: 'thanks' },
              { label: 'Here: three fuel cells.', if: (g) => HN.count(g, 'hn-fuel-cell') >= 3, do: (g) => { HN.take(g, 'hn-fuel-cell', 3); HN.powerOutpost(g, 'cells'); }, next: 'thanks' },
              bye('Still looking.'),
            ],
          },
          thanks: {
            text: (game) => [HN.flag(game, 'hnMaeCoupling') ? '“A real coupling. Do you know how long— never mind.” She kisses you on the forehead, briskly, like stamping a form. “That’ll run for years.”' : '“That’ll hold. For a while.” The generator coughs, then hums. The dishes outside start to turn.', '“Here. It’s a Security Override Module; I pulled it out of an agency door years ago and never had the nerve to use it. Hesketh’s opening the good shelf, too.”'],
            options: [bye('Glad to help.')],
          },
          after: {
            text: (game) => [silent(game) ? '“Radio’s clean since the agency’s ads stopped. I can hear Boom-Town’s dispatch. They’re very boring.”' : '“Still humming. If the agency’s ad jingles weren’t bleeding into every band I could hear the Freeway patrols.”'],
            options: [bye()],
          },
        },
      },
    },
    'hn-pell': {
      name: 'Pell', role: 'Radio operator', behavior: 'sit', face: 'n', mood: 'smile',
      look: { skin: '#704a32', hair: '#140c08', hairStyle: 'curly', shirt: '#3a4a2a', headset: true, bg: '#1e2a1e' },
      barks: ['I hear things.', '…copy that, nothing…', 'Rumors are free. Mostly.'],
      dialog: {
        start: 'hi', again: 'hi',
        nodes: {
          hi: {
            text: (game) => ['Pell slides one side of the headset off. “I hear everything that moves out there, and some things that don’t. Want the news?”', silent(game) ? '“And the ad jingles are gone. I didn’t realize how loud the world was.”' : null].filter(Boolean),
            options: [{ label: 'What have you heard?', next: 'rumor' }, bye('Later.')],
          },
          rumor: {
            text: (game) => {
              const s = HN.st(game);
              const r = HN.RUMORS.find((x) => !s.ledger.some((l) => l.text === x.text)) || HN.RUMORS[(s.mission + (s.tally.kills % 3)) % HN.RUMORS.length];
              HN.note(game, 'rumor', r.text);
              if (r.flag) HN.setFlag(game, r.flag);
              if (r.objective) HN.objective(game, r.objective, 'open');
              return ['“' + r.text + '”'];
            },
            options: [{ label: 'Anything else?', next: 'rumor' }, bye('Thanks.')],
          },
        },
      },
    },

    // ================================================ Boom-Town
    'hn-gatekeeper': {
      name: 'Gatekeeper 7', role: 'Boom-Town gate security', behavior: 'stand', face: 's', mood: 'neutral',
      init(n) { n.portrait = gatePortrait; },
      barks: (n, game) => (HN.flag(game, 'hnBoomPass') ? ['WELCOME BACK, PASS HOLDER.', 'HAVE A COMPLIANT DAY.'] : ['ENTRY REQUIRES A VISITOR PASS.', 'PASSES: 100 CREDITS.', 'LOITERING IS BILLABLE.']),
      draw(g, n, t) {
        g.rotate(n.facing - Math.PI / 2);
        G.circle(g, 0, 0, 10, '#3a3a40');
        G.circle(g, 0, 0, 8.4, '#6a6a72');
        g.fillStyle = '#1a2a2a';
        g.fillRect(-5, 2, 10, 5);
        g.fillStyle = '#e8a23a';
        g.fillRect(-8, -2, 16, 1.6);
      },
      drawGlow(g, n, t) { G.glow(g, n.x + Math.cos(n.facing) * 5, n.y + Math.sin(n.facing) * 5, 10, '#5affb0', 0.5 + 0.2 * Math.sin(t * 3)); },
      dialog: {
        start: (game) => (HN.flag(game, 'hnBoomPass') ? 'pass' : 'hi'), again: (game) => (HN.flag(game, 'hnBoomPass') ? 'pass' : 'hi'),
        nodes: {
          hi: {
            text: (game) => ['“WELCOME TO BOOM-TOWN, WHERE OPPORTUNITY IS MANDATORY. A VISITOR PASS IS 100 CREDITS. YOU HAVE ' + game.player.gold + '.”', HN.st(game).standing <= -3 ? '“YOUR FILE CONTAINS NOTES. THE PASS IS NOW 150 CREDITS.”' : null].filter(Boolean),
            mood: (game) => (HN.st(game).standing <= -3 ? 'annoyed' : 'neutral'),
            options: [
              { label: (game) => 'Buy a pass (' + HN.passPrice(game) + ' credits).', if: (g) => g.player.gold >= HN.passPrice(g), do: (g) => HN.buyPass(g), next: 'pass' },
              { label: 'I can’t afford it.', next: 'poor', if: (g) => g.player.gold < HN.passPrice(g) },
              bye('Never mind.'),
            ],
          },
          poor: { text: '“POVERTY IS A TEMPORARY CONDITION. PLEASE RETURN WHEN IT HAS PASSED. THE ANOMALOUS STRUCTURE TO THE SOUTH-EAST IS FULL OF OPPORTUNITY. AND DEATH.”', mood: 'annoyed', options: [bye('Right.')] },
          pass: { text: (game) => [silent(game) ? '“PASS VALID. THE ADVERTISING BOARDS ARE DOWN. CITIZENS ARE REPORTED TO BE… THINKING. THIS IS BEING MONITORED.”' : '“PASS VALID. PROCEED. SPEND RESPONSIBLY, OR AT LEAST SPEND.”'], options: [bye('Thanks.')] },
        },
      },
    },
    'hn-primm': {
      name: 'Clerk Primm', role: 'The Bazaar', behavior: 'stand', face: 's', mood: 'smile',
      look: { skin: '#e8bc96', hair: '#e8d8a0', hairStyle: 'short', shirt: '#e8e4dc', tie: '#c83a2a', glasses: '#2a2a2a', bg: '#3a2a1a' },
      barks: ['Every sale is final.', 'Taxed and recorded!', 'We buy salvage.'],
      dialog: {
        start: 'hi', again: 'hi',
        nodes: {
          hi: { text: (game) => ['“Welcome to the Bazaar! Every sale is final, taxed, and recorded.”', HN.st(game).standing >= 3 ? '“Oh, it’s you! A ' + HN.standingWord(HN.st(game).standing) + '! I’ll pretend I didn’t see the tax.” (She still charges the tax.)' : null].filter(Boolean), options: [tradeOpt('bazaar'), bye()] },
        },
      },
    },
    'hn-bang': {
      name: 'Ezra Bang', role: 'Bang & Sons, Licensed Armaments', behavior: 'stand', face: 's', mood: 'neutral',
      look: { skin: '#8a5a3a', hair: '#2a1a10', hairStyle: 'bald', shirt: '#5a3a2a', pants: '#2a2018', bg: '#2a1a12' },
      barks: ['Gauss pistols! Mostly safe!', 'No refunds on exploded merchandise.'],
      dialog: {
        start: 'hi', again: 'hi',
        nodes: {
          hi: { text: '“Gauss, plasma, scatter. Coltron fields. I buy used gear at a tenth, because used gear is how most of my customers stop being customers.”', options: [tradeOpt('guns'), bye()] },
        },
      },
    },
    'hn-halloran': {
      name: 'Nurse Halloran', role: 'Boom-Town Clinic', behavior: 'stand', face: 's', mood: 'tired',
      look: { skin: '#d8a07a', hair: '#5a3a2a', hairStyle: 'long', shirt: '#e8f0f0', lanyard: '#2a8a6a', bg: '#1e3434' },
      barks: ['Take a number.', 'Radiation? We have the machine.'],
      dialog: { start: 'hi', again: 'hi', nodes: { hi: { text: '“Wellness and Compliance. We treat wounds and radiation. You’ll be number 1.”', options: [{ label: 'I need treatment.', do: (game) => setTimeout(() => HN.openMedic(game, 'clinic'), 0) }, bye()] } } },
    },
    'hn-okonkwo': {
      name: 'Widow Okonkwo', role: 'Boom-Town resident', behavior: 'sit', face: 'e', mood: 'tired',
      look: { skin: '#5a3a24', hair: '#d8d8d8', hairStyle: 'bun', shirt: '#4a2a5a', bg: '#2a1a2a' },
      barks: (n, game) => (HN.flag(game, 'hnWidowHelped') ? ['He’d have liked you.'] : ['He always brought me a mug.', 'Thirty years of mugs.']),
      dialog: {
        start: (game) => (HN.flag(game, 'hnWidowHelped') ? 'after' : 'hi'), again: (game) => (HN.flag(game, 'hnWidowHelped') ? 'after' : 'hi'),
        nodes: {
          hi: {
            text: '“My husband worked the salvage crews. Every trip he brought me back one of those silly agency mugs, ‘World’s Most Synergistic’. I had thirty-one. The last trip he didn’t come back, and the raiders took the mugs.” She smiles a little. “Silly thing to miss.”',
            options: [
              { label: 'Give her the mug you found.', if: (g) => HN.count(g, 'hn-mug') > 0, do: (g) => { HN.take(g, 'hn-mug'); HN.setFlag(g, 'hnWidowHelped'); HN.standing(g, 2, 'you gave Widow Okonkwo a mug'); g.grant({ type: 'gold', amount: 40 }); }, next: 'thanks' },
              { label: 'Tell her you can get her one, for 200 credits up front.', if: (g) => !HN.flag(g, 'hnWidowScammed'), do: (g) => { HN.setFlag(g, 'hnWidowScammed'); g.grant({ type: 'gold', amount: 200 }); HN.standing(g, -3, 'you took Widow Okonkwo’s savings'); }, next: 'scam' },
              bye('I’ll keep an eye out.'),
            ],
          },
          thanks: { text: '“Oh.” She holds it in both hands. “Thirty-two.” She presses a few credits on you and won’t take them back. Word gets around Boom-Town.', mood: 'smile', options: [bye()] },
          scam: { text: 'She counts out her savings with careful fingers. Across the square, Gatekeeper 7’s lens turns toward you and stays there.', mood: 'tired', options: [bye()] },
          after: { text: (game) => [silent(game) ? '“The screens went dark. I sat outside last night and just looked at the stars. He used to do that.”' : '“Thirty-two mugs. He’d have laughed.”'], mood: 'smile', options: [bye()] },
        },
      },
    },
    'hn-spool': {
      name: 'Deacon Spool', role: 'Boom-Town Ping-Pong League', behavior: 'pace', face: 's', mood: 'smile',
      look: { skin: '#e8bc96', hair: '#8a6a3a', hairStyle: 'curly', shirt: '#e8a23a', pants: '#3a3a5a', bg: '#3a3020' },
      barks: ['The League needs balls!', 'Ping. Pong. Civilization.'],
      dialog: {
        start: (game) => (HN.flag(game, 'hnLeagueBalls') ? 'after' : 'hi'), again: (game) => (HN.flag(game, 'hnLeagueBalls') ? 'after' : 'hi'),
        nodes: {
          hi: {
            text: '“The Boom-Town Ping-Pong League is the only thing in this town that isn’t for sale! We have a table, two paddles and no balls. The old world made them by the million and we can’t make one.”',
            options: [
              { label: 'I found a whole crate of them.', if: (g) => HN.count(g, 'hn-ping-pong') > 0, do: (g) => { HN.take(g, 'hn-ping-pong'); HN.setFlag(g, 'hnLeagueBalls'); HN.standing(g, 2, 'the Ping-Pong League has balls'); g.grant({ type: 'gold', amount: 60 }); }, next: 'thanks' },
              bye('Good luck.'),
            ],
          },
          thanks: { text: '“A CRATE?” He weeps openly. “The League will remember you. There will be a trophy. Probably a mug.”', options: [bye()] },
          after: { text: '“Tournament’s every evening now. You should see people’s faces. Nobody’s selling anything.”', options: [bye()] },
        },
      },
    },

    // ================================================ the den
    'hn-longlegs': {
      name: 'Mother Long-Legs', role: 'The den', behavior: 'stand', face: 's', radius: 22, reach: 40, mood: 'neutral', ignoresPlayer: true,
      init(n) { n.portrait = spiderPortrait; },
      barks: ['…little one…', '…closer, I don’t bite the polite…'], barkRange: 220,
      draw(g, n, t) {
        // eight long legs out to the pillars, a body like a boulder
        g.strokeStyle = '#2a1e18';
        g.lineWidth = 3.4;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * U.TAU + 0.2 + Math.sin(t * 0.6 + i) * 0.04;
          const kx = Math.cos(a) * 26, ky = Math.sin(a) * 26 - 8;
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(kx, ky);
          g.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
          g.stroke();
        }
        g.fillStyle = '#3a2a22';
        g.beginPath();
        g.ellipse(0, 4, 15, 13, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#4a3428';
        g.beginPath();
        g.ellipse(0, -9, 9, 8, 0, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, n, t) {
        for (const [dx, dy, r] of [[-4, -12, 2], [4, -12, 2], [-2, -15, 1.4], [2, -15, 1.4]]) G.glow(g, n.x + dx, n.y + dy, r * 3, '#9fd8ff', 0.6 + 0.2 * Math.sin(t * 1.3));
      },
      dialog: {
        start: 'hi', again: 'again',
        nodes: {
          hi: {
            text: ['Eight eyes open in the dark, one pair at a time. The voice is soft, old, and comes from everywhere. “A little one. Hurt, and pretending not to be. Come, come. I don’t eat the polite.”'],
            options: [{ label: 'Can you help me?', next: 'heal' }, { label: 'What are you?', next: 'what' }, bye('I’ll go.')],
          },
          again: { text: '“Back again, little one.”', options: [{ label: 'Can you help me?', next: 'heal' }, { label: 'Tell me something.', next: 'saying' }, bye('Goodbye, Mother.')] },
          what: { text: '“Something the old world made to watch a hole. The hole is gone. I stayed.” A leg, longer than you are tall, settles gently on the floor beside you.', options: [{ label: 'Can you help me?', next: 'heal' }, bye()] },
          heal: {
            text: (game) => {
              const s = HN.st(game), P = game.player;
              if (s.longlegsHealed === s.mission) return ['“Not again so soon. My silk takes time. Come back after you’ve been home.”'];
              if (P.hp >= P.stats().maxHp) return ['“You are whole. Go and be careful with it.”'];
              s.longlegsHealed = s.mission;
              const got = LM.combat.heal(game, P, Math.round(P.stats().maxHp * 0.6));
              LM.audio.play('heal');
              game.toast('Mother Long-Legs wraps your wounds in cool silk (+' + Math.round(got) + ').', 'good');
              return ['She binds your wounds in silk that is cool and smells faintly of rain. The pain goes somewhere else. “There. No charge. There is never a charge.”'];
            },
            options: [{ label: 'Tell me something.', next: 'saying' }, bye('Thank you.')],
          },
          saying: {
            text: (game) => {
              const lines = [
                '“The square building talks all night. It has nobody left to talk to, so it talks to everyone.”',
                '“The walled town counts everything. Count yourself, sometimes, and see if you agree.”',
                '“Something under the dead billboard keeps its door shut from the inside. Patient thing.”',
                '“The machines are not cruel. They are obedient. It is worse.”',
                silent(game) ? '“It is quiet now, the square building. You did that. Listen.”' : '“Robots fear the signs on the walls. Little pictures of little people being careful.”',
              ];
              const s = HN.st(game);
              s.longlegsSaid = ((s.longlegsSaid || 0) + 1) % lines.length;
              return [lines[s.longlegsSaid]];
            },
            options: [bye('Goodbye, Mother.')],
          },
        },
      },
    },
  };

  // ------------------------------------------------------------ what the people do
  HN.passPrice = (game) => (HN.st(game).standing <= -3 ? 150 : 100);
  HN.buyPass = function (game) {
    const price = HN.passPrice(game);
    if (game.player.gold < price) return false;
    game.player.gold -= price;
    HN.setFlag(game, 'hnBoomPass');
    HN.objective(game, 'access', 'done');
    LM.audio.play('key');
    game.toast('Boom-Town visitor pass (−' + price + 'c). The gate rolls open.', 'key');
    return true;
  };
  HN.powerOutpost = function (game, how) {
    HN.setFlag(game, 'hnOutpostPowered');
    if (how === 'coupling') HN.setFlag(game, 'hnMaeCoupling');
    HN.objective(game, 'power', 'done');
    HN.give(game, 'hn-override', 1, { from: 'Lugnut Mae' });
    HN.note(game, 'change', 'The Out-rider Outpost has power again.');
  };

  LM.definePack({ id: 'hn-sites', npcs });
})();
