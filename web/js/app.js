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
/* 500 m above the water. Below that the level-0 elevation raster is 19.5 km per texel and the
   sphere is faceted at 210 km, so there is nothing left to resolve and everything to alias. */
const MIN_ALT = 500 / 63710;
/* ── FOLLOWING A SHIP IS A CAMERA MODE, NOT A SEPARATE VIEW ───────────────────────────────
   Clicking a hull used to open the Passage: its own scene, its own camera, its own card, and
   a cut. What was actually wanted is simpler and better — the MAP goes down to her and stays
   with her. The near-field water and the true-scale fleet already exist for the descent, so
   following costs one camera mode and no new machinery: the aim becomes the ship instead of a
   point to the north, drag walks round her instead of over the ground, and the terrain changes
   underneath because she is genuinely moving across the real globe.
     followAz  the bearing you are watching her from
     followDep the depression, so you can drop to her waterline or look down on her deck */
/* ── ⚠ THE MAP HAS A FLOOR NOW, AND THE CLOSE-UP IS A PLACE YOU GO ────────────────────────
 * The wheel used to run continuously from orbit to the waterline, so ordinary zooming crossed
 * into the near field — a displaced 174,000-triangle sea, an equal disc of land, and every hull
 * in the patch rebuilt at 2,570 separate meshes. Measured, the descent path costs 9 ms a frame
 * against the map's 1.8, and you paid it whenever you looked closely at anything.
 *
 * It is also the wrong shape for the piece. The map is a map: you zoom it in until a ship is
 * plainly a ship, and then you CLICK her to go aboard. Zooming out inside the close-up backs
 * off from her; the way out is the button, and it returns you to the map at its lowest.
 *
 * So the wheel stops at MAP_FLOOR_M, the near field is engaged by S.follow rather than by
 * altitude, and a viewer who never clicks a hull never renders it. `#z=` still sets the
 * altitude directly, which is what the descent baselines use and why they still work.
 */
/* ── ⚠ AND THE FLOOR GOES WHERE THE SHIP IS BIGGEST ───────────────────────────────────────
   Measured, Zheng He's treasure ship across the whole range: 209 km long at 15,000 km up and
   2.3% of the frame; 65 km and 35.6% at 300 km; then 17 km at 150, 3 km at 60, and ONE HUNDRED
   METRES at the 12 km floor — 2% of the frame. So zooming in past 300 km made the ship smaller,
   both on screen and against the coast, which is the opposite of what zooming in is for. The
   cause is the exaggeration ramp: it starts unwinding the token toward true scale at exactly
   300 km, and the map could descend four and a half decades past that.
   The map now stops where the token is at its largest. At that height a hull is sixty-five
   kilometres long — island-sized against the geography, deliberately, because that is what makes
   a ship legible on a planet — and the frame is 180 km across, which is enough coast around her
   to see where she is. True scale is not lost; it is where it belongs, in the close-up you reach
   by clicking her. */
const MAP_FLOOR_M = 300000;          // as close as the top-down map goes: the token's own peak
/* ⚠ AND THE FAR END OF THE CLOSE-UP MEETS THE NEAR END OF THE MAP. At the standing depression
   of 15 degrees, 45 km of stand-off puts the eye at 11.6 km — which is the map's own floor. So
   zooming all the way out inside the close-up leaves you at the height the button returns you
   to, and the two views join instead of jumping. It is also the answer to "we do not see much
   of the ship's surroundings": at that height the horizon is 380 km away. */
/* ⚠ 45 km OF STAND-OFF IS NOT A VIEW OF A SHIP, IT IS A VIEW OF NOTHING. It was chosen so the
   close-up's far end met the map's floor, and then the map's floor moved to 300 km — but even
   before that it was wrong: at 45 km a 57 m hull is a single dark pixel in a featureless field,
   which is what August photographed. The Shipwright's own widest view holds a 22 m vessel at
   about 30 boat-lengths, and that reads as a ship on an ocean. A bit further out than that. */
const FOLLOW_MAX_M = 2600;
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
  follow: null, followAz: 2.4, followDep: 15, followDist: 200,
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

  /* ── ⚠ IF THE MODEL ASSERTS A PASSAGE, THE PICTURE HAS TO SHOW IT ──────────────────
     The router carves the Strait of Magellan and the Bosphorus into its mask, because a 2 km
     channel does not exist in a 4.9 km raster and Magellan's voyage is ABOUT that strait. But
     the carve was only ever in the mask, so the route ran through water the renderer drew as
     Patagonia: measured, 4 hulls in 3,000 were drawn ashore and every one of them was Magellan
     inside the strait.

     Two models of one coastline again, and the fix is the same as always — carve the ELEVATION
     the shader samples, not a private copy of the answer. The declared passages are cut to
     40 m of water in the tile canvas itself, so the strait is there for the router, the
     renderer and the eye, and they cannot disagree about it. */
  if (window.SHIPS_ROUTE && window.SHIPS_ROUTE.CARVED) carveDeclaredPassages(cv);

  const tex = new THREE.CanvasTexture(cv);
  setTexParams(tex);
  tex.needsUpdate = true;
  /* Level 0 is kept on the CPU: the routing engine needs depth and a land mask, and reading
     them out of the tiles we already fetched costs nothing and cannot disagree with what the
     shader is drawing — which is the whole point of ARCHITECTURE-PATTERNS §4. */
  if (level === 0) APP.depthCanvas = cv;
  /* ── ⚠ THE MASK MUST BE BUILT FROM THE LEVEL THE SHADER DRAWS FROM ─────────────────
     The routing mask was built from level 0 — 19.5 km a cell — while the globe has been
     drawing from level 2 at 4.9 km since the progressive upgrade landed. Measured over the
     Philippines the two agree on the land FRACTION (24.1% against 25.4%), and I took that as
     agreement; aggregate agreement is not pointwise agreement, and in an archipelago they
     disagree constantly. Three of fifteen hulls were drawn over land while the mask said all
     fifteen were at sea — including the Manila galleon at 118.6E 17.9N, which is the ship in
     August's screenshot.

     Two models of one coastline, again. The finer canvas is kept so the mask can be rebuilt
     from exactly what is on screen. */
  APP.depthCanvasByLevel = APP.depthCanvasByLevel || {};
  APP.depthCanvasByLevel[level] = cv;
  return { tex, w: L.w };
}

/* Cut the declared passages into an elevation canvas, to a depth a ship can swim in. One cell
   either side of the line: the real straits are 2–30 km and a level-2 cell is 4.9 km, so a
   three-cell corridor is the narrowest thing the raster can represent at all. */
function carveDeclaredPassages(cv) {
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const img = cx.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  /* -40 m, encoded the way the tiles encode it: (elev + 11000) / 20000 * 65535 */
  const u16 = Math.round((-40 + 11000) / 20000 * 65535);
  const hi = (u16 >> 8) & 255, lo = u16 & 255;
  const put = (x, y) => {
    if (y < 0 || y >= cv.height) return;
    const xx = ((x % cv.width) + cv.width) % cv.width;
    const i = (y * cv.width + xx) * 4;
    d[i] = hi; d[i + 1] = lo;
  };
  const px = (lon, lat) => [ (((lon + 180) % 360 + 360) % 360) / 360 * cv.width,
                             (90 - lat) / 180 * cv.height ];
  const rad = Math.max(1, Math.round(cv.width / 2048));   // one level-0 cell, whatever the level
  for (const c of window.SHIPS_ROUTE.CARVED) {
    for (let s = 0; s < c.line.length - 1; s++) {
      const a = px(c.line[s][0], c.line[s][1]), b = px(c.line[s + 1][0], c.line[s + 1][1]);
      const n = Math.max(2, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) * 2);
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const x = Math.round(a[0] + (b[0] - a[0]) * f), y = Math.round(a[1] + (b[1] - a[1]) * f);
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) put(x + dx, y + dy);
      }
    }
  }
  cx.putImageData(img, 0, 0);
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
/* ⚠ CSS RUNS ON A CLOCK THE FREEZE NEVER TOUCHED. clockS() pins every render-loop clock,
   but a CSS transition interpolates against the browser's own wall time — so a flyout still
   slides, a row still fades, and two captures of identical code catch the same element a few
   pixels apart. That is the voyage-card ghost that survived the round-25 fonts clause: the
   diff showed one row of the list twice, offset by half a line, in three frames that have no
   ship in common. Frozen means EVERY clock, so frozen kills the CSS ones too. */
if (FROZEN) {
  const still = document.createElement('style');
  still.textContent =
    '*,*::before,*::after{transition:none !important;animation:none !important;' +
    'scroll-behavior:auto !important}';
  document.head.appendChild(still);
}

/* The signal the capture harness waits on. Set once, after something has actually been
 * painted — not after DOMContentLoaded, which is true long before the globe exists.
 *
 * ⚠ In capture mode it additionally waits for the progressive detail upgrades. The first
 * painted frame uses level-0 terrain and levels 1 and 2 stream in behind it, so a capture
 * taken at first paint differs from one taken a second later by ~18% of pixels. That made
 * the baselines depend on capture order, which is a ratchet that only appears to work. */
let upgradesDone = false;
let shipSelectPending = false;
/* ⚠ AND NOT BEFORE THE VENDORED SERIF HAS ARRIVED. Round 27 gated on document.fonts when the
   stack was all system fonts, so the clause was vacuous and a cold-start rasterisation
   transient could still flap globe-default by 1% of pixels (the label-halo false RED, struck
   in rounds 28, 45 and 51). The serif is a vendored webfont now, so document.fonts genuinely
   owns the answer: a capture before it resolves would rasterise every label in the fallback
   face and differ from every capture after. */
let fontsDone = false;
document.fonts.ready.then(() => { fontsDone = true; markReady(); });
function markReady() {
  if (FROZEN && !fontsDone) return;
  if (FROZEN && !upgradesDone) return;
  /* ⚠ AND NOT WHILE THE NAMED HULL IS STILL BEING FOUND. `#s=container` is applied by calling
     window.swOpenById, which the Shipwright only defines once its view has opened — so the
     call is a race, and it was silently skipped when lost: `typeof swOpenById === 'function'`
     is false and nothing happens. Adding sixty-two voyages made the boot slow enough to lose
     it, and the ship-container baseline captured the SHIP OF THE LINE, correctly framed and
     completely wrong. A frame of the wrong ship is worse than no frame. */
  if (FROZEN && shipSelectPending) return;
  /* and not on a half-built fleet */
  if (FROZEN && fleetQueue.length) return;
  /* ── ⚠ AND NOT WHILE THE LABELS LAG THE CAMERA ───────────────────────────────────────
     r62, on the NINTH strike of the "label flap" false RED — and the first one whose diff
     was read as an image: the labels were not ghosted, they were GONE, with one sea name
     frozen at the bottom corner where a mid-boot camera had projected it. The class was
     called a font transient for eleven rounds because its profile (label-only diff, clean
     on re-run) fit that story too. Nothing in this gate ever asked whether the label layer
     had caught up with the camera it projects from, so a capture under batch load could
     fire between the camera settling and the next 90 ms label pass. Sea view only: the
     other views never run updateLabels, and a gate they cannot satisfy is a hang. */
  if (FROZEN && (!APP.view || APP.view === 'sea') && APP.markers && !labelsSettled) return;
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
  const fm = /[#&]f=([a-z0-9-]+)/i.exec(h);
  if (!em && !tm && !fm) return;

  /* The era must be applied first. selectEra() rewrites the year slider's own min/max to
     the era's span and resets S.year to the era's seek point — so a year applied before it
     is silently thrown away. That is exactly what happened on the first attempt at this,
     and it produced three "different" baseline frames that were byte-identical. */
  const chs = APP.chapters.chapters || [];
  let era = em ? Math.max(0, Math.min(chs.length - 1, +em[1])) : null;
  /* ── ⚠ A VOYAGE NAMES ITS OWN ERA ────────────────────────────────────────────────────
     #e=3&f=zhenghe asked for a 1415 voyage in AD 500–1400, whose fleet can never contain
     her — applyHashView's board loop held __FRAME_READY through its 900 retries, the
     "wrong-era voyage hash hangs before first paint" carried since r43. And `#f=` with no
     `#e=` at all only ever worked when the BOOT DEFAULT era happened to contain the
     voyage — the same fault with the wrong era supplied by luck. The voyage record
     carries a year and the chapters carry their spans, so the era is derivable, and a
     derivable value outranks a contradictory hand-typed one: the voyage wins. */
  if (fm && APP.voyages) {
    const wantId = fm[1].toLowerCase();
    const v = ((APP.voyages.voyages || APP.voyages) || [])
      .find(x => String(x.id).toLowerCase() === wantId);
    if (v && v.year !== undefined) {
      const own = chs.findIndex(c => v.year >= c.from && v.year <= c.to);
      if (own >= 0) era = own;
    }
  }
  /* pure-#f= links skip a same-era re-select: selectEra already ran at boot with this era,
     and running it again rebuilds the whole fleet for nothing */
  if (era !== null && (em || era !== S.era)) selectEra(era, false);

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
  if (sm) {
    /* retried rather than attempted once, because whether the Shipwright has finished opening
       is a matter of timing and not of intent */
    /* ⚠ AND CALLING IT ONCE, SUCCESSFULLY, IS STILL NOT ENOUGH. setView('ship') opens the
       Shipwright, which selects its own default hull — and it does that AFTER this line runs,
       so the named ship was chosen and then quietly replaced. Measured: swOpenById('container')
       returned true and the view settled on the ship of the line, panX exactly equal to shipX,
       which is what a deliberate selection looks like. So the test is not "did the call
       succeed" but "is the right ship selected", checked until it is. */
    shipSelectPending = true;
    let tries = 0;
    const want = sm[1].toLowerCase();
    /* `&b=<degrees>` — the bearing the ship is seen FROM, on her own compass: 0 dead ahead,
       90 abeam, 135 the quarter, 180 astern. Only the REQUEST is recorded here; the spin is
       resolved in swFrame against the lon the camera actually uses. Computing it here raced
       swFrame's own `SW.lon = 0.42` and read the constructor's 0.9 — every "ahead" frame
       stood 27° off, from a formula that was itself correct. Added for the aback
       verification (queue item 1): "look from ahead" was not addressable in a URL, and what
       a frame cannot name it cannot watch. */
    const bm = /[#&]b=(-?[\d.]+)/.exec(location.hash);
    /* `&z=<dist>` — how close the camera stands, the wheel's own SW.dist (it multiplies the
       per-ship fit, so one value frames the canoe and the container ship identically; 1 fills
       the frame with the rig, 0.35 is the wheel's closest). Set HERE, after the selection has
       settled, because swOpen clamps dist to ≥1.0 as it runs — a value written earlier is
       destroyed by the very open it is aimed at. Unlike lon there is no per-frame overwrite,
       so once the open is past, a direct set holds. Added for the stern-furniture survey:
       the whole-rig frame shows a 57 m ship in ~250 px and no fitting on her can be judged
       from it, and what a frame cannot name it cannot watch. */
    const zm = /[#&]z=([\d.]+)/.exec(location.hash);
    /* `&l=<degrees>` — the camera's height angle, the drag's own SW.lat: 1° is eye level off
       the water, 51° (the drag's ceiling) looks down onto the deck. Without it a close zoom
       always framed the hull behind the bottom panels, because the look point rides at a
       fixed fraction of the RIG's height. */
    const lm = /[#&]l=([\d.]+)/.exec(location.hash);
    /* `&y=<metres>` — the height the camera looks AT, above the waterline. The default aim
       is mid-rig; a hull survey wants the hull. Resolved in swFrame against the extents it
       owns; only the request is recorded here. */
    const ym = /[#&]y=(-?[\d.]+)/.exec(location.hash);
    const tryPick = () => {
      const SWs = window.SHIPS_SW && window.SHIPS_SW.SW;
      const entry = SWs && (SWs.layout || []).find(e => e.id.toLowerCase() === want);
      if (entry && Math.abs((SWs.shipX || 0) - entry.x) < 0.5) {
        if (bm) SWs.viewFromDeg = parseFloat(bm[1]);
        if (zm) SWs.dist = Math.max(0.35, Math.min(8.0, parseFloat(zm[1])));
        if (lm) SWs.lat = Math.max(0.02, Math.min(0.90, parseFloat(lm[1]) * Math.PI / 180));
        if (ym) SWs.lookAtY = parseFloat(ym[1]);
        shipSelectPending = false; return;
      }
      if (typeof swOpenById === 'function') swOpenById(sm[1]);
      if (++tries > 600) { shipSelectPending = false; console.warn('no hull named', sm[1]); return; }
      requestAnimationFrame(tryPick);
    };
    tryPick();
  }

  /* ── AND SO IS BEING ABOARD ONE ─────────────────────────────────────────────────────
     `#f=<voyage id>` goes down to that ship and follows her. The close-up is the view this
     project is most often asked about and it has never had a baseline, for the plain reason
     that there was no way to ask for it in a URL — the same gap that left the descent unwatched
     until `#c=`/`#z=` existed. It waits for her track to be routed, because the fleet is built
     over several frames now and she does not exist for the first second. */
  const fm = /[#&]f=([a-z0-9-]+)/i.exec(location.hash);
  if (fm) {
    const wantId = fm[1].toLowerCase();
    /* ⚠ whether the RECORD exists is knowable right now; only the TRACK needs the retries.
       An id that is in no voyages.json at all used to hold __FRAME_READY through the full
       900-frame loop before admitting it — say so once and never take the gate. */
    const v = ((APP.voyages && APP.voyages.voyages) || [])
      .find(x => String(x.id).toLowerCase() === wantId);
    if (!v) { console.warn('no voyage', wantId); return; }
    shipSelectPending = true;
    let tries = 0;
    const board = () => {
      /* ⚠ and not before the terrain has finished streaming, because which way this view
         faces is decided from the elevation raster. Boarding on level 0 and letting level 2
         arrive afterwards leaves the camera pointed by data that is no longer on screen.
         ⚠ And a give-up path must RELEASE THE GATE IT HOLDS: this branch used to stop
         rearming at 900 tries with shipSelectPending still true, which is a permanent hang
         of every frozen capture — the same shape as the wrong-era hang, one level up. */
      if (!upgradesDone) {
        if (++tries < 900) requestAnimationFrame(board);
        else { shipSelectPending = false; console.warn('terrain never settled for', wantId); }
        return;
      }
      const tr = eraTracks.find(t => t.name === v.name);
      if (tr && tr.at) {
        if (!S.follow) { followShip(tr); if (fly) fly.t0 = -1e9; }
        /* ⚠ AND NOT READY UNTIL SHE IS IN THE WATER. followShip defers the hull build by one
           frame on purpose — 62 ms inside a flight rather than 62 ms before anything moves —
           so clearing the gate on the call meant a capture could land on a frame where the
           near-field fleet was still empty. Measured: the aboard frame came back 0.47%
           different depending on whether it was captured alone or after eighteen others. */
        const pool = window.SHIPS_PSG && window.SHIPS_PSG.PSG.fleetPool;
        const e = pool && pool.get(tr.name);
        if (e && e.holder && e.holder.visible) { shipSelectPending = false; return; }
      }
      if (++tries > 900) { shipSelectPending = false; console.warn('voyage never sailed', wantId); return; }
      requestAnimationFrame(board);
    };
    board();
  }

  /* ── THE CAMERA IS STATE TOO, NOW THAT IT CAN DESCEND ────────────────────────────────
     Four and a half decades of altitude and the whole surface of the Earth cannot be
     addressed by `v=sea`, so the descent could not be captured, and an unwatched view is
     one the ratchet cannot defend. This project has already paid for that twice — the
     trireme's oars and the container ship's funnel were both rewritten under a green
     ratchet that was not looking at them.

       #c=<lon>,<lat>   where to stand
       #z=<metres>      how high above the water

     Ordered last because selectEra() resets the camera on its way past. */
  const cm = /[#&]c=(-?[\d.]+),(-?[\d.]+)/.exec(location.hash);
  const zm = /[#&]z=([\d.]+)/.exec(location.hash);
  if (cm || zm) {
    fly = null;
    if (cm) { S.lon = parseFloat(cm[1]); S.lat = parseFloat(cm[2]); }
    if (zm) S.dist = R + Math.max(MIN_ALT, Math.min(600, parseFloat(zm[1]) / 63710));
    placeCamera();
  }
}

function writeHash() {
  if (FROZEN) return;                       // a capture must not rewrite its own URL
  const view = APP.view && APP.view !== 'sea' ? `&v=${APP.view}` : '';
  const ship = APP.view === 'ship' && typeof SW === 'object' && SW.spec ? `&s=${SW.spec.id}` : '';
  const h = `#e=${S.era}&t=${Math.round(S.year)}${view}${ship}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}

/* ── sun position ───────────────────────────────────────────────────────── */
let seaKey = null, seaSky = null;   /* the Sea view's only two lights — see below */

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
  let d = S.dist;
  camera.position.set(
    d * Math.cos(la) * Math.sin(lo),
    d * Math.sin(la),
    d * Math.cos(la) * Math.cos(lo)
  );
  /* ── ⚠ A DESCENT THAT ENDS LOOKING STRAIGHT DOWN IS NOT AN ARRIVAL ──────────────────
     Aiming at the centre of the Earth is right from orbit and absurd from five hundred
     metres: the frame becomes a three-hundred-metre patch of water seen from directly
     above, with no horizon in it and no way to tell you are anywhere. Nadir is a map view,
     and this stops being a map somewhere on the way down.

     So the aim point walks out from under the camera toward the horizon as the altitude
     falls — nadir above 60 km, level with the horizon by the time the wheel bottoms out.
     The near-field camera is derived from this one by a matrix multiply, so the tilt
     reaches the water for free and the two cannot disagree about where the eye is looking. */
  setCameraDepthRange();
  const altM = Math.max(1, (d - R) * 63710);

  /* ── FOLLOW: an orbit camera around HER, not a height above the ground ─────────────────
     What the viewer is adjusting when they follow a ship is how far off they are standing and
     from what quarter — not their altitude, which is a consequence. So the stand-off is the
     controlled quantity, in metres, and it starts at a few ship-lengths so she fills the frame
     the way she would from another vessel's deck. The altitude falls out of the depression.

     That also makes zooming out continuous with the map: increase the stand-off far enough and
     you are simply high up again, and she is released. */
  if (S.follow && S.follow.at) {
    const shipLon = S.follow.at.lon, shipLat = S.follow.at.lat;
    const dep = Math.max(4, Math.min(84, S.followDep)) * Math.PI / 180;
    const standM = Math.max(20, S.followDist) * Math.cos(dep);
    const eyeM = Math.max(6, Math.max(20, S.followDist) * Math.sin(dep));
    S.dist = R + eyeM / 63710;
    d = S.dist;
    /* the camera's ground point is standM metres from her, on the reciprocal of the bearing
       you are viewing from, so that the aim lands exactly on the ship */
    const brg = S.followAz + Math.PI;
    const dLat = standM * Math.cos(brg) / 111320;
    const dLon = standM * Math.sin(brg) / (111320 * Math.max(0.05, Math.cos(shipLat * Math.PI / 180)));
    const cLat = Math.max(-84, Math.min(84, shipLat + dLat));
    const cLon = shipLon + dLon;
    S.lon = cLon; S.lat = cLat;
    camera.position.copy(lonLatToVec(cLon, cLat, d));
    const up = lonLatToVec(cLon, cLat, 1);
    camera.up.set(0, 1, 0).lerp(up, Math.min(1, Math.max(0, 1 - (eyeM - 2000) / 58000))).normalize();
    /* aim a little above her waterline so the frame is her, not the water in front of her */
    camera.lookAt(lonLatToVec(shipLon, shipLat, R + (S.follow.aimM || 12) / 63710));
    setCameraDepthRange();
    return;
  }
  const tilt = Math.max(0, Math.min(1,
    1 - Math.log(altM / 2000) / Math.log(60000 / 2000)));
  const sub = lonLatToVec(S.lon, S.lat, R);
  const up = sub.clone().normalize();
  /* ── ⚠ lookAt DEGENERATES WHEN up IS PARALLEL TO THE VIEW ───────────────────────────
     Setting camera.up to the local radial while the camera is still looking near-NADIR makes
     up and forward almost exactly antiparallel, and lookAt's cross product collapses: the
     orientation becomes unstable and the frame renders black. Between 56 km and 8 km — a band
     with no baseline in it — the whole globe disappeared, and it was found by driving the
     WHEEL rather than by assigning S.dist, which is the difference between testing the code
     and testing the app.

     Screen-up therefore blends with the same tilt that swings the aim: world Y while the view
     is a map seen from above (which is exactly the old behaviour, so the four globe baselines
     do not move), the local radial once the view is a horizon. The blend keeps the angle
     between up and forward within about eleven degrees of square at every altitude. */
  camera.up.set(0, 1, 0).lerp(up, tilt).normalize();
  if (tilt <= 0.001) { camera.lookAt(0, 0, 0); return; }
  const east = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo));
  const north = new THREE.Vector3().crossVectors(up, east).normalize();
  /* ⚠ AIMING AT THE HORIZON IS TOO FAR. At 1.2 km up the horizon is 124 km away, so a level
     aim puts everything within a few kilometres — which is everything you came down to see —
     forty-odd degrees below the bottom of the frame. What is wanted is a DEPRESSION ANGLE:
     straight down from orbit, easing to about 22 degrees near the water, which is a low
     aerial view with the horizon just inside the top of the frame and the sea beneath it
     running away to it. The aim point then sits about two and a half times the eye height
     ahead, which is where a ship you are descending on actually is. */
  /* 11 degrees at the bottom, against a 17-degree half-frame, so the horizon sits six degrees
     inside the top of the picture with sky above it. Anything shallower and the sea fills the
     whole frame with no line in it to say how far away anything is — which is what 30 degrees
     was doing, and it read as a flat wash rather than an ocean. */
  const dep = (90 - 79 * tilt) * Math.PI / 180;
  const aheadU = (altM / 63710) / Math.tan(dep);
  camera.lookAt(sub.clone().addScaledVector(north, aheadU));
}

/* ── ⚠ THE NEAR PLANE WAS A FIXED SIXTY-THREE KILOMETRES ─────────────────────────────────
   camera.near = 1 unit, and a unit is 63.7 km. That was invisible for eight rounds because
   the camera could not get closer to the surface than 765 km — and the moment the wheel could
   descend, the entire planet fell inside the near plane and the globe rendered BLACK. It was
   found by the new descent-high baseline on its very first capture, which is the whole reason
   a frame was put on the far side of the handover: a view nothing watches is a view that can
   be broken without anyone noticing.

   Near follows the altitude, because what has to be resolvable is the ground under the camera,
   and that is the only length in the scene that changes by four and a half decades. */
function setCameraDepthRange() {
  const altU = Math.max(MIN_ALT, camera.position.length() - R);
  camera.near = Math.max(2e-5, altU * 0.05);
  camera.far = camera.position.length() * 3 + 500;
  camera.updateProjectionMatrix();
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
  /* ⚠ THE CANVAS CLEARS ITSELF, SO THE PAGE COLOUR NEVER SHOWED THROUGH IT. With alpha:false
     the renderer clears to its own colour — black by default — and the body's background is
     simply covered. Turning the whole chrome to daylight therefore left the globe sitting in
     a black square, which is the one place the old theme survived. Cleared to the page colour
     instead, read FROM the stylesheet rather than repeated here: two spellings of one colour
     is how a theme drifts, and this file already has that lesson from the sun vector. */
  {
    const paper = getComputedStyle(document.documentElement)
                    .getPropertyValue('--abyss').trim() || '#efeade';
    renderer.setClearColor(new THREE.Color(paper), 1);
    /* ⚠ AND scene.background TOO. setClearColor alone left the globe in a black square: the
       clear colour is what the canvas is wiped to, and anything that renders a second pass, or
       any path that sets autoClear false, paints over it. scene.background is the property
       three.js actually honours for "what is behind everything", and setting both means no
       render path can leave the old night sky behind. */
  }
  scene = new THREE.Scene();
  /* ⚠ AFTER the scene exists, not with the renderer. setClearColor alone left the globe in a
     black square, because this view renders in TWO passes with renderer.autoClear = false
     (see the near-field note below) — the second pass paints over whatever the clear left.
     scene.background is what three.js honours for "behind everything" and survives that.
     Setting it up beside the renderer, where the clear colour is set, threw: `scene` is
     assigned on this line, so the property write ran against undefined, boot died, and the
     frame harness got zero frames rather than a wrong colour. */
  {
    const paper = getComputedStyle(document.documentElement)
                    .getPropertyValue('--abyss').trim() || '#efeade';
    scene.background = new THREE.Color(paper);
  }
  camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);
  raycaster = new THREE.Raycaster();

  const bar = document.querySelector('#splash .bar i');
  const note = document.getElementById('loadnote');
  const setP = p => { bar.style.width = Math.round(p * 100) + '%'; };

  const manifest = await (await fetch('fields/tiles.json')).json();
  APP.manifest = manifest;

  note.textContent = 'reading the sea floor…';
  const z0 = await loadLevel(0, manifest, p => setP(p * 0.55));

  note.textContent = 'reading the surface fields…';
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
        /* ── AND THE ROUTES ARE REPLANNED AGAINST THE COASTLINE NOW ON SCREEN ────────
           The picture just got four times finer. Every route in the era was planned against
           the coarser one, so a passage that was clear at 19.5 km may now cross an island the
           viewer can see. Rebuild the mask from the new level and re-route — otherwise the
           router and the renderer hold two different coastlines, which is exactly how three
           hulls came to be drawn over the Philippines while the mask insisted they were at
           sea. */
        if (window.SHIPS_ROUTE && window.SHIPS_ROUTE.maskUpgradeAvailable()) {
          const t0 = performance.now();
          window.SHIPS_ROUTE.buildMask(true);
          APP.maskBuildMs = Math.round(performance.now() - t0);
          APP.maskFineLevel = window.SHIPS_ROUTE.FINE.level;
          buildEraFleet();
        }
      } catch (e) { console.warn('level', lv, 'failed', e); break; }
    }
    upgradesDone = true;      // capture mode has been waiting on this
  })();

  await loadData();
  wireUI();
  wirePanelInsets();
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
  /* the photographs' captions and credits; absent until build/fetch_images.py has run,
     and the card simply shows no plate in that case */
  APP.plates   = await get('data/plates.json')   || {};
  APP.about    = await get('data/about.json')    || null;
  /* running metrics for the readout — every row sourced or derived, per Research/METRICS.md */
  APP.metrics  = await get('data/metrics.json')  || { series: [], hideStat: [] };
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
let voyT = 0;                 // the fleet's own clock — see the note in frame()
let labelsHidden = false;
/* true once the label layer has completed a pass with the camera at rest (or hidden them
   deliberately, which is also a settled state) — the condition markReady() waits on */
let labelsSettled = false;
function updateLabels(now) {
  if (!APP.markers) return;
  /* ── ⚠ THE OCEANS WERE WRITTEN ACROSS THE SKY ────────────────────────────────────────
     These are labels on a map, projected from the globe camera. Down in the Passage that
     camera is forty metres above the water, so NORTH ATLANTIC OCEAN and MEDITERRANEAN SEA
     projected onto thin air above the horizon — cartography floating over a photograph. A
     view of the world from inside it does not carry the names of the world seen from outside
     it, so they go, all at once, and come back when you climb out. */
  /* ⚠ AND FOLLOWING A SHIP IS ALSO BEING INSIDE THE WORLD. This test named only PSGV.on — the
     other way in — so the close-up you actually reach by clicking a hull had NORTH ATLANTIC
     OCEAN, CARIBBEAN SEA and TRAFALGAR lettered across the water in front of the ship, forty
     metres above it. Nothing breaks the sense of one world faster than the map's own furniture
     floating in the middle of the picture: a view from inside the world does not carry the
     names of the world seen from outside it. */
  if (PSGV.on || S.follow) {
    if (!labelsHidden) {
      for (const m of APP.markers) if (m.el) m.el.style.display = 'none';
      labelsHidden = true;
    }
    labelsSettled = true;      // hidden on purpose is settled
    return;
  }
  if (labelsHidden) { for (const m of APP.markers) if (m.el) m.el.style.display = ''; }
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
    /* ── AND A SLIVER OF GROUND SEEN EDGE-ON IS NOT A PLACE TO PUT A NAME ────────────
       The horizon test above is correct and not sufficient. Right AT the limb the surface is
       edge-on, so a thousand kilometres of coast projects into a few pixels — and every port
       along it passes the test and stacks into a vertical column down the edge of the screen,
       which is what the Indian Ocean looked like with sixty ports in view. A label needs
       ground facing the camera. Inset a tenth of the way from the limb to the sub-camera
       point, which at any altitude is the same fraction of the visible cap. */
    {
      const cosLimb = R / S.dist;
      if (show && m.v.clone().normalize().dot(camDir) < cosLimb + (1 - cosLimb) * 0.10)
        show = false;
    }

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
  /* a pass that ran while the camera was still flying is not the settled picture */
  if (!fly) labelsSettled = true;
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
    /* one hull per era, chosen because its existence IS the era's argument: the dugout that
       crossed to Sahul, the trireme, the caravel that could beat back up the African coast,
       the iron steamer, the dreadnought, the box boat. */
    const ERA_PLATE = { 'Crossing': 'voyaging-canoe', 'Reed & plank': 'corbita',
                        'Oar & monsoon': 'trireme', 'Longships & junks': 'longship',
                        'Ocean crossing': 'caravel', 'Iron & steam': 'steamer',
                        'Steel & war': 'dreadnought', 'Containers': 'container' };
    showCard({ eyebrow: 'Era', title: ch.title, sub: ch.years, plate: ERA_PLATE[ch.short],
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
/* ── FOLLOWING A VOYAGE ─────────────────────────────────────────────────────────────────
 * Clicking a voyage flew to where the ship was AT THAT INSTANT and then let go of her. On a
 * map running ten hours a second that is a picture of an empty sea within a few seconds — the
 * one thing a viewer who just asked for a named passage does not want.
 *
 * So the click arms a follow, and the camera keeps her under it until something says otherwise.
 * Three details make it read as watching rather than as being dragged:
 *   · it does nothing while `fly` is running, so the opening flight still arrives normally;
 *   · it eases toward her instead of snapping, so the globe drifts under the hull rather than
 *     locking to it — a hard lock makes the ocean look like it is sliding past a fixed ship;
 *   · it holds ALTITUDE. Following is a pan, not a zoom, and the viewer's own zoom is theirs.
 * The dateline is handled the way flyTo handles it: unwrap to the short way round before
 * easing, or crossing 180° sends the camera the long way about the planet.
 */
function stepTrackVoyage() {
  if (!S.trackVoyage || fly) return;
  const tr = (eraTracks || []).find(t => t.name === S.trackVoyage);
  if (!tr || tr._lo === undefined) return;
  let target = tr._lo;
  while (target - S.lon > 180) target -= 360;
  while (target - S.lon < -180) target += 360;
  /* frozen means frozen: arrive, so a capture is not taken mid-ease */
  const k = FROZEN ? 1 : 0.075;
  S.lon += (target - S.lon) * k;
  S.lat += (tr._la - S.lat) * k;
  placeCamera();
}

/* Any deliberate camera move by the viewer ends the follow — otherwise dragging the globe
   fights an invisible spring and feels broken. */
function clearTrackVoyage() { S.trackVoyage = null; }

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
    /* ── WHAT IS ACTUALLY OUT THERE, AND WHERE ─────────────────────────────────────────
       The list used to give a name and a date, which is a bibliography. What a viewer wants
       from a panel beside a moving map is the FLEET: which ship, and where she has got to —
       read off the same track that is drawing her, so the panel and the globe cannot disagree.
       A hull on the far side of the planet is marked, because "I clicked it and nothing was
       there" is otherwise the obvious next complaint. */
    const tr = (eraTracks || []).find(t => t.name === v.name);
    const ves = ((APP.vessels && APP.vessels.vessels) || []).find(x => x.id === v.vessel);
    let where = '';
    if (tr && tr._lo !== undefined) {
      const ns = tr._la >= 0 ? 'N' : 'S', ew = tr._lo >= 0 ? 'E' : 'W';
      where = `${Math.abs(tr._la).toFixed(0)}°${ns} ${Math.abs(tr._lo).toFixed(0)}°${ew}`;
      if (!tr.grp.visible) where += ' · far side';
    }
    b.innerHTML = `<span class="vn">${v.name}</span>` +
      `<span class="vy">${ves ? ves.name : v.vessel}${where ? ' · ' + where : ''}</span>`;
    b.onclick = () => {
      startVoyage(v);
      /* ⚠ and it goes to where she IS, not to the authored view of the voyage. startVoyage
         flies to v.view, which is a fixed picture of the whole route — so clicking a name
         took you to a place the ship might be nowhere near. Her live position comes from the
         track that is drawing her; the fallback is the first waypoint. */
      const t2 = (eraTracks || []).find(t => t.name === v.name);
      const lon = t2 && t2._lo !== undefined ? t2._lo : v.legs[0].lon;
      const lat = t2 && t2._la !== undefined ? t2._la : v.legs[0].lat;
      flyTo(lon, lat, R + 2200000 / 63710, 1600);      /* still the globe, from 2,200 km */
      /* ...and stay with her once we get there, rather than watching her sail out of frame */
      S.trackVoyage = v.name;
    };
    host.appendChild(b);
  });
}

/* The positions in the list go stale the moment the fleet moves, and a stale position beside a
   moving ship is worse than none — it is a claim. Twice a second, and only the text, so the
   list is not rebuilt underneath the pointer. */
let _fleetListAt = -1;
function refreshFleetList(t) {
  /* ⚠ THE THROTTLE WAS THE LAST FLAP. A capture races this 500 ms window: the row meta
     ("· 37°N 1°W · far side") is written on the first tick AFTER the fleet has positions,
     and __FRAME_READY does not wait for it — so one run photographed the list with
     coordinates and the next without, 0.476% apart, stable in nothing but appearance.
     Frozen time has no reason to throttle: refresh every tick and the first painted frame
     already carries the settled text. */
  if (!FROZEN && t - _fleetListAt < 500) return;
  _fleetListAt = t;
  const host = document.getElementById('voyList');
  if (!host) return;
  const btns = host.querySelectorAll('button.voy');
  if (!btns.length || !eraTracks.length) return;
  const all = (APP.voyages && APP.voyages.voyages) || [];
  const era = currentEra();
  const mine = all.filter(v => era && v.year >= era.from && v.year <= era.to);
  btns.forEach((b, i) => {
    const v = mine[i]; if (!v) return;
    const tr = eraTracks.find(x => x.name === v.name);
    const el = b.querySelector('.vy'); if (!el || !tr || tr._lo === undefined) return;
    const ves = ((APP.vessels && APP.vessels.vessels) || []).find(x => x.id === v.vessel);
    const ns = tr._la >= 0 ? 'N' : 'S', ew = tr._lo >= 0 ? 'E' : 'W';
    el.textContent = (ves ? ves.name : v.vessel) +
      ` · ${Math.abs(tr._la).toFixed(0)}°${ns} ${Math.abs(tr._lo).toFixed(0)}°${ew}` +
      (tr.grp.visible ? '' : ' · far side');
  });
}

/* ── ⚠ AND THIS USED TO BUILD A SECOND SHIP ──────────────────────────────────────────────
 * Clicking a name in the era's list built its own hull, its own wake, and its own animation
 * along its own path — a complete second model of a voyage the era fleet was already sailing.
 * The two disagreed in every way that matters, and August photographed the result: a fluyt
 * aground on Denmark near Gdansk, stationary through era changes, unclickable, and now and
 * then darting across the Atlantic. Three symptoms, one cause, and each of them follows from
 * the duplication rather than from a bug in the duplicate:
 *
 *   IT SURVIVED THE ERA. selectEra clears the era fleet and never touched this, so the hull
 *     stayed in the scene with its animation still running while its voyage had left eraTracks.
 *   IT COULD NOT BE CLICKED. pickTrack raycasts eraTracks, and this ship was not in it.
 *   IT SAILED OVER LAND. Its path was the raw waypoints slerped at 26 points a leg — not the
 *     routed track. Every coastline correction this project has made was in the OTHER model.
 *
 * So the second ship is gone. The era fleet already draws this voyage on her routed track, and
 * clicking her name already flies the camera to where she actually is; what was missing was
 * only a way to see her whole route, and that is a line, not a vessel. It is the routed track —
 * the same array the ship is following — drawn by the same helper the hover uses, and pinned
 * until something else is chosen.
 */
let voyLine = null;
function clearVoyage() {
  S.trackVoyage = null;   /* the era changed or the voyage went away */
  if (voyLine) { scene.remove(voyLine); voyLine.geometry.dispose(); voyLine = null; }
  S.voyage = null; S.voyPlaying = false;
}

function startVoyage(v) {
  clearVoyage();
  S.voyage = v;
  /* the route as the ship is actually sailing it; if her track is not built yet there is
     simply no line until it is, rather than a second guess at where she goes */
  const tr = (eraTracks || []).find(t => t.name === v.name);
  if (tr && tr.legs && tr.legs.length > 1) {
    voyLine = makeHoverLine(tr.legs);
    voyLine.material.opacity = 0.42;
    scene.add(voyLine);
  }
  buildVoyageList();
  /* ── THE CARD MEASURES ITS OWN TRACK ─────────────────────────────────────────────────
     Only fifteen of the sixty-two voyages stated a distance, and the other forty-seven are not
     going to be filled in by hand — a number typed into a data file is a claim nobody can check,
     and it would drift the moment a waypoint moved. The track is right there as a list of
     positions, so measure it: great-circle between consecutive waypoints, summed. It is the
     model's own output rather than an assertion about the world, which is the same standing the
     isochrones have, and it cannot fall out of step with the line being drawn because it is
     computed FROM that line. Labelled "in this model" for exactly that reason: it is the length
     of the track as drawn, not a claim about the historical passage. */
  showVoyageCard(v);
}

/* ⚠ ONE DEFINITION OF THE VOYAGE CARD. It was written inline here, and going aboard a ship
   needed the same card — copying it would have been a second model of one panel, which is the
   fault this codebase keeps finding (the rig-height estimate, the two ripple laws, the second
   ship model). Named once, called from the voyage list and from followShip. */
function showVoyageCard(v) {
  if (!v) return;
  const legRows = (v.rows || []).slice();
  if (v.legs && v.legs.length > 1) {
    let nm = 0;
    for (let i = 1; i < v.legs.length; i++) {
      const a = v.legs[i - 1], b = v.legs[i];
      const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
      const dp = p2 - p1, dl = (b.lon - a.lon) * Math.PI / 180;
      const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
      nm += 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));   // earth radius in nm
    }
    legRows.push(['Track in this model',
                  `${Math.round(nm).toLocaleString()} nm over ${v.legs.length} waypoints`]);
  }
  showCard({ eyebrow: 'Voyage', title: v.name, sub: v.dates, rows: legRows,
             prose: v.text, span: v.dates, cite: v.cite, tags: v.tags,
             plate: v.vessel });
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

function stepVoyage(dt) { /* the voyage is a pinned line now; the ship is the era fleet's */ }


/* ── PROSE → HTML ───────────────────────────────────────────────────────────────────────
 * Every piece of long copy in this app — vessel, era, port, battle — is WRITTEN in markdown,
 * and until now nothing turned it into markup. It printed its own punctuation instead:
 * Titanic was "built for **size and comfort**" on screen, and every journal title in a
 * citation came out as *Nature* rather than Nature. Measured across vessels.json alone:
 * 24 bold spans and 14 italic spans, on 20 of the 25 ships. It has been shipping that way.
 *
 * ⚠ ESCAPE FIRST, EMPHASISE SECOND — the order is the whole correctness argument. Escaping
 * after emphasising would escape the tags this function has just written, and there is no way
 * to tell those from the data's own angle brackets once they are in the same string. Escaping
 * first leaves no `<` for the emphasis step to collide with, so the two passes cannot interact.
 * (No copy contains & or < today; this is the guard for the copy written next.)
 *
 * ⚠ AND BOLD BEFORE ITALIC, which is why neither rule needs a lookbehind. Run the italic rule
 * first and it takes one star off each `**` pair, leaving the other stranded. Run bold first
 * and every doubled star is already consumed, so a surviving `*` can only be a single one.
 */
/* the emphasis pass alone, for short strings that are not paragraphs */
function inlineMD(src) {
  return String(src === undefined || src === null ? '' : src)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

function proseHTML(src) {
  return String(src || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n\n')
    .map(p => '<p>' + p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                       .replace(/\*([^*\n]+)\*/g, '<em>$1</em>') + '</p>')
    .join('');
}

/* ── PANELS MUST NOT STACK ON TOP OF EACH OTHER ─────────────────────────────────────────
 * Two overlaps, one cause: every panel on the left was positioned against CONSTANTS, and the
 * things it had to clear are not constant.
 *
 *   · #card sat at top:150 with max-height calc(100vh - 290px). Its foot therefore landed 760 px
 *     down a 900 px window, and the era strip — which carries the year — stands from 734. The
 *     card ran 26 px underneath it, and the era strip is the one panel in the view whose height
 *     genuinely varies: eight era tabs wrap at narrow widths.
 *   · #psgCard, the ship's slip in the close-up, is fixed at top:78 and is tall enough to reach
 *     the card below it — so opening a ship buried whatever the card was showing.
 *
 * The fix is to stop guessing. Measure what is actually on screen, publish it as two custom
 * properties, and let the CSS subtract them. A ResizeObserver rather than a resize listener,
 * because the thing that changes most is the era strip's own WRAPPING, which no window event
 * reports.
 */
function syncPanelInsets() {
  const root = document.documentElement;
  const eras = document.getElementById('eras');
  const psg = document.getElementById('psgCard');
  /* ⚠ NOT offsetParent. Every panel here is `position: fixed`, and a fixed element's
     offsetParent is null by specification — so the obvious visibility test reported ALL of
     them hidden, every measurement fell through to its fallback constant, and both overlaps
     this function exists to fix stayed exactly as they were. It looked like the CSS variables
     were not arriving; they were arriving with the old numbers in them. Measure the box. */
  const shown = el => !!el && !el.classList.contains('hidden')
                   && getComputedStyle(el).display !== 'none'
                   && el.getBoundingClientRect().height > 1;

  const erasH = shown(eras) ? eras.getBoundingClientRect().height : 0;
  root.style.setProperty('--erabar-h', Math.round(erasH) + 'px');

  /* ⚠ AND THE SLIP ITSELF SITS UNDER THE READOUT. #psgCard was fixed at top:78 and #readout
     stands at top:16 and runs past it, so opening a ship half-buried the era-and-date panel —
     six pixels of it showing down one side, which is the artefact that reads as a bug. The
     whole left column is now measured in order: readout, then the slip, then the card. */
  const ro = document.getElementById('readout');
  const roBottom = shown(ro) ? ro.getBoundingClientRect().bottom : 62;
  root.style.setProperty('--psg-top', Math.round(roBottom) + 14 + 'px');

  /* ⚠ AND THE FALLBACK WAS THE BUG. The card dropped to a hard 150 whenever the ship's slip
     was down — but #readout stands at top:66 (the tab bar pushes it down from 16) and with an
     era, a date and two stat lines it runs to roughly 155-175. So on the globe, where the slip
     is never up, the era card sat ON the date card. The constant was measured against the
     wrong layout: 150 was right when the readout began at 16.
     There is no fallback worth keeping here. The card starts below whatever is actually above
     it — the slip if it is up, the readout otherwise — and both are measured. */
  const psgUp = shown(psg);        /* same reason: psgCard is fixed too */
  const above = psgUp ? psg.getBoundingClientRect().bottom
              : (shown(ro) ? roBottom : 138);
  root.style.setProperty('--card-top', Math.round(above) + 12 + 'px');
}

function wirePanelInsets() {
  if (wirePanelInsets.done) return;
  wirePanelInsets.done = true;
  syncPanelInsets();
  addEventListener('resize', syncPanelInsets);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(syncPanelInsets);
    ['eras', 'psgCard', 'card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) ro.observe(el);
    });
  }
}

/* ── card ───────────────────────────────────────────────────────────────── */
function showCard(c) {
  syncPanelInsets();
  document.getElementById('cEyebrow').textContent = c.eyebrow || '';
  document.getElementById('cTitle').textContent = c.title || '';
  document.getElementById('cSub').textContent = c.sub || '';
  const rows = document.getElementById('cRows');
  rows.innerHTML = '';
  (c.rows || []).forEach(r => {
    const d = document.createElement('div');
    /* ⚠ ROWS CARRY MARKDOWN TOO. proseHTML was wired to the prose and the rows were left
       raw, so a citation inside a row printed its own asterisks — "62 treasure ships, 27,800
       men (*Ming Shi*)". Same helper, minus the paragraph wrapper. */
    d.innerHTML = `<span class="k">${r[0]}</span><span class="v">${inlineMD(r[1])}</span>`;
    rows.appendChild(d);
  });
  rows.style.display = (c.rows && c.rows.length) ? '' : 'none';
  const prose = document.getElementById('cProse');
  let html = '';
  if (c.tags) html += c.tags.map(t =>
    `<span class="tag ${t.toLowerCase()}">${t}</span>`).join('') + '<br>';
  html += proseHTML(c.prose);
  prose.innerHTML = html;
  /* the photograph goes ABOVE the prose but is built after it, because it is prepended into
     the same element — one innerHTML write, no second reflow */
  const pl = c.plate && (APP.plates || {})[c.plate];
  if (pl) {
    const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    prose.insertAdjacentHTML('afterbegin',
      '<figure class="plate"><img src="data/assets/ships/' + c.plate + '.jpg" alt="" ' +
      'loading="lazy" onerror="this.closest(\'.plate\').remove()">' +
      '<figcaption>' + esc(pl.caption) +
        (pl.credit ? '<span class="cr">' + esc(pl.credit) +
                     (pl.licence ? ' · ' + esc(pl.licence) : '') + '</span>' : '') +
      '</figcaption></figure>');
  }
  document.getElementById('cSpan').textContent = c.span || '';
  document.getElementById('cCite').textContent = c.cite || '';
  document.getElementById('card').classList.remove('hidden');
}

/* ── readout ────────────────────────────────────────────────────────────── */
/* Every number on this card is labelled sourced (a named source states it) or derived (computed,
   and the derivation is named). The provenance record is Research/METRICS.md. Rule 10: where
   neither exists the card says so — the first usable aggregate for world seaborne trade is
   Stopford's 1840 figure, and before that the honest return is the standing line, not a guess. */
function metricRow(label, pt) {
  return `${label} ${pt.v}${pt.yr ? ` <span class="py">(${pt.yr})</span>` : ''}` +
         `<br><span class="prov">${pt.kind} — ${pt.cite}</span>`;
}

function updateReadout() {
  const ch = currentEra();
  document.getElementById('roEra').textContent = ch ? ch.title : '—';
  document.getElementById('roDate').textContent = yearLabel(S.year);
  const mi = Math.floor(S.month) % 12;
  const rows = [`<b>${MONTH_NAMES[mi]}</b> on the water`];
  const sl = seaLevelAt(S.year);
  if (sl < -3) rows.push(`Sea level <b>${Math.round(-sl)} m</b> lower` +
    '<br><span class="prov">derived — Spratt &amp; Lisiecki 2016</span>');

  /* A series is live when the year is inside its window; the value shown is the latest point
     at or before the year, with that point's own date printed beside it — so a 2019 figure can
     never appear under 1955, and a stale anchor says how stale it is. */
  const live = [];
  ((APP.metrics && APP.metrics.series) || []).forEach(s => {
    if (S.year < s.from || S.year > s.to) return;
    let pt = null;
    s.points.forEach(p => { if (p.y <= S.year) pt = p; });
    if (pt) live.push({ s, pt });
  });
  live.sort((a, b) => (a.s.pri || 9) - (b.s.pri || 9));
  const shown = live.slice(0, 3);
  shown.forEach(x => rows.push(metricRow(x.s.label, x.pt)));

  /* the era's audited stat stays as unlabelled era flavour where the card has room and the
     metrics do not already restate it (hideStat lists the eras where they do) */
  const hide = (APP.metrics && APP.metrics.hideStat) || [];
  if (ch && ch.stat && shown.length < 3 && !hide.includes(S.era)) rows.push(ch.stat);

  if (!shown.some(x => x.s.cat === 'trade'))
    rows.push('<span class="unrec">Seaborne trade: no aggregate record survives</span>');

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
  /* the direction, on the unit sphere, that a screen point is looking at — through a GIVEN
     camera, so a drag keeps using the camera it started with rather than chasing itself */
  function raySphereDir(clientX, clientY, cam) {
    const rect = cv.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(nx, ny), cam);
    const hit = new THREE.Vector3();
    if (!rc.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), R), hit)) return null;
    return hit.normalize();
  }

  cv.addEventListener('pointerdown', e => {
    const P = window.SHIPS_PSG ? window.SHIPS_PSG.PSG : null;
    const frozenCam = camera.clone();
    frozenCam.updateMatrixWorld(true);
    drag = { x: e.clientX, y: e.clientY, lon: S.lon, lat: S.lat, moved: 0,
             orbit: P ? P.orbit : 0, elev: P ? P.elev : 0,
             az: S.followAz, dep: S.followDep,
             cam: frozenCam, grab: raySphereDir(e.clientX, e.clientY, frozenCam) };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    fly = null;                                   // a hand on the globe always wins
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (S.follow) {
      /* walking round her, not over the ground: horizontal drag changes the bearing you are
         watching from, vertical drag raises and lowers the eye from her waterline to a view
         down onto her deck */
      S.followAz = drag.az - dx * 0.006;
      S.followDep = Math.max(6, Math.min(80, drag.dep + dy * 0.13));
      placeCamera();
      return;
    }
    /* ── ⚠ DRAG SHOULD FOLLOW THE GROUND, NOT THE CAMERA'S DISTANCE FROM THE CENTRE ──
       S.dist runs 112 to 700 on a globe of radius 100, so dividing by it changes the gain
       only sixfold across the whole zoom range. But what the cursor is actually chasing is
       the ground, and the ground's apparent speed goes with ALTITUDE ABOVE THE SURFACE —
       12 units when you are close in against 600 when you are out. That is a fiftyfold
       range, which is why a drag that felt right zoomed out threw the globe across the
       screen zoomed in. Height above the surface, not radius from the middle. */
    /* ── ⚠ THIS GAIN HAS NOW BEEN WRONG THREE TIMES, EACH TIME FOR A NEW REASON ────
       First it divided by S.dist, which is measured from the Earth's CENTRE and barely
       changes near the surface. Then it used altitude with a floor of 0.03 — fine while the
       camera could not get below 765 km, and once it could, that floor moved the ground nine
       hundred metres per pixel across a frame a kilometre wide. Then it used metres-per-pixel
       derived from the altitude, which is right for a camera looking straight DOWN and wrong
       by 1/sin(depression) for one that is not: measured against an independent yardstick it
       came out five times too slow at seven hundred metres, and 1/sin(11 degrees) is 5.24.

       Three analytic models, three failures, each correct about the thing it modelled and
       blind to the next term. So stop modelling it. GRAB THE OCEAN AND PULL IT: raycast the
       cursor onto the sphere at pointer-down, raycast it again on every move THROUGH THE
       CAMERA AS IT WAS AT pointer-down, and rotate the globe by whatever takes one to the other.
       That is what dragging a map means, and it is exact at every altitude, every tilt, every
       latitude and every field of view without knowing about any of them. */
    if (!drag.grab) { clearTrackVoyage(); S.lon = drag.lon; S.lat = drag.lat; placeCamera(); return; }
    /* ⚠ AND ONE STEP IS THE WHOLE SOLUTION — I TRIED TO IMPROVE IT AND MADE IT WORSE.
       Rotating by the angle between the two surface directions is exact when the visible patch
       is nearly flat, which is every altitude below about a hundred kilometres: measured error
       ZERO metres at 700 m and one metre at 1.5 km. It drifts to 0.17 per cent from a thousand
       kilometres up, where perspective foreshortening near the limb means a degree of rotation
       is not a degree of view.

       Iterating the step to chase that residual took 700 m from 0 m of error to 643 m. The
       reason is that placeCamera() swings the AIM as well as the position — the tilt is a
       function of altitude and the aim a function of lon/lat — so the map being solved is not
       the near-identity the iteration assumes, and it oscillates instead of converging. The
       single step stays. The residual it leaves is at globe zoom, where nothing is being aimed
       at more precisely than a continent. */
    const cur = raySphereDir(e.clientX, e.clientY, drag.cam);
    if (!cur) return;                                  // cursor is off the limb: nothing to hold
    const q = new THREE.Quaternion().setFromUnitVectors(cur, drag.grab);
    const p = lonLatToVec(drag.lon, drag.lat, 1).applyQuaternion(q);
    const ll = vecToLonLat(p);
    clearTrackVoyage();
    S.lon = ll.lon;
    S.lat = Math.max(-84, Math.min(84, ll.lat));
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
    if (tr && tr.vesselId) followShip(tr);
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
    /* ── ⚠ ZOOM THE ALTITUDE, NOT THE RADIUS ────────────────────────────────────────
       S.dist is measured from the CENTRE of the Earth, so scaling it by 11 per cent near
       the surface is a step of eleven kilometres — one wheel click took the camera from
       765 km straight through the atmosphere to the seabed. What the eye is actually
       changing is height above the ground, and the whole useful range of that is four and
       a half decades: 38,000 km down to 500 m. Scaling the ALTITUDE gives an even
       forty-odd clicks across all of it, and no click ever moves more than a ninth of
       however high you already are. Same reasoning as the drag gain, which was fixed for
       the same reason two rounds ago and should have taught me this one. */
    if (S.follow) {
      /* ⚠ ZOOMING OUT NO LONGER LETS GO OF HER. It used to: past 90 km the map simply took
         over, on the reasoning that there was no button to find. But it meant the close-up
         had no stable far end — back off to look at her against the coast and the view threw
         you out — and it made leaving an accident rather than a decision. The button is the
         way out, and it is on the card in front of you. */
      S.followDist = Math.max(25, Math.min(FOLLOW_MAX_M,
                                           S.followDist * (1 + Math.sign(e.deltaY) * 0.13)));
      placeCamera();
      return;
    }
    const alt = Math.max(MAP_FLOOR_M / 63710, S.dist - R);
    S.dist = R + Math.max(MAP_FLOOR_M / 63710,
                          Math.min(600, alt * (1 + Math.sign(e.deltaY) * 0.11)));
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
  /* ⚠ AND IT IS PUMPED BEFORE THE VIEW SWITCH, NOT AFTER. Sitting below the early returns for
     the Shipwright, the Action and the Yard, it never ran in any of them — so opening the
     Shipwright with an era still building left the queue stuck forever, and the frozen capture
     waited out its whole timeout on a readiness flag that was correctly refusing to fire on a
     half-built fleet. The era's shipping belongs to the app, not to one view of it.
     A capture has no viewer to keep smooth, so it takes as much as it likes per frame. */
  pumpFleetQueue(FROZEN ? 250 : 4);

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
  stepTrackVoyage();
  stepVoyage(dt);
  stepCampaign(dt);
  /* ── ⚠ TEN HOURS PER SECOND IS RIGHT FOR A MAP AND ABSURD FROM TWO KILOMETRES OFF ──
     The pacing that makes a voyage take three minutes at globe scale has the treasure fleet
     covering FIVE HUNDRED AND SEVENTY KILOMETRES IN FOUR SECONDS when you are standing beside
     her — she crosses the whole near-field patch between frames. Time has to descend with the
     camera, the way every other scale in this view already does.

     A separate voyage clock, advanced by dt times a compression that eases from 10 h/s at map
     scale to about sixty times real time alongside — where a treasure ship makes 4.9 knots,
     so sixty of those is a ship that visibly moves and a coast that visibly changes without
     being a blur. In frozen mode it is pinned to clockS() exactly as before, so every baseline
     holds. */
  if (FROZEN) { voyT = clockS(); }
  else {
    const aM = Math.max(1, (camera.position.length() - R) * 63710);
    const f = Math.max(0, Math.min(1,
      (Math.log(aM) - Math.log(1000)) / (Math.log(120000) - Math.log(1000))));
    /* ── ⚠ AND THE COMPRESSION AT THE WATERLINE HAD TO MEAN SOMETHING ────────────────
       600 was a number that felt right, and once the near water started streaming past the
       hull it stopped being invisible: at the waterline the voyage clock ran about fourteen
       times real time, so a 16-knot ship had 224 knots of water going by. Nobody would read
       that as a container ship.
       C is now derived rather than chosen. Screen speed on the map is knots x 4.41 km per
       clock-second (see the pacing above); real speed is knots x 1.852/3600. The ratio is
       8,577, so dividing by that at the waterline puts the ship at HER OWN SPEED through the
       water, and the same constant as the exponent base leaves the map end exactly as it was. */
    const C = 8577;
    voyT += dt * (1 / C) * Math.pow(C, f);
  }
  stepEraFleet(voyT);
  refreshFleetList(t);
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

  /* ── ⚠ THE SEA VIEW HAD NO LIGHTS IN IT AT ALL, AND THE SHIPS WERE BLACK CUT-OUTS ────
     Not dim, not badly lit — this scene contained zero light objects. The globe, the ocean,
     the atmosphere and the labels are all drawn with their own ShaderMaterials, which carry
     their sun as a uniform and need nothing from the scene graph, so the omission was
     invisible for the entire life of the view. The HULLS are MeshStandardMaterial, and a
     standard material in a scene with no lights resolves to black. Every ship on the map was
     a flat silhouette of a correctly-detailed model.

     Two lights, and they are driven from the SAME sun vector the water is drawn with rather
     than from constants of their own. A second opinion about where the sun is would show up
     immediately as a hull lit from one side and a sea glittering from the other — the
     two-models-of-one-thing fault this project keeps finding. The hemisphere stands in for
     sky above and water below, which is most of what actually lights a ship at sea. */
  if (!seaKey) {
    seaKey = new THREE.DirectionalLight(0xfff4e2, 2.6);
    seaSky = new THREE.HemisphereLight(0xcfe4f6, 0x2e4a58, 1.5);
    scene.add(seaKey); scene.add(seaSky);
  }
  {
    const sv = sunVector(S.month);
    /* placed far out along the sun vector: a directional light only uses its direction, but
       three.js takes that from position minus target, and the target defaults to the origin */
    seaKey.position.set(sv.x * R * 6, sv.y * R * 6, sv.z * R * 6);
    /* night side: let the key fall away rather than lighting hulls the sea cannot see */
    const up = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z).normalize();
    seaKey.intensity = 0.55 + 2.35 * Math.max(0, up.dot(sv));
  }

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

  /* ── THE DESCENT: THE SAME NEAR FIELD, ANCHORED UNDER THE CAMERA ────────────────────
     Below the handover altitude the ocean stops being a colour computed per pixel and becomes
     a displaced surface with the fleet standing in it at their own size. Everything needed is
     already here — the Passage's scene, its water, the one wave table — and the only change is
     what the anchor is attached to. */
  /* she is under way, so the camera has to be re-aimed every frame or she sails out of shot */
  if (S.follow && !fly) {
    if (!S.follow.at) releaseShip();
    else {
      placeCamera();
      /* ⚠ the card read "Wind —" the whole time in this mode: PSGV.wind is set by the OTHER
         way in, and following her never wrote it. The sea state on screen comes from this same
         lookup, so a blank here meant the number and the water had no common source. */
      {
        const fw = window.SHIPS_ROUTE && window.SHIPS_ROUTE.windAt
                 ? window.SHIPS_ROUTE.windAt(S.follow.at.lon, S.follow.at.lat, S.month) : null;
        if (fw) PSGV.wind = Math.max(1.5, Math.min(17, fw.speed));
      }
      passageReadout(S.follow.at.lon, S.follow.at.lat, S.follow.at.hdg, PSGV.wind);
    }
  }
  const altMetres = Math.max(0, (camera.position.length() - R)) * 63710;
  /* ⚠ THE NEAR FIELD IS A MODE, NOT AN ALTITUDE. Gating it on height meant every close look at
     the map paid for a displaced ocean nobody had asked for, and it meant backing off inside
     the close-up silently swapped the true-scale hull for a globe token halfway through a
     movement. Following her engages it and holds it however far off you stand. The altitude
     test remains for `#z=`, which is how the descent baselines address the view directly. */
  const descending = !PSGV.on &&
                     (!!S.follow || window.SHIPS_PSG.psgDescentActive(altMetres));
  if (descending) {
    /* ⚠ the near camera is derived from this matrix, and three.js only refreshes it during
       render — one frame stale is one frame of the whole ocean sliding under the ship */
    camera.updateMatrixWorld(true);
    const dw = window.SHIPS_ROUTE.windAt(S.lon, S.lat, S.month);
    const dws = dw ? Math.max(1.5, Math.min(17, dw.speed)) : 7.0;
    window.SHIPS_PSG.psgDescent(clockS(), S.lon, S.lat, R, sunVector(S.month), dws,
                                camera, altMetres);
    window.SHIPS_PSG.psgFleet(eraTracks, R, clockS(), dws,
                              (APP.vessels && APP.vessels.vessels) || [],
                              S.follow ? S.follow.name : null);
    /* the globe tokens would be drawn into the backdrop at exaggerated size and then buried
       by the depth clear — the same hulls, twice, one of them wrong */
    if (eraFleet) eraFleet.visible = false;
  } else if (!PSGV.on) {
    window.SHIPS_PSG.psgFleetClear();
    if (eraFleet && !PSGV.on) eraFleet.visible = true;
  }

  if ((PSGV.on && window.SHIPS_PSG.PSG.on) || descending) {
    /* ── TWO SCALES, ONE FRAME ────────────────────────────────────────────────────────
       The Earth first, with a near plane measured in tens of kilometres, so its depth buffer
       has the precision a planet needs. Then the depth is cleared and the ship and her water
       are drawn with a near plane of 35 cm. Sharing one depth range between a 6371 km sphere
       and a plank would give neither of them any precision at all — the ship would z-fight
       with itself and the horizon would tear.

       The near-field pass is drawn second and unconditionally in front, which is correct:
       everything in it is within seven kilometres, and everything in the backdrop is the
       distance beyond that. */
    /* the backdrop uses the same altitude-aware range as everything else — a fixed near
       plane here would clip the planet out of the very view it is the backdrop for */
    /* ── ⚠ THE BACKDROP HAS NEVER ONCE BEEN VISIBLE ─────────────────────────────────
       renderer.autoClear is TRUE by default, so the second render() cleared the COLOUR buffer
       as well as the depth — every frame of the descent and the Passage threw the globe away
       and drew only the near field over black. What I have been calling the horizon in all of
       these views was the near-field sky meeting the near-field water; the Earth was painted
       and discarded a hundred times a second. It is why a carrack eleven kilometres off the
       Spanish coast had an empty sea to the north, and why this file's own header claimed the
       backdrop supplied "any coast within sight" when it supplied nothing at all.

       The world layers sky, then Earth, then the water at your feet, so the frame is built in
       that order with the clears done by hand. Only DEPTH is cleared between passes; clearing
       colour is what destroyed it. */
    const NP = window.SHIPS_PSG.PSG;
    renderer.autoClear = false;
    renderer.clear(true, true, true);

    NP.sea.visible = false;
    const landWas = NP.land ? NP.land.visible : false;
    if (NP.land) NP.land.visible = false;
    if (NP.fleetGroup) NP.fleetGroup.visible = false;
    renderer.render(NP.scene, NP.cam);                 // 1. the sky, filling the frame

    NP.sea.visible = true;
    if (NP.land) NP.land.visible = landWas;
    if (NP.fleetGroup) NP.fleetGroup.visible = true;
    NP.sky.visible = false;
    setCameraDepthRange();
    renderer.clearDepth();
    renderer.render(scene, camera);                    // 2. the Earth, where it projects

    renderer.clearDepth();
    renderer.render(NP.scene, NP.cam);                 // 3. the water she is in
    NP.sky.visible = true;
    renderer.autoClear = true;

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
    plate: v.id,
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
let paceClamped = [];
/* Routing a voyage is deterministic given its waypoints, the datum and which canals exist, and
   it is the most expensive thing this app does. Sixty-two of them, recomputed every time the
   era strip is touched, is work already done. Keyed on the grid's own signature so a change of
   era or sea level invalidates it correctly rather than serving a track for the wrong coast. */
const trackCache = new Map();
/* ── AND THE HULLS WERE REBUILT EVERY TIME TOO ────────────────────────────────────────────
   `buildShip` ran once per VOYAGE, so era 4's thirteen voyages built thirteen hulls for seven
   distinct vessel types — and every one of them again on the next era switch. A coarse hull is
   10 ms, which is nothing until it is forty of them between one click and the next frame.
   Twenty-five types exist, so twenty-five builds is the whole budget for a session.
   ⚠ Everything here is CLONED from the cache, including the flagship. clone() JSON-copies
   userData, but nothing in the era fleet reads a live reference out of one — `grp.userData.loa`
   is written from the vessel spec, and only the globe's own material has per-frame uniforms. */
const hullProtoCache = new Map();
function hullProto(ves) {
  let p = hullProtoCache.get(ves.id);
  if (!p) { p = window.SHIPS_HULL.buildShip(ves.hull); hullProtoCache.set(ves.id, p); }
  return p;
}
/* ONE reading of a ship's speed, used by the pacing, the card and anything else that asks.
   Two readings is how a hull came to be paced at 16 knots and described at 6 on the same
   screen at the same moment. */
function shipKn(ves) {
  const curve = ves && ves.polar && ves.polar.curve;
  if (curve) {
    const vals = Object.keys(curve).map(k => curve[k]).filter(v => isFinite(v));
    if (vals.length) return Math.max.apply(null, vals);
  }
  return (ves && ves.speedKn) || 6;
}
function seaRoute(legs) {
  const it = seaRouteSteps(legs);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
/* one leg of A* per step, then one finishing pass per step — so the largest thing this can do
   between two frames is a single pass over a single voyage */
function* seaRouteSteps(legs) {
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
    if (path) { for (const p of path) push(p.lon, p.lat); }
    else { seaRouteMisses++; push(a.lon, a.lat); push(b.lon, b.lat); }
    yield;
  }
  /* ⚠ The finishing runs HERE, on the assembled voyage, not inside the passage search. Each
     segment was already clean against itself; every bad corner measured was at a seam. */
  if (out.length > 2 && RT && RT.finishTrackSteps) {
    const it = RT.finishTrackSteps(out);
    let r = it.next();
    while (!r.done) { yield; r = it.next(); }
    return r.value;
  }
  return out.length > 1 ? out : legs;
}

function clearEraFleet() {
  setHover(null);
  if (eraFleet) { scene.remove(eraFleet); }
  eraFleet = null; eraTracks = [];
  fleetQueue = [];              /* an era abandoned mid-build must not finish into the next one */
  /* ⚠ and the selected voyage's line belongs to the era too. Nothing cleared it, which is how
     a voyage from 1650 stayed on screen in 1950. */
  clearVoyage();
}

function buildEraFleet() {
  clearEraFleet();
  paceClamped = [];
  /* ⚠ THE ROUTER MUST BE ON THE ERA'S SHORELINE, and this has to happen before any track is
     planned. At 60,000 BP the sea is 68 m lower; routing that era against the modern coast put
     309 drawn samples of 253,092 on land, every one of them in era 0. The coarse grid is
     rebuilt from the fine array whenever the datum moves — a second and a half, once per era. */
  {
    const RTs = window.SHIPS_ROUTE;
    if (RTs && RTs.setSeaLevel && mat && mat.uniforms && mat.uniforms.uSeaLevel) {
      if (RTs.setSeaLevel(mat.uniforms.uSeaLevel.value, S.year)) RTs.buildMask(true);
    }
  }
  const ch = (APP.chapters && APP.chapters.chapters) ? APP.chapters.chapters[S.era] : null;
  if (!ch || !APP.voyages || !APP.vessels) return;
  const from = ch.from, to = ch.to;
  const vy = (APP.voyages.voyages || APP.voyages).filter(v =>
    v.legs && v.legs.length > 1 && v.year >= from && v.year <= to);
  if (!vy.length) return;

  eraFleet = new THREE.Group();
  scene.add(eraFleet);
  /* ── ⚠ AND IT ALL HAPPENED BETWEEN ONE CLICK AND THE NEXT FRAME ────────────────────────
     Routing thirteen voyages and building forty hulls is 1.1 to 2.7 seconds of arithmetic, and
     it ran synchronously inside the era button's handler — so every era switch froze the whole
     app for over a second, with no frame drawn and no way to tell it apart from a hang. That is
     the performance problem: not the frame cost, which is under two milliseconds, but one long
     stall in the place a viewer clicks most.
     The work is the same; it is now a QUEUE with a time budget, pumped from the frame loop.
     Ships appear over a second or so and the map never stops moving. ⚠ In frozen mode the
     capture waits for the queue to drain, because a baseline of a half-built fleet is a frame
     of the wrong world. */
  fleetQueue = vy.map(v => ({ v }));
  fleetQueueList = APP.vessels.vessels || APP.vessels;
  /* ⚠ and NOT a pump here. Doing "just a little" of it inside the click handler put 2.0 s back
     into the click, because the budget can only be honoured between steps and the first steps
     of thirteen voyages are cheap enough that a great many of them run. The frame loop owns
     this work; selectEra's job is to say what the era is and return. */
}

let fleetQueue = [];
let fleetQueueList = null;
function fleetQueueBusy() { return fleetQueue.length > 0; }
function pumpFleetQueue(budgetMs) {
  if (!fleetQueue.length || !eraFleet) return;
  const t0 = performance.now();
  const list = fleetQueueList;
  const RTc = window.SHIPS_ROUTE;
  /* ⚠ AND THE KEY MUST CARRY THE RASTER LEVEL. FINE.sig is the datum and which canals exist —
     both real dependencies, and both incomplete. The terrain streams in behind the first paint,
     so a track routed before the upgrade was planned on the 19.5 km level-0 coastline and one
     routed after on the 4.9 km level-2 one. Those are different tracks of different LENGTH, so
     the voyage's period differs and the ship is somewhere else at the same frozen instant.
     Measured: the aboard frame put the Great Western at 51 deg 16' N in one run and 50 deg 11'
     N in the next — 120 km apart, 84% of pixels different, with no code change between them.
     The mask upgrade already rebuilds the fleet; it could not help while the cache handed back
     the old answer. */
  const sig = ((RTc && RTc.FINE && RTc.FINE.sig) || '') +
              '|L' + (RTc && RTc.FINE ? RTc.FINE.level : -1);
  while (fleetQueue.length && performance.now() - t0 < budgetMs) {
    const item = fleetQueue[0];
    if (item.legsR === undefined) {
      if (!item.gen) {
        item.ck = item.v.id + '|' + sig;
        const cached = trackCache.get(item.ck);
        if (cached) item.legsR = cached;
        else { item.gen = seaRouteSteps(item.v.legs); continue; }
      } else {
        let r;
        try { r = item.gen.next(); }
        catch (e) { console.warn('route', item.v.name, e); r = { done: true, value: item.v.legs }; }
        if (!r.done) continue;                   /* one pass done; check the budget again */
        item.legsR = r.value;
        trackCache.set(item.ck, item.legsR);
      }
    }
    fleetQueue.shift();
    try { addVoyageToFleet(item.v, list, item.legsR); }
    catch (e) { console.warn('fleet', item.v && item.v.name, e); }
  }
  if (!fleetQueue.length) buildVoyageList();
}

function addVoyageToFleet(v, list, legsR) {
  {
    const ves = list.find(x => x.id === v.vessel);
    if (!ves || !ves.hull) return;
    let proto;
    try { proto = hullProto(ves); } catch (e) { return; }

    /* Ships sail in company where it was the practice and alone where it was not. A treasure
       fleet, an Indies convoy and a battle squadron moved together; a clipper raced alone
       and a lone canoe is the whole point of the Pacific story. */
    const together = /treasure|carrack|indiaman/.test(v.vessel) ? 3
                   : /container|steamer/.test(v.vessel) ? 1
                   : /canoe|dugout/.test(v.vessel) ? 2 : 1;
    const grp = new THREE.Group();
    for (let n = 0; n < together; n++) {
      const holder = new THREE.Group();
      const sh = proto.clone();
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
      /* her own phase, so no two ships in company wander together — see stepEraFleet */
      holder.userData.wander = n * 2.399963 + ves.hull.loa * 0.017;
      grp.add(holder);
    }
    grp.userData.loa = ves.hull.loa;
    eraFleet.add(grp);

    /* ── ⚠ EVERY SHIP IN THE MODEL WAS SAILING AT SIX KNOTS ─────────────────────────
       `ves.polar.best` does not exist. The polar is a CURVE — a dict of wind angle to speed —
       so this read undefined, fell through `ves.speedKn` (also absent) and landed on the
       literal 6 for all twenty-five vessels. The comment above it said a clipper crosses
       while a cog is still in the Bight, and no clipper had been faster than any cog since
       the line was written. A fallback that fires every time is not a fallback; it is the
       value, and it should be measured rather than read past. */
    const kn = shipKn(ves);

    /* ── AND THE PACE CAME FROM THE NUMBER OF WAYPOINTS ─────────────────────────────
       The old period was `n * 26 / kn * 34` — proportional to how many POINTS the track
       happens to have. That was survivable when the router emitted one point per degree of
       arc; the passage search emits corners instead, so the count changed and every voyage
       silently re-timed. Measured, the implied speeds ran from 3,400 to 23,000 knots, and
       circuits took between fifteen minutes and two hours — which is why the fleet looked
       painted on.

       A voyage takes as long as its DISTANCE over its SPEED. That is the only formula with a
       meaning, it makes the clipper genuinely lap the cog, and the compression to screen time
       is a single stated constant instead of an accident of the routing. */
    if (!legsR) legsR = seaRoute(v.legs);      /* only if a caller did not route it already */
    let km = 0;
    for (let i = 0; i < legsR.length - 1; i++) {
      const A = lonLatToVec(legsR[i].lon, legsR[i].lat, 1);
      const B = lonLatToVec(legsR[i + 1].lon, legsR[i + 1].lat, 1);
      km += Math.acos(Math.max(-1, Math.min(1, A.dot(B)))) * 6371;
    }
    /* ── AND THEN THE CLAMP ATE THE PROPORTIONALITY ────────────────────────────────────
       `clamp(hours/10, 100, 420)` looked conservative and was the whole fault. Both ends of
       the fleet hit the floor: a 20,000 km container circuit and a 500 km galley hop were each
       given 100 seconds, so the box boat crossed the screen at 200 km/s and the galley at 5 —
       screen speed proportional to ROUTE LENGTH, which is the opposite of the intent. Speed on
       screen is speed: km/s = knots × 1.852 / C, and with no clamp that identity holds exactly.

       ⚠ AND THE CEILING IS THE SAME BUG. First attempt kept a 900 s cap, and measured, it bound
       on TEN of the routes — every circumnavigation and the container circuit alike. Inside the
       cap, screen speed is again proportional to length, and the numbers came out backwards:
       Magellan at 5.8 knots crossed the screen at 61.9 km/s while the box boat at 16 knots made
       45.7. A clamp that binds on the whole interesting half of the fleet is not a bound, it is
       the formula. So there is no ceiling. A circumnavigation takes 36 minutes to come round,
       which is correct — it took three years, and the viewer watches a passage, not a lap.

       C = 0.42 h/s, so km/s = knots × 4.41 for every hull on the map, exactly. The one bound
       left is a floor of 45 s, which binds only on the very shortest hop. */
    const hours = km / (kn * 1.852);
    const want = hours * 0.42;
    const period = Math.max(45, want);
    if (want < 45) paceClamped.push(v.name);
    /* ── ⚠ HER PLACE ON THE ROUTE BELONGED TO THE LIST, NOT TO HER ──────────────────
       phase was `(eraTracks.length * 0.37) % 1` — where a ship stands along her route was
       keyed to her POSITION IN THE ERA LIST, so inserting one voyage into the data moved
       every ship built after it. Round 54's eight colonisation voyages emptied the
       map-floor frame of the treasure fleet that is its subject. The phase is the
       voyage's own: a hash of her name, stable whatever the data around her does. */
    let ph = 0;
    for (let i = 0; i < v.name.length; i++) ph = (ph * 31 + v.name.charCodeAt(i)) >>> 0;
    eraTracks.push({ grp, legs: legsR, kn, period, km, vesselId: v.vessel,
                     phase: (ph % 1000) / 1000, name: v.name });
  }
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

/* Which way is the land? Scanned outward from her on the router's own fine coastline, so the
   answer comes from the same coastline her track was planned against. Returns a bearing in
   radians from north through east, or null when there is nothing in sight — mid-ocean keeps
   the standing quarter view. */
const LAND_REACH_KM = 900;   // the scan's limit, and the figure the card prints when it finds nothing
function landward(at) {
  const RT = window.SHIPS_ROUTE;
  if (!at || !RT || !RT.isOcean || !RT.FINE || !RT.FINE.ready) return null;
  const cl = Math.max(0.05, Math.cos(at.lat * Math.PI / 180));
  /* ── ⚠ 140 km FOUND NOTHING IN THE OPEN OCEAN, WHICH IS WHERE SHIPS ARE ──────────────
     The search stopped at 140 km, and a ship on passage is by definition rarely that close to
     anything — so the close-up returned null and drew an empty horizon almost everywhere,
     which is exactly the "I cannot see land" August reported. Out to 900 km now, coarsening
     the step as it goes so the cost stays about what it was: near coasts are still found to
     3 km, and a mid-ocean position finds the continent it is actually crossing toward.
     ⚠ AND THE DRAWN DISTANCE IS NOT THE FOUND DISTANCE. This view is explicitly not to
     scale — August's own framing is island-sized pieces on a board — so a coast 600 km off is
     drawn at the edge of the near field rather than over the horizon, where at true scale it
     would be invisible by geometry alone. `km` is the range used to PLACE it; `trueKm` is
     what it really is, so the card can say so rather than implying the ship is closer than
     she is. */
  const REACH = LAND_REACH_KM, NEAR = 140;
  for (let km = 3; km <= REACH; km += (km < NEAR ? 3 : 18)) {
    for (let b = 0; b < 48; b++) {
      const th = b * Math.PI / 24;
      const lo = at.lon + Math.sin(th) * km / 111.32 / cl;
      const la = at.lat + Math.cos(th) * km / 111.32;
      if (!RT.isOcean(lo, la)) {
        /* how high it is, so the camera can be put where it can actually be seen */
        let h = 0;
        if (APP.depthCanvasByLevel && RT.FINE.level >= 0) {
          const cv = APP.depthCanvasByLevel[RT.FINE.level];
          if (cv) {
            /* ⚠ KEYED ON THE PYRAMID LEVEL. This cached the pixels on first call and kept
               them — but the terrain streams in behind the first paint, so whether the
               snapshot was the 19.5 km level-0 raster or the 4.9 km level-2 one depended on
               how quickly the machine got there. A coarse raster gives a different nearest
               land, which gives a different bearing, which points the whole close-up somewhere
               else: measured, the aboard frame came back 81% different between a solo capture
               and one taken during a full run. That was the "flap" — not a subtle one at all
               once it was looked at in the right place. */
            if (landward._lvl !== RT.FINE.level) {
              landward._lvl = RT.FINE.level;
              landward._cx = cv.getContext('2d', { willReadFrequently: true });
              landward._img = landward._cx.getImageData(0, 0, cv.width, cv.height).data;
              landward._w = cv.width; landward._h = cv.height;
            }
            const x = Math.min(landward._w - 1,
                     Math.floor((((lo + 180) % 360) + 360) % 360 / 360 * landward._w));
            const y = Math.max(0, Math.min(landward._h - 1,
                     Math.floor((90 - la) / 180 * landward._h)));
            const i = (y * landward._w + x) * 4;
            h = (landward._img[i] * 256 + landward._img[i + 1]) / 65535 * 20000 - 11000;
          }
        }
        /* compress anything beyond the near field into it, and keep the honest range */
        const drawKm = km <= NEAR ? km : NEAR * (0.72 + 0.28 * Math.min(1, NEAR / km));
        return { az: th, km: drawKm, trueKm: km, h: Math.max(0, h) };
      }
    }
  }
  return null;
}

/* ── ⚠ AND STANDING ON HER DECK IS NOT ALWAYS ENOUGH TO SEE HER COAST ────────────────────
   The horizon is sqrt(2 R h) and depends on eye height alone. Measured on Zheng He's treasure
   fleet: land 42 km away and TWENTY METRES high, which from a 54 m eye sits at exactly the
   horizon — present, and one pixel row of it. That is why land kept being "missing" for some
   ships and not others: the Athenian armada had a 121 m coast six kilometres off and the
   treasure ship had a mudflat over the curve of the Earth.
   So the stand-off is derived rather than fixed. The eye goes high enough that her coast clears
   the horizon with margin to be a band rather than a line — and no higher, because this is
   still a view of a ship. Mid-ocean, and where the coast is already plain, nothing changes. */
function standOffFor(loa, lw) {
  const base = Math.max(90, (loa || 40) * 3.2);
  if (!lw) return base;
  const R_E = 6371000;
  const dLand = Math.sqrt(2 * R_E * Math.max(1, lw.h));       // how far the land sees
  const need = Math.max(0, lw.km * 1000 - dLand);             // the rest must be the eye's
  /* ⚠ capped LOW, because the ground is lifted rather than the camera. Pushing the eye up
     until a 20 m coast cleared the horizon put the camera 600 m up and shrank the ship to a
     speck — solving the coast by losing the subject. The near ground carries a stated vertical
     exaggeration instead (uLandLift), so a modest rise here is enough. */
  const eye = Math.min(190, 1.6 * (need * need) / (2 * R_E));
  const dep = 15 * Math.PI / 180;
  return Math.max(base, Math.min(FOLLOW_MAX_M, eye / Math.sin(dep)));
}

/* ── GO DOWN TO HER, AND STAY WITH HER ────────────────────────────────────────────────────
   A flight rather than a cut, because the descent is the point: you watch the token stop being
   a token. The camera ends about nine hundred metres up and a few hundred metres off her
   quarter, which is where the near-field water and her true-scale hull have both already
   taken over from the map. */
function followShip(tr) {
  if (!tr || !tr.at) return;
  const list = APP.vessels.vessels || APP.vessels;
  const ves = list.find(x => x.id === tr.vesselId);
  if (!ves || !ves.hull) return;
  S.follow = tr;
  /* ── ⚠ AND THE CLOSE-UP USED TO POINT WHEREVER IT ALWAYS POINTED ──────────────────────
     followAz was the constant 2.4 radians, so which way you faced when you went aboard was
     fixed, and whether her coast was in the picture was luck. Measured on the Athenian armada:
     land 121 m high six kilometres away on a bearing of 79 degrees, a camera looking along
     137, and a 34-degree field of view — the coast sat 58 degrees off the axis, behind the
     viewer's shoulder, and the frame was empty ocean on every side. Nothing was wrong with the
     near-field ground; the same position reached through `#c=`/`#z=` shows the coastline
     plainly. It was out of shot.
     Going aboard now looks TOWARD the nearest land within sight, so the ship stands in the
     foreground of the place she is actually in. Dragging still turns you anywhere. */
  const lw = landward(tr.at);
  S.followAz = lw ? lw.az : 2.4;
  S.followDep = 15;
  /* a few ship-lengths off, which is where one vessel sees another */
  S.followDist = standOffFor(ves.hull.loa, lw);
  tr.aimM = (ves.hull.loa || 40) * 0.22;
  setHover(null);
  if (hoverLine) { scene.remove(hoverLine); hoverLine = null; }
  /* ⚠ use flyTo. Hand-building the flight object with `dur` and a clockS() epoch, where
     stepFly reads `ms` and performance.now(), makes (now - t0)/undefined = NaN, and a NaN
     interpolation propagates into S.dist, the camera position and every downstream measure —
     the symptom is a null altitude, not an error. */
  const eye = Math.max(6, S.followDist * Math.sin(S.followDep * Math.PI / 180));
  flyTo(tr.at.lon, tr.at.lat, R + eye / 63710, 2400);
  /* Generate her hull inside the flight, where a tenth of a second cannot be seen. ONE FRAME
     LATE deliberately: done in the click handler it is a 131 ms pause before anything moves,
     which reads as the app thinking. Deferred by a frame, the descent has visibly begun and
     the stall lands 16 ms into a 2.4 second fall, where the camera has barely left. Same work,
     and the difference is entirely whether the viewer is looking at a still frame while it
     happens. */
  window.SHIPS_PSG.psgInit(R, camera);
  requestAnimationFrame(() => window.SHIPS_PSG.psgPrebuild(tr, ves));
  passageCard(tr, ves, lw);
  /* ── AND THE VOYAGE ITSELF, NOT ONLY THE SHIP ────────────────────────────────────────
     Going aboard opened the slip — which ship, where she is, what she is steering — and
     nothing about the passage she is making. Those are different questions and both belong
     on screen: the slip is the instrument reading, the card is what the voyage was. The card
     stacks below the slip already, because syncPanelInsets measures the column. */
  const voy = ((APP.voyages && APP.voyages.voyages) || []).find(v => v.name === tr.name);
  if (voy) showVoyageCard(voy);
  document.body.classList.add('in-passage');
}

/* ── ⚠ AND THE WAY BACK UP WAS TWO HALVES OF TWO DIFFERENT DOORS ──────────────────────────
 * Clicking a hull calls followShip(), which shows the card. The card's button called
 * closePassage(), which begins `if (!PSGV.on) return` — and followShip never sets PSGV.on,
 * because PSGV belongs to the OTHER way in. So the button was correctly wired to a function
 * that was guaranteed to do nothing on the only path a user can actually take. It worked
 * perfectly when I called openPassage() by hand from the console, which is why four rounds of
 * testing never caught it: I was exercising a door nobody uses.
 *
 * One exit now, and it FLIES. The old release set S.dist directly — from the waterline to 300
 * km between two frames, which is not a zoom-out, it is a cut to a different picture, and that
 * is exactly what August described. The climb starts from where the eye actually is, which
 * means reading the camera rather than trusting S.dist, since while following she is placed by
 * the follow logic and S.dist has not been the eye's altitude for some seconds.
 */
function leaveShip(ms) {
  const tr = S.follow || PSGV.track;
  const lon = tr && tr.at ? tr.at.lon : S.lon;
  const lat = tr && tr.at ? tr.at.lat : S.lat;
  S.dist = Math.max(R + MIN_ALT, camera.position.length());
  S.lon = lon; S.lat = lat;
  if (PSGV.on) { PSGV.on = false; PSGV.track = null; window.SHIPS_PSG.psgClose(); }
  if (S.follow) { S.follow = null; window.SHIPS_PSG.psgFleetClear(); }
  if (eraFleet) eraFleet.visible = true;
  if (PSGV.card) PSGV.card.style.display = 'none';
  syncPanelInsets();
  document.body.classList.remove('in-passage');
  /* back to the top-down map at its lowest, over the place she is — not to orbit */
  flyTo(lon, lat, R + MAP_FLOOR_M / 63710, ms || 1800);
}

function releaseShip() {
  if (!S.follow) return;
  leaveShip();
}

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
  syncPanelInsets();
  document.body.classList.remove('in-passage');
  placeCamera();
}

/* ── THE CARD ────────────────────────────────────────────────────────────────────────────
 * What a chart-room would tell you and nothing else: which ship, which passage, and the
 * position she is actually at, read off the model rather than written down beside it. */
function passageCard(tr, ves, lw) {
  if (!PSGV.card) {
    const d = document.createElement('div');
    d.id = 'psgCard';
    d.innerHTML = '<button id="psgBack">↑ back to the ocean</button>' +
      '<div class="pc-ship"></div><div class="pc-voy"></div>' +
      '<table class="pc-rows"></table>';
    document.body.appendChild(d);
    PSGV.card = d;
    d.querySelector('#psgBack').onclick = () => leaveShip();
    /* built on demand, so it cannot be observed at boot — observe it now */
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncPanelInsets).observe(d);
  }
  const c = PSGV.card;
  c.style.display = 'block';
  syncPanelInsets();
  c.querySelector('.pc-ship').textContent = ves.name;
  c.querySelector('.pc-voy').textContent = tr.name;
  const H = ves.hull;
  const rows = [
    ['Length overall', H.loa.toFixed(1) + ' m'],
    ['Beam', H.beam.toFixed(1) + ' m'],
    ['Draught', H.draught.toFixed(2) + ' m'],
    /* ⚠ ves.polar.best does not exist — the same non-field that made every hull sail at the
       literal fallback of six knots two rounds ago. The card was still printing "6.0 kn" for
       a 400 m container ship while the pacing beside it used 16. One reading of one number. */
    /* ⚠ AND THE POLAR IS THE MODEL'S SPEED, NOT THE SHIP'S. An engine-driven record with a
       stated service speed (speedKn) was captioned with its ROUTING polar — Yamato at
       "9.6 kn" against a record 27 — the same class the Shipwright card fixed in round 34.
       The record's number, labelled as the record's; the pacing stays on shipKn(), and the
       gap between them is the front page's stated factor of two, not a bug to hide. */
    ves.speedKn !== undefined
      ? ['Service speed', ves.speedKn.toFixed(1) + ' kn']
      : ['Best speed, moderate breeze', shipKn(ves).toFixed(1) + ' kn'],
  ];
  c.querySelector('.pc-rows').innerHTML =
    rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') +
    '<tr><td>Position</td><td class="pc-pos">—</td></tr>' +
    '<tr><td>Course</td><td class="pc-crs">—</td></tr>' +
    '<tr><td>Wind</td><td class="pc-wnd">—</td></tr>' +
    /* ── WHAT THE LAND ON THE HORIZON IS ─────────────────────────────────────────────
       The close-up draws a coast but never said what it was, so it read as scenery rather
       than as a place. The name comes from the nearest PORT in the model's own gazetteer —
       real data, not a label invented for the view — and the range printed is the TRUE one
       even though the coast is drawn compressed into the near field, because the picture is
       admittedly not to scale and the number should not pretend otherwise. */
    '<tr><td>Nearest land</td><td class="pc-land">—</td></tr>';
  /* ── ⚠ THE LAND ROW IS FILLED HERE, BY THE FUNCTION THAT WRITES THE ROW ─────────────────
     r59 shipped this fill inside followShip, ABOVE the passageCard call that creates the
     card — so on the only path a user can take, PSGV.card was null, the guard skipped the
     write, and every card showed the placeholder. Same lesson as the consorts in r60: the
     code was correct and wired to a moment that never exists. The value and the row it
     lives in are now written by the same function, so no caller can open the card empty. */
  if (lw === undefined) lw = landward(tr.at);
  const cell = c.querySelector('.pc-land');
  if (lw) {
    /* name the coast from the gazetteer, and say how far it really is */
    const ports = (APP.ports && APP.ports.ports) || [];
    let best = null, bestD = 1e9;
    const clat = Math.max(0.05, Math.cos(tr.at.lat * Math.PI / 180));
    for (const pt of ports) {
      const dx = (pt.lon - tr.at.lon) * clat, dy = pt.lat - tr.at.lat;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = pt; }
    }
    const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
                     'S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const pt8 = COMPASS[Math.round(((lw.az * 180 / Math.PI) % 360) / 22.5) % 16];
    cell.textContent = (best ? best.name + ' · ' : '') +
                       Math.round((lw.trueKm || lw.km) / 1.852) + ' nm ' + pt8;
  } else if (window.SHIPS_ROUTE && window.SHIPS_ROUTE.FINE && window.SHIPS_ROUTE.FINE.ready) {
    /* the scan ran and found nothing: that is an answer with a number, not a missing value */
    cell.textContent = 'none within ' + Math.round(LAND_REACH_KM / 1.852) + ' nm';
  }
  /* router not ready yet: the dash stays, and it means "unknown" — rule 10 */
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
  /* ⚠ round ONCE, in minutes, and derive degrees from the result — rounding the minutes
     after the degrees were already floored printed "12° 60′ N" on the treasure fleet,
     because 12.9999° is 12° plus sixty minutes if the two fields round separately */
  const fmt = (v, s) => {
    const min = Math.round(Math.abs(v) * 60);
    return Math.floor(min / 60) + '° ' + String(min % 60).padStart(2, '0') + '′ ' + s;
  };
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

/* ── AND TWO SHIPS MAY NOT BE IN THE SAME WATER ────────────────────────────────────────────
 * Tracks are planned one at a time against the coast, and nothing has ever looked at what the
 * other ships are doing — so where two sea lanes share a strait the hulls interpenetrate, which
 * at token exaggeration means a 125 km carrack passing through a 125 km junk.
 *
 * The rule is the actual rule. Under COLREGS a vessel that must give way alters to STARBOARD,
 * and two ships meeting head-on each do so, passing port to port. Both alter here by half the
 * shortfall, which resolves the crossing case as well without needing to work out who is the
 * stand-on vessel — and the altered position is put through the same mask every other position
 * goes through, so a ship will hold her course and accept the near miss before she will take a
 * sheer toward the beach. The separation asked for is in DRAWN hull lengths, because that is
 * what a viewer sees; at globe zoom that is hundreds of kilometres and at the waterline it is
 * metres, and both are correct for their zoom.
 */
function avoidPass() {
  for (const tr of eraTracks) {
    if (tr._lo === undefined) continue;
    let need = 0;
    for (const o of eraTracks) {
      if (o === tr || o._lo === undefined) continue;
      const dLat = (o._la - tr._la) * 111.32;
      let dl = o._lo - tr._lo; if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
      const dLon = dl * 111.32 * Math.cos(tr._la * Math.PI / 180);
      const d = Math.hypot(dLat, dLon);
      const want = 0.9 * ((tr._drawKm || 0) + (o._drawKm || 0));
      if (d < want && d > 1e-6) need += (want - d) * 0.5;
    }
    need = Math.min(need, 500);
    const cur = tr.avoidKm || 0;
    /* she comes off her course briskly and returns to it slowly, which is how the helm is used */
    tr.avoidKm = cur + (need - cur) * (FROZEN ? 1 : (need > cur ? 0.05 : 0.015));
  }
}

function stepEraFleet(t) {
  if (!eraFleet) return;
  avoidPass();
  for (const tr of eraTracks) {
    const n = tr.legs.length;
    /* one full circuit in a time proportional to the track's length over the ship's speed,
       so a fast hull on a short run laps a slow one on a long one, as it would */
    /* ── AND THE PACE OF A VOYAGE ──────────────────────────────────────────────────
       Da Gama took two years to reach India and get home. Nobody will watch that, but the
       opposite error — a circumnavigation every second — says the sea is small, which is the
       one thing this whole project exists to deny. Several minutes per circuit: long enough
       that a ship is somewhere rather than everywhere, short enough to see it move. */
    const period = tr.period;
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
    let la = Math.asin(dir.y) * 180 / Math.PI;
    /* ⚠ the inverse must match lonLatToVec exactly: x = cos(lat)sin(lon), z = cos(lat)cos(lon),
       so longitude is atan2(x, z). Written as atan2(-z, x) first, which is a 90-degree rotation
       and would have put every ship in the wrong ocean while still looking like a plausible
       track. Checked against the forward transform rather than assumed. */
    let lo = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
    /* ── ⚠ THEY WERE FLYING AT 38 KILOMETRES ────────────────────────────────────────
       R * 1.006 is six tenths of a percent of the Earth's radius: thirty-eight kilometres
       up, which is above the stratosphere and about where a high-altitude balloon sits. On
       screen they read exactly as what they were — satellites, not shipping. A hull floats
       ON the water, and at globe scale that means the surface itself. */
    /* ── AND THE FLAGSHIP IS CHECKED WHERE SHE IS DRAWN, NOT ONLY WHERE SHE WAS PLANNED ──
       The track is refined against the fine coastline at five-kilometre spacing, but the ship
       is placed by slerping BETWEEN those points, and a midpoint can still clip a fringe the
       endpoints missed. Two hulls in 8,400 did. So the drawn position gets the same treatment
       the consorts get: if she is over land, walk her a little along her own course until she
       is not. Along the track, never sideways — a ship that side-steps is not sailing. */
    {
      const RTf = window.SHIPS_ROUTE;
      if (RTf && RTf.isOcean && !RTf.isOcean(lo, la)) {
        /* ⚠ ±0.9 of a leg is ±3.6 km at the finished spacing, which is not enough sea-room to
           get clear of an island the segment clipped — it is a backstop for a metre, not for a
           coastline. Widened to ±6 legs, and the real fix is in clearSegments(). */
        for (let k = 1; k <= 24; k++) {
          for (const sgn of [1, -1]) {
            const f2 = Math.min(n - 1.001, Math.max(0, f + sgn * k * 0.25));
            const i2 = Math.min(n - 2, Math.floor(f2)), fr2 = f2 - i2;
            const a2 = tr.legs[i2], b2 = tr.legs[i2 + 1];
            const lo2 = a2.lon + (b2.lon - a2.lon) * fr2, la2 = a2.lat + (b2.lat - a2.lat) * fr2;
            if (RTf.isOcean(lo2, la2)) { lo = lo2; la = la2; k = 99; break; }
          }
        }
      }
    }
    /* the alteration for traffic, applied to starboard of the ship's own course and refused if
       it would put her ashore — the mask has the last word here as everywhere else */
    if ((tr.avoidKm || 0) > 0.5) {
      const dl0 = ((b.lon - a.lon + 540) % 360) - 180;
      const brgR = Math.atan2(Math.sin(dl0 * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180),
        Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
        Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos(dl0 * Math.PI / 180));
      const stb = brgR + Math.PI / 2;
      const dLa = tr.avoidKm * Math.cos(stb) / 111.32;
      const dLo = tr.avoidKm * Math.sin(stb) / (111.32 * Math.max(0.05, Math.cos(la * Math.PI / 180)));
      const RTa = window.SHIPS_ROUTE;
      if (!RTa || !RTa.isOcean || RTa.isOcean(lo + dLo, la + dLa)) { lo += dLo; la += dLa; }
    }
    tr._lo = lo; tr._la = la;
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
    /* ── AND SHE SHRINKS TO HER OWN SIZE ON THE WAY DOWN ────────────────────────────
       The token above is an exaggeration of about 1,600 : 1 — from 765 km a 42 m hull is
       eight hundredths of a pixel, so there is no honest alternative at globe zoom. But it
       has to be UNWOUND on the descent or a 200 km carrack ends up floating on 100 m waves.
       Geometric blend on log altitude: full token above 300 km, unity at the handover, so a
       hull crosses into the near-field scene already her own size and the seam has nothing
       to show. */
    {
      const tok = (S.dist * 0.0098) / tr.grp.userData.loa;
      const tru = R / 6371000;
      const altU = Math.max(MIN_ALT, S.dist - R);
      const hi = 300000 / 63710, lo = window.SHIPS_PSG.DESCENT_M / 63710;
      const f = Math.max(0, Math.min(1,
        (Math.log(altU) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))));
      tr.grp.scale.setScalar(tru * Math.pow(Math.max(tok / tru, 1e-6), f));
      /* how long this hull is ON SCREEN, in kilometres of ocean — the unit traffic separation
         has to be measured in, since that is the overlap a viewer actually sees */
      tr._drawKm = tr.grp.scale.x * tr.grp.userData.loa * 6371 / R;
    }
    /* heading from the track on the sphere, projected into the local tangent plane */
    const up = w.clone().normalize();
    let fwd = lonLatToVec(b.lon, b.lat, R).sub(lonLatToVec(a.lon, a.lat, R));
    fwd.sub(up.clone().multiplyScalar(fwd.dot(up)));
    if (fwd.lengthSq() < 1e-9) continue;
    fwd.normalize();
    /* ── ⚠ A SHIP CANNOT CHANGE HEADING INSTANTLY ────────────────────────────────────
       Even a clean track has corners, and taking the segment bearing straight from the track
       makes the hull snap round them between one frame and the next. A vessel swings: she has
       a rudder, a turning circle, and a rate measured in degrees per minute. Damping the
       heading toward the course rather than setting it gives that for free, and it also
       absorbs whatever kinks survive the route cleanup — the geometry stops being the only
       thing standing between the viewer and a ship that pirouettes. */
    const m = tangentBasis(up, fwd);
    if (!m) continue;
    const want = new THREE.Quaternion().setFromRotationMatrix(m);
    if (!tr.heading) { tr.heading = want.clone(); }
    else {
      const ang = 2 * Math.acos(Math.min(1, Math.abs(tr.heading.dot(want))));
      /* the bigger the error the harder she puts the helm over, up to a real limit.
         ⚠ AND IT IS PER FRAME, WHICH IS A CLOCK. Frozen mode pins every clock so two captures
         of identical code match — but this damping advances once per frame regardless of dt,
         so the drawn heading depended on HOW MANY FRAMES the harness happened to run before it
         captured, and the descent frame came back 1.7% different every time. Same for the
         consort easing below. A capture wants the settled value, not the journey to it. */
      const rate = FROZEN ? 1 : Math.min(0.16, 0.02 + ang * 0.10);
      tr.heading.slerp(want, rate);
    }
    tr.grp.quaternion.copy(tr.heading);
    /* ── ⚠ THE TRACK IS CLEAN AND THE CONSORTS ARE NOT ─────────────────────────────
       The passage search puts the FLAGSHIP in open water and I verified that at 72,768
       samples. But a consort is not on the track: she is stationed abeam of it, and at token
       exaggeration one ship-length is about two hundred kilometres of ocean, so a formation
       that reads correctly in the Pacific puts her wingmen inland in the Yellow Sea. Swept
       across 200 phases of every track in every era, **11.45 per cent of drawn hulls were
       ashore** — and every one of them was a consort, never the flagship. My earlier check
       sampled one phase per zoom level, which is exactly the coverage gap that could not see
       this: a track is a curve and a fleet is an area.

       The fix is the thing a real fleet does. **When the sea-room narrows, a squadron closes
       up.** Each station is tested against the mask and drawn in toward the flagship until it
       is afloat; if there is no room at all she takes station astern in the flagship's own
       water. Nothing is invented — the formation is simply as wide as the water allows. */
    const Rlocal = R / tr.grp.scale.x;
    const RTm = window.SHIPS_ROUTE;
    /* ⚠ the station test transforms by grp.matrixWorld, and three.js only refreshes that at
       render — testing a consort against where the fleet was LAST frame leaves her ashore at
       every turn of the track, which is 3% of drawn hulls */
    tr.grp.updateMatrixWorld(true);
    /* ── ⚠ AND CLOSING UP IN FIVE DISCRETE STEPS IS WHAT MADE THEM POP ────────────────
       The first version tried station factors 1, 0.55, 0.30, 0.17, 0 and took the first that
       was afloat. Sailing down a coast, a consort therefore SNAPPED between five fixed
       distances from her flagship, several times a second — which reads exactly as August
       described it: companions popping in and jumping around. A squadron closing up does it
       by steering, over minutes.

       Two changes. The factor is found by BISECTION, so it is continuous rather than one of
       five values; and it is then eased toward, so a change of station is a movement rather
       than a teleport. The station a consort is holding is now state that persists between
       frames, which is what makes easing possible at all. */
    for (const h of tr.grp.children) {
      const st = h.userData.station;
      if (!st) continue;
      const place = (f) => {
        const x = st.x * f, z = st.z * f, r2 = x * x + z * z;
        return { x, z, y: Math.sqrt(Math.max(0, Rlocal * Rlocal - r2)) - Rlocal };
      };
      const afloat = (f) => {
        if (f <= 0.001) return true;                       // the flagship's own water
        const q = place(f);
        const wp = new THREE.Vector3(q.x, q.y, q.z).applyMatrix4(tr.grp.matrixWorld);
        const cl = vecToLonLat(wp);
        return !RTm || !RTm.isOcean || RTm.isOcean(cl.lon, cl.lat);
      };
      let target;
      if (afloat(1)) target = 1;
      else {
        let lo = 0, hi = 1;
        for (let b = 0; b < 7; b++) { const mid = (lo + hi) * 0.5; if (afloat(mid)) lo = mid; else hi = mid; }
        target = lo;
      }
      if (h.userData.stationF === undefined) h.userData.stationF = target;
      /* ease, and ease IN faster than out — a ship closes up smartly and opens out gently */
      const cf = h.userData.stationF;
      const rate = FROZEN ? 1 : (target < cf ? 0.020 : 0.008);
      h.userData.stationF = cf + (target - cf) * rate;
      const q = place(h.userData.stationF);

      /* ── ⚠ A SQUADRON IS NOT A FORMATION FLIGHT ──────────────────────────────────
         Each consort sat at an exact multiple of the flagship's length, and the only thing
         that ever changed was ONE shared factor applied to all of them — so the group moved
         as a single rigid body. In the Crossing era, where a voyage is two or three canoes,
         that reads exactly as August described it: boats holding parade formation, locked
         abeam of each other, which is the one thing small craft in open water never do.

         A ship keeping station does not sit on it. She is conned onto it by eye, falls off
         to leeward, and is brought back — a wander of minutes, not seconds, and every ship
         in company wanders independently because every helmsman is a different person.
         Two incommensurate periods per axis so the path never closes into a visible cycle,
         phased off the hull's own index so no two ships share one, at a few per cent of the
         interval. Amplitude scales with the interval, so a close formation stays close.

         ⚠ Driven by clockS(), not performance.now(). Anything that reads wall-clock for
         appearance breaks the frame ratchet for everyone — the standing rule in CLAUDE.md —
         and a capture of a wandering fleet has to be deterministic like everything else. */
      const ph = h.userData.wander || 0;
      const T = (typeof clockS === 'function') ? clockS() : 0;
      const wob = (a, b, k) => Math.sin(T / a + k) * 0.62 + Math.sin(T / b + k * 1.7) * 0.38;
      const amp = Math.hypot(st.x, st.z) * 0.085;
      if (amp > 0) {
        q.x += wob(37.0, 61.0, ph) * amp;
        q.z += wob(43.0, 71.0, ph * 1.31) * amp;
        /* the station was dropped onto the sphere; the wandered point has to be too, or a
           consort rides above or below the water she was just floated on */
        const r2w = q.x * q.x + q.z * q.z;
        q.y = Math.sqrt(Math.max(0, Rlocal * Rlocal - r2w)) - Rlocal;
        /* and she is not steering the flagship's exact course either */
        h.rotation.y = wob(53.0, 79.0, ph * 0.77) * 0.045;
      }
      h.position.set(q.x, q.y, q.z);
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
      const sh = proto.clone();
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
