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

  // ------------------------------------------------------------ HaveNot settings library B (Havenot-Settings-Library.json)
  // Another schema: rooms carry pools of ids (floor_tiles, furniture_pool, loot_pool...), most of which the file
  // doesn't define, and twenty room templates repeated across ten settings. The companion fills the gaps (see its
  // $comments); `comp.base` is the companion it extends (library 1's), whose rules are tried after its own.
  const words = (id, prefix) => String(id).replace(prefix, '').replace(/_/g, ' ').trim().toLowerCase();
  const rulesOf = (comp, key) => [].concat(((comp[key] || {}).rules) || [], (((comp.base || {})[key] || {}).rules) || []);
  const fallbackOf = (comp, key, d) => (comp[key] || {}).fallback || ((comp.base || {})[key] || {}).fallback || d;
  const archOf = (r) => String(r.name || '').split(' - ')[0].trim();
  const treasureName = (id, comp) => {
    if ((comp.names || {})[id]) return comp.names[id];
    const s = words(id, /^TREAS_/);
    return / sp$/.test(s) ? s.replace(/ sp$/, ' (Success Points)') : s;
  };
  // the setting's prose, cut into short phrases (dressing)
  const phrases = (s) => [s.signage_style, s.ambient_details, s.decay_patterns, s.furnishing_style].join(', ').split(/\s*[,;:]\s*/).map((p) => p.replace(/^and\s+/, '').trim()).filter((p) => p.length > 6);
  B1.tileIds = function (src) {
    const ids = new Map();
    for (const s of src.settings || []) for (const [k, kind] of [['floor_palette_ids', 'floor'], ['wall_palette_ids', 'wall'], ['lighting_palette_ids', 'light']]) for (const id of s[k] || []) if (!ids.has(id)) ids.set(id, { kind, setting_id: s.setting_id });
    for (const r of src.rooms || []) for (const [k, kind] of [['floor_tiles', 'floor'], ['wall_tiles', 'wall'], ['lighting', 'light']]) for (const id of r[k] || []) if (!ids.has(id)) ids.set(id, { kind, setting_id: r.setting_id });
    return ids;
  };
  function B1(src, comp) {
    const ov = comp.overrides || {};
    const SL = src.shared_libraries || {};
    const out = {
      format: comp.format, meta: src.meta || {}, params: src.generation_parameters || comp.generation_parameters || {},
      typeSettings: comp.type_settings || {}, modes: comp.setting_modes || { single: 1 }, sizes: comp.sizes || {},
      settings: {}, tiles: {}, rooms: {}, objects: {}, furniture: {}, interactables: {}, loot: {}, hazards: {},
    };
    for (const s of src.settings || []) {
      const adj = Object.entries(s.adjacent_setting_weights || {}).sort((a, c) => c[1] - a[1]);
      out.settings[s.setting_id] = Object.assign({}, s, {
        id: s.setting_id, era: [].concat(s.historical_era || []).join(' / '), function_and_satire: s.original_function + '. ' + (s.haveNot_twist || ''),
        signage: s.signage_style, atmosphere: s.ambient_details, palette: (comp.palettes || {})[s.setting_id] || null, related: adj.length ? adj[0][0] : null,
      }, ov[s.setting_id] || {});
    }
    for (const [id, t] of B1.tileIds(src)) {
      const description = words(id, /^(FLOOR|WALL|LIGHT)_/);
      const m = firstMatch((comp.materials || {})[t.kind], description);
      const extra = t.kind === 'light' ? (m ? { style: m[1], color: m[2], radius: m[3] } : {}) : m ? { style: m[1], colors: m[2] } : {};
      out.tiles[id] = Object.assign({ id, setting_id: t.setting_id, kind: t.kind, description: description.charAt(0).toUpperCase() + description.slice(1) }, extra, ov[id] || {});
    }
    const archRules = rulesOf(comp, 'archetypes');
    const object = (name) => {
      if (out.objects[name]) return;
      const m = firstMatch(archRules, name);
      out.objects[name] = Object.assign(m ? { fam: m[1], w: m[2][0], h: m[2][1], place: m[3] } : { fam: fallbackOf(comp, 'archetypes', 'machine'), w: 1, h: 1, place: 'wall-row', fallback: true }, ov[name] || {});
    };
    const home = comp.shared_furniture || {};
    const shared = (list, id) => (SL[list] || []).find((x) => x.id === id) || {};
    const intRules = rulesOf(comp, 'interactables'), lootRules = rulesOf(comp, 'loot'), hazRules = rulesOf(comp, 'hazards');
    const lootItem = (rid, name, k) => {
      const m = firstMatch(lootRules, name);
      const [cat, value] = m ? [m[1], m[2]] : fallbackOf(comp, 'loot', ['Salvage', 40]);
      return { id: 'hn-s10-' + slug(rid) + '-' + k, name: name.charAt(0).toUpperCase() + name.slice(1), cat, value };
    };
    const hazard = (hid, rid, h) => {
      const m = firstMatch(hazRules, h.name);
      return Object.assign({ id: hid, room_id: rid, category: 'decay or installed trap' }, h, { behaviour: m ? m[1] : fallbackOf(comp, 'hazards', 'mind'), fallback: !m || undefined }, ov[hid] || {});
    };
    for (const r of src.rooms || []) {
      const id = r.room_id, arch = archOf(r), A = (comp.room_archetypes || {})[arch] || { fixtures: [], optional: [] };
      const S = (src.settings || []).find((s) => s.setting_id === r.setting_id) || {};
      // fixtures: the archetype's first, the source's setting-specific piece (not its 'Primary ... fixture' placeholder)
      const own = (r.mandatory_features || []).filter((n) => !/^primary .* fixture$/i.test(n)).map((n) => n.toLowerCase());
      const mandatory = [A.fixtures[0]].concat(own).filter(Boolean).slice(0, 2);
      if (mandatory.length < 2 && A.fixtures[1]) mandatory.push(A.fixtures[1]);
      // the setting's own pieces for this template first (companion setting_pieces), then the template's own
      const own3 = (((comp.setting_pieces || {})[r.setting_id] || {})[arch] || []).filter((n) => !mandatory.includes(n));
      const optional = own3.concat(A.fixtures.filter((n) => !mandatory.includes(n) && !own3.includes(n)), (A.optional || []).filter((n) => !own3.includes(n)));
      // furniture: the pool's own-setting pieces; the others are the deliberate mismatch pool
      const names = [], mismatch = [];
      for (const f of r.furniture_pool || []) {
        const h = home[f];
        if (!h) continue;
        if (h[1] === r.setting_id) names.push(h[0]);
        else mismatch.push([h[0], h[1]]);
      }
      out.furniture['FURN_' + id] = { id: 'FURN_' + id, room_id: id, names, mismatch };
      for (const n of mandatory.concat(optional, names, mismatch.map((m) => m[0]))) object(n);
      // a setting piece knows its id and its home
      for (const n of own3) if (!out.objects[n].home) Object.assign(out.objects[n], { id: 'PIECE_' + r.setting_id.replace(/^SET_/, '') + '_' + slug(n).toUpperCase().replace(/-/g, '_'), home: r.setting_id });
      // the device: the first in its pool, the others as alternatives
      const devs = (r.interactive_pool || []).map((i) => ({ id: i, device: (comp.names || {})[i] || words(i, /^INT_/), use: (comp.device_uses || {})[i] || shared('interactive', i).interaction || '' }));
      if (devs.length) {
        const d = devs[0], m = firstMatch(intRules, d.device + ' ' + d.use);
        object(d.device);
        out.interactables['INT_' + id] = Object.assign({ id: 'INT_' + id, room_id: id, source: d.id, device: d.device, possible_use: d.use, current_behavior: shared('interactive', d.id).current_behavior, alternatives: devs.slice(1).map((x) => x.device), kind: m ? m[1] : fallbackOf(comp, 'interactables', 'show') }, ov['INT_' + id] || {});
      }
      // loot: the treasures in its pool, and in the setting's heart room its key object
      const loot = (r.loot_pool || []).map((t) => treasureName(t, comp));
      if (arch === comp.key_room) for (const k of r.key_object_pool || []) if ((comp.key_objects || {})[r.setting_id] && /_HEART$/.test(k)) loot.push((comp.key_objects || {})[r.setting_id]);
      if (loot.length) out.loot['LOOT_' + id] = Object.assign({ id: 'LOOT_' + id, room_id: id, name: loot.join(', '), source: r.loot_pool, items: loot.map((n, k) => lootItem('LOOT_' + id, n, k)) }, ov['LOOT_' + id] || {});
      // the hazard: a trap room's trap, otherwise the setting's decay
      const trap = (comp.trap_rooms || []).includes(arch) && (r.trap_pool || []).find((t) => (comp.traps || {})[t]);
      const hz = trap ? comp.traps[trap] : (comp.decay_hazards || {})[r.setting_id];
      if (hz) out.hazards['HAZ_' + id] = hazard('HAZ_' + id, id, Object.assign({ source: trap || (r.hazard_pool || [])[0] }, hz));
      // dressing: its three DRESS ids, written from the setting's signage, smells and decay
      const ph = phrases(S);
      const dressing = (r.dressing_pool || []).map((d) => {
        const [n, k] = String(d).split('_').slice(-2).map(Number);
        return ph.length ? ph[((n || 0) * 3 + (k || 0)) % ph.length] : '';
      }).filter(Boolean);
      const cond = (comp.conditions || {})[r.current_condition];
      const keep = Object.fromEntries(Object.entries(r).filter(([k]) => !B1.RENAMED.includes(k)));
      out.rooms[id] = Object.assign(keep, {
        id, setting_id: r.setting_id, name: arch, full_name: r.name, function: String(r.purpose || '').split(' for ')[0].toLowerCase(),
        size_class: r.size_class, frequency_weight: r.frequency_weight,
        floor_tile_pool: r.floor_tiles, wall_tile_pool: r.wall_tiles, lighting_pool: r.lighting,
        mandatory_features: mandatory, optional_furnishings: optional, setting_pieces: own3, dressing,
        furniture_record: 'FURN_' + id, interactive_record: devs.length ? 'INT_' + id : null, loot_record: loot.length ? 'LOOT_' + id : null, hazard_record: hz ? 'HAZ_' + id : null,
        doors: r.door_preferences, occupant_tags: r.encounter_tags, rare_twist: r.strange_variations, alternate_purpose: r.alternate_purpose,
        history_overlays: cond ? [cond[0]].concat(r.alternate_purpose ? ['repurposed'] : []) : [], condition_state: cond ? cond[1] : null,
        cluster: A.cluster || fallbackOf(comp, 'clusters', 'general'),
      }, ov[id] || {});
    }
    return out;
  }
  // source room fields that come out under library 1's names (or as records), so aren't carried twice
  B1.RENAMED = ['room_id', 'floor_tiles', 'wall_tiles', 'lighting', 'furniture_pool', 'dressing_pool', 'interactive_pool', 'loot_pool', 'key_object_pool', 'trap_pool', 'hazard_pool', 'encounter_tags', 'door_preferences', 'strange_variations', 'mandatory_features'];
  G.CONTENT_ADAPTERS['havenot-settings-library-b1'] = B1;

  /** Every gap in a library B source, and whether the companion fills it. 'gap': the source leaves it undefined
   *  and the companion fills it; 'bad': nothing fills it; 'warn': it works, from a fallback. */
  function validateB1(src, comp) {
    const out = [];
    const say = (level, section, id, text) => out.push({ level, section, id, text });
    const SL = src.shared_libraries || {};
    for (const k of ['settings', 'rooms']) if (!Array.isArray(src[k]) || !src[k].length) say('bad', k, '', 'section missing or empty');
    const setIds = new Set((src.settings || []).map((s) => s.setting_id));
    const roomIds = new Set();
    for (const s of src.settings || []) {
      for (const f of ['setting_id', 'name', 'floor_palette_ids', 'wall_palette_ids', 'lighting_palette_ids', 'decay_patterns']) if (s[f] == null || s[f] === '' || (Array.isArray(s[f]) && !s[f].length)) say('bad', 'settings', s.setting_id, 'required field ' + f + ' is missing or empty');
      if (!(comp.palettes || {})[s.setting_id]) say('bad', 'settings', s.setting_id, 'no palette in the companion (missing graphics)');
      for (const [t, w] of Object.entries(s.adjacent_setting_weights || {})) {
        if (!setIds.has(t)) say('bad', 'settings', s.setting_id, 'adjacent_setting_weights → ' + t + ': no such setting');
        if (!(w >= 0 && w <= 1)) say('bad', 'settings', s.setting_id, 'adjacent weight ' + w + ' for ' + t + ' is not in 0..1');
      }
      if (!Object.keys(s.adjacent_setting_weights || {}).length) say('warn', 'settings', s.setting_id, 'no adjacent settings: it has no related setting');
      if (!Object.values(comp.type_settings || {}).some((m) => m[s.setting_id])) say('warn', 'settings', s.setting_id, 'no installation type leans to it (companion type_settings); it comes up only by chance');
      if (!(comp.decay_hazards || {})[s.setting_id]) say('bad', 'hazards', 'HAZ_' + s.setting_id + '_DECAY', 'undefined in the source and not written in the companion');
    }
    // tiles: the shared tile lists don't match the ids rooms use
    const sharedTiles = new Set([].concat(SL.floor_tiles || [], SL.wall_tiles || [], SL.lighting || []).map((t) => t.id));
    const near = (id) => [...sharedTiles].find((s) => s.replace(/ /g, '_') === id);
    for (const [id, t] of B1.tileIds(src)) {
      if (sharedTiles.has(id)) continue;
      const desc = words(id, /^(FLOOR|WALL|LIGHT)_/);
      const m = firstMatch((comp.materials || {})[t.kind], desc);
      const n = near(id);
      if (!m) say('bad', 'tiles', id, 'undefined in the source, and no ' + t.kind + ' painter matches “' + desc + '” (missing graphics)');
      else say('gap', 'tiles', id, 'undefined in the source' + (n ? ' (shared_libraries has “' + n + '”, with spaces)' : '') + '; drawn as ' + t.kind + ' ' + m[1] + ' from its name');
    }
    for (const t of [].concat(SL.floor_tiles || [], SL.wall_tiles || [], SL.lighting || [])) if (/ /.test(t.id)) say('warn', 'shared_libraries', t.id, 'an id with spaces; no room uses it' + (B1.tileIds(src).has(t.id.replace(/ /g, '_')) ? ' (rooms use ' + t.id.replace(/ /g, '_') + ')' : ''));
    const sharedIds = (k) => new Set((SL[k] || []).map((x) => x.id));
    const FURN = sharedIds('furniture'), INT = sharedIds('interactive'), TRE = sharedIds('treasure'), TRP = sharedIds('traps');
    const seenRef = new Set();
    const once = (key, fn) => {
      if (seenRef.has(key)) return;
      seenRef.add(key);
      fn();
    };
    for (const r of src.rooms || []) {
      const id = r.room_id;
      if (roomIds.has(id)) say('bad', 'rooms', id, 'duplicate id (room_id)');
      roomIds.add(id);
      for (const f of ['room_id', 'setting_id', 'name', 'size_class', 'frequency_weight', 'floor_tiles', 'wall_tiles', 'lighting', 'mandatory_features']) if (r[f] == null || r[f] === '' || (Array.isArray(r[f]) && !r[f].length)) say('bad', 'rooms', id, 'required field ' + f + ' is missing or empty');
      if (!setIds.has(r.setting_id)) say('bad', 'rooms', id, 'setting_id → ' + r.setting_id + ': no such setting');
      if (!(r.frequency_weight > 0)) say('bad', 'rooms', id, 'frequency_weight ' + r.frequency_weight + ' is not a positive weight');
      if (!(comp.sizes || {})[r.size_class]) say('bad', 'rooms', id, 'unknown size_class ' + r.size_class);
      const arch = archOf(r);
      if (!(comp.room_archetypes || {})[arch]) say('bad', 'rooms', id, 'room template “' + arch + '” has no fixtures in the companion');
      if (comp.setting_pieces && !((comp.setting_pieces[r.setting_id] || {})[arch] || []).length) say('warn', 'rooms', id, 'no setting-specific pieces for its template in the companion (setting_pieces)');
      else if ((r.mandatory_features || []).some((n) => /^primary .* fixture$/i.test(n))) once('primary:' + arch, () => say('gap', 'rooms', arch, '“Primary ' + arch + ' fixture” is a placeholder (in every setting’s ' + arch + '); its fixtures come from the companion: ' + comp.room_archetypes[arch].fixtures.join(', ')));
      for (const f of r.furniture_pool || []) {
        if (!FURN.has(f)) say('bad', 'rooms', id, 'furniture_pool → ' + f + ': no such furniture');
        if (!(comp.shared_furniture || {})[f]) once('home:' + f, () => say('bad', 'furniture', f, 'no object name or home setting in the companion'));
      }
      for (const i of r.interactive_pool || []) if (!INT.has(i)) say('bad', 'rooms', id, 'interactive_pool → ' + i + ': no such interactive');
      for (const t of r.loot_pool || []) if (!TRE.has(t)) say('bad', 'rooms', id, 'loot_pool → ' + t + ': no such treasure');
      for (const t of r.trap_pool || []) {
        if (!TRP.has(t)) say('bad', 'rooms', id, 'trap_pool → ' + t + ': no such trap');
        once('trap:' + t, () => say((comp.traps || {})[t] ? 'gap' : 'bad', 'traps', t, 'the source has only a name: no trigger, clues, effect, countermeasure or severity' + ((comp.traps || {})[t] ? '; written in the companion' : '')));
      }
      for (const d of r.dressing_pool || []) once(d, () => say('gap', 'dressing', d, 'undefined in the source; written from the setting’s signage, smells and decay'));
      for (const k of r.key_object_pool || []) once(k, () => say((comp.key_objects || {})[r.setting_id] ? 'gap' : 'bad', 'key objects', k, 'undefined in the source' + ((comp.key_objects || {})[r.setting_id] ? ' (listed by all ' + (src.rooms || []).filter((x) => (x.key_object_pool || []).includes(k)).length + ' of its setting’s rooms); one object, “' + comp.key_objects[r.setting_id] + '”, loot in its ' + comp.key_room + ' room' : '')));
      for (const h of r.hazard_pool || []) once(h, () => say((comp.decay_hazards || {})[r.setting_id] ? 'gap' : 'bad', 'hazards', h, 'undefined in the source' + ((comp.decay_hazards || {})[r.setting_id] ? '; written in the companion from the setting’s decay: “' + comp.decay_hazards[r.setting_id].name + '”' : '')));
      if (r.current_condition && !(comp.conditions || {})[r.current_condition]) once('cond:' + r.current_condition, () => say('warn', 'rooms', r.current_condition, 'a condition the companion doesn’t turn into a history overlay'));
      if (!(r.interactive_pool || []).length) say('warn', 'rooms', id, 'no interactive device');
    }
    // the shared records are placeholders
    const placeholder = (k, f, label) => {
      const ph = (SL[k] || []).filter((x) => new Set((SL[k] || []).map((y) => y[f])).size === 1);
      if (ph.length) say('gap', 'shared_libraries', k, 'all ' + ph.length + ' ' + label + ' records have the same placeholder ' + f + ' (“' + ph[0][f] + '”); ' + (k === 'interactive' && comp.device_uses ? 'each device’s use is written in the companion (device_uses)' : k === 'traps' ? 'their mechanics are written in the companion (traps)' : 'names come from their ids'));
    };
    placeholder('furniture', 'description', 'furniture');
    placeholder('treasure', 'description', 'treasure');
    placeholder('interactive', 'interaction', 'interactive');
    placeholder('traps', 'effect', 'trap');
    // what the fill can't draw or do yet
    const content = B1(src, comp);
    for (const [n, o] of Object.entries(content.objects)) if (o.fallback) say('warn', 'objects', n, 'no drawing family; drawn as the fallback (' + o.fam + ')');
    for (const h of Object.values(content.hazards)) if (h.fallback) say('warn', 'hazards', h.id, '“' + h.name + '” has no behaviour rule; it works as the fallback (' + h.behaviour + ')');
    for (const i of Object.values(content.interactables)) if (!firstMatch(rulesOf(comp, 'interactables'), i.device + ' ' + i.possible_use)) once('dev:' + i.device, () => say('warn', 'interactables', i.source, '“' + i.device + '” has no device rule; it works as the fallback (' + i.kind + ')'));
    for (const sid of Object.keys(comp.shared_furniture || {})) if (sid[0] !== '$' && !FURN.has(sid)) say('warn', 'companion', sid, 'shared_furniture names a record the source doesn’t have');
    if (!src.generation_parameters) say('warn', 'generation_parameters', '', 'the source has none; the generator’s defaults are used (25% functional rooms, adjacency 55/20/15/10, twists 12%, overlays 32%)');
    for (const s of ['tiny', 'monumental']) if ((src.rooms || []).some((r) => r.size_class === s)) say('gap', 'rooms', s, 'size class not in library 1; companion sizes: ' + JSON.stringify((comp.sizes || {})[s]) + ' floor cells');
    return out;
  }
  G.CONTENT_VALIDATORS = G.CONTENT_VALIDATORS || {};
  G.CONTENT_VALIDATORS['havenot-settings-library-b1'] = validateB1;

  // ------------------------------------------------------------ validation
  G.validateContent = function (src, comp) {
    const out = [];
    const bad = (section, id, text) => out.push({ level: 'bad', section, id, text });
    const warn = (section, id, text) => out.push({ level: 'warn', section, id, text });
    if (!comp || !G.CONTENT_ADAPTERS[comp.format]) {
      bad('companion', '', 'no adapter for format ' + (comp && comp.format));
      return out;
    }
    if (G.CONTENT_VALIDATORS[comp.format]) return G.CONTENT_VALIDATORS[comp.format](src, comp);
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

  /** Several libraries' content as one: their records side by side (ids don't clash between libraries), each
   *  installation type leaning to the settings of all of them, the first library's parameters and setting modes. */
  G.mergeContent = function (list) {
    const out = { format: 'merged', libraries: list.map((c) => c.format), meta: {}, params: list[0].params || {}, modes: list[0].modes, typeSettings: {}, sizes: {} };
    for (const k of ['settings', 'tiles', 'rooms', 'objects', 'furniture', 'interactables', 'loot', 'hazards']) {
      out[k] = {};
      for (const c of list) for (const [id, v] of Object.entries(c[k] || {})) if (!(id in out[k])) out[k][id] = v;
    }
    for (const c of list) {
      for (const [s, v] of Object.entries(c.sizes || {})) if (Array.isArray(v) && !out.sizes[s]) out.sizes[s] = v;
      for (const [t, lean] of Object.entries(c.typeSettings || {})) {
        if (t[0] === '$' || typeof lean !== 'object') continue;
        out.typeSettings[t] = Object.assign(out.typeSettings[t] || {}, lean);
      }
    }
    return out;
  };

  G.adaptContent = function (src, comp) {
    const problems = G.validateContent(src, comp).filter((p) => p.level === 'bad');
    if (problems.length) throw new Error('Content library has ' + problems.length + ' problems: ' + problems.slice(0, 5).map((p) => p.section + ' ' + p.id + ': ' + p.text).join('; '));
    return G.CONTENT_ADAPTERS[comp.format](src, comp);
  };

  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
