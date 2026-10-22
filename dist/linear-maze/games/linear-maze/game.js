/* games/linear-maze/game.js — The Linear Maze
 * The game’s manifest: what it’s called, its title screen, the words on the engine’s own
 * screens, and the asset packs it loads, in order. The editor’s Game page writes this file;
 * hand edits are kept as long as it stays one LM.defineGame({...}) call.
 * engine/SPEC.md section 21 explains every field.
 */
LM.defineGame({
  id: 'linear-maze',
  title: 'The Linear Maze',
  version: '0.5.0',
  description: 'A fast top-down shooter. A quiet morning on the 14th floor of an office tower, a door that wasn’t there before, three maze floors below it, and then the strange evening, night and morning at home.',
  brief: 'The player descends through hand-built floors: dark, torch-lit, every light casts shadows, danger telegraphs clearly. Write in-world text that is short, specific and slightly ominous, and carries a hint.',
  packs: [
    'core',
    'maze',
    'office',
    'memos',
    'chessboard',
    'apartment',
    'rotary',
    'dressings',
    'home-story',
    'library',
    'town',
  ],
  start: null,
  saveKey: 'linear-maze-save-v1',
  editorChanges: true,
  titleScreen: {
    lines: ['the', 'linear', 'maze'],
    layout: 'stairs',
    size: 'large',
    font: 'Major Mono Display',
    tagline: 'Passages and chambers, one after another. Shoot what moves, take what glitters, and find the stairs down.',
    newGame: 'Begin the descent',
    showControls: true,
    footer: 'Iteration 0.5 · Content packs: {packs}',
    background: null,
    picture: null,
  },
  theme: { accent: '#e0b25a' },
  words: {
    floor: 'Floor {n}',
    continueGame: 'Continue: {floor}, {name}',
    descend: 'Descend to {floor}: {name}',
    nextIntro: 'The stairs keep going down.',
    cleared: '{floor} cleared',
    leftBehind: '{floor} · left behind',
    victoryKicker: 'The end of this iteration',
    victoryTitle: 'You reached the bottom',
    victoryText: 'Below the Reliquary the stairs keep going, into dark nobody has drawn yet. New floors arrive with new content packs.',
    playAgain: 'Play again',
    deathTitle: 'You fell in the maze',
    deathText: 'Trying again restores you to how you entered this floor.',
    tryAgain: 'Try the floor again',
    backToTitle: 'Back to title',
  },
});
