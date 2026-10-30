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
// each state's tone in PhotoCraft (Hue/Saturation on the piece's pixels, then grain)
const TONE = {
  working: { saturation: 0, lightness: 0, noise: 4 },
  damaged: { saturation: -25, lightness: -10, noise: 7 },
  disabled: { saturation: -65, lightness: -38, noise: 5 },
  destroyed: { saturation: -75, lightness: -52, noise: 10, colorize: true },
};

const roots = ['--automation-read-root', ROOT, '--automation-write-root', ROOT];
const run = (exe, args) => execFileSync(exe, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const P = (...a) => join(...a).replace(/\\/g, '/');

const manifest = existsSync(join(out, 'sprites.json')) ? JSON.parse(readFileSync(join(out, 'sprites.json'), 'utf8')) : {};
for (const [id, pc] of Object.entries(PIECES)) {
  const frames = [];
  for (const st of STATES) {
    // 1. FigCraft: the vector, the state's geometry, texture, shadow
    const steps = [{ command: 'file.import', params: { path: P(here, 'src', id + '.svg'), x: 0, y: 0 } }];
    steps.push({ command: 'effect.add', params: { ids: [2], type: 'innerShadow' } });
    const line = (d, colour, weight, parent = 2) => ({ command: 'node.create', params: { type: 'vector', parent, path: d, props: { fill: 'none', stroke: colour, strokeWeight: weight, strokeJoin: 'round', strokeCap: 'round' } } });
    if (st === 'damaged' || st === 'destroyed') for (const d of pc.cracks) steps.push(line(d, '#0a0608', st === 'destroyed' ? 2.2 : 1.4));
    if (st === 'destroyed') {
      steps.push(line(pc.split, '#000000', 4));
      steps.push(line(pc.split, '#ff7a2a', 1.2));
      for (const [x, y] of pc.shards) steps.push({ command: 'node.create', params: { type: 'polygon', parent: 2, x: x - 3, y: y - 3, width: 6, height: 5, props: { fill: '#2a2024', rotation: (x * 7 + y) % 90 } } });
    }
    const fig = P(build, id + '-' + st + '.figcraft'), png = P(build, id + '-' + st + '.png');
    writeFileSync(P(build, id + '-' + st + '.json'), JSON.stringify(steps));
    run(FIG, ['run', P(build, id + '-' + st + '.json'), '--out', fig, ...roots]);
    run(FIG, ['export', fig, '-o', png, '--format', 'png', '--scale', '1', ...roots]);
    // 2. PhotoCraft: tone and finish, on the piece's own pixels
    const t = TONE[st];
    const toned = P(build, id + '-' + st + '-toned.png');
    const cmds = ['--cmd', 'layer.setProps', '--params', JSON.stringify({ locks: { transparency: true } })];
    if (t.saturation || t.lightness) cmds.push('--cmd', 'image.adjustments.hueSaturation', '--params', JSON.stringify(t.colorize ? { colorize: true, hue: 20, saturation: 25, lightness: t.lightness } : { saturation: t.saturation, lightness: t.lightness }));
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
  manifest[id] = { file: id + '.png', w: pc.w, h: pc.h, states: STATES, names: pc.names };
  console.log('made ' + id + '.png (' + STATES.length + ' states, ' + pc.w + '×' + pc.h + ')');
}
writeFileSync(join(out, 'sprites.json'), JSON.stringify(manifest, null, 2) + '\n');
// and for the game: the sheets as data URLs, so the pack carries them wherever it's served from
const js = Object.fromEntries(Object.entries(manifest).map(([id, m]) => [id, Object.assign({}, m, { src: 'data:image/png;base64,' + readFileSync(join(out, m.file)).toString('base64') })]));
writeFileSync(join(out, 'sprites.js'), "/* HaveNot art: sprite sheets for library pieces. GENERATED by games/havenot/art/build-sprites.mjs from src/*.svg; don't edit. */\n(window.LM.HN.ART = window.LM.HN.ART || {}), Object.assign(window.LM.HN.ART, " + JSON.stringify(js) + ');\n');
