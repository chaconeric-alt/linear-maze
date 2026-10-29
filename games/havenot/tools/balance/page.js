// HaveNot balance runs, inside the game page: window.SIM.run(job) -> result.
// Stops the real loop and drives game.update by hand, 30 times a game second, with a scripted player who aims late
// and a little wide (job.aimErr radians, job.lag seconds, job.leadSkill), kites to a range that suits the weapon,
// strafes, now and then stops minding their feet (job.careless), and dashes out of a pile-up (job.dashSkill).
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, HN = LM.HN;
  const W = 28, H = 20;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) {
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      const pillar = ((x >= 9 && x <= 10) || (x >= 17 && x <= 18)) && ((y >= 4 && y <= 5) || (y >= 14 && y <= 15));
      r += edge || pillar ? '#' : '.';
    }
    rows.push(r);
  }
  const mkLevel = (threat) => ({
    name: 'Sim arena', environment: 'hn-greasy-bunker', hn: { place: 'Sim', threat }, stairsUp: false,
    map: rows, objects: rows.map((r, y) => (y === 10 ? '   @' + ' '.repeat(W - 4) : ' '.repeat(W))), objectLegend: { '@': { start: true } },
  });
  const levels = {};
  for (let t = 0; t <= 4; t++) levels['sim-' + t] = mkLevel(t);
  LM.definePack({ id: 'sim', levels });

  const SIM = (window.SIM = {});
  const I = LM.input;
  let aimX = 0, aimY = 0;
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.5; }

  SIM.setup = function () {
    const g = LM.game;
    g.renderer.screenToWorld = () => ({ x: aimX, y: aimY });
    // freeze the real loop: from here on only SIM drives the game
    window.requestAnimationFrame = () => 0;
    g.playerDied = function () { SIM.died = true; };
    LM.audio.play = () => {};
  };

  const PREF = { 'hn-scattergun': 105, 'hn-fouler': 110, 'hn-grease-thrower': 135, 'hn-handgun': 230, 'hn-gauss': 300, 'hn-soot-carbine': 240, 'hn-plasma-musket': 300, 'hn-arc-carbine': 260 };
  const REACH = { 'hn-scattergun': 230, 'hn-fouler': 240, 'hn-grease-thrower': 220 };

  SIM.run = function (job) {
    const g = LM.game;
    LM.ui.close && LM.ui.close();
    // fresh character every trial
    const s = HN.st(g);
    const P0 = g.player;
    P0.weapons = []; P0.equip = {}; P0.bag = []; P0.statuses = []; P0.buffs = [];
    HN.createCharacter(g, { name: 'Sim', origin: job.origin, gear: job.gear, kit: job.kit || 'hack', mutations: job.mutations || [], seed: 1, noRuins: true });
    if (job.weapons) { P0.weapons = job.weapons.slice(); P0.weaponIdx = 0; }
    if (job.armor) { P0.equip = {}; for (const a of job.armor) P0.equipArmor(a); }
    if (job.ammo) Object.assign(P0.ammo, job.ammo);
    s.level = job.level || 1;
    // improvements picked on the way up: { id: count }
    s.boons = Object.assign({}, job.boons || {});
    for (const [id, n] of Object.entries(s.boons)) for (let i = 0; i < n; i++) if (HN.IMPROVEMENTS[id].apply) HN.IMPROVEMENTS[id].apply(s);
    s.kitLeft = HN.kitFor(s);
    if (s.kitLeft.med && !P0.gadgets.includes('hn-medkit')) P0.gadgets.push('hn-medkit');
    P0.statsDirty = true;
    g.loadLevel('sim-' + job.threat, P0.serialize(), false, {});
    g.state = 'play';
    // run the level load timers
    for (let i = 0; i < 5; i++) { g.update(1 / 60, 1 / 60); I.endFrame(); }
    LM.ui.close && LM.ui.close();
    const P = g.player;
    P.x = 4.5 * T; P.y = 10.5 * T; P.vx = P.vy = 0; P.dead = false; P.statuses = [];
    P.statsDirty = true;
    P.hp = P.stats().maxHp;
    P.mags = {};
    for (const id of P.weapons) { const w = LM.get('weapons', id); if (w.magazine) P.mags[id] = w.magazine; }
    for (const e of g.enemies) e.dead = true;
    g.enemies = [];
    g.timers = [];
    SIM.died = false;
    // spawn the group in the east half; job.waves: more groups, each when the last is down (a floor's fights
    // back to back, with no rest between)
    const spawned = [];
    const waves = (job.waves || []).slice();
    const spawnGroup = (group) => group.forEach((id, i) => {
      const x = (19 + (i % 3) * 2.2 + Math.random()) * T, y = (6 + Math.floor(i / 3) * 3.2 + Math.random() * 2) * T;
      const e = g.spawnEnemy(id, x, y, job.hpMul ? { aggro: true, hpMul: job.hpMul } : { aggro: true });
      if (e) { e.aggro = true; spawned.push(e); }
    });
    spawnGroup(job.group);
    // the princess needs waking
    for (const e of spawned) if (e.def.id === 'hn-princess') { e.mem.awake = true; e.mem.mood = 'regal'; }
    const maxHp = P.stats().maxHp;
    const w0 = P.currentWeapon();
    const pref = PREF[w0.id] || 220, reach = REACH[w0.id] || (w0.range || 700) * 0.85;
    const dt = 1 / 30;
    let t = 0, strafe = 1, strafeT = 0, dmgDealt = 0, idleT = 0, careless = false, carelessT = 0;
    const hist = new Map();
    const hurt0 = g.stats.damageTaken;
    const L = g.level;
    const solid = (x, y) => L.solidAt(Math.floor(x / T), Math.floor(y / T));
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    while (t < job.maxT) {
      let alive = g.enemies.filter((e) => !e.dead && !(e.def.id === 'hn-cocoon'));
      if (!alive.length && waves.length && !SIM.died) {
        spawnGroup(waves.shift());
        alive = g.enemies.filter((e) => !e.dead && !(e.def.id === 'hn-cocoon'));
      }
      if (!alive.length || SIM.died) break;
      // target: nearest visible
      let best = null, bd = 1e9;
      for (const e of alive) {
        const d = Math.hypot(e.x - P.x, e.y - P.y);
        const vis = LM.physics.los(L, P.x, P.y, e.x, e.y, 'shot');
        const score = d + (vis ? 0 : 400);
        if (score < bd) { bd = score; best = e; }
      }
      const e = best;
      const d = Math.hypot(e.x - P.x, e.y - P.y);
      const los = LM.physics.los(L, P.x, P.y, e.x, e.y, 'shot');
      const w = P.currentWeapon();
      const sp = w.speed || 900;
      const lead = d / sp;
      // the hand lags the eye: aim where the target was job.lag seconds ago
      const hh = hist.get(e) || [];
      hh.push([e.x, e.y, e.vx || 0, e.vy || 0]);
      if (hh.length > 40) hh.shift();
      hist.set(e, hh);
      const old = hh[Math.max(0, hh.length - 1 - Math.round(job.lag / dt))];
      const ang = Math.atan2(old[1] + old[3] * lead * job.leadSkill - P.y, old[0] + old[2] * lead * job.leadSkill - P.x) + gauss() * job.aimErr;
      aimX = P.x + Math.cos(ang) * d;
      aimY = P.y + Math.sin(ang) * d;
      I.mouse.down = los && d < reach;
      // movement: pick the best of 8 directions
      strafeT -= dt;
      if (strafeT <= 0) { strafe = -strafe; strafeT = U.rand(1, 2.2); }
      let bestDir = null, bs = -1e9;
      const toE = Math.atan2(e.y - P.y, e.x - P.x);
      for (let k = 0; k < 9; k++) {
        const a = k * Math.PI / 4, still = k === 8;
        const dx = still ? 0 : Math.cos(a), dy = still ? 0 : Math.sin(a);
        const nx = P.x + dx * 40, ny = P.y + dy * 40;
        if (!still && (solid(nx, ny) || solid(P.x + dx * 20, P.y + dy * 20))) continue;
        const nd = Math.hypot(e.x - nx, e.y - ny);
        let sc = -Math.abs(nd - pref) * 1.0;
        // strafe around the target
        if (!still) sc += 18 * Math.cos(a - (toE + strafe * Math.PI / 2));
        // keep away from everyone that bites
        for (const o of alive) { const od = Math.hypot(o.x - nx, o.y - ny); if (od < 90) sc -= (90 - od) * 1.2; }
        // walls are bad to back into
        if (!still && solid(P.x + dx * 70, P.y + dy * 70)) sc -= 25;
        if (sc > bs) { bs = sc; bestDir = [dx, dy]; }
      }
      // now and then a player stops minding their feet for a moment
      carelessT -= dt;
      if (carelessT <= 0) { careless = Math.random() < job.careless; carelessT = U.rand(0.6, 1.4); }
      if (careless) bestDir = Math.random() < 0.5 ? null : [Math.cos(toE), Math.sin(toE)];
      for (const k of keys) I.keys.delete(k);
      if (bestDir) {
        if (bestDir[0] > 0.3) I.keys.add('KeyD'); else if (bestDir[0] < -0.3) I.keys.add('KeyA');
        if (bestDir[1] > 0.3) I.keys.add('KeyS'); else if (bestDir[1] < -0.3) I.keys.add('KeyW');
      }
      // dash out of a pile-up
      const close = alive.filter((o) => Math.hypot(o.x - P.x, o.y - P.y) < 42).length;
      if (close && P.dashCd <= 0 && Math.random() < job.dashSkill) I.pressed.add('Space');
      // a med-kit charge when it gets bad, and a swing at anything in reach
      if (s.kitLeft.med > 0 && P.hp < P.stats().maxHp * 0.35) LM.get('gadgets', 'hn-medkit').use(g, P);
      if (job.melee !== false && Math.hypot(best.x - P.x, best.y - P.y) < 34 + best.r) HN.melee(g, P);
      const hp0 = alive.reduce((a, o) => a + o.hp, 0);
      g.update(dt, dt);
      I.endFrame();
      dmgDealt += Math.max(0, hp0 - g.enemies.filter((o) => !o.dead).reduce((a, o) => a + o.hp, 0));
      t += dt;
    }
    I.mouse.down = false;
    for (const k of keys) I.keys.delete(k);
    const left = g.enemies.filter((o) => !o.dead && o.def.id !== 'hn-cocoon').length;
    const boss = spawned.find((o) => o.def.boss);
    return { bossHp: boss ? Math.max(0, boss.hp) / boss.maxHp : null, field: boss ? Math.round(boss.mem.field || 0) : null, win: !SIM.died && left === 0, died: SIM.died, timeout: !SIM.died && left > 0, t: +t.toFixed(1), hp: Math.max(0, P.hp) / maxHp, taken: Math.round(g.stats.damageTaken - hurt0), left };
  };
})();
