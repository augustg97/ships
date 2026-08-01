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
  return { spd, beatLight: polar.beatLight, beatHard: polar.beatHard,
           isEngine: polar.beatLight === 0, STEP };
}

function polarSpeed(P, twsMs, twaDeg) {
  const twa = twaDeg < 0 ? -twaDeg : twaDeg;

  /* The beat angle worsens as it blows harder: 71° at force 2 becoming 90° at force 4 is
     MEASURED, on GPS-instrumented replicas. Above the hard limit a sailing hull makes no
     ground to windward at all, and the router is told so rather than allowed to cheat. */
  if (!P.isEngine) {
    let hard = (twsMs - 5.0) / 6.0;
    hard = hard < 0 ? 0 : (hard > 1 ? 1 : hard);
    const beat = P.beatLight + (P.beatHard - P.beatLight) * hard;
    if (twa < beat) return 0;                       // cannot be sailed, at any speed
  }

  const base = P.spd[twa > 180 ? 180 : (twa | 0)];
  if (P.isEngine) return base;

  /* Speed rises roughly with the square root of wind and then saturates on the hull's own
     wave-making. */
  const s = Math.sqrt((twsMs > 0.4 ? twsMs : 0.4) / 8.0);
  return base * (s > 1.55 ? 1.55 : s);
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

window.SHIPS_ROUTE = { computeReachFrom, solveReach, passageHours, NAV };
