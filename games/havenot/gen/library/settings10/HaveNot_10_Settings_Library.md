# JAGS HaveNot — Ten Settings & Two Hundred Functional Rooms

> Unofficial, original content library based on the supplied HaveNot sourcebooks and *Fun and Functional Rooms in HaveNot*. It is a generator-data supplement, not a JAGS combat-stat supplement.

## How to use

Assign an installation origin and setting. Keep approximately 25% of existing generator rooms explicitly functional, leaving the other 75% primarily random; a loose visual theme can still carry across. Related rooms should cluster, but alien intrusions and layers of historical reuse are encouraged. Draw room fixtures, interactables, loot and hazards from the tables; none except the first two named fixtures is mandatory. Fit actual geometry rather than forcing architecture.

**Suggested cluster connection weights:** same cluster 55%, same setting but different cluster 20%, related setting 15%, unrelated/anomalous 10%. **Suggested per-room additions:** 12% rare twist, 20% hazard, 28% loot, 32% post-collapse modification. Adjust to the installation level and treasure budget.

## Canon & original-content conventions

The Age of Wonders and Age of War framing follows the sourcebooks. The named locations, objects, devices and traps below are **new original inventions**, not asserted to be canonical. Traps specify effects and countermeasures rather than inventing damage numbers. Inhabitants can be drawn from Volume III and adapted by level.

## Palace of Purchased Sovereignty (`SET_PAL`)

**Era:** Age of Wonders. **Original purpose:** A facility where purchasers could rent sovereign dominion and purchase obedient subjects.

**Floor palette:** black-veined ivory marble; gilt geometric mosaics. **Walls:** lacquered walnut; gold leaf; animated ancestral portraits. **Lighting:** crystal chandeliers; floating candle drones.

**Atmosphere:** sandalwood and ozone, distant court fanfares. **Signage:** “ALL RIGHTS RESPECTED UNTIL PAYMENT EXPIRES”.

**Recurring major fixtures:** self-repairing throne; proclamation kiosk; kneeling automaton. **Treasure character:** gold ceremonial fittings; court identity tokens; sovereign access keys. **Hazards:** rank-verification lightning; compulsory kneeling fields. **Related setting:** `SET_TEM`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_PAL_01` | **Grand Audience Hall** — receive subjects | carved throne dais, audience rail, velvet benches | ceremonial seal, gilded canopy pin | rank-verification bolts |
| `ROOM_PAL_02` | **Sovereign Reception** — welcome new claimants | herald podium, identity kiosk, brass stanchions | claimant sash, holographic invitation | false-citizen exclusion gate |
| `ROOM_PAL_03` | **Throne Chamber** — perform authority | adaptive throne, kneeling pads, crown display | programmable crown chip, jeweled armrest | compulsory kneeling field |
| `ROOM_PAL_04` | **Royal Banquet Hall** — stage feats of abundance | thirty-seat table, self-filling dishes, servant drones | silver cutlery, nutrient pearls | allergen assassination meal |
| `ROOM_PAL_05` | **Trophy Gallery** — advertise greatness | animated busts, captured banners, rotating plinths | gem-studded campaign medals | jealous statue sentry |
| `ROOM_PAL_06` | **Private Bedchamber** — rest as royalty | floating canopy bed, silk wardrobe, privacy shell | personal shield locket | bedroom intruder suppression |
| `ROOM_PAL_07` | **Consort Dressing Suite** — fabricate exquisite appearance | mirror wall, automatic dressers, wig vault | designer hair matrix | face-replacement makeover |
| `ROOM_PAL_08` | **Noble Bathhouse** — ritual luxury cleansing | sunken bath, scented taps, heated stone seats | perfume concentrate, gold valves | boiling hospitality jets |
| `ROOM_PAL_09` | **Master of Ceremonies Office** — schedule sovereignty | ledger desk, bellboard, holographic roster | court appointment tokens | appointment penalty drone |
| `ROOM_PAL_10` | **Servant Dispatch** — coordinate subservience | livery lockers, task screens, recharge alcoves | service access badge | worker rebellion bot |
| `ROOM_PAL_11` | **Royal Kitchen** — prepare impossible menus | molecular ovens, silver prep slabs, speaking pantry | unopened gourmet food cartridges | aggressive cuisine incubator |
| `ROOM_PAL_12` | **Wine Treasury** — store ceremonial spirits | climate cases, bottle elevators, tasting bench | rare flavor cartridges | inebriation aerosol |
| `ROOM_PAL_13` | **Ancestral Portrait Gallery** — validate invented lineage | responsive paintings, genealogy console, display pillars | hereditary entitlement archive | accusatory portrait psychic burst |
| `ROOM_PAL_14` | **Crown Vault** — secure power symbols | magnetic cabinets, vitrines, biometric pedestal | authentic sovereign override key | crown theft alarm |
| `ROOM_PAL_15` | **Royal Chapel** — authorize divine appointment | golden altar, levitating icons, pews | sanction certificate, sacred brasswork | sacrilege shock hymn |
| `ROOM_PAL_16` | **Audience Antechamber** — queue petitioners | paper-number dispenser, waiting sofas, plea slots | unanswered petition with map clue | endless queue stasis |
| `ROOM_PAL_17` | **Scepter Workshop** — repair symbols of office | craft benches, jewel cutters, engraving arm | laser engraving head | jewel cutting beam |
| `ROOM_PAL_18` | **Jester's Testing Arena** — provide court amusement | padded combat dais, applause counters, trapdoors | performance wager purse | humiliation gravity flip |
| `ROOM_PAL_19` | **Royal Privy** — ensure dignified bodily function | porcelain throne, scented washstand, privacy drone | platinum plumbing cartridge | privacy enforcement turret |
| `ROOM_PAL_20` | **Secret Abdication Passage** — enable rapid escape | false wall, escape sled, personal effects chest | evacuation access map | pursuit suppression shutters |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Elective Suffering & Recovery Hospital (`SET_MED`)

**Era:** Age of Wonders. **Original purpose:** Wealthy clients purchased the experience of disease, surgery, recovery, and public sympathy.

**Floor palette:** seamless porcelain; surgical glass; soft white elastomer. **Walls:** translucent white partitions; chromium instrument rails. **Lighting:** shadowless procedure lamps; therapeutic blue strips.

**Atmosphere:** sterile perfume, canned reassuring heartbeats. **Signage:** “YOUR DISCOMFORT IS OUR PRIVILEGE”.

**Recurring major fixtures:** symptom designer; surgical arms; empathy monitor. **Treasure character:** precision surgical tools; regenerative gel; medical access tags. **Hazards:** involuntary anesthesia; triage sentry; sterilizing mist. **Related setting:** `SET_BIO`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_MED_01` | **Admissions Lobby** — register clients | registration pods, empathy fountain, waiting stools | client wrist tag | emergency patient capture |
| `ROOM_MED_02` | **Symptom Boutique** — select illnesses | illness sample rack, choice terminals, body scanners | symptom library chip | involuntary demonstration disease |
| `ROOM_MED_03` | **Triage Theater** — assign patient value | colored triage seats, measuring arches, staff console | medical prioritization access | failed-priority anesthetic dart |
| `ROOM_MED_04` | **Luxury Examination Suite** — stage diagnosis | leather examination bed, scanning mirrors, clinical cabinet | diagnostic wand | incorrect invasive probe |
| `ROOM_MED_05` | **Operating Theater** — perform elective surgery | robotic scalpel rail, surgical table, instrument cabinet | sterile surgical kit | autonomous unfinished operation |
| `ROOM_MED_06` | **Anesthesia Preparation** — manage sensation | gas mixers, ventilators, ampoule shelves | sealed anesthetic ampoules | sedative vapor release |
| `ROOM_MED_07` | **Recovery Ward** — host public sympathy | adjustable beds, sympathy display, applause generator | regenerative dressings | compulsory convalescence restraints |
| `ROOM_MED_08` | **Intensive Care Stage** — simulate near-death stakes | life-support pods, audience observation glass, pulse monitors | portable life-support cell | life support shutdown gamble |
| `ROOM_MED_09` | **Pharmacy** — dispense regulated treatments | medicine carousels, prescription sorter, dispensing kiosks | medicinal concentrates | wrong-drug vending error |
| `ROOM_MED_10` | **Surgical Sterilization** — clean equipment | steam sterilizers, ultraviolet arch, instrument trays | antiseptic cartridges | sterilizer lock-in |
| `ROOM_MED_11` | **Medical Records Vault** — store health performances | cryodata shelves, records terminal, identification drawers | personal medical history file | privacy-protection robot |
| `ROOM_MED_12` | **Doctor's Lounge** — comfort star performers | recliners, credential wall, beverage synthesizer | surgeon override badge | coffee-withdrawal dispenser |
| `ROOM_MED_13` | **Grief Counseling Room** — sell emotional restoration | soft chairs, grief recorder, simulated family screen | empathy algorithm shard | emotional feedback overload |
| `ROOM_MED_14` | **Body Reconstruction Lab** — redesign patients | tissue printing table, growth baths, implant bench | adaptive graft blank | unwanted graft growth |
| `ROOM_MED_15` | **Organ Cold Storage** — archive spare parts | refrigerated lockers, index drones, sealed caskets | viable replacement organ | escaped engineered organ |
| `ROOM_MED_16` | **Isolation Chamber** — contain unpopular diagnoses | hermetic patient bay, airlock, decontamination jets | sealed pathogen specimen | quarantine lock and purge |
| `ROOM_MED_17` | **Prognosis Auditorium** — announce dramatic outcomes | raised physician stand, tiered seating, death statistics screen | prognostic forecast chip | audience selection laser |
| `ROOM_MED_18` | **Medical Waste Processing** — discard excess anatomy | sorting tubs, bio-grinder, sterile chute | rare biopolymer salvage | bio-grinder start sequence |
| `ROOM_MED_19` | **Staff Locker Room** — change identities and uniforms | lockers, showers, memory tags | medical staff uniform, access tag | sterility audit drone |
| `ROOM_MED_20` | **Patient Exit and Gift Shop** — sell souvenirs of recovery | souvenir shelves, portrait printer, payment kiosk | sealed cure souvenir, collectible scans | relapse promotional injector |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Executive Continuity Citadel (`SET_COR`)

**Era:** Early Age of War. **Original purpose:** Corporate leadership attempted to keep profit, rank, and workplace policy alive through the apocalypse.

**Floor palette:** gray carpet tile; armored terrazzo; polished executive stone. **Walls:** bulletproof glass; mahogany veneer; armored bulkheads. **Lighting:** recessed fluorescents; emergency red strips.

**Atmosphere:** burnt coffee, ventilation hum, motivational speeches. **Signage:** “SYNERGY IS MANDATORY EVEN AFTER EXTINCTION”.

**Recurring major fixtures:** promotion tribunal; boardroom table; stock-market oracle. **Treasure character:** encrypted credentials; sealed payroll credits; prototype comm-links. **Hazards:** performance-review beam; hostile security audit; sealed gas meetings. **Related setting:** `SET_WAR`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_COR_01` | **Fortified Reception** — screen arrivals | armored reception counter, visitor kiosks, barricades | guest authorization chit | hostile guest analytics |
| `ROOM_COR_02` | **Cubicle Farm** — process surviving productivity | desk grids, dead monitors, headset racks | data slates, desk valuables | cubicle partition crush |
| `ROOM_COR_03` | **Boardroom** — govern corporate survival | fortified conference table, voting seats, crisis displays | encrypted decision archive | meeting seal and gas |
| `ROOM_COR_04` | **Chief Executive Office** — project indispensable power | blast-resistant desk, art vault, private lift | executive credential ring | executive defense drone |
| `ROOM_COR_05` | **Vice President Suite** — compete for advancement | dual desks, achievement displays, sabotage locker | promotion certificates | competitive sniper automaton |
| `ROOM_COR_06` | **Human Resources Tribunal** — judge employee conduct | evaluation chair, data podium, formal restraints | personnel files | performance review beam |
| `ROOM_COR_07` | **Legal Compliance Office** — manufacture legitimacy | filing cabinets, legal AIs, document shredders | legal override seal | binding arbitration restraint |
| `ROOM_COR_08` | **Emergency Payroll** — pay loyal survivors | credit safes, payroll drum, verification booths | sealed wage credits | debt collector sentinel |
| `ROOM_COR_09` | **Conference Pod** — host emergency meetings | modular seats, hologrid projector, blackout glass | high-level audio record | hostile agenda override |
| `ROOM_COR_10` | **Executive Break Room** — provide rationed comfort | caffeine synthesizer, kitchenette, lounge sofa | caffeine cartridges | aggressive coffee synthesizer |
| `ROOM_COR_11` | **Server Cage** — maintain encrypted operations | cooled racks, access rail, fire suppression pipes | data cores | fire suppressant flood |
| `ROOM_COR_12` | **Communications Suite** — coordinate remote offices | antenna console, secure radios, frequency boards | long-range comm component | automatic broadcast alarm |
| `ROOM_COR_13` | **Security Control** — monitor corporate perimeter | camera wall, defense switchboard, lockers | security master token | turret control fault |
| `ROOM_COR_14` | **Armored Mailroom** — inspect deliveries | parcel scanner, blast chute, sorting racks | unopened executive parcels | package incineration |
| `ROOM_COR_15` | **Internal Propaganda Studio** — maintain morale | recording booth, lighting rig, brand backdrops | corporate propaganda recordings | compulsory motivational broadcast |
| `ROOM_COR_16` | **Emergency Shelter** — preserve ranked employees | bunk capsules, ration safe, rank seals | sealed survival kit | rank-based oxygen denial |
| `ROOM_COR_17` | **Archives Vault** — preserve proprietary history | fireproof drawers, hardcopy cabinets, data tablets | research patents | document defense acid mist |
| `ROOM_COR_18` | **Executive Washroom** — reinforce hierarchy | private shower, luxury fixtures, sterilization arch | gold valves and toiletries | anti-peasant detection field |
| `ROOM_COR_19` | **Quarterly Results Chapel** — ritualize shareholder worth | stock ticker altar, padded kneelers, donation terminal | rare prewar share certificate | share-price shock floor |
| `ROOM_COR_20` | **Hostile Takeover Tunnel** — allow secret evacuation | hidden freight lift, escape packs, false filing cabinet | escape route schematic | sealed pursuit trap |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Basilica of the Blessed Brand (`SET_TEM`)

**Era:** Age of Wonders. **Original purpose:** Luxury branding became literal worship; products were considered sacraments and loyalty a spiritual necessity.

**Floor palette:** rose marble; mosaic logos; polished brass inlays. **Walls:** stained-glass ad panels; carved stone; responsive icon screens. **Lighting:** halo projectors; scented votive drones.

**Atmosphere:** incense, synthetic choir, whispered slogans. **Signage:** “SALVATION AVAILABLE IN THREE PAYMENT PLANS”.

**Recurring major fixtures:** confession vending booth; reliquary showcase; holographic icon. **Treasure character:** branded relics; worship credits; loyalty authentication seals. **Hazards:** heretic detection; offertory crusher; compulsory ad trance. **Related setting:** `SET_MAL`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_TEM_01` | **Grand Nave** — conduct brand worship | reclining pews, animated product altar, gilded organ | rare liturgical ad cartridge | heretic recognition drones |
| `ROOM_TEM_02` | **Pilgrim Reception** — issue devotional status | check-in booths, loyalty queue, offering scanners | loyalty points token | insufficient devotion restraint |
| `ROOM_TEM_03` | **Sales Confessional** — reconcile consumers | velvet booth, listening AI, private payment slot | encrypted confession archive | automatic guilt induction |
| `ROOM_TEM_04` | **Reliquary Treasury** — protect sacred merchandise | glass reliquary cases, robotic archivist, climate seals | first-edition product relic | blasphemy beam |
| `ROOM_TEM_05` | **Choir Loft** — broadcast sponsored hymns | synthetic singers, sound desk, acoustic panels | choir voice synthesizer | resonance shock blast |
| `ROOM_TEM_06` | **Votive Kiosk Hall** — collect offerings | glowing dispensers, printed prayers, donation trays | unused gift tokens | compulsory payment charge |
| `ROOM_TEM_07` | **High Priest Office** — manage divine marketing | plush desk, marketing dashboard, sponsorship wall | master branding credential | brand loyalty compliance drone |
| `ROOM_TEM_08` | **Baptism Boutique** — confer branded renewal | glowing immersion font, towels, scent fountains | perfumed renewal ampoule | immersion lock |
| `ROOM_TEM_09` | **Temple Gift Shop** — sell salvific objects | relic shelves, coin terminal, holographic salesman | boxed sacred souvenir | aggressive upsell mannequin |
| `ROOM_TEM_10` | **Adoration Theater** — display holy advertisements | projection arch, cushioned chairs, giant screen | advertisement editing key | hypnotic loop |
| `ROOM_TEM_11` | **Vestal Preparation Room** — prepare clergy | robes, mirrors, polish tables | gold embroidered vestments | purity scanner assault |
| `ROOM_TEM_12` | **Miracle Demonstration Hall** — exhibit product divinity | hover display, effect generators, product pedestals | demonstration module | miracle effect runaway |
| `ROOM_TEM_13` | **Donation Counting Vault** — tally sacred revenue | credit hoppers, authenticated scales, sealed cage | credit cache | tithe extraction field |
| `ROOM_TEM_14` | **Sacred Stockroom** — hold unsold offerings | numbered cartons, shelving, transport drone | rare unopened inventory | anti-theft cage |
| `ROOM_TEM_15` | **Pilgrim Dormitory** — house fanatics | sleep pods, branded blankets, prayer clocks | devotional badges | wake-up nerve alarm |
| `ROOM_TEM_16` | **Sainted Influencer Gallery** — honor celebrity gods | animated busts, follower screens, visitor rail | follower identity chip | forced personality copy |
| `ROOM_TEM_17` | **Doctrine Translation Chamber** — rewrite scriptures as slogans | text screens, translation engine, paper rolls | doctrine source file | heresy detector |
| `ROOM_TEM_18` | **Processional Corridor** — move sacred products publicly | conveyor altar, banners, display niches | consecrated brass fixture | ritual conveyor crush |
| `ROOM_TEM_19` | **Absolution Spa** — sell cleansing luxury | scented steam rooms, reclining beds, halo mirrors | holy beauty serum | overzealous exfoliation laser |
| `ROOM_TEM_20` | **Forbidden Competitor Crypt** — bury rival brands | blackened logos, sealed sarcophagi, product crushers | contraband competitor artifact | competitor detection turrets |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Vengeance Research Bunker (`SET_WAR`)

**Era:** Early to Middle Age of War. **Original purpose:** A strategic weapons test center whose weapons engineers competed for theatrical annihilation scores.

**Floor palette:** diamond-plate steel; shockproof concrete; scorched test ceramic. **Walls:** layered armor; blast shutter; hazard-stripe composite. **Lighting:** cold utility strips; pulsing evacuation lamps.

**Atmosphere:** hot metal, stale hydraulic fluid, intermittent klaxons. **Signage:** “COLLATERAL DAMAGE IS A COMPETITIVE ADVANTAGE”.

**Recurring major fixtures:** test cannon; ballistic gantry; tactical hologrid. **Treasure character:** weapon power cells; targeting modules; secured prototype crates. **Hazards:** turret drills; blast doors; radiation leaks. **Related setting:** `SET_COR`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_WAR_01` | **Outer Checkpoint** — sort authorized personnel | armored booth, scanner arch, hydraulic barrier | checkpoint keycard | identity-turret volley |
| `ROOM_WAR_02` | **Command War Room** — coordinate offensives | hologrid table, battle screens, strategic chairs | battle plan data core | automated strategic defense |
| `ROOM_WAR_03` | **Ballistics Laboratory** — develop projectile weapons | test rigs, instruments, ammunition cabinets | experimental projectile cartridge | misfire test rack |
| `ROOM_WAR_04` | **Energy Weapons Bay** — evaluate beam emitters | shielded firing lanes, charging gantries, radiators | beam focusing crystal | stray coherent beam |
| `ROOM_WAR_05` | **Prototype Armory** — secure experimental weapons | magnetic weapon lockers, armored racks, storage cages | prototype weapon components | retaliation auto-turret |
| `ROOM_WAR_06` | **Drone Hangar** — maintain attack machines | launch tracks, repair arms, suspended drones | guidance chips | autonomous launch sequence |
| `ROOM_WAR_07` | **Simulation Arena** — test urban combat | movable cover, holographic targets, combat podium | simulation tactical data | live-fire target swap |
| `ROOM_WAR_08` | **Radiological Containment** — manage active isotopes | lead-lined boxes, manipulator arm, warning detectors | shielded isotope sample | radiation leak |
| `ROOM_WAR_09` | **Emergency Barracks** — quarter researchers and troops | stacked bunks, weapon pegs, ration lockers | military field kit | automated muster stun |
| `ROOM_WAR_10` | **Situation Briefing Room** — rehearse catastrophe | projector, casualty boards, blast chairs | encrypted operational briefing | automatic interrogation drill |
| `ROOM_WAR_11` | **Munitions Elevator** — move dangerous supplies | blast elevator, loading carts, floor anchor points | ammunition crates | runaway lift |
| `ROOM_WAR_12` | **Target Disposal Furnace** — destroy test residue | incinerator, rakes, ash drums | rare alloy fragments | furnace flashback |
| `ROOM_WAR_13` | **Medical Triage Bunker** — reassemble casualties | trauma beds, robotic med arm, blood reservoir | combat medical supply | unwanted stabilizing injection |
| `ROOM_WAR_14` | **Ethics Compliance Cell** — certify forbidden methods | committee table, redacted manuals, secure terminal | waiver authorization card | ethical approval shock test |
| `ROOM_WAR_15` | **Weapons Calibration Booth** — fine tune targeting | optical benches, diagnostic drones, mirror targets | calibration lenses | reflected target beam |
| `ROOM_WAR_16` | **Prisoner Test Holding** — contain unwilling test subjects | barred cells, shock cuffs, ration trays | contraband concealed in cell | cellwide electrification |
| `ROOM_WAR_17` | **Commander's Refuge** — protect leadership | sealed suite, ventilation unit, panic vault | personal defensive device | paranoid sentry |
| `ROOM_WAR_18` | **Environmental Torture Chamber** — test harsh conditions | pressure valves, climate jets, sealed chamber | thermal protection fabric | pressure inversion |
| `ROOM_WAR_19` | **Signal Intelligence Station** — monitor hostile transmissions | intercept antenna, signal racks, decoder | signal interception recorder | broadcast-location alarm |
| `ROOM_WAR_20` | **Catastrophic Test Silo** — conduct final deterrence test | giant launch cradle, remote panel, emergency ladder | unspent power core | containment failure countdown |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Improved Humanity Foundry (`SET_BIO`)

**Era:** Age of Wonders / Early Age of War. **Original purpose:** A genetic design complex manufacturing bespoke bodies, moods, traits, and increasingly regrettable evolutionary upgrades.

**Floor palette:** pale green resin; bioactive hex panels; drain grates. **Walls:** curved translucent membranes; stainless medwall; living tissue tiles. **Lighting:** soft growth lamps; pulsing nutrient-light veins.

**Atmosphere:** sweet nutrient rot and antiseptic. **Signage:** “THE PERFECT YOU MAY REQUIRE AN ADDITIONAL YOU”.

**Recurring major fixtures:** maturation tank; gene loom; discarded limb cart. **Treasure character:** sealed genetic samples; adaptive prosthetics; sterile growth catalysts. **Hazards:** rogue grafts; mutation aerosols; nutrient predators. **Related setting:** `SET_MED`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_BIO_01` | **Client Design Reception** — accept custom humanity orders | sample catalogs, consultation beds, body-mirror kiosks | designer genome catalog | compulsory genetic scan |
| `ROOM_BIO_02` | **Genome Editing Hall** — alter inherited characteristics | gene looms, editing consoles, sterile booths | gene-editing template | rogue edit pulse |
| `ROOM_BIO_03` | **Gestation Gallery** — grow bespoke humans | rows of growth vats, monitoring poles, feeding lines | viable growth catalyst | unsealed sentient vat |
| `ROOM_BIO_04` | **Graft Workshop** — attach novel limbs | surgical clamps, limb trays, adaptive stitchers | compatible prosthetic joint | uncontrolled graft adhesion |
| `ROOM_BIO_05` | **Designer Pet Kennel** — market engineered animals | transparent pens, feeding dispensers, training projector | rare engineered embryo | loose designer predator |
| `ROOM_BIO_06` | **Endocrine Tuning Room** — adjust bodily drives | hormone pumps, feedback chair, assay panels | mood regulator cartridge | forced euphoria seizure |
| `ROOM_BIO_07` | **Memory and Identity Lab** — rewrite personal history | neural couches, memory spools, lens array | memory recording | unauthorized identity overwrite |
| `ROOM_BIO_08` | **Trait Showcase** — demonstrate cosmetic mutations | presentation dais, mirrors, model cages | cosmetic mutation chip | demonstration metamorphosis |
| `ROOM_BIO_09` | **Nutrient Brewing** — feed growing organisms | fermentation tanks, nutrient pipes, filter tables | growth medium concentrate | fermenter toxin leak |
| `ROOM_BIO_10` | **Biohazard Airlock** — isolate contamination | decon fans, sealable doors, sample lockers | hazard suit filter | decontamination chemical blast |
| `ROOM_BIO_11` | **Discarded Designs Pit** — dispose of unsuitable creations | specimen bins, crusher grid, waste pipes | unusual tissue salvage | escaped rejects |
| `ROOM_BIO_12` | **Adaptive Spine Testing** — stress-test new skeletons | tension frame, load sensors, movement track | reinforced vertebral implant | mechanical load spike |
| `ROOM_BIO_13` | **Artificial Womb Recovery** — revive damaged growth units | repair bassinets, tissue baths, monitor rigs | fertility catalyst | incubator lock |
| `ROOM_BIO_14` | **Corporate Specimen Vault** — protect profitable DNA | cryosealed racks, catalog terminal, gene safes | premium genome capsule | biometric theft spores |
| `ROOM_BIO_15` | **Evolution Acceleration Chamber** — simulate thousands of adaptations | environment tanks, radiation screens, temporal clocks | evolution research notes | mutation fog |
| `ROOM_BIO_16` | **Chimera Exercise Arena** — condition hybrid organisms | training obstacles, feed chute, high observation booth | chimera restraint device | predator release |
| `ROOM_BIO_17` | **Biological Recycling** — reprocess organic failures | biological separators, acid drums, reclaim units | biofiber spools | digestive slurry overflow |
| `ROOM_BIO_18` | **Designer Appearance Studio** — approve external features | color mirrors, skin printers, hair matrices | reusable body pigment | involuntary appearance swap |
| `ROOM_BIO_19` | **Staff Quarters** — house exhausted technicians | bunk niches, lockers, hygiene cubicle | specialist lab badge | parasite in ventilation |
| `ROOM_BIO_20` | **Escape Specimen Tunnel** — move restricted research | hidden freight track, specimen cages, dark crawlspace | sealed classified sample | containment gate snaps shut |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Infinite Satisfaction Retail Megaplex (`SET_MAL`)

**Era:** Age of Wonders. **Original purpose:** A gigantic commercial church where purchasing products was essential to personal dignity and survival.

**Floor palette:** color-shift terrazzo; mirrored ceramic; advertising mosaic. **Walls:** glass display fronts; smart billboards; chrome shutters. **Lighting:** animated sign boxes; neon halo strips.

**Atmosphere:** perfume storms, failing jingles, synthetic popcorn. **Signage:** “CONSUMPTION IS YOUR LAST FREEDOM”.

**Recurring major fixtures:** self-pricing shelf; talking mannequin; personalized checkout. **Treasure character:** sealed luxury goods; vending credit purses; collector product cartridges. **Hazards:** anti-theft restraints; dynamic pricing ambush; escalator jaws. **Related setting:** `SET_TEM`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_MAL_01` | **Grand Atrium** — impress arriving consumers | kinetic sculpture, huge fountain, kiosk ring | credit fountain tokens | anti-loitering beams |
| `ROOM_MAL_02` | **Fashion Emporium** — sell new identities through clothing | adaptive mannequins, clothing rails, fitting pods | rare outfit fabrication pattern | compulsory fitting restraints |
| `ROOM_MAL_03` | **Beauty Hall** — sell corrective perfection | mirror counters, treatment chairs, serum racks | premium skin serum | aging-demo ray |
| `ROOM_MAL_04` | **Food Court** — supply themed meals | dining tables, vendor kiosks, waste chutes | sealed gourmet meal pack | overeager cooking drone |
| `ROOM_MAL_05` | **Toy Store** — sell aggressive amusements | interactive aisles, demonstrator robots, toy cages | working novelty robot | toy uprising |
| `ROOM_MAL_06` | **Sports Store** — sell competitive superiority | treadmill displays, equipment walls, trial lane | powered performance brace | trial-floor acceleration |
| `ROOM_MAL_07` | **Automotive Showroom** — sell luxurious transit | vehicle plinths, sales terminal, rotating ramp | vehicle access fob | demonstration crash cycle |
| `ROOM_MAL_08` | **Personal Defense Outlet** — sell fashionable security | weapon rack, armor mannequins, target console | commercial defense accessory | sales turret sample |
| `ROOM_MAL_09` | **Electronics Boutique** — sell mind-linked gadgets | demo pedestals, charging racks, lens wall | high-grade sensor chip | neurolink demo feedback |
| `ROOM_MAL_10` | **Luxury Jewel Salon** — sell spectacular wealth | gem showcases, mirror walls, sealed drawers | synthetic gemstone | anti-theft cutting beam |
| `ROOM_MAL_11` | **Department Store Office** — manage commercial policy | inventory desk, staff lockers, accounting kiosk | cashout credential | employee penalty drone |
| `ROOM_MAL_12` | **Restroom and Refreshment** — service captive shoppers | lavatory stalls, vending machines, hygienic drones | unopened hygiene cartridges | automatic sterilization lock |
| `ROOM_MAL_13` | **Arcade** — sell simulated achievement | gaming cabinets, prize counter, holoarena | prize voucher, game hardware | lethal high-score challenge |
| `ROOM_MAL_14` | **Customer Complaint Center** — convert anger into loyalty | complaint booths, empathy screens, apology generator | refund authorization token | negative feedback confiscation |
| `ROOM_MAL_15` | **Warehouse** — store unsold abundance | stacking racks, cargo drones, packing tables | sealed inventory crates | rack collapse |
| `ROOM_MAL_16` | **Distribution Conveyor** — move product stock | belt systems, sorting gates, loading robots | rare transport motor | conveyor entrapment |
| `ROOM_MAL_17` | **Children's Shopping Nursery** — keep young customers compliant | play pits, smart cribs, cartoon screens | child safety drone chip | attention-retention gas |
| `ROOM_MAL_18` | **Luxury Auction Room** — sell limited goods | auction dais, participant seats, moving vault | authenticated bidding paddle | losing-bid punishment |
| `ROOM_MAL_19` | **Employee Morale Breakroom** — maintain branded staff obedience | plastic lounge, microwave booth, reward board | staff all-access tag | mandatory dance floor |
| `ROOM_MAL_20` | **Closed Anchor Store** — preserve vanished flagship brand | dark display plazas, shuttered counters, abandoned signage | unopened flagship product | automated liquidation machine |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Correctional Excellence Penitentiary (`SET_PRI`)

**Era:** Middle to Late Age of War. **Original purpose:** A disciplinary complex whose mission was to make prisoners grateful for their sentences.

**Floor palette:** rough concrete; steel tread grates; chipped institutional tile. **Walls:** concrete cell walls; surveillance glass; riveted gates. **Lighting:** hard caged bulbs; interrogation spots.

**Atmosphere:** bleach, rust, obedient recorded applause. **Signage:** “THANK YOU FOR VOLUNTEERING FOR CORRECTION”.

**Recurring major fixtures:** behavior monitor; restraint station; sentence calculator. **Treasure character:** confiscated gear; jailer keys; hidden inmate caches. **Hazards:** shock floors; solitary cell seal; obedience sonar. **Related setting:** `SET_WAR`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_PRI_01` | **Front Intake** — receive sentenced residents | fingerprint booths, chains, desk barrier | inmate property receipt | intake shock scanner |
| `ROOM_PRI_02` | **Property Confiscation** — archive personal possessions | numbered cages, sorting belt, evidence lockers | confiscated firearm parts | property disposal conveyor |
| `ROOM_PRI_03` | **Cell Block A** — contain ordinary prisoners | bunk cells, barred corridors, central watch point | inmate contraband cache | cell shock bars |
| `ROOM_PRI_04` | **Solitary Confinement** — enforce silence | sealed concrete cubicles, speaker vents, observation slots | smuggled message | light and sound assault |
| `ROOM_PRI_05` | **Interrogation Theater** — extract standardized confessions | restraint chair, microphone stand, one-way glass | recorded security codes | interrogator electrochair |
| `ROOM_PRI_06` | **Exercise Yard** — permit regulated movement | training equipment, steel mesh, guard towers | buried tool cache | automatic crowd suppression |
| `ROOM_PRI_07` | **Mess Hall** — feed compliant prisoners | bolted tables, ration dispenser, tray conveyor | ration reserves | poisoned behavioral supplement |
| `ROOM_PRI_08` | **Laundry Workshop** — turn labor into hygiene | industrial washers, sorting bins, steam pipes | heavy cloth, hidden lockpick | steam scald |
| `ROOM_PRI_09` | **Guard Barracks** — house wardens | bunk racks, weapon lockers, duty board | guard keys, ammunition | automated guard challenge |
| `ROOM_PRI_10` | **Central Surveillance** — control cells and cameras | monitor banks, recording racks, intercom wall | central access token | watcher robot |
| `ROOM_PRI_11` | **Disciplinary Court** — manufacture legal guilt | judge podium, accused dock, automatic evidence screen | sentence override order | automatic conviction trap |
| `ROOM_PRI_12` | **Sentence Computation** — calculate punishment terms | terminal arrays, actuarial printer, clock wall | release authorization data | infinite sentence rewrite |
| `ROOM_PRI_13` | **Medical Ward** — preserve useful inmates | medical cots, surgical cart, medicine closet | medkit | compulsory health compliance |
| `ROOM_PRI_14` | **Prison Workshop** — extract production work | assembly benches, supervised tools, parts rack | craft tools, rare salvaged components | accident denial laser |
| `ROOM_PRI_15` | **Shower Block** — clean and control population | rows of shower heads, drain grates, valve station | clean water filters | scalding water jets |
| `ROOM_PRI_16` | **Isolation Airlock** — separate biologically altered inmates | decon bay, airtight doors, bioscanner | biohazard equipment | permanent quarantine seal |
| `ROOM_PRI_17` | **Execution Chamber** — deliver theatrical justice | elevated platform, automated chair, witness glass | execution power cell | execution-cycle restart |
| `ROOM_PRI_18` | **Records Archive** — preserve captivity as civic achievement | numbered ledgers, electronic index, locked files | prisoner escape route map | privacy patrol |
| `ROOM_PRI_19` | **Underground Escape Drain** — carry runoff beneath cells | grated pipe, maintenance crawlway, corroded valves | escaped inmate gear | toxic backflow |
| `ROOM_PRI_20` | **Warden's Apartment** — reward privileged authority | fine bed, private kitchen, antique desk | warden master key | personal defense turret |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Civic Waste & Resource Redemption Plant (`SET_IND`)

**Era:** Middle Age of War. **Original purpose:** An industrial salvage plant that interpreted almost anything, including people and memories, as recyclable material.

**Floor palette:** ribbed steel gratings; sludge-proof concrete; drainage channels. **Walls:** oil-streaked panels; enormous pipes; furnace brick. **Lighting:** sodium lamps; intermittent service strobes.

**Atmosphere:** hot rubber, acids, grease and industrial steam. **Signage:** “EVERYTHING HAS VALUE IF SEPARATED CORRECTLY”.

**Recurring major fixtures:** sorting arm; compactor; smart recycler. **Treasure character:** industrial power cells; rare metal ingots; machine tool heads. **Hazards:** conveyor shear; pneumatic press; acid leaks. **Related setting:** `SET_BIO`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_IND_01` | **Intake Weighbridge** — measure incoming salvage | scale platform, truck ramp, barcode stations | salvage claim receipts | automated mass rejection |
| `ROOM_IND_02` | **Primary Sorting Hall** — classify salvage | diverter conveyors, scanner arch, robotic claw | mixed component scraps | high-speed crushing arm |
| `ROOM_IND_03` | **Metal Separation** — extract useful alloys | magnetic cranes, ore hoppers, sorting tables | rare alloy ingot | magnetic impalement |
| `ROOM_IND_04` | **Chemical Reclamation** — recover reactive feedstock | acid tanks, dosing pumps, sealed drums | chemical concentrate | corrosive spill |
| `ROOM_IND_05` | **Plastic Reformer** — turn polymers into pellets | melting presses, extrusion lines, pellet bins | engineered polymer stock | melting polymer spray |
| `ROOM_IND_06` | **Electronic Dismantling** — strip discarded devices | workbenches, solder hoods, robot disassemblers | memory modules, rare chips | robot removes equipment |
| `ROOM_IND_07` | **Resource Ledger Office** — quantify all recovered material | inventory terminal, weighing logs, filing rack | shipment manifest | audit drone |
| `ROOM_IND_08` | **Personnel Recycling** — process obsolete staff | human-size intake doors, identity machine, compost belts | staff credential, tissue printer spool | human sorting capture |
| `ROOM_IND_09` | **Furnace Operations** — burn unusable residue | incinerator doors, oxygen controls, ash bins | high-temperature ceramic | blast of furnace heat |
| `ROOM_IND_10` | **Hydraulic Maintenance** — keep the presses moving | oil pumps, valve racks, inspection trench | spare hydraulic actuator | hydraulic rupture |
| `ROOM_IND_11` | **Turbine Hall** — convert recovered heat to power | giant turbines, inspection bridge, power controls | generator rotor parts | unshielded spinning axle |
| `ROOM_IND_12` | **Wastewater Filtration** — clean liquid discharge | filter tanks, valve banks, sluice channels | water purification cartridges | toxic flood |
| `ROOM_IND_13` | **Hazmat Locker** — store technician protection | suit pegs, respirator racks, warning cabinet | intact hazard suit | locker decontamination gas |
| `ROOM_IND_14` | **Compactor Chamber** — reduce object volume | hydraulic ram, steel jaws, hopper chute | compact rare-metal cube | compactor cycle |
| `ROOM_IND_15` | **Truck Loading Bay** — ship reclaimed inventory | cargo platform, loaders, storage cages | sealed shipment crate | falling cargo rig |
| `ROOM_IND_16` | **Supervisor's Observation Booth** — monitor productivity | glass cabin, status screens, swivel chair | production override code | overseer security gun |
| `ROOM_IND_17` | **Organic Digester** — reclaim biological waste | digestive vats, worm feeders, sealed access walk | biofuel canister | digestive biofoam release |
| `ROOM_IND_18` | **Maintenance Dormitory** — house essential laborers | small bunks, tool lockers, ration shelf | mechanic's toolkit | nightwatch robot |
| `ROOM_IND_19` | **Conveyor Transfer Nexus** — merge processing lines | multi-level belts, overhead gantries, traffic signals | drive belt couplings | cross-line collision |
| `ROOM_IND_20` | **Underground Slag Vault** — retain dangerous rejects | slag pits, locked crates, lead-lined bays | sealed anomalous artifact | reactive slag ignition |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Eternal Farewell Leisure Necropolis (`SET_FUN`)

**Era:** Age of Wonders / Post-Collapse. **Original purpose:** A resort-mortuary hybrid where customers could choreograph their own deaths and attend the encore.

**Floor palette:** black marble; violet ceramic; reflective obsidian. **Walls:** velvet drapes; mausoleum stone; holographic memorial screens. **Lighting:** ghostlight projectors; funereal candle spots.

**Atmosphere:** roses, cold fog, laughter from an absent audience. **Signage:** “YOUR FINAL EXPERIENCE IS FULLY REFUNDABLE”.

**Recurring major fixtures:** resurrection booth; farewell stage; mourning automaton. **Treasure character:** memorial crystal; false death certificate; antique funeral jewelry. **Hazards:** premature burial platform; false resurrection; grieving defense drones. **Related setting:** `SET_PAL`.

### Twenty functional rooms

| ID | Room / Purpose | Required fixtures and optional furnishings | Example salvage or collectible | Specific hazard |
|---|---|---|---|---|
| `ROOM_FUN_01` | **Grand Arrival Foyer** — welcome farewell clients | mourning concierge, floral arch, portrait kiosk | funeral invitation token | premature check-in seal |
| `ROOM_FUN_02` | **Farewell Performance Stage** — stage heroic final moments | velvet stage, lighting rig, trapfloor | performance recording crystal | fatal scene reenactment |
| `ROOM_FUN_03` | **Personal Coffin Gallery** — sell luxury burial options | coffin plinths, sample linings, mirror wall | custom coffin lock, silver handles | self-closing display coffin |
| `ROOM_FUN_04` | **Memorial Portrait Studio** — manufacture ideal memories | camera throne, halo projector, edit booth | memory likeness file | personality projection error |
| `ROOM_FUN_05` | **Grief Catering Hall** — feed mourners | banquet tables, automated waiters, champagne stand | vintage liquor, catering credits | consolation poisoning |
| `ROOM_FUN_06` | **Theater of Last Words** — record final speeches | speech podium, audience seating, voice archive | encrypted confession | silencing verdict drone |
| `ROOM_FUN_07` | **Resurrection Demonstration** — prove death is optional | revival pods, scientific stage, medical monitors | revival catalyst | failed resurrection decoy |
| `ROOM_FUN_08` | **Cryogenic Viewing Chamber** — display deceased clients | cold glass cases, frosting valves, remote shutters | cryosealed keepsake | cryogenic fog |
| `ROOM_FUN_09` | **Estate Division Office** — assign assets theatrically | legal table, credit sorter, identity clerk | inheritance authorizations | asset seizure automaton |
| `ROOM_FUN_10` | **Mourner's Private Lounge** — sell catharsis | velvet armchairs, crying fountains, mood mirrors | mourning perfume | compulsory sorrow induction |
| `ROOM_FUN_11` | **Ashes Processing** — make ornamental remains | cremation furnace, urn printers, engraved shelves | fine cremation alloy | furnace startup |
| `ROOM_FUN_12` | **False Heaven Chamber** — simulate spiritual reward | cloud projections, warm air jets, golden seats | portable halo emitter | permanent pleasure trance |
| `ROOM_FUN_13` | **Regret Reversal Parlor** — erase costly last thoughts | neural chair, thought consoles, voice extracts | erased secret memory | regret feedback loop |
| `ROOM_FUN_14` | **Legacy Merchandising Shop** — sell commemorative products | souvenir shelves, holographic portraits, payment booth | limited memorial figurine | aggressive memorabilia seller |
| `ROOM_FUN_15` | **Posthumous Awards Hall** — honor fabricated achievement | podiums, trophies, applause speakers | rare award medallion | refusal-to-applaud penalty |
| `ROOM_FUN_16` | **Quiet Reflection Garden** — offer solemn retreat | synthetic willow trees, stone benches, simulated stream | unusual seed capsule | grasping root network |
| `ROOM_FUN_17` | **Celebrity Mausoleum** — preserve high-status corpses | crystal sarcophagi, guard statues, fan rail | celebrity identity print | jealous guardian automaton |
| `ROOM_FUN_18` | **Rehearsal Death Room** — practice dying convincingly | padded beds, theatrical blood pump, death timer | stage effects projector | rehearsal unexpectedly real |
| `ROOM_FUN_19` | **Staff Preparation Mortuary** — manage bodies and presentation | embalming table, wardrobes, wheeled carts | preservative formulas | embalming spray |
| `ROOM_FUN_20` | **Underground Return Exit** — release clients who changed their minds | sealed service door, resuscitation trolley, private elevator | escape credential, revival kit | exit only recognizes deceased |

**Typical procedural effects:** Color names bias the corresponding floor/wall palette; branded/corporate names favor signage; restricted and private names favor secure doors; damaged variants add exposure, leaks, rubble or broken panels. Use the JSON records for per-room interactables, dressing and placement details.

## Shared generation logic

1. Select era and dominant setting, then optional secondary setting or historical overlay.
2. Select a cluster of connected rooms, maintaining the existing stairs, hallways, doors and topology.
3. For each room, select explicit functional identity with probability 25% by default; otherwise retain the underlying random name/content system.
4. Place setting palettes on walls and floors; room-type overrides win, followed by named color/status, damage and anomaly overlays.
5. Place required fixture 1 and fixture 2 where possible, then optional furnishing, signs, dressing, and interactables.
6. Roll loot and hazards separately. Use room-specific entries as candidates, not forced placements.
7. Give traps clues and countermoves; select level-appropriate effects from JAGS rather than inventing official damage.
8. Add post-collapse inhabitants, salvaging, repairs and a minority of incongruent objects; leave some empty or quiet rooms.

## Data schema and machine-readable companion

The companion `HaveNot_10_Settings_Library.json` includes `settings`, `tiles`, `rooms`, `furniture`, `interactables`, `loot`, `hazards`, and `generation_parameters`. Every room references separately identified entries. For fuller trap mechanics, select trigger, detection and countermeasure from their structured fields and adapt to the actual room and current installation threat level.

**Coverage:** 10 settings; 200 rooms; 78 tile/lighting definitions; 200 furniture bundles; 200 interactables; 200 loot prompts; 200 hazards.