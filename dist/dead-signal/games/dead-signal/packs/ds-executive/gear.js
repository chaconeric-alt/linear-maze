/* Dead Signal — packs/ds-executive/gear.js
 * What the executive floor gives you (DESIGN.md 6.2):
 *   ds-director-coat   the Director's coat (body), in his closet behind the library: the best armour in the
 *                      building, and it fits you, which is its own kind of cost
 *   ds-gorgon-eye      the bronze Medusa's eye, green glass (trinket): her look slides off you
 */
'use strict';
(function () {
  const LM = window.LM;
  const armor = {
    'ds-director-coat': {
      name: 'The Director’s Coat', slot: 'body', color: '#141414', trim: '#c9a046',
      mods: { armor: 0.24, maxHp: 25, maxShield: 15, speed: -6 }, resist: { held: 0.5, staggered: 0.5, webbed: 0.6 },
      desc: 'Black wool lined with red silk, the labrys in gold thread inside the collar where only the wearer sees it. There are plates sewn into the lining. It was cut for him, and it fits you perfectly, and you try not to think about why.',
    },
    'ds-gorgon-eye': {
      name: 'The Gorgon’s Eye', slot: 'trinket', color: '#4a8a72', trim: '#c8ff9a',
      mods: { maxShield: 15, shieldRegen: 2 }, resist: { stone: 1, petrified: 0.7 },
      desc: 'An eye of green glass, prised out of the bronze. It’s warm. Whatever she did with it, she can’t do to whoever carries it.',
    },
  };
  LM.definePack({ id: 'ds-executive', armor });
})();
