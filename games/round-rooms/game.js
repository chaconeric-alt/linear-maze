/* games/round-rooms/game.js — Round Rooms
 * A one-floor test game for curved rooms (engine/SPEC.md section 23): a round rotunda with a pillar,
 * a rounded entry hall, an octagon and an oval, on the next-generation look. It also carries test kit
 * for magazines, overheating and plate armor (engine/SPEC.md sections 6.4 and 6.7).
 * Play: engine/index.html?game=round-rooms
 */
LM.defineGame({
  id: 'round-rooms',
  title: 'Round Rooms',
  version: '0.1.0',
  description: 'A test floor for curved rooms: a rotunda with a round pillar, a rounded hall, an octagon and an oval. Also a scattergun that reloads, a gauss pistol that overheats and a chest plate that only covers part of you.',
  brief: 'An engine test floor. Keep text short and plain.',
  packs: ['linear-maze/core', { pack: 'havenot-test/hn-complex', levels: false }, 'round-rooms'],
  start: 'rr-rotunda',
  saveKey: null,
  editorChanges: true,
  titleScreen: {
    lines: ['round', 'rooms'],
    layout: 'stairs',
    size: 'large',
    font: 'Major Mono Display',
    tagline: 'No corners to hide in.',
    newGame: 'Go in',
    showControls: true,
    footer: 'Engine test floor · {version}',
    background: 'rr-rotunda',
    picture: null,
  },
  theme: { accent: '#5cc8e8' },
  words: {},
});
