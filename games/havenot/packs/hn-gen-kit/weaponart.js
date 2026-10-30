/* HaveNot — packs/hn-gen-kit/weaponart.js
 * The guns drawn from the art (games/havenot/art, the 'weapons' layers: one per gun, named for its id without
 * 'hn-'). Each is drawn along the aim in the player's own units, so it serves in hand and, through the engine's
 * weapon icons (LM.ui icons.weapon, which draw the held gun), on the loot and inventory screens too. A gun
 * without a picture, or before the sheet has loaded, is drawn by its own drawHeld as before.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN;
  const X0 = -2, Y0 = -4; // where the frame's top-left corner sits in the player's frame

  function wrap() {
    const a = HN.ART && HN.ART.weapons;
    if (!a) return;
    for (const name of a.states) {
      const def = LM.find('weapons', 'hn-' + name);
      if (!def || def.hnArt) continue;
      const own = def.drawHeld, i = a.states.indexOf(name);
      def.hnArt = name;
      def.drawHeld = function (g, p, k) {
        const s = HN.artSheet('weapons');
        if (!s) return own && own.call(this, g, p, k);
        const h = (a.size * a.h) / a.w;
        g.drawImage(s.img, i * a.w, 0, a.w, a.h, X0 - (k || 0), Y0, a.size, h);
      };
    }
  }
  HN.wrapWeaponArt = wrap;
  wrap();
  LM.on('levelLoaded', wrap);
})();
