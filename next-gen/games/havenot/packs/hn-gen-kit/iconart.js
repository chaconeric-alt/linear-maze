/* HaveNot — packs/hn-gen-kit/iconart.js
 * Item pictures from the art (games/havenot/art, the 'icons' layers): an item's own where it has one (its id without
 * 'hn-'), else its category's ('cat-' and the category, lower case). HN.iconArt(d) gives a picture as a data URL for
 * the satchel's rows (hn-rules/state.js); HN.drawIconArt draws one on the ground (the 'hn-loot' find). Either says
 * no (null, false) until the sheet has loaded, and the letter-on-a-tile icons stand in.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN;
  const urls = new Map();
  function frame(d) {
    const a = HN.artSheet && HN.artSheet('icons');
    if (!a || !d) return null;
    let i = a.states.indexOf(String(d.id || '').replace(/^hn-/, ''));
    if (i < 0) i = a.states.indexOf('cat-' + String(d.cat || '').toLowerCase().replace(/\s+/g, '-'));
    return i < 0 ? null : { a, i };
  }
  HN.iconArt = function (d) {
    const f = frame(d);
    if (!f) return null;
    let u = urls.get(f.i);
    if (!u) {
      const c = document.createElement('canvas');
      c.width = f.a.w;
      c.height = f.a.h;
      c.getContext('2d').drawImage(f.a.img, f.i * f.a.w, 0, f.a.w, f.a.h, 0, 0, f.a.w, f.a.h);
      u = c.toDataURL();
      urls.set(f.i, u);
    }
    return u;
  };
  /** Draw an item's picture centred on the origin, `size` world units across; false when there's none to draw. */
  HN.drawIconArt = function (g, d, size) {
    const f = frame(d);
    if (!f) return false;
    g.drawImage(f.a.img, f.i * f.a.w, 0, f.a.w, f.a.h, -size / 2, -size / 2, size, size);
    return true;
  };
})();
