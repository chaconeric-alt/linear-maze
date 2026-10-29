/* The Linear Maze engine — engine/nextgen-neon.js
 * Neon for next-generation floors (engine/nextgen.js): coloured tubes along the walls. Each tube is a
 * row of ordinary static lights (so it lights the floor, is blocked by walls and can be switched by a
 * trap's 'lights' effect through its tag) plus its own glowing glass, drawn in the emissive pass. On a
 * tilted floor a tube sits on the wall's front, part way up.
 *
 * Where the tubes go (neon.where):
 *   'all'        any wall facing open floor
 *   'rooms'      walls of the named rooms (neon.rooms; every named room when the list is empty)
 *   'corridors'  walls of narrow passages
 *   'tag'        only along floor (or wall) tiles tagged neon.tag: paint the tag where you want tubes
 *   'none'       no tubes
 * density (0 to 1) is how many of the possible walls get one; colorMode 'room' gives each room one colour.
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE, U = LM.util, NG = LM.ng;
  const NE = (NG.neon = {});
  const isHex = (s) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s || ''));

  NE.build = function (game, L, cfg, N) {
    const colors = (cfg.colors || []).filter(isHex);
    const out = { tubes: [] };
    if (!colors.length || cfg.where === 'none') return out;
    const rnd = NG.rng(L, 'neon', 0);
    const density = U.clamp(+cfg.density || 0, 0, 1);
    const H = N.cfg.oblique.height;
    const tagged = new Set(((cfg.where === 'tag' && cfg.tag && L.tags[cfg.tag]) || []).map((p) => p.x + ',' + p.y));
    const rooms = cfg.rooms && cfg.rooms.length ? new Set(cfg.rooms) : null;
    const isOpen = (x, y) => L.inBounds(x, y) && !L.t(x, y).solid && L.t(x, y).id !== 'void';
    const narrow = (p, dir) => {
      // floor across the passage, away from this wall: three tiles or fewer is a corridor
      const [dx, dy] = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[dir];
      let n = 0;
      while (n < 5 && isOpen(p.x + dx * n, p.y + dy * n)) n++;
      return n <= 3;
    };
    const wallOf = (p, dir) => ({ s: [p.x, p.y - 1], n: [p.x, p.y + 1], e: [p.x - 1, p.y], w: [p.x + 1, p.y] }[dir]);
    const roomColor = new Map();
    let cycle = 0;
    const pickColor = (p) => {
      if (cfg.colorMode === 'random') return colors[Math.floor(rnd() * colors.length)];
      if (cfg.colorMode === 'cycle') return colors[cycle++ % colors.length];
      const room = NG.roomAt(L, p.x, p.y) || 'zone' + Math.floor(p.x / 10) + ',' + Math.floor(p.y / 10);
      if (!roomColor.has(room)) roomColor.set(room, colors[U.strHash(room + L.id) % colors.length]);
      return roomColor.get(room);
    };
    const spans = []; // [run, first index, last index] within run.open
    for (const run of N.edges) {
      const open = run.open;
      if (cfg.where === 'tag') {
        // the tagged stretches of this run
        let s = -1;
        for (let i = 0; i <= open.length; i++) {
          const p = open[i];
          const w = p && wallOf(p, run.dir);
          const on = p && (tagged.has(p.x + ',' + p.y) || tagged.has(w[0] + ',' + w[1]));
          if (on && s < 0) s = i;
          if (!on && s >= 0) {
            spans.push([run, s, i - 1]);
            s = -1;
          }
        }
        continue;
      }
      const mid = open[Math.floor(open.length / 2)];
      if (cfg.where === 'rooms') {
        const room = NG.roomAt(L, mid.x, mid.y);
        if (!room || (rooms && !rooms.has(room))) continue;
      }
      if (cfg.where === 'corridors' && open.filter((p) => narrow(p, run.dir)).length < open.length / 2) continue;
      if (rnd() >= (run.len >= 2 ? density : density * 0.3)) continue;
      let a = 0, b = open.length - 1;
      if (open.length >= 4 && rnd() < 0.5) {
        const len = Math.max(2, Math.floor(open.length * (0.4 + rnd() * 0.5)));
        a = Math.floor(rnd() * (open.length - len + 1));
        b = a + len - 1;
      }
      spans.push([run, a, b]);
    }
    for (const [run, a, b] of spans) {
      const horiz = run.dir === 's' || run.dir === 'n';
      const n = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[run.dir];
      const pa = run.open[a], pb = run.open[b];
      const inset = 0.15;
      const ex = run.x0 * T, ey = run.y0 * T;
      const ax = horiz ? (pa.x + inset) * T : ex, ay = horiz ? ey : (pa.y + inset) * T;
      const bx = horiz ? (pb.x + 1 - inset) * T : ex, by = horiz ? ey : (pb.y + 1 - inset) * T;
      const color = pickColor(pa);
      const tube = {
        dir: run.dir, color,
        ax: ax + n[0] * 1.5, ay: ay + n[1] * 1.5, bx: bx + n[0] * 1.5, by: by + n[1] * 1.5,
        // on the wall's front part way up; a wall seen from behind carries its tube on its top edge
        z: run.dir === 'n' ? H : H * U.clamp(cfg.mount == null ? 0.7 : +cfg.mount, 0.05, 1),
        flicker: rnd() < (+cfg.flicker || 0) ? 0.35 + rnd() * 0.45 : 0,
        phase: rnd() * 10,
        lights: [],
      };
      const len = Math.hypot(bx - ax, by - ay);
      const count = Math.max(1, Math.round(len / (T * 2)));
      for (let i = 0; i < count; i++) {
        const k = (i + 0.5) / count;
        const li = game.addStaticLight({
          x: U.lerp(ax, bx, k) + n[0] * 10, y: U.lerp(ay, by, k) + n[1] * 10,
          color, radius: +cfg.radius || 120, intensity: (cfg.brightness == null ? 0.9 : +cfg.brightness) * 0.55,
          flicker: tube.flicker * 0.9, tag: cfg.lightTag || 'neon',
        });
        li.phase = tube.phase;
        tube.lights.push(li);
      }
      tube.box = [Math.min(tube.ax, tube.bx) - 40, Math.min(tube.ay, tube.by) - 40, Math.max(tube.ax, tube.bx) + 40, Math.max(tube.ay, tube.by) + 40];
      out.tubes.push(tube);
    }
    return out;
  };

  /** How much of a tube the player sees: 1 in sight, 0.15 explored, 0 never seen (always 1 without a player). */
  function sight(game, L, tb) {
    const P = game.player;
    if (!P || game.attract || !game.los) return 1;
    const n = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[tb.dir];
    const fx = (tb.ax + tb.bx) / 2 + n[0] * 10, fy = (tb.ay + tb.by) / 2 + n[1] * 10;
    // the line of sight is costly to check; a tube keeps its answer for a few frames
    if (tb._seenAt === undefined || game.frame - tb._seenAt > 6) {
      tb._seenAt = game.frame;
      tb._seen = U.dist(P.x, P.y, fx, fy) < 900 && LM.physics.los(L, P.x, P.y, fx, fy) ? 1 : 0;
    }
    if (tb._seen) return 1;
    const tx = Math.floor(fx / T), ty = Math.floor(fy / T);
    return L.inBounds(tx, ty) && L.explored[ty * L.w + tx] ? 0.15 : 0;
  }

  /** The glowing glass, in the emissive pass ('lighter'). */
  NE.drawGlow = function (ctx, game, t, r) {
    const L = game.level, N = L.ng, f = r.ngf;
    if (!N || !N.neon || !f) return;
    const cfg = N.cfg.neon, v = r.view;
    const bright = cfg.brightness == null ? 0.9 : +cfg.brightness;
    ctx.save();
    ctx.lineCap = 'round';
    for (const tb of N.neon.tubes) {
      const b = tb.box;
      if (b[2] < v.x0 || b[0] > v.x1 || b[3] < v.y0 || b[1] > v.y1) continue;
      // seen now: full glow; a tube in a part of the floor you've been but can't see: a faint trace; never seen: nothing
      const seen = sight(game, L, tb);
      if (seen <= 0) continue;
      const lit = !tb.lights.length || !tb.lights[0].off;
      let k = (lit ? Math.min(1.2, bright) : 0.12) * seen;
      // the same stutter as its lights (engine/render.js), so glass and glow flicker together
      if (lit && tb.flicker) k *= 1 - tb.flicker * (0.5 + 0.5 * Math.sin(t * 13 + tb.phase) * Math.sin(t * 7.3 + tb.phase * 2));
      const [dax, day] = NG.lift(f, tb.ax, tb.ay, tb.z);
      const [dbx, dby] = NG.lift(f, tb.bx, tb.by, tb.z);
      const lines = [];
      if (cfg.style === 'double') {
        const dx = tb.bx - tb.ax, dy = tb.by - tb.ay, len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * 1.8, ny = (dx / len) * 1.8;
        lines.push([tb.ax + dax + nx, tb.ay + day + ny, tb.bx + dbx + nx, tb.by + dby + ny], [tb.ax + dax - nx, tb.ay + day - ny, tb.bx + dbx - nx, tb.by + dby - ny]);
      } else lines.push([tb.ax + dax, tb.ay + day, tb.bx + dbx, tb.by + dby]);
      const passes = [[9, U.rgba(tb.color, 0.12 * k)], [4, U.rgba(tb.color, 0.45 * k)], [1.6, lit ? U.mix(tb.color, '#ffffff', 0.55) : U.rgba(tb.color, 0.3)]];
      for (const [w, style] of passes) {
        ctx.lineWidth = w;
        ctx.strokeStyle = style;
        ctx.globalAlpha = w < 2 ? Math.min(1, 0.95 * Math.max(k, 0.3)) : 1;
        ctx.setLineDash(cfg.style === 'dashed' && w < 5 ? [7, 4] : []);
        for (const [x0, y0, x1, y1] of lines) {
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
    ctx.restore();
  };
})();
