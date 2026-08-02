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

const VERT = `
varying vec3 vPos;
varying vec3 vNormalW;
void main(){
  vPos = position;
  vNormalW = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
precision highp float;

varying vec3 vPos;
varying vec3 vNormalW;

uniform sampler2D uDepth;      // RG = 16-bit elevation, B = roughness
uniform sampler2D uSeaA;       // R = SST, G = log chlorophyll, B = cloud   (month floor)
uniform sampler2D uSeaB;       //                                          (month ceil)
uniform sampler2D uWindA;      // R = u, G = v, B = ice concentration
uniform sampler2D uWindB;
uniform sampler2D uReach;      // R,G = 16-bit hours-to-reach; B = mask
uniform float uMonthMix;
uniform float uTexel;          // 1.0 / depth texture width
uniform vec3  uSun;
uniform vec3  uCam;
uniform float uTime;
uniform float uSeaLevel;       // metres relative to today, for deep time
uniform float uLySeafloor, uLyWind, uLyChl, uLyIce, uLyCloud, uLyReach;

const float PI = 3.14159265359;
const float ELEV_MIN = -11000.0;
const float ELEV_SPAN = 20000.0;

/* position on the unit sphere -> equirectangular uv. Longitude is measured from -180 so that
   u=0 is the antimeridian, matching how the tiles were cut. */
/* ⚠ HANDEDNESS. The convention is x = cos(lat)sin(lon), y = sin(lat), z = cos(lat)cos(lon),
   so that a camera outside the sphere sees NORTH UP and EAST TO THE RIGHT. The first version
   used z = -cos(lat)cos(lon), which is self-consistent, renders a perfectly plausible-looking
   Earth, and is MIRRORED — Cape Town drew to the right of Perth. It was caught by projecting
   two known cities to screen coordinates, not by looking, because a mirrored globe looks
   entirely normal until you name something on it. Change this and lonLatToVec together. */
vec2 sphereUV(vec3 p){
  vec3 n = normalize(p);
  float lon = atan(n.x, n.z);           // -PI .. PI
  float lat = asin(clamp(n.y, -1.0, 1.0));
  return vec2(lon / (2.0*PI) + 0.5, 0.5 - lat / PI);
}

float decodeDepth(vec2 uv){
  vec3 t = texture2D(uDepth, uv).rgb;
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * ELEV_SPAN + ELEV_MIN;
}
float roughAt(vec2 uv){ return texture2D(uDepth, uv).b; }

/* ── procedural noise, for surface texture below the grid ─────────────── */
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec3 n = normalize(vPos);
  vec2 uv = sphereUV(vPos);
  vec3 V = normalize(uCam - vPos);          // toward the eye
  vec3 L = normalize(uSun);

  float elev = decodeDepth(uv) - uSeaLevel;
  float rough = roughAt(uv);

  /* month-interpolated surface fields */
  vec3 seaA = texture2D(uSeaA, uv).rgb, seaB = texture2D(uSeaB, uv).rgb;
  vec3 sea  = mix(seaA, seaB, uMonthMix);
  vec3 wnA  = texture2D(uWindA, uv).rgb, wnB = texture2D(uWindB, uv).rgb;
  vec3 wn   = mix(wnA, wnB, uMonthMix);

  float sst   = sea.r * 34.0 - 2.0;                 // degC
  float chl   = pow(10.0, sea.g * 4.0 - 2.0);       // mg/m3, log-packed
  float cloud = sea.b;
  vec2  wind  = (wn.rg - 0.5019608) * 2.0 * 25.0;   // m/s, packed about 128
  float wspd  = length(wind);
  float ice   = wn.b;

  /* ── the surface normal, from the gradient of the depth field itself ──
     Not a pre-baked hillshade: relief tied to the data means a changing field changes its own
     shading, and it survives any zoom. */
  float e = uTexel;
  float hL = decodeDepth(uv - vec2(e,0.0)), hR = decodeDepth(uv + vec2(e,0.0));
  float hD = decodeDepth(uv - vec2(0.0,e)), hU = decodeDepth(uv + vec2(0.0,e));
  float latScale = max(0.15, cos((0.5 - uv.y) * PI));
  /* The vertical scale of the normal must track the HORIZONTAL size of a texel, or the relief
     changes character every time a new pyramid level binds — flat at level 0, jagged at level 2.
     metresPerTexel / exaggeration keeps the shading scale-consistent across the whole pyramid.
     Exaggeration is ~40x, and it is a stated choice: the sea floor's real gradients are so
     gentle that at 1:1 the largest landform on the planet is invisible. */
  float mPerTexel = uTexel * 40075000.0;
  vec3 grad = vec3((hL - hR) / max(latScale, 0.15), (hD - hU), mPerTexel / 40.0);
  vec3 nrm = normalize(grad);

  vec3 col;

  if (elev > 0.0) {
    /* ── LAND. Deliberately quiet: this is the ocean's project and the land is the edge it is
       bounded by. Enough relief and material to be legible, never enough to compete. */
    /* Muted by design — SCOPE §3. This is the ocean's project and the land is the edge it is
       bounded by; when the land was brighter than the water the eye went straight to it and
       the sea read as background, which is exactly backwards. */
    float lat = abs(0.5 - uv.y) * 180.0;
    vec3 lowland = vec3(0.150, 0.138, 0.112);
    vec3 upland  = vec3(0.212, 0.196, 0.170);
    col = mix(lowland, upland, clamp(elev / 2600.0, 0.0, 1.0));
    /* snow above a line that falls with latitude, not a flat altitude — so the Andes carry
       snow at 5,000 m and Norway carries it at 1,200, which is what actually happens */
    float snowline = 5200.0 - lat * 58.0;
    float snow = smoothstep(snowline, snowline + 900.0, elev);
    col = mix(col, vec3(0.72, 0.74, 0.78), snow * 0.86);
    float lam = clamp(dot(nrm, normalize(vec3(0.55, 0.55, 0.58))), 0.0, 1.0);
    col *= (0.52 + 0.80 * lam);
    col += (fbm(uv * 2200.0) - 0.5) * 0.020;
  } else {
    /* ── WATER. Composed as: light reaches the floor, is absorbed on the way down and back,
       and what returns is added to the light scattered by the water column itself. */
    float depth = -elev;

    /* the sea floor as a MATERIAL, classified from depth and roughness. A colour ramp is a
       cartographic convention; this is an appearance. */
    vec3 shelfSand  = vec3(0.62, 0.58, 0.44);
    vec3 slopeMud   = vec3(0.34, 0.30, 0.25);
    vec3 abyssClay  = vec3(0.20, 0.19, 0.185);
    vec3 ridgeRock  = vec3(0.26, 0.235, 0.22);

    float fShelf = 1.0 - smoothstep(60.0, 220.0, depth);
    float fSlope = smoothstep(120.0, 400.0, depth) * (1.0 - smoothstep(1600.0, 3000.0, depth));
    float fAbyss = smoothstep(2600.0, 4200.0, depth);
    vec3 floorCol = shelfSand * fShelf + slopeMud * fSlope + abyssClay * fAbyss;
    floorCol = mix(floorCol, ridgeRock, clamp((rough - 0.42) * 2.1, 0.0, 1.0));
    /* abyssal-hill fabric, grown from the process rather than shipped: spreading builds ridges
       parallel to the axis, so the texture is anisotropic and keyed to roughness. Kept at a
       frequency the frame can resolve, for the reason given at the wave scale below. */
    float fab = fbm(vec2(uv.x * 900.0, uv.y * 240.0));
    floorCol *= 0.86 + 0.30 * fab * clamp(rough * 2.4, 0.15, 1.0);
    floorCol *= mix(1.0, 0.30, smoothstep(5800.0, 8200.0, depth));   // trenches go black

    float lamF = clamp(dot(nrm, normalize(vec3(0.5, 0.5, 0.75))), 0.0, 1.0);
    floorCol *= (0.34 + 0.95 * lamF);
    floorCol *= uLySeafloor;

    /* ── HOW MUCH OF THE FLOOR YOU SEE, and a disclosed departure from physics ──
       Real sea water is opaque below about 200 m: a physically exact extinction makes 92% of
       the ocean a flat black plane, and the Mid-Atlantic Ridge — the largest landform on the
       planet — cannot be seen at all. That fails the legibility bar in SCOPE §3.

       So the water is drawn in TWO terms, and the split is the honest part:
         * COLOUR is physical. Per-channel absorption, red gone first, so shallow tropical
           water is turquoise for the reason it really is turquoise.
         * RELIEF is cartographic. The floor's SHADING — not its colour — is carried through
           the whole water column at reduced contrast, so structure below the photic zone is
           still readable. The About panel says so in these words.
       The alternative is a beautiful, accurate, useless black disc. */
    vec3 kv = vec3(0.0026, 0.0016, 0.0011);            // colour transmission, per metre
    kv *= (1.0 + clamp(chl, 0.0, 8.0) * 0.16);         // turbid water absorbs harder
    vec3 through = exp(-kv * depth);

    /* the body of the water: colour set by what is dissolved and suspended in it */
    vec3 clearBlue = vec3(0.016, 0.062, 0.150);
    vec3 deepBlue  = vec3(0.008, 0.030, 0.082);
    vec3 greenish  = vec3(0.046, 0.115, 0.098);
    float g = uLyChl > 0.5 ? clamp(log(max(chl, 0.012)) * 0.28 + 0.60, 0.0, 1.0) : 0.16;
    vec3 body = mix(clearBlue, greenish, g);
    body = mix(body, deepBlue, smoothstep(600.0, 4200.0, depth));   // the open ocean darkens
    body *= mix(0.88, 1.16, clamp((sst + 2.0) / 34.0, 0.0, 1.0));   // warm water reads warmer
    float sat = 1.0 - exp(-depth * 0.0042);                        // scattering builds with path
    vec3 scattered = body * sat;

    col = floorCol * through + scattered;

    /* the cartographic relief term: shading only, no colour, and it never lifts the trenches */
    float relief = (lamF - 0.46) * 1.9;
    col *= (1.0 + relief * 0.42 * uLySeafloor * sat);
    /* and a touch of the fabric, so ridge flanks keep their grain at abyssal depth */
    col *= (1.0 + (fab - 0.5) * 0.18 * clamp(rough * 2.2, 0.1, 1.0) * sat * uLySeafloor);

    /* ── the surface: wind-driven roughness, glint and whitecaps ──────── */
    float windDir = atan(wind.y, wind.x);
    vec2 wdir = vec2(cos(windDir), sin(windDir));
    /* Streaks run WITH the wind, stretched along it — that anisotropy is what makes a viewer
       read direction off the water without an arrow.

       ⚠ SCALE. The first version ran at 2600 cycles of noise across the globe, which at globe
       zoom is several cycles per PIXEL: it aliased into television static and the Roaring
       Forties read as a broken screen rather than a breaking sea. Sub-grid detail has to be
       generated at a frequency the frame can actually resolve. */
    vec2 sp = uv * vec2(330.0, 165.0);
    vec2 alongWind = vec2(dot(sp, wdir), dot(sp, vec2(-wdir.y, wdir.x)));
    float drift = uTime * 0.35 * (0.4 + wspd * 0.10);
    float wave = fbm(alongWind * vec2(0.34, 2.30) + vec2(drift, 0.0));
    float wave2 = fbm(alongWind * vec2(1.05, 4.60) - vec2(drift * 1.7, 0.0));

    float windAmp = uLyWind > 0.5 ? clamp(wspd / 14.0, 0.0, 1.2) : 0.0;
    vec3 sn = normalize(n + vec3(
        (wave - 0.5) * 0.055 * windAmp + (wave2 - 0.5) * 0.025 * windAmp,
        (wave2 - 0.5) * 0.045 * windAmp,
        (wave - 0.5) * 0.055 * windAmp));

    /* Sun glint. Blinn-Phong with a wind-broadened lobe: a glassy sea gives one hard highlight,
       a rough sea smears it wider — that difference is what the eye actually reads as "windy".
       ⚠ The exponent floor matters. At shininess 22 with a 2.6x gain the lobe covered most of
       the visible disc and turned the whole Southern Ocean pale grey — it read as land. Keep
       the lobe tight enough that glint stays a glint. */
    vec3 Hv = normalize(L + V);
    float shin = mix(420.0, 70.0, clamp(wspd / 16.0, 0.0, 1.0));
    float spec = pow(clamp(dot(sn, Hv), 0.0, 1.0), shin);
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(sn, V), 0.0, 1.0), 5.0);
    float sunUp = clamp(dot(n, L), 0.0, 1.0);
    col += vec3(1.0, 0.96, 0.88) * spec * (0.40 + 0.55 * windAmp) * sunUp;
    col = mix(col, vec3(0.09, 0.14, 0.23), fres * 0.34 * (0.35 + 0.65 * sunUp));

    /* WHITECAPS — the single most legible thing on the frame: the Southern Ocean is white and
       the horse latitudes are glass.

       ⚠ CALIBRATED FOR A MONTHLY MEAN, NOT AN INSTANT. Breaking starts at about force 6
       (11 m/s) in the moment, but this field is a monthly climatology whose peak anywhere on
       Earth is 9–10 m/s. A 9 m/s MEAN in the Southern Ocean is a place where it is blowing a
       gale much of the time. Using the instantaneous threshold on a mean field puts whitecaps
       precisely nowhere, which is what it did. Measured off the shipped field:
         50°S  9.2 m/s (the westerlies)   ·  15°N 7.2 m/s (the north-east trades)
          5°N  3.1 m/s (the doldrums)     ·  40°N 140°W 1.9 m/s (the Pacific high) */
    float breakF = smoothstep(5.2, 10.0, wspd) * uLyWind;
    float foam = smoothstep(0.54 - breakF * 0.22, 0.80, wave2 * 0.55 + wave * 0.45);
    col = mix(col, vec3(0.86, 0.90, 0.94), foam * breakF * 0.70);
    /* and a broad haze of spray where it really blows, so the belt reads at globe scale
       rather than only close in */
    col = mix(col, vec3(0.55, 0.64, 0.74), smoothstep(6.8, 10.5, wspd) * 0.16 * uLyWind);

    /* ── SEA ICE, from the measured margin ───────────────────────────── */
    if (uLyIce > 0.5 && ice > 0.02) {
      float ic = smoothstep(0.10, 0.60, ice);
      float floe = fbm(uv * vec2(1700.0, 850.0));
      vec3 iceCol = mix(vec3(0.66, 0.73, 0.79), vec3(0.94, 0.96, 0.98),
                        smoothstep(0.35, 0.75, floe));
      col = mix(col, iceCol, ic);
    }
  }

  /* ── reachability, when a port is selected ───────────────────────────── */
  if (uLyReach > 0.5) {
    vec4 rr = texture2D(uReach, uv);
    if (rr.b > 0.35) {
      float hours = (rr.r * 65280.0 + rr.g * 255.0) / 65535.0 * 9600.0;
      float days = hours / 24.0;
      /* Isochrones every 10 days. Kept as LINES on water rather than a wash over it: a heavy
         tint hides the sea the whole argument is about, and the reader needs both at once —
         the wind belts underneath and the ship's front on top. */
      float band = abs(fract(days / 10.0) - 0.5) * 2.0;
      float line = smoothstep(0.80, 1.0, band);
      vec3 warm = mix(vec3(1.00, 0.87, 0.46), vec3(0.55, 0.24, 0.40),
                      clamp(days / 180.0, 0.0, 1.0));
      col = mix(col, warm, 0.045 + line * 0.62);
    }
  }

  /* ── atmosphere ──────────────────────────────────────────────────────── */
  float sunUpG = clamp(dot(n, normalize(uSun)), 0.0, 1.0);
  if (uLyCloud > 0.5) {
    vec3 seaC = mix(texture2D(uSeaA, uv).rgb, texture2D(uSeaB, uv).rgb, uMonthMix);
    float cl = seaC.b;
    float puff = fbm(uv * vec2(900.0, 450.0) + vec2(uTime * 0.012, 0.0));
    float cover = smoothstep(0.30, 0.95, cl * (0.55 + 0.75 * puff));
    col = mix(col, vec3(0.80, 0.82, 0.85) * (0.12 + 0.95 * sunUpG), cover * 0.72);
  }

  /* ── ONE day/night term, applied once ────────────────────────────────
     It used to be applied twice — once inside the water branch and once here — which is how a
     lit ocean turns into a black disc. Ambient never goes to zero: a night ocean under a moon
     is dark, not absent, and a globe whose far half is pure black reads as a crescent, not a
     planet. */
  float day = smoothstep(-0.26, 0.20, dot(n, normalize(uSun)));
  col *= mix(0.30, 1.18, day);

  /* limb haze: what makes a globe read as a planet rather than a ball */
  float rim = 1.0 - clamp(dot(normalize(vNormalW), normalize(uCam - vPos)), 0.0, 1.0);
  col += vec3(0.16, 0.30, 0.48) * pow(rim, 3.0) * (0.22 + 0.90 * sunUpG);

  col = pow(clamp(col, 0.0, 1.4), vec3(0.4545));      // to sRGB
  gl_FragColor = vec4(col, 1.0);
}`;

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

function loadTex(url) {
  return new Promise((res, rej) => {
    new THREE.TextureLoader().load(url, t => res(setTexParams(t)), undefined, rej);
  });
}

/* ── sun position ───────────────────────────────────────────────────────── */
function sunVector(monthFrac) {
  // Declination through the year, plus a slow rotation so the terminator moves.
  const dayOfYear = monthFrac / 12 * 365.25;
  const decl = -23.44 * Math.PI / 180 * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365.25);
  const hour = (performance.now() / 1000) * 0.006;
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
    },
  });
  APP.texA = { seaA, seaB, winA, winB };

  sphere = new THREE.SphereGeometry(R, 192, 128);
  globe = new THREE.Mesh(sphere, mat);
  scene.add(globe);

  resize();
  placeCamera();
  setP(1);
  requestAnimationFrame(frame);

  setTimeout(() => {
    document.getElementById('splash').classList.add('gone');
  }, 260);

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
  })();

  await loadData();
  wireUI();
}

/* ── data ───────────────────────────────────────────────────────────────── */
async function loadData() {
  const get = async u => { try { return await (await fetch(u)).json(); } catch (e) { return null; } };
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
function updateLabels(now) {
  if (!APP.markers || now - lblTick < 90) return;
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
    b.onclick = () => selectEra(i, true);
    strip.appendChild(b);
  });
  selectEra(S.era, false);
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
      const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
      const f2 = new THREE.Vector3().crossVectors(right, up).normalize();
      const m = new THREE.Matrix4().makeBasis(f2, up, right);
      voyShip.quaternion.setFromRotationMatrix(m);
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
  yr.addEventListener('input', () => { S.year = +yr.value; onTime(); });
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
    drag = { x: e.clientX, y: e.clientY, lon: S.lon, lat: S.lat, moved: 0 };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    fly = null;                                   // a hand on the globe always wins
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    const k = S.dist / 900;
    S.lon = drag.lon - dx * 0.28 * k;
    S.lat = Math.max(-84, Math.min(84, drag.lat + dy * 0.28 * k));
    placeCamera();
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    fly = null;
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

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;

  /* ⚠ EVERY EARLY EXIT FROM THIS FUNCTION MUST RE-ARM THE LOOP FIRST. A bare `return` here
     skipped requestAnimationFrame, so the Shipwright rendered exactly one frame and then the
     entire app froze — including after you closed it again. */
  if (window.SHIPS_BT && window.SHIPS_BT.BT.on) {
    window.SHIPS_BT.btFrame(now, dt);
    requestAnimationFrame(frame);
    return;
  }
  if (window.SHIPS_SW && window.SHIPS_SW.SW.on) {
    window.SHIPS_SW.swFrame(now);
    requestAnimationFrame(frame);
    return;
  }
  if (window.SHIPS_YARD && window.SHIPS_YARD.YARD.on) {
    window.SHIPS_YARD.yardFrame(now);
    requestAnimationFrame(frame);
    return;                                     // the globe is not being looked at
  }

  stepFly(now);
  stepVoyage(dt);
  stepCampaign(dt);
  updateLabels(now);

  if (S.monthPlaying) {
    S.month = (S.month + dt * 1.1) % 12;
    document.getElementById('month').value = S.month;
    document.getElementById('monthName').textContent = MONTH_NAMES[Math.floor(S.month) % 12];
    setMonthTextures();
  }

  mat.uniforms.uMonthMix.value = S.month - Math.floor(S.month);
  mat.uniforms.uTime.value = now / 1000;
  mat.uniforms.uSun.value.copy(sunVector(S.month));
  mat.uniforms.uCam.value.copy(camera.position);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
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
  S.reachFrom = p;

  /* The card grows a hull picker: choose a ship, and the ocean fills with the time it takes
     that ship to get anywhere from here, in the month on the dial. This is the model's own
     output — nothing about it is drawn by hand. */
  const host = document.getElementById('cProse');
  const box = document.createElement('div');
  box.style.cssText = 'margin-top:14px;border-top:1px solid var(--edge);padding-top:11px';
  const live = vesselsAtYear(S.year);
  box.innerHTML =
    '<div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;' +
    'color:var(--brass);margin-bottom:7px">Sail from here</div>' +
    '<select id="reachHull" style="width:100%;background:#1a1815;color:var(--ink);' +
    'border:1px solid var(--edge);padding:5px;font-size:12px;border-radius:2px">' +
    live.map(v => `<option value="${v.id}">${v.name} — ${v.polar.rig}</option>`).join('') +
    '</select>' +
    '<button id="reachGo" class="mini" style="margin-top:8px;width:100%">' +
    'Compute the passage field</button>' +
    '<button id="reachYard" class="mini" style="margin-top:6px;width:100%">' +
    'See that hull</button>' +
    '<div id="reachOut" style="font-size:11.5px;color:var(--ink-dim);margin-top:9px;' +
    'line-height:1.6"></div>';
  host.appendChild(box);

  document.getElementById('reachYard').onclick = () => {
    const id = document.getElementById('reachHull').value;
    const v = live.find(x => x.id === id);
    if (v && v.hull) window.SHIPS_YARD.yardOpen(v);
  };

  document.getElementById('reachGo').onclick = async () => {
    const out = document.getElementById('reachOut');
    out.textContent = 'solving…';
    const id = document.getElementById('reachHull').value;
    const r = await window.SHIPS_ROUTE.computeReachFrom(p, id);
    if (!r) { out.textContent = 'no navigable water within reach of this port on the grid.'; return; }
    out.innerHTML =
      `<b>${r.vessel.name}</b>, leaving ${p.name} in ` +
      `<b>${MONTH_NAMES[Math.floor(S.month) % 12]}</b>.<br>` +
      `Reached <b>${r.pct.toFixed(0)}%</b> of the world ocean within 200 days ` +
      `(${(r.ms / 1000).toFixed(1)} s).<br>` +
      `<span style="color:var(--ink-faint)">Each band is ten days. ` +
      `A typical passage on a monthly mean wind — not a forecast.</span>`;
  };
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
    const side = up.clone().cross(fwd).normalize();               // X = Y x Z, right-handed
    sh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, fwd));

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
    b.onclick = () => setView(b.dataset.view);
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

boot().catch(e => {
  console.error(e);
  document.getElementById('loadnote').textContent = 'failed: ' + e.message;
});
