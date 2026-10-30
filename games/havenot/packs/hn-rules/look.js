/* HaveNot — packs/hn-rules/look.js
 * How the scavenger looks on the map, from the origin and the mutations (engine SPEC 6.25, LM.playerLook).
 *
 * Human: the engine's own scavenger. Mutant Hyena: tan spotted fur, a long dark muzzle, round ears, a mane
 * and a bushy tail. Random Mutant: grey-green skin (pale cyan with Glowing Skin), bald, and one visible change
 * for each mutation that shows: chitin plates, a third arm, stalk eyes, a bulging cranium, quills down the back,
 * acid drool, a heavy brow (Thick Skull) and bat ears (Echolocation). The rest only show on the character sheet.
 * Drawn in the player's frame: origin at the body centre, +x along the aim.
 *
 * With the drawn art loaded (art/build-sprites.mjs, the 'scavenger' layers), all three wear it over the engine's
 * scavenger: a coat in the body armour's colour, sleeves and hands on the gun, a pack and a strap, the hair or
 * helmet in its colour, and a head for the origin. Chitin, quills and the third arm are drawn; the smaller
 * mutations go on top as above. Until it loads, they look as above.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;
  const HN = (LM.HN = LM.HN || {});

  const FUR = '#b8925f', FUR_DARK = '#3b2d21', MUZZLE = '#7a5b3c';
  const MUTANT = '#9aa88a', GLOW = '#c4efe9';

  const disc = (g, x, y, r, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, r, 0, U.TAU);
    g.fill();
  };
  const oval = (g, x, y, rx, ry, a, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(x, y, rx, ry, a, 0, U.TAU);
    g.fill();
  };
  // a helmet sits over the back of whatever skull is under it
  const helmet = (g, x, r, hc) => {
    g.fillStyle = hc;
    g.beginPath();
    g.arc(x, 0, r, Math.PI * 0.45, Math.PI * 1.55);
    g.fill();
  };
  const swing = (P) => Math.sin(P.walk * 2.2) * Math.min(1, Math.hypot(P.vx, P.vy) / 120);

  // ---- the drawn layers: greys on white come out in a colour (multiplied), the rest are drawn as they are.
  // HN.artSheet and HN.artPut are shared with the people (hn-sites/person.js).
  const tints = new Map();
  /** A sheet of drawn art (HN.ART[id], art/sprites/sprites.js) once its picture is loaded, else null. */
  HN.artSheet = (id) => {
    const a = HN.ART && HN.ART[id];
    if (!a) return null;
    if (!a.img) {
      a.img = new Image();
      a.img.src = a.src;
    }
    return a.img.complete && a.img.naturalWidth ? a : null;
  };
  const sheet = () => HN.artSheet('scavenger');
  function layer(a, name, col) {
    const key = a.file + name + (col || '');
    let c = tints.get(key);
    if (!c) {
      const i = a.states.indexOf(name);
      c = document.createElement('canvas');
      c.width = a.w;
      c.height = a.h;
      const x = c.getContext('2d');
      x.drawImage(a.img, i * a.w, 0, a.w, a.h, 0, 0, a.w, a.h);
      if (col) {
        x.globalCompositeOperation = 'multiply';
        x.fillStyle = col;
        x.fillRect(0, 0, a.w, a.h);
        x.globalCompositeOperation = 'destination-in';
        x.drawImage(a.img, i * a.w, 0, a.w, a.h, 0, 0, a.w, a.h);
      }
      tints.set(key, c);
    }
    return c;
  }
  /** A layer in a body's own frame (+x forward): drawn facing north, so turned a quarter; `flip` mirrors it side to side. */
  function put(g, a, name, col, dx = 0, k = 1, flip = false) {
    const s = (a.size / a.w) * k;
    g.save();
    g.translate(dx, 0);
    if (flip) g.scale(1, -1);
    g.rotate(Math.PI / 2);
    g.scale(s, s);
    g.drawImage(layer(a, name, col), -a.w / 2, -a.h / 2);
    g.restore();
  }
  HN.artPut = put;
  const coatOf = (P) => {
    const b = P.equip && P.equip.body ? LM.get('armor', P.equip.body) : null;
    return b ? b.color : '#4d5a6e';
  };
  /** The drawn look, over the procedural one for the origin (`base`; null for a human). */
  function drawn(base, origin, muts) {
    const has = (m) => muts.includes(m);
    const skin = (base && base.skin) || '#d9b48f';
    return {
      skin,
      under(g, P) {
        const a = sheet();
        if (origin === 'hyena') {
          // the tail, wagging with the stride from the base of the spine
          g.save();
          g.translate(-6.8, 0);
          g.rotate(swing(P) * 0.45);
          g.translate(6.8, 0);
          put(g, a, 'tail-hyena');
          g.restore();
        }
        if (has('arm')) put(g, a, 'arm3', skin, -swing(P) * 1.4);
      },
      over(g, P, game, t, kick) {
        const a = sheet(), coat = coatOf(P);
        put(g, a, 'torso', coat);
        put(g, a, 'gear');
        put(g, a, 'arms', U.shade(coat, -0.15), -kick * 0.5);
        put(g, a, 'hands', skin, -kick * 0.5);
        if (has('chitin')) put(g, a, 'chitin');
        if (has('quills')) put(g, a, 'quills');
      },
      head(g, P, game, t, hc, worn) {
        const a = sheet();
        if (origin === 'mutant') {
          // the drawn skull under the procedural mutations (a bulging cranium is a bigger skull)
          base.head(g, P, game, t, hc, worn, (cx, r) => {
            put(g, a, 'head-mutant', skin, cx - 0.4, r / 4.5);
            if (worn) put(g, a, 'helmet', hc, cx - 0.4, r / 4.5);
          });
          return;
        }
        if (origin === 'hyena') put(g, a, 'head-hyena');
        else put(g, a, 'head-human', skin);
        if (worn) put(g, a, 'helmet', hc);
        else if (origin !== 'hyena') put(g, a, 'hair', hc);
      },
    };
  }

  const HYENA = {
    skin: FUR,
    under(g, P) {
      // tail, wagging with the stride
      const a = Math.PI + swing(P) * 0.45;
      g.save();
      g.translate(-7, 0);
      g.rotate(a);
      oval(g, 4.5, 0, 4.8, 2.3, 0, FUR);
      oval(g, 8, 0, 2.2, 1.9, 0, FUR_DARK);
      g.restore();
    },
    over(g) {
      // the mane runs down the back of the neck
      oval(g, -5, 0, 3.2, 1.4, 0, FUR_DARK);
    },
    head(g, P, game, t, hc, worn) {
      disc(g, -0.2, 0, 4.4, FUR);
      for (const [x, y] of [[-2, 1.7], [-0.4, -2.3], [1.4, 1.9], [-2.6, -1.1]]) disc(g, x, y, 0.75, FUR_DARK);
      oval(g, 4.2, 0, 3.6, 2.3, 0, MUZZLE);
      disc(g, 7.4, 0, 1.15, '#141110');
      if (worn) helmet(g, -0.6, 4.6, hc);
      else oval(g, -3.4, 0, 2.6, 1.1, 0, FUR_DARK);
      // round ears, which come through a helmet too
      for (const side of [-1, 1]) {
        oval(g, -1.8, 4.3 * side, 2.4, 1.7, 0.5 * side, FUR_DARK);
        oval(g, -1.6, 4.1 * side, 1.2, 0.8, 0.5 * side, '#8c5b52');
      }
    },
  };

  function mutantLook(muts) {
    const has = (m) => muts.includes(m);
    const skin = has('glow') ? GLOW : MUTANT;
    const dark = U.shade(skin, -0.35);
    const big = has('cranium');
    return {
      skin,
      under(g, P) {
        if (!has('arm')) return;
        // the third arm hangs off the left shoulder blade and swings out of step
        const s = -swing(P) * 1.4;
        oval(g, 0.5 + s, -9.6, 4.2, 1.9, 0.45, U.shade(skin, -0.15));
        disc(g, 4.4 + s, -11.4, 1.7, skin);
      },
      over(g) {
        if (has('chitin')) {
          for (const side of [-1, 1]) {
            oval(g, -1.5, 7 * side, 3.8, 2.5, 0.25 * side, '#4f3f31');
            g.strokeStyle = '#8a7258';
            g.lineWidth = 0.7;
            g.beginPath();
            g.ellipse(-1.5, 7 * side, 2.6, 1.5, 0.25 * side, Math.PI * 0.9, Math.PI * 1.8);
            g.stroke();
          }
          oval(g, -4.5, 0, 2.6, 4, 0, '#4f3f31');
        }
        if (has('quills')) {
          g.fillStyle = '#e6dcc2';
          for (let i = 0; i < 5; i++) {
            const y = -4.8 + i * 2.4, x = -6.2 + Math.abs(i - 2) * 0.6;
            g.beginPath();
            g.moveTo(x, y - 0.9);
            g.lineTo(x - 5.2, y * 1.25);
            g.lineTo(x, y + 0.9);
            g.closePath();
            g.fill();
            disc(g, x - 5, y * 1.25, 0.55, '#2b2620');
          }
        }
      },
      // skull(cx, r), when given, draws the skull and any helmet instead (the drawn head); the rest goes on top
      head(g, P, game, t, hc, worn, skull) {
        const r = big ? 5.7 : 4.5, cx = big ? -0.8 : 0.4;
        if (has('echo')) {
          for (const side of [-1, 1]) {
            g.fillStyle = dark;
            g.beginPath();
            g.moveTo(1.2, 3 * side);
            g.lineTo(-2.5, 10 * side);
            g.lineTo(-4.4, 7.4 * side);
            g.lineTo(-2.6, 2.4 * side);
            g.closePath();
            g.fill();
          }
        }
        if (skull) skull(cx, r);
        else {
          disc(g, cx, 0, r, skin);
          // blotches on the bare scalp
          for (const [x, y, br] of [[-2, 1.6, 1.1], [-0.6, -2.2, 0.8], [-3, -0.9, 0.6]]) disc(g, cx - 0.4 + x, y, br, U.shade(skin, -0.18));
        }
        if (big && !(skull && worn)) {
          // veins over the dome
          g.strokeStyle = U.shade(skin, -0.25);
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(-4, -2);
          g.quadraticCurveTo(-1.5, -3.6, 0.6, -1.6);
          g.moveTo(-3.6, 2.4);
          g.quadraticCurveTo(-1, 3.4, 0.2, 1.2);
          g.stroke();
        }
        if (has('skull')) oval(g, cx + r - 1.4, 0, 1.4, r * 0.8, 0, dark);
        if (worn && !skull) helmet(g, cx - 1, r + 0.3, hc);
        if (has('eyes')) {
          g.strokeStyle = skin;
          g.lineWidth = 1.1;
          for (const side of [-1, 1]) {
            const ex = 7 + Math.sin(t * 3 + side) * 0.6, ey = 4.2 * side;
            g.beginPath();
            g.moveTo(cx + 2, 1.8 * side);
            g.lineTo(ex, ey);
            g.stroke();
            disc(g, ex, ey, 1.5, '#f2efe4');
            disc(g, ex + 0.5, ey, 0.7, '#121212');
          }
        }
        if (has('acid')) {
          // green drool, dripping
          const d = (t * 1.6) % 1;
          oval(g, cx + r - 0.4, 0.6, 1.3, 0.9, 0, '#9dff3a');
          disc(g, cx + r + 0.6 + d * 2.4, 0.9, 0.6 * (1 - d * 0.5), '#9dff3a');
        }
      },
    };
  }

  // the look only changes when the character does, so it is built once per origin and roll
  let key = null, look = null, art = null;
  LM.playerLook = function (P) {
    const s = P.data && P.data.hn;
    if (!s || !s.created) return null;
    const muts = s.origin === 'mutant' ? s.mutations : [];
    const k = s.origin + ':' + muts.join(',');
    if (k !== key) {
      key = k;
      look = s.origin === 'hyena' ? HYENA : s.origin === 'mutant' ? mutantLook(muts) : null;
      art = drawn(look, s.origin, muts);
    }
    return sheet() ? art : look;
  };
})();
