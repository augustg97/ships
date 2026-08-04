/* Ships — how we learned to cross the ocean.
 *
 * The world ocean, composed per pixel in one fragment shader from measured fields, on a globe.
 * There is no basemap image anywhere in this project: every colour on screen is computed from
 * depth, roughness, sea-surface temperature, chlorophyll, wind, ice and cloud at that pixel.
 *
 * WHY A GLOBE. Any 2:1 rectangular projection must cut either the Pacific or the Atlantic in
 * half. For a subject that is entirely about crossing them, that is not a projection choice, it
 * is a false statement about the thing being modelled. SCOPE D2.
 *
 * THE FIELDS, and what each one is doing in the picture:
 *   depth (GEBCO 2026, 16-bit)  the sea floor, lit from the gradient of the field itself, seen
 *                               THROUGH the water with a per-channel extinction so that red is
 *                               gone by 15 m and blue survives to 60. This is why shelves are
 *                               turquoise and the abyss is nearly black: it is Beer-Lambert, not
 *                               a colour ramp.
 *   roughness                   derived from the depth gradient at the master grid, then averaged
 *                               down, so it stays a scale-invariant statistic. It separates the
 *                               abyssal plains from the ridge fabric.
 *   sst, chlorophyll            the water's own colour. The subtropical gyres are the clearest
 *                               water on Earth and the shelves are green; without chlorophyll an
 *                               ocean map is one flat blue, which is the commonest way this kind
 *                               of picture fails.
 *   wind u,v                    surface roughness, streak direction and WHITECAPPING. This is
 *                               most of what makes the sea read as moving water.
 *   ice                         a measured margin, not a latitude threshold.
 *
 * ⚠ A canvas is a REPLACED element. Its CSS size is set in styles.css in vw/vh so that it never
 * depends on the width attribute; measuring clientWidth to set width is a feedback loop that
 * grows the buffer 1280 -> 2560 -> 5120 until the tab dies.
 */
'use strict';

const APP = {};

/* ── constants ──────────────────────────────────────────────────────────── */
const ELEV_MIN = -11000, ELEV_MAX = 9000, ELEV_SPAN = ELEV_MAX - ELEV_MIN;
const R = 100;                       // globe radius in world units
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

/* ── TIME IS ERAS, NOT A SLIDER ──────────────────────────────────────────────────────
 * The first version was a single piecewise-linear scrubber across 70,000 years, inherited
 * from a deep-time project where it was right. Here it was not: every event stayed on screen
 * at every date, so the slider explained nothing and the world never emptied out.
 *
 * Now the era IS the unit of navigation. Picking one filters the whole world to it — the ports
 * that existed, the voyages that were made, the hulls that could be built — and says in a
 * sentence what changed. The year slider then moves only WITHIN the chosen era, so the Earth
 * still breathes (sea level, ice) without the timeline pretending to carry everything.
 */
function yearLabel(y) {
  y = Math.round(y);
  if (y < -10000) return `${Math.round(-y / 1000)},000 BC`;
  if (y < 0) return `${(-y).toLocaleString()} BC`;
  if (y < 1000) return `AD ${y}`;
  return String(y);
}

/* ── state ──────────────────────────────────────────────────────────────── */
const S = {
  era: 4,                 // index into APP.chapters.chapters
  year: 1600,
  month: 6.5,             // 0..12, fractional so the field interpolates
  monthPlaying: false,
  lon: -30, lat: 20, dist: 340,
  layers: { seafloor: 1, wind: 1, chl: 1, ice: 1, cloud: 0, ports: 1, reach: 0 },
  voyage: null,           // the voyage being animated
  voyT: 0,                // 0..1 along it
  voyPlaying: false,
  reachFrom: null,
};

let renderer, scene, camera, globe, mat, raycaster, sphere;
let W = 1, H = 1;

/* ── shaders ────────────────────────────────────────────────────────────── */

const VERT = SHADERS['VERT.vert'];

const FRAG = SHADERS['FRAG.frag'];

/* ── tile assembly ──────────────────────────────────────────────────────── */
/* Tiles are stitched into one canvas per level, then uploaded as a single texture. The globe
 * samples it by lat/lon, so no per-tile geometry is needed.
 * ⚠ createImageBitmap with colorSpaceConversion:'none' — otherwise the browser may apply a
 * colour transform to the PNG and the low byte of a 16-bit depth stops being the low byte. */
async function loadLevel(level, manifest, note) {
  const L = manifest.levels.find(x => x.level === level);
  const core = manifest.core, sk = manifest.skirt;
  const cv = document.createElement('canvas');
  cv.width = L.w; cv.height = L.h;
  const ctx = cv.getContext('2d', { willReadFrequently: false });
  ctx.imageSmoothingEnabled = false;

  let done = 0;
  const total = L.nx * L.ny;
  const jobs = [];
  for (let ty = 0; ty < L.ny; ty++) {
    for (let tx = 0; tx < L.nx; tx++) {
      jobs.push((async () => {
        const r = await fetch(`fields/z${level}/${tx}_${ty}.png`);
        const blob = await r.blob();
        const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none',
                                                   premultiplyAlpha: 'none' });
        // draw the CORE only; the skirt exists so the tile edge samples a real neighbour
        ctx.drawImage(bmp, sk, sk, core, core, tx * core, ty * core, core, core);
        bmp.close();
        done++;
        if (note) note(done / total);
      })());
    }
  }
  await Promise.all(jobs);
  const tex = new THREE.CanvasTexture(cv);
  setTexParams(tex);
  tex.needsUpdate = true;
  /* Level 0 is kept on the CPU: the routing engine needs depth and a land mask, and reading
     them out of the tiles we already fetched costs nothing and cannot disagree with what the
     shader is drawing — which is the whole point of ARCHITECTURE-PATTERNS §4. */
  if (level === 0) APP.depthCanvas = cv;
  return { tex, w: L.w };
}

/* ⚠ flipY MUST be false, and this is the single most expensive line in the file.
   three.js sets texture.flipY = true by default, because the GL convention puts v=0 at the
   BOTTOM while images put row 0 at the top. Our uv is computed from latitude —
   v = 0.5 - lat/PI, so v=0 is +90° — which means the first row of the image. With the default
   flip, every field is sampled upside down: the Southern Ocean reads northern-hemisphere data,
   and the globe renders a complete, plausible, entirely wrong Earth. It was found by setting
   the camera to 42°S and seeing the Caspian Sea. */
function setTexParams(t) {
  t.flipY = false;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

/* ── ⚠ NEVER LOAD A TEXTURE THROUGH AN HTMLImageElement ────────────────────────────────
 * This used THREE.TextureLoader, which decodes through an <img>. An <img> in a HIDDEN OR
 * THROTTLED TAB may never fire its load event and never settle its decode — so boot awaited
 * the first monthly field forever, the splash never cleared, and the render loop never started.
 * A background tab, a tab opened with cmd-click, or an automated browser pane all hit it.
 *
 * The project already knew this and had already fixed it once, in route.js, where the wind
 * sampler was hanging for exactly the same reason. It was never fixed HERE — in the boot path,
 * where it is worst, because nothing else can happen until it resolves. loadLevel twenty lines
 * above has always done it correctly; this function is the one that was left behind.
 *
 * fetch + createImageBitmap has no such dependency on the document being visible. And
 * colorSpaceConversion:'none' matters for the same reason it does for the tiles: these PNGs are
 * DATA, and a colour transform would corrupt the low byte of a 16-bit field. */
async function loadTex(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
  const bmp = await createImageBitmap(await r.blob(),
                { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const t = new THREE.CanvasTexture(bmp);
  t.needsUpdate = true;
  return setTexParams(t);
}

/* ── deterministic capture mode ─────────────────────────────────────────────────────
 * `?frozen` pins every clock in the app to one instant, so two captures of the same code
 * produce the same pixels. Without it the frame-baseline ratchet cannot gate anything:
 * measured on this app, two captures of byte-identical code differed by 2.659% of pixels,
 * entirely from wave drift, cloud advection and the rotating terminator.
 *
 *   ?frozen        freeze at t = 0 s
 *   ?frozen=12.5   freeze at t = 12.5 s — use a non-zero value when the interesting
 *                  state is a little way into an animation
 *
 * Everything time-varying reads clockS(). Nothing reads performance.now() directly for
 * appearance. See Modeling Studio references/TOOLCHAIN.md §1.
 */
const FROZEN = new URLSearchParams(location.search).has('frozen');
const FROZEN_S = FROZEN
  ? (parseFloat(new URLSearchParams(location.search).get('frozen')) || 0)
  : 0;
function clockS() { return FROZEN ? FROZEN_S : performance.now() / 1000; }

/* The signal the capture harness waits on. Set once, after something has actually been
 * painted — not after DOMContentLoaded, which is true long before the globe exists.
 *
 * ⚠ In capture mode it additionally waits for the progressive detail upgrades. The first
 * painted frame uses level-0 terrain and levels 1 and 2 stream in behind it, so a capture
 * taken at first paint differs from one taken a second later by ~18% of pixels. That made
 * the baselines depend on capture order, which is a ratchet that only appears to work. */
let upgradesDone = false;
function markReady() {
  if (FROZEN && !upgradesDone) return;
  if (!window.__FRAME_READY) window.__FRAME_READY = true;
}

/* ── URL state ──────────────────────────────────────────────────────────────────────
 * ARCHITECTURE-PATTERNS §2: the hash carries `t`, so every state is shareable and every
 * capture is addressable. `#t=` is the time scrubber's own position, which is the model's
 * actual time scalar. This app had no URL state at all until 2026-08-02, which meant a
 * frame manifest could not name anything but the default view. */
function applyHash() {
  const h = location.hash;
  const em = /[#&]e=(\d+)/.exec(h);
  const tm = /[#&]t=(-?[\d.]+)/.exec(h);
  if (!em && !tm) return;

  /* The era must be applied first. selectEra() rewrites the year slider's own min/max to
     the era's span and resets S.year to the era's seek point — so a year applied before it
     is silently thrown away. That is exactly what happened on the first attempt at this,
     and it produced three "different" baseline frames that were byte-identical. */
  if (em) selectEra(Math.max(0, Math.min((APP.chapters.chapters || []).length - 1, +em[1])), false);

  if (tm) {
    const yr = document.getElementById('yr');
    const v = Math.max(+yr.min, Math.min(+yr.max, parseFloat(tm[1])));
    if (isFinite(v)) { yr.value = v; S.year = v; onTime(); }
  }

}

/* The view is applied separately and LATER than the era and year, because setView() needs
 * the tabs wired and the vessel and battle data loaded. Called from applyHash() it ran too
 * early, found no vessel, opened nothing — and the "shipwright" baseline was a picture of
 * the globe. A frame that captures the wrong view is worse than no frame, because it looks
 * like coverage. All three top-level views are addressable: `#v=sea` (default), `#v=ship`,
 * `#v=action`. */
function applyHashView() {
  const vm = /[#&]v=(sea|ship|action)/.exec(location.hash);
  if (vm && typeof setView === 'function') setView(vm[1]);
  /* `#v=ship&s=<id>` names a hull, e.g. #v=ship&s=dhow. Ordered after setView for the same
     reason setView is ordered after the data load: the Shipwright builds its layout when the
     view opens, and there is nothing to select before that. */
  const sm = /[#&]s=([a-z0-9-]+)/i.exec(location.hash);
  if (sm && typeof swOpenById === 'function') swOpenById(sm[1]);
}

function writeHash() {
  if (FROZEN) return;                       // a capture must not rewrite its own URL
  const view = APP.view && APP.view !== 'sea' ? `&v=${APP.view}` : '';
  const ship = APP.view === 'ship' && typeof SW === 'object' && SW.spec ? `&s=${SW.spec.id}` : '';
  const h = `#e=${S.era}&t=${Math.round(S.year)}${view}${ship}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}

/* ── sun position ───────────────────────────────────────────────────────── */
function sunVector(monthFrac) {
  // Declination through the year, plus a slow rotation so the terminator moves.
  const dayOfYear = monthFrac / 12 * 365.25;
  const decl = -23.44 * Math.PI / 180 * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365.25);
  const hour = clockS() * 0.006;
  return new THREE.Vector3(
    Math.cos(decl) * Math.sin(hour),
    Math.sin(decl),
    Math.cos(decl) * Math.cos(hour)
  ).normalize();
}

/* ── camera ─────────────────────────────────────────────────────────────── */
function placeCamera() {
  const la = S.lat * Math.PI / 180, lo = S.lon * Math.PI / 180;
  const d = S.dist;
  camera.position.set(
    d * Math.cos(la) * Math.sin(lo),
    d * Math.sin(la),
    d * Math.cos(la) * Math.cos(lo)
  );
  camera.lookAt(0, 0, 0);
}

/* Matched pair with sphereUV in the fragment shader — see the handedness note there.
   Never change one without the other. */
function lonLatToVec(lon, lat, r) {
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  return new THREE.Vector3(
    r * Math.cos(la) * Math.sin(lo),
    r * Math.sin(la),
    r * Math.cos(la) * Math.cos(lo)
  );
}
function vecToLonLat(v) {
  const n = v.clone().normalize();
  return { lon: Math.atan2(n.x, n.z) * 180 / Math.PI,
           lat: Math.asin(Math.max(-1, Math.min(1, n.y))) * 180 / Math.PI };
}

/* ── ⚠ STANDING A SHIP UP ON A SPHERE, AND THE CROSS PRODUCT THAT FLUNG HER INTO ORBIT ──
 *
 * Every object placed on the globe needs the same thing: a frame with Y along the radius and
 * Z along the way it is pointing. Written by hand it is one line, and I wrote that line three
 * times and got the handedness wrong in two of them:
 *
 *     makeBasis(fwd.cross(up), up, fwd)     // era fleet   — det = -1
 *     makeBasis(right.cross(up), up, right) // voyage wake — det = -1
 *     makeBasis(up.cross(fwd), up, fwd)     // campaign    — det = +1, and correct all along
 *
 * A left-handed basis is a REFLECTION, not a rotation, and `Quaternion.setFromRotationMatrix`
 * does not check: it returns a perfectly valid unit quaternion that is not the transform you
 * asked for. The group's Y came out a hundred degrees off the radius. A ship at local (0,0,0)
 * still landed in the right place — which is why single hulls looked fine — but every consort
 * in a convoy had its tangent-plane offset rotated into the RADIAL direction, and the fleet
 * scattered to +1,250 km, +822 km and -646 km. Ships in orbit, and ships inside the Earth.
 *
 * Note the sign that falls out: in a Y-up right-handed frame with Z along the course, X is to
 * PORT, not to starboard. That is not a choice, it is what X x Y = Z requires, and calling the
 * variable `right` is exactly how the wrong sign got written twice.
 *
 * There is now one implementation. `fwd` need not be perpendicular to `up` — it is projected
 * into the tangent plane here, so callers cannot forget to.
 */
function tangentBasis(up, fwd) {
  const u = up.clone().normalize();
  const f = fwd.clone().addScaledVector(u, -fwd.dot(u));
  if (f.lengthSq() < 1e-12) return null;                 // heading is straight up: no frame
  f.normalize();
  const port = new THREE.Vector3().crossVectors(u, f);   // X = Y x Z. Right-handed by
  return new THREE.Matrix4().makeBasis(port, u, f);      // construction, not by inspection.
}

/* ── boot ───────────────────────────────────────────────────────────────── */
async function boot() {
  const cv = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);
  raycaster = new THREE.Raycaster();

  const bar = document.querySelector('#splash .bar i');
  const note = document.getElementById('loadnote');
  const setP = p => { bar.style.width = Math.round(p * 100) + '%'; };

  const manifest = await (await fetch('fields/tiles.json')).json();
  APP.manifest = manifest;

  note.textContent = 'reading the sea floor…';
  const z0 = await loadLevel(0, manifest, p => setP(p * 0.55));

  note.textContent = 'wind, temperature and what lives in the water…';
  const mi = Math.floor(S.month) % 12;
  const seaA = await loadTex(`fields/sea_${String(mi + 1).padStart(2, '0')}.png`);
  const seaB = await loadTex(`fields/sea_${String((mi + 1) % 12 + 1).padStart(2, '0')}.png`);
  const winA = await loadTex(`fields/wind_${String(mi + 1).padStart(2, '0')}.png`);
  const winB = await loadTex(`fields/wind_${String((mi + 1) % 12 + 1).padStart(2, '0')}.png`);
  setP(0.85);

  // a 1x1 empty reach texture until a port is picked
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  blank.needsUpdate = true;

  mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uDepth: { value: z0.tex },
      uSeaA: { value: seaA }, uSeaB: { value: seaB },
      uWindA: { value: winA }, uWindB: { value: winB },
      uReach: { value: blank },
      uMonthMix: { value: S.month - Math.floor(S.month) },
      uTexel: { value: 1.0 / z0.w },
      uSun: { value: new THREE.Vector3(1, 0.2, 0.4).normalize() },
      uCam: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uSeaLevel: { value: 0 },
      uLySeafloor: { value: 1 }, uLyWind: { value: 1 }, uLyChl: { value: 1 },
      uLyIce: { value: 1 }, uLyCloud: { value: 0 }, uLyReach: { value: 0 },
      /* the surface of the water — see the note at the top of FRAG.frag.glsl */
      uZoom: { value: 0 }, uMPP: { value: 1e6 },
      uRef: { value: new THREE.Vector2() },
      uWave: { value: SHIPS_SEA.seaWaveUniform() },   // the one wave table, shared with sea.js
      uWind: { value: 7.0 },
    },
  });
  APP.texA = { seaA, seaB, winA, winB };

  sphere = new THREE.SphereGeometry(R, 192, 128);
  globe = new THREE.Mesh(sphere, mat);
  scene.add(globe);

  resize();
  placeCamera();
  setP(1);
  nextFrame(frame);

  /* The splash fades on a timer and then a CSS transition. A capture that lands mid-fade
     differs from one that lands after it, so in capture mode it goes immediately. */
  if (FROZEN) {
    const sp = document.getElementById('splash');
    sp.classList.add('gone');
    sp.style.transition = 'none';
    sp.style.display = 'none';
  } else {
    setTimeout(() => {
      document.getElementById('splash').classList.add('gone');
    }, 260);
  }

  /* upgrade the detail behind the first frame: level 1, then level 2. Binding tolerates
     absence, so nothing waits on these. */
  (async () => {
    for (const lv of [1, 2]) {
      try {
        const z = await loadLevel(lv, manifest, null);
        mat.uniforms.uDepth.value = z.tex;
        mat.uniforms.uTexel.value = 1.0 / z.w;
        APP.level = lv;
      } catch (e) { console.warn('level', lv, 'failed', e); break; }
    }
    upgradesDone = true;      // capture mode has been waiting on this
  })();

  await loadData();
  wireUI();
}

/* ── data ───────────────────────────────────────────────────────────────── */
async function loadData() {
  /* ── ⚠ THE STAMP WAS PROTECTING THE CODE AND NOT THE DATA ───────────────────────────
     index.html carries ?v=<stamp> on every script and stylesheet, and build_site.py rewrites it
     before copying — the whole documented ritual against a static host serving stale files. The
     JSON was fetched with a bare URL.
     So the browser cached data/vessels.json and kept serving it after every deploy. The code was
     always fresh and the DATA — the thing that actually changes each round — was whatever the
     visitor happened to have. Corrections to Great Eastern's six masts, the trireme's two, the
     treasure ship's five, Titanic's crew and every rewritten card were invisible to anyone with
     a warm cache, while the live stamp read correct and the file on the server was correct.
     That is the worst shape a caching bug can take: every check passes and the user sees the old
     thing.
     The field PNGs are deliberately NOT stamped — they are hundreds of megabytes and effectively
     immutable, and re-fetching them on every deploy would cost far more than it protects. If a
     field is ever regenerated, its filename must change. */
  const DV = (document.querySelector('meta[name="data-version"]') || {}).content || '0';
  const get = async u => {
    try { return await (await fetch(u + '?v=' + DV)).json(); } catch (e) { return null; }
  };
  APP.ports    = await get('data/ports.json')    || { ports: [] };
  APP.vessels  = await get('data/vessels.json')  || { vessels: [] };
  APP.battles  = await get('data/battles.json')  || { battles: [] };
  APP.chapters = await get('data/chapters.json') || { chapters: [] };
  APP.voyages  = await get('data/voyages.json')  || { voyages: [] };
  APP.about    = await get('data/about.json')    || null;
  buildChapters();
  buildMarkers();
  updateReadout();
}

/* ── CHART LETTERING, not dots ────────────────────────────────────────────
 * On an Admiralty chart the label IS the mark: a place is named, not stippled. So there are no
 * point symbols on this globe. Ports are set in letterspaced roman capitals with a short tick
 * down to the coast; sea areas are in italic, which is the actual chart convention for water;
 * battles are in the one warm colour on the site.
 *
 * This also solves the density problem that dots never do — a label that would collide with a
 * more important label simply does not draw, so the map thins itself out as you zoom out
 * instead of turning into a smear of points.
 */
const SEAS = [
  ['North Atlantic Ocean', -40, 35], ['South Atlantic Ocean', -20, -25],
  ['North Pacific Ocean', -160, 30], ['South Pacific Ocean', -130, -25],
  ['Indian Ocean', 78, -20], ['Southern Ocean', 40, -58],
  ['Arctic Ocean', 0, 84], ['Mediterranean Sea', 17, 36],
  ['Caribbean Sea', -75, 15], ['Bay of Bengal', 88, 15],
  ['Arabian Sea', 63, 15], ['South China Sea', 114, 14],
  ['Coral Sea', 155, -17], ['Tasman Sea', 162, -38],
  ['Gulf of Guinea', 2, 2], ['Bering Sea', -178, 58], ['North Sea', 3, 56],
  ['Sea of Japan', 135, 40], ['Drake Passage', -63, -58], ['Baltic Sea', 19, 58],
];

let labelHost;
function buildMarkers() {
  labelHost = document.getElementById('labels');
  APP.markers = [];
  const push = (kind, item, cls) => {
    const el = document.createElement('div');
    el.className = 'lbl ' + cls;
    el.innerHTML = (kind === 'sea')
      ? item.name
      : `${item.name}<i class="tick"></i>`;
    if (kind !== 'sea') el.onclick = () => (kind === 'port' ? openPort(item) : openBattle(item));
    labelHost.appendChild(el);
    APP.markers.push({ kind, item, el, v: lonLatToVec(item.lon, item.lat, R * 1.002),
                       major: !!item.kind && item.kind === 'historic' });
  };
  SEAS.forEach(([name, lon, lat]) => push('sea', { name, lon, lat }, 'sea'));
  (APP.ports.ports || []).forEach(p =>
    push('port', p, 'port' + (p.kind === 'historic' ? ' major' : '')));
  (APP.battles.battles || []).forEach(b => push('battle', b, 'battle'));
}

/* Projected once per frame, on a throttle, with collision culling by importance. */
let lblTick = 0;
let labelsHidden = false;
function updateLabels(now) {
  if (!APP.markers) return;
  /* ── ⚠ THE OCEANS WERE WRITTEN ACROSS THE SKY ────────────────────────────────────────
     These are labels on a map, projected from the globe camera. Down in the Passage that
     camera is forty metres above the water, so NORTH ATLANTIC OCEAN and MEDITERRANEAN SEA
     projected onto thin air above the horizon — cartography floating over a photograph. A
     view of the world from inside it does not carry the names of the world seen from outside
     it, so they go, all at once, and come back when you climb out. */
  if (PSGV.on) {
    if (!labelsHidden) {
      for (const m of APP.markers) if (m.el) m.el.style.display = 'none';
      labelsHidden = true;
    }
    return;
  }
  labelsHidden = false;
  if (now - lblTick < 90) return;
  lblTick = now;
  const rect = renderer.domElement.getBoundingClientRect();
  const camDir = camera.position.clone().normalize();
  const taken = [];
  const era = currentEra();

  /* nearest first, so the important thing wins a collision */
  const order = APP.markers.slice().sort((a, b) => {
    const rank = m => m.kind === 'sea' ? 0 : (m.kind === 'battle' ? 1 : (m.major ? 2 : 3));
    return rank(a) - rank(b);
  });

  for (const m of order) {
    let show = true;
    if (m.kind !== 'sea' && !S.layers.ports) show = false;
    /* ── AN ERA SHOWS ITS OWN WORLD ──────────────────────────────────
       The World Port Index is a MODERN gazetteer: it lists the port network as it is today,
       so its entries are only honest from the era in which that network exists. Showing them
       across the whole timeline put oil terminals on a chart of 1590 — which is exactly the
       failure the era system was built to end. Historical ports carry their own founding date
       and appear from it. */
    if (show && m.kind === 'port') {
      if (m.item.kind === 'modern' && S.year < 1900) show = false;
      else if (m.item.from !== undefined && S.year < m.item.from) show = false;
    }
    if (show && m.kind === 'battle' && era && (m.item.year < era.from || m.item.year > era.to))
      show = false;
    /* the far side of the planet */
    /* ⚠ THE HORIZON IS NOT AT 90 DEGREES. This tested dot < 0.06 — the threshold for a camera
       at INFINITY. From a camera at distance d the visible cap is only acos(R/d) wide: at
       d = 124 that is 36 degrees, not 87. Everything between the two limits is BEHIND the
       planet and was still being drawn, projecting onto the disc as though it belonged there —
       which is how SEA OF JAPAN came to be lettered across the English Channel. It gets worse
       the closer you fly, because the true horizon closes in while the test does not move. */
    if (show && m.v.clone().normalize().dot(camDir) < R / S.dist) show = false;

    if (show) {
      const p = m.v.clone().project(camera);
      const sx = (p.x * 0.5 + 0.5) * rect.width, sy = (-p.y * 0.5 + 0.5) * rect.height;
      if (sx < -60 || sy < -30 || sx > rect.width + 60 || sy > rect.height + 30) show = false;
      else {
        /* collision: minor ports yield to everything already placed */
        const pad = m.kind === 'sea' ? 120 : (m.major ? 88 : 76);
        const vpad = m.kind === 'sea' ? 34 : 22;
        for (const t of taken) {
          if (Math.abs(t[0] - sx) < pad && Math.abs(t[1] - sy) < vpad) { show = false; break; }
        }
        if (show) {
          taken.push([sx, sy]);
          m.el.style.left = sx + 'px';
          m.el.style.top = sy + 'px';
        }
      }
    }
    m.el.style.opacity = show ? '1' : '0';
    m.el.style.pointerEvents = show ? 'auto' : 'none';
  }
}

function markersVisible() { lblTick = 0; }

/* ── eras ───────────────────────────────────────────────────────────────── */
function currentEra() {
  const chs = (APP.chapters && APP.chapters.chapters) || [];
  return chs[S.era] || null;
}

function buildChapters() {
  const strip = document.getElementById('eraStrip');
  strip.innerHTML = '';
  (APP.chapters.chapters || []).forEach((ch, i) => {
    const b = document.createElement('button');
    b.className = 'era';
    b.innerHTML = `<span class="en">${ch.short || ch.title}</span>
                   <span class="ey">${ch.years}</span>`;
    b.title = ch.title;
    b.onclick = () => { selectEra(i, true); writeHash(); };
    strip.appendChild(b);
  });
  selectEra(S.era, false);
  applyHash();          // after selectEra, which owns the slider's range and the year

  /* The URL is live state, not just a boot argument: back/forward and a pasted link both
     work, and a fragment-only navigation does not silently leave the app where it was. */
  window.addEventListener('hashchange', () => { applyHash(); applyHashView(); });
}

function selectEra(i, fly) {
  const chs = APP.chapters.chapters || [];
  if (!chs[i]) return;
  S.era = i;
  const ch = chs[i];
  document.querySelectorAll('.era').forEach((b, j) => b.classList.toggle('on', j === i));

  /* the year slider now runs only WITHIN the era, so it never spends its length on
     millennia that have nothing on them */
  S.year = ch.seek;
  const yr = document.getElementById('yr');
  yr.min = ch.from; yr.max = ch.to; yr.step = Math.max(1, Math.round((ch.to - ch.from) / 400));
  yr.value = S.year;
  /* the shipping of the era changes with the era */
  buildEraFleet();

  document.getElementById('eraHd').textContent = ch.title;
  document.getElementById('eraSm').innerHTML = ch.lede || (ch.text || '').split('\n\n')[0];
  onTime();
  buildVoyageList();
  if (fly && ch.view) flyTo(ch.view[0], ch.view[1], ch.view[2] || 330);
  if (fly) {
    showCard({ eyebrow: 'Era', title: ch.title, sub: ch.years,
               rows: ch.rows || [], prose: ch.text, span: ch.years, cite: ch.cite });
  }
}

/* ── the camera flies, rather than cutting ─────────────────────────────── */
let fly = null;
function flyTo(lon, lat, dist, ms = 1500) {
  fly = { t0: performance.now(), ms,
          a: { lon: S.lon, lat: S.lat, dist: S.dist },
          b: { lon, lat, dist } };
  /* take the short way round the globe */
  while (fly.b.lon - fly.a.lon > 180) fly.b.lon -= 360;
  while (fly.b.lon - fly.a.lon < -180) fly.b.lon += 360;
}
function stepFly(now) {
  if (!fly) return;
  const k = Math.min(1, (now - fly.t0) / fly.ms);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  S.lon = fly.a.lon + (fly.b.lon - fly.a.lon) * e;
  S.lat = fly.a.lat + (fly.b.lat - fly.a.lat) * e;
  S.dist = fly.a.dist + (fly.b.dist - fly.a.dist) * e;
  placeCamera();
  if (k >= 1) fly = null;
}

/* ── VOYAGES: a wake that draws itself, with a hull at the head ─────────
 * Not a dot moving along a line. The track is the ship's own wake — it accumulates behind and
 * fades, the way a real one does — and the mark at the head is a small generated silhouette of
 * the hull that made the passage, heading along its own course.
 */
let voyGroup = null, voyWake = null, voyShip = null;

function buildVoyageList() {
  const host = document.getElementById('voyList');
  const era = currentEra();
  const all = (APP.voyages && APP.voyages.voyages) || [];
  const mine = all.filter(v => era && v.year >= era.from && v.year <= era.to);
  host.innerHTML = '';
  if (!mine.length) {
    host.innerHTML = '<div style="font-size:11px;color:var(--ink-faint);line-height:1.6">' +
      'No voyage in this model is dated to this era.</div>';
    clearVoyage();
    return;
  }
  mine.forEach(v => {
    const b = document.createElement('button');
    b.className = 'voy' + (S.voyage && S.voyage.id === v.id ? ' on' : '');
    b.innerHTML = `<span class="vn">${v.name}</span><span class="vy">${v.dates}</span>`;
    b.onclick = () => startVoyage(v);
    host.appendChild(b);
  });
}

function clearVoyage() {
  if (voyGroup) { scene.remove(voyGroup); voyGroup = null; voyWake = null; voyShip = null; }
  S.voyage = null; S.voyPlaying = false;
}

function startVoyage(v) {
  clearVoyage();
  S.voyage = v; S.voyT = 0; S.voyPlaying = true;
  voyGroup = new THREE.Group();
  scene.add(voyGroup);

  /* densify the waypoints along great circles so the wake curves the way a real track does */
  const pts = [];
  for (let i = 0; i < v.legs.length - 1; i++) {
    const a = v.legs[i], b = v.legs[i + 1];
    const n = 26;
    for (let k = 0; k < n; k++) {
      const f = k / n;
      pts.push(slerpLonLat(a.lon, a.lat, b.lon, b.lat, f));
    }
  }
  pts.push([v.legs[v.legs.length - 1].lon, v.legs[v.legs.length - 1].lat]);
  APP.voyPts = pts;

  const pos = new Float32Array(pts.length * 3);
  const col = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => {
    const w = lonLatToVec(p[0], p[1], R * 1.004);
    pos[i * 3] = w.x; pos[i * 3 + 1] = w.y; pos[i * 3 + 2] = w.z;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setDrawRange(0, 0);
  voyWake = new THREE.Line(g, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.95, linewidth: 2 }));
  voyGroup.add(voyWake);

  /* the head: a small silhouette of the actual hull, not a dot */
  const ves = ((APP.vessels && APP.vessels.vessels) || []).find(x => x.id === v.vessel);
  if (ves && ves.hull) {
    const s = window.SHIPS_HULL.buildShip(ves.hull);
    const k = (R * 0.030) / ves.hull.loa;
    s.scale.setScalar(k);
    voyShip = new THREE.Group();
    voyShip.add(s);
    voyGroup.add(voyShip);
  }
  buildVoyageList();
  flyTo(v.view ? v.view[0] : pts[0][0], v.view ? v.view[1] : pts[0][1], v.view ? v.view[2] : 300);
  showCard({ eyebrow: 'Voyage', title: v.name, sub: v.dates, rows: v.rows || [],
             prose: v.text, span: v.dates, cite: v.cite, tags: v.tags });
}

/* great-circle interpolation between two lon/lat, which is the path a ship actually sails */
function slerpLonLat(lon1, lat1, lon2, lat2, f) {
  const p1 = lonLatToVec(lon1, lat1, 1), p2 = lonLatToVec(lon2, lat2, 1);
  const d = Math.acos(Math.max(-1, Math.min(1, p1.dot(p2))));
  if (d < 1e-6) return [lon1, lat1];
  const a = Math.sin((1 - f) * d) / Math.sin(d), b = Math.sin(f * d) / Math.sin(d);
  const v = new THREE.Vector3(p1.x * a + p2.x * b, p1.y * a + p2.y * b, p1.z * a + p2.z * b);
  const ll = vecToLonLat(v);
  return [ll.lon, ll.lat];
}

function stepVoyage(dt) {
  if (!S.voyage || !voyWake) return;
  const pts = APP.voyPts;
  if (S.voyPlaying) S.voyT = Math.min(1, S.voyT + dt * 0.055);
  const head = Math.max(1, Math.floor(S.voyT * (pts.length - 1)));
  voyWake.geometry.setDrawRange(0, head + 1);

  /* the wake fades behind the ship: bright at the head, gone a long way astern */
  const col = voyWake.geometry.attributes.color;
  for (let i = 0; i <= head; i++) {
    const age = (head - i) / Math.max(1, pts.length * 0.42);
    const k = Math.max(0.06, 1 - age);
    col.setXYZ(i, 0.92 * k + 0.05, 0.80 * k + 0.06, 0.42 * k + 0.08);
  }
  col.needsUpdate = true;

  if (voyShip) {
    const p = pts[head], q = pts[Math.max(0, head - 1)];
    const w = lonLatToVec(p[0], p[1], R * 1.008);
    voyShip.position.copy(w);
    /* stand the hull upright on the sphere and point it along its own course */
    const up = w.clone().normalize();
    const prev = lonLatToVec(q[0], q[1], R * 1.008);
    const fwd = w.clone().sub(prev).normalize();
    if (fwd.lengthSq() > 1e-9) {
      const m = tangentBasis(up, fwd);
      if (m) voyShip.quaternion.setFromRotationMatrix(m);
    }
  }
  if (S.voyT >= 1) S.voyPlaying = false;
}

/* ── card ───────────────────────────────────────────────────────────────── */
function showCard(c) {
  document.getElementById('cEyebrow').textContent = c.eyebrow || '';
  document.getElementById('cTitle').textContent = c.title || '';
  document.getElementById('cSub').textContent = c.sub || '';
  const rows = document.getElementById('cRows');
  rows.innerHTML = '';
  (c.rows || []).forEach(r => {
    const d = document.createElement('div');
    d.innerHTML = `<span class="k">${r[0]}</span><span class="v">${r[1]}</span>`;
    rows.appendChild(d);
  });
  rows.style.display = (c.rows && c.rows.length) ? '' : 'none';
  const prose = document.getElementById('cProse');
  let html = '';
  if (c.tags) html += c.tags.map(t =>
    `<span class="tag ${t.toLowerCase()}">${t}</span>`).join('') + '<br>';
  html += (c.prose || '').split('\n\n').map(p => `<p>${p}</p>`).join('');
  prose.innerHTML = html;
  document.getElementById('cSpan').textContent = c.span || '';
  document.getElementById('cCite').textContent = c.cite || '';
  document.getElementById('card').classList.remove('hidden');
}

/* ── readout ────────────────────────────────────────────────────────────── */
function updateReadout() {
  const ch = currentEra();
  document.getElementById('roEra').textContent = ch ? ch.title : '—';
  document.getElementById('roDate').textContent = yearLabel(S.year);
  const mi = Math.floor(S.month) % 12;
  const rows = [`<b>${MONTH_NAMES[mi]}</b> on the water`];
  const sl = seaLevelAt(S.year);
  if (sl < -3) rows.push(`Sea level <b>${Math.round(-sl)} m</b> lower`);
  if (ch && ch.stat) rows.push(ch.stat);
  document.getElementById('roStats').innerHTML = rows.join('<br>');
}

/* ── UI ─────────────────────────────────────────────────────────────────── */
function onTime() {
  document.getElementById('yrLab').textContent = yearLabel(S.year);
  /* Sea level from the Spratt & Lisiecki stack, for deep time. Interpolated linearly in
     thousands of years; zero at the present. The defensibility ladder is stated in About. */
  mat.uniforms.uSeaLevel.value = seaLevelAt(S.year);
  updateReadout();
  markersVisible();
}

/* Spratt & Lisiecki 2016 sea-level stack, thinned to the points that matter for seafaring.
   Metres relative to present. Beyond ~70 ka this model does not go, and the app does not ask. */
const SEA_LEVEL = [
  [-68000, -70], [-60000, -68], [-50000, -78], [-40000, -80], [-30000, -90],
  [-26000, -110], [-21000, -122], [-18000, -115], [-15000, -95], [-12000, -62],
  [-10000, -40], [-8000, -22], [-6000, -6], [-4000, -2], [-2000, -0.5], [0, 0], [2026, 0],
];
function seaLevelAt(y) {
  if (y >= 0) return 0;
  for (let i = 1; i < SEA_LEVEL.length; i++) {
    const a = SEA_LEVEL[i - 1], b = SEA_LEVEL[i];
    if (y <= b[0]) return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
  }
  return 0;
}

function setMonthTextures() {
  const mi = Math.floor(S.month) % 12;
  const a = String(mi + 1).padStart(2, '0');
  const b = String((mi + 1) % 12 + 1).padStart(2, '0');
  if (APP.curMonth === mi) return;
  APP.curMonth = mi;
  Promise.all([
    loadTex(`fields/sea_${a}.png`), loadTex(`fields/sea_${b}.png`),
    loadTex(`fields/wind_${a}.png`), loadTex(`fields/wind_${b}.png`),
  ]).then(([sa, sb, wa, wb]) => {
    mat.uniforms.uSeaA.value = sa; mat.uniforms.uSeaB.value = sb;
    mat.uniforms.uWindA.value = wa; mat.uniforms.uWindB.value = wb;
  }).catch(() => {});
}

function wireUI() {
  const yr = document.getElementById('yr');
  yr.addEventListener('input', () => { S.year = +yr.value; onTime(); writeHash(); });
  document.getElementById('eraAbout').onclick = openAbout;
  wireTabs();
  document.getElementById('swOpen').onclick = () => {
    const v = window.SHIPS_YARD.YARD.spec;
    window.SHIPS_YARD.yardClose();
    if (v) { setView('ship'); window.SHIPS_SW.swOpen(v); }
  };
  document.getElementById('btOpen').onclick = () => {
    if (S.camp) window.SHIPS_BT.btOpen(S.camp);
  };
  document.getElementById('campClose').onclick = () => {
    clearCampaign();
    document.getElementById('campBar').classList.add('hidden');
  };
  document.getElementById('yardClose').onclick = () => window.SHIPS_YARD.yardClose();
  document.getElementById('yardCard').onclick = () => {
    const v = window.SHIPS_YARD.YARD.spec;
    window.SHIPS_YARD.yardClose();
    if (v) openVessel(v);
  };

  const m = document.getElementById('month');
  m.addEventListener('input', () => {
    S.month = +m.value;
    document.getElementById('monthName').textContent = MONTH_NAMES[Math.floor(S.month) % 12];
    setMonthTextures();
    updateReadout();
  });

  document.getElementById('monthPlay').onclick = e => {
    S.monthPlaying = !S.monthPlaying;
    e.target.classList.toggle('on', S.monthPlaying);
  };
  document.getElementById('cardClose').onclick = () =>
    document.getElementById('card').classList.add('hidden');

  const map = { lySeafloor: 'seafloor', lyWind: 'wind', lyChl: 'chl', lyIce: 'ice',
                lyCloud: 'cloud', lyPorts: 'ports', lyReach: 'reach' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      S.layers[key] = el.checked ? 1 : 0;
      const u = 'uLy' + key.charAt(0).toUpperCase() + key.slice(1);
      if (mat.uniforms[u]) mat.uniforms[u].value = S.layers[key];
      markersVisible();
      if (key === 'reach' && el.checked && !S.reachFrom) {
        showCard({ eyebrow: 'Reachability', title: 'Pick a port',
          prose: 'Click any port on the globe and the ocean fills with the time it takes to get there — computed for the month you are looking at, from the wind field, with a hull you choose.\n\nThis is the model’s own output, not a drawing.' });
      }
    });
  });

  document.querySelectorAll('[data-about]').forEach(b => b.onclick = openAbout);
  document.getElementById('aboutClose').onclick = () =>
    document.getElementById('about').classList.add('hidden');

  /* camera: drag to spin, wheel to zoom */
  const cv = renderer.domElement;
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    const P = window.SHIPS_PSG ? window.SHIPS_PSG.PSG : null;
    drag = { x: e.clientX, y: e.clientY, lon: S.lon, lat: S.lat, moved: 0,
             orbit: P ? P.orbit : 0, elev: P ? P.elev : 0 };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    fly = null;                                   // a hand on the globe always wins
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (PSGV.on) {
      /* in the Passage, drag walks you round the ship rather than round the Earth */
      const P = window.SHIPS_PSG.PSG;
      P.orbit = drag.orbit - dx * 0.0075;
      P.elev = Math.max(0.02, Math.min(3.0, drag.elev + dy * 0.0035));
      return;
    }
    /* ── ⚠ DRAG SHOULD FOLLOW THE GROUND, NOT THE CAMERA'S DISTANCE FROM THE CENTRE ──
       S.dist runs 112 to 700 on a globe of radius 100, so dividing by it changes the gain
       only sixfold across the whole zoom range. But what the cursor is actually chasing is
       the ground, and the ground's apparent speed goes with ALTITUDE ABOVE THE SURFACE —
       12 units when you are close in against 600 when you are out. That is a fiftyfold
       range, which is why a drag that felt right zoomed out threw the globe across the
       screen zoomed in. Height above the surface, not radius from the middle. */
    const k = Math.max(0.03, (S.dist - R) / 600);
    S.lon = drag.lon - dx * 0.28 * k;
    S.lat = Math.max(-84, Math.min(84, drag.lat + dy * 0.28 * k));
    placeCamera();
  });
  cv.addEventListener('pointerup', ev => {
    /* ── CLICK A SHIP, AND GO DOWN TO HER ───────────────────────────────────────────
       A drag that happens to end over a hull is not a click on it, so the same `moved`
       accumulator the port markers use guards this.

       ⚠ THIS USED TO OPEN THE SHIPWRIGHT, and that was the wrong destination. The
       Shipwright is a hull on a plinth under studio light: going there from the ocean
       throws away everything the click was about — where she is, what the sea is doing,
       which way she is heading, what land is in sight. The Passage keeps all of it and
       shows the same model at the same detail. The Shipwright is still one tab away for
       anyone who wants to take her apart. */
    const wasDrag = drag && drag.moved > 6;
    drag = null;
    if (wasDrag) return;
    const tr = pickShip(ev);
    if (tr && tr.vesselId) openPassage(tr);
  });
  cv.addEventListener('pointermove', ev => {
    if (drag) return;                       // dragging the globe is not hovering a ship
    if (PSGV.on) return;
    setHover(pickShip(ev));
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    fly = null;
    if (PSGV.on) {
      /* in the Passage the wheel changes how far off you stand, in ship-lengths */
      const P = window.SHIPS_PSG.PSG;
      P.dist = Math.max(0.65, Math.min(14, P.dist * (1 + Math.sign(e.deltaY) * 0.11)));
      return;
    }
    S.dist = Math.max(112, Math.min(700, S.dist * (1 + Math.sign(e.deltaY) * 0.11)));
    placeCamera();
  }, { passive: false });

  addEventListener('resize', resize);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('card').classList.add('hidden');
      document.getElementById('about').classList.add('hidden');
    }
  });
}

/* ── resize / frame ─────────────────────────────────────────────────────── */
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}

/* ── ⚠ requestAnimationFrame DOES NOT FIRE IN A HIDDEN TAB ─────────────────────────────
 * Browsers suspend rAF entirely when document.hidden is true. That is correct behaviour and
 * good for battery — but this app calls nextFrame(frame) as the LAST step of boot,
 * so a page loading in a background tab finished every fetch, built every buffer, and then
 * froze one line short of running: splash still up, canvas black, progress bar at 100%.
 * Switching to the tab did not help, because nothing had cleared the splash.
 *
 * It is also why the model could not be verified from an automated browser pane, which reports
 * itself hidden permanently. A view you cannot look at is a view you cannot check, and this
 * project's first rule is that a change is not done until it has been rendered and looked at.
 *
 * So: rAF when visible, a timer when not. The timer runs at ~20 fps rather than 60 — enough to
 * finish boot, keep state consistent and let a screenshot capture something real, without
 * spending a laptop battery animating a globe nobody is looking at. */
function nextFrame(fn) {
  if (document.hidden) setTimeout(() => fn(performance.now()), 50);
  else requestAnimationFrame(fn);
}

/* Re-arm the loop, and record that a frame has been painted. Every branch of frame() goes
   through here, so __FRAME_READY is true once *something* has rendered, whichever view is up. */
function armNext() { markReady(); nextFrame(frame); }

let last = performance.now();
function frame(now) {
  const rawDt = Math.min(0.1, (now - last) / 1000); last = now;

  /* In capture mode nothing advances and every clock reads the same instant. dt = 0 stops
     the voyage, the campaign and the month; `t` replaces the rAF timestamp everywhere it
     would otherwise leak wall-clock into the picture. */
  const dt = FROZEN ? 0 : rawDt;
  const t  = FROZEN ? FROZEN_S * 1000 : now;

  /* ⚠ EVERY EARLY EXIT FROM THIS FUNCTION MUST RE-ARM THE LOOP FIRST. A bare `return` here
     skipped requestAnimationFrame, so the Shipwright rendered exactly one frame and then the
     entire app froze — including after you closed it again. */
  if (window.SHIPS_BT && window.SHIPS_BT.BT.on) {
    window.SHIPS_BT.btFrame(t, dt);
    armNext();
    return;
  }
  if (window.SHIPS_SW && window.SHIPS_SW.SW.on) {
    window.SHIPS_SW.swFrame(t);
    armNext();
    return;
  }
  if (window.SHIPS_YARD && window.SHIPS_YARD.YARD.on) {
    window.SHIPS_YARD.yardFrame(t);
    armNext();
    return;                                     // the globe is not being looked at
  }

  /* A camera flight interpolates against wall-clock, so a frozen `t` would strand it
     part-way. Snap it to its destination instead: a capture wants the arrival, not the
     journey. */
  if (FROZEN && fly) { fly.t0 = -1e9; }
  stepFly(t);
  stepVoyage(dt);
  stepCampaign(dt);
  stepEraFleet(clockS());
  updateLabels(t);

  if (S.monthPlaying && !FROZEN) {
    S.month = (S.month + dt * 1.1) % 12;
    document.getElementById('month').value = S.month;
    document.getElementById('monthName').textContent = MONTH_NAMES[Math.floor(S.month) % 12];
    setMonthTextures();
  }

  /* ── THE PASSAGE ────────────────────────────────────────────────────────────────────
     Runs BEFORE the globe's own uniforms are set, because it moves the globe camera: the
     backdrop must be sampled from where the eye actually is, and uCam set from a camera
     that is about to be moved is a lit-from-nowhere ocean. */
  if (PSGV.on && PSGV.track && PSGV.track.at) {
    const A = PSGV.track.at;
    /* ── THE SEA SHE IS IN IS THE SEA THE GLOBE SAYS IS THERE ────────────────────────
       Reading the wind out of the shipped climatology at her own position and month, rather
       than picking a number that looks nice, is what makes this a view OF the model instead
       of a view beside it: a hull in the Roaring Forties gets a Roaring Forties sea and one
       in the doldrums gets glass, without either being arranged. Until the field is decoded
       the fallback is stated here rather than hidden — 7 m/s, a working breeze. */
    const w = window.SHIPS_ROUTE.windAt(A.lon, A.lat, S.month);
    PSGV.wind = w ? Math.max(1.5, Math.min(17, w.speed)) : 7.0;
    window.SHIPS_PSG.psgStep(clockS(), A.u, A.lon, A.lat, A.hdg, R,
                             sunVector(S.month), PSGV.wind, camera);
    passageReadout(A.lon, A.lat, A.hdg, PSGV.wind);
  }

  mat.uniforms.uMonthMix.value = S.month - Math.floor(S.month);
  mat.uniforms.uTime.value = t / 1000;
  mat.uniforms.uSun.value.copy(sunVector(S.month));
  mat.uniforms.uCam.value.copy(camera.position);

  /* ── HOW MUCH OCEAN IS IN ONE PIXEL ─────────────────────────────────────────────────
     Everything about the appearance of water follows from this one number. Half a million
     metres per pixel and the sea is a colour; half a metre and it is a surface with a shape.
     Deriving it rather than guessing at a zoom factor is what lets the shader decide which
     wave components exist at all, instead of drawing detail the frame cannot resolve — the
     failure that once turned the Roaring Forties into television static. */
  const altU = Math.max(0.0004, camera.position.length() - R);
  const altM = altU * (6371000 / R);
  /* ⚠ renderer.domElement, not a bare `canvas` — that identifier is a local const in the
     setup function and does not exist here. Reaching for it threw INSIDE the frame callback,
     which skipped armNext() and stopped the loop dead; the symptom was a black globe with
     working panels, which reads as a broken shader and is not one. The file already carries
     this warning ten lines up. Read it next time. */
  const mpp = 2 * altM * Math.tan(camera.fov * Math.PI / 360)
              / Math.max(1, renderer.domElement.clientHeight);
  mat.uniforms.uMPP.value = mpp;
  /* 0 at half a continent per screen, 1 once a screen is a few kilometres of sea */
  const lg = Math.log(Math.max(mpp, 0.02));
  mat.uniforms.uZoom.value = Math.max(0, Math.min(1,
    (Math.log(3000) - lg) / (Math.log(3000) - Math.log(4))));
  mat.uniforms.uRef.value.set(S.lon * Math.PI / 180, S.lat * Math.PI / 180);
  /* the globe's own waves take the wind under the camera's sub-point, so a sea state seen from
     above and the same sea state seen from a deck are the same sea state */
  {
    const gw = window.SHIPS_ROUTE && window.SHIPS_ROUTE.windAt
             ? window.SHIPS_ROUTE.windAt(S.lon, S.lat, S.month) : null;
    const uw = PSGV.on ? (PSGV.wind || 7) : (gw ? Math.max(1.5, Math.min(17, gw.speed)) : 7);
    mat.uniforms.uWind.value = uw;
    SHIPS_SEA.updateWaveUniform(mat.uniforms.uWave.value, uw);
  }

  if (PSGV.on && window.SHIPS_PSG.PSG.on) {
    /* ── TWO SCALES, ONE FRAME ────────────────────────────────────────────────────────
       The Earth first, with a near plane measured in tens of kilometres, so its depth buffer
       has the precision a planet needs. Then the depth is cleared and the ship and her water
       are drawn with a near plane of 35 cm. Sharing one depth range between a 6371 km sphere
       and a plank would give neither of them any precision at all — the ship would z-fight
       with itself and the horizon would tear.

       The near-field pass is drawn second and unconditionally in front, which is correct:
       everything in it is within seven kilometres, and everything in the backdrop is the
       distance beyond that. */
    const keepNear = camera.near, keepFar = camera.far;
    camera.near = 0.02; camera.far = 4000;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    camera.near = keepNear; camera.far = keepFar;
    camera.updateProjectionMatrix();
    renderer.clearDepth();
    renderer.render(window.SHIPS_PSG.PSG.scene, window.SHIPS_PSG.PSG.cam);
  } else {
    renderer.render(scene, camera);
  }
  armNext();
}

/* ── ports, and the reachability the routing engine computes from them ─────────── */
function vesselsAtYear(y) {
  const all = (APP.vessels && APP.vessels.vessels) || [];
  const live = all.filter(v => y >= v.from && y <= v.to);
  return live.length ? live : all;
}

/* ── a vessel's card, with the way into the Yard ────────────────────────── */
function openVessel(v) {
  const H = v.hull;
  const rows = (v.rows || []).slice();
  if (H) {
    rows.push(['Generated from', `${H.loa} × ${H.beam} × ${H.draught} m, Cm ${H.cm}`]);
  }
  showCard({
    eyebrow: 'Vessel', title: v.name, sub: v.sub || '',
    rows, prose: v.text, span: v.era ? `${yearLabel(v.era[0])} – ${yearLabel(v.era[1])}` : '',
    cite: v.cite, tags: [v.attestation, v.confidence].filter(Boolean)
                        .map(s => s[0].toUpperCase() + s.slice(1)),
  });
  const host = document.getElementById('cProse');
  const box = document.createElement('div');
  box.style.cssText = 'margin-top:14px;border-top:1px solid var(--edge);padding-top:12px';
  box.innerHTML =
    `<div style="font-size:11.5px;color:var(--ink-dim);line-height:1.6;margin-bottom:9px">
       <b style="color:var(--verdigris)">${v.polar.rig}.</b> ${v.polar.rigNote}</div>` +
    (H ? '<button id="toYard" class="mini" style="width:100%">See the hull</button>' : '');
  host.appendChild(box);
  if (H) document.getElementById('toYard').onclick = () => window.SHIPS_YARD.yardOpen(v);
}

function openPort(p) {
  showCard({
    eyebrow: p.eyebrow || 'Port', title: p.name, sub: p.modern || '',
    rows: p.rows || [], prose: p.text || '', span: p.span || '', cite: p.cite || '',
    tags: p.tags,
  });
  /* ── ⚠ "SAIL FROM HERE" IS GONE, DELIBERATELY ───────────────────────────────────────
     The panel offered a hull picker, a passage-field computation and a "See that hull"
     button. The button opened the YARD — an older, cruder model that predates the Shipwright
     — so following it took you from a port card to a PRIMITIVE version of a vessel you can
     inspect properly one tab away. The picker also listed only the hulls alive in the
     selected year, so it never showed the fleet. And the passage field, though a real
     calculation off the model's own polars, rendered as a grey wash: a true thing that did
     not look like anything.
     The calculation is worth keeping and will come back in a form that earns its pixels. A
     control that leads somewhere worse than where you already were is not worth keeping in
     the meantime. */
}

/* ── THE CAMPAIGN: A BATTLE THAT MOVES ──────────────────────────────────────────────────
 * A battle card is a still, and a still cannot make this project's argument — that a campaign
 * IS a wind field with a fleet in it. So a battle carrying a `campaign` plays: two fleets run
 * their real day-by-day tracks over the real ocean, and the WIND of each day, from the
 * commander's journal, blows across the water while they do.
 *
 * The wind is drawn as drifting streaks on the sea surface, not as an arrow. An arrow is a
 * symbol pointing at a fact; streaks ARE the fact, and you can read the shift at Portland and
 * the veer that saved the Armada off Zeeland straight off the water without a legend.
 *
 * What the geometry says without a word of commentary: on twelve of thirteen days the English
 * fleet lies UPWIND of the Armada. That is the whole military story of 1588.
 */
/* ── THE ERA FLEET: THE OCEAN WITH SHIPPING ON IT ───────────────────────────────────────
 *
 * An empty ocean is a map. An ocean with hulls moving on it is a period.
 *
 * Every ship here is the SAME MODEL the Shipwright builds — SHIPS_HULL.buildShip on the same
 * hull record — so a vessel cannot look like one thing in one view and another thing in the
 * next. When the Shipwright's junk gains a settee or its topmasts, the junk out on the ocean
 * gains them in the same build. There is no second model to drift.
 *
 * ── AND THE ROUTES ARE REAL ────────────────────────────────────────────────────────────
 * They come from voyages.json — the tracks already researched for this project, each tying a
 * vessel to a chain of waypoints it actually sailed. So the dhow runs the monsoon crossing,
 * the carracks work the Carreira da India, the clipper comes home round the Horn, and the
 * box boat runs Asia to Europe. A ship on the wrong ocean would be worse than no ship.
 *
 * They loop, because the whole point of a trade route is that it repeats. A voyage is a line;
 * a TRADE is a line travelled until the ship wears out.
 *
 * ── WHY THEY ARE TOKENS AND NOT SCALE MODELS ───────────────────────────────────────────
 * At true scale a 42 m carrack on a 6,371 km globe is a third of a pixel. So the hull is
 * scaled with the CAMERA, holding one legible size on screen at every zoom, exactly as the
 * campaign fleets do. That is a deliberate lie about size and the only one in the view; the
 * ROUTE, the speed and the ship itself are all true.
 */
let eraFleet = null, eraTracks = [];

/* ── PUTTING A TRACK ON THE WATER ────────────────────────────────────────────────────────
 * A voyage's legs are five to twenty waypoints for a whole circumnavigation, so the straight
 * run between two of them regularly crosses a continent — Magellan's Atlantic waypoint to his
 * Pacific one goes through Argentina. Slerping fixed the projection but not the geography.
 *
 * So each leg is DENSIFIED along the great circle and every sample tested against the same
 * depth field the seafloor layer draws. A sample on land is walked out to sea along the
 * perpendicular to its course, trying both hands and taking the shorter — which is what
 * standing off a headland is. The result is not a shortest-water-path solver; it is a track
 * that follows the researched waypoints and never crosses the beach between them.
 *
 * ⚠ AND IT RUNS ONCE, AT BUILD. Testing the depth grid every frame for every hull would put a
 * texture read in the animation loop for no gain: the route does not change while you watch it.
 */
/* ── FROM A LIST OF PLACES TO A TRACK A SHIP COULD STEER ───────────────────────────────
   A voyage is stored as the places it is known to have touched. Those are not a course: the
   straight line from Bristol to the western approaches goes overland across Cornwall, and the
   line from Nanjing to Champa crosses China. Each consecutive pair is handed to the passage
   search, which returns a track through open water only.

   Two rules the previous version broke, both worth naming:
     * The SEGMENTS are what must be clear, not the samples. Checking points and then drawing
       lines between them tests the one thing that cannot go wrong.
     * A leg that cannot be routed must not be silently skipped. Dropping a waypoint deletes
       a corner and the ship then runs the shortcut instead — which is precisely how a hull
       ended up sitting on Brittany. If the search fails, the leg is kept as given and counted,
       so the failure is visible rather than drawn as a plausible course. */
let seaRouteMisses = 0;
function seaRoute(legs) {
  const RT = window.SHIPS_ROUTE;
  const out = [];
  const push = (lon, lat) => {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.lon - lon) > 0.02 || Math.abs(last.lat - lat) > 0.02)
      out.push({ lon, lat });
  };
  for (let i = 0; i < legs.length - 1; i++) {
    const a = legs[i], b = legs[i + 1];
    const path = (RT && RT.seaPath) ? RT.seaPath(a.lon, a.lat, b.lon, b.lat) : null;
    if (!path) { seaRouteMisses++; push(a.lon, a.lat); push(b.lon, b.lat); continue; }
    for (const p of path) push(p.lon, p.lat);
  }
  return out.length > 1 ? out : legs;
}

function clearEraFleet() {
  setHover(null);
  if (eraFleet) { scene.remove(eraFleet); }
  eraFleet = null; eraTracks = [];
}

function buildEraFleet() {
  clearEraFleet();
  const ch = (APP.chapters && APP.chapters.chapters) ? APP.chapters.chapters[S.era] : null;
  if (!ch || !APP.voyages || !APP.vessels) return;
  const from = ch.from, to = ch.to;
  const vy = (APP.voyages.voyages || APP.voyages).filter(v =>
    v.legs && v.legs.length > 1 && v.year >= from && v.year <= to);
  if (!vy.length) return;

  eraFleet = new THREE.Group();
  const list = APP.vessels.vessels || APP.vessels;
  for (const v of vy) {
    const ves = list.find(x => x.id === v.vessel);
    if (!ves || !ves.hull) continue;
    let proto;
    try { proto = window.SHIPS_HULL.buildShip(ves.hull); } catch (e) { continue; }

    /* Ships sail in company where it was the practice and alone where it was not. A treasure
       fleet, an Indies convoy and a battle squadron moved together; a clipper raced alone
       and a lone canoe is the whole point of the Pacific story. */
    const together = /treasure|carrack|indiaman/.test(v.vessel) ? 3
                   : /container|steamer/.test(v.vessel) ? 1
                   : /canoe|dugout/.test(v.vessel) ? 2 : 1;
    const grp = new THREE.Group();
    for (let n = 0; n < together; n++) {
      const holder = new THREE.Group();
      const sh = n === 0 ? proto : proto.clone();
      /* ── ⚠ THEY WERE SAILING STERN-FIRST ────────────────────────────────────────
         The hull's bow is at local -X and the holder's forward is +Z, so the map is a
         quarter turn about Y — but a turn of +PI/2, not -PI/2. Rotating about Y by theta
         sends x to x cos + z sin: at -PI/2 the bow (-1,0,0) lands on (0,0,-1), which is
         DEAD ASTERN. The campaign fleets a hundred lines below had it right the whole time
         and I wrote the opposite sign into the new one. */
      sh.rotation.y = Math.PI / 2;
      holder.add(sh);
      const L0 = ves.hull.loa;
      const t = together === 1 ? 0 : (n - (together - 1) / 2);
      /* ── ⚠ A CONSORT'S STATION IS ON THE SPHERE, NOT ON THE TANGENT PLANE ────────
         These offsets are in the group's local frame, which is flat. At the token's
         exaggeration one ship-length is about 210 km of ocean, so the old 5-lengths
         abeam put a consort a THOUSAND kilometres out along a plane that the Earth has
         already curved away from — and the plane does not curve with it. Even after the
         handedness fix that left ships 145 km up.

         Two changes. The formation closes to a working squadron interval — the eye reads
         "in company" from the ratio to the ship's own drawn length, not from absolute
         distance — and the station is then DROPPED onto the sphere. The Earth's radius in
         these local units is R / scale, and the drop is the sagitta of the chord; second
         order is exact to a metre at any interval a fleet would keep.
         Applied in stepEraFleet, because the scale changes with the camera. */
      holder.position.set(t * L0 * 1.9, 0, -Math.abs(t) * L0 * 1.5);
      holder.userData.station = { x: holder.position.x, z: holder.position.z };
      grp.add(holder);
    }
    grp.userData.loa = ves.hull.loa;
    eraFleet.add(grp);

    /* speed is the vessel's own best, so a clipper crosses while a cog is still in the Bight */
    const kn = (ves.polar && ves.polar.best) || ves.speedKn || 6;
    eraTracks.push({ grp, legs: seaRoute(v.legs), kn, vesselId: v.vessel,
                     phase: (eraTracks.length * 0.37) % 1, name: v.name });
  }
  if (eraFleet.children.length) scene.add(eraFleet); else eraFleet = null;
}

/* ── HOVER: THE SHIP, HER NAME, AND HER TRACK ───────────────────────────────────────────
 * A token you cannot interrogate is decoration. Hovering lifts one ship out of the fleet and
 * draws the route she is running, in the manner of a chart: a thin line, no glow, no arrows.
 *
 * The line is the ROUTED track — the same array of points the ship is following, already
 * pushed clear of the land — so what you see is exactly what she sails. It cannot be a
 * prettier version of the path, because it is the path.
 */
let hoverTrack = null, hoverLine = null, hoverTag = null;

function makeHoverLine(pts) {
  const v = [];
  for (const p of pts) { const w = lonLatToVec(p.lon, p.lat, R * 1.004); v.push(w.x, w.y, w.z); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return new THREE.Line(g, new THREE.LineBasicMaterial({
    color: 0xe8dcc0, transparent: true, opacity: 0.62 }));
}

function setHover(tr) {
  if (hoverTrack === tr) return;
  if (hoverLine) { scene.remove(hoverLine); hoverLine.geometry.dispose(); hoverLine = null; }
  hoverTrack = tr;
  if (!hoverTag) {
    hoverTag = document.createElement('div');
    hoverTag.style.cssText = 'position:fixed;pointer-events:none;z-index:60;font-size:11px;' +
      'letter-spacing:.10em;text-transform:uppercase;color:#efe6d2;text-shadow:0 1px 3px #000;' +
      'display:none;font-family:inherit';
    document.body.appendChild(hoverTag);
  }
  if (!tr) { hoverTag.style.display = 'none'; document.body.style.cursor = ''; return; }
  hoverLine = makeHoverLine(tr.legs);
  scene.add(hoverLine);
  hoverTag.textContent = tr.name;
  hoverTag.style.display = 'block';
  document.body.style.cursor = 'pointer';
}

/* ══ THE PASSAGE ══════════════════════════════════════════════════════════════════════════
 * Clicking a hull on the ocean takes you down to her. The state here is deliberately thin —
 * which track, and how far the descent has got — because everything else lives in passage.js
 * and everything about WHERE she is comes from the same stepEraFleet that drives the piece on
 * the globe. Two models of one ship's position would put her in two places at once, and the
 * second one would look entirely plausible.
 */
const PSGV = { on: false, track: null, t: 0, card: null };

function openPassage(tr) {
  const list = APP.vessels.vessels || APP.vessels;
  const ves = list.find(x => x.id === tr.vesselId);
  if (!ves || !ves.hull || !window.SHIPS_PSG) return;
  if (!window.SHIPS_PSG.psgOpen(tr, ves, R, camera)) return;
  PSGV.on = true; PSGV.track = tr;
  setHover(null);
  if (eraFleet) eraFleet.visible = false;      // the pieces are 400x scale; not from down here
  if (hoverLine) { scene.remove(hoverLine); hoverLine = null; }
  passageCard(tr, ves);
  document.body.classList.add('in-passage');
}

function closePassage() {
  if (!PSGV.on) return;
  PSGV.on = false; PSGV.track = null;
  window.SHIPS_PSG.psgClose();
  if (eraFleet) eraFleet.visible = true;
  if (PSGV.card) PSGV.card.style.display = 'none';
  document.body.classList.remove('in-passage');
  placeCamera();
}

/* ── THE CARD ────────────────────────────────────────────────────────────────────────────
 * What a chart-room would tell you and nothing else: which ship, which passage, and the
 * position she is actually at, read off the model rather than written down beside it. */
function passageCard(tr, ves) {
  if (!PSGV.card) {
    const d = document.createElement('div');
    d.id = 'psgCard';
    d.innerHTML = '<button id="psgBack">↑ back to the ocean</button>' +
      '<div class="pc-ship"></div><div class="pc-voy"></div>' +
      '<table class="pc-rows"></table>';
    document.body.appendChild(d);
    PSGV.card = d;
    d.querySelector('#psgBack').onclick = closePassage;
  }
  const c = PSGV.card;
  c.style.display = 'block';
  c.querySelector('.pc-ship').textContent = ves.name;
  c.querySelector('.pc-voy').textContent = tr.name;
  const H = ves.hull;
  const rows = [
    ['Length overall', H.loa.toFixed(1) + ' m'],
    ['Beam', H.beam.toFixed(1) + ' m'],
    ['Draught', H.draught.toFixed(2) + ' m'],
    ['Best speed', ((ves.polar && ves.polar.best) || ves.speedKn || 6).toFixed(1) + ' kn'],
  ];
  c.querySelector('.pc-rows').innerHTML =
    rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') +
    '<tr><td>Position</td><td class="pc-pos">—</td></tr>' +
    '<tr><td>Course</td><td class="pc-crs">—</td></tr>' +
    '<tr><td>Wind</td><td class="pc-wnd">—</td></tr>';
}

/* Beaufort, because a number in metres per second is data and a force is a sea state — and
   the sea state is the thing actually on screen. Thresholds are the standard ones. */
const BEAUFORT = [0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
const BF_NAME = ['calm', 'light air', 'light breeze', 'gentle breeze', 'moderate breeze',
  'fresh breeze', 'strong breeze', 'near gale', 'gale', 'strong gale', 'storm',
  'violent storm', 'hurricane'];

function passageReadout(lon, lat, hdgRad, wind) {
  if (!PSGV.card) return;
  const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
  const fmt = (v, s) => Math.floor(Math.abs(v)) + '° ' +
    String(Math.round((Math.abs(v) % 1) * 60)).padStart(2, '0') + '′ ' + s;
  const pos = PSGV.card.querySelector('.pc-pos');
  const crs = PSGV.card.querySelector('.pc-crs');
  const wnd = PSGV.card.querySelector('.pc-wnd');
  if (pos) pos.textContent = fmt(lat, ns) + '  ' + fmt(lon, ew);
  if (crs) crs.textContent = String(Math.round(((hdgRad * 180 / Math.PI) % 360 + 360) % 360))
    .padStart(3, '0') + '°';
  if (wnd && wind !== undefined) {
    let f = 0; while (f < BEAUFORT.length && wind > BEAUFORT[f]) f++;
    wnd.textContent = 'force ' + f + ', ' + BF_NAME[f];
  }
}

/* the raycast is against a coarse sphere at each ship, not the hull: a hull is a few hundred
   triangles of rigging and testing them all every mousemove is a cost with no benefit */
function pickShip(ev) {
  if (!eraFleet || !eraTracks.length) return null;
  const cv = renderer.domElement, rect = cv.getBoundingClientRect();
  const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(nx, ny), camera);
  let best = null, bestD = Infinity;
  for (const tr of eraTracks) {
    const c = tr.grp.position;
    /* a ship is drawn at a camera-relative size, so its pick radius must be too */
    const rad = (S.dist * 0.0098) * 1.6;
    const d = rc.ray.distanceToPoint(c);
    if (d < rad && c.distanceTo(camera.position) < bestD) { best = tr; bestD = c.distanceTo(camera.position); }
  }
  return best;
}

function stepEraFleet(t) {
  if (!eraFleet) return;
  for (const tr of eraTracks) {
    const n = tr.legs.length;
    /* one full circuit in a time proportional to the track's length over the ship's speed,
       so a fast hull on a short run laps a slow one on a long one, as it would */
    /* ── AND THE PACE OF A VOYAGE ──────────────────────────────────────────────────
       Da Gama took two years to reach India and get home. Nobody will watch that, but the
       opposite error — a circumnavigation every second — says the sea is small, which is the
       one thing this whole project exists to deny. Several minutes per circuit: long enough
       that a ship is somewhere rather than everywhere, short enough to see it move. */
    const period = Math.max(240, n * 26 / Math.max(2, tr.kn) * 34);
    const u = ((t / period) + tr.phase) % 1;
    const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), fr = f - i;
    const a = tr.legs[i], b = tr.legs[i + 1];
    /* ── ⚠ AND TWO OF THEM WERE SAILING ACROSS BRAZIL ───────────────────────────────
       Interpolating lon/lat linearly between two waypoints does not follow the sphere: it
       cuts the chord in the map's flat coordinates, so a leg from the Atlantic side of Cape
       Horn to the Pacific side runs straight through South America. Slerp between the two
       positions as VECTORS ON THE SPHERE instead and the path is the great circle the ship
       would actually have steered. It does not make the track avoid land by itself — that
       needs denser waypoints — but it stops the interpolation inventing overland shortcuts. */
    const va = lonLatToVec(a.lon, a.lat, 1), vb = lonLatToVec(b.lon, b.lat, 1);
    const dot = Math.max(-1, Math.min(1, va.dot(vb)));
    const ang = Math.acos(dot);
    const dir = ang < 1e-6 ? va.clone()
      : va.clone().multiplyScalar(Math.sin((1 - fr) * ang) / Math.sin(ang))
          .add(vb.clone().multiplyScalar(Math.sin(fr * ang) / Math.sin(ang)));
    dir.normalize();
    const la = Math.asin(dir.y) * 180 / Math.PI;
    /* ⚠ the inverse must match lonLatToVec exactly: x = cos(lat)sin(lon), z = cos(lat)cos(lon),
       so longitude is atan2(x, z). Written as atan2(-z, x) first, which is a 90-degree rotation
       and would have put every ship in the wrong ocean while still looking like a plausible
       track. Checked against the forward transform rather than assumed. */
    const lo = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
    /* ── ⚠ THEY WERE FLYING AT 38 KILOMETRES ────────────────────────────────────────
       R * 1.006 is six tenths of a percent of the Earth's radius: thirty-eight kilometres
       up, which is above the stratosphere and about where a high-altitude balloon sits. On
       screen they read exactly as what they were — satellites, not shipping. A hull floats
       ON the water, and at globe scale that means the surface itself. */
    const w = lonLatToVec(lo, la, R * 1.0002);
    tr.grp.position.copy(w);
    /* ── ⚠ THE HORIZON IS NOT AT 90 DEGREES ─────────────────────────────────────────
       A ship on the far side of the planet still projects onto the disc, and at token
       exaggeration she projects LARGE — which is most of why hulls appeared to hang in
       space off the limb. From distance d the visible cap is acos(R/d): at d = 200 that
       is 60 degrees, not 90. This is the same threshold the chart lettering uses, and it
       was learned there when SEA OF JAPAN lettered itself across the English Channel.

       Culling only hides her. Her position and course are still computed, because the
       Passage may be standing on her deck while the globe camera is somewhere else, and a
       ship that stops existing when nobody on the globe can see her is a worse bug than
       the one this fixes. */
    tr.grp.visible = w.clone().normalize().dot(camera.position.clone().normalize()) > R / S.dist;
    /* ── HOW BIG IS A CHESS PIECE? ──────────────────────────────────────────────────
       At the campaign's factor a 42 m carrack rendered about four pixels across — present,
       but below the ratchet's own 0.05% threshold, which is a fair definition of invisible.
       A token has to be READ: you should be able to tell a junk from a carrack from a
       clipper on the ocean without clicking anything, and that is the whole reason these are
       the Shipwright's models rather than markers. Six times the campaign factor puts a
       middling hull around twenty-five pixels — a piece on a board, not a speck.
       The ratio between ships is still true: Titanic is still four times the caravel. */
    tr.grp.scale.setScalar((S.dist * 0.0098) / tr.grp.userData.loa);
    /* heading from the track on the sphere, projected into the local tangent plane */
    const up = w.clone().normalize();
    let fwd = lonLatToVec(b.lon, b.lat, R).sub(lonLatToVec(a.lon, a.lat, R));
    fwd.sub(up.clone().multiplyScalar(fwd.dot(up)));
    if (fwd.lengthSq() < 1e-9) continue;
    fwd.normalize();
    const m = tangentBasis(up, fwd);
    if (!m) continue;
    tr.grp.quaternion.setFromRotationMatrix(m);
    /* drop each consort's station onto the sphere — see the note where the stations are set */
    const Rlocal = R / tr.grp.scale.x;
    for (const h of tr.grp.children) {
      const st = h.userData.station;
      if (!st) continue;
      const r2 = st.x * st.x + st.z * st.z;
      h.position.y = Math.sqrt(Math.max(0, Rlocal * Rlocal - r2)) - Rlocal;
    }
    /* ── WHERE SHE IS, RECORDED ONCE ────────────────────────────────────────────────
       The Passage reads these rather than recomputing them. A second copy of this
       arithmetic would be a second opinion about where the ship is, and the two would
       diverge the moment either changed — the exact failure the wave table exists to
       prevent. Bearing is measured from north through east, which is what a course is. */
    const east = new THREE.Vector3(Math.cos(lo * Math.PI / 180), 0, -Math.sin(lo * Math.PI / 180));
    const north = new THREE.Vector3().crossVectors(up, east);
    tr.at = { lon: lo, lat: la, hdg: Math.atan2(fwd.dot(east), fwd.dot(north)), u };
    if (hoverTrack === tr && hoverTag) {
      const p = tr.grp.position.clone().project(camera);
      const cv = renderer.domElement, rect = cv.getBoundingClientRect();
      hoverTag.style.left = (rect.left + (p.x * 0.5 + 0.5) * rect.width + 12) + 'px';
      hoverTag.style.top  = (rect.top + (-p.y * 0.5 + 0.5) * rect.height - 8) + 'px';
      hoverTag.style.display = p.z < 1 ? 'block' : 'none';
    }
    /* and she rides the swell, using the same wave field the Shipwright floats on */
    if (window.SHIPS_SEA) {
      const s = window.SHIPS_SEA.seaAt(lo * 40, la * 40, t, 7);
      tr.grp.translateY(s.y * 0.00002 * S.dist);
    }
  }
}

let campGroup = null, campWake = [], campShip = [], campWind = null;

/* local east/north on the sphere, so a compass bearing becomes a direction in world space */
function bearingVec(lon, lat, degFromNorth) {
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180, th = degFromNorth * Math.PI / 180;
  const east = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo));
  const north = new THREE.Vector3(-Math.sin(la) * Math.sin(lo), Math.cos(la), -Math.sin(la) * Math.cos(lo));
  return north.multiplyScalar(Math.cos(th)).add(east.multiplyScalar(Math.sin(th))).normalize();
}

function clearCampaign() {
  if (campGroup) scene.remove(campGroup);
  campGroup = null; campWake = []; campShip = []; campWind = null;
  S.camp = null; S.campT = 0;
  const cb = document.getElementById('campBar');
  if (cb) cb.classList.add('hidden');
}

function startCampaign(b) {
  clearVoyage(); clearCampaign();
  S.camp = b; S.campT = 0;
  campGroup = new THREE.Group();
  scene.add(campGroup);

  /* two tracks: the Armada, and the English fleet that spends the fortnight to windward of it */
  const track = k => b.campaign.map(d => k === 0 ? [d.lon, d.lat] : [d.elon, d.elat]);
  const COL = [[0xd9a441, 'Armada'], [0x86c7d8, 'English fleet']];
  for (let k = 0; k < 2; k++) {
    const pts = [];
    const raw = track(k);
    for (let i = 0; i < raw.length - 1; i++)
      for (let j = 0; j < 20; j++)
        pts.push(slerpLonLat(raw[i][0], raw[i][1], raw[i + 1][0], raw[i + 1][1], j / 20));
    pts.push(raw[raw.length - 1]);
    const pos = new Float32Array(pts.length * 3);
    pts.forEach((q, i) => {
      const w = lonLatToVec(q[0], q[1], R * 1.004);
      pos[i * 3] = w.x; pos[i * 3 + 1] = w.y; pos[i * 3 + 2] = w.z;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setDrawRange(0, 0);
    const ln = new THREE.Line(g, new THREE.LineBasicMaterial({
      color: COL[k][0], transparent: true, opacity: 0.95 }));
    campGroup.add(ln);
    campWake.push({ line: ln, pts });

    /* ── A FLEET IS NOT ONE SHIP ────────────────────────────────────────────────────
       The head of each track used to be a single hull, which made a 130-sail armada read
       as a rowing boat. Each fleet is now a FORMATION — the ships it actually had, in the
       shape it actually kept — held in a local tangent frame so the whole thing banks and
       turns with the track.

       The Armada's crescent is the formation every account describes: the strongest ships
       in the centre, the horns trailing back and to windward, so that anything attacking a
       straggler had to come inside the arc. The English fought in loose groups astern and
       to windward, which is why they are drawn strung out rather than arced.

       ONE hull is generated per fleet and CLONED. `clone()` shares geometry and material,
       so twenty-six ships cost one hull's worth of vertices. */
    const vid = k === 0 ? 'carrack' : 'fluyt';
    const ves = ((APP.vessels && APP.vessels.vessels) || []).find(x => x.id === vid);
    if (!ves || !ves.hull) { campShip.push(null); continue; }
    const proto = window.SHIPS_HULL.buildShip(ves.hull);
    const fleet = new THREE.Group();
    fleet.userData.loa = ves.hull.loa;
    fleet.userData.holders = [];
    const N = k === 0 ? 15 : 11;
    for (let n = 0; n < N; n++) {
      const holder = new THREE.Group();
      const sh = n === 0 ? proto : proto.clone();
      /* ⚠ THE HULL'S BOW IS AT LOCAL -X. Its stations run u = 0 at the stem to u = 1 at the
         sternpost over x = -L/2 .. +L/2, so +x is AFT. The fleet frame has +Z forward, and
         mapping the heading onto the hull's +Z pointed every ship BEAM-ON to its own course
         — which is exactly what it looked like. -X onto +Z is a quarter turn about Y. */
      sh.rotation.y = Math.PI / 2;
      holder.add(sh);
      /* ⚠ Offsets are in METRES — the same units as the hull — and the whole formation is
         scaled once by the camera below. Positioning holders in world units instead left the
         formation a fixed size while the ships shrank, so it clumped as you flew out. */
      const L0 = ves.hull.loa;
      const t = (n - (N - 1) / 2) / ((N - 1) / 2);         // -1 .. +1 across the front
      if (k === 0) {
        /* the crescent, horns swept back and the strong ships in the centre */
        holder.position.set(t * L0 * 9.5, 0, -Math.pow(Math.abs(t), 1.7) * L0 * 8.0 + L0 * 3.0);
      } else {
        /* loose groups astern and to windward — the line of battle is a later idea */
        holder.position.set(t * L0 * 7.4 + ((n % 3) - 1) * L0 * 1.6, 0,
                            -L0 * 5.0 - (n % 4) * L0 * 2.3);
      }
      fleet.add(holder);
      fleet.userData.holders.push(holder);
    }
    campGroup.add(fleet); campShip.push(fleet);
  }

  /* the wind field: streaks over the water, re-oriented and re-seeded every day */
  const NW = 150;
  const wp = new Float32Array(NW * 2 * 3);
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
  campWind = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({
    color: 0xbcd8e6, transparent: true, opacity: 0.34 }));
  campGroup.add(campWind);
  /* ⚠ (i * 37.7) % 1 cycles through TEN values, not NW of them — one decimal place of
     precision means a period of 10 — so 150 streaks landed on a 10x10 lattice and the "field"
     was a visible grid. This is the R2 low-discrepancy sequence, which is what that line was
     reaching for: irrational multipliers, so the sequence never repeats and fills evenly. */
  campWind.userData.seed = Array.from({ length: NW }, (_, i) => [
    ((i + 1) * 0.7548776662) % 1, ((i + 1) * 0.5698402910) % 1, ((i + 1) * 0.6180339887) % 1]);

  const d0 = b.campaign[0];
  /* centred on the action; the campaign bar sits along the top, out of the way */
  flyTo(0.4, 50.9, 118);
  showCard({ eyebrow: 'Campaign', title: b.name, sub: b.date || '',
             rows: b.rows || [], prose: b.text || '', span: b.span || '',
             cite: b.cite || '', tags: b.tags });
  document.getElementById('campBar').classList.remove('hidden');
}

const CAMP_DAY = 2.3;                       // seconds of animation per day of 1588

function stepCampaign(dt) {
  if (!S.camp || !campGroup) return;
  const C = S.camp.campaign;
  S.campT += dt / CAMP_DAY;
  if (S.campT > C.length - 1 + 1.4) S.campT = 0;      // hold on the last day, then run again
  const f = Math.min(S.campT, C.length - 1);
  const i = Math.min(C.length - 2, Math.floor(f)), fr = Math.min(1, f - i);
  const a = C[i], bb = C[i + 1];

  for (let k = 0; k < 2; k++) {
    const wk = campWake[k];
    const n = Math.max(2, Math.round((i + fr) * 20) + 1);
    wk.line.geometry.setDrawRange(0, Math.min(n, wk.pts.length));
    const sh = campShip[k];
    if (!sh) continue;
    const lo = k === 0 ? a.lon + (bb.lon - a.lon) * fr : a.elon + (bb.elon - a.elon) * fr;
    const la = k === 0 ? a.lat + (bb.lat - a.lat) * fr : a.elat + (bb.elat - a.elat) * fr;
    const w = lonLatToVec(lo, la, R * 1.006);
    sh.position.copy(w);
    /* A hull on a globe is a legible TOKEN, not a scale drawing — at true scale a 42 m carrack
       is a third of a pixel. Scale it with the camera instead of with the world, so it holds
       one size on screen at every zoom rather than becoming a 250 km ship when you fly in. */
    sh.scale.setScalar((S.dist * 0.0016) / sh.userData.loa);

    /* ── HEADING, FROM THE TRACK ITSELF ─────────────────────────────────────────────
       Not from a compass bearing computed off raw lon/lat differences — that ignores the
       cos(lat) convergence of the meridians and is wrong by degrees at 51 N. The direction
       the fleet is actually going is the difference of its two positions ON THE SPHERE,
       projected into the local tangent plane. No trigonometry, no convention to get backwards. */
    const nlo = k === 0 ? bb.lon : bb.elon, nla = k === 0 ? bb.lat : bb.elat;
    const plo = k === 0 ? a.lon : a.elon,  pla = k === 0 ? a.lat : a.elat;
    const up = w.clone().normalize();
    let fwd = lonLatToVec(nlo, nla, R).sub(lonLatToVec(plo, pla, R));
    fwd.addScaledVector(up, -fwd.dot(up));                        // into the tangent plane
    if (fwd.lengthSq() < 1e-9) fwd = bearingVec(lo, la, 90);
    fwd.normalize();
    /* this site had it right all along; it now shares the one implementation so it cannot
       drift away from the two that had it wrong */
    const cm = tangentBasis(up, fwd);
    if (cm) sh.quaternion.setFromRotationMatrix(cm);

    /* ── AND SHE HEELS ──────────────────────────────────────────────────────────────
       A square-rigged ship lies down to a beam wind and stands up when it is dead astern,
       so the heel is the SINE of the wind's angle off the bow. With every ship in a fleet
       heeled the same way to the same wind, the formation reads as sailing rather than as
       counters slid across a board — which is most of what makes it look alive. */
    const wf = bearingVec(lo, la, a.w).negate();                  // where the wind is going
    const rel = Math.atan2(wf.dot(side), wf.dot(fwd));            // 0 = dead astern
    const heel = Math.sin(rel) * (0.030 + a.f * 0.011);
    (sh.userData.holders || []).forEach((h, n) => {
      h.rotation.z = heel * (0.82 + 0.36 * ((n * 7) % 5) / 4);    // not in lockstep
      h.rotation.x = Math.sin(S.campT * 2.1 + n) * 0.014;         // pitch on the swell
    });
  }

  /* the day's wind, blowing across the water the fleets are on */
  const wdir = a.w, force = a.f;
  const wp = campWind.geometry.attributes.position;
  const drift = (S.campT * 0.55) % 1;
  campWind.userData.seed.forEach((sd, j) => {
    const lon = -7.0 + sd[0] * 13.0, lat = 49.2 + sd[1] * 7.6;
    const dir = bearingVec(lon, lat, wdir + 180);
    const base = lonLatToVec(lon, lat, R * 1.0045);
    const ph = (sd[2] + drift) % 1;
    const len = R * 0.018 * (0.5 + force / 8);
    const p0 = base.clone().addScaledVector(dir, len * (ph * 6 - 1.0));
    const p1 = p0.clone().addScaledVector(dir, len);
    wp.setXYZ(j * 2, p0.x, p0.y, p0.z);
    wp.setXYZ(j * 2 + 1, p1.x, p1.y, p1.z);
  });
  wp.needsUpdate = true;
  campWind.material.opacity = 0.22 + force * 0.045;

  const CARD = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const pt = CARD[Math.round(wdir / 22.5) % 16];
  document.getElementById('campDay').textContent = a.d + ' 1588';
  document.getElementById('campWind').innerHTML =
    '<b>' + pt + '</b> force ' + force;
  document.getElementById('campText').textContent = a.t;
  const gauge = document.getElementById('campGauge');
  /* which fleet holds the weather gauge — computed from the geometry, not asserted */
  const toWind = bearingVec(a.lon, a.lat, wdir);
  const sep = lonLatToVec(a.elon, a.elat, 1).sub(lonLatToVec(a.lon, a.lat, 1));
  gauge.textContent = sep.dot(toWind) > 0
    ? 'English fleet holds the weather gauge'
    : 'Armada holds the weather gauge';
  gauge.className = 'gauge ' + (sep.dot(toWind) > 0 ? 'eng' : 'esp');
}


/* ── THE THREE VIEWS ────────────────────────────────────────────────────────────────────
 * The Shipwright and the Action used to be reachable only from inside the Yard, three clicks
 * down a path you had to already know about. A view nobody can find is a view that does not
 * exist. They are top-level tabs now, and each one closes the others so there is exactly one
 * live renderer at a time.
 */
function setView(v) {
  document.querySelectorAll('#tabs .tab').forEach(b =>
    b.classList.toggle('on', b.dataset.view === v));
  if (window.SHIPS_YARD) window.SHIPS_YARD.yardClose();
  if (window.SHIPS_SW) window.SHIPS_SW.swClose();
  if (window.SHIPS_BT) window.SHIPS_BT.btClose();

  if (v === 'ship') {
    const all = ((APP.vessels && APP.vessels.vessels) || []).filter(x => x.hull);
    const keep = window.SHIPS_SW.SW.spec;
    window.SHIPS_SW.swOpen(keep && keep.hull ? keep : all.find(x => x.id === 'ship-of-the-line') || all[0]);
  } else if (v === 'action') {
    const b = ((APP.battles && APP.battles.battles) || []).find(x => x.campaign);
    if (b) window.SHIPS_BT.btOpen(b);
  }
  APP.view = v;
}

function wireTabs() {
  document.querySelectorAll('#tabs .tab').forEach(b => {
    b.onclick = () => { setView(b.dataset.view); writeHash(); };
  });
}

function openBattle(b) {
  if (b.campaign && b.campaign.length) return startCampaign(b);
  showCard({
    eyebrow: 'Battle', title: b.name, sub: b.date || '',
    rows: b.rows || [], prose: b.text || '', span: b.span || '', cite: b.cite || '',
    tags: b.tags,
  });
}

function openAbout() {
  const el = document.getElementById('about');
  document.getElementById('aboutBody').innerHTML = APP.about ? APP.about.html :
    '<h2>About</h2><p>Loading…</p>';
  el.classList.remove('hidden');
}

/* Everything the URL asks for that needs a fully-booted app. Kept out of boot() itself so
   that a failure here cannot take the globe down with it. */
boot().then(() => { try { applyHashView(); } catch (e) { console.warn('hash view', e); } })
      .catch(e => {
  console.error(e);
  document.getElementById('loadnote').textContent = 'failed: ' + e.message;
});
