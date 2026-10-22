/* The Linear Maze engine — engine/nextgen-sheets.js
 * Sprite-sheet looks: monsters, people and items drawn from a sheet of frames, as the editor makes them
 * from a 3D model (.glb) under Next gen → 3D objects. The sheet is one picture in the game's
 * editor/sprites.js; the look says how it is laid out:
 *
 *   look: {
 *     type: 'sheet', sprite: 'picture id',
 *     fw, fh,              one frame's size in pixels
 *     dirs: 1 | 4 | 8 | 16, the directions the model was drawn from; direction 0 faces east, then clockwise
 *     anims: { walk: { row, frames, fps, loop }, ... }   each animation's first row; one row per direction
 *     states: { idle, move, attack, hurt, die }           which animation plays when (names from anims)
 *     anchor: [ax, ay],    the pixel under the model's feet (drawn at the thing's position)
 *     upp,                 world units per pixel (32 units is one tile)
 *     glow,                optional glow colour
 *   }
 *
 * The editor runtime (engine/editor-runtime.js) turns a sheet look into draw functions with LM.ng.sheetLook.
 * A monster with a 'die' animation leaves it playing where it fell.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;
  const NG = (LM.ng = LM.ng || {});

  /** The animation a thing should be playing now. */
  function stateOf(look, e, kind) {
    const st = look.states || {};
    const has = (n) => n && look.anims && look.anims[n];
    if (kind === 'enemy' && e.atk && has(st.attack)) return st.attack;
    if (e.flash > 0 && has(st.hurt)) return st.hurt;
    const speed = Math.hypot(e.vx || 0, e.vy || 0);
    if (speed > 8 && has(st.move)) return st.move;
    if (has(st.idle)) return st.idle;
    return Object.keys(look.anims || {})[0];
  }
  /** Which way the thing faces, as a direction index of the sheet. */
  function dirOf(look, angle) {
    const n = look.dirs || 1;
    if (n <= 1) return 0;
    const a = (((angle + (look.facingOffset || 0)) % U.TAU) + U.TAU) % U.TAU;
    return Math.round(a / (U.TAU / n)) % n;
  }
  function frameOf(a, t0, t) {
    const n = Math.max(1, a.frames || 1);
    const i = Math.floor((t - t0) * (a.fps || 10));
    return a.loop === false ? Math.min(n - 1, i) : ((i % n) + n) % n;
  }
  function blit(g, look, img, row, col, alpha) {
    const fw = look.fw, fh = look.fh, upp = look.upp || 0.5;
    const [ax, ay] = look.anchor || [fw / 2, fh * 0.8];
    if (alpha != null) g.globalAlpha *= alpha;
    g.drawImage(img, col * fw, row * fh, fw, fh, -ax * upp, -ay * upp, fw * upp, fh * upp);
  }

  /** Draw functions for a sheet look. image(id) returns a loaded Image (the editor runtime's ED.image). */
  NG.sheetLook = function (look, kind, image) {
    const out = {
      draw(g, e, t) {
        const img = image(look.sprite);
        if (!img || !img.complete || !img.naturalWidth || !look.fw) {
          g.fillStyle = look.color || '#7a7a7a';
          g.beginPath();
          g.arc(0, 0, (e.r || 10) * 0.9, 0, U.TAU);
          g.fill();
          return;
        }
        let angle = e.facing;
        if (kind === 'item') {
          // items are drawn turned with their placement; draw the sheet upright and pick the direction instead
          if (e.turnAngle) g.rotate(-e.turnAngle);
          angle = Math.PI / 2 + (e.turnAngle || 0);
        }
        if (angle == null) angle = Math.PI / 2;
        const name = stateOf(look, e, kind);
        const a = look.anims && look.anims[name];
        if (!a) return;
        const s = e._ngSheet || (e._ngSheet = { name: null, t0: 0 });
        if (s.name !== name) {
          s.name = name;
          s.t0 = t;
        }
        if (look.bob) g.translate(0, Math.sin(t * 3 + (e.t || 0)) * 1.2);
        blit(g, look, img, a.row + dirOf(look, angle), frameOf(a, s.t0, t));
      },
    };
    if (look.glow) {
      out.drawGlow = kind === 'enemy'
        ? (g, e, t) => G.glow(g, e.x, e.y, look.glowSize || e.r * 2.6, look.glow, 0.25 + 0.08 * Math.sin(t * 2))
        : (g, it, t) => G.glow(g, 0, 0, look.glowSize || (it.r || 9) * 2, look.glow, 0.3 + 0.1 * Math.sin(t * 2.5));
    }
    const die = look.states && look.states.die && look.anims && look.anims[look.states.die];
    if (kind === 'enemy' && die) {
      // the death plays out where it fell, holds its last frame, then fades
      out.sheetDeath = function (e, game) {
        const img = image(look.sprite);
        if (!img || !game || !game.fx) return;
        const row = die.row + dirOf(look, e.facing == null ? Math.PI / 2 : e.facing);
        const dur = Math.max(1, die.frames || 1) / (die.fps || 10);
        game.fx.push({
          t: 0,
          update(dt) {
            this.t += dt;
            return this.t > dur + 1.6;
          },
          draw(ctx) {
            ctx.save();
            ctx.translate(e.x, e.y);
            const fade = this.t > dur + 0.8 ? 1 - (this.t - dur - 0.8) / 0.8 : 1;
            blit(ctx, look, img, row, frameOf(Object.assign({}, die, { loop: false }), 0, this.t), Math.max(0, fade));
            ctx.restore();
          },
        });
      };
    }
    return out;
  };
})();
