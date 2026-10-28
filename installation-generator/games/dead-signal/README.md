# Dead Signal

A technician trapped in a biotech lab gone wrong fights his way to the top floor. `DESIGN.md` is the plan for the whole game: the story, the six maps chapter by chapter, the bestiary, the arsenal, and the engine and pack changes it needs, in milestones.

**Built so far: Floors 1 and 2** (milestones 1 and 2).

**Floor 1, Lockdown.** The ground floor of Asterion Biologics at 02:14. Theo starts sealed in Comms Closet 1-C with only his Bolt Driver; Dr. Voss talks him out over the intercom. Throw the closet breaker; get past the live cable in the west corridor; go through the lobby past two Sentinels, a Warden Drone and the cameras; reach the security office terminal; Voss opens Stair A. Off the route: Officer Ruiz's badge opens the armory cage (Riot Shotgun), his locker code is in the break room (sidearm and vest), Facilities has the hard hat, the mail room shuts you in with Nursery Grubs, HR has a Hollow Coat, and three of ARIADNE's twelve fragments are hidden on the floor. Stair B (down to the sub-level) and the elevators stay shut: that is for later in the story.

**Floor 2, Synthid Research.** Asterion's public face, and what it makes: synthids, microscopic living machines that make drinking water, eat plastic, breathe in carbon and eat cancer. A recorded voice is telling everyone to go to Shelter B, and green lights in the floor lead there. The shelter is sealed: supervisor override required. Round through the Synthid Discovery Center (DOCENT-3's tour, with Couriers), into administration (Dr. Mori's terminal opens the lab wing; her note says not to open the shelter), then the labs: the Membrane Lab is under brine (wade it, or turn both valves), the Mycology Lab breathes spores (the Hazmat Hood is in its anteroom), the Air Garden is quiet, and Oncology has the Cryo Sprayer in its cold store, and Mori, and her card. The card opens Shelter B. Fourteen people went in; none of them has a face any more, or nearly none. The Congregation sleeps among them, wearing their faces. The quarantine release on the far wall wakes it; kill it and Stair A opens up. Off the route: ARIADNE's node 02, the night schedule and dispatch (the TEMPLATE RUN), Plant Room B (the shelter breathes Floor 3's air), the tour theatre and Little Labs, fragments 4 and 5.

After Floor 2 come floors made in the editor on October 14, as placeholders until their real floors are built: *The Dead Signal Laboratory* (Floor 3), *The Complex* (4) and *The Sterile Annex* (5).

## Packs

| Pack | What's in it |
|---|---|
| `packs/ds-lab/` | The building: the `ds-lobby` tile set, concrete and clean-room floors, steel shutters, stairs drawn going up or down, lockdown shutters, fire doors, clearance doors, the armory cage, live water; strobes, wall screens, cameras, monitors, lockers, server racks, turnstiles, the Asterion sculpture, bodies, notes. The office furniture with Asterion's words instead of Meridian's. Floor 2 (`cleanroom.js`, `labs.js`): the `ds-cleanroom` tile set, brine that drains, Shelter B's blast door and the biosafety door; lab benches, fume hoods, membrane tanks, valves, fungus chambers that breathe spores, frond beds, CO₂ columns, microscope feeds, infusion chairs, a dispenser that heals, the Discovery Center's exhibits and hanging synthid model, bunks, torches, strands. |
| `packs/ds-arsenal/` | Bolt Driver, Security Sidearm, Riot Shotgun, Cryo Sprayer (and cryo, its ammunition); Security Vest, Hard Hat with Lamp, Hazmat Hood, Ruiz's Badge; med-gel, trauma kits, cryo canisters; the statuses (sedated, chilled, staggered, held, snared, spores, UV burn). |
| `packs/ds-robots/` | Sentinel (patrols a route, sees ahead of it, hears gunshots), Warden Drone (searchlight), Ceiling Turret, Sweeper, Scalpel Drone; the lab assistants: LabMate, Courier, Bench Arm, Sterilizer, DOCENT-3. |
| `packs/ds-nightmares/` | Hollow Coat (gets up once more), Nursery Grub; the Congregation (`congregation.js`) and its strands. |
| `packs/ds-puzzles/` | Breaker panels (throw or shoot), keypads. |
| `packs/ds-story/` | Voss, ARIADNE, the PA and DOCENT-3 as speakers; ARIADNE's twelve fragments; Ruiz's badge; the building's four elevators (no power yet); Floor 2's story pieces (`shelter.js`: guide lights, shelter signs, the PA's loop, the shelter's door panel and quarantine release, cards you carry); Floor 1 (`levels/f1-lockdown.js`) and Floor 2 (`levels/f2-synthid.js`). |

It also loads three Linear Maze packs: `core`, `office` (furniture and glass, without its people and phone) and `dressings`.

## Files

- `game.js`: the title screen, the words on the engine's screens ("Climb to Floor 2"), the packs.
- `editor/edits.js`, `editor/sprites.js`: what the editor saved: the three October floors, the Knife Fighter, the Glass Annex tile set, and the floor order.
- `DESIGN.md`: the plan. Milestone 3 (factions, and Floor 3) is next.

Play it with `engine/index.html?game=dead-signal`.
