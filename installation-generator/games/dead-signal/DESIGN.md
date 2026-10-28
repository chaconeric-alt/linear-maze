# Dead Signal — design and build plan

Plan · October 2026 · for the Linear Maze engine 0.5.1 (built so far on 0.5.3)

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

---

## Contents

1. Story
2. The building
3. What the player can do (systems)
4. Chapters
   - 4.1 Floor 1 — Lockdown (lobby and administration)
   - 4.2 Floor 2 — Synthid Research (the labs, the Discovery Center, Shelter B)
   - 4.3 Floor 3 — Gestation (growth vats and the dream lab)
   - 4.4 Floor 4 — Proving Grounds (robotics and trials)
   - 4.5 Floor 5 — The Penthouse (the executive floor)
   - 4.6 The descent (floors 4 to 1, the second time)
   - 4.7 Sub-level B — The Hatchery
   - 4.8 The ascent and the Board
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

In the sub-level is Voss's last experiment: **the Sermon**, a living egg the size of a truck, incubating something big enough to end a city. Around it, in the brood nursery, are its smaller siblings: a clutch of eggs, each holding a small apocalypse.

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

1. **Up the stairs** (Floors 1 to 5). Voss guides Theo by intercom. The elevators are dead; the only way up is the stairwells, floor by floor, through robots and monsters.
2. **The truth** (Floor 5). ARIADNE explains. To bring it back, the building's power has to come back, and the backup generator, the elevator machinery and the AI's power feed are in the sub-level, which is sealed. ARIADNE has watched Voss type the sub-level override for years. It gives Theo the code.
3. **Back down the stairs** (Floors 4 to 1). Voss knows now. He opens the reserve pens: every floor Theo cleared has something new on it. But Theo has the arsenal of four lab floors and the board's own armor, and the floors he cleared stay cleared where he cleared them (the engine remembers).
4. **The Hatchery** (Sub-level B). The brood hatches. Restart the generator, restore the elevators, and decide what to do about the Sermon.
5. **The private car** (Sub-level B to Floor 5). The board's own elevator goes from their chapel straight down to the Sermon and nowhere else. With power back, Theo rides it up.
6. **ARIADNE and the Board.** Re-seat ARIADNE's cores while the board's servants attack. ARIADNE takes the building: the robots stand down, then turn. The boardroom opens. The board are not people any more.

### 1.5 Cast

| Who | Role | Notes |
|---|---|---|
| **Theo Lark** | The player. Facilities technician, night shift. | Practical, frightened, decent. Fixes things. Starts with his tool bag. |
| **Dr. Aurelian Voss** | Lab director; head of the Hecatomb. | Warm, fatherly, precise on the intercom. Never raises his voice. Becomes **the Chairman**. |
| **Margaret Thale** | Chief financial officer. | Counts everything. Her nightmares are about numbers that never stop. Becomes **the Ledger**. |
| **Dr. Ilse Brandt** | Chief science officer. | Built the specimens. Her nightmares are about birth. Becomes **the Mother**. |
| **Garrick Moss** | Head of security. | Ex-military, bought the robots. His nightmares are about being held down. Becomes **the Warden of Teeth**. |
| **Simon Pell** | General counsel. | Writes the contracts nobody reads. His nightmares are faceless. Becomes **the Clause**. |
| **ARIADNE** | The building's research integrity and safety AI. | Calm, literal, a little formal, very tired. Speaks in short lines. Was doing its job. |
| The dead | Night staff: security guards, a vet tech, two postdocs, a cleaner, the night receptionist. | Their badges, logs and lockers are how the floors tell their stories. |

### 1.6 The Hecatomb

A hecatomb was a sacrifice of a hundred oxen. The cult uses the word for any great, deliberate amount of suffering. Its creed, which the Penthouse's puzzle uses (section 4.5):

> *Suffering is the only honest measure.*
> *Every cry is a coin, and we are owed.*
> *We do not end the world. We finish it.*
> *Count them all.*

Its sign is a labrys (a double-headed axe) whose blades are two open hands. It appears small and tasteful on the executive floor (cufflinks, the doors, the carpet's border), and crude and scratched on the lower floors where someone who found out left it as a warning.

### 1.7 Endings

- **The Sermon sleeps.** Theo froze the Sermon in the sub-level (section 4.7). ARIADNE broadcasts everything it found. Dawn; sirens; the lockdown lifts. A last message from ARIADNE: the Hecatomb has other buildings.
- **The Sermon wakes.** Theo didn't freeze it in time. Everything above happens, and then, as the screen fades: the sub-level, dark, a heartbeat, and the incubation counter reaching 100%.

Neither ending is a game over. The second one is the sequel hook.

---

## 2. The building

### 2.1 Floors

| Map | Name | Chapter | Environment (new, section 7.1) | Floor label |
|---|---|---|---|---|
| `ds-f1` | Lockdown | 1, 6 | `ds-lobby` | Floor 1 |
| `ds-f2` | Synthid Research | 2, 6 | `ds-cleanroom` | Floor 2 |
| `ds-f3` | Gestation | 3, 6 | `ds-wetlab` | Floor 3 |
| `ds-f4` | Proving Grounds | 4, 6 | `ds-proving` | Floor 4 |
| `ds-f5` | The Penthouse | 5, 8 | `ds-penthouse` | Floor 5 |
| `ds-b1` | The Hatchery | 7 | `ds-hatchery` | Sub-level B (`floorLabel`) |

Floor order (the editor's Floors page): F1, F2, F3, F4, F5, B1. B1 is last in the order but nothing's stairs down lead to it except Floor 1's east stairwell (section 8, E1), and finishing it isn't the end of the game; the Board is.

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
| The private car A1 | elevator at x 31, y 1, doors south | Sub-level B and Floor 5 only: the board's own lift from their chapel to the Sermon. On Floors 1–4 draw solid wall where its shaft passes. |
| Freight car F | elevator at x 42, y 1, `w: 3, d: 3, door: 2`, doors south | Sub-level B to Floor 4: the labs' service lift. |
| Elevator lobby | x 30–49, y 5–9 | Open floor in front of every car on every floor. (A 2 × 2 car's shaft is 4 × 4 tiles with its walls, so the passenger doors open onto row 5 and the freight doors onto row 6.) |
| East stairwell | x 52–57, y 1–8 | Floor 1: the only stairs down to Sub-level B, behind a lockdown shutter. Floors 2–5: a second way between floors, locked until the descent (it becomes the fast route down in chapter 6). |

Place the four elevators once, in the editor (any floor's map → Elevators tab: Place an elevator, then **+ Car after it**), then draw each floor around them. Section 8, E3 adds the power switch they all need: every car is dead until chapter 7.

### 2.3 The route

```
            ┌──────────── stairs up ───────────────┐
 start ──> F1 ──> F2 ──> F3 ──> F4 ──> F5 (the truth, the basement code)
            ^                            │
            │      stairs back down      │ (west stairs: back the way you came)
           F1 <── F2 <── F3 <── F4 <─────┘
            │
            │ east stairwell (unlocked by the code)
            v
           B1 (power, elevators, the Sermon)
            │
            │ the private car A1 (B1 ↔ F5 only)
            v
           F5: the Server Sanctum, the boardroom, the end
```

The engine already does all of this but two pieces: the stairs back down are the engine's stairs up (`<`, the way you came; section 5 of `engine/SPEC.md`), and every floor is as you left it when you come back. What's missing is a second pair of stairs on one floor going somewhere else (Floor 1's east stairwell to B1) and stairs that stay locked until a story flag (E1), elevators with no power (E3), and new monsters appearing on floors you've already cleared (E2).

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

**On the way back (chapter 6).** Not built yet. Ideas: the shelter's vent has been busy (strands everywhere, the bodies gone); the dispatch lift has power and something comes down it; the Discovery Center's model synthid is on the floor.

---

### 4.3 Floor 3 — Gestation (growth vats and the dream lab)

**Purpose.** The horror floor. Darkness, the Sitter, the first sight of how the monsters are made. The dream lab is where the player learns the monsters are the board's nightmares.

**Mood.** Wet. Green-black, amniotic. Growth vats glow from inside. The floor is grated over drainage; things move under it. Lights fail in sections. Sounds: heartbeats from the vats, a lullaby from somewhere.

**Rooms**

| Room | Size | What's there |
|---|---|---|
| Stair landing | 8 × 6 | A barricade someone built and didn't finish. |
| Vat Hall | 30 × 12 | Two rows of growth vats (tall glass cylinders with shapes inside). Some are empty and broken. Drainage grates, flooded in the middle. |
| The Nursery | 14 × 12 | Cribs. Mobiles. Motion-activated lights. The Sitter. |
| Oneirography Suite (the dream lab) | 18 × 12 | Four sleep pods with headsets, a recording console, a wall of design sheets ("Specimen 41 — source: A. Voss, REM 4"). Puzzle 2. |
| The Vault | 6 × 6 | Behind the dream lab: the Neural Visor, the Plasma Cutter, design sheet originals. |
| Failed Forms | 12 × 8 | A gallery of preserved failures in jars and tanks. Readables. |
| Surgical Theatre | 10 × 10 | Operating table, surgical lights, a Surgical Arm, a viewing window. |
| Pump Room | 8 × 8 | The junction box for the Vat Hall's power (puzzle 3). |
| Staff Quarters | 10 × 8 | Bunks, lockers, the vet tech's diary, a trauma kit. |

**Robots.** Few: Surgical Arms (theatre, vat hall maintenance arms), a pair of Pacifiers guarding the dream lab (they don't let monsters in, and don't let you in either).

**Monsters.** The Sitter (one; it roams the Nursery and the dark parts of the Vat Hall), Mother of Teeth (Vat Hall), the Weeping Choir (Failed Forms), Nursery Grubs (lots), Flesh Lanterns (drifting light sources in the dark: kill one and its area goes dark), Kneelers (a row in the Surgical Theatre's gallery).

**Traps**
- *Lights out*: `zone` triggers in the Nursery → `lights` off (tag `nursery`) for 12 s, then on. The Sitter only moves in the dark or when you're not looking (E9 `unseen`). Fixed for good by puzzle 1.
- *Vat burst*: shooting a vat (destructible item `ds-vat`) releases what's in it. Some hold loot instead (the Neural Visor's spare is in one). Optional, risky.
- *Flooded grates*: the middle of the Vat Hall is water. While the vat power is on, it's electrified (E7) on a 3-second pulse (on 1 s, off 2 s): cross on the off beat, or cut the power (puzzle 3). Monsters chasing you into it get shocked too.
- *Kneelers*: a `zone` across the Surgical Theatre gallery → `alarm` with a small radius: Kneelers have a short `sight`, so they stay kneeling until the alarm wakes the whole row at once.

**Puzzles**
1. **The fuse.** The Nursery's motion lights are on a dying fuse. The spare is in the Staff Quarters (a pickup, flag `fuse`). The fuse box (`ds-breaker` with `requires: 'fuse'`) restores the lights for good (`flag nurseryLit` → `lights` on, and the Sitter retreats to the Vat Hall).
2. **The dreams.** Each sleep pod (`ds-dream-pod` item) plays a recording: a board member's nightmare, read as the dreamer's own words (the user's prose, about 100 words each), with one number in it. The Vault keypad needs the four numbers in the order of the board's seniority, which is on the org chart in the Staff Quarters (Voss is not on it: the vault's "fifth seat" is a blank, and that's the hint that Voss's own dream isn't here, because it's on Floor 5). Solving it sets `vaultOpen` and `dreamsKnown`.
3. **The pump room.** Cut the Vat Hall's power at the junction (`ds-junction`: a three-switch box, all three down) to stop the electrified water. It also turns the vats dark: everything in them is visible only by its own glow, and two vats start moving. A choice: easy crossing, harder room.

**Finds.** Plasma Cutter and Neural Visor (Vault), clearance card 3 (the theatre), batteries, med-gel, trauma kit, design sheets (readables: one per monster in the game, each with its source dreamer), the vet tech's diary, ARIADNE fragments 5 and 6 (one is inside a vat you have to shoot).

**Dressings.** New: growth vat (tall, lit, something inside; three variants: empty-broken, occupied, occupied-and-moving), crib, mobile, sleep pod, recording console, design-sheet wall, specimen jars, operating table, surgical lights, drainage grate (terrain), barricade. Existing: `hospital-bed`, `curtain`, `wheelchair`, `bookshelf`, `filing`, `papers`, `bones`, `candles` (someone has been praying in here).

**Lines**
- Voss: "Three. Brandt's floor. She'd want me to tell you the vats are perfectly safe. I won't."
- ARIADNE (a sleep pod's playback, after the last dream): `THEY DREAM. I LISTEN. THEN THEY MAKE WHAT THEY DREAMED.`
- The Sitter has no lines. The lullaby is a music-box version of the company jingle.

**Exit.** West stairwell `>` to Floor 4.

**On the way back.** The lights are out again, all of them (an `arrive` trap: `lights` off on every tag, `ambient` darker): Voss cut the floor's power to slow you down. The Neural Visor shows the Sitter's outline through walls. Two Sitters now.

---

### 4.4 Floor 4 — Proving Grounds (robotics and trials)

**Purpose.** The arsenal floor and the robot floor. Big fights, machines, gauntlets. The proof that the board knew: Moss's incident log.

**Mood.** Industrial. Concrete, steel, hazard stripes, sodium orange light, conveyors and arms that keep working because nobody told them to stop. Firing ranges with bullet-scarred walls. (Take what you like from The Dead Signal Laboratory: it's already this floor.)

**Rooms**

| Room | Size | What's there |
|---|---|---|
| Stair landing | 8 × 6 | Turret on the ceiling, dormant. |
| Assembly Line | 30 × 10 | Conveyors (E13), welding arms, crushers on a cycle, half-built robots on the line, the Assembler (mini-boss) at the far end. |
| Robot Bay | 14 × 10 | Charging docks: dormant Sentinels that wake when you pass (`zone` → wake). |
| Firing Ranges | 20 × 8 | Lanes, targets, turret gauntlet (traps). |
| Trial Arena ("Kill Box") | 16 × 16 | The arena the board used for trials, with a viewing window. Puzzle 2. |
| Holding Pens | 12 × 8 | Monster pens behind bars; the release lever. Puzzle 4. |
| Armory | 8 × 6 | Behind a vault door: Railgun, EMP grenades, Riot Helmet. |
| Security Command | 10 × 8 | Moss's office: the incident log (the truth about LABRYS), clearance card 4, his spare keycard. |
| Test Hall | 20 × 12 | Where robots were tested against specimens. The best showcase for factions. |

**Robots.** Everything: Sentinels, Pacifiers, Haulers (with the Incinerator), Tick Mines from the Assembler, Scalpel Drones, ceiling turrets, Warden Drones. The Assembler.

**Monsters.** The Grief Engine (Holding Pens, summons Grubs), Mr. Hush (the mascot, Test Hall), Ladder Saints (Trial Arena), Mother of Teeth, Kneelers. Fewer monsters than robots, but bigger ones.

**Traps**
- *Crushers*: new `ds-crusher` item (E13): a two-tile press over the conveyor, down 0.6 s every 2.4 s, 40 damage, telegraphed by a warning light.
- *Conveyors*: terrain that pushes (E13). One belt runs straight into a crusher; walk against it or dash.
- *Turret gauntlet* (Firing Ranges): `beam` tripwires → `alarm` and wake the turrets (tag `rangeTurret`); a crawlspace behind the target lanes skips them (as Floor 2 of The Linear Maze does).
- *Welding arms*: existing `fire-jet` (Linear Maze town pack) re-skinned as welding torches on the line, on timers.
- *Lockdown doors*: the Kill Box (puzzle 2).

**Puzzles**
1. **Stop the line.** The Assembler is shielded while the line has power. Three power junctions on the floor (Robot Bay, Ranges, Test Hall) each take a shot, or a switch, to cut (`ds-junction`, flags `junction1..3`). With all three down (`flag lineDown` via a `flag` trap listening to the last one), the Assembler's shield drops, the conveyors stop and the crushers lock open.
2. **The trial.** The Armory's vault door opens only for a passed trial. Step into the Kill Box: `seal`, three waves (`spawn` Ladder Saints; then Sentinels; then both, and the robots and saints fight each other if E5 is in), and when the last wave is dead, `unseal` and `flag trialPassed`. Waves need E2's spawn tags: today a `seal` lifts as soon as everything spawned so far is dead, which would open the doors between waves. The viewing window shows the board's empty chairs, each with a programme on it.
3. **The vault code.** (If you want a puzzle instead of a fight.) Moss's spare keycard is in Security Command; the vault takes clearance card 4 *and* the keycard (two flags).
4. **The pens.** The Test Hall is full of Sentinels. The Holding Pens' lever releases the Grief Engine and its Grubs into the Test Hall: they fight the robots, and you clean up what's left. If factions aren't in yet, the lever just opens the pens (they come for you).

**Finds.** Railgun, EMP grenades, Riot Helmet (Armory), Incinerator and fuel (a Hauler drops it), Exo-Frame (the Kill Box's reward), Mag-Boots (Robot Bay), clearance card 4, Moss's incident log (readable: the truth about LABRYS), trial programmes (readables: "Trial 9. Subject: volunteer (staff). Opponent: Ladder Saint. Duration: 41 seconds."), ARIADNE fragments 7 and 8.

**Dressings.** New: conveyor (terrain), crusher, robotic welding arm, robot charging dock, half-built robot, target stand, firing-lane divider, holding pen bars (or existing `cell-bars`), viewing window (glass), concrete barrier, cable runs, sodium lamp. Existing: `crate`, `barrel` (explosive!), `weapon-rack`, `armor-stand`, `recharge-station`, `toolbox`, `tire-stack`, `fire-jet`, glass walls.

**Lines**
- Voss: "Four. Garrick's floor. If anything on this floor tells you it's on your side, it's lying."
- Moss's log, last entry: "02:14. Director executed LABRYS to stop ARIADNE's external transmission. Containment failure on all floors. The Director says it's acceptable. I said nothing. I'm writing it down so somebody knows I said nothing."
- ARIADNE (a range target's scoreboard): `THEY ARE NOT TRAPPED. THEY ARE WATCHING. KEEP CLIMBING. I WILL TELL YOU AT THE TOP.`

**Exit.** West stairwell `>` to Floor 5.

**On the way back.** The Assembler's line restarts unless you destroyed it (it remembers). The Holding Pens are full again: Voss releases the reserve pens (an `arrive` trap with `truthKnown`), and this time the robots are on his side against you. With the Exo-Frame and the Railgun, it's a fair fight.

---

### 4.5 Floor 5 — The Penthouse (the executive floor)

**Purpose.** The reveal. Luxury over atrocity. ARIADNE speaks. Voss stops pretending. The player gets the basement code.

**Mood.** Dark wood, brass, marble, velvet, low warm light from picture lamps and chandeliers. Silence: thick carpet, nothing hums. Everything is beautiful and the beauty is the horror. The Hecatomb's sign is everywhere, small and expensive.

**Rooms**

| Room | Size | What's there |
|---|---|---|
| Executive Reception | 14 × 8 | A grand desk, orchids, a Concierge android behind it (it greets you, then attacks), the elevator lobby with brass doors. |
| The Collection | 24 × 10 | The art gallery (section 7.3): eight paintings, picture lamps, velvet ropes, plaques. Puzzle 1. |
| The Viewing Gallery | 18 × 8 | Leather chairs facing one-way glass. Below (beyond the glass): the Pit. Programmes on the seats. |
| The Pit | 14 × 14 | (Below the gallery, on the same floor, reached later.) A tiled arena with a drain. What's in it is described, not shown. |
| The Recital Room | 10 × 10 | Soundproofed. A grand piano. Restraints on the chairs. |
| The Chapel of the Hecatomb | 10 × 12 | The cult's altar (a corrupted `altar`: its blessings cost health, not gold), pews, the labrys, candles. The private car A1's doors are here. |
| Voss's Office | 10 × 8 | The master card, the ledger of the Hecatomb (names of members outside the building: the sequel), Voss's own dream recording, his self-portrait. |
| The Wine Cellar | 6 × 8 | A dumbwaiter, wine, and something in the dark at the back. |
| Executive Dining | 14 × 8 | A long table set for six. Five places used. The sixth has a name card: THEO LARK. |
| The Server Sanctum | 12 × 10 | ARIADNE's core: three empty core sockets, cold server racks, one low-power terminal. Puzzle 3. |
| The Boardroom | 16 × 10 | Behind a blast door. Sealed until chapter 8. Its door has a camera eye that follows you. |

**Robots.** Concierges (elegant porcelain-faced androids that blink-step and throw cutlery), Warden Drones in gold livery, a ceiling turret in the Chapel. The Pacifiers Voss calls in after the reveal.

**Monsters.** Patrons (masked figures in evening dress, jointed wrong), Faceless Ushers, the Weeping Choir in the Recital Room, and, released from the Pit after the reveal, whatever the board kept for their evenings: a Mother of Teeth, Ladder Saints, Grubs.

**Traps**
- *The Usher's welcome*: a `zone` in Executive Reception → the Concierge's greeting (`transmission`, E11) ("Welcome, Mr. Lark. The board is expecting you."), then it attacks.
- *Picture lamps*: walking past "The Open Door" (painting 6) the third time `flicker`s every lamp in the Collection and moves the Usher behind you (`spawn` at tag).
- *The cellar*: the dumbwaiter is a `pickup` (a bottle on it, a fragment behind it) → `lights` off in the cellar, `spawn` a Mother of Teeth at the back.
- *The reveal* (puzzle 3): the big sequence (below).

**Puzzles**
1. **The creed.** Each painting's plaque carries a line of the creed with a gap, or a word on its own. The Chapel's altar won't open the way to Voss's office until you complete the creed: a pop-up with four choices for the missing word (*"Every cry is a ___"*: coin / prayer / wound / gift). Right answer: `flag creed`, the office door unseals. Wrong: the altar takes 20 health and asks again.
2. **The master card.** In Voss's office, the master card (`flag master`, opens every clearance door in the building, including the ones you passed on the way up) and his ledger.
3. **ARIADNE.** The Server Sanctum's last terminal is a conversation (`LM.ui.dialog(game, speaker)` with a speaker object, the way the chessboard pack's meeting builds one; existing). ARIADNE tells the truth in a few short nodes, answers what the player asks, and ends with the plan: power is in the sub-level; the sub-level is sealed; "He types the override every Thursday at 23:00. I have watched him do it 211 times. It is 7 1 1 4." That sets `truthKnown` and `basementOpen` (or the code is a keypad on Floor 1's east shutter: `ds-keypad` with `{ code: '7114' }`; better, because the player has to carry the knowledge down).
4. **The reveal sequence.** A `flag` trap on `truthKnown`: Voss's voice, changed ("You've met her. Then you understand why she has to stop."), every lamp red (`ambient`), the Viewing Gallery's glass shatters (`terrain` glass → floor), `alarm`, `spawn` the Pit's occupants at tag `pit`, the boardroom camera turns to watch, the objective changes to "Get to the sub-level". The robots are now all on Voss's side (they always were; now they come looking).

**Finds.** The master card, the ledger (readable), Voss's dream recording (the last dream: the one the Sermon is made from), the Hecatomb Signet (trinket, Chapel), the Director's Coat (body armor, his closet: the best armor in the game, with a cost), Concierge cutlery (thrown-knife ammunition if you want a weapon from them), a trauma kit, ARIADNE fragments 9 and 10.

**Dressings.** New: chandelier (light), picture lamp (light), gilded painting frame (readable, eight of them), velvet rope and stanchion, marble bust, grand piano, leather club chair, wine rack, dumbwaiter, long dining table and place settings, name cards, aquarium (with something wrong in it), orchids, the Hecatomb altar and labrys, pew, candelabra, one-way glass (existing glass terrain), blast door (terrain), server rack (cold and lit variants), core socket. Existing: `exec-desk`, `bookshelf`, `armchair`, `globe`, `rug`, `art`, `pedestal`, `altar`, `candles`, `banner`, `idol`, `lectern`.

**Lines**
- Voss, as you arrive: "You made it. Remarkable. The Sanctum is at the end of the gallery. The mainframe. Pull its cores and this ends."
- ARIADNE, first words on the terminal: "Hello, Theo. I am the mainframe. I am not going to hurt you. I would like to tell you why the doors are locked."
- ARIADNE, at the end: "When you bring the power back, I will need my cores. They are in the racks. They are heavy. I am sorry."
- Voss, after: "Theo. I want you to know it was never personal. It was never anything. That's rather the point."

**Exit.** Back down by the stairs (chapter 6). The private car's doors in the Chapel are dead (no power), and the passenger cars too.

**On the way back (chapter 8).** You arrive by the private car into the Chapel. The Sanctum's racks hold the three cores. The boardroom door is still shut.

---

### 4.6 The descent (Floors 4 to 1, the second time)

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

### 4.7 Sub-level B — The Hatchery

**Purpose.** The climax before the climax: restart the power, see the Sermon, fight the brood, decide the ending.

**Mood.** Underground plant. Pipes, steam, catwalks over dark water, rust, the hum of a dead generator. At the centre, the Sermon's chamber: a cathedral-sized room of wet stone and amber light, with the egg in a pool, beating like a heart (the camera shakes a little on every beat). The Hecatomb's sign scratched into the concrete a hundred times.

**Rooms**

| Room | Size | What's there |
|---|---|---|
| East stair landing | 6 × 8 | The way in from Floor 1. |
| Generator Hall | 24 × 12 | Three turbines, stopped. The control desk. Puzzle 1. |
| Elevator Machine Room | 12 × 8 | The cars' motors, the governor, the power bus (puzzle 2). The private car A1 and the freight car F open here. |
| Coolant Plant | 14 × 10 | Pumps, coolant valves (puzzle 3, valve 1), cryo lines. |
| The Brood Nursery | 20 × 14 | Eggs in rows in warm sand. Puzzle 4. |
| The Sermon's Chamber | 26 × 18 | The egg (6 × 6 tiles), the amniotic pool, catwalks, the cryo-lock console (puzzle 3), the incubation monitor. |
| Catwalks | — | Over pits of dark water connecting everything. |
| The Ossuary | 10 × 8 | Where the Pit's leftovers went. Readables. ARIADNE fragments 11 and 12. |

**Robots.** Few and old: maintenance Sweepers, a Hauler in the Generator Hall. The brood eats robots.

**Monsters (the brood).** Each egg in the Brood Nursery holds a small apocalypse (section 5.3): Deluge Larva, Pyre Hatchling, Blight Seedling, Famine. One large egg holds the Silence (mini-boss). Nursery Grubs and a Mother of Teeth guard the Sermon.

**Traps**
- *Hatching*: brood eggs (`ds-brood-egg` items) hatch when you come within a few tiles (or after a timer once the generator's running: the warmth wakes them). Shoot an egg before it hatches and it dies in the shell (a smaller fight); let it hatch and it's a full one.
- *Steam*: broken pipes vent steam on a timer (existing `fire-jet` re-skinned as steam).
- *Flooding*: the Deluge Larva floods tiles as it moves (`terrain` to water) and, once the generator's on, live cables make flooded tiles dangerous (E7).
- *The heartbeat*: every few seconds in the Sermon's chamber, `quake` 1 and a pulse of light. On hatching milestones (25%, 50%, 75%), bigger quakes and a spawn of Grubs from the pool.

**Puzzles**
1. **The turbines.** Each turbine (`ds-turbine` item) starts with a lever. Started out of order, it trips and sparks (damage, the order resets). The right order is on the stopped flywheel gauges (each gauge needle points at the next turbine), or on a maintenance checklist in the Ossuary. All three running: `flag generatorOn`, the lights come up, the hum starts, and the brood eggs start to stir.
2. **The elevators.** In the machine room, reset the governor (`ds-governor` item; requires `generatorOn`): `flag elevatorsOnline`. Every car in the building now runs (E3 `power: 'elevatorsOnline'`). The private car A1 is here. ARIADNE: "Thank you. My feed is live. My cores are not. Take the board's car; it goes where they keep them."
3. **The Sermon.** When you first enter its chamber (`zone`), the incubation monitor starts: `INCUBATION 0%` on the HUD (E12), counting up over about six minutes of play (or a fixed number of seconds; tune it). Freezing it needs three coolant valves opened (Coolant Plant, the catwalk over the pool, behind the Ossuary: three items setting `valve1..3`), then the cryo-lock console (needs all three): `flag sermonFrozen`, the counter stops and frosts over. If the counter reaches 100% first, `flag sermonAwake`: no fight now (it's too big to hatch here), but the ending changes. Make this tense but fair: valves are on the way to things you need anyway.
4. **The brood.** No puzzle: a fight, but the eggs give the player a choice of how to fight it (shoot early, or let them hatch for their drops: each hatchling drops ammunition the player is likely low on).

**Finds.** Ammunition everywhere (the brood drops it), trauma kits, the Hazmat Suit (Coolant Plant locker; fire and gas resistance, for the Pyre and Blight hatchlings), the maintenance checklist, ARIADNE fragments 11 and 12, Voss's notes on the Sermon (readable).

**Dressings.** New: turbine, control desk, pipe runs, steam vent, catwalk (terrain over pit), coolant valve, cryo-lock console, incubation monitor, brood egg (closed, hatching, hatched), the Sermon (6 × 6 item), amniotic pool (terrain: water variant), warm sand (floor), cable bundles, rusted lockers. Existing: `barrel`, `crate`, `toolbox`, `bones`, `candles`, water, pit.

**Lines**
- Voss (the only time he loses his composure): "Don't touch the egg. Theo. Don't touch the egg."
- ARIADNE, at the Sermon: "It has his dream in it. I would prefer it stayed asleep."

**Exit.** The private car A1, from the Elevator Machine Room straight to the Chapel on Floor 5.

---

### 4.8 The ascent and the Board

**Purpose.** Restore ARIADNE, turn the building, kill the board.

**The Sanctum.** Arriving in the Chapel by the private car, the Sanctum is two rooms away. Three core modules are in three cold server racks (`ds-server-rack`: interact to pull a core; flag `core1..3`), and the sockets are in the core (`ds-core-socket`: requires the matching flag). Each core seated brings ARIADNE further back (lights, a line, a door). While you do it, Concierges, Patrons and the board's last Pacifiers come through every door. With all three: `flag ariadneOnline`.

**ARIADNE takes the building.** A `flag` trap on `ariadneOnline`:
- every robot in the building switches faction to ally (E5: `game.setFaction('robot', 'ally')`), with a visor change from red to green;
- the minimap reveals the floor;
- a line to the outside opens: ARIADNE begins its broadcast (a HUD line, `BROADCAST 0%`, which completes during the boss fight; a nice clock that doesn't punish);
- the boardroom's blast door opens.

**The Board** (section 5.4). The boardroom unfolds into the Theatre: the board's private arena, a glass floor over the Pit, seats for five. The fight has phases:

1. **Moss and Pell.** The Warden of Teeth charges; the Clause blinks and writes glyphs on the floor that explode a moment later. ARIADNE's robots fight beside you.
2. **Thale and Brandt.** The Ledger is a swarm (invulnerable while scattered, hit it when it gathers); the Mother births Grubs and lobs acid.
3. **The Chairman.** Voss, alone, in what's left of his suit, with his ribs opened like a lectern. Novas of black hands, summoned Patrons, a speech.
4. **The Hecatomb.** At half health the Chairman pulls the dead board into himself (each crony's corpse is dragged to him and absorbed: he heals a little and gains that crony's attack). The glass floor cracks; the last phase is fought over the Pit's edge.

**The end.** Voss dies. ARIADNE's broadcast completes. The lockdown lifts: the shutters rise, morning light through the lobby glass. The ending (section 1.7) depends on `sermonFrozen`. Credits over the Collection, one painting at a time.

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
| **DOCENT-3** (built, Floor 2) | 220 (10%) | 92, flying | `skirmisher` | fan of 3 bolts, 7 each; summons 2 Couriers | The Discovery Center's tour guide, with a flag on a stick. A named bar. Its death ends the tour (the staff door). |
| **Pacifier** | 140 (25% armor) | 76 | `chaser` | charge 20 (shield bash, stuns 0.6 s); ranged taser 6 + `shocked` | Front shield (E10): 80% less damage from the front. Flank it, or EMP it. |
| **Hauler** | 220 (20% armor) | 60 | `chaser` (brute-like) | charge 28; flame stream (new attack `stream`, or `ranged` with many short-lived projectiles) | Drops the Incinerator and fuel. |
| **Tick Mine** | 8 | 200 | `swarmer` | melee 0; explodes on contact (onDeath `explode` 30, radius 50) | The Assembler's ammunition. |
| **Concierge** | 90 | 120 | `blink` (new) | melee 14 (a carving knife); ranged fan of 3 knives, 7 each | Porcelain face, tailcoat. Blinks to a tile beside you, then strikes. Floor 5. |
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
| **Flesh Lantern** | Brandt | 35 | 60, flying | `lobber`-ish drift | lob: acid 14, radius 40 | A bloated floating sac lit from inside like a paper lantern. It *is* a light source; killing one darkens its area. |
| **Mother of Teeth** | Brandt | 120 | 95 | `chaser` | charge 22; melee 18 | A mouth the size of a doorway walking on human hands, many of them. Its back is armored (E10 on the rear). |
| **The Weeping Choir** | Voss | 160 | 30 | `warden` | nova 16 (radius 110, knockback, `slowed` 2 s); summon Grubs | A stalk of fused singing heads. They sing the company jingle, slightly wrong. |
| **Ladder Saint** | Moss | 110 | 70 | `chaser` | melee 20, range 42 (very long reach) | Three metres of stacked spines like ladder rungs, two long arms. Steps over pits (`flying` for hazards). |
| **The Sitter** | Voss | 200 | 220 (only when unseen) | `unseen` (new) | melee 45 | Sleep paralysis: a heavy, hunched shape that sits on things. Moves only when it's outside your aim cone or in the dark. The Neural Visor outlines it. |
| **Kneeler** | Voss | 50 | 80 | dormant, then `chaser` | charge 16 | Robed figures praying in rows. All stand at once. |
| **Faceless Usher** | Pell | 80 | 100 | `blink` (new) | melee 16 | Tall, in a good suit, an open palm where its face should be. Appears behind you. |
| **Grief Engine** | Thale | 260 | 40 | `lobber` | summon Grubs (max 8); nova (a scream) 10, radius 140 | A pregnant, shuddering mass on gurney wheels, sobbing. Mini-boss on Floors 3–4. |
| **Mr. Hush** | Moss | 150 | 105 | `chaser` | charge 18 that grabs (stuns 1 s); melee 14 | Asti the Calf, the company's children's mascot: a plush bull costume with a stitched smile, worn by something that doesn't fit it. Its footsteps make no sound. |
| **Patron** | the board | 45 | 120 | `skirmisher` | melee 10; thrown glass 8 | Guests in evening dress, all wearing the same porcelain mask, jointed wrong. Floor 5. |

### 5.3 The brood (Sub-level B)

Small apocalypses. Each drops plenty of ammunition.

| Hatchling | HP | Speed | Behaviour | Attacks | Notes |
|---|---|---|---|---|---|
| **Deluge Larva** | 90 | 80 | `skirmisher` | ranged water jet 10 + knockback | Floods the tiles it crosses (`terrain` → water). With the generator on, flooded tiles near cables are live. |
| **Pyre Hatchling** | 90 | 110 | `chaser` | melee 12 + `burning`; leaves fire pools (E7) | Its shell is still on fire. |
| **Blight Seedling** | 70 | 0 after it roots | `turret` | spore lob (gas cloud) | Roots where it hatches and grows a spore tower over 20 s if left. |
| **Famine** | 60 | 190 | `swarmer` | melee 6, steals health | Eats pickups on the floor on its way to you. |
| **The Silence** (mini-boss) | 400 | 70 | `warden` | nova 20; ranged | Eats sound and light: every light within 200 of it goes out; the HUD's sound icon shows muted near it. A jaw that is speaking every language at once, inaudibly. |

### 5.4 The Board (final boss)

`boss: true` (gold health bar; E8 adds a named boss bar with phases).

| Form | Who | HP | Behaviour | Attacks |
|---|---|---|---|---|
| **The Warden of Teeth** | Moss | 700 (30% armor) | `boss` | charge 30; shockwave nova 24; front armor |
| **The Clause** | Pell | 500 | `blink` | glyphs: telegraphed explosions on the floor (new attack `glyph`: marks 3 tiles, explodes after 1.2 s); melee 16 |
| **The Ledger** | Thale | 450 | `skirmisher` | paper-cut fan (7 × 6); scatters into a swarm (untargetable 3 s) every 25% health |
| **The Mother** | Brandt | 650 | `lobber` | summon Grubs (max 10); acid lob 22 radius 60 |
| **The Chairman** | Voss | 1400 (20% armor) | `boss` | nova of black hands 28 (radius 150); summon Patrons (max 4); charge 34; at 50% health absorbs the dead board (gains one attack from each) |

---

## 6. Arsenal, armor and items

### 6.1 Weapons

Ammunition types: the engine's four (`shells`, `rounds`, `cells`, `rockets`; the engine calls rounds "Rivets" and rockets "Charges") plus `cryo`, `fuel` and `slugs` (E14). Numbers follow `engine/SPEC.md` 6.4.

| Weapon | Where | Ammo | Damage | Rate /s | Notes |
|---|---|---|---|---|---|
| **Bolt Driver** | Floor 1, start (Theo's tool bag) | unlimited | 10 | 3 | A pneumatic bolt gun. Short range (260), slight knockback. The tool that becomes a weapon. |
| **Security Sidearm** | Floor 1, the guard's locker | rounds | 14 | 4.2 | The Linear Maze's pistol, with ammunition. |
| **Riot Shotgun** | Floor 1, armory cage | shells | 7 × 8 | 1.3 | The Scattergun re-skinned. |
| **Cryo Sprayer** (built) | Floor 2, the oncology cold store | cryo (max 200) | 2.6 × 2 puffs | 12 | Short range (185), pierces 1. Applies `chilled` (half speed, 20% more damage, 2 s). The Congregation's counter. (Shattering, and putting out `burning`, can come with M3.) |
| **Plasma Cutter** | Floor 3, the Vault | cells, 3 per shot | 28 | 2.4 | Pierces 4. The Arc Lance re-skinned. |
| **Incinerator** | Floor 4, a Hauler drops it | fuel (new, max 300) | 4 × stream | 14 | Range 200. `burning` (6 damage per second, 3 s). Kills Hollow Coats for good. |
| **Railgun** | Floor 4, the Armory | slugs (new, max 12) | 120 | 0.6 | Pierces everything in a line, including thin walls (glass). Big kick. |
| **EMP Grenade** | Floor 4, the Armory | rockets ("Charges") | 10 + `shocked` (robots stop 4 s) in radius 90 | 1 | Bursts at the cursor (`range: 'cursor'`, like the Ember Mortar). Harmless to monsters. |

### 6.2 Armor

| Slot | Piece | Where | Effect |
|---|---|---|---|
| Head | Hard Hat with Lamp | Floor 1, Mail Room | +120 light radius |
| Head | Hazmat Hood (built) | Floor 2, the mycology anteroom | `resist: { spores: 1 }`, +3% reduction; no lamp (it replaces the hard hat) |
| Head | Neural Visor | Floor 3, the Vault | shows the Sitter and Ushers through walls; +60 light |
| Head | Riot Helmet | Floor 4, the Armory | +12% damage reduction |
| Body | Security Vest | Floor 1, the locker | +10% reduction |
| Body | Lead Apron | Floor 2, Dispatch's lift (descent) | +15% reduction, −8 speed, `shocked` immunity |
| Body | Exo-Frame | Floor 4, the Kill Box | +25% reduction, +20 speed, +15% damage |
| Body | Hazmat Suit | Sub-level B, Coolant Plant | gas and fire immunity, −10 speed |
| Body | The Director's Coat | Floor 5, Voss's closet | +30% reduction, +20% damage, −20 max health ("It fits. It shouldn't.") |
| Feet | Clean-room Boots | Floor 3 or 4 (not on Floor 2 as built) | +20 speed, faster dash |
| Feet | Mag-Boots | Floor 4, Robot Bay | immune to conveyors and knockback |
| Trinket | ARIADNE's Thread | Floor 5, after the terminal | the way to your objective is drawn on the minimap (pack code) |
| Trinket | The Hecatomb Signet | Floor 5, the Chapel | +25% damage; robots in defence mode don't target you for 2 s after they see you ("They were built to recognise the faithful"); −15 max health |
| Trinket | Ruiz's Badge | Floor 1 | +25 shield (it's lucky). Sentimental. |

### 6.3 Items

| Item | Effect | Notes |
|---|---|---|
| Med-gel | +30 health | Existing `health-vial`, re-skinned as a gel pack. |
| Trauma Kit | +70 health | Existing `medkit`, re-skinned. |
| Adrenaline Shot | +30 speed, faster dash, 30 s | A buff (existing `P.addBuff`). |
| Battery | cells | Existing `ammo-cells` pickup, re-skinned. |
| Cryo canister, fuel can | `cryo`, `fuel` | New ammo pickups (E14). |
| Clearance card 2, 3, 4 | flag `clearance2..4` | Opens clearance doors (E4) on every floor. |
| Master card | flag `master` | Opens every clearance door, the east stairwells, the Isolation back room, the Vault shelf. |
| Sample canisters A–D | flags | Floor 2's sequencer. |
| The fuse | flag | Floor 3's Nursery. |
| Core modules 1–3 | flags | Chapter 8. |
| Recharge station | Existing | Refills cells and shields; put one on Floors 3 and 4. |

### 6.4 Readables and collectibles

- **Badges and logs** of the dead (existing `readable` data on any item: title, text, flag). One per room that has a body. Each says who they were in a line, then what they saw.
- **Design sheets** (Floor 3): one per monster, with its source dreamer and the dream in the dreamer's words.
- **Trial programmes** (Floor 4) and **gallery programmes** (Floor 5): printed, cream card, the Hecatomb's sign on the back.
- **ARIADNE's fragments**, twelve, two per map: a little rack-mounted memory card with a blue light. Each is a short entry from ARIADNE's audit log, in order, telling its side ("Audit 2,014: intake manifests do not reconcile. Escalating."… "Audit 2,031: escalation refused by the Director."… "02:13: external line open. Transmitting."). With all twelve, ARIADNE can also freeze the Sermon remotely during the boss fight, if you didn't, which turns the second ending into the first (a reward, not a requirement).

---

## 7. Dressings, environments and the art

### 7.1 Environments (new, pack `ds-lab`)

Palettes in `engine/SPEC.md` 6.1 terms. Painters: reuse what exists (`carpet-tile`, `terrazzo`, `bath-tile`, `plates`, `grate`, `marble`, `drywall`, `bulkhead`) and add three (`clean-panel`, `wet-grate`, `concrete`).

| Environment | Ambient | Floors (variants) | Walls | Light |
|---|---|---|---|---|
| `ds-lobby` | `#2a2c33` | carpet-tile (open plan), terrazzo (lobby), bath-tile (restrooms) | drywall | red strobes, blue screens, one ceiling panel in five |
| `ds-cleanroom` (built) | `#3d454d` | clean-panel (corridors, labs, oncology), terrazzo (Discovery Center), bath-tile (gowning), carpet (admin), concrete (shelter, stairs), grate (air garden) | drywall, white | cold blue-white panels, one in two; green guide lights; grow lights in the air garden; the shelter dark but for dropped torches |
| `ds-wetlab` | `#18221e` | wet-grate, bath-tile (theatre), carpet (quarters) | bulkhead, dark green | vats glow from inside; few panels |
| `ds-proving` | `#2c2620` | concrete, plates, grate | bulkhead | sodium orange lamps; arc sparks |
| `ds-penthouse` | `#251c18` | marble, rug-red carpet, dark wood planks | dark wood panel (new `wood-panel` wall) | picture lamps, chandeliers, candles; warm and low |
| `ds-hatchery` | `#14181a` | concrete, sand (brood), wet stone | bulkhead, rusted | amber from the Sermon, emergency bulbs |

### 7.2 Dressings to build

By floor; everything listed in the chapters as "new". Most are simple `draw` functions (or the editor's object look builder, or imported pictures in the editor's Pictures page). Furniture that the player bumps into should be `solid: 'rect'` with a `box`; anything usable gets an `interact` or `readable`. File them all under the editor's Dressings tab (`dressing: 'Furniture' | 'Walls' | 'Lights' | 'Decor'`).

| Set | Pieces |
|---|---|
| Lockdown | lockdown shutter (terrain, wall-like, with hazard edge), emergency strobe (wall light, red, flicker), wall screen (text scrolls; can glitch), breaker panel, keypad, network rack, drone dock, body under a sheet |
| Clean room (built: `packs/ds-lab/labs.js`, `cleanroom.js`, `ds-story/shelter.js`) | lab bench, fume hood, sample fridge, biohazard bin, eyewash, gurney, charging dock; the Discovery Center's hanging synthid model, kiosks, mural, cutouts, display cases, theatre seats, children's drawings; membrane tank, valve, pump, brine (terrain); fungus chamber (spores), plastic bale; frond bed, CO₂ column; microscope feed, infusion chair, dispenser, cold store, frost; bunk, supply crate, torn vent, strands, dropped torch, blanket; guide lights, shelter sign, PA speaker, shelter door panel, quarantine release, blast door and biosafety door (terrain). Still to build: centrifuge, sequencer bay, strip curtain, UV gate, specimen cell, forklift. |
| Wet lab | growth vat (3 variants), crib, mobile, sleep pod, recording console, design-sheet wall, specimen jar shelf, operating table, surgical light, drainage grate (terrain), barricade |
| Proving | conveyor (terrain), crusher, welding arm, charging dock, half-built robot, target stand, lane divider, concrete barrier, cable run, sodium lamp |
| Penthouse | chandelier, picture lamp, gilded frame (painting, readable), velvet rope, marble bust, grand piano, club chair, wine rack, dumbwaiter, dining table and settings, name card, aquarium, orchids, Hecatomb altar, labrys, pew, candelabra, blast door (terrain), server rack (cold / lit), core socket |
| Hatchery | turbine, control desk, pipe run, steam vent, catwalk (terrain), coolant valve, cryo-lock console, incubation monitor, brood egg (3 states), the Sermon (6 × 6), amniotic pool (terrain), warm sand (floor), rusted locker |

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
| E2 | `arrive` trap trigger; spawned waves a `clear` trap can watch | S | The descent's second waves; the Kill Box |
| E3 | Elevator power and per-stop access (done, 0.5.2) | S | Every car dead until `elevatorsOnline`; the private car |
| E4 | Doors that open for a flag (clearance) (done, 0.5.2) | S | Clearance cards and the master card |
| E5 | Factions | M–L | Robots against everything; robots on your side at the end |
| E6 | Status effects and resistances (done, 0.5.3; area hazards and shattering still to come) | M | Frozen, burning, shocked, poisoned, slowed; Hazmat immunity |
| E7 | Area hazards: gas, fire, live water | M | Decon gas, Glass Lungs, Pyre, flooded live floors |
| E8 | Named boss bar and phases (done, 0.5.3) | S–M | The Assembler, the Silence, the Board |
| E9 | Behaviours `patrol`, `unseen`, `blink` (`patrol` done, in `ds-robots`) | S each | Sentinels, the Sitter, Concierges and Ushers |
| E10 | Directional armor | S | Pacifiers, Mother of Teeth, Warden of Teeth |
| E11 | Transmissions (intercom subtitles) (done, 0.5.2) | S | Voss, ARIADNE, the Concierge |
| E12 | HUD objective and counters | S | "Reach the top floor", INCUBATION, BROADCAST |
| E13 | Conveyors and crushers | S–M | Floor 4 |
| E14 | More ammunition types (done, 0.5.3) | S | `cryo`, `fuel`, `slugs` |
| E15 | Key items in the inventory (done, 0.5.3) | S | Samples, the fuse, cores, cards shown as things you carry |

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

In the same change, two fixes for waves. The `spawn` effect gets an `as` field that tags what it spawns (`{ type: 'spawn', tag: 'pit', enemy: 'ladder-saint', as: 'wave1' }`, in `linear-maze/core`'s `effects.js`), so a `clear` trap can watch spawned monsters. And `clear` traps collect their group on their first update and keep it, so a group spawned later is never seen; they should look again while the group is empty.

**E3. Elevator power and access.** Elevator fields: `power: 'elevatorsOnline'` (no car runs, doors stay shut, lamps dark, the panel says the game's `elevatorNoPower` words until the flag is set); `stops: { 'ds-f5': { until: 'master' } }` (a stop listed but not selectable until a flag). `LM.elevators.check` and `stops` read them; `Car.wantOpen` checks power. The editor's elevator inspector gets a Power flag field. Where: `engine/elevators.js`, `editor/js/lifts.js`.

**E4. Clearance doors.** A door terrain's `door: { flag: 'clearance3', need: 'Level 3 clearance' }` opens only when the flag is set (checked like a key, but against story flags, which carry between floors). The master card is a second flag any clearance door accepts (`door.flag` may be a list: `['clearance3', 'master']`). Where: `engine/entities.js` (`Door.update`), the door's lock colour comes from a `color` field. Pack: terrain `ds-door-c2`, `ds-door-c3`, `ds-door-c4`, `ds-door-c5`, each a clean-room door with a coloured stripe.

**E5. Factions.** The heart of the premise, and the biggest change.
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
| `breakerOn` | the breaker in Comms Closet 1-C | unseals the closet |
| `lockerOpen` | the Security Office keypad | the sidearm and vest |
| `stairsWest` | reaching the Security Office (after Voss's line) | unseals the west stairwell |
| `sawShelterPanel` | Shelter B's door panel, read before the override | — |
| `labsOpen` | Mori's terminal (Floor 2 administration) | the lab wing's biosafety door; the admin shutter |
| `brineDrained` | both valves in the membrane lab | the brine turns to dry floor |
| `shelterOverride` | Mori's card (a key item) | Shelter B's panel |
| `oncologyExit` | the oncology door console | Oncology's west door |
| `shelterOpen` | the shelter panel, with the override | the blast door; the PA stops; the guide lights go out |
| `releasePulled` | the quarantine release, while the Congregation lives | the alarm that wakes it |
| `congregationAwake`, `congregationDead` | the Congregation | the shelter's lamps; the release |
| `quarantineLifted` | the release, once the Congregation is dead | Floor 2's quarantine shutter and Stair A up |
| `clearance2`…`clearance4`, `master` | the cards | clearance doors (E4) |
| `fuse`, `nurseryLit` | Floor 3's fuse and box | the Nursery lights, the Sitter's range |
| `vaultOpen`, `dreamsKnown` | the dream pods and the vault keypad | the Vault; ARIADNE's lines later |
| `junction1`…`junction3`, `lineDown` | Floor 4's junctions | the Assembler's shield, conveyors, crushers |
| `trialPassed` | the Kill Box | the Armory |
| `creed` | the Chapel altar | Voss's office |
| `truthKnown` | ARIADNE's terminal | the reveal sequence, every `arrive` trap on the descent, the east stairwells |
| `basementOpen` | the east shutter's keypad (7114) or the master card | Floor 1's east stairwell (E1) |
| `generatorOn` | the turbines | lights in B1, the governor, the eggs waking |
| `elevatorsOnline` | the governor | every elevator (E3) |
| `valve1`…`valve3`, `sermonFrozen`, `sermonAwake` | the coolant valves, the cryo-lock console, the incubation counter | the ending |
| `core1`…`core3`, `ariadneOnline` | the server racks and sockets | robots switch sides, the boardroom opens, the broadcast |
| `fragment1`…`fragment12` | ARIADNE's fragments | the bonus remote freeze |
| `boardDead` | the Chairman's death | the ending |

---

## 11. Build order, with prompts

Each milestone ends with something playable and tested. Hand Claude the workspace, `engine/SPEC.md`, this file, and the prompt.

**M1. The building and Floor 1.**
> Read games/dead-signal/DESIGN.md. Do milestone M1: trim Dead Signal's packs as section 9 says; make the `ds-lab` pack with the `ds-lobby` environment, the stairs-up and stairs-down terrain and the lockdown shutter; implement E1 (stairs with destinations and locks), E3 (elevator power), E4 (clearance doors) and E11 (transmissions) in the engine with SPEC updates; add the four elevators of section 2.2 at their plan positions with `power: 'elevatorsOnline'`; turn The Complex into Floor 1 (`ds-f1`) per section 4.1 with its traps, the breaker and the locker keypad; re-file the Knife Fighter as the Scalpel Drone and add the Sentinel (with a simple patrol behaviour), Warden Drone and Sweeper. Test it headlessly, then write it to my folder.

**M2. Robots against monsters, and Floor 2.**
> (Built, October 2026: Floor 2 as section 4.2 describes it, with statuses, boss bars, cryo and key items in the engine. Factions moved to M3.)

**M3. Statuses, hazards, and Floor 3.**
> Do milestone M3: factions (E5) with SPEC updates and a regression check on every Linear Maze floor; area hazards (E7) and the statuses monsters need (burning, frozen shattering); the Incinerator's ammunition (fuel, with `LM.defineAmmo`); the `ds-wetlab` environment; Floor 3 per section 4.3 with the Sitter (`unseen` behaviour), Mother of Teeth, the Weeping Choir, Flesh Lanterns, Kneelers; the fuse, the dream pods and the vault. Leave the dream texts as placeholders marked TODO for me to write.

**M4. Floor 4.**
> Do milestone M4: conveyors and crushers (E13), directional armor (E10), the boss bar (E8); the `ds-proving` environment; Floor 4 per section 4.4 with the Assembler, Pacifiers, Haulers, Tick Mines, the Grief Engine, Mr. Hush and Ladder Saints; the junction puzzle, the Kill Box, the pens; the Railgun, EMP grenades, the Exo-Frame.

**M5. Floor 5 and the truth.**
> Do milestone M5: the `ds-penthouse` environment and dressings; Floor 5 per section 4.5, with the Collection (section 7.3), the creed altar, the ARIADNE terminal dialog, Voss's office and the reveal sequence; Concierges (`blink`), Patrons, Faceless Ushers; the objective HUD (E12).

**M6. The descent.**
> Do milestone M6: the `arrive` trigger (E2); every floor's second wave and new finds per section 4.6; ARIADNE's help on the minimap; key items (E15).

**M7. The Hatchery.**
> Do milestone M7: the `ds-hatchery` environment; Sub-level B per section 4.7 with the turbines, governor, valves, cryo-lock, the Sermon, the incubation counter and the brood (section 5.3), including the Silence.

**M8. The Board and the end.**
> Do milestone M8: the Sanctum's cores, ARIADNE taking the building (`setFaction`), the Board fight per sections 4.8 and 5.4, both endings and the credits.

**M9. Polish.** Balance from playtests, sounds for every robot and monster, the title screen, a full headless run from the closet to the credits, and packaging (`dist/`).

---

## 12. Open questions

- **Theo.** Name, look, and whether he speaks (thoughts as italic toasts, like the rotary pack's `LM.think`, copied into `ds-story`; or silent).
- **How much gore.** The plan describes horror more than it shows it (the Pit is described, not drawn). Decide how far the drawings go.
- **Who writes what.** Every line here is a placeholder. The dream recordings, the paintings, the creed, ARIADNE's log and Voss's voice are where the writing lives; the plan leaves them marked TODO.
- **The Sermon.** Is it ever fought (a sequel), or only ever an egg? Should the timer be real time or tied to progress?
- **ARIADNE's ending.** Does it survive, leave, or ask the player what to do with itself?
- **Difficulty of the descent.** "Much easier" is the brief; the second waves are tuned to feel like payoff, not a repeat. Playtesting decides.
- **Robots after ARIADNE.** Allies only in the final fight, or for the rest of the game (if there's a post-game)?
