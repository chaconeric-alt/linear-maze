/* games/havenot/packs/hn-anomalous/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'HaveNot: The Anomalous Structure',
  version: '0.1.0',
  description: 'Installation A, an Age of War advertising agency in three floors: Reception and Offices (Institutional), Prototype Labs (Sterile White, round rooms and iris doors), and the Security Complex (Industrial-Metal, then Emergency). The Sphinx Gun, the Monoid, the test chamber, the Security Station, the Robot Repair Bay, the inner core.',
  requires: ['linear-maze/core', 'linear-maze/office', 'havenot-test/hn-complex', 'hn-rules'],
  scripts: ['agency.js'],
  levels: ['levels/floor1.js', 'levels/floor2.js', 'levels/floor3.js'],
});
