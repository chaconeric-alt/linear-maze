// HaveNot art: sprite sheets for library pieces, made with the ArtCraft tools' command-line engines.
//   node games/havenot/art/build-sprites.mjs
//
// For each piece in PIECES: its vector source (src/<id>.svg, top-down, twice game scale) goes through
//   1. FigCraft: one frame per state, the state's geometry drawn over it (cracks, the split, shards), a surface
//      texture and a contact shadow; exported as a PNG per state;
//   2. PhotoCraft: each state's tone (grime, power off, char) on the piece's own pixels, then film grain and an
//      unsharp mask;
//   3. FigCraft again: the four states side by side as one sheet, sprites/<id>.png.
// sprites/sprites.json lists what was made: { id: { file, w, h, states: [...] } }. The game draws a piece from its
// sheet when there is one (hn-gen-kit/furniture.js) and otherwise as it always has.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FIG = 'C:/Program Files/ArtCraft/FigCraft/figcraft-cli.exe';
const PHOTO = 'C:/Program Files/ArtCraft/PhotoCraft/photocraft-cli.exe';
const ROOT = here.replace(/\//g, '\\');
const build = join(here, 'build'), out = join(here, 'sprites');
mkdirSync(build, { recursive: true });
mkdirSync(out, { recursive: true });
const STATES = ['working', 'damaged', 'disabled', 'destroyed'];
// a monster's frames, all from its one vector: how each is posed (dy: a bob, rot: a sway or a fall, in
// degrees, about the middle; scale: a lunge) and toned
const FRAMES = ['idle', 'walk1', 'walk2', 'attack', 'hurt', 'death'];
const POSE = { idle: {}, walk1: { dy: -1.5, rot: -4 }, walk2: { dy: 1.5, rot: 4 }, attack: { scale: 1.1 }, hurt: { rot: -8 }, death: { rot: 82, scale: 0.78 } };
const FRAME_TONE = { idle: 'working', walk1: 'working', walk2: 'working', attack: 'working', hurt: 'hurt', death: 'destroyed' };
/** The source posed for a frame: its content wrapped in a transform about the middle. */
function posed(src, w, h, pose) {
  const t = 'translate(' + w / 2 + ' ' + (h / 2 + (pose.dy || 0)) + ') rotate(' + (pose.rot || 0) + ') scale(' + (pose.scale || 1) + ') translate(' + -w / 2 + ' ' + -h / 2 + ')';
  return src.replace(/(<svg[^>]*>)/, '$1<g transform="' + t + '">').replace(/<\/svg>\s*$/, '</g></svg>');
}

// the pieces: their names in the libraries, their size, and where each state's damage goes (SVG path data, in the
// piece's own pixels)
const PIECES = {
  'adaptive-throne': {
    names: ['adaptive throne'], w: 128, h: 128,
    cracks: ['M40 46 L52 60 L48 74 L58 88', 'M100 20 L92 32 L96 40', 'M70 96 L78 104 L74 114'],
    split: 'M20 12 L44 50 L38 70 L60 96 L56 124',
    shards: [[6, 116], [118, 104], [112, 8], [14, 70]],
  },
  'growth-vat': {
    names: ['growth vat', 'rows of growth vats', 'growth creche vat'], w: 96, h: 96,
    cracks: ['M30 30 L42 44 L36 58', 'M60 26 L56 40 L66 50 L62 60'],
    split: 'M18 22 L40 46 L34 64 L50 82',
    shards: [[8, 80], [84, 14], [88, 76], [12, 10], [50, 92]],
  },
  'gilded-coffin-bed': {
    names: ['gilded coffin bed', 'coffin recliner'], w: 64, h: 128,
    cracks: ['M20 60 L28 76 L24 92', 'M44 64 L40 80'],
    split: 'M12 30 L30 60 L26 90 L40 120',
    shards: [[2, 126], [60, 8], [58, 100]],
  },
};
// the batches after the first three: names (exact), match (a pattern for the rest of their kind), size; their
// damage is laid out from their size and id (damageFor) unless given
Object.assign(PIECES, {
  centrifuge: { names: ['scandal centrifuges', 'scandal centrifuge', 'personality centrifuges', 'personality centrifuge turbine'], match: 'centrifuge', w: 128, h: 128 },
  'power-core-turbine': { names: ['power core turbine'], match: '(core|generator|reactor) turbine$|^turbine', w: 128, h: 128 },
  altar: { names: ['cult altar', 'sponsor altar'], match: 'altar$', w: 128, h: 64 },
  pews: { names: ['cult pews', 'waiting benches', 'pews'], match: '(pews|benches)$', w: 192, h: 64 },
  'surgical-table': { names: ['surgical prep table', 'operating table', 'surgical cart'], match: 'surgical|operating|autopsy|dissection', w: 128, h: 64 },
  // batch 2: consoles and kiosks
  'flavor-synthesizer': { names: ['flavor synthesizers', 'flavor synthesizer'], match: 'synthesi[sz]er', w: 64, h: 64 },
  'frown-scanner': { names: ['frown scanners', 'frown scanner'], match: 'frown|smile scanner|enthusiasm', w: 64, h: 64 },
  'karma-slot-machine': { names: ['karma slot machine'], match: 'slot machine|gambl|lottery', w: 64, h: 64 },
  'vending-kiosk': { names: ['number dispenser kiosk', 'payment kiosk'], match: 'vending|kiosk|dispenser', w: 64, h: 64 },
  'meat-printer': { names: ['meat printer (prints you)'], match: 'meat printer|printer', w: 64, h: 64 },
  // batch 3
  'bingo-caller': { names: ['bingo nuke caller', 'tactical bingo console', 'bingo caller dais'], match: 'bingo', w: 64, h: 64 },
  'holding-cell': { names: ['barred cells', 'holding cage', 'bunk cells'], match: '(cells?|cage|kennels?|pens)$', w: 128, h: 128 },
  'bleach-vat': { names: ['identity bleach vat', 'reputation bleach vat'], match: 'bleach|wash vat|rinse', w: 64, h: 64 },
  cannon: { names: ['confetti cannon volley', 'cannon'], match: 'cannon$|howitzer|artillery|mortar', w: 64, h: 64 },
  'lounger-bed': { names: ['vip lounger bed', 'incorporeal lounger bed', 'celebrity lounger bed'], match: 'lounger|bunk|( |^)bed$', w: 64, h: 128 },
  // batch 4
  conveyor: { names: ['waste chute conveyor', 'compost belts', 'face conveyor'], match: 'conveyor|belts?$', w: 192, h: 64 },
  dais: { names: ['presentation dais', 'auction dais', 'elevated platform', 'velvet stage'], match: '(dais|stage|platform|podium)$', w: 192, h: 128 },
  oven: { names: ['fabrication oven', 'birthday cake oven furnace'], match: 'oven|kiln|incinerator|boiler', w: 128, h: 64 },
  press: { names: ['reputation press (forgiveness setting)', 'scandal pulper press'], match: 'press$|pulper|compactor|stamper|mangle', w: 128, h: 64 },
  'luxury-bath': { names: ['luxury bath', 'sunken bath', 'memory pool bath'], match: 'bath$|hot tub|jacuzzi|spa pool', w: 128, h: 128 },
  // monsters (kind: 'monster'): enemies, the width they're drawn at in world units, and whether they turn to face
  // their way (top-down creatures do; Eggbots stay upright, as the game has always drawn them)
  eggbot: { kind: 'monster', enemies: ['hn-eggbot'], size: 26, w: 64, h: 64 },
  'princess-eggbot': { kind: 'monster', enemies: ['hn-princess'], size: 64, w: 128, h: 128 },
  'knife-fighter': { kind: 'monster', enemies: ['hn-knife'], size: 24, turns: true, w: 64, h: 64 },
  chatterpillar: { kind: 'monster', enemies: ['hn-chatter-a', 'hn-chatter-g'], size: 22, turns: true, w: 64, h: 96 },
  'maintenance-robot': { kind: 'monster', enemies: ['hn-maintbot'], size: 40, turns: true, w: 96, h: 96 },
  glorexx: { kind: 'monster', enemies: ['hn-glorexx'], size: 30, turns: true, w: 64, h: 64 },
  monoid: { kind: 'monster', enemies: ['hn-monoid'], size: 28, turns: true, w: 64, h: 64 },
  'desktop-defender': { kind: 'monster', enemies: ['hn-defender'], size: 16, turns: true, w: 64, h: 64 },
  'sparkle-wasp': { kind: 'monster', enemies: ['hn-wasp'], size: 34, turns: true, w: 96, h: 96 },
  'bombast-toad': { kind: 'monster', enemies: ['hn-toad'], size: 44, turns: true, w: 96, h: 96 },
  'security-drone': { kind: 'monster', enemies: ['hn-drone'], size: 50, turns: true, w: 96, h: 96 },
  'gladiator-roach': { kind: 'monster', enemies: ['hn-roach'], size: 20, turns: true, w: 64, h: 64 },
  'robot-dancer': { kind: 'monster', enemies: ['hn-dancer'], size: 24, turns: true, w: 64, h: 64 },
  'carnivorous-plant': { kind: 'monster', enemies: ['hn-snapper'], size: 30, turns: true, w: 64, h: 64 },
  'automated-undead': { kind: 'monster', enemies: ['hn-deadbot'], size: 24, turns: true, w: 64, h: 64 },
  'grease-monkey': { kind: 'monster', enemies: ['hn-grease-monkey'], size: 36, turns: true, w: 64, h: 64 },
  'slop-tread': { kind: 'monster', enemies: ['hn-slop-tread'], size: 38, turns: true, w: 64, h: 64 },
  'grime-turret': { kind: 'monster', enemies: ['hn-grime-turret'], size: 30, turns: true, w: 64, h: 64 },
  'agency-turret': { kind: 'monster', enemies: ['hn-turret'], size: 30, turns: true, w: 64, h: 64 },
  'sphinx-gun': { kind: 'monster', enemies: ['hn-sphinx'], size: 36, turns: true, w: 64, h: 64 },
  // the player: layers drawn over the engine's scavenger (packs/hn-rules/look.js); greys on white are tinted at play
  'field-emitter': { kind: 'monster', enemies: ['hn-emitter'], size: 30, w: 64, h: 64 },
  'metal-cocoon': { kind: 'monster', enemies: ['hn-cocoon'], size: 26, w: 64, h: 64 },
  'buddy-bot': { kind: 'monster', enemies: ['hn-buddy'], size: 26, turns: true, w: 64, h: 64 },
  // Asterion's robots, out of Dead Signal (hn-gen-kit/robots.js)
  sentinel: { kind: 'monster', enemies: ['hn-sentinel'], size: 32, turns: true, w: 64, h: 64 },
  'warden-drone': { kind: 'monster', enemies: ['hn-warden'], size: 28, turns: true, w: 64, h: 64 },
  'ceiling-turret': { kind: 'monster', enemies: ['hn-ceiling-turret'], size: 28, turns: true, w: 64, h: 64 },
  sweeper: { kind: 'monster', enemies: ['hn-sweeper'], size: 30, turns: true, w: 64, h: 64 },
  'scalpel-drone': { kind: 'monster', enemies: ['hn-scalpel'], size: 22, turns: true, w: 64, h: 64 },
  labmate: { kind: 'monster', enemies: ['hn-labmate'], size: 28, turns: true, w: 64, h: 64 },
  courier: { kind: 'monster', enemies: ['hn-courier'], size: 22, turns: true, w: 64, h: 64 },
  'bench-arm': { kind: 'monster', enemies: ['hn-bench-arm'], size: 28, turns: true, w: 64, h: 64 },
  sterilizer: { kind: 'monster', enemies: ['hn-sterilizer'], size: 34, turns: true, w: 64, h: 64 },
  docent: { kind: 'monster', enemies: ['hn-docent'], size: 36, turns: true, w: 64, h: 64 },
  orderly: { kind: 'monster', enemies: ['hn-orderly'], size: 30, turns: true, w: 64, h: 64 },
  concierge: { kind: 'monster', enemies: ['hn-concierge'], size: 28, turns: true, w: 64, h: 64 },
  chef: { kind: 'monster', enemies: ['hn-chef'], size: 32, turns: true, w: 64, h: 64 },
  'kitchen-arm': { kind: 'monster', enemies: ['hn-kitchen-arm'], size: 28, turns: true, w: 64, h: 64 },
  praetorian: { kind: 'monster', enemies: ['hn-praetorian'], size: 36, turns: true, w: 64, h: 64 },
  railgun: { kind: 'monster', enemies: ['hn-railgun'], size: 34, turns: true, w: 64, h: 64 },
  enforcer: { kind: 'monster', enemies: ['hn-enforcer'], size: 32, turns: true, w: 64, h: 64 },
  'tartarus-warden': { kind: 'monster', enemies: ['hn-tartarus'], size: 50, turns: true, w: 64, h: 64 },
  'plate-cutter': { kind: 'monster', enemies: ['hn-plate-cutter'], size: 40, turns: true, w: 64, h: 64 },
  // pictures of places (hn-world/placeart.js): the map's icons and the arrival cards
  places: { kind: 'places', size: 320, w: 320, h: 200, layers: ['anomalous', 'greasy', 'bunker'] },
  // what you see when you read a poster or watch an ad (hn-rules/postart.js)
  posters: { kind: 'posters', size: 200, w: 200, h: 280, layers: ['synergy', 'watched', 'want-more', 'obedience', 'hustle', 'safety', 'enoch', 'egg', 'slogan'] },
  ads: { kind: 'ads', size: 320, w: 320, h: 180, layers: ['fizz', 'hypno', 'tired', 'vert', 'noticed'] },
  // people (packs/hn-sites/person.js): a paper doll for LM.gfx.person, its greys tinted from each one's look
  person: { kind: 'person', size: 25.6, w: 64, h: 64, layers: ['shirt', 'sleeve', 'hand', 'blazer', 'tie', 'lanyard', 'card', 'head', 'hair-short', 'hair-buzz', 'hair-long', 'hair-ponytail', 'hair-bun', 'hair-curly', 'hair-bald', 'glasses', 'headset'] },
  // the guns in hand (hn-rules/weaponart.js), drawn along the aim in the player's own units: x -2..24.67, y -4..4
  weapons: { kind: 'weapons', size: 26.67, w: 160, h: 48, layers: ['handgun', 'scattergun', 'gauss', 'gauss-cap', 'plasma-musket', 'arc-carbine', 'soot-carbine', 'fouler', 'grease-thrower'] },
  // icons for the satchel and things on the ground (hn-rules/iconart.js): one per item where it has its own, else
  // its category's ('cat-' and the category)
  icons: { kind: 'icons', size: 12, w: 64, h: 64, layers: ['grenade', 'slime-grenade', 'egg-grenade', 'fuel-cell', 'fuel-cell-big', 'sprocket', 'health-charge', 'health-pak', 'anti-tox', 'cookies', 'hypno-tab', 'pickled-eggs', 'capacitor', 'cat-medical', 'cat-food', 'cat-salvage', 'cat-valuable', 'cat-component', 'cat-military', 'cat-access', 'cat-data', 'cat-junk', 'cat-information', 'cat-utility', 'cat-sample', 'cat-oddity', 'cat-collectible', 'cat-wonder'] },
  scavenger: { kind: 'player', size: 25.6, w: 64, h: 64, layers: ['torso', 'arms', 'hands', 'gear', 'hair', 'helmet', 'head-human', 'head-hyena', 'tail-hyena', 'head-mutant', 'chitin', 'quills', 'arm3'] },
});
// cracks, a split and shards for a piece that doesn't give its own: seeded by its id, inside its middle
function damageFor(id, w, h) {
  let seed = 0;
  for (const c of id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pt = (fx, fy) => [Math.round(w * (0.2 + 0.6 * fx)), Math.round(h * (0.2 + 0.6 * fy))];
  const zig = (n, x0, y0, x1, y1, jit) => {
    const ps = [];
    for (let i = 0; i <= n; i++) ps.push([Math.round(x0 + ((x1 - x0) * i) / n + (i && i < n ? (r() - 0.5) * jit : 0)), Math.round(y0 + ((y1 - y0) * i) / n + (i && i < n ? (r() - 0.5) * jit : 0))]);
    return 'M' + ps.map((p) => p.join(' ')).join(' L');
  };
  const cracks = [0, 1].map(() => {
    const [x, y] = pt(r(), r());
    return zig(3, x, y, x + (r() - 0.5) * w * 0.4, y + (r() * 0.5 + 0.2) * h * 0.4, Math.min(w, h) * 0.15);
  });
  const split = zig(5, Math.round(w * 0.15), Math.round(h * 0.05), Math.round(w * 0.85), Math.round(h * 0.95), Math.min(w, h) * 0.25);
  const shards = [[0.04, 0.9], [0.95, 0.85], [0.9, 0.06], [0.08, 0.15]].map(([fx, fy]) => [Math.round(w * fx), Math.round(h * fy)]);
  return { cracks, split, shards };
}
// each state's tone in PhotoCraft (Hue/Saturation on the piece's pixels, then grain)
const TONE = {
  working: { saturation: 0, lightness: 0, noise: 4 },
  damaged: { saturation: -25, lightness: -10, noise: 7 },
  disabled: { saturation: -65, lightness: -38, noise: 5 },
  destroyed: { saturation: -75, lightness: -52, noise: 10, colorize: true },
  hurt: { saturation: 40, lightness: -4, noise: 4, colorize: true, hue: 356 },
};

const roots = ['--automation-read-root', ROOT, '--automation-write-root', ROOT];
const run = (exe, args) => execFileSync(exe, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const P = (...a) => join(...a).replace(/\\/g, '/');

const manifest = existsSync(join(out, 'sprites.json')) ? JSON.parse(readFileSync(join(out, 'sprites.json'), 'utf8')) : {};
const only = process.argv.slice(2);
for (const [id, pc0] of Object.entries(PIECES)) {
  if (only.length && !only.includes(id)) continue;
  const pc = Object.assign(damageFor(id, pc0.w, pc0.h), pc0);
  const frames = [];
  const monster = pc.kind === 'monster';
  const states = monster ? FRAMES : pc.layers || STATES;
  for (const fr of states) {
    // a monster's frame is a pose of its vector, toned as one of the states; a set of layers (src/<id>/<layer>.svg)
    // is one frame per layer, all as they are
    const st = monster ? FRAME_TONE[fr] : pc.layers ? 'working' : fr;
    // (wrapped in one group, the pose's or none, so the inner shadow lands on the drawing and not its frame)
    const srcPath = P(build, id + '-' + fr + '.svg');
    const src = pc.layers ? P(here, 'src', id, fr + '.svg') : P(here, 'src', id + '.svg');
    writeFileSync(srcPath, posed(readFileSync(src, 'utf8'), pc.w, pc.h, monster ? POSE[fr] : {}));
    // 1. FigCraft: the vector, the state's geometry, texture, shadow
    const steps = [{ command: 'file.import', params: { path: srcPath, x: 0, y: 0 } }];
    steps.push({ command: 'effect.add', params: { ids: [3], type: 'innerShadow' } });
    const line = (d, colour, weight, parent = 2) => ({ command: 'node.create', params: { type: 'vector', parent, path: d, props: { fill: 'none', stroke: colour, strokeWeight: weight, strokeJoin: 'round', strokeCap: 'round' } } });
    if (st === 'damaged' || st === 'destroyed') for (const d of pc.cracks) steps.push(line(d, '#0a0608', st === 'destroyed' ? 2.2 : 1.4));
    if (st === 'destroyed') {
      steps.push(line(pc.split, '#000000', 4));
      steps.push(line(pc.split, '#ff7a2a', 1.2));
      if (!monster) for (const [x, y] of pc.shards) steps.push({ command: 'node.create', params: { type: 'polygon', parent: 2, x: x - 3, y: y - 3, width: 6, height: 5, props: { fill: '#2a2024', rotation: (x * 7 + y) % 90 } } });
    }
    const fig = P(build, id + '-' + fr + '.figcraft'), png = P(build, id + '-' + fr + '.png');
    writeFileSync(P(build, id + '-' + fr + '.json'), JSON.stringify(steps));
    run(FIG, ['run', P(build, id + '-' + fr + '.json'), '--out', fig, ...roots]);
    run(FIG, ['export', fig, '-o', png, '--format', 'png', '--scale', '1', ...roots]);
    // 2. PhotoCraft: tone and finish, on the piece's own pixels
    const t = TONE[st];
    const toned = P(build, id + '-' + fr + '-toned.png');
    const cmds = ['--cmd', 'layer.setProps', '--params', JSON.stringify({ locks: { transparency: true } })];
    if (t.saturation || t.lightness) cmds.push('--cmd', 'image.adjustments.hueSaturation', '--params', JSON.stringify(t.colorize ? { colorize: true, hue: t.hue != null ? t.hue : 20, saturation: t.hue != null ? t.saturation : 25, lightness: t.lightness } : { saturation: t.saturation, lightness: t.lightness }));
    cmds.push('--cmd', 'filter.noise.addNoise', '--params', JSON.stringify({ amount: t.noise, distribution: 'gaussian', monochromatic: true, seed: 7 }));
    cmds.push('--cmd', 'filter.sharpen.unsharpMask', '--params', JSON.stringify({ amount: 60, radius: 0.8, threshold: 2 }));
    run(PHOTO, ['run', png, ...cmds, '--out', toned]);
    frames.push(toned);
  }
  // 3. FigCraft: the sheet, the states left to right
  const steps = frames.map((f, i) => ({ command: 'file.import', params: { path: f, x: pc.w * i, y: 0 } }));
  // the four images framed together: the sheet
  steps.push({ command: 'object.frameSelection', params: { ids: frames.map((f, i) => 2 + i), name: id } });
  steps.push({ command: 'node.set', params: { ids: [2 + frames.length], fill: 'none' } });
  writeFileSync(P(build, id + '-sheet.json'), JSON.stringify(steps));
  const sheetFig = P(build, id + '-sheet.figcraft');
  run(FIG, ['run', P(build, id + '-sheet.json'), '--out', sheetFig, ...roots]);
  run(FIG, ['export', sheetFig, '-o', P(out, id + '.png'), '--format', 'png', '--scale', '1', '--node', id, ...roots]);
  manifest[id] = { file: id + '.png', w: pc.w, h: pc.h, states, names: pc.names || [] };
  if (pc.match) manifest[id].match = pc.match;
  // a monster: which enemies it draws, how big (world units across), and whether it turns to face its way
  if (monster) Object.assign(manifest[id], { kind: 'monster', enemies: pc.enemies, size: pc.size, turns: !!pc.turns });
  // a set of layers: what it's for, and how many world units its frame is across
  if (pc.layers) Object.assign(manifest[id], { kind: pc.kind, size: pc.size });
  console.log('made ' + id + '.png (' + states.length + ' frames, ' + pc.w + '×' + pc.h + ')');
}
writeFileSync(join(out, 'sprites.json'), JSON.stringify(manifest, null, 2) + '\n');
// and for the game: the sheets as data URLs, so the pack carries them wherever it's served from
const js = Object.fromEntries(Object.entries(manifest).map(([id, m]) => [id, Object.assign({}, m, { src: 'data:image/png;base64,' + readFileSync(join(out, m.file)).toString('base64') })]));
writeFileSync(join(out, 'sprites.js'), "/* HaveNot art: sprite sheets for library pieces. GENERATED by games/havenot/art/build-sprites.mjs from src/*.svg; don't edit. */\n(window.LM.HN.ART = window.LM.HN.ART || {}), Object.assign(window.LM.HN.ART, " + JSON.stringify(js) + ');\n');
