/* HaveNot — packs/hn-g-bunker/site.js
 * Its pin on the near-area map (it replaces the “bunker” stub).
 */
'use strict';
window.LM.HN.genSite({
  slug: 'bunker',
  replaces: 'bunker',
  levels: ['hn-g-bunker-f1', 'hn-g-bunker-f2'],
  pin: {
    id: 'bunker',
    level: 'hn-g-bunker-f1',
    name: 'The Bunker',
    kind: 'Age of War command bunker',
    state: 'known',
    desc: 'A blast door in a hillside, half-buried in red sand. Someone has painted KEEP OUT on it, then crossed it out and painted PLEASE.',
    services: ['Treasure'],
    dangers: ['Knife Fighter', 'Monoid', 'Traps'],
  },
});
