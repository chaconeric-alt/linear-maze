# Hand-off notes: The Linear Maze's packs

Everything new lives in its own files, so the two of us can keep working in parallel and pass the folder back and forth without stepping on each other.

**0.5: where things are now.** The Linear Maze is one game in a workspace. Paths in these notes are relative to its folder, `games/linear-maze/`, except those that start with `engine/` and those marked (workspace). Every pack is a folder under `packs/`, with its floors in `levels/` and a `pack.js` that lists its files in load order. `index.html` and its script blocks are gone: the `packs` list in `game.js` loads the packs, in order, and the engine's `engine/loader.js` does the rest. The packs keep the order the old `index.html` had. The story file moved from `packs/apartment/` into a pack of its own, `packs/home-story/`, so it still loads after Rotary and Dressings.

## Who owns what

| Files | Owner | Notes |
|---|---|---|
| `engine/` (workspace), `packs/core/`, `packs/office/`, `packs/maze/` (`levels/01`–`03`), `tools/package.mjs` (workspace) | original author | Engine changes in 0.5: games and packs, the loader, the title screen and words from `game.js`, per-game saves. |
| `packs/memos/`, `tools/memos/` | additions | Posters, notices, the message board, cameras, desk toys, email, Alice's desk, the three scores. |
| `packs/chessboard/` (with `levels/04-chessboard-one.js`), `tools/chessboard/` | additions | The Office on Chessboard 1. |
| `packs/apartment/` (with `levels/apartment-chessboard-zero.js`) | additions | Apartment (Chessboard 0): home, the first floor of a run. |
| `packs/home-story/` (`story.js`, `levels/home-chessboard-one.js`) | additions | The evening's story (tasks, the red phone rings, the news) and Home (Chessboard 1). |
| `packs/library/` (with `levels/library-maze.js`) | additions | The Library Maze: two floors behind Dave's door, with Librarians, Book Worms and Overdue Ghosts. |
| `packs/town/` (with `levels/town-map.js`, `town-places.js`, `maze-of-forking-paths.js`) | additions | The morning after: the Town Map, the places you and Alice went, the Book Nook on Chessboard 2 and the Maze of Forking Paths. |
| `packs/rotary/` | additions | A red rotary phone on every floor, each with its own 7-digit number. |
| `packs/dressings/`, `editor/js/dressings.js` (workspace) | additions | Dressings: furniture and fixtures from any set, for any floor (the map editor's Dressings tab). |
| `game.js` | shared | The pack list (what used to be `index.html`'s script blocks), the title screen and the end-screen words. |
| `SPEC.md` | shared | This game's design spec; the engine's sections are in `engine/SPEC.md`. |
| `README.md` | shared | |
| `dist/` (workspace) | generated | Rebuilt with `node tools/package.mjs linear-maze`. |

To remove the additions, take their packs out of `game.js` (or remove them on the editor's Game page). The game then runs as it did in 0.2.

## How the new packs connect to the existing code without editing it

These are the only places the new packs depend on the existing code. If you change one of these, check the matching file.

1. **"Check email" on your desk.** `MEMOS.addActions('my-desk', …)` in `packs/memos/email.js` wraps the Office pack's `my-desk` `interact.use`, and adds one button to the pop-up it opens, just before the last quiet button. If `my-desk` stops opening a pop-up with `LM.ui.open`, the button disappears; nothing breaks.
2. **The score plate.** `packs/memos/scores.js` wraps `LM.ui.frame` to run after the engine's HUD update and appends a plate to `#hud .hud-tr`.
3. **14th-floor additions.** These are spawned on `levelLoaded` from a placement list (`packs/memos/placements.js`) in the 14th floor's tile coordinates. If the 14th-floor map changes, run `node games/linear-maze/tools/memos/check-placements.mjs` from the workspace: it flags anything that no longer sits on a wall facing open floor.
4. **Chessboard 1's cast and legend.** These start from the Office pack's definitions:
   - `real('priya', {...})` in `packs/chessboard/npcs.js` copies an Office NPC (look included) and replaces lines and behaviour.
   - The level's `legend` and `objectLegend` start from `meridian-fourteen`'s and override what changed.
   - The coworkers at `$ ? ] ; : ~` keep their names and looks from the 14th floor's legend.
5. **Chessboard 1's map** is generated: `node games/linear-maze/tools/chessboard/build-layout.mjs` copies the real office (columns 37 and east) from `packs/office/levels/00-meridian-fourteen.js` at the same coordinates, adds the east wing, checks reachability, and writes `packs/chessboard/layout.js`. Re-run it after changing the 14th-floor map if Chessboard 1 should follow.
6. **The phone.** The packs use `LM.phone.send/later` and add one thread to `LM.PHONE_THREADS` (`workday`). MESSAGE SCORE reads `P.data.phone.threads` (incoming messages minus unread).

Ids the new packs rely on:
- **Office items:** `my-desk`, `desk`, `bookshelf`, `art`, `whiteboard`, `tv`, `sign`, `logo`, `elevator`, `chair`, `cafe-table`, `plant`.
- **Core items:** `chest`, `crate`, `medkit`.
- **Office NPCs:** `receptionist`, `boss`, `priya`, `gary`, `tomas`, `kenji`, `coworker`, `sam`, `presenter`, `attendee`, `brenda`.
- **Other:** the `office` environment, and the core effects `alarm` and `flicker`.

## Story flags added

- **14th floor:** `emailTPS`, `emailAlice`, `alicePad`, `bobKey`, `aliceDecrypted`.
- **Chessboard 1:** `cb_t1`, `cb_t2`, `cb_t3`, `cb_reports`, `cb_serverDoor`, `cb_bobAppeased`, `cb_gertrude`.

Chessboard 1 also reads the existing `tookSalmon` (Priya has a fork) and `samComing`.

## Knobs

- `LM.CHESSBOARD.CONFIG` (`packs/chessboard/workday.js`):
  - `minutesPerSecond`: 0.5, so the 9-to-5 day lasts 16 minutes of play.
  - `failRestartsRun`: `true` means a wrong answer in the meeting restarts the whole run; set it to `false` to restart just the floor.
- `LM.CHESSBOARD.BOB` (`npcs.js`): Bob's speed, reach, wind-up and damage.
- `LM.MEMOS.POINTS` (`scores.js`): points per notice, message and email.
- `LM.CHESSBOARD.VENDING` and `LM.CHESSBOARD.HINTS` (`items.js`): vending stock, prices and hints.
- All the words are in `packs/memos/content.js`: posters, notices, toys and their honest versions. Emails are in `packs/memos/email.js`.

## Decisions worth a second opinion

- **Task 3 wasn't specified**, so it is Brenda's Mandatory Workplace Surveillance Training (a three-question quiz in the Training Room, formerly the Quiet Room). Kevin at the server farm won't let you in until tasks 1 and 3 are done.
- **"Caught up on your email"** means you have read the compiled TPS report. A typed guess at Alice's poem passes at 85% letter similarity, to forgive typos.
- **Bob is an NPC, not an enemy**, so he can't be killed. Bullets pass through him. You avoid him through the one-tile gaps between racks, or calm him with the key.
- **Gertrude is an ordinary enemy** and can be killed. She drops loot, and the supply closet holds a chest.
- **The end screen.** Chessboard 1 is the last floor, so finishing it shows the engine's existing victory screen ("You reached the bottom"), after a Chessboard end-of-day summary. The Reliquary's "Descend to…" button label is also the engine's.
- **Pre-existing:** dialog pop-ups show 1-pixel scrollbars at some window sizes. This happens with the original dialogs too (it's in the engine CSS), so I left it alone.

## Checks before handing back

From the workspace folder:

```
node games/linear-maze/tools/chessboard/build-layout.mjs
node games/linear-maze/tools/memos/check-placements.mjs
node tools/package.mjs linear-maze
```

Console helpers while playing:
- `LM.debug.warp('chessboard-one')` jumps to the new floor.
- `LM.debug.god()` turns on god mode.

## The editor (added after 0.3)

| Files | Notes |
|---|---|
| `editor/` (workspace) | The Linear Maze Editor (`editor/index.html`). Reads the game, never edits pack files. |
| `engine/editor-runtime.js` | Applies the editor's changes on top of every pack. Part of the engine. |
| `editor/edits.js`, `editor/sprites.js` | Generated by the editor's Save. Hand edits are fine as long as the file stays one `LM.editor.apply({...})` call. |
| `game.js` | Written by the editor's Game page (title screen, words, packs). `editorChanges: false` switches every editor change off. |

If you change a pack while the editor has a patch for the same id, the patch still applies on top (only the fields it lists). If you rename or remove an id the editor patched, the game logs `[LM editor] patch for missing ...` and carries on.

## Apartment (Chessboard 0)

A new first floor: home, the evening before the office. It's a normal pack and level, so it appears in the editor's Floors page like any other floor and can be painted and given events there.

- **Order.** `order: -1`, so a new run starts here. The stairs down lead to `meridian-fourteen`; the level's `next` can be changed, or the order rearranged in the editor.
- **Leaving.** The stairs down are roped off (terrain `apt-stairs-closed`, tag `aptStairsDown`) until the story flag `timeToLeave` is set. Set it from any event (the editor's `flag` effect). A flag trap in the level then swaps the tile for the real exit, and the stairs are already open if the flag was set before the floor loads.
- **Hooks for events.**
  - Tags: `aptStair` (the arrival stairs), `aptFront` (the mat outside 7C), `door7A`, `door7B`, `door7D`, `door7E`, `door7F`.
  - Flags set by things in the apartment: `aptPizzaOut`, `aptPizzaCooked`, `ateDinner` (dinner: see below), `snacked` (anything else from the fridge), `watchedTV`, `playedGame`, `readBook`, `relaxed`, `readMagazine`, `checkedLaptop`, and per neighbor `knock-7A`, `knob-7A`, `open-7A` (a neighbor's door opens once its `props.openFlag` flag is set).
- **The phone's clock.** It reads 6:30 PM here and is reset to 9:52 AM when you reach the 14th floor.
- **Shared code.** `packs/memos/email.js` gained `MEMOS.inboxKickers`, so the laptop's inbox isn't labeled "Workstation 14-112". That is the only change to an existing file besides `index.html` and the docs.
- **Not changed.** The phone's Notes tab still shows the office objective ("Get to your desk.") here, because that text is in the Office pack's `phone.js`.

## Red rotary phones (all floors)

`packs/rotary/rotary.js` puts a red rotary phone on every floor: on its own little desk near the arrival point, or on the kitchen counter at home ("It was here when I got the apartment.").

- **Dialing.** Each phone has a 7-digit number. Dialing another phone's number teleports you to that floor, standing beside its phone, carrying everything as the stairs would. Any other number gets nobody or a strange answer; the same number always gets the same one.
- **The numbers** are in `LM.ROTARY.LINES`, with each phone's tile:

  | Floor | Number |
  |---|---|
  | Apartment | 555-0107 |
  | 14th floor | 555-1414 |
  | Sunken Cloister | 555-0311 |
  | Ember Foundry | 555-0622 |
  | Gilded Reliquary | 555-0933 |
  | Chessboard 1 | 555-1001 |
  | Home (Chessboard 1) | 701-0555 (your own number backwards; connects only after the flag `heardReverse`) |
  | Library Maze 1 | 555-7323 |
  | Library Maze 2 | 555-2665 |

  A floor without an entry has no phone, so new floors need a line added.
- **Answers.** Wrong-number answers are in `LM.ROTARY.ANSWERS`, and numbers with their own joke are in `LM.ROTARY.SPECIAL`.
- **Remembered numbers.** Each phone shows its own number on a label. Numbers you've seen are kept in `P.data.rotary.known` and listed beside the dial.
- **Flags:** `rotaryUsed`, `rotaryTravel`.
- **For stories.** `LM.ROTARY.ring(game, { notice, answer, who, thought, onAnswer })` makes the floor's phone ring (sound, pulsing glow, the phone jumps) until it's answered. `LM.think(game, text)` shows the character's thought as a notification. A line can also have `requires` (a flag; until then the number gets an ordinary answer), `busy` (the phone can't call out: Home on Chessboard 1, until the flag in `busy.until`) and `pickup` (what you hear when you get through).
- **Replaced.** The rotary phone replaces the apartment's wall phone and its phone book.
- **The editor draft.** An earlier editor draft of a `red-telephone` item (4-digit numbers, which would have clashed with the Office pack's cell phone) has been removed from `editor/edits.js`. The rest of the editor's saved work there (furniture painters and the Home (Chessboard 0) tile set) is unchanged.

## Dressings (editor)

Dressings are furniture and fixtures from any set, usable on any floor. See `SPEC.md` section 18 (and `engine/SPEC.md` section 15.4).

**New files:**
- `editor/js/dressings.js`: decides what counts as a dressing, its set and its kind.
- `packs/dressings/dressings.js`: a pillar for any floor.

**Changes to the editor's existing files:**
- `editor/js/mapedit.js`: the Dressings palette tab, the facing buttons, and the `[` `]` keys.
- `editor/js/schemas.js`: an item's Basics tab has a **Dressing** setting.
- `editor/js/views/items.js`: set names come from the dressings catalog, and the "Furniture or decoration" template makes a dressing.
- `editor/index.html` and `editor/editor.css` (workspace): one script line and a few styles.

Nothing in the game changes except the new pack.

## The evening, Home (Chessboard 1), and the Library Maze

The story is in `packs/home-story/story.js`; all of its words are at the top of that file (`APT.TASKS`, `APT.PIZZA`, `APT.NEWS`, `APT.CALLS`, `APT.WARPED`).

**Apartment (Chessboard 0)** (the level has `dinner: true`)
- Tasks, top right under the scores: **Eat dinner** → **Cook pizza in oven** → **Eat pizza**, and **Watch TV to relax**.
- Fridge "Get frozen pizza" (`aptPizzaOut`) → oven "Cook pizza" (`aptPizzaCooked`) → kitchen table "Eat pizza" (`ateDinner`).
- **Event 1.** Three seconds after dinner the red phone rings: "That phone has never rung before!" Answering it: "The line goes dead." (`aptRing1`). The TV then has the breaking news (`aptNews`), and the character thinks "That explains the surreal experience at work today! I must be imagining things!"
- **Event 2.** Seven seconds after the news it rings again ("What is going on??"). A voice: "Call yourself in reverse order." Then "That voice sounds like me." (`heardReverse`). A third task appears: **Call yourself in reverse order**. Dialing 701-0555 takes you to Home (Chessboard 1).
- If the floor is reloaded mid-story, the next ring happens again.
- The stairs stay roped off (`timeToLeave` is never set by the story).

**Home (Chessboard 1)** (`packs/home-story/levels/home-chessboard-one.js`, `warped: true`, `noSignal: true`)
- A copy of the apartment's map, so either can change on its own. Warped pictures (`apt-art-warped`), books, TV parodies, a blinking clock radio, different furniture colors (`apt-bed` `blanket`, `apt-dresser`/`apt-nightstand`/`apt-tv` `color` props), a lava lamp on the kitchen table (`apt-kitchen-table` `lava: true`), the magazine *Architectural Disasters*, and each room's lights dimming at random (the hidden `apt-story` helper).
- Task: **I'm having a hallucination! Seek help!** The red phone is busy (`cb1TriedPhone`), the cell phone shows "No signal" (`cb1TriedCell`), or you step out into the hall (`cb1LeftHome`); any of these sets `seekDave` and the task becomes **See if Dave (Friend) is home**.
- A stray cat (`apt-cat`) sits at the end of the hall. Dave is 7F: Knock gets nothing; Try the knob opens onto the Library Maze (`props.leadsTo: 'library-1'`).
- Coming back from the library puts you outside Dave's door and sets `libraryDone` (the door is locked after that), and the red phone stops being busy (`busy.until`). **Changed after 0.4.3:** the task becomes **I'm tired! Get some rest**, and the bed offers **Sleep**: the screen goes black and you wake up in the Chessboard 0 apartment (see "The morning after" below). The stairs here stay roped off: `leaveFlag` is now `cb1StairsOpen`, which the story never sets. `exitTo` (`chessboard-one`), `outro` and `exitIntro` are kept, in case you want the stairs back.

**The Library Maze** (`packs/library/`, `packs/library/levels/library-maze.js`)
- Two floors: `library-1` (stairs down at the far corner) and `library-2` (the Lower Stacks; the way out is a door marked 7F, back to Home on Chessboard 1).
- Walls are bookcases (texture `bookcase`); `lib-pillar` marble pillars; dressings `lib-table`, `lib-cart`, `lib-shelf`, `lib-catalog`, `lib-desk`.
- Enemies: `librarian` (melee slam, or a fan of thrown books), `bookworm` (fast; now and then divides, at most 14 on a floor), `overdue-ghost` (flies, circles, swoops; touching you hurts; drops its unpaid fines).
- `lib-knowledge` KNOWLEDGE IS POWER: heals 50 and gives +60% damage for 30 s (props `heal`, `damage`, `time`). Once per book.
- `lib-quiet` QUIET PLEASE: a wall sign guarding `props.rect` [x, y, w, h]; each shot fired inside costs `props.damage` HP. Floor 1 has two quiet sections, floor 2 one.
- Floor 1 has a chest with the Scattergun. The Office pack already puts a pistol in your hand on any armed floor.
- The maps were generated and checked for reachability by a script (every floor tile and the exit are reachable); edit them freely in the editor.

New flags: `aptPizzaOut`, `aptPizzaCooked`, `snacked`, `aptRing1`, `aptNews`, `heardReverse`, `cb1Arrived`, `cb1TriedPhone`, `cb1TriedCell`, `cb1LeftHome`, `seekDave`, `triedDaveDoor`, `libraryDone`, `libKnowledge`, `libShushed`.

Changes to existing additions: `packs/apartment/items.js` (dinner steps, `APT.WARPED` words on a warped floor, color props, the TV drawn as a TV), `packs/apartment/environment.js` (`apartment-cb1`), `packs/rotary/rotary.js` (ringing, busy, `pickup`, three new lines), `editor/js/dressings.js` (the Library set name).

## Story exits and the editor's floor order (fix after 0.4.3)

The editor's floor order (`levelOrder` in `editor/edits.js`) sets every floor's `next` to the floor below it on the list, and finishing the last floor on the list wins the game. With the saved order (… Apartment, Home, Library Maze 1, Library Maze 2), Library Maze 2's door 7F went to the victory screen and Home's stairs led back into the library. Story floors now pin their own exits with three level fields:

- `exitTo`: where the floor's stairs or exit lead, whatever the floor order says. Set on `library-1` (to `library-2`), `library-2` (to `home-cb1`) and `home-cb1` (to `chessboard-one`). Applied on `levelLoaded` in `packs/home-story/story.js`.
- `exitIntro`: shown instead of the next floor's own `intro` on the way out.
- `leaveFlag`: the flag that opens roped-off stairs (tag `aptStairsDown`); the default is `timeToLeave`. Home on Chessboard 1 uses `libraryDone`.

Floors without `exitTo` still follow the editor's order. The 14th floor can't be revisited in the same run yet: the west-hall door only appears when `readNote` is first set, so a second visit has no way on.

## The morning after, the Town Map, and the search for Alice (after 0.4.3)

**The morning** (`packs/home-story/story.js`, words in `APT.MORNING`)
- Sleeping on Chessboard 1 (`slept`) fades to black and loads the `apartment` level again; with `slept` set it's morning: you wake by the bed, the phone says 7:12 AM, and the dinner tasks are gone.
- Task **Get ready for work**: the dresser pulses; **Get dressed for work** (`dressed`) → the red phone rings. Task **Answer the phone**: it's Alice (`aliceCalled`). Task **Rescue Alice**, and `timeToLeave` drops the rope.
- The apartment's stairs now lead to the Town Map (`exitTo: 'town-map'` in `packs/apartment/levels/apartment-chessboard-zero.js`; set it back to `meridian-fourteen` to send them to work). Its `outro` was rewritten for this.
- Hooks added to `packs/apartment/items.js`: the bed and the dresser ask `APT.STORY.bedPrompt`/`bed` and `dresserPrompt`/`dresser` first; the dresser glows while the story wants you there.

**The Town Map** (`packs/town/map.js`, `packs/town/levels/town-map.js`)
- A tiny room you never see; a drawn map covers the screen. Pins are in `TOWN.PLACES` (name, note, position, `links`). Blue: the start (the Coffee Shop), anywhere you've been, and anything linked to somewhere you've been. Red: too far ("I'd have to go past the … first"). The Gas Station links to all three middle pins.
- First visit: the plaque (`townPlaque`). Clicking a blue pin: VISIT <PLACE>? with the note; Visit loads the place. Every place has an EXIT (`town-door`) back to the map.
- A place is any level with `town: { id, name, in, notHere, after? }`. Once you've been in every room: "ALICE is NOT in …" (`searched-<level>`; `after` holds it back until a flag is set). The map shows searched pins with a tick.
- The task **Rescue Alice** shows on every level with `alice: true`.

**The places** (`packs/town/levels/town-places.js`; people in `packs/town/npcs.js`)
- **Coffee Shop:** Nancy Pace walks up to you and warns you about CPD (`nancyWarned`). The barista (Jody): "She was here. She said she was looking for a way out of the maze."
- **Book Nook:** the newspaper (Dr. Chanard); the clerk (Walt): "Not for a while." Pet the cat: "Not yet, human. Go ask Alice," and you're in the **Book Nook on Chessboard 2** (`town-booknook-cb2`): dark, decayed, flickering, Book Worms and the **Printing Press**, which leaps at you. Killing it (`nookPressDone`) brings you back; the cat says "She went in the maze. Follow that rabbit!" (`nookCatSaid`).
- **Falcon Gas:** Dwayne: Alice came by dressed for jogging. Alice's car is parked out front.
- **Forking Paths Park:** a hexagonal park. Near the sundial: "Alice really liked the sundial." The odd-looking man: "Do you know what a Grabe is?…" and you're in the **Maze of Forking Paths**.
- **Movie Theater, Hospital, Headshop, VHS Rental, Donuts Plus, Police Station:** small stub levels (a room or two, a person who knew Alice, a few things to look at), ready to be fleshed out.

**The Maze of Forking Paths** (`packs/town/levels/maze-of-forking-paths.js`, `packs/town/maze.js`, `packs/town/enemies.js`)
- A generated labyrinth with Minotaurs, canopic jars (organs jump out if you get close; shoot the jar first and it just breaks), the Bone Wand at the farthest dead end, the Fire Corridor (`fire-jet`), the Hall of Falling Stone (`rockfall`), the Corridor of Spikes (red squares → `spike-wall`), the Catacombs (`stone-coffin` skeletons, a `bone-pile`), the Sarcophagus (STONE KEY → `door-stone`), the Cloaked Merchant (health, medkit, shells, Bone Armor, the riddle's answer), the Chalice of Life or Death (smell twice), a trapped floor (darts) and the Sphinx Gate (riddle in `TOWN.RIDDLE`; the answer is Time).
- Leaving sets `mazeDone` and goes back to the Town Map; the park then counts as searched.
- Bone Wand: a slow blast that hits a 96-unit circle; it never runs out. Bone Armor: +50 as a shield with no regeneration, so it wears away.

**Worth knowing**
- The editor's saved floor order (`editor/edits.js`) starts a new run on the 14th floor, not the apartment. The story still works from the apartment (`LM.debug.warp('apartment')`), or move the apartment to the top of the editor's Floors list.
- The new floors aren't in the editor's floor order, so they come after it. Every story exit is pinned (`exitTo`, `town-door`), so the order doesn't matter for them.
- The maps were generated by a script that checks every floor tile, room and exit can be reached. Edit them freely in the editor.

New flags: `slept`, `woke`, `dressed`, `aliceCalled`, `townPlaque`, `visited-<place>`, `searched-<level>`, `nancyWarned`, `askedBarista`, `nookCatPetted`, `nookPressDone`, `nookCatSaid`, `gasHint`, `sundialNote`, `metStranger`, `jarWarned`, `stoneKey`, `riddleBought`, `riddleSolved`, `mazeDone`.

## 0.5: the engine, the games and the editor in their own folders

**What moved.** The workspace's `README.md` has the full table of old and new paths. For this game:
- every pack is now `packs/<pack>/`, with a `pack.js` and its floors in `levels/`;
- the three maze floors are the `maze` pack;
- `story.js` is the `home-story` pack;
- the editor's saved files are in `editor/`;
- the two tools are in `tools/`.

**What changed in existing files.**
- `packs/chessboard/workday.js`: `CB.saveProgress` writes through `LM.saves.write(...)`, so it uses this game's save slot (still `linear-maze-save-v1`). This is the only code change to a pack.
- Comments that named old paths (`levels/...`, `packs/apartment/story.js`) now name the new ones. The two tools read the new paths. `packs/chessboard/layout.js` was regenerated, and only its header comment changed.
- `editor/edits.js` is the 0.4.4 version (saved October 13): the furniture painters, the Home (Chessboard 0) tile set and the floor order.

**Dead Signal.** The editor save of October 14 had removed all 22 Linear Maze floors and added three new ones. That save is now a game of its own, `games/dead-signal/`. Its manifest loads `{ pack: 'linear-maze/*', levels: false }`: every pack here, without its floors. So changes to these packs show up in Dead Signal too. Keep that in mind when renaming an id it uses. The Game page in the editor lists anything a game's floors use that no loaded pack provides.

**Ids other games can rely on.** Anything a game borrows from here is referred to by id. The lists under "Ids the new packs rely on" above apply to other games too.

## After 0.5.0: turning tiles and furniture

**Engine.** A legend entry's `rot` (0–3 quarter turns) turns its tile: the painting, its `rect`/`rects` (so collision and shots), and its animation. Walls and other `tall` terrain don't turn. A door's `rot` only says which way it runs (even: east–west, odd: north–south); without one, a door lines up with walls, other doors and thin solids that reach its side. Any piece of furniture takes `props.turn` (quarter turns), which turns its drawing, sprite, glow, box and multi-tile footprint; pieces that read `props.dir` still use `dir`. See the engine spec, 6.2, 6.3 and 6.6.

**This game's packs.**
- `packs/office/environment.js`: new terrain `glass-elbow`, `glass-junction`, `glass-cross`, `partition-elbow`, `partition-junction`, `partition-cross`. Each is drawn one way round (elbow: east and south; junction: east, south and west) and turned with `rot`. `thresholdBake` uses `info.across` from the engine.
- `packs/core/terrain.js`: `doorBake` uses `info.across` from the engine, so the painted door and the Door always agree.
- `packs/core/environments.js`: `LM.paintFloor` keeps the floor under a turned piece the same way round as its neighbours (a turned plain floor tile turns its own pattern).

No existing floor changes: every door on every floor of both games runs the same way as before (checked), and no floor had a `rot`.

## 0.5.8: curved rooms, the floor below, pulls and snares, reflecting, endings

Built for Dead Signal's Floors 5 and 5a. `engine/curves.js` (a level's `ovals`: curve tiles made from the wall, `level.curveAt` / `curveIn`; collision pushes a body inside the ellipse off the curve, shots and sight and light are cut by the true arc, the bake draws the curve, its face along the northern arc and its lip; recessed lights in a ring with glowing lenses and a cove). The floor below (a level's `below`, terrain `seeBelow`; `render.js` bakes the other level's chunks at a smaller scale and draws them under this floor with parallax, darkened, with a rim shadow). An item's `pull` (`LM.physics.pull`), `snare` and `burns`; an enemy's `reflect` (`LM.combat.reflects`, `reflect`; `def.onReflect`); a projectile's `onImpact`; a status's `bound`, `tint`, `tintAlpha` and `fire` (`LM.status.bound`, `tint`); `game.checkpointHere`, `game.ending` / `endingAction`, `LM.ui.showEnding` and the trap effects `checkpoint` and `ending` (`engine/comms.js`); stairs that are `quick`; held-open doors (`door.held`, remembered); `level.walkable(x, y)`. The editor's floor settings → *Curved rooms* and *The floor below*; the `open` effect's *hold*. Engine spec sections 5, 6.2, 6.4–6.6, 6.8, 6.17 and 6.22–6.24. Fixed: a status with `cures` was lost when it cured something (clearing replaced the list it was about to be added to).

**This game's packs.**
- `packs/core/enemies.js`: two new attacks, `gaze` (meet its eyes and a status lands, then another) and `blink` (vanish, arrive beside the foe, strike). Nothing in this game uses them.
- `packs/core/effects.js`: the `open` effect's `hold`.
- `packs/core/environments.js` (`LM.paintWall`) and `packs/library/environment.js`: a wall next to a curve tile doesn't paint a face toward it (the curve has its own).

No floor of this game has ovals, a floor below, or any of the new fields, so every floor plays and looks as before (checked).

## 0.5.7: objectives, story lines that stop the game, hitboxes, waking sides

Built from Dead Signal's playtests. `engine/objectives.js` (a level's `objectives`: when / any / not / done flags, optional, targets by tag, item, enemy, npc, tile or room; the HUD plate under the health, targets pulsing near you and marked on the minimap, the pause screen's list; render and minimap hooks; the editor's floor settings → Objectives). `engine/comms.js`: a speaker's `pause` (and a line's `pause`) stops the game for a conversation in the middle of the screen, Continue / Skip, game state `'talk'`, not in a fight; the pause screen's *Story lines* choice (localStorage `lm-talk-pauses`); the transmission form's pause field. An enemy def's `hitbox` (`LM.combat.touches`), a pack's `factionWake` (`LM.factions.wake`, `playerHits`), and floor memory keeps `aggro` and a runtime tag. Engine spec sections 5, 6.5, 6.8, 6.16, 6.20, 6.21 and 15.5.

**This game's packs.** Nothing changed: no Linear Maze floor has objectives (the office's phone keeps its own "Right now"), no speaker pauses, no enemy has a `hitbox` and no pack wakes a side, so every floor plays as before (checked). A Linear Maze floor can now be given `objectives` in the editor.

## 0.5.6: parked elevators, last stands, gadget auras

Built for Dead Signal's Floor 4 (the AEGIS field). An elevator's `parked` (keyed by floor: a flag, or `{ flag, cargo }`): with no power, the car waits on that floor lit with its doors held open and its panel dead (the `elevatorParked` words), and if the flag is set while you're there it comes up the shaft, sets its cargo down inside and rings first (`LM.elevators.parkedAt / parked / live`; the editor's elevator inspector has **Parked here**). `LM.combat.lastStand`: armour, gadgets and blessings can have `lastStand(game, P, opts)`, asked when a hit would kill the player. A gadget's `resist` counts like armour's; `drawAura` draws round the player all the time, and `shieldRing: false` hides the plain shield ring. Engine spec sections 4, 6.7, 6.12, 6.15 and 15.5.

**This game's packs.** Nothing changed: no Linear Maze floor parks an elevator, and nothing it carries has a `lastStand` (checked; every floor plays as before).

## 0.5.5: waves, letting things out hunting

Built for Dead Signal's Floor 4. The `spawn` effect's `as` tags what it spawns, and a `clear` trap keeps looking for its group while it's empty, so it can watch a wave spawned later (before, a `clear` trap with nothing tagged at the start never fired, which no floor relied on). The `faction` effect's `aggro`. `LM.ai.goTo`'s search limit (`lim`, default 40 as before). Engine spec sections 6.5, 6.8 and 6.20.

**This game's packs.** `packs/core/effects.js`: `spawn`'s `as` and `faction`'s `aggro`. Nothing else changed; every Linear Maze floor plays as before (checked).

## 0.5.4: factions

Built for Dead Signal's Floor 3. Enemies have a side (`e.faction`, default `'monster'`) and a foe (`e.foe`, `LM.ai.foe`); the game's table (a pack's `factions`, laid over by a level's) says who fights whom; `game.setFaction`; trap effects `faction` and `branch`; a status's `countdown`, `stack`, `keep`, `update` and `onEnd` reason; `LM.nav.step` and `LM.ai.goTo` for enemies chasing something other than the player. Engine spec sections 5, 6.5, 6.8, 6.17 and 6.20.

**This game's packs.** `packs/core/enemies.js`: every core behaviour and attack goes for the foe instead of `game.player` (with this game's default table the foe is always the player), attacks say who struck (`by`), the nova hurts everything its faction fights (the player, here), and a melee swipe or a charge needs a clear way to land (it no longer hits through a glass partition). `packs/core/effects.js`: the `faction` and `branch` effects, and `spawn`'s `faction`. Nothing else changed. Every Linear Maze floor plays as before: with no factions declared, monsters still want only the player and the player's shots still hit everything (checked, every enemy in both games).

## 0.5.3: statuses, boss bars, more ammunition, key items

Built for Dead Signal's Floor 2. `engine/status.js` (the `statuses` kind; `LM.status.apply / has / clear`; anything that hurts can carry `status`), a def's `bossBar` (a named bar, `phases`), `LM.defineAmmo`, `game.giveKeyItem` (saved with the player; the inventory's Carried list), an enemy's own `e.armor` and `onHurt`, a projectile's `quiet`, `LM.comms.speaking()`. Engine spec sections 5, 6.4, 6.5, 6.7 and 6.16–6.19.

**This game's packs.** `packs/core/enemies.js`: every core attack passes its `status` to the hit (none of this game's attacks has one, so nothing plays differently). `packs/core/items.js`: the loot tables' ammunition pick knows ammunition a game adds. Nothing else changed; every Linear Maze floor plays as before (checked).

## 0.5.2: stairs of their own, elevator power, clearance doors, transmissions

Built for Dead Signal's Floor 1; nothing in The Linear Maze uses them, and none of its files changed. A level's `stairs` (by tag: `to`, `until`, `locked`, `arrive`, `dir`, `go`), an elevator's `power` and `stops`, a door's `flag` / `need` / `color` (clearance), and `engine/comms.js` (transmissions; the `speakers` kind; the `transmission` trap effect). Engine spec sections 5, 6.2, 6.8, 6.15 and 6.16. The editor's map can paste a copied area onto another floor now (Ctrl+V used to work only on the floor it was copied from).

## 0.5.1: the stairs back up, floors that remember, elevators

**Engine.** Leaving a floor by any route takes a snapshot of it (`engine/memory.js`); coming back lays it over the freshly built floor. The entry stairs (`<`) lead back up to the floor you came from (or a level's `stairsUp`; `false` closes them); stairs under you on arrival wait until you step off. A second trip down a floor's stairs skips the summary screen. Elevators (`engine/elevators.js`) are a new registry kind, built into every floor they stop at. See the engine spec, sections 5 and 6.15.

**What pack code should know.**
- `levelLoaded` handlers run on every arrival, returns included. What they spawn (`spawnItem`, `spawnNPC`, `spawnEnemy` while the handler runs) is never remembered with the floor, because they spawn it again: the rotary phones, the town's search spot, the memos and desk toys, the evening's `apt-story`. Handlers that change things idempotently (the apartment's stairs, `exitTo`) are fine as they are.
- Things spawned later (a `game.schedule` from a handler, an attendee who regenerates after Dana shoots them) are remembered like anything else. A scheduled spawn that hasn't happened when you leave won't happen: timers don't survive leaving a floor. Chessboard 1's regenerating attendees are the one place this shows (leave mid-regeneration and that seat stays empty), and only through a teleport, since Chessboard 1 has no stairs.
- State on items and people is remembered when it's plain data (`it.used`, `it.opened`, `it.loot`, `npc.mem.*`, `npc.gone`). This game's story keeps its state in flags, so nothing in it needed changing.
- `CB.saveProgress` (Chessboard 1's own checkpoint) writes through `LM.saves.write`, which now adds the floors' memory to it.

No level files changed. The Linear Maze has no elevators; its elevators are still decoration.
