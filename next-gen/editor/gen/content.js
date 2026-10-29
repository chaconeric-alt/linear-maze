/* Linear Maze Editor — gen/content.js
 * Content libraries from outside the generator (the first: HaveNot_10_Settings_Library.json, ten settings and
 * two hundred functional rooms). A source file is never edited: an adapter turns it, with its companion file of
 * implementation details, into the generator's own shape, and the validator reports what is wrong with either.
 *
 *   G.CONTENT_ADAPTERS[format](source, companion) → content       one adapter per source format (companion.format)
 *   G.validateContent(source, companion) → [{ level, section, id, text }]
 *   G.adaptContent(source, companion) → content (throws on 'bad' problems)
 *
 * The content goes into a library's `content` section, one entry per library (LM.genLibrary(game, { content:
 * { settings10: {...} } })); tools/import-content.mjs writes that file. Its shape, whatever the source:
 *
 *   settings[id]   { id, name, era, ..., palette, related }
 *   tiles[id]      { id, setting_id, kind: floor | wall | light, description, state_variants, style, colors (or color, radius) }
 *   rooms[id]      { id, setting_id, name, function, size_class, frequency_weight, *_pool, mandatory_features,
 *                    optional_furnishings, *_record, dressing, rare_twist, history_overlays, ..., cluster }
 *   objects[name]  { fam, w, h, place }                           every furniture object, by name
 *   furniture[id], interactables[id] (+ kind), loot[id] (+ items: [{ id, name, cat, value }]), hazards[id] (+ behaviour)
 *   params         the source's generation parameters; typeSettings, modes, sizes from the companion
 */
'use strict';
(function (root) {
  const G = (root.LMGen = root.LMGen || {});
  G.CONTENT_ADAPTERS = G.CONTENT_ADAPTERS || {};

  const firstMatch = (rules, text) => {
    const s = String(text || '').toLowerCase();
    for (const r of rules || []) if (new RegExp(r[0]).test(s)) return r;
    return null;
  };
  G.contentMatch = firstMatch;
  const byId = (list) => Object.fromEntries((list || []).map((r) => [r.id, r]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // ------------------------------------------------------------ HaveNot settings library, format 1
  G.CONTENT_ADAPTERS['havenot-settings-library-1'] = function (src, comp) {
    const ov = comp.overrides || {};
    const out = {
      format: comp.format, meta: src.metadata || {}, params: src.generation_parameters || {},
      typeSettings: comp.type_settings || {}, modes: comp.setting_modes || { single: 1 }, sizes: comp.sizes || {},
      settings: {}, tiles: {}, rooms: {}, objects: {}, furniture: {}, interactables: {}, loot: {}, hazards: {},
    };
    for (const s of src.settings || []) out.settings[s.id] = Object.assign({}, s, { palette: (comp.palettes || {})[s.id] || null, related: s.related_setting || null }, ov[s.id] || {});
    for (const t of src.tiles || []) {
      const m = firstMatch((comp.materials || {})[t.kind], t.description);
      const extra = t.kind === 'light' ? (m ? { style: m[1], color: m[2], radius: m[3] } : {}) : m ? { style: m[1], colors: m[2] } : {};
      out.tiles[t.id] = Object.assign({}, t, extra, ov[t.id] || {});
    }
    const rules = (comp.archetypes || {}).rules || [];
    for (const f of src.furniture || []) {
      out.furniture[f.id] = Object.assign({}, f, ov[f.id] || {});
      for (const name of f.names || []) {
        if (out.objects[name]) continue;
        const m = firstMatch(rules, name);
        out.objects[name] = Object.assign(m ? { fam: m[1], w: m[2][0], h: m[2][1], place: m[3] } : { fam: (comp.archetypes || {}).fallback || 'machine', w: 1, h: 1, place: 'wall-row', fallback: true }, ov[name] || {});
      }
    }
    // mandatory features and optional furnishings that aren't in a furniture record still need art
    for (const r of src.rooms || []) for (const name of [].concat(r.mandatory_features || [], r.optional_furnishings || [])) {
      if (out.objects[name]) continue;
      const m = firstMatch(rules, name);
      out.objects[name] = m ? { fam: m[1], w: m[2][0], h: m[2][1], place: m[3] } : { fam: (comp.archetypes || {}).fallback || 'machine', w: 1, h: 1, place: 'wall-row', fallback: true };
    }
    for (const r of src.rooms || []) {
      const c = firstMatch((comp.clusters || {}).rules, r.name + ' ' + (r.function || ''));
      out.rooms[r.id] = Object.assign({}, r, { cluster: c ? c[1] : (comp.clusters || {}).fallback || 'general' }, ov[r.id] || {});
    }
    for (const i of src.interactables || []) {
      const m = firstMatch((comp.interactables || {}).rules, i.device + ' ' + (i.possible_use || ''));
      out.interactables[i.id] = Object.assign({}, i, { kind: m ? m[1] : (comp.interactables || {}).fallback || 'show' }, ov[i.id] || {});
    }
    for (const l of src.loot || []) {
      const names = String(l.name || '').split(/,\s*|\s+and\s+/).map((s) => s.trim()).filter(Boolean);
      const items = names.map((name, k) => {
        const m = firstMatch((comp.loot || {}).rules, name);
        const [cat, value] = m ? [m[1], m[2]] : (comp.loot || {}).fallback || ['Salvage', 40];
        return { id: 'hn-s10-' + slug(l.id) + '-' + k, name: name.charAt(0).toUpperCase() + name.slice(1), cat, value };
      });
      out.loot[l.id] = Object.assign({}, l, { items }, ov[l.id] || {});
    }
    for (const h of src.hazards || []) {
      const m = firstMatch((comp.hazards || {}).rules, h.name);
      out.hazards[h.id] = Object.assign({}, h, { behaviour: m ? m[1] : (comp.hazards || {}).fallback || 'mind', fallback: !m || undefined }, ov[h.id] || {});
    }
    return out;
  };

  // ------------------------------------------------------------ validation
  G.validateContent = function (src, comp) {
    const out = [];
    const bad = (section, id, text) => out.push({ level: 'bad', section, id, text });
    const warn = (section, id, text) => out.push({ level: 'warn', section, id, text });
    if (!comp || !G.CONTENT_ADAPTERS[comp.format]) {
      bad('companion', '', 'no adapter for format ' + (comp && comp.format));
      return out;
    }
    const sections = ['settings', 'tiles', 'rooms', 'furniture', 'interactables', 'loot', 'hazards'];
    const REQ = {
      settings: ['id', 'name', 'floor_materials', 'wall_materials', 'lighting'],
      tiles: ['id', 'setting_id', 'kind', 'description'],
      rooms: ['id', 'setting_id', 'name', 'function', 'size_class', 'frequency_weight', 'floor_tile_pool', 'wall_tile_pool', 'lighting_pool', 'mandatory_features', 'furniture_record', 'interactive_record', 'loot_record', 'hazard_record'],
      furniture: ['id', 'room_id', 'names'],
      interactables: ['id', 'room_id', 'device'],
      loot: ['id', 'room_id', 'name'],
      hazards: ['id', 'room_id', 'name', 'trigger', 'clues', 'effect', 'countermeasure', 'severity'],
    };
    const all = new Map();
    const idx = {};
    for (const s of sections) {
      if (!Array.isArray(src[s])) {
        bad(s, '', 'section missing or not a list');
        continue;
      }
      idx[s] = byId(src[s]);
      for (const r of src[s]) {
        if (!r || !r.id) {
          bad(s, '', 'a record with no id');
          continue;
        }
        if (all.has(r.id)) bad(s, r.id, 'duplicate id (also in ' + all.get(r.id) + ')');
        all.set(r.id, s);
        for (const f of REQ[s]) if (r[f] == null || (Array.isArray(r[f]) && !r[f].length) || r[f] === '') bad(s, r.id, 'required field ' + f + ' is missing or empty');
        if (s !== 'tiles' && s !== 'settings' && !r.description && s === 'rooms') warn(s, r.id, 'no description');
      }
    }
    const ref = (section, id, field, target, want) => {
      if (id == null) return;
      const t = (idx[target] || {})[id];
      if (!t) bad(section, '', field + ' → ' + id + ': no such ' + target.replace(/s$/, ''));
      else if (want && t.kind !== want) bad(section, '', field + ' → ' + id + ' is a ' + t.kind + ', not a ' + want);
    };
    for (const t of src.tiles || []) {
      ref('tiles', t.setting_id, t.id + '.setting_id', 'settings');
      if (!['floor', 'wall', 'light'].includes(t.kind)) bad('tiles', t.id, 'unknown kind ' + t.kind);
      if (!firstMatch((comp.materials || {})[t.kind], t.description)) bad('tiles', t.id, 'no ' + t.kind + ' painter matches “' + t.description + '” (missing graphics)');
    }
    for (const s of src.settings || []) {
      if (s.related_setting) ref('settings', s.related_setting, s.id + '.related_setting', 'settings');
      if (!(comp.palettes || {})[s.id]) bad('settings', s.id, 'no palette in the companion (missing graphics)');
      const p = s.default_cluster_probability;
      if (p != null && !(p >= 0 && p <= 1)) bad('settings', s.id, 'default_cluster_probability ' + p + ' is not a probability');
    }
    for (const r of src.rooms || []) {
      ref('rooms', r.setting_id, r.id + '.setting_id', 'settings');
      for (const t of r.floor_tile_pool || []) ref('rooms', t, r.id + '.floor_tile_pool', 'tiles', 'floor');
      for (const t of r.wall_tile_pool || []) ref('rooms', t, r.id + '.wall_tile_pool', 'tiles', 'wall');
      for (const t of r.lighting_pool || []) ref('rooms', t, r.id + '.lighting_pool', 'tiles', 'light');
      for (const [f, sec] of [['furniture_record', 'furniture'], ['interactive_record', 'interactables'], ['loot_record', 'loot'], ['hazard_record', 'hazards']]) {
        ref('rooms', r[f], r.id + '.' + f, sec);
        const t = (idx[sec] || {})[r[f]];
        if (t && t.room_id !== r.id) bad('rooms', r.id, f + ' ' + r[f] + ' says it belongs to ' + t.room_id);
      }
      if (!(r.frequency_weight > 0)) bad('rooms', r.id, 'frequency_weight ' + r.frequency_weight + ' is not a positive weight');
      if (!(comp.sizes || {})[r.size_class]) bad('rooms', r.id, 'unknown size_class ' + r.size_class);
    }
    for (const s of ['furniture', 'interactables', 'loot', 'hazards']) for (const r of src[s] || []) ref(s, r.room_id, r.id + '.room_id', 'rooms');
    const rules = (comp.archetypes || {}).rules || [];
    const seen = new Set();
    for (const f of src.furniture || []) for (const n of f.names || []) {
      if (seen.has(n)) continue;
      seen.add(n);
      if (!firstMatch(rules, n) && !(comp.overrides || {})[n]) warn('furniture', f.id, '“' + n + '” has no drawing family; it is drawn as the fallback (' + ((comp.archetypes || {}).fallback || 'machine') + ')');
    }
    for (const h of src.hazards || []) {
      if (!['moderate', 'severe', 'minor', 'lethal'].includes(h.severity)) bad('hazards', h.id, 'unsupported severity ' + h.severity);
      if (!firstMatch((comp.hazards || {}).rules, h.name)) warn('hazards', h.id, '“' + h.name + '” has no behaviour rule; it works as the fallback (' + ((comp.hazards || {}).fallback || 'mind') + ')');
    }
    const gp = src.generation_parameters || {};
    for (const k of ['functional_room_probability', 'probability_place_room_rare_twist', 'probability_room_hazard', 'probability_room_loot', 'probability_history_overlay']) {
      if (gp[k] == null) warn('generation_parameters', k, 'missing; the generator uses its default');
      else if (!(gp[k] >= 0 && gp[k] <= 1)) bad('generation_parameters', k, gp[k] + ' is not a probability');
    }
    for (const [k, w] of Object.entries(gp.adjacency_weights || {})) if (!(w >= 0)) bad('generation_parameters', 'adjacency_weights.' + k, 'invalid weight ' + w);
    return out;
  };

  G.adaptContent = function (src, comp) {
    const problems = G.validateContent(src, comp).filter((p) => p.level === 'bad');
    if (problems.length) throw new Error('Content library has ' + problems.length + ' problems: ' + problems.slice(0, 5).map((p) => p.section + ' ' + p.id + ': ' + p.text).join('; '));
    return G.CONTENT_ADAPTERS[comp.format](src, comp);
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
