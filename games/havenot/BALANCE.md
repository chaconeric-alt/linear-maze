# HaveNot balance runs

How the starting characters and the weapons do against the near-area's monsters, measured in the real engine.
The tools are in `tools/balance/` (see the end of this file to run them again).

## How it was measured

Each fight is one character against one group in a small open arena with four pillars, 30 to 40 times over.
The player is a script with **average** skill: it aims about 7° wide and a fifth of a second late, only half leads a
moving target, kites to a range that suits the weapon, strafes, forgets its feet about a third of the time, and
dashes out of a pile-up now and then. It never heals, throws grenades, uses doors or corners, or flatters anyone.
So these are hard numbers: a real player with a med-kit and cover does better. Read them side by side.

Win = every enemy dead before the player. HP = health left after a win.

## The starting characters (Level 1), after tuning

| Build | Threat 2 groups: win | HP left | Threat 3 groups: win | HP left | Princess Eggbot |
|---|---|---|---|---|---|
| Human, handgun + vest | 96% | 58% | 73% | 41% | 0% |
| Human, scattergun + plate | 98% | 58% | 72% | 47% | 3% |
| Human, gauss, no armor | 95% | 63% | 85% | 51% | 0% |
| Hyena, handgun + vest | 94% | 53% | 66% | 42% | 5% |
| Hyena, scattergun + plate | 93% | 57% | 69% | 39% | 3% |
| Hyena, gauss, no armor | 90% | 61% | 73% | 48% | 0% |

(Threat 2: six Chatterpillar Alphas; four Eggbots; the Slop-Tread with two Alphas; two turrets with three Alphas.
Threat 3: two Chatterpillar Gammas; a Grease Monkey; six Eggbots. Threat 1 groups, the agency's roaches, knife
fighters, maintenance robots and glorexxes, are won 100% of the time by every build with 95–97% health left.)

- The six builds are within a few points of each other. Scattergun and plate are the steadiest up close, the gauss
  the quickest against groups, the handgun in between; the hyena trades about 20 health for speed and senses.
- One Threat 3 fight at a time is survivable at Level 1, but at a cost of half to two thirds of your health, and
  the floors chain them with no healing in between. Six Eggbots at once (the forge, left running) kills a Level 1
  character two times in three. Princess Eggbot kills a Level 1 character 95–100% of the time.

### What changed

- **Gauss pistol**: damage 34 → 38, overheat cooldown 3 s → 2.2 s. Before, it was clearly the weakest start
  (human gauss won 70% of the turret fights and 37% against a Grease Monkey; hyena gauss 50% and 30%). Now it sits
  with the others.
- **Princess Eggbot**: health 1100 → 620, field 300 → 130 (and slower to grow back), armor 0.3 → 0.2, deflects
  15% of bullets instead of 25%, death ray 4 × 12 → 3 × 10, nova 20 → 18, summons one Eggbot at a time (two at most).
  At first she was unbeatable even with Level 3 gear (a carbine took off 22% of her health in 47 seconds).
- **Grease Thrower** stacks: up to 10 instead of 12, 1 damage each instead of 1.2.

## Level 2 characters with the Bolt Hole's Level 3 gear

A human at Level 2 (115 health) with a Soot-Coat, against the same groups (Threat 2 is now below them, Threat 3 one above):

| Weapon | Threat 2: win | HP left | Threat 3: win | HP left | Princess Eggbot |
|---|---|---|---|---|---|
| Soot-Line Carbine | 100% | 85% | 100% | 72% | 50% |
| Fouler Riot Gun | 100% | 84% | 99% | 70% | 60% |
| Grease Thrower | 100% | 84% | 100% | 66% | 90% |
| Starting scattergun + plate | 100% | 70% | 92% | 54% | 13% |
| Starting gauss | 100% | 74% | 92% | 59% | 3% |

- The Level 3 weapons are a real step up: 15 to 20 points more health left after every fight, and the Princess
  becomes a coin toss instead of a death sentence.
- The Grease Thrower is the Princess's answer on purpose (grease gums up her field). In the sim it doesn't pay for
  the waddle; in play, its 235 range and the speed it costs you are the price.
- With the Egg-Mask flattery (her field drops and she takes half again as much while she preens), an Egg Grenade
  or two, the med-bay and the pillars in her hall, a careful Level 2 or 3 player should beat her.

## Levels: what a level gives, and the level-up improvements

The rules are in `packs/hn-rules/levels.js`. A level is +15 max health and +2 melee damage, plus one improvement
picked from four offered at random (`HN.IMPROVEMENTS`, plain data). The target: a Level N character with
Level N+1 gear has a fair but dangerous time on a Threat N+1 floor, and no improvement is the obvious pick.

The sim now also swings at anything in reach, uses a med-kit charge below 35% health, and can fight a **floor**:
three groups back to back with no rest between. That is what a floor is in play, and one group at a time hides the
danger (a Level 2 character with Level 3 gear wins any single Threat 3 group 95–100% of the time, with 44–93% of
their health left).

Whole floors, 30 runs each (hacker kit, so no med-kit unless an improvement gives one):

| Character | Floor | Win | HP left |
|---|---|---|---|
| Level 1, Arc Carbine + vest (Level 2 gear) | Threat 2: six Alphas, four Eggbots, the Slop-Tread and two Alphas | 100% | 78% |
| Level 1, Plasma Musket + Coltron (Level 2 gear) | Threat 2, the same | 80% | 40% |
| Level 2, Soot-Line Carbine + Soot-Coat (Level 3 gear) | Threat 3: two Gammas, the Grease Monkey, six Eggbots | 60% | 22% |
| Level 2, Fouler + Soot-Coat (Level 3 gear) | Threat 3, the same | 70% | 24% |

Each improvement on its own, on the two Level 2 builds (win rate averaged over both; with 30 runs a number moves
about 9 points from noise):

| Improvement | Floor win (first try) | After tuning |
|---|---|---|
| none | 65% | 65% |
| Hard to kill: +20 max health | 88% | 88% |
| Thick hide: damage reduction | 74% (8%) | 90% (12%) |
| Quick hands: reload and overheat | 90% (25%) | 79% (20%) |
| Quick on your feet: +12 speed | 84% | 84% |
| Slippery: dash recovers sooner | 75% (0.2 s) | 83% (0.25 s) |
| Brawler: melee damage | 69% (+5) | 82% (+8) |
| Field medic: +1 med-kit charge a mission | 99% | 99% |
| Sharp senses, Tinker | no change in a fight | (they pay off outside fights) |

- One level and one improvement turn a coin-flip floor into a fair one: 78–90% for every pick but one.
- **Field medic** tops a single floor because the sim spends its one extra charge there. A mission is 3–10 floors,
  and the charge is spent once while the others work on every floor; for a character who took the med-kit it is a
  fourth charge, not the first. Watch it in play: if it is still the only pick people make, make its charge heal
  less or only every other mission.
- Sharp senses and Tinker do nothing in a fight on purpose: they find loot and open doors, which a level needs too.

## Running it again

From this folder, with Playwright's Chromium available (`NODE_PATH` pointing at the global node modules):

    python3 mkjobs.py start 40      # the six starting builds against Threat 1-3 groups
    python3 mkjobs.py l2 40         # Level 2 characters with Level 3 gear
    node run.js jobs-start.json out-start.json 4

`run.js` opens four pages of the game, `page.js` takes over the game loop and fights each job `trials` times.
About two thousand fights take a minute and a half.

    python3 mkjobs.py levels 30     # per-level numbers, each improvement, and whole floors

Without Playwright: serve the repository, open the game in a few browser tabs, load `browser-run.js` in each
and call `SIMRUN.start('/games/havenot/tools/balance/jobs-levels.json', part, parts)`; `SIMRUN.summary()` gives the
same numbers as `run.js`.
