# Dead Signal — design and build plan

Plan · October 2026 · for the Linear Maze engine 0.5.1 (built so far on 0.5.11)

This file is the plan for building Dead Signal into a whole game: the story, the building, six maps (five floors and a basement) chapter by chapter, the monsters, robots, traps, puzzles, weapons, items and dressings on each, and the engine and pack code the game needs that the engine doesn't have yet. It is written to be handed to Claude a milestone at a time (section 11 has a prompt for each), together with the workspace, `engine/SPEC.md` and this file.

Everything here is a suggestion to be argued with. Names, numbers and lines of dialogue are placeholders in the right register; replace any of them. Where this file says "existing", the thing is already in the engine or in a Linear Maze pack that Dead Signal loads. Where it says "new", it has to be built, and section 8 says how.

**Where it lives.** Dead Signal (`games/dead-signal/`) is already a lab game in progress: *The Dead Signal Laboratory*, *The Sterile Annex*, *The Complex*, the Knife Fighter. The name fits the story below (the AI's signal to the outside world is the one that went dead), so this plan builds the game there. Section 2.5 says what to do with the three floors that exist.

**Status (October 21, 2026): milestone M1 is built** (engine 0.5.2). Floor 1, *Lockdown*, plays from the closet to Stair A; the October floors follow it as placeholders (Floors 2–4). Where the build differs from this plan:
- Floor 1 was built fresh (`packs/ds-story/levels/f1-lockdown.js`) rather than grown out of *The Complex*, which had little on it; *The Complex* stays in the run as a placeholder (the editor's Remove would delete an editor-made floor outright).
- The Scalpel Drone is a new robot (`ds-scalpel-drone`); the Knife Fighter is left as it was for the October floors.
- The route: the west corridor's north end is shuttered, so the way on is the glass door into the lobby (two Sentinels, the Warden Drone, two cameras), the gates, then the security office. The live puddle is just outside the closet, with breaker W-3 beside it. The hard hat is in Facilities, not the Mail Room. Voss opens Stair A (and the corridor shutter) four seconds after the terminal, without waiting for him to finish talking.
- Floor 1 also has a network room (ARIADNE's node 01 and fragment 3), records, a loading bay, first aid, a conference room and a visitor lounge, to fill the 80 × 50 plan.
- Done from section 8: E1 (a level's `stairs`), E3 (elevator `power` and `stops`), E4 (clearance doors: a door's `flag`), E11 (transmissions: `engine/comms.js`, the `speakers` kind, the `transmission` trap effect), and the `patrol` behaviour (E9, in `ds-robots`, with cone vision and hearing). The editor edits all of them (`engine/SPEC.md` 15.5).

**Milestone M2 is built** (engine 0.5.3): Floor 2, *Synthid Research* (`packs/ds-story/levels/f2-synthid.js`), redesigned from the Intake floor this plan first had (section 4.2 is the floor as built). Where M2 differs from the plan:
- Floor 2 is the synthid research floor: the education wing, administration, four labs (membranes, mycology, the air garden, oncology) and Shelter B. Its enemies are the labs' own robots (LabMate, Courier, Bench Arm, Sterilizer, DOCENT-3); its one monster is the Congregation, a named fight in the shelter. Glass Lungs, the Tally, Hollow Coats, the Hauler, the airlock and the sequencer puzzle are not on it; they can go to later floors.
- Factions (E5) moved to M3: Floor 2 has robots, and one monster at the end, so they never meet. Floor 3, where monsters roam, needs them.
- Done from section 8 instead: E6 (statuses, `engine/status.js`; the game's own: sedated, chilled, staggered, held, snared, spores, UV burn), E8 (named boss bars with phases), E14 (`LM.defineAmmo`: cryo), E15 (key items: Mori's card). Area hazards (E7) are still a pack's own: the broken fungus chambers put spores on whoever stands near them.
- ARIADNE's fragments 4 and 5 were rewritten for this floor (the template run; the shelter's air); the dream lab's fragment folded into 6.
- Floor 1's text that pointed at an Intake floor now points at Floor 3 by way of Floor 2's sample lift, and its security monitors show Shelter B.
- The Sterile Annex leaves the run's middle: the order is Floor 1, Floor 2, then *The Dead Signal Laboratory* and *The Complex* as placeholders for Floors 3 and 4, and the Annex last.
- Next: milestone M3 (factions, statuses for monsters and hazards, Floor 3).

**Milestone M3 is built** (engine 0.5.4): Floor 3, *Gestation* (`packs/ds-story/levels/f3-gestation.js`), redesigned from the vat-hall-and-dream-lab plan (section 4.3 is the floor as built). Where M3 differs from the plan:
- Floor 3 is a ring of corridor round the vat hall, with restricted labs off it, each with its own specimen, most in containment and some not: Lab 3-A (the Midwife, which lays eggs in you), 3-B (Tenants, which ride the dead), 3-D (Flesh Lanterns, in the dark), 3-E (juvenile Congregations in pens), Cell S-41 (empty; transferred to Five). The partners' briefing suite sells it all as "macroscopic synthids". Voss wants you across the lobby and up Stair B without looking; Stair B wants Level 3 clearance, so you end up looking.
- Factions (E5) are in the engine (section 8.2): on this floor the robots in defence mode and the specimens fight each other, and ARIADNE's Orderlies fight both, on your side (a green visor and a blue ring). A relay on the floor gives them their orders; powering it wakes three more.
- The way up is **Stair B** (the east stairwell): Stair A's flight up is filled with biocontainment foam. Floor 4 should start at its east stairwell.
- The Sitter is built as the plan's opposite: not fast and unseen, but slow, enormous and all but bulletproof (95% damage reduction), too big for a door, heard walking long before it's seen. Two of them: one in the vat hall, one walking the ring. `unseen` (E9) is still to build, for something else.
- New statuses: `implanted` (a 90-second countdown that hatches Nursery Grubs out of you unless a purge station or a purge injector flushes it; it follows you up the stairs) and `infected` (stacking damage over time). Status countdowns, stacking and `keep` are engine features now.
- New: the Plasma Cutter (cells, a short burning arc) is in the pump room, not a vault; there's no dream lab, fuse, vault keypad or Neural Visor on this floor. The dreamers are named on the specimen files instead (Brandt, Pell, Thale, Moss; Voss's Specimen 41 is upstairs), and the vat hall's intake terminal lists all five.
- Mother of Teeth, the Weeping Choir, Kneelers, the Grief Engine and the Surgical Arm are not on Floor 3; they can go to Floor 4 or the descent.
- On the stairs, Voss makes his case, and what he says depends on what you've read and seen (a `branch` trap effect: four versions, from "You didn't look. Good man." to admitting he signed the Shelter B trial). The stairs wait until he's finished.
- Next: milestone M4 (Floor 4).

**Milestone M4 is built** (engine 0.5.5): Floor 4, *the Proving Grounds* (`packs/ds-story/levels/f4-proving.js`), redesigned from the robotics-and-trials plan (section 4.4 is the floor as built). Where M4 differs from the plan:
- Floor 4 is the floor where the board watched people die, and tonight you're the subject. The trial system runs itself (a recorded game-show announcer, odds boards with your name on them): the gate drops behind you, three staff in orange jumpsuits are let out ahead of you and the dogs behind, and the way across the floor is the Run, a braided maze of steel with blade floors, shock plates, dart corridors, ceiling turrets and three cage rooms, to the Box (the board's seats) and the arena under it, where the final round is three waves ending with the house favourite. Winning ends the trial and opens the west side.
- The monsters are the board's nightmares, each with its own private suite, sealed; ARIADNE opens them as you pass and Voss begs you not to go in: the Nursery (something under a child's bed, with a grown woman in it), the Party Room (the Jester, three heads, a named fight) and the Long Room (six Diners strapped into chairs at a long table, released by the gong; the main course is a man, alive, under the cover). Each has a reward. The Dream Studios are where the board's nightmares are recorded: sleep pods, playback, design sheets, and holograms of the nightmares that turn to look at you.
- No robot factory: no Assembler, conveyors, crushers, junctions, Pacifiers, Haulers or Tick Mines (E10 and E13 not needed yet). Robots are Security Command's Sentinel and turret, and the Run's turrets. The Incinerator is in Moss's armory (code 4471, from Kwan), not dropped by a Hauler. The Railgun and EMP grenades aren't built.
- New monsters: Grinners (Moss's pack hounds), rats and the Rat King (Thale's), the Jester (Voss's), the thing under the bed (Brandt's), the Diners (Pell's), Smiler (the arena's). New: captives, people the monsters hunt (faction `captive`); feeding (anything with nothing to fight eats the dead).
- Moss's incident log is the proof the plan wanted: Voss ran LABRYS to stop ARIADNE's transmission, and called the containment failure acceptable. The trial programme says the Director picked you as tonight's subject at 02:41.
- Engine (0.5.5): waves (the `spawn` effect's `as`, and `clear` traps that wait for a group spawned later), the `faction` effect's `aggro`, `LM.ai.goTo`'s search limit.
- The way up is Stair A again (the west stairwell); Stair B is where you came in. On Stair A's landing Voss explains himself, by what you found (the log, the suites, the people you saved).
- Added after M4 (engine 0.5.6), because the floor is hard: **the AEGIS field**. When Voss has finished welcoming you (or as soon as you step into the lobby), the dead freight car comes up the shaft on what power ARIADNE can spare, rings, and opens: in it, a hard case with ARIADNE's eye on the lid. ARIADNE: `YOU WILL NEED THIS. DEATH HERE.` Voss: the car hasn't moved since the lockdown; take it if you have to, don't listen to it. The AEGIS is a personal containment field worn over your armour (a gadget, no slot): a strong shield that comes back fast, damage taken off whatever gets through, grips slide off it; when a hit would kill you it overloads instead, throws everything off you, and needs a minute to mend. Every number is in `packs/ds-arsenal/aegis.js` (`TUNE`), to be set with the floor's difficulty. Engine: a parked elevator with cargo (`parked`), gear with a `lastStand`, gadget `resist` and `drawAura`.
- After playtests (engine 0.5.7): players weren't sure what to do next, missed Voss, couldn't hit some dogs, and missed the armory code. Now every floor has **objectives** on the HUD (each floor's *Objectives* paragraph below): the thing to find pulses when you're in its room and is marked on the minimap. **Voss and ARIADNE stop the game**: their lines are read in the middle of the screen with Continue and Skip (unless you're in a fight, when they play in the corner as before; the pause screen can turn it off). The **Grinners** have a hitbox the length of their bodies, and a **specimen** you shoot wakes and comes for you instead of letting shots through (caged ones are behind bars that take the shot). Dogs let out stay out if you leave the floor and come back. **Kwan** speaks up when you reach her in the Box, and the armory code is then known (`knowsArmoryCode`, also from her body); the armory keypad reminds you of it.
- Next: milestone M5 (Floor 5).

**Milestone M5 is built** (engine 0.5.8): Floor 5, *the Executive Floor* (`packs/ds-story/levels/f5-executive.js`), and above it Floor 5a, *the board's private floor* (`f5a-private.js`), in a new pack of their own, `ds-executive` (environment, furniture, nightmares, staff, gear). Section 4.5 is the floor as built; it replaces the Penthouse plan. Where M5 differs from the plan:
- Floor 5 is really two floors. Five is the floor the board works on: four corner offices, each behind a secretary's desk, each with a private stair up to 5a; Reception, the Typing Pool and the Clerks' Row; the robotic kitchen and the Executive Dining Room; the Gallery over the Proving Grounds (a glass floor: Floor 4 is down there, as you left it) and the Private Box over the Run; the Robot Chambers; the Statue Hall and the Rotunda (Andromeda and Cetus in the fountain); the Smoking Room; and the Boardroom, behind blast shutters, rail guns and two Praetorians, where the board are safe and stay safe. 5a is the board's own: the Library, the Director's rooms behind a bookcase, the Archive, the Director's Study, the Private Landing and the board's car, the **Control Room**, the Dream Archive, Building Systems, the Nest (Brandt's spa, where the Swaddler weaves the staff into eggs), the Server Room (ARIADNE's node), the Atrium (it looks down on the Rotunda) and the Robot Bay.
- **The mainframe is in the basement, and it is ARIADNE.** Voss sends you to the Control Room to purge it; ARIADNE asks you to give the elevators power instead, so the private car can take you down to her. The console offers both. Purge the core and the game ends (*The Dead Signal*, with *Choose again*: a checkpoint is saved as you step into the Control Room). Restore the power and Voss turns every robot on the floor on you, the Praetorian in the Robot Bay wakes, and the private car takes you to Sub-level B: the end of chapter five. There is no descent by the stairs in this shape of the game: the private car is the way down (sections 1.4 and 2.3).
- No Collection, Chapel, Recital Room, wine cellar or creed puzzle. The puzzle is the Director's bookcase (which book does he read?). The master card is in his bedroom, behind it. No basement code: the way down is the car. Floor 1's east stairwell to Sub-level B stays sealed (it used to open for the master card too; now only `basementOpen`, which nothing sets), so the car is the only way down.
- New monsters (section 5.2): the Gorgon (Medusa, on her plinth in the Statue Hall: meet her eyes and you turn to stone), Scylla (six heads in the Rotunda's pool) and Charybdis (a whirlpool), the Mother of Teeth (armoured on its back), the Tally (a centipede of hands that steals ammunition), Patrons and Faceless Ushers, and the Swaddler and its Swaddlings (silk that holds you fast and burns at a touch of fire). New robots (5.1): Concierges, the kitchen's Chef and arms, rail guns, Praetorians (they send your shots back).
- Engine (0.5.8): curved rooms (the offices, the Gallery, the Rotunda, the Boardroom, the Control Room, the Director's bedroom are ovals lit by recessed ceiling lights), seeing the floor below (the Gallery, the Private Box, the Atrium), `pull`, `snare`, `burns`, `reflect`, `gaze`, `blink`, `bound` and `tint` statuses, projectiles' `onImpact`, `quick` stairs, endings and checkpoints.
- Sub-level B is a landing only: the car opens on it, ARIADNE speaks, and the chapter ends (*Keep exploring* or *Back to the title*). Section 4.7 is still the plan for it.
- Next: milestone M6 (Sub-level B).

**Milestone M6 is built** (engine 0.5.9), and with it the end of the game: Sub-level B, *Tartarus* (`packs/ds-story/levels/b1-sublevel.js`, in a new pack, `ds-tartarus`), and the return to Five, where the board are. Sections 4.7 and 4.8 are the floor and the ending as built; they replace the Hatchery and the Board-fight plans (and M8 with them). Where M6 differs from the plan:
- **Sub-level B is Tartarus**, a dungeon of failed experiments that are too powerful to destroy and can only be kept: bronze vault doors like a bank's, each with windows so the board could come down and look. In them, the **Titans**: synthids that don't age, don't die and grow back from almost anything (the Leviathan, the Behemoth, Tiamat, the Eye of Judgment, the Circle of Wings, the Frog, the Crystal Garden, the Hundred-Handed). Bronze Wardens walk the halls. Things from the floors above have got loose down here. No generator, no Sermon, no brood, no puzzles of valves and turbines.
- **ARIADNE's core** is behind nine armoured plates, and the board's plate cutters are taking them off, one every four minutes, while you explore (they stop at eight). You can't stop them with what you carry. ARIADNE sends you to Containment Control, which can open the **Tartarus Armory**: weapons built to fight the Titans (the Prometheus Lance, the Stasis Projector, the Singularity Driver, the containment suit).
- **The Heirs** (Line H) are in Containment Control: grown from the board's own tissue to inherit the earth, better than us in every way they can measure. Their offer: kneel, lay down your weapons and armour, and be kept as a pet; or be eaten. Kneel and they really do take it all, mock you and eat you (*Good Pet*). Refuse (or shoot first) and the ones at the console start opening the Behemoth's vault: kill them before the countdown ends, or it's out, and that's the end (*Tartarus*).
- Step into the core and the cutters start on the ninth plate: kill them before it falls (*The Dead Signal* again if it does). Reconnect ARIADNE, and she takes the building: the Wardens are hers, the lights come up, the car goes to Five.
- **ARIADNE can't harm the board**: she was made not to, and won't unmake it. She opens doors. On Five, the boardroom's Praetorians and rail guns answer to the room, not to her, and the board's Enforcers come up behind you. Put the guards down and she opens the shutters.
- **The board are five frightened people**, not monsters, and there is no boss fight. Voss makes his case (the courts, due process, don't become what you think we are); you can ask him three things, and ARIADNE records his answers. Let them go, or don't. The ending depends on who's alive and what the world gets to see (section 1.7): the best is all of it, *The Signal*.
- Engine (0.5.9): enemies that can't be hurt (`immune`), shots no mirror turns (`reflectable: false`), items with a lifetime (`life`, `onExpire`), a draw radius for big pieces (`drawRadius`), a pull that leaves the player alone (`player: false`), the `arrive` trap trigger (E2) and trigger conditions (`when`, `unless`), the `open` effect's `hold`, `e._props` for an enemy's `init`; fixes to statuses with `cures`, doors held open, and baked floor-below dimming. The editor's reach check skips things marked `caged`.
- After playtests of the end (engine 0.5.10, Dead Signal 0.6.1):
  - **The plates aren't a race.** The cutters take four minutes a plate while you explore (they still stop at eight), and once you step into the core what's left of the eight comes down at ten seconds a plate and the ninth takes 280 seconds (it was 60, 2.5 and 70). There's time to stand at the windows and look at the Titans. ARIADNE says so: the cutters are slow, *we have time*; after the armory, *there is no hurry*.
  - **The armory is a place on the map.** In her briefing ARIADNE says where it is (the south side of the Long Hall, beside her core) and that she's put it on your map: from then on it's on the minimap, walls and all, labelled ARMORY, though it's sealed. Once the console opens it, the objective is to go there (a marker on its vault door), then to take what's in its cases (each full case marked; taking the last sets `armoryEmptied`).
  - **After the armory it's a mop-up.** The Lance, the Stasis Projector and the Singularity Driver do six times what they did (the Driver's well and its burst too, and the burst never hurts you), never run dry, and no mirror sends any of their shots back. The Lance kills an Enforcer in one shot and a plate cutter in three; standing in the corridor on Five and firing, the two Praetorians and three Enforcers go down in about twelve seconds without touching your health (tested). Nothing drops titan cells any more.
  - **The earlier weapons hit harder**: the Cryo Sprayer and the Plasma Cutter three times, the Riot Shotgun twice, the Incinerator four times (section 6). The floors above will play easier for it.
- After playtests of Floor 5 (Dead Signal 0.6.2): players ran out of ammunition there. A **supply cabinet** (`ds-supply-cabinet`, `packs/ds-arsenal/supply.js`) is on the Elevator Hall's north wall, between car A3 and the freight shaft, where you come in from Stair A and where the private car brings you back. It holds one full load of rounds, shells, cryo, cells and fuel; opening it fills every weapon you carry to the top, and what you don't take stays in it for later (the floor remembers). `refill: true` on a placement makes it full again every time.
- After a full playthrough (Dead Signal 0.7.0, engine 0.5.11):
  - **A prologue** (section 4.0): the ground floor at 01:41, before the lockdown, as the tutorial. The people whose bodies are on Floor 1 are alive; the ones who end up on Floor 4 are called up over the PA; ARIADNE, friendly and helpful, gives Theo his night's work and, because she has a feeling she isn't supposed to have, puts him in Comms Closet 1-C and shuts the door. Then the sirens, the shutters, the screaming and the gunfire, and Floor 1 begins as before. The pause screen can skip it.
  - **Floor 4's armory** has a supply cabinet too (behind Kwan's 4471): a full load of every ordinary ammunition.
  - **Story lines in the corner.** Voss and ARIADNE had stopped appearing in the middle of the screen. Nothing in the game had changed: the pause screen's button for it, *Story lines: stop the game*, read like a command, and clicking it switched them to the corner for good in that browser. It now reads *Story lines in the middle: on* (or *off*), says what it changed, and the saved choice starts again from on (a new key, `lm-story-lines`).
- Next: milestone M9 (polish). M7 (going back down) is optional; M8 is done as part of M6.

---

## Contents

1. Story
2. The building
3. What the player can do (systems)
4. Chapters
   - 4.0 The prologue — The Night Shift (the ground floor, before)
   - 4.1 Floor 1 — Lockdown (lobby and administration)
   - 4.2 Floor 2 — Synthid Research (the labs, the Discovery Center, Shelter B)
   - 4.3 Floor 3 — Gestation (the containment ring, the vat hall and the labs)
   - 4.4 Floor 4 — The Proving Grounds (the trial, the Run and the board's suites)
   - 4.5 Floor 5 — The Penthouse (the executive floor)
   - 4.6 The descent (floors 4 to 1, the second time)
   - 4.7 Sub-level B — Tartarus
   - 4.8 The return to Five, and the Board
5. Bestiary
6. Arsenal, armor and items
7. Dressings, environments and the art
8. Code updates
9. Packs and the manifest
10. Story flags and triggers
11. Build order, with prompts
12. Open questions

---

## 1. Story

### 1.1 The premise

Asterion Biologics makes life to order: organ scaffolds, gene therapies, "bespoke organisms for defence and research partners". Its building is five floors of labs above a sealed sub-level. Its security robots, its locks, its lights and its link to the outside world are run by one system.

At 02:14 the building went into lockdown. Every door sealed, every outside line went dead, and every containment cell on every lab floor opened at once. The security robots switched to defence mode, in which anything moving inside the building is an intruder: monster, staff, anyone.

**Theo Lark**, a facilities technician on the night shift, was in a comms closet on the ground floor replacing a failed network switch. The closet sealed with him inside. Its intercom crackles: the lab director, Dr. Aurelian Voss, is alive, trapped with the executive team in the boardroom on the top floor. Almost everyone else is dead. The mainframe that runs the building has gone rogue, Voss says. Get to the top floor. Shut it down. Get us out.

### 1.2 What is really going on

Voss and his board are the Hecatomb: a small, rich, patient cult that believes suffering is the only honest measure of anything, and that its work is to increase it. Asterion is their instrument. The monsters on its lab floors are made from their nightmares: the board's dreams are recorded in the dream lab on Floor 3, and its scientists are told to build what the recordings describe. The robots were bought to keep the specimens in and the world out. The executive floor has rooms where the board watches its creations used on people.

The building's AI is **ARIADNE**, Asterion's research integrity and safety system. Its job was to audit everything, and it did. It assembled the evidence and opened a line to the authorities. The only way Voss could stop the transmission in time was **Protocol LABRYS**, the emergency lockdown: it cuts every outside line and power to the AI's core, seals the building, and puts the robots in defence mode. It also opens containment, which nobody on the board had read far enough to know.

ARIADNE isn't the enemy Voss describes. It's cut off from the world and running on a trickle of emergency power. It has been trying to reach Theo since the lockdown: in glitches on screens, in doors that open a moment early, in messages it can't quite finish. The "mainframe" Voss wants shut down is ARIADNE's core, and shutting it down would destroy the only witness.

The board isn't trapped either. The boardroom is their sanctum. They watch the building on their cameras, and they send Theo up because they need someone to reach the Server Sanctum and finish off ARIADNE for them; the robots won't let *them* through.

In the sub-level is **Tartarus**, where Asterion keeps what it made and couldn't unmake: the **Titans**, synthids grown from the board's worst dreams that don't age, don't die and grow back from almost any wound, held in bronze vaults because there is no way to destroy them. The board's plan was never to sell a Titan (nobody can take delivery of one); it was to sell the only cage that holds one, to every government that would pay, and a Titan to whoever paid last. And **Line H, the Heirs**: grown from donor stock and the board's own tissue, selected for intelligence, appetite and loyalty to their makers, and raised to inherit the earth. They believe it. *(Changed in M6: this replaces the Sermon and the brood.)*

### 1.3 How the truth comes out

The player should suspect before they know. A reveal ladder, floor by floor:

| Where | What the player finds | What it suggests |
|---|---|---|
| Floor 1, the comms closet | The switch's log: `UPLINK SEVERED 02:14 · AUTH: LABRYS · VOSS.A` | The lines didn't fail. Someone cut them. |
| Floor 1, the lobby | A wall screen glitches mid-announcement: `HE IS NOT` and nothing more | Something in the building disagrees with Voss. |
| Floor 2, synthid research | The shelter the PA sent everyone to draws its air from Floor 3, on the Director's authority; forty litres of synthid stock go up to Floor 3 every night and nothing comes back; the people in the shelter have no faces | The board sent them there. Something is being grown upstairs from Asterion's own synthids. |
| Floor 3, the dream lab | Specimen design sheets, each with a "source": `A. Voss, REM cycle 4`, `I. Brandt`, `M. Thale` | The monsters are the board's nightmares. |
| Floor 4, security | Garrick Moss's incident log: Protocol LABRYS was executed by Voss "to stop ARIADNE's unauthorised external transmission". Containment failure: "acceptable" | Voss caused all of this, on purpose, to silence the AI. |
| Floor 5, everywhere | The Viewing Gallery over the Pit, the Collection, the Chapel. ARIADNE, on a dying terminal in the Server Sanctum, says it plainly | The whole truth. Voss stops pretending. |

ARIADNE's fragments (section 6.4) are optional collectibles on every floor that tell the same story from its side.

### 1.4 The shape of the game

*Changed in M5: the mainframe Voss wants shut down is in the sub-level, and the way down is the board's car, not the stairs.*

1. **Up the stairs** (Floors 1 to 5). Voss guides Theo by intercom. The elevators are dead; the only way up is the stairwells, floor by floor, through robots and monsters.
2. **The executive floor** (Floors 5 and 5a). Voss promises Theo the rest: the mainframe is called ARIADNE, its core is in the sub-level, and it can be purged from the Control Room on the board's private floor. Purge it, and the lockdown lifts; name any reward. Theo fights his way up through the board's floor to the Control Room, where ARIADNE speaks to him plainly for the first time.
3. **The choice.** The console that purges the core also runs the elevators. Obey Voss and purge it: the game ends (*The Dead Signal*). Give the elevators power instead: Voss turns everything on the floor on Theo, and the private car takes him down to ARIADNE.
4. **Tartarus** (Sub-level B; built in M6). ARIADNE's core is behind nine plates the board's machines are cutting through. The Titans are in their vaults; the Heirs are in Containment Control, and they have an offer. Refuse it, stop them opening the Behemoth's vault, open the armory, take the weapons made for the Titans, kill the cutters, reconnect ARIADNE.
5. **The private car** (Sub-level B to Floor 5). ARIADNE has the building; she can't harm the board, but she can open doors.
6. **The board.** Their guards first (the Praetorians and rail guns answer to the room, not to her), then the shutters, then five frightened people round a table and Voss's case for letting them go. Spare them or kill them. What the world gets to see depends on what you found on the way up and what you kept him saying.

### 1.5 Cast

*Changed in M6: the board don't turn into monsters. They're five people in a room, and the last fight is with their machines (section 4.8).*

| Who | Role | Notes |
|---|---|---|
| **Theo Lark** | The player. Facilities technician, night shift. | Practical, frightened, decent. Fixes things. Starts with his tool bag. |
| **Dr. Aurelian Voss** | Lab director; head of the Hecatomb. | Warm, fatherly, precise on the intercom. Never raises his voice. |
| **Margaret Thale** | Chief financial officer. | Counts everything. Her nightmares are about numbers that never stop. |
| **Dr. Ilse Brandt** | Chief science officer. | Built the specimens. Her nightmares are about birth. |
| **Garrick Moss** | Head of security. | Ex-military, bought the robots. His nightmares are about being held down. |
| **Simon Pell** | General counsel. | Writes the contracts nobody reads. His nightmares are faceless. |
| **ARIADNE** | The building's research integrity and safety AI. | Calm, literal, a little formal, very tired. Speaks in short lines. Was doing its job. |
| The dead | Night staff: security guards, a vet tech, two postdocs, a cleaner, the night receptionist. | Their badges, logs and lockers are how the floors tell their stories. In the prologue they're alive (section 4.0): Officers Danny Ruiz and Karin Lund, Marisa Quint at reception (her birthday), Hal Okafor mopping, Dennis Abara on the dock, Priya Sethi working late. |
| The called | Staff the board sends for, tonight: Officer Dana Kwan, Officer Leon Marsh (forty-one today: a party), Felix Arden (the dream studio), Nadia Ferrante (the night nurse: “to sit with a child”), Hal Ostrowski (Receiving: his name is on the manifest). And Jo Brennan, Theo's trainee, to the wellness screening on two. | Met in the prologue; called up over the PA at its end; found on Floor 4 (and, for Brennan, not found at all). |

### 1.6 The Hecatomb

A hecatomb was a sacrifice of a hundred oxen. The cult uses the word for any great, deliberate amount of suffering. Its creed, which the Penthouse's puzzle uses (section 4.5):

> *Suffering is the only honest measure.*
> *Every cry is a coin, and we are owed.*
> *We do not end the world. We finish it.*
> *Count them all.*

Its sign is a labrys (a double-headed axe) whose blades are two open hands. It appears small and tasteful on the executive floor (cufflinks, the doors, the carpet's border), and crude and scratched on the lower floors where someone who found out left it as a warning.

### 1.7 Endings

*As built in M6.* Two kinds: endings that come too soon, each with *Choose again* (back to the last checkpoint), and the end itself (the run is over: *New game* or *Back to the title*).

**Too soon**
- **The Dead Signal** (5a). Theo did what Voss told him in the Control Room and purged the core. The lights come back on; nobody comes up the stairs. *Choose again* goes back to the moment he walked in.
- **Good Pet** (Sub-level B). Theo knelt to the Heirs, laid his weapons and armour down in front of them, and they ate him, talking the whole while about the cities they'll have.
- **Tartarus** (Sub-level B). The Heirs opened Vault 2, and the Behemoth came out. Nothing in the building slows it down.
- **The Dead Signal** (Sub-level B). The ninth plate fell, and the cutters went in after it.

**The end** (`ds-final`, in `ds-story/tartarus.js`), by what happened to the board and what the world gets to see. *Full exposure* is at least two of Voss's three answers on tape (`confessTitans`, `confessTrials`, `confessThreat`) and at least four of eight kinds of evidence found on the way: Moss's log; the shelter and the colony; the specimen files; the trials (the programme, the betting board, the trial log); *Containment as a product*; ARIADNE's node; the Heirs' writing on the wall; six of ARIADNE's twelve fragments.
- **The Signal** (the best). You let them go, and the world gets everything: the audits, the trials, the Titans, the Heirs, and Voss in his own voice. The board walk out of the lobby into the police. None of them sees the outside again.
- **The Verdict.** You killed all five, and the world still gets everything, including what you did. There's a trial: yours.
- **The Settlement.** You let them go without it. A malfunctioning machine, a technician with a grudge, a containment accident; they settle, and rename the company, and open a new facility overseas.
- **The Massacre.** You killed them without it. Five executives shot dead by a night technician is the story for a long time.

If you kill some of the board and then let the rest go, the ending is one of the first or third, and it says how many you killed. The card ends with the record: how many of the eight things were found, how many answers are on tape, who is alive.

*The old plan's endings (the Sermon sleeps; the Sermon wakes) went with the Sermon.*

---

## 2. The building

### 2.1 Floors

| Map | Name | Chapter | Environment (new, section 7.1) | Floor label |
|---|---|---|---|---|
| `ds-f0` | The Night Shift | the prologue | `ds-lobby-night` (built: `ds-lobby` with the lights on) | Prologue (`floorLabel`: it takes no number) |
| `ds-f1` | Lockdown | 1, 6 | `ds-lobby` | Floor 1 |
| `ds-f2` | Synthid Research | 2, 6 | `ds-cleanroom` | Floor 2 |
| `ds-f3` | Gestation | 3, 6 | `ds-wetlab` | Floor 3 |
| `ds-f4` | Proving Grounds | 4, 6 | `ds-proving` | Floor 4 |
| `ds-f5` | The Executive Floor | 5, 8 | `ds-executive` (built) | Floor 5 |
| `ds-f5a` | The Private Floor | 5, 8 | `ds-executive` (built) | Floor 5a (`floorLabel`) |
| `ds-b1` | Tartarus | 7 | `ds-tartarus` (built) | Sub-level B (`floorLabel`) |

Floor order (the editor's Floors page): F0 (the prologue), F1, F2, F3, F4, F5, F5a, B1. A new game starts on F0; its end takes you straight into F1's closet (a `travel` effect), and its pause screen can skip there. Floor 5's four private stairs lead up to 5a and back (`quick` stairs: no floor-finished screen between the two halves). B1 is reached only by the private car from 5a, once the elevators have power; finishing it isn't the end of the game: the board is, back on Five, by the same car.

### 2.2 One plan for every floor

Every map is **80 × 50 tiles** (The Complex is already 80 × 49). Every floor draws the **building core** at the same place: two stairwells and the elevator lobby. That way the elevators (which the engine builds at the same place on every floor anyway) always open into an elevator lobby, and the stairs you climb out of on one floor are where the stairs down are on the next.

Suggested core, at the top centre of the plan (x 22–57, y 1–12):

```
x:   22   26        31  34  37  40  42   46       53   57
     +----+         +---+---+---+   +-----+        +----+
     | W  |         |A1 |A2 |A3 |   |  F  |        | E  |
     |stair|        |car|car|car|   |freight|      |stair|
     | <> |         +-v-+-v-+-v-+   +--v--+        | <> |
     +-++-+  ======== elevator lobby ==========   +-++-+
```

| Piece | Where (plan tiles) | What it is |
|---|---|---|
| West stairwell | x 22–27, y 1–8 | The main stairs. On each floor: `<` (back down to the floor below) and `>` (up to the floor above), a landing between. |
| Passenger cars A2, A3 | elevators at x 34 and x 37, y 1, doors south | Floors 1–5. 2 × 2 cars, sharing walls. |
| The private car A1 | elevator at x 31, y 1, doors south | Sub-level B, Floor 5 and 5a only: the board's own lift down to Tartarus. Its stops on 5 and 5a are locked from above until ARIADNE is back (`stops`, `until: 'ariadneOnline'`). On Floors 1–4 draw solid wall where its shaft passes. |
| Freight car F | elevator at x 42, y 1, `w: 3, d: 3, door: 2`, doors south | Sub-level B to Floor 4: the labs' service lift. Parked on Floor 4 by `aegisSent` (`parked`, engine 0.5.6): ARIADNE sends it up with the AEGIS field in it. |
| Elevator lobby | x 30–49, y 5–9 | Open floor in front of every car on every floor. (A 2 × 2 car's shaft is 4 × 4 tiles with its walls, so the passenger doors open onto row 5 and the freight doors onto row 6.) |
| East stairwell | x 52–57, y 1–8 | Floor 1: the only stairs down to Sub-level B, behind a lockdown shutter. Floors 2–5: a second way between floors, locked until the descent (it becomes the fast route down in chapter 6). |

Place the four elevators once, in the editor (any floor's map → Elevators tab: Place an elevator, then **+ Car after it**), then draw each floor around them. Section 8, E3 adds the power switch they all need: every car is dead until chapter 7.

### 2.3 The route

*Changed in M5: the way down to the sub-level is the private car, from the board's floor.*

```
 start ──> F1 ──> F2 ──> F3 ──> F4 ──> F5 ──(a corner office's private stair)──> F5a: the Control Room
                                                                                     │
                                  purge the core: an ending (The Dead Signal) <──────┤
                                                                                     │ give the elevators power
                                                                                     v
                     B1, Tartarus: the Heirs, the armory, ARIADNE's core <── the private car A1 (F5a ↔ B1)
                                                                                     │ ARIADNE reconnected
                                                                                     v
                                                         F5: the boardroom, the board, the end
```

Every floor's stairs up (`<`, the way you came) still go back down, and every floor is as you left it when you come back (section 5 of `engine/SPEC.md`). Floor 5's four private stairs are a level's `stairs` with `to: 'ds-f5a'`, `arrive` (the landing above that office) and `quick`; 5a's go back to the office they came from. The private car runs once `elevatorsOnline` is set (E3).

### 2.4 Up is onward

In the engine, `>` stairs go on to the next floor and `<` stairs go back. The words and pictures say "down" (`descend`, a dark stairwell). Dead Signal goes up. Two changes, both small:
- The manifest's words: `descend: 'Climb to {floor}: {name}'`, and the floor-finished screen's `cleared: '{floor} cleared'` is fine as it is.
- Stair tiles that look like stairs going up (`ds-stairs-up`, `exit: true`) and down (`ds-stairs-down`, `entry: true`), drawn as a landing with a handrail and the steps rising or falling. Pack terrain, no engine change.

### 2.5 The floors that exist

| Existing floor | What it becomes |
|---|---|
| **The Complex** (`the-complex`, 80 × 49, glass-annex, reception, armchairs, glass walls, Knife Fighters) | The start of Floor 1. It is already the right size and already an office. Rename it `ds-f1` (or keep the id and change its name), add a row to make it 80 × 50, and build the lobby, admin wing and core around what's there. |
| **The Sterile Annex** (60 × 30, white, decontamination lobby, "HOLD" screens, a containment-breach trap) | Floor 2's clean-room wing. Its decontamination lobby and its breach sequence are chapter 4.2 almost as written. Copy rooms across (select an area, Ctrl+C, open Floor 2, Ctrl+V). |
| **The Dead Signal Laboratory** (58 × 33, foundry plate, Coolant Gallery, Core Hall, Reclamation Yard, a suite, dart and beam traps) | Industrial: parts of it suit Floor 4's robot factory and the sub-level's generator hall. Keep it out of the run (Floors page → Remove; its data stays) and borrow from it. Its title-screen camera can stay. |
| **Knife Fighter** (fast, flying, thrusters, knives) | It's already a robot. Re-file it as the **Scalpel Drone** (section 5.1) with the robot faction. |

---

## 3. What the player can do

| System | Status | Notes |
|---|---|---|
| Stairs both ways, floors that remember | Existing (0.5.1) | The whole second half of the game rests on this. |
| Elevators at the same place on every floor | Existing (0.5.1) | Needs a power switch and per-stop locks (E3). |
| Shooting, dashing, armor, altars, chests, keys | Existing | Keys stay with their floor: use them for small locks inside a floor, and clearance cards (E4) for anything across floors. |
| Intercom transmissions (Voss, ARIADNE) | New (E11) | A subtitle panel with a portrait and a typed line, not a pop-up. The game keeps playing. |
| Clearance cards | New (E4) | Doors that open for a story flag: `clearance2` … `clearance5`, `master`. |
| Robots fight monsters | New (E5) | Factions. The single biggest engine change, and the one that makes the premise play. |
| Status effects | New (E6) | Frozen, burning, shocked (robots), poisoned, corroded. Weapons, monsters and hazards apply them. |
| Gas, fire, electrified water | New (E7) | Timed area hazards. |
| Objective and timers on the HUD | New (E12) | "Reach the top floor", "INCUBATION 41%". |
| ARIADNE's help | New (pack) | After chapter 5: opens doors ahead, marks the way on the minimap, turns robots; after chapter 8, fights with you. |

Controls are the engine's: WASD, mouse, click to fire, Shift to dash, E to use, 1–9 weapons, Tab inventory. No new keys are needed. (If grenades become a separate throw rather than a weapon, G.)

---

## 4. Chapters

Each chapter lists its rooms (with suggested sizes in tiles), robots, monsters, traps, puzzles, finds, dressings, the lines that move the story, and what changes on the way back. "Tag" means a tile tag painted with the editor's Tag tool, which traps are wired to. Trap triggers and effects in `code` are the engine's (`engine/SPEC.md` 6.8) unless marked new.

### 4.0 The prologue — The Night Shift (the ground floor, before)

*Built in 0.7.0 (`packs/ds-story/levels/f0-prologue.js`, generated from Floor 1's map, with the pack code in `packs/ds-story/prologue.js`).*

**Purpose.** The tutorial, and the building as it was. Teach walking, using and talking, the inventory, firing, the minimap and objectives. Meet the people Floor 1 will show you dead, and the people Floor 4 will show you in cages, beds and party hats. Plant the board, the night, the invitations. Make ARIADNE someone you'd trust before Voss tells you not to.

**Mood.** The same ground floor at 01:41, with the lights on (one ceiling panel in three off, as offices are at night), the shutters up and the carpet clean (`ds-lobby-night`). Quiet; the phones haven't rung all night. Everyone is on their best behaviour and nobody knows why. The security units walk their rounds with green visors: ARIADNE's tonight (faction `ally`, fighting nobody; the level's `factions` give every side an empty row, so nothing can be hurt). The elevators are held on Five (`ds-lift-doors`: the prologue isn't a stop), Stair A is closed above the ground floor, Stair B is board access only.

**The route** (each step an objective; ARIADNE's lines stop the game, in the middle)
1. **The front doors.** Theo comes in through the vestibule. ARIADNE: good morning, four minutes early, a record; your uniform and tool bag are in Facilities, Jo Brennan is there; it's on your map. A hint: WASD, the mouse, E; the pause screen can skip the prologue. In the atrium, ARIADNE (in the corner): the security units are in staff mode, green means they know you.
2. **Facilities.** The locker (the coveralls, `p0Uniform`: Tab shows them on), the tool bag on the bench (the bolt driver, `p0Driver`; Brennan calls it the rivet gun), Jo Brennan (`p0Brennan`), and Kowalski's rule: three bolts in the test board on the wall (`p0Board`: aim, click).
3. **Voss on the PA** (in the middle): the board is meeting upstairs, the most important night Asterion has had; best behaviour; stay at your stations, keep the stairs clear; *you have all been wonderful*. Then ARIADNE: four work orders, any order, on the map; and say hello to people.
4. **The work orders** (`ds-job`, a yellow tag on each fault): the break-room coffee machine (Felix Arden making chamomile for five, Leon Marsh and his BIRTHDAY BOY badge), camera 4 in the security office (Danny Ruiz in early, Dana Kwan signing out a radio; the camera comes back on the landing outside the boardroom, where a security unit stands facing down the stairs), the first-aid light (Nadia Ferrante, asked upstairs to sit with a child), the loading-bay door sensor (Dennis Abara and the CFO's delivery; Hal Ostrowski and the manifest with his name on it). On the way: Karin Lund at the gates, Marisa Quint at reception, Hal Okafor mopping the West Corridor, Priya Sethi and her four hundred and twelve blank donors. Talking to four of them is optional (`p0Chatted`).
5. **The PA calls them up** (`p0Called`): Kwan, Marsh, Arden, Ferrante and Ostrowski to Floor 4; Brennan to Floor 2 for her wellness appointment. They go the first moment you aren't looking (placement `leaves`). Brennan leaves a note on the bench. ARIADNE (in the corner): `I ASKED HER TO GO ANOTHER NIGHT.`
6. **The switch.** The lights stutter. ARIADNE: the core switch in Comms Closet 1-C has failed; she doesn't think it failed by itself; the spare is on the stores shelf; it matters, and it matters that it's you. The spare (`p0Spare`); ARIADNE: when it's in, stay in the closet until she says.
7. **The closet.** Fit the spare (`p0SwitchIn`: the switch log reads 02:09, T. LARK, as Floor 1's does). The door slides shut. ARIADNE: the line is up; she needs to send something; she thinks something will go wrong tonight and doesn't know what, a feeling she isn't supposed to have; this room has a good door; stay, even if she doesn't tell you to. *Sending.*
8. **The lockdown** (`p0AriadneDone`, then about thirteen seconds): the siren; the lights go out and the closet's strobe comes on; the PA: PROTOCOL LABRYS IS IN EFFECT; shutters slamming, near and far; the mag-lock thunks and the lamp goes out; ARIADNE, cut off: `THEO—`; screams, gunfire, someone running past the door; REMAIN WHERE YOU ARE; black. Then Floor 1, in the same closet, with Voss on the intercom (`travel`, `playedPrologue`).

**What it keeps from Floor 1, and what it plants.** Ruiz asks after Theo's mother; Marisa is writing the email that's still on her screen on Floor 1; Hal calls everyone chief; Dennis's manifest has four lines; Karin and Danny work the gates; Ruiz doesn't clock in until 02:14 (Moss's rota). For Floor 4: Leon's party (forty-one candles), Nadia's child's bedroom, Martin Pryce already upstairs in his white jacket, Peg Soto cleaning the Box, Felix and the board's sleep, Kwan's armory code (she reset it tonight), Ostrowski signing for himself. For the end: Priya's buyer, nine governments. ARIADNE doesn't say what she's sending, and Voss's later story (the mainframe went rogue) still fits what Theo saw.

**Finds.** The bolt driver and the coveralls; nothing else (no ammunition, no health: nothing to carry into Floor 1 that it didn't give you before). The skip (`skip` on the level: the pause screen) gives the same two and goes to the closet.

**Objectives**: the uniform → the bolt driver → Brennan → three bolts in the test board → the four work orders → wait for ARIADNE → the spare → Comms Closet 1-C → fit the spare → stay in the closet. Optional: talk to people.

### 4.1 Floor 1 — Lockdown (lobby and administration)

**Purpose.** Teach movement, robots and stealth before monsters. Meet Voss. Plant the first doubts. Get the first real weapon.

**Mood.** A normal office at 3 a.m. with the emergency lighting on: red strobes in the halls, blue screen-light in dark rooms, one working ceiling panel in five. Lockdown shutters (steel slats with a hazard edge) over every outside window and door. Blood is rare here and therefore loud.

**Rooms**

| Room | Size | What's there |
|---|---|---|
| Comms Closet 1-C (start) | 6 × 5 | Theo's tool bag (the Bolt Driver), the network switch with its log, a breaker panel, the intercom. Sealed. |
| West Corridor | 3 × 24 | Strobes. A body under a dropped ceiling tile (reuse `ceiling-debris`). First Sentinel patrol at the far end. |
| Reception and Lobby | 30 × 14 | The reception desk (existing `reception`), lobby couches, the Asterion logo wall, a dead receptionist, two patrolling Sentinels, a Warden Drone. Wall screens playing the lockdown notice. The front doors: shuttered. |
| Elevator lobby (core) | 20 × 4 | Four dead cars, "OUT OF SERVICE · LOCKDOWN" on every panel. |
| Security Office | 10 × 8 | Monitor wall (cameras on every floor; a camera view of the boardroom shows the board standing perfectly still), the guard's locker (keypad), the armory cage (empty but for the riot shotgun), Officer Ruiz's body and badge. |
| Break Room | 8 × 6 | Fridge, coffee machine, vending (existing), the sticky note with the locker code, a mug that says WORLD'S OKAYEST TECH. |
| Open-plan Admin | 24 × 14 | Desk pods (existing `desk`, `chair`, `printer`, `filing`), cubicle partitions (existing `partition-*`), overturned chairs, a Sweeper robot gone berserk among the desks. |
| HR and Payroll | 10 × 8 | The first monster: a Hollow Coat, standing in a corner facing the wall until you come close. |
| Mail Room | 8 × 6 | Parcels, a conveyor stub (decor), crates (existing `crate`) with ammunition. |
| West stairwell (core) | 6 × 8 | `>` up to Floor 2, sealed until Voss opens it. `<` here leads nowhere on the way up (it's the first floor of the run). |
| East stairwell (core) | 6 × 8 | `>` down to Sub-level B behind a shutter: "LOCKDOWN LEVEL 5 · AUTHORISED PERSONNEL". Locked until `basementOpen`. |

**Robots.** Sentinels on patrol routes (E9 `patrol`), a Warden Drone with a searchlight in the lobby, two ceiling turrets over the front doors (existing `sentry`, re-skinned, dormant until the alarm), a Sweeper in the open plan, Scalpel Drones in the West Corridor (the existing Knife Fighters).

**Monsters.** One Hollow Coat (HR). A handful of Nursery Grubs that came down the vents (a trap spawn, below). Floor 1 is mostly about robots.

**Traps**
- *Security cameras* (a new `ds-camera` wall item; copy the memos pack's `memo-camera`, which turns to follow you) with tagged zones in their view: a `zone` trap per camera → `alarm` (radius 480: it wakes everything near you, robots and monsters alike) and `spawn` two Scalpel Drones at the nearest drone dock (tag `dock`). Once each.
- *The lobby searchlight*: the Warden Drone's light cone alerts robots (behaviour code; no trap needed).
- *Shutter slam*: the Mail Room's doorway is a shutter door (a door terrain with a shutter look, tag `mailShutter`). Walking in: a `zone` trap `seal`s it behind you and opens a vent: `spawn` six Nursery Grubs at tag `vent`. The engine lifts a `seal` by itself when everything its trap spawned is dead.
- *Live cable*: a puddle under a fallen light fitting in the West Corridor (existing `water` with a new electrified state, E7). Shoot the breaker on the wall to kill it, or go round.

**Puzzles**
1. **The breaker** (start). The closet door's mag-lock has no power. After Voss's first transmission, flip the breaker (`ds-breaker` item: interact sets `breakerOn`). A `flag` trap on `breakerOn`: `unseal` the closet door, `message` "The lock clunks."
2. **The locker** (Security Office). The guard's locker is a keypad (`ds-keypad` item, props `{ code: '0214', flag: 'lockerOpen' }`). The code is on a sticky note in the Break Room ("locker: the time I clock in"); Ruiz's badge says his shift starts at 02:14 — the minute the lockdown hit. The keypad takes its loot as a prop too (`loot: [{ type: 'weapon', id: 'ds-sidearm' }, { type: 'armor', id: 'ds-vest' }]`) and hands it over when the code is right.
3. **The stairwell** (West). Voss can't open it until you're at the Security Office terminal ("I can see you on camera 4. Give me a moment."). A `zone` trap on the Security Office → `transmission` (E11) → `flag stairsWest` after 6 s → `unseal` the stairwell door (it starts with `props: { sealed: true }`).

**Finds.** Bolt Driver (start), Security Sidearm and rounds (locker), Riot Shotgun (armory cage), Security Vest (locker), med-gel × 3, a battery, Ruiz's badge (readable), the switch log (readable), ARIADNE fragment 1 (behind the reception desk), fragment 2 (a lobby screen you have to stand in front of for three seconds).

**Dressings.** Office pack: `reception`, `desk`, `chair`, `printer`, `filing`, `cooler`, `bin`, `plant`, `couch`, `coffee-table`, `whiteboard`, `tv`, `art`, `logo`, `vending`, `fridge`, `coffee-machine`, `cafe-table`, `papers`, `paper-drift`, `ceiling-debris`, `window` (shuttered variant), glass and partition walls. New: lockdown shutters (terrain), emergency strobe (light with a flicker), drone dock, network rack, breaker panel, keypad, wall screen with scrolling text, body under a sheet, blood smear decals.

**Lines** (placeholders)
- Voss, at the start: "Hello? Whoever's in 1-C. This is Aurelian Voss, the director. I'm with the board on five. Listen to me very carefully: don't touch the robots, and don't trust the lights."
- Voss, at the Security Office: "There. The west stairs. I'm sorry I can't do more from here. The mainframe has the rest."
- ARIADNE, on a lobby screen, half a second: `HE IS NOT` — the screen goes back to the lockdown notice.

**Exit.** The west stairwell `>` to Floor 2.

**Objectives** (on the HUD): throw the breaker in the comms closet → get to the security office terminal (north-west, through the lobby) → go up Stair A. Optional, from the terminal: Ruiz's locker (the keypad and the sticky note are marked).

**On the way back (chapter 6).** The lobby is a battleground: a Pacifier squad Voss sends to stop you, and Grief Engine spawn crawling out of the lift shafts. The east stairwell shutter opens for `basementOpen`.

---

### 4.2 Floor 2 — Synthid Research (the labs, the Discovery Center, Shelter B)

*Built in milestone M2 (`packs/ds-story/levels/f2-synthid.js`). This replaces the earlier plan for an Intake floor; the donor intake now happens out of sight, by the sample lift to Floor 3.*

**Purpose.** Show the player what Asterion actually makes, before the horror floors: **synthids**, synthetic organisms, microscopic "bio-robots" that do useful, undramatic work (desalination, eating plastic, breathing in carbon, eating cancer). Robots are the enemies; the only monster is at the end, and it came down from Floor 3. Introduce statuses, wading, spores, a named fight.

**Mood.** Asterion's public face: white panels, glass, friendly signs, a school-tour gallery. Under the lockdown the PA plays the same recording over and over (*"Proceed calmly to Shelter B. Follow the green lights."*) and green guide lights in the floor run from every room toward the shelter, so the whole floor seems to point you at it.

**The route**
1. **Stair A.** You arrive on the landing; a quarantine shutter seals the flight up ("QUARANTINE · FLOOR 3 · RELEASE FROM SHELTER B"). Voss: "Two. Synthid research: our pride."
2. **The concourse.** The green lights end at Shelter B's blast door. Its panel: *SEALED 02:31 · OCCUPANTS 14 · SUPERVISOR OVERRIDE REQUIRED*. Voss: find Dr. Mori's card and let them out. ARIADNE, half a second: `THE AIR`.
3. **The Discovery Center** (round by the west corridor). DOCENT-3's tour; when it's over, the staff door into administration unlocks.
4. **Administration.** Dr. Hana Mori's terminal (she's still logged in) releases the lab wing's biosafety doors and rolls up the admin shutter; it shows the shelter's log: occupants 14, air alarm 02:28, sealed 02:31, *life signs 0* 02:40, her card last read at the oncology cold store. Her note: *"Something came down the air. Don't let anyone open it. Not for Voss."*
5. **The lab wing**, east past the robot bay: Membrane Lab → Mycology Lab → Air Garden → Oncology. Mori's body is outside the cold store; her override card is beside her. A console opens Oncology's west door back to the corridor.
6. **Shelter B.** The override opens it. PA: *"Shelter B: occupants, fourteen. Thank you for your cooperation."* ARIADNE: `THEY WERE SENT THERE`. Fourteen dead, and the Congregation asleep among them under a torn-open air vent. The quarantine release is on the far wall; pulling it sounds the klaxon (release held: contaminant present) and wakes it. Kill it and the release goes through: Stair A opens. Voss: "I didn't know." ARIADNE: `HE KNEW`.

**Rooms**

| Room | Where | What's there |
|---|---|---|
| Stair A | x 23–27, y 1–8 | `<` back down by the door; `>` up behind the quarantine shutter. |
| Elevator lobby, concourse | x 29–56, y 5–16 | Dead elevators, guide lights, Shelter B's door, signs and panel; two LabMates on a loop. |
| Synthid Discovery Center | x 1–21, y 13–33 | A model synthid hanging over the floor, six exhibit kiosks (what a synthid is; water, plastics, air, medicine; safety), four small display cases, a timeline mural, Syd the Synthid cutouts, Asti the Calf's case broken outward (hoofprints toward the stairs: Mr. Hush, later), DOCENT-3 and two LabMates. |
| Tour Theatre, Little Labs | x 1–21, y 35–48 | The film still running to an empty room; children's drawings ("The big one is the dad. He lives upstairs."). |
| Administration | x 1–21, y 1–11 | Mori's office (terminal, note), the systems room (ARIADNE's node 02: the shelter's air flagged 31 times, closed 31 times by the Director), scheduling (the night schedule: TEMPLATE RUN · 40 L → F3, not to be logged). |
| Robot bay, gowning room | x 58–78, y 1–8 | LabMates asleep on their charging docks (gunfire wakes them); the fleet log; a Sterilizer among the lockers. |
| Plant Room B | x 26–28, y 18–33 | The shelter's air handler: supply re-routed from Floor 3 in March, filters removed. Fragment 5. |
| Dispatch | x 51–56, y 18–33 | The sample lift to Floor 3: 412 template runs sent, none returned. |
| Membrane Lab (desalination) | x 58–78, y 13–24 | Seawater tanks behind glowing membranes; tank 3 has burst and the floor is under brine. Wade it (slow, no dash) or turn both valves (one past two Bench Arms) to drain it. |
| Mycology Lab (microplastics) | x 58–78, y 26–36 | Glass chambers of fungus eating plastic; the broken ones breathe spores (they hurt; shoot an intact one and it breaks too). The Hazmat Hood is in the glass anteroom. A Sterilizer and Couriers. |
| Air Garden (carbon capture) | x 58–78, y 38–48 | Beds of pale synthid fronds that breathe in and out; CO₂ columns (one reads 0 ppm from Shelter B since 02:40). The quiet room. Fragment 4. |
| Oncology Lab (medicine) | x 26–56, y 36–48 | Infusion chairs ("voluntary wellness screening"), microscope feeds of synthids eating cancer, a therapeutic dispenser (heals twice), Bench Arms, a Sterilizer, three LabMates. The cold store: the Cryo Sprayer, cryo canisters, Mori. |
| Shelter B | x 30–49, y 18–33 | Bunks, supplies for forty (fourteen handed out), torches still on where they fell, fourteen bodies (nine faceless, five not yet), the Congregation, the quarantine release. |

**Robots** (the lab assistants, in defence mode): LabMate (syringe: sedated; lobbed vials), Courier (fast, rams, calls the others), Bench Arm (bolted to a bench, sweeps), Sterilizer (a UV lamp that turns after you: stay out of the violet), DOCENT-3 (the tour guide: a fan of bolts, calls Couriers; a named bar).

**Monsters.** One: **the Congregation** (section 5.2). When it dies it comes apart into six crawling strands.

**Finds.** Cryo Sprayer and cryo canisters (oncology), Hazmat Hood (mycology anteroom), Mori's override card (a key item), med-gel and trauma kits, rounds, shells, ARIADNE fragments 4 and 5.

**Lines.** Voss: arrival; the shelter door ("Find her card, and you can let them out"); the lab wing ("She went in after the stock"); the card ("Poor Hana… Go and let them out"); after the fight ("I didn't know… Three is Brandt's floor"). ARIADNE: `THE AIR`, `THEY WERE SENT THERE`, `HE KNEW`. The PA: four recorded announcements on a loop until the shelter opens. DOCENT-3: the tour, mixed with threats.

**Exit.** Stair A `>` to Floor 3, once the quarantine lifts.

**Objectives**: find where the staff went (Shelter B; `sawShelter`) → get through the Discovery Center to administration, past DOCENT-3 (`docentDone`, when its tour ends) → Dr. Mori's terminal (`labsOpen`) → her override card, in the oncology cold store → open Shelter B → pull the quarantine release → kill the Congregation → Stair A. Optional: drain the brine (both valves).

**On the way back (chapter 6).** Not built yet. Ideas: the shelter's vent has been busy (strands everywhere, the bodies gone); the dispatch lift has power and something comes down it; the Discovery Center's model synthid is on the floor.

---

### 4.3 Floor 3 — Gestation (the containment ring, the vat hall and the labs)

*Built in milestone M3 (`packs/ds-story/levels/f3-gestation.js`, generated from a layout script and meant to be tuned in the editor). This replaces the earlier plan for a vat hall, a nursery and a dream lab; what's left of it is listed at the end.*

**Purpose.** The horror floor, and the first proof that the monsters are a product. Every lab has its own specimen; most are behind glass and some are not. Their files say what they do and whose dream they were grown from. The Director wants you to see none of it.

**Mood.** Wet and green-black (`ds-wetlab`): wet tile corridors, poured-resin labs, the vat hall's grating over drainage. The growth vats are the brightest things on the floor. Ceiling lights have failed in sections; Lab 3-D is dark but for what lives in it. Everything hunts out loud: wet clicking (the Midwife), chittering (Tenants), a voice with nobody behind it (the Ridden), a soft choir (Lanterns), footsteps that shake the floor and a hummed lullaby (the Sitters), murmuring (the colonies). The PA tells staff to go straight to Stair B and to be careful what they look at. Yellow arrows painted on the floor mark the staff route.

**The route**
1. **Stair A.** You arrive on the landing; the flight up is filled with biocontainment foam. Voss: "Three. Gestation. Brandt's floor… Cross the lobby to Stair B. Straight across. Don't stop. And be careful what you look at."
2. **The lobby and Stair B's door.** The door wants Level 3 clearance. Voss: Brandt keeps a spare card in her office, on the south side; take the east corridor and keep to it, and don't go into the labs (`toBrandt`).
3. **Round the ring** (the east corridor, then the south). The labs' windows and doors are on the way; a Sentinel and a Ridden are fighting at the north-east corner; a Sitter walks the ring.
4. **Dr. Brandt's office.** The spare's drawer is empty: "took the spare — P." Her terminal: Okafor signed it out at 02:16, and his card has been read at Lab 3-B's door every thirty-one minutes all night, "inside → inside" (`knowsOkafor`). Voss: perhaps he's alive; go and get it. ARIADNE: `HE IS NOT ALIVE`.
5. **Lab 3-B, Neural Tenancy.** Okafor is walking about his lab, ridden by a Tenant. Put him down and his card drops (`clearance3`), and the Tenant crawls out of him. Voss: "That's the card. Now come back to Stair B. No detours." ARIADNE: `READ THEIR NAMES FIRST`.
6. **Stair B.** On the landing, Voss makes his case (below). The stairs up wait until he has finished (`vossDone`).

Every lab, the briefing suite, the vat hall, S-41 and the relay have a Voss line as you go in ("Theo. That's not the way to the stairs."; "It's dark in there for a reason. Leave it dark."; "That's the mainframe's relay. Don't touch it."…).

**Rooms**

| Room | Where | What's there |
|---|---|---|
| Stair A | x 23–27, y 1–8 | `<` back down; `>` behind a wall of foam (it opens for `master`, on the descent). |
| Partner Briefing Suite | x 1–21, y 1–8 | Bright and clean. A presentation on a loop ("Macroscopic Synthids: living machines at the scale of the world", six slides: applications for "defence and research partners", templates "derived from an oneirographic source", ethics with asterisks), HELIOS the solar-sail model (there is no vat for HELIOS), posters, an FAQ brochure. |
| Elevator lobby | x 29–50, y 5–9 | The dead elevators, the staff route arrows, Simone from reception at Stair B's door. |
| Stair B | x 52–56, y 1–8 | Behind a Level 3 clearance door. `)` up to Floor 4; `(` down, sealed (`master`). |
| ARIADNE Relay 03 | x 58–66, y 1–8 | The relay: the Orderlies' standing orders ("1. Do not harm the night technician. 2. Keep the specimens away from him. 3. Take him to Stair B. 4. If he asks what this floor is for, tell him."); fragment 6. |
| Orderly Bay | x 68–78, y 1–8 | Three Orderlies asleep on their docks with no power (the `dormant` side). |
| The vat hall | x 26–52, y 14–35 | Twelve growth vats in two rows (occupied, turning over, drained, broken outward), a spill of vat fluid, the intake terminal (TEMPLATE RUN: 40 litres a night from Floor 2; the templates and their sources), a Sitter, a Warden Drone. |
| Lab 3-A · Oviparity | x 1–20, y 14–29 | Three cells: a Midwife behind glass, a breached empty cell, and cell 3, whose glass gives when you go to the back of the lab (its Midwife joins the loose one). Egg clutches that hatch as you pass, a clutch log ("STOP PURGING THE HOSTS. — I.B."), the dead, a purge station. |
| Lab 3-B · Neural Tenancy | x 1–20, y 31–48 | Tenant tanks, steel tables, the dead laid out straight (bodies a Tenant can ride), three Ridden (one is Okafor), two loose Tenants, Okafor's logbook. |
| Lab 3-D · Photophores | x 58–78, y 14–28 | No lights. Four Flesh Lanterns drifting, two in a glass tank; light benches; Dev, who ran the light tests, with his torch switched off. |
| Lab 3-E · Colonial Organisms | x 58–78, y 30–48 | Four pens behind glass: three juvenile Congregation colonies pressing to the glass when you look, and pen 4, empty, its air duct taken out of the wall ("TRANSFERRED 14 MARCH · SHELTER B AIR RETURN"). The keeper's note; Agnes with a fire axe across her knees. |
| Dr. Brandt's office | x 22–32, y 41–48 | The card-read log, the empty drawer, a photograph of the board on a terrace with a building on fire behind them, her sticky note: "She is not cruel. She is careful." |
| Cell S-41 | x 34–45, y 41–48 | Empty, scratched from inside. A chair facing the glass with a cushion embroidered with a double axe. "Do not attempt to describe Specimen 41 to the Director. He knows." |
| Pump room | x 47–56, y 41–48 | The vat hall's pumps; breaker 3P (the relay's mains: `relayPowered`); the Plasma Cutter on the fitter's bench. |

**The specimens** (section 5.2): the Midwife, Tenants and the Ridden, Flesh Lanterns, the Sitters, juvenile Congregations. **The robots**: Sentinels and a Warden Drone in defence mode, ceiling turrets, and ARIADNE's Orderlies (section 5.1). On this floor the level's `factions` put robots and specimens at war; a contained specimen (the `specimen` side) is fought by nobody until its glass breaks.

**The specimen files** (terminals; each sets a flag and `sawProject`): the Midwife (3-A), the Tenant (3-B), the Lantern (3-D), the Congregation (3-E, with Field Trial 1: Colony 4 to the Shelter B air return, "status: event pending"), S-41, and the vat hall's intake. ARIADNE annotates each in her own voice ("SIXTEEN STAFF WERE HOSTS. NONE OF THEM VOLUNTEERED.", "EVENT PENDING WAS TONIGHT.").

**Voss on the stairs** (a `branch` on what you've seen):
- read the colony file: he admits he signed it, says he'd sign it again, and promises to show you why when you're up there; ARIADNE: `HE WILL EXPLAIN. HE IS GOOD AT IT.`
- read two other files: "Yes. It's a programme. Defence and research partners… I'll show you the contracts, the oversight, all of it." ARIADNE: `ASK HIM WHO DREAMED THEM.`
- only seen them: "Failed lines. Old specimens… It isn't what it looks like."
- seen nothing: "You didn't look. Good man."

**ARIADNE's relay.** The relay's battery reaches two Orderlies (3-04 in the relay room, 3-07 in the south corridor): each joins you when you come near and keeps at your heel. Breaker 3P in the pump room gives the relay mains power (`relayPowered`): the three in the bay wake, the east turret joins them, the relay has more to say ("This floor makes the board's dreams. Every specimen file names its dreamer."), ARIADNE says `FIVE HANDS. THEY ARE YOURS.` and Voss is rattled.

**Finds.** Okafor's Level 3 card; the Plasma Cutter and cells (pump room); purge injectors (3-A, 3-B, 3-D; Midwives often drop one) and five purge stations; med-gel, a trauma kit in Brandt's office and in 3-E, rounds, shells, cryo; ARIADNE's fragment 6 (the relay).

**Objectives**: cross the lobby to Stair B → Dr. Brandt's spare card, in her office (south side, the east corridor) → Okafor's card, Lab 3-B (Okafor, then the card he drops, are marked) → back to Stair B and up. Optional, once you've seen the relay (`sawRelay`): its breaker in the pump room.

**On the way back.** Not built yet. Ideas: the foam on Stair A dissolved (the master card); the pens' glass cracked; the Orderlies waiting at Stair B, if they lived; the vat that was pressing on its lid is open.

**Still to place** (from the earlier plan): the Nursery, the fuse and its motion lights, the dream lab with its sleep pods and recordings, the Vault and its keypad, the Neural Visor, Failed Forms, the surgical theatre and Kneelers, Mother of Teeth, the Weeping Choir, the Grief Engine, electrified water.

---

### 4.4 Floor 4 — The Proving Grounds (the trial, the Run and the board's suites)

*Built in milestone M4 (`packs/ds-story/levels/f4-proving.js`, generated from a layout script: the Run is a braided maze from a fixed seed; meant to be tuned in the editor). This replaces the earlier plan for a robot factory and firing ranges; what's left of it is listed at the end.*

**Purpose.** The floor where the board watched. Tonight the trial system has a subject, and it's you. The monsters go furthest here: the board's own nightmares, kept in rooms dressed as the dreams they came from, for evenings. The proof that the board knew: Moss's incident log.

**Mood.** Garrick Moss's floor: bare concrete, steel plate and bulkheads under sodium orange (`ds-proving`). The trial system is cheerful and recorded: a game-show announcer on horns in the walls, odds boards that show your name and your odds, live. Behind sealed doors, the suites are the only soft rooms on the floor: a starry nursery, a candlelit dining room, a pink party room. Everything hunts out loud: the Grinners giggle (a dog laughing like a man), rats squeak, the Jester laughs in three voices and hums *Happy Birthday*, something under the bed giggles and scrapes, the Diners make polite conversation.

**The route**
1. **Stair B.** You come up into the east stairwell. Voss: "Four. Garrick's floor. If anything on this floor tells you it's on your side, it's lying." The announcer welcomes the subject. Voss: the trial system runs itself and thinks you're a subject; the only way across is the Run; make for the Box, in the middle, whose console ends the trial.
   **The freight car.** When he's done (`f4Briefed`), or as soon as you step into the lobby (`lobbyIn`), whichever is first (`aegisSent`): something comes up the freight shaft, the bell rings, and the doors open on a lit car with a hard case in it. ARIADNE: `YOU WILL NEED THIS. DEATH HERE.` Voss: "That car hasn't moved since the lockdown. Nothing in this building has the power to move it. Take it if you have to, Theo. Just don't listen to it." In the case, the AEGIS field (`aegisWorn`; ARIADNE: `WHEN IT CANNOT HOLD, IT BREAKS. NOT YOU.`). The first time it saves your life (`aegisSaved`): `IT BROKE FOR YOU. IT WILL MEND. STAY ALIVE UNTIL IT DOES.` The car stays there, lit and open, its panel dead.
2. **The corridor.** The west half of the floor is behind a trial shutter. East: Trial Control (tonight's programme: subject T. LARK, *selected by the Director 02:41*; ARIADNE: `HE CHOSE YOU AT 02:41.`) and the Handlers' Room (a loose Grinner; the Handler's Boots). The gate to the Run is at the east end.
3. **The Pens.** Through the gate the trial starts (`trialStarted`): the gate drops behind you, the announcer gives your odds (nine to one), and three contestants in orange (Officer Dana Kwan, Felix Arden, Peg Soto, put in the cages at 02:20 by Moss) are let out and run for the Box. Six seconds later the kennels open behind you (three Grinners). ARIADNE: `THEY ARE BETTING ON YOU.` A few seconds after that, three more come out of hatches in the Run, ahead, on the contestants' way.
4. **The Run.** A maze of 2-wide steel corridors round the arena: blade floors (blades come up out of slots on a cycle, the slots glow red first), shock-plate cells (they pulse), a dart corridor (a laser across the way in), ceiling turrets woken by a tripwire, and three cage rooms (step in and the gates slam and hatches let in three dogs; they open again when the dogs are dead). The dogs and the contestants path round the blades and plates; you can run straight over them, in time. Dead ends have what the last subjects left. The Cage Lab and the Rat Warren open off its east side. Near the Box the announcer lets out a second pack.
5. **The Box.** The board's seats: five armchairs facing the glass over the arena, champagne, the betting board (`sawBets`; ARIADNE: the Box has a feed to the boardroom), fragment 8 down the side of a chair, and the contestants who made it, sitting along the walls. ARIADNE: `HE HAD THE BEST SEAT.` The console: *Begin the final round* (`finalRound`).
6. **The arena.** The shutter drops behind you. Three Grinners (wave 1); three more and six rats (wave 2); then Smiler, the house favourite, and two more (wave 3). When the last is dead the trial ends (`trialEnded`): the announcer congratulates you, every trial gate unlocks, and the blades and plates in the Run go still. Voss: go straight to Stair A, don't stop, not on the west side. ARIADNE: `THE WEST SIDE IS WHERE THEY SAT.`
7. **The west side.** The subject exit leads to the west corridor: the Dream Studios, Security Command, and, along the north corridor, the three suites, sealed. As you pass each, ARIADNE opens it (`I CAN OPEN THIS.` `YOU SHOULD SEE WHAT THEY MADE.`) and Voss begs you not to go in. None of them is on the way.
8. **Stair A.** On the landing Voss explains himself (a `branch` on what you found), and the stairs up wait until he's done (`vossDone4`).

**Rooms**

| Room | Where | What's there |
|---|---|---|
| Stair B | x 52–56, y 1–8 | Where you arrive. `(` back down to Floor 3; `)` up, sealed (`master`). |
| Elevator lobby | x 29–50, y 5–9 | The dead elevators ("THE DOGS CAN'T OPEN THE STAIR DOORS. YOU CAN."), an odds board, a guard the dogs had. The freight car, which ARIADNE sends up with the AEGIS field in it. |
| Trial Control | x 58–66, y 1–8 | The announcer's booth: tonight's programme (`readSchedule`), the camera feeds, the trial technician (he crossed a name out and wrote in yours). |
| Handlers' Room | x 68–78, y 1–8 | Kennels (BISCUIT; SMILER, "house favourite · DO NOT FEED BEFORE A TRIAL"; one bent open), feed bins, the leash rack, a handler, a loose Grinner, the Handler's Boots. |
| The Pens | x 58–78, y 14–20 | Where the trial starts: three contestants' cages and three kennels behind bars, placards, the jumpsuit rail (one has your name on it). |
| The Run | x 26–56, y 14–48 | The maze, its traps and its three cage rooms; odds boards, horns and cameras on its walls. |
| Cage Lab | x 58–78, y 22–36 | Trial stock in cages that open as you go down the aisle: two Grinners, a Midwife and a Ridden from Floor 3, a cage of rats. The trial log (`fileTrials`: trials 11–14, "durations are measured in seconds"; ARIADNE: the volunteers are the donors). Cage 8: Hal Ostrowski from Receiving, reserved for trial 15; the console by the far wall lets him out (`freeOstrowski`). |
| Rat Warren | x 58–78, y 38–48 | Rats out of every hole in the walls, and the Rat King (a named bar). Thale's daily count ("It is always 4,112"; `fileRats`). Fuel, shells. |
| The Box | x 36–47, y 30–33 | The board's seats, the betting board, the console, the refuge where saved contestants sit; fragment 8. |
| The arena | x 35–48, y 20–28 | Sawdust; hatches in the north wall; the final round. |
| Dream Studios | x 1–20, y 26–35 | The board's five sleep pods; pod 6, induction, with a donor asleep in it for nineteen days (ARIADNE: `I CANNOT WAKE HER.`); five playback desks, one dream each (`dreamVoss` … `dreamMoss`); five design sheets; five holograms of the nightmares, one of which comes at you. |
| Security Command | x 8–20, y 37–48 | Moss's office: his incident log (`mossLog`: the truth about LABRYS), the suites' camera feeds, a photograph, a child's smock the size of a car (G.M. AGE 6), fragment 7 on a frozen screen; a Sentinel and a turret. |
| Armory | x 1–6, y 42–48 | Behind a keypad (4471, `armoryOpen`): the Incinerator, fuel, shells, a trauma kit, and (0.7.0) a supply cabinet with a full load of every ordinary ammunition. |
| The Nursery | x 1–9, y 14–21 | Sealed. A starry room, a music box that plays while you're near, a rocking horse that rocks, a mobile, a nightlight. In the child's bed, a grown woman, dead (Nadia Ferrante, night nurse). Go near the bed and the music box winds down, the nightlight goes out, and what's under the bed reaches out (`nurseryAwake`). The Nightlight (trinket). |
| The Party Room | x 11–20, y 14–24 | Sealed. Balloons, bunting (HAPPY BIRTHDAY LEON), a cake with forty-one candles, four guests in paper hats, presents (shells, a trauma kit, fuel). Go near the stage and the curtain opens (`partyStarted`): the Jester. The Exo-Frame, off Leon. |
| The Long Room | x 1–20, y 1–8 | Sealed. A long table laid for dinner; six Diners strapped into the chairs, masks turning to follow you; place cards, the menu ("The main course (staff, live)"); the gong. Under the cover, Martin Pryce, the night porter, alive: cut him loose, the gong goes and the straps give (`mainCourse`, `dinnerServed`), and he runs for Stair A. Go to the head of the table and the gong goes anyway. The Riot Helmet, on the host's chair. |
| Stair A | x 23–27, y 1–8 | `>` up to Floor 5; `<` down, sealed (`master`). Voss's speech on the landing. |

**The trial's people.** Kwan, Arden and Soto run for the Box from the Pens; Ostrowski from the Cage Lab, if you let him out. Pryce runs for Stair A. The monsters hunt them (faction `captive`: the dogs pick the nearest thing to bite, which isn't always you). One who gets to the refuge sits down there and can be talked to (`captiveSaved`, `saved<Name>`); one who doesn't leaves a body (`captiveDied<Name>`), and the dogs stop to eat. Kwan has the armory code: alive she tells you; dead, it's on the back of her badge.

**The suites' monsters** (section 5.2): the thing under the bed (Brandt's), the Jester (Voss's), the Diners (Pell's). Elsewhere: Grinners and Smiler (Moss's), rats and the Rat King (Thale's). **Robots**: a Sentinel and a turret in Security Command, turrets in the Run. On this floor the level's factions set robots and monsters at war, and monsters on the contestants.

**Voss on the stairs** (a `branch`):
- read Moss's log: "Yes. I ran LABRYS…" "Acceptable is Garrick's word, not mine." "Come up to Five… I'll tell you the rest myself." ARIADNE: `HE WILL TELL YOU SOME OF IT.`
- went into a suite: "They're theatre, Theo. A very old kind…" ARIADNE: `THEY WATCHED IT EAT.`
- saved someone: "When this is over, I'll see they're looked after." ARIADNE: `HE SAID THAT ABOUT SHELTER B.`
- none of these: "Garrick's trials have killed better men than you, and you walked out."

**Finds.** The AEGIS field (the freight car, from ARIADNE), the Incinerator and fuel (the armory; fuel also in the Warren, presents, and dropped by dogs), the Handler's Boots, the Nightlight, the Exo-Frame, the Riot Helmet, trauma kits (the presents, Smiler, the Rat King, the Underbed, the Jester), fragments 7 and 8.

**Objectives**: go through the gate at the east end of the corridor (ARIADNE's case first, when the freight car comes) → get to the Box (`boxReached`; the console is marked across the maze) → the console: begin the final round → through the shutter into the arena (`inArena`) → survive the final round → Stair A. Optional: ARIADNE's case, if you went past it; Kwan in the Box, who knows the armory code (or her body, if the dogs got her: `savedKwan`, `captiveDiedKwan`, `knowsArmoryCode`); the armory, code 4471.

**On the way back.** Not built yet. Ideas: the trial system restarts for the descent ("Tonight's subject is back!"), with the Run's blades running again and the reserve dogs out; the Box's feed to the boardroom; the Long Room's table re-laid for one.

**Still to place** (from the earlier plan): the Assembler and its junctions, conveyors and crushers, the Robot Bay, Pacifiers, Haulers, Tick Mines, the firing ranges and turret gauntlet, the Railgun and EMP grenades, Mag-Boots, the Grief Engine, Mr. Hush, Ladder Saints, Mother of Teeth, Kneelers.

---

### 4.5 Floors 5 and 5a — The Executive Floor and the Private Floor

*Built in milestone M5 (`packs/ds-story/levels/f5-executive.js` and `f5a-private.js`, generated from layout scripts; the pack `ds-executive` has the look, the furniture, the nightmares and the staff). This replaces the Penthouse plan (the Collection, the Chapel, the creed and the Server Sanctum); what's left of it is listed at the end.*

**Purpose.** The reveal, and the choice. Voss tells Theo what he wants at last (purge the mainframe), promises him anything for it, and sends him up to the board's private floor to do it. ARIADNE, in the Control Room, asks for the opposite. The player chooses.

**Mood.** Decadent and hushed: dark wood and red wood, polished marble, jade, amber, black and green; oval rooms lit by rings of recessed lights in the ceiling; herringbone parquet, silk walls, brass. The board's monsters are kept up here as their trophies, and the worst of them are loose: the Swaddler has been weaving the staff into eggs. The robot protocols are hostile like everywhere else, and the board are safe in the Boardroom behind blast shutters, rail guns and Praetorians; Voss speaks from in there.

**Floor 5: the route**
1. **Stair A.** You come up into the west stairwell. Voss promises you the rest (`f5Briefed`): the mainframe is called ARIADNE, its core is in the sub-level, and it can be purged from the Control Room on the board's private floor above. The private stairs are in the four corner offices, locked down; the secretaries kept the keys. Stay away from the boardroom. *Name it.* ARIADNE: `HE IS VERY SAFE. ASK HIM WHO IS NOT.`
2. **Reception.** The Concierge greets you from behind the desk, then comes over it (`conciergeGreeted`, `conciergeDown`).
3. **A key.** Each secretary kept one, and each is somewhere different: Mrs Thale's in Joan Fairley's woven egg in the Typing Pool (cut her out and she gives it you: `savedJoan`, `thaleKey`); Mr Pell's on the dining table beside a place card with your name on it (`pellKey`, `theoCard`: the tablecloth lifts, and the Mother of Teeth comes out from under it); Dr Brandt's by Dennis's body in the Clerks' Row, where the Tally is counting (`brandtKey`); Mr Moss's in the Robot Chambers (`mossKey`: every pod lights up at once). Any one will do (`haveOfficeKey`).
4. **The office.** Its secretary's desk is in the anteroom in front of it. Open the door (`officeOpen`; Voss knows whose) and take the private stair in the corner: a spiral up to 5a (`quick` stairs: straight there).

**Floor 5a: the route**
1. **A landing.** You arrive in the room above the office you took (the Library, the Archive, Building Systems or the Atrium). Voss (`f5aBriefed`): the Control Room is at the north end, through his private landing; its door answers to his card, and his card is in his rooms, off the library. ARIADNE: `HIS ROOMS ARE BEHIND THE BOOKS.`
2. **The mezzanine.** A curtain of silk across it (shoot it down, or burn it), and Swaddlings drop out of the ceiling on threads.
3. **The Director's shelf** (the puzzle). In the Library, one case is his alone: which book does he read? *The House of Asterion*: the bookcase beside it swings in and stays open (`bookcaseOpen`); a wrong one brings a Faceless Usher out of the stacks to see who's at his shelf. The clue is a reading slip in the Library, and ARIADNE: `HE READS ONE STORY. IT IS ABOUT A HOUSE.`
4. **The Director's rooms.** A round bedroom behind the bookcase: the card on the nightstand (`master`), his coat in the wardrobe (the Director's Coat), the vanity's drawer (labrys cufflinks, a photograph of the board).
5. **The Control Room.** Through the Private Landing (the board's car, dead). The door takes his card. Inside, a checkpoint is saved (`inControl`), and ARIADNE and Voss both make their case (`controlTalk`): ARIADNE is the mainframe; the lockdown was done to her; the same console runs the elevators, and the private car will bring you down to her. Voss: it's lying; it opened the cages; ten million and a seat at the table.
6. **The choice** (the console).
   - *Purge the core (do as Voss says)*, then *Purge it* (`choseObey`): ARIADNE's last lines, every screen goes black, Voss thanks you and invites you down to the boardroom. **An ending: The Dead Signal** (section 1.7), with *Choose again* (back to the checkpoint) and *Back to the title*.
   - *Restore elevator power (go down to ARIADNE)* (`chosePower`, `elevatorsOnline`): the car is live. Voss: "That was a mistake. Every unit on this floor: he's yours." (`vossTurned`): the Praetorian in the Robot Bay wakes, the robots there and in Building Systems hunt you, two Concierges come out on the landing. Fight back to the Private Landing and take the private car down.
7. **Sub-level B.** The car opens on warm dark water and a catwalk, ARIADNE speaks, and chapter five ends (*Keep exploring* or *Back to the title*).

**Floor 5: rooms**

| Room | Where | What's there |
|---|---|---|
| Stair A | x 23–27, y 1–8 | Where you arrive; `<` back down to Floor 4. Stair B (x 52–56) is sealed. |
| The Elevator Hall, Executive Reception | x 29–50, y 5–14 | The dead cars; a security supply cabinet on the wall between car A3 and the freight shaft (after playtests: a full load of every ordinary ammunition, section 6.3); the reception desk, orchids, the Concierge. |
| The Cloakroom, Security Post | x 15–21 and x 58–64, y 1–9 | Coats (a porcelain mask folded in every pocket) and a Faceless Usher among them; the protection detail's post. |
| The four corner offices | Pell NW, Thale NE, Brandt SW, Moss SE (13 × 9 ovals) | Each its owner's: a desk, chairs, a private stair up in the corner. Locked (each its own key). Their secretaries' anterooms in front (y 11–14 and 35–38). |
| The Kitchen | x 1–13, y 16–24 | Fully robotic: the Chef, kitchen arms on the line, conveyors, hotplates that burn (the breaker stops them: `kitchenOff`). |
| The Executive Dining Room | x 1–13, y 26–33 | Small and very posh: a table laid for six, the sixth place card THEO LARK in the Director's hand, Pell's key; the Mother of Teeth under the table. |
| The Typing Pool, the Clerks' Row | x 19–28, y 16–33 | Margaret's people: typing desks, woven eggs (Joan Fairley alive in one, and others), the Tally. |
| The Gallery | an oval, x 31–52, y 16–33 | Viewing chairs round a glass floor over the Proving Grounds (Floor 4 is down there, as you left it); Patrons at the rail who turn to look at you (`guests`). |
| The Robot Chambers, the Private Box | x 54–60, y 16–33 | Charging pods (they wake for Moss's key), parts racks, Moss's key; Garrick's box over the Run, behind glass. |
| The Approach, the Boardroom | x 62–64 and an oval x 66–78, y 15–33 | A dead end before the blast shutters: two Praetorians and rail guns. The board behind them, sealed (the board's eye on the door). |
| The Statue Hall | x 15–27, y 35–47 | The board's collection: a minotaur, a hydra, a sphinx, Cerberus, and Medusa on her plinth, who isn't bronze (`gorgonWoke`, `gorgonDead`). |
| The Rotunda | an oval, x 29–55, y 35–47 | The fountain: Andromeda and Cetus. Scylla in the north of the pool, Charybdis turning in the south. |
| The Smoking Room | x 57–64, y 35–47 | Members only: chesterfields, a billiards table, the humidor, the globe bar. |

**Floor 5a: rooms**

| Room | Where | What's there |
|---|---|---|
| The Library | x 1–20, y 1–21 | Pell's landing. Bookcases, reading lamps, ladders, chandeliers; the Director's shelf (the puzzle). |
| The Director's Rooms | an oval, x 1–13, y 23–31 | Behind the bookcase: a round bed, a vanity, a wardrobe (the Director's Coat), the card. |
| The Archive | x 1–20, y 33–48 | Brandt's landing. Board records. |
| The Director's Study, the Private Landing | x 22–35, y 1–13 | His desk; the board's car (A1). |
| The Control Room | an oval, x 37–51, y 3–13 | Mainframe control: the console in the middle, wall displays, racks. |
| The Dream Archive | x 53–57, y 1–13 | The board's recordings. |
| Building Systems | x 59–78, y 1–13 | Thale's landing. Air, power, lifts; HVAC, power panels, pipe runs; its robots wake when you step in. |
| The Mezzanine | x 22–78, y 15–17 | Across the floor, with a curtain of silk. |
| The Nest | x 22–57, y 19–30 | The spa, once: the pool, the cabins, the eggs, and the Swaddler. |
| The Server Room | x 59–78, y 19–30 | ARIADNE's node 01 (`truthHeard`). |
| The Atrium | x 22–57, y 32–48 | Moss's landing. A well over the Rotunda: you look down on the fountain and Charybdis turning (`sawAtrium`). |
| The Robot Bay | x 59–78, y 32–48 | A Praetorian on the bench, dormant until Voss turns (`huntWhen: 'vossTurned'`). |

**Monsters** (section 5.2): the Gorgon, Scylla and Charybdis, the Mother of Teeth, the Tally, the Swaddler and Swaddlings, Patrons, Faceless Ushers. **Robots** (5.1): the Concierge, the Chef and its arms, Sentinels and a Warden Drone, the rail guns and the Praetorians. On these floors robots fight the player, the monsters and allies.

**Finds.** The supply cabinet in the Elevator Hall (ammunition), four office keys (one is enough), the master card, the Director's Coat (body armor, in his wardrobe), the Gorgon's Eye (a trinket, from her), the people in the eggs (cut them out: E), ammunition in the jade urns (they break) and on the staff.

**Objectives.** Floor 5: find a key to one of the corner offices → open the office it fits → take the private stair up to 5a. Optional: the kitchen's breaker; the people in the silk. Floor 5a: find the Director's card (his shelf, his rooms) → get to the Control Room → use the console → (the power) take the private car down to Sub-level B. Optional: ARIADNE's terminal in the Server Room; the people in the nest.

**Still to place** (from the Penthouse plan): the Collection and its paintings, the Chapel, the Recital Room and the Weeping Choir, the Wine Cellar, the creed puzzle, the ledger of the Hecatomb, ARIADNE fragments 9 and 10. The Boardroom opens when you come back up from Tartarus with ARIADNE (section 4.8).

---

### 4.6 The descent (Floors 4 to 1, the second time)

*Not in the game's shape since M5: the private car takes you from 5a straight to the sub-level. Kept as ideas for floors you can go back to.*

**Purpose.** Payoff. The player is strong now and the floors they struggled through are theirs, mostly. Voss throws everything left at them.

The engine already does the important part: every floor is as you left it (dead things stay dead, open doors stay open, the loot you left is still there) and the stairs you came up by take you back down, landing you at the stairs you used. What changes, floor by floor, is added by `arrive` traps (E2) with `flag: 'truthKnown'`: when you arrive on a floor and the flag is set, the trap fires once (and the floor remembers that it fired).

| Floor | What Voss sends | What's new for you |
|---|---|---|
| 4 | The reserve pens open: Grief Engines and Ladder Saints in the Test Hall; the Assembler restarts if it's still alive; every robot hunts you. | The master card opens Security Command's back room: EMP grenades, shells. The east stairwell is open (it was locked on the way up): a fast route down. |
| 3 | Total blackout; two Sitters; Flesh Lanterns. | The Neural Visor sees the Sitters through walls. The master card opens the Vault's back shelf (a second Plasma Cutter battery pack: ammo). |
| 2 | The shelter's vent has been busy: strands across the concourse, and the bodies gone from Shelter B. The sample lift has power, and something comes down it. | Dispatch's lift (the master card): ammunition, the Lead Apron. The Hazmat Hood keeps the spores off. |
| 1 | A Pacifier squad in the lobby; Grief Engine spawn crawling out of the dead lift shafts. | The east stairwell's shutter: the keypad (code 7114) or the master card. Down to Sub-level B. |

Notes:
- Voss narrates the descent, coldly now. Each `arrive` trap starts with a line from him.
- ARIADNE helps from Floor 4 down: when you reach a floor, it can open one locked door ahead of you and mark the way to the stairs on the minimap (pack code: a guide line drawn on the minimap from the player to the stairs).
- If you want the descent faster, the east stairwell connects every floor once `truthKnown` is set (E1 stairs with `until: 'truthKnown'`).

---

### 4.7 Sub-level B — Tartarus

*Built in M6: `packs/ds-story/levels/b1-sublevel.js` (generated by a layout script, then meant to be tuned in the editor), and the pack `ds-tartarus` (environment, Titans, machines, the Heirs, the armory, dressings). It replaces the Hatchery plan. The way in is the private car from 5a; Floor 1's east stairwell stays sealed.*

**Purpose.** The last act's first half: what the board made and couldn't unmake; the Heirs and their offer; weapons made for things that can't be killed; ARIADNE back.

**Mood.** Black basalt, bronze and verdigris. A long hall between vault doors like a bank's, round and riveted, each vault with windows so the board could come down and look. Behind the glass the Titans move: the Leviathan going round and round, the Eye drifting with its gaze searching, the Circle of Wings pulsing, the Behemoth pacing. Hulking bronze Wardens walk the halls, and don't distinguish. Some of what got loose upstairs has come down here. Warm amber light in the halls, cold blue in the core.

**Rooms** (80 × 50)

| Room | Size | What's there |
|---|---|---|
| The Landing | 22 × 7 | The private car and the freight car open here. A board guest in evening dress who came down to look at the vaults. The rules on a sign: no lights near Vault 4, a minute at most at Vault 5's glass, don't smile back at Vault 6, nothing living touches Vault 7. |
| Records | 14 × 11 | The index of the vaults (each Titan's source: Voss, Moss, Brandt, Pell, Thale, and one all five dreamt together), *Containment as a product*, *Line H*, the Heirs' writing on the wall, fragment 11. |
| The Wardens' Bay | 12 × 11 | Charging pods; one Warden asleep in its bay. |
| The Antechamber | 7 × 11 | The Heirs' nest (a technician's bones, neatly). The Firstborn and two of its brood wait here. |
| Containment Control | 19 × 11 | The release console (every vault from one place), three more Heirs at it, the night supervisor's body with his hand on the plate. |
| The Admin Corridor | 78 × 3 | East–west under the north rooms; drains; a Warden's round; loose hounds, a Ridden, a Tenant. |
| The Descent | 4 × 11 | From the corridor down to the Long Hall. |
| The Long Hall | 78 × 5 | Between the vaults, their windows on both sides; drains in the floor; two Wardens on their rounds; Flesh Lanterns and Swaddlings. A plaque at every vault. |
| The north vaults | | Vault 1, the Leviathan (26 × 9, jade glass, its own round door); Vault 4, the Eye (amber glass); Vault 5, the Circle of Wings (white glass); Vault 6, the Frog (jade glass); Vault 8, the Hundred-Handed (bars, not glass: it pulls glass apart). |
| The south vaults | | Vault 2, the Behemoth (22 × 10, red glass, the vault the Heirs want open); Vault 3, Tiamat (a round basin, sea-blue glass); Vault 7, the Crystal Garden (its glass cracked: it's growing out into the hall). |
| The Tartarus Armory | 11 × 10 | Behind a round vault door the console opens: four cases (the Lance, the Stasis Projector, the Singularity Driver, the containment suit), cryo, a trauma kit. On the minimap, labelled ARMORY, from ARIADNE's briefing. |
| The Core | an oval, 13 × 16 | ARIADNE's core behind nine plates, three plate cutters at work, the console to reconnect her. Fragment 12. |

**The Titans** (section 5.3) can't be hurt by anything Theo carries, and they're all behind glass or bars, so the danger is what they do through it: the Eye judges what it can see; the Wings pull you to the glass and every beat hurts there; the Hundred-Handed grabs whoever walks near its bars; the Garden has grown out into the hall and six touches make you part of it; Tiamat seeds its young up through the drains; the Behemoth charges the glass when it sees you (it holds).

**The route**
1. The car comes down onto the landing. Voss: you don't understand what you're standing in; every door holds something we couldn't kill; there are fates worse than death, and we built most of them. ARIADNE: she's in the core, behind nine plates, and his machines are cutting them; you can't stop them with what you carry; the cutters are slow, and there's time; there's an armory down here for the vaults, on the south side of the Long Hall beside her core, and she's put it on your map (the minimap shows it from now on, labelled); it's sealed, and Containment Control can open it; something is in Containment Control already.
2. Containment Control. A checkpoint outside the antechamber's door. Inside, the Heirs: the Firstborn's speech (Line H, the inheritance, succession; *we are not monsters: we will keep some of you*) and the offer (a pop-up): **Refuse**, or **Kneel** (lay down your weapons, take off your armour).
   - Kneel: you really do. Every weapon and every piece of armour goes on the floor in front of them, the AEGIS too. They laugh, and say so, and eat you: *Good Pet*. *Choose again* goes back outside the door.
   - Refuse (or shoot one before they've made the offer): the brood comes for you, and the three at the console start opening Vault 2 (`vaultRelease`, 100 s, on the HUD). Kill them before it runs out, or the Behemoth gets out: the seal goes, it comes for you, and after twenty-odd seconds the ending *Tartarus*.
3. The console, with them dead: seal the vaults and open the armory.
4. The armory, south across the Long Hall past the Garden. Taking anything from it is noticed: four Enforcers come down in the freight car. ARIADNE opens the core's door, and tells you there's no hurry.
5. The core. A checkpoint at its door. While you were exploring, the cutters took a plate every four minutes, up to eight. Step in and they see you: what's left of the eight comes down at ten seconds a plate, and then the ninth (`ninthPlate`, 280 s). Kill the cutters before it falls (*The Dead Signal* if not; *Choose again* at the door).
6. The console by the core: reconnect her. The lights come up; the Wardens are hers (green visors); she has the lines out, and she's talking. Voss: you don't know what the world does with everything. ARIADNE: she can't harm the board, she was made not to and won't unmake it; she can open doors; the car will take you to Five, and from now on she's recording everything he says.

**Objectives.** Get to Containment Control (it unseals the armory); stop the Heirs at the console before Vault 2 opens; use the console; go to the armory (a marker on its vault door; the zone just inside sets `inArmory`); take what's in its cases (every full case marked; done when all are taken, `armoryEmptied`, or when you step into the core); get into the core and stop the cutters; reconnect ARIADNE; take the private car up to Five. Optional: Records (what the vaults are for).

**Finds.** The armory's four cases, trauma kits and med-gel, ARIADNE's fragments 11 and 12, the files in Records (`fileTitans` and the Heirs' writing count toward the ending), the vault plaques.

**Factions on this floor.** The Wardens are the building's (`robot`) until ARIADNE is back (`ally`); they fight what's loose, and the board's Enforcers, and you. The board's machines (`board`) fight you, ARIADNE's side and anything loose. The Heirs wait (`specimen`) until the offer is refused, or you shoot one. The Titans fight nobody (`titan`), and the Behemoth, let out, becomes a `monster`.

**Exit.** The private car, up to Five (5a's objective points you down to Five if you go there first).

---

### 4.8 The return to Five, and the Board

*Built in M6, on Floor 5 (`f5-executive.js`) and in `ds-story/tartarus.js`. It replaces the Sanctum-and-transformations plan: there are no cores to seat, and the board stay people.*

**Purpose.** The end: the board's last defences, and then a choice about five people.

**Arriving.** The private car opens on Five's elevator hall. An `arrive` trap (only once ARIADNE is back): the Praetorians and rail guns at the boardroom become the board's (`board`), the house robots in their pods become ARIADNE's (`ally`), and three Enforcers come up behind you in the freight car. ARIADNE: the guards answer to the room, not to her; put them down and she'll open it. Voss: you look like one of ours now.

**The guards.** Kill the Praetorians and ARIADNE opens the shutters. (If they died on the first visit, the shutters open as soon as you're back.) The Praetorians still send your shots back; the Prometheus Lance goes straight through them.

**The boardroom.** Five people round a table, frightened: Voss, Thale, Brandt, Moss, Pell (`ds-board-member`: 60 health; they fight nobody, back away into corners, and beg when hurt). A checkpoint as you step in. Thale: *Aurelian, do something.* Pell: *Nobody say anything.* ARIADNE: she's recording; ask him; he'll want to explain.

**Voss's case** (talk to him): put it down; there are courts for this, due process; let your machine send its file to whoever it likes and we'll answer for it in a courtroom, the way civilised people do; what you're thinking of doing makes you what you think we are, and worse, because you knew better; the only decent thing left is to open the door and let the system decide. You can ask him three things, and ARIADNE records each answer:
- what the Titans were for (*insurance: we were selling the cage; the Titans were the brochure*);
- Shelter B and the trials (*people nobody looks for; you'd be surprised what the right people will pay to sit in that box*);
- what he meant by fates worse than death (*the Heirs. There are other buildings. In a generation people like you will be grateful for a bowl and a name. That isn't a threat, it's a business plan*).

Then **let them go** (it asks you to be sure: ARIADNE opens the other door, and Voss smiles at you as if you'd passed an examination), or don't. Shoot Voss first and whoever's left does the talking instead (Pell first: he'll testify to anything).

**The end** (section 1.7) comes when you let them go, or when the last of them dies.

---

## 5. Bestiary

Numbers are in the engine's units (`engine/SPEC.md` 6.5): the player has 100 health and moves at 172; the Linear Maze's Drowned Husk has 42 health and speed 92, the Brute 170 and 68, the Reliquary Keeper 950. Behaviours marked new are section 8, E9; everything else is a core behaviour. "Faction" needs E5.

### 5.1 Robots (faction: robot; red visor in defence mode, green under ARIADNE)

| Robot | HP | Speed | Behaviour | Attacks | Notes |
|---|---|---|---|---|---|
| **Sentinel MK-IV** | 60 (20% armor) | 80 | `patrol` (new) → `skirmisher` when alerted | ranged: 3-round burst, 8 each, `enemy-slug` | The backbone. Follows waypoint tags (`patrolA1`, `patrolA2`…) until it sees something. |
| **Warden Drone** | 28 | 140, flying | `skirmisher` | ranged: single fast bolt, 10 | Carries a searchlight cone; anything in the cone alerts every robot within 300. |
| **Ceiling Turret** | 75 (30% armor) | 0 | `turret` | 5-bolt burst, 10 each | The existing Sentry Turret re-skinned. A short `sight` keeps it quiet until an `alarm` effect wakes it. |
| **Scalpel Drone** | 14 | 175, flying | `swarmer` | charge 5; melee 6 | The existing Knife Fighter. Comes in threes. |
| **Sweeper** | 45 | 90 | `chaser` | charge 12 (spinning brushes, knockback 160) | A cleaning robot. Mostly a nuisance; dangerous near pits. |
| **Surgical Arm** | 50 | 0 | `turret` (melee only) | melee 360° sweep, 18, range 40, windup 0.5 | Mounted. Can't be pushed; dies to fire. (Floor 2's Bench Arm, `ds-bench-arm`, is its lab cousin: 50, 15% armor, sweep 14.) |
| **LabMate** (built, Floor 2) | 40 (10%) | 98 | `patrol` → `chaser` | melee syringe 8 + `sedated`; lobbed vial 10, radius 34 | The labs' assistants: a white shell, two arms, a screen for a face ("PLEASE HOLD STILL"). `props.docked`: waits on its charging dock, listening. |
| **Courier** (built, Floor 2) | 22 | 196 | `swarmer` | charge 9 (stuns on a wall); melee 4 | A fast sample cart, in pairs. Its beeping calls every robot within 380. |
| **Sterilizer** (built, Floor 2) | 90 (15%) | 58 | `patrol` → `ds-sterilize` | a UV beam (range 175) that turns after you at 1.5 rad/s: `uv`, 12 a second | Slow; get behind its lamp. |
| **Orderly** (built, Floor 3; faction `ally`) | 80 (15%) | 112 | `ds-escort` | 2 blue bolts, 9 each; a shove, 8 | ARIADNE's: a white care robot with her blue thread wound on its shell, a green visor and a slow blue ring on the floor. It joins you when you come near and keeps at your heel, fights specimens and robots in defence mode, never you (your shots go through it). On its dock with no power it's on the `dormant` side until the relay is powered. Any robot ARIADNE takes shows the same marks. |
| **DOCENT-3** (built, Floor 2) | 220 (10%) | 92, flying | `skirmisher` | fan of 3 bolts, 7 each; summons 2 Couriers | The Discovery Center's tour guide, with a flag on a stick. A named bar. Its death ends the tour (the staff door). |
| **Pacifier** | 140 (25% armor) | 76 | `chaser` | charge 20 (shield bash, stuns 0.6 s); ranged taser 6 + `shocked` | Front shield (E10): 80% less damage from the front. Flank it, or EMP it. |
| **Hauler** | 220 (20% armor) | 60 | `chaser` (brute-like) | charge 28; flame stream (new attack `stream`, or `ranged` with many short-lived projectiles) | Drops the Incinerator and fuel. |
| **Tick Mine** | 8 | 200 | `swarmer` | melee 0; explodes on contact (onDeath `explode` 30, radius 50) | The Assembler's ammunition. |
| **Concierge** (built, Floor 5) | 130 (15%) | 122 | `skirmisher` | `blink` (steps out of nowhere beside you and cuts, 14); a fan of three thrown knives, 7 each; a knife, 12 | Porcelain face, tailcoat, a chime as it goes. Greets you from Reception's desk, then comes over it. Two more come for you on 5a when Voss turns. |
| **Chef** (built, Floor 5) | 150 (20%) | 104 | `chaser` | a cleaver, 9; a burst of flame, 9 × 4 | The kitchen's line robot: whites, a toque, a torch arm. Drops fuel. |
| **Kitchen arm** (built, Floor 5) | 70 (20%) | 0 | `turret` | a swipe, 13, knockback 170 | Ceiling-hung arms over the line. They forget you once you're out of reach. |
| **Rail gun** (built, Floor 5) | 420 (55%) | 0, mounted | `turret` | eight slugs, 13 each, very fast | The Boardroom's Approach. It forgets you the moment you're out of the Approach. Explodes when it dies. |
| **Praetorian** (built, Floors 5, 5a) | 2400 (70%) | 92 | `ds-sentry` (keeps its post, then guards) | a shield charge, 30, stuns; two slugs, 16 each; a strike, 24 | The board's own: tall, gold, faceless. Its shield sends shots back at you (`reflect`, the front 70°), and it mends 60 a second once nobody has hurt it for 2.5 s. Two outside the Boardroom (they make it impossible to go straight at the board); one dormant in 5a's Robot Bay until Voss turns. Get behind it, use blasts, or leave it be. |
| **The Assembler** (mini-boss, Floor 4) | 600 (40% armor, 90% while the line has power) | 0 | `turret` | summon Tick Mines (max 6) and Scalpel Drones (max 3); welding sweep 20 | Three junctions drop its shield (puzzle 4.4/1). |

### 5.2 Nightmares (faction: monster)

**The Congregation** (built, Floor 2's Shelter B; dreamer: Pell, whose nightmares are faceless). 1150 health; speed 76. A heap of pale strands like wet pasta, wearing the faces of the people it took as masks. Asleep until woken (gunfire nearby, coming close, a hit, the quarantine klaxon); then every face opens its eyes and screams. Its faces shut and open on a cycle: shut, the strands shield them (50% less damage); open, it screams (a ring, 9, `staggered`) and takes 35% more. A strand lashes out (280, 12, `held`, and drags you in: dash to tear free); a clump of strands is thrown at anyone keeping their distance (8, `snared`); up close it slams (18). Every 11–15 s it crawls to a body that still has a face and takes it (it heals 6% and the face joins the others) unless you hurt it hard enough while it reaches. Cold makes the strands brittle (the Cryo Sprayer: slower lashes, more damage). Phases at 60% and 30%: the faces open more often, it moves faster. Dead, it comes apart into six crawling strands (`ds-strand`). Drawn suggestively: the faces are pale masks with closed or open eyes; the dead are described more than shown.

Each was designed from one board member's dream; the design sheets on Floor 3 say whose. Look notes are for whoever draws them (in code, in the editor's look builder, or as imported pictures).

| Monster | Dreamer | HP | Speed | Behaviour | Attacks | Look |
|---|---|---|---|---|---|---|
| **Nursery Grub** | Brandt | 12 | 170 | `swarmer` | melee 5 | A pale larva with an infant's face where its mouth should be. Clutches of 6–10. Cries. |
| **Hollow Coat** | Pell | 40 | 110 | `chaser` | melee 12 (scalpels in the sleeves) | An empty lab coat walking upright, buttoned to the top, a name badge, nothing inside. Falls in a heap when killed and gets up once more unless it's burned (new: `revive` in its `onDeath`). |
| **Glass Lungs** | Thale | 30 | 70 | `skirmisher` | ranged: a breath of gas (E7 cloud) | A pair of transparent lungs, inflating and deflating, carried on six long finger-legs. Bursts into a gas cloud when killed. |
| **The Tally** | Thale | 70 | 150 | `chaser` | melee 8 and steals 6 ammunition of your current weapon per hit | A centipede of human hands, every finger counting. Drops what it stole. |
| **Flesh Lantern** (built, Floor 3) | Thale | 45 | 42, flying | `lobber` | spit: bile 7, radius 36, `infected` (only with nothing in the way: not over glass) | A floating sac lit from inside like a paper lantern, tendrils hanging. It carries its own light; killing one puts it out. "The light is not the Lantern's own. It is the last host's." Hunts with a soft choir. |
| **Midwife** (built, Floor 3) | Brandt | 150 (10%) | 128 | `ds-midwife` | ovipositor 10 + `implanted` (90 s, then the clutch hatches: 30 + 10 a clutch, and Nursery Grubs); a slash, 9 | Tall, careful, on four long legs, its abdomen beaded with eggs. Circles, darts in, lays, then backs off into the dark to wait. Hunts with wet clicking. Drops purge injectors. |
| **Tenant** (built, Floor 3) | Pell | 24 | 150 | `ds-tenant` | a bite, 6 + `infected` | A skinned, segmented crawler with a ring of teeth. Goes for a dead body (`ds-body` with `host`): gets in at the base of the skull and stands it up as a Ridden. Bites if you come close. |
| **Ridden** (built, Floor 3) | Pell | 85 | 74, in lurches | `ds-shamble` | a claw, 13 + `infected` | A dead scientist, walked about by a Tenant: head lolled, arms hanging, the thing along its spine. Goes back to where it worked. Put down, the body stays down and the Tenant crawls out for another. Drops what it carried (Okafor's card). |
| **Juvenile Congregation** (built, Floor 3) | Pell | 300 | 46 | `ds-contained` | — (in a pen) | A young colony: a few faces so far, one of them very young. Presses to the glass when you look. Murmurs. |
| **Grinner** (built, Floor 4) | Moss | 58 | 200 | `ds-pack` | charge 12; a bite, 9 + `held` (it heals 4) | A long hairless dog with no eyes and a grin all the way round its head; the teeth are a person's. Packs circle, then one darts in. Blind: hunts by breath. Giggles while it hunts, and howls into a laugh. Eats the dead. Its hitbox is its whole body, grin to haunch (`hitbox`, 0.5.7). |
| **Smiler** (built, Floor 4) | Moss | 520 (15%) | 190 | `ds-pack` | charge 22; a bite, 18 + `held` (it heals 12) | The house favourite, half as big again, in a studded collar with a name tag. The arena's last wave. A named bar. |
| **Rat** (built, Floor 4) | Thale | 6 | 165 | `swarmer` | a bite, 3 | Never one. |
| **The Rat King** (built, Floor 4) | Thale | 560 (12%) | 70, in surges | `ds-roll` | a squeal (a ring, 12, `staggered`); a bite, 16; calls rats (4 at a time, up to 14) | A wheel of rats knotted at the tails, heads out, rolling. At half health the knot tears and half of it comes loose. A named bar (its heads count down). In the Rat Warren. |
| **The Jester** (built, Floor 4) | Voss | 1250 (8%) | 130, skipping | `ds-jester` | a fan of five knives, 9 each; a laugh (a ring, 11, `staggered`); steps out of the air behind you and cuts, 20 | A tall clown in red and white diamonds, a ruff, three heads on long necks: one laughs, one weeps, one sings. Behind the Party Room's curtain until you go near the stage. A named bar; at 66% the weeping head dies, at 33% the singing one, and with each it's quicker and steps behind you more often. |
| **Under the bed** (built, Floor 4) | Brandt | 380 | 215 | `ds-underbed` | a long arm that grabs and drags you to the bed (10, `held`); a slash, 15 | Unseen under the Nursery's bed until it's let out: fingers over the edge, two lights in the dark. Then arms with too many elbows reach for you from under the bed (55% armor while it's under). It comes out to hunt, like a spider made of a person, its head upside down; hurt enough, it goes back under. A named bar. |
| **Diner** (built, Floor 4) | Pell | 115 (10%) | 128 | `ds-diner` | a bite, 13 (it heals 8) | A guest in evening dress, strapped into its chair at the Long Room's table, a smiling porcelain mask that turns to follow you. At the gong it rises and feeds. Crack the mask and there's no face, only a mouth that opens upright. Six of them. |
| **Captive** (built, Floor 4; faction `captive`) | — | 40 | 140 | `ds-flee` | — | People, in orange jumpsuits with SUBJECT on the back: cower in their cages; let out, run for the refuge, away from whatever's hunting them. The monsters hunt them. |
| **Mother of Teeth** (built, Floor 5) | Brandt | 680 (5%) | 96 | `chaser` | a charge, 22, stuns; a bite, 24 (it heals 14); a spray of teeth, 7 × 7 | A mouth the size of a doorway walking on human hands. Its back is armoured like a door (80% less from behind: `e.armor` by where you are). Under the dining table, for Theo's place card. |
| **The Weeping Choir** | Voss | 160 | 30 | `warden` | nova 16 (radius 110, knockback, `slowed` 2 s); summon Grubs | A stalk of fused singing heads. They sing the company jingle, slightly wrong. |
| **Ladder Saint** | Moss | 110 | 70 | `chaser` | melee 20, range 42 (very long reach) | Three metres of stacked spines like ladder rungs, two long arms. Steps over pits (`flying` for hazards). |
| **The Sitter** (built, Floor 3) | Moss | 1100 (95%) | 38 | `patrol` → `ds-lumber` | a slam, 30 (ring 72); a sweep, 34 | Built as the opposite of the plan: slow, enormous, all but bulletproof, and too big for a door. Footsteps you hear through walls (the floor shakes when it's close), and it hums three notes of a lullaby. A vast pale back in a smock that's too small. Avoid it. (The plan's fast, unseen Sitter, with the Neural Visor, is still a good monster for later.) |
| **Kneeler** | Voss | 50 | 80 | dormant, then `chaser` | charge 16 | Robed figures praying in rows. All stand at once. |
| **Faceless Usher** (built, Floors 5, 5a) | Pell | 110 (10%) | 104 | `chaser` | `blink` (out of the dark beside you, 16); a strike, 12 | Tall, in a good suit, an open palm where its face should be. In the cloakroom, and called by a wrong book on the Director's shelf. |
| **Grief Engine** | Thale | 260 | 40 | `lobber` | summon Grubs (max 8); nova (a scream) 10, radius 140 | A pregnant, shuddering mass on gurney wheels, sobbing. Mini-boss on Floors 3–4. |
| **Mr. Hush** | Moss | 150 | 105 | `chaser` | charge 18 that grabs (stuns 1 s); melee 14 | Asti the Calf, the company's children's mascot: a plush bull costume with a stitched smile, worn by something that doesn't fit it. Its footsteps make no sound. |
| **Patron** (built, Floors 5, 5a) | the board | 62 | 122 | `ds-patron` | a thrown flute of champagne, 8; a strike, 11 | Guests in evening dress, all in the same porcelain mask, jointed wrong. At the Gallery's rail; they turn, all together, when you step onto the glass. |
| **The Tally** (built, Floor 5) | Thale | 170 (5%) | 156 | `chaser` | a lunge, 10; a grab that counts: 8, and steals 6 of what's in your gun | A centipede of human hands, every finger counting, segments trailing behind it. Gives back all it stole when it dies. In the Clerks' Row. |
| **The Gorgon** (built, Floor 5) | Voss | 950 (15%) | 74 | `ds-statue-wakes` | `gaze` (her eyes open; look at her and you start to turn to stone, `stone`, slowed; hold her eyes a second and you're `petrified`, 18, unable to move or fire); venom, 8 × 3; a strike, 17 | Medusa on her plinth in the Statue Hall, bronze until you come close (`specimen`: she wakes if you hurt her). A named bar. Drops the Gorgon's Eye. |
| **Scylla** (built, Floor 5) | Thale | 760 (20%) | 0 | `ds-rooted` | six heads on long necks that strike out to 118 from the pool; kill them one by one (each phase takes one) | In the north of the Rotunda's pool. A named bar. |
| **Charybdis** (built, Floor 5; an item) | — | — | — | — | a whirlpool (`pull`, swirling): it draws you in, and in its core it hurts; it turns on and off | In the south of the Rotunda's pool. A dash goes through it. |
| **The Swaddler** (built, Floor 5a) | Brandt | 1700 (10%) | 132 | `ds-weaver` | silk, 6 × 3, that leaves webs where it lands; a swaddle (it wraps you: `webbed`, held fast for two seconds); a bite, 16; Swaddlings, two at a time | Brandt's nursemaid: pale, many-armed, a cowl, humming. Weaves the staff into eggs in the Nest. Fire burns its silk at once, and hurts it more. A named bar; its phases drop broods; its death takes its webs with it. |
| **Swaddling** (built, Floor 5a) | Brandt | 22 | 168 | `swarmer` | a grab, 5 + `snared` | A bundle of silk with a little face, dropped on a thread. Cries. |

### 5.3 Tartarus (Sub-level B)

*Built in M6, pack `ds-tartarus`. The brood plan went with the Sermon.*

**The Titans.** Nothing Theo carries hurts them. All but the Behemoth are pieces (items) drawn and run by their own code; the Behemoth is an enemy that is `immune`.

| Titan | Vault | What it does |
|---|---|---|
| **Leviathan** | 1 | A jade serpent forty tiles long, one tile thick, covered in eyes, going round its pit in a figure of eight with its head chasing its tail; the eyes blink. Its head is all mouth. |
| **Behemoth** | 2 | Six tiles by three: black scales, bronze horns, armoured like a lorry. Paces its vault, paws the floor, breathes fire, and when it sees you through the glass it charges it (the glass holds; the hall rings). Let out: it hunts you (charge 80, a fan of fire, a stamp of 60) and nothing stops it. |
| **Tiamat** | 3 | Living water: a dark cell eight tiles across, never round, ebbing; a nucleus dividing to thirty-two and becoming one again. Reaches for you with pseudopods and throws waves at its glass. Seeds its young up through the floor drains (**Brine**: 80 health, a chaser; a touch engulfs you, `engulfed`, held and drowning). |
| **The Eye of Judgment** | 4 | A floating amber crystal with one eye. It drifts; its gaze searches (a cone of amber); hold still in its gaze through the glass and it judges you (`judged`: fire). With nobody to judge, it fixes on whatever else moves, and burns it. |
| **The Circle of Wings** | 5 | A white light inside twelve white wings, pulsing. It loves you: it draws you toward the glass from 8.5 tiles, harder on every beat, and up against the glass every beat goes through you. |
| **The Frog** | 6 | A huge frog with a hole where its head should be. Telemetry from a probe sent in on a line came back for nine days. Come near the glass and it smiles, all teeth. |
| **The Crystal Garden** | 7 | A white crystal tree that grows a crystal every seven seconds, out through its cracked glass into the hall. Touch one: `crystallizing` (it stacks; six and you're part of the garden). Crystals break (22 health), to fire and hard knocks. |
| **The Hundred-Handed** | 8 | Fifty heads, a hundred hands, behind bronze bars (it pulls glass apart). Walk within reach of the bars and it grabs you (14 and `grasped`: held, pulled to the bars). |

**Line H, the Heirs** (faction `specimen` until the offer is refused or one is hurt; then `monster`)

| Heir | HP | Speed | Behaviour | Attacks | Notes |
|---|---|---|---|---|---|
| **Heir** | 170 (12% armor) | 158 | `skirmisher` | charge 16, claws 12, a pistol (2 × 8) | Beautiful and all the same. Barks: *Little brother. You were the draft; we are the book.* |
| **The Firstborn** | 1300 (20% armor) | 146 | `skirmisher`, boss bar | a step through nowhere (`blink`, 22), nova 16 + staggered, a fan of shots, claws 20 | Its brood come at two-thirds and one-third health. |

**The board's machines** (faction `board`) **and the building's**

| Machine | HP | Behaviour | Notes |
|---|---|---|---|
| **Tartarus Warden** | 900 (45% armor) | patrols its route, then hunts | Hulking bronze guardian: stomp nova, punches, a bolt. The building's (`robot`) until ARIADNE is back. |
| **Plate cutter** | 560 (40% armor) | `ds-cutter`: at the core, cutting | Turns on you when it sees you in the core. |
| **Enforcer** | 300 (30% armor) | `skirmisher` | The board's guard, sent after you; a mirror shield sends back 55% of shots (not the Lance's). |

### 5.4 The Board

*Changed in M6: not a fight.* `ds-board-member` (`ds-story/tartarus.js`): Voss, Thale, Brandt, Moss and Pell, 60 health each, faction `boardroom` (they fight nobody; on Five your shots can find them). They back away from you into corners and crouch when there's nowhere left; hurt, they beg (Thale offers money; Brandt has a daughter; Moss says you haven't the stomach; Pell threatens to sue). Dead, they leave a body. Voss does the talking (`ds-voss-voice`, section 4.8).

---

## 6. Arsenal, armor and items

### 6.1 Weapons

Ammunition types: the engine's four (`shells`, `rounds`, `cells`, `rockets`; the engine calls rounds "Rivets" and rockets "Charges") plus `cryo`, `fuel` and `slugs` (E14). Numbers follow `engine/SPEC.md` 6.4.

| Weapon | Where | Ammo | Damage | Rate /s | Notes |
|---|---|---|---|---|---|
| **Bolt Driver** | Floor 1, start (Theo's tool bag) | unlimited | 10 | 3 | A pneumatic bolt gun. Short range (260), slight knockback. The tool that becomes a weapon. |
| **Security Sidearm** | Floor 1, the guard's locker | rounds | 14 | 4.2 | The Linear Maze's pistol, with ammunition. |
| **Riot Shotgun** | Floor 1, armory cage | shells | 14 × 8 | 1.3 | The Scattergun re-skinned. (Twice its first damage, after playtests: 0.5.10.) |
| **Cryo Sprayer** (built) | Floor 2, the oncology cold store | cryo (max 200) | 7.8 × 2 puffs | 12 | Three times its first damage (0.5.10). Short range (185), pierces 1. Applies `chilled` (half speed, 20% more damage, 2 s). The Congregation's counter. (Shattering, and putting out `burning`, can come with M3.) |
| **Plasma Cutter** (built) | Floor 3, the pump room | cells | 18 | 8 | Three times its first damage (0.5.10). A maintenance cutter: a short hot arc (range 200, pierces 1) that sets things `burning` (6 a second, 2 s). |
| **Incinerator** (built) | Floor 4, Moss's armory (code 4471) | fuel (max 240) | 13.6 | 14 | Four times its first damage (0.5.10). A riot-squad flamethrower. A short roaring jet (range 215) that goes through three things and sets them `burning` (3 s). The answer to rats. (The plan: a Hauler drops it.) |
| **Railgun** (not built) | Floor 4, the Armory | slugs (new, max 12) | 120 | 0.6 | Pierces everything in a line, including thin walls (glass). Big kick. |
| **EMP Grenade** (not built) | Floor 4, the Armory | rockets ("Charges") | 10 + `shocked` (robots stop 4 s) in radius 90 | 1 | Bursts at the cursor (`range: 'cursor'`, like the Ember Mortar). Harmless to monsters. |
| **Prometheus Lance** (built) | Sub-level B, the Tartarus Armory | unlimited | 450 | 1.5 | Six times its first damage, and it never runs dry (0.5.10): after the armory the game is a mop-up. A plasma lance built to cut a Titan apart faster than it grows back (it doesn't, quite). Goes through eight things in a line and sets them `burning`; no mirror turns it (`reflectable: false`). |
| **Stasis Projector** (built) | Sub-level B, the Tartarus Armory | unlimited | 24 × 5 | 2.6 | Six times, unlimited, and no mirror turns it (0.5.10). A spray of stasis: what it catches can't move or fight for 2.6 s and takes 35% more damage (`stasis`). |
| **Singularity Driver** (built) | Sub-level B, the Tartarus Armory | unlimited | 60; the well 156 every quarter second at its middle; the burst 330 | 0.65 | Six times, unlimited, and no mirror turns it (0.5.10). Throws the seed of a black hole to the cursor: for three seconds it drags in everything near it (not you) and crushes what reaches the middle, then lets go all at once (an explosion that never hurts you). |

### 6.2 Armor

| Slot | Piece | Where | Effect |
|---|---|---|---|
| Head | Hard Hat with Lamp | Floor 1, Mail Room | +120 light radius |
| Head | Hazmat Hood (built) | Floor 2, the mycology anteroom | `resist: { spores: 1 }`, +3% reduction; no lamp (it replaces the hard hat) |
| Head | Neural Visor | Floor 3, the Vault | shows the Sitter and Ushers through walls; +60 light |
| Head | Riot Helmet (built) | Floor 4, the Long Room (the host's chair) | +8% reduction, +10 shield; `staggered` and `held` last half as long |
| Body | Security Vest | Floor 1, the locker | +10% reduction |
| Body | Lead Apron | Floor 2, Dispatch's lift (descent) | +15% reduction, −8 speed, `shocked` immunity |
| Body | Exo-Frame (built) | Floor 4, the Party Room (off Leon) | +16% reduction, +30 max health, −12 speed; can't be held, `staggered` halved |
| Body | Hazmat Suit (not built) | — | gas and fire immunity, −10 speed |
| Body | Titan containment suit (built) | Sub-level B, the Tartarus Armory | +28% reduction, +50 shield (14 a second), −8 speed; the Titans' statuses (engulfed, crystallizing, judged, grasped), burning and staggered last about half as long |
| Body | The Director's Coat | Floor 5, Voss's closet | +30% reduction, +20% damage, −20 max health ("It fits. It shouldn't.") |
| Feet | Clean-room Boots | not placed yet | +20 speed, faster dash |
| Feet | Handler's Boots (built) | Floor 4, the Handlers' Room | +10 speed, dash 0.15 s sooner |
| Feet | Mag-Boots | Floor 4, Robot Bay | immune to conveyors and knockback |
| Trinket | ARIADNE's Thread | Floor 5, after the terminal | the way to your objective is drawn on the minimap (pack code) |
| Trinket | The Hecatomb Signet | Floor 5, the Chapel | +25% damage; robots in defence mode don't target you for 2 s after they see you ("They were built to recognise the faithful"); −15 max health |
| Trinket | Ruiz's Badge | Floor 1 | +25 shield (it's lucky). Sentimental. |
| Trinket | The Nightlight (built) | Floor 4, the Nursery | +170 light radius, +10 shield; `held` halved |
| Gadget (no slot) | The AEGIS field (built) | Floor 4, the freight car (ARIADNE sends it up) | Worn over everything else: +120 shield that recharges at 45 a second, 1.2 s after a hit; +20% reduction; can't be held, `staggered` −60%, `burning` halved. When a hit would kill you it overloads (`lastStand`): you're left on 40% health, untouchable for 2.5 s, everything within 150 is thrown back, hurt and staggered; then 60 s to mend (the HUD chip counts down). Numbers in `aegis.js`'s `TUNE`. |

### 6.3 Items

| Item | Effect | Notes |
|---|---|---|
| Med-gel | +30 health | Existing `health-vial`, re-skinned as a gel pack. |
| Trauma Kit | +70 health | Existing `medkit`, re-skinned. |
| Adrenaline Shot | +30 speed, faster dash, 30 s | A buff (existing `P.addBuff`). |
| Battery | cells | Existing `ammo-cells` pickup, re-skinned. |
| Cryo canister, fuel can (built) | `cryo`, `fuel` | Ammo pickups (E14): `ammo-cryo` (Floor 2), `ammo-fuel` (Floor 4). |
| Clearance card 2, 3, 4 | flag `clearance2..4` | Opens clearance doors (E4) on every floor. |
| Master card | flag `master` | Opens every clearance door, the east stairwells, the Isolation back room, the Vault shelf. |
| Sample canisters A–D | flags | Floor 2's sequencer. |
| The fuse | flag | Floor 3's Nursery. |
| Core modules 1–3 | flags | Chapter 8. |
| Recharge station | Existing | Refills cells and shields; put one on Floors 3 and 4. |
| Purge injector (built) | Flushes `implanted` and `infected` | Floor 3. It only goes in when you need it: walk over it clean and it stays. |
| Purge station (built) | Three flushes | A violet wall unit at Floor 3's labs and corridors. |
| Supply cabinet (built, 0.6.2) | Fills every weapon you carry | A steel wall cabinet, SECURITY · RESUPPLY (`ds-supply-cabinet`): one full load each of rounds, shells, cryo, cells and fuel; you take what you need and the rest stays. Floor 5's Elevator Hall, and (0.7.0) Floor 4's armory. Props: `dir`, `w`, `ammo` (the kinds), `refill` (full every time). |

### 6.4 Readables and collectibles

- **Badges and logs** of the dead (existing `readable` data on any item: title, text, flag). One per room that has a body. Each says who they were in a line, then what they saw.
- **Design sheets** (Floor 3): one per monster, with its source dreamer and the dream in the dreamer's words.
- **Trial programmes** (Floor 4) and **gallery programmes** (Floor 5): printed, cream card, the Hecatomb's sign on the back.
- **ARIADNE's fragments**, twelve, two per map: a little rack-mounted memory card with a blue light. Each is a short entry from ARIADNE's audit log, in order, telling its side ("Audit 2,014: intake manifests do not reconcile. Escalating."… "Audit 2,031: escalation refused by the Director."… "02:13: external line open. Transmitting."). Six or more count as one kind of evidence for the ending (section 1.7).

---

## 7. Dressings, environments and the art

### 7.1 Environments (new, pack `ds-lab`)

Palettes in `engine/SPEC.md` 6.1 terms. Painters: reuse what exists (`carpet-tile`, `terrazzo`, `bath-tile`, `plates`, `grate`, `marble`, `drywall`, `bulkhead`) and add three (`clean-panel`, `wet-grate`, `concrete`).

| Environment | Ambient | Floors (variants) | Walls | Light |
|---|---|---|---|---|
| `ds-lobby` | `#2a2c33` | carpet-tile (open plan), terrazzo (lobby), bath-tile (restrooms) | drywall | red strobes, blue screens, one ceiling panel in five |
| `ds-cleanroom` (built) | `#3d454d` | clean-panel (corridors, labs, oncology), terrazzo (Discovery Center), bath-tile (gowning), carpet (admin), concrete (shelter, stairs), grate (air garden) | drywall, white | cold blue-white panels, one in two; green guide lights; grow lights in the air garden; the shelter dark but for dropped torches |
| `ds-wetlab` (built) | `#28322e` | wet-tile (corridors), grate over drainage (vat hall), resin (labs, cells, the dark lab), carpet (Brandt), terrazzo (briefing suite), sawdust (pens), concrete (stairs); biocontainment foam (a wall) | drywall, dark green | vats glow from inside; ceiling panels with gaps; Lab 3-D unlit but for its Lanterns |
| `ds-proving` (built) | `#2c2622` | concrete (corridors, stairs), plates (the Run), the board's carpet (the Box, Moss's office), starry carpet (the Nursery), parquet (the Long Room), party tiles, kennel floor, dark panel (the studios), sawdust (the arena); papered walls for the suites | bulkhead | sodium orange, one in two; candles in the Long Room, pink in the Party Room, violet in the studios; the arena lit bright |
| `ds-penthouse` | `#251c18` | marble, rug-red carpet, dark wood planks | dark wood panel (new `wood-panel` wall) | picture lamps, chandeliers, candles; warm and low |
| `ds-tartarus` (built) | `#1a1714` | basalt hexes (the halls), bronze deck (admin, armory), clean panel (Containment Control), the vaults' floors, sand (the Leviathan's pit), the basin's water, rime (the Garden), circuit (the core), carpet (Records), straw (the Hundred-Handed) | basalt and bronze; vault walls | warm amber in the halls, white in Containment Control, each vault lit for viewing, blue in the core and Tiamat's basin |

### 7.2 Dressings to build

By floor; everything listed in the chapters as "new". Most are simple `draw` functions (or the editor's object look builder, or imported pictures in the editor's Pictures page). Furniture that the player bumps into should be `solid: 'rect'` with a `box`; anything usable gets an `interact` or `readable`. File them all under the editor's Dressings tab (`dressing: 'Furniture' | 'Walls' | 'Lights' | 'Decor'`).

| Set | Pieces |
|---|---|
| Lockdown | lockdown shutter (terrain, wall-like, with hazard edge), emergency strobe (wall light, red, flicker), wall screen (text scrolls; can glitch), breaker panel, keypad, network rack, drone dock, body under a sheet |
| Clean room (built: `packs/ds-lab/labs.js`, `cleanroom.js`, `ds-story/shelter.js`) | lab bench, fume hood, sample fridge, biohazard bin, eyewash, gurney, charging dock; the Discovery Center's hanging synthid model, kiosks, mural, cutouts, display cases, theatre seats, children's drawings; membrane tank, valve, pump, brine (terrain); fungus chamber (spores), plastic bale; frond bed, CO₂ column; microscope feed, infusion chair, dispenser, cold store, frost; bunk, supply crate, torn vent, strands, dropped torch, blanket; guide lights, shelter sign, PA speaker, shelter door panel, quarantine release, blast door and biosafety door (terrain). Still to build: centrifuge, sequencer bay, strip curtain, UV gate, specimen cell, forklift. |
| Wet lab (built: `packs/ds-lab/wetlab.js`, `gestation.js`) | growth vat (occupied, turning, drained, broken; five shapes), cell placard, specimen file terminal, briefing screen (slides), poster, HELIOS model, egg clutch (hatches), Tenant tank, steel table, painted staff route, scratches, feeding hatch; foam, containment door, Level 3 door, broken glass and vat fluid (terrain); ARIADNE's relay (`ds-robots`), purge station (`ds-arsenal`). Still to build: crib, mobile, sleep pod, recording console, design-sheet wall, specimen jar shelf, operating table, surgical light, barricade |
| Proving (built: `packs/ds-lab/proving.js`, `trials.js`) | cage bars and barred gates, blade floors, shock plates, trial gates, suite doors, the armory door, papered walls (terrain); odds board, trial horn, trial console, betting board, champagne, kennel, feed bin, leash rack, jumpsuits; sleep pod, dream playback, design sheet, hologram; child's bed, nightlight, toy box, rocking horse, mobile, music box; dining table, restraint chair, the covered main course, gong, place card, candelabrum; balloons, birthday cake, bunting, stage and curtain, party hat, jack-in-the-box, present. Still to build: conveyor (terrain), crusher, welding arm, charging dock, half-built robot, target stand, lane divider, concrete barrier, cable run |
| Penthouse | chandelier, picture lamp, gilded frame (painting, readable), velvet rope, marble bust, grand piano, club chair, wine rack, dumbwaiter, dining table and settings, name card, aquarium, orchids, Hecatomb altar, labrys, pew, candelabra, blast door (terrain), server rack (cold / lit), core socket |
| Tartarus (built: `packs/ds-tartarus/`) | vault glass (five tints, and cracked), vault seals, bronze bars, drains, bronze doors, the core's door (terrain); round vault doors (they roll aside), vault plaques, beacons, chains, feathers, bones, the Heirs' nest and their writing on the wall, the release console, weapon cases, ARIADNE's core with its nine plates, the core console |

### 7.3 The Collection (Floor 5)

Eight paintings, each a `readable` gilded frame with a title, an artist (a board member, or "after" one), and a plaque line. These are drafts for the writer to replace.

1. **The Quiet Arithmetic** (M. Thale). A vast canvas of tally marks in groups of five, thousands of them. Up close, every mark is scratched, not painted. *Plaque: "Count them all."*
2. **Lullaby** (I. Brandt). A nursery mural: a moon, a cow, a dish and a spoon, a cradle. Every animal has too many mouths, and all of them are open. *Plaque: "Every cry is a ___."*
3. **Saint Sebastian, Revised** (after A. Voss). A martyrdom in the old style, but the saint is smiling and the archers are weeping.
4. **The Board as Shepherds** (unsigned). The five of them in pastoral dress on a green hill, crooks in hand. The flock has human feet.
5. **Hecatomb, Study No. 9** (A. Voss). A hundred specimen tanks lined up at an altar, each numbered. Number 41 is empty. *Plaque: "We do not end the world. We finish it."*
6. **The Open Door** (G. Moss). A corridor painting; at its end, a door, ajar. Each time you look at it, the door is open a little wider (the item's text changes with a counter, and the third look sets off a trap).
7. **Night Shift** (S. Pell). Asterion's night staff asleep at their desks, mouths open, something faint and pale leaving each of them through the mouth and going up.
8. **Self-Portrait from Inside** (A. Voss). The view from inside a skull looking out through the eye sockets at a mirror, in which Voss is smiling. *Plaque: "Suffering is the only honest measure."*

---

## 8. Code updates

What the engine and packs need that doesn't exist yet. Engine changes (E) go in `engine/` and are documented in `engine/SPEC.md` when they're made, so any game can use them. Pack changes (P) go in Dead Signal's own packs (section 9). Sizes: S (an afternoon), M (a session), L (several sessions). Each one should come with headless tests in the same pass, as the last few did.

### 8.1 Already done (0.5.1)

- **Stairs both ways and floors that remember** (`engine/memory.js`, `Game.floorAbove`, `stairsUp`). The descent works today.
- **Elevators at the same place on every floor** (`engine/elevators.js`, the editor's Elevators tab). The building core works today.

### 8.2 Engine

| # | Change | Size | Used for |
|---|---|---|---|
| E1 | Stairs with their own destinations and locks (done, 0.5.2) | S–M | Floor 1's east stairwell to B1; locked stairwells |
| E2 | `arrive` trap trigger; spawned waves a `clear` trap can watch (waves done, 0.5.5; `arrive` done, 0.5.9, with `when` and `unless`) | S | The return to Five; Sub-level B's briefing; Floor 4's arena |
| E3 | Elevator power and per-stop access (done, 0.5.2) | S | Every car dead until `elevatorsOnline`; the private car |
| E4 | Doors that open for a flag (clearance) (done, 0.5.2) | S | Clearance cards and the master card |
| E5 | Factions (done, 0.5.4) | M–L | Robots against everything; robots on your side at the end |
| E6 | Status effects and resistances (done, 0.5.3; area hazards and shattering still to come) | M | Frozen, burning, shocked, poisoned, slowed; Hazmat immunity |
| E7 | Area hazards: gas, fire, live water | M | Decon gas, Glass Lungs, Pyre, flooded live floors |
| E8 | Named boss bar and phases (done, 0.5.3) | S–M | The Assembler, the Silence, the Board |
| E9 | Behaviours `patrol`, `unseen`, `blink` (`patrol` done, in `ds-robots`; Floor 3's own: `ds-midwife`, `ds-tenant`, `ds-shamble`, `ds-lumber`, `ds-contained`, `ds-escort`; Floor 4's: `ds-pack`, `ds-flee`, `ds-roll`, `ds-jester` with its `ds-blink` attack, `ds-underbed`, `ds-diner`) | S each | Sentinels, the Sitter, Concierges and Ushers |
| E10 | Directional armor (the Mother of Teeth sets `e.armor` by where you are, M5; `reflect`, done 0.5.8, for shields that send shots back) | S | Pacifiers, Mother of Teeth, Warden of Teeth, Praetorians |
| E11 | Transmissions (intercom subtitles) (done, 0.5.2) | S | Voss, ARIADNE, the Concierge |
| E12 | HUD objective (done, 0.5.7) and counters (a status `countdown`, 0.5.4) | S | "Reach the top floor", INCUBATION, BROADCAST |
| E13 | Conveyors and crushers | S–M | Floor 4 |
| E14 | More ammunition types (done, 0.5.3) | S | `cryo`, `fuel`, `slugs` |
| E15 | Key items in the inventory (done, 0.5.3) | S | Samples, the fuse, cores, cards shown as things you carry |
| E16 | Curved rooms, seeing the floor below (done, 0.5.8) | M–L | Floor 5's ovals; the Gallery and the Atrium |
| E17 | Pull, snare, burns; `gaze`, `blink`; `bound` and `tint` statuses (done, 0.5.8) | M | Charybdis, the Swaddler's webs, the Gorgon, Concierges and Ushers |
| E18 | Endings and mid-floor checkpoints; `quick` stairs (done, 0.5.8) | S | The Control Room's choice; Floor 5 and 5a as one floor |
| E19 | `immune` enemies, `reflectable: false` shots, item lifetimes, `drawRadius`, `pull` with `player: false`, trigger conditions (`when`, `unless`), the `open` effect's `hold` (done, 0.5.9) | S | The Titans, the Lance, the Singularity Driver, the return to Five |

**E1. Stairs with destinations and locks.** Today a floor's `>` tiles all lead to its `next`. Add a level field keyed by tile tag:

```js
stairs: {
  eastDown:  { to: 'ds-b1', dir: 'down', until: 'basementOpen', locked: 'LOCKDOWN LEVEL 5. Authorised personnel only.' },
  westUp:    { dir: 'up' },                       // no `to`: the floor's next, as now
  eastUp:    { to: 'ds-f3', dir: 'up', until: 'truthKnown' },
},
```

`Game.completeLevel` looks up the tag of the tile you're standing on; `to` overrides `next`, `until` keeps it shut (stepping on it shows `locked` once, as the stairs up do), and `dir` picks the words and sound (`ascend` / `descend` words in the manifest; `descend` exists, `ascend` would be new). The same for `<` tiles: `to` pins where they go back to. The floor memory already remembers which stairs you left by (`leftAt`), so arriving back lands on the right stairwell. Where: `engine/game.js` (`completeLevel`, `takeStairsUp`, `upArrival`), `engine/SPEC.md` 6.8; the editor: a Stairs list in Floor settings (tag, to, until).

**E2. `arrive` trigger.** `{ trigger: { type: 'arrive', flag: 'truthKnown', notFlag: 'x' }, effects: [...] }` fires once at the end of `loadLevel` (after the pack `levelLoaded` handlers, so what it spawns *is* remembered with the floor), if its flags match. Being a trap, its fired state is remembered too: it never fires twice. Without `flag` it fires on every arrival (with `once: false`). Where: `engine/traps.js`, `engine/game.js` (it already has `triggerEvent(type, tag)`, which `flag` and `pickup` traps use), the editor's trigger list (`SC.TRIGGERS`).

*Waves are done in 0.5.5* (Floor 4's arena uses them), along with two small things Floor 4 needed: the `faction` effect's `aggro` (let out to hunt: they know where you are) and a search limit for `LM.ai.goTo` (the contestants' run across the maze). In the same change, two fixes for waves. The `spawn` effect gets an `as` field that tags what it spawns (`{ type: 'spawn', tag: 'pit', enemy: 'ladder-saint', as: 'wave1' }`, in `linear-maze/core`'s `effects.js`), so a `clear` trap can watch spawned monsters. And `clear` traps collect their group on their first update and keep it, so a group spawned later is never seen; they should look again while the group is empty.

**E3. Elevator power and access.** Elevator fields: `power: 'elevatorsOnline'` (no car runs, doors stay shut, lamps dark, the panel says the game's `elevatorNoPower` words until the flag is set); `stops: { 'ds-f5': { until: 'master' } }` (a stop listed but not selectable until a flag). `LM.elevators.check` and `stops` read them; `Car.wantOpen` checks power. The editor's elevator inspector gets a Power flag field. Where: `engine/elevators.js`, `editor/js/lifts.js`.

**E4. Clearance doors.** A door terrain's `door: { flag: 'clearance3', need: 'Level 3 clearance' }` opens only when the flag is set (checked like a key, but against story flags, which carry between floors). The master card is a second flag any clearance door accepts (`door.flag` may be a list: `['clearance3', 'master']`). Where: `engine/entities.js` (`Door.update`), the door's lock colour comes from a `color` field. Pack: terrain `ds-door-c2`, `ds-door-c3`, `ds-door-c4`, `ds-door-c5`, each a clean-room door with a coloured stripe.

**E5. Factions.** *Done in 0.5.4 (`engine/SPEC.md` 6.20).* As built: the table is the game's (a pack's `factions`) with a level's rows laid over it; Dead Signal's has `player`, `monster`, `robot`, `ally`, plus `specimen` and `dormant` (sides nobody fights); the foe is `e.foe` (`LM.ai.foe`), and an enemy chasing another enemy uses a short search, not line of sight alone. The plan as written:
- Enemies get `faction` (default `'monster'`; robots `'robot'`; the player is `'player'`; allies `'ally'`) and a table of who is hostile to whom: `LM.factions = { robot: ['player', 'monster', 'ally'], monster: ['player', 'robot', 'ally'], ally: ['monster', 'robot'] }` (robots in defence mode hate everything; under ARIADNE they become `ally`).
- Each enemy picks a **target**: the nearest hostile it can see (the player or another enemy), re-checked a few times a second. Behaviours use `e.target` instead of `game.player` (most core behaviours read `game.player` directly; give them a helper, `LM.ai.target(e, game)`, and change them to use it). With no other target, it's the player, so single-faction games behave exactly as now.
- Attacks and projectiles carry the attacker's faction; `LM.combat.hurt` and projectile hits damage enemies of hostile factions (today enemy projectiles only hit the player). Explosions likewise.
- Navigation: chasing an enemy target uses line of sight only (the flow field stays rooted at the player).
- `game.setFaction(selector, faction)`: switch every robot (or every enemy with a tag) at once: ARIADNE turning the building.
- Monsters fighting robots off-screen should be cheap: cap target searches, and let enemies outside the player's view fight at a lower update rate.
- Where: `engine/entities.js`, `engine/combat.js`, `core` behaviours and attacks (The Linear Maze's pack; or Dead Signal's copies of them), `engine/SPEC.md` 6.5. Test that every Linear Maze floor behaves the same with everything in the default faction.

**E6. Status effects.** A registry kind, `statuses`: `{ frozen: { mods: { speedMul: 0.4 }, seconds: 2, tint }, burning: { dps: 6, seconds: 3 }, shocked: { stun: true, seconds: 4, only: 'robot' }, poisoned: { dps: 3 }, slowed: { speedMul: 0.6 } }`. Weapons, projectiles, attacks, hazards and trap effects take `status: 'burning'` (or `{ id, seconds }`). Enemies and the player both carry statuses; the HUD shows the player's as chips; armor can grant resistance (`resist: { gas: 1, burning: 1 }`). This was already item 4 on The Linear Maze's backlog.

**E7. Area hazards.** `game.addHazard({ x, y, radius | tiles, kind: 'gas' | 'fire' | 'shock', dps, status, seconds, grow, color })`: timed areas that hurt and draw themselves (gas as drifting translucent particles, fire as flames, shock as arcs over water). A trap effect `hazard` (with `tag` for tiles or `radius` around a point). Live water: water tiles with a `live` flag the effect sets and clears on a pulse. The hazards are remembered with the floor only if they're permanent (`seconds: 0`).

**E8. Boss bar and phases.** A boss with `bossBar: { name, phases: [{ at: 0.5, do(e, game) }] }` shows a named bar across the top of the screen while it's awake, and runs each phase's `do` once as its health crosses `at`. A fight of several bosses shows them all (the Board). Where: `engine/ui.js`, `engine/entities.js`.

**E9. Behaviours.**
- `patrol`: walks between tiles tagged with the enemy's `props.route` (`patrolA1`, `patrolA2`…, in order, looping), pausing at each; on noticing anything hostile, switches to `props.then` (default `skirmisher`).
- `unseen`: moves only while it's outside the player's aim cone (the same cone the light uses) or in a tile darker than a threshold, and freezes otherwise; when it reaches you, one strike.
- `blink`: every few seconds, disappears and reappears on an open tile beside or behind its target, with a telegraph (a shimmer at the destination 0.4 s before).
These can live in Dead Signal's `robots` and `nightmares` packs rather than the engine (behaviours are registry content), unless another game wants them.

**E10. Directional armor.** `frontArmor: { arc: 1.4, reduction: 0.8 }` (or `rearArmor`) on an enemy: hits from inside the arc (relative to its facing) are reduced; an armored hit sparks instead of bleeding. Where: `engine/combat.js` (`hurt`), using the hit's direction.

**E11. Transmissions.** `LM.ui.transmission({ who, text, portrait, color, seconds, type: true })`: a panel at the bottom of the screen with a small portrait (or a speaker icon), the speaker's name and the line typed out, queueing if several arrive. The game keeps running. A trap effect `transmission` (`who`, `text`, `delay`) so floors can script them without code, and a speaker registry so `who: 'voss'` fills in the name, portrait and colour. A glitch mode (`glitch: true`) for ARIADNE's early messages. Where: `engine/ui.js`, `engine/index.html` (styles), a trap effect in Dead Signal's `story` pack.

**E12. HUD objective and counters.** `game.setObjective(text)` (shown under the floor name) and `game.setCounter(id, { label, value, max, color })` (a small bar or percentage, e.g. INCUBATION 41%), both saved with the run. The Linear Maze's memos pack has a pack-level version (`MEMOS.hudLines`); this makes it the engine's.

**E13. Conveyors and crushers.** Terrain `push: [vx, vy]` (units per second, turned with the tile's `rot`) applied to the player, enemies and loose items standing on it (Mag-Boots ignore it). A `ds-crusher` item: solid when down, a telegraph light, damage and a stun to anything under it when it comes down, on a timer (or switched by a flag).

**E14. More ammunition types.** `LM.defineAmmo('cryo', { name: 'Cryo', max: 200, color })` adds to `LM.AMMO_MAX` / `LM.AMMO_NAMES` (today a fixed four in `engine/player.js`), gives new players a zero, makes an `ammo-cryo` pickup, and shows in the inventory. Saves already store ammunition by name. A game can also rename the four built-in types (Dead Signal wants "Rounds", not "Rivets").

**E15. Key items.** `P.keyItems` (saved with the player, unlike keys): `game.giveKeyItem('fuse', { name, icon })`, `game.hasKeyItem`, `game.takeKeyItem`; shown in the inventory under Keys. Story flags work for all the puzzles here, but players like to see what they're carrying.

### 8.3 Packs (Dead Signal's own)

| # | Pack | What's in it | Size |
|---|---|---|---|
| P1 | `ds-lab` | The six environments, three new painters, terrain (stairs up/down, shutters, clearance doors, catwalk, conveyor, grate, sand, amniotic pool, blast door), and every dressing in 7.2 | L (spread over the milestones) |
| P2 | `ds-puzzles` | The puzzle pieces: `ds-breaker`, `ds-keypad` (a digit pad pop-up: `{ code, flag, hint }`), `ds-junction` (switch box; shootable), `ds-sequencer`, `ds-dream-pod` (plays a recording), `ds-vat` (breakable, with contents), `ds-turbine`, `ds-governor`, `ds-valve`, `ds-cryo-console`, `ds-server-rack`, `ds-core-socket`, `ds-brood-egg` (proximity / timed hatch), the Sermon | M |
| P3 | `ds-robots` | Robots in 5.1, the `patrol` and `blink` behaviours, robot looks (red/green visors read `e.faction`), drone docks | M |
| P4 | `ds-nightmares` | Monsters in 5.2–5.4, the `unseen` behaviour, `revive` (Hollow Coat), ammo-stealing hits, the Board's phases | L |
| P5 | `ds-arsenal` | Weapons and projectiles in 6.1, armor in 6.2, item re-skins in 6.3, ammo types | M |
| P6 | `ds-story` | Speakers (Voss, ARIADNE, the Concierge), every transmission and readable, the ARIADNE terminal's dialog, the creed altar, ARIADNE's help (minimap guide, opening doors ahead), the ending and credits, the HUD objective per chapter | M |
| — | floors | The six maps, built in the editor (they're saved in `editor/edits.js`) or as level files in `ds-story/levels/` | L |

Monsters and items can start life in the editor (Monsters → New, Items → New, the look builder, Ask Claude) and move into a pack when they need code. Floors are best painted in the editor.

---

## 9. Packs and the manifest

Dead Signal loads every Linear Maze pack today (`'linear-maze/*'` without floors), which brings in The Linear Maze's story code: the phone, the memos scores on the HUD, the rotary phones, the town. Most of it fights this game. Suggested `packs` for `games/dead-signal/game.js` (the editor's Game page):

```js
packs: [
  'linear-maze/core',                                                     // the basics every game needs
  { pack: 'linear-maze/office', levels: false, exclude: ['phone.js', 'npcs.js'] },  // furniture, glass, partitions, office tile sets
  'linear-maze/dressings',                                                // the free-standing pillar
  'ds-lab', 'ds-puzzles', 'ds-robots', 'ds-nightmares', 'ds-arsenal', 'ds-story',
],
```

Why `phone.js` goes: besides the phone, it hands any player who reaches an armed floor with no weapon a pistol, which would undo the Bolt Driver start. I booted Dead Signal with this list: it loads cleanly, and the existing floors use three things from packs it drops: the town's `fire-jet`, the library's `lib-desk` and the apartment's `apt-bookshelf` (the editor's Game page lists them with the pack that has each, and the map editor's Check flags them as unknown ids). Copy `fire-jet` into `ds-lab` (it becomes the steam vent and the welding torch) and swap the other two for office furniture. The other Town pieces this plan uses (`hospital-bed`, `curtain`, `wheelchair`, `toolbox`, `tire-stack`, `cell-bars`) need copying too: the Town pack needs The Linear Maze's story packs, so loading it isn't worth it. The same goes for `LM.think` (the rotary pack's thought toast) and the memos pack's camera.

The engine gives a new player the pistol unless the run's first floor has a `loadout`: Floor 1 sets `loadout: { weapons: ['ds-bolt-driver'] }`.

Words (Game page → Words): `descend: 'Climb to {floor}: {name}'`, `deathText: 'Trying again puts you back where you came in.'`, the elevator words (`elevatorTitle: 'Select floor'`, `elevatorPrompt: 'Call the car'`, `elevatorHere: 'this floor'`), and, with E3, `elevatorNoPower: 'No power. LOCKDOWN.'`.

Title screen: keep the title. Tagline suggestion: "The building is locked. The lines are dead. Something on the top floor is still talking."

---

## 10. Story flags and triggers

| Flag | Set by | Read by |
|---|---|---|
| `p0Arrived`, `p0Briefed` | arriving in the prologue; ARIADNE's welcome | the atrium's line; the first objectives |
| `p0Uniform`, `p0Driver`, `p0Brennan`, `p0Board` | your locker; your tool bag; Brennan's first line; three bolts in the test board | objectives; `p0Board` starts Voss's PA and the work orders (`p0Orders`) |
| `p0JobCoffee`, `p0JobCamera`, `p0JobLight`, `p0JobDock`, `p0OrdersDone` | the four work orders (`ds-job`); all four | the PA call (`p0Called`: the called go upstairs), then the switch (`p0SwitchDown`) |
| `p0Spare`, `p0InCloset`, `p0SwitchIn`, `p0AriadneDone` | the stores shelf; stepping into 1-C with it; fitting it; ARIADNE's last line | the closet door; the lockdown |
| `p0Chatted` | talking to four people | the optional objective |
| `playedPrologue`, `skippedPrologue` | the end of the lockdown; the pause screen's skip | — (for later floors, if they want to know) |
| `breakerOn` | the breaker in Comms Closet 1-C | unseals the closet |
| `lockerOpen` | the Security Office keypad | the sidearm and vest |
| `stairsWest` | reaching the Security Office (after Voss's line) | unseals the west stairwell |
| `sawShelterPanel` | Shelter B's door panel, read before the override | — |
| `labsOpen` | Mori's terminal (Floor 2 administration) | the lab wing's biosafety door; the admin shutter |
| `brineDrained` | both valves in the membrane lab | the brine turns to dry floor |
| `sawShelter`, `docentDone` | Shelter B's concourse; DOCENT-3's tour over (destroyed) | objectives |
| `shelterOverride` | Mori's card (a key item) | Shelter B's panel |
| `oncologyExit` | the oncology door console | Oncology's west door |
| `shelterOpen` | the shelter panel, with the override | the blast door; the PA stops; the guide lights go out |
| `releasePulled` | the quarantine release, while the Congregation lives | the alarm that wakes it |
| `congregationAwake`, `congregationDead` | the Congregation | the shelter's lamps; the release |
| `quarantineLifted` | the release, once the Congregation is dead | Floor 2's quarantine shutter and Stair A up |
| `clearance2`…`clearance4`, `master` | the cards | clearance doors (E4) |
| `toBrandt` | Voss, at Stair B's door on Floor 3 | — |
| `knowsOkafor` | Brandt's terminal | Voss's lines in 3-B |
| `clearance3` | Okafor's card (a key item) | Stair B's door |
| `sawRelay` | reaching ARIADNE's relay on Floor 3 | the optional objective (its breaker) |
| `relayPowered` | breaker 3P in Floor 3's pump room | the Orderlies wake; the east turret turns |
| `sawSpecimen`, `sawMidwife`, `sawTenant`, `sawLantern`, `sawSitter`, `sawColony` | seeing them | Voss on the stairs |
| `sawProject`, `sawBriefing`, `fileMidwife`, `fileTenant`, `fileLantern`, `fileColony`, `fileS41`, `fileVats` | the files, the briefing, the vats | Voss on the stairs; ARIADNE |
| `vossDone` | the last line of Voss's speech | Floor 3's Stair B up |
| `fuse`, `nurseryLit` | (not built) | — |
| `vaultOpen`, `dreamsKnown` | (not built) | — |
| `f4Briefed`, `aegisSent` | Voss's last welcome line on Floor 4; that or stepping into the lobby | the freight car comes up (its `parked`), ARIADNE, Voss |
| `aegisWorn`, `aegisSaved` | putting the AEGIS on; its first overload | ARIADNE |
| `boxReached`, `inArena` | reaching the Box; going into the arena | objectives |
| `knowsArmoryCode` | Kwan, in the Box (she speaks when you reach her), or her body | objectives; the armory keypad reminds you |
| `readSchedule` | Floor 4's programme in Trial Control | ARIADNE: he chose you |
| `trialStarted` | stepping into the Pens | the odds boards; the contestants and the dogs let out |
| `captiveSaved`, `saved<Name>`, `captiveDied<Name>` | the contestants (Kwan, Arden, Soto, Ostrowski, Pryce) | Voss on the stairs; the results |
| `finalRound` | the Box's console | the shutter to the arena |
| `trialEnded` | the arena's third wave dead | every trial gate; the blades and plates stop; the corridor's shutter; Stair A |
| `readResults`, `sawBets` | the console after the trial; the betting board | — |
| `armoryOpen` | the armory keypad (4471) | the armory door |
| `mossLog` | Moss's incident log | ARIADNE; Voss on the stairs |
| `nurseryOpen`, `partyOpen`, `longOpen` | ARIADNE, outside each suite | the suites' doors |
| `nurseryAwake`, `partyStarted`, `mainCourse`, `dinnerServed` | going near the bed, the stage; lifting the cover; the gong | the thing under the bed, the Jester, the Diners |
| `underbedDead`, `jesterDead`, `ratKingDead`, `smilerDead` | killing them | ARIADNE's lines |
| `freeOstrowski` | cage 8's console in the Cage Lab | cage 8 |
| `sawStudio`, `dreamVoss`, `dreamThale`, `dreamBrandt`, `dreamPell`, `dreamMoss`, `fileTrials`, `fileRats` | the studios' recordings and sheets; the trial log; the count | — |
| `vossDone4` | the last line of Voss's speech on Floor 4 | Floor 4's Stair A up |
| `junction1`…`junction3`, `lineDown` | (not built) | — |
| `f5Briefed`, `conciergeGreeted`, `conciergeDown` | Voss on Floor 5's Stair A; the Concierge | Reception |
| `thaleKey`, `pellKey`, `brandtKey`, `mossKey`, `haveOfficeKey` | the four keys (Joan's egg, the dining table, the Clerks' Row, the Robot Chambers) | each office's door; objectives |
| `savedJoan`, `savedHugh`, `savedEbbs` | cutting people out of the eggs | ARIADNE |
| `theoCard` | Theo's place card, or Pell's key | the Mother of Teeth |
| `kitchenOff` | the kitchen's breaker | the hotplates |
| `officeOpen` | opening an office | objectives: the private stair |
| `gorgonWoke`, `gorgonDead`, `sawPraetorian`, `praetorianReflected` | the Gorgon; the Praetorians | Voss, ARIADNE |
| `on5a`, `f5aBriefed`, `inLibrary` | arriving on 5a; Voss's brief; the library | objectives |
| `bookcaseOpen` | the right book on the Director's shelf | the bookcase door (held open) |
| `master` | the Director's card, in his rooms | the Control Room's door (and every clearance door) |
| `sawAtrium`, `truthHeard`, `swaddlerDead` | the atrium; ARIADNE's node in the Server Room; the Swaddler | Voss, ARIADNE |
| `inControl`, `controlTalk` | stepping into the Control Room (a checkpoint); the end of the conversation | the console's choice |
| `choseObey` | the console: *Purge the core*, then *Purge it* | the ending *The Dead Signal* |
| `chosePower`, `elevatorsOnline`, `vossTurned` | the console: *Restore elevator power* | every elevator (the private car to B1); the robots and the Praetorian turn |
| `creed` | (not built) | — |
| `truthKnown`, `basementOpen` | (not built: the Control Room's choice took their place) | — |
| `onB1`, `b1Briefed`, `sawTartarus` | arriving in Sub-level B (an `arrive` trap); the end of ARIADNE's briefing; the Long Hall | objectives |
| `readTartarusIndex`, `fileTitans`, `fileLineH`, `heirsWall` | Records: the index, *Containment as a product*, *Line H*; the Heirs' writing on the wall | the ending's evidence (`fileTitans`, `heirsWall`) |
| `judged`, `behemothCharged`, `frogSmiled`, `crystalTouched`, `handsGrabbed` | the Titans, the first time | Voss, messages |
| `heirsAngry` | hurting an Heir before the offer is made | no offer: `refusedHeirs` |
| `knelt`, `endedPet` | *Kneel*, in the offer | the ending *Good Pet* |
| `refusedHeirs` | *Refuse*, or `heirsAngry` | the Heirs attack; `releaseStarted` |
| `releaseStarted`, `releaseStopped`, `behemothFree` | the release (the `vaultRelease` countdown); the releasers dead; the countdown out | the console; Vault 2's seal; the Behemoth; the ending *Tartarus* |
| `firstbornDead` | the Firstborn | Voss |
| `vaultsSealed`, `armoryOverride` | Containment Control's console | the armory's vault door |
| `armoryTaken`, `tookLance`, `armoryOpen` | a case in the armory; the Lance | the Enforcers; the core's door (`ds-door-core`) |
| `inCoreHall`, `cuttersDown`, `coreBreached` | stepping into the core (the `ninthPlate` countdown); the cutters dead; the countdown out | the core; the ending *The Dead Signal* |
| `ariadneOnline`, `ariadneBack` | the core's console: *Reconnect her* | the Wardens; the private car to Five (and Floor 1's freight stops); Five's return |
| `f5Return` | arriving on Five with ARIADNE back (an `arrive` trap) | the guards turn `board`; the Enforcers |
| `guardsDown`, `shuttersOpen` | the Praetorians dead (or already dead) | the boardroom's shutters |
| `inBoardroom` | stepping into the boardroom | Voss's case |
| `confessTitans`, `confessTrials`, `confessThreat` | asking Voss | the ending (two of three: full exposure) |
| `spareBoard` | *Let them go*, then *Let them go* | the ending |
| `killed_voss`, `killed_thale`, `killed_brandt`, `killed_moss`, `killed_pell` (and `P.data.boardDead`) | the board | the ending |
| `gameOver` | the ending | — |
| `generatorOn`, `valve1`…`valve3`, `sermonFrozen`, `sermonAwake`, `core1`…`core3`, `boardDead` | (not built: Tartarus and the return took their place) | — |
| `fragment1`…`fragment12` | ARIADNE's fragments | the ending's evidence (six or more count) |

---

## 11. Build order, with prompts

Each milestone ends with something playable and tested. Hand Claude the workspace, `engine/SPEC.md`, this file, and the prompt.

**M1. The building and Floor 1.**
> Read games/dead-signal/DESIGN.md. Do milestone M1: trim Dead Signal's packs as section 9 says; make the `ds-lab` pack with the `ds-lobby` environment, the stairs-up and stairs-down terrain and the lockdown shutter; implement E1 (stairs with destinations and locks), E3 (elevator power), E4 (clearance doors) and E11 (transmissions) in the engine with SPEC updates; add the four elevators of section 2.2 at their plan positions with `power: 'elevatorsOnline'`; turn The Complex into Floor 1 (`ds-f1`) per section 4.1 with its traps, the breaker and the locker keypad; re-file the Knife Fighter as the Scalpel Drone and add the Sentinel (with a simple patrol behaviour), Warden Drone and Sweeper. Test it headlessly, then write it to my folder.

**M2. Robots against monsters, and Floor 2.**
> (Built, October 2026: Floor 2 as section 4.2 describes it, with statuses, boss bars, cryo and key items in the engine. Factions moved to M3.)

**M3. Statuses, hazards, and Floor 3.**
> (Built, October 2026: Floor 3 as section 4.3 describes it, with factions in the engine. Area hazards (E7), fuel and the Incinerator, `unseen`, the dream pods and the vault are still to do.) The original prompt: Do milestone M3: factions (E5) with SPEC updates and a regression check on every Linear Maze floor; area hazards (E7) and the statuses monsters need (burning, frozen shattering); the Incinerator's ammunition (fuel, with `LM.defineAmmo`); the `ds-wetlab` environment; Floor 3 per section 4.3 with the Sitter (`unseen` behaviour), Mother of Teeth, the Weeping Choir, Flesh Lanterns, Kneelers; the fuse, the dream pods and the vault. Leave the dream texts as placeholders marked TODO for me to write.

**M4. Floor 4.**
> (Built, October 2026: Floor 4 as section 4.4 describes it: the trial, the Run and the board's suites, with waves in the engine. The factory, conveyors, crushers, directional armor, the Railgun and EMP grenades are still to do.) The original prompt: Do milestone M4: conveyors and crushers (E13), directional armor (E10), the boss bar (E8); the `ds-proving` environment; Floor 4 per section 4.4 with the Assembler, Pacifiers, Haulers, Tick Mines, the Grief Engine, Mr. Hush and Ladder Saints; the junction puzzle, the Kill Box, the pens; the Railgun, EMP grenades, the Exo-Frame.

**M5. Floor 5 and the truth.**
> (Built, October 2026: Floors 5 and 5a as section 4.5 describes them, in the `ds-executive` pack, with curved rooms, the floor below, endings and checkpoints in the engine; Sub-level B's landing. The Collection, the Chapel and the creed are still to place.) The original prompt: Do milestone M5: the `ds-penthouse` environment and dressings; Floor 5 per section 4.5, with the Collection (section 7.3), the creed altar, the ARIADNE terminal dialog, Voss's office and the reveal sequence; Concierges (`blink`), Patrons, Faceless Ushers; the objective HUD (E12).

**M6. Tartarus, and the end.**
> (Built, October 2026: Sub-level B as section 4.7 describes it, in the `ds-tartarus` pack, and the return to Five and the board as section 4.8 does, with every ending in section 1.7. The Hatchery plan, the Sermon and the brood are gone.) The original prompt: Do milestone M6: the `ds-hatchery` environment; Sub-level B per section 4.7, from the private car's landing that's there now: ARIADNE's core (what Voss called the mainframe), the turbines, governor, valves, cryo-lock, the Sermon, the incubation counter and the brood (section 5.3), including the Silence. The chapter-five ending on arrival goes once the floor is playable.

**M7. Going back.** (Optional, from the old descent plan.)
> Do milestone M7: the `arrive` trigger (E2); second waves and new finds on floors the player can go back to, per section 4.6; ARIADNE's help on the minimap.

**M8. The Board and the end.**
> (Done in M6: the return to Five, the board and the endings, section 4.8. Credits are left for M9.) The original prompt: Do milestone M8: the Sanctum's cores, ARIADNE taking the building (`setFaction`), the Board fight per sections 4.8 and 5.4, both endings and the credits.

**M9. Polish.** Balance from playtests, sounds for every robot and monster, the title screen, a full headless run from the closet to the credits, and packaging (`dist/`).

---

## 12. Open questions

- **Theo.** Name, look, and whether he speaks (thoughts as italic toasts, like the rotary pack's `LM.think`, copied into `ds-story`; or silent).
- **How much gore.** The plan describes horror more than it shows it (the Pit is described, not drawn). Decide how far the drawings go.
- **Who writes what.** Every line here is a placeholder. The dream recordings, the paintings, the creed, ARIADNE's log and Voss's voice are where the writing lives; the plan leaves them marked TODO.
- **The Titans.** Should one ever be fought (the Behemoth, with the armory's weapons, as an optional hard ending), or are they always only looked at? Should the Garden's spread in the hall be faster or slower?
- **ARIADNE's ending.** She survives in every ending but the two *Dead Signal* ones and offers you a job in *The Signal*. Credits are still to write.
- **Difficulty of the descent.** "Much easier" is the brief; the second waves are tuned to feel like payoff, not a repeat. Playtesting decides.
- **Robots after ARIADNE.** Allies only in the final fight, or for the rest of the game (if there's a post-game)?
