/* games/havenot/packs/hn-ruins/pack.js
 * Installations generated when a run starts: the Bunker and Installation-Ruins 1–3 (see ruins.js).
 * It loads the installation generator (editor/gen/) and HaveNot's library (gen/library/) into the game, so it
 * goes last: the generator reads the registry of everything loaded before it.
 */
LM.describePack({
  name: 'HaveNot Ruins',
  version: '0.1.0',
  description: 'Each new run rolls a fresh Bunker (Threat Level 1, two floors) and three Installation-Ruins of 3 to 10 floors whose Threat Level rises as you go down: one starts at Level 1, one at 3–5 and one at 4–10. They are kept with the run, so Continue finds the same ones.',
  requires: ['linear-maze/core', 'hn-rules', 'hn-world', 'hn-gen-kit'],
  scripts: [
    '../../../../editor/gen/core.js',
    '../../../../editor/gen/library.js',
    '../../../../editor/gen/content.js',
    '../../../../editor/gen/stages-concept.js',
    '../../../../editor/gen/stages-graph.js',
    '../../../../editor/gen/stages-layout.js',
    '../../../../editor/gen/stages-function.js',
    '../../../../editor/gen/stages-fill.js',
    '../../../../editor/gen/stages-words.js',
    '../../../../editor/gen/validate.js',
    '../../../../editor/gen/emit.js',
    '../../../../editor/gen/generate.js',
    // the library, in the order the CLI reads it (by name), so the hash comes out the same
    '../../gen/library/looks.js',
    '../../gen/library/monsters.js',
    '../../gen/library/rooms.js',
    '../../gen/library/settings.js',
    '../../gen/library/settings10.js',
    '../../gen/library/settings10b.js',
    '../../gen/library/text.js',
    '../../gen/library/traps.js',
    '../../gen/library/types.js',
    'ruins.js',
  ],
});
