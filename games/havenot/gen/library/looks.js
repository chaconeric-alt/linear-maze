/* HaveNot generator library — looks.js
 * The tile sets: Vol 2 p. 62's Look and Feel list mapped onto the game's environments. Four looks
 * are built today (the Anomalous Structure's three environments and the hn-complex bulkheads); the
 * rest are listed as planned and fall back to the nearest built look until someone paints them.
 *
 *   environment   an engine environment id
 *   variants      which floor variant each kind of floor uses (corridor, room, lobby, cafe, wet, lab)
 *   doorTerrain   the terrain plain doors use ('door', or the lab's iris)
 *   nextGen, ceilingLights   copied from the hand-built floor of the same look
 *   dressing      dressing pools for every room of this look; posters: the poster text pool
 */
LM.genLibrary('havenot', {
  looks: {
    institutional: {
      name: 'Institutional', ref: 'Vol 2 p. 62; hn-agency-1', status: 'built', environment: 'hn-agency-inst',
      variants: { corridor: 0, room: 1, wet: 2, cafe: 2, lobby: 3, lab: 1 }, doorTerrain: 'door',
      nextGen: {
        enabled: true, oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.45, pipes: false, ducts: true, cables: true, beams: false, fans: true, hanging: false, fanTag: 'fan', fanSpeed: 0.8, opacity: 0.9, color: '#040504', height: 1.7, parallax: 0.2, rim: true, seed: 21 },
        neon: { on: true, colors: ['#ff4ad8', '#22e6ff'], where: 'corridors', density: 0.35, flicker: 0.25, brightness: 0.8, radius: 110, style: 'tube', colorMode: 'cycle', mount: 0.7, lightTag: 'neon' },
      },
      ceilingLights: [{ variants: [0, 1, 2, 3], every: 4, offset: [1, 1], color: '#e8f4ff', radius: 120, intensity: 0.55, flicker: 0.12, skip: 0.15 }],
      dressing: ['dress-institutional'], posters: 'posters.corporate',
    },
    'sterile-white': {
      name: 'Sterile White', ref: 'Vol 2 p. 62; hn-agency-2', status: 'built', environment: 'hn-agency-lab',
      variants: { corridor: 0, room: 1, lab: 2, wet: 2, cafe: 1, lobby: 1 }, doorTerrain: 'hn-iris',
      nextGen: {
        enabled: true, oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.2, pipes: false, ducts: true, cables: false, beams: false, fans: false, hanging: false, opacity: 0.85, color: '#06080a', height: 1.7, parallax: 0.2, rim: true, seed: 31 },
        neon: { on: true, colors: ['#e8f8ff', '#9fe8ff'], where: 'corridors', density: 0.7, flicker: 0.05, brightness: 0.7, radius: 90, style: 'dashed', colorMode: 'cycle', mount: 0.15, lightTag: 'neon' },
      },
      ceilingLights: [{ variants: [0, 1, 2], every: 4, offset: [1, 1], color: '#f4fbff', radius: 130, intensity: 0.6, flicker: 0.03 }],
      dressing: ['dress-lab'], posters: 'posters.lab',
    },
    'industrial-metal': {
      name: 'Industrial-Metal', ref: 'Vol 2 p. 62; hn-agency-3', status: 'built', environment: 'hn-agency-sec',
      variants: { corridor: 0, room: 1, wet: 1, cafe: 1, lobby: 1, lab: 1 }, doorTerrain: 'door',
      nextGen: {
        enabled: true, oblique: { on: true, tilt: 0.6, height: 28, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.7, pipes: true, ducts: true, cables: true, beams: true, fans: true, hanging: true, fanTag: 'fan', fanSpeed: 1.2, opacity: 0.95, color: '#030303', height: 1.7, parallax: 0.2, rim: true, seed: 41 },
        neon: { on: false },
      },
      ceilingLights: [{ variants: [0, 1], every: 5, offset: [2, 2], color: '#ffd8a0', radius: 110, intensity: 0.5, flicker: 0.18, skip: 0.25 }],
      dressing: ['dress-industrial'], posters: 'posters.safety',
    },
    emergency: {
      name: 'Emergency', ref: 'Vol 2 p. 62', status: 'built', environment: 'hn-agency-sec',
      variants: { corridor: 0, room: 1, wet: 1, cafe: 1, lobby: 1, lab: 1 }, doorTerrain: 'door',
      nextGen: {
        enabled: true, oblique: { on: true, tilt: 0.6, height: 28, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.6, pipes: true, ducts: true, cables: true, beams: true, fans: false, hanging: true, opacity: 0.95, color: '#030303', height: 1.7, parallax: 0.2, rim: true, seed: 47 },
        neon: { on: false },
      },
      ceilingLights: [{ variants: [0, 1], every: 4, offset: [1, 1], color: '#ff5a3a', radius: 120, intensity: 0.55, flicker: 0.35, skip: 0.2 }],
      dressing: ['dress-industrial'], posters: 'posters.emergency',
    },
    bulkhead: {
      name: 'Bulkhead', ref: 'hn-complex (havenot-test); Vol 2 p. 62 (Industrial-Metal, Submarine)', status: 'built', environment: 'hn-complex',
      variants: { corridor: 0, room: 1, wet: 1, cafe: 1, lobby: 1, lab: 1 }, doorTerrain: 'door',
      nextGen: {
        enabled: true, oblique: { on: true, tilt: 0.6, height: 26, parallax: 0.3, sway: 0.4 },
        ceiling: { on: true, clutter: 0.4, pipes: true, ducts: false, cables: true, beams: true, fans: false, hanging: true, opacity: 0.9, color: '#030303', height: 1.7, parallax: 0.2, rim: true, seed: 30 },
        neon: { on: false },
      },
      ceilingLights: [{ variants: [0, 1], every: 4, offset: [1, 1], color: '#ffd8a8', radius: 100, intensity: 0.4, flicker: 0.15, skip: 0.3 }],
      dressing: ['dress-bulkhead'], posters: 'posters.military',
    },
    // ---------------------------------------------------------------- planned (Vol 2 p. 62)
    crypt: { name: 'Crypt', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'bulkhead', notes: 'Bare cement, gothic arches, black iron bars, coffin alcoves, soft music. Needs a stone wall painter and arches.' },
    'toxic-waste': { name: 'Toxic Waste', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'industrial-metal', notes: 'Glowing barrels, sealed doors, warning glyphs; breathing the air is a resisted attack.' },
    'treatment-plant': { name: 'Treatment Plant', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'industrial-metal', notes: 'Pipes, drums, pumps, gauges that move.' },
    'violet-modular': { name: 'Violet Modular', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'sterile-white', notes: 'Floor mist, purple scanning lasers, modules joined by airlocks over a void.' },
    'observation-decks': { name: 'Observation Decks', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'sterile-white', notes: 'One-way armour glass into every chamber, intercoms.' },
    submarine: { name: 'Submarine', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'bulkhead', notes: 'Catwalks, cranked hatches, cramped.' },
    'active-walls': { name: 'Active Walls', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'sterile-white', notes: 'Touch-screen walls; lights and doors respond before you arrive.' },
    'bare-concrete': { name: 'Bare Concrete', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'bulkhead', notes: 'Unfinished concrete, drilled-in lights, graffiti, garbage.' },
    rave: { name: 'Rave', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'institutional', notes: 'Black light and day-glow, lasers, mist, a beat.' },
    'under-construction': { name: 'Under Construction', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'industrial-metal', notes: 'Numbered panels, half-tiled floors, open framework walls.' },
    postmodern: { name: 'Postmodern', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'institutional', notes: 'Glass walls, planters, hologram directories, glass lifts.' },
    carnival: { name: 'Carnival', ref: 'Vol 2 p. 62', status: 'planned', fallback: 'institutional', notes: 'Jaunty music, bright colour, dim alleys, doors that advertise themselves.' },
  },
  // dressing pools: { item, place, count | density | chance, props, say (text pool), prop, rooms (only these templates) }
  dressings: {
    'dress-institutional': [
      { item: 'hn-poster', place: 'wall', density: 0.025, say: 'posters.corporate' },
      { item: 'hn-safety-sign', place: 'wall', density: 0.01, say: 'signs.safety' },
      { item: 'plant', place: 'corner', density: 0.015 },
      { item: 'papers', place: 'any', density: 0.015 },
      { item: 'hn-ad-screen', place: 'wall', chance: 0.25, props: { ad: 2 } },
    ],
    'dress-lab': [
      { item: 'hn-poster', place: 'wall', density: 0.02, say: 'posters.lab' },
      { item: 'hn-safety-sign', place: 'wall', density: 0.012, say: 'signs.lab' },
      { item: 'plant', place: 'corner', density: 0.01 },
    ],
    'dress-industrial': [
      { item: 'hn-safety-sign', place: 'wall', density: 0.02, say: 'signs.safety' },
      { item: 'hn-poster', place: 'wall', density: 0.012, say: 'posters.safety' },
      { item: 'barrel', place: 'corner', density: 0.012 },
      { item: 'crate', place: 'wall-row', density: 0.012 },
      { item: 'ceiling-debris', place: 'any', density: 0.01 },
    ],
    'dress-bulkhead': [
      { item: 'hn-poster', place: 'wall', density: 0.018, say: 'posters.military' },
      { item: 'crate', place: 'wall-row', density: 0.015 },
      { item: 'barrel', place: 'corner', density: 0.01 },
      { item: 'bones', place: 'any', density: 0.008 },
      { item: 'papers', place: 'any', density: 0.008 },
    ],
    'dress-lobby': [{ item: 'hn-poster', place: 'wall', count: [1, 2], say: 'posters.welcome' }, { item: 'rug', place: 'middle', chance: 0.3 }],
    'dress-office': [{ item: 'whiteboard', place: 'wall', chance: 0.4, say: 'whiteboards' }, { item: 'bin', place: 'corner', chance: 0.5 }, { item: 'cooler', place: 'wall-row', chance: 0.3 }],
    'dress-exec': [{ item: 'globe', place: 'corner', chance: 0.4 }, { item: 'plant', place: 'corner', count: [1, 2] }, { item: 'rug', place: 'middle', chance: 0.5 }],
    'dress-lab-room': [{ item: 'hn-poster', place: 'wall', count: [0, 1], say: 'posters.lab' }, { item: 'papers', place: 'any', chance: 0.5 }],
    'dress-tomb': [{ item: 'candles', place: 'corner', count: [1, 2] }, { item: 'bones', place: 'any', count: [0, 2] }, { item: 'hn-poster', place: 'wall', chance: 0.4, say: 'posters.tomb' }],
  },
});
