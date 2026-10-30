/* HaveNot — packs/hn-sites/person.js
 * People drawn from the art (games/havenot/art, the 'person' layers: a paper doll in greys on white), each layer
 * tinted from the person's look: shirt and sleeves, a jacket, tie and lanyard, skin, the hair in its style,
 * glasses. The headset and a lanyard's pass are drawn as they are. Feet, a chair when sitting, and anything held
 * are drawn as the engine draws them (LM.gfx.person, which also draws anyone until the art has loaded).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  const HN = LM.HN;
  const HAIR = { short: 1, buzz: 1, long: 1, ponytail: 1, bun: 1, curly: 1, bald: 1 };
  const engine = G.person;

  G.person = function (g, n, t) {
    const a = HN.artSheet && HN.artSheet('person');
    if (!a) return engine(g, n, t);
    const put = HN.artPut;
    const L = n.look || {};
    const skin = L.skin || '#c8946e', hair = L.hair || '#2a1e16', shirt = L.shirt || '#5a6a80';
    const pants = L.pants || '#2a2e38', shoes = L.shoes || '#1c1a18';
    const moving = Math.hypot(n.vx || 0, n.vy || 0) > 5;
    // the chair and the legs, or the feet, as the engine draws them
    if (n.sitting) {
      g.save();
      g.rotate(n.baseFacing);
      g.fillStyle = '#17181c';
      g.beginPath();
      g.arc(-1, 0, 9.5, 0, U.TAU);
      g.fill();
      g.fillStyle = L.chair || '#2d3038';
      G.roundRect(g, -13, -9, 5, 18, 2);
      g.fill();
      g.restore();
    }
    g.rotate(n.facing);
    if (n.sitting) {
      g.fillStyle = pants;
      g.fillRect(2, -4.6, 8, 3.4);
      g.fillRect(2, 1.2, 8, 3.4);
      g.fillStyle = shoes;
      g.fillRect(9, -4.6, 2.6, 3.4);
      g.fillRect(9, 1.2, 2.6, 3.4);
    } else {
      const stride = moving ? Math.sin((n.walk || 0) * 2.2) * 3.5 : 0;
      g.fillStyle = shoes;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.ellipse(stride * side, 3.6 * side, 3.2, 2.2, 0, 0, U.TAU);
        g.fill();
      }
    }
    // the body
    put(g, a, 'shirt', shirt);
    if (L.blazer) put(g, a, 'blazer', L.blazer);
    if (L.tie) put(g, a, 'tie', L.tie);
    if (L.lanyard) {
      put(g, a, 'lanyard', L.lanyard);
      put(g, a, 'card');
    }
    // arms swinging out of step, and whatever they hold
    const sway = moving ? Math.sin((n.walk || 0) * 2.2) * 1.2 : 0;
    const sleeve = U.shade(shirt, -0.12);
    put(g, a, 'sleeve', sleeve, sway);
    put(g, a, 'sleeve', sleeve, -sway, 1, true);
    put(g, a, 'hand', skin, sway);
    put(g, a, 'hand', skin, -sway, 1, true);
    if (L.holding) G.held(g, L.holding, t);
    // the head
    put(g, a, 'head', skin);
    const hs = HAIR[L.hairStyle] ? L.hairStyle : 'short';
    put(g, a, 'hair-' + hs, hs === 'bald' ? null : hair);
    if (L.glasses) put(g, a, 'glasses', L.glasses === true ? '#141418' : L.glasses);
    if (L.headset) put(g, a, 'headset');
  };
})();
