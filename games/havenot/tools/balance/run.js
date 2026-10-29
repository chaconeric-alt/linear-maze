// HaveNot balance runs: node run.js jobs.json out.json [pages]
// Every job is fought `trials` times in a small arena, in the real engine, by a scripted player (page.js).
// Make job lists with mkjobs.py. Needs Playwright with Chromium (NODE_PATH pointing at it).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const GAME = 'file://' + path.resolve(__dirname, '../../../../engine/index.html') + '?game=havenot';
const [, , jobsFile, outFile, nPagesArg] = process.argv;
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
const NP = +nPagesArg || 4;
(async () => {
  const b = await chromium.launch();
  const queue = [];
  jobs.forEach((j, ji) => { for (let i = 0; i < j.trials; i++) queue.push({ ji, j }); });
  const results = jobs.map(() => []);
  const errs = [];
  let done = 0;
  const t0 = Date.now();
  async function worker(k) {
    const p = await b.newPage();
    p.on('pageerror', (e) => errs.push(String(e.stack || e).slice(0, 300)));
    await p.goto(GAME);
    await p.waitForFunction(() => window.LM && LM.game, null, { timeout: 30000 });
    await p.evaluate(() => LM.game.newRun());
    await p.waitForTimeout(800);
    await p.addScriptTag({ path: path.join(__dirname, 'page.js') });
    await p.evaluate(() => SIM.setup());
    while (queue.length) {
      const { ji, j } = queue.shift();
      try {
        const r = await p.evaluate((job) => SIM.run(job), j);
        results[ji].push(r);
      } catch (e) { errs.push(String(e).slice(0, 300)); }
      done++;
      if (done % 50 === 0) process.stderr.write(done + ' trials, ' + ((Date.now() - t0) / 1000).toFixed(0) + 's\n');
    }
  }
  await Promise.all(Array.from({ length: NP }, (_, k) => worker(k)));
  const summary = jobs.map((j, i) => {
    const rs = results[i];
    const n = rs.length || 1;
    const wins = rs.filter((r) => r.win);
    return {
      name: j.name, n: rs.length,
      win: +(wins.length / n).toFixed(2), died: +(rs.filter((r) => r.died).length / n).toFixed(2), timeout: +(rs.filter((r) => r.timeout).length / n).toFixed(2),
      tWin: wins.length ? +(wins.reduce((a, r) => a + r.t, 0) / wins.length).toFixed(1) : null,
      bossHp: rs.some((r) => r.bossHp != null) ? +(rs.reduce((a, r) => a + (r.bossHp || 0), 0) / n).toFixed(2) : undefined,
      tAll: +(rs.reduce((a, r) => a + r.t, 0) / n).toFixed(1),
      hpLeft: wins.length ? +(wins.reduce((a, r) => a + r.hp, 0) / wins.length).toFixed(2) : 0,
    };
  });
  fs.writeFileSync(outFile, JSON.stringify({ summary, errs: errs.slice(0, 20) }, null, 1));
  console.log(summary.map((s) => [s.name.padEnd(46), 'win', s.win, 'died', s.died, 'to', s.timeout, 'tWin', s.tWin, 'hp', s.hpLeft, s.bossHp != null ? 'bossHp ' + s.bossHp + ' tAll ' + s.tAll : ''].join(' ')).join('\n'));
  if (errs.length) console.log('ERRS', errs.slice(0, 5));
  await b.close();
})();
