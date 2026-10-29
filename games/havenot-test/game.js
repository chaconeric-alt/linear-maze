/* games/havenot-test/game.js — HaveNot test floor
 * A one-floor test game for the next-generation look (engine/SPEC.md section 22), dressed as a
 * HaveNot installation. engine/SPEC.md section 21 explains every field.
 * Play: engine/index.html?game=havenot-test
 */
LM.defineGame({
  id: 'havenot-test',
  title: 'HaveNot: Sunken Installation',
  version: '0.1.0',
  description: 'One small floor that shows off the tilted camera, ceiling silhouettes and neon: an Age of War installation with monster tubes, a sealing tomb and a security drone.',
  brief: 'HaveNot: post-post-apocalyptic science fantasy. Age of Wonder machines still follow centuries-old orders. Text is dry, darkly absurd, corporate-polite.',
  packs: ['linear-maze/core', 'hn-complex'],
  start: 'hn-sunken-installation',
  saveKey: null,
  editorChanges: true,
  titleScreen: {
    lines: ['have', 'not'],
    layout: 'stairs',
    size: 'large',
    font: 'Major Mono Display',
    tagline: 'The installation is open. The installation has always been open.',
    newGame: 'Go down',
    showControls: true,
    footer: 'Next-gen test floor · {version}',
    background: 'hn-sunken-installation',
    picture: null,
  },
  theme: { accent: '#e8a23a' },
  words: {
    victoryKicker: 'Exfil complete',
    victoryTitle: 'You got out with the loot',
    victoryText: 'Somewhere behind you, a smart door thanks you for your visit.',
    deathTitle: 'You became salvage',
    stairsLocked: 'The hatch is sealed.',
  },
});
