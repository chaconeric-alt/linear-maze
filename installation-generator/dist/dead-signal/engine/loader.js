/* The Linear Maze engine — engine/loader.js
 * Loads a game: its manifest (games/<id>/game.js), the asset packs it lists, then the
 * editor's saved changes, and starts it. engine/index.html loads this last.
 *
 *   engine/index.html?game=linear-maze    play that game
 *   engine/index.html                     play the first game in games/games.js
 *
 * The script tag's data-root is the folder holding engine/ and games/, relative to the page
 * (".." for engine/index.html; "." for the index.html at the top of a packaged game), and
 * data-game picks the game when there is no ?game= in the address.
 */
'use strict';
(function () {
  const LM = window.LM;
  const MF = LM.manifest;
  const me = document.currentScript;
  const root = String((me && me.dataset.root) || '..').replace(/\/+$/, '');
  const url = (path) => (root === '.' || root === '' ? '' : root + '/') + path;

  function addScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false; // scripts added together still run in the order they were added
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }
  function fail(text) {
    const el = document.getElementById('err');
    if (el) {
      el.hidden = false;
      el.textContent = text;
    }
    console.error('[LM loader] ' + text);
  }

  // pack.js files describe themselves; the loader knows which folder each came from
  const packInfo = {};
  LM.describePack = function (info) {
    const src = (document.currentScript && document.currentScript.getAttribute('src')) || '';
    const m = /games\/([^/]+)\/packs\/([^/]+)\/pack\.js$/.exec(src);
    if (m) packInfo[m[1] + '/' + m[2]] = info || {};
  };
  const host = {
    async game(id) {
      if (!LM.games[id] && !(await addScript(url('games/' + id + '/game.js')))) throw new Error('games/' + id + '/game.js is missing');
      if (!LM.games[id]) throw new Error('games/' + id + '/game.js doesn’t call LM.defineGame({ id: "' + id + '", ... })');
      return LM.games[id];
    },
    async pack(game, pack) {
      const key = game + '/' + pack;
      if (!packInfo[key] && !(await addScript(url(MF.packDir(game, pack) + 'pack.js')))) throw new Error('missing');
      if (!packInfo[key]) throw new Error('pack.js doesn’t call LM.describePack');
      return packInfo[key];
    },
  };

  async function run() {
    let id = new URLSearchParams(location.search).get('game') || (me && me.dataset.game) || '';
    if (!id) {
      await addScript(url('games/games.js'));
      id = (LM.gameList || [])[0];
      if (!id) return fail('No game to play: games/games.js doesn’t list any. Open this page as engine/index.html?game=<folder name>.');
    }
    let plan;
    try {
      plan = await MF.plan(id, host);
    } catch (e) {
      return fail('Couldn’t load the game “' + id + '”: ' + e.message);
    }
    for (const p of plan.problems) console.warn('[LM loader] ' + p);
    const required = plan.scripts.concat(plan.runtime ? [plan.runtime] : []);
    const results = await Promise.all(required.concat(plan.editor).map((p) => addScript(url(p))));
    const missing = required.filter((p, i) => !results[i]);
    // a game that has never been saved in the editor has no editor files yet; that's fine
    LM.loaded = plan;
    if (missing.length) return fail('Missing ' + missing.length + ' file' + (missing.length > 1 ? 's' : '') + ': ' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? '…' : ''));
    try {
      LM.start(id);
    } catch (e) {
      fail(e.message);
      throw e;
    }
  }
  run();
})();
