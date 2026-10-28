/* HaveNot — packs/hn-gen-kit/kit.js
 * What generated installations (packs hn-g-<slug>, written by tools/generate.mjs or the editor's
 * Installations page) need at run time. Everything is driven by data in their files:
 *
 *   HN.addLocation(pin)     a new pin on the near-area map (and in HN.START_LOCS, so new runs see it)
 *   HN.genSite(spec)        a generated installation's site.js: { slug, replaces, levels, pin }
 *                           With `replaces` it takes over that pin (a stub's): same place, new level, new words.
 *   level.hn.gen            on every generated floor: { slug, trapsOff, done, roaches }
 *     trapsOff              a flag: once set (the floor's facilities terminal), traps marked gen: 'switch' stop
 *     done                  the installation's goal flag: a toast and a line in the Expedition Ledger
 *     roaches               Gladiator Roaches come back between missions at the floor's roachSpawn vents (up to 5),
 *                           as on the hand-built floors; they never drop anything
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN, T = LM.TILE;
  HN.GEN_SITES = HN.GEN_SITES || {};

  HN.addLocation = function (pin) {
    const old = HN.LOCATIONS.findIndex((l) => l.id === pin.id);
    if (old >= 0) HN.LOCATIONS[old] = Object.assign(HN.LOCATIONS[old], pin);
    else HN.LOCATIONS.push(pin);
    HN.START_LOCS = HN.START_LOCS || {};
    HN.START_LOCS[pin.id] = pin.state || 'known';
    return pin;
  };

  // a free place on the 1000 × 640 sheet for a pin that doesn't say where it goes
  function freeSpot(seedText) {
    let h = 0;
    for (const c of String(seedText)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const r = LM.util.mulberry32(h);
    for (let i = 0; i < 200; i++) {
      const x = 80 + r() * 840, y = 70 + r() * 500;
      if (HN.LOCATIONS.every((p) => Math.hypot(x - p.x, y - p.y) > 90)) return [Math.round(x), Math.round(y)];
    }
    return [500, 560];
  }

  HN.genSite = function (spec) {
    HN.GEN_SITES[spec.slug] = spec;
    const pin = Object.assign({}, spec.pin);
    for (const k of Object.keys(pin)) if (pin[k] == null) delete pin[k];
    if (spec.replaces && HN.loc(spec.replaces)) {
      const l = HN.loc(spec.replaces);
      delete l.stub;
      Object.assign(l, pin, { id: l.id, x: pin.x == null ? l.x : pin.x, y: pin.y == null ? l.y : pin.y, art: l.art, state: l.state });
      return l;
    }
    if (pin.x == null || pin.y == null) [pin.x, pin.y] = freeSpot(spec.slug);
    if (!pin.art) pin.art = 'bunker';
    return HN.addLocation(pin);
  };

  // ------------------------------------------------------------ floor trap switches and the goal
  const genOf = (game) => (game.level && game.level.def.hn && game.level.def.hn.gen) || null;
  function quietTraps(game) {
    for (const tr of game.traps || []) {
      if (tr.def.gen !== 'switch') continue;
      tr.armed = false;
      tr.beams = [];
    }
  }
  HN.onArrive((game, def, s, last) => {
    const g = def.hn && def.hn.gen;
    if (!g) return;
    if (g.trapsOff && HN.flag(game, g.trapsOff)) quietTraps(game);
    // between missions: the native bio-weapons come back (they never drop anything)
    if (g.roaches && last != null && last < s.mission) {
      const vents = game.level.tags.roachSpawn || [];
      let n = 0;
      for (const p of vents) {
        if (n >= 5) break;
        game.spawnEnemy('hn-roach', p.x * T + T / 2, p.y * T + T / 2, {});
        n++;
      }
      if (n) game.toast('Scratching in the vents. The roaches are back.', 'warn');
    }
  });
  LM.on('flag', ({ name, game }) => {
    const g = game && genOf(game);
    if (!g) return;
    if (name === g.trapsOff) quietTraps(game);
    if (name === g.done) {
      const site = HN.GEN_SITES[g.slug];
      const title = (site && site.pin && site.pin.name) || game.level.def.hn.place || 'The installation';
      game.toast(title + ': done. Whatever happens here now happens without you.', 'good');
      HN.note(game, 'world', title + ': you finished it.');
    }
  });
})();
