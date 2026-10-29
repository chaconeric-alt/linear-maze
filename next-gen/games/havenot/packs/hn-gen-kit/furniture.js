/* HaveNot — packs/hn-gen-kit/furniture.js
 * The furniture of content libraries' rooms (gen/library/settings10: 591 named objects). Every object belongs to a
 * drawing family (companion.json `archetypes`: throne, vat, console, cage, coffin, conveyor...) and is drawn by
 * that family's painter in its setting's palette, with details varied by its own name, so no two pieces read as
 * the same placeholder. States show: worn and ruined (props.state 1, 2), a device's malfunction or shutdown, an
 * out-of-place piece (props.odd).
 *
 *   hn-s10       a floor piece: props { name, fam, set, w, h (tiles), state, dev..., odd }; solid, w × h tiles
 *   hn-s10w      a wall-mounted piece (screens, signs, mirrors, windows): props { name, fam, set, face }
 *   hn-s10-decal what history left on the floor: props.kind scorch | ash | rubble | crack | stain | water | growth |
 *                spores | sigil | candles | bedroll | graffiti | cables | oil | papers | polish
 *   HN.S10_FAMILIES  the families drawn here; HN.s10Palette(set)
 * Devices (props.dev) are worked by devices.js.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, U = LM.util, G = LM.gfx, T = LM.TILE;
  const sh = (c, k) => U.shade(c, k);
  const DEFAULT_PAL = { base: '#6a6a70', dark: '#2a2a30', trim: '#a8a8b0', accent: '#7ad8ff', cloth: '#5a5a7a' };
  let palCache = null;
  HN.s10Palette = function (set) {
    if (!palCache) {
      palCache = {};
      const libs = (window.LMGen && window.LMGen.libraries && window.LMGen.libraries.havenot && window.LMGen.libraries.havenot.content) || {};
      for (const c of Object.values(libs)) for (const s of Object.values(c.settings || {})) if (s.palette) palCache[s.id] = s.palette;
    }
    return palCache[set] || DEFAULT_PAL;
  };
  const hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    return h;
  };
  const box = (g, x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  const rbox = (g, x, y, w, h, rr, c) => {
    g.fillStyle = c;
    G.roundRect(g, x, y, w, h, rr);
    g.fill();
  };
  const lights = (g, t, x, y, n, cols, seed, step) => {
    for (let i = 0; i < n; i++) {
      const on = Math.sin(t * (1.5 + (i % 3)) + i * 1.9 + seed) > -0.3;
      g.fillStyle = on ? cols[i % cols.length] : '#1a1c20';
      g.fillRect(x + i * (step || 2.6), y, 1.6, 1.6);
    }
  };

  // ------------------------------------------------------------ the families: draw(g, W, H, p, r, t, it) about the centre
  const FAM = {
    throne(g, W, H, p, r, t) {
      rbox(g, -W / 2, -H / 2, W, H, 4, p.dark);
      rbox(g, -W / 2 + 3, -H / 2 + 2, W - 6, H * 0.35, 3, p.trim);
      rbox(g, -W / 2 + 6, -H / 2 + H * 0.3, W - 12, H * 0.6, 3, p.cloth);
      box(g, -W / 2 + 2, -H / 2 + 6, 4, H - 10, p.trim);
      box(g, W / 2 - 6, -H / 2 + 6, 4, H - 10, p.trim);
      for (let i = 0; i < 3; i++) G.circle(g, -W / 4 + i * (W / 4), -H / 2 + 4, 2, p.accent);
    },
    dais(g, W, H, p, r) {
      rbox(g, -W / 2, -H / 2, W, H, 3, sh(p.base, -0.2));
      rbox(g, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, 3, p.base);
      box(g, -W / 2 + 3, H / 2 - 6, W - 6, 2, p.trim);
      if (r() < 0.6) rbox(g, -6, -H / 2 + 5, 12, 8, 2, p.cloth);
    },
    altar(g, W, H, p, r, t) {
      rbox(g, -W / 2, -H / 2, W, H, 2, sh(p.base, -0.1));
      box(g, -W / 2 + 2, -H / 2 + 2, W - 4, 3, p.trim);
      for (let i = 0; i < 4; i++) G.circle(g, -W / 2 + 6 + i * ((W - 12) / 3), H / 2 - 5, 1.6, '#ffe8a0');
      G.circle(g, 0, 0, 4, p.accent);
    },
    coffin(g, W, H, p, r) {
      g.fillStyle = p.dark;
      g.beginPath();
      g.moveTo(-W * 0.3, -H / 2); g.lineTo(W * 0.3, -H / 2); g.lineTo(W / 2, -H * 0.25); g.lineTo(W * 0.35, H / 2); g.lineTo(-W * 0.35, H / 2); g.lineTo(-W / 2, -H * 0.25);
      g.closePath();
      g.fill();
      g.strokeStyle = p.trim;
      g.lineWidth = 1;
      g.stroke();
      box(g, -1, -H * 0.3, 2, H * 0.45, p.trim);
      box(g, -W * 0.2, -H * 0.15, W * 0.4, 2, p.trim);
    },
    statue(g, W, H, p, r) {
      rbox(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 2, sh(p.base, -0.3));
      G.circle(g, 0, 2, Math.min(W, H) * 0.32, sh(p.trim, -0.1));
      G.circle(g, 0, -3, Math.min(W, H) * 0.2, p.trim);
      box(g, -W * 0.35, 0, W * 0.7, 3, sh(p.trim, -0.25));
    },
    mannequin(g, W, H, p, r, t) {
      G.circle(g, 0, 0, Math.min(W, H) * 0.36, sh(p.base, -0.2));
      G.circle(g, 0, 0, Math.min(W, H) * 0.28, p.cloth);
      G.circle(g, 0, -1, Math.min(W, H) * 0.14, '#d8d0c8');
      box(g, -W * 0.38, -1, W * 0.76, 2.4, '#c8c0b8');
    },
    chandelier(g, W, H, p, r, t) {
      for (let i = 0; i < 8; i++) { const a = (i / 8) * U.TAU + t * 0.1; G.circle(g, Math.cos(a) * W * 0.32, Math.sin(a) * H * 0.32, 1.6, p.accent); }
      G.circle(g, 0, 0, 3, p.trim);
    },
    plant(g, W, H, p, r, t) {
      const n = 5 + Math.floor(r() * 4), R = Math.min(W, H) * 0.42;
      G.circle(g, 0, 0, R * 0.5, '#3a2a1a');
      for (let i = 0; i < n; i++) {
        const a = (i / n) * U.TAU + r() * 0.5, d = R * (0.4 + r() * 0.5);
        G.circle(g, Math.cos(a) * d, Math.sin(a) * d + Math.sin(t + i) * 0.4, R * (0.35 + r() * 0.25), i % 2 ? '#2e5a24' : '#46803a');
      }
    },
    fountain(g, W, H, p, r, t) {
      G.circle(g, 0, 0, Math.min(W, H) / 2, p.trim);
      G.circle(g, 0, 0, Math.min(W, H) / 2 - 3, '#2a5a7a');
      for (let i = 0; i < 3; i++) { g.strokeStyle = U.rgba('#a8e0ff', 0.5); g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, 4 + ((t * 6 + i * 5) % 14), 0, U.TAU); g.stroke(); }
      G.circle(g, 0, 0, 4, p.base);
    },
    bath(g, W, H, p) {
      rbox(g, -W / 2, -H / 2, W, H, 6, p.trim);
      rbox(g, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, 5, '#4a8aa8');
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(-W / 4, -H / 4, W / 3, 1.2);
      box(g, -2, -H / 2, 4, 3, p.dark);
    },
    washroom(g, W, H, p) {
      rbox(g, -W / 2 + 2, -H / 2 + 2, W - 4, H - 4, 3, '#e8ecee');
      G.circle(g, 0, 2, Math.min(W, H) * 0.25, '#c8d0d4');
      box(g, -W / 2 + 4, -H / 2 + 3, W - 8, 4, p.trim);
    },
    bed(g, W, H, p, r) {
      rbox(g, -W / 2, -H / 2, W, H, 3, p.dark);
      rbox(g, -W / 2 + 2, -H / 2 + 2, W - 4, H - 4, 2, p.cloth);
      rbox(g, -W / 2 + 4, -H / 2 + 3, W - 8, Math.min(8, H * 0.2), 2, '#e8e4dc');
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(-W / 2 + 2, -H / 2 + H * 0.45, W - 4, 1.2);
    },
    pod(g, W, H, p, r, t) {
      rbox(g, -W / 2, -H / 2, W, H, Math.min(W, H) / 2, p.dark);
      rbox(g, -W / 2 + 2, -H / 2 + 2, W - 4, H - 4, Math.min(W, H) / 2 - 2, U.rgba(p.accent, 0.35));
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(-W / 4, -H / 3, 1.4, H / 2);
      lights(g, t, -W / 2 + 3, H / 2 - 4, 3, [p.accent, '#4ad88a'], W);
    },
    vat(g, W, H, p, r, t) {
      const R = Math.min(W, H) / 2;
      G.circle(g, 0, 0, R, p.trim);
      G.circle(g, 0, 0, R - 2, U.rgba(p.accent, 0.55));
      for (let i = 0; i < 3; i++) G.circle(g, Math.sin(t * 1.5 + i * 2) * R * 0.4, Math.cos(t + i) * R * 0.4, 1.2, 'rgba(255,255,255,0.4)');
      box(g, -1, -R, 2, 3, p.dark);
    },
    drum(g, W, H, p, r) {
      const R = Math.min(W, H) * 0.4;
      G.circle(g, 0, 0, R, sh(p.base, -0.1));
      g.strokeStyle = p.dark;
      g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, R * 0.7, 0, U.TAU); g.stroke();
      if (r() < 0.5) { g.fillStyle = p.accent; g.fillRect(-2, -R * 0.3, 4, R * 0.6); }
    },
    crate(g, W, H, p, r) {
      rbox(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 1, sh(p.base, -0.05));
      g.strokeStyle = p.dark;
      g.lineWidth = 1;
      g.strokeRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6);
      g.beginPath(); g.moveTo(-W / 2 + 3, -H / 2 + 3); g.lineTo(W / 2 - 3, H / 2 - 3); g.stroke();
    },
    cage(g, W, H, p, r) {
      box(g, -W / 2, -H / 2, W, H, 'rgba(0,0,0,0.25)');
      g.strokeStyle = p.trim;
      g.lineWidth = 1.2;
      g.strokeRect(-W / 2 + 1, -H / 2 + 1, W - 2, H - 2);
      for (let x = -W / 2 + 4; x < W / 2; x += 4) { g.beginPath(); g.moveTo(x, -H / 2 + 1); g.lineTo(x, H / 2 - 1); g.stroke(); }
    },
    conveyor(g, W, H, p, r, t) {
      box(g, -W / 2, -H / 2 + 2, W, H - 4, p.dark);
      g.fillStyle = sh(p.base, -0.1);
      for (let x = -W / 2 + ((t * 20) % 6); x < W / 2; x += 6) g.fillRect(x, -H / 2 + 4, 3, H - 8);
      box(g, -W / 2, -H / 2 + 2, W, 1.4, p.trim);
      box(g, -W / 2, H / 2 - 3.4, W, 1.4, p.trim);
      if (r() < 0.5) rbox(g, -4 + Math.sin(t) * W * 0.3, -4, 8, 8, 1, p.cloth);
    },
    furnace(g, W, H, p, r, t) {
      rbox(g, -W / 2, -H / 2, W, H, 2, '#3a2a20');
      rbox(g, -W / 2 + 4, -H / 2 + 3, W - 8, H - 6, 2, '#1a0a04');
      const glow = 0.5 + 0.3 * Math.sin(t * 3);
      box(g, -W / 2 + 6, -H / 2 + 5, W - 12, H - 10, U.rgba('#ff6a1a', glow));
      box(g, -W / 2, -H / 2, W, 2, p.trim);
    },
    turbine(g, W, H, p, r, t) {
      const R = Math.min(W, H) / 2;
      G.circle(g, 0, 0, R, p.dark);
      G.circle(g, 0, 0, R - 2, sh(p.base, -0.1));
      g.save();
      g.rotate(t * 3);
      g.fillStyle = p.trim;
      for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.fillRect(-1.5, 2, 3, R - 5); }
      g.restore();
      G.circle(g, 0, 0, 3, p.accent);
    },
    arm(g, W, H, p, r, t) {
      G.circle(g, 0, 0, Math.min(W, H) * 0.3, p.dark);
      g.save();
      g.rotate(Math.sin(t * 0.8 + r() * 6) * 0.6);
      box(g, 0, -1.6, Math.max(W, H) * 0.45, 3.2, p.trim);
      G.circle(g, Math.max(W, H) * 0.45, 0, 2.4, p.accent);
      g.restore();
    },
    press(g, W, H, p, r, t) {
      box(g, -W / 2, -H / 2, W, H, p.dark);
      const down = (Math.sin(t * 1.2) + 1) / 2;
      box(g, -W / 2 + 3, -H / 2 + 2, W - 6, (H - 4) * (0.3 + 0.5 * down), sh(p.base, -0.1));
      g.fillStyle = '#e8c030';
      for (let x = -W / 2; x < W / 2; x += 6) g.fillRect(x, H / 2 - 2, 3, 2);
    },
    pipes(g, W, H, p, r) {
      box(g, -W / 2, -H / 2 + 2, W, 4, p.trim);
      box(g, -W / 2, 1, W, 3, sh(p.trim, -0.2));
      G.circle(g, -W / 4, 0, 3, p.dark);
      G.circle(g, -W / 4, 0, 1.6, p.accent);
    },
    weapon(g, W, H, p, r, t) {
      G.circle(g, 0, 0, Math.min(W, H) * 0.42, p.dark);
      g.save();
      g.rotate(Math.sin(t * 0.5 + r() * 6) * 0.8);
      box(g, 0, -2, Math.max(W, H) * 0.55, 4, sh(p.base, 0.1));
      g.restore();
      G.circle(g, 0, 0, 3, '#ff3a2a');
    },
    drone(g, W, H, p, r, t) {
      const y = Math.sin(t * 2 + r() * 6) * 1.2;
      G.circle(g, 0, y, Math.min(W, H) * 0.3, p.trim);
      G.circle(g, 0, y, Math.min(W, H) * 0.18, p.dark);
      g.strokeStyle = p.trim;
      g.lineWidth = 1;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 4, y); g.lineTo(s * 9, y - 3); g.stroke(); G.circle(g, s * 9, y - 3, 1.6, 'rgba(255,255,255,0.4)'); }
      G.circle(g, 2, y, 1.2, p.accent);
    },
    arch(g, W, H, p, r, t) {
      box(g, -W / 2, -H / 2, 4, H, p.trim);
      box(g, W / 2 - 4, -H / 2, 4, H, p.trim);
      box(g, -W / 2, -H / 2, W, 3, p.trim);
      g.fillStyle = U.rgba(p.accent, 0.25 + 0.15 * Math.sin(t * 4));
      g.fillRect(-W / 2 + 4, -H / 2 + 3, W - 8, H - 3);
    },
    rail(g, W, H, p) {
      g.strokeStyle = p.trim;
      g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(-W / 2 + 2, 0); g.lineTo(W / 2 - 2, 0); g.stroke();
      for (let x = -W / 2 + 2; x <= W / 2 - 2; x += Math.max(6, W / 5)) G.circle(g, x, 0, 2, sh(p.trim, -0.25));
    },
    console(g, W, H, p, r, t, it) {
      rbox(g, -W / 2, -H / 2, W, H, 2, p.dark);
      rbox(g, -W / 2 + 2, -H / 2 + 2, W - 4, H * 0.45, 1, '#1a2a34');
      g.fillStyle = U.rgba(p.accent, 0.6);
      g.fillRect(-W / 2 + 3, -H / 2 + 3, (W - 6) * (0.4 + 0.5 * r()), 1.2);
      lights(g, t, -W / 2 + 3, H / 2 - 5, Math.floor((W - 4) / 3), [p.accent, '#e8c030', '#4ad88a'], it.tx || 0, 3);
    },
    machine(g, W, H, p, r, t, it) {
      rbox(g, -W / 2, -H / 2, W, H, 2, sh(p.base, -0.25));
      box(g, -W / 2 + 2, -H / 2 + 2, W - 4, H - 4, sh(p.base, -0.05));
      G.circle(g, -W / 4, 0, Math.min(W, H) * 0.18, p.dark);
      lights(g, t, 0, -H / 2 + 3, 3, [p.accent, '#ff4a3a'], it.ty || 0);
    },
    shelf(g, W, H, p, r) {
      box(g, -W / 2, -H / 2, W, H, p.dark);
      const cols = [p.cloth, p.accent, p.trim, sh(p.base, 0.2)];
      for (let y = -H / 2 + 2; y < H / 2 - 2; y += 5) for (let x = -W / 2 + 2; x < W / 2 - 3; x += 3 + r() * 2) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, 2, 3.4); }
    },
    locker(g, W, H, p, r) {
      box(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, sh(p.base, -0.15));
      g.fillStyle = p.dark;
      g.fillRect(-0.5, -H / 2 + 1, 1, H - 2);
      for (let y = -H / 2 + 4; y < -H / 2 + 10; y += 2) g.fillRect(-W / 2 + 3, y, W / 2 - 5, 0.8);
      G.circle(g, W / 4, 0, 1, p.trim);
    },
    cabinet(g, W, H, p, r) {
      rbox(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 1, p.base);
      g.fillStyle = p.dark;
      for (let y = -H / 2 + 4; y < H / 2 - 2; y += 6) { g.fillRect(-W / 2 + 3, y, W - 6, 0.8); G.circle(g, 0, y + 3, 0.9, p.trim); }
      if (r() < 0.4) { g.fillStyle = U.rgba(p.accent, 0.4); g.fillRect(-W / 2 + 3, -H / 2 + 3, W - 6, 4); }
    },
    desk(g, W, H, p, r) {
      rbox(g, -W / 2, -H / 2, W, H, 2, sh(p.base, -0.15));
      rbox(g, -W / 2 + 1.5, -H / 2 + 1.5, W - 3, H - 3, 1.5, p.base);
      box(g, -W / 4, -H / 2 + 3, W / 3, 2, '#1a1c20');
      if (r() < 0.6) { g.fillStyle = '#e8e4d8'; g.fillRect(W / 6, -2, 5, 6); }
      box(g, -W / 2 + 1.5, H / 2 - 3, W - 3, 1.5, p.trim);
    },
    table(g, W, H, p, r) {
      rbox(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 2, p.base);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(-W / 2 + 3, -H / 2 + 3, W - 6, 1);
      for (let i = 0; i < Math.floor(W / 14); i++) G.circle(g, -W / 2 + 7 + i * 14, 0, 2.4, r() < 0.5 ? p.trim : '#e8e4d8');
    },
    pews(g, W, H, p) {
      for (let y = -H / 2 + 2; y < H / 2 - 2; y += 7) {
        rbox(g, -W / 2 + 1, y, W - 2, 5, 1.5, sh(p.base, -0.1));
        box(g, -W / 2 + 1, y, W - 2, 1.5, p.cloth);
      }
    },
    chair(g, W, H, p) {
      const R = Math.min(W, H) * 0.32;
      rbox(g, -R, -R, R * 2, R * 2, 3, p.cloth);
      rbox(g, -R, -R, R * 2, R * 0.6, 2, sh(p.cloth, -0.3));
    },
    mirror(g, W, H, p, r, t) {
      box(g, -W / 2, -H / 2, W, H, p.trim);
      const grd = g.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2);
      grd.addColorStop(0, '#c8d8e8');
      grd.addColorStop(0.5, '#ffffff');
      grd.addColorStop(1, '#8aa0b8');
      g.fillStyle = grd;
      g.fillRect(-W / 2 + 1.5, -H / 2 + 1.5, W - 3, H - 3);
    },
    window(g, W, H, p) {
      box(g, -W / 2, -H / 2, W, H, p.dark);
      box(g, -W / 2 + 1.5, -H / 2 + 1.5, W - 3, H - 3, 'rgba(120,170,190,0.55)');
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(-W / 2 + 3, -H / 2 + 2, 1, H - 4);
    },
    screen(g, W, H, p, r, t, it) {
      box(g, -W / 2, -H / 2, W, H, '#14161a');
      const hue = [p.accent, p.cloth, '#4ad88a'][Math.floor(r() * 3)];
      box(g, -W / 2 + 1.5, -H / 2 + 1.5, W - 3, H - 3, U.rgba(hue, 0.55 + 0.1 * Math.sin(t * 2 + (it.tx || 0))));
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 3; i++) g.fillRect(-W / 2 + 3, -H / 2 + 3 + i * 2.2, (W - 6) * (0.3 + r() * 0.6), 0.8);
    },
    sign(g, W, H, p, r) {
      box(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, p.cloth);
      box(g, -W / 2 + 2, -H / 2 + 2, W - 4, 1.4, p.trim);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 2; i++) g.fillRect(-W / 2 + 3, -1 + i * 3, (W - 6) * (0.5 + r() * 0.5), 1);
    },
    lamp(g, W, H, p, r, t) {
      G.circle(g, 0, 0, 3.4, p.dark);
      G.circle(g, 0, 0, 2.2, p.accent);
    },
    tower(g, W, H, p, r, t) {
      box(g, -W * 0.3, -H / 2, W * 0.6, H, p.dark);
      g.strokeStyle = p.trim;
      g.lineWidth = 0.8;
      for (let y = -H / 2 + 2; y < H / 2; y += 4) { g.beginPath(); g.moveTo(-W * 0.3, y); g.lineTo(W * 0.3, y + 4); g.stroke(); }
      G.circle(g, 0, -H / 2 + 2, 1.6, Math.sin(t * 3) > 0 ? '#ff3a2a' : '#3a1a1a');
    },
    tools(g, W, H, p, r) {
      rbox(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 1, sh(p.base, -0.2));
      for (let i = 0; i < 4; i++) { g.fillStyle = [p.trim, '#c84a3a', '#8a8e92', p.accent][i]; g.fillRect(-W / 2 + 3 + i * ((W - 6) / 4), -H / 2 + 3, 2, H - 6); }
    },
    hatch(g, W, H, p, r, t) {
      box(g, -W / 2, -H / 2, W, H, p.dark);
      g.fillStyle = '#0a0a0a';
      g.fillRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6);
      g.fillStyle = sh(p.base, -0.2);
      for (let x = -W / 2 + 3; x < W / 2 - 3; x += 4) g.fillRect(x, -H / 2 + 3, 1.4, H - 6);
      g.fillStyle = '#e8c030';
      g.fillRect(-W / 2, -H / 2, W, 1.5);
    },
  };
  HN.S10_FAMILIES = Object.keys(FAM);

  function drawPiece(g, it, t, W, H) {
    const p = HN.s10Palette(it.props.set), name = it.props.name || '';
    const r = U.mulberry32(hash(name));
    const fam = FAM[it.props.fam] || FAM.machine;
    g.save();
    if (it.props.odd) g.rotate(0.12);
    // a room's centrepiece stands on a plinth with a lit rim, so it carries the room at normal zoom
    if (it.props.centre) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      G.roundRect(g, -W / 2 - 4, -H / 2 - 2, W + 8, H + 8, 6);
      g.fill();
      rbox(g, -W / 2 - 3, -H / 2 - 3, W + 6, H + 6, 5, sh(p.base, -0.35));
      g.strokeStyle = U.rgba(p.accent, 0.45 + 0.1 * Math.sin(t * 1.3));
      g.lineWidth = 1.5;
      G.roundRect(g, -W / 2 - 2.5, -H / 2 - 2.5, W + 5, H + 5, 5);
      g.stroke();
    }
    // turned to face what it's for (props.turn: quarter turns from facing south); a long piece swaps its sides
    const q = it.props.turn || 0, ds = it.props.devState;
    if (ds === 'destroyed') g.rotate(0.07);
    if (q) g.rotate((q * Math.PI) / 2);
    const [fw, fh] = q % 2 ? [H, W] : [W, H];
    // a device's moving parts: still when it's off or wrecked, quick when it's running
    fam(g, fw, fh, p, r, ds === 'disabled' || ds === 'destroyed' ? 0 : ds === 'active' ? t * 2.2 : t, it);
    if (q) g.rotate((-q * Math.PI) / 2);
    // state: grime and damage; a broken device goes dark
    const st = it.props.state || 0;
    if (st >= 1) {
      g.fillStyle = 'rgba(30,24,18,0.18)';
      g.fillRect(-W / 2, -H / 2, W, H);
    }
    if (st >= 2) {
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-W / 3, -H / 2 + 2);
      g.lineTo(0, 0);
      g.lineTo(W / 4, H / 2 - 2);
      g.stroke();
    }
    // a device's state, drawn: damaged (partly working) has a panel off and a crack; disabled is dark; destroyed is
    // charred, split and skewed, with shards round it; a device whose trap just went off flashes red
    if (ds === 'partly-working') {
      g.fillStyle = 'rgba(10,10,12,0.55)';
      g.fillRect(W / 2 - Math.min(10, W / 3), -H / 2 + 2, Math.min(8, W / 3 - 2), Math.min(7, H / 3));
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-W / 2 + 3, H / 4);
      g.lineTo(-W / 6, 0);
      g.lineTo(0, H / 3);
      g.stroke();
    }
    if (ds === 'disabled') {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(-W / 2, -H / 2, W, H);
    }
    if (ds === 'destroyed') {
      g.fillStyle = 'rgba(12,8,6,0.62)';
      g.fillRect(-W / 2, -H / 2, W, H);
      g.strokeStyle = 'rgba(255,140,60,0.35)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-W / 2 + 2, -H / 2 + 3);
      g.lineTo(-W / 8, -H / 10);
      g.lineTo(W / 10, H / 8);
      g.lineTo(W / 2 - 2, H / 2 - 3);
      g.stroke();
      const rr = U.mulberry32(hash(name + 'x'));
      g.fillStyle = sh(p.base, -0.3);
      for (let i = 0; i < 4; i++) g.fillRect(-W / 2 - 4 + rr() * (W + 8), H / 2 - 1 + rr() * 5, 2 + rr() * 3, 2);
    }
    if (it.props.dev && it._trigT > 0) {
      g.strokeStyle = 'rgba(255,40,40,' + (0.5 + 0.5 * Math.sin(t * 18)) + ')';
      g.lineWidth = 2;
      g.strokeRect(-W / 2 - 2, -H / 2 - 2, W + 4, H + 4);
    }
    // the status lamp every device has
    if (it.props.dev && ds !== 'destroyed') {
      const lamp = { working: '#4ad88a', 'partly-working': '#e8c030', malfunctioning: Math.sin(t * 11) > 0 ? '#ffb020' : '#ff3a2a', disabled: '#6a1a1a', active: '#7affff' }[ds || 'working'] || '#4ad88a';
      G.circle(g, -W / 2 + 3.5, -H / 2 + 3.5, 2.2, '#101012');
      G.circle(g, -W / 2 + 3.5, -H / 2 + 3.5, 1.5, ds === 'active' ? U.rgba(lamp, 0.6 + 0.4 * Math.sin(t * 6)) : lamp);
    }
    g.restore();
  }
  function glowPiece(g, it, t, W, H) {
    const ds = it.props.devState;
    const p = HN.s10Palette(it.props.set);
    if (it._trigT > 0) G.glow(g, 0, 0, Math.max(W, H) * 0.7, '#ff2a2a', 0.35 + 0.25 * Math.sin(t * 18));
    if (ds === 'destroyed' && Math.sin(t * 2 + (it.tx || 0)) > 0.7) G.glow(g, (Math.sin(t * 5) * W) / 4, -H / 3, 6, '#ff7a2a', 0.4);
    if (ds === 'malfunctioning' && Math.sin(t * 9 + it.tx) > 0.6) G.glow(g, (Math.random() - 0.5) * W * 0.6, (Math.random() - 0.5) * H * 0.6, 8, '#ffe07a', 0.7);
    else if (ds && ds !== 'disabled' && ds !== 'destroyed') G.glow(g, 0, 0, Math.max(W, H) * 0.45, p.accent, 0.12 + (ds === 'active' ? 0.2 : 0));
    if (['vat', 'pod', 'furnace', 'screen', 'console', 'arch', 'chandelier', 'fountain'].includes(it.props.fam) && ds !== 'disabled' && ds !== 'destroyed') G.glow(g, 0, 0, Math.max(W, H) * 0.5, it.props.fam === 'furnace' ? '#ff6a1a' : p.accent, 0.18);
  }
  const wallRot = (g, it) => g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);

  const items = {
    'hn-s10': {
      name: 'Fixture', radius: 12, solid: 'rect', mapColor: '#6a6a70', cache: false,
      init(it) {
        const w = it.props.w || 1, h = it.props.h || 1;
        it.x = it.tx * T + (w * T) / 2;
        it.y = it.ty * T + (h * T) / 2;
        it.box = [w * T - 6, h * T - 6];
        it.boxOff = [0, 0];
        it.r = Math.max(w, h) * 12;
        it.name = it.props.name ? it.props.name.charAt(0).toUpperCase() + it.props.name.slice(1) : 'Fixture';
      },
      draw(g, it, t) { drawPiece(g, it, t, it.box[0], it.box[1]); },
      drawGlow(g, it, t) { glowPiece(g, it, t, it.box[0], it.box[1]); },
    },
    'hn-s10w': {
      name: 'Wall fixture', radius: 8, wallMounted: true, shadow: false, mapColor: '#6a6a70',
      init(it) { it.name = it.props.name ? it.props.name.charAt(0).toUpperCase() + it.props.name.slice(1) : 'Wall fixture'; },
      draw(g, it, t) {
        wallRot(g, it);
        g.translate(0, -4);
        drawPiece(g, it, t, 24, 8);
      },
      drawGlow(g, it, t) {
        wallRot(g, it);
        g.translate(0, -4);
        glowPiece(g, it, t, 24, 8);
      },
    },
    // a doorway transition: on the room's side of a door or opening, its floor fades into the next one's, with a sill
    // at the edge (props: dir, the way out; from, to: the two floors' colours; to null: a plain floor)
    'hn-threshold': {
      name: 'Threshold', radius: 8, solid: false, shadow: false, z: -2.5, mapColor: 'none',
      draw(g, it) {
        const [dx, dy] = it.props.dir || [1, 0];
        const from = it.props.from || '#7a7a78', to = it.props.to || '#55575a';
        g.save();
        g.rotate(Math.atan2(dy, dx));
        const grd = g.createLinearGradient(-T / 2, 0, T / 2, 0);
        grd.addColorStop(0, U.rgba(to, 0));
        grd.addColorStop(0.5, U.rgba(to, 0.3));
        grd.addColorStop(1, U.rgba(to, 0.75));
        g.fillStyle = grd;
        g.fillRect(-T / 2, -T / 2, T, T);
        // the next floor's pieces creeping in
        const r = U.mulberry32(hash((it.tx || 0) + ',' + (it.ty || 0) + to));
        g.fillStyle = U.rgba(to, 0.55);
        for (let i = 0; i < 7; i++) g.fillRect(T / 2 - 5 - r() * 14, -T / 2 + 1 + r() * (T - 6), 3 + r() * 3, 3 + r() * 2);
        // the sill
        g.fillStyle = U.shade(from, -0.45);
        g.fillRect(T / 2 - 4, -T / 2, 4, T);
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(T / 2 - 4, -T / 2, 1, T);
        g.restore();
      },
    },
    'hn-s10-decal': {
      name: 'Debris', radius: 8, solid: false, shadow: false, z: -2, mapColor: 'none',
      draw(g, it, t) {
        const r = U.mulberry32(hash((it.tx || 0) + ',' + (it.ty || 0) + it.props.kind));
        const k = it.props.kind;
        if (k === 'scorch' || k === 'ash') {
          const grd = g.createRadialGradient(0, 0, 1, 0, 0, 14);
          grd.addColorStop(0, k === 'ash' ? 'rgba(120,116,110,0.6)' : 'rgba(10,8,6,0.7)');
          grd.addColorStop(1, 'rgba(10,8,6,0)');
          g.fillStyle = grd;
          g.fillRect(-15, -15, 30, 30);
        } else if (k === 'rubble') {
          for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#5a5650' : '#7a766e'; const s = 2 + r() * 4; g.fillRect((r() - 0.5) * 22, (r() - 0.5) * 22, s, s * 0.8); }
        } else if (k === 'crack') {
          g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; g.beginPath(); let x = -12, y = (r() - 0.5) * 10; g.moveTo(x, y);
          for (let i = 0; i < 5; i++) { x += 5; y += (r() - 0.5) * 8; g.lineTo(x, y); } g.stroke();
        } else if (k === 'water' || k === 'oil' || k === 'stain') {
          g.fillStyle = k === 'water' ? 'rgba(60,110,140,0.4)' : k === 'oil' ? 'rgba(20,18,14,0.55)' : 'rgba(90,60,40,0.3)';
          g.beginPath(); g.ellipse(0, 0, 9 + r() * 6, 6 + r() * 5, r() * 3, 0, U.TAU); g.fill();
        } else if (k === 'growth' || k === 'spores') {
          for (let i = 0; i < 8; i++) G.circle(g, (r() - 0.5) * 22, (r() - 0.5) * 22, 1.5 + r() * 3, k === 'growth' ? 'rgba(90,150,60,0.7)' : 'rgba(200,180,90,0.5)');
        } else if (k === 'sigil') {
          g.strokeStyle = 'rgba(180,30,40,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 10, 0, U.TAU); g.stroke();
          g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); } g.closePath(); g.stroke();
        } else if (k === 'candles') {
          for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * 16, y = (r() - 0.5) * 16; G.circle(g, x, y, 1.6, '#e8e0c8'); G.circle(g, x, y - 1, 0.8, '#ffc060'); }
        } else if (k === 'bedroll') {
          rbox(g, -10, -5, 20, 10, 3, '#6a5a3a'); rbox(g, -10, -5, 6, 10, 3, '#8a7a5a');
        } else if (k === 'graffiti') {
          g.strokeStyle = U.rgba(['#ff4ad8', '#4ad8ff', '#e8e040'][Math.floor(r() * 3)], 0.7); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-10, 4);
          for (let i = 0; i < 6; i++) g.lineTo(-10 + i * 4, (i % 2 ? -5 : 5) * r()); g.stroke();
        } else if (k === 'cables') {
          g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.4; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-14, (r() - 0.5) * 10); g.bezierCurveTo(-4, (r() - 0.5) * 20, 4, (r() - 0.5) * 20, 14, (r() - 0.5) * 10); g.stroke(); }
        } else if (k === 'papers') {
          for (let i = 0; i < 4; i++) { g.save(); g.rotate(r() * 3); g.fillStyle = '#e8e4d8'; g.fillRect((r() - 0.5) * 16, (r() - 0.5) * 16, 5, 7); g.restore(); }
        } else if (k === 'polish') {
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(0, 0, 12, 6, 0.5, 0, U.TAU); g.fill();
        }
      },
      drawGlow(g, it, t) { if (it.props.kind === 'candles') G.glow(g, 0, 0, 12, '#ffc060', 0.35); if (it.props.kind === 'spores') G.glow(g, 0, 0, 10, '#c8e060', 0.15); },
    },
  };
  LM.definePack({ id: 'hn-gen-kit', items });
})();
