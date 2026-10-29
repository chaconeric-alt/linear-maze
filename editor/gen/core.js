/* Linear Maze Editor — gen/core.js
 * The installation generator's namespace (LMGen), seeded random streams and small helpers.
 *
 * Every file under editor/gen/ is a classic script that adds to root.LMGen, so the editor loads them
 * with script tags and tools/generate.mjs loads them with require() (the engine/manifest.js pattern).
 * Nothing here touches the DOM or the engine: the generator works on plain data.
 *
 * Randomness: never Math.random. G.rng(seed, 'stage', 'f2', 'r7') hashes its keys into its own stream,
 * so each stage, floor and room draws from a stream nothing else touches, and rerolling one room
 * leaves every other room exactly as it was.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});
  G.VERSION = '0.1.0';

  /** The files of the generator core, in load order (the CLI and the editor read this list). */
  G.FILES = ['core.js', 'library.js', 'content.js', 'stages-concept.js', 'stages-graph.js', 'stages-layout.js', 'stages-fill.js', 'stages-words.js', 'validate.js', 'emit.js', 'generate.js'];

  /** The stages, in order. Each adds its part to the plan and can be rerun alone. */
  G.STAGES = ['concept', 'zones', 'graph', 'layout', 'access', 'encounters', 'traps', 'treasure', 'dressing', 'words'];

  // ------------------------------------------------------------ hashing and random streams
  /** FNV-1a, 32 bits. */
  G.hashStr = function (s) {
    let h = 0x811c9dc5;
    s = String(s);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };
  /** A short stable hash of any JSON-able value (key order is sorted first). */
  G.hashData = function (v) {
    return (G.hashStr(G.stableStringify(v)) >>> 0).toString(36);
  };
  G.stableStringify = function (v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(G.stableStringify).join(',') + ']';
    return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined && typeof v[k] !== 'function').map((k) => JSON.stringify(k) + ':' + G.stableStringify(v[k])).join(',') + '}';
  };

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Rng {
    constructor(seedNum) {
      this.f = mulberry32(seedNum >>> 0);
    }
    next() {
      return this.f();
    }
    /** An integer in [a, b], both included. */
    int(a, b) {
      if (b < a) [a, b] = [b, a];
      return a + Math.floor(this.f() * (b - a + 1));
    }
    /** A number in [a, b). */
    real(a, b) {
      return a + this.f() * (b - a);
    }
    /** [min, max] → an integer in it; a plain number stays as it is. */
    range(r) {
      if (Array.isArray(r)) return this.int(r[0], r[1] == null ? r[0] : r[1]);
      return r == null ? 0 : r;
    }
    chance(p) {
      return this.f() < p;
    }
    pick(arr) {
      if (!arr || !arr.length) return undefined;
      return arr[Math.floor(this.f() * arr.length)];
    }
    /** entries: [[value, weight], ...] or an object { value: weight }. Zero and negative weights never win. */
    weighted(entries) {
      const list = Array.isArray(entries) ? entries : Object.keys(entries).sort().map((k) => [k, entries[k]]);
      let total = 0;
      for (const [, w] of list) if (w > 0) total += w;
      if (total <= 0) return undefined;
      let r = this.f() * total;
      for (const [v, w] of list) {
        if (w <= 0) continue;
        r -= w;
        if (r < 0) return v;
      }
      return list.filter(([, w]) => w > 0).slice(-1)[0][0];
    }
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.f() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  }
  G.Rng = Rng;
  /** A random stream for one purpose: G.rng(seed, 'layout', 'f2', 3). */
  G.rng = (seed, ...keys) => new Rng(G.hashStr([seed].concat(keys).join('|')));
  /** Which stage owns a stream (rerolling a stage salts every stream it owns). */
  G.STREAM_STAGE = { locks: 'graph', shapes: 'layout' };
  /** The stream for a stage of a plan: G.srng(plan, 'layout', 'f2', attempt). Rerolls salt it
   *  (plan.salt.layout for the whole stage, plan.salt['layout:f2'] for one floor), so nothing else moves. */
  G.srng = (plan, key, floorKey, ...rest) => {
    const st = G.STREAM_STAGE[key] || key;
    const salt = plan.salt || {};
    const s = (salt[st] || 0) + '.' + (floorKey ? salt[st + ':' + floorKey] || 0 : 0);
    return G.rng(plan.seed, key, s, floorKey == null ? '' : floorKey, ...rest);
  };

  // ------------------------------------------------------------ small helpers
  G.clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  /** An object's entries sorted by key, so picks never depend on file order. */
  G.sorted = (obj) => Object.keys(obj || {}).sort().map((k) => [k, obj[k]]);
  G.asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  G.overlap = (a, b) => G.asList(a).some((x) => G.asList(b).includes(x));
  /** Does a [min, max] range contain v? (no range: yes) */
  G.inRange = (r, v) => !r || (v >= r[0] && v <= (r[1] == null ? r[0] : r[1]));
  G.titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
  G.slugify = (s) => String(s || 'installation').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'installation';
  /** A flag-safe name: hnG_<slug>_<name>. */
  G.flagName = (slug, name) => 'hnG_' + slug.replace(/-/g, '_') + '_' + name;
  G.tagName = (slug, name) => slug.replace(/-/g, '_') + '_' + name;
  G.fill = (text, vars) => String(text || '').replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
  G.problem = (level, text, where) => ({ level, text, where: where || null });

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
