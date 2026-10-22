# Linear Maze Editor

A point-and-click editor for games built on the Linear Maze engine. With it you can:
- make new games, and change each game's title screen, the words on the engine's screens, and the asset packs it loads;
- change floors and their order, maps, items and what they do, monsters, the player, weapons and gear, tile sets, pictures, people and pack settings;
- ask Claude to make or change any of them from a description.

It runs in the browser, straight from this folder. Nothing to install. The folder stands on its own: copy `editor/` anywhere, or give it to someone, and it opens any workspace.

## Open it

1. Open `editor/index.html` in **Chrome or Edge** (double-click it, or drag it into a browser window).
2. Click **Open workspace folder** and pick the workspace: the folder with `engine` and `games` in it (for example `E:\Linear Maze\linear-maze-0.5.0`). A packaged game's folder (`dist/<id>/`) works too.
3. Allow the browser to edit files in it when it asks.
4. Choose a game, or **+ New game**.

Next time, **Reopen linear-maze-0.5.0** does it in one click, and the game you had open last is highlighted. **Games** in the top bar goes back to the list of games.

The editor always uses the engine inside the folder it opens (`engine/manifest.js` decides what a game loads), so it agrees with the engine that game runs on.

Firefox and Safari can't write into folders. There the editor opens the workspace read-only, and **Save** downloads the changed files for you to copy into place.

## Games

A game is a folder under `games/`:
- `game.js`: its manifest (the Game page);
- `packs/`: its own packs, if it has any;
- `editor/edits.js` and `editor/sprites.js`: what the editor saved for it.

**+ New game** makes one of two kinds:
- **A blank game:** you tick the packs it starts with, from every game in the workspace (Core at least). If none of them has floors, it starts with one empty room.
- **A copy of a game:** it loads the same packs (it uses them where they are; it doesn't duplicate them) and starts with a copy of that game's editor changes.

Either way it gets its own save slot and is added to `games/games.js`, which the launcher reads.

## What each page does

| Page | What you can do |
|---|---|
| **Game** | Everything in the game's `game.js`. **Title screen:** the title and its lines, layout, size, font and accent colour, the tagline, the New game button, the controls list, the footer, and a floor or picture behind it. A live preview drawn by the engine follows every change. **Packs:** the packs it loads, in order. Each comes from its own game or another; untick **Its floors** to take only a pack's assets, or open its files to leave some out. **Everything from…** loads all of another game's packs, and **List them separately** splits that into one line per pack. The page lists packs that need another pack first, and anything your floors use that no loaded pack provides, with the pack that has it. Pack changes load when you save and reload (Save offers to). **Words** on the engine's screens: floor numbers, finishing a floor, the end, dying. **Details:** version, description, notes for Claude, the first floor of a new run, the save slot, and **Editor changes** (switch off to play the game as its packs alone define it). **Package for players** is here too. |
| **Floors** | The run, top to bottom. Drag (or use the arrows) to reorder; **Remove** takes a floor out (restore it at the bottom of the page); **Duplicate**; **New floor** (an empty room, blank, or a copy); **Play from here**. Below the floors, **Elevators**: which elevator stops at which floor, as ticks. |
| **Map** | Paint a floor with its own tiles, items, monsters and people, drawn by the game's renderer. **Torchlight** shows the floor's real light and darkness; turn it off for flat light. The palette's **Dressings** tab holds furniture and fixtures (desks, tables, counters, pillars, lamps, pictures) from every set, for any floor: filter by set, by kind (furniture, on walls, lights, decor) or by name, and pick which way furniture faces (`[` and `]` turn it; a piece without a front of its own, like the reception desk, is turned whole). **Turning tiles:** any tile but a wall can be turned, so one corner, junction or door piece does for every direction. `[` and `]` turn the brush (the Tiles tab shows the turn); with Select they turn the tile or area you selected, furniture on it included; a tile's inspector has a Turn field. A door lines up with what's beside it unless you set which way it runs. Tools: Select (click a tile to edit it; drag to select an area to fill, clear, copy, make a room or hand to Claude), Paint, Rect (Shift for an outline), Fill, Erase, Pick (eyedropper), Tag (for traps), Room. **Ask Claude** changes the floor (or the selected area) from a description; **Play** starts a play test on this floor. **Floor settings** holds the name, tile set, intro and outro text, peaceful floors and loadouts, rooms, traps and scripted events, ceiling lights and map size. **Check** reports whether the start reaches the exit (keys and doors included), unreachable items, unknown ids and trap tags with no tiles. **Elevators** (the palette tab): place an elevator by clicking the map; it's built into every floor at the same place and the same way round. Click a shaft with Select to rename, move, turn (`[` `]`), resize it, choose the floors it stops at, give it a **Power** flag (dark and shut until the flag is set), or add the next car of a bank beside it. **Floor settings → Stairs and elevators**: where the floor's stairs up lead, **stairs that go somewhere of their own** (tag a flight with the Tag tool, then say where it leads, which flags unlock it and what it says while locked), which elevators stop here, and moving every elevator on this floor at once. Ctrl+C on a selected area and Ctrl+V on any floor (this one or another) stamps a copy. |
| **Items** | Every world object. **What it does** shows built-in behaviour as editable data: the altar's tithe and prayers (and the blessings it can give, which you can edit, copy, delete or make new right there), the healing font, the espresso machine, the Vend-O-Matic, the slot machine's paytable (with its payback percentage), loot tables. Any item can get a pop-up of choices, a pickup effect, breaking, or text to read. **Placement settings** are the per-copy settings (an altar's title, a chest's contents). **Look**, **Code** and **Used on** too. **Basics → Dressing** files an item under the map's Dressings tab (or keeps it out). **New item** starts from a pickup, a shrine with choices, something to read, something breakable, a light, furniture or a copy. |
| **Monsters** | Stats, movement, attacks (each attack type shows its own settings), drops, death effects, look, code and where they're placed. **New monster** starts from a template or a copy. |
| **Player** | Base stats (health, speed, armor, shields, light, dash, swimming, damage, gold find, ammo), ammunition capacity, and the starting kit (weapons, ammo, gold, worn armor, pack, blessings, gadgets, story flags). |
| **Weapons & gear** | Weapons, armor, blessings and loot tables. |
| **Tile sets** | Every environment: darkness and light colours, floating particles, the background drone, and the floor and wall painters with their colours. Copy one to make a new set, or build one from pictures. **Tile types** shows what each tile does (solid, water, pit, hazard, door), and new tile types can be copied from old ones. |
| **Pictures** | Every imported picture, what uses it, and **Import**, **Replace** (everything using it updates) and **Delete**. |
| **People** | The office cast: look, movement, lines said in passing, and the plain-text parts of their conversations. |
| **Settings** | Pack knobs (`CHESSBOARD.CONFIG`, vending stock, hints, scores), the Claude connection, and **Package this game for players** (the same as `node tools/package.mjs <id>`, so Node isn't needed). |
| **Ask Claude** | Make or change a monster, item, floor (or part of one) or tile set from a description, or have Claude draw a monster or item in code. |
| **Changes** | Everything changed since the packs, each with **Undo this**. |

Every change can be undone (**Ctrl+Z**, redo with **Ctrl+Shift+Z**), including title-screen and pack changes. **Ctrl+S** saves. **Play test** runs the whole game in the editor with unsaved changes included, from the title or from any floor, with no-damage and give-everything switches. Its checkpoint is kept apart from the game's real save. A pack you add only appears in the play test after you save and reload.

## Packaging a game for players

**Package for players** (Game page, Settings, or the game list) writes into the workspace's `dist/`:
- `dist/<id>/`: a folder to zip and hand out. It holds the engine, the game and only the packs it loads, and players open its `index.html`.
- `dist/<id>.html`: the same game as one file.
- `dist/<id>.artifact.html`: that file, ready for a claude.ai Artifact.

Unsaved changes are included.

## Pictures

Monsters and items can be drawn by their original code, built from settings (shapes, colours, extras such as horns or a gun), drawn by a picture, or drawn by your own code.

- **Look → Making a picture for it** writes a prompt for an image generator. Copy it, make the picture, then **Look → A picture → Import a picture…** It can clear a plain background, trim empty edges and shrink it to sprite size.
- **Tile sets → From pictures** paints floors and walls with imported textures. Several floor pictures are mixed at random, tile by tile.
- Pictures are saved inside the game's `editor/sprites.js`, so a packaged game carries them. The **Pictures** page lists them all.
- **Game → Behind the title → A picture** puts a picture behind the title screen (imported as a JPEG, up to 1600 pixels across).

## Claude

The editor can talk to Claude two ways.

- **With an API key** (Settings → Claude): requests go straight to the Anthropic API from this browser, and answers stream in. The key stays in this browser; it is never written into the game folder.
- **Without a key**: **Copy the prompt**, paste it into Claude (claude.ai or the app), copy the whole reply, paste it into **Claude's reply**, and click **Read this reply**.

Either way Claude gets the engine's rules (the relevant parts of `engine/SPEC.md`), the game's title, description and notes (Game page), what already exists, and the format to answer in. The editor checks the answer (code that doesn't run is left out, unknown ids are flagged, floors are checked for a route from start to exit), shows a preview, and changes nothing until you apply it. Applying is one undoable step.

## How it saves

The pack files are never touched. Everything changed in the editor is written into the game's own folder:

```
games/<id>/game.js              the Game page: title screen, words, packs, details
games/<id>/editor/sprites.js    imported pictures
games/<id>/editor/edits.js      every other change, as readable data and code
engine/editor-runtime.js        applies edits.js and sprites.js (part of the engine; the editor doesn't write it)
```

The engine's loader loads the editor files after every pack. Switch off **Editor changes** on the Game page (`editorChanges: false`) and the game runs exactly as its packs define it.

`edits.js` is plain JavaScript: one `LM.editor.apply({...})` call listing new content (`add`, with `$extends` for copies), changed fields (`patch`), removed ids (`remove`), the floor order, the player and pack settings. `engine/editor-runtime.js` documents the format and the data fields (looks, abilities, effects, pickups, loot lists, slot machines, picture tiles). `engine/SPEC.md` has the reference: section 15 for edits, section 21 for `game.js` and packs.

If someone else changes `edits.js` or `game.js` while the editor is open, saving asks before overwriting it.

## Troubleshooting

- **“Pick the workspace folder”**: choose the folder that contains `engine` and `games`, not one game's folder, `engine` or `editor`.
- **“A game folder from before 0.5”**: a 0.4 folder (with `index.html`, `engine` and `packs` side by side) has the old layout. Use the 0.5 workspace.
- **A pack you added doesn't show**: save, then reload (Save offers to). The Game page says when packs are waiting to load.
- **The Game page lists missing things**: a floor uses an item, monster, person, tile or tile set that no loaded pack defines. Add the pack it names, or change the floor. Until then the floor leaves them out.
- **Fonts look plain**: the editor loads its fonts from Google Fonts. Offline, it uses system fonts; nothing else changes.
- **A floor won't draw in the map editor**: the message at the top of the map says why (usually an unknown tile or id on that floor). The Check panel lists unknown characters and ids.
- **A new game won't start** ("This game has no floors yet"): give it a floor (Floors → New floor), or load a pack that has some.
- **Code you typed shows a warning about names**: a function copied from a pack file can use helpers private to that file. The common ones (`eyes`, `lunge`, `flame`, `has`, `rot`, `wallRot`, `U`, `G`, `T`, `h`) are available to edited code. If the game reports one of the others as not defined, replace it. Edited code runs guarded, so a mistake is logged once in the browser console instead of stopping the game.
