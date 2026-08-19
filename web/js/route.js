/* route.js — the spine.
 *
 * Given a hull's polar diagram, a wind field and a month, compute the time to reach every
 * point in the world ocean from a chosen port. The result is a FIELD, not a line: the ocean
 * fills with isochrones, and you can read off how far a particular ship could get in twenty
 * days in March.
 *
 * That field is the thing this whole project is about. It is why the Portuguese sailed west to
 * go south, why the Indian Ocean has a sailing calendar, and why a square rig could not do what
 * a crab claw could. None of that is drawn by hand here — it falls out of the wind.
 *
 * ── THE ALGORITHM ────────────────────────────────────────────────────────────────
 * Time-dependent Dijkstra on a lat-lon graph, 16-connected, with true geodesic edge lengths.
 *
 * Not naive isochrones, and the reason is specific. Isochrone pruning keeps, per angular
 * sector, the point nearest the destination — which DELETES THE BROUWER ROUTE BY CONSTRUCTION,
 * because the whole idea of that route is to sail temporarily away from Java in order to reach
 * the westerlies. A method that cannot represent the model's own headline case is the wrong
 * method. (Hagiwara's sub-sector formula ΔS = cΔD/sin(c·d) is the classical fix for isochrone
 * self-intersection and is worth knowing; we avoid the problem instead of patching it.)
 *
 * Grid bias is a real, quantified cost and it is why the neighbourhood is 16 and not 8:
 *     4-connected  +41.42%      8-connected  +8.2392%
 *    16-connected   +2.75%     32-connected  +1.31%
 * (Bailey, Nash, Tovey & Koenig, *Artificial Intelligence* 301, 2021.) Edge costs use the true
 * haversine length of each step, so the lat-lon grid's pole convergence is a sampling-density
 * problem rather than a wrong-cost problem.
 *
 * ── WHAT IT DOES NOT DO, and these are stated in About ───────────────────────────
 *  * No currents. The set-and-drift term and the water-frame wind correction
 *    (TW_water = TW_ground − V_current) are both written below and both inert, because no
 *    redistributable global surface-current climatology was found at kickoff that could be
 *    downloaded without a login. It is the top item in the gap register.
 *  * The wind is a monthly climatology, so every passage is a TYPICAL passage. This model does
 *    not reconstruct the weather of a named voyage and says so.
 */
'use strict';

const NAV_W = 512, NAV_H = 256;      // the routing grid; ~0.7° at the equator
const R_EARTH_NM = 3440.065;         // nautical miles

const NAV = { ready: false, depth: null, w: NAV_W, h: NAV_H };

/* ── the navigable grid ────────────────────────────────────────────────────────── */
function buildNavGrid() {
  if (NAV.ready || !APP.depthCanvas) return NAV.ready;
  const src = APP.depthCanvas;
  const cw = src.width, chh = src.height;
  const cx = src.getContext('2d', { willReadFrequently: true });
  const img = cx.getImageData(0, 0, cw, chh).data;

  const depth = new Float32Array(NAV_W * NAV_H);
  for (let y = 0; y < NAV_H; y++) {
    const sy = Math.min(chh - 1, Math.floor((y + 0.5) / NAV_H * chh));
    for (let x = 0; x < NAV_W; x++) {
      const sx = Math.min(cw - 1, Math.floor((x + 0.5) / NAV_W * cw));
      const i = (sy * cw + sx) * 4;
      const u16 = img[i] * 256 + img[i + 1];
      depth[y * NAV_W + x] = u16 / 65535 * 20000 - 11000;   // metres, negative at sea
    }
  }
  NAV.depth = depth;
  NAV.ready = true;
  return true;
}

/* wind, sampled from the shipped monthly field. Read once per solve into a flat array so the
   inner loop never touches the DOM. */
/* ⚠ fetch + createImageBitmap, NOT `new Image()` + `decode()`.
   HTMLImageElement.decode() can stall indefinitely when the tab is backgrounded or the pane
   is hidden — the promise simply never settles, and the whole solve hangs with no error.
   createImageBitmap on a fetched blob has no such dependency on visibility, and it is the
   same path the tile loader already uses. colorSpaceConversion:'none' matters here for the
   same reason it matters there: these bytes are numbers, not colours. */
const _windCache = new Map();
async function sampleWind(monthIndex) {
  const m = ((monthIndex % 12) + 12) % 12;
  if (_windCache.has(m)) return _windCache.get(m);
  const name = `fields/wind_${String(m + 1).padStart(2, '0')}.png`;
  const blob = await (await fetch(name)).blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none',
                                              premultiplyAlpha: 'none' });
  const img = { width: bmp.width, height: bmp.height };
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingEnabled = false;
  cx.drawImage(bmp, 0, 0);
  bmp.close();
  const d = cx.getImageData(0, 0, img.width, img.height).data;
  const u = new Float32Array(NAV_W * NAV_H), v = new Float32Array(NAV_W * NAV_H);
  const ice = new Float32Array(NAV_W * NAV_H);
  for (let y = 0; y < NAV_H; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y + 0.5) / NAV_H * img.height));
    for (let x = 0; x < NAV_W; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x + 0.5) / NAV_W * img.width));
      const i = (sy * img.width + sx) * 4;
      const k = y * NAV_W + x;
      u[k] = (d[i] / 255 - 0.5019608) * 2 * 25;      // m/s, east
      v[k] = (d[i + 1] / 255 - 0.5019608) * 2 * 25;  // m/s, north
      ice[k] = d[i + 2] / 255 * 100;                 // per cent concentration
    }
  }
  const out = { u, v, ice };
  _windCache.set(m, out);
  return out;
}

/* ── geometry ──────────────────────────────────────────────────────────────────── */
const D2R = Math.PI / 180;
function cellLat(y) { return 90 - (y + 0.5) / NAV_H * 180; }
function cellLon(x) { return -180 + (x + 0.5) / NAV_W * 360; }

function haversineNm(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * D2R, p2 = lat2 * D2R;
  const dp = (lat2 - lat1) * D2R, dl = (lon2 - lon1) * D2R;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R_EARTH_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}
/* initial great-circle bearing, degrees clockwise from true north */
function bearingDeg(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lon2 - lon1) * D2R;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / D2R + 360) % 360;
}

/* ── the polar ─────────────────────────────────────────────────────────────────── */
/* Speed through the water, in knots, for a true wind speed (m/s) and true wind angle (deg,
   0 = dead on the nose). The stored curve is at a reference 8 m/s; speed scales sub-linearly
   with wind, and the pointing angle DEGRADES as it blows harder — which is the whole
   behaviour of a square rig and the reason the trade-wind routes exist. */
/* ⚠ COMPILED ONCE PER SOLVE, into a flat lookup.
   The first version parsed the polar's JSON object on every edge — Object.keys().map().sort()
   two million times — and a solve that should take a fraction of a second took over thirty.
   The inner loop of a search must touch nothing but typed arrays. */
function compilePolar(polar) {
  const STEP = 1;                                   // one degree of resolution is ample
  const n = 181;
  const spd = new Float32Array(n);
  const keys = Object.keys(polar.curve).map(Number).sort((a, b) => a - b);
  for (let a = 0; a < n; a++) {
    let lo = keys[0], hi = keys[keys.length - 1];
    for (let i = 1; i < keys.length; i++) {
      if (a <= keys[i]) { lo = keys[i - 1]; hi = keys[i]; break; }
    }
    const f = hi === lo ? 0 : (a - lo) / (hi - lo);
    spd[a] = polar.curve[lo] * (1 - f) + polar.curve[hi] * f;
  }
  /* The muscle floor, precompiled like everything else the inner loop touches. head[a] is
     the fraction of the true wind that is on the nose at angle a — cosine forward of the
     beam, zero abaft it. Windage only ever subtracts: the fair-wind help is already in the
     curve, and adding it twice would sail the paddlers downwind on their own wake. */
  let head = null;
  if (polar.floor) {
    head = new Float32Array(n);
    for (let a = 0; a < 91; a++) head[a] = Math.cos(a * Math.PI / 180);
  }
  return { spd, beatLight: polar.beatLight, beatHard: polar.beatHard,
           isEngine: polar.beatLight === 0, STEP,
           floorKn: polar.floor ? polar.floor.kn : 0,
           floorLoss: polar.floor ? polar.floor.lossKnPerMs : 0, head };
}

/* The beat angle worsens as it blows harder: 71° at force 2 becoming 90° at force 4 is
   MEASURED, on GPS-instrumented replicas. Its own function because the battle's helm needs
   the same gate polarSpeed enforces: a ship ordered dead upwind falls to this angle, she
   does not ghost through it — one definition, so helm and speed cannot disagree. */
function polarBeat(P, twsMs) {
  let hard = (twsMs - 5.0) / 6.0;
  hard = hard < 0 ? 0 : (hard > 1 ? 1 : hard);
  return P.beatLight + (P.beatHard - P.beatLight) * hard;
}

function polarSpeed(P, twsMs, twaDeg) {
  const twa = twaDeg < 0 ? -twaDeg : twaDeg;
  const a = twa > 180 ? 180 : (twa | 0);
  const base = P.spd[a];
  if (P.isEngine) return base;

  /* Above the hard limit a sailing hull makes no ground to windward at all, and the
     router is told so rather than allowed to cheat. */
  let sail = 0;
  const beat = polarBeat(P, twsMs);
  if (twa >= beat) {
    /* Speed rises roughly with the square root of wind and then saturates on the hull's own
       wave-making. */
    const s = Math.sqrt((twsMs > 0.4 ? twsMs : 0.4) / 8.0);
    sail = base * (s > 1.55 ? 1.55 : s);
  }
  if (!P.floorKn) return sail;

  /* The muscle floor. Oars are not a sail: a calm does not slow them and a gale does not
     help them, so this term is never scaled by the wind — the only thing the wind does to
     a paddled hull is stand against her, and the loss is the measured windage of hull and
     crew per m/s of head component (Olympias: 5.4 kn cruise falling to ~2.9 into a head
     sea). She goes straight upwind at it — no beat angle under muscle. */
  const mus = P.floorKn - P.floorLoss * P.head[a] * twsMs;
  return sail > mus ? sail : (mus > 0 ? mus : 0);
}

/* ── binary heap ───────────────────────────────────────────────────────────────── */
class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    this.k.push(key); this.v.push(val);
    let i = this.k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p] <= this.k[i]) break;
      this._swap(p, i); i = p;
    }
  }
  pop() {
    const top = this.v[0], tk = this.k[0];
    const lk = this.k.pop(), lv = this.v.pop();
    if (this.k.length) {
      this.k[0] = lk; this.v[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let s = i;
        if (l < this.k.length && this.k[l] < this.k[s]) s = l;
        if (r < this.k.length && this.k[r] < this.k[s]) s = r;
        if (s === i) break;
        this._swap(s, i); i = s;
      }
    }
    return { key: tk, val: top };
  }
  _swap(a, b) {
    const tk = this.k[a]; this.k[a] = this.k[b]; this.k[b] = tk;
    const tv = this.v[a]; this.v[a] = this.v[b]; this.v[b] = tv;
  }
}

/* 16-connected neighbourhood: the 8 king moves plus the 8 knight moves. Worst-case path-length
   overestimate 2.75%, against 8.24% for 8-connected. */
const NEIGH = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2],
];

/* ── the edge table ────────────────────────────────────────────────────────────────
   On a regular lat-lon grid the length and bearing of a step depend on the ROW and the step,
   and not at all on the column: moving one cell east from 40°N is the same 32 nautical miles
   on the same bearing whether you do it in the Atlantic or the Pacific.
   So both are precomputed once — 256 rows x 16 steps — and the inner loop of the search does
   no trigonometry whatever. That is the difference between a solve that takes half a minute
   and one that takes a fraction of a second, and it is exact rather than an approximation. */
let EDGE = null;
function buildEdgeTable() {
  if (EDGE) return EDGE;
  const dist = new Float32Array(NAV_H * 16);
  const brg = new Float32Array(NAV_H * 16);
  for (let y = 0; y < NAV_H; y++) {
    const lat = cellLat(y);
    for (let n = 0; n < 16; n++) {
      const [dx, dy] = NEIGH[n];
      const ny = y + dy;
      if (ny < 0 || ny >= NAV_H) { dist[y * 16 + n] = -1; continue; }
      const nlat = cellLat(ny);
      const dlon = dx * (360 / NAV_W);
      dist[y * 16 + n] = haversineNm(lat, 0, nlat, dlon);
      brg[y * 16 + n] = bearingDeg(lat, 0, nlat, dlon);
    }
  }
  EDGE = { dist, brg };
  return EDGE;
}

/* ── the solve ─────────────────────────────────────────────────────────────────── */
async function solveReach(lon0, lat0, vessel, monthIndex) {
  if (!buildNavGrid()) return null;
  buildEdgeTable();
  const wind = await sampleWind(monthIndex);
  const polar = compilePolar(vessel.polar);
  const draught = vessel.draught || 6;      // metres; shallow water is a hard constraint

  const N = NAV_W * NAV_H;
  /* ⚠ Float64, NOT Float32, and this cost most of an evening.
     The heap keys are ordinary JS numbers (float64). Writing one into a Float32Array rounds
     it; reading it back gives a slightly DIFFERENT number. The stale-entry guard
     `if (key > cost[k]) continue` then fires on almost every node — because key is the exact
     float64 and cost[k] is the rounded float32 just below it — and Dijkstra silently drops
     most of the frontier. It does not crash, it does not warn, and it produces a search that
     expands 4,500 cells out of 70,000 and looks merely "conservative".
     The comparison and the store must be in the same precision. */
  const cost = new Float64Array(N).fill(Infinity);
  const done = new Uint8Array(N);

  const navigable = (k) => {
    const d = NAV.depth[k];
    if (d > -draught) return false;                 // land, or too shallow to float
    if (wind.ice[k] > 15) return false;             // the conventional ice-edge threshold
    return true;
  };

  /* seed: the nearest navigable cell to the port, so a harbour that sits on a land pixel of a
     0.7° grid still departs from water rather than returning nothing. */
  let sx = Math.round((lon0 + 180) / 360 * NAV_W - 0.5);
  let sy = Math.round((90 - lat0) / 180 * NAV_H - 0.5);
  sx = ((sx % NAV_W) + NAV_W) % NAV_W;
  sy = Math.max(0, Math.min(NAV_H - 1, sy));
  let seed = -1;
  for (let r = 0; r <= 4 && seed < 0; r++) {
    for (let dy = -r; dy <= r && seed < 0; dy++) {
      for (let dx = -r; dx <= r && seed < 0; dx++) {
        const y = sy + dy; if (y < 0 || y >= NAV_H) continue;
        const x = ((sx + dx) % NAV_W + NAV_W) % NAV_W;
        const k = y * NAV_W + x;
        if (navigable(k)) seed = k;
      }
    }
  }
  if (seed < 0) return null;

  const heap = new Heap();
  cost[seed] = 0;
  heap.push(0, seed);
  let expanded = 0;

  while (heap.size) {
    const { key, val: k } = heap.pop();
    if (done[k]) continue;
    if (key > cost[k]) continue;
    done[k] = 1;
    expanded++;
    /* 400 days. Generous on purpose: a caravel crossing the Atlantic at two knots takes
       months, and cutting the search at 200 days silently turned "slow" into "impossible",
       which is a different claim entirely. The RENDER stops at 200 days; the SEARCH does not,
       so the boundary you see is the boundary of the voyage rather than of the algorithm. */
    if (key > 9600) continue;

    const y = (k / NAV_W) | 0, x = k - y * NAV_W;
    const erow = y * 16;

    for (let n = 0; n < 16; n++) {
      const dy = NEIGH[n][1], dx = NEIGH[n][0];
      const ny = y + dy;
      if (ny < 1 || ny >= NAV_H - 1) continue;              // the poles are not routed
      const nx = ((x + dx) % NAV_W + NAV_W) % NAV_W;        // longitude wraps, always
      const nk = ny * NAV_W + nx;
      if (done[nk] || !navigable(nk)) continue;

      const distNm = EDGE.dist[erow + n];
      if (distNm < 0) continue;
      const brg = EDGE.brg[erow + n];

      /* wind at the midpoint of the leg, in the GROUND frame.
         ⚠ When a current field exists, subtract it here to reach the water frame before the
         polar is evaluated — a 2 kn current on a 10 kn wind is a ±20% swing in true wind speed
         and up to 11° in direction, which is more than a windshift. Written, and inert. */
      const wu = (wind.u[k] + wind.u[nk]) * 0.5;
      const wv = (wind.v[k] + wind.v[nk]) * 0.5;
      /* ⚠ VECTOR MEAN vs SCALAR MEAN — the sharpest methodological limit in this engine.
         The shipped field is a monthly mean of the wind VECTOR. Wherever the direction varies
         through the month, the vector mean is far smaller than the wind a ship actually feels:
         two weeks of a westerly gale and two weeks of an easterly gale average to a flat calm.
         Measured on this field, 35% of the world ocean shows a vector mean under 2 m/s, which
         is not remotely true of the storm tracks.
         |vector mean| <= scalar mean always, so the vector field is a LOWER BOUND on speed
         while remaining the right answer for prevailing DIRECTION. Until a scalar-mean field
         is shipped (top of the gap register), a documented floor of force 3 stands in for it.
         The doldrums stay slow because their scalar mean genuinely is low; the westerlies stop
         being a calm. This is disclosed in About, not hidden in a constant. */
      const twsRaw = Math.sqrt(wu * wu + wv * wv);
      const tws = twsRaw > 4.0 ? twsRaw : 4.0;
      /* meteorological convention: the direction the wind blows FROM */
      const windFrom = (Math.atan2(-wu, -wv) * 57.29577951308232 + 360) % 360;
      const twa = Math.abs(((windFrom - brg + 540) % 360) - 180);

      const stw = polarSpeed(polar, tws, twa);
      if (stw <= 0.05) continue;                            // cannot sail this leg at all

      const nc = key + distNm / stw;
      if (nc < cost[nk]) { cost[nk] = nc; heap.push(nc, nk); }
    }
  }

  return { cost, expanded, seed };
}

/* ── render the field into a texture the shader reads ──────────────────────────── */
function reachToTexture(cost) {
  const px = new Uint8Array(NAV_W * NAV_H * 4);
  let reached = 0;
  for (let i = 0; i < NAV_W * NAV_H; i++) {
    const c = cost[i];
    if (!isFinite(c)) { px[i * 4 + 3] = 255; continue; }
    reached++;
    const q = Math.max(0, Math.min(65535, Math.round(c / 9600 * 65535)));
    px[i * 4] = q >> 8;
    px[i * 4 + 1] = q & 0xFF;
    px[i * 4 + 2] = 255;                       // the mask: this cell was reached
    px[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, NAV_W, NAV_H, THREE.RGBAFormat);
  tex.flipY = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, reached };
}

/* ── public entry, called from the port card ───────────────────────────────────── */
async function computeReachFrom(port, vesselId) {
  const vessels = (APP.vessels && APP.vessels.vessels) || [];
  const v = vessels.find(x => x.id === vesselId) || vessels.find(x => x.id === 'square')
            || vessels[0];
  if (!v) return null;

  const t0 = performance.now();
  const res = await solveReach(port.lon, port.lat, v, Math.floor(S.month) % 12);
  if (!res) return null;
  const { tex, reached } = reachToTexture(res.cost);
  mat.uniforms.uReach.value = tex;
  mat.uniforms.uLyReach.value = 1;
  S.layers.reach = 1;
  const box = document.getElementById('lyReach');
  if (box) box.checked = true;

  const ms = performance.now() - t0;
  const pct = (reached / (NAV_W * NAV_H) * 100);
  return { vessel: v, reached, pct, ms };
}

/* Passage time to a named place, read straight out of the solved field — this is what gets
   scored against the recorded passage times in SCOPE §9. */
function passageHours(cost, lon, lat) {
  const x = ((Math.round((lon + 180) / 360 * NAV_W - 0.5) % NAV_W) + NAV_W) % NAV_W;
  const y = Math.max(0, Math.min(NAV_H - 1, Math.round((90 - lat) / 180 * NAV_H - 0.5)));
  let best = Infinity;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const yy = y + dy; if (yy < 0 || yy >= NAV_H) continue;
      const xx = ((x + dx) % NAV_W + NAV_W) % NAV_W;
      const c = cost[yy * NAV_W + xx];
      if (c < best) best = c;
    }
  }
  return best;
}

/* ── IS THERE WATER HERE? ────────────────────────────────────────────────────────────────
 * The nav grid already holds elevation in metres, negative at sea, at about 0.7 degrees. That
 * is the same data the seafloor layer draws from, so a ship routed with it cannot end up on a
 * coastline the globe does not show — the failure that ARCHITECTURE-PATTERNS §4 exists to
 * prevent, and the one that put two carracks in the middle of Brazil.
 *
 * A DRAUGHT MARGIN, not a shoreline test. Asking only "is the elevation below zero" puts hulls
 * in half a metre of water over a reef. Ships keep off soundings, so the test is for water a
 * vessel could actually swim in, and deep enough that the 0.7-degree grid rounding a headland
 * to seaward cannot beach her.
 */
function seaDepthAt(lon, lat) {
  if (!buildNavGrid()) return -4000;                       // unknown: assume open ocean
  let x = Math.floor(((lon + 180) % 360) / 360 * NAV_W);
  if (x < 0) x += NAV_W;
  const y = Math.floor((90 - lat) / 180 * NAV_H);
  if (y < 0 || y >= NAV_H) return -4000;
  return NAV.depth[y * NAV_W + Math.min(NAV_W - 1, x)];
}

function isNavigable(lon, lat, minDepth) {
  return seaDepthAt(lon, lat) < -(minDepth === undefined ? 60 : minDepth);
}

/* ══ THE LAND MASK, AND WHY A SHIP WAS PARKED ON BRITTANY ══════════════════════════════
 *
 * The fleet on the globe used to place ships by interpolating a great circle between two
 * waypoints and nudging any sample that failed `isNavigable` sideways until it found water.
 * Three things were wrong with that at once, and they compounded:
 *
 *   1. The grid was NAV's 0.7 degrees — 78 km at the equator. Brittany is narrower than that
 *      in places, so the peninsula was barely present in the data being consulted.
 *   2. `isNavigable` defaults to 60 m of water. That is right for keeping a deep-draught hull
 *      off soundings, and completely wrong as a shoreline test: the English Channel averages
 *      63 m and is 30–50 m over most of its area, so the whole Channel, the North Sea, the
 *      Yellow Sea and the Sunda Shelf all read as unnavigable — as LAND, in effect.
 *   3. A sample that could not find water within 14 degrees was DROPPED. Dropping a point does
 *      not remove the track; it removes the corner, and the ship then runs in a straight line
 *      from the last surviving point to the next one — directly across whatever was in the way.
 *
 * So the failure was not "the check let a ship onto land". The check declared most of Europe's
 * shelf to be land, could not route around it, gave up, and the giving-up drew the shortcut.
 *
 * ── WHAT REPLACES IT ──────────────────────────────────────────────────────────────────
 * A real mask and a real search. The mask is the full level-0 elevation grid — 2048 x 1024,
 * about 19.5 km at the equator, sixteen times the cells — thresholded at 5 m of water, and
 * then reduced to the ONE connected ocean. That last step matters more than it sounds: Nanjing
 * sits on the Yangtze and Bristol on the Severn, and the nearest "water" to each is river or
 * lake water that goes nowhere. Snapping a port to unreachable water fails the search in a way
 * that looks exactly like an impossible voyage.
 *
 * Between two points we run A* over that ocean, eight-connected, with a cost penalty within
 * three cells of a coast. The penalty is not decoration: without it the cheapest path hugs
 * every shoreline, because a coast-following path is geometrically shorter than standing off,
 * and ships do not do that. With it, open water is preferred and narrow passages stay open,
 * since a penalty raises the price of a strait without closing it.
 *
 * ── THE CARVED PASSAGES, DECLARED ─────────────────────────────────────────────────────
 * A 19.5 km raster cannot hold a 3 km channel. The Strait of Magellan is 2 km wide at the
 * First Narrows and the Bosphorus is 700 m, so both are solid rock in this grid, and Magellan's
 * voyage — the one that is ABOUT a strait — could not be drawn through it. These are cut back
 * in explicitly, by name, as data rather than as a fudge buried in the search: the model is
 * asserting that a passage exists which its own raster is too coarse to see, and that assertion
 * should be legible and auditable. Nothing else is carved. Suez and Panama are absent from the
 * mask, which is correct for every voyage in this model that predates them and, for the box
 * route, means the search finds the Cape — the same answer a closed canal gives a real fleet.
 */
/* ⚠ NOT A CONSTANT ANY MORE. The mask is sized to the elevation canvas it is built from, so
   that the coastline the router plans against is the coastline the shader draws. Level 2 is
   8192 x 4096 — 4.9 km a cell — which is 33.5 million cells, so the flood fill below cannot
   use a queue of one Int32 per cell (134 MB). It sweeps instead. */
let MASK_W = 2048, MASK_H = 1024;
const SHOAL_M = -5;                          // shallower than this is not water for routing

/* Real waterways below the resolution of the elevation raster. lon/lat pairs, cut one cell
   either side of the line. Each is here because a voyage in this model actually used it. */
const CARVED = [
  { name: 'Strait of Magellan', why: '2 km at the First Narrows; the raster cell is 19.5 km',
    line: [[-68.4, -52.5], [-70.5, -53.6], [-71.4, -53.9], [-74.0, -52.9], [-75.4, -52.6]] },
  { name: 'Bosphorus and the Dardanelles', why: '700 m at the narrowest',
    line: [[26.2, 40.1], [29.2, 41.3], [30.0, 41.9]] },
  /* ── AND TWO OF THEM HAVE A DATE ────────────────────────────────────────────────────────
     A carve is a statement that water is there. For these two it is a statement that water was
     PUT there, on a known day, and a treasure fleet that crosses the Isthmus of Panama because
     the router was told the canal exists is a worse error than one that sails round the Horn.
     So they open when they opened, and the search grid is rebuilt when that changes. */
  { name: 'Suez Canal', why: 'opened 1869; 205 m wide against a 19.5 km cell', from: 1869,
    line: [[32.30, 31.30], [32.32, 30.90], [32.31, 30.58], [32.35, 30.35], [32.55, 29.93],
           [32.80, 29.60]] },
  { name: 'Panama Canal', why: 'opened 1914; 33 m at the locks', from: 1914,
    line: [[-79.92, 9.40], [-79.92, 9.27], [-79.80, 9.18], [-79.68, 9.10], [-79.55, 8.95],
           [-79.48, 8.80]] },
];

const MASK = { ready: false, ocean: null, coast: null, w: MASK_W, h: MASK_H,
               cache: new Map() };

/* which level the mask was last built from — so an upgrade can be detected */
MASK.level = -1;

function bestDepthCanvas() {
  const by = APP.depthCanvasByLevel;
  if (!by) return { cv: APP.depthCanvas, level: 0 };
  let best = -1;
  for (const k of Object.keys(by)) { const n = +k; if (n > best) best = n; }
  return best < 0 ? { cv: APP.depthCanvas, level: 0 } : { cv: by[best], level: best };
}

/* Rebuild if a finer level has arrived. Returns true when the mask changed, so the caller can
   re-route anything that was planned against the coarser coastline. */
function maskUpgradeAvailable() {
  const b = bestDepthCanvas();
  return !!b.cv && b.level > MASK.level;
}

/* ══ TWO GRIDS, AND WHY ═══════════════════════════════════════════════════════════════════
 *
 * The land TEST and the path SEARCH want opposite things and were being served by one grid.
 *
 *   * The test has to agree with the PICTURE, or ships are drawn ashore while the mask insists
 *     they are at sea — which is exactly what happened: the mask was level 0 at 19.5 km and the
 *     globe had been drawing from level 2 at 4.9 km since the progressive upgrade. Measured,
 *     three of fifteen hulls were over land with the mask calling all fifteen afloat.
 *
 *   * The search cannot run on that. Level 2 is 33.5 million cells, and A* wants a cost, a
 *     came-from and a stamp per cell — four hundred megabytes of scratch, on whatever machine
 *     opens the page. Building it that way made the problem WORSE, not better: 37.8 per cent of
 *     hulls drawn over land, because the search now failed outright and fell back to the raw
 *     waypoints, which are ports and therefore inland.
 *
 * So: a FINE water array for asking "is this point land", at exactly the resolution the shader
 * draws; and a COARSE grid for the search, whose cells are marked navigable only when EVERY
 * fine cell inside them is water. That conservative downsample is the whole trick — it makes
 * the router strictly more cautious than the renderer, which is the only safe direction for the
 * two to disagree in, and it gives every route a built-in stand-off of one coarse cell from the
 * coastline the viewer can actually see.
 */
/* ── ⚠ AND THE SEA HAS NOT ALWAYS BEEN AT THIS LEVEL ──────────────────────────────────────
 * This array held a BOOLEAN — water or not — decided once against the present datum. The globe
 * does not: era 0 is 60,000 BP and the shader draws the shoreline 68 metres lower, with Sunda a
 * peninsula and Sahul one continent. So every route in that era was planned on a coastline that
 * would not exist for another fifty thousand years, and measured, 309 of 253,092 drawn samples
 * crossed land — ALL of them in era 0, and none anywhere else. The audit had been reading the
 * sea level once, before the loop, which is why four rounds of this work never saw it.
 *
 * It is also the more interesting error of the two. The crossing to Sahul is in this project
 * *because* of the low stand: the water gaps were short, and that is what made the crossing
 * possible at all. Routing it on modern coastlines does not merely draw the wrong pixels, it
 * argues the wrong thing. So the array holds ELEVATION, and the datum is a parameter.
 */
const FINE = { ready: false, elev: null, w: 0, h: 0, level: -1, datum: 0, year: 3000, sig: '',
               blockedSeen: 0, detourFail: 0, unfixed: 0 };

function buildFine(src, level) {
  const cw = src.width, ch = src.height;
  const cx = src.getContext('2d', { willReadFrequently: true });
  const img = cx.getImageData(0, 0, cw, ch).data;
  const elev = new Int16Array(cw * ch);
  for (let k = 0; k < elev.length; k++) {
    const i = k * 4;
    elev[k] = Math.max(-32768, Math.min(32767,
      Math.round((img[i] * 256 + img[i + 1]) / 65535 * 20000 - 11000)));
  }
  FINE.elev = elev; FINE.w = cw; FINE.h = ch; FINE.level = level; FINE.ready = true;
}

function fineIsWater(lon, lat) {
  if (!FINE.ready) return true;
  const x = Math.min(FINE.w - 1, Math.floor((((lon + 180) % 360) + 360) % 360 / 360 * FINE.w));
  const y = Math.max(0, Math.min(FINE.h - 1, Math.floor((90 - lat) / 180 * FINE.h)));
  return FINE.elev[y * FINE.w + x] < FINE.datum + SHOAL_M;
}

/* The era's datum, in metres relative to today. Returns true when it CHANGED, because that
   invalidates the coarse routing grid built from it — the caller rebuilds rather than this
   deciding for it, so the order of mask rebuild and fleet rebuild stays in one place. */
/* ⚠ AND THE DATUM IS QUANTISED, because a tenth of a metre is not a coastline. Eras 1 to 7
   carry sea levels of -0.5, -0.1 and 0 m, all of which produced DIFFERENT signatures and so
   rebuilt the whole 2-million-cell routing grid — 350 ms inside the click — for a shift that is
   a tenth of the 5 m shoal threshold the grid is thresholded at. Rounded to 5 m, only the ice
   age is distinct, which is the only place the sea level is doing any work. */
function setSeaLevel(m, year) {
  const v = Math.round((m || 0) / 5) * 5;
  const y = year === undefined ? FINE.year : year;
  /* the signature is what the grid actually depends on: the datum, and WHICH carves apply.
     Comparing the year itself would rebuild on every drag of the slider for no change. */
  const sig = v + '|' + CARVED.map(c => (c.from === undefined || y >= c.from) ? 1 : 0).join('');
  if (sig === FINE.sig) return false;
  FINE.datum = v; FINE.year = y; FINE.sig = sig;
  /* ── AND A GRID ALREADY BUILT FOR THIS SIGNATURE IS KEPT ────────────────────────────────
     There are four distinct configurations across the whole timeline — the low stand, then
     before Suez, between Suez and Panama, and after Panama — so going back to an era you have
     already visited should cost nothing. Four megabytes each, four of them. */
  const hit = MASK.cache && MASK.cache.get(sig);
  if (hit) { MASK.ocean = hit.ocean; MASK.coast = hit.coast; MASK.ready = true; return false; }
  MASK.ready = false;
  return true;
}

function buildMask(force) {
  if (MASK.ready && !force) return true;
  const pick = bestDepthCanvas();
  if (!pick.cv) return false;
  /* ⚠ AND THE FINE ARRAY DOES NOT DEPEND ON THE DATUM. It holds ELEVATION; the datum is applied
     at every read. Rebuilding it on a sea-level change re-read 33.5 million pixels out of a
     canvas for a number that was not going to change one of them — 2.3 s of the 2.4 s an era
     switch cost. It is rebuilt only when the PICTURE changes, which is what it is a copy of. */
  if (!FINE.ready || FINE.level !== pick.level) buildFine(pick.cv, pick.level);
  MASK.level = pick.level;

  /* the search grid stays at level-0 resolution whatever the picture is drawn from */
  MASK_W = 2048; MASK_H = 1024;
  MASK.w = MASK_W; MASK.h = MASK_H;
  const N = MASK_W * MASK_H;
  const fx = FINE.w / MASK_W, fy = FINE.h / MASK_H;

  /* ⚠ AND "EVERY FINE CELL MUST BE WATER" IS TOO STRONG — IT CLOSED THE OCEAN.
     Requiring all sixteen fine cells to be water makes any coarse cell touching a coastline
     into land, which is every passage narrower than about twenty kilometres. Measured, it
     closed GIBRALTAR, Bab el Mandeb, the Sicilian Channel and both Danish straits; era 7's
     box route then failed three legs outright and fell back to its raw waypoints, drawing the
     ship across Tunisia. A rule that shuts the Strait of Gibraltar is not conservative, it is
     wrong.

     Majority instead: a coarse cell is navigable when most of it is water. That keeps real
     straits open, and the fine coastline is enforced where it actually matters — on the
     finished polyline, below, where every point is checked against the fine array and pushed
     off any land it lands on. Plan coarse, verify fine. */
  const water = new Uint8Array(N);
  for (let y = 0; y < MASK_H; y++) {
    const y0 = Math.floor(y * fy), y1 = Math.min(FINE.h, Math.ceil((y + 1) * fy));
    for (let x = 0; x < MASK_W; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.min(FINE.w, Math.ceil((x + 1) * fx));
      let wet = 0, tot = 0;
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          tot++; if (FINE.elev[yy * FINE.w + xx] < FINE.datum + SHOAL_M) wet++;
        }
      water[y * MASK_W + x] = (tot && wet * 2 >= tot) ? 1 : 0;
    }
  }

  /* the declared passages, cut one cell either side — and only the ones that exist yet */
  for (const c of CARVED) {
    if (c.from !== undefined && FINE.year < c.from) continue;
    for (let s2 = 0; s2 < c.line.length - 1; s2++) {
      const a = maskCell(c.line[s2][0], c.line[s2][1]);
      const b = maskCell(c.line[s2 + 1][0], c.line[s2 + 1][1]);
      const ay = (a / MASK_W) | 0, ax = a % MASK_W, by = (b / MASK_W) | 0, bx = b % MASK_W;
      const n = Math.max(Math.abs(by - ay), Math.abs(bx - ax)) * 3 + 1;
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const y = Math.round(ay + (by - ay) * f), x = Math.round(ax + (bx - ax) * f);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = Math.max(0, Math.min(MASK_H - 1, y + dy)), xx = (x + dx + MASK_W) % MASK_W;
          water[yy * MASK_W + xx] = 1;
        }
      }
    }
  }

  /* ONE ocean: flood from mid-Pacific, so lakes and unreachable river water are excluded */
  const ocean = new Uint8Array(N);
  const q = new Int32Array(N);
  let qh = 0, qt = 0;
  const seed = maskCell(-150, 10);
  ocean[seed] = 1; q[qt++] = seed;
  while (qh < qt) {
    const k = q[qh++], y = (k / MASK_W) | 0, x = k % MASK_W;
    for (let d = 0; d < 4; d++) {
      const ny = y + (d === 0 ? 1 : d === 1 ? -1 : 0);
      const nx = (x + (d === 2 ? 1 : d === 3 ? -1 : 0) + MASK_W) % MASK_W;
      if (ny < 0 || ny >= MASK_H) continue;
      const nk = ny * MASK_W + nx;
      if (water[nk] && !ocean[nk]) { ocean[nk] = 1; q[qt++] = nk; }
    }
  }
  /* distance to the nearest non-ocean cell, capped — the standoff cost reads this */
  const coast = new Uint8Array(N).fill(7);
  qh = qt = 0;
  for (let k = 0; k < N; k++) if (!ocean[k]) { coast[k] = 0; q[qt++] = k; }
  while (qh < qt) {
    const k = q[qh++], c = coast[k];
    if (c >= 6) continue;
    const y = (k / MASK_W) | 0, x = k % MASK_W;
    for (let d = 0; d < 4; d++) {
      const ny = y + (d === 0 ? 1 : d === 1 ? -1 : 0);
      const nx = (x + (d === 2 ? 1 : d === 3 ? -1 : 0) + MASK_W) % MASK_W;
      if (ny < 0 || ny >= MASK_H) continue;
      const nk = ny * MASK_W + nx;
      if (coast[nk] > c + 1) { coast[nk] = c + 1; q[qt++] = nk; }
    }
  }
  MASK.ocean = ocean; MASK.coast = coast; MASK.ready = true;
  /* keep it against its signature, so returning to an era already visited is free */
  if (MASK.cache && FINE.sig) MASK.cache.set(FINE.sig, { ocean, coast });
  return true;
}

function maskCell(lon, lat) {
  const x = Math.min(MASK_W - 1, Math.floor((((lon + 180) % 360) + 360) % 360 / 360 * MASK_W));
  const y = Math.max(0, Math.min(MASK_H - 1, Math.floor((90 - lat) / 180 * MASK_H)));
  return y * MASK_W + x;
}
function cellLonLat(k) {
  const y = (k / MASK_W) | 0, x = k % MASK_W;
  return { lon: (x + 0.5) / MASK_W * 360 - 180, lat: 90 - (y + 0.5) / MASK_H * 180 };
}
/* the question "is this point at sea" is answered by the FINE array, because that is what the
   viewer is looking at. The coarse ocean array answers "may a route be planned here", which is
   deliberately stricter. */
function isOcean(lon, lat) {
  if (!buildMask()) return true;
  return fineIsWater(lon, lat);
}
function isRoutable(lon, lat) {
  if (!buildMask()) return true;
  return !!MASK.ocean[maskCell(lon, lat)];
}

/* the nearest cell of the ONE ocean — a port given in a river mouth is walked out to sea */
function snapToOcean(k, maxR) {
  if (MASK.ocean[k]) return k;
  const y0 = (k / MASK_W) | 0, x0 = k % MASK_W;
  for (let r = 1; r <= (maxR || 40); r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dy), Math.abs(dx)) !== r) continue;
        const y = y0 + dy; if (y < 0 || y >= MASK_H) continue;
        const nk = y * MASK_W + ((x0 + dx + MASK_W) % MASK_W);
        if (MASK.ocean[nk]) return nk;
      }
    }
  }
  return -1;
}

/* ── A*, with reusable scratch ─────────────────────────────────────────────────────────
   Allocating 2 million floats per leg would cost more than the search. The arrays are kept
   and a monotonically increasing stamp marks which entries belong to the current run, so
   nothing has to be cleared between calls. */
const _AS = { g: null, from: null, stamp: null, run: 0, hk: null, hv: null, hn: 0 };
function heapPush(k, v) {
  let i = _AS.hn++;
  if (i >= _AS.hk.length) {
    const nk = new Float32Array(_AS.hk.length * 2), nv = new Int32Array(_AS.hv.length * 2);
    nk.set(_AS.hk); nv.set(_AS.hv); _AS.hk = nk; _AS.hv = nv;
  }
  _AS.hk[i] = k; _AS.hv[i] = v;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (_AS.hk[p] <= _AS.hk[i]) break;
    const tk = _AS.hk[p], tv = _AS.hv[p];
    _AS.hk[p] = _AS.hk[i]; _AS.hv[p] = _AS.hv[i]; _AS.hk[i] = tk; _AS.hv[i] = tv;
    i = p;
  }
}
function heapPop() {
  const top = _AS.hv[0];
  _AS.hn--;
  if (_AS.hn > 0) {
    _AS.hk[0] = _AS.hk[_AS.hn]; _AS.hv[0] = _AS.hv[_AS.hn];
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let s = i;
      if (l < _AS.hn && _AS.hk[l] < _AS.hk[s]) s = l;
      if (r < _AS.hn && _AS.hk[r] < _AS.hk[s]) s = r;
      if (s === i) break;
      const tk = _AS.hk[s], tv = _AS.hv[s];
      _AS.hk[s] = _AS.hk[i]; _AS.hv[s] = _AS.hv[i]; _AS.hk[i] = tk; _AS.hv[i] = tv;
      i = s;
    }
  }
  return top;
}

const CELL_NM = 180 / MASK_H * 60;            // one cell of latitude, in nautical miles

/* Find a sea passage between two points. Returns an array of {lon, lat} that is guaranteed to
   lie in open water at the mask's resolution, or null if there is no route at all. */
function seaPath(lon0, lat0, lon1, lat1) {
  if (!buildMask()) return null;
  const a = snapToOcean(maskCell(lon0, lat0)), b = snapToOcean(maskCell(lon1, lat1));
  if (a < 0 || b < 0) return null;
  if (a === b) return [{ lon: lon0, lat: lat0 }, { lon: lon1, lat: lat1 }];

  const N = MASK_W * MASK_H;
  if (!_AS.g) {
    _AS.g = new Float32Array(N); _AS.from = new Int32Array(N);
    _AS.stamp = new Int32Array(N); _AS.hk = new Float32Array(1 << 16); _AS.hv = new Int32Array(1 << 16);
  }
  const run = ++_AS.run;
  const by = (b / MASK_W) | 0, bx = b % MASK_W;
  const h = (y, x) => {
    const dy = Math.abs(y - by);
    let dx = Math.abs(x - bx); if (dx > MASK_W / 2) dx = MASK_W - dx;
    const kx = Math.cos((90 - (y + 0.5) / MASK_H * 180) * Math.PI / 180);
    return Math.hypot(dy, dx * kx);
  };
  _AS.hn = 0;
  _AS.g[a] = 0; _AS.stamp[a] = run; _AS.from[a] = -1;
  heapPush(h((a / MASK_W) | 0, a % MASK_W), a);
  const closed = new Set();
  let guard = 0;
  while (_AS.hn > 0 && guard++ < 4000000) {
    const cur = heapPop();
    if (closed.has(cur)) continue;
    closed.add(cur);
    if (cur === b) break;
    const cy = (cur / MASK_W) | 0, cxx = cur % MASK_W;
    const kx = Math.cos((90 - (cy + 0.5) / MASK_H * 180) * Math.PI / 180);
    for (let dy = -1; dy <= 1; dy++) {
      const ny = cy + dy; if (ny < 0 || ny >= MASK_H) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = (cxx + dx + MASK_W) % MASK_W;
        const nk = ny * MASK_W + nx;
        if (!MASK.ocean[nk]) continue;
        /* ⚠ NO CUTTING CORNERS. Eight-connected movement will happily step diagonally between
           two land cells that meet at a corner — both the cell left and the cell arrived at are
           water, so every point test passes, and the ship slips through a headland on the
           diagonal. Require the two orthogonal cells that share the corner to be water as well,
           which is the same rule a hull obeys: you cannot pass through a point. */
        if (dx && dy && (!MASK.ocean[cy * MASK_W + nx] || !MASK.ocean[ny * MASK_W + cxx])) continue;
        const c = MASK.coast[nk];
        /* standing off: coast-hugging is geometrically cheaper, and ships do not do it */
        const pen = 1 + (c <= 1 ? 2.2 : c === 2 ? 0.9 : c === 3 ? 0.35 : 0);
        const ng = _AS.g[cur] + Math.hypot(dy, dx * kx) * pen;
        if (_AS.stamp[nk] !== run || ng < _AS.g[nk]) {
          _AS.stamp[nk] = run; _AS.g[nk] = ng; _AS.from[nk] = cur;
          heapPush(ng + h(ny, nx), nk);
        }
      }
    }
  }
  if (_AS.stamp[b] !== run) return null;
  const cells = [];
  for (let k = b; k >= 0; k = _AS.from[k]) { cells.push(k); if (k === a) break; }
  cells.reverse();

  /* ── STRING-PULLING ────────────────────────────────────────────────────────────────
     A cell path is a staircase of 19.5 km steps and there are hundreds of them. Keep only
     the corners a ship would actually turn at, by walking as far ahead as the straight line
     between the two stays in open water. This shortens the track AND preserves the guarantee,
     because the segment itself is what gets tested — not just its endpoints, which is exactly
     the mistake the old code made. */
  const out = [];
  let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    for (; j > i + 1; j--) if (segmentClear(cells[i], cells[j])) break;
    out.push(cells[i]);
    i = j;
  }
  out.push(cells[cells.length - 1]);
  /* ── ⚠ AND THE ENDPOINTS ARE THE PLACES, WHICH ARE ON LAND ─────────────────────────
     The first version put the caller's own coordinates back at each end, on the reasoning
     that a voyage should begin where it says it begins. But a waypoint is a LANDFALL — Tahiti,
     Savai'i, Viti Levu, Bristol — and at 19.5 km an island of that size simply is a land cell.
     Restoring it planted every track's first and last hull ashore, which accounted for all 287
     bad samples in the first measurement and for none of the middles, since the search itself
     was clean. A track ends in the water off a landfall. That is also what a chart draws. */
  const pts = out.map(cellLonLat);
  return refineAgainstFine(pts);
}

/* ── PLAN COARSE, VERIFY FINE ─────────────────────────────────────────────────────────────
 * The search runs on a 19.5 km grid because A* on 33.5 million cells needs four hundred
 * megabytes of scratch. But the viewer sees the 4.9 km coastline, so the finished track is
 * walked at a fine step and any point that lands on drawn land is pushed off it — perpendicular
 * to the course, both hands, nearest water wins. This is the same correction the consorts get,
 * applied to the track itself so it is fixed once at build rather than every frame.
 */
function refineAgainstFine(ptsIn) {
  if (!FINE.ready || ptsIn.length < 2) return ptsIn;
  /* ⚠ REFINING THE CORNERS IS NOT REFINING THE PATH. A ship is drawn by interpolating BETWEEN
     the stored points, so checking only the points leaves every metre in between unexamined —
     and a leg that starts and ends in open water can still cut a headland. Measured, fixing
     corners alone left 26 hulls in 5,600 ashore, all of them on coastal fringes and most in
     the Philippines. Densify to about five kilometres first, which is one fine cell, so the
     thing being checked is the thing being drawn. */
  /* ⚠ AND IT MUST BE DENSIFIED ALONG THE GREAT CIRCLE, WHICH IS WHAT GETS DRAWN.
     Interpolating lon/lat between two string-pulled corners forty degrees apart is not the
     path: string-pulling verified the GREAT CIRCLE was clear, and stepEraFleet slerps along
     the great circle to place the ship. Densifying on the straight lon/lat line invents points
     that were never on the verified curve and are not on the drawn one either — it put a track
     straight across inland Queensland and took the failure rate from 0.46 per cent to 5.7.
     Same curve, everywhere: verified, densified, drawn. */
  const toV = (lon, lat) => {
    const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
  };
  const pts = [];
  for (let i = 0; i < ptsIn.length - 1; i++) {
    const a = ptsIn[i], b = ptsIn[i + 1];
    const va = toV(a.lon, a.lat), vb = toV(b.lon, b.lat);
    const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
    const ang = Math.acos(dot), degs = ang * 180 / Math.PI;
    const n = Math.max(1, Math.ceil(degs / 0.045));        // ~5 km of arc
    const sn = Math.sin(ang);
    for (let k = 0; k < n; k++) {
      const f = k / n;
      let x, y, z;
      if (sn < 1e-9) { x = va[0]; y = va[1]; z = va[2]; }
      else {
        const wa = Math.sin((1 - f) * ang) / sn, wb = Math.sin(f * ang) / sn;
        x = va[0] * wa + vb[0] * wb; y = va[1] * wa + vb[1] * wb; z = va[2] * wa + vb[2] * wb;
      }
      const r = Math.hypot(x, y, z);
      pts.push({ lon: Math.atan2(x, z) * 180 / Math.PI,
                 lat: Math.asin(y / r) * 180 / Math.PI });
    }
  }
  pts.push(ptsIn[ptsIn.length - 1]);

  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (fineIsWater(p.lon, p.lat)) { out.push(p); continue; }
    /* course through this point, for the perpendicular */
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const cl = Math.max(0.08, Math.cos(p.lat * Math.PI / 180));
    let bx = (b.lon - a.lon) * cl, by = b.lat - a.lat;
    const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    let best = null;
    for (let d = 1; d <= 14 && !best; d++) {
      for (const side of [1, -1]) {
        const off = d * 0.05 * side;                       // 0.05 deg ~ 5.5 km per step
        const nlon = p.lon + (-by * off) / cl, nlat = p.lat + (bx * off);
        if (fineIsWater(nlon, nlat)) { best = { lon: nlon, lat: nlat }; break; }
      }
    }
    out.push(best || p);
  }
  return smoothTrack(out);
}

/* ── A SHIP HAS A TURNING CIRCLE ──────────────────────────────────────────────────────────
 * The refinement above pushes points sideways off the coast, one at a time, and that leaves a
 * sawtooth: measured, every track had course changes over 60 degrees and several had a full
 * 180 — the track doubling back on itself between one five-kilometre step and the next. No
 * hull does that, and it is what makes the fleet look like it is being dragged rather than
 * steered.
 *
 * Constrained Laplacian smoothing: pull each point toward the mean of its neighbours, and
 * REJECT the move if it lands on land. The water constraint is what makes this safe to run —
 * smoothing that could push a track ashore would trade one visible fault for a worse one, so
 * every candidate is tested before it is accepted. Endpoints are pinned; they are landfalls.
 */
function smoothTrack(pts) {
  if (!FINE.ready || pts.length < 5) return pts;
  const cur = pts.map(p => ({ lon: p.lon, lat: p.lat }));
  /* ⚠ AND ONLY WHERE IT BENDS. The acceptance test is two great-circle segments sampled at a
     kilometre, which is thirty-odd array reads per candidate — times twelve passes, times the
     points on a track, times sixty-two voyages, and building the fleet took over half a minute.
     Almost all of that work was spent proposing to move points on stretches that are already
     straight, where the Laplacian's target is the point itself. Gate on the turn: below two
     degrees there is nothing to smooth, and the cost falls by about twenty to one. */
  for (let pass = 0; pass < 12; pass++) {
    let moved = 0;
    for (let i = 1; i < cur.length - 1; i++) {
      const a = cur[i - 1], b = cur[i], c = cur[i + 1];
      if (turnDeg(a, b, c) < 2) continue;
      /* mean of the neighbours, in a frame that is not distorted by longitude convergence */
      let dlonA = a.lon - b.lon, dlonC = c.lon - b.lon;
      if (dlonA > 180) dlonA -= 360; else if (dlonA < -180) dlonA += 360;
      if (dlonC > 180) dlonC -= 360; else if (dlonC < -180) dlonC += 360;
      const tlon = b.lon + (dlonA + dlonC) * 0.5 * 0.5;      // half-way to the midpoint
      const tlat = b.lat + ((a.lat - b.lat) + (c.lat - b.lat)) * 0.5 * 0.5;
      /* ⚠ AND THE TEST IS THE TWO SEGMENTS, NOT THE POINT. Accepting a move because the point
         it lands on is wet is the same error as checking waypoints and drawing lines between
         them — the smoothing then slides a point along a coast until the SEGMENT to its
         neighbour cuts the headland, and every point on the track is still in the water while
         the drawn curve crosses New Britain. Measured: 0 of 84,883 points ashore and 190 of
         254,607 drawn samples ashore, simultaneously, which is how this was finally seen. */
      /* ⚠ and the POINT as well as the two segments — gcWet samples a segment's interior and
         never its ends, so on its own it will happily move a waypoint onto a beach it had a
         clear run at. Nine points ashore came back the moment this pass was run last. */
      const T = { lon: tlon, lat: tlat };
      if (fineIsWater(tlon, tlat) && gcWet(a, T) && gcWet(T, c)) {
        b.lon = tlon; b.lat = tlat; moved++;
      }
    }
    if (!moved) break;
  }

  /* ── AND A DOUBLE-BACK IS NOT A TURN, IT IS A MISTAKE ────────────────────────────────
     Smoothing cannot remove a kink whose fix would land on the beach — the water constraint
     rejects the move and the sawtooth survives. Measured, 97 corners in 67,852 still turned
     more than 60 degrees and a few reversed completely. Those points are deleted rather than
     moved: if the two neighbours can see each other across open water, the corner between
     them was never a course, it was an artefact of pushing one point sideways. */
  const clear = gcWet;   /* ⚠ the great circle, because that is the curve the fleet is drawn on */
  const brgOf = (A, B) => {
    const dl = (B.lon - A.lon) * Math.PI / 180, l1 = A.lat * Math.PI / 180, l2 = B.lat * Math.PI / 180;
    return Math.atan2(Math.sin(dl) * Math.cos(l2),
                      Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl));
  };
  for (let sweep = 0; sweep < 6; sweep++) {
    let cut = 0;
    for (let i = 1; i < cur.length - 1; ) {
      let d = Math.abs((brgOf(cur[i], cur[i + 1]) - brgOf(cur[i - 1], cur[i])) * 180 / Math.PI);
      if (d > 180) d = 360 - d;
      if (d > 45 && clear(cur[i - 1], cur[i + 1])) { cur.splice(i, 1); cut++; }
      else i++;
    }
    if (!cut) break;
  }
  return cur;
}

/* ── THE TEST MUST BE THE CURVE THAT GETS DRAWN ────────────────────────────────────────
   The fleet moves between waypoints by slerp — a great circle — because interpolating lon/lat
   linearly sails through South America. So the clearance test walks the GREAT CIRCLE too.
   Testing a straight line in grid coordinates and then drawing an arc through it is the same
   error one level up as testing the endpoints and drawing the segment: whatever is checked is
   not what appears. Over a 38-degree pull at high latitude the two curves are hundreds of
   kilometres apart, which is more than enough to put Iceland between them. */
function segmentClear(ka, kb) {
  const A = cellLonLat(ka), B = cellLonLat(kb);
  const toV = (lon, lat) => {
    const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
  };
  const va = toV(A.lon, A.lat), vb = toV(B.lon, B.lat);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const ang = Math.acos(dot);
  const degs = ang * 180 / Math.PI;
  if (degs > 42) return false;                    // never pull a whole ocean straight
  /* Four samples per cell of arc, and the SEQUENCE of cells is what is tested, not the samples
     in isolation. A great circle can clip the corner of a cell in two or three kilometres, so
     point sampling at any finite rate will eventually step over one; but a curve that leaves
     cell A and appears in a diagonal neighbour B must have passed through the corner they
     share, and the same rule that stops the search cutting corners applies here. */
  const n = Math.max(2, Math.ceil(degs * MASK_H / 180 * 4));
  const s = Math.sin(ang);
  let prev = ka;
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    let x, y, z;
    if (s < 1e-9) { x = va[0]; y = va[1]; z = va[2]; }
    else {
      const wa = Math.sin((1 - f) * ang) / s, wb = Math.sin(f * ang) / s;
      x = va[0] * wa + vb[0] * wb; y = va[1] * wa + vb[1] * wb; z = va[2] * wa + vb[2] * wb;
    }
    const r = Math.hypot(x, y, z);
    const lat = Math.asin(y / r) * 180 / Math.PI;
    const lon = Math.atan2(x, z) * 180 / Math.PI;
    const k = maskCell(lon, lat);
    if (k === prev) continue;
    if (!MASK.ocean[k]) return false;
    const py = (prev / MASK_W) | 0, px = prev % MASK_W;
    const cy = (k / MASK_W) | 0, cx = k % MASK_W;
    let dxs = cx - px; if (dxs > MASK_W / 2) dxs -= MASK_W; else if (dxs < -MASK_W / 2) dxs += MASK_W;
    if (cy !== py && dxs !== 0) {
      /* diagonal (or a longer jump, which a 4-per-cell rate should not produce): both shared
         orthogonal cells must be water too */
      if (!MASK.ocean[py * MASK_W + cx] || !MASK.ocean[cy * MASK_W + px]) return false;
    }
    prev = k;
  }
  return true;
}

/* ── THE WIND AT A POINT, WITHOUT WAITING FOR IT ──────────────────────────────────────────
   The Passage needs to know what it is blowing where a ship is, so that the sea she is in is
   the sea the globe says is there rather than a decorative default. The field is already
   fetched and cached for the reach solver; this is a synchronous read of that cache, with a
   fetch kicked off on the first miss. It returns null until the data lands, and the caller
   uses a stated fallback in the meantime rather than a silent one. */
function windAt(lon, lat, monthIndex) {
  const m = ((Math.floor(monthIndex) % 12) + 12) % 12;
  const w = _windCache.get(m);
  if (!w) { sampleWind(m); return null; }
  let x = Math.floor(((lon + 180) % 360 + 360) % 360 / 360 * NAV_W);
  const y = Math.max(0, Math.min(NAV_H - 1, Math.floor((90 - lat) / 180 * NAV_H)));
  const k = y * NAV_W + Math.min(NAV_W - 1, x);
  return { u: w.u[k], v: w.v[k], speed: Math.hypot(w.u[k], w.v[k]), ice: w.ice[k] };
}

/* ── A TRACK IS ONE CURVE, NOT A ROW OF SEGMENTS ──────────────────────────────────────────
 * Every fix above operates on ONE passage — Bergen to the Faroes. But a voyage is a dozen of
 * them stitched end to end, and the stitches are where the damage was: measured, all 97 corners
 * over 60 degrees, and both full 180-degree reversals, sat within a kilometre of a join. Each
 * segment had been smoothed against itself and was clean; nothing had ever looked at the seam.
 * That is the same error as the mask and the picture, one level up — a guarantee proved on the
 * parts and assumed for the whole.
 *
 * So the finishing runs on the assembled track, and it does three things a chart-drawer does:
 *   1. smooth, with the water constraint (already written, now applied to the whole);
 *   2. round every corner to a TURNING CIRCLE, because a hull has one and cannot pivot;
 *   3. resample to constant arc length, because the fleet is drawn by interpolating between
 *      consecutive points at a constant rate — so a 0.4 km step and a 5 km step take the same
 *      time, and the ship crawls through the first and bolts through the second. That is the
 *      "freezing then jumping" exactly: not a dropped frame, an unparameterised curve.
 */
const R2D = 180 / Math.PI, EARTH_KM = 6371;   /* D2R is declared at the top of this file */
function toVec(lon, lat) {
  const p = lat * D2R, l = lon * D2R;
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
}
function toLL(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return { lon: Math.atan2(v[0] / n, v[2] / n) * R2D,
           lat: Math.asin(Math.max(-1, Math.min(1, v[1] / n))) * R2D };
}
/* the fleet moves by slerp, so every measurement and every new point here is on the same curve */
function gcSlerp(A, B, f) {
  const a = toVec(A.lon, A.lat), b = toVec(B.lon, B.lat);
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const t = Math.acos(d);
  if (t < 1e-7) return { lon: A.lon, lat: A.lat };
  const s = Math.sin(t), w0 = Math.sin((1 - f) * t) / s, w1 = Math.sin(f * t) / s;
  return toLL([a[0] * w0 + b[0] * w1, a[1] * w0 + b[1] * w1, a[2] * w0 + b[2] * w1]);
}
function gcKm(A, B) {
  const a = toVec(A.lon, A.lat), b = toVec(B.lon, B.lat);
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(d) * EARTH_KM;
}
/* is the GREAT CIRCLE between these two points all water — sampled at a kilometre, which is a
   quarter of the finished track's spacing and finer than the mask it is asking */
function gcWet(A, B) {
  const km = gcKm(A, B);
  const n = Math.max(2, Math.ceil(km));
  for (let i = 1; i < n; i++) {
    const p = gcSlerp(A, B, i / n);
    if (!fineIsWater(p.lon, p.lat)) return false;
  }
  return true;
}
function turnDeg(A, B, C) {
  const brg = (P, Q) => {
    const dl = (Q.lon - P.lon) * D2R, l1 = P.lat * D2R, l2 = Q.lat * D2R;
    return Math.atan2(Math.sin(dl) * Math.cos(l2),
                      Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl));
  };
  let d = Math.abs((brg(B, C) - brg(A, B)) * R2D);
  return d > 180 ? 360 - d : d;
}

/* Round a corner the way a ship rounds it: leave the course a distance d = R·tan(θ/2) before the
   mark, arc through, rejoin d after. The arc is a quadratic Bézier on the sphere, which for these
   radii is indistinguishable from the circle and cannot overshoot the corner. If any sample of it
   would touch land the radius is halved and retried — a tighter turn is always available, and the
   untouched corner is the last resort rather than the first. */
/* ⚠ A TURN IS LONGER THAN ONE LEG, AND THAT IS THE WHOLE DIFFICULTY.
   The first version took d from the two adjacent points only, so on a track spaced every 4 km
   the widest possible turn was 2 km of arc — and the uniform resample that followed sampled it
   once and threw the shape away. Measured, filleting changed the corner count by six in eighty
   thousand. A ship swinging through 90 degrees at 9 km of radius uses NINE kilometres of sea
   before the mark and nine after; the turn eats several waypoints, and the code has to eat them
   too. So d is walked along the polyline, in both directions, and everything inside is replaced
   by the arc — which is what a turn does to a chart. */
function walkBack(arr, d) {
  let acc = 0;
  for (let j = arr.length - 1; j > 0; j--) {
    const seg = gcKm(arr[j - 1], arr[j]);
    if (acc + seg >= d) {
      const f = seg > 1e-9 ? (d - acc) / seg : 1;
      return { pt: gcSlerp(arr[j], arr[j - 1], Math.max(0, Math.min(1, f))), cut: arr.length - j };
    }
    acc += seg;
  }
  return null;                       /* the turn would eat the departure; try a tighter one */
}
function walkFwd(arr, i, d) {
  let acc = 0;
  for (let j = i; j < arr.length - 1; j++) {
    const seg = gcKm(arr[j], arr[j + 1]);
    if (acc + seg >= d) {
      const f = seg > 1e-9 ? (d - acc) / seg : 1;
      return { pt: gcSlerp(arr[j], arr[j + 1], Math.max(0, Math.min(1, f))), next: j + 1 };
    }
    acc += seg;
  }
  return null;
}
function filletTurns(pts, radiusKm, stepKm) {
  if (!FINE.ready || pts.length < 5) return pts;
  const step = stepKm || 4;
  const out = [pts[0]];
  let i = 1;
  while (i < pts.length - 1) {
    const B = pts[i];
    const th = turnDeg(pts[i - 1], B, pts[i + 1]);
    if (th < 18) { out.push(B); i++; continue; }
    let placed = false;
    for (let att = 0, R = radiusKm; att < 6 && !placed; att++, R *= 0.55) {
      const d = Math.min(60, R * Math.tan(Math.min(84, th * 0.5) * D2R));
      if (d < 0.25) break;
      const back = walkBack(out, d), fwd = walkFwd(pts, i, d);
      if (!back || !fwd) continue;
      /* sampled at the track's own spacing, so the finished curve stays evenly paced */
      const n = Math.max(3, Math.round(d * 2 / step));
      const arc = []; let ok = true;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const pt = gcSlerp(gcSlerp(back.pt, B, t), gcSlerp(B, fwd.pt, t), t);
        if (!fineIsWater(pt.lon, pt.lat)) { ok = false; break; }
        arc.push(pt);
      }
      if (ok) {
        out.length -= back.cut;
        for (const p of arc) out.push(p);
        i = fwd.next;
        placed = true;
      }
    }
    if (!placed) { out.push(B); i++; }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* Constant arc length. This is what makes the pacing even, and it is a property of the CURVE,
   not of the animation — no amount of easing in the draw loop can rescue a curve whose points
   are 0.4 km apart in one place and 5 km apart in the next. */
function resampleUniform(pts, stepKm) {
  if (pts.length < 2) return pts;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcKm(pts[i - 1], pts[i]));
  const total = cum[cum.length - 1];
  if (!(total > 0)) return pts;
  const n = Math.max(2, Math.round(total / stepKm));
  const out = []; let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = total * k / n;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const seg = cum[j + 1] - cum[j];
    const f = seg > 1e-9 ? (s - cum[j]) / seg : 0;
    out.push(gcSlerp(pts[j], pts[j + 1], Math.max(0, Math.min(1, f))));
  }
  return out;
}

/* Backstop: resampling walks the same great circles the search already cleared, but smoothing
   moved points afterwards, so a new sample can land ashore. Rare, and caught here rather than
   trusted away. Nearest water in a ring, then one more smoothing pass to take out the kink. */
function nearestWater(p, maxRings) {
  const cl = Math.max(0.08, Math.cos(p.lat * D2R));
  /* 40 rings of 0.03 degrees is 1.2 degrees — about 130 km, which is enough to get off any
     island a track can end up on. Eight rings was 27 km and left 21 points ashore. */
  for (let r = 1; r <= (maxRings || 40); r++)
    for (let a = 0; a < 32; a++) {
      const th = a * Math.PI / 16, dd = r * 0.03;
      const lo = p.lon + Math.cos(th) * dd / cl, la = p.lat + Math.sin(th) * dd;
      if (fineIsWater(lo, la)) return { lon: lo, lat: la };
    }
  return null;
}
function pushOffLand(pts) {
  if (!FINE.ready) return pts;
  for (const p of pts) {
    if (fineIsWater(p.lon, p.lat)) continue;
    const best = nearestWater(p);
    if (best) { p.lon = best.lon; p.lat = best.lat; }
  }
  return pts;
}

/* ── ⚠ AND EVERY POINT BEING WET IS NOT THE SAME AS THE TRACK BEING WET ────────────────────
   Measured after all of the above: 0 of 84,332 track points on land, and hulls still sitting on
   New Britain. Both are true at once, because the fleet is drawn by slerping BETWEEN points, and
   a great circle across a four-kilometre gap can pass through an island that neither end touches.
   This is the project's oldest mistake wearing new clothes — the string-pulling learned it, the
   smoothing learned it, and the finished track had not. What is drawn is the CURVE.

   So the last thing that happens to a track is that its segments are walked at a kilometre and
   any dry sample has a wet point inserted at it. Four passes, because inserting one point halves
   the segment and the halves are then checked in their turn. */
function detourPoint(A, B, p) {
  const cl = Math.max(0.08, Math.cos(p.lat * D2R));
  let dl = B.lon - A.lon; if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
  const ex = dl * cl, ey = B.lat - A.lat, L = Math.hypot(ex, ey) || 1;
  const px = -ey / L, py = ex / L;
  for (let r = 1; r <= 30; r++) {
    const d = r * 0.04;
    for (const s of [1, -1]) {
      const X = { lon: p.lon + s * px * d / cl, lat: p.lat + s * py * d };
      if (fineIsWater(X.lon, X.lat) && gcWet(A, X) && gcWet(X, B)) return X;
    }
  }
  return null;
}
/* ── AND WHERE A SIDESTEP CANNOT WORK, PLAN THE CHANNEL ────────────────────────────────────
 * Measured: 317 blocked segments, and the perpendicular detour failed on 153 of them. It fails
 * for a reason that is obvious once seen — offering a point to one side or the other only works
 * when the obstruction is ACROSS the course. Where the track runs the length of a coast, or into
 * a bay with the way out behind it, every offset is either inland or still blocked, and no
 * amount of widening the search changes that.
 *
 * What those need is a route, not a nudge. The coarse grid cannot give one: at 19.5 km the
 * channel is a single cell and the search has already used it. So the fine array plans it — a
 * small A* in a window around the blocked segment, at the 4.9 km resolution the coastline is
 * actually drawn at, with the same no-cutting-corners rule the ocean search uses. Plan coarse,
 * verify fine, and where fine disagrees, plan fine.
 */
function fineAStar(A, B, marginDeg) {
  const W = FINE.w, H = FINE.h, cw = 360 / W, chh = 180 / H;
  const gx = lon => Math.floor(((((lon + 180) % 360) + 360) % 360) / cw);
  const gy = lat => Math.max(0, Math.min(H - 1, Math.floor((90 - lat) / chh)));
  const x0 = gx(Math.min(A.lon, B.lon) - marginDeg), x1 = gx(Math.max(A.lon, B.lon) + marginDeg);
  if (x1 <= x0) return null;                       /* straddles the seam — rare, and left alone */
  const y0 = gy(Math.max(A.lat, B.lat) + marginDeg), y1 = gy(Math.min(A.lat, B.lat) - marginDeg);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw < 3 || bh < 3 || bw * bh > 90000) return null;
  const N = bw * bh, lim = FINE.datum + SHOAL_M;
  const wet = k => FINE.elev[(y0 + ((k / bw) | 0)) * W + (x0 + (k % bw))] < lim;
  let sa = (gy(A.lat) - y0) * bw + (gx(A.lon) - x0);
  let sb = (gy(B.lat) - y0) * bw + (gx(B.lon) - x0);
  if (sa < 0 || sa >= N || sb < 0 || sb >= N) return null;
  /* ⚠ an end that is itself ashore used to abandon the search, which is the case that most
     needed it — the whole reason a repair was asked for. Snap it to the nearest wet cell in
     the window instead, the way the ocean search snaps its landfalls. */
  const snap = k => {
    if (wet(k)) return k;
    const ky = (k / bw) | 0, kx2 = k % bw;
    for (let r = 1; r < Math.max(bw, bh); r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const ny = ky + dy, nx = kx2 + dx;
          if (ny < 0 || ny >= bh || nx < 0 || nx >= bw) continue;
          const nk = ny * bw + nx;
          if (wet(nk)) return nk;
        }
    return -1;
  };
  sa = snap(sa); sb = snap(sb);
  if (sa < 0 || sb < 0 || sa === sb) return null;
  const kx = Math.max(0.05, Math.cos((A.lat + B.lat) * 0.5 * D2R));
  const bx = sb % bw, by = (sb / bw) | 0;
  const g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  const hk = new Float32Array(N + 8), hv = new Int32Array(N + 8); let hn = 0;
  const push = (p, v) => { let i = hn++; hk[i] = p; hv[i] = v;
    while (i > 0) { const par = (i - 1) >> 1; if (hk[par] <= hk[i]) break;
      const tk = hk[par], tv = hv[par]; hk[par] = hk[i]; hv[par] = hv[i]; hk[i] = tk; hv[i] = tv; i = par; } };
  const pop = () => { const top = hv[0]; hn--; if (hn > 0) { hk[0] = hk[hn]; hv[0] = hv[hn];
      let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i;
        if (l < hn && hk[l] < hk[s]) s = l; if (r < hn && hk[r] < hk[s]) s = r;
        if (s === i) break; const tk = hk[s], tv = hv[s]; hk[s] = hk[i]; hv[s] = hv[i]; hk[i] = tk; hv[i] = tv; i = s; } }
    return top; };
  g[sa] = 0; push(0, sa);
  let guard = 0;
  while (hn > 0 && guard++ < 400000) {
    const cur = pop();
    if (done[cur]) continue;
    done[cur] = 1;
    if (cur === sb) break;
    const cy = (cur / bw) | 0, cx = cur % bw;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = cy + dy; if (ny < 0 || ny >= bh) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx; if (nx < 0 || nx >= bw) continue;
        const nk = ny * bw + nx;
        if (!wet(nk)) continue;
        /* the same rule as the ocean search: a hull cannot pass through a point */
        if (dx && dy && (!wet(cy * bw + nx) || !wet(ny * bw + cx))) continue;
        const ng = g[cur] + Math.hypot(dy, dx * kx);
        if (ng < g[nk]) { g[nk] = ng; prev[nk] = cur;
          push(ng + Math.hypot(ny - by, (nx - bx) * kx), nk); }
      }
    }
  }
  if (prev[sb] < 0 && sb !== sa) return null;
  const cells = [];
  for (let k = sb; k >= 0; k = prev[k]) { cells.push(k); if (k === sa) break; }
  cells.reverse();
  const pt = k => ({ lon: (x0 + (k % bw) + 0.5) * cw - 180,
                     lat: 90 - (y0 + ((k / bw) | 0) + 0.5) * chh });
  /* string-pull against the same great-circle test everything else uses, so what comes back is
     as short as the water allows and made of the curve the fleet is actually drawn on */
  const raw = cells.map(pt), keep = [];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    for (; j > i + 1; j--) if (gcWet(raw[i], raw[j])) break;
    keep.push(raw[i]); i = j;
  }
  keep.push(raw[raw.length - 1]);
  return keep.slice(1, -1);                        /* interior only; the ends are A and B */
}
function fineDetour(A, B) {
  for (const m of [0.5, 1.5, 4]) {
    const p = fineAStar(A, B, m);
    if (p && p.length) {
      let ok = gcWet(A, p[0]) && gcWet(p[p.length - 1], B);
      for (let i = 1; ok && i < p.length; i++) ok = gcWet(p[i - 1], p[i]);
      if (ok) return p;
    }
  }
  return null;
}
function clearSegments(pts, sampleKm) {
  if (!FINE.ready || pts.length < 2) return pts;
  const stepKm = sampleKm || 1;
  let cur = pts;
  for (let pass = 0; pass < 4; pass++) {
    const out = [cur[0]]; let fixed = 0;
    for (let i = 1; i < cur.length; i++) {
      const A = cur[i - 1], B = cur[i];
      const n = Math.max(2, Math.ceil(gcKm(A, B) / stepKm));
      for (let k = 1; k < n; k++) {
        const p = gcSlerp(A, B, k / n);
        if (!fineIsWater(p.lon, p.lat)) {
          /* ⚠ and the repair is a DETOUR, not a nudge. Pushing the dry sample to the nearest
             water picks whichever of sixteen directions happens to be wet, so two consecutive
             repairs go opposite ways and the track sawtooths: measured, the nudge version put
             corners over 60 degrees up from 25 to 483. A detour is offered perpendicular to the
             blocked segment, at increasing distance, on both hands, and is only accepted when
             BOTH new segments are clear — so the track goes round the obstruction the way a
             ship does, on one side of it, and cannot be accepted into a worse position. */
          FINE.blockedSeen++;
          const fix = detourPoint(A, B, p);
          if (fix) { out.push(fix); fixed++; }
          else {
            const way = fineDetour(A, B);
            if (way) { for (const q of way) out.push(q); fixed++; }
            else { FINE.detourFail++; if (FINE.run) FINE.run.detourFail++; }
          }
          break;
        }
      }
      out.push(B);
    }
    cur = out;
    if (!fixed) break;
  }

  /* ── AND IF ONE SEGMENT CANNOT BE CLEARED, THE STRETCH IS WRONG, NOT THE SEGMENT ─────────
     A repair confined to A→B can only ever go round obstructions that fit between A and B. Some
     do not: a track that runs four kilometres into a bay at the low stand has its way out
     BEHIND it, and no point placed between those two ends is any use. So the failures are
     re-planned across a widening span — two points either side, then five, then twelve — which
     gives the fine search room to leave the way it came in. */
  const blocked = i => {
    const n = Math.max(2, Math.ceil(gcKm(cur[i - 1], cur[i]) / stepKm));
    for (let k = 1; k < n; k++) {
      const p = gcSlerp(cur[i - 1], cur[i], k / n);
      if (!fineIsWater(p.lon, p.lat)) return true;
    }
    return false;
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    let bad = [];
    for (let i = 1; i < cur.length; i++) if (blocked(i)) bad.push(i);
    if (!bad.length) break;
    const K = [2, 5, 12][attempt];
    const rebuilt = []; let last = 0, any = 0;
    for (const i of bad) {
      const lo = Math.max(0, i - 1 - K), hi = Math.min(cur.length - 1, i + K);
      if (lo < last) continue;                       /* spans already swallowed by an earlier one */
      const way = fineDetour(cur[lo], cur[hi]);
      if (!way) continue;
      for (let j = last; j <= lo; j++) rebuilt.push(cur[j]);
      for (const q of way) rebuilt.push(q);
      last = hi; any++;
    }
    if (!any) break;
    for (let j = last; j < cur.length; j++) rebuilt.push(cur[j]);
    cur = rebuilt;
  }

  /* what is still blocked after everything — the number that has to reach zero. The run
     ledger takes this call's count as an OVERWRITE, not a sum: finishTrackSteps clears
     segments three times and the same blocked stretch would otherwise be confessed three
     times over; the last call's answer is the truth of the track that ships. */
  let unf = 0;
  for (let i = 1; i < cur.length; i++) if (blocked(i)) unf++;
  FINE.unfixed += unf;
  if (FINE.run) FINE.run.unfixed = unf;
  return cur;
}

/* ── A NAVIGATOR GIVES A HEADLAND A BERTH ─────────────────────────────────────────────────
 * Everything above verifies the track by SAMPLING — gcWet and clearSegments walk the curve at
 * a kilometre — so a corner clip shorter than the sampling step passes every test and still
 * puts the drawn keel on a drawn texel of land. Measured r125, before this pass: 281 grazes
 * on 65 tracks, 181.6 km of drawn keel on drawn land fleet-wide, most of them under a
 * kilometre long, at Cape Horn, the Skagerrak, Mindoro — always where the course shaved the
 * corner cell of a headland. Sampling finer only shrinks the class; it cannot close it,
 * because the repairs that answer a dry sample stop at the first wet point, which is the
 * waterline again.
 *
 * So the finished track stands off instead: any point whose one-texel neighbourhood holds
 * land is offered a berth of up to one texel, perpendicular to the course, both hands, and
 * the move is accepted only when it strictly reduces the land in reach, keeps both adjoining
 * great-circle segments wet, and does not fold the course (the detour sawtooth lesson).
 * Track points sit about 4 km apart and a texel is 4.9 km, so a mid-segment sample is always
 * inside the neighbourhood of its nearer endpoint: clearing both endpoints' neighbourhoods
 * clears the whole segment between them, which is the geometric fact that makes this a fix
 * for the CLASS rather than for whichever samples anyone happened to take. Where no berth
 * exists — a carved strait, a one-texel channel — no candidate improves on the point and the
 * track stands, so this can never close a passage the router found. */
/* squared distance, in texel units, from the point to the nearest land-cell centre within
   two cells — 9 (i.e. "far") when none is in reach. Continuous where a cell COUNT is a
   staircase: a fifth-of-a-texel step strictly increases this, which is what lets the berth
   be taken in steps gentle enough to steer. */
function landDist2(lon, lat) {
  const W = FINE.w, H = FINE.h, lim = FINE.datum + SHOAL_M;
  const fx = (((lon + 180) % 360) + 360) % 360 / 360 * W;
  const fy = (90 - lat) / 180 * H;
  const x = Math.floor(fx), y = Math.max(0, Math.min(H - 1, Math.floor(fy)));
  let best = 9;
  for (let dy = -2; dy <= 2; dy++) {
    const yy = y + dy; if (yy < 0 || yy >= H) continue;
    for (let dx = -2; dx <= 2; dx++) {
      const xx = ((x + dx) % W + W) % W;
      if (FINE.elev[yy * W + xx] >= lim) {
        const ex = x + dx + 0.5 - fx, ey = yy + 0.5 - fy;
        const d2 = ex * ex + ey * ey;
        if (d2 < best) best = d2;
      }
    }
  }
  return best;
}
function standOffLand(pts) {
  if (!FINE.ready || pts.length < 3) return pts;
  const out = pts.map(p => ({ lon: p.lon, lat: p.lat }));
  const texDeg = 360 / FINE.w, step = 0.15 * texDeg;
  /* the coastal set is found ONCE — steps are 0.15 texel, so a point that starts with a
     texel of berth can never need one before the passes run out — and a point whose move
     was refused is STUCK until a neighbour moves and changes its situation. Without both,
     every pass re-walked every point of every track and boot went from 30 to 70 seconds:
     the pump's budget is checked between yields, and this whole function is one yield. */
  const near = [];
  for (let i = 1; i < out.length - 1; i++)
    if (fineIsWater(out[i].lon, out[i].lat) && landDist2(out[i].lon, out[i].lat) < 1)
      near.push(i);
  if (!near.length) return out;
  const stuck = new Uint8Array(out.length);
  for (let pass = 0; pass < 8; pass++) {
    let moved = 0;
    for (const i of near) {
      if (stuck[i]) continue;
      const p = out[i];
      const d0 = landDist2(p.lon, p.lat);
      if (d0 >= 1) continue;                      /* a texel of berth already */
      const a = out[i - 1], c = out[i + 1];
      const cl = Math.max(0.08, Math.cos(p.lat * D2R));
      const ex = (((c.lon - a.lon + 540) % 360) - 180) * cl, ey = c.lat - a.lat;
      const L = Math.hypot(ex, ey) || 1;
      const px = -ey / L, py = ex / L;
      const turn0 = turnDeg(a, p, c);
      let best = null, bestD = d0;
      for (const s of [1, -1]) {
        const X = { lon: p.lon + s * px * step / cl, lat: p.lat + s * py * step };
        if (!fineIsWater(X.lon, X.lat)) continue;
        const dd = landDist2(X.lon, X.lat);
        if (dd <= bestD + 1e-6) continue;
        if (turnDeg(a, X, c) > Math.max(turn0, 8) + 20) continue;
        if (!gcWet(a, X) || !gcWet(X, c)) continue;
        best = X; bestD = dd;
      }
      if (best) {
        out[i] = best; moved++;
        stuck[i - 1] = 0; stuck[i + 1] = 0;   /* a moved neighbour can unjam a refused one */
      } else stuck[i] = 1;
    }
    if (!moved) break;
  }
  return out;
}

/* ── ⚠ AND IT ALL HAPPENED IN ONE GO ─────────────────────────────────────────────────────
   Measured on Magellan: the A* over twenty legs is 183 ms and can be pumped a leg at a time,
   but the finishing is 310 ms in one indivisible lump — so a time budget checked between
   voyages could not help, because one voyage overran it a hundredfold and the era switch froze
   anyway. The passes below are already discrete, so the function YIELDS between them and the
   caller decides how much to do this frame. finishTrack() is unchanged for every other caller:
   it drains the iterator and returns the same track it always did. */
function finishTrack(pts, opt) {
  const it = finishTrackSteps(pts, opt);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
function* finishTrackSteps(pts, opt) {
  if (!FINE.ready || !pts || pts.length < 3) return pts;
  /* ── THE RUN'S OWN LEDGER ────────────────────────────────────────────────────────────
     detourFail and unfixed are lifetime totals across every track ever finished, so no
     caller could say WHICH voyage the router gave up on — measured r125, Sousa's fleet
     shipped two uncleared crossings of the Bahia peninsula and the only trace was a
     counter nobody reads, incremented at boot and buried by the next era. One track
     finishes at a time (the fleet queue pumps one generator to completion), so a per-run
     ledger reset here is unambiguous; seaRouteSteps attaches it to the finished track. */
  FINE.run = { detourFail: 0, unfixed: 0, ashorePts: 0 };
  const o = opt || {};
  const step = o.stepKm || 4;
  let t = pts.map(p => ({ lon: p.lon, lat: p.lat }));
  t = smoothTrack(t); yield;
  /* ⚠ RESAMPLE BEFORE FILLETING. The fillet leaves the course d = R·tan(θ/2) before the mark
     and can never take more than half the incoming leg — so on a hairpin whose two legs are
     350 m long, d is 170 m, below the minimum, and the fillet declines. That is precisely the
     corner that needed it: measured, the 27 turns still over 60 degrees were all spikes with
     sub-kilometre legs. Spacing the track evenly first gives every corner four kilometres of
     approach to turn in, and the tool that could not reach them now can. */
  t = resampleUniform(t, step); yield;
  /* and the fillet is LAST of the shape-defining steps — a resample after it samples the arc
     once and the turn is gone again, which is how the first attempt changed nothing. It emits
     at the track's own spacing, so evenness survives without a second pass. */
  t = filletTurns(t, o.turnKm || 9, step); yield;
  t = pushOffLand(t); yield;
  t = smoothTrack(t); yield;
  /* ⚠ last, and after everything that moves a point. Twice, with a smoothing between: the
     detour inserted to clear a segment is itself a corner, and smoothing now verifies segments
     so it can take that corner out without being able to re-block anything. */
  t = clearSegments(t, 1); yield;
  t = smoothTrack(t); yield;
  t = clearSegments(t, 1); yield;
  /* ── AND A POINT THAT IS STILL ASHORE IS DELETED ────────────────────────────────────────
     Seventeen survived everything above. A waypoint is not sacred — it is a sample of a course,
     and if the course is clear without it then it was never carrying information. Drop it when
     its neighbours can see each other; move it when they cannot; and only then give up, so the
     failure is one point rather than a leg. */
  const fin = [];
  for (let i = 0; i < t.length; i++) {
    const p = t[i];
    if (fineIsWater(p.lon, p.lat)) { fin.push(p); continue; }
    const prev = fin[fin.length - 1], next = t[i + 1];
    if (prev && next && gcWet(prev, next)) continue;
    const fix = nearestWater(p, 60);
    if (!fix && FINE.run) FINE.run.ashorePts++;
    fin.push(fix || p);
  }
  yield;
  const sm = smoothTrack(fin); yield;
  /* standOffLand goes here — after the last smoothing, because the Laplacian pulls a
     rounded course toward its own chord, which at a headland is toward the land it just
     cleared. r125 parked it on 70–80 s frozen boots, but those numbers were the leaked
     chromium GPU process, not the code: A/B'd r126 on a quiet machine (3 fresh browsers
     each arm), frozen boot to FRAME_READY is 25.0 s median wired AND unwired — the
     berth's cost is below run-to-run noise. Effect at 0.25 km sampling: 281 grazes →
     103, 181.6 km of drawn keel on drawn land → 96.3, zero tracks worse. */
  const so = standOffLand(sm); yield;
  return clearSegments(so, 1);
}

window.SHIPS_ROUTE = { computeReachFrom, solveReach, passageHours, NAV, seaDepthAt, isNavigable,
                       buildMask, seaPath, isOcean, MASK, CARVED, maskCell, cellLonLat, windAt,
                       maskUpgradeAvailable, isRoutable, FINE, fineIsWater, setSeaLevel,
                       finishTrack, finishTrackSteps, gcKm, gcSlerp, turnDeg };
