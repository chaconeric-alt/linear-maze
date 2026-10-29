// HaveNot balance runs in an open game page (no Playwright): load it after the game, then
//   SIMRUN.start(jobsUrl, part, parts)  runs every trial of jobs part, part+parts, ... and SIMRUN.out has the results.
// run.js summarises the same way; SIMRUN.summary() gives that summary here.
(function () {
  const R = (window.SIMRUN = { out: {}, done: 0, total: 0, errs: [], finished: false, base: '/games/havenot/tools/balance/' });
  const ch = new MessageChannel();
  const q = [];
  ch.port1.onmessage = () => q.shift()();
  const tick = () => new Promise((res) => { q.push(res); ch.port2.postMessage(0); });
  R.start = async function (url, part, parts) {
    const jobs = (await (await fetch(url)).json()).filter((j, i) => i % parts === part);
    LM.game.newRun();
    await new Promise((r) => setTimeout(r, 800));
    await new Promise((res) => { const s = document.createElement('script'); s.src = R.base + 'page.js?' + Date.now(); s.onload = res; document.head.appendChild(s); });
    SIM.setup();
    R.total = jobs.reduce((a, j) => a + j.trials, 0);
    for (const j of jobs) {
      R.out[j.name] = [];
      for (let i = 0; i < j.trials; i++) {
        try { R.out[j.name].push(SIM.run(j)); } catch (e) { R.errs.push(String(e).slice(0, 200)); }
        R.done++;
        await tick();
      }
    }
    R.finished = true;
  };
  R.summary = () => Object.entries(R.out).map(([name, rs]) => {
    const n = rs.length || 1, wins = rs.filter((r) => r.win);
    return { name, n: rs.length, win: +(wins.length / n).toFixed(2), hpLeft: wins.length ? +(wins.reduce((a, r) => a + r.hp, 0) / wins.length).toFixed(2) : 0, tWin: wins.length ? +(wins.reduce((a, r) => a + r.t, 0) / wins.length).toFixed(1) : null };
  });
})();
