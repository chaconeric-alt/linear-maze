/* Dead Signal — packs/ds-story/prologue.js
 * The prologue (levels/f0-prologue.js; DESIGN.md section 4.0): the ground floor at 01:41, before the lockdown.
 * The people whose bodies Theo finds on Floor 1 are alive and at work; the ones who end up on Floor 4 are called
 * up over the PA; ARIADNE, friendly and helpful, gives Theo his night's work and then, because she has a
 * feeling she isn't supposed to have, puts him in the one room with a good door.
 *
 *   environments  ds-lobby-night       the ground floor as it is every night (ds-lobby with the lights on)
 *   armor         ds-coveralls         Facilities coveralls (body)
 *   npcs          ds-p0-*              the night staff (placement props.leaves: a flag; when it's set they go
 *                                      upstairs as soon as you aren't looking)
 *   items         ds-toolbag           your tool bag on the bench: the Bolt Driver (p0Driver)
 *                 ds-uniform-locker    your locker: the coveralls (p0Uniform)
 *                 ds-test-board        Kowalski's test board: three bolts in it (p0Board)
 *                 ds-job               a work order's tag on a fault (props.flag; props.open while it's not done);
 *                                      the fourth done sets p0OrdersDone
 *                 ds-spare-shelf       Facilities stores: the spare core switch, once p0SwitchDown (p0Spare)
 *                 ds-closet-switch     the dead core switch in Comms Closet 1-C: fit the spare (p0SwitchIn)
 *                 ds-lift-doors        elevator doors on the lobby wall (the prologue isn't a stop: the cars are
 *                                      held on Five)
 *                 ds-strobe-off        an emergency strobe that's dark until a ds-lights effect turns it on
 *                 ds-p0-note           a note that's only there once props.when is set (Brennan's, on the bench)
 *                 ds-pallet            parcels on a pallet (dressing; can't be shot open)
 *   effects       ds-sound             { sound, vol, times, gap }: play a sound, some times over
 *                 ds-lights            { tag, on }: switch tagged lights, quietly
 *                 ds-give              { weapons, armor, flags }: what the prologue gives you (its skip uses it)
 *   sounds        dsSiren, dsShutterSlam, dsScream, dsGunfire
 *
 * Flags: p0Arrived, p0Uniform, p0Driver, p0Brennan, p0Board, p0Orders, p0JobCoffee, p0JobCamera, p0JobLight,
 * p0JobDock, p0OrdersDone, p0Called (the PA calls people up), p0SwitchDown, p0Spare, p0InCloset, p0SwitchIn,
 * p0AriadneDone (then the lockdown, and Floor 1), p0Chatted (talked to four people), playedPrologue.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {});
  const has = (g, f) => g.hasFlag(f);
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  const AMBER = '#f2c35b', GREEN = '#5fe08a', RED = '#ff4a3a';
  const back = (label) => ({ label: label || 'Something else…', next: 'menu' });
  const bye = (label) => ({ label: label || 'I’ll let you get on.', end: true });
  const called = (g) => has(g, 'p0Called');

  // ======================================================== the floor, every other night
  const environments = {};
  const base = LM.find('environments', 'ds-lobby');
  if (base) {
    environments['ds-lobby-night'] = Object.assign({}, base, {
      name: 'Asterion · Ground floor, 01:41',
      ambient: '#40454f',
      attractAmbient: '#5a606b',
      outsideSight: '#31353d',
      torch: '#ffd2a0',
      // the carpet as it was before anything bled on it
      floors: Object.assign({}, base.floors, { 5: base.floors[0] }),
      particles: { type: 'mote', color: '#e8eef8', rate: 1.2, alpha: 0.08, drift: 2 },
      ambience: { base: 60, cutoff: 360, wind: 500, gain: 0.03, wave: 'sine' },
    });
  }

  const armor = {
    'ds-coveralls': {
      name: 'Facilities coveralls', slot: 'body', color: '#3a5068', trim: '#d9a21c',
      mods: { armor: 0.04 },
      desc: 'Navy, ASTERION · FACILITIES across the back, a reflective stripe that has been through the wash too many times. LARK on the pocket. A pocket for everything, and something in every pocket.',
    },
  };

  // ======================================================== the people
  // A placement's props.leaves: a flag. Once it's set they go (upstairs, wherever they were called) the first
  // moment you aren't looking. Everyone you talk to counts toward p0Chatted (four).
  function staff(def) {
    const own = def.update;
    def.update = function (n, dt, game) {
      if (own) own(n, dt, game);
      if (n.mem.talked && !n.mem.counted && game.player) {
        n.mem.counted = true;
        const d = game.player.data;
        d.p0Talked = (d.p0Talked || 0) + 1;
        if (d.p0Talked >= 4) game.setFlag('p0Chatted');
      }
      const leaves = n.props.leaves || def.leaves;
      if (leaves && has(game, leaves) && !n.gone) {
        n.mem.goT = (n.mem.goT || 0) + dt;
        if (!n.seeLos && n.vis < 0.05 && n.mem.goT > 1.2 && !(LM.ui.modalOpen && LM.ui.spec && LM.ui.spec.title === n.name)) {
          n.gone = true;
          n.dead = true;
          game.schedule(0, () => { game.npcs = game.npcs.filter((o) => o !== n); });
        }
      }
    };
    return def;
  }
  // each one's menu of topics: what Theo can ask them (a node's options: M(id))
  const MENUS = {
    'ds-p0-brennan': (g) => [
      { label: 'How’s the night been?', next: 'night', once: true },
      { label: 'What’s going on upstairs?', next: 'board', once: true },
      { label: 'You look pleased with yourself.', next: 'screening', once: true, if: (gg) => !called(gg) },
      { label: 'Anything I should know about ARIADNE?', next: 'ariadne', once: true },
      bye('Let’s get to work.'),
    ],
    'ds-p0-marisa': () => [
      { label: 'Is it your birthday?', next: 'bday', once: true },
      { label: 'Why’s the board meeting at this hour?', next: 'hour', once: true },
      { label: 'What are you typing?', next: 'email', once: true },
      { label: 'Has anyone been asked upstairs?', next: 'invites' },
      bye(),
    ],
    'ds-p0-karin': () => [
      { label: 'Remind me.', next: 'remind', once: true },
      { label: 'Why’s the board in at night?', next: 'night', once: true },
      { label: 'Where’s Danny?', next: 'danny', once: true },
      bye('Badge away. Got it.'),
    ],
    'ds-p0-ruiz': (g) => [
      { label: 'Much better. She says hello.', next: 'mother', once: true },
      { label: 'Camera four’s on my list.', next: 'cam', once: true, if: (gg) => has(gg, 'p0Orders') && !has(gg, 'p0JobCamera') },
      { label: 'Why are you in so early?', next: 'early', once: true },
      { label: 'What’s happening upstairs tonight?', next: 'upstairs', once: true },
      { label: 'Danny, are you all right?', next: 'scared', once: true, if: (gg) => called(gg) },
      bye(),
    ],
    'ds-p0-kwan': () => [
      { label: 'What’s happening on four?', next: 'four', once: true },
      { label: 'Danny says you’ve been on four all week.', next: 'week', once: true },
      { label: 'Sorry. Camera four’s on my list.', next: 'cam', once: true, if: (gg) => has(gg, 'p0Orders') && !has(gg, 'p0JobCamera') },
      bye('I’ll get out of your way.'),
    ],
    'ds-p0-felix': () => [
      { label: 'What do they dream about?', next: 'dream', once: true },
      { label: 'Why is the board in tonight?', next: 'why', once: true },
      bye('Sleep well, then.'),
    ],
    'ds-p0-okafor': () => [
      { label: 'What do you know about the board?', next: 'board', once: true },
      { label: 'Seen Peg tonight?', next: 'peg', once: true },
      { label: 'Do you think something’s wrong?', next: 'wrong', once: true },
      bye('I’ll walk round the wet.'),
    ],
    'ds-p0-dennis': () => [
      { label: 'What came in at one?', next: 'crates', once: true },
      { label: 'The dock sensor’s on my list.', next: 'sensor', once: true, if: (gg) => has(gg, 'p0Orders') && !has(gg, 'p0JobDock') },
      { label: 'Is Hal all right?', next: 'hal', once: true },
      bye(),
    ],
    'ds-p0-nadia': () => [
      { label: 'There aren’t any children in this building.', next: 'children', once: true },
      { label: 'Are you going?', next: 'going', once: true },
      { label: 'The light’s on my list.', next: 'light', once: true, if: (gg) => has(gg, 'p0Orders') && !has(gg, 'p0JobLight') },
      bye(),
    ],
    'ds-p0-priya': () => [
      { label: 'What are you working on?', next: 'sheet', once: true },
      { label: 'What’s the board deciding?', next: 'deciding', once: true },
      bye(),
    ],
  };
  const M = (id) => (g, npc) => (MENUS[id] || (() => [bye()]))(g, npc);

  const SEC = '#2f3a4a';
  const npcs = {
    // ------------------------------------------------ Jo Brennan, your trainee
    'ds-p0-brennan': staff({
      name: 'Jo Brennan', role: 'Facilities · nights · your trainee', behavior: 'stand', face: 'w', mood: 'smile', leaves: 'p0Called',
      look: { skin: '#ecc8aa', hair: '#b4582a', hairStyle: 'ponytail', shirt: '#3a5068', pants: '#2a3240', lanyard: '#d9a21c', holding: 'clipboard', bg: '#233040' },
      barks: (n, g) => called(g)
        ? ['That’s me! Floor two. Half an hour.', 'Save me some of Marisa’s cake.']
        : has(g, 'p0Board')
          ? ['Three in the board. Kowalski would weep.', 'Your jobs are on the map, boss.', 'Two o’clock. Screening. Fully compensated!']
          : ['Morning, boss.', 'Board’s in. Shirts tucked, ARIADNE says.', 'I’ve labelled the spanners. Don’t look at me like that.', 'Three bolts in the board. Kowalski’s rule.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            flag: 'p0Brennan', mood: 'smile',
            text: [
              'There you are! ARIADNE said you’d be four minutes early, and you’re four minutes early. She’s getting scary.',
              'Uniform’s in your locker. Your tool bag’s on the bench; the rivet gun’s in it. Sorry: the bolt driver. Kowalski says if I call it a rivet gun once more he’ll rivet me to something.',
              'Three bolts in the test board before it goes anywhere. His rule. He’s on leave and I can still hear him.',
            ],
            options: M('ds-p0-brennan'),
          },
          menu: {
            mood: 'smile',
            text: (g) => [called(g) ? 'That was the PA! That’s me: the screening. I’ll be back before you’ve finished, I promise.' : has(g, 'p0Board') ? 'Go on, then. Your jobs are on the map. I’ll hold the fort.' : 'Boss?'],
            options: M('ds-p0-brennan'),
          },
          night: {
            text: [
              'Quiet. Too quiet, Kowalski would say, and then he’d tell you about the time the autoclave blew.',
              'Danny’s in early, the board’s in, and there’s a cake in the break-room fridge with MARISA on it. So: big night.',
            ],
            options: () => [back(), bye('Right. Work.')],
          },
          board: {
            text: [
              'All five of them. They came down in their private car at midnight. On a Tuesday!',
              'Hal says when the board comes in at night you keep your head down and you mop. I said I don’t mop. He said, “You will.”',
              'Everybody’s whispering. Priya says there’s a buyer. Not for the company: for something we make.',
            ],
            options: () => [{ label: 'What do we make?', next: 'make', once: true }, back(), bye()],
          },
          make: {
            text: [
              '“Organ scaffolds, gene therapies and bespoke organisms for defence and research partners.” It’s on the wall in reception.',
              'I asked Kowalski what a bespoke organism was and he went very quiet and then talked about football for twenty minutes.',
            ],
            options: () => [back(), bye()],
          },
          screening: {
            mood: 'smile',
            text: [
              'I got enrolled! The wellness screening, floor two. I didn’t sign up by the thirtieth, so it’s automatic. Tonight, two o’clock.',
              'Fully compensated, Theo. Half a month’s rent for having my blood pressure taken.',
            ],
            options: () => [{ label: 'Don’t go up there tonight.', next: 'dontgo' }, { label: 'Good for you.', next: 'good' }],
          },
          dontgo: {
            text: [
              'Ha! You sound like ARIADNE.',
              'She asked me if I’d go another night. A building asked me that. I said it’s automatic, I don’t get a choice. She said, “No. I suppose you do not.”',
              'Half an hour. I’ll be back before you’ve done the coffee machine.',
            ],
            options: () => [back(), bye()],
          },
          good: { mood: 'smile', text: ['Right? I’m buying a kettle that isn’t held together with tape.'], options: () => [back(), bye()] },
          ariadne: {
            text: [
              'She’s nice. Is that weird? She asks how I slept.',
              'Last week she asked me whether I thought a building could be a witness. I said I didn’t know. She said, “Thank you. That is honest.”',
            ],
            options: () => [back(), bye()],
          },
        },
      },
    }),

    // ------------------------------------------------ Marisa Quint, reception
    'ds-p0-marisa': staff({
      name: 'Marisa Quint', role: 'Reception · nights', behavior: 'sit', face: 's', mood: 'smile', reach: 40,
      look: { skin: '#d8b090', hair: '#8a5a2a', hairStyle: 'bun', shirt: '#6a3a4a', headset: true, lanyard: '#58b2ff', bg: '#3a2030' },
      barks: (n, g) => called(g)
        ? ['They called them up like a dentist’s.', 'Leon waved. He had his hat on already.']
        : ['Asterion Biologics, good morn— oh, it’s you.', 'Best behaviour tonight, Mr Voss’s office says.', 'Nobody’s said happy birthday. I’m counting.', 'Board’s in. Feet off the furniture.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            mood: 'smile',
            text: [
              'Theo! Morning. You’re early. Everybody’s early tonight; it’s like a school play.',
              'Mr Voss’s office rang down: the board’s meeting upstairs, and everyone is to be on their best behaviour. They said it twice. Best. Behaviour.',
            ],
            options: M('ds-p0-marisa'),
          },
          menu: { mood: 'smile', text: (g) => [called(g) ? 'They called them up over the PA. Like a dentist’s waiting room. Leon waved on his way past. He had his paper hat on already.' : 'Still here. Still on my best behaviour.'], options: M('ds-p0-marisa') },
          bday: {
            mood: 'smile',
            text: [
              'It is! How did you— the cake. Somebody’s been in the fridge.',
              'Thirty-four. I bought my own cake, because nobody here would.',
              'And Leon Marsh is forty-one, and the board’s throwing him a party. Upstairs. On four. I’ve been here six years and I’ve never been past two.',
            ],
            options: () => [back(), bye('Happy birthday, Marisa.')],
          },
          hour: {
            text: [
              'That’s what I said! Two in the morning on a Tuesday. The private car, no assistants, no caterers.',
              'Martin went up at midnight in his white jacket to wait on a dinner. A dinner. At midnight. For who?',
              'Something’s happening. Something big. You can feel it in the phones: nobody’s rung all night. It’s like the whole building’s holding its breath.',
            ],
            options: () => [back(), bye()],
          },
          email: {
            text: [
              '(She turns the screen away from you, and then, after a moment, back.)',
              'On it, an email to the whole staff list: “Has anybody else noticed the board come in at night—”',
              'I’m not going to send it. I just want to know if it’s only me.',
            ],
            options: () => [{ label: 'It isn’t only you.', next: 'notonly', once: true }, back(), bye()],
          },
          notonly: { mood: 'neutral', text: ['(She looks at you for a long moment.) Thank you.', 'Don’t tell anyone I asked.'], options: () => [back(), bye()] },
          invites: {
            text: (g) => called(g)
              ? ['Five of them, over the PA. Leon, Nadia, Dana Kwan, Felix from the dream studio, and Hal Ostrowski.', 'And Jo, for her screening. Everybody gets an invite tonight but me. (She laughs. It doesn’t quite work.)']
              : ['Leon, for his party. Nadia from first aid: they want her to sit with someone. Dana Kwan’s been up and down to four all week for Mr Moss.', 'And Hal Ostrowski’s name was on tonight’s delivery list. On the list, Theo. Like a box.', 'I’d go. If they asked me, I’d go. Wouldn’t you?'],
            options: (g) => called(g) ? [back(), bye()] : [{ label: 'No.', next: 'no' }, { label: 'Maybe.', next: 'maybe' }],
          },
          no: { text: ['(She laughs, and then stops.) No. No, you wouldn’t, would you.'], options: () => [back(), bye()] },
          maybe: { mood: 'smile', text: ['Liar. You’d go. We’d all go. That’s the thing.'], options: () => [back(), bye()] },
        },
      },
    }),

    // ------------------------------------------------ Officer Karin Lund, the gates
    'ds-p0-karin': staff({
      name: 'Officer Karin Lund', role: 'Security · nights · the gates', behavior: 'stand', face: 's', mood: 'neutral',
      look: { skin: '#e0c0a0', hair: '#c8a060', hairStyle: 'bun', shirt: SEC, pants: '#1e2430', lanyard: '#58b2ff', bg: '#1e2838' },
      barks: (n, g) => called(g) ? ['Eleven years. Never heard the PA call anyone up.', 'Stations.'] : ['Badges out.', 'Board’s in. Walk, don’t run.', 'Lark. Shirt.', 'Stations, people.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            text: ['Lark. Badge.', '(You show her. She doesn’t look at it.)', 'Good. The board’s in session on five. You know what that means.'],
            options: M('ds-p0-karin'),
          },
          menu: { text: (g) => [called(g) ? 'They called five people up to four. Over the PA. In eleven years I’ve never once heard the PA call anybody up.' : 'Lark.'], options: M('ds-p0-karin') },
          remind: {
            text: [
              'Walk, don’t run. Stay off the stairs. Don’t look at the private car. If one of them comes down, you stand still and you say good morning, and you don’t say anything else.',
              'Moss’s rules. He’s on the radio every ten minutes: stations, stations.',
            ],
            options: () => [back(), bye('Badge away. Got it.')],
          },
          night: {
            text: [
              'Not my business. My business is the gates.',
              '(Lower.) Moss changed the rota tonight. Every post doubled, nobody told why, and Danny’s not on until fourteen minutes past two. Who starts a shift at fourteen past?',
              'Sixteen years Moss has run this building. He has never once changed a rota on the day.',
            ],
            options: () => [back(), bye()],
          },
          danny: { text: ['In the office, early, eating my biscuits. He doesn’t clock in until 02:14. He likes to be early. He says it about everything.'], options: () => [back(), bye()] },
        },
      },
    }),

    // ------------------------------------------------ Officer Danny Ruiz, in early
    'ds-p0-ruiz': staff({
      name: 'Officer Danny Ruiz', role: 'Security · nights · on at 02:14', behavior: 'sit', face: 'n', mood: 'smile', reach: 20,
      look: { skin: '#a8744a', hair: '#141010', hairStyle: 'buzz', shirt: SEC, pants: '#1e2430', lanyard: '#58b2ff', holding: 'mug', bg: '#1e2838' },
      barks: (n, g) => called(g) ? ['They called Dana over the PA. Dana!', 'I’m going to be very good tonight.'] : ['Theo! How’s your mother?', 'Not on till 02:14. I’m just early.', 'Camera four’s been dark since midnight.', 'Board’s in. Shoes polished.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: { mood: 'smile', text: ['Theo! Come in, come in. How’s your mother? Is the hip better?'], options: M('ds-p0-ruiz') },
          menu: {
            mood: (g) => (called(g) ? 'tired' : 'smile'),
            text: (g) => [called(g) ? 'They called Dana. Over the PA, like a stranger. She’s Moss’s own; why would they call her over the PA?' : 'What can I do you for?'],
            options: M('ds-p0-ruiz'),
          },
          mother: { mood: 'smile', text: ['Good, good. You tell her Danny says hello. You tell her I’m still waiting on that recipe.', 'My mother never trusted anybody who didn’t feed people. Your mother feeds people. That’s good people.'], options: () => [back(), bye()] },
          early: {
            text: [
              'I’m not on till fourteen past two. Moss’s rota. Fourteen past! So I come in early, I drink Karin’s coffee, I eat Karin’s biscuits, I watch the cameras.',
              'Something’s up tonight. Every post doubled. Dana Kwan’s been on four all week and she won’t tell me what for. Twelve years I’ve known Dana, she’s never once not told me a thing.',
            ],
            options: () => [back(), bye()],
          },
          upstairs: {
            text: [
              'Board’s on five. Four’s Moss’s floor. Nobody goes to four.',
              'Except tonight half the building’s going to four. Leon’s got a party. A party, Theo, on four. Somebody pinned a badge on him: BIRTHDAY BOY.',
              'Twelve years. I’ve never seen the inside of four. I’d like to, once. Just to see.',
              '(He thinks about it.) No. No, I wouldn’t.',
            ],
            options: () => [back(), bye()],
          },
          cam: { text: ['Be my guest. Camera four: the landing at the top of Stair A, outside the boardroom floor. Went dark at midnight, right as they came in. Probably nothing.'], options: () => [back(), bye()] },
          scared: { mood: 'tired', text: ['Something’s up, Theo. I’m going to be very good tonight. You be good too.', 'And go home to your mother after.'], options: () => [back(), bye('I will.')] },
        },
      },
    }),

    // ------------------------------------------------ Officer Dana Kwan, Moss's
    'ds-p0-kwan': staff({
      name: 'Officer Dana Kwan', role: 'Security · Floor 4 · Mr Moss’s', behavior: 'stand', face: 'w', mood: 'neutral', leaves: 'p0Called',
      look: { skin: '#c49a7a', hair: '#1a1410', hairStyle: 'bun', shirt: '#2a3440', pants: '#1a2030', lanyard: '#e0702a', holding: 'phone', bg: '#2a2420' },
      barks: (n, g) => called(g) ? ['That’s me.', 'Four.'] : ['Mm.', 'Stations.', 'Mr Moss knows what he’s doing.', 'Not now, Danny.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: { text: ['(She’s signing out a radio. She doesn’t look up.) Lark. Facilities. Nights.', 'You’re not supposed to be in here when the board’s in.'], options: M('ds-p0-kwan') },
          menu: { text: (g) => [called(g) ? 'That was my name. I have to go up.' : 'Lark.'], options: M('ds-p0-kwan') },
          four: { text: ['Security.', '(She clips the radio to her belt.) A trial. That’s all I know, and it’s more than you know, and you’ll forget it.'], options: () => [{ label: 'What kind of trial?', next: 'trial', once: true }, back(), bye()] },
          trial: {
            text: [
              'The kind that’s none of your business.',
              'Mr Moss has run this building for sixteen years. Nobody’s ever been hurt on his watch who didn’t deserve it.',
              '(She hears herself say it, and frowns.) I reset the armory up there tonight. My own code. Nobody gets in without me.',
            ],
            options: () => [back(), bye()],
          },
          week: { text: ['Danny talks.', 'Mr Moss asked for me. Personally. You don’t say no to that, and you don’t ask why. That’s what loyalty is.'], options: () => [back(), bye()] },
          cam: { text: ['Leave it dark.', '(A pause.) No. Fix it. I don’t care.'], options: () => [back(), bye()] },
        },
      },
    }),

    // ------------------------------------------------ Leon Marsh, forty-one today
    'ds-p0-leon': staff({
      name: 'Officer Leon Marsh', role: 'Security · forty-one today', behavior: 'stand', face: 'w', mood: 'smile', leaves: 'p0Called',
      look: { skin: '#6a4a32', hair: '#141010', hairStyle: 'short', shirt: SEC, pants: '#1e2430', lanyard: '#ff8ac8', holding: 'coffee', bg: '#3a2438' },
      barks: (n, g) => called(g) ? ['That’s me! Four!', 'Wish me happy birthday, somebody!'] : ['Forty-one! Don’t sing.', 'A party. On four. With the board!', 'They said dress smart. This is smart.', 'Has anyone seen Martin? He’s doing the food.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            mood: 'smile',
            text: ['Lark! It’s my birthday. Forty-one. Don’t sing.', 'Guess where my party is. Go on. Guess.'],
            options: () => [{ label: 'The pub?', next: 'four' }, { label: 'Four.', next: 'four' }],
          },
          menu: {
            mood: 'smile',
            text: (g) => [called(g) ? 'That’s me on the PA! Floor four! (He straightens his badge: BIRTHDAY BOY.) How do I look?' : 'Forty-one, Theo. Forty-one and they know my name.'],
            options: () => [{ label: 'Why you, though?', next: 'why', once: true }, { label: 'Happy birthday, Leon.', end: true }],
          },
          four: {
            mood: 'smile',
            text: ['Four! On four! Mr Moss came down himself: “Leon, we’ve got something for you on four.” A party. With the board.'],
            options: () => [{ label: 'That’s… a strange place for a party.', next: 'that' }, { label: 'Nice.', next: 'nice' }],
          },
          that: {
            text: [
              'Weird? I know! I know it’s weird. Who throws a party at two in the morning?',
              'But it’s the board, Theo. You don’t get asked up. In nineteen years the board’s never so much as looked at me in a lift.',
              'Forty-one candles. They told me how many. They know how old I am!',
            ],
            options: () => [{ label: 'Happy birthday, Leon.', end: true }],
          },
          nice: { mood: 'smile', text: ['Nice! Nice, he says. It’s the board. They know my name.'], options: () => [{ label: 'Happy birthday, Leon.', end: true }] },
          why: { text: ['(He opens his mouth and shuts it again.) Long service? I’ve been here nineteen years. That’s… that’s long.', 'I didn’t ask. You don’t ask, do you? You say thank you.'], options: () => [{ label: 'Happy birthday, Leon.', end: true }] },
        },
      },
    }),

    // ------------------------------------------------ Felix Arden, the dream studio
    'ds-p0-felix': staff({
      name: 'Felix Arden', role: 'Oneirography · Floor 4', behavior: 'stand', face: 'n', mood: 'tired', leaves: 'p0Called',
      look: { skin: '#e0c0a0', hair: '#8a5a2a', hairStyle: 'curly', shirt: '#6a5a8a', pants: '#2a2838', glasses: true, holding: 'mug', bg: '#2a2438' },
      barks: (n, g) => called(g) ? ['That’ll be me.', 'Five cups. Chamomile.'] : ['Chamomile. Five cups. No sugar.', 'They sleep better after a meeting.', 'Don’t ask me what they dream.', 'I’m not allowed to say.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            mood: 'tired',
            text: [
              '(He’s lining up five cups on a tray.) Oh. Hello. Facilities? The kettle’s fine, I promise.',
              'Chamomile, for the board. They nap after the meeting, and I sit with them, and I write down what they dream.',
              'It’s called oneirography. My mother thinks I’m a dental hygienist.',
            ],
            options: M('ds-p0-felix'),
          },
          menu: { mood: 'tired', text: (g) => [called(g) ? 'That was me on the PA. (He picks up the tray very carefully, so the cups don’t touch.)' : 'Five cups. Always five.'], options: M('ds-p0-felix') },
          dream: {
            text: [
              'I’m not allowed to say.',
              '(He straightens a cup that was already straight.) Big things. Things with a lot of teeth. Dr Brandt takes my notes away in the morning, and a few months later there’s a new project on three.',
              'Coincidence. I’m sure.',
            ],
            options: () => [back(), bye('Sleep well, then.')],
          },
          why: {
            text: [
              'They’ve got something to decide tonight. Something big. Dr Brandt wants all five of them recorded, back to back, straight after the meeting.',
              'When the board has to decide something big, they like to know how they’ll feel about it in their sleep.',
            ],
            options: () => [back(), bye()],
          },
        },
      },
    }),

    // ------------------------------------------------ Hal Okafor, cleaning
    'ds-p0-okafor': staff({
      name: 'Hal Okafor', role: 'Cleaning · nights', behavior: 'pace', face: 'n', mood: 'smile', speed: 26, pause: 3,
      look: { skin: '#7a4a30', hair: '#d8d8d8', hairStyle: 'buzz', shirt: '#5a6a7a', pants: '#2a3038', bg: '#2a3038' },
      barks: (n, g) => called(g) ? ['Nobody calls a mop, chief.', 'Head down, chief.'] : ['Mind the wet, chief.', 'Board’s in. Head down, mop up.', 'Floors don’t mop themselves, chief.', 'Evening, chief. Morning. Whatever it is.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            mood: 'smile',
            text: [
              'Mind the wet, chief. Just done that bit.',
              'Board’s in. You know what my old man used to say? When the bosses come in at night, you keep your head down and your floor clean, and they’ll never learn your name.',
            ],
            options: M('ds-p0-okafor'),
          },
          menu: { mood: 'smile', text: (g) => [called(g) ? 'They called five names, chief. Called them up like a raffle. I’m glad I’m a mop. Nobody calls a mop.' : 'Chief.'], options: M('ds-p0-okafor') },
          board: {
            text: [
              'Five of them. I’ve cleaned every floor of this building except two, chief: four and five. Peg does those.',
              'Twenty years. I’ve never once seen them in daylight. You ever think about that? Never in daylight.',
            ],
            options: () => [back(), bye('I’ll walk round the wet.')],
          },
          peg: {
            text: [
              'Peg Soto’s up on four. They want the Box done again tonight. That’s what they call it: the Box.',
              'She says the chairs in there all face a big window. A window onto what, I said. She didn’t want to say.',
              'She said it smells of champagne and dog.',
            ],
            options: () => [back(), bye()],
          },
          wrong: {
            text: [
              'Wrong? (He leans on the mop.) The CFO came down at one in the morning and signed for a delivery herself. In heels. On my wet floor.',
              'Something’s always a bit wrong, chief. Tonight it’s just a bit more than usual. Keep your head down.',
            ],
            options: () => [back(), bye()],
          },
        },
      },
    }),

    // ------------------------------------------------ Dennis Abara, the loading dock
    'ds-p0-dennis': staff({
      name: 'Dennis Abara', role: 'Receiving · nights', behavior: 'stand', face: 'e', mood: 'neutral',
      look: { skin: '#5a3a28', hair: '#141010', hairStyle: 'short', shirt: '#3a4a2a', pants: '#2a2a22', holding: 'clipboard', bg: '#2a3020' },
      barks: (n, g) => called(g) ? ['He signed himself out on my clipboard.', 'Dock’s closed.'] : ['Dock’s closed. Board’s orders.', 'Four crates. No donor. Signed for by the CFO.', 'Hal, sit down.', 'Sensor’s playing up again.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: { text: ['Lark. Dock’s closed tonight, board’s orders. Nothing in, nothing out.', 'Except what came in at one, which the CFO signed for herself.'], options: M('ds-p0-dennis') },
          menu: { text: (g) => [called(g) ? 'They called Hal. He went. He signed himself out on my clipboard, Theo. Neat as you like.' : 'Lark.'], options: M('ds-p0-dennis') },
          crates: {
            text: [
              'Four units. “Donor material, live.” No supplier. No donor named. It goes straight up to three on the sample lift and nobody signs for it at the other end.',
              'Twelve years on the dock. You get a feel for crates. Some crates are heavy in a way that isn’t weight.',
              '(He doesn’t say anything else for a while.)',
            ],
            options: () => [back(), bye()],
          },
          sensor: { text: ['Dock door sensor. It thinks the dock’s open when it’s shut. The board likes to know when the dock’s open.'], options: () => [back(), bye()] },
          hal: {
            text: [
              'Ostrowski? (He lowers his voice.) His name’s on tonight’s manifest. “Staff transfer, one, to four.” Like he’s a pallet.',
              'He says it’s a promotion. He says you sign what’s on the clipboard.',
            ],
            options: () => [back(), bye()],
          },
        },
      },
    }),

    // ------------------------------------------------ Hal Ostrowski, on the manifest
    'ds-p0-ostrowski': staff({
      name: 'Hal Ostrowski', role: 'Receiving · nights', behavior: 'stand', face: 'w', mood: 'tired', leaves: 'p0Called',
      look: { skin: '#e0c0a0', hair: '#7a7a7a', hairStyle: 'short', shirt: '#3a4a2a', pants: '#2a2a22', holding: 'clipboard', bg: '#2a3020' },
      barks: (n, g) => called(g) ? ['That’s me. Four.', 'You sign what’s on the clipboard.'] : ['You sign what’s on the clipboard.', 'Four. I’m going to four.', 'Staff transfer. That’s a promotion, isn’t it?', 'Never been to four.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            mood: 'tired',
            text: [
              '(He’s reading a clipboard very carefully, as if it might change.) Oh. Lark.',
              'They’ve put me on the manifest. Look.',
              'The last line: STAFF TRANSFER (1) · H. OSTROWSKI · TO F4 · TONIGHT.',
            ],
            options: () => [{ label: 'That’s not a list for people.', next: 'people' }, { label: 'Congratulations?', next: 'congrats' }, bye()],
          },
          menu: { mood: 'tired', text: (g) => [called(g) ? 'That was me. On the PA. (He signs the clipboard, and hands it to nobody.)' : 'Four.'], options: () => [{ label: 'That’s not a list for people.', next: 'people', once: true }, { label: 'Congratulations?', next: 'congrats', once: true }, bye()] },
          people: {
            text: [
              'It’s tonight’s manifest. You sign what’s on the clipboard. Twenty-two years, I’ve signed what’s on the clipboard.',
              'Four a week come in with no name on them. Now there’s one going up with a name on it, and the name’s mine. That’s better, isn’t it? A name’s better.',
            ],
            options: () => [back(), bye()],
          },
          congrats: { mood: 'smile', text: ['Thank you. Thank you. I think it’s a promotion. Nobody said.', 'My wife will be pleased. I’ll tell her it’s a promotion.'], options: () => [back(), bye()] },
        },
      },
    }),

    // ------------------------------------------------ Nadia Ferrante, the night nurse
    'ds-p0-nadia': staff({
      name: 'Nadia Ferrante', role: 'Night nurse · first aid', behavior: 'stand', face: 'w', mood: 'tired', leaves: 'p0Called',
      look: { skin: '#e8c8a8', hair: '#3a2418', hairStyle: 'long', shirt: '#5a8a8a', pants: '#4a7a7a', lanyard: '#e8ecee', bg: '#203030' },
      barks: (n, g) => called(g) ? ['That’s me.', 'If I’m not back by six, tell somebody.'] : ['Paracetamol’s in the drawer.', 'Four. To sit with someone.', 'There aren’t any children in this building.', 'Board’s in. Wash your hands.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            mood: 'tired',
            text: [
              'Theo. You’re not bleeding, are you? Good. I’m on my own tonight, and I’ve just been asked upstairs.',
              'Four. To sit with someone overnight. “A child,” they said. “She’ll want someone kind.”',
            ],
            options: M('ds-p0-nadia'),
          },
          menu: { mood: 'tired', text: (g) => [called(g) ? 'That was my name. (She picks up her bag.) If I’m not back by six, tell somebody.' : 'Theo.'], options: M('ds-p0-nadia') },
          children: {
            text: [
              'No. There aren’t.',
              'I asked who her parents are. They said “the board.” All five of them, I said? And the woman on the phone laughed, and said, “In a manner of speaking.”',
            ],
            options: () => [back(), bye()],
          },
          going: {
            text: [
              'Of course I’m going. Somebody’s frightened up there. It’s my job.',
              '(She checks her watch.) If I’m not back by six, tell somebody. I don’t know who. Tell ARIADNE.',
            ],
            options: () => [back(), bye()],
          },
          light: { text: ['Thank God. It’s been flickering all night, like it’s trying to tell me something in Morse.'], options: () => [back(), bye()] },
        },
      },
    }),

    // ------------------------------------------------ Priya Sethi, analytics
    'ds-p0-priya': staff({
      name: 'Priya Sethi', role: 'Analytics · working late', behavior: 'sit', face: 'n', mood: 'neutral', reach: 20,
      look: { skin: '#9a6040', hair: '#141010', hairStyle: 'long', shirt: '#4a5a7a', pants: '#2a2e3a', glasses: true, bg: '#202838' },
      barks: (n, g) => called(g) ? ['I’m keeping my head down.', 'Headphones on. Nothing playing.'] : ['Four hundred and twelve blanks.', 'Who’s the donor? Nobody’s the donor.', 'Something big. Bigger than us.', 'Board’s in. I’m invisible.'],
      dialog: {
        start: 'hello',
        again: 'menu',
        nodes: {
          hello: {
            text: [
              '(She doesn’t look up from a spreadsheet.) If it’s the printer, I didn’t break it, it was like that.',
              'Sorry. Hi, Theo. I work late because the building’s quiet. Except tonight it isn’t quiet. It’s… waiting.',
            ],
            options: M('ds-p0-priya'),
          },
          menu: { text: (g) => [called(g) ? '(She’s put her headphones on, but nothing’s playing.) They called people up on the PA. I’m keeping my head down.' : 'Theo.'], options: M('ds-p0-priya') },
          sheet: {
            text: [
              'Sample IDs. Everything that came in through Receiving this year.',
              'Every one has a donor: a name, a consent form, a date of birth. Except these. (A column, highlighted in yellow.) DONOR: blank. Four hundred and twelve of them.',
              'Four a week, like clockwork. Nobody donates like clockwork.',
            ],
            options: () => [{ label: 'Who have you told?', next: 'tell', once: true }, back(), bye()],
          },
          tell: {
            text: [
              'ARIADNE. She said she knew. She said, “Thank you, Priya. That is the four hundred and twelfth time someone has helped.”',
              'I don’t know what that means. I’ve decided it’s a nice thing.',
            ],
            options: () => [back(), bye()],
          },
          deciding: {
            text: [
              'Somebody in finance says there’s a buyer. Not for the company: for something we make. Nine governments in a room, bidding.',
              'Nine governments, Theo. What do we make that nine governments want at two in the morning?',
            ],
            options: () => [back(), bye()],
          },
        },
      },
    }),
  };

  // ======================================================== things to use
  const say = (title, text, kicker) => LM.ui.showText(title, text, kicker);
  const metal = (g, x, y, w, hh, c) => {
    const grd = g.createLinearGradient(0, y, 0, y + hh);
    grd.addColorStop(0, U.shade(c, 0.3));
    grd.addColorStop(0.5, c);
    grd.addColorStop(1, U.shade(c, -0.4));
    g.fillStyle = grd;
    g.fillRect(x, y, w, hh);
  };
  const locker = LM.find('items', 'ds-locker');
  const netrack = LM.find('items', 'ds-netrack');
  const strobe = LM.find('items', 'ds-strobe');
  const JOBS = ['p0JobCoffee', 'p0JobCamera', 'p0JobLight', 'p0JobDock'];

  const items = {
    // ------------------------------------------------ your tool bag
    'ds-toolbag': {
      name: 'Tool bag', radius: 10, dressing: false, mapColor: AMBER,
      interact: {
        available: (it, game) => !has(game, 'p0Driver'),
        prompt: () => 'Take your bolt driver from your tool bag',
        use(it, game) {
          const P = game.player;
          if (!P.weapons.includes('ds-bolt-driver')) P.giveWeapon('ds-bolt-driver', game);
          game.setFlag('p0Driver');
          LM.audio.play('key');
          it.remove(game);
          say('Your tool bag', 'Canvas, oil-stained, LARK in marker on the strap. Inside: spanners, a meter, cable ties, a roll of tape, and the bolt driver: a pneumatic fastener gun, yellow, heavy, with its own little air bottle. It drives a steel bolt through a fire door.\n\nBrennan calls it the rivet gun. Kowalski says it isn’t one. You sling the bag over your shoulder.', 'Facilities');
        },
      },
      draw(g) {
        g.fillStyle = '#1a1612';
        G.roundRect(g, -10, -6, 20, 12, 3);
        g.fill();
        g.fillStyle = '#6a5230';
        G.roundRect(g, -9, -5, 18, 10, 3);
        g.fill();
        g.strokeStyle = '#3a2a18';
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, -5, 5, Math.PI, 0);
        g.stroke();
        // the bolt driver's yellow nose out of the top
        g.fillStyle = '#d9a21c';
        g.fillRect(2, -7, 7, 3);
        g.fillStyle = '#8a9198';
        g.fillRect(8.5, -6.5, 2.5, 2);
      },
    },

    // ------------------------------------------------ your locker: the coveralls
    'ds-uniform-locker': Object.assign({}, locker || {}, {
      name: 'Your locker', mapColor: AMBER,
      interact: {
        available: () => true,
        prompt: (it, game) => (has(game, 'p0Uniform') ? 'Look in your locker' : 'Open your locker: your uniform'),
        use(it, game) {
          if (has(game, 'p0Uniform')) return say('Facilities lockers', 'Kowalski’s, Brennan’s, yours. Yours has a spare shirt, a phone charger and the hard hat you never wear. You leave it there. You always leave it there.', 'Facilities');
          game.player.equipArmor('ds-coveralls');
          game.setFlag('p0Uniform');
          LM.audio.play('key');
          say('Facilities coveralls', 'Navy, ASTERION · FACILITIES across the back, a reflective stripe that has been through the wash too many times. LARK on the pocket.\n\nIn the locker too: a spare shirt, a phone charger, and the hard hat you never wear. You leave the hat.', 'Your locker · you put them on');
        },
      },
    }),

    // ------------------------------------------------ Kowalski's test board
    'ds-test-board': {
      name: 'Test board', radius: 12, wallMounted: true, shadow: false, dressing: false, mapColor: AMBER,
      destructible: { hp: 1e9 },
      init(it) {
        it.hits = it.hits || 0;
        it.lastHp = it.hp;
        it.marks = it.marks || [];
      },
      update(it, dt, game) {
        if (it.hp < it.lastHp - 0.01) {
          it.lastHp = it.hp;
          it.hits++;
          it.marks.push([U.rand(-6, 6), U.rand(-7, 7)]);
          if (it.marks.length > 14) it.marks.shift();
          LM.audio.play('wall', { vol: 0.7 });
          if (it.hits === 3 && !has(game, 'p0Board')) game.setFlag('p0Board');
          else if (it.hits < 3) game.toast(it.hits + ' of 3', 'good');
        }
      },
      interact: {
        available: () => true,
        prompt: () => 'Read the test board',
        use: () => say('The test board', 'A square of plywood screwed to the wall, a target painted on it, and a lifetime of bolts in it. Stencilled across the top: “THREE BEFORE IT GOES IN THE BAG. — K.”\n\nAim with the mouse; click to fire.', 'Facilities'),
      },
      draw(g, it) {
        g.rotate(Math.atan2(it.face.y, it.face.x));
        g.fillStyle = '#1a140c';
        g.fillRect(-2, -13, 5, 26);
        g.fillStyle = '#b8955e';
        g.fillRect(-1, -12, 4, 24);
        // the target, end-on: rings
        g.fillStyle = '#e8e0d0';
        g.fillRect(2.4, -9, 1, 18);
        g.fillStyle = '#c0392b';
        g.fillRect(2.4, -6, 1, 12);
        g.fillStyle = '#e8e0d0';
        g.fillRect(2.4, -3, 1, 6);
        g.fillStyle = '#c0392b';
        g.fillRect(2.4, -1, 1, 2);
        g.fillStyle = '#8a9198';
        for (const [, y] of it.marks || []) g.fillRect(3.2, y, 2.2, 1);
      },
    },

    // ------------------------------------------------ a work order's tag on a fault
    'ds-job': {
      name: 'Work order', radius: 8, dressing: false, shadow: false, mapColor: AMBER,
      init(it) {
        it.props.open = true;
      },
      update(it, dt, game) {
        it.props.open = !has(game, it.props.flag);
      },
      interact: {
        available: (it, game) => has(game, 'p0Orders') && !has(game, it.props.flag),
        prompt: (it) => it.props.prompt || 'Fix it',
        use(it, game) {
          game.setFlag(it.props.flag);
          it.props.open = false;
          LM.audio.play('pickup');
          const n = JOBS.filter((f) => has(game, f)).length;
          say(it.props.title || 'Work order', it.props.text || '', (it.props.kicker || 'Work order') + ' · done (' + n + ' of 4)');
          if (n >= 4) game.setFlag('p0OrdersDone');
          else game.toast('Work order done: ' + n + ' of 4', 'good');
        },
      },
      draw(g, it, t, game) {
        if (!it.props.open) return;
        // a laminated yellow tag on a cable tie
        g.strokeStyle = '#d8d8d0';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(0, -7);
        g.lineTo(0, -3);
        g.stroke();
        g.fillStyle = '#1a1a14';
        g.fillRect(-4.4, -3.4, 8.8, 9.8);
        g.fillStyle = AMBER;
        g.fillRect(-4, -3, 8, 9);
        g.fillStyle = '#1a1a14';
        for (let i = 0; i < 3; i++) g.fillRect(-2.6, -1 + i * 2.2, 5.2, 0.8);
      },
      drawGlow(g, it, t, game) {
        if (!it.props.open || !game || !has(game, 'p0Orders')) return;
        G.glow(g, 0, 0, 12, AMBER, 0.25 + 0.15 * Math.sin(t * 4));
      },
    },

    // ------------------------------------------------ Facilities stores: the spare switch
    'ds-spare-shelf': {
      name: 'Facilities stores', solid: 'rect', radius: 14, dressing: false, mapColor: AMBER,
      init(it) {
        const w = it.props.w || 2;
        it.x = it.tx * T + (w * T) / 2;
        it.box = [w * T - 6, 14];
        it.boxOff = [0, -9];
      },
      interact: {
        available: () => true,
        prompt: (it, game) => (has(game, 'p0SwitchDown') && !has(game, 'p0Spare') ? 'Take the spare core switch' : 'Look at the stores shelf'),
        use(it, game) {
          if (has(game, 'p0SwitchDown') && !has(game, 'p0Spare')) {
            game.setFlag('p0Spare');
            LM.audio.play('key');
            return say('The spare core switch', 'A grey box the size of a briefcase, CS-SPARE on the side in Kowalski’s writing. Twenty-four ports, two uplinks, still in its foam.\n\nYou put it under your arm.', 'Facilities stores');
          }
          say('Facilities stores', has(game, 'p0Spare')
            ? 'Fuses, filters, tubes, cable, and the gap where the spare switch was.'
            : 'Fuses, filters, light tubes, a drum of cable, a box of seals for the coffee machine (there is always a box of seals for the coffee machine), and a grey box marked CS-SPARE: the spare core switch for the comms closets.', 'Facilities');
        },
      },
      draw(g, it, t, game) {
        const W = (it.props.w || 2) * T - 6;
        g.fillStyle = '#121416';
        g.fillRect(-W / 2, -16, W, 14);
        metal(g, -W / 2 + 1, -15.5, W - 2, 13, '#4a5058');
        for (let r = 0; r < 2; r++) {
          g.fillStyle = '#2a2e33';
          g.fillRect(-W / 2 + 1, -15.5 + r * 6.5, W - 2, 0.9);
          for (let i = 0; i < 6; i++) {
            const x = -W / 2 + 3 + i * ((W - 6) / 6);
            const c = ['#7a6a4a', '#5a7a8a', '#8a5a3a', '#6a6a6a', '#4a6a4a', '#8a8a5a'][(i + r * 3) % 6];
            g.fillStyle = c;
            g.fillRect(x, -14.5 + r * 6.5, (W - 10) / 6, 4.6);
          }
        }
        // the spare: a grey box, end of the top shelf
        if (!(game && has(game, 'p0Spare'))) {
          g.fillStyle = '#9aa3ad';
          g.fillRect(W / 2 - 9, -14.8, 7, 5);
          g.fillStyle = '#2a2e33';
          g.fillRect(W / 2 - 8, -13, 5, 1);
        }
      },
      drawGlow(g, it, t, game) {
        if (!game || !has(game, 'p0SwitchDown') || has(game, 'p0Spare')) return;
        const W = (it.props.w || 2) * T - 6;
        G.glow(g, W / 2 - 5.5, -12, 12, AMBER, 0.3 + 0.15 * Math.sin(t * 4));
      },
    },

    // ------------------------------------------------ the dead switch in 1-C
    'ds-closet-switch': Object.assign({}, netrack || {}, {
      name: 'Core switch CS-1C', mapColor: '#6a7f8a',
      interact: {
        available: () => true,
        prompt: (it, game) => (has(game, 'p0Spare') && !has(game, 'p0SwitchIn') ? 'Fit the spare core switch' : 'Read the switch’s display'),
        use(it, game) {
          if (has(game, 'p0Spare') && !has(game, 'p0SwitchIn')) {
            game.setFlag('p0SwitchIn');
            LM.audio.play('key');
            game.addShake(0.08);
            return LM.ui.open({ kicker: 'Comms closet 1-C', title: 'Core switch CS-1C', body: LM.ui.h('div', null, DS.screenText('You pull the dead unit, slot the spare into the rack and reseat the cables one by one: twenty-four ports, two uplinks.\n\n02:09  REPLACEMENT UNIT  ONLINE  (tech: T. LARK)\n02:09  PORT 1-24  LINK UP\n02:09  UPLINK 1  EXTERNAL  READY\n\nThe lights come up green, one after another, all the way along.')), actions: [{ label: 'Close', primary: true }] });
          }
          const text = has(game, 'p0SwitchDown')
            ? 'CORE SWITCH CS-1C · ASTERION BIOLOGICS\n\n01:50  PORT 1-24  LINK DOWN  (hardware fault)\n01:50  UPLINK 1  DOWN\n\nEvery light on it is out but one, and that one is red.'
            : 'CORE SWITCH CS-1C · ASTERION BIOLOGICS\n\nPORT 1-24  LINK UP\nUPLINK 1  INTERNAL\nUPLINK 2  (not configured)\n\nIt hums. Its fan sounds tired.';
          LM.ui.open({ kicker: 'Comms closet 1-C', title: 'Core switch CS-1C', body: LM.ui.h('div', null, DS.screenText(text)), actions: [{ label: 'Close', primary: true }] });
        },
      },
      drawGlow(g, it, t, game) {
        const down = game && has(game, 'p0SwitchDown') && !has(game, 'p0SwitchIn');
        if (!down) return netrack && netrack.drawGlow && netrack.drawGlow(g, it, t, game);
        g.rotate(rot(it));
        g.fillStyle = RED;
        g.fillRect(-10, -9.4, 1, 1);
        G.glow(g, -9.5, -9, 6, RED, 0.5 + 0.4 * (Math.sin(t * 5) > 0 ? 1 : 0));
        if (game && has(game, 'p0Spare')) G.glow(g, 0, 0, 22, AMBER, 0.18 + 0.1 * Math.sin(t * 4));
      },
    }),

    // ------------------------------------------------ elevator doors (the cars are held on Five)
    'ds-lift-doors': {
      name: 'Elevator', radius: 8, wallMounted: true, shadow: false, dressing: 'Walls',
      init(it) {
        const w = it.props.w || 2;
        it.x = it.tx * T + (w * T) / 2;
      },
      interact: {
        available: () => true,
        prompt: () => 'Call the car',
        use: (it) => say(it.props.label || 'Elevator', 'You press the call button. The light comes on, and goes off again.\n\nOver the doors the indicator says 5, and under it, in amber: HELD · BOARD IN SESSION.', 'The elevator lobby'),
      },
      draw(g, it) {
        const W = (it.props.w || 2) * T - 8;
        // the frame, flush with the wall's face, and the two brushed-steel leaves meeting in the middle
        g.fillStyle = '#121418';
        g.fillRect(-W / 2 - 3, -11, W + 6, 11);
        metal(g, -W / 2, -10, W / 2 - 0.6, 9.5, '#a8b0b8');
        metal(g, 0.6, -10, W / 2 - 0.6, 9.5, '#a8b0b8');
        g.fillStyle = '#2a2e33';
        g.fillRect(-0.6, -10, 1.2, 9.5);
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.fillRect(-W / 2 + 1, -9.4, 1, 8.5);
        g.fillRect(1.6, -9.4, 1, 8.5);
        // the call button, beside the frame
        g.fillStyle = '#2a2e33';
        g.fillRect(W / 2 + 4, -8, 3, 5);
      },
      drawGlow(g, it, t) {
        const W = (it.props.w || 2) * T - 8;
        // the indicator: HELD, at 5
        G.glow(g, 0, -12, 7, AMBER, 0.5);
        g.fillStyle = AMBER;
        g.fillRect(-2.5, -13.4, 5, 2.4);
        G.glow(g, W / 2 + 5.5, -5.5, 4, AMBER, 0.45 + 0.2 * Math.sin(t * 2));
      },
    },

    // ------------------------------------------------ an emergency strobe, dark until the lockdown
    'ds-strobe-off': Object.assign({}, strobe || {}, {
      light: Object.assign({}, (strobe && strobe.light) || { color: '#ff2a1a', radius: 190, intensity: 0.5 }, { off: true }),
    }),

    // ------------------------------------------------ a note that's only there once props.when is set
    'ds-p0-note': {
      name: 'Note', radius: 6, shadow: false, dressing: false,
      interact: {
        available: (it, game) => !it.props.when || has(game, it.props.when),
        prompt: () => 'Read the note',
        use: (it) => say(it.props.title || 'A note', it.props.text || '', it.props.kicker || 'A note'),
      },
      draw(g, it, t, game) {
        if (it.props.when && !(game && has(game, it.props.when))) return;
        g.rotate(0.2);
        g.fillStyle = '#f2e27a';
        g.fillRect(-4, -4, 8, 8);
        g.fillStyle = 'rgba(40,40,60,0.6)';
        for (let i = 0; i < 3; i++) g.fillRect(-3, -2 + i * 2, 6, 0.6);
      },
    },

    // ------------------------------------------------ parcels on a pallet
    'ds-pallet': {
      name: 'Pallet', radius: 13, solid: 'rect', dressing: 'Furniture',
      init(it) {
        it.box = [26, 26];
      },
      draw(g, it) {
        const r = U.mulberry32((it.tx * 31 + it.ty * 7) >>> 0);
        g.fillStyle = '#5a4428';
        g.fillRect(-13, -13, 26, 26);
        g.fillStyle = '#3a2a18';
        for (let i = 0; i < 4; i++) g.fillRect(-13, -12 + i * 7, 26, 1.2);
        for (let i = 0; i < 4; i++) {
          const x = -11 + (i % 2) * 11 + r() * 2, y = -11 + Math.floor(i / 2) * 11 + r() * 2;
          g.fillStyle = ['#a8875a', '#9a7a50', '#b0905e'][i % 3];
          g.fillRect(x, y, 10, 10);
          g.fillStyle = 'rgba(240,230,200,0.5)';
          g.fillRect(x + 4.4, y, 1.2, 10);
        }
      },
    },
  };

  // ======================================================== effects
  const effects = {
    // { sound, vol, times, gap }
    'ds-sound': {
      params: { sound: 'text', vol: 'number', times: 'number', gap: 'number' },
      run(game, ef) {
        const n = Math.max(1, ef.times || 1), gap = ef.gap || 1;
        for (let i = 0; i < n; i++) game.schedule(i * gap, () => LM.audio.play(ef.sound, { vol: ef.vol == null ? 1 : ef.vol, throttle: 0.01 }));
      },
    },
    // { tag, on }: switch tagged lights, without the core effect's sound
    'ds-lights': {
      params: { tag: 'tag', on: 'bool' },
      run(game, ef) {
        for (const li of game.staticLights) if (li.tag === ef.tag) li.off = !ef.on;
      },
    },
    // { weapons, armor, flags }: what the prologue would have given you
    'ds-give': {
      params: { weapons: 'json', armor: 'json', flags: 'json' },
      run(game, ef) {
        const P = game.player;
        if (!P) return;
        for (const w of ef.weapons || []) if (!P.weapons.includes(w) && LM.find('weapons', w)) P.giveWeapon(w, game);
        for (const a of ef.armor || []) if (LM.find('armor', a)) P.equipArmor(a);
        for (const f of ef.flags || []) game.setFlag(f);
      },
    },
  };

  // ======================================================== sounds
  if (LM.audio && LM.audio.define) {
    const A = LM.audio;
    // a two-tone building alarm, one cycle
    A.define('dsSiren', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 520, f1: 860, dur: 0.68, gain: 0.06, attack: 0.04 });
      kit.tone(t, o, { type: 'square', f0: 522, f1: 864, dur: 0.68, gain: 0.025, attack: 0.04 });
      kit.tone(t + 0.72, o, { type: 'sawtooth', f0: 860, f1: 520, dur: 0.68, gain: 0.06, attack: 0.02 });
      kit.tone(t + 0.72, o, { type: 'square', f0: 864, f1: 522, dur: 0.68, gain: 0.025, attack: 0.02 });
    });
    // a steel shutter coming down: the rattle, the slam, the ring
    A.define('dsShutterSlam', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 1800, q: 1.2, dur: 0.32, gain: 0.08, attack: 0.02 });
      kit.noise(t + 0.3, o, { type: 'lowpass', freq: 700, freqEnd: 80, dur: 0.5, gain: 0.55 });
      kit.tone(t + 0.3, o, { type: 'sine', f0: 78, f1: 38, dur: 0.5, gain: 0.45 });
      kit.tone(t + 0.31, o, { type: 'triangle', f0: 1310, f1: 1270, dur: 0.9, gain: 0.035 });
    });
    // a scream, a long way off (it gets worse closer)
    A.define('dsScream', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 620, f1: 1120, dur: 0.42, gain: 0.05, attack: 0.06 });
      kit.tone(t + 0.42, o, { type: 'sawtooth', f0: 1120, f1: 470, dur: 0.9, gain: 0.05, attack: 0.01 });
      kit.tone(t, o, { type: 'triangle', f0: 1240, f1: 2200, dur: 0.42, gain: 0.02, attack: 0.06 });
      kit.noise(t, o, { type: 'bandpass', freq: 1700, q: 3, dur: 1.25, gain: 0.05, attack: 0.08 });
    });
    // a burst of gunfire, through walls
    A.define('dsGunfire', (t, o, opt, kit) => {
      const n = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const at = t + i * (0.09 + Math.random() * 0.05);
        kit.noise(at, o, { type: 'lowpass', freq: 2400, freqEnd: 300, dur: 0.09, gain: 0.32 });
        kit.tone(at, o, { type: 'square', f0: 150, f1: 48, dur: 0.07, gain: 0.1 });
      }
    });
  }

  LM.definePack({ id: 'ds-story', environments, armor, npcs, items, effects });
})();
