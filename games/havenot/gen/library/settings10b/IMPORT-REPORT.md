# Import report: Havenot-Settings-Library.json

Made by `node tools/import-content.mjs havenot settings10b` from the source file (untouched) and `companion.json`.

| Section | Records |
| --- | --- |
| settings | 10 |
| tiles | 90 |
| rooms | 200 |
| furniture | 200 |
| interactables | 200 |
| loot | 200 |
| hazards | 200 |
| distinct furniture objects | 109 |

## What it became

**Furniture families** (the drawing each object uses): console 13, screen 11, drum 11, shelf 7, desk 5, pews 5, crate 5, table 4, sign 3, conveyor 3, lamp 3, press 3, bed 3, vat 3, chair 3, locker 3, pipes 3, hatch 3, mirror 2, rail 2, altar 2, tower 2, turbine 2, coffin 1, dais 1, cage 1, bath 1, washroom 1, furnace 1, arch 1, mannequin 1.

**Floor painters:** marble ×3, ceramic ×2, glassfloor ×2, drain, carpet ×5, mosaic, tile ×5, concrete ×2, terrazzo ×2, resin ×2, elastomer, porcelain, grate, stone, plate.

**Wall painters:** drapes ×3, glasswall ×3, screens ×4, steel ×2, portraits ×3, stainedglass, riveted ×2, concretewall, panel ×5, membrane, gilt, shutter, partition, tissue, bulkhead.

**Light fittings:** spot ×5, signbox ×2, candles ×2, panel ×5, beacon ×3, strip ×4, halo ×3, bulb ×4, veins, chandelier.

**Hazard behaviours:** flood 42, shock 5, seal 17, mind 36, identity 10, turret 25, ambush 4, gas 47, heat 14.

**Device kinds:** machine 66, salvage 25, ceremony 18, buff 19, data 25, show 23, credits 15, rest 9.

**Clusters** (derived: the JSON has none; see companion.json `clusters`): living 30, industry 30, reception 20, command 20, ceremony 20, storage 20, passage 20, display 10, office 10, food 10, commerce 10.

**Loot items:** 610 satchel items from 200 loot records.

## Gaps in the source, filled by the companion

The source refers to these and doesn’t define them, or defines them with a placeholder. `companion.json` fills each one; nothing in the source is changed.

### tiles (90)

- `FLOOR_BLACK_MARBLE_VEINED_GOLD`: undefined in the source (shared_libraries has “FLOOR_BLACK MARBLE VEINED GOLD”, with spaces); drawn as floor marble from its name
- `FLOOR_CARNIVAL_CHECKERBOARD`: undefined in the source (shared_libraries has “FLOOR_CARNIVAL CHECKERBOARD”, with spaces); drawn as floor ceramic from its name
- `FLOOR_BLOOD_GLASS`: undefined in the source; drawn as floor glassfloor from its name
- `WALL_VELVET_DRAPED_CRIMSON`: undefined in the source (shared_libraries has “WALL_VELVET DRAPED CRIMSON”, with spaces); drawn as wall drapes from its name
- `WALL_MIRROR_FUNHOUSE_MORTUARY`: undefined in the source; drawn as wall glasswall from its name
- `WALL_LED_SCOREBOARD_MOURNING`: undefined in the source; drawn as wall screens from its name
- `LIGHT_SPOT_THEATRICAL_GOLD`: undefined in the source; drawn as light spot from its name
- `LIGHT_NEON_CARNIVAL_FLICKER`: undefined in the source; drawn as light signbox from its name
- `LIGHT_CANDLE_HOLOGRAM_WEEPING`: undefined in the source; drawn as light candles from its name
- `FLOOR_PASTEL_TILE_CHECKER`: undefined in the source (shared_libraries has “FLOOR_PASTEL TILE CHECKER”, with spaces); drawn as floor ceramic from its name
- `FLOOR_DRAIN_GRATE_CHROME`: undefined in the source; drawn as floor drain from its name
- `FLOOR_LINT_CARPEt_Matted`: undefined in the source; drawn as floor carpet from its name
- … and 78 more like these.

### rooms (22)

- `Grand Entry & Reception`: “Primary Grand Entry & Reception fixture” is a placeholder (in every setting’s Grand Entry & Reception); its fixtures come from the companion: reception desk, ticket booth
- `Central Spectacle Chamber`: “Primary Central Spectacle Chamber fixture” is a placeholder (in every setting’s Central Spectacle Chamber); its fixtures come from the companion: spectacle stage dais, audience seating
- `Private VIP Pod`: “Primary Private VIP Pod fixture” is a placeholder (in every setting’s Private VIP Pod); its fixtures come from the companion: vip lounger bed, private bar counter
- `Control Booth & Director Gallery`: “Primary Control Booth & Director Gallery fixture” is a placeholder (in every setting’s Control Booth & Director Gallery); its fixtures come from the companion: director console, monitor wall screen
- `Costume & Prep Wardrobe`: “Primary Costume & Prep Wardrobe fixture” is a placeholder (in every setting’s Costume & Prep Wardrobe); its fixtures come from the companion: costume wardrobe, prep mirror
- `Maintenance Catwalk & Guts`: “Primary Maintenance Catwalk & Guts fixture” is a placeholder (in every setting’s Maintenance Catwalk & Guts); its fixtures come from the companion: catwalk rail, maintenance pipes
- `Corporate Sponsorship Shrine`: “Primary Corporate Sponsorship Shrine fixture” is a placeholder (in every setting’s Corporate Sponsorship Shrine); its fixtures come from the companion: sponsor altar, sponsor logo banner
- `Waste & Aftermath Chute`: “Primary Waste & Aftermath Chute fixture” is a placeholder (in every setting’s Waste & Aftermath Chute); its fixtures come from the companion: waste chute conveyor, aftermath drums
- `Security & Compliance Nook`: “Primary Security & Compliance Nook fixture” is a placeholder (in every setting’s Security & Compliance Nook); its fixtures come from the companion: security console, compliance scanner arch
- `Executive Office of Bad Ideas`: “Primary Executive Office of Bad Ideas fixture” is a placeholder (in every setting’s Executive Office of Bad Ideas); its fixtures come from the companion: executive desk, idea filing cabinet
- `Waiting Room of Anxious Anticipation`: “Primary Waiting Room of Anxious Anticipation fixture” is a placeholder (in every setting’s Waiting Room of Anxious Anticipation); its fixtures come from the companion: waiting benches, number dispenser kiosk
- `Storage Closet of Forbidden Props`: “Primary Storage Closet of Forbidden Props fixture” is a placeholder (in every setting’s Storage Closet of Forbidden Props); its fixtures come from the companion: prop crates, storage shelves
- `Bathroom of Unnecessary Luxury`: “Primary Bathroom of Unnecessary Luxury fixture” is a placeholder (in every setting’s Bathroom of Unnecessary Luxury); its fixtures come from the companion: luxury bath, gilded toilet stall
- `Kitchen / Fabrication Galley`: “Primary Kitchen / Fabrication Galley fixture” is a placeholder (in every setting’s Kitchen / Fabrication Galley); its fixtures come from the companion: fabrication oven, galley prep table
- `Observation Lounge & Gift Shop`: “Primary Observation Lounge & Gift Shop fixture” is a placeholder (in every setting’s Observation Lounge & Gift Shop); its fixtures come from the companion: gift shop shelves, observation window
- `Collapsed & Flooded Wing`: “Primary Collapsed & Flooded Wing fixture” is a placeholder (in every setting’s Collapsed & Flooded Wing); its fixtures come from the companion: collapsed floor hatch, flood pump
- `Secret Cult Adaptation`: “Primary Secret Cult Adaptation fixture” is a placeholder (in every setting’s Secret Cult Adaptation); its fixtures come from the companion: cult altar, ritual candles lamp
- `Power Core & Heart`: “Primary Power Core & Heart fixture” is a placeholder (in every setting’s Power Core & Heart); its fixtures come from the companion: power core turbine, core control console
- `Archive of Past Clients`: “Primary Archive of Past Clients fixture” is a placeholder (in every setting’s Archive of Past Clients); its fixtures come from the companion: archive shelves, records cabinet
- `Escape Tunnel That Goes Nowhere`: “Primary Escape Tunnel That Goes Nowhere fixture” is a placeholder (in every setting’s Escape Tunnel That Goes Nowhere); its fixtures come from the companion: tunnel hatch, escape ladder tower
- `tiny`: size class not in library 1; companion sizes: [8,30] floor cells
- `monumental`: size class not in library 1; companion sizes: [90,600] floor cells

### traps (10)

- `TRAP_SOMMELIER_JUDGMENT`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_MANDATORY_FUN_TICKET`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_STATIC_CLING_GHOST`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_OVERBOOKED_AFTERLIFE`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_FRIENDLY_FIRE_REMINISCENCE`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_CRINGE_SPRAY`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_EXCOMMUNICATION_COUPON`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_DREAM_TAX_LIEN`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_CONFETTI_CANNON_LETHAL`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion
- `TRAP_RETURN_BIN_TODDLERS`: the source has only a name: no trigger, clues, effect, countermeasure or severity; written in the companion

### dressing (600)

- `DRESS_SET_MARTYRDOM_CARNIVAL_0_0`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_0_1`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_0_2`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_1_0`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_1_1`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_1_2`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_2_0`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_2_1`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_2_2`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_3_0`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_3_1`: undefined in the source; written from the setting’s signage, smells and decay
- `DRESS_SET_MARTYRDOM_CARNIVAL_3_2`: undefined in the source; written from the setting’s signage, smells and decay
- … and 588 more like these.

### key objects (10)

- `KEY_SET_MARTYRDOM_CARNIVAL_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Carnival's applause core”, loot in its Power Core & Heart room
- `KEY_SET_IDENTITY_LAUNDROMAT_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Laundromat's master identity spool”, loot in its Power Core & Heart room
- `KEY_SET_AD_CATHEDRAL_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Cathedral's founding jingle chip”, loot in its Power Core & Heart room
- `KEY_SET_WEAPON_RETIREMENT_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Home's last launch authorization key”, loot in its Power Core & Heart room
- `KEY_SET_PET_ATELIER_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Atelier's master genome archive”, loot in its Power Core & Heart room
- `KEY_SET_AFTERLIFE_RESORT_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Resort's soul ledger core”, loot in its Power Core & Heart room
- `KEY_SET_REPUTATION_RECYCLING_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Plant's master reputation index”, loot in its Power Core & Heart room
- `KEY_SET_HAPPINESS_BUREAU_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Bureau's joy quota core”, loot in its Power Core & Heart room
- `KEY_SET_DREAM_TAX_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Office's dream assessment archive”, loot in its Power Core & Heart room
- `KEY_SET_GOURMET_BUNKER_HEART`: undefined in the source (listed by all 20 of its setting’s rooms); one object, “the Bunker's sealed reservation book”, loot in its Power Core & Heart room

### hazards (10)

- `HAZ_SET_MARTYRDOM_CARNIVAL_DECAY`: undefined in the source; written in the companion from the setting’s decay: “congealed blood spill”
- `HAZ_SET_IDENTITY_LAUNDROMAT_DECAY`: undefined in the source; written in the companion from the setting’s decay: “identity slurry flood”
- `HAZ_SET_AD_CATHEDRAL_DECAY`: undefined in the source; written in the companion from the setting’s decay: “jingle loop broadcast”
- `HAZ_SET_WEAPON_RETIREMENT_DECAY`: undefined in the source; written in the companion from the setting’s decay: “senile sentry turret”
- `HAZ_SET_PET_ATELIER_DECAY`: undefined in the source; written in the companion from the setting’s decay: “cracked growth vat leak”
- `HAZ_SET_AFTERLIFE_RESORT_DECAY`: undefined in the source; written in the companion from the setting’s decay: “cold-burning tiki fire”
- `HAZ_SET_REPUTATION_RECYCLING_DECAY`: undefined in the source; written in the companion from the setting’s decay: “burst cringe pipe spray”
- `HAZ_SET_HAPPINESS_BUREAU_DECAY`: undefined in the source; written in the companion from the setting’s decay: “joy gas leak”
- `HAZ_SET_DREAM_TAX_DECAY`: undefined in the source; written in the companion from the setting’s decay: “escaped nightmare projection”
- `HAZ_SET_GOURMET_BUNKER_DECAY`: undefined in the source; written in the companion from the setting’s decay: “freezer cryogenic leak”

### shared_libraries (4)

- `furniture`: all 20 furniture records have the same placeholder description (“Bizarre HaveNot furniture piece”); names come from their ids
- `treasure`: all 20 treasure records have the same placeholder description (“Salvage, curiosity, or artifact”); names come from their ids
- `interactive`: all 20 interactive records have the same placeholder interaction (“Investigate, hack, bribe, or apologize to it”); each device’s use is written in the companion (device_uses)
- `traps`: all 10 trap records have the same placeholder effect (“Humiliating, transformative, or lethal in bureaucratic way”); their mechanics are written in the companion (traps)

## Problems

- Warning shared_libraries `FLOOR_BLACK MARBLE VEINED GOLD`: an id with spaces; no room uses it (rooms use FLOOR_BLACK_MARBLE_VEINED_GOLD)
- Warning shared_libraries `FLOOR_CARNIVAL CHECKERBOARD`: an id with spaces; no room uses it (rooms use FLOOR_CARNIVAL_CHECKERBOARD)
- Warning shared_libraries `FLOOR_PASTEL TILE CHECKER`: an id with spaces; no room uses it (rooms use FLOOR_PASTEL_TILE_CHECKER)
- Warning shared_libraries `FLOOR_LINOLEUM MILITARY GREEN`: an id with spaces; no room uses it (rooms use FLOOR_LINOLEUM_MILITARY_GREEN)
- Warning shared_libraries `FLOOR_TERRACOTTA RESORT`: an id with spaces; no room uses it
- Warning shared_libraries `FLOOR_CONCRETE SLIME STAINED`: an id with spaces; no room uses it (rooms use FLOOR_CONCRETE_SLIME_STAINED)
- Warning shared_libraries `FLOOR_DARK WOOD PARQUET`: an id with spaces; no room uses it (rooms use FLOOR_DARK_WOOD_PARQUET)
- Warning shared_libraries `FLOOR_BRAIN CARPET GRAY`: an id with spaces; no room uses it
- Warning shared_libraries `WALL_VELVET DRAPED CRIMSON`: an id with spaces; no room uses it (rooms use WALL_VELVET_DRAPED_CRIMSON)
- Warning shared_libraries `WALL_ENAMEL MINT`: an id with spaces; no room uses it (rooms use WALL_ENAMEL_MINT)
- Warning shared_libraries `WALL_BILLBOARD CATHEDRAL GLASS`: an id with spaces; no room uses it (rooms use WALL_BILLBOARD_CATHEDRAL_GLASS)
- Warning shared_libraries `WALL_STUCCO PASTEL`: an id with spaces; no room uses it (rooms use WALL_STUCCO_PASTEL)
- Warning shared_libraries `WALL_TROPICAL MURAL PEELING`: an id with spaces; no room uses it (rooms use WALL_TROPICAL_MURAL_PEELING)
- Warning shared_libraries `WALL_CORRUGATED GOSSIP`: an id with spaces; no room uses it (rooms use WALL_CORRUGATED_GOSSIP)
- Warning shared_libraries `LIGHT_THEATRICAL GOLD SPOT`: an id with spaces; no room uses it
- Warning shared_libraries `LIGHT_FLUORESCENT BUZZ PASTEL`: an id with spaces; no room uses it (rooms use LIGHT_FLUORESCENT_BUZZ_PASTEL)
- Warning shared_libraries `LIGHT_STAINED AD LIGHT`: an id with spaces; no room uses it (rooms use LIGHT_STAINED_AD_LIGHT)
- Warning shared_libraries `LIGHT_FLORIDA SUNSET PINK`: an id with spaces; no room uses it
- Warning shared_libraries `LIGHT_TIKI TORCH HOLOGRAM`: an id with spaces; no room uses it (rooms use LIGHT_TIKI_TORCH_HOLOGRAM)
- Warning shared_libraries `LIGHT_SODIUM FACTORY ORANGE`: an id with spaces; no room uses it
- Warning generation_parameters: the source has none; the generator’s defaults are used (25% functional rooms, adjacency 55/20/15/10, twists 12%, overlays 32%)
