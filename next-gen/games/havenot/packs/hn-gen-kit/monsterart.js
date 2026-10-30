/* HaveNot — packs/hn-gen-kit/monsterart.js
 * Drawn art for monsters (games/havenot/art: sprite sheets made with the ArtCraft tools, art/sprites/sprites.js,
 * kind 'monster'). A monster whose id has a sheet is drawn from it; everything else, and any picture that hasn't
 * loaded, is drawn by its own code as before.
 *
 * A sheet's frames, left to right: idle, walk1, walk2, attack, hurt, death. Which one: dead (its corpse) → death;
 * flashing from a hit → hurt; an attack under way → attack; moving → the two walk frames by how far it has come;
 * otherwise idle. A sheet with `turns` faces the monster's way (drawn facing north); one without stays upright
 * (Eggbots, as the game has always drawn them). `size` is its width in world units for the first monster it draws;
 * the others scale by their radius (a Chatterpillar Gamma is a bigger Alpha).
 * A monster's def.artSkip(e), when it has one, says when to draw it its own way instead (the dormant undead).
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN;
  const FRAME = { idle: 0, walk1: 1, walk2: 2, attack: 3, hurt: 4, death: 5 };
  const img = (a) => {
    if (!a.img) {
      a.img = new Image();
      a.img.src = a.src;
    }
    return a.img.complete && a.img.naturalWidth ? a.img : null;
  };
  function frameOf(e) {
    if (e.dead) return 'death';
    if (e.flash > 0) return 'hurt';
    if (e.atk) return 'attack';
    if (Math.hypot(e.vx || 0, e.vy || 0) > 8) return Math.floor(((e.x || 0) + (e.y || 0)) / 9) % 2 ? 'walk1' : 'walk2';
    return 'idle';
  }
  /** Draw a monster from its sheet; false when it has none ready (the caller draws it the old way). */
  function drawMonster(g, e, a, k = 1) {
    const im = img(a);
    if (!im) return false;
    const f = FRAME[frameOf(e)] || 0;
    const w = a.size * k, h = (w * a.h) / a.w;
    g.save();
    if (a.turns) g.rotate((e.facing || 0) + Math.PI / 2);
    g.drawImage(im, f * a.w, 0, a.w, a.h, -w / 2, -h / 2, w, h);
    g.restore();
    return true;
  }
  HN.drawMonsterArt = drawMonster;
  // wrap each monster's draw once every pack has loaded (the first floor)
  let wrapped = false;
  function wrap() {
    if (wrapped) return;
    wrapped = true;
    for (const a of Object.values(HN.ART || {})) {
      if (a.kind !== 'monster') continue;
      const first = LM.find('enemies', (a.enemies || [])[0]);
      for (const id of a.enemies || []) {
        const def = LM.find('enemies', id);
        if (!def || def.hnArt) continue;
        const own = def.draw;
        const k = first && first.radius && def.radius ? def.radius / first.radius : 1;
        def.hnArt = a;
        def.draw = function (g, e, t, game) {
          if (!e.noArt && !(def.artSkip && def.artSkip(e)) && drawMonster(g, e, a, k)) return;
          if (own) own.call(this, g, e, t, game);
        };
      }
    }
  }
  HN.wrapMonsterArt = wrap;
  LM.on('levelLoaded', wrap);
})();
