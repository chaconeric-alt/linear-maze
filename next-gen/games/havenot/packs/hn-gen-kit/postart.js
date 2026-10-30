/* HaveNot — packs/hn-gen-kit/postart.js
 * What you see when you read a poster or watch an ad: the illustrated poster or the ad on the screen
 * (games/havenot/art, the 'posters' and 'ads' layers) over what it says. A poster's picture is chosen by its title
 * (or, for the Greasy Bolt Hole's, its kind): corporate cheer (SYNERGY, OBEDIENCE IS A SKILL, HUSTLE, safety
 * trophies), the watching eye, WANT MORE, Enoch the Greasy, Her Serene Ovoidness, the grease banner. A notice that
 * matches none of them (STAIRWELL ACCESS, PEST CONTROL) reads as before, words only. An ad screen shows its ad;
 * a dark one shows nothing but your reflection, as before.
 */
'use strict';
(function () {
  const LM = window.LM, HN = LM.HN;
  const h = (...a) => LM.ui.h(...a);
  // title words → picture, first match wins
  const BY_TITLE = [
    [/enoch|filth|grease|greas|warlord|fouling/i, 'enoch'],
    [/egg|ovoid/i, 'egg'],
    [/enlist|drip/i, 'slogan'],
    [/watch|eye|listening|loose lips/i, 'watched'],
    [/obedien|ask not|report for duty|hugged|manager/i, 'obedience'],
    [/hustle|burn|fit worker|productive|lift with/i, 'hustle'],
    [/safety|incident|spill|emergency|wash your|badge/i, 'safety'],
    [/want more|be more|victory|fleet/i, 'want-more'],
    [/synergy|coffee|welcome|benefit|valued/i, 'synergy'],
  ];
  const ADS = ['fizz', 'hypno', 'tired', 'vert', 'noticed'];
  const urls = new Map();
  function frameUrl(sheet, name) {
    const a = HN.artSheet && HN.artSheet(sheet);
    if (!a) return null;
    const i = a.states.indexOf(name);
    if (i < 0) return null;
    const key = sheet + ':' + name;
    if (!urls.has(key)) {
      const c = document.createElement('canvas');
      c.width = a.w;
      c.height = a.h;
      c.getContext('2d').drawImage(a.img, i * a.w, 0, a.w, a.h, 0, 0, a.w, a.h);
      urls.set(key, c.toDataURL());
    }
    return urls.get(key);
  }
  HN.posterFor = function (title, kind) {
    for (const [re, name] of BY_TITLE) if (re.test(title || '')) return name;
    return { enoch: 'enoch', egg: 'egg', slogan: 'slogan' }[kind] || null;
  };
  /** The text panel, with a picture over the words when there is one (else just the words, as LM.ui.showText). */
  function showWithPicture(url, wide, title, text, kicker) {
    if (!url) return LM.ui.showText(title, text, kicker);
    LM.ui.open({
      kicker, title,
      body: h('div', { class: 'hn-poster-view' + (wide ? ' wide' : '') },
        h('div', { class: 'pic', style: 'background-image:url("' + url + '")' }),
        String(text || '').split('\n\n').map((p) => h('p', { class: 'lore' }, p))),
      actions: [{ label: 'Close', primary: true, key: 'E' }],
    });
  }

  let wrapped = false;
  function wrap() {
    if (wrapped) return;
    wrapped = true;
    // start the pictures loading now, so the first poster you read has its picture
    for (const id of ['posters', 'ads', 'places']) if (HN.artSheet) HN.artSheet(id);
    const poster = LM.find('items', 'hn-poster');
    if (poster && poster.interact) {
      const own = poster.interact.use;
      poster.interact.use = function (it, game) {
        const name = HN.posterFor(it.props.title || 'SYNERGY');
        const url = name && frameUrl('posters', name);
        if (!url) return own.call(this, it, game);
        showWithPicture(url, false, it.props.title || 'SYNERGY', it.props.text || 'A smiling worker shakes hands with a robot. Someone has drawn teeth on the robot.', 'Poster');
      };
    }
    const gposter = LM.find('items', 'hn-gposter');
    if (gposter && gposter.interact) {
      const own = gposter.interact.use;
      gposter.interact.use = function (it, game) {
        const kind = it.props.kind || 'enoch';
        const url = frameUrl('posters', HN.posterFor(it.props.title, kind) || 'enoch');
        if (!url) return own.call(this, it, game);
        showWithPicture(url, false, it.props.title || 'ENOCH THE GREASY', it.props.text || 'Enoch the Greasy in his foul battle armor, dripping. Under him: FILTH IS STRENGTH.', ({ enoch: 'Propaganda', egg: 'Eggbot sigil', slogan: 'Banner' })[kind]);
      };
    }
    const ad = LM.find('items', 'hn-ad-screen');
    if (ad && ad.interact) {
      const own = ad.interact.use;
      ad.interact.use = function (it, game) {
        const url = !HN.flag(game, 'hnAdsSilent') && frameUrl('ads', ADS[(it.props.ad || 0) % ADS.length]);
        if (!url) return own.call(this, it, game);
        // the words are the screen's own (hn-rules/fixtures.js); the picture goes over them
        const real = LM.ui.showText;
        LM.ui.showText = (title, text, kicker) => showWithPicture(url, true, title, text, kicker);
        try {
          own.call(this, it, game);
        } finally {
          LM.ui.showText = real;
        }
      };
    }
  }
  HN.wrapPosterArt = wrap;
  LM.on('levelLoaded', wrap);

  const css = document.createElement('style');
  css.textContent = `
    .hn-poster-view .pic { width: min(240px, 60%); aspect-ratio: 200 / 280; margin: 0 auto 12px; background: #1a140e center/contain no-repeat; box-shadow: 0 6px 24px rgba(0,0,0,0.6); }
    .hn-poster-view.wide .pic { width: min(420px, 90%); aspect-ratio: 320 / 180; border: 3px solid #14181c; border-radius: 4px; }
  `;
  document.head.appendChild(css);
})();
