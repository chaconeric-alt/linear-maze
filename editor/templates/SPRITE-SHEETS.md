# Drawn sprite sheets (next-gen engine)

A sprite sheet is one PNG with every frame of a monster's (or person's, or item's) animations on a grid. Next-gen can make sheets from 3D models; this guide is for sheets you **draw yourself**.

**In the editor:** open the monster → **Look** → **A sprite sheet (3D model or drawn)** → **Import a drawn sprite sheet…**. Pick the PNG, say how it's drawn, check the moving preview, and click **Use this sheet**. The sheet then appears in the Sheet list like the 3D ones, and any monster, person or item can use it.

## Two ways to draw

| | **Top-down** | **Three-quarter** |
|---|---|---|
| **Looks like** | Seen from straight above, like the classic floors | Standing up, seen at the tilted camera's angle, like the 3D-model sheets |
| **Directions** | Draw it once, **facing right**; the game turns it | Draw each direction: **4** (east, south, west, north) or **8** (adding south-east, south-west, north-west and north-east) |
| **Positioned by** | The **centre** of the body | The point **under its feet** |
| **Template** | `sheet-topdown-64.png` (8 × 5 frames of 64 × 64) or `sheet-topdown-128.png` | `sheet-34-4dir-64x80.png`, `sheet-34-8dir-64x80.png` or `sheet-34-4dir-128x160.png` (frames 64 wide × 80 tall) |
| **Example** | `example-topdown-beetle-64.png` | `example-34-slime-4dir-64x80.png` |
| **Best for** | Bugs, crawlers, turrets, anything flat; quickest to draw | People and upright monsters on next-gen floors with the tilted camera |

Use three-quarter on floors with the tilted camera, so drawn monsters match the walls and the 3D-model sheets. Top-down works on any floor.

## The rows

The animations always come in this order, top to bottom. In three-quarter view each one has a row **per direction**, in the direction order above.

| Animation | Frames | Speed | Plays when |
|---|---|---|---|
| idle | 4 | 6 a second | standing still |
| walk | 6 | 10 a second | moving |
| attack | 6 | (timed to the attack) | attacking. Frames 1–3 play during the wind-up, the blow lands on **frame 4 (HIT)**, frames 5–6 recover |
| hurt | 2 | 12 a second | for a quarter of a second after a hit |
| death | 6 | 10 a second | dying. Plays once where it fell, holds its last frame, then fades |

The importer lets you change the number of frames, the speed and the hit frame. Setting an animation to 0 frames leaves it out, but keep its rows in the sheet (empty), so the rows below stay in place.

## Best practice

**The grid**
- **Frame size:** 64 px frames for ordinary monsters, 128 px for big ones. Top-down frames are square; three-quarter frames are 4 wide by 5 tall, to leave room for a standing figure.
- **Grid:** keep every frame the same size, and the whole sheet an exact number of frames. The importer checks this.
- **Export:** a transparent PNG, with the guide layer hidden. Leave unused cells empty.

**Top-down frames**
- **Centre:** put the middle of the body on the pink cross. That's its position in the game and the point it turns around.
- **Size:** keep everything inside the blue dashed circle, so nothing is cut off as it turns. Make the solid body about the size of the green circle.
- **Facing:** face right (the orange arrow).

**Three-quarter frames**
- **Feet:** put the feet (or the bottom of a blob or crawler) on the pink cross on the green ellipse. That's where it stands.
- **Space:** stay inside the blue box. The space above it is headroom for the tilt.
- **Direction:** each row faces the way its label and arrow say. East faces right; south faces the viewer.
- **Camera angle:** draw at the same angle as the floors, roughly 30° from straight down. You see the top of the head and the front of the body.

**Every sheet**
- **Keep it steady:** the same size and position in every frame, so the monster doesn't wobble or slide. Only the moving parts should move.
- **Outline:** a dark outline (1–2 px at 64 px) keeps the silhouette readable in the dark.
- **Light:** light it from the top left, softly, like the other sprites.
- **Shadows and glows:** no ground shadow (the game draws one), and no glow painted in. Use the Look tab's Glow setting instead.
- **Silhouette:** strong and simple. On screen it is usually 30–60 pixels across.

**Animation**
- **Idle:** a small loop (breathing, a twitch). The last frame leads back into the first.
- **Walk:** one full stride, looping.
- **Attack:** three frames winding up (rearing back), the strike on frame 4 at full reach (when the game deals the damage), then two frames back to rest.
- **Hurt:** a recoil. A pale flash on the first frame reads well.
- **Death:** ends on a still body that looks fine lying there for a second or two.

## What the editor saves

The sheet goes into the game's `editor/sprites.js`. Its record goes under `sheets` in `editor/edits.js`, with `made: { drawn: true, style }`. A monster using it gets a look like this (`engine/nextgen-sheets.js`, SPEC section 22.4):

```js
// top-down
look: { type: 'sheet', sprite: 'beetle', fw: 64, fh: 64, dirs: 1, rotate: true, anchor: [32, 32], upp: 0.531, hurtHold: 0.25,
        anims: { idle: { row: 0, frames: 4, fps: 6 }, walk: { row: 1, frames: 6, fps: 10 }, attack: { row: 2, frames: 6, fps: 12, hit: 3 },
                 hurt: { row: 3, frames: 2, fps: 12 }, death: { row: 4, frames: 6, fps: 10, loop: false } },
        states: { idle: 'idle', move: 'walk', attack: 'attack', hurt: 'hurt', die: 'death' } }
// three-quarter, 4 directions: dirs: 4, no rotate, anchor at the feet [32, 70], and each animation starts 4 rows further down
```
