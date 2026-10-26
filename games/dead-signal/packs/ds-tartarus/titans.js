/* Dead Signal — packs/ds-tartarus/titans.js
 * The Titans: synthids that don't age or die and grow back from almost anything. Asterion couldn't destroy
 * them, so it built Tartarus to hold them. Each is in a bronze vault you can look into through a window.
 * Ordinary weapons do nothing to them (`immune`). (DESIGN.md 4.7, 5.3.)
 *
 *   items    ds-leviathan       a jade serpent covered in eyes, forty tiles long, forever chasing its tail round
 *                               a figure-eight (props.a: the loop's half-width in tiles; squash)
 *            ds-tiamat          living water: a dark sea in the shape of a cell, never the same shape twice; its
 *                               nucleus divides, and divides, until it's one thing again; it throws waves at the
 *                               glass, reaches out with pseudopods, and seeds the drains with its young (props.max)
 *            ds-judgment-eye    an amber crystal with one eye in it, floating; whatever it fixes on, it judges, and
 *                               judgment burns, through the glass (props.cell: [x, y, w, h], the vault it drifts in)
 *            ds-wings           a light inside twelve white wings; it loves you; it would like you to come closer
 *            ds-frog            a huge frog with a bottomless hole for a head; it smiles when you're near the glass
 *            ds-garden          a white crystal tree that grows over everything; ds-crystal is what it grows
 *                               (props.region: [x, y, w, h] tiles it may spread over; props.every; props.cap)
 *            ds-hundred         the Hundred-Handed: a heap of bodies behind bars, all of its hands through them
 *                               (props.bars: [x0, y, x1], the bars' row in tiles; it grabs what comes near)
 *   enemies  ds-behemoth        a black-scaled bull the size of a lorry, bronze horns, fire in its throat. It paces
 *                               its vault, and charges the glass when it sees you. Let out, it can't be stopped.
 *            ds-brine           one of Tiamat's young: a small sea that engulfs you
 *   behaviors ds-titan-pace     a titan's restlessness in its cell (props.cell); loose, it hunts
 *   statuses judged (the Eye's), crystallizing (the Garden's: six and you're part of it), grasped (the hands),
 *            engulfed (the brine)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, DS = (LM.DS = LM.DS || {}), Z = DS.Z, AI = LM.ai;
  const TAU = U.TAU;
  const CACHE = new WeakMap();
  const losLight = (game, x0, y0, x1, y1) => LM.physics.los(game.level, x0, y0, x1, y1, 'light');
  const cellRect = (it) => {
    const c = it.props.cell;
    return c ? { x0: c[0] * T, y0: c[1] * T, x1: (c[0] + c[2]) * T, y1: (c[1] + c[3]) * T } : null;
  };
  const vol = (game, x, y, far) => {
    const P = game.player;
    if (!P) return 0;
    return U.clamp(1 - U.dist(P.x, P.y, x, y) / (far || 700), 0, 1);
  };

  // ======================================================== statuses
  const statuses = {
    judged: { name: 'Judged', seconds: 0.45, dps: 30, interval: 0.15, fire: true, tint: '#ffb040', tintAlpha: 0.4, color: '#ffb040', only: 'player' },
    crystallizing: {
      name: 'Crystallizing', seconds: 7, stack: 6, refresh: true, speedMul: 0.86, tint: '#eef4ff', tintAlpha: 0.32, color: '#e8f0ff', only: 'player',
      update(game, P, s) {
        if (s.n >= 6 && !P.dead) {
          LM.status.clear(game, P, 'crystallizing');
          game.toast('The crystal reaches your heart. You are part of the garden now.', 'warn');
          LM.combat.hurt(game, P, 9999, { source: 'enemy', type: 'garden' });
        }
      },
    },
    grasped: { name: 'Grasped', seconds: 0.8, speedMul: 0.05, bound: true, tint: '#d8d0c0', tintAlpha: 0.3, color: '#d8d0c0', only: 'player' },
    engulfed: { name: 'Engulfed', seconds: 1.6, speedMul: 0.15, bound: true, dps: 9, interval: 0.4, tint: '#0e3a5a', tintAlpha: 0.6, color: '#3a8ac8', only: 'player' },
  };

  // ======================================================== the Leviathan
  const LEV = { body: '#2f6f58', dark: '#0a1a14', light: '#7ac8a4', belly: '#1f4a3a', eye: '#e8d070', iris: '#c84a20' };
  function levPath(it) {
    let c = CACHE.get(it);
    if (c) return c;
    const a = (it.props.a || 9.4) * T, sq = it.props.squash || 1.25;
    const N = 900, xs = new Float32Array(N + 1), ys = new Float32Array(N + 1), cum = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU, s = Math.sin(t), co = Math.cos(t), d = 1 + s * s;
      xs[i] = (a * co) / d;
      ys[i] = (sq * a * s * co) / d;
      if (i) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    }
    c = { xs, ys, cum, len: cum[N], N, pts: [] };
    CACHE.set(it, c);
    return c;
  }
  function levAt(c, s, out) {
    s = ((s % c.len) + c.len) % c.len;
    let lo = 0, hi = c.N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (c.cum[m] <= s) lo = m;
      else hi = m;
    }
    const k = (s - c.cum[lo]) / (c.cum[hi] - c.cum[lo] || 1);
    out.x = c.xs[lo] + (c.xs[hi] - c.xs[lo]) * k;
    out.y = c.ys[lo] + (c.ys[hi] - c.ys[lo]) * k;
    out.a = Math.atan2(c.ys[hi] - c.ys[lo], c.xs[hi] - c.xs[lo]);
    return out;
  }
  const LEV_SP = 9;
  function levSegments(it) {
    const c = levPath(it);
    const n = Math.round(((it.props.length || 40) * T) / LEV_SP);
    while (c.pts.length <= n) c.pts.push({ x: 0, y: 0, a: 0, r: 0 });
    const head = it.s || 0;
    for (let i = 0; i <= n; i++) {
      const p = levAt(c, head - i * LEV_SP, c.pts[i]);
      const f = i / n;
      p.r = f < 0.04 ? 17 : f < 0.7 ? 15.5 - f * 2 : Math.max(3, 14 * (1 - (f - 0.7) / 0.3) + 2);
    }
    return { pts: c.pts, n };
  }
  function drawLeviathan(g, it, t, game) {
    const { pts, n } = levSegments(it);
    const P = game && game.player;
    const px = P ? P.x - it.x : 0, py = P ? P.y - it.y : 400;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // in bands from the tail to the head: whatever's nearer the head is drawn over what isn't (the crossing)
    const BAND = 7;
    for (let end = n; end > 0; end -= BAND) {
      const start = Math.max(0, end - BAND);
      const rAvg = (pts[start].r + pts[end].r) / 2;
      const path = () => {
        g.beginPath();
        g.moveTo(pts[end].x, pts[end].y);
        for (let i = end - 1; i >= start; i--) g.lineTo(pts[i].x, pts[i].y);
      };
      path();
      g.strokeStyle = LEV.dark;
      g.lineWidth = rAvg * 2 + 3.5;
      g.stroke();
      g.strokeStyle = LEV.body;
      g.lineWidth = rAvg * 2;
      g.stroke();
      // a darker belly, a pale ridge along the back
      g.save();
      g.translate(1.5, 2.5);
      path();
      g.strokeStyle = U.rgba(LEV.belly, 0.6);
      g.lineWidth = rAvg * 1.1;
      g.stroke();
      g.restore();
      g.save();
      g.translate(-1.5, -3);
      path();
      g.strokeStyle = U.rgba(LEV.light, 0.28);
      g.lineWidth = rAvg * 0.55;
      g.stroke();
      g.restore();
      // scale rings
      path();
      g.setLineDash([1.2, 3.4]);
      g.strokeStyle = 'rgba(8,24,18,0.55)';
      g.lineWidth = rAvg * 1.6;
      g.stroke();
      g.setLineDash([]);
      // and its eyes, on this band, open and shut out of time with each other, all looking at you
      for (let i = end; i >= start; i--) {
        if (i < 5 || i % 2 || i > n - 4) continue;
        const p = pts[i];
        const side = (i / 2) % 2 ? 1 : -1;
        const nx = -Math.sin(p.a) * side, ny = Math.cos(p.a) * side;
        const ex = p.x + nx * p.r * 0.42, ey = p.y + ny * p.r * 0.42;
        const sz = (2.6 + U.hash2(i, 3, 7) * 1.8) * (p.r / 15);
        const open = U.clamp((Math.sin(t * (0.6 + U.hash2(i, 5, 2) * 0.7) + i * 1.7) + 0.75) * 5, 0, 1);
        g.fillStyle = '#0a1410';
        g.beginPath();
        g.ellipse(ex, ey, sz + 0.8, sz * 0.7 + 0.8, p.a, 0, TAU);
        g.fill();
        if (open > 0.05) {
          g.fillStyle = LEV.eye;
          g.beginPath();
          g.ellipse(ex, ey, sz, sz * 0.66 * open, p.a, 0, TAU);
          g.fill();
          const la = Math.atan2(py - ey, px - ex);
          g.fillStyle = LEV.iris;
          g.beginPath();
          g.arc(ex + Math.cos(la) * sz * 0.3, ey + Math.sin(la) * sz * 0.3 * open, sz * 0.45 * Math.max(0.4, open), 0, TAU);
          g.fill();
          g.fillStyle = '#050505';
          g.beginPath();
          g.ellipse(ex + Math.cos(la) * sz * 0.34, ey + Math.sin(la) * sz * 0.34 * open, sz * 0.12, sz * 0.38 * open, la + Math.PI / 2, 0, TAU);
          g.fill();
        }
      }
    }
    // the head: a mouth with rings of teeth, all the way down
    const hd = pts[0];
    g.save();
    g.translate(hd.x, hd.y);
    g.rotate(hd.a);
    const jaw = 0.55 + 0.45 * Math.sin(t * 1.4);
    g.fillStyle = LEV.dark;
    g.beginPath();
    g.ellipse(4, 0, 25, 21, 0, 0, TAU);
    g.fill();
    g.fillStyle = LEV.body;
    g.beginPath();
    g.ellipse(3, 0, 23, 19, 0, 0, TAU);
    g.fill();
    g.fillStyle = U.rgba(LEV.light, 0.25);
    g.beginPath();
    g.ellipse(-2, -6, 14, 7, 0, 0, TAU);
    g.fill();
    // the maw opens forward
    const mr = 9 + jaw * 7;
    g.fillStyle = '#2a0608';
    g.beginPath();
    g.ellipse(17, 0, mr * 0.75, mr, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#5a0e12';
    g.beginPath();
    g.ellipse(18, 0, mr * 0.55, mr * 0.75, 0, 0, TAU);
    g.fill();
    for (let ring = 0; ring < 3; ring++) {
      const rr = mr * (1 - ring * 0.27);
      const nt = 12 - ring * 2;
      g.fillStyle = ring ? '#e8dcc0' : '#f4ecd8';
      for (let i = 0; i < nt; i++) {
        const a = (i / nt) * TAU + ring * 0.3 + t * (ring % 2 ? 0.4 : -0.3);
        const bx = 17 + Math.cos(a) * rr * 0.75, by = Math.sin(a) * rr;
        const ix = 17 + Math.cos(a) * rr * 0.4, iy = Math.sin(a) * rr * 0.55;
        g.beginPath();
        g.moveTo(bx + Math.sin(a) * 1.6, by - Math.cos(a) * 1.6);
        g.lineTo(ix, iy);
        g.lineTo(bx - Math.sin(a) * 1.6, by + Math.cos(a) * 1.6);
        g.fill();
      }
    }
    g.fillStyle = '#0a0202';
    g.beginPath();
    g.arc(18, 0, mr * 0.22, 0, TAU);
    g.fill();
    // a crown of eyes round the maw
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.55 + (i / 5) * Math.PI * 0.9;
      const ex = 2 + Math.cos(a) * 15, ey = Math.sin(a) * 15 * (i < 3 ? -1 : 1) * 0.8;
      const open = U.clamp((Math.sin(t * 0.9 + i * 2.1) + 0.6) * 5, 0, 1);
      g.fillStyle = LEV.eye;
      g.beginPath();
      g.ellipse(ex, ey, 3, 2.2 * open, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#050505';
      g.fillRect(ex - 0.5, ey - 1.6 * open, 1, 3.2 * open);
    }
    g.restore();
  }

  // ======================================================== Tiamat
  function tiamatShape(it, t, n) {
    const R = (it.props.r || 4) * T;
    const out = [];
    const pod = it.pod;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      let r = R * (1 + 0.1 * Math.sin(3 * a + t * 0.7) + 0.07 * Math.sin(5 * a - t * 1.13) + 0.04 * Math.sin(9 * a + t * 2.1) + 0.03 * Math.sin(13 * a - t * 2.9));
      if (pod && pod.k > 0) {
        const d = Math.abs(U.angDiff(a, pod.a));
        if (d < 0.5) r += pod.len * pod.k * Math.pow(Math.cos((d / 0.5) * (Math.PI / 2)), 3);
      }
      if (it.wave && it.wave.k > 0) {
        const d = Math.abs(U.angDiff(a, it.wave.a));
        if (d < 1.1) r += R * 0.35 * it.wave.k * Math.cos((d / 1.1) * (Math.PI / 2));
      }
      out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return out;
  }
  function drawTiamat(g, it, t) {
    const R = (it.props.r || 4) * T;
    const pts = tiamatShape(it, t, 72);
    // its shadow on the basin floor, then the water
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x + 5, y + 7) : g.moveTo(x + 5, y + 7)));
    g.closePath();
    g.fill();
    const grd = g.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.1, 0, 0, R * 1.2);
    grd.addColorStop(0, '#1a4a6a');
    grd.addColorStop(0.45, '#0a2436');
    grd.addColorStop(0.85, '#06141f');
    grd.addColorStop(1, '#1d5a74');
    g.fillStyle = grd;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    // currents under the surface
    g.save();
    g.clip();
    g.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = 'rgba(120,200,230,' + (0.05 + (k % 3) * 0.025) + ')';
      g.beginPath();
      const rr = R * (0.25 + k * 0.11);
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * TAU;
        const r2 = rr * (1 + 0.08 * Math.sin(4 * a + t * (0.6 + k * 0.13) + k));
        const x = Math.cos(a + t * 0.05 * (k % 2 ? 1 : -1)) * r2, y = Math.sin(a + t * 0.05 * (k % 2 ? 1 : -1)) * r2 * 0.92;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }
    // glints
    for (let i = 0; i < 14; i++) {
      const a = U.hash2(i, 1, 3) * TAU + t * 0.08, r2 = R * (0.2 + U.hash2(i, 2, 3) * 0.7);
      const k = 0.5 + 0.5 * Math.sin(t * 2 + i);
      g.fillStyle = 'rgba(200,240,255,' + 0.25 * k + ')';
      g.fillRect(Math.cos(a) * r2, Math.sin(a) * r2, 2.2, 0.8);
    }
    g.restore();
    // foam along the edge
    g.strokeStyle = 'rgba(190,235,250,0.45)';
    g.lineWidth = 2.2;
    g.setLineDash([3, 5]);
    g.lineDashOffset = -t * 12;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.stroke();
    g.setLineDash([]);
    // the nucleus: a membrane, and inside it cells dividing, and dividing, until it's one again
    const div = it.div || { n: 1, t: 0, merge: 0 };
    const nr = R * 0.24;
    g.fillStyle = 'rgba(40,110,140,0.55)';
    g.beginPath();
    g.arc(0, 0, nr + 4, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(150,220,240,0.6)';
    g.lineWidth = 1.4;
    g.stroke();
    if (div.merge > 0) {
      const k = div.merge;
      const gg = g.createRadialGradient(0, 0, 0, 0, 0, nr);
      gg.addColorStop(0, 'rgba(230,250,255,' + (0.9 * k) + ')');
      gg.addColorStop(1, 'rgba(60,160,200,' + (0.5 * k) + ')');
      g.fillStyle = gg;
      g.beginPath();
      g.arc(0, 0, nr * (0.6 + 0.4 * k), 0, TAU);
      g.fill();
    } else {
      const n = div.n;
      const cr = nr * (n === 1 ? 0.8 : 0.95 / Math.sqrt(n)) ;
      const split = U.clamp(div.t / 0.35, 0, 1); // a moment of pulling apart after each division
      for (let i = 0; i < n; i++) {
        // a little ball of cells, packed on the golden angle
        const a = i * 2.39996 + t * 0.2, rr = n === 1 ? 0 : nr * 0.82 * Math.sqrt((i + 0.5) / n) * (0.85 + 0.15 * split);
        const cx = Math.cos(a) * rr, cy = Math.sin(a) * rr;
        g.fillStyle = 'rgba(70,170,200,0.85)';
        g.beginPath();
        g.arc(cx, cy, cr, 0, TAU);
        g.fill();
        g.fillStyle = 'rgba(210,245,255,0.55)';
        g.beginPath();
        g.arc(cx - cr * 0.3, cy - cr * 0.3, cr * 0.35, 0, TAU);
        g.fill();
      }
    }
  }

  // ======================================================== the Eye of Judgment
  function drawEye(g, it, t, game) {
    const bob = Math.sin(t * 1.4) * 3;
    const look = it.gaze == null ? 0 : it.gaze;
    // its shadow far below
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(0, 26, 16, 6, 0, 0, TAU);
    g.fill();
    g.save();
    g.translate(0, -10 + bob);
    // an elongated octahedron of amber: facets light and dark, turning slowly
    const spin = t * 0.5;
    const top = [0, -30], bot = [0, 30];
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * TAU;
      ring.push([Math.cos(a) * 17, Math.sin(a) * 6]);
    }
    for (let i = 0; i < 6; i++) {
      const a = ring[i], b = ring[(i + 1) % 6];
      const lit = 0.5 + 0.5 * Math.cos(spin + (i / 6) * TAU - 0.8);
      g.fillStyle = U.mix('#6a3a08', '#ffd27a', lit * 0.8);
      g.beginPath();
      g.moveTo(top[0], top[1]);
      g.lineTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.closePath();
      g.fill();
      g.fillStyle = U.mix('#3a1e04', '#e8a440', lit * 0.6);
      g.beginPath();
      g.moveTo(bot[0], bot[1]);
      g.lineTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = 'rgba(255,230,170,0.35)';
    g.lineWidth = 0.6;
    for (const p of ring) {
      g.beginPath();
      g.moveTo(top[0], top[1]);
      g.lineTo(p[0], p[1]);
      g.lineTo(bot[0], bot[1]);
      g.stroke();
    }
    // the eye: in the heart of the crystal, looking where it judges
    const fix = it.fix || 0;
    g.fillStyle = '#f8ecd0';
    g.beginPath();
    g.ellipse(0, 0, 9, 6 - fix * 1.5, 0, 0, TAU);
    g.fill();
    const lx = Math.cos(look) * 3.2, ly = Math.sin(look) * 2;
    g.fillStyle = fix > 0.5 ? '#ff5a1a' : '#c87a10';
    g.beginPath();
    g.arc(lx, ly, 4.2, 0, TAU);
    g.fill();
    g.fillStyle = '#0a0402';
    g.beginPath();
    g.ellipse(lx, ly, 0.9 + (1 - fix) * 0.8, 3.6, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  // ======================================================== the Circle of Wings
  function feather(g, len, w, a, col) {
    g.save();
    g.rotate(a);
    const grd = g.createLinearGradient(0, 0, len, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(1, col);
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -w, len, -w * 0.15);
    g.quadraticCurveTo(len * 0.55, w * 0.35, 0, 0);
    g.fill();
    g.strokeStyle = 'rgba(200,190,170,0.35)';
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(len * 0.1, 0);
    g.lineTo(len * 0.95, -w * 0.18);
    g.stroke();
    g.restore();
  }
  function drawWings(g, it, t) {
    const pulse = it.pulse || 0;
    const rot = t * 0.12;
    g.save();
    for (let i = 0; i < 12; i++) {
      const a = rot + (i / 12) * TAU;
      const flap = Math.sin(t * 1.6 + i * 0.52) * 0.12;
      g.save();
      g.rotate(a);
      g.translate(12, 0);
      g.scale(1 + pulse * 0.08, 1);
      // a wing: a fan of long feathers sweeping back
      const n = 7;
      for (let k = 0; k < n; k++) {
        const fa = -0.55 + (k / (n - 1)) * 1.1 + flap;
        feather(g, 34 + (k % 2 ? 6 : 0) + Math.sin(k + i) * 3, 6, fa * 0.5, 'rgba(240,232,214,0.6)');
      }
      g.restore();
    }
    g.restore();
    // the light at the centre
    const r = 11 + pulse * 4;
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.3, 'rgba(255,248,230,0.95)');
    grd.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, r * 2.2, 0, TAU);
    g.fill();
  }

  // ======================================================== the Frog
  function drawFrog(g, it, t) {
    const breathe = Math.sin(t * 0.9) * 0.025 + (it.inhale > 0 ? 0.06 * Math.sin(it.inhale * 6) : 0);
    const skin = '#2a3420', skinD = '#141a10', skinL = '#4a5a34';
    g.save();
    g.scale(1 + breathe, 1 + breathe * 0.6);
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.ellipse(4, 10, 66, 54, 0, 0, TAU);
    g.fill();
    // hind legs folded at the sides, toes splayed
    for (const s of [-1, 1]) {
      g.fillStyle = skinD;
      g.beginPath();
      g.ellipse(s * 46, 22, 26, 34, s * 0.4, 0, TAU);
      g.fill();
      g.fillStyle = skin;
      g.beginPath();
      g.ellipse(s * 44, 20, 22, 30, s * 0.4, 0, TAU);
      g.fill();
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 2 + s * (0.2 + k * 0.28);
        g.strokeStyle = skin;
        g.lineWidth = 4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(s * 52, 44);
        g.lineTo(s * 52 + Math.cos(a) * 22 * s, 44 + Math.sin(a) * 18);
        g.stroke();
        g.fillStyle = skinL;
        g.beginPath();
        g.arc(s * 52 + Math.cos(a) * 22 * s, 44 + Math.sin(a) * 18, 3.2, 0, TAU);
        g.fill();
      }
    }
    // the body: warty, glistening
    const grd = g.createRadialGradient(-12, -8, 6, 0, 4, 60);
    grd.addColorStop(0, skinL);
    grd.addColorStop(0.6, skin);
    grd.addColorStop(1, skinD);
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(0, 6, 50, 46, 0, 0, TAU);
    g.fill();
    for (let i = 0; i < 26; i++) {
      const a = U.hash2(i, 9, 1) * TAU, r = 10 + U.hash2(i, 9, 2) * 36;
      g.fillStyle = i % 3 ? 'rgba(20,26,14,0.6)' : 'rgba(110,130,70,0.35)';
      g.beginPath();
      g.arc(Math.cos(a) * r, 6 + Math.sin(a) * r * 0.9, 1.5 + U.hash2(i, 9, 3) * 2.6, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(220,240,200,0.12)';
    g.beginPath();
    g.ellipse(-14, -12, 18, 7, -0.4, 0, TAU);
    g.fill();
    // front hands, long-fingered, on the floor before it
    for (const s of [-1, 1]) {
      g.strokeStyle = skin;
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(s * 26, -22);
      g.lineTo(s * 30, -48);
      g.stroke();
      for (let k = 0; k < 4; k++) {
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(s * 30, -48);
        g.lineTo(s * (24 + k * 5), -60 - (k % 2) * 3);
        g.stroke();
      }
    }
    // where its head should be: a hole. It goes down further than the floor does.
    g.fillStyle = '#000000';
    g.beginPath();
    g.ellipse(0, -30, 24, 20, 0, 0, TAU);
    g.fill();
    for (let k = 0; k < 5; k++) {
      g.strokeStyle = 'rgba(40,40,60,' + (0.35 - k * 0.06) + ')';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, -30, 22 - k * 4.2, 18 - k * 3.5, t * 0.2 * (k % 2 ? 1 : -1), 0, TAU);
      g.stroke();
    }
    // something very far down, like a star
    g.fillStyle = 'rgba(200,210,255,' + (0.25 + 0.2 * Math.sin(t * 0.7)) + ')';
    g.fillRect(-0.6, -31, 1.2, 1.2);
    // and when you're close: it smiles
    const sm = it.smile || 0;
    if (sm > 0.02) {
      g.save();
      g.beginPath();
      g.ellipse(0, -30, 24, 20, 0, 0, TAU);
      g.clip();
      g.globalAlpha = sm;
      g.fillStyle = '#3a0a0e';
      g.beginPath();
      g.ellipse(0, -24, 19 * sm + 2, 7 * sm + 1, 0, 0, Math.PI);
      g.fill();
      g.fillStyle = '#f2ead8';
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.06 + (i / (n - 1)) * 0.88);
        const bx = Math.cos(a) * (19 * sm + 2), by = -24 + Math.sin(a) * (7 * sm + 1);
        g.beginPath();
        g.moveTo(bx - 1.6, by - (i % 2 ? 0 : 0.4));
        g.lineTo(bx + 1.6, by);
        g.lineTo(bx * 0.92, by - 3.4 * sm);
        g.fill();
        g.beginPath();
        g.moveTo(bx - 1.4, -24.5);
        g.lineTo(bx + 1.4, -24.5);
        g.lineTo(bx * 0.95, -24.5 + 3 * sm);
        g.fill();
      }
      g.restore();
    }
    g.restore();
  }

  // ======================================================== the Garden
  function prism(g, len, w, a, shade) {
    g.save();
    g.rotate(a);
    g.fillStyle = U.mix('#c8d4e0', '#ffffff', shade);
    g.beginPath();
    g.moveTo(0, -w / 2);
    g.lineTo(len * 0.85, -w / 2);
    g.lineTo(len, 0);
    g.lineTo(len * 0.85, w / 2);
    g.lineTo(0, w / 2);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(150,170,200,0.45)';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(len * 0.85, 0);
    g.lineTo(len, 0);
    g.lineTo(len * 0.85, w / 2);
    g.lineTo(0, w / 2);
    g.closePath();
    g.fill();
    g.restore();
  }
  function branch(g, len, w, depth, seed, t) {
    if (depth <= 0 || len < 6) return;
    prism(g, len, w, 0, 0.6 + 0.3 * U.hash2(seed, depth, 1));
    g.save();
    g.translate(len * 0.8, 0);
    const n = 2 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.7 + (U.hash2(seed, i, depth) - 0.5) * 0.4 + Math.sin(t * 0.3 + seed + i) * 0.015;
      g.save();
      g.rotate(a);
      branch(g, len * (0.62 + U.hash2(seed, i, 4) * 0.15), w * 0.7, depth - 1, seed * 3 + i + 1, t);
      g.restore();
    }
    g.restore();
  }
  function drawGarden(g, it, t) {
    const grow = it.grow == null ? 0.85 : it.grow;
    // frost round its foot
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 70);
    grd.addColorStop(0, 'rgba(240,248,255,0.5)');
    grd.addColorStop(1, 'rgba(240,248,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, 70, 0, TAU);
    g.fill();
    g.save();
    g.scale(grow, grow);
    for (let i = 0; i < 7; i++) {
      g.save();
      g.rotate((i / 7) * TAU + 0.3);
      branch(g, 34 + (i % 3) * 6, 9, 4, i + 1, t);
      g.restore();
    }
    // the trunk: a cluster of thick hexagonal columns
    for (let i = 0; i < 5; i++) prism(g, 14, 10, (i / 5) * TAU, 0.9);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(0, 0, 6, 0, TAU);
    g.fill();
    g.restore();
  }
  function drawCrystal(g, it, t) {
    const n = 3 + (it.props.seed % 4);
    const k = it.grow == null ? 1 : it.grow;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.ellipse(2, 3, 11 * k, 7 * k, 0, 0, TAU);
    g.fill();
    g.save();
    g.scale(k, k);
    for (let i = 0; i < n; i++) {
      const a = U.hash2(it.props.seed, i, 1) * TAU;
      prism(g, 7 + U.hash2(it.props.seed, i, 2) * 9, 4 + U.hash2(it.props.seed, i, 3) * 2.5, a, 0.5 + 0.4 * U.hash2(it.props.seed, i, 4));
    }
    g.restore();
  }

  // ======================================================== the Hundred-Handed
  function drawHundred(g, it, t, game) {
    const bars = it.props.bars;
    // the heap: bodies, pale, piled, heads with their eyes shut and their mouths open
    for (let i = 0; i < 22; i++) {
      const a = U.hash2(i, 1, 7) * TAU, r = U.hash2(i, 2, 7) * 70;
      const x = Math.cos(a) * r * 1.4, y = Math.sin(a) * r * 0.8 - 10;
      const breathe = Math.sin(t * 0.8 + i) * 1.2;
      g.fillStyle = i % 3 ? '#b8b0a4' : '#8a8478';
      g.beginPath();
      g.ellipse(x, y, 20 + breathe, 13 + breathe * 0.6, a, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(40,30,30,0.25)';
      g.beginPath();
      g.ellipse(x + 3, y + 4, 16, 8, a, 0, TAU);
      g.fill();
      if (i % 2 === 0) {
        const hx = x + Math.cos(a) * 14, hy = y + Math.sin(a) * 8;
        g.fillStyle = '#c8c0b2';
        g.beginPath();
        g.arc(hx, hy, 6.5, 0, TAU);
        g.fill();
        g.fillStyle = '#2a1414';
        g.beginPath();
        g.ellipse(hx, hy + 2, 2, 2.6 + Math.sin(t * 2 + i) * 0.8, 0, 0, TAU);
        g.fill();
        g.strokeStyle = '#5a5048';
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(hx - 3, hy - 1.5);
        g.lineTo(hx - 1, hy - 1.5);
        g.moveTo(hx + 1, hy - 1.5);
        g.lineTo(hx + 3, hy - 1.5);
        g.stroke();
      }
    }
    if (!bars) return;
    // its arms, to the bars, and hands round every bar
    const by = (bars[1] + 0.5) * T - it.y;
    g.lineCap = 'round';
    for (let x = bars[0] * T + 4; x <= (bars[2] + 1) * T - 4; x += 8) {
      const bx = x - it.x;
      const sway = Math.sin(t * 1.1 + x * 0.05) * 3;
      g.strokeStyle = '#a8a094';
      g.lineWidth = 4.5;
      g.beginPath();
      g.moveTo(bx * 0.4, -10 + Math.abs(bx) * 0.05);
      g.quadraticCurveTo(bx * 0.8 + sway, by * 0.6, bx, by - 6);
      g.stroke();
      // the hand wrapped round the bar
      g.fillStyle = '#c8c0b2';
      g.beginPath();
      g.ellipse(bx, by - 3, 3.6, 3, 0, 0, TAU);
      g.fill();
      g.strokeStyle = '#c8c0b2';
      g.lineWidth = 1.6;
      for (let f = 0; f < 4; f++) {
        const flex = Math.sin(t * 3 + f + x) * 0.6;
        g.beginPath();
        g.moveTo(bx - 2.5 + f * 1.7, by - 1);
        g.lineTo(bx - 2.5 + f * 1.7 + flex, by + 3.5);
        g.stroke();
      }
    }
    // the one that's reaching for you
    const gr = it.reach;
    if (gr && gr.k > 0) {
      const sx = gr.sx - it.x, sy = by;
      const ex = sx + (gr.x - it.x - sx) * gr.k, ey = sy + (gr.y - it.y - sy) * gr.k;
      g.strokeStyle = '#b8b0a4';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(sx, sy - 10);
      g.quadraticCurveTo(sx, sy + 8, ex, ey);
      g.stroke();
      g.fillStyle = '#d0c8ba';
      g.beginPath();
      g.arc(ex, ey, 5, 0, TAU);
      g.fill();
      g.strokeStyle = '#d0c8ba';
      g.lineWidth = 1.8;
      const a = Math.atan2(ey - sy, ex - sx);
      for (let f = -2; f <= 2; f++) {
        g.beginPath();
        g.moveTo(ex, ey);
        g.lineTo(ex + Math.cos(a + f * 0.35) * 8, ey + Math.sin(a + f * 0.35) * 8);
        g.stroke();
      }
    }
  }

  // ======================================================== the Behemoth
  const BEH = { scale: '#141418', scaleL: '#2a2a32', ridge: '#3a2a1a', horn: '#c98a3a', hornD: '#6a4520' };
  function drawBehemoth(g, e, t) {
    const m = e.mem || {};
    const walk = m.walk || 0;
    g.save();
    g.rotate(e.facing);
    // legs: four pillars, stepping
    for (const [lx, ly, ph] of [[46, -40, 0], [46, 40, Math.PI], [-48, -40, Math.PI], [-48, 40, 0]]) {
      const st = Math.sin(walk + ph) * 6;
      g.fillStyle = '#0a0a0c';
      g.beginPath();
      g.ellipse(lx + st, ly, 15, 12, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#1e1e24';
      g.beginPath();
      g.ellipse(lx + st, ly, 12, 9.5, 0, 0, TAU);
      g.fill();
      g.fillStyle = BEH.hornD;
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.arc(lx + st + 9, ly + k * 5, 2.2, 0, TAU);
        g.fill();
      }
    }
    // the tail
    g.strokeStyle = BEH.scale;
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-86, 0);
    g.quadraticCurveTo(-104, Math.sin(t * 2) * 10, -112, Math.sin(t * 2 + 1) * 16);
    g.stroke();
    // the body: a barrel of black scale
    const grd = g.createRadialGradient(-10, -16, 10, 0, 0, 90);
    grd.addColorStop(0, '#2e2e38');
    grd.addColorStop(0.6, BEH.scale);
    grd.addColorStop(1, '#060608');
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(0, 0, 88, 48, 0, 0, TAU);
    g.fill();
    // scales, row on row
    g.strokeStyle = 'rgba(70,70,84,0.55)';
    g.lineWidth = 1;
    for (let row = -3; row <= 3; row++) {
      for (let col = -7; col <= 7; col++) {
        const x = col * 11 + (row % 2) * 5.5, y = row * 11;
        if ((x * x) / (84 * 84) + (y * y) / (44 * 44) > 0.92) continue;
        g.beginPath();
        g.arc(x, y, 5.6, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      }
    }
    // a ridge of plates down the spine
    for (let i = -6; i <= 5; i++) {
      g.fillStyle = BEH.ridge;
      g.beginPath();
      g.moveTo(i * 12 - 5, -2);
      g.lineTo(i * 12 + 2, -7 - Math.abs(Math.sin(i)) * 3);
      g.lineTo(i * 12 + 6, 2);
      g.closePath();
      g.fill();
    }
    // the head: wide, heavy-browed, low, and the horns sweeping forward
    const lower = m.mode === 'paw' || m.mode === 'charge' ? 6 : 0;
    g.save();
    g.translate(84 + lower, 0);
    g.fillStyle = '#0c0c10';
    g.beginPath();
    g.ellipse(6, 0, 30, 34, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#1e1e26';
    g.beginPath();
    g.ellipse(4, 0, 26, 30, 0, 0, TAU);
    g.fill();
    // the jaw and its tusks
    g.fillStyle = '#16161c';
    g.beginPath();
    g.ellipse(24, 0, 14, 22, 0, 0, TAU);
    g.fill();
    for (const s of [-1, 1]) {
      g.fillStyle = '#e8dcc0';
      g.beginPath();
      g.moveTo(30, s * 10);
      g.lineTo(42, s * 15);
      g.lineTo(31, s * 15);
      g.closePath();
      g.fill();
      // the horns: bronze, out from the brow and forward
      const hg = g.createLinearGradient(0, s * 20, 50, s * 40);
      hg.addColorStop(0, BEH.hornD);
      hg.addColorStop(1, BEH.horn);
      g.fillStyle = hg;
      g.beginPath();
      g.moveTo(-6, s * 22);
      g.quadraticCurveTo(10, s * 52, 46, s * 40);
      g.quadraticCurveTo(14, s * 40, 4, s * 16);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255,220,160,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, s * 24);
      g.quadraticCurveTo(14, s * 46, 44, s * 40);
      g.stroke();
      // eyes, small and red, under the brow
      g.fillStyle = '#ff3a1a';
      g.beginPath();
      g.ellipse(6, s * 14, 2.6, 1.6, 0, 0, TAU);
      g.fill();
      // nostrils
      g.fillStyle = '#050505';
      g.beginPath();
      g.ellipse(34, s * 5, 2.6, 1.8, 0, 0, TAU);
      g.fill();
    }
    g.restore();
    g.restore();
  }

  // ======================================================== the brine (Tiamat's young)
  function drawBrine(g, e, t) {
    const R = e.r * 1.25;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(2, 3, R, R * 0.8, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#0c2a3e';
    g.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * TAU;
      const r = R * (1 + 0.14 * Math.sin(3 * a + t * 3 + (e.mem.ph || (e.mem.ph = Math.random() * 10))) + 0.08 * Math.sin(5 * a - t * 4));
      if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(160,220,240,0.5)';
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = 'rgba(80,180,210,0.8)';
    g.beginPath();
    g.arc(Math.sin(t * 2) * 2, Math.cos(t * 1.7) * 2, R * 0.3, 0, TAU);
    g.fill();
  }

  // ======================================================== behaviours
  const behaviors = {
    // a titan in its vault: paces; looks for something to charge; charges the glass. Out of it, it hunts.
    'ds-titan-pace': {
      update(e, dt, game) {
        const m = e.mem, P = game.player;
        m.walk = (m.walk || 0) + Math.hypot(e.vx, e.vy) * dt * 0.08;
        if (e.faction !== 'titan') {
          // loose: straight for whatever it's after
          if (e.foe) AI.chase(e, game, 1);
          return;
        }
        const c = e._props.cell;
        if (!c) return;
        const x0 = (c[0] + 3) * T, x1 = (c[0] + c[2] - 3) * T, y0 = (c[1] + 2) * T, y1 = (c[1] + c[3] - 2) * T;
        m.chargeCd = (m.chargeCd || 4) - dt;
        const sees = P && !P.dead && e.pSee && e.pDist < 11 * T;
        if (!m.mode) m.mode = 'walk';
        if (m.mode === 'walk') {
          if (!m.goal || m.wait > 0) {
            m.wait = (m.wait || 0) - dt;
            if (m.wait <= 0 && !m.goal) m.goal = { x: U.rand(x0, x1), y: U.rand(y0, y1) };
          }
          if (m.goal) {
            const dx = m.goal.x - e.x, dy = m.goal.y - e.y, d = Math.hypot(dx, dy);
            if (d < 20) {
              m.goal = null;
              m.wait = U.rand(1.2, 3.2);
              if (Math.random() < 0.35) LM.audio.play('behemothSnort', { vol: vol(game, e.x, e.y, 800) });
            } else {
              e.mx += dx / d;
              e.my += dy / d;
            }
          }
          if (sees && m.chargeCd <= 0) {
            m.mode = 'paw';
            m.t = 0;
            m.target = { x: P.x, y: P.y };
            LM.audio.play('behemothRoar', { vol: Math.max(0.35, vol(game, e.x, e.y, 900)) });
          }
          // now and then it breathes fire at nothing, to keep it in
          m.fireCd = (m.fireCd || U.rand(8, 14)) - dt;
          if (m.fireCd <= 0) {
            m.fireCd = U.rand(10, 18);
            m.flame = 1.1;
          }
        } else if (m.mode === 'paw') {
          m.t += dt;
          e.speedMul = 0;
          if (P) m.target = { x: P.x, y: P.y };
          e.facing += U.angDiff(e.facing, Math.atan2(m.target.y - e.y, m.target.x - e.x)) * Math.min(1, dt * 3);
          if (Math.random() < dt * 8) game.particles.burst(e.x - Math.cos(e.facing) * 40, e.y - Math.sin(e.facing) * 40, 2, { type: 'dot', color: '#3a3430', speed: 60, life: 0.6, size: [1, 2] });
          if (m.t > 1.1) {
            m.mode = 'charge';
            m.t = 0;
          }
        } else if (m.mode === 'charge') {
          m.t += dt;
          e.speedMul = 6.5;
          const a = Math.atan2(m.target.y - e.y, m.target.x - e.x);
          e.mx += Math.cos(a);
          e.my += Math.sin(a);
          if (e.hitWall || m.t > 1.6) {
            if (e.hitWall) {
              // into the glass: the whole vault rings
              game.addShake(0.5, e.facing);
              LM.audio.play('titanSlam', { vol: Math.max(0.5, vol(game, e.x, e.y, 900)) });
              const hx = e.x + Math.cos(e.facing) * 100, hy = e.y + Math.sin(e.facing) * 100;
              game.particles.burst(hx, hy, 14, { type: 'spark', color: '#e8f4ff', speed: 200, life: 0.4, size: 1 });
              if (!game.hasFlag('behemothCharged')) game.setFlag('behemothCharged');
            }
            m.mode = 'recover';
            m.t = 0;
            m.chargeCd = U.rand(8, 12);
          }
        } else if (m.mode === 'recover') {
          m.t += dt;
          e.speedMul = 0.3;
          if (m.t > 1.6) m.mode = 'walk';
        }
        // the flame: a gout forward, kept in by the walls
        if (m.flame > 0) {
          m.flame -= dt;
          e.speedMul = 0;
          m.flameTick = (m.flameTick || 0) - dt;
          if (m.flameTick <= 0) {
            m.flameTick = 0.05;
            const a = e.facing + U.rand(-0.3, 0.3);
            LM.combat.shoot(game, { type: 'ds-flame', x: e.x + Math.cos(e.facing) * 100, y: e.y + Math.sin(e.facing) * 100, angle: a, speed: 260, owner: 'enemy', faction: 'titan', by: e, damage: 0, range: 200 });
          }
          if (Math.random() < dt * 3) LM.audio.play('flameJet', { vol: vol(game, e.x, e.y, 700) * 0.6 });
        }
      },
    },
  };

  // ======================================================== items
  const items = {
    'ds-leviathan': {
      name: 'Leviathan', radius: 20, drawRadius: 380, shadow: false, dressing: false, mapColor: '#3f8a6e', z: -1,
      light: { color: '#5ac8a0', radius: 260, intensity: 0.32 },
      update(it, dt, game) {
        it.s = (it.s || 0) + (it.props.speed || 58) * dt;
        const P = game.player;
        if (P && U.dist(P.x, P.y, it.x, it.y) < 12 * T) {
          it.hissCd = (it.hissCd || 3) - dt;
          if (it.hissCd <= 0) {
            it.hissCd = U.rand(5, 9);
            LM.audio.play('levHiss', { vol: vol(game, it.x, it.y, 600) });
          }
        }
      },
      draw: drawLeviathan,
      drawGlow(g, it, t) {
        const { pts, n } = levSegments(it);
        for (let i = 6; i < n - 4; i += 6) {
          const open = U.clamp((Math.sin(t * (0.6 + U.hash2(i, 5, 2) * 0.7) + i * 1.7) + 0.75) * 5, 0, 1);
          if (open > 0.5) G.glow(g, pts[i].x, pts[i].y, 10, '#e8d070', 0.18 * open);
        }
        G.glow(g, pts[0].x, pts[0].y, 30, '#ff5a3a', 0.15);
      },
    },
    'ds-tiamat': {
      name: 'Tiamat', radius: 20, drawRadius: 260, shadow: false, dressing: false, mapColor: '#1d4a66', z: -1,
      light: { color: '#3a8ac8', radius: 260, intensity: 0.3, flicker: 0.12 },
      update(it, dt, game) {
        const P = game.player;
        // the nucleus divides, and divides, until it's one thing again
        const d = (it.div = it.div || { n: 1, t: 0, merge: 0 });
        d.t += dt;
        if (d.merge > 0) {
          d.merge -= dt * 0.7;
          if (d.merge <= 0) {
            d.merge = 0;
            d.n = 1;
            d.t = 0;
          }
        } else if (d.t > 1.5) {
          d.t = 0;
          if (d.n >= 32) {
            d.merge = 1;
            LM.audio.play('tiamatUnity', { vol: vol(game, it.x, it.y, 700) });
          } else d.n *= 2;
        }
        // a pseudopod: it reaches for the glass, toward you if it can see you
        if (!it.pod || it.pod.k <= 0) {
          it.podCd = (it.podCd || U.rand(2, 4)) - dt;
          if (it.podCd <= 0) {
            it.podCd = U.rand(3, 6);
            const toP = P ? Math.atan2(P.y - it.y, P.x - it.x) : Math.random() * TAU;
            it.pod = { a: P && U.dist(P.x, P.y, it.x, it.y) < 14 * T ? toP : Math.random() * TAU, len: (it.props.r || 4) * T * U.rand(0.35, 0.7), k: 0, t: 0 };
          }
        } else {
          it.pod.t += dt;
          it.pod.k = Math.sin(Math.min(1, it.pod.t / 1.6) * Math.PI);
          if (it.pod.t >= 1.6) it.pod.k = 0;
        }
        // a wave: it gathers itself and throws itself at the glass
        if (!it.wave || it.wave.k <= 0) {
          it.waveCd = (it.waveCd || U.rand(5, 8)) - dt;
          if (it.waveCd <= 0 && P && U.dist(P.x, P.y, it.x, it.y) < 12 * T && losLight(game, it.x, it.y, P.x, P.y)) {
            it.waveCd = U.rand(6, 10);
            it.wave = { a: Math.atan2(P.y - it.y, P.x - it.x), k: 0, t: 0 };
          }
        } else {
          const w = it.wave;
          w.t += dt;
          w.k = w.t < 0.7 ? w.t / 0.7 : Math.max(0, 1 - (w.t - 0.7) / 0.5);
          if (w.t >= 0.7 && !w.hit) {
            w.hit = true;
            const R = (it.props.r || 4) * T;
            const hx = it.x + Math.cos(w.a) * R * 1.4, hy = it.y + Math.sin(w.a) * R * 1.4;
            game.particles.burst(hx, hy, 22, { type: 'dot', color: '#a8e0f0', speed: 180, life: 0.7, size: [1, 2.4], angle: w.a + Math.PI, spread: 1.2 });
            LM.audio.play('tiamatWave', { vol: Math.max(0.3, vol(game, hx, hy, 700)) });
            game.addShake(0.15, w.a);
          }
          if (w.t > 1.3) w.k = 0;
        }
        // and its young come up through the drains
        const drains = (game.level.tags && game.level.tags[it.props.drains || 'drain']) || [];
        if (drains.length && P && !P.dead) {
          it.spawnCd = (it.spawnCd == null ? 12 : it.spawnCd) - dt;
          if (it.spawnCd <= 0) {
            it.spawnCd = U.rand(it.props.every || 22, (it.props.every || 22) * 1.6);
            const alive = game.enemies.filter((e) => !e.dead && e.def.id === 'ds-brine').length;
            if (alive < (it.props.max || 3)) {
              // the drain nearest you that you can't see, if there is one
              const pick = drains.slice().sort((a, b) => U.dist(a.x * T, a.y * T, P.x, P.y) - U.dist(b.x * T, b.y * T, P.x, P.y)).find((q) => U.dist(q.x * T, q.y * T, P.x, P.y) > 4 * T) || drains[0];
              const x = pick.x * T + T / 2, y = pick.y * T + T / 2;
              game.spawnEnemy('ds-brine', x, y, { aggro: true, summoned: true });
              game.particles.burst(x, y, 10, { type: 'dot', color: '#3a8ac8', speed: 90, life: 0.6, size: [1, 2] });
              LM.audio.play('brineGurgle', { vol: vol(game, x, y, 600) });
            }
          }
        }
      },
      draw: drawTiamat,
      drawGlow(g, it, t) {
        const d = it.div || {};
        G.glow(g, 0, 0, 40, '#7fd4ff', 0.18 + (d.merge || 0) * 0.5);
        // it gives off its own faint light, like deep water with something living in it: the edge, the glints
        const pts = tiamatShape(it, t, 72);
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(70,170,220,0.22)';
        g.lineWidth = 6;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.stroke();
        g.strokeStyle = 'rgba(150,225,255,0.3)';
        g.lineWidth = 1.6;
        g.stroke();
        const R = (it.props.r || 4) * T;
        for (let i = 0; i < 10; i++) {
          const a = U.hash2(i, 7, 3) * TAU + t * 0.06, r2 = R * (0.25 + U.hash2(i, 8, 3) * 0.6);
          const k = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1);
          G.glow(g, Math.cos(a) * r2, Math.sin(a) * r2, 7, '#5ac0f0', 0.16 * k);
        }
        g.restore();
      },
    },
    'ds-judgment-eye': {
      name: 'The Eye of Judgment', radius: 18, drawRadius: 340, shadow: false, dressing: false, mapColor: '#ffb040', z: 1,
      light: { color: '#ffb040', radius: 200, intensity: 0.45 },
      init(it) {
        it.gaze = Math.random() * TAU;
        it.fix = 0;
      },
      update(it, dt, game) {
        const c = cellRect(it), P = game.player;
        // drift about its vault
        if (c) {
          if (!it.goal || U.dist(it.x, it.y, it.goal.x, it.goal.y) < 8) it.goal = { x: U.rand(c.x0 + 2 * T, c.x1 - 2 * T), y: U.rand(c.y0 + 2 * T, c.y1 - 2 * T) };
          const sp = it.judging ? 6 : 22, d = U.dist(it.x, it.y, it.goal.x, it.goal.y) || 1;
          it.x += ((it.goal.x - it.x) / d) * sp * dt;
          it.y += ((it.goal.y - it.y) / d) * sp * dt;
        }
        const range = (it.props.range || 11) * T;
        const sees = P && !P.dead && U.dist(P.x, P.y, it.x, it.y) < range && losLight(game, it.x, it.y, P.x, P.y);
        // with nobody to judge, it looks for something else that moves (not its own kind)
        if (!sees) {
          it.seekCd = (it.seekCd || 0) - dt;
          if (it.seekCd <= 0 || (it.prey && it.prey.dead)) {
            it.seekCd = 0.5;
            let best = null, bd = range;
            for (const e of game.enemies) {
              if (e.dead || e.def.immune || e.faction === 'titan') continue;
              const d = U.dist(e.x, e.y, it.x, it.y);
              if (d < bd && losLight(game, it.x, it.y, e.x, e.y)) {
                bd = d;
                best = e;
              }
            }
            it.prey = best;
          }
        } else it.prey = null;
        const prey = it.prey && !it.prey.dead ? it.prey : null;
        if (prey) it.gaze += U.angDiff(it.gaze, Math.atan2(prey.y - it.y, prey.x - it.x)) * Math.min(1, dt * 1.6);
        if (sees) {
          // it turns to look; a while in its gaze and it judges
          const want = Math.atan2(P.y - it.y, P.x - it.x);
          it.gaze += U.angDiff(it.gaze, want) * Math.min(1, dt * 1.6);
          const inCone = Math.abs(U.angDiff(it.gaze, want)) < 0.3;
          it.fix = U.clamp(it.fix + (inCone ? dt / 1.3 : -dt), 0, 1);
          if (it.fix > 0.15 && !it.warned) {
            it.warned = true;
            LM.audio.play('eyeCharge', { vol: 0.7 });
          }
        } else {
          if (!prey) it.gaze += dt * 0.5 * Math.sin(game.time * 0.3 + (it.props.seed || 0));
          it.fix = Math.max(0, it.fix - dt * 0.8);
          if (it.fix <= 0) it.warned = false;
        }
        it.judging = it.fix >= 1;
        if (it.judging && sees) {
          LM.status.apply(game, P, 'judged');
          it.burnSnd = (it.burnSnd || 0) - dt;
          if (it.burnSnd <= 0) {
            it.burnSnd = 0.35;
            LM.audio.play('judgeBurn', { vol: 0.8 });
          }
          if (!game.hasFlag('judged')) game.setFlag('judged');
        }
        // and whatever else wanders into its gaze
        for (const e of game.enemies) {
          if (e.dead || e.def.immune || U.dist(e.x, e.y, it.x, it.y) > range) continue;
          if (Math.abs(U.angDiff(it.gaze, Math.atan2(e.y - it.y, e.x - it.x))) > 0.22) continue;
          if (!losLight(game, it.x, it.y, e.x, e.y)) continue;
          e._judged = (e._judged || 0) + dt;
          if (e._judged > 0.8) LM.combat.hurt(game, e, 40 * dt, { source: 'hazard', type: 'status', status: 'burning' });
        }
      },
      draw: drawEye,
      drawGlow(g, it, t, game) {
        const c = cellRect(it), range = (it.props.range || 11) * T;
        const a = it.gaze, k = it.fix || 0;
        // the gaze: a cone of amber, kept to its vault unless it has fixed on you
        g.save();
        if (c && !(it.judging && game && game.player)) {
          g.beginPath();
          g.rect(c.x0 - it.x, c.y0 - it.y, c.x1 - c.x0, c.y1 - c.y0);
          g.clip();
        }
        const half = 0.3 - k * 0.18;
        const grd = g.createRadialGradient(0, -10, 0, 0, -10, range);
        grd.addColorStop(0, 'rgba(255,200,90,' + (0.25 + k * 0.4) + ')');
        grd.addColorStop(1, 'rgba(255,140,40,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(0, -10);
        g.arc(0, -10, range, a - half, a + half);
        g.closePath();
        g.fill();
        g.restore();
        if (it.judging && game && game.player) {
          const P = game.player;
          g.strokeStyle = 'rgba(255,230,160,0.85)';
          g.lineWidth = 3 + Math.sin(t * 40) * 1;
          g.beginPath();
          g.moveTo(0, -10);
          g.lineTo(P.x - it.x, P.y - it.y);
          g.stroke();
          G.glow(g, P.x - it.x, P.y - it.y, 26, '#ffb040', 0.8);
        }
        G.glow(g, 0, -10, 30, '#ffb040', 0.35 + k * 0.5);
      },
    },
    'ds-wings': {
      name: 'The Circle of Wings', radius: 20, drawRadius: 200, shadow: false, dressing: false, mapColor: '#f2f0e8', z: 1,
      light: { color: '#fff4e0', radius: 280, intensity: 0.5, flicker: 0.2 },
      update(it, dt, game) {
        it.beat = (it.beat || 0) + dt;
        const per = 2.4;
        const ph = (it.beat % per) / per;
        it.pulse = ph < 0.15 ? ph / 0.15 : Math.max(0, 1 - (ph - 0.15) / 0.5);
        if (ph < dt / per + 0.0001) LM.audio.play('wingsPulse', { vol: vol(game, it.x, it.y, 650) * 0.8 });
        // it loves you: it would like you closer, and it pulls, gently, from behind the glass
        const P = game.player;
        const dP = P ? U.dist(P.x, P.y, it.x, it.y) : 1e9;
        if (P && !P.dead && dP < (it.props.reach || 8.5) * T && losLight(game, it.x, it.y, P.x, P.y)) {
          // harder on the beat
          LM.physics.pull(game, it, { radius: (it.props.reach || 8.5) * T, strength: 60 + 70 * (it.pulse || 0), enemies: false, swirl: 0 }, dt);
          if (!it.spoke) {
            it.spoke = true;
            game.toast(it.props.whisper || 'A warmth on your face. Something is glad to see you. It would like you closer. Closer.', 'warn');
          }
          // up against the glass, every beat of it goes through you
          if (dP < (it.props.burnAt || 6.4) * T && ph < dt / per + 0.0001) {
            LM.combat.hurt(game, P, it.props.damage || 7, { source: 'hazard', type: 'status' });
            game.particles.burst(P.x, P.y, 8, { type: 'mote', color: '#fff4e0', speed: 60, life: 0.6, size: [1, 2] });
            if (!it.burned) {
              it.burned = true;
              game.toast('The glass is as warm as skin. Every beat of the light goes through you, and it hurts, and it is the best thing you have ever felt.', 'warn');
            }
          }
        }
      },
      draw: drawWings,
      drawGlow(g, it, t) {
        const p = it.pulse || 0;
        G.glow(g, 0, 0, 70 + p * 40, '#fff8e8', 0.35 + p * 0.45);
        if (p > 0.6) {
          g.strokeStyle = 'rgba(255,250,235,' + (p - 0.6) + ')';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(0, 0, 60 + (1 - p) * 120, 0, TAU);
          g.stroke();
        }
      },
    },
    'ds-frog': {
      name: 'The Frog', radius: 30, drawRadius: 140, shadow: false, dressing: false, mapColor: '#3a4a2a',
      update(it, dt, game) {
        const P = game.player;
        const close = P && !P.dead && U.dist(P.x, P.y, it.x, it.y) < (it.props.smileAt || 5.5) * T && losLight(game, it.x, it.y, P.x, P.y);
        it.smile = U.clamp((it.smile || 0) + (close ? dt * 0.6 : -dt * 0.8), 0, 1);
        if (close && it.smile > 0.3 && !it.smiled) {
          it.smiled = true;
          LM.audio.play('frogSmile', { vol: 0.5 });
          if (!game.hasFlag('frogSmiled')) game.setFlag('frogSmiled');
        }
        if (!close && it.smile <= 0) it.smiled = false;
        // it breathes in. Everything loose in the vault goes toward the hole, and over its edge, and down.
        it.inhaleCd = (it.inhaleCd == null ? U.rand(4, 8) : it.inhaleCd) - dt;
        if (it.inhaleCd <= 0 && !(it.inhale > 0)) {
          it.inhale = 2.6;
          it.inhaleCd = U.rand(8, 13);
          LM.audio.play('frogInhale', { vol: vol(game, it.x, it.y, 600) });
        }
        if (it.inhale > 0) {
          it.inhale -= dt;
          const c = cellRect(it);
          if (c && Math.random() < dt * 30) {
            const x = U.rand(c.x0 + T, c.x1 - T), y = U.rand(c.y0 + T, c.y1 - T);
            const hx = it.x, hy = it.y - 30;
            const d = U.dist(x, y, hx, hy) || 1;
            game.particles.add({ type: 'dot', x, y, vx: ((hx - x) / d) * 160, vy: ((hy - y) / d) * 160, drag: 0, life: d / 160, color: '#6a6458', size: 1.2 });
          }
        }
      },
      draw: drawFrog,
    },
    'ds-garden': {
      name: 'The Crystal Garden', radius: 26, drawRadius: 140, shadow: false, dressing: false, mapColor: '#e8f0ff',
      light: { color: '#e8f4ff', radius: 240, intensity: 0.42 },
      update(it, dt, game) {
        it.grow = Math.min(1.05, (it.grow == null ? 0.85 : it.grow) + dt * 0.002);
        const reg = it.props.region;
        if (!reg) return;
        it.spreadCd = (it.spreadCd == null ? 4 : it.spreadCd) - dt;
        if (it.spreadCd > 0) return;
        it.spreadCd = it.props.every || 7;
        const crystals = game.items.filter((x) => !x.dead && x.def.id === 'ds-crystal');
        if (crystals.length >= (it.props.cap || 44)) return;
        const L = game.level, P = game.player;
        const from = crystals.length ? crystals[Math.floor(Math.random() * crystals.length)] : it;
        const fx = Math.floor(from.x / T), fy = Math.floor(from.y / T);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
          const tx = fx + dx, ty = fy + dy;
          if (tx < reg[0] || ty < reg[1] || tx >= reg[0] + reg[2] || ty >= reg[1] + reg[3]) continue;
          if (!L.inBounds(tx, ty) || L.t(tx, ty).solid) continue;
          if (crystals.some((c) => Math.floor(c.x / T) === tx && Math.floor(c.y / T) === ty)) continue;
          if (P && Math.floor(P.x / T) === tx && Math.floor(P.y / T) === ty) continue;
          const cr = game.spawnItemAt('ds-crystal', tx * T + T / 2 + U.rand(-5, 5), ty * T + T / 2 + U.rand(-5, 5), { seed: Math.floor(Math.random() * 1000), grown: true });
          if (cr) {
            cr.grow = 0.2;
            LM.audio.play('crystalGrow', { vol: vol(game, cr.x, cr.y, 500) * 0.6 });
          }
          break;
        }
      },
      draw: drawGarden,
      drawGlow(g, it, t) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + t * 0.1, r = 20 + 16 * Math.sin(t * 0.5 + i);
          G.glow(g, Math.cos(a) * r, Math.sin(a) * r, 8, i % 2 ? '#ffd0ff' : '#c0f0ff', 0.2 + 0.15 * Math.sin(t * 3 + i));
        }
      },
    },
    // what the Garden grows: touch it and it's in you (crystallizing: six and you're part of the Garden). Any
    // hard knock shatters it.
    'ds-crystal': {
      name: 'Crystal', radius: 11, shadow: false, dressing: 'Tartarus', mapColor: '#e8f0ff',
      destructible: {
        hp: 22,
        onBreak(it, game) {
          game.particles.burst(it.x, it.y, 12, { type: 'spark', color: '#eef6ff', speed: 160, life: 0.4, size: 1 });
          LM.audio.play('crystalBreak', { vol: game.vol(it.x, it.y) });
        },
      },
      init(it) {
        if (it.props.seed == null) it.props.seed = Math.floor(U.hash2(it.tx, it.ty, 5) * 1000);
      },
      update(it, dt, game) {
        if (it.grow != null && it.grow < 1) it.grow = Math.min(1, it.grow + dt * 0.35);
        const P = game.player;
        it.touchCd = (it.touchCd || 0) - dt;
        if (P && !P.dead && it.touchCd <= 0 && U.dist(P.x, P.y, it.x, it.y) < it.r + P.r * 0.6 && P.dashT <= 0) {
          it.touchCd = 0.7;
          LM.status.apply(game, P, 'crystallizing');
          LM.audio.play('crystalTouch', { vol: 0.6 });
          if (!game.hasFlag('crystalTouched')) {
            game.setFlag('crystalTouched');
            game.toast('Where it touched you, your skin has gone white and hard and very clear.', 'warn');
          }
        }
      },
      draw: drawCrystal,
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, '#e8f4ff', 0.15 + 0.08 * Math.sin(t * 2 + (it.props.seed || 0)));
      },
    },
    'ds-hundred': {
      name: 'The Hundred-Handed', radius: 30, drawRadius: 280, shadow: false, dressing: false, mapColor: '#c8c0b2',
      update(it, dt, game) {
        const P = game.player, b = it.props.bars;
        if (!b || !P || P.dead) return;
        const by = (b[1] + 0.5) * T, x0 = b[0] * T, x1 = (b[2] + 1) * T;
        const reachD = (it.props.reach || 1.8) * T;
        const side = P.y > by ? 1 : -1;
        const inFront = side === (it.props.outside || 1) && P.x > x0 - 10 && P.x < x1 + 10 && Math.abs(P.y - by) < reachD;
        it.grabCd = (it.grabCd || 0) - dt;
        if (it.reach) {
          it.reach.t += dt;
          it.reach.k = it.reach.t < 0.25 ? it.reach.t / 0.25 : Math.max(0, 1 - (it.reach.t - 0.6) / 0.3);
          if (it.reach.t >= 0.22 && !it.reach.hit) {
            it.reach.hit = true;
            if (U.dist(P.x, P.y, it.reach.x, it.reach.y) < 24 && P.dashT <= 0) {
              LM.combat.hurt(game, P, it.props.damage || 14, { source: 'enemy', type: 'melee' });
              LM.status.apply(game, P, 'grasped');
              LM.audio.play('handsGrab', { vol: 0.9 });
              // and it pulls you to the bars
              const dy = by - P.y;
              LM.physics.move(game.level, P, 0, dy * 0.45);
              if (!game.hasFlag('handsGrabbed')) game.setFlag('handsGrabbed');
            }
          }
          if (it.reach.t > 0.9) it.reach = null;
        } else if (inFront && it.grabCd <= 0) {
          it.grabCd = it.props.every || 1.4;
          const sx = U.clamp(P.x, x0 + 8, x1 - 8);
          it.reach = { sx, x: P.x, y: P.y, t: 0, k: 0 };
          LM.audio.play('handsReach', { vol: 0.6 });
        }
      },
      draw: drawHundred,
    },
  };

  // ======================================================== enemies
  const enemies = {
    'ds-behemoth': {
      name: 'Behemoth', hp: 99999, speed: 52, radius: 40, mass: 99, accel: 3.5, turn: 1.4, ai: 'ds-titan-pace', faction: 'titan',
      sight: 600, leash: 99999, immune: true, immuneText: 'nothing', drawRadius: 150, pullImmune: true,
      hitbox: { front: 80, back: 80, r: 44 },
      resist: { burning: 1, chilled: 1, staggered: 1, held: 1, snared: 1, stasis: 0.85 },
      blood: '#1a1a20', color: '#141418', deathSound: 'explode',
      bossBar: { name: 'Behemoth', color: '#c98a3a', sub: () => 'it cannot be hurt', range: 1200 },
      attacks: [
        { type: 'charge', damage: 80, speed: 380, duration: 0.9, windup: 0.8, cooldown: 3.6, minRange: 70, maxRange: 460, stun: 1.2 },
        { type: 'ranged', projectile: 'ds-flame', damage: 9, speed: 300, burst: 16, burstGap: 0.04, fan: 0.6, windup: 0.6, cooldown: 2.8, range: 300, status: { id: 'burning', seconds: 3 }, moveWhileFiring: 0, flash: '#ff8a3a' },
        { type: 'melee', damage: 60, range: 36, windup: 0.4, recover: 0.4, cooldown: 1.2, knock: 420 },
      ],
      draw: drawBehemoth,
      drawGlow(g, e, t) {
        const m = e.mem || {};
        const hx = e.x + Math.cos(e.facing) * 122, hy = e.y + Math.sin(e.facing) * 122;
        // (an enemy's glow is drawn in world space)
        G.glow(g, hx, hy, 14 + Math.sin(t * 3) * 3, '#ff6a1a', m.flame > 0 ? 0.9 : 0.35);
      },
    },
    'ds-brine': {
      name: 'Brine', hp: 80, speed: 96, radius: 11, mass: 1.4, accel: 6, turn: 6, ai: 'chaser', sight: 420, leash: 1400,
      blood: '#0e3a5a', gib: '#3a8ac8', color: '#0c2a3e', deathSound: 'splash', resist: { burning: 0.5 },
      attacks: [{ type: 'melee', damage: 6, range: 10, windup: 0.3, recover: 0.5, cooldown: 2.2, knock: 0, status: 'engulfed' }],
      drops: { items: [{ id: 'ds-medgel', chance: 0.1 }, { id: 'ammo-rounds', chance: 0.15 }] },
      update(e, dt, game) {
        e.mem.gurgle = (e.mem.gurgle || U.rand(1, 3)) - dt;
        if (e.mem.gurgle <= 0) {
          e.mem.gurgle = U.rand(2.5, 5);
          LM.audio.play('brineGurgle', { vol: game.vol(e.x, e.y) * 0.5 });
        }
      },
      draw: drawBrine,
    },
  };

  if (LM.audio && LM.audio.define) {
    const A = LM.audio;
    A.define('titanSlam', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 200, freqEnd: 60, dur: 0.9, gain: 0.5 });
      kit.tone(t, o, { type: 'sine', f0: 70, f1: 32, dur: 0.9, gain: 0.35 });
      kit.noise(t + 0.02, o, { type: 'highpass', freq: 2600, dur: 0.4, gain: 0.08 });
    });
    A.define('behemothRoar', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sawtooth', f0: 62, f1: 48, dur: 1.4, gain: 0.12, attack: 0.15 });
      kit.noise(t, o, { type: 'bandpass', freq: 240, freqEnd: 140, dur: 1.3, gain: 0.18, q: 1.5, attack: 0.2 });
    });
    A.define('behemothSnort', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 500, freqEnd: 260, dur: 0.35, gain: 0.12, q: 1 });
    });
    A.define('levHiss', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 3000, dur: 1.1, gain: 0.07, attack: 0.3 });
    });
    A.define('tiamatWave', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 900, freqEnd: 200, dur: 1.1, gain: 0.3, attack: 0.05 });
      kit.noise(t + 0.05, o, { type: 'highpass', freq: 3500, dur: 0.6, gain: 0.08 });
    });
    A.define('tiamatUnity', (t, o, opt, kit) => {
      for (const f of [110, 165, 220]) kit.tone(t, o, { type: 'sine', f0: f, dur: 1.6, gain: 0.05, attack: 0.3 });
    });
    A.define('brineGurgle', (t, o, opt, kit) => {
      for (let i = 0; i < 3; i++) kit.tone(t + i * 0.07, o, { type: 'sine', f0: 180 + i * 60, f1: 90, dur: 0.08, gain: 0.05 });
    });
    A.define('eyeCharge', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 300, f1: 1200, dur: 1.2, gain: 0.08, attack: 0.4 });
    });
    A.define('judgeBurn', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 1600, dur: 0.3, gain: 0.12, q: 2 });
    });
    A.define('wingsPulse', (t, o, opt, kit) => {
      for (const f of [523, 659, 784, 1047]) kit.tone(t, o, { type: 'sine', f0: f, dur: 1.6, gain: 0.025, attack: 0.25 });
    });
    A.define('frogInhale', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 300, freqEnd: 900, dur: 2.2, gain: 0.12, attack: 0.8 });
    });
    A.define('frogSmile', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'sine', f0: 92, dur: 0.6, gain: 0.08, attack: 0.2 });
    });
    A.define('crystalGrow', (t, o, opt, kit) => {
      for (let i = 0; i < 3; i++) kit.tone(t + i * 0.05, o, { type: 'sine', f0: 2400 + i * 700, dur: 0.18, gain: 0.025 });
    });
    A.define('crystalBreak', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'highpass', freq: 4000, dur: 0.3, gain: 0.18 });
      for (let i = 0; i < 4; i++) kit.tone(t + i * 0.025, o, { type: 'sine', f0: 3000 + i * 600, f1: 2000, dur: 0.15, gain: 0.03 });
    });
    A.define('crystalTouch', (t, o, opt, kit) => {
      kit.tone(t, o, { type: 'triangle', f0: 1800, f1: 2600, dur: 0.3, gain: 0.05 });
    });
    A.define('handsReach', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'bandpass', freq: 700, dur: 0.2, gain: 0.08, q: 2 });
    });
    A.define('handsGrab', (t, o, opt, kit) => {
      kit.noise(t, o, { type: 'lowpass', freq: 600, dur: 0.25, gain: 0.25 });
      kit.tone(t, o, { type: 'sine', f0: 120, f1: 70, dur: 0.3, gain: 0.12 });
    });
  }

  // the Titans fight nobody while they're held (let one out, and the level makes it a monster)
  const factions = { titan: [] };

  LM.definePack({ id: 'ds-tartarus', statuses, behaviors, items, enemies, factions });
})();
