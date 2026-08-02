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
}
