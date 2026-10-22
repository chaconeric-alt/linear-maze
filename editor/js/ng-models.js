/* Linear Maze Editor — js/ng-models.js
 * 3D models to sprite sheets. A .glb file (with or without animations) is drawn from every direction
 * the game needs, frame by frame, through a camera tilted like a next-generation floor's, and packed
 * into one picture: a sheet the engine plays back (engine/nextgen-sheets.js) for a monster, an item or
 * a person, turning to face where it goes and switching animation as it idles, moves, attacks, is hurt
 * and dies.
 *
 *   ED.ngModels.open({ done(id) })      the importer (a dialog)
 *   ED.ngModels.list()                  [{ id, name, look, ... }] every sheet in this game
 *   ED.ngModels.lookFor(id)             a look for it: { type: 'sheet', sprite: id, ... }
 *   ED.ngModels.lookPanel(kind, id, d, changed)   the Look tab's controls for a sheet look
 *
 * Sheets are kept as pictures (editor/sprites.js) with their layout in the edit set's `sheets`
 * (editor/edits.js), so a thing's look and the sheet's own record agree. three.js and its glTF
 * loader come from a CDN the first time the importer opens, so that needs an internet connection.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, M = () => ED.model;
  const NM = (ED.ngModels = {});

  const URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js',
  ];
  const DRACO = 'https://www.gstatic.com/draco/versioned/decoders/1.4.1/';
  let threeP = null;
  NM.loadThree = function () {
    if (window.THREE && window.THREE.GLTFLoader) return Promise.resolve(window.THREE);
    if (threeP) return threeP;
    const add = (src) => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Couldn’t load ' + src + '. The 3D importer fetches three.js the first time it opens, so it needs an internet connection.'));
      document.head.appendChild(s);
    });
    threeP = (async () => {
      for (const u of URLS) await add(u);
      return window.THREE;
    })();
    threeP.catch(() => (threeP = null));
    return threeP;
  };

  // ------------------------------------------------------------ the sheets in this game
  NM.list = () => Object.entries(M().edits().sheets || {}).map(([id, e]) => Object.assign({ id }, e));
  NM.get = (id) => (M().edits().sheets || {})[id] || null;
  NM.lookFor = (id) => {
    const e = NM.get(id);
    return e ? Object.assign({ type: 'sheet', sprite: id }, ED.clone(e.look)) : { type: 'sheet', sprite: id };
  };
  NM.remove = function (id) {
    M().change('Delete 3D model ' + id, (E) => {
      if (E.sheets) delete E.sheets[id];
      if (E.sheets && !Object.keys(E.sheets).length) delete E.sheets;
      delete M().sprites[id];
    }, []);
    M().resync();
  };
  function save(id, entry, dataURL) {
    M().change('Import 3D model ' + (entry.name || id), (E) => {
      E.sheets = E.sheets || {};
      E.sheets[id] = entry;
      M().sprites[id] = dataURL;
    }, []);
    M().resync();
  }

  // ------------------------------------------------------------ the camera rig
  /** Guess which clip plays when, from the clip names. */
  const GUESS = {
    idle: /idle|stand|breath|rest/i,
    move: /walk|run|move|locomot|jog|crawl|fly/i,
    attack: /attack|shoot|punch|slash|fire|strike|bite|swing|cast/i,
    hurt: /hurt|hit.?react|react|damage|pain|flinch|impact/i,
    die: /death|die|dead|dying|defeat/i,
  };
  const FRONT = { '+z': Math.PI / 2, '-z': -Math.PI / 2, '+x': 0, '-x': Math.PI };

  class Rig {
    constructor(THREE, gltf) {
      this.THREE = THREE;
      this.gltf = gltf;
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0);
      if ('outputEncoding' in this.renderer) this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.scene = new THREE.Scene();
      // shear: a point y units up moves north (toward -z) by tilt × y, the way a tilted floor lifts its walls
      this.shear = new THREE.Group();
      this.shear.matrixAutoUpdate = false;
      this.turn = new THREE.Group();
      this.fit = new THREE.Group();
      this.scene.add(this.shear);
      this.shear.add(this.turn);
      this.turn.add(this.fit);
      this.fit.add(gltf.scene);
      this.ambient = new THREE.AmbientLight(0xffffff, 0.6);
      this.key = new THREE.DirectionalLight(0xffffff, 0.9);
      this.key.position.set(-0.5, 1, -0.35);
      this.fill = new THREE.DirectionalLight(0xffffff, 0.3);
      this.fill.position.set(0.6, 0.4, 0.8);
      this.scene.add(this.ambient, this.key, this.fill);
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
      this.camera.position.set(0, 1500, 0);
      this.camera.up.set(0, 0, -1);
      this.camera.lookAt(0, 0, 0);
      this.mixer = new THREE.AnimationMixer(gltf.scene);
      this.clips = gltf.animations || [];
      // the model's size at rest
      gltf.scene.updateMatrixWorld(true);
      this.box = new THREE.Box3().setFromObject(gltf.scene);
      this.stats = { meshes: 0, tris: 0 };
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        this.stats.meshes++;
        const g = o.geometry;
        this.stats.tris += g.index ? g.index.count / 3 : g.attributes.position ? g.attributes.position.count / 3 : 0;
        // skinned meshes move past their resting bounds; don't let three.js cull them
        o.frustumCulled = false;
      });
    }
    /** o: { height, tilt, ppu, ss, front, turn, light, ambient, brightness } */
    configure(o) {
      const T3 = this.THREE;
      this.o = o;
      const size = new T3.Vector3(), centre = new T3.Vector3();
      this.box.getSize(size);
      this.box.getCenter(centre);
      const s = o.height / Math.max(1e-6, size.y);
      this.fit.scale.setScalar(s);
      this.fit.position.set(-centre.x * s, -this.box.min.y * s, -centre.z * s);
      let r = 0;
      for (const x of [this.box.min.x, this.box.max.x]) for (const z of [this.box.min.z, this.box.max.z]) r = Math.max(r, Math.hypot((x - centre.x) * s, (z - centre.z) * s));
      const k = o.tilt;
      this.shear.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, -k, 1, 0, 0, 0, 0, 1);
      this.shear.matrixWorldNeedsUpdate = true;
      // room for limbs that swing past the resting bounds
      const m = 1.35;
      this.halfW = r * m + 2;
      this.top = r * m + k * o.height * 1.12 + 2;
      this.bottom = r * m + 2;
      const cam = this.camera;
      cam.left = -this.halfW;
      cam.right = this.halfW;
      cam.top = this.top;
      cam.bottom = -this.bottom;
      cam.updateProjectionMatrix();
      this.W = Math.max(4, Math.ceil(this.halfW * 2 * o.ppu));
      this.H = Math.max(4, Math.ceil((this.top + this.bottom) * o.ppu));
      this.renderer.setSize(this.W * o.ss, this.H * o.ss, false);
      const b = o.brightness == null ? 1 : o.brightness;
      this.ambient.color.set(o.ambient || '#ffffff');
      this.ambient.intensity = 0.55 * b;
      this.key.color.set(o.light || '#ffffff');
      this.key.intensity = 0.95 * b;
      this.fill.intensity = 0.3 * b;
    }
    /** Pose: clip (or null for the model at rest), its time, and the way it faces (game angle: 0 east, clockwise). */
    pose(clip, time, angle) {
      this.mixer.stopAllAction();
      if (clip) {
        const a = this.mixer.clipAction(clip);
        a.reset();
        a.play();
        this.mixer.setTime(time);
      }
      this.turn.rotation.y = (FRONT[this.o.front] == null ? Math.PI / 2 : FRONT[this.o.front]) - angle + ((this.o.turn || 0) * Math.PI) / 180;
    }
    render() {
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement;
    }
    dispose() {
      this.mixer.stopAllAction();
      this.renderer.dispose();
      if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
    }
  }

  // ------------------------------------------------------------ pixels: the look of the level
  const hexRgb = (hex) => {
    let s = String(hex || '').replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s, 16);
    return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  /** Every colour a tile set names (floors, walls, doors, light), for matching a model to it. */
  NM.envPalette = function (envId) {
    const env = envId && ED.engine.LM.registry.environments[envId];
    const out = [];
    const walk = (v, depth) => {
      if (depth > 4 || v == null) return;
      if (typeof v === 'string') {
        if (/^#[0-9a-f]{3,6}$/i.test(v)) out.push(hexRgb(v));
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
      else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!['particles', 'ambience', 'name'].includes(k)) walk(x, depth + 1);
    };
    if (env) walk(env, 0);
    return out.filter(Boolean);
  };
  /** Downscale one rendered frame and give it the chosen look. Returns a canvas of W × H. */
  function finish(src, W, H, o) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = !o.pixel;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, W, H);
    const img = g.getImageData(0, 0, W, H), px = img.data;
    const pal = o.palette && o.palette.length && o.paletteMix > 0 ? o.palette : null;
    const levels = o.posterize > 1 ? o.posterize : 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      if (o.pixel) px[i + 3] = px[i + 3] < 110 ? 0 : 255;
      if (pal) {
        let best = pal[0], bd = Infinity;
        for (const p of pal) {
          const d = (p[0] - px[i]) ** 2 + (p[1] - px[i + 1]) ** 2 + (p[2] - px[i + 2]) ** 2;
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
        for (let k = 0; k < 3; k++) px[i + k] = px[i + k] + (best[k] - px[i + k]) * o.paletteMix;
      }
      if (levels) for (let k = 0; k < 3; k++) px[i + k] = Math.round((px[i + k] / 255) * (levels - 1)) * (255 / (levels - 1));
    }
    if (o.outline) {
      const oc = hexRgb(o.outline) || [8, 8, 10];
      const a = new Uint8ClampedArray(W * H);
      for (let i = 0; i < W * H; i++) a[i] = px[i * 4 + 3];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (a[i] > 40) continue;
          const n = Math.max(x > 0 ? a[i - 1] : 0, x < W - 1 ? a[i + 1] : 0, y > 0 ? a[i - W] : 0, y < H - 1 ? a[i + W] : 0);
          if (n < 90) continue;
          px[i * 4] = oc[0];
          px[i * 4 + 1] = oc[1];
          px[i * 4 + 2] = oc[2];
          px[i * 4 + 3] = o.pixel ? 255 : Math.round(n * 0.9);
        }
      }
    }
    g.putImageData(img, 0, 0);
    // the drawn part, for cropping the sheet
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    c.bounds = x1 < 0 ? null : [x0, y0, x1, y1];
    return c;
  }

  /** Draw every frame and pack the sheet. plan: [{ name, clip, frames, fps, loop }]. Returns { canvas, look }. */
  async function bake(rig, plan, o, progress) {
    rig.configure(o);
    const dirs = o.dirs;
    const cells = [];
    let union = null, done = 0;
    const total = plan.reduce((n, a) => n + a.frames, 0) * dirs;
    for (let ai = 0; ai < plan.length; ai++) {
      const a = plan[ai];
      for (let d = 0; d < dirs; d++) {
        const angle = (d * Math.PI * 2) / dirs;
        for (let f = 0; f < a.frames; f++) {
          const dur = a.clip ? a.clip.duration : 0;
          const time = !a.clip ? 0 : a.loop === false ? (a.frames > 1 ? (dur * f) / (a.frames - 1) : dur) : (dur * f) / a.frames;
          rig.pose(a.clip, Math.min(time, Math.max(0, dur - 1e-4)), angle);
          const c = finish(rig.render(), rig.W, rig.H, o);
          cells.push({ row: ai * dirs + d, col: f, c });
          if (c.bounds) {
            const b = c.bounds;
            union = union ? [Math.min(union[0], b[0]), Math.min(union[1], b[1]), Math.max(union[2], b[2]), Math.max(union[3], b[3])] : b.slice();
          }
          done++;
          if (done % 6 === 0) {
            progress(done / total);
            await new Promise((r) => setTimeout(r, 0));
          }
        }
      }
    }
    if (!union) throw new Error('Nothing showed up in the frames. The model may be empty, or far too small or large; check the preview.');
    const pad = 1;
    const cx0 = Math.max(0, union[0] - pad), cy0 = Math.max(0, union[1] - pad);
    const fw = Math.min(rig.W, union[2] + pad + 1) - cx0, fh = Math.min(rig.H, union[3] + pad + 1) - cy0;
    const cols = Math.max(...plan.map((a) => a.frames)), rows = plan.length * dirs;
    if (cols * fw > 16000 || rows * fh > 16000) throw new Error('That sheet would be ' + cols * fw + ' × ' + rows * fh + ' pixels, too big for a browser. Use fewer directions or frames, or less detail.');
    const sheet = document.createElement('canvas');
    sheet.width = cols * fw;
    sheet.height = rows * fh;
    const g = sheet.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (const cell of cells) g.drawImage(cell.c, cx0, cy0, fw, fh, cell.col * fw, cell.row * fh, fw, fh);
    const anims = {};
    plan.forEach((a, i) => {
      anims[a.name] = { row: i * dirs, frames: a.frames, fps: a.fps };
      if (a.loop === false) anims[a.name].loop = false;
    });
    const look = {
      fw, fh, dirs, anims,
      anchor: [Math.round((rig.halfW * o.ppu - cx0) * 10) / 10, Math.round((rig.top * o.ppu - cy0) * 10) / 10],
      upp: Math.round((1 / o.ppu) * 1000) / 1000,
    };
    return { canvas: sheet, look };
  }

  // ------------------------------------------------------------ the importer
  NM.open = async function (opts) {
    opts = opts || {};
    const status = h('p', { class: 'muted' }, 'Loading the 3D tools…');
    const body = h('div', { class: 'ng-models' }, status);
    let rig = null, alive = true, raf = 0;
    const modal = ED.modal({
      title: 'Import a 3D model', wide: true, className: 'ng-wide', body,
      actions: [{ label: 'Close', quiet: true }],
      onClose: () => {
        alive = false;
        cancelAnimationFrame(raf);
        if (rig) rig.dispose();
      },
    });
    let THREE;
    try {
      THREE = await NM.loadThree();
    } catch (e) {
      status.textContent = e.message;
      status.className = 'error-text';
      return;
    }
    const pick = h('button', { class: 'btn primary', on: { click: () => choose() } }, 'Choose a .glb file…');
    ED.clear(body).append(h('p', null, 'A .glb (binary glTF) file, with or without animations. It is drawn from every direction the game needs, through the same tilted camera as a next-generation floor, and saved as one sprite sheet in this game.'), h('div', { class: 'actions' }, pick), status);
    status.textContent = '';

    async function choose() {
      const file = await ED.pickFile('.glb,.gltf,model/gltf-binary,model/gltf+json');
      if (!file) return;
      status.className = 'muted';
      status.textContent = 'Reading ' + file.name + '…';
      try {
        const buf = await file.arrayBuffer();
        const loader = new THREE.GLTFLoader();
        if (THREE.DRACOLoader) {
          const dl = new THREE.DRACOLoader();
          dl.setDecoderPath(DRACO);
          loader.setDRACOLoader(dl);
        }
        const gltf = await new Promise((res, rej) => loader.parse(buf, '', res, (e) => rej(new Error((e && e.message) || 'That file isn’t a glTF model the importer can read.'))));
        if (rig) rig.dispose();
        rig = new Rig(THREE, gltf);
        setup(file.name.replace(/\.\w+$/, ''));
      } catch (e) {
        console.error(e);
        status.className = 'error-text';
        status.textContent = e.message;
      }
    }

    function setup(name) {
      // settings, with the tilt of the first next-generation floor as the starting point
      const LMx = ED.engine.LM;
      const ngFloors = M().levelOrder().map((id) => [id, M().raw('levels', id)]).filter(([, d]) => d && d.nextGen && d.nextGen.enabled);
      const firstNg = ngFloors[0] && LMx.ng ? LMx.ng.settings(M().raw('levels', ngFloors[0][0])) : null;
      const o = {
        id: ED.uniqueId(ED.slug('model-' + name), (x) => !!M().sprites[x]),
        name: ED.titleCase(name),
        height: 28, dirs: 8, ppu: 2, front: '+z', turn: 0,
        tilt: firstNg && firstNg.oblique.on ? firstNg.oblique.tilt : 0.55,
        pixel: false, outline: '#0a0a0e', posterize: 0,
        env: ngFloors[0] ? ngFloors[0][1].environment : M().ids('environments')[0], paletteMix: 0, brightness: 1,
        light: '#ffffff', ambient: '#ffffff',
      };
      const clips = rig.clips.map((clip, i) => {
        const fps = 12;
        return { clip, name: ED.slug(clip.name || 'clip-' + (i + 1)) || 'clip-' + (i + 1), on: true, fps, frames: Math.max(2, Math.min(16, Math.round(clip.duration * fps))), loop: !GUESS.die.test(clip.name || '') };
      });
      // unique names
      const seen = new Set();
      for (const c of clips) {
        let n = c.name, k = 2;
        while (seen.has(n)) n = c.name + '-' + k++;
        c.name = n;
        seen.add(n);
      }
      const states = {};
      for (const [st, re] of Object.entries(GUESS)) {
        const c = clips.find((x) => re.test(x.clip.name || ''));
        if (c) states[st] = c.name;
      }
      if (!states.idle && clips[0]) states.idle = clips[0].name;
      let dir = 2, scrub = 0, previewClip = clips.length ? 0 : -1;

      const view = h('canvas', { class: 'ng-model-view' });
      const vg = view.getContext('2d');
      const drawPreview = () => {
        rig.configure(Object.assign({}, o, { ss: o.pixel ? 1 : 2 }));
        const c = clips[previewClip];
        rig.pose(c ? c.clip : null, c ? scrub * c.clip.duration * 0.999 : 0, (dir * Math.PI * 2) / 8);
        const f = finish(rig.render(), rig.W, rig.H, prepped());
        const k = Math.max(1, Math.floor(Math.min(260 / f.width, 260 / f.height)));
        view.width = f.width * k;
        view.height = f.height * k;
        vg.imageSmoothingEnabled = false;
        vg.clearRect(0, 0, view.width, view.height);
        vg.drawImage(f, 0, 0, view.width, view.height);
        // where it stands
        vg.strokeStyle = 'rgba(92,200,232,0.8)';
        vg.beginPath();
        vg.arc(rig.halfW * o.ppu * k, rig.top * o.ppu * k, 3, 0, Math.PI * 2);
        vg.stroke();
        size.textContent = rig.W + ' × ' + rig.H + ' px a frame before cropping';
      };
      const prepped = () => Object.assign({}, o, { ss: o.pixel ? 1 : 2, palette: o.paletteMix > 0 ? NM.envPalette(o.env) : null, posterize: o.posterize });
      const redraw = ED.debounce(() => alive && drawPreview(), 60);
      const set = (k) => (v) => {
        o[k] = v;
        redraw();
      };
      const size = h('span', { class: 'muted' });
      const info = h('p', { class: 'muted' }, ED.plural(rig.stats.meshes, 'mesh', 'meshes') + ', ' + Math.round(rig.stats.tris).toLocaleString() + ' triangles, ' + (clips.length ? ED.plural(clips.length, 'animation') + ': ' + clips.map((c) => c.clip.name || c.name).join(', ') : 'no animations (it will be drawn standing still)') + '.');
      const floors = ngFloors.map(([id, d]) => [id, d.name || id]);
      const tiltCtl = ED.ng.slider(o.tilt, set('tilt'), { fmt: (x) => Math.round(x * 100) + '%' });
      const settings = h('div', { class: 'subform' },
        F().field('Name', F().text(o.name, (v) => (o.name = v))),
        F().field('Picture id', F().text(o.id, (v) => (o.id = ED.slug(v) || o.id), { mono: true })),
        F().field('Height in the game', ED.ng.slider(o.height, set('height'), { min: 8, max: 72, step: 1, fmt: (x) => x + ' units' }), 'A tile is 32 units; the player stands about 28.'),
        F().field('Directions', F().select(o.dirs, [[1, '1 (it never turns)'], [4, '4'], [8, '8'], [16, '16 (smoothest)']], (v) => { o.dirs = v; })),
        F().field('Detail', F().select(o.ppu, [[1, 'Low (1 px a unit)'], [1.5, 'Medium'], [2, 'High (2 px a unit)'], [3, 'Very high']], set('ppu'))),
        F().field('The model faces', F().select(o.front, [['+z', 'Forward (+Z, the glTF standard)'], ['-z', 'Backward (−Z)'], ['+x', 'Right (+X)'], ['-x', 'Left (−X)']], set('front'))),
        F().field('Turn it by', ED.ng.slider(o.turn, set('turn'), { min: -180, max: 180, step: 5, fmt: (x) => x + '°' })),
        F().field('Camera tilt', h('div', null, floors.length ? F().select(undefined, [[undefined, 'match a floor…']].concat(floors), (id) => {
          const s = id && LMx.ng && LMx.ng.settings(M().raw('levels', id));
          if (!s) return;
          o.tilt = s.oblique.on ? s.oblique.tilt : 0;
          o.env = M().raw('levels', id).environment;
          tiltCtl.querySelector('input').value = o.tilt;
          tiltCtl.querySelector('input').dispatchEvent(new Event('input'));
        }) : null, tiltCtl), '0% looks straight down, like the classic sprites; match the floors it will be used on.'));
      const lookBox = h('div', { class: 'subform' },
        F().field('Style', F().select(o.pixel, [[false, 'Smooth'], [true, 'Pixel art (hard edges)']], set('pixel'))),
        F().field('Outline', F().color(o.outline, (v) => set('outline')(v || ''), { allowEmpty: true })),
        F().field('Fewer colours', F().select(o.posterize, [[0, 'No'], [16, 'Some'], [8, 'Many fewer'], [5, 'Very few']], set('posterize'))),
        F().field('Colours of tile set', F().idSelect('environments', o.env, set('env'))),
        F().field('…mixed in', ED.ng.slider(o.paletteMix, set('paletteMix'), { max: 0.8, fmt: (x) => Math.round(x * 100) + '%' }), 'Pulls the model’s colours toward the tile set’s, so it belongs in the room.'),
        F().field('Brightness', ED.ng.slider(o.brightness, set('brightness'), { min: 0.3, max: 2, fmt: (x) => Math.round(x * 100) + '%' }), 'The floor’s own light falls on it in the game too.'),
        F().field('Light colour', F().color(o.light, (v) => set('light')(v || '#ffffff'))));
      const clipRows = clips.length ? h('table', { class: 'ng-clips' },
        h('tr', null, h('th', null, ''), h('th', null, 'Animation'), h('th', null, 'Length'), h('th', null, 'Frames'), h('th', null, 'Speed (fps)'), h('th', null, 'Loops')),
        clips.map((c, i) => h('tr', null,
          h('td', null, F().bool(c.on, (v) => { c.on = v; refreshStates(); })),
          h('td', null, h('a', { href: '#', on: { click: (e) => { e.preventDefault(); previewClip = i; redraw(); } } }, c.clip.name || c.name)),
          h('td', { class: 'mono' }, c.clip.duration.toFixed(2) + 's'),
          h('td', null, F().number(c.frames, (v) => (c.frames = Math.max(1, Math.min(48, Math.round(v || 1)))), { min: 1, max: 48, step: 1 })),
          h('td', null, F().number(c.fps, (v) => (c.fps = Math.max(1, v || 10)), { min: 1, max: 60, step: 1 })),
          h('td', null, F().bool(c.loop, (v) => (c.loop = v)))))) : h('p', { class: 'muted' }, 'No animations: the sheet holds the model standing still, from each direction.');
      const statesBox = h('div', { class: 'subform' });
      const refreshStates = () => {
        ED.clear(statesBox);
        if (!clips.length) return;
        const opts = [[undefined, '(none)']].concat(clips.filter((c) => c.on).map((c) => [c.name, c.clip.name || c.name]));
        for (const [st, label] of [['idle', 'Standing still'], ['move', 'Moving'], ['attack', 'Attacking'], ['hurt', 'Hurt'], ['die', 'Dying (monsters)']]) {
          statesBox.appendChild(F().field(label, F().select(states[st], opts, (v) => { if (v) states[st] = v; else delete states[st]; })));
        }
      };
      refreshStates();
      const dirCtl = ED.ng.slider(dir, (v) => { dir = v; redraw(); }, { max: 7, step: 1, fmt: (x) => ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][x] });
      const scrubCtl = ED.ng.slider(scrub, (v) => { scrub = v; redraw(); }, { fmt: (x) => Math.round(x * 100) + '%' });
      const prog = h('progress', { max: 1, value: 0, hidden: true });
      const result = h('div');
      const go = h('button', { class: 'btn primary', on: { click: () => convert() } }, 'Make the sprite sheet');
      ED.clear(body).append(
        info,
        h('div', { class: 'ng-model-grid' },
          h('div', { class: 'ng-model-left' }, view, h('div', { class: 'muted' }, size), h('div', { class: 'subform' }, F().field('Facing', dirCtl), clips.length ? F().field('Time in the animation', scrubCtl) : null)),
          h('div', null, h('h4', null, 'The model'), settings, h('h4', null, 'The look'), lookBox)),
        h('h4', null, 'Animations'), clipRows, clips.length ? h('h4', null, 'What plays when') : null, statesBox,
        h('div', { class: 'actions', style: { marginTop: '12px' } }, go, h('button', { class: 'btn', on: { click: () => choose() } }, 'Another file…'), prog),
        status, result);
      status.textContent = '';
      drawPreview();

      async function convert() {
        const plan = clips.length ? clips.filter((c) => c.on).map((c) => ({ name: c.name, clip: c.clip, frames: c.frames, fps: c.fps, loop: c.loop })) : [{ name: 'idle', clip: null, frames: 1, fps: 1 }];
        if (!plan.length) {
          status.className = 'error-text';
          status.textContent = 'Tick at least one animation.';
          return;
        }
        go.disabled = true;
        prog.hidden = false;
        status.className = 'muted';
        status.textContent = 'Drawing ' + plan.reduce((n, a) => n + a.frames, 0) * o.dirs + ' frames…';
        try {
          const out = await bake(rig, plan, Object.assign(prepped(), { ss: o.pixel ? 1 : 3 }), (k) => (prog.value = k));
          const st = {};
          for (const [k, v] of Object.entries(states)) if (out.look.anims[v]) st[k] = v;
          if (!clips.length) st.idle = 'idle';
          out.look.states = st;
          showResult(out, plan);
        } catch (e) {
          console.error(e);
          status.className = 'error-text';
          status.textContent = e.message;
        }
        go.disabled = false;
        prog.hidden = true;
      }
      function showResult(out, plan) {
        const url = out.canvas.toDataURL('image/png');
        const kb = Math.round((url.length * 0.75) / 1024);
        status.className = 'muted';
        status.textContent = 'A sheet of ' + out.canvas.width + ' × ' + out.canvas.height + ' pixels (' + kb + ' KB): ' + plan.length + ' animation' + (plan.length > 1 ? 's' : '') + ' × ' + o.dirs + ' directions, frames of ' + out.look.fw + ' × ' + out.look.fh + '.';
        const img = new Image();
        img.src = url;
        const sheetView = h('div', { class: 'ng-sheet-view' }, img);
        const demo = NM.demo(out.look, () => img);
        const save1 = h('button', { class: 'btn primary', on: { click: () => {
          const id = ED.uniqueId(o.id, (x) => !!M().sprites[x] && !NM.get(x));
          save(id, { name: o.name, source: name + '.glb', look: out.look, made: { height: o.height, tilt: o.tilt, dirs: o.dirs, ppu: o.ppu, pixel: o.pixel } }, url);
          ED.toast('Saved the sprite sheet ' + id, 'good');
          if (opts.done) opts.done(id);
          modal.close();
        } } }, opts.done ? 'Save it and use it' : 'Save it');
        ED.clear(result).append(h('div', { class: 'ng-model-grid' }, demo, sheetView), h('div', { class: 'actions', style: { marginTop: '10px' } }, save1));
      }
    }
  };

  // ------------------------------------------------------------ a live preview, drawn by the engine's own sheet look
  /** A small canvas where the sheet walks in a circle, stops, attacks: the engine's own playback. */
  NM.demo = function (look, image) {
    const c = h('canvas', { class: 'ng-demo', width: 220, height: 220 });
    const g = c.getContext('2d');
    const LMx = ED.engine.LM;
    const fns = LMx.ng && LMx.ng.sheetLook ? LMx.ng.sheetLook(look, 'enemy', image) : null;
    const e = { x: 0, y: 0, r: 10, facing: 0, vx: 0, vy: 0, flash: 0, atk: null, t: 0 };
    const t0 = performance.now();
    let raf;
    const tick = () => {
      if (!c.isConnected && performance.now() - t0 > 2000) return;
      raf = requestAnimationFrame(tick);
      const t = (performance.now() - t0) / 1000;
      const phase = t % 9;
      // walk a circle for 5 s, stand 2 s, attack 2 s
      if (phase < 5) {
        const a = phase * 1.25;
        e.facing = a + Math.PI / 2;
        e.vx = Math.cos(e.facing) * 60;
        e.vy = Math.sin(e.facing) * 60;
        e.x = Math.cos(a) * 40;
        e.y = Math.sin(a) * 40;
        e.atk = null;
      } else {
        e.vx = e.vy = 0;
        e.atk = phase > 7 ? {} : null;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#14171f';
      g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i <= c.width; i += 32) {
        g.beginPath();
        g.moveTo(i + 0.5, 0);
        g.lineTo(i + 0.5, c.height);
        g.moveTo(0, i + 0.5);
        g.lineTo(c.width, i + 0.5);
        g.stroke();
      }
      if (!fns) return;
      g.setTransform(1.6, 0, 0, 1.6, c.width / 2 + e.x * 1.6, c.height / 2 + e.y * 1.6);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.ellipse(0, 2, 9, 5, 0, 0, Math.PI * 2);
      g.fill();
      fns.draw(g, e, t);
    };
    tick();
    return c;
  };

  // ------------------------------------------------------------ the Look tab
  /** Controls for a thing whose look is a sheet: which model, its size, glow. */
  NM.lookPanel = function (kind, id, d, changed) {
    const look = d.look;
    const box = h('div');
    const list = NM.list();
    const pickOne = (sid) => {
      const keep = { glow: look.glow, bob: look.bob, scale: look.scale };
      d.look = Object.assign(NM.lookFor(sid), ...Object.entries(keep).filter(([, v]) => v !== undefined).map(([k, v]) => ({ [k]: v })));
      changed();
      ED.rerender();
    };
    box.appendChild(h('div', { class: 'row' },
      F().field('Model', F().select(look.sprite, [[undefined, list.length ? '(choose)' : '(no models yet)']].concat(list.map((s) => [s.id, s.name || s.id])), (v) => v && pickOne(v))),
      h('button', { class: 'btn small', on: { click: () => NM.open({ done: pickOne }) } }, 'Import a 3D model…')));
    const entry = NM.get(look.sprite);
    if (!entry) {
      box.appendChild(h('p', { class: 'muted' }, look.sprite ? 'The sheet “' + look.sprite + '” isn’t in this game any more.' : 'Choose a model, or import one (.glb).'));
      return box;
    }
    const img = ED.engine.X.image(look.sprite);
    box.appendChild(h('div', { class: 'row' }, NM.demo(look, () => img), h('div', { class: 'subform', style: { flex: 1 } },
      F().field('Size', ED.ng.slider(look.upp / entry.look.upp, (v) => { look.upp = Math.round(entry.look.upp * v * 1000) / 1000; changed(); }, { min: 0.3, max: 3, step: 0.05, fmt: (x) => '×' + x })),
      F().field('Glow', F().color(look.glow, (v) => { if (v) look.glow = v; else delete look.glow; changed(); }, { allowEmpty: true })),
      F().field('Bobs', F().bool(look.bob, (v) => { if (v) look.bob = true; else delete look.bob; changed(); })),
      h('p', { class: 'hint' }, 'Plays ' + Object.entries(look.states || {}).map(([s, a]) => a + ' when ' + { idle: 'still', move: 'moving', attack: 'attacking', hurt: 'hurt', die: 'dying' }[s]).join(', ') + '. ' + (entry.made && entry.made.tilt ? 'Drawn for a camera tilted ' + Math.round(entry.made.tilt * 100) + '%.' : 'Drawn looking straight down.')))));
    return box;
  };
})();
