// Navigation by body size (engine SPEC 6.26): the clearance map, the fields for big bodies, and what a big body
// does when it can't get through. Runs the engine's nav (engine/level.js) on small hand-made floors.
//   node tools/nav-tests.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, performance: { now: () => Date.now() } };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['engine/core.js', 'engine/level.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const LM = ctx.LM, NAV = LM.nav, T = LM.TILE;

let pass = 0, fail = 0;
const ok = (c, msg) => {
  if (c) pass++;
  else {
    fail++;
    console.log('FAIL ' + msg);
  }
};

// a floor from rows: '#' wall, '.' floor, '+' door, '~' hazard
function floor(rows) {
  const h = rows.length, w = rows[0].length, n = w * h;
  const WALL = { solid: true }, FLOOR = {}, HAZ = { hazard: true };
  const L = {
    w, h, n, terrain: new Array(n), doorAt: new Array(n), navBlock: null,
    inBounds: (x, y) => x >= 0 && y >= 0 && x < w && y < h,
  };
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    L.terrain[y * w + x] = c === '#' ? WALL : c === '~' ? HAZ : FLOOR;
    if (c === '+') L.doorAt[y * w + x] = { blocking: true };
  }));
  NAV.init(L);
  return L;
}
const at = (x, y) => x * T + T / 2;
const field = (L, k, x, y) => NAV.fieldFor(L, k)[y * L.w + x];

// two rooms, a one-tile door between
const A = [
  '################',
  '#......#.......#',
  '#......#.......#',
  '#......#.......#',
  '#......+.......#',
  '#......#.......#',
  '#......#.......#',
  '################',
];
{
  const L = floor(A);
  NAV.compute(L, 11, 4);
  const C = NAV.clearFor(L);
  ok(C[4 * L.w + 7] === 1, 'a one-tile door has clearance 1');
  ok(C[1 * L.w + 1] >= 2 && C[3 * L.w + 3] === 4, 'room floor has room');
  ok(C[0] === 0, 'wall has none');
  ok(NAV.sizeOf({ r: 10 }) === 1 && NAV.sizeOf({ r: 16 }) === 1, 'up to radius 16 is class 1');
  ok(NAV.sizeOf({ r: 17 }) === 2 && NAV.sizeOf({ r: 22 }) === 2 && NAV.sizeOf({ r: 40 }) === 3, 'bigger bodies, bigger classes');
  ok(L.navDist[4 * L.w + 3] > 0, 'class 1 gets through the door');
  ok(NAV.dir(L, at(3), at(4)) !== null, 'class 1 has a way');
  ok(field(L, 2, 3, 4) === -1, 'class 2 has no way through a one-tile door');
  ok(NAV.dir(L, at(3), at(4), 2) === null, 'so no direction on its field');
  // it goes as close as it fits, then stops
  let x = at(2), y = at(4), steps = 0, d;
  while ((d = NAV.toward(L, x, y, 2)) && steps < 50) {
    const tx = Math.floor(x / T) , ty = Math.floor(y / T);
    // step a tile along it
    x = (tx + Math.round(d.x)) * T + T / 2;
    y = (ty + Math.round(d.y)) * T + T / 2;
    steps++;
  }
  ok(steps < 50 && Math.floor(x / T) === 6 && Math.floor(y / T) >= 3 && Math.floor(y / T) <= 5, 'it waits by the door (got ' + Math.floor(x / T) + ',' + Math.floor(y / T) + ')');
  ok(!NAV.wideLine(L, at(3), at(4), at(11), at(4), 2), 'the straight way through the door is too narrow');
  ok(NAV.wideLine(L, at(1), at(1), at(5), at(5), 2), 'across a room is wide enough');
  ok(NAV.step(L, at(3), at(4), at(11), at(4), 40, 2) === null, 'a search by size finds no way');
  ok(NAV.step(L, at(3), at(4), at(11), at(4), 40) !== null, 'a search for class 1 does');
}
// the same with a gap two tiles wide further up: the big body goes round by it
{
  const B = A.map((r, y) => (y === 1 || y === 2 ? r.slice(0, 7) + '.' + r.slice(8) : r));
  const L = floor(B);
  NAV.compute(L, 11, 4);
  ok(field(L, 2, 3, 4) > 0, 'class 2 has a way by the wide gap');
  // follow its field across: it crosses the wall's line by the gap, not the door
  let tx = 3, ty = 4, n = 0;
  while (tx < 7 && n++ < 20) {
    const d = NAV.dir(L, at(tx), at(ty), 2);
    if (!d) break;
    tx += Math.round(d.x);
    ty += Math.round(d.y);
  }
  ok(tx === 7 && ty <= 2, 'and goes by it, not the door (crossed at ' + tx + ',' + ty + ')');
  const d1 = NAV.dir(L, at(3), at(4));
  ok(d1 && Math.abs(d1.y) < 0.01 && d1.x > 0, 'class 1 still goes straight for the door');
}
// solid furniture closes a gap; terrain changes are seen
{
  const L = floor(A.map((r, y) => (y === 1 || y === 2 ? r.slice(0, 7) + '.' + r.slice(8) : r)));
  const game = { items: [{ x: at(7), y: at(1), r: 12, def: { solid: true } }] };
  NAV.compute(L, 11, 4);
  NAV.clearance(L, game);
  ok(L.navClear[1 * L.w + 7] === 0, 'a solid crate takes its tile');
  ok(field(L, 2, 3, 4) === -1, 'and closes the wide gap for a big body');
  game.items[0].dead = true;
  NAV.checkClearance(L, game);
  NAV.compute(L, 11, 4);
  ok(L.navClearDirty && field(L, 2, 3, 4) > 0, 'the crate gone, the gap is open again');
  L.terrain[1 * L.w + 7] = { solid: true };
  L.navClearDirty = true;
  NAV.compute(L, 11, 4);
  ok(field(L, 2, 3, 4) === -1, 'a wall built there closes it');
}
// a hazard is no floor to stand on
{
  const L = floor(['#######', '#.....#', '#.~~~.#', '#.....#', '#######']);
  ok(NAV.clearFor(L)[2 * L.w + 2] === 0, 'hazard tiles have no clearance');
}

console.log(fail ? fail + ' failed, ' + pass + ' passed.' : 'All ' + pass + ' passed.');
process.exit(fail ? 1 : 0);
