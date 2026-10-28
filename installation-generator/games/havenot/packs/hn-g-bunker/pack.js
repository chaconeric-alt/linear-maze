/* HaveNot — packs/hn-g-bunker/pack.js
 * A generated installation: The Bunker (Age of War command bunker, Threat Level 1).
 */
LM.describePack({
  name: 'HaveNot: The Bunker',
  version: '0.1.0',
  description: 'Age of War command bunker, Threat Level 1, 2 floors. Generated from seed 11.',
  requires: [
    'linear-maze/core',
    'linear-maze/office',
    'havenot-test/hn-complex',
    'hn-rules',
    'hn-world',
    'hn-anomalous',
    'hn-gen-kit',
  ],
  scripts: ['site.js'],
  levels: ['levels/f1.js', 'levels/f2.js'],
});
