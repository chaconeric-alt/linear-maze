/* HaveNot — packs/hn-stubs/stubs.js
 * Arriving at the Bolt Hole counts as finding it (the epilogue and the ledger say so).
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN;
  HN.onArrive((game, def) => {
    if (def.id === 'hn-bolthole') HN.setFlag(game, 'hnBoltHoleFound');
  });
})();
