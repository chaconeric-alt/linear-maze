/* The Linear Maze engine — engine/nextgen-ceiling.js
 * Ceiling silhouettes for next-generation floors (engine/nextgen.js): black shapes hanging overhead,
 * drawn after the lighting so they stay dark against the light, and lifted by the camera's tilt and
 * parallax so they drift against the floor below them.
 *
 *   pipes     bundles of one to three pipes along a wall, with brackets, flanges and elbows into the wall
 *   ducts     a wide duct along a wall, banded every tile
 *   cables    cables slung across a room or corridor, sagging in the middle
 *   beams     open trusses across a corridor
 *   hanging   lamps on cords
 *   fans      turning ceiling fans in open rooms; their blades hide what is under them as they pass.
 *             Tiles tagged with the floor's fanTag always get one.
 *
 * Everything is laid out once per floor from its map and a seed, so a floor looks the same every visit;
 * clutter (0 to 1) says how much of it there is.
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE, U = LM.util, NG = LM.ng;
  const C = (NG.ceiling = {});

  /** Every fixture on the floor: [{ kind, z, w, pts: [[x, y, z]...], box: [x0, y0, x1, y1], ... }]. */
  C.build = function (L, cfg, N) {
    const rnd = NG.rng(L, 'ceiling', cfg.seed);
    const c = U.clamp(+cfg.clutter || 0, 0, 1);
    const H = N.cfg.oblique.height * (cfg.height || 1.7);
    const out = [];
    const isOpen = (x, y) => L.inBounds(x, y) && !L.t(x, y).solid && L.t(x, y).id !== 'void';
    const wall = (x, y) => NG.raised(L.t(x, y));
    // a point d units out from a run's wall line, at tile position along it
    const along = (run, at, d) => {
      const n = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[run.dir];
      const horiz = run.dir === 's' || run.dir === 'n';
      const x = horiz ? at * T : run.x0 * T, y = horiz ? run.y0 * T : at * T;
      return [x + n[0] * d, y + n[1] * d];
    };
    const busy = new Set(); // wall runs already carrying something
    // nothing runs along a wall with something on it or in front of it you might need to see (a panel, a switch, a desk)
    const things = new Set(L.spawns.filter((sp) => sp.kind !== 'door').map((sp) => sp.x + ',' + sp.y));
    const cluttered = (run) => run.open.some((p) => {
      const w = { s: [p.x, p.y - 1], n: [p.x, p.y + 1], e: [p.x - 1, p.y], w: [p.x + 1, p.y] }[run.dir];
      return things.has(p.x + ',' + p.y) || things.has(w[0] + ',' + w[1]);
    });
    if (c > 0) {
      for (const run of N.edges) {
        if (run.len < 2 || cluttered(run)) continue;
        const key = run.dir + run.x0 + ',' + run.y0;
        const a0 = run.dir === 's' || run.dir === 'n' ? run.x0 : run.y0, a1 = a0 + run.len;
        // ducts first: they are the biggest thing on a wall
        if (cfg.ducts && run.len >= 3 && rnd() < c * 0.22) {
          const w = 10 + rnd() * 6, d = w / 2 + 1;
          const s0 = a0 + Math.floor(rnd() * run.len * 0.25), s1 = a1 - Math.floor(rnd() * run.len * 0.25);
          if (s1 - s0 >= 2) {
            out.push({ kind: 'duct', w, pts: [[...along(run, s0, d), H], [...along(run, s1, d), H]], bands: s1 - s0 });
            busy.add(key);
            continue;
          }
        }
        if (cfg.pipes && rnd() < c * 0.55) {
          const count = 1 + Math.floor(rnd() * Math.min(3, 1 + c * 3));
          const s0 = a0 + Math.floor(rnd() * run.len * 0.3), s1 = a1 - Math.floor(rnd() * run.len * 0.3);
          if (s1 - s0 < 2) continue;
          let d = 3;
          for (let i = 0; i < count; i++) {
            const w = 2.4 + rnd() * 3.4;
            d += w / 2;
            const z = H * (0.94 - i * 0.04);
            const pts = [];
            // the pipe comes out of the wall, runs along it and goes back in
            pts.push([...along(run, s0 + 0.25 * i, 0), z], [...along(run, s0 + 0.25 * i, d), z], [...along(run, s1 - 0.25 * i, d), z], [...along(run, s1 - 0.25 * i, 0), z]);
            const flanges = [];
            for (let a = s0 + 1; a < s1; a++) if (rnd() < 0.3) flanges.push(along(run, a + rnd() * 0.6, d).concat(z));
            const brackets = [];
            for (let a = s0 + 1; a < s1; a += 2) brackets.push([along(run, a, 0).concat(z), along(run, a, d).concat(z)]);
            out.push({ kind: 'pipe', w, pts, flanges, brackets: i === 0 ? brackets : [], horiz: run.dir === 's' || run.dir === 'n' });
            d += w / 2 + 1.5 + rnd() * 2;
          }
          busy.add(key);
        }
      }
      // spans: open runs of floor between two walls, across rows and columns
      const spans = [];
      for (let y = 0; y < L.h; y++) {
        let x = 0;
        while (x < L.w) {
          if (wall(x, y) && isOpen(x + 1, y)) {
            let e = x + 1;
            while (e < L.w && isOpen(e, y)) e++;
            if (e < L.w && wall(e, y) && e - x - 1 >= 2 && e - x - 1 <= 9) spans.push({ horiz: true, a: x + 1, b: e, at: y, len: e - x - 1 });
            x = e;
          } else x++;
        }
      }
      for (let x = 0; x < L.w; x++) {
        let y = 0;
        while (y < L.h) {
          if (wall(x, y) && isOpen(x, y + 1)) {
            let e = y + 1;
            while (e < L.h && isOpen(x, e)) e++;
            if (e < L.h && wall(x, e) && e - y - 1 >= 2 && e - y - 1 <= 9) spans.push({ horiz: false, a: y + 1, b: e, at: x, len: e - y - 1 });
            y = e;
          } else y++;
        }
      }
      const P = (sp, along, across) => (sp.horiz ? [along, across] : [across, along]);
      let lastBeam = -99;
      spans.forEach((sp, i) => {
        if (cfg.beams && sp.len <= 6 && i - lastBeam > 3 && rnd() < c * 0.16) {
          lastBeam = i;
          const at = sp.at * T + T / 2, w = 7 + rnd() * 5;
          out.push({ kind: 'beam', w, pts: [[...P(sp, sp.a * T, at), H * 1.02], [...P(sp, sp.b * T, at), H * 1.02]] });
          return;
        }
        if (cfg.cables && rnd() < c * 0.1) {
          const n = 1 + Math.floor(rnd() * 3);
          for (let k = 0; k < n; k++) {
            const a = sp.at * T + 6 + rnd() * (T - 12), b = sp.at * T + 6 + rnd() * (T - 12);
            const sag = H * (0.25 + rnd() * 0.3);
            const pts = [];
            for (let j = 0; j <= 12; j++) {
              const t = j / 12;
              pts.push([...P(sp, U.lerp(sp.a * T, sp.b * T, t), U.lerp(a, b, t)), H - sag * 4 * t * (1 - t)]);
            }
            out.push({ kind: 'cable', w: 1 + rnd() * 1.2, pts });
          }
        }
      });
    }
    // hanging lamps and fans need open floor around them
    const roomy = (x, y, r) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!isOpen(x + dx, y + dy)) return false;
      return true;
    };
    const fans = [];
    const farFrom = (list, x, y, d) => list.every((p) => Math.abs(p.tx - x) + Math.abs(p.ty - y) >= d);
    if (cfg.fans) {
      if (cfg.fanTag && L.tags[cfg.fanTag]) for (const p of L.tags[cfg.fanTag]) fans.push({ tx: p.x, ty: p.y, R: 22 + rnd() * 6 });
      if (c > 0) {
        for (let y = 2; y < L.h - 2; y++) {
          for (let x = 2; x < L.w - 2; x++) {
            if (U.hash2(x, y, (cfg.seed | 0) + 31) > c * 0.05) continue;
            const big = roomy(x, y, 2);
            if (!big && !roomy(x, y, 1)) continue;
            if (!farFrom(fans, x, y, 7)) continue;
            fans.push({ tx: x, ty: y, R: big ? 26 + rnd() * 12 : 16 + rnd() * 6 });
          }
        }
      }
      for (const f of fans) {
        const x = f.tx * T + T / 2, y = f.ty * T + T / 2;
        out.push({ kind: 'fan', x, y, z: H * 0.86, R: f.R, blades: 3 + Math.floor(rnd() * 3), speed: (2.2 + rnd() * 3) * (cfg.fanSpeed == null ? 1 : +cfg.fanSpeed) * (rnd() < 0.5 ? -1 : 1), phase: rnd() * U.TAU, guard: rnd() < 0.5, pts: [[x, y, H * 0.86]] });
      }
    }
    if (cfg.hanging && c > 0) {
      const lamps = [];
      for (let y = 1; y < L.h - 1; y++) {
        for (let x = 1; x < L.w - 1; x++) {
          if (U.hash2(x, y, (cfg.seed | 0) + 57) > c * 0.06 || !roomy(x, y, 1) || !farFrom(lamps, x, y, 4) || !farFrom(fans, x, y, 3)) continue;
          lamps.push({ tx: x, ty: y });
          const px = x * T + 6 + rnd() * (T - 12), py = y * T + 6 + rnd() * (T - 12);
          out.push({ kind: 'lamp', x: px, y: py, R: 3.5 + rnd() * 3, pts: [[px, py, H], [px, py, H * 0.42]] });
        }
      }
    }
    // a box around each, padded for the lift
    for (const f of out) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of f.pts) {
        x0 = Math.min(x0, p[0]);
        y0 = Math.min(y0, p[1]);
        x1 = Math.max(x1, p[0]);
        y1 = Math.max(y1, p[1]);
      }
      const pad = (f.R || 0) + (f.w || 0) + H * 1.3;
      f.box = [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
    }
    return out;
  };

  // ------------------------------------------------------------ drawing
  function rimFor(L, f, cfg) {
    if (f.rimC !== undefined) return f.rimC;
    let best = null, bd = 190 * 190;
    const N = L.ng;
    const [x, y] = f.pts[Math.floor(f.pts.length / 2)];
    if (N.neon) {
      for (const tb of N.neon.tubes) {
        const d = U.dist2(x, y, (tb.ax + tb.bx) / 2, (tb.ay + tb.by) / 2);
        if (d < bd) {
          bd = d;
          best = tb.color;
        }
      }
    }
    f.rimC = best || '#8a94a8';
    return f.rimC;
  }
  /** Draw the floor's silhouettes over everything but the overlays. With rim, draw instead the thin
   *  edge of light they catch from below; that pass goes in before the lighting, so it only shows where
   *  the floor under it is lit. */
  C.draw = function (ctx, game, t, r, rim) {
    const L = game.level, N = L.ng, list = N && N.ceiling, f = r.ngf;
    if (!list || !list.length || !f) return;
    const cfg = N.cfg.ceiling, v = r.view, par = cfg.parallax || 0;
    if (rim && !cfg.rim) return;
    const lift = (x, y, z) => {
      const [dx, dy] = NG.lift(f, x, y, z, par);
      return [x + dx, y + dy];
    };
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    const col = cfg.color || '#030407';
    const alpha = U.clamp(cfg.opacity == null ? 0.94 : +cfg.opacity, 0, 1);
    const grow = rim ? 1.8 : 0;
    ctx.globalAlpha = rim ? alpha * 0.55 : alpha;
    for (const fx of list) {
      const b = fx.box;
      if (b[2] < v.x0 || b[0] > v.x1 || b[3] < v.y0 || b[1] > v.y1) continue;
      ctx.strokeStyle = ctx.fillStyle = rim ? rimFor(L, fx, cfg) : col;
      if (fx.kind === 'fan') drawFan(ctx, fx, lift, t, grow);
      else if (fx.kind === 'lamp') drawLamp(ctx, fx, lift, grow);
      else drawRun(ctx, fx, lift, grow);
    }
    ctx.restore();
  };
  function path(ctx, pts, lift) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = lift(p[0], p[1], p[2]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
  }
  function drawRun(ctx, fx, lift, grow) {
    ctx.lineCap = fx.kind === 'duct' ? 'square' : fx.kind === 'beam' ? 'butt' : 'round';
    if (fx.kind === 'beam') {
      // an open truss: two chords and a zigzag between them
      const [a, b] = fx.pts;
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * fx.w / 2, ny = (dx / len) * fx.w / 2;
      ctx.lineWidth = 2.2 + grow;
      for (const s of [-1, 1]) {
        path(ctx, [[a[0] + nx * s, a[1] + ny * s, a[2]], [b[0] + nx * s, b[1] + ny * s, b[2]]], lift);
        ctx.stroke();
      }
      const n = Math.max(2, Math.round(len / 10));
      const zig = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n, s = i % 2 ? 1 : -1;
        zig.push([a[0] + dx * k + nx * s, a[1] + dy * k + ny * s, a[2]]);
      }
      ctx.lineWidth = 1.4 + grow;
      path(ctx, zig, lift);
      ctx.stroke();
      return;
    }
    ctx.lineWidth = fx.w + grow;
    path(ctx, fx.pts, lift);
    ctx.stroke();
    if (fx.kind === 'duct') {
      const [a, b] = fx.pts;
      ctx.lineWidth = 2 + grow;
      for (let i = 1; i < fx.bands; i++) {
        const k = i / fx.bands;
        const cx = U.lerp(a[0], b[0], k), cy = U.lerp(a[1], b[1], k);
        const horiz = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
        const e = fx.w / 2 + 1.2;
        path(ctx, horiz ? [[cx, cy - e, a[2]], [cx, cy + e, a[2]]] : [[cx - e, cy, a[2]], [cx + e, cy, a[2]]], lift);
        ctx.stroke();
      }
    }
    if (fx.kind === 'pipe') {
      for (const fl of fx.flanges || []) {
        const e = fx.w * 0.85;
        ctx.lineWidth = 2.2 + grow;
        path(ctx, fx.horiz ? [[fl[0], fl[1] - e, fl[2]], [fl[0], fl[1] + e, fl[2]]] : [[fl[0] - e, fl[1], fl[2]], [fl[0] + e, fl[1], fl[2]]], lift);
        ctx.stroke();
      }
      ctx.lineWidth = 1.4 + grow;
      for (const br of fx.brackets || []) {
        path(ctx, br, lift);
        ctx.stroke();
      }
    }
  }
  function drawFan(ctx, fx, lift, t, grow) {
    const [x, y] = lift(fx.x, fx.y, fx.z);
    const a0 = fx.phase + t * fx.speed;
    for (let i = 0; i < fx.blades; i++) {
      const a = a0 + (i * U.TAU) / fx.blades;
      const ca = Math.cos(a), sa = Math.sin(a);
      const L0 = fx.R * 0.16, L1 = fx.R + grow, w0 = fx.R * 0.1 + grow, w1 = fx.R * 0.2 + grow;
      ctx.beginPath();
      ctx.moveTo(x + ca * L0 - sa * w0, y + sa * L0 + ca * w0);
      ctx.lineTo(x + ca * L1 - sa * w1, y + sa * L1 + ca * w1);
      ctx.quadraticCurveTo(x + ca * (L1 + w1 * 0.6), y + sa * (L1 + w1 * 0.6), x + ca * L1 + sa * w1 * 0.4, y + sa * L1 - ca * w1 * 0.4);
      ctx.lineTo(x + ca * L0 + sa * w0, y + sa * L0 - ca * w0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, fx.R * 0.2 + grow, 0, U.TAU);
    ctx.fill();
    if (fx.guard) {
      ctx.lineWidth = 1.3 + grow;
      ctx.beginPath();
      ctx.arc(x, y, fx.R * 1.08, 0, U.TAU);
      ctx.stroke();
    }
    // the rod it hangs from, up to the ceiling
    const [cx, cy] = lift(fx.x, fx.y, fx.z / 0.86);
    ctx.lineWidth = 2 + grow;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }
  function drawLamp(ctx, fx, lift, grow) {
    ctx.lineWidth = 0.9 + grow;
    ctx.lineCap = 'round';
    path(ctx, fx.pts, lift);
    ctx.stroke();
    const p = fx.pts[1];
    const [x, y] = lift(p[0], p[1], p[2]);
    ctx.beginPath();
    ctx.arc(x, y, fx.R + grow, 0, U.TAU);
    ctx.fill();
  }
})();
