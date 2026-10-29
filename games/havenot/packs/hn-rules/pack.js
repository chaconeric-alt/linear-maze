/* games/havenot/packs/hn-rules/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'HaveNot Rules',
  version: '0.1.0',
  description: 'The rules of a HaveNot run: the run state (missions, satchel, ledger, objectives, standing, radiation), character creation, gear and the item catalog from the books, melee, grenades, hacking, sensing, the bestiary overrides (robots and bio-weapons, no healing drops), the shared world objects, and how a run ends.',
  requires: ['linear-maze/core'],
  scripts: ['state.js', 'gear.js', 'character.js', 'levels.js', 'combat.js', 'bestiary.js', 'fixtures.js', 'epilogue.js'],
});
