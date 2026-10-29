/* games/havenot/packs/hn-gen-kit/pack.js
 * What the packs the installation generator writes need in the game (see kit.js).
 */
LM.describePack({
  name: 'HaveNot Generator Kit',
  version: '0.1.0',
  description: 'Run-time support for generated installations: their pins on the near-area map (new ones, or taking over a stub), floor trap switches, the goal, roaches that come back between missions, and their terminals: riddles, ELIZA, the Mental Hygiene checkpoint, chatty and red-team terminals.',
  requires: ['linear-maze/core', 'hn-rules', 'hn-world'],
  scripts: ['kit.js', 'terminals.js'],
});
