/* Linear Maze Editor — gen/generate.js
 * Running the pipeline: a brief in, a validated plan (and its files) out.
 *
 *   const res = LMGen.generate(brief, lib, registry)
 *     brief: { type, tl, floors, size, seed, slug, title, company, looks: [...], replaces, pins, story, words }
 *       story: { intro, backstory: { builder, purpose, fate, occupants }, goal: { kind, target }, boss: { monster, name } }
 *       words: { slotId: text } fixes any text slot (pin.desc, f1.intro, f2.goal.name, f1.r3.name...)
 *     → { ok, plan, problems, error }      plan.validation says what the checks found
 *   LMGen.rerun(plan, lib, registry, stage, floor)
 *     → reroll one stage (for one floor, or all) and everything after it, keeping the rest
 *   LMGen.emitFiles(plan, lib) → { path: text }
 *
 * A brief that fails its checks is tried again with the seed's next variant (seed~1, seed~2...), so the
 * same brief always gives the same installation. After the last try the failure is returned, never
 * written out.
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});

  G.RUN = {
    concept: (p, l) => G.stageConcept(p, l),
    zones: (p, l) => G.stageZones(p, l),
    graph: (p, l) => G.stageGraph(p, l),
    layout: (p, l) => G.stageLayout(p, l),
    access: (p, l) => G.stageAccess(p, l),
    encounters: (p, l) => G.stageEncounters(p, l),
    traps: (p, l) => G.stageTraps(p, l),
    treasure: (p, l) => G.stageTreasure(p, l),
    dressing: (p, l) => G.stageDressing(p, l),
    words: (p, l) => G.stageWords(p, l),
  };

  G.normalizeBrief = function (brief, lib) {
    const b = Object.assign({ size: 'standard', floors: 1, tl: 2, looks: [], pins: {} }, G.clone(brief || {}));
    b.game = b.game || lib.game;
    if (!b.type) b.type = Object.keys(lib.types).sort()[0];
    b.tl = G.clamp(Math.round(Number(b.tl) || 2), 1, 10);
    b.floors = G.clamp(Math.round(Number(b.floors) || 1), 1, 6);
    b.seed = String(b.seed == null || b.seed === '' ? 1 : b.seed);
    b.slug = G.slugify(b.slug || b.replaces || b.title || b.type + '-' + b.seed);
    if (!b.order) b.order = (lib.settings.orderBase || 100) + (G.hashStr(b.slug) % 400) * 10;
    return b;
  };

  function newPlan(b, lib, registry, attempt, words) {
    return {
      v: 1, generator: G.VERSION, game: b.game, slug: b.slug, seed: b.seed + (attempt ? '~' + attempt : ''),
      brief: b, libHash: lib.hash || G.hashData(lib), registry,
      salt: {}, report: { fallbacks: [], problems: [] }, words: G.clone(words || {}),
    };
  }

  G.generate = function (brief, lib, registry, opts) {
    opts = opts || {};
    const b = G.normalizeBrief(brief, lib);
    let last = null;
    const tries = opts.tries || 8;
    const failures = [];
    for (let a = 0; a < tries; a++) {
      const plan = newPlan(b, lib, registry, a, opts.words);
      try {
        for (const st of G.STAGES) G.RUN[st](plan, lib);
        const v = G.stageValidate(plan, lib);
        if (v.ok) return { ok: true, plan, attempt: a, problems: v.problems, failures };
        last = { ok: false, plan, problems: v.problems, failures };
        failures.push(plan.seed + ': ' + v.problems.filter((p) => p.level === 'bad').map((p) => p.text).join('; '));
      } catch (e) {
        last = { ok: false, plan, error: e, problems: [G.problem('bad', e.message)], failures };
        failures.push(plan.seed + ': ' + e.message);
        if (opts.throw) throw e;
      }
    }
    return last;
  };

  /** Reroll one stage (for one floor if given) and rerun everything after it. Returns { ok, plan, problems }. */
  G.rerun = function (plan, lib, registry, stage, floorN) {
    const i = G.STAGES.indexOf(stage);
    if (i < 0) throw new Error('No stage ' + stage);
    const p = G.clone(G.record(plan));
    p.registry = registry;
    p.vars = Object.assign({ title: p.concept.title, slogan: p.concept.slogan, target: p.concept.goal.target, company: p.concept.company, warlord: p.concept.warlord });
    p.salt = p.salt || {};
    const key = floorN ? stage + ':f' + floorN : stage;
    p.salt[key] = (p.salt[key] || 0) + 1;
    p.report = { fallbacks: [], problems: [] };
    // rebuild lock lookups the JSON copy dropped
    for (const f of p.floors || []) f.lockById = Object.fromEntries((p.locks || []).filter((l) => l.floor === f.n).map((l) => [l.id, l]));
    try {
      // the fill stages build on each other's output, so a reroll of one replays them all from access
      // (only the rerolled stage's streams are salted, so the others come out the same as before)
      const ai = G.STAGES.indexOf('access'), wi = G.STAGES.indexOf('words');
      const from = i > ai && i < wi ? ai : i;
      for (const st of G.STAGES.slice(from)) G.RUN[st](p, lib);
      const v = G.stageValidate(p, lib);
      return { ok: v.ok, plan: p, problems: v.problems };
    } catch (e) {
      return { ok: false, plan: p, error: e, problems: [G.problem('bad', e.message)] };
    }
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
