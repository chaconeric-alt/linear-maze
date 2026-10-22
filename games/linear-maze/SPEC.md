# The Linear Maze — design spec

Version 0.5.1 · October 2026

What The Linear Maze is, what is in it, and where it is going. It runs on the Linear Maze engine: `engine/SPEC.md` is the technical reference (how the engine works, how packs and levels are written, the editor's format, games and packs). Section numbers match the one-file spec of 0.4 and earlier; the engine's sections (4–7, 9, 10, 13, 15 and 21) are in `engine/SPEC.md`, apart from the parts below that belong to this game's packs.

**New in 0.5:** The Linear Maze is now one game among others in a workspace. Its files are all in `games/linear-maze/`. Paths in this document are relative to that folder unless they start with `engine/`, `editor/` or `games/`.

| Where | What |
|---|---|
| `game.js` | The manifest: the title screen (“the linear maze”, the tagline, Begin the descent), the words on the end screens (“You fell in the maze”), the packs below in load order, and the save slot `linear-maze-save-v1`. Edit it on the editor's Game page. |
| `packs/core/` | Core: tile sets, terrain, weapons, maze monsters, items, armor, trap effects. Every game needs it. |
| `packs/maze/` | The three maze floors (`levels/01`–`03`). |
| `packs/office/` | The Office pack and the 14th floor. |
| `packs/memos/` | Posters, notices, cameras, desk toys, email, the three scores. Needs Office. |
| `packs/chessboard/` | The Office on Chessboard 1. Needs Office and Memos. |
| `packs/apartment/` | The apartment and Apartment (Chessboard 0). Needs Office and Memos. |
| `packs/rotary/` | Red rotary phones. |
| `packs/dressings/` | A pillar for any floor. |
| `packs/home-story/` | The evening, Home (Chessboard 1), the morning (`story.js`, moved from `packs/apartment/` so the apartment can be used without the story). |
| `packs/library/` | The Library Maze. |
| `packs/town/` | The Town Map, its places, the Maze of Forking Paths. Needs the home story. |
| `editor/` | What the editor saved: `edits.js` (the furniture painters, the Home (Chessboard 0) tile set, the floor order) and `sprites.js`. |
| `tools/` | `chessboard/build-layout.mjs` and `memos/check-placements.mjs`. |
| `HANDOFF.md`, `README.md` | Hand-off notes (who owns what, hooks between packs, flags, knobs) and a short readme. |

Other games can load any of these packs: `'linear-maze/office'` in their manifest, or `'linear-maze/*'` for all of them (see `engine/SPEC.md` section 21).

**New in 0.5.1** (the engine's; section 22 says what it means here): walking back onto the stairs you arrived by takes you up a floor, and every floor is as you left it when you come back to it. The engine also has elevators now; The Linear Maze doesn't use any yet (its elevators are still the decorative call buttons on the 14th floor and the out-of-order ones at home).

---

## 1. The game

The Linear Maze is a fast, top-down 2D shooter that runs in a browser. The player descends through a series of floors. Each floor is a hand-built run of passages and chambers: shoot what moves, take what glitters, find the stairs down.

### Design pillars

1. **Fluid and fast.** Movement accelerates and stops crisply, a short dash with invulnerability is always close at hand, and weapons have weight (recoil, screen kick, muzzle light, knockback).
2. **Light is the mood and the mechanic.** Every torch, brazier and crystal casts real shadows. The player sees only what is in line of sight; enemies around a corner are invisible until you turn it. A lamp helmet or a blessing that pushes back the dark is a meaningful upgrade.
3. **Danger is readable.** Every heavy attack telegraphs: melee wind-ups glow, charges draw a red lane, mortar shells mark their landing circle, shockwaves draw their radius before they burst, spike plates glint before they rise.
4. **Content is data.** The engine knows nothing about specific enemies, weapons, items, rooms or floors. All of it is registered by content packs, so the game grows by adding packs and levels rather than by editing the engine.

### Core loop

Enter a floor → clear or slip past each chamber → find the key or switch the next door needs → collect gold, gear and ammunition along the way → spend gold at altars and slot machines → reach the stairs → carry everything to the next floor.

### Starting state

The player starts with no armor and the Service Pistol, which has unlimited ammunition (as specified in the brief).

With the Office pack installed (the default build), a new run starts one step earlier: on the 14th floor of Meridian Group, at 9:52 on a weekday, with no weapon and only a phone. The Service Pistol is waiting on a plinth in the Linear Conference Room, the last room of the prologue. If the player walks past it, the first maze floor hands them one anyway, so the maze always starts as the brief describes. To start in the maze directly, set the first floor to the Sunken Cloister on the editor's Game page (`start: 'sunken-cloister'` in `game.js`).

---

## 2. Controls

| Input | Action |
|---|---|
| W A S D (or arrows) | Move |
| Mouse | Aim (the camera leans toward the cursor) |
| Left click (hold) | Fire. On a floor with no weapon, a click takes a flash photo with the phone instead |
| Shift or Space | Dash (0.15 s, brief invulnerability, not while swimming) |
| E | Use, open, take, talk (works on whatever the dashed ring or name tag highlights) |
| (walk onto them) | Stairs down (`>`) go on; the stairs you arrived by (`<`) go back up, once you've stepped off them |
| F | Open the phone (messages, notes, map, photos, flashlight) |
| 1–9, mouse wheel | Switch weapon |
| Q | Swap to the last weapon |
| Tab or I | Inventory |
| Esc or P | Pause |
| M | Sound on or off |

Inside pop-ups: E or Enter triggers the highlighted action, Esc closes. In conversations, 1–9 pick a reply.

---

## 3. What iteration 0.2 contains

### Floors

| # | Floor | Environment | Highlights |
|---|---|---|---|
| 14th floor | Meridian Group (Office pack prologue) | Carpet tile, terrazzo, glass, drywall; bright fluorescent ambient | Reception lobby with elevators and Marisol the receptionist; an open plan of desk pods with seated coworkers and your own desk (the note); three glass-walled conference rooms (one mid-meeting); an all-gender restroom with a locked, occupied stall; the Cantina (fridge, espresso machine, vending, coworkers arguing about stolen lunches); Dana's and Alan's executive offices and a quiet room. Reading the note makes a door appear in the west hall. Past it: a hallway that cannot be here, the open plan again (water-damaged, desks askew, people facing the walls, something only the camera flash can see), a copy room that won't stop printing, a corridor turning to stone, and the grand opening: the Linear Conference Room, whose stair leads to Floor 1. |
| 1 | The Sunken Cloister | Mossy flagstone, brick, teal ambient | Flooded nave with pools and pillars; spike stair; the Ossuary (red key on a candlelit dais, skitter swarm); Sexton's Store (Scattergun chest, explosive barrels); dart-plate corridor; red door; Chapter House water channel with gunners; shrine whose door wakes husks in the water; altar; healing font; the Sinkhole (walkways over pits, dash-only ledges). |
| 2 | The Ember Foundry | Riveted plate, bulkheads, molten slag | Gantry Hall split by a slag river with two grate bridges; sentry turrets and lobbers; the Tripwire Gallery (two laser beams, alarm and ambush, plus a crate-blocked crawlspace that bypasses them); Pump Station (recharge station, Aegis Harness); the Tally Room (two slot machines, Rivet Gun locker, foreman's ledger); the Crucible (Arc Lance on a platform in the slag, reached by a one-tile bridge; the gold key on an island guarded by a brute, which wakes the slag when taken); gold door; lift shaft. |
| 3 | The Gilded Reliquary | Veined marble, gold inlay, crimson carpet, violet ambient | Processional with wardens; the Crossing (reflecting pool, altar, recharge station); Hall of Votives (walking in snuffs every candle and releases skitters); the Vault (Ember Mortar, violet key, Gilded Circlet; lifting the idol seals the vault until the summoned guard is dead); the Sanctum boss fight against the Reliquary Keeper, whose death unseals the last stair. |

### The office request, mapped to what shipped

| Request item | Where |
|---|---|
| Modern-day office building, larger open-plan rooms | `packs/office/levels/00-meridian-fourteen.js`: a 104 × 48 floor; the open plan is 45 × 20 tiles with ten desk pods. |
| Conference rooms with tables and glass walls | Tangent, Vertex and Parallel: glass south walls and glass doors (`glass-h`, `door-glass`; corners and junctions are `glass-elbow`, `glass-junction`, `glass-cross` and the `partition-` equivalents, turned with the tile's `rot`), long tables with chairs, wall screens and whiteboards. Vertex has a meeting in progress. |
| Bathroom, pantry, executive offices | Restroom (stalls, sinks, mirrors, a locked occupied stall you can talk to); the Cantina (sink, kettle, espresso machine that makes you faster, microwave, fridge, vending, café tables); Dana Whitlock's and Alan Mercer's offices; the Quiet Room. |
| NPCs that are not enemies | 24 people (`packs/office/npcs.js`), each with a look, a movement behaviour (sit, stand, pace, wander, face the wall), ambient speech bubbles and a dialog tree. None can hurt you. |
| Your desk, with a note to "meet in the Linear Conference room" | Workstation 14-112 (`my-desk`). Taking the note sets the `readNote` flag, which starts everything else. |
| Break-room NPCs: don't know where it is, complain about lunches | Priya (pad thai stolen, again), Gary (his salmon is in the microwave; you can steal it), Tomas from IT (the oat milk is his). Each has an answer about "Linear" and their own threads. The fridge, microwave and notice board join in. |
| The boss: mildly annoying, status reports | Dana Whitlock paces the open plan, gently circling back on your status report, in person and by text, all the way down. |
| The receptionist: beleaguered, nice | Marisol Reyes, juggling every line at once (including line four, which you can pick up). |
| A door that "wasn't there before" | Ten seconds after you take the note the lights stutter, the building shudders and a window in the west hall becomes an old studded door (`odd-window` plus the `door-odd` terrain, swapped in at runtime). |
| A more jumbled, insane office area | Past the door the way back closes and the office lights go out. The open plan repeats, flooded and wrong: desks askew, flickering screens, echoes of your coworkers, a desk that is yours, a copy room printing floor plans with one extra corridor each. |
| The grand opening into the Linear Maze | The corridor turns to flagstone and opens into the Linear Conference Room: a pillared stone hall, Dana waiting, the pistol on a plinth "for the attendee", and the stair down to Floor 1. |
| A phone instead of a weapon, with messages and other functions | The `phone` gadget: messages with quick replies (Dana, an unknown number, the team channel, your calendar, Mom), a Notes tab with the current objective and your to-do list, a floor map, a camera whose flash briefly lights the room (and shows what shouldn't be there), and a flashlight that drains the battery. It keeps buzzing on the maze floors. |

### The brief, mapped to what shipped

| Brief item | Status | Notes |
|---|---|---|
| Walls | Done | Procedurally textured per environment, with lit edges, front faces and contact shadows. |
| Doors | Done | Slide open automatically for the player; enemies that are hunting you open unlocked doors too. |
| Locked doors and keys | Done | Red, gold and violet keys. Keys are kept for the floor. |
| Dangerous terrain | Done | Pits (fall, take damage, climb back out), spike plates on a rolling timer, molten slag (burns and slows). |
| Level entry and exit | Done | Entry and exit stairs, both ways (0.5.1). Health, gear, gold, weapons and ammunition carry over; keys stay with the floor they were found on (and are there again when you come back). |
| Traps | Done | Triggers: pressure plate, laser beam, opening a door, taking an item, entering a zone, clearing a tagged group. Effects: darts, summons, lockdown (seal doors until the summons die), alarm, lights out, explosions, quake, messages, unseal and open doors. |
| Stairs | Done | Entry and exit tiles. |
| Pillars | Done | Round; block movement, bullets, light and sight. |
| Water | Done | Slows you, disables dash, hides your lower half. Wading Boots and the Oilskin Coat help. |
| Specialized rooms | Done | Named rooms announce themselves on first entry; shrine, ossuary, storeroom, break room, vault, sanctum. |
| Lighting sources | Done | Wall torches, braziers, crystals, candles, the lamp helmet; static lights cast shadows. |
| Treasure chests | Done | Fixed contents or loot tables; optional key lock; take items one by one or all at once. |
| Furniture | Done | Cosmetic (tables, benches, bones, banners), usable (lecterns, healing font), destructible (crates drop loot; barrels explode and chain). |
| Health kits | Done | Health vials (+25) and medical kits (+60). |
| Recharge stations | Done | Finite reserve that refills energy cells and shields. |
| Altars | Done | Pay a tithe for a random lasting blessing, or pray once for free. |
| Slot machines | Done | Three reels, three bet sizes, a paytable, and three skulls releases skitters. |
| Clothing and armor | Done | Head, body, feet and trinket slots; 11 pieces that change armor, speed, shield, light, damage, swimming, gold find and ammo capacity. |
| Weapons | Done | Five weapons with distinct ammunition and behavior. |
| Pop-up UI for interactive items | Done | Chests, stations, altars, slot machines, lecterns, fonts, weapon racks, armor stands, idol, inventory, pause, floor summary, death and victory. |
| Enemy variety | Done | Toughness, speed, ranged, melee and area attacks are all independent data. Seven enemy types and one boss. |
| Fast-paced, fluid, beautifully rendered | Done, needs real playtesting | 60 fps target on GPU-accelerated browsers. Balance has only been checked by automated tests (see section 10). |
| Modular content via prompts and packages | Done | See sections 6 and 7. |

---

## 6. Content of this game's packs

The content pack reference is `engine/SPEC.md` section 6. These two parts of it belong to The Linear Maze's Office pack.

### 6.13 The phone (Office pack)

- **Messages.** `LM.phone.send(game, thread, text, { replies })` delivers now; `LM.phone.later(game, seconds, thread, text, opts)` after a delay (dropped if the floor changes first). `replies: [{ label, then: { text, delay } }]` become buttons; picking one posts your reply and, optionally, theirs. Threads: `dana`, `calendar`, `unknown`, `team`, `mom`; add more to `LM.PHONE_THREADS` (`{ name, initials, color }`). Levels send messages with the `phone` trap effect.
- **Notes** shows the current objective (from story flags) and a to-do list that ticks itself off.
- **Map** draws what you've explored.
- **Photos.** A click takes a picture: a bright flash that lights the room for a moment, reactions from anyone nearby (`flashBarks`), and a caption. `spectral` NPCs are visible only during a flash, and their `onFlash` runs (the faceless figure steps closer each time).
- **Light.** A flashlight that adds to `lightRadius` and drains the battery faster.

### 6.14 Story flags used by the prologue

`readNote` (took the note), `wateredPlant`, `tookSalmon` (you are the lunch thief), `coffee`, `heardLine4`, `promisedReport`, `samComing`, `askedMarisol`, `doorAppeared`, `doorOpened`, `grandOpening`, `armed` (took the pistol). Later floors may read any of them.

---

## 7. Recipes for this game

The general recipes are in `engine/SPEC.md` section 7.

**A new phone feature.** Add a tab in `render()` in `packs/office/phone.js` (the tabs are a plain list), keep its state in `P.data.phone`, and if it needs to act on the world, do it from `primary` or `update`.

---

## 8. Current content and numbers

### Weapons

| Weapon | Slot | Ammo (max) | Damage | Rate /s | Notes |
|---|---|---|---|---|---|
| Service Pistol | 1 | unlimited | 14 | 4.2 | accurate, the starting weapon |
| Scattergun | 2 | shells (48) | 7 × 8 | 1.35 | 300 range, 60% falloff, heavy knockback and shove |
| Rivet Gun | 3 | rivets (240) | 9 | 11 | spray with growing bloom |
| Arc Lance | 4 | cells (90), 3 per shot | 30 | 2.4 | pierces 3 enemies; refill at recharge stations |
| Ember Mortar | 5 | charges (14) | 12 + 72 blast (r 80) | 1.1 | bursts at the cursor or on contact; 35% self-damage |

### Enemies

| Enemy | HP | Speed | Behaviour | Attacks |
|---|---|---|---|---|
| Drowned Husk | 42 | 92 | chaser | melee 12 |
| Skitter | 16 | 178 | swarmer | melee 6 |
| Cult Gunner | 36 | 84 | skirmisher (150–270) | 3-round burst, 9 each |
| Brute | 170 (15% armor) | 68 | chaser | telegraphed charge 26 (stuns itself on walls), melee 22 |
| Ember Lobber | 52 | 62 | lobber (210–380) | arcing shell 28, radius 58, with landing marker |
| Sentry Turret | 75 (30% armor) | 0 | turret | 5-bolt burst, 10 each; explodes when destroyed |
| Gilded Warden | 130 (20% armor) | 76 | warden | shockwave 24 (radius 96) plus 8 shards; melee 14 |
| The Reliquary Keeper | 950 (25% armor) | 72 | boss | shockwave 28 (radius 132) plus 14 shards; 11-shard fan; charge 30; summons skitters; enrages below half health |

### Hazards

Pit: fall, 18 damage, climb out at the last safe spot. Spikes: 14 damage every 0.5 s while raised; a 2.4 s cycle raised for 1 s, rolling across a corridor as a wave and glinting red just before rising. Slag: 7 damage every 0.4 s and movement ×0.55. Darts: 10. Barrels: 60 in a radius of 78.

### Gear

Body: Oilskin Coat (+10% reduction, better swimming), Brigandine (+25% reduction, −14 speed), Aegis Harness (60 regenerating shield). Head: Miner's Lamp Helm (+140 light), Iron Sallet (+10% reduction), Gilded Circlet (+35% gold, +15 health). Feet: Runner's Boots (+26 speed, faster dash), Wading Boots (much better swimming). Trinket: Bandolier (+50% ammo), Warding Charm (25 regenerating shield), Ember Heart (+15% damage, −10 health).

Blessings: Iron Skin, Quickening, Vigor, Wrath, Far Sight, Deep Pockets.

Slot machine (per bet): three coins ×6, gems ×12, eyes ×16, crowns ×40, any two coins ×1.5, three skulls releases three skitters. Expected return is roughly 78%.

### The 14th floor (Office pack)

| Who | Where | What they're about |
|---|---|---|
| Marisol Reyes, front desk | Reception | Beleaguered and kind; every line on hold; line four is breathing. Calls you sweetheart. |
| Dana Whitlock, Director of Operations (your boss) | Paces the open plan; her office is in the executive suite | Status report. Gently. Like a hawk, but supportive. Texts you about it on every floor. |
| Priya Natarajan, product manager | Cantina, at the fridge | Her pad thai was stolen. Again. Gary is on every list. |
| Gary Pruitt, account executive | Cantina, at the microwave | His salmon has said 3:47 for twenty minutes. You can take it. |
| Tomas Ferreira, IT support | Cantina, at a table | The Wi-Fi works; your expectations don't. The oat milk is his. Notices the LINEAR network. |
| Kenji Watanabe, financial analyst | Open plan | Always on a call. |
| Brenda Okafor, People & Culture | Wanders the open plan | The fire-safety module is mandatory. Has a laminated floor plan that grows a door. |
| Sam Lin, intern | Reception | Nobody tells interns anything. Got a note too. |
| Lena, Marcus, Joy, Ravi, Hollis, Nadia | Desks in the open plan | One line each about "Linear". Ravi saw who left your note; Nadia knows the cost centre LINEAR-00. |
| Alan Mercer, VP Strategy, and six attendees | Vertex, mid-meeting | Only taking synergy questions. Was invited to Linear once, years ago. |
| A voice from stall three | Restroom | Got a note on Monday. Has been in there since Monday. |
| Echoes: Marisol?, Priya?, the wall-starers, the Temp, Sam, Dana | Past the door | What the floor remembers of them. |
| A figure | Past the door | Only the camera flash shows it. Each photo, it is a step closer. |

Interactive objects: your desk (the note, the plant), coworkers' desks, the copier, filing cabinets (the L drawer), water coolers, whiteboards and screens in each conference room, the company sign, elevators, framed pictures, the notice board, the fridge, the microwave, the espresso machine (+24 speed and a faster dash for 60 s), vending machines, taps, toilets, mirrors, the occupied stall, bookshelves, the globe, the door that wasn't there, a desk like yours, the plinth with the pistol, the brass plaque.

---

## 10. Known limitations of this game

The engine's limits are in `engine/SPEC.md` section 10. Besides those:
- Balance has only been exercised by automated tests (every interaction, trap, door, weapon and enemy type, and a full run through all three maze floors), not by human playtesting.
- NPCs don't pathfind, so nobody follows you yet (Sam says he'll come, and doesn't).
- The phone clock runs on real seconds from 9:52; the "you're late" text arrives at 10:00 if you're still on the 14th floor.
- The prologue has no fail state and nothing to collect except the note and the pistol; its pacing has only been checked by automated tests.
- The 14th floor can be revisited from Floor 1's stairs up (0.5.1), and it is as you left it, door included; but nothing new happens there on a second visit.

---

## 11. Backlog for the next iterations

Rough priority order. Sizes: S (an afternoon), M (a session), L (several sessions).

1. **Playtest and balance pass** (S–M). Enemy counts per room, ammo and health economy, altar prices, boss phases. Add a difficulty setting that scales `game.difficulty` (enemy health) and damage.
2. ~~In-browser level editor~~ (done: `editor/`). Next for it: a dialog editor for conversations.
3. **Gamepad and rebindable keys** (M). Twin-stick aiming; a settings pop-up (also screen-shake and flash toggles).
4. **Status effects** as a new registry kind (M): burning, poison, slow, stun, bleed; weapons and attacks apply them.
5. **More traps** (M): flame jets, collapsing floors, arrow turrets that track, rolling boulders, crushers, pressure plates that close doors behind you.
6. **Secrets** (S–M): shootable false walls, hidden switches, a secrets count on the floor summary.
7. **Elite modifiers** (M): any enemy can roll shielded, volatile, swift or vampiric, with a tint and a name prefix.
8. **A merchant room** (S): a gold sink beside altars and slots; sells ammo, gear, keys to optional vaults.
9. **Image-based art in packs** (M): let textures and sprites come from sprite sheets embedded as data URIs, alongside the procedural painters.
10. **Procedural floors** (L): a `generators` registry kind that builds a map (rooms, corridors, key-door ordering) from a seed, mixing hand-authored room templates.
11. **Music** (M): layered per-environment loops that intensify in combat.
12. **Run structure** (M): score, run timer, permadeath mode, unlocks between runs.
13. **Dynamic shadows** for a capped number of moving lights; normal-mapped walls (L).
14. **Accessibility** (S): shapes on keys and locked doors besides colour, a high-contrast HUD option, reduced flashing.
15. **NPC pathing and followers** (M): NPCs walk the flow field to a target; Sam actually follows you through the door; coworkers react to where you've been.
16. **Quests and objectives** (M): a small registry of objectives driven by flags, shown in the phone's Notes tab and on the floor summary (deliver the status report, find out who's been taking the lunches).
17. **More phone apps** (S–M): a voicemail from line four, a calendar that rewrites itself, a step counter that keeps counting floors down.
18. **Echoes in the maze** (M): coworker echoes and messages on the maze floors that respond to choices made on the 14th floor (the salmon, the plant, what you told Dana).

---

## 12. Prompting future iterations

Attach the workspace (or `engine/SPEC.md`, this spec and the relevant pack files) and ask for content in pack terms. New packs go in `games/linear-maze/packs/<name>/` with a `pack.js`, and are added to the `packs` list in `game.js`. Examples:

> Add a content pack in `games/linear-maze/packs/catacombs/`: an environment called Catacombs (pale limestone walls, packed-earth floor, green fungal light), a Bone Archer enemy (ranged, keeps its distance, fires a 3-arrow fan) and a Grave Knight (slow, armored, a shockwave when you get close), a Sickle weapon (short-range melee arc as a wide, short-range pellet spread), and a fourth floor that uses them, placed after the Reliquary. Follow engine/SPEC.md sections 6, 7 and 21 and keep the Core pack untouched.

> Rebalance: the Rivet Gun is too strong and the Pistol feels weak. Ship the changes as a small `packs/balance/` pack listed after Core in game.js.

> Add a trap effect `flames` (a jet from a wall emitter that burns along a line for 1.5 seconds) and use it twice on Floor 2.

> Make a new game, Hospital Night Shift, in its own folder: it loads Core and the Office pack's assets (no 14th floor), and adds a pack of its own with two floors. Give it its own title screen.

> Add a peaceful floor in the style of the Office pack: a hospital night shift. Patients and nurses as NPCs with dialog trees, the phone as the only tool, and a lift that goes to a floor that doesn't exist. Follow engine/SPEC.md sections 6.8, 6.11 and 6.12, section 6.13 here, and the recipe "A peaceful floor".

> Make Sam follow the player through the door if they told him "Sure. Stay close." (`samComing`), and have him wait in the Linear Conference Room.

When content changes, update sections 3, 8 and 11 of this spec in the same pass, and `engine/SPEC.md` when the engine or the pack format changes.

Layouts with a lot of furniture are easiest to build with a small script that writes the two grids (the office was laid out in Python with helpers for rooms, desk pods and seats, then emitted as the level file) and then checked with a reachability pass from the start tile to every person and to the exit.

---

## 14. Iteration 0.3 additions: the Memos and Chessboard packs

Two packs loaded after the Office pack (`packs/memos/`, `packs/chessboard/`). Neither edits engine, Core or Office files. `HANDOFF.md` lists every point where they depend on those files.

### 14.1 Memos (`packs/memos/`)

Additions to the 14th floor, placed when the floor loads (`placements.js`, tile coordinates) rather than by editing its map.

| Piece | Item | What it does |
|---|---|---|
| Motivational posters | `memo-poster` `{ poster }` | 14 bland posters in conference rooms, halls, reception and the Cantina. E opens the poster: a geometric picture (`POSTER_ART`), a spaced title, a tagline. |
| Notices | `memo-notice` `{ notice }` or `{ arrow, title, text }` | Parking, punctuality, harassment-prevention and cybersecurity training, IT policy. A seal marks Management notices and a pushpin marks employee ones. Arrow notices also tape an arrow to the floor. |
| Message board | `memo-board` `{ board, w }` | The Cantina's board: nine notices (coffee area, fire drill, bowling league, kittens…) as coloured cards with the same symbols. |
| Security cameras | `memo-camera` `{ corner }` | In room corners, with a blinking light. On an honest floor they turn to follow you. |
| Desk toys | `desk-toy` `{ toy }` | Scattered over about three ordinary desks in ten: succulent, globe, Newton's cradle, puzzle cube… |
| Email | hooks `my-desk` | "Check email" opens an inbox. On the 14th floor: the compiled TPS report, and Alice's goodbye. Alice quit yesterday; her goodbye to Bob is a substitution cipher of "The Jabberwock, with eyes of flame…", plus jokes about her private key and her one-time pad. |
| Alice's old desk | `alice-desk` | Workstation 14-113, next to yours. Search it for her "one-time pad" (the plaintext, written down) and Bob's private key (a real key). With the email read, "Oh! That's what she meant!" |
| Scores | `scores.js` | NOTICE, MESSAGE and EMAIL SCORE in the top-right corner, saved with the run (`P.data.memos`). Notices: 10 each. Phone messages: 10 each, once read. Emails: 25–50 each, plus 100 for decrypting Alice's. |

Every poster, notice and toy has an `honest` version in `content.js`, used on floors with `honest: true`.

**Recipes**
- *A new poster:* add an entry to `MEMOS.posters` (pick an `art`, or add a drawing to `POSTER_ART`) and a placement line.
- *A new notice:* add an entry to `MEMOS.notices` and either a placement line or an id in `MEMOS.boards`.
- *A new email:* add it to `MEMOS.emails` and its id to `MEMOS.inboxes[levelId]`.

Check placements with `node games/linear-maze/tools/memos/check-placements.mjs`.

### 14.2 Chessboard (`packs/chessboard/`, `packs/chessboard/levels/04-chessboard-one.js`)

**The Office on Chessboard 1** (order 4, after the Reliquary). It is the 14th floor again, one level of reality down, after JAGS Wonderland's chessboards.

Everything looks a little off:
- The environment `chessboard-office` is `office` with every colour nudged.
- The windows look out on a chessboard.
- The big plants bite.

Everyone is the real version of themselves, built from the Office pack's definitions (same looks):
- Marisol is a containment protocol.
- Priya forks the salmon thief (`tookSalmon`).
- Tomas sees every screen.
- Kenji has been on mute since 1994.
- Alan is in a meeting with himself.

On this floor (`honest: true`):
- Posters are demotivational.
- Notices are overly honest: threats about the kitchen, harassment training as a cover-up manual, cybersecurity as workplace surveillance, a bounty on mouse movers.
- Desk toys belong to their owners: Hollis's guillotine, Marcus's cannon (it fires), Joy's flytrap, Nadia's trebuchet.

**Three tasks before 5:00 PM** (`workday.js`). They arrive by phone, with details in a desk email. The clock runs at `CONFIG.minutesPerSecond` (0.5 by default: 16 minutes). At 5:00 the floor restarts, keeping finished tasks.

1. **Status meeting** (`meeting.js`) in Zeno's Paradox. The other conference rooms are the Riemann Room and Room √−1.
   - The door locks. Dana asks each attendee for a report and shoots them for poor performance. They regenerate in their seats a minute later.
   - Then she asks whether you are caught up on email (you need the TPS report) and what Alice's goodbye said. With `aliceDecrypted` you pick the poem. Otherwise you type a guess.
   - A wrong guess gets you shot, and the run starts over (`CONFIG.failRestartsRun`).
2. **Daily report module** in the server farm.
   - A new door in reception's east wall leads to the east wing: a back hall, three union brooms on strike, Records (Doug, lost since 2009), the Supply Desk and closet, the lounge, two more lost offices, and the Loop.
   - Gertrude guards the supply closet from her desk (`supply-clerk`, behaviour `desk-sitter`) and only gets up if you go in.
   - The lounge (Hilbert's Hotel) has the Vend-O-Matic: health 30, ammunition 25, +20 max health 150, hints 5.
   - Arrow notices lead clockwise round the Loop. Five zone checkpoints (`cb-arrow`), taken in order, open a door into the farm (`cb_serverDoor`); skipping one resets the count.
   - Kevin, inside the farm's door, blocks the way until tasks 1 and 3 are done, then explains: the terminal moved to the far corner, and Bob is in a mood.
   - **Bob, the SYSADMIN** (`cb-bob`) is large, with cables and long arms. He only moves, reaches and strikes as fast as you move. He plans a path over grid corners where a 2 × 2 block is open, so he can't fit through the farm's one-tile gaps. The terminal's corner can only be reached through those gaps.
   - Give Bob his private key (`bobKey`, from Alice's desk) and he stands down.
   - The terminal (`cb-terminal`) runs the report and ends the floor.
3. **Mandatory Workplace Surveillance Training:** Brenda's three-question quiz in the Training Room (formerly the Quiet Room).

**New trap effects:** `cb-arrow { n, of }`, `cb-meeting`, `cb-wake`.

**New level fields** (read by these packs only):
- `honest`
- `bobArea: [x, y, w, h]`
- `techAside: [x, y]`

The map comes from `node games/linear-maze/tools/chessboard/build-layout.mjs`, which copies the 14th floor's office at the same coordinates, adds the east wing, and checks that the player can reach everything and Bob can't reach the terminal.

---

## 16. Apartment (Chessboard 0)

`packs/apartment/` and `packs/apartment/levels/apartment-chessboard-zero.js`. It is the first floor of a run (`order: -1`, `floorLabel: 'Chessboard 0'`, peaceful, phone only). Its stairs down are roped off until the story flag `timeToLeave` is set; then they lead to the 14th floor.

- **The hall.** 6:30 PM. You arrive by the stairwell; the elevators are OUT OF ORDER. Five neighbors' doors (`apt-neighbor` `{ unit, openFlag?, knock?, knob? }`) offer Knock ("No one seems to be home.") and Try the knob (locked). Your door, 7C, is painted blue with a brass number and has a welcome mat outside.
- **Unit 7C.**
  - Kitchen: fridge (get something to eat), counters, sink, oven, a microwave on the counter, the red rotary phone (section 17), and the kitchen table with your laptop (email and chat; Alice is away).
  - Living room: sofa and TV (watch TV), entertainment center, armchair, plants, a bookshelf of annotated titles, a garage-sale Dreamcast with 90s games, and the coffee table with *Architecture Times*.
  - Short hall and guest bath.
  - Bedroom: bed (relax), dresser, nightstands, a clock radio stuck at 6:30, and a closet of hanging clothes.
  - Master bath: toilet, shower, sink.
  - Garage-sale landscapes and cities on the walls.
- **Where the text lives.** All of it is in `content.js`: `BOOKS`, `GAMES`, `CHANNELS`, `FRIDGE`, `NEIGHBORS`, `RADIO`, `MAGAZINE`, `CHATS`, `EMAILS`. Items are in `items.js`; several reuse an Office drawing with new interactions (`from(id, changes)`).
- **The environment.** `apartment` has hall carpet, wood, kitchen tile, bathroom tile, bedroom carpet and stairwell concrete. The terrain `apt-door-mine` is the 7C door.

`HANDOFF.md` lists the tags and flags available for events.

---

## 17. Red rotary phones

`packs/rotary/rotary.js` adds one red rotary phone to every floor, when the floor loads:
- on its own little desk near where you arrive;
- at home, on the kitchen counter, with the note "It was here when I got the apartment."

Each phone has a 7-digit number, shown on a label on the phone.
- Dialing another phone's number teleports you to that floor, standing beside its phone, carrying everything, as the stairs would.
- Dialing the phone's own number gets a busy signal.
- Any other number gets nobody, or someone saying something odd. The same number always gets the same answer.
- Numbers you have seen are listed beside the dial.

The data:
- `LM.ROTARY.LINES` maps each `levelId` to `{ number, x, y, counter?, note? }`. A floor without an entry has no phone.
- `LM.ROTARY.ANSWERS` is a list of `{ who?, text }`.
- `LM.ROTARY.SPECIAL` maps particular numbers to their answers.

The item is `rotary-phone` (props `counter`, `note`). The flags are `rotaryUsed` and `rotaryTravel`.

---

## 18. Dressings

Dressings are furniture and fixtures placed over tiles: desks, tables, counters, pillars, lamps, pictures. They are ordinary items, so they can be solid, light up, or be used by the player. Some examples by set:
- **Office:** desks, counters, copiers.
- **Apartment:** bed, TV, oven.
- **Core:** tables, benches, torches.
- **Memos:** posters and notices.

**In the editor.** The map palette has a **Dressings** tab. It lists every dressing from every pack ("set") at once, so any floor can use any set's furniture, whatever its tile set.
- Filter by set (All sets by default), by kind (Furniture, Walls, Lights, Decor) or by name.
- Furniture with a front turns to the chosen facing (`props.dir`); `[` and `]` turn it.
- Entries the player can use are marked ●.

**What counts as a dressing.** Every item, except:
- pickups and chests;
- keys, gold, health and ammunition;
- trap hardware;
- invisible helpers.

An item can decide for itself with a `dressing` field: `'Furniture'`, `'Walls'`, `'Lights'`, `'Decor'`, `true` (work out the category), or `false` (never). The item page's **Basics → Dressing** sets it. Without the field the category comes from the item:
- **Walls:** wall-mounted.
- **Lights:** gives light and doesn't block.
- **Furniture:** blocks movement.
- **Decor:** everything else.

The game itself doesn't read the field.

**Generic dressings.** `packs/dressings/dressings.js` adds dressings that suit any floor:
- `dress-pillar`: a pillar standing on a floor tile, so the tile stays floor. It takes `shape: 'round' | 'square'`, `size` (radius in units) and `color`; the color defaults to the floor's wall color.

The editor side is `editor/js/dressings.js` (the catalog) and the Dressings tab in `editor/js/mapedit.js`.

---

## 19. The evening, Home (Chessboard 1), and the Library Maze

**Story (packs/home-story/story.js, the Home story pack).** A level can opt in with fields the story reads:
- `dinner: true` (the apartment): the dinner tasks and the two phone calls.
- `warped: true` (Home on Chessboard 1): the apartment's things read their words from `APT.WARPED` (`BOOKS`, `BOOKS_TEXT`, `CHANNELS`, `RADIO`, `RADIO_FACE`, `MAGAZINE`, `LAVA`, `FRIDGE_TEXT`, `OVEN_TEXT`, `NEIGHBORS`), the lights in each room dim at random, and the clock radio blinks.
- `noSignal: true`: the cell phone shows "No signal" instead of opening.
- `leaveFlag`: the flag that opens the roped-off stairs (tag `aptStairsDown`); the default is `timeToLeave`. Home on Chessboard 1 uses `libraryDone`.
- `exitTo` (any level): where the floor's stairs or exit lead, even after the editor's floor order has rewritten `next`. `exitIntro`: shown instead of the next floor's intro on the way out.

Tasks are shown under the scores with `MEMOS.hudLines`. The order of events, and every flag, is in `HANDOFF.md` ("The evening, Home (Chessboard 1), and the Library Maze").

**Phone calls (packs/rotary).**
- `LM.ROTARY.ring(game, { notice, answer, who, thought, onAnswer })` rings the floor's red phone until it's answered; `answer` paragraphs are split on blank lines.
- `LM.think(game, text)`: a thought, shown as a notification in italics.
- A line in `LM.ROTARY.LINES` may have `requires` (flag), `busy` ({ text, thought, flag, until }) and `pickup` (text; `**bold**`).

**Neighbor doors that lead somewhere.** `apt-neighbor` with `props.leadsTo: '<level id>'`: Try the knob opens the door and offers to go in. Arriving back from a floor whose id starts with `library` places you outside that door.

**Library pack (packs/library).**

| Id | Kind | Notes |
|---|---|---|
| `library`, `library-lower` | environment | Floor variants: 0 carpet, 1 wood (the stacks), 2 marble. Walls use the `bookcase` texture. |
| `lib-pillar`, `lib-exit-7f` | terrain | A marble pillar; the exit home (a door marked 7F, seen from inside). |
| `lib-table` | item | `w` (tiles), `dir` (`e`/`w` runs north-south), `lamp`. |
| `lib-cart`, `lib-shelf`, `lib-catalog`, `lib-desk` | item | Book cart; free-standing shelf; card catalog (cards in `LM.LIBRARY.CARDS`); circulation desk with a bell (`w`). |
| `lib-knowledge` | item | KNOWLEDGE IS POWER: `heal` (50), `damage` (extra damage multiplier, 0.6), `time` (30 s). Once. |
| `lib-quiet` | item | QUIET PLEASE: wall sign; `rect` [x, y, w, h] in tiles; `damage` per shot fired inside. |
| `librarian` | enemy | 170 HP. Melee slam (24) or three thrown books (11 each). Behaviour `librarian`. |
| `bookworm` | enemy | 14 HP, fast. Divides now and then (two generations at most; at most 14 on a floor). |
| `overdue-ghost` | enemy | 40 HP, flying. Behaviour `swooper`: circles, then charges (14); touching you costs 7. Drops gold. |
| `thrown-book` | projectile | The Librarian's. |

Levels: `library-1` (Library Maze 1) and `library-2` (Library Maze 2, the Lower Stacks), in `packs/library/levels/library-maze.js`.

---

## 20. The morning after, the town, and the Maze of Forking Paths

**Level fields the town reads**
- `town: { id, name, in, notHere, after? }`: a place on the Town Map. `id` is its pin in `TOWN.PLACES`. Once every room has been visited: "ALICE is NOT `in`." (with `notHere` as the text). `after` is a flag that must be set first.
- `alice: true`: shows the task Rescue Alice (once `aliceCalled` is set).

**Town Map** (`packs/town/map.js`): `TOWN.PLACES` = [{ id, level, name, sub?, note, x, y (on a 1000 × 640 map), links }], `TOWN.START`, `TOWN.PLAQUE`, `TOWN.reachable(game, place)`, `TOWN.openMap(game)`.

**Town pack (packs/town)**

| Id | Kind | Notes |
|---|---|---|
| `town-coffee`, `town-books`, `town-books-cb2`, `town-shop`, `town-park`, `maze-sandstone`, `town-map` | environment | Floor variants are listed at the top of `packs/town/environment.js`. |
| `grass`, `hedge`, `sandstone` | texture | A floor, and two wall painters. |
| `hedge-wall`, `door-stone`, `sphinx-gate`, `red-tile` | terrain | `door-stone` needs the Stone Key (key color `stone`). |
| `town-door` | item | Back to the Town Map (`to`, `label`). |
| `town-prop` | item | One item, many kinds of furniture (`kind`; `TOWN.KINDS`). `title`/`text` make it lookable. |
| `town-pennant`, `town-newspaper`, `town-search` | item | A pennant; a newspaper (`headline`, `text`); the invisible search helper. |
| `canopic-jar`, `sarcophagus`, `stone-coffin`, `sphinx`, `fire-jet`, `rockfall`, `spike-wall`, `chalice` | item | The maze's pieces: see the top of `packs/town/maze.js`. |
| `nancy-pace`, `barista`, `nook-clerk`, `nook-browser`, `nook-cat`, `gas-clerk`, `sundial-stranger`, `town-person`, `maze-merchant` | npc | `town-person` takes `lines: [[question, answer], …]`. Behaviours `seek-player`, `wait-for-player`. |
| `printing-press`, `minotaur`, `organ`, `skeleton`, `bone-pile`, `bone-crawler` | enemy | Behaviours `leaper` and `burst`. |
| `bone-wand` | weapon | Area blast, unlimited. |
| `bone-armor` | armor | `maxShield: 50`, no regeneration. |

Levels (`packs/town/levels/`): `town-map`, `town-coffee`, `town-booknook`, `town-booknook-cb2`, `town-gas`, `town-park`, `town-movie`, `town-hospital`, `town-headshop`, `town-vhs`, `town-donuts`, `town-police`, `maze-forking-paths`.

---

## 22. Back up the stairs (0.5.1)

The engine's stairs now work both ways and floors remember how you left them (`engine/SPEC.md` section 5). In The Linear Maze:

| Floor | Its stairs up (`<`) lead to |
|---|---|
| The 14th floor, Chessboard 1's office, the Town Map and the town's places | (no stairs up: they start somewhere else) |
| Floor 1, Sunken Cloister | the 14th floor, onto the Linear Conference Room's stair, with the door that wasn't there before still open |
| Floor 2, Ember Foundry | Floor 1 |
| Floor 3, Gilded Reliquary | Floor 2 |
| Apartment (Chessboard 0) | the floor you came from: Chessboard 1's office on the first evening (by Clock out), Home on Chessboard 1 after the night |
| Home (Chessboard 1) | the floor you came from: the Lower Stacks |
| Library Maze 1 | the floor you came from: Home on Chessboard 1's hall, back out through Dave's door (7F) |
| Library Maze 2 | Library Maze 1 |

Story floors reached by a door, a phone or sleep (Dave's door, the rotary phones, the morning after) remember how you left them too: the apartment in the morning is the apartment you left in the evening, and a library you've already been through is still cleared. The story's own state is in flags, so it reads the same either way; the floors' things (a used fridge, an opened chest, dead bookworms) now stay as you left them.

Any floor's stairs up can be pinned to a floor or closed: `stairsUp: 'level-id'` or `stairsUp: false` in its level file, or Floor settings → Stairs and elevators in the editor.

