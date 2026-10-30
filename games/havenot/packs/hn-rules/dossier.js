/* HaveNot — packs/hn-rules/dossier.js
 * The dossier: every kind of monster you have come up against, kept with the run (HN.st(game).seen), with its
 * picture, name, Threat (coloured against your level, as on the map) and what's known about it. The descriptions
 * follow the bestiary of Vol 3 (paraphrased; page numbers by each), and for Asterion's robots out of Dead Signal,
 * and this game's own monsters, they are written here. It is the satchel's fourth tab (B opens it straight away).
 *
 * In a fight, a card at the top of the screen (down the left, under the health panel, clear of the boss bar and
 * the toasts) for each kind of monster that has noticed you and is close: its name, Threat and one line about it,
 * fading once the fight is over. A kind you meet is in the
 * dossier from then on; the ones you haven't met show as ???.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const HN = (LM.HN = LM.HN || {});
  const h = (...a) => LM.ui.h(...a);

  // threat: where a monster has no hnThreat of its own. line: the card's one line. desc: the dossier's.
  const D = {
    // ---- the bestiary (Vol 3)
    'hn-roach': { threat: 1, line: 'Drops from the ceiling. Would rather eat than fight.', desc: 'A bio-weapon cockroach the size of a cat, with thick armour on its back and a taste for a scrap; people once kept them as fighting animals. They nest in abandoned homes and wait on the ceiling to drop on trespassers, but given a choice between a fight and a meal they take the meal: throw them something sweet. (Vol 3 p. 63)' },
    'hn-knife': { threat: 1, line: 'A flying ball of hate with two blades and a dirty mouth.', desc: 'Small flying robots that fight with a pair of blades and nothing cleverer, and flash an endless stream of obscene insults on their display panels while they do it. Fragile: a good hit or a blast takes them apart. (Vol 3 p. 69)' },
    'hn-defender': { threat: 1, line: 'A guard dog for a desk. It came in a box.', desc: 'Sold in rectangular boxes to Age of War office workers who were apparently at war with each other: once set loose on a desk, it guards it against everyone but its owner. It looks a little like something that belongs on a desk. Nobody is fooled. (Vol 3 p. 184)' },
    'hn-glorexx': { threat: 1, line: 'Vented out of a tube. Leaps, claws, and stings like a taser.', desc: 'An insect horror with an exoskeleton, a spring-loaded tail and needle legs, kept in tubes so it can be “vented” onto explorers in ones and twos. It leaps in with dagger claws and an electric sting from its cyborg mouth. Watch the tubes. (Vol 3 p. 65)' },
    'hn-maintbot': { threat: 1, line: 'A repair robot taught that fixing and breaking are the same job.', desc: 'Installations in their last security panic turned their maintenance units into weapons, on the grounds that anything that can build or repair can destroy even better; some were given personalities that hate people. Try talking to it, by all means, while you shoot. Workplace safety signs still make it stop and think. (Vol 3 p. 66)' },
    'hn-monoid': { threat: 1, line: 'Lazy, contemptuous, and only fights when the boss is looking.', desc: 'Thin humanoid robots of the Age of Wonders who spend their mechanical eternities avoiding work, hiding from whatever machines are in charge and sneering at humanity. They will rally to kill intruders, but their hearts aren’t in it: hurt them and they back off. (Vol 3 p. 68)' },
    'hn-wasp': { threat: 2, line: 'A glowing toxic wasp obsessed with collecting credits.', desc: 'A bloated, glowing toxin monster with one fixation: credits, which it absorbs into its internal “BLOK-CHAIN”. It buzzes round the installations it infests in a haze of poisonous light. Drop enough credits and it may break off to count them. (Vol 3 p. 88)' },
    'hn-toad': { threat: 2, line: 'Eats radioactive bones. Belches plasma.', desc: 'A massive warty toad that grows up eating the radioactive remains of our ancestors and runs on an internal bio-plasma reactor, which is also where its plasma belch comes from. Found in the Badlands and the tox zones, waiting in ravines and small ruins for something to wander past. Kill it quick. (Vol 3 p. 58)' },
    'hn-drone': { threat: 3, line: 'Nine feet of walking gun. Don’t wake it.', desc: 'Over nine feet tall with a scatter-blaster arm, it either clomps round a ruin shooting at anything that moves or waits in low-power surveillance mode for something to cross its sensors. Slow, but formidable. If it’s asleep, don’t wake it; if it powers down to cool off, that is the moment to hit it. (Vol 3 p. 67)' },
    'hn-chatter-a': { threat: 2, line: 'Clacks like someone typing. Then the swarm arrives.', desc: 'A small armoured cybernetic centipede that hides in walls, vents and monster tubes. Wake it with your breath or your smell and the whole nest scurries out, clacking like a roomful of typists, to swarm, stab and feed. Listen for it. (Vol 3 p. 113)' },
    'hn-chatter-g': { threat: 3, line: 'What a well-fed Chatterpillar turns into.', desc: 'A well-fed Alpha spins itself a metallic cocoon and comes out human-sized: the same plated centipede, slower, and much harder to stop. (Vol 3 p. 113)' },
    'hn-cocoon': { threat: 3, line: 'Something is growing in there. Shoot it before it hatches.', desc: 'A Chatterpillar’s chrysalis spun from scrap and glued down with resin. Come too close, or wound it without finishing it, and it splits open and a Gamma unfolds out of it.' },
    'hn-eggbot': { threat: 3, line: 'Small, arrogant, egg-shaped, telekinetic.', desc: 'The commonest Eggbot: no hands, no guns, just a telekinetic shove and a deep contempt for everything not shaped like an egg. Temperamental and often homicidal; luckily they usually have filing to do. They make egg puns against their will and hate it. Pickled eggs stop them cold. (Vol 3 p. 118)' },
    'hn-princess': { threat: 3, line: 'The command egg. Everything here answers to her.', desc: 'The great command Eggbot that rules the Greasy Bolt Hole from her treaded throne, crown and all, with a court of lesser eggs to do the shooting. (Vol 3 pp. 117–121)' },
    // ---- the Greasy Bolt Hole's and this game's own
    'hn-grime-turret': { threat: 2, line: 'An old security turret that lobs slime.', desc: 'A security turret so caked in grease and slime that it fires the stuff now: globs that stick you to the floor.' },
    'hn-slop-tread': { threat: 2, line: 'A sanitation robot on treads, spraying toxic goop.', desc: 'The Slop-Tread Sanitation Denial Unit: a squat treaded cleaner whose tank of disinfectant went bad decades ago. It sprays it anyway.' },
    'hn-grease-monkey': { threat: 3, line: 'An empty trooper’s armour, still walking its post.', desc: 'Nobody is inside the Hollow Grease Monkey. The armour walks its post on its own, a grease hose in its hands, and it doesn’t stop for anything.' },
    'hn-turret': { threat: 2, line: 'Agency security, with a smiley on the cowling.', desc: 'A clean corporate auto-gun with twin barrels and the company’s cheerful logo. It has been told to keep the premises secure, and it does.' },
    'hn-sphinx': { threat: 2, line: 'Answer its question correctly. Or else.', desc: 'A reception-desk gun built as a gilded sphinx. Its expert system is very sure of itself and very confused; give it the right answer and it powers down.' },
    'hn-emitter': { threat: 3, line: 'Keeps a defense field up across a doorway.', desc: 'A squat agency pylon that holds a defense field across a doorway. It has no gun; it just won’t let you through.' },
    'hn-dancer': { threat: 2, line: 'The VIP room’s entertainment, still on stage.', desc: 'A chrome showgirl with a mirror-ball head, still performing for clients long dead, and very upset to see someone who hasn’t paid.' },
    'hn-snapper': { threat: 1, line: 'A potted plant with teeth. It doesn’t move. Don’t go near.', desc: 'Somebody’s ornamental carnivorous plant, grown far past ornamental. Rooted to the spot, it snaps at anything that comes within reach.' },
    'hn-deadbot': { threat: 1, line: 'A funeral robot that won’t stay down.', desc: 'Automated undead: a funeral-home robot laid out in state that gets up when something warm walks past, still in the rags of its burial suit.' },
    'hn-buddy': { threat: 1, line: 'Yours. It follows you and shoots what you shoot.', desc: 'Your old maintenance bot, patched up with tape and a painted heart. It is on your side.' },
    // ---- Asterion's robots (out of Dead Signal; Threat is the floor each first turned up on)
    'hn-sentinel': { line: 'A patrol robot that sees ahead of it and hears your gunshots.', desc: 'Asterion’s security walker: a gunmetal torso on two legs and a rifle arm. It walks its beat looking straight ahead, with a red aiming laser before every three-round burst, and it hears gunfire a long way off. Come at it from the side.' },
    'hn-warden': { line: 'A flying searchlight with a gun under it.', desc: 'A four-rotor drone that sweeps a searchlight over the ruins; anything caught in the beam gets every robot nearby. Small and fragile, but where there is one, the others are listening.' },
    'hn-ceiling-turret': { line: 'A dome in the ceiling. Blind until something sets it off.', desc: 'Hung in a ring in the ceiling, it sleeps until an alarm or a gunshot wakes it, then hoses the room in five-round bursts. It can’t move, so cover works.' },
    'hn-sweeper': { line: 'A cleaning robot gone berserk. It rams.', desc: 'A round white floor cleaner whose brushes still spin. It charges you, knocks you flat, and goes back to sweeping as if nothing happened.' },
    'hn-scalpel': { line: 'Surgical drones. They come in threes.', desc: 'Little hovering surgical units with a ring of scalpels, still trying to operate. They dart in, cut, and dart away, always three together.' },
    'hn-labmate': { line: 'A lab assistant with a sedative syringe and a rack of vials.', desc: 'The synthid labs’ common robot: rolls about on its route with a tablet frowning for a face. Up close it jabs you with a sedative; from further off it lobs sample vials that burst into something toxic.' },
    'hn-courier': { line: 'A fast sample cart that rams you and calls the others.', desc: 'A little white specimen cart that runs in pairs. It rams, and its beeping brings every robot within earshot. Kill it first.' },
    'hn-bench-arm': { line: 'A robot arm bolted to a bench. Stay out of reach.', desc: 'A jointed lab arm on a steel bench corner that sweeps at anything within its reach, which is further than it looks.' },
    'hn-sterilizer': { line: 'A slow cart whose violet lamp burns.', desc: 'A disinfection cart with a UV lamp on a mast. It turns the lamp after you, and the violet light irradiates whatever it falls on. Slow: get behind it.' },
    'hn-docent': { line: 'A tour guide that shoots, and calls its helpers.', desc: 'DOCENT-3, the Discovery Center’s hovering guide, still giving the tour. It fires fans of bolts between the talking points and calls in Couriers (“meet our helpers”).' },
    'hn-orderly': { line: 'A care robot with a stun gun and a restraint arm.', desc: 'A white hospital robot that once carried the patients. ARIADNE’s blue thread has faded from its shell; whoever gives its orders now wants you restrained.' },
    'hn-concierge': { line: 'Porcelain face, tailcoat, a tray of knives. It blinks behind you.', desc: 'The executive floor’s butler, all porcelain smile and white gloves. It steps through nowhere to stand beside you, and serves knives from its silver tray.' },
    'hn-chef': { line: 'Four arms, four knives, and a torch for the flambé.', desc: 'The robot kitchen’s chef: four arms with four knives and a blowtorch, chopping at anything that comes into its kitchen and flambéing what’s left.' },
    'hn-kitchen-arm': { line: 'An arm on the counter with a cleaver.', desc: 'A kitchen counter’s robot arm. Anything within reach gets the cleaver.' },
    'hn-praetorian': { line: 'The boardroom’s guard. Its mirror shield sends your shots back.', desc: 'A gold-and-black war robot with a crested helm and a great mirror shield that throws your shots straight back at you. Get round the shield, or don’t shoot.' },
    'hn-railgun': { line: 'A red line, and then a lot of rounds.', desc: 'A rail gun emplacement. It paints a red line on you first; when the line appears, don’t be there.' },
    'hn-enforcer': { line: 'Black and gold. Its buckler bounces some of your shots.', desc: 'The board’s hunter: sleek black armour, a gold buckler that sends some shots back, and a carbine. Sent to finish jobs.' },
    'hn-tartarus': { line: 'A bronze vault guardian. Stomps, punches, still on shift.', desc: 'A hulking bronze guardian from the vaults beneath, its shift never ended. Its stomp throws everything back; its fists do the rest.' },
    'hn-plate-cutter': { line: 'A demolition crawler with a plasma cutter.', desc: 'A black treaded robot made to cut through vault plating. It cuts through people the same way, in showers of burning sparks.' },
  };
  HN.DOSSIER = D;

  const def = (id) => LM.registry.enemies[id];
  HN.dossierThreat = (id) => {
    const d = def(id);
    return (d && d.hnThreat) || (D[id] && D[id].threat) || 1;
  };
  const chipColor = (game, t) => {
    const lvl = HN.level ? HN.level(game) : 1;
    return t <= lvl ? '#5a8a34' : t <= lvl + 1 ? '#c8862a' : '#b8342a';
  };
  const seen = (game) => {
    const s = HN.st(game);
    return (s.seen = s.seen || {});
  };

  // a monster's picture: its sheet's first frame, or its own drawing
  const pics = new Map();
  function picture(id) {
    if (pics.has(id)) return pics.get(id);
    const d = def(id);
    if (!d) return '';
    const a = d.hnArt;
    if (a && !(a.img && a.img.complete && a.img.naturalWidth)) return '';
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (a) {
      const k = Math.min(64 / a.w, 64 / a.h);
      g.drawImage(a.img, 0, 0, a.w, a.h, (64 - a.w * k) / 2, (64 - a.h * k) / 2, a.w * k, a.h * k);
    } else {
      g.translate(32, 32);
      g.scale(28 / (d.radius || 10), 28 / (d.radius || 10));
      try {
        d.draw(g, { x: 0, y: 0, vx: 0, vy: 0, facing: -Math.PI / 2, r: d.radius, t: 0, hp: 1, maxHp: 1, flash: 0, def: d, vis: 1, status: {}, mem: {}, hn: {} }, 0, LM.game);
      } catch (err) {
        void err;
      }
    }
    const u = c.toDataURL();
    pics.set(id, u);
    return u;
  }

  /** The dossier's tab in the satchel: the kinds you've met in full, then the rest as ???; each by Threat. */
  HN.dossierPanel = function (game) {
    const met = seen(game);
    const ids = Object.keys(D).filter((id) => def(id)).sort((a, b) => !met[a] - !met[b] || HN.dossierThreat(a) - HN.dossierThreat(b) || def(a).name.localeCompare(def(b).name));
    const n = ids.filter((id) => met[id]).length;
    return h('div', null,
      h('p', { class: 'muted' }, n ? n + ' of ' + ids.length + ' kinds met. What the books say, and what we’ve learned the hard way.' : 'Nothing met yet. Everything you come up against will be written up here.'),
      h('div', { class: 'hn-dossier' }, ids.map((id) => {
        const d = def(id), t = HN.dossierThreat(id);
        if (!met[id]) return h('div', { class: 'hn-dos unknown' }, h('div', { class: 'pic' }, '?'), h('div', null, h('strong', null, '???'), h('div', { class: 'muted' }, 'Not met yet.')));
        const pic = picture(id);
        return h('div', { class: 'hn-dos' },
          h('div', { class: 'pic', style: pic ? 'background-image:url(' + pic + ')' : '' }),
          h('div', null,
            h('div', { class: 'top' }, h('strong', null, d.name), h('span', { class: 'chip', style: 'background:' + chipColor(game, t) }, 'Threat ' + t), met[id] > 1 ? h('span', { class: 'muted' }, ' · ' + (met[id] - 1) + ' destroyed') : null),
            h('div', { class: 'inv-desc' }, D[id].desc)));
      })));
  };

  // ---- noticing and the fight cards
  let bar = null;
  const cards = new Map(); // id → { el, t }
  function ensureBar() {
    if (bar && document.body.contains(bar)) return bar;
    bar = h('div', { class: 'hn-foe-cards' });
    // under the modal (a later sibling), so an open panel covers the cards
    const app = document.getElementById('app') || document.body, modal = document.getElementById('modal');
    if (modal && modal.parentNode === app) app.insertBefore(bar, modal);
    else app.appendChild(bar);
    return bar;
  }
  function card(game, id) {
    const d = def(id), t = HN.dossierThreat(id), pic = picture(id);
    return h('div', { class: 'hn-foe' },
      h('div', { class: 'pic', style: pic ? 'background-image:url(' + pic + ')' : '' }),
      h('div', null,
        h('div', { class: 'top' }, h('strong', null, d.name), h('span', { class: 'chip', style: 'background:' + chipColor(game, t) }, 'Threat ' + t)),
        h('div', { class: 'line' }, D[id].line)));
  }
  /** Every frame (from the satchel's update): what's fighting you now, and what you've met. */
  HN.dossierTick = function (game, P) {
    if (!game || game.attract) return;
    const met = seen(game);
    const now = new Set();
    for (const e of game.enemies) {
      const id = e.def.id;
      if (e.dead || !D[id] || e.faction === 'ally' || id === 'hn-buddy') continue;
      if (!(e.aggro && (e.vis == null || e.vis > 0.4)) || U.dist(e.x, e.y, P.x, P.y) > 520) continue;
      now.add(id);
      if (!met[id]) {
        met[id] = 1;
        game.toast('New in your dossier: ' + e.def.name + ' (B)');
      }
    }
    ensureBar();
    const t = performance.now() / 1000;
    for (const id of now) {
      let c = cards.get(id);
      if (!c) {
        c = { el: card(game, id), t };
        cards.set(id, c);
        bar.appendChild(c.el);
      }
      c.t = t;
      c.el.classList.remove('gone');
    }
    for (const [id, c] of cards) {
      const idle = t - c.t;
      if (idle > 2.5) c.el.classList.add('gone');
      if (idle > 3.4) {
        c.el.remove();
        cards.delete(id);
      }
    }
    bar.style.display = game.state === 'play' ? '' : 'none';
  };
  LM.on('enemyDied', (e) => {
    const game = LM.game;
    if (!game || game.attract || !e || !D[e.def.id]) return;
    const met = seen(game);
    met[e.def.id] = (met[e.def.id] || 1) + 1;
  });
  LM.on('levelLoaded', () => {
    for (const c of cards.values()) c.el.remove();
    cards.clear();
  });

  // B: straight to the dossier
  window.addEventListener('keydown', (e) => {
    const game = LM.game;
    if (e.code !== 'KeyB' || e.repeat || !game || game.attract || game.state !== 'play' || LM.ui.modalOpen) return;
    if (!HN.st(game).created) return;
    e.preventDefault();
    HN.openSatchel(game, 'dossier');
  });

  // the title screen's list of keys
  const rows = LM.ui.controlRows;
  if (rows) LM.ui.controlRows = () => rows().concat([['B', 'Monster dossier']]);

  const css = document.createElement('style');
  css.textContent = `
    .hn-dossier { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 8px; }
    .hn-dos { display: grid; grid-template-columns: 64px 1fr; gap: 10px; padding: 8px; border: 1px solid rgba(232,200,140,0.18); border-radius: 6px; background: rgba(0,0,0,0.25); }
    .hn-dos .pic, .hn-foe .pic { width: 64px; height: 64px; border-radius: 6px; background: #14110d center/contain no-repeat; display: grid; place-items: center; font: 700 26px/1 var(--font-ui); color: #5a4a3a; }
    .hn-dos.unknown { opacity: 0.55; }
    .hn-dos .top, .hn-foe .top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; }
    .hn-dos .chip, .hn-foe .chip { font: 700 10px/1 var(--font-ui); color: #fff8e8; padding: 3px 6px; border-radius: 3px; }
    .hn-foe-cards { position: absolute; top: 90px; left: 12px; display: flex; flex-direction: column; gap: 5px; pointer-events: none; }
    .hn-foe { display: grid; grid-template-columns: 36px 1fr; gap: 6px; align-items: center; width: 196px; padding: 4px 7px 4px 4px; background: rgba(18,14,10,0.78); border: 1px solid rgba(232,200,140,0.3); border-radius: 6px; color: #f0e4cc; font: 12px/1.25 var(--font-ui, sans-serif); transition: opacity 0.8s; }
    .hn-foe .pic { width: 36px; height: 36px; }
    .hn-foe strong { font-size: 12px; }
    .hn-foe .line { font-size: 11px; color: #cdbfa4; }
    .hn-foe.gone { opacity: 0; }
  `;
  document.head.appendChild(css);
})();
