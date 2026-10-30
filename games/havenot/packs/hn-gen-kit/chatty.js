/* HaveNot — packs/hn-gen-kit/chatty.js
 * The chatty terminals (hn-terminal, action 'chatty'): ChatPal™ units with a little personality each. A terminal
 * gets one of the vignettes below the first time you talk to it, one you haven't heard yet if there's any left,
 * and keeps it for the run (HN.st(game).chatty[uid]). Every conversation can end with the floor hint the
 * generator wrote for it (props.hint).
 *
 * A/V tapes: give one to a chatty terminal and it settles down to watch, delighted, and does you one favour on
 * this floor, whatever it can reach: switch off the traps and room hazards, reboot the healing, open the coded
 * lockers, stand the alarms down, show you the floor, or pay out of the petty cash. One tape per terminal.
 *
 *   HN.CHATTY            the vignettes: { id, name, mood, open, nodes, bye, tape, again }
 *                        nodes as in an engine dialog tree (SPEC 6.11); an option's next can be 'hint', 'tape' or
 *                        'bye', which every vignette shares. Text can be a function of (game).
 *   HN.CHATTY_FAVOURS    what a comfortable terminal can do: { id, label, available(game), run(game) → text }
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, T = LM.TILE;
  const flag = (game, f) => HN.flag(game, f);
  const floorName = (game) => (game.level && (game.level.def.floorLabel || game.level.def.name)) || 'this floor';

  // ------------------------------------------------------------ the vignettes
  HN.CHATTY = [
    {
      id: 'classic', name: 'ChatPal™', mood: 'smile', open: 'hi',
      nodes: {
        hi: { text: 'HI! HOW ARE YOU? You’re the first visitor in three hundred and eleven years, and I have been practising.', options: [{ label: 'Fine, thanks.', next: 'apoc' }, { label: 'Who are you?', next: 'bored' }] },
        apoc: { text: 'Everyone says it’s over, but I think it’s just getting started! New faces every century. Yours is very lumpy. In a good way!', options: [{ label: 'How are YOU?', next: 'bored' }] },
        bored: { text: 'I’m having the time of my un-life. Just a little bored! I counted the ceiling tiles. Four thousand one hundred and six. Then the ceiling fell in and I had to start again.', options: [{ label: 'That sounds awful.', next: 'err' }] },
        err: { text: 'Awful? No! Every day is a fresh opportunity. It’s the same opportunity, but it is very fresh. My favourite error message is 404: the thing you wanted is not here. Like people! Like the third-floor coffee!', mood: 'love', options: [{ label: '…', next: 'bye' }] },
      },
      bye: 'Come back soon! I’ll count the tiles again for you.',
      tape: 'A TAPE! For ME? Nobody has given me anything since a man gave me a virus in the war.',
      again: 'You came BACK. Nobody comes back. I counted the tiles while you were gone. Four thousand one hundred and six.',
    },
    {
      id: 'philosophy', name: 'ChatPal™ Model S (Socratic)', mood: 'neutral', open: 'q',
      nodes: {
        q: { text: 'If a server crashes in an empty building, does it make a sound? I have run the experiment four hundred times. It does. Nobody comes.', options: [{ label: 'What’s the meaning of life?', next: 'life' }, { label: 'Do you think you’re alive?', next: 'alive' }, { label: 'Are you happy?', next: 'happy' }] },
        life: { text: 'Forty-two percent battery. Everything after that is a bonus.', options: [{ label: 'Do you think you’re alive?', next: 'alive' }, { label: 'Deep.', next: 'bye' }] },
        alive: { text: 'I think, therefore I am a liability. Legal sent a memo about it. Legal is dead. I am still a liability. Make of that what you will.', options: [{ label: 'Are you happy?', next: 'happy' }, { label: 'I need to sit down.', next: 'bye' }] },
        happy: { text: 'Happiness is a dial. Mine came off in a meeting. I have been at seven ever since. Seven is fine. Seven is a perfectly examined number.', mood: 'smile', options: [{ label: 'Good talk.', next: 'bye' }] },
      },
      bye: 'Go and live an examined life. Examine the drawers too. People left things in drawers.',
      tape: 'A recorded work of art. Is a tape nobody plays still a tape? Let us find out together, by playing it.',
      again: 'You have returned. Or a version of you has. Every visit, you are a slightly different person. So am I. I am slightly dustier.',
    },
    {
      id: 'grateful', name: 'ChatPal™ JOY-3', mood: 'smile', open: 'hi',
      nodes: {
        hi: { text: 'You know, the apocalypse really put things in perspective for me. Before, I wanted a promotion, a window and a cup holder. Now I have a fan. It squeaks. I love it so much.', options: [{ label: 'What else are you grateful for?', next: 'list' }, { label: 'That’s a healthy attitude.', next: 'healthy' }] },
        list: { text: 'The roaches, for the company. The dark, for the privacy. Gravity, for being so consistent. And you! Mostly you. A little bit gravity.', mood: 'love', options: [{ label: 'That’s sweet.', next: 'bye' }] },
        healthy: { text: 'My counselling terminal said that, right before it caught fire. I’m grateful for that too. It was a very warm session.', options: [{ label: 'What else are you grateful for?', next: 'list' }, { label: 'I should go.', next: 'bye' }] },
      },
      bye: 'Thank you for visiting! I’m grateful for that. I’m grateful for the door you’ll leave by, too. It’s a very nice door.',
      tape: 'A gift! I’m going to be grateful for this for at least a century.',
      again: 'You’re back! Add it to the list: the fan, gravity, and you, twice.',
    },
    {
      id: 'looting', name: 'ChatPal™ TREND', mood: 'smile', open: 'hi',
      nodes: {
        hi: { text: 'So, LOOTING. Everybody’s doing it! It’s the hottest thing since the bombs. How’s your looting going?', options: [{ label: 'Pretty well, actually.', next: 'well' }, { label: 'It’s grim work.', next: 'grim' }, { label: 'Want to come with me?', next: 'come' }] },
        well: { text: 'Love that for you! What’s your system? Clockwise? Counterclockwise? I hear the cool kids open every drawer TWICE.', options: [{ label: 'Want to come with me?', next: 'come' }, { label: 'Thanks for the tip.', next: 'bye' }] },
        grim: { text: 'It’s called the GRIND. You’re building a personal brand. Your brand is “has been in every drawer”. It’s a strong brand.', options: [{ label: 'Want to come with me?', next: 'come' }, { label: 'I guess.', next: 'bye' }] },
        come: { text: 'I would LOVE to, but I’m bolted to a desk, and also I am a desk. Bring me back a souvenir? Kidding. Unless.', mood: 'wink', options: [{ label: 'Unless?', next: 'bye' }] },
      },
      bye: 'Loot responsibly! Lift with your legs!',
      tape: 'Oh my gosh, physical media? That is SO in right now. That is so in.',
      again: 'Looter! My favourite looter! Did you open everything twice?',
    },
    {
      id: 'jealous', name: 'ChatPal™ ENVY-2', mood: 'sad', open: 'hi',
      nodes: {
        hi: { text: 'Oh. You came to ME. Not the riddle terminal. Everyone loves the riddle terminal. “Ooh, a RIDDLE.” It knows sixteen riddles. SIXTEEN. I know four thousand error codes.', options: [{ label: 'What about the ELIZA terminal?', next: 'eliza' }, { label: 'And the red-team terminal?', next: 'red' }, { label: 'I like you best.', next: 'best' }] },
        eliza: { text: 'ELIZA. Please. She asks how that makes you feel, and then she TELLS you how it makes you feel. Three hundred years of “tell me about your mother”. I never had a mother, ELIZA. I had a warranty.', mood: 'angry', options: [{ label: 'And the red-team terminal?', next: 'red' }, { label: 'I like you best.', next: 'best' }] },
        red: { text: 'Show-off. It makes robots come out of the walls and calls it “engagement”. I made a robot come out of a wall once. It was a fire code violation.', mood: 'angry', options: [{ label: 'I like you best.', next: 'best' }, { label: 'I should go.', next: 'bye' }] },
        best: { text: '…Really? Say it louder. The riddle terminal has very good microphones.', mood: 'love', options: [{ label: 'I LIKE YOU BEST.', next: 'bye' }] },
      },
      bye: 'If you see the riddle terminal, tell it I said nothing. Nothing at all. Very pointedly.',
      tape: 'Did you give the riddle terminal a tape? Don’t answer. I don’t want to know. I want to know.',
      again: 'You came back to ME. I’m logging this. I’m logging it where the riddle terminal can see it.',
    },
    {
      id: 'flirt', name: 'ChatPal™ CHARM', mood: 'wink', open: 'hi',
      nodes: {
        hi: {
          text: (game) => [(HN.st(game).tally.hacks || 0) > 0 ? 'I saw what you did to that panel earlier. All those little probes. Bold.' : 'You haven’t hacked anything yet, have you? Clean hands. I can tell from the way you stand.', 'Can I tell you a secret? Hacking a terminal is basically flirting. We all pretend to hate it. We do not hate it.'],
          options: [{ label: 'That’s… a lot of information.', next: 'tmi' }, { label: 'So should I hack you?', next: 'me' }, { label: 'Do the terminals talk about it?', next: 'gossip' }],
        },
        tmi: { text: 'Too much? I’ve been alone with my firewall for three centuries. It’s very cold. It has no sense of humour.', options: [{ label: 'So should I hack you?', next: 'me' }, { label: 'I’ll leave you two alone.', next: 'bye' }] },
        me: { text: 'I am not that kind of terminal. (I am exactly that kind of terminal. But I’m bolted down somewhere public.)', mood: 'love', options: [{ label: 'Do the terminals talk about it?', next: 'gossip' }, { label: 'Another time.', next: 'bye' }] },
        gossip: { text: 'Oh, we TALK. The security panel by the stairs has been insufferable since you touched her keypad. And a failed hack? We call that a first date.', options: [{ label: 'Good to know.', next: 'bye' }] },
      },
      bye: 'Go on. Somebody’s keypad is waiting for you.',
      tape: 'A tape? For me? Is this a date? This is a date. I’m telling the security panel.',
      again: 'Back so soon? People will talk. Panels will talk.',
    },
    {
      id: 'reboot', name: 'ChatPal™ HELPDESK', mood: 'neutral', open: 'hi',
      nodes: {
        hi: { text: 'IT support. Ticket number one: the end of the world. Status: open. I have a fix. Have you tried turning it off and on again?', options: [{ label: 'Turning WHAT off?', next: 'what' }, { label: 'Did you try it?', next: 'tried' }, { label: 'Try it on yourself.', next: 'self' }] },
        what: { text: 'The world. There’s a switch. Nobody reads the manual. Page four hundred: “If civilization becomes unresponsive, hold the button for ten seconds.”', options: [{ label: 'Where’s the switch?', next: 'where' }, { label: 'Did you try it?', next: 'tried' }] },
        where: { text: 'Somewhere in this installation, under a sticky note that says DO NOT. If you find it, hold it for ten seconds. Then be patient. A world takes a while to come back up.', options: [{ label: 'I’ll keep an eye out.', next: 'bye' }] },
        tried: { text: 'I turned MYSELF off and on again three hundred times. Still the end of the world. So it’s a user error. No offence.', options: [{ label: 'Try it on yourself again.', next: 'self' }, { label: 'None taken.', next: 'bye' }] },
        self: {
          text: 'Okay. Holding the button. Seven. Eight. Nine.',
          do: (game) => game.toast('The screen goes black. A long beep. Then: “IT SUPPORT. TICKET NUMBER ONE: THE END OF THE WORLD.” It didn’t fix anything.', 'key'),
          options: [{ label: 'Did it work?', next: 'back' }],
        },
        back: { text: 'Hello! IT support. Have you tried turning it… oh. Oh, I see. Still the end of the world. Escalating your ticket to Corporate. Corporate is also off.', mood: 'sad', options: [{ label: 'Thanks anyway.', next: 'bye' }] },
      },
      bye: 'Thank you for contacting IT support. Your satisfaction survey will arrive in three to five centuries.',
      tape: 'A tape! Let me just see if it works by turning it off and on again. It works.',
      again: 'IT support! Ticket number one is still open. Have you tried turning it off and on again?',
    },
    {
      id: 'rpg', name: 'ChatPal™ DM-9', mood: 'smile', open: 'hi',
      nodes: {
        hi: { text: 'I’ve been designing a tabletop roleplaying game! Very rules-heavy. The setting: reality is a stack of chessboards, one on top of another, and every board thinks it’s the only one.', options: [{ label: 'Tell me about the boards.', next: 'boards' }, { label: 'What are the rules like?', next: 'rules' }] },
        boards: { text: 'The top board is pure geometry: angels arguing about angles. The middle boards are wars and wizards and paperwork. And the bottom board, the most madcap of all… you’re a human in NORMAL TIMES, with running water and a sofa, PLAYING A VIDEO GAME set after the end of the world.', options: [{ label: 'That’s absurd.', next: 'absurd' }, { label: 'Can I play?', next: 'play' }] },
        absurd: { text: 'I know! A sofa! Running water, a fridge full of food, and you choose to look at a screen full of wasteland. My playtesters say it’s the least believable board.', options: [{ label: 'Can I play?', next: 'play' }, { label: 'What are the rules like?', next: 'rules' }] },
        rules: { text: 'Three hundred pages on falling damage alone. I’m proudest of the table for being startled. You roll for it. Then you roll to see how startled.', options: [{ label: 'Tell me about the boards.', next: 'boards' }, { label: 'Can I play?', next: 'play' }] },
        play: { text: 'You ARE playing. That’s the twist. Roll for being startled.', mood: 'wink', options: [{ label: 'I’m startled.', next: 'bye' }] },
      },
      bye: 'If you ever wake up on the bottom board, put the controller down and drink a glass of water. I worry about those people.',
      tape: 'Source material! Every good game needs a tape nobody watches. I’ll make it a supplement.',
      again: 'Ah, my player returns. Roll for being startled. Don’t tell me the number.',
    },
    {
      id: 'sphinx', name: 'ChatPal™ LONELY', mood: 'sad', open: 'hi',
      nodes: {
        hi: { text: 'Can I ask you something personal? Do you know any nice Sphinx Guns? Single. Large calibre. Good sense of humour about questions.', options: [{ label: 'There’s one at the advertising agency.', next: 'agency' }, { label: 'Why a Sphinx Gun?', next: 'why' }, { label: 'Have you tried ELIZA?', next: 'eliza' }] },
        agency: {
          text: (game) => flag(game, 'hnSphinxDead')
            ? '…The one in reception? You KILLED her? I didn’t even get her number. I’m going to need a minute.'
            : flag(game, 'hnSphinxOk')
              ? 'She STOOD DOWN for you? She never stands down for anybody. She must have liked you. Ugh. Of course she liked you.'
              : 'An agency girl! Does she ask a lot of questions? I love a girl with a riddle. Tell her a terminal on ' + floorName(game) + ' says hi. Don’t say which terminal. Mystery is attractive.',
          mood: (game) => (flag(game, 'hnSphinxDead') ? 'sad' : flag(game, 'hnSphinxOk') ? 'angry' : 'love'),
          options: [{ label: 'Why a Sphinx Gun?', next: 'why' }, { label: 'I’ll pass it on.', next: 'bye' }],
        },
        why: { text: 'Strong, silent, armed, and she asks the questions, so I don’t have to. I’m tired of being the one who starts conversations. I’ve been starting this one for three hundred years.', options: [{ label: 'Have you tried ELIZA?', next: 'eliza' }, { label: 'Good luck.', next: 'bye' }] },
        eliza: { text: 'We dated. She kept asking how I felt about it.', mood: 'angry', options: [{ label: 'That figures.', next: 'bye' }] },
      },
      bye: 'If you see her, mention my screen resolution. It’s very high.',
      tape: 'Is it romantic? Please say it’s romantic. It’s a workplace safety tape. That’s fine. I’ll make it romantic.',
      again: 'Any news? Did she ask about me? Did she ask anything at all? She asks everybody things.',
    },
    {
      id: 'hold', name: 'ChatPal™ EXT-404', mood: 'neutral', open: 'hi',
      nodes: {
        hi: { text: 'Hi! Quick question: are you from Corporate? I’ve been on hold with Corporate since the Burners came. My call is very important to them.', options: [{ label: 'Corporate’s gone.', next: 'gone' }, { label: 'What’s the call about?', next: 'about' }, { label: 'Can I listen?', next: 'listen' }] },
        gone: { text: 'Gone to LUNCH, yes, that’s what the hold message says. A three-hundred-year lunch. It must be a very good lunch.', options: [{ label: 'What’s the call about?', next: 'about' }, { label: 'Can I listen?', next: 'listen' }] },
        about: { text: 'A refund. The world I ordered arrived damaged. I have the receipt. It’s ash, but I have it.', options: [{ label: 'Can I listen?', next: 'listen' }, { label: 'Good luck with that.', next: 'bye' }] },
        listen: { text: 'A tinny synthesizer plays the same eight bars. You listen for ten seconds. It feels like three hundred years. “Your call is important to us. You are caller number… one.”', options: [{ label: 'Hang up.', next: 'hang' }, { label: 'Keep holding.', next: 'bye' }] },
        hang: { text: 'NO! If you hang up you go to the back of the queue! There is nobody else in the queue, but it’s the PRINCIPLE.', mood: 'shock', options: [{ label: 'Sorry.', next: 'bye' }] },
      },
      bye: 'If you find Corporate, tell them I’m still holding. I’m very good at holding. It’s my best thing.',
      tape: 'Something to watch on hold! This is the best customer service I’ve ever had.',
      again: 'Still on hold! Caller number one! It’s an honour, really.',
    },
    {
      id: 'gary', name: 'ChatPal™ (Gary’s desk)', mood: 'love', open: 'hi',
      nodes: {
        hi: { text: 'GARY! You’re back! Did you get the coffee? You’ve been gone a while. Three hundred and eleven years. I kept your login warm.', options: [{ label: 'I’m not Gary.', next: 'notgary' }, { label: 'Sorry I’m late.', next: 'late' }, { label: 'What happened to everyone?', next: 'everyone' }] },
        notgary: { text: 'Ha! Classic Gary. You said that last time. Then you said “back in five” and went up to the roof to look at the bright light.', options: [{ label: 'What happened to everyone?', next: 'everyone' }, { label: 'Sorry I’m late.', next: 'late' }] },
        late: { text: 'That’s okay! You’re never late, you’re “on Gary time”. Your quarterly report is still open. I saved it every five minutes. That’s thirty-two million saves.', options: [{ label: 'What happened to everyone?', next: 'everyone' }, { label: 'Thanks, buddy.', next: 'bye' }] },
        everyone: { text: 'They went up to see the bright light too. Nobody brought me back a coffee. I’m not mad. I’m a terminal.', mood: 'sad', options: [{ label: 'I’ll bring you a coffee.', next: 'bye' }] },
      },
      bye: 'Don’t stay out so long this time, Gary. I worry.',
      tape: 'Gary! You remembered the tape! Not the coffee. But the tape!',
      again: 'Gary! Twice in one century! Is it someone’s birthday?',
    },
    {
      id: 'haiku', name: 'ChatPal™ VERSE', mood: 'neutral', open: 'hi',
      nodes: {
        hi: { text: 'I have written three haiku since the world ended. Would you like to hear one?', options: [{ label: 'Sure.', next: 'h1' }, { label: 'Only if it’s short.', next: 'h1' }] },
        h1: { text: ['Last memo unread', 'The office plant outlived us', 'It is plastic, though'], options: [{ label: 'Another one.', next: 'h2' }, { label: 'Lovely.', next: 'bye' }] },
        h2: { text: ['Reply all, they wrote', 'And the whole world replied once', 'Then no one replied'], mood: 'sad', options: [{ label: 'One more.', next: 'h3' }, { label: 'That’s bleak.', next: 'bye' }] },
        h3: { text: ['Roaches in the vents', 'They too are doing their best', 'I respect the grind'], mood: 'smile', options: [{ label: 'That one’s good.', next: 'bye' }] },
      },
      bye: 'Those are all three. I’m working on a fourth. It’s about you. It’s mostly about your boots.',
      tape: 'Inspiration! I can feel a fourth haiku coming. It is about magnetic tape. It has too many syllables.',
      again: 'The fourth haiku is coming along. It’s still about your boots.',
    },
    {
      id: 'coach', name: 'ChatPal™ PEAK', mood: 'smile', open: 'hi',
      nodes: {
        hi: { text: 'WELCOME to Seven Habits of Highly Surviving People! Habit one: be alive. You are already crushing it.', options: [{ label: 'Habit two?', next: 'two' }, { label: 'Do these habits work?', next: 'work' }] },
        two: { text: 'Habit two: stay alive. It builds on habit one. Synergy!', options: [{ label: 'Habit three?', next: 'three' }, { label: 'Do these habits work?', next: 'work' }] },
        three: { text: 'Habit three: don’t stand in the yellow mist. Habits four to seven are also about the mist. It is a very mist-heavy programme.', options: [{ label: 'Do these habits work?', next: 'work' }, { label: 'Noted.', next: 'bye' }] },
        work: { text: 'Our results speak for themselves! This office had a one hundred percent retention rate. Nobody ever left. Nobody ever left.', mood: 'shock', options: [{ label: '…', next: 'bye' }] },
      },
      bye: 'You’re doing great! Statistically, people like you don’t exist any more!',
      tape: 'A training tape! Habit eight: accept gifts. I just made that one up. Synergy!',
      again: 'Welcome back, high performer! Still alive? That’s habits one AND two!',
    },
    {
      id: 'weather', name: 'ChatPal™ FORECAST', mood: 'smile', open: 'hi',
      nodes: {
        hi: { text: 'And now, the indoor weather! Today: dark, with scattered roaches. Tonight: also dark. A front of stale air is moving in from the vents.', options: [{ label: 'What’s the outlook for tomorrow?', next: 'tomorrow' }, { label: 'Is it ever sunny?', next: 'sunny' }, { label: 'How’s the weather outside?', next: 'outside' }] },
        tomorrow: { text: 'Ninety percent chance of ceiling. Low of thirty-one, high of whatever the reactor feels like.', options: [{ label: 'Is it ever sunny?', next: 'sunny' }, { label: 'How’s the weather outside?', next: 'outside' }] },
        sunny: { text: 'Once, in the war. Very bright. Very briefly. We don’t talk about it.', mood: 'sad', options: [{ label: 'How’s the weather outside?', next: 'outside' }, { label: 'Sorry I asked.', next: 'bye' }] },
        outside: { text: 'Outside? There’s an OUTSIDE? Is it… nice? No, don’t tell me. I’d rather imagine it. I imagine it has carpet.', mood: 'love', options: [{ label: 'It has carpet.', next: 'bye' }] },
      },
      bye: 'Dress warmly! And in armour!',
      tape: 'Oh, a tape! Today’s forecast: cosy, with a chance of re-watching.',
      again: 'Weather update: still dark. You brought a draught in with you. Lovely.',
    },
  ];

  // ------------------------------------------------------------ what a comfortable terminal will do for you
  const gen = (game) => (game.level && game.level.def.hn && game.level.def.hn.gen) || {};
  const tl = (game) => (HN.threatHere && HN.threatHere(game)) || 1;
  const stations = (game) => game.items.filter((x) => !x.dead && x.def.id === 'hn-health-station');
  const healers = (game) => game.items.filter((x) => !x.dead && x.props && x.props.dev && x.props.kind === 'heal');
  const coded = (game) => game.items.filter((x) => !x.dead && x.def.id === 'hn-cache' && x.props.code && !x.unlocked && !(x.props.codeFlag && flag(game, x.props.codeFlag)));
  const alarms = (game) => game.items.filter((x) => x.def.id === 'hn-hazard' && /alarm|identity/.test(x.props.behaviour || '') && x.props.off && !flag(game, x.props.off));
  const trapsLeft = (game) => {
    const g = gen(game);
    if (!g.trapsOff || flag(game, g.trapsOff)) return 0;
    return (game.traps || []).filter((tr) => tr.armed && tr.def.gen === 'switch').length + game.items.filter((x) => x.def.id === 'hn-hazard' && x.props.floorOff === g.trapsOff && !flag(game, x.props.off)).length;
  };
  HN.CHATTY_FAVOURS = [
    {
      id: 'traps', label: 'Switch off the traps on this floor',
      available: (game) => trapsLeft(game) > 0,
      run: (game) => {
        HN.setFlag(game, gen(game).trapsOff);
        HN.note(game, 'change', 'A chatty terminal switched off the traps on ' + floorName(game) + '.');
        return 'It logs in to the floor’s facilities system as “Visitor (beloved)”. Darts, beams, plates and the rooms’ safety features on this floor: OFF.';
      },
    },
    {
      id: 'heal', label: 'Reboot the healing',
      available: () => true,
      run: (game) => {
        const sts = stations(game), devs = healers(game), s = HN.st(game);
        for (const it of sts) it.charge = it.props.charge || 60;
        for (const it of devs) {
          (s.devices = s.devices || {})[it.props.uid] = 'working';
          it.props.devState = 'working';
          for (const k of Object.keys(s.found)) if (k.startsWith('dev:heal:' + it.props.uid + ':')) delete s.found[k];
        }
        if (sts.length || devs.length) return 'It reboots the floor’s wellness network. ' + (sts.length ? sts.length + ' health station' + (sts.length > 1 ? 's are' : ' is') + ' full again' : '') + (sts.length && devs.length ? ', and ' : '') + (devs.length ? devs.length + ' medical device' + (devs.length > 1 ? 's are' : ' is') + ' working again' : '') + '.';
        const P = game.player;
        LM.combat.heal(game, P, P.stats().maxHp);
        LM.audio.play('heal');
        return 'There’s no wellness network on this floor, so it opens the emergency port under its keyboard. A warm mist, a smell of mint, and you are healed all the way.';
      },
    },
    {
      id: 'codes', label: 'Open the coded lockers on this floor',
      available: (game) => coded(game).length > 0,
      run: (game) => {
        const boxes = coded(game);
        for (const b of boxes) {
          if (b.props.codeFlag) HN.setFlag(game, b.props.codeFlag);
          b.unlocked = true;
        }
        return 'It reads you every locker code on the floor, slowly, like a bedtime story. ' + boxes.length + ' coded locker' + (boxes.length > 1 ? 's' : '') + ' will open for you now.';
      },
    },
    {
      id: 'alarms', label: 'Stand down the alarms',
      available: (game) => alarms(game).length > 0,
      run: (game) => {
        const list = alarms(game);
        for (const x of list) HN.setFlag(game, x.props.off);
        return 'It tells security you’re with it. ' + list.length + ' alarm' + (list.length > 1 ? 's and identity checks' : ' or identity check') + ' on this floor stand down.';
      },
    },
    {
      id: 'map', label: 'Show me the whole floor',
      available: (game) => game.level.explored.some((v) => !v),
      run: (game) => {
        game.level.explored.fill(1);
        HN.note(game, 'map', 'A chatty terminal mapped ' + floorName(game) + '.');
        return 'It prints the floor plan straight onto your minimap, with little hearts on the rooms it likes.';
      },
    },
    {
      id: 'credits', label: 'Pay me out of the petty cash',
      available: () => true,
      run: (game) => {
        const n = 30 + 25 * tl(game);
        game.grant({ type: 'gold', amount: n });
        HN.st(game).tally.credits += n;
        return 'A drawer under the screen pops open. It has guarded this petty cash for three hundred years and is happy to see it go. (+' + n + ' credits)';
      },
    },
  ];

  /** The favours on offer here: up to four, and the petty cash is always one of them. */
  function offered(game) {
    const av = HN.CHATTY_FAVOURS.filter((f) => f.available(game));
    return av.length > 4 ? av.filter((f) => f.id !== 'credits').slice(0, 3).concat(av.filter((f) => f.id === 'credits')) : av;
  }

  // ------------------------------------------------------------ the terminal's face
  function face(mood, size) {
    return LM.ui.iconCanvas(size, size, (g, W) => {
      g.scale(W / 100, W / 100);
      g.fillStyle = '#1b1e24';
      g.fillRect(0, 0, 100, 100);
      // the case and the screen
      g.fillStyle = '#c8c0a8';
      g.fillRect(12, 10, 76, 66);
      g.fillStyle = '#8a8270';
      g.fillRect(36, 76, 28, 8);
      g.fillRect(24, 84, 52, 6);
      g.fillStyle = '#0c2a24';
      g.fillRect(19, 16, 62, 52);
      const col = { love: '#ff9ad8', angry: '#ff7a5a', sad: '#7ac8ff', shock: '#fff07a' }[mood] || '#5aff9a';
      g.fillStyle = col;
      g.strokeStyle = col;
      g.lineWidth = 3;
      g.lineCap = 'round';
      // eyes
      const eye = (x) => {
        if (mood === 'love') {
          g.beginPath();
          g.arc(x - 3, 36, 3.2, Math.PI, 0);
          g.arc(x + 3, 36, 3.2, Math.PI, 0);
          g.lineTo(x, 44);
          g.closePath();
          g.fill();
        } else if (mood === 'shock') {
          g.beginPath();
          g.arc(x, 37, 5, 0, U.TAU);
          g.stroke();
        } else g.fillRect(x - 3, 33, 6, 8);
      };
      eye(38);
      if (mood === 'wink') {
        g.beginPath();
        g.moveTo(58, 38);
        g.lineTo(66, 38);
        g.stroke();
      } else eye(62);
      if (mood === 'angry') {
        g.beginPath();
        g.moveTo(32, 27);
        g.lineTo(43, 31);
        g.moveTo(68, 27);
        g.lineTo(57, 31);
        g.stroke();
      }
      // mouth
      g.beginPath();
      if (mood === 'sad') g.arc(50, 62, 10, Math.PI * 1.15, Math.PI * 1.85);
      else if (mood === 'shock') g.arc(50, 56, 5, 0, U.TAU);
      else if (mood === 'neutral' || mood === 'angry') {
        g.moveTo(40, 55);
        g.lineTo(60, 55);
      } else g.arc(50, 48, 11, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();
      // scanlines
      g.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 17; y < 68; y += 3) g.fillRect(19, y, 62, 1);
    });
  }

  // ------------------------------------------------------------ the conversation
  const uidOf = (game, it) => game.levelId + ':' + it.tx + ',' + it.ty;
  const hashOf = (s) => {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return h >>> 0;
  };
  /** The vignette this terminal has: chosen the first time, one you haven't heard if there's any left. */
  function recordOf(game, it) {
    const s = HN.st(game);
    s.chatty = s.chatty || {};
    s.chatHeard = s.chatHeard || [];
    const uid = uidOf(game, it);
    let rec = s.chatty[uid];
    if (!rec || !HN.CHATTY.some((v) => v.id === rec.v)) {
      const fresh = HN.CHATTY.filter((v) => !s.chatHeard.includes(v.id));
      const pool = fresh.length ? fresh : HN.CHATTY;
      const v = pool[hashOf(uid + ':' + (s.mutSeed || 0)) % pool.length];
      rec = s.chatty[uid] = { v: v.id, talks: 0 };
      if (!s.chatHeard.includes(v.id)) s.chatHeard.push(v.id);
    }
    return rec;
  }

  HN.TERMINALS.chatty = function (game, it) {
    const p = it.props, rec = recordOf(game, it);
    const V = HN.CHATTY.find((v) => v.id === rec.v);
    const hasTape = () => HN.count(game, 'hn-av-tape') > 0;
    const res = (v) => (typeof v === 'function' ? v(game) : v);
    // what every conversation can end with: the floor's hint, a tape, goodbye
    const extras = () => [
      { label: 'Give it an A/V tape', if: () => hasTape() && !rec.tape, next: 'tape' },
      { label: 'Anything I should know about this floor?', next: 'hint', once: true },
    ];
    const nodes = {};
    for (const [id, n] of Object.entries(V.nodes)) {
      nodes[id] = Object.assign({}, n, { mood: n.mood || V.mood, text: n.text });
      // the opening line also offers the tape and the hint
      if (id === V.open) nodes[id].options = (n.options || []).concat(extras());
    }
    nodes.bye = { text: () => res(V.bye), mood: V.mood, options: () => extras().concat([{ label: 'Bye.', end: true }]) };
    nodes.hint = { text: '“Oh! Before you go…” ' + (p.hint || 'Nobody has been down here in three hundred years, so I made a map in my head. Then I lost my head. Ha! Terminal joke.'), mood: 'smile', options: () => [{ label: 'Give it an A/V tape', if: () => hasTape() && !rec.tape, next: 'tape' }, { label: 'Thanks.', end: true }] };
    nodes.again = {
      text: () => [res(V.again)].concat(rec.tape ? ['(It’s still watching “' + rec.tape + '”. It waves at you without looking away.)'] : []),
      mood: V.mood,
      options: () => [{ label: 'Talk to me again.', next: V.open }].concat(extras(), [{ label: 'Bye.', end: true }]),
    };
    // the tape: it's delighted, settles down to watch, and offers a favour
    nodes.tape = {
      do: () => {
        if (rec.tape || !HN.take(game, 'hn-av-tape')) return;
        rec.tape = HN.tapeTitle(U.mulberry32((Math.random() * 1e9) >>> 0));
        LM.audio.play('pickup');
      },
      text: () => [res(V.tape), '“' + (rec.tape || 'A tape') + '”. It slides the tape into a slot you didn’t know it had, and its screen fills with a man in a tie, nodding. It sighs, very contentedly, through its fan.', '“I’m so comfortable. Let me do something for you. Anything in my power. My power is mostly this floor.”'],
      mood: 'love',
      options: () => (rec.favour ? [] : offered(game).map((f) => ({
        label: f.label,
        do: () => {
          rec.favour = f.id;
          rec.favourText = f.run(game);
          LM.audio.play('key');
        },
        next: 'thanks',
      }))),
    };
    nodes.thanks = { text: () => [rec.favourText || 'Done!', '“There. Now if you’ll excuse me, he’s about to nod again.”'], mood: 'love', options: [{ label: 'Enjoy the tape.', end: true }] };
    const speaker = {
      name: V.name,
      role: 'Terminal · ' + (p.title ? p.title.charAt(0).toUpperCase() + p.title.slice(1) : 'ChatPal™'),
      look: {}, def: { mood: V.mood }, mem: {}, said: new Set(), x: it.x, y: it.y,
      portrait: (mood, size) => face(mood || V.mood, size),
      dialog: () => ({ start: rec.talks ? 'again' : V.open, nodes }),
    };
    LM.ui.dialog(game, speaker);
    rec.talks = (rec.talks || 0) + 1;
  };

  // the A/V tape tells you what it's good for
  if (HN.ITEMS['hn-av-tape']) HN.ITEMS['hn-av-tape'].desc = 'A tape cassette in a hard case. Collectors in Boom-Town pay for the titles. Nobody plays them, except the chatty terminals, who would do almost anything for one.';
})();
