/* games/havenot/game.js — HaveNot: The Near-Area
 * A vertical slice of HaveNot (the JAGS setting): a home bunker, a near-area map, three
 * settlements and one installation built in full (the Anomalous Structure, three floors), with
 * stubs for the rest. engine/SPEC.md section 21 explains every field; README.md has the design.
 * Play: engine/index.html?game=havenot
 */
LM.defineGame({
  id: 'havenot',
  title: 'HaveNot',
  version: '0.1.0',
  description: 'A scavenger leaves a home bunker to loot the near-area: the Out-rider Outpost, Boom-Town, Mother Long-Legs, and the Anomalous Structure, an Age of War advertising agency whose security system never got its termination order. Character creation, missions, hacking, treasure, and an epilogue when you retire or die.',
  brief: 'HaveNot: post-post-apocalyptic science fantasy. An 80s action movie colliding with a deranged consumer utopia, a Western frontier and an archaeological dig. Old machines still follow centuries-old orders. In-world text is dry, darkly absurd, corporate-polite, short, and always carries a hint.',
  packs: [
    'linear-maze/core',
    { pack: 'linear-maze/office', levels: false, exclude: ['npcs.js', 'phone.js'] },
    { pack: 'havenot-test/hn-complex', levels: false },
    'hn-rules',
    'hn-world',
    'hn-sites',
    'hn-anomalous',
    'hn-stubs',
  ],
  start: 'hn-home',
  saveKey: null,
  editorChanges: true,
  titleScreen: {
    lines: ['have', 'not'],
    layout: 'stairs',
    size: 'large',
    font: 'Major Mono Display',
    tagline: 'The old world could make anything. Go and find out what it left lying around.',
    newGame: 'New scavenger',
    showControls: true,
    footer: 'The Near-Area · vertical slice {version}',
    background: 'hn-agency-1',
    picture: null,
  },
  theme: { accent: '#e8a23a' },
  words: {
    floor: 'Floor {n}',
    continueGame: 'Continue: {floor}, {name}',
    descend: 'Take the stairs: {name}',
    nextIntro: 'The stairwell smells of old toner and ozone.',
    cleared: '{floor} explored',
    leftBehind: '{floor} · left behind',
    victoryKicker: 'Vertical slice',
    victoryTitle: 'The road goes on',
    victoryText: 'That is everything built so far.',
    playAgain: 'New scavenger',
    deathTitle: 'You became salvage',
    deathText: 'In HaveNot, death ends the run.',
    tryAgain: 'Try the floor again',
    backToTitle: 'Back to title',
    noWayUp: 'The way back is shut.',
    stairsLocked: 'The stairwell door is locked.',
    doorNeeds: 'Locked. It needs {need}.',
    doorAccepts: '{need}: accepted. Have a productive day.',
  },
});
