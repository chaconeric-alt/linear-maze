/* Linear Maze Editor — gen/stages-concept.js
 * Stages 1 and 2: the concept (back-story, names, goal, boss) and the floors and their zones.
 * Vol 2 pp. 50–51 (the four back-story questions) and p. 59 (zones by colour, front to back).
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});

  /** The type, its look and settings, resolved against the library. */
  G.typeOf = (lib, id) => {
    const t = lib.types[id];
    if (!t) throw new Error('No installation type “' + id + '” in the library. Types: ' + Object.keys(lib.types).join(', '));
    return t;
  };
  /** A look that can be built: itself if built, else its fallback chain. */
  G.resolveLook = function (lib, id) {
    const seen = new Set();
    let cur = id;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const l = lib.looks[cur];
      if (!l) return null;
      if ((l.status || 'built') === 'built') return cur;
      cur = l.fallback;
    }
    return null;
  };

  // ------------------------------------------------------------ stage 1: concept
  G.stageConcept = function (plan, lib) {
    const b = plan.brief;
    const rng = G.srng(plan, 'concept');
    const type = G.typeOf(lib, b.type);
    const era = (type.tags || []).find((t) => t.startsWith('era:')) || 'era:war-middle';
    const bs = type.backstory || 'war';
    const pick = (k) => G.say(lib, rng, 'backstory.' + bs + '.' + k) || G.say(lib, rng, 'backstory.any.' + k) || '';
    const company = b.company || G.say(lib, rng, 'names.' + (type.names || 'company')) || 'The Facility';
    const warlord = G.say(lib, rng, 'names.warlord') || 'a forgotten warlord';
    const vars = { company, warlord };
    const c = {
      type: b.type, typeName: type.name, era: era.slice(4), company, warlord,
      slogan: G.say(lib, rng, 'names.slogan', vars) || 'WE ARE STILL OPEN',
      backstory: { builder: G.fill(pick('builder'), vars), purpose: G.fill(pick('purpose'), vars), fate: G.fill(pick('fate'), vars), occupants: G.fill(pick('occupants'), vars) },
    };
    c.title = b.title || G.say(lib, rng, 'titles.' + (type.titles || b.type), vars) || company;
    // the goal: what finishing this place means (Vol 2 p. 50: clear most of it, or beat the boss)
    const story = b.story || {};
    const goalKind = (story.goal && story.goal.kind) || rng.weighted(type.goals || { 'reach-vault': 1 });
    c.goal = { kind: goalKind, target: (story.goal && story.goal.target) || G.say(lib, rng, 'goals.' + goalKind, vars) || 'the vault' };
    // the boss: built monsters that can lead the goal floor at this Threat Level
    c.boss = null;
    const want = (story.boss && story.boss.monster) || (b.pins && b.pins.boss);
    const bosses = G.usable(lib, 'monsters', b.tl).filter(([id, m]) => m.boss && G.overlap(m.kind, Object.keys(type.encounters || {})));
    let bossId = want && lib.monsters[want] ? want : null;
    if (!bossId && b.tl >= (type.bossFromTl || 2) && bosses.length) bossId = rng.weighted(bosses.map(([id, m]) => [id, m.weight || 1]));
    if (bossId) {
      const m = lib.monsters[bossId];
      c.boss = { monster: bossId, enemy: m.id || bossId, name: (story.boss && story.boss.name) || G.say(lib, rng, 'bossNames.' + bossId, vars) || m.name };
    }
    c.intro = G.say(lib, rng, 'intros.' + (type.backstory || 'war'), vars) || '';
    // a brief's story can set the back-story and the way-in line itself
    if (story.backstory) Object.assign(c.backstory, story.backstory);
    if (story.intro) c.intro = story.intro;
    plan.concept = c;
    plan.vars = Object.assign({ title: c.title, slogan: c.slogan, target: c.goal.target }, vars);
  };

  // ------------------------------------------------------------ stage 2: floors and zones
  G.stageZones = function (plan, lib) {
    const b = plan.brief;
    const rng = G.srng(plan, 'zones');
    const type = G.typeOf(lib, b.type);
    const S = lib.settings;
    const nFloors = G.clamp(b.floors || 1, (type.floors || [1, 5])[0], (type.floors || [1, 5])[1]);
    const zones = (type.zones || []).filter((z) => lib.zones[z]).sort((a, c) => lib.zones[a].rank - lib.zones[c].rank);
    if (!zones.length) throw new Error('Type ' + b.type + ' has no zones.');
    const sizes = (S.sizes || {})[b.size || 'standard'] || [9, 13];
    plan.floors = [];
    for (let i = 0; i < nFloors; i++) {
      const role = nFloors === 1 ? 'only' : i === 0 ? 'entry' : i === nFloors - 1 ? 'goal' : 'middle';
      // each floor covers a band of zones, front to back, overlapping the next floor's by one
      const m = zones.length;
      const start = nFloors === 1 ? 0 : Math.min(m - 1, Math.floor((i * (m - 1)) / nFloors));
      const span = nFloors === 1 ? m - 1 : Math.max(1, Math.ceil((m - 1) / nFloors));
      const fz = zones.slice(start, Math.min(m, start + span + 1));
      const lookWanted = (b.looks && b.looks[i]) || rng.weighted(type.looks || {});
      const look = G.resolveLook(lib, lookWanted) || G.resolveLook(lib, Object.keys(type.looks || {})[0]);
      const rooms = rng.int(sizes[0], sizes[1]) + (role === 'goal' || role === 'only' ? 1 : 0);
      plan.floors.push({
        n: i + 1, id: S.levelPrefix + plan.slug + '-f' + (i + 1), role, look, lookWanted: lookWanted !== look ? lookWanted : undefined,
        zones: fz.length ? fz : [zones[0]], roomCount: rooms,
      });
      if (lookWanted !== look) plan.report.fallbacks.push('Floor ' + (i + 1) + ': look “' + lookWanted + '” is planned; used “' + look + '”.');
    }
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
