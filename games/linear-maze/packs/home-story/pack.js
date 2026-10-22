/* games/linear-maze/packs/home-story/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Home story',
  version: '0.1.0',
  description: 'The story at home: the evening’s tasks, the red phone ringing, the news, Home (Chessboard 1), Dave’s door, sleep, and the morning Alice calls.',
  requires: ['office', 'memos', 'apartment', 'rotary'],
  scripts: ['story.js'],
  levels: ['levels/home-chessboard-one.js'],
});
