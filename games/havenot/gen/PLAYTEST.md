# Play-testing generated installations

The first one in the game is **the Bunker** (Installation B): two floors at Threat Level 1, generated from
`briefs/bunker.json`. It replaces the stub, so it's on the near-area map from the start.

## Playing it

- Serve the repository and open `engine/index.html?game=havenot`, or open a packaged `havenot.html`
  (`node tools/package.mjs havenot`).
- Make a scavenger, leave home, pick **The Bunker** on the map. The goal is on floor 2: recover the duty log.
- The pack's `REPORT.md` has every lock and key, if you get stuck or want to check a route.

## What to look for

1. **Difficulty.** Threat Level 1 should be easier than the Anomalous Structure (Threat Level 2). Too easy, too
   hard, or about right?
2. **Size and pacing.** Floors are about 60 × 38 with 11–12 rooms. Too big for what's in them?
3. **Locks.** Door releases, a code locker with its code on a memo, and hack panels. Fun to work out, or busywork?
   Is there ever a moment you don't know what to do next?
4. **Traps.** A dart corridor (with a TRAP light most of the time), an alarm beam that calls robots, trapped
   lockers. Fair? Readable?
5. **Treasure.** About 850 credits a floor, plus junk in the containers that have nothing better. Does finding
   things feel worth it?
6. **Rooms.** Do the rooms look like what they're called? Any furniture in the way, or a spot you got stuck in?
7. **Words.** Names, memos, terminals, posters: do they sound like HaveNot?

Anything that's wrong with this installation in particular, the fix is usually a different seed (change
`seed` in the brief and run `node tools/generate.mjs havenot --brief bunker --add`; `--dry` previews without
writing). Anything that's wrong with every installation is a library or generator fix: say what you saw, and
which floor and room.
